/**
 * diagnostico.ts — o motivo do retry vira JSON curto (custo-e-contexto §6).
 *
 * Antes: o retry recebia o `motivo` em texto livre do veredito ("critério(s)
 * reprovado(s): ...; ..."), que diz O QUE caiu e não ONDE nem por quê. O agente
 * gastava a tentativa redescobrindo o que o harness já sabia.
 *
 * Agora: ≤ 500 tokens com gate, arquivo, linha, esperado vs obtido, trecho e —
 * o campo que faltava desde o 201 — `fora_da_allowlist`: os arquivos de teste
 * quebrados que a allowlist do ticket NÃO cobre. É o remédio 2 da "Colisão de
 * teste" da SKILL: sem ele o agente fica num beco (fazer a coisa certa reprova
 * no gate; respeitar a fronteira reprova no critério) e não tem como saber que
 * a saída é reportar IMPEDIMENTO.
 *
 * PURO: recebe o conteúdo dos artefatos, não os lê do disco.
 */
import { readFileSync } from 'node:fs'
import { globToRegExp } from './enforcement-core.js'

export interface Diagnostico {
  gate: string
  arquivo: string
  linha: number
  esperado: string
  obtido: string
  trecho: string
  criterios_falhos: string[]
  fora_da_allowlist: string[]
  /**
   * Comandos que o agente TENTOU rodar e o harness negou (peça 0c). Sai do
   * `permission_denials` do envelope. Vale mais que qualquer outro campo quando
   * está cheio: o agente não falhou em resolver o problema, falhou em conseguir
   * permissão para verificar a própria solução — e o retry seguinte repetiria o
   * mesmo muro sem esta linha. Foi o que aconteceu no 227 (3 negativas de
   * `npm run typecheck`, 22 turnos, saiu sem commitar).
   */
  permissoes_negadas: string[]
  instrucao: string
}

export interface EntradaDiagnostico {
  /** conteúdo de runs/<id>/attempt-N/gates.txt */
  gatesTxt?: string
  /** conteúdo de runs/<id>/attempt-N/enforcement.json */
  enforcementJson?: string
  /** conteúdo de runs/<id>/attempt-N/criterios.txt */
  criteriosTxt?: string
  /** descrições dos critérios que reprovaram (inclui as do juiz) */
  criteriosFalhos?: string[]
  /** pathspec_allowlist do ticket */
  allowlist?: string[]
  /** comandos negados por permissão, lidos do envelope do agente */
  permissoesNegadas?: string[]
}

export const INSTRUCAO =
  'corrija só o apontado; não toque fora da allowlist; se o quebrado está fora, reporte IMPEDIMENTO no commit'

/**
 * Instrução ADICIONAL quando houve permissão negada. Sem ela o agente tende a
 * insistir no comando negado — foi o laço do 227, três tentativas do mesmo
 * `npm run typecheck`.
 */
export const INSTRUCAO_PERMISSAO =
  'os comandos em permissoes_negadas NÃO estão liberados: use os cmd dos critérios como estão escritos, e se nenhum servir, commite o que tem e reporte IMPEDIMENTO — não insista no comando negado'

const MAX_LINHAS_TRECHO = 15
const MAX_CHARS_CAMPO = 300

const corta = (s: string, n = MAX_CHARS_CAMPO) => (s.length > n ? `${s.slice(0, n)}…` : s)

/** Arquivos de teste citados num texto de falha (vitest, jest, tsc). */
export function arquivosDeTesteCitados(texto: string): string[] {
  const out = new Set<string>()
  const re = /([\w./-]+\.(?:test|spec)\.[cm]?[jt]sx?)/g
  for (const m of texto.matchAll(re)) out.add(m[1]!)
  return [...out]
}

/** Nome do gate que reprovou, lido da linha `FALHA <nome> ...` do gates.txt. */
export function gateQueFalhou(gatesTxt: string): string {
  const m = /^FALHA\s+(\S+)/m.exec(gatesTxt)
  return m ? m[1]! : ''
}

