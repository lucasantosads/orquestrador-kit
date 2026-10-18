/**
 * modos.ts — o modo do resolvedor por repo e por classe, no `~/.orq/repos.json`
 * (decisão do chat do programa, 7f-b2).
 *
 * Campo `resolvedor` de cada item do repos.json:
 *   - ausente                          → "diagnostico" em toda classe (o padrão);
 *   - uma string ("diagnostico", "sombra" ou "auto") → a mesma em toda classe;
 *   - um objeto {"padrao": …, "R1": …, "R2": …, …} → por classe, `padrao` no resto;
 *     `r1_multi` (7f-b7): a ação de R1 com 2 ou mais testes; ausente, o modo do R1.
 *
 *   diagnostico  só tria (o diagnóstico vai para ~/.orq/diagnosticos, como o `orq triar`)
 *   sombra       tria e grava a PROPOSTA em ~/.orq/resolvedor; nunca toca o repo
 *   auto         tria e aplica a ação da classe no ticket (com as travas de acoes.ts)
 *
 * No topo do repos.json, `teto_reserva_auto` (7f-b4, `lerTetoReservaAuto`).
 * No item, `pausa_gate` (7f-b5, `pausaGateDe`): diagnostico | sombra | auto, padrão sombra.
 * No item, `pausa_donos` e `pausa_dono_max_min` (7f-b7, pausa.ts): os donos de
 * pausa planejada, que não notificam até passar do limite.
 *
 * O nome e o caminho saem de `lerRepos` (triador/saida.ts), a mesma leitura do
 * painel; este arquivo só acrescenta o campo. A promoção e o rebaixamento
 * (peça 6) regravam o campo com `gravarModo`.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { arquivoRepos, lerRepos, type RepoListado } from '../triador/saida.js'
import type { GuardaResolvedor } from './caminhos.js'

export const MODOS = ['diagnostico', 'sombra', 'auto'] as const
export type Modo = (typeof MODOS)[number]
export type Modos = { padrao: Modo } & Record<string, Modo>

export interface RepoResolvedor extends RepoListado {
  modos: Modos
  /** `pausa_gate` do item (7f-b5, peça 7): o que fazer com a pausa de gate sistêmico; padrão sombra */
  pausaGate?: Modo
  /** `pausa_donos` do item (7f-b7): pausa com `dono: X`, X na lista, não notifica até o limite */
  pausaDonos?: string[]
  /** `pausa_dono_max_min` do item (7f-b7): o limite, em minutos */
  pausaDonoMaxMin?: number
}

export const PAUSA_DONOS_PADRAO = ['publicar.sh', 'promocao-apolo']
/** Provisório (7f-b7): recalibrar pelo p95 de `pausa_fim.duracao_s` depois de 7 dias. */
export const PAUSA_DONO_MAX_MIN_PADRAO = 30
export const pausaDonosDe = (campo: unknown): string[] =>
  Array.isArray(campo) ? campo.filter((x): x is string => typeof x === 'string' && x.trim() !== '').map((x) => x.trim()) : PAUSA_DONOS_PADRAO
export const pausaDonoMaxMinDe = (campo: unknown): number => (typeof campo === 'number' && Number.isFinite(campo) && campo >= 0 ? campo : PAUSA_DONO_MAX_MIN_PADRAO)

export const PAUSA_GATE_PADRAO: Modo = 'sombra'
export const pausaGateDe = (campo: unknown): Modo => (ehModo(campo) ? campo : PAUSA_GATE_PADRAO)

const ehModo = (v: unknown): v is Modo => typeof v === 'string' && (MODOS as readonly string[]).includes(v)

export function modosDe(campo: unknown): Modos {
  if (ehModo(campo)) return { padrao: campo }
  const out: Modos = { padrao: 'diagnostico' }
  if (campo && typeof campo === 'object' && !Array.isArray(campo)) {
    for (const [k, v] of Object.entries(campo)) if (ehModo(v) && (k === 'padrao' || k === R1_MULTI || /^R[1-7]$/.test(k))) out[k] = v
  }
  return out
}

/** A subclasse do R1 com 2 ou mais testes numa ação (7f-b7): modo e contador de desfecho próprios. */
export const R1_MULTI = 'r1_multi'

