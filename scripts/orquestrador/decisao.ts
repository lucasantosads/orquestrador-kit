/**
 * decisao.ts — lógica de decisão do executor (ORQ-05a). PURA: sem worktree,
 * sem git, sem claude, sem rede. Recebe estado, devolve decisão.
 *
 * O executor.sh (ORQ-05b) vira casca fina que chama estas funções, do mesmo
 * jeito que enforcement.sh chama enforcement-core.ts. Toda regra vem do
 * 000-config.json — nenhum limite, código de saída, nome de modelo ou lista de
 * causas aparece hardcoded aqui.
 */

export interface DecisaoConfig {
  executor_model: string
  avaliador_model: string
  retry_final_model: string
  max_retries: number
  diff_cap_linhas: number
  worktrees_prefixo: string
  restricao_execucao: {
    ativa: boolean
    tickets_permitidos: string[]
    acao_ticket_fora_da_allowlist: string
    recusa_exit_code: number
    recusa_mensagem: string
  }
  politica_adiamento: { causas_que_adiam: string[] }
  politica_retry: { por_causa: Record<string, { modelo: string; acao: string }> }
}

// ─── 1 · restricao_execucao ────────────────────────────────────────────────

/**
 * Um papel está indefinido quando seu valor é um marcador PENDENTE_*, não um
 * modelo. Detectar pelo prefixo em vez de comparar com "PENDENTE_TK104" mantém
 * a regra viva quando o marcador mudar de número.
 */
export function modeloIndefinido(valor: string): boolean {
  return /^PENDENTE_/.test(valor)
}

/**
 * O `claude` aceitou o modelo pedido? Ele NÃO sai com código de erro quando o id
 * é desconhecido: responde texto e segue, e o run acaba com diff vazio que o
 * harness lê como reprovação de mérito. Detectar isso pelo TEXTO é o que
 * permite tratar como erro de CONFIGURAÇÃO no preflight, antes do gasto.
 */
export function modeloRecusado(saida: string): boolean {
  return /unrecognized_model|issue with the selected model|is not a model this version|model[^\n]{0,40}(not found|does not exist|no access)/i.test(
    saida,
  )
}

export function papeisPendentes(config: DecisaoConfig): string[] {
  return (['executor_model', 'avaliador_model', 'retry_final_model'] as const).filter((p) =>
    modeloIndefinido(config[p]),
  )
}

export interface Recusa {
  permitido: boolean
  exitCode: number
  mensagem?: string
  motivo?: string
}

/**
 * Enquanto QUALQUER papel estiver pendente, só os tickets da allowlist rodam.
 * Recusa não é falha do ticket: não consome retry, não bloqueia. Sai com o
 * código do config.
 */
export function avaliaRestricaoExecucao(config: DecisaoConfig, ticketSlug: string): Recusa {
  const r = config.restricao_execucao
  const pendentes = papeisPendentes(config)
  if (!r.ativa || pendentes.length === 0) return { permitido: true, exitCode: 0 }
  if (r.tickets_permitidos.includes(ticketSlug)) return { permitido: true, exitCode: 0 }
  return {
    permitido: false,
    exitCode: r.recusa_exit_code,
    mensagem: r.recusa_mensagem,
    motivo: `papéis pendentes: ${pendentes.join(', ')}`,
  }
}

// ─── 2 · fronteira adiar vs reprovar ───────────────────────────────────────

export type CausaInfra =
  | 'conexao'
  | 'sessao'
  | 'rate_limit'
  | 'quota'
  | 'timeout'
  | 'gate_interrompido'
  | 'juiz_ilegivel'
export type CausaMerito = 'diff_cap' | 'enforcement' | 'criterio_qualidade'
export type Desfecho = 'aprovado' | 'adiado' | 'reprovado' | 'refatiar'

/**
 * Qual causa de infra cada rótulo do config representa. O config é a
 * AUTORIDADE: causa detectada cujo rótulo não esteja em causas_que_adiam não
 * adia. Tirar um rótulo de lá desliga aquele adiamento.
 */
const ROTULO_PARA_CAUSA: [RegExp, CausaInfra][] = [
  [/conex/i, 'conexao'],
  [/sess/i, 'sessao'],
  [/rate\s*limit/i, 'rate_limit'],
  [/quota/i, 'quota'],
  [/timeout|rel[oó]gio/i, 'timeout'],
  [/gate\s+interrompido/i, 'gate_interrompido'],
  [/ju[ií]z|veredito/i, 'juiz_ilegivel'],
]

