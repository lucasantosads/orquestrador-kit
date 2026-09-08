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
import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

export const REPO_ROOT = join(import.meta.dirname, '..', '..');
export const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');

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
  // Config REAL: os testes têm que falhar quando o config muda de forma
  // incompatível, não passar contra uma cópia congelada.
  escrever(
    join(raiz, 'docs', 'fila', '000-config.json'),
    readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
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
