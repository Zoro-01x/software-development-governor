import { isHumanConsent, isPinnedVersion } from '../constitution/glossary.js';
import { PolicyPort } from './engine.js';
import { RuntimeIntegrityError } from './errors.js';
import { GovernanceContext, RuleDecision } from './types.js';

// ONTOLOGY §8 (approved 2026-08-02) — Policy Model: canonical mapping ruleId → failAction.
// A policy is pure: it reads only the Context and returns what an *evaluated failure*
// of its rule means. Deterministic; zero knowledge of any AI model.
export interface PolicyDeclaration {
  ruleId: string;
  name: string;
  description: string;
  failAction(ctx: GovernanceContext): RuleDecision;
}

const POLICIES: Readonly<Record<string, PolicyDeclaration>> = {
  'E-001': {
    ruleId: 'E-001',
    name: 'Experience Prerequisite',
    description: 'Engineering work without an approved Experience Architecture needs human approval.',
    failAction: () => 'REQUIRE_APPROVAL',
  },
  'S-001': {
    ruleId: 'S-001',
    name: 'Requirements Foundation',
    description: 'Unapproved, missing, or duplicate requirement references block implementation work.',
    failAction: () => 'BLOCK',
  },
  'S-002': {
    ruleId: 'S-002',
    name: 'No Unverified Claims',
    description: 'A failed verification run blocks the claim it was meant to support.',
    failAction: () => 'BLOCK',
  },
  'S-003': {
    ruleId: 'S-003',
    name: 'Compliance Verification',
    description: 'Conformance violations block; a proposed requirement change without human consent needs approval.',
    failAction: (ctx) => {
      const amendmentProposed = ctx.request.proposesRequirementChange === true;
      const consented = ctx.approvals.granted.some(
        (d) => d.target === 'requirement-amendment' && isHumanConsent(d),
      );
      return amendmentProposed && !consented ? 'REQUIRE_APPROVAL' : 'BLOCK';
    },
  },
  'S-004': {
    ruleId: 'S-004',
    name: 'No Unverifiable Claims',
    description: 'An unverifiable claim without owner and rationale needs clarification.',
    failAction: () => 'ASK_FOR_CLARIFICATION',
  },
  'S-005': {
    ruleId: 'S-005',
    name: 'No Ambiguity, No Missing Requirements',
    description: 'Empty requirement text or an unresolved trace target blocks; ambiguity needs clarification.',
    failAction: (ctx) => {
      const emptyText = ctx.requirements.some((r) => !r.text?.trim());
      const missingTraceTarget = ctx.evidence.artifacts.some(
        (a) => (a.trace?.length ?? 0) > 0 && !ctx.requirements.some((r) => r.id === a.trace),
      );
      return emptyText || missingTraceTarget ? 'BLOCK' : 'ASK_FOR_CLARIFICATION';
    },
  },
  'S-006': {
    ruleId: 'S-006',
    name: 'Human Oversight',
    description: 'Any flagged oversight target without human consent needs approval.',
    failAction: () => 'REQUIRE_APPROVAL',
  },
  'S-007': {
    ruleId: 'S-007',
    name: 'Traceability',
    description: 'A governed artifact without an approved requirement trace blocks.',
    failAction: () => 'BLOCK',
  },
  'S-008': {
    ruleId: 'S-008',
    name: 'Reproducible Builds',
    description: 'An unpinned dependency blocks; non-determinism or divergent hashes retry the build.',
    failAction: (ctx) => {
      const unpinned = ctx.evidence.dependencies.some((d) => !isPinnedVersion(d.version));
      return unpinned ? 'BLOCK' : 'RETRY';
    },
  },
  'S-009': {
    ruleId: 'S-009',
    name: 'Verification Evidence Reproducibility',
    description: 'A run that is not reproducible, fingerprint-free, or version-mismatched must re-run.',
    failAction: () => 'RETRY',
  },
  'S-010': {
    ruleId: 'S-010',
    name: 'Every Change Traces Back',
    description: 'A change or hunk that does not trace to a requirement blocks.',
    failAction: () => 'BLOCK',
  },
  'S-011': {
    ruleId: 'S-011',
    name: 'Architecture Conformity',
    description: 'An unapproved architecture needs approval; unresolved violations or unscoped constraints block.',
    failAction: (ctx) => {
      const architecture = ctx.evidence.architecture;
      return architecture === undefined || architecture.approved !== true
        ? 'REQUIRE_APPROVAL'
        : 'BLOCK';
    },
  },
  'S-012': {
    ruleId: 'S-012',
    name: 'Dependency Accountability',
    description: 'An unaccountable dependency (unpinned, untraced, unjustified, unapproved, or duplicated) blocks.',
    failAction: () => 'BLOCK',
  },
};

export const POLICY_TABLE: Readonly<Record<string, PolicyDeclaration>> = POLICIES;

// Policy Engine (ONTOLOGY §8): owns the table, implements the engine's PolicyPort,
// and exposes every policy's semantics for documentation and audit.
export class PolicyEngine implements PolicyPort {
  failAction(ruleId: string, ctx: GovernanceContext): RuleDecision {
    const policy = POLICIES[ruleId];
    if (policy === undefined) {
      throw new RuntimeIntegrityError(`PolicyEngine: unknown rule "${ruleId}"`);
    }
    return policy.failAction(ctx);
  }

  declaration(ruleId: string): PolicyDeclaration {
    const policy = POLICIES[ruleId];
    if (policy === undefined) {
      throw new RuntimeIntegrityError(`PolicyEngine: unknown rule "${ruleId}"`);
    }
    return policy;
  }

  declarations(): ReadonlyArray<PolicyDeclaration> {
    return Object.values(POLICIES);
  }
}
