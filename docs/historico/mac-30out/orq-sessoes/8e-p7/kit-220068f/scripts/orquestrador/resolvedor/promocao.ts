/**
 * promocao.ts — o modo de uma classe muda sozinho, por repo (etapa 7f-b2,
 * peça 6; decisão do chat do programa):
 *
 *   promoção     R2 sobe de sombra para auto com 9 acertos nas 10 últimas
 *                propostas comparadas com o humano (`comparacao` do ledger).
 *                Nesta etapa R2 em auto continua só propondo (decidir.ts): a
 *                promoção fica registrada para quando a aplicação existir;
 *   rebaixamento qualquer classe em auto volta para sombra com 2 desfechos
 *                ruins seguidos (bloqueou de novo, humano mexeu, desfeito; para
 *                R2, comparação com erro). O R1 com 2 ou mais testes conta à
 *                parte (`r1_multi`, a `subclasse` do desfecho, 7f-b7): só ele
 *                volta para sombra. `limite_apos_r1` (bom: null) não conta.
 *
 * Só conta o que veio DEPOIS da última mudança de modo daquela classe naquele
 * repo: um rebaixamento não se repete com os mesmos desfechos. Cada mudança vai
 * ao ledger (`promocao`/`rebaixamento`) e ao repos.json (`gravarModo`). Repo
 * passado por caminho, fora do repos.json, não muda de modo.
 */
import type { GuardaResolvedor } from './caminhos.js'
import { DESFECHO_RUIM } from './desfecho.js'
import { lerLedger, registrar, type Entrada } from './ledger.js'
import { gravarModo, lerReposResolvedor, modoDaChave, type RepoResolvedor } from './modos.js'

export const PROMOVE_ACERTOS = 9
export const PROMOVE_JANELA = 10
export const REBAIXA_RUINS = 2

const iso = (t: number) => new Date(t).toISOString().replace(/\.\d{3}Z$/, 'Z')
const base = (c: unknown) => String(c ?? '').replace('?', '').split('|')[0]!
/** A chave de contagem de um fato: a subclasse do desfecho (r1_multi), ou a classe. */
const chave = (e: Entrada) => (typeof e.subclasse === 'string' ? e.subclasse : base(e.classe))

/** Os fatos (bom/ruim, em ordem) de uma classe num repo desde a última mudança de modo dela. */
function fatos(l: Entrada[], repo: string, classe: string): { ts: string; bom: boolean; tipo: string }[] {
  let ini = 0
  l.forEach((e, i) => {
    if ((e.tipo === 'promocao' || e.tipo === 'rebaixamento') && e.repo === repo && e.classe === classe) ini = i + 1
  })
  return l.slice(ini).flatMap((e) => {
    if (e.repo !== repo || chave(e) !== classe) return []
    // limite depois do resolvedor (bom: null): nem bom nem ruim, fora da sequência
    if (e.tipo === 'desfecho' && e.bom === null) return []
    if (e.tipo === 'desfecho') return [{ ts: e.ts, bom: !DESFECHO_RUIM.has(String(e.desfecho)), tipo: 'desfecho' }]
    if (e.tipo === 'comparacao') return [{ ts: e.ts, bom: e.resultado === 'acerto', tipo: 'comparacao' }]
    return []
  })
}

export function promoverRebaixar(g: GuardaResolvedor, repo: RepoResolvedor, agora: number, l: Entrada[] = lerLedger()): Entrada[] {
  if (!lerReposResolvedor().some((r) => r.caminho === repo.caminho)) return []
  const out: Entrada[] = []
  const muda = (classe: string, para: 'auto' | 'sombra', tipo: 'promocao' | 'rebaixamento', motivo: string, considerados: { ts: string; bom: boolean }[]) => {
    const de = modoDaChave(repo.modos, classe)
    gravarModo(g, repo.caminho, classe, para)
    repo.modos = { ...repo.modos, [classe]: para }
    const e: Entrada = { ts: iso(agora), tipo, repo: repo.nome, classe, de, para, motivo, considerados }
    registrar(g, e)
    l.push(e)
    out.push(e)
  }
  const classes = new Set(l.filter((e) => e.repo === repo.nome && (e.tipo === 'desfecho' || e.tipo === 'comparacao')).map(chave))
  for (const c of [...classes].sort()) {
    const fs = fatos(l, repo.nome, c)
    const modo = modoDaChave(repo.modos, c)
    if (modo === 'auto') {
      const ult = fs.slice(-REBAIXA_RUINS)
      if (ult.length === REBAIXA_RUINS && ult.every((f) => !f.bom)) muda(c, 'sombra', 'rebaixamento', `${REBAIXA_RUINS} desfechos ruins seguidos`, ult)
    } else if (modo === 'sombra' && c === 'R2') {
      const comps = fs.filter((f) => f.tipo === 'comparacao').slice(-PROMOVE_JANELA)
      const acertos = comps.filter((f) => f.bom).length
      if (comps.length === PROMOVE_JANELA && acertos >= PROMOVE_ACERTOS) muda(c, 'auto', 'promocao', `${acertos} acertos nas ${PROMOVE_JANELA} últimas propostas`, comps)
    }
  }
  return out
}
