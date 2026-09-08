/**
 * Fixture de harness do orquestrador: um checkout FALSO, fora de git, para os
 * testes de lib.sh / local-loop.sh / scripts/orq.
 *
 * Por que fora de git: lib.sh resolve MAIN_CHECKOUT por
 * `git rev-parse --git-common-dir` e cai em ROOT só quando o diretório NÃO é
 * repositório. Rodar os testes contra um dir versionado faria o lib.sh ler (e,
 * nos casos de escrita, MEXER em) docs/fila do checkout principal — que é a
 * fonte única da fila real. O fixture é sempre um dir temporário puro.
 */
import { afterAll } from 'vitest';
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export const REPO_ROOT = join(import.meta.dirname, '..', '..');
export const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');

/**
 * Checkout MÍNIMO de fixture: o análogo, dentro do kit, do repo instalado que o
 * motor espera encontrar (docs/fila/000-config.json, liberacoes.json). O kit não
 * tem fila própria — ela é do repo alvo —, então tudo que o motor leria de
 * `docs/fila` do checkout, os testes leem daqui.
 */
export const FX_CHECKOUT = join(import.meta.dirname, 'checkout');

// ─── Checkout REAL de fixture (peça K7) ───────────────────────────────────
// FX_CHECKOUT acima é o checkout de PAPEL: uma fila e um config, fora de git,
// que basta para os testes que só leem `docs/fila`. O que segue é outra coisa:
// um repo INSTANCIADO por `scripts/kit/fixture.sh` — git de verdade, branch
// alvo, node_modules, e a cópia VENDORIZADA do motor dentro dele.
//
// Por que precisa existir: `lib.sh` resolve a fila pelo diretório onde o
// PRÓPRIO lib.sh mora (`ROOT="${ORQ_EXEC_ROOT:-$(cd "$ORQ_LIB_DIR/../.." && pwd)}"`,
// lib.sh:24, e `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, lib.sh:42). Rodar o motor
// a partir de `<kit>/scripts/orquestrador/` faz o KIT ser o checkout — e o kit
// não tem fila. Rodá-lo a partir de `<fixture>/scripts/orquestrador/` faz o
// fixture ser o checkout, que é o cenário de verdade. Era essa a causa única
// das 8 quarentenas da K3.
//
// Custo: uma instanciação por ARQUIVO de teste (o cache é de módulo, e o vitest
// dá um registro de módulos por arquivo). Remoção no `afterAll` do arquivo.

let checkoutRealCache: string | null = null;

/**
 * Instancia o repo de fixture e devolve o caminho. Uma vez por arquivo de
 * teste; o `afterAll` de remoção é registrado na primeira chamada.
 *
 * Chame no TOPO do arquivo de teste (fora de `describe`/`it`): é lá que o
 * `afterAll` da raiz da suíte está disponível, e é lá que a instanciação
 * acontece uma vez só em vez de uma por caso.
 */
export function checkoutReal(): string {
  if (checkoutRealCache) return checkoutRealCache;
  const script = join(REPO_ROOT, 'scripts', 'kit', 'fixture.sh');
  const r = spawnSync('bash', [script], { encoding: 'utf8' });
  if (r.status !== 0) {
    throw new Error(`fixture.sh saiu ${r.status}:\n${r.stdout ?? ''}${r.stderr ?? ''}`);
  }
  // CONTRATO: a última linha do stdout é o caminho, e nada mais. Todo o log do
  // instanciador vai para stderr justamente para esta linha existir.
  const linhas = (r.stdout ?? '').trim().split('\n');
  const caminho = (linhas[linhas.length - 1] ?? '').trim();
  if (!caminho || !existsSync(caminho)) {
    throw new Error(`fixture.sh não imprimiu um caminho utilizável: '${caminho}'`);
  }
  checkoutRealCache = caminho;
  afterAll(() => {
    limparCheckoutReal();
  });
  return caminho;
}

/** Remove o fixture instanciado, se houver. Idempotente. */
export function limparCheckoutReal(): void {
  if (!checkoutRealCache) return;
  const script = join(REPO_ROOT, 'scripts', 'kit', 'fixture.sh');
  // A remoção é do PRÓPRIO instanciador: ele é quem sabe que as worktrees do
  // motor moram no tmp pai, e quem tem a trava que recusa apagar caminho que
  // não pareça um fixture nosso. `rm -rf` aqui seria a mesma decisão tomada
  // duas vezes, e a segunda sem a trava.
  spawnSync('bash', [script, '--limpar', checkoutRealCache], { encoding: 'utf8' });
  checkoutRealCache = null;
}

export interface Ticket {
  id: string;
  slug?: string;
  status?: string;
  dependencias?: string[];
  frente?: string;
  bloco?: string;
  [k: string]: unknown;
}

/** Cria o fixture: docs/fila/{000-config.json,runs/} + os tickets pedidos. */
export function criarFixture(tickets: Ticket[] = []): string {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-fx-'));
  mkdirSync(join(raiz, 'docs', 'fila', 'runs'), { recursive: true });
  // Config do checkout de fixture (FX_CHECKOUT). No repo de origem esta linha
  // lia docs/fila/000-config.json do próprio checkout; o kit não tem fila —
  // ela é do repo instalado —, então a referência mora em test/fixtures/.
  escrever(
    join(raiz, 'docs', 'fila', '000-config.json'),
    readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
  );
  for (const t of tickets) escreverTicket(raiz, t);
  return raiz;
}

