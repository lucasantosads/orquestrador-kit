/**
 * tipos.ts — a estrutura `Evidencia` que os dois leitores devolvem (spec 7f-a §2).
 *
 * A extração e o modelo só veem isto: não há ramo por nome de repo. Todo
 * `arquivo` de `Ref` é relativo à raiz do repo e aponta o artefato ORIGINAL
 * (a linha também é a do original, nunca a do recorte).
 */

export type NomeLeitor = 'kit' | 'legado-comarka'

/** Uma prova: `arquivo:linha` e o trecho daquela linha (até 160 caracteres). */
export interface Ref {
  arquivo: string
  linha: number | null
  trecho: string
}

/** Onde a tentativa parou (o primeiro estágio que reprovou). */
export type Estagio =
  | 'agente'
  | 'enforcement'
  | 'diff_cap'
  | 'tsc'
  | 'vitest'
  | 'gate'
  | 'criterios'
  | 'build'
  | 'juiz'
  | 'juiz_ok_merge_falhou'
  | 'aprovado'
  | 'desconhecido'

/** Uma linha de um arquivo lido, com o número no ORIGINAL (1-based). */
export interface Linha {
  n: number
  t: string
}

/** O texto que o leitor guardou de um artefato: inteiro ou recortado. */
export interface Arquivo {
  /** relativo à raiz do repo, do original */
  rel: string
  linhas: Linha[]
  /** linhas do original (para conferir que uma `linha` cabe nele) */
  total: number
}

export interface Vermelho {
  arquivo: string
  linha: number | null
  it: string | null
  ref: Ref
}

export interface Falha {
  arquivo: string
  ref: Ref
  erro: Ref | null
}

export interface CriterioFalho {
  criterio: string
  cmd: string
  espera: string
  saida: string[]
  ref: Ref
}

export interface Juiz {
  aprovado: boolean | null
  motivo: string
  criterios_falhos: string[]
  ref: Ref
}

export interface Tentativa {
  /** 1-based dentro da série */
  n: number
  /** diretório da tentativa, relativo à raiz do repo */
  dir: string
  estagio: Estagio
  /** um por local `❯ arquivo:linha` do vitest; FAIL sem local entra com linha nula */
  vermelhos: Vermelho[]
  /** arquivos de teste com FAIL na tentativa */
  arquivos_vermelhos: string[]
  /** cada linha FAIL e a linha de erro logo abaixo dela (Error, AssertionError, timed out) */
  falhas: Falha[]
  criterios_falhos: CriterioFalho[]
  diff_arquivos: string[]
  diff_linhas: number | null
  /** a linha de resumo do diff.stat (ou do diff.patch contado) */
  diff_ref: Ref | null
  enforcement: { ok: boolean; violacoes: string[]; ref: Ref } | null
  juiz: Juiz | null
  /** o que o agente disse (pista, nunca prova sozinha) */
  agente_disse: string | null
  head: string | null
  dur_secs: number | null
  /** sinais de máquina no gate de testes (Timeout de worker, EMFILE, ENOSPC) */
  maquina: Ref[]
  /** o recorte do gate de testes, com o número da linha no original */
  recorte_vitest: Arquivo | null
  /** o recorte do criterios.txt (blocos FALHA inteiros) */
  recorte_criterios: Arquivo | null
  /** diff.stat inteiro (para o modelo) */
  diff_stat: Arquivo | null
  /** fonte em `head` de cada teste vermelho que o diff não tocou; null = não deu para ler */
  fontes: Record<string, string | null>
  /**
   * testes vizinhos que o executor ampliou NESTA tentativa (`allowlist-ampliada.txt`,
   * etapa 8c). Ausente quando o arquivo não existe: a tentativa sai como antes.
   */
  ampliados?: string[]
}

export interface Vizinho {
  ticket: string
  dir: string
  arquivo: string
  linha: number | null
  ts: string
  antes_do_bloqueio: boolean
}

export interface TicketLido {
  arquivo: string
  id: string
  slug: string
  status: string
  notas_status: string
  objetivo: string
  pathspec_allowlist: string[]
  criterios_aceite: unknown[]
  /** `dependencias` do ticket: ids de ticket e tokens `humano:` */
  dependencias: string[]
}

/**
 * Uma dependência do ticket e o estado dela AGORA (7f-b3): o `status` do
 * ticket (`done`, `pendente`, `bloqueado`…), `sem ticket`, e, para token
 * `humano:`, `liberado` ou `sem liberação` (docs/fila/liberacoes.json).
 */
export interface Dependencia {
  dep: string
  estado: string
}

export interface Bloqueio {
  quando: string | null
  /** token curto do motor: circuit_breaker, enforcement, retries_esgotados, base_vermelha… */
  token: string | null
  nota_do_motor: string
  tentativas: number
  origem: 'motor' | 'humano'
  refs: Ref[]
}

/** Um arquivo que o leitor leu: entra na assinatura e na cópia de evidência. */
export interface Lido {
  arquivo: string
  tamanho: number
  mtime_ns: string
  /** o conteúdo como o triador o guardou (recortado quando é o caso) */
  conteudo: string
  /** mapa de linhas originais quando `conteudo` é recorte */
  faixas?: [number, number][]
}

export interface Evidencia {
  leitor: NomeLeitor
  /** caminho absoluto da raiz do repo */
  repo: string
  id: string
  ticket: TicketLido | null
  bloqueio: Bloqueio
  tentativas: Tentativa[]
  /** merge recusado por mudança local na worktree alvo (árvore suja) */
  merge_recusado: { arquivos: string[]; refs: Ref[] } | null
  /** linhas do motor na série (REPROVA, DIFF-CAP, circuit breaker) */
  motor: Ref[]
  /** o motor já decidiu base vermelha (kit: `BLOQUEADO motivo=base_vermelha`) */
  base_vermelha_motor: { arquivos: string[]; ref: Ref } | null
  vizinhos: Vizinho[]
  config: { diff_cap_linhas: number | null; claude_timeout_secs: number | null }
  /** fontes de evidência que faltaram (regra de falta, §2) */
  falta: string[]
  /** o estado de cada dependência do ticket (leitor.ts); ausente = não lido */
  dependencias?: Dependencia[]
  lidos: Lido[]
}
