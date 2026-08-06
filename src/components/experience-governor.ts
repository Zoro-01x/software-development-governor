export type ExperienceDecision = 'APPROVED' | 'REVISE' | 'REJECT';

export interface ExperienceArchitecture {
  vision: string;
  mission: string;
  audience: {
    demographics: string;
    psychographics: string;
    scenario: string;
  };
  experienceGoals: string[];
  emotionalJourney: {
    states: string[];
    transitions: Array<{
      from: string;
      to: string;
      trigger: string;
    }>;
  };
  narrative: {
    hook: string;
    arc: string;
    pacing: string;
    resolution: string;
  };
  interactionModel: {
    inputs: string[];
    feedback: string[];
    stateTransitions: string[];
    flow: string;
  };
  motionSystem: {
    principles: string[];
    microInteractions: string[];
    transitions: string[];
    ambientMotion: string[];
  };
  visualLanguage: {
    color: string;
    typography: string;
    space: string;
    shape: string;
    light: string;
  };
  successMetrics: Array<{
    metric: string;
    target: string;
    observable: boolean;
    verifiable: boolean;
    actionable: boolean;
  }>;
}

export interface DimensionScore {
  dimension: string;
  score: number;
  reason: string;
}

export interface CriticalIssue {
  severity: 'high' | 'medium' | 'low';
  issue: string;
  dimension: string;
}

export interface Recommendation {
  priority: 'essential' | 'recommended' | 'optional';
  action: string;
  rationale: string;
}

export interface GovernorResult {
  decision: ExperienceDecision;
  scores: DimensionScore[];
  criticalIssues: CriticalIssue[];
  recommendations: Recommendation[];
  summary: string;
}

function nonEmpty(val: unknown): boolean {
  if (typeof val === 'string') return val.trim().length > 0;
  if (Array.isArray(val)) return val.length > 0 && val.every(v => nonEmpty(v));
  if (typeof val === 'object' && val !== null) return Object.values(val).some(v => nonEmpty(v));
  return false;
}

function isGeneric(val: string): boolean {
  const generics = ['todo', 'tbd', 'placeholder', 'example', 'to be determined', 'fill this in', 'n/a', 'none', 'see above'];
  const lower = val.toLowerCase().trim();
  return generics.some(g => lower === g || lower.startsWith(g));
}

export class ExperienceGovernor {

  evaluate(arch: ExperienceArchitecture): GovernorResult {
    const scores: DimensionScore[] = [];
    const criticalIssues: CriticalIssue[] = [];
    const recommendations: Recommendation[] = [];

    scores.push(this.scoreVision(arch, criticalIssues, recommendations));
    scores.push(this.scoreMission(arch, criticalIssues, recommendations));
    scores.push(this.scoreAudience(arch, criticalIssues, recommendations));
    scores.push(this.scoreGoals(arch, criticalIssues, recommendations));
    scores.push(this.scoreEmotionalJourney(arch, criticalIssues, recommendations));
    scores.push(this.scoreNarrative(arch, criticalIssues, recommendations));
    scores.push(this.scoreInteractionModel(arch, criticalIssues, recommendations));
    scores.push(this.scoreMotionSystem(arch, criticalIssues, recommendations));
    scores.push(this.scoreVisualLanguage(arch, criticalIssues, recommendations));
    scores.push(this.scoreMetrics(arch, criticalIssues, recommendations));

    const avgScore = scores.reduce((a, s) => a + s.score, 0) / scores.length;
    const hasHighIssues = criticalIssues.some(i => i.severity === 'high');

    if (hasHighIssues || avgScore < 4) {
      return {
        decision: 'REJECT',
        scores,
        criticalIssues,
        recommendations,
        summary: `REJECTED — Average score ${avgScore.toFixed(1)}/10, ${criticalIssues.filter(i => i.severity === 'high').length} high-severity issues. The Experience Architecture needs fundamental redesign before resubmission.`,
      };
    }

    if (criticalIssues.length > 0 || avgScore < 7) {
      return {
        decision: 'REVISE',
        scores,
        criticalIssues,
        recommendations,
        summary: `REVISE — Average score ${avgScore.toFixed(1)}/10, ${criticalIssues.length} issue(s), ${recommendations.length} recommendation(s). Address the critical issues and consider the recommendations.`,
      };
    }

    return {
      decision: 'APPROVED',
      scores,
      criticalIssues,
      recommendations,
      summary: `APPROVED — Average score ${avgScore.toFixed(1)}/10. Strong experience design across all dimensions.`,
    };
  }

