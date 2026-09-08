/**
 * perfil.ts — allowlist de tools por perfil de ticket (lógica pura testável).
 *
 * executor.sh usa cfg() + jq para a mesma lógica em bash; este módulo existe
 * para que os testes possam fazer assert na string de tools montada.
 *
 * PORTE (ORQ-02): vindo de comarka-os. `toolsForPerfil` veio sem alteração — já
 * era genérica, recebe o mapa de perfis por parâmetro.
 *
 * ADAPTAÇÃO: o que estava preso ao repo de origem não era esta função, e sim os
 * VALORES: lá as allowlists (config `perfis_tools` + ALLOWED_TOOLS do
 * executor.sh) citam `npx tsc` e `npx vitest`, que não são os comandos deste
 * repo. Em vez de hardcodar os nossos, `defaultToolsFromGates` DERIVA as
 * permissões Bash dos `cmd` dos gates do 000-config.json. Assim a allowlist não
 * pode divergir dos gates: mudou o gate, mudou a permissão.
 */

/** Tools sempre concedidas, independentes dos gates do repo. */
export const BASE_TOOLS: readonly string[] = [
  'Read',
  'Edit',
  'Write',
  'Glob',
  'Grep',
  'Bash(git add:*)',
  'Bash(git commit:*)',
  'Bash(git status:*)',
  'Bash(git diff:*)',
  'Bash(git log:*)',
  'Bash(git restore:*)',
  'Bash(ls:*)',
  'Bash(cat:*)',
  'Bash(mkdir:*)',
  'Bash(sed:*)',
  'Bash(grep:*)',
]

/**
 * Extrai os comandos invocáveis dos `cmd` dos gates.
 * Reconhece `npm run <script>`, o `npm test` cru e `npx <binário>`. Ordem de
 * primeira aparição, sem repetição — a allowlist é para leitura humana também.
 *
 * O `npx` entrou no ORQ-04: o gate de teste passou a chamar
 * `npx vitest run --testNamePattern ...` direto em apps/web, porque `npm run
 * test:web -- <flag>` não propaga a flag. Sem reconhecer npx, a allowlist
 * derivada não daria ao executor permissão para rodar o próprio gate.
 */
export function comandosDeGates(gateCmds: readonly string[]): string[] {
  const achados: string[] = []
  const push = (c: string) => {
    if (!achados.includes(c)) achados.push(c)
  }
  for (const cmd of gateCmds) {
    for (const m of cmd.matchAll(/npm\s+run\s+([A-Za-z0-9:_-]+)/g)) {
      const script = m[1]
      if (script) push(`npm run ${script}`)
    }
    // `npm test` (sem `run`) — não confundir com `npm test:algo`, que não existe.
    if (/npm\s+test(\s|$|;)/.test(cmd)) push('npm test')
    for (const m of cmd.matchAll(/npx\s+([A-Za-z0-9@/._-]+)/g)) {
      const bin = m[1]
      if (bin) push(`npx ${bin}`)
    }
  }
  return achados
}

/**
 * PREFIXO INVOCÁVEL de um `cmd` de critério (peça 0c, corrigido na 0e-b).
 *
 * Regra: corta no primeiro ESPAÇO DUPLO ou no primeiro PIPE **que esteja no
 * nível de cima** — fora de aspas e fora de `$(…)`. Os dois marcam, na prática,
 * onde o comando acaba e começa a formatação: `npm test  # nota`,
 * `npx vitest run x | grep -c foo`. O que sobra é o que o agente precisa ter
 * permissão para invocar.
 *
 * O `split` que fazia isso não sabia de aspas, e num `grep -E` o `|` quase
 * sempre está dentro delas. Medido nos 5 tickets do lote 8 (246-250), 105
 * critérios: **21 prefixos saíam com aspas abertas**. Ex.:
 *   test $(grep -cE 'export const WARN_(TRENDS|PERGUNTAS)_DEGRADADO' arq.ts) -eq 2
 * virava a permissão `Bash(test $(grep -cE 'export const WARN_(TRENDS)` — que não
 * casa nada, não autoriza nada, e ainda leva o agente a gastar turno contra ela.
 * Os cinco tickets já estão em `main` e vão drenar assim.
 *
 * `$(…)` conta junto com as aspas porque um `|` ali dentro é do subcomando, não
 * do encadeamento: cortar nele produziria `test $(grep -c x arq` — parêntese
 * aberto, tão inútil quanto a aspa aberta.
 */
export function prefixoDeCmd(cmd: string): string {
  let aspas: string | null = null
  let profundidade = 0
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]!
    // Em aspas SIMPLES a barra invertida não escapa (regra do shell); fora
    // delas, escapa — e um `\(` escapado não abre nível nenhum.
    if (aspas !== "'" && c === '\\') {
      i++
      continue
    }
    if (aspas) {
      if (c === aspas) aspas = null
      continue
    }
    if (c === "'" || c === '"') {
      aspas = c
      continue
    }
    if (c === '(') {
      profundidade++
      continue
    }
    if (c === ')') {
      if (profundidade > 0) profundidade--
      continue
    }
    if (profundidade > 0) continue
    if (c === '|') return cmd.slice(0, i).trim()
    if (c === ' ' && cmd[i + 1] === ' ') return cmd.slice(0, i).trim()
  }
  return cmd.trim()
}

