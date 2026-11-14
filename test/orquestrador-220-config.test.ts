/**
 * Etapa 2.2.0 · config da operação autônoma: as chaves novas são conhecidas
 * (config-chaves.ts), nascem desligadas no template, e valor fora da lista
 * fechada é violação do `orq config` (nunca liga ou desliga em silêncio).
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { validarConfig } from '../scripts/orquestrador/config-cli.js'
import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js'
import { REPO_ROOT } from './fixtures/orq-harness.js'

const template = () => JSON.parse(readFileSync(join(REPO_ROOT, 'doutrina', 'templates', 'config.json'), 'utf8'))

describe('2.2.0 · config da operação autônoma', () => {
  it('o template nasce desligado: planejador inativo em dry_run, promotor humano, sem hook', () => {
    const t = template()
    expect(t.loops.planejador).toEqual({ ativo: false, modo: 'dry_run' })
    expect(t.promotor.modo).toBe('humano')
    expect(t.planejador.liberacao_automatica).toBe('nenhuma')
    expect(t.avisos.hook_cmd).toBe('')
  })

  it('valor fora da lista é violação; o valor válido não é', () => {
    const base = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', '000-config.json'), 'utf8'))
    const ruim = { ...base, loops: { ...base.loops, planejador: { ativo: true, modo: 'automatico' } }, promotor: { modo: 'sempre' }, planejador: { ...base.planejador, liberacao_automatica: 'tudo' } }
    const v = validarConfig(ruim).map((x) => x.chave)
    expect(v).toEqual(expect.arrayContaining(['loops.planejador.modo', 'promotor.modo', 'planejador.liberacao_automatica']))
    const bom = { ...base, loops: { ...base.loops, planejador: { ativo: true, modo: 'auto' } }, promotor: { modo: 'auto' }, planejador: { ...base.planejador, liberacao_automatica: 'bloco_atual' } }
    expect(validarConfig(bom).map((x) => x.chave)).not.toEqual(expect.arrayContaining(['promotor.modo']))
    expect(CHAVES_CONFIG.map((c) => c.chave)).toEqual(expect.arrayContaining(['promotor.modo', 'avisos.hook_cmd', 'planejador.regras_ticket']))
  })
})
