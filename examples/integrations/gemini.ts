/**
 * Google Gemini Integration Example
 *
 * Uses @framework/adapter-gemini with the Google Generative AI SDK.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-gemini @google/generative-ai
 *   export GOOGLE_API_KEY="..."
 *
 * Run:
 *   npx tsx examples/integrations/gemini.ts
 */

import { ReasoningProvider } from '@framework/core';
import { GeminiAdapter } from '@framework/adapter-gemini';

async function main() {
  const provider: ReasoningProvider = new GeminiAdapter({
    model: 'gemini-2.0-flash',
    temperature: 0.7,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a recommendation engine for a streaming platform',
    projectName: 'recommendation-engine',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
