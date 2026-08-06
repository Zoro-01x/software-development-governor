import { ArtifactKind, ConstitutionContext, RequestType } from './types.js';

export const GOVERNED_ARTIFACT_KINDS: ReadonlyArray<ArtifactKind> = [
  'source',
  'test',
  'configuration',
  'documentation',
  'deployment',
];

export const ENGINEERING_REQUEST_TYPES: ReadonlyArray<RequestType> = [
  'requirement-analysis',
  'technical-design',
  'implementation',
];

export function makeContext(input: unknown): ConstitutionContext {
  if (input && typeof input === 'object') {
    return input as ConstitutionContext;
  }
  throw new Error('Constitution rule input must be a ConstitutionContext object');
}
