/**
 * Etapa 8e, P4: `juiz.review_md`, as regras de revisão do repo (REVIEW.md) no
 * prompt do juiz. Lido da BASE, nunca da worktree; bloco depois das cobranças
 * (itens 4 e 5 incluídos) e antes de FORMATO, no prefixo fixo por repo.
 * Sem a chave, o prompt é byte a byte o do motor de 220068f.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import { montarPromptJuiz, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';
import { checarReviewMd, preVooRelampago, type PreVooDeps } from '../scripts/orquestrador/prevoo.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FX = join(REPO_ROOT, 'test', 'fixtures', 'juiz-8e');
const ENTRADA = JSON.parse(readFileSync(join(FX, 'entrada-golden.json'), 'utf8')) as EntradaPrompt;
const BLOCO = 'REVIEW.md DO REPO';

describe('P4: bloco do REVIEW.md no prompt', () => {
  it('sem review: byte a byte o golden de 220068f (itens 4 e 5, nota, referência, definições)', () => {
    const golden = readFileSync(join(FX, 'golden-220068f.txt'), 'utf8');
    expect(montarPromptJuiz(ENTRADA)).toBe(golden);
    expect(montarPromptJuiz({ ...ENTRADA, review: '' })).toBe(golden);
  });

  it('com review: depois do item 5 e antes de FORMATO', () => {
    const p = montarPromptJuiz({ ...ENTRADA, review: '- regra R1 do repo\n' });
    const i = p.indexOf(BLOCO);
    expect(i).toBeGreaterThan(p.indexOf('5. TESTE VIZINHO AMPLIADO'));
    expect(p.indexOf('- regra R1 do repo')).toBeGreaterThan(i);
    expect(p.indexOf('RESPONDA SÓ COM ESTE JSON')).toBeGreaterThan(p.indexOf('- regra R1 do repo'));
  });
});

function rodar(reviewNaBase: string | null) {
  const fx = criarFixture([]);
  const cfgPath = join(fx, 'docs', 'fila', '000-config.json');
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8'));
  cfg.juiz.review_md = 'docs/REVIEW.md';
  writeFileSync(cfgPath, JSON.stringify(cfg, null, 2));
  escreverTicket(fx, { id: '953', slug: 'review', pathspec_allowlist: ['src/a.ts'] });
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'docs'), { recursive: true });
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  writeFileSync(join(wt, 'a.txt'), '1\n');
  if (reviewNaBase !== null) writeFileSync(join(wt, 'docs', 'REVIEW.md'), reviewNaBase);
  g('add', '-A');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  writeFileSync(join(wt, 'docs', 'REVIEW.md'), 'REGRA_DA_HEAD_NUNCA_CHEGA\n');
  g('add', '-A');
  g('commit', '-qm', 'trabalho');
  const rundir = join(fx, 'docs', 'fila', 'runs', '953', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(fx, 'v.json'), '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}');
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}" --stub-juiz "cat '${fx}/v.json'"`,
    'set +e',
    'DIFF_LINES=2',
    `( run_juiz "$(ticket_file_by_id 953)" "${wt}" "${rundir}" "${base}" 0 ); echo "RC=$?"`,
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx });
  return { saida: `${r.stdout}${r.stderr}`, prompt: ler(join(rundir, 'juiz.prompt.txt')) };
}

describe('P4: run_juiz lê juiz.review_md da BASE', () => {
  it('o conteúdo da base chega; o da HEAD não', () => {
    const r = rodar('- REGRA_DA_BASE\n');
    const bloco = r.prompt.slice(r.prompt.indexOf(BLOCO), r.prompt.indexOf('RESPONDA SÓ'));
    expect(bloco).toContain(BLOCO);
    expect(bloco).toContain('- REGRA_DA_BASE');
    expect(bloco).not.toContain('REGRA_DA_HEAD_NUNCA_CHEGA');
  });

  it('chave presente e arquivo ausente na base: o juiz não roda', () => {
    const r = rodar(null);
    expect(r.saida).toMatch(/juiz\.review_md 'docs\/REVIEW\.md' ausente na base/);
    expect(r.saida).not.toContain('RC=0');
  });
});

describe('P4: pré-voo cat.8 (review_md)', () => {
  const ler = (t: string | null) => ({ lerDaBranchAlvo: () => t }) as unknown as PreVooDeps;
  const cfg = { branch_alvo: 'staging-auto', juiz: { review_md: 'docs/REVIEW.md' } };
  const linhas = (n: number) => Array.from({ length: n }, () => 'x').join('\n') + '\n';

  it('tetos: 150 linhas passa, 151 linhas e 8193 B reprovam, ausente reprova', () => {
    expect(checarReviewMd(cfg, ler(linhas(150))).ok).toBe(true);
    expect(checarReviewMd(cfg, ler(linhas(151))).motivo).toMatch(/151 linhas/);
    expect(checarReviewMd(cfg, ler('y'.repeat(8192) + '\n')).motivo).toMatch(/8193 bytes/);
    expect(checarReviewMd(cfg, ler(null)).motivo).toMatch(/ausente em staging-auto/);
  });

  it('sem a chave, o pré-voo não ganha item novo', () => {
    const deps = {
      tsxLocal: () => true, arquivoComConteudo: () => true, contarArquivosCommitados: () => 6,
      lerOrigin: () => 'x', lerEnv: () => '', filaTemArquivo: () => true, filaTemDir: () => true,
      lerLiberacoes: () => '{"tokens":[]}', ultimaSondagem: () => null, hoje: () => '2026-10-24',
      lerDaBranchAlvo: () => linhas(151),
    } as PreVooDeps;
    expect(preVooRelampago({ config: {}, deps }).itens.map((i) => i.token)).not.toContain('cat.8');
    const v = preVooRelampago({ config: cfg, deps });
    expect([v.ok, v.token]).toEqual([false, 'cat.8']);
  });
});
