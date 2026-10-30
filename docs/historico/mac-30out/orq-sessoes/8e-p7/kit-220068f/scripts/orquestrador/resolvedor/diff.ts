/**
 * diff.ts — diff de linhas (LCS), no formato unificado, para a proposta em
 * sombra e para o dry-run mostrarem o que mudaria no ticket. PURO.
 */
export function diffLinhas(a: string, b: string, rotulo: string, contexto = 1): string {
  const la = a.split('\n')
  const lb = b.split('\n')
  const n = la.length
  const m = lb.length
  // lcs[i][j] = tamanho do LCS de la[i..] e lb[j..]
  const lcs: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) lcs[i]![j] = la[i] === lb[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!)
  const ops: { t: ' ' | '-' | '+'; l: string; ia: number; ib: number }[] = []
  let i = 0
  let j = 0
  while (i < n || j < m) {
    if (i < n && j < m && la[i] === lb[j]) ops.push({ t: ' ', l: la[i]!, ia: i++, ib: j++ })
    else if (i < n && (j === m || lcs[i + 1]![j]! >= lcs[i]![j + 1]!)) ops.push({ t: '-', l: la[i]!, ia: i++, ib: j })
    else ops.push({ t: '+', l: lb[j]!, ia: i, ib: j++ })
  }
  const muda = ops.map((o, k) => (o.t !== ' ' ? k : -1)).filter((k) => k >= 0)
  if (!muda.length) return ''
  const out = [`--- a/${rotulo}`, `+++ b/${rotulo}`]
  let k = 0
  while (k < muda.length) {
    const ini = Math.max(0, muda[k]! - contexto)
    let fim = muda[k]!
    while (k + 1 < muda.length && muda[k + 1]! - fim <= 2 * contexto + 1) fim = muda[++k]!
    fim = Math.min(ops.length - 1, fim + contexto)
    const h = ops.slice(ini, fim + 1)
    const na = h.filter((o) => o.t !== '+').length
    const nb = h.filter((o) => o.t !== '-').length
    out.push(`@@ -${h[0]!.ia + 1},${na} +${h[0]!.ib + 1},${nb} @@`)
    for (const o of h) out.push(`${o.t}${o.l}`)
    k++
  }
  return out.join('\n') + '\n'
}
