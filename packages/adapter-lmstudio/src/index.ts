/**
 * LM Studio Adapter
 *
 * Implements the ReasoningProvider interface for LM Studio local server.
 * LM Studio exposes an OpenAI-compatible API on localhost.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface LMStudioAdapterConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class LMStudioAdapter implements ReasoningProvider {
  name = 'lmstudio';

  private config: LMStudioAdapterConfig;
  private baseUrl: string;

  constructor(config: LMStudioAdapterConfig = {}) {
    this.config = {
      model: 'default',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };
    this.baseUrl = config.baseUrl || process.env.LM_STUDIO_BASE_URL || 'http://localhost:1234';
  }

  async initialize(): Promise<void> {
    // LM Studio exposes OpenAI-compatible /v1/models endpoint
    const response = await fetch(`${this.baseUrl}/v1/models`);
    if (!response.ok) {
      throw new Error(`LM Studio not reachable at ${this.baseUrl}`);
    }
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
      throw new Error(`LM Studio request failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '';

    return {
      design: this.parseResponse(content),
      confidence: 0.8,
      reasoning: content,
      metadata: {
        model: this.config.model,
        usage: data.usage,
      },
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

export function createLMStudioAdapter(config?: LMStudioAdapterConfig): LMStudioAdapter {
  return new LMStudioAdapter(config);
}
