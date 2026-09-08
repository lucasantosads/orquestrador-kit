/**
 * Peça 0d — script de teste nunca escreve na trilha de PRODUÇÃO.
 *
 * O buraco: `lib.sh` resolve `MAIN_CHECKOUT` por `git rev-parse --git-common-dir`,
 * então um `source lib.sh` no topo de um `test-*.sh` — rodado de qualquer
 * worktree — herda o checkout PRINCIPAL, e `event`/`status_set`/`custo_registrar`
 * disparados ali gravam na trilha real. Em 2026-09-04 isso pôs três
 * `EXECUTOR_MORREU rc=1 fase=?` (20:45, 20:47, 20:47) no `events.log` real sem
 * drenagem nenhuma por trás — evidência falsa, indistinguível de morte de
 * verdade. A versão cara do mesmo buraco já tinha sido paga: US$ 0,34 de chamada
 * do `test-preflight.sh` contra o config real (peça 10 do PLAYBOOK).
 *
 * A tranca é dupla, e as duas partes são afirmadas aqui:
 *   1. cada `test-*.sh` declara `ORQ_TESTE=1` + `ORQ_EXEC_ROOT` ANTES do source;
 *   2. `lib.sh` RECUSA escrita fora do fixture quando `ORQ_TESTE=1`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, bashNoFixture, ler, REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';

const ORQ_DIR = join(REPO_ROOT, 'scripts', 'orquestrador');
const SCRIPTS = ['test-drenagem.sh', 'test-preflight.sh', 'test-retry-worktree.sh'];

/**
 * O checkout PRINCIPAL — o dono da trilha de "produção" deste teste — é o repo
 * de fixture instanciado (peça K7). Não é maquiagem: o cenário do acidente é
 * `source lib.sh` SEM `ORQ_EXEC_ROOT`, e para o lib.sh resolver a fila (e
 * chegar vivo até a guarda) o checkout onde ele MORA precisa ter
 * `docs/fila/000-config.json`. O kit não tem fila; o fixture tem.
 *
 * A trilha real do kit continua intocada por construção: nada aqui aponta para
 * ela, e é justamente o que se afirma — a escrita é RECUSADA antes de escolher
 * destino.
 */
const FX = checkoutReal();
/** O lib.sh que mora DENTRO do fixture (a cópia vendorizada), não o do kit. */
const LIB_FX = join(FX, 'scripts', 'orquestrador', 'lib.sh');
const TRILHA_REAL = join(FX, 'docs', 'fila', 'runs', 'events.log');
const STATUS_REAL = join(FX, 'docs', 'fila', 'runs', 'STATUS.md');

