import { createDecisionId } from "ai-governor/dist/core/ids/index.js";
import { DecisionOutcome, GovernanceCheckStatus } from "ai-governor/dist/core/enums/index.js";
import type { DecisionRecord } from "ai-governor/dist/core/types/decision.js";
import { generateId } from "ai-governor/dist/core/utils/index.js";
import type { ImplementationPlan } from "./implementation-planner.js";

export class PlanApprover {
  decide(plan: unknown): DecisionRecord {
    const p = plan as ImplementationPlan;

    return {
      decisionId: createDecisionId(generateId()),
      requestId: "" as any,
      decision: DecisionOutcome.EXECUTE,
      reason: `Plan approved: implement ${p.functionName} with ${p.testCases.length} test cases`,
      validationReportId: "" as any,
      governanceChecks: GovernanceCheckStatus.ALL_PASS,
      timestamp: new Date(),
    };
  }
}
