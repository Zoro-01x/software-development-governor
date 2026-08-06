import { ReasoningProvider, ReasoningStrategy } from '../reasoning.js';
import { ReasoningAdapter, AdapterConfig } from './adapter-interface.js';
import { HttpAdapter, HttpAdapterConfig, HttpReasoningProvider } from './http-adapter.js';
import { ChatAdapter, ChatFunction, ChatReasoningProvider } from './chat-adapter.js';
import { RuleBasedAdapter } from './rule-based-adapter.js';
import { GeneralStrategy } from '../strategies/general-strategy.js';

export interface RegisteredAdapter {
  readonly name: string;
  readonly provider: string;
  readonly adapter: ReasoningAdapter;
  readonly config: AdapterConfig;
}

export class AdapterRegistry {
  private adapters = new Map<string, RegisteredAdapter>();
  private strategies = new Map<string, ReasoningStrategy>();
  private defaultStrategy: ReasoningStrategy;

  constructor() {
    this.defaultStrategy = new GeneralStrategy();
    this.strategies.set('general', this.defaultStrategy);
  }

  registerAdapter(adapter: ReasoningAdapter, config?: AdapterConfig): void {
    const adapterConfig: AdapterConfig = config ?? {
      name: adapter.name,
      provider: adapter.provider,
    };

    this.adapters.set(adapter.name, {
      name: adapter.name,
      provider: adapter.provider,
      adapter,
      config: adapterConfig,
    });
  }

  registerStrategy(strategy: ReasoningStrategy): void {
    this.strategies.set(strategy.name, strategy);
  }

  getAdapter(name: string): ReasoningAdapter | undefined {
    return this.adapters.get(name)?.adapter;
  }

  getStrategy(name: string): ReasoningStrategy | undefined {
    return this.strategies.get(name);
  }

  createProvider(
    adapterName: string,
    strategyName?: string
  ): ReasoningProvider {
    const registered = this.adapters.get(adapterName);
    if (!registered) {
      throw new Error(`Adapter not found: ${adapterName}`);
    }

    const strategy = strategyName 
      ? this.getStrategy(strategyName) 
      : this.defaultStrategy;

    if (!strategy) {
      throw new Error(`Strategy not found: ${strategyName}`);
    }

    const adapter = registered.adapter;

    if (adapter instanceof HttpAdapter) {
      return new HttpReasoningProvider(adapter, strategy);
    }

    if (adapter instanceof ChatAdapter) {
      return new ChatReasoningProvider(adapter, strategy);
    }

    if (adapter instanceof RuleBasedAdapter) {
      return adapter as unknown as ReasoningProvider;
    }

    throw new Error(`Unsupported adapter type: ${adapter.constructor.name}`);
  }

  listAdapters(): Array<{ name: string; provider: string }> {
    return Array.from(this.adapters.values()).map(a => ({
      name: a.name,
      provider: a.provider,
    }));
  }

  listStrategies(): string[] {
    return Array.from(this.strategies.keys());
  }

  getProvidersForStrategy(strategyName: string): Array<ReasoningProvider> {
    const providers: ReasoningProvider[] = [];
    
    for (const [name] of this.adapters) {
      try {
        const provider = this.createProvider(name, strategyName);
        providers.push(provider);
      } catch {
        continue;
      }
    }

    return providers;
  }
}

export function createDefaultRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();

  const ruleBased = new RuleBasedAdapter();
  registry.registerAdapter(ruleBased);

  if (process.env.OPENAI_API_KEY) {
    const httpAdapter = new HttpAdapter({
      apiKey: process.env.OPENAI_API_KEY,
      baseUrl: process.env.OPENAI_BASE_URL,
      model: process.env.LLM_MODEL,
    });
    registry.registerAdapter(httpAdapter);
  }

  return registry;
}