export function escrever(caminho: string, conteudo: string): void {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, conteudo);
}

/** Ticket no formato do repo: prosa + bloco ```json``` que é a fonte de máquina. */
export function escreverTicket(raiz: string, t: Ticket): string {
  // Defaults primeiro, ticket por cima: o caso do teste manda, e campos que ele
  // não cita ganham um valor plausível em vez de sumir.
  const json = {
    objetivo: 'fixture',
    pathspec_allowlist: ['src/nada.ts'],
    criterios_aceite: [],
    ...t,
    id: t.id,
    slug: t.slug ?? `fixture-${t.id}`,
    status: t.status ?? 'pendente',
    dependencias: t.dependencias ?? [],
  };
  const caminho = join(raiz, 'docs', 'fila', `${t.id}-${json.slug}.md`);
  escrever(caminho, `# ${t.id}\n\nfixture.\n\n\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\`\n`);
  return caminho;
}

export function liberacoes(raiz: string, conteudo: unknown): void {
  escrever(join(raiz, 'docs', 'fila', 'liberacoes.json'), JSON.stringify(conteudo, null, 2));
}

/**
 * Roda um script bash com o lib.sh carregado e ORQ_EXEC_ROOT no fixture.
 * Devolve { rc, stdout, stderr } — stderr importa: `log` escreve nele.
 */
export function bashNoFixture(
  raiz: string,
  corpo: string,
  extra: Record<string, string> = {},
): { rc: number; stdout: string; stderr: string } {
  // lib.sh liga `set -euo pipefail`; nos testes rc != 0 é resultado esperado de
  // metade dos casos, então errexit sai DEPOIS do source também.
  const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', corpo].join('\n');
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: raiz,
    env: { ...process.env, ...extra },
  });
  return { rc: r.status ?? 1, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

/** Igual ao bashNoFixture, mas junta stdout+stderr (para asserção sobre log). */
export function bashComLog(raiz: string, corpo: string): { rc: number; saida: string } {
  const r = bashNoFixture(raiz, corpo);
  return { rc: r.rc, saida: `${r.stdout}${r.stderr}` };
}

/** Roda o scripts/orq REAL com o fixture como checkout. */
export function orq(raiz: string, ...args: string[]): { rc: number; out: string; err: string } {
  const r = spawnSync(join(REPO_ROOT, 'scripts', 'orq'), args, {
    encoding: 'utf8',
    cwd: raiz,
    env: { ...process.env, ORQ_EXEC_ROOT: raiz },
  });
  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

export function ler(caminho: string): string {
  return existsSync(caminho) ? readFileSync(caminho, 'utf8') : '';
}

// ─── Stub de launchctl (peça K6e) ─────────────────────────────────────────
// Nenhum teste do kit pode tocar o launchd desta máquina. A regra nasceu de um
// incidente real (2026-09-08): o "vermelho antes" da K6c rodou o instalador
// ANTIGO — que ignorava `--dry-run` — e carregou o job do CI apontando para um
// fixture em `/private/tmp`, por 1h40, com três ticks mortos em rc 127.
//
// `comLaunchctlStub()` devolve o ambiente que TODO teste de instalador tem de
// passar ao processo filho:
//   PATH               com `test/fixtures/bin` NA FRENTE (o stub ganha do real)
//   HOME               um tmp descartável — `~/Library/LaunchAgents` da máquina
//                      não é destino de teste nem quando o launchctl é falso
//   ORQ_LAUNCHCTL_LOG  onde o stub grava uma linha por chamada
//
// `chamadas()` lê esse log. Um teste que afirma "instalou" prova pelo que o
// stub REGISTROU, e um teste que afirma "não instalou" prova pelo log vazio.

export const BIN_STUB = join(import.meta.dirname, 'bin');

export interface LaunchctlStub {
  /** Variáveis de ambiente para o processo filho (PATH, HOME, ORQ_LAUNCHCTL_LOG). */
  env: Record<string, string>;
  /** Caminho do log de chamadas. */
  log: string;
  /** HOME falso — é aqui que um `Library/LaunchAgents` de teste apareceria. */
  home: string;
  /** Uma entrada por chamada de launchctl, na ordem. */
  chamadas: () => string[];
}

export function comLaunchctlStub(): LaunchctlStub {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-launchctl-'));
  const log = join(raiz, 'chamadas.log');
  const home = join(raiz, 'home');
  mkdirSync(home, { recursive: true });
  return {
    env: {
      PATH: `${BIN_STUB}:${process.env.PATH ?? ''}`,
      HOME: home,
      ORQ_LAUNCHCTL_LOG: log,
    },
    log,
    home,
    chamadas: () =>
      existsSync(log)
        ? readFileSync(log, 'utf8').split('\n').filter((l) => l.trim() !== '')
        : [],
  };
}
