# Polygon Blockchain Credential Issuance System

A comprehensive smart contract system for issuing, verifying, and managing digital credentials on the Polygon blockchain. This system provides a secure, decentralized way to handle academic degrees, professional certifications, and other types of digital credentials.

## 🌟 Features

### Core Functionality
- **Credential Issuance**: Issue digital credentials with rich metadata
- **Batch Operations**: Efficiently issue multiple credentials simultaneously
- **Credential Verification**: Verify credential authenticity and validity
- **Revocation System**: Revoke or suspend credentials when needed
- **Expiration Management**: Set expiration dates for time-sensitive credentials
- **Role-Based Access Control**: Manage permissions for issuers, verifiers, and revokers

### Advanced Features
- **Issuer Profiles**: Detailed profiles for credential issuing organizations
- **Public Verification**: Anyone can verify credentials without special permissions
- **Credential Queries**: Search credentials by recipient, issuer, or type
- **Data Integrity**: Prevent duplicate credentials with hash-based validation
- **Pause Functionality**: Emergency pause capability for system maintenance
- **Gas Optimization**: Efficient smart contract design for minimal gas costs

## 🏗️ Architecture

The system consists of two main smart contracts:

### 1. CredentialRegistry
The core contract that handles:
- Credential issuance and management
- Role-based access control
- Issuer profile management
- Credential revocation and status updates

### 2. CredentialVerifier
A lightweight contract for verification:
- Public credential verification
- Batch verification operations
- Credential queries and statistics
- Integration with third-party systems

## 🚀 Quick Start

### Prerequisites
- Node.js v16 or higher
- npm or yarn
- A Polygon wallet with MATIC tokens

### Installation

1. **Clone and setup the project:**
```bash
git clone <your-repo>
cd polygon-credential-issuance
npm install
```

2. **Configure environment:**
```bash
cp .env.example .env
# Edit .env with your private key and RPC URLs
```

3. **Compile contracts:**
```bash
npm run compile
```

4. **Run tests:**
```bash
npm test
```

5. **Deploy to Polygon Mumbai testnet:**
```bash
npm run deploy:mumbai
```

6. **Deploy to Polygon mainnet:**
```bash
npm run deploy:polygon
```

## 📋 Environment Setup

Create a `.env` file with the following variables:

```env
# Private key for deployment (without 0x prefix)
PRIVATE_KEY=your_private_key_here

# RPC URLs
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com/
POLYGON_RPC_URL=https://polygon-rpc.com/

# API Keys
POLYGONSCAN_API_KEY=your_polygonscan_api_key_here

# Contract Addresses (after deployment)
CREDENTIAL_REGISTRY_ADDRESS=0x...
CREDENTIAL_VERIFIER_ADDRESS=0x...
RECIPIENT_ADDRESS=0x...
CREDENTIAL_ID=1
```

## 💼 Usage Examples

### Issuing a Credential

```javascript
const { ethers } = require("hardhat");

// Connect to deployed contract
const credentialRegistry = await ethers.getContractAt(
  "CredentialRegistry",
  CREDENTIAL_REGISTRY_ADDRESS
);

// Setup issuer profile (one time)
await credentialRegistry.setupIssuerProfile(
  "University Name",
  "Description",
  "https://university.edu",
  "https://university.edu/logo.png"
);

// Issue a credential
const credentialData = {
  studentName: "Alice Johnson",
  degree: "Bachelor of Science in Computer Science",
  gpa: "3.85",
  graduationDate: "2024-05-15"
};

const expirationDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year

const tx = await credentialRegistry.issueCredential(
  recipientAddress,
  "Bachelor Degree",
  JSON.stringify(credentialData),
  expirationDate,
  "ipfs://QmMetadataHash"
);

const receipt = await tx.wait();
const credentialId = receipt.logs[0].args[0]; // Extract from event
```

### Verifying a Credential

```javascript
// Connect to verifier contract
const credentialVerifier = await ethers.getContractAt(
  "CredentialVerifier", 
  CREDENTIAL_VERIFIER_ADDRESS
);

// Public verification (no special permissions needed)
const [isValid, credentialData] = await credentialVerifier
  .verifyCredentialPublic(credentialId);

if (isValid) {
  console.log("✅ Credential is valid");
  console.log("Issuer:", credentialData.issuer);
  console.log("Recipient:", credentialData.recipient);
  console.log("Type:", credentialData.credentialType);
  
  // Parse credential data
  const data = JSON.parse(credentialData.credentialData);
  console.log("Student:", data.studentName);
  console.log("Degree:", data.degree);
} else {
  console.log("❌ Credential is invalid or not found");
}
```

