export type RequestType =
  | 'requirement-analysis'
  | 'technical-design'
  | 'implementation'
  | 'verification'
  | 'build'
  | 'deployment'
  | 'change'
  | 'dependency-introduction';

export type DecisionValue = 'EXECUTE' | 'STOP' | 'RETRIEVE_EVIDENCE' | 'ASK_HUMAN';
export type RuleOutcome = 'pass' | 'fail' | 'skip';
export type RuleSeverity = 'error' | 'warning' | 'info';

export interface RuleDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly severity: RuleSeverity;
  evaluate(input: unknown): RuleOutcome;
}

export interface GovernedDecisionRecord {
  decisionId: string;
  decision: DecisionValue;
  reason: string;
  validationReportId: string;
  governanceChecks: 'PASS' | string;
  timestamp: string;
  target?: string;
  authorizedBy?: string;
  issuerId?: string;
}

export interface RequirementRecord {
  id: string;
  text: string;
  status: 'approved' | 'draft' | 'rejected' | 'amended';
  approval?: GovernedDecisionRecord;
}

export interface InterpretationRecord {
  requirementId: string;
  interpretation: string;
  materialDifference: boolean;
}

export interface AssumptionRecord {
  requirementId: string;
  text: string;
  recorded: boolean;
  approved: boolean;
  decision?: GovernedDecisionRecord;
}

export type ArtifactKind = 'source' | 'test' | 'configuration' | 'documentation' | 'deployment' | 'other';

export interface ArtifactRecord {
  id: string;
  kind: ArtifactKind;
  trace?: string;
  sourceVersion?: string;
  conformanceViolations?: string[];
}

export interface HunkRecord {
  artifactId: string;
  requiredByRequirement: boolean;
}

export interface ChangeRecord {
  id: string;
  requirementIds: string[];
  hunks: HunkRecord[];
}

export interface ClaimRecord {
  id: string;
  text: string;
  targetArtifactId: string;
  unverifiable?: boolean;
  owner?: string;
  rationale?: string;
}

export interface VerificationRunRecord {
  id: string;
  targetArtifactId: string;
  pass: boolean;
  reproducible: boolean;
  externalStateDependency: boolean;
  sourceVersion?: string;
  environmentFingerprint?: string;
}

export interface BuildRecord {
  inputFingerprint: string;
  outputHashes: string[];
  nonDeterminismSources: string[];
}

export interface DependencyRecord {
  name: string;
  version?: string;
  requirementId?: string;
  justification?: string;
  approval?: GovernedDecisionRecord;
}

export interface ConstraintRecord {
  id: string;
  scope?: string;
  kind: 'dependency-direction' | 'interface-contract' | 'structural';
}

export interface DriftRecord {
  artifactId: string;
  constraintId: string;
  resolved?: boolean;
}

export interface ArchitectureRecord {
  approved: boolean;
  constraints: ConstraintRecord[];
  violations: DriftRecord[];
}

export interface RequestRecord {
  id: string;
  type: RequestType;
  requirementIds?: string[];
  proposesRequirementChange?: boolean;
  proposesArchitecturalDecision?: boolean;
}

export interface ConstitutionContext {
  request?: RequestRecord;
  experienceApproval?: GovernedDecisionRecord;
  requirements: RequirementRecord[];
  requirementInterpretations: InterpretationRecord[];
  assumptions: AssumptionRecord[];
  decisions: GovernedDecisionRecord[];
  artifacts: ArtifactRecord[];
  changes: ChangeRecord[];
  claims: ClaimRecord[];
  verificationRuns: VerificationRunRecord[];
  build?: BuildRecord;
  dependencies: DependencyRecord[];
  resolvedDependencyGraph: string[];
  architecture?: ArchitectureRecord;
  environment?: { role: 'production' | 'staging' | 'development' };
}

export const ENGINEERING_REQUEST_TYPES: ReadonlyArray<RequestType> = [
  'requirement-analysis',
  'technical-design',
  'implementation',
];
