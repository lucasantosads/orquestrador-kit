/**
 * decidir.ts — a ação de um ticket bloqueado, pela classe do diagnóstico e
 * pelo modo do repo (decisões do chat do programa, 7f-b2). PURO.
 *
 * | classe (regra)              | auto              | sombra   | diagnostico |
 * |-----------------------------|-------------------|----------|-------------|
 * | R5 árvore suja (D1), firme  | reabrir           | proposta | nada        |
 * | R5 máquina (D4), firme      | reabrir           | proposta | nada        |
 * | R5 base vermelha (D5)       | aviso             | aviso    | nada        |
 * | R1 (D6), firme              | allowlist + guarda, reabrir | proposta | nada |
 * | R2 (firme ou palpite)       | proposta (nunca aplica nesta etapa) | proposta | nada |
 * | R3, R4, R6, R7              | aviso             | aviso    | nada        |
 * | palpite (`?`) fora de R2, sem classe | aviso    | aviso    | nada        |
 *
 * Só diagnóstico FIRME da extração dispara ação que escreve no repo: a resposta
 * do modelo nunca é firme (triador, §13.5). R2 é a exceção que só propõe, e por
 * isso aceita o palpite (o 929 sai `R2?` pela D12).
 */
import { modoDe, type Modo, type Modos } from './modos.js'

export type TipoAcao = 'r1_allowlist' | 'r5_reabrir' | 'r2_proposta' | 'sombra' | 'aviso' | 'diagnostico'

export interface Decisao {
  acao: TipoAcao
  /** a ação que o modo sombra propõe (r1_allowlist ou r5_reabrir) */
  propoe?: 'r1_allowlist' | 'r5_reabrir'
  modo: Modo
  motivo: string
}

export interface DiagnosticoMin {
  classe: string | null
  regra: string | null
  firme: boolean
  fonte?: string
}

export function decidir(d: DiagnosticoMin, modos: Modos): Decisao {
  const modo = modoDe(modos, d.classe)
  const base = (d.classe ?? '').replace('?', '')
  if (modo === 'diagnostico') return { acao: 'diagnostico', modo, motivo: `modo diagnostico para ${base || 'sem classe'}` }
  if (base === 'R2') {
    return { acao: 'r2_proposta', modo, motivo: modo === 'auto' ? 'R2 em auto: nesta etapa só propõe, nunca aplica' : 'R2 em sombra: só proposta' }
  }
  const firme = d.firme && d.fonte !== 'modelo'
  const aplica = (acao: 'r1_allowlist' | 'r5_reabrir', o: string): Decisao =>
    modo === 'auto' ? { acao, modo, motivo: o } : { acao: 'sombra', propoe: acao, modo, motivo: `${o} (em sombra: só proposta)` }
  if (base === 'R1' && firme && d.regra === 'D6') return aplica('r1_allowlist', 'R1 firme (D6): teste acoplado na allowlist com guarda')
  if (base === 'R5' && firme && d.regra === 'D1') return aplica('r5_reabrir', 'R5 árvore suja (D1): reabre quando a árvore alvo estiver limpa')
  if (base === 'R5' && firme && d.regra === 'D4') return aplica('r5_reabrir', 'R5 máquina (D4): reabre quando a máquina estiver livre')
  if (base === 'R5' && d.regra === 'D5') return { acao: 'aviso', modo, motivo: 'R5 base vermelha: só diagnóstico nesta etapa' }
  if (!d.classe) return { acao: 'aviso', modo, motivo: 'sem classe: decisão humana' }
  if (!firme && (base === 'R1' || base === 'R5' || d.classe.includes('|'))) return { acao: 'aviso', modo, motivo: `${d.classe} é palpite: o resolvedor só age em diagnóstico firme` }
  return { acao: 'aviso', modo, motivo: `${d.classe}: só diagnóstico e aviso (decisão humana)` }
}