export function causasDeAdiamentoDoConfig(config: DecisaoConfig): Set<CausaInfra> {
  const out = new Set<CausaInfra>()
  for (const rotulo of config.politica_adiamento.causas_que_adiam) {
    for (const [re, causa] of ROTULO_PARA_CAUSA) if (re.test(rotulo)) out.add(causa)
  }
  return out
}

export interface SinalTentativa {
  /** exit do claude_run: 124 timeout, 129/130 morto por fora. */
  exitCode: number
  /** stdout+stderr da tentativa (para casar padrão de rede/sessão/cota). */
  saida: string
  diffLines: number
  /** true quando algum gate foi interrompido no meio (ORQ-04). */
  gateInterrompido?: boolean
  /**
   * true quando a barreira (enforcement-core) reprovou o diff. Campo PRÓPRIO, e
   * não mais um texto empurrado para dentro de criteriosFalhos: enforcement e
   * qualidade são causas diferentes e pedem remédios diferentes no retry.
   */
  enforcementViolado?: boolean
  /** critérios de aceite / avaliador que reprovaram por conteúdo. */
  criteriosFalhos?: string[]
  /**
   * true quando o juiz (passo 7) NÃO produziu veredito legível — resposta
   * ilegível, ou a chamada do juiz caiu em limite/timeout. Nos dois casos não
   * houve julgamento do TRABALHO, e reprovar por isso queimaria retry de um
   * ticket nunca julgado: é a mesma regra do envelope ausente (A9) e da
   * armadilha do parser na SKILL ("falha de parse = adiado, nunca reprovação").
   */
  juizIlegivel?: boolean
}

const PADRAO_CAUSA: [RegExp, CausaInfra][] = [
  [/ECONNRESET|ECONNREFUSED|ETIMEDOUT|EAI_AGAIN|EPIPE|socket hang up|network error|connection (reset|refused|closed)|fetch failed|went to sleep/i, 'conexao'],
  // K11a-3 · os padrões de AUTENTICAÇÃO do actus-saas (`SINAIS_AUTENTICACAO`,
  // executor.mjs:189-196), copiados do texto REAL do incidente de 13/08/2026 —
  // não de uma paráfrase. Eles são `sessao` porque é isso que são: a FERRAMENTA
  // indisponível, nunca reprovação do trabalho. Ficar de fora custava um retry
  // por tentativa até o ticket bloquear, sem ninguém ter julgado nada.
  [/session expired|sess[aã]o expirada|invalid session|session not found|token expired|reauthenticate|please (log ?in|sign ?in) again|failed\s+to\s+authenticate|authentication_error|not\s+authenticated|please\s+run\s+\/login|invalid\s+api\s+key/i, 'sessao'],
  // `service unavailable` e `503` vêm da mesma lista do Actus (executor.mjs:211-221),
  // que trata limite e INDISPONIBILIDADE como a mesma família. O `503` entra com
  // borda de PALAVRA, e não por substring como lá: `15039 tokens` numa saída
  // qualquer viraria adiamento.
  [/rate[ _-]?limit|too many requests|\(429\)|overloaded|service unavailable|\b503\b/i, 'rate_limit'],
  [/quota|usage limit|usage_cap_reached|credit balance/i, 'quota'],
]

/** Detecta causa de INFRA. null quando nada de infra aconteceu. */
export function detectarCausaInfra(sinal: SinalTentativa): CausaInfra | null {
  // ANTES do curto-circuito de exitCode===0: o juiz roda DEPOIS de o agente
  // sair com rc=0, então a tentativa inteira é bem-sucedida e o único sinal de
  // que não houve veredito é este campo.
  if (sinal.juizIlegivel) return 'juiz_ilegivel'
  if (sinal.exitCode === 124) return 'timeout'
  if (sinal.exitCode === 129 || sinal.exitCode === 130) return 'gate_interrompido'
  if (sinal.gateInterrompido) return 'gate_interrompido'
  // Gate duplo: texto só conta quando a chamada de fato falhou. Um ticket que
  // MENCIONE "rate limit" no código sai com rc=0 e nunca dispara adiamento.
  if (sinal.exitCode === 0) return null
  // Envelope ausente (A9): com --output-format json, um CLI que chegou a rodar
  // SEMPRE imprime envelope, mesmo em erro. Saída vazia com rc!=0 é CLI que
  // morreu antes de falar — login caído, credencial expirada, processo morto.
  // Classificado como 'sessao' porque é isso que ele é, e porque assim o config
  // continua sendo a autoridade: tirar "sessão expirada" de causas_que_adiam
  // desliga este adiamento junto com os outros da mesma família.
  // Gêmeo do `sem_envelope` no lib.sh — os dois têm que concordar.
  if (sinal.saida.trim() === '') return 'sessao'
  for (const [re, causa] of PADRAO_CAUSA) if (re.test(sinal.saida)) return causa
  return null
}

