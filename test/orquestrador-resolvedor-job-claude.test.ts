/**
 * Etapa 7f-b4, peça 3 · o `claude` no PATH do job.
 *
 * Em 11/10 o job com.orq.resolvedor não achava o `claude` (ele fica em
 * ~/.local/bin, fora do PATH do plist): o modelo do triador nunca rodou.
 *
 * Pronto quando:
 *   - `instalar-job.sh --dry-run` põe o diretório de `command -v claude` no
 *     PATH do plist, depois do diretório do node (o ~/.local/bin também tem um
 *     `node`), e recusa (rc 1, nada impresso no stdout) se não achar o `claude`;
 *   - o job.sh, sem o `claude`, grava UMA linha MODELO_INDISPONIVEL no job.log
 *     por dia e segue só com extração: nenhuma chamada, nada no teto;
 *   - quando o `claude` volta, o ticket triado sem modelo é triado de novo,
 *     uma vez, com o modelo (a assinatura é a mesma, mas o modelo nunca rodou).
 * Nenhum launchctl de verdade, nenhum claude de verdade: só stubs.
 */
import { spawnSync } from 'node:child_process'
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { beforeAll, describe, expect, it } from 'vitest'
import { ambiente } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const DIR = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
const NODE_DIR = dirname(process.execPath)
const hoje = () => new Date().toISOString().slice(0, 10)

describe('peça 3: o claude no PATH do job', () => {
  let home: string
  let bin: string
  let comClaude: string
  let amb: ReturnType<typeof ambiente>
  let semClaudePath: string
  beforeAll(() => {
    home = mkdtempSync(join(tmpdir(), 'resolvedor-claude-'))
    bin = join(home, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'launchctl'), `#!/bin/bash\necho "$@" >> '${join(home, 'launchctl-chamado')}'\n`)
    chmodSync(join(bin, 'launchctl'), 0o755)
    // o diretório do `claude` desta "máquina": o stub, com o nome de verdade
    comClaude = join(home, 'local-bin')
    mkdirSync(comClaude)
    copyFileSync(STUB, join(comClaude, 'claude'))
    chmodSync(join(comClaude, 'claude'), 0o755)
    // um PATH com node, git e jq, sem claude
    semClaudePath = `${bin}:${NODE_DIR}:/usr/bin:/bin:/usr/sbin:/sbin`
    expect(spawnSync('bash', ['-c', 'command -v claude'], { env: { PATH: semClaudePath } }).status).toBe(1)
    amb = ambiente()
    const actus = join(amb.base, 'actus-saas')
    cpSync(FX243, actus, { recursive: true })
    amb.repos([{ caminho: actus }])
    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
  })

  const base = () => ({ ...amb.env, HOME: home, ORQ_TESTE: '1', STUB_LOG: join(amb.base, 'stub.log'), STUB_RESPOSTA: join(amb.base, 'resposta.json') })
  const instalar = (path: string, ...a: string[]) => spawnSync('bash', [join(DIR, 'instalar-job.sh'), ...a], { encoding: 'utf8', env: { ...base(), PATH: path } })
  const job = (env: Record<string, string>) => spawnSync('bash', [join(DIR, 'job.sh')], { encoding: 'utf8', env: { ...base(), ...env } })
  const chamadas = () => (existsSync(join(amb.base, 'stub.log')) ? readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n').filter(Boolean).length : 0)
  const custo = () => (existsSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json')) ? readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), 'utf8') : null)
  const modelo243 = () => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'actus-saas', '243.json'), 'utf8')) as { modelo: unknown }).modelo

  it('--dry-run: o PATH do plist tem o diretório do claude, depois do node', () => {
    const p = instalar(`${bin}:${NODE_DIR}:${comClaude}:/usr/bin:/bin`, '--dry-run')
    expect(p.status, p.stderr).toBe(0)
    const path = /<key>PATH<\/key>\s*<string>([^<]*)<\/string>/.exec(p.stdout)?.[1]
    expect(path?.split(':')).toEqual([NODE_DIR, comClaude, '/usr/local/bin', '/opt/homebrew/bin', '/usr/bin', '/bin', '/usr/sbin', '/sbin'])
    expect(p.stderr).toContain(`# CLAUDE    = ${comClaude}/claude`)
    expect(existsSync(join(home, 'Library'))).toBe(false)
    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
  })

  it('sem claude no PATH: recusa, com ou sem --dry-run, antes de escrever ou chamar launchctl', () => {
    for (const a of [['--dry-run'], []]) {
      const p = instalar(semClaudePath, ...a)
      expect({ rc: p.status, stdout: p.stdout }).toEqual({ rc: 1, stdout: '' })
      expect(p.stderr).toMatch(/ERRO: claude nao esta no PATH/)
    }
    expect(existsSync(join(home, 'Library'))).toBe(false)
    expect(existsSync(join(home, 'launchctl-chamado'))).toBe(false)
  })

  it('job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto', () => {
    const p1 = job({ PATH: semClaudePath })
    expect(p1.status, p1.stderr).toBe(0)
    expect(p1.stdout.match(/MODELO_INDISPONIVEL/g)).toHaveLength(1)
    expect(p1.stdout).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ MODELO_INDISPONIVEL claude fora do PATH/m)
    expect(p1.stdout).toMatch(/actus-saas\t243\t/)
    const p2 = job({ PATH: semClaudePath })
    expect(p2.status, p2.stderr).toBe(0)
    expect(p2.stdout).not.toMatch(/MODELO_INDISPONIVEL/)
    expect(readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'modelo-indisponivel'), 'utf8').trim()).toBe(hoje())
    expect({ chamadas: chamadas(), custo: custo(), modelo: modelo243() }).toEqual({ chamadas: 0, custo: null, modelo: null })
    // outro dia: a linha volta, uma vez
    writeFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'modelo-indisponivel'), '2026-10-10\n')
    expect(job({ PATH: semClaudePath }).stdout.match(/MODELO_INDISPONIVEL/g)).toHaveLength(1)
  })

  it('o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez', () => {
    const env = { PATH: `${semClaudePath}:${comClaude}`, ORQ_TRIADOR_CLAUDE: join(comClaude, 'claude') }
    const p = job(env)
    expect(p.status, p.stderr).toBe(0)
    expect(p.stdout).not.toMatch(/MODELO_INDISPONIVEL/)
    expect(chamadas()).toBe(1)
    expect(modelo243()).toMatchObject({ modelo: 'claude-opus-5-5', custo_usd: 0.25 })
    expect(job(env).status).toBe(0)
    expect(chamadas()).toBe(1)
  })
})
