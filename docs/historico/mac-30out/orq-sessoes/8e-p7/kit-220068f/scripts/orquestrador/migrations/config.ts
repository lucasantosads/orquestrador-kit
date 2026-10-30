/**
 * config.ts — o bloco `migrations.bancos` do `~/.orq/repos.json` (etapa MIG-A, P1).
 *
 * O aplicador é por BANCO, não por repo (decisão 5 de 18/10): um banco junta os
 * repos cujas migrations vão para ele, e no máximo UM deles escreve. O bloco
 * mora no topo do repos.json, e não em cada item de `.repos[]` (E1): o
 * dashboard-comercial escreve no mesmo banco do Comarka, mas não tem fila, e
 * entrar em `.repos[]` faria o resolvedor e o painel varrerem ele.
 *
 *   "migrations": { "bancos": { "<nome>": {
 *     "ferramenta": "supabase", "banco_id": "<ref do projeto>",
 *     "timeouts": { "lock_timeout_s": 5, "statement_timeout_s": 60, "http_timeout_s": 120 },
 *     "repos": [
 *       { "repo": "<nome em .repos[]>", "dir": "supabase/migrations",
 *         "refs": ["HEAD", "origin/staging-auto"],          (padrão ["HEAD"])
 *         "credencial_env": "SUPABASE_ACCESS_TOKEN", "env_arquivo": ".env.local",
 *         "token": { "formato": "liberadas" | "v2", "molde": "migration-{id}-aplicada", "por": "lucas" },
 *         "pre_check": ["python3", "scripts/roadmap/checar-promocao.py", "--aplicar", "{arquivo}"] },
 *       { "caminho": "~/Projetos/dashboard-comercial", "dir": "supabase/migrations", "somente_leitura": true }
 *     ] } } }
 *
 * `repo` aponta um item de `.repos[]` pelo nome (o de `lerRepos`); `caminho`
 * serve ao repo que não está lá. Repo `somente_leitura` só conta para o plano e
 * o drift: não precisa de credencial nem de token, e nunca é escrito. Nada
 * disso mora no `000-config.json` dos repos.
 */
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { isAbsolute, normalize, resolve, sep } from 'node:path'
import { arquivoRepos, lerRepos, type RepoListado } from '../triador/saida.js'

export interface TokenCfg {
  formato: 'liberadas' | 'v2'
  /** o token sem o `humano:`, com `{id}` no lugar do id do ticket */
  molde: string
  /** quem assina a liberação no formato `liberadas`; ausente: o usuário do terminal */
  por?: string
}

export interface RepoMig {
  nome: string
  caminho: string
  dir: string
  refs: string[]
  somenteLeitura: boolean
  credencialEnv: string | null
  envArquivo: string
  token: TokenCfg | null
  preCheck: string[] | null
}

export interface Timeouts {
  lockS: number
  statementS: number
  httpS: number
}

export interface Banco {
  nome: string
  ferramenta: 'supabase'
  bancoId: string
  repos: RepoMig[]
  escritor: RepoMig | null
  timeouts: Timeouts
}

export const TIMEOUTS_PADRAO: Timeouts = { lockS: 5, statementS: 60, httpS: 120 }

const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
const texto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
const relativoDentro = (p: string) => !isAbsolute(p) && !normalize(p).split(sep).includes('..')
const expande = (p: string) => resolve(p.replace(/^~(?=\/|$)/, homedir()))

