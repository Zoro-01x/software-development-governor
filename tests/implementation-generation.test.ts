import { describe, it, expect, afterAll } from 'vitest';
import { rmSync, readFileSync } from 'fs';
import { join } from 'path';
import { ImplementationEngine } from '../src/components/implementation-engine.js';
import { ExperienceCompiler } from '../src/components/experience-compiler.js';
import { EngineeringGovernor } from '../src/components/engineering-governor.js';
import { AuditTrail } from '../src/audit-trail.js';
import { makeApprovedArchitecture } from './fixtures/approved-architecture.js';

const PROJECT_DIR = 'generated-test-impl';
const ROOT = process.cwd();
const GEN_DIR = join(ROOT, PROJECT_DIR);

const arch = new ExperienceCompiler().compile(makeApprovedArchitecture());

afterAll(() => {
  rmSync(GEN_DIR, { recursive: true, force: true });
});

describe('ImplementationEngine — real code generation', () => {
  it('generates implementation that compiles and passes architecture-driven tests', () => {
    const engine = new ImplementationEngine();
    const result = engine.execute(arch, PROJECT_DIR, new AuditTrail());

    expect(result.success).toBe(true);
    expect(result.compilePassed).toBe(true);
    expect(result.testPassed).toBe(true);
    expect(result.generatedFiles.length).toBe(2);
    expect(result.auditIds.length).toBe(2);
  });

  it('generated implementation contains real runtime code driven by the architecture', () => {
    const engine = new ImplementationEngine();
    const result = engine.execute(arch, PROJECT_DIR, new AuditTrail());

    const implPath = result.generatedFiles.find(f => f.endsWith('implementation.ts'))!;
    const content = readFileSync(implPath, 'utf-8');

    expect(content).toContain('class EventBus');
    expect(content).toContain('class StateMachine');
    expect(content).toContain('class IllegalTransitionError');
    expect(content).toContain('verifyArchitecture');
    expect(content).toContain('experience-flow');
    expect(content).toContain('emotion:curiosity:to:discovery');
    expect(content).toContain('system-status');
    expect(content).toContain('interaction-phase');
    expect(content).toContain('AppShell');
    expect(content).toContain('performanceBudget');
    expect(content).toContain('qualityGates');
    expect(content).toContain('wireDefaultHandlers');
  });

  it('generated test file asserts behavioral properties of the architecture', () => {
    const engine = new ImplementationEngine();
    const result = engine.execute(arch, PROJECT_DIR, new AuditTrail());

    const testPath = result.generatedFiles.find(f => f.endsWith('implementation.test.ts'))!;
    const content = readFileSync(testPath, 'utf-8');

    expect(content).toContain('machine');
    expect(content).toContain('transition');
    expect(content).toContain('event bus');
    expect(content).toContain('verifyArchitecture');
  });

  it('generated code contains no original requirements text', () => {
    const engine = new ImplementationEngine();
    const result = engine.execute(arch, PROJECT_DIR, new AuditTrail());

    const implPath = result.generatedFiles.find(f => f.endsWith('implementation.ts'))!;
    const content = readFileSync(implPath, 'utf-8');

    expect(content).not.toContain('design system that brings joy');
  });

  it('generated implementation satisfies the Engineering Governor contract', () => {
    const engine = new ImplementationEngine();
    const result = engine.execute(arch, PROJECT_DIR, new AuditTrail());

    expect(result.success).toBe(true);
    expect(new EngineeringGovernor().evaluate(arch).decision).toBe('APPROVED');
  });

  it('never exposes requirements access', () => {
    const engine = new ImplementationEngine();
    expect(engine.getRequirementsAccess()).toBe(false);
  });
}, 120000);
