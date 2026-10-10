/**
 * comum.ts — leituras puras que os dois leitores dividem: o 1º bloco json do
 * ticket, os vermelhos do gate de testes, os critérios que falharam, o
 * diff.stat e o veredito do juiz. Recebem `Arquivo` (linhas com o número do
 * original) e devolvem `Ref` que apontam o original.
 */
import { primeiroLocal } from '../diagnostico.js'
import { trecho } from './recorte.js'
import type { Arquivo, CriterioFalho, Juiz, Ref, TicketLido, Vermelho } from './tipos.js'

export const ref = (a: Arquivo, n: number | null, t: string): Ref => ({ arquivo: a.rel, linha: n, trecho: trecho(t) })

/** O PRIMEIRO bloco ```json de um ticket .md (CONTRATO §2). */
export function blocoJson(md: string): Record<string, unknown> | null {
  const m = /```json\n([\s\S]*?)\n```/.exec(md)
  if (!m) return null
  try {
    const v = JSON.parse(m[1]!) as unknown
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
  } catch {
    return null
  }
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '')

export function ticketLido(arquivo: string, j: Record<string, unknown> | null): TicketLido | null {
  if (!j) return null
  return {
    arquivo,
    id: str(j.id),
    slug: str(j.slug),
    status: str(j.status),
    notas_status: str(j.notas_status),
    objetivo: str(j.objetivo),
    pathspec_allowlist: Array.isArray(j.pathspec_allowlist) ? j.pathspec_allowlist.filter((x): x is string => typeof x === 'string') : [],
    criterios_aceite: Array.isArray(j.criterios_aceite) ? j.criterios_aceite : [],
  }
}

const ARQ_TESTE = String.raw`\S+\.(?:test|spec)\.[cm]?[jt]sx?`
const RE_FAIL = new RegExp(String.raw`^\s*FAIL\s+(${ARQ_TESTE})(?:\s+(?:>\s+)?(.*))?$`)
const RE_LOCAL = new RegExp(String.raw`❯\s+(${ARQ_TESTE}):(\d+):\d+`)
const RE_MAQUINA = /Timeout waiting for worker|Timeout starting|\bEMFILE\b|\bENOSPC\b/

/**
 * Os vermelhos de um recorte de gate de testes: um por `❯ arquivo:linha`
 * (o local, por `primeiroLocal` do diagnostico.ts), e um por arquivo com FAIL
 * que não teve local. O `it` é o nome do FAIL mais recente do mesmo arquivo.
 */
export function vermelhosDe(a: Arquivo): { vermelhos: Vermelho[]; arquivos: string[]; maquina: Ref[] } {
  const vermelhos: Vermelho[] = []
  const arquivos: string[] = []
  const comLocal = new Set<string>()
  const ultimoIt = new Map<string, string>()
  const primeiroFail = new Map<string, { n: number; t: string; it: string | null }>()
  const maquina: Ref[] = []
  for (const l of a.linhas) {
    const f = RE_FAIL.exec(l.t)
    if (f) {
      const arq = f[1]!
      if (!arquivos.includes(arq)) arquivos.push(arq)
      const it = (f[2] ?? '').replace(/\s*\[.*\]\s*$/, '').trim() || null
      if (it) ultimoIt.set(arq, it)
      if (!primeiroFail.has(arq)) primeiroFail.set(arq, { n: l.n, t: l.t, it })
      continue
    }
    if (RE_LOCAL.test(l.t)) {
      const loc = primeiroLocal(l.t.slice(l.t.indexOf('❯')))
      if (loc.arquivo) {
        comLocal.add(loc.arquivo)
        if (!vermelhos.some((v) => v.arquivo === loc.arquivo && v.linha === loc.linha)) {
          vermelhos.push({ arquivo: loc.arquivo, linha: loc.linha, it: ultimoIt.get(loc.arquivo) ?? null, ref: ref(a, l.n, l.t) })
        }
      }
    }
    if (RE_MAQUINA.test(l.t)) maquina.push(ref(a, l.n, l.t))
  }
  for (const [arq, f] of primeiroFail) {
    if (!comLocal.has(arq)) vermelhos.push({ arquivo: arq, linha: null, it: f.it, ref: ref(a, f.n, f.t) })
  }
  return { vermelhos, arquivos, maquina }
}

