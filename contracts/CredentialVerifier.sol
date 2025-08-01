// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./CredentialRegistry.sol";

/**
 * @title CredentialVerifier
 * @dev A lightweight contract for verifying credentials issued by the CredentialRegistry
 * @notice This contract provides a simple interface for third-party verification
 */
contract CredentialVerifier {
    CredentialRegistry public immutable credentialRegistry;

    // Events
    event CredentialVerificationRequested(
        uint256 indexed credentialId,
        address indexed verifier,
        bool isValid
    );

    event BatchVerificationCompleted(
        uint256[] credentialIds,
        address indexed verifier,
        uint256 validCount,
        uint256 totalCount
    );

    constructor(address _credentialRegistry) {
        require(_credentialRegistry != address(0), "Invalid registry address");
        credentialRegistry = CredentialRegistry(_credentialRegistry);
    }

    /**
     * @dev Verify a single credential (public function - no role required)
     * @param credentialId ID of the credential to verify
     * @return isValid True if credential is valid and active
     * @return credentialData Basic credential information
     */
    function verifyCredentialPublic(uint256 credentialId) 
        external 
        view 
        returns (
            bool isValid, 
            CredentialRegistry.Credential memory credentialData
        ) 
    {
        try credentialRegistry.getCredential(credentialId) returns (CredentialRegistry.Credential memory credential) {
            isValid = credentialRegistry.isCredentialValid(credentialId);
            credentialData = credential;
        } catch {
            isValid = false;
            // Return empty credential data if not found
        }
        
        return (isValid, credentialData);
    }

    /**
     * @dev Batch verify multiple credentials
     * @param credentialIds Array of credential IDs to verify
     * @return results Array of verification results
     * @return validCount Number of valid credentials
     */
    function batchVerifyCredentials(uint256[] calldata credentialIds) 
        external 
        view 
        returns (bool[] memory results, uint256 validCount) 
    {
        results = new bool[](credentialIds.length);
        
        for (uint256 i = 0; i < credentialIds.length; i++) {
            results[i] = credentialRegistry.isCredentialValid(credentialIds[i]);
            if (results[i]) {
                validCount++;
            }
        }
        
        return (results, validCount);
    }

    /**
     * @dev Check if a credential exists and get basic info
     * @param credentialId ID of the credential
     * @return exists True if credential exists
     * @return issuer Address of the issuer
     * @return recipient Address of the recipient
     * @return credentialType Type of the credential
     * @return issuedAt Timestamp when issued
     * @return expiresAt Expiration timestamp
     */
    function getCredentialInfo(uint256 credentialId) 
        external 
        view 
        returns (
            bool exists,
            address issuer,
            address recipient,
            string memory credentialType,
            uint256 issuedAt,
            uint256 expiresAt
        ) 
    {
        try credentialRegistry.getCredential(credentialId) returns (CredentialRegistry.Credential memory credential) {
            exists = true;
            issuer = credential.issuer;
            recipient = credential.recipient;
            credentialType = credential.credentialType;
            issuedAt = credential.issuedAt;
            expiresAt = credential.expiresAt;
        } catch {
            exists = false;
        }
        
        return (exists, issuer, recipient, credentialType, issuedAt, expiresAt);
    }

    /**
     * @dev Get credentials by recipient address
     * @param recipient Address of the credential recipient
     * @return credentialIds Array of credential IDs for the recipient
     */
    function getRecipientCredentials(address recipient) 
        external 
        view 
        returns (uint256[] memory credentialIds) 
    {
        return credentialRegistry.getCredentialsByRecipient(recipient);
    }

    /**
     * @dev Get valid (active) credentials for a recipient
     * @param recipient Address of the credential recipient
     * @return validCredentialIds Array of valid credential IDs
     */
    function getValidCredentialsForRecipient(address recipient) 
        external 
        view 
        returns (uint256[] memory validCredentialIds) 
    {
        uint256[] memory allCredentials = credentialRegistry.getCredentialsByRecipient(recipient);
        uint256 validCount = 0;
        
        // First pass: count valid credentials
        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (credentialRegistry.isCredentialValid(allCredentials[i])) {
                validCount++;
            }
        }
        
        // Second pass: collect valid credentials
        validCredentialIds = new uint256[](validCount);
        uint256 index = 0;
        
        for (uint256 i = 0; i < allCredentials.length; i++) {
            if (credentialRegistry.isCredentialValid(allCredentials[i])) {
                validCredentialIds[index] = allCredentials[i];
                index++;
            }
        }
        
        return validCredentialIds;
    }

    /**
     * @dev Check if recipient has valid credentials of specific type
     * @param recipient Address of the recipient
     * @param credentialType Type of credential to check
     * @return hasValidCredential True if recipient has valid credentials of the type
     * @return count Number of valid credentials of the type
     */
    function hasValidCredentialType(address recipient, string memory credentialType) 
        external 
        view 
        returns (bool hasValidCredential, uint256 count) 
    {
        uint256[] memory recipientCredentials = credentialRegistry.getCredentialsByRecipient(recipient);
        
        for (uint256 i = 0; i < recipientCredentials.length; i++) {
            try credentialRegistry.getCredential(recipientCredentials[i]) returns (CredentialRegistry.Credential memory credential) {
                if (keccak256(bytes(credential.credentialType)) == keccak256(bytes(credentialType))) {
                    if (credentialRegistry.isCredentialValid(recipientCredentials[i])) {
                        hasValidCredential = true;
                        count++;
                    }
                }
            } catch {
                // Skip invalid credentials
                continue;
            }
        }
        
        return (hasValidCredential, count);
    }

    /**
     * @dev Get issuer profile information
     * @param issuer Address of the issuer
     * @return profile Issuer profile information
     */
    function getIssuerProfile(address issuer) 
        external 
        view 
        returns (CredentialRegistry.IssuerProfile memory profile) 
    {
        (, profile) = credentialRegistry.issuerProfiles(issuer);
        return profile;
    }

    /**
     * @dev Get total number of credentials in the registry
     * @return totalCount Total number of credentials
     */
    function getTotalCredentialsCount() external view returns (uint256 totalCount) {
        return credentialRegistry.getTotalCredentials();
    }
}