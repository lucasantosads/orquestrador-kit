/**
 * Etapa 7f-b1, peça 1 · a fixture do triador (spec 7f-a §7.1).
 *
 * Sanidade do que `test/fixtures/triador-7f/montar.py` montou a partir do
 * comarka-operacional: os 37 bloqueios da medição de 09/10, os 20 de controle,
 * a classe e a linha da medição em cada `esperado.json`, o mapa de linhas dos
 * recortes e o teto de tamanho. O aceite do triador mora em
 * `orquestrador-triador-aceite.test.ts`; este arquivo só prova que a régua
 * existe e é a da medição.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { describe, expect, it } from 'vitest'

const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/

const casos = () => (existsSync(FX) ? readdirSync(FX).filter((d) => CASO_RE.test(d)).sort() : [])
const controles = () =>
  existsSync(join(FX, 'controle')) ? readdirSync(join(FX, 'controle')).filter((d) => CASO_RE.test(d)).sort() : []
const cortados = () =>
  existsSync(join(FX, 'cortados')) ? readdirSync(join(FX, 'cortados')).filter((d) => CASO_RE.test(d)).sort() : []
const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T

interface Esperado {
  classe: string | null
  evidencia?: { arquivo: string; linha: number | null; origem: string }[]
  requeue?: string
  fonte_da_verdade: string
  controle?: boolean
  cortado?: boolean
  firme_proibido?: boolean
}
interface Caso {
  id: string
  tentativas: number
  log_inicio: number
  linha_bloqueio: number | null
}

function bytesDe(dir: string): number {
  let n = 0
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name)
    n += e.isDirectory() ? bytesDe(p) : statSync(p).size
  }
  return n
}

function todosOsDiretorios(): string[] {
  return [
    ...casos().map((c) => join(FX, c)),
    ...controles().map((c) => join(FX, 'controle', c)),
    ...cortados().map((c) => join(FX, 'cortados', c)),
  ]
}

function faixasContam(faixas: [number, number][]): number {
  return faixas.reduce((s, [a, b]) => s + (b - a + 1), 0)
}

describe('fixture triador-7f (peça 1)', () => {
  it('37 casos de bloqueio e 20 de controle', () => {
    expect(casos()).toHaveLength(37)
    expect(controles()).toHaveLength(20)
  })

  it('esperado.json traz a classe e a linha da tabela da medição (102-138), uma linha por caso', () => {
    const linhas = casos().map((c) => {
      const e = json<Esperado>(join(FX, c, 'esperado.json'))
      const m = /^medicao-bloqueios-out\.md:(\d+)$/.exec(e.fonte_da_verdade)
      expect(m, `${c}: fonte_da_verdade "${e.fonte_da_verdade}"`).not.toBeNull()
      expect(e.classe, c).toMatch(/^R[1-7]$/)
      return Number(m![1])
    })
    expect(linhas.sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => 102 + i))
  })

  it('contagem por classe é a da §5 da medição: 11/9/5/4/6/1/1', () => {
    const n: Record<string, number> = {}
    for (const c of casos()) {
      const k = json<Esperado>(join(FX, c, 'esperado.json')).classe ?? 'null'
      n[k] = (n[k] ?? 0) + 1
    }
    expect(n).toEqual({ R1: 11, R2: 9, R3: 5, R4: 4, R5: 6, R6: 1, R7: 1 })
  })

  it('toda evidência esperada aponta artefato da série ou linha do log que está no trecho', () => {
    for (const c of casos()) {
      const e = json<Esperado>(join(FX, c, 'esperado.json'))
      const serie = json<{ k: number; dir: string }[]>(join(FX, c, 'serie.json'))
      const caso = json<Caso>(join(FX, c, 'caso.json'))
      const log = new Set(
        readFileSync(join(FX, c, 'log.txt'), 'utf8')
          .split('\n')
          .filter(Boolean)
          .map((l) => Number(l.split('\t')[0])),
      )
      expect(e.evidencia?.length ?? 0, `${c}: sem evidência esperada`).toBeGreaterThan(0)
      for (const ev of e.evidencia ?? []) {
        if (ev.arquivo === 'docs/fila/runs/local-loop.log') {
          expect(log.has(ev.linha!), `${c}: L:${ev.linha} fora do log.txt (início ${caso.log_inicio})`).toBe(true)
        } else {
          const dir = ev.arquivo.slice(0, ev.arquivo.lastIndexOf('/'))
          expect(serie.map((s) => s.dir), `${c}: ${ev.arquivo}`).toContain(dir)
        }
      }
    }
  })

  it('cada caso tem o que o triador lê, e uma attempt-K por tentativa, com presenca.json', () => {
    for (const d of todosOsDiretorios()) {
      for (const f of ['caso.json', 'ticket.json', 'meta.json', 'config.json', 'log.txt', 'serie.json', 'vizinhos.tsv', 'esperado.json']) {
        expect(existsSync(join(d, f)), `${d}/${f}`).toBe(true)
      }
      const caso = json<Caso>(join(d, 'caso.json'))
      const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
      expect(serie.map((s) => s.k)).toEqual(Array.from({ length: caso.tentativas }, (_, i) => i + 1))
      for (const s of serie) {
        expect(json<string[]>(join(d, `attempt-${s.k}`, 'presenca.json')).length, `${d} attempt-${s.k}`).toBeGreaterThan(0)
      }
      expect(readFileSync(join(d, 'vizinhos.tsv'), 'utf8').split('\n')[0]).toBe(
        'ticket\tdir\tarquivo\tlinha\tts\tantes_do_bloqueio',
      )
    }
  })

  it('o mapa de linhas originais tem uma entrada por linha do recorte (gate-vitest e criterios)', () => {
    for (const d of todosOsDiretorios()) {
      for (const k of readdirSync(d).filter((x) => /^attempt-\d+$/.test(x))) {
        for (const base of ['gate-vitest', 'criterios']) {
          const txt = join(d, k, `${base}.txt`)
          if (!existsSync(txt)) continue
          const mapa = json<{ total: number; faixas: [number, number][] }>(join(d, k, `${base}.linhas.json`))
          const n = readFileSync(txt, 'utf8').split('\n').length
          expect(faixasContam(mapa.faixas), `${d}/${k}/${base}`).toBe(n)
          expect(mapa.faixas.at(-1)![1]).toBeLessThanOrEqual(mapa.total)
        }
      }
    }
  })

  it('controle: done do período, sem classe e com firme proibido', () => {
    for (const c of controles()) {
      const e = json<Esperado>(join(FX, 'controle', c, 'esperado.json'))
      expect(e).toMatchObject({ classe: null, controle: true, firme_proibido: true })
      const meta = json<{ resultado: string }[]>(join(FX, 'controle', c, 'meta.json'))
      expect(meta.at(-1)!.resultado, c).toBe('done')
    }
  })

  it('série cortada (7f-b1-7): 671d, 624, 627e, 808 e 367, cada um o controle cortado na última tentativa que reprovou', () => {
    expect(cortados().map((c) => c.split('-')[1])).toEqual(['671d', '624', '627e', '808', '367'])
    for (const c of cortados()) {
      const d = join(FX, 'cortados', c)
      const e = json<Esperado>(join(d, 'esperado.json'))
      expect(e).toMatchObject({ classe: null, cortado: true, firme_proibido: true })
      const caso = json<Caso & { cortado_de: string; cortado_em: number }>(join(d, 'caso.json'))
      const meta = json<{ attempt: number; resultado: string }[]>(join(d, 'meta.json'))
      expect(meta.at(-1), c).toMatchObject({ attempt: caso.cortado_em, resultado: 'reprovado' })
      expect(caso.tentativas, c).toBe(caso.cortado_em)
      const orig = json<{ attempt: number; resultado: string }[]>(join(FX, caso.cortado_de, 'meta.json'))
      expect(orig.at(-1)!.resultado, c).toBe('done')
      expect(orig.at(-1)!.attempt, c).toBeGreaterThan(caso.cortado_em)
    }
  })

  it('cabe em 3 MB e não carrega segredo sem máscara', () => {
    expect(bytesDe(FX)).toBeLessThan(3 * 1024 * 1024)
    const segredo = /\bsk-[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}|\bSUPABASE_[A-Z_]*=[^\s"'‹]{8,}/
    const varre = (dir: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, e.name)
        if (e.isDirectory()) varre(p)
        else if (!p.endsWith('.gz') && !p.endsWith('montar.py')) {
          expect(segredo.test(readFileSync(p, 'utf8')), p).toBe(false)
        }
      }
    }
    if (existsSync(FX)) varre(FX)
  })

  it('três gate-vitest inteiros (gzip) com o recorte de referência do montar.py', () => {
    const dir = join(FX, 'vitest-inteiros')
    const origem = existsSync(join(dir, 'origem.json')) ? json<Record<string, string>>(join(dir, 'origem.json')) : {}
    expect(Object.keys(origem)).toHaveLength(3)
    for (const id of Object.keys(origem)) {
      const txt = gunzipSync(readFileSync(join(dir, `${id}.txt.gz`))).toString('utf8')
      expect(txt).toMatch(/FAIL /)
      expect(json<[number, number][]>(join(dir, `${id}.recorte.json`)).length).toBeGreaterThan(0)
    }
  })
})
