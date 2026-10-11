/**
 * ledger.ts — `~/.orq/resolvedor/ledger.jsonl`: uma linha JSON por fato, só
 * acrescentada (etapa 7f-b2).
 *
 *   acao        uma ação aplicada no repo: classe, regra, assinatura, o que
 *               mudou, commit, arquivo, a cópia do antes/depois (`acoes/<ts>/`,
 *               o desfazer usa) e `tempo_ate_destravar_s` (do bloqueio à ação)
 *   proposta    uma proposta em sombra gravada (R2 sempre; R1/R5 no modo sombra)
 *   nao_agiu    "não consegui", com o motivo (uma linha por assinatura e motivo)
 *   aviso       classe sem ação (R3, R4, R6, R7, base vermelha, palpite)
 *   desfecho    o fim de uma ação: done, bloqueou_de_novo, humano_mexeu ou
 *               desfeito, `bom`, e os tempos (desfecho.ts)
 *   comparacao  proposta de R2 contra o conserto humano: acerto ou erro (desfecho.ts)
 *   promocao, rebaixamento   o modo de uma classe mudou sozinho (peça 6)
 *   desfeito    `orq desfazer` reverteu uma ação (peça 7)
 */
import { readFileSync } from 'node:fs'
import { arquivoLedger, type GuardaResolvedor } from './caminhos.js'

export interface Entrada {
  ts: string
  tipo: string
  repo: string
  id?: string | undefined
  classe?: string | null | undefined
  regra?: string | null | undefined
  assinatura?: string | undefined
  [k: string]: unknown
}

export function lerLedger(): Entrada[] {
  let txt = ''
  try {
    txt = readFileSync(arquivoLedger(), 'utf8')
  } catch {
    return []
  }
  const out: Entrada[] = []
  for (const l of txt.split('\n')) {
    if (!l.trim()) continue
    try {
      out.push(JSON.parse(l) as Entrada)
    } catch {
      /* linha cortada: ignora, o resto vale */
    }
  }
  return out
}

export function registrar(g: GuardaResolvedor, e: Entrada): void {
  g.acrescentar(arquivoLedger(), JSON.stringify(e))
}

/** As ações aplicadas num ticket, da mais antiga à mais nova. */
export const acoesDe = (l: Entrada[], repo: string, id: string): Entrada[] => l.filter((e) => e.tipo === 'acao' && e.repo === repo && e.id === id)
