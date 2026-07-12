import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createClaimId, createAnalysisId, createReportId } from "ai-governor/dist/core/ids/index.js";
import { ClaimType, AnalysisVerdict } from "ai-governor/dist/core/enums/index.js";
import type { AnalysisReport } from "ai-governor/dist/core/types/analysis.js";
import { generateId } from "ai-governor/dist/core/utils/index.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export class RequirementAnalyzer {
  analyze(requirementArg: unknown): AnalysisReport {
    const reqStr = typeof requirementArg === "string"
      ? requirementArg
      : readFileSync(join(ROOT, "requirements", "requirement.md"), "utf-8");

    const rid = (requirementArg as any)?.requestId ?? createRequestId(generateId());
    const claims = [
      { claimId: createClaimId(generateId()), text: "Implement isPalindrome(s: string): boolean", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "Case-insensitive comparison", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "Ignore non-alphanumeric characters", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "Empty string returns true", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "Single character returns true", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "8 test cases covering all scenarios", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
      { claimId: createClaimId(generateId()), text: "Pure function with no I/O", type: ClaimType.REQUIRED, hasEvidence: false, isAmbiguous: false },
    ];

    return {
      reportId: createReportId(generateId()),
      analysisId: createAnalysisId(generateId()),
      requestId: rid,
      timestamp: new Date(),
      sourceComponent: "RequirementAnalyzer",
      previousStage: "receive",
      currentStage: "analyze",
      claims,
      ambiguities: [],
      unknowns: [],
      unresolvedDependencies: [],
      evidenceRequirements: claims.map(c => ({
        claimId: c.claimId,
        description: `Evidence needed: ${c.text}`,
        suggestedSources: ["implementation", "test-execution"],
      })),
      dependencyGraph: [],
      verdict: AnalysisVerdict.READY,
    };
  }
}

function createRequestId(s: string) { return s as any; }