function repoDe(it: unknown, onde: string, listados: RepoListado[], erros: string[]): RepoMig | null {
  if (!obj(it)) {
    erros.push(`${onde}: tem de ser um objeto`)
    return null
  }
  let nome = ''
  let caminho = ''
  if (texto(it.repo) === texto(it.caminho)) {
    erros.push(`${onde}: exatamente um de 'repo' (nome em .repos[]) ou 'caminho'`)
  } else if (texto(it.repo)) {
    const l = listados.find((r) => r.nome === it.repo)
    if (!l) erros.push(`${onde}.repo: '${it.repo}' não está em .repos[] (use 'caminho' para repo fora da lista)`)
    else ({ nome, caminho } = l)
  } else {
    caminho = expande(it.caminho as string)
    nome = caminho.split(sep).pop()!
  }
  const dir = it.dir
  if (!texto(dir) || !relativoDentro(dir)) erros.push(`${onde}.dir: caminho relativo dentro do repo, sem '..' (recebi ${JSON.stringify(dir)})`)
  let refs = ['HEAD']
  if (it.refs !== undefined) {
    if (!Array.isArray(it.refs) || it.refs.length === 0 || !it.refs.every(texto)) erros.push(`${onde}.refs: lista não vazia de refs git (recebi ${JSON.stringify(it.refs)})`)
    else refs = it.refs as string[]
  }
  const somenteLeitura = it.somente_leitura === true
  if (it.somente_leitura !== undefined && typeof it.somente_leitura !== 'boolean') erros.push(`${onde}.somente_leitura: true ou false`)

  let credencialEnv: string | null = null
  let token: TokenCfg | null = null
  let preCheck: string[] | null = null
  const envArquivo = texto(it.env_arquivo) ? it.env_arquivo : '.env.local'
  if (!relativoDentro(envArquivo)) erros.push(`${onde}.env_arquivo: caminho relativo dentro do repo`)
  if (!somenteLeitura) {
    if (texto(it.credencial_env) && /^[A-Z_][A-Z0-9_]*$/.test(it.credencial_env)) credencialEnv = it.credencial_env
    else erros.push(`${onde}.credencial_env: o NOME da variável no ${envArquivo} (ex.: SUPABASE_ACCESS_TOKEN), nunca o valor`)
    const t = it.token
    if (!obj(t)) erros.push(`${onde}.token: obrigatório no repo que escreve ({formato, molde})`)
    else {
      if (t.formato !== 'liberadas' && t.formato !== 'v2') erros.push(`${onde}.token.formato: 'liberadas' (formato do Comarka) ou 'v2' (o do kit)`)
      if (!texto(t.molde) || t.molde.split('{id}').length !== 2 || !/^[a-z-]*\{id\}[a-z-]*$/.test(t.molde)) erros.push(`${onde}.token.molde: o token sem 'humano:', com '{id}' uma vez (ex.: migration-{id}-aplicada)`)
      if (t.por !== undefined && !texto(t.por)) erros.push(`${onde}.token.por: texto não vazio`)
      if (t.formato === 'liberadas' || t.formato === 'v2') token = { formato: t.formato, molde: String(t.molde), ...(texto(t.por) ? { por: t.por } : {}) }
    }
    if (it.pre_check !== undefined) {
      if (!Array.isArray(it.pre_check) || it.pre_check.length === 0 || !it.pre_check.every(texto)) erros.push(`${onde}.pre_check: lista não vazia (o comando e os argumentos; '{arquivo}' vira o .sql)`)
      else preCheck = it.pre_check as string[]
    }
  }
  return { nome, caminho, dir: String(dir), refs, somenteLeitura, credencialEnv, envArquivo, token, preCheck }
}

function timeoutsDe(v: unknown, onde: string, erros: string[]): Timeouts {
  const t = { ...TIMEOUTS_PADRAO }
  if (v === undefined) return t
  if (!obj(v)) {
    erros.push(`${onde}: objeto {lock_timeout_s, statement_timeout_s, http_timeout_s}`)
    return t
  }
  const campos: [string, keyof Timeouts][] = [['lock_timeout_s', 'lockS'], ['statement_timeout_s', 'statementS'], ['http_timeout_s', 'httpS']]
  for (const [k, c] of campos) {
    if (v[k] === undefined) continue
    const n = v[k]
    if (typeof n === 'number' && Number.isFinite(n) && n > 0) t[c] = n
    else erros.push(`${onde}.${k}: número de segundos maior que zero (recebi ${JSON.stringify(n)})`)
  }
  return t
}

/** O bloco `migrations` já parseado contra os repos de `.repos[]`. Puro. */
export function validarBancos(raiz: unknown, listados: RepoListado[]): { bancos: Banco[]; erros: string[] } {
  const erros: string[] = []
  const bancos: Banco[] = []
  if (raiz === undefined) return { bancos, erros }
  if (!obj(raiz) || !obj(raiz.bancos)) return { bancos, erros: ['migrations.bancos: objeto {<nome do banco>: {...}}'] }
  const doRepo = new Map<string, string>()
  for (const [nome, b] of Object.entries(raiz.bancos)) {
    const onde = `migrations.bancos.${nome}`
    if (!obj(b)) {
      erros.push(`${onde}: tem de ser um objeto`)
      continue
    }
    if (b.ferramenta !== 'supabase') erros.push(`${onde}.ferramenta: só 'supabase' nesta versão (recebi ${JSON.stringify(b.ferramenta)})`)
    const bancoId = texto(b.banco_id) ? b.banco_id : ''
    if (!/^[a-z0-9]{8,40}$/.test(bancoId)) erros.push(`${onde}.banco_id: o ref do projeto (minúsculas e dígitos), recebi ${JSON.stringify(b.banco_id)}`)
    const igual = bancos.find((x) => x.bancoId === bancoId)
    if (igual && bancoId) erros.push(`${onde}.banco_id: ${bancoId} já é do banco '${igual.nome}'; um banco, um bloco (junte os repos nele)`)
    const repos: RepoMig[] = []
    if (!Array.isArray(b.repos) || b.repos.length === 0) erros.push(`${onde}.repos: lista não vazia`)
    else
      b.repos.forEach((it, i) => {
        const r = repoDe(it, `${onde}.repos[${i}]`, listados, erros)
        if (!r) return
        const dono = r.caminho && doRepo.get(r.caminho)
        if (dono) erros.push(`${onde}.repos[${i}]: ${r.nome} já está no banco '${dono}'; um repo pertence a um banco só`)
        else if (r.caminho) doRepo.set(r.caminho, nome)
        repos.push(r)
      })
    const escritores = repos.filter((r) => !r.somenteLeitura)
    if (escritores.length > 1) erros.push(`${onde}.repos: no máximo um repo que escreve por banco (achei ${escritores.map((r) => r.nome).join(', ')}); os outros levam somente_leitura`)
    bancos.push({ nome, ferramenta: 'supabase', bancoId, repos, escritor: escritores[0] ?? null, timeouts: timeoutsDe(b.timeouts, `${onde}.timeouts`, erros) })
  }
  return { bancos, erros }
}

/** Os bancos do repos.json de verdade (`ORQ_REPOS` ou `~/.orq/repos.json`). */
export function lerBancos(): { bancos: Banco[]; erros: string[] } {
  let d: unknown
  try {
    d = JSON.parse(readFileSync(arquivoRepos(), 'utf8'))
  } catch (e) {
    return { bancos: [], erros: [`${arquivoRepos()}: ${(e as Error).message}`] }
  }
  return validarBancos(obj(d) ? d.migrations : undefined, lerRepos())
}

export class ConfigInvalida extends Error {}

function bancosValidos(): Banco[] {
  const { bancos, erros } = lerBancos()
  if (erros.length) throw new ConfigInvalida(`config de migrations inválida em ${arquivoRepos()}:\n  ${erros.join('\n  ')}`)
  return bancos
}

export function acharBanco(nome: string): Banco {
  const bs = bancosValidos()
  const b = bs.find((x) => x.nome === nome)
  if (!b) throw new ConfigInvalida(`banco '${nome}' não está em migrations.bancos (há: ${bs.map((x) => x.nome).join(', ') || 'nenhum'})`)
  return b
}

/** O banco em que `repo` (nome do bloco ou caminho) é o escritor. */
export function bancoDoEscritor(repo: string): { banco: Banco; repo: RepoMig } {
  const bs = bancosValidos()
  const cam = resolve(repo)
  for (const b of bs) for (const r of b.repos) if (r.nome === repo || r.caminho === cam) return { banco: b, repo: r }
  throw new ConfigInvalida(`repo '${repo}' não está em nenhum banco de migrations.bancos`)
}
