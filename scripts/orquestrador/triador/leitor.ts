/**
 * leitor.ts — qual leitor serve um repo, pela FORMA do diretório (spec §2):
 * `<runs>/events.log` presente → `kit`; ausente, com `docs/fila/runs/local-loop.log`
 * → `legado-comarka`. Nada aqui olha o nome do repo.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { jaLiberado } from '../liberacoes-core.js'
import { blocoJson } from './comum.js'
import { LOG_LEGADO, lerRepoLegado } from './leitor-legado-comarka.js'
import { lerRepoKit } from './leitor-kit.js'
import type { Dependencia, Evidencia, NomeLeitor } from './tipos.js'

export function runsDir(raiz: string): string {
  try {
    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { runs_dir?: unknown }
    if (typeof c.runs_dir === 'string') return c.runs_dir
  } catch {
    /* sem config: o padrão do contrato */
  }
  return 'docs/fila/runs'
}

export function detectarLeitor(raiz: string): NomeLeitor | null {
  if (existsSync(join(raiz, runsDir(raiz), 'events.log'))) return 'kit'
  if (existsSync(join(raiz, LOG_LEGADO))) return 'legado-comarka'
  return null
}

export function lerRepo(raiz: string, id: string, opts: { agora?: number } = {}): Evidencia {
  const l = detectarLeitor(raiz)
  const ev = l === 'kit' ? lerRepoKit(raiz, id) : l === 'legado-comarka' ? lerRepoLegado(raiz, id, opts) : null
  if (!ev) throw new Error(`${raiz}: nem runs/events.log (kit) nem ${LOG_LEGADO} (legado)`)
  if (ev.ticket?.dependencias.length) ev.dependencias = estadoDasDependencias(raiz, ev.ticket.dependencias)
  return ev
}

/**
 * O estado AGORA de cada dependência (7f-b3): o `status` do ticket na fila;
 * token `humano:` liberado ou não no docs/fila/liberacoes.json (a mesma
 * checagem do `orq liberar`).
 */
export function estadoDasDependencias(raiz: string, deps: string[]): Dependencia[] {
  const fila = join(raiz, 'docs/fila')
  let nomes: string[] = []
  try {
    nomes = readdirSync(fila)
  } catch {
    nomes = []
  }
  let lib: unknown = null
  try {
    lib = JSON.parse(readFileSync(join(fila, 'liberacoes.json'), 'utf8'))
  } catch {
    lib = null
  }
  return deps.map((dep) => {
    if (dep.startsWith('humano:')) return { dep, estado: jaLiberado(lib, dep) ? 'liberado' : 'sem liberação' }
    const f = nomes.find((x) => x.startsWith(`${dep}-`) && x.endsWith('.md'))
    const j = f ? blocoJson(readFileSync(join(fila, f), 'utf8')) : null
    return { dep, estado: typeof j?.status === 'string' ? j.status : 'sem ticket' }
  })
}
