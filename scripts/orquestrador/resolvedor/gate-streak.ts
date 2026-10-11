/**
 * gate-streak.ts — o veredito da pausa de gate sistêmico (etapa 7f-b5, peça 7).
 *
 * O loop legado do Comarka pausa a fila quando o MESMO gate reprova dois
 * tickets seguidos (`gate_streak_pausar`, lib.sh do Comarka), com o sentinela
 *
 *     gate sistemico: "<gate>" reprovou 2 tickets seguidos (A,B) em <ts>
 *
 * Suspeita do loop: o gate, não o código. Às vezes acerta (base vermelha:
 * 760/761, 898/741a, 741a/707), às vezes erra (762/851: dois defeitos de spec
 * independentes). O veredito lê o `gate-<gate>.txt` da última tentativa de A e
 * de B ANTES da pausa e compara os arquivos de teste que falharam:
 *
 *   nenhum em comum        → falso_positivo (provável)
 *   algum em comum         → base_vermelha (provável), com os arquivos
 *   ("em comum": falhou em pelo menos dois dos tickets da pausa)
 *   artefato ausente, gate sem lista de arquivos (criterio, build, enforcement),
 *   nenhum arquivo lido, ou sinal de máquina (worker do vitest, EMFILE,
 *   ENOSPC: o 801/802 de 04/10)  → sem_veredito
 *
 * Retomada (`pausa_gate: auto` no item do repo no repos.json; padrão sombra):
 * só com falso_positivo, pelo script do próprio repo
 * (`scripts/orquestrador/orq-pause.sh --off`, nunca `rm`), no máximo uma por
 * repo a cada 6 h, nunca de novo para o mesmo par de tickets, e só se o
 * sentinela ainda é o mesmo (sha) na hora. SÓ LEITURA do repo fora disso.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { vermelhosDe } from '../triador/comum.js'
import { linhasDe } from '../triador/recorte.js'
import type { GuardaResolvedor } from './caminhos.js'
import { interruptor } from './caminhos.js'
import { lerLedger, registrar, type Entrada } from './ledger.js'
import type { Modo } from './modos.js'
import type { Pausa } from './pausa.js'

export const RUNS_LEGADO = 'docs/fila/runs'
export const JANELA_RETOMADA_MS = 6 * 3600 * 1000
const FOLGA_S = 180

export interface PausaGate {
  gate: string
  tickets: string[]
  /** a hora da pausa no sentinela (UTC), se houver */
  em: string | null
}

/** O sentinela da pausa de gate sistêmico, ou null (pausa manual, outro formato). */
export function lerPausaGate(conteudo: string): PausaGate | null {
  const m = /gate sistemico: "([^"]+)" reprovou \d+ tickets seguidos \(([^)]+)\)(?: em (\S+))?/.exec(conteudo)
  if (!m) return null
  return { gate: m[1]!, tickets: m[2]!.split(',').map((s) => s.trim()).filter(Boolean), em: m[3] ?? null }
}

/** Os gates com lista de arquivos no artefato; os outros não têm veredito. */
const ARTEFATO: Record<string, string> = { vitest: 'gate-vitest.txt', tsc: 'gate-tsc.txt' }

export interface LidoGate {
  ticket: string
  /** relativo à raiz do repo; null = não achei */
  arquivo: string | null
  falharam: string[]
  maquina: boolean
}

const mtimeS = (p: string): number => statSync(p).mtimeMs / 1000

/**
 * O artefato do gate da última tentativa do ticket até a pausa: entre
 * `attempt-N` e `attempt-N.prevK` (o legado arquiva a evidência no requeue),
 * o de mtime mais novo até a hora da pausa + 180 s.
 */
export function artefatoDoGate(raiz: string, ticket: string, gate: string, ateS: number): string | null {
  const nome = ARTEFATO[gate]
  if (!nome) return null
  const dir = join(raiz, RUNS_LEGADO, ticket)
  let cands: string[] = []
  try {
    cands = readdirSync(dir).filter((d) => /^attempt-\d+(\.prev\d+)?$/.test(d))
  } catch {
    return null
  }
  let melhor: { m: number; rel: string } | null = null
  for (const d of cands) {
    const p = join(dir, d, nome)
    if (!existsSync(p)) continue
    const m = mtimeS(p)
    if (m <= ateS + FOLGA_S && (!melhor || m > melhor.m)) melhor = { m, rel: `${RUNS_LEGADO}/${ticket}/${d}/${nome}` }
  }
  return melhor?.rel ?? null
}

