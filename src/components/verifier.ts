import { execSync } from "child_process";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import type { ExecutionResult } from "ai-governor/dist/core/types/execution.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "../..");

export interface VerificationData {
  readonly compilePassed: boolean;
  readonly compileOutput: string;
  readonly testPassed: boolean;
  readonly testOutput: string;
  readonly testSummary: string;
}

export class Verifier {
  validate(_execResult: ExecutionResult): VerificationData {
    const data: VerificationData = { compilePassed: false, compileOutput: "", testPassed: false, testOutput: "", testSummary: "" };

    data.compileOutput = this.run(`npx tsc --noEmit --strict --esModuleInterop --moduleResolution bundler --module ESNext --target ES2022 generated/implementation.ts`);
    data.compilePassed = !/error|TS\d+/i.test(data.compileOutput);

    const testResult = this.runWithCode(`npx vitest run generated/implementation.test.ts --reporter verbose 2>&1`);
    data.testOutput = testResult.output;
    data.testPassed = testResult.code === 0;
    data.testSummary = data.testPassed ? "All 8 tests passed" : "Tests failed";

    return data;
  }

  private run(cmd: string): string {
    try { return execSync(cmd, { cwd: ROOT, timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] }); }
    catch (e: any) { return (e.stdout ?? "") + (e.stderr ?? ""); }
  }

  private runWithCode(cmd: string): { output: string; code: number } {
    try {
      const stdout = execSync(cmd, { cwd: ROOT, timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
      return { output: stdout, code: 0 };
    } catch (e: any) {
      return { output: (e.stdout ?? "") + (e.stderr ?? ""), code: e.status ?? 1 };
    }
  }
}
