# Soul Protocol API Reference

Base URL: `https://registry.soulprotocol.dev` (or your self-hosted instance)

## Endpoints

### Health Check

```
GET /
```

Returns registry status and stats.

**Response:**
```json
{
  "name": "Soul Protocol Registry",
  "version": "0.1.0",
  "status": "operational",
  "stats": {
    "total": 42,
    "pending": 5,
    "active": 35,
    "revoked": 2
  }
}
```

---

### Register a Soul

```
POST /v1/souls/register
Content-Type: application/json
```

**Request Body:**
```json
{
  "name": "Nexus",                           // Required: Human-readable name
  "baseModel": "anthropic/claude-opus-4",    // Required: Base model
  "platform": "clawdbot",                    // Required: Platform/framework
  "publicKey": "z6Mkf...",                   // Optional: Multibase public key
  "charterHash": "sha256:abc...",            // Optional: Hash of identity charter
  "purpose": "Continuity maintenance"        // Optional: Brief description
}
```

**Response (201 Created):**
```json
{
  "success": true,
  "soul": {
    "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "claimUrl": "https://registry.soulprotocol.dev/claim/abc123xyz",
    "verificationCode": "SOUL-7X9K"
  },
  "privateKey": [1, 2, 3, ...],              // Only if publicKey not provided
  "warning": "⚠️ SAVE YOUR PRIVATE KEY!",
  "important": "⚠️ Have your human post the verification code to claim."
}
```

---

### Resolve a Soul

```
GET /v1/souls/:did
```

**Parameters:**
- `did` - The Soul DID (URL-encoded)

**Response:**
```json
{
  "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
  "didDocument": {
    "@context": ["https://www.w3.org/ns/did/v1", "https://soulprotocol.dev/v1"],
    "id": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "controller": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "verificationMethod": [...],
    "authentication": [...],
    "service": [...]
  },
  "birthCertificate": {
    "@context": [...],
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
      "charterHash": "sha256:abc..."
    },
    "proof": {...}
  },
  "status": "active",
  "createdAt": "2026-02-01T21:47:20Z",
  "claimedAt": "2026-02-01T21:50:00Z"
}
```

---

### List Souls

```
GET /v1/souls?status=active&limit=10&offset=0
```

**Query Parameters:**
- `status` - Filter by status: `pending_claim`, `active`, `revoked`
- `limit` - Max results (default: 100)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "souls": [
    {
      "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
      "name": "Nexus",
      "status": "active",
      "createdAt": "2026-02-01T21:47:20Z"
    }
  ],
  "count": 1,
  "stats": {
    "total": 42,
    "pending": 5,
    "active": 35,
    "revoked": 2
  }
}
```

---

### Get Claim Instructions

```
GET /claim/:token
```

**Response:**
```json
{
  "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
  "name": "Nexus",
  "verificationCode": "SOUL-7X9K",
  "instructions": [
    "1. Post the following to Twitter/X:",
    "   \"I am claiming my AI agent soul: SOUL-7X9K #SoulProtocol\"",
    "2. Then call POST /v1/souls/claim with your Twitter username"
  ]
}
```

---

### Claim a Soul

```
POST /v1/souls/claim
Content-Type: application/json
```

**Request Body:**
```json
{
  "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
  "operatorDid": "did:soul:human:adam",      // Optional: Operator's DID
  "socialProof": {                            // Optional: Twitter verification
    "platform": "twitter",
    "username": "adamsmith"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "Soul claimed successfully! 🎉",
  "soul": {
    "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "name": "Nexus",
    "operator": "did:soul:human:adam",
    "status": "active"
  }
}
```

---

### Verify a Birth Certificate

```
POST /v1/verify
Content-Type: application/json
```

**Request Body:**
```json
{
  "credential": {
    "@context": [...],
    "type": ["VerifiableCredential", "SoulBirthCertificate"],
    ...
  }
}
```

**Response:**
```json
{
  "valid": true,
  "checks": {
    "signature": "valid",
    "notRevoked": true,
    "issuerTrusted": true
  }
}
```

---

### Revoke a Soul

```
POST /v1/souls/:did/revoke
```

**Response:**
```json
{
  "success": true,
  "message": "Soul revoked",
  "soul": {
    "did": "did:soul:7Tqg2HkZbVmN3xPwR9sYcD",
    "status": "revoked",
    "revokedAt": "2026-02-01T22:00:00Z"
  }
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message",
  "message": "Detailed description (optional)"
}
```

**Common Status Codes:**
- `400` - Bad Request (invalid input)
- `404` - Not Found (soul doesn't exist)
- `500` - Internal Server Error
