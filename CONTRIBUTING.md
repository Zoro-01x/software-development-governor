# Contributing to Governance Framework

Thank you for your interest in contributing to the Governance Framework. This document explains how to contribute while respecting the frozen architecture.

## Frozen Architecture

The Governance Framework v1.0 is frozen. The following components cannot be modified:

- **Kernel** (`src/kernel/`) — Immutable orchestration
- **Constitution** (`src/constitution/`) — Governance rules
- **Runtime** (`src/runtime/`) — Decision engine
- **ADRs** (`architecture/ADR-*.md`) — Architecture decisions
- **Modules** (`src/modules/`) — All 9 modules (Memory, Knowledge, Planning, Verification, Tool Execution, Workflows, Multi-Agent, Scheduling, Observability)

## What You Can Contribute

### Extensions

- **Adapters** — New provider implementations
- **Memory Backends** — New storage implementations
- **Modules** — New capabilities
- **Strategies** — New reasoning strategies

### Documentation

- API references
- Tutorials
- Examples
- Guides

### Bug Fixes

- Fix bugs in frozen code without changing behavior
- Add tests for edge cases
- Improve error messages

### Performance

- Optimize algorithms
- Reduce memory usage
- Improve throughput

## Development Setup

```bash
# Clone the repository
git clone https://github.com/your-org/governance-framework.git

# Install dependencies
npm install

# Run tests
npm test

# Run validation
npx vitest run tests/validation/
```

## Creating an Adapter

1. Create a new package: `@framework/adapter-<provider>`
2. Implement the `ReasoningProvider` interface
3. Export a factory function
4. Add tests
5. Submit a PR

Example:

```typescript
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export class MyAdapter implements ReasoningProvider {
  name = 'my-adapter';
  
  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    // Implementation
  }
}

export function createMyAdapter(): MyAdapter {
  return new MyAdapter();
}
```

## Creating a Module

1. Create a new package: `@framework/module-<name>`
2. Define the module contract (types.ts)
3. Implement the in-memory store (in-memory.ts)
4. Export a factory function
5. Add tests
6. Submit a PR

## Pull Request Requirements

All PRs must:

1. Pass all tests
2. Pass architecture conformance checks
3. Not violate frozen laws
4. Include tests for new functionality
5. Update documentation

## Architecture Conformance

The CI pipeline checks:

- No framework imports from adapters
- No deprecated files
- TypeScript compilation
- No secrets in code
- Governance tests pass

## Questions?

Open an issue or start a discussion.
