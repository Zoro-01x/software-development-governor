import { PromptPackage, ReasoningResult, ReasoningInput, ReasoningStrategy, ReasoningProvider } from '../reasoning.js';
import { ReasoningAdapter, ProviderRequest, ProviderResponse } from './adapter-interface.js';

export type ChatFunction = (prompt: string) => Promise<string>;

export class ChatAdapter implements ReasoningAdapter {
  readonly name: string;
  readonly provider = 'generic';
  private chat: ChatFunction;

  constructor(chat: ChatFunction, name?: string) {
    this.chat = chat;
    this.name = name || 'chat-adapter';
  }

  isConfigured(): boolean {
    return true;
  }

  translateToProvider(promptPackage: PromptPackage): ProviderRequest {
    return {
      model: 'generic',
      messages: [
        { role: 'system', content: promptPackage.systemInstructions },
        { role: 'user', content: promptPackage.userPrompt },
      ],
      metadata: promptPackage.metadata,
    };
  }

  translateFromProvider(response: ProviderResponse): string {
    return response.content;
  }

  async callProvider(request: ProviderRequest): Promise<ProviderResponse> {
    const systemMsg = request.messages.find(m => m.role === 'system');
    const userMsg = request.messages.find(m => m.role === 'user');
    
    const fullPrompt = systemMsg 
      ? `${systemMsg.content}\n\n${userMsg?.content ?? ''}`
      : userMsg?.content ?? '';

    const content = await this.chat(fullPrompt);
    return { content };
  }
}

export class ChatReasoningProvider implements ReasoningProvider {
  readonly name: string;
  private readonly adapter: ChatAdapter;
  private readonly strategy: ReasoningStrategy;

  constructor(adapter: ChatAdapter, strategy: ReasoningStrategy) {
    this.adapter = adapter;
    this.strategy = strategy;
    this.name = `chat:${adapter.name}:${strategy.name}`;
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
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

export function createChatProvider(
  chat: ChatFunction,
  strategy?: ReasoningStrategy
): ReasoningProvider {
  const { GeneralStrategy } = require('../strategies/general-strategy.js');
  const adapter = new ChatAdapter(chat);
  const strategyInstance = strategy ?? new GeneralStrategy();
  return new ChatReasoningProvider(adapter, strategyInstance);
}
