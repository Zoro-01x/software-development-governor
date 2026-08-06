import { describe, it, expect } from 'vitest';
import { ExperienceGovernor, ExperienceArchitecture } from '../src/components/experience-governor.js';

function makeMinimalArch(): ExperienceArchitecture {
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

function makeEmptyArch(): ExperienceArchitecture {
  return {
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
}

function makePlaceholderArch(): ExperienceArchitecture {
  const arch = makeMinimalArch();
  arch.vision = 'TODO';
  arch.mission = 'TBD';
  arch.emotionalJourney.states = ['Curiosity'];
  arch.emotionalJourney.transitions = [];
  return arch;
}

function makeWeakEmotionalArch(): ExperienceArchitecture {
  const arch = makeMinimalArch();
  arch.emotionalJourney = {
    states: ['Curiosity', 'Boredom'],
    transitions: [
      { from: 'Curiosity', to: 'Boredom', trigger: '' },
    ],
  };
  return arch;
}

describe('Experience Governor', () => {
  const governor = new ExperienceGovernor();

  describe('approval decision', () => {
    it('APPROVES a complete, well-structured architecture', () => {
      const result = governor.evaluate(makeMinimalArch());
      expect(result.decision).toBe('APPROVED');
      expect(result.scores.length).toBe(10);
    });

    it('REJECTS an empty architecture', () => {
      const result = governor.evaluate(makeEmptyArch());
      expect(result.decision).toBe('REJECT');
    });

    it('REJECTS a mostly-empty architecture', () => {
      const result = governor.evaluate(makePlaceholderArch());
      expect(result.decision).toBe('REJECT');
    });

    it('REJECTS when multiple dimensions have high-severity issues', () => {
      const result = governor.evaluate(makeEmptyArch());
      expect(result.decision).toBe('REJECT');
    });

    it('returns REVISE for architecture with some issues', () => {
      const arch = makeMinimalArch();
      arch.narrative = { hook: 'Hook', arc: '', pacing: '', resolution: '' };
      arch.successMetrics = [];
      const result = governor.evaluate(arch);
      expect(result.decision).toBe('REVISE');
    });
  });

  describe('scoring', () => {
    it('scores all 10 dimensions', () => {
      const result = governor.evaluate(makeMinimalArch());
      expect(result.scores).toHaveLength(10);
    });

    it('assigns 9/10 for strong vision', () => {
      const result = governor.evaluate(makeMinimalArch());
      const vision = result.scores.find(s => s.dimension === 'Vision Alignment');
      expect(vision!.score).toBe(9);
    });

    it('assigns 0/10 for empty vision', () => {
      const result = governor.evaluate(makeEmptyArch());
      const vision = result.scores.find(s => s.dimension === 'Vision Alignment');
      expect(vision!.score).toBe(0);
    });

    it('every score is between 0 and 10', () => {
      const result = governor.evaluate(makeMinimalArch());
      for (const s of result.scores) {
        expect(s.score).toBeGreaterThanOrEqual(0);
        expect(s.score).toBeLessThanOrEqual(10);
      }
    });

    it('each score has a reason string', () => {
      const result = governor.evaluate(makeMinimalArch());
      for (const s of result.scores) {
        expect(s.reason.length).toBeGreaterThan(0);
      }
    });
  });

  describe('critical issues', () => {
    it('flags high-severity issues for empty architecture', () => {
      const result = governor.evaluate(makeEmptyArch());
      const highIssues = result.criticalIssues.filter(i => i.severity === 'high');
      expect(highIssues.length).toBeGreaterThan(0);
    });

    it('flags missing audience dimensions', () => {
      const result = governor.evaluate(makeEmptyArch());
      const audienceIssues = result.criticalIssues.filter(i => i.dimension === 'Audience');
      expect(audienceIssues.length).toBeGreaterThan(0);
    });

    it('flags missing emotional journey entirely', () => {
      const result = governor.evaluate(makeEmptyArch());
      const emotionIssues = result.criticalIssues.filter(i => i.dimension === 'Emotional Journey');
      expect(emotionIssues.length).toBeGreaterThan(0);
    });

    it('assigns severity levels correctly', () => {
      const result = governor.evaluate(makeEmptyArch());
      for (const issue of result.criticalIssues) {
        expect(['high', 'medium', 'low']).toContain(issue.severity);
      }
    });
  });

  describe('recommendations', () => {
    it('recommends defining vision when missing', () => {
      const result = governor.evaluate(makeEmptyArch());
      const visionRecs = result.recommendations.filter(r => r.action.toLowerCase().includes('vision'));
      expect(visionRecs.length).toBeGreaterThan(0);
    });

    it('recommends defining audience when missing', () => {
      const result = governor.evaluate(makeEmptyArch());
      const audienceRecs = result.recommendations.filter(r => r.action.toLowerCase().includes('audience'));
      expect(audienceRecs.length).toBeGreaterThan(0);
    });

    it('recommends surprise/delight when emotional journey lacks it', () => {
      const arch = makeMinimalArch();
      arch.emotionalJourney.states = ['Curiosity', 'Confidence', 'Satisfaction'];
      const result = governor.evaluate(arch);
      const surpriseRecs = result.recommendations.filter(r => r.action.toLowerCase().includes('surprise'));
      expect(surpriseRecs.length).toBeGreaterThan(0);
    });

    it('assigns priority levels', () => {
      const result = governor.evaluate(makeEmptyArch());
      for (const rec of result.recommendations) {
        expect(['essential', 'recommended', 'optional']).toContain(rec.priority);
      }
    });
  });

  describe('summary', () => {
    it('includes average score in summary', () => {
      const result = governor.evaluate(makeMinimalArch());
      expect(result.summary).toContain('APPROVED');
    });

    it('includes issue count in REVISE summary', () => {
      const arch = makeMinimalArch();
      arch.successMetrics = [];
      arch.narrative.resolution = '';
      const result = governor.evaluate(arch);
      expect(result.summary).toContain('REVISE');
    });

    it('includes high-severity count in REJECT summary', () => {
      const result = governor.evaluate(makeEmptyArch());
      expect(result.summary).toContain('REJECTED');
    });
  });

  describe('emotional journey heuristics', () => {
    it('detects missing surprise in emotional states', () => {
      const arch = makeMinimalArch();
      arch.emotionalJourney.states = ['Curiosity', 'Understanding', 'Satisfaction'];
      const result = governor.evaluate(arch);
      const surpriseRec = result.recommendations.find(r => r.action.includes('surprise'));
      expect(surpriseRec).toBeDefined();
    });

    it('detects missing tension in emotional states', () => {
      const arch = makeMinimalArch();
      arch.emotionalJourney.states = ['Delight', 'Joy', 'Satisfaction'];
      const result = governor.evaluate(arch);
      const tensionRec = result.recommendations.find(r => r.action.includes('tension'));
      expect(tensionRec).toBeDefined();
    });

    it('detects negative emotions and recommends review', () => {
      const arch = makeMinimalArch();
      arch.emotionalJourney.states = ['Curiosity', 'Frustration', 'Relief'];
      const result = governor.evaluate(arch);
      const negativeRec = result.recommendations.find(r => r.action.includes('negative emotion'));
      expect(negativeRec).toBeDefined();
    });
  });
});
