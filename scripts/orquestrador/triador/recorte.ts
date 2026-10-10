/**
 * recorte.ts — o recorte do gate de testes e do criterios.txt (spec 7f-a §3.1, item 1).
 *
 * O MESMO algoritmo do `test/fixtures/triador-7f/montar.py` (`recortar` e
 * `recortar_criterios`): a fixture foi montada por ele, e o teste da peça 2
 * confere que os dois dão o mesmo recorte. Mudou aqui, muda lá.
 *
 * Gate de testes:
 *   1. âncoras FORTES (FAIL, `❯ arquivo:N:M`, `Test Files`, `Tests`, Timeout,
 *      EMFILE, ENOSPC, `Cannot find module`) entram sempre, mesmo além do teto;
 *   2. sem nenhum FAIL a suíte passou: o recorte é só das fortes;
 *   3. âncoras FRACAS (AssertionError, Expected, Received, `Error:`) em ordem,
 *      até o teto;
 *   4. contexto de até 6 linhas, do mais perto para o mais longe, até 300.
 *   Quadro de pilha (`    at f (…)`) que não cita arquivo de teste nunca entra.
 *
 * Toda linha guarda o número no ORIGINAL: a evidência aponta o arquivo
 * original, não o recorte.
 *
 * PURO: recebe texto, devolve linhas.
 */
import type { Linha } from './tipos.js'

export const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g
export const semAnsi = (s: string): string => s.replace(ANSI, '')

const FORTES = [
  /^\s*FAIL\s/,
  /❯\s+\S+:\d+:\d+/,
  /^\s*Test Files\s/,
  /^\s*Tests\s/,
  /\bTimeout\b/,
  /timed out/,
  /\bEMFILE\b/,
  /\bENOSPC\b/,
  /Cannot find module/,
]
const FAIL = FORTES[0]!
const FRACAS = [/AssertionError/, /\bExpected\b/, /\bReceived\b/, /\bError:/]
const PILHA = /^\s+at\s/
const PILHA_DE_TESTE = /\.(?:test|spec)\.[cm]?[jt]sx?/
export const CONTEXTO = 6
export const TETO_LINHAS = 300

const ruido = (l: string): boolean => PILHA.test(l) && !PILHA_DE_TESTE.test(l)

/** As linhas de um texto inteiro, numeradas de 1, sem ANSI. */
export function linhasDe(texto: string): Linha[] {
  return semAnsi(texto)
    .split('\n')
    .map((t, i) => ({ n: i + 1, t }))
}

/**
 * Recorte do gate de testes. Aceita o texto inteiro (linhas 1..N) ou um recorte
 * já feito (linhas com buracos): o resultado é o mesmo, porque o contexto é
 * contado pelo número no original.
 */
export function recortarVitest(entrada: Linha[]): Linha[] {
  const porN = new Map(entrada.map((l) => [l.n, l.t]))
  const ordem = entrada.map((l) => l.n)
  const fortes = ordem.filter((n) => {
    const t = porN.get(n)!
    return !ruido(t) && FORTES.some((r) => r.test(t))
  })
  const em = (ns: Iterable<number>) => [...ns].sort((a, b) => a - b).map((n) => ({ n, t: porN.get(n)! }))
  if (!fortes.some((n) => FAIL.test(porN.get(n)!))) return em(fortes)

  const sel = new Set(fortes)
  for (const n of ordem) {
    if (sel.size >= TETO_LINHAS) break
    const t = porN.get(n)!
    if (!sel.has(n) && !ruido(t) && FRACAS.some((r) => r.test(t))) sel.add(n)
  }
  const ancoras = [...sel].sort((a, b) => a - b)
  for (let d = 1; d <= CONTEXTO && sel.size < TETO_LINHAS; d++) {
    for (const a of ancoras) {
      for (const n of [a - d, a + d]) {
        if (sel.size >= TETO_LINHAS) break
        const t = porN.get(n)
        if (t !== undefined && !sel.has(n) && !ruido(t)) sel.add(n)
      }
    }
  }
  return em(sel)
}

/** Recorte do criterios.txt do legado: bloco não-PASS inteiro; do PASS, só o cabeçalho. */
export function recortarCriterios(entrada: Linha[]): Linha[] {
  const out: Linha[] = []
  let passa = false
  for (const l of entrada) {
    const m = /^### \S+ -> (\S+)/.exec(l.t)
    if (m) {
      passa = m[1] === 'PASS'
      out.push(l)
    } else if (!passa) out.push(l)
  }
  return out
}

/** [3,4,5,9] -> [[3,5],[9,9]]: o mapa de linhas originais, compacto. */
export function faixas(ns: number[]): [number, number][] {
  const out: [number, number][] = []
  for (const n of ns) {
    const u = out.at(-1)
    if (u && u[1] === n - 1) u[1] = n
    else out.push([n, n])
  }
  return out
}

/** O inverso de `faixas`. */
export function numerosDe(fx: [number, number][]): number[] {
  const out: number[] = []
  for (const [a, b] of fx) for (let n = a; n <= b; n++) out.push(n)
  return out
}

/** Corta um trecho de evidência em 160 caracteres (o limite do formato, §4). */
export const trecho = (s: string, n = 160): string => {
  const t = s.trim()
  return t.length > n ? `${t.slice(0, n - 1)}…` : t
}
