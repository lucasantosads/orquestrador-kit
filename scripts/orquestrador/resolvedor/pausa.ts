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
 * Pausa com dono (7f-b7): motivo com `dono: X`, X em `pausa_donos` do repo
 * (padrão publicar.sh e promocao-apolo), é pausa planejada: a linha `pausa`
 * vai ao ledger com `notificacao: silenciada`, e só se a mesma pausa ainda
 * estiver lá depois de `pausa_dono_max_min` (padrão 30) o aviso sai, uma vez
 * (`pausa_longa`). Motivo com FALHOU notifica na hora, com ou sem dono, e leva
 * o passo que falhou (`falhou_passo`). Quando o sentinela some, ou vira outra
 * pausa, `pausa_fim` com `duracao_s` (da hora em que a pausa foi vista) e o
 * dono; só para pausa registrada a partir da 7f-b7 (a que tem `dono` no ledger).
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
import { PAUSA_DONOS_PADRAO, PAUSA_DONO_MAX_MIN_PADRAO } from './modos.js'

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

type Envio = 'enviada' | 'falhou' | 'sem_osascript' | 'nao_configurado' | 'silenciada'

/** O dono da pausa (`dono: X |`), ou `null`. */
export const donoDe = (motivo: string): string | null => /(?:^|\|)\s*dono:\s*([^|]+?)\s*(?:\||$)/.exec(motivo)?.[1] ?? null

/** Pausa de falha (FALHOU no motivo): o passo que falhou (`''` se o motivo não diz), ou `null`. */
export const passoQueFalhou = (motivo: string): string | null => (/\bFALHOU\b/.test(motivo) ? (/no passo (.+?)\s*$/.exec(motivo)?.[1] ?? '') : null)

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

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')

/** O aviso pelo macOS e pelo iMessage (se configurado). */
function notificar(titulo: string, corpo: string): { macos: Envio; imessage: Envio } {
  const macos = notificarMac(titulo, corpo)
  const destinos = destinosImessage()
  const envios = destinos.map((d) => enviarImessage(d, `${titulo}: ${corpo}`))
  const imessage: Envio = !destinos.length ? 'nao_configurado' : envios.every((e) => e === 'enviada') ? 'enviada' : envios.includes('sem_osascript') ? 'sem_osascript' : 'falhou'
  return { macos, imessage }
}

/** A última pausa do repo no ledger, se ainda sem `pausa_fim`. */
function pausaAberta(l: Entrada[], repo: string): Entrada | null {
  let ultima = -1
  l.forEach((e, i) => {
    if (e.tipo === 'pausa' && e.repo === repo) ultima = i
  })
  if (ultima < 0) return null
  const p = l[ultima]!
  return l.slice(ultima + 1).some((e) => e.tipo === 'pausa_fim' && e.repo === repo && e.sha === p.sha) ? null : p
}

/**
 * Avisa a pausa do repo se ela é nova (nenhum `pausa` no ledger com o mesmo
 * repo e sha); a pausa com dono só depois do limite. `extra` (peça 7) entra no
 * corpo e no ledger. Fecha (`pausa_fim`) a pausa aberta que sumiu ou mudou.
 */
export function avisarPausa(
  g: GuardaResolvedor,
  repo: { nome: string; caminho: string; pausaDonos?: string[]; pausaDonoMaxMin?: number },
  agora: number,
  extra?: (p: Pausa) => { texto: string; ledger: Record<string, unknown> } | null,
  l: Entrada[] = lerLedger(),
): AvisoPausa | null {
  const p = lerPausa(repo.caminho)
  const aberta = pausaAberta(l, repo.nome)
  // só a pausa registrada a partir da 7f-b7 (com `dono`, mesmo nulo) fecha: a de antes não tem hora confiável de fim
  if (aberta && 'dono' in aberta && (!p || p.sha !== aberta.sha)) {
    registrar(g, {
      ts: iso(agora),
      tipo: 'pausa_fim',
      repo: repo.nome,
      arquivo: aberta.arquivo,
      sha: aberta.sha,
      dono: aberta.dono,
      motivo: aberta.motivo,
      inicio: aberta.ts,
      duracao_s: Math.round((agora - Date.parse(String(aberta.ts))) / 1000),
    })
  }
  if (!p) return null
  const titulo = `orq: ${repo.nome} pausado`
  const ja = l.find((e) => e.tipo === 'pausa' && e.repo === repo.nome && e.sha === p.sha)
  if (ja) {
    // a pausa com dono que passou do limite: avisa uma vez
    const max = repo.pausaDonoMaxMin ?? PAUSA_DONO_MAX_MIN_PADRAO
    const minutos = Math.floor((agora - Date.parse(String(ja.ts))) / 60_000)
    if (ja.silenciosa === true && minutos >= max && !l.some((e) => e.tipo === 'pausa_longa' && e.repo === repo.nome && e.sha === p.sha)) {
      const notificacao = notificar(titulo, `${p.motivo} · pausa com dono ${String(ja.dono)} há ${minutos} min`)
      registrar(g, { ts: iso(agora), tipo: 'pausa_longa', repo: repo.nome, arquivo: p.arquivo, sha: p.sha, dono: ja.dono, motivo: p.motivo, minutos, limite_min: max, notificacao })
      return { pausa: p, notificacao }
    }
    return null
  }
  const dono = donoDe(p.motivo)
  const passo = passoQueFalhou(p.motivo)
  const comPasso = passo !== null ? { falhou_passo: passo } : {}
  if (passo === null && dono !== null && (repo.pausaDonos ?? PAUSA_DONOS_PADRAO).includes(dono)) {
    const notificacao = { macos: 'silenciada' as const, imessage: 'silenciada' as const }
    registrar(g, { ts: iso(agora), tipo: 'pausa', repo: repo.nome, arquivo: p.arquivo, sha: p.sha, motivo: p.motivo, dono, silenciosa: true, notificacao })
    return { pausa: p, notificacao }
  }
  const x = extra ? extra(p) : null
  const falhou = passo ? ` · FALHOU no passo ${passo}` : ''
  const notificacao = notificar(titulo, x ? `${p.motivo}${falhou} · ${x.texto}` : `${p.motivo}${falhou}`)
  registrar(g, {
    ts: iso(agora),
    tipo: 'pausa',
    repo: repo.nome,
    arquivo: p.arquivo,
    sha: p.sha,
    motivo: p.motivo,
    dono,
    ...comPasso,
    notificacao,
    ...(x ? x.ledger : {}),
  })
  return { pausa: p, notificacao }
}