/** Os arquivos que falharam num artefato do gate. */
export function falharamEm(gate: string, texto: string): { falharam: string[]; maquina: boolean } {
  const linhas = linhasDe(texto)
  if (gate === 'vitest') {
    const v = vermelhosDe({ rel: '', linhas, total: linhas.length })
    return { falharam: [...v.arquivos].sort(), maquina: v.maquina.length > 0 }
  }
  // tsc: `caminho(linha,col): error TSnnnn`
  const fs = new Set<string>()
  for (const l of linhas) {
    const m = /^(\S+?)\(\d+,\d+\): error TS\d+/.exec(l.t.trim())
    if (m) fs.add(m[1]!)
  }
  return { falharam: [...fs].sort(), maquina: false }
}

export type TipoVeredito = 'falso_positivo' | 'base_vermelha' | 'sem_veredito'

export interface Veredito {
  tipo: TipoVeredito
  gate: string
  tickets: string[]
  comuns: string[]
  motivo: string
  lidos: LidoGate[]
}

export function vereditoDaPausa(raiz: string, pg: PausaGate, agoraS: number): Veredito {
  const ateS = pg.em && !Number.isNaN(Date.parse(pg.em)) ? Date.parse(pg.em) / 1000 : agoraS
  const base = { gate: pg.gate, tickets: pg.tickets, comuns: [] as string[] }
  if (!ARTEFATO[pg.gate]) return { ...base, tipo: 'sem_veredito', motivo: `gate ${pg.gate} sem lista de arquivos no artefato`, lidos: [] }
  if (pg.tickets.length < 2) return { ...base, tipo: 'sem_veredito', motivo: 'menos de dois tickets na pausa', lidos: [] }
  const lidos: LidoGate[] = pg.tickets.map((t) => {
    const rel = artefatoDoGate(raiz, t, pg.gate, ateS)
    if (!rel) return { ticket: t, arquivo: null, falharam: [], maquina: false }
    return { ticket: t, arquivo: rel, ...falharamEm(pg.gate, readFileSync(join(raiz, rel), 'utf8')) }
  })
  const faltam = lidos.filter((l) => !l.arquivo).map((l) => l.ticket)
  if (faltam.length) return { ...base, tipo: 'sem_veredito', motivo: `artefato ausente: ${faltam.join(', ')}`, lidos }
  const maq = lidos.filter((l) => l.maquina).map((l) => l.ticket)
  if (maq.length) return { ...base, tipo: 'sem_veredito', motivo: `sinal de máquina no gate de ${maq.join(', ')}`, lidos }
  const vazios = lidos.filter((l) => !l.falharam.length).map((l) => l.ticket)
  if (vazios.length) return { ...base, tipo: 'sem_veredito', motivo: `nenhum arquivo que falhou no artefato de ${vazios.join(', ')}`, lidos }
  // em comum: o arquivo que falhou em pelo menos dois dos tickets (com o limite
  // do streak acima de 2, a pausa lista mais tickets: 655c916 no Comarka, 11/10)
  const vezes = new Map<string, number>()
  for (const l of lidos) for (const f of new Set(l.falharam)) vezes.set(f, (vezes.get(f) ?? 0) + 1)
  const comuns = [...vezes].filter(([, n]) => n >= 2).map(([f]) => f).sort()
  if (comuns.length) return { ...base, tipo: 'base_vermelha', comuns, motivo: `base vermelha provável: ${comuns.join(', ')}`, lidos }
  return { ...base, tipo: 'falso_positivo', motivo: `falso positivo provável: nenhum arquivo em comum (${lidos.map((l) => `${l.ticket}: ${l.falharam.join(', ')}`).join('; ')})`, lidos }
}

const par = (ts: string[]) => [...ts].sort().join(',')

/** Por que NÃO retomar sozinho agora; null = pode. */
export function travaRetomada(l: Entrada[], repo: string, pg: PausaGate, agora: number): string | null {
  const minhas = l.filter((e) => e.tipo === 'retomada' && e.repo === repo)
  const recente = minhas.find((e) => agora - Date.parse(e.ts) < JANELA_RETOMADA_MS)
  if (recente) return `já retomei este repo às ${recente.ts} (no máximo uma a cada 6 h)`
  if (minhas.some((e) => e.par === par(pg.tickets))) return `o par ${par(pg.tickets)} pausou de novo depois de uma retomada automática: vai para humano`
  return null
}

