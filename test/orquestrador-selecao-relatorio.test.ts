/**
 * Etapa M69, P6 — `orq selecao`: o relatório da sombra, por fila e janela.
 *
 * Lê os `selecao.json` das tentativas (runs/<id>/attempt-N/, P3) e conta
 * tentativas, quedas para a inteira, inteiras vermelhas, escapes e minutos
 * economizados estimados. Diz se a regra da virada (CONTRATO) está cumprida:
 * pelo menos 7 dias em sombra, zero escape e pelo menos 5 inteiras vermelhas na
 * janela. Não muda nada: virar e voltar são decisão humana de config.
 */
import { mkdirSync, utimesSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { describeHarness, criarFixture, orq } from './fixtures/orq-harness.js'
import { relatorioSelecao, type RegistroLido } from '../scripts/orquestrador/selecao-relatorio.js'

const DIA = 86_400_000
const AGORA = Date.parse('2026-11-20T12:00:00Z')

function reg(o: { efetivo?: 'afetados' | 'inteira'; motivo?: string; vermelha?: boolean; escape?: boolean | null; s?: number; sa?: number }) {
  const efetivo = o.efetivo ?? 'afetados'
  return {
    modo: 'sombra',
    escolha: { modo_efetivo: efetivo, motivo: o.motivo ?? '1 arquivo(s) de teste afetado(s)', arquivos: efetivo === 'afetados' ? ['test/a.test.ts'] : [] },
    testes_rodou: true,
    inteira_ok: !o.vermelha,
    escape: 'escape' in o ? o.escape : false,
    escapes: o.escape ? ['test/x.test.ts'] : [],
    segundos_inteira: o.s ?? 147,
    segundos_afetados_estimados: o.sa ?? (efetivo === 'afetados' ? 12 : (o.s ?? 147)),
  }
}

/** 8 dias de sombra, 5 inteiras vermelhas sem escape, uma queda por package.json. */
function janelaBoa(): RegistroLido[] {
  const out: RegistroLido[] = []
  for (let d = 0; d < 9; d++) out.push({ id: `${100 + d}`, attempt: 0, mtimeMs: AGORA - (8 - d) * DIA - 1000, reg: reg({ vermelha: d < 5 }) })
  out.push({ id: '200', attempt: 1, mtimeMs: AGORA - DIA, reg: reg({ efetivo: 'inteira', motivo: 'diff casa suite_inteira_se: package.json (**/package.json)' }) })
  return out
}

describe('relatorioSelecao', () => {
  it('janela que cumpre a regra da virada', () => {
    const r = relatorioSelecao(janelaBoa(), { dias: 14, agora: AGORA })
    expect(r).toMatchObject({
      tentativas: 10,
      afetados: 9,
      inteira: 1,
      quedas: { suite_inteira_se: 1 },
      inteiras_vermelhas: 5,
      escapes: [],
      indeterminados: 0,
      dias_em_sombra: 8,
      minutos_inteira: 24.5,
      minutos_afetados: 4.3,
      minutos_economizados: 20.2,
      virada: { cumprida: true, faltas: [] },
    })
  })

  it('um escape impede a virada e nomeia ticket, tentativa e arquivo', () => {
    const rs = janelaBoa()
    rs[2]!.reg = reg({ vermelha: true, escape: true })
    const r = relatorioSelecao(rs, { dias: 14, agora: AGORA })
    expect(r.escapes).toEqual([{ id: '102', attempt: 0, arquivos: ['test/x.test.ts'] }])
    expect(r.virada).toEqual({ cumprida: false, faltas: ['1 escape(s) na janela (precisa de 0)'] })
  })

  it('menos de 7 dias em sombra e menos de 5 inteiras vermelhas', () => {
    const rs = janelaBoa().slice(5)
    const r = relatorioSelecao(rs, { dias: 14, agora: AGORA })
    expect(r.virada.faltas).toEqual(['3 dia(s) em sombra (precisa de 7)', '0 inteira(s) vermelha(s) na janela (precisa de 5)'])
  })

  it('a janela corta pelo mtime', () => {
    expect(relatorioSelecao(janelaBoa(), { dias: 2, agora: AGORA }).tentativas).toBe(3)
  })

  it('escape indeterminado (inteira vermelha sem FAIL legível) também impede', () => {
    const rs = janelaBoa()
    rs[0]!.reg = reg({ vermelha: true, escape: null })
    const r = relatorioSelecao(rs, { dias: 14, agora: AGORA })
    expect(r.indeterminados).toBe(1)
    expect(r.virada.faltas).toContain('1 tentativa(s) com escape indeterminado (precisa de 0)')
  })

  it('sem registro nenhum', () => {
    const r = relatorioSelecao([], { dias: 7, agora: AGORA })
    expect(r).toMatchObject({ tentativas: 0, virada: { cumprida: false } })
  })
})

describeHarness('orq selecao no fixture', () => {
  it('lê runs/<id>/attempt-N/selecao.json da fila e imprime o relatório', () => {
    const fx = criarFixture([])
    for (const r of janelaBoa()) {
      const dir = join(fx, 'docs', 'fila', 'runs', r.id, `attempt-${r.attempt}`)
      mkdirSync(dir, { recursive: true })
      const arq = join(dir, 'selecao.json')
      writeFileSync(arq, JSON.stringify(r.reg))
      const t = (Date.now() - (AGORA - r.mtimeMs)) / 1000
      utimesSync(arq, t, t)
    }
    const r = orq(fx, 'selecao', '--dias', '14')
    expect(r.rc, r.err).toBe(0)
    expect(r.out).toContain('tentativas em sombra     10 (afetados 9, caiu para a inteira 1: suite_inteira_se 1)')
    expect(r.out).toContain('inteiras vermelhas       5')
    expect(r.out).toContain('escapes                  0')
    expect(r.out).toContain('minutos economizados     20.2 (inteira 24.5, afetados estimados 4.3)')
    expect(r.out).toMatch(/virada \(CONTRATO §29\): regra cumprida \(8 dias em sombra, 0 escape, 5 inteiras vermelhas\)\. Virar para afetados é decisão humana de config, e só com a rede_suite_inteira existindo de fato\./)
  })

  it('argumento desconhecido é recusado', () => {
    const r = orq(criarFixture([]), 'selecao', '--semana')
    expect(r.rc).not.toBe(0)
    expect(r.err).toMatch(/uso: orq selecao \[--dias N\]/)
  })
})
