# Polygon Blockchain Credential Issuance System

A comprehensive smart contract system for issuing, managing, and verifying digital credentials on the Polygon blockchain. This system provides a secure, decentralized way to handle academic credentials, professional certifications, and other digital certificates.

## 🌟 Features

### Core Functionality
- **Credential Issuance**: Issue digital credentials with metadata and expiry dates
- **Credential Verification**: Verify credentials on-chain with detailed validation
- **Credential Revocation**: Revoke credentials when necessary
- **Multi-Issuer Support**: Support for multiple credential issuers
- **Batch Operations**: Verify multiple credentials at once
- **Expiry Management**: Automatic expiry date handling
- **Fee Management**: Configurable issuance and revocation fees

### Security Features
- **Access Control**: Role-based permissions for issuers and administrators
- **Reentrancy Protection**: Secure against reentrancy attacks
- **Input Validation**: Comprehensive validation of all inputs
- **Event Logging**: Complete audit trail of all operations

### Scalability Features
- **Factory Pattern**: Easy deployment of multiple credential systems
- **Gas Optimization**: Optimized for Polygon's low gas costs
- **Batch Processing**: Efficient handling of multiple operations

## 📋 Smart Contracts

### 1. CredentialIssuer.sol
The main contract for issuing and managing credentials.

**Key Functions:**
- `issueCredential()` - Issue a new credential
- `revokeCredential()` - Revoke an existing credential
- `registerIssuer()` - Register a new credential issuer
- `addCredentialType()` - Add supported credential types
- `getCredential()` - Retrieve credential details
- `isCredentialValid()` - Check credential validity

### 2. CredentialVerifier.sol
Contract for verifying credentials and providing validation services.

**Key Functions:**
- `verifyCredential()` - Verify a single credential
- `verifyCredentialsBatch()` - Verify multiple credentials
- `hasValidCredentialOfType()` - Check for specific credential types
- `getValidCredentials()` - Get all valid credentials for a recipient

### 3. CredentialFactory.sol
Factory contract for deploying and managing credential systems.

**Key Functions:**
- `deployCredentialSystem()` - Deploy new credential system
- `getAllDeployedSystems()` - Get all deployed systems
- `getCredentialSystem()` - Get system details

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- MetaMask or similar wallet
- Polygon network access (Mumbai testnet or mainnet)

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
PRIVATE_KEY=your_private_key_here
POLYGON_RPC_URL=https://polygon-rpc.com
MUMBAI_RPC_URL=https://rpc-mumbai.maticvigil.com
POLYGONSCAN_API_KEY=your_polygonscan_api_key
```

4. **Compile contracts**
```bash
npm run compile
```

5. **Run tests**
```bash
npm test
```

6. **Deploy to Mumbai testnet**
```bash
npm run deploy:mumbai
```

7. **Deploy to Polygon mainnet**
```bash
npm run deploy:polygon
```

## 📖 Usage Examples

### Deploying a Credential System

```javascript
const { ethers } = require("hardhat");

async function deploySystem() {
  const CredentialFactory = await ethers.getContractFactory("CredentialFactory");
  const factory = await CredentialFactory.deploy();
  
  const deploymentFee = await factory.deploymentFee();
  
  const tx = await factory.deployCredentialSystem(
    "University Credentials",
    "Digital credentials for academic achievements",
    ethers.utils.parseEther("0.001"), // Issuance fee
    ethers.utils.parseEther("0.0005"), // Revocation fee
    { value: deploymentFee }
  );
  
  const receipt = await tx.wait();
  console.log("Credential system deployed!");
}
```

### Issuing a Credential

```javascript
async function issueCredential() {
  const issuer = await ethers.getContractAt("CredentialIssuer", issuerAddress);
  
  // Add credential type
  await issuer.addCredentialType("Bachelor's Degree");
  
  // Register issuer
  await issuer.registerIssuer(
    issuerAddress,
    "My University",
    "A prestigious university",
    true
  );
  
  // Issue credential
  const issuanceFee = await issuer.issuanceFee();
  const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year
  
  await issuer.issueCredential(
    recipientAddress,
    "Bachelor's Degree",
    '{"major": "Computer Science", "gpa": "3.8", "graduation_year": "2023"}',
    expiryDate,
    { value: issuanceFee }
  );
}
```

### Verifying a Credential

```javascript
async function verifyCredential() {
  const verifier = await ethers.getContractAt("CredentialVerifier", verifierAddress);
  
  // Verify single credential
  const [isValid, reason] = await verifier.verifyCredential(credentialId);
  console.log(`Credential valid: ${isValid}, Reason: ${reason}`);
  
  // Verify multiple credentials
  const [results, reasons] = await verifier.verifyCredentialsBatch([1, 2, 3]);
  
  // Check for specific credential type
  const [hasValid, credentialId] = await verifier.hasValidCredentialOfType(
    recipientAddress,
    "Bachelor's Degree"
  );
}
```

## 🔧 Configuration

### Fee Structure
- **Deployment Fee**: 0.01 MATIC (configurable)
- **Issuance Fee**: 0.001 MATIC (configurable per system)
- **Revocation Fee**: 0.0005 MATIC (configurable per system)

### Supported Credential Types
- Bachelor's Degree
- Master's Degree
- PhD Degree
- Certificate
- Diploma
- Professional License
- Training Certificate

## 🧪 Testing

Run the comprehensive test suite:

```bash
npm test
```

The test suite covers:
- Contract deployment
- Credential issuance and revocation
- Verification functionality
- Access control
- Error handling
- Integration scenarios

## 📊 Gas Optimization

The contracts are optimized for Polygon's low gas costs:
- Efficient storage patterns
- Batch operations
- Minimal external calls
- Optimized Solidity compiler settings

## 🔒 Security Considerations

### Access Control
- Only registered issuers can issue credentials
- Only issuers or contract owner can revoke credentials
- Factory owner controls system deployment

### Input Validation
- All addresses are validated
- Credential types must be pre-approved
- Expiry dates must be in the future
- Metadata is validated for format

### Reentrancy Protection
- All state-changing functions are protected
- External calls are made last
- Proper access control implementation

## 🌐 Network Support

### Testnet (Mumbai)
- Chain ID: 80001
- RPC URL: https://rpc-mumbai.maticvigil.com
- Explorer: https://mumbai.polygonscan.com

### Mainnet (Polygon)
- Chain ID: 137
- RPC URL: https://polygon-rpc.com
- Explorer: https://polygonscan.com

## 📈 Monitoring and Analytics

### Events
All important operations emit events for monitoring:
- `CredentialIssued`
- `CredentialRevoked`
- `IssuerRegistered`
- `CredentialVerified`

### Statistics
Track system usage with built-in counters:
- Total credentials issued
- Total credentials revoked
- Credential counts per issuer/recipient

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

- [ ] Multi-signature credential issuance
- [ ] Credential templates and schemas
- [ ] Off-chain credential storage with on-chain verification
- [ ] Integration with IPFS for metadata storage
- [ ] Mobile wallet integration
- [ ] API for third-party integrations
- [ ] Advanced analytics dashboard

---

**Built with ❤️ for the Polygon ecosystem**
