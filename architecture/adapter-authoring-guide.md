# Adapter Authoring Guide

**Last Updated:** 2026-08-05  
**Status:** FROZEN (ADR-001)

## Overview

Adapters translate between the framework's `PromptPackage` and provider-specific requests/responses. They contain NO prompts, NO reasoning logic, and NO governance logic.

## Creating an Adapter

### 1. Implement `ReasoningAdapter` Interface

```typescript
import { PromptPackage } from '../reasoning.js';
import { ReasoningAdapter, ProviderRequest, ProviderResponse } from './adapter-interface.js';

export class MyAdapter implements ReasoningAdapter {
  readonly name = 'my-adapter';
  readonly provider = 'my-provider';

  isConfigured(): boolean {
    // Check if credentials are available
    return !!process.env.MY_API_KEY;
  }

  translateToProvider(promptPackage: PromptPackage): ProviderRequest {
    // Convert PromptPackage to provider-specific request
    return {
      model: 'my-model',
      messages: [
        { role: 'system', content: promptPackage.systemInstructions },
        { role: 'user', content: promptPackage.userPrompt },
      ],
      temperature: 0.7,
    };
  }

  translateFromProvider(response: ProviderResponse): string {
    // Extract content from provider response
    return response.content;
  }
}
```

### 2. Register the Adapter

```typescript
import { AdapterRegistry } from './registry.js';
import { MyAdapter } from './my-adapter.js';

const registry = new AdapterRegistry();
const adapter = new MyAdapter();
registry.registerAdapter(adapter);
```

### 3. Create Provider

```typescript
const provider = registry.createProvider('my-adapter', 'general');
const result = await provider.reason({
  requirements: 'Build a web app',
  projectName: 'MyApp',
});
```

## Rules

### DO
- Translate `PromptPackage` to provider-specific format
- Handle provider authentication
- Handle HTTP/SDK communication
- Handle streaming if supported
- Handle errors gracefully
- Return raw content for strategy parsing

### DO NOT
- Include prompts or system instructions
- Parse responses into `ReasoningResult`
- Import from `src/runtime/` or `src/components/`
- Access governance state
- Make decisions about reasoning

## Example: OpenAI-Compatible Adapter

```typescript
export class OpenAICompatibleAdapter implements ReasoningAdapter {
  readonly name: string;
  readonly provider: string;
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(config: { apiKey: string; baseUrl: string; model: string }) {
    this.name = `openai-compatible:${config.model}`;
    this.provider = 'openai-compatible';
    this.apiKey = config.apiKey;
    this.baseUrl = config.baseUrl;
    this.model = config.model;
  }

  isConfigured(): boolean {
    return this.apiKey.length > 0;
  }

  translateToProvider(promptPackage: PromptPackage): ProviderRequest {
    return {
      model: this.model,
      messages: [
        { role: 'system', content: promptPackage.systemInstructions },
        { role: 'user', content: promptPackage.userPrompt },
      ],
      temperature: 0.7,
    };
  }

  translateFromProvider(response: ProviderResponse): string {
    return response.content;
  }

  async callProvider(request: ProviderRequest): Promise<ProviderResponse> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(request),
    });

    const data = await response.json();
    return {
      content: data.choices[0].message.content,
      finishReason: data.choices[0].finish_reason,
    };
  }
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyAdapter } from './my-adapter.js';

describe('MyAdapter', () => {
  it('translates PromptPackage to ProviderRequest', () => {
    const adapter = new MyAdapter({ apiKey: 'test', baseUrl: 'test', model: 'test' });
    const promptPackage = {
      systemInstructions: 'Test instructions',
      userPrompt: 'Test prompt',
    };

    const request = adapter.translateToProvider(promptPackage);

    expect(request.model).toBe('test');
    expect(request.messages).toHaveLength(2);
    expect(request.messages[0].content).toBe('Test instructions');
  });
});
```
