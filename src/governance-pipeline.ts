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

export interface PipelineOptions {
  projectName?: string;
  projectDir?: string;
  reasoningProvider?: ReasoningProvider;
  eatScores?: EatScores;
  onStage?: (stage: string, status: string, detail?: string) => void;
}

export interface PipelineResult {
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

  async run(requirements: string, options?: PipelineOptions): Promise<PipelineResult> {
    const stages: PipelineResult['stages'] = [];
    const onStage = options?.onStage || (() => {});
    const projectName = options?.projectName || 'Governed Project';
    const projectDir = options?.projectDir || 'generated';

    onStage('Pipeline', 'start', `Designer: ${this.designer.getProviderName()}, audit: ${this.auditTrail.getVersion()}`);

    // Stage 1: Experience Designer — CREATIVE REASONING
    // The designer uses its ReasoningProvider to genuinely think about the requirements
    onStage('Experience Designer', 'start');
    const draft = await this.designer.design({ requirements, projectName });
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
      { provider: this.designer.getProviderName(), requirementsPreview: requirements.slice(0, 100) },
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

    const passed = stages.every(s => s.status === 'pass');

    return {
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
