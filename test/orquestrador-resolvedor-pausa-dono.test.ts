/**
 * Etapa 7f-b7, peça 3 · pausa com dono silenciosa.
 *
 * Pausa cujo motivo traz `dono: X` com X em `pausa_donos` do item do repo no
 * repos.json (padrão: publicar.sh e promocao-apolo) é pausa planejada: vai ao
 * ledger sem notificar, e só notifica (uma vez, `pausa_longa`) se ainda
 * estiver lá depois de `pausa_dono_max_min` (padrão 30). Motivo com FALHOU
 * notifica na hora, com ou sem dono, com o passo que falhou. Pausa sem dono
 * notifica como antes. Quando o sentinela some (ou vira outra pausa), o ledger
 * ganha `pausa_fim` com `duracao_s` e o dono.
 *
 * Os sentinelas são os reais (`fixtures/pausas-7f7`): as 17 pausas notificadas em
 * 17 e 18/10 e a `publicar FALHOU` de 15/10. Nenhum osascript de verdade: um
 * falso no PATH grava os argumentos.
 */
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'
import { passada } from '../scripts/orquestrador/resolvedor/passada.js'

interface PausaReal {
  ts: string
  motivo: string
  /** a 1ª linha do sentinela (LEIA.md da fixture) */
  conteudo: string
}
const REAIS = readFileSync(join(import.meta.dirname, 'fixtures', 'pausas-7f7', 'pausas.jsonl'), 'utf8')
  .split('\n')
  .filter(Boolean)
  .map((l) => JSON.parse(l) as PausaReal)
const DE_17_18 = REAIS.filter((p) => p.ts >= '2026-10-17')
const FALHOU = REAIS.find((p) => p.motivo.includes('FALHOU'))!
const achar = (s: string) => DE_17_18.find((p) => p.motivo.includes(s))!
const MIN = 60_000

