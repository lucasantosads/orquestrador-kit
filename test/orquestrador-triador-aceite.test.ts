/**
 * Etapa 7f · aceite do triador de bloqueios (spec 7f-a §7.2), sobre a fixture
 * dos 37 bloqueios da medição de 09/10, dos 20 de controle e dos 5 de série
 * cortada.
 *
 *   (A) só extração: os 7 R5 e R6 saem com classe firme certa e ao menos uma
 *       evidência igual a uma do esperado.json (mesmo arquivo; linha a ±3 no
 *       original), com `vizinhos.tsv` inteiro (o estado depois da passada G3).
 *       Com só os vizinhos de antes do bloqueio, 760 e 898 #31 saem `R5?`, não
 *       firmes. O teste fixa os dois instantes.
 *   (B) zero firme errado nos 37, e os firmes certos são os 16 da spec §3.3
 *       menos o 346d: com a restrição da D6 (7f-b1-7, decisão do chat do
 *       programa), R1 só é firme com o mesmo vermelho fora da allowlist em ≥ 2
 *       tentativas; o 346d tem uma só e vira `R1?`. Ficam 15.
 *   (controle) nenhum dos 20 sai firme.
 *   (cortados) nenhum dos 5 de série cortada sai firme: com a D6 da spec os 5
 *       saíam R1 firme, e errado (o agente resolveu o vermelho no retry).
 *   (C) extração + modelo, por replay de `resposta-modelo.json`: peça 6, que
 *       não é da 7f-b1 (a sessão não chama modelo).
 *
 * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
 * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
 * de import quebrado.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, it } from 'vitest'

const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/

interface Ref {
  arquivo: string
  linha: number | null
}
interface Extracao {
  classe: string | null
  firme: boolean
  regra: string | null
  evidencia: Ref[]
}
interface Esperado {
  classe: string | null
  evidencia?: Ref[]
}
type Instante = 'bloqueio' | 'passada'
interface Triador {
  lerCasoDeFixture: (dir: string, opts?: { instante?: Instante }) => unknown
  extrair: (ev: never) => Extracao
}

async function carregar(): Promise<Triador | null> {
  try {
    const leitor = (await import(pathToFileURL(join(TRIADOR, 'leitor-legado-comarka.ts')).href)) as Partial<Triador>
    const extrator = (await import(pathToFileURL(join(TRIADOR, 'extrair.ts')).href)) as Partial<Triador>
    if (!leitor.lerCasoDeFixture || !extrator.extrair) return null
    return { lerCasoDeFixture: leitor.lerCasoDeFixture, extrair: extrator.extrair }
  } catch {
    return null
  }
}

const SEM_DIAGNOSTICO: Extracao = { classe: null, firme: false, regra: null, evidencia: [] }
const nomes = (sub = '') =>
  existsSync(join(FX, sub)) ? readdirSync(join(FX, sub)).filter((d) => CASO_RE.test(d)).sort() : []

async function triarTodos(sub: string, instante: Instante): Promise<Map<string, Extracao>> {
  const t = await carregar()
  const out = new Map<string, Extracao>()
  for (const nome of nomes(sub)) {
    if (!t) {
      out.set(nome, SEM_DIAGNOSTICO)
      continue
    }
    out.set(nome, t.extrair(t.lerCasoDeFixture(join(FX, sub, nome), { instante }) as never))
  }
  return out
}

function esperado(nome: string): Esperado {
  return JSON.parse(readFileSync(join(FX, nome, 'esperado.json'), 'utf8')) as Esperado
}

/** Mesmo arquivo; linha a ±3 (linha nula no esperado casa qualquer linha do arquivo). */
function evidenciaCasa(dada: Ref[], esp: Ref[]): boolean {
  return dada.some((d) =>
    esp.some((e) => e.arquivo === d.arquivo && (e.linha === null || (d.linha !== null && Math.abs(d.linha - e.linha) <= 3))),
  )
}

// Spec §3.3: os 16 firmes e certos, menos o 346d (D6 com ≥ 2 tentativas, 7f-b1-7).
const FIRMES_DA_SPEC = [
  '07-627j-L57368', '11-689-L65280', '15-722-L67970', '17-715-L68793',
  '22-762-L72665', '23-856-L73817', '26-711b3-L78647', '35-950-L85145',
  '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272',
  '16-723-L68736',
].sort()
const R5_R6 = ['16-723-L68736', '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272']

describe('aceite do triador (spec 7f-a §7.2)', () => {
  it('(A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada)', async () => {
    const r = await triarTodos('', 'passada')
    const placar = R5_R6.map((nome) => {
      const x = r.get(nome) ?? SEM_DIAGNOSTICO
      const e = esperado(nome)
      return { nome, classe: x.classe, firme: x.firme, certa: x.classe === e.classe, evidencia: evidenciaCasa(x.evidencia, e.evidencia ?? []) }
    })
    expect(placar.filter((p) => p.firme && p.certa && p.evidencia).map((p) => p.nome), JSON.stringify(placar)).toEqual(R5_R6)
  })

  it('(A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)', async () => {
    const r = await triarTodos('', 'bloqueio')
    for (const nome of ['21-760-L72407', '31-898-L82594']) {
      expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.firme }).toEqual({ nome, classe: 'R5?', firme: false })
    }
    const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
    expect(firmes).toHaveLength(13)
  })

  it('(B) zero firme errado nos 37, e os firmes certos são os 15 (16 da spec menos o 346d)', async () => {
    const r = await triarTodos('', 'passada')
    const firmes = [...r].filter(([, x]) => x.firme)
    const errados = firmes.filter(([n, x]) => x.classe !== esperado(n).classe).map(([n, x]) => `${n}=${x.classe}`)
    expect(errados).toEqual([])
    expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
    expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13-346d-L66187')?.firme }).toEqual({ classe: 'R1?', firme: false })
  })

  it('(controle) nenhum dos 20 done sai firme, nos dois instantes', async () => {
    for (const instante of ['bloqueio', 'passada'] as const) {
      const r = await triarTodos('controle', instante)
      expect(r.size).toBe(20)
      expect([...r].filter(([, x]) => x.firme).map(([n, x]) => `${n}=${x.classe}`)).toEqual([])
    }
  })

  it('(cortados) nenhum dos 5 de série cortada sai firme, nos dois instantes (D6 pede o vermelho em ≥ 2 tentativas)', async () => {
    for (const instante of ['bloqueio', 'passada'] as const) {
      const r = await triarTodos('cortados', instante)
      expect(r.size).toBe(5)
      expect([...r].filter(([, x]) => x.firme).map(([n, x]) => `${n}=${x.classe}`)).toEqual([])
    }
  })

  it.todo('(C) extração + modelo ≥ 30/37 por replay de resposta-modelo.json (peça 6, fora da 7f-b1)')
})
