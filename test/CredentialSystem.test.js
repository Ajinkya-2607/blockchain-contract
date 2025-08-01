const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Polygon Credential Issuance System", function () {
  let credentialFactory;
  let credentialIssuer;
  let credentialVerifier;
  let owner;
  let issuer;
  let recipient;
  let verifier;
  let addrs;

  beforeEach(async function () {
    [owner, issuer, recipient, verifier, ...addrs] = await ethers.getSigners();

    // Deploy CredentialFactory
    const CredentialFactory = await ethers.getContractFactory("CredentialFactory");
    credentialFactory = await CredentialFactory.deploy();
    await credentialFactory.deployed();

    // Deploy a credential system through the factory
    const deploymentFee = await credentialFactory.deploymentFee();
    const tx = await credentialFactory.deployCredentialSystem(
      "Test University",
      "Test credential system",
      ethers.utils.parseEther("0.001"),
      ethers.utils.parseEther("0.0005"),
      { value: deploymentFee }
    );
    const receipt = await tx.wait();

    // Get the deployed system addresses
    const deployedSystems = await credentialFactory.getAllDeployedSystems();
    const issuerAddress = deployedSystems[0];
    const systemDetails = await credentialFactory.getCredentialSystem(issuerAddress);
    const verifierAddress = await credentialFactory.getVerifierForIssuer(issuerAddress);

    credentialIssuer = await ethers.getContractAt("CredentialIssuer", issuerAddress);
    credentialVerifier = await ethers.getContractAt("CredentialVerifier", verifierAddress);
  });

  describe("CredentialFactory", function () {
    it("Should deploy factory with correct initial state", async function () {
      expect(await credentialFactory.totalSystemsDeployed()).to.equal(1);
      expect(await credentialFactory.deploymentFee()).to.equal(ethers.utils.parseEther("0.01"));
    });

    it("Should allow deploying multiple credential systems", async function () {
      const deploymentFee = await credentialFactory.deploymentFee();
      
      await credentialFactory.deployCredentialSystem(
        "Second University",
        "Second test system",
        ethers.utils.parseEther("0.002"),
        ethers.utils.parseEther("0.001"),
        { value: deploymentFee }
      );

      expect(await credentialFactory.totalSystemsDeployed()).to.equal(2);
    });

    it("Should reject deployment with insufficient fee", async function () {
      await expect(
        credentialFactory.deployCredentialSystem(
          "Test",
          "Test",
          ethers.utils.parseEther("0.001"),
          ethers.utils.parseEther("0.0005"),
          { value: ethers.utils.parseEther("0.005") }
        )
      ).to.be.revertedWith("CredentialFactory: Insufficient deployment fee");
    });
  });

  describe("CredentialIssuer", function () {
    beforeEach(async function () {
      // Add credential types
      await credentialIssuer.addCredentialType("Bachelor's Degree");
      await credentialIssuer.addCredentialType("Master's Degree");
      
      // Register issuer
      await credentialIssuer.registerIssuer(
        issuer.address,
        "Test University",
        "A test university",
        true
      );
    });

    it("Should register issuers correctly", async function () {
      const issuerInfo = await credentialIssuer.getIssuerInfo(issuer.address);
      expect(issuerInfo.name).to.equal("Test University");
      expect(issuerInfo.isActive).to.be.true;
    });

    it("Should add credential types correctly", async function () {
      expect(await credentialIssuer.supportedCredentialTypes("Bachelor's Degree")).to.be.true;
      expect(await credentialIssuer.supportedCredentialTypes("Master's Degree")).to.be.true;
    });

    it("Should issue credentials correctly", async function () {
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Computer Science", "gpa": "3.8"}',
        expiryDate,
        { value: issuanceFee }
      );

      const credential = await credentialIssuer.getCredential(1);
      expect(credential.recipient).to.equal(recipient.address);
      expect(credential.credentialType).to.equal("Bachelor's Degree");
      expect(credential.issuer).to.equal(issuer.address);
      expect(credential.isRevoked).to.be.false;
    });

    it("Should reject credential issuance with insufficient fee", async function () {
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(
        credentialIssuer.connect(issuer).issueCredential(
          recipient.address,
          "Bachelor's Degree",
          '{"major": "Computer Science"}',
          expiryDate,
          { value: ethers.utils.parseEther("0.0005") }
        )
      ).to.be.revertedWith("CredentialIssuer: Insufficient issuance fee");
    });

    it("Should reject credential issuance for unsupported type", async function () {
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await expect(
        credentialIssuer.connect(issuer).issueCredential(
          recipient.address,
          "Unsupported Type",
          '{"data": "test"}',
          expiryDate,
          { value: issuanceFee }
        )
      ).to.be.revertedWith("CredentialIssuer: Unsupported credential type");
    });

    it("Should revoke credentials correctly", async function () {
      const issuanceFee = await credentialIssuer.issuanceFee();
      const revocationFee = await credentialIssuer.revocationFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Computer Science"}',
        expiryDate,
        { value: issuanceFee }
      );

      await credentialIssuer.connect(issuer).revokeCredential(1, { value: revocationFee });

      const credential = await credentialIssuer.getCredential(1);
      expect(credential.isRevoked).to.be.true;
      expect(credential.revokedAt).to.be.gt(0);
    });

    it("Should track credential counts correctly", async function () {
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Computer Science"}',
        expiryDate,
        { value: issuanceFee }
      );

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Master's Degree",
        '{"major": "Data Science"}',
        expiryDate,
        { value: issuanceFee }
      );

      expect(await credentialIssuer.getRecipientCredentialCount(recipient.address)).to.equal(2);
      expect(await credentialIssuer.getIssuerCredentialCount(issuer.address)).to.equal(2);
      expect(await credentialIssuer.totalCredentialsIssued()).to.equal(2);
    });

    it("Should validate credentials correctly", async function () {
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Computer Science"}',
        expiryDate,
        { value: issuanceFee }
      );

      expect(await credentialIssuer.isCredentialValid(1)).to.be.true;
    });
  });

  describe("CredentialVerifier", function () {
    beforeEach(async function () {
      // Setup: Add credential types and register issuer
      await credentialIssuer.addCredentialType("Bachelor's Degree");
      await credentialIssuer.registerIssuer(
        issuer.address,
        "Test University",
        "A test university",
        true
      );

      // Issue a credential
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Computer Science"}',
        expiryDate,
        { value: issuanceFee }
      );
    });

    it("Should verify valid credentials correctly", async function () {
      const [isValid, reason] = await credentialVerifier.verifyCredential(1);
      expect(isValid).to.be.true;
      expect(reason).to.equal("Credential is valid");
    });

    it("Should reject non-existent credentials", async function () {
      const [isValid, reason] = await credentialVerifier.verifyCredential(999);
      expect(isValid).to.be.false;
      expect(reason).to.equal("Credential does not exist");
    });

    it("Should reject revoked credentials", async function () {
      const revocationFee = await credentialIssuer.revocationFee();
      await credentialIssuer.connect(issuer).revokeCredential(1, { value: revocationFee });

      const [isValid, reason] = await credentialVerifier.verifyCredential(1);
      expect(isValid).to.be.false;
      expect(reason).to.equal("Credential has been revoked");
    });

    it("Should verify credentials of specific type", async function () {
      const [hasValid, credentialId] = await credentialVerifier.hasValidCredentialOfType(
        recipient.address,
        "Bachelor's Degree"
      );
      expect(hasValid).to.be.true;
      expect(credentialId).to.equal(1);
    });

    it("Should return false for non-existent credential type", async function () {
      const [hasValid, credentialId] = await credentialVerifier.hasValidCredentialOfType(
        recipient.address,
        "Non-existent Type"
      );
      expect(hasValid).to.be.false;
      expect(credentialId).to.equal(0);
    });

    it("Should get all valid credentials for a recipient", async function () {
      // Issue another credential
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Physics"}',
        expiryDate,
        { value: issuanceFee }
      );

      const validCredentials = await credentialVerifier.getValidCredentials(recipient.address);
      expect(validCredentials.length).to.equal(2);
      expect(validCredentials[0]).to.equal(1);
      expect(validCredentials[1]).to.equal(2);
    });

    it("Should handle batch verification correctly", async function () {
      // Issue another credential
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor's Degree",
        '{"major": "Physics"}',
        expiryDate,
        { value: issuanceFee }
      );

      const [results, reasons] = await credentialVerifier.verifyCredentialsBatch([1, 2, 999]);
      expect(results.length).to.equal(3);
      expect(results[0]).to.be.true; // Valid credential
      expect(results[1]).to.be.true; // Valid credential
      expect(results[2]).to.be.false; // Non-existent credential
    });
  });

  describe("Integration Tests", function () {
    it("Should handle complete credential lifecycle", async function () {
      // Setup
      await credentialIssuer.addCredentialType("Certificate");
      await credentialIssuer.registerIssuer(
        issuer.address,
        "Test University",
        "A test university",
        true
      );

      // Issue credential
      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Certificate",
        '{"course": "Blockchain Development"}',
        expiryDate,
        { value: issuanceFee }
      );

      // Verify credential
      const [isValid, reason] = await credentialVerifier.verifyCredential(1);
      expect(isValid).to.be.true;

      // Revoke credential
      const revocationFee = await credentialIssuer.revocationFee();
      await credentialIssuer.connect(issuer).revokeCredential(1, { value: revocationFee });

      // Verify revocation
      const [isValidAfterRevocation, reasonAfterRevocation] = await credentialVerifier.verifyCredential(1);
      expect(isValidAfterRevocation).to.be.false;
      expect(reasonAfterRevocation).to.equal("Credential has been revoked");
    });

    it("Should handle multiple issuers and recipients", async function () {
      // Setup multiple issuers
      await credentialIssuer.addCredentialType("Degree");
      await credentialIssuer.registerIssuer(
        issuer.address,
        "University A",
        "First university",
        true
      );
      await credentialIssuer.registerIssuer(
        addrs[0].address,
        "University B",
        "Second university",
        true
      );

      const issuanceFee = await credentialIssuer.issuanceFee();
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60;

      // Issue credentials from different issuers to different recipients
      await credentialIssuer.connect(issuer).issueCredential(
        recipient.address,
        "Degree",
        '{"major": "Computer Science"}',
        expiryDate,
        { value: issuanceFee }
      );

      await credentialIssuer.connect(addrs[0]).issueCredential(
        addrs[1].address,
        "Degree",
        '{"major": "Mathematics"}',
        expiryDate,
        { value: issuanceFee }
      );

      // Verify credentials
      expect(await credentialIssuer.getRecipientCredentialCount(recipient.address)).to.equal(1);
      expect(await credentialIssuer.getRecipientCredentialCount(addrs[1].address)).to.equal(1);
      expect(await credentialIssuer.getIssuerCredentialCount(issuer.address)).to.equal(1);
      expect(await credentialIssuer.getIssuerCredentialCount(addrs[0].address)).to.equal(1);
    });
  });
});