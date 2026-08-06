import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';
import {
  DECISION_LATTICE,
  PHASE_ORDER,
  AuditEntry,
  GovernanceContext,
  RuleDecision,
} from '../../src/runtime/types.js';
import { GovernanceContextBuilder } from '../../src/runtime/context.js';

const ARCH = 'governance/RUNTIME-ARCHITECTURE.md';
const doc = readFileSync(ARCH, 'utf8');

const builder = new GovernanceContextBuilder({ strictManifest: false });
const ctx: GovernanceContext = builder.build({
  requestId: 'req-1',
  phase: 'planning',
  gate: 'pre',
  request: {
    id: 'req-1',
    type: 'implementation',
    rawText: 'x',
    normalizedIntent: 'x',
    requirementIds: ['R-1'],
  },
  producers: [],
});

const richCtx: GovernanceContext = builder.build({
  requestId: 'req-1',
  phase: 'verification',
  gate: 'post',
  request: {
    id: 'req-1',
    type: 'implementation',
    rawText: 'x',
    normalizedIntent: 'x',
    requirementIds: ['R-1'],
  },
  producers: [],
  requirements: [{ id: 'R-1', text: 'Do it', status: 'approved' }],
  claims: [{ id: 'c1', text: 'works', targetArtifactId: 'a1' }],
  memory: [
    {
      id: 'm1',
      content: 'note',
      provenance: 'session-1',
      confidence: 0.8,
      source: 'conversation',
      writtenAt: '2026-01-01T00:00:00.000Z',
      archived: false,
    },
  ],
  risk: {
    score: 42,
    factors: [{ factor: 'unverified-claims', points: 20, evidence: 'c1' }],
  },
  approvals: {
    required: [{ target: 'experience-architecture', requiredByRules: ['E-001'] }],
    granted: [
      {
        decisionId: 'd1',
        decision: 'EXECUTE',
        reason: 'ok',
        validationReportId: 'v',
        governanceChecks: 'PASS',
        timestamp: 't',
        target: 'experience-architecture',
        authorizedBy: 'h',
      },
    ],
  },
});

function contextKeys(obj: unknown, prefix = ''): string[] {
  const out: string[] = [];
  for (const key of Object.keys(obj as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key;
    out.push(path);
    const value = (obj as Record<string, unknown>)[key];
    if (Array.isArray(value)) {
      if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
        out.push(...contextKeys(value[0], `${path}[0]`));
      }
    } else if (value !== null && typeof value === 'object') {
      out.push(...contextKeys(value, path));
    }
  }
  return out;
}

const richKeys = contextKeys(richCtx);

describe('GRA §2 — phases and gates', () => {
  it('phase list matches the architecture lifecycle', () => {
    const documented = [
      'request-received',
      'intent-analysis',
      'clarification',
      'planning',
      'task-compilation',
      'execution',
      'verification',
      'build',
      'memory-update',
      'human-approval',
      'completion',
    ];
    expect(PHASE_ORDER).toEqual(documented);
    expect(doc).toMatch(/Request Received/);
    expect(doc).toMatch(/BUILD \(sub-phase\)/);
    expect(doc).toMatch(/Completion/);
  });

  it('gate kinds match pre | post | final', () => {
    expect(richKeys).toContain('meta.gate');
    expect(doc).toMatch(/gate: 'pre' \| 'post' \| 'final'/);
  });
});

