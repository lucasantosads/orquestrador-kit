/**
 * Peça 11 — o disparo do launchd deixa de ficar refém de um STATUS congelado.
 *
 * Evidência: STATUS congelado em `executando` desde 06/09 12:38 bloqueou 22 h de
 * disparos do launchd, todos com exit 0. O snapshot dizia `executando` o tempo
 * inteiro e nada estava rodando — a única coisa viva ali era o campo `estado`.
 *
 * A peça é a ORDEM: a checagem de staleness (`DESDE` além de
 * `claude_timeout_secs` ⇒ processo morto ⇒ recupera e segue) vem ANTES de
 * decidir "já há drenagem em curso". O caso que prova isso é o que tem as duas
 * condições verdadeiras ao mesmo tempo.
 *
 * E a guarda por processo é POR REPO: a pergunta vai ao lockfile de `runs/`,
 * nunca a um `pgrep -f local-loop` global — dois orquestradores na mesma máquina
 * são operação normal.
 */
import { describe, it, expect } from 'vitest';
import { writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, bashNoFixture, ler, orq, REPO_ROOT } from './fixtures/orq-harness.js';

const LAUNCHD = join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh');
const TIMEOUT = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
).claude_timeout_secs as number;

const agora = () => Math.floor(Date.now() / 1000);
const runs = (fx: string) => join(fx, 'docs', 'fila', 'runs');

/** Escreve o snapshot como o loop o escreveria, com o DESDE que o caso pede. */
function comStatus(fx: string, estado: string, desdeEpoch: number) {
  const desde = new Date(desdeEpoch * 1000).toTimeString().slice(0, 8);
  bashNoFixture(
    fx,
    `status_set "estado=${estado}" "ticket=240 finalizar · tentativa 1/3" "desde=${desde}" "desde_epoch=${desdeEpoch}" "fase=agente"`,
    { ORQ_TESTE: '1' },
  );
}

/** Lockfile do loop DESTE repo: linha 1 = pid, linha 2 = epoch. */
function comLock(fx: string, pid: number) {
  writeFileSync(join(runs(fx), '.local-loop.lock'), `${pid}\n${agora()}\n`);
}

/** Um pid que já morreu — o processo terminou antes de a asserção rodar. */
function pidMorto(): number {
  const r = spawnSync('bash', ['-c', 'echo $$'], { encoding: 'utf8' });
  return parseInt((r.stdout ?? '').trim(), 10);
}

function decidir(fx: string): { decisao: string; erro: string } {
  const r = spawnSync(
    'bash',
    ['-c', `export LAUNCHD_RUN_SOURCED=1\nsource "${LAUNCHD}"\nset +e\ndecidir_disparo`],
    { encoding: 'utf8', cwd: fx, env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_TESTE: '1' } },
  );
  return { decisao: (r.stdout ?? '').trim(), erro: r.stderr ?? '' };
}

describe('status_congelado_secs: a régua é o claude_timeout_secs', () => {
  it('executando DENTRO do timeout não está congelado', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - Math.floor(TIMEOUT / 2));
    expect(bashNoFixture(fx, 'status_congelado_secs', { ORQ_TESTE: '1' }).stdout).toBe('');
  });

  it('executando ALÉM do timeout está congelado, e diz há quanto tempo', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - (TIMEOUT + 3600));
    const s = parseInt(bashNoFixture(fx, 'status_congelado_secs', { ORQ_TESTE: '1' }).stdout, 10);
    expect(s).toBeGreaterThan(TIMEOUT);
  });

  it('ocioso nunca está congelado, por mais velho que seja o DESDE', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'ocioso', agora() - 22 * 3600);
    expect(bashNoFixture(fx, 'status_congelado_secs', { ORQ_TESTE: '1' }).stdout).toBe('');
  });
});

describe('a ordem: staleness ANTES de "já há drenagem em curso"', () => {
  it('STATUS congelado E lock com pid VIVO => recupera (a staleness vence)', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 22 * 3600);
    comLock(fx, process.pid); // vivo: é o processo do próprio teste
    const { decisao, erro } = decidir(fx);
    expect(decisao, erro).toBe('recupera');
  });

  it('a recuperação deixa rastro na trilha e limpa o STATUS', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 22 * 3600);
    decidir(fx);
    const trilha = ler(join(runs(fx), 'events.log'));
    expect(trilha).toMatch(/--- RECUPERADO motivo=status-congelado desde=\S+ ha=22h/);
    expect(trilha.trimEnd().split('\n')).toHaveLength(1);
    const estado = JSON.parse(readFileSync(join(runs(fx), '.status.json'), 'utf8'));
    expect(estado.estado).toBe('ocioso');
    expect(estado.motivo).toContain('morto');
    // E o snapshot legível para humano acompanha.
    expect(ler(join(runs(fx), 'STATUS.md'))).toContain('ESTADO   ocioso');
  });

  it('STATUS são + lock com pid vivo => em-curso (a guarda continua valendo)', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 60);
    comLock(fx, process.pid);
    expect(decidir(fx).decisao).toBe('em-curso');
  });

  it('lock com pid MORTO não segura disparo nenhum => segue', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 60);
    comLock(fx, pidMorto());
    expect(decidir(fx).decisao).toBe('segue');
  });

  it('sem lock e sem STATUS congelado => segue', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'ocioso', agora() - 300);
    expect(decidir(fx).decisao).toBe('segue');
  });

  it('em-curso NÃO escreve na trilha: não houve o que recuperar', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 60);
    comLock(fx, process.pid);
    decidir(fx);
    expect(ler(join(runs(fx), 'events.log'))).toBe('');
  });
});

describe('a guarda por processo é POR REPO', () => {
  const src = readFileSync(LAUNCHD, 'utf8');

  it('pergunta ao lockfile de runs/, não a um pgrep global', () => {
    expect(src).toContain('LOCK="$RUNS_BASE/.local-loop.lock"');
    expect(src).toMatch(/kill -0 "\$pid"/);
    // O comentário PODE citar o pgrep (é o que a peça recusa); o código não.
    const codigo = src.split('\n').filter((l) => !/^\s*#/.test(l)).join('\n');
    expect(codigo).not.toMatch(/pgrep/);
  });

  it('o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste', () => {
    const outro = criarFixture([]);
    comLock(outro, process.pid);
    const fx = criarFixture([]); // sem lock nenhum
    comStatus(fx, 'executando', agora() - 60);
    expect(decidir(fx).decisao).toBe('segue');
    expect(existsSync(join(runs(outro), '.local-loop.lock'))).toBe(true);
  });
});

describe('orq mostra MORTO, não executando', () => {
  it('com o STATUS congelado, o snapshot diz MORTO e há quanto tempo', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 22 * 3600);
    const r = orq(fx);
    expect(r.out).toContain('MORTO há 22h');
    expect(r.out).not.toMatch(/^ESTADO {3}executando/m);
    // READ-ONLY: o arquivo em disco continua como o loop o deixou.
    expect(ler(join(runs(fx), 'STATUS.md'))).toContain('ESTADO   executando');
  });

  it('com o STATUS são, mostra o que sempre mostrou', () => {
    const fx = criarFixture([]);
    comStatus(fx, 'executando', agora() - 60);
    const r = orq(fx);
    expect(r.out).toMatch(/^ESTADO {3}executando/m);
    expect(r.out).not.toContain('MORTO');
  });
});
