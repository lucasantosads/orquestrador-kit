/**
 * liberacao.ts — a ÚNICA escrita do aplicador num repo: o token de liberação,
 * no formato do próprio repo (etapa MIG-A, P4; decisões 4 e E6 de 18/10).
 *
 *   formato `liberadas` (Comarka): acrescenta `{token sem 'humano:', em, por,
 *     nota}` em `.liberadas[]`, como o `roadmap/liberar.py` dele; `.tokens[]` e
 *     o resto do arquivo ficam byte a byte;
 *   formato `v2` (kit): a mesma decisão do `orq liberar` (liberar-cli.ts).
 *
 * O token sai do cabeçalho do .sql (76 de 77 migrations recentes do Comarka o
 * citam: `humano:migration-<id>-aplicada`), pelo `token.molde` da config; ou do
 * `--token`, conferido contra o molde.
 *
 * Antes de aplicar e de novo antes de escrever, o repo não pode estar pausado
 * (o `pausar_file` do 000-config ou `docs/fila/.orq-pause`, que congela a main
 * no ritual) nem ter o arquivo de liberação modificado na árvore (E5).
 *
 * O commit é o da porta genérica do resolvedor (`comitarUmArquivo`): espera o
 * git livre, só aquele arquivo, nunca `--no-verify`, trailer `Orq-Aplicador:`.
 */
import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { jaLiberado } from '../liberacoes-core.js'
import { hoje, liberar } from '../liberar-cli.js'
import { comitarUmArquivo, type Escrita } from '../resolvedor/repo.js'
import { dentro } from '../resolvedor/caminhos.js'
import { gitLeitura } from '../triador/git.js'
import type { TokenCfg } from './config.js'

export interface CfgRepo {
  liberacoesFile: string
  pausarFile: string | null
}

export function configDoRepo(raiz: string): CfgRepo {
  let c: { liberacoes_file?: unknown; pausar_file?: unknown }
  try {
    c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as typeof c
  } catch (e) {
    throw new Error(`não consegui ler docs/fila/000-config.json de ${raiz}: ${(e as Error).message}`)
  }
  if (typeof c.liberacoes_file !== 'string' || !c.liberacoes_file) throw new Error(`${raiz}: 000-config.json sem liberacoes_file`)
  return { liberacoesFile: c.liberacoes_file, pausarFile: typeof c.pausar_file === 'string' && c.pausar_file ? c.pausar_file : null }
}

const primeiraLinha = (p: string) => {
  try {
    return readFileSync(p, 'utf8').split('\n')[0]!.trim().slice(0, 120)
  } catch {
    return ''
  }
}

/** Por que o repo não aceita a liberação agora (vazio: aceita). */
export function bloqueiosDoRepo(raiz: string, cfg: CfgRepo): string[] {
  const out: string[] = []
  const pausas = [...(cfg.pausarFile ? [['pausar_file', cfg.pausarFile]] : []), ['docs/fila/.orq-pause', 'docs/fila/.orq-pause']]
  for (const [nome, rel] of pausas) if (existsSync(join(raiz, rel!))) out.push(`${nome} ${rel} existe (${primeiraLinha(join(raiz, rel!))}): repo pausado`)
  const st = gitLeitura(raiz, ['status', '--porcelain', '--', cfg.liberacoesFile])
  if (st.rc !== 0) out.push(`git status falhou em ${raiz}`)
  else if (st.stdout.trim()) out.push(`${cfg.liberacoesFile} modificado na árvore (${st.stdout.trim().slice(0, 60)}): commite ou descarte antes`)
  return out
}

const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const reMolde = (molde: string) => escapa(molde).replace(escapa('{id}'), '([0-9A-Za-z]+)')

/** Os tokens do molde citados no SQL, sem `humano:`, sem repetição. */
export function tokensDoSql(sql: string, molde: string): string[] {
  const re = new RegExp(`humano:(${reMolde(molde)})(?![0-9A-Za-z-])`, 'g')
  return [...new Set([...sql.matchAll(re)].map((m) => m[1]!))]
}

/** O `--token` (com ou sem `humano:`) conferido contra o molde. */
export function tokenDado(t: string, molde: string): string | null {
  const s = t.replace(/^humano:/, '')
  return new RegExp(`^${reMolde(molde)}$`).test(s) ? s : null
}

export function jaLiberadoNoTexto(texto: string, token: string): boolean {
  try {
    return jaLiberado(JSON.parse(texto), token)
  } catch {
    return false
  }
}

/** O arquivo de liberação com o token novo, ou o porquê de não dar. */
export function comToken(texto: string, cfg: TokenCfg, token: string, nota: string, usuario: string): { ok: true; conteudo: string } | { ok: false; motivo: string } {
  let raiz: unknown
  try {
    raiz = JSON.parse(texto)
  } catch (e) {
    return { ok: false, motivo: `arquivo de liberação ilegível: ${(e as Error).message}` }
  }
  const por = cfg.por ?? usuario
  if (cfg.formato === 'v2') {
    const r = liberar(raiz, `humano:${token}`, nota, por, hoje())
    return r.ok ? { ok: true, conteudo: r.conteudo } : { ok: false, motivo: r.motivo }
  }
  const o = raiz as { liberadas?: unknown }
  if (!raiz || typeof raiz !== 'object' || !Array.isArray(o.liberadas)) return { ok: false, motivo: "formato 'liberadas' sem a lista .liberadas[]" }
  o.liberadas.push({ token, em: hoje(), por, nota })
  return { ok: true, conteudo: `${JSON.stringify(raiz, null, 2)}\n` }
}

/** Commit só do arquivo de liberação, se ele é o do config e mora dentro do repo. */
export function comitarLiberacao(raiz: string, cfg: CfgRepo, antes: string, novo: string, mensagem: string): Escrita {
  const rel = cfg.liberacoesFile
  const abs = resolve(raiz, rel)
  if (!existsSync(abs) || lstatSync(abs).isSymbolicLink()) return { ok: false, motivo: `${rel} não existe ou é symlink` }
  const real = realpathSync(abs)
  if (!dentro(real, realpathSync(raiz))) return { ok: false, motivo: `${rel} sai do repo: ${real}` }
  const conferir = () => bloqueiosDoRepo(raiz, cfg).filter((b) => !b.includes('modificado na árvore'))[0] ?? null
  return comitarUmArquivo(raiz, rel, real, antes, novo, mensagem, conferir, 'o arquivo de liberação')
}
