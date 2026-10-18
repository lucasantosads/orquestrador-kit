/**
 * Etapa 7f-b7, peça 2 · replay sem custo dos resgates humanos de allowlist do
 * Comarka depois de 11/10 (as 13 linhas `allowlist` de
 * ~/orq-sessoes/medicao-comarka/out/14d/intervencoes.csv), contra o motor.
 *
 * Cada ticket bloqueado antes do commit humano (`fixtures/resolvedor-7f7`)
 * passa por uma passada com R1 e R5 em auto, sem modelo; o que o resolvedor
 * fez é comparado com o commit humano:
 *   - ação idêntica: os arquivos que entraram na allowlist são os mesmos;
 *   - ação divergente: entrou outro arquivo, ou faltou um. Tem de ser zero;
 *   - sem ação: o motivo de cada um fica listado (e conferido aqui).
 * As linhas sem ticket bloqueado (release de ticket done; ticket da linha
 * embutida sem allowlist nova) estão em `linhas.json`, com o motivo.
 *
 * O que o humano fez além da allowlist (o teto do diff, a guarda em outra
 * forma) não entra na conta: vai para a saída do teste, para o relatório.
 */
import { mkdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv, FX_7F7, jsonDo, repoDoCaso } from './resolvedor-repo.js'
import { passada } from '../scripts/orquestrador/resolvedor/passada.js'

const AGORA = Date.parse('2026-10-18T12:00:00Z')
const MODOS = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' }

interface Linha {
  data: string
  commit: string
  id: string
  allowlist_mais: string[]
  caso: string | null
  motivo?: string
}
const LINHAS = JSON.parse(readFileSync(join(FX_7F7, 'linhas.json'), 'utf8')) as Linha[]

/** O que se espera de cada ticket com caso: ação idêntica, ou o motivo de não agir. */
const ESPERADO: Record<string, { acao: true } | { motivo: RegExp }> = {
  '1006': { acao: true }, // R1 D6b
  '1054': { acao: true }, // R1 D6, dois vermelhos
  '1055b': { acao: true },
  '1058': { acao: true },
  '924a': { motivo: /tudo ou nada: test\/conta-entregas-vazio-unico\.test\.ts não cumpre D6 nem D6b/ },
  '318c': { motivo: /modo diagnostico para sem classe/ },
  '966': { motivo: /R5\? é palpite/ },
  '854': { motivo: /R5\? é palpite/ },
  '855': { motivo: /R5\? é palpite/ },
  '830': { motivo: /forma do defeito fora do que esta etapa conserta/ },
  '1053': { motivo: /forma do defeito fora do que esta etapa conserta/ },
  '1053b': { motivo: /R1\|R2\? é palpite/ },
  '1059': { motivo: /R1\|R2\? é palpite/ },
  '1195': { motivo: /R1\? é palpite/ },
}

interface Resultado {
  linha: string
  id: string
  classe: string | null
  regra: string | null
  feito: string
  motivo: string
  humano: string[]
  resolvedor: string[]
  veredito: 'identica' | 'divergente' | 'sem_acao'
  humano_alem: string[]
}

const allowlist = (md: string) => (jsonDo(md).pathspec_allowlist as string[]) ?? []
const novos = (antes: string, depois: string) => allowlist(depois).filter((a) => !allowlist(antes).includes(a)).sort()

/** O que o humano mudou no json além da allowlist (campos, e critérios por `espera`). */
function alem(antes: string, depois: string): string[] {
  const a = jsonDo(antes)
  const d = jsonDo(depois)
  const out: string[] = []
  for (const k of new Set([...Object.keys(a), ...Object.keys(d)])) {
    if (['pathspec_allowlist', 'status', 'notas_status', 'criterios_aceite'].includes(k)) continue
    if (JSON.stringify(a[k]) !== JSON.stringify(d[k])) out.push(k)
  }
  type C = { espera?: string; cmd?: string; descricao?: string }
  const ca = (a.criterios_aceite as C[]) ?? []
  const cd = (d.criterios_aceite as C[]) ?? []
  const chave = (c: C) => c.espera ?? ''
  for (const c of cd) {
    const v = ca.find((x) => chave(x) === chave(c))
    if (!v) out.push(`criterio novo ${chave(c)}`)
    else if (v.cmd !== c.cmd && chave(c) !== 'SO_ALLOWLIST') out.push(`criterio ${chave(c)}`)
  }
  for (const c of ca) if (!cd.some((x) => chave(x) === chave(c))) out.push(`criterio removido ${chave(c)}`)
  if (antes.replace(/```json[\s\S]*?```/, '') !== depois.replace(/```json[\s\S]*?```/, '')) out.push('texto do ticket fora do json')
  return out
}

describe('7f-b7 P2: replay dos resgates de allowlist depois de 11/10', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  const res: Resultado[] = []

  beforeAll(() => {
    amb = ambiente()
    tira = comEnv(amb.env)
    for (const l of LINHAS.filter((x) => x.caso)) {
      spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
      mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
      const nome = `cmk-${l.id}`
      const r = repoDoCaso(join(amb.base, nome), l.id, { nome })
      amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: MODOS }])
      const itens = passada({ repo: 'cmk', semModelo: true, agora: AGORA }).itens
      const it = itens.find((i) => i.id === l.id)!
      const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
      const humano = novos(r.antes, r.depois)
      const resolvedor = it.feito === 'aplicado' ? novos(r.antes, agora) : []
      const veredito = it.feito !== 'aplicado' ? 'sem_acao' : JSON.stringify(resolvedor) === JSON.stringify(humano) ? 'identica' : 'divergente'
      res.push({ linha: `${l.data} ${l.commit.slice(0, 9)}`, id: l.id, classe: it.classe, regra: it.regra, feito: it.feito, motivo: it.motivo, humano, resolvedor, veredito, humano_alem: alem(r.antes, r.depois) })
    }
    console.log(JSON.stringify({ casos: res, sem_caso: LINHAS.filter((x) => !x.caso).map((x) => ({ linha: `${x.data} ${x.commit.slice(0, 9)}`, id: x.id, motivo: x.motivo })) }, null, 1))
  }, 300_000)
  afterAll(() => tira?.())

  it('as 13 linhas estão no replay: 14 tickets com caso, o resto com motivo', () => {
    expect(new Set(LINHAS.map((l) => `${l.data} ${l.commit}`)).size).toBe(13)
    expect(res.map((r) => r.id).sort()).toEqual(Object.keys(ESPERADO).sort())
    for (const l of LINHAS.filter((x) => !x.caso)) expect(l.motivo, l.id).toBeTruthy()
  })

  it('zero ação divergente', () => {
    expect(res.filter((r) => r.veredito === 'divergente')).toEqual([])
  })

  it('as ações são idênticas às do humano, nos tickets esperados', () => {
    expect(res.filter((r) => r.veredito === 'identica').map((r) => r.id).sort()).toEqual(
      Object.entries(ESPERADO)
        .filter(([, e]) => 'acao' in e)
        .map(([id]) => id)
        .sort(),
    )
  })

  it('cada caso sem ação tem o motivo esperado', () => {
    for (const r of res.filter((x) => x.veredito === 'sem_acao')) {
      const e = ESPERADO[r.id]!
      expect('motivo' in e, `${r.id} não agiu: ${r.motivo}`).toBe(true)
      if ('motivo' in e) expect(r.motivo, r.id).toMatch(e.motivo)
    }
  })
})
