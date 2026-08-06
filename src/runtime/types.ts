import {
  ArchitectureRecord,
  ArtifactRecord,
  AssumptionRecord,
  BuildRecord,
  ClaimRecord,
  DependencyRecord,
  GovernedDecisionRecord,
  HunkRecord,
  InterpretationRecord,
  RequestRecord,
  RequirementRecord,
  VerificationRunRecord,
} from '../constitution/types.js';

export {
  ArchitectureRecord,
  ArtifactRecord,
  AssumptionRecord,
  BuildRecord,
  ClaimRecord,
  DependencyRecord,
  GovernedDecisionRecord,
  HunkRecord,
  InterpretationRecord,
  RequestRecord,
  RequirementRecord,
  VerificationRunRecord,
} from '../constitution/types.js';

// GRA §2 — request lifecycle phases (incl. the declared BUILD sub-phase)
export type PhaseName =
  | 'request-received'
  | 'intent-analysis'
  | 'clarification'
  | 'planning'
  | 'task-compilation'
  | 'execution'
  | 'verification'
  | 'build'
  | 'memory-update'
  | 'human-approval'
  | 'completion';

export const PHASE_ORDER: ReadonlyArray<PhaseName> = [
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

// GRA §2 — gate timing
export type GateKind = 'pre' | 'post' | 'final';

// GRA §4 — decision set (lattice ranks in §4; order here is descriptive only)
// NO_ACTION_REQUIRED = "nothing to verify" (rule not applicable), distinct from RETRIEVE_EVIDENCE.
export type RuleDecision =
  | 'ALLOW'
  | 'BLOCK'
  | 'REQUIRE_APPROVAL'
  | 'ASK_FOR_CLARIFICATION'
  | 'RETRIEVE_EVIDENCE'
  | 'RETRY'
  | 'ARCHIVE'
  | 'NO_ACTION_REQUIRED';

export const DECISION_LATTICE: Readonly<Record<RuleDecision, number>> = {
  BLOCK: 7,
  REQUIRE_APPROVAL: 6,
  ASK_FOR_CLARIFICATION: 5,
  RETRIEVE_EVIDENCE: 4,
  RETRY: 3,
  ARCHIVE: 2,
  ALLOW: 1,
  NO_ACTION_REQUIRED: 0,
};

export type EnvironmentRole = 'production' | 'staging' | 'development';

// GRA §3 — producer manifest: every field's origin is auditable
export interface ProducerManifestEntry {
  field: string;
  producer: string;
  version: string;
  wroteAt: string;
}

export interface GovernanceMeta {
  requestId: string;
  revision: number;
  phase: PhaseName;
  gate: GateKind;
  builtAt: string;
  producerManifest: ProducerManifestEntry[];
}

export type GoalStatus = 'active' | 'paused' | 'complete' | 'abandoned';

export interface GoalRecord {
  id: string;
  text: string;
  status: GoalStatus;
}

export interface TaskRecord {
  id: string;
  requirementIds: string[];
  hunks: HunkRecord[];
  introducedDependencies: string[];
}

// GRA §3 — BOUNDED memory snapshot (relevant entries only)
export interface MemoryEntry {
  id: string;
  content: string;
  provenance: string;
  confidence: number;
  source: string;
  writtenAt: string;
  archived: boolean;
}

export interface MemorySnapshot {
  entries: MemoryEntry[];
}

export interface RiskFactor {
  factor: string;
  points: number;
  evidence: string;
}

export interface RiskScore {
  score: number;
  factors: RiskFactor[];
}

export interface ApprovalRequirement {
  target: string;
  requiredByRules: string[];
}

export interface ApprovalStatus {
  required: ApprovalRequirement[];
  granted: GovernedDecisionRecord[];
  missing: string[];
}

export interface RuntimeRequestRecord extends RequestRecord {
  rawText: string;
  normalizedIntent: string;
}

export interface EvidenceSection {
  artifacts: ArtifactRecord[];
  verificationRuns: VerificationRunRecord[];
  build?: BuildRecord;
  dependencies: DependencyRecord[];
  resolvedDependencyGraph: string[];
  architecture?: ArchitectureRecord;
}

// GRA §3 — Governance Context: the single object every rule receives
export interface GovernanceContext {
  meta: GovernanceMeta;
  request: RuntimeRequestRecord;
  goal: GoalRecord;
  task: TaskRecord;
  requirements: RequirementRecord[];
  interpretations: InterpretationRecord[];
  assumptions: AssumptionRecord[];
  claims: ClaimRecord[];
  evidence: EvidenceSection;
  memory: MemorySnapshot;
  risk: RiskScore;
  approvals: ApprovalStatus;
  audit: AuditEntry[];
  environment: { role: EnvironmentRole };
}

// GRA §6 — audit entry schema (store implemented by the Audit Logger component)
export type AuditActor = 'runtime' | 'human' | 'model' | 'system';
export type AuditEvidenceKind =
  | 'verification-run'
  | 'approval'
  | 'memory'
  | 'context-field'
  | 'producer-manifest';
export type AuditObjectKind =
  | 'artifact'
  | 'requirement'
  | 'change'
  | 'dependency'
  | 'memory'
  | 'request'
  | 'approval';

export interface AuditEvidenceRef {
  kind: AuditEvidenceKind;
  id: string;
  version?: string;
  reference?: string;
}

export interface AuditAffectedObject {
  kind: AuditObjectKind;
  id: string;
}

export interface AuditEntry {
  id: string;
  requestId: string;
  revision: number;
  phase: PhaseName;
  gate: GateKind;
  timestamp: string;
  ruleId: string;
  ruleName: string;
  outcome: 'pass' | 'fail' | 'na';
  decision: RuleDecision;
  vacuous: boolean;
  evidence: AuditEvidenceRef[];
  reason: string;
  affectedObjects: AuditAffectedObject[];
  actor: AuditActor;
  actionTaken?: string;
  prevHash: string | null;
  hash: string;
}