export interface Veredito {
  desfecho: Desfecho
  causa?: CausaInfra | CausaMerito
  motivo: string
  contaComoRetry: boolean
}

/**
 * A fronteira, agora com TRÊS lados em vez de dois.
 *
 * INFRA adia e nunca reprova. Reprovação MECÂNICA — diff acima do cap, arquivo
 * fora da allowlist, zona proibida — vira `refatiar` (regra 19): o problema não
 * é capacidade nem qualidade, é TAMANHO ou FRONTEIRA, e nenhum dos dois se
 * conserta repetindo a mesma tentativa. Retry é só para erro de implementação
 * com todos os cheques mecânicos verdes.
 *
 * Foi o que travou o 201 duas vezes: as tentativas que respeitaram a fronteira
 * ficavam vermelhas no gate e as que a cruzaram caíam no enforcement — três
 * ciclos pagos para chegar a uma conclusão que era do humano, não do agente.
 */
export function decidirDesfecho(config: DecisaoConfig, sinal: SinalTentativa): Veredito {
  const infra = detectarCausaInfra(sinal)
  if (infra && causasDeAdiamentoDoConfig(config).has(infra)) {
    return { desfecho: 'adiado', causa: infra, motivo: `infraestrutura: ${infra}`, contaComoRetry: false }
  }
  if (sinal.diffLines > config.diff_cap_linhas) {
    return {
      desfecho: 'refatiar',
      causa: 'diff_cap',
      motivo: `diff de ${sinal.diffLines} linhas acima do cap de ${config.diff_cap_linhas}`,
      contaComoRetry: false,
    }
  }
  if (sinal.enforcementViolado) {
    return {
      desfecho: 'refatiar',
      causa: 'enforcement',
      motivo: 'barreira: violação de zona/escopo (ver enforcement.json)',
      contaComoRetry: false,
    }
  }
  if (sinal.criteriosFalhos && sinal.criteriosFalhos.length > 0) {
    return {
      desfecho: 'reprovado',
      causa: 'criterio_qualidade',
      motivo: `critério(s) reprovado(s): ${sinal.criteriosFalhos.join('; ')}`,
      contaComoRetry: true,
    }
  }
  if (sinal.exitCode !== 0) {
    return { desfecho: 'reprovado', causa: 'criterio_qualidade', motivo: `exit ${sinal.exitCode}`, contaComoRetry: true }
  }
  return { desfecho: 'aprovado', motivo: 'gates e critérios verdes', contaComoRetry: false }
}

// ─── 3 · política de retry ─────────────────────────────────────────────────

export interface PlanoRetry {
  deveTentar: boolean
  modelo: string
  escalou: boolean
  estreitarEscopo: boolean
  acao: string
  motivo: string
}

/**
 * Causas em que ESCALAR modelo é proibido, aconteça o que acontecer com o
 * config. `diff_cap` é falha de TAMANHO: um modelo mais forte escreve o mesmo
 * excesso, só mais caro. `enforcement` é violação de FRONTEIRA: a barreira não
 * julgou o trabalho, disse que o diff saiu do lugar permitido — e capacidade não
 * é o que faz um diff respeitar a pathspec. Escalar nos dois é gasto sem
 * hipótese; nos dois o remédio é manter o modelo e estreitar o escopo.
 */
const NUNCA_ESCALA: readonly string[] = ['diff_cap', 'enforcement']

/**
 * A causa decide o remédio. `diff_cap` e `enforcement` MANTÊM o modelo e
 * estreitam o escopo; `criterio_qualidade` — falha de CAPACIDADE — escala para
 * retry_final_model. A asserção abaixo não é decorativa: config que mande
 * escalar numa causa de NUNCA_ESCALA é REJEITADA, não obedecida.
 */
export function decidirRetry(
  config: DecisaoConfig,
  veredito: Veredito,
  tentativaAtual: number,
  modeloAtual: string,
): PlanoRetry {
  const base = { escalou: false, estreitarEscopo: false, modelo: modeloAtual }
  // `refatiar` cai aqui junto com `adiado` e `aprovado`: reprovação mecânica NÃO
  // gera retry (regra 19). As regras de `diff_cap`/`enforcement` em
  // politica_retry seguem valendo como CONTRATO — a proibição de escalar modelo
  // por tamanho ou fronteira continua sendo verificada abaixo —, mas o caminho
  // normal já não passa por elas.
  if (veredito.desfecho !== 'reprovado') {
    return { ...base, deveTentar: false, acao: 'nenhuma', motivo: `desfecho ${veredito.desfecho} não gera retry` }
  }
  if (tentativaAtual >= config.max_retries) {
    return { ...base, deveTentar: false, acao: 'bloquear', motivo: `max_retries ${config.max_retries} atingido` }
  }
  const causa = String(veredito.causa)
  const regra = config.politica_retry.por_causa[causa]
  if (!regra) {
    return { ...base, deveTentar: false, acao: 'bloquear', motivo: `sem regra de retry para a causa '${causa}'` }
  }
  // ANTES do ramo ESCALAR: a proibição tem que vencer o config, e não só pegar
  // valor desconhecido. Com a checagem depois, um config com modelo:'ESCALAR'
  // em diff_cap escalava de verdade e a asserção nunca era alcançada.
  if (NUNCA_ESCALA.includes(causa) && regra.modelo !== 'MANTER') {
    throw new Error(
      `config inválida: escalar modelo por ${causa} é proibido (falha de ${causa === 'diff_cap' ? 'tamanho' : 'fronteira'}, não de capacidade)`,
    )
  }
  if (regra.modelo === 'ESCALAR') {
    return {
      deveTentar: true,
      modelo: config.retry_final_model,
      escalou: config.retry_final_model !== modeloAtual,
      estreitarEscopo: false,
      acao: regra.acao,
      motivo: `${causa}: escala modelo`,
    }
  }
  // MANTER — chega aqui só quem não é NUNCA_ESCALA ou já passou pela asserção.
  return {
    deveTentar: true,
    modelo: modeloAtual,
    escalou: false,
    estreitarEscopo: true,
    acao: regra.acao,
    motivo: `${causa}: mantém modelo e estreita escopo`,
  }
}

// ─── 4 · registro do meta.json ─────────────────────────────────────────────

export interface RegistroMeta {
  attempt: number
  model: string
  claude_dur_secs: number
  diff_lines: number
  resultado: string
  ts: string
}

/** Monta a entrada de telemetria de UMA tentativa. `ts` entra injetado. */
export function registroMeta(entrada: {
  attempt: number
  modelo: string
  duracaoSecs: number
  diffLines: number
  resultado: string
  ts: string
}): RegistroMeta {
  return {
    attempt: entrada.attempt,
    model: entrada.modelo,
    claude_dur_secs: Math.max(0, Math.round(entrada.duracaoSecs)),
    diff_lines: Math.max(0, entrada.diffLines),
    resultado: entrada.resultado,
    ts: entrada.ts,
  }
}

// ─── 5 · nome da worktree ──────────────────────────────────────────────────

/**
 * `<prefixo><id>`. O prefixo vem do config porque ../_worktrees é compartilhado
 * com outros repos: sem ele, dois repos com o mesmo id de ticket colidem — e o
 * loop remove worktree ao final, então a colisão apagaria trabalho alheio.
 */
export function nomeWorktree(prefixo: string, id: string): string {
  // Colapsa `..` ANTES de trocar o resto: um id como '../fora' não pode virar
  // nome com travessia nem carregar '..' literal para dentro de _worktrees.
  const limpo = String(id)
    .trim()
    .replace(/\.{2,}/g, '-')
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+|[-.]+$/g, '')
  if (!limpo) throw new Error('id de ticket vazio: worktree sem nome colide com qualquer outra')
  if (!prefixo) throw new Error('worktrees_prefixo ausente no config: worktree sem prefixo pode colidir com outro repo')
  return `${prefixo}${limpo}`
}

/** Lê o prefixo do config, falhando alto se o campo não existir. */
export function prefixoDeWorktree(config: DecisaoConfig): string {
  const p = config.worktrees_prefixo
  if (!p) throw new Error('config sem worktrees_prefixo')
  return p
}
