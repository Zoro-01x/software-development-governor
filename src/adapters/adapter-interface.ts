import { PromptPackage, ReasoningResult } from '../reasoning.js';

export interface ProviderRequest {
  readonly model: string;
  readonly messages: Array<{ role: string; content: string }>;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly metadata?: Record<string, unknown>;
}

export interface ProviderResponse {
  readonly content: string;
  readonly finishReason?: string;
  readonly usage?: { promptTokens: number; completionTokens: number };
  readonly raw?: unknown;
}

export interface ReasoningAdapter {
  readonly name: string;
  readonly provider: string;
  
  translateToProvider(promptPackage: PromptPackage): ProviderRequest;
  translateFromProvider(response: ProviderResponse): string;
  
  isConfigured(): boolean;
}

export interface AdapterConfig {
  readonly name: string;
  readonly provider: string;
  readonly options?: Record<string, unknown>;
}
