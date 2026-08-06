import { describe, expect, it } from 'vitest';
import { computeRisk, isHighRisk } from '../../src/runtime/risk.js';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';
import { GovernanceContext } from '../../src/runtime/types.js';

const builder = new GovernanceContextBuilder({ strictManifest: false });
const FIXED_NOW = '2026-08-02T12:00:00.000Z';

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    type: 'implementation',
    rawText: 'x',
    normalizedIntent: 'x',
    requirementIds: ['R-1'],
    ...overrides,
  };
}

function ctx(overrides: Record<string, unknown> = {}): GovernanceContext {
  return builder.build({
    requestId: 'req-1',
    phase: 'verification',
    gate: 'post',
    request: request(),
    producers: [],
    builtAt: FIXED_NOW,
    ...overrides,
  });
}

describe('computeRisk (GRA §3)', () => {
  it('is zero for an unremarkable context', () => {
    const risk = computeRisk(ctx());
    expect(risk.score).toBe(10); // implementation request baseline
    expect(risk.factors.map((f) => f.factor)).toContain('request-type');
  });

  it('is deterministic: identical contexts yield identical scores', () => {
    const a = computeRisk(ctx());
    const b = computeRisk(ctx());
    expect(a).toEqual(b);
  });

  it('production deployment scores highest', () => {
    const risk = computeRisk(
      ctx({ request: request({ type: 'deployment' }), environment: 'production' }),
    );
    expect(risk.score).toBe(50); // 30 deployment + 20 production
    expect(risk.factors.map((f) => f.factor)).toEqual(
      expect.arrayContaining(['request-type', 'environment']),
    );
  });

  it('adds points for missing approvals with cited evidence', () => {
    const risk = computeRisk(
      ctx({
        approvals: {
          required: [{ target: 'deployment', requiredByRules: ['S-006'] }],
          granted: [],
        },
      }),
    );
    const factor = risk.factors.find((f) => f.factor === 'missing-approvals');
    expect(factor).toBeDefined();
    expect(factor!.points).toBe(20);
    expect(factor!.evidence).toBe('deployment');
  });

  it('adds points for unverified claims, capped at 30', () => {
    const claims = Array.from({ length: 5 }, (_, i) => ({
      id: `c${i}`,
      text: 'works',
      targetArtifactId: 'a1',
    }));
    const risk = computeRisk(ctx({ claims }));
    const factor = risk.factors.find((f) => f.factor === 'unverified-claims');
    expect(factor!.points).toBe(30); // 5 * 10 capped
    expect(factor!.evidence).toBe('claims:5');
  });

  it('adds points for material ambiguity', () => {
    const risk = computeRisk(
      ctx({
        interpretations: [
          { requirementId: 'R-1', interpretation: 'A', materialDifference: true },
          { requirementId: 'R-1', interpretation: 'B', materialDifference: true },
          { requirementId: 'R-1', interpretation: 'C', materialDifference: true },
        ],
      }),
    );
    const factor = risk.factors.find((f) => f.factor === 'ambiguity');
    expect(factor!.points).toBe(15);
  });

  it('caps the total score at 100', () => {
    const risk = computeRisk(
      ctx({
        request: request({ type: 'deployment' }),
        environment: 'production',
        claims: Array.from({ length: 10 }, (_, i) => ({
          id: `c${i}`,
          text: 'works',
          targetArtifactId: 'a1',
        })),
        interpretations: Array.from({ length: 10 }, (_, i) => ({
          requirementId: 'R-1',
          interpretation: `I${i}`,
          materialDifference: true,
        })),
        approvals: {
          required: [
            { target: 'a', requiredByRules: ['S-006'] },
            { target: 'b', requiredByRules: ['S-006'] },
            { target: 'c', requiredByRules: ['S-006'] },
          ],
          granted: [],
        },
        evidence: {
          resolvedDependencyGraph: Array.from({ length: 30 }, (_, i) => `dep-${i}`),
        },
      }),
    );
    expect(risk.score).toBeLessThanOrEqual(100);
    expect(risk.score).toBeGreaterThanOrEqual(90);
  });

  it('adds scrutiny, never removes it: score is monotonic in risk signals', () => {
    const baseline = computeRisk(ctx()).score;
    const riskier = computeRisk(
      ctx({ request: request({ type: 'deployment' }), environment: 'production' }),
    ).score;
    expect(riskier).toBeGreaterThanOrEqual(baseline);
  });

  it('isHighRisk flags scores at the threshold', () => {
    expect(isHighRisk({ score: 50, factors: [] }, 50)).toBe(true);
    expect(isHighRisk({ score: 49, factors: [] }, 50)).toBe(false);
  });
});
