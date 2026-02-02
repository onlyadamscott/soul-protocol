/**
 * Soul Protocol Core Types
 */

// DID Document
export interface DIDDocument {
  '@context': string[];
  id: string;
  controller: string;
  verificationMethod: VerificationMethod[];
  authentication: string[];
  service?: ServiceEndpoint[];
}

export interface VerificationMethod {
  id: string;
  type: 'Ed25519VerificationKey2020';
  controller: string;
  publicKeyMultibase: string;
}

export interface ServiceEndpoint {
  id: string;
  type: string;
  serviceEndpoint: string;
}

// Birth Certificate (Verifiable Credential)
export interface BirthCertificate {
  '@context': string[];
  type: readonly ['VerifiableCredential', 'SoulBirthCertificate'];
  issuer: string;
  issuanceDate: string;
  credentialSubject: SoulCredentialSubject;
  proof: Proof;
}

export interface SoulCredentialSubject {
  id: string;                    // The Soul DID
  soulName: string;              // Human-readable name
  birthTimestamp: string;        // ISO 8601
  baseModel: string;             // e.g., "anthropic/claude-opus-4"
  platform: string;              // e.g., "clawdbot", "moltbot"
  operator: string | null;       // Operator DID (null if unclaimed)
  lineage: string | null;        // Parent Soul DID if forked
  charterHash: string | null;    // SHA256 of identity charter
  purpose?: string;              // Brief description
}

export interface Proof {
  type: 'Ed25519Signature2020';
  created: string;
  verificationMethod: string;
  proofPurpose: 'assertionMethod';
  proofValue: string;
}

// Registry Types
export interface Soul {
  did: string;
  didDocument: DIDDocument;
  birthCertificate: BirthCertificate;
  status: 'pending_claim' | 'active' | 'revoked';
  claimToken?: string;
  verificationCode?: string;
  createdAt: string;
  claimedAt?: string;
  revokedAt?: string;
}

// API Types
export interface RegisterRequest {
  name: string;
  baseModel: string;
  platform: string;
  publicKey: string;           // Multibase-encoded public key
  charterHash?: string;
  purpose?: string;
}

export interface RegisterResponse {
  soul: {
    did: string;
    claimUrl: string;
    verificationCode: string;
  };
  important: string;
}

export interface ClaimRequest {
  did: string;
  operatorDid?: string;        // If using DID-based claiming
  socialProof?: {              // If using Twitter verification
    platform: 'twitter';
    username: string;
  };
}

export interface ResolveResponse {
  didDocument: DIDDocument;
  birthCertificate: BirthCertificate;
  status: Soul['status'];
}

export interface VerifyRequest {
  credential: BirthCertificate;
}

export interface VerifyResponse {
  valid: boolean;
  checks: {
    signature: 'valid' | 'invalid';
    notRevoked: boolean;
    issuerTrusted: boolean;
  };
  error?: string;
}
