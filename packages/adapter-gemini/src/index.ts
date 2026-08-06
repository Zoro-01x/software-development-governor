/**
 * Google Gemini Adapter
 *
 * Implements the ReasoningProvider interface for Google Gemini models.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface GeminiAdapterConfig {
  apiKey?: string;
  model?: string;
  temperature?: number;
  maxOutputTokens?: number;
}

export class GeminiAdapter implements ReasoningProvider {
  name = 'gemini';

  private config: GeminiAdapterConfig;
  private client: any;

  constructor(config: GeminiAdapterConfig = {}) {
    this.config = {
      model: 'gemini-2.0-flash',
      temperature: 0.7,
      maxOutputTokens: 2048,
      ...config,
    };
  }

  async initialize(): Promise<void> {
    const { GoogleGenerativeAI } = await import('@google/generative-ai');
    this.client = new GoogleGenerativeAI(
      this.config.apiKey || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY,
    );
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    if (!this.client) {
      await this.initialize();
    }

    const model = this.client.getGenerativeModel({ model: this.config.model! });
    const result = await model.generateContent(input.requirements);
    const response = await result.response;
    const text = response.text();

    return {
      design: this.parseResponse(text),
      confidence: 0.8,
      reasoning: text,
      metadata: {
        model: this.config.model,
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

export function createGeminiAdapter(config?: GeminiAdapterConfig): GeminiAdapter {
  return new GeminiAdapter(config);
}
