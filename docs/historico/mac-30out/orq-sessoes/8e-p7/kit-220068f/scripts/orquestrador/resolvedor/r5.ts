/**
 * r5.ts — quando um R5 de ambiente pode reabrir (decisão do chat do programa:
 * reabre quando a condição some, verificável SEM rodar suíte).
 *
 *   árvore suja (D1)  a worktree alvo (`worktrees_dir`/`branch_alvo` do config,
 *                     os mesmos do triador) com `git status --porcelain` vazio,
 *                     por `gitLeitura` (GIT_OPTIONAL_LOCKS=0)
 *   máquina (D4)      carga de 1 min por CPU ≤ 0,75 e ≥ 2 GiB livres no disco do
 *                     repo (o sinal pode ser worker do vitest, EMFILE ou ENOSPC:
 *                     os dois valem sempre)
 *   base vermelha (D5) não reabre nesta etapa (decidir.ts nem chega aqui)
 *
 * `ORQ_RESOLVEDOR_MAQUINA` (json `{carga, cpus, livre_bytes}`) troca a leitura
 * da máquina nos testes.
 */
import { existsSync, readFileSync, statfsSync } from 'node:fs'
import { cpus, loadavg } from 'node:os'
import { join, resolve } from 'node:path'
import { gitLeitura } from '../triador/git.js'
import type { Diagnostico } from '../triador/triar.js'
import { branchAlvo, type Plano } from './r1.js'
import { EdicaoRecusada, reabrir } from './ticket-md.js'

export const CARGA_MAX_POR_CPU = 0.75
export const LIVRE_MIN_BYTES = 2 * 1024 ** 3

export function worktreeAlvo(raiz: string): string {
  let dir = '../_worktrees'
  try {
    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { worktrees_dir?: unknown }
    if (typeof c.worktrees_dir === 'string' && c.worktrees_dir) dir = c.worktrees_dir
  } catch {
    /* sem config: o padrão do triador */
  }
  return resolve(raiz, dir, branchAlvo(raiz))
}

export function maquina(raiz: string): { carga: number; cpus: number; livre_bytes: number } {
  const f = process.env.ORQ_RESOLVEDOR_MAQUINA
  if (f) return JSON.parse(f) as { carga: number; cpus: number; livre_bytes: number }
  const s = statfsSync(raiz)
  return { carga: loadavg()[0] ?? 0, cpus: cpus().length || 1, livre_bytes: s.bavail * s.bsize }
}

/** A condição do R5 sumiu? `null` = sumiu; senão o motivo de ainda não reabrir. */
export function condicaoR5(raiz: string, diag: Diagnostico): string | null {
  if (diag.regra === 'D1') {
    const wt = worktreeAlvo(raiz)
    if (!existsSync(wt)) return `worktree alvo ${wt} não existe: não dá para ver se está limpa`
    const r = gitLeitura(wt, ['status', '--porcelain'])
    if (r.rc !== 0) return `git status na worktree alvo falhou (rc ${r.rc})`
    const n = r.stdout.split('\n').filter(Boolean)
    return n.length ? `árvore alvo ainda suja: ${n.length} arquivo(s) (${n.slice(0, 3).map((l) => l.slice(3)).join(', ')})` : null
  }
  if (diag.regra === 'D4') {
    const m = maquina(raiz)
    const porCpu = m.carga / Math.max(1, m.cpus)
    if (porCpu > CARGA_MAX_POR_CPU) return `máquina ocupada: carga ${m.carga.toFixed(2)} em ${m.cpus} CPU(s) (> ${CARGA_MAX_POR_CPU} por CPU)`
    if (m.livre_bytes < LIVRE_MIN_BYTES) return `disco cheio: ${(m.livre_bytes / 1024 ** 3).toFixed(1)} GiB livres (< 2 GiB)`
    return null
  }
  return `R5 ${diag.regra ?? 'sem regra'}: sem condição verificável nesta etapa`
}

export function planejarR5(raiz: string, diag: Diagnostico, md: string): Plano<{ novo: string; condicao: string }> {
  const falta = condicaoR5(raiz, diag)
  if (falta) return { ok: false, motivo: falta }
  try {
    return { ok: true, plano: { novo: reabrir(md), condicao: diag.regra === 'D1' ? 'árvore alvo limpa' : 'máquina livre' } }
  } catch (e) {
    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
    throw e
  }
}
