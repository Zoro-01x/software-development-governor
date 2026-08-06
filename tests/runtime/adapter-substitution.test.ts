import { describe, it, expect } from 'vitest';
import { PromptPackage, ReasoningInput, ReasoningResult } from '../../src/reasoning.js';
import { HttpAdapter } from '../../src/adapters/http-adapter.js';
import { ChatAdapter, ChatReasoningProvider } from '../../src/adapters/chat-adapter.js';
import { RuleBasedAdapter } from '../../src/adapters/rule-based-adapter.js';
import { GeneralStrategy } from '../../src/strategies/general-strategy.js';

describe('Adapter Substitution', () => {
  const strategy = new GeneralStrategy();
  const input: ReasoningInput = {
    requirements: 'Build a web application',
    projectName: 'TestApp',
  };
  const promptPackage = strategy.buildPromptPackage(input);

  describe('HttpAdapter', () => {
    it('translates PromptPackage to ProviderRequest', () => {
      const adapter = new HttpAdapter({ apiKey: 'test-key', model: 'gpt-4' });
      const request = adapter.translateToProvider(promptPackage);

      expect(request.model).toBe('gpt-4');
      expect(request.messages).toHaveLength(2);
      expect(request.messages[0].role).toBe('system');
      expect(request.messages[1].role).toBe('user');
      expect(request.messages[0].content).toContain('Experience Architect');
      expect(request.messages[1].content).toContain('Build a web application');
    });

    it('translates ProviderResponse to string', () => {
      const adapter = new HttpAdapter({ apiKey: 'test-key' });
      const response = adapter.translateFromProvider({ content: '{"vision":"test"}' });

      expect(response).toBe('{"vision":"test"}');
    });

    it('reports configuration status', () => {
      const configured = new HttpAdapter({ apiKey: 'test-key' });
      const unconfigured = new HttpAdapter({});

      expect(configured.isConfigured()).toBe(true);
      expect(unconfigured.isConfigured()).toBe(false);
    });

    it('has correct provider name', () => {
      const adapter = new HttpAdapter({ apiKey: 'test-key' });
      expect(adapter.provider).toBe('openai');
    });
  });

  describe('ChatAdapter', () => {
    it('translates PromptPackage to ProviderRequest', () => {
      const chat = async (prompt: string) => 'response';
      const adapter = new ChatAdapter(chat);
      const request = adapter.translateToProvider(promptPackage);

      expect(request.model).toBe('generic');
      expect(request.messages).toHaveLength(2);
      expect(request.messages[0].role).toBe('system');
      expect(request.messages[1].role).toBe('user');
    });

    it('calls chat function with combined prompt', async () => {
      let capturedPrompt = '';
      const chat = async (prompt: string) => {
        capturedPrompt = prompt;
        return '{"vision":"test"}';
      };
      const adapter = new ChatAdapter(chat);
      await adapter.callProvider(adapter.translateToProvider(promptPackage));

      expect(capturedPrompt).toContain('Experience Architect');
      expect(capturedPrompt).toContain('Build a web application');
    });

    it('always reports as configured', () => {
      const adapter = new ChatAdapter(async () => '');
      expect(adapter.isConfigured()).toBe(true);
    });

    it('has correct provider name', () => {
      const adapter = new ChatAdapter(async () => '');
      expect(adapter.provider).toBe('generic');
    });
  });

  describe('RuleBasedAdapter', () => {
    it('produces valid architecture from requirements', async () => {
      const adapter = new RuleBasedAdapter();
      const result = await adapter.reason(input);

      expect(result.architecture.vision).toBeTruthy();
      expect(result.architecture.mission).toBeTruthy();
      expect(result.architecture.audience.demographics).toBeTruthy();
      expect(result.architecture.experienceGoals.length).toBeGreaterThan(0);
    });

    it('always reports as configured', () => {
      const adapter = new RuleBasedAdapter();
      expect(adapter.name).toBe('rule-based');
    });

    it('has correct name', () => {
      const adapter = new RuleBasedAdapter();
      expect(adapter.name).toBe('rule-based');
    });
  });

  describe('Adapters are interchangeable', () => {
    it('all adapters implement ReasoningAdapter interface', () => {
      const httpAdapter = new HttpAdapter({ apiKey: 'test' });
      const chatAdapter = new ChatAdapter(async () => '');

      const adapters = [httpAdapter, chatAdapter];

      for (const adapter of adapters) {
        expect(adapter.name).toBeTruthy();
        expect(adapter.provider).toBeTruthy();
        expect(typeof adapter.isConfigured).toBe('function');
        expect(typeof adapter.translateToProvider).toBe('function');
        expect(typeof adapter.translateFromProvider).toBe('function');
      }
    });

    it('all adapters translate PromptPackage to ProviderRequest', () => {
      const httpAdapter = new HttpAdapter({ apiKey: 'test' });
      const chatAdapter = new ChatAdapter(async () => '');

      const adapters = [httpAdapter, chatAdapter];

      for (const adapter of adapters) {
        const request = adapter.translateToProvider(promptPackage);
        expect(request.model).toBeTruthy();
        expect(request.messages).toBeDefined();
        expect(Array.isArray(request.messages)).toBe(true);
      }
    });

    it('all adapters translate ProviderResponse to string', () => {
      const httpAdapter = new HttpAdapter({ apiKey: 'test' });
      const chatAdapter = new ChatAdapter(async () => '');

      const adapters = [httpAdapter, chatAdapter];

      for (const adapter of adapters) {
        const raw = adapter.translateFromProvider({ content: '{"vision":"test"}' });
        expect(typeof raw).toBe('string');
        expect(raw).toBe('{"vision":"test"}');
      }
    });
  });

  describe('ChatReasoningProvider integration', () => {
    it('combines adapter and strategy to produce ReasoningResult', async () => {
      const chat = async (prompt: string) => JSON.stringify({
        vision: 'Test vision',
        mission: 'Test mission',
        audience: { demographics: 'Test', psychographics: 'Test', scenario: 'Test' },
        experienceGoals: ['Goal 1'],
        emotionalJourney: { states: ['State 1'], transitions: [] },
        narrative: { hook: '', arc: '', pacing: '', resolution: '' },
        interactionModel: { inputs: [], feedback: [], stateTransitions: [], flow: '' },
        motionSystem: { principles: [], microInteractions: [], transitions: [], ambientMotion: [] },
        visualLanguage: { color: '', typography: '', space: '', shape: '', light: '' },
        successMetrics: [],
      });

      const adapter = new ChatAdapter(chat);
      const provider = new ChatReasoningProvider(adapter, strategy);
      const result = await provider.reason(input);

      expect(result.architecture.vision).toBe('Test vision');
      expect(result.architecture.mission).toBe('Test mission');
    });

    it('throws on invalid JSON response', async () => {
      const chat = async (prompt: string) => 'not json';
      const adapter = new ChatAdapter(chat);
      const provider = new ChatReasoningProvider(adapter, strategy);

      await expect(provider.reason(input)).rejects.toThrow('Failed to parse provider response');
    });
  });
});