/**
 * `arquivo:linha` do primeiro ponto de falha citado. Cobre as duas formas que
 * este monorepo emite: `❯ test/x.test.ts:42:56` (vitest) e
 * `src/x.ts(42,7): error TS2322` / `src/x.ts:42:7 - error TS2322` (tsc).
 */
export function primeiroLocal(texto: string): { arquivo: string; linha: number } {
  const vitest = /([\w./-]+\.[cm]?[jt]sx?):(\d+):\d+/.exec(texto)
  if (vitest) return { arquivo: vitest[1]!, linha: Number(vitest[2]) }
  const tsc = /([\w./-]+\.[cm]?[jt]sx?)\((\d+),\d+\)/.exec(texto)
  if (tsc) return { arquivo: tsc[1]!, linha: Number(tsc[2]) }
  const soArquivo = /(?:^|\s)([\w./-]+\.(?:test|spec)\.[cm]?[jt]sx?)/.exec(texto)
  if (soArquivo) return { arquivo: soArquivo[1]!, linha: 0 }
  return { arquivo: '', linha: 0 }
}

/**
 * `esperado` e `obtido` do runner.
 *
 * A linha do `AssertionError` vem PRIMEIRO de propósito: é a única que o vitest
 * emite com os dois valores na MESMA linha. O bloco de diff dele é
 * `- Expected` / `+ Received` em linhas separadas dos valores, e um regex
 * ingênuo `Expected[:\s]+(.+)` atravessa a quebra e captura "+ Received" como
 * se fosse o valor esperado — medido contra a saída real do vitest 2.1.9 deste
 * monorepo.
 */
export function esperadoObtido(texto: string): { esperado: string; obtido: string } {
  const asser = /expected\s+(.+?)\s+to\s+be\s+(.+?)(?:\s*\/\/.*)?$/im.exec(texto)
  if (asser) return { esperado: corta(asser[2]!.trim()), obtido: corta(asser[1]!.trim()) }
  const exp = /^[^\n]*?Expected:[ \t]+(\S.*)$/im.exec(texto)
  const rec = /^[^\n]*?Received:[ \t]+(\S.*)$/im.exec(texto)
  return { esperado: corta((exp?.[1] ?? '').trim()), obtido: corta((rec?.[1] ?? '').trim()) }
}

