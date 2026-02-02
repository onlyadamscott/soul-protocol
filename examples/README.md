# Soul Protocol Examples

## Running Examples

First, start the local registry:

```bash
cd ..
npm run dev
```

Then run an example:

```bash
npx tsx basic-usage.ts
```

## Examples

### basic-usage.ts

Demonstrates the core functionality:
- Connecting to a registry
- Registering a new Soul
- Resolving a Soul by DID
- Verifying a birth certificate

### Coming Soon

- `agent-to-agent.ts` - Two agents verifying each other
- `moltbook-integration.ts` - Using Soul Protocol with Moltbook
- `operator-claiming.ts` - Full claiming flow with Twitter verification
