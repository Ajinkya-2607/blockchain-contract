// Frontend Integration Example for Polygon Credential Issuance System
// This example shows how to integrate the smart contracts with a web frontend

const { ethers } = require('ethers');

class CredentialSystem {
    constructor(provider, factoryAddress, issuerAddress, verifierAddress) {
        this.provider = provider;
        this.signer = provider.getSigner();
        this.factoryAddress = factoryAddress;
        this.issuerAddress = issuerAddress;
        this.verifierAddress = verifierAddress;
        
        // Contract ABIs (simplified for example)
        this.factoryABI = [
            "function deployCredentialSystem(string name, string description, uint256 issuanceFee, uint256 revocationFee) external payable returns (address issuer, address verifier)",
            "function getAllDeployedSystems() external view returns (address[] memory)",
            "function getCredentialSystem(address issuer) external view returns (tuple(address issuer, address verifier, string name, string description, address deployer, uint256 deployedAt, bool isActive))"
        ];
        
        this.issuerABI = [
            "function issueCredential(address recipient, string credentialType, string metadata, uint256 expiryDate) external payable",
            "function revokeCredential(uint256 credentialId) external payable",
            "function getCredential(uint256 credentialId) external view returns (tuple(uint256 id, address issuer, address recipient, string credentialType, string metadata, uint256 issuedAt, uint256 expiryDate, bool isRevoked, uint256 revokedAt))",
            "function isCredentialValid(uint256 credentialId) external view returns (bool)",
            "function addCredentialType(string credentialType) external",
            "function registerIssuer(address issuer, string name, string description, bool isActive) external",
            "function issuanceFee() external view returns (uint256)",
            "function revocationFee() external view returns (uint256)"
        ];
        
        this.verifierABI = [
            "function verifyCredential(uint256 credentialId) external view returns (bool isValid, string reason)",
            "function verifyCredentialsBatch(uint256[] credentialIds) external view returns (bool[] results, string[] reasons)",
            "function hasValidCredentialOfType(address recipient, string credentialType) external view returns (bool hasValid, uint256 credentialId)",
            "function getValidCredentials(address recipient) external view returns (uint256[] memory)"
        ];
        
        this.factory = new ethers.Contract(factoryAddress, this.factoryABI, this.signer);
        this.issuer = new ethers.Contract(issuerAddress, this.issuerABI, this.signer);
        this.verifier = new ethers.Contract(verifierAddress, this.verifierABI, this.provider);
    }

    // Deploy a new credential system
    async deployCredentialSystem(name, description, issuanceFee, revocationFee) {
        try {
            const deploymentFee = ethers.utils.parseEther("0.01"); // 0.01 MATIC
            
            const tx = await this.factory.deployCredentialSystem(
                name,
                description,
                ethers.utils.parseEther(issuanceFee.toString()),
                ethers.utils.parseEther(revocationFee.toString()),
                { value: deploymentFee }
            );
            
            const receipt = await tx.wait();
            console.log("Credential system deployed:", receipt);
            
            return receipt;
        } catch (error) {
            console.error("Error deploying credential system:", error);
            throw error;
        }
    }

    // Issue a new credential
    async issueCredential(recipient, credentialType, metadata, expiryDate) {
        try {
            const issuanceFee = await this.issuer.issuanceFee();
            
            const tx = await this.issuer.issueCredential(
                recipient,
                credentialType,
                JSON.stringify(metadata),
                expiryDate,
                { value: issuanceFee }
            );
            
            const receipt = await tx.wait();
            console.log("Credential issued:", receipt);
            
            return receipt;
        } catch (error) {
            console.error("Error issuing credential:", error);
            throw error;
        }
    }

    // Revoke a credential
    async revokeCredential(credentialId) {
        try {
            const revocationFee = await this.issuer.revocationFee();
            
            const tx = await this.issuer.revokeCredential(credentialId, { value: revocationFee });
            const receipt = await tx.wait();
            
            console.log("Credential revoked:", receipt);
            return receipt;
        } catch (error) {
            console.error("Error revoking credential:", error);
            throw error;
        }
    }

    // Verify a credential
    async verifyCredential(credentialId) {
        try {
            const [isValid, reason] = await this.verifier.verifyCredential(credentialId);
            return { isValid, reason };
        } catch (error) {
            console.error("Error verifying credential:", error);
            throw error;
        }
    }

    // Verify multiple credentials
    async verifyCredentialsBatch(credentialIds) {
        try {
            const [results, reasons] = await this.verifier.verifyCredentialsBatch(credentialIds);
            return { results, reasons };
        } catch (error) {
            console.error("Error verifying credentials batch:", error);
            throw error;
        }
    }

    // Check if recipient has valid credential of specific type
    async hasValidCredentialOfType(recipient, credentialType) {
        try {
            const [hasValid, credentialId] = await this.verifier.hasValidCredentialOfType(recipient, credentialType);
            return { hasValid, credentialId };
        } catch (error) {
            console.error("Error checking credential type:", error);
            throw error;
        }
    }

    // Get all valid credentials for a recipient
    async getValidCredentials(recipient) {
        try {
            const credentialIds = await this.verifier.getValidCredentials(recipient);
            return credentialIds;
        } catch (error) {
            console.error("Error getting valid credentials:", error);
            throw error;
        }
    }

    // Get credential details
    async getCredential(credentialId) {
        try {
            const credential = await this.issuer.getCredential(credentialId);
            return credential;
        } catch (error) {
            console.error("Error getting credential:", error);
            throw error;
        }
    }

