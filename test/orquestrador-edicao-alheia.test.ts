/**
 * Etapa 8b, peça 1: o commit do loop leva SÓ as chaves que o motor escreve.
 *
 * O caso real é o ba731d8 do comarka-operacional (18/10/2026 07:39). O
 * autocommit "fila: status automatico do loop" levou, junto com o
 * pendente→done, uma edição que não era do loop: o `objetivo` do 1361 e o
 * `cmd` de um critério no 1371 e no 1377. O commit saiu sem trailer.
 *
 * O kit tinha o mesmo defeito em duas portas:
 * - `autocommit_status_fila` (local-loop.sh), que fazia `git add` do arquivo inteiro;
 * - `ticket_commit` (lib.sh), que é a via principal: cada transição de status
 *   commita o ticket na hora (executor.sh `fila: <id> tentativa N`).
 *
 * Fixtures em test/fixtures/edicao-alheia-8b/: `<ticket>.head.md` é o arquivo
 * em ba731d8^ (c8d5900) e `<ticket>.wt.md` é o arquivo em ba731d8, ou seja, o
 * working tree que o autocommit encontrou.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, bashNoFixture, criarFixture } from './fixtures/orq-harness.js';

const FX = join(import.meta.dirname, 'fixtures', 'edicao-alheia-8b');
const TICKETS = ['1361-guarda-ferramenta-no-vitest', '1371-ia-claude-modelos-5-sql', '1377-rag-chunks-vector-1024-sql'];
const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');

function git(raiz: string, ...args: string[]): string {
  const r = spawnSync('git', ['-C', raiz, ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout;
}

/** O primeiro bloco ```json do ticket, parseado. */
function bloco(md: string): Record<string, unknown> {
  const m = /```json\n([\s\S]*?)\n```/.exec(md);
  if (!m) throw new Error('sem bloco json');
  return JSON.parse(m[1]!);
}

/** Repo git com os tickets na versão `head` commitada na main. */
function repoComTickets(nomes = TICKETS): string {
  const raiz = criarFixture();
  for (const t of nomes) copyFileSync(join(FX, `${t}.head.md`), join(raiz, 'docs', 'fila', `${t}.md`));
  writeFileSync(join(raiz, '.gitignore'), 'docs/fila/runs/\nnode_modules/\n');
  git(raiz, 'init', '-q', '-b', 'main');
  git(raiz, 'config', 'user.email', 'fixture@example.invalid');
  git(raiz, 'config', 'user.name', 'fixture');
  git(raiz, 'config', 'commit.gpgsign', 'false');
  git(raiz, 'add', '-A');
  git(raiz, 'commit', '-q', '-m', 'fixture: tickets em ba731d8^');
  return raiz;
}

const naHead = (raiz: string, t: string) => git(raiz, 'show', `HEAD:docs/fila/${t}.md`);
const noWt = (raiz: string, t: string) => readFileSync(join(raiz, 'docs', 'fila', `${t}.md`), 'utf8');
const eventos = (raiz: string) => {
  const f = join(raiz, 'docs', 'fila', 'runs', 'events.log');
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
};
const corpo = (raiz: string) => git(raiz, 'log', '-1', '--format=%B');

describe('autocommit do fim da drenagem com os tickets reais do ba731d8', () => {
  function rodaAutocommit(): string {
    const raiz = repoComTickets();
    for (const t of TICKETS) copyFileSync(join(FX, `${t}.wt.md`), join(raiz, 'docs', 'fila', `${t}.md`));
    const r = bashNoFixture(raiz, `LOCAL_LOOP_SOURCED=1 source "${LOOP}"; set +e; autocommit_status_fila`, { ORQ_TESTE: '1' });
    expect(r.rc, r.stderr).toBe(0);
    return raiz;
  }

  it('o status e a nota do loop entram; o objetivo e os cmd alheios ficam fora do commit', () => {
    const raiz = rodaAutocommit();
    for (const t of TICKETS) {
      const head = bloco(naHead(raiz, t));
      const antes = bloco(readFileSync(join(FX, `${t}.head.md`), 'utf8'));
      const wt = bloco(readFileSync(join(FX, `${t}.wt.md`), 'utf8'));
      expect(head.status, t).toBe('done');
      expect(head.notas_status, t).toBe(wt.notas_status);
      expect(head.objetivo, t).toBe(antes.objetivo);
      expect(head.criterios_aceite, t).toEqual(antes.criterios_aceite);
    }
  });

  it('a edição alheia continua no working tree, sem commit e sem nada no índice', () => {
    const raiz = rodaAutocommit();
    expect(bloco(noWt(raiz, TICKETS[0]!)).objetivo).toContain('MONTADO POR CONCATENACAO');
    const st = git(raiz, 'status', '--porcelain', '--', 'docs/fila');
    for (const t of TICKETS) expect(st).toContain(` M docs/fila/${t}.md`);
    expect(st).not.toMatch(/^M/m);
  });

  it('EDICAO_ALHEIA na trilha, uma por ticket, com os campos alheios', () => {
    const ev = eventos(rodaAutocommit());
    expect(ev).toMatch(/ 1361 EDICAO_ALHEIA .*campos=objetivo/);
    expect(ev).toMatch(/ 1371 EDICAO_ALHEIA .*campos=criterios_aceite/);
    expect(ev).toMatch(/ 1377 EDICAO_ALHEIA .*campos=criterios_aceite/);
    expect(ev.match(/EDICAO_ALHEIA/g)).toHaveLength(3);
  });

  it('o commit do loop leva o trailer Orq-Loop de cada ticket', () => {
    const msg = corpo(rodaAutocommit());
    for (const id of ['1361', '1371', '1377']) expect(msg).toMatch(new RegExp(`^Orq-Loop: ${id}$`, 'm'));
  });
});

