/**
 * Anthropic Integration Example
 *
 * Uses @framework/adapter-anthropic with the Anthropic SDK.
 *
 * Prerequisites:
 *   npm install @framework/core @framework/adapter-anthropic @anthropic-ai/sdk
 *   export ANTHROPIC_API_KEY="sk-ant-..."
 *
 * Run:
 *   npx tsx examples/integrations/anthropic.ts
 */

import { ReasoningProvider } from '@framework/core';
import { AnthropicAdapter } from '@framework/adapter-anthropic';

async function main() {
  const provider: ReasoningProvider = new AnthropicAdapter({
    model: 'claude-sonnet-4-20250514',
    temperature: 0.7,
    maxTokens: 4096,
  });

  await provider.initialize();

  const result = await provider.reason({
    requirements: 'Design a real-time collaboration engine for a document editor',
    projectName: 'collab-engine',
  });

  console.log(`Provider: ${provider.name}`);
  console.log(`Confidence: ${result.confidence}`);
  console.log(`Reasoning:\n${result.reasoning}`);
}

main().catch(console.error);