### Batch Operations

```javascript
// Batch issue multiple credentials
const recipients = [address1, address2, address3];
const credentialTypes = ["Bachelor Degree", "Bachelor Degree", "Master Degree"];
const credentialDataArray = [data1, data2, data3];
const expirationDates = [exp1, exp2, exp3];
const metadataURIs = [uri1, uri2, uri3];

const credentialIds = await credentialRegistry.batchIssueCredentials(
  recipients,
  credentialTypes, 
  credentialDataArray,
  expirationDates,
  metadataURIs
);

// Batch verify credentials
const [results, validCount] = await credentialVerifier
  .batchVerifyCredentials(credentialIds);
```

## 🔧 Smart Contract API

### CredentialRegistry

#### Core Functions

**`issueCredential(recipient, credentialType, credentialData, expiresAt, metadataURI)`**
- Issues a new credential
- Requires ISSUER_ROLE
- Returns credential ID

**`batchIssueCredentials(recipients[], types[], data[], expires[], metadata[])`**
- Issues multiple credentials in one transaction
- More gas efficient for multiple issuances

**`revokeCredential(credentialId, reason)`**
- Revokes a credential permanently
- Requires REVOKER_ROLE

**`verifyCredential(credentialId)`**
- Verifies credential and updates expiration status
- Requires VERIFIER_ROLE
- Returns (isValid, status, issuer)

#### Query Functions

**`getCredential(credentialId)`**
- Returns complete credential information

**`getCredentialsByRecipient(recipient)`**
- Returns array of credential IDs for a recipient

**`getCredentialsByIssuer(issuer)`**
- Returns array of credential IDs for an issuer

**`getCredentialsByType(credentialType)`**
- Returns array of credential IDs for a credential type

**`isCredentialValid(credentialId)`**
- Returns true if credential is active and not expired

#### Management Functions

**`setupIssuerProfile(name, description, website, logoURI)`**
- Sets up issuer profile information

**`updateCredentialStatus(credentialId, newStatus)`**
- Updates credential status (suspend/reactivate)

**`pause()` / `unpause()`**
- Emergency pause functionality (admin only)

### CredentialVerifier

#### Verification Functions

**`verifyCredentialPublic(credentialId)`**
- Public verification without role requirements
- Returns (isValid, credentialData)

**`batchVerifyCredentials(credentialIds[])`**
- Verify multiple credentials efficiently
- Returns (results[], validCount)

#### Query Functions

**`getCredentialInfo(credentialId)`**
- Returns basic credential information

**`getValidCredentialsForRecipient(recipient)`**
- Returns only valid credential IDs for recipient

**`hasValidCredentialType(recipient, credentialType)`**
- Checks if recipient has valid credentials of specific type

## 🎯 Example Scripts

The project includes several example scripts in the `scripts/examples/` directory:

### Available Scripts

1. **`issueCredential.js`** - Complete credential issuance example
2. **`verifyCredential.js`** - Comprehensive verification example  
3. **`batchOperations.js`** - Batch issuance and verification

### Running Examples

```bash
# Issue a credential
CREDENTIAL_REGISTRY_ADDRESS=0x... RECIPIENT_ADDRESS=0x... \
npx hardhat run scripts/examples/issueCredential.js --network mumbai

# Verify a credential
CREDENTIAL_VERIFIER_ADDRESS=0x... CREDENTIAL_ID=1 \
npx hardhat run scripts/examples/verifyCredential.js --network mumbai

# Batch operations
CREDENTIAL_REGISTRY_ADDRESS=0x... \
npx hardhat run scripts/examples/batchOperations.js --network mumbai
```

## 🔒 Security Features

### Access Control
- **Role-based permissions**: Separate roles for issuers, verifiers, and revokers
- **Admin controls**: Centralized administration for role management
- **Emergency pause**: Ability to pause contract in case of emergency

### Data Integrity
- **Hash verification**: Prevents duplicate credential data
- **Immutable records**: Credentials cannot be modified after issuance
- **Expiration handling**: Automatic expiration checking

### Gas Optimization
- **Efficient storage**: Optimized data structures
- **Batch operations**: Reduced gas costs for multiple operations
- **Event-driven**: Minimal on-chain storage with rich events

## 📊 Gas Costs

Estimated gas costs on Polygon (actual costs may vary):

| Operation | Gas Cost | USD Cost* |
|-----------|----------|-----------|
| Deploy Registry | ~2,500,000 | ~$0.05 |
| Deploy Verifier | ~800,000 | ~$0.02 |
| Issue Credential | ~150,000 | ~$0.003 |
| Batch Issue (3) | ~400,000 | ~$0.008 |
| Verify Credential | ~60,000 | ~$0.001 |
| Revoke Credential | ~80,000 | ~$0.002 |

