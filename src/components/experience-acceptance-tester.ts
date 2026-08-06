import { ExperienceArchitecture } from './experience-governor.js';
import { EngineeringArchitecture } from './experience-compiler.js';

export interface IntentMatchScore {
  dimension: string;
  score: number;
  evidence: string;
}

export interface TranslationFidelity {
  dimension: string;
  retentionPercent: number;
  notes: string;
}

export interface UserTestResponse {
  question: string;
  response: string;
  aligned: boolean;
  expectedTheme: string;
}

export interface BlindComparisonMetric {
  metric: string;
  pipelineScore: number;
  traditionalScore: number;
  pipelineWins: boolean;
}

export interface EatScores {
  intentScores: number[];
  translationRetentions: number[];
  userAlignedCount: number;
  userTotal: number;
  pipelineWins: number;
  comparisonTotal: number;
  outcomePassed: number;
  outcomeTotal: number;
}

export interface OutcomeResult {
  metric: string;
  target: string;
  actual: string;
  passed: boolean;
}

export interface EatResult {
  intentMatch: {
    scores: IntentMatchScore[];
    average: number;
    passed: boolean;
  };
  translationFidelity: {
    dimensions: TranslationFidelity[];
    averageRetention: number;
    passed: boolean;
  };
  userTest: {
    responses: UserTestResponse[];
    alignedCount: number;
    passed: boolean;
  };
  blindComparison: {
    metrics: BlindComparisonMetric[];
    pipelineWinsCount: number;
    passed: boolean;
  };
  outcomeValidation: {
    results: OutcomeResult[];
    passedCount: number;
    totalCount: number;
    passed: boolean;
  };
  overall: 'PASS' | 'FAIL' | 'CONDITIONAL';
  summary: string;
  feedbackLoop: string[];
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-zA-Z0-9\s]/g, '').trim();
}

function containsTheme(text: string, themes: string[]): boolean {
  const lower = text.toLowerCase();
  return themes.some(t => lower.includes(t.toLowerCase()));
}

export class ExperienceAcceptanceTester {
  generateForm(arch: ExperienceArchitecture): EatResult {
    return {
      intentMatch: this.evaluateIntentMatch(arch),
      translationFidelity: this.evaluateTranslationFidelity(arch),
      userTest: this.evaluateUserTest(arch),
      blindComparison: this.evaluateBlindComparison(arch),
      outcomeValidation: this.evaluateOutcomes(arch),
      overall: 'CONDITIONAL',
      summary: 'EAT form generated. Fill in scores to complete evaluation.',
      feedbackLoop: [],
    };
  }

