/**
 * Etapa 2.2.0, peças P3 (avisos) e P4 (relatório por execução).
 *
 * Pronto quando:
 *   - execução com novidade chama `avisos.hook_cmd` UMA vez com o JSON
 *     {tipo, nivel, titulo, texto, dados, ts} no stdin; `nivel` é `acao` quando
 *     há aviso de ação, `info` quando só há novidade; o relatório vai para
 *     runs/relatorios/AAAA-MM-DD-HHMM.md e para dados.relatorio_md;
 *   - dedupe: o mesmo aviso (tipo + chave) sem mudança não repete em 24 h; com
 *     o texto mudado, repete;
 *   - disparo sem novidade (0 processados, nada promovido, nenhum aviso) não
 *     chama o hook nem escreve relatório;
 *   - hook que falha vira evento AVISO_HOOK rc=1 e não derruba nada.
 */
import { describe, expect, it } from 'vitest'
import { appendFileSync, existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cicloFim, enfileirarAviso, filtrarRepetidos, hashAviso, tsLocal } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo } from './fixtures/autonomo-repo.js'

function comHook(cmdExtra = '') {
  const fx = criarRepoAutonomo()
  const log = join(fx.base, 'hook.log')
  const ctx = fx.ctx(claudePorPapel({}), { avisos: { hook_cmd: `{ cat; printf '\\n'; } >> '${log}'${cmdExtra}`, dedupe_horas: 24 } })
  const chamadas = () => (existsSync(log) ? readFileSync(log, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [])
  const linhas = () => (existsSync(join(ctx.runsDir, 'events.log')) ? readFileSync(join(ctx.runsDir, 'events.log'), 'utf8').split('\n').filter(Boolean).length : 0)
  return { fx, ctx, chamadas, linhas }
}

describe('P3/P4 · avisos e relatório', () => {
  it('com novidade e aviso de ação: um hook com o JSON do contrato, relatório em runs/relatorios e em dados', () => {
    const { ctx, chamadas } = comHook()
    appendFileSync(join(ctx.runsDir, 'events.log'), `${tsLocal()} 024 APROVADO merge=aguardando dur=10s attempt=1\n`)
    enfileirarAviso(ctx.runsDir, { tipo: 'push_pendente', nivel: 'acao', titulo: 'Push pendente', texto: 'main 2 à frente', chave: 'main:abc' })
    enfileirarAviso(ctx.runsDir, { tipo: 'ciclo', nivel: 'info', titulo: 'B0-F3 liberada', texto: 'liberada', chave: 'B0-F3' })
    const r = cicloFim(ctx, 0)
    expect(r.novidade).toBe(true)
    const [h] = chamadas()
    expect(chamadas()).toHaveLength(1)
    expect(Object.keys(h).sort()).toEqual(['dados', 'nivel', 'texto', 'tipo', 'titulo', 'ts'])
    expect(h).toMatchObject({ tipo: 'push_pendente', nivel: 'acao', titulo: 'Push pendente (+1)' })
    expect(h.dados.relatorio_md).toMatch(/^# Execução /)
    expect(h.dados.relatorio_md).toContain('aprovados: 1 (024)')
    const rel = readdirSync(join(ctx.runsDir, 'relatorios'))
    expect(rel).toHaveLength(1)
    expect(rel[0]).toMatch(/^\d{4}-\d\d-\d\d-\d{4}\.md$/)
    expect(readFileSync(join(ctx.runsDir, 'relatorios', rel[0]!), 'utf8')).toBe(h.dados.relatorio_md)
    expect(readFileSync(join(ctx.runsDir, 'events.log'), 'utf8')).toMatch(/ AVISO_HOOK rc=0 tipo=push_pendente nivel=acao avisos=2/)
  }, 60_000)

  it('só novidade (drenagem sem aviso): hook com nivel info', () => {
    const { ctx, chamadas } = comHook()
    appendFileSync(join(ctx.runsDir, 'events.log'), `${tsLocal()} 024 APROVADO merge=aguardando dur=10s attempt=1\n`)
    cicloFim(ctx, 0)
    expect(chamadas()[0]).toMatchObject({ tipo: 'ciclo', nivel: 'info' })
  }, 60_000)

  it('dedupe de 24 h e o controle: sem novidade o hook não é chamado; texto mudado repete', () => {
    const { ctx, chamadas, linhas } = comHook()
    const aviso = { tipo: 'migration_pendente', nivel: 'acao' as const, titulo: 'Migration pendente: 0101', texto: 'sha256 aaa', chave: 'x:aaa' }
    enfileirarAviso(ctx.runsDir, aviso)
    cicloFim(ctx, linhas())
    expect(chamadas()).toHaveLength(1)
    // mesmo aviso, nada novo na trilha: sem hook, sem relatório
    enfileirarAviso(ctx.runsDir, aviso)
    const n0 = readdirSync(join(ctx.runsDir, 'relatorios')).length
    const r = cicloFim(ctx, linhas())
    expect(r.novidade).toBe(false)
    expect(chamadas()).toHaveLength(1)
    expect(readdirSync(join(ctx.runsDir, 'relatorios')).length).toBe(n0)
    // disparo vazio: nada
    expect(cicloFim(ctx, linhas()).novidade).toBe(false)
    expect(chamadas()).toHaveLength(1)
    // mudou o texto (outra migration): avisa de novo
    enfileirarAviso(ctx.runsDir, { ...aviso, texto: 'sha256 bbb' })
    cicloFim(ctx, linhas())
    expect(chamadas()).toHaveLength(2)
    // passou 24 h: o mesmo repete
    const agora = new Date(Date.now() + 25 * 3600_000)
    expect(filtrarRepetidos([aviso], { [`${aviso.tipo}:${aviso.chave}`]: { hash: hashAviso(aviso), ts: tsLocal() } }, agora, 24)).toHaveLength(1)
  }, 60_000)

  it('hook que falha vira evento e não derruba', () => {
    const { ctx } = comHook('; exit 1')
    enfileirarAviso(ctx.runsDir, { tipo: 'ambiente', nivel: 'acao', titulo: 'x', texto: 'y', chave: 'z' })
    expect(() => cicloFim(ctx, 0)).not.toThrow()
    expect(readFileSync(join(ctx.runsDir, 'events.log'), 'utf8')).toMatch(/ AVISO_HOOK rc=1 /)
    writeFileSync(join(ctx.runsDir, 'x'), '')
  }, 60_000)
})
