/**
 * Etapa 8b, peça 3 · pausa com dono é intocável para o resolvedor.
 *
 * O resolvedor só retoma a pausa de gate sistêmico que ele mesmo julgou
 * (gate-streak.ts, 7f-b5). Ele nunca retirou pausa nenhuma até 18/10 (0 linhas
 * `retomada` no ledger), mas a regra tinha duas portas abertas:
 *
 *   (a) `lerPausaGate` acha a linha de gate em QUALQUER lugar do sentinela: uma
 *       pausa com `dono:` que cita a linha de gate (alguém investigando o gate)
 *       era julgada como pausa de gate e saía pelo `--off`;
 *   (b) o `--off` do kit apaga as DUAS sentinelas (orq-pause.sh:22-38): num repo
 *       com `pausar_file` no `.orq-pause` legado, retomar a pausa de gate levava
 *       junto a pausa com dono do `docs/fila/PAUSAR`.
 *
 * Os textos são os reais, a combinação é montada:
 *   - pausa de gate de 12/10 (ledger 2026-10-12T17:34:26Z), no formato que o
 *     Comarka grava (comarka lib.sh:566-570, sem carimbo e sem dono);
 *   - pausa com dono de 16/10 (ledger 2026-10-16T19:36:34Z): motivo
 *     "dono: manual | motivo: Lucas alinhando main local", com o carimbo
 *     "AAAA-MM-DD HH:MM | " que o orq-pause.sh grava e o ledger tira.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const EM = Date.parse('2026-10-12T17:34:24Z')
const TICKETS = ['835', '854', '318c', '921']
const PAUSA_GATE_1210 =
  'gate sistemico: "vitest" reprovou 4 tickets seguidos (835,854,318c,921) em 2026-10-12T17:34:24Z\n' +
  'suspeito: o gate, nao o codigo dos tickets envolvidos (voltaram a pendente, nunca bloqueado).\n' +
  'para retomar depois de corrigir o gate: scripts/orquestrador/orq-pause.sh --off\n'
const PAUSA_DONO_1610 = '2026-10-16 16:36 | dono: manual | motivo: Lucas alinhando main local\n'

type Passada = (o: { agora: number }) => unknown

describe('peça 3 (8b): pausa com dono nunca sai pelo resolvedor', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let repo: string
  let n = 0
  const offLog = () => join(amb.base, `off-${n}.log`)
  const offs = () => (existsSync(offLog()) ? readFileSync(offLog(), 'utf8').split('\n').filter(Boolean) : [])
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }

  /** Um repo com o gate-vitest.txt de cada ticket (nenhum arquivo em comum: falso positivo) e o orq-pause.sh dado. */
  const novoRepo = (script: 'kit' | 'comarka', config?: Record<string, unknown>) => {
    repo = join(amb.base, `repo-${++n}`)
    for (const id of TICKETS) {
      const d = join(repo, 'docs/fila/runs', id, 'attempt-2')
      mkdirSync(d, { recursive: true })
      const p = join(d, 'gate-vitest.txt')
      writeFileSync(p, `\n FAIL  test/so-${id}.test.ts > bloco > caso\nAssertionError: expected 1 to be 2\n\n Test Files  1 failed | 300 passed\n`)
      utimesSync(p, new Date(EM - 600_000), new Date(EM - 600_000))
    }
    writeFileSync(join(repo, 'docs/fila/runs/local-loop.log'), '')
    if (config) writeFileSync(join(repo, 'docs/fila/000-config.json'), JSON.stringify(config, null, 2))
    mkdirSync(join(repo, 'scripts/orquestrador'), { recursive: true })
    // o --off de cada motor: o do Comarka apaga o .orq-pause; o do kit apaga as duas sentinelas (orq-pause.sh:22-38)
    const apaga = script === 'kit' ? 'docs/fila/PAUSAR docs/fila/.orq-pause' : 'docs/fila/.orq-pause'
    writeFileSync(
      join(repo, 'scripts/orquestrador/orq-pause.sh'),
      `#!/usr/bin/env bash\nset -euo pipefail\nR="$(cd "$(dirname "$0")/../.." && pwd)"\necho "$*" >> '${offLog()}'\nif [ "\${1:-}" = "--off" ]; then for f in ${apaga}; do rm -f "$R/$f"; done; echo "fila RETOMADA"; fi\n`,
    )
    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, repos: [{ caminho: repo, resolvedor: { padrao: 'diagnostico' }, pausa_gate: 'auto' }] }, null, 2) + '\n')
  }
  const escreve = (rel: string, txt: string) => writeFileSync(join(repo, rel), txt)

  beforeAll(async () => {
    amb = ambiente()
    const bin = join(amb.base, 'bin')
    mkdirSync(bin)
    writeFileSync(join(bin, 'osascript'), '#!/bin/sh\nexit 0\n')
    chmodSync(join(bin, 'osascript'), 0o755)
    tira = comEnv({ ...amb.env, PATH: `${bin}:${process.env.PATH}` })
    passada = ((await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => tira?.())
  beforeEach(() => {
    amb.env.ORQ_RESOLVEDOR_DIR = process.env.ORQ_RESOLVEDOR_DIR = join(amb.base, `res-${n + 1}`)
  })

  it('controle: a pausa de gate real de 12/10, sozinha, ainda é retomada em auto', () => {
    novoRepo('comarka')
    escreve('docs/fila/.orq-pause', PAUSA_GATE_1210)
    passada({ agora: EM + 60_000 })
    expect(offs()).toEqual(['--off'])
    expect(ledger().filter((e) => e.tipo === 'retomada')).toHaveLength(1)
  })

  it('(a) pausa com dono que cita a linha de gate não é pausa de gate: não retoma', () => {
    novoRepo('comarka')
    const linhaGate = PAUSA_GATE_1210.split('\n')[0]
    escreve('docs/fila/.orq-pause', `2026-10-16 16:36 | dono: manual | motivo: Lucas olhando o ${linhaGate}\n`)
    passada({ agora: EM + 60_000 })
    expect(offs()).toEqual([])
    expect(existsSync(join(repo, 'docs/fila/.orq-pause'))).toBe(true)
    expect(ledger().filter((e) => e.tipo === 'retomada')).toEqual([])
  })

  it('(b) gate no .orq-pause legado e a pausa com dono de 16/10 no PAUSAR: não chama o --off, as duas ficam', () => {
    novoRepo('kit', { pausar_file: 'docs/fila/.orq-pause' })
    escreve('docs/fila/.orq-pause', PAUSA_GATE_1210)
    escreve('docs/fila/PAUSAR', PAUSA_DONO_1610)
    passada({ agora: EM + 60_000 })
    expect(offs()).toEqual([])
    expect(readFileSync(join(repo, 'docs/fila/PAUSAR'), 'utf8')).toBe(PAUSA_DONO_1610)
    expect(existsSync(join(repo, 'docs/fila/.orq-pause'))).toBe(true)
    expect(ledger().filter((e) => e.tipo === 'retomada')).toEqual([])
    expect(ledger().filter((e) => e.tipo === 'nao_agiu' && e.acao === 'retomar_pausa_gate')).toEqual([
      expect.objectContaining({ motivo: expect.stringMatching(/^outra pausa presente: docs\/fila\/PAUSAR/) }),
    ])
  })

  it('pausa com dono sozinha (16/10) nunca chama o --off', () => {
    novoRepo('comarka')
    escreve('docs/fila/.orq-pause', PAUSA_DONO_1610)
    passada({ agora: EM + 60_000 })
    expect(offs()).toEqual([])
    rmSync(join(repo, 'docs/fila/.orq-pause'))
  })
})
