/**
 * leitor-legado-comarka.ts — o leitor do motor próprio do comarka-operacional
 * (spec 7f-a §0.3 e §2). Vive até a migração do comarka para o kit e morre com
 * ela; nada aqui vira contrato.
 *
 * Duas fontes, a mesma normalização:
 *   - `lerRepoLegado(raiz, id)`: o repo de verdade (runs/ no checkout principal,
 *     log `runs/local-loop.log`, fonte do teste por `gitLeitura`);
 *   - `lerCasoDeFixture(dir)`: um caso de `test/fixtures/triador-7f/`, que já
 *     guarda a série escolhida, os recortes com o mapa de linhas originais, os
 *     fontes e os vizinhos.
 *
 * O que manda no desenho (spec §0.3):
 *   1. o legado não grava a causa da reprova mecânica: o estágio sai da
 *      PRESENÇA dos arquivos (fail-fast do executor);
 *   2. o legado sobrescreve a evidência no requeue (`attempt-N` vira
 *      `attempt-N.prevK`): a série é `attempt-1..n` e, entre as variantes,
 *      ganha a de mtime mais recente até o fim da série + 180 s.
 *
 * SÓ LEITURA: nada aqui escreve, e o git passa por `gitLeitura`.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, join, relative } from 'node:path'
import { blocoJson, criteriosFalhosLegado, diffStat, juizDe, ref, ticketLido, vermelhosDe } from './comum.js'
import { gitLeitura } from './git.js'
import { faixas, linhasDe, numerosDe, recortarCriterios, recortarVitest, semAnsi } from './recorte.js'
import type { Arquivo, Bloqueio, Estagio, Evidencia, Lido, Linha, Ref, Tentativa, TicketLido, Vizinho } from './tipos.js'

export const RUNS_LEGADO = 'docs/fila/runs'
export const LOG_LEGADO = `${RUNS_LEGADO}/local-loop.log`
const JANELA_VIZINHO_S = 6 * 3600
const FOLGA_SERIE_S = 180

/** Uma entrada do meta.json do legado (1-based). */
export interface MetaLegado {
  attempt: number
  claude_dur_secs?: number
  diff_lines?: number
  resultado?: string
  ts: string
}

/** O que a normalização precisa de uma fonte (repo ou fixture). */
export interface FonteLegado {
  raiz: string
  id: string
  ticket(): { arquivo: string; json: Record<string, unknown> | null } | null
  /** a série: attempt-1..n, com o diretório (relativo à raiz) que ganhou */
  serie(): { k: number; dir: string }[]
  meta(): MetaLegado[]
  fim(): string | null
  presenca(dir: string): string[] | null
  /** arquivo inteiro ou recortado; as linhas têm o número no original */
  ler(rel: string): Arquivo | null
  /** o trecho do log da série */
  log(): Linha[]
  config(): { diff_cap_linhas: number | null; claude_timeout_secs: number | null }
  vizinhos(): Vizinho[]
  fonteDoTeste(head: string, arquivo: string): string | null
  stat(rel: string): { tamanho: number; mtime_ns: string } | null
}

// ─── normalização (as duas fontes passam por aqui) ──────────────────────────

function estagioPorPresenca(fonte: FonteLegado, dir: string, presentes: string[]): Estagio {
  const tem = (f: string) => presentes.includes(f)
  if (tem('verdict.json')) {
    const v = fonte.ler(`${dir}/verdict.json`)
    const j = v ? juizDe(v) : null
    const av = tem('avaliador-claude.txt') ? fonte.ler(`${dir}/avaliador-claude.txt`) : null
    const juiz = av ? juizDe(av) : null
    if (j?.aprovado) return 'aprovado'
    if (juiz?.aprovado === true && /merge/i.test(j?.motivo ?? '')) return 'juiz_ok_merge_falhou'
    return 'juiz'
  }
  if (tem('gate-build.txt')) return 'build'
  if (tem('criterios.txt')) return 'criterios'
  if (tem('gate-vitest.txt')) return 'vitest'
  if (tem('gate-tsc.txt')) return 'tsc'
  if (tem('diff.stat')) {
    const e = fonte.ler(`${dir}/enforcement.json`)
    try {
      const j = e ? (JSON.parse(e.linhas.map((l) => l.t).join('\n')) as { ok?: boolean }) : null
      return j?.ok === false ? 'enforcement' : 'diff_cap'
    } catch {
      return 'diff_cap'
    }
  }
  return 'agente'
}

