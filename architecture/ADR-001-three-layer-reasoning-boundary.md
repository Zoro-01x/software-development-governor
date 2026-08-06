# ADR-001: Three-Layer Reasoning Boundary

**Status:** FROZEN  
**Date:** 2026-08-05  
**Decision:** OPTION C — Framework owns semantic contracts, Strategy owns prompting, Adapter owns translation

## Context

The governance framework needed a clean separation between:
1. Semantic contracts (what reasoning produces)
2. Prompt engineering (how reasoning is elicited)
3. Provider translation (how different AI models are called)

Previously, adapters contained both prompts and provider-specific logic, violating the principle that prompting is not adapter logic.

## Decision

### Three-Layer Architecture

**Layer 1 — Framework** (`src/reasoning.ts`)
- Owns: `ReasoningInput`, `ReasoningResult`, `PromptPackage`, `ReasoningStrategy`, `ReasoningProvider`
- Contains: Semantic contracts only
- Forbidden: Prompt templates, provider payloads, HTTP endpoints, API keys

**Layer 2 — Strategies** (`src/strategies/`)
- Owns: System instructions, prompt templates, structured reasoning format, reflection strategy, verification strategy, output expectations
- Contains: All prompt engineering
- Forbidden: Provider-specific code, HTTP calls, SDK imports

**Layer 3 — Adapters** (`src/adapters/`)
- Owns: Provider translation (PromptPackage → ProviderRequest → ProviderResponse → ReasoningResult)
- Contains: HTTP clients, SDK wrappers, streaming, tool translation
- Forbidden: Prompts, reasoning logic, governance logic

### Import Rules (FROZEN)

```
Framework → No imports from adapters or strategies
Strategies → No imports from adapters
Adapters → No imports from governance (runtime/, components/)
```

### New Law

> Prompting is not Governance.  
> Prompting is not Adapter Logic.  
> Prompting belongs to interchangeable Reasoning Strategies.

## Consequences

### Positive
- Strategies are interchangeable (General, Coding, Research, Multi-Agent)
- Adapters are interchangeable (HTTP, Chat, RuleBased, any provider)
- Governance is completely unaware of providers and prompts
- Any developer can add a provider by implementing one adapter
- Any developer can add a prompting strategy by implementing one strategy

### Negative
- Three files instead of one for simple use cases
- Additional indirection for prompt engineering

### Neutral
- Existing tests continue to pass
- No runtime behavior changes
- Only reasoning quality may differ between strategies

## Compliance

This ADR is frozen. Future changes to the reasoning boundary require:
1. A new ADR documenting the change
2. Approval from the governance process
3. Updated boundary audit passing all checks

## References

- LOOP 5 Mandate: Six non-negotiable laws
- ONTOLOGY.md §8: Policy Model
- GRA §9: Amendment process
