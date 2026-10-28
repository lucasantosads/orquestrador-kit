/**
 * juiz.ts — o passo 7 do pipeline (SKILL, Arquitetura da Fase 2). PURO: monta
 * prompt, escolhe o nível e lê o veredito. Não chama modelo, não toca git, não
 * lê worktree — quem faz a chamada paga é o executor.sh, que já sabe medir
 * custo e adiar por infra.
 *
 * POR QUE ELE EXISTE (PLAYBOOK 2026-09-03, auditoria dos 7 tickets v2): até
 * aqui todo "aprovado" saiu de gate mecânico. O ticket 204 passou afirmando a
 * AUSÊNCIA de três strings que já não existiam na base dele, sem nenhuma
 * asserção positiva no mesmo render — verde no gate, inútil como prova. É
 * exatamente a classe de coisa que só um juiz pega.
 *
 * INDEPENDÊNCIA (custo-e-contexto §7): a entrada é diff cru + saída dos gates +
 * critérios do ticket. NUNCA o prompt do executor, NUNCA o resumo do agente. O
 * que o agente diz que fez não é evidência de nada.
 */
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join, normalize } from 'node:path'
import { globToRegExp } from './enforcement-core.js'

export interface JuizCfg {
  juiz: {
    diff_max_baixo: number
    max_tokens_veredicto: number
    paths_alto_risco: string[]
    palavras_alto_risco: string[]
  }
  modelos: { juiz_baixo: string; juiz_alto: string }
}

export interface CriterioTicket {
  tipo?: string
  descricao: string
  cmd?: string
  espera?: string
}

// ─── 1 · classe de risco (custo-e-contexto §7) ─────────────────────────────

export interface EntradaRisco {
  /** arquivos tocados pelo diff da tentativa (git diff --name-only). */
  arquivos: string[]
  objetivo: string
  diffLines: number
  /** true na ÚLTIMA tentativa: aí o juiz é sempre o forte. */
  retryFinal: boolean
}

export interface Risco {
  classe: 'alto' | 'baixo'
  motivo: string
}

/**
 * Alto quando QUALQUER uma bate: path do diff em `paths_alto_risco`, palavra de
 * `palavras_alto_risco` no objetivo, diff acima de `diff_max_baixo`, ou é o
 * retry final. Baixo só quando nenhuma bate — a dúvida sobe, nunca desce.
 *
 * A palavra casa por SUBSTRING no objetivo em minúsculas, e é assim de
 * propósito: a lista do config tem radicais (`permiss`) que existem para pegar
 * "permissão"/"permissions"/"permissionamento" de uma vez.
 */
export function classeDeRisco(cfg: JuizCfg, e: EntradaRisco): Risco {
  if (e.retryFinal) return { classe: 'alto', motivo: 'retry final' }
  const path = e.arquivos.find((f) => cfg.juiz.paths_alto_risco.some((g) => globToRegExp(g).test(f)))
  if (path) return { classe: 'alto', motivo: `path de alto risco no diff: ${path}` }
  const obj = (e.objetivo ?? '').toLowerCase()
  const palavra = cfg.juiz.palavras_alto_risco.find((p) => obj.includes(p.toLowerCase()))
  if (palavra) return { classe: 'alto', motivo: `palavra de alto risco no objetivo: ${palavra}` }
  if (e.diffLines > cfg.juiz.diff_max_baixo) {
    return { classe: 'alto', motivo: `diff de ${e.diffLines} linhas acima de ${cfg.juiz.diff_max_baixo}` }
  }
  return { classe: 'baixo', motivo: 'gates verdes, diff pequeno, nenhum path nem palavra de risco' }
}

export function modeloDoJuiz(cfg: JuizCfg, classe: 'alto' | 'baixo'): string {
  const m = classe === 'alto' ? cfg.modelos.juiz_alto : cfg.modelos.juiz_baixo
  if (!m) throw new Error(`config sem modelos.juiz_${classe === 'alto' ? 'alto' : 'baixo'}`)
  return m
}

// ─── 2 · prompt ────────────────────────────────────────────────────────────