function tentativa(fonte: FonteLegado, k: number, dir: string, meta: MetaLegado | undefined, falta: string[]): Tentativa {
  const presentes = fonte.presenca(dir) ?? []
  if (!presentes.length) falta.push(`${dir}/`)
  const ler = (f: string) => (presentes.includes(f) ? fonte.ler(`${dir}/${f}`) : null)
  const vit = ler('gate-vitest.txt')
  const crit = ler('criterios.txt')
  const stat = ler('diff.stat')
  const enf = ler('enforcement.json')
  const av = ler('avaliador-claude.txt')
  const vd = ler('verdict.json')
  const co = ler('claude-output.txt')
  const hd = ler('head.txt')
  const v = vit ? vermelhosDe(vit) : { vermelhos: [], arquivos: [], maquina: [] }
  const ds = stat ? diffStat(stat) : { arquivos: [], linhas: null, ref: null }
  let enforcement: Tentativa['enforcement'] = null
  if (enf) {
    try {
      const j = JSON.parse(enf.linhas.map((l) => l.t).join('\n')) as { ok?: boolean; violations?: { tipo?: string; detalhe?: string }[] }
      enforcement = {
        ok: j.ok !== false,
        violacoes: (j.violations ?? []).map((x) => `${x.tipo ?? ''}: ${x.detalhe ?? ''}`),
        ref: ref(enf, enf.linhas[0]?.n ?? 1, enf.linhas.map((l) => l.t).join(' ')),
      }
    } catch {
      enforcement = null
    }
  }
  const head = hd?.linhas.map((l) => l.t).join('').trim() || null
  const fontes: Record<string, string | null> = {}
  for (const arq of v.arquivos) {
    if (!noDiff(arq, ds.arquivos)) fontes[arq] = head ? fonte.fonteDoTeste(head, arq) : null
  }
  return {
    n: k,
    dir,
    estagio: estagioPorPresenca(fonte, dir, presentes),
    vermelhos: v.vermelhos,
    arquivos_vermelhos: v.arquivos,
    criterios_falhos: crit ? criteriosFalhosLegado(crit) : [],
    diff_arquivos: ds.arquivos,
    diff_linhas: ds.linhas,
    diff_ref: ds.ref,
    enforcement,
    juiz: (av && juizDe(av)) || (vd && juizDe(vd)) || null,
    agente_disse: co ? co.linhas.map((l) => l.t).join('\n') : null,
    head,
    dur_secs: typeof meta?.claude_dur_secs === 'number' ? meta.claude_dur_secs : null,
    maquina: v.maquina,
    recorte_vitest: vit,
    recorte_criterios: crit,
    diff_stat: stat,
    fontes,
  }
}

/** O diff.stat abrevia caminho longo com `.../`: casa pelo sufixo. */
export function noDiff(arq: string, diff: string[]): boolean {
  return diff.some((d) => d === arq || (d.startsWith('.../') && arq.endsWith(d.slice(3))))
}

