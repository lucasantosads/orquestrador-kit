/**
 * Etapa 7f-b7, peça 1 · R1 com mais de um vermelho fora da allowlist, tudo ou
 * nada; uma ação por ticket por assinatura, no máximo 2 por ticket.
 *
 * Os casos são os bloqueios reais do Comarka (`fixtures/resolvedor-7f7`, o
 * `montar.py` só lê o repo) em que o resolvedor recusou por "mais de um
 * vermelho" e o humano pôs na allowlist exatamente os vermelhos:
 *   - 1054, 1055b, 1058: os dois testes saem firmes cada um por si (D6: o
 *     mesmo vermelho fora em 2 tentativas, acoplado ao diff). O resolvedor age
 *     num commit só: os dois na allowlist (o mesmo conjunto do commit humano),
 *     os dois no critério que lista os arquivos permitidos, uma guarda de
 *     contagem POR teste, o ticket reabre;
 *   - 924a: `test/conta-entregas-vazio-unico.test.ts` ficou vermelho só na
 *     tentativa 1 (não cumpre a D6 sozinho), então nenhuma ação, nem para o
 *     outro, que cumpre: o ticket fica byte a byte igual.
 *
 * E a trava (decisão do chat do programa, 7f-b7): o mesmo bloqueio (a mesma
 * assinatura, ou a mesma série: `bloqueado_em`) com ação no ledger vai para
 * humano, mesmo com o ticket reescrito (o mtime muda a assinatura); outra
 * série pode ter a 2ª ação; na 3ª, só aviso.
 */
import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { ambiente, comEnv, git, jsonDo, repoDoCaso, type RepoCaso } from './resolvedor-repo.js'
import { passada } from '../scripts/orquestrador/resolvedor/passada.js'

const AGORA = Date.parse('2026-10-18T12:00:00Z')
const MODOS = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' }

type Crit = { descricao: string; cmd: string; espera: string; tipo?: string }
const allowlist = (md: string) => jsonDo(md).pathspec_allowlist as string[]
const criterios = (md: string) => jsonDo(md).criterios_aceite as Crit[]
const guardaDe = (md: string, teste: string) => criterios(md).filter((c) => c.tipo === 'guarda' && c.cmd.startsWith(`f=${teste};`))

