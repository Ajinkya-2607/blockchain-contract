const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Starting deployment of Polygon Credential Issuance System...");

  // Get the deployer account
  const [deployer] = await ethers.getSigners();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy the main CredentialIssuer contract
  console.log("\n📋 Deploying CredentialIssuer...");
  const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
  const credentialIssuer = await CredentialIssuer.deploy();
  await credentialIssuer.deployed();
  console.log("✅ CredentialIssuer deployed to:", credentialIssuer.address);

  // Deploy the CredentialVerifier contract
  console.log("\n🔍 Deploying CredentialVerifier...");
  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = await CredentialVerifier.deploy(credentialIssuer.address);
  await credentialVerifier.deployed();
  console.log("✅ CredentialVerifier deployed to:", credentialVerifier.address);

  // Deploy the CredentialFactory contract
  console.log("\n🏭 Deploying CredentialFactory...");
  const CredentialFactory = await ethers.getContractFactory("CredentialFactory");
  const credentialFactory = await CredentialFactory.deploy(
    credentialIssuer.address,
    credentialVerifier.address
  );
  await credentialFactory.deployed();
  console.log("✅ CredentialFactory deployed to:", credentialFactory.address);

  // Wait for a few block confirmations
  console.log("\n⏳ Waiting for block confirmations...");
  await credentialIssuer.deployTransaction.wait(5);
  await credentialVerifier.deployTransaction.wait(5);
  await credentialFactory.deployTransaction.wait(5);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📊 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("🔐 CredentialIssuer:", credentialIssuer.address);
  console.log("🔍 CredentialVerifier:", credentialVerifier.address);
  console.log("🏭 CredentialFactory:", credentialFactory.address);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Verify contracts on PolygonScan (if not on localhost)
  const network = await ethers.provider.getNetwork();
  if (network.chainId !== 1337 && network.chainId !== 31337) {
    console.log("\n🔍 Verifying contracts on PolygonScan...");
    
    try {
      // Wait a bit before verification
      await new Promise(resolve => setTimeout(resolve, 30000));
      
      console.log("Verifying CredentialIssuer...");
      await hre.run("verify:verify", {
        address: credentialIssuer.address,
        constructorArguments: [],
      });
      
      console.log("Verifying CredentialVerifier...");
      await hre.run("verify:verify", {
        address: credentialVerifier.address,
        constructorArguments: [credentialIssuer.address],
      });
      
      console.log("Verifying CredentialFactory...");
      await hre.run("verify:verify", {
        address: credentialFactory.address,
        constructorArguments: [credentialIssuer.address, credentialVerifier.address],
      });
      
      console.log("✅ All contracts verified successfully!");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
    }
  }

  // Save deployment addresses to a file
  const fs = require("fs");
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    contracts: {
      credentialIssuer: credentialIssuer.address,
      credentialVerifier: credentialVerifier.address,
      credentialFactory: credentialFactory.address,
    },
  };

  fs.writeFileSync(
    `deployment-${network.chainId}.json`,
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log(`\n💾 Deployment info saved to deployment-${network.chainId}.json`);

  console.log("\n🎯 Next Steps:");
  console.log("1. Register issuers using the CredentialIssuer contract");
  console.log("2. Issue credentials to recipients");
  console.log("3. Use the CredentialVerifier to verify credentials");
  console.log("4. Deploy additional instances using the CredentialFactory");
}

// Handle deployment errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });