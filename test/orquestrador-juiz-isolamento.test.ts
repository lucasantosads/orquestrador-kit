/**
 * Etapa 8e, P2: o juiz roda com contexto LIMPO. Antes, o `claude` do juiz tinha
 * cwd na WORKTREE do ticket (herdava CLAUDE.md e .claude/ da branch) e nenhuma
 * flag de isolamento. Roda `run_juiz` de verdade, com um `claude` falso no PATH
 * que grava cwd e argv. As flags são só as que o `claude --help` (2.1.302) confirma.
 */
import { describe, it, expect } from 'vitest';
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

function fixture() {
  const fx = criarFixture([]);
  escreverTicket(fx, {
    id: '951',
    slug: 'isolamento',
    objetivo: 'muda a',
    pathspec_allowlist: ['src/a.ts'],
    criterios_aceite: [{ tipo: 'avaliador', descricao: 'a muda', cmd: 'true', espera: 'avaliador' }],
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
  writeFileSync(join(wt, 'src', 'a.ts'), 'export const a = 2\n');
  g('add', '-A');
  g('commit', '-qm', 'trabalho');
  const rundir = join(fx, 'docs', 'fila', 'runs', '951', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), 'VEREDITO: APROVADO\n');

  // `claude` falso: grava cwd, se o cwd é repo git, e o argv (um por linha).
  const bin = join(fx, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, 'claude'),
    [
      '#!/usr/bin/env bash',
      `pwd -P > "${fx}/juiz-cwd"`,
      `git rev-parse --is-inside-work-tree > "${fx}/juiz-git" 2>/dev/null || echo fora > "${fx}/juiz-git"`,
      `printf '%s\\n' "$@" > "${fx}/juiz-argv"`,
      `echo '{"type":"result","result":"{\\"aprovado\\":true,\\"motivo\\":\\"ok\\",\\"criterios_falhos\\":[]}","total_cost_usd":0}'`,
    ].join('\n'),
  );
  chmodSync(join(bin, 'claude'), 0o755);
  return { fx, wt, base, rundir, bin };
}

function rodarJuiz(f: ReturnType<typeof fixture>) {
  const script = [
    `export ORQ_EXEC_ROOT="${f.fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1 PATH="${f.bin}:$PATH"`,
    `source "${EXECUTOR}"`,
    'set +e',
    'DIFF_LINES=2',
    `run_juiz "$(ticket_file_by_id 951)" "${f.wt}" "${f.rundir}" "${f.base}" 0`,
    'echo "RC_JUIZ=$? APROVADO=$JUIZ_APROVADO"',
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: f.fx });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

describe('P2: o juiz roda fora da worktree e sem contexto ambiente', () => {
  it('cwd vazio, fora de repo; flags de isolamento no argv; dir removido depois', () => {
    const f = fixture();
    const saida = rodarJuiz(f);
    expect(saida).toContain('RC_JUIZ=0 APROVADO=true');

    const cwd = ler(join(f.fx, 'juiz-cwd')).trim();
    expect(cwd).not.toContain(f.wt.replace(/^\/private/, ''));
    expect(ler(join(f.fx, 'juiz-git')).trim()).toBe('fora');
    expect(existsSync(cwd)).toBe(false);

    const argv = ler(join(f.fx, 'juiz-argv')).split('\n');
    const valorDe = (flag: string) => argv[argv.indexOf(flag) + 1];
    expect(argv).toEqual(expect.arrayContaining(['--tools', '--strict-mcp-config', '--disable-slash-commands']));
    expect([valorDe('--tools'), valorDe('--allowedTools'), valorDe('--max-turns')]).toEqual(['', '', '1']);
  });
});
