import { describe, it, expect } from 'vitest';
import { ExperienceDesigner, ExperienceDraft, DesignRationale, OpenQuestion } from '../src/components/experience-designer.js';
import { ExperienceGovernor, GovernorResult, ExperienceArchitecture } from '../src/components/experience-governor.js';
import { ExperienceCompiler, EngineeringArchitecture } from '../src/components/experience-compiler.js';
import { PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS } from './fixtures/samples.js';

interface PipelineResult {
  requirements: string;
  draft: ExperienceDraft;
  review: GovernorResult;
  engineering: EngineeringArchitecture;
  passed: boolean;
  stages: Array<{ name: string; status: 'pass' | 'fail'; detail: string }>;
}

async function runPipeline(requirements: string, projectName?: string): Promise<PipelineResult> {
  const stages: PipelineResult['stages'] = [];
  const designer = new ExperienceDesigner();
  const governor = new ExperienceGovernor();
  const compiler = new ExperienceCompiler();

  const draft = await designer.design({ requirements, projectName });
  stages.push({
    name: 'Experience Designer',
    status: draft.architecture.vision.length > 0 ? 'pass' : 'fail',
    detail: `Produced architecture with ${draft.rationale.length} rationale entries, ${draft.openQuestions.length} open questions`,
  });

  const review = governor.evaluate(draft.architecture);
  stages.push({
    name: 'Experience Governor',
    status: review.scores.length === 10 ? 'pass' : 'fail',
    detail: `Decision: ${review.decision}, Avg: ${(review.scores.reduce((a, s) => a + s.score, 0) / review.scores.length).toFixed(1)}/10, ${review.criticalIssues.length} issues`,
  });

  const engineering = compiler.compile(draft.architecture);
  const engValid =
    engineering.stateMachines.length >= 2 &&
    engineering.events.length > 0 &&
    engineering.components.length > 0 &&
    engineering.qualityGates.length > 0;
  stages.push({
    name: 'Experience Compiler',
    status: engValid ? 'pass' : 'fail',
    detail: `Produced ${engineering.stateMachines.length} state machines, ${engineering.events.length} events, ${engineering.components.length} components, ${engineering.qualityGates.length} quality gates`,
  });

  const passed = stages.every(s => s.status === 'pass');

  return { requirements, draft, review, engineering, passed, stages };
}

describe('End-to-End: Portfolio Website', async () => {
  const result = await runPipeline(PORTFOLIO_REQUIREMENTS, 'Portfolio');

  it('passes all pipeline stages', async () => {
    expect(result.passed).toBe(true);
  });

  it('Experience Designer produces complete architecture', () => {
    const stage = result.stages.find(s => s.name === 'Experience Designer')!;
    expect(stage.status).toBe('pass');
    expect(result.draft.architecture.experienceGoals.length).toBeGreaterThanOrEqual(3);
    expect(result.draft.architecture.emotionalJourney.states.length).toBeGreaterThanOrEqual(2);
  });

  it('Experience Governor validates all 10 dimensions', () => {
    const stage = result.stages.find(s => s.name === 'Experience Governor')!;
    expect(stage.status).toBe('pass');
    expect(result.review.scores).toHaveLength(10);
  });

  it('Experience Compiler produces rich engineering output', () => {
    const stage = result.stages.find(s => s.name === 'Experience Compiler')!;
    expect(stage.status).toBe('pass');
    expect(result.engineering.stateMachines.length).toBeGreaterThanOrEqual(2);
    expect(result.engineering.events.length).toBeGreaterThanOrEqual(3);
    expect(result.engineering.components.length).toBeGreaterThanOrEqual(2);
    expect(result.engineering.qualityGates.length).toBeGreaterThanOrEqual(3);
  });

  it('motion config is populated', () => {
    expect(result.engineering.motion.easingDefaults.enter).toContain('cubic-bezier');
    expect(result.engineering.motion.durationDefaults.micro).toMatch(/ms$/);
  });

  it('design tokens are structured', () => {
    expect(result.engineering.tokens.color).toBeDefined();
    expect(result.engineering.tokens.typography).toBeDefined();
  });

  it('performance budget is set', () => {
    expect(result.engineering.performance.loadTime).toMatch(/s$/);
    expect(result.engineering.performance.bundleSize).toMatch(/KB$/);
  });

  it('instrumentation covers emotion and metrics', () => {
    const hasEmotionEvents = result.engineering.instrumentation.some(e => e.event.startsWith('emotion:'));
    const hasMetricEvents = result.engineering.instrumentation.some(e => e.event.startsWith('metric:') || e.event === 'app:load');
    expect(hasEmotionEvents).toBe(true);
    expect(hasMetricEvents).toBe(true);
  });
});

describe('End-to-End: Analytics Dashboard', async () => {
  const result = await runPipeline(DASHBOARD_REQUIREMENTS, 'Dashboard');

  it('passes all pipeline stages', async () => {
    expect(result.passed).toBe(true);
  });

  it('infers urgency-based emotional journey', () => {
    const states = result.draft.architecture.emotionalJourney.states;
    expect(states.some(s => /urgency|curiosity/i.test(s))).toBe(true);
  });

  it('infers click as primary input', () => {
    const inputs = result.draft.architecture.interactionModel.inputs;
    expect(inputs).toContain('Click');
    expect(inputs.length).toBeGreaterThanOrEqual(1);
  });

  it('generates instrumentation for data metrics', () => {
    expect(result.engineering.instrumentation.length).toBeGreaterThanOrEqual(2);
  });
});

describe('End-to-End: CLI Tool', async () => {
  const result = await runPipeline(CLI_REQUIREMENTS, 'CLI');

  it('passes all pipeline stages', async () => {
    expect(result.passed).toBe(true);
  });

  it('infers developer audience', () => {
    const audience = result.draft.architecture.audience;
    expect(audience.demographics.toLowerCase()).toContain('technical');
  });

  it('produces state machines', () => {
    expect(result.engineering.stateMachines.length).toBeGreaterThanOrEqual(2);
  });

  it('generates motion config appropriate for CLI (not ambient)', () => {
    const hasAmbientComponent = result.engineering.components.some(c => c.name === 'AmbientMotionLayer');
    expect(hasAmbientComponent).toBe(false);
  });
});

describe('End-to-End: Full pipeline edge cases', () => {
  it('handles empty requirements gracefully', async () => {
    const result = await runPipeline('');
    expect(result.draft).toBeDefined();
  });

  it('handles very long requirements', async () => {
    const longReq = 'A platform. '.repeat(100);
    const result = await runPipeline(longReq);
    expect(result.draft.architecture.vision.length).toBeGreaterThan(0);
  });

  it('handles requirements with only keywords', async () => {
    const result = await runPipeline('fast dark modern responsive');
    expect(result.draft.architecture.vision.length).toBeGreaterThan(0);
  });

  it('produces different architectures for different requirements', async () => {
    const portfolio = await runPipeline(PORTFOLIO_REQUIREMENTS);
    const cli = await runPipeline(CLI_REQUIREMENTS);

    expect(portfolio.draft.architecture.vision).not.toBe(cli.draft.architecture.vision);
    expect(portfolio.draft.architecture.mission).not.toBe(cli.draft.architecture.mission);
  });

  it('compilation does not throw for any input', async () => {
    const inputs = ['', 'hello world', 'A'.repeat(1000), 'build a thing', '!!! special chars ###'];
    for (const input of inputs) {
      await expect(runPipeline(input)).resolves.toBeDefined();
    }
  });
});