export interface Decisao {
  veredito: Veredito
  modo: Modo
  /** em sombra: o que faria; em auto: o que vai fazer (a retomada roda depois do aviso) */
  retomar: boolean
  porque: string
}

export function decidirPausa(raiz: string, repo: string, modo: Modo, p: Pausa, agora: number, l: Entrada[] = lerLedger()): Decisao | null {
  const pg = lerPausaGate(p.conteudo)
  if (!pg) return null
  const veredito = vereditoDaPausa(raiz, pg, agora / 1000)
  if (modo === 'diagnostico') return { veredito, modo, retomar: false, porque: 'pausa_gate em diagnostico: só o veredito' }
  if (veredito.tipo !== 'falso_positivo') return { veredito, modo, retomar: false, porque: `${veredito.tipo}: não retoma` }
  const trava = travaRetomada(l, repo, pg, agora)
  if (trava) return { veredito, modo, retomar: false, porque: trava }
  if (!existsSync(join(raiz, 'scripts/orquestrador/orq-pause.sh'))) return { veredito, modo, retomar: false, porque: 'sem scripts/orquestrador/orq-pause.sh no repo' }
  return { veredito, modo, retomar: modo === 'auto', porque: modo === 'auto' ? 'falso positivo: retomo pelo orq-pause.sh --off' : 'falso positivo: retomaria (em sombra: nada feito)' }
}

/** O texto do veredito para a notificação. */
export function textoVeredito(d: Decisao): string {
  const v = d.veredito
  const acao = d.modo === 'auto' && d.retomar ? '; retomando (auto)' : d.modo === 'sombra' && d.veredito.tipo === 'falso_positivo' ? `; ${d.porque}` : ''
  return `${v.tipo === 'falso_positivo' ? 'falso positivo provável' : v.tipo === 'base_vermelha' ? `base vermelha provável: ${v.comuns.join(', ')}` : `sem veredito: ${v.motivo}`}${acao}`
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex')

/**
 * Retoma a fila pelo script do repo, se o sentinela ainda é o da decisão e o
 * interruptor do resolvedor não foi ligado nesse meio-tempo. Grava `retomada`
 * (feita) ou `nao_agiu` no ledger.
 */
export function retomar(g: GuardaResolvedor, repo: { nome: string; caminho: string }, p: Pausa, d: Decisao, agora: number): { feito: boolean; motivo: string } {
  const ts = new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z')
  const pg = lerPausaGate(p.conteudo)!
  const nao = (motivo: string) => {
    registrar(g, { ts, tipo: 'nao_agiu', repo: repo.nome, acao: 'retomar_pausa_gate', modo: d.modo, motivo, sha: p.sha, par: par(pg.tickets) })
    return { feito: false, motivo }
  }
  if (existsSync(interruptor())) return nao('interruptor do resolvedor ligado')
  let agoraConteudo: string | null = null
  try {
    agoraConteudo = readFileSync(join(repo.caminho, p.arquivo), 'utf8')
  } catch {
    agoraConteudo = null
  }
  if (agoraConteudo === null) return nao('a pausa já saiu (sentinela ausente)')
  if (sha(agoraConteudo) !== p.sha) return nao('o sentinela mudou desde a leitura: outra pausa')
  const script = join(repo.caminho, 'scripts/orquestrador/orq-pause.sh')
  const r = spawnSync('bash', [script, '--off'], { cwd: repo.caminho, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })
  const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim().slice(0, 300)
  const saiu = !existsSync(join(repo.caminho, p.arquivo))
  if (r.status !== 0 || !saiu) return nao(`orq-pause.sh --off rc ${r.status}${saiu ? '' : ', sentinela ainda lá'}: ${saida}`)
  registrar(g, { ts, tipo: 'retomada', repo: repo.nome, sha: p.sha, par: par(pg.tickets), gate: pg.gate, veredito: d.veredito.tipo, script: 'scripts/orquestrador/orq-pause.sh --off', saida })
  return { feito: true, motivo: saida }
}
