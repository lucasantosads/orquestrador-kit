/**
 * Etapa 7f-b1, peça 2 · os leitores `kit` e `legado-comarka` → `Evidencia`
 * (spec 7f-a §2 e §8, peça 2).
 *
 * Pronto quando:
 *   - os 37 e os 20 de controle dão o estágio por tentativa igual ao da
 *     presença dos arquivos (`presenca.json`, fail-fast do executor do legado);
 *   - o recorte guarda todo FAIL e todo `❯` de 3 gate-vitest inteiros, e é o
 *     mesmo que o `montar.py` gravou;
 *   - um repo do molde `test-fixture-painel.sh` é lido pelo leitor `kit`;
 *   - e um repo do legado materializado de dois casos da fixture dá a mesma
 *     evidência que o caso lido direto da fixture (a mesma estrutura pelas
 *     duas fontes).
 *
 * Os módulos entram por import dinâmico tolerante: sem eles o vermelho é de
 * asserção, não de import.
 */
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'
import { materializar } from './triador-repo-legado.js'

const RAIZ = join(import.meta.dirname, '..')
const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
const AQUI = join(RAIZ, 'scripts', 'orquestrador')
const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/

interface Linha { n: number; t: string }
interface Ref { arquivo: string; linha: number | null; trecho: string }
interface Tent {
  n: number
  dir: string
  estagio: string
  vermelhos: { arquivo: string; linha: number | null; ref: Ref }[]
  arquivos_vermelhos: string[]
  criterios_falhos: { criterio: string; ref: Ref }[]
  diff_linhas: number | null
}
interface Ev {
  leitor: string
  bloqueio: { token: string | null; refs: Ref[]; origem: string }
  tentativas: Tent[]
  merge_recusado: { arquivos: string[]; refs: Ref[] } | null
}
interface Mods {
  lerCasoDeFixture: (d: string) => Ev
  lerRepoLegado: (raiz: string, id: string) => Ev
  lerRepo: (raiz: string, id: string) => Ev
  detectarLeitor: (raiz: string) => string | null
  recortarVitest: (l: Linha[]) => Linha[]
  linhasDe: (t: string) => Linha[]
}

async function carregar(): Promise<Mods | null> {
  try {
    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
    const m = { ...(await imp('leitor-legado-comarka.ts')), ...(await imp('leitor.ts')), ...(await imp('recorte.ts')) }
    for (const k of ['lerCasoDeFixture', 'lerRepoLegado', 'lerRepo', 'detectarLeitor', 'recortarVitest', 'linhasDe']) {
      if (typeof m[k] !== 'function') return null
    }
    return m as unknown as Mods
  } catch {
    return null
  }
}

const casos = () => [
  ...readdirSync(FX).filter((d) => CASO_RE.test(d)).map((d) => join(FX, d)),
  ...readdirSync(join(FX, 'controle')).filter((d) => CASO_RE.test(d)).map((d) => join(FX, 'controle', d)),
]
const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T

/** O estágio pela presença (spec §0.3, diferença 1), em famílias. */
function familiaPorPresenca(p: string[]): string {
  if (p.includes('verdict.json')) return 'juiz-ou-merge'
  if (p.includes('gate-build.txt')) return 'build'
  if (p.includes('criterios.txt')) return 'criterios'
  if (p.includes('gate-vitest.txt')) return 'vitest'
  if (p.includes('gate-tsc.txt')) return 'tsc'
  if (p.includes('diff.stat')) return 'enforcement-ou-diff_cap'
  return 'agente'
}
const FAMILIA: Record<string, string> = {
  juiz: 'juiz-ou-merge', juiz_ok_merge_falhou: 'juiz-ou-merge', aprovado: 'juiz-ou-merge',
  enforcement: 'enforcement-ou-diff_cap', diff_cap: 'enforcement-ou-diff_cap',
}