*Based on 30 gwei gas price and $0.80 MATIC

## 🧪 Testing

The project includes comprehensive test suites:

```bash
# Run all tests
npm test

# Run specific test file
npx hardhat test test/CredentialRegistry.test.js

# Run tests with gas reporting
npm run test:gas

# Run tests with coverage
npm run test:coverage
```

### Test Coverage
- ✅ Contract deployment
- ✅ Role management
- ✅ Credential issuance
- ✅ Batch operations
- ✅ Verification system
- ✅ Revocation mechanism
- ✅ Access controls
- ✅ Edge cases and error handling

## 🌐 Network Configuration

### Polygon Mumbai Testnet
- **Chain ID**: 80001
- **RPC URL**: https://rpc-mumbai.maticvigil.com/
- **Explorer**: https://mumbai.polygonscan.com/
- **Faucet**: https://faucet.polygon.technology/

### Polygon Mainnet
- **Chain ID**: 137
- **RPC URL**: https://polygon-rpc.com/
- **Explorer**: https://polygonscan.com/

## 🔧 Development

### Project Structure
```
├── contracts/              # Smart contracts
│   ├── CredentialRegistry.sol
│   └── CredentialVerifier.sol
├── scripts/
│   ├── deploy.js           # Deployment script
│   └── examples/           # Usage examples
├── test/                   # Test files
├── hardhat.config.js       # Hardhat configuration
└── README.md              # This file
```

### Building and Deployment

1. **Compile contracts:**
```bash
npx hardhat compile
```

2. **Deploy to testnet:**
```bash
npx hardhat run scripts/deploy.js --network mumbai
```

3. **Verify contracts:**
```bash
npx hardhat verify --network mumbai <contract-address>
```

## 🤝 Integration Guide

### For Educational Institutions

1. **Deploy contracts** or use existing deployment
2. **Setup issuer profile** with institution details
3. **Grant issuer role** to authorized personnel
4. **Issue credentials** for graduates/students
5. **Provide verification** interface for employers

### For Employers/Verifiers

1. **Connect to CredentialVerifier** contract
2. **Verify credentials** using public functions
3. **Check issuer reputation** through profiles
4. **Integrate with HR systems** via API

### For Students/Recipients

1. **Receive credential ID** from institution
2. **Share credential ID** with employers
3. **Verify own credentials** through public interface
4. **Maintain credential portfolio** off-chain

## 📈 Roadmap

### Planned Features
- [ ] **Credential Templates**: Standardized credential formats
- [ ] **IPFS Integration**: Decentralized metadata storage
- [ ] **Multi-signature**: Multiple approvers for high-value credentials
- [ ] **Credential Marketplace**: Trading platform for credentials
- [ ] **API Gateway**: RESTful API for easier integration
- [ ] **Mobile SDK**: Mobile app integration libraries

### Future Enhancements
- [ ] **Cross-chain Support**: Bridge to other blockchains
- [ ] **ZK Proofs**: Privacy-preserving verification
- [ ] **DAO Governance**: Decentralized contract governance
- [ ] **Oracle Integration**: External data verification
- [ ] **NFT Credentials**: Visual credential representations

## 🆘 Support

### Common Issues

**"AccessControl: account 0x... is missing role"**
- Ensure your account has the required role (ISSUER_ROLE, VERIFIER_ROLE, etc.)
- Use `grantIssuerRole()`, `grantVerifierRole()` functions

**"InvalidCredentialData" error**
- Check that recipient address is valid (not zero address)
- Ensure credential type and data are not empty
- Verify expiration date is in the future

**"DuplicateCredentialData" error**
- Each credential must have unique data for the same recipient and type
- Modify the credential data slightly to make it unique

### Getting Help

- **GitHub Issues**: Report bugs and request features
- **Discord**: Join our community for support
- **Documentation**: Check this README and inline comments
- **Examples**: Review the example scripts for usage patterns

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenZeppelin**: For secure smart contract libraries
- **Hardhat**: For excellent development framework
- **Polygon**: For fast and low-cost blockchain infrastructure
- **Ethereum**: For the foundational blockchain technology

---

## 📞 Contact

For questions, support, or collaboration opportunities:

- **Email**: contact@example.com
- **Website**: https://credential-system.example.com
- **Twitter**: @CredentialSystem
- **LinkedIn**: Company Page

---

**Built with ❤️ for the future of digital credentials**
