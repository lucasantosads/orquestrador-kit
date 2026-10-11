/**
 * Etapa 7f-b2, peça 7 · `orq desfazer <repo> <id>`: reverte o último commit do
 * resolvedor naquele ticket, só se ele tem o trailer e o arquivo não mudou
 * depois, e marca no ledger.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')
const T0 = Date.parse('2026-10-11T12:00:00Z')

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }

describe('peça 7: orq desfazer', () => {
  let passada: Passada | null = null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  const caso = (id: string) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: { R1: 'auto', R5: 'auto' } }])
    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
    return r
  }
  const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), ...a], { encoding: 'utf8', env: { ...process.env } })
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    passada = ((await import(pathToFileURL(join(RES, 'passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
  })

  it('desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca', () => {
    const r = caso('840')
    const acao = git(r.raiz, 'rev-parse', 'HEAD').trim()
    const p = orq('desfazer', 'cmk', '840')
    expect(p.stderr).toBe('')
    expect(p.status).toBe(0)
    expect(p.stdout).toContain(`desfeito: ${acao} revertido em`)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
    expect(git(r.raiz, 'log', '-1', '--format=%(trailers:key=Orq-Resolvedor-Desfaz,valueonly)').trim()).toBe(acao)
    expect(git(r.raiz, 'rev-parse', 'HEAD^').trim()).toBe(acao)
    expect(ledger().filter((e) => e.tipo === 'desfeito')).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', commit_desfeito: acao, commit: git(r.raiz, 'rev-parse', 'HEAD').trim() })])
    expect(ledger().filter((e) => e.tipo === 'desfecho')).toEqual([expect.objectContaining({ id: '840', desfecho: 'desfeito', bom: false, commit: acao })])
    // o ticket voltou a bloqueado: a ação continua sendo a única dele
    expect(passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 }).itens).toEqual([expect.objectContaining({ id: '840', feito: 'nao_consegui', motivo: expect.stringMatching(/segunda vez/) })])
    // e desfazer de novo é recusado
    const p2 = orq('desfazer', 'cmk', '840')
    expect(p2.status).toBe(1)
    expect(p2.stderr).toMatch(/já foi desfeita/)
  })

  it('recusa sem ação no ledger', () => {
    const p = orq('desfazer', 'cmk', '999')
    expect(p.status).toBe(1)
    expect(p.stderr).toMatch(/não tem ação do resolvedor em cmk 999/)
  })

  it('recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit', () => {
    const r = caso('940')
    const arq = join(r.raiz, r.ticket)
    const depois = readFileSync(arq, 'utf8')
    writeFileSync(arq, depois.replace('"status": "pendente"', '"status": "em_andamento"'))
    const p = orq('desfazer', 'cmk', '940')
    expect(p.status).toBe(1)
    expect(p.stderr).toMatch(/no disco não é o do commit/)
    expect(readFileSync(arq, 'utf8')).toContain('"status": "em_andamento"')
    git(r.raiz, 'commit', '-qam', 'fila: status automatico do loop')
    const p2 = orq('desfazer', 'cmk', '940')
    expect(p2.status).toBe(1)
    expect(p2.stderr).toMatch(/mudou depois da ação: [0-9a-f]+ fila: status automatico do loop/)
    expect(ledger().filter((e) => e.tipo === 'desfeito')).toEqual([])
  })

  it('recusa se o commit não tem o trailer da ação', () => {
    const r = caso('932')
    const lp = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    const raizSha = git(r.raiz, 'rev-parse', 'HEAD^').trim()
    writeFileSync(lp, readFileSync(lp, 'utf8').replace(/"commit":"[0-9a-f]+"/, `"commit":"${raizSha}"`))
    const p = orq('desfazer', 'cmk', '932')
    expect(p.status).toBe(1)
    expect(p.stderr).toMatch(/sem o trailer Orq-Resolvedor/)
  })
})
