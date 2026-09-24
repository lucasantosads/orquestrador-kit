/**
 * Ticket 622 — `contexto_juiz`: arquivos de referência fora do diff para o juiz.
 *
 * O caso que motivou (501, 21/09/2026): o critério avaliador mandava comparar a
 * migration nova "LINHA A LINHA contra supabase/migrations/0264...", a 0264 não
 * estava no diff, e o juiz — sem ferramentas, de propósito — reprovou dizendo que
 * o material não trazia o arquivo. Não havia campo no ticket para declarar
 * referência.
 *
 * O caso central roda `run_juiz` DE VERDADE (executor.sh sourced, juiz
 * stubado): o que se assere é o `juiz.prompt.txt` que o harness montou, não uma
 * derivação que o teste juntou.
 *
 *   (a) ticket sem contexto_juiz → prompt idêntico ao de antes, byte a byte;
 *   (b) o conteúdo vem da BASE da tentativa, não da HEAD/worktree;
 *   (c) teto de linhas, truncamento marcado no texto;
 *   (d) caminho ausente na base falha alto;
 *   (e) gate-ticket valida o campo (lista, existe na branch alvo, não é
 *       arquivo da própria allowlist).
 */
import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import { montarPromptJuiz, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';
import { lerFila, validar, type GateCfg } from '../scripts/orquestrador/gate-ticket.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const ROTULO = 'estado na base, NÃO faz parte do diff';
const REF = 'supabase/migrations/0264_ref.sql';

// ─── (a) sem contexto, byte a byte ──────────────────────────────────────────

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

describe('(a) sem contexto_juiz o prompt não muda', () => {
  it('hash idêntico ao do prompt de ANTES do 622 (medido em 22/09/2026 na base 9a3c8d9)', () => {
    const h = createHash('sha256').update(montarPromptJuiz(ENTRADA_FIXA)).digest('hex');
    expect(h).toBe('247287f41cdad685907387035fb3f395386da580b6b55c1926f548a0f2e1dcd5');
  });

  it('contexto vazio = contexto ausente', () => {
    expect(montarPromptJuiz({ ...ENTRADA_FIXA, contexto: [] })).toBe(montarPromptJuiz(ENTRADA_FIXA));
  });

  it('com contexto, o bloco entra ANTES da saída dos gates', () => {
    const p = montarPromptJuiz({ ...ENTRADA_FIXA, contexto: [{ path: REF, conteudo: 'select 1;' }] });
    const iRef = p.indexOf('ARQUIVOS DE REFERÊNCIA');
    expect(iRef).toBeGreaterThan(0);
    expect(p.indexOf('select 1;')).toBeGreaterThan(iRef);
    expect(p.indexOf('SAÍDA DOS GATES MECÂNICOS')).toBeGreaterThan(p.indexOf('select 1;'));
  });
});

// ─── run_juiz de verdade ────────────────────────────────────────────────────

const VEREDITO_OK = '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}';

/**
 * Fixture: checkout de papel + worktree git com DOIS commits. A base tem a
 * referência com o conteúdo "da base"; a HEAD muda a referência (para provar que
 * o que chega ao juiz é a BASE) e mexe em src/a.ts (o trabalho do ticket).
 */
function fixture(contexto: unknown, refNaBase: string | null) {
  const fx = criarFixture([]);
  escreverTicket(fx, {
    id: '950',
    slug: 'contexto',
    objetivo: 'cria a v2 comparando com a 0264',
    pathspec_allowlist: ['src/a.ts'],
    criterios_aceite: [
      {
        tipo: 'avaliador',
        descricao: `compare LINHA A LINHA contra ${REF}`,
        cmd: 'true',
        espera: 'avaliador',
      },
    ],
    ...(contexto === undefined ? {} : { contexto_juiz: contexto }),
  });
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'src'), { recursive: true });
  mkdirSync(join(wt, 'supabase', 'migrations'), { recursive: true });
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  writeFileSync(join(wt, 'src', 'a.ts'), 'export const a = 1\n');
  if (refNaBase !== null) writeFileSync(join(wt, REF), refNaBase);
  g('add', '-A');
  g('commit', '-qm', 'base');
  const base = g('rev-parse', 'HEAD').stdout.trim();
  writeFileSync(join(wt, 'src', 'a.ts'), 'export const a = 2\n');
  writeFileSync(join(wt, REF), 'LINHA_DA_HEAD_NUNCA_DEVE_CHEGAR\n');
  g('add', '-A');
  g('commit', '-qm', 'trabalho');
  const rundir = join(fx, 'docs', 'fila', 'runs', '950', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), 'VEREDITO: APROVADO\n');
  return { fx, wt, base, rundir };
}

function rodarJuiz(f: ReturnType<typeof fixture>) {
  // O veredito vai por ARQUIVO: aspas do JSON dentro do --stub-juiz quebram o
  // quoting do bash.
  const vered = join(f.fx, 'veredito-stub.json');
  writeFileSync(vered, VEREDITO_OK);
  const script = [
    `export ORQ_EXEC_ROOT="${f.fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}" --stub-juiz "cat '${vered}'"`,
    'set +e',
    'DIFF_LINES=4',
    `run_juiz "$(ticket_file_by_id 950)" "${f.wt}" "${f.rundir}" "${f.base}" 0`,
    'echo "RC_JUIZ=$? APROVADO=$JUIZ_APROVADO"',
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: f.fx, env: { ...process.env } });
  return {
    saida: `${r.stdout ?? ''}${r.stderr ?? ''}`,
    rc: r.status ?? 1,
    prompt: ler(join(f.rundir, 'juiz.prompt.txt')),
  };
}

