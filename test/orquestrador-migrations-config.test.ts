/**
 * Etapa MIG-A, peça P1 · o bloco `migrations.bancos` do `~/.orq/repos.json`.
 *
 * Pronto quando:
 *   - a config real do Comarka (escritor) e do dashboard-comercial (somente
 *     leitura, fora de `.repos[]`) valida, e os dois repos agrupam no banco;
 *   - o dashboard não entra na lista de repos que o resolvedor e o painel leem;
 *   - `banco_id` repetido entre dois bancos é recusado;
 *   - erro de config tem mensagem por campo.
 */
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { comEnv } from './resolvedor-repo.js'

const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador')

type Mod = {
  validarBancos: (raiz: unknown, listados: { nome: string; caminho: string }[]) => { bancos: Record<string, unknown>[]; erros: string[] }
  lerBancos: () => { bancos: Record<string, unknown>[]; erros: string[] }
}

const COMARKA = '/Users/x/Projetos/comarka-operacional'
const LISTADOS = [
  { nome: 'conteudos-infinitos', caminho: '/Users/x/Projetos/conteudos-infinitos' },
  { nome: 'comarka-operacional', caminho: COMARKA },
]

/** A config real proposta no PASSO 0 e confirmada (E1), com os valores do Comarka. */
const real = () => ({
  bancos: {
    comarka: {
      ferramenta: 'supabase',
      banco_id: 'ogfnojbbvumujzfklkhh',
      repos: [
        {
          repo: 'comarka-operacional',
          dir: 'supabase/migrations',
          refs: ['HEAD', 'origin/staging-auto', 'origin/staging-apolo'],
          credencial_env: 'SUPABASE_ACCESS_TOKEN',
          env_arquivo: '.env.local',
          token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
          pre_check: ['python3', 'scripts/roadmap/checar-promocao.py', '--aplicar', '{arquivo}'],
        },
        { caminho: '/Users/x/Projetos/dashboard-comercial', dir: 'supabase/migrations', somente_leitura: true },
      ],
    },
  },
})

