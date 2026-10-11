/**
 * Etapa 7f-b4, peça 2 · fatia do teto para auto.
 *
 * A prioridade da 7f-b3 (auto antes de sombra antes de diagnostico) vale
 * dentro de uma passada. Entre passadas, um repo em diagnostico com
 * assinaturas novas ainda gasta o teto do dia antes de um bloqueio de um repo
 * em auto aparecer, e o bloqueio em auto fica `teto_dia`.
 *
 * Chave nova no ~/.orq/repos.json, `teto_reserva_auto` (padrão 0.7): os repos
 * sem classe em auto (sombra e diagnostico, juntos) só gastam até
 * (1 − 0.7) = 30% do teto do dia; o resto fica para os repos em auto.
 *
 * Pronto quando: com um repo em diagnostico triado de novo a cada passada
 * (assinatura nova a cada vez), o bloqueio do Comarka (auto) que aparece
 * depois ainda chama o modelo; o repo em diagnostico parou em 30% do teto, com
 * `pulado: teto_reserva_auto`.
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
const DIA = '2026-10-11'

type Passada = (o: { agora: number }) => { itens: { repo: string; id: string }[] }

describe('peça 2: fatia do teto para auto (teto_reserva_auto)', () => {
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

  const ledger = () => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), 'utf8')) as { dias: Record<string, { repo: string; custo_usd: number | null }[]> }).dias[DIA] ?? []
  const gastoDe = (repo: string) => ledger().filter((x) => x.repo === repo).reduce((s, x) => s + (x.custo_usd ?? 0), 0)
  const modelo = (repo: string, id: string) => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, repo, `${id}.json`), 'utf8')) as { modelo: Record<string, unknown> }).modelo
  const pulado = (repo: string, id: string) => (modelo(repo, id).pulado as string | undefined) ?? `chamou US$ ${modelo(repo, id).custo_usd}`

  it('o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7)', async () => {
    // Actus em diagnostico: um bloqueio sem regra (o 243 de molde) que ganha assinatura nova a cada passada
    const actus = join(amb.base, 'actus-saas')
    cpSync(FX243, actus, { recursive: true })
    const tkActus = join(actus, 'docs/fila/243-rota-e-tela-publica-de-aprovacao.md')
    // Comarka com R1 e R5 em auto: o 559 (R4? D9) ainda não bloqueado
    const comarka = materializar(join(FX_TRI, '01-559-L55054'), join(amb.base, 'comarka-operacional'))
    const tk559 = join(comarka, 'docs/fila/559-aceite-aba-conta.md')
    writeFileSync(tk559, readFileSync(tk559, 'utf8').replace(/"status": "[^"]*"/, '"status": "pendente"'))
    amb.repos([{ caminho: actus }, { caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' } }])

    const { passada } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: Passada }
    // 18 passadas no mesmo dia; a cada uma o ticket do Actus muda (nota nova), e a triagem refaz
    for (let i = 0; i < 18; i++) {
      writeFileSync(tkActus, readFileSync(tkActus, 'utf8') + `\nnota ${i}\n`)
      passada({ agora: AGORA })
    }
    // o bloqueio do Comarka (auto) aparece
    writeFileSync(tk559, readFileSync(tk559, 'utf8').replace(/"status": "[^"]*"/, '"status": "bloqueado"'))
    const r = passada({ agora: AGORA })
    expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-operacional/559', 'actus-saas/243'])
    expect({ comarka: pulado('comarka-operacional', '559'), actus: pulado('actus-saas', '243') }).toEqual({ comarka: 'chamou US$ 0.25', actus: 'teto_reserva_auto' })
    // o diagnostico parou em 30% do teto de US$ 5,00: 4 chamadas de US$ 0,25 (a 5ª passaria de US$ 1,50 no pior caso)
    expect({ actus: gastoDe('actus-saas'), comarka: gastoDe('comarka-operacional') }).toEqual({ actus: 1, comarka: 0.25 })
  })

  it('teto_reserva_auto no repos.json: lido do topo; ausente ou inválido, 0.7', async () => {
    const { lerTetoReservaAuto } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/modos.ts')).href)) as { lerTetoReservaAuto?: () => number }
    const grava = (extra: Record<string, unknown>) => writeFileSync(amb.env.ORQ_REPOS!, JSON.stringify({ $schema_versao: 1, ...extra, repos: [] }))
    const lidos: unknown[] = []
    for (const v of [undefined, 0.5, 0, 1, 1.5, -0.1, 'x']) {
      grava(v === undefined ? {} : { teto_reserva_auto: v })
      lidos.push(lerTetoReservaAuto?.())
    }
    expect(lidos).toEqual([0.7, 0.5, 0, 1, 0.7, 0.7, 0.7])
  })
})
