/**
 * 2.1.8 — o executor roda SEM MCP. A sondagem (`probe_modelos`) e o agente
 * (`run_attempt`) chamavam `claude -p` sem `--strict-mcp-config`, e o CLI carregava
 * os conectores claude.ai da conta do dono da máquina. No escritorio-os, em
 * 12/11/2026, isso punha `mcp__claude_ai_GHL__execute_operation` e
 * `mcp__claude_ai_Supabase__execute_sql` (escrita) ao alcance do agente; o que
 * segurava era só permissão, e o `settings.local.json` do usuário já liberava o
 * `execute_sql`. O juiz já rodava com a flag desde a etapa 8e
 * (orquestrador-juiz-isolamento.test.ts).
 *
 * Aqui: as funções de verdade (executor.sh sourced), com um `claude` falso no PATH
 * que grava o argv. Nenhuma chamada paga. A medição com o `claude` real (lista de
 * ferramentas mcp__ com e sem a flag, o controle negativo) é `scripts/kit/sonda-mcp.sh`.
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
    id: '952',
    slug: 'sem-mcp',
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

  // `claude` falso: um arquivo de argv por chamada (um argumento por linha).
  const bin = join(fx, 'bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(
    join(bin, 'claude'),
    [
      '#!/usr/bin/env bash',
      `n=$(ls "${fx}"/argv-* 2>/dev/null | wc -l | tr -d ' ')`,
      `printf '%s\\n' "$@" > "${fx}/argv-$n"`,
      `echo '{"type":"result","result":"ok","total_cost_usd":0,"usage":{"input_tokens":1,"output_tokens":1}}'`,
    ].join('\n'),
  );
  chmodSync(join(bin, 'claude'), 0o755);
  return { fx, wt, bin };
}

function rodar(f: ReturnType<typeof fixture>, corpo: string[]) {
  const script = [
    `export ORQ_EXEC_ROOT="${f.fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1 PATH="${f.bin}:$PATH"`,
    `source "${EXECUTOR}"`,
    'set +e',
    ...corpo,
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: f.fx, timeout: 60_000 });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

const argvDe = (fx: string, n = 0) => {
  const p = join(fx, `argv-${n}`);
  return existsSync(p) ? ler(p).split('\n') : null;
};

describe('2.1.8: sondagem e agente do executor rodam sem MCP', () => {
  it('probe_modelos passa --strict-mcp-config e nenhum --mcp-config', () => {
    const f = fixture();
    const saida = rodar(f, ['DRY=0', 'probe_modelos', 'echo "RC_PROBE=$?"']);
    const argv = argvDe(f.fx);
    expect(argv, saida).not.toBeNull();
    expect(argv).toContain('-p');
    expect(argv).toContain('--strict-mcp-config');
    expect(argv).not.toContain('--mcp-config');
  });

  it('run_attempt passa --strict-mcp-config e nenhum --mcp-config ao agente', () => {
    const f = fixture();
    const rundir = join(f.fx, 'docs', 'fila', 'runs', '952', 'attempt-0');
    const saida = rodar(f, [
      'DRY=0',
      `run_attempt "$(ticket_file_by_id 952)" "${f.wt}" "${rundir}" sonnet "" 0`,
      'echo "RC_ATTEMPT=$?"',
    ]);
    const argv = argvDe(f.fx);
    expect(argv, saida).not.toBeNull();
    expect(argv).toContain('--allowedTools');
    expect(argv).toContain('--strict-mcp-config');
    expect(argv).not.toContain('--mcp-config');
  });
});
