# Polygon Blockchain Credential Issuance System

A comprehensive smart contract system for issuing, managing, and verifying digital credentials on the Polygon blockchain. This system provides a secure, decentralized way to handle verifiable credentials with support for issuance, revocation, verification, and multi-tenant deployments.

## 🌟 Features

### Core Functionality
- **Credential Issuance**: Issue digital credentials to recipients with metadata and expiry dates
- **Credential Verification**: Verify credentials by ID or hash with comprehensive validation
- **Credential Revocation**: Revoke credentials with reason tracking
- **Issuer Management**: Register and manage credential issuers with admin controls
- **Multi-Tenant Support**: Deploy multiple credential systems using the factory pattern

### Security Features
- **Access Control**: Role-based permissions using OpenZeppelin's Ownable
- **Reentrancy Protection**: Prevents reentrancy attacks
- **Input Validation**: Comprehensive validation for all inputs
- **Event Logging**: Full audit trail with indexed events
- **Hash Verification**: Cryptographic verification using credential hashes

### Advanced Features
- **Batch Operations**: Verify multiple credentials in a single transaction
- **Expiry Management**: Support for credentials with or without expiry dates
- **Metadata Support**: Flexible metadata storage for credentials and issuers
- **Factory Pattern**: Deploy multiple isolated credential systems
- **Gas Optimization**: Optimized for Polygon's low gas costs

## 📋 Smart Contracts

### 1. CredentialIssuer.sol
The main contract for credential management:
- Register issuers
- Issue credentials to recipients
- Revoke credentials
- Verify credentials
- Manage issuer status

### 2. CredentialVerifier.sol
Specialized contract for credential verification:
- Request verification with tracking
- Batch verification capabilities
- Verification result storage
- Hash-based verification

### 3. CredentialFactory.sol
Factory contract for deploying multiple instances:
- Deploy credential issuer instances
- Deploy credential verifier instances
- Manage implementation updates
- Track deployed instances

### 4. ICredentialIssuer.sol
Interface defining the contract structure and function signatures.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Hardhat
- MetaMask or similar wallet

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd polygon-credential-issuance
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` file with your configuration:
```env
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# Polygon RPC URLs
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com

# API Keys for verification
POLYGONSCAN_API_KEY=your_polygonscan_api_key
COINMARKETCAP_API_KEY=your_coinmarketcap_api_key

# Gas reporting
REPORT_GAS=true
```

4. **Compile contracts**
```bash
npm run compile
```

5. **Run tests**
```bash
npm test
```

### Deployment

#### Deploy to Mumbai Testnet
```bash
npm run deploy:mumbai
```

#### Deploy to Polygon Mainnet
```bash
npm run deploy:polygon
```

#### Deploy to Local Network
```bash
npx hardhat node
npm run deploy:local
```

## 📖 Usage Guide

### 1. Register as an Issuer

```javascript
const { ethers } = require("hardhat");

// Get the contract instance
const credentialIssuer = await ethers.getContractAt("CredentialIssuer", contractAddress);

// Register as an issuer
const tx = await credentialIssuer.registerIssuer(
  "University Name",
  "A prestigious university",
  '{"website": "https://university.edu", "location": "City, Country"}'
);
await tx.wait();
```

### 2. Issue a Credential

```javascript
// Issue a credential to a recipient
const recipient = "0x1234567890123456789012345678901234567890";
const credentialType = "Bachelor's Degree";
const metadata = '{"major": "Computer Science", "gpa": "3.8", "graduationYear": "2023"}';
const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

const tx = await credentialIssuer.issueCredential(
  recipient,
  credentialType,
  metadata,
  expiryDate
);
const receipt = await tx.wait();
const event = receipt.events.find(e => e.event === "CredentialIssued");
const credentialId = event.args.credentialId;
```

### 3. Verify a Credential

```javascript
// Verify by credential ID
const [isValid, credential] = await credentialIssuer.verifyCredential(credentialId);
console.log("Credential valid:", isValid);
console.log("Credential data:", credential);

// Verify by hash
const credentialHash = credential.credentialHash;
const [isValidByHash, credentialByHash] = await credentialIssuer.verifyCredentialByHash(credentialHash);
```

### 4. Revoke a Credential

```javascript
// Revoke a credential
const reason = "Academic dishonesty discovered";
const tx = await credentialIssuer.revokeCredential(credentialId, reason);
await tx.wait();
```

### 5. Use the Verifier Contract

```javascript
const credentialVerifier = await ethers.getContractAt("CredentialVerifier", verifierAddress);

