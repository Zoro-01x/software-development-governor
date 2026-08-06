# Extension Tutorial

Learn how to extend the Governance Framework with custom functionality.

## What is an Extension?

An extension is a package that adds new capabilities to the framework without modifying the core.

## Types of Extensions

1. **Adapters** - Connect to AI providers
2. **Modules** - Add new capabilities
3. **Memory Backends** - Add new storage options
4. **Strategies** - Add new reasoning strategies

## Creating an Extension

### 1. Choose the Type

Decide what type of extension you need:

- Need to connect to a new AI provider? → Create an Adapter
- Need a new capability? → Create a Module
- Need a new storage backend? → Create a Memory Backend
- Need a new reasoning approach? → Create a Strategy

### 2. Create the Package

```bash
mkdir my-extension
cd my-extension
npm init -y
```

### 3. Implement the Interface

Choose the appropriate interface from `@framework/core`:

```typescript
// For adapters
import { ReasoningProvider } from '@framework/core';

// For modules
import { MemoryStore } from '@framework/core';

// For memory backends
import { MemoryStore } from '@framework/core';

// For strategies
import { ReasoningStrategy } from '@framework/core';
```

### 4. Follow the Patterns

All extensions should:

1. **Implement the interface** - Use the correct TypeScript interface
2. **Handle lifecycle** - Implement open/close methods
3. **Throw meaningful errors** - Use descriptive error messages
4. **Be independent** - No dependencies on other extensions
5. **Be testable** - Include comprehensive tests

### 5. Add Tests

```typescript
// tests/extension.test.ts
import { describe, it, expect } from 'vitest';
import { MyExtension } from '../src/index.js';

describe('MyExtension', () => {
  it('implements the interface', () => {
    const ext = new MyExtension();
    expect(typeof ext.open).toBe('function');
    expect(typeof ext.close).toBe('function');
  });
  
  it('handles lifecycle', async () => {
    const ext = new MyExtension();
    await ext.open();
    // Use extension
    await ext.close();
  });
});
```

### 6. Build and Publish

```bash
npm run build
npm publish
```

## Using Extensions

```typescript
import { createMyExtension } from '@my-org/my-extension';

const ext = createMyExtension();
await ext.open();

// Use extension

await ext.close();
```

## Best Practices

1. **Keep it focused** - One extension, one responsibility
2. **Follow interfaces** - Use the correct TypeScript interfaces
3. **Handle errors gracefully** - Return meaningful error messages
4. **Add types** - Use TypeScript for type safety
5. **Document usage** - Add a README with examples
6. **Test thoroughly** - Cover all operations

## Next Steps

- [Architecture Guide](./architecture-guide.md) - Understand the framework architecture
- [Migration Guide](./migration-guide.md) - Migrate from other frameworks
