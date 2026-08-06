import { ExperienceArchitecture } from './experience-governor.js';
import { ReasoningProvider, ReasoningInput, ReasoningResult } from '../reasoning.js';
import { RuleBasedReasoningProvider } from './rule-based-reasoning.js';

export type { ReasoningInput, ReasoningResult };
export { RuleBasedReasoningProvider };

export interface DesignRationale {
  section: string;
  decision: string;
  alternatives?: string[];
  reasoning: string;
}

export interface OpenQuestion {
  question: string;
  dimension: string;
  suggestedApproach: string;
}

export interface ExperienceDraft {
  architecture: ExperienceArchitecture;
  rationale: DesignRationale[];
  openQuestions: OpenQuestion[];
}

export class ExperienceDesigner {
  private provider: ReasoningProvider;

  constructor(provider?: ReasoningProvider) {
    this.provider = provider ?? new RuleBasedReasoningProvider();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  async design(input: ReasoningInput): Promise<ExperienceDraft> {
    return this.provider.reason(input);
  }
}
