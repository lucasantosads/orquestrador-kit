/**
 * cli.ts — `orq resolver` (etapa 7f-b2).
 *
 *   orq resolver [--repo X] [--dry-run] [--sem-modelo]
 *   orq desfazer <repo> <id>
 *
 * <X> é um nome do `~/.orq/repos.json` ou um caminho. Sem `--repo`, todos os
 * repos do repos.json, cada um no seu modo (modos.ts). Imprime uma linha por
 * bloqueado, na ordem em que a passada os tratou.
 */
import { desfazer } from './desfazer.js'
import { passada, resumo } from './passada.js'

const USO_RESOLVER = 'uso: orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]'
const USO_DESFAZER = 'uso: orq desfazer <repo> <id>'

export function parseResolver(argv: string[]): { repo?: string; dryRun: boolean; semModelo: boolean } {
  const a: { repo?: string; dryRun: boolean; semModelo: boolean } = { dryRun: false, semModelo: false }
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]!
    if (x === '--dry-run') a.dryRun = true
    else if (x === '--sem-modelo') a.semModelo = true
    else if (x === '--repo') {
      const r = argv[++i]
      if (!r) throw new Error(USO_RESOLVER)
      a.repo = r
    } else throw new Error(x.startsWith('--') ? `flag desconhecida: ${x}` : USO_RESOLVER)
  }
  return a
}

export function main(argv: string[]): number {
  const [verbo, ...resto] = argv
  try {
    if (verbo === 'resolver') {
      const a = parseResolver(resto)
      const r = passada({ ...(a.repo ? { repo: a.repo } : {}), dryRun: a.dryRun, semModelo: a.semModelo })
      process.stdout.write(`${a.dryRun ? '[dry-run] ' : ''}${resumo(r)}\n`)
      return 0
    }
    if (verbo === 'desfazer') {
      if (resto.length !== 2 || resto.some((x) => x.startsWith('--'))) throw new Error(USO_DESFAZER)
      const r = desfazer({ repo: resto[0]!, id: resto[1]! })
      if (!r.ok) {
        process.stderr.write(`[orq desfazer] não desfiz: ${r.motivo}\n`)
        return 1
      }
      process.stdout.write(`desfeito: ${r.desfez} revertido em ${r.commit}\n`)
      return 0
    }
    throw new Error(`${USO_RESOLVER} | ${USO_DESFAZER}`)
  } catch (e) {
    process.stderr.write(`[orq ${verbo ?? 'resolver'}] ${(e as Error).message}\n`)
    return 1
  }
}

if (/resolvedor\/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(main(process.argv.slice(2)))