  private scoreVision(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    if (!nonEmpty(arch.vision)) {
      issues.push({ severity: 'high', issue: 'Vision is empty or undefined', dimension: 'Vision' });
      recs.push({ priority: 'essential', action: 'Define a clear one-sentence vision of the future this project creates', rationale: 'Without vision, the experience lacks direction' });
      return { dimension: 'Vision Alignment', score: 0, reason: 'Empty' };
    }
    if (isGeneric(arch.vision)) {
      issues.push({ severity: 'high', issue: 'Vision contains placeholder text', dimension: 'Vision' });
      return { dimension: 'Vision Alignment', score: 2, reason: 'Placeholder text, not a real vision' };
    }
    if (arch.vision.length < 20) {
      issues.push({ severity: 'medium', issue: 'Vision is too short to convey meaningful direction', dimension: 'Vision' });
      recs.push({ priority: 'recommended', action: 'Expand the vision to describe the specific future state', rationale: 'Short visions are generic and forgettable' });
      return { dimension: 'Vision Alignment', score: 5, reason: 'Present but too brief' };
    }
    return { dimension: 'Vision Alignment', score: 9, reason: 'Clear and specific' };
  }

  private scoreMission(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    if (!nonEmpty(arch.mission)) {
      issues.push({ severity: 'high', issue: 'Mission is empty or undefined', dimension: 'Mission' });
      recs.push({ priority: 'essential', action: 'Define what this project builds or enables', rationale: 'Mission connects vision to action' });
      return { dimension: 'Mission Clarity', score: 0, reason: 'Empty' };
    }
    if (isGeneric(arch.mission)) {
      issues.push({ severity: 'high', issue: 'Mission contains placeholder text', dimension: 'Mission' });
      return { dimension: 'Mission Clarity', score: 2, reason: 'Placeholder text' };
    }
    return { dimension: 'Mission Clarity', score: 8, reason: 'Defined and actionable' };
  }

  private scoreAudience(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    const missing: string[] = [];
    if (!nonEmpty(arch.audience.demographics)) missing.push('demographics');
    if (!nonEmpty(arch.audience.psychographics)) missing.push('psychographics');
    if (!nonEmpty(arch.audience.scenario)) missing.push('scenario');

    if (missing.length === 3) {
      issues.push({ severity: 'high', issue: 'Audience is completely undefined', dimension: 'Audience' });
      recs.push({ priority: 'essential', action: 'Define audience across all three dimensions (demographics, psychographics, scenario)', rationale: 'Without audience definition, the experience cannot be designed for anyone' });
      return { dimension: 'Audience Understanding', score: 0, reason: 'Completely undefined' };
    }
    if (missing.length > 0) {
      issues.push({ severity: 'high', issue: `Audience missing: ${missing.join(', ')}`, dimension: 'Audience' });
      return { dimension: 'Audience Understanding', score: 3, reason: `Missing: ${missing.join(', ')}` };
    }
    return { dimension: 'Audience Understanding', score: 8, reason: 'All three dimensions defined' };
  }

  private scoreGoals(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    if (!arch.experienceGoals || arch.experienceGoals.length === 0) {
      issues.push({ severity: 'high', issue: 'No experience goals defined', dimension: 'Experience Goals' });
      recs.push({ priority: 'essential', action: 'Define 3-5 measurable human outcomes for this experience', rationale: 'Goals define what success looks like for the user' });
      return { dimension: 'Experience Goals', score: 0, reason: 'No goals' };
    }
    const genericGoals = arch.experienceGoals.filter(g => isGeneric(g));
    if (genericGoals.length > 0) {
      issues.push({ severity: 'medium', issue: `Goal contains placeholder text: "${genericGoals[0]}"`, dimension: 'Experience Goals' });
      return { dimension: 'Experience Goals', score: 3, reason: 'Contains placeholders' };
    }
    if (arch.experienceGoals.length < 3) {
      issues.push({ severity: 'medium', issue: `Only ${arch.experienceGoals.length} goals (minimum 3 required)`, dimension: 'Experience Goals' });
      recs.push({ priority: 'recommended', action: `Add ${3 - arch.experienceGoals.length} more experience goals`, rationale: 'More goals create a richer target for the design' });
      return { dimension: 'Experience Goals', score: 5, reason: `${arch.experienceGoals.length}/3 minimum met` };
    }
    const score = Math.min(10, 5 + arch.experienceGoals.length);
    return { dimension: 'Experience Goals', score, reason: `${arch.experienceGoals.length} goals defined` };
  }