describe('leitores do triador (peça 2)', () => {
  it('os 37 e os 20 de controle: estágio por tentativa igual ao da presença dos arquivos', async () => {
    const m = await carregar()
    const difere: string[] = []
    let n = 0
    for (const d of casos()) {
      const serie = json<{ k: number }[]>(join(d, 'serie.json'))
      const esperado = serie.map((s) => familiaPorPresenca(json<string[]>(join(d, `attempt-${s.k}`, 'presenca.json'))))
      const lido = m ? m.lerCasoDeFixture(d).tentativas.map((t) => FAMILIA[t.estagio] ?? t.estagio) : []
      n += esperado.length
      if (JSON.stringify(lido) !== JSON.stringify(esperado)) difere.push(`${d.split('/').pop()}: ${lido} != ${esperado}`)
    }
    expect(n).toBeGreaterThan(100)
    expect(difere).toEqual([])
  })

  it('o leitor distingue merge recusado com mérito aprovado (940, 932) e marca o estágio', async () => {
    const m = await carregar()
    for (const c of ['36-940-L85222', '37-932-L85272']) {
      const ev = m?.lerCasoDeFixture(join(FX, c))
      expect(ev?.tentativas.map((t) => t.estagio), c).toEqual(['juiz_ok_merge_falhou', 'juiz_ok_merge_falhou'])
      expect(ev?.merge_recusado?.arquivos, c).toEqual(['docs/fila/854-remove-equipe-geral.md'])
      expect(ev?.bloqueio.token, c).toBe('circuit_breaker')
    }
  })

  it('o recorte guarda todo FAIL e todo ❯ de 3 gate-vitest inteiros, e é o mesmo do montar.py', async () => {
    const m = await carregar()
    const origem = json<Record<string, string>>(join(FX, 'vitest-inteiros', 'origem.json'))
    for (const id of Object.keys(origem)) {
      const txt = gunzipSync(readFileSync(join(FX, 'vitest-inteiros', `${id}.txt.gz`))).toString('utf8')
      const todas = m ? m.linhasDe(txt) : []
      const rec = m ? m.recortarVitest(todas) : []
      const guardadas = new Set(rec.map((l) => l.n))
      const chaves = txt
        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
        .split('\n')
        .map((t, i) => ({ n: i + 1, t }))
        .filter((l) => /^\s*FAIL\s/.test(l.t) || /❯\s+\S+:\d+:\d+/.test(l.t))
      expect(chaves.length, id).toBeGreaterThan(0)
      expect(chaves.filter((l) => !guardadas.has(l.n)).map((l) => l.n), `${id}: FAIL/❯ fora do recorte`).toEqual([])
      const ref = json<[number, number][]>(join(FX, 'vitest-inteiros', `${id}.recorte.json`)).flatMap(([a, b]) =>
        Array.from({ length: b - a + 1 }, (_, i) => a + i),
      )
      expect(rec.map((l) => l.n), `${id}: recorte TS != montar.py`).toEqual(ref)
      expect(rec.length).toBeLessThanOrEqual(Math.max(300, chaves.length))
    }
  })

  it('recortar de novo o recorte da fixture devolve o mesmo (o contexto conta pela linha original)', async () => {
    const m = await carregar()
    let n = 0
    for (const d of casos()) {
      for (const k of readdirSync(d).filter((x) => /^attempt-\d+$/.test(x))) {
        const p = join(d, k, 'gate-vitest.txt')
        if (!existsSync(p)) continue
        const ns = json<{ faixas: [number, number][] }>(join(d, k, 'gate-vitest.linhas.json')).faixas.flatMap(([a, b]) =>
          Array.from({ length: b - a + 1 }, (_, i) => a + i),
        )
        const ts = readFileSync(p, 'utf8').split('\n')
        const linhas = ns.map((nn, i) => ({ n: nn, t: ts[i]! }))
        const de_novo = m ? m.recortarVitest(linhas) : []
        expect(de_novo.map((l) => l.n), `${d}/${k}`).toEqual(ns)
        n++
      }
    }
    expect(n).toBeGreaterThan(100)
  })

  it('um repo do molde test-fixture-painel.sh é lido pelo leitor kit', async () => {
    const m = await carregar()
    const tmp = mkdtempSync(join(tmpdir(), 'triador-kit-'))
    const raiz = join(tmp, 'repo-kit')
    execFileSync('bash', ['-c', `
      set -e
      export ORQ_TESTE=1 ORQ_EXEC_ROOT="$1" AQUI="$2"
      source "$AQUI/test-fixture-painel.sh"
      mkdir -p "$1/docs/fila"
      fp_repo "$1"
      fp_ticket "$1" 501 bloqueado '[]' '{"pathspec_allowlist": ["src/a.ts", "test/a.test.ts"]}'
      t=$(fp_epoch_hoje 10:00:00)
      fp_evento "$1" "$t" 501 INICIO attempt=1 model=sonnet
      fp_evento "$1" "$((t+60))" 501 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=12
      fp_evento "$1" "$((t+120))" 501 INICIO attempt=2 model=opus
      fp_evento "$1" "$((t+180))" 501 BLOQUEADO motivo=repeticao sub=gate_testes diff=12 attempt=2
    `, '_', raiz, AQUI], { stdio: 'pipe' })
    const runs = join(raiz, 'docs/fila/runs/501')
    for (const k of [0, 1]) {
      mkdirSync(join(runs, `attempt-${k}`), { recursive: true })
      writeFileSync(join(runs, `attempt-${k}`, 'gates.txt'), [
        'ok   typecheck              2240ms',
        'FALHA testes                37971ms — exit 1',
        'VEREDITO: REPROVADO',
        '',
        '--- recorte de testes ---',
        ' FAIL  test/b.test.ts > b > soma',
        'AssertionError: expected 2 to be 3',
        ' ❯ test/b.test.ts:7:15',
      ].join('\n'))
      writeFileSync(join(runs, `attempt-${k}`, 'diff.patch'), '--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-x\n+y\n')
      writeFileSync(join(runs, `attempt-${k}`, 'veredito.json'), JSON.stringify({ desfecho: 'reprovado', causa: 'criterio_qualidade', sub: 'gate_testes', motivo: 'gate testes' }))
    }
    writeFileSync(join(runs, 'meta.json'), JSON.stringify([{ attempt: 0, diffLines: 2, dir: 'attempt-0' }, { attempt: 1, diffLines: 2, dir: 'attempt-1' }]))
    expect(m?.detectarLeitor(raiz)).toBe('kit')
    const ev = m?.lerRepo(raiz, '501')
    expect(ev?.leitor).toBe('kit')
    expect(ev?.bloqueio.token).toBe('repeticao:gate_testes')
    expect(ev?.bloqueio.refs[0]?.arquivo).toBe('docs/fila/runs/events.log')
    expect(ev?.tentativas.map((t) => [t.dir, t.estagio, t.diff_linhas])).toEqual([
      ['docs/fila/runs/501/attempt-0', 'vitest', 2],
      ['docs/fila/runs/501/attempt-1', 'vitest', 2],
    ])
    expect(ev?.tentativas[1]?.vermelhos.map((v) => [v.arquivo, v.linha, v.ref.arquivo, v.ref.linha])).toEqual([
      ['test/b.test.ts', 7, 'docs/fila/runs/501/attempt-1/gates.txt', 8],
    ])
  })

  it('o leitor legado num repo materializado de um caso dá a mesma evidência que a fixture (940, 760, 627b)', async () => {
    const m = await carregar()
    for (const nome of ['36-940-L85222', '21-760-L72407', '05-627b-L56021']) {
      const d = join(FX, nome)
      const raiz = materializar(d)
      const daFixture = m?.lerCasoDeFixture(d)
      const doRepo = m?.lerRepoLegado(raiz, json<{ id: string }>(join(d, 'caso.json')).id)
      const resumo = (e: Ev | undefined) =>
        e && {
          leitor: e.leitor,
          bloqueio: { token: e.bloqueio.token, refs: e.bloqueio.refs, origem: e.bloqueio.origem },
          merge: e.merge_recusado,
          tentativas: e.tentativas.map((t) => ({
            dir: t.dir, estagio: t.estagio, vermelhos: t.vermelhos, falhos: t.criterios_falhos.map((c) => c.ref), diff: t.diff_linhas,
          })),
        }
      expect(resumo(daFixture), nome).toBeTruthy()
      expect(resumo(doRepo), nome).toEqual(resumo(daFixture))
    }
  })
})
