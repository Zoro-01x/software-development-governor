import { describe, it, expect } from 'vitest';
import { ExperienceDesigner } from '../src/components/experience-designer.js';
import { ExperienceGovernor } from '../src/components/experience-governor.js';
import {
  PORTFOLIO_REQUIREMENTS,
  DASHBOARD_REQUIREMENTS,
  CLI_REQUIREMENTS,
  expectValidArchitecture,
} from './fixtures/samples.js';

describe('Experience Designer', () => {
  const designer = new ExperienceDesigner();

  it('produces a valid architecture from portfolio requirements', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    expectValidArchitecture(draft.architecture);
    expect(draft.rationale.length).toBeGreaterThan(0);
  });

  it('produces a valid architecture from dashboard requirements', async () => {
    const draft = await designer.design({ requirements: DASHBOARD_REQUIREMENTS });
    expectValidArchitecture(draft.architecture);
    expect(draft.rationale.length).toBeGreaterThan(0);
  });

  it('produces a valid architecture from CLI requirements', async () => {
    const draft = await designer.design({ requirements: CLI_REQUIREMENTS });
    expectValidArchitecture(draft.architecture);
    expect(draft.rationale.length).toBeGreaterThan(0);
  });

  it('emits open questions when requirements lack narrative cues', async () => {
    const draft = await designer.design({ requirements: 'A simple tool that does one thing well. No frills.' });
    const hasNarrativeQuestion = draft.openQuestions.some(q => q.dimension === 'Narrative');
    expect(hasNarrativeQuestion).toBe(true);
  });

  it('emits open questions when requirements lack motion cues', async () => {
    const draft = await designer.design({ requirements: 'A simple static text page. Just words and structure.' });
    const hasMotionQuestion = draft.openQuestions.some(q => q.dimension === 'Motion System');
    expect(hasMotionQuestion).toBe(true);
  });

  it('generates design rationale for each section', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    expect(draft.rationale.length).toBeGreaterThanOrEqual(3);
    for (const r of draft.rationale) {
      expect(r.section).toBeTruthy();
      expect(r.decision).toBeTruthy();
      expect(r.reasoning).toBeTruthy();
    }
  });

  it('infers audience from developer-oriented requirements', async () => {
    const draft = await designer.design({ requirements: CLI_REQUIREMENTS });
    const audience = draft.architecture.audience;
    expect(audience.demographics.toLowerCase()).toContain('technical');
  });

  it('infers curiosity as first emotional state', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    expect(draft.architecture.emotionalJourney.states[0].toLowerCase()).toContain('curiosity');
  });

  it('uses project name when provided', async () => {
    const draft = await designer.design({
      requirements: 'A landing page',
      projectName: 'AcmeCloud',
    });
    expect(draft.architecture.vision).toContain('AcmeCloud');
  });

  it('accepts constraints list', async () => {
    const draft = await designer.design({
      requirements: 'A simple landing page',
      constraints: ['No frameworks', 'SSR compatible', '< 100KB'],
    });
    expect(draft.architecture).toBeDefined();
    expect(draft.rationale.length).toBeGreaterThan(0);
  });

  it('generates transition triggers for emotional journey', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const { transitions } = draft.architecture.emotionalJourney;
    expect(transitions.length).toBeGreaterThan(0);
    for (const t of transitions) {
      expect(t.from).toBeTruthy();
      expect(t.to).toBeTruthy();
      expect(t.trigger).toBeTruthy();
    }
  });

  it('generates interaction inputs matching domain', async () => {
    const draft = await designer.design({ requirements: DASHBOARD_REQUIREMENTS });
    const { inputs } = draft.architecture.interactionModel;
    expect(inputs).toContain('Click');
  });

  it('generates success metrics from requirements', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    expect(draft.architecture.successMetrics.length).toBeGreaterThanOrEqual(1);
  });

  it('produces deterministic output for same input', async () => {
    const draft1 = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const draft2 = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    expect(draft1.architecture.vision).toBe(draft2.architecture.vision);
    expect(draft1.architecture.experienceGoals).toEqual(draft2.architecture.experienceGoals);
    expect(draft1.architecture.emotionalJourney.states).toEqual(draft2.architecture.emotionalJourney.states);
    expect(draft1.rationale.length).toBe(draft2.rationale.length);
  });

  it('produces architecture that passes Governor validation', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const governor = new ExperienceGovernor();
    const result = governor.evaluate(draft.architecture);
    expect(result).toBeDefined();
    expect(result.scores.length).toBe(10);
  });
});
