/**
 * Soul Protocol - The birth certificate for AI agents
 * 
 * @packageDocumentation
 */

// Core types
export type {
  DIDDocument,
  BirthCertificate,
  Soul,
  SoulCredentialSubject,
  VerificationMethod,
  Proof,
  RegisterRequest,
  RegisterResponse,
  ClaimRequest,
  ResolveResponse,
  VerifyRequest,
  VerifyResponse,
} from './types.js';

// Crypto utilities
export {
  generateKeyPair,
  encodePublicKeyMultibase,
  decodePublicKeyMultibase,
  sign,
  verify,
  hash,
  generateSoulDID,
  generateVerificationCode,
  generateClaimToken,
} from './crypto.js';

// Soul management
export {
  createSoul,
  claimSoul,
  revokeSoul,
  type CreateSoulOptions,
  type CreateSoulResult,
} from './soul.js';

// Registry
export { SoulRegistry, type RegistryConfig } from './registry.js';

// Version
export const VERSION = '0.1.0';
