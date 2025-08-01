const { ethers, upgrades } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment to Polygon...");
  
  const [deployer] = await ethers.getSigners();
  console.log(`📝 Deploying contracts with account: ${deployer.address}`);
  
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log(`💰 Account balance: ${ethers.formatEther(balance)} MATIC`);

  // Deploy CredentialRegistry
  console.log("\n📋 Deploying CredentialRegistry...");
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = await CredentialRegistry.deploy();
  await credentialRegistry.waitForDeployment();
  
  const registryAddress = await credentialRegistry.getAddress();
  console.log(`✅ CredentialRegistry deployed to: ${registryAddress}`);

  // Deploy CredentialVerifier
  console.log("\n🔍 Deploying CredentialVerifier...");
  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = await CredentialVerifier.deploy(registryAddress);
  await credentialVerifier.waitForDeployment();
  
  const verifierAddress = await credentialVerifier.getAddress();
  console.log(`✅ CredentialVerifier deployed to: ${verifierAddress}`);

  // Setup initial configuration
  console.log("\n⚙️ Setting up initial configuration...");
  
  // Grant verifier role to the CredentialVerifier contract
  const VERIFIER_ROLE = await credentialRegistry.VERIFIER_ROLE();
  await credentialRegistry.grantRole(VERIFIER_ROLE, verifierAddress);
  console.log("✅ Granted VERIFIER_ROLE to CredentialVerifier contract");

  // Setup deployer as an issuer (already has admin role)
  const deployerProfile = await credentialRegistry.setupIssuerProfile(
    "Default Issuer",
    "Initial credential issuer for testing and setup",
    "https://example.com",
    "https://example.com/logo.png"
  );
  await deployerProfile.wait();
  console.log("✅ Setup issuer profile for deployer");

  // Verify deployment
  console.log("\n🔍 Verifying deployment...");
  const totalCredentials = await credentialRegistry.getTotalCredentials();
  console.log(`📊 Total credentials in registry: ${totalCredentials}`);
  
  const hasIssuerRole = await credentialRegistry.hasRole(
    await credentialRegistry.ISSUER_ROLE(), 
    deployer.address
  );
  console.log(`👑 Deployer has ISSUER_ROLE: ${hasIssuerRole}`);

  // Display contract addresses and ABI
  console.log("\n📋 Deployment Summary:");
  console.log("=" * 50);
  console.log(`Network: ${network.name}`);
  console.log(`Deployer: ${deployer.address}`);
  console.log(`CredentialRegistry: ${registryAddress}`);
  console.log(`CredentialVerifier: ${verifierAddress}`);
  console.log("=" * 50);

  // Save deployment info
  const deploymentInfo = {
    network: network.name,
    chainId: network.config.chainId,
    deployer: deployer.address,
    contracts: {
      CredentialRegistry: {
        address: registryAddress,
        deploymentBlock: await credentialRegistry.deploymentTransaction()?.blockNumber
      },
      CredentialVerifier: {
        address: verifierAddress,
        deploymentBlock: await credentialVerifier.deploymentTransaction()?.blockNumber
      }
    },
    timestamp: new Date().toISOString()
  };

  // Write deployment info to file
  const fs = require('fs');
  const deploymentPath = `./deployments/${network.name}_deployment.json`;
  
  // Create deployments directory if it doesn't exist
  if (!fs.existsSync('./deployments')) {
    fs.mkdirSync('./deployments');
  }
  
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentInfo, null, 2));
  console.log(`📄 Deployment info saved to: ${deploymentPath}`);

  // Display next steps
  console.log("\n🎯 Next Steps:");
  console.log("1. Verify contracts on PolygonScan:");
  console.log(`   npx hardhat verify --network ${network.name} ${registryAddress}`);
  console.log(`   npx hardhat verify --network ${network.name} ${verifierAddress} ${registryAddress}`);
  console.log("\n2. Grant additional issuer roles:");
  console.log(`   credentialRegistry.grantIssuerRole(ADDRESS)`);
  console.log("\n3. Setup issuer profiles:");
  console.log(`   credentialRegistry.setupIssuerProfile(name, description, website, logoURI)`);
  console.log("\n4. Start issuing credentials!");
  
  return {
    credentialRegistry: registryAddress,
    credentialVerifier: verifierAddress
  };
}

// Execute deployment
main()
  .then((addresses) => {
    console.log("\n🎉 Deployment completed successfully!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });