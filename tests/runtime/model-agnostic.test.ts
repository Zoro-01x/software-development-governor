import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

// Requirement (human-approved): the Runtime Engine must have zero knowledge of any
// specific AI model or provider. Enforced as a conformance scan over src/runtime.
const RUNTIME_DIR = join(process.cwd(), 'src', 'runtime');
const FORBIDDEN_TOKENS = [
  'openai',
  'anthropic',
  'google',
  'gemini',
  'claude',
  'deepseek',
  'llama',
  'gpt-',
  'ReasoningProvider',
  'modelId',
  'modelName',
  'temperature',
  'apiKey',
  'api_key',
];

describe('RuntimeEngine — zero model/provider knowledge (conformance scan)', () => {
  it('src/runtime contains no AI-provider or model-specific tokens', () => {
    const files = readdirSync(RUNTIME_DIR).filter((f) => f.endsWith('.ts'));
    expect(files.length).toBeGreaterThan(0);

    const violations: string[] = [];
    for (const file of files) {
      const source = readFileSync(join(RUNTIME_DIR, file), 'utf8');
      const lower = source.toLowerCase();
      for (const token of FORBIDDEN_TOKENS) {
        if (lower.includes(token)) {
          violations.push(`${file}: "${token}"`);
        }
      }
    }
    expect(violations).toEqual([]);
  });

  it('the engine imports nothing from reasoning or provider modules', () => {
    const engineSource = readFileSync(join(RUNTIME_DIR, 'engine.ts'), 'utf8');
    expect(engineSource).not.toMatch(/reasoning/);
    expect(engineSource).not.toMatch(/provider/i);
    expect(engineSource).not.toMatch(/components\//);
  });
});
