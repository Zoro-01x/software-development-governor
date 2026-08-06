import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GovernancePipeline, PipelineIntegrityError } from './governance-pipeline.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Engineering Governor Sprint');
  console.log('═'.repeat(60));
  console.log('This sprint routes through the GovernancePipeline.');
  console.log('All artifact writes are recorded in the AuditTrail.');
  console.log('No standalone writeArtifact() bypass exists.\n');

  const reqPath = join(ROOT, 'requirements', 'requirement.md');
  let requirements: string;
  try {
    requirements = readFileSync(reqPath, 'utf-8').trim();
  } catch {
    console.warn('No requirements/requirement.md found. Using default.');
    requirements = 'A personal portfolio website for a creative developer with a dark theme, project showcase, and subtle animations.';
  }

  console.log(`Requirement:    ${reqPath}`);
  console.log(`Constitution:   CONSTITUTION.md\n`);

  const pipeline = new GovernancePipeline();

  try {
    const result = await pipeline.run(requirements, {
      projectName: 'Sprint Output',
      projectDir: 'generated',
      onStage: (stage, status, detail) => {
        const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : '→';
        console.log(`  ${icon} ${stage}${detail ? ': ' + detail : ''}`);
      },
    });

    if (result.review) {
      const avgScore = result.review.scores.reduce((a, s) => a + s.score, 0) / result.review.scores.length;
      console.log(`\n  Governor Score:   ${avgScore.toFixed(1)}/10 — ${result.review.decision}`);
      if (result.review.criticalIssues.length > 0) {
        console.log(`  Critical Issues:  ${result.review.criticalIssues.length}`);
        for (const issue of result.review.criticalIssues) {
          console.log(`    [${issue.severity}] ${issue.issue.slice(0, 80)}`);
        }
      }
    }

    if (result.architecture) {
      console.log(`\n  ${'─'.repeat(50)}`);
      console.log('  Engineering Architecture');
      console.log(`  ${'─'.repeat(50)}`);
      console.log(`  State Machines:   ${result.architecture.stateMachines.length}`);
      console.log(`  Events:           ${result.architecture.events.length}`);
      console.log(`  Components:       ${result.architecture.components.length}`);
      console.log(`  Quality Gates:    ${result.architecture.qualityGates.length}`);
      console.log(`  Motion:           ${result.architecture.motion.easingDefaults.enter}`);
      console.log(`  Performance:      load ${result.architecture.performance.loadTime}, bundle ${result.architecture.performance.bundleSize}`);
    }

    if (result.implementation) {
      console.log(`\n  ${'─'.repeat(50)}`);
      console.log('  Verification');
      console.log(`  ${'─'.repeat(50)}`);
      console.log(`  Files:            ${result.implementation.generatedFiles.length}`);
      console.log(`  Compile:          ${result.implementation.compilePassed ? 'PASS' : 'FAIL'}`);
      console.log(`  Tests:            ${result.implementation.testPassed ? 'PASS' : 'FAIL'}`);
    }

    console.log(`\n  ${'─'.repeat(50)}`);
    console.log('  Audit Trail');
    console.log(`  ${'─'.repeat(50)}`);
    for (const record of result.auditTrail.getArtifacts()) {
      const path = record.path ? record.path.split(/[\\/]/).slice(-2).join('/') : record.stage;
      console.log(`  [${record.stage}] ${path}`);
    }

    console.log(`\n  ${'─'.repeat(50)}`);
    console.log(`  Result:           ${result.passed ? '✓ APPROVED' : '✗ FAILED'}`);

    process.exit(result.passed ? 0 : 1);

  } catch (err) {
    if (err instanceof PipelineIntegrityError) {
      console.log(`\n  ✗ Pipeline Integrity Error:`);
      console.log(`    ${err.message}`);
    } else {
      console.error('\n  ✗ Unexpected error:', err);
    }
    process.exit(1);
  }
}

main();
