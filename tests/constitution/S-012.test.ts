import { describe, expect, it } from 'vitest';
import { S012Rule } from '../../src/constitution/rules/S-012.js';
import { baseContext, governedDecision, approvedRequirement } from './fixtures.js';

function dependencyRecord(overrides: Record<string, unknown> = {}) {
  return {
    name: 'lodash',
    version: '4.17.21',
    requirementId: 'R-1',
    justification: 'required by R-1 for array utilities',
    approval: governedDecision({ decisionId: 'dec-dep' }),
    ...overrides,
  };
}

describe('S-012 Dependency Accountability', () => {
  it('passes with an empty dependency graph', () => {
    expect(S012Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes a fully accountable dependency', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord()],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails when the graph contains duplicates', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord()],
      resolvedDependencyGraph: ['lodash', 'lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a resolved dependency has no record', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [],
      resolvedDependencyGraph: ['ghost'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the version is unpinned', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord({ version: '^4.17.21' })],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the requirement id is missing', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord({ requirementId: undefined })],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the justification does not reference the requirement', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord({ justification: 'nice to have' })],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the dependency lacks a governed approval', () => {
    const ctx = baseContext({
      requirements: [approvedRequirement('R-1')],
      dependencies: [dependencyRecord({ approval: undefined })],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the dependency requirement is not approved', () => {
    const ctx = baseContext({
      requirements: [{ id: 'R-1', text: 'draft', status: 'draft' }],
      dependencies: [dependencyRecord()],
      resolvedDependencyGraph: ['lodash'],
    });
    expect(S012Rule.evaluate(ctx)).toBe('fail');
  });
});
