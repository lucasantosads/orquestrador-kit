/**
 * Ticket 628 (harness manual, 24/09/2026) — o juiz recebe a definição dos
 * helpers chamados pelos testes novos.
 *
 * Causa (auditoria de 22/09/2026): no 488b o juiz reprovou três vezes porque
 * inferiu pelo NOME que `payloadSoComAnexo()` trazia anexo. Na base a fixture
 * era `body: ""` sem `attachments`, exatamente o cenário pedido, e o corpo dela
 * não estava no diff nem no `contexto_juiz`.
 *
 * O caso central roda `run_juiz` DE VERDADE (executor.sh sourced, juiz
 * stubado), como o teste do 622: o que se assere é o `juiz.prompt.txt`.
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import {
  definicoesChamadasPelosTestes,
  montarPromptJuiz,
  TETO_DEF_LINHAS_ARQ,
  type EntradaPrompt,
} from '../scripts/orquestrador/juiz.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const BLOCO = 'DEFINIÇÕES CHAMADAS PELOS TESTES NOVOS';
const VEREDITO_OK = '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}';

const PAYLOADS_BASE = [
  "export const TENANT = 't-1'",
  '',
  '/** Mensagem só com anexo: corpo vazio e NENHUM attachments (o cenário do 488b). */',
  'export function payloadSoComAnexo() {',
  '  return {',
  "    body: '',",
  '    marca: MARCA_DA_BASE,',
  '  }',
  '}',
  '',
  "const MARCA_DA_BASE = 'CORPO_NA_BASE'",
  '',
].join('\n');

const TESTE_BASE = [
  "import { describe, it, expect } from 'vitest'",
  "import { payloadSoComAnexo } from './fixtures/payloads.js'",
  '',
  'function montarEvento(p: unknown) {',
  "  return { tipo: 'InboundMessage', payload: p }",
  '}',
  '',
  "describe('ingestao', () => {",
  "  it('ja existia', () => {",
  '    expect(1).toBe(1)',
  '  })',
  '})',
  '',
].join('\n');

/**
 * Worktree git com DOIS commits. A base tem o teste e a fixture; a HEAD
 * acrescenta um `it` e, se pedido, muda o CORPO da fixture (sem tocar a linha
 * que a declara), para provar que o que chega ao juiz é a BASE.
 */
function fixture(opts: { novoIt: string; mudaCorpoNaHead?: boolean; extraHead?: Record<string, string> }) {
  const fx = criarFixture([]);
  escreverTicket(fx, {
    id: '951',
    slug: 'defs',
    objetivo: 'teste do 488b',
    pathspec_allowlist: ['test/ingestao.test.ts'],
    criterios_aceite: [{ tipo: 'avaliador', descricao: 'avaliador: o cenário é só anexo', cmd: 'true', espera: 'avaliador' }],
  });
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'test', 'fixtures'), { recursive: true });
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  writeFileSync(join(wt, 'test', 'fixtures', 'payloads.ts'), PAYLOADS_BASE);
  writeFileSync(join(wt, 'test', 'ingestao.test.ts'), TESTE_BASE);
  writeFileSync(join(wt, 'README.md'), 'x\n');
  g('add', '-A');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  if (opts.novoIt) {
    writeFileSync(join(wt, 'test', 'ingestao.test.ts'), TESTE_BASE.replace(/\}\)\n$/, `${opts.novoIt}\n})\n`));
  }
  if (opts.mudaCorpoNaHead) {
    writeFileSync(
      join(wt, 'test', 'fixtures', 'payloads.ts'),
      PAYLOADS_BASE.replace("    body: '',", "    body: 'CORPO_DA_HEAD_NUNCA_DEVE_CHEGAR',"),
    );
  }
  for (const [p, c] of Object.entries(opts.extraHead ?? {})) writeFileSync(join(wt, p), c);
  g('add', '-A');
  g('commit', '-qm', 'trabalho');
  const rundir = join(fx, 'docs', 'fila', 'runs', '951', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), 'VEREDITO: APROVADO\n');
  return { fx, wt, base, rundir };
}

