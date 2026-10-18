/**
 * desfecho.ts — o que aconteceu DEPOIS de cada ação e de cada proposta
 * (etapa 7f-b2, peça 5). Roda no começo de cada passada, repo a repo, antes da
 * triagem; só lê o repo e acrescenta no ledger.
 *
 * Ação aplicada (`acao` sem desfecho), olhando o ticket agora:
 *   done              bom: tempo da ação até o done
 *   bloqueou_de_novo  ruim (e o segundo bloqueio vai para humano: acoes.ts)
 *   limite_apos_r1    bloqueou de novo por limite de linhas (`NO_TETO` com
 *                     `ESTOUROU_<n>`, ou `diff grande`) (7f-b7): nem bom nem
 *                     ruim (bom: null); notifica uma vez e grava
 *                     `proposta_limite` (o limite atual e o tamanho que
 *                     reprovou). Só proposta: o resolvedor nunca altera limite
 *   humano_mexeu      ruim: o json do ticket, fora dos campos que o motor
 *                     escreve (status, notas_status, tentativas,
 *                     adiamentos_ambiente), não é mais o que o resolvedor gravou
 *   (pendente, em andamento: ainda sem desfecho)
 *
 * O desfecho leva `subclasse`: `r1_multi` quando a ação pôs 2 ou mais testes
 * (7f-b7), senão a classe; o rebaixamento conta por ela (promocao.ts).
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
import { R1_MULTI } from './modos.js'
import { notificar } from './pausa.js'
import { rodarEm } from './r2.js'

/** Os campos que o motor escreve no ticket: a lista única do motor (etapa 8b), a mesma do lib.sh. */
export const CAMPOS_DO_MOTOR: readonly string[] = JSON.parse(readFileSync(new URL('../campos-do-motor.json', import.meta.url), 'utf8'))
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

/**
 * A reprova por limite de linhas na nota do bloqueio, com o limite atual do
 * ticket: `criterio[i] … obteve '…ESTOUROU_<n>'` (o limite é o `-le <L>` do
 * cmd daquele critério) ou `diff grande (<n> linhas > <L>)` (o diff_cap).
 */
export function limiteDaNota(nota: string, j: Record<string, unknown>): { criterio: string; limite_atual: number | null; diff_reprovou: number } | null {
  const c = /criterio\[(\d+)\][^']*'[^']*', obteve '[^']*ESTOUROU_(\d+)/.exec(nota)
  if (c) {
    const cr = (Array.isArray(j.criterios_aceite) ? j.criterios_aceite : [])[Number(c[1])] as { cmd?: unknown; descricao?: unknown } | undefined
    const l = /-le (\d+)/.exec(String(cr?.cmd ?? '')) ?? /<= ?(\d+)/.exec(String(cr?.descricao ?? ''))
    return { criterio: `criterio[${c[1]}]`, limite_atual: l ? Number(l[1]) : null, diff_reprovou: Number(c[2]) }
  }
  const d = /diff grande \((\d+) linhas > (\d+)\)/.exec(nota)
  return d ? { criterio: 'diff_cap', limite_atual: Number(d[2]), diff_reprovou: Number(d[1]) } : null
}

/** A subclasse de uma ação para o contador de desfecho: `r1_multi` com 2 ou mais testes, senão a classe. */
export const subclasseDe = (a: Entrada): string =>
  Array.isArray(a.testes) && a.testes.length >= 2 ? R1_MULTI : String(a.classe ?? '').replace('?', '').split('|')[0]!

export function apurarAcoes(g: GuardaResolvedor, repo: { nome: string; caminho: string }, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
  const fechadas = new Set(l.filter((e) => e.tipo === 'desfecho' && e.repo === repo.nome).map((e) => e.commit))
  const novos: Entrada[] = []
  for (const a of l.filter((e) => e.tipo === 'acao' && e.repo === repo.nome && !fechadas.has(e.commit))) {
    const arq = join(repo.caminho, String(a.arquivo))
    const agoraJ = existsSync(arq) ? lerJson(arq) : null
    const gravado = typeof a.copia === 'string' ? lerJson(join(a.copia, 'depois.md')) : null
    let desfecho: string | null = null
    let limite: ReturnType<typeof limiteDaNota> = null
    if (!agoraJ) desfecho = 'humano_mexeu'
    else if (gravado && !isDeepStrictEqual(semMotor(agoraJ), semMotor(gravado))) desfecho = 'humano_mexeu'
    else if (agoraJ.status === 'done') desfecho = 'done'
    else if (agoraJ.status === 'bloqueado') {
      limite = limiteDaNota(String(agoraJ.notas_status ?? ''), agoraJ)
      desfecho = limite ? 'limite_apos_r1' : 'bloqueou_de_novo'
    }
    if (!desfecho) continue
    const subclasse = subclasseDe(a)
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
      subclasse,
      bom: limite ? null : !DESFECHO_RUIM.has(desfecho),
      tempo_ate_destravar_s: a.tempo_ate_destravar_s ?? null,
      tempo_ate_desfecho_s: segs(a.ts, agora),
      ...(desfecho === 'humano_mexeu' && !agoraJ ? { motivo: 'o arquivo do ticket sumiu' } : {}),
    }
    registrar(g, e)
    novos.push(e)
    if (limite) {
      const proposta = `subir o limite de ${limite.criterio} de ${limite.limite_atual ?? '?'} para pelo menos ${limite.diff_reprovou} linhas (só proposta: o resolvedor nunca altera limite)`
      const notificacao = notificar(`orq: ${repo.nome} ${String(a.id)} reprovou por limite`, `depois do resolvedor (${String(a.acao)}): ${limite.criterio} com limite ${limite.limite_atual ?? '?'}, o diff deu ${limite.diff_reprovou}`)
      registrar(g, { ts: iso(agora), tipo: 'proposta_limite', repo: repo.nome, id: a.id, commit: a.commit, acao: a.acao, subclasse, ...limite, proposta, notificacao })
    }
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
