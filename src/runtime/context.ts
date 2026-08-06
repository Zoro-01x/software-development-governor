import { GovernedDecisionRecord } from '../constitution/types.js';
import { isGovernedDecision } from '../constitution/glossary.js';
import {
  ApprovalRequirement,
  ArtifactRecord,
  AssumptionRecord,
  AuditEntry,
  ClaimRecord,
  EnvironmentRole,
  EvidenceSection,
  GateKind,
  GoalRecord,
  GovernanceContext,
  InterpretationRecord,
  MemoryEntry,
  PhaseName,
  PHASE_ORDER,
  ProducerManifestEntry,
  RequirementRecord,
  RiskScore,
  RuntimeRequestRecord,
  TaskRecord,
} from './types.js';
import { RuntimeIntegrityError } from './errors.js';

const GATE_KINDS: ReadonlyArray<GateKind> = ['pre', 'post', 'final'];
const ENVIRONMENT_ROLES: ReadonlyArray<EnvironmentRole> = ['production', 'staging', 'development'];

// GRA §3 — sections whose population requires a producer manifest entry (strict mode)
const MANIFEST_FIELDS: ReadonlyArray<string> = [
  'request',
  'goal',
  'task',
  'requirements',
  'interpretations',
  'assumptions',
  'claims',
  'evidence.artifacts',
  'evidence.verificationRuns',
  'evidence.build',
  'evidence.dependencies',
  'evidence.resolvedDependencyGraph',
  'evidence.architecture',
  'memory',
  'risk',
  'approvals.required',
  'approvals.granted',
  'audit',
  'environment',
];

const EMPTY_GOAL: GoalRecord = { id: '', text: '', status: 'active' };
const EMPTY_TASK: TaskRecord = { id: '', requirementIds: [], hunks: [], introducedDependencies: [] };
const EMPTY_RISK: RiskScore = { score: 0, factors: [] };

export interface ContextBuildOptions {
  requestId: string;
  phase: PhaseName;
  gate: GateKind;
  request: RuntimeRequestRecord;
  producers: ProducerManifestEntry[];
  revision?: number;
  goal?: GoalRecord;
  task?: TaskRecord;
  requirements?: RequirementRecord[];
  interpretations?: InterpretationRecord[];
  assumptions?: AssumptionRecord[];
  claims?: ClaimRecord[];
  evidence?: Partial<EvidenceSection>;
  memory?: MemoryEntry[];
  risk?: RiskScore;
  approvals?: { required?: ApprovalRequirement[]; granted?: GovernedDecisionRecord[] };
  audit?: AuditEntry[];
  environment?: EnvironmentRole;
  builtAt?: string; // clock injection for determinism; defaults to now
}

function deepClone<T>(value: T): T {
  try {
    return structuredClone(value);
  } catch (error) {
    throw new RuntimeIntegrityError(
      `GovernanceContext: input is not cloneable (${(error as Error).message})`,
    );
  }
}

function deepFreeze<T>(value: T): T {
  if (value !== null && typeof value === 'object') {
    for (const key of Object.getOwnPropertyNames(value)) {
      const child = (value as Record<string, unknown>)[key];
      if (child !== null && typeof child === 'object') deepFreeze(child);
    }
    Object.freeze(value);
  }
  return value;
}

function deriveMissing(
  required: ApprovalRequirement[],
  granted: GovernedDecisionRecord[],
): string[] {
  return required
    .map((r) => r.target)
    .filter((target) => {
      const covered = granted.some(
        (g) => isGovernedDecision(g) && g.decision === 'EXECUTE' && g.target === target,
      );
      return !covered;
    });
}

function hasAny(arr: unknown[]): boolean {
  return arr.length > 0;
}

