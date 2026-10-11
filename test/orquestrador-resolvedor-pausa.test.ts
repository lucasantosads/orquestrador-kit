/**
 * Etapa 7f-b5, peça 6 · aviso de pausa.
 *
 * A cada passada, o resolvedor olha o sentinela de pausa de cada repo do
 * repos.json (`docs/fila/.orq-pause` no Comarka; `pausar_file` do config,
 * `docs/fila/PAUSAR`, nos do kit). Pausa nova (pelo conteúdo) vira UMA
 * notificação do macOS (`osascript`, com o repo e a primeira linha do motivo)
 * e, com `notificar.imessage` no topo do repos.json, também uma mensagem pelo
 * Messages (osascript). No ledger: `tipo: pausa`. O sentinela nunca é tocado.
 *
 * Nenhum osascript de verdade: um falso no PATH grava os argumentos.
 */
import { chmodSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const AGORA = Date.parse('2026-10-11T17:45:00Z')

type Passada = (o: { agora: number; dryRun?: boolean }) => unknown

describe('peça 6: aviso de pausa', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let comarka: string
  let kit: string
  const osaLog = () => join(amb.base, 'osascript.log')
  const chamadas = (): string[][] => {
    try {
      return readFileSync(osaLog(), 'utf8').split('\n---\n').filter(Boolean).map((b) => b.split('\n'))
    } catch {
      return []
    }
  }
  const pausas = () => {
    try {
      return readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>).filter((e) => e.tipo === 'pausa')
    } catch {
      return []
    }
  }
  const gravarRepos = (topo: Record<string, unknown> = {}) =>
    writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, ...topo, repos: [{ caminho: kit }, { caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto' } }] }, null, 2) + '\n')

  beforeAll(async () => {
    amb = ambiente()
    const bin = join(amb.base, 'bin')
    mkdirSync(bin)
    // cada chamada: os argumentos, um por linha, e um separador
    writeFileSync(join(bin, 'osascript'), `#!/bin/bash\nfor a in "$@"; do printf '%s\\n' "$a"; done >> '${osaLog()}'\nprintf -- '---\\n' >> '${osaLog()}'\n`)
    chmodSync(join(bin, 'osascript'), 0o755)
    comarka = join(amb.base, 'comarka-operacional')
    kit = join(amb.base, 'conteudos-infinitos')
    mkdirSync(join(comarka, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(comarka, 'docs/fila/runs/local-loop.log'), '')
    mkdirSync(join(kit, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(kit, 'docs/fila/runs/events.log'), '')
    writeFileSync(join(kit, 'docs/fila/000-config.json'), JSON.stringify({ pausar_file: 'docs/fila/PAUSAR' }))
    gravarRepos()
    tira = comEnv({ ...amb.env, PATH: `${bin}:${process.env.PATH}` })
    passada = ((await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => tira?.())

  const PAUSA_GATE = 'gate sistemico: "gate vitest" reprovou 2 tickets seguidos (1009,953) em 2026-10-11T17:41:12Z\nsuspeito: o gate, nao o codigo dos tickets envolvidos (voltaram a pendente, nunca bloqueado).\n'

  it('sem pausa: nada notificado, nada no ledger', () => {
    passada({ agora: AGORA })
    expect(chamadas()).toEqual([])
    expect(pausas()).toEqual([])
  })

  it('pausa nova no Comarka: uma notificação com o repo e a 1ª linha, uma linha no ledger; o sentinela intacto', () => {
    const f = join(comarka, 'docs/fila/.orq-pause')
    writeFileSync(f, PAUSA_GATE)
    const antes = statSync(f).mtimeMs
    passada({ agora: AGORA })
    passada({ agora: AGORA + 300_000 })
    const cs = chamadas()
    expect(cs).toHaveLength(1)
    expect(cs[0]!.join('\n')).toContain('display notification')
    expect(cs[0]).toContain('orq: comarka-operacional pausado')
    expect(cs[0]).toContain('gate sistemico: "gate vitest" reprovou 2 tickets seguidos (1009,953) em 2026-10-11T17:41:12Z')
    expect(pausas()).toHaveLength(1)
    expect(pausas()[0]).toMatchObject({ repo: 'comarka-operacional', arquivo: 'docs/fila/.orq-pause', notificacao: { macos: 'enviada', imessage: 'nao_configurado' } })
    expect(readFileSync(f, 'utf8')).toBe(PAUSA_GATE)
    expect(statSync(f).mtimeMs).toBe(antes)
  })

  it('--dry-run não notifica nem grava', () => {
    writeFileSync(join(kit, 'docs/fila/PAUSAR'), '2026-10-11 14:50 | conferir 1110 à mão\n')
    passada({ agora: AGORA, dryRun: true })
    expect(chamadas()).toHaveLength(1)
    expect(pausas()).toHaveLength(1)
  })

  it('pausa do kit (PAUSAR), com notificar.imessage: notificação e iMessage, a 1ª linha sem a data', () => {
    gravarRepos({ notificar: { imessage: '+5511999990000' } })
    passada({ agora: AGORA + 600_000 })
    const novas = chamadas().slice(1)
    expect(novas).toHaveLength(2)
    expect(novas[0]).toEqual(expect.arrayContaining(['orq: conteudos-infinitos pausado', 'conferir 1110 à mão']))
    expect(novas[1]!.join('\n')).toContain('Messages')
    expect(novas[1]).toEqual(expect.arrayContaining(['+5511999990000', 'orq: conteudos-infinitos pausado: conferir 1110 à mão']))
    expect(pausas().at(-1)).toMatchObject({ repo: 'conteudos-infinitos', arquivo: 'docs/fila/PAUSAR', motivo: 'conferir 1110 à mão', notificacao: { macos: 'enviada', imessage: 'enviada' } })
    // a mesma pausa: nada de novo
    passada({ agora: AGORA + 900_000 })
    expect(chamadas()).toHaveLength(3)
  })

  it('o conteúdo muda (outra pausa): avisa de novo; a pausa some: nada', () => {
    writeFileSync(join(kit, 'docs/fila/PAUSAR'), '2026-10-11 15:30 | migration do 1112\n')
    passada({ agora: AGORA + 1_200_000 })
    expect(chamadas()).toHaveLength(5)
    expect(pausas()).toHaveLength(3)
    rmSync(join(kit, 'docs/fila/PAUSAR'))
    passada({ agora: AGORA + 1_500_000 })
    expect(chamadas()).toHaveLength(5)
  })

  it('com o interruptor do resolvedor ligado, nada (nem aviso)', () => {
    writeFileSync(join(kit, 'docs/fila/PAUSAR'), '2026-10-11 16:00 | outra\n')
    writeFileSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!, '')
    passada({ agora: AGORA + 1_800_000 })
    rmSync(amb.env.ORQ_RESOLVEDOR_PAUSADO!)
    expect(chamadas()).toHaveLength(5)
  })
})
