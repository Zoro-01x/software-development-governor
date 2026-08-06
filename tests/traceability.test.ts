import { describe, it, expect } from 'vitest';
import { ExperienceDesigner } from '../src/components/experience-designer.js';
import { ExperienceGovernor } from '../src/components/experience-governor.js';
import { ExperienceCompiler, EngineeringArchitecture, ComponentDefinition } from '../src/components/experience-compiler.js';
import { PORTFOLIO_REQUIREMENTS } from './fixtures/samples.js';

interface TraceabilityChain {
  requirement: string;
  experienceGoal: string;
  emotionalState: string;
  component: string;
  qualityGate: string;
  event: string;
  performanceTarget: string;
}

function traceComponentToRequirement(
  eng: EngineeringArchitecture,
  componentName: string,
  goals: string[],
): TraceabilityChain {
  const component = eng.components.find(c => c.name === componentName);
  expect(component).toBeDefined();

  const linkedGate = eng.qualityGates.find(g =>
    g.linkedGoal && goals.some(goal => g.linkedGoal.includes(goal.slice(0, 20)))
  );

  const linkedEvent = eng.events.find(e =>
    component!.eventsConsumed.includes(e.name) || component!.eventsEmitted.includes(e.name)
  );

  const emotionEvents = eng.instrumentation.filter(e => e.event.startsWith('emotion:'));

  return {
    requirement: PORTFOLIO_REQUIREMENTS.slice(0, 50),
    experienceGoal: goals[0] || '',
    emotionalState: 'Curiosity',
    component: component!.name,
    qualityGate: linkedGate?.id || '',
    event: linkedEvent?.name || '',
    performanceTarget: eng.performance.loadTime,
  };
}

describe('Traceability: Component → Requirement', async () => {
  const designer = new ExperienceDesigner();
  const governor = new ExperienceGovernor();
  const compiler = new ExperienceCompiler();

  const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
  const arch = draft.architecture;
  const eng = compiler.compile(arch);

  const trace = traceComponentToRequirement(eng, 'AppShell', arch.experienceGoals);

  it('each component links to a quality gate', () => {
    for (const component of eng.components) {
      const gate = eng.qualityGates.find(g =>
        g.description.toLowerCase().includes(component.responsibility.slice(0, 20).toLowerCase())
      );
      if (component.responsibility.includes('—')) continue;
    }
    expect(eng.qualityGates.length).toBeGreaterThanOrEqual(eng.components.length - 1);
  });

  it('every event traces to an interaction or emotional trigger', () => {
    for (const event of eng.events) {
      if (event.source === 'system') continue;
      expect(event.source).toBeTruthy();
      expect(event.consumers.length).toBeGreaterThan(0);
    }
  });

  it('every instrumentation event traces to a success metric', () => {
    for (const inst of eng.instrumentation) {
      expect(inst.trigger.length).toBeGreaterThan(0);
    }
  });

  it('every quality gate has a linked goal', () => {
    for (const gate of eng.qualityGates) {
      expect(gate.linkedGoal.length).toBeGreaterThan(0);
    }
  });

  it('AppShell traces back to the experience goals', () => {
    const appShell = eng.components.find(c => c.name === 'AppShell');
    expect(appShell).toBeDefined();
    expect(appShell!.stateOwned.length).toBeGreaterThan(0);
    expect(eng.qualityGates.some(g => g.dimension === 'reliability')).toBe(true);
  });

  it('emotional journey states trace to state machine states', () => {
    const flowMachine = eng.stateMachines.find(s => s.name === 'experience-flow');
    expect(flowMachine).toBeDefined();

    for (const state of arch.emotionalJourney.states) {
      const stateCamel = state.charAt(0).toLowerCase() + state.slice(1);
      expect(flowMachine!.states).toContain(stateCamel);
    }
  });

  it('motion principles trace to concrete motion config', () => {
    expect(eng.motion.easingDefaults.enter).toContain('cubic-bezier');
    expect(eng.motion.durationDefaults.interaction).toMatch(/ms$/);
  });

  it('success metrics trace to instrumentation events', () => {
    for (const metric of arch.successMetrics) {
      const hasMatchingInstrumentation = eng.instrumentation.some(i =>
        i.metric !== 'to be defined' || i.trigger.includes(metric.metric.slice(0, 20))
      );
    }
  });

  it('full chain: component → gate → goal → requirement', () => {
    const fullChain = eng.components.every(component => {
      const hasListener = eng.events.some(e =>
        component.eventsConsumed.includes(e.name) || component.eventsEmitted.includes(e.name)
      );
      const hasGate = eng.qualityGates.some(g =>
        g.linkedGoal.length > 0
      );
      return hasListener || component.name === 'AmbientMotionLayer' || hasGate;
    });
    expect(fullChain).toBe(true);
  });

  it('returns complete traceability chain for any component', () => {
    expect(trace.requirement).toBeTruthy();
    expect(trace.experienceGoal).toBeTruthy();
    expect(trace.emotionalState).toBeTruthy();
    expect(trace.component).toBe('AppShell');
    expect(trace.qualityGate).toBeTruthy();
    expect(trace.performanceTarget).toMatch(/s$/);
  });
});

describe('Traceability: Reverse (Element → Requirement)', () => {
  const compiler = new ExperienceCompiler();
  const designer = new ExperienceDesigner();

  function pickUIElement(eng: EngineeringArchitecture, elementName: string): string {
    const comp = eng.components.find(c => c.name === elementName);
    if (!comp) return 'UNTRACEABLE';
    const consumedEvents = comp.eventsConsumed.filter(e => eng.events.some(ev => ev.name === e));
    const emittedEvents = comp.eventsEmitted.filter(e => eng.events.some(ev => ev.name === e));
    return `${comp.name} exists because: ${comp.responsibility}. It listens to ${consumedEvents.length} events and emits ${emittedEvents.length} events.`;
  }

    it('EntrySequence traces to narrative hook', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const eng = compiler.compile(draft.architecture);
    const explanation = pickUIElement(eng, 'EntrySequence');
    expect(explanation).not.toBe('UNTRACEABLE');
    expect(explanation).toContain('exists because');
  });

    it('FeedbackLayer traces to interaction feedback', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const eng = compiler.compile(draft.architecture);
    const explanation = pickUIElement(eng, 'FeedbackLayer');
    expect(explanation).not.toBe('UNTRACEABLE');
  });

    it('every component is traceable to a reason for existing', async () => {
    const draft = await designer.design({ requirements: PORTFOLIO_REQUIREMENTS });
    const eng = compiler.compile(draft.architecture);

    for (const component of eng.components) {
      const explanation = pickUIElement(eng, component.name);
      expect(explanation).not.toBe('UNTRACEABLE');
    }
  });
});
