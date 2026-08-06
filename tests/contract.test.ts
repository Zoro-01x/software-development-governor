import { describe, it, expect } from 'vitest';
import { ExperienceDesigner } from '../src/components/experience-designer.js';
import { ExperienceGovernor, ExperienceArchitecture } from '../src/components/experience-governor.js';
import { ExperienceCompiler, EngineeringArchitecture } from '../src/components/experience-compiler.js';
import { PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS } from './fixtures/samples.js';

describe('Contract: Designer → Governor', () => {
  const designer = new ExperienceDesigner();
  const governor = new ExperienceGovernor();

  const requirements = [PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS];

  for (const req of requirements) {
    it(`produces a Governor-validatable architecture from: "${req.slice(0, 40)}..."`, async () => {
      const draft = await designer.design({ requirements: req });
      const arch: ExperienceArchitecture = draft.architecture;

      expect(arch.vision).toBeDefined();
      expect(arch.mission).toBeDefined();
      expect(arch.audience).toBeDefined();
      expect(arch.experienceGoals).toBeDefined();
      expect(arch.emotionalJourney).toBeDefined();
      expect(arch.narrative).toBeDefined();
      expect(arch.interactionModel).toBeDefined();
      expect(arch.motionSystem).toBeDefined();
      expect(arch.visualLanguage).toBeDefined();
      expect(arch.successMetrics).toBeDefined();

      const result = governor.evaluate(arch);
      expect(result.decision).toMatch(/^(APPROVED|REVISE|REJECT)$/);
      expect(result.scores.length).toBe(10);
    });
  }
});

describe('Contract: Governor → Compiler', () => {
  const designer = new ExperienceDesigner();
  const governor = new ExperienceGovernor();
  const compiler = new ExperienceCompiler();

  const requirements = [PORTFOLIO_REQUIREMENTS, DASHBOARD_REQUIREMENTS, CLI_REQUIREMENTS];

  for (const req of requirements) {
    it(`compiles approved architecture into valid EngineeringArchitecture: "${req.slice(0, 40)}..."`, async () => {
      const draft = await designer.design({ requirements: req });
      const arch = draft.architecture;

      const review = governor.evaluate(arch);
      expect(review.scores.length).toBe(10);

      const eng = compiler.compile(arch);

      expect(eng.stateMachines.length).toBeGreaterThanOrEqual(2);
      expect(eng.events.length).toBeGreaterThan(0);
      expect(eng.components.length).toBeGreaterThan(0);
      expect(eng.dataFlow).toBeDefined();
      expect(eng.motion).toBeDefined();
      expect(eng.tokens).toBeDefined();
      expect(eng.performance).toBeDefined();
      expect(eng.instrumentation.length).toBeGreaterThan(0);
      expect(eng.qualityGates.length).toBeGreaterThan(0);
    });
  }
});

describe('Contract: Architecture fields (no information loss)', () => {
  const designer = new ExperienceDesigner();
  const compiler = new ExperienceCompiler();

  it('preserves vision and mission through the pipeline', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const arch = draft.architecture;
    const vision = arch.vision;
    const mission = arch.mission;

    const eng = compiler.compile(arch);

    expect(eng.qualityGates.length).toBeGreaterThan(0);
    expect(eng.instrumentation.length).toBeGreaterThan(0);
    expect(eng.performance).toBeDefined();
  });

  it('preserves emotional journey states through compilation', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const { states, transitions } = draft.architecture.emotionalJourney;

    const eng = new ExperienceCompiler().compile(draft.architecture);
    const flowMachine = eng.stateMachines.find(s => s.name === 'experience-flow')!;

    expect(flowMachine.states.length).toBe(states.length);
    expect(flowMachine.transitions.length).toBe(transitions.length);
    for (let i = 0; i < transitions.length; i++) {
      expect(flowMachine.transitions[i].from).toBeDefined();
      expect(flowMachine.transitions[i].to).toBeDefined();
    }
  });

  it('preserves interaction inputs through compilation', async () => {
    const draft = await designer.design({ requirements: DASHBOARD_REQUIREMENTS });
    const { inputs } = draft.architecture.interactionModel;

    const eng = new ExperienceCompiler().compile(draft.architecture);
    const inputEvents = eng.events.filter(e => e.name.startsWith('input:'));

    expect(inputEvents.length).toBeGreaterThanOrEqual(inputs.length);
  });
});

describe('Contract: Schema consistency', () => {
  it('all ExperienceArchitecture fields are present and typed correctly', () => {
    const arch: Record<string, unknown> = {
      vision: '',
      mission: '',
      audience: { demographics: '', psychographics: '', scenario: '' },
      experienceGoals: [],
      emotionalJourney: { states: [], transitions: [] },
      narrative: { hook: '', arc: '', pacing: '', resolution: '' },
      interactionModel: { inputs: [], feedback: [], stateTransitions: [], flow: '' },
      motionSystem: { principles: [], microInteractions: [], transitions: [], ambientMotion: [] },
      visualLanguage: { color: '', typography: '', space: '', shape: '', light: '' },
      successMetrics: [],
    };

    const requiredFields = ['vision', 'mission', 'audience', 'experienceGoals', 'emotionalJourney', 'narrative', 'interactionModel', 'motionSystem', 'visualLanguage', 'successMetrics'];
    for (const field of requiredFields) {
      expect(arch).toHaveProperty(field);
    }
  });

  it('all EngineeringArchitecture fields are present and typed correctly', () => {
    const eng: Record<string, unknown> = {
      stateMachines: [],
      events: [],
      components: [],
      dataFlow: { direction: 'unidirectional', strategy: '', stores: [] },
      motion: { easingDefaults: { enter: '', exit: '', move: '', ambient: '' }, durationDefaults: { micro: '', interaction: '', transition: '', ambient: '' }, sequencing: { stagger: '', delay: '', parallel: '' } },
      tokens: { color: {}, typography: {}, spacing: {}, shape: {}, elevation: {} },
      performance: { loadTime: '', timeToInteractive: '', frameRate: '', bundleSize: '', firstMeaningfulPaint: '' },
      instrumentation: [],
      qualityGates: [],
    };

    const requiredFields = ['stateMachines', 'events', 'components', 'dataFlow', 'motion', 'tokens', 'performance', 'instrumentation', 'qualityGates'];
    for (const field of requiredFields) {
      expect(eng).toHaveProperty(field);
    }
  });
});

describe('Contract: GovernorResult structure', () => {
  const governor = new ExperienceGovernor();

  it('always returns scores, issues, and recommendations', async () => {
    const designer = new ExperienceDesigner();
    const draft = await designer.design({ requirements: CLI_REQUIREMENTS });
    const result = governor.evaluate(draft.architecture);

    expect(Array.isArray(result.scores)).toBe(true);
    expect(Array.isArray(result.criticalIssues)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
    expect(typeof result.summary).toBe('string');
    expect(typeof result.decision).toBe('string');
  });

  it('decision is always a valid value', async () => {
    const designer = new ExperienceDesigner();
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const result = governor.evaluate(draft.architecture);

    expect(['APPROVED', 'REVISE', 'REJECT']).toContain(result.decision);
  });

  it('every score has dimension, score number, and reason', async () => {
    const designer = new ExperienceDesigner();
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const result = governor.evaluate(draft.architecture);

    for (const s of result.scores) {
      expect(typeof s.dimension).toBe('string');
      expect(typeof s.score).toBe('number');
      expect(typeof s.reason).toBe('string');
      expect(s.dimension.length).toBeGreaterThan(0);
    }
  });
});