const RE_BLOQ = (id: string) => new RegExp(String.raw`ticket ${escape(id)}: (BLOQUEADO|reprovado após)`)
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function bloqueioDoLog(fonte: FonteLegado, tk: TicketLido | null, n: number): { bloqueio: Bloqueio; motor: Ref[]; merge: Evidencia['merge_recusado'] } {
  const log = fonte.log()
  const a: Arquivo = { rel: LOG_LEGADO, linhas: log, total: log.at(-1)?.n ?? 0 }
  const re = RE_BLOQ(fonte.id)
  const linhaBloq = [...log].reverse().find((l) => re.test(l.t)) ?? null
  const motor = log.filter((l) => /REPROVA|circuit breaker|diff grande/.test(l.t)).map((l) => ref(a, l.n, l.t))
  let token: string | null = null
  if (linhaBloq) {
    if (/BLOQUEADO \(enforcement\)/.test(linhaBloq.t)) token = 'enforcement'
    else if (/reprovado após/.test(linhaBloq.t)) token = 'retries_esgotados'
    else token = 'circuit_breaker'
  }
  // Merge recusado por mudança local: a linha do git e os arquivos indentados
  // logo abaixo dela (avaliador do legado roda `git merge` na staging-auto).
  const arquivos: string[] = []
  const refs: Ref[] = []
  for (let i = 0; i < log.length; i++) {
    if (!/overwritten by merge:/.test(log[i]!.t)) continue
    refs.push(ref(a, log[i]!.n, log[i]!.t))
    for (let j = i + 1; j < log.length && /^\s+\S/.test(log[j]!.t); j++) {
      refs.push(ref(a, log[j]!.n, log[j]!.t))
      const f = log[j]!.t.trim()
      if (!arquivos.includes(f)) arquivos.push(f)
    }
  }
  return {
    bloqueio: {
      quando: fonte.fim(),
      token,
      nota_do_motor: tk?.notas_status ?? '',
      tentativas: n,
      origem: linhaBloq ? 'motor' : 'humano',
      refs: linhaBloq ? [ref(a, linhaBloq.n, linhaBloq.t)] : [],
    },
    motor,
    merge: refs.length ? { arquivos, refs } : null,
  }
}

export function normalizarLegado(fonte: FonteLegado): Evidencia {
  const falta: string[] = []
  const t = fonte.ticket()
  const tk = t ? ticketLido(t.arquivo, t.json) : null
  if (!tk) falta.push('ticket')
  const serie = fonte.serie()
  const metas = fonte.meta()
  if (!metas.length) falta.push('meta')
  const tentativas = serie.map((s) => tentativa(fonte, s.k, s.dir, metas.find((m) => m.attempt === s.k), falta))
  const { bloqueio, motor, merge } = bloqueioDoLog(fonte, tk, serie.length)
  if (!fonte.log().length) falta.push('log')
  const config = fonte.config()
  if (config.diff_cap_linhas === null) falta.push('config.diff_cap_linhas')
  const vizinhos = fonte.vizinhos()
  if (!vizinhos.length && tentativas.some((x) => x.arquivos_vermelhos.length)) falta.push('vizinhos')
  for (const x of tentativas) {
    for (const [arq, src] of Object.entries(x.fontes)) if (src === null) falta.push(`fonte:${arq}@${x.head ?? 'sem-head'}`)
  }
  return {
    leitor: 'legado-comarka',
    repo: fonte.raiz,
    id: fonte.id,
    ticket: tk,
    bloqueio,
    tentativas,
    merge_recusado: merge,
    motor,
    base_vermelha_motor: null,
    vizinhos,
    config,
    falta,
    lidos: lidos(fonte, tk, tentativas),
  }
}

function lidos(fonte: FonteLegado, tk: TicketLido | null, ts: Tentativa[]): Lido[] {
  const out: Lido[] = []
  const add = (a: Arquivo | null) => {
    if (!a || out.some((x) => x.arquivo === a.rel)) return
    const st = fonte.stat(a.rel)
    const inteiro = a.linhas.length === a.total && a.linhas.every((l, i) => l.n === i + 1)
    out.push({
      arquivo: a.rel,
      tamanho: st?.tamanho ?? 0,
      mtime_ns: st?.mtime_ns ?? '0',
      conteudo: a.linhas.map((l) => l.t).join('\n'),
      ...(inteiro ? {} : { faixas: faixas(a.linhas.map((l) => l.n)) }),
    })
  }
  if (tk) {
    const st = fonte.stat(tk.arquivo)
    out.push({ arquivo: tk.arquivo, tamanho: st?.tamanho ?? 0, mtime_ns: st?.mtime_ns ?? '0', conteudo: JSON.stringify(fonte.ticket()?.json ?? null, null, 1) })
  }
  for (const t of ts) {
    for (const f of ['verdict.json', 'avaliador-claude.txt', 'claude-output.txt', 'enforcement.json', 'head.txt', 'gate-tsc.txt']) {
      if ((fonte.presenca(t.dir) ?? []).includes(f)) add(fonte.ler(`${t.dir}/${f}`))
    }
    add(t.recorte_vitest)
    add(t.recorte_criterios)
    add(t.diff_stat)
  }
  const log = fonte.log()
  if (log.length) {
    out.push({ arquivo: LOG_LEGADO, tamanho: fonte.stat(LOG_LEGADO)?.tamanho ?? 0, mtime_ns: '0', conteudo: log.map((l) => l.t).join('\n'), faixas: faixas(log.map((l) => l.n)) })
  }
  return out
}

