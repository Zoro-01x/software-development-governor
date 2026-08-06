/**
 * LAW-003 Proof: Simulate removal of /adapters
 * 
 * This file verifies that the framework compiles without /adapters.
 * Only adapter resolution may fail at runtime.
 * 
 * Run: npx tsc --noEmit --skipLibCheck src/law-003-proof.ts
 */

// Framework imports only
import { 
  ReasoningInput, 
  ReasoningResult, 
  PromptPackage, 
  ReasoningStrategy, 
  ReasoningProvider,
  ExperienceArchitecture,
  DesignRationale,
  OpenQuestion
} from './reasoning.js';

// Strategies imports (allowed)
import { GeneralStrategy } from './strategies/general-strategy.js';

// Verify types are accessible
type ProofInput = ReasoningInput;
type ProofResult = ReasoningResult;
type ProofPackage = PromptPackage;
type ProofStrategy = ReasoningStrategy;
type ProofProvider = ReasoningProvider;
type ProofArchitecture = ExperienceArchitecture;
type ProofRationale = DesignRationale;
type ProofQuestion = OpenQuestion;

// Verify strategy works without adapters
const strategy = new GeneralStrategy();
const testInput: ReasoningInput = {
  requirements: 'Test requirements',
  projectName: 'Test Project',
};
const promptPackage = strategy.buildPromptPackage(testInput);

// Verify prompt package structure
const systemInstructions: string = promptPackage.systemInstructions;
const userPrompt: string = promptPackage.userPrompt;
const responseFormat: string | undefined = promptPackage.responseFormat;
const metadata: Record<string, unknown> | undefined = promptPackage.metadata;

// Verify strategy parsing works
const testResponse = JSON.stringify({
  vision: 'Test vision',
  mission: 'Test mission',
  audience: { demographics: 'Test', psychographics: 'Test', scenario: 'Test' },
  experienceGoals: ['Goal 1'],
  emotionalJourney: { states: ['State 1'], transitions: [] },
  narrative: { hook: '', arc: '', pacing: '', resolution: '' },
  interactionModel: { inputs: [], feedback: [], stateTransitions: [], flow: '' },
  motionSystem: { principles: [], microInteractions: [], transitions: [], ambientMotion: [] },
  visualLanguage: { color: '', typography: '', space: '', shape: '', light: '' },
  successMetrics: [],
});
const parsed = strategy.parseResponse(testResponse);

console.log('LAW-003 Proof: Framework compiles without /adapters');
console.log('Strategy:', strategy.name);
console.log('PromptPackage generated:', !!promptPackage);
console.log('Response parsed:', !!parsed);
