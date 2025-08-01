// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CredentialIssuer.sol";

/**
 * @title CredentialVerifier
 * @dev Smart contract for verifying digital credentials issued by CredentialIssuer
 * @author Your Name
 */
contract CredentialVerifier {
    CredentialIssuer public credentialIssuer;
    
    // Events
    event CredentialVerified(
        uint256 indexed credentialId,
        address indexed verifier,
        bool isValid,
        string reason
    );

    event BatchVerificationCompleted(
        address indexed verifier,
        uint256[] credentialIds,
        bool[] results
    );

    constructor(address _credentialIssuer) {
        require(_credentialIssuer != address(0), "CredentialVerifier: Invalid issuer address");
        credentialIssuer = CredentialIssuer(_credentialIssuer);
    }

    /**
     * @dev Verify a single credential
     * @param credentialId ID of the credential to verify
     * @return isValid Whether the credential is valid
     * @return reason Reason for validity/invalidity
     */
    function verifyCredential(uint256 credentialId) 
        external 
        view 
        returns (bool isValid, string memory reason) 
    {
        try credentialIssuer.getCredential(credentialId) returns (CredentialIssuer.Credential memory credential) {
            // Check if credential is revoked
            if (credential.isRevoked) {
                return (false, "Credential has been revoked");
            }
            
            // Check if credential has expired
            if (credential.expiryDate > 0 && block.timestamp >= credential.expiryDate) {
                return (false, "Credential has expired");
            }
            
            // Check if issuer is still active
            if (!credentialIssuer.isActiveIssuer(credential.issuer)) {
                return (false, "Credential issuer is no longer active");
            }
            
            return (true, "Credential is valid");
        } catch {
            return (false, "Credential does not exist");
        }
    }

    /**
     * @dev Verify multiple credentials in batch
     * @param credentialIds Array of credential IDs to verify
     * @return results Array of verification results
     * @return reasons Array of reasons for each result
     */
    function verifyCredentialsBatch(uint256[] memory credentialIds) 
        external 
        view 
        returns (bool[] memory results, string[] memory reasons) 
    {
        require(credentialIds.length > 0, "CredentialVerifier: Empty credential array");
        require(credentialIds.length <= 100, "CredentialVerifier: Too many credentials (max 100)");
        
        results = new bool[](credentialIds.length);
        reasons = new string[](credentialIds.length);
        
        for (uint256 i = 0; i < credentialIds.length; i++) {
            (results[i], reasons[i]) = this.verifyCredential(credentialIds[i]);
        }
        
        emit BatchVerificationCompleted(msg.sender, credentialIds, results);
        
        return (results, reasons);
    }

    /**
     * @dev Get detailed credential information for verification
     * @param credentialId ID of the credential
     * @return credential Credential details
     * @return issuerInfo Issuer information
     * @return isValid Whether the credential is valid
     */
    function getCredentialVerificationDetails(uint256 credentialId) 
        external 
        view 
        returns (
            CredentialIssuer.Credential memory credential,
            CredentialIssuer.Issuer memory issuerInfo,
            bool isValid
        ) 
    {
        try credentialIssuer.getCredential(credentialId) returns (CredentialIssuer.Credential memory cred) {
            credential = cred;
            issuerInfo = credentialIssuer.getIssuerInfo(cred.issuer);
            isValid = credentialIssuer.isCredentialValid(credentialId);
        } catch {
            // Return empty structs if credential doesn't exist
            isValid = false;
        }
    }

    /**
     * @dev Check if a recipient has any valid credentials of a specific type
     * @param recipient Address of the recipient
     * @param credentialType Type of credential to check
     * @return hasValidCredential True if recipient has valid credential of specified type
     * @return credentialId ID of the first valid credential found (0 if none)
     */
    function hasValidCredentialOfType(address recipient, string memory credentialType) 
        external 
        view 
        returns (bool hasValidCredential, uint256 credentialId) 
    {
        uint256[] memory credentialIds = credentialIssuer.getRecipientCredentials(recipient);
        
        for (uint256 i = 0; i < credentialIds.length; i++) {
            try credentialIssuer.getCredential(credentialIds[i]) returns (CredentialIssuer.Credential memory credential) {
                if (keccak256(bytes(credential.credentialType)) == keccak256(bytes(credentialType))) {
                    if (credentialIssuer.isCredentialValid(credentialIds[i])) {
                        return (true, credentialIds[i]);
                    }
                }
            } catch {
                continue;
            }
        }
        
        return (false, 0);
    }

    /**
     * @dev Get all valid credentials for a recipient
     * @param recipient Address of the recipient
     * @return validCredentialIds Array of valid credential IDs
     */
    function getValidCredentials(address recipient) 
        external 
        view 
        returns (uint256[] memory validCredentialIds) 
    {
        uint256[] memory allCredentialIds = credentialIssuer.getRecipientCredentials(recipient);
        uint256 validCount = 0;
        
        // First pass: count valid credentials
        for (uint256 i = 0; i < allCredentialIds.length; i++) {
            if (credentialIssuer.isCredentialValid(allCredentialIds[i])) {
                validCount++;
            }
        }
        
        // Second pass: collect valid credential IDs
        validCredentialIds = new uint256[](validCount);
        uint256 validIndex = 0;
        
        for (uint256 i = 0; i < allCredentialIds.length; i++) {
            if (credentialIssuer.isCredentialValid(allCredentialIds[i])) {
                validCredentialIds[validIndex] = allCredentialIds[i];
                validIndex++;
            }
        }
        
        return validCredentialIds;
    }

    /**
     * @dev Verify credential and emit event
     * @param credentialId ID of the credential to verify
     */
    function verifyAndEmit(uint256 credentialId) external {
        (bool isValid, string memory reason) = this.verifyCredential(credentialId);
        
        emit CredentialVerified(credentialId, msg.sender, isValid, reason);
    }

    /**
     * @dev Get the address of the credential issuer contract
     * @return Address of the credential issuer
     */
    function getCredentialIssuerAddress() external view returns (address) {
        return address(credentialIssuer);
    }
}