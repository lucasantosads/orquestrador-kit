/**
 * passada.ts — uma passada do resolvedor (`orq resolver`, etapa 7f-b2).
 *
 *   para cada repo (ou o `--repo`):
 *     bloqueados, do que tem mais tickets esperando por ele ao que tem menos →
 *     triagem (o triador existente, `triarTicket`) → decisão pela classe e pelo
 *     modo (decidir.ts) → ação, ou, em --dry-run, o registro do que faria.
 *
 * "Esperando por ele": tickets fora de `done`/`obsoleto` com o id em
 * `dependencias` (dependência direta). Empate: a ordem do arquivo.
 *
 * --dry-run não escreve no repo, não chama modelo e não toca o ledger: grava
 * só `dry-run.jsonl` (caminhos.ts) e imprime.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { blocoJson } from '../triador/comum.js'
import { criarPassoModelo, lerConfigModelo } from '../triador/modelo.js'
import { Guarda, lerDiagnostico } from '../triador/saida.js'
import { bloqueados, triarTicket, type Diagnostico } from '../triador/triar.js'
import { GuardaResolvedor, arquivoDryRun } from './caminhos.js'
import { decidir, type Decisao } from './decidir.js'
import { acharRepo, lerReposResolvedor, type Modo, type RepoResolvedor } from './modos.js'

export const TETO_DIA_USD = 5

export interface OpcoesPassada {
  repo?: string
  dryRun?: boolean
  semModelo?: boolean
  agora?: number
}

export interface ItemPassada {
  repo: string
  id: string
  dependentes: number
  classe: string | null
  regra: string | null
  firme: boolean
  modo: Modo
  acao: Decisao['acao']
  /** o que aconteceu: aplicado, proposto, aviso, diagnostico, faria (dry-run), nao_consegui */
  feito: string
  motivo: string
  commit?: string
  proposta?: string
}

export interface ResultadoPassada {
  pausado: boolean
  travado: boolean
  itens: ItemPassada[]
}

/** Os bloqueados de um repo com o número de tickets que esperam por cada um, do maior ao menor. */
export function ordenarBloqueados(raiz: string): { id: string; dependentes: number }[] {
  const fila = join(raiz, 'docs/fila')
  let nomes: string[] = []
  try {
    nomes = readdirSync(fila).filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
  } catch {
    return []
  }
  const conta = new Map<string, number>()
  for (const f of nomes) {
    const j = blocoJson(readFileSync(join(fila, f), 'utf8'))
    if (!j || j.status === 'done' || j.status === 'obsoleto' || !Array.isArray(j.dependencias)) continue
    for (const d of new Set(j.dependencias.filter((x): x is string => typeof x === 'string'))) conta.set(d, (conta.get(d) ?? 0) + 1)
  }
  return bloqueados(raiz)
    .map((id, i) => ({ id, dependentes: conta.get(id) ?? 0, i }))
    .sort((a, b) => b.dependentes - a.dependentes || a.i - b.i)
    .map(({ id, dependentes }) => ({ id, dependentes }))
}

function tetoDia(): number {
  const v = Number(process.env.ORQ_RESOLVEDOR_TETO_DIA)
  return process.env.ORQ_RESOLVEDOR_TETO_DIA && Number.isFinite(v) && v >= 0 ? v : TETO_DIA_USD
}

/** O diagnóstico atual do ticket: o que a triagem acabou de gravar, ou o gravado com a mesma assinatura. */
function triar(repo: RepoResolvedor, id: string, agora: number, semModelo: boolean): Diagnostico | null {
  const modelo = semModelo ? null : criarPassoModelo({ ...lerConfigModelo(), teto_dia_usd: tetoDia() })
  const r = triarTicket({ repo: { nome: repo.nome, caminho: repo.caminho }, id, agora, ...(modelo ? { modelo } : {}) })
  return r.diagnostico ?? lerDiagnostico<Diagnostico>(new Guarda([repo.caminho]), repo.nome, id)
}

export interface Contexto {
  repo: RepoResolvedor
  id: string
  diag: Diagnostico
  decisao: Decisao
  dependentes: number
  agora: number
  dryRun: boolean
  g: GuardaResolvedor
}

/** O que a ação faz (ou faria). Peça 2: nenhuma ação escreve ainda. */
export function executar(c: Contexto): Pick<ItemPassada, 'feito' | 'motivo' | 'commit' | 'proposta'> {
  const { decisao: d } = c
  if (d.acao === 'diagnostico' || d.acao === 'aviso') return { feito: d.acao, motivo: d.motivo }
  if (c.dryRun) return { feito: 'faria', motivo: d.motivo }
  return { feito: 'nao_consegui', motivo: `ação ${d.acao} ainda não implementada` }
}

export function passada(o: OpcoesPassada = {}): ResultadoPassada {
  const agora = o.agora ?? Date.now()
  const dryRun = o.dryRun === true
  const repos = o.repo ? [acharRepo(o.repo)] : lerReposResolvedor()
  const g = new GuardaResolvedor(repos.map((r) => r.caminho))
  const itens: ItemPassada[] = []
  for (const repo of repos) {
    for (const { id, dependentes } of ordenarBloqueados(repo.caminho)) {
      const diag = triar(repo, id, agora, o.semModelo === true || dryRun)
      const base = { repo: repo.nome, id, dependentes, classe: diag?.classe ?? null, regra: diag?.regra ?? null, firme: diag?.firme ?? false }
      if (!diag) {
        itens.push({ ...base, modo: 'diagnostico', acao: 'aviso', feito: 'nao_consegui', motivo: 'sem diagnóstico (triagem travada por outro processo?)' })
        continue
      }
      const decisao = decidir(diag, repo.modos)
      const r = executar({ repo, id, diag, decisao, dependentes, agora, dryRun, g })
      const item: ItemPassada = { ...base, modo: decisao.modo, acao: decisao.acao, ...r }
      itens.push(item)
      if (dryRun) g.acrescentar(arquivoDryRun(), JSON.stringify({ ts: new Date(agora).toISOString(), ...item, assinatura: diag.assinatura }))
    }
  }
  return { pausado: false, travado: false, itens }
}

export function resumo(r: ResultadoPassada): string {
  if (r.pausado) return 'resolvedor pausado (interruptor ligado): nada rodou'
  if (r.travado) return 'outra passada do resolvedor está rodando: nada rodou'
  const linhas = r.itens.map((i) =>
    [i.repo, i.id, `deps=${i.dependentes}`, `${i.classe ?? 'sem classe'}${i.regra ? ` ${i.regra}` : ''}${i.firme ? ' firme' : ''}`, i.modo, i.acao, i.feito, i.motivo, i.commit ?? '', i.proposta ?? '']
      .join('\t')
      .replace(/\t+$/, ''),
  )
  linhas.push(`-- ${r.itens.length} bloqueado(s): ${r.itens.filter((i) => i.feito === 'aplicado').length} aplicado(s), ${r.itens.filter((i) => i.feito === 'proposto').length} proposta(s), ${r.itens.filter((i) => i.feito === 'faria').length} faria (dry-run)`)
  return linhas.join('\n')
}
