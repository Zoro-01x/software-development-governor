import { ExperienceArchitecture } from '../../src/components/experience-governor.js';

export const PORTFOLIO_REQUIREMENTS =
  'A personal portfolio website for a creative developer. Visitors should feel curiosity and wonder when exploring projects. The site needs a dark theme, project showcase, and subtle animations. The audience is tech recruiters and potential clients.';

export const DASHBOARD_REQUIREMENTS =
  'A real-time analytics dashboard for SaaS metrics. Users need to monitor KPIs, spot trends, and act on data quickly. The experience should feel responsive and authoritative. Target audience is operations managers and executives.';

export const CLI_REQUIREMENTS =
  'A command-line tool for scaffolding web projects. Developers need to create, configure, and deploy projects from the terminal. The experience should feel fast, precise, and empowering.';

export function expectPortfolioArchitecture(arch: ExperienceArchitecture): void {
  expect(arch).toBeDefined();
  expect(arch.vision.length).toBeGreaterThan(10);
  expect(arch.mission.length).toBeGreaterThan(10);

  expect(arch.audience.demographics.length).toBeGreaterThan(0);
  expect(arch.audience.psychographics.length).toBeGreaterThan(0);
  expect(arch.audience.scenario.length).toBeGreaterThan(0);

  expect(arch.experienceGoals.length).toBeGreaterThanOrEqual(3);
  expect(arch.experienceGoals.length).toBeLessThanOrEqual(5);

  expect(arch.emotionalJourney.states.length).toBeGreaterThanOrEqual(2);
  expect(arch.emotionalJourney.transitions.length).toBeGreaterThanOrEqual(1);

  expect(arch.narrative.hook.length).toBeGreaterThan(0);
  expect(arch.narrative.arc.length).toBeGreaterThan(0);
  expect(arch.narrative.pacing.length).toBeGreaterThan(0);
  expect(arch.narrative.resolution.length).toBeGreaterThan(0);

  expect(arch.interactionModel.inputs.length).toBeGreaterThan(0);
  expect(arch.interactionModel.feedback.length).toBeGreaterThan(0);
  expect(arch.interactionModel.stateTransitions.length).toBeGreaterThan(0);
  expect(arch.interactionModel.flow.length).toBeGreaterThan(0);

  expect(arch.successMetrics.length).toBeGreaterThan(0);
}

export function expectValidArchitecture(arch: ExperienceArchitecture): void {
  expect(arch.vision).toBeTruthy();
  expect(arch.mission).toBeTruthy();
  expect(arch.audience).toBeTruthy();
  expect(arch.experienceGoals).toBeTruthy();
  expect(arch.emotionalJourney).toBeTruthy();
  expect(arch.narrative).toBeTruthy();
  expect(arch.interactionModel).toBeTruthy();
  expect(arch.motionSystem).toBeTruthy();
  expect(arch.visualLanguage).toBeTruthy();
  expect(arch.successMetrics).toBeTruthy();
}