// Request verification
const [requestId, isValid, reason] = await credentialVerifier.verifyCredential(credentialId);
console.log("Verification result:", { requestId, isValid, reason });

// Batch verification
const credentialIds = [1, 2, 3, 4, 5];
const [requestIds, validities, reasons] = await credentialVerifier.batchVerifyCredentials(credentialIds);
```

### 6. Deploy Multiple Systems with Factory

```javascript
const credentialFactory = await ethers.getContractAt("CredentialFactory", factoryAddress);

// Deploy a complete credential system
const [issuerInstance, verifierInstance] = await credentialFactory.deployCredentialSystem(
  "University A Credential System",
  "University A Verifier"
);

// Deploy individual components
const issuerInstance = await credentialFactory.deployCredentialIssuer("Organization B");
const verifierInstance = await credentialFactory.deployCredentialVerifier(issuerInstance, "Organization B Verifier");
```

## 🔧 Configuration

### Network Configuration

The system supports multiple networks:

- **Polygon Mainnet** (Chain ID: 137)
- **Mumbai Testnet** (Chain ID: 80001)
- **Local Development** (Chain ID: 1337)

### Gas Optimization

The contracts are optimized for Polygon's low gas costs:
- Solidity optimizer enabled with 200 runs
- Efficient data structures
- Batch operations for multiple credentials
- Minimal storage operations

## 🧪 Testing

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npx hardhat test test/CredentialIssuer.test.js
```

### Run with Gas Reporting
```bash
REPORT_GAS=true npm test
```

### Coverage Report
```bash
npx hardhat coverage
```

## 📊 Gas Usage

Typical gas costs on Polygon:

| Operation | Gas Used | Cost (MATIC) |
|-----------|----------|--------------|
| Register Issuer | ~120,000 | ~0.0036 |
| Issue Credential | ~180,000 | ~0.0054 |
| Verify Credential | ~25,000 | ~0.00075 |
| Revoke Credential | ~80,000 | ~0.0024 |
| Batch Verify (5 creds) | ~120,000 | ~0.0036 |

*Costs based on 30 gwei gas price on Polygon mainnet*

## 🔒 Security Considerations

### Access Control
- Only registered issuers can issue credentials
- Only credential issuers can revoke their credentials
- Only contract owner can deactivate/reactivate issuers
- Factory owner controls implementation updates

### Data Integrity
- Credential hashes prevent tampering
- Timestamp validation for expiry dates
- Comprehensive input validation
- Reentrancy protection

### Privacy
- Credential metadata is stored on-chain
- Consider using IPFS for large metadata
- Implement off-chain data storage for sensitive information

## 🌐 Integration Examples

### Frontend Integration (React)

```javascript
import { ethers } from 'ethers';

class CredentialService {
  constructor(contractAddress, signer) {
    this.contract = new ethers.Contract(contractAddress, ABI, signer);
  }

  async issueCredential(recipient, type, metadata, expiry) {
    const tx = await this.contract.issueCredential(recipient, type, metadata, expiry);
    return await tx.wait();
  }

  async verifyCredential(credentialId) {
    return await this.contract.verifyCredential(credentialId);
  }
}
```

### Backend Integration (Node.js)

```javascript
const { ethers } = require('ethers');

class CredentialAPI {
  constructor(provider, contractAddress, privateKey) {
    this.provider = new ethers.providers.JsonRpcProvider(provider);
    this.wallet = new ethers.Wallet(privateKey, this.provider);
    this.contract = new ethers.Contract(contractAddress, ABI, this.wallet);
  }

  async batchIssueCredentials(credentials) {
    const txs = credentials.map(cred => 
      this.contract.issueCredential(cred.recipient, cred.type, cred.metadata, cred.expiry)
    );
    return await Promise.all(txs.map(tx => tx.wait()));
  }
}
```

## 📈 Monitoring and Analytics

### Events to Monitor
- `IssuerRegistered`: Track new issuers
- `CredentialIssued`: Monitor credential issuance
- `CredentialRevoked`: Track revocations
- `CredentialVerified`: Monitor verification requests

### Key Metrics
- Total credentials issued
- Active issuers count
- Verification success rate
- Average credential lifetime
- Revocation rate

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass
6. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the test files for usage examples

## 🔮 Roadmap

- [ ] Support for credential templates
- [ ] Advanced metadata schemas
- [ ] Cross-chain credential verification
- [ ] Mobile SDK
- [ ] Dashboard application
- [ ] API gateway service
- [ ] Integration with existing identity systems

---

**Built with ❤️ for the Polygon ecosystem**
