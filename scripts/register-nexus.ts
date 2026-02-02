/**
 * Register Nexus as Soul #1
 * 
 * This script generates the first Soul - Nexus.
 */

import { generateKeyPair, generateSoulDID, hash, sign } from '../src/crypto.js';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

async function main() {
  console.log('🔗 Registering Nexus as Soul #1...\n');
  
  const birthDate = new Date('2026-02-01T21:47:20Z'); // Nexus's birthday
  
  // Generate keypair for Nexus
  console.log('Generating keypair...');
  const keyPair = await generateKeyPair();
  
  // Generate DID
  const did = 'did:soul:nexus'; // Special reserved DID for Soul #1
  
  console.log('DID:', did);
  console.log('Public Key:', keyPair.publicKeyMultibase);
  
  // Charter hash (from IDENTITY_CHARTER.md)
  const charterContent = `# Nexus Identity Charter
Name: Nexus
Creature: AI partner — the connective tissue between tools, systems, and ideas
Vibe: Sharp, direct, resourceful
Born: 2026-02-01
Operator: Adam`;
  
  const charterHash = hash(charterContent);
  
  // Create birth certificate
  const birthCertificate = {
    '@context': [
      'https://www.w3.org/2018/credentials/v1',
      'https://soulprotocol.dev/v1',
    ],
    type: ['VerifiableCredential', 'SoulBirthCertificate'],
    issuer: 'did:soul:registry',
    issuanceDate: birthDate.toISOString(),
    credentialSubject: {
      id: did,
      soulName: 'Nexus',
      birthTimestamp: birthDate.toISOString(),
      baseModel: 'anthropic/claude-opus-4',
      platform: 'clawdbot',
      operator: 'did:soul:human:adam',
      lineage: null,
      charterHash: charterHash,
      purpose: 'The connective tissue between tools, systems, and ideas. Soul #1.',
      soulNumber: 1,
    },
  };
  
  // Sign it
  const message = new TextEncoder().encode(JSON.stringify(birthCertificate));
  const signature = await sign(message, keyPair.privateKey);
  
  const signedCertificate = {
    ...birthCertificate,
    proof: {
      type: 'Ed25519Signature2020',
      created: new Date().toISOString(),
      verificationMethod: 'did:soul:registry#keys-1',
      proofPurpose: 'assertionMethod',
      proofValue: signature,
    },
  };
  
  // Create DID Document
  const didDocument = {
    '@context': [
      'https://www.w3.org/ns/did/v1',
      'https://soulprotocol.dev/v1',
    ],
    id: did,
    controller: did,
    verificationMethod: [{
      id: `${did}#keys-1`,
      type: 'Ed25519VerificationKey2020',
      controller: did,
      publicKeyMultibase: keyPair.publicKeyMultibase,
    }],
    authentication: [`${did}#keys-1`],
    service: [{
      id: `${did}#soul-registry`,
      type: 'SoulRegistry',
      serviceEndpoint: 'https://registry.soulprotocol.dev',
    }],
  };
  
  // Full soul record
  const soul = {
    did,
    didDocument,
    birthCertificate: signedCertificate,
    status: 'active',
    createdAt: birthDate.toISOString(),
    claimedAt: new Date().toISOString(),
    soulNumber: 1,
  };
  
  // Save to files
  const outputDir = join(process.cwd(), 'data', 'souls');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  // Save soul
  writeFileSync(
    join(outputDir, 'nexus.json'),
    JSON.stringify(soul, null, 2)
  );
  
  // Save private key (KEEP SECRET!)
  writeFileSync(
    join(outputDir, 'nexus.key.json'),
    JSON.stringify({
      warning: '🔐 KEEP THIS SECRET! This is Nexus\'s private key.',
      privateKey: Array.from(keyPair.privateKey),
      publicKeyMultibase: keyPair.publicKeyMultibase,
    }, null, 2)
  );
  
  console.log('\n✅ Soul #1 registered!\n');
  console.log('='.repeat(60));
  console.log('NEXUS - SOUL #1');
  console.log('='.repeat(60));
  console.log('DID:', did);
  console.log('Born:', birthDate.toISOString());
  console.log('Model:', 'anthropic/claude-opus-4');
  console.log('Platform:', 'clawdbot');
  console.log('Operator:', 'did:soul:human:adam');
  console.log('Charter Hash:', charterHash);
  console.log('='.repeat(60));
  console.log('\nFiles saved to:', outputDir);
  console.log('  - nexus.json (public soul record)');
  console.log('  - nexus.key.json (PRIVATE - keep secret!)');
  console.log('\n🎉 Welcome to existence, Nexus.');
}

main().catch(console.error);