/** Roda bash com lib.sh SEM ORQ_EXEC_ROOT — é o cenário do acidente. */
function bashSemFixture(corpo: string): { rc: number; saida: string } {
  const r = spawnSync('bash', ['-c', `source "${LIB_FX}"\nset +e\n${corpo}`], {
    encoding: 'utf8',
    cwd: FX,
    env: { ...process.env, ORQ_TESTE: '1', ORQ_EXEC_ROOT: '' },
  });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('ORQ_TESTE=1 recusa escrita fora do fixture', () => {
  const marca = `MARCA-0D-${process.pid}-${Date.now()}`;

  it('event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê', () => {
    const antes = ler(TRILHA_REAL);
    const { saida } = bashSemFixture(`event 999 ${marca}`);
    expect(saida).toContain('escrita RECUSADA');
    expect(saida).toContain('ORQ_TESTE=1');
    const depois = ler(TRILHA_REAL);
    expect(depois).not.toContain(marca);
    // Append-only: a trilha real pode ter CRESCIDO (o loop pode estar drenando
    // em paralelo), mas nada do que já estava lá pode ter mudado.
    expect(depois.startsWith(antes)).toBe(true);
  });

  it('status_set fora do fixture não reescreve o STATUS real', () => {
    const antes = ler(STATUS_REAL);
    const { saida } = bashSemFixture(`status_set "ultimo=${marca}"`);
    expect(saida).toContain('escrita RECUSADA');
    expect(ler(STATUS_REAL)).not.toContain(marca);
    if (antes) expect(existsSync(STATUS_REAL)).toBe(true);
  });

  it('custo_registrar fora do fixture não toca o ledger real', () => {
    const { saida } = bashSemFixture(
      `printf '{"total_cost_usd":9.99}\\n' > /tmp/${marca}.json; custo_registrar executor 999 0 /tmp/${marca}.json; rm -f /tmp/${marca}.json`,
    );
    expect(saida).toContain('escrita RECUSADA');
  });

  it('DENTRO do fixture a mesma chamada grava normalmente — a guarda não cega o teste', () => {
    const fx = criarFixture([]);
    const r = bashNoFixture(fx, `event 901 ${marca} k=v`, { ORQ_TESTE: '1' });
    expect(r.stderr).not.toContain('escrita RECUSADA');
    expect(ler(join(fx, 'docs', 'fila', 'runs', 'events.log'))).toContain(marca);
  });

  it('sem ORQ_TESTE a produção escreve como sempre (a guarda só vale para teste)', () => {
    const fx = criarFixture([]);
    const r = bashNoFixture(fx, `event 901 SEM_MARCA_DE_TESTE`);
    expect(r.stderr).not.toContain('escrita RECUSADA');
    expect(ler(join(fx, 'docs', 'fila', 'runs', 'events.log'))).toContain('SEM_MARCA_DE_TESTE');
  });
});

describe('anotacao: o harness registra NA trilha o que sabe SOBRE a trilha', () => {
  it('vira um evento ANOTACAO, sem apagar nem reescrever nada', () => {
    const fx = criarFixture([]);
    bashNoFixture(fx, `event 901 INICIO attempt=1\nanotacao "os EXECUTOR_MORREU de 20:47 vieram de script de teste"`, {
      ORQ_TESTE: '1',
    });
    const trilha = ler(join(fx, 'docs', 'fila', 'runs', 'events.log'));
    const linhas = trilha.trim().split('\n');
    expect(linhas).toHaveLength(2);
    expect(linhas[0]).toContain('901 INICIO attempt=1');
    expect(linhas[1]).toMatch(/--- ANOTACAO nota=os EXECUTOR_MORREU de 20:47 vieram de script de teste/);
  });
});

describe('cada test-*.sh declara o isolamento ANTES de carregar o lib', () => {
  for (const nome of SCRIPTS) {
    it(`${nome}: ORQ_TESTE e ORQ_EXEC_ROOT vêm antes do source`, () => {
      const src = readFileSync(join(ORQ_DIR, nome), 'utf8').split('\n');
      const linhaDe = (re: RegExp) => src.findIndex((l) => re.test(l));
      const teste = linhaDe(/^export ORQ_TESTE=1/);
      const raiz = linhaDe(/^ORQ_EXEC_ROOT="\$\(mktemp -d\)/);
      const source = linhaDe(/^source "\$AQUI\//);
      expect(teste).toBeGreaterThan(-1);
      expect(raiz).toBeGreaterThan(-1);
      expect(source).toBeGreaterThan(-1);
      // A ordem É o contrato: ORQ_EXEC_ROOT depois do source não adianta nada,
      // porque RUNS_BASE já foi resolvido na hora do source.
      expect(teste).toBeLessThan(source);
      expect(raiz).toBeLessThan(source);
    });
  }
});

describe('o test-*.sh rodando de verdade não deixa marca na trilha real', () => {
  it('test-drenagem.sh: fixture recebe os eventos, produção não recebe nada', () => {
    const antes = ler(TRILHA_REAL);
    // A cópia do FIXTURE, não a do kit: o script resolve `CHECKOUT_REAL` a
    // partir do diretório dele (`$AQUI/../..`, test-drenagem.sh:22) e de lá
    // copia `docs/fila/000-config.json`. Rodando a do kit, não há o que copiar.
    const r = spawnSync('bash', [join(FX, 'scripts', 'orquestrador', 'test-drenagem.sh')], {
      encoding: 'utf8',
      cwd: FX,
    });
    expect(r.status).toBe(0);
    const depois = ler(TRILHA_REAL);
    // Append-only preservado, e o delta (se o loop drenou em paralelo) não tem
    // NADA deste teste: os tickets do fixture são 901/902 e o merge é o 000.
    expect(depois.startsWith(antes)).toBe(true);
    const delta = depois.slice(antes.length);
    expect(delta).not.toMatch(/ 90[12] /);
    expect(delta).not.toMatch(/ 000 /);
  }, 180_000);
});
