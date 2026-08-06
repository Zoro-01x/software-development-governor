import { GovernanceContext, RiskFactor, RiskScore } from './types.js';

// GRA §3 — Risk Score: computed by the runtime from verified context only.
// Deterministic, audited factor-by-factor. Risk never removes rules — it only adds
// scrutiny, so a lower score can never disable checks (ADV-17).
const MAX_SCORE = 100;

function factor(factor: string, points: number, evidence: string): RiskFactor {
  return { factor, points, evidence };
}

export function computeRisk(ctx: GovernanceContext): RiskScore {
  const factors: RiskFactor[] = [];
  const requestType = ctx.request.type;

  // Request type risk
  if (requestType === 'deployment') factors.push(factor('request-type', 30, requestType));
  else if (requestType === 'implementation') factors.push(factor('request-type', 10, requestType));
  else if (requestType === 'build' || requestType === 'verification') {
    factors.push(factor('request-type', 5, requestType));
  }

  // Environment role risk
  if (requestType === 'deployment' && ctx.environment.role === 'production') {
    factors.push(factor('environment', 20, 'production'));
  } else if (requestType === 'deployment' && ctx.environment.role === 'staging') {
    factors.push(factor('environment', 5, 'staging'));
  }

  // Ambiguity risk: material interpretations
  const material = ctx.interpretations.filter((i) => i.materialDifference === true).length;
  if (material > 0) {
    factors.push(factor('ambiguity', Math.min(material * 5, 25), `interpretations:${material}`));
  }

  // Unverified claims risk
  const unverified = ctx.claims.filter(
    (c) =>
      !ctx.evidence.verificationRuns.some(
        (r) => r.targetArtifactId === c.targetArtifactId && r.pass === true,
      ),
  ).length;
  if (unverified > 0) {
    factors.push(
      factor('unverified-claims', Math.min(unverified * 10, 30), `claims:${unverified}`),
    );
  }

  // Missing approvals risk
  if (ctx.approvals.missing.length > 0) {
    factors.push(
      factor(
        'missing-approvals',
        Math.min(ctx.approvals.missing.length * 20, 40),
        ctx.approvals.missing.join(','),
      ),
    );
  }

  // Dependency graph size risk
  if (ctx.evidence.resolvedDependencyGraph.length > 20) {
    factors.push(
      factor('dependency-graph', 10, `deps:${ctx.evidence.resolvedDependencyGraph.length}`),
    );
  }

  const total = factors.reduce((sum, f) => sum + f.points, 0);
  return { score: Math.min(MAX_SCORE, total), factors };
}

// GRA §3 — risk can only add scrutiny. The engine uses this to decide whether
// the full battery is forced; it never authorizes skipping mandatory rules.
export function isHighRisk(risk: RiskScore, threshold = 50): boolean {
  return risk.score >= threshold;
}