describe('7f-b7 P1: R1 com mais de um vermelho, tudo ou nada', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  const ledgerPath = () => join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
  const ledger = () => (existsSync(ledgerPath()) ? readFileSync(ledgerPath(), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : [])
  let n = 0
  const caso = (id: string): RepoCaso => {
    const nome = `cmk-${id}-${++n}`
    const r = repoDoCaso(join(amb.base, nome), id, { nome })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: MODOS }])
    return r
  }
  const passa = (t = AGORA) => passada({ repo: 'cmk', semModelo: true, agora: t }).itens

  beforeAll(() => {
    amb = ambiente()
    tira = comEnv(amb.env)
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!, amb.env.ORQ_DIAG_DIR!])
    mkdirSync(amb.env.ORQ_DIAG_DIR!, { recursive: true })
  })

  for (const [id, testes] of [
    ['1054', ['test/resolver-cliente-rota-diagnostico.test.ts', 'test/resolver-cliente-rota-resumo.test.ts']],
    ['1055b', ['test/acoes-recomendadas-chave.test.ts', 'test/relatorio-sem-cliente-id.test.ts']],
    ['1058', ['test/negocio-temperatura.test.ts', 'test/quem-cuida.test.ts']],
  ] as const) {
    it(`${id}: os dois vermelhos firmes, um commit só, a allowlist do humano`, () => {
      const r = caso(id)
      const antesHead = git(r.raiz, 'rev-parse', 'HEAD').trim()
      const itens = passa()
      expect(itens).toEqual([expect.objectContaining({ id, classe: 'R1', regra: 'D6', acao: 'r1_allowlist', feito: 'aplicado' })])
      const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
      // o mesmo conjunto de arquivos novos na allowlist que o commit humano
      const novos = (md: string) => allowlist(md).filter((a) => !allowlist(r.antes).includes(a)).sort()
      expect(novos(agora)).toEqual([...testes].sort())
      expect(novos(agora)).toEqual(novos(r.depois))
      // os dois no critério que lista os arquivos permitidos (o SO_ALLOWLIST)
      const lista = criterios(agora).find((c) => c.espera === 'SO_ALLOWLIST')!
      for (const t of testes) expect(lista.cmd).toContain(`'${t}'`)
      // uma guarda de contagem por teste
      for (const t of testes) expect(guardaDe(agora, t), `guarda de ${t}`).toHaveLength(1)
      expect(criterios(agora)).toHaveLength(criterios(r.antes).length + 2)
      expect(jsonDo(agora).status).toBe('pendente')
      // um commit só, só do ticket
      expect(git(r.raiz, 'rev-list', '--count', `${antesHead}..HEAD`).trim()).toBe('1')
      expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
      const acoes = ledger().filter((e) => e.tipo === 'acao')
      expect(acoes).toHaveLength(1)
      expect(acoes[0]!.testes).toEqual([...testes].sort())
    })
  }

  it('924a: um dos vermelhos não cumpre D6 nem D6b sozinho, nenhuma ação (nem para o outro)', () => {
    const r = caso('924a')
    const antesHead = git(r.raiz, 'rev-parse', 'HEAD').trim()
    const itens = passa()
    expect(itens).toEqual([
      expect.objectContaining({ id: '924a', feito: 'nao_consegui', motivo: expect.stringMatching(/tudo ou nada.*test\/conta-entregas-vazio-unico\.test\.ts/) }),
    ])
    expect(itens[0]!.motivo).not.toContain('test/visao-aceite-mockup.test.tsx não')
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-parse', 'HEAD').trim()).toBe(antesHead)
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
  })

  describe('uma ação por ticket por assinatura, teto de 2', () => {
    // ações de séries anteriores do mesmo ticket, cada uma com desfecho done
    // (sem desfecho, a apuração as leria como "bloqueou de novo" e o R1 voltaria a sombra)
    const semear = (id: string, assinaturas: string[]) => {
      mkdirSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true })
      const base = { repo: 'cmk', id, classe: 'R1', regra: 'D6', acao: 'r1_allowlist' }
      writeFileSync(
        ledgerPath(),
        assinaturas
          .flatMap((a, i) => [
            { ...base, ts: `2026-10-0${i + 1}T00:00:00Z`, tipo: 'acao', assinatura: a, commit: `c${i}`, bloqueado_em: `2026-10-0${i + 1}T00:00:00Z` },
            { ...base, ts: `2026-10-0${i + 1}T01:00:00Z`, tipo: 'desfecho', assinatura: a, commit: `c${i}`, desfecho: 'done', bom: true },
          ])
          .map((e) => JSON.stringify(e) + '\n')
          .join(''),
      )
    }

    it('o mesmo bloqueio de novo depois de uma ação vai para humano, mesmo com o ticket reescrito', () => {
      const r = caso('1058')
      expect(passa()).toEqual([expect.objectContaining({ feito: 'aplicado' })])
      // o ticket volta ao antes (como no orq desfazer): o mtime muda, e com ele a assinatura
      writeFileSync(join(r.raiz, r.ticket), r.antes)
      expect(passa(AGORA + 1000)).toEqual([expect.objectContaining({ feito: 'nao_consegui', motivo: expect.stringMatching(/segunda vez bloqueado no mesmo bloqueio/) })])
      expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    })

    it('outra série: a segunda ação no ticket acontece', () => {
      const r = caso('1054')
      semear('1054', ['assinatura-de-outra-serie'])
      expect(passa()).toEqual([expect.objectContaining({ id: '1054', feito: 'aplicado' })])
      expect(ledger().filter((e) => e.tipo === 'acao')).toHaveLength(2)
      expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).not.toBe(r.antes)
    })

    it('com 2 ações no ticket, a terceira vira só aviso', () => {
      const r = caso('1055b')
      semear('1055b', ['serie-a', 'serie-b'])
      const itens = passa()
      expect(itens).toEqual([expect.objectContaining({ id: '1055b', feito: 'aviso', motivo: expect.stringMatching(/teto de 2 ações/) })])
      expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
      expect(ledger().filter((e) => e.tipo === 'aviso')).toEqual([expect.objectContaining({ id: '1055b', motivo: expect.stringMatching(/teto de 2 ações/) })])
    })
  })
})
