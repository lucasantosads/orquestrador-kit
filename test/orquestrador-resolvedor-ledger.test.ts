/**
 * Etapa 7f-b2, peça 5 · o ledger de desfecho (`~/.orq/resolvedor/ledger.jsonl`).
 *
 * Pronto quando:
 *   - cada ação tem classe, regra, o que mudou, commit e o tempo até destravar;
 *   - nas passadas seguintes entra o desfecho: done (com o tempo), bloqueou de
 *     novo, humano mexeu; uma vez só por ação;
 *   - "não consegui" entra com o motivo, uma vez por assinatura e motivo;
 *   - a proposta de R2 é comparada com o conserto humano quando ele acontece:
 *     igual ou equivalente é acerto; outro cmd, ou destravar sem trocar o cmd,
 *     é erro; com o ticket ainda bloqueado e o cmd antigo, espera.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { ambiente, comEnv, git, jsonDo, repoDoCaso } from './resolvedor-repo.js'

const RES = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')
const T0 = Date.parse('2026-10-11T12:00:00Z')
const H = 3600 * 1000

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }

describe('peça 5: ledger de desfecho', () => {
  let passada: Passada | null = null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let n = 0
  const caso = (id: string, modos: unknown = { R1: 'auto', R5: 'auto', R2: 'sombra' }, o: { arvoreSuja?: boolean } = {}) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), id, { nome: 'comarka-operacional', ...o })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: modos }])
    return r
  }
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  const de = (tipo: string) => ledger().filter((e) => e.tipo === tipo)
  const passa = (agora: number) => passada!({ repo: 'cmk', semModelo: true, agora })
  /** o ticket como o loop deixaria: o json com status e nota trocados */
  const loop = (arq: string, status: string, nota: string) => {
    const md = readFileSync(arq, 'utf8')
    writeFileSync(arq, md.replace(/"status": "[^"]*"/, `"status": "${status}"`).replace(/"notas_status": "(?:[^"\\]|\\.)*"/, `"notas_status": ${JSON.stringify(nota)}`))
  }

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

  it('a ação: classe, regra, o que mudou, commit e tempo até destravar', () => {
    expect(passada).toBeTypeOf('function')
    const r = caso('840')
    passa(T0)
    const [a] = de('acao')
    expect(a).toEqual(
      expect.objectContaining({
        repo: 'cmk',
        id: '840',
        classe: 'R1',
        regra: 'D6',
        commit: git(r.raiz, 'rev-parse', 'HEAD').trim(),
        mudou: expect.stringMatching(/test\/nps-reacao-resposta\.test\.ts na allowlist/),
        // bloqueio em 2026-10-10T22:50:37Z, ação em T0
        tempo_ate_destravar_s: (T0 - Date.parse('2026-10-10T22:50:37Z')) / 1000,
      }),
    )
  })

  it('desfecho done, com o tempo, uma vez só', () => {
    const r = caso('840')
    passa(T0)
    passa(T0 + H)
    expect(de('desfecho')).toEqual([])
    loop(join(r.raiz, r.ticket), 'done', 'aprovado (tentativa 1): ok')
    passa(T0 + 2 * H)
    passa(T0 + 3 * H)
    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '840', classe: 'R1', desfecho: 'done', bom: true, tempo_ate_desfecho_s: 7200, commit: de('acao')[0]!.commit })])
  })

  it('desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo', () => {
    const r = caso('940')
    passa(T0)
    writeFileSync(join(r.raiz, r.ticket), r.antes)
    passa(T0 + H)
    passa(T0 + 2 * H)
    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '940', classe: 'R5', regra: 'D1', desfecho: 'bloqueou_de_novo', bom: false })])
    expect(de('nao_agiu')).toEqual([expect.objectContaining({ id: '940', motivo: expect.stringMatching(/segunda vez bloqueado/) })])
  })

  it('desfecho humano mexeu: o json fora dos campos do motor mudou', () => {
    const r = caso('932')
    passa(T0)
    const arq = join(r.raiz, r.ticket)
    writeFileSync(arq, readFileSync(arq, 'utf8').replace('"status": "pendente"', '"status": "pendente",\n  "nota_humana": "refatiado"'))
    passa(T0 + H)
    expect(de('desfecho')).toEqual([expect.objectContaining({ id: '932', desfecho: 'humano_mexeu', bom: false })])
  })

  it('o loop escrevendo status, nota e tentativas não é humano mexendo', () => {
    const r = caso('932')
    passa(T0)
    const arq = join(r.raiz, r.ticket)
    writeFileSync(arq, readFileSync(arq, 'utf8').replace('"status": "pendente"', '"tentativas": 1,\n  "status": "pendente"'))
    loop(arq, 'em_andamento', '')
    passa(T0 + H)
    expect(de('desfecho')).toEqual([])
  })

  it('"não consegui" com o motivo, uma linha por assinatura e motivo', () => {
    const r = caso('940', { R5: 'auto' }, { arvoreSuja: true })
    passa(T0)
    passa(T0 + H)
    passa(T0 + 2 * H)
    expect(de('nao_agiu')).toEqual([expect.objectContaining({ id: '940', classe: 'R5', regra: 'D1', motivo: expect.stringMatching(/árvore alvo ainda suja/), assinatura: expect.stringMatching(/^[0-9a-f]{64}$/) })])
    expect(jsonDo(readFileSync(join(r.raiz, r.ticket), 'utf8')).status).toBe('bloqueado')
  })

  describe('R2: a proposta contra o conserto humano', () => {
    const humano = (r: ReturnType<typeof caso>, cmd?: (c: string) => string) => {
      let md = r.depois
      if (cmd) {
        const velho = (jsonDo(r.depois).criterios_aceite as { cmd: string }[])[12]!.cmd
        md = md.replace(JSON.stringify(velho), JSON.stringify(cmd(velho)))
      }
      writeFileSync(join(r.raiz, r.ticket), md)
    }

    it('espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto', () => {
      const r = caso('929')
      passa(T0)
      expect(de('proposta')).toEqual([expect.objectContaining({ id: '929', classe: 'R2?', acao: 'r2_proposta' })])
      passa(T0 + H)
      expect(de('comparacao')).toEqual([])
      humano(r)
      passa(T0 + 2 * H)
      passa(T0 + 3 * H)
      expect(de('comparacao')).toEqual([expect.objectContaining({ id: '929', classe: 'R2', resultado: 'acerto', como: 'igual', tempo_ate_conserto_s: 7200 })])
    })

    it('outro cmd com a mesma saída nos estados da prova é acerto (equivalente)', () => {
      const r = caso('929')
      passa(T0)
      humano(r, (c) => c.replaceAll('|| true', '|| :'))
      passa(T0 + H)
      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'acerto', como: 'equivalente' })])
    })

    it('cmd com saída diferente é erro; destravar sem trocar o cmd é erro', () => {
      const r = caso('929')
      passa(T0)
      humano(r, () => 'echo PERIODO_NA_ABA')
      passa(T0 + H)
      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'erro', como: 'diferente', cmd_humano: 'echo PERIODO_NA_ABA' })])
      const r2 = caso('929')
      spawnSync('rm', ['-rf', amb.env.ORQ_RESOLVEDOR_DIR!])
      passa(T0)
      loop(join(r2.raiz, r2.ticket), 'pendente', '')
      passa(T0 + H)
      expect(de('comparacao')).toEqual([expect.objectContaining({ resultado: 'erro', como: 'humano_nao_trocou' })])
    })
  })
})
