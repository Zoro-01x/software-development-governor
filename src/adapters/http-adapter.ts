import { PromptPackage, ReasoningResult, ReasoningInput, ReasoningStrategy, ReasoningProvider } from '../reasoning.js';
import { ReasoningAdapter, ProviderRequest, ProviderResponse } from './adapter-interface.js';

export interface HttpAdapterConfig {
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  timeoutMs?: number;
  name?: string;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';
const DEFAULT_MODEL = 'gpt-4o-mini';

export class HttpAdapter implements ReasoningAdapter {
  readonly name: string;
  readonly provider = 'openai';
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly timeoutMs: number;

  constructor(config: HttpAdapterConfig = {}) {
    this.apiKey = config.apiKey ?? process.env.OPENAI_API_KEY ?? '';
    this.baseUrl = (config.baseUrl ?? process.env.OPENAI_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/, '');
    this.model = config.model ?? process.env.LLM_MODEL ?? DEFAULT_MODEL;
    this.timeoutMs = config.timeoutMs ?? 30000;
    this.name = config.name ?? `http-adapter:${this.model}`;
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
      metadata: promptPackage.metadata,
    };
  }

  translateFromProvider(response: ProviderResponse): string {
    return response.content;
  }

  async callProvider(request: ProviderRequest): Promise<ProviderResponse> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model,
          temperature: request.temperature,
          messages: request.messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = (await response.json()) as {
        choices?: Array<{ message?: { content?: string }; finish_reason?: string }>;
        usage?: { prompt_tokens: number; completion_tokens: number };
      };

      const content = data.choices?.[0]?.message?.content ?? '';
      const finishReason = data.choices?.[0]?.finish_reason;
      const usage = data.usage
        ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
        : undefined;

      return { content, finishReason, usage, raw: data };
    } finally {
      clearTimeout(timer);
    }
  }
}

export class HttpReasoningProvider implements ReasoningProvider {
  readonly name: string;
  private readonly adapter: HttpAdapter;
  private readonly strategy: ReasoningStrategy;

  constructor(adapter: HttpAdapter, strategy: ReasoningStrategy) {
    this.adapter = adapter;
    this.strategy = strategy;
    this.name = `http:${adapter.provider}:${strategy.name}`;
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    if (!this.adapter.isConfigured()) {
      throw new Error(`Adapter ${this.adapter.name} is not configured`);
    }

    const promptPackage = this.strategy.buildPromptPackage(input);
    const providerRequest = this.adapter.translateToProvider(promptPackage);
    const providerResponse = await this.adapter.callProvider(providerRequest);
    const rawContent = this.adapter.translateFromProvider(providerResponse);

    const result = this.strategy.parseResponse(rawContent);
    if (!result) {
      throw new Error('Failed to parse provider response');
    }

    return result;
  }
}

export function createHttpProvider(
  adapterConfig?: HttpAdapterConfig,
  strategy?: ReasoningStrategy
): ReasoningProvider {
  const { GeneralStrategy } = require('../strategies/general-strategy.js');
  const adapter = new HttpAdapter(adapterConfig);
  const strategyInstance = strategy ?? new GeneralStrategy();
  return new HttpReasoningProvider(adapter, strategyInstance);
}
