# Strategy Authoring Guide

**Last Updated:** 2026-08-05  
**Status:** FROZEN (ADR-001)

## Overview

Strategies own all prompt engineering. They convert `ReasoningInput` into `PromptPackage` and parse provider responses into `ReasoningResult`. They contain NO provider-specific code.

## Creating a Strategy

### 1. Implement `ReasoningStrategy` Interface

```typescript
import { ReasoningInput, PromptPackage, ReasoningStrategy, ReasoningResult } from '../reasoning.js';

export class MyStrategy implements ReasoningStrategy {
  readonly name = 'my-strategy';

  buildPromptPackage(input: ReasoningInput): PromptPackage {
    return {
      systemInstructions: 'You are an expert in...',
      userPrompt: `Analyze: ${input.requirements}`,
      responseFormat: 'json',
      metadata: {
        projectName: input.projectName,
        strategyVersion: '1.0',
      },
    };
  }

  parseResponse(response: string): ReasoningResult | null {
    try {
      const parsed = JSON.parse(response);
      return {
        architecture: {
          vision: parsed.vision || '',
          mission: parsed.mission || '',
          audience: {
            demographics: parsed.audience?.demographics || '',
            psychographics: parsed.audience?.psychographics || '',
            scenario: parsed.audience?.scenario || '',
          },
          experienceGoals: parsed.experienceGoals || [],
          emotionalJourney: {
            states: parsed.emotionalJourney?.states || [],
            transitions: parsed.emotionalJourney?.transitions || [],
          },
          narrative: {
            hook: parsed.narrative?.hook || '',
            arc: parsed.narrative?.arc || '',
            pacing: parsed.narrative?.pacing || '',
            resolution: parsed.narrative?.resolution || '',
          },
          interactionModel: {
            inputs: parsed.interactionModel?.inputs || [],
            feedback: parsed.interactionModel?.feedback || [],
            stateTransitions: parsed.interactionModel?.stateTransitions || [],
            flow: parsed.interactionModel?.flow || '',
          },
          motionSystem: {
            principles: parsed.motionSystem?.principles || [],
            microInteractions: parsed.motionSystem?.microInteractions || [],
            transitions: parsed.motionSystem?.transitions || [],
            ambientMotion: parsed.motionSystem?.ambientMotion || [],
          },
          visualLanguage: {
            color: parsed.visualLanguage?.color || '',
            typography: parsed.visualLanguage?.typography || '',
            space: parsed.visualLanguage?.space || '',
            shape: parsed.visualLanguage?.shape || '',
            light: parsed.visualLanguage?.light || '',
          },
          successMetrics: parsed.successMetrics || [],
        },
        rationale: parsed.rationale || [],
        openQuestions: parsed.openQuestions || [],
      };
    } catch {
      return null;
    }
  }
}
```

### 2. Register the Strategy

```typescript
import { AdapterRegistry } from '../adapters/registry.js';
import { MyStrategy } from './my-strategy.js';

const registry = new AdapterRegistry();
const strategy = new MyStrategy();
registry.registerStrategy(strategy);
```

### 3. Use with Any Adapter

```typescript
const provider = registry.createProvider('http-adapter', 'my-strategy');
const result = await provider.reason({
  requirements: 'Build a web app',
  projectName: 'MyApp',
});
```

## Rules

### DO
- Define system instructions
- Create prompt templates
- Parse provider responses into `ReasoningResult`
- Handle JSON parsing errors gracefully
- Return `null` for invalid responses

### DO NOT
- Import from `src/adapters/`
- Make HTTP calls
- Access provider credentials
- Include provider-specific logic
- Access governance state

## Example: Coding Strategy

```typescript
export class CodingStrategy implements ReasoningStrategy {
  readonly name = 'coding';

  buildPromptPackage(input: ReasoningInput): PromptPackage {
    return {
      systemInstructions: `You are a senior software architect. 
Focus on:
- Technical feasibility
- Scalability
- Maintainability
- Performance
- Security

Produce a technical architecture with:
- System components
- Data flow
- API design
- Database schema
- Deployment strategy`,
      userPrompt: `Design a software system for: ${input.requirements}

Project: ${input.projectName || 'Unnamed'}

Constraints:
${input.constraints?.join('\n') || 'None specified'}

References:
${input.references?.join('\n') || 'None specified'}`,
      responseFormat: 'json',
      metadata: {
        type: 'coding',
        projectName: input.projectName,
      },
    };
  }

  parseResponse(response: string): ReasoningResult | null {
    // Parse response...
  }
}
```

## Strategy Composition

Strategies can be composed for different use cases:

```typescript
// Base strategy with common logic
abstract class BaseStrategy implements ReasoningStrategy {
  abstract name: string;
  
  buildPromptPackage(input: ReasoningInput): PromptPackage {
    const baseInstructions = this.getBaseInstructions();
    const specificInstructions = this.getSpecificInstructions();
    
    return {
      systemInstructions: `${baseInstructions}\n\n${specificInstructions}`,
      userPrompt: this.formatUserPrompt(input),
      responseFormat: 'json',
    };
  }
  
  protected abstract getBaseInstructions(): string;
  protected abstract getSpecificInstructions(): string;
  protected abstract formatUserPrompt(input: ReasoningInput): string;
}

// Concrete strategies
class GeneralStrategy extends BaseStrategy {
  readonly name = 'general';
  // ...
}

class CodingStrategy extends BaseStrategy {
  readonly name = 'coding';
  // ...
}
```

## Testing

```typescript
import { describe, it, expect } from 'vitest';
import { MyStrategy } from './my-strategy.js';

describe('MyStrategy', () => {
  it('builds valid PromptPackage', () => {
    const strategy = new MyStrategy();
    const input = {
      requirements: 'Build a web app',
      projectName: 'MyApp',
    };

    const pkg = strategy.buildPromptPackage(input);

    expect(pkg.systemInstructions).toBeTruthy();
    expect(pkg.userPrompt).toContain('Build a web app');
    expect(pkg.responseFormat).toBe('json');
  });

  it('parses valid JSON response', () => {
    const strategy = new MyStrategy();
    const response = JSON.stringify({
      vision: 'Test vision',
      mission: 'Test mission',
      // ...
    });

    const result = strategy.parseResponse(response);

    expect(result).not.toBeNull();
    expect(result?.architecture.vision).toBe('Test vision');
  });

  it('returns null for invalid JSON', () => {
    const strategy = new MyStrategy();
    expect(strategy.parseResponse('not json')).toBeNull();
  });
});
```
