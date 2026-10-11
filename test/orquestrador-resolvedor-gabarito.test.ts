/**
 * Etapa 7f-b2, peça 1 · o gabarito do resolvedor: os quatro consertos humanos
 * de 10/10 no comarka-operacional (`7787af3` e `819c49a`).
 *
 * A partir do `antes` (o ticket como o loop deixou, bloqueado), uma passada do
 * resolvedor tem de produzir:
 *   - 840 (R1, firme D6): o mesmo arquivo do commit humano. O teste vai para a
 *     allowlist, o critério que lista os arquivos permitidos ganha o mesmo
 *     caminho, a guarda de contagem entra depois da última guarda com o MESMO
 *     cmd (13 it/test, 35 expect, medidos na staging-auto), e o ticket reabre.
 *     Só a `descricao` da guarda é texto livre: ela tem de citar o arquivo e os
 *     números, e é a única linha que pode diferir;
 *   - 940 e 932 (R5 árvore suja, firme D1, com a worktree alvo limpa): o
 *     reabrir que o humano fez. O `depois` de 819c49a já é `done` porque o loop
 *     rodou depois do reabrir (merge dd94c08 às 14:50 e 4d52ef7 às 17:17,
 *     commit humano às 18:10): o resolvedor tem de mudar as MESMAS duas linhas
 *     (status e nota) para `pendente` e nota vazia, e nada mais;
 *   - 929 (R2, palpite D12): só uma proposta fora do repo, com o cmd que o
 *     humano escreveu; o ticket fica byte a byte igual.
 * Cada ação é um commit só do arquivo do ticket, com o trailer
 * `Orq-Resolvedor: <classe> <regra> <assinatura>`.
 */
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, jsonDo, linhasDiferentes, repoDoCaso, type RepoCaso } from './resolvedor-repo.js'

const RESOLVEDOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'resolvedor')

interface Item {
  id: string
  classe: string | null
  acao: string
  feito: string
  commit?: string
  proposta?: string
}
type Passada = (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { itens: Item[] }

async function carregar(): Promise<Passada | null> {
  try {
    const m = (await import(pathToFileURL(join(RESOLVEDOR, 'passada.ts')).href)) as { passada?: Passada }
    return typeof m.passada === 'function' ? m.passada : null
  } catch {
    return null
  }
}

const MODOS = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' }

describe('gabarito 7f-b2: 840, 929, 940, 932', () => {
  let passada: Passada | null
  const repos: Record<string, RepoCaso> = {}
  const itens: Record<string, Item[]> = {}
  let amb: ReturnType<typeof ambiente>
  let tira: () => void

  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    for (const id of ['840', '929', '940', '932']) repos[id] = repoDoCaso(join(amb.base, id), id, { nome: 'comarka-operacional' })
    amb.repos(Object.entries(repos).map(([id, r]) => ({ nome: `comarka-${id}`, caminho: r.raiz, resolvedor: MODOS })))
    passada = await carregar()
    if (!passada) return
    for (const id of Object.keys(repos)) itens[id] = passada({ repo: `comarka-${id}`, semModelo: true, agora: Date.parse('2026-10-11T12:00:00Z') }).itens
  }, 120_000)
  afterAll(() => tira?.())

  it('o módulo do resolvedor existe e exporta passada()', () => {
    expect(passada, 'scripts/orquestrador/resolvedor/passada.ts não existe ou não exporta passada').not.toBeNull()
  })

  it('840 (R1): o arquivo do commit humano, só a descricao da guarda é livre', () => {
    const r = repos['840']!
    const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
    const guarda = (md: string) => (jsonDo(md).criterios_aceite as { descricao: string; cmd: string }[]).find((c) => c.cmd.startsWith('f=test/nps-reacao-resposta.test.ts;'))
    const g = guarda(agora)
    expect(g, 'a guarda do teste novo na allowlist não entrou').toBeDefined()
    expect(g!.descricao).toContain('test/nps-reacao-resposta.test.ts')
    expect(g!.descricao).toMatch(/>= 13 it\(\/test\(/)
    expect(g!.descricao).toMatch(/>= 35 expect\(/)
    const semDescricao = (md: string) => md.replace(JSON.stringify(guarda(md)!.descricao), '"<descricao>"')
    expect(semDescricao(agora)).toBe(semDescricao(r.depois))
    expect(itens['840']?.find((i) => i.id === '840')?.feito).toBe('aplicado')
  })

  for (const id of ['940', '932']) {
    it(`${id} (R5 árvore suja): o reabrir humano, nas mesmas duas linhas`, () => {
      const r = repos[id]!
      const agora = readFileSync(join(r.raiz, r.ticket), 'utf8')
      expect(linhasDiferentes(r.antes, agora)).toEqual(linhasDiferentes(r.antes, r.depois))
      const j = jsonDo(agora)
      expect(j.status).toBe('pendente')
      expect(j.notas_status).toBe('')
      expect({ ...j, status: 'x', notas_status: 'x' }).toEqual({ ...jsonDo(r.antes), status: 'x', notas_status: 'x' })
    })
  }

  for (const [id, classe, regra] of [
    ['840', 'R1', 'D6'],
    ['940', 'R5', 'D1'],
    ['932', 'R5', 'D1'],
  ] as const) {
    it(`${id}: um commit só do arquivo do ticket, com o trailer ${classe} ${regra}`, () => {
      const r = repos[id]!
      expect(git(r.raiz, 'show', '--name-only', '--format=', 'HEAD').trim()).toBe(r.ticket)
      expect(git(r.raiz, 'log', '-1', '--format=%B')).toMatch(new RegExp(`^Orq-Resolvedor: ${classe} ${regra} [0-9a-f]{64}$`, 'm'))
      expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('2')
      expect(git(r.raiz, 'status', '--porcelain', '--', r.ticket)).toBe('')
    })
  }

  it('929 (R2): só a proposta, com o cmd do humano; o ticket e o git intocados', () => {
    const r = repos['929']!
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-list', '--count', 'HEAD').trim()).toBe('1')
    const p = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'comarka-929', '929', 'proposta.md')
    expect(existsSync(p), `sem ${p}`).toBe(true)
    const humano = (jsonDo(r.depois).criterios_aceite as { cmd: string }[])[12]!.cmd
    expect(readFileSync(p, 'utf8')).toContain(humano)
    expect(itens['929']?.find((i) => i.id === '929')?.feito).toBe('proposto')
  })
})
