// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title ICredentialIssuer
 * @dev Interface for the credential issuer smart contract
 */
interface ICredentialIssuer {
    /**
     * @dev Structure representing an issuer
     */
    struct Issuer {
        uint256 id;
        string name;
        string description;
        string metadata;
        bool isActive;
        uint256 registeredAt;
        uint256 totalCredentialsIssued;
    }

    /**
     * @dev Structure representing a credential
     */
    struct Credential {
        uint256 id;
        address issuer;
        address recipient;
        string credentialType;
        string metadata;
        uint256 issuedAt;
        uint256 expiryDate;
        bool isRevoked;
        string revocationReason;
        bytes32 credentialHash;
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
    ) external;

    /**
     * @dev Issue a new credential to a recipient
     * @param recipient Address of the credential recipient
     * @param credentialType Type of credential being issued
     * @param metadata Additional metadata for the credential
     * @param expiryDate Expiry date of the credential (0 for no expiry)
     * @return credentialId The ID of the issued credential
     */
    function issueCredential(
        address recipient,
        string memory credentialType,
        string memory metadata,
        uint256 expiryDate
    ) external returns (uint256 credentialId);

    /**
     * @dev Revoke a credential
     * @param credentialId ID of the credential to revoke
     * @param reason Reason for revocation
     */
    function revokeCredential(
        uint256 credentialId,
        string memory reason
    ) external;

    /**
     * @dev Verify a credential by its ID
     * @param credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredential(uint256 credentialId) external view returns (bool isValid, Credential memory credential);

    /**
     * @dev Verify a credential by its hash
     * @param credentialHash Hash of the credential to verify
     * @return isValid Whether the credential is valid
     * @return credential The credential data
     */
    function verifyCredentialByHash(bytes32 credentialHash) external view returns (bool isValid, Credential memory credential);

    /**
     * @dev Get all credentials for a user
     * @param user Address of the user
     * @return Array of credential IDs
     */
    function getUserCredentials(address user) external view returns (uint256[] memory);

    /**
     * @dev Get all credentials issued by an issuer
     * @param issuer Address of the issuer
     * @return Array of credential IDs
     */
    function getIssuerCredentials(address issuer) external view returns (uint256[] memory);

    /**
     * @dev Get issuer information
     * @param issuer Address of the issuer
     * @return Issuer data
     */
    function getIssuer(address issuer) external view returns (Issuer memory);

    /**
     * @dev Get credential by ID
     * @param credentialId ID of the credential
     * @return Credential data
     */
    function getCredential(uint256 credentialId) external view returns (Credential memory);

    /**
     * @dev Get total number of credentials issued
     * @return Total count
     */
    function getTotalCredentials() external view returns (uint256);

    /**
     * @dev Get total number of issuers
     * @return Total count
     */
    function getTotalIssuers() external view returns (uint256);
}