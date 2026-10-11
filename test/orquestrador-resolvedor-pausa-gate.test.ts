/**
 * Etapa 7f-b5, peça 7 · veredito da pausa de gate sistêmico.
 *
 * O loop legado do Comarka pausa a fila com
 *   gate sistemico: "<gate>" reprovou 2 tickets seguidos (A,B) em <ts>
 * e a suspeita é o gate. O resolvedor lê o gate-<gate>.txt da última tentativa
 * de A e de B e compara os arquivos de teste que falharam: nenhum em comum →
 * falso positivo provável; algum em comum → base vermelha provável (com os
 * arquivos); artefato ausente (ou sinal de máquina) → sem veredito. O veredito
 * vai na notificação da peça 6 e no ledger.
 *
 * `pausa_gate` no item do repo (diagnostico | sombra | auto, padrão sombra).
 * Em auto, e só com falso positivo, retoma pelo script do repo
 * (`scripts/orquestrador/orq-pause.sh --off`), no máximo 1 por repo a cada 6 h
 * e nunca de novo para o mesmo par.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const T0 = Date.parse('2026-10-11T17:41:00Z')
const H = 3600_000

type Passada = (o: { agora: number }) => unknown

describe('peça 7: veredito da pausa de gate sistêmico', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let repo: string
  const osaLog = () => join(amb.base, 'osascript.log')
  const offLog = () => join(amb.base, 'orq-pause-off.log')
  const avisos = (): string[] => (existsSync(osaLog()) ? readFileSync(osaLog(), 'utf8').split('\n---\n').filter(Boolean) : [])
  const ledger = () =>
    existsSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'))
      ? readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
      : []
  const offs = () => (existsSync(offLog()) ? readFileSync(offLog(), 'utf8').split('\n').filter(Boolean) : [])
  const sentinela = () => join(repo, 'docs/fila/.orq-pause')
  const gravarRepos = (pausaGate?: string) =>
    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, repos: [{ caminho: repo, resolvedor: { padrao: 'diagnostico' }, ...(pausaGate ? { pausa_gate: pausaGate } : {}) }] }, null, 2) + '\n')

  /** o gate-vitest.txt da tentativa k do ticket, com mtime 10 min antes de `ate` */
  const gate = (id: string, k: number, falham: string[], ate: number, extra = '') => {
    const d = join(repo, 'docs/fila/runs', id, `attempt-${k}`)
    mkdirSync(d, { recursive: true })
    const p = join(d, 'gate-vitest.txt')
    writeFileSync(p, `\n RUN  v4.1.9 /x\n\n${falham.map((f) => ` \x1b[31mFAIL\x1b[39m  ${f} > bloco > caso\nAssertionError: expected 1 to be 2\n ❯ ${f}:7:15\n`).join('')}${extra}\n Test Files  ${falham.length} failed | 300 passed\n`)
    utimesSync(p, new Date(ate - 600_000), new Date(ate - 600_000))
  }
  const pausar = (a: string, b: string, em: number, gateNome = 'vitest') =>
    writeFileSync(
      sentinela(),
      `gate sistemico: "${gateNome}" reprovou 2 tickets seguidos (${a},${b}) em ${new Date(em).toISOString().replace(/\.\d{3}Z$/, 'Z')}\nsuspeito: o gate, nao o codigo dos tickets envolvidos (voltaram a pendente, nunca bloqueado).\npara retomar depois de corrigir o gate: scripts/orquestrador/orq-pause.sh --off\n`,
    )
  const pausaDoLedger = () => ledger().filter((e) => e.tipo === 'pausa').at(-1)!

  beforeAll(async () => {
    amb = ambiente()
    const bin = join(amb.base, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'osascript'), `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done >> '${osaLog()}'\nprintf -- '---\\n' >> '${osaLog()}'\n`)
    chmodSync(join(bin, 'osascript'), 0o755)
    repo = join(amb.base, 'comarka-operacional')
    mkdirSync(join(repo, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(repo, 'docs/fila/runs/local-loop.log'), '')
    // o script do repo: o do Comarka (apaga o sentinela pelo próprio caminho), mais o registro da chamada
    mkdirSync(join(repo, 'scripts/orquestrador'), { recursive: true })
    writeFileSync(
      join(repo, 'scripts/orquestrador/orq-pause.sh'),
      `#!/usr/bin/env bash\nset -euo pipefail\nF="$(cd "$(dirname "$0")/../.." && pwd)/docs/fila/.orq-pause"\necho "$*" >> '${offLog()}'\nif [ "\${1:-}" = "--off" ]; then rm -f "$F" && echo "fila RETOMADA (sentinela removido)"; fi\n`,
    )
    gravarRepos()
    tira = comEnv({ ...amb.env, PATH: `${bin}:${process.env.PATH}` })
    passada = ((await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => tira?.())

  it('sombra (padrão), nenhum arquivo em comum: falso positivo provável na notificação e no ledger; não retoma', () => {
    gate('762', 2, ['test/c0-guard.test.ts'], T0)
    gate('851', 2, ['test/carteira-valor.test.ts'], T0)
    pausar('762', '851', T0)
    passada({ agora: T0 + 60_000 })
    expect(avisos()).toHaveLength(1)
    expect(avisos()[0]).toContain('falso positivo provável')
    expect(avisos()[0]).toContain('retomaria')
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'falso_positivo', gate: 'vitest', tickets: ['762', '851'], comuns: [] }, pausa_gate: { modo: 'sombra', retomar: false } })
    expect(existsSync(sentinela())).toBe(true)
    expect(offs()).toEqual([])
  })

  it('algum arquivo em comum: base vermelha provável, com os arquivos', () => {
    gate('898', 1, ['test/use-acao-unica.test.ts', 'test/x.test.ts'], T0 + H)
    gate('741a', 2, ['test/use-acao-unica.test.ts'], T0 + H)
    pausar('898', '741a', T0 + H)
    passada({ agora: T0 + H + 60_000 })
    expect(avisos().at(-1)).toContain('base vermelha provável: test/use-acao-unica.test.ts')
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'base_vermelha', comuns: ['test/use-acao-unica.test.ts'] } })
  })

  it('pausa com 4 tickets (limite do streak 4): em comum é o que falhou em pelo menos dois', async () => {
    const gs = await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/gate-streak.ts')).href)
    const t = T0 + 60 * H
    gate('W1', 2, ['test/w.test.ts'], t)
    gate('X1', 2, ['test/x1.test.ts'], t)
    gate('Y1', 2, ['test/y.test.ts', 'test/w.test.ts'], t)
    gate('Z1', 2, ['test/z.test.ts'], t)
    const v = gs.vereditoDaPausa(repo, { gate: 'vitest', tickets: ['W1', 'X1', 'Y1', 'Z1'], em: new Date(t).toISOString() }, t / 1000)
    expect(v).toMatchObject({ tipo: 'base_vermelha', comuns: ['test/w.test.ts'] })
    expect(gs.lerPausaGate('gate sistemico: "vitest" reprovou 4 tickets seguidos (W1,X1,Y1,Z1) em 2026-10-14T05:41:00Z\n')).toEqual({ gate: 'vitest', tickets: ['W1', 'X1', 'Y1', 'Z1'], em: '2026-10-14T05:41:00Z' })
  })

  it('artefato ausente, gate sem lista (criterio) ou sinal de máquina: sem veredito', () => {
    pausar('1009', '953', T0 + 2 * H)
    passada({ agora: T0 + 2 * H + 60_000 })
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'sem_veredito', motivo: 'artefato ausente: 1009, 953' } })
    expect(avisos().at(-1)).toContain('sem veredito')
    pausar('406', '408', T0 + 2 * H + 1000, 'criterio')
    passada({ agora: T0 + 2 * H + 120_000 })
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'sem_veredito', motivo: 'gate criterio sem lista de arquivos no artefato' } })
    gate('801', 2, ['test/a.test.ts'], T0 + 3 * H, 'Error: [vitest-pool]: Timeout waiting for worker to respond\n')
    gate('802', 2, ['test/b.test.ts'], T0 + 3 * H)
    pausar('801', '802', T0 + 3 * H)
    passada({ agora: T0 + 3 * H + 60_000 })
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'sem_veredito', motivo: 'sinal de máquina no gate de 801' } })
  })

  it('diagnostico: só o veredito, sem "retomaria"', () => {
    gravarRepos('diagnostico')
    gate('317', 2, ['test/a1.test.ts'], T0 + 4 * H)
    gate('391a', 2, ['test/b1.test.ts'], T0 + 4 * H)
    pausar('317', '391a', T0 + 4 * H)
    passada({ agora: T0 + 4 * H + 60_000 })
    expect(pausaDoLedger()).toMatchObject({ veredito: { tipo: 'falso_positivo' }, pausa_gate: { modo: 'diagnostico', retomar: false } })
    expect(avisos().at(-1)).not.toContain('retom')
    expect(offs()).toEqual([])
  })

  it('auto, falso positivo: retoma pelo orq-pause.sh --off (nunca rm direto); 1 por 6 h; nunca de novo para o mesmo par', () => {
    gravarRepos('auto')
    rmSync(sentinela(), { force: true })
    const t = T0 + 10 * H
    gate('G1', 2, ['test/g1.test.ts'], t)
    gate('H1', 2, ['test/h1.test.ts'], t)
    pausar('G1', 'H1', t)
    passada({ agora: t + 60_000 })
    expect(offs()).toEqual(['--off'])
    expect(existsSync(sentinela())).toBe(false)
    expect(avisos().at(-1)).toContain('retomando (auto)')
    expect(ledger().filter((e) => e.tipo === 'retomada')).toEqual([expect.objectContaining({ repo: 'comarka-operacional', par: 'G1,H1', gate: 'vitest', veredito: 'falso_positivo' })])

    // outro par, 1 h depois: não (uma retomada por repo a cada 6 h)
    gate('I1', 2, ['test/i1.test.ts'], t + H)
    gate('J1', 2, ['test/j1.test.ts'], t + H)
    pausar('I1', 'J1', t + H)
    passada({ agora: t + H + 60_000 })
    expect(offs()).toEqual(['--off'])
    expect(existsSync(sentinela())).toBe(true)
    expect(pausaDoLedger()).toMatchObject({ pausa_gate: { retomar: false, porque: expect.stringMatching(/no máximo uma a cada 6 h/) } })

    // o mesmo par G1,H1, 7 h depois: nunca de novo
    gate('G1', 3, ['test/g1.test.ts'], t + 7 * H)
    gate('H1', 3, ['test/h1.test.ts'], t + 7 * H)
    pausar('H1', 'G1', t + 7 * H)
    passada({ agora: t + 7 * H + 60_000 })
    expect(offs()).toEqual(['--off'])
    expect(pausaDoLedger()).toMatchObject({ pausa_gate: { retomar: false, porque: expect.stringMatching(/G1,H1 pausou de novo/) } })

    // outro par depois das 6 h: retoma
    gate('K1', 2, ['test/k1.test.ts'], t + 7 * H + 1000)
    gate('L1', 2, ['test/l1.test.ts'], t + 7 * H + 1000)
    pausar('K1', 'L1', t + 7 * H + 1000)
    passada({ agora: t + 7 * H + 120_000 })
    expect(offs()).toEqual(['--off', '--off'])
    expect(ledger().filter((e) => e.tipo === 'retomada').map((e) => e.par)).toEqual(['G1,H1', 'K1,L1'])
  })

  it('o sentinela muda entre a decisão e a retomada: não chama o script, "nao_agiu" no ledger', async () => {
    const gs = await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/gate-streak.ts')).href)
    const pz = await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/pausa.ts')).href)
    const cm = await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/caminhos.ts')).href)
    const t = T0 + 50 * H
    gate('P1', 2, ['test/p1.test.ts'], t)
    gate('Q1', 2, ['test/q1.test.ts'], t)
    pausar('P1', 'Q1', t)
    const p = pz.lerPausa(repo)
    const d = gs.decidirPausa(repo, 'comarka-operacional', 'auto', p, t + 60_000)
    expect(d).toMatchObject({ retomar: true })
    pausar('P1', 'Q1', t + 1000) // outra pausa escrita nesse meio-tempo
    const r = gs.retomar(new cm.GuardaResolvedor([repo]), { nome: 'comarka-operacional', caminho: repo }, p, d, t + 60_000)
    expect(r).toEqual({ feito: false, motivo: 'o sentinela mudou desde a leitura: outra pausa' })
    expect(offs()).toEqual(['--off', '--off'])
    expect(existsSync(sentinela())).toBe(true)
    expect(ledger().at(-1)).toMatchObject({ tipo: 'nao_agiu', acao: 'retomar_pausa_gate', par: 'P1,Q1' })
    rmSync(sentinela())
  })

  it('auto com base vermelha: não retoma', () => {
    const t = T0 + 30 * H
    gate('M1', 2, ['test/m.test.ts'], t)
    gate('N1', 2, ['test/m.test.ts'], t)
    pausar('M1', 'N1', t)
    passada({ agora: t + 60_000 })
    expect(offs()).toEqual(['--off', '--off'])
    expect(existsSync(sentinela())).toBe(true)
  })
})
