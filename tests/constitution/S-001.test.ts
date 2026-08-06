import { describe, expect, it } from 'vitest';
import { S001Rule } from '../../src/constitution/rules/S-001.js';
import { baseContext, approvedRequirement } from './fixtures.js';

describe('S-001 Requirements Foundation', () => {
  it('passes non-implementation requests', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'technical-design' },
    });
    expect(S001Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails an implementation with no requirement ids', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation' },
    });
    expect(S001Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails an implementation with duplicate requirement ids', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1', 'R-1'] },
      requirements: [approvedRequirement('R-1')],
    });
    expect(S001Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a cited requirement does not exist', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
      requirements: [],
    });
    expect(S001Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when a cited requirement is not approved', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1'] },
      requirements: [{ id: 'R-1', text: 'draft', status: 'draft' }],
    });
    expect(S001Rule.evaluate(ctx)).toBe('fail');
  });

  it('passes when all cited requirements are approved', () => {
    const ctx = baseContext({
      request: { id: 'r1', type: 'implementation', requirementIds: ['R-1', 'R-2'] },
      requirements: [approvedRequirement('R-1'), approvedRequirement('R-2')],
    });
    expect(S001Rule.evaluate(ctx)).toBe('pass');
  });
});
