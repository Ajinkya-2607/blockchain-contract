const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 Deploying Polygon Credential Issuance System...");

  // Get the deployer account and network
  const [deployer] = await ethers.getSigners();
  const network = await ethers.provider.getNetwork();
  console.log("📝 Deploying contracts with account:", deployer.address);
  console.log("💰 Account balance:", (await deployer.getBalance()).toString());

  // Deploy CredentialFactory first
  console.log("\n🏭 Deploying CredentialFactory...");
  const CredentialFactory = await ethers.getContractFactory("CredentialFactory");
  const credentialFactory = await CredentialFactory.deploy();
  await credentialFactory.deployed();
  console.log("✅ CredentialFactory deployed to:", credentialFactory.address);

  // Deploy a sample credential system through the factory
  console.log("\n🎓 Deploying sample credential system...");
  const deploymentFee = await credentialFactory.deploymentFee();
  
  const tx = await credentialFactory.deployCredentialSystem(
    "University Credentials",
    "Digital credentials for academic achievements",
    ethers.utils.parseEther("0.001"), // 0.001 MATIC issuance fee
    ethers.utils.parseEther("0.0005"), // 0.0005 MATIC revocation fee
    { value: deploymentFee }
  );
  
  const receipt = await tx.wait();
  console.log("✅ Sample credential system deployed");

  // Get the deployed system addresses
  const deployedSystems = await credentialFactory.getAllDeployedSystems();
  const latestSystem = deployedSystems[deployedSystems.length - 1];
  const systemDetails = await credentialFactory.getCredentialSystem(latestSystem);
  const verifierAddress = await credentialFactory.getVerifierForIssuer(latestSystem);

  console.log("\n📊 Deployment Summary:");
  console.log("🏭 Factory Address:", credentialFactory.address);
  console.log("🎓 Issuer Address:", latestSystem);
  console.log("🔍 Verifier Address:", verifierAddress);
  console.log("📝 System Name:", systemDetails.name);
  console.log("📄 System Description:", systemDetails.description);

  // Register some sample credential types
  console.log("\n📋 Registering sample credential types...");
  const issuer = await ethers.getContractAt("CredentialIssuer", latestSystem);
  
  const credentialTypes = [
    "Bachelor's Degree",
    "Master's Degree",
    "PhD Degree",
    "Certificate",
    "Diploma"
  ];

  for (const type of credentialTypes) {
    await issuer.addCredentialType(type);
    console.log(`✅ Added credential type: ${type}`);
  }

  // Register a sample issuer
  console.log("\n👤 Registering sample issuer...");
  const sampleIssuerAddress = "0x1234567890123456789012345678901234567890"; // Replace with actual address
  await issuer.registerIssuer(
    sampleIssuerAddress,
    "Sample University",
    "A prestigious university for credential issuance",
    true
  );
  console.log("✅ Sample issuer registered:", sampleIssuerAddress);

  console.log("\n🎉 Deployment completed successfully!");
  console.log("\n📋 Next steps:");
  console.log("1. Verify contracts on Polygonscan");
  console.log("2. Configure your frontend to use these contract addresses");
  console.log("3. Test credential issuance and verification");
  console.log("4. Set up proper access controls and security measures");

  // Save deployment info to a file
  const deploymentInfo = {
    network: network.name,
    factoryAddress: credentialFactory.address,
    issuerAddress: latestSystem,
    verifierAddress: verifierAddress,
    deployer: deployer.address,
    deploymentTime: new Date().toISOString(),
    systemName: systemDetails.name,
    systemDescription: systemDetails.description,
    credentialTypes: credentialTypes,
    sampleIssuer: sampleIssuerAddress
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment-info.json",
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment-info.json");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });