/**
 * Etapa 7f-b5, peça 2 · o leitor do kit lê cada tentativa real uma vez.
 *
 * O 243 do conteudos-infinitos tem dois `INICIO attempt=1` na trilha: a 1ª
 * volta (que terminou em REFATIAR/DECISAO_PENDENTE) e a volta seguinte. O
 * leitor tirava o diretório do `attempt=` do INICIO (`attempt-(N-1)`): lia
 * `attempt-0` duas vezes e nunca o `attempt-3`, a tentativa do bloqueio. O
 * `meta.json` do kit diz o diretório de cada tentativa (`dir`) e a hora em que
 * ela terminou (`ts`): a tentativa de um INICIO é a entrada do meta que termina
 * depois dele e até o INICIO seguinte.
 *
 * Fixture: `test/fixtures/triador-leitor-kit/conteudos-243` (montar.py, só
 * leitura do repo). Pronto quando: as tentativas são `attempt-0..3`, uma vez
 * cada; nenhum arquivo é lido duas vezes; a série sem INICIO repetido (o molde
 * do painel, sem `ts` no meta) continua com os mesmos diretórios.
 */
import { cpSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js'

const FX = join(import.meta.dirname, 'fixtures', 'triador-leitor-kit', 'conteudos-243')

describe('peça 2: o leitor do kit lê cada tentativa uma vez', () => {
  const raiz = join(mkdtempSync(join(tmpdir(), 'leitor-kit-')), 'conteudos-infinitos')
  cpSync(FX, raiz, { recursive: true })
  const ev = lerRepoKit(raiz, '243')

  it('o 243 com dois INICIO attempt=1: attempt-0..3, uma vez cada, na ordem', () => {
    expect(ev.tentativas.map((t) => [t.n, t.dir])).toEqual([
      [1, 'docs/fila/runs/243/attempt-0'],
      [2, 'docs/fila/runs/243/attempt-1'],
      [3, 'docs/fila/runs/243/attempt-2'],
      [4, 'docs/fila/runs/243/attempt-3'],
    ])
    expect(ev.falta.filter((f) => f.endsWith('/'))).toEqual([])
  })

  it('a última tentativa é a do bloqueio (o juiz da attempt-3), e a 1ª a do enforcement', () => {
    expect(ev.tentativas.map((t) => t.estagio)).toEqual(['enforcement', 'juiz', 'juiz', 'juiz'])
    expect(ev.tentativas.at(-1)?.juiz?.ref.arquivo).toBe('docs/fila/runs/243/attempt-3/juiz.veredito.json')
  })

  it('nenhum arquivo entra duas vezes nos lidos (a assinatura e a cópia da evidência)', () => {
    const arqs = ev.lidos.map((l) => l.arquivo)
    expect(arqs.length).toBe(new Set(arqs).size)
    expect(arqs.filter((a) => a.includes('/attempt-3/')).sort()).toEqual([
      'docs/fila/runs/243/attempt-3/criterios.txt',
      'docs/fila/runs/243/attempt-3/diff.patch',
      'docs/fila/runs/243/attempt-3/enforcement.json',
      'docs/fila/runs/243/attempt-3/gates.txt',
      'docs/fila/runs/243/attempt-3/juiz.veredito.json',
    ])
  })
})
