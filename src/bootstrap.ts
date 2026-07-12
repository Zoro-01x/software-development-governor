import { Kernel } from "ai-governor/dist/runtime/kernel/index.js";
import type { PhaseDefinition } from "ai-governor/dist/runtime/kernel/index.js";
import { LifecycleState } from "ai-governor/dist/core/enums/index.js";
import { RequirementAnalyzer } from "./components/requirement-analyzer.js";
import { ImplementationPlanner } from "./components/implementation-planner.js";
import { PlanApprover } from "./components/plan-approver.js";
import { CodeGenerator } from "./components/code-generator.js";
import { Verifier } from "./components/verifier.js";

export function createSdgPipeline(): Kernel {
  const kernel = new Kernel({
    phaseTimeoutMs: 60000,
    collectReports: true,
    stopOnDispatchError: true,
  });

  const analyzer = new RequirementAnalyzer();
  const planner = new ImplementationPlanner();
  const approver = new PlanApprover();
  const generator = new CodeGenerator();
  const verifier = new Verifier();

  kernel.dispatcher.register("AnalyzerInput", {
    analyze: (req: unknown) => analyzer.analyze(req),
  });

  kernel.dispatcher.register("EvidenceCollector", {
    collectEvidence: (analysis: unknown) => planner.collectEvidence(analysis),
  });

  kernel.dispatcher.register("DecisionMaker", {
    decide: (plan: unknown) => approver.decide(plan),
  });

  kernel.dispatcher.register("ActionExecutor", {
    execute: (plan: unknown, decision: unknown) => generator.execute(plan as any, decision),
  });

  kernel.dispatcher.register("ClaimValidator", {
    validate: (execResult: unknown) => verifier.validate(execResult as any),
  });

  const sdgPhases: PhaseDefinition[] = [
    {
      label: "analyze-requirement",
      fromState: LifecycleState.RECEIVING,
      toState: LifecycleState.ANALYZING,
      interfaceName: "AnalyzerInput",
      methodName: "analyze",
      argRefs: [],
    },
    {
      label: "plan-implementation",
      fromState: LifecycleState.ANALYZING,
      toState: LifecycleState.COLLECTING_EVIDENCE,
      interfaceName: "EvidenceCollector",
      methodName: "collectEvidence",
      argRefs: ["analyze-requirement"],
    },
    {
      label: "approve-plan",
      fromState: LifecycleState.COLLECTING_EVIDENCE,
      toState: LifecycleState.VALIDATING,
      interfaceName: "DecisionMaker",
      methodName: "decide",
      argRefs: ["plan-implementation"],
    },
    {
      label: "generate-code",
      fromState: LifecycleState.VALIDATING,
      toState: LifecycleState.DECIDING,
      interfaceName: "ActionExecutor",
      methodName: "execute",
      argRefs: ["plan-implementation", "approve-plan"],
    },
    {
      label: "verify",
      fromState: LifecycleState.DECIDING,
      toState: LifecycleState.EXECUTING,
      interfaceName: "ClaimValidator",
      methodName: "validate",
      argRefs: ["generate-code"],
    },
  ];

  kernel.setPhases(sdgPhases);

  return kernel;
}
