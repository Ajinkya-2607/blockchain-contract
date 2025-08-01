// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "./CredentialIssuer.sol";
import "./CredentialVerifier.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CredentialFactory
 * @dev Factory contract for deploying and managing credential issuance systems
 * @author Your Name
 */
contract CredentialFactory is Ownable {
    // Events
    event CredentialSystemDeployed(
        address indexed issuer,
        address indexed verifier,
        address indexed deployer,
        string name
    );

    event IssuerRegistered(
        address indexed issuer,
        string name,
        string description
    );

    // Structs
    struct CredentialSystem {
        address issuer;
        address verifier;
        string name;
        string description;
        address deployer;
        uint256 deployedAt;
        bool isActive;
    }

    // State variables
    mapping(address => CredentialSystem) public credentialSystems;
    mapping(address => address) public issuerToVerifier;
    mapping(address => address) public verifierToIssuer;
    address[] public deployedSystems;
    
    uint256 public deploymentFee;
    uint256 public totalSystemsDeployed;

    constructor() {
        deploymentFee = 0.01 ether; // 0.01 MATIC
    }

    /**
     * @dev Deploy a new credential issuance system
     * @param name Name of the credential system
     * @param description Description of the credential system
     * @param initialIssuanceFee Initial issuance fee
     * @param initialRevocationFee Initial revocation fee
     * @return issuer Address of the deployed issuer contract
     * @return verifier Address of the deployed verifier contract
     */
    function deployCredentialSystem(
        string memory name,
        string memory description,
        uint256 initialIssuanceFee,
        uint256 initialRevocationFee
    ) external payable returns (address issuer, address verifier) {
        require(msg.value >= deploymentFee, "CredentialFactory: Insufficient deployment fee");
        require(bytes(name).length > 0, "CredentialFactory: Name cannot be empty");
        require(bytes(description).length > 0, "CredentialFactory: Description cannot be empty");

        // Deploy CredentialIssuer
        issuer = address(new CredentialIssuer());
        
        // Deploy CredentialVerifier
        verifier = address(new CredentialVerifier(issuer));

        // Configure the issuer
        CredentialIssuer(issuer).updateIssuanceFee(initialIssuanceFee);
        CredentialIssuer(issuer).updateRevocationFee(initialRevocationFee);

        // Register the system
        credentialSystems[issuer] = CredentialSystem({
            issuer: issuer,
            verifier: verifier,
            name: name,
            description: description,
            deployer: msg.sender,
            deployedAt: block.timestamp,
            isActive: true
        });

        issuerToVerifier[issuer] = verifier;
        verifierToIssuer[verifier] = issuer;
        deployedSystems.push(issuer);
        totalSystemsDeployed++;

        emit CredentialSystemDeployed(issuer, verifier, msg.sender, name);
    }

    /**
     * @dev Get all deployed credential systems
     * @return Array of issuer addresses
     */
    function getAllDeployedSystems() external view returns (address[] memory) {
        return deployedSystems;
    }

    /**
     * @dev Get credential system details
     * @param issuer Address of the issuer contract
     * @return Credential system details
     */
    function getCredentialSystem(address issuer) 
        external 
        view 
        returns (CredentialSystem memory) 
    {
        return credentialSystems[issuer];
    }

    /**
     * @dev Get verifier address for an issuer
     * @param issuer Address of the issuer contract
     * @return Address of the verifier contract
     */
    function getVerifierForIssuer(address issuer) external view returns (address) {
        return issuerToVerifier[issuer];
    }

    /**
     * @dev Get issuer address for a verifier
     * @param verifier Address of the verifier contract
     * @return Address of the issuer contract
     */
    function getIssuerForVerifier(address verifier) external view returns (address) {
        return verifierToIssuer[verifier];
    }

    /**
     * @dev Check if a system is active
     * @param issuer Address of the issuer contract
     * @return True if active, false otherwise
     */
    function isSystemActive(address issuer) external view returns (bool) {
        return credentialSystems[issuer].isActive;
    }

    /**
     * @dev Deactivate a credential system
     * @param issuer Address of the issuer contract
     */
    function deactivateSystem(address issuer) external onlyOwner {
        require(credentialSystems[issuer].isActive, "CredentialFactory: System is not active");
        credentialSystems[issuer].isActive = false;
    }

    /**
     * @dev Reactivate a credential system
     * @param issuer Address of the issuer contract
     */
    function reactivateSystem(address issuer) external onlyOwner {
        require(!credentialSystems[issuer].isActive, "CredentialFactory: System is already active");
        credentialSystems[issuer].isActive = true;
    }

    /**
     * @dev Update deployment fee
     * @param newFee New deployment fee in wei
     */
    function updateDeploymentFee(uint256 newFee) external onlyOwner {
        deploymentFee = newFee;
    }

    /**
     * @dev Withdraw accumulated fees
     */
    function withdrawFees() external onlyOwner {
        uint256 balance = address(this).balance;
        require(balance > 0, "CredentialFactory: No fees to withdraw");
        
        (bool success, ) = payable(owner()).call{value: balance}("");
        require(success, "CredentialFactory: Fee withdrawal failed");
    }

    /**
     * @dev Get factory statistics
     * @return totalDeployed Total systems deployed
     * @return currentFee Current deployment fee
     */
    function getFactoryStats() 
        external 
        view 
        returns (uint256 totalDeployed, uint256 currentFee) 
    {
        return (totalSystemsDeployed, deploymentFee);
    }

    /**
     * @dev Get systems deployed by a specific address
     * @param deployer Address of the deployer
     * @return Array of issuer addresses deployed by the address
     */
    function getSystemsByDeployer(address deployer) 
        external 
        view 
        returns (address[] memory) 
    {
        uint256 count = 0;
        
        // Count systems deployed by this address
        for (uint256 i = 0; i < deployedSystems.length; i++) {
            if (credentialSystems[deployedSystems[i]].deployer == deployer) {
                count++;
            }
        }
        
        // Collect addresses
        address[] memory systems = new address[](count);
        uint256 index = 0;
        
        for (uint256 i = 0; i < deployedSystems.length; i++) {
            if (credentialSystems[deployedSystems[i]].deployer == deployer) {
                systems[index] = deployedSystems[i];
                index++;
            }
        }
        
        return systems;
    }
}