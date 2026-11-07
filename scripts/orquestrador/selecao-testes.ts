/**
 * selecao-testes.ts — o gate de testes roda só os afetados (etapa M69, M-69).
 *
 * Chave OPCIONAL no próprio gate de testes, `selecao_testes`. Ausente (ou
 * `modo: "inteira"`) é o motor de antes, byte a byte: nenhum comando novo, nenhum
 * arquivo novo, nenhuma linha nova. Os três modos:
 *   inteira  — a suíte inteira roda e decide (hoje);
 *   sombra   — a inteira roda e decide; o motor só CALCULA o conjunto afetado e
 *              grava o que teria acontecido (selecao.json, linha SELECAO);
 *   afetados — o gate roda `cmd_afetados`; cai para a inteira quando o diff casa
 *              `suite_inteira_se`, apaga ou renomeia arquivo, ou o conjunto vem
 *              vazio ou não pode ser calculado.
 *
 * `{base}` nos comandos é o sha de onde a worktree do ticket nasceu: `vitest
 * run/list --changed {base}`. É a única forma de LISTAR sem rodar pela CLI do
 * vitest (2.1.9 e 4.1.9, medido no PASSO 0) e a base existe antes do agente — a
 * lista do diff não —, então o prompt e o `--allowedTools` levam o comando pronto.
 */
export type ModoSelecao = 'inteira' | 'sombra' | 'afetados'

export interface SelecaoTestes {
  modo: ModoSelecao
  /** Roda os afetados; tem `{base}`. Ex.: `npx vitest run --changed {base}`. */
  cmd_afetados?: string
  /** Lista os afetados sem rodar, um por linha; tem `{base}`. Ex.: `npx vitest list --filesOnly --changed {base}`. */
  cmd_listar?: string
  /** Globs do diff que mandam a suíte inteira rodar. Ausente = `SUITE_INTEIRA_PADRAO`. */
  suite_inteira_se?: string[]
  /** Arquivos de teste que rodam sempre junto dos afetados (varredura por fs/glob/processo, fora do grafo de import). */
  testes_sempre?: string[]
  /** Texto do humano: onde a suíte inteira roda. Obrigatório em `afetados`. */
  rede_suite_inteira?: string
}

/**
 * A lista padrão: o que muda a coleta ou o ambiente de TODO teste. `**​/` na
 * frente vale também para a raiz (globToRegExp do enforcement).
 */
export const SUITE_INTEIRA_PADRAO: readonly string[] = [
  '**/vitest.config.*', '**/vite.config.*', '**/vitest.workspace.*', '**/package.json', '**/package-lock.json',
  '**/tsconfig*.json', '**/vitest.setup.*', '**/setupTests.*', '**/test/setup.*', '**/test/fixtures/**',
  '**/test/helpers/**', '**/migrations/**', '**/*.d.ts', '**/.env*',
]

const CHAVES = ['modo', 'cmd_afetados', 'cmd_listar', 'suite_inteira_se', 'testes_sempre', 'rede_suite_inteira']

interface GateComSelecao {
  nome: string
  cmd: string
  papel?: string | null
  selecao_testes?: unknown
}

/** O mesmo `papel_do_gate` do executor.sh: declarado ganha; senão, pelo nome. */
export function papelDoGate(g: { nome: string; papel?: string | null }): string {
  if (g.papel) return g.papel
  if (/typecheck|tsc|types/.test(g.nome)) return 'typecheck'
  if (/lint/.test(g.nome)) return 'lint'
  if (/build|compil/.test(g.nome)) return 'build'
  if (/test|spec/.test(g.nome)) return 'testes'
  return ''
}

/**
 * Os erros da chave, um por linha. Lista vazia = válida ou ausente. Erro é FALHA
 * ALTA (preflight e gates.ts saem): seleção mal escrita que o motor engolisse
 * viraria gate rodando outra coisa que não a que o config diz.
 */
export function validarSelecao(config: { gates?: GateComSelecao[] }): string[] {
  const com = (config.gates ?? []).filter((g) => g.selecao_testes !== undefined)
  const erros: string[] = []
  if (com.length > 1) erros.push(`selecao_testes em ${com.length} gates (${com.map((g) => g.nome).join(', ')}); só o gate de testes leva a chave`)
  for (const g of com) {
    const e = (m: string) => erros.push(`gates[${g.nome}].selecao_testes: ${m}`)
    const s = g.selecao_testes as Record<string, unknown>
    if (!s || typeof s !== 'object' || Array.isArray(s)) { e('tem de ser objeto'); continue }
    for (const k of Object.keys(s)) if (!CHAVES.includes(k)) e(`chave desconhecida '${k}' (aceitas: ${CHAVES.join(', ')})`)
    if (papelDoGate(g) !== 'testes') e(`o gate '${g.nome}' não tem papel testes (papel: '${papelDoGate(g)}')`)
    if (!['inteira', 'sombra', 'afetados'].includes(s.modo as string)) e(`modo ${JSON.stringify(s.modo)} não é inteira, sombra nem afetados`)
    for (const k of ['suite_inteira_se', 'testes_sempre']) {
      const v = s[k]
      if (v !== undefined && !(Array.isArray(v) && v.every((x) => typeof x === 'string' && x.trim()))) e(`${k} tem de ser lista de textos não vazios`)
    }
    if (s.modo === 'sombra' || s.modo === 'afetados') {
      for (const k of ['cmd_afetados', 'cmd_listar']) {
        if (typeof s[k] !== 'string' || !(s[k] as string).includes('{base}')) e(`${k} é obrigatório no modo ${s.modo as string} e tem de conter {base}`)
      }
    }
    if (s.modo === 'afetados' && !(typeof s.rede_suite_inteira === 'string' && s.rede_suite_inteira.trim())) {
      e('modo "afetados" exige rede_suite_inteira (onde a suíte inteira roda; ex.: "M-21 fila de merge" ou "job noturno X"); sem ela o gate aprova sem nunca rodar a suíte inteira')
    }
  }
  return erros
}

/** O gate de testes com a chave e o modo, ou null quando a chave não existe. */
export function gateDeSelecao(config: { gates?: GateComSelecao[] }): { nome: string; spec: SelecaoTestes } | null {
  const g = (config.gates ?? []).find((x) => x.selecao_testes !== undefined)
  return g ? { nome: g.nome, spec: g.selecao_testes as SelecaoTestes } : null
}
