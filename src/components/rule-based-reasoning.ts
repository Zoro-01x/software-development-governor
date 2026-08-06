import { ExperienceArchitecture } from './experience-governor.js';
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '../reasoning.js';
import { DesignRationale, OpenQuestion } from './experience-designer.js';

function inferAudienceFromRequirements(text: string): { demographics: string; psychographics: string; scenario: string } {
  const clues = {
    hasDeveloper: /developer|engineer|coder|programmer|technical/i.test(text),
    hasDesigner: /designer|creative|artist|ux/i.test(text),
    hasExecutive: /executive|ceo|founder|leader|manager|decision/i.test(text),
    hasConsumer: /user|customer|visitor|audience|viewer|general/i.test(text),
    hasBeginner: /beginner|new|start|learn|simple|easy/i.test(text),
    hasExpert: /expert|advanced|professional|pro|power/i.test(text),
    hasMobile: /mobile|phone|app|ios|android/i.test(text),
    hasWeb: /web|browser|site|online|saas/i.test(text),
  };

  if (clues.hasDeveloper) {
    return {
      demographics: 'Technical professionals, likely 25-45, experienced with similar tools',
      psychographics: 'Value efficiency, precision, and control. Skeptical of fluff. Want to feel empowered.',
      scenario: 'Arrives with a specific task or problem. Has limited patience for onboarding.',
    };
  }
  if (clues.hasDesigner) {
    return {
      demographics: 'Creative professionals, 22-45, working in digital product design',
      psychographics: 'Value aesthetics, craftsmanship, and inspiration. Motivated by beauty and flow.',
      scenario: 'Exploring for inspiration or evaluating a tool. Responsive to visual quality.',
    };
  }
  if (clues.hasExecutive) {
    return {
      demographics: 'Business leaders and decision-makers, 35-60',
      psychographics: 'Value clarity, credibility, and ROI. Time-constrained. Want confidence quickly.',
      scenario: 'Evaluating a solution. Needs to understand value proposition in seconds.',
    };
  }
  if (clues.hasConsumer || clues.hasBeginner) {
    return {
      demographics: 'General audience, broad age range, varying technical comfort',
      psychographics: 'Value simplicity, delight, and reliability. Want to feel capable.',
      scenario: 'May arrive via recommendation or search. Has no prior context.',
    };
  }
  return {
    demographics: 'To be determined from project context',
    psychographics: 'To be determined from project context',
    scenario: 'To be determined from project context',
  };
}

function inferEmotionalStates(text: string): string[] {
  const states: string[] = ['Curiosity'];
  if (/explore|discover|browse|search|learn/i.test(text)) states.push('Discovery');
  if (/create|build|design|make|produce/i.test(text)) states.push('Flow');
  if (/solve|fix|resolve|complete/i.test(text)) states.push('Confidence');
  if (/wow|surprise|delight|amaze|impress/i.test(text)) states.push('Delight');
  if (/share|show|present|publish/i.test(text)) states.push('Pride');
  if (states.length < 3) states.push('Satisfaction');
  return states;
}

function inferInteractionInputs(text: string): string[] {
  const inputs: string[] = ['Click'];
  if (/scroll|browse|feed|timeline|list/i.test(text)) inputs.push('Scroll');
  if (/type|input|form|field|search/i.test(text)) inputs.push('Keyboard input');
  if (/drag|drop|move|rearrange/i.test(text)) inputs.push('Drag and drop');
  if (/touch|tap|swipe|gesture/i.test(text)) inputs.push('Touch gestures');
  return inputs;
}

function extractMission(req: string): string {
  const match = req.match(/(?:enable|allow|help|let|make it (?:easy|possible) for)\s+(\w+(?:\s+\w+){0,5})/i);
  if (match) return match[1];
  const words = req.replace(/[^\w\s]/g, '').split(/\s+/).filter(w => w.length > 3).slice(0, 6);
  return words.join(' ') || 'accomplish their goals';
}

function extractGoals(req: string): string[] {
  const goals: string[] = [];
  if (/learn|understand|comprehend/i.test(req)) goals.push('The user should feel they understand something new');
  if (/create|build|make|design/i.test(req)) goals.push('The user should feel a sense of creation and ownership');
  if (/explore|discover|browse/i.test(req)) goals.push('The user should experience moments of discovery');
  if (/fast|quick|speed|performant/i.test(req)) goals.push('The user should feel the experience is responsive and fluid');
  if (/share|show|publish|social/i.test(req)) goals.push('The user should feel pride in sharing their work');
  if (goals.length === 0) goals.push('The user should feel their task was completed successfully');
  if (goals.length === 1) goals.push('The user should want to return');
  if (goals.length < 3) goals.push('The user should feel confident in their next action');
  return goals.slice(0, 5);
}

function generateTransitions(states: string[]): Array<{ from: string; to: string; trigger: string }> {
  const transitions: Array<{ from: string; to: string; trigger: string }> = [];
  for (let i = 0; i < states.length - 1; i++) {
    transitions.push({
      from: states[i],
      to: states[i + 1],
      trigger: 'Define what causes this emotional shift',
    });
  }
  return transitions;
}

function extractHook(req: string): string {
  const sentences = req.split(/[.!?]+/).filter(s => s.trim().length > 10);
  if (sentences.length > 0) return sentences[0].trim();
  return req.slice(0, 80) + '...';
}

