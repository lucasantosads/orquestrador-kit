/**
 * Peças 4 e 5 — o trailer `Orq-Ticket` e a numeração de tentativa unificada.
 *
 * As duas são instrumentação e as duas existem por causa da regra 5: git é o
 * ground truth, log não é. É pelo trailer que a quarentena da sentinela e o
 * relatório vão achar o que um ticket tocou (`git log --grep`); e a numeração
 * 1-based é o que faz "aprovação de primeira" ter UM número em vez de dois.
 *
 * A peça 5 acrescentou aqui as seções de numeração de tentativa: as duas são
 * instrumentação da mesma leitura, e separá-las em dois arquivos faria alguém
 * mudar uma e esquecer a outra.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escrever, ler, orq, REPO_ROOT } from './fixtures/orq-harness.js';

const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
const TRAILER = CFG.executor.trailer_commit;
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
const eventos = (raiz: string) => ler(join(raiz, 'docs', 'fila', 'runs', 'events.log'));

// ─── Peça 4 · o trailer ───────────────────────────────────────────────────

describe('o trailer vem do config, nunca hardcoded no shell', () => {
  it('config declara Orq-Ticket em executor.trailer_commit', () => {
    expect(TRAILER).toBe('Orq-Ticket');
  });

  it('o merge da drenagem lê o nome do config', () => {
    const loop = readFileSync(LOOP, 'utf8');
    expect(loop).toContain(`trailer="$(cfg '.executor.trailer_commit')"`);
    expect(loop).toMatch(/-m "\$trailer: \$id"/);
    // Nome do trailer escrito à mão no CÓDIGO seria a mesma dívida que os nomes
    // de campo do usage já foram (peça 5 da sessão A). Comentário pode citá-lo;
    // por isso a asserção olha só as linhas executáveis.
    const codigo = loop.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
    expect(codigo).not.toContain('Orq-Ticket');
  });

  it('a marca "(ticket <id>)" do reconcile NÃO foi substituída — as duas convivem', () => {
    const loop = readFileSync(LOOP, 'utf8');
    expect(loop).toMatch(/-m "orq: \$branch \(ticket \$id\) em \$BRANCH_ALVO"/);
  });
});

/** Repo git de mentira com uma branch de ticket, para exercitar merge_em_alvo. */
function repoComFrente(raiz: string, id: string) {
  const wt = join(raiz, 'repo');
  const g = (...a: string[]) => spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  escrever(join(wt, 'a.txt'), 'base\n');
  spawnSync('git', ['-C', wt, 'init', '-q', '-b', 'main'], { encoding: 'utf8' });
  g('add', 'a.txt');
  g('commit', '-qm', 'base');
  g('branch', CFG.branch_alvo);
  g('checkout', '-q', '-b', `frente/${id}`);
  escrever(join(wt, 'b.txt'), 'do ticket\n');
  g('add', 'b.txt');
  g('commit', '-qm', `${id}: faz a coisa`);
  g('checkout', '-q', CFG.branch_alvo);
  return { wt, g };
}

describe('o merge commit carrega o trailer, e o git o devolve', () => {
  it('git log --grep acha o merge pelo trailer', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez' }]);
    const { wt } = repoComFrente(raiz, '901');
    const r = spawnSync(
      'bash',
      [
        '-c',
        [
          'export LOCAL_LOOP_SOURCED=1',
          `source "${LOOP}"`,
          'set +e',
          `branch_existe() { git -C "${wt}" show-ref --verify --quiet "refs/heads/$1"; }`,
          `merge_em_alvo 901 "${wt}"`,
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } },
    );
    expect(`${r.stdout}${r.stderr}`).toMatch(/merge ok/);
    const achado = spawnSync('git', ['-C', wt, 'log', '--oneline', '--extended-regexp', '--grep', `^${TRAILER}: 901$`], { encoding: 'utf8' });
    expect(achado.stdout.trim()).not.toBe('');
    const msg = spawnSync('git', ['-C', wt, 'log', '-1', '--format=%B'], { encoding: 'utf8' }).stdout;
    expect(msg).toContain('(ticket 901)');
    expect(msg).toMatch(new RegExp(`^${TRAILER}: 901$`, 'm'));
  });

  it('NEGATIVO: o trailer é ancorado — 901 não casa 9012', () => {
    const raiz = criarFixture([{ id: '901' }]);
    const { wt } = repoComFrente(raiz, '901');
    spawnSync(
      'bash',
      ['-c', ['export LOCAL_LOOP_SOURCED=1', `source "${LOOP}"`, 'set +e', `branch_existe() { git -C "${wt}" show-ref --verify --quiet "refs/heads/$1"; }`, `merge_em_alvo 901 "${wt}"`].join('\n')],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz, GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t' } },
    );
    const achado = spawnSync('git', ['-C', wt, 'log', '--oneline', '--extended-regexp', '--grep', `^${TRAILER}: 9012$`], { encoding: 'utf8' });
    expect(achado.stdout.trim()).toBe('');
  });
});

