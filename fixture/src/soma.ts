/**
 * A única unidade de código do fixture: função pura, sem I/O e sem dependência.
 *
 * O ticket 001 pede uma segunda função ao lado desta. Se o loop entregar, é
 * AQUI que o diff aparece — e é por isso que `src/soma.ts` é um dos dois paths
 * da `pathspec_allowlist` do ticket.
 */

/** Soma todos os números da lista. Lista vazia soma 0. */
export function soma(numeros: number[]): number {
  return numeros.reduce((acc, n) => acc + n, 0);
}
