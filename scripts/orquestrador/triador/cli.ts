/**
 * cli.ts — `orq triar <repo> [<id>] [--passada] [--forcar]`.
 *
 * Roda a partir do KIT, lê o repo (caminho ou nome do `~/.orq/repos.json`),
 * grava o diagnóstico em `ORQ_DIAG_DIR` (padrão `~/.orq/diagnosticos`) e
 * imprime o resumo: uma linha por ticket. Não escreve no repo.
 */
import { triarRepo, resolverRepo, type Resultado } from './triar.js'

export function resumo(rs: Resultado[]): string {
  const linhas = rs.map((r) => {
    const d = r.diagnostico
    if (!d) return `${r.id}\t${r.feito}`
    const classe = d.classe ?? 'sem classe'
    const como = d.fonte === 'modelo' ? `modelo (${d.confianca})` : d.firme ? `firme ${d.regra}` : `palpite ${d.regra ?? '-'}`
    return `${r.id}\t${classe}\t${como}\t${d.remedio}${d.requeue !== 'nao' ? `\t[requeue ${d.requeue}]` : ''}`
  })
  const firmes = rs.filter((r) => r.diagnostico?.firme).length
  const palpites = rs.filter((r) => r.diagnostico && !r.diagnostico.firme).length
  linhas.push(`-- ${rs.length} ticket(s): ${firmes} firme(s), ${palpites} palpite(s)/modelo, ${rs.length - firmes - palpites} sem nova triagem`)
  return linhas.join('\n')
}

export interface Args {
  repo: string
  id?: string
  passada: boolean
  forcar: boolean
}

export function parseArgs(argv: string[]): Args {
  const pos = argv.filter((a) => !a.startsWith('--'))
  const flags = argv.filter((a) => a.startsWith('--'))
  for (const f of flags) if (!['--passada', '--forcar'].includes(f)) throw new Error(`flag desconhecida: ${f}`)
  if (!pos[0] || pos.length > 2) throw new Error('uso: orq triar <repo> [<id>] [--passada] [--forcar]')
  return { repo: pos[0], ...(pos[1] ? { id: pos[1] } : {}), passada: flags.includes('--passada'), forcar: flags.includes('--forcar') }
}

export function main(argv: string[]): number {
  let a: Args
  try {
    a = parseArgs(argv)
  } catch (e) {
    process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
    return 1
  }
  const repo = resolverRepo(a.repo)
  const rs = triarRepo(repo, { ...(a.id ? { id: a.id } : {}), passada: a.passada, forcar: a.forcar })
  process.stdout.write(`${repo.nome} (${repo.caminho})\n${resumo(rs)}\n`)
  return 0
}

if (/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(main(process.argv.slice(2)))