describe('o prompt do executor cobra o trailer no commit do agente', () => {
  it('o prompt montado nomeia o trailer e o id', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', objetivo: 'faz a coisa' }]);
    const r = spawnSync(
      'bash',
      ['-c', ['export EXECUTOR_SOURCED=1', `source "${EXECUTOR}"`, 'set +e', 'build_prompt "$(ticket_file_by_id 901)" ""'].join('\n')],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
    );
    expect(r.stdout).toContain(`${TRAILER}: 901`);
    expect(r.stdout).toMatch(/git log --grep/);
  });

  it('EXECUTOR.md, o prefixo estável do prompt, já cobrava o mesmo trailer', () => {
    const md = readFileSync(join(REPO_ROOT, 'docs', 'orquestrador', 'skill', 'EXECUTOR.md'), 'utf8');
    expect(md).toContain(`${TRAILER}: <id>`);
  });
});

describe('orq ticket mostra os commits do trailer', () => {
  it('lista o commit quando ele existe', () => {
    // Aqui o fixture PRECISA ser o próprio repo git: `orq` lê a fila de
    // MAIN_CHECKOUT e o log de ROOT, e os dois têm que ser o mesmo lugar.
    const raiz = criarFixture([{ id: '901', slug: 'da-vez' }]);
    spawnSync('git', ['-C', raiz, 'init', '-q', '-b', 'main'], { encoding: 'utf8' });
    spawnSync('git', ['-C', raiz, '-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '--allow-empty', '-m', `901: entrega\n\n${TRAILER}: 901`], { encoding: 'utf8' });
    const r = orq(raiz, 'ticket', '901');
    expect(`${r.out}${r.err}`).toMatch(new RegExp(`COMMITS\\s+\\(${TRAILER}: 901\\)`));
    expect(r.out).toContain('901: entrega');
  });

  it('sem commit nenhum, avisa em vez de fingir que achou', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez' }]);
    const r = orq(raiz, 'ticket', '901');
    expect(r.err).toMatch(/nenhum commit com 'Orq-Ticket: 901'/);
  });
});

// ─── Peça 5 · numeração ───────────────────────────────────────────────────

describe('trilha e STATUS contam a primeira tentativa como 1', () => {
  const exec = readFileSync(EXECUTOR, 'utf8');

  it('nenhum evento do executor emite mais attempt=$attempt cru', () => {
    expect(exec).not.toMatch(/event "\$id" \w+ [^\n]*"attempt=\$attempt"/);
  });

  it('INICIO, APROVADO, REPROVADO, ADIADO, BLOQUEADO e JUIZ saem 1-based', () => {
    for (const ev of ['INICIO', 'APROVADO', 'REPROVADO', 'ADIADO', 'BLOQUEADO', 'JUIZ']) {
      expect(exec).toMatch(new RegExp(`event "\\$id" ${ev}[^\\n]*attempt=\\$\\(\\(attempt \\+ 1\\)\\)`));
    }
  });

  it('RETRY anuncia a PRÓXIMA tentativa, então sai attempt + 2', () => {
    expect(exec).toMatch(/event "\$id" RETRY "attempt=\$\(\(attempt \+ 2\)\)"/);
  });

  it('o STATUS já era 1-based e continua igual (nada a mudar lá)', () => {
    const lib = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh'), 'utf8');
    expect(lib).toMatch(/tentativa \$\(\( \$3 \+ 1 \)\)\/\$\(\( \$4 \+ 1 \)\)/);
  });

  // REVISADO NA PEÇA 0b. O que este teste protegia — "renomear invalidaria
  // evidência já gravada" — continua valendo, mas a versão antiga o garantia
  // nomeando o diretório com o CONTADOR DE RETRY, que reinicia a cada drenagem.
  // O requeue do 227 mostrou o preço: a rodada nova escreveu por cima de
  // attempt-0 e destruiu o prompt e a saída da tentativa que o juiz reprovou.
  // Agora o diretório é nomeado por um SLOT contínuo lido do disco, e é o campo
  // `dir` do meta.json que amarra contador a diretório.
  it('o DIRETÓRIO é nomeado pelo slot contínuo, nunca pelo contador de retry', () => {
    expect(exec).toContain('rundir="$RUNS_BASE/$id/attempt-$((slot + attempt))"');
    expect(exec).not.toContain('rundir="$RUNS_BASE/$id/attempt-$attempt"');
    expect(exec).toMatch(/slot_base_attempt\(\) \{/);
  });

  it('o slot é lido do disco, então rodada nova nunca reusa diretório antigo', () => {
    const fn = /slot_base_attempt\(\) \{[\s\S]*?\n\}/.exec(exec)![0];
    expect(fn).toContain('"$RUNS_BASE/$id"/attempt-*');
    expect(fn).toMatch(/max \+ 1/);
  });

  it('meta.json guarda o diretório junto do contador (campo dir)', () => {
    expect(exec).toMatch(/--arg dir "\$\(basename "\$rundir"\)"/);
  });

  it('a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', objetivo: 'x', pathspec_allowlist: ['src/a.ts'] }]);
    spawnSync(
      'bash',
      [
        '-c',
        [
          'export EXECUTOR_SOURCED=1',
          `source "${EXECUTOR}" --stub-juiz ${JSON.stringify(`printf '%s' '{"aprovado":true,"motivo":"ok","criterios_falhos":[]}'`)}`,
          'set +e',
          'DIFF_LINES=5',
          'git() { case "$*" in *"diff --name-only"*) echo "src/a.ts";; *"diff "*) echo "+ x";; *) command git "$@";; esac; }',
          `run_juiz "$(ticket_file_by_id 901)" "${raiz}" "${join(raiz, 'run')}" HEAD 0`,
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
    );
    expect(eventos(raiz)).toMatch(/901 JUIZ .*attempt=1/);
    expect(eventos(raiz)).not.toMatch(/901 JUIZ .*attempt=0/);
  });
});

