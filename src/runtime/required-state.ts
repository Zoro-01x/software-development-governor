import { GOVERNED_ARTIFACT_KINDS } from '../constitution/helpers.js';
import { ENGINEERING_REQUEST_TYPES } from '../constitution/helpers.js';
import { GovernanceContext } from './types.js';
import { RuntimeIntegrityError } from './errors.js';

// GRA §3 bullet 5 / §4 vacuous-pass policy (amended 2026-08-02) —
// the Step 1 Required State column rendered as deterministic checks.
// Contradiction resolutions C-1..C-4 (ONTOLOGY §9, human-approved 2026-08-02):
// approval gates are policy failures (rule evaluates → failAction), never RETRIEVE.
export interface RequiredStateResult {
  present: boolean;
  subjects: number;
}

export type RequiredStateCheck = (ctx: GovernanceContext) => RequiredStateResult;

function count(arr: unknown[]): number {
  return arr.length;
}

function hasFlags(ctx: GovernanceContext): boolean {
  return (
    (ctx.request.type === 'deployment' && ctx.environment.role === 'production') ||
    ctx.request.proposesRequirementChange === true ||
    ctx.request.proposesArchitecturalDecision === true
  );
}

const checks: Record<string, RequiredStateCheck> = {
  // C-3 (approved): engineering work claimed ⇒ the rule always evaluates;
  // approval absence is a policy gate (failAction REQUIRE_APPROVAL), not evidence.
  'E-001': () => ({ present: true, subjects: 1 }),
  // ≥1 unique requirement id on the request, each resolving to a requirement record
  'S-001': (ctx) => {
    const ids = ctx.request.requirementIds ?? [];
    const unique = new Set(ids).size === ids.length;
    const resolvable = ids.every((id) => ctx.requirements.some((r) => r.id === id));
    return { present: ids.length > 0 && unique && resolvable, subjects: ids.length };
  },
  // claims present and runs exist for them
  'S-002': (ctx) => {
    const runsExist = ctx.claims.every((c) =>
      ctx.evidence.verificationRuns.some((r) => r.targetArtifactId === c.targetArtifactId),
    );
    return { present: ctx.claims.length > 0 && runsExist, subjects: ctx.claims.length };
  },
  // C-1 (approved): required-state = work present (artifacts or amendment);
  // consent absence is a policy failure → rule evaluates → REQUIRE_APPROVAL.
  'S-003': (ctx) => {
    const amendmentProposed = ctx.request.proposesRequirementChange === true;
    const present = ctx.evidence.artifacts.length > 0 || amendmentProposed;
    return { present, subjects: ctx.evidence.artifacts.length };
  },
  // C-4 (approved): required-state covers only verifiable claims (run present);
  // unverifiable claims always evaluate → failAction ASK_FOR_CLARIFICATION.
  'S-004': (ctx) => {
    const verifiable = ctx.claims.filter((c) => !c.unverifiable);
    const runsExist = verifiable.every((c) =>
      ctx.evidence.verificationRuns.some((r) => r.targetArtifactId === c.targetArtifactId),
    );
    return { present: ctx.claims.length > 0 && runsExist, subjects: ctx.claims.length };
  },
  // requirements or artifacts exist to check
  'S-005': (ctx) => {
    const subjects = ctx.requirements.length + ctx.evidence.artifacts.length;
    return { present: subjects > 0, subjects };
  },
  // C-2 (approved): flagged ⇒ the rule always evaluates ⇒ fail ⇒ REQUIRE_APPROVAL.
  'S-006': (ctx) => {
    const prodDeployment =
      ctx.request.type === 'deployment' && ctx.environment.role === 'production';
    const flags =
      prodDeployment ||
      ctx.request.proposesRequirementChange === true ||
      ctx.request.proposesArchitecturalDecision === true;
    return { present: true, subjects: flags ? 1 : 0 };
  },
  // governed-kind artifacts exist to trace
  'S-007': (ctx) => {
    const subjects = ctx.evidence.artifacts.filter((a) =>
      GOVERNED_ARTIFACT_KINDS.includes(a.kind),
    ).length;
    return { present: subjects > 0, subjects };
  },
  // build record present (absence is a violation in the build phase)
  'S-008': (ctx) => {
    const present = ctx.evidence.build !== undefined;
    return { present, subjects: present ? 1 : 0 };
  },
  // runs present with environment fingerprints
  'S-009': (ctx) => {
    const runs = ctx.evidence.verificationRuns;
    const complete = runs.length > 0 && runs.every((r) => (r.environmentFingerprint?.length ?? 0) > 0);
    return { present: complete, subjects: runs.length };
  },
  // change capture complete (task hunks)
  'S-010': (ctx) => {
    const hunks = ctx.task.hunks;
    return { present: hunks.length > 0, subjects: hunks.length };
  },
  // architecture record present
  'S-011': (ctx) => {
    const present = ctx.evidence.architecture !== undefined;
    return { present, subjects: present ? 1 : 0 };
  },
  // dependency graph and records present
  'S-012': (ctx) => {
    const graph = ctx.evidence.resolvedDependencyGraph;
    return { present: graph.length > 0, subjects: graph.length };
  },
};