  private scoreEmotionalJourney(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    if (!arch.emotionalJourney.states || arch.emotionalJourney.states.length < 2) {
      issues.push({ severity: 'high', issue: 'Emotional journey has fewer than 2 states', dimension: 'Emotional Journey' });
      recs.push({ priority: 'essential', action: 'Define at least 3 emotional states the user moves through', rationale: 'A flat emotional arc creates a forgettable experience' });
      return { dimension: 'Emotional Journey', score: 0, reason: 'Too few states' };
    }

    if (!arch.emotionalJourney.transitions || arch.emotionalJourney.transitions.length === 0) {
      issues.push({ severity: 'high', issue: 'No state transitions defined', dimension: 'Emotional Journey' });
      recs.push({ priority: 'essential', action: 'Define what triggers each emotional transition', rationale: 'Transitions are where the design creates emotion' });
      return { dimension: 'Emotional Journey', score: 3, reason: 'States exist but no transition triggers' };
    }

    const genericTransitions = arch.emotionalJourney.transitions.filter(t => !nonEmpty(t.trigger) || isGeneric(t.trigger));
    const hasSurprise = arch.emotionalJourney.states.some(s => /surprise|delight|wonder|awe|discovery/i.test(s));
    const hasTension = arch.emotionalJourney.states.some(s => /tension|curiosity|intrigue|suspense|anticipation/i.test(s));
    const hasResolution = arch.emotionalJourney.states.some(s => /satisfaction|delight|confidence|mastery|calm|joy/i.test(s));
    const hasNegative = arch.emotionalJourney.states.some(s => /frustration|confusion|boredom|anxiety/i.test(s));

    if (!hasSurprise) {
      recs.push({ priority: 'recommended', action: 'Add a moment of surprise or discovery to the emotional journey', rationale: 'Surprise is the strongest memory-forming emotion' });
    }
    if (!hasTension) {
      recs.push({ priority: 'recommended', action: 'Introduce tension or curiosity early in the journey', rationale: 'Tension creates engagement and drives exploration' });
    }
    if (!hasResolution) {
      recs.push({ priority: 'recommended', action: 'End the journey with a positive resolution state', rationale: 'Users remember the peak and the end of an experience' });
    }
    if (hasNegative) {
      recs.push({ priority: 'optional', action: 'Consider whether negative emotions serve the intended experience', rationale: 'Negative emotions should be intentional, not accidental' });
    }

    let score = 7;
    if (genericTransitions.length > 0) {
      issues.push({ severity: 'medium', issue: `${genericTransitions.length} transition(s) missing trigger descriptions`, dimension: 'Emotional Journey' });
      score -= 2;
    }
    if (arch.emotionalJourney.states.length >= 5) score += 1;
    if (arch.emotionalJourney.states.length < 3) score -= 2;
    if (!hasSurprise) score -= 1;
    if (!hasTension) score -= 1;

    return { dimension: 'Emotional Journey', score: Math.max(0, Math.min(10, score)), reason: `${arch.emotionalJourney.states.length} states, ${arch.emotionalJourney.transitions.length} transitions` };
  }

  private scoreNarrative(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    const missing: string[] = [];
    if (!nonEmpty(arch.narrative.hook)) missing.push('hook');
    if (!nonEmpty(arch.narrative.arc)) missing.push('arc');
    if (!nonEmpty(arch.narrative.pacing)) missing.push('pacing');
    if (!nonEmpty(arch.narrative.resolution)) missing.push('resolution');

    if (missing.length === 4) {
      issues.push({ severity: 'high', issue: 'Narrative is completely undefined', dimension: 'Narrative' });
      recs.push({ priority: 'essential', action: 'Define the full narrative structure (hook, arc, pacing, resolution)', rationale: 'Narrative is how humans understand and remember experiences' });
      return { dimension: 'Narrative', score: 0, reason: 'Completely undefined' };
    }
    if (missing.length > 0) {
      issues.push({ severity: 'medium', issue: `Narrative missing: ${missing.join(', ')}`, dimension: 'Narrative' });
      return { dimension: 'Narrative', score: 4, reason: `Missing: ${missing.join(', ')}` };
    }
    return { dimension: 'Narrative', score: 8, reason: 'Full story structure defined' };
  }

