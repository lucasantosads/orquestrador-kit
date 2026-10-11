/**
 * Etapa 7f-b3, peça 3 · custo real sempre.
 *
 * Em 11/10/2026 o `claude` não estava no PATH do job do launchd: a chamada do
 * 243 (conteudos-infinitos, 4 tentativas, sem regra) nem começou (rc 127,
 * 0 ms, stdout vazio), e o ledger ganhou `custo_usd: null`, que o teto do dia
 * contava como o pior caso (US$ 0,60). Com os 7 do Actus (peça 2), 8 × 0,60 =
 * US$ 4,80 de teto consumido sem um centavo gasto, e o 1006 do Comarka foi
 * pulado por `teto_dia`.
 *
 * Pronto quando (stub, nunca API): toda chamada registra o custo real, também
 * no erro; a reserva do pior caso existe só DURANTE a chamada e é devolvida
 * quando a chamada não aconteceu; o teto do dia conta só o gasto real (e a
 * reserva de chamada que começou e não devolveu custo, o único limite honesto).
 */
import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }
const AGORA = Date.parse('2026-10-11T03:54:09Z')

let base: string
const envAntes = { ...process.env }
beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-custo-real-')))
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
  envelope(0.25)
})
afterEach(() => {
  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
  process.env = { ...envAntes }
})

function envelope(custo: number | null, extra: Record<string, unknown> = {}) {
  const r = JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, ...(custo === null ? {} : { total_cost_usd: custo }), usage: { input_tokens: 10, output_tokens: 1 }, ...extra }))
}
const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
const ledgerHoje = () =>
  existsSync(join(base, 'diag', 'custo.json')) ? ((JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, any[]> }).dias['2026-10-11'] ?? []) : []

async function mods() {
  const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
  return { ...(await imp('modelo.ts')), ...(await imp('saida.ts')), ...(await imp('triar.ts')), ...(await imp('leitor.ts')), ...(await imp('extrair.ts')) }
}

/** O passo do modelo sobre o 243, como a passada de 11/10 o chamou. */
async function passo243(cfg: Record<string, unknown> = CFG) {
  const m = await mods()
  const raiz = join(base, 'conteudos-infinitos')
  if (!existsSync(raiz)) cpSync(FX243, raiz, { recursive: true })
  const ev = m.lerRepo(raiz, '243')
  const ext = m.extrair(ev)
  const guarda = new m.Guarda([raiz])
  const ctx = { ev, ext, repo: 'conteudos-infinitos', assinatura: m.assinatura(ev), guarda, agora: AGORA, copia: '' }
  const passo = m.criarPassoModelo({ ...m.lerConfigModelo(), ...cfg })
  return { m, ctx, guarda, chama: () => passo(ctx), gasto: () => m.gastoDoDia(guarda, AGORA, 0.6) as number }
}

describe('peça 3: custo real sempre', () => {
  it('o 243 de 11/10: claude fora do PATH (a chamada nem começa) não fica no ledger nem no teto', async () => {
    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
    const p = await passo243()
    expect(p.ctx.ext.classe).toBeNull()
    const r = p.chama()
    expect(r.registro).toEqual(expect.objectContaining({ erro: expect.stringMatching(/^claude não iniciou \(ENOENT\)/), descartado: expect.objectContaining({ regra: 'nao_iniciou' }) }))
    expect(ledgerHoje()).toEqual([])
    expect(p.gasto()).toBe(0)
  })

  it('8 chamadas que não começam (os 8 de 11/10) não consomem o teto: a 9ª, de verdade, sai', async () => {
    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
    const p = await passo243()
    for (let i = 0; i < 8; i++) p.chama()
    expect(ledgerHoje()).toEqual([])
    process.env.ORQ_TRIADOR_CLAUDE = STUB
    const r = p.chama()
    expect(r.registro.pulado).toBeUndefined()
    expect(chamadas()).toHaveLength(1)
    expect(ledgerHoje()).toEqual([expect.objectContaining({ repo: 'conteudos-infinitos', id: '243', custo_usd: 0.25 })])
    expect(p.gasto()).toBeCloseTo(0.25, 6)
  })

  it('a reserva do pior caso existe só durante a chamada; depois vira o custo real', async () => {
    // um stub que, no meio da chamada, guarda o ledger como estava
    const visto = join(base, 'ledger-durante.json')
    const stub = join(base, 'stub-ledger.sh')
    writeFileSync(stub, `#!/usr/bin/env bash\ncat > /dev/null\ncp "${join(base, 'diag', 'custo.json')}" "${visto}" 2>/dev/null || echo '{}' > "${visto}"\ncat "${join(base, 'resposta.json')}"\n`)
    chmodSync(stub, 0o755)
    process.env.ORQ_TRIADOR_CLAUDE = stub
    const p = await passo243()
    p.chama()
    const durante = (JSON.parse(readFileSync(visto, 'utf8')) as { dias?: Record<string, any[]> }).dias?.['2026-10-11'] ?? []
    expect(durante).toEqual([expect.objectContaining({ id: '243', custo_usd: null, reserva: true })])
    expect(ledgerHoje()).toEqual([{ repo: 'conteudos-infinitos', id: '243', assinatura: p.ctx.assinatura, custo_usd: 0.25, tokens_in: 10, tokens_out: 1 }])
  })

  it('custo real também no erro: corte do CLI e is_error registram o total_cost_usd do envelope', async () => {
    const p = await passo243()
    writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'error_max_budget_usd', is_error: true, total_cost_usd: 0.41, errors: ['budget'], usage: { input_tokens: 9, output_tokens: 2 } }))
    expect(p.chama().registro.descartado.regra).toBe('teto_corte_cli')
    envelope(0.07, { is_error: true, result: 'falhou' })
    expect(p.chama().registro.descartado.regra).toBe('envelope_is_error')
    expect(ledgerHoje().map((x) => x.custo_usd)).toEqual([0.41, 0.07])
    expect(p.gasto()).toBeCloseTo(0.48, 6)
  })

  it('chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida', async () => {
    const lento = join(base, 'stub-lento.sh')
    writeFileSync(lento, '#!/usr/bin/env bash\ncat > /dev/null\nsleep 5\n')
    chmodSync(lento, 0o755)
    process.env.ORQ_TRIADOR_CLAUDE = lento
    const p = await passo243({ ...CFG, timeout_secs: 1 })
    p.chama()
    expect(ledgerHoje()).toEqual([expect.objectContaining({ id: '243', custo_usd: null, custo_desconhecido: true })])
    expect(ledgerHoje()[0].reserva).toBeUndefined()
    expect(p.gasto()).toBeCloseTo(0.6, 6)
  })

  it('a chamada recusada sob teste (sem stub) devolve a reserva', async () => {
    delete process.env.ORQ_TRIADOR_CLAUDE
    const p = await passo243()
    expect(() => p.chama()).toThrow(/claude real recusado sob teste/)
    expect(ledgerHoje()).toEqual([])
  })

  it('o teto do dia só conta gasto real: 3 chamadas de US$ 0,25 e 5 que não começaram somam US$ 0,75', async () => {
    const p = await passo243()
    for (let i = 0; i < 3; i++) p.chama()
    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
    for (let i = 0; i < 5; i++) p.chama()
    expect(p.gasto()).toBeCloseTo(0.75, 6)
    expect(ledgerHoje()).toHaveLength(3)
  })
})
