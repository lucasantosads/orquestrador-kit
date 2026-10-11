/**
 * Etapa 7f-b2, peça 6 · promoção e rebaixamento, por classe e repo.
 *
 * Pronto quando:
 *   - R2 em sombra sobe para auto sozinho com 9 acertos nas 10 últimas
 *     propostas (8 em 10, ou 9 em 9, não sobe);
 *   - qualquer classe em auto com 2 desfechos ruins seguidos volta para sombra
 *     (ruim, bom não; bom depois de ruim zera), e a passada que rebaixou já age
 *     no modo novo;
 *   - cada mudança vai ao ledger e ao repos.json (o resto do arquivo fica), e
 *     não se repete com os mesmos fatos.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, repoDoCaso } from './resolvedor-repo.js'

const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
const T0 = Date.parse('2026-10-11T12:00:00Z')

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; acao: string; feito: string }[] }

describe('peça 6: promoção e rebaixamento', () => {
  let passada: Passada | null = null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  const OUTRO = { nome: 'outro', caminho: '/nao/existe/outro', resolvedor: 'diagnostico', extra: 'fica' }
  const caso = (id: string, modos: unknown) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional' })
    amb.repos([OUTRO, { nome: 'cmk', caminho: r.raiz, resolvedor: modos, painel: 'sim' }])
    return r
  }
  const lp = () => join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
  const semear = (es: Record<string, unknown>[]) => {
    mkdirSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true })
    writeFileSync(lp(), es.map((e) => JSON.stringify(e)).join('\n') + '\n')
  }
  const ledger = () => (existsSync(lp()) ? readFileSync(lp(), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as Record<string, unknown>) : [])
  const repos = () => JSON.parse(readFileSync(amb.env.ORQ_REPOS!, 'utf8')) as { repos: Record<string, unknown>[] }
  const comps = (acertos: number, total: number) =>
    Array.from({ length: total }, (_, i) => ({ ts: `2026-10-0${1 + (i % 9)}T00:00:${String(i).padStart(2, '0')}Z`, tipo: 'comparacao', repo: 'cmk', id: `9${i}`, classe: 'R2', resultado: i < total - acertos ? 'erro' : 'acerto' }))
  const desf = (classe: string, ...ds: string[]) => ds.map((d, i) => ({ ts: `2026-10-02T00:00:0${i}Z`, tipo: 'desfecho', repo: 'cmk', id: `8${i}`, classe, regra: 'D1', desfecho: d, bom: d === 'done' }))

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    try {
      passada = ((await import(pathToFileURL(join(RES, 'passada.ts')).href)) as { passada: Passada }).passada
    } catch {
      passada = null
    }
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
  })

  it('R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica', () => {
    expect(passada).toBeTypeOf('function')
    caso('929', { padrao: 'diagnostico', R1: 'auto', R2: 'sombra' })
    semear(comps(9, 10))
    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
    const d = repos()
    expect(d.repos[1]).toEqual(expect.objectContaining({ nome: 'cmk', painel: 'sim', resolvedor: { padrao: 'diagnostico', R1: 'auto', R2: 'auto' } }))
    expect(d.repos[0]).toEqual(OUTRO)
    expect(ledger().filter((e) => e.tipo === 'promocao')).toEqual([expect.objectContaining({ repo: 'cmk', classe: 'R2', de: 'sombra', para: 'auto' })])
    passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 })
    expect(ledger().filter((e) => e.tipo === 'promocao')).toHaveLength(1)
  })

  for (const [acertos, total] of [
    [8, 10],
    [9, 9],
  ] as const) {
    it(`R2 com ${acertos} acertos em ${total} não sobe`, () => {
      caso('929', { R2: 'sombra' })
      semear(comps(acertos, total))
      passada!({ repo: 'cmk', semModelo: true, agora: T0 })
      expect((repos().repos[1]!.resolvedor as Record<string, string>).R2).toBe('sombra')
      expect(ledger().filter((e) => e.tipo === 'promocao')).toEqual([])
    })
  }

  it('R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe', () => {
    const r = caso('940', { R5: 'auto' })
    semear(desf('R5', 'done', 'bloqueou_de_novo', 'humano_mexeu'))
    const p = passada!({ repo: 'cmk', semModelo: true, agora: T0 })
    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('sombra')
    expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toEqual([expect.objectContaining({ repo: 'cmk', classe: 'R5', de: 'auto', para: 'sombra' })])
    expect(p.itens).toEqual([expect.objectContaining({ id: '940', acao: 'sombra', feito: 'proposto' })])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })

  for (const seq of [
    ['bloqueou_de_novo', 'done'],
    ['humano_mexeu', 'done', 'bloqueou_de_novo'],
    ['desfeito'],
  ]) {
    it(`R5 em auto com ${seq.join(', ')} não volta`, () => {
      caso('940', { R5: 'auto' })
      semear(desf('R5', ...seq))
      passada!({ repo: 'cmk', semModelo: true, agora: T0 })
      expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('auto')
      expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toEqual([])
    })
  }

  it('os mesmos fatos não rebaixam de novo depois que o humano devolve para auto', () => {
    caso('932', { R5: 'auto' })
    semear(desf('R5', 'bloqueou_de_novo', 'desfeito'))
    passada!({ repo: 'cmk', semModelo: true, agora: T0 })
    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('sombra')
    // o humano põe de volta em auto no repos.json
    const d = repos()
    ;(d.repos[1]!.resolvedor as Record<string, string>).R5 = 'auto'
    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify(d, null, 2))
    passada!({ repo: 'cmk', semModelo: true, agora: T0 + 1000 })
    expect((repos().repos[1]!.resolvedor as Record<string, string>).R5).toBe('auto')
    expect(ledger().filter((e) => e.tipo === 'rebaixamento')).toHaveLength(1)
  })
})
