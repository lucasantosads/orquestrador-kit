/**
 * selecao-relatorio.ts — `orq selecao`: o relatório da sombra (etapa M69, P6).
 *
 * Lê os `selecao.json` que o gates.ts grava em sombra (runs/<id>/attempt-N/)
 * e conta, na janela (mtime do arquivo): tentativas, quedas para a inteira por
 * motivo, inteiras vermelhas, escapes e minutos economizados estimados. Diz se a
 * regra da virada do CONTRATO §29 está cumprida. READ-ONLY: virar para
 * `afetados`, e voltar, é decisão humana de config.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { RegistroSombra } from './selecao-testes.js'

const DIA = 86_400_000
/** A regra da virada (CONTRATO §29). */
export const VIRADA = { dias: 7, escapes: 0, inteiras_vermelhas: 5 } as const

/** Os campos do selecao.json (selecao-testes.ts, registroSombra) que o relatório lê. */
type Registro = Partial<Pick<RegistroSombra, 'testes_rodou' | 'inteira_ok' | 'escape' | 'escapes' | 'segundos_inteira' | 'segundos_afetados_estimados'>> & {
  modo?: string
  escolha?: { modo_efetivo?: string; motivo?: string }
}
export interface RegistroLido { id: string; attempt: number; mtimeMs: number; reg: Registro }

/** Começo do motivo da escolha (escolherSelecao) -> nome curto da queda para a inteira. */
const QUEDAS: [string, string][] = [['diff vazio', 'diff_vazio'], ['diff apaga ou renomeia', 'apaga_ou_renomeia'],
  ['diff casa suite_inteira_se', 'suite_inteira_se'], ['cmd_listar falhou', 'cmd_listar_falhou'], ['conjunto afetado vazio', 'conjunto_vazio']]

const um = (n: number) => Math.round(n * 10) / 10

export function relatorioSelecao(todos: RegistroLido[], o: { dias: number; agora: number }) {
  const sombra = todos.filter((r) => r.reg.modo === 'sombra')
  const janela = sombra.filter((r) => r.mtimeMs >= o.agora - o.dias * DIA)
  const quedas: Record<string, number> = {}
  let sInteira = 0
  let sAfetados = 0
  for (const { reg } of janela) {
    if (reg.escolha?.modo_efetivo === 'inteira') {
      const q = QUEDAS.find(([p]) => reg.escolha?.motivo?.startsWith(p))?.[1] ?? 'outro'
      quedas[q] = (quedas[q] ?? 0) + 1
    }
    sInteira += reg.segundos_inteira ?? 0
    sAfetados += reg.segundos_afetados_estimados ?? reg.segundos_inteira ?? 0
  }
  const escapes = janela.filter((r) => r.reg.escape === true).map((r) => ({ id: r.id, attempt: r.attempt, arquivos: r.reg.escapes ?? [] }))
  const indeterminados = janela.filter((r) => r.reg.escape === null).length
  const inteirasVermelhas = janela.filter((r) => r.reg.testes_rodou && r.reg.inteira_ok === false).length
  const maisAntigo = Math.min(...sombra.map((r) => r.mtimeMs))
  const diasEmSombra = sombra.length ? Math.floor((o.agora - maisAntigo) / DIA) : 0
  const faltas: string[] = []
  if (diasEmSombra < VIRADA.dias) faltas.push(`${diasEmSombra} dia(s) em sombra (precisa de ${VIRADA.dias})`)
  if (escapes.length > VIRADA.escapes) faltas.push(`${escapes.length} escape(s) na janela (precisa de 0)`)
  if (indeterminados > 0) faltas.push(`${indeterminados} tentativa(s) com escape indeterminado (precisa de 0)`)
  if (inteirasVermelhas < VIRADA.inteiras_vermelhas) faltas.push(`${inteirasVermelhas} inteira(s) vermelha(s) na janela (precisa de ${VIRADA.inteiras_vermelhas})`)
  const minutosInteira = um(sInteira / 60)
  const minutosAfetados = um(sAfetados / 60)
  return {
    dias: o.dias,
    tentativas: janela.length,
    afetados: janela.filter((r) => r.reg.escolha?.modo_efetivo === 'afetados').length,
    inteira: janela.filter((r) => r.reg.escolha?.modo_efetivo === 'inteira').length,
    quedas,
    inteiras_vermelhas: inteirasVermelhas,
    escapes,
    indeterminados,
    dias_em_sombra: diasEmSombra,
    minutos_inteira: minutosInteira,
    minutos_afetados: minutosAfetados,
    minutos_economizados: um(minutosInteira - minutosAfetados),
    virada: { cumprida: faltas.length === 0, faltas },
  }
}

export function render(r: ReturnType<typeof relatorioSelecao>, fila: string): string {
  const l = (rotulo: string, v: string | number) => `${rotulo.padEnd(25)}${v}`
  const quedas = Object.entries(r.quedas).map(([k, n]) => `${k} ${n}`).join(', ')
  const linhas = [
    `SELECAO ${fila} · janela de ${r.dias} dia(s)`,
    l('tentativas em sombra', `${r.tentativas} (afetados ${r.afetados}, caiu para a inteira ${r.inteira}${quedas ? `: ${quedas}` : ''})`),
    l('inteiras vermelhas', r.inteiras_vermelhas),
    l('escapes', r.escapes.length),
    ...r.escapes.map((e) => `  ${e.id} attempt-${e.attempt}: ${e.arquivos.join(', ')}`),
    l('indeterminados', r.indeterminados),
    l('minutos economizados', `${r.minutos_economizados} (inteira ${r.minutos_inteira}, afetados estimados ${r.minutos_afetados})`),
    l('dias em sombra', r.dias_em_sombra),
    `virada (CONTRATO §29): ${
      r.virada.cumprida
        ? `regra cumprida (${r.dias_em_sombra} dias em sombra, 0 escape, ${r.inteiras_vermelhas} inteiras vermelhas)`
        : `regra NÃO cumprida: ${r.virada.faltas.join('; ')}`
    }. Virar para afetados é decisão humana de config, e só com a rede_suite_inteira existindo de fato.`,
  ]
  return `${linhas.join('\n')}\n`
}

/** runs/<id>/attempt-N/selecao.json, com o mtime. JSON ilegível fica de fora. */
export function lerRegistros(runsDir: string): RegistroLido[] {
  const out: RegistroLido[] = []
  if (!existsSync(runsDir)) return out
  for (const id of readdirSync(runsDir)) {
    const dirId = join(runsDir, id)
    if (!statSync(dirId).isDirectory()) continue
    for (const a of readdirSync(dirId)) {
      const m = /^attempt-(\d+)$/.exec(a)
      const arq = join(dirId, a, 'selecao.json')
      if (!m || !existsSync(arq)) continue
      try {
        out.push({ id, attempt: Number(m[1]), mtimeMs: statSync(arq).mtimeMs, reg: JSON.parse(readFileSync(arq, 'utf8')) as Registro })
      } catch {
        // selecao.json ilegível: não conta, como a trilha não conta linha torta.
      }
    }
  }
  return out
}

// --- CLI: `selecao-relatorio.ts <runs_dir> <dias> [rótulo da fila]` (orq selecao)
if (process.argv[1]?.endsWith('selecao-relatorio.ts')) {
  const [runsDir, dias, fila] = process.argv.slice(2)
  const r = relatorioSelecao(lerRegistros(runsDir ?? ''), { dias: Number(dias) || 7, agora: Date.now() })
  process.stdout.write(render(r, fila ?? runsDir ?? ''))
}
