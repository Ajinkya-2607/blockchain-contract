const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("CredentialRegistry", function () {
  let CredentialRegistry, credentialRegistry;
  let CredentialVerifier, credentialVerifier;
  let owner, issuer, recipient, verifier, revoker, unauthorized;
  let ISSUER_ROLE, VERIFIER_ROLE, REVOKER_ROLE, DEFAULT_ADMIN_ROLE;

  beforeEach(async function () {
    [owner, issuer, recipient, verifier, revoker, unauthorized] = await ethers.getSigners();

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
    REVOKER_ROLE = await credentialRegistry.REVOKER_ROLE();
    DEFAULT_ADMIN_ROLE = await credentialRegistry.DEFAULT_ADMIN_ROLE();

    // Grant roles
    await credentialRegistry.grantRole(ISSUER_ROLE, issuer.address);
    await credentialRegistry.grantRole(VERIFIER_ROLE, verifier.address);
    await credentialRegistry.grantRole(REVOKER_ROLE, revoker.address);
    await credentialRegistry.grantRole(VERIFIER_ROLE, await credentialVerifier.getAddress());
  });

  describe("Deployment", function () {
    it("Should set the deployer as admin, issuer, verifier, and revoker", async function () {
      expect(await credentialRegistry.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true;
      expect(await credentialRegistry.hasRole(ISSUER_ROLE, owner.address)).to.be.true;
      expect(await credentialRegistry.hasRole(VERIFIER_ROLE, owner.address)).to.be.true;
      expect(await credentialRegistry.hasRole(REVOKER_ROLE, owner.address)).to.be.true;
    });

    it("Should initialize with zero credentials", async function () {
      expect(await credentialRegistry.getTotalCredentials()).to.equal(0);
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to grant issuer role", async function () {
      await credentialRegistry.grantIssuerRole(unauthorized.address);
      expect(await credentialRegistry.hasRole(ISSUER_ROLE, unauthorized.address)).to.be.true;
    });

    it("Should allow admin to grant verifier role", async function () {
      await credentialRegistry.grantVerifierRole(unauthorized.address);
      expect(await credentialRegistry.hasRole(VERIFIER_ROLE, unauthorized.address)).to.be.true;
    });

    it("Should allow admin to grant revoker role", async function () {
      await credentialRegistry.grantRevokerRole(unauthorized.address);
      expect(await credentialRegistry.hasRole(REVOKER_ROLE, unauthorized.address)).to.be.true;
    });

    it("Should not allow non-admin to grant roles", async function () {
      await expect(
        credentialRegistry.connect(unauthorized).grantIssuerRole(unauthorized.address)
      ).to.be.reverted;
    });
  });

  describe("Issuer Profile Management", function () {
    it("Should allow issuer to setup profile", async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution",
        "https://testuni.edu",
        "https://testuni.edu/logo.png"
      );

      const profile = await credentialRegistry.issuerProfiles(issuer.address);
      expect(profile.name).to.equal("Test University");
      expect(profile.description).to.equal("Leading educational institution");
      expect(profile.website).to.equal("https://testuni.edu");
      expect(profile.logoURI).to.equal("https://testuni.edu/logo.png");
      expect(profile.isActive).to.be.true;
    });

    it("Should emit IssuerProfileUpdated event", async function () {
      await expect(
        credentialRegistry.connect(issuer).setupIssuerProfile(
          "Test University",
          "Leading educational institution",
          "https://testuni.edu",
          "https://testuni.edu/logo.png"
        )
      ).to.emit(credentialRegistry, "IssuerProfileUpdated")
       .withArgs(issuer.address, "Test University", "Leading educational institution");
    });

    it("Should not allow non-issuer to setup profile", async function () {
      await expect(
        credentialRegistry.connect(unauthorized).setupIssuerProfile(
          "Fake University",
          "Unauthorized issuer",
          "https://fake.edu",
          "https://fake.edu/logo.png"
        )
      ).to.be.reverted;
    });
  });

  describe("Credential Issuance", function () {
    beforeEach(async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution",
        "https://testuni.edu",
        "https://testuni.edu/logo.png"
      );
    });

    it("Should issue a credential successfully", async function () {
      const futureTime = (await time.latest()) + 86400; // 1 day from now
      
      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          recipient.address,
          "Bachelor of Science",
          '{"degree": "Computer Science", "gpa": "3.8", "graduationDate": "2024-05-15"}',
          futureTime,
          "ipfs://QmTest123"
        )
      ).to.emit(credentialRegistry, "CredentialIssued")
       .withArgs(1, issuer.address, recipient.address, "Bachelor of Science", await time.latest() + 1, futureTime);

      const credential = await credentialRegistry.getCredential(1);
      expect(credential.id).to.equal(1);
      expect(credential.issuer).to.equal(issuer.address);
      expect(credential.recipient).to.equal(recipient.address);
      expect(credential.credentialType).to.equal("Bachelor of Science");
      expect(credential.status).to.equal(0); // Active status
    });

    it("Should increment total credentials count", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      expect(await credentialRegistry.getTotalCredentials()).to.equal(1);
    });

    it("Should update issuer credentials count", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      const profile = await credentialRegistry.issuerProfiles(issuer.address);
      expect(profile.credentialsIssued).to.equal(1);
    });

    it("Should track credentials by recipient", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      const recipientCredentials = await credentialRegistry.getCredentialsByRecipient(recipient.address);
      expect(recipientCredentials.length).to.equal(1);
      expect(recipientCredentials[0]).to.equal(1);
    });

    it("Should track credentials by issuer", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      const issuerCredentials = await credentialRegistry.getCredentialsByIssuer(issuer.address);
      expect(issuerCredentials.length).to.equal(1);
      expect(issuerCredentials[0]).to.equal(1);
    });

    it("Should track credentials by type", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        '{"degree": "Computer Science"}',
        futureTime,
        "ipfs://QmTest123"
      );

      const typeCredentials = await credentialRegistry.getCredentialsByType("Bachelor of Science");
      expect(typeCredentials.length).to.equal(1);
      expect(typeCredentials[0]).to.equal(1);
    });

    it("Should prevent duplicate credential data", async function () {
      const futureTime = (await time.latest()) + 86400;
      const credentialData = '{"degree": "Computer Science"}';
      
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Bachelor of Science",
        credentialData,
        futureTime,
        "ipfs://QmTest123"
      );

      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          recipient.address,
          "Bachelor of Science",
          credentialData,
          futureTime,
          "ipfs://QmTest123"
        )
      ).to.be.revertedWithCustomError(credentialRegistry, "DuplicateCredentialData");
    });

    it("Should reject invalid expiration date", async function () {
      const pastTime = (await time.latest()) - 86400; // 1 day ago
      
      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          recipient.address,
          "Bachelor of Science",
          '{"degree": "Computer Science"}',
          pastTime,
          "ipfs://QmTest123"
        )
      ).to.be.revertedWithCustomError(credentialRegistry, "InvalidExpirationDate");
    });

    it("Should reject invalid recipient address", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          ethers.ZeroAddress,
          "Bachelor of Science",
          '{"degree": "Computer Science"}',
          futureTime,
          "ipfs://QmTest123"
        )
      ).to.be.revertedWithCustomError(credentialRegistry, "InvalidCredentialData");
    });

    it("Should not allow non-issuer to issue credentials", async function () {
      const futureTime = (await time.latest()) + 86400;
      
      await expect(
        credentialRegistry.connect(unauthorized).issueCredential(
          recipient.address,
          "Bachelor of Science",
          '{"degree": "Computer Science"}',
          futureTime,
          "ipfs://QmTest123"
        )
      ).to.be.reverted;
    });
  });

  describe("Batch Credential Issuance", function () {
    beforeEach(async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution",
        "https://testuni.edu",
        "https://testuni.edu/logo.png"
      );
    });

    it("Should batch issue multiple credentials", async function () {
      const futureTime = (await time.latest()) + 86400;
      const recipients = [recipient.address, verifier.address];
      const types = ["Bachelor of Science", "Master of Science"];
      const dataArray = ['{"degree": "Computer Science"}', '{"degree": "Data Science"}'];
      const expirations = [futureTime, futureTime + 86400];
      const metadataURIs = ["ipfs://QmTest123", "ipfs://QmTest456"];

      const credentialIds = await credentialRegistry.connect(issuer).batchIssueCredentials(
        recipients,
        types,
        dataArray,
        expirations,
        metadataURIs
      );

      expect(credentialIds).to.have.length(2);
      expect(await credentialRegistry.getTotalCredentials()).to.equal(2);
    });

    it("Should reject mismatched array lengths", async function () {
      const futureTime = (await time.latest()) + 86400;
      const recipients = [recipient.address];
      const types = ["Bachelor of Science", "Master of Science"]; // Different length
      const dataArray = ['{"degree": "Computer Science"}'];
      const expirations = [futureTime];
      const metadataURIs = ["ipfs://QmTest123"];

      await expect(
        credentialRegistry.connect(issuer).batchIssueCredentials(
          recipients,
          types,
          dataArray,
          expirations,
          metadataURIs
        )
      ).to.be.revertedWithCustomError(credentialRegistry, "InvalidCredentialData");
    });
  });

  describe("Credential Verification", function () {
    let credentialId;

    beforeEach(async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution",
        "https://testuni.edu",
        "https://testuni.edu/logo.png"
      );

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

    it("Should verify valid credential", async function () {
      const [isValid, status, issuerAddr] = await credentialRegistry.connect(verifier).verifyCredential(credentialId);
      
      expect(isValid).to.be.true;
      expect(status).to.equal(0); // Active
      expect(issuerAddr).to.equal(issuer.address);
    });

    it("Should emit CredentialVerified event", async function () {
      await expect(
        credentialRegistry.connect(verifier).verifyCredential(credentialId)
      ).to.emit(credentialRegistry, "CredentialVerified")
       .withArgs(credentialId, verifier.address, await time.latest() + 1);
    });

    it("Should check credential validity", async function () {
      expect(await credentialRegistry.isCredentialValid(credentialId)).to.be.true;
    });

    it("Should detect expired credentials", async function () {
      // Issue credential that expires in 1 second
      const shortFutureTime = (await time.latest()) + 1;
      await credentialRegistry.connect(issuer).issueCredential(
        recipient.address,
        "Short Certificate",
        '{"type": "temporary"}',
        shortFutureTime,
        "ipfs://QmShort"
      );
      const shortCredentialId = 2;

      // Fast forward time past expiration
      await time.increase(2);

      const [isValid, status] = await credentialRegistry.connect(verifier).verifyCredential(shortCredentialId);
      expect(isValid).to.be.false;
      expect(status).to.equal(3); // Expired
    });

    it("Should not allow non-verifier to verify credentials", async function () {
      await expect(
        credentialRegistry.connect(unauthorized).verifyCredential(credentialId)
      ).to.be.reverted;
    });

    it("Should revert for non-existent credential", async function () {
      await expect(
        credentialRegistry.connect(verifier).verifyCredential(999)
      ).to.be.revertedWithCustomError(credentialRegistry, "CredentialNotFound");
    });
  });

  describe("Credential Revocation", function () {
    let credentialId;

    beforeEach(async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution", 
        "https://testuni.edu",
        "https://testuni.edu/logo.png"
      );

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

    it("Should revoke credential successfully", async function () {
      await expect(
        credentialRegistry.connect(revoker).revokeCredential(credentialId, "Academic misconduct")
      ).to.emit(credentialRegistry, "CredentialRevoked")
       .withArgs(credentialId, revoker.address, "Academic misconduct", await time.latest() + 1);

      const credential = await credentialRegistry.getCredential(credentialId);
      expect(credential.status).to.equal(1); // Revoked
    });

    it("Should emit CredentialStatusUpdated event on revocation", async function () {
      await expect(
        credentialRegistry.connect(revoker).revokeCredential(credentialId, "Academic misconduct")
      ).to.emit(credentialRegistry, "CredentialStatusUpdated")
       .withArgs(credentialId, 0, 1, await time.latest() + 1); // Active -> Revoked
    });

    it("Should not allow revoking already revoked credential", async function () {
      await credentialRegistry.connect(revoker).revokeCredential(credentialId, "First revocation");
      
      await expect(
        credentialRegistry.connect(revoker).revokeCredential(credentialId, "Second revocation")
      ).to.be.revertedWithCustomError(credentialRegistry, "CredentialAlreadyRevoked");
    });

    it("Should not allow non-revoker to revoke credentials", async function () {
      await expect(
        credentialRegistry.connect(unauthorized).revokeCredential(credentialId, "Unauthorized revocation")
      ).to.be.reverted;
    });

    it("Should make revoked credential invalid", async function () {
      await credentialRegistry.connect(revoker).revokeCredential(credentialId, "Test revocation");
      expect(await credentialRegistry.isCredentialValid(credentialId)).to.be.false;
    });
  });

  describe("Credential Status Updates", function () {
    let credentialId;

    beforeEach(async function () {
      await credentialRegistry.connect(issuer).setupIssuerProfile(
        "Test University",
        "Leading educational institution",
        "https://testuni.edu", 
        "https://testuni.edu/logo.png"
      );

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

    it("Should allow issuer to update credential status", async function () {
      await expect(
        credentialRegistry.connect(issuer).updateCredentialStatus(credentialId, 2) // Suspended
      ).to.emit(credentialRegistry, "CredentialStatusUpdated")
       .withArgs(credentialId, 0, 2, await time.latest() + 1); // Active -> Suspended

      const credential = await credentialRegistry.getCredential(credentialId);
      expect(credential.status).to.equal(2); // Suspended
    });

    it("Should allow admin to update any credential status", async function () {
      await expect(
        credentialRegistry.connect(owner).updateCredentialStatus(credentialId, 2) // Suspended
      ).to.emit(credentialRegistry, "CredentialStatusUpdated")
       .withArgs(credentialId, 0, 2, await time.latest() + 1);
    });

    it("Should not allow unauthorized issuer to update credential status", async function () {
      // Create another issuer
      await credentialRegistry.grantIssuerRole(unauthorized.address);
      
      await expect(
        credentialRegistry.connect(unauthorized).updateCredentialStatus(credentialId, 2)
      ).to.be.revertedWithCustomError(credentialRegistry, "UnauthorizedIssuer");
    });

    it("Should not allow non-issuer to update credential status", async function () {
      await expect(
        credentialRegistry.connect(recipient).updateCredentialStatus(credentialId, 2)
      ).to.be.reverted;
    });
  });

  describe("Pause Functionality", function () {
    it("Should allow admin to pause contract", async function () {
      await credentialRegistry.connect(owner).pause();
      expect(await credentialRegistry.paused()).to.be.true;
    });

    it("Should allow admin to unpause contract", async function () {
      await credentialRegistry.connect(owner).pause();
      await credentialRegistry.connect(owner).unpause();
      expect(await credentialRegistry.paused()).to.be.false;
    });

    it("Should prevent operations when paused", async function () {
      await credentialRegistry.connect(owner).pause();
      
      const futureTime = (await time.latest()) + 86400;
      await expect(
        credentialRegistry.connect(issuer).issueCredential(
          recipient.address,
          "Bachelor of Science",
          '{"degree": "Computer Science"}',
          futureTime,
          "ipfs://QmTest123"
        )
      ).to.be.revertedWith("Pausable: paused");
    });

    it("Should not allow non-admin to pause", async function () {
      await expect(
        credentialRegistry.connect(unauthorized).pause()
      ).to.be.reverted;
    });
  });
});