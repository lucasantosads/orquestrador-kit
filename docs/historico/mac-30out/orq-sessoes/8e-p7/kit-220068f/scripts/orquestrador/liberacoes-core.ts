/**
 * liberacoes-core.ts — as formas vivas de `docs/fila/liberacoes.json`, lidas e
 * levadas para v2 (peça K8b-2). PURO: não abre arquivo, não escreve, não sai.
 *
 * É o lado TypeScript da mesma regra que `lib.sh:liberacao_ok` aplica em `jq`
 * (peça K8b-1, `CONTRATO.md` §6.1). As duas existem porque o loop resolve
 * dependência em shell e a migração precisa de estrutura; o que elas NÃO podem é
 * discordar — e por isso o teste roda as duas contra os MESMOS arquivos reais de
 * `test/fixtures/liberacoes/`.
 *
 * As quatro formas, levantadas por `jq` no disco em 2026-09-08:
 *
 *   v2       tokens[] de objetos  {token, liberado_em, por, nota?}
 *   CI       tokens[] de strings COM o prefixo humano:
 *   Actus    tokens[] de strings SEM o prefixo
 *   Comarka  liberadas[] de objetos {token, em, por, nota} + tokens[] de strings
 */

/** Um registro v2. `origem` diz de qual forma ele veio — ver `Origem`. */
export interface TokenV2 {
  token: string
  liberado_em: string
  por: string
  nota?: string
  origem?: Origem
}

/**
 * De onde o registro veio. Não é enfeite: é o que impede a data de ser lida
 * como fato quando ela não é um. Um token que estava como string solta não tem
 * data nem dono no disco, e a migração NÃO inventa nenhum dos dois — grava
 * `desconhecido` e marca a origem.
 */
export type Origem = 'v2' | 'v1:tokens' | 'v1:liberadas'

/** Os valores válidos de `origem`, para reconhecer a que o arquivo já traz. */
export const ORIGENS: Origem[] = ['v2', 'v1:tokens', 'v1:liberadas']

export const DESCONHECIDO = 'desconhecido'

/** `^humano:[a-z-]+-[0-9A-Za-z-]+$` — o padrão de `schemas/liberacoes.schema.json`. */
export const RE_TOKEN = /^humano:[a-z-]+-[0-9A-Za-z-]+$/

/** O token INTEIRO, com o prefixo. Idempotente. */
export function comPrefixo(t: string): string {
  return t.startsWith('humano:') ? t : `humano:${t}`
}

/** O token sem o prefixo — a forma que o `.liberadas[]` legado guardava. */
export function semPrefixo(t: string): string {
  return t.startsWith('humano:') ? t.slice('humano:'.length) : t
}

/** O token de uma entrada, seja ela string ou objeto. `''` quando não há. */
function tokenDe(x: unknown): string {
  if (typeof x === 'string') return x
  if (x && typeof x === 'object') {
    const t = (x as { token?: unknown }).token
    if (typeof t === 'string') return t
  }
  return ''
}

function texto(x: unknown): string | undefined {
  return typeof x === 'string' && x.trim() !== '' ? x : undefined
}

/**
 * O arquivo já está em v2?
 *
 * As três condições, e cada uma por um motivo: `$schema_versao: 2` é o carimbo;
 * `liberadas` ausente porque a lista legada é dado que a v2 não tem onde pôr; e
 * todo item de `tokens` sendo objeto porque um único string solta ali significa
 * que a migração não passou (ou passou pela metade).
 *
 * `tokens: []` com o carimbo É v2: repo recém-instalado ainda não liberou nada.
 */
export function ehV2(raiz: unknown): boolean {
  if (!raiz || typeof raiz !== 'object') return false
  const o = raiz as Record<string, unknown>
  if (o.$schema_versao !== 2) return false
  if (o.liberadas !== undefined) return false
  const toks = o.tokens
  if (!Array.isArray(toks)) return false
  return toks.every((t) => !!t && typeof t === 'object' && typeof (t as { token?: unknown }).token === 'string')
}

