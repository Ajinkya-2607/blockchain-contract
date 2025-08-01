// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title CredentialRegistry
 * @dev A comprehensive smart contract for issuing, verifying, and managing digital credentials on Polygon
 * @notice This contract allows authorized issuers to create credentials for recipients with various verification mechanisms
 */
contract CredentialRegistry is AccessControl, Pausable, ReentrancyGuard {
    using ECDSA for bytes32;
    using MessageHashUtils for bytes32;

    // Role definitions
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    bytes32 public constant VERIFIER_ROLE = keccak256("VERIFIER_ROLE");
    bytes32 public constant REVOKER_ROLE = keccak256("REVOKER_ROLE");

    // Credential status enumeration
    enum CredentialStatus {
        Active,
        Revoked,
        Suspended,
        Expired
    }

    // Credential structure
    struct Credential {
        uint256 id;
        address issuer;
        address recipient;
        string credentialType;
        string credentialData; // JSON or IPFS hash
        uint256 issuedAt;
        uint256 expiresAt;
        CredentialStatus status;
        bytes32 dataHash; // Hash of credential data for integrity
        string metadataURI; // Additional metadata (IPFS, etc.)
    }

    // Issuer profile structure
    struct IssuerProfile {
        string name;
        string description;
        string website;
        string logoURI;
        bool isActive;
        uint256 credentialsIssued;
    }

    // State variables
    uint256 private _credentialIdCounter;
    mapping(uint256 => Credential) public credentials;
    mapping(address => IssuerProfile) public issuerProfiles;
    mapping(address => uint256[]) public recipientCredentials;
    mapping(address => uint256[]) public issuerCredentials;
    mapping(bytes32 => bool) public usedHashes; // Prevent duplicate credential data
    mapping(string => uint256[]) public credentialsByType;

    // Events
    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed issuer,
        address indexed recipient,
        string credentialType,
        uint256 issuedAt,
        uint256 expiresAt
    );

    event CredentialRevoked(
        uint256 indexed credentialId,
        address indexed revoker,
        string reason,
        uint256 revokedAt
    );

    event CredentialStatusUpdated(
        uint256 indexed credentialId,
        CredentialStatus oldStatus,
        CredentialStatus newStatus,
        uint256 updatedAt
    );

    event IssuerProfileUpdated(
        address indexed issuer,
        string name,
        string description
    );

    event CredentialVerified(
        uint256 indexed credentialId,
        address indexed verifier,
        uint256 verifiedAt
    );

    // Custom errors
    error CredentialNotFound(uint256 credentialId);
    error CredentialAlreadyRevoked(uint256 credentialId);
    error CredentialExpired(uint256 credentialId);
    error UnauthorizedIssuer(address issuer);
    error UnauthorizedVerifier(address verifier);
    error InvalidCredentialData();
    error DuplicateCredentialData();
    error InvalidExpirationDate();

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
        _grantRole(VERIFIER_ROLE, msg.sender);
        _grantRole(REVOKER_ROLE, msg.sender);
    }

    /**
     * @dev Issue a new credential
     * @param recipient Address of the credential recipient
     * @param credentialType Type/category of the credential
     * @param credentialData The credential data (JSON or IPFS hash)
     * @param expiresAt Expiration timestamp (0 for non-expiring)
     * @param metadataURI Additional metadata URI
     * @return credentialId The ID of the newly issued credential
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory credentialData,
        uint256 expiresAt,
        string memory metadataURI
    ) external onlyRole(ISSUER_ROLE) whenNotPaused nonReentrant returns (uint256) {
        if (recipient == address(0)) revert InvalidCredentialData();
        if (bytes(credentialType).length == 0) revert InvalidCredentialData();
        if (bytes(credentialData).length == 0) revert InvalidCredentialData();
        if (expiresAt != 0 && expiresAt <= block.timestamp) revert InvalidExpirationDate();

        // Generate data hash for integrity check
        bytes32 dataHash = keccak256(abi.encodePacked(credentialData, recipient, credentialType));
        if (usedHashes[dataHash]) revert DuplicateCredentialData();

        uint256 credentialId = ++_credentialIdCounter;

        // Create credential
        credentials[credentialId] = Credential({
            id: credentialId,
            issuer: msg.sender,
            recipient: recipient,
            credentialType: credentialType,
            credentialData: credentialData,
            issuedAt: block.timestamp,
            expiresAt: expiresAt,
            status: CredentialStatus.Active,
            dataHash: dataHash,
            metadataURI: metadataURI
        });

        // Update mappings
        usedHashes[dataHash] = true;
        recipientCredentials[recipient].push(credentialId);
        issuerCredentials[msg.sender].push(credentialId);
        credentialsByType[credentialType].push(credentialId);

        // Update issuer stats
        issuerProfiles[msg.sender].credentialsIssued++;

        emit CredentialIssued(
            credentialId,
            msg.sender,
            recipient,
            credentialType,
            block.timestamp,
            expiresAt
        );

        return credentialId;
    }

    /**
     * @dev Batch issue multiple credentials
     * @param recipients Array of recipient addresses
     * @param credentialTypes Array of credential types
     * @param credentialDataArray Array of credential data
     * @param expirationDates Array of expiration dates
     * @param metadataURIs Array of metadata URIs
     * @return credentialIds Array of issued credential IDs
     */
    function batchIssueCredentials(
        address[] memory recipients,
        string[] memory credentialTypes,
        string[] memory credentialDataArray,
        uint256[] memory expirationDates,
        string[] memory metadataURIs
    ) external onlyRole(ISSUER_ROLE) whenNotPaused nonReentrant returns (uint256[] memory) {
        uint256 length = recipients.length;
        if (length != credentialTypes.length || 
            length != credentialDataArray.length || 
            length != expirationDates.length || 
            length != metadataURIs.length) {
            revert InvalidCredentialData();
        }

        uint256[] memory credentialIds = new uint256[](length);

        for (uint256 i = 0; i < length; i++) {
            credentialIds[i] = issueCredential(
                recipients[i],
                credentialTypes[i],
                credentialDataArray[i],
                expirationDates[i],
                metadataURIs[i]
            );
        }

        return credentialIds;
    }

    /**
     * @dev Revoke a credential
     * @param credentialId ID of the credential to revoke
     * @param reason Reason for revocation
     */
    function revokeCredential(
        uint256 credentialId,
        string memory reason
    ) external onlyRole(REVOKER_ROLE) whenNotPaused {
        Credential storage credential = credentials[credentialId];
        if (credential.id == 0) revert CredentialNotFound(credentialId);
        if (credential.status == CredentialStatus.Revoked) revert CredentialAlreadyRevoked(credentialId);

        CredentialStatus oldStatus = credential.status;
        credential.status = CredentialStatus.Revoked;

        emit CredentialRevoked(credentialId, msg.sender, reason, block.timestamp);
        emit CredentialStatusUpdated(credentialId, oldStatus, CredentialStatus.Revoked, block.timestamp);
    }

    /**
     * @dev Update credential status (suspend/reactivate)
     * @param credentialId ID of the credential
     * @param newStatus New status for the credential
     */
    function updateCredentialStatus(
        uint256 credentialId,
        CredentialStatus newStatus
    ) external onlyRole(ISSUER_ROLE) whenNotPaused {
        Credential storage credential = credentials[credentialId];
        if (credential.id == 0) revert CredentialNotFound(credentialId);
        if (credential.issuer != msg.sender && !hasRole(DEFAULT_ADMIN_ROLE, msg.sender)) {
            revert UnauthorizedIssuer(msg.sender);
        }

        CredentialStatus oldStatus = credential.status;
        credential.status = newStatus;

        emit CredentialStatusUpdated(credentialId, oldStatus, newStatus, block.timestamp);
    }

    /**
     * @dev Verify a credential's authenticity and validity
     * @param credentialId ID of the credential to verify
     * @return isValid True if credential is valid
     * @return status Current status of the credential
     * @return issuer Address of the credential issuer
     */
    function verifyCredential(uint256 credentialId) 
        external 
        onlyRole(VERIFIER_ROLE) 
        returns (bool isValid, CredentialStatus status, address issuer) 
    {
        Credential storage credential = credentials[credentialId];
        if (credential.id == 0) revert CredentialNotFound(credentialId);

        // Check if credential is expired
        if (credential.expiresAt != 0 && credential.expiresAt <= block.timestamp) {
            credential.status = CredentialStatus.Expired;
        }

        isValid = credential.status == CredentialStatus.Active;
        status = credential.status;
        issuer = credential.issuer;

        emit CredentialVerified(credentialId, msg.sender, block.timestamp);
        
        return (isValid, status, issuer);
    }

    /**
     * @dev Get credential details
     * @param credentialId ID of the credential
     * @return credential The credential struct
     */
    function getCredential(uint256 credentialId) external view returns (Credential memory) {
        Credential memory credential = credentials[credentialId];
        if (credential.id == 0) revert CredentialNotFound(credentialId);
        return credential;
    }

    /**
     * @dev Get credentials by recipient
     * @param recipient Address of the recipient
     * @return credentialIds Array of credential IDs
     */
    function getCredentialsByRecipient(address recipient) external view returns (uint256[] memory) {
        return recipientCredentials[recipient];
    }

    /**
     * @dev Get credentials by issuer
     * @param issuer Address of the issuer
     * @return credentialIds Array of credential IDs
     */
    function getCredentialsByIssuer(address issuer) external view returns (uint256[] memory) {
        return issuerCredentials[issuer];
    }

    /**
     * @dev Get credentials by type
     * @param credentialType Type of credentials
     * @return credentialIds Array of credential IDs
     */
    function getCredentialsByType(string memory credentialType) external view returns (uint256[] memory) {
        return credentialsByType[credentialType];
    }

    /**
     * @dev Set up issuer profile
     * @param name Name of the issuer
     * @param description Description of the issuer
     * @param website Website URL
     * @param logoURI Logo URI
     */
    function setupIssuerProfile(
        string memory name,
        string memory description,
        string memory website,
        string memory logoURI
    ) external onlyRole(ISSUER_ROLE) {
        issuerProfiles[msg.sender] = IssuerProfile({
            name: name,
            description: description,
            website: website,
            logoURI: logoURI,
            isActive: true,
            credentialsIssued: issuerProfiles[msg.sender].credentialsIssued
        });

        emit IssuerProfileUpdated(msg.sender, name, description);
    }

    /**
     * @dev Check if a credential is valid (not revoked, suspended, or expired)
     * @param credentialId ID of the credential
     * @return isValid True if credential is valid
     */
    function isCredentialValid(uint256 credentialId) external view returns (bool) {
        Credential memory credential = credentials[credentialId];
        if (credential.id == 0) return false;
        if (credential.status != CredentialStatus.Active) return false;
        if (credential.expiresAt != 0 && credential.expiresAt <= block.timestamp) return false;
        return true;
    }

    /**
     * @dev Get total number of credentials issued
     * @return count Total credential count
     */
    function getTotalCredentials() external view returns (uint256) {
        return _credentialIdCounter;
    }

    /**
     * @dev Pause contract (admin only)
     */
    function pause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _pause();
    }

    /**
     * @dev Unpause contract (admin only)
     */
    function unpause() external onlyRole(DEFAULT_ADMIN_ROLE) {
        _unpause();
    }

    /**
     * @dev Grant issuer role to an address
     * @param account Address to grant issuer role
     */
    function grantIssuerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(ISSUER_ROLE, account);
    }

    /**
     * @dev Grant verifier role to an address
     * @param account Address to grant verifier role
     */
    function grantVerifierRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(VERIFIER_ROLE, account);
    }

    /**
     * @dev Grant revoker role to an address
     * @param account Address to grant revoker role
     */
    function grantRevokerRole(address account) external onlyRole(DEFAULT_ADMIN_ROLE) {
        _grantRole(REVOKER_ROLE, account);
    }
}