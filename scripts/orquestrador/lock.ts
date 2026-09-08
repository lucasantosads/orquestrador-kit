/**
 * lock.ts — detecção de lock órfão (lógica pura testável por vitest).
 *
 * Formato do lockfile: linha 1 = PID, linha 2 = timestamp unix (segundos).
 * A auto-limpeza no bash usa estas funções; a decisão de "é stale?" é exercida
 * diretamente pelo enforcement e pelos gates.
 *
 * PORTE (ORQ-02): vindo de comarka-os, sem adaptação de lógica. O módulo já era
 * puro e sem dependência do repo de origem.
 */

export interface LockData {
  pid: number
  timestamp: number
}

/** Lê e valida o conteúdo de um lockfile. Retorna null se malformado. */
export function parseLockFile(content: string): LockData | null {
  const lines = content.trim().split('\n')
  const pid = parseInt(lines[0] ?? '', 10)
  const timestamp = parseInt(lines[1] ?? '', 10)
  if (isNaN(pid) || isNaN(timestamp)) return null
  return { pid, timestamp }
}

/**
 * Decide se um lock é órfão (stale).
 * Stale se: idade > maxAgeSeconds OU pid não está vivo (isPidAlive retorna false).
 * isPidAlive é injetado para permitir testes sem dependência de OS.
 */
export function isLockStale(
  lock: LockData,
  nowSeconds: number,
  maxAgeSeconds: number,
  isPidAlive: (pid: number) => boolean,
): boolean {
  if (nowSeconds - lock.timestamp > maxAgeSeconds) return true
  if (!isPidAlive(lock.pid)) return true
  return false
}
