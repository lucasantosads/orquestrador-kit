/**
 * cli.ts — `orq triar`, o comando que roda o triador (decisão do chat do
 * programa: o painel nunca dispara gasto; manual primeiro, job do launchd
 * depois).
 *
 *   orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]
 *   orq triar --fixture <dir> [--forcar] [--sem-modelo]
 *
 * <repo> é um caminho ou um nome do `~/.orq/repos.json`. Extração sempre;
 * modelo só para palpite e sem regra, dentro dos tetos (modelo.ts), e nunca
 * na `--passada`. Grava em `ORQ_DIAG_DIR` (padrão `~/.orq/diagnosticos`),
 * nunca no repo, e imprime o resumo: uma linha por ticket.
 */
import { corridaFixture, placar } from './corrida.js'
import { criarPassoModelo, lerConfigModelo } from './modelo.js'
import { resolverRepo, triarRepo, type Resultado } from './triar.js'

export function resumo(rs: Resultado[]): string {
  const linhas = rs.map((r) => {
    const d = r.diagnostico
    if (!d) return `${r.id}\t${r.feito}`
    const classe = d.classe ?? 'sem classe'
    const pulado = (d.modelo as { pulado?: string; erro?: string } | null)?.pulado
    const erro = (d.modelo as { erro?: string } | null)?.erro
    const como =
      d.fonte === 'modelo' ? `modelo (${d.confianca})` : d.firme ? `firme ${d.regra}` : `palpite ${d.regra ?? '-'}${pulado ? `, modelo pulado: ${pulado}` : erro ? `, modelo.erro: ${erro}` : ''}`
    return `${r.id}\t${classe}\t${como}\t${d.remedio}${d.requeue !== 'nao' ? `\t[requeue ${d.requeue}]` : ''}`
  })
  const firmes = rs.filter((r) => r.diagnostico?.firme).length
  const outros = rs.filter((r) => r.diagnostico && !r.diagnostico.firme).length
  linhas.push(`-- ${rs.length} ticket(s): ${firmes} firme(s), ${outros} palpite(s) ou modelo, ${rs.length - firmes - outros} sem nova triagem`)
  return linhas.join('\n')
}

export interface Args {
  repo?: string
  id?: string
  fixture?: string
  passada: boolean
  forcar: boolean
  semModelo: boolean
}

const USO = 'uso: orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo] | orq triar --fixture <dir> [--forcar] [--sem-modelo]'

export function parseArgs(argv: string[]): Args {
  const a: Args = { passada: false, forcar: false, semModelo: false }
  const pos: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const x = argv[i]!
    if (x === '--passada') a.passada = true
    else if (x === '--forcar') a.forcar = true
    else if (x === '--sem-modelo') a.semModelo = true
    else if (x === '--fixture') {
      const d = argv[++i]
      if (!d) throw new Error(USO)
      a.fixture = d
    } else if (x.startsWith('--')) throw new Error(`flag desconhecida: ${x}`)
    else pos.push(x)
  }
  if (a.fixture) {
    if (pos.length || a.passada) throw new Error(USO)
    return a
  }
  if (!pos[0] || pos.length > 2) throw new Error(USO)
  a.repo = pos[0]
  if (pos[1]) a.id = pos[1]
  return a
}

export function main(argv: string[]): number {
  let a: Args
  try {
    a = parseArgs(argv)
  } catch (e) {
    process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
    return 1
  }
  const cfg = lerConfigModelo()
  const modelo = a.semModelo || a.passada ? null : criarPassoModelo(cfg)
  if (a.fixture) {
    process.stdout.write(`${placar(corridaFixture(a.fixture, { modelo, forcar: a.forcar }))}\n`)
    return 0
  }
  const repo = resolverRepo(a.repo!)
  const rs = triarRepo(repo, { ...(a.id ? { id: a.id } : {}), passada: a.passada, forcar: a.forcar, modelo })
  const teto = modelo ? `modelo ${cfg.modelo ?? 'desligado'}, teto US$ ${cfg.teto_dia_usd.toFixed(2)}/dia` : 'sem modelo'
  process.stdout.write(`${repo.nome} (${repo.caminho}) · ${teto}\n${resumo(rs)}\n`)
  return 0
}

if (/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(main(process.argv.slice(2)))
