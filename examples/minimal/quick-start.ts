/**
 * Minimal Quick Start
 *
 * Demonstrates the Governance Framework with an adapter.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-openai openai
 *   export OPENAI_API_KEY="sk-..."
 *
 * Run:
 *   npx tsx quick-start.ts
 */

import { ReasoningProvider } from '@framework/core';

async function main() {
  // 1. Import an adapter
  const { OpenAIAdapter } = await import('@framework/adapter-openai');

  // 2. Create and configure
  const provider: ReasoningProvider = new OpenAIAdapter({
    model: 'gpt-4',
    temperature: 0.7,
  });

  // 3. Initialize (connects to the provider)
  await provider.initialize();

  // 4. Send a reasoning request
  const result = await provider.reason({
    requirements: 'Design a user authentication system with OAuth2 support',
    projectName: 'quick-start-demo',
  });

  // 5. Use the result
  console.log('Provider:', provider.name);
  console.log('Confidence:', result.confidence);
  console.log('Reasoning:', result.reasoning.substring(0, 200) + '...');
  console.log('Design:', JSON.stringify(result.design, null, 2));
}

main().catch(console.error);
