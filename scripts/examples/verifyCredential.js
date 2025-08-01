const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Credential Verification Example");
  console.log("==================================");

  // Get contract addresses and credential ID from environment
  const CREDENTIAL_VERIFIER_ADDRESS = process.env.CREDENTIAL_VERIFIER_ADDRESS || "0x..."; // Update this
  const CREDENTIAL_ID = process.env.CREDENTIAL_ID || "1"; // Update this

  if (CREDENTIAL_VERIFIER_ADDRESS === "0x...") {
    console.error("❌ Please set CREDENTIAL_VERIFIER_ADDRESS in your .env file");
    process.exit(1);
  }

  const [signer] = await ethers.getSigners();
  console.log(`📝 Using account: ${signer.address}`);

  // Connect to the deployed CredentialVerifier contract
  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = CredentialVerifier.attach(CREDENTIAL_VERIFIER_ADDRESS);

  try {
    console.log(`\n🔍 Verifying credential ID: ${CREDENTIAL_ID}`);

    // 1. Public verification (no special permissions needed)
    console.log("\n📋 Public Verification:");
    const [isValid, credentialData] = await credentialVerifier.verifyCredentialPublic(CREDENTIAL_ID);
    
    if (isValid) {
      console.log("✅ Credential is VALID");
      console.log("\n📄 Credential Details:");
      console.log(`   ID: ${credentialData.id}`);
      console.log(`   Issuer: ${credentialData.issuer}`);
      console.log(`   Recipient: ${credentialData.recipient}`);
      console.log(`   Type: ${credentialData.credentialType}`);
      console.log(`   Issued: ${new Date(Number(credentialData.issuedAt) * 1000).toLocaleString()}`);
      
      if (credentialData.expiresAt > 0) {
        const expirationDate = new Date(Number(credentialData.expiresAt) * 1000);
        const isExpired = expirationDate < new Date();
        console.log(`   Expires: ${expirationDate.toLocaleString()} ${isExpired ? '(EXPIRED)' : ''}`);
      } else {
        console.log(`   Expires: Never`);
      }
      
      console.log(`   Status: ${getStatusString(credentialData.status)}`);
      console.log(`   Metadata: ${credentialData.metadataURI}`);
      
      // Parse and display credential data if it's JSON
      try {
        const parsedData = JSON.parse(credentialData.credentialData);
        console.log("\n📚 Credential Content:");
        Object.entries(parsedData).forEach(([key, value]) => {
          if (Array.isArray(value)) {
            console.log(`   ${key}: ${value.join(', ')}`);
          } else {
            console.log(`   ${key}: ${value}`);
          }
        });
      } catch (e) {
        console.log(`\n📚 Credential Data: ${credentialData.credentialData}`);
      }

    } else {
      console.log("❌ Credential is INVALID or NOT FOUND");
    }

    // 2. Get basic credential info
    console.log("\n📊 Credential Information:");
    const [exists, issuer, recipient, credType, issuedAt, expiresAt] = 
      await credentialVerifier.getCredentialInfo(CREDENTIAL_ID);

    if (exists) {
      console.log(`   Exists: ✅`);
      console.log(`   Issuer: ${issuer}`);
      console.log(`   Recipient: ${recipient}`);
      console.log(`   Type: ${credType}`);
      console.log(`   Issued: ${new Date(Number(issuedAt) * 1000).toLocaleString()}`);
      
      if (expiresAt > 0) {
        console.log(`   Expires: ${new Date(Number(expiresAt) * 1000).toLocaleString()}`);
      } else {
        console.log(`   Expires: Never`);
      }

      // 3. Get issuer profile
      console.log("\n🏢 Issuer Profile:");
      const issuerProfile = await credentialVerifier.getIssuerProfile(issuer);
      
      if (issuerProfile.isActive) {
        console.log(`   Name: ${issuerProfile.name}`);
        console.log(`   Description: ${issuerProfile.description}`);
        console.log(`   Website: ${issuerProfile.website}`);
        console.log(`   Credentials Issued: ${issuerProfile.credentialsIssued}`);
        console.log(`   Status: ${issuerProfile.isActive ? 'Active' : 'Inactive'}`);
      } else {
        console.log("   No profile found for this issuer");
      }

      // 4. Check all credentials for this recipient
      console.log("\n👤 Recipient's Credentials:");
      const recipientCredentials = await credentialVerifier.getRecipientCredentials(recipient);
      console.log(`   Total credentials: ${recipientCredentials.length}`);
      
      // Get only valid credentials
      const validCredentials = await credentialVerifier.getValidCredentialsForRecipient(recipient);
      console.log(`   Valid credentials: ${validCredentials.length}`);
      
      if (validCredentials.length > 0) {
        console.log("   Valid credential IDs:", validCredentials.map(id => id.toString()).join(', '));
      }

      // 5. Check specific credential types
      console.log("\n🎓 Credential Type Analysis:");
      const [hasValidDegree, degreeCount] = await credentialVerifier.hasValidCredentialType(
        recipient, 
        "Bachelor Degree"
      );
      console.log(`   Has valid Bachelor Degree: ${hasValidDegree ? '✅' : '❌'} (Count: ${degreeCount})`);

      const [hasValidCert, certCount] = await credentialVerifier.hasValidCredentialType(
        recipient, 
        "Certificate"
      );
      console.log(`   Has valid Certificate: ${hasValidCert ? '✅' : '❌'} (Count: ${certCount})`);

    } else {
      console.log("❌ Credential not found");
    }

    // 6. Batch verification example
    console.log("\n📦 Batch Verification Example:");
    const testIds = [CREDENTIAL_ID, "999", "1000"]; // Include some non-existent IDs
    const [results, validCount] = await credentialVerifier.batchVerifyCredentials(testIds);
    
    console.log(`   Tested IDs: ${testIds.join(', ')}`);
    console.log(`   Results: ${results.map(r => r ? '✅' : '❌').join(' ')}`);
    console.log(`   Valid count: ${validCount}/${testIds.length}`);

    // 7. Registry statistics
    console.log("\n📈 Registry Statistics:");
    const totalCredentials = await credentialVerifier.getTotalCredentialsCount();
    console.log(`   Total credentials in registry: ${totalCredentials}`);

    console.log("\n🎉 Verification completed successfully!");

  } catch (error) {
    console.error("❌ Error during verification:");
    console.error(error.message);
    process.exit(1);
  }
}

// Helper function to convert status enum to string
function getStatusString(status) {
  const statusMap = {
    0: "Active",
    1: "Revoked", 
    2: "Suspended",
    3: "Expired"
  };
  return statusMap[status] || "Unknown";
}

// Execute the script
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });