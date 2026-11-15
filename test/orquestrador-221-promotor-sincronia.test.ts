/**
 * Etapa 2.2.1, D5 · promotor com diff vazio não chama o juiz.
 *
 * Trilha real (ciclo 5 do repo instalado, 15/11 19:05): a alvo tinha só um
 * commit de sincronia (árvore igual à principal), o promotor mandou ao juiz um
 * diff vazio e uma lista de tickets vazia, o juiz recusou e saiu um aviso
 * promocao_recusada sem ação possível.
 *
 * Pronto quando: com `git diff --quiet principal alvo` (árvores iguais) o
 * promotor faz o ff sem juiz e sem gates, grava `PROMOVIDO motivo=sincronia`
 * e não enfileira aviso nenhum. Controle: com diff de verdade o juiz é chamado.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promover } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta, type RepoAutonomo } from './fixtures/autonomo-repo.js'

const avisos = (fx: RepoAutonomo) => {
  try {
    return readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'avisos', 'ciclo.jsonl'), 'utf8').trim().split('\n').filter(Boolean)
  } catch {
    return []
  }
}
const eventos = (fx: RepoAutonomo) => {
  try {
    return readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'events.log'), 'utf8')
  } catch {
    return ''
  }
}

/** Commit de status da fila na principal e a sincronia dele na alvo: a alvo fica à frente só por um merge. */
function soSincroniaNaAlvo(fx: RepoAutonomo) {
  writeFileSync(join(fx.repo, 'docs', 'fila', 'status.txt'), 'fila: 009 bloqueado\n')
  fx.g(fx.repo, 'add', '-A')
  fx.g(fx.repo, 'commit', '-qm', 'fila: 009 bloqueado')
  const m = fx.g(fx.alvoWt, 'merge', '--no-ff', '-q', '-m', 'orq: sincroniza main em staging-auto', 'main')
  expect(m.rc).toBe(0)
}

describe('2.2.1 D5 · promotor com árvore igual à principal', () => {
  it('só commit de sincronia na alvo: ff sem juiz, PROMOVIDO motivo=sincronia, nenhum aviso', () => {
    const fx = criarRepoAutonomo()
    soSincroniaNaAlvo(fx)
    expect(fx.g(fx.repo, 'rev-list', '--count', 'main..staging-auto').out.trim()).toBe('1')
    expect(fx.g(fx.repo, 'diff', '--quiet', 'main', 'staging-auto').rc).toBe(0)
    const r = promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: false, motivos: ['diff vazio'], resumo: 'nada' }) })))
    expect(fx.chamadas).toHaveLength(0)
    expect(r).toMatchObject({ promovido: true, motivo: 'sincronia' })
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(fx.g(fx.repo, 'rev-parse', 'staging-auto').out)
    const ev = eventos(fx)
    expect(ev).toMatch(/ PROMOVIDO .*motivo=sincronia/)
    expect(ev).not.toMatch(/PROMOCAO_RECUSADA/)
    expect(avisos(fx)).toEqual([])
  }, 120_000)

  it('controle: com diff de verdade na alvo o juiz é chamado', () => {
    const fx = criarRepoAutonomo()
    writeFileSync(join(fx.alvoWt, 'src', 'usuarios', 'lista.ts'), 'export const lista = [1]\n')
    fx.g(fx.alvoWt, 'add', '-A')
    fx.g(fx.alvoWt, 'commit', '-qm', 'trabalho')
    const r = promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: false, motivos: ['x'], resumo: 'x' }) })))
    expect(fx.chamadas.map((c) => c.papel)).toEqual(['juiz de promoção'])
    expect(r.motivo).toBe('juiz')
  }, 120_000)
})