// ─── fonte: caso da fixture ─────────────────────────────────────────────────

export type Instante = 'bloqueio' | 'passada'

/**
 * Um caso de `test/fixtures/triador-7f/`. `instante: 'bloqueio'` usa só os
 * vizinhos que já existiam no fim da série (`antes_do_bloqueio`); `'passada'`
 * usa todos (o estado da passada G3, até 6 h depois).
 */
export function fonteFixture(dirCaso: string, opts: { instante?: Instante } = {}): FonteLegado {
  const instante = opts.instante ?? 'passada'
  const json = <T>(f: string): T | null => {
    try {
      return JSON.parse(readFileSync(join(dirCaso, f), 'utf8')) as T
    } catch {
      return null
    }
  }
  const caso = json<{ id: string; arquivo_ticket: string; fim: string; meta_dir: string; repo: string }>('caso.json')
  if (!caso) throw new Error(`fixture sem caso.json: ${dirCaso}`)
  const serie = json<{ k: number; dir: string }[]>('serie.json') ?? []
  const porDir = new Map(serie.map((s) => [s.dir, `attempt-${s.k}`]))
  const raiz = `fixture:${basename(dirCaso)}`
  return {
    raiz,
    id: caso.id,
    ticket: () => ({ arquivo: caso.arquivo_ticket, json: json<Record<string, unknown>>('ticket.json') }),
    serie: () => serie,
    meta: () => json<MetaLegado[]>('meta.json') ?? [],
    fim: () => caso.fim,
    presenca: (dir) => {
      const k = porDir.get(dir)
      return k ? json<string[]>(join(k, 'presenca.json')) : null
    },
    ler: (rel) => {
      const i = rel.lastIndexOf('/')
      const k = porDir.get(rel.slice(0, i))
      if (!k) return null
      const nome = rel.slice(i + 1)
      const p = join(dirCaso, k, nome)
      if (!existsSync(p)) return null
      const texto = readFileSync(p, 'utf8')
      const mapa = nome.endsWith('.txt')
        ? json<{ total: number; faixas: [number, number][] }>(join(k, nome.replace(/\.txt$/, '.linhas.json')))
        : null
      if (!mapa) {
        const linhas = linhasDe(texto)
        return { rel, linhas, total: linhas.length }
      }
      const ns = numerosDe(mapa.faixas)
      const ts = texto.split('\n')
      return { rel, linhas: ns.map((n, j) => ({ n, t: ts[j] ?? '' })), total: mapa.total }
    },
    log: () => {
      const p = join(dirCaso, 'log.txt')
      if (!existsSync(p)) return []
      return readFileSync(p, 'utf8')
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const tab = l.indexOf('\t')
          return { n: Number(l.slice(0, tab)), t: l.slice(tab + 1) }
        })
    },
    config: () => {
      const c = json<{ diff_cap_linhas?: number; claude_timeout_secs?: number }>('config.json')
      return { diff_cap_linhas: c?.diff_cap_linhas ?? null, claude_timeout_secs: c?.claude_timeout_secs ?? null }
    },
    vizinhos: () => {
      const p = join(dirCaso, 'vizinhos.tsv')
      if (!existsSync(p)) return []
      const [cab, ...linhas] = readFileSync(p, 'utf8').split('\n').filter(Boolean)
      const col = (cab ?? '').split('\t')
      return linhas
        .map((l) => Object.fromEntries(l.split('\t').map((v, i) => [col[i], v])) as Record<string, string>)
        .map((r) => ({
          ticket: r.ticket ?? '',
          dir: r.dir ?? '',
          arquivo: r.arquivo ?? '',
          linha: r.linha ? Number(r.linha) : null,
          ts: r.ts ?? '',
          antes_do_bloqueio: r.antes_do_bloqueio === '1',
        }))
        .filter((v) => instante === 'passada' || v.antes_do_bloqueio)
    },
    fonteDoTeste: (head, arquivo) => {
      const p = join(dirCaso, 'fontes', head, `${arquivo}.fonte`)
      return existsSync(p) ? readFileSync(p, 'utf8') : null
    },
    stat: (rel) => {
      const i = rel.lastIndexOf('/')
      const k = porDir.get(rel.slice(0, i))
      const p = k ? join(dirCaso, k, rel.slice(i + 1)) : null
      return p && existsSync(p) ? { tamanho: statSync(p).size, mtime_ns: '0' } : null
    },
  }
}

