/**
 * caminhos.ts — onde o aplicador escreve FORA dos repos (etapa MIG-A, P4).
 *
 * Raiz: `ORQ_MIGRATIONS_DIR`, ou `~/.orq/migrations`. Dentro dela:
 *   ledger.jsonl        cada aplicação, conferência, token e falha (só acrescenta)
 *   <banco>.json        a linha de base (plano.ts)
 *   <banco>.sonda.json  a sonda de transação (sem ela verde, nada aplica)
 *   <banco>.lock        a trava por banco (O_EXCL, com o pid; órfã se o pid morreu)
 *   tmp/                o .sql extraído do ref para o pre_check
 *
 * O interruptor é `ORQ_MIGRATIONS_PAUSADO`, ou `~/.orq/MIGRATIONS_PAUSADO`.
 * A escrita passa pela mesma guarda do resolvedor (`GuardaResolvedor`), com
 * esta raiz: fora dela, ou dentro de qualquer repo, lança.
 */
import { existsSync, readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join, resolve } from 'node:path'
import { GuardaResolvedor } from '../resolvedor/caminhos.js'
import type { Banco } from './config.js'

export const raizMigrations = (): string => resolve(process.env.ORQ_MIGRATIONS_DIR || join(homedir(), '.orq', 'migrations'))
export const interruptorMigrations = (): string => resolve(process.env.ORQ_MIGRATIONS_PAUSADO || join(homedir(), '.orq', 'MIGRATIONS_PAUSADO'))
export const arquivoLedger = (): string => join(raizMigrations(), 'ledger.jsonl')
export const arquivoLinhaBase = (banco: string): string => join(raizMigrations(), `${banco}.json`)
export const arquivoSonda = (banco: string): string => join(raizMigrations(), `${banco}.sonda.json`)
export const arquivoTrava = (banco: string): string => join(raizMigrations(), `${banco}.lock`)

export const guardaDo = (banco: Banco): GuardaResolvedor => new GuardaResolvedor(banco.repos.map((r) => r.caminho).filter(Boolean), raizMigrations())

export function registrar(g: GuardaResolvedor, e: Record<string, unknown>): void {
  g.acrescentar(arquivoLedger(), JSON.stringify({ ts: new Date().toISOString(), ...e }))
}

export function lerJson<T>(p: string): T | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return null
  }
}

const vivo = (pid: number): boolean => {
  try {
    process.kill(pid, 0)
    return true
  } catch (e) {
    return (e as NodeJS.ErrnoException).code === 'EPERM'
  }
}

/** A trava do banco: a função que solta, ou o motivo de não conseguir. */
export function travar(g: GuardaResolvedor, banco: string): (() => void) | string {
  const p = arquivoTrava(banco)
  const corpo = JSON.stringify({ pid: process.pid, hora: new Date().toISOString() }) + '\n'
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    if (g.criarExclusivo(p, corpo)) {
      return () => {
        try {
          if (existsSync(p)) g.apagar(p)
        } catch {
          /* já saiu */
        }
      }
    }
    const t = lerJson<{ pid?: unknown; hora?: unknown }>(p)
    const pid = typeof t?.pid === 'number' ? t.pid : NaN
    if (Number.isInteger(pid) && vivo(pid)) return `outro aplicar segura a trava do banco ${banco} (pid ${pid} desde ${String(t?.hora)}): ${p}`
    try {
      g.apagar(p) // órfã: o pid morreu (ou o arquivo é ilegível)
    } catch {
      /* outro levou a órfã */
    }
  }
  return `não consegui a trava do banco ${banco}: ${p}`
}