/**
 * Um prefixo é SIMPLES quando não carrega metacaractere de shell. Só o simples
 * ganha a forma `:*` (casamento por prefixo): dar `:*` a algo que contém `&&`
 * ou `;` autorizaria emendar qualquer comando depois dele, o que é permissão
 * larga demais concedida por acidente de sintaxe. O composto entra só na forma
 * EXATA, que casa aquele comando e nada mais.
 */
export function prefixoSimples(prefixo: string): boolean {
  return prefixo.length > 0 && !/[&;|><$`()*\n]/.test(prefixo)
}

/**
 * Comando que NUNCA vira permissão, venha de onde vier.
 *
 * A allowlist passou a ser derivada de DADO (o `cmd` do ticket), e dado entra na
 * fila por gerador — o planejador escreve ticket. Sem esta lista, um `cmd` com
 * `rm -rf` viraria permissão de apagar, e um com `git push` viraria permissão de
 * publicar: as duas coisas que a doutrina proíbe em absoluto. O gate de ticket
 * já recusa cmd com prefixo proibido; isto é a segunda tranca, na porta que
 * concede o poder em vez da que aceita o ticket.
 */
export const COMANDO_PROIBIDO: readonly RegExp[] = [
  /^rm(\s|$)/,
  /^sudo(\s|$)/,
  /^chmod(\s|$)/,
  /^curl(\s|$)/,
  /^wget(\s|$)/,
  /^psql(\s|$)/,
  /^git\s+push(\s|$)/,
  /^supabase(\s|$)/,
  /^npx\s+supabase(\s|$)/,
]

export function comandoProibido(prefixo: string): boolean {
  return COMANDO_PROIBIDO.some((re) => re.test(prefixo))
}

/** Padrões Bash de UM comando: sempre o exato; `:*` só se for simples. */
export function padroesDeCmd(cmd: string): string[] {
  const p = prefixoDeCmd(cmd)
  if (!p || comandoProibido(p)) return []
  return prefixoSimples(p) ? [`Bash(${p})`, `Bash(${p}:*)`] : [`Bash(${p})`]
}

/**
 * A allowlist de tools do TICKET (peça 0c).
 *
 * Antes era lista fixa derivada só dos gates, e o agente do 227 provou o preço:
 * o prompt manda rodar o gate `typecheck_root`, a allowlist concedia
 * `Bash(npm run typecheck:root:*)`, o agente tentou `npm run typecheck` e levou
 * TRÊS negativas de permissão — 22 turnos e US$ 0,52 gastos contra uma parede,
 * e saiu sem commitar. Permissão que não cobre o que o ticket manda rodar é um
 * beco: o agente não tem como saber qual sinônimo o harness aceita.
 *
 * Agora a fonte é o que o ticket e o config MANDAM rodar: cada `cmd` de
 * `criterios_aceite` e os `cmd` dos gates. Não é afrouxamento — é alinhar a
 * permissão com a ordem. A lei continua sendo o ENFORCEMENT sobre o diff: o que
 * o agente pode EXECUTAR não decide o que ele pode ESCREVER.
 */
export function toolsDoTicket(gateCmds: readonly string[], criterioCmds: readonly string[] = []): string {
  const out: string[] = [...BASE_TOOLS]
  const push = (t: string) => {
    if (!out.includes(t)) out.push(t)
  }
  // Gates primeiro: são a ordem fixa do repo, e vêm pelo extrator de npm/npx,
  // que sabe achar comando no meio de um cmd composto (o `testes_por_pacote`
  // deste repo é um script de shell inteiro, não um comando).
  for (const c of comandosDeGates(gateCmds)) {
    if (comandoProibido(c)) continue
    push(`Bash(${c})`)
    push(`Bash(${c}:*)`)
  }
  // Critérios depois: o prefixo literal do que o ticket manda rodar.
  for (const cmd of criterioCmds) for (const t of padroesDeCmd(cmd)) push(t)
  return out.join(',')
}

/**
 * Monta a string de tools default a partir dos gates do config.
 * Mantida como fachada de `toolsDoTicket` sem critérios: é o que o CLI usa
 * quando o chamador não passa o ticket.
 */
export function defaultToolsFromGates(gateCmds: readonly string[]): string {
  return toolsDoTicket(gateCmds, [])
}

/**
 * Retorna a string de tools para um dado perfil.
 * Se perfil for nulo/vazio/desconhecido, retorna defaultTools (backward-compatible).
 */
export function toolsForPerfil(
  perfil: string | null | undefined,
  perfisTools: Record<string, string>,
  defaultTools: string,
): string {
  if (!perfil || perfil === 'null') return defaultTools
  return perfisTools[perfil] ?? defaultTools
}
