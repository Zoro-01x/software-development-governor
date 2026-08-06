import { GovernancePipeline, PipelineIntegrityError } from './governance-pipeline.js';
import { createDefaultRegistry } from './adapters/registry.js';

async function runFullPipeline(): Promise<void> {
  console.log('='.repeat(60));
  console.log('FULL GOVERNANCE PIPELINE — SINGLE ENTRY POINT');
  console.log('='.repeat(60));
  console.log('All artifact-producing paths route through this pipeline.');
  console.log('Bypassing any stage is architecturally impossible.\n');

  const requirements =
    'A personal portfolio website for a creative developer. ' +
    'Visitors should feel curiosity and wonder when exploring projects. ' +
    'The site needs a dark theme, project showcase, and subtle animations. ' +
    'The audience is tech recruiters and potential clients.';

  console.log('Requirements:');
  console.log(`  "${requirements}"\n`);

  const registry = createDefaultRegistry();
  const provider = registry.createProvider('rule-based');
  console.log(`Reasoning provider: ${provider.name}\n`);

  const pipeline = new GovernancePipeline(provider);

  try {
    const result = await pipeline.run(requirements, {
      projectName: 'Portfolio',
      projectDir: 'generated',
      onStage: (stage, status, detail) => {
        const icon = status === 'pass' ? '✓' : status === 'fail' ? '✗' : status === 'start' ? '→' : '•';
        if (detail) {
          console.log(`  ${icon} ${stage}: ${detail}`);
        }
      },
    });

    if (result.review) {
      const avgScore = result.review.scores.reduce((a, s) => a + s.score, 0) / result.review.scores.length;
      console.log(`\n${'─'.repeat(60)}`);
      console.log('Governor Scores');
      console.log('─'.repeat(60));
      for (const s of result.review.scores) {
        console.log(`  ${s.dimension}: ${s.score}/10`);
      }
      console.log(`  Average: ${avgScore.toFixed(1)}/10`);
    }

    if (result.architecture) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log('Engineering Architecture');
      console.log('─'.repeat(60));
      console.log(`  State Machines: ${result.architecture.stateMachines.length}`);
      console.log(`  Events:         ${result.architecture.events.length}`);
      console.log(`  Components:     ${result.architecture.components.length}`);
      console.log(`  Quality Gates:  ${result.architecture.qualityGates.length}`);
    }

    if (result.implementation) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log('Implementation');
      console.log('─'.repeat(60));
      console.log(`  Files:          ${result.implementation.generatedFiles.length}`);
      console.log(`  Compile:        ${result.implementation.compilePassed ? 'PASS' : 'FAIL'}`);
      console.log(`  Tests:          ${result.implementation.testPassed ? 'PASS' : 'FAIL'}`);
    }

    if (result.eatResult) {
      console.log(`\n${'─'.repeat(60)}`);
      console.log('EAT Decision');
      console.log('─'.repeat(60));
      console.log(`  ${result.eatResult.overall}`);
      console.log(`  ${result.eatResult.summary}`);
      for (const item of result.eatResult.feedbackLoop) {
        console.log(`  → ${item}`);
      }
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log('Audit Trail');
    console.log('─'.repeat(60));
    for (const record of result.auditTrail.getArtifacts()) {
      console.log(`  [${record.stage}] ${record.path ? record.path.slice(-40) : record.outputPreview.slice(0, 40)}`);
    }

    console.log(`\n${'─'.repeat(60)}`);
    console.log(`Pipeline Result: ${result.passed ? '✓ ALL PASSED' : '✗ FAILED'}`);
    console.log('─'.repeat(60));

  } catch (err) {
    if (err instanceof PipelineIntegrityError) {
      console.log(`\n✗ Pipeline Integrity Error:`);
      console.log(`  ${err.message}`);
    } else {
      console.error('\n✗ Unexpected error:', err);
    }
    process.exit(1);
  }
}

runFullPipeline();
