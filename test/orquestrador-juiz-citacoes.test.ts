/**
 * Etapa 8e, P3: ticket de relatório. O juiz não tem ferramenta para conferir
 * `arquivo:linha` nem sha citados num .md do diff; o harness anexa, da BASE, o
 * trecho de cada citação e uma linha de `git show -s` de cada sha. Caso real:
 * dashboard-comercial 001/0 (relatório DC-0005, 24 citações, base c1051f13).
 * Os arquivos da base estão na fixture como `.txt` para o tsc do kit não os ler.
 */
import { describe, it, expect } from 'vitest';
import { cpSync, mkdirSync, readdirSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import { anexoCitacoes, montarPromptJuiz, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FX = join(REPO_ROOT, 'test', 'fixtures', 'juiz-8e', '001-0');
const BLOCO = 'TRECHOS CITADOS NOS .md DO DIFF';

const tirarTxt = (dir: string): void =>
  readdirSync(dir).forEach((n) => (statSync(join(dir, n)).isDirectory() ? tirarTxt(join(dir, n)) : renameSync(join(dir, n), join(dir, n.replace(/\.txt$/, '')))));

function promptDo001(): string {
  const fx = criarFixture([]);
  escreverTicket(fx, {
    id: '001',
    slug: 'relatorio',
    objetivo: 'relatório DC-0005 com arquivo:linha de cada insert',
    pathspec_allowlist: ['docs/auditoria/dc-0005-trafego-regras-historico.md'],
    criterios_aceite: [{ tipo: 'avaliador', descricao: 'cada arquivo:linha confere com a base', cmd: 'true', espera: 'avaliador' }],
  });
  const wt = join(fx, 'wt');
  mkdirSync(wt, { recursive: true });
  cpSync(join(FX, 'base'), wt, { recursive: true });
  tirarTxt(wt);
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  g('apply', join(FX, 'diff.patch'));
  g('add', '-A');
  g('commit', '-qm', 'relatorio');
  const rundir = join(fx, 'docs', 'fila', 'runs', '001', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), 'VEREDITO: APROVADO\n');
  writeFileSync(join(fx, 'v.json'), '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}');
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}" --stub-juiz "cat '${fx}/v.json'"`,
    'set +e',
    'DIFF_LINES=140',
    `run_juiz "$(ticket_file_by_id 001)" "${wt}" "${rundir}" "${base}" 0`,
  ].join('\n');
  spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx });
  return ler(join(rundir, 'juiz.prompt.txt'));
}

describe('P3: trechos e commits citados no relatório, lidos da base', () => {
  it('001/0: a linha 186 de avaliar-alerta-trafego chega ao juiz; citação sem arquivo na base vem marcada', () => {
    const p = promptDo001();
    const bloco = p.slice(p.indexOf(BLOCO), p.indexOf('SAÍDA DOS GATES'));
    expect(p.indexOf(BLOCO)).toBeGreaterThan(0);
    expect(bloco).toContain('--- src/app/api/ia/avaliar-alerta-trafego/route.ts:186 ---');
    expect(bloco).toContain('  186|       await supabase.from("trafego_regras_historico").insert({');
    expect(bloco).toContain('--- pausar/route.ts:71 (resolvido: src/app/api/meta/pausar/route.ts) ---');
    expect(bloco).toContain('--- src/app/api/meta/ativar/route.ts:53 --- AUSENTE na base');
    expect(bloco).toMatch(/c1051f13 -> NÃO ENCONTRADO na história da base/);
  });

  it('pura: ambiguidade, sha da base, tetos marcados e sem citação = prompt igual', () => {
    const arqs: Record<string, string> = {
      'a/x.ts': Array.from({ length: 50 }, (_, i) => `x${i + 1}`).join('\n'),
      'b/x.ts': 'b',
    };
    const ler = (p: string) => arqs[p] ?? null;
    const listar = () => Object.keys(arqs);
    const commit = (s: string) => (s === 'abc1234' ? 'abc1234 Mon Oct 1 assunto' : null);
    const md = (linhas: string[]) =>
      ['diff --git a/r.md b/r.md', '+++ b/r.md', ...linhas.map((l) => `+${l}`)].join('\n');
    const a = anexoCitacoes(md(['ver `x.ts:3`, `a/x.ts:10-30` e abc1234']), ler, listar, commit);
    expect(a).toContain('--- x.ts:3 --- AMBÍGUO na base: a/x.ts, b/x.ts');
    expect(a).toContain('    8| x8');
    expect(a).toMatch(/TRUNCADO: 13 de 25 linhas/);
    expect(a).toContain('abc1234 -> abc1234 Mon Oct 1 assunto');
    const muitas = md(Array.from({ length: 45 }, (_, i) => `a/x.ts:${i + 1}`));
    expect(anexoCitacoes(muitas, ler, listar, commit)).toMatch(/5 citações OMITIDAS \(teto de 40\)/);
    const e: EntradaPrompt = { id: '1', objetivo: 'o', criterios: [], allowlist: [], diff: '', gates: '' };
    expect(anexoCitacoes('+++ b/src/a.ts\n+a/x.ts:3', ler, listar, commit)).toBe('');
    expect(montarPromptJuiz({ ...e, anexo: '' })).toBe(montarPromptJuiz(e));
  });
});
