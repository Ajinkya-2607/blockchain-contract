const { ethers } = require("hardhat");

async function main() {
  console.log("📦 Batch Operations Example");
  console.log("===========================");

  const CREDENTIAL_REGISTRY_ADDRESS = process.env.CREDENTIAL_REGISTRY_ADDRESS || "0x...";
  
  if (CREDENTIAL_REGISTRY_ADDRESS === "0x...") {
    console.error("❌ Please set CREDENTIAL_REGISTRY_ADDRESS in your .env file");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log(`📝 Using account: ${signer.address}`);

  const CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
  const credentialRegistry = CredentialRegistry.attach(CREDENTIAL_REGISTRY_ADDRESS);

  try {
    // Setup issuer profile if needed
    const existingProfile = await credentialRegistry.issuerProfiles(signer.address);
    if (!existingProfile.isActive) {
      console.log("⚙️ Setting up issuer profile...");
      const profileTx = await credentialRegistry.setupIssuerProfile(
        "Blockchain Academy",
        "Premier blockchain education institution",
        "https://blockchain-academy.edu",
        "https://blockchain-academy.edu/logo.png"
      );
      await profileTx.wait();
      console.log("✅ Issuer profile created");
    }

    // Example: Batch issue graduation credentials for a class
    console.log("\n🎓 Batch Issuing Graduation Credentials");
    console.log("=====================================");

    // Sample graduating class data
    const graduatingClass = [
      {
        address: "0x742d35Cc6084F673DbF7bEE0f2D86d70aA1D3B5E", // Replace with real addresses
        name: "Alice Johnson",
        degree: "Computer Science",
        gpa: "3.85",
        honors: "Magna Cum Laude"
      },
      {
        address: "0x8ba1f109551bD432803012645Hac136c9.SendTransactionOptions", // Replace with real addresses  
        name: "Bob Smith",
        degree: "Information Systems", 
        gpa: "3.72",
        honors: "Cum Laude"
      },
      {
        address: "0x1234567890123456789012345678901234567890", // Replace with real addresses
        name: "Carol Davis",
        degree: "Cybersecurity",
        gpa: "3.95", 
        honors: "Summa Cum Laude"
      }
    ];

    // Prepare batch data
    const recipients = [];
    const credentialTypes = [];
    const credentialDataArray = [];
    const expirationDates = [];
    const metadataURIs = [];

    const baseExpirationTime = Math.floor(Date.now() / 1000) + (10 * 365 * 24 * 60 * 60); // 10 years

    for (const student of graduatingClass) {
      const credentialData = {
        studentName: student.name,
        degree: `Bachelor of Science in ${student.degree}`,
        gpa: student.gpa,
        graduationDate: "2024-05-15",
        honors: student.honors,
        institution: "Blockchain Academy",
        batchYear: "2024"
      };

      recipients.push(student.address);
      credentialTypes.push("Bachelor Degree");
      credentialDataArray.push(JSON.stringify(credentialData));
      expirationDates.push(baseExpirationTime);
      metadataURIs.push(`ipfs://QmGraduation2024${student.name.replace(' ', '')}`);
    }

    console.log(`📊 Preparing to issue ${recipients.length} credentials...`);

    // Execute batch issuance
    console.log("🚀 Executing batch issuance...");
    const batchTx = await credentialRegistry.batchIssueCredentials(
      recipients,
      credentialTypes,
      credentialDataArray,
      expirationDates,
      metadataURIs
    );

    const receipt = await batchTx.wait();
    console.log(`✅ Batch issuance completed! Gas used: ${receipt.gasUsed}`);

    // Extract credential IDs from events
    const credentialIssuedEvents = receipt.logs.filter(
      log => log.fragment?.name === "CredentialIssued"
    );

    console.log(`\n📋 Issued Credentials:`);
    credentialIssuedEvents.forEach((event, index) => {
      const credentialId = event.args[0];
      const recipient = event.args[2];
      console.log(`   Credential ${credentialId}: ${graduatingClass[index].name} (${recipient})`);
    });

    // Example: Batch verification
    console.log("\n🔍 Batch Verification Example");
    console.log("=============================");

    // Get some credential IDs to verify
    const credentialIds = credentialIssuedEvents.map(event => event.args[0]);
    
    // Add some invalid IDs to test
    const testIds = [...credentialIds, 9999, 10000];

    console.log(`📊 Verifying ${testIds.length} credentials...`);
    
    // For batch verification, we need to use the CredentialVerifier contract
    const CREDENTIAL_VERIFIER_ADDRESS = process.env.CREDENTIAL_VERIFIER_ADDRESS;
    
    if (CREDENTIAL_VERIFIER_ADDRESS && CREDENTIAL_VERIFIER_ADDRESS !== "0x...") {
      const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
      const credentialVerifier = CredentialVerifier.attach(CREDENTIAL_VERIFIER_ADDRESS);

      const [results, validCount] = await credentialVerifier.batchVerifyCredentials(testIds);
      
      console.log(`✅ Verification completed:`);
      console.log(`   Valid credentials: ${validCount}/${testIds.length}`);
      
      testIds.forEach((id, index) => {
        const status = results[index] ? "✅ Valid" : "❌ Invalid";
        console.log(`   Credential ${id}: ${status}`);
      });
    } else {
      console.log("⚠️ CredentialVerifier address not set, skipping batch verification");
    }

    // Example: Query credentials by type
    console.log("\n📊 Credential Statistics");
    console.log("=======================");

    const totalCredentials = await credentialRegistry.getTotalCredentials();
    console.log(`Total credentials in registry: ${totalCredentials}`);

    const bachelorDegreeCredentials = await credentialRegistry.getCredentialsByType("Bachelor Degree");
    console.log(`Bachelor Degree credentials: ${bachelorDegreeCredentials.length}`);

    // Show issuer statistics
    const issuerProfile = await credentialRegistry.issuerProfiles(signer.address);
    console.log(`Credentials issued by ${issuerProfile.name}: ${issuerProfile.credentialsIssued}`);

    // Example: Role management
    console.log("\n👥 Role Management Example");
    console.log("=========================");

    const ISSUER_ROLE = await credentialRegistry.ISSUER_ROLE();
    const VERIFIER_ROLE = await credentialRegistry.VERIFIER_ROLE();
    const REVOKER_ROLE = await credentialRegistry.REVOKER_ROLE();

    console.log(`Current account roles:`);
    console.log(`   ISSUER: ${await credentialRegistry.hasRole(ISSUER_ROLE, signer.address) ? '✅' : '❌'}`);
    console.log(`   VERIFIER: ${await credentialRegistry.hasRole(VERIFIER_ROLE, signer.address) ? '✅' : '❌'}`);
    console.log(`   REVOKER: ${await credentialRegistry.hasRole(REVOKER_ROLE, signer.address) ? '✅' : '❌'}`);

    // Example: Advanced queries
    console.log("\n🔍 Advanced Queries");
    console.log("==================");

    for (const student of graduatingClass) {
      const recipientCredentials = await credentialRegistry.getCredentialsByRecipient(student.address);
      console.log(`${student.name}: ${recipientCredentials.length} credential(s)`);
    }

    console.log("\n🎉 Batch operations completed successfully!");
    
    // Display summary
    console.log("\n📋 Summary:");
    console.log(`   • Issued ${graduatingClass.length} graduation credentials`);
    console.log(`   • Verified credential validity`);
    console.log(`   • Demonstrated batch operations efficiency`);
    console.log(`   • Total gas used: ${receipt.gasUsed}`);

  } catch (error) {
    console.error("❌ Error during batch operations:");
    console.error(error.message);
    
    if (error.message.includes("InvalidCredentialData")) {
      console.error("💡 Check that all array lengths match in batch operations");
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