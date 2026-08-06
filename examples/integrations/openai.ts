/**
 * OpenAI Integration Example
 *
 * Uses @framework/adapter-openai with the OpenAI SDK.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-openai openai
 *   export OPENAI_API_KEY="sk-..."
 *
 * Run:
 *   npx tsx examples/integrations/openai.ts
 */

import { ReasoningProvider } from '@framework/core';
import { OpenAIAdapter } from '@framework/adapter-openai';

async function main() {
  const provider: ReasoningProvider = new OpenAIAdapter({
    model: 'gpt-4o',
    temperature: 0.7,
    maxTokens: 4096,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a microservice architecture for an e-commerce platform',
    projectName: 'ecommerce-microservices',
    context: { scale: '10k-100k users', budget: 'AWS tier' },
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
