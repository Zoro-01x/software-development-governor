# Adapter Tutorial

Learn how to create custom adapters for the Governance Framework.

## What is an Adapter?

An adapter is a package that implements the `ReasoningProvider` interface to connect to a specific AI provider (OpenAI, Anthropic, etc.).

## Creating an Adapter

### 1. Create a New Package

```bash
mkdir my-adapter
cd my-adapter
npm init -y
```

### 2. Add Dependencies

```json
{
  "name": "@my-org/adapter-myprovider",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@framework/core": "^1.0.0"
  }
}
```

### 3. Implement the Interface

```typescript
// src/index.ts
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export class MyAdapter implements ReasoningProvider {
  name = 'myprovider';
  
  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    // Call your provider's API
    const response = await fetch('https://api.myprovider.com/v1/chat', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.MYPROVIDER_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'my-model',
        messages: [{ role: 'user', content: input.requirements }],
      }),
    });
    
    const data = await response.json();
    
    return {
      design: this.parseResponse(data.choices[0].message.content),
      confidence: 0.8,
      reasoning: data.choices[0].message.content,
      metadata: { model: 'my-model', usage: data.usage },
    };
  }
  
  private parseResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }
}

export function createMyAdapter(): MyAdapter {
  return new MyAdapter();
}
```

### 4. Add Tests

```typescript
// tests/adapter.test.ts
import { describe, it, expect } from 'vitest';
import { MyAdapter } from '../src/index.js';

describe('MyAdapter', () => {
  it('implements ReasoningProvider', () => {
    const adapter = new MyAdapter();
    expect(adapter.name).toBe('myprovider');
    expect(typeof adapter.reason).toBe('function');
  });
});
```

### 5. Build and Publish

```bash
npm run build
npm publish
```

## Using Your Adapter

```typescript
import { createMyAdapter } from '@my-org/adapter-myprovider';

const adapter = createMyAdapter();
const result = await adapter.reason({
  requirements: 'Build a todo app',
});
```

## Best Practices

1. **Keep it simple** - Focus on one provider
2. **Handle errors gracefully** - Return meaningful error messages
3. **Add types** - Use TypeScript for type safety
4. **Document usage** - Add a README with examples
5. **Test thoroughly** - Cover edge cases

## Next Steps

- [Module Tutorial](./module-tutorial.md) - Create custom modules
- [Extension Tutorial](./extension-tutorial.md) - Extend the framework
