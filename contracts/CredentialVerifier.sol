// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./ICredentialIssuer.sol";

/**
 * @title CredentialVerifier
 * @dev Smart contract for verifying credentials issued by the CredentialIssuer contract
 * @author Your Name
 */
contract CredentialVerifier is Ownable {
    // Reference to the main credential issuer contract
    ICredentialIssuer public credentialIssuer;
    
    // Mapping to track verification requests
    mapping(bytes32 => VerificationRequest) public verificationRequests;
    
    // Mapping to track verification results
    mapping(bytes32 => VerificationResult) public verificationResults;
    
    // Events
    event VerificationRequested(bytes32 indexed requestId, address indexed requester, uint256 credentialId);
    event VerificationCompleted(bytes32 indexed requestId, bool isValid, string reason);
    event CredentialIssuerUpdated(address indexed oldIssuer, address indexed newIssuer);
    
    // Structures
    struct VerificationRequest {
        address requester;
        uint256 credentialId;
        uint256 requestedAt;
        bool isCompleted;
    }
    
    struct VerificationResult {
        bool isValid;
        string reason;
        uint256 verifiedAt;
        ICredentialIssuer.Credential credential;
    }
    
    // Modifiers
    modifier onlyValidCredentialIssuer() {
        require(address(credentialIssuer) != address(0), "CredentialVerifier: Credential issuer not set");
        _;
    }

    /**
     * @dev Constructor
     * @param _credentialIssuer Address of the credential issuer contract
     */
    constructor(address _credentialIssuer) {
        require(_credentialIssuer != address(0), "CredentialVerifier: Invalid credential issuer address");
        credentialIssuer = ICredentialIssuer(_credentialIssuer);
    }

    /**
     * @dev Update the credential issuer contract address
     * @param _newCredentialIssuer New address of the credential issuer contract
     */
    function updateCredentialIssuer(address _newCredentialIssuer) external onlyOwner {
        require(_newCredentialIssuer != address(0), "CredentialVerifier: Invalid credential issuer address");
        address oldIssuer = address(credentialIssuer);
        credentialIssuer = ICredentialIssuer(_newCredentialIssuer);
        emit CredentialIssuerUpdated(oldIssuer, _newCredentialIssuer);
    }

    /**
     * @dev Request verification of a credential
     * @param credentialId ID of the credential to verify
     * @return requestId Unique identifier for the verification request
     */
    function requestVerification(uint256 credentialId) external onlyValidCredentialIssuer returns (bytes32 requestId) {
        require(credentialId > 0, "CredentialVerifier: Invalid credential ID");
        
        requestId = keccak256(abi.encodePacked(msg.sender, credentialId, block.timestamp));
        
        verificationRequests[requestId] = VerificationRequest({
            requester: msg.sender,
            credentialId: credentialId,
            requestedAt: block.timestamp,
            isCompleted: false
        });
        
        emit VerificationRequested(requestId, msg.sender, credentialId);
        
        return requestId;
    }

    /**
     * @dev Verify a credential and store the result
     * @param credentialId ID of the credential to verify
     * @return requestId Unique identifier for the verification request
     * @return isValid Whether the credential is valid
     * @return reason Reason for the verification result
     */
    function verifyCredential(uint256 credentialId) external onlyValidCredentialIssuer returns (
        bytes32 requestId,
        bool isValid,
        string memory reason
    ) {
        requestId = requestVerification(credentialId);
        
        // Perform verification
        (isValid, ICredentialIssuer.Credential memory credential) = credentialIssuer.verifyCredential(credentialId);
        
        // Determine reason
        if (isValid) {
            reason = "Credential is valid";
        } else {
            if (credential.issuer == address(0)) {
                reason = "Credential does not exist";
            } else if (credential.isRevoked) {
                reason = string(abi.encodePacked("Credential revoked: ", credential.revocationReason));
            } else if (credential.expiryDate > 0 && credential.expiryDate <= block.timestamp) {
                reason = "Credential has expired";
            } else {
                reason = "Credential issuer is not active";
            }
        }
        
        // Store verification result
        verificationResults[requestId] = VerificationResult({
            isValid: isValid,
            reason: reason,
            verifiedAt: block.timestamp,
            credential: credential
        });
        
        // Mark request as completed
        verificationRequests[requestId].isCompleted = true;
        
        emit VerificationCompleted(requestId, isValid, reason);
        
        return (requestId, isValid, reason);
    }

    /**
     * @dev Verify a credential by its hash
     * @param credentialHash Hash of the credential to verify
     * @return requestId Unique identifier for the verification request
     * @return isValid Whether the credential is valid
     * @return reason Reason for the verification result
     */
    function verifyCredentialByHash(bytes32 credentialHash) external onlyValidCredentialIssuer returns (
        bytes32 requestId,
        bool isValid,
        string memory reason
    ) {
        // Create a unique request ID for hash verification
        requestId = keccak256(abi.encodePacked(msg.sender, credentialHash, block.timestamp));
        
        verificationRequests[requestId] = VerificationRequest({
            requester: msg.sender,
            credentialId: 0, // Not applicable for hash verification
            requestedAt: block.timestamp,
            isCompleted: false
        });
        
        // Perform verification
        (isValid, ICredentialIssuer.Credential memory credential) = credentialIssuer.verifyCredentialByHash(credentialHash);
        
        // Determine reason
        if (isValid) {
            reason = "Credential is valid";
        } else {
            if (credential.issuer == address(0)) {
                reason = "Credential does not exist";
            } else if (credential.isRevoked) {
                reason = string(abi.encodePacked("Credential revoked: ", credential.revocationReason));
            } else if (credential.expiryDate > 0 && credential.expiryDate <= block.timestamp) {
                reason = "Credential has expired";
            } else {
                reason = "Credential issuer is not active";
            }
        }
        
        // Store verification result
        verificationResults[requestId] = VerificationResult({
            isValid: isValid,
            reason: reason,
            verifiedAt: block.timestamp,
            credential: credential
        });
        
        // Mark request as completed
        verificationRequests[requestId].isCompleted = true;
        
        emit VerificationRequested(requestId, msg.sender, 0);
        emit VerificationCompleted(requestId, isValid, reason);
        
        return (requestId, isValid, reason);
    }

    /**
     * @dev Get verification request details
     * @param requestId ID of the verification request
     * @return request The verification request data
     */
    function getVerificationRequest(bytes32 requestId) external view returns (VerificationRequest memory request) {
        return verificationRequests[requestId];
    }

    /**
     * @dev Get verification result
     * @param requestId ID of the verification request
     * @return result The verification result data
     */
    function getVerificationResult(bytes32 requestId) external view returns (VerificationResult memory result) {
        return verificationResults[requestId];
    }

    /**
     * @dev Batch verify multiple credentials
     * @param credentialIds Array of credential IDs to verify
     * @return requestIds Array of request IDs
     * @return validities Array of validity results
     * @return reasons Array of reasons
     */
    function batchVerifyCredentials(uint256[] memory credentialIds) external onlyValidCredentialIssuer returns (
        bytes32[] memory requestIds,
        bool[] memory validities,
        string[] memory reasons
    ) {
        require(credentialIds.length > 0, "CredentialVerifier: Empty credential IDs array");
        require(credentialIds.length <= 50, "CredentialVerifier: Too many credentials to verify at once");
        
        requestIds = new bytes32[](credentialIds.length);
        validities = new bool[](credentialIds.length);
        reasons = new string[](credentialIds.length);
        
        for (uint256 i = 0; i < credentialIds.length; i++) {
            (requestIds[i], validities[i], reasons[i]) = verifyCredential(credentialIds[i]);
        }
        
        return (requestIds, validities, reasons);
    }

    /**
     * @dev Check if a credential is valid (view function)
     * @param credentialId ID of the credential to check
     * @return isValid Whether the credential is valid
     */
    function isCredentialValid(uint256 credentialId) external view onlyValidCredentialIssuer returns (bool isValid) {
        (isValid, ) = credentialIssuer.verifyCredential(credentialId);
        return isValid;
    }

    /**
     * @dev Check if a credential hash is valid (view function)
     * @param credentialHash Hash of the credential to check
     * @return isValid Whether the credential is valid
     */
    function isCredentialHashValid(bytes32 credentialHash) external view onlyValidCredentialIssuer returns (bool isValid) {
        (isValid, ) = credentialIssuer.verifyCredentialByHash(credentialHash);
        return isValid;
    }
}