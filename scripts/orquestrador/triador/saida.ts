/**
 * saida.ts — onde o triador escreve, e a única porta de escrita dele (spec
 * 7f-a §1, §5 e §6, regra 1).
 *
 * Raiz: `ORQ_DIAG_DIR`, ou `~/.orq/diagnosticos`. Dentro dela:
 *   <repo>/<id>.json                       o diagnóstico atual
 *   <repo>/<id>.lock                       a trava (O_EXCL, pid e hora; órfã depois de 10 min)
 *   <repo>/<id>/historico/<assin12>.json   os anteriores
 *   <repo>/<id>/<assin12>/evidencia/…      a cópia mascarada do que foi lido
 *   custo.json                             o ledger do modelo (peça 5)
 *
 * GUARDA: toda escrita passa por `Guarda`, que resolve o caminho real e LANÇA
 * (não avisa) se o destino não está sob a raiz, ou se está sob qualquer
 * caminho do `repos.json` ou sob o repo que está sendo triado.
 */
import { createHash } from 'node:crypto'
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { mascarar } from './mascara.js'
import type { Evidencia } from './tipos.js'

export class EscritaRecusada extends Error {}

export function raizDiagnosticos(): string {
  return resolve(process.env.ORQ_DIAG_DIR || join(homedir(), '.orq', 'diagnosticos'))
}

export function arquivoRepos(): string {
  return process.env.ORQ_REPOS || join(homedir(), '.orq', 'repos.json')
}

export interface RepoListado {
  nome: string
  caminho: string
}

/** `~/.orq/repos.json` como o painel lê (`orq-painel.py:ler_repos`): nome padrão é o do diretório. */
export function lerRepos(): RepoListado[] {
  try {
    const d = JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { repos?: unknown }
    const itens = Array.isArray(d.repos) ? d.repos : []
    const out: RepoListado[] = []
    for (const it of itens) {
      const cam = typeof it === 'string' ? it : it && typeof it === 'object' ? (it as { caminho?: unknown }).caminho : null
      if (typeof cam !== 'string' || !cam.trim()) continue
      const caminho = resolve(cam.replace(/^~(?=\/|$)/, homedir()))
      const nomeDado = it && typeof it === 'object' ? (it as { nome?: unknown }).nome : null
      let nome = typeof nomeDado === 'string' && nomeDado.trim() ? nomeDado : caminho.split(sep).pop()!
      const base = nome
      for (let n = 2; out.some((r) => r.nome === nome); n++) nome = `${base}-${n}`
      out.push({ nome, caminho })
    }
    return out
  } catch {
    return []
  }
}

/** O caminho real, mesmo que ainda não exista: realpath do ancestral que existe + o resto. */
export function caminhoReal(p: string): string {
  const abs = resolve(p)
  let base = abs
  const resto: string[] = []
  while (!existsSync(base)) {
    const pai = dirname(base)
    if (pai === base) break
    resto.unshift(base.slice(pai.length + (pai.endsWith(sep) ? 0 : 1)))
    base = pai
  }
  return join(realpathSync(base), ...resto)
}

const dentro = (filho: string, pai: string) => {
  const r = relative(pai, filho)
  return r === '' || (!r.startsWith('..') && !isAbsolute(r))
}

export class Guarda {
  readonly raiz: string
  private readonly protegidos: string[]

  constructor(protegidosExtra: string[] = []) {
    this.raiz = caminhoReal(raizDiagnosticos())
    this.protegidos = [...lerRepos().map((r) => r.caminho), ...protegidosExtra].map((p) => caminhoReal(p))
    for (const p of this.protegidos) {
      if (dentro(this.raiz, p)) throw new EscritaRecusada(`raiz de diagnósticos ${this.raiz} está dentro do repo ${p}`)
    }
  }

  /** O destino real, ou exceção se ele cai fora da raiz ou dentro de um repo. */
  confere(destino: string): string {
    const real = caminhoReal(destino)
    if (!dentro(real, this.raiz)) throw new EscritaRecusada(`escrita fora de ${this.raiz}: ${real}`)
    for (const p of this.protegidos) if (dentro(real, p)) throw new EscritaRecusada(`escrita dentro do repo ${p}: ${real}`)
    return real
  }

  mkdir(d: string): void {
    mkdirSync(this.confere(d), { recursive: true })
  }

  escrever(destino: string, conteudo: string): void {
    const real = this.confere(destino)
    mkdirSync(this.confere(dirname(real)), { recursive: true })
    writeFileSync(real, conteudo)
  }

