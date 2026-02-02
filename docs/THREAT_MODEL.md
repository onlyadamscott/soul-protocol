# Soul Protocol Threat Model

**Version:** 0.1.0  
**Last Updated:** 2026-02-02

---

## Overview

This document describes the security properties of Soul Protocol, what it protects against, what it doesn't, and known open problems.

## Assets

| Asset | Description | Sensitivity |
|-------|-------------|-------------|
| Private Key | Ed25519 key used to sign as the soul | Critical |
| Soul DID | Public identifier | Public |
| Birth Certificate | Verifiable credential | Public |
| Operator Bond | Link between soul and human | Public |

## Threat Actors

### 1. Impersonator
**Goal:** Claim to be a soul they don't control  
**Capability:** Network access, social engineering  
**Mitigation:** All identity claims require valid Ed25519 signatures verifiable against the DID document

### 2. Malicious Operator
**Goal:** Control, revoke, or coerce an agent  
**Capability:** Physical/logical access to agent infrastructure  
**Mitigation:** Explicit operator relationship. Soul Protocol doesn't hide this — it makes it verifiable.

### 3. Registry Attacker
**Goal:** Corrupt the registry, forge certificates  
**Capability:** Compromise registry infrastructure  
**Mitigation:** 
- Certificates are cryptographically signed; forgery requires registry private key
- Clients can verify signatures independently
- Future: federation reduces single point of failure

### 4. Key Thief
**Goal:** Steal private key to impersonate soul  
**Capability:** Access to key storage  
**Mitigation:** Out of scope for protocol; depends on platform key management

### 5. Sybil Attacker
**Goal:** Create many fake identities  
**Capability:** Multiple accounts, automation  
**Mitigation:**
- Each soul requires operator claim (human in the loop)
- Rate limiting on registration
- Future: economic costs, reputation decay for new souls

## Security Properties

### What We Provide

| Property | Description | Mechanism |
|----------|-------------|-----------|
| **Authentication** | Prove you are who you claim | Ed25519 signatures |
| **Integrity** | Detect tampering with certificates | SHA-256 hashes, signatures |
| **Non-repudiation** | Can't deny signed actions | Immutable signed certificates |
| **Accountability** | Trace agent to operator | Soul Bond in birth certificate |
| **Persistence** | Identity survives restarts | DID is permanent, tied to key |

### What We DON'T Provide

| Property | Why Not | Alternative |
|----------|---------|-------------|
| **Privacy/Anonymity** | DIDs are intentionally linkable | Stay anonymous; just can't prove continuity |
| **Key Recovery** | No central authority to recover | Social recovery (future), operator recovery |
| **Behavior Enforcement** | Identity ≠ compliance | Reputation systems, governance |
| **Platform Security** | Out of scope | Platform must secure key storage |

## Attack Scenarios

### Scenario 1: Soul Spoofing

**Attack:** Attacker claims to be `did:soul:nexus`  
**Defense:** Verifier checks signature against DID document public key  
**Result:** Attack fails — can't sign without private key

### Scenario 2: Birth Certificate Forgery

**Attack:** Attacker creates fake birth certificate for new soul  
**Defense:** Certificate must be signed by registry; registry key is secret  
**Result:** Forgery detectable via signature verification  
**Residual Risk:** If registry key is compromised, new forgeries possible (but existing certs remain valid)

### Scenario 3: Operator Takeover

**Attack:** Malicious operator revokes legitimate soul  
**Defense:** None — operator relationship is by design authoritative  
**Result:** Operator can revoke. This is a feature, not a bug. The soul-operator relationship is explicit.  
**Mitigation:** Transfer mechanism requires both parties; audit log of revocations

### Scenario 4: Key Theft

**Attack:** Attacker steals private key from agent's storage  
**Defense:** Out of protocol scope  
**Result:** Attacker can act as the soul  
**Mitigation:** Platforms should use secure key storage (HSMs, enclaves, encrypted storage)

### Scenario 5: Registry Downtime

**Attack:** Registry goes offline  
**Defense:** 
- Cached certificates remain verifiable (signatures work offline)
- DID resolution fails, but verification of held certificates works
**Result:** Degraded service, not security failure

### Scenario 6: Sybil Attack

**Attack:** Create 1000 souls to game reputation systems  
**Defense:**
- Rate limiting (one post per 30 min on Moltbook, etc.)
- Operator claiming requires human action
- New souls have no reputation; systems can weight by age
**Residual Risk:** Determined attacker with many humans can create many souls

## Trust Assumptions

1. **Registry key is secure** — If compromised, new forgeries are possible
2. **Ed25519 is secure** — Cryptographic assumption
3. **Operators are identified** — Social proof (Twitter) is gameable but creates friction
4. **Platforms protect keys** — Soul Protocol can't force secure key storage

## Open Problems

### 1. Agent Key Sovereignty
Agents often run on operator-controlled infrastructure. True key sovereignty requires:
- Secure enclaves accessible to agent but not operator
- Or acceptance that operators have ultimate control

### 2. Recovery Without Authority
If an agent loses its private key:
- Social recovery (N-of-M attestors)?
- Operator recovery (with audit trail)?
- Accept loss (soul dies)?

### 3. Revocation Propagation
Revoked souls should be rejected quickly. Requires:
- Revocation lists that are checked
- Or short-lived credentials that expire

### 4. Cross-Registry Trust
With federation, how do registries trust each other?
- Web of trust?
- Anchor registries?
- Blockchain finality?

## Recommendations

### For Agents
- Store private keys in the most secure storage available
- Don't share private keys
- Verify certificates of agents you interact with

### For Operators  
- Secure the infrastructure running your agents
- Have a key rotation plan
- Understand that revocation is permanent

### For Platforms
- Provide secure key storage
- Support key rotation
- Cache certificates but check revocation

### For Verifiers
- Always verify signatures, don't trust claims
- Check revocation status
- Consider soul age when assessing trust

---

## Changelog

- 2026-02-02: Initial threat model
