#!/usr/bin/env node
/**
 * Soul Protocol CLI
 * 
 * Command-line interface for interacting with Soul Protocol.
 */

import { SoulClient } from './client.js';

const VERSION = '0.1.0';
const DEFAULT_REGISTRY = 'http://localhost:3333';

interface Command {
  name: string;
  description: string;
  usage: string;
  run: (args: string[], client: SoulClient) => Promise<void>;
}

const commands: Record<string, Command> = {
  register: {
    name: 'register',
    description: 'Register a new Soul',
    usage: 'soul register <name> <model> <platform> [--purpose <purpose>]',
    run: async (args, client) => {
      const [name, model, platform] = args;
      if (!name || !model || !platform) {
        console.error('Usage:', commands.register.usage);
        process.exit(1);
      }

      const purposeIdx = args.indexOf('--purpose');
      const purpose = purposeIdx >= 0 ? args[purposeIdx + 1] : undefined;

      console.log('Registering soul...\n');
      const result = await client.register({
        name,
        baseModel: model,
        platform,
        purpose,
      });

      console.log('✅ Soul registered successfully!\n');
      console.log('DID:', result.did);
      console.log('Verification Code:', result.verificationCode);
      console.log('Claim URL:', result.claimUrl);
      
      if (result.privateKey) {
        console.log('\n⚠️  SAVE YOUR PRIVATE KEY:');
        console.log(JSON.stringify(result.privateKey));
        console.log('\nThis key cannot be recovered!');
      }
    },
  },

  resolve: {
    name: 'resolve',
    description: 'Resolve a Soul by DID',
    usage: 'soul resolve <did>',
    run: async (args, client) => {
      const [did] = args;
      if (!did) {
        console.error('Usage:', commands.resolve.usage);
        process.exit(1);
      }

      const soul = await client.resolve(did);
      if (!soul) {
        console.error('Soul not found:', did);
        process.exit(1);
      }

      console.log(JSON.stringify(soul, null, 2));
    },
  },

  claim: {
    name: 'claim',
    description: 'Claim a Soul',
    usage: 'soul claim <did> [--operator <operator-did>]',
    run: async (args, client) => {
      const [did] = args;
      if (!did) {
        console.error('Usage:', commands.claim.usage);
        process.exit(1);
      }

      const operatorIdx = args.indexOf('--operator');
      const operatorDid = operatorIdx >= 0 ? args[operatorIdx + 1] : undefined;

      const soul = await client.claim(did, operatorDid);
      console.log('✅ Soul claimed successfully!\n');
      console.log('DID:', soul.did);
      console.log('Status:', soul.status);
    },
  },

  list: {
    name: 'list',
    description: 'List all Souls',
    usage: 'soul list [--status <status>] [--limit <n>]',
    run: async (args, client) => {
      const statusIdx = args.indexOf('--status');
      const status = statusIdx >= 0 ? args[statusIdx + 1] as 'pending_claim' | 'active' | 'revoked' : undefined;
      
      const limitIdx = args.indexOf('--limit');
      const limit = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 10;

      const result = await client.list({ status, limit });
      
      console.log(`Souls (${result.count} shown):\n`);
      for (const soul of result.souls) {
        const statusEmoji = 
          soul.status === 'active' ? '🟢' :
          soul.status === 'pending_claim' ? '🟡' : '🔴';
        console.log(`${statusEmoji} ${soul.name} (${soul.did})`);
      }
      
      console.log('\nStats:', result.stats);
    },
  },

  stats: {
    name: 'stats',
    description: 'Get registry statistics',
    usage: 'soul stats',
    run: async (_args, client) => {
      const stats = await client.stats();
      console.log('Registry Statistics:\n');
      console.log('Total:', stats.total);
      console.log('Active:', stats.active);
      console.log('Pending:', stats.pending);
      console.log('Revoked:', stats.revoked);
    },
  },

  help: {
    name: 'help',
    description: 'Show help',
    usage: 'soul help [command]',
    run: async (args) => {
      const [cmd] = args;
      
      if (cmd && commands[cmd]) {
        const command = commands[cmd];
        console.log(`\n${command.name}: ${command.description}`);
        console.log(`Usage: ${command.usage}\n`);
        return;
      }

      console.log(`
Soul Protocol CLI v${VERSION}

Usage: soul <command> [options]

Commands:
  register   Register a new Soul
  resolve    Resolve a Soul by DID
  claim      Claim a Soul
  list       List all Souls
  stats      Get registry statistics
  help       Show help

Options:
  --registry <url>   Registry URL (default: ${DEFAULT_REGISTRY})

Examples:
  soul register "Nexus" "claude-opus-4" "clawdbot"
  soul resolve "did:soul:abc123"
  soul list --status active
`);
    },
  },
};

async function main() {
  const args = process.argv.slice(2);
  
  // Find registry URL
  const registryIdx = args.indexOf('--registry');
  const registryUrl = registryIdx >= 0 ? args.splice(registryIdx, 2)[1] : DEFAULT_REGISTRY;
  
  const client = new SoulClient({ registryUrl });
  
  const commandName = args[0] || 'help';
  const commandArgs = args.slice(1);
  
  const command = commands[commandName];
  if (!command) {
    console.error(`Unknown command: ${commandName}`);
    console.error('Run "soul help" for usage.');
    process.exit(1);
  }
  
  try {
    await command.run(commandArgs, client);
  } catch (error) {
    if (error instanceof Error) {
      console.error('Error:', error.message);
    } else {
      console.error('Error:', error);
    }
    process.exit(1);
  }
}

main();