export const REQUIRED_STATE: Readonly<Record<string, RequiredStateCheck>> = checks;

export function getRequiredState(ctx: GovernanceContext, ruleId: string): RequiredStateResult {
  const check = checks[ruleId];
  if (check === undefined) {
    throw new RuntimeIntegrityError(`GovernanceContext: unknown rule "${ruleId}"`);
  }
  return check(ctx);
}

// GRA §4 vacuous-pass policy — work-claimed discriminator.
// true = the request/context claims work relevant to the rule's subject (so absent
// Required State means missing evidence → RETRIEVE_EVIDENCE);
// false = no such work was claimed (→ NO_ACTION_REQUIRED).
export type WorkClaimedCheck = (ctx: GovernanceContext) => boolean;

const workClaimedChecks: Record<string, WorkClaimedCheck> = {
  'E-001': (ctx) => ENGINEERING_REQUEST_TYPES.includes(ctx.request.type),
  'S-001': (ctx) => ctx.request.type === 'implementation',
  'S-002': (ctx) =>
    ctx.claims.length > 0 ||
    (ctx.request.type === 'implementation' &&
      (ctx.meta.phase === 'verification' || ctx.meta.phase === 'completion')),
  'S-003': (ctx) =>
    ctx.evidence.artifacts.length > 0 || ctx.request.proposesRequirementChange === true,
  'S-004': (ctx) => ctx.claims.length > 0,
  'S-005': (ctx) => ctx.requirements.length > 0 || ctx.evidence.artifacts.length > 0,
  'S-006': (ctx) => hasFlags(ctx),
  'S-007': (ctx) => ctx.evidence.artifacts.length > 0,
  'S-008': (ctx) => ctx.meta.phase === 'build',
  'S-009': (ctx) => ctx.claims.length > 0 || ctx.evidence.verificationRuns.length > 0,
  'S-010': (ctx) => ctx.task.id.length > 0,
  'S-011': (ctx) =>
    ctx.meta.phase === 'planning' ||
    ctx.meta.phase === 'execution' ||
    ctx.evidence.architecture !== undefined,
  'S-012': (ctx) =>
    ctx.task.introducedDependencies.length > 0 ||
    ctx.evidence.dependencies.length > 0 ||
    ctx.evidence.resolvedDependencyGraph.length > 0,
};

export const WORK_CLAIMED: Readonly<Record<string, WorkClaimedCheck>> = workClaimedChecks;

export function isWorkClaimed(ctx: GovernanceContext, ruleId: string): boolean {
  const check = workClaimedChecks[ruleId];
  if (check === undefined) {
    throw new RuntimeIntegrityError(`GovernanceContext: unknown rule "${ruleId}"`);
  }
  return check(ctx);
}

// GRA Step 1 — inputs table as context field paths; used by the engine to cite
// evidence and affected objects in audit entries.
export const RULE_INPUTS: Readonly<Record<string, ReadonlyArray<string>>> = {
  'E-001': ['request', 'approvals.granted'],
  'S-001': ['request', 'requirements'],
  'S-002': ['claims', 'evidence.artifacts', 'evidence.verificationRuns'],
  'S-003': ['evidence.artifacts', 'request', 'approvals.granted'],
  'S-004': ['claims', 'evidence.verificationRuns'],
  'S-005': ['requirements', 'interpretations', 'assumptions', 'evidence.artifacts'],
  'S-006': ['request', 'approvals.granted'],
  'S-007': ['evidence.artifacts', 'requirements'],
  'S-008': ['evidence.build', 'evidence.dependencies'],
  'S-009': ['claims', 'evidence.verificationRuns', 'evidence.artifacts'],
  'S-010': ['task', 'evidence.artifacts'],
  'S-011': ['evidence.architecture'],
  'S-012': ['evidence.resolvedDependencyGraph', 'evidence.dependencies', 'requirements', 'approvals.granted'],
};

export function getRuleInputs(ruleId: string): ReadonlyArray<string> {
  const inputs = RULE_INPUTS[ruleId];
  if (inputs === undefined) {
    throw new RuntimeIntegrityError(`GovernanceContext: unknown rule "${ruleId}"`);
  }
  return inputs;
}
