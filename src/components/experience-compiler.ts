import { ExperienceArchitecture } from './experience-governor.js';

export interface StateMachineDefinition {
  name: string;
  states: string[];
  initialState: string;
  transitions: Array<{
    from: string;
    to: string;
    on: string;
  }>;
}

export interface EventDefinition {
  name: string;
  payload: string;
  source: string;
  consumers: string[];
}

export interface ComponentDefinition {
  name: string;
  responsibility: string;
  stateOwned: string[];
  eventsEmitted: string[];
  eventsConsumed: string[];
  children: string[];
}

export interface DataFlowDefinition {
  direction: 'unidirectional' | 'bidirectional' | 'event-driven';
  strategy: string;
  stores: Array<{
    name: string;
    scope: 'global' | 'local' | 'session';
    state: string;
  }>;
}

export interface MotionConfig {
  easingDefaults: {
    enter: string;
    exit: string;
    move: string;
    ambient: string;
  };
  durationDefaults: {
    micro: string;
    interaction: string;
    transition: string;
    ambient: string;
  };
  sequencing: {
    stagger: string;
    delay: string;
    parallel: string;
  };
}

export interface DesignTokenGroup {
  color: Record<string, string>;
  typography: Record<string, string>;
  spacing: Record<string, string>;
  shape: Record<string, string>;
  elevation: Record<string, string>;
}

export interface PerformanceBudget {
  loadTime: string;
  timeToInteractive: string;
  frameRate: string;
  bundleSize: string;
  firstMeaningfulPaint: string;
}

export interface InstrumentationEvent {
  event: string;
  trigger: string;
  metric: string;
}

export interface QualityGate {
  id: string;
  description: string;
  dimension: 'experience' | 'performance' | 'accessibility' | 'reliability';
  passCondition: string;
  linkedGoal: string;
}

export interface EngineeringArchitecture {
  stateMachines: StateMachineDefinition[];
  events: EventDefinition[];
  components: ComponentDefinition[];
  dataFlow: DataFlowDefinition;
  motion: MotionConfig;
  tokens: DesignTokenGroup;
  performance: PerformanceBudget;
  instrumentation: InstrumentationEvent[];
  qualityGates: QualityGate[];
}

function toCamelCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase())
    .replace(/^[A-Z]/, c => c.toLowerCase());
}

