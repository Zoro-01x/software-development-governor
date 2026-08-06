# @framework/core

Core interfaces and types for the Governance Framework.

## Installation

```bash
npm install @framework/core
```

## Usage

```typescript
import { 
  createInMemoryStore,
  createKnowledgeStore,
  createPlanningStore 
} from '@framework/core';

const memory = createInMemoryStore();
await memory.open();

await memory.put('key', 'value');
const value = await memory.get('key');

await memory.close();
```

## API

See [API.md](./docs/API.md) for complete documentation.

## License

MIT
