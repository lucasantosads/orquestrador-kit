/**
 * leitor.ts — qual leitor serve um repo, pela FORMA do diretório (spec §2):
 * `<runs>/events.log` presente → `kit`; ausente, com `docs/fila/runs/local-loop.log`
 * → `legado-comarka`. Nada aqui olha o nome do repo.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { LOG_LEGADO, lerRepoLegado } from './leitor-legado-comarka.js'
import { lerRepoKit } from './leitor-kit.js'
import type { Evidencia, NomeLeitor } from './tipos.js'

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
  if (l === 'kit') return lerRepoKit(raiz, id)
  if (l === 'legado-comarka') return lerRepoLegado(raiz, id, opts)
  throw new Error(`${raiz}: nem runs/events.log (kit) nem ${LOG_LEGADO} (legado)`)
}
