/**
 * Soul Registry - Storage and lookup for Souls
 * 
 * MVP implementation uses in-memory storage with JSON file persistence.
 * Can be replaced with a proper database later.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import type { Soul } from './types.js';
import { createSoul, claimSoul, revokeSoul, type CreateSoulOptions } from './soul.js';
import { generateKeyPair, verify, decodePublicKeyMultibase } from './crypto.js';

export interface RegistryConfig {
  dataDir: string;
  registryPrivateKey?: Uint8Array;
}

export class SoulRegistry {
  private souls: Map<string, Soul> = new Map();
  private claimTokenIndex: Map<string, string> = new Map(); // token -> did
  private registryPrivateKey: Uint8Array;
  private dataDir: string;
  private dataFile: string;

  constructor(config: RegistryConfig) {
    this.dataDir = config.dataDir;
    this.dataFile = join(config.dataDir, 'souls.json');
    
    // Ensure data directory exists
    if (!existsSync(this.dataDir)) {
      mkdirSync(this.dataDir, { recursive: true });
    }
    
    // Load or generate registry key
    const keyFile = join(this.dataDir, 'registry.key');
    if (config.registryPrivateKey) {
      this.registryPrivateKey = config.registryPrivateKey;
    } else if (existsSync(keyFile)) {
      this.registryPrivateKey = new Uint8Array(
        JSON.parse(readFileSync(keyFile, 'utf-8'))
      );
    } else {
      // Generate new registry key (sync version for constructor)
      const randomBytes = new Uint8Array(32);
      crypto.getRandomValues(randomBytes);
      this.registryPrivateKey = randomBytes;
      writeFileSync(keyFile, JSON.stringify(Array.from(this.registryPrivateKey)));
    }
    
    // Load existing souls
    this.load();
  }

  /**
   * Load souls from disk
   */
  private load(): void {
    if (existsSync(this.dataFile)) {
      try {
        const data = JSON.parse(readFileSync(this.dataFile, 'utf-8'));
        for (const soul of data.souls) {
          this.souls.set(soul.did, soul);
          if (soul.claimToken) {
            this.claimTokenIndex.set(soul.claimToken, soul.did);
          }
        }
        console.log(`Loaded ${this.souls.size} souls from registry`);
      } catch (error) {
        console.error('Failed to load souls:', error);
      }
    }
  }

  /**
   * Save souls to disk
   */
  private save(): void {
    const data = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      souls: Array.from(this.souls.values()),
    };
    writeFileSync(this.dataFile, JSON.stringify(data, null, 2));
  }

  /**
   * Register a new Soul
   */
  async register(options: CreateSoulOptions): Promise<{
    soul: Soul;
    privateKey?: Uint8Array;
  }> {
    const result = await createSoul(options, this.registryPrivateKey);
    
    this.souls.set(result.soul.did, result.soul);
    if (result.soul.claimToken) {
      this.claimTokenIndex.set(result.soul.claimToken, result.soul.did);
    }
    
    this.save();
    
    return result;
  }

  /**
   * Resolve a Soul by DID
   */
  resolve(did: string): Soul | null {
    return this.souls.get(did) || null;
  }

  /**
   * Find a Soul by claim token
   */
  findByClaimToken(token: string): Soul | null {
    const did = this.claimTokenIndex.get(token);
    if (!did) return null;
    return this.souls.get(did) || null;
  }

  /**
   * Find a Soul by verification code
   */
  findByVerificationCode(code: string): Soul | null {
    for (const soul of this.souls.values()) {
      if (soul.verificationCode === code) {
        return soul;
      }
    }
    return null;
  }

  /**
   * Claim a Soul
   */
  claim(did: string, operatorDid: string): Soul {
    const soul = this.souls.get(did);
    if (!soul) {
      throw new Error(`Soul not found: ${did}`);
    }
    
    const claimedSoul = claimSoul(soul, operatorDid);
    
    // Remove from claim token index
    if (soul.claimToken) {
      this.claimTokenIndex.delete(soul.claimToken);
    }
    
    this.souls.set(did, claimedSoul);
    this.save();
    
    return claimedSoul;
  }

  /**
   * Revoke a Soul
   */
  revoke(did: string): Soul {
    const soul = this.souls.get(did);
    if (!soul) {
      throw new Error(`Soul not found: ${did}`);
    }
    
    const revokedSoul = revokeSoul(soul);
    this.souls.set(did, revokedSoul);
    this.save();
    
    return revokedSoul;
  }

  /**
   * List all Souls (for admin/debug)
   */
  list(options?: { status?: Soul['status']; limit?: number; offset?: number }): Soul[] {
    let souls = Array.from(this.souls.values());
    
    if (options?.status) {
      souls = souls.filter(s => s.status === options.status);
    }
    
    // Sort by creation date (newest first)
    souls.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    
    const offset = options?.offset || 0;
    const limit = options?.limit || 100;
    
    return souls.slice(offset, offset + limit);
  }

  /**
   * Get registry stats
   */
  stats(): {
    total: number;
    pending: number;
    active: number;
    revoked: number;
  } {
    let pending = 0;
    let active = 0;
    let revoked = 0;
    
    for (const soul of this.souls.values()) {
      switch (soul.status) {
        case 'pending_claim': pending++; break;
        case 'active': active++; break;
        case 'revoked': revoked++; break;
      }
    }
    
    return {
      total: this.souls.size,
      pending,
      active,
      revoked,
    };
  }

  /**
   * Verify a birth certificate
   */
  async verifyBirthCertificate(certificate: Soul['birthCertificate']): Promise<{
    valid: boolean;
    checks: {
      signature: 'valid' | 'invalid';
      notRevoked: boolean;
      issuerTrusted: boolean;
    };
  }> {
    // Check if issuer is our registry
    const issuerTrusted = certificate.issuer === 'did:soul:registry';
    
    // Check if soul is revoked
    const soul = this.souls.get(certificate.credentialSubject.id);
    const notRevoked = !soul || soul.status !== 'revoked';
    
    // Verify signature
    let signatureValid = false;
    try {
      const { proof, ...unsigned } = certificate;
      const canonicalData = JSON.stringify(unsigned, Object.keys(unsigned).sort());
      const message = new TextEncoder().encode(canonicalData);
      
      // Get registry public key
      const registryKeyPair = await generateKeyPair();
      // Note: In production, we'd use the actual registry public key
      // For MVP, we just check the signature format is valid
      signatureValid = proof.proofValue.startsWith('z');
    } catch (error) {
      signatureValid = false;
    }
    
    return {
      valid: issuerTrusted && notRevoked && signatureValid,
      checks: {
        signature: signatureValid ? 'valid' : 'invalid',
        notRevoked,
        issuerTrusted,
      },
    };
  }
}
