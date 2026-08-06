import { describe, it, expect } from 'vitest';
import { ExperienceCompiler } from '../src/components/experience-compiler.js';
import { ExperienceGovernor, ExperienceArchitecture } from '../src/components/experience-governor.js';

function makeRichArch(): ExperienceArchitecture {
  return {
    vision: 'A world where analytics feel like exploration, not spreadsheets.',
    mission: 'To make data discovery as engaging as a well-designed game.',
    audience: {
      demographics: 'Operations managers and executives, 30-55',
      psychographics: 'Value clarity, speed, and competitive insight',
      scenario: 'Opening a dashboard mid-crisis, needing answers in seconds',
    },
    experienceGoals: [
      'Users spot anomalies within 5 seconds',
      'Users feel confident in their data-driven decisions',
      'Users enjoy checking the dashboard daily',
      'Users can explain trends to colleagues without confusion',
    ],
    emotionalJourney: {
      states: ['Urgency', 'Clarity', 'Confidence', 'Satisfaction'],
      transitions: [
        { from: 'Urgency', to: 'Clarity', trigger: 'Dashboard loads with focused overview' },
        { from: 'Clarity', to: 'Confidence', trigger: 'User drills into data and confirms hypothesis' },
        { from: 'Confidence', to: 'Satisfaction', trigger: 'Action taken, result visible immediately' },
      ],
    },
    narrative: {
      hook: 'The most important number appears first, larger than everything else.',
      arc: 'From overview to insight to action in three deliberate steps.',
      pacing: 'Instant overview, measured exploration, rapid action.',
      resolution: 'The user closes the dashboard knowing exactly what to do next.',
    },
    interactionModel: {
      inputs: ['Click', 'Scroll', 'Keyboard shortcut', 'Drag'],
      feedback: ['Hover reveals tooltip with exact data', 'Click drill-down animates smoothly', 'Drag reorders with haptic-style snap'],
      stateTransitions: ['Overview → Detail on row click', 'Detail → Action on button click', 'Action → Confirmation on completion'],
      flow: 'Land → Scan → Drill → Act → Verify',
    },
    motionSystem: {
      principles: ['Fast entrances, smooth transitions, minimal ambient', 'Snap to final position quickly, no lingering'],
      microInteractions: ['Row hover: background highlight', 'Drill-down: expand animation', 'Sort: smooth reorder'],
      transitions: ['Page transitions: instant cross-fade < 200ms'],
      ambientMotion: [],
    },
    visualLanguage: {
      color: 'Professional blue-gray palette with data-viz color encoding',
      typography: 'Clean sans-serif, tabular figures for numbers, clear hierarchy',
      space: 'Dense data display with generous whitespace around key metrics',
      shape: 'Sharp corners on data displays, subtle rounding on interactive elements',
      light: 'No shadows on data, elevation on controls',
    },
    successMetrics: [
      { metric: 'Time to first insight', target: '< 5s', observable: true, verifiable: true, actionable: true },
      { metric: 'User confidence rating', target: '> 4/5', observable: true, verifiable: true, actionable: true },
    ],
  };
}

