/**
 * OpenRouter Integration Example
 *
 * Uses @framework/adapter-openrouter to access multiple providers through one gateway.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-openrouter
 *   export OPENROUTER_API_KEY="sk-or-..."
 *
 * Run:
 *   npx tsx examples/integrations/openrouter.ts
 */

import { ReasoningProvider } from '@framework/core';
import { OpenRouterAdapter } from '@framework/adapter-openrouter';

async function main() {
  const provider: ReasoningProvider = new OpenRouterAdapter({
    model: 'anthropic/claude-sonnet-4',
    temperature: 0.7,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a distributed caching layer with invalidation strategy',
    projectName: 'distributed-cache',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
