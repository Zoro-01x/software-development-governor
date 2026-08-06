import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { GovernancePipeline, PipelineIntegrityError } from './governance-pipeline.js';
import { PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS } from '../tests/fixtures/samples.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = join(__dirname, '..', 'artifacts', 'human-evaluation');

interface HumanEvalPage {
  project: string;
  requirements: string;
  architecture: Record<string, unknown>;
  governorReview: Record<string, unknown>;
  engineeringOutput: Record<string, unknown>;
  auditSummary: string[];
  eatResult: string;
  traceabilityMatrix: Record<string, string>;
  evaluationPrompts: string[];
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function generateEvaluationPage(projectName: string, requirements: string): HumanEvalPage | null {
  const pipeline = new GovernancePipeline();

  let result;
  try {
    result = await pipeline.run(requirements, { projectName });
  } catch (err) {
    if (err instanceof PipelineIntegrityError) {
      console.log(`  ✗ ${projectName}: ${err.message.split('\n')[0]}`);
    } else {
      console.log(`  ✗ ${projectName}: Unexpected error — ${err}`);
    }
    return null;
  }

  if (result.review.decision !== 'APPROVED') {
    console.log(`  ✗ ${projectName}: Experience Governor ${result.review.decision} (${result.review.summary.slice(0, 80)})`);
    console.log(`    → Evaluation page not generated. Architecture needs revision.`);
    return null;
  }

  const eng = result.architecture;
  const avgScore = result.review.scores.reduce((a, s) => a + s.score, 0) / result.review.scores.length;

  const traceMatrix: Record<string, string> = {};
  for (const component of eng.components) {
    const events = eng.events.filter(e =>
      component.eventsConsumed.includes(e.name) || component.eventsEmitted.includes(e.name)
    );
    traceMatrix[component.name] = [
      `Responsibility: ${component.responsibility}`,
      events.length > 0 ? `Events: ${events.map(e => e.name).join(', ')}` : 'No events',
    ].join(' | ');
  }

  const auditSummary = result.auditTrail.getArtifacts().map(a =>
    `[${a.stage}] ${a.outputPreview.slice(0, 60)}`
  );

  return {
    project: projectName,
    requirements,
    architecture: {
      vision: result.draft.architecture.vision,
      mission: result.draft.architecture.mission,
      audience: result.draft.architecture.audience,
      experienceGoals: result.draft.architecture.experienceGoals,
      emotionalJourney: result.draft.architecture.emotionalJourney,
      narrative: result.draft.architecture.narrative,
    },
    governorReview: {
      decision: result.review.decision,
      averageScore: avgScore.toFixed(1),
      scores: result.review.scores.map(s => `${s.dimension}: ${s.score}/10 — ${s.reason}`),
      criticalIssues: result.review.criticalIssues.map(i => `[${i.severity}] ${i.issue}`),
      recommendations: result.review.recommendations.map(r => `[${r.priority}] ${r.action} — ${r.rationale}`),
    },
    engineeringOutput: {
      stateMachines: eng.stateMachines.map(s => `${s.name}: ${s.states.join(' → ')}`),
      events: eng.events.map(e => `${e.name} (payload: ${e.payload})`),
      components: eng.components.map(c => `${c.name}: ${c.responsibility}`),
      motion: eng.motion,
      performance: eng.performance,
      qualityGates: eng.qualityGates.map(g => `${g.id}: ${g.description} — Pass: ${g.passCondition}`),
    },
    auditSummary,
    eatResult: result.eatResult ? `EAT: ${result.eatResult.overall} — ${result.eatResult.summary.slice(0, 100)}` : 'EAT not executed',
    traceabilityMatrix: traceMatrix,
    evaluationPrompts: [
      '1. Read the requirements. Does the Experience Architecture capture the right intent?',
      `2. Review the Governor scores (avg ${avgScore.toFixed(1)}/10). Do you agree with each score?`,
      '3. Look at the critical issues. Are there issues the governor missed?',
      '4. Review the recommendations. Would you prioritize differently?',
      '5. Examine the Engineering Architecture. Does it faithfully represent the experience?',
      '6. Trace one component through the matrix. Can you follow it back to a requirement?',
      '7. Review the audit trail. Are the approvals and versions recorded correctly?',
      '8. Rate the overall quality: Does the pipeline output match what a human designer would produce? (1-10)',
    ],
  };
}

function renderHtml(page: HumanEvalPage): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Human Evaluation — ${page.project}</title>
<style>
  body { font-family: -apple-system, sans-serif; max-width: 900px; margin: 40px auto; padding: 0 20px; background: #fafafa; color: #222; }
  h1 { border-bottom: 2px solid #333; padding-bottom: 8px; }
  h2 { color: #555; margin-top: 32px; }
  .section { background: white; border: 1px solid #ddd; border-radius: 8px; padding: 16px 20px; margin: 16px 0; }
  .score { display: inline-block; margin: 4px 8px 4px 0; padding: 2px 8px; border-radius: 4px; font-size: 0.9em; }
  .score-high { background: #d4edda; color: #155724; }
  .score-mid { background: #fff3cd; color: #856404; }
  .score-low { background: #f8d7da; color: #721c24; }
  .issue-high { color: #721c24; font-weight: bold; }
  .issue-med { color: #856404; }
  .rec-essential { color: #721c24; }
  .rec-recommended { color: #555; }
  pre { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; font-size: 0.9em; }
  li { margin: 4px 0; }
  .prompts { background: #e8f4f8; border-left: 4px solid #2196F3; padding: 16px; border-radius: 4px; }
  .trace { font-size: 0.85em; border-collapse: collapse; width: 100%; }
  .trace td { border: 1px solid #ddd; padding: 8px; vertical-align: top; }
  .trace tr:nth-child(even) { background: #f9f9f9; }
  .audit { background: #f0f0f0; font-family: monospace; font-size: 0.85em; padding: 8px 12px; border-radius: 4px; }
</style>
</head>
<body>
<h1>Human Evaluation — ${page.project}</h1>

<div class="section">
  <h2>Requirements</h2>
  <p>${page.requirements}</p>
</div>

<div class="section">
  <h2>Experience Architecture</h2>
  <p><strong>Vision:</strong> ${page.architecture.vision}</p>
  <p><strong>Mission:</strong> ${page.architecture.mission}</p>
  <p><strong>Audience:</strong> ${JSON.stringify(page.architecture.audience)}</p>
  <p><strong>Experience Goals:</strong></p>
  <ul>${(page.architecture.experienceGoals as string[]).map(g => '<li>' + g + '</li>').join('')}</ul>
  <p><strong>Emotional Journey:</strong> ${(page.architecture.emotionalJourney as Record<string, unknown>).states?.join(' → ') || ''}</p>
  <p><strong>Narrative:</strong> Hook: ${(page.architecture.narrative as Record<string, unknown>).hook}</p>
</div>

<div class="section">
  <h2>Governor Review</h2>
  <p><strong>Decision:</strong> ${page.governorReview.decision} | <strong>Average Score:</strong> ${page.governorReview.averageScore}/10</p>
  <h3>Scores</h3>
  ${(page.governorReview.scores as string[]).map(s => {
    const score = parseInt(s.match(/(\d+)\/10/)?.[1] || '5');
    const cls = score >= 7 ? 'score-high' : score >= 4 ? 'score-mid' : 'score-low';
    return '<span class="score ' + cls + '">' + s + '</span>';
  }).join('\n')}
  <h3>Critical Issues</h3>
  <ul>${(page.governorReview.criticalIssues as string[]).map(i => {
    const cls = i.startsWith('[high]') ? 'issue-high' : 'issue-med';
    return '<li class="' + cls + '">' + i + '</li>';
  }).join('')}</ul>
  <h3>Recommendations</h3>
  <ul>${(page.governorReview.recommendations as string[]).map(r => {
    const cls = r.startsWith('[essential]') ? 'rec-essential' : 'rec-recommended';
    return '<li class="' + cls + '">' + r + '</li>';
  }).join('')}</ul>
</div>

<div class="section">
  <h2>Engineering Architecture</h2>
  <h3>State Machines</h3>
  <ul>${(page.engineeringOutput.stateMachines as string[]).map(s => '<li>' + s + '</li>').join('')}</ul>
  <h3>Events</h3>
  <ul>${(page.engineeringOutput.events as string[]).map(e => '<li><code>' + e + '</code></li>').join('')}</ul>
  <h3>Components</h3>
  <ul>${(page.engineeringOutput.components as string[]).map(c => '<li>' + c + '</li>').join('')}</ul>
  <h3>Motion</h3>
  <pre>${JSON.stringify(page.engineeringOutput.motion, null, 2)}</pre>
  <h3>Performance Budget</h3>
  <pre>${JSON.stringify(page.engineeringOutput.performance, null, 2)}</pre>
  <h3>Quality Gates</h3>
  <ul>${(page.engineeringOutput.qualityGates as string[]).map(g => '<li>' + g + '</li>').join('')}</ul>
</div>

<div class="section">
  <h2>Audit Trail</h2>
  <div class="audit">
    ${page.auditSummary.map(a => '<div>' + a + '</div>').join('\n    ')}
  </div>
  <p><strong>EAT Result:</strong> ${page.eatResult}</p>
</div>

<div class="section">
  <h2>Traceability Matrix</h2>
  <table class="trace">
    <tr><th>Component</th><th>Trace</th></tr>
    ${Object.entries(page.traceabilityMatrix).map(([name, trace]) =>
      '<tr><td><strong>' + name + '</strong></td><td>' + trace + '</td></tr>'
    ).join('')}
  </table>
</div>

<div class="section prompts">
  <h2>Evaluation Prompts</h2>
  <ol>${page.evaluationPrompts.map(p => '<li>' + p + '</li>').join('')}</ol>
</div>

</body>
</html>`;
}

async function main(): Promise<void> {
  console.log('='.repeat(60));
  console.log('Human Evaluation — Governed Pipeline');
  console.log('='.repeat(60));
  console.log('Only APPROVED Experience Architectures generate evaluation pages.\n');

  ensureDir(OUTPUT_DIR);

  const projects = [
    { name: 'Portfolio Website', req: PORTFOLIO_REQUIREMENTS },
    { name: 'Analytics Dashboard', req: DASHBOARD_REQUIREMENTS },
    { name: 'CLI Tool', req: CLI_REQUIREMENTS },
  ];

  const generatedPages: string[] = [];

  for (const project of projects) {
    console.log(`Project: ${project.name}`);
    const page = generateEvaluationPage(project.name, project.req);
    if (page) {
      const filename = project.name.toLowerCase().replace(/\s+/g, '-') + '-eval.html';
      const filepath = join(OUTPUT_DIR, filename);
      writeFileSync(filepath, renderHtml(page), 'utf-8');
      generatedPages.push(filename);
      console.log(`  ✓ Wrote: ${filepath}`);
    }
    console.log();
  }

  let indexHtml = '<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Human Evaluation — Governed</title></head><body>';
  indexHtml += '<h1>Governance Stack — Human Evaluation</h1>';
  indexHtml += '<p>Generated ' + new Date().toISOString() + '</p>';
  indexHtml += '<p>Only projects that passed the Experience Governor are listed below.</p>';
  if (generatedPages.length === 0) {
    indexHtml += '<p><strong>No projects passed the Experience Governor. No evaluation pages to display.</strong></p>';
  } else {
    indexHtml += '<ul>';
    for (const f of generatedPages) {
      indexHtml += '<li><a href="' + f + '">' + f.replace('-eval.html', '').replace(/-/g, ' ') + '</a></li>';
    }
    indexHtml += '</ul>';
  }
  indexHtml += '</body></html>';
  writeFileSync(join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log('Wrote: ' + join(OUTPUT_DIR, 'index.html'));
}

main();
