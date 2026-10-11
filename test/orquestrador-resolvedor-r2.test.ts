/**
 * Etapa 7f-b2, peça 4 · R2 em sombra: a proposta em
 * `~/.orq/resolvedor/<repo>/<id>/proposta.md` com o cmd novo, a prova de que
 * ele não aborta sob `set -u` e reprova o estado em que o trabalho não foi
 * feito. Nunca aplica (nem no modo auto).
 *
 * O gabarito é o 929 (7787af3): o conserto do resolvedor tem de ser, letra por
 * letra, o cmd que o humano escreveu.
 */
import { statSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'

const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
const AGORA = Date.parse('2026-10-11T12:00:00Z')

interface Item {
  id: string
  acao: string
  feito: string
  motivo: string
  proposta?: string
}
interface Mods {
  passada: (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: Item[] }
  consertarUnbound?: (cmd: string) => string | null
}
async function carregar(): Promise<Mods | null> {
  const imp = async (f: string) => {
    try {
      return (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
    } catch {
      return {}
    }
  }
  const m = { ...(await imp('passada.ts')), ...(await imp('r2.ts')) }
  return typeof m.passada === 'function' ? (m as unknown as Mods) : null
}

const crit12 = (md: string) => (jsonDo(md).criterios_aceite as { cmd: string; espera: string }[])[12]!

describe('peça 4: R2 em sombra', () => {
  let m: Mods | null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  const caso = (modos: unknown) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), '929', { nome: 'comarka-operacional' })
    amb.repos([{ nome: `cmk${n}`, caminho: r.raiz, resolvedor: modos }])
    return { r, nome: `cmk${n}` }
  }

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    m = await carregar()
  })
  afterAll(() => tira?.())

  it('o conserto do unbound variable é o cmd do humano, letra por letra', () => {
    expect(m?.consertarUnbound, 'resolvedor/r2.ts com consertarUnbound').toBeTypeOf('function')
    const r = repoDoCaso(join(amb.base, 'puro'), '929')
    expect(m!.consertarUnbound!(crit12(r.antes).cmd)).toBe(crit12(r.depois).cmd)
    expect(m!.consertarUnbound!(crit12(r.depois).cmd)).toBeNull()
    expect(m!.consertarUnbound!('n=$(git diff --name-only | wc -l); echo $n')).toBeNull()
  })

  for (const modos of [{ R2: 'sombra' }, { padrao: 'auto' }]) {
    it(`proposta com a prova e nada no repo (modo ${JSON.stringify(modos)})`, () => {
      const { r, nome } = caso(modos)
      const p = m!.passada({ repo: nome, semModelo: true, agora: AGORA })
      expect(p.itens).toEqual([expect.objectContaining({ id: '929', acao: 'r2_proposta', feito: 'proposto' })])
      expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
      expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
      expect(git(r.raiz, 'status', '--porcelain')).toBe('')
      const dir = join(amb.env.ORQ_RESOLVEDOR_DIR!, nome, '929')
      expect(p.itens[0]!.proposta).toBe(join(dir, 'proposta.md'))
      const md = readFileSync(join(dir, 'proposta.md'), 'utf8')
      expect(md).toContain(crit12(r.depois).cmd)
      // a prova: no estado não feito o novo roda e reprova; o antigo aborta como no bloqueio
      expect(md).toMatch(/\| nao_feito \| novo \| roda \| reprova \| `ST_x_x_x` \|/)
      expect(md).toMatch(/\| nao_feito \| antigo \| aborta \| reprova \| `[^`]*unbound variable[^`]*` \|/)
      expect(md).toMatch(/\| head \| novo \|/)
      const pj = JSON.parse(readFileSync(join(dir, 'proposta.json'), 'utf8')) as { cmd_novo: string; indice: number; criterio: string }
      expect(pj).toEqual(expect.objectContaining({ cmd_novo: crit12(r.depois).cmd, indice: 12, criterio: 'criterio[12]' }))
    })
  }

  it('a mesma assinatura não refaz a proposta', () => {
    const { nome } = caso({ R2: 'sombra' })
    const p1 = m!.passada({ repo: nome, semModelo: true, agora: AGORA })
    expect(p1.itens).toEqual([expect.objectContaining({ feito: 'proposto', proposta: expect.any(String) })])
    const t1 = statSync(p1.itens[0]!.proposta!).mtimeMs
    const p2 = m!.passada({ repo: nome, semModelo: true, agora: AGORA + 60_000 })
    expect(p2.itens).toEqual([expect.objectContaining({ feito: 'proposto', motivo: expect.stringMatching(/já feita/) })])
    expect(statSync(p2.itens[0]!.proposta!).mtimeMs).toBe(t1)
  })

  it('não propõe o que aprovaria o estado não feito, nem cmd que roda o repo', () => {
    const a = caso({ R2: 'sombra' })
    const t = join(a.r.raiz, a.r.ticket)
    writeFileSync(t, a.r.antes.replace('"espera": "PERIODO_NA_ABA"', '"espera": "ST_"'))
    expect(m!.passada({ repo: a.nome, semModelo: true, agora: AGORA }).itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/APROVA o estado/) })])
    const b = caso({ R2: 'sombra' })
    const tb = join(b.r.raiz, b.r.ticket)
    writeFileSync(tb, b.r.antes.replace('"cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=', '"cmd": "git diff --quiet; test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s='))
    expect(m!.passada({ repo: b.nome, semModelo: true, agora: AGORA }).itens).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/chama git/) })])
  })
})
