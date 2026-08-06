import { describe, expect, it } from 'vitest';
import { getRequiredState, REQUIRED_STATE } from '../../src/runtime/required-state.js';
import { RuntimeIntegrityError } from '../../src/runtime/errors.js';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';

const builder = new GovernanceContextBuilder({ strictManifest: false });

function request(overrides: Record<string, unknown> = {}) {
  return {
    id: 'req-1',
    type: 'implementation',
    rawText: 'Implement',
    normalizedIntent: 'implementation',
    requirementIds: ['R-1'],
    ...overrides,
  };
}

function ctx(overrides: Record<string, unknown> = {}) {
  return builder.build({
    requestId: 'req-1',
    phase: 'planning',
    gate: 'pre',
    request: request(),
    producers: [],
    ...overrides,
  });
}

describe('REQUIRED_STATE (GRA Step 1 table → vacuous-pass policy inputs)', () => {
  it('covers all 13 rules', () => {
    expect(Object.keys(REQUIRED_STATE).sort()).toEqual(
      ['E-001', 'S-001', 'S-002', 'S-003', 'S-004', 'S-005', 'S-006', 'S-007', 'S-008', 'S-009', 'S-010', 'S-011', 'S-012'],
    );
  });

  it('E-001: present whenever engineering work is claimed (C-3: approval absence is a policy gate)', () => {
    expect(getRequiredState(ctx(), 'E-001')).toEqual({ present: true, subjects: 1 });
    const approved = ctx({
      approvals: {
        granted: [
          {
            decisionId: 'd1', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: 't', target: 'experience-architecture', authorizedBy: 'h',
          },
        ],
      },
    });
    expect(getRequiredState(approved, 'E-001')).toEqual({ present: true, subjects: 1 });
  });

  it('S-001: present only with unique, resolvable requirement ids', () => {
    const withReqs = ctx({ requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }] });
    expect(getRequiredState(withReqs, 'S-001')).toEqual({ present: true, subjects: 1 });
    const dupes = ctx({
      request: request({ requirementIds: ['R-1', 'R-1'] }),
      requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }],
    });
    expect(getRequiredState(dupes, 'S-001').present).toBe(false);
    const unresolvable = ctx({ requirements: [] });
    expect(getRequiredState(unresolvable, 'S-001').present).toBe(false);
    const none = ctx({ request: request({ requirementIds: [] }) });
    expect(getRequiredState(none, 'S-001').present).toBe(false);
  });

  it('S-002: present only when every claim has a run', () => {
    expect(getRequiredState(ctx(), 'S-002').present).toBe(false);
    const withRuns = ctx({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      evidence: { verificationRuns: [{ id: 'r1', targetArtifactId: 'a1', pass: true, reproducible: true, externalStateDependency: false }] },
    });
    expect(getRequiredState(withRuns, 'S-002')).toEqual({ present: true, subjects: 1 });
    const missingRun = ctx({
      claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
      evidence: { verificationRuns: [] },
    });
    expect(getRequiredState(missingRun, 'S-002').present).toBe(false);
  });

  it('S-003: present when artifacts or an amendment exist (C-1: consent absence is a policy failure)', () => {
    expect(getRequiredState(ctx(), 'S-003').present).toBe(false);
    const withArtifacts = ctx({ evidence: { artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }] } });
    expect(getRequiredState(withArtifacts, 'S-003')).toEqual({ present: true, subjects: 1 });
    const amended = ctx({
      request: request({ proposesRequirementChange: true }),
    });
    expect(getRequiredState(amended, 'S-003')).toEqual({ present: true, subjects: 0 });
  });

  it('S-004: verifiable claims need runs; unverifiable claims always evaluate (C-4)', () => {
    const unverifiableComplete = ctx({
      claims: [
        {
          id: 'c1', text: 'intent', targetArtifactId: 'a1', unverifiable: true,
          owner: 'architect', rationale: 'aesthetic judgment',
        },
      ],
    });
    expect(getRequiredState(unverifiableComplete, 'S-004')).toEqual({ present: true, subjects: 1 });
    const unverifiableIncomplete = ctx({
      claims: [{ id: 'c1', text: 'intent', targetArtifactId: 'a1', unverifiable: true }],
    });
    expect(getRequiredState(unverifiableIncomplete, 'S-004')).toEqual({ present: true, subjects: 1 });
  });

  it('S-005: present when requirements or artifacts exist', () => {
    expect(getRequiredState(ctx(), 'S-005').present).toBe(false);
    const withReqs = ctx({ requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }] });
    expect(getRequiredState(withReqs, 'S-005')).toEqual({ present: true, subjects: 1 });
  });

  it('S-006: flagged ⇒ always present (C-2: evaluates ⇒ REQUIRE_APPROVAL)', () => {
    expect(getRequiredState(ctx(), 'S-006')).toEqual({ present: true, subjects: 0 });
    const prod = ctx({
      request: request({ type: 'deployment' }),
      environment: 'production',
    });
    expect(getRequiredState(prod, 'S-006')).toEqual({ present: true, subjects: 1 });
    const prodWithDecisions = ctx({
      request: request({ type: 'deployment' }),
      environment: 'production',
      approvals: {
        granted: [
          {
            decisionId: 'd1', decision: 'EXECUTE', reason: 'ok', validationReportId: 'v',
            governanceChecks: 'PASS', timestamp: 't', target: 'deployment', authorizedBy: 'h',
          },
        ],
      },
    });
    expect(getRequiredState(prodWithDecisions, 'S-006')).toEqual({ present: true, subjects: 1 });
  });

  it('S-007: counts only governed artifact kinds', () => {
    const withKinds = ctx({
      evidence: {
        artifacts: [
          { id: 'a1', kind: 'source', trace: 'R-1' },
          { id: 'a2', kind: 'other' },
        ],
      },
    });
    expect(getRequiredState(withKinds, 'S-007')).toEqual({ present: true, subjects: 1 });
  });

  it('S-008: present only when a build record exists', () => {
    expect(getRequiredState(ctx(), 'S-008').present).toBe(false);
    const withBuild = ctx({
      evidence: {
        build: { inputFingerprint: 'f', outputHashes: ['a'], nonDeterminismSources: [] },
      },
    });
    expect(getRequiredState(withBuild, 'S-008')).toEqual({ present: true, subjects: 1 });
  });

  it('S-009: runs must carry environment fingerprints', () => {
    const withFingerprint = ctx({
      evidence: {
        verificationRuns: [
          { id: 'r1', targetArtifactId: 'a1', pass: true, reproducible: true, externalStateDependency: false, environmentFingerprint: 'fp' },
        ],
      },
    });
    expect(getRequiredState(withFingerprint, 'S-009')).toEqual({ present: true, subjects: 1 });
    const noFingerprint = ctx({
      evidence: {
        verificationRuns: [
          { id: 'r1', targetArtifactId: 'a1', pass: true, reproducible: true, externalStateDependency: false },
        ],
      },
    });
    expect(getRequiredState(noFingerprint, 'S-009').present).toBe(false);
  });

  it('S-010: present when task hunks exist', () => {
    expect(getRequiredState(ctx(), 'S-010').present).toBe(false);
    const withHunks = ctx({
      task: { id: 't1', requirementIds: ['R-1'], hunks: [{ artifactId: 'a1', requiredByRequirement: true }], introducedDependencies: [] },
    });
    expect(getRequiredState(withHunks, 'S-010')).toEqual({ present: true, subjects: 1 });
  });

  it('S-011: present only when an architecture record exists', () => {
    expect(getRequiredState(ctx(), 'S-011').present).toBe(false);
    const withArch = ctx({
      evidence: { architecture: { approved: true, constraints: [], violations: [] } },
    });
    expect(getRequiredState(withArch, 'S-011')).toEqual({ present: true, subjects: 1 });
  });

  it('S-012: present when the dependency graph is populated', () => {
    expect(getRequiredState(ctx(), 'S-012').present).toBe(false);
    const withGraph = ctx({ evidence: { resolvedDependencyGraph: ['lodash'] } });
    expect(getRequiredState(withGraph, 'S-012')).toEqual({ present: true, subjects: 1 });
  });

  it('throws on an unknown rule id', () => {
    expect(() => getRequiredState(ctx(), 'X-999')).toThrow(RuntimeIntegrityError);
  });
});
