/**
 * Peça K6a — monorepo por DETECÇÃO, não por nome.
 *
 * O `executor.sh` linkava `node_modules` e purgava `node_modules/.vite` numa
 * lista FIXA (`for d in "" apps/web services/*​/`) que é a árvore do
 * conteudos-infinitos escrita dentro do motor. Num repo de pacote único a lista
 * ainda funcionava por acidente (os dois nomes não existem, o glob não casa); em
 * qualquer outro monorepo — `packages/`, `apps/api`, `libs/` — o motor deixava
 * pacote sem `node_modules` na worktree e o gate reprovava por ambiente.
 *
 * A detecção: todo diretório do checkout PRINCIPAL que tenha `node_modules`
 * PRÓPRIO (não um aninhado dentro de outro `node_modules`), a raiz incluída.
 *
 * O que estes casos cobram, e por quê:
 *   1. pacote único  -> só a raiz (o fixture do kit);
 *   2. árvore do CI simulada (`apps/web` + os 7 `services/*`) -> os 9 pacotes,
 *      NA MESMA ORDEM que `for d in "" apps/web services/*​/` produzia. Ordem
 *      importa porque é ela que decide qual symlink é criado antes de qual, e
 *      "o CI não faz nada diferente" é afirmação sobre a saída inteira, não
 *      sobre o conjunto;
 *   3. `node_modules` aninhado (uma dependência que traz o próprio) NÃO é
 *      pacote — senão a lista explodiria em centenas de entradas;
 *   4. `limpa_cache_vite` apaga o `.vite` de TODOS os pacotes detectados —
 *      inclusive de um `packages/ui`, nome que a lista fixa NÃO cobria: é ele
 *      que separa "detecta" de "adivinha".
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { bashNoFixture, criarFixture, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

/** Roda um corpo bash com o executor.sh SOURCED (só funções) no fixture. */
function noExecutor(raiz: string, corpo: string) {
  return bashNoFixture(
    raiz,
    ['export EXECUTOR_SOURCED=1', `source "${EXECUTOR}"`, 'set +e', corpo].join('\n'),
  );
}

function pacote(raiz: string, rel: string): void {
  mkdirSync(join(raiz, rel, 'node_modules'), { recursive: true });
}

/** Os 7 services do conteudos-infinitos, na ordem em que `services/*​/` os entrega. */
const SERVICES = [
  'ingestao-demanda',
  'ingestao-organico',
  'ingestao-perguntas',
  'ingestao-trafego',
  'orquestrador',
  'persona-roteirizador',
  'telemetria',
];

describe('pacotes_do_checkout detecta quem tem node_modules próprio', () => {
  it('pacote único: só a raiz', () => {
    const raiz = criarFixture([]);
    pacote(raiz, '.');
    const r = noExecutor(raiz, 'pacotes_do_checkout');
    expect(r.stdout.trim().split('\n')).toEqual(['.']);
  });

  it('árvore do CI simulada: os 9 pacotes, na ordem do código antigo', () => {
    const raiz = criarFixture([]);
    pacote(raiz, '.');
    pacote(raiz, 'apps/web');
    for (const s of SERVICES) pacote(raiz, `services/${s}`);
    const r = noExecutor(raiz, 'pacotes_do_checkout');
    // `for d in "" apps/web services/*​/` visitava: raiz, apps/web, e os
    // services em ordem de glob (alfabética). É esta lista, item a item.
    expect(r.stdout.trim().split('\n')).toEqual([
      '.',
      'apps/web',
      ...SERVICES.map((s) => `services/${s}`),
    ]);
  });

  it('node_modules ANINHADO não vira pacote', () => {
    const raiz = criarFixture([]);
    pacote(raiz, '.');
    // Uma dependência que traz o próprio node_modules — o caso que faria a
    // detecção ingênua listar centenas de "pacotes".
    mkdirSync(join(raiz, 'node_modules', 'vite', 'node_modules'), { recursive: true });
    const r = noExecutor(raiz, 'pacotes_do_checkout');
    expect(r.stdout.trim().split('\n')).toEqual(['.']);
  });

  it('diretório sem node_modules próprio fica de fora', () => {
    const raiz = criarFixture([]);
    pacote(raiz, '.');
    mkdirSync(join(raiz, 'docs', 'sem-deps'), { recursive: true });
    const r = noExecutor(raiz, 'pacotes_do_checkout');
    expect(r.stdout.trim().split('\n')).toEqual(['.']);
  });
});

describe('limpa_cache_vite purga o .vite de todo pacote detectado', () => {
  it('apaga na raiz E nos pacotes aninhados, e não toca no resto', () => {
    const raiz = criarFixture([]);
    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) {
      pacote(raiz, p);
      mkdirSync(join(raiz, p, 'node_modules', '.vite'), { recursive: true });
      writeFileSync(join(raiz, p, 'node_modules', '.vite', 'deps.json'), '{}');
    }
    // Vizinho que NÃO é cache do vite: some se a purga for por diretório-pai.
    writeFileSync(join(raiz, 'node_modules', 'marcador.txt'), 'fico');

    const r = noExecutor(raiz, 'limpa_cache_vite');
    expect(r.rc).toBe(0);
    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) {
      expect(existsSync(join(raiz, p, 'node_modules', '.vite')), `${p}/.vite`).toBe(false);
      expect(existsSync(join(raiz, p, 'node_modules')), `${p}/node_modules`).toBe(true);
    }
    expect(existsSync(join(raiz, 'node_modules', 'marcador.txt'))).toBe(true);
  });
});

describe('a lista de pacotes é a MESMA que o linkador de worktree usa', () => {
  it('linka node_modules de cada pacote detectado dentro da worktree', () => {
    const raiz = criarFixture([]);
    for (const p of ['.', 'apps/web', 'services/telemetria', 'packages/ui']) pacote(raiz, p);
    const wt = join(raiz, '..', 'wt-teste');

    // Só o bloco de links, sem git: `setup_worktree` faz worktree add, e worktree
    // exige repositório. O que esta peça mudou é a LISTA, e é ela que roda aqui
    // pelo mesmo helper que o setup_worktree chama.
    const r = noExecutor(
      raiz,
      [
        `wt="${wt}"`,
        'mkdir -p "$wt"',
        'linkar_node_modules "$wt"',
        'find "$wt" -maxdepth 3 -type l | sed "s|^$wt/||" | LC_ALL=C sort',
      ].join('\n'),
    );
    expect(r.stdout.trim().split('\n')).toEqual([
      'apps/web/node_modules',
      'node_modules',
      'packages/ui/node_modules',
      'services/telemetria/node_modules',
    ]);
  });
});
