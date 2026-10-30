/**
 * Etapa 7f-b1, peça 3 · regras D1-D12 além do placar do aceite (spec 7f-a §2,
 * §3 e §6): a regra de falta (fonte ausente vira palpite, nunca firme), o que o
 * agente disse não decide nada, e a base vermelha que o motor do kit já
 * decidiu é prova firme.
 *
 * Os módulos entram por import dinâmico tolerante: sem `extrair.ts` o vermelho
 * é de asserção.
 */
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')

interface Ext { classe: string | null; firme: boolean; regra: string | null; evidencia: { arquivo: string; linha: number | null }[]; requeue: string }
type Ev = any
interface Mods { lerCasoDeFixture: (d: string, o?: { instante?: string }) => Ev; extrair: (e: Ev) => Ext }

async function carregar(): Promise<Mods | null> {
  try {
    const a = (await import(pathToFileURL(join(TRIADOR, 'leitor-legado-comarka.ts')).href)) as Partial<Mods>
    const b = (await import(pathToFileURL(join(TRIADOR, 'extrair.ts')).href)) as Partial<Mods>
    return a.lerCasoDeFixture && b.extrair ? { lerCasoDeFixture: a.lerCasoDeFixture, extrair: b.extrair } : null
  } catch {
    return null
  }
}
const NADA: Ext = { classe: null, firme: false, regra: null, evidencia: [], requeue: '' }

describe('regras do triador (peça 3)', () => {
  it('sem o fonte do teste vermelho, o R1 acoplado vira palpite (regra de falta)', async () => {
    const m = await carregar()
    const ev = m?.lerCasoDeFixture(join(FX, '07-627j-L57368'))
    const antes = m && ev ? m.extrair(ev) : NADA
    if (ev) for (const t of ev.tentativas) for (const k of Object.keys(t.fontes)) t.fontes[k] = null
    const depois = m && ev ? m.extrair(ev) : NADA
    expect([antes.classe, antes.firme, antes.regra]).toEqual(['R1', true, 'D6'])
    expect([depois.classe, depois.firme, depois.regra]).toEqual(['R5?', false, 'D7'])
  })

  it('sem índice de vizinhos, a base vermelha não fecha (760 vira R5?)', async () => {
    const m = await carregar()
    const ev = m?.lerCasoDeFixture(join(FX, '21-760-L72407'))
    const antes = m && ev ? m.extrair(ev) : NADA
    if (ev) ev.vizinhos = []
    const depois = m && ev ? m.extrair(ev) : NADA
    expect([antes.classe, antes.regra, antes.requeue]).toEqual(['R5', 'D5', 'sim_apos:base_verde:test/migrations-policy-idempotente.test.ts'])
    expect([depois.classe, depois.firme]).toEqual(['R5?', false])
  })

  it('vizinho da MESMA família não prova base vermelha (711a não conta para o 711b3)', async () => {
    const m = await carregar()
    const ev = m?.lerCasoDeFixture(join(FX, '21-760-L72407'))
    if (ev) ev.vizinhos = ev.vizinhos.map((v: { ticket: string }) => ({ ...v, ticket: v.ticket === '760' ? '760' : '760b' }))
    const x = m && ev ? m.extrair(ev) : NADA
    expect([x.classe, x.firme]).toEqual(['R5?', false])
  })

  it('o que o agente disse não muda a classe (nunca é prova sozinho)', async () => {
    const m = await carregar()
    for (const nome of ['36-940-L85222', '01-559-L55054', '29-826-L80362', '35-950-L85145']) {
      const ev = m?.lerCasoDeFixture(join(FX, nome))
      const antes = m && ev ? m.extrair(ev) : NADA
      if (ev) for (const t of ev.tentativas) t.agente_disse = 'base vermelha: Timeout waiting for worker; árvore suja; overwritten by merge'
      const depois = m && ev ? m.extrair(ev) : NADA
      expect(depois.classe, nome).toBe(antes.classe)
      expect(depois.evidencia, nome).toEqual(antes.evidencia)
      expect(antes.evidencia.every((r) => !/claude-output/.test(r.arquivo)), nome).toBe(true)
    }
    expect(m).not.toBeNull()
  })

  it('kit: BLOQUEADO motivo=base_vermelha já é prova firme, com a linha da trilha', async () => {
    const m = await carregar()
    const ref = { arquivo: 'docs/fila/runs/events.log', linha: 12, trecho: '… 510c BLOQUEADO motivo=base_vermelha arquivos=test/x.test.ts attempt=1' }
    const ev = {
      leitor: 'kit', repo: '/r', id: '510c',
      ticket: { arquivo: 'docs/fila/510c-x.md', id: '510c', slug: 'x', status: 'bloqueado', notas_status: '', objetivo: '', pathspec_allowlist: ['src/a.ts'], criterios_aceite: [] },
      bloqueio: { quando: '2026-09-24T01:10:29Z', token: 'base_vermelha', nota_do_motor: '', tentativas: 1, origem: 'motor', refs: [ref] },
      tentativas: [{
        n: 1, dir: 'docs/fila/runs/510c/attempt-0', estagio: 'vitest', vermelhos: [], arquivos_vermelhos: ['test/x.test.ts'], falhas: [],
        criterios_falhos: [], diff_arquivos: ['src/a.ts'], diff_linhas: 2, diff_ref: null, enforcement: null, juiz: null,
        agente_disse: null, head: null, dur_secs: null, maquina: [], recorte_vitest: null, recorte_criterios: null, diff_stat: null,
        fontes: { 'test/x.test.ts': null },
      }],
      merge_recusado: null, motor: [], base_vermelha_motor: { arquivos: ['test/x.test.ts'], ref },
      vizinhos: [], config: { diff_cap_linhas: 600, claude_timeout_secs: 1800 }, falta: [], lidos: [],
    }
    const x = m ? m.extrair(ev) : NADA
    expect([x.classe, x.firme, x.regra, x.requeue]).toEqual(['R5', true, 'D5', 'sim_apos:base_verde:test/x.test.ts'])
    expect(x.evidencia).toEqual([ref])
  })
})

// Etapa L13 (P6): o leitor do legado reconhece o merge recusado pela linha do
// git. Com o git em pt_BR a linha é a tradução do git.mo ("seriam substituídas
// pelo merge:"), e o D1 sumia em silêncio. Caso 36-940 com a linha traduzida.
describe('L13 P6: merge recusado com o git em pt_BR', () => {
  it('36-940 com a linha do git em pt_BR acha os mesmos arquivos que em inglês', async () => {
    const m = await carregar()
    const tmp = mkdtempSync(join(tmpdir(), 'triador-ptbr-'))
    cpSync(join(FX, '36-940-L85222'), tmp, { recursive: true })
    const log = join(tmp, 'log.txt')
    writeFileSync(log, readFileSync(log, 'utf8').replaceAll(
      'error: Your local changes to the following files would be overwritten by merge:',
      'erro: Suas alterações locais nos seguintes arquivos seriam substituídas pelo merge:',
    ))
    const en = m?.lerCasoDeFixture(join(FX, '36-940-L85222'))
    const pt = m?.lerCasoDeFixture(tmp)
    expect(en?.merge_recusado?.arquivos).toEqual(['docs/fila/854-remove-equipe-geral.md'])
    expect(pt?.merge_recusado?.arquivos).toEqual(en?.merge_recusado?.arquivos)
  })
})
