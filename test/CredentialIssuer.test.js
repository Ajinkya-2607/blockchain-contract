const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CredentialIssuer", function () {
  let credentialIssuer;
  let owner;
  let issuer1;
  let issuer2;
  let recipient1;
  let recipient2;
  let addr1;
  let addr2;

  beforeEach(async function () {
    [owner, issuer1, issuer2, recipient1, recipient2, addr1, addr2] = await ethers.getSigners();

    const CredentialIssuer = await ethers.getContractFactory("CredentialIssuer");
    credentialIssuer = await CredentialIssuer.deploy();
    await credentialIssuer.deployed();
  });

  describe("Deployment", function () {
    it("Should set the right owner", async function () {
      expect(await credentialIssuer.owner()).to.equal(owner.address);
    });

    it("Should start with zero credentials and issuers", async function () {
      expect(await credentialIssuer.getTotalCredentials()).to.equal(0);
      expect(await credentialIssuer.getTotalIssuers()).to.equal(0);
    });
  });

  describe("Issuer Registration", function () {
    it("Should allow an address to register as an issuer", async function () {
      const name = "Test University";
      const description = "A prestigious university";
      const metadata = "{\"website\": \"https://test.edu\", \"location\": \"Test City\"}";

      await expect(credentialIssuer.connect(issuer1).registerIssuer(name, description, metadata))
        .to.emit(credentialIssuer, "IssuerRegistered")
        .withArgs(issuer1.address, name, description);

      const issuer = await credentialIssuer.getIssuer(issuer1.address);
      expect(issuer.name).to.equal(name);
      expect(issuer.description).to.equal(description);
      expect(issuer.metadata).to.equal(metadata);
      expect(issuer.isActive).to.be.true;
      expect(issuer.totalCredentialsIssued).to.equal(0);
    });

    it("Should not allow empty name", async function () {
      await expect(
        credentialIssuer.connect(issuer1).registerIssuer("", "description", "metadata")
      ).to.be.revertedWith("CredentialIssuer: Name cannot be empty");
    });

    it("Should not allow double registration", async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test", "description", "metadata");
      
      await expect(
        credentialIssuer.connect(issuer1).registerIssuer("Test2", "description2", "metadata2")
      ).to.be.revertedWith("CredentialIssuer: Issuer already registered");
    });

    it("Should increment issuer count", async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Issuer1", "description1", "metadata1");
      await credentialIssuer.connect(issuer2).registerIssuer("Issuer2", "description2", "metadata2");
      
      expect(await credentialIssuer.getTotalIssuers()).to.equal(2);
    });
  });

  describe("Credential Issuance", function () {
    beforeEach(async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test University", "description", "metadata");
    });

    it("Should allow registered issuer to issue credentials", async function () {
      const credentialType = "Bachelor's Degree";
      const metadata = "{\"major\": \"Computer Science\", \"gpa\": \"3.8\"}";
      const expiryDate = Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60; // 1 year from now

      await expect(credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        credentialType,
        metadata,
        expiryDate
      ))
        .to.emit(credentialIssuer, "CredentialIssued")
        .withArgs(1, issuer1.address, recipient1.address, credentialType);

      const credential = await credentialIssuer.getCredential(1);
      expect(credential.issuer).to.equal(issuer1.address);
      expect(credential.recipient).to.equal(recipient1.address);
      expect(credential.credentialType).to.equal(credentialType);
      expect(credential.metadata).to.equal(metadata);
      expect(credential.expiryDate).to.equal(expiryDate);
      expect(credential.isRevoked).to.be.false;
    });

    it("Should not allow non-registered issuer to issue credentials", async function () {
      await expect(
        credentialIssuer.connect(addr1).issueCredential(
          recipient1.address,
          "Degree",
          "metadata",
          0
        )
      ).to.be.revertedWith("CredentialIssuer: Only registered issuers can perform this action");
    });

    it("Should not allow issuing to zero address", async function () {
      await expect(
        credentialIssuer.connect(issuer1).issueCredential(
          ethers.constants.AddressZero,
          "Degree",
          "metadata",
          0
        )
      ).to.be.revertedWith("CredentialIssuer: Invalid recipient address");
    });

    it("Should not allow empty credential type", async function () {
      await expect(
        credentialIssuer.connect(issuer1).issueCredential(
          recipient1.address,
          "",
          "metadata",
          0
        )
      ).to.be.revertedWith("CredentialIssuer: Credential type cannot be empty");
    });

    it("Should not allow past expiry date", async function () {
      const pastDate = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      await expect(
        credentialIssuer.connect(issuer1).issueCredential(
          recipient1.address,
          "Degree",
          "metadata",
          pastDate
        )
      ).to.be.revertedWith("CredentialIssuer: Invalid expiry date");
    });

    it("Should increment credential count", async function () {
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Degree1",
        "metadata1",
        0
      );
      
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient2.address,
        "Degree2",
        "metadata2",
        0
      );

      expect(await credentialIssuer.getTotalCredentials()).to.equal(2);
    });

    it("Should update issuer's total credentials issued", async function () {
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Degree1",
        "metadata1",
        0
      );
      
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient2.address,
        "Degree2",
        "metadata2",
        0
      );

      const issuer = await credentialIssuer.getIssuer(issuer1.address);
      expect(issuer.totalCredentialsIssued).to.equal(2);
    });

    it("Should track user credentials", async function () {
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Degree1",
        "metadata1",
        0
      );
      
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Degree2",
        "metadata2",
        0
      );

      const userCredentials = await credentialIssuer.getUserCredentials(recipient1.address);
      expect(userCredentials.length).to.equal(2);
      expect(userCredentials[0]).to.equal(1);
      expect(userCredentials[1]).to.equal(2);
    });

    it("Should track issuer credentials", async function () {
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Degree1",
        "metadata1",
        0
      );
      
      await credentialIssuer.connect(issuer1).issueCredential(
        recipient2.address,
        "Degree2",
        "metadata2",
        0
      );

      const issuerCredentials = await credentialIssuer.getIssuerCredentials(issuer1.address);
      expect(issuerCredentials.length).to.equal(2);
      expect(issuerCredentials[0]).to.equal(1);
      expect(issuerCredentials[1]).to.equal(2);
    });
  });

  describe("Credential Verification", function () {
    let credentialId;

    beforeEach(async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test University", "description", "metadata");
      
      const tx = await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Bachelor's Degree",
        "{\"major\": \"Computer Science\"}",
        0
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CredentialIssued");
      credentialId = event.args.credentialId;
    });

    it("Should verify valid credential", async function () {
      const [isValid, credential] = await credentialIssuer.verifyCredential(credentialId);
      
      expect(isValid).to.be.true;
      expect(credential.issuer).to.equal(issuer1.address);
      expect(credential.recipient).to.equal(recipient1.address);
    });

    it("Should return false for non-existent credential", async function () {
      const [isValid, credential] = await credentialIssuer.verifyCredential(999);
      
      expect(isValid).to.be.false;
      expect(credential.issuer).to.equal(ethers.constants.AddressZero);
    });

    it("Should return false for revoked credential", async function () {
      await credentialIssuer.connect(issuer1).revokeCredential(credentialId, "Academic dishonesty");
      
      const [isValid, credential] = await credentialIssuer.verifyCredential(credentialId);
      
      expect(isValid).to.be.false;
      expect(credential.isRevoked).to.be.true;
    });

    it("Should return false for expired credential", async function () {
      const pastDate = Math.floor(Date.now() / 1000) - 86400; // 1 day ago
      
      const tx = await credentialIssuer.connect(issuer1).issueCredential(
        recipient2.address,
        "Expired Degree",
        "metadata",
        pastDate
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CredentialIssued");
      const expiredCredentialId = event.args.credentialId;
      
      const [isValid, credential] = await credentialIssuer.verifyCredential(expiredCredentialId);
      
      expect(isValid).to.be.false;
    });

    it("Should return false for credential from deactivated issuer", async function () {
      await credentialIssuer.connect(owner).deactivateIssuer(issuer1.address);
      
      const [isValid, credential] = await credentialIssuer.verifyCredential(credentialId);
      
      expect(isValid).to.be.false;
    });

    it("Should verify credential by hash", async function () {
      const credential = await credentialIssuer.getCredential(credentialId);
      
      const [isValid, verifiedCredential] = await credentialIssuer.verifyCredentialByHash(credential.credentialHash);
      
      expect(isValid).to.be.true;
      expect(verifiedCredential.id).to.equal(credentialId);
    });
  });

  describe("Credential Revocation", function () {
    let credentialId;

    beforeEach(async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test University", "description", "metadata");
      
      const tx = await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Bachelor's Degree",
        "metadata",
        0
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CredentialIssued");
      credentialId = event.args.credentialId;
    });

    it("Should allow issuer to revoke their credential", async function () {
      const reason = "Academic dishonesty";
      
      await expect(credentialIssuer.connect(issuer1).revokeCredential(credentialId, reason))
        .to.emit(credentialIssuer, "CredentialRevoked")
        .withArgs(credentialId, issuer1.address, reason);

      const credential = await credentialIssuer.getCredential(credentialId);
      expect(credential.isRevoked).to.be.true;
      expect(credential.revocationReason).to.equal(reason);
    });

    it("Should not allow non-issuer to revoke credential", async function () {
      await expect(
        credentialIssuer.connect(addr1).revokeCredential(credentialId, "reason")
      ).to.be.revertedWith("CredentialIssuer: Only the issuer can perform this action");
    });

    it("Should not allow revoking non-existent credential", async function () {
      await expect(
        credentialIssuer.connect(issuer1).revokeCredential(999, "reason")
      ).to.be.revertedWith("CredentialIssuer: Credential does not exist");
    });

    it("Should not allow revoking already revoked credential", async function () {
      await credentialIssuer.connect(issuer1).revokeCredential(credentialId, "reason1");
      
      await expect(
        credentialIssuer.connect(issuer1).revokeCredential(credentialId, "reason2")
      ).to.be.revertedWith("CredentialIssuer: Credential already revoked");
    });

    it("Should not allow empty revocation reason", async function () {
      await expect(
        credentialIssuer.connect(issuer1).revokeCredential(credentialId, "")
      ).to.be.revertedWith("CredentialIssuer: Revocation reason cannot be empty");
    });
  });

  describe("Admin Functions", function () {
    beforeEach(async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test University", "description", "metadata");
    });

    it("Should allow owner to deactivate issuer", async function () {
      await credentialIssuer.connect(owner).deactivateIssuer(issuer1.address);
      
      const issuer = await credentialIssuer.getIssuer(issuer1.address);
      expect(issuer.isActive).to.be.false;
    });

    it("Should allow owner to reactivate issuer", async function () {
      await credentialIssuer.connect(owner).deactivateIssuer(issuer1.address);
      await credentialIssuer.connect(owner).reactivateIssuer(issuer1.address);
      
      const issuer = await credentialIssuer.getIssuer(issuer1.address);
      expect(issuer.isActive).to.be.true;
    });

    it("Should not allow non-owner to deactivate issuer", async function () {
      await expect(
        credentialIssuer.connect(addr1).deactivateIssuer(issuer1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Should not allow non-owner to reactivate issuer", async function () {
      await expect(
        credentialIssuer.connect(addr1).reactivateIssuer(issuer1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Edge Cases", function () {
    it("Should handle multiple issuers and credentials", async function () {
      // Register multiple issuers
      await credentialIssuer.connect(issuer1).registerIssuer("University A", "description", "metadata");
      await credentialIssuer.connect(issuer2).registerIssuer("University B", "description", "metadata");
      
      // Issue credentials from different issuers to different recipients
      await credentialIssuer.connect(issuer1).issueCredential(recipient1.address, "Degree A", "metadata", 0);
      await credentialIssuer.connect(issuer2).issueCredential(recipient1.address, "Degree B", "metadata", 0);
      await credentialIssuer.connect(issuer1).issueCredential(recipient2.address, "Degree C", "metadata", 0);
      
      // Verify counts
      expect(await credentialIssuer.getTotalCredentials()).to.equal(3);
      expect(await credentialIssuer.getTotalIssuers()).to.equal(2);
      
      // Verify user credentials
      const recipient1Credentials = await credentialIssuer.getUserCredentials(recipient1.address);
      expect(recipient1Credentials.length).to.equal(2);
      
      // Verify issuer credentials
      const issuer1Credentials = await credentialIssuer.getIssuerCredentials(issuer1.address);
      expect(issuer1Credentials.length).to.equal(2);
    });

    it("Should handle credential with no expiry", async function () {
      await credentialIssuer.connect(issuer1).registerIssuer("Test University", "description", "metadata");
      
      const tx = await credentialIssuer.connect(issuer1).issueCredential(
        recipient1.address,
        "Permanent Degree",
        "metadata",
        0 // No expiry
      );
      
      const receipt = await tx.wait();
      const event = receipt.events.find(e => e.event === "CredentialIssued");
      const credentialId = event.args.credentialId;
      
      const [isValid, credential] = await credentialIssuer.verifyCredential(credentialId);
      expect(isValid).to.be.true;
      expect(credential.expiryDate).to.equal(0);
    });
  });
});