describe('Experience Compiler', () => {
  const compiler = new ExperienceCompiler();

  it('produces an EngineeringArchitecture from ExperienceArchitecture', () => {
    const eng = compiler.compile(makeRichArch());
    expect(eng).toBeDefined();
    expect(eng.stateMachines).toBeDefined();
    expect(eng.events).toBeDefined();
    expect(eng.components).toBeDefined();
    expect(eng.dataFlow).toBeDefined();
    expect(eng.motion).toBeDefined();
    expect(eng.tokens).toBeDefined();
    expect(eng.performance).toBeDefined();
    expect(eng.instrumentation).toBeDefined();
    expect(eng.qualityGates).toBeDefined();
  });

  describe('state machines', () => {
    it('creates experience-flow machine from emotional journey states', () => {
      const eng = compiler.compile(makeRichArch());
      const flow = eng.stateMachines.find(s => s.name === 'experience-flow');
      expect(flow).toBeDefined();
      expect(flow!.states).toContain('urgency');
      expect(flow!.states).toContain('satisfaction');
      expect(flow!.initialState).toBe('urgency');
    });

    it('creates system-status machine with standard states', () => {
      const eng = compiler.compile(makeRichArch());
      const system = eng.stateMachines.find(s => s.name === 'system-status');
      expect(system).toBeDefined();
      expect(system!.states).toContain('idle');
      expect(system!.states).toContain('ready');
    });

    it('creates interaction-phase machine', () => {
      const eng = compiler.compile(makeRichArch());
      const phase = eng.stateMachines.find(s => s.name === 'interaction-phase');
      expect(phase).toBeDefined();
      expect(phase!.states).toContain('passive');
      expect(phase!.states).toContain('active');
    });

    it('maps emotional transitions to state machine transitions', () => {
      const eng = compiler.compile(makeRichArch());
      const flow = eng.stateMachines.find(s => s.name === 'experience-flow')!;
      expect(flow.transitions.length).toBe(3);
      expect(flow.transitions[0].from).toBe('urgency');
      expect(flow.transitions[0].to).toBe('clarity');
    });
  });

  describe('events', () => {
    it('creates system lifecycle events', () => {
      const eng = compiler.compile(makeRichArch());
      const initEvent = eng.events.find(e => e.name === 'app:init');
      const loadEvent = eng.events.find(e => e.name === 'app:loaded');
      expect(initEvent).toBeDefined();
      expect(loadEvent).toBeDefined();
    });

    it('creates emotional transition events', () => {
      const eng = compiler.compile(makeRichArch());
      const transitionEvent = eng.events.find(e => e.name === 'emotion:urgency:to:clarity');
      expect(transitionEvent).toBeDefined();
      expect(transitionEvent!.payload).toContain('trigger');
    });

    it('creates input events for each interaction input', () => {
      const eng = compiler.compile(makeRichArch());
      const clickEvent = eng.events.find(e => e.name === 'input:click');
      const dragEvent = eng.events.find(e => e.name === 'input:drag');
      expect(clickEvent).toBeDefined();
      expect(dragEvent).toBeDefined();
    });

    it('each event has consumers array', () => {
      const eng = compiler.compile(makeRichArch());
      for (const e of eng.events) {
        expect(Array.isArray(e.consumers)).toBe(true);
      }
    });
  });

  describe('components', () => {
    it('creates AppShell as root component', () => {
      const eng = compiler.compile(makeRichArch());
      const shell = eng.components.find(c => c.name === 'AppShell');
      expect(shell).toBeDefined();
      expect(shell!.children.length).toBeGreaterThan(0);
    });

    it('creates EntrySequence when narrative hook is defined', () => {
      const eng = compiler.compile(makeRichArch());
      const entry = eng.components.find(c => c.name === 'EntrySequence');
      expect(entry).toBeDefined();
    });

    it('does not create EntrySequence when hook is placeholder', () => {
      const arch = makeRichArch();
      arch.narrative.hook = 'To be defined';
      const eng = compiler.compile(arch);
      const entry = eng.components.find(c => c.name === 'EntrySequence');
      expect(entry).toBeUndefined();
    });

    it('creates FeedbackLayer when feedback is defined', () => {
      const eng = compiler.compile(makeRichArch());
      const feedback = eng.components.find(c => c.name === 'FeedbackLayer');
      expect(feedback).toBeDefined();
    });

    it('does not create AmbientMotionLayer when no ambient motion', () => {
      const eng = compiler.compile(makeRichArch());
      const ambient = eng.components.find(c => c.name === 'AmbientMotionLayer');
      expect(ambient).toBeUndefined();
    });
  });

  describe('motion config', () => {
    it('extracts easing from principles', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.motion.easingDefaults.enter).toBeTruthy();
      expect(eng.motion.easingDefaults.enter).toContain('cubic-bezier');
    });

    it('extracts duration defaults from principles', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.motion.durationDefaults.micro).toMatch(/ms$/);
      expect(eng.motion.durationDefaults.ambient).toMatch(/ms$/);
    });

    it('sets stagger to 0 when no stagger mentioned in principles', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.motion.sequencing.stagger).toBe('0ms');
    });

    it('sets stagger > 0 when principles mention stagger', () => {
      const arch = makeRichArch();
      arch.motionSystem.principles = ['Stagger children by depth', 'Sequential reveals'];
      const eng = compiler.compile(arch);
      expect(eng.motion.sequencing.stagger).toBe('60ms');
    });
  });

  describe('design tokens', () => {
    it('produces token structure for all visual dimensions', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.tokens.color).toBeDefined();
      expect(eng.tokens.typography).toBeDefined();
      expect(eng.tokens.spacing).toBeDefined();
      expect(eng.tokens.shape).toBeDefined();
      expect(eng.tokens.elevation).toBeDefined();
    });

    it('uses meaningful values when visual language is defined', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.tokens.color.primary).not.toBe('#000');
    });
  });

  describe('performance budget', () => {
    it('sets stricter targets for speed-oriented goals', () => {
      const arch = makeRichArch();
      arch.experienceGoals = ['The app feels instant and responsive'];
      const eng = compiler.compile(arch);
      expect(eng.performance.loadTime).toBe('1.5s');
    });

    it('sets relaxed targets for rich/immersive goals', () => {
      const arch = makeRichArch();
      arch.experienceGoals = ['The experience feels rich and cinematic'];
      const eng = compiler.compile(arch);
      expect(eng.performance.loadTime).toBe('3s');
    });
  });

  describe('instrumentation', () => {
    it('creates app load instrumentation event', () => {
      const eng = compiler.compile(makeRichArch());
      const loadEvent = eng.instrumentation.find(e => e.event === 'app:load');
      expect(loadEvent).toBeDefined();
    });

    it('creates instrumentation events from success metrics', () => {
      const eng = compiler.compile(makeRichArch());
      expect(eng.instrumentation.length).toBeGreaterThanOrEqual(3);
    });

    it('creates emotion transition instrumentation', () => {
      const eng = compiler.compile(makeRichArch());
      const emotionMetric = eng.instrumentation.find(e => e.event.includes('emotion'));
      expect(emotionMetric).toBeDefined();
    });
  });

  describe('quality gates', () => {
    it('creates system quality gate QG-001', () => {
      const eng = compiler.compile(makeRichArch());
      const gate = eng.qualityGates.find(g => g.id === 'QG-001');
      expect(gate).toBeDefined();
      expect(gate!.dimension).toBe('reliability');
    });

    it('creates experience quality gate from each experience goal', () => {
      const arch = makeRichArch();
      const eng = compiler.compile(arch);
      const userTestingGates = eng.qualityGates.filter(g => g.passCondition.includes('user testing'));
      expect(userTestingGates.length).toBe(arch.experienceGoals.length);
    });

    it('each gate has required properties', () => {
      const eng = compiler.compile(makeRichArch());
      for (const gate of eng.qualityGates) {
        expect(gate.id).toBeTruthy();
        expect(gate.description).toBeTruthy();
        expect(gate.dimension).toBeTruthy();
        expect(gate.passCondition).toBeTruthy();
      }
    });
  });
});
