/**
 * OpenAI Adapter
 * 
 * Implements the ReasoningProvider interface for OpenAI models.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface OpenAIAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export class OpenAIAdapter implements ReasoningProvider {
  name = 'openai';
  
  private config: OpenAIAdapterConfig;
  private client: any;
  
  constructor(config: OpenAIAdapterConfig = {}) {
    this.config = {
      model: 'gpt-4',
      temperature: 0.7,
      maxTokens: 2000,
      ...config,
    };
  }
  
  async initialize(): Promise<void> {
    // Dynamic import to avoid hard dependency
    const { default: OpenAI } = await import('openai');
    this.client = new OpenAI({
      apiKey: this.config.apiKey || process.env.OPENAI_API_KEY,
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
  
  private parseResponse(content: string): any {
    try {
      return JSON.parse(content);
    } catch {
      return { raw: content };
    }
  }
}

export function createOpenAIAdapter(config?: OpenAIAdapterConfig): OpenAIAdapter {
  return new OpenAIAdapter(config);
}