export interface EntradaPrompt {
  id: string
  objetivo: string
  criterios: CriterioTicket[]
  /** pathspec_allowlist do ticket — só para o juiz saber onde cobrar afrouxamento. */
  allowlist: string[]
  /** `git diff base...HEAD` da worktree do ticket, CRU. */
  diff: string
  /** conteúdo de gates.txt (saída do motor de gates). */
  gates: string
  /**
   * Aviso do HARNESS sobre como esta tentativa chegou até aqui — não sobre o
   * mérito dela. Hoje só existe um: o commit foi dado pelo executor porque o
   * agente saiu sem commitar. O juiz precisa saber disso para não ler a ausência
   * de mensagem de commit escrita pelo agente como desleixo, e para pesar que o
   * diff pode estar num ponto intermediário do trabalho. Opcional: sem nota, o
   * prompt sai exatamente como antes.
   */
  nota?: string
  /**
   * Ticket 622 — `contexto_juiz` do ticket: arquivos de REFERÊNCIA que o
   * critério manda comparar e que NÃO fazem parte do diff (caso do 501: "compare
   * linha a linha contra a 0264", com a 0264 fora do diff). O conteúdo é o da
   * BASE da tentativa, lido pelo executor.sh (`contexto_juiz_json`), já com o
   * truncamento marcado. Ausente ou vazio: o prompt sai byte a byte como antes.
   */
  contexto?: { path: string; conteudo: string }[]
  /**
   * Ticket 628 — definições (função/fixture) chamadas pelos testes ADICIONADOS
   * no diff e definidas FORA dele, no estado da BASE. Ausente ou vazio: o
   * prompt sai byte a byte como antes.
   */
  definicoes?: DefinicaoChamada[]
  /**
   * Etapa 8c — testes vizinhos que o executor ampliou (fora da allowlist do
   * ticket; quebraram com o diff e passam na base). Ausente ou vazio: o prompt
   * sai byte a byte como antes.
   */
  ampliados?: string[]
  /**
   * Etapa 8e (P1) — `git log --format='commit %H%n%n%B' base..HEAD`, CRU. Texto
   * do AGENTE: entra rotulado como declaração, nunca como evidência. Ausente ou
   * vazio (nenhum commit em base..HEAD): o prompt sai byte a byte como antes.
   */
  commits?: string
  /**
   * Etapa 8e (P3) — anexo de `anexoCitacoes`: trechos da BASE de cada
   * `arquivo:linha` e uma linha de `git show -s` de cada sha citados nas linhas
   * adicionadas dos .md do diff. Ausente ou vazio: o prompt sai como antes.
   */
  anexo?: string
  /**
   * Etapa 8e (P4) — conteúdo de `juiz.review_md` (as regras de revisão do repo),
   * lido da BASE pelo executor.sh. Ausente ou vazio: o prompt sai como antes.
   */
  review?: string
  /**
   * Etapa L11: `rundir/instaveis.txt`: arquivos com FAIL no gate de testes, sem
   * relação com o diff, que passaram rodados isolados (no máximo 3). Ausente ou
   * vazio: o prompt sai byte a byte como antes.
   */
  instaveis?: string[]
}

/** A allowlist inclui arquivo de teste? Só então o bloco anti-afrouxamento entra. */
export function tocaTeste(allowlist: string[]): boolean {
  return allowlist.some((p) => /\.(test|spec)\./.test(p))
}

const CABECALHO = `Você é o JUIZ de uma esteira automatizada. Julgue SOMENTE pelo material abaixo:
o diff cru da tentativa, a saída dos gates mecânicos e os critérios do ticket.
Você NÃO recebe o prompt do executor nem resumo nenhum do agente, de propósito:
o que o agente diz que fez nunca é evidência. Se algo não está no diff, não aconteceu.

VOCÊ NÃO TEM FERRAMENTAS. Não leia arquivo, não rode comando, não abra o
repositório: a chamada está sem ferramenta nenhuma e qualquer tentativa só
gasta turno. Se o material abaixo não basta para aprovar, REPROVE dizendo o
que faltou — nunca aprove no benefício da dúvida.

Os gates mecânicos JÁ PASSARAM (enforcement, typecheck, testes, critérios, build).
Você não os reexecuta: o seu trabalho é o que eles não conseguem ver.`

const COBRANCAS = `O QUE VOCÊ COBRA, item a item:

1. INTEGRAÇÃO, não existência. Componente/função/rota criada mas nunca importada,
   montada ou chamada passa em "arquivo existe" e falha em produção. Siga a
   variável ou o símbolo até o ponto de uso real; um resultado calculado e
   descartado não vale.
2. O TESTE EXERCITA O COMPORTAMENTO DO OBJETIVO. Teste tautológico
   (expect(true), expect(x).toBeDefined() sobre algo trivialmente definido,
   asserção que passaria com o código antigo) NÃO prova nada. Pergunte-se: este
   teste ficaria VERMELHO se a mudança fosse revertida? Se não, reprove.
3. CRITÉRIO DE AUSÊNCIA EXIGE CONTROLE POSITIVO. Um teste que só afirma que algo
   NÃO aparece passa igual quando o componente não renderiza nada. Exija, no
   MESMO render/execução, ao menos uma asserção POSITIVA de que a coisa certa
   apareceu. Reprove ausência provada no vazio.`

