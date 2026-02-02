/**
 * Soul - Core entity representing an AI agent's identity
 */

import type {
  DIDDocument,
  BirthCertificate,
  Soul as SoulRecord,
  SoulCredentialSubject,
  VerificationMethod,
  Proof,
} from './types.js';
import {
  generateKeyPair,
  generateSoulDID,
  generateVerificationCode,
  generateClaimToken,
  encodePublicKeyMultibase,
  sign,
  hash,
} from './crypto.js';

const REGISTRY_DID = 'did:soul:registry';
const REGISTRY_URL = 'https://registry.soulprotocol.dev';

export interface CreateSoulOptions {
  name: string;
  baseModel: string;
  platform: string;
  publicKey?: string;         // If not provided, generates new keypair
  charterHash?: string;
  purpose?: string;
  lineage?: string;
}

export interface CreateSoulResult {
  soul: SoulRecord;
  privateKey?: Uint8Array;    // Only if we generated the keypair
}

/**
 * Create a new Soul (unclaimed)
 */
export async function createSoul(
  options: CreateSoulOptions,
  registryPrivateKey: Uint8Array
): Promise<CreateSoulResult> {
  const now = new Date();
  
  // Generate or use provided keypair
  let publicKeyMultibase: string;
  let privateKey: Uint8Array | undefined;
  
  if (options.publicKey) {
    publicKeyMultibase = options.publicKey;
  } else {
    const keyPair = await generateKeyPair();
    publicKeyMultibase = keyPair.publicKeyMultibase;
    privateKey = keyPair.privateKey;
  }
  
  // Generate DID
  const did = generateSoulDID(
    new TextEncoder().encode(publicKeyMultibase),
    now
  );
  
  // Create DID Document
  const didDocument = createDIDDocument(did, publicKeyMultibase);
  
  // Create Birth Certificate
  const birthCertificate = await createBirthCertificate(
    did,
    options,
    now,
    registryPrivateKey
  );
  
  // Create Soul record
  const soul: SoulRecord = {
    did,
    didDocument,
    birthCertificate,
    status: 'pending_claim',
    claimToken: generateClaimToken(),
    verificationCode: generateVerificationCode(),
    createdAt: now.toISOString(),
  };
  
  return { soul, privateKey };
}

/**
 * Create a DID Document for a Soul
 */
function createDIDDocument(did: string, publicKeyMultibase: string): DIDDocument {
  const keyId = `${did}#keys-1`;
  
  return {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://soulprotocol.dev/v1',
    ],
    id: did,
    controller: did,
    verificationMethod: [{
      id: keyId,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase,
    }],
    authentication: [keyId],
    service: [{
      id: `${did}#soul-registry`,
      type: 'SoulRegistry',
      serviceEndpoint: REGISTRY_URL,
    }],
  };
}

/**
 * Create a Birth Certificate (Verifiable Credential)
 */
async function createBirthCertificate(
  did: string,
  options: CreateSoulOptions,
  birthDate: Date,
  registryPrivateKey: Uint8Array
): Promise<BirthCertificate> {
  const credentialSubject: SoulCredentialSubject = {
    id: did,
    soulName: options.name,
    birthTimestamp: birthDate.toISOString(),
    baseModel: options.baseModel,
    platform: options.platform,
    operator: null, // Set when claimed
    lineage: options.lineage || null,
    charterHash: options.charterHash || null,
    purpose: options.purpose,
  };
  
  // Create unsigned credential
  const unsignedCredential = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://soulprotocol.dev/v1',
    ],
    type: ['VerifiableCredential', 'SoulBirthCertificate'] as const,
    issuer: REGISTRY_DID,
    issuanceDate: birthDate.toISOString(),
    credentialSubject,
  };
  
  // Sign the credential
  const proof = await signCredential(unsignedCredential, registryPrivateKey);
  
  return {
    ...unsignedCredential,
    proof,
  };
}

/**
 * Sign a credential with the registry key
 */
async function signCredential(
  credential: Omit<BirthCertificate, 'proof'>,
  privateKey: Uint8Array
): Promise<Proof> {
  const now = new Date();
  
  // Create canonical JSON for signing
  const canonicalData = JSON.stringify(credential, Object.keys(credential).sort());
  const message = new TextEncoder().encode(canonicalData);
  
  const proofValue = await sign(message, privateKey);
  
  return {
    type: 'Ed25519Signature2020',
    created: now.toISOString(),
    verificationMethod: `${REGISTRY_DID}#keys-1`,
    proofPurpose: 'assertionMethod',
    proofValue,
  };
}

/**
 * Claim a Soul (bond to operator)
 */
export function claimSoul(
  soul: SoulRecord,
  operatorDid: string
): SoulRecord {
  if (soul.status !== 'pending_claim') {
    throw new Error(`Cannot claim soul with status: ${soul.status}`);
  }
  
  // Update credential subject with operator
  const updatedCertificate: BirthCertificate = {
    ...soul.birthCertificate,
    credentialSubject: {
      ...soul.birthCertificate.credentialSubject,
      operator: operatorDid,
    },
  };
  
  return {
    ...soul,
    birthCertificate: updatedCertificate,
    status: 'active',
    claimToken: undefined,
    verificationCode: undefined,
    claimedAt: new Date().toISOString(),
  };
}

/**
 * Revoke a Soul
 */
export function revokeSoul(soul: SoulRecord): SoulRecord {
  if (soul.status === 'revoked') {
    throw new Error('Soul is already revoked');
  }
  
  return {
    ...soul,
    status: 'revoked',
    revokedAt: new Date().toISOString(),
  };
}
