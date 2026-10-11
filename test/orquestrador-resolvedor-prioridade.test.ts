/**
 * Etapa 7f-b3, peça 4 · teto por prioridade.
 *
 * Em 11/10 o teto do dia foi consumido por repos em modo diagnostico (Actus,
 * conteudos-infinitos) e o 1006 do Comarka, em auto para R1, foi pulado por
 * `teto_dia`. Na passada, o consumo do teto segue o modo do repo: os que têm
 * alguma classe em auto vêm antes dos que têm alguma em sombra, que vêm antes
 * dos só em diagnostico (empate: a ordem do repos.json).
 *
 * Pronto quando: com o teto quase cheio (US$ 4,30 de US$ 5,00 gastos, cada
 * chamada reserva US$ 0,60), o bloqueio do Comarka (auto) chama o modelo e o
 * do Actus (diagnostico), listado ANTES no repos.json, fica pulado.
 */
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv, FX_TRI } from './resolvedor-repo.js'
import { materializar } from './triador-repo-legado.js'

const RAIZ = join(import.meta.dirname, '..')
const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
const AGORA = Date.parse('2026-10-11T15:20:15Z')

describe('peça 4: teto por prioridade (auto, depois sombra, depois diagnostico)', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  beforeAll(() => {
    amb = ambiente()
    const trava = join(amb.base, 'trava')
    mkdirSync(trava)
    writeFileSync(join(trava, 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(amb.base, 'trava.log')}"\nexit 99\n`)
    chmodSync(join(trava, 'claude'), 0o755)
    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
    writeFileSync(amb.env.ORQ_TRIADOR_CONFIG!, JSON.stringify({ modelo: 'claude-opus-5-5', teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }))
    tira = comEnv({
      ...amb.env,
      ORQ_TRIADOR_CLAUDE: STUB,
      STUB_LOG: join(amb.base, 'stub.log'),
      STUB_RESPOSTA: join(amb.base, 'resposta.json'),
      ORQ_RESOLVEDOR_TETO_DIA: '5',
      PATH: `${trava}:${process.env.PATH}`,
    })
  })
  afterAll(() => {
    expect(existsSync(join(amb.base, 'trava.log')) ? readFileSync(join(amb.base, 'trava.log'), 'utf8') : '').toBe('')
    tira?.()
  })

  it('com o teto quase cheio, o Comarka (auto) chama o modelo e o Actus (diagnostico), listado antes, fica pulado', async () => {
    // Actus: um repo do kit com um bloqueio de 4 tentativas e sem regra (o 243 serve de molde)
    const actus = join(amb.base, 'actus-saas')
    cpSync(FX243, actus, { recursive: true })
    // Comarka: um bloqueio em palpite (559, R4? D9) no legado
    const comarka = materializar(join(FX_TRI, '01-559-L55054'), join(amb.base, 'comarka-operacional'))
    const tk = join(comarka, 'docs/fila/559-aceite-aba-conta.md')
    writeFileSync(tk, readFileSync(tk, 'utf8').replace(/"status": "[^"]*"/, '"status": "bloqueado"'))
    amb.repos([{ caminho: actus }, { caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' } }])
    // US$ 4,30 já gastos hoje (real)
    writeFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), JSON.stringify({ dias: { '2026-10-11': [{ repo: 'x', id: 'x', assinatura: 'x', custo_usd: 4.3, tokens_in: 1, tokens_out: 1 }] } }))

    const { passada } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: (o: { agora: number }) => { itens: { repo: string; id: string }[] } }
    const r = passada({ agora: AGORA })
    const modelo = (repo: string, id: string) => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, repo, `${id}.json`), 'utf8')) as { modelo: Record<string, unknown> }).modelo
    const pulado = (repo: string, id: string) => (modelo(repo, id).pulado as string | undefined) ?? `chamou US$ ${modelo(repo, id).custo_usd}`
    expect({ comarka: pulado('comarka-operacional', '559'), actus: pulado('actus-saas', '243') }).toEqual({ comarka: 'chamou US$ 0.25', actus: 'teto_dia' })
    expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-operacional/559', 'actus-saas/243'])
    expect(readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n').filter(Boolean)).toHaveLength(1)
  })

  it('a ordem dos repos: auto antes de sombra antes de diagnostico; empate na ordem do repos.json', async () => {
    const { ordenarRepos } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { ordenarRepos?: (r: { nome: string; modos: Record<string, string> }[]) => { nome: string }[] }
    const rs = [
      { nome: 'd1', modos: { padrao: 'diagnostico' } },
      { nome: 's1', modos: { padrao: 'diagnostico', R2: 'sombra' } },
      { nome: 'a1', modos: { padrao: 'diagnostico', R1: 'auto' } },
      { nome: 'd2', modos: { padrao: 'diagnostico' } },
      { nome: 'a2', modos: { padrao: 'auto' } },
    ]
    expect(ordenarRepos?.(rs).map((r) => r.nome)).toEqual(['a1', 'a2', 's1', 'd1', 'd2'])
  })
})
