import { describe, it, expect } from 'vitest';
import { ReasoningInput, ReasoningStrategy, PromptPackage } from '../../src/reasoning.js';
import { GeneralStrategy } from '../../src/strategies/general-strategy.js';
import { ChatAdapter, ChatReasoningProvider } from '../../src/adapters/chat-adapter.js';
import { RuleBasedAdapter } from '../../src/adapters/rule-based-adapter.js';
import { AdapterRegistry } from '../../src/adapters/registry.js';

class CodingStrategy implements ReasoningStrategy {
  readonly name = 'coding';

  buildPromptPackage(input: ReasoningInput): PromptPackage {
    return {
      systemInstructions: 'You are a software architect. Focus on technical implementation.',
      userPrompt: `Design a software system for: ${input.requirements}`,
      responseFormat: 'json',
      metadata: { type: 'coding', projectName: input.projectName },
    };
  }

  parseResponse(response: string): ReturnType<ReasoningStrategy['parseResponse']> {
    try {
      const parsed = JSON.parse(response);
      return {
        architecture: {
          vision: parsed.vision || 'Technical implementation',
          mission: parsed.mission || 'Build the system',
          audience: { demographics: 'Developers', psychographics: 'Technical', scenario: 'Building software' },
          experienceGoals: parsed.goals || ['Working software'],
          emotionalJourney: { states: ['Understanding', 'Building'], transitions: [] },
          narrative: { hook: '', arc: '', pacing: '', resolution: '' },
          interactionModel: { inputs: [], feedback: [], stateTransitions: [], flow: '' },
          motionSystem: { principles: [], microInteractions: [], transitions: [], ambientMotion: [] },
          visualLanguage: { color: '', typography: '', space: '', shape: '', light: '' },
          successMetrics: [],
        },
        rationale: [],
        openQuestions: [],
      };
    } catch {
      return null;
    }
  }
}

class ResearchStrategy implements ReasoningStrategy {
  readonly name = 'research';

  buildPromptPackage(input: ReasoningInput): PromptPackage {
    return {
      systemInstructions: 'You are a research analyst. Focus on evidence and data.',
      userPrompt: `Research and analyze: ${input.requirements}`,
      responseFormat: 'json',
      metadata: { type: 'research', projectName: input.projectName },
    };
  }

  parseResponse(response: string): ReturnType<ReasoningStrategy['parseResponse']> {
    try {
      const parsed = JSON.parse(response);
      return {
        architecture: {
          vision: parsed.vision || 'Research findings',
          mission: parsed.mission || 'Analyze the domain',
          audience: { demographics: 'Analysts', psychographics: 'Data-driven', scenario: 'Research' },
          experienceGoals: parsed.goals || ['Informed decisions'],
          emotionalJourney: { states: ['Curiosity', 'Understanding'], transitions: [] },
          narrative: { hook: '', arc: '', pacing: '', resolution: '' },
          interactionModel: { inputs: [], feedback: [], stateTransitions: [], flow: '' },
          motionSystem: { principles: [], microInteractions: [], transitions: [], ambientMotion: [] },
          visualLanguage: { color: '', typography: '', space: '', shape: '', light: '' },
          successMetrics: [],
        },
        rationale: [],
        openQuestions: [],
      };
    } catch {
      return null;
    }
  }
}

describe('Strategy Substitution', () => {
  const input: ReasoningInput = {
    requirements: 'Build a web application for task management',
    projectName: 'TaskApp',
  };

  it('GeneralStrategy produces valid PromptPackage', () => {
    const strategy = new GeneralStrategy();
    const pkg = strategy.buildPromptPackage(input);

    expect(pkg.systemInstructions).toContain('Experience Architect');
    expect(pkg.userPrompt).toContain('Build a web application');
    expect(pkg.userPrompt).toContain('TaskApp');
    expect(pkg.responseFormat).toBe('json');
  });

  it('CodingStrategy produces different PromptPackage', () => {
    const strategy = new CodingStrategy();
    const pkg = strategy.buildPromptPackage(input);

    expect(pkg.systemInstructions).toContain('software architect');
    expect(pkg.userPrompt).toContain('Build a web application');
    expect(pkg.metadata?.type).toBe('coding');
  });

  it('ResearchStrategy produces different PromptPackage', () => {
    const strategy = new ResearchStrategy();
    const pkg = strategy.buildPromptPackage(input);

    expect(pkg.systemInstructions).toContain('research analyst');
    expect(pkg.userPrompt).toContain('Research and analyze');
    expect(pkg.metadata?.type).toBe('research');
  });

  it('Strategies are interchangeable - all produce valid PromptPackages', () => {
    const strategies: ReasoningStrategy[] = [
      new GeneralStrategy(),
      new CodingStrategy(),
      new ResearchStrategy(),
    ];

    for (const strategy of strategies) {
      const pkg = strategy.buildPromptPackage(input);
      expect(pkg.systemInstructions).toBeTruthy();
      expect(pkg.userPrompt).toBeTruthy();
      expect(pkg.responseFormat).toBe('json');
    }
  });

  it('Same strategy produces identical PromptPackages for same input', () => {
    const strategy = new GeneralStrategy();
    const pkg1 = strategy.buildPromptPackage(input);
    const pkg2 = strategy.buildPromptPackage(input);

    expect(pkg1.systemInstructions).toBe(pkg2.systemInstructions);
    expect(pkg1.userPrompt).toBe(pkg2.userPrompt);
    expect(pkg1.responseFormat).toBe(pkg2.responseFormat);
  });

  it('GeneralStrategy parses valid JSON response', () => {
    const strategy = new GeneralStrategy();
    const response = JSON.stringify({
      vision: 'A task management app',
      mission: 'Help users manage tasks',
      audience: { demographics: 'Professionals', psychographics: 'Productive', scenario: 'Work' },
      experienceGoals: ['Efficient task management'],
      emotionalJourney: { states: ['Curious', 'Productive'], transitions: [] },
      narrative: { hook: 'Get organized', arc: 'Learn', pacing: 'Quick', resolution: 'Success' },
      interactionModel: { inputs: ['Click'], feedback: ['Visual'], stateTransitions: [], flow: 'Linear' },
      motionSystem: { principles: ['Smooth'], microInteractions: [], transitions: [], ambientMotion: [] },
      visualLanguage: { color: 'Blue', typography: 'Clean', space: 'Open', shape: 'Rounded', light: 'Bright' },
      successMetrics: [{ metric: 'Completion', target: '90%', observable: true, verifiable: true, actionable: true }],
    });

    const result = strategy.parseResponse(response);
    expect(result).not.toBeNull();
    expect(result?.architecture.vision).toBe('A task management app');
  });

  it('CodingStrategy parses valid JSON response', () => {
    const strategy = new CodingStrategy();
    const response = JSON.stringify({
      vision: 'Technical system',
      mission: 'Build software',
      goals: ['Working code'],
    });

    const result = strategy.parseResponse(response);
    expect(result).not.toBeNull();
    expect(result?.architecture.vision).toBe('Technical system');
  });

  it('GeneralStrategy returns null for invalid JSON', () => {
    const strategy = new GeneralStrategy();
    expect(strategy.parseResponse('not json')).toBeNull();
  });

  it('CodingStrategy returns null for invalid JSON', () => {
    const strategy = new CodingStrategy();
    expect(strategy.parseResponse('not json')).toBeNull();
  });
});