function toKebabCase(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function detectEasing(principles: string[]): MotionConfig['easingDefaults'] {
  const joined = principles.join(' ').toLowerCase();
  const hasBounce = /bounce|spring|elastic|rubber/i.test(joined);
  const hasSmooth = /smooth|ease|gentle|soft|fade/i.test(joined);
  const hasDramatic = /dramatic|sharp|fast|snap|quick/i.test(joined);

  return {
    enter: hasBounce ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : hasDramatic ? 'cubic-bezier(0.4, 0, 0.2, 1)' : 'cubic-bezier(0.16, 1, 0.3, 1)',
    exit: hasSmooth ? 'cubic-bezier(0.4, 0, 1, 1)' : 'cubic-bezier(0.4, 0, 0.2, 1)',
    move: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ambient: hasBounce ? 'cubic-bezier(0.34, 1.56, 0.64, 1)' : 'linear',
  };
}

function detectDurations(principles: string[]): MotionConfig['durationDefaults'] {
  const joined = principles.join(' ').toLowerCase();
  const hasFast = /fast|quick|snap|instant/i.test(joined);
  const hasSlow = /slow|gentle|ambient|relaxed|meditative/i.test(joined);
  const mult = hasFast ? 0.6 : hasSlow ? 1.4 : 1;

  return {
    micro: `${Math.round(80 * mult)}ms`,
    interaction: `${Math.round(200 * mult)}ms`,
    transition: `${Math.round(400 * mult)}ms`,
    ambient: `${Math.round(2000 * mult)}ms`,
  };
}

function detectSequencing(principles: string[]): MotionConfig['sequencing'] {
  const joined = principles.join(' ').toLowerCase();
  const staggered = /stagger|waterfall|sequential|cascade/i.test(joined);

  return {
    stagger: staggered ? '60ms' : '0ms',
    delay: staggered ? '120ms' : '0ms',
    parallel: 'true',
  };
}

export class ExperienceCompiler {
  compile(arch: ExperienceArchitecture): EngineeringArchitecture {
    const events = this.compileEvents(arch);
    return {
      stateMachines: this.compileStateMachines(arch, events),
      events,
      components: this.compileComponents(arch),
      dataFlow: this.compileDataFlow(arch),
      motion: this.compileMotion(arch),
      tokens: this.compileTokens(arch),
      performance: this.compilePerformance(arch),
      instrumentation: this.compileInstrumentation(arch),
      qualityGates: this.compileQualityGates(arch),
    };
  }

  private compileStateMachines(arch: ExperienceArchitecture, events: EventDefinition[]): StateMachineDefinition[] {
    const machines: StateMachineDefinition[] = [];
    const eventNames = new Set(events.map(e => e.name));

    if (arch.emotionalJourney.states.length > 0) {
      machines.push({
        name: 'experience-flow',
        states: arch.emotionalJourney.states.map(s => toCamelCase(s)),
        initialState: toCamelCase(arch.emotionalJourney.states[0]),
        transitions: arch.emotionalJourney.transitions.map(t => {
          const from = toCamelCase(t.from);
          const to = toCamelCase(t.to);
          const eventName = `emotion:${from}:to:${to}`;
          return {
            from,
            to,
            on: eventNames.has(eventName) ? eventName : toCamelCase(t.trigger),
          };
        }),
      });
    }

    machines.push({
      name: 'system-status',
      states: ['idle', 'loading', 'ready', 'error'],
      initialState: 'idle',
      transitions: [
        { from: 'idle', to: 'loading', on: 'app:init' },
        { from: 'loading', to: 'ready', on: 'app:loaded' },
        { from: 'loading', to: 'error', on: 'system:loadFailed' },
        { from: 'error', to: 'loading', on: 'system:retry' },
      ],
    });

    machines.push({
      name: 'interaction-phase',
      states: ['passive', 'attentive', 'active', 'transitioning'],
      initialState: 'passive',
      transitions: [
        { from: 'passive', to: 'attentive', on: 'interaction:userApproach' },
        { from: 'attentive', to: 'active', on: 'interaction:userInput' },
        { from: 'active', to: 'transitioning', on: 'interaction:actionComplete' },
        { from: 'transitioning', to: 'passive', on: 'interaction:settle' },
        { from: 'transitioning', to: 'attentive', on: 'interaction:nextInput' },
      ],
    });

    return machines;
  }

  private compileEvents(arch: ExperienceArchitecture): EventDefinition[] {
    const events: EventDefinition[] = [
      { name: 'app:init', payload: 'void', source: 'system', consumers: ['system-status'] },
      { name: 'app:loaded', payload: 'void', source: 'system', consumers: ['system-status', 'experience-flow'] },
      { name: 'system:loadFailed', payload: '{ error: unknown }', source: 'system', consumers: ['system-status'] },
      { name: 'system:retry', payload: 'void', source: 'user', consumers: ['system-status'] },
      { name: 'interaction:userApproach', payload: 'void', source: 'user', consumers: ['interaction-phase'] },
      { name: 'interaction:userInput', payload: '{ target: string }', source: 'user', consumers: ['interaction-phase'] },
      { name: 'interaction:actionComplete', payload: '{ outcome: string }', source: 'interaction-phase', consumers: ['interaction-phase'] },
      { name: 'interaction:settle', payload: 'void', source: 'system', consumers: ['interaction-phase'] },
      { name: 'interaction:nextInput', payload: 'void', source: 'user', consumers: ['interaction-phase'] },
    ];

    if (arch.emotionalJourney.transitions.length > 0) {
      for (const t of arch.emotionalJourney.transitions) {
        events.push({
          name: `emotion:${toCamelCase(t.from)}:to:${toCamelCase(t.to)}`,
          payload: `{ trigger: string; timestamp: number }`,
          source: 'interaction-phase',
          consumers: ['experience-flow', ...this.inferEventConsumers(t)],
        });
      }
    }

    if (arch.interactionModel.inputs.length > 0) {
      for (const input of arch.interactionModel.inputs) {
        events.push({
          name: `input:${toKebabCase(input)}`,
          payload: `{ target: string; data?: unknown }`,
          source: 'user',
          consumers: ['interaction-phase', ...(arch.interactionModel.feedback.length > 0 ? ['feedback-controller'] : [])],
        });
      }
    }

    return events;
  }

  private inferEventConsumers(_t: ExperienceArchitecture['emotionalJourney']['transitions'][0]): string[] {
    return ['analytics'];
  }

  private compileComponents(arch: ExperienceArchitecture): ComponentDefinition[] {
    const components: ComponentDefinition[] = [];

    if (arch.narrative.hook && !this.isPlaceholder(arch.narrative.hook)) {
      components.push({
        name: 'EntrySequence',
        responsibility: `Hook: ${arch.narrative.hook.slice(0, 60)}`,
        stateOwned: [],
        eventsEmitted: ['emotion:*'],
        eventsConsumed: ['app:loaded', 'input:*'],
        children: [],
      });
    }

    components.push({
      name: 'MainContent',
      responsibility: 'Primary content area based on approved experience',
      stateOwned: [],
      eventsEmitted: [],
      eventsConsumed: ['emotion:*', 'input:*'],
      children: [],
    });

    if (arch.interactionModel.feedback.length > 0) {
      components.push({
        name: 'FeedbackLayer',
        responsibility: 'Renders visual/audio feedback for all user interactions',
        stateOwned: [],
        eventsEmitted: [],
        eventsConsumed: ['input:*', 'emotion:*'],
        children: [],
      });
    }

    if (arch.motionSystem.ambientMotion.length > 0) {
      components.push({
        name: 'AmbientMotionLayer',
        responsibility: 'Background animations, parallax, particle effects',
        stateOwned: [],
        eventsEmitted: [],
        eventsConsumed: [],
        children: [],
      });
    }

    const children = components.map(c => c.name);
    components.unshift({
      name: 'AppShell',
      responsibility: 'Root layout, global state providers, motion engine provider',
      stateOwned: ['experience-flow', 'system-status', 'interaction-phase'],
      eventsEmitted: ['app:init'],
      eventsConsumed: ['app:loaded'],
      children,
    });

    return components;
  }

  private compileDataFlow(arch: ExperienceArchitecture): DataFlowDefinition {
    const hasComplexInteractions = arch.interactionModel.inputs.length > 1
      && arch.interactionModel.stateTransitions.length > 1;

    return {
      direction: 'unidirectional',
      strategy: hasComplexInteractions ? 'state-machine + event bus' : 'simple props + events',
      stores: [
        { name: 'ExperienceState', scope: 'global', state: JSON.stringify(arch.emotionalJourney.states) },
        { name: 'SystemStatus', scope: 'global', state: '{ idle | loading | ready | error }' },
        { name: 'InteractionState', scope: 'session', state: '{ phase, lastInput, feedbackQueue }' },
      ],
    };
  }

  private compileMotion(arch: ExperienceArchitecture): MotionConfig {
    return {
      easingDefaults: detectEasing(arch.motionSystem.principles),
      durationDefaults: detectDurations(arch.motionSystem.principles),
      sequencing: detectSequencing(arch.motionSystem.principles),
    };
  }

  private compileTokens(arch: ExperienceArchitecture): DesignTokenGroup {
    const hasColor = !this.isPlaceholder(arch.visualLanguage.color);
    const hasTypography = !this.isPlaceholder(arch.visualLanguage.typography);
    const hasSpace = !this.isPlaceholder(arch.visualLanguage.space);

    return {
      color: hasColor
        ? { primary: '— from visual language', surface: '— from visual language', text: '— from visual language', accent: '— from visual language' }
        : { primary: '#000', surface: '#fff', text: '#111', accent: '#555' },
      typography: hasTypography
        ? { fontFamily: '— from visual language', heading: '— from visual language', body: '— from visual language' }
        : { fontFamily: 'system-ui, sans-serif', heading: '700 1.5rem/1.2 system-ui', body: '400 1rem/1.5 system-ui' },
      spacing: hasSpace
        ? { unit: '— from visual language', grid: '— from visual language' }
        : { unit: '8px', grid: '4px' },
      shape: { radius: '— from visual language', border: '— from visual language' },
      elevation: { shadow: '— from visual language', blur: '— from visual language' },
    };
  }

  private compilePerformance(arch: ExperienceArchitecture): PerformanceBudget {
    const speedGoal = arch.experienceGoals.some(g => /fast|quick|instant|immediate|responsive/i.test(g));
    const richGoal = arch.experienceGoals.some(g => /rich|immersive|cinematic|elaborate|detailed/i.test(g));

    return {
      loadTime: speedGoal ? '1.5s' : richGoal ? '3s' : '2s',
      timeToInteractive: speedGoal ? '2s' : '3.5s',
      frameRate: richGoal ? '30fps' : '60fps',
      bundleSize: speedGoal ? '150KB' : richGoal ? '400KB' : '250KB',
      firstMeaningfulPaint: speedGoal ? '0.8s' : '1.5s',
    };
  }

  private compileInstrumentation(arch: ExperienceArchitecture): InstrumentationEvent[] {
    const events: InstrumentationEvent[] = [
      { event: 'app:load', trigger: 'Application ready', metric: 'loadTime' },
    ];

    for (const m of arch.successMetrics) {
      const name = toCamelCase(m.metric.replace(/[^a-zA-Z0-9\s]/g, ''));
      events.push({
        event: `metric:${name.slice(0, 30)}`,
        trigger: m.metric.slice(0, 60),
        metric: m.target || 'to be defined',
      });
    }

    if (arch.emotionalJourney.transitions.length > 0) {
      for (const t of arch.emotionalJourney.transitions) {
        events.push({
          event: `emotion:${toCamelCase(t.from)}:to:${toCamelCase(t.to)}`,
          trigger: t.trigger.slice(0, 60),
          metric: 'transitionTime',
        });
      }
    }

    return events;
  }

  private compileQualityGates(arch: ExperienceArchitecture): QualityGate[] {
    const gates: QualityGate[] = [
      {
        id: 'QG-001',
        description: 'All state machines defined and wired',
        dimension: 'reliability',
        passCondition: 'No unhandled state transitions',
        linkedGoal: 'System reliability',
      },
      {
        id: 'QG-002',
        description: 'Motion matches approved easing and duration',
        dimension: 'experience',
        passCondition: 'CSS/JS motion values match compiler output',
        linkedGoal: 'Emotional Journey',
      },
    ];

    let i = 3;
    for (const goal of arch.experienceGoals) {
      gates.push({
        id: `QG-${String(i).padStart(3, '0')}`,
        description: goal.slice(0, 80),
        dimension: 'experience',
        passCondition: `Verified through user testing: ${goal.slice(0, 60)}`,
        linkedGoal: goal.slice(0, 60),
      });
      i++;
    }

    return gates;
  }

  private isPlaceholder(val: string): boolean {
    const placeholders = ['to be defined', 'to be determined', 'todo', 'tbd', '— from'];
    return placeholders.some(p => val.toLowerCase().startsWith(p));
  }
}
