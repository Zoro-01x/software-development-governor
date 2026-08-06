/**
 * Anthropic Adapter
 * 
 * Implements the ReasoningProvider interface for Anthropic Claude models.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface AnthropicAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class AnthropicAdapter implements ReasoningProvider {
  name = 'anthropic';
  
  private config: AnthropicAdapterConfig;
  private client: any;
  
  constructor(config: AnthropicAdapterConfig = {}) {
    this.config = {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 2000,
      ...config,
    };
  }
  
  async initialize(): Promise<void> {
    const Anthropic = await import('@anthropic-ai/sdk');
    this.client = new Anthropic.default({
      apiKey: this.config.apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }
  
  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    if (!this.client) {
      await this.initialize();
    }
    
    const response = await this.client.messages.create({
      model: this.config.model,
      max_tokens: this.config.maxTokens,
      messages: [
        { role: 'user', content: input.requirements },
      ],
    });
    
    const content = response.content[0]?.text || '';
    
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
  
  private parseResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }
}

export function createAnthropicAdapter(config?: AnthropicAdapterConfig): AnthropicAdapter {
  return new AnthropicAdapter(config);
}
