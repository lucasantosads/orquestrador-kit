/**
 * Peça 0e(a) — evento na trilha nunca contém `\n`.
 *
 * O formato da trilha é UMA LINHA POR EVENTO, e era só convenção: um `\n` dentro
 * de um valor quebrava o evento em várias linhas, e toda linha a partir da
 * segunda ficava sem timestamp — invisível para `grep`, `tail`, contagem e para
 * o `orq erro`, que lê a trilha linha a linha.
 *
 * Medido em 2026-09-05 13:40, com o loop drenando: `docs/fila/runs/events.log`
 * tinha 427 linhas, 243 eventos e 184 linhas sem timestamp; trinta minutos antes
 * eram 413/237/176 — o dano cresce a cada drenagem. A linha 253 (ticket 234,
 * 13:31:45) corta em `cmds=cd /Users/…/ci-234` e derrama um heredoc Python
 * inteiro nas linhas 254-259.
 *
 * A entrada deste teste é aquele comando REAL, byte a byte
 * (`test/fixtures/trilha/permissao-negada-234.cmd`), e não uma imitação: o
 * truncamento já existia (`executor.sh`, `cut -c1-160`) e não bastava, porque
 * `cut -c` é orientado a LINHA — corta cada linha em 160 e mantém todas.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, bashNoFixture, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const CMD_REAL = readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'trilha', 'permissao-negada-234.cmd'), 'utf8').replace(/\n$/, '');
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const trilha = (fx: string) => ler(join(fx, 'docs', 'fila', 'runs', 'events.log'));

describe('uma_linha: o escape que faltava', () => {
  const roda = (fx: string, corpo: string) => bashNoFixture(fx, corpo, { ORQ_TESTE: '1' });

  it('escapa \\n, \\r e \\t como dois caracteres', () => {
    const fx = criarFixture([]);
    // `$( )` come o \n FINAL antes de uma_linha ver — por isso o esperado
    // termina em \r: o que se afirma é o escape dos separadores internos.
    const r = roda(fx, `uma_linha "$(printf 'a\\nb\\tc\\r\\n')"`);
    expect(r.stdout).toBe('a\\nb\\tc\\r');
  });

  it('NÃO dobra a barra invertida — o valor é comando, e os bytes têm de sobreviver', () => {
    const fx = criarFixture([]);
    const r = roda(fx, `uma_linha "grep -E 'fetch\\('"`);
    expect(r.stdout).toBe("grep -E 'fetch\\('");
  });

  it('corta em max DEPOIS de escapar', () => {
    const fx = criarFixture([]);
    const r = roda(fx, `uma_linha "$(printf 'abc\\ndefghij')" 6`);
    expect(r.stdout).toBe('abc\\nd');
  });
});

describe('PERMISSAO_NEGADA com o comando multi-linha REAL do 234', () => {
  /** Roda permissoes_negadas() sobre um envelope com o comando real dentro. */
  function eventoDoComandoReal(fx: string): string {
    const envelope = JSON.stringify({
      type: 'result',
      is_error: false,
      permission_denials: [{ tool_name: 'Bash', tool_input: { command: CMD_REAL } }],
    });
    const ticket = join(fx, 'docs', 'fila', '234-fixture-234.md');
    const script = [
      `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
      `source "${EXECUTOR}"`,
      'set +e',
      `cat > "${fx}/saida.json" <<'ENVELOPE'\n${envelope}\nENVELOPE`,
      `permissoes_negadas "${fx}/saida.json" "${ticket}"`,
    ].join('\n');
    const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } });
    expect(r.status, r.stderr).toBe(0);
    return trilha(fx);
  }

  it('o comando real tem MESMO várias linhas (senão o teste não prova nada)', () => {
    expect(CMD_REAL.split('\n').length).toBeGreaterThan(5);
    expect(CMD_REAL).toContain('python3 - <<');
  });

  it('o evento sai em UMA linha, com \\n literal e no máximo 160 caracteres de comando', () => {
    const fx = criarFixture([{ id: '234', slug: 'fixture-234' }]);
    const t = eventoDoComandoReal(fx).trimEnd();
    const linhas = t.split('\n');
    expect(linhas).toHaveLength(1);

    const linha = linhas[0]!;
    expect(linha).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[-+]\d{4} 234 PERMISSAO_NEGADA n=1 cmds=/);
    const cmds = linha.replace(/^.*? cmds=/, '');
    expect(cmds.length).toBeLessThanOrEqual(160);
    expect(cmds).toContain('\\n');
    // O heredoc que vazou para as linhas 254-259 da trilha real: nem escapado
    // ele cabe em 160, então some no corte — que é exatamente o desejado.
    expect(cmds).not.toContain('import re');
    // E o começo do comando continua legível: truncar não pode custar o assunto.
    expect(cmds).toContain('cd /Users/lucasantos/Projetos/_worktrees/ci-234');
  });

  it('a trilha inteira continua 100% timestampada depois do evento', () => {
    const fx = criarFixture([{ id: '234', slug: 'fixture-234' }]);
    const t = eventoDoComandoReal(fx).trimEnd();
    for (const l of t.split('\n')) expect(l).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('o escape vale para QUALQUER evento, não só PERMISSAO_NEGADA', () => {
  it('valor multi-linha em evento arbitrário sai numa linha só', () => {
    const fx = criarFixture([]);
    bashNoFixture(fx, `event 901 QUALQUER "detalhe=$(printf 'linha1\\nlinha2\\nlinha3')"`, { ORQ_TESTE: '1' });
    const linhas = trilha(fx).trimEnd().split('\n');
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain('detalhe=linha1\\nlinha2\\nlinha3');
  });

  it('o próprio EVENTO e o ID também são escapados (nada monta linha pelo cabeçalho)', () => {
    const fx = criarFixture([]);
    bashNoFixture(fx, `event "$(printf '90\\n1')" QUALQUER`, { ORQ_TESTE: '1' });
    expect(trilha(fx).trimEnd().split('\n')).toHaveLength(1);
  });
});