describe('GRA §3 — Governance Context schema', () => {
  it('context exposes every documented section', () => {
    expect(Object.keys(ctx).sort()).toEqual([
      'approvals',
      'assumptions',
      'audit',
      'claims',
      'environment',
      'evidence',
      'goal',
      'interpretations',
      'memory',
      'meta',
      'request',
      'requirements',
      'risk',
      'task',
    ]);
  });

  it('meta carries requestId, revision, phase, gate, builtAt, producerManifest', () => {
    for (const field of ['requestId', 'revision', 'phase', 'gate', 'builtAt', 'producerManifest']) {
      expect(richKeys).toContain(`meta.${field}`);
    }
  });

  it('evidence carries artifacts, verificationRuns, build, dependencies, graph, architecture', () => {
    for (const field of [
      'artifacts',
      'verificationRuns',
      'build',
      'dependencies',
      'resolvedDependencyGraph',
      'architecture',
    ]) {
      expect(richKeys).toContain(`evidence.${field}`);
    }
  });

  it('memory is a bounded snapshot with provenance and confidence', () => {
    expect(richKeys).toContain('memory.entries');
    expect(richKeys).toContain('memory.entries[0].provenance');
    expect(richKeys).toContain('memory.entries[0].confidence');
  });

  it('risk carries score and factorized evidence', () => {
    expect(richKeys).toContain('risk.score');
    expect(richKeys).toContain('risk.factors');
    expect(richKeys).toContain('risk.factors[0].evidence');
  });

  it('approvals carry required, granted, and derived missing', () => {
    expect(richKeys).toContain('approvals.required');
    expect(richKeys).toContain('approvals.granted');
    expect(richKeys).toContain('approvals.missing');
    expect(doc).toMatch(/missing: string\[\].*derived/s);
  });

  it('context is immutable to rules (frozen)', () => {
    expect(Object.isFrozen(ctx)).toBe(true);
    expect(doc).toMatch(/never read globals/);
  });

  it('producer manifest makes field origins auditable', () => {
    expect(richKeys).toContain('meta.producerManifest');
    expect(doc).toMatch(/producerManifest/);
  });
});

describe('GRA §4 — decision lattice', () => {
  it('decision set matches the architecture exactly (amended: NO_ACTION_REQUIRED)', () => {
    const decisions = Object.keys(DECISION_LATTICE).sort();
    expect(decisions).toEqual(
      ['ALLOW', 'ARCHIVE', 'ASK_FOR_CLARIFICATION', 'BLOCK', 'NO_ACTION_REQUIRED', 'REQUIRE_APPROVAL', 'RETRIEVE_EVIDENCE', 'RETRY'],
    );
    expect(doc).toMatch(/NO_ACTION_REQUIRED/);
    expect(doc).toMatch(/nothing to verify/);
  });

  it('lattice ranks match the documented order (BLOCK highest, NO_ACTION_REQUIRED lowest)', () => {
    expect(DECISION_LATTICE.BLOCK).toBeGreaterThan(DECISION_LATTICE.REQUIRE_APPROVAL);
    expect(DECISION_LATTICE.REQUIRE_APPROVAL).toBeGreaterThan(DECISION_LATTICE.ASK_FOR_CLARIFICATION);
    expect(DECISION_LATTICE.ASK_FOR_CLARIFICATION).toBeGreaterThan(DECISION_LATTICE.RETRIEVE_EVIDENCE);
    expect(DECISION_LATTICE.RETRIEVE_EVIDENCE).toBeGreaterThan(DECISION_LATTICE.RETRY);
    expect(DECISION_LATTICE.RETRY).toBeGreaterThan(DECISION_LATTICE.ARCHIVE);
    expect(DECISION_LATTICE.ARCHIVE).toBeGreaterThan(DECISION_LATTICE.ALLOW);
    expect(DECISION_LATTICE.ALLOW).toBeGreaterThan(DECISION_LATTICE.NO_ACTION_REQUIRED);
    const all = Object.values(DECISION_LATTICE);
    expect(new Set(all).size).toBe(all.length);
  });
});

describe('GRA §6 — audit entry schema', () => {
  it('every documented audit field exists on the type', () => {
    const entry: AuditEntry = {
      id: 'e', requestId: 'r', revision: 0, phase: 'planning', gate: 'pre',
      timestamp: 't', ruleId: 'S-001', ruleName: 'x', outcome: 'pass',
      decision: 'ALLOW' as RuleDecision, vacuous: false, evidence: [], reason: 'r',
      affectedObjects: [], actor: 'runtime', prevHash: null, hash: 'h',
    };
    for (const field of ['ruleId', 'evidence', 'decision', 'timestamp', 'reason', 'affectedObjects']) {
      expect(entry).toHaveProperty(field);
    }
    expect(doc).toMatch(/Nothing happens silently/);
  });
});
