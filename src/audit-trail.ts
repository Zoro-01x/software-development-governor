import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

export interface ArtifactRecord {
  id: string;
  path: string;
  stage: string;
  approvalChain: string[];
  architectureVersion: string;
  timestamp: string;
  inputPreview: string;
  outputPreview: string;
}

export class AuditTrail {
  private artifacts: ArtifactRecord[] = [];
  private version: string;

  constructor(version?: string) {
    this.version = version || `v${Date.now()}`;
  }

  record(stage: string, input: unknown, output: unknown, approvalChain: string[]): ArtifactRecord {
    const id = this.generateId();
    const record: ArtifactRecord = {
      id,
      path: '',
      stage,
      approvalChain: [...approvalChain],
      architectureVersion: this.version,
      timestamp: new Date().toISOString(),
      inputPreview: this.truncate(input),
      outputPreview: this.truncate(output),
    };
    this.artifacts.push(record);
    return record;
  }

  writeArtifact(stage: string, name: string, data: unknown, dir: string, approvalChain: string[]): string {
    const targetDir = join(ROOT, dir);
    if (!existsSync(targetDir)) mkdirSync(targetDir, { recursive: true });

    const filePath = join(targetDir, name);
    writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');

    const id = this.generateId();
    this.artifacts.push({
      id,
      path: filePath,
      stage,
      approvalChain: [...approvalChain],
      architectureVersion: this.version,
      timestamp: new Date().toISOString(),
      inputPreview: this.truncate(stage),
      outputPreview: this.truncate(name),
    });

    return id;
  }

  getArtifacts(): readonly ArtifactRecord[] {
    return this.artifacts;
  }

  getVersion(): string {
    return this.version;
  }

  private generateId(): string {
    return `audit-${this.artifacts.length + 1}-${Date.now().toString(36)}`;
  }

  private truncate(val: unknown): string {
    const str = typeof val === 'string' ? val : JSON.stringify(val);
    return str.length > 120 ? str.slice(0, 120) + '...' : str;
  }
}
