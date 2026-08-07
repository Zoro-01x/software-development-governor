import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { ExperienceDesigner } from './components/experience-designer.js';
import { ReasoningProvider } from './reasoning.js';
import { ExperienceGovernor, GovernorResult, ExperienceArchitecture } from './components/experience-governor.js';
import { ExperienceCompiler, EngineeringArchitecture } from './components/experience-compiler.js';
import { EngineeringGovernor, EngGovernorResult } from './components/engineering-governor.js';
import { ExperienceAcceptanceTester, EatResult, EatScores } from './components/experience-acceptance-tester.js';
import { ImplementationEngine, ImplementationResult } from './components/implementation-engine.js';
import { AuditTrail } from './audit-trail.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

// ============================================================================
// Intent Clarification Types
// ============================================================================

export interface ClarificationQuestion {
  id: string;
  question: string;
  category: 'purpose' | 'audience' | 'scope' | 'constraints' | 'success';
}

export interface ClarificationRound {
  questions: ClarificationQuestion[];
  answers: Record<string, string>;
}

export interface DualModeGap {
  id: string;
  topic: string;
  explicitSummary: string;
  implicitSummary: string;
  gap: string;
  question: string;
  options?: string[];
}

export interface DualModeResult {
  explicitFindings: string[];
  implicitFindings: string[];
  gaps: DualModeGap[];
}

export interface IntentProfile {
  rawIntent: string;
  clarificationRounds: ClarificationRound[];
  dualModeResult: DualModeResult;
  gapResolutions: Record<string, string>;
  verifiedIntent: string;
  verified: boolean;
}

// ============================================================================
// Pipeline Types
// ============================================================================

export interface PipelineOptions {
  projectName?: string;
  projectDir?: string;
  reasoningProvider?: ReasoningProvider;
  eatScores?: EatScores;
  onStage?: (stage: string, status: string, detail?: string) => void;

  // Intent clarification callbacks — the pipeline asks, the user answers
  askUser?: (questions: ClarificationQuestion[]) => Promise<Record<string, string>>;
  resolveGaps?: (gaps: DualModeGap[]) => Promise<Record<string, string>>;
  verifyPreview?: (preview: string) => Promise<boolean>;
}

export interface PipelineResult {
  intent: IntentProfile;
  draft: { architecture: ExperienceArchitecture };
  review: GovernorResult;
  architecture: EngineeringArchitecture | null;
  engReview: EngGovernorResult | null;
  implementation: ImplementationResult | null;
  eatResult: EatResult | null;
  auditTrail: AuditTrail;
  passed: boolean;
  stages: Array<{ name: string; status: 'pass' | 'fail' | 'skip'; detail: string }>;
}

export class PipelineIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PipelineIntegrityError';
  }
}

// ============================================================================
// Governance Pipeline
//
// PLANNING PHASE: Stages 0-0.3 (Intent Clarification → Dual Mode → Gap Resolution → Preview)
// EXECUTION PHASE: Stages 1-6 (Design → Governor → Compile → Governor → Implement → EAT)
//
// The line between planning and execution is the user's verification of the preview.
// Nothing is built until the user says "yes, that's correct."
// ============================================================================

export class GovernancePipeline {
  private designer: ExperienceDesigner;
  private governor: ExperienceGovernor;
  private compiler: ExperienceCompiler;
  private engGovernor: EngineeringGovernor;
  private eat: ExperienceAcceptanceTester;
  private implEngine: ImplementationEngine;
  private auditTrail: AuditTrail;

  constructor(reasoningProvider?: ReasoningProvider) {
    this.designer = new ExperienceDesigner(reasoningProvider);
    this.governor = new ExperienceGovernor();
    this.compiler = new ExperienceCompiler();
    this.engGovernor = new EngineeringGovernor();
    this.eat = new ExperienceAcceptanceTester();
    this.implEngine = new ImplementationEngine();
    this.auditTrail = new AuditTrail();
  }

  getDesignerName(): string {
    return this.designer.getProviderName();
  }

  // ==========================================================================
  // Stage 0: Intent Clarification
  //
  // Ask deeper, simpler questions to understand the exact idea.
  // No assumptions. Every gap gets asked.
  // ==========================================================================