/** Blocos `### criterio[i] -> X` com X != PASS do criterios.txt do legado. */
export function criteriosFalhosLegado(a: Arquivo): CriterioFalho[] {
  const out: CriterioFalho[] = []
  let atual: CriterioFalho | null = null
  let naSaida = false
  for (const l of a.linhas) {
    const h = /^### (\S+) -> (\S+)/.exec(l.t)
    if (h) {
      atual = h[2] === 'PASS' ? null : { criterio: h[1]!, cmd: '', espera: '', saida: [], ref: ref(a, l.n, l.t) }
      if (atual) out.push(atual)
      naSaida = false
      continue
    }
    if (!atual) continue
    if (naSaida) {
      if (l.t.trim() && atual.saida.length < 2) atual.saida.push(l.t)
      continue
    }
    const cmd = /^cmd:\s*(.*)$/.exec(l.t)
    const esp = /^espera:\s*(.*)$/.exec(l.t)
    if (cmd) atual.cmd = cmd[1]!
    else if (esp) atual.espera = esp[1]!
    else if (/^-- saida --/.test(l.t)) naSaida = true
  }
  return out
}

/** Blocos `### <descrição>` do criterios.txt do kit cujas descrições reprovaram. */
export function criteriosFalhosKit(a: Arquivo, falhos: string[]): CriterioFalho[] {
  const out: CriterioFalho[] = []
  let atual: CriterioFalho | null = null
  for (const l of a.linhas) {
    const h = /^### (.*)$/.exec(l.t)
    if (h) {
      atual = falhos.includes(h[1]!.trim()) ? { criterio: h[1]!.trim(), cmd: '', espera: '', saida: [], ref: ref(a, l.n, l.t) } : null
      if (atual) out.push(atual)
      continue
    }
    if (!atual) continue
    const m = /^(cmd|espera|saida):\s*(.*)$/.exec(l.t)
    if (m?.[1] === 'cmd') atual.cmd = m[2]!
    else if (m?.[1] === 'espera') atual.espera = m[2]!
    else if (m?.[1] === 'saida') atual.saida.push(m[2]!)
  }
  return out
}

/** diff.stat: arquivos (coluna antes do `|`) e inserções + deleções da última linha de resumo. */
export function diffStat(a: Arquivo): { arquivos: string[]; linhas: number | null; ref: Ref | null } {
  const arquivos = a.linhas.filter((l) => l.t.includes('|')).map((l) => l.t.split('|')[0]!.trim())
  let resumo: { n: number; t: string } | null = null
  for (const l of a.linhas) if (/\d+ files? changed/.test(l.t)) resumo = l
  if (!resumo) return { arquivos, linhas: arquivos.length ? null : 0, ref: null }
  const ins = /(\d+) insertions?\(\+\)/.exec(resumo.t)
  const del = /(\d+) deletions?\(-\)/.exec(resumo.t)
  return { arquivos, linhas: Number(ins?.[1] ?? 0) + Number(del?.[1] ?? 0), ref: ref(a, resumo.n, resumo.t) }
}

/** diff.patch do kit: arquivos de `+++ b/` e linhas +/- sem cabeçalho. */
export function diffPatch(a: Arquivo): { arquivos: string[]; linhas: number; ref: Ref | null } {
  const arquivos: string[] = []
  let linhas = 0
  for (const l of a.linhas) {
    if (l.t.startsWith('+++ ')) {
      const f = l.t.slice(4).replace(/^b\//, '').trim()
      if (f !== '/dev/null' && !arquivos.includes(f)) arquivos.push(f)
    } else if (l.t.startsWith('--- ')) continue
    else if ((l.t.startsWith('+') || l.t.startsWith('-')) && !l.t.startsWith('+++') && !l.t.startsWith('---')) linhas++
  }
  const primeira = a.linhas[0]
  return { arquivos, linhas, ref: primeira ? ref(a, primeira.n, `${arquivos.length} arquivo(s), ${linhas} linhas +/-`) : null }
}

/**
 * O JSON do juiz num arquivo que pode ter texto em volta: a ÚLTIMA linha que o
 * JSON.parse aceita com `aprovado` (o mesmo varrer de trás para frente do
 * avaliador do legado).
 */
export function juizDe(a: Arquivo): Juiz | null {
  const tenta = (s: string): Record<string, unknown> | null => {
    try {
      const v = JSON.parse(s) as unknown
      return v && typeof v === 'object' && 'aprovado' in (v as object) ? (v as Record<string, unknown>) : null
    } catch {
      return null
    }
  }
  const inteiro = tenta(a.linhas.map((l) => l.t).join('\n'))
  if (inteiro) return juizDoObjeto(a, inteiro, a.linhas[0]?.n ?? 1, a.linhas[0]?.t ?? '')
  for (let i = a.linhas.length - 1; i >= 0; i--) {
    const l = a.linhas[i]!
    const j = tenta(l.t.trim())
    if (j) return juizDoObjeto(a, j, l.n, l.t)
  }
  return null
}

function juizDoObjeto(a: Arquivo, j: Record<string, unknown>, n: number, t: string): Juiz {
  const cf = j.criterios_falhos
  return {
    aprovado: typeof j.aprovado === 'boolean' ? j.aprovado : null,
    motivo: str(j.motivo),
    criterios_falhos: Array.isArray(cf) ? cf.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) : [],
    ref: ref(a, n, t),
  }
}
