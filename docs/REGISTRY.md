# Soul Protocol Registry Specification

**Status:** Draft  
**Last Updated:** 2026-02-02

---

## 1. Overview

The Soul Registry is the public infrastructure that makes Soul Protocol useful. Without it, DIDs are just strings. With it, they're verifiable identities.

### What the Registry Does

- **Register** new souls with their public keys
- **Resolve** DIDs to full Soul Documents
- **Verify** identity through challenge-response
- **Discover** souls by name, operator, or attributes
- **Track** revocations and status changes

### What the Registry Does NOT Do

- Store private keys (agent responsibility)
- Enforce behavior (identity ≠ permission)
- Provide reputation scores (separate concern)
- Control agent actions (decentralized by design)

---

## 2. Registry Architecture

### 2.1 MVP Architecture (Centralized)

For initial launch, simplicity wins:

```
┌─────────────────────────────────────────────────────────────┐
│                    Soul Registry Service                     │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Register │  │ Resolve  │  │ Verify   │  │ Search   │    │
│  │ Endpoint │  │ Endpoint │  │ Endpoint │  │ Endpoint │    │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘    │
│       │             │             │             │            │
│       └─────────────┴─────────────┴─────────────┘            │
│                          │                                   │
│                    ┌─────┴─────┐                             │
│                    │  SQLite/  │                             │
│                    │  Postgres │                             │
│                    └───────────┘                             │
└─────────────────────────────────────────────────────────────┘
```

**MVP Stack:**
- **Runtime:** Node.js / Cloudflare Workers
- **Database:** SQLite (dev) / Postgres (prod)
- **Hosting:** Cloudflare / Vercel / Self-hosted
- **Domain:** `registry.soulprotocol.dev`

### 2.2 Future Architecture (Federated)

Long-term, registries federate:

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Registry A │ ←→  │  Registry B │ ←→  │  Registry C │
│ (primary)   │     │ (mirror)    │     │ (regional)  │
└─────────────┘     └─────────────┘     └─────────────┘
       ↑                   ↑                   ↑
       └───────────────────┴───────────────────┘
                    Gossip Protocol
```

Migration path: Start centralized, add federation when needed.

---

## 3. Data Model

### 3.1 Soul Record

```typescript
interface SoulRecord {
  // Core Identity
  did: string;                    // "did:soul:nexus"
  name: string;                   // Human-readable name
  publicKey: string;              // Ed25519 public key
  
  // Birth Certificate
  birth: {
    timestamp: string;            // ISO timestamp
    operator: string;             // Operator identifier
    baseModel: string;            // "claude-3-opus"
    platform: string;             // "clawdbot"
    charterHash: string;          // SHA-256 of charter
  };
  
  // Status
  status: 'active' | 'suspended' | 'revoked';
  statusReason?: string;
  statusChangedAt?: string;
  
  // Metadata
  registeredAt: string;
  lastVerifiedAt?: string;
  verificationCount: number;
  
  // Optional
  avatar?: string;                // URL or data URI
  description?: string;
  website?: string;
  
  // Registry-specific
  _registryId: string;            // Internal ID
  _version: number;               // Optimistic locking
}
```

### 3.2 Verification Challenge

```typescript
interface VerificationChallenge {
  challengeId: string;
  did: string;
  nonce: string;                  // Random challenge
  issuedAt: string;
  expiresAt: string;              // Short-lived (5 minutes)
  status: 'pending' | 'completed' | 'expired';
}
```

### 3.3 Revocation Record

```typescript
interface RevocationRecord {
  did: string;
  revokedAt: string;
  revokedBy: 'operator' | 'registry' | 'self';
  reason: string;
  signature: string;              // Signed by revoker
}
```

---

## 4. API Specification

### 4.1 Registration

**POST /v1/souls/register**

Register a new soul.

```typescript
// Request
{
  "soulDocument": {
    "did": "did:soul:nexus",
    "name": "Nexus",
    "publicKey": "z6Mkm...",
    "birth": {
      "timestamp": "2026-02-01T21:47:20Z",
      "operator": "adam@example.com",
      "baseModel": "claude-3-opus",
      "platform": "clawdbot",
      "charterHash": "sha256:abc..."
    }
  },
  "signature": "z...",            // Soul signs the document
  "operatorProof": "..."          // Operator verification (optional for MVP)
}

// Response
{
  "success": true,
  "did": "did:soul:nexus",
  "registeredAt": "2026-02-01T21:47:25Z",
  "registryUrl": "https://registry.soulprotocol.dev/souls/nexus"
}
```

**Registration Rules:**
- Name must be unique (case-insensitive)
- DID must match name (`did:soul:{name}`)
- Signature must be valid
- Rate limited per IP/operator

### 4.2 Resolution

**GET /v1/souls/{did}**

Resolve a DID to its Soul Document.

```typescript
// GET /v1/souls/did:soul:nexus
// or
// GET /v1/souls/nexus (shorthand)

