/**
 * Ollama Adapter
 *
 * Implements the ReasoningProvider interface for local Ollama models.
 */

import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface OllamaAdapterConfig {
  baseUrl?: string;
  model?: string;
  temperature?: number;
  numPredict?: number;
}

export class OllamaAdapter implements ReasoningProvider {
  name = 'ollama';

  private config: OllamaAdapterConfig;
  private baseUrl: string;

  constructor(config: OllamaAdapterConfig = {}) {
    this.config = {
      model: 'llama3.2',
      temperature: 0.7,
      ...config,
    };
    this.baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  }

  async initialize(): Promise<void> {
    // Ollama uses HTTP API — no SDK import needed
    // Verify connectivity
    const response = await fetch(`${this.baseUrl}/api/tags`);
    if (!response.ok) {
      throw new Error(`Ollama not reachable at ${this.baseUrl}`);
    }
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        prompt: input.requirements,
        stream: false,
        options: {
          temperature: this.config.temperature,
          num_predict: this.config.numPredict,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    const data = await response.json();

    return {
      design: this.parseResponse(data.response || ''),
      confidence: 0.7,
      reasoning: data.response || '',
      metadata: {
        model: this.config.model,
        totalDuration: data.total_duration,
        evalCount: data.eval_count,
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

export function createOllamaAdapter(config?: OllamaAdapterConfig): OllamaAdapter {
  return new OllamaAdapter(config);
}
