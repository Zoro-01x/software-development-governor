# Governance Framework

A provider-agnostic governance framework for AI-powered software development. Build, verify, and deploy AI systems with confidence — one kernel, any model, full audit trail.

**v1.0.0** | [Quick Start](docs/quick-start.md) | [API Reference](docs/api-reference.md) | [Architecture](docs/architecture-guide.md)

---

## What Is This?

The Governance Framework separates AI reasoning from governance logic. Your kernel stays the same; swap providers by changing one import. Every interaction is auditable, every gate is enforced, every decision is traceable.

```
┌─────────────────────────────────────────────────┐
│              Governance Kernel                   │
│                                                  │
│  Memory → Knowledge → Planning → Verification   │
│  → Tool Execution → Workflows → Multi-Agent     │
│  → Scheduling → Observability                   │
│                                                  │
│  6 Laws (frozen) • 3 ADRs (frozen)              │
│  144 module tests • 99.86% pass rate            │
└──────────────────────┬──────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  OpenAI  │ │Anthropic │ │  Gemini  │
    │ Adapter  │ │ Adapter  │ │ Adapter  │
    └──────────┘ └──────────┘ └──────────┘
          ▼            ▼            ▼
    ┌──────────┐ ┌──────────┐ ┌──────────┐
    │  Groq    │ │  Ollama  │ │OpenRouter│
    │ Adapter  │ │ Adapter  │ │ Adapter  │
    └──────────┘ └──────────┘ └──────────┘
```

---

## Features

- **Provider-agnostic** — 7 adapters (OpenAI, Anthropic, Gemini, Groq, Ollama, LM Studio, OpenRouter) + custom local
- **6 memory backends** — File, SQLite, PostgreSQL, Redis + in-memory
- **9 kernel modules** — Memory, Knowledge, Planning, Verification, Tool Execution, Workflows, Multi-Agent, Scheduling, Observability
- **OpenCode integration** — drop-in plugin for lifecycle governance
- **Frozen architecture** — 6 laws, 3 ADRs, immutable kernel, extension model
- **733 tests passing** — unit, integration, stress, golden, performance
- **Full audit trail** — every decision logged, every artifact traced

---

## Install

```bash
# Core (required)
npm install @framework/core

# Pick one or more adapters
npm install @framework/adapter-openai openai
npm install @framework/adapter-anthropic @anthropic-ai/sdk
npm install @framework/adapter-gemini @google/generative-ai
npm install @framework/adapter-groq groq-sdk
npm install @framework/adapter-ollama
npm install @framework/adapter-lmstudio
npm install @framework/adapter-openrouter

# Pick a memory backend
npm install @framework/memory-file
npm install @framework/memory-sqlite better-sqlite3
npm install @framework/memory-postgres pg
npm install @framework/memory-redis ioredis
```

---

## Quick Start

```typescript
import { OpenAIAdapter } from '@framework/adapter-openai'

const provider = new OpenAIAdapter({ model: 'gpt-4o' })
await provider.initialize()

const result = await provider.reason({
  requirements: 'Design a user authentication system',
})

console.log(result.reasoning)
```

See [docs/quick-start.md](docs/quick-start.md) for the full walkthrough.

---

## Packages

| Package | Version | Description |
|---|---|---|
| `@framework/core` | 1.0.0 | Core interfaces and types |
| `@framework/adapter-openai` | 1.0.0 | OpenAI adapter |
| `@framework/adapter-anthropic` | 1.0.0 | Anthropic adapter |
| `@framework/adapter-gemini` | 1.0.0 | Google Gemini adapter |
| `@framework/adapter-groq` | 1.0.0 | Groq adapter |
| `@framework/adapter-ollama` | 1.0.0 | Ollama local adapter |
| `@framework/adapter-lmstudio` | 1.0.0 | LM Studio local adapter |
| `@framework/adapter-openrouter` | 1.0.0 | OpenRouter gateway adapter |
| `@framework/memory-file` | 1.0.0 | File-based memory |
| `@framework/memory-sqlite` | 1.0.0 | SQLite memory |
| `@framework/memory-postgres` | 1.0.0 | PostgreSQL memory |
| `@framework/memory-redis` | 1.0.0 | Redis memory |
| `@framework/bridge-opencode` | 1.0.0 | OpenCode ↔ Kernel bridge |

---

## Architecture

### 6 Laws (Frozen)

| # | Law | Meaning |
|---|---|---|
| 1 | Governance owns workflow | The kernel controls the lifecycle, not the provider |
| 2 | No runtime provider dependencies | Providers are injected, never imported at runtime |
| 3 | Repo compiles without adapters | Core builds independently of any adapter |
| 4 | Same interface for all providers | Every adapter implements `ReasoningProvider` |
| 5 | Clone + adapter = any model | Swap providers without changing kernel code |
| 6 | All model interactions through ports | No direct provider calls — always through interfaces |

### 3 ADRs (Frozen)

- **ADR-001**: Three-Layer Reasoning Boundary — separates creative, governance, and execution
- **ADR-002**: Extension Model — adapters and memory backends are hot-swappable
- **ADR-003**: Immutable Kernel — the 9 core modules cannot be modified, only extended

See [docs/architecture-guide.md](docs/architecture-guide.md) for the full architecture.

---

## Development

```bash
# Clone
git clone https://github.com/Zoro-01x/software-development-governor.git
cd governance-framework

# Install
npm install

# Test (733 tests)
npm test

# Type check
npx tsc --noEmit
```

---

## Examples

| Example | Provider | File |
|---|---|---|
| Quick start | OpenAI | [examples/minimal/](examples/minimal/) |
| OpenAI | OpenAI | [examples/integrations/openai.ts](examples/integrations/openai.ts) |
| Anthropic | Anthropic | [examples/integrations/anthropic.ts](examples/integrations/anthropic.ts) |
| Gemini | Google | [examples/integrations/gemini.ts](examples/integrations/gemini.ts) |
| Groq | Groq | [examples/integrations/groq.ts](examples/integrations/groq.ts) |
| Ollama | Local | [examples/integrations/ollama.ts](examples/integrations/ollama.ts) |
| LM Studio | Local | [examples/integrations/lmstudio.ts](examples/integrations/lmstudio.ts) |
| OpenRouter | Gateway | [examples/integrations/openrouter.ts](examples/integrations/openrouter.ts) |
| Custom local | DIY | [examples/integrations/custom-local.ts](examples/integrations/custom-local.ts) |

---

## OpenCode Integration

Drop the plugin into your OpenCode plugins directory:

```bash
cp packages/bridge-opencode/opencode-plugin.js ~/.config/opencode/plugins/governance.js
```

See [docs/opencode-integration.md](docs/opencode-integration.md) for configuration and customization.

---

## Documentation

- [Quick Start](docs/quick-start.md) — get running in 5 minutes
- [API Reference](docs/api-reference.md) — frozen v1.0.0 public API
- [Architecture Guide](docs/architecture-guide.md) — system design and principles
- [Adapter Tutorial](docs/adapter-tutorial.md) — build your own adapter
- [Module Tutorial](docs/module-tutorial.md) — extend the kernel modules
- [Extension Tutorial](docs/extension-tutorial.md) — the extension model
- [Migration Guide](docs/migration-guide.md) — upgrade from earlier versions
- [Examples](docs/examples.md) — all integration examples
- [OpenCode Integration](docs/opencode-integration.md) — plugin installation and config
- [CHANGELOG](CHANGELOG.md) — version history
- [ROADMAP](ROADMAP.md) — future plans

---

## License

MIT

---

*Frozen: 2026-08-05. This is Governance Framework v1.0.0.*
