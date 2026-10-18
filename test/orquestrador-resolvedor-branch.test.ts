/**
 * Etapa 8b, peça 2 · o resolvedor só commita na branch esperada do repo.
 *
 * O `escreverEComitar` (repo.ts) conferia o arquivo, o git livre, a tentativa
 * nova e o pai do commit, mas nunca a branch: com o checkout principal do repo
 * cliente em outra branch, a correção do R1 caía fora da main, e o loop (que lê
 * o working tree) rodava com uma spec que a main não tem.
 *
 * A branch esperada: `branch` do item no repos.json; senão `branch_protegida`
 * do config do repo; senão `main`. Fora dela: nada escrito, `branch_inesperada`
 * no ledger e um aviso por repo e branch.
 *
 * O caso é o 840 real (R1 D6, gabarito 7787af3) em auto, como na 7f-b5.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const AGORA = Date.parse('2026-10-11T12:00:00Z')

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }

describe('peça 2 (8b): o resolvedor confere a branch antes do commit', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let n = 0
  let osa: string
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  const avisos = () => (existsSync(join(osa, 'chamadas.log')) ? readFileSync(join(osa, 'chamadas.log'), 'utf8').split('\n').filter((l) => l.includes('branch')) : [])
  const caso = (item: Record<string, unknown> = {}) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), '840', { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: { R1: 'auto', R5: 'auto', R2: 'sombra' }, ...item }])
    return r
  }
  const roda = () => passada({ repo: 'cmk', semModelo: true, agora: AGORA })

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    // osascript falso: registra a chamada, nunca notifica de verdade
    osa = join(amb.base, 'bin')
    mkdirSync(osa, { recursive: true })
    writeFileSync(join(osa, 'osascript'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${osa}/chamadas.log"\nexit 0\n`)
    chmodSync(join(osa, 'osascript'), 0o755)
    process.env.PATH = `${osa}:${process.env.PATH}`
    passada = ((await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    process.env.ORQ_RESOLVEDOR_DIR = join(amb.base, `res-${n + 1}`)
    process.env.ORQ_DIAG_DIR = join(amb.base, `diag-${n + 1}`)
    mkdirSync(process.env.ORQ_DIAG_DIR, { recursive: true })
    amb.env.ORQ_RESOLVEDOR_DIR = process.env.ORQ_RESOLVEDOR_DIR
    amb.env.ORQ_DIAG_DIR = process.env.ORQ_DIAG_DIR
  })

  it('checkout numa branch qualquer: não commita, branch_inesperada no ledger, um aviso', () => {
    const r = caso()
    git(r.raiz, 'checkout', '-q', '-b', 'qualquer')
    const head = git(r.raiz, 'rev-parse', 'HEAD').trim()
    const p = roda()
    expect(p.itens).toEqual([expect.objectContaining({ id: '840', feito: 'nao_consegui', motivo: expect.stringMatching(/^branch_inesperada: checkout em 'qualquer', esperada 'main'/) })])
    expect(git(r.raiz, 'rev-parse', 'HEAD').trim()).toBe(head)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
    expect(ledger().filter((e) => e.tipo === 'branch_inesperada')).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', branch: 'qualquer', esperada: 'main' })])
    expect(avisos()).toHaveLength(1)
    // a passada seguinte, na mesma branch: registra de novo, não avisa de novo
    roda()
    expect(ledger().filter((e) => e.tipo === 'branch_inesperada')).toHaveLength(2)
    expect(avisos()).toHaveLength(1)
  })

  it('na main (padrão), o R1 age como antes', () => {
    const r = caso()
    const p = roda()
    expect(p.itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
    expect(git(r.raiz, 'log', '-1', '--format=%s').trim()).toMatch(/^orq-resolvedor: 840 R1 D6/)
    expect(git(r.raiz, 'rev-parse', '--abbrev-ref', 'HEAD').trim()).toBe('main')
  })

  it('a branch do item do repos.json vale antes do padrão', () => {
    const r = caso({ branch: 'principal' })
    const p = roda()
    expect(p.itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/^branch_inesperada: checkout em 'main', esperada 'principal'/) })])
    git(r.raiz, 'checkout', '-q', '-b', 'principal')
    process.env.ORQ_RESOLVEDOR_DIR = join(amb.base, `res-${n}-b`)
    expect(roda().itens).toEqual([expect.objectContaining({ feito: 'aplicado' })])
  })

  it('sem branch no item, vale a branch_protegida do config do repo', () => {
    const r = caso()
    const cfg = join(r.raiz, 'docs/fila/000-config.json')
    writeFileSync(cfg, JSON.stringify({ ...JSON.parse(readFileSync(cfg, 'utf8')), branch_protegida: 'trunk' }, null, 2))
    git(r.raiz, 'commit', '-q', '-am', 'config: branch_protegida trunk')
    expect(roda().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/esperada 'trunk'/) })])
  })
})
