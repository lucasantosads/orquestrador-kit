/**
 * Etapa 8e, P1: o juiz recebe as mensagens de commit de base..HEAD, rotuladas
 * como declaração do agente. Caso real (dashboard-comercial, 003/0): o critério
 * pedia "(o corpo do commit diz isso)", o corpo de 1bfcbc1d dizia, e o juiz
 * reprovou porque nunca recebeu o commit. O rótulo importa: o corpo afirma o
 * vermelho antes, mas o `claude.txt` da mesma tentativa admite que não o viu.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import { montarPromptJuiz, TETO_COMMITS_LINHAS, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FX = join(REPO_ROOT, 'test', 'fixtures', 'juiz-8e', '003-0');
const ROTULO = 'MENSAGENS DE COMMIT (escritas pelo agente: declaração, não evidência)';

function fixture(comCommit: boolean) {
  const fx = criarFixture([]);
  escreverTicket(fx, {
    id: '003',
    slug: 'liga-conquistas',
    objetivo: 'concederConquista não concede quando a contagem falha',
    pathspec_allowlist: ['src/a.ts'],
    criterios_aceite: [
      { tipo: 'avaliador', descricao: 'falham contra o código anterior (o corpo do commit diz isso)', cmd: 'true', espera: 'avaliador' },
    ],
  });
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'src'), { recursive: true });
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  writeFileSync(join(wt, 'src', 'a.ts'), 'export const a = 1\n');
  g('add', '-A');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  if (comCommit) {
    writeFileSync(join(wt, 'src', 'a.ts'), 'export const a = 2\n');
    g('add', '-A');
    g('commit', '-q', '-F', join(FX, 'commit-1bfcbc1d.txt'));
  }
  const rundir = join(fx, 'docs', 'fila', 'runs', '003', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), readFileSync(join(FX, 'gates.txt')));
  return { fx, wt, base, rundir };
}

function promptDoJuiz(f: ReturnType<typeof fixture>): string {
  const vered = join(f.fx, 'veredito-stub.json');
  writeFileSync(vered, '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}');
  const script = [
    `export ORQ_EXEC_ROOT="${f.fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}" --stub-juiz "cat '${vered}'"`,
    'set +e',
    'DIFF_LINES=2',
    `run_juiz "$(ticket_file_by_id 003)" "${f.wt}" "${f.rundir}" "${f.base}" 0`,
  ].join('\n');
  spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: f.fx });
  return ler(join(f.rundir, 'juiz.prompt.txt'));
}

describe('P1: mensagens de commit no material do juiz', () => {
  it('003/0: o corpo de 1bfcbc1d chega ao juiz, rotulado, antes dos gates', () => {
    const p = promptDoJuiz(fixture(true));
    const i = p.indexOf(ROTULO);
    expect(i).toBeGreaterThan(0);
    expect(p).toContain('FALHARAM contra o código anterior');
    expect(p).toContain('Orq-Ticket: 003');
    expect(p.indexOf('SAÍDA DOS GATES MECÂNICOS')).toBeGreaterThan(p.indexOf('Orq-Ticket: 003'));
  });

  it('sem commit em base..HEAD o bloco não entra', () => {
    const p = promptDoJuiz(fixture(false));
    expect(p).not.toBe('');
    expect(p).not.toContain('MENSAGENS DE COMMIT');
  });

  it('teto de linhas e de bytes, com o truncamento marcado', () => {
    const e: EntradaPrompt = { id: '1', objetivo: 'o', criterios: [], allowlist: [], diff: '', gates: '' };
    const longo = Array.from({ length: 500 }, (_, i) => `linha ${i}`).join('\n');
    const p = montarPromptJuiz({ ...e, commits: longo });
    expect(p).toContain(`linha ${TETO_COMMITS_LINHAS - 1}\n`);
    expect(p).not.toContain(`linha ${TETO_COMMITS_LINHAS}\n`);
    expect(p).toMatch(/TRUNCADO: 300 de 500 linhas omitidas/);
    const largo = Array.from({ length: 100 }, () => 'x'.repeat(199)).join('\n');
    const q = montarPromptJuiz({ ...e, commits: largo });
    const bloco = q.slice(q.indexOf(ROTULO), q.indexOf('SAÍDA DOS GATES'));
    expect(Buffer.byteLength(bloco)).toBeLessThan(8192 + 400);
    expect(q).toMatch(/TRUNCADO: \d+ de 100 linhas omitidas/);
    expect(montarPromptJuiz({ ...e, commits: '' })).toBe(montarPromptJuiz(e));
  });
});
