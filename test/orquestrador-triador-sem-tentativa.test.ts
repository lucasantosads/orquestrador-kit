/**
 * Etapa 7f-b3, peça 2 · sem evidência, sem modelo.
 *
 * No primeiro dia do resolvedor (11/10/2026), 7 bloqueados do actus-saas sem
 * nenhuma tentativa (517a, 518, 519, 520, 521, 527, 532: sem `runs/<id>/`,
 * `falta: ["meta"]`) foram ao modelo e entraram no ledger com custo nulo, que
 * o teto do dia contava como o pior caso (US$ 0,60 cada). A fixture
 * `triador-sem-tentativa/actus-1110` (montar.py, só leitura do Actus) os
 * reproduz com as dependências no estado de 11/10.
 *
 * Pronto quando: nenhum dos 7 chama o modelo (o stub não roda) nem reserva
 * (o ledger fica vazio); cada um sai "bloqueado sem tentativa" (D0), com a
 * nota do ticket de evidência e, se houver dependência ainda não done (ou
 * portão `humano:` sem liberação), qual.
 */
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
const FX = join(import.meta.dirname, 'fixtures', 'triador-sem-tentativa', 'actus-1110')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }
const IDS = ['517a', '518', '519', '520', '521', '527', '532']

let base: string
const envAntes = { ...process.env }
beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-sem-tentativa-')))
  mkdirSync(join(base, 'trava'))
  writeFileSync(join(base, 'trava', 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(base, 'trava.log')}"\nexit 99\n`)
  chmodSync(join(base, 'trava', 'claude'), 0o755)
  Object.assign(process.env, {
    ORQ_DIAG_DIR: join(base, 'diag'),
    ORQ_REPOS: join(base, 'repos.json'),
    ORQ_TRIADOR_CONFIG: join(base, 'triador.json'),
    ORQ_TRIADOR_CLAUDE: STUB,
    STUB_LOG: join(base, 'stub.log'),
    STUB_RESPOSTA: join(base, 'resposta.json'),
    PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
  })
  writeFileSync(join(base, 'triador.json'), JSON.stringify(CFG))
  // se o modelo fosse chamado, pagaria US$ 0,30 por caso
  const r = JSON.stringify({ classe: 'R7', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.3, usage: { input_tokens: 1, output_tokens: 1 } }))
})
afterEach(() => {
  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
  process.env = { ...envAntes }
})

const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
const ledger = () => (existsSync(join(base, 'diag', 'custo.json')) ? (JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, unknown[]> }).dias : {})

async function triar(): Promise<{ id: string; feito: string; diagnostico?: any }[]> {
  const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
  const { triarRepo } = await imp('triar.ts')
  const { criarPassoModelo, lerConfigModelo } = await imp('modelo.ts')
  const raiz = join(base, 'actus-saas')
  if (!existsSync(raiz)) cpSync(FX, raiz, { recursive: true })
  return triarRepo({ nome: 'actus-saas', caminho: raiz }, { modelo: criarPassoModelo(lerConfigModelo()), agora: Date.parse('2026-10-11T03:54:09Z') })
}

describe('peça 2: sem evidência, sem modelo (os 7 do Actus de 11/10)', () => {
  it('nenhum dos 7 chama o modelo nem reserva teto: o stub não roda e o ledger fica vazio', async () => {
    const rs = await triar()
    expect(rs.map((r) => r.id).sort()).toEqual(IDS)
    expect(chamadas()).toEqual([])
    expect(ledger()).toEqual({})
    for (const r of rs) expect({ id: r.id, modelo: r.diagnostico?.modelo }).toEqual({ id: r.id, modelo: { modelo: null, pulado: 'sem_tentativa' } })
    // rodar de novo (a passada de 5 em 5 min) também não
    expect((await triar()).map((r) => r.feito)).toEqual(IDS.map(() => 'mesma_assinatura'))
    expect(chamadas()).toEqual([])
    expect(ledger()).toEqual({})
  })

  it('cada um sai "bloqueado sem tentativa" (D0), com a nota do ticket de evidência', async () => {
    for (const r of await triar()) {
      const d = r.diagnostico
      expect({ id: r.id, classe: d?.classe, firme: d?.firme, regra: d?.regra, rotulo: d?.rotulo }).toEqual({ id: r.id, classe: null, firme: false, regra: 'D0', rotulo: 'bloqueado sem tentativa' })
      expect(d?.evidencia[0]).toEqual(expect.objectContaining({ arquivo: expect.stringMatching(new RegExp(`^docs/fila/${r.id}-.*\\.md$`)), trecho: expect.stringMatching(/^bloqueado \d\d\/09\/2026/) }))
    }
  })

  it('a dependência ainda não done (ou o portão humano sem liberação) aparece no remédio; a done e a liberada não', async () => {
    const rem = Object.fromEntries((await triar()).map((r) => [r.id, r.diagnostico?.remedio as string]))
    expect(rem).toEqual({
      '517a': 'bloqueado sem tentativa; espera humano:ghl-evento-oportunidade-confirmado (sem liberação): decisão humana',
      '518': 'bloqueado sem tentativa; espera 517 (pendente): decisão humana',
      '519': 'bloqueado sem tentativa; espera 517 (pendente): decisão humana',
      '520': 'bloqueado sem tentativa; espera 517 (pendente), 518 (bloqueado), 519 (bloqueado): decisão humana',
      '521': 'bloqueado sem tentativa; espera 519 (bloqueado), 520 (bloqueado): decisão humana',
      '527': 'bloqueado sem tentativa; espera humano:506-causa-corrigida (sem liberação): decisão humana',
      '532': 'bloqueado sem tentativa; espera humano:ghl-escopo-users-confirmado (sem liberação): decisão humana',
    })
  })
})
