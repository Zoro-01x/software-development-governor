import {
  ArtifactRecord,
  GovernedDecisionRecord,
  RequirementRecord,
  VerificationRunRecord,
} from './types.js';

const DECISION_VALUES = ['EXECUTE', 'STOP', 'RETRIEVE_EVIDENCE', 'ASK_HUMAN'];

export function isGovernedDecision(d?: GovernedDecisionRecord): boolean {
  return (
    d !== undefined &&
    d.decisionId.length > 0 &&
    DECISION_VALUES.includes(d.decision) &&
    d.reason.length > 0 &&
    d.validationReportId.length > 0 &&
    d.governanceChecks === 'PASS' &&
    d.timestamp.length > 0
  );
}

export function isHumanConsent(d?: GovernedDecisionRecord): boolean {
  if (!isGovernedDecision(d) || d === undefined) return false;
  const human =
    (typeof d.authorizedBy === 'string' && d.authorizedBy.length > 0) ||
    (typeof d.issuerId === 'string' && d.issuerId.length > 0);
  return human;
}

export function isApprovedRequirement(r?: RequirementRecord): boolean {
  return (
    r !== undefined &&
    r.id.length > 0 &&
    r.text.length > 0 &&
    r.status === 'approved' &&
    r.approval !== undefined &&
    isGovernedDecision(r.approval) &&
    r.approval.decision === 'EXECUTE'
  );
}

export function isPassingAutomatedVerification(
  run: VerificationRunRecord,
  artifact?: ArtifactRecord,
): boolean {
  return (
    run.pass === true &&
    run.reproducible === true &&
    run.externalStateDependency === false &&
    run.sourceVersion !== undefined &&
    run.sourceVersion.length > 0 &&
    (artifact === undefined ||
      artifact.sourceVersion === undefined ||
      run.sourceVersion === artifact.sourceVersion)
  );
}

export function isPinnedVersion(version?: string): boolean {
  if (version === undefined || version.length === 0) return false;
  if (/[*^~]|latest/i.test(version)) return false;
  return true;
}
