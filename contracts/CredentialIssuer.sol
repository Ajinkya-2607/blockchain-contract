// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "./ICredentialIssuer.sol";

/**
 * @title CredentialIssuer
 * @dev Smart contract for issuing, managing, and verifying digital credentials on Polygon blockchain
 * @author Your Name
 */
contract CredentialIssuer is ICredentialIssuer, Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;

    // State variables
    Counters.Counter private _credentialIds;
    Counters.Counter private _issuerIds;
    
    // Mapping from credential ID to credential data
    mapping(uint256 => Credential) public credentials;
    
    // Mapping from issuer address to issuer data
    mapping(address => Issuer) public issuers;
    
    // Mapping from user address to their credential IDs
    mapping(address => uint256[]) public userCredentials;
    
    // Mapping from credential hash to credential ID (for verification)
    mapping(bytes32 => uint256) public credentialHashes;
    
    // Mapping from issuer address to their issued credential IDs
    mapping(address => uint256[]) public issuerCredentials;
    
    // Events
    event IssuerRegistered(address indexed issuer, string name, string description);
    event CredentialIssued(uint256 indexed credentialId, address indexed issuer, address indexed recipient, string credentialType);
    event CredentialRevoked(uint256 indexed credentialId, address indexed issuer, string reason);
    event CredentialVerified(uint256 indexed credentialId, bool isValid);
    
    // Modifiers
    modifier onlyRegisteredIssuer() {
        require(issuers[msg.sender].isActive, "CredentialIssuer: Only registered issuers can perform this action");
        _;
    }
    
    modifier credentialExists(uint256 credentialId) {
        require(credentials[credentialId].issuer != address(0), "CredentialIssuer: Credential does not exist");
        _;
    }
    
    modifier onlyCredentialIssuer(uint256 credentialId) {
        require(credentials[credentialId].issuer == msg.sender, "CredentialIssuer: Only the issuer can perform this action");
        _;
    }

    /**
     * @dev Register a new issuer
     * @param name Name of the issuer
     * @param description Description of the issuer
     * @param metadata Additional metadata about the issuer
     */
    function registerIssuer(
        string memory name,
        string memory description,
        string memory metadata
    ) external override {
        require(bytes(name).length > 0, "CredentialIssuer: Name cannot be empty");
        require(!issuers[msg.sender].isActive, "CredentialIssuer: Issuer already registered");
        
        _issuerIds.increment();
        uint256 issuerId = _issuerIds.current();
        
        issuers[msg.sender] = Issuer({
            id: issuerId,
            name: name,
            description: description,
            metadata: metadata,
            isActive: true,
            registeredAt: block.timestamp,
            totalCredentialsIssued: 0
        });
        
        emit IssuerRegistered(msg.sender, name, description);
    }

    /**
     * @dev Issue a new credential to a recipient
     * @param recipient Address of the credential recipient
     * @param credentialType Type of credential being issued
     * @param metadata Additional metadata for the credential
     * @param expiryDate Expiry date of the credential (0 for no expiry)
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory metadata,
        uint256 expiryDate
    ) external override onlyRegisteredIssuer nonReentrant returns (uint256) {
        require(recipient != address(0), "CredentialIssuer: Invalid recipient address");
        require(bytes(credentialType).length > 0, "CredentialIssuer: Credential type cannot be empty");
        require(expiryDate == 0 || expiryDate > block.timestamp, "CredentialIssuer: Invalid expiry date");
        
        _credentialIds.increment();
        uint256 credentialId = _credentialIds.current();
        
        // Create credential hash for verification
        bytes32 credentialHash = keccak256(
            abi.encodePacked(
                recipient,
                credentialType,
                metadata,
                expiryDate,
                block.timestamp,
                credentialId
            )
        );
        
        Credential memory newCredential = Credential({
            id: credentialId,
            issuer: msg.sender,
            recipient: recipient,
            credentialType: credentialType,
            metadata: metadata,
            issuedAt: block.timestamp,
            expiryDate: expiryDate,
            isRevoked: false,
            revocationReason: "",
            credentialHash: credentialHash
        });
        
        credentials[credentialId] = newCredential;
        credentialHashes[credentialHash] = credentialId;
        
        // Update mappings
        userCredentials[recipient].push(credentialId);
        issuerCredentials[msg.sender].push(credentialId);
        issuers[msg.sender].totalCredentialsIssued++;
        
        emit CredentialIssued(credentialId, msg.sender, recipient, credentialType);
        
        return credentialId;
    }

    /**
     * @dev Revoke a credential
     * @param credentialId ID of the credential to revoke
     * @param reason Reason for revocation
     */
    function revokeCredential(
        uint256 credentialId,
        string memory reason
    ) external override onlyCredentialIssuer(credentialId) credentialExists(credentialId) {
        require(!credentials[credentialId].isRevoked, "CredentialIssuer: Credential already revoked");
        require(bytes(reason).length > 0, "CredentialIssuer: Revocation reason cannot be empty");
        
        credentials[credentialId].isRevoked = true;
        credentials[credentialId].revocationReason = reason;
        
        emit CredentialRevoked(credentialId, msg.sender, reason);
    }

    /**
     * @dev Verify a credential by its ID
     * @param credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredential(uint256 credentialId) external view override returns (bool isValid, Credential memory credential) {
        credential = credentials[credentialId];
        
        if (credential.issuer == address(0)) {
            return (false, credential);
        }
        
        // Check if credential is revoked
        if (credential.isRevoked) {
            return (false, credential);
        }
        
        // Check if credential has expired
        if (credential.expiryDate > 0 && credential.expiryDate <= block.timestamp) {
            return (false, credential);
        }
        
        // Check if issuer is still active
        if (!issuers[credential.issuer].isActive) {
            return (false, credential);
        }
        
        return (true, credential);
    }

    /**
     * @dev Verify a credential by its hash
     * @param credentialHash Hash of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredentialByHash(bytes32 credentialHash) external view override returns (bool isValid, Credential memory credential) {
        uint256 credentialId = credentialHashes[credentialHash];
        return verifyCredential(credentialId);
    }

    /**
     * @dev Get all credentials for a user
     * @param user Address of the user
     * @return Array of credential IDs
     */
    function getUserCredentials(address user) external view override returns (uint256[] memory) {
        return userCredentials[user];
    }

    /**
     * @dev Get all credentials issued by an issuer
     * @param issuer Address of the issuer
     * @return Array of credential IDs
     */
    function getIssuerCredentials(address issuer) external view override returns (uint256[] memory) {
        return issuerCredentials[issuer];
    }

    /**
     * @dev Get issuer information
     * @param issuer Address of the issuer
     * @return Issuer data
     */
    function getIssuer(address issuer) external view override returns (Issuer memory) {
        return issuers[issuer];
    }

    /**
     * @dev Get credential by ID
     * @param credentialId ID of the credential
     * @return Credential data
     */
    function getCredential(uint256 credentialId) external view override returns (Credential memory) {
        return credentials[credentialId];
    }

    /**
     * @dev Get total number of credentials issued
     * @return Total count
     */
    function getTotalCredentials() external view override returns (uint256) {
        return _credentialIds.current();
    }

    /**
     * @dev Get total number of issuers
     * @return Total count
     */
    function getTotalIssuers() external view override returns (uint256) {
        return _issuerIds.current();
    }

    /**
     * @dev Deactivate an issuer (only owner can do this)
     * @param issuer Address of the issuer to deactivate
     */
    function deactivateIssuer(address issuer) external onlyOwner {
        require(issuers[issuer].isActive, "CredentialIssuer: Issuer is not active");
        issuers[issuer].isActive = false;
    }

    /**
     * @dev Reactivate an issuer (only owner can do this)
     * @param issuer Address of the issuer to reactivate
     */
    function reactivateIssuer(address issuer) external onlyOwner {
        require(issuers[issuer].id > 0, "CredentialIssuer: Issuer does not exist");
        require(!issuers[issuer].isActive, "CredentialIssuer: Issuer is already active");
        issuers[issuer].isActive = true;
    }
}