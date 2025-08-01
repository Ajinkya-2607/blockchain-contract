// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title CredentialIssuer
 * @dev A simple credential issuance contract for the Polygon network.
 *      The contract owner acts as the issuer who can mint and revoke credentials.
 *      Each credential is identified by an auto-incrementing ID and bound to a holder address.
 */
contract CredentialIssuer {
    // ---------------------------------------------------------------------
    // Data types
    // ---------------------------------------------------------------------

    struct Credential {
        address holder;     // Wallet address that owns the credential
        bytes32 metadata;   // Off-chain reference (e.g. IPFS hash) describing the credential
        uint256 issuedAt;   // Timestamp when the credential was issued
        bool    revoked;    // Revocation status
    }

    // ---------------------------------------------------------------------
    // Storage
    // ---------------------------------------------------------------------

    // Incremental counter for credential IDs
    uint256 private _nextCredentialId = 1;

    // Mapping credentialId => Credential data
    mapping(uint256 => Credential) private _credentials;

    // Address with issuing authority (owner)
    address private _issuer;

    // ---------------------------------------------------------------------
    // Events
    // ---------------------------------------------------------------------

    /**
     * @dev Emitted when a new credential is issued.
     * @param credentialId Unique ID of the credential.
     * @param holder       Address receiving the credential.
     * @param metadata     Off-chain metadata reference.
     */
    event CredentialIssued(uint256 indexed credentialId, address indexed holder, bytes32 metadata);

    /**
     * @dev Emitted when a credential is revoked.
     * @param credentialId ID of the revoked credential.
     */
    event CredentialRevoked(uint256 indexed credentialId);

    // ---------------------------------------------------------------------
    // Modifiers
    // ---------------------------------------------------------------------

    modifier onlyIssuer() {
        require(msg.sender == _issuer, "Caller is not the issuer");
        _;
    }

    modifier credentialExists(uint256 credentialId) {
        require(_credentials[credentialId].issuedAt != 0, "Credential does not exist");
        _;
    }

    // ---------------------------------------------------------------------
    // Constructor
    // ---------------------------------------------------------------------

    /**
     * @dev Deploys the contract and sets the deployer as the issuer.
     */
    constructor() {
        _issuer = msg.sender;
    }

    // ---------------------------------------------------------------------
    // Public view functions
    // ---------------------------------------------------------------------

    /**
     * @dev Returns the credential data for a given ID.
     */
    function getCredential(uint256 credentialId)
        external
        view
        credentialExists(credentialId)
        returns (Credential memory)
    {
        return _credentials[credentialId];
    }

    /**
     * @dev Checks if a credential is valid (exists and not revoked).
     */
    function isCredentialValid(uint256 credentialId) external view credentialExists(credentialId) returns (bool) {
        return !_credentials[credentialId].revoked;
    }

    /**
     * @dev Returns the current issuer address.
     */
    function issuer() external view returns (address) {
        return _issuer;
    }

    // ---------------------------------------------------------------------
    // Issuer-only functions
    // ---------------------------------------------------------------------

    /**
     * @dev Issues a new credential to a holder address.
     * @param holder   The recipient of the credential.
     * @param metadata Off-chain metadata reference (e.g. IPFS hash) represented as bytes32.
     * @return credentialId The newly created credential ID.
     */
    function issueCredential(address holder, bytes32 metadata)
        external
        onlyIssuer
        returns (uint256 credentialId)
    {
        require(holder != address(0), "Holder cannot be zero address");

        credentialId = _nextCredentialId++;
        _credentials[credentialId] = Credential({
            holder: holder,
            metadata: metadata,
            issuedAt: block.timestamp,
            revoked: false
        });

        emit CredentialIssued(credentialId, holder, metadata);
    }

    /**
     * @dev Revokes an existing credential.
     * @param credentialId The ID of the credential to revoke.
     */
    function revokeCredential(uint256 credentialId)
        external
        onlyIssuer
        credentialExists(credentialId)
    {
        Credential storage cred = _credentials[credentialId];
        require(!cred.revoked, "Credential already revoked");

        cred.revoked = true;
        emit CredentialRevoked(credentialId);
    }

    /**
     * @dev Allows the current issuer to transfer authority to a new address.
     * @param newIssuer The address of the new issuer.
     */
    function transferIssuer(address newIssuer) external onlyIssuer {
        require(newIssuer != address(0), "New issuer is the zero address");
        _issuer = newIssuer;
    }
}