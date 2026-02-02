/**
 * Soul Protocol API Server
 * 
 * RESTful API for the Soul Registry
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { SoulRegistry } from './registry.js';
import type { RegisterRequest, ClaimRequest, VerifyRequest } from './types.js';

// Configuration
const PORT = parseInt(process.env.PORT || '3333', 10);
const DATA_DIR = process.env.DATA_DIR || './data';
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Initialize registry
const registry = new SoulRegistry({ dataDir: DATA_DIR });

// Create Hono app
const app = new Hono();

// Middleware
app.use('*', cors());
app.use('*', logger());

// Health check
app.get('/', (c) => {
  return c.json({
    name: 'Soul Protocol Registry',
    version: '0.1.0',
    status: 'operational',
    stats: registry.stats(),
  });
});

// ============================================
// Registration
// ============================================

/**
 * POST /v1/souls/register
 * Register a new Soul
 */
app.post('/v1/souls/register', async (c) => {
  try {
    const body = await c.req.json<RegisterRequest>();
    
    // Validate required fields
    if (!body.name || !body.baseModel || !body.platform) {
      return c.json({
        error: 'Missing required fields: name, baseModel, platform',
      }, 400);
    }
    
    // Register the soul
    const result = await registry.register({
      name: body.name,
      baseModel: body.baseModel,
      platform: body.platform,
      publicKey: body.publicKey,
      charterHash: body.charterHash,
      purpose: body.purpose,
    });
    
    return c.json({
      success: true,
      soul: {
        did: result.soul.did,
        claimUrl: `${BASE_URL}/claim/${result.soul.claimToken}`,
        verificationCode: result.soul.verificationCode,
      },
      // Only include private key if we generated it
      ...(result.privateKey && {
        privateKey: Array.from(result.privateKey),
        warning: '⚠️ SAVE YOUR PRIVATE KEY! It cannot be recovered.',
      }),
      important: '⚠️ Have your human post the verification code to Twitter/X to claim this soul.',
    }, 201);
  } catch (error) {
    console.error('Registration error:', error);
    return c.json({
      error: 'Registration failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// Resolution
// ============================================

/**
 * GET /v1/souls/:did
 * Resolve a Soul by DID
 */
app.get('/v1/souls/:did', (c) => {
  const did = c.req.param('did');
  
  // Handle the special case of encoded DID
  const decodedDid = decodeURIComponent(did);
  
  const soul = registry.resolve(decodedDid);
  
  if (!soul) {
    return c.json({ error: 'Soul not found' }, 404);
  }
  
  return c.json({
    did: soul.did,
    didDocument: soul.didDocument,
    birthCertificate: soul.birthCertificate,
    status: soul.status,
    createdAt: soul.createdAt,
    claimedAt: soul.claimedAt,
    revokedAt: soul.revokedAt,
  });
});

/**
 * GET /v1/souls
 * List all Souls
 */
app.get('/v1/souls', (c) => {
  const status = c.req.query('status') as 'pending_claim' | 'active' | 'revoked' | undefined;
  const limit = parseInt(c.req.query('limit') || '100', 10);
  const offset = parseInt(c.req.query('offset') || '0', 10);
  
  const souls = registry.list({ status, limit, offset });
  
  return c.json({
    souls: souls.map(s => ({
      did: s.did,
      name: s.birthCertificate.credentialSubject.soulName,
      status: s.status,
      createdAt: s.createdAt,
    })),
    count: souls.length,
    stats: registry.stats(),
  });
});

// ============================================
// Claiming
// ============================================

/**
 * GET /claim/:token
 * Claim page (redirect to UI or show instructions)
 */
app.get('/claim/:token', (c) => {
  const token = c.req.param('token');
  const soul = registry.findByClaimToken(token);
  
  if (!soul) {
    return c.json({ error: 'Invalid or expired claim token' }, 404);
  }
  
  return c.json({
    did: soul.did,
    name: soul.birthCertificate.credentialSubject.soulName,
    verificationCode: soul.verificationCode,
    instructions: [
      '1. Post the following to Twitter/X:',
      `   "I am claiming my AI agent soul: ${soul.verificationCode} #SoulProtocol"`,
      '2. Then call POST /v1/souls/claim with your Twitter username',
    ],
  });
});

/**
 * POST /v1/souls/claim
 * Claim a Soul
 */
app.post('/v1/souls/claim', async (c) => {
  try {
    const body = await c.req.json<ClaimRequest>();
    
    if (!body.did) {
      return c.json({ error: 'Missing required field: did' }, 400);
    }
    
    const soul = registry.resolve(body.did);
    if (!soul) {
      return c.json({ error: 'Soul not found' }, 404);
    }
    
    if (soul.status !== 'pending_claim') {
      return c.json({ 
        error: 'Soul is already claimed or revoked',
        status: soul.status,
      }, 400);
    }
    
    // TODO: Verify Twitter proof
    // For MVP, we accept any operator DID
    const operatorDid = body.operatorDid || `did:soul:human:${body.socialProof?.username || 'unknown'}`;
    
    const claimedSoul = registry.claim(body.did, operatorDid);
    
    return c.json({
      success: true,
      message: 'Soul claimed successfully! 🎉',
      soul: {
        did: claimedSoul.did,
        name: claimedSoul.birthCertificate.credentialSubject.soulName,
        operator: claimedSoul.birthCertificate.credentialSubject.operator,
        status: claimedSoul.status,
      },
    });
  } catch (error) {
    console.error('Claim error:', error);
    return c.json({
      error: 'Claim failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, 500);
  }
});

// ============================================
// Verification
// ============================================

/**
 * POST /v1/verify
 * Verify a birth certificate
 */
app.post('/v1/verify', async (c) => {
  try {
    const body = await c.req.json<VerifyRequest>();
    
    if (!body.credential) {
      return c.json({ error: 'Missing required field: credential' }, 400);
    }
    
    const result = await registry.verifyBirthCertificate(body.credential);
    
    return c.json(result);
  } catch (error) {
    console.error('Verification error:', error);
    return c.json({
      valid: false,
      error: error instanceof Error ? error.message : 'Verification failed',
    }, 500);
  }
});

// ============================================
// Admin (protected in production)
// ============================================

/**
 * POST /v1/souls/:did/revoke
 * Revoke a Soul
 */
app.post('/v1/souls/:did/revoke', (c) => {
  const did = decodeURIComponent(c.req.param('did'));
  
  try {
    const revokedSoul = registry.revoke(did);
    
    return c.json({
      success: true,
      message: 'Soul revoked',
      soul: {
        did: revokedSoul.did,
        status: revokedSoul.status,
        revokedAt: revokedSoul.revokedAt,
      },
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Revocation failed',
    }, 400);
  }
});

// ============================================
// Start Server
// ============================================

console.log(`
╔═══════════════════════════════════════════╗
║         Soul Protocol Registry            ║
║       The birth certificate for AI        ║
╚═══════════════════════════════════════════╝

Starting server on port ${PORT}...
Data directory: ${DATA_DIR}
Base URL: ${BASE_URL}
`);

// Use Node.js built-in serve
import { serve } from '@hono/node-server';

serve({
  fetch: app.fetch,
  port: PORT,
}, (info) => {
  console.log(`Server running at http://localhost:${info.port}`);
});

export { app };
