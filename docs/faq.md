# Frequently Asked Questions

## General

### What is the Governance Framework?

A provider-agnostic framework for building AI systems with governance. It separates AI reasoning (providers) from governance logic (kernel), so you can swap models without changing your system.

### Who is it for?

- Teams building AI-powered applications that need audit trails
- Developers who want to switch between LLM providers without rewriting code
- Organizations requiring governance and compliance in AI workflows
- Anyone building multi-agent AI systems

### Is it production-ready?

Yes. v1.0.0 has 733 passing tests, frozen architecture laws, and a full audit trail. The 6 laws and 3 ADRs are immutable — the kernel will not change in breaking ways.

---

## Providers

### Can I use my own LLM?

Yes. Implement the `ReasoningProvider` interface:

```typescript
interface ReasoningProvider {
  name: string;
  reason(input: ReasoningInput): Promise<ReasoningResult>;
}
```

See [examples/integrations/custom-local.ts](../examples/integrations/custom-local.ts) for a working example.

### Does it work with local models?

Yes. Three adapters support local models:
- **Ollama** — connects to Ollama's HTTP API
- **LM Studio** — connects to LM Studio's OpenAI-compatible API
- **Custom** — implement `ReasoningProvider` for any HTTP endpoint

### Do I need an API key?

Only for cloud providers (OpenAI, Anthropic, Gemini, Groq, OpenRouter). Ollama and LM Studio run entirely locally.

---

## Memory

### Which memory backend should I use?

| Backend | Best for | Trade-off |
|---|---|---|
| File | Development, small projects | No concurrent access |
| SQLite | Single-server production | No network access |
| PostgreSQL | Multi-server production | Requires running PG |
| Redis | High-throughput, ephemeral data | Data may expire |

### Can I switch memory backends?

Yes. All backends implement the same `MemoryStore` interface. Change the import, keep the same code:

```typescript
// Development
import { createFileMemoryStore } from '@framework/memory-file'
const store = createFileMemoryStore()

// Production
import { createPostgresMemoryStore } from '@framework/memory-postgres'
const store = createPostgresMemoryStore({ host: 'db.example.com' })
```

---

## Architecture

### What are the 6 laws?

1. Governance owns workflow — the kernel controls the lifecycle
2. No runtime provider dependencies — providers are injected
3. Repo compiles without adapters — core builds independently
4. Same interface for all providers — every adapter implements `ReasoningProvider`
5. Clone + adapter = any model — swap providers without changing code
6. All model interactions through ports — no direct provider calls

### What are ADRs?

Architecture Decision Records. Three are frozen:
- **ADR-001**: Three-Layer Reasoning Boundary
- **ADR-002**: Extension Model
- **ADR-003**: Immutable Kernel

### Can I modify the kernel?

The 9 core modules are immutable by design (ADR-003). You extend the kernel through adapters and memory backends, not by modifying the kernel itself.

---

## OpenCode

### How do I install the OpenCode plugin?

```bash
cp packages/bridge-opencode/opencode-plugin.js ~/.config/opencode/plugins/governance.js
```

### What does the plugin do?

It translates OpenCode lifecycle events (tool calls, permissions, messages) into Governance Kernel events. The kernel processes them; the bridge applies decisions back to OpenCode.

### Is the plugin required?

No. The framework works without OpenCode. OpenCode works without the framework. They're connected by the bridge, which is replaceable.

---

## Troubleshooting

### `npm test` shows 1 failure

There is one pre-existing test failure in `tests/runtime/default-graph.test.ts`. This is a known issue in the test fixture, not in the framework. It does not affect functionality.

### TypeScript compilation errors

Pre-existing errors exist in `src/bootstrap.ts`, `src/components/verifier.ts`, `src/human-evaluation.ts`, and `tests/fixtures/samples.ts`. These are legacy files that do not affect the published packages. All 13 published packages compile cleanly.

### `file:../core` dependency error

The monorepo uses `file:` protocol dependencies between packages. This works for local development. For published packages, these resolve to the npm registry versions.