  computeResult(form: EatScores): EatResult {
    const feedbackLoop: string[] = [];

    const intentAvg = form.intentScores.reduce((a, b) => a + b, 0) / form.intentScores.length;
    const intentPassed = intentAvg >= 7;
    if (!intentPassed) feedbackLoop.push(`Intent Match: ${intentAvg.toFixed(1)}/10 (threshold 7/10) — Experience Architecture needs revision`);

    const avgRetention = form.translationRetentions.reduce((a, b) => a + b, 0) / form.translationRetentions.length;
    const translationPassed = form.translationRetentions.every(r => r >= 60);
    if (!translationPassed) feedbackLoop.push(`Translation Fidelity: ${avgRetention.toFixed(0)}% avg retention — Implementation lost experience detail`);

    const userPassed = form.userAlignedCount >= Math.ceil(form.userTotal * 0.75);
    if (!userPassed) feedbackLoop.push(`User Test: ${form.userAlignedCount}/${form.userTotal} aligned — Users did not perceive the intended experience`);

    const comparisonPassed = form.pipelineWins >= form.comparisonTotal;
    if (!comparisonPassed) feedbackLoop.push(`Blind Comparison: ${form.pipelineWins}/${form.comparisonTotal} — Pipeline did not outperform traditional approach`);

    const outcomePassed = form.outcomePassed === form.outcomeTotal;
    if (!outcomePassed) feedbackLoop.push(`Outcome Validation: ${form.outcomePassed}/${form.outcomeTotal} passed — Success metrics not met`);

    const allPassed = intentPassed && translationPassed && userPassed && comparisonPassed && outcomePassed;
    const someFailed = !intentPassed || !translationPassed || !userPassed;

    const overall: 'PASS' | 'FAIL' | 'CONDITIONAL' = allPassed ? 'PASS' : someFailed ? 'FAIL' : 'CONDITIONAL';

    const summary = overall === 'PASS'
      ? `PASS — All 5 validations passed (intent: ${intentAvg.toFixed(1)}/10, translation: ${avgRetention.toFixed(0)}%, user: ${form.userAlignedCount}/${form.userTotal}, comparison: ${form.pipelineWins}/${form.comparisonTotal}, outcomes: ${form.outcomePassed}/${form.outcomeTotal})`
      : overall === 'FAIL'
        ? `FAIL — Critical validations failed. ${feedbackLoop.join('; ')}`
        : `CONDITIONAL — Some validations need attention but no critical failures. ${feedbackLoop.join('; ')}`;

    const intentScores = form.intentScores.map((score, i) => ({
      dimension: ['Vision', 'Emotional Journey', 'Narrative', 'Interaction Model', 'Motion', 'Visual Language'][i] || `Dimension ${i + 1}`,
      score,
      evidence: '',
    }));

    const translationDimensions = form.translationRetentions.map((retention, i) => ({
      dimension: ['Emotional Impact', 'Interaction Quality', 'Narrative Coherence', 'Motion Expressiveness', 'Visual Identity'][i] || `Dimension ${i + 1}`,
      retentionPercent: retention,
      notes: '',
    }));

    return {
      intentMatch: {
        scores: intentScores,
        average: intentAvg,
        passed: intentPassed,
      },
      translationFidelity: {
        dimensions: translationDimensions,
        averageRetention: avgRetention,
        passed: translationPassed,
      },
      userTest: {
        responses: [],
        alignedCount: form.userAlignedCount,
        passed: userPassed,
      },
      blindComparison: {
        metrics: [],
        pipelineWinsCount: form.pipelineWins,
        passed: comparisonPassed,
      },
      outcomeValidation: {
        results: [],
        passedCount: form.outcomePassed,
        totalCount: form.outcomeTotal,
        passed: outcomePassed,
      },
      overall,
      summary,
      feedbackLoop,
    };
  }

  private evaluateIntentMatch(arch: ExperienceArchitecture): EatResult['intentMatch'] {
    const scores: IntentMatchScore[] = [
      {
        dimension: 'Vision',
        score: 0,
        evidence: `Evaluate: Does the final product communicate "${arch.vision.slice(0, 80)}..."?`,
      },
      {
        dimension: 'Emotional Journey',
        score: 0,
        evidence: `Evaluate: Does the user feel ${arch.emotionalJourney.states.join(' → ')}?`,
      },
      {
        dimension: 'Narrative',
        score: 0,
        evidence: `Evaluate: Does the hook ("${arch.narrative.hook.slice(0, 60)}") capture attention?`,
      },
      {
        dimension: 'Interaction Model',
        score: 0,
        evidence: `Evaluate: Do interactions match the specified model? (${arch.interactionModel.inputs.join(', ')})`,
      },
      {
        dimension: 'Motion',
        score: 0,
        evidence: `Evaluate: Does motion communicate meaning as specified? (${arch.motionSystem.principles.slice(0, 2).join('; ')})`,
      },
      {
        dimension: 'Visual Language',
        score: 0,
        evidence: `Evaluate: Does the visual design match the spec? (${arch.visualLanguage.color.slice(0, 60)})`,
      },
    ];

    return { scores, average: 0, passed: false };
  }

  private evaluateTranslationFidelity(arch: ExperienceArchitecture): EatResult['translationFidelity'] {
    const emotionalRetention = arch.emotionalJourney.states.length >= 3 ? 90 : 70;
    const interactionRetention = arch.interactionModel.inputs.length >= 2 ? 85 : 70;
    const narrativeRetention = this.nonEmpty(arch.narrative.hook) ? 85 : 60;
    const motionRetention = arch.motionSystem.principles.length > 0 ? 80 : 60;
    const visualRetention = !this.isPlaceholder(arch.visualLanguage.color) ? 85 : 60;

    const dimensions: TranslationFidelity[] = [
      { dimension: 'Emotional Impact', retentionPercent: emotionalRetention, notes: 'Estimated from state count' },
      { dimension: 'Interaction Quality', retentionPercent: interactionRetention, notes: 'Estimated from input variety' },
      { dimension: 'Narrative Coherence', retentionPercent: narrativeRetention, notes: narrativeRetention < 80 ? 'Narrative was placeholder — likely lost in translation' : '' },
      { dimension: 'Motion Expressiveness', retentionPercent: motionRetention, notes: motionRetention < 80 ? 'Motion principles were weak — likely default behavior' : '' },
      { dimension: 'Visual Identity', retentionPercent: visualRetention, notes: visualRetention < 80 ? 'Visual language was placeholder — likely generic output' : '' },
    ];

    const avgRetention = dimensions.reduce((a, d) => a + d.retentionPercent, 0) / dimensions.length;

    return {
      dimensions,
      averageRetention: avgRetention,
      passed: dimensions.every(d => d.retentionPercent >= 60),
    };
  }

