import { describe, expect, it } from 'vitest';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { PHASE_ORDER } from '../../src/runtime/types.js';

const builder = new GovernanceContextBuilder();

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    type: 'implementation',
    rawText: 'Implement the login flow',
    normalizedIntent: 'implementation:login-flow',
    requirementIds: ['R-1'],
    ...overrides,
  };
}

function baseOptions(overrides: Record<string, unknown> = {}) {
  return {
    requestId: 'req-1',
    phase: 'planning',
    gate: 'pre',
    request: request(),
    producers: [{ field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: '2026-01-01T00:00:00.000Z' }],
    ...overrides,
  };
}

describe('GovernanceContextBuilder', () => {
  it('assembles a context with defaults and derived fields', () => {
    const ctx = builder.build(baseOptions());
    expect(ctx.meta.requestId).toBe('req-1');
    expect(ctx.meta.revision).toBe(0);
    expect(ctx.meta.phase).toBe('planning');
    expect(ctx.meta.gate).toBe('pre');
    expect(ctx.meta.builtAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(ctx.meta.producerManifest).toEqual([
      { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: '2026-01-01T00:00:00.000Z' },
    ]);
    expect(ctx.goal.id).toBe('');
    expect(ctx.task.hunks).toEqual([]);
    expect(ctx.evidence.artifacts).toEqual([]);
    expect(ctx.evidence.build).toBeUndefined();
    expect(ctx.risk).toEqual({ score: 0, factors: [] });
    expect(ctx.memory.entries).toEqual([]);
    expect(ctx.audit).toEqual([]);
    expect(ctx.environment).toEqual({ role: 'development' });
  });

  it('derives approvals.missing from required vs granted', () => {
    const ctx = builder.build(
      baseOptions({
        producers: [
          { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: 'w1' },
          { field: 'approvals.required', producer: 'gate-table', version: '1.0.0', wroteAt: 'w2' },
          { field: 'approvals.granted', producer: 'approval-queue', version: '1.1.0', wroteAt: 'w3' },
        ],
        approvals: {
          required: [
            { target: 'experience-architecture', requiredByRules: ['E-001'] },
            { target: 'deployment', requiredByRules: ['S-006'] },
          ],
          granted: [
            {
              decisionId: 'dec-1',
              decision: 'EXECUTE',
              reason: 'approved',
              validationReportId: 'vr-1',
              governanceChecks: 'PASS',
              timestamp: '2026-01-01T00:00:00.000Z',
              target: 'experience-architecture',
              authorizedBy: 'human-1',
            },
          ],
        },
      }),
    );
    expect(ctx.approvals.missing).toEqual(['deployment']);
  });

  it('treats a granted non-EXECUTE decision as missing', () => {
    const ctx = builder.build(
      baseOptions({
        producers: [
          { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: 'w1' },
          { field: 'approvals.required', producer: 'gate-table', version: '1.0.0', wroteAt: 'w2' },
          { field: 'approvals.granted', producer: 'approval-queue', version: '1.1.0', wroteAt: 'w3' },
        ],
        approvals: {
          required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
          granted: [
            {
              decisionId: 'dec-1',
              decision: 'ASK_HUMAN',
              reason: 'pending',
              validationReportId: 'vr-1',
              governanceChecks: 'PASS',
              timestamp: '2026-01-01T00:00:00.000Z',
              target: 'experience-architecture',
            },
          ],
        },
      }),
    );
    expect(ctx.approvals.missing).toEqual(['experience-architecture']);
  });

  it('records the producer manifest for every populated field', () => {
    const ctx = builder.build(
      baseOptions({
        producers: [
          { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: 'w1' },
          { field: 'evidence.artifacts', producer: 'artifact-registry', version: '2.0.0', wroteAt: 'w2' },
          { field: 'approvals.granted', producer: 'approval-queue', version: '1.1.0', wroteAt: 'w3' },
        ],
        evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }] },
        approvals: {
          granted: [
            {
              decisionId: 'dec-1', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
              governanceChecks: 'PASS', timestamp: 't', target: 'experience-architecture', authorizedBy: 'h',
            },
          ],
        },
      }),
    );
    expect(ctx.meta.producerManifest.map((p) => p.field)).toEqual([
      'request',
      'evidence.artifacts',
      'approvals.granted',
    ]);
  });

  it('rejects a populated field with no producer manifest entry (strict mode)', () => {
    expect(() =>
      builder.build(
        baseOptions({
          evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }] },
        }),
      ),
    ).toThrow(RuntimeIntegrityError);
  });

  it('allows undeclared populated fields in non-strict mode', () => {
    const lax = new GovernanceContextBuilder({ strictManifest: false });
    const ctx = lax.build(
      baseOptions({
        evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }] },
      }),
    );
    expect(ctx.evidence.artifacts).toHaveLength(1);
  });

  it('isolates inputs from the caller (deep clone)', () => {
    const artifacts = [{ id: 'a1', kind: 'source', trace: 'R-1' }];
    const ctx = builder.build(
      baseOptions({
        producers: [
          { field: 'request', producer: 'envelope-validator', version: '1.0.0', wroteAt: 'w1' },
          { field: 'evidence.artifacts', producer: 'artifact-registry', version: '2.0.0', wroteAt: 'w2' },
        ],
        evidence: { artifacts },
      }),
    );
    artifacts.push({ id: 'a2', kind: 'test', trace: 'R-1' });
    expect(ctx.evidence.artifacts).toHaveLength(1);
  });
});

