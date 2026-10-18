/**
 * supabase.ts — o adaptador do aplicador para a API de gestão do Supabase
 * (etapa MIG-A, P2).
 *
 * Tudo passa por `POST /v1/projects/<ref>/database/query` (decisão E4): o
 * `POST /database/migrations` (o que o `apply_migration` do MCP usa) não deixa
 * escolher a versão e grava a hora da aplicação; aqui o SQL e o insert no
 * `supabase_migrations.schema_migrations` vão no mesmo texto, numa transação
 * implícita (sql.ts), com a versão e o nome DO ARQUIVO.
 *
 *   listarAplicadas  select version, name, created_by (read_only)
 *   aplicar          ok | erro certo (4xx: o Postgres recusou e nada ficou)
 *                    | INCERTO (5xx, timeout, rede, resposta ilegível): quem
 *                    chama confere no ledger antes de dizer qualquer coisa
 *   sonda            duas instruções no mesmo texto têm o mesmo txid? (C2)
 *
 * A credencial é lida do arquivo do repo pelo NOME configurado (lerCredencial),
 * só aqui, e nunca sai: toda mensagem passa por `mascarar`, que troca o valor
 * (e o miolo dele, e qualquer `sbp_...`) por `***`.
 *
 * Base da API: a oficial. `ORQ_MIGRATIONS_API` só vale com `ORQ_TESTE=1` e só
 * para 127.0.0.1 (o stub dos testes); com `ORQ_TESTE=1` a oficial é recusada.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { montarQuery, QUERY_LISTAR, QUERY_SONDA, type Migracao } from './sql.js'

export const API_OFICIAL = 'https://api.supabase.com'

export class ErroApi extends Error {}

export function baseDaApi(): string {
  const teste = process.env.ORQ_TESTE === '1'
  const outra = process.env.ORQ_MIGRATIONS_API || ''
  if (teste) {
    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(outra)) throw new ErroApi(`ORQ_TESTE=1: o aplicador só fala com o stub em http://127.0.0.1:<porta> (ORQ_MIGRATIONS_API=${outra || 'vazio'}); nunca com o banco de verdade`)
    return outra
  }
  if (outra && outra !== API_OFICIAL) throw new ErroApi(`ORQ_MIGRATIONS_API=${outra} fora de teste: o aplicador só fala com ${API_OFICIAL}`)
  return API_OFICIAL
}

/** Troca cada segredo (e o miolo dele, sem o prefixo) e qualquer `sbp_...` por `***`. */
export function mascarar(s: string, segredos: string[]): string {
  let out = s
  for (const x of segredos) {
    if (x.length < 8) continue
    for (const pedaco of [x, x.replace(/^sbp_/, '')]) out = out.split(pedaco).join('***')
  }
  return out.replace(/\bsbp_[A-Za-z0-9]+/g, '***')
}

/** O valor de `nome` no arquivo de env do repo. A mensagem de falta nunca leva valor. */
export function lerCredencial(raiz: string, envArquivo: string, nome: string): string {
  const arq = join(raiz, envArquivo)
  let txt = ''
  try {
    txt = readFileSync(arq, 'utf8')
  } catch {
    throw new ErroApi(`credencial ${nome}: não consegui ler ${arq}`)
  }
  for (const l of txt.split('\n')) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
    if (!m || m[1] !== nome) continue
    const v = m[2]!.replace(/^(['"])(.*)\1$/, '$2')
    if (v) return v
  }
  throw new ErroApi(`credencial ${nome} ausente ou vazia em ${arq}`)
}

export interface Aplicada {
  version: string
  name: string | null
  created_by: string | null
}

export type Resultado = { ok: true } | { ok: false; incerto: boolean; mensagem: string }

export interface Adaptador {
  listarAplicadas(): Promise<Aplicada[]>
  aplicar(m: Migracao): Promise<Resultado>
  sonda(): Promise<boolean>
  mascarar(s: string): string
}

type Resposta = { tipo: 'ok'; dados: unknown } | { tipo: 'erro'; status: number; mensagem: string } | { tipo: 'incerto'; mensagem: string }

export function criarAdaptador(o: { bancoId: string; token: string; timeouts: { lockS: number; statementS: number; httpS: number } }): Adaptador {
  const base = baseDaApi()
  const m = (s: string) => mascarar(s, [o.token])

  async function consulta(query: string, somenteLeitura: boolean): Promise<Resposta> {
    let r: Response
    try {
      r = await fetch(`${base}/v1/projects/${o.bancoId}/database/query`, {
        method: 'POST',
        headers: { authorization: `Bearer ${o.token}`, 'content-type': 'application/json', 'user-agent': 'orq-aplicador' },
        body: JSON.stringify({ query, ...(somenteLeitura ? { read_only: true } : {}) }),
        signal: AbortSignal.timeout(o.timeouts.httpS * 1000),
      })
    } catch (e) {
      const err = e as Error
      const tempo = err.name === 'TimeoutError' || err.name === 'AbortError'
      return { tipo: 'incerto', mensagem: m(tempo ? `sem resposta em ${o.timeouts.httpS}s (tempo esgotado)` : `falha de rede: ${err.message}`) }
    }
    let texto = ''
    try {
      texto = await r.text()
    } catch (e) {
      return { tipo: 'incerto', mensagem: m(`HTTP ${r.status}, corpo cortado: ${(e as Error).message}`) }
    }
    let dados: unknown
    let legivel = true
    try {
      dados = JSON.parse(texto)
    } catch {
      legivel = false
    }
    const msgDoCorpo = () => {
      const d = dados as { message?: unknown; error?: unknown } | undefined
      return String((legivel && d && (d.message ?? d.error)) || texto.slice(0, 300))
    }
    if (r.status >= 500) return { tipo: 'incerto', mensagem: m(`HTTP ${r.status}: ${msgDoCorpo()}`) }
    if (r.status >= 400) return { tipo: 'erro', status: r.status, mensagem: m(`HTTP ${r.status}: ${msgDoCorpo()}`) }
    if (!legivel) return { tipo: 'incerto', mensagem: m(`HTTP ${r.status} com resposta ilegível: ${texto.slice(0, 120)}`) }
    return { tipo: 'ok', dados }
  }

  const leitura = async (query: string, o2: string): Promise<Record<string, unknown>[]> => {
    const r = await consulta(query, true)
    if (r.tipo !== 'ok') throw new ErroApi(`${o2}: ${r.mensagem}`)
    if (!Array.isArray(r.dados)) throw new ErroApi(`${o2}: resposta não é lista`)
    return r.dados as Record<string, unknown>[]
  }

  return {
    mascarar: m,
    async listarAplicadas() {
      const linhas = await leitura(QUERY_LISTAR, 'listar o schema_migrations')
      const txt = (v: unknown) => (typeof v === 'string' ? v : null)
      return linhas.map((l) => ({ version: String(l.version), name: txt(l.name), created_by: txt(l.created_by) }))
    },
    async aplicar(mig) {
      const r = await consulta(montarQuery(mig, o.timeouts), false)
      if (r.tipo === 'ok') return { ok: true }
      return { ok: false, incerto: r.tipo === 'incerto', mensagem: r.mensagem }
    },
    async sonda() {
      const linhas = await leitura(QUERY_SONDA, 'sonda')
      return linhas[0]?.mesma_transacao === true
    },
  }
}
