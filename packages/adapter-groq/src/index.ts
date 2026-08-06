/**
 * Groq Adapter
 *
 * Implements the ReasoningProvider interface for Groq-hosted models.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface GroqAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class GroqAdapter implements ReasoningProvider {
  name = 'groq';

  private config: GroqAdapterConfig;
  private client: any;

  constructor(config: GroqAdapterConfig = {}) {
    this.config = {
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    const GroqSDK = (await import('groq-sdk')).default;
    this.client = new GroqSDK({
      apiKey: this.config.apiKey || process.env.GROQ_API_KEY,
    });
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    if (!this.client) {
      await this.initialize();
    }

    const response = await this.client.chat.completions.create({
      model: this.config.model,
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: input.requirements },
      ],
      temperature: this.config.temperature,
      max_tokens: this.config.maxTokens,
    });

    const content = response.choices[0]?.message?.content || '';

    return {
      design: this.parseResponse(content),
      confidence: 0.8,
      reasoning: content,
      metadata: {
        model: this.config.model,
        usage: response.usage,
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

export function createGroqAdapter(config?: GroqAdapterConfig): GroqAdapter {
  return new GroqAdapter(config);
}
