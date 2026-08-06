import { describe, it, expect } from 'vitest';
import { ExperienceAcceptanceTester } from '../src/components/experience-acceptance-tester.js';
import { ExperienceDesigner } from '../src/components/experience-designer.js';
import { PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS } from './fixtures/samples.js';

describe('Experience Acceptance Tester', () => {
  const designer = new ExperienceDesigner();
  const tester = new ExperienceAcceptanceTester();

  it('generates evaluation form from Experience Architecture', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    expect(form.intentMatch.scores.length).toBe(6);
    expect(form.userTest.responses.length).toBe(4);
    expect(form.blindComparison.metrics.length).toBe(4);
    expect(form.outcomeValidation.results.length).toBeGreaterThan(0);
  });

  it('intent match covers all 6 experience dimensions', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    const dimensions = form.intentMatch.scores.map(s => s.dimension);
    expect(dimensions).toContain('Vision');
    expect(dimensions).toContain('Emotional Journey');
    expect(dimensions).toContain('Narrative');
    expect(dimensions).toContain('Interaction Model');
    expect(dimensions).toContain('Motion');
    expect(dimensions).toContain('Visual Language');
  });

  it('user test questions are derived from architecture content', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    const emotionsQuestion = form.userTest.responses.find(r => r.question === 'What did you feel?');
    expect(emotionsQuestion).toBeDefined();
    expect(emotionsQuestion!.expectedTheme).toContain(draft.architecture.emotionalJourney.states[0]);
  });

  it('translation fidelity estimates retention from architecture quality', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    expect(form.translationFidelity.dimensions.length).toBe(5);
    for (const d of form.translationFidelity.dimensions) {
      expect(d.retentionPercent).toBeGreaterThanOrEqual(0);
      expect(d.retentionPercent).toBeLessThanOrEqual(100);
    }
  });

  it('translation fidelity is lower when architecture has placeholders', async () => {
    const weakDraft = await designer.design({ requirements: 'A simple page. No animations. Just text.' });
    const strongDraft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });

    const weakForm = tester.generateForm(weakDraft.architecture);
    const strongForm = tester.generateForm(strongDraft.architecture);

    expect(weakForm.translationFidelity.averageRetention).toBeLessThan(strongForm.translationFidelity.averageRetention);
  });

  it('computeResult PASSES when all thresholds are met', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 3,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('PASS');
    expect(result.intentMatch.passed).toBe(true);
    expect(result.translationFidelity.passed).toBe(true);
    expect(result.userTest.passed).toBe(true);
    expect(result.blindComparison.passed).toBe(true);
    expect(result.outcomeValidation.passed).toBe(true);
  });

  it('computeResult FAILS when intent is below threshold', () => {
    const result = tester.computeResult({
      intentScores: [3, 4, 2, 5, 3, 4],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('FAIL');
    expect(result.feedbackLoop.length).toBeGreaterThan(0);
    expect(result.feedbackLoop.some(f => f.includes('Intent'))).toBe(true);
  });

  it('computeResult FAILS when translation is below 60% threshold', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [50, 45, 55, 60, 70],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('FAIL');
    expect(result.feedbackLoop.some(f => f.includes('Translation'))).toBe(true);
  });

  it('computeResult FAILS when user test fails', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 1,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('FAIL');
    expect(result.feedbackLoop.some(f => f.includes('User'))).toBe(true);
  });

  it('computeResult FAILS when blind comparison is not met', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 2,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('CONDITIONAL');
    expect(result.feedbackLoop.some(f => f.includes('Comparison'))).toBe(true);
  });

  it('computeResult reports outcome failures when outcomes fail', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 0,
      outcomeTotal: 3,
    });

    expect(result.overall).toMatch(/^(FAIL|CONDITIONAL)$/);
    expect(result.outcomeValidation.passed).toBe(false);
    expect(result.outcomeValidation.passedCount).toBe(0);
    expect(result.outcomeValidation.totalCount).toBe(3);
    expect(result.feedbackLoop.some(f => f.includes('Outcome'))).toBe(true);
  });

  it('feedback loop points back to Experience Designer on failure', () => {
    const result = tester.computeResult({
      intentScores: [3, 4, 2, 5, 3, 4],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.feedbackLoop.length).toBeGreaterThan(0);
    expect(result.overall).toBe('FAIL');
  });

  it('generates different evaluation forms for different architectures', async () => {
    const portfolioDraft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const dashboardDraft = await designer.design({ requirements: DASHBOARD_REQUIREMENTS });

    const portfolioForm = tester.generateForm(portfolioDraft.architecture);
    const dashboardForm = tester.generateForm(dashboardDraft.architecture);

    const portfolioOutcomes = portfolioForm.outcomeValidation.results.map(r => r.metric);
    const dashboardOutcomes = dashboardForm.outcomeValidation.results.map(r => r.metric);

    const areDifferent = JSON.stringify(portfolioOutcomes) !== JSON.stringify(dashboardOutcomes);
    expect(areDifferent).toBe(true);
  });

  it('outcome validation count matches success metrics count', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    expect(form.outcomeValidation.totalCount).toBe(draft.architecture.successMetrics.length);
  });

  it('logResult produces formatted output without errors', () => {
    const result = tester.computeResult({
      intentScores: [8, 8, 7, 9, 7, 8],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 3,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(() => tester.logResult('Test', result)).not.toThrow();
  });
});

describe('EAT Pipeline Integration', () => {
  const tester = new ExperienceAcceptanceTester();

  it('full pipeline: requirements → design → EAT form', async () => {
    const designer = new ExperienceDesigner();
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const form = tester.generateForm(draft.architecture);

    expect(form.intentMatch.scores.length).toBe(6);
    expect(form.translationFidelity.dimensions.length).toBe(5);
    expect(form.userTest.responses.length).toBe(4);
  });

  it('demo: simulate an EAT passing', () => {
    const result = tester.computeResult({
      intentScores: [9, 8, 7, 9, 8, 9],
      translationRetentions: [90, 85, 80, 75, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('PASS');
  });

  it('demo: simulate an EAT failing with feedback loop', () => {
    const result = tester.computeResult({
      intentScores: [5, 4, 3, 6, 4, 5],
      translationRetentions: [70, 55, 50, 65, 60],
      userAlignedCount: 1,
      userTotal: 4,
      pipelineWins: 2,
      comparisonTotal: 4,
      outcomePassed: 1,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('FAIL');
    expect(result.feedbackLoop.length).toBeGreaterThanOrEqual(4);
  });

  it('close the loop: failed EAT feeds back to Experience Architecture', () => {
    const result = tester.computeResult({
      intentScores: [3, 4, 2, 5, 3, 4],
      translationRetentions: [85, 80, 75, 70, 90],
      userAlignedCount: 4,
      userTotal: 4,
      pipelineWins: 4,
      comparisonTotal: 4,
      outcomePassed: 3,
      outcomeTotal: 3,
    });

    expect(result.overall).toBe('FAIL');
    expect(result.feedbackLoop.some(f => f.includes('Experience Architecture'))).toBe(true);
  });
});
