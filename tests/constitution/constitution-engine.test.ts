import { describe, expect, it } from 'vitest';
import { ConstitutionEngine, CONSTITUTION_RULES } from '../../src/constitution/constitution-engine.js';
import { baseContext } from './fixtures.js';

describe('ConstitutionEngine', () => {
  it('registers all 13 constitution rules', () => {
    expect(CONSTITUTION_RULES).toHaveLength(13);
    const engine = new ConstitutionEngine();
    expect(engine.ruleIds.sort()).toEqual(
      ['E-001', 'S-001', 'S-002', 'S-003', 'S-004', 'S-005', 'S-006', 'S-007', 'S-008', 'S-009', 'S-010', 'S-011', 'S-012'],
    );
  });

  it('executes all rules against a clean context', () => {
    const engine = new ConstitutionEngine();
    const execution = engine.execute(
      baseContext({
        build: { inputFingerprint: 'sha256:abc', outputHashes: ['sha256:xyz', 'sha256:xyz'], nonDeterminismSources: [] },
      }),
    );
    expect(execution.results).toHaveLength(13);
    expect(execution.failures).toHaveLength(0);
    expect(execution.allPass).toBe(true);
  });

  it('reports failures and keeps rule order', () => {
    const engine = new ConstitutionEngine();
    const execution = engine.execute(
      baseContext({
        request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
        build: { inputFingerprint: '', outputHashes: ['a'], nonDeterminismSources: [] },
      }),
    );
    expect(execution.failures.map((f) => f.rule.id)).toEqual(['E-001', 'S-001', 'S-008']);
    expect(execution.allPass).toBe(false);
    expect(execution.passed).toContain('S-002');
  });

  it('executes a subset of rules by id', () => {
    const engine = new ConstitutionEngine();
    const execution = engine.execute(baseContext(), ['E-001', 'S-001']);
    expect(execution.results).toHaveLength(2);
  });

  it('throws on unknown rule ids', () => {
    const engine = new ConstitutionEngine();
    expect(() => engine.execute(baseContext(), ['NOPE'])).toThrow(/Unknown constitution rule/);
  });

  it('supports custom rule registration', () => {
    const engine = new ConstitutionEngine([]);
    const custom = {
      id: 'X-001',
      name: 'Custom',
      description: 'test',
      severity: 'error',
      evaluate: () => 'fail',
    };
    engine.register(custom);
    const execution = engine.execute(baseContext());
    expect(execution.failures).toHaveLength(1);
    expect(execution.failures[0].rule.id).toBe('X-001');
  });
});
