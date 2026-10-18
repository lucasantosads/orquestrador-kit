/**
 * Etapa 7f-b7, peça 5 · o R1 com vários testes isolado do R1 de um teste.
 *
 * (a) A ação com 2 ou mais testes é a subclasse `r1_multi`, com contador de
 *     desfecho próprio: 2 desfechos ruins seguidos dela devolvem só o
 *     `r1_multi` a sombra (`resolvedor.r1_multi` no repos.json; ausente, o
 *     modo do R1); o R1 de um teste segue em auto.
 * (b) Ticket reaberto pelo resolvedor que bloqueia de novo por limite de
 *     linhas (`NO_TETO`/`ESTOUROU_<n>` ou `diff grande`) é o desfecho
 *     `limite_apos_r1`: não conta como ruim para nenhuma subclasse, notifica
 *     uma vez e grava `proposta_limite` no ledger com o limite atual e o
 *     tamanho que reprovou. O limite do ticket nunca muda.
 *
 * Casos: 1054, 1055b, 1006 e 1058 reais, num repo só (o rebaixamento conta os
 * desfechos do repo); a nota do bloqueio seguinte em `fixtures/resolvedor-7f7/p5`.
 */
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, FX_7F7, jsonDo, repoDeCasos, type RepoCaso } from './resolvedor-repo.js'
import { passada } from '../scripts/orquestrador/resolvedor/passada.js'

const T0 = Date.parse('2026-10-18T12:00:00Z')
const H = 3600_000
const MODOS = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' }
const NOTAS = JSON.parse(readFileSync(join(FX_7F7, 'p5', 'notas.json'), 'utf8')) as { limite: Record<string, string>; ruim: Record<string, string> }

