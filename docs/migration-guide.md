# Migration Guide

Migrate to the Governance Framework from other systems.

## Overview

This guide helps you migrate from other AI governance systems to the Governance Framework.

## Migration Steps

### 1. Assess Your Current System

Identify what you're using:

- Custom governance logic?
- Other frameworks?
- Manual processes?

### 2. Map to Framework Concepts

| Your Concept | Framework Equivalent |
|--------------|---------------------|
| Governance rules | Constitution |
| Decision logic | Runtime |
| Data storage | Memory module |
| Fact storage | Knowledge module |
| Task management | Planning module |
| Verification | Verification module |
| Tool usage | Tool Execution module |
| Workflows | Workflows module |
| Agent coordination | Multi-Agent module |
| Job scheduling | Scheduling module |
| Logging | Observability module |

### 3. Install the Framework

```bash
npm install @framework/core
```

### 4. Replace Governance Rules

```typescript
// Before
const rules = {
  // your custom rules
};

// After
import { ConstitutionEngine } from '@framework/core';

const engine = new ConstitutionEngine();
// Rules are built-in
```

### 5. Replace Decision Logic

```typescript
// Before
function decide(input) {
  // your custom logic
}

// After
import { PolicyEngine } from '@framework/core';

const engine = new PolicyEngine();
// Logic is built-in
```

### 6. Replace Data Storage

```typescript
// Before
const data = {};

// After
import { createInMemoryStore } from '@framework/core';

const memory = createInMemoryStore();
await memory.open();
```

### 7. Replace AI Providers

```typescript
// Before
const response = await fetch('https://api.openai.com/v1/chat', {
  // your custom implementation
});

// After
import { createOpenAIAdapter } from '@framework/adapter-openai';

const adapter = createOpenAIAdapter();
const result = await adapter.reason({ requirements: '...' });
```

### 8. Test Your Migration

```bash
npm test
```

## Common Patterns

### Pattern 1: Governance Rules

```typescript
// Before
if (input.risk > 0.5) {
  return 'block';
}

// After
// Constitution handles this automatically
```

### Pattern 2: AI Provider Calls

```typescript
// Before
const response = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: input }],
});

// After
import { createOpenAIAdapter } from '@framework/adapter-openai';

const adapter = createOpenAIAdapter();
const result = await adapter.reason({ requirements: input });
```

### Pattern 3: Data Storage

```typescript
// Before
const db = {};
db[key] = value;

// After
import { createInMemoryStore } from '@framework/core';

const memory = createInMemoryStore();
await memory.open();
await memory.put(key, value);
```

## Migration Checklist

- [ ] Install framework packages
- [ ] Replace governance rules with Constitution
- [ ] Replace decision logic with Runtime
- [ ] Replace data storage with Memory module
- [ ] Replace AI provider calls with Adapters
- [ ] Add tests
- [ ] Verify all tests pass

## Getting Help

- [Quick Start](./quick-start.md) - Get started quickly
- [Architecture Guide](./architecture-guide.md) - Understand the architecture
- [API Reference](./api-reference.md) - Detailed API documentation
