const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CredentialVerifier", function () {
  let CredentialRegistry, credentialRegistry;
  let CredentialVerifier, credentialVerifier;
  let owner, issuer, recipient, verifier, unauthorized;
  let ISSUER_ROLE, VERIFIER_ROLE;

  beforeEach(async function () {
    [owner, issuer, recipient, verifier, unauthorized] = await ethers.getSigners();

    // Deploy CredentialRegistry
    CredentialRegistry = await ethers.getContractFactory("CredentialRegistry");
    credentialRegistry = await CredentialRegistry.deploy();
    await credentialRegistry.waitForDeployment();

    // Deploy CredentialVerifier
    CredentialVerifier = await ethers.getContractFactory("CredentialVerifier");
    credentialVerifier = await CredentialVerifier.deploy(await credentialRegistry.getAddress());
    await credentialVerifier.waitForDeployment();

    // Get role constants
    ISSUER_ROLE = await credentialRegistry.ISSUER_ROLE();
    VERIFIER_ROLE = await credentialRegistry.VERIFIER_ROLE();

    // Grant roles
    await credentialRegistry.grantRole(ISSUER_ROLE, issuer.address);
    await credentialRegistry.grantRole(VERIFIER_ROLE, await credentialVerifier.getAddress());

    // Setup issuer profile
    await credentialRegistry.connect(issuer).setupIssuerProfile(
      "Test University",
      "Leading educational institution",
      "https://testuni.edu",
      "https://testuni.edu/logo.png"
    );
  });

  describe("Deployment", function () {
    it("Should set the correct registry address", async function () {
      expect(await credentialVerifier.credentialRegistry()).to.equal(await credentialRegistry.getAddress());
    });

    it("Should revert with invalid registry address", async function () {
      await expect(
        CredentialVerifier.deploy(ethers.ZeroAddress)
      ).to.be.revertedWith("Invalid registry address");
    });
  });

  describe("Public Credential Verification", function () {
    let credentialId;

    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science", "gpa": "3.8"}',
        futureTime,
        "ipfs://QmTest123"
      );
      credentialId = 1;
    });

    it("Should verify valid credential publicly", async function () {
      const [isValid, credentialData] = await credentialVerifier.verifyCredentialPublic(credentialId);
      
      expect(isValid).to.be.true;
      expect(credentialData.id).to.equal(credentialId);
      expect(credentialData.issuer).to.equal(issuer.address);
      expect(credentialData.recipient).to.equal(recipient.address);
      expect(credentialData.credentialType).to.equal("Bachelor of Science");
    });

    it("Should return false for non-existent credential", async function () {
      const [isValid, credentialData] = await credentialVerifier.verifyCredentialPublic(999);
      
      expect(isValid).to.be.false;
      expect(credentialData.id).to.equal(0);
    });

    it("Should return false for revoked credential", async function () {
      // Grant revoker role and revoke credential
      const REVOKER_ROLE = await credentialRegistry.REVOKER_ROLE();
      await credentialRegistry.grantRole(REVOKER_ROLE, owner.address);
      await credentialRegistry.revokeCredential(credentialId, "Test revocation");

      const [isValid] = await credentialVerifier.verifyCredentialPublic(credentialId);
      expect(isValid).to.be.false;
    });
  });

  describe("Batch Verification", function () {
    let credentialIds;

    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      
      // Issue multiple credentials
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Master of Science",
        '{"degree": "Data Science"}',
        futureTime,
        "ipfs://QmTest456"
      );

      credentialIds = [1, 2];
    });

    it("Should batch verify multiple credentials", async function () {
      const [results, validCount] = await credentialVerifier.batchVerifyCredentials(credentialIds);
      
      expect(results).to.have.length(2);
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.true;
      expect(validCount).to.equal(2);
    });

    it("Should handle mix of valid and invalid credentials", async function () {
      const mixedIds = [1, 999, 2]; // Include non-existent credential
      const [results, validCount] = await credentialVerifier.batchVerifyCredentials(mixedIds);
      
      expect(results).to.have.length(3);
      expect(results[0]).to.be.true;
      expect(results[1]).to.be.false; // Non-existent
      expect(results[2]).to.be.true;
      expect(validCount).to.equal(2);
    });
  });

  describe("Credential Information Retrieval", function () {
    let credentialId;

    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );
      credentialId = 1;
    });

    it("Should get credential basic info", async function () {
      const [exists, issuerAddr, recipientAddr, credType, issuedAt, expiresAt] = 
        await credentialVerifier.getCredentialInfo(credentialId);
      
      expect(exists).to.be.true;
      expect(issuerAddr).to.equal(issuer.address);
      expect(recipientAddr).to.equal(recipient.address);
      expect(credType).to.equal("Bachelor of Science");
      expect(issuedAt).to.be.gt(0);
      expect(expiresAt).to.be.gt(issuedAt);
    });

    it("Should return false for non-existent credential info", async function () {
      const [exists] = await credentialVerifier.getCredentialInfo(999);
      expect(exists).to.be.false;
    });
  });

  describe("Recipient Credential Queries", function () {
    beforeEach(async function () {
      const futureTime = (await time.latest()) + 86400;
      
      // Issue multiple credentials to recipient
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Certificate",
        '{"course": "Blockchain Development"}',
        futureTime,
        "ipfs://QmTest456"
      );

      // Issue one to another recipient
      await credentialRegistry.connect(issuer).issueCredential(
        verifier.address,
        "Master of Science",
        '{"degree": "Data Science"}',
        futureTime,
        "ipfs://QmTest789"
      );
    });

    it("Should get all credentials by recipient", async function () {
      const credentials = await credentialVerifier.getRecipientCredentials(recipient.address);
      
      expect(credentials).to.have.length(2);
      expect(credentials[0]).to.equal(1);
      expect(credentials[1]).to.equal(2);
    });

    it("Should get only valid credentials for recipient", async function () {
      // Revoke one credential
      const REVOKER_ROLE = await credentialRegistry.REVOKER_ROLE();
      await credentialRegistry.grantRole(REVOKER_ROLE, owner.address);
      await credentialRegistry.revokeCredential(1, "Test revocation");

      const validCredentials = await credentialVerifier.getValidCredentialsForRecipient(recipient.address);
      
      expect(validCredentials).to.have.length(1);
      expect(validCredentials[0]).to.equal(2);
    });

    it("Should check if recipient has valid credential of specific type", async function () {
      const [hasValid, count] = await credentialVerifier.hasValidCredentialType(
        recipient.address,
        "Bachelor of Science"
      );
      
      expect(hasValid).to.be.true;
      expect(count).to.equal(1);
    });

    it("Should return false for non-existent credential type", async function () {
      const [hasValid, count] = await credentialVerifier.hasValidCredentialType(
        recipient.address,
        "PhD"
      );
      
      expect(hasValid).to.be.false;
      expect(count).to.equal(0);
    });
  });

  describe("Issuer Profile Queries", function () {
    it("Should get issuer profile", async function () {
      const profile = await credentialVerifier.getIssuerProfile(issuer.address);
      
      expect(profile.name).to.equal("Test University");
      expect(profile.description).to.equal("Leading educational institution");
      expect(profile.website).to.equal("https://testuni.edu");
      expect(profile.logoURI).to.equal("https://testuni.edu/logo.png");
      expect(profile.isActive).to.be.true;
      expect(profile.credentialsIssued).to.be.gt(0);
    });
  });

  describe("Registry Statistics", function () {
    it("Should get total credentials count", async function () {
      const initialCount = await credentialVerifier.getTotalCredentialsCount();
      
      const futureTime = (await time.latest()) + 86400;
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      const newCount = await credentialVerifier.getTotalCredentialsCount();
      expect(newCount).to.equal(initialCount + 1n);
    });
  });

  describe("Integration with Registry", function () {
    it("Should work with paused registry", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      // Issue credential first
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      // Pause registry
      await credentialRegistry.pause();

      // Verification should still work (read-only operations)
      const [isValid] = await credentialVerifier.verifyCredentialPublic(1);
      expect(isValid).to.be.true;
    });
  });
});