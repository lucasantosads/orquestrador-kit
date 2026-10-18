/**
 * Etapa 8c — teste vizinho liberado só quando falha (medição do Comarka de 04 a
 * 17/10, `~/orq-sessoes/relatorio-kit-etapa8c.md`).
 *
 * As fixtures em `test/fixtures/vizinhos-8c/` são casos reais, copiados do
 * comarka-operacional (a origem de cada arquivo está no `ORIGEM.md` da pasta).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { enforce, matchesAllowlist, type EnforceConfig } from '../scripts/orquestrador/enforcement-core.js';
import { arquivosBaseVermelha } from '../scripts/orquestrador/decisao.js';
import { testesVizinhos, type ArvoreAlvo } from '../scripts/orquestrador/gate-ticket.js';
import { montarDiagnostico } from '../scripts/orquestrador/diagnostico.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures', 'vizinhos-8c');
const cfg = JSON.parse(
  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', '000-config.json'), 'utf8'),
) as EnforceConfig;
const linhas = (arq: string) =>
  readFileSync(join(FIX, arq), 'utf8')
    .split('\n')
    .filter((l) => l && !l.startsWith('#'));
const ticketJson = (arq: string) =>
  JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(FIX, arq), 'utf8'))![1]!) as { pathspec_allowlist: string[] };

describe('8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico)', () => {
  const allow295 = ticketJson('295/295-fetch-json-teto.md').pathspec_allowlist;
  const diff295 = linhas('295/arquivos-do-diff.txt');

  it('295 (caso real): das 41 violações do Comarka, somem as 31 sob tabs/ e ficam só os 10 testes de fato fora', () => {
    expect(allow295).toContain('src/app/dashboard/clientes/[id]/tabs/');
    const comarka = linhas('295/violacoes-comarka.txt');
    expect(comarka).toHaveLength(41);
    const reais = comarka.filter((f) => !f.includes('/tabs/'));
    expect(reais).toHaveLength(10);
    const r = enforce({ changedFiles: diff295, allowlist: allow295, diff: '', config: cfg });
    expect(r.violations.filter((v) => v.tipo === 'fora_do_pathspec').map((v) => v.detalhe)).toEqual(reais);
  });

  it('src/x/ casa src/x/a.ts e src/x/b/c.ts; não casa src/xy/a.ts nem src/x', () => {
    expect(matchesAllowlist('src/x/a.ts', ['src/x/'])).toBe(true);
    expect(matchesAllowlist('src/x/b/c.ts', ['src/x/'])).toBe(true);
    expect(matchesAllowlist('src/xy/a.ts', ['src/x/'])).toBe(false);
    expect(matchesAllowlist('src/x', ['src/x/'])).toBe(false);
  });

  it('base vermelha: FAIL em teste sob um dir/ da allowlist é próprio do ticket', () => {
    const gatesTxt = ' FAIL  test/ficha/aba.test.ts > aba > rende\n';
    expect(arquivosBaseVermelha({ gatesTxt, arquivosDoDiff: [], allowlist: ['test/ficha/'] })).toEqual([]);
  });

  it('C11 (gate): teste sob um dir/ da allowlist não é vizinho', () => {
    const arvore: ArvoreAlvo = {
      arquivos: new Set(['src/lib/a.ts', 'test/ficha/a.test.ts']),
      testes: new Map([['test/ficha/a.test.ts', "import { a } from '../../src/lib/a'\n"]]),
    };
    expect([...testesVizinhos(['src/lib/a.ts', 'test/ficha/'], arvore).values()].flat()).toEqual([]);
  });

  it('diagnóstico do retry: teste sob um dir/ da allowlist não sai em fora_da_allowlist', () => {
    const gatesTxt = 'FALHA vitest (papel testes) — 1 falhou\n--- recorte de vitest ---\n FAIL  test/ficha/aba.test.ts > aba\n ❯ test/ficha/aba.test.ts:3:1\n'
    const d = montarDiagnostico({ allowlist: ['test/ficha/'], gatesTxt });
    expect(d.gate).toBe('vitest');
    expect(d.fora_da_allowlist).toEqual([]);
  });
});
