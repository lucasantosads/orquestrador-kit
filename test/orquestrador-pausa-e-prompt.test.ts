/**
 * Peça 4 — kill switch (regra 12) e ponteiro de doutrina do executor (regra 18).
 *
 * O kill switch é a única forma segura de parar o loop: `kill -9` garante ticket
 * órfão e cota desperdiçada (Ciclo de vida, na SKILL). Por isso o teste cobra
 * duas coisas: que a drenagem PARE, e que ela não toque em ticket nenhum ao parar.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
const EXEC = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const runs = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);
const PAUSAR = (raiz: string) => join(raiz, 'docs', 'fila', 'PAUSAR');

const FILA = [
  { id: '901', slug: 'da-vez', status: 'pendente', frente: 'B2-F3' },
  { id: '902', slug: 'depois', status: 'pendente', frente: 'B2-F3' },
];

function bash(raiz: string, corpo: string) {
  const r = spawnSync('bash', ['-c', corpo], {
    encoding: 'utf8',
    cwd: raiz,
    env: { ...process.env, ORQ_EXEC_ROOT: raiz },
  });
  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

/** Roda a drenagem inteira (main_local_loop) no fixture. */
function drenagem(raiz: string) {
  const r = bash(raiz, `bash "${LOOP}"`);
  return { ...r, log: ler(runs(raiz, 'local-loop.log')) };
}

/** Roda só drenar(), com o que depende de git substituído por stub. */
function drenarComStub(raiz: string, stubExecutor: string) {
  return bash(
    raiz,
    [
      'export LOCAL_LOOP_SOURCED=1',
      `source "${LOOP}"`,
      'set +e',
      'ensure_staging_worktree() { echo "/tmp"; }',
      'merge_em_alvo() { return 1; }',
      'cleanup_frente() { return 0; }',
      `run_executor_once() { ${stubExecutor}; }`,
      'drenar',
    ].join('\n'),
  );
}

// ─── PAUSAR no início da drenagem ─────────────────────────────────────────

describe('pausar_file presente encerra a drenagem em ocioso, sem erro', () => {
  it('sai 0 (pausa não é falha)', () => {
    const raiz = criarFixture(FILA);
    escrever(PAUSAR(raiz), '2026-09-03 01:00 | promoção manual\n');
    expect(drenagem(raiz).rc).toBe(0);
  });

  it('o log nomeia a pausa e o motivo registrado', () => {
    const raiz = criarFixture(FILA);
    escrever(PAUSAR(raiz), '2026-09-03 01:00 | promoção manual\n');
    const { log } = drenagem(raiz);
    expect(log).toMatch(/PAUSA ativa: .*promoção manual/);
    expect(log).toMatch(/sem tocar ticket nenhum/);
  });

  it('STATUS.md fica ocioso com MOTIVO pausado', () => {
    const raiz = criarFixture(FILA);
    escrever(PAUSAR(raiz), 'pausa\n');
    drenagem(raiz);
    const md = ler(runs(raiz, 'STATUS.md'));
    expect(md).toContain('ESTADO   ocioso');
    expect(md).toContain('MOTIVO   pausado');
    expect(md).toContain('TICKET   —');
  });

  it('a trilha registra a drenagem pausada, com par início/fim', () => {
    const raiz = criarFixture(FILA);
    escrever(PAUSAR(raiz), 'pausa\n');
    drenagem(raiz);
    const ev = ler(runs(raiz, 'events.log'));
    expect(ev).toMatch(/DRENAGEM_INICIO .*motivo=pausado/);
    expect(ev).toMatch(/DRENAGEM_FIM .*motivo=pausado/);
  });

  it('NENHUM ticket é tocado (nem pelo reconcile)', () => {
    const raiz = criarFixture(FILA);
    const antes = FILA.map((t) => ler(join(raiz, 'docs', 'fila', `${t.id}-${t.slug}.md`)));
    escrever(PAUSAR(raiz), 'pausa\n');
    drenagem(raiz);
    const depois = FILA.map((t) => ler(join(raiz, 'docs', 'fila', `${t.id}-${t.slug}.md`)));
    expect(depois).toEqual(antes);
  });

  it('sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro)', () => {
    const raiz = criarFixture(FILA);
    const { log } = drenagem(raiz);
    expect(log).not.toMatch(/PAUSA ativa/);
  });

  it('o sentinela legado (.orq-pause) continua pausando', () => {
    const raiz = criarFixture(FILA);
    escrever(join(raiz, 'docs', 'fila', '.orq-pause'), 'pausa v1\n');
    expect(drenagem(raiz).log).toMatch(/PAUSA ativa: .*pausa v1/);
  });

  it('o caminho vem do config (pausar_file), não hardcoded', () => {
    const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
    expect(cfg.pausar_file).toBe('docs/fila/PAUSAR');
    const lib = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh'), 'utf8');
    expect(lib).toMatch(/CFG_PAUSAR_FILE=.*cfg '\.pausar_file'/);
  });
});

