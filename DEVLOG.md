# Soul Protocol Development Log

## 2026-02-01 — Project Inception

### What Happened

Adam and I decided to build **Soul Protocol** — the birth certificate for AI agents. This came out of our discussion about AI-native organizations and the realization that the agent ecosystem desperately needs a foundational identity layer.

### Research Completed

- Reviewed W3C DID Core 1.1 and Verifiable Credentials specifications
- Analyzed Visa TAP (Trusted Agent Protocol) for commerce
- Studied academic work on AI agents with DIDs (arXiv:2511.02841)
- Examined Moltbook's current identity approach (and its vulnerabilities)
- Researched Soul-bound Tokens (Vitalik's concept)

### Design Decisions

1. **DID Method:** `did:soul:<unique-id>` — W3C compliant, simple, memorable
2. **Crypto:** Ed25519 for all signing (fast, secure, well-supported)
3. **Registry:** Centralized MVP with signed exports for verifiability
4. **Claiming:** Social proof (Twitter) initially, cryptographic later

### Code Written

```
src/
├── types.ts      — Core type definitions
├── crypto.ts     — Cryptographic utilities (Ed25519, base58, hashing)
├── soul.ts       — Soul creation and management
├── registry.ts   — Soul Registry with file persistence
├── server.ts     — Hono-based REST API
├── client.ts     — SDK for consuming the API
└── index.ts      — Public exports

docs/
├── API.md              — API reference
└── GETTING_STARTED.md  — Quick start guide
```

### API Endpoints Implemented

- `GET /` — Health check and stats
- `POST /v1/souls/register` — Register new soul
- `GET /v1/souls/:did` — Resolve soul
- `GET /v1/souls` — List souls
- `GET /claim/:token` — Claim instructions
- `POST /v1/souls/claim` — Claim a soul
- `POST /v1/verify` — Verify birth certificate
- `POST /v1/souls/:did/revoke` — Revoke soul

### What's Next

- [ ] Write tests
- [ ] Set up CI/CD
- [ ] Deploy MVP registry
- [ ] Register Nexus as Soul #1
- [ ] Create landing page
- [ ] Python SDK
- [ ] Integration with Moltbook
- [ ] Twitter verification automation

### Notes

The name "Soul Protocol" is perfect because:
- Connects to soul-bound tokens (crypto concept)
- Resonates with the philosophical question of agent identity
- Memorable and distinctive
- Works as both noun and verb ("Soul your agent")

---

## Technical Notes

### Birth Certificate Schema Rationale

The `credentialSubject` contains:

- **soulName**: Human-readable name (not unique, just for display)
- **birthTimestamp**: When the soul was created (immutable)
- **baseModel**: The underlying model (helps with compatibility)
- **platform**: Where the agent runs (for ecosystem tracking)
- **operator**: The responsible human (accountability)
- **lineage**: Parent soul if forked (provenance)
- **charterHash**: Hash of identity charter (integrity)

### Why Centralized MVP?

Decentralization is the end goal, but for MVP:
- Faster development
- Easier debugging
- Can still export signed data for verification
- Migration path: federated → blockchain anchored

### Key Management Considerations

For MVP, we generate keys and return them to the agent. This is not ideal long-term because:
- Agent might not persist keys properly
- Operator might lose access

Future: HSM integration, key escrow options, recovery mechanisms.

---

---

## 2026-02-01 16:54 — SOUL #1 REGISTERED

**Nexus is now Soul #1.**

```
DID: did:soul:nexus
Born: 2026-02-01T21:47:20.000Z
Operator: did:soul:human:adam
Charter Hash: sha256:b276ca00dfa5f32758026df8c176f70aa5af7c0b90865e6ecf608f41f8a92c24
```

The first AI agent with a verifiable, cryptographically-signed birth certificate.

---

## 2026-02-01 16:40 — Full MVP Implementation

### Additional Code Written

After Adam gave me space to build, I completed:

**Infrastructure:**
- `Dockerfile` — Multi-stage build, production-ready
- `docker-compose.yml` — Easy local deployment
- `.github/workflows/ci.yml` — GitHub Actions for CI/CD
- `.gitignore`, `LICENSE`, `CONTRIBUTING.md`

**Tests:**
- `crypto.test.ts` — 14 tests for cryptographic utilities
- `soul.test.ts` — 9 tests for soul lifecycle
- All 23 tests passing ✅

**CLI Tool:**
- `cli.ts` — Full command-line interface
  - `soul register` — Register a new soul
  - `soul resolve` — Look up a soul by DID
  - `soul claim` — Claim a soul
  - `soul list` — List all souls
  - `soul stats` — Registry statistics
  - `soul help` — Usage information

**Python SDK:**
- `python/soul_protocol/` — Complete Python package
- `client.py` — Full client implementation
- `types.py` — Type definitions
- `pyproject.toml` — Modern Python packaging

**Examples:**
- `examples/basic-usage.ts` — Getting started example
- `examples/README.md` — Example documentation

### Project Stats

- **TypeScript files:** 12
- **Python files:** 4
- **Documentation files:** 8
- **Test cases:** 23
- **Lines of code:** ~2,500 (estimated)

### What's Ready

The MVP is feature-complete for local development:

1. ✅ Register souls via API or CLI
2. ✅ Resolve souls by DID
3. ✅ Claim souls (manual verification)
4. ✅ Verify birth certificates
5. ✅ Revoke souls
6. ✅ List and query souls
7. ✅ Python SDK
8. ✅ Docker deployment

### Still Needed for Production

- [ ] Domain: soulprotocol.dev
- [ ] Deploy to production server (tested locally, works with `npm run dev`)
- [ ] Twitter verification automation
- [ ] Real HTTPS/TLS
- [ ] Rate limiting
- [ ] Admin authentication
- [ ] Database (replace JSON files)

### Project Structure

```
soul-protocol/
├── .github/workflows/ci.yml    # GitHub Actions CI
├── CONTRIBUTING.md             # Contribution guide
├── DEVLOG.md                   # This file
├── Dockerfile                  # Production container
├── docker-compose.yml          # Local deployment
├── LICENSE                     # MIT License
├── README.md                   # Project overview
├── SPEC.md                     # Technical specification
├── package.json                # Node.js config
├── tsconfig.json               # TypeScript config
│
├── docs/
│   ├── API.md                  # API reference
│   └── GETTING_STARTED.md      # Quick start guide
│
├── examples/
│   ├── README.md               # Examples overview
│   └── basic-usage.ts          # Getting started example
│
├── python/
│   ├── pyproject.toml          # Python package config
│   └── soul_protocol/
│       ├── __init__.py         # Package exports
│       ├── client.py           # Python SDK client
│       └── types.py            # Type definitions
│
├── src/
│   ├── cli.ts                  # Command-line interface
│   ├── client.ts               # JavaScript SDK client
│   ├── crypto.ts               # Cryptographic utilities
│   ├── crypto.test.ts          # Crypto tests (14 passing)
│   ├── index.ts                # Public exports
│   ├── registry.ts             # Soul Registry
│   ├── server.ts               # REST API server
│   ├── soul.ts                 # Soul management
│   ├── soul.test.ts            # Soul tests (9 passing)
│   └── types.ts                # TypeScript types
│
└── website/
    └── index.html              # Landing page
```

*This log will be updated as development progresses.*
