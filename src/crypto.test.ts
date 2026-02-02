/**
 * Tests for Soul Protocol cryptographic utilities
 */

import { describe, it, expect } from 'vitest';
import {
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

describe('Key Generation', () => {
  it('should generate a valid keypair', async () => {
    const keyPair = await generateKeyPair();
    
    expect(keyPair.publicKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.privateKey).toBeInstanceOf(Uint8Array);
    expect(keyPair.publicKeyMultibase).toMatch(/^z[1-9A-HJ-NP-Za-km-z]+$/);
    expect(keyPair.publicKey.length).toBe(32);
    expect(keyPair.privateKey.length).toBe(32);
  });

  it('should generate unique keypairs', async () => {
    const kp1 = await generateKeyPair();
    const kp2 = await generateKeyPair();
    
    expect(kp1.publicKeyMultibase).not.toBe(kp2.publicKeyMultibase);
  });
});

describe('Multibase Encoding', () => {
  it('should roundtrip public key encoding', async () => {
    const keyPair = await generateKeyPair();
    const encoded = encodePublicKeyMultibase(keyPair.publicKey);
    const decoded = decodePublicKeyMultibase(encoded);
    
    expect(decoded).toEqual(keyPair.publicKey);
  });

  it('should reject invalid multibase prefix', () => {
    expect(() => decodePublicKeyMultibase('invalid')).toThrow();
  });
});

describe('Signing and Verification', () => {
  it('should sign and verify a message', async () => {
    const keyPair = await generateKeyPair();
    const message = new TextEncoder().encode('Hello, Soul Protocol!');
    
    const signature = await sign(message, keyPair.privateKey);
    const isValid = await verify(message, signature, keyPair.publicKey);
    
    expect(signature).toMatch(/^z[1-9A-HJ-NP-Za-km-z]+$/);
    expect(isValid).toBe(true);
  });

  it('should reject tampered messages', async () => {
    const keyPair = await generateKeyPair();
    const message = new TextEncoder().encode('Original message');
    const tampered = new TextEncoder().encode('Tampered message');
    
    const signature = await sign(message, keyPair.privateKey);
    const isValid = await verify(tampered, signature, keyPair.publicKey);
    
    expect(isValid).toBe(false);
  });

  it('should reject wrong public key', async () => {
    const keyPair1 = await generateKeyPair();
    const keyPair2 = await generateKeyPair();
    const message = new TextEncoder().encode('Test message');
    
    const signature = await sign(message, keyPair1.privateKey);
    const isValid = await verify(message, signature, keyPair2.publicKey);
    
    expect(isValid).toBe(false);
  });
});

describe('Hashing', () => {
  it('should hash strings consistently', () => {
    const hash1 = hash('test');
    const hash2 = hash('test');
    
    expect(hash1).toBe(hash2);
    expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should produce different hashes for different inputs', () => {
    const hash1 = hash('test1');
    const hash2 = hash('test2');
    
    expect(hash1).not.toBe(hash2);
  });
});

describe('Soul DID Generation', () => {
  it('should generate valid DIDs', async () => {
    const keyPair = await generateKeyPair();
    const did = generateSoulDID(keyPair.publicKey, new Date());
    
    expect(did).toMatch(/^did:soul:[1-9A-HJ-NP-Za-km-z]+$/);
  });

  it('should generate unique DIDs', async () => {
    const keyPair = await generateKeyPair();
    const did1 = generateSoulDID(keyPair.publicKey, new Date());
    const did2 = generateSoulDID(keyPair.publicKey, new Date());
    
    // Even with same key and time, random entropy makes them unique
    expect(did1).not.toBe(did2);
  });
});

describe('Verification Codes', () => {
  it('should generate readable codes', () => {
    const code = generateVerificationCode();
    
    expect(code).toMatch(/^[A-Z]+-[A-Z0-9]{4}$/);
  });

  it('should generate unique codes', () => {
    const codes = new Set();
    for (let i = 0; i < 100; i++) {
      codes.add(generateVerificationCode());
    }
    // With 8 words * 34^4 combinations, collisions should be rare
    expect(codes.size).toBeGreaterThan(90);
  });
});

describe('Claim Tokens', () => {
  it('should generate URL-safe tokens', () => {
    const token = generateClaimToken();
    
    expect(token).toMatch(/^[1-9A-HJ-NP-Za-km-z]+$/);
    expect(token.length).toBeGreaterThan(20);
  });
});
