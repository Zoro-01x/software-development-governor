/**
 * Groq Integration Example
 *
 * Uses @framework/adapter-groq for ultra-fast inference.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-groq groq-sdk
 *   export GROQ_API_KEY="gsk_..."
 *
 * Run:
 *   npx tsx examples/integrations/groq.ts
 */

import { ReasoningProvider } from '@framework/core';
import { GroqAdapter } from '@framework/adapter-groq';

async function main() {
  const provider: ReasoningProvider = new GroqAdapter({
    model: 'llama-3.3-70b-versatile',
    temperature: 0.7,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a CI/CD pipeline for a monorepo with 50+ packages',
    projectName: 'cicd-pipeline',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
