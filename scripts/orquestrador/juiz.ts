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
import { readFileSync } from 'node:fs'
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

const FORMATO = `RESPONDA SÓ COM ESTE JSON, sem cerca de código, sem texto antes ou depois:
{"aprovado": true|false, "motivo": "<=2 frases, concreto, citando arquivo e linha>",
 "criterios_falhos": ["descrição exata do critério que você reprova", ...]}

criterios_falhos: use a DESCRIÇÃO do critério, copiada como está na lista acima.
Vazio quando aprovado. Na dúvida entre aprovar e reprovar, REPROVE e diga o que falta.`

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
    ...(tocaTeste(e.allowlist) ? ['', ANTI_AFROUXAMENTO] : []),
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
// `npx tsx juiz.ts --run-cli <raiz> nivel|prompt|parse [args]` (payload em stdin)
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
