/**
 * desfecho.ts — o que aconteceu DEPOIS de cada ação e de cada proposta
 * (etapa 7f-b2, peça 5). Roda no começo de cada passada, repo a repo, antes da
 * triagem; só lê o repo e acrescenta no ledger.
 *
 * Ação aplicada (`acao` sem desfecho), olhando o ticket agora:
 *   done              bom: tempo da ação até o done
 *   bloqueou_de_novo  ruim (e o segundo bloqueio vai para humano: acoes.ts)
 *   humano_mexeu      ruim: o json do ticket, fora dos campos que o motor
 *                     escreve (status, notas_status, tentativas,
 *                     adiamentos_ambiente), não é mais o que o resolvedor gravou
 *   (pendente, em andamento: ainda sem desfecho)
 *
 * Proposta de R2 (`proposta` sem `comparacao`), contra o conserto humano:
 *   acerto  o cmd do critério virou o proposto (igual), ou outro que dá a
 *           mesma saída nos estados da prova (equivalente: o snapshot guardado
 *           na proposta, não o branch alvo de agora, que já andou)
 *   erro    outro cmd com saída diferente, ou o ticket saiu de bloqueado sem o
 *           humano trocar o cmd
 *   (o ticket ainda bloqueado com o cmd antigo: espera)
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDeepStrictEqual } from 'node:util'
import { blocoJson } from '../triador/comum.js'
import type { GuardaResolvedor } from './caminhos.js'
import { lerLedger, registrar, type Entrada } from './ledger.js'
import { rodarEm } from './r2.js'

export const CAMPOS_DO_MOTOR = ['status', 'notas_status', 'tentativas', 'adiamentos_ambiente']
export const DESFECHO_RUIM = new Set(['bloqueou_de_novo', 'humano_mexeu', 'desfeito'])

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const semMotor = (j: Record<string, unknown>) => Object.fromEntries(Object.entries(j).filter(([k]) => !CAMPOS_DO_MOTOR.includes(k)))
const segs = (de: unknown, ate: number) => (typeof de === 'string' && !Number.isNaN(Date.parse(de)) ? Math.round((ate - Date.parse(de)) / 1000) : null)

function lerJson(p: string): Record<string, unknown> | null {
  try {
    return blocoJson(readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

export function apurarAcoes(g: GuardaResolvedor, repo: { nome: string; caminho: string }, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
  const fechadas = new Set(l.filter((e) => e.tipo === 'desfecho' && e.repo === repo.nome).map((e) => e.commit))
  const novos: Entrada[] = []
  for (const a of l.filter((e) => e.tipo === 'acao' && e.repo === repo.nome && !fechadas.has(e.commit))) {
    const arq = join(repo.caminho, String(a.arquivo))
    const agoraJ = existsSync(arq) ? lerJson(arq) : null
    const gravado = typeof a.copia === 'string' ? lerJson(join(a.copia, 'depois.md')) : null
    let desfecho: string | null = null
    if (!agoraJ) desfecho = 'humano_mexeu'
    else if (gravado && !isDeepStrictEqual(semMotor(agoraJ), semMotor(gravado))) desfecho = 'humano_mexeu'
    else if (agoraJ.status === 'done') desfecho = 'done'
    else if (agoraJ.status === 'bloqueado') desfecho = 'bloqueou_de_novo'
    if (!desfecho) continue
    const e: Entrada = {
      ts: iso(agora),
      tipo: 'desfecho',
      repo: repo.nome,
      id: a.id,
      classe: a.classe ?? null,
      regra: a.regra ?? null,
      assinatura: a.assinatura,
      acao: a.acao,
      commit: a.commit,
      acao_ts: a.ts,
      desfecho,
      bom: !DESFECHO_RUIM.has(desfecho),
      tempo_ate_destravar_s: a.tempo_ate_destravar_s ?? null,
      tempo_ate_desfecho_s: segs(a.ts, agora),
      ...(desfecho === 'humano_mexeu' && !agoraJ ? { motivo: 'o arquivo do ticket sumiu' } : {}),
    }
    registrar(g, e)
    novos.push(e)
  }
  return novos
}

interface PropostaJson {
  arquivo: string
  indice: number
  criterio: string
  espera: string
  cmd_antigo: string
  cmd_novo: string
  gerada_em: string
  arvores?: { nao_feito: Record<string, string>; head: Record<string, string> | null }
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')

/** Mesma saída (abortou, passa, saída) nos estados da prova? */
function equivalentes(p: PropostaJson, humano: string): boolean {
  const estados = [p.arvores?.nao_feito, p.arvores?.head].filter((x): x is Record<string, string> => !!x)
  if (!estados.length) return false
  return estados.every((a) => {
    const [x, y] = rodarEm(a, [['novo', p.cmd_novo], ['humano', humano]], p.espera)
    return x!.abortou === y!.abortou && x!.passa === y!.passa && x!.saida === y!.saida
  })
}

export function apurarPropostas(g: GuardaResolvedor, repo: { nome: string; caminho: string }, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
  const comparadas = new Set(l.filter((e) => e.tipo === 'comparacao' && e.repo === repo.nome).map((e) => `${e.id}|${e.proposta_ts}`))
  const novos: Entrada[] = []
  for (const pr of l.filter((e) => e.tipo === 'proposta' && e.repo === repo.nome && e.acao === 'r2_proposta' && !comparadas.has(`${e.id}|${e.ts}`))) {
    let p: PropostaJson
    try {
      p = JSON.parse(readFileSync(String(pr.proposta_json), 'utf8')) as PropostaJson
    } catch {
      continue
    }
    const j = lerJson(join(repo.caminho, p.arquivo))
    if (!j) continue
    const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
    const atual = cs[p.indice]?.cmd
    let resultado: 'acerto' | 'erro' | null = null
    let como = ''
    if (typeof atual !== 'string' || norm(atual) === norm(p.cmd_antigo)) {
      if (j.status === 'bloqueado') continue
      resultado = 'erro'
      como = 'humano_nao_trocou'
    } else if (norm(atual) === norm(p.cmd_novo)) {
      resultado = 'acerto'
      como = 'igual'
    } else if (equivalentes(p, atual)) {
      resultado = 'acerto'
      como = 'equivalente'
    } else {
      resultado = 'erro'
      como = 'diferente'
    }
    const e: Entrada = {
      ts: iso(agora),
      tipo: 'comparacao',
      repo: repo.nome,
      id: pr.id,
      classe: 'R2',
      regra: pr.regra ?? null,
      assinatura: pr.assinatura,
      proposta_ts: pr.ts,
      criterio: p.criterio,
      resultado,
      como,
      ...(typeof atual === 'string' ? { cmd_humano: atual } : {}),
      tempo_ate_conserto_s: segs(pr.ts, agora),
    }
    registrar(g, e)
    novos.push(e)
  }
  return novos
}

/**
 * "Não consegui" e aviso: uma linha por (ticket, assinatura, motivo). A passada
 * de 300 s não enche o ledger com o mesmo motivo.
 */
export function registrarSemAcao(g: GuardaResolvedor, e: Entrada, l: Entrada[] = lerLedger()): boolean {
  const ult = [...l].reverse().find((x) => (x.tipo === 'nao_agiu' || x.tipo === 'aviso') && x.repo === e.repo && x.id === e.id)
  if (ult && ult.tipo === e.tipo && ult.assinatura === e.assinatura && ult.motivo === e.motivo) return false
  registrar(g, e)
  return true
}
