import { ExperienceArchitecture } from './components/experience-governor.js';
import { DesignRationale, OpenQuestion } from './components/experience-designer.js';

export type { ExperienceArchitecture } from './components/experience-governor.js';
export type { DesignRationale, OpenQuestion } from './components/experience-designer.js';

export interface ReasoningInput {
  requirements: string;
  projectName?: string;
  constraints?: string[];
  references?: string[];
}

export interface PromptPackage {
  readonly systemInstructions: string;
  readonly userPrompt: string;
  readonly responseFormat?: string;
  readonly metadata?: Record<string, unknown>;
}

export interface ReasoningResult {
  architecture: ExperienceArchitecture;
  rationale: DesignRationale[];
  openQuestions: OpenQuestion[];
}

export interface ReasoningStrategy {
  readonly name: string;
  buildPromptPackage(input: ReasoningInput): PromptPackage;
  parseResponse(response: string): ReasoningResult | null;
}

export interface ReasoningProvider {
  readonly name: string;
  reason(input: ReasoningInput, strategy: ReasoningStrategy): Promise<ReasoningResult>;
}