/** O que o loop grava ao bloquear: só status e nota. */
const bloquear = (md: string, nota: string) =>
  md.replace(/"status": "[^"]*"/, '"status": "bloqueado"').replace(/"notas_status": "(?:[^"\\]|\\.)*"/, `"notas_status": ${JSON.stringify(nota)}`)
const pender = (md: string) => md.replace(/"status": "[^"]*"/, '"status": "pendente"')

describe('7f-b7 P5: r1_multi isolado e limite depois do R1', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  const osaLog = () => join(amb.base, 'osascript.log')
  const notificacoes = (): string[][] => {
    try {
      return readFileSync(osaLog(), 'utf8').split('\n---\n').filter(Boolean).map((b) => b.split('\n'))
    } catch {
      return []
    }
  }
  const ledger = (tipo?: string) => {
    try {
      return readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>).filter((e) => !tipo || e.tipo === tipo)
    } catch {
      return []
    }
  }
  const modos = () => (JSON.parse(readFileSync(amb.env.ORQ_REPOS!, 'utf8')) as { repos: { resolvedor: Record<string, string> }[] }).repos[0]!.resolvedor
  const montar = (ids: string[]) => {
    const r = repoDeCasos(join(amb.base, `r${++n}`), ids, 'comarka-operacional')
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: MODOS }])
    return r.casos
  }
  const passa = (t: number) => passada({ repo: 'cmk', semModelo: true, agora: t }).itens
  const ler = (c: RepoCaso) => readFileSync(join(c.raiz, c.ticket), 'utf8')
  const gravar = (c: RepoCaso, md: string) => writeFileSync(join(c.raiz, c.ticket), md)

  beforeAll(() => {
    amb = ambiente()
    const bin = join(amb.base, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'osascript'), `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done >> '${osaLog()}'\nprintf -- '---\\n' >> '${osaLog()}'\n`)
    chmodSync(join(bin, 'osascript'), 0o755)
    tira = comEnv({ ...amb.env, PATH: `${bin}:${process.env.PATH}` })
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    rmSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true, force: true })
    rmSync(amb.env.ORQ_DIAG_DIR!, { recursive: true, force: true })
    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
    rmSync(osaLog(), { force: true })
  })

  it('(b) duas reprovas por limite depois de r1_multi: nenhum desfecho ruim, R1 segue em auto, proposta gravada e uma notificação por ação', () => {
    const c = montar(['1054', '1055b'])
    const p1 = passa(T0)
    expect(p1.map((i) => [i.id, i.feito])).toEqual([
      ['1054', 'aplicado'],
      ['1055b', 'aplicado'],
    ])
    // o loop roda os dois reabertos e os bloqueia por limite de linhas
    const depoisDaAcao: Record<string, string> = {}
    for (const id of ['1054', '1055b']) {
      depoisDaAcao[id] = ler(c[id]!)
      gravar(c[id]!, bloquear(depoisDaAcao[id]!, NOTAS.limite[id]!))
    }
    passa(T0 + H)
    passa(T0 + 2 * H)

    expect(ledger('rebaixamento')).toEqual([])
    expect(modos()).toMatchObject({ R1: 'auto' })
    expect(modos().r1_multi ?? 'auto').toBe('auto')
    const ds = ledger('desfecho')
    expect(ds).toHaveLength(2)
    expect(ds).toEqual([
      expect.objectContaining({ id: '1054', desfecho: 'limite_apos_r1', bom: null, subclasse: 'r1_multi' }),
      expect.objectContaining({ id: '1055b', desfecho: 'limite_apos_r1', bom: null, subclasse: 'r1_multi' }),
    ])
    expect(ledger('proposta_limite')).toEqual([
      expect.objectContaining({ id: '1054', criterio: 'criterio[3]', limite_atual: 720, diff_reprovou: 735 }),
      expect.objectContaining({ id: '1055b', criterio: 'criterio[3]', limite_atual: 640, diff_reprovou: 668 }),
    ])
    const ns = notificacoes()
    expect(ns).toHaveLength(2)
    // título (o ticket) e corpo (o limite e o tamanho) vão como argumentos do osascript
    expect(ns[0]!.join('\n')).toMatch(/1054[\s\S]*720[\s\S]*735/)
    // o limite do ticket não mudou: o resolvedor nunca altera limite de linhas
    for (const id of ['1054', '1055b']) {
      const teto = (jsonDo(ler(c[id]!)).criterios_aceite as { espera: string; cmd: string }[]).find((x) => x.espera === 'NO_TETO')!
      expect(teto.cmd).toBe((jsonDo(depoisDaAcao[id]!).criterios_aceite as { espera: string; cmd: string }[]).find((x) => x.espera === 'NO_TETO')!.cmd)
    }
  })

  it('(a) 2 desfechos ruins de r1_multi devolvem só o r1_multi a sombra; o R1 de um teste segue aplicando', () => {
    const c = montar(['1054', '1055b', '1006', '1058'])
    // 1006 e 1058 ainda não bloquearam
    gravar(c['1006']!, pender(c['1006']!.antes))
    gravar(c['1058']!, pender(c['1058']!.antes))
    expect(passa(T0).map((i) => [i.id, i.feito])).toEqual([
      ['1054', 'aplicado'],
      ['1055b', 'aplicado'],
    ])
    for (const id of ['1054', '1055b']) gravar(c[id]!, bloquear(ler(c[id]!), NOTAS.ruim[id]!))
    passa(T0 + H)
    expect(ledger('rebaixamento')).toEqual([expect.objectContaining({ classe: 'r1_multi', de: 'auto', para: 'sombra' })])
    expect(modos()).toMatchObject({ R1: 'auto', r1_multi: 'sombra' })
    // agora bloqueiam o 1006 (um teste) e o 1058 (dois)
    gravar(c['1006']!, c['1006']!.antes)
    gravar(c['1058']!, c['1058']!.antes)
    const p3 = passa(T0 + 2 * H)
    expect(p3.find((i) => i.id === '1006')).toMatchObject({ feito: 'aplicado' })
    expect(p3.find((i) => i.id === '1058')).toMatchObject({ feito: 'proposto' })
    expect(ler(c['1058']!)).toBe(c['1058']!.antes)
  })
})
