/**
 * Soul Protocol Client SDK
 * 
 * Easy-to-use client for interacting with Soul Protocol registries.
 */

import type {
  Soul,
  RegisterRequest,
  RegisterResponse,
  ResolveResponse,
  VerifyResponse,
  BirthCertificate,
} from './types.js';

export interface SoulClientConfig {
  registryUrl: string;
  timeout?: number;
}

export interface RegisterResult {
  did: string;
  claimUrl: string;
  verificationCode: string;
  privateKey?: number[];
}

export class SoulClient {
  private registryUrl: string;
  private timeout: number;

  constructor(config: SoulClientConfig) {
    this.registryUrl = config.registryUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = config.timeout || 30000;
  }

  /**
   * Register a new Soul
   */
  async register(options: {
    name: string;
    baseModel: string;
    platform: string;
    publicKey?: string;
    charterHash?: string;
    purpose?: string;
  }): Promise<RegisterResult> {
    const response = await this.fetch('/v1/souls/register', {
      method: 'POST',
      body: JSON.stringify(options),
    });

    if (!response.success) {
      throw new Error(response.error || 'Registration failed');
    }

    return {
      did: response.soul.did,
      claimUrl: response.soul.claimUrl,
      verificationCode: response.soul.verificationCode,
      privateKey: response.privateKey,
    };
  }

  /**
   * Resolve a Soul by DID
   */
  async resolve(did: string): Promise<ResolveResponse | null> {
    try {
      const response = await this.fetch(`/v1/souls/${encodeURIComponent(did)}`);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Claim a Soul
   */
  async claim(did: string, operatorDid?: string): Promise<Soul> {
    const response = await this.fetch('/v1/souls/claim', {
      method: 'POST',
      body: JSON.stringify({
        did,
        operatorDid,
      }),
    });

    if (!response.success) {
      throw new Error(response.error || 'Claim failed');
    }

    return response.soul;
  }

  /**
   * Verify a birth certificate
   */
  async verify(credential: BirthCertificate): Promise<VerifyResponse> {
    const response = await this.fetch('/v1/verify', {
      method: 'POST',
      body: JSON.stringify({ credential }),
    });

    return response;
  }

  /**
   * List all Souls
   */
  async list(options?: {
    status?: 'pending_claim' | 'active' | 'revoked';
    limit?: number;
    offset?: number;
  }): Promise<{
    souls: Array<{
      did: string;
      name: string;
      status: string;
      createdAt: string;
    }>;
    count: number;
    stats: {
      total: number;
      pending: number;
      active: number;
      revoked: number;
    };
  }> {
    const params = new URLSearchParams();
    if (options?.status) params.set('status', options.status);
    if (options?.limit) params.set('limit', options.limit.toString());
    if (options?.offset) params.set('offset', options.offset.toString());

    const query = params.toString();
    const response = await this.fetch(`/v1/souls${query ? `?${query}` : ''}`);
    return response;
  }

  /**
   * Get registry stats
   */
  async stats(): Promise<{
    total: number;
    pending: number;
    active: number;
    revoked: number;
  }> {
    const response = await this.fetch('/');
    return response.stats;
  }

  /**
   * Internal fetch helper
   */
  private async fetch(path: string, options: RequestInit = {}): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(`${this.registryUrl}${path}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
        signal: controller.signal,
      });

      const data = await response.json() as Record<string, unknown>;

      if (!response.ok) {
        throw new Error((data.error as string) || `HTTP ${response.status}`);
      }

      return data;
    } finally {
      clearTimeout(timeoutId);
    }
  }
}

/**
 * Create a Soul Client with default registry
 */
export function createClient(registryUrl = 'https://registry.soulprotocol.dev'): SoulClient {
  return new SoulClient({ registryUrl });
}