  private evaluateUserTest(arch: ExperienceArchitecture): EatResult['userTest'] {
    const responses: UserTestResponse[] = [
      {
        question: 'What did you feel?',
        response: '',
        aligned: false,
        expectedTheme: arch.emotionalJourney.states.join(', '),
      },
      {
        question: 'What stood out?',
        response: '',
        aligned: false,
        expectedTheme: arch.narrative.hook.slice(0, 60),
      },
      {
        question: 'What do you remember?',
        response: '',
        aligned: false,
        expectedTheme: arch.mission.slice(0, 60),
      },
      {
        question: 'What is this product trying to communicate?',
        response: '',
        aligned: false,
        expectedTheme: arch.vision.slice(0, 60),
      },
    ];

    return { responses, alignedCount: 0, passed: false };
  }

  private evaluateBlindComparison(_arch: ExperienceArchitecture): EatResult['blindComparison'] {
    const metrics: BlindComparisonMetric[] = [
      { metric: 'User Preference', pipelineScore: 0, traditionalScore: 0, pipelineWins: false },
      { metric: 'Memorability', pipelineScore: 0, traditionalScore: 0, pipelineWins: false },
      { metric: 'Engagement', pipelineScore: 0, traditionalScore: 0, pipelineWins: false },
      { metric: 'Clarity', pipelineScore: 0, traditionalScore: 0, pipelineWins: false },
    ];

    return { metrics, pipelineWinsCount: 0, passed: false };
  }

  private evaluateOutcomes(arch: ExperienceArchitecture): EatResult['outcomeValidation'] {
    const results: OutcomeResult[] = arch.successMetrics.map(m => ({
      metric: m.metric,
      target: m.target,
      actual: 'Not yet measured',
      passed: false,
    }));

    return {
      results,
      passedCount: 0,
      totalCount: results.length,
      passed: false,
    };
  }

  logResult(label: string, result: EatResult): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`EAT: ${label}`);
    console.log(`Decision: ${result.overall}`);
    console.log(`Summary: ${result.summary}`);
    console.log('-'.repeat(60));

    console.log(`\nIntent Match:     ${result.intentMatch.passed ? '✓' : '✗'} (avg ${result.intentMatch.average.toFixed(1)}/10, threshold 7/10)`);
    console.log(`Translation:      ${result.translationFidelity.passed ? '✓' : '✗'} (avg ${result.translationFidelity.averageRetention.toFixed(0)}%, threshold 60%)`);
    console.log(`User Test:        ${result.userTest.passed ? '✓' : '✗'} (${result.userTest.alignedCount}/4 aligned, threshold 3/4)`);
    console.log(`Blind Comparison: ${result.blindComparison.passed ? '✓' : '✗'} (${result.blindComparison.pipelineWinsCount}/4, threshold 4/4)`);
    console.log(`Outcomes:         ${result.outcomeValidation.passed ? '✓' : '✗'} (${result.outcomeValidation.passedCount}/${result.outcomeValidation.totalCount} passed)`);

    if (result.feedbackLoop.length > 0) {
      console.log(`\nFeedback Loop (${result.feedbackLoop.length} items):`);
      for (const item of result.feedbackLoop) {
        console.log(`  → ${item}`);
      }
    }
    console.log('='.repeat(60));
  }

  private nonEmpty(val: string): boolean {
    return val.trim().length > 0 && !/to be defined|to be determined|todo|tbd/i.test(val);
  }

  private isPlaceholder(val: string): boolean {
    return /to be defined|to be determined|todo|tbd|— from/i.test(val.toLowerCase());
  }
}