describe('7f-b7 P3: pausa com dono silenciosa', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let comarka: string
  const osaLog = () => join(amb.base, 'osascript.log')
  const sentinela = () => join(comarka, 'docs/fila/.orq-pause')
  const chamadas = (): string[][] => {
    try {
      return readFileSync(osaLog(), 'utf8').split('\n---\n').filter(Boolean).map((b) => b.split('\n'))
    } catch {
      return []
    }
  }
  const ledger = (tipo: string) => {
    try {
      return readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>).filter((e) => e.tipo === tipo)
    } catch {
      return []
    }
  }
  const gravarRepos = (item: Record<string, unknown> = {}) =>
    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, repos: [{ caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto' }, ...item }] }, null, 2) + '\n')
  const pausar = (p: PausaReal) => writeFileSync(sentinela(), `${p.conteudo}\n`)
  const passa = (t: number) => passada({ agora: t })

  beforeAll(() => {
    amb = ambiente()
    const bin = join(amb.base, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'osascript'), `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done >> '${osaLog()}'\nprintf -- '---\\n' >> '${osaLog()}'\n`)
    chmodSync(join(bin, 'osascript'), 0o755)
    comarka = join(amb.base, 'comarka-operacional')
    mkdirSync(join(comarka, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(comarka, 'docs/fila/runs/local-loop.log'), '')
    tira = comEnv({ ...amb.env, PATH: `${bin}:${process.env.PATH}` })
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    rmSync(amb.env.ORQ_RESOLVEDOR_DIR!, { recursive: true, force: true })
    rmSync(osaLog(), { force: true })
    rmSync(sentinela(), { force: true })
    gravarRepos()
  })

  it('as 17 pausas reais de 17 e 18/10: só as 2 sem dono notificam (eram 17)', () => {
    expect(DE_17_18).toHaveLength(17)
    for (const p of DE_17_18) {
      pausar(p)
      passa(Date.parse(p.ts))
      passa(Date.parse(p.ts) + 5 * MIN)
    }
    const cs = chamadas()
    expect(cs.map((c) => c.find((a) => DE_17_18.some((p) => a.startsWith(p.motivo)))!)).toEqual([
      expect.stringMatching(/^ritual-staging em andamento/),
      expect.stringMatching(/^vigia: claude CLI com login expirado/),
    ])
    const ps = ledger('pausa')
    expect(ps).toHaveLength(17)
    const silenciosas = ps.filter((e) => (e.notificacao as { macos: string }).macos === 'silenciada')
    expect(silenciosas).toHaveLength(15)
    expect(new Set(silenciosas.map((e) => e.dono))).toEqual(new Set(['publicar.sh', 'promocao-apolo']))
    // cada pausa trocada pela seguinte fecha com a duração vista e o dono
    const fins = ledger('pausa_fim')
    expect(fins).toHaveLength(16)
    expect(fins[0]).toMatchObject({ dono: 'publicar.sh', duracao_s: (Date.parse(DE_17_18[1]!.ts) - Date.parse(DE_17_18[0]!.ts)) / 1000 })
  })

  it('pausa com dono abaixo do limite não notifica; passou de 30 min, notifica uma vez; ao sumir, pausa_fim', () => {
    const p = achar('fix-1710-mascara')
    const t0 = Date.parse(p.ts)
    pausar(p)
    for (let m = 0; m < 30; m += 5) passa(t0 + m * MIN)
    passa(t0 + 29 * MIN)
    expect(chamadas()).toEqual([])
    passa(t0 + 30 * MIN)
    passa(t0 + 35 * MIN)
    const cs = chamadas()
    expect(cs).toHaveLength(1)
    expect(cs[0]!.some((a) => a.startsWith(p.motivo) && a.includes('há 30 min'))).toBe(true)
    expect(ledger('pausa_longa')).toEqual([expect.objectContaining({ dono: 'publicar.sh', minutos: 30 })])
    rmSync(sentinela())
    passa(t0 + 40 * MIN)
    expect(ledger('pausa_fim')).toEqual([expect.objectContaining({ dono: 'publicar.sh', duracao_s: 40 * 60, arquivo: 'docs/fila/.orq-pause' })])
    passa(t0 + 45 * MIN)
    expect(ledger('pausa_fim')).toHaveLength(1)
  })

  it('FALHOU notifica na hora, mesmo com dono publicar.sh, e o aviso leva o passo', () => {
    pausar(FALHOU)
    passa(Date.parse(FALHOU.ts))
    const cs = chamadas()
    expect(cs).toHaveLength(1)
    expect(cs[0]!.some((a) => a.includes('passo 6/7 push'))).toBe(true)
    expect(ledger('pausa')).toEqual([expect.objectContaining({ dono: 'publicar.sh', falhou_passo: '6/7 push', notificacao: { macos: 'enviada', imessage: 'nao_configurado' } })])
  })

  it('pausa sem dono notifica como antes, e ao sumir fecha com dono nulo', () => {
    const p = achar('ritual-staging')
    pausar(p)
    passa(Date.parse(p.ts))
    expect(chamadas()).toHaveLength(1)
    rmSync(sentinela())
    passa(Date.parse(p.ts) + 10 * MIN)
    expect(ledger('pausa_fim')).toEqual([expect.objectContaining({ dono: null, duracao_s: 600 })])
  })

  it('pausa_donos e pausa_dono_max_min vêm do item do repo', () => {
    gravarRepos({ pausa_donos: ['promocao-apolo'], pausa_dono_max_min: 10 })
    const pub = achar('fix-1710-mascara')
    pausar(pub)
    passa(Date.parse(pub.ts))
    expect(chamadas()).toHaveLength(1) // publicar.sh fora da lista: notifica
    const apolo = achar('promocao-apolo')
    const t = Date.parse(apolo.ts)
    pausar(apolo)
    passa(t)
    passa(t + 5 * MIN)
    expect(chamadas()).toHaveLength(1)
    passa(t + 10 * MIN)
    expect(chamadas()).toHaveLength(2)
  })
})