/** O modo de uma chave de modo: uma classe, ou `r1_multi` (ausente: o do R1). */
export const modoDaChave = (m: Modos, chave: string): Modo => (chave === R1_MULTI ? (m[R1_MULTI] ?? modoDe(m, 'R1')) : modoDe(m, chave))

/** O modo de uma classe (`R1`, `R5?`, `R1|R2?` → a do primeiro nome). */
export function modoDe(m: Modos, classe: string | null): Modo {
  const c = (classe ?? '').replace('?', '').split('|')[0] ?? ''
  return m[c] ?? m.padrao
}

const caminhoDoItem = (it: unknown): string | null => {
  const cam = typeof it === 'string' ? it : it && typeof it === 'object' ? (it as { caminho?: unknown }).caminho : null
  return typeof cam === 'string' && cam.trim() ? resolve(cam.replace(/^~(?=\/|$)/, homedir())) : null
}

function itensCrus(): unknown[] {
  try {
    const d = JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { repos?: unknown }
    return Array.isArray(d.repos) ? d.repos : []
  } catch {
    return []
  }
}

/**
 * A fatia do teto do dia do modelo guardada para os repos em auto (7f-b4):
 * `teto_reserva_auto`, no topo do repos.json, de 0 a 1 (padrão 0.7). Os repos
 * sem classe em auto (sombra e diagnostico, juntos) só gastam até
 * (1 − teto_reserva_auto) do teto; o resto fica para os repos em auto.
 */
export const TETO_RESERVA_AUTO = 0.7

export function lerTetoReservaAuto(): number {
  try {
    const v = (JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { teto_reserva_auto?: unknown }).teto_reserva_auto
    return typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1 ? v : TETO_RESERVA_AUTO
  } catch {
    return TETO_RESERVA_AUTO
  }
}

/** Os repos do repos.json (nome e caminho como o painel lê) com os modos. */
export function lerReposResolvedor(): RepoResolvedor[] {
  const listados = lerRepos()
  const crus = itensCrus().filter((it) => caminhoDoItem(it) !== null)
  return listados.map((r, i) => {
    const it = crus[i]
    const obj = it && typeof it === 'object' ? (it as { resolvedor?: unknown; pausa_gate?: unknown; pausa_donos?: unknown; pausa_dono_max_min?: unknown }) : undefined
    return {
      ...r,
      modos: modosDe(obj?.resolvedor),
      pausaGate: pausaGateDe(obj?.pausa_gate),
      pausaDonos: pausaDonosDe(obj?.pausa_donos),
      pausaDonoMaxMin: pausaDonoMaxMinDe(obj?.pausa_dono_max_min),
    }
  })
}

/**
 * `<repo>` da linha de comando: um nome do repos.json, ou um caminho (listado
 * ou não). Repo fora do repos.json fica em "diagnostico".
 */
export function acharRepo(arg: string): RepoResolvedor {
  const rs = lerReposResolvedor()
  const porNome = rs.find((r) => r.nome === arg)
  if (porNome) return porNome
  const caminho = resolve(arg)
  return rs.find((r) => r.caminho === caminho) ?? { nome: caminho.split('/').pop()!, caminho, modos: { padrao: 'diagnostico' } }
}

/**
 * Regrava o modo de UMA classe de UM repo no repos.json (peça 6), mantendo o
 * resto do arquivo. Um item que era string vira `{caminho, resolvedor}`.
 */
export function gravarModo(g: GuardaResolvedor, caminhoRepo: string, classe: string, modo: Modo): void {
  const arq = arquivoRepos()
  const d = JSON.parse(readFileSync(arq, 'utf8')) as { repos: unknown[] }
  const i = d.repos.findIndex((it) => caminhoDoItem(it) === caminhoRepo)
  if (i < 0) throw new Error(`repos.json sem o repo ${caminhoRepo}`)
  const it = d.repos[i]
  const obj: Record<string, unknown> = typeof it === 'string' ? { caminho: it } : { ...(it as Record<string, unknown>) }
  const atual = modosDe(obj.resolvedor)
  obj.resolvedor = { ...atual, [classe]: modo }
  d.repos[i] = obj
  g.escrever(arq, JSON.stringify(d, null, 2) + '\n')
}
