# Quick Start

Get up and running with the Governance Framework in 5 minutes.

## Installation

```bash
npm install @framework/core
```

## Basic Usage

### 1. Create a Memory Store

```typescript
import { createInMemoryStore } from '@framework/core';

const memory = createInMemoryStore();
await memory.open();

// Store data
await memory.put('user:1', { name: 'Alice', age: 30 });

// Retrieve data
const user = await memory.get('user:1');
console.log(user); // { name: 'Alice', age: 30 }

await memory.close();
```

### 2. Use a Provider Adapter

```bash
npm install @framework/adapter-openai
```

```typescript
import { createOpenAIAdapter } from '@framework/adapter-openai';

const adapter = createOpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4',
});

const result = await adapter.reason({
  requirements: 'Build a personal portfolio website',
  projectName: 'Portfolio',
});

console.log(result.design);
```

### 3. Use a File-based Memory Store

```bash
npm install @framework/memory-file
```

```typescript
import { createFileMemoryStore } from '@framework/memory-file';

const memory = createFileMemoryStore('./data');
await memory.open();

await memory.put('config', { theme: 'dark' });
const config = await memory.get('config');

await memory.close();
```

## Next Steps

- [Adapter Tutorial](./adapter-tutorial.md) - Learn how to create custom adapters
- [Module Tutorial](./module-tutorial.md) - Learn how to create custom modules
- [Extension Tutorial](./extension-tutorial.md) - Learn how to extend the framework
- [Architecture Guide](./architecture-guide.md) - Understand the framework architecture
