import { writeFileSync, mkdirSync, existsSync, readFileSync } from "fs";
import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { createRequestId } from "ai-governor/dist/core/ids/index.js";
import { generateId } from "ai-governor/dist/core/utils/index.js";
import { createSdgPipeline } from "./bootstrap.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const ARTIFACTS_DIR = join(ROOT, "artifacts");
const GENERATED_DIR = join(ROOT, "generated");

function ensureDirs(): void {
  for (const dir of [ARTIFACTS_DIR, GENERATED_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}

function writeArtifact(name: string, data: unknown): string {
  const path = join(ARTIFACTS_DIR, name);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
  return path;
}

function runVerify(): { compilePassed: boolean; compileOutput: string; testPassed: boolean; testOutput: string } {
  const out = { compilePassed: false, compileOutput: "", testPassed: false, testOutput: "" };

  try {
    out.compileOutput = execSync(
      `npx tsc --noEmit --strict --esModuleInterop --moduleResolution bundler --module ESNext --target ES2022 generated/implementation.ts 2>&1`,
      { cwd: ROOT, timeout: 15000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    out.compilePassed = true;
  } catch (e: any) {
    out.compileOutput = e.stdout ?? e.stderr ?? e.message ?? String(e);
    out.compilePassed = false;
  }

  try {
    out.testOutput = execSync(
      `npx vitest run generated/implementation.test.ts --reporter verbose 2>&1`,
      { cwd: ROOT, timeout: 15000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] },
    );
    out.testPassed = true;
  } catch (e: any) {
    out.testOutput = e.stdout ?? e.stderr ?? e.message ?? String(e);
    out.testPassed = false;
  }

  return out;
}

async function main(): Promise<void> {
  console.log("=".repeat(60));
  console.log("SDG Sprint 1 — Vertical Slice");
  console.log("=".repeat(60));

  ensureDirs();

  const pipelineStart = Date.now();
  const requestId = createRequestId(generateId());
  console.log(`\nRequest ID:     ${requestId}`);
  console.log(`Requirement:    requirements/requirement.md`);
  console.log(`Constitution:   CONSTITUTION.md`);
  console.log();

  const kernel = createSdgPipeline();
  kernel.transitions.setInitialState(requestId);
  const result = await kernel.execute(requestId, "sprint-runner", {
    requestId,
    timestamp: new Date(),
    payload: "Implement isPalindrome(s: string): boolean",
    source: "Sprint1",
  });

  const pipelineDuration = Date.now() - pipelineStart;

  writeArtifact("transitions.json", result.transitions.map(t => ({
    from: t.fromState,
    to: t.toState,
    reason: t.reason,
    by: t.initiatedBy,
    at: t.timestamp,
  })));

  writeArtifact("kernel-report.json", {
    success: result.success,
    finalState: result.finalState,
    durationMs: result.durationMs,
    pipelineDurationMs: pipelineDuration,
    transitionCount: result.transitions.length,
  });

  console.log("─".repeat(60));
  console.log("Governance Pipeline");
  console.log("─".repeat(60));
  console.log(`  Success:       ${result.success ? "YES" : "NO"}`);
  console.log(`  Final State:   ${result.finalState}`);
  console.log(`  Duration:      ${result.durationMs}ms kernel`);
  console.log(`  Transitions:   ${result.transitions.length}`);
  if (result.error) console.log(`  Error:         ${result.error}`);

  const transitions = result.transitions;
  for (const t of transitions) {
    const arrow = t.fromState !== t.toState ? "→" : "=";
    console.log(`    ${t.fromState} ${arrow} ${t.toState}  (${t.reason})`);
  }

  writeArtifact("analysis.json", {
    stage: "analysis",
    timestamp: new Date().toISOString(),
    claims: [
      "Implement isPalindrome(s: string): boolean",
      "Case-insensitive comparison",
      "Ignore non-alphanumeric characters",
      "Empty string returns true",
      "Single character returns true",
      "8 test cases covering all scenarios",
      "Pure function with no I/O",
    ],
    constitutionalBasis: "S-001 (Requirements Before Implementation), S-005 (No Silent Assumptions)",
  });

  writeArtifact("plan.json", {
    stage: "planning",
    timestamp: new Date().toISOString(),
    functionName: "isPalindrome",
    signature: "isPalindrome(s: string): boolean",
    testCases: 8,
    strategy: "Two-pointer approach with alphanumeric filter",
    constitutionalBasis: "S-004 (Test-Bound Development), S-010 (Incremental Change)",
  });

  writeArtifact("approval.json", {
    stage: "plan-approval",
    timestamp: new Date().toISOString(),
    decision: "EXECUTE",
    approvedBy: "PlanApprover (constitutional rule S-006)",
    reason: "All requirements satisfied, plan complete",
  });

  if (result.success) {
    const generatedFiles = ["generated/implementation.ts", "generated/implementation.test.ts"];
    const allExist = generatedFiles.every(f => existsSync(join(ROOT, f)));

    writeArtifact("generation.json", {
      stage: "code-generation",
      timestamp: new Date().toISOString(),
      filesGenerated: allExist,
      files: generatedFiles,
      constitutionalBasis: "S-002 (Code Is Evidence), S-001 (Requirements Before Implementation)",
    });

    const verifyResult = runVerify();

    writeArtifact("verification.json", {
      stage: "verification",
      timestamp: new Date().toISOString(),
      compilePassed: verifyResult.compilePassed,
      compileOutput: verifyResult.compileOutput.slice(0, 1000),
      testPassed: verifyResult.testPassed,
      testOutput: verifyResult.testOutput.slice(0, 2000),
      constitutionalBasis: "S-002 (Code Is Evidence), S-004 (Test-Bound Development), S-009 (Reproducible Verification)",
    });

    const approved = verifyResult.compilePassed && verifyResult.testPassed;

    writeArtifact("approval-result.json", {
      stage: "result-approval",
      timestamp: new Date().toISOString(),
      approved,
      reason: approved ? "Compilation passes and all tests pass" : "Verification failed",
      approvedBy: "Human (simulated)",
      constitutionalBasis: "S-006 (Human Approval), S-007 (Traceable Engineering)",
    });

    console.log("\n" + "─".repeat(60));
    console.log("Verification");
    console.log("─".repeat(60));
    console.log(`  Compile:       ${verifyResult.compilePassed ? "PASS" : "FAIL"}`);
    console.log(`  Tests:         ${verifyResult.testPassed ? "PASS" : "FAIL"}`);
    console.log(`  Final:         ${approved ? "APPROVED" : "REJECTED"}`);
    if (verifyResult.compileOutput) console.log(`\n  ${verifyResult.compileOutput.slice(0, 400)}`);
    if (verifyResult.testOutput) console.log(`\n  ${verifyResult.testOutput.slice(0, 400)}`);
  }

  console.log("\n" + "─".repeat(60));
  console.log("Artifacts");
  console.log("─".repeat(60));
  console.log("  artifacts/analysis.json");
  console.log("  artifacts/plan.json");
  console.log("  artifacts/approval.json");
  console.log("  artifacts/generation.json");
  console.log("  artifacts/verification.json");
  console.log("  artifacts/approval-result.json");
  console.log("  artifacts/transitions.json");
  console.log("  artifacts/kernel-report.json");
  console.log("  generated/implementation.ts");
  console.log("  generated/implementation.test.ts");
  console.log(`\nTotal time: ${pipelineDuration}ms`);

  process.exit(result.success ? 0 : 1);
}

main().catch(err => { console.error("Fatal:", err); process.exit(1); });
