/**
 * Ticket 626 (harness manual, 23/09/2026) — marcação e execução dos gates leem
 * o MESMO config: o da main.
 *
 * Causa (auditoria de 22/09): o 499 teve `typecheck=nao-rodou` na trilha com
 * `ok   typecheck` no gates.txt do mesmo attempt. O tsc rodou; quem errou foi a
 * marcação: `papel_marca` lia o config da MAIN (que declara typecheck +
 * typecheck_scripts) e o `gates.ts` executava o da WORKTREE (só typecheck). O
 * gate declarado só na main sumia do gates.txt e derrubava o papel inteiro
 * para nao-rodou — desde c866e66, 21 de 21 linhas GATE sem typecheck=ok.
 *
 * Regras:
 *   (a) gates.ts executa na worktree mas lê o config passado em --config (o da
 *       main); sem --config falha alto, nunca cai no da worktree;
 *   (b) papel = falha se algum rodou e falhou; ok se ao menos um rodou e todos
 *       os que rodaram passaram; nao-rodou só se nenhum do papel rodou;
 *   (c) os ausentes vão para gates_ausentes=<nomes> na linha GATE (só quando
 *       há ausente) e para o STATUS.md, numa linha que só existe quando não
 *       está vazia.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { configDeReferencia, criarFixture, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const GATES_TS = join(REPO_ROOT, 'scripts', 'orquestrador', 'gates.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

interface Gate {
  nome: string;
  cmd: string;
  tipo: string;
  papel?: string;
}

function comGates(gates: Gate[]): string {
  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & {
    _execucao_dos_gates: Record<string, unknown>;
  };
  cfg.gates = gates;
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: gates.map((g) => g.nome) };
  return JSON.stringify(cfg, null, 2);
}

const TYPECHECK: Gate = { nome: 'typecheck', cmd: 'true', tipo: 'exit', papel: 'typecheck' };
const TYPECHECK_SCRIPTS: Gate = { nome: 'typecheck_scripts', cmd: 'true', tipo: 'exit', papel: 'typecheck' };
const TESTES: Gate = { nome: 'testes', cmd: 'true', tipo: 'exit', papel: 'testes' };
const BUILD: Gate = { nome: 'build', cmd: 'true', tipo: 'exit', papel: 'build' };

/** Checkout de fixture (fora de git) cujo config — o "da main" — tem estes gates. */
function checkout(gates: Gate[]): string {
  const fx = criarFixture([]);
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), comGates(gates));
  return fx;
}

/** Roda uma função do executor (sourced) no fixture. */
function noExecutor(fx: string, corpo: string): string {
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}"`,
    'set +e',
    corpo,
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

