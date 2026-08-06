import { describe, it, expect } from 'vitest';
import { ExperienceDesigner } from '../src/components/experience-designer.js';
import { ExperienceGovernor } from '../src/components/experience-governor.js';
import { ExperienceCompiler } from '../src/components/experience-compiler.js';
import { PORTFOLIO_REQUIREMENTS } from './fixtures/samples.js';

const ITERATIONS = 100;

describe('Determinism: Experience Designer', () => {
  const designer = new ExperienceDesigner();

  it('produces identical output across all runs', async () => {
    const first = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });

    for (let i = 0; i < ITERATIONS; i++) {
      const run = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });

      expect(run.architecture.vision).toBe(first.architecture.vision);
      expect(run.architecture.mission).toBe(first.architecture.mission);
      expect(run.architecture.audience.demographics).toBe(first.architecture.audience.demographics);
      expect(run.architecture.audience.psychographics).toBe(first.architecture.audience.psychographics);
      expect(run.architecture.audience.scenario).toBe(first.architecture.audience.scenario);
      expect(run.architecture.experienceGoals).toEqual(first.architecture.experienceGoals);
      expect(run.architecture.emotionalJourney.states).toEqual(first.architecture.emotionalJourney.states);
      expect(run.architecture.emotionalJourney.transitions).toEqual(first.architecture.emotionalJourney.transitions);
      expect(run.architecture.narrative.hook).toBe(first.architecture.narrative.hook);
      expect(run.architecture.narrative.arc).toBe(first.architecture.narrative.arc);
      expect(run.architecture.narrative.pacing).toBe(first.architecture.narrative.pacing);
      expect(run.architecture.narrative.resolution).toBe(first.architecture.narrative.resolution);
      expect(run.architecture.interactionModel.inputs).toEqual(first.architecture.interactionModel.inputs);
      expect(run.architecture.interactionModel.feedback).toEqual(first.architecture.interactionModel.feedback);
      expect(run.architecture.interactionModel.flow).toBe(first.architecture.interactionModel.flow);
      expect(run.architecture.successMetrics).toEqual(first.architecture.successMetrics);
      expect(run.rationale.length).toBe(first.rationale.length);
      expect(run.openQuestions.length).toBe(first.openQuestions.length);
    }
  });

  it('produces identical visual language across all runs', async () => {
    const first = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });

    for (let i = 0; i < ITERATIONS; i++) {
      const run = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
      expect(run.architecture.visualLanguage.color).toBe(first.architecture.visualLanguage.color);
      expect(run.architecture.visualLanguage.typography).toBe(first.architecture.visualLanguage.typography);
      expect(run.architecture.visualLanguage.space).toBe(first.architecture.visualLanguage.space);
      expect(run.architecture.visualLanguage.shape).toBe(first.architecture.visualLanguage.shape);
      expect(run.architecture.visualLanguage.light).toBe(first.architecture.visualLanguage.light);
    }
  });
});

describe('Determinism: Experience Governor', () => {
  const designer = new ExperienceDesigner();
  const governor = new ExperienceGovernor();

  it('produces identical scores across all runs for same input', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const first = governor.evaluate(arch);

    for (let i = 0; i < ITERATIONS; i++) {
      const run = governor.evaluate(arch);

      expect(run.decision).toBe(first.decision);
      expect(run.scores.length).toBe(first.scores.length);
      expect(run.criticalIssues.length).toBe(first.criticalIssues.length);
      expect(run.recommendations.length).toBe(first.recommendations.length);
      expect(run.summary).toBe(first.summary);

      for (let j = 0; j < first.scores.length; j++) {
        expect(run.scores[j].score).toBe(first.scores[j].score);
        expect(run.scores[j].dimension).toBe(first.scores[j].dimension);
        expect(run.scores[j].reason).toBe(first.scores[j].reason);
      }
    }
  });
});

describe('Determinism: Experience Compiler', () => {
  const designer = new ExperienceDesigner();
  const compiler = new ExperienceCompiler();

  it('produces identical state machines across all runs', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const first = compiler.compile(arch);

    for (let i = 0; i < ITERATIONS; i++) {
      const run = compiler.compile(arch);

      expect(run.stateMachines.length).toBe(first.stateMachines.length);
      for (let j = 0; j < first.stateMachines.length; j++) {
        expect(run.stateMachines[j].name).toBe(first.stateMachines[j].name);
        expect(run.stateMachines[j].states).toEqual(first.stateMachines[j].states);
        expect(run.stateMachines[j].initialState).toBe(first.stateMachines[j].initialState);
        expect(run.stateMachines[j].transitions).toEqual(first.stateMachines[j].transitions);
      }
    }
  });

  it('produces identical events across all runs', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const first = compiler.compile(arch);

    for (let i = 0; i < ITERATIONS; i++) {
      const run = compiler.compile(arch);

      expect(run.events.length).toBe(first.events.length);
      for (let j = 0; j < first.events.length; j++) {
        expect(run.events[j].name).toBe(first.events[j].name);
        expect(run.events[j].payload).toBe(first.events[j].payload);
        expect(run.events[j].consumers).toEqual(first.events[j].consumers);
      }
    }
  });

  it('produces identical motion config across all runs', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const first = compiler.compile(arch);

    for (let i = 0; i < ITERATIONS; i++) {
      const run = compiler.compile(arch);

      expect(run.motion.easingDefaults).toEqual(first.motion.easingDefaults);
      expect(run.motion.durationDefaults).toEqual(first.motion.durationDefaults);
      expect(run.motion.sequencing).toEqual(first.motion.sequencing);
    }
  });

  it('produces identical tokens, performance, and quality gates across all runs', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const first = compiler.compile(arch);

    for (let i = 0; i < ITERATIONS; i++) {
      const run = compiler.compile(arch);

      expect(run.tokens).toEqual(first.tokens);
      expect(run.performance).toEqual(first.performance);
      expect(run.qualityGates).toEqual(first.qualityGates);
      expect(run.instrumentation).toEqual(first.instrumentation);
    }
  });
});

describe('Determinism: Full pipeline', () => {
  it('produces identical EngineeringArchitecture end-to-end across all runs', async () => {
    const firstDesigner = new ExperienceDesigner();
    const firstCompiler = new ExperienceCompiler();

    const firstDraft = await firstDesigner.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const firstArch = firstDraft.architecture;
    const firstEng = firstCompiler.compile(firstArch);

    for (let i = 0; i < ITERATIONS; i++) {
      const designer = new ExperienceDesigner();
      const compiler = new ExperienceCompiler();

      const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
      const eng = compiler.compile(arch);

      expect(eng.stateMachines.length).toBe(firstEng.stateMachines.length);
      expect(eng.events.length).toBe(firstEng.events.length);
      expect(eng.components.length).toBe(firstEng.components.length);
      expect(eng.motion.easingDefaults).toEqual(firstEng.motion.easingDefaults);
      expect(eng.performance).toEqual(firstEng.performance);
      expect(eng.qualityGates.length).toBe(firstEng.qualityGates.length);
    }
  });
});
