# Changelog

All notable changes to the Governance Framework will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-08-05

### Added

- **Core Framework**
  - Kernel with immutable orchestration
  - Constitution with 90 governance rules
  - Runtime with policy engine
  - Audit trail for all operations

- **Modules**
  - Memory module for data storage
  - Knowledge module for facts and relations
  - Planning module for task management
  - Verification module for assertions
  - Tool Execution module for external tools
  - Workflows module for process management
  - Multi-Agent module for agent coordination
  - Scheduling module for job scheduling
  - Observability module for logging, metrics, and tracing

- **Adapters**
  - OpenAI adapter
  - Anthropic adapter
  - Gemini adapter
  - Groq adapter
  - Ollama adapter
  - LM Studio adapter
  - OpenRouter adapter

- **Memory Backends**
  - File-based memory backend
  - SQLite memory backend
  - Postgres memory backend
  - Redis memory backend

- **Documentation**
  - Quick Start guide
  - Adapter Tutorial
  - Module Tutorial
  - Extension Tutorial
  - Architecture Guide
  - Migration Guide
  - API Reference
  - Examples

- **Testing**
  - 737 tests passing
  - Architecture audit
  - Governance audit
  - Dependency audit
  - Compatibility audit
  - Stress testing
  - Golden tests
  - DX audit
  - Performance audit
  - Production readiness

- **CI/CD**
  - GitHub Actions workflow
  - Automated testing
  - Architecture conformance checks
  - Security scanning
  - Release automation

### Changed

- Moved deprecated files to scripts/ and examples/
- Removed deprecated components (chat-reasoning, http-reasoning)
- Updated package.json with new scripts
- Updated version to 1.0.0

### Deprecated

- `src/llm-prompt.ts` - Use strategies instead
- `src/llm-response-parser.ts` - Use adapters instead
- `src/components/chat-reasoning.ts` - Use adapters instead
- `src/components/http-reasoning.ts` - Use adapters instead

### Removed

- `src/llm-prompt.ts`
- `src/llm-response-parser.ts`
- `src/components/chat-reasoning.ts`
- `src/components/http-reasoning.ts`
- `tests/http-reasoning.test.ts`

### Fixed

- Performance audit threshold for single operation latency
- Golden test method names for tool execution, multi-agent, scheduling, and observability

### Security

- Added security scanning to CI/CD
- Added secrets detection
- Added dependency audit
