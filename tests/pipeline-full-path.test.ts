import { describe, it, expect, afterAll } from 'vitest';
import { rmSync } from 'fs';
import { join } from 'path';
import { GovernancePipeline } from '../src/governance-pipeline.js';
import { ApprovedArchitectureProvider } from './fixtures/approved-architecture.js';

const PROJECT_DIR = 'generated-test-path';
const GEN_DIR = join(process.cwd(), PROJECT_DIR);

const PASSING_EAT_SCORES = {
  intentScores: [8, 9, 8, 7, 8, 9],
  translationRetentions: [85, 90, 80, 75, 88],
  userAlignedCount: 4,
  userTotal: 4,
  pipelineWins: 4,
  comparisonTotal: 4,
  outcomePassed: 2,
  outcomeTotal: 2,
};

const FAILING_EAT_SCORES = {
  ...PASSING_EAT_SCORES,
  intentScores: [4, 3, 5, 4, 6, 5],
};

afterAll(() => {
  rmSync(GEN_DIR, { recursive: true, force: true });
});

describe('GovernancePipeline — full path with approved architecture', () => {
  it('runs every stage to completion and passes', async () => {
    const pipeline = new GovernancePipeline(new ApprovedArchitectureProvider());
    const result = await pipeline.run('Some requirements.', {
      projectName: 'Full Path',
      projectDir: PROJECT_DIR,
      eatScores: PASSING_EAT_SCORES,
    });

    expect(result.passed).toBe(true);
    expect(result.review.decision).toBe('APPROVED');
    expect(result.architecture).not.toBeNull();
    expect(result.engReview?.decision).toBe('APPROVED');
    expect(result.implementation?.success).toBe(true);
    expect(result.eatResult?.overall).toBe('PASS');
  });

  it('EAT computes PASS from real evaluation scores', async () => {
    const pipeline = new GovernancePipeline(new ApprovedArchitectureProvider());
    const result = await pipeline.run('Some requirements.', {
      projectDir: PROJECT_DIR,
      eatScores: PASSING_EAT_SCORES,
    });

    expect(result.eatResult?.intentMatch.average).toBeGreaterThanOrEqual(7);
    expect(result.eatResult?.userTest.alignedCount).toBe(4);
    expect(result.eatResult?.outcomeValidation.passedCount).toBe(2);
    expect(result.eatResult?.feedbackLoop).toEqual([]);
  });

  it('EAT reports FAIL and feedback when evaluation scores fail', async () => {
    const pipeline = new GovernancePipeline(new ApprovedArchitectureProvider());
    const result = await pipeline.run('Some requirements.', {
      projectDir: PROJECT_DIR,
      eatScores: FAILING_EAT_SCORES,
    });

    expect(result.eatResult?.overall).toBe('FAIL');
    expect(result.eatResult?.feedbackLoop.length).toBeGreaterThan(0);
  });

  it('records the EAT stage in the audit trail', async () => {
    const pipeline = new GovernancePipeline(new ApprovedArchitectureProvider());
    const result = await pipeline.run('Some requirements.', {
      projectDir: PROJECT_DIR,
      eatScores: PASSING_EAT_SCORES,
    });

    const eatRecords = result.auditTrail.getArtifacts().filter(r => r.stage === 'eat');
    expect(eatRecords.length).toBe(1);
    expect(eatRecords[0].outputPreview).toContain('PASS');
  });

  it('defaults to form generation when no scores are provided', async () => {
    const pipeline = new GovernancePipeline(new ApprovedArchitectureProvider());
    const result = await pipeline.run('Some requirements.', {
      projectDir: PROJECT_DIR,
    });

    expect(result.eatResult?.overall).toBe('CONDITIONAL');
    expect(result.eatResult?.summary).toContain('form generated');
  });
}, 120000);
