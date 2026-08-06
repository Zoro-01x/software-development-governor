# Release Notes

## Governance Framework v1.0.0

**Release Date:** 2026-08-05  
**Status:** Stable  
**LTS:** Yes

---

## Overview

The Governance Framework v1.0.0 is the first stable release of the AI governance system. This release includes:

- Complete kernel with immutable orchestration
- Constitution with 90 governance rules
- Runtime with policy engine
- 9 modules (Memory, Knowledge, Planning, Verification, Tool Execution, Workflows, Multi-Agent, Scheduling, Observability)
- 7 provider adapters (OpenAI, Anthropic, Gemini, Groq, Ollama, LM Studio, OpenRouter)
- 4 memory backends (File, SQLite, Postgres, Redis)
- Comprehensive documentation
- 737 tests passing

---

## What's New

### Core Framework

The kernel provides immutable orchestration with the following capabilities:

- `start()` - Start the framework
- `stop()` - Stop the framework
- `register()` - Register extensions
- `resolve()` - Resolve dependencies
- `emit()` - Emit events
- `subscribe()` - Subscribe to events
- `context()` - Get context

The constitution defines 90 governance rules that are enforced automatically.

The runtime executes decisions using a policy engine and graph validator.

### Modules

All 9 modules are now stable:

1. **Memory** - Store and retrieve data
2. **Knowledge** - Store facts and relations
3. **Planning** - Create and manage plans
4. **Verification** - Verify assertions
5. **Tool Execution** - Execute external tools
6. **Workflows** - Manage workflows
7. **Multi-Agent** - Coordinate agents
8. **Scheduling** - Schedule jobs
9. **Observability** - Log, trace, and measure

### Adapters

7 provider adapters are now available:

1. **OpenAI** - GPT-4, GPT-3.5, etc.
2. **Anthropic** - Claude 3.5, Claude 3, etc.
3. **Gemini** - Gemini Pro, Gemini Ultra, etc.
4. **Groq** - Llama 2, Mixtral, etc.
5. **Ollama** - Local models
6. **LM Studio** - Local models
7. **OpenRouter** - Multiple providers

### Memory Backends

4 memory backends are now available:

1. **File** - File-based storage
2. **SQLite** - SQLite database
3. **Postgres** - PostgreSQL database
4. **Redis** - Redis cache

---

## Getting Started

### Installation

```bash
npm install @framework/core
```

### Quick Start

```typescript
import { createInMemoryStore } from '@framework/core';

const memory = createInMemoryStore();
await memory.open();

await memory.put('key', 'value');
const value = await memory.get('key');

await memory.close();
```

### Using an Adapter

```bash
npm install @framework/adapter-openai
```

```typescript
import { createOpenAIAdapter } from '@framework/adapter-openai';

const adapter = createOpenAIAdapter({
  apiKey: process.env.OPENAI_API_KEY,
});

const result = await adapter.reason({
  requirements: 'Build a portfolio website',
});
```

---

## Documentation

- [Quick Start](./docs/quick-start.md)
- [Adapter Tutorial](./docs/adapter-tutorial.md)
- [Module Tutorial](./docs/module-tutorial.md)
- [Extension Tutorial](./docs/extension-tutorial.md)
- [Architecture Guide](./docs/architecture-guide.md)
- [Migration Guide](./docs/migration-guide.md)
- [API Reference](./docs/api-reference.md)
- [Examples](./docs/examples.md)

---

## Testing

The framework includes 737 tests covering:

- Unit tests
- Integration tests
- Architecture conformance
- Governance rules
- Performance benchmarks
- Stress testing
- Golden tests

Run all tests:

```bash
npm test
```

---

## CI/CD

The framework includes a complete CI/CD pipeline:

- Automated testing
- Architecture conformance checks
- Security scanning
- Release automation

See `.github/workflows/ci.yml` for details.

---

## Support

- [Contributing Guide](./CONTRIBUTING.md)
- [Changelog](./CHANGELOG.md)
- [Security Policy](./SECURITY.md)

---

## License

MIT
