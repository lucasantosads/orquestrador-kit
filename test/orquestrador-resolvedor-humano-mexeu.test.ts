/**
 * Etapa 8b, peça 4 · o resolvedor não age por cima de quem mexeu no ticket
 * depois do bloqueio.
 *
 * O caso é o 840 real (R1 D6 em auto; bloqueio.quando = fim da série,
 * 2026-10-10T22:50:37Z, caso.json). Por cima dele:
 *   - um commit da Vigia (trailer `Orq-Vigia: 840`, mensagem `vigia: 840 …`,
 *     o formato do runbook ~/orq-sessoes/comarka/VIGIA.md v2) que conserta um
 *     critério, simulado depois do bloqueio;
 *   - um commit humano depois do bloqueio;
 *   - uma edição sem commit no working tree.
 * Nos três, o código antigo aplicava o R1, e no terceiro o `commit --only`
 * levava junto a edição de outro.
 *
 * Controles: a edição humana ANTES do bloqueio (o 1373 real de 18/10: o
 * 6f94e84 das 10:19 foi antes do bloqueio, e o R1 das 11:25 estava certo) não
 * impede a ação, e nem o commit do loop depois do bloqueio.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const AGORA = Date.parse('2026-10-11T12:00:00Z')

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }

describe('peça 4 (8b): humano mexeu, antes de agir', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let n = 0
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  const caso = () => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), '840', { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: { R1: 'auto', R5: 'auto', R2: 'sombra' } }])
    return r
  }
  /** troca um trecho do ticket e commita com a data e a mensagem dadas */
  const commitNoTicket = (r: ReturnType<typeof caso>, de: string, para: string, data: string, ...msg: string[]) => {
    const p = join(r.raiz, r.ticket)
    const txt = readFileSync(p, 'utf8')
    expect(txt).toContain(de)
    writeFileSync(p, txt.replace(de, para))
    process.env.GIT_COMMITTER_DATE = process.env.GIT_AUTHOR_DATE = data
    try {
      git(r.raiz, 'commit', '-q', ...msg.flatMap((m) => ['-m', m]), '--', r.ticket)
    } finally {
      delete process.env.GIT_COMMITTER_DATE
      delete process.env.GIT_AUTHOR_DATE
    }
    return git(r.raiz, 'rev-parse', 'HEAD').trim()
  }
  const roda = () => passada({ repo: 'cmk', semModelo: true, agora: AGORA })
  const naoAgiu = (r: ReturnType<typeof caso>, head: string) => {
    expect(git(r.raiz, 'rev-parse', 'HEAD').trim()).toBe(head)
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
  }

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
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

  it('commit da Vigia (Orq-Vigia) depois do bloqueio: não age, humano_mexeu com quem=vigia', () => {
    const r = caso()
    const sha = commitNoTicket(r, '"objetivo": "', '"objetivo": "VIGIA: ', '2026-10-11T09:00:00Z', 'vigia: 840 critério conferido à mão', 'Orq-Vigia: 840')
    const p = roda()
    expect(p.itens).toEqual([expect.objectContaining({ id: '840', feito: 'nao_consegui', motivo: expect.stringMatching(/^humano_mexeu: vigia/) })])
    naoAgiu(r, sha)
    expect(ledger().filter((e) => e.tipo === 'humano_mexeu')).toEqual([expect.objectContaining({ repo: 'cmk', id: '840', quem: 'vigia', commit: sha, bloqueado_em: '2026-10-10T22:50:37Z' })])
  })

  it('commit humano sem trailer depois do bloqueio: não age, quem=humano', () => {
    const r = caso()
    const sha = commitNoTicket(r, '"objetivo": "', '"objetivo": "HUMANO: ', '2026-10-11T09:00:00Z', 'fila: 840 ajuste de spec')
    expect(roda().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/^humano_mexeu: humano/) })])
    naoAgiu(r, sha)
  })

  it('edição sem commit no working tree: não age e não leva a edição de ninguém', () => {
    const r = caso()
    const head = git(r.raiz, 'rev-parse', 'HEAD').trim()
    const p = join(r.raiz, r.ticket)
    writeFileSync(p, readFileSync(p, 'utf8').replace('"objetivo": "', '"objetivo": "EM EDIÇÃO: '))
    expect(roda().itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/^humano_mexeu: nao_commitado/) })])
    naoAgiu(r, head)
    expect(readFileSync(p, 'utf8')).toContain('EM EDIÇÃO: ')
  })

  it('controle: edição humana ANTES do bloqueio não impede a ação', () => {
    const r = caso()
    commitNoTicket(r, '"objetivo": "', '"objetivo": "ANTES: ', '2026-10-10T20:00:00Z', 'fila: reabre 840 com spec corrigida')
    expect(roda().itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
  })

  it('controle: commit do loop depois do bloqueio (Orq-Loop) não conta', () => {
    const r = caso()
    commitNoTicket(r, '"objetivo": "', '"objetivo": "LOOP: ', '2026-10-11T09:00:00Z', 'fila: status automatico do loop 2026-10-11 06:00 (840)', 'Orq-Loop: 840')
    expect(roda().itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
  })
})