/** Última linha GATE da trilha do fixture. */
function linhaGate(fx: string): string {
  const ev = readFileSync(join(fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8').split('\n');
  const l = ev.filter((x) => / GATE /.test(x)).pop() ?? '';
  // Tira o carimbo de hora: o resto da linha é o que se compara.
  return l.replace(/^\S+ /, '');
}

/** event_gate sobre um gates.txt dado, com o critério verde. */
function gateCom(fx: string, gatesTxt: string): string {
  const rundir = join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0');
  mkdirSync(rundir, { recursive: true });
  writeFileSync(join(rundir, 'gates.txt'), gatesTxt);
  const log = noExecutor(fx, `CRITERIOS_TOTAL=1; CRITERIOS_FALHOS=""; event_gate 901 "${rundir}" 1`);
  const l = linhaGate(fx);
  expect(l, log).not.toBe('');
  return l;
}

const statusMd = (fx: string) => readFileSync(join(fx, 'docs', 'fila', 'runs', 'STATUS.md'), 'utf8');

describe('626 (a): gates.ts executa na worktree e lê o config da main', () => {
  it('config da main com typecheck + typecheck_scripts e worktree só com typecheck: os DOIS rodam; a linha GATE sai typecheck=ok', () => {
    const fx = checkout([TYPECHECK, TYPECHECK_SCRIPTS, TESTES, BUILD]);
    const wt = join(fx, 'wt');
    mkdirSync(join(wt, 'docs', 'fila'), { recursive: true });
    // O config DA WORKTREE só conhece typecheck — é o do staging-auto antigo.
    writeFileSync(join(wt, 'docs', 'fila', '000-config.json'), comGates([TYPECHECK, TESTES, BUILD]));
    const r = spawnSync(
      TSX,
      [GATES_TS, '--run-cli', wt, '--config', join(fx, 'docs', 'fila', '000-config.json')],
      { encoding: 'utf8', cwd: wt },
    );
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
    expect(r.stdout).toMatch(/^ok +typecheck /m);
    expect(r.stdout).toMatch(/^ok +typecheck_scripts /m);
    const l = gateCom(fx, r.stdout);
    expect(l).toContain('typecheck=ok');
    expect(l).not.toContain('gates_ausentes=');
  });

  it('sem --config o gates.ts falha alto: nunca cai no config da worktree', () => {
    const fx = checkout([TYPECHECK]);
    const wt = join(fx, 'wt');
    mkdirSync(join(wt, 'docs', 'fila'), { recursive: true });
    writeFileSync(join(wt, 'docs', 'fila', '000-config.json'), comGates([TYPECHECK]));
    const r = spawnSync(TSX, [GATES_TS, '--run-cli', wt], { encoding: 'utf8', cwd: wt });
    expect(r.status).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/--config/);
    expect(r.stdout).not.toMatch(/^ok +typecheck/m);
  });
});

describe('626 (b-e): a marcação do papel e os ausentes', () => {
  it('(b) typecheck ok e typecheck_scripts ausente do gates.txt: typecheck=ok e gates_ausentes=typecheck_scripts na linha GATE e no STATUS.md', () => {
    const fx = checkout([TYPECHECK, TYPECHECK_SCRIPTS, TESTES, BUILD]);
    const l = gateCom(fx, 'ok   typecheck 10ms\nok   testes 10ms\nok   build 10ms\nVEREDITO: APROVADO\n');
    expect(l).toContain('typecheck=ok');
    expect(l).toContain('gates_ausentes=typecheck_scripts');
    expect(statusMd(fx)).toMatch(/^GATES +ausentes: typecheck_scripts$/m);
  });

  it('(c) gate que rodou e falhou continua dando falha, mesmo com o outro do papel ok', () => {
    const fx = checkout([TYPECHECK, TYPECHECK_SCRIPTS, TESTES, BUILD]);
    const l = gateCom(
      fx,
      'FALHA typecheck 10ms — 3 erros\nok   typecheck_scripts 10ms\nok   testes 10ms\nok   build 10ms\n',
    );
    expect(l).toContain('typecheck=falha');
  });

  it('(d) papel sem nenhum gate executado continua nao-rodou', () => {
    const fx = checkout([TYPECHECK, TYPECHECK_SCRIPTS, TESTES, BUILD]);
    const l = gateCom(fx, 'ok   testes 10ms\nok   build 10ms\n');
    expect(l).toContain('typecheck=nao-rodou');
    expect(l).toContain('gates_ausentes=typecheck,typecheck_scripts');
  });

  it('(e) sem ausentes a linha GATE é byte a byte a de hoje, com typecheck=ok testes=ok build=ok', () => {
    const fx = checkout([TYPECHECK, TESTES, BUILD]);
    const l = gateCom(fx, 'ok   typecheck 10ms\nok   testes 10ms\nok   build 10ms\n');
    expect(l).toBe('901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=ok');
  });
});

describe('626: gates_ausentes no STATUS.md', () => {
  it('STATUS.md: status_set com gates_ausentes preenchido imprime a linha', () => {
    const fx = checkout([TYPECHECK]);
    const log = noExecutor(fx, 'status_set estado=executando ticket=901 gates_ausentes=typecheck_scripts,build');
    expect(existsSync(join(fx, 'docs', 'fila', 'runs', 'STATUS.md')), log).toBe(true);
    expect(statusMd(fx)).toMatch(/^GATES +ausentes: typecheck_scripts,build$/m);
  });

  it('STATUS.md: gates_ausentes vazio não imprime a linha, e ESTADO e TICKET continuam no mesmo render', () => {
    const fx = checkout([TYPECHECK]);
    noExecutor(fx, 'status_set estado=executando ticket=901 gates_ausentes=x; status_set gates_ausentes=');
    const md = statusMd(fx);
    expect(md).not.toMatch(/^GATES /m);
    expect(md).toMatch(/^ESTADO +executando$/m);
    expect(md).toMatch(/^TICKET +901$/m);
  });
});