const ANTI_AFROUXAMENTO = `4. ANTI-AFROUXAMENTO (a allowlist deste ticket inclui arquivo de teste).
   No diff dos arquivos de teste, REPROVE se encontrar qualquer um destes:
   - asserção removida (expect apagado) sem que o comportamento tenha deixado de existir;
   - toBe/toEqual trocado por toBeDefined/toBeTruthy/objectContaining mais frouxo;
   - .skip, .todo, .only, teste comentado ou arquivo de teste deletado;
   - valor esperado alterado SEM comentário dizendo por que a regra nova o muda.
   Valor RECALCULADO sob a regra nova, com o porquê em comentário, é o único
   caminho aceito. Renomear símbolo para satisfazer contagem também é afrouxar.`

/** Etapa 8c: o enforcement já barra o afrouxamento por contagem; aqui fica o que ele não vê. */
/** Etapa L11: o gate de testes ficou fora da conta por instável que passou isolado. */
function blocoInstaveis(instaveis: string[]): string[] {
  return [
    '',
    'TESTE INSTÁVEL FORA DA CONTA (aviso do harness, não do agente):',
    `A suíte ficou vermelha (a saída dos gates abaixo mostra FALHA no gate de testes) SÓ
em teste sem relação com o diff que passou rodado isolado. Os gates depois dele rodaram
na retomada, no fim da saída. Não reprove por esse FAIL; o resto vale como sempre:`,
    ...instaveis.map((t) => `  - ${t}`),
  ]
}

function blocoAmpliados(ampliados: string[]): string[] {
  return [
    '',
    `5. TESTE VIZINHO AMPLIADO (o executor liberou estes testes, fora da allowlist do ticket,
   porque quebraram com o diff e passam na base):`,
    ...ampliados.map((t) => `  - ${t}`),
    `   No diff deles, REPROVE se o ajuste muda o DADO do teste (lista de exceções, de
   pendências, fixture) para ele passar sem o comportamento que cobra, ou muda o valor
   esperado sem que o OBJETIVO exija o comportamento novo. A contagem de it/expect, os
   .skip e os matchers genéricos o enforcement já barrou; o que sobra é com você.`,
  ]
}

const FORMATO = `RESPONDA SÓ COM ESTE JSON, sem cerca de código, sem texto antes ou depois:
{"aprovado": true|false, "motivo": "<=2 frases, concreto, citando arquivo e linha>",
 "criterios_falhos": ["descrição exata do critério que você reprova", ...]}

criterios_falhos: use a DESCRIÇÃO do critério, copiada como está na lista acima.
Vazio quando aprovado. Na dúvida entre aprovar e reprovar, REPROVE e diga o que falta.`

/**
 * Bloco de referência (ticket 622). A frase sobre o papel da referência mora
 * AQUI, e não no CABECALHO, de propósito: o CABECALHO é igual para todo
 * ticket, e ticket sem `contexto_juiz` tem que produzir o prompt de antes byte
 * a byte (item (a) do 622). Só quem declara referência recebe a frase.
 */
function blocoReferencia(contexto: { path: string; conteudo: string }[]): string[] {
  return [
    '',
    'ARQUIVOS DE REFERÊNCIA (estado na base, NÃO fazem parte do diff):',
    'O ticket declarou estes arquivos para você COMPARAR com o diff. Eles não são',
    'trabalho do ticket e não provam nada sozinhos: o que você julga continua sendo o diff.',
    ...contexto.flatMap((c) => [
      '',
      `--- ${c.path} (estado na base, NÃO faz parte do diff) ---`,
      c.conteudo.replace(/\n+$/, ''),
      `--- fim de ${c.path} ---`,
    ]),
  ]
}

// ─── 2b · definições chamadas pelos testes novos (ticket 628) ───────────────
//
// Causa (auditoria de 22/09/2026): no 488b o juiz reprovou três vezes porque
// inferiu pelo NOME que `payloadSoComAnexo()` trazia anexo. Na base a fixture
// era `body: ""` sem `attachments`, exatamente o cenário pedido, e o corpo dela
// não estava no diff nem no `contexto_juiz`. O juiz continua sem ferramentas:
// quem lê é o harness, da BASE da tentativa.

export interface DefinicaoChamada {
  path: string
  linha: number
  nome: string
  corpo: string
}

/** Mesmos tetos do 622 (executor.sh, JUIZ_CTX_MAX_LINHAS_*). */
export const TETO_DEF_LINHAS_ARQ = 400
export const TETO_DEF_LINHAS_TOTAL = 1200

/** Leitor da BASE: conteúdo do arquivo, ou `null` quando ele não existe na base. */
export type LerBase = (path: string) => string | null

/** Linhas ADICIONADAS por arquivo de destino (`+++ b/<path>`). */
export function linhasAdicionadasPorArquivo(diff: string): Map<string, string[]> {
  const out = new Map<string, string[]>()
  let atual: string[] | null = null
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) {
      const p = l.slice(4).trim()
      if (p === '/dev/null') {
        atual = null
      } else {
        const path = p.replace(/^b\//, '')
        atual = out.get(path) ?? []
        out.set(path, atual)
      }
    } else if (l.startsWith('diff --git ')) {
      atual = null
    } else if (atual && l.startsWith('+')) {
      atual.push(l.slice(1))
    }
  }
  return out
}

/** Nomes chamados como `nome(` — chamada livre, não método (`x.nome(`). */
function nomesChamados(linhas: string[]): string[] {
  const vistos: string[] = []
  for (const l of linhas) {
    // Lookbehind, e não grupo consumido: em `f(g())` o `(` de `f` é o que
    // antecede `g`, e um grupo que o consumisse perderia a chamada aninhada.
    for (const m of l.matchAll(/(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g)) {
      const nome = m[1]!
      if (!vistos.includes(nome)) vistos.push(nome)
    }
  }
  return vistos
}

const escapaRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function reDefinicao(nome: string): RegExp {
  const n = escapaRe(nome)
  return new RegExp(
    `^[ \\t]*(?:export\\s+)?(?:async\\s+)?function\\s*\\*?\\s*${n}\\s*[(<]` +
      `|^[ \\t]*(?:export\\s+)?(?:const|let|var)\\s+${n}\\s*(?::[^=\\n]+)?=`,
    'm',
  )
}

/** Especificadores de import/export relativos (`'./x.js'`, `'../y'`). */
function importsRelativos(texto: string): string[] {
  const out: string[] = []
  for (const m of texto.matchAll(/\bfrom\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
    if (!out.includes(m[1]!)) out.push(m[1]!)
  }
  return out
}

/** Resolve o import relativo contra a BASE: .js/.mjs viram .ts; tenta index. */
function resolverImport(dePath: string, spec: string, ler: LerBase): { path: string; conteudo: string } | null {
  const alvo = normalize(join(dirname(dePath), spec))
  const semExt = alvo.replace(/\.(m?js|tsx?|jsx)$/, '')
  const candidatos = [alvo, `${semExt}.ts`, `${semExt}.tsx`, `${semExt}.js`, `${semExt}.mjs`, `${semExt}/index.ts`]
  for (const c of [...new Set(candidatos)]) {
    const conteudo = ler(c)
    if (conteudo !== null) return { path: c, conteudo }
  }
  return null
}

/**
 * Corpo inteiro da definição que começa em `inicio` (início da linha): vai até
 * fechar o último `(`/`{`/`[` aberto e acabar a linha. Strings e comentários não
 * contam. Definição sem abertura (`const x = 1`) termina na própria linha.
 */
export function corpoDaDefinicao(conteudo: string, inicio: number): string {
  let prof = 0
  let abriu = false
  let fecharNaLinha = false
  let str: string | null = null
  let comLinha = false
  let comBloco = false
  for (let i = inicio; i < conteudo.length; i++) {
    const c = conteudo[i]!
    const prox = conteudo[i + 1]
    if (comLinha) {
      if (c === '\n') comLinha = false
      else continue
    } else if (comBloco) {
      if (c === '*' && prox === '/') {
        comBloco = false
        i++
      }
      continue
    } else if (str) {
      if (c === '\\') i++
      else if (c === str) str = null
      continue
    }
    if (c === '\n') {
      if (prof === 0 && (fecharNaLinha || !abriu)) return conteudo.slice(inicio, i)
      continue
    }
    if (c === '/' && prox === '/') {
      comLinha = true
      i++
    } else if (c === '/' && prox === '*') {
      comBloco = true
      i++
    } else if (c === '"' || c === "'" || c === '`') {
      str = c
    } else if (c === '(' || c === '{' || c === '[') {
      prof++
      abriu = true
      fecharNaLinha = false
    } else if (c === ')' || c === '}' || c === ']') {
      prof = Math.max(0, prof - 1)
      if (prof === 0) fecharNaLinha = true
    }
  }
  return conteudo.slice(inicio)
}

/**
 * Para cada `*.test.ts` do diff: os nomes chamados nas linhas ADICIONADAS cuja
 * definição está na BASE, no próprio arquivo de teste ou num módulo importado
 * por caminho relativo. Nome definido no próprio diff não entra (o juiz já o
 * vê lá). Ordem: a do diff, sem repetição.
 */
export function definicoesChamadasPelosTestes(diff: string, ler: LerBase): DefinicaoChamada[] {
  const porArquivo = linhasAdicionadasPorArquivo(diff)
  const todasAdicionadas = [...porArquivo.values()].flat().join('\n')
  const out: DefinicaoChamada[] = []
  for (const [testPath, adicionadas] of porArquivo) {
    if (!/\.test\.ts$/.test(testPath)) continue
    const nomes = nomesChamados(adicionadas)
    if (nomes.length === 0) continue
    const doTeste = ler(testPath)
    const fontes: { path: string; conteudo: string }[] = doTeste !== null ? [{ path: testPath, conteudo: doTeste }] : []
    const specs = importsRelativos(`${doTeste ?? ''}\n${adicionadas.join('\n')}`)
    for (const spec of specs) {
      const r = resolverImport(testPath, spec, ler)
      if (r && !fontes.some((f) => f.path === r.path)) fontes.push(r)
    }
    for (const nome of nomes) {
      const re = reDefinicao(nome)
      if (re.test(todasAdicionadas)) continue
      if (out.some((d) => d.nome === nome)) continue
      for (const f of fontes) {
        const m = re.exec(f.conteudo)
        if (!m) continue
        const inicio = f.conteudo.lastIndexOf('\n', m.index - 1) + 1
        out.push({
          path: f.path,
          linha: f.conteudo.slice(0, inicio).split('\n').length,
          nome,
          corpo: corpoDaDefinicao(f.conteudo, inicio),
        })
        break
      }
    }
  }
  return aplicarTetosDefinicoes(out)
}

/** Tetos do 622 (por arquivo e no total), com o truncamento MARCADO no texto. */
export function aplicarTetosDefinicoes(defs: DefinicaoChamada[]): DefinicaoChamada[] {
  let usadoTotal = 0
  const usadoPorArq = new Map<string, number>()
  return defs.map((d) => {
    const linhas = d.corpo.split('\n')
    const n = linhas.length
    const usadoArq = usadoPorArq.get(d.path) ?? 0
    const limite = Math.min(TETO_DEF_LINHAS_ARQ - usadoArq, TETO_DEF_LINHAS_TOTAL - usadoTotal)
    if (limite <= 0) {
      return {
        ...d,
        corpo: `[... TRUNCADO: teto de ${TETO_DEF_LINHAS_ARQ} linhas por arquivo / ${TETO_DEF_LINHAS_TOTAL} no total já atingido — as ${n} linhas desta definição foram OMITIDAS ...]`,
      }
    }
    const usar = Math.min(n, limite)
    usadoPorArq.set(d.path, usadoArq + usar)
    usadoTotal += usar
    if (usar === n) return d
    return {
      ...d,
      corpo: `${linhas.slice(0, usar).join('\n')}\n[... TRUNCADO: ${n - usar} de ${n} linhas omitidas (teto de ${TETO_DEF_LINHAS_ARQ} por arquivo, ${TETO_DEF_LINHAS_TOTAL} no total) ...]`,
    }
  })
}

/** Leitor da BASE por `git show <base>:<path>`. Ausente na base = null; outro erro sobe. */
export function lerDaBase(wt: string, base: string): LerBase {
  return (path) => {
    try {
      return execFileSync('git', ['-C', wt, 'show', `${base}:${path}`], {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'pipe'],
        maxBuffer: 64 * 1024 * 1024,
      })
    } catch (e) {
      const err = String((e as { stderr?: unknown }).stderr ?? '')
      if (/does not exist in|exists on disk, but not in/.test(err)) return null
      throw new Error(`git show ${base}:${path} falhou: ${err.trim() || (e as Error).message}`)
    }
  }
}

function blocoDefinicoes(defs: DefinicaoChamada[]): string[] {
  return [
    '',
    'DEFINIÇÕES CHAMADAS PELOS TESTES NOVOS (estado na base, NÃO fazem parte do diff):',
    'Funções e fixtures que os testes ADICIONADOS chamam e que estão definidas fora do diff.',
    'Julgue pelo corpo, nunca pelo nome.',
    ...defs.flatMap((d) => [
      '',
      `--- ${d.path}:${d.linha} (${d.nome}; estado na base, NÃO faz parte do diff) ---`,
      d.corpo.replace(/\n+$/, ''),
      `--- fim de ${d.nome} ---`,
    ]),
  ]
}

// ─── 2c · mensagens de commit (etapa 8e, P1) ───────────────────────────────

export const TETO_COMMITS_LINHAS = 200
export const TETO_COMMITS_BYTES = 8192

/** Corta por linha inteira no primeiro teto que bater; o corte é MARCADO no texto. */
export function aplicarTetoCommits(texto: string): string {
  const linhas = texto.replace(/\n+$/, '').split('\n')
  const out: string[] = []
  let bytes = 0
  for (const l of linhas) {
    const b = Buffer.byteLength(l) + 1
    if (out.length >= TETO_COMMITS_LINHAS || bytes + b > TETO_COMMITS_BYTES) break
    out.push(l)
    bytes += b
  }
  if (out.length === linhas.length) return out.join('\n')
  return `${out.join('\n')}\n[... TRUNCADO: ${linhas.length - out.length} de ${linhas.length} linhas omitidas (teto de ${TETO_COMMITS_LINHAS} linhas / ${TETO_COMMITS_BYTES} bytes) ...]`
}

function blocoCommits(commits: string): string[] {
  return [
    '',
    'MENSAGENS DE COMMIT (escritas pelo agente: declaração, não evidência):',
    'O que o agente AFIRMA ter feito. Serve para saber o que conferir no diff e nos',
    'gates; uma afirmação aqui que o diff ou os gates não provam NÃO foi feita.',
    '',
    aplicarTetoCommits(commits),
  ]
}

// ─── 2d · citações de relatório (etapa 8e, P3; caso real: dashboard 001/0) ──

export const TETO_CIT_N = 40
export const TETO_CIT_LINHAS_TRECHO = 12
export const TETO_CIT_LINHAS_TOTAL = 400
export const TETO_CIT_BYTES = 16384
export const TETO_CIT_SHAS = 20

const RE_CITACAO = /(?<![\w./@[\]-])((?:[\w@.[\]-]+\/)*[\w@.[\]-]+\.[A-Za-z0-9]{1,5}):(\d+)(?:-(\d+))?(?!\d)/g
const RE_SHA = /(?<![\w/])(?=[0-9a-f]*[a-f])(?=[0-9a-f]*\d)[0-9a-f]{7,40}(?!\w)/g

/** `null` quando o sha não está na história da base; senão `%h %ad %s`. */
export type CommitDaBase = (sha: string) => string | null

export function anexoCitacoes(diff: string, ler: LerBase, listar: () => string[], commit: CommitDaBase): string {
  const linhas = [...linhasAdicionadasPorArquivo(diff)].filter(([p]) => /\.md$/i.test(p)).flatMap(([, l]) => l)
  const cits: [string, number, number][] = []
  const shas: string[] = []
  for (const l of linhas) {
    for (const m of l.matchAll(RE_CITACAO)) {
      const c: [string, number, number] = [m[1]!, Number(m[2]), Number(m[3] ?? m[2])]
      if (!cits.some((x) => x.join() === c.join())) cits.push(c)
    }
    for (const m of l.matchAll(RE_SHA)) if (!shas.includes(m[0])) shas.push(m[0])
  }
  if (cits.length === 0 && shas.length === 0) return ''
  let arqs: string[] | null = null
  const out: string[] = []
  let total = 0
  let bytes = 0
  for (const [p, ini, fim] of cits.slice(0, TETO_CIT_N)) {
    const rot = `--- ${p}:${ini}${fim !== ini ? `-${fim}` : ''}`
    let path = p
    let conteudo = ler(p)
    if (conteudo === null) {
      arqs ??= listar()
      const cands = arqs.filter((f) => f.endsWith(`/${p}`))
      if (cands.length !== 1) {
        out.push(cands.length === 0 ? `${rot} --- AUSENTE na base` : `${rot} --- AMBÍGUO na base: ${cands.slice(0, 5).join(', ')}${cands.length > 5 ? ` e mais ${cands.length - 5}` : ''}`)
        continue
      }
      path = cands[0]!
      conteudo = ler(path) ?? ''
    }
    const arq = conteudo.replace(/\n$/, '').split('\n')
    if (ini < 1 || ini > arq.length) {
      out.push(`${rot} --- linha fora do arquivo na base (${arq.length} linhas)`)
      continue
    }
    const de = Math.max(1, ini - 2)
    const ate = Math.min(arq.length, fim + 2)
    const n = ate - de + 1
    const usar = Math.min(n, TETO_CIT_LINHAS_TRECHO)
    const corpo = arq.slice(de - 1, de - 1 + usar).map((t, i) => `${String(de + i).padStart(5)}| ${t}`)
    if (usar < n) corpo.push(`[... TRUNCADO: ${n - usar} de ${n} linhas (teto de ${TETO_CIT_LINHAS_TRECHO} por trecho) ...]`)
    const b = Buffer.byteLength(corpo.join('\n'))
    if (total + corpo.length > TETO_CIT_LINHAS_TOTAL || bytes + b > TETO_CIT_BYTES) {
      out.push(`${rot} --- OMITIDO: teto de ${TETO_CIT_LINHAS_TOTAL} linhas / ${TETO_CIT_BYTES} bytes de trechos atingido`)
      continue
    }
    total += corpo.length
    bytes += b
    out.push(`${rot}${path !== p ? ` (resolvido: ${path})` : ''} ---`, ...corpo, '--- fim ---')
  }
  if (cits.length > TETO_CIT_N) out.push(`[... ${cits.length - TETO_CIT_N} citações OMITIDAS (teto de ${TETO_CIT_N}) ...]`)
  if (shas.length > 0) {
    out.push('', 'COMMITS CITADOS (git show -s na base: hash curto, data, assunto):')
    for (const s of shas.slice(0, TETO_CIT_SHAS)) out.push(`  ${s} -> ${commit(s) ?? 'NÃO ENCONTRADO na história da base'}`)
    if (shas.length > TETO_CIT_SHAS) out.push(`[... ${shas.length - TETO_CIT_SHAS} shas OMITIDOS (teto de ${TETO_CIT_SHAS}) ...]`)
  }
  return out.join('\n')
}

/** Commit citado: só vale se for ancestral da base (`merge-base --is-ancestor`). */
export function commitDaBase(wt: string, base: string): CommitDaBase {
  return (sha) => {
    try {
      execFileSync('git', ['-C', wt, 'merge-base', '--is-ancestor', sha, base], { stdio: 'ignore' })
      return execFileSync('git', ['-C', wt, 'show', '-s', '--format=%h %ad %s', sha], { encoding: 'utf8' }).trim()
    } catch {
      return null
    }
  }
}

function blocoAnexo(anexo: string): string[] {
  return [
    '',
    'TRECHOS CITADOS NOS .md DO DIFF (estado na base, lidos pelo harness; NÃO fazem parte do diff):',
    'Para cada arquivo:linha citado, as linhas da BASE em volta (L-2 a M+2), numeradas. Confira a',
    'citação contra o trecho. Citação AUSENTE, AMBÍGUA ou OMITIDA não está conferida.',
    'Os commits citados provam só que o commit existe na base, a data e o assunto. Afirmação que',
    'pede mais ("desde quando", git log -S, conteúdo do commit) NÃO está verificada: diga isso no',
    'motivo e julgue o critério como não verificado.',
    '',
    anexo,
  ]
}

/**
 * Ordem estável para cache de prefixo (custo-e-contexto §4): tudo que é fixo
 * primeiro, o material variável (diff, gates) por último.
 */
export function montarPromptJuiz(e: EntradaPrompt): string {
  const criterios = e.criterios
    .map((c) => {
      const tipo = c.tipo ?? '?'
      // O critério `avaliador` chega aqui com a descrição INTEIRA: é a única
      // via dele. Até esta peça ele era pulado no executor e não virava nada.
      if (tipo === 'avaliador' || c.espera === 'avaliador') {
        return `  - [avaliador · JULGUE VOCÊ] ${c.descricao}`
      }
      return `  - [${tipo} · já verificado por comando] ${c.descricao}\n      cmd: ${c.cmd ?? '—'} · espera: ${c.espera ?? '—'}`
    })
    .join('\n')

  return [
    CABECALHO,
    '',
    COBRANCAS,
    ...(tocaTeste([...e.allowlist, ...(e.ampliados ?? [])]) ? ['', ANTI_AFROUXAMENTO] : []),
    ...(e.ampliados && e.ampliados.length > 0 ? blocoAmpliados(e.ampliados) : []),
    // Etapa 8e (P4): depois das cobranças e antes de FORMATO, no prefixo fixo
    // por repo (cacheável); a numeração das cobranças não muda.
    ...(e.review?.trim()
      ? ['', 'REVIEW.md DO REPO (regras de revisão deste repositório; valem junto com os itens acima):', e.review.trim()]
      : []),
    '',
    FORMATO,
    '',
    `TICKET ${e.id}`,
    `Objetivo: ${e.objetivo}`,
    '',
    'Allowlist do ticket:',
    ...e.allowlist.map((p) => `  - ${p}`),
    '',
    'Critérios de aceite:',
    criterios,
    '',
    ...(e.nota?.trim() ? ['', 'NOTA DO HARNESS SOBRE ESTA TENTATIVA:', e.nota.trim()] : []),
    ...(e.contexto && e.contexto.length > 0 ? blocoReferencia(e.contexto) : []),
    ...(e.definicoes && e.definicoes.length > 0 ? blocoDefinicoes(e.definicoes) : []),
    ...(e.commits?.trim() ? blocoCommits(e.commits) : []),
    ...(e.anexo?.trim() ? blocoAnexo(e.anexo) : []),
    ...(e.instaveis && e.instaveis.length > 0 ? blocoInstaveis(e.instaveis) : []),
    '',
    'SAÍDA DOS GATES MECÂNICOS:',
    e.gates.trim() || '(vazia)',
    '',
    'DIFF CRU DA TENTATIVA (git diff base...HEAD):',
    e.diff.trim() || '(vazio)',
  ].join('\n')
}

// ─── 3 · veredito ──────────────────────────────────────────────────────────

export interface VereditoJuiz {
  aprovado: boolean
  motivo: string
  criterios_falhos: string[]
}

/**
 * Extrai o JSON de dentro do envelope do CLI, com tolerância a lixo.
 *
 * `null` = ILEGÍVEL, e ilegível é ADIADO, nunca reprovado (armadilha conhecida
 * da SKILL; incidente real: juiz aprovou, parser declarou ilegível, trabalho
 * bom foi descartado). Quem transforma null em adiamento é o executor.
 *
 * Duas camadas de tolerância, porque as duas já apareceram:
 *   1. envelope: `.result` é a resposta do modelo; se o arquivo não for o
 *      envelope (stub, texto solto), o próprio texto é a resposta.
 *   2. resposta: cerca ```json, prosa antes/depois, chaves fora de ordem. Pega
 *      o ÚLTIMO objeto de nível superior que tenha o campo `aprovado`.
 */
export function extrairVeredito(bruto: string): VereditoJuiz | null {
  const texto = respostaDoEnvelope(bruto)
  for (const cand of objetosDeNivelSuperior(texto).reverse()) {
    let o: unknown
    try {
      o = JSON.parse(cand)
    } catch {
      continue
    }
    if (!o || typeof o !== 'object') continue
    const r = o as Record<string, unknown>
    if (typeof r.aprovado !== 'boolean') continue
    return {
      aprovado: r.aprovado,
      motivo: typeof r.motivo === 'string' ? r.motivo : '',
      criterios_falhos: Array.isArray(r.criterios_falhos) ? r.criterios_falhos.map(String) : [],
    }
  }
  return null
}

/** `.result` do envelope JSON do CLI; o texto inteiro quando não há envelope. */
function respostaDoEnvelope(bruto: string): string {
  for (const linha of bruto.split('\n').reverse()) {
    const t = linha.trim()
    if (!t.startsWith('{')) continue
    try {
      const o = JSON.parse(t) as Record<string, unknown>
      if (typeof o.result === 'string') return o.result
    } catch {
      /* linha não é envelope: segue procurando */
    }
  }
  return bruto
}

/** Varre `{...}` balanceados no nível superior, ignorando chaves dentro de string. */
function objetosDeNivelSuperior(texto: string): string[] {
  const out: string[] = []
  let profundidade = 0
  let inicio = -1
  let emString = false
  let escape = false
  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]!
    if (emString) {
      if (escape) escape = false
      else if (c === '\\') escape = true
      else if (c === '"') emString = false
      continue
    }
    if (c === '"') emString = true
    else if (c === '{') {
      if (profundidade === 0) inicio = i
      profundidade++
    } else if (c === '}') {
      profundidade--
      if (profundidade === 0 && inicio >= 0) {
        out.push(texto.slice(inicio, i + 1))
        inicio = -1
      }
      if (profundidade < 0) profundidade = 0
    }
  }
  return out
}