describe('ticket_commit, a porta principal de escrita do kit', () => {
  const T = TICKETS[0]!;

  /** HEAD = 1361 antes; working tree = objetivo alheio (o do ba731d8) + a tentativa do motor. */
  function comEdicaoAlheia(): { raiz: string; arq: string } {
    const raiz = repoComTickets([T]);
    const arq = join(raiz, 'docs', 'fila', `${T}.md`);
    copyFileSync(join(FX, `${T}.wt.md`), arq);
    // o working tree do ba731d8 já traz o done; volta o status ao da HEAD para medir só a tentativa
    const r = bashNoFixture(raiz, `ticket_set "${arq}" '.status = "pendente" | .notas_status = ""'`, { ORQ_TESTE: '1' });
    expect(r.rc, r.stderr).toBe(0);
    return { raiz, arq };
  }

  it('a tentativa do motor entra; o objetivo alheio fica no working tree', () => {
    const { raiz, arq } = comEdicaoAlheia();
    const r = bashNoFixture(raiz, `ticket_set_tentativas "${arq}" 1; ticket_commit "${arq}" "fila: 1361 tentativa 1"`, { ORQ_TESTE: '1' });
    expect(r.rc, r.stderr).toBe(0);
    const head = bloco(naHead(raiz, T));
    expect(head.tentativas).toBe(1);
    expect(head.objetivo).toBe(bloco(readFileSync(join(FX, `${T}.head.md`), 'utf8')).objetivo);
    expect(bloco(noWt(raiz, T)).objetivo).toContain('MONTADO POR CONCATENACAO');
    expect(git(raiz, 'log', '-1', '--format=%s')).toBe('fila: 1361 tentativa 1\n');
    expect(corpo(raiz)).toMatch(/^Orq-Loop: 1361$/m);
    expect(eventos(raiz)).toMatch(/ 1361 EDICAO_ALHEIA .*campos=objetivo/);
  });

  it('um aviso por arquivo: a segunda escrita com a mesma edição alheia não repete o evento', () => {
    const { raiz, arq } = comEdicaoAlheia();
    const r = bashNoFixture(
      raiz,
      `ticket_set_tentativas "${arq}" 1; ticket_commit "${arq}" "fila: 1361 tentativa 1"; ticket_set_tentativas "${arq}" 2; ticket_commit "${arq}" "fila: 1361 tentativa 2"`,
      { ORQ_TESTE: '1' },
    );
    expect(r.rc, r.stderr).toBe(0);
    expect(bloco(naHead(raiz, T)).tentativas).toBe(2);
    expect(eventos(raiz).match(/EDICAO_ALHEIA/g)).toHaveLength(1);
  });

  it('edição alheia só na prosa também fica fora', () => {
    const raiz = repoComTickets([T]);
    const arq = join(raiz, 'docs', 'fila', `${T}.md`);
    writeFileSync(arq, `${readFileSync(arq, 'utf8')}\nnota humana no fim da prosa\n`);
    const r = bashNoFixture(raiz, `ticket_set_status "${arq}" bloqueado; ticket_commit "${arq}" "fila: 1361 bloqueado"`, { ORQ_TESTE: '1' });
    expect(r.rc, r.stderr).toBe(0);
    expect(bloco(naHead(raiz, T)).status).toBe('bloqueado');
    expect(naHead(raiz, T)).not.toContain('nota humana');
    expect(noWt(raiz, T)).toContain('nota humana');
    expect(eventos(raiz)).toMatch(/ 1361 EDICAO_ALHEIA .*campos=prosa/);
  });

  it('sem edição alheia o commit é o arquivo do working tree, como antes, e não há evento', () => {
    const raiz = repoComTickets([T]);
    const arq = join(raiz, 'docs', 'fila', `${T}.md`);
    const r = bashNoFixture(raiz, `ticket_set_tentativas "${arq}" 1; ticket_commit "${arq}" "fila: 1361 tentativa 1"`, { ORQ_TESTE: '1' });
    expect(r.rc, r.stderr).toBe(0);
    expect(naHead(raiz, T)).toBe(noWt(raiz, T));
    expect(git(raiz, 'status', '--porcelain', '--', 'docs/fila')).toBe('');
    expect(eventos(raiz)).not.toContain('EDICAO_ALHEIA');
    expect(corpo(raiz)).toMatch(/^Orq-Loop: 1361$/m);
  });
});

describe('uma lista só dos campos do motor', () => {
  it('o resolvedor usa a mesma lista do lib.sh (e ela tem adiado_ate)', async () => {
    const { CAMPOS_DO_MOTOR } = await import('../scripts/orquestrador/resolvedor/desfecho.js');
    const lista = JSON.parse(readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'campos-do-motor.json'), 'utf8'));
    expect([...CAMPOS_DO_MOTOR]).toEqual(lista);
    expect(lista).toContain('adiado_ate');
  });
});
