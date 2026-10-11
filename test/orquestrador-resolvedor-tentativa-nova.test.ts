/**
 * Etapa 7f-b5, peça 4 (b) · tentativa nova entre a leitura e a troca.
 *
 * O loop relê o ticket a cada tentativa (no Comarka: recon, prompt,
 * enforcement e critérios, `executor.sh:477-629`) e marca `em_execucao` só
 * DEPOIS de ler. Antes de escrever qualquer ticket, o resolvedor relê o
 * `runs/<id>/` e o log do loop: se apareceu (ou mudou) um `attempt-*`, se o
 * log ganhou o começo de uma tentativa do ticket (`=== ticket <id> (…) —
 * tentativa N` no legado, `<ts> <id> INICIO` no kit) ou se o ticket virou
 * `em_execucao`, ele desiste e grava "não consegui: tentativa nova" no ledger.
 *
 * Corrida determinística: o `pgrep` falso (a espera do git, `repo.ts`) roda
 * entre a leitura e a troca; é nele que a tentativa nova aparece.
 */
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const AGORA = Date.parse('2026-10-11T12:00:00Z')

type Passada = (o: { repo?: string; semModelo?: boolean; agora?: number }) => { itens: { id: string; feito: string; motivo: string }[] }

describe('peça 4 (b): tentativa nova entre a leitura e a troca', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  let n = 0
  const ledger = () => {
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  /** o 840 (R1 D6 em auto) e um pgrep que, na 1ª chamada, roda `corrida` */
  const caso = (corrida: string) => {
    const r = repoDoCaso(join(amb.base, `c${++n}`), '840', { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'cmk', caminho: r.raiz, resolvedor: { R1: 'auto', R5: 'auto', R2: 'sombra' } }])
    const pg = join(amb.base, `pgrep-${n}.sh`)
    const feito = join(amb.base, `corrida-${n}`)
    writeFileSync(pg, `#!/bin/bash\nif [ ! -e '${feito}' ]; then touch '${feito}'; cd '${r.raiz}' && ${corrida}; fi\nexit 1\n`)
    chmodSync(pg, 0o755)
    process.env.ORQ_RESOLVEDOR_PGREP = pg
    return { ...r, head: git(r.raiz, 'rev-parse', 'HEAD').trim() }
  }
  const confere = (r: ReturnType<typeof caso>, motivo: RegExp) => {
    const p = passada({ repo: 'cmk', semModelo: true, agora: AGORA })
    expect(p.itens).toEqual([expect.objectContaining({ id: '840', feito: 'nao_consegui', motivo: expect.stringMatching(motivo) })])
    expect(git(r.raiz, 'rev-parse', 'HEAD').trim()).toBe(r.head)
    expect(ledger().filter((e) => e.tipo === 'acao')).toEqual([])
    expect(ledger().filter((e) => e.tipo === 'nao_agiu').at(-1)).toMatchObject({ id: '840', motivo: expect.stringMatching(/^tentativa nova/) })
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

  it('um attempt-* novo em runs/<id>/: desiste, o ticket fica intacto', () => {
    // o que o executor legado faz no começo da tentativa (executor.sh:461-466): arquiva e recria
    const r = caso(`mv docs/fila/runs/840/attempt-1 docs/fila/runs/840/attempt-1.prev1 && mkdir docs/fila/runs/840/attempt-1`)
    confere(r, /^tentativa nova: docs\/fila\/runs\/840\/attempt-1/)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })

  it('um arquivo reescrito dentro de um attempt-* (sem entrada nova): desiste', () => {
    const r = caso(`sleep 0.02; echo novo > docs/fila/runs/840/attempt-2/prompt.txt`)
    confere(r, /^tentativa nova: docs\/fila\/runs\/840\/attempt-2 mudou/)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })

  it('o log do loop ganha o começo de uma tentativa do ticket: desiste', () => {
    const r = caso(`printf '%s\\n' '[orq 12:00:01] === ticket 840 (cockpit) — tentativa 1 · modo: real ===' >> docs/fila/runs/local-loop.log`)
    confere(r, /^tentativa nova: .*local-loop\.log.*=== ticket 840/)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })

  it('o ticket vira em_execucao: desiste (e não pisa no que o loop escreveu)', () => {
    const r = caso(`sed -i '' 's/"status": "bloqueado"/"status": "em_execucao"/' ${'"$(ls docs/fila/840-*.md)"'}`)
    confere(r, /^tentativa nova: o ticket está em_execucao/)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes.replace('"status": "bloqueado"', '"status": "em_execucao"'))
  })

  it('log de outro ticket e nada novo no runs/: age (a trava não trava sem motivo)', () => {
    caso(`printf '%s\\n' '[orq 12:00:01] === ticket 841 (outro) — tentativa 1 · modo: real ===' >> docs/fila/runs/local-loop.log`)
    const p = passada({ repo: 'cmk', semModelo: true, agora: AGORA })
    expect(p.itens).toEqual([expect.objectContaining({ id: '840', feito: 'aplicado' })])
  })
})
