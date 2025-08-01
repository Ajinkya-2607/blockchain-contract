// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/**
 * @title CredentialIssuer
 * @dev Smart contract for issuing, managing, and verifying digital credentials on Polygon blockchain
 * @author Your Name
 */
contract CredentialIssuer is Ownable, ReentrancyGuard {
    using Counters for Counters.Counter;
    using Strings for uint256;

    // Events
    event CredentialIssued(
        uint256 indexed credentialId,
        address indexed issuer,
        address indexed recipient,
        string credentialType,
        uint256 issuedAt,
        uint256 expiryDate
    );

    event CredentialRevoked(
        uint256 indexed credentialId,
        address indexed issuer,
        address indexed recipient,
        uint256 revokedAt
    );

    event IssuerRegistered(
        address indexed issuer,
        string name,
        string description,
        bool isActive
    );

    event IssuerDeactivated(address indexed issuer);

    // Structs
    struct Credential {
        uint256 id;
        address issuer;
        address recipient;
        string credentialType;
        string metadata;
        uint256 issuedAt;
        uint256 expiryDate;
        bool isRevoked;
        uint256 revokedAt;
    }

    struct Issuer {
        string name;
        string description;
        bool isActive;
        uint256 registeredAt;
        uint256 credentialsIssued;
    }

    // State variables
    Counters.Counter private _credentialIds;
    
    mapping(uint256 => Credential) public credentials;
    mapping(address => Issuer) public issuers;
    mapping(address => uint256[]) public recipientCredentials;
    mapping(address => uint256[]) public issuerCredentials;
    mapping(string => bool) public supportedCredentialTypes;
    
    uint256 public issuanceFee;
    uint256 public revocationFee;
    uint256 public totalCredentialsIssued;
    uint256 public totalCredentialsRevoked;

    // Modifiers
    modifier onlyActiveIssuer() {
        require(issuers[msg.sender].isActive, "CredentialIssuer: Not an active issuer");
        _;
    }

    modifier credentialExists(uint256 credentialId) {
        require(credentialId > 0 && credentialId <= _credentialIds.current(), 
                "CredentialIssuer: Credential does not exist");
        _;
    }

    modifier notRevoked(uint256 credentialId) {
        require(!credentials[credentialId].isRevoked, 
                "CredentialIssuer: Credential is revoked");
        _;
    }

    modifier notExpired(uint256 credentialId) {
        require(credentials[credentialId].expiryDate == 0 || 
                block.timestamp < credentials[credentialId].expiryDate, 
                "CredentialIssuer: Credential has expired");
        _;
    }

    constructor() {
        issuanceFee = 0.001 ether; // 0.001 MATIC
        revocationFee = 0.0005 ether; // 0.0005 MATIC
        
        // Register contract owner as the first issuer
        _registerIssuer(msg.sender, "System Admin", "Default system administrator", true);
    }

    /**
     * @dev Register a new issuer
     * @param issuer Address of the issuer
     * @param name Name of the issuer
     * @param description Description of the issuer
     * @param isActive Whether the issuer is active
     */
    function registerIssuer(
        address issuer,
        string memory name,
        string memory description,
        bool isActive
    ) external onlyOwner {
        _registerIssuer(issuer, name, description, isActive);
    }

    /**
     * @dev Internal function to register an issuer
     */
    function _registerIssuer(
        address issuer,
        string memory name,
        string memory description,
        bool isActive
    ) internal {
        require(issuer != address(0), "CredentialIssuer: Invalid issuer address");
        require(bytes(name).length > 0, "CredentialIssuer: Name cannot be empty");
        
        issuers[issuer] = Issuer({
            name: name,
            description: description,
            isActive: isActive,
            registeredAt: block.timestamp,
            credentialsIssued: 0
        });

        emit IssuerRegistered(issuer, name, description, isActive);
    }

    /**
     * @dev Deactivate an issuer
     * @param issuer Address of the issuer to deactivate
     */
    function deactivateIssuer(address issuer) external onlyOwner {
        require(issuers[issuer].isActive, "CredentialIssuer: Issuer is not active");
        
        issuers[issuer].isActive = false;
        emit IssuerDeactivated(issuer);
    }

    /**
     * @dev Add supported credential types
     * @param credentialType Type of credential to support
     */
    function addCredentialType(string memory credentialType) external onlyOwner {
        require(bytes(credentialType).length > 0, "CredentialIssuer: Credential type cannot be empty");
        supportedCredentialTypes[credentialType] = true;
    }

    /**
     * @dev Remove supported credential types
     * @param credentialType Type of credential to remove
     */
    function removeCredentialType(string memory credentialType) external onlyOwner {
        supportedCredentialTypes[credentialType] = false;
    }

    /**
     * @dev Issue a new credential
     * @param recipient Address of the credential recipient
     * @param credentialType Type of credential
     * @param metadata Additional metadata for the credential
     * @param expiryDate Expiry date (0 for no expiry)
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory metadata,
        uint256 expiryDate
    ) external payable onlyActiveIssuer nonReentrant {
        require(recipient != address(0), "CredentialIssuer: Invalid recipient address");
        require(bytes(credentialType).length > 0, "CredentialIssuer: Credential type cannot be empty");
        require(supportedCredentialTypes[credentialType], "CredentialIssuer: Unsupported credential type");
        require(msg.value >= issuanceFee, "CredentialIssuer: Insufficient issuance fee");
        require(expiryDate == 0 || expiryDate > block.timestamp, "CredentialIssuer: Invalid expiry date");

        _credentialIds.increment();
        uint256 credentialId = _credentialIds.current();

        credentials[credentialId] = Credential({
            id: credentialId,
            issuer: msg.sender,
            recipient: recipient,
            credentialType: credentialType,
            metadata: metadata,
            issuedAt: block.timestamp,
            expiryDate: expiryDate,
            isRevoked: false,
            revokedAt: 0
        });

        // Update mappings
        recipientCredentials[recipient].push(credentialId);
        issuerCredentials[msg.sender].push(credentialId);
        
        // Update counters
        issuers[msg.sender].credentialsIssued++;
        totalCredentialsIssued++;

        emit CredentialIssued(
            credentialId,
            msg.sender,
            recipient,
            credentialType,
            block.timestamp,
            expiryDate
        );
    }

    /**
     * @dev Revoke a credential
     * @param credentialId ID of the credential to revoke
     */
    function revokeCredential(uint256 credentialId) 
        external 
        payable 
        credentialExists(credentialId) 
        notRevoked(credentialId) 
        nonReentrant 
    {
        Credential storage credential = credentials[credentialId];
        
        require(
            msg.sender == credential.issuer || msg.sender == owner(),
            "CredentialIssuer: Only issuer or owner can revoke"
        );
        require(msg.value >= revocationFee, "CredentialIssuer: Insufficient revocation fee");

        credential.isRevoked = true;
        credential.revokedAt = block.timestamp;
        totalCredentialsRevoked++;

        emit CredentialRevoked(
            credentialId,
            credential.issuer,
            credential.recipient,
            block.timestamp
        );
    }

    /**
     * @dev Get credential details
     * @param credentialId ID of the credential
     * @return Credential details
     */
    function getCredential(uint256 credentialId) 
        external 
        view 
        credentialExists(credentialId) 
        returns (Credential memory) 
    {
        return credentials[credentialId];
    }

    /**
     * @dev Check if a credential is valid (not revoked and not expired)
     * @param credentialId ID of the credential
     * @return True if valid, false otherwise
     */
    function isCredentialValid(uint256 credentialId) 
        external 
        view 
        credentialExists(credentialId) 
        returns (bool) 
    {
        Credential memory credential = credentials[credentialId];
        
        if (credential.isRevoked) {
            return false;
        }
        
        if (credential.expiryDate > 0 && block.timestamp >= credential.expiryDate) {
            return false;
        }
        
        return true;
    }

    /**
     * @dev Get all credentials for a recipient
     * @param recipient Address of the recipient
     * @return Array of credential IDs
     */
    function getRecipientCredentials(address recipient) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return recipientCredentials[recipient];
    }

    /**
     * @dev Get all credentials issued by an issuer
     * @param issuer Address of the issuer
     * @return Array of credential IDs
     */
    function getIssuerCredentials(address issuer) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return issuerCredentials[issuer];
    }

    /**
     * @dev Get credential count for a recipient
     * @param recipient Address of the recipient
     * @return Number of credentials
     */
    function getRecipientCredentialCount(address recipient) 
        external 
        view 
        returns (uint256) 
    {
        return recipientCredentials[recipient].length;
    }

    /**
     * @dev Get credential count for an issuer
     * @param issuer Address of the issuer
     * @return Number of credentials issued
     */
    function getIssuerCredentialCount(address issuer) 
        external 
        view 
        returns (uint256) 
    {
        return issuerCredentials[issuer].length;
    }

    /**
     * @dev Update issuance fee
     * @param newFee New issuance fee in wei
     */
    function updateIssuanceFee(uint256 newFee) external onlyOwner {
        issuanceFee = newFee;
    }

    /**
     * @dev Update revocation fee
     * @param newFee New revocation fee in wei
     */
    function updateRevocationFee(uint256 newFee) external onlyOwner {
        revocationFee = newFee;
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "CredentialIssuer: No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "CredentialIssuer: Fee withdrawal failed");
    }

    /**
     * @dev Get contract statistics
     * @return totalIssued Total credentials issued
     * @return totalRevoked Total credentials revoked
     * @return currentId Current credential ID
     */
    function getContractStats() 
        external 
        view 
        returns (uint256 totalIssued, uint256 totalRevoked, uint256 currentId) 
    {
        return (totalCredentialsIssued, totalCredentialsRevoked, _credentialIds.current());
    }

    /**
     * @dev Check if an address is an active issuer
     * @param issuer Address to check
     * @return True if active issuer, false otherwise
     */
    function isActiveIssuer(address issuer) external view returns (bool) {
        return issuers[issuer].isActive;
    }

    /**
     * @dev Get issuer information
     * @param issuer Address of the issuer
     * @return Issuer information
     */
    function getIssuerInfo(address issuer) external view returns (Issuer memory) {
        return issuers[issuer];
    }
}