/** O bloco `### <descricao> ... saida: <x>` do critério que reprovou. */
export function blocoDoCriterio(criteriosTxt: string, descricao: string): string {
  const blocos = criteriosTxt.split(/\n(?=### )/)
  return blocos.find((b) => b.startsWith(`### ${descricao}`)) ?? ''
}

/**
 * Monta o diagnóstico. A ORDEM é a do pipeline — quem reprovou primeiro é quem
 * explica (mesma regra do `orq erro`): enforcement → gates → critérios → juiz.
 */
export function montarDiagnostico(e: EntradaDiagnostico): Diagnostico {
  const allowlist = e.allowlist ?? []
  const criteriosFalhos = (e.criteriosFalhos ?? []).map((c) => corta(c, 200))
  const negadas = [...new Set(e.permissoesNegadas ?? [])].map((c) => corta(c, 120))
  const base: Diagnostico = {
    gate: '',
    arquivo: '',
    linha: 0,
    esperado: '',
    obtido: '',
    trecho: '',
    criterios_falhos: criteriosFalhos,
    fora_da_allowlist: [],
    permissoes_negadas: negadas,
    instrucao: negadas.length > 0 ? `${INSTRUCAO}; ${INSTRUCAO_PERMISSAO}` : INSTRUCAO,
  }

  // 1 · enforcement. Não deveria chegar aqui (violação de fronteira vira
  // `refatiar`, sem retry), mas se chegar, é ele quem explica.
  const enf = seguro(e.enforcementJson)
  if (enf && enf.ok === false) {
    const vs = (enf.violations ?? []) as { tipo?: string; detalhe?: string }[]
    return {
      ...base,
      gate: 'enforcement',
      arquivo: (vs[0]?.detalhe ?? '').split(' ')[0] ?? '',
      obtido: corta(vs.map((v) => `${v.tipo}: ${v.detalhe}`).join('; ')),
      esperado: 'diff inteiro dentro da pathspec_allowlist e fora da zona proibida',
      trecho: recorta(vs.map((v) => `${v.tipo}: ${v.detalhe}`)),
      fora_da_allowlist: vs.filter((v) => v.tipo === 'fora_do_pathspec').map((v) => v.detalhe ?? ''),
    }
  }

  // 2 · gates. O recorte do gate que reprovou vem no próprio gates.txt.
  const gates = e.gatesTxt ?? ''
  const nome = gateQueFalhou(gates)
  if (nome) {
    const recorte = gates.split(/\n--- recorte de .* ---\n/)[1] ?? gates
    const { arquivo, linha } = primeiroLocal(recorte)
    const { esperado, obtido } = esperadoObtido(recorte)
    const motivo = /^FALHA\s+\S+.*?—\s*(.+)$/m.exec(gates)?.[1] ?? ''
    return {
      ...base,
      gate: nome,
      arquivo,
      linha,
      esperado: esperado || corta(`gate ${nome} verde`),
      obtido: obtido || corta(motivo),
      trecho: recorta(recorte.split('\n')),
      // A lição do 201: teste quebrado que a allowlist não cobre é beco sem
      // saída, e o agente só sabe disso se alguém disser.
      fora_da_allowlist: arquivosDeTesteCitados(recorte).filter((f) => !cobre(allowlist, f)),
    }
  }

  // 3 · critérios (inclui os que o JUIZ reprovou: chegam por criteriosFalhos).
  if (criteriosFalhos.length > 0) {
    const primeiro = criteriosFalhos[0]!
    const bloco = blocoDoCriterio(e.criteriosTxt ?? '', primeiro)
    const esp = /^espera:\s*(.*)$/m.exec(bloco)?.[1] ?? ''
    const saida = /^saida:\s*([\s\S]*)$/m.exec(bloco)?.[1] ?? ''
    const doJuiz = primeiro.startsWith('juiz:')
    return {
      ...base,
      gate: doJuiz ? 'juiz' : 'criterios',
      ...primeiroLocal(bloco || primeiro),
      esperado: corta(esp || (doJuiz ? 'veredito do juiz: aprovado' : '')),
      obtido: corta(saida.trim() || primeiro),
      trecho: recorta((bloco || criteriosFalhos.join('\n')).split('\n')),
      fora_da_allowlist: arquivosDeTesteCitados(bloco).filter((f) => !cobre(allowlist, f)),
    }
  }

  return base
}

function cobre(allowlist: string[], arquivo: string): boolean {
  return allowlist.some((g) => globToRegExp(g).test(arquivo))
}

function recorta(linhas: string[]): string {
  return linhas
    .filter((l) => l.trim())
    .slice(0, MAX_LINHAS_TRECHO)
    .map((l) => corta(l, 200))
    .join('\n')
}

function seguro(txt?: string): { ok?: boolean; violations?: unknown[] } | null {
  if (!txt || !txt.trim()) return null
  try {
    return JSON.parse(txt) as { ok?: boolean; violations?: unknown[] }
  } catch {
    return null
  }
}

// --- CLI: `npx tsx diagnostico.ts --run-cli <rundir>` (allowlist + falhos em stdin)
if (process.argv.includes('--run-cli') && /diagnostico\.(ts|js)$/.test(process.argv[1] ?? '')) {
  const rundir = process.argv[process.argv.indexOf('--run-cli') + 1] ?? '.'
  const ler = (f: string) => {
    try {
      return readFileSync(`${rundir}/${f}`, 'utf8')
    } catch {
      return ''
    }
  }
  const entrada = JSON.parse(readFileSync(0, 'utf8')) as {
    allowlist?: string[]
    criteriosFalhos?: string[]
    permissoesNegadas?: string[]
  }
  process.stdout.write(
    JSON.stringify(
      montarDiagnostico({
        gatesTxt: ler('gates.txt'),
        enforcementJson: ler('enforcement.json'),
        criteriosTxt: ler('criterios.txt'),
        allowlist: entrada.allowlist ?? [],
        criteriosFalhos: entrada.criteriosFalhos ?? [],
        permissoesNegadas: entrada.permissoesNegadas ?? [],
      }),
      null,
      2,
    ) + '\n',
  )
}