/** Diz, em uma linha, em que forma o arquivo está — para relatório e recusa. */
export function descreverForma(raiz: unknown): string {
  if (ehV2(raiz)) return 'v2 (tokens[] de objetos)'
  if (!raiz || typeof raiz !== 'object') return 'ilegível (não é objeto JSON)'
  const o = raiz as Record<string, unknown>
  const partes: string[] = []
  const toks = Array.isArray(o.tokens) ? o.tokens : []
  const libs = Array.isArray(o.liberadas) ? o.liberadas : []
  if (toks.length) {
    const strings = toks.filter((t) => typeof t === 'string').length
    const objetos = toks.filter((t) => !!t && typeof t === 'object').length
    const semPref = toks.filter((t) => typeof t === 'string' && !t.startsWith('humano:')).length
    partes.push(
      `tokens[]: ${toks.length} (${strings} string, ${objetos} objeto` +
        (semPref ? `, ${semPref} sem o prefixo humano:` : '') +
        ')',
    )
  }
  if (libs.length) partes.push(`liberadas[]: ${libs.length} objeto(s) legado(s)`)
  if (o.$schema_versao === undefined) partes.push('sem $schema_versao')
  else if (o.$schema_versao !== 2) partes.push(`$schema_versao: ${JSON.stringify(o.$schema_versao)}`)
  return partes.length ? partes.join(' · ') : 'vazio'
}

export interface Migracao {
  /** O objeto v2 inteiro, pronto para gravar. */
  v2: { $schema_versao: 2; tokens: TokenV2[]; [k: string]: unknown }
  /** Uma linha por decisão tomada. É o relatório. */
  notas: string[]
  /** Quantas entradas foram lidas, no total, antes do dedup. */
  lidas: number
  /** Tokens que apareceram mais de uma vez, com quantas vezes cada. */
  duplicados: Array<{ token: string; vezes: number }>
}

/**
 * Qualquer forma viva → v2.
 *
 * REGRAS, todas do brief da etapa 5 e todas testadas contra os arquivos reais:
 *
 * - `liberado_em` = o campo `em` do legado quando existe;
 * - `por` e `nota` preservados como estão;
 * - prefixo `humano:` acrescentado onde falta;
 * - dedup POR TOKEN, com a ordem original preservada: a primeira aparição fixa
 *   a posição, e uma aparição posterior só ENRIQUECE o registro (preenche campo
 *   que ainda está `desconhecido` ou ausente). Nunca sobrescreve dado presente,
 *   nunca reordena. É a regra de "migração não apaga dado" aplicada ao caso em
 *   que o MESMO token existe nas duas listas — 13 tokens do Comarka estão assim;
 * - chave desconhecida da RAIZ (a `descricao` do Comarka, por exemplo) é
 *   copiada intacta para a saída e vira nota do relatório.
 *
 * A ordem em que as duas listas são lidas é a ordem em que as CHAVES aparecem
 * no arquivo, não uma ordem fixa deste código: "ordem original preservada" só
 * significa alguma coisa se a origem da ordem for o arquivo.
 */