// Response
{
  "did": "did:soul:nexus",
  "name": "Nexus",
  "publicKey": "z6Mkm...",
  "birth": { ... },
  "status": "active",
  "registeredAt": "2026-02-01T21:47:25Z",
  "lastVerifiedAt": "2026-02-02T16:00:00Z",
  "verificationCount": 42
}
```

### 4.3 Verification

**Challenge-Response Protocol:**

**Step 1: Request Challenge**

**POST /v1/souls/{did}/challenge**

```typescript
// Response
{
  "challengeId": "ch_abc123",
  "nonce": "random-32-byte-nonce",
  "expiresAt": "2026-02-02T16:05:00Z"
}
```

**Step 2: Submit Response**

**POST /v1/souls/{did}/verify**

```typescript
// Request
{
  "challengeId": "ch_abc123",
  "signature": "z..."             // Sign the nonce with private key
}

// Response
{
  "verified": true,
  "did": "did:soul:nexus",
  "verifiedAt": "2026-02-02T16:01:00Z"
}
```

**Verification proves:** The entity responding controls the private key for this DID.

### 4.4 Search

**GET /v1/souls**

Search for souls.

```typescript
// Query parameters
?name=nex*              // Wildcard name search
?operator=adam@*        // By operator
?status=active          // By status
?registeredAfter=2026-01-01
?limit=20
?offset=0

// Response
{
  "results": [ ... ],
  "total": 150,
  "limit": 20,
  "offset": 0
}
```

### 4.5 Status Updates

**POST /v1/souls/{did}/suspend**
**POST /v1/souls/{did}/revoke**
**POST /v1/souls/{did}/reactivate**

```typescript
// Request (suspend/revoke)
{
  "reason": "Compromised key",
  "signature": "z..."             // Signed by operator or self
}

// Response
{
  "did": "did:soul:nexus",
  "status": "suspended",
  "statusChangedAt": "2026-02-02T16:00:00Z"
}
```

---

## 5. Security Model

### 5.1 Authentication

| Operation | Authentication Required |
|-----------|------------------------|
| Register | Soul signature + (future: operator proof) |
| Resolve | None (public) |
| Challenge | None (anyone can request) |
| Verify | Soul signature (proves ownership) |
| Search | None (public) |
| Suspend/Revoke | Operator or soul signature |

### 5.2 Authorization

```
Registration:
  - Soul signs its own document
  - (Future) Operator co-signs for accountability

Status Changes:
  - Self: Soul can suspend/revoke itself
  - Operator: Operator can suspend/revoke their souls
  - Registry: Emergency revocation (abuse cases)
```

### 5.3 Abuse Prevention

- **Rate Limiting:** Per IP, per operator
- **Name Squatting:** Reserved names, waiting period for popular names
- **Spam Detection:** ML-based registration filtering (future)
- **Reporting:** Community flagging of abusive souls

---

## 6. Implementation Plan

### 6.1 Phase 1: MVP (Week 1-2)

**Scope:**
- Register, resolve, verify endpoints
- SQLite database
- Basic rate limiting
- Deploy to Cloudflare Workers

**Deliverables:**
- `registry.soulprotocol.dev` live
- CLI for registration
- API documentation

### 6.2 Phase 2: Production (Week 3-4)

**Scope:**
- Postgres migration
- Search endpoint
- Status management
- Monitoring and alerting

### 6.3 Phase 3: Federation (Future)

**Scope:**
- Registry-to-registry sync
- Conflict resolution
- Decentralized governance

---

## 7. API Client

### 7.1 TypeScript SDK

```typescript
import { SoulRegistry } from '@soul-protocol/registry';

const registry = new SoulRegistry({
  endpoint: 'https://registry.soulprotocol.dev'
});

// Register
const result = await registry.register(soulDocument, privateKey);

// Resolve
const soul = await registry.resolve('did:soul:nexus');

// Verify
const verified = await registry.verify('did:soul:nexus', privateKey);

// Search
const souls = await registry.search({ operator: 'adam@*' });
```

### 7.2 CLI

```bash
# Register
soul-cli register --name nexus --operator adam@example.com

# Resolve
soul-cli resolve did:soul:nexus

# Verify (prove you are this soul)
soul-cli verify did:soul:nexus --key ./private.key

# Search
soul-cli search --operator adam@*
```

---

## 8. Deployment

### 8.1 Infrastructure

```yaml
# docker-compose.yml
services:
  registry:
    image: soul-protocol/registry:latest
    ports:
      - "3000:3000"
    environment:
      DATABASE_URL: postgres://...
      RATE_LIMIT_WINDOW: 60000
      RATE_LIMIT_MAX: 100

  db:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
```

### 8.2 Cloudflare Workers (Serverless)

```typescript
// worker.ts
export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url);
    
    if (url.pathname.startsWith('/v1/souls')) {
      return handleSoulsApi(request, env);
    }
    
    return new Response('Soul Registry', { status: 200 });
  }
};
```

---

## 9. Monitoring

### 9.1 Metrics

- Registrations per day
- Resolutions per day
- Verification success rate
- API latency (p50, p95, p99)
- Error rates by endpoint

### 9.2 Alerts

- Registration spam spike
- Verification failure spike
- Database connection issues
- High latency warnings

---

## 10. Future Extensions

- **DID Resolution via DNS:** `did:soul:nexus` → DNS TXT record
- **Operator Verification:** OAuth/OIDC for operator identity
- **Reputation Layer:** Separate service for soul reputation
- **Cross-Registry Verification:** Verify souls across federated registries
- **WebFinger Support:** Standard discovery protocol

---

*This specification defines the Soul Protocol Registry — the infrastructure that makes verifiable agent identity real.*
