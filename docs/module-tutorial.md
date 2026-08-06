# Module Tutorial

Learn how to create custom modules for the Governance Framework.

## What is a Module?

A module is a self-contained package that provides a specific capability (memory, knowledge, planning, etc.).

## Creating a Module

### 1. Create a New Package

```bash
mkdir my-module
cd my-module
npm init -y
```

### 2. Add Dependencies

```json
{
  "name": "@my-org/module-myfeature",
  "version": "1.0.0",
  "type": "module",
  "dependencies": {
    "@framework/core": "^1.0.0"
  }
}
```

### 3. Define the Contract

```typescript
// src/types.ts
export interface MyFeature {
  id: string;
  name: string;
  data: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface MyFeatureStore {
  open(): Promise<void>;
  close(): Promise<void>;
  create(feature: Omit<MyFeature, 'id'>): Promise<MyFeature>;
  get(id: string): Promise<MyFeature | null>;
  update(id: string, updates: Partial<MyFeature>): Promise<MyFeature>;
  delete(id: string): Promise<boolean>;
  query(query: any): Promise<MyFeature[]>;
}
```

### 4. Implement In-Memory Store

```typescript
// src/in-memory.ts
import { MyFeature, MyFeatureStore } from './types.js';

export class InMemoryMyFeatureStore implements MyFeatureStore {
  private features = new Map<string, MyFeature>();
  private _status: 'uninitialized' | 'open' | 'closed' = 'uninitialized';
  
  async open(): Promise<void> {
    this._status = 'open';
  }
  
  async close(): Promise<void> {
    this._status = 'closed';
  }
  
  async create(feature: Omit<MyFeature, 'id'>): Promise<MyFeature> {
    this._ensureOpen();
    
    const id = this.generateId();
    const newFeature: MyFeature = {
      ...feature,
      id,
    };
    
    this.features.set(id, newFeature);
    return newFeature;
  }
  
  async get(id: string): Promise<MyFeature | null> {
    this._ensureOpen();
    return this.features.get(id) ?? null;
  }
  
  async update(id: string, updates: Partial<MyFeature>): Promise<MyFeature> {
    this._ensureOpen();
    
    const existing = this.features.get(id);
    if (!existing) {
      throw new Error('Feature not found');
    }
    
    const updated = { ...existing, ...updates };
    this.features.set(id, updated);
    return updated;
  }
  
  async delete(id: string): Promise<boolean> {
    this._ensureOpen();
    return this.features.delete(id);
  }
  
  async query(query: any): Promise<MyFeature[]> {
    this._ensureOpen();
    return Array.from(this.features.values());
  }
  
  private _ensureOpen(): void {
    if (this._status !== 'open') {
      throw new Error('Store is not open');
    }
  }
  
  private generateId(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}

export function createMyFeatureStore(): InMemoryMyFeatureStore {
  return new InMemoryMyFeatureStore();
}
```

### 5. Add Tests

```typescript
// tests/contract.test.ts
import { describe, it, expect } from 'vitest';
import { createMyFeatureStore } from '../src/in-memory.js';

describe('MyFeature Store', () => {
  it('can create and retrieve features', async () => {
    const store = createMyFeatureStore();
    await store.open();
    
    const feature = await store.create({
      name: 'Test Feature',
      data: { key: 'value' },
      metadata: {},
    });
    
    const retrieved = await store.get(feature.id);
    expect(retrieved?.name).toBe('Test Feature');
    
    await store.close();
  });
});
```

### 6. Build and Publish

```bash
npm run build
npm publish
```

## Using Your Module

```typescript
import { createMyFeatureStore } from '@my-org/module-myfeature';

const store = createMyFeatureStore();
await store.open();

const feature = await store.create({
  name: 'My Feature',
  data: { key: 'value' },
  metadata: {},
});

console.log(feature.id);
await store.close();
```

## Best Practices

1. **Define clear contracts** - Use TypeScript interfaces
2. **Implement in-memory first** - For testing and development
3. **Follow the lifecycle** - Always implement open/close
4. **Add comprehensive tests** - Cover all operations
5. **Document usage** - Add a README with examples

## Next Steps

- [Extension Tutorial](./extension-tutorial.md) - Extend the framework
- [Architecture Guide](./architecture-guide.md) - Understand the framework architecture
