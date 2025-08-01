const { ethers } = require("hardhat");

async function main() {
  console.log("🎓 Credential Issuance Example");
  console.log("=============================");

  // Get deployed contract addresses (update these with your deployed addresses)
  const CREDENTIAL_REGISTRY_ADDRESS = process.env.CREDENTIAL_REGISTRY_ADDRESS || "0x..."; // Update this
  const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS || "0x..."; // Update this

  if (CREDENTIAL_REGISTRY_ADDRESS === "0x..." || RECIPIENT_ADDRESS === "0x...") {
    console.error("❌ Please set CREDENTIAL_REGISTRY_ADDRESS and RECIPIENT_ADDRESS in your .env file");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log(`📝 Using account: ${signer.address}`);

  // Connect to the deployed contract
  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = CredentialRegistry.attach(CREDENTIAL_REGISTRY_ADDRESS);

  try {
    // Setup issuer profile (if not already done)
    console.log("\n⚙️ Setting up issuer profile...");
    
    const existingProfile = await credentialRegistry.issuerProfiles(signer.address);
    if (!existingProfile.isActive) {
      const profileTx = await credentialRegistry.setupIssuerProfile(
        "Example University",
        "A leading institution in blockchain education",
        "https://example-university.edu",
        "https://example-university.edu/logo.png"
      );
      await profileTx.wait();
      console.log("✅ Issuer profile created");
    } else {
      console.log("✅ Issuer profile already exists");
    }

    // Issue a diploma credential
    console.log("\n🎓 Issuing diploma credential...");
    
    const credentialData = {
      studentName: "Alice Johnson",
      degree: "Bachelor of Science in Computer Science",
      gpa: "3.85",
      graduationDate: "2024-05-15",
      honors: "Magna Cum Laude",
      major: "Computer Science",
      minor: "Mathematics",
      coursework: [
        "Data Structures and Algorithms",
        "Database Systems",
        "Software Engineering",
        "Machine Learning",
        "Blockchain Technology"
      ]
    };

    const expirationDate = Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60); // 1 year from now
    const metadataURI = "ipfs://QmExampleHash123456789"; // Replace with actual IPFS hash

    const issueTx = await credentialRegistry.issueCredential(
      RECIPIENT_ADDRESS,
      "Bachelor Degree",
      JSON.stringify(credentialData),
      expirationDate,
      metadataURI
    );

    const receipt = await issueTx.wait();
    
    // Extract credential ID from event
    const credentialIssuedEvent = receipt.logs.find(
      log => log.fragment?.name === "CredentialIssued"
    );
    
    const credentialId = credentialIssuedEvent?.args[0];
    console.log(`✅ Credential issued successfully!`);
    console.log(`📋 Credential ID: ${credentialId}`);
    console.log(`👤 Recipient: ${RECIPIENT_ADDRESS}`);
    console.log(`📅 Expires: ${new Date(expirationDate * 1000).toLocaleDateString()}`);

    // Verify the credential was issued correctly
    console.log("\n🔍 Verifying issued credential...");
    const credential = await credentialRegistry.getCredential(credentialId);
    
    console.log("📄 Credential Details:");
    console.log(`   ID: ${credential.id}`);
    console.log(`   Issuer: ${credential.issuer}`);
    console.log(`   Recipient: ${credential.recipient}`);
    console.log(`   Type: ${credential.credentialType}`);
    console.log(`   Status: ${credential.status === 0 ? 'Active' : 'Other'}`);
    console.log(`   Issued At: ${new Date(Number(credential.issuedAt) * 1000).toLocaleString()}`);
    console.log(`   Expires At: ${new Date(Number(credential.expiresAt) * 1000).toLocaleString()}`);

    // Check credential validity
    const isValid = await credentialRegistry.isCredentialValid(credentialId);
    console.log(`✅ Credential is valid: ${isValid}`);

    // Get total credentials count
    const totalCredentials = await credentialRegistry.getTotalCredentials();
    console.log(`📊 Total credentials in registry: ${totalCredentials}`);

    console.log("\n🎉 Credential issuance completed successfully!");
    
    // Display next steps
    console.log("\n📋 Next Steps:");
    console.log("1. Share credential ID with recipient");
    console.log("2. Recipient can verify credential using CredentialVerifier contract");
    console.log("3. Third parties can verify credential authenticity");
    console.log(`4. View credential on blockchain explorer: ${network.name === 'polygon' ? 'https://polygonscan.com' : 'https://mumbai.polygonscan.com'}/tx/${receipt.hash}`);

  } catch (error) {
    console.error("❌ Error issuing credential:");
    console.error(error.message);
    
    if (error.message.includes("AccessControl")) {
      console.error("💡 Make sure your account has ISSUER_ROLE in the contract");
    }
    
    process.exit(1);
  }
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });