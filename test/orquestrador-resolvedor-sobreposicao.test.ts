/**
 * Etapa 7f-b5, peça 3 · allowlist sobreposta (diagnóstico, sem firme).
 *
 * Dois tickets fora de done/obsoleto com allowlist que se sobrepõe (o mesmo
 * caminho, ou um glob de um que casa um caminho do outro), sem dependência
 * entre eles (direta ou transitiva, em qualquer sentido): a proposta é o de id
 * MAIOR passar a depender do menor (serializa). Nunca cria ciclo: com
 * qualquer caminho de dependência entre os dois, não propõe. O resolvedor só
 * registra (classe R8, regra D13, firme false, modo diagnostico): nunca
 * escreve no repo. Gabarito do brief: o par 826/866 (`917d35b`, "allowlist
 * sobreposta em [id]/page.tsx; 866 roda primeiro"). A direção é a decidida
 * no chat (o id maior espera o menor); o humano, ali, fez o contrário (o 826,
 * que já tinha reprovado, esperou o 866): a medição da etapa compara as duas.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { ambiente, comEnv } from './resolvedor-repo.js'

const RAIZ = join(import.meta.dirname, '..')
const AGORA = Date.parse('2026-10-11T18:00:00Z')

type Par = { menor: string; maior: string; arquivos: string[]; proposta: string }
interface Mod {
  sobreposicoes: (raiz: string) => Par[]
}

const ticket = (raiz: string, id: string, status: string, allow: string[], deps: string[] = []) =>
  writeFileSync(
    join(raiz, 'docs/fila', `${id}-t.md`),
    `# ${id}\n\n\`\`\`json\n${JSON.stringify({ id, slug: 't', status, notas_status: '', objetivo: 'x', pathspec_allowlist: allow, criterios_aceite: [], dependencias: deps }, null, 2)}\n\`\`\`\n`,
  )

describe('peça 3: allowlist sobreposta, só diagnóstico', () => {
  let amb: ReturnType<typeof ambiente>
  let tira: () => void
  let m: Mod
  let repo: string
  beforeAll(async () => {
    amb = ambiente()
    repo = join(amb.base, 'comarka-operacional')
    mkdirSync(join(repo, 'docs/fila/runs'), { recursive: true })
    writeFileSync(join(repo, 'docs/fila/runs/local-loop.log'), '')
    ticket(repo, '866', 'pendente', ['src/app/api/clientes/[id]/reuniao-venda/route.ts', 'src/app/dashboard/clientes/[id]/page.tsx', 'test/reuniao-venda-ficha.test.ts'])
    ticket(repo, '826', 'bloqueado', ['src/app/dashboard/clientes/[id]/page.tsx', 'src/lib/notion/x.ts'], ['801', 'humano:decisao-chave'])
    ticket(repo, '801', 'done', ['src/app/dashboard/clientes/[id]/page.tsx'])
    // já dependem (direta e transitiva): nada
    ticket(repo, '900', 'pendente', ['src/b.ts'])
    ticket(repo, '901', 'pendente', ['src/b.ts'], ['900'])
    ticket(repo, '902', 'pendente', ['src/b.ts'], ['901'])
    // o de id menor depende do maior: propor o contrário faria ciclo; nada
    ticket(repo, '910', 'pendente', ['src/c.ts'], ['911'])
    ticket(repo, '911', 'pendente', ['src/c.ts'])
    // glob de um casa o caminho do outro
    ticket(repo, '920', 'pendente', ['src/d/**'])
    ticket(repo, '921', 'pendente', ['src/d/e.ts'])
    // obsoleto e done ficam fora; sem sobreposição, nada
    ticket(repo, '930', 'obsoleto', ['src/f.ts'])
    ticket(repo, '931', 'pendente', ['src/f.ts'])
    ticket(repo, '940', 'pendente', ['src/g.ts'])
    amb.repos([{ caminho: repo, resolvedor: { padrao: 'diagnostico', R1: 'auto' } }])
    tira = comEnv(amb.env)
    try {
      m = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/sobreposicao.ts')).href)) as Mod
    } catch {
      m = { sobreposicoes: () => [] }
    }
  })
  afterAll(() => tira?.())

  it('os pares: 826/866 (o par do gabarito; a regra põe a dependência no id maior) e 920/921 (glob); nada onde já há dependência ou haveria ciclo', () => {
    expect(m.sobreposicoes(repo)).toEqual([
      { menor: '826', maior: '866', arquivos: ['src/app/dashboard/clientes/[id]/page.tsx'], proposta: 'acrescentar 826 às dependencias do 866' },
      { menor: '920', maior: '921', arquivos: ['src/d/e.ts'], proposta: 'acrescentar 920 às dependencias do 921' },
    ])
  })

  it('a passada registra cada par novo uma vez (R8 D13, firme false, diagnostico) e nunca toca o repo', async () => {
    const foto = () => readdirSync(join(repo, 'docs/fila')).filter((f) => f.endsWith('.md')).map((f) => `${f} ${statSync(join(repo, 'docs/fila', f)).mtimeMs} ${readFileSync(join(repo, 'docs/fila', f), 'utf8').length}`)
    const antes = foto()
    const { passada } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: (o: { agora: number; dryRun?: boolean; semModelo?: boolean }) => unknown }
    passada({ agora: AGORA, dryRun: true, semModelo: true })
    const led = join(amb.env.ORQ_RESOLVEDOR_DIR!, 'ledger.jsonl')
    expect(existsSync(led)).toBe(false)
    passada({ agora: AGORA, semModelo: true })
    passada({ agora: AGORA + 300_000, semModelo: true })
    const linhas = readFileSync(led, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>).filter((e) => e.tipo === 'sobreposicao')
    expect(linhas).toEqual([
      expect.objectContaining({ repo: 'comarka-operacional', id: '866', classe: 'R8', regra: 'D13', firme: false, modo: 'diagnostico', depende_de: '826', arquivos: ['src/app/dashboard/clientes/[id]/page.tsx'] }),
      expect.objectContaining({ id: '921', depende_de: '920' }),
    ])
    const snap = JSON.parse(readFileSync(join(amb.env.ORQ_RESOLVEDOR_DIR!, 'comarka-operacional', 'sobreposicoes.json'), 'utf8')) as { pares: Par[] }
    expect(snap.pares.map((p) => `${p.menor}<${p.maior}`)).toEqual(['826<866', '920<921'])
    expect(foto()).toEqual(antes)
  })
})