export function lerCasoDeFixture(dirCaso: string, opts: { instante?: Instante } = {}): Evidencia {
  return normalizarLegado(fonteFixture(dirCaso, opts))
}

// ─── fonte: o repo de verdade ────────────────────────────────────────────────

const mtimeDir = (d: string): number => {
  let m = 0
  try {
    for (const f of readdirSync(d)) m = Math.max(m, statSync(join(d, f)).mtimeMs / 1000)
  } catch {
    return 0
  }
  return m
}

/** A última série do meta: a sequência 1..n que termina na última entrada. */
export function serieDoMeta(meta: MetaLegado[]): MetaLegado[] {
  const out: MetaLegado[] = []
  for (let i = meta.length - 1; i >= 0; i--) {
    const m = meta[i]!
    if (out.length && m.attempt !== out[0]!.attempt - 1) break
    out.unshift(m)
    if (m.attempt === 1) break
  }
  return out
}

/**
 * O repo do legado. Só lê: `runs/` e o log pelo fs, o fonte do teste vermelho
 * por `gitLeitura` (`show <head>:<arquivo>`). `agora` fixa o relógio dos
 * vizinhos (padrão: o relógio do processo).
 */
export function fonteRepoLegado(raiz: string, id: string, opts: { agora?: number } = {}): FonteLegado {
  const runs = join(raiz, RUNS_LEGADO)
  const lerTxt = (p: string): string | null => {
    try {
      return readFileSync(p, 'utf8')
    } catch {
      return null
    }
  }
  const arquivoTicket = (() => {
    try {
      const f = readdirSync(join(raiz, 'docs/fila')).find((x) => x.startsWith(`${id}-`) && x.endsWith('.md'))
      return f ? `docs/fila/${f}` : null
    } catch {
      return null
    }
  })()
  const metaBruto = (() => {
    try {
      const v = JSON.parse(readFileSync(join(runs, id, 'meta.json'), 'utf8')) as MetaLegado | MetaLegado[]
      return Array.isArray(v) ? v : [v]
    } catch {
      return []
    }
  })()
  const metaSerie = serieDoMeta(metaBruto)
  const fim = metaSerie.at(-1)?.ts ?? null
  const fimS = fim ? Date.parse(fim) / 1000 : (opts.agora ?? Date.now()) / 1000
  const serie: { k: number; dir: string }[] = []
  for (const m of metaSerie) {
    let melhor: { m: number; d: string } | null = null
    let cands: string[] = []
    try {
      cands = readdirSync(join(runs, id)).filter((d) => d === `attempt-${m.attempt}` || d.startsWith(`attempt-${m.attempt}.prev`))
    } catch {
      cands = []
    }
    for (const c of cands) {
      const mt = mtimeDir(join(runs, id, c))
      if (mt <= fimS + FOLGA_SERIE_S && (!melhor || mt > melhor.m)) melhor = { m: mt, d: c }
    }
    if (melhor) serie.push({ k: m.attempt, dir: `${RUNS_LEGADO}/${id}/${melhor.d}` })
  }
  let logCache: Linha[] | null = null
  const log = (): Linha[] => {
    if (logCache) return logCache
    const txt = lerTxt(join(raiz, LOG_LEGADO))
    if (!txt) return (logCache = [])
    const todas = txt.split('\n')
    const re = RE_BLOQ(id)
    let fimL = -1
    for (let i = todas.length - 1; i >= 0; i--) if (re.test(todas[i]!)) { fimL = i; break }
    if (fimL < 0) return (logCache = [])
    const cab = new RegExp(String.raw`=== ticket ${escape(id)} \(.*\) — tentativa (\d+) `)
    let ini = fimL
    while (ini >= 0) {
      const m = cab.exec(todas[ini]!)
      if (m?.[1] === '1') break
      ini--
    }
    if (ini < 0) return (logCache = [])
    while (ini > 0 && !/^\[\d{4}-\d\d-\d\d /.test(todas[ini]!)) ini--
    logCache = []
    for (let i = ini; i <= fimL; i++) logCache.push({ n: i + 1, t: semAnsi(todas[i]!) })
    return logCache
  }
  const ler = (rel: string): Arquivo | null => {
    const txt = lerTxt(join(raiz, rel))
    if (txt === null) return null
    const todas = linhasDe(txt)
    if (rel.endsWith('/gate-vitest.txt')) return { rel, linhas: recortarVitest(todas), total: todas.length }
    if (rel.endsWith('/criterios.txt')) return { rel, linhas: recortarCriterios(todas), total: todas.length }
    return { rel, linhas: todas, total: todas.length }
  }
  return {
    raiz,
    id,
    ticket: () => (arquivoTicket ? { arquivo: arquivoTicket, json: blocoJson(lerTxt(join(raiz, arquivoTicket)) ?? '') } : null),
    serie: () => serie,
    meta: () => metaSerie,
    fim: () => fim,
    presenca: (dir) => {
      try {
        return readdirSync(join(raiz, dir)).sort()
      } catch {
        return null
      }
    },
    ler,
    log,
    config: () => {
      try {
        const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as Record<string, unknown>
        const num = (v: unknown) => (typeof v === 'number' ? v : null)
        return { diff_cap_linhas: num(c.diff_cap_linhas), claude_timeout_secs: num(c.claude_timeout_secs) }
      } catch {
        return { diff_cap_linhas: null, claude_timeout_secs: null }
      }
    },
    vizinhos: () => vizinhosDoRepo(raiz, runs, fimS),
    fonteDoTeste: (head, arquivo) => {
      const r = gitLeitura(raiz, ['show', `${head}:${arquivo}`])
      return r.rc === 0 ? r.stdout : null
    },
    stat: (rel) => {
      try {
        const st = statSync(join(raiz, rel), { bigint: true })
        return { tamanho: Number(st.size), mtime_ns: st.mtimeNs.toString() }
      } catch {
        return null
      }
    },
  }
}

/** Todo FAIL de `runs/*\/attempt-*\/gate-vitest.txt` com mtime nas ±6 h do fim da série. */
function vizinhosDoRepo(raiz: string, runs: string, fimS: number): Vizinho[] {
  const out: Vizinho[] = []
  let tickets: string[] = []
  try {
    tickets = readdirSync(runs)
  } catch {
    return out
  }
  for (const t of tickets) {
    let tentativas: string[] = []
    try {
      tentativas = readdirSync(join(runs, t)).filter((d) => d.startsWith('attempt-'))
    } catch {
      continue
    }
    for (const a of tentativas) {
      const p = join(runs, t, a, 'gate-vitest.txt')
      let mt: number
      try {
        mt = statSync(p).mtimeMs / 1000
      } catch {
        continue
      }
      if (Math.abs(mt - fimS) > JANELA_VIZINHO_S) continue
      const vistos = new Map<string, number>()
      for (const l of linhasDe(readFileSync(p, 'utf8'))) {
        const m = /^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)/.exec(l.t)
        if (m && !vistos.has(m[1]!)) vistos.set(m[1]!, l.n)
      }
      for (const [arquivo, linha] of vistos) {
        out.push({
          ticket: t.split('.')[0]!,
          dir: relative(raiz, join(runs, t, a)),
          arquivo,
          linha,
          ts: new Date(mt * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
          antes_do_bloqueio: mt <= fimS + FOLGA_SERIE_S,
        })
      }
    }
  }
  return out
}

export function lerRepoLegado(raiz: string, id: string, opts: { agora?: number } = {}): Evidencia {
  return normalizarLegado(fonteRepoLegado(raiz, id, opts))
}

