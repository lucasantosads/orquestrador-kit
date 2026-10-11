/**
 * pausa.ts — aviso de pausa da fila (etapa 7f-b5, peça 6).
 *
 * A cada passada, para cada repo do repos.json, o sentinela de pausa: o
 * `pausar_file` do `docs/fila/000-config.json`, `docs/fila/PAUSAR` (kit,
 * CONTRATO §7) ou o legado `docs/fila/.orq-pause` (Comarka), o primeiro que
 * existir, como o `pausa_motivo` do kit. Pausa nova, pelo conteúdo (sha256),
 * vira UMA vez:
 *   - notificação do macOS: `osascript`, título `orq: <repo> pausado` e a
 *     primeira linha do motivo (sem o `AAAA-MM-DD HH:MM | ` do `orq pausar`);
 *   - com `notificar.imessage` no topo do repos.json (um destinatário ou uma
 *     lista; quem preenche é o humano), também uma mensagem pelo Messages;
 *   - uma linha `tipo: pausa` no ledger (é ela que marca "já avisei").
 * Os textos vão ao AppleScript por `argv` (`on run argv`), nunca colados no
 * script: aspas no motivo não quebram nem injetam nada.
 *
 * O sentinela só é LIDO: o resolvedor nunca cria, muda nem apaga pausa.
 */
import { createHash } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { arquivoRepos } from '../triador/saida.js'
import type { GuardaResolvedor } from './caminhos.js'
import { lerLedger, registrar, type Entrada } from './ledger.js'

export interface Pausa {
  /** relativo à raiz do repo */
  arquivo: string
  conteudo: string
  sha: string
  /** a primeira linha não vazia, sem o carimbo `AAAA-MM-DD HH:MM | ` */
  motivo: string
}

const SENTINELAS = ['docs/fila/PAUSAR', 'docs/fila/.orq-pause']

export function lerPausa(raiz: string): Pausa | null {
  let cfg: string | null = null
  try {
    const c = (JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { pausar_file?: unknown }).pausar_file
    cfg = typeof c === 'string' && c.trim() ? c : null
  } catch {
    cfg = null
  }
  for (const rel of [...new Set([...(cfg ? [cfg] : []), ...SENTINELAS])]) {
    const p = join(raiz, rel)
    if (!existsSync(p)) continue
    let conteudo = ''
    try {
      conteudo = readFileSync(p, 'utf8')
    } catch {
      conteudo = ''
    }
    const linha = conteudo.split('\n').map((l) => l.trim()).find(Boolean) ?? ''
    const motivo = linha.replace(/^\d{4}-\d\d-\d\d \d\d:\d\d \| /, '') || '(sem motivo)'
    return { arquivo: rel, conteudo, sha: createHash('sha256').update(conteudo).digest('hex'), motivo }
  }
  return null
}

/** `notificar.imessage` do topo do repos.json: um destinatário ou uma lista. */
export function destinosImessage(): string[] {
  try {
    const n = (JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { notificar?: { imessage?: unknown } }).notificar?.imessage
    const xs = Array.isArray(n) ? n : [n]
    return xs.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim())
  } catch {
    return []
  }
}

type Envio = 'enviada' | 'falhou' | 'sem_osascript' | 'nao_configurado'

function osascript(linhas: string[], args: string[]): Envio {
  const r = spawnSync('osascript', [...linhas.flatMap((l) => ['-e', l]), ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 30_000 })
  if (r.error && (r.error as NodeJS.ErrnoException).code === 'ENOENT') return 'sem_osascript'
  return r.status === 0 ? 'enviada' : 'falhou'
}

export function notificarMac(titulo: string, corpo: string): Envio {
  return osascript(['on run argv', 'display notification (item 2 of argv) with title (item 1 of argv)', 'end run'], [titulo, corpo])
}

export function enviarImessage(destino: string, texto: string): Envio {
  return osascript(
    [
      'on run argv',
      'tell application "Messages"',
      'set s to 1st account whose service type = iMessage',
      'send (item 2 of argv) to participant (item 1 of argv) of s',
      'end tell',
      'end run',
    ],
    [destino, texto],
  )
}

export interface AvisoPausa {
  pausa: Pausa
  notificacao: { macos: Envio; imessage: Envio }
}

/**
 * Avisa a pausa do repo se ela é nova (nenhum `pausa` no ledger com o mesmo
 * repo e sha). `extra` (peça 7) entra no corpo e no ledger.
 */
export function avisarPausa(
  g: GuardaResolvedor,
  repo: { nome: string; caminho: string },
  agora: number,
  extra?: (p: Pausa) => { texto: string; ledger: Record<string, unknown> } | null,
  l: Entrada[] = lerLedger(),
): AvisoPausa | null {
  const p = lerPausa(repo.caminho)
  if (!p) return null
  if (l.some((e) => e.tipo === 'pausa' && e.repo === repo.nome && e.sha === p.sha)) return null
  const x = extra ? extra(p) : null
  const titulo = `orq: ${repo.nome} pausado`
  const corpo = x ? `${p.motivo} · ${x.texto}` : p.motivo
  const macos = notificarMac(titulo, corpo)
  const destinos = destinosImessage()
  const envios = destinos.map((d) => enviarImessage(d, `${titulo}: ${corpo}`))
  const imessage: Envio = !destinos.length ? 'nao_configurado' : envios.every((e) => e === 'enviada') ? 'enviada' : envios.includes('sem_osascript') ? 'sem_osascript' : 'falhou'
  registrar(g, {
    ts: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z'),
    tipo: 'pausa',
    repo: repo.nome,
    arquivo: p.arquivo,
    sha: p.sha,
    motivo: p.motivo,
    notificacao: { macos, imessage },
    ...(x ? x.ledger : {}),
  })
  return { pausa: p, notificacao: { macos, imessage } }
}
