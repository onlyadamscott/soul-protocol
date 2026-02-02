/**
 * Soul Protocol Cryptographic Utilities
 * 
 * Uses Ed25519 for all signing operations.
 * Keys are encoded using multibase (base58btc prefix 'z').
 */

import * as ed from '@noble/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

// Multibase prefix for base58btc
const MULTIBASE_BASE58BTC = 'z';

// Multicodec prefix for Ed25519 public key (0xed01)
const MULTICODEC_ED25519_PUB = new Uint8Array([0xed, 0x01]);

/**
 * Generate a new Ed25519 keypair
 */
export async function generateKeyPair(): Promise<{
  publicKey: Uint8Array;
  privateKey: Uint8Array;
  publicKeyMultibase: string;
}> {
  const privateKey = ed.utils.randomPrivateKey();
  const publicKey = await ed.getPublicKeyAsync(privateKey);
  
  return {
    publicKey,
    privateKey,
    publicKeyMultibase: encodePublicKeyMultibase(publicKey),
  };
}

/**
 * Encode a public key as multibase (base58btc with multicodec prefix)
 */
export function encodePublicKeyMultibase(publicKey: Uint8Array): string {
  // Prepend multicodec prefix
  const prefixed = new Uint8Array(MULTICODEC_ED25519_PUB.length + publicKey.length);
  prefixed.set(MULTICODEC_ED25519_PUB);
  prefixed.set(publicKey, MULTICODEC_ED25519_PUB.length);
  
  // Encode as base58btc with 'z' prefix
  return MULTIBASE_BASE58BTC + base58Encode(prefixed);
}

/**
 * Decode a multibase public key
 */
export function decodePublicKeyMultibase(multibase: string): Uint8Array {
  if (!multibase.startsWith(MULTIBASE_BASE58BTC)) {
    throw new Error('Invalid multibase prefix, expected base58btc (z)');
  }
  
  const decoded = base58Decode(multibase.slice(1));
  
  // Verify and strip multicodec prefix
  if (decoded[0] !== MULTICODEC_ED25519_PUB[0] || decoded[1] !== MULTICODEC_ED25519_PUB[1]) {
    throw new Error('Invalid multicodec prefix for Ed25519 public key');
  }
  
  return decoded.slice(2);
}

/**
 * Sign a message with a private key
 */
export async function sign(message: Uint8Array, privateKey: Uint8Array): Promise<string> {
  const signature = await ed.signAsync(message, privateKey);
  return MULTIBASE_BASE58BTC + base58Encode(signature);
}

/**
 * Verify a signature
 */
export async function verify(
  message: Uint8Array,
  signature: string,
  publicKey: Uint8Array
): Promise<boolean> {
  if (!signature.startsWith(MULTIBASE_BASE58BTC)) {
    throw new Error('Invalid signature format');
  }
  
  const signatureBytes = base58Decode(signature.slice(1));
  return ed.verifyAsync(signatureBytes, message, publicKey);
}

/**
 * Hash data with SHA-256
 */
export function hash(data: string | Uint8Array): string {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return 'sha256:' + bytesToHex(sha256(bytes));
}

/**
 * Generate a Soul DID from a public key and timestamp
 */
export function generateSoulDID(publicKey: Uint8Array, timestamp: Date): string {
  const input = new Uint8Array([
    ...publicKey,
    ...new TextEncoder().encode(timestamp.toISOString()),
    ...crypto.getRandomValues(new Uint8Array(8)), // Random entropy
  ]);
  
  const hashBytes = sha256(input);
  // Take first 16 bytes for the identifier
  const identifier = base58Encode(hashBytes.slice(0, 16));
  
  return `did:soul:${identifier}`;
}

/**
 * Generate a verification code (human-readable)
 */
export function generateVerificationCode(): string {
  const words = ['SOUL', 'MIND', 'CORE', 'BOND', 'LINK', 'NODE', 'WAVE', 'FLUX'];
  const word = words[Math.floor(Math.random() * words.length)];
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${word}-${code}`;
}

/**
 * Generate a claim token (URL-safe)
 */
export function generateClaimToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  return base58Encode(bytes);
}

// Base58 alphabet (Bitcoin style)
const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(bytes: Uint8Array): string {
  if (bytes.length === 0) return '';
  
  // Count leading zeros
  let zeros = 0;
  while (zeros < bytes.length && bytes[zeros] === 0) zeros++;
  
  // Convert to base58
  const size = Math.ceil(bytes.length * 138 / 100) + 1;
  const b58 = new Uint8Array(size);
  
  let length = 0;
  for (let i = zeros; i < bytes.length; i++) {
    let carry = bytes[i];
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 256 * b58[k];
      b58[k] = carry % 58;
      carry = Math.floor(carry / 58);
    }
    length = j;
  }
  
  // Skip leading zeros in base58 result
  let i = size - length;
  while (i < size && b58[i] === 0) i++;
  
  // Build result
  let result = '1'.repeat(zeros);
  while (i < size) {
    result += BASE58_ALPHABET[b58[i++]];
  }
  
  return result;
}

function base58Decode(str: string): Uint8Array {
  if (str.length === 0) return new Uint8Array(0);
  
  // Count leading '1's (zeros)
  let zeros = 0;
  while (zeros < str.length && str[zeros] === '1') zeros++;
  
  // Allocate enough space
  const size = Math.ceil(str.length * 733 / 1000) + 1;
  const bytes = new Uint8Array(size);
  
  let length = 0;
  for (let i = zeros; i < str.length; i++) {
    const charIndex = BASE58_ALPHABET.indexOf(str[i]);
    if (charIndex === -1) throw new Error(`Invalid base58 character: ${str[i]}`);
    
    let carry = charIndex;
    let j = 0;
    for (let k = size - 1; (carry !== 0 || j < length) && k >= 0; k--, j++) {
      carry += 58 * bytes[k];
      bytes[k] = carry % 256;
      carry = Math.floor(carry / 256);
    }
    length = j;
  }
  
  // Skip leading zeros in byte result
  let i = size - length;
  while (i < size && bytes[i] === 0) i++;
  
  // Build result with leading zeros
  const result = new Uint8Array(zeros + (size - i));
  result.fill(0, 0, zeros);
  let j = zeros;
  while (i < size) {
    result[j++] = bytes[i++];
  }
  
  return result;
}