function rodarJuiz(f: ReturnType<typeof fixture>) {
  const vered = join(f.fx, 'veredito-stub.json');
  writeFileSync(vered, VEREDITO_OK);
  // Juiz stubado por --stub-juiz e claude_run falhando alto: nenhum modelo real.
  const script = [
    `export ORQ_EXEC_ROOT="${f.fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}" --stub-juiz "cat '${vered}'"`,
    'set +e',
    "claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }",
    'DIFF_LINES=4',
    `run_juiz "$(ticket_file_by_id 951)" "${f.wt}" "${f.rundir}" "${f.base}" 0`,
    'echo "RC_JUIZ=$? APROVADO=$JUIZ_APROVADO"',
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: f.fx, env: { ...process.env } });
  return { saida: `${r.stdout ?? ''}${r.stderr ?? ''}`, prompt: ler(join(f.rundir, 'juiz.prompt.txt')) };
}

const blocoDe = (p: string) => (p.includes(BLOCO) ? p.slice(p.indexOf(BLOCO), p.indexOf('SAÍDA DOS GATES MECÂNICOS')) : '');
const ocorrencias = (texto: string, trecho: string) => texto.split(trecho).length - 1;

describe('628 · run_juiz com teste novo chamando helper de fora do diff', () => {
  it('(a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE', () => {
    const f = fixture({
      novoIt: "  it('mensagem so com anexo', () => {\n    const e = montarEvento(payloadSoComAnexo())\n    expect(e.tipo).toBe('InboundMessage')\n  })",
      mudaCorpoNaHead: true,
    });
    const r = rodarJuiz(f);
    expect(r.saida).toContain('APROVADO=true');
    const bloco = blocoDe(r.prompt);
    expect(bloco, r.saida).not.toBe('');
    // helper do módulo importado, com arquivo:linha (linha 4 na base)
    expect(bloco).toContain('--- test/fixtures/payloads.ts:4 (payloadSoComAnexo;');
    expect(bloco).toContain("export function payloadSoComAnexo() {\n  return {\n    body: '',\n    marca: MARCA_DA_BASE,\n  }\n}");
    // helper do próprio arquivo de teste, também de fora do diff
    expect(bloco).toContain('--- test/ingestao.test.ts:4 (montarEvento;');
    expect(bloco).toContain("function montarEvento(p: unknown) {\n  return { tipo: 'InboundMessage', payload: p }\n}");
    // BASE, nunca HEAD: o diff mostra o corpo novo, o bloco não
    expect(bloco).not.toContain('CORPO_DA_HEAD_NUNCA_DEVE_CHEGAR');
    expect(r.prompt).toContain('CORPO_DA_HEAD_NUNCA_DEVE_CHEGAR');
    // expect/it/describe (de fora, sem definição relativa) não entram
    expect(bloco).not.toMatch(/\((expect|it|describe);/);
    // o bloco vem antes da saída dos gates, como o do 622
    expect(r.prompt.indexOf(BLOCO)).toBeLessThan(r.prompt.indexOf('SAÍDA DOS GATES MECÂNICOS'));
    // o juiz segue sem ferramentas
    expect(r.prompt).toContain('VOCÊ NÃO TEM FERRAMENTAS');
  });

  it('(b) helper definido no próprio diff não entra no bloco e aparece UMA vez; o de fora aparece no bloco, no MESMO prompt', () => {
    const f = fixture({
      novoIt: [
        '  function helperDoDiff() {',
        "    return 'CORPO_DO_HELPER_DO_DIFF'",
        '  }',
        "  it('usa os dois', () => {",
        '    expect(helperDoDiff()).toBeTruthy()',
        '    expect(payloadSoComAnexo().body).toBe(\'\')',
        '  })',
      ].join('\n'),
    });
    const r = rodarJuiz(f);
    const bloco = blocoDe(r.prompt);
    expect(bloco, r.saida).toContain('(payloadSoComAnexo;');
    expect(bloco).not.toContain('helperDoDiff');
    expect(ocorrencias(r.prompt, 'CORPO_DO_HELPER_DO_DIFF')).toBe(1);
  });

  it('(c) diff sem teste novo: nenhum bloco, prompt igual ao montado sem definições', () => {
    const f = fixture({ novoIt: '', extraHead: { 'README.md': 'y\n' } });
    const r = rodarJuiz(f);
    expect(r.saida).toContain('APROVADO=true');
    expect(r.prompt).not.toContain(BLOCO);
  });
});

// ─── byte a byte e tetos, direto no juiz.ts ─────────────────────────────────

const ENTRADA_FIXA: EntradaPrompt = {
  id: '950',
  objetivo: 'objetivo fixo',
  allowlist: ['src/a.ts', 'src/a.test.ts'],
  criterios: [
    { tipo: 'alvo', descricao: 'd1', cmd: 'true', espera: 'x' },
    { tipo: 'avaliador', descricao: 'compare com ref/base.sql', cmd: 'true', espera: 'avaliador' },
  ],
  diff: 'diff --git a/src/a.ts b/src/a.ts\n+x',
  gates: 'VEREDITO: APROVADO',
  nota: '',
};

describe('628 · montarPromptJuiz e definicoesChamadasPelosTestes', () => {
  it('(c) sem definições o prompt tem o MESMO hash do 622 (medido em 22/09/2026 na base 9a3c8d9)', () => {
    const h = (e: EntradaPrompt) => createHash('sha256').update(montarPromptJuiz(e)).digest('hex');
    expect(h({ ...ENTRADA_FIXA, definicoes: [] })).toBe('247287f41cdad685907387035fb3f395386da580b6b55c1926f548a0f2e1dcd5');
    expect(h(ENTRADA_FIXA)).toBe('247287f41cdad685907387035fb3f395386da580b6b55c1926f548a0f2e1dcd5');
  });

  it('(e) helper acima do teto é truncado, e o truncamento está escrito no texto', () => {
    const corpo = Array.from({ length: 1000 }, (_, i) => `  const l${i + 1} = ${i + 1}`).join('\n');
    const base: Record<string, string> = {
      'test/x.test.ts': `export function grande() {\n${corpo}\n}\n`,
    };
    const diff = [
      'diff --git a/test/x.test.ts b/test/x.test.ts',
      '--- a/test/x.test.ts',
      '+++ b/test/x.test.ts',
      '@@ -1,0 +1,1 @@',
      "+it('novo', () => { grande() })",
    ].join('\n');
    const [d] = definicoesChamadasPelosTestes(diff, (p) => base[p] ?? null);
    expect(d!.nome).toBe('grande');
    expect(d!.corpo).toContain('const l1 = 1');
    expect(d!.corpo).not.toContain('const l1000 = 1000');
    expect(d!.corpo).toMatch(/TRUNCADO: \d+ de 1002 linhas omitidas/);
    expect(d!.corpo.split('\n').length).toBe(TETO_DEF_LINHAS_ARQ + 1);
  });

  it('chamada de método (x.nome()) não conta como chamada do helper', () => {
    const base: Record<string, string> = { 'test/y.test.ts': 'function alvo() {\n  return 1\n}\n' };
    const diff = ['+++ b/test/y.test.ts', '+  obj.alvo()'].join('\n');
    expect(definicoesChamadasPelosTestes(diff, (p) => base[p] ?? null)).toEqual([]);
  });

  it('arquivo que não é *.test.ts não é varrido', () => {
    const base: Record<string, string> = { 'src/z.ts': 'function alvo() {\n  return 1\n}\n' };
    const diff = ['+++ b/src/z.ts', '+  alvo()'].join('\n');
    expect(definicoesChamadasPelosTestes(diff, (p) => base[p] ?? null)).toEqual([]);
  });

  it('erro do leitor que não é "ausente na base" sobe (não vira lista vazia)', () => {
    const diff = ['+++ b/test/w.test.ts', '+  alvo()'].join('\n');
    expect(() =>
      definicoesChamadasPelosTestes(diff, () => {
        throw new Error('git show falhou: bad object');
      }),
    ).toThrow(/bad object/);
  });
});
