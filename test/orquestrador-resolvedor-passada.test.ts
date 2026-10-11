/**
 * Etapa 7f-b2, peça 2 · `orq resolver [--repo X] [--dry-run]`: uma passada.
 *
 * Pronto quando:
 *   - a decisão sai da classe e do modo (tabela de decidir.ts);
 *   - os bloqueados são tratados do que tem mais tickets esperando por ele ao
 *     que tem menos (dependência direta, fora de done/obsoleto);
 *   - cada um passa pelo triador existente (o diagnóstico fica em ORQ_DIAG_DIR);
 *   - em --dry-run nada muda no repo (arquivo, índice, commits), o ledger não
 *     nasce, e o que faria fica em dry-run.jsonl e na saída.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, repoDoCaso } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const RES = join(RAIZ, 'scripts', 'orquestrador', 'resolvedor')

interface Mods {
  decidir: (d: { classe: string | null; regra: string | null; firme: boolean; fonte?: string }, m: Record<string, string>) => { acao: string; propoe?: string }
  ordenarBloqueados: (raiz: string) => { id: string; dependentes: number }[]
  passada: (o: { repo?: string; dryRun?: boolean; semModelo?: boolean; agora?: number }) => { itens: { id: string; acao: string; feito: string; dependentes: number }[] }
}
async function carregar(): Promise<Mods | null> {
  try {
    const imp = async (f: string) => (await import(pathToFileURL(join(RES, f)).href)) as Record<string, unknown>
    const m = { ...(await imp('decidir.ts')), ...(await imp('passada.ts')) }
    return typeof m.decidir === 'function' && typeof m.passada === 'function' && typeof m.ordenarBloqueados === 'function' ? (m as unknown as Mods) : null
  } catch {
    return null
  }
}

const ticket = (id: string, status: string, deps: string[] = []) =>
  `# ${id}\n\n\`\`\`json\n${JSON.stringify({ id, slug: `t${id}`, status, notas_status: '', pathspec_allowlist: ['src/x.ts'], dependencias: deps, criterios_aceite: [] }, null, 2)}\n\`\`\`\n`

describe('peça 2: a passada', () => {
  let m: Mods | null
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  beforeAll(async () => {
    amb = ambiente()
    tira = comEnv(amb.env)
    m = await carregar()
  })
  afterAll(() => tira?.())

  it('o módulo existe', () => {
    expect(m, 'resolvedor/decidir.ts e passada.ts com decidir, ordenarBloqueados e passada').not.toBeNull()
  })

  it('decide pela classe e pelo modo', () => {
    const auto = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra', R3: 'auto' }
    const d = (classe: string | null, regra: string | null, firme: boolean, modos: Record<string, string> = auto, fonte = 'extracao') => m!.decidir({ classe, regra, firme, fonte }, modos).acao
    expect(d('R1', 'D6', true)).toBe('r1_allowlist')
    expect(d('R5', 'D1', true)).toBe('r5_reabrir')
    expect(d('R5', 'D4', true)).toBe('r5_reabrir')
    expect(d('R5', 'D5', true)).toBe('aviso')
    expect(d('R2?', 'D12', false)).toBe('r2_proposta')
    expect(d('R2', 'D12', true, { padrao: 'auto' })).toBe('r2_proposta')
    expect(d('R1?', 'D6', false)).toBe('aviso')
    expect(d('R1', 'D6', false, auto, 'modelo')).toBe('aviso')
    expect(d('R3', null, true)).toBe('aviso')
    expect(d(null, null, false, { padrao: 'auto' })).toBe('aviso')
    expect(d(null, null, false)).toBe('diagnostico')
    expect(d('R1', 'D6', true, { padrao: 'diagnostico' })).toBe('diagnostico')
    expect(d('R2?', 'D12', false, { padrao: 'diagnostico' })).toBe('diagnostico')
    expect(m!.decidir({ classe: 'R1', regra: 'D6', firme: true }, { padrao: 'sombra' })).toEqual(expect.objectContaining({ acao: 'sombra', propoe: 'r1_allowlist' }))
  })

  it('ordena os bloqueados pelo número de tickets que esperam por eles, e tria cada um', () => {
    const raiz = join(amb.base, 'ordem')
    mkdirSync(join(raiz, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(raiz, 'docs/fila/runs/local-loop.log'), '')
    const t = (nome: string, md: string) => writeFileSync(join(raiz, 'docs/fila', nome), md)
    t('101-a.md', ticket('101', 'bloqueado'))
    t('102-b.md', ticket('102', 'bloqueado'))
    t('103-c.md', ticket('103', 'bloqueado'))
    t('201-x.md', ticket('201', 'pendente', ['103']))
    t('202-y.md', ticket('202', 'pendente', ['103', '101']))
    t('203-z.md', ticket('203', 'done', ['102']))
    t('204-w.md', ticket('204', 'obsoleto', ['102']))
    expect(m!.ordenarBloqueados(raiz)).toEqual([
      { id: '103', dependentes: 2 },
      { id: '101', dependentes: 1 },
      { id: '102', dependentes: 0 },
    ])
    amb.repos([{ nome: 'ordem', caminho: raiz, resolvedor: 'auto' }])
    const r = m!.passada({ repo: 'ordem', semModelo: true })
    expect(r.itens.map((i) => i.id)).toEqual(['103', '101', '102'])
    for (const id of ['101', '102', '103']) expect(existsSync(join(amb.env.ORQ_DIAG_DIR!, 'ordem', `${id}.json`))).toBe(true)
  })

  it('--dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl', () => {
    const r = repoDoCaso(join(amb.base, 'dry'), '840', { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'comarka-dry', caminho: r.raiz, resolvedor: { R1: 'auto' } }])
    const headAntes = git(r.raiz, 'rev-parse', 'HEAD')
    const res = m!.passada({ repo: 'comarka-dry', dryRun: true })
    expect(res.itens).toEqual([expect.objectContaining({ id: '840', acao: 'r1_allowlist', feito: 'faria' })])
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
    expect(git(r.raiz, 'rev-parse', 'HEAD')).toBe(headAntes)
    expect(git(r.raiz, 'status', '--porcelain')).toBe('')
    expect(existsSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl'))).toBe(false)
    const linhas = readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'dry-run.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l) as { id: string; acao: string })
    expect(linhas.at(-1)).toEqual(expect.objectContaining({ id: '840', acao: 'r1_allowlist' }))
  })

  it('orq resolver --repo X --dry-run pela linha de comando', () => {
    const r = repoDoCaso(join(amb.base, 'cli'), '940', { nome: 'comarka-operacional' })
    amb.repos([{ nome: 'comarka-cli', caminho: r.raiz, resolvedor: { R5: 'auto' } }])
    const p = spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'resolver', '--repo', 'comarka-cli', '--dry-run'], { encoding: 'utf8', env: { ...process.env, ...amb.env } })
    expect(p.stderr).toBe('')
    expect(p.status).toBe(0)
    expect(p.stdout).toMatch(/^\[dry-run\] comarka-cli\t940\tdeps=\d+\tR5 D1 firme\tauto\tr5_reabrir\tfaria\t/m)
    expect(readFileSync(join(r.raiz, r.ticket), 'utf8')).toBe(r.antes)
  })
})