describe('P1: config por banco no repos.json', () => {
  let m: Mod | null = null
  beforeAll(async () => {
    try {
      m = (await import(pathToFileURL(join(DIR, 'migrations', 'config.ts')).href)) as Mod
    } catch {
      m = null
    }
  })

  it('a config real do Comarka e do dashboard valida e agrupa no banco', () => {
    expect(m).not.toBeNull()
    const r = m!.validarBancos(real(), LISTADOS)
    expect(r.erros).toEqual([])
    expect(r.bancos).toHaveLength(1)
    const b = r.bancos[0] as { nome: string; bancoId: string; repos: Record<string, unknown>[]; escritor: Record<string, unknown> }
    expect(b.nome).toBe('comarka')
    expect(b.bancoId).toBe('ogfnojbbvumujzfklkhh')
    expect(b.repos.map((x) => [x.nome, x.somenteLeitura])).toEqual([
      ['comarka-operacional', false],
      ['dashboard-comercial', true],
    ])
    expect(b.escritor).toEqual(
      expect.objectContaining({
        nome: 'comarka-operacional',
        caminho: COMARKA,
        refs: ['HEAD', 'origin/staging-auto', 'origin/staging-apolo'],
        credencialEnv: 'SUPABASE_ACCESS_TOKEN',
        token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
      }),
    )
    // repo só leitura não precisa de credencial nem de token
    expect(b.repos[1]).toEqual(expect.objectContaining({ credencialEnv: null, token: null, refs: ['HEAD'] }))
  })

  it('o bloco mora no topo: o dashboard não entra na lista de repos do resolvedor e do painel', async () => {
    expect(m).not.toBeNull()
    const base = mkdtempSync(join(tmpdir(), 'mig-cfg-'))
    const arq = join(base, 'repos.json')
    writeFileSync(arq, JSON.stringify({ $schema_versao: 1, repos: [{ caminho: COMARKA }], migrations: real() }, null, 2))
    const tira = comEnv({ ORQ_REPOS: arq })
    try {
      const { lerRepos } = (await import(pathToFileURL(join(DIR, 'triador', 'saida.ts')).href)) as { lerRepos: () => { nome: string }[] }
      expect(lerRepos().map((r) => r.nome)).toEqual(['comarka-operacional'])
      const r = m!.lerBancos()
      expect(r.erros).toEqual([])
      expect((r.bancos[0] as { repos: unknown[] }).repos).toHaveLength(2)
    } finally {
      tira()
    }
  })

  it('sem o bloco: nenhum banco e nenhum erro', () => {
    expect(m).not.toBeNull()
    expect(m!.validarBancos(undefined, LISTADOS)).toEqual({ bancos: [], erros: [] })
  })

  it('banco_id repetido entre dois bancos é recusado; o mesmo repo em dois bancos também', () => {
    expect(m).not.toBeNull()
    const c = real()
    const outro = { ferramenta: 'supabase', banco_id: 'ogfnojbbvumujzfklkhh', repos: [{ repo: 'conteudos-infinitos', dir: 'db', somente_leitura: true }] }
    const r = m!.validarBancos({ bancos: { ...c.bancos, dois: outro } }, LISTADOS)
    expect(r.erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.dois\.banco_id: .*ogfnojbbvumujzfklkhh.*comarka/))
    const r2 = m!.validarBancos({ bancos: { ...c.bancos, dois: { ...outro, banco_id: 'abcdefghijklmnopqrst', repos: [{ repo: 'comarka-operacional', dir: 'x', somente_leitura: true }] } } }, LISTADOS)
    expect(r2.erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.dois\.repos\[0\]: .*comarka-operacional.*comarka/))
  })

  it('erro por campo: cada falta diz o caminho e o que falta', () => {
    expect(m).not.toBeNull()
    const ruim = {
      bancos: {
        b: {
          ferramenta: 'postgres',
          banco_id: 'X!',
          repos: [
            { repo: 'nao-existe', dir: 'supabase/migrations' },
            { repo: 'comarka-operacional', dir: '../fora', token: { formato: 'outro', molde: 'migration-aplicada' } },
            { caminho: '/tmp/x', dir: 'm', refs: 'HEAD', somente_leitura: true },
            { repo: 'conteudos-infinitos', caminho: '/tmp/y', dir: 'm' },
          ],
          timeouts: { http_timeout_s: -1 },
        },
      },
    }
    const e = m!.validarBancos(ruim, LISTADOS).erros
    const tem = (re: RegExp) => expect(e).toContainEqual(expect.stringMatching(re))
    tem(/^migrations\.bancos\.b\.ferramenta: /)
    tem(/^migrations\.bancos\.b\.banco_id: /)
    tem(/^migrations\.bancos\.b\.repos\[0\]\.repo: 'nao-existe' não está em \.repos\[\]/)
    tem(/^migrations\.bancos\.b\.repos\[1\]\.dir: /)
    tem(/^migrations\.bancos\.b\.repos\[1\]\.credencial_env: /)
    tem(/^migrations\.bancos\.b\.repos\[1\]\.token\.formato: /)
    tem(/^migrations\.bancos\.b\.repos\[1\]\.token\.molde: /)
    tem(/^migrations\.bancos\.b\.repos\[2\]\.refs: /)
    tem(/^migrations\.bancos\.b\.repos\[3\]: .*repo.*caminho/)
    tem(/^migrations\.bancos\.b\.timeouts\.http_timeout_s: /)
    // dois escritores no mesmo banco
    const dois = real()
    dois.bancos.comarka.repos.push({ ...dois.bancos.comarka.repos[0]!, repo: 'conteudos-infinitos' } as never)
    expect(m!.validarBancos(dois, LISTADOS).erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.comarka\.repos: .*um repo que escreve/))
  })
})