function validateManifest(
  context: GovernanceContext,
  producers: ProducerManifestEntry[],
  strict: boolean,
): void {
  const declared = new Set(producers.map((p) => p.field));
  const populated: string[] = [];
  const e = context.evidence;

  if (context.request.rawText.length > 0) populated.push('request');
  if (context.goal.id.length > 0) populated.push('goal');
  if (context.task.id.length > 0) populated.push('task');
  if (hasAny(context.requirements)) populated.push('requirements');
  if (hasAny(context.interpretations)) populated.push('interpretations');
  if (hasAny(context.assumptions)) populated.push('assumptions');
  if (hasAny(context.claims)) populated.push('claims');
  if (hasAny(e.artifacts)) populated.push('evidence.artifacts');
  if (hasAny(e.verificationRuns)) populated.push('evidence.verificationRuns');
  if (e.build !== undefined) populated.push('evidence.build');
  if (hasAny(e.dependencies)) populated.push('evidence.dependencies');
  if (hasAny(e.resolvedDependencyGraph)) populated.push('evidence.resolvedDependencyGraph');
  if (e.architecture !== undefined) populated.push('evidence.architecture');
  if (hasAny(context.memory.entries)) populated.push('memory');
  if (context.risk.factors.length > 0) populated.push('risk');
  if (hasAny(context.approvals.required)) populated.push('approvals.required');
  if (hasAny(context.approvals.granted)) populated.push('approvals.granted');
  if (hasAny(context.audit)) populated.push('audit');

  const undeclared = populated.filter((field) => !declared.has(field));
  if (strict && undeclared.length > 0) {
    throw new RuntimeIntegrityError(
      `GovernanceContext: populated fields without producer manifest: ${undeclared.join(', ')}`,
    );
  }
}

export class GovernanceContextBuilder {
  private readonly strictManifest: boolean;

  constructor(options: { strictManifest?: boolean } = {}) {
    this.strictManifest = options.strictManifest ?? true;
  }

  // GRA §3 — the runtime assembles a fresh context at every gate
  build(options: ContextBuildOptions): GovernanceContext {
    if (!options.requestId || options.requestId.length === 0) {
      throw new RuntimeIntegrityError('GovernanceContext: requestId is required');
    }
    if (!PHASE_ORDER.includes(options.phase)) {
      throw new RuntimeIntegrityError(`GovernanceContext: unknown phase "${options.phase}"`);
    }
    if (!GATE_KINDS.includes(options.gate)) {
      throw new RuntimeIntegrityError(`GovernanceContext: unknown gate "${options.gate}"`);
    }
    if (options.revision !== undefined && options.revision < 0) {
      throw new RuntimeIntegrityError('GovernanceContext: revision must be >= 0');
    }
    if (options.environment !== undefined && !ENVIRONMENT_ROLES.includes(options.environment)) {
      throw new RuntimeIntegrityError(
        `GovernanceContext: unknown environment role "${options.environment}"`,
      );
    }
    if (options.request === undefined) {
      throw new RuntimeIntegrityError('GovernanceContext: request is required');
    }
    if (options.request.rawText.length === 0 || options.request.normalizedIntent.length === 0) {
      throw new RuntimeIntegrityError(
        'GovernanceContext: request must carry rawText and normalizedIntent',
      );
    }

    const granted = deepClone(options.approvals?.granted ?? []);
    const required = deepClone(options.approvals?.required ?? []);
    const builtAt = options.builtAt ?? new Date().toISOString();

    const raw: GovernanceContext = {
      meta: {
        requestId: options.requestId,
        revision: options.revision ?? 0,
        phase: options.phase,
        gate: options.gate,
        builtAt,
        producerManifest: deepClone(options.producers),
      },
      request: deepClone(options.request),
      goal: deepClone(options.goal ?? EMPTY_GOAL),
      task: deepClone(options.task ?? EMPTY_TASK),
      requirements: deepClone(options.requirements ?? []),
      interpretations: deepClone(options.interpretations ?? []),
      assumptions: deepClone(options.assumptions ?? []),
      claims: deepClone(options.claims ?? []),
      evidence: {
        artifacts: deepClone(options.evidence?.artifacts ?? []),
        verificationRuns: deepClone(options.evidence?.verificationRuns ?? []),
        build: options.evidence?.build === undefined ? undefined : deepClone(options.evidence.build),
        dependencies: deepClone(options.evidence?.dependencies ?? []),
        resolvedDependencyGraph: deepClone(options.evidence?.resolvedDependencyGraph ?? []),
        architecture:
          options.evidence?.architecture === undefined
            ? undefined
            : deepClone(options.evidence.architecture),
      },
      memory: { entries: deepClone(options.memory ?? []) },
      risk: deepClone(options.risk ?? EMPTY_RISK),
      approvals: {
        required,
        granted,
        missing: deriveMissing(required, granted),
      },
      audit: deepClone(options.audit ?? []),
      environment: { role: options.environment ?? 'development' },
    };

    validateManifest(raw, options.producers, this.strictManifest);

    return deepFreeze(raw);
  }
}
