/**
 * Harness da etapa M69: o que o motor IMPRIME com um config real — o prompt e o
 * `--allowedTools` de uma tentativa, e o `gates.txt` de uma passada de gates.
 *
 * É a régua do "chave ausente = hoje, byte a byte": os gabaritos em `ouro/`
 * foram gravados com o motor de `ee8c4a7` (antes da M69) por
 * `M69_GRAVAR_OURO=1`, e o teste compara o motor atual contra eles.
 *
 * Os comandos dos gates não rodam de verdade: `npx`, `npm` e os binários de
 * `node_modules/.bin` são stubs que imprimem saída REAL de vitest
 * (`test/fixtures/instavel-l11`, do Comarka) e saem com o rc do cenário.
 */
import { chmodSync, cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { criarFixture, escreverTicket, ler, REPO_ROOT } from '../orq-harness.js'

export const M69 = import.meta.dirname
export const OURO = join(M69, 'ouro')
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh')
const GATES = join(REPO_ROOT, 'scripts', 'orquestrador', 'gates.ts')
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx')

/** Os configs reais desta etapa (procedência em PROCEDENCIA.md). */
export const CONFIGS = {
  comarka: join(M69, 'config-comarka-migrado.json'),
  ci: join(M69, 'config-ci.json'),
  dashboard: join(M69, 'config-dashboard.json'),
} as const
export type Repo = keyof typeof CONFIGS

export const VITEST_VERDE = readFileSync(join(REPO_ROOT, 'test/fixtures/instavel-l11/isolado-1523-attempt-1.txt'), 'utf8')
export const VITEST_VERMELHO = readFileSync(join(REPO_ROOT, 'test/fixtures/instavel-l11/vitest-1523-attempt-1.txt'), 'utf8')

export const TICKET = {
  id: '6901',
  slug: 'selecao-m69',
  objetivo: 'ajusta o calculo e prova com teste',
  pathspec_allowlist: ['src/calculo.ts', 'test/calculo.test.ts'],
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'o teste do calculo passa', cmd: 'npx vitest run test/calculo.test.ts', espera: 'passed' },
    { tipo: 'avaliador', descricao: 'o calculo cobre o caso novo', cmd: 'true', espera: 'avaliador' },
  ],
}

/** O config pode trazer um objeto por cima (o teste liga a chave nova assim). */
export function configCom(repo: Repo, ajuste?: (c: Record<string, unknown>) => void): string {
  const c = JSON.parse(readFileSync(CONFIGS[repo], 'utf8')) as Record<string, unknown>
  ajuste?.(c)
  return `${JSON.stringify(c, null, 2)}\n`
}

/**
 * Uma tentativa real (`run_attempt`) até a chamada do agente: o `claude_run`
 * interceptado grava o argv e encerra. Prompt e tools são os da MESMA chamada.
 */
export function promptETools(configTexto: string): { prompt: string; tools: string; base: string; stderr: string } {
  const fx = criarFixture([])
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), configTexto)
  escreverTicket(fx, TICKET)
  const wt = join(fx, 'wt')
  mkdirSync(join(wt, 'src'), { recursive: true })
  writeFileSync(join(wt, 'src', 'calculo.ts'), 'export const calculo = 1\n')
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
  g('init', '-q', '-b', 'main')
  g('add', '-A')
  g('commit', '-qm', 'base')
  const base = g('rev-parse', 'HEAD').stdout.trim()
  const rundir = join(fx, 'docs', 'fila', 'runs', TICKET.id, 'attempt-0')
  const argvFile = join(fx, 'argv.txt')
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}"`,
    'set +e',
    `claude_run() { shift 3; [ "\${1:-}" = "--" ] && shift; printf '%s\\n' "$@" > "${argvFile}"; exit 0; }`,
    `run_attempt "$(ticket_file_by_id ${TICKET.id})" "${wt}" "${rundir}" sonnet "" 0`,
  ].join('\n')
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } })
  const argv = ler(argvFile).replace(/\n$/, '').split('\n')
  const i = argv.indexOf('--allowedTools')
  return { prompt: ler(join(rundir, 'prompt.txt')), tools: i >= 0 ? (argv[i + 1] ?? '') : '', base, stderr: r.stderr ?? '' }
}

export interface Cenario {
  /** saída e rc de cada comando; a chave é o nome do stub e o 1º argumento (`npx-vitest`, `npm-run`). */
  [stub: string]: { saida: string; rc: number }
}