  private async clarifyIntent(
    rawIntent: string,
    options: PipelineOptions,
  ): Promise<{ intentProfile: IntentProfile; stages: PipelineResult['stages'] }> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});

    onStage('Intent Clarification', 'start');

    // Generate clarification questions based on the raw intent
    const questions = this.generateClarificationQuestions(rawIntent);

    // Ask the user — no assumptions
    let answers: Record<string, string> = {};
    if (options?.askUser) {
      answers = await options.askUser(questions);
    } else {
      // No askUser callback — pipeline cannot proceed without answers
      throw new PipelineIntegrityError(
        'Intent Clarification requires askUser callback. Cannot proceed without user input.',
      );
    }

    const round: ClarificationRound = { questions, answers };

    stages.push({
      name: 'Intent Clarification',
      status: 'pass',
      detail: `Asked ${questions.length} questions, received ${Object.keys(answers).length} answers`,
    });

    this.auditTrail.record(
      'intent-clarification',
      { questionsAsked: questions.length },
      { answersReceived: Object.keys(answers).length },
      [],
    );

    onStage('Intent Clarification', 'pass', `${questions.length} questions answered`);

    // Build initial intent profile
    const intentProfile: IntentProfile = {
      rawIntent,
      clarificationRounds: [round],
      dualModeResult: { explicitFindings: [], implicitFindings: [], gaps: [] },
      gapResolutions: {},
      verifiedIntent: '',
      verified: false,
    };

    return { intentProfile, stages };
  }

  // ==========================================================================
  // Stage 0.5: Dual Mode Prompt Synthesis
  //
  // Analyze the user's answers from two angles:
  //   1. Explicit — what they literally said
  //   2. Implicit — what's implied, what they assumed, what they didn't say
  // This finds the gaps.
  // ==========================================================================

  private async synthesizeDualMode(
    intentProfile: IntentProfile,
    options: PipelineOptions,
  ): Promise<{ intentProfile: IntentProfile; stages: PipelineResult['stages'] }> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});

    onStage('Dual Mode Synthesis', 'start');

    const round = intentProfile.clarificationRounds[0];
    const explicitFindings: string[] = [];
    const implicitFindings: string[] = [];
    const gaps: DualModeGap[] = [];

    // Explicit analysis — what did the user literally say?
    for (const [questionId, answer] of Object.entries(round.answers)) {
      const question = round.questions.find(q => q.id === questionId);
      if (question && answer.trim()) {
        explicitFindings.push(`${question.category}: ${answer}`);
      }
    }

    // Implicit analysis — what did the user NOT say that they should have?
    // These are the gaps that dual mode finds
    const implicitChecks = this.generateImplicitChecks(round);

    for (const check of implicitChecks) {
      if (!round.answers[check.missingAnswerFor]) {
        gaps.push(check);
      }
    }

    const dualModeResult: DualModeResult = {
      explicitFindings,
      implicitFindings,
      gaps,
    };

    intentProfile.dualModeResult = dualModeResult;

    stages.push({
      name: 'Dual Mode Synthesis',
      status: gaps.length === 0 ? 'pass' : 'fail',
      detail: `Found ${explicitFindings.length} explicit findings, ${gaps.length} gaps`,
    });

    this.auditTrail.record(
      'dual-mode-synthesis',
      { explicitFindings: explicitFindings.length },
      { gapsFound: gaps.length, gaps: gaps.map(g => g.topic) },
      [],
    );

    onStage('Dual Mode Synthesis', 'pass',
      gaps.length === 0
        ? 'No gaps found — intent is complete'
        : `${gaps.length} gaps found — asking user`);

    return { intentProfile, stages };
  }

  // ==========================================================================
  // Stage 0.75: Gap Resolution
  //
  // Ask the user about each gap. NEVER assume.
  // If dual mode found a gap, we ask. We don't fill it ourselves.
  // ==========================================================================

  private async resolveGaps(
    intentProfile: IntentProfile,
    options: PipelineOptions,
  ): Promise<{ intentProfile: IntentProfile; stages: PipelineResult['stages'] }> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});

    const gaps = intentProfile.dualModeResult.gaps;

    if (gaps.length === 0) {
      onStage('Gap Resolution', 'skip', 'No gaps to resolve');
      stages.push({
        name: 'Gap Resolution',
        status: 'skip',
        detail: 'No gaps found',
      });
      return { intentProfile, stages };
    }

    onStage('Gap Resolution', 'start', `Resolving ${gaps.length} gaps`);

    // Ask the user about each gap — never assume
    let resolutions: Record<string, string> = {};
    if (options?.resolveGaps) {
      resolutions = await options.resolveGaps(gaps);
    } else if (options?.askUser) {
      // Fallback: convert gaps to questions and ask
      const gapQuestions: ClarificationQuestion[] = gaps.map(gap => ({
        id: gap.id,
        question: gap.question,
        category: 'scope',
      }));
      resolutions = await options.askUser(gapQuestions);
    } else {
      throw new PipelineIntegrityError(
        'Gap Resolution requires resolveGaps or askUser callback. Cannot proceed without user input.',
      );
    }

    intentProfile.gapResolutions = resolutions;

    stages.push({
      name: 'Gap Resolution',
      status: 'pass',
      detail: `Resolved ${Object.keys(resolutions).length} of ${gaps.length} gaps`,
    });

    this.auditTrail.record(
      'gap-resolution',
      { gapsCount: gaps.length },
      { resolvedCount: Object.keys(resolutions).length },
      [],
    );

    onStage('Gap Resolution', 'pass', `${Object.keys(resolutions).length} gaps resolved`);

    return { intentProfile, stages };
  }

  // ==========================================================================
  // Stage 0.9: Preview & Verify
  //
  // Present the full picture to the user. They confirm, correct, or add.
  // This is the line between planning and execution.
  // ==========================================================================

  private async previewAndVerify(
    intentProfile: IntentProfile,
    options: PipelineOptions,
  ): Promise<{ intentProfile: IntentProfile; stages: PipelineResult['stages'] }> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});

    onStage('Preview & Verify', 'start');

    // Build the preview from everything we've gathered
    const preview = this.buildPreview(intentProfile);

    // Ask user to verify
    let verified = false;
    if (options?.verifyPreview) {
      verified = await options.verifyPreview(preview);
    } else if (options?.askUser) {
      // Fallback: present preview as a yes/no question
      const answers = await options.askUser([{
        id: 'verify-preview',
        question: `Here is what I understand:\n\n${preview}\n\nIs this correct?`,
        category: 'purpose',
      }]);
      verified = answers['verify-preview']?.toLowerCase().startsWith('y') ?? false;
    } else {
      throw new PipelineIntegrityError(
        'Preview & Verify requires verifyPreview or askUser callback.',
      );
    }

    if (!verified) {
      onStage('Preview & Verify', 'fail', 'User did not verify — cannot proceed');
      throw new PipelineIntegrityError(
        'User did not verify the preview. Cannot proceed to execution without verified intent.',
      );
    }

    intentProfile.verifiedIntent = preview;
    intentProfile.verified = true;

    stages.push({
      name: 'Preview & Verify',
      status: 'pass',
      detail: 'User verified the intent',
    });

    this.auditTrail.record(
      'preview-verify',
      { verified: true },
      { previewLength: preview.length },
      [],
    );

    onStage('Preview & Verify', 'pass', 'Intent verified — proceeding to execution');

    return { intentProfile, stages };
  }

  // ==========================================================================
  // Question & Gap Generation Helpers
  // ==========================================================================

  private generateClarificationQuestions(rawIntent: string): ClarificationQuestion[] {
    // These are the deeper, simpler questions that get to the exact idea
    const questions: ClarificationQuestion[] = [
      {
        id: 'core-problem',
        question: 'What problem does this solve for you? What happens if it doesn\'t exist?',
        category: 'purpose',
      },
      {
        id: 'primary-user',
        question: 'Who will use this every day? What are they trying to accomplish?',
        category: 'audience',
      },
      {
        id: 'simplest-version',
        question: 'What is the simplest version that would still be useful to you?',
        category: 'scope',
      },
      {
        id: 'must-have',
        question: 'What is the one thing this MUST do? If it did nothing else, what would that one thing be?',
        category: 'scope',
      },
      {
        id: 'success-look-like',
        question: 'How will you know this is working? What does success look like?',
        category: 'success',
      },
      {
        id: 'constraints',
        question: 'Any limits I should know about? Budget, time, technology, team size?',
        category: 'constraints',
      },
    ];

    // Add contextual questions based on what the user said
    const lower = rawIntent.toLowerCase();
    if (lower.includes('website') || lower.includes('app') || lower.includes('platform')) {
      questions.push({
        id: 'existing-systems',
        question: 'Does this need to connect to anything that already exists?',
        category: 'constraints',
      });
    }
    if (lower.includes('team') || lower.includes('collaborate') || lower.includes('shared')) {
      questions.push({
        id: 'team-size',
        question: 'How many people will use this? Do they need different access levels?',
        category: 'audience',
      });
    }

    return questions;
  }

  private generateImplicitChecks(round: ClarificationRound): DualModeGap[] {
    const gaps: DualModeGap[] = [];
    const answers = round.answers;

    // Check for implicit gaps — things the user didn't mention
    if (!answers['primary-user'] && answers['core-problem']) {
      gaps.push({
        id: 'missing-user',
        topic: 'Target User',
        explicitSummary: `Problem defined: ${answers['core-problem']}`,
        implicitSummary: 'No user defined — who experiences this problem?',
        gap: 'User identity is missing',
        question: 'Who specifically has this problem? Describe them in one sentence.',
      });
    }

    if (!answers['must-have'] && answers['simplest-version']) {
      gaps.push({
        id: 'missing-must-have',
        topic: 'Core Requirement',
        explicitSummary: `Simplest version: ${answers['simplest-version']}`,
        implicitSummary: 'No must-have defined — what is non-negotiable?',
        gap: 'Core requirement is missing',
        question: 'What is the ONE thing this must do, even in the simplest version?',
      });
    }

    if (!answers['success-look-like'] && answers['core-problem']) {
      gaps.push({
        id: 'missing-success',
        topic: 'Success Criteria',
        explicitSummary: `Problem: ${answers['core-problem']}`,
        implicitSummary: 'No success criteria — how do we know we solved it?',
        gap: 'Success criteria are missing',
        question: 'How will you measure that this problem is actually solved?',
      });
    }

    if (!answers['constraints'] && answers['simplest-version']) {
      gaps.push({
        id: 'missing-constraints',
        topic: 'Constraints',
        explicitSummary: `Scope defined: ${answers['simplest-version']}`,
        implicitSummary: 'No constraints mentioned — are there limits?',
        gap: 'Constraints are missing',
        question: 'Any limits on budget, time, technology, or team?',
      });
    }

    // Check for vague answers that need more detail
    for (const [id, answer] of Object.entries(answers)) {
      if (answer.length < 10 && !id.startsWith('verify')) {
        gaps.push({
          id: `vague-${id}`,
          topic: id,
          explicitSummary: `User said: "${answer}"`,
          implicitSummary: 'Answer is very short — may need more detail',
          gap: `Potentially vague answer for ${id}`,
          question: `Can you tell me more about: ${answer}?`,
        });
      }
    }

    return gaps;
  }

  private buildPreview(intentProfile: IntentProfile): string {
    const round = intentProfile.clarificationRounds[0];
    const answers = round.answers;
    const resolutions = intentProfile.gapResolutions;

    const sections: string[] = [];

    sections.push('## What I Understand');
    sections.push('');

    if (answers['core-problem']) {
      sections.push(`**Problem:** ${answers['core-problem']}`);
    }
    if (answers['primary-user']) {
      sections.push(`**User:** ${answers['primary-user']}`);
    }
    if (answers['must-have']) {
      sections.push(`**Core Requirement:** ${answers['must-have']}`);
    }
    if (answers['simplest-version']) {
      sections.push(`**Scope:** ${answers['simplest-version']}`);
    }
    if (answers['success-look-like']) {
      sections.push(`**Success:** ${answers['success-look-like']}`);
    }
    if (answers['constraints']) {
      sections.push(`**Constraints:** ${answers['constraints']}`);
    }

    // Add gap resolutions
    if (Object.keys(resolutions).length > 0) {
      sections.push('');
      sections.push('## Additional Details');
      sections.push('');
      for (const [gapId, resolution] of Object.entries(resolutions)) {
        const gap = intentProfile.dualModeResult.gaps.find(g => g.id === gapId);
        if (gap) {
          sections.push(`**${gap.topic}:** ${resolution}`);
        }
      }
    }

    sections.push('');
    sections.push('---');
    sections.push('*Is this correct? Anything to add or change?*');

    return sections.join('\n');
  }

  // ==========================================================================
  // Main Pipeline Run
  //
  // PLANNING: Stages 0-0.9 (Clarification → Synthesis → Gaps → Preview)
  // EXECUTION: Stages 1-6 (Design → Governor → Compile → Governor → Implement → EAT)
  // ==========================================================================

  async run(requirements: string, options?: PipelineOptions): Promise<PipelineResult> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});
    const projectName = options?.projectName || 'Governed Project';
    const projectDir = options?.projectDir || 'generated';

    onStage('Pipeline', 'start', `Designer: ${this.designer.getProviderName()}, audit: ${this.auditTrail.getVersion()}`);

    // ========================================================================
    // PLANNING PHASE — Understanding before doing
    //
    // When askUser callback is provided: run full intent clarification flow.
    // When no callback: skip planning — use raw requirements as verified intent.
    // This keeps the pipeline backwards compatible with programmatic calls.
    // ========================================================================

    let intentProfile: IntentProfile;

    if (options?.askUser) {
      // Full planning flow — ask questions, find gaps, verify preview
      const clarification = await this.clarifyIntent(requirements, options);
      stages.push(...clarification.stages);
      intentProfile = clarification.intentProfile;

      const synthesis = await this.synthesizeDualMode(intentProfile, options);
      stages.push(...synthesis.stages);
      intentProfile = synthesis.intentProfile;

      const gapResolution = await this.resolveGaps(intentProfile, options);
      stages.push(...gapResolution.stages);
      intentProfile = gapResolution.intentProfile;

      const verification = await this.previewAndVerify(intentProfile, options);
      stages.push(...verification.stages);
      intentProfile = verification.intentProfile;
    } else {
      // Programmatic mode — no user interaction, skip planning
      onStage('Intent Clarification', 'skip', 'No askUser callback — using raw requirements');
      stages.push({
        name: 'Intent Clarification',
        status: 'skip',
        detail: 'Programmatic mode — no user interaction',
      });
      intentProfile = {
        rawIntent: requirements,
        clarificationRounds: [],
        dualModeResult: { explicitFindings: [], implicitFindings: [], gaps: [] },
        gapResolutions: {},
        verifiedIntent: requirements,
        verified: true,
      };
    }

    // ========================================================================
    // EXECUTION PHASE — The line has been crossed. User verified. Build it.
    // ========================================================================

    // Stage 1: Experience Designer — CREATIVE REASONING
    onStage('Experience Designer', 'start');
    const draft = await this.designer.design({ requirements: intentProfile.verifiedIntent, projectName });
    const draftValid = draft.architecture.vision.length > 0;
    stages.push({
      name: 'Experience Designer',
      status: draftValid ? 'pass' : 'fail',
      detail: `Produced architecture with ${draft.rationale.length} rationale entries, ${draft.openQuestions.length} open questions (via ${this.designer.getProviderName()})`,
    });
    if (!draftValid) {
      onStage('Experience Designer', 'fail', 'Empty vision — cannot proceed');
      throw new PipelineIntegrityError('Experience Designer produced empty architecture');
    }
    this.auditTrail.record(
      'experience-designer',
      { provider: this.designer.getProviderName(), requirementsPreview: intentProfile.verifiedIntent.slice(0, 100) },
      { vision: draft.architecture.vision.slice(0, 80), goals: draft.architecture.experienceGoals.length },
      [],
    );
    onStage('Experience Designer', 'pass',
      `${draft.architecture.vision.slice(0, 60)}... (${this.designer.getProviderName()})`);

    // Stage 2: Experience Governor — HARD GATE (deterministic validation)
    onStage('Experience Governor', 'start');
    const review = this.governor.evaluate(draft.architecture);
    const avgScore = review.scores.reduce((a, s) => a + s.score, 0) / review.scores.length;
    stages.push({
      name: 'Experience Governor',
      status: review.decision === 'APPROVED' ? 'pass' : review.decision === 'REVISE' ? 'fail' : 'fail',
      detail: `Decision: ${review.decision}, Avg: ${avgScore.toFixed(1)}/10, Issues: ${review.criticalIssues.length}`,
    });
    this.auditTrail.record(
      'experience-governor',
      review.decision,
      { scores: review.scores.length, issues: review.criticalIssues.length },
      [review.decision],
    );

    if (review.decision === 'REJECT') {
      onStage('Experience Governor', 'fail', `REJECTED: ${review.summary}`);
      throw new PipelineIntegrityError(
        `Experience Governor REJECTED the architecture.\n${review.summary}\nLoop back to Experience Designer.`,
      );
    }

    if (review.decision === 'REVISE') {
      onStage('Experience Governor', 'fail', `REVISE: ${review.summary}`);
      return {
        intent: intentProfile,
        draft,
        review,
        architecture: null,
        engReview: null,
        implementation: null,
        eatResult: null,
        auditTrail: this.auditTrail,
        passed: false,
        stages,
      };
    }
    onStage('Experience Governor', 'pass', avgScore.toFixed(1) + '/10 approved');

    // Stage 3: Experience Compiler — deterministic translation
    onStage('Experience Compiler', 'start');
    const architecture = this.compiler.compile(draft.architecture);
    const archValid = architecture.stateMachines.length >= 2 && architecture.events.length > 0;
    stages.push({
      name: 'Experience Compiler',
      status: archValid ? 'pass' : 'fail',
      detail: `Produced ${architecture.stateMachines.length} state machines, ${architecture.events.length} events, ${architecture.components.length} components`,
    });
    this.auditTrail.record(
      'experience-compiler',
      { emotionalStates: draft.architecture.emotionalJourney.states.length },
      { stateMachines: architecture.stateMachines.map(s => s.name) },
      [review.decision],
    );
    onStage('Experience Compiler', 'pass', `${architecture.stateMachines.length} state machines`);

    // Stage 4: Engineering Governor — HARD GATE (deterministic validation)
    onStage('Engineering Governor', 'start');
    const engReview = this.engGovernor.evaluate(architecture);
    stages.push({
      name: 'Engineering Governor',
      status: engReview.decision === 'APPROVED' ? 'pass' : 'fail',
      detail: engReview.summary,
    });
    this.auditTrail.record(
      'engineering-governor',
      { stateMachines: architecture.stateMachines.length },
      engReview.decision,
      [review.decision, engReview.decision],
    );

    if (engReview.decision !== 'APPROVED') {
      onStage('Engineering Governor', 'fail', engReview.summary);
      throw new PipelineIntegrityError(
        `Engineering Governor ${engReview.decision} the architecture.\n${engReview.summary}\nLoop back to Experience Compiler.`,
      );
    }
    onStage('Engineering Governor', 'pass', engReview.summary);

    // Stage 5: Implementation (receives only EngineeringArchitecture, not requirements)
    onStage('Implementation', 'start');
    let implResult: ImplementationResult | null = null;
    try {
      implResult = this.implEngine.execute(architecture, projectDir, this.auditTrail);
      stages.push({
        name: 'Implementation',
        status: implResult.success ? 'pass' : 'fail',
        detail: `Generated ${implResult.generatedFiles.length} files, compile: ${implResult.compilePassed}, tests: ${implResult.testPassed}`,
      });
      onStage('Implementation', implResult.success ? 'pass' : 'fail', `${implResult.generatedFiles.length} files`);
    } catch (err) {
      stages.push({
        name: 'Implementation',
        status: 'fail',
        detail: String(err),
      });
      onStage('Implementation', 'fail', String(err));
      implResult = null;
    }

    // Stage 6: EAT — Experience Acceptance Test
    onStage('EAT', 'start');
    let eatResult: EatResult | null = null;
    try {
      eatResult = options?.eatScores
        ? this.eat.computeResult(options.eatScores)
        : this.eat.generateForm(draft.architecture);
      this.auditTrail.record(
        'eat',
        { mode: options?.eatScores ? 'scored' : 'form', overall: eatResult.overall },
        { feedbackLoop: eatResult.feedbackLoop.length, summary: eatResult.summary.slice(0, 120) },
        [review.decision, engReview.decision],
      );
      stages.push({
        name: 'EAT',
        status: 'pass',
        detail: `EAT ${options?.eatScores ? 'evaluated' : 'form generated'}: ${eatResult.overall}`,
      });
      onStage('EAT', 'pass', eatResult.overall);
    } catch (err) {
      stages.push({
        name: 'EAT',
        status: 'fail',
        detail: String(err),
      });
      onStage('EAT', 'fail', String(err));
    }

    const passed = stages.every(s => s.status === 'pass' || s.status === 'skip');

    return {
      intent: intentProfile,
      draft,
      review,
      architecture,
      engReview,
      implementation: implResult,
      eatResult,
      auditTrail: this.auditTrail,
      passed,
      stages,
    };
  }

  getAuditTrail(): AuditTrail {
    return this.auditTrail;
  }
}
