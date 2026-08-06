/**
 * Custom Local Adapter Example
 *
 * Demonstrates how to build your own adapter by implementing the ReasoningProvider interface.
 * This example uses a generic HTTP endpoint (e.g., vLLM, text-generation-webui, or any OpenAI-compatible server).
 *
 * Prerequisites:
 *   npm install @framework/core
 *
 * Run:
 *   npx tsx examples/integrations/custom-local.ts
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

interface CustomLocalConfig {
  baseUrl: string;
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
}

class CustomLocalAdapter implements ReasoningProvider {
  name = 'custom-local';

  private config: CustomLocalConfig;

  constructor(config: CustomLocalConfig) {
    this.config = {
      model: 'default',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    // Verify the endpoint is reachable
    const healthUrl = this.config.baseUrl.replace(/\/+$/, '') + '/v1/models';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(healthUrl, { headers });
    if (!response.ok) {
      throw new Error(`Custom endpoint not reachable at ${healthUrl}: ${response.status}`);
    }
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const url = this.config.baseUrl.replace(/\/+$/, '') + '/v1/chat/completions';
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: input.requirements },
        ],
        temperature: this.config.temperature,
        max_tokens: this.config.maxTokens,
      }),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      design: this.parseResponse(content),
      confidence: 0.7,
      reasoning: content,
      metadata: { model: this.config.model },
    };
  }

  private parseResponse(content: string): unknown {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }
}

// Factory function following the framework convention
function createCustomLocalAdapter(config: CustomLocalConfig): CustomLocalAdapter {
  return new CustomLocalAdapter(config);
}

// Usage
async function main() {
  const provider = createCustomLocalAdapter({
    baseUrl: 'http://localhost:8080',
    model: 'my-local-model',
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a webhook delivery system with retry logic',
    projectName: 'webhook-system',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
