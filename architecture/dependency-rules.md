# Dependency Rules

**Last Updated:** 2026-08-05  
**Status:** FROZEN (ADR-001)

## Overview

Strict dependency rules ensure the governance framework remains provider-agnostic and the reasoning boundary stays clean.

## Import Rules

### Framework (`src/reasoning.ts`)

**Can import from:**
- `src/components/` (for type definitions)
- `src/runtime/` (for runtime types)

**Cannot import from:**
- `src/adapters/`
- `src/strategies/`

### Strategies (`src/strategies/`)

**Can import from:**
- `src/reasoning.ts` (for types)

**Cannot import from:**
- `src/adapters/`
- `src/runtime/`
- `src/components/`

### Adapters (`src/adapters/`)

**Can import from:**
- `src/reasoning.ts` (for types)
- `src/strategies/` (for registry integration)

**Cannot import from:**
- `src/runtime/`
- `src/components/`

### Governance (`src/runtime/`, `src/components/`)

**Can import from:**
- Each other

**Cannot import from:**
- `src/adapters/`
- `src/strategies/`
- `src/reasoning.ts`

## Provider Symbol Rules

### Allowed Locations

| Symbol | Location |
|--------|----------|
| `OPENAI_API_KEY` | `src/adapters/` only |
| `ANTHROPIC_API_KEY` | `src/adapters/` only |
| API URLs | `src/adapters/` only |
| SDK imports | `src/adapters/` only |

### Forbidden Locations

| Symbol | Location |
|--------|----------|
| `OPENAI_API_KEY` | `src/reasoning.ts` |
| `OPENAI_API_KEY` | `src/strategies/` |
| `OPENAI_API_KEY` | `src/runtime/` |
| `OPENAI_API_KEY` | `src/components/` |
| API URLs | `src/reasoning.ts` |
| SDK imports | `src/strategies/` |

## Prompt Rules

### Allowed Locations

| Content | Location |
|---------|----------|
| System instructions | `src/strategies/` |
| Prompt templates | `src/strategies/` |
| Response parsing | `src/strategies/` |

### Forbidden Locations

| Content | Location |
|---------|----------|
| System instructions | `src/adapters/` |
| System instructions | `src/reasoning.ts` |
| System instructions | `src/runtime/` |
| System instructions | `src/components/` |

## Dependency Audit

### Production Dependencies

```json
{
  "ai-governor": "file:../ai-governor"
}
```

**No provider SDKs allowed.**

### Dev Dependencies

```json
{
  "@types/node": "^22.0.0",
  "tsx": "^4.19.0",
  "typescript": "^5.7.0",
  "vitest": "^4.1.10"
}
```

**No provider SDKs allowed.**

## Violations

| Violation | Severity | Action |
|-----------|----------|--------|
| Adapter imports governance | HIGH | Refactor to import from framework |
| Strategy imports adapter | HIGH | Refactor to remove dependency |
| Provider symbol outside adapters | HIGH | Move to adapter |
| Prompt outside strategies | HIGH | Move to strategy |
| Framework imports adapter | CRITICAL | Refactor immediately |

## Adding New Dependencies

1. Check if dependency is a provider SDK
2. If yes, it MUST go in `src/adapters/` only
3. If no, evaluate if it belongs in framework or adapters
4. Document the dependency in this file
5. Run dependency audit
