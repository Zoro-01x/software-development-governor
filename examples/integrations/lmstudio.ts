/**
 * LM Studio Integration Example
 *
 * Uses @framework/adapter-lmstudio with LM Studio's OpenAI-compatible API.
 *
 * Prerequisites:
 *   - LM Studio installed (https://lmstudio.ai)
 *   - Download and load a model in LM Studio
 *   - Start the local server (default: http://localhost:1234)
 *   npm install @framework/core @framework/adapter-lmstudio
 *
 * Run:
 *   npx tsx examples/integrations/lmstudio.ts
 */

import { ReasoningProvider } from '@framework/core';
import { LMStudioAdapter } from '@framework/adapter-lmstudio';

async function main() {
  const provider: ReasoningProvider = new LMStudioAdapter({
    baseUrl: 'http://localhost:1234',
    model: 'default',
    temperature: 0.7,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a rate limiter with sliding window algorithm',
    projectName: 'rate-limiter',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