describe('aprovação de primeira sai da trilha, com a conta 1-based', () => {
  const trilha = (raiz: string, linhas: string[]) => escrever(join(raiz, 'docs', 'fila', 'runs', 'events.log'), linhas.join('\n') + '\n');
  const HOJE = new Date().toISOString().slice(0, 10);

  it('conta APROVADO com attempt=1 sobre o total de APROVADO do dia', () => {
    const raiz = criarFixture([{ id: '901' }]);
    trilha(raiz, [
      `${HOJE}T10:00:00-0300 901 APROVADO merge=aguardando dur=10s attempt=1`,
      `${HOJE}T11:00:00-0300 902 APROVADO merge=aguardando dur=10s attempt=2`,
      `${HOJE}T12:00:00-0300 903 APROVADO merge=aguardando dur=10s attempt=1`,
      `${HOJE}T12:30:00-0300 904 REPROVADO motivo=x attempt=1`,
    ]);
    const r = orq(raiz, 'custo');
    expect(r.out).toMatch(/DE PRIMEIRA {2}2\/3 \(66%\)/);
  });

  it('attempt=10 não conta como de primeira (a âncora não é prefixo)', () => {
    const raiz = criarFixture([{ id: '901' }]);
    trilha(raiz, [`${HOJE}T10:00:00-0300 901 APROVADO merge=aguardando attempt=10`]);
    expect(orq(raiz, 'custo').out).toMatch(/DE PRIMEIRA {2}0\/1 \(0%\)/);
  });

  it('sem APROVADO no dia, diz isso em vez de dividir por zero', () => {
    const raiz = criarFixture([{ id: '901' }]);
    trilha(raiz, [`${HOJE}T10:00:00-0300 901 REPROVADO motivo=x attempt=1`]);
    expect(orq(raiz, 'custo').out).toMatch(/DE PRIMEIRA {2}— {2}\(nenhum APROVADO em/);
  });

  it('trilha vazia não quebra o comando', () => {
    const raiz = criarFixture([{ id: '901' }]);
    const r = orq(raiz, 'custo');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/DE PRIMEIRA {2}—/);
  });

  it('o dia filtra: APROVADO de ontem não entra na conta de hoje', () => {
    const raiz = criarFixture([{ id: '901' }]);
    trilha(raiz, [
      `2020-01-01T10:00:00-0300 900 APROVADO merge=aguardando attempt=2`,
      `${HOJE}T10:00:00-0300 901 APROVADO merge=aguardando attempt=1`,
    ]);
    expect(orq(raiz, 'custo').out).toMatch(/DE PRIMEIRA {2}1\/1 \(100%\)/);
  });
});
