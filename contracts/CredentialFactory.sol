// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/proxy/Clones.sol";
import "./CredentialIssuer.sol";
import "./CredentialVerifier.sol";

/**
 * @title CredentialFactory
 * @dev Factory contract for deploying credential issuer and verifier instances
 * @author Your Name
 */
contract CredentialFactory is Ownable {
    // Implementation contracts
    address public credentialIssuerImplementation;
    address public credentialVerifierImplementation;
    
    // Mapping to track deployed instances
    mapping(address => InstanceInfo) public deployedInstances;
    mapping(address => bool) public isDeployedInstance;
    
    // Arrays to track all instances
    address[] public allCredentialIssuers;
    address[] public allCredentialVerifiers;
    
    // Events
    event CredentialIssuerDeployed(address indexed instance, address indexed owner, string name);
    event CredentialVerifierDeployed(address indexed instance, address indexed issuer, address indexed owner);
    event ImplementationUpdated(string contractType, address indexed oldImpl, address indexed newImpl);
    
    // Structures
    struct InstanceInfo {
        address owner;
        string name;
        uint256 deployedAt;
        bool isActive;
    }

    /**
     * @dev Constructor
     * @param _credentialIssuerImplementation Address of the credential issuer implementation
     * @param _credentialVerifierImplementation Address of the credential verifier implementation
     */
    constructor(
        address _credentialIssuerImplementation,
        address _credentialVerifierImplementation
    ) {
        require(_credentialIssuerImplementation != address(0), "CredentialFactory: Invalid issuer implementation");
        require(_credentialVerifierImplementation != address(0), "CredentialFactory: Invalid verifier implementation");
        
        credentialIssuerImplementation = _credentialIssuerImplementation;
        credentialVerifierImplementation = _credentialVerifierImplementation;
    }

    /**
     * @dev Deploy a new credential issuer instance
     * @param name Name for the credential issuer instance
     * @return instance Address of the deployed instance
     */
    function deployCredentialIssuer(string memory name) external returns (address instance) {
        require(bytes(name).length > 0, "CredentialFactory: Name cannot be empty");
        
        // Deploy proxy
        instance = Clones.clone(credentialIssuerImplementation);
        
        // Initialize the instance
        CredentialIssuer(instance).transferOwnership(msg.sender);
        
        // Track the instance
        deployedInstances[instance] = InstanceInfo({
            owner: msg.sender,
            name: name,
            deployedAt: block.timestamp,
            isActive: true
        });
        
        isDeployedInstance[instance] = true;
        allCredentialIssuers.push(instance);
        
        emit CredentialIssuerDeployed(instance, msg.sender, name);
        
        return instance;
    }

    /**
     * @dev Deploy a new credential verifier instance
     * @param credentialIssuer Address of the credential issuer to verify
     * @param name Name for the credential verifier instance
     * @return instance Address of the deployed instance
     */
    function deployCredentialVerifier(
        address credentialIssuer,
        string memory name
    ) external returns (address instance) {
        require(credentialIssuer != address(0), "CredentialFactory: Invalid credential issuer");
        require(isDeployedInstance[credentialIssuer], "CredentialFactory: Credential issuer not deployed by factory");
        require(bytes(name).length > 0, "CredentialFactory: Name cannot be empty");
        
        // Deploy proxy
        instance = Clones.clone(credentialVerifierImplementation);
        
        // Initialize the instance
        CredentialVerifier(instance).transferOwnership(msg.sender);
        
        // Track the instance
        deployedInstances[instance] = InstanceInfo({
            owner: msg.sender,
            name: name,
            deployedAt: block.timestamp,
            isActive: true
        });
        
        isDeployedInstance[instance] = true;
        allCredentialVerifiers.push(instance);
        
        emit CredentialVerifierDeployed(instance, credentialIssuer, msg.sender);
        
        return instance;
    }

    /**
     * @dev Deploy both credential issuer and verifier in one transaction
     * @param issuerName Name for the credential issuer instance
     * @param verifierName Name for the credential verifier instance
     * @return issuerInstance Address of the deployed issuer instance
     * @return verifierInstance Address of the deployed verifier instance
     */
    function deployCredentialSystem(
        string memory issuerName,
        string memory verifierName
    ) external returns (address issuerInstance, address verifierInstance) {
        // Deploy issuer first
        issuerInstance = deployCredentialIssuer(issuerName);
        
        // Deploy verifier
        verifierInstance = deployCredentialVerifier(issuerInstance, verifierName);
        
        return (issuerInstance, verifierInstance);
    }

    /**
     * @dev Update implementation contracts (only owner)
     * @param _credentialIssuerImplementation New credential issuer implementation
     * @param _credentialVerifierImplementation New credential verifier implementation
     */
    function updateImplementations(
        address _credentialIssuerImplementation,
        address _credentialVerifierImplementation
    ) external onlyOwner {
        if (_credentialIssuerImplementation != address(0)) {
            address oldImpl = credentialIssuerImplementation;
            credentialIssuerImplementation = _credentialIssuerImplementation;
            emit ImplementationUpdated("CredentialIssuer", oldImpl, _credentialIssuerImplementation);
        }
        
        if (_credentialVerifierImplementation != address(0)) {
            address oldImpl = credentialVerifierImplementation;
            credentialVerifierImplementation = _credentialVerifierImplementation;
            emit ImplementationUpdated("CredentialVerifier", oldImpl, _credentialVerifierImplementation);
        }
    }

    /**
     * @dev Deactivate an instance (only owner)
     * @param instance Address of the instance to deactivate
     */
    function deactivateInstance(address instance) external onlyOwner {
        require(isDeployedInstance[instance], "CredentialFactory: Instance not found");
        require(deployedInstances[instance].isActive, "CredentialFactory: Instance already deactivated");
        
        deployedInstances[instance].isActive = false;
    }

    /**
     * @dev Reactivate an instance (only owner)
     * @param instance Address of the instance to reactivate
     */
    function reactivateInstance(address instance) external onlyOwner {
        require(isDeployedInstance[instance], "CredentialFactory: Instance not found");
        require(!deployedInstances[instance].isActive, "CredentialFactory: Instance already active");
        
        deployedInstances[instance].isActive = true;
    }

    /**
     * @dev Get instance information
     * @param instance Address of the instance
     * @return info Instance information
     */
    function getInstanceInfo(address instance) external view returns (InstanceInfo memory info) {
        return deployedInstances[instance];
    }

    /**
     * @dev Get all credential issuer instances
     * @return Array of credential issuer addresses
     */
    function getAllCredentialIssuers() external view returns (address[] memory) {
        return allCredentialIssuers;
    }

    /**
     * @dev Get all credential verifier instances
     * @return Array of credential verifier addresses
     */
    function getAllCredentialVerifiers() external view returns (address[] memory) {
        return allCredentialVerifiers;
    }

    /**
     * @dev Get active credential issuer instances
     * @return Array of active credential issuer addresses
     */
    function getActiveCredentialIssuers() external view returns (address[] memory) {
        address[] memory activeInstances = new address[](allCredentialIssuers.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allCredentialIssuers.length; i++) {
            if (deployedInstances[allCredentialIssuers[i]].isActive) {
                activeInstances[activeCount] = allCredentialIssuers[i];
                activeCount++;
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(activeInstances, activeCount)
        }
        
        return activeInstances;
    }

    /**
     * @dev Get active credential verifier instances
     * @return Array of active credential verifier addresses
     */
    function getActiveCredentialVerifiers() external view returns (address[] memory) {
        address[] memory activeInstances = new address[](allCredentialVerifiers.length);
        uint256 activeCount = 0;
        
        for (uint256 i = 0; i < allCredentialVerifiers.length; i++) {
            if (deployedInstances[allCredentialVerifiers[i]].isActive) {
                activeInstances[activeCount] = allCredentialVerifiers[i];
                activeCount++;
            }
        }
        
        // Resize array to actual count
        assembly {
            mstore(activeInstances, activeCount)
        }
        
        return activeInstances;
    }

    /**
     * @dev Get total number of deployed instances
     * @return issuerCount Number of credential issuers
     * @return verifierCount Number of credential verifiers
     */
    function getTotalInstances() external view returns (uint256 issuerCount, uint256 verifierCount) {
        return (allCredentialIssuers.length, allCredentialVerifiers.length);
    }

    /**
     * @dev Check if an address is a deployed instance
     * @param instance Address to check
     * @return True if it's a deployed instance
     */
    function isInstance(address instance) external view returns (bool) {
        return isDeployedInstance[instance];
    }
}