  private scoreInteractionModel(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    const missing: string[] = [];
    if (!nonEmpty(arch.interactionModel.inputs)) missing.push('inputs');
    if (!nonEmpty(arch.interactionModel.feedback)) missing.push('feedback');
    if (!nonEmpty(arch.interactionModel.stateTransitions)) missing.push('state transitions');
    if (!nonEmpty(arch.interactionModel.flow)) missing.push('flow description');

    if (missing.length === 4) {
      issues.push({ severity: 'high', issue: 'Interaction model is completely undefined', dimension: 'Interaction Model' });
      recs.push({ priority: 'essential', action: 'Define how users interact (inputs, feedback, transitions, flow)', rationale: 'The interaction model is the core of the user experience' });
      return { dimension: 'Interaction Model', score: 0, reason: 'Completely undefined' };
    }
    if (missing.length > 0) {
      issues.push({ severity: 'medium', issue: `Interaction model missing: ${missing.join(', ')}`, dimension: 'Interaction Model' });
      return { dimension: 'Interaction Model', score: 4, reason: `Missing: ${missing.join(', ')}` };
    }

    const hasSystemicFlow = arch.interactionModel.feedback.length > 1 && arch.interactionModel.stateTransitions.length > 1;
    if (!hasSystemicFlow) {
      recs.push({ priority: 'recommended', action: 'Ensure interactions respond to each other rather than being isolated', rationale: 'Systemic interactions feel alive; isolated ones feel mechanical' });
    }

    return { dimension: 'Interaction Model', score: hasSystemicFlow ? 8 : 6, reason: hasSystemicFlow ? 'Rich interaction system' : 'Interactions are isolated' };
  }

  private scoreMotionSystem(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    const missing: string[] = [];
    if (!nonEmpty(arch.motionSystem.principles)) missing.push('principles');
    if (!nonEmpty(arch.motionSystem.microInteractions)) missing.push('micro-interactions');
    if (!nonEmpty(arch.motionSystem.transitions)) missing.push('transitions');
    if (!nonEmpty(arch.motionSystem.ambientMotion)) missing.push('ambient motion');

    if (missing.length === 4) {
      recs.push({ priority: 'recommended', action: 'Define motion principles (easing, duration, sequencing)', rationale: 'Motion communicates meaning and guides attention' });
      return { dimension: 'Motion System', score: 3, reason: 'Undefined — motion will be default' };
    }
    if (missing.length > 0) {
      return { dimension: 'Motion System', score: 5, reason: `Missing: ${missing.join(', ')}` };
    }
    const hasAmbient = nonEmpty(arch.motionSystem.ambientMotion);
    return { dimension: 'Motion System', score: hasAmbient ? 8 : 6, reason: hasAmbient ? 'Includes ambient motion for depth' : 'Functional but no ambient layer' };
  }

  private scoreVisualLanguage(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    const missing: string[] = [];
    if (!nonEmpty(arch.visualLanguage.color)) missing.push('color');
    if (!nonEmpty(arch.visualLanguage.typography)) missing.push('typography');
    if (!nonEmpty(arch.visualLanguage.space)) missing.push('space');
    if (!nonEmpty(arch.visualLanguage.shape)) missing.push('shape');
    if (!nonEmpty(arch.visualLanguage.light)) missing.push('light');

    if (missing.length === 5) {
      recs.push({ priority: 'recommended', action: 'Define the visual language (color, typography, space, shape, light)', rationale: 'Visual language establishes identity and emotional tone' });
      return { dimension: 'Visual Language', score: 2, reason: 'Undefined' };
    }
    if (missing.length >= 3) {
      return { dimension: 'Visual Language', score: 4, reason: `Missing: ${missing.join(', ')}` };
    }
    if (missing.length > 0) {
      return { dimension: 'Visual Language', score: 6, reason: `Partially defined, missing: ${missing.join(', ')}` };
    }
    return { dimension: 'Visual Language', score: 8, reason: 'All dimensions defined' };
  }

  private scoreMetrics(arch: ExperienceArchitecture, issues: CriticalIssue[], recs: Recommendation[]): DimensionScore {
    if (!arch.successMetrics || arch.successMetrics.length === 0) {
      issues.push({ severity: 'medium', issue: 'No success metrics defined', dimension: 'Success Metrics' });
      recs.push({ priority: 'essential', action: 'Define observable, verifiable, actionable success metrics', rationale: 'Without metrics, you cannot know if the experience works' });
      return { dimension: 'Success Metrics', score: 0, reason: 'No metrics' };
    }

    const failures: string[] = [];
    for (const m of arch.successMetrics) {
      if (!m.observable) failures.push(`"${m.metric.slice(0, 40)}" is not observable`);
      if (!m.verifiable) failures.push(`"${m.metric.slice(0, 40)}" is not verifiable`);
      if (!m.actionable) failures.push(`"${m.metric.slice(0, 40)}" is not actionable`);
    }

    if (failures.length > 0) {
      issues.push({ severity: 'medium', issue: failures.join('; '), dimension: 'Success Metrics' });
      const validCount = arch.successMetrics.filter(m => m.observable && m.verifiable && m.actionable).length;
      return { dimension: 'Success Metrics', score: Math.min(6, validCount * 2), reason: `${validCount}/${arch.successMetrics.length} metrics meet all criteria` };
    }

    return { dimension: 'Success Metrics', score: 8, reason: `${arch.successMetrics.length} metric(s) all meet quality criteria` };
  }
}