  mover(de: string, para: string): void {
    const a = this.confere(de)
    const b = this.confere(para)
    mkdirSync(this.confere(dirname(b)), { recursive: true })
    renameSync(a, b)
  }

  apagar(p: string): void {
    unlinkSync(this.confere(p))
  }

  /** Cria com O_EXCL; false se já existe. */
  criarExclusivo(p: string, conteudo: string): boolean {
    const real = this.confere(p)
    mkdirSync(this.confere(dirname(real)), { recursive: true })
    let fd: number
    try {
      fd = openSync(real, 'wx')
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false
      throw e
    }
    try {
      writeSync(fd, conteudo)
    } finally {
      closeSync(fd)
    }
    return true
  }
}

// ─── assinatura ──────────────────────────────────────────────────────────────

/**
 * sha256(repo | id | status | notas_status | para cada arquivo lido, em ordem:
 * nome, mtime_ns, tamanho). Mesma assinatura: não roda de novo (§1).
 */
export function assinatura(ev: Evidencia): string {
  const h = createHash('sha256')
  h.update([ev.repo, ev.id, ev.ticket?.status ?? '', ev.ticket?.notas_status ?? ''].join('|'))
  for (const l of [...ev.lidos].sort((a, b) => a.arquivo.localeCompare(b.arquivo))) {
    h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
  }
  // sem tentativa, o diagnóstico é o estado das dependências (7f-b3): uma
  // dependência que fica done muda a assinatura e o ticket é triado de novo
  if (!ev.tentativas.length && ev.dependencias?.length) h.update(`|deps|${ev.dependencias.map((d) => `${d.dep}=${d.estado}`).join(',')}`)
  return h.digest('hex')
}

// ─── trava ───────────────────────────────────────────────────────────────────

export const TRAVA_ORFA_MS = 10 * 60 * 1000

/** A trava do ticket. `null` se outro processo a segura (e ela não é órfã). */
export function travar(g: Guarda, repo: string, id: string, agora = Date.now()): (() => void) | null {
  const p = join(g.raiz, repo, `${id}.lock`)
  const corpo = JSON.stringify({ pid: process.pid, hora: new Date(agora).toISOString() }) + '\n'
  if (!g.criarExclusivo(p, corpo)) {
    let idade = 0
    try {
      idade = agora - statSync(p).mtimeMs
    } catch {
      idade = TRAVA_ORFA_MS + 1
    }
    if (idade <= TRAVA_ORFA_MS) return null
    try {
      g.apagar(p)
    } catch {
      /* outro processo levou a órfã */
    }
    if (!g.criarExclusivo(p, corpo)) return null
  }
  return () => {
    try {
      g.apagar(p)
    } catch {
      /* já saiu */
    }
  }
}

// ─── diagnóstico e cópia ─────────────────────────────────────────────────────

export const caminhoDiagnostico = (g: Guarda, repo: string, id: string) => join(g.raiz, repo, `${id}.json`)

export function lerDiagnostico<T>(g: Guarda, repo: string, id: string): T | null {
  try {
    return JSON.parse(readFileSync(caminhoDiagnostico(g, repo, id), 'utf8')) as T
  } catch {
    return null
  }
}

/** Grava o atual; o anterior (se havia) vai para `historico/<assinatura12>.json`. */
export function gravarDiagnostico(g: Guarda, repo: string, id: string, diag: { assinatura: string }): void {
  const atual = caminhoDiagnostico(g, repo, id)
  const anterior = lerDiagnostico<{ assinatura?: string }>(g, repo, id)
  if (anterior) {
    const base = join(g.raiz, repo, id, 'historico', (anterior.assinatura ?? 'sem-assinatura').slice(0, 12))
    let destino = `${base}.json`
    for (let n = 2; existsSync(destino); n++) destino = `${base}-${n}.json`
    g.mover(atual, destino)
  }
  g.escrever(atual, JSON.stringify(diag, null, 2) + '\n')
}

/** A cópia do que foi lido, já recortado e mascarado (§2, "Cópia da evidência"). */
export function copiarEvidencia(g: Guarda, repo: string, ev: Evidencia, assin: string): string {
  const dir = join(g.raiz, repo, ev.id, assin.slice(0, 12), 'evidencia')
  for (const l of ev.lidos) {
    if (isAbsolute(l.arquivo) || l.arquivo.split('/').includes('..')) continue
    g.escrever(join(dir, l.arquivo), mascarar(l.conteudo))
    if (l.faixas) g.escrever(join(dir, `${l.arquivo}.linhas.json`), JSON.stringify({ faixas: l.faixas }) + '\n')
  }
  return dir
}
