/**
 * git.ts — o ÚNICO ponto onde o triador chama git (spec 7f-a §6, regra 3).
 *
 * Só leitura e só com `GIT_OPTIONAL_LOCKS=0`: um `git status` comum regrava o
 * índice (refresh de stat) e cria `index.lock` no repo de outro processo; o
 * loop do repo instalado pode estar rodando na mesma hora. Verbos permitidos:
 * `show`, `log`, `status --porcelain`, `rev-parse`, `ls-tree`. Qualquer outro
 * lança exceção, antes de existir processo.
 *
 * O binário é o `git` do PATH: o teste da peça 4 põe um git falso na frente e
 * confere o ambiente de cada chamada.
 */
import { spawnSync } from 'node:child_process'

const PERMITIDOS = new Set(['show', 'log', 'rev-parse', 'ls-tree', 'status'])

export class GitProibido extends Error {}

export interface ResultadoGit {
  rc: number
  stdout: string
}

export function gitLeitura(raiz: string, args: string[]): ResultadoGit {
  const verbo = args[0] ?? ''
  if (!PERMITIDOS.has(verbo)) throw new GitProibido(`gitLeitura: verbo proibido "${verbo}"`)
  if (verbo === 'status' && !args.includes('--porcelain')) {
    throw new GitProibido('gitLeitura: status só com --porcelain')
  }
  const r = spawnSync('git', ['-C', raiz, ...args], {
    encoding: 'utf8',
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  return { rc: r.status ?? 1, stdout: r.stdout ?? '' }
}
