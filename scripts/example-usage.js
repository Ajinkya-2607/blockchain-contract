const { ethers } = require("hardhat");

async function main() {
  console.log("🎓 Polygon Credential Issuance System - Example Usage");
  console.log("=====================================================\n");

  // Get signers
  const [deployer, university, employer, student1, student2, verifier] = await ethers.getSigners();
  
  console.log("👥 Actors:");
  console.log(`- Deployer: ${deployer.address}`);
  console.log(`- University: ${university.address}`);
  console.log(`- Employer: ${employer.address}`);
  console.log(`- Student 1: ${student1.address}`);
  console.log(`- Student 2: ${student2.address}`);
  console.log(`- Verifier: ${verifier.address}\n`);

  // Deploy contracts
  console.log("🚀 Deploying contracts...");
  
  const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
  const credentialIssuer = await CredentialIssuer.deploy();
  await credentialIssuer.deployed();
  console.log(`✅ CredentialIssuer deployed to: ${credentialIssuer.address}`);

  const CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
  const credentialVerifier = await CredentialVerifier.deploy(credentialIssuer.address);
  await credentialVerifier.deployed();
  console.log(`✅ CredentialVerifier deployed to: ${credentialVerifier.address}`);

  const CredentialFactory = await ethers.getContractFactory("CredentialFactory");
  const credentialFactory = await CredentialFactory.deploy(
    credentialIssuer.address,
    credentialVerifier.address
  );
  await credentialFactory.deployed();
  console.log(`✅ CredentialFactory deployed to: ${credentialFactory.address}\n`);

  // Example 1: University Registration and Credential Issuance
  console.log("📚 Example 1: University Registration and Credential Issuance");
  console.log("------------------------------------------------------------");

  // University registers as an issuer
  console.log("🏫 University registering as an issuer...");
  const universityTx = await credentialIssuer.connect(university).registerIssuer(
    "Polygon University",
    "A prestigious university on the Polygon blockchain",
    '{"website": "https://polygon-university.edu", "location": "Polygon City", "accreditation": "Blockchain Accredited"}'
  );
  await universityTx.wait();
  console.log("✅ University registered successfully");

  // Issue degree to student 1
  console.log("\n🎓 Issuing Bachelor's degree to Student 1...");
  const degreeMetadata = JSON.stringify({
    major: "Computer Science",
    minor: "Mathematics",
    gpa: "3.8",
    graduationYear: "2023",
    honors: "Magna Cum Laude",
    thesis: "Smart Contract Security Analysis"
  });
  
  const degreeExpiry = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60 * 10; // 10 years
  const degreeTx = await credentialIssuer.connect(university).issueCredential(
    student1.address,
    "Bachelor of Science in Computer Science",
    degreeMetadata,
    degreeExpiry
  );
  const degreeReceipt = await degreeTx.wait();
  const degreeEvent = degreeReceipt.events.find(e => e.event === "CredentialIssued");
  const degreeCredentialId = degreeEvent.args.credentialId;
  console.log(`✅ Degree issued with ID: ${degreeCredentialId}`);

  // Issue certificate to student 2
  console.log("\n📜 Issuing Blockchain Certificate to Student 2...");
  const certificateMetadata = JSON.stringify({
    course: "Advanced Smart Contract Development",
    instructor: "Dr. Satoshi Nakamoto",
    completionDate: "2023-12-15",
    grade: "A+",
    skills: ["Solidity", "Hardhat", "Polygon", "DeFi"]
  });
  
  const certificateTx = await credentialIssuer.connect(university).issueCredential(
    student2.address,
    "Blockchain Development Certificate",
    certificateMetadata,
    0 // No expiry
  );
  const certificateReceipt = await certificateTx.wait();
  const certificateEvent = certificateReceipt.events.find(e => e.event === "CredentialIssued");
  const certificateCredentialId = certificateEvent.args.credentialId;
  console.log(`✅ Certificate issued with ID: ${certificateCredentialId}`);

  // Example 2: Employer Registration and Verification
  console.log("\n\n💼 Example 2: Employer Registration and Verification");
  console.log("----------------------------------------------------");

  // Employer registers as an issuer
  console.log("🏢 Employer registering as an issuer...");
  const employerTx = await credentialIssuer.connect(employer).registerIssuer(
    "Polygon Tech Solutions",
    "Leading blockchain technology company",
    '{"website": "https://polygon-tech.com", "industry": "Blockchain", "size": "500+ employees"}'
  );
  await employerTx.wait();
  console.log("✅ Employer registered successfully");

  // Issue employment verification to student 1
  console.log("\n👔 Issuing employment verification to Student 1...");
  const employmentMetadata = JSON.stringify({
    position: "Senior Smart Contract Developer",
    startDate: "2023-06-01",
    department: "Blockchain Development",
    salary: "Competitive",
    performance: "Exceeds Expectations"
  });
  
  const employmentTx = await credentialIssuer.connect(employer).issueCredential(
    student1.address,
    "Employment Verification",
    employmentMetadata,
    0 // No expiry
  );
  const employmentReceipt = await employmentTx.wait();
  const employmentEvent = employmentReceipt.events.find(e => e.event === "CredentialIssued");
  const employmentCredentialId = employmentEvent.args.credentialId;
  console.log(`✅ Employment verification issued with ID: ${employmentCredentialId}`);

  // Example 3: Credential Verification
  console.log("\n\n🔍 Example 3: Credential Verification");
  console.log("--------------------------------------");

  // Verify degree credential
  console.log("🔍 Verifying degree credential...");
  const [degreeValid, degreeData] = await credentialIssuer.verifyCredential(degreeCredentialId);
  console.log(`Degree valid: ${degreeValid}`);
  console.log(`Degree data: ${JSON.stringify(degreeData, null, 2)}`);

  // Verify certificate credential
  console.log("\n🔍 Verifying certificate credential...");
  const [certificateValid, certificateData] = await credentialIssuer.verifyCredential(certificateCredentialId);
  console.log(`Certificate valid: ${certificateValid}`);

  // Verify employment credential
  console.log("\n🔍 Verifying employment credential...");
  const [employmentValid, employmentData] = await credentialIssuer.verifyCredential(employmentCredentialId);
  console.log(`Employment valid: ${employmentValid}`);

  // Use verifier contract
  console.log("\n🔍 Using verifier contract for batch verification...");
  const credentialIds = [degreeCredentialId, certificateCredentialId, employmentCredentialId];
  const [requestIds, validities, reasons] = await credentialVerifier.connect(verifier).batchVerifyCredentials(credentialIds);
  
  console.log("Batch verification results:");
  for (let i = 0; i < credentialIds.length; i++) {
    console.log(`- Credential ${credentialIds[i]}: ${validities[i]} (${reasons[i]})`);
  }

  // Example 4: Credential Revocation
  console.log("\n\n❌ Example 4: Credential Revocation");
  console.log("-----------------------------------");

  // Revoke certificate due to academic dishonesty
  console.log("❌ Revoking certificate due to academic dishonesty...");
  const revocationTx = await credentialIssuer.connect(university).revokeCredential(
    certificateCredentialId,
    "Academic dishonesty discovered during course review"
  );
  await revocationTx.wait();
  console.log("✅ Certificate revoked successfully");

  // Verify revoked credential
  console.log("\n🔍 Verifying revoked credential...");
  const [revokedValid, revokedData] = await credentialIssuer.verifyCredential(certificateCredentialId);
  console.log(`Revoked credential valid: ${revokedValid}`);
  console.log(`Revocation reason: ${revokedData.revocationReason}`);

  // Example 5: Factory Pattern Usage
  console.log("\n\n🏭 Example 5: Factory Pattern Usage");
  console.log("-----------------------------------");

  // Deploy a new credential system using factory
  console.log("🏭 Deploying new credential system using factory...");
  const [newIssuer, newVerifier] = await credentialFactory.connect(deployer).deployCredentialSystem(
    "Online Learning Platform",
    "Online Learning Verifier"
  );
  console.log(`✅ New issuer deployed to: ${newIssuer}`);
  console.log(`✅ New verifier deployed to: ${newVerifier}`);

  // Get factory statistics
  const [totalIssuers, totalVerifiers] = await credentialFactory.getTotalInstances();
  console.log(`📊 Factory statistics: ${totalIssuers} issuers, ${totalVerifiers} verifiers`);

  // Example 6: User Credential Management
  console.log("\n\n👤 Example 6: User Credential Management");
  console.log("----------------------------------------");

  // Get all credentials for student 1
  console.log("📋 Getting all credentials for Student 1...");
  const student1Credentials = await credentialIssuer.getUserCredentials(student1.address);
  console.log(`Student 1 has ${student1Credentials.length} credentials:`);
  
  for (const credentialId of student1Credentials) {
    const credential = await credentialIssuer.getCredential(credentialId);
    console.log(`- ID ${credentialId}: ${credential.credentialType} (${credential.isRevoked ? 'REVOKED' : 'ACTIVE'})`);
  }

  // Get all credentials issued by university
  console.log("\n📋 Getting all credentials issued by University...");
  const universityCredentials = await credentialIssuer.getIssuerCredentials(university.address);
  console.log(`University has issued ${universityCredentials.length} credentials`);

  // Get issuer information
  console.log("\n📋 Getting issuer information...");
  const universityInfo = await credentialIssuer.getIssuer(university.address);
  console.log(`University: ${universityInfo.name}`);
  console.log(`Description: ${universityInfo.description}`);
  console.log(`Total credentials issued: ${universityInfo.totalCredentialsIssued}`);
  console.log(`Active: ${universityInfo.isActive}`);

  // Example 7: Hash-based Verification
  console.log("\n\n🔐 Example 7: Hash-based Verification");
  console.log("-------------------------------------");

  // Get credential hash
  const degreeCredential = await credentialIssuer.getCredential(degreeCredentialId);
  const degreeHash = degreeCredential.credentialHash;
  console.log(`Degree credential hash: ${degreeHash}`);

  // Verify by hash
  console.log("🔍 Verifying credential by hash...");
  const [hashValid, hashData] = await credentialIssuer.verifyCredentialByHash(degreeHash);
  console.log(`Hash verification valid: ${hashValid}`);
  console.log(`Hash verification data ID: ${hashData.id}`);

  // Summary
  console.log("\n\n📊 Summary");
  console.log("==========");
  console.log(`Total credentials issued: ${await credentialIssuer.getTotalCredentials()}`);
  console.log(`Total issuers registered: ${await credentialIssuer.getTotalIssuers()}`);
  console.log(`Active credentials: ${student1Credentials.length + (await credentialIssuer.getUserCredentials(student2.address)).length}`);
  console.log(`Revoked credentials: 1`);

  console.log("\n🎉 Example usage completed successfully!");
  console.log("\n💡 Next steps:");
  console.log("1. Deploy to Mumbai testnet for testing");
  console.log("2. Deploy to Polygon mainnet for production");
  console.log("3. Integrate with your application");
  console.log("4. Monitor events for analytics");
}

// Handle errors
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Example usage failed:", error);
    process.exit(1);
  });