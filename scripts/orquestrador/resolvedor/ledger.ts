/**
 * ledger.ts — `~/.orq/resolvedor/ledger.jsonl`: uma linha JSON por fato, só
 * acrescentada (etapa 7f-b2).
 *
 *   acao        uma ação aplicada no repo: classe, regra, assinatura, o que
 *               mudou, commit, arquivo, e a cópia do antes/depois
 *               (`acoes/<ts>/`, o desfazer usa)
 */
import { readFileSync } from 'node:fs'
import { arquivoLedger, type GuardaResolvedor } from './caminhos.js'

export interface Entrada {
  ts: string
  tipo: string
  repo: string
  id?: string
  classe?: string | null
  regra?: string | null
  assinatura?: string
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
