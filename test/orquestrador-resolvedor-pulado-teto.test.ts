/**
 * Etapa 7f-b5, peça 1 · diagnóstico pulado pelo teto volta ao modelo no dia seguinte.
 *
 * Diagnóstico gravado com `modelo.pulado = teto_dia` tem a mesma assinatura no
 * dia seguinte e, até a 7f-b4, nunca mais era triado: o ticket ficava sem o
 * modelo até mudar (o 243 do conteudos-infinitos em 11/10).
 *
 * Pronto quando: pulado ontem é triado hoje (uma chamada); pulado hoje não é
 * triado de novo hoje, mesmo com o teto livre; e o refazer é uma vez por dia,
 * nunca mais que isso (pulado de novo hoje: só amanhã).
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
const D1 = Date.parse('2026-10-11T15:20:15Z')
const D1_TARDE = Date.parse('2026-10-11T23:50:00Z')
const D2 = Date.parse('2026-10-12T00:10:00Z')
const D2_TARDE = Date.parse('2026-10-12T18:00:00Z')
const D3 = Date.parse('2026-10-13T09:00:00Z')

type Passada = (o: { agora: number }) => { itens: { repo: string; id: string }[] }

describe('peça 1: pulado pelo teto do dia volta ao modelo uma vez por dia', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let passada: Passada
  beforeAll(async () => {
    amb = ambiente()
    const trava = join(amb.base, 'trava')
    mkdirSync(trava)
    writeFileSync(join(trava, 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(amb.base, 'trava.log')}"\nexit 99\n`)
    chmodSync(join(trava, 'claude'), 0o755)
    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
    writeFileSync(amb.env.ORQ_TRIADOR_CONFIG!, JSON.stringify({ modelo: 'claude-opus-5-5', teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }))
    const actus = join(amb.base, 'actus-saas')
    cpSync(FX243, actus, { recursive: true })
    // em auto: a fatia do teto (7f-b4) não entra no caminho, só o teto do dia
    amb.repos([{ caminho: actus, resolvedor: 'auto' }])
    tira = comEnv({
      ...amb.env,
      ORQ_TRIADOR_CLAUDE: STUB,
      STUB_LOG: join(amb.base, 'stub.log'),
      STUB_RESPOSTA: join(amb.base, 'resposta.json'),
      PATH: `${trava}:${process.env.PATH}`,
    })
    passada = ((await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }).passada
  })
  afterAll(() => {
    expect(existsSync(join(amb.base, 'trava.log')) ? readFileSync(join(amb.base, 'trava.log'), 'utf8') : '').toBe('')
    tira?.()
  })

  const chamadas = () => (existsSync(join(amb.base, 'stub.log')) ? readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n').filter(Boolean).length : 0)
  const diag = () => JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'actus-saas', '243.json'), 'utf8')) as { gerado_em: string; assinatura: string; modelo: Record<string, unknown> | null }
  const rodar = (agora: number, teto: string) => {
    process.env.ORQ_RESOLVEDOR_TETO_DIA = teto
    passada({ agora })
  }

  it('pulado hoje: não é triado de novo hoje, mesmo com o teto livre', () => {
    rodar(D1, '0')
    expect(diag().modelo).toMatchObject({ pulado: 'teto_dia' })
    const assin = diag().assinatura
    rodar(D1_TARDE, '5')
    expect(chamadas()).toBe(0)
    expect(diag()).toMatchObject({ assinatura: assin, gerado_em: '2026-10-11T15:20:15Z', modelo: { pulado: 'teto_dia' } })
  })

  it('pulado ontem e o teto ainda cheio hoje: triado uma vez hoje (pulado de novo), e não de novo hoje', () => {
    rodar(D2, '0')
    expect(chamadas()).toBe(0)
    expect(diag()).toMatchObject({ gerado_em: '2026-10-12T00:10:00Z', modelo: { pulado: 'teto_dia' } })
    rodar(D2_TARDE, '5')
    expect(chamadas()).toBe(0)
    expect(diag().gerado_em).toBe('2026-10-12T00:10:00Z')
  })

  it('pulado ontem, teto livre hoje: triado hoje com o modelo, uma chamada; e nunca mais com a mesma assinatura', () => {
    rodar(D3, '5')
    expect(chamadas()).toBe(1)
    expect(diag().modelo).toMatchObject({ modelo: 'claude-opus-5-5', custo_usd: 0.25 })
    rodar(D3 + 3600_000, '5')
    rodar(D3 + 86_400_000, '5')
    expect(chamadas()).toBe(1)
  })
})