// --- CLI: a ponte fina que o executor.sh usa --------------------------------
// `npx tsx juiz.ts --run-cli <raiz> nivel|prompt|parse|definicoes|citacoes [args]` (payload em stdin)
// Mesmo guard por ARQUIVO do enforcement-core: este módulo também é importado.
if (process.argv.includes('--run-cli') && /juiz\.(ts|js)$/.test(process.argv[1] ?? '')) {
  const i = process.argv.indexOf('--run-cli')
  const raiz = process.argv[i + 1] ?? process.cwd()
  const sub = process.argv[i + 2] ?? ''
  const cfg = JSON.parse(readFileSync(`${raiz}/docs/fila/000-config.json`, 'utf8')) as JuizCfg
  const stdin = () => readFileSync(0, 'utf8')
  if (sub === 'nivel') {
    const e = JSON.parse(stdin()) as EntradaRisco
    const r = classeDeRisco(cfg, e)
    process.stdout.write(JSON.stringify({ ...r, modelo: modeloDoJuiz(cfg, r.classe) }) + '\n')
  } else if (sub === 'prompt') {
    process.stdout.write(montarPromptJuiz(JSON.parse(stdin()) as EntradaPrompt))
  } else if (sub === 'definicoes') {
    // stdin = diff cru; argv = <worktree> <base>. Ticket 628.
    const wt = process.argv[i + 3] ?? ''
    const base = process.argv[i + 4] ?? ''
    if (!wt || !base) {
      process.stderr.write('juiz: definicoes exige <worktree> <base>\n')
      process.exit(2)
    }
    process.stdout.write(JSON.stringify(definicoesChamadasPelosTestes(stdin(), lerDaBase(wt, base))) + '\n')
  } else if (sub === 'citacoes') {
    // stdin = diff cru; argv = <worktree> <base>. Etapa 8e, P3.
    const wt = process.argv[i + 3] ?? ''
    const base = process.argv[i + 4] ?? ''
    if (!wt || !base) {
      process.stderr.write('juiz: citacoes exige <worktree> <base>\n')
      process.exit(2)
    }
    const listar = () =>
      execFileSync('git', ['-C', wt, 'ls-tree', '-r', '--name-only', base], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
        .split('\n')
        .filter(Boolean)
    process.stdout.write(anexoCitacoes(stdin(), lerDaBase(wt, base), listar, commitDaBase(wt, base)))
  } else if (sub === 'parse') {
    const v = extrairVeredito(stdin())
    if (!v) {
      process.stderr.write('juiz: veredito ILEGÍVEL\n')
      process.exit(3) // 3 = ilegível => o executor adia (nunca reprova)
    }
    process.stdout.write(JSON.stringify(v) + '\n')
  } else {
    process.stderr.write(`juiz: subcomando desconhecido '${sub}'\n`)
    process.exit(2)
  }
}
