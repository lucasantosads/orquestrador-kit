/**
 * corrida.ts — `orq triar --fixture <dir>`: o triador sobre os 37 casos da
 * fixture `test/fixtures/triador-7f`, no estado da passada (spec 7f-a §7.2 C).
 *
 * É a corrida da PEÇA 6: o humano roda depois do merge, com o modelo de
 * verdade e o teto do dia em US$ 6,60 (22 palpites × US$ 0,30; com o pior
 * caso no corte do CLI, US$ 0,60, a última chamada só sai se o gasto real
 * deixar, ver modelo.ts). Os firmes não
 * chamam modelo. Cada caso grava, em `ORQ_DIAG_DIR/fixture-triador-7f/`, o
 * diagnóstico e `<caso>/resposta-modelo.json` (o registro do modelo, para o
 * replay da peça 6). Nada é escrito na fixture: ela entra na `Guarda` como
 * protegida.
 *
 * Rodar de novo não paga de novo: caso com diagnóstico da mesma assinatura é
 * reaproveitado (só `--forcar` repete).
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { extrair } from './extrair.js'
import { lerCasoDeFixture } from './leitor-legado-comarka.js'
import { Guarda, assinatura, gravarDiagnostico, lerDiagnostico } from './saida.js'
import { diagnosticar, type Diagnostico, type PassoModelo } from './triar.js'
import type { Ref } from './tipos.js'

export const NOME_CORRIDA = 'fixture-triador-7f'

interface Esperado {
  classe: string | null
  evidencia?: { arquivo: string; linha: number | null }[]
}

export interface LinhaPlacar {
  caso: string
  esperado: string | null
  extracao: string | null
  regra: string | null
  final: string | null
  fonte: string
  certo: boolean
  evidencia_certa: boolean
  custo_usd: number | null
  chamou: boolean
  /** a resposta do modelo descartada, com o motivo (modelo.ts, `Descarte`) */
  descartado: { regra: string; trecho: string } | null
}

const casa = (dada: Ref[], esp: Esperado['evidencia']) =>
  dada.some((d) => (esp ?? []).some((e) => e.arquivo === d.arquivo && (e.linha === null || (d.linha !== null && Math.abs(d.linha - e.linha) <= 3))))

/** `casos`: só estes (a mini-corrida da 7f-b1b); um que não está na fixture é erro, antes de qualquer chamada. */
export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; forcar?: boolean; agora?: number; casos?: string[] }): LinhaPlacar[] {
  const fixture = resolve(dir)
  const g = new Guarda([fixture])
  const agora = o.agora ?? Date.now()
  const out: LinhaPlacar[] = []
  const todos = readdirSync(fixture).filter((d) => /^\d\d-[0-9a-z]+-L\d+$/.test(d)).sort()
  const fora = (o.casos ?? []).filter((c) => !todos.includes(c))
  if (fora.length) throw new Error(`caso fora da fixture: ${fora.join(', ')}`)
  for (const caso of o.casos ? todos.filter((c) => o.casos!.includes(c)) : todos) {
    const d = join(fixture, caso)
    const esp = JSON.parse(readFileSync(join(d, 'esperado.json'), 'utf8')) as Esperado
    const ev = lerCasoDeFixture(d, { instante: 'passada' })
    const assin = assinatura(ev)
    const ext = extrair(ev)
    const existente = lerDiagnostico<Diagnostico>(g, NOME_CORRIDA, caso)
    let diag: Diagnostico
    let chamou = false
    if (existente && existente.assinatura === assin && !o.forcar) diag = existente
    else {
      diag = diagnosticar(g, NOME_CORRIDA, { ...ev, id: caso }, ext, assin, agora, fixture, o.modelo)
      chamou = diag.modelo !== null && !(diag.modelo as { pulado?: string }).pulado
      gravarDiagnostico(g, NOME_CORRIDA, caso, diag)
      if (!ext.firme) {
        g.escrever(
          join(g.raiz, NOME_CORRIDA, caso, 'resposta-modelo.json'),
          JSON.stringify({ caso, assinatura: assin, extracao: { classe: ext.classe, regra: ext.regra }, modelo: diag.modelo }, null, 1) + '\n',
        )
      }
    }
    const m = (diag.modelo ?? {}) as { custo_usd?: number | null; descartado?: { regra: string; trecho: string } }
    out.push({
      caso,
      esperado: esp.classe,
      extracao: ext.classe,
      regra: ext.regra,
      final: diag.classe,
      fonte: diag.fonte,
      certo: diag.classe === esp.classe,
      evidencia_certa: casa(diag.evidencia, esp.evidencia),
      custo_usd: m.custo_usd ?? null,
      chamou,
      descartado: diag.fonte === 'extracao' ? (m.descartado ?? null) : null,
    })
  }
  return out
}

export function placar(ls: LinhaPlacar[]): string {
  const linhas = ls.map((l) =>
    [l.caso, `esperado ${l.esperado}`, `extração ${l.extracao ?? '-'} (${l.regra ?? '-'})`, `final ${l.final ?? '-'} [${l.descartado ? `descartado: ${l.descartado.regra}: ${l.descartado.trecho}` : l.fonte}]`, l.certo ? (l.evidencia_certa ? 'CERTO' : 'classe certa, evidência fora') : 'errado', l.custo_usd != null ? `US$ ${l.custo_usd.toFixed(4)}` : ''].join('\t'),
  )
  const certos = ls.filter((l) => l.certo && l.evidencia_certa).length
  const custo = ls.reduce((s, l) => s + (l.custo_usd ?? 0), 0)
  linhas.push(`-- (C) classe e evidência certas: ${certos}/${ls.length} (aceite: >= 30); chamadas novas: ${ls.filter((l) => l.chamou).length}; custo desta corrida: US$ ${custo.toFixed(4)}`)
  return linhas.join('\n')
}