    // Add credential type
    async addCredentialType(credentialType) {
        try {
            const tx = await this.issuer.addCredentialType(credentialType);
            const receipt = await tx.wait();
            console.log("Credential type added:", receipt);
            return receipt;
        } catch (error) {
            console.error("Error adding credential type:", error);
            throw error;
        }
    }

    // Register an issuer
    async registerIssuer(issuerAddress, name, description, isActive) {
        try {
            const tx = await this.issuer.registerIssuer(issuerAddress, name, description, isActive);
            const receipt = await tx.wait();
            console.log("Issuer registered:", receipt);
            return receipt;
        } catch (error) {
            console.error("Error registering issuer:", error);
            throw error;
        }
    }
}

// Example usage functions
class CredentialExamples {
    constructor(credentialSystem) {
        this.credentialSystem = credentialSystem;
    }

    // Example: Issue a university degree
    async issueUniversityDegree() {
        const recipient = "0x1234567890123456789012345678901234567890";
        const metadata = {
            major: "Computer Science",
            gpa: "3.8",
            graduation_year: "2023",
            university: "Polygon University",
            honors: "Magna Cum Laude"
        };
        const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year

        try {
            await this.credentialSystem.addCredentialType("Bachelor's Degree");
            await this.credentialSystem.registerIssuer(
                await this.credentialSystem.signer.getAddress(),
                "Polygon University",
                "A prestigious blockchain university",
                true
            );
            
            const receipt = await this.credentialSystem.issueCredential(
                recipient,
                "Bachelor's Degree",
                metadata,
                expiryDate
            );
            
            console.log("University degree issued successfully:", receipt);
            return receipt;
        } catch (error) {
            console.error("Failed to issue university degree:", error);
            throw error;
        }
    }

    // Example: Verify a professional certification
    async verifyProfessionalCertification(credentialId) {
        try {
            const result = await this.credentialSystem.verifyCredential(credentialId);
            console.log("Certification verification result:", result);
            return result;
        } catch (error) {
            console.error("Failed to verify certification:", error);
            throw error;
        }
    }

    // Example: Batch verify multiple credentials
    async batchVerifyCredentials(credentialIds) {
        try {
            const results = await this.credentialSystem.verifyCredentialsBatch(credentialIds);
            console.log("Batch verification results:", results);
            return results;
        } catch (error) {
            console.error("Failed to batch verify credentials:", error);
            throw error;
        }
    }

    // Example: Check if someone has a valid degree
    async checkValidDegree(recipient) {
        try {
            const result = await this.credentialSystem.hasValidCredentialOfType(
                recipient,
                "Bachelor's Degree"
            );
            console.log("Degree check result:", result);
            return result;
        } catch (error) {
            console.error("Failed to check degree:", error);
            throw error;
        }
    }
}

// Browser integration example
if (typeof window !== 'undefined') {
    window.CredentialSystem = CredentialSystem;
    window.CredentialExamples = CredentialExamples;
}

// Node.js integration example
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CredentialSystem, CredentialExamples };
}

// Usage example for web3 integration
async function initializeCredentialSystem() {
    // Check if MetaMask is installed
    if (typeof window.ethereum === 'undefined') {
        throw new Error('MetaMask is not installed');
    }

    // Request account access
    await window.ethereum.request({ method: 'eth_requestAccounts' });

    // Create provider
    const provider = new ethers.providers.Web3Provider(window.ethereum);

    // Check if connected to Polygon network
    const network = await provider.getNetwork();
    if (network.chainId !== 137 && network.chainId !== 80001) {
        throw new Error('Please connect to Polygon network (mainnet or Mumbai testnet)');
    }

    // Contract addresses (replace with actual deployed addresses)
    const factoryAddress = "0x..."; // Your deployed factory address
    const issuerAddress = "0x...";  // Your deployed issuer address
    const verifierAddress = "0x..."; // Your deployed verifier address

    // Initialize credential system
    const credentialSystem = new CredentialSystem(
        provider,
        factoryAddress,
        issuerAddress,
        verifierAddress
    );

    return credentialSystem;
}

// Example HTML integration
/*
<!DOCTYPE html>
<html>
<head>
    <title>Credential Issuance System</title>
    <script src="https://cdn.ethers.io/lib/ethers-5.7.2.umd.min.js"></script>
    <script src="frontend-integration.js"></script>
</head>
<body>
    <h1>Polygon Credential Issuance System</h1>
    
    <button onclick="connectWallet()">Connect Wallet</button>
    <button onclick="issueCredential()">Issue Credential</button>
    <button onclick="verifyCredential()">Verify Credential</button>
    
    <script>
        let credentialSystem;
        
        async function connectWallet() {
            try {
                credentialSystem = await initializeCredentialSystem();
                alert('Wallet connected successfully!');
            } catch (error) {
                alert('Error connecting wallet: ' + error.message);
            }
        }
        
        async function issueCredential() {
            if (!credentialSystem) {
                alert('Please connect wallet first');
                return;
            }
            
            try {
                const examples = new CredentialExamples(credentialSystem);
                await examples.issueUniversityDegree();
                alert('Credential issued successfully!');
            } catch (error) {
                alert('Error issuing credential: ' + error.message);
            }
        }
        
        async function verifyCredential() {
            if (!credentialSystem) {
                alert('Please connect wallet first');
                return;
            }
            
            const credentialId = prompt('Enter credential ID:');
            if (!credentialId) return;
            
            try {
                const result = await credentialSystem.verifyCredential(credentialId);
                alert(`Credential valid: ${result.isValid}\nReason: ${result.reason}`);
            } catch (error) {
                alert('Error verifying credential: ' + error.message);
            }
        }
    </script>
</body>
</html>
*/