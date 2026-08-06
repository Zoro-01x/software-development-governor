import { ReasoningInput, PromptPackage, ReasoningStrategy, ReasoningResult } from '../reasoning.js';
import { ExperienceArchitectureSchema } from '../components/experience-schema.js';

export const SYSTEM_PROMPT = `You are an Experience Architect. Your role is to synthesize raw requirements into a structured experience design.

Given a set of requirements, produce a complete Experience Architecture with these sections:

1. Vision (one sentence describing the future this project creates)
2. Mission (one sentence describing what this project builds or enables)
3. Audience (demographics, psychographics, and usage scenario)
4. Experience Goals (3-5 measurable human outcomes)
5. Emotional Journey (3-5 emotional states the user moves through, with transition triggers)
6. Narrative (hook, arc, pacing, resolution)
7. Interaction Model (inputs, feedback mechanisms, state transitions, flow description)
8. Motion System (principles, micro-interactions, transitions, ambient motion)
9. Visual Language (color, typography, space, shape, light)
10. Success Metrics (observable, verifiable, actionable metrics with targets)

Think carefully about what experience would best serve the user's needs. Consider:
- Who is the audience and what do they need emotionally?
- What is the first thing the user should see, feel, and do?
- How does the experience unfold over time?
- What makes this experience memorable?
- How do we know if it's working?

For each section, include a brief rationale explaining your design decision.`;

export class GeneralStrategy implements ReasoningStrategy {
  readonly name = 'general';

  buildPromptPackage(input: ReasoningInput): PromptPackage {
    const constraints = input.constraints?.length
      ? `\nConstraints:\n${input.constraints.map(c => `- ${c}`).join('\n')}`
      : '';

    const references = input.references?.length
      ? `\nReferences:\n${input.references.map(r => `- ${r}`).join('\n')}`
      : '';

    const userPrompt = `${SYSTEM_PROMPT}

Requirements: "${input.requirements}"
Project Name: "${input.projectName || 'Unnamed Project'}"${constraints}${references}

Respond with a JSON object following this exact structure:
${ExperienceArchitectureSchema}`;

    return {
      systemInstructions: SYSTEM_PROMPT,
      userPrompt,
      responseFormat: 'json',
      metadata: {
        projectName: input.projectName,
        constraintCount: input.constraints?.length ?? 0,
        referenceCount: input.references?.length ?? 0,
      },
    };
  }

  parseResponse(response: string): ReasoningResult | null {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(response);
    } catch {
      return null;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }

    const arch = (parsed.architecture as Record<string, unknown>) || parsed;

    const architecture = {
      vision: String((arch.vision as string) || ''),
      mission: String((arch.mission as string) || ''),
      audience: {
        demographics: String(((arch.audience as any)?.demographics as string) || ''),
        psychographics: String(((arch.audience as any)?.psychographics as string) || ''),
        scenario: String(((arch.audience as any)?.scenario as string) || ''),
      },
      experienceGoals: Array.isArray(arch.experienceGoals) ? arch.experienceGoals.map(String) : [],
      emotionalJourney: {
        states: Array.isArray((arch.emotionalJourney as any)?.states) ? (arch.emotionalJourney as any).states.map(String) : [],
        transitions: Array.isArray((arch.emotionalJourney as any)?.transitions)
          ? (arch.emotionalJourney as any).transitions.map((t: any) => ({
              from: String(t.from || ''),
              to: String(t.to || ''),
              trigger: String(t.trigger || ''),
            }))
          : [],
      },
      narrative: {
        hook: String(((arch.narrative as any)?.hook as string) || ''),
        arc: String(((arch.narrative as any)?.arc as string) || ''),
        pacing: String(((arch.narrative as any)?.pacing as string) || ''),
        resolution: String(((arch.narrative as any)?.resolution as string) || ''),
      },
      interactionModel: {
        inputs: Array.isArray((arch.interactionModel as any)?.inputs) ? (arch.interactionModel as any).inputs.map(String) : [],
        feedback: Array.isArray((arch.interactionModel as any)?.feedback) ? (arch.interactionModel as any).feedback.map(String) : [],
        stateTransitions: Array.isArray((arch.interactionModel as any)?.stateTransitions) ? (arch.interactionModel as any).stateTransitions.map(String) : [],
        flow: String(((arch.interactionModel as any)?.flow as string) || ''),
      },
      motionSystem: {
        principles: Array.isArray((arch.motionSystem as any)?.principles) ? (arch.motionSystem as any).principles.map(String) : [],
        microInteractions: Array.isArray((arch.motionSystem as any)?.microInteractions) ? (arch.motionSystem as any).microInteractions.map(String) : [],
        transitions: Array.isArray((arch.motionSystem as any)?.transitions) ? (arch.motionSystem as any).transitions.map(String) : [],
        ambientMotion: Array.isArray((arch.motionSystem as any)?.ambientMotion) ? (arch.motionSystem as any).ambientMotion.map(String) : [],
      },
      visualLanguage: {
        color: String(((arch.visualLanguage as any)?.color as string) || ''),
        typography: String(((arch.visualLanguage as any)?.typography as string) || ''),
        space: String(((arch.visualLanguage as any)?.space as string) || ''),
        shape: String(((arch.visualLanguage as any)?.shape as string) || ''),
        light: String(((arch.visualLanguage as any)?.light as string) || ''),
      },
      successMetrics: Array.isArray(arch.successMetrics)
        ? arch.successMetrics.map((m: any) => ({
            metric: String(m.metric || ''),
            target: String(m.target || ''),
            observable: Boolean(m.observable),
            verifiable: Boolean(m.verifiable),
            actionable: Boolean(m.actionable),
          }))
        : [],
    };

    const rationale = Array.isArray(parsed.rationale)
      ? parsed.rationale.map((r: any) => ({
          section: String(r.section || ''),
          decision: String(r.decision || ''),
          reasoning: String(r.reasoning || ''),
        }))
      : [];

    const openQuestions = Array.isArray(parsed.openQuestions)
      ? parsed.openQuestions.map((q: any) => ({
          question: String(q.question || ''),
          dimension: String(q.dimension || ''),
          suggestedApproach: String(q.suggestedApproach || ''),
        }))
      : [];

    return { architecture, rationale, openQuestions };
  }
}