describe('run_juiz com contexto_juiz', () => {
  it('o critério cita um arquivo fora do diff: o material do juiz passa a conter esse arquivo, rotulado', () => {
    const f = fixture([REF], '-- gabarito\nLINHA_DA_BASE_0264\n');
    const r = rodarJuiz(f);
    expect(r.saida).toContain('APROVADO=true');
    expect(r.prompt).toContain(REF);
    expect(r.prompt).toContain('LINHA_DA_BASE_0264');
    expect(r.prompt).toContain(ROTULO);
    expect(r.prompt.indexOf('LINHA_DA_BASE_0264')).toBeLessThan(r.prompt.indexOf('SAÍDA DOS GATES MECÂNICOS'));
  });

  it('o conteúdo é o da BASE da tentativa, não o da HEAD', () => {
    const r = rodarJuiz(fixture([REF], 'LINHA_DA_BASE_0264\n'));
    expect(r.prompt).toContain('LINHA_DA_BASE_0264');
    // A HEAD mudou a referência; o diff mostra a mudança, mas o BLOCO de
    // referência não pode trazer o conteúdo novo.
    const bloco = r.prompt.slice(r.prompt.indexOf('ARQUIVOS DE REFERÊNCIA'), r.prompt.indexOf('SAÍDA DOS GATES MECÂNICOS'));
    expect(bloco).toContain('LINHA_DA_BASE_0264');
    expect(bloco).not.toContain('LINHA_DA_HEAD_NUNCA_DEVE_CHEGAR');
  });

  it('arquivo acima do teto é truncado, e o truncamento está escrito no texto', () => {
    const linhas = Array.from({ length: 1000 }, (_, i) => `linha_${i + 1}`).join('\n') + '\n';
    const r = rodarJuiz(fixture([REF], linhas));
    // Só o BLOCO: o diff da HEAD mostra as 1000 linhas removidas da referência.
    const bloco = r.prompt.slice(r.prompt.indexOf('ARQUIVOS DE REFERÊNCIA'), r.prompt.indexOf('SAÍDA DOS GATES MECÂNICOS'));
    expect(bloco).toContain('linha_1\n');
    expect(bloco).not.toContain('linha_1000');
    expect(bloco).toMatch(/TRUNCADO/);
  });

  it('caminho ausente na base falha ALTO: rc != 0, nome do caminho no log, juiz não roda', () => {
    const r = rodarJuiz(fixture(['supabase/migrations/nao_existe.sql'], 'x\n'));
    expect(r.rc).not.toBe(0);
    expect(r.saida).toContain('nao_existe.sql');
    expect(r.saida).not.toContain('APROVADO=true');
  });

  it('ticket SEM contexto_juiz: nenhum bloco de referência', () => {
    const r = rodarJuiz(fixture(undefined, 'LINHA_DA_BASE_0264\n'));
    expect(r.saida).toContain('APROVADO=true');
    expect(r.prompt).not.toContain('ARQUIVOS DE REFERÊNCIA');
    expect(r.prompt).toContain('DIFF CRU DA TENTATIVA');
  });
});

// ─── (d) gate-ticket ────────────────────────────────────────────────────────

/** Fila num repo git de verdade, com a referência commitada na branch alvo. */
function filaGit(contexto: unknown, allowlist: string[] = ['src/a.ts']) {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-ctx-gate-'));
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', raiz, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'alvo');
  mkdirSync(join(raiz, 'supabase', 'migrations'), { recursive: true });
  writeFileSync(join(raiz, REF), 'select 1;\n');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('checkout', '-q', '-b', 'outra');
  escreverTicket(raiz, {
    id: '950',
    slug: 'contexto',
    bloco: 'B6',
    risco: '',
    objetivo: 'cria a v2',
    pathspec_allowlist: allowlist,
    criterios_aceite: [{ tipo: 'avaliador', descricao: 'compara', cmd: 'true', espera: 'avaliador' }],
    ...(contexto === undefined ? {} : { contexto_juiz: contexto }),
  });
  const filaDir = join(raiz, 'docs', 'fila');
  const cfg: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [], branch_alvo: 'alvo' };
  const fila = lerFila(filaDir);
  const v = validar(fila, fila, cfg).filter((x) => x.campo.startsWith('contexto_juiz'));
  return { erros: v.filter((x) => !x.aviso && !x.isencao), avisos: v.filter((x) => x.aviso) };
}

describe('(d) gate-ticket valida contexto_juiz', () => {
  it('ausente: nada a dizer', () => {
    expect(filaGit(undefined).erros).toEqual([]);
  });

  it('caminho que existe na branch alvo e não é da allowlist: ok', () => {
    const r = filaGit([REF]);
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([]);
  });

  it('não é lista de strings: violação', () => {
    expect(filaGit(REF).erros.length).toBe(1);
    expect(filaGit([REF, 42]).erros.length).toBe(1);
  });

  it('caminho que não existe na branch alvo: violação que nomeia o caminho', () => {
    const r = filaGit(['supabase/migrations/nao_existe.sql']);
    expect(r.erros.length).toBe(1);
    expect(r.erros[0]!.mensagem).toContain('nao_existe.sql');
  });

  it('caminho listado na allowlist do próprio ticket: violação', () => {
    const r = filaGit([REF], ['src/a.ts', REF]);
    expect(r.erros.length).toBe(1);
    expect(r.erros[0]!.mensagem).toMatch(/allowlist/);
  });

  it('caminho só coberto por GLOB da allowlist (o caso do 501): aviso, não violação', () => {
    const r = filaGit([REF], ['supabase/migrations/*.sql']);
    expect(r.erros).toEqual([]);
    expect(r.avisos.length).toBe(1);
  });
});
