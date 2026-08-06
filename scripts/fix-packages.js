#!/usr/bin/env node
/**
 * Fix package.json for all packages — add exports, keywords, repository, homepage, bugs, license.
 * Also create src/index.ts stubs for packages that have no source.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_URL = 'https://github.com/Zoro-01x/software-development-governor';
const PACKAGES_DIR = join(import.meta.dirname, '..', 'packages');

const packages = [
  // Adapters with existing content
  { name: 'adapter-openai', peerDeps: { "openai": "^4.0.0" } },
  { name: 'adapter-anthropic', peerDeps: { "@anthropic-ai/sdk": "^0.20.0" } },
  // Adapters that are empty (need src/index.ts too)
  { name: 'adapter-gemini', peerDeps: { "@google/generative-ai": "^0.20.0" }, empty: true },
  { name: 'adapter-groq', peerDeps: { "groq-sdk": "^0.5.0" }, empty: true },
  { name: 'adapter-ollama', peerDeps: { "ollama": "^0.5.0" }, empty: true },
  { name: 'adapter-lmstudio', peerDeps: {}, empty: true },
  { name: 'adapter-openrouter', peerDeps: {}, empty: true },
  // Memory backends
  { name: 'memory-file', peerDeps: {} },
  { name: 'memory-sqlite', peerDeps: { "better-sqlite3": "^11.0.0" } },
  { name: 'memory-postgres', peerDeps: { "pg": "^8.0.0" } },
  { name: 'memory-redis', peerDeps: { "ioredis": "^5.0.0" } },
  // Bridge
  { name: 'bridge-opencode', peerDeps: {} },
];

const keywordMap = {
  'adapter-openai': ['governance', 'framework', 'ai', 'llm', 'openai', 'adapter'],
  'adapter-anthropic': ['governance', 'framework', 'ai', 'llm', 'anthropic', 'adapter'],
  'adapter-gemini': ['governance', 'framework', 'ai', 'llm', 'gemini', 'google', 'adapter'],
  'adapter-groq': ['governance', 'framework', 'ai', 'llm', 'groq', 'adapter'],
  'adapter-ollama': ['governance', 'framework', 'ai', 'llm', 'ollama', 'local', 'adapter'],
  'adapter-lmstudio': ['governance', 'framework', 'ai', 'llm', 'lmstudio', 'local', 'adapter'],
  'adapter-openrouter': ['governance', 'framework', 'ai', 'llm', 'openrouter', 'adapter'],
  'memory-file': ['governance', 'framework', 'ai', 'llm', 'memory', 'file'],
  'memory-sqlite': ['governance', 'framework', 'ai', 'llm', 'memory', 'sqlite'],
  'memory-postgres': ['governance', 'framework', 'ai', 'llm', 'memory', 'postgres'],
  'memory-redis': ['governance', 'framework', 'ai', 'llm', 'memory', 'redis'],
  'bridge-opencode': ['governance', 'framework', 'ai', 'llm', 'opencode', 'bridge'],
};

const descriptionMap = {
  'adapter-openai': 'OpenAI reasoning provider adapter for the Governance Framework',
  'adapter-anthropic': 'Anthropic reasoning provider adapter for the Governance Framework',
  'adapter-gemini': 'Google Gemini reasoning provider adapter for the Governance Framework',
  'adapter-groq': 'Groq reasoning provider adapter for the Governance Framework',
  'adapter-ollama': 'Ollama local reasoning provider adapter for the Governance Framework',
  'adapter-lmstudio': 'LM Studio local reasoning provider adapter for the Governance Framework',
  'adapter-openrouter': 'OpenRouter reasoning provider adapter for the Governance Framework',
  'memory-file': 'File-based memory backend for the Governance Framework',
  'memory-sqlite': 'SQLite memory backend for the Governance Framework',
  'memory-postgres': 'PostgreSQL memory backend for the Governance Framework',
  'memory-redis': 'Redis memory backend for the Governance Framework',
  'bridge-opencode': 'Pure translation layer between Open Code lifecycle events and Governance Kernel contracts',
};

for (const pkg of packages) {
  const pkgDir = join(PACKAGES_DIR, pkg.name);
  const pkgJsonPath = join(pkgDir, 'package.json');

  let existing = {};
  try {
    const raw = readFileSync(pkgJsonPath, 'utf-8').trim();
    if (raw.length > 0) {
      existing = JSON.parse(raw);
    }
  } catch {
    // empty or invalid — start fresh
  }

  // Build the final package.json
  const final = {
    name: `@framework/${pkg.name}`,
    version: '1.0.0',
    description: descriptionMap[pkg.name] || '',
    type: 'module',
    main: 'dist/index.js',
    types: 'dist/index.d.ts',
    exports: {
      '.': {
        import: './dist/index.js',
        types: './dist/index.d.ts',
      },
    },
    scripts: {
      build: 'tsc',
      test: 'vitest run',
      prepublishOnly: 'npm run build',
    },
    keywords: keywordMap[pkg.name] || ['governance', 'framework', 'ai'],
    repository: {
      type: 'git',
      url: `${REPO_URL}.git`,
      directory: `packages/${pkg.name}`,
    },
    homepage: `${REPO_URL}#readme`,
    bugs: {
      url: `${REPO_URL}/issues`,
    },
    license: 'MIT',
    dependencies: {
      '@framework/core': 'file:../core',
    },
    devDependencies: {
      typescript: '^5.7.0',
      vitest: '^4.1.10',
    },
  };

  // Merge peerDependencies
  if (pkg.peerDeps && Object.keys(pkg.peerDeps).length > 0) {
    final.peerDependencies = pkg.peerDeps;
  }

  // Preserve any existing fields we didn't set (like extra scripts)
  if (existing.scripts) {
    final.scripts = { ...final.scripts, ...existing.scripts };
  }

  writeFileSync(pkgJsonPath, JSON.stringify(final, null, 2) + '\n');
  console.log(`✅ ${pkg.name}/package.json updated`);

  // Create src/index.ts stub for empty packages
  if (pkg.empty) {
    const srcDir = join(pkgDir, 'src');
    if (!existsSync(srcDir)) {
      mkdirSync(srcDir, { recursive: true });
    }
    const indexPath = join(srcDir, 'index.ts');
    if (!existsSync(indexPath)) {
      const className = pkg.name
        .split('-')
        .map(s => s.charAt(0).toUpperCase() + s.slice(1))
        .join('');
      const stub = `/**
 * ${descriptionMap[pkg.name] || pkg.name}
 *
 * TODO: Implement the reasoning provider interface.
 */
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '@framework/core';

export interface ${className}Config {
  apiKey?: string;
  model?: string;
}

export class ${className}Adapter implements ReasoningProvider {
  name = '${pkg.name.replace('adapter-', '')}';

  private config: ${className}Config;

  constructor(config: ${className}Config = {}) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    // Initialize client
  }

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    throw new Error('Not implemented — provide your own adapter implementation');
  }
}

export function create${className}Adapter(config?: ${className}Config): ${className}Adapter {
  return new ${className}Adapter(config);
}
`;
      writeFileSync(indexPath, stub);
      console.log(`  📄 src/index.ts stub created`);
    }
  }
}

console.log('\nDone! All package.json files updated.');
