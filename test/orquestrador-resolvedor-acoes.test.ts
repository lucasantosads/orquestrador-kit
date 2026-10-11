/**
 * Etapa 7f-b2, peça 3 · as ações R1 e R5 (árvore suja, máquina) com as travas.
 *
 * Pronto quando (além do gabarito da peça 1 no 840, 940 e 932):
 *   - segunda passada no mesmo ticket não age de novo (bloqueou outra vez:
 *     vai para humano);
 *   - com git rodando (processo ou index.lock) ele espera, e desiste no teto;
 *   - com o interruptor ele não faz nada (nem triagem, nem ledger);
 *   - o commit tem só o arquivo do ticket (o que mais estiver no índice fica)
 *     e o trailer; o hook do repo roda (nunca --no-verify) e, se recusa, o
 *     arquivo volta;
 *   - nenhuma escrita fora de docs/fila do ticket bloqueado;
 *   - R5 só reabre quando a condição sumiu (árvore alvo limpa; máquina livre);
 *   - em sombra, só a proposta.
 */
import { spawn, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
const AGORA = Date.parse('2026-10-11T12:00:00Z')

interface Item {
  id: string
  acao: string
  feito: string
  motivo: string
  commit?: string
  proposta?: string
}
interface Mods {
  passada: (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { pausado: boolean; itens: Item[] }
  confereTicket?: (raiz: string, id: string, rel: string) => string
}
async function carregar(): Promise<Mods | null> {
  const imp = async (f: string) => {
    try {
      return (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  const m = { ...(await imp('passada.ts')), ...(await imp('repo.ts')) }
  return typeof m.passada === 'function' ? (m as unknown as Mods) : null
}

/** Todo arquivo do repo fora do .git: caminho → sha do conteúdo e mtime. */
function foto(raiz: string): Map<string, string> {
  const out = new Map<string, string>()
  const varre = (d: string) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name)
      if (e.name === '.git') continue
      if (e.isDirectory()) varre(p)
      else out.set(relative(raiz, p), `${createHash('sha256').update(readFileSync(p)).digest('hex')} ${statSync(p).mtimeMs}`)
    }
  }
  varre(raiz)
  return out
}

describe('peça 3: ações R1 e R5 com as travas', () => {
  let m: Mods | null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  /** um repo do caso, sozinho no repos.json, no modo dado */
  const caso = (id: string, modos: unknown = { R1: 'auto', R5: 'auto', R2: 'sombra' }, o: { arvoreSuja?: boolean } = {}) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional', ...o })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: modos }])
    return r
  }
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  const passa = () => m!.passada({ repo: 'cmk', semModelo: true, agora: AGORA })

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    m = await carregar()
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    for (const f of ['git-rodando']) if (existsSync(join(amb.base, f))) spawnSync('rm', ['-f', join(amb.base, f)])
    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_RESOLVEDOR_PAUSADO!, amb.env.ORQ_DIAG_DIR!])
    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
    delete process.env.ORQ_RESOLVEDOR_MAQUINA
  })

  it('o módulo existe, com a porta de escrita no repo', () => {
    expect(m).not.toBeNull()
    expect(m!.confereTicket, 'resolvedor/repo.ts com confereTicket').toBeTypeOf('function')
  })

  it('segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano', () => {
    const r = caso('940')
    const p1 = passa()
    expect(p1.itens).toEqual([expect.objectContaining({ id: '940', feito: 'aplicado' })])
    const commits = git(r.raiz, 'rev-list', '--count', 'HEAD')
    // a mesma passada de novo: o ticket já não está bloqueado
    expect(passa().itens).toEqual([])
    // o loop bloqueia de novo (writeback não commitado, como no Comarka)
    writeFileSync(join(r.raiz, r.ticket), r.antes)
    const p3 = passa()
    expect(p3.itens).toEqual([expect.objectContaining({ id: '940', feito: 'nao_consegui', motivo: expect.stringMatching(/segunda vez bloqueado/) })])
    expect(git(r.raiz, 'rev-list', '--count', 'HEAD')).toBe(commits)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(ledger().filter((e) => e.tipo === 'acao')).toHaveLength(1)
  })

  it('com git rodando ele espera, e age quando o git sai', () => {
    const r = caso('932')
    const flag = join(amb.base, 'git-rodando')
    writeFileSync(flag, '')
    process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S = '10'
    spawn('bash', ['-c', `sleep 1; rm -f '${flag}'`], { detached: true, stdio: 'ignore' }).unref()
    const t0 = Date.now()
    const p = passa()
    process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S = amb.env.ORQ_RESOLVEDOR_ESPERA_GIT_S!
    expect(Date.now() - t0).toBeGreaterThanOrEqual(900)
    expect(p.itens).toEqual([expect.objectContaining({ id: '932', feito: 'aplicado' })])
    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('pendente')
  })

  it('com git rodando além do teto ele desiste sem escrever (processo e index.lock)', () => {
    const r = caso('940')
    writeFileSync(join(amb.base, 'git-rodando'), '')
    const t0 = Date.now()
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/git rodando: processo git/) })])
    expect(Date.now() - t0).toBeGreaterThanOrEqual(1900)
    spawnSync('rm', ['-f', join(amb.base, 'git-rodando')])
    writeFileSync(join(r.raiz, '.git', 'index.lock'), '')
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/index\.lock/) })])
    spawnSync('rm', ['-f', join(r.raiz, '.git', 'index.lock')])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
  })

  it('com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo', () => {
    const r = caso('940')
    writeFileSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!, 'pausado\n')
    const p = passa()
    expect(p.pausado).toBe(true)
    expect(p.itens).toEqual([])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(existsSync(join(amb.env.ORQ_DIAG_DIR!, 'cmk'))).toBe(false)
    expect(existsSync(amb.env.ORQ_RESOLVEDOR_DIR!)).toBe(false)
    const cli = spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'resolver', '--repo', 'cmk'], { encoding: 'utf8', env: { ...process.env } })
    expect(cli.status).toBe(0)
    expect(cli.stdout).toMatch(/pausado/)
  })

  it('o commit tem só o arquivo do ticket e o trailer; o resto do índice fica', () => {
    const r = caso('840')
    writeFileSync(join(r.raiz, 'outro.txt'), 'preparado por outro processo\n')
    git(r.raiz, 'add', 'outro.txt')
    expect(passa().itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
    expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
    const corpo = git(r.raiz, 'log', '-1', '--format=%B')
    expect(corpo).toMatch(/^Orq-Resolvedor: R1 D6 [0-9a-f]{64}$/m)
    expect(git(r.raiz, 'log', '-1', '--format=%(trailers:key=Orq-Resolvedor,valueonly)').trim()).toMatch(/^R1 D6 [0-9a-f]{64}$/)
    expect(git(r.raiz, 'diff', '--cached', '--name-only').trim()).toBe('outro.txt')
    const a = ledger().filter((e) => e.tipo === 'acao')
    expect(a).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', classe: 'R1', regra: 'D6', commit: git(r.raiz, 'rev-parse', 'HEAD').trim(), arquivo: r.ticket })])
  })

  it('o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta', () => {
    const r = caso('932')
    const hook = join(r.raiz, '.git', 'hooks', 'pre-commit')
    mkdirSync(join(r.raiz, '.git', 'hooks'), { recursive: true })
    writeFileSync(hook, `#!/bin/bash\necho "validar-fila: recusado" >&2\ntouch '${join(amb.base, 'hook-rodou')}'\nexit 1\n`)
    chmodSync(hook, 0o755)
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/commit recusado.*validar-fila: recusado/) })])
    expect(existsSync(join(amb.base, 'hook-rodou'))).toBe(true)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
  })

  it('nenhuma escrita fora de docs/fila do ticket bloqueado', () => {
    const r = caso('840')
    const antes = foto(r.raiz)
    const alvoAntes = foto(r.alvo)
    passa()
    const depois = foto(r.raiz)
    const mudou = [...depois].filter(([k, v]) => antes.get(k) !== v).map(([k]) => k)
    expect(mudou).toEqual([r.ticket])
    expect([...antes.keys()].filter((k) => !depois.has(k))).toEqual([])
    expect(foto(r.alvo)).toEqual(alvoAntes)
    // a porta recusa o resto
    expect(m!.confereTicket).toBeTypeOf('function')
    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/841-outro.md')).toThrow(/fora do ticket/)
    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/runs/840-x.md')).toThrow(/fora do ticket/)
    expect(() => m!.confereTicket!(r.raiz, '840', '../840-x.md')).toThrow(/fora do ticket/)
    expect(() => m!.confereTicket!(r.raiz, '840', 'src/840-x.md')).toThrow(/fora do ticket/)
    symlinkSync(join(amb.base, 'fora.md'), join(r.raiz, 'docs/fila/840-link.md'))
    expect(() => m!.confereTicket!(r.raiz, '840', 'docs/fila/840-link.md')).toThrow(/symlink/)
  })

  it('R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa', () => {
    const r = caso('940', { R5: 'auto' }, { arvoreSuja: true })
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/árvore alvo ainda suja: 1 arquivo/) })])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    git(r.alvo, 'checkout', '--', 'LEIA.md')
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'aplicado' })])
  })

  it('R5 máquina (801, D4): só reabre com a máquina livre', () => {
    const r = caso('801', { R5: 'auto' })
    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 9, cpus: 8, livre_bytes: 50 * 1024 ** 3 })
    expect(passa().itens).toEqual([expect.objectContaining({ id: '801', acao: 'r5_reabrir', feito: 'nao_consegui', motivo: expect.stringMatching(/máquina ocupada/) })])
    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 1, cpus: 8, livre_bytes: 1024 ** 3 })
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/disco cheio/) })])
    process.env.ORQ_RESOLVEDOR_MAQUINA = JSON.stringify({ carga: 1, cpus: 8, livre_bytes: 50 * 1024 ** 3 })
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'aplicado' })])
    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('pendente')
    expect(git(r.raiz, 'log', '-1', '--format=%B')).toMatch(/^Orq-Resolvedor: R5 D4 [0-9a-f]{64}$/m)
  })

  it('R1 com .skip no teste do branch alvo: não age', () => {
    const r = caso('840')
    git(r.raiz, 'checkout', '-q', 'staging-auto')
    const f = join(r.raiz, 'test/nps-reacao-resposta.test.ts')
    writeFileSync(f, readFileSync(f, 'utf8').replace('it(', 'it.skip('))
    git(r.raiz, 'commit', '-qam', 'skip')
    git(r.raiz, 'checkout', '-q', 'main')
    expect(passa().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/\.skip\/\.only\/\.todo/) })])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })

  it('R1 em sombra: só a proposta com o diff, o repo intocado', () => {
    const r = caso('840', { R1: 'sombra' })
    const p = passa()
    expect(p.itens).toEqual([expect.objectContaining({ acao: 'sombra', feito: 'proposto' })])
    const prop = readFileSync(p.itens[0]!.proposta!, 'utf8')
    expect(prop).toContain('+    "test/nps-reacao-resposta.test.ts"')
    expect(prop).toContain('+  "status": "pendente",')
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
  })
})
