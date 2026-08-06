import { ExperienceArchitecture } from '../../src/components/experience-governor.js';
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '../../src/reasoning.js';

export function makeApprovedArchitecture(): ExperienceArchitecture {
  return {
    vision: 'A world where every interaction feels intentional and human.',
    mission: 'To create a design system that brings joy to daily workflows.',
    audience: {
      demographics: 'Designers and developers aged 25-45',
      psychographics: 'Value craftsmanship, efficiency, and beauty',
      scenario: 'Arriving at work, opening their tools, starting a new project',
    },
    experienceGoals: [
      'Users feel a sense of discovery within 10 seconds',
      'Users complete their primary task without confusion',
      'Users want to return tomorrow',
    ],
    emotionalJourney: {
      states: ['Curiosity', 'Discovery', 'Confidence', 'Delight'],
      transitions: [
        { from: 'Curiosity', to: 'Discovery', trigger: 'First interaction reveals unexpected detail' },
        { from: 'Discovery', to: 'Confidence', trigger: 'Pattern becomes clear and predictable' },
        { from: 'Confidence', to: 'Delight', trigger: 'Polished micro-interaction exceeds expectation' },
      ],
    },
    narrative: {
      hook: 'The first pixel you see should make you pause.',
      arc: 'A journey from curiosity to mastery through layered discovery.',
      pacing: 'Fast initial hook, slow reveal of depth, final flourish.',
      resolution: 'The user walks away feeling the tool understood them.',
    },
    interactionModel: {
      inputs: ['Click', 'Scroll', 'Keyboard'],
      feedback: ['Hover states with subtle scale', 'Scroll-driven parallax', 'Input validation shimmer'],
      stateTransitions: ['Passive → Attentive on hover', 'Attentive → Active on click', 'Active → Complete on action'],
      flow: 'Entry → Explore → Act → Reflect',
    },
    motionSystem: {
      principles: ['Ease-out for exits', 'Spring for entrances', 'Stagger children by depth'],
      microInteractions: ['Button press: subtle scale down', 'Toggle: smooth 180deg rotation'],
      transitions: ['Page transitions: cross-fade with slight scale shift'],
      ambientMotion: ['Gentle parallax on background elements', 'Particle system at low density'],
    },
    visualLanguage: {
      color: 'Cool dark palette with lime green accent. Dark surfaces (#151515), white text, green (#E6F536) for highlights.',
      typography: 'Monospace for code, sans-serif for UI, hierarchical scale with 1.25 ratio.',
      space: '8px grid, 4px micro-unit, generous padding on surfaces.',
      shape: 'Slightly rounded corners (8px), no borders, depth via shadow.',
      light: 'Subtle inner glow on active elements, soft drop shadows on elevated surfaces.',
    },
    successMetrics: [
      { metric: 'Time to first interaction', target: '< 3s', observable: true, verifiable: true, actionable: true },
      { metric: 'User can recall 3 features after first visit', target: '> 70% in testing', observable: true, verifiable: true, actionable: true },
    ],
  };
}

export class ApprovedArchitectureProvider implements ReasoningProvider {
  readonly name = 'stub-approved';

  async reason(_input: ReasoningInput): Promise<ReasoningResult> {
    return {
      architecture: makeApprovedArchitecture(),
      rationale: [
        {
          section: 'Emotional Journey',
          decision: 'Curiosity → Discovery → Confidence → Delight',
          reasoning: 'Test fixture architecture approved by the Experience Governor.',
        },
      ],
      openQuestions: [],
    };
  }
}
