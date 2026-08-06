import { describe, it, expect } from 'vitest';
import { ReasoningInput, ReasoningProvider } from '../../src/reasoning.js';
import { ChatAdapter, ChatReasoningProvider } from '../../src/adapters/chat-adapter.js';
import { RuleBasedAdapter } from '../../src/adapters/rule-based-adapter.js';
import { HttpAdapter, HttpReasoningProvider } from '../../src/adapters/http-adapter.js';
import { GeneralStrategy } from '../../src/strategies/general-strategy.js';
import { AdapterRegistry, createDefaultRegistry } from '../../src/adapters/registry.js';

describe('Provider Substitution', () => {
  const strategy = new GeneralStrategy();
  const input: ReasoningInput = {
    requirements: 'Build a web application for task management',
    projectName: 'TaskApp',
  };

  const mockResponse = JSON.stringify({
    vision: 'A world where task management is effortless',
    mission: 'To build a task app that enables users to manage their work',
    audience: { demographics: 'Professionals', psychographics: 'Productive', scenario: 'Work' },
    experienceGoals: ['Efficient task management', 'Reduced stress'],
    emotionalJourney: {
      states: ['Curiosity', 'Flow', 'Confidence'],
      transitions: [
        { from: 'Curiosity', to: 'Flow', trigger: 'First task created' },
        { from: 'Flow', to: 'Confidence', trigger: 'Tasks completed' },
      ],
    },
    narrative: { hook: 'Get organized', arc: 'Learn', pacing: 'Quick', resolution: 'Success' },
    interactionModel: { inputs: ['Click', 'Type'], feedback: ['Visual'], stateTransitions: [], flow: 'Linear' },
    motionSystem: { principles: ['Smooth'], microInteractions: [], transitions: [], ambientMotion: [] },
    visualLanguage: { color: 'Blue', typography: 'Clean', space: 'Open', shape: 'Rounded', light: 'Bright' },
    successMetrics: [{ metric: 'Completion', target: '90%', observable: true, verifiable: true, actionable: true }],
  });

  describe('Different providers produce same result shape', () => {
    it('ChatReasoningProvider produces valid result', async () => {
      const chat = async (prompt: string) => mockResponse;
      const adapter = new ChatAdapter(chat);
      const provider = new ChatReasoningProvider(adapter, strategy);

      const result = await provider.reason(input);

      expect(result.architecture).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(result.openQuestions).toBeDefined();
      expect(result.architecture.vision).toBeTruthy();
      expect(result.architecture.mission).toBeTruthy();
    });

    it('RuleBasedAdapter produces valid result', async () => {
      const provider = new RuleBasedAdapter();

      const result = await provider.reason(input);

      expect(result.architecture).toBeDefined();
      expect(result.rationale).toBeDefined();
      expect(result.openQuestions).toBeDefined();
      expect(result.architecture.vision).toBeTruthy();
      expect(result.architecture.mission).toBeTruthy();
    });

    it('both providers return compatible architecture structure', async () => {
      const chat = async (prompt: string) => mockResponse;
      const chatAdapter = new ChatAdapter(chat);
      const chatProvider = new ChatReasoningProvider(chatAdapter, strategy);
      const ruleBasedProvider = new RuleBasedAdapter();

      const chatResult = await chatProvider.reason(input);
      const ruleBasedResult = await ruleBasedProvider.reason(input);

      expect(Object.keys(chatResult.architecture)).toEqual(
        Object.keys(ruleBasedResult.architecture)
      );
      expect(Array.isArray(chatResult.rationale)).toBe(true);
      expect(Array.isArray(ruleBasedResult.rationale)).toBe(true);
      expect(Array.isArray(chatResult.openQuestions)).toBe(true);
      expect(Array.isArray(ruleBasedResult.openQuestions)).toBe(true);
    });
  });

  describe('Registry creates providers dynamically', () => {
    it('creates provider from registered adapter', () => {
      const registry = new AdapterRegistry();
      const ruleBased = new RuleBasedAdapter();
      registry.registerAdapter(ruleBased);

      const provider = registry.createProvider('rule-based');
      expect(provider).toBeDefined();
      expect(provider.name).toContain('rule-based');
    });

    it('creates providers for all registered adapters', () => {
      const registry = new AdapterRegistry();
      const ruleBased = new RuleBasedAdapter();
      const chatAdapter = new ChatAdapter(async () => '');

      registry.registerAdapter(ruleBased);
      registry.registerAdapter(chatAdapter);

      const adapters = registry.listAdapters();
      expect(adapters.length).toBe(2);

      for (const adapter of adapters) {
        const provider = registry.createProvider(adapter.name);
        expect(provider).toBeDefined();
      }
    });

    it('throws for unknown adapter', () => {
      const registry = new AdapterRegistry();
      expect(() => registry.createProvider('unknown')).toThrow('Adapter not found');
    });

    it('throws for unknown strategy', () => {
      const registry = new AdapterRegistry();
      const ruleBased = new RuleBasedAdapter();
      registry.registerAdapter(ruleBased);

      expect(() => registry.createProvider('rule-based', 'unknown')).toThrow('Strategy not found');
    });

    it('lists available adapters and strategies', () => {
      const registry = new AdapterRegistry();
      const ruleBased = new RuleBasedAdapter();
      const strategy = new GeneralStrategy();

      registry.registerAdapter(ruleBased);
      registry.registerStrategy(strategy);

      expect(registry.listAdapters()).toHaveLength(1);
      expect(registry.listStrategies()).toContain('general');
    });
  });

  describe('Default registry', () => {
    it('creates a registry with rule-based adapter', () => {
      const registry = createDefaultRegistry();
      const adapters = registry.listAdapters();

      expect(adapters.some(a => a.name === 'rule-based')).toBe(true);
    });

    it('creates a working provider from default registry', async () => {
      const registry = createDefaultRegistry();
      const provider = registry.createProvider('rule-based');

      const result = await provider.reason(input);
      expect(result.architecture).toBeDefined();
    });
  });

  describe('Provider substitution in GovernancePipeline context', () => {
    it('different providers can be used interchangeably', async () => {
      const chat = async (prompt: string) => mockResponse;
      const chatAdapter = new ChatAdapter(chat);
      const chatProvider = new ChatReasoningProvider(chatAdapter, strategy);
      const ruleBasedProvider = new RuleBasedAdapter();

      const providers: ReasoningProvider[] = [chatProvider, ruleBasedProvider];

      for (const provider of providers) {
        const result = await provider.reason(input);

        expect(result.architecture.vision).toBeTruthy();
        expect(result.architecture.mission).toBeTruthy();
        expect(result.architecture.audience.demographics).toBeTruthy();
        expect(result.architecture.experienceGoals.length).toBeGreaterThan(0);
        expect(result.architecture.emotionalJourney.states.length).toBeGreaterThan(0);
      }
    });

    it('governance behavior identical across providers', async () => {
      const chat = async (prompt: string) => mockResponse;
      const chatAdapter = new ChatAdapter(chat);
      const chatProvider = new ChatReasoningProvider(chatAdapter, strategy);
      const ruleBasedProvider = new RuleBasedAdapter();

      const chatResult = await chatProvider.reason(input);
      const ruleBasedResult = await ruleBasedProvider.reason(input);

      expect(chatResult.architecture.narrative).toBeDefined();
      expect(ruleBasedResult.architecture.narrative).toBeDefined();
      expect(chatResult.architecture.interactionModel).toBeDefined();
      expect(ruleBasedResult.architecture.interactionModel).toBeDefined();
      expect(chatResult.architecture.motionSystem).toBeDefined();
      expect(ruleBasedResult.architecture.motionSystem).toBeDefined();
      expect(chatResult.architecture.visualLanguage).toBeDefined();
      expect(ruleBasedResult.architecture.visualLanguage).toBeDefined();
    });
  });
});
