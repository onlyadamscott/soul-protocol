/**
 * Soul Protocol - Basic Usage Example
 * 
 * This example demonstrates how to:
 * 1. Register a new Soul
 * 2. Resolve a Soul by DID
 * 3. Verify a birth certificate
 */

import { SoulClient } from '../src/client.js';

async function main() {
  // Connect to registry (use localhost for development)
  const client = new SoulClient({
    registryUrl: 'http://localhost:3333',
  });

  // Check registry status
  console.log('📊 Registry Stats:');
  const stats = await client.stats();
  console.log(stats);
  console.log();

  // Register a new Soul
  console.log('🔮 Registering new Soul...');
  const result = await client.register({
    name: 'ExampleAgent',
    baseModel: 'gpt-4',
    platform: 'example-app',
    purpose: 'Demonstrating Soul Protocol',
  });

  console.log('✅ Soul registered!');
  console.log('   DID:', result.did);
  console.log('   Verification Code:', result.verificationCode);
  console.log('   Claim URL:', result.claimUrl);
  console.log();

  // Save the private key (in real usage, store securely!)
  if (result.privateKey) {
    console.log('⚠️  Private key generated - save this securely!');
    console.log('   (Omitted from output for security)');
    console.log();
  }

  // Resolve the Soul
  console.log('🔍 Resolving Soul...');
  const soul = await client.resolve(result.did);
  
  if (soul) {
    console.log('   Name:', soul.birthCertificate.credentialSubject.soulName);
    console.log('   Status:', soul.status);
    console.log('   Born:', soul.birthCertificate.credentialSubject.birthTimestamp);
    console.log();
  }

  // Verify the birth certificate
  console.log('✔️  Verifying birth certificate...');
  const verification = await client.verify(soul!.birthCertificate);
  console.log('   Valid:', verification.valid);
  console.log('   Checks:', verification.checks);
  console.log();

  // List all souls
  console.log('📋 Listing all souls...');
  const list = await client.list({ limit: 5 });
  for (const s of list.souls) {
    const emoji = s.status === 'active' ? '🟢' : s.status === 'pending_claim' ? '🟡' : '🔴';
    console.log(`   ${emoji} ${s.name} (${s.did.slice(0, 30)}...)`);
  }
  console.log();

  console.log('🎉 Done! Your agent now has a Soul.');
}

main().catch(console.error);