function inferFeedback(inputs: string[]): string[] {
  const feedback: string[] = [];
  if (inputs.includes('Click')) feedback.push('Visual hover and active states on all interactive elements');
  if (inputs.includes('Scroll')) feedback.push('Scroll-linked visual feedback (parallax, progress, reveal)');
  if (inputs.includes('Keyboard input')) feedback.push('Real-time input validation and suggestion');
  if (feedback.length === 0) feedback.push('Visual confirmation of all user actions');
  return feedback;
}

function inferStateTransitions(states: string[]): string[] {
  return states.slice(0, -1).map((from, i) =>
    `${from} → ${states[i + 1]}: Define the UI transition that accompanies this emotional shift`
  );
}

function inferFlow(req: string): string {
  if (/landing|home|page|site/i.test(req)) return 'Entry → Explore → Understand → Act → Reflect';
  if (/app|tool|dashboard|panel/i.test(req)) return 'Launch → Task → Complete → Next Task or Exit';
  if (/game|play|interactive/i.test(req)) return 'Start → Challenge → Reward → Next Challenge';
  return 'Entry → Engage → Complete → Exit';
}

function extractMetrics(req: string): ExperienceArchitecture['successMetrics'] {
  const metrics: ExperienceArchitecture['successMetrics'] = [];

  if (/time|speed|fast|quick/i.test(req)) {
    metrics.push({
      metric: 'Task completion time',
      target: 'Define target duration',
      observable: true, verifiable: true, actionable: true,
    });
  }
  metrics.push({
    metric: 'User can articulate the value proposition after first visit',
    target: 'Define in user testing',
    observable: true, verifiable: true, actionable: true,
  });

  if (metrics.length < 2) {
    metrics.push({
      metric: 'Define the primary success metric for this experience',
      target: 'Set a measurable target',
      observable: true, verifiable: false, actionable: true,
    });
  }

  return metrics.slice(0, 5);
}

const PLACEHOLDER_FIELDS = ['To be developed', 'To be defined', 'To be determined', 'Define the hook', 'To be detailed'];

export class RuleBasedReasoningProvider implements ReasoningProvider {
  readonly name = 'rule-based';

  async reason(input: ReasoningInput): Promise<ReasoningResult> {
    const req = input.requirements;
    const projectName = input.projectName || 'Unnamed Project';
    const rationale: DesignRationale[] = [];
    const openQuestions: OpenQuestion[] = [];

    const audience = inferAudienceFromRequirements(req);
    rationale.push({
      section: 'Audience',
      decision: `Targeting ${audience.demographics.split(',')[0]}`,
      reasoning: 'Inferred from language cues in requirements. Review and adjust.',
    });

    const emotionalStates = inferEmotionalStates(req);
    rationale.push({
      section: 'Emotional Journey',
      decision: `Starting with ${emotionalStates[0]}, building through ${emotionalStates.slice(1, -1).join(', ')}, ending with ${emotionalStates[emotionalStates.length - 1]}`,
      reasoning: 'Derived from action verbs in the requirements.',
    });

    const interactionInputs = inferInteractionInputs(req);
    rationale.push({
      section: 'Interaction Model',
      decision: `Primary inputs: ${interactionInputs.join(', ')}`,
      reasoning: 'Based on interaction types implied by the requirements.',
    });

    const hasNarrativeHints = /story|narrative|journey|guide|walkthrough|tutorial/i.test(req);
    if (!hasNarrativeHints) {
      openQuestions.push({
        question: 'What story does this experience tell?',
        dimension: 'Narrative',
        suggestedApproach: 'Consider framing the user\'s journey as a narrative arc with a hook, rising action, and resolution.',
      });
    }

    const hasMotionHints = /animation|motion|transition|animate|parallax|particle/i.test(req);
    if (!hasMotionHints) {
      openQuestions.push({
        question: 'What role should motion play in this experience?',
        dimension: 'Motion System',
        suggestedApproach: 'Decide whether motion is purely functional (transitions) or also ambient (atmosphere).',
      });
    }

    const architecture: ExperienceArchitecture = {
      vision: `A world where ${projectName} changes how people ${req.length > 60 ? req.slice(0, 60) + '...' : req}`,
      mission: `To build ${projectName} that enables users to ${extractMission(req)}`,
      audience,
      experienceGoals: extractGoals(req),
      emotionalJourney: {
        states: emotionalStates,
        transitions: generateTransitions(emotionalStates),
      },
      narrative: {
        hook: hasNarrativeHints ? extractHook(req) : PLACEHOLDER_FIELDS[3],
        arc: PLACEHOLDER_FIELDS[0],
        pacing: PLACEHOLDER_FIELDS[0],
        resolution: PLACEHOLDER_FIELDS[0],
      },
      interactionModel: {
        inputs: interactionInputs,
        feedback: inferFeedback(interactionInputs),
        stateTransitions: inferStateTransitions(emotionalStates),
        flow: inferFlow(req),
      },
      motionSystem: {
        principles: [PLACEHOLDER_FIELDS[1]],
        microInteractions: [PLACEHOLDER_FIELDS[4]],
        transitions: [PLACEHOLDER_FIELDS[4]],
        ambientMotion: hasMotionHints ? ['Explore background animation, parallax, or particle effects'] : [],
      },
      visualLanguage: {
        color: PLACEHOLDER_FIELDS[1],
        typography: PLACEHOLDER_FIELDS[1],
        space: PLACEHOLDER_FIELDS[1],
        shape: PLACEHOLDER_FIELDS[1],
        light: PLACEHOLDER_FIELDS[1],
      },
      successMetrics: extractMetrics(req),
    };

    return { architecture, rationale, openQuestions };
  }
}
