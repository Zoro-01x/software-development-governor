# Dependency Audit Report

**Date:** 2026-08-05  
**Status:** PASS — No Provider SDK Leaks

## Dependencies

### Production Dependencies
```json
{
  "ai-governor": "file:../ai-governor"
}
```

**Analysis:** Local package only. No provider SDKs.

### Dev Dependencies
```json
{
  "@types/node": "^22.0.0",
  "tsx": "^4.19.0",
  "typescript": "^5.7.0",
  "vitest": "^4.1.10"
}
```

**Analysis:** Standard development tools only. No provider SDKs.

## Provider SDK Check

| Provider | SDK | Present |
|----------|-----|---------|
| OpenAI | `openai` | ✗ No |
| Anthropic | `@anthropic-ai/sdk` | ✗ No |
| Google | `@google/generative-ai` | ✗ No |
| Groq | `groq-sdk` | ✗ No |
| Ollama | `ollama` | ✗ No |

## HTTP Client Check

| Client | Present |
|--------|---------|
| `axios` | ✗ No |
| `got` | ✗ No |
| `node-fetch` | ✗ No |
| `undici` | ✗ No |
| Native `fetch` | ✓ Used in adapters only |

## Conclusion

No provider SDKs leak into framework packages. All provider communication uses native `fetch` API within adapters only.

**Dependency Audit:** ✓ PASSED
