import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { ExecutionStatus } from "ai-governor/dist/core/enums/index.js";
import type { ExecutionResult } from "ai-governor/dist/core/types/execution.js";
import type { ImplementationPlan } from "./implementation-planner.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const GENERATED_DIR = join(__dirname, "../../generated");

export class CodeGenerator {
  execute(plan: ImplementationPlan, _decision: unknown): ExecutionResult {
    if (!existsSync(GENERATED_DIR)) {
      mkdirSync(GENERATED_DIR, { recursive: true });
    }
    writeFileSync(join(GENERATED_DIR, "implementation.ts"), plan.implementation, "utf-8");
    writeFileSync(join(GENERATED_DIR, "implementation.test.ts"), plan.testCode, "utf-8");

    return {
      requestId: "" as any,
      eacId: "" as any,
      actionPerformed: "generate-code",
      input: JSON.stringify({ functionName: plan.functionName, testCases: plan.testCases.length }),
      output: JSON.stringify({
        files: ["generated/implementation.ts", "generated/implementation.test.ts"],
        functionName: plan.functionName,
      }),
      executionTimestamp: new Date(),
      executionDuration: 0,
      status: ExecutionStatus.COMPLETED,
    };
  }
}