describe('GovernanceContext immutability (GRA §3)', () => {
  it('is deeply frozen', () => {
    const ctx = builder.build(baseOptions());
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(Object.isFrozen(ctx.evidence)).toBe(true);
    expect(Object.isFrozen(ctx.requirements)).toBe(true);
    expect(Object.isFrozen(ctx.memory.entries)).toBe(true);
    expect(Object.isFrozen(ctx.approvals.granted)).toBe(true);
    expect(Object.isFrozen(ctx.audit)).toBe(true);
    expect(Object.isFrozen(ctx.meta.producerManifest)).toBe(true);
  });

  it('throws on mutation attempts', () => {
    const ctx = builder.build(baseOptions());
    expect(() => {
      (ctx as { request: unknown }).request = {};
    }).toThrow(TypeError);
    expect(() => ctx.requirements.push({ id: 'R-9', text: 'x', status: 'draft' })).toThrow(TypeError);
    expect(() => ctx.approvals.missing.push('x')).toThrow(TypeError);
  });
});

describe('GovernanceContext invalid input (RULE 7 adversarial)', () => {
  it('rejects a missing requestId', () => {
    expect(() => builder.build(baseOptions({ requestId: '' }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects an unknown phase', () => {
    expect(() => builder.build(baseOptions({ phase: 'teleport' }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects an unknown gate', () => {
    expect(() => builder.build(baseOptions({ gate: 'sideways' }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects a negative revision', () => {
    expect(() => builder.build(baseOptions({ revision: -1 }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects an unknown environment role', () => {
    expect(() => builder.build(baseOptions({ environment: 'lunar' }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects a missing request', () => {
    expect(() => builder.build(baseOptions({ request: undefined }))).toThrow(RuntimeIntegrityError);
  });

  it('rejects a request without rawText', () => {
    expect(() => builder.build(baseOptions({ request: request({ rawText: '' }) }))).toThrow(
      RuntimeIntegrityError,
    );
  });

  it('rejects non-cloneable input', () => {
    expect(() =>
      builder.build(
        baseOptions({
          request: request({ handler: () => 42 }),
        }),
      ),
    ).toThrow(RuntimeIntegrityError);
  });

  it('accepts every phase in PHASE_ORDER', () => {
    for (const phase of PHASE_ORDER) {
      const ctx = builder.build(baseOptions({ phase }));
      expect(ctx.meta.phase).toBe(phase);
    }
  });
});
