// Etapa KF, P5b (M-68): o prompt do executor aponta a doutrina pelo mesmo `spec_dir` da cat.0 (executor.sh:run_attempt).
import { expect, it } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { CONFIGS, OURO, promptETools, semTmp } from './fixtures/m69/harness.js';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';

const linha = (d: string) =>
  `A doutrina que vale para você está em ${d}/EXECUTOR.md (leitura, NUNCA escrita). NÃO leia ${d}/SKILL.md nem ${d}/references/: não muda o que você tem de fazer e queima contexto.`;
const comExecutorMd = (pasta: string) => (fx: string) => {
  mkdirSync(join(fx, pasta), { recursive: true });
  writeFileSync(join(fx, pasta, 'EXECUTOR.md'), '# EXECUTOR\n');
};

describeHarness('KF-P5b · spec_dir no prompt do executor', () => {
  it('kit: com spec_dir "doutrina", o prompt aponta doutrina/EXECUTOR.md', () => {
    const r = promptETools(readFileSync(join(REPO_ROOT, 'docs/fila-kit/000-config.json'), 'utf8'), comExecutorMd('doutrina'));
    expect(r.prompt, r.stderr).toContain(linha('doutrina'));
    expect(r.prompt).not.toContain('docs/orquestrador/skill');
  });
  it.each(['ci', 'dashboard'] as const)('%s, sem spec_dir: o prompt é o ouro da M69, byte a byte', (repo) => {
    const r = promptETools(readFileSync(CONFIGS[repo], 'utf8'));
    expect(semTmp(r.prompt), r.stderr).toBe(readFileSync(join(OURO, `${repo}-prompt.txt`), 'utf8'));
  });
  it.each(['ci', 'dashboard'] as const)('%s, sem spec_dir e com a spec instalada: a linha de antes', (repo) => {
    const r = promptETools(readFileSync(CONFIGS[repo], 'utf8'), comExecutorMd('docs/orquestrador/skill'));
    expect(r.prompt, r.stderr).toContain(linha('docs/orquestrador/skill'));
  });
});
