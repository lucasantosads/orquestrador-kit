/**
 * Etapa 7f-b1, peça 5 · a camada do modelo, SÓ COM STUB (spec 7f-a §4).
 *
 * A sessão de etapa nunca chama API: o `claude` aqui é
 * `test/fixtures/claude-envelope/triador-stub.sh` (por `ORQ_TRIADOR_CLAUDE`),
 * e o `claude` do PATH é uma trava que registra e sai 99 (o teste reprova se
 * ela for tocada).
 *
 * Pronto quando: entrada acima de 30 mil tokens corta na ordem de §4; o prompt
 * é o literal da spec; o teto do dia impede a chamada e grava `pulado`;
 * envelope ilegível mantém a extração e grava `modelo.erro`; evidência com
 * linha inexistente é descartada; e `orq triar` roda extração + modelo e
 * imprime o resumo, uma chamada por assinatura.
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { materializar } from './triador-repo-legado.js'

const RAIZ = join(import.meta.dirname, '..')
const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const CASO = join(FX, '01-559-L55054')
const SEGREDO = 'sk-ant-api03-ZYXWVUTSRQPONMLKJIHG0987654321'

// sha256 do texto da spec 7f-a §4 (linhas 214-277), conferido na etapa contra o arquivo da spec.
const SHA_PROMPT_DA_SPEC = '3e016ee70c19d029d12be1726fcfeaca5f2a13a3608cd8e942fb66a41813b833'

type Qualquer = any // o teste só lê campos
interface Mods {
  lerCasoDeFixture: (d: string, o?: { instante?: string }) => Qualquer
  extrair: (e: Qualquer) => Qualquer
  montarEntrada: (repo: string, ev: Qualquer, ext: Qualquer, max?: number) => { prompt: string; chars: number; cortes: { secao: number; de: number; para: number }[] }
  criarPassoModelo: (cfg: Qualquer) => (ctx: Qualquer) => { registro: Qualquer; resposta?: Qualquer }
  diagnosticar: (...a: Qualquer[]) => Qualquer
  Guarda: new (extra?: string[]) => Qualquer
  PROMPT: string
  ChamadaRealRecusada: new (...a: unknown[]) => Error
}
async function carregar(): Promise<Mods | null> {
  try {
    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
    const m = { ...(await imp('leitor-legado-comarka.ts')), ...(await imp('extrair.ts')), ...(await imp('modelo.ts')), ...(await imp('triar.ts')), ...(await imp('saida.ts')) }
    return typeof m.montarEntrada === 'function' && typeof m.criarPassoModelo === 'function' ? (m as unknown as Mods) : null
  } catch {
    return null
  }
}

const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }
const hoje = () => new Date().toISOString().slice(0, 10)

let base: string
const envAntes = { ...process.env }
beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-modelo-')))
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
    STUB_ENTRADA: join(base, 'entrada.txt'),
    PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
  })
  writeFileSync(join(base, 'triador.json'), JSON.stringify(CFG))
})
afterEach(() => {
  // a trava do claude real nunca pode ter sido tocada
  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
  process.env = { ...envAntes }
})

const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
const envelope = (result: string, custo = 0.1234) =>
  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result, total_cost_usd: custo, usage: { input_tokens: 12000, output_tokens: 800 } }))

async function contexto() {
  const m = await carregar()
  if (!m) return null
  const ev = m.lerCasoDeFixture(CASO)
  const ext = m.extrair(ev)
  const guarda = new m.Guarda([FX])
  return { m, ev, ext, ctx: { ev, ext, repo: 'fixture', assinatura: 'a'.repeat(64), guarda, agora: Date.now(), copia: '' } }
}

describe('modelo do triador, com stub (peça 5)', () => {
  it('o prompt é o literal da spec §4, e a entrada preenche todos os campos', async () => {
    const c = await contexto()
    expect(c && createHash('sha256').update(c.m.PROMPT).digest('hex')).toBe(SHA_PROMPT_DA_SPEC)
    const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext)
    expect(e?.prompt.startsWith('Você é o triador de bloqueios de um orquestrador de tickets.')).toBe(true)
    expect(e?.prompt).toMatch(/Ticket 559 \(aceite-aba-conta\) do repo comarka-operacional, bloqueado em 2026-09-25T13:24:49Z pela regra do motor\n"circuit_breaker", depois de 2 tentativa\(s\)\./)
    expect(e?.prompt).not.toMatch(/\{(id|slug|repo|quando|token_do_bloqueio|n|ticket|extracao_json|recortes_vitest|criterios_falhos|diff_stats|juiz|agente)\}/)
    expect(e?.cortes).toEqual([])
  })

  it('entrada acima de 30 mil tokens corta de baixo para cima, na ordem de §4, e vai mascarada', async () => {
    const c = await contexto()
    if (c) {
      const ult = c.ev.tentativas.at(-1)
      ult.recorte_vitest.linhas = Array.from({ length: 2500 }, (_, i) => ({ n: i + 1, t: `linha de gate ${'x'.repeat(80)}` }))
      ult.agente_disse = `o agente disse ${SEGREDO}`
    }
    const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext, 30000)
    expect(e?.chars ?? Infinity).toBeLessThanOrEqual(30000 * 3.5)
    expect(e?.cortes.map((x) => x.secao)).toEqual([7, 6, 5, 4, 3])
    expect(e?.cortes.slice(0, 4).every((x) => x.para === 0)).toBe(true)
    expect(e?.cortes[4]?.para ?? 0).toBeGreaterThan(0)
    expect(e?.prompt).toContain('"criterios_aceite_que_falharam"')
    expect(e?.prompt).toContain('"palpite": "R4?"')
    // sem corte, o segredo do agente chega mascarado
    if (c) c.ev.tentativas.at(-1).recorte_vitest.linhas = c.ev.tentativas.at(-1).recorte_vitest.linhas.slice(0, 10)
    const e2 = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext, 30000)
    expect(e2?.prompt).toContain('o agente disse ‹segredo›')
    expect(e2?.prompt).not.toContain(SEGREDO)
  })

  it('o teto do dia impede a chamada e grava pulado; no limite exato ainda chama', async () => {
    const c = await contexto()
    const ledger = (gastos: number[]) => {
      mkdirSync(join(base, 'diag'), { recursive: true })
      writeFileSync(join(base, 'diag', 'custo.json'), JSON.stringify({ dias: { [hoje()]: gastos.map((g) => ({ repo: 'x', id: '1', assinatura: 'a', custo_usd: g, tokens_in: 1, tokens_out: 1 })) } }))
    }
    envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'x' }))
    // o pior caso de uma chamada é o corte do CLI (teto_corte_usd, 0,60 por padrão), não o teto do caso (7f-b1b)
    ledger([1.5, 1.0])
    const r = c?.m.criarPassoModelo(CFG)(c.ctx)
    expect(r?.registro).toEqual({ modelo: 'claude-opus-5-5', pulado: 'teto_dia' })
    expect(chamadas()).toEqual([])
    ledger([1.5, 0.9])
    c?.m.criarPassoModelo(CFG)(c.ctx)
    expect(chamadas()).toHaveLength(1)
    expect(chamadas()[0]).toMatch(/^-p --output-format json --model claude-opus-5-5 --allowedTools {2}--max-turns 1 --max-budget-usd 0\.6\t\d+$/)
    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number }[]> }
    expect(l.dias[hoje()]!.map((x) => x.custo_usd)).toEqual([1.5, 0.9, 0.1234])
  })

  it('envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido)', async () => {
    const c = await contexto()
    writeFileSync(join(base, 'resposta.json'), 'Error: conexão recusada\n')
    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
    expect([d?.classe, d?.fonte, d?.firme, d?.regra]).toEqual(['R4?', 'extracao', false, 'D9'])
    expect(d?.modelo?.erro).toMatch(/envelope ilegível/)
    expect(d?.modelo?.descartado).toEqual({ regra: 'envelope_ilegivel', trecho: 'rc 0: Error: conexão recusada' })
    expect(chamadas()).toHaveLength(1)
    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number | null }[]> }
    expect(l.dias[hoje()]).toEqual([expect.objectContaining({ id: '559', custo_usd: null })])
  })

  it('envelope do corte do CLI (error_max_budget_usd, sem result, da corrida real): o custo pago vai ao ledger e o descarte diz teto_corte_cli', async () => {
    const c = await contexto()
    const real = JSON.parse(readFileSync(join(FX, '08-635-L58105', 'resposta-modelo.json'), 'utf8')) as { modelo: { envelope_bruto: string } }
    writeFileSync(join(base, 'resposta.json'), real.modelo.envelope_bruto)
    process.env.STUB_RC = '1'
    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
    expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
    expect(d?.modelo).toMatchObject({ custo_usd: 0.31072479999999997, custo_acima_do_teto: true })
    expect(d?.modelo?.descartado).toEqual({ regra: 'teto_corte_cli', trecho: 'rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3107 e sem resposta' })
    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number | null; custo_acima_do_teto?: true }[]> }
    expect(l.dias[hoje()]).toEqual([expect.objectContaining({ custo_usd: 0.31072479999999997, custo_acima_do_teto: true })])
  })

  it('evidência com linha inexistente (ou arquivo que não foi lido) é descartada; a válida fica', async () => {
    const c = await contexto()
    const valida = c?.ext.evidencia[0]
    envelope(
      'texto antes\n' +
        JSON.stringify({
          classe: 'R3', confianca: 'media', remedio: 'decidir: abrir ticket de src para a tela de Auditoria', requeue: 'nao', justificativa: 'gap de src',
          evidencia: [valida, { arquivo: valida?.arquivo, linha: 999999, trecho: 'x' }, { arquivo: 'docs/fila/runs/inventado.txt', linha: 1, trecho: 'y' }],
        }),
    )
    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
    expect([d?.classe, d?.fonte, d?.firme, d?.confianca]).toEqual(['R3', 'modelo', false, 'media'])
    expect(d?.modelo?.evidencia_descartada).toBe(2)
    expect(d?.evidencia.map((r: { arquivo: string; linha: number }) => `${r.arquivo}:${r.linha}`)).toEqual([`${valida?.arquivo}:${valida?.linha}`])
  })

  it('resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração', async () => {
    const c = await contexto()
    for (const [result, descartado] of [
      [
        JSON.stringify({ classe: 'R3', confianca: 'alta', evidencia: [{ arquivo: 'x', linha: 1 }], remedio: 'x', requeue: 'nao', justificativa: '' }),
        { regra: 'evidencia_nenhuma_confere', trecho: 'x:1' },
      ],
      [
        JSON.stringify({ classe: 'R9', confianca: 'alta', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: '' }),
        { regra: 'resposta_sem_classe', trecho: expect.stringMatching(/^\{"classe":"R9"/) },
      ],
    ] as const) {
      envelope(result)
      const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
      expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
      expect(d?.modelo?.erro).toBeTruthy()
      expect(d?.modelo?.descartado).toEqual(descartado)
    }
    // envelope com is_error (e result): o motivo é o result
    writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'API Error: 529 overloaded', total_cost_usd: 0 }))
    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
    expect(d?.modelo?.descartado).toEqual({ regra: 'envelope_is_error', trecho: 'API Error: 529 overloaded' })
  })

  it('sem stub, sob teste, a chamada real é recusada antes de existir processo', async () => {
    const c = await contexto()
    delete process.env.ORQ_TRIADOR_CLAUDE
    let erro: unknown = null
    try {
      c?.m.criarPassoModelo(CFG)(c.ctx)
    } catch (e) {
      erro = e
    }
    expect(c && erro instanceof c.m.ChamadaRealRecusada).toBe(true)
  })

  it('orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura', async () => {
    const raiz = materializar(CASO, join(base, 'comarka-fx'))
    envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [(await contexto())?.ext.evidencia[0]], remedio: 'decidir: ticket de src', requeue: 'nao', justificativa: 'x' }))
    const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', ...a], { encoding: 'utf8', cwd: base, env: process.env })
    const r1 = orq('comarka-fx', '559')
    expect(r1.status, r1.stderr).toBe(0)
    expect(r1.stdout).toMatch(/^comarka-fx \(.*comarka-fx\) · modelo claude-opus-5-5, teto US\$ 3\.00\/dia\n559\tR3\tmodelo \(media\)\tdecidir: ticket de src\n/)
    expect(chamadas()).toHaveLength(1)
    expect(existsSync(join(raiz, '.orq'))).toBe(false)
    const r2 = orq('comarka-fx', '559')
    expect(r2.stdout).toMatch(/\n559\tmesma_assinatura\n/)
    expect(chamadas()).toHaveLength(1)
    expect(orq('comarka-fx', '559', '--forcar').status).toBe(0)
    expect(chamadas()).toHaveLength(2)
    expect(orq('comarka-fx', '559', '--passada', '--x').status).toBe(1)
  })

  // Com o pior caso no corte do CLI (0,60), a 22ª chamada de US$ 0,30 já não cabe em 6,60 (21 × 0,30 + 0,60 = 6,90),
  // e em 3,00 cabem 9 (8 × 0,30 + 0,60 = 3,00). Na corrida real os 22 couberam (custo real abaixo de 0,30 em 16).
  it('orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
    envelope(JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' }), 0.3)
    const antes = spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout
    const orq = (teto: string, ...a: string[]) =>
      spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fixture', FX, ...a], { encoding: 'utf8', env: { ...process.env, ORQ_TRIADOR_TETO_DIA: teto } })
    const r = orq('6.60')
    expect(r.status, r.stderr).toBe(0)
    expect(chamadas()).toHaveLength(21)
    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 21; custo desta corrida: US\$ 6\.3000/)
    const dir = join(base, 'diag', 'fixture-triador-7f')
    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(22)
    expect(orq('6.60').stdout).toMatch(/chamadas novas: 0;/)
    expect(chamadas()).toHaveLength(21)
    expect(spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout).toBe(antes)
    // num dia novo de ledger, com o teto padrão de US$ 3,00: 9 chamadas e 13 puladas
    writeFileSync(join(base, 'diag', 'custo.json'), '{"dias":{}}')
    const r3 = orq('3', '--forcar')
    expect(r3.stdout).toMatch(/chamadas novas: 9;/)
    expect(chamadas()).toHaveLength(30)
  })

  it('orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)', async () => {
    const d = join(FX, '21-760-L72407')
    const raiz = materializar(d, join(base, 'comarka-fx'))
    const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', raiz, '760', ...a], { encoding: 'utf8', env: process.env })
    const r1 = orq('--sem-modelo')
    expect(r1.stdout).toMatch(/\n760\tR5\?\tpalpite D7\t/)
    // o 761 fica vermelho no mesmo teste 17 min depois
    const viz = join(raiz, 'docs/fila/runs/761/attempt-1')
    mkdirSync(viz, { recursive: true })
    writeFileSync(join(viz, 'gate-vitest.txt'), ' FAIL  test/migrations-policy-idempotente.test.ts > x > y\n')
    const fim = Date.parse((JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { fim: string }).fim) / 1000 + 17 * 60
    utimesSync(join(viz, 'gate-vitest.txt'), fim, fim)
    const r2 = orq('--passada')
    expect(r2.stdout).toMatch(/\n760\tR5\tfirme D5\tconsertar a base: .* vermelho também em 761, fora do diff\t\[requeue sim_apos:base_verde:test\/migrations-policy-idempotente\.test\.ts\]\n/)
    expect(chamadas()).toEqual([])
    expect(readdirSync(join(base, 'diag', 'comarka-fx', '760', 'historico'))).toHaveLength(1)
    // a passada só mexe em palpite: firme não roda de novo
    expect(orq('--passada').stdout).toMatch(/\n760\tsem_palpite_recente\n/)
  })
})

