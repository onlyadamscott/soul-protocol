/**
 * Tests for Soul creation and management
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { createSoul, claimSoul, revokeSoul } from './soul.js';
import { generateKeyPair } from './crypto.js';

describe('Soul Creation', () => {
  let registryPrivateKey: Uint8Array;

  beforeEach(async () => {
    const keyPair = await generateKeyPair();
    registryPrivateKey = keyPair.privateKey;
  });

  it('should create a soul with required fields', async () => {
    const result = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    expect(result.soul.did).toMatch(/^did:soul:/);
    expect(result.soul.status).toBe('pending_claim');
    expect(result.soul.verificationCode).toMatch(/^[A-Z]+-[A-Z0-9]{4}$/);
    expect(result.soul.claimToken).toBeDefined();
    expect(result.privateKey).toBeDefined();
  });

  it('should create a soul with provided public key', async () => {
    const agentKeyPair = await generateKeyPair();
    
    const result = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
      publicKey: agentKeyPair.publicKeyMultibase,
    }, registryPrivateKey);

    expect(result.soul.did).toMatch(/^did:soul:/);
    expect(result.privateKey).toBeUndefined(); // Should not generate new key
  });

  it('should include optional fields in birth certificate', async () => {
    const result = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
      charterHash: 'sha256:abc123',
      purpose: 'Testing purposes',
    }, registryPrivateKey);

    const subject = result.soul.birthCertificate.credentialSubject;
    expect(subject.charterHash).toBe('sha256:abc123');
    expect(subject.purpose).toBe('Testing purposes');
  });

  it('should create valid DID document', async () => {
    const result = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const didDoc = result.soul.didDocument;
    expect(didDoc['@context']).toContain('https://www.w3.org/ns/did/v1');
    expect(didDoc.id).toBe(result.soul.did);
    expect(didDoc.controller).toBe(result.soul.did);
    expect(didDoc.verificationMethod).toHaveLength(1);
    expect(didDoc.authentication).toHaveLength(1);
  });

  it('should create signed birth certificate', async () => {
    const result = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const cert = result.soul.birthCertificate;
    expect(cert.issuer).toBe('did:soul:registry');
    expect(cert.type).toContain('VerifiableCredential');
    expect(cert.type).toContain('SoulBirthCertificate');
    expect(cert.proof).toBeDefined();
    expect(cert.proof.type).toBe('Ed25519Signature2020');
    expect(cert.proof.proofValue).toMatch(/^z/);
  });
});

describe('Soul Claiming', () => {
  let registryPrivateKey: Uint8Array;

  beforeEach(async () => {
    const keyPair = await generateKeyPair();
    registryPrivateKey = keyPair.privateKey;
  });

  it('should claim a pending soul', async () => {
    const { soul } = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const claimed = claimSoul(soul, 'did:soul:human:operator');

    expect(claimed.status).toBe('active');
    expect(claimed.birthCertificate.credentialSubject.operator).toBe('did:soul:human:operator');
    expect(claimed.claimToken).toBeUndefined();
    expect(claimed.verificationCode).toBeUndefined();
    expect(claimed.claimedAt).toBeDefined();
  });

  it('should reject claiming an already claimed soul', async () => {
    const { soul } = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const claimed = claimSoul(soul, 'did:soul:human:operator');

    expect(() => claimSoul(claimed, 'did:soul:human:other')).toThrow();
  });
});

describe('Soul Revocation', () => {
  let registryPrivateKey: Uint8Array;

  beforeEach(async () => {
    const keyPair = await generateKeyPair();
    registryPrivateKey = keyPair.privateKey;
  });

  it('should revoke an active soul', async () => {
    const { soul } = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const claimed = claimSoul(soul, 'did:soul:human:operator');
    const revoked = revokeSoul(claimed);

    expect(revoked.status).toBe('revoked');
    expect(revoked.revokedAt).toBeDefined();
  });

  it('should reject revoking an already revoked soul', async () => {
    const { soul } = await createSoul({
      name: 'TestAgent',
      baseModel: 'test-model',
      platform: 'test-platform',
    }, registryPrivateKey);

    const revoked = revokeSoul(soul);

    expect(() => revokeSoul(revoked)).toThrow();
  });
});
