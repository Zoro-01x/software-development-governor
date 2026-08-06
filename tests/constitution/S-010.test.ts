import { describe, expect, it } from 'vitest';
import { S010Rule } from '../../src/constitution/rules/S-010.js';
import { baseContext } from './fixtures.js';

describe('S-010 Every Change Traces Back', () => {
  it('passes when there are no changes', () => {
    expect(S010Rule.evaluate(baseContext())).toBe('pass');
  });

  it('passes when every hunk traces to a cited requirement', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }],
      changes: [
        {
          id: 'ch-1',
          requirementIds: ['R-1'],
          hunks: [{ artifactId: 'a1', requiredByRequirement: true }],
        },
      ],
    });
    expect(S010Rule.evaluate(ctx)).toBe('pass');
  });

  it('fails a change with no cited requirements', () => {
    const ctx = baseContext({
      changes: [{ id: 'ch-1', requirementIds: [], hunks: [] }],
    });
    expect(S010Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails a hunk referencing a non-existent artifact', () => {
    const ctx = baseContext({
      changes: [{ id: 'ch-1', requirementIds: ['R-1'], hunks: [{ artifactId: 'ghost', requiredByRequirement: true }] }],
    });
    expect(S010Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the artifact trace is not among the cited requirements', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-2' }],
      changes: [
        {
          id: 'ch-1',
          requirementIds: ['R-1'],
          hunks: [{ artifactId: 'a1', requiredByRequirement: true }],
        },
      ],
    });
    expect(S010Rule.evaluate(ctx)).toBe('fail');
  });

  it('fails when the hunk is not marked as required by a requirement', () => {
    const ctx = baseContext({
      artifacts: [{ id: 'a1', kind: 'source', trace: 'R-1' }],
      changes: [
        {
          id: 'ch-1',
          requirementIds: ['R-1'],
          hunks: [{ artifactId: 'a1', requiredByRequirement: false }],
        },
      ],
    });
    expect(S010Rule.evaluate(ctx)).toBe('fail');
  });
});
