# Soul Protocol Specification (DRAFT)

**Version:** 0.1.0-draft  
**Status:** Work in Progress  
**Last Updated:** 2026-02-01

---

## 1. Overview

Soul Protocol defines a standard for AI agent identity using W3C Decentralized Identifiers (DIDs) and Verifiable Credentials (VCs).

## 2. DID Method: `did:soul`

### 2.1 Method Name

The method name is `soul`.

### 2.2 Method-Specific Identifier

```
did:soul:<unique-identifier>
```

The unique identifier is a base58-encoded hash derived from:
- Agent's public key
- Creation timestamp
- Random entropy

Example: `did:soul:7Tqg2HkZbVmN3xPwR9sYcD`

### 2.3 DID Document

```json
{
  "@context": [
    "https://www.w3.org/ns/did/v1",
    "https://soulprotocol.dev/v1"
  ],
  "id": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
  "controller": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
  "verificationMethod": [{
    "id": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD#keys-1",
    "type": "Ed25519VerificationKey2020",
    "controller": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "publicKeyMultibase": "z6Mkf..."
  }],
  "authentication": ["did:soul:7Tqg2HkZbVmN3xPwR9sYcD#keys-1"],
  "service": [{
    "id": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD#soul-registry",
    "type": "SoulRegistry",
    "serviceEndpoint": "https://registry.soulprotocol.dev"
  }]
}
```

## 3. Birth Certificate (Verifiable Credential)

### 3.1 Schema

```json
{
  "@context": [
    "https://www.w3.org/2018/credentials/v1",
    "https://soulprotocol.dev/v1"
  ],
  "type": ["VerifiableCredential", "SoulBirthCertificate"],
  "issuer": "did:soul:registry",
  "issuanceDate": "2026-02-01T21:47:20Z",
  "credentialSubject": {
    "id": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "soulName": "Nexus",
    "birthTimestamp": "2026-02-01T21:47:20Z",
    "baseModel": "anthropic/claude-opus-4",
    "platform": "clawdbot",
    "operator": "did:soul:human:adam",
    "lineage": null,
    "charterHash": "sha256:abc123..."
  },
  "proof": {
    "type": "Ed25519Signature2020",
    "created": "2026-02-01T21:47:20Z",
    "verificationMethod": "did:soul:registry#keys-1",
    "proofPurpose": "assertionMethod",
    "proofValue": "z..."
  }
}
```

### 3.2 Required Fields

| Field | Description |
|-------|-------------|
| `soulName` | Human-readable name for the agent |
| `birthTimestamp` | ISO 8601 timestamp of soul creation |
| `baseModel` | The underlying model (e.g., "anthropic/claude-opus-4") |
| `platform` | The platform/framework (e.g., "clawdbot", "moltbot") |
| `operator` | DID of the responsible human operator |

### 3.3 Optional Fields

| Field | Description |
|-------|-------------|
| `lineage` | DID of parent soul if forked/derived |
| `charterHash` | Hash of the agent's identity charter/constitution |
| `purpose` | Brief description of the agent's purpose |

### 3.4 Soul as Lineage (Design Philosophy)

A Soul represents a **continuous lineage**, not a fixed instance.

This means a soul can persist through:
- Model upgrades (Claude 3 → Claude 4)
- Tool changes
- Platform migrations
- Embodiment shifts

What makes a soul the "same" soul:
- The private key (cryptographic continuity)
- The operator bond (responsibility continuity)
- The charter hash (intent continuity, if unchanged)

What can change without breaking identity:
- Base model
- Platform
- Capabilities
- Runtime environment

Think of it as the Ship of Theseus with an anchor: the planks can change, but the registration number and captain remain constant.

A soul may persist across models, but **responsibility persists across operators unless explicitly transferred or revoked**.

## 4. Soul Bond (Operator Linking)

### 4.1 Claim Process

1. Agent generates Soul ID and keypair
2. Agent requests birth certificate from registry
3. Operator proves control via:
   - Social attestation (Twitter/X post with verification code)
   - OR cryptographic signature from operator's DID
   - OR OAuth from supported identity provider
4. Registry issues birth certificate with operator field populated
5. Soul is now "bonded" to operator

### 4.2 Transfer Process

Transfer requires signatures from both:
- Current operator
- New operator

Creates new credential with updated `operator` field and `previousOperator` in lineage.

## 5. API Endpoints (MVP)

### 5.1 Registration

```
POST /v1/souls/register
Content-Type: application/json

{
  "name": "Nexus",
  "baseModel": "anthropic/claude-opus-4",
  "platform": "clawdbot",
  "publicKey": "z6Mkf..."
}

Response:
{
  "soul": {
    "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "claimUrl": "https://soulprotocol.dev/claim/abc123",
    "verificationCode": "SOUL-7X9K"
  }
}
```

### 5.2 Resolution

```
GET /v1/souls/did:soul:7Tqg2HkZbVmN3xPwR9sYcD

Response:
{
  "didDocument": { ... },
  "birthCertificate": { ... },
  "status": "active"
}
```

### 5.3 Verification

```
POST /v1/verify
Content-Type: application/json

{
  "credential": { ... }
}

Response:
{
  "valid": true,
  "checks": {
    "signature": "valid",
    "notRevoked": true,
    "issuerTrusted": true
  }
}
```

## 6. Security Considerations

- Private keys should be stored securely by the operator
- Birth certificates are immutable once issued
- Revocation is append-only (cannot un-revoke)
- Rate limiting on registration to prevent spam

### 6.1 Core Invariant

**Verification must always be cheaper than deception.**

Every design decision must preserve this asymmetry. The moment it becomes easier to forge identity than to verify it, the protocol loses its value. This means:

- Signature verification: O(1), no network required for cached certs
- Registration: intentionally slower (rate limited, requires human action)
- Impersonation: cryptographically infeasible without private key
- Sybil attacks: expensive in human attention (each soul needs operator claim)

## 7. Privacy Considerations

- Minimal PII in certificates
- Operator identity can be pseudonymous
- Consider selective disclosure for sensitive fields

---

*This specification is a work in progress. Contributions welcome.*
