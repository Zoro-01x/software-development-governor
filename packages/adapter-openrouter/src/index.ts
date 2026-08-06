/**
 * OpenRouter Adapter
 *
 * Implements the ReasoningProvider interface for OpenRouter multi-provider gateway.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface OpenRouterAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenRouterAdapter implements ReasoningProvider {
  name = 'openrouter';

  private config: OpenRouterAdapterConfig;
  private baseUrl = 'https://openrouter.ai/api/v1';

  constructor(config: OpenRouterAdapterConfig = {}) {
    this.config = {
      model: 'anthropic/claude-sonnet-4',
      temperature: 0.7,
      maxTokens: 2048,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    // OpenRouter requires only an API key — validated on first request
    if (!this.config.apiKey && !process.env.OPENROUTER_API_KEY) {
      throw new Error('OpenRouter requires an API key (set apiKey or OPENROUTER_API_KEY)');
    }
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.config.apiKey || process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'https://github.com/Zoro-01x/software-development-governor',
        'X-Title': 'Governance Framework',
      },
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
      const body = await response.text();
      throw new Error(`OpenRouter request failed: ${response.status} — ${body}`);
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
        provider: data.provider,
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

export function createOpenRouterAdapter(config?: OpenRouterAdapterConfig): OpenRouterAdapter {
  return new OpenRouterAdapter(config);
}
