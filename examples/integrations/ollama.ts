/**
 * Ollama Integration Example
 *
 * Uses @framework/adapter-ollama with a local Ollama server.
 *
 * Prerequisites:
 *   - Ollama installed and running (https://ollama.ai)
 *   - ollama pull llama3.2
 *   npm install @framework/core @framework/adapter-ollama
 *
 * Run:
 *   npx tsx examples/integrations/ollama.ts
 */

import { ReasoningProvider } from '@framework/core';
import { OllamaAdapter } from '@framework/adapter-ollama';

async function main() {
  const provider: ReasoningProvider = new OllamaAdapter({
    baseUrl: 'http://localhost:11434',
    model: 'llama3.2',
    temperature: 0.7,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a log aggregation system for microservices',
    projectName: 'log-aggregation',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
