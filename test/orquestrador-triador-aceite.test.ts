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
 *   (C) extração + modelo, por REPLAY (7f-b1b): as 22 `resposta-modelo.json`
 *       da corrida real da peça 6 (10/10, `~/.orq/corrida-7f-peca6/`) estão
 *       copiadas em `<caso>/resposta-modelo.json`. O `claude` é o stub, que
 *       devolve o `envelope_bruto` gravado (com o rc da corrida), e o envelope
 *       passa pelo parser, pela conferência da evidência e pelo ledger de
 *       verdade. Nenhuma chamada de API.
 *
 * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
 * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
 * de import quebrado.
 */
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

})

// ─── (C) replay da corrida real da peça 6 ────────────────────────────────────

const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
// a corrida da peça 6: `orq triar --fixture` com ORQ_TRIADOR_TETO_DIA=6.60, em 2026-10-11 (UTC)
const AGORA_PECA6 = Date.parse('2026-10-11T00:20:45Z')
const CFG_PECA6 = { modelo: 'claude-opus-5-5', teto_dia_usd: 6.6, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }

// `~/orq-sessoes/corrida-7f-peca6.txt`, a saída crua da corrida real (21/37).
const PLACAR_PECA6 = [
  "01-559-L55054\tesperado R3\textração R4? (D9)\tfinal R4 [modelo]\terrado\tUS$ 0.2862",
  "02-559-L55209\tesperado R4\textração R4? (D9)\tfinal R4 [modelo]\tCERTO\tUS$ 0.2614",
  "03-627-L55356\tesperado R2\textração R4? (D9)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2516",
  "04-600-L55898\tesperado R4\textração R4? (D9)\tfinal R4 [modelo]\tCERTO\tUS$ 0.2997",
  "05-627b-L56021\tesperado R2\textração R1|R2? (D11)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2913",
  "06-549c-L57053\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2497",
  "07-627j-L57368\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "08-635-L58105\tesperado R3\textração R5? (D7)\tfinal R5? [extracao]\terrado\t",
  "09-654-L59896\tesperado R1\textração R1|R2? (D11)\tfinal R1 [modelo]\tCERTO\tUS$ 0.2857",
  "10-407a-L64280\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2858",
  "11-689-L65280\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "12-691-L65374\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.1757",
  "13-346d-L66187\tesperado R1\textração R1? (D6)\tfinal R1 [modelo]\tclasse certa, evidência fora\tUS$ 0.2424",
  "14-407a-L67585\tesperado R2\textração R1|R2? (D11)\tfinal R1|R2? [extracao]\terrado\t",
  "15-722-L67970\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "16-723-L68736\tesperado R6\textração R6 (D2)\tfinal R6 [extracao]\tCERTO\t",
  "17-715-L68793\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "18-737-L69920\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2645",
  "19-739-L71699\tesperado R3\textração R1? (D8)\tfinal R2 [modelo]\terrado\tUS$ 0.2391",
  "20-801-L72121\tesperado R5\textração R5 (D4)\tfinal R5 [extracao]\tCERTO\t",
  "21-760-L72407\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
  "22-762-L72665\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "23-856-L73817\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "24-867-L76790\tesperado R3\textração R2? (D12)\tfinal R3 [modelo]\tclasse certa, evidência fora\tUS$ 0.2656",
  "25-711a-L78138\tesperado R1\textração R1|R2? (D11)\tfinal R1|R2? [extracao]\terrado\t",
  "26-711b3-L78647\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tclasse certa, evidência fora\t",
  "27-741-L79081\tesperado R4\textração R2? (D12)\tfinal R4 [modelo]\tclasse certa, evidência fora\tUS$ 0.2395",
  "28-707-L79202\tesperado R7\textração R4? (D9)\tfinal R4? [extracao]\terrado\t",
  "29-826-L80362\tesperado R3\textração - (-)\tfinal - [extracao]\terrado\t",
  "30-900-L81564\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2422",
  "31-898-L82594\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
  "32-741a-L82726\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
  "33-707-L83026\tesperado R4\textração R4? (D9)\tfinal R4? [extracao]\terrado\t",
  "34-898-L83625\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2572",
  "35-950-L85145\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
  "36-940-L85222\tesperado R5\textração R5 (D1)\tfinal R5 [extracao]\tCERTO\t",
  "37-932-L85272\tesperado R5\textração R5 (D1)\tfinal R5 [extracao]\tCERTO\t",
  "-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 4.1376",
].join('\n')

