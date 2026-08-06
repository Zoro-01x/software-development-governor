import { describe, it, expect } from 'vitest';
import { GovernancePipeline } from '../src/governance-pipeline.js';
import { ImplementationEngine } from '../src/components/implementation-engine.js';
import { AuditTrail } from '../src/audit-trail.js';

const VALID_REQUIREMENTS = `A personal portfolio website for a creative developer. 
Visitors should feel curiosity and wonder when exploring projects. 
The site needs a dark theme, project showcase, and subtle animations. 
The audience is tech recruiters and potential clients.`;

describe('GovernancePipeline — Single Entry Point', () => {
  it('returns passed=false when Governor returns REVISE (pipeline stops early)', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    expect(result.passed).toBe(false);
  });

  it('does not proceed to compiler when Governor returns REVISE', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    expect(result.architecture).toBeNull();
    expect(result.implementation).toBeNull();
  });

  it('records audit trail for stages that execute', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    const records = result.auditTrail.getArtifacts();
    expect(records.length).toBeGreaterThanOrEqual(2);
    expect(records[0].stage).toBe('experience-designer');
    expect(records[1].stage).toBe('experience-governor');
  });

  it('does not allow raw requirements to reach implementation stage', () => {
    const engine = new ImplementationEngine();
    expect(engine.getRequirementsAccess()).toBe(false);
  });
});

describe('GovernancePipeline — Hard Gates', () => {
  it('REVISE returns early without proceeding to Engineering Governor', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    expect(result.passed).toBe(false);
    expect(result.engReview).toBeNull();
  });

  it('REVISE returns the Governor review for diagnosis', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    expect(result.review.decision).toBe('REVISE');
    expect(result.review.scores.length).toBe(10);
    expect(result.review.criticalIssues.length).toBeGreaterThanOrEqual(0);
  });
});

describe('GovernancePipeline — Audit Trail', () => {
  it('records audit entries with timestamps and stages', async () => {
    const pipeline = new GovernancePipeline();
    await pipeline.run(VALID_REQUIREMENTS);
    const records = pipeline.getAuditTrail().getArtifacts();
    for (const r of records) {
      expect(r.stage).toBeTruthy();
      expect(r.timestamp).toBeTruthy();
      expect(r.approvalChain).toBeDefined();
    }
  });

  it('each audit record has input and output previews', () => {
    const trail = new AuditTrail();
    trail.record('test', { input: 'hello' }, { output: 'world' }, []);
    const records = trail.getArtifacts();
    expect(records[0].inputPreview).toContain('hello');
    expect(records[0].outputPreview).toContain('world');
  });
});

describe('ImplementationEngine — No Raw Requirements', () => {
  it('hasRequirements is always false', () => {
    const engine = new ImplementationEngine();
    expect(engine.getRequirementsAccess()).toBe(false);
  });

  it('hasRequirements property cannot be modified externally', () => {
    const engine = new ImplementationEngine();
    (engine as any).hasRequirements = true;
    expect(engine.getRequirementsAccess()).toBe(false);
  });
});

describe('PipelineResult — No Implementation Data Leak', () => {
  it('implementation result is null when pipeline stops at Governor gate', async () => {
    const pipeline = new GovernancePipeline();
    const result = await pipeline.run(VALID_REQUIREMENTS);
    expect(result.implementation).toBeNull();
    expect(result.eatResult).toBeNull();
  });
});