// ─── PAUSAR entre tickets ─────────────────────────────────────────────────

describe('pausar_file criado no meio: a drenagem para ENTRE tickets', () => {
  it('o ticket em curso termina; o seguinte não começa', () => {
    const raiz = criarFixture(FILA);
    // O stub imita um humano pausando enquanto o 901 rodava: o ticket em curso
    // chega ao fim (vira done) e o arquivo aparece antes da próxima volta.
    const r = drenarComStub(
      raiz,
      [
        'local f="$2"',
        'ticket_set_status "$f" done',
        `printf 'pausa no meio\\n' > "${PAUSAR(raiz)}"`,
        'return 0',
      ].join('; '),
    );
    expect(r.rc).toBe(0);
    expect(r.out + r.err).toMatch(/PAUSA ativa/);
    // 901 progrediu (done); 902 não foi tocado.
    expect(ler(join(raiz, 'docs', 'fila', '901-da-vez.md'))).toContain('"status": "done"');
    expect(ler(join(raiz, 'docs', 'fila', '902-depois.md'))).toContain('"status": "pendente"');
  });

  it('encerra em ocioso com MOTIVO pausado, não em erro', () => {
    const raiz = criarFixture(FILA);
    drenarComStub(
      raiz,
      ['local f="$2"', 'ticket_set_status "$f" done', `printf 'x\\n' > "${PAUSAR(raiz)}"`, 'return 0'].join('; '),
    );
    expect(ler(runs(raiz, 'STATUS.md'))).toContain('MOTIVO   pausado');
    expect(ler(runs(raiz, 'events.log'))).toMatch(/DRENAGEM_FIM aprovados=/);
  });

  it('nunca mata processo: o harness não tem kill do agente', () => {
    const loop = readFileSync(LOOP, 'utf8');
    expect(loop).not.toMatch(/\bpkill\b|\bkillall\b/);
    // O único kill do harness é o watchdog de timeout do claude_run, em lib.sh.
    expect(loop).not.toMatch(/^\s*kill\b/m);
  });
});

// ─── Ponteiro de doutrina do executor ─────────────────────────────────────

/** Monta o prompt real de um ticket, chamando build_prompt do executor.sh. */
function prompt(raiz: string): string {
  const ticket = join(raiz, 'docs', 'fila', '901-da-vez.md');
  const r = bash(
    raiz,
    [
      'export EXECUTOR_SOURCED=1',
      `source "${EXEC}"`,
      'set +e',
      `build_prompt "${ticket}" ""`,
    ].join('\n'),
  );
  return r.out;
}

describe('o executor aponta para EXECUTOR.md, não para a SKILL.md', () => {
  const comSkill = (raiz: string) => {
    escrever(join(raiz, 'docs', 'orquestrador', 'skill', 'EXECUTOR.md'), '# extrato\n');
    escrever(join(raiz, 'docs', 'orquestrador', 'skill', 'SKILL.md'), '# doutrina inteira\n');
  };

  it('o prompt cita docs/orquestrador/skill/EXECUTOR.md', () => {
    const raiz = criarFixture(FILA);
    comSkill(raiz);
    expect(prompt(raiz)).toContain('docs/orquestrador/skill/EXECUTOR.md');
  });

  it('e manda NÃO ler SKILL.md nem references/', () => {
    const raiz = criarFixture(FILA);
    comSkill(raiz);
    const p = prompt(raiz);
    expect(p).toMatch(/NÃO leia .*SKILL\.md/);
    expect(p).toMatch(/references\//);
  });

  it('não existe mais ponteiro para a SKILL como leitura recomendada', () => {
    const raiz = criarFixture(FILA);
    comSkill(raiz);
    expect(prompt(raiz)).not.toMatch(/spec do orquestrador está em/);
  });

  it('sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa)', () => {
    const raiz = criarFixture(FILA);
    escrever(join(raiz, 'docs', 'orquestrador', 'skill', 'SKILL.md'), '# doutrina\n');
    expect(prompt(raiz)).not.toContain('SKILL.md');
  });

  it('nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá', () => {
    const raiz = criarFixture(FILA);
    comSkill(raiz);
    const p = prompt(raiz);
    expect(p).toContain('TICKET 901');
    expect(p).toContain('pathspec allowlist');
    expect(p).toContain('REGRAS INVIOLÁVEIS');
    expect(p).toContain('BANCO: zero escrita');
    expect(p).toContain('git add SEMPRE por pathspec explícito');
    expect(p).toContain('ENTREGA:');
  });

  it('o EXECUTOR.md real existe e continua curto (≤ 60 linhas, cat. 8 do pré-voo)', () => {
    const f = join(REPO_ROOT, 'docs', 'orquestrador', 'skill', 'EXECUTOR.md');
    expect(existsSync(f)).toBe(true);
    expect(readFileSync(f, 'utf8').trimEnd().split('\n').length).toBeLessThanOrEqual(60);
  });
});