// os 6 que saíram [extracao] na corrida real sem o motivo no placar
const DESCARTADOS_PECA6 = ['08-635-L58105', '14-407a-L67585', '25-711a-L78138', '28-707-L79202', '29-826-L80362', '33-707-L83026']
const classes = (texto: string) =>
  texto
    .split('\n')
    .slice(0, -1)
    .map((l) => l.split('\t'))
    .map(([caso, esp, ext, final, veredito]) => [caso, esp, ext, final?.replace(/ \[.*$/, ''), veredito])

interface Gravada {
  caso: string
  assinatura: string
  modelo: { envelope_bruto?: string; erro?: string }
}
interface Replay {
  texto: string
  linhas: { caso: string; esperado: string | null; final: string | null; fonte: string; certo: boolean; evidencia_certa: boolean }[]
  diags: Map<string, { classe: string | null; fonte: string; evidencia: Ref[]; modelo: Record<string, unknown> | null }>
  gravadas: number
  assinaturas_velhas: string[]
}

let base = ''
const envAntes = { ...process.env }

async function replay(): Promise<Replay | null> {
  try {
    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
    const { corridaFixture, placar } = await imp('corrida.ts')
    const { criarPassoModelo } = await imp('modelo.ts')
    // cada replay num ORQ_DIAG_DIR novo: o ledger de um não pesa no teto do outro
    const diag = mkdtempSync(join(base, 'diag-'))
    process.env.ORQ_DIAG_DIR = diag
    const passo = criarPassoModelo(CFG_PECA6)
    let gravadas = 0
    const velhas: string[] = []
    const modelo = (ctx: { ev: { id: string }; assinatura: string }) => {
      const f = join(FX, ctx.ev.id, 'resposta-modelo.json')
      if (!existsSync(f)) return { registro: { modelo: null, pulado: 'sem_replay' } }
      const g = JSON.parse(readFileSync(f, 'utf8')) as Gravada
      if (g.assinatura !== ctx.assinatura) velhas.push(ctx.ev.id)
      gravadas++
      writeFileSync(join(base, 'resposta.json'), g.modelo.envelope_bruto ?? '')
      process.env.STUB_RC = /\(rc (\d+)\)/.exec(g.modelo.erro ?? '')?.[1] ?? '0'
      return passo(ctx)
    }
    const linhas = corridaFixture(FX, { modelo, agora: AGORA_PECA6, forcar: true })
    const diags = new Map<string, any>()
    for (const l of linhas) diags.set(l.caso, JSON.parse(readFileSync(join(diag, 'fixture-triador-7f', `${l.caso}.json`), 'utf8')))
    return { texto: placar(linhas), linhas, diags, gravadas, assinaturas_velhas: velhas }
  } catch (e) {
    return null
  }
}

describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)', () => {
  beforeAll(() => {
    base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-replay-')))
    mkdirSync(join(base, 'trava'))
    writeFileSync(join(base, 'trava', 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(base, 'trava.log')}"\nexit 99\n`)
    chmodSync(join(base, 'trava', 'claude'), 0o755)
    Object.assign(process.env, {
      ORQ_REPOS: join(base, 'repos.json'),
      ORQ_TRIADOR_CLAUDE: STUB,
      STUB_LOG: join(base, 'stub.log'),
      STUB_RESPOSTA: join(base, 'resposta.json'),
      PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
    })
  })
  afterAll(() => {
    // a trava do claude real nunca pode ter sido tocada
    expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
    process.env = { ...envAntes }
  })

  it('(C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37', async () => {
    const r = await replay()
    expect({ gravadas: r?.gravadas, velhas: r?.assinaturas_velhas }).toEqual({ gravadas: 22, velhas: [] })
    // caso, esperado, extração, classe final e veredito de cada linha; a fonte
    // dos descartados e o custo mudam nas peças 2 e 3 (testes abaixo)
    expect(classes(r?.texto ?? '')).toEqual(classes(PLACAR_PECA6))
    expect(r?.texto.split('\n').at(-1)).toMatch(/^-- \(C\) classe e evidência certas: 21\/37 \(aceite: >= 30\); chamadas novas: 22;/)
  })

  it('(C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar', async () => {
    const r = await replay()
    const descartados = [...(r?.diags ?? [])].filter(([, d]) => d.modelo && !d.modelo.pulado && d.fonte !== 'modelo').map(([c]) => c)
    expect(descartados).toEqual(DESCARTADOS_PECA6)
    for (const c of DESCARTADOS_PECA6) {
      const d = r?.diags.get(c)?.modelo?.descartado as { regra?: string; trecho?: string } | undefined
      expect({ c, regra: typeof d?.regra, trecho: !!d?.trecho }).toEqual({ c, regra: 'string', trecho: true })
      const linha = r?.texto.split('\n').find((l) => l.startsWith(c)) ?? ''
      expect(linha.split('\t')[3]).toMatch(new RegExp(`^final \\S+ \\[descartado: ${d?.regra}: .+\\]$`))
    }
    for (const [c, d] of r?.diags ?? []) if (d.fonte === 'modelo') expect({ c, descartado: d.modelo?.descartado }).toEqual({ c, descartado: undefined })
  })

  it('(C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar', async () => {
    const r = await replay()
    for (const c of DESCARTADOS_PECA6) {
      const m = r?.diags.get(c)?.modelo as { descartado?: { regra: string; trecho: string }; custo_usd?: number | null; resposta?: unknown }
      expect({ c, regra: m.descartado?.regra, custo: (m.custo_usd ?? 0) > 0.3, resposta: m.resposta }).toEqual({ c, regra: 'teto_corte_cli', custo: true, resposta: undefined })
    }
    // custo desta corrida: os 16 com resposta (US$ 4,1376) + os 6 cortados (US$ 1,9889), o que a corrida real pagou
    expect(r?.texto.split('\n').at(-1)).toMatch(/chamadas novas: 22; custo desta corrida: US\$ 6\.1265$/)
    // 0 dos 6 passam a usar a resposta do modelo: o envelope não tem result
    expect(DESCARTADOS_PECA6.filter((c) => r?.diags.get(c)?.fonte === 'modelo')).toEqual([])
  })
})
