/** Minimal markdown report writer. Reports land in /reports (md is tracked). */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from '@worldcup/db';

const REPORTS_DIR = join(REPO_ROOT, 'reports');

export class Report {
  private lines: string[] = [];

  constructor(title: string) {
    this.lines.push(
      `# ${title}`,
      '',
      `_Generated ${new Date().toISOString()} — private/local-only, not for distribution._`,
      '',
    );
  }

  h(text: string): this {
    this.lines.push('', `## ${text}`, '');
    return this;
  }

  line(text = ''): this {
    this.lines.push(text);
    return this;
  }

  kv(key: string, value: string | number): this {
    this.lines.push(`- **${key}:** ${value}`);
    return this;
  }

  bullet(text: string): this {
    this.lines.push(`- ${text}`);
    return this;
  }

  table(headers: string[], rows: Array<Array<string | number>>): this {
    this.lines.push(`| ${headers.join(' | ')} |`);
    this.lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
    for (const r of rows) this.lines.push(`| ${r.join(' | ')} |`);
    this.lines.push('');
    return this;
  }

  write(filename: string): string {
    mkdirSync(REPORTS_DIR, { recursive: true });
    const p = join(REPORTS_DIR, filename);
    writeFileSync(p, this.lines.join('\n') + '\n', 'utf8');
    return p;
  }
}
