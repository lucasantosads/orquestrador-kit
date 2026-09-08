/**
 * decisao-cli.ts — ponte entre o executor.sh e a lógica pura do decisao.ts.
 * O bash não decide nada: manda o estado por stdin e lê a decisão em JSON.
 *
 * Uso: npx tsx decisao-cli.ts <raiz> <subcomando> [args]   (payload em stdin)
 *   restricao <slug>          -> {permitido, exitCode, mensagem}; sai com exitCode
 *   worktree <id>             -> imprime o nome da worktree (com prefixo do config)
 *   desfecho                  -> stdin = SinalTentativa; imprime Veredito
 *   retry <tentativa> <modelo>-> stdin = Veredito; imprime PlanoRetry
 *   meta                      -> stdin = entrada; imprime RegistroMeta
 */
import { readFileSync } from 'node:fs'
import {
  avaliaRestricaoExecucao,
  decidirDesfecho,
  decidirRetry,
  registroMeta,
  nomeWorktree,
  prefixoDeWorktree,
  modeloIndefinido,
  modeloRecusado,
} from './decisao.js'
import { defaultToolsFromGates, toolsDoTicket } from './perfil.js'
import type { DecisaoConfig, SinalTentativa, Veredito } from './decisao.js'

const [raiz, sub, ...args] = process.argv.slice(2)
if (!raiz || !sub) {
  process.stderr.write('uso: decisao-cli.ts <raiz> <subcomando> [args]\n')
  process.exit(2)
}
const config = JSON.parse(readFileSync(`${raiz}/docs/fila/000-config.json`, 'utf8')) as DecisaoConfig
const stdin = () => JSON.parse(readFileSync(0, 'utf8'))
const out = (v: unknown) => process.stdout.write(JSON.stringify(v) + '\n')

switch (sub) {
  case 'restricao': {
    const r = avaliaRestricaoExecucao(config, args[0] ?? '')
    out(r)
    process.exit(r.permitido ? 0 : r.exitCode)
    break
  }
  case 'modelo-indefinido': {
    // exit 0 = indefinido (PENDENTE_*), 1 = parece um modelo de verdade.
    process.exit(modeloIndefinido(args[0] ?? '') ? 0 : 1)
    break
  }
  case 'modelo-recusado': {
    // stdin = saída do claude. exit 0 = o modelo foi RECUSADO pelo CLI.
    process.exit(modeloRecusado(readFileSync(0, 'utf8')) ? 0 : 1)
    break
  }
  case 'tools': {
    // Allowlist derivada dos gates E dos critérios do ticket (peça 0c). Vive
    // aqui porque `npx tsx -e` roda como CJS e não resolve './perfil.js'.
    // Os `cmd` dos critérios chegam em ARGV como JSON, não por stdin: `tools` é
    // chamado sem pipe em vários lugares, e ler stdin travaria a chamada.
    let criterioCmds: string[] = []
    if (args[0]) {
      try {
        criterioCmds = (JSON.parse(args[0]) as string[]).filter((c) => typeof c === 'string')
      } catch {
        criterioCmds = []
      }
    }
    const gateCmds = (config as unknown as { gates: { cmd: string }[] }).gates.map((g) => g.cmd)
    process.stdout.write(toolsDoTicket(gateCmds, criterioCmds))
    break
  }
  case 'worktree': {
    process.stdout.write(nomeWorktree(prefixoDeWorktree(config), args[0] ?? '') + '\n')
    break
  }
  case 'desfecho': {
    out(decidirDesfecho(config, stdin() as SinalTentativa))
    break
  }
  case 'retry': {
    const plano = decidirRetry(config, stdin() as Veredito, Number(args[0] ?? 0), args[1] ?? '')
    out(plano)
    break
  }
  case 'meta': {
    out(registroMeta(stdin()))
    break
  }
  default:
    process.stderr.write(`subcomando desconhecido: ${sub}\n`)
    process.exit(2)
}
