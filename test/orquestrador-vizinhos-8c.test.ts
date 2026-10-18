/**
 * Etapa 8c — teste vizinho liberado só quando falha (medição do Comarka de 04 a
 * 17/10, `~/orq-sessoes/relatorio-kit-etapa8c.md`).
 *
 * As fixtures em `test/fixtures/vizinhos-8c/` são casos reais, copiados do
 * comarka-operacional (a origem de cada arquivo está no `ORIGEM.md` da pasta).
 */
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { enforce, matchesAllowlist, type EnforceConfig } from '../scripts/orquestrador/enforcement-core.js';
import {
  arquivosBaseVermelha,
  blocoFailVitest,
  cmdComAmpliados,
  decidirDesfecho,
  decidirRetry,
  decidirVizinhos,
  type DecisaoConfig,
  type SinalTentativa,
} from '../scripts/orquestrador/decisao.js';
import { testesVizinhos, type ArvoreAlvo } from '../scripts/orquestrador/gate-ticket.js';
import { montarDiagnostico } from '../scripts/orquestrador/diagnostico.js';
import { montarPromptJuiz, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';

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

// ─── P2a · a decisão pura e o subcomando `decisao vizinhos` ───────────────────

/** Um caso real do replay: o gate-vitest.txt, o ticket que rodou, o diff e a árvore reduzida. */
function caso(id: string) {
  const dir = join(FIX, id);
  const md = readdirSync(dir).find((f) => f.endsWith('.md'))!;
  const raiz = join(dir, 'arvore');
  const andar = (d: string): string[] =>
    readdirSync(d).flatMap((f) => (statSync(join(d, f)).isDirectory() ? andar(join(d, f)) : [join(d, f)]));
  const arvore: ArvoreAlvo = {
    arquivos: new Set(linhas(`${id}/arvore/arquivos.txt`)),
    // `.fixture` no nome para o tsc e o vitest do kit não lerem o recorte como código (convenção da 8a).
    testes: new Map(
      andar(join(raiz, 'test')).map((f) => [relative(raiz, f).replace(/\.fixture$/, ''), readFileSync(f, 'utf8')] as [string, string]),
    ),
    tsconfig: readFileSync(join(raiz, 'tsconfig.json.fixture'), 'utf8'),
  };
  const allowlist = ticketJson(`${id}/${md}`).pathspec_allowlist;
  return {
    gatesTxt: readFileSync(join(dir, 'gate-vitest.txt'), 'utf8'),
    arquivosDoDiff: linhas(`${id}/diff-arquivos.txt`),
    allowlist,
    arvore,
    vizinhos: testesVizinhos(allowlist, arvore),
  };
}

describe('8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist', () => {
  it.each([
    ['950', ['test/etapa2-funil-motor.test.ts']],
    ['1054', ['test/resolver-cliente-rota-diagnostico.test.ts', 'test/resolver-cliente-rota-resumo.test.ts']],
    ['1059', ['test/leitores-carteira-casa-nova.test.ts', 'test/leitores-ficha-casa-nova.test.ts']],
  ])('%s (caso real, o 457856c também ampliaria): amplia %j', (id, testes) => {
    const d = decidirVizinhos(caso(id));
    expect(d.amplia).toBe(true);
    expect([...d.testes].sort()).toEqual(testes);
    expect(d.pares.map((p) => p.teste).sort()).toEqual(testes);
    for (const p of d.pares) expect(p.item.startsWith('src/')).toBe(true);
  });

  it.each([
    ['924a', 'conta-entregas lê dir + "financeiro-tab.tsx"'],
    ['855', "adocao-predicado lê join('src', …)"],
  ])('%s (caso real, o teste_cita do 457856c não liga; a C11 liga): amplia — %s', (id) => {
    expect(decidirVizinhos(caso(id)).amplia).toBe(true);
  });

  it('762 (caso real): cron-paths-vercel só cita vercel.json, item fora de src/ — não amplia (o resgate foi src/middleware.ts)', () => {
    const d = decidirVizinhos(caso('762'));
    expect(d.amplia).toBe(false);
    expect(d.motivo).toContain('test/cron-paths-vercel.test.ts');
    expect(d.motivo).toContain('não é vizinho');
  });

  it('854 (caso real): rotas-orfas varre diretório — não amplia', () => {
    expect(decidirVizinhos(caso('854')).amplia).toBe(false);
  });

  it('711b3 (caso real): tudo ou nada — saude-motivo-sem-base é vizinho, sem-insumo não; não amplia nenhum', () => {
    const d = decidirVizinhos(caso('711b3'));
    expect(d.amplia).toBe(false);
    expect(d.testes).toEqual([]);
    expect(d.motivo).toContain('test/sem-insumo.test.ts');
  });

  it('830 (caso real): o FAIL está dentro da allowlist — não amplia', () => {
    const d = decidirVizinhos(caso('830'));
    expect(d.amplia).toBe(false);
    expect(d.motivo).toContain('dentro da allowlist');
  });

  it('sem FAIL legível: não amplia (vazio nunca vira "só vizinho")', () => {
    const d = decidirVizinhos({ ...caso('950'), gatesTxt: 'Test Files  1 failed\n' });
    expect(d.amplia).toBe(false);
    expect(d.motivo).toContain('nenhum FAIL');
  });

  it('teste vizinho que está no diff não é "fora": não amplia', () => {
    const c = caso('950');
    const d = decidirVizinhos({ ...c, arquivosDoDiff: [...c.arquivosDoDiff, 'test/etapa2-funil-motor.test.ts'] });
    expect(d.amplia).toBe(false);
    expect(d.motivo).toContain('no diff');
  });
});

describe('8c-P2a · blocoFailVitest: o FAIL, o erro e o local de cada teste ampliado', () => {
  it('950 (gate-vitest.txt real): FAIL, a asserção e o local test/etapa2-funil-motor.test.ts:92:50, sem ANSI', () => {
    const c = caso('950');
    const b = blocoFailVitest(c.gatesTxt, decidirVizinhos(c).pares);
    expect(b).toContain('--- test/etapa2-funil-motor.test.ts (importa ou cita src/lib/qualificacao/motor.ts)');
    expect(b).toContain('FAIL  test/etapa2-funil-motor.test.ts > funil e motor dão o mesmo número para o mesmo lead');
    expect(b).toContain('local: test/etapa2-funil-motor.test.ts:92:50');
    expect(b).not.toMatch(/\x1b\[/);
  });

  it('no máximo 40 linhas por teste', () => {
    const longo = [' FAIL  test/a.test.ts > x', ...Array.from({ length: 100 }, (_, i) => `linha ${i}`), '⎯⎯⎯'].join('\n');
    const b = blocoFailVitest(longo, [{ teste: 'test/a.test.ts', item: 'src/a.ts' }]);
    expect(b.split('\n').filter((l) => l.startsWith('linha ')).length).toBe(39);
  });
});

describe('8c-P2a · cmdComAmpliados: o critério de lista fechada aceita o teste ampliado, só na execução', () => {
  const md = '1373/1373-ia-registro-funcoes-sem-cadastro.md';
  const j = ticketJson(md) as { pathspec_allowlist: string[]; criterios_aceite: { cmd?: string }[] };
  const ampliados = linhas('1373/allowlist-ampliada.txt');
  const idx = j.criterios_aceite.findIndex((c) => (c.cmd ?? '').includes('SO_ALLOWLIST'));

  function rodaNoRepo(cmd: string): string {
    const d = mkdtempSync(join(tmpdir(), 'orq-8c-lista-'));
    const git = (...a: string[]) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8' });
    try {
      git('init', '-q', '-b', 'staging-auto');
      git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', 'base');
      git('checkout', '-q', '-b', 'frente/1373');
      for (const f of linhas('1373/diff-arquivos.txt')) {
        mkdirSync(dirname(join(d, f)), { recursive: true });
        writeFileSync(join(d, f), 'x\n');
      }
      git('add', '-A');
      git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'tentativa');
      return spawnSync('bash', ['--noprofile', '--norc', '-c', cmd], { cwd: d, encoding: 'utf8' }).stdout.trim();
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  }

  it('1373 (caso real): o cmd original dá FORA_<ampliado> como na tentativa 2; o derivado dá SO_ALLOWLIST', () => {
    expect(idx).toBeGreaterThanOrEqual(0);
    const cmd = j.criterios_aceite[idx]!.cmd!;
    expect(readFileSync(join(FIX, '1373', 'criterio-lista-fechada.txt'), 'utf8')).toContain('FORA_test/ia-funcoes-agentes-atendimento.test.ts');
    expect(rodaNoRepo(cmd)).toBe('FORA_test/ia-funcoes-agentes-atendimento.test.ts');
    const novo = cmdComAmpliados(cmd, j.pathspec_allowlist, ampliados);
    expect(novo).toContain("'test/ia-funcoes-agentes-atendimento.test.ts'");
    expect(rodaNoRepo(novo)).toBe('SO_ALLOWLIST');
  });

  it('cmd que não lista a allowlist inteira fica igual; ampliado que já está no cmd não entra de novo', () => {
    expect(cmdComAmpliados("test -e 'a.ts' && echo OK", ['a.ts', 'b.ts'], ['t.test.ts'])).toBe("test -e 'a.ts' && echo OK");
    const c = "printf '%s\\n' 'a.ts' 'b.ts' 't.test.ts'";
    expect(cmdComAmpliados(c, ['a.ts', 'b.ts'], ['t.test.ts'])).toBe(c);
    expect(cmdComAmpliados("x 'a.ts' 'b.ts' y", ['a.ts', 'b.ts'], [])).toBe("x 'a.ts' 'b.ts' y");
  });
});

describe('8c-P2a · decisao-cli vizinhos: lê a árvore do base_ticket e decide', () => {
  it('950 num repo de verdade (árvore reduzida commitada como base): amplia, com o bloco', () => {
    const c = caso('950');
    const d = mkdtempSync(join(tmpdir(), 'orq-8c-cli-'));
    const git = (...a: string[]) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8' });
    try {
      git('init', '-q');
      for (const f of [...c.arvore.arquivos]) {
        mkdirSync(dirname(join(d, f)), { recursive: true });
        writeFileSync(join(d, f), c.arvore.testes.get(f) ?? '// item\n');
      }
      writeFileSync(join(d, 'tsconfig.json'), c.arvore.tsconfig!);
      git('add', '-A');
      git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'base');
      const base = git('rev-parse', 'HEAD').trim();
      const r = spawnSync(
        join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
        [join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), join(REPO_ROOT, 'test', 'fixtures', 'checkout'), 'vizinhos'],
        {
          input: JSON.stringify({ gatesTxt: c.gatesTxt, arquivosDoDiff: c.arquivosDoDiff, allowlist: c.allowlist, worktree: d, base }),
          encoding: 'utf8',
        },
      );
      expect(r.status, r.stderr).toBe(0);
      const o = JSON.parse(r.stdout) as { amplia: boolean; testes: string[]; bloco: string };
      expect(o.amplia).toBe(true);
      expect(o.testes).toEqual(['test/etapa2-funil-motor.test.ts']);
      expect(o.bloco).toContain('local: test/etapa2-funil-motor.test.ts:92:50');
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});

// ─── P3 · anti-afrouxamento mecânico, só nos testes ampliados ─────────────────

/** Um diff de um arquivo só, com as linhas removidas e acrescentadas. */
function diffDe(arquivo: string, rem: string[], add: string[], extra = ''): string {
  return [
    `diff --git a/${arquivo} b/${arquivo}`,
    ...(extra ? [extra] : []),
    'index 1111111..2222222 100644',
    `--- a/${arquivo}`,
    `+++ ${extra.startsWith('deleted') ? '/dev/null' : `b/${arquivo}`}`,
    `@@ -1,${rem.length} +1,${add.length} @@`,
    ...rem.map((l) => `-${l}`),
    ...add.map((l) => `+${l}`),
    '',
  ].join('\n');
}
const afrouxa = (arquivo: string, diff: string, ampliados = [arquivo]) =>
  enforce({ changedFiles: [arquivo], allowlist: [arquivo], ampliados, diff, config: cfg }).violations.filter((v) => v.tipo === 'afrouxamento');

describe('8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado', () => {
  const T = 'test/vizinho.test.ts';
  it.each([
    ['remove it/test', diffDe(T, ["  it('conta 2', () => {", '    expect(f()).toBe(2)', '  })'], [])],
    ['remove expect', diffDe(T, ['    expect(f()).toBe(2)', '    expect(g()).toBe(3)'], ['    expect(f()).toBe(2)'])],
    ['acrescenta .skip/.only/.todo', diffDe(T, ["  it('conta 2', () => {"], ["  it.skip('conta 2', () => {"])],
    ['acrescenta matcher genérico', diffDe(T, ['    expect(r).toEqual({ a: 1 })'], ['    expect(r).toBeDefined()'])],
    ['comenta it/test/expect', diffDe(T, ['    expect(f()).toBe(2)'], ['    // expect(f()).toBe(2)', '    expect(f()).toBe(2)'])],
    ['apaga o arquivo de teste', diffDe(T, ["  it('x', () => { expect(1).toBe(1) })"], [], 'deleted file mode 100644')],
  ])('%s', (regra, diff) => {
    // pode disparar mais de uma (it.skip( não conta como it(: some um it e entra um skip); a nomeada tem de estar
    const v = afrouxa(T, diff);
    expect(v.length, JSON.stringify(v)).toBeGreaterThanOrEqual(1);
    expect(v.every((x) => x.detalhe.startsWith(`${T}: `))).toBe(true);
    expect(v.some((x) => x.detalhe.includes(regra)), JSON.stringify(v)).toBe(true);
  });

  it('a mesma mudança num teste da allowlist que NÃO foi ampliado não dispara (as regras valem só nos ampliados)', () => {
    expect(afrouxa(T, diffDe(T, ['    expect(f()).toBe(2)'], []), [])).toEqual([]);
    expect(afrouxa(T, diffDe(T, ['    expect(f()).toBe(2)'], []), ['test/outro.test.ts'])).toEqual([]);
  });

  it('valor recalculado (troca a linha do expect, mesma contagem) não é afrouxamento', () => {
    expect(afrouxa(T, diffDe(T, ['    expect(n).toBe(20)'], ['    // 1: a rota nova entra na contagem', '    expect(n).toBe(21)']))).toEqual([]);
  });
});

describe('8c-P3 · os consertos reais do PASSO 0 passam (33 arquivos, 18 tickets: resgates e 966, 854, 867, 840)', () => {
  const dir = join(FIX, 'afrouxamento');
  const casos = readdirSync(dir).filter((f) => f.endsWith('.diff')).map((f) => f.replace(/\.diff$/, ''));
  it('são os 18 tickets e os 33 arquivos medidos', () => {
    expect(casos).toHaveLength(18);
    const n = casos.reduce((a, c) => a + (readFileSync(join(dir, `${c}.diff`), 'utf8').match(/^diff --git /gm) ?? []).length, 0);
    expect(n).toBe(33);
  });
  it.each(casos)('%s: nenhum teste do conserto reprova como afrouxamento', (c) => {
    const diff = readFileSync(join(dir, `${c}.diff`), 'utf8');
    const arquivos = [...diff.matchAll(/^diff --git a\/\S+ b\/(\S+)$/gm)].map((m) => m[1]!);
    const r = enforce({ changedFiles: arquivos, allowlist: arquivos, ampliados: arquivos, diff, config: cfg });
    expect(r.violations.filter((v) => v.tipo === 'afrouxamento')).toEqual([]);
  });
});

describe('8c-P3 · decisão: afrouxamento reprova sem retry (nunca refatiar)', () => {
  const dcfg = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', '000-config.json'), 'utf8')) as DecisaoConfig;
  const sinal = (violacoes: { tipo: string; detalhe: string }[]): SinalTentativa => ({
    exitCode: 0,
    saida: '',
    diffLines: 10,
    gateInterrompido: false,
    enforcementViolado: true,
    criteriosFalhos: [],
    violacoesEnforcement: violacoes,
  });
  it('só afrouxamento: reprovado, causa afrouxamento, e o plano de retry bloqueia', () => {
    const v = decidirDesfecho(dcfg, sinal([{ tipo: 'afrouxamento', detalhe: 'test/a.test.ts: remove expect (2 → 1)' }]));
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('afrouxamento');
    expect(v.motivo).toContain('test/a.test.ts: remove expect');
    const p = decidirRetry(dcfg, v, 0, 'sonnet');
    expect(p.deveTentar).toBe(false);
  });
  it('afrouxamento junto com fora_do_pathspec: o afrouxamento manda (não vira refatiar)', () => {
    const v = decidirDesfecho(dcfg, sinal([
      { tipo: 'fora_do_pathspec', detalhe: 'src/x.ts' },
      { tipo: 'afrouxamento', detalhe: 'test/a.test.ts: acrescenta .skip/.only/.todo (0 → 1)' },
    ]));
    expect([v.desfecho, v.causa]).toEqual(['reprovado', 'afrouxamento']);
  });
  it('contra-teste: sem afrouxamento, enforcement segue refatiar como hoje', () => {
    expect(decidirDesfecho(dcfg, sinal([{ tipo: 'fora_do_pathspec', detalhe: 'src/x.ts' }])).desfecho).toBe('refatiar');
  });
});

// ─── P4 · o juiz recebe a lista ampliada ──────────────────────────────────────

describe('8c-P4 · prompt do juiz: o bloco do teste vizinho ampliado só quando há ampliação', () => {
  const base: EntradaPrompt = {
    id: '950',
    objetivo: 'cascata de marcos no motor',
    criterios: [{ tipo: 'avaliador', descricao: 'o motor aplica a cascata', espera: 'avaliador' }],
    allowlist: ['src/lib/qualificacao/motor.ts'],
    diff: 'diff --git a/x b/x',
    gates: 'ok',
  };
  it('sem ampliados (ausente ou vazio): o prompt sai byte a byte como antes, sem o bloco nem o anti-afrouxamento', () => {
    const p = montarPromptJuiz(base);
    expect(montarPromptJuiz({ ...base, ampliados: [] })).toBe(p);
    expect(p).not.toContain('TESTE VIZINHO AMPLIADO');
    expect(p).not.toContain('ANTI-AFROUXAMENTO');
  });
  it('com ampliados: lista os testes, liga o anti-afrouxamento e cobra o afrouxamento por dado (o 762)', () => {
    const p = montarPromptJuiz({ ...base, ampliados: ['test/etapa2-funil-motor.test.ts'] });
    expect(p).toContain('TESTE VIZINHO AMPLIADO');
    expect(p).toContain('  - test/etapa2-funil-motor.test.ts');
    expect(p).toContain('ANTI-AFROUXAMENTO');
    expect(p).toMatch(/lista de exceções/);
    expect(p).toMatch(/OBJETIVO/);
  });
});