export function migrar(raiz: unknown): Migracao {
  const notas: string[] = []
  if (!raiz || typeof raiz !== 'object' || Array.isArray(raiz)) {
    throw new Error('liberacoes.json não é um objeto JSON')
  }
  const o = raiz as Record<string, unknown>

  const porToken = new Map<string, TokenV2>()
  const vezes = new Map<string, number>()
  let lidas = 0

  const absorver = (entrada: unknown, origem: Origem) => {
    const bruto = tokenDe(entrada)
    if (!bruto) {
      notas.push(`entrada sem token em ${origem === 'v1:liberadas' ? 'liberadas[]' : 'tokens[]'}, PRESERVADA fora da lista: ${JSON.stringify(entrada)}`)
      return
    }
    lidas += 1
    const token = comPrefixo(bruto)
    vezes.set(token, (vezes.get(token) ?? 0) + 1)

    const obj = entrada && typeof entrada === 'object' ? (entrada as Record<string, unknown>) : {}
    // `liberado_em` (v2) e `em` (legado do Comarka) são o mesmo campo com dois
    // nomes; o rename é desta migração.
    const quando = texto(obj.liberado_em) ?? texto(obj.em)
    const quem = texto(obj.por)
    const nota = texto(obj.nota)

    // A `origem` que o registro JÁ carrega ganha da inferida pela lista em que
    // ele está agora. Sem isto, rodar a migração duas vezes reescreveria
    // `v1:tokens` como `v2` — o segundo `--aplicar` apagaria justamente o dado
    // que diz que aquela data é `desconhecido` por procedência, e não por
    // descuido. Migração idempotente não é elegância: é o que permite rodar
    // `--migrar` de novo sem medo depois de um `--dry-run` mal lido.
    const declarada = ORIGENS.includes(obj.origem as Origem) ? (obj.origem as Origem) : undefined
    const origemFinal = declarada ?? origem

    const ja = porToken.get(token)
    if (!ja) {
      porToken.set(token, {
        token,
        liberado_em: quando ?? DESCONHECIDO,
        por: quem ?? DESCONHECIDO,
        ...(nota ? { nota } : {}),
        origem: origemFinal,
      })
      return
    }
    // Segunda aparição: só preenche buraco, nunca sobrescreve.
    if (ja.liberado_em === DESCONHECIDO && quando) ja.liberado_em = quando
    if (ja.por === DESCONHECIDO && quem) ja.por = quem
    if (!ja.nota && nota) ja.nota = nota
    // Origem já registrada não é substituída: a primeira aparição é a que conta.
    if (!ja.origem) ja.origem = origemFinal
  }

  // A ordem das chaves no arquivo manda.
  for (const chave of Object.keys(o)) {
    if (chave === 'tokens' && Array.isArray(o.tokens)) {
      for (const t of o.tokens) absorver(t, typeof t === 'object' && t ? 'v2' : 'v1:tokens')
    } else if (chave === 'liberadas' && Array.isArray(o.liberadas)) {
      for (const l of o.liberadas) absorver(l, 'v1:liberadas')
    }
  }

  // Chaves de raiz que não são as duas listas nem o carimbo: PRESERVADAS.
  const extras: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(o)) {
    if (k === 'tokens' || k === 'liberadas' || k === '$schema_versao') continue
    extras[k] = v
    notas.push(`chave de raiz '${k}' preservada intacta (a migração não a entende e não a apaga)`)
  }

  const tokens = [...porToken.values()]
  const duplicados = [...vezes.entries()]
    .filter(([, n]) => n > 1)
    .map(([token, n]) => ({ token, vezes: n }))

  for (const t of tokens) {
    if (!RE_TOKEN.test(t.token)) {
      notas.push(`token '${t.token}' NÃO casa ${RE_TOKEN.source} — migrado assim mesmo; 'orq liberar' recusaria um token novo neste formato`)
    }
  }
  const semData = tokens.filter((t) => t.liberado_em === DESCONHECIDO).length
  if (semData) {
    notas.push(`${semData} token(s) sem data no disco: liberado_em = '${DESCONHECIDO}'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio`)
  }

  return {
    v2: { $schema_versao: 2, ...extras, tokens },
    notas,
    lidas,
    duplicados,
  }
}

/**
 * O token existe no arquivo, em QUALQUER forma? É a checagem de duplicata do
 * `orq liberar`, e ela olha as duas listas de propósito: liberar de novo um
 * token que já está em `liberadas[]` criaria duas verdades sobre a mesma
 * decisão humana.
 */
export function jaLiberado(raiz: unknown, token: string): boolean {
  if (!raiz || typeof raiz !== 'object') return false
  const o = raiz as Record<string, unknown>
  const todos = [
    ...(Array.isArray(o.tokens) ? o.tokens : []),
    ...(Array.isArray(o.liberadas) ? o.liberadas : []),
  ]
  const alvo = semPrefixo(token)
  return todos.some((x) => {
    const t = tokenDe(x)
    return t !== '' && semPrefixo(t) === alvo
  })
}
