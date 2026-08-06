# Architecture Documentation

**Last Updated:** 2026-08-05  
**Status:** FROZEN (ADR-001)

## Four-Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    GOVERNANCE LAYER                         │
│  Constitution Engine │ Runtime Engine │ Policy Engine       │
│  Experience Governor │ Implementation Engine                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 REASONING BOUNDARY                          │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 1: Framework (Semantic Contracts)             │   │
│  │  ReasoningInput │ ReasoningResult │ PromptPackage   │   │
│  │  ReasoningStrategy │ ReasoningProvider              │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 2: Strategies (Prompting)                     │   │
│  │  GeneralStrategy │ CodingStrategy │ ResearchStrategy │   │
│  │  System Instructions │ Prompt Templates │ Parsing    │   │
│  └─────────────────────────────────────────────────────┘   │
│                              │                              │
│                              ▼                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Layer 3: Adapters (Translation)                     │   │
│  │  HttpAdapter │ ChatAdapter │ RuleBasedAdapter        │   │
│  │  Provider Request │ Provider Response │ Streaming    │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    PROVIDER LAYER                           │
│  GPT │ Claude │ Gemini │ Grok │ Ollama │ LM Studio         │
└─────────────────────────────────────────────────────────────┘
```

## Three-Layer Reasoning Boundary

### Layer 1: Framework (`src/reasoning.ts`)

**Owns:** Semantic contracts only

```typescript
interface ReasoningInput {
  requirements: string;
  projectName?: string;
  constraints?: string[];
  references?: string[];
}

interface PromptPackage {
  systemInstructions: string;
  userPrompt: string;
  responseFormat?: string;
  metadata?: Record<string, unknown>;
}

interface ReasoningResult {
  architecture: ExperienceArchitecture;
  rationale: DesignRationale[];
  openQuestions: OpenQuestion[];
}

interface ReasoningStrategy {
  name: string;
  buildPromptPackage(input: ReasoningInput): PromptPackage;
  parseResponse(response: string): ReasoningResult | null;
}

interface ReasoningProvider {
  name: string;
  reason(input: ReasoningInput, strategy: ReasoningStrategy): Promise<ReasoningResult>;
}
```

**Forbidden:** Prompt templates, provider payloads, HTTP endpoints, API keys

### Layer 2: Strategies (`src/strategies/`)

**Owns:** All prompt engineering

- System instructions
- Prompt templates
- Structured reasoning format
- Reflection strategy
- Verification strategy
- Output expectations

**Examples:**
- `GeneralStrategy` — Experience Architect prompts
- `CodingStrategy` — Software architecture prompts
- `ResearchStrategy` — Analysis prompts

**Forbidden:** Provider-specific code, HTTP calls, SDK imports

### Layer 3: Adapters (`src/adapters/`)

**Owns:** Provider translation only

```typescript
interface ReasoningAdapter {
  name: string;
  provider: string;
  
  translateToProvider(promptPackage: PromptPackage): ProviderRequest;
  translateFromProvider(response: ProviderResponse): string;
  
  isConfigured(): boolean;
}
```

**Examples:**
- `HttpAdapter` — HTTP API translation
- `ChatAdapter` — Function call translation
- `RuleBasedAdapter` — Local fallback

**Forbidden:** Prompts, reasoning logic, governance logic

## Import Rules (FROZEN)

```
Framework → No imports from adapters or strategies
Strategies → No imports from adapters
Adapters → No imports from governance (runtime/, components/)
```

## New Law

> Prompting is not Governance.  
> Prompting is not Adapter Logic.  
> Prompting belongs to interchangeable Reasoning Strategies.