/** Cenário padrão: tudo verde; `vermelho` põe o vitest real vermelho no comando de testes. */
export function cenario(vermelho: boolean): Cenario {
  const vitest = vermelho ? { saida: VITEST_VERMELHO, rc: 1 } : { saida: VITEST_VERDE, rc: 0 }
  return {
    'npx-tsc': { saida: '', rc: 0 },
    'tsc---noEmit': { saida: '', rc: 0 },
    'npx-vitest': vitest,
    'vitest-run': vitest,
    'vitest-list': { saida: '', rc: 0 },
    'next-build': { saida: 'build ok\n', rc: 0 },
    'npm-run': { saida: 'build ok\n', rc: 0 },
    'npm-test': vitest,
  }
}

const STUB = `#!/bin/bash
n="$(basename "$0")-$1"
printf '%s %s\\n' "$(basename "$0")" "$*" >> "$STUB_DIR/chamadas.log"
[ -f "$STUB_DIR/$n.out" ] && cat "$STUB_DIR/$n.out"
exit "$(cat "$STUB_DIR/$n.rc" 2>/dev/null || echo 0)"
`

/**
 * Um checkout de papel com o config em `docs/fila/000-config.json` e os stubs.
 * Devolve a raiz (que faz de worktree e de checkout do config) e o env.
 */
export function checkoutDeGates(configTexto: string, c: Cenario): { raiz: string; env: NodeJS.ProcessEnv; stubDir: string } {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-m69-'))
  mkdirSync(join(raiz, 'docs', 'fila'), { recursive: true })
  mkdirSync(join(raiz, 'docs', 'orquestrador'), { recursive: true })
  mkdirSync(join(raiz, 'apps', 'web'), { recursive: true })
  writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), configTexto)
  cpSync(join(M69, 'baseline-tsc-dashboard.json'), join(raiz, 'docs', 'orquestrador', 'baseline-tsc.json'))
  const stubDir = join(raiz, '.stub')
  const bin = join(raiz, 'node_modules', '.bin')
  mkdirSync(stubDir, { recursive: true })
  mkdirSync(bin, { recursive: true })
  const pathBin = join(stubDir, 'bin')
  mkdirSync(pathBin)
  for (const nome of ['npx', 'npm']) {
    writeFileSync(join(pathBin, nome), STUB)
    chmodSync(join(pathBin, nome), 0o755)
  }
  for (const nome of ['tsc', 'vitest', 'next']) {
    writeFileSync(join(bin, nome), STUB)
    chmodSync(join(bin, nome), 0o755)
  }
  for (const [k, v] of Object.entries(c)) {
    writeFileSync(join(stubDir, `${k}.out`), v.saida)
    writeFileSync(join(stubDir, `${k}.rc`), String(v.rc))
  }
  return { raiz, stubDir, env: { ...process.env, PATH: `${pathBin}:${process.env.PATH}`, STUB_DIR: stubDir, NO_COLOR: '1', FORCE_COLOR: '0' } }
}

/** `gates.ts --run-cli` como o executor chama (executor.sh, fase gates). */
export function rodarGatesCli(
  configTexto: string,
  c: Cenario,
  extra: string[] = [],
): { rc: number; gatesTxt: string; falha: string; chamadas: string; raiz: string } {
  const { raiz, env, stubDir } = checkoutDeGates(configTexto, c)
  const falhaArq = join(raiz, 'gate-falha.txt')
  const r = spawnSync(TSX, [GATES, '--run-cli', raiz, '--config', join(raiz, 'docs', 'fila', '000-config.json'), '--saida-falha', falhaArq, ...extra], {
    encoding: 'utf8',
    cwd: raiz,
    env,
  })
  return { rc: r.status ?? 1, gatesTxt: `${r.stdout ?? ''}${r.stderr ?? ''}`, falha: ler(falhaArq), chamadas: ler(join(stubDir, 'chamadas.log')), raiz }
}

/** Os milissegundos de cada linha de gate mudam a cada passada: o gabarito não os guarda. */
export function semMs(gatesTxt: string): string {
  return gatesTxt.replace(/ +\d+ms/g, ' <ms>ms')
}

/** O caminho do fixture temporário aparece no prompt? Normaliza para comparar. */
export function semTmp(texto: string): string {
  return texto.replace(/\/(private\/)?(var|tmp)\/[^\s'"]*orq-(fx|m69)-[A-Za-z0-9]+/g, '<FX>')
}
