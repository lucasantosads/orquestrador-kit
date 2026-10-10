/**
 * modelo.ts — a classificação com modelo, só para o que a extração não fechou
 * (spec 7f-a §4). Decisões do chat do programa sobre a spec:
 *   - modelo `claude-opus-5-5`, teto de US$ 3,00 por dia (todos os repos) e
 *     de US$ 0,30 por caso, entrada cortada em 30 mil tokens (chars / 3,5);
 *   - o painel nunca dispara gasto: quem chama é `orq triar` (manual, depois
 *     job do launchd);
 *   - a sessão de etapa nunca chama API: nos testes o `claude` é um stub
 *     (`ORQ_TRIADOR_CLAUDE`), e o `claude` do PATH é uma trava que reprova.
 *
 * Uma chamada por assinatura (a assinatura igual nem chega aqui), mesmo que
 * falhe: `modelo.erro` fica registrado e só `--forcar` repete.
 *
 * Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json`, chaves opcionais
 * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `entrada_max_tokens`,
 * `timeout_secs`). `modelo: null` desliga o modelo. `ORQ_TRIADOR_TETO_DIA`
 * sobrepõe o teto do dia (a corrida da peça 6 usa US$ 6,60).
 */
import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import type { Extracao } from './extrair.js'
import { mascarar } from './mascara.js'
import { preencher, PROMPT } from './prompt.js'
import { numerosDe, trecho } from './recorte.js'
import type { Guarda } from './saida.js'
import type { Evidencia, Ref, Tentativa } from './tipos.js'
import type { PassoModelo } from './triar.js'

export interface ConfigModelo {
  modelo: string | null
  teto_dia_usd: number
  teto_caso_usd: number
  entrada_max_tokens: number
  timeout_secs: number
}

export const PADRAO: ConfigModelo = {
  modelo: 'claude-opus-5-5',
  teto_dia_usd: 3,
  teto_caso_usd: 0.3,
  entrada_max_tokens: 30000,
  timeout_secs: 120,
}
export const CHARS_POR_TOKEN = 3.5

export function lerConfigModelo(): ConfigModelo {
  let c: Partial<ConfigModelo> = {}
  try {
    c = JSON.parse(readFileSync(process.env.ORQ_TRIADOR_CONFIG || join(homedir(), '.orq', 'triador.json'), 'utf8')) as Partial<ConfigModelo>
  } catch {
    c = {}
  }
  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
  const tetoEnv = Number(process.env.ORQ_TRIADOR_TETO_DIA)
  return {
    modelo: c.modelo === null ? null : typeof c.modelo === 'string' && c.modelo ? c.modelo : PADRAO.modelo,
    teto_dia_usd: process.env.ORQ_TRIADOR_TETO_DIA && Number.isFinite(tetoEnv) ? tetoEnv : num(c.teto_dia_usd, PADRAO.teto_dia_usd),
    teto_caso_usd: num(c.teto_caso_usd, PADRAO.teto_caso_usd),
    entrada_max_tokens: num(c.entrada_max_tokens, PADRAO.entrada_max_tokens),
    timeout_secs: num(c.timeout_secs, PADRAO.timeout_secs),
  }
}

// ─── a entrada, na ordem de §4, cortada de baixo para cima ──────────────────

const numeradas = (linhas: { n: number; t: string }[]) => linhas.map((l) => `${l.n}: ${l.t}`).join('\n')
const cauda = (s: string, n: number) => (s.length > n ? `…${s.slice(s.length - n + 1)}` : s)

function criteriosDoTicket(ev: Evidencia): unknown[] {
  const ca = ev.ticket?.criterios_aceite ?? []
  const nomes = new Set(ev.tentativas.flatMap((t) => t.criterios_falhos.map((c) => c.criterio)))
  const out: unknown[] = []
  ca.forEach((c, i) => {
    const desc = c && typeof c === 'object' ? (c as { descricao?: unknown }).descricao : undefined
    if (nomes.has(`criterio[${i}]`) || (typeof desc === 'string' && nomes.has(desc))) out.push(c)
  })
  return out
}

function recortesVitest(ts: Tentativa[]): string {
  const ult = ts.at(-1)
  if (!ult?.recorte_vitest) return '(sem gate de testes na última tentativa)'
  const partes = [`--- ${ult.recorte_vitest.rel} ---\n${numeradas(ult.recorte_vitest.linhas)}`]
  const chave = (t: Tentativa) => [...t.arquivos_vermelhos].sort().join(',')
  for (const t of ts.slice(0, -1).reverse()) {
    if (t.recorte_vitest && t.arquivos_vermelhos.length && chave(t) !== chave(ult)) {
      partes.push(`--- ${t.recorte_vitest.rel} ---\n${numeradas(t.recorte_vitest.linhas)}`)
    }
  }
  return partes.join('\n\n')
}

function criteriosFalhos(ts: Tentativa[]): string {
  const partes: string[] = []
  for (const t of ts) {
    if (!t.recorte_criterios || !t.criterios_falhos.length) continue
    const linhas = t.recorte_criterios.linhas.filter((l) => !/^### \S+ -> PASS/.test(l.t))
    partes.push(`--- ${t.recorte_criterios.rel} ---\n${numeradas(linhas)}`)
  }
  return partes.join('\n\n') || '(nenhum critério reprovado)'
}

function diffStats(ts: Tentativa[]): string {
  return (
    ts
      .filter((t) => t.diff_stat || t.diff_ref)
      .map((t) => (t.diff_stat ? `--- ${t.diff_stat.rel} ---\n${numeradas(t.diff_stat.linhas)}` : `--- ${t.diff_ref!.arquivo} ---\n${t.diff_ref!.linha}: ${t.diff_ref!.trecho}`))
      .join('\n\n') || '(sem diff)'
  )
}

function juiz(ts: Tentativa[]): string {
  return (
    ts
      .filter((t) => t.juiz)
      .map((t) => `--- tentativa ${t.n}: ${t.juiz!.ref.arquivo}:${t.juiz!.ref.linha} ---\naprovado: ${t.juiz!.aprovado}\nmotivo: ${t.juiz!.motivo}\ncriterios_falhos: ${JSON.stringify(t.juiz!.criterios_falhos)}`)
      .join('\n\n') || '(o juiz não rodou)'
  )
}

function agente(ts: Tentativa[]): string {
  const ult = ts.at(-1)
  const ant = ts.at(-2)
  const partes: string[] = []
  if (ult?.agente_disse) partes.push(`--- última tentativa (${ult.dir}) ---\n${cauda(ult.agente_disse, 3000)}`)
  if (ant?.agente_disse) partes.push(`--- tentativa anterior (${ant.dir}) ---\n${cauda(ant.agente_disse, 1500)}`)
  return partes.join('\n\n') || '(sem saída do agente)'
}

export interface Entrada {
  prompt: string
  chars: number
  tokens_est: number
  /** seções cortadas, da 7 para a 1: [{secao, de, para}] em caracteres */
  cortes: { secao: number; de: number; para: number }[]
}

/** As 7 seções de §4 na ordem, cortadas de baixo para cima até caber; o texto vai mascarado. */
export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTokens = PADRAO.entrada_max_tokens): Entrada {
  const tk = ev.ticket
  const s1 = JSON.stringify(
    {
      id: ev.id,
      slug: tk?.slug ?? '',
      objetivo: (tk?.objetivo ?? '').slice(0, 1500),
      pathspec_allowlist: tk?.pathspec_allowlist ?? [],
      criterios_aceite_que_falharam: criteriosDoTicket(ev),
      notas_status: tk?.notas_status ?? '',
    },
    null,
    1,
  )
  const s2 = JSON.stringify({ palpite: ext.classe, regra: ext.regra, firme: ext.firme, evidencia: ext.evidencia, ...ext.detalhe }, null, 1)
  const secoes = [s1, s2, recortesVitest(ev.tentativas), criteriosFalhos(ev.tentativas), diffStats(ev.tentativas), juiz(ev.tentativas), agente(ev.tentativas)].map(mascarar)
  const fixo = {
    id: ev.id,
    slug: tk?.slug ?? '',
    repo,
    quando: ev.bloqueio.quando ?? 'sem data',
    token_do_bloqueio: ev.bloqueio.token ?? (ev.bloqueio.origem === 'humano' ? 'humano' : 'desconhecido'),
    n: String(ev.tentativas.length),
  }
  const max = Math.floor(maxTokens * CHARS_POR_TOKEN)
  const montar = () =>
    preencher({ ...fixo, ticket: secoes[0]!, extracao_json: secoes[1]!, recortes_vitest: secoes[2]!, criterios_falhos: secoes[3]!, diff_stats: secoes[4]!, juiz: secoes[5]!, agente: secoes[6]! })
  const cortes: Entrada['cortes'] = []
  let prompt = montar()
  for (let i = secoes.length - 1; i >= 0 && prompt.length > max; i--) {
    const excesso = prompt.length - max
    const de = secoes[i]!.length
    const marca = '\n[… cortado para caber na entrada]'
    secoes[i] = de - excesso - marca.length > 0 ? secoes[i]!.slice(0, de - excesso - marca.length) + marca : ''
    cortes.push({ secao: i + 1, de, para: secoes[i]!.length })
    prompt = montar()
  }
  return { prompt, chars: prompt.length, tokens_est: Math.ceil(prompt.length / CHARS_POR_TOKEN), cortes }
}

// ─── a chamada ───────────────────────────────────────────────────────────────

export interface Envelope {
  result: string
  is_error: boolean
  custo_usd: number | null
  tokens_in: number | null
  tokens_out: number | null
}

/**
 * `claude -p --output-format json --model <m>` sem ferramentas e com uma volta
 * (o molde do juiz, `executor.sh:753-755`), prompt pela entrada padrão,
 * `--max-budget-usd` no teto do caso, e timeout. O binário é
 * `ORQ_TRIADOR_CLAUDE` ou `claude`.
 */
export class ChamadaRealRecusada extends Error {}

export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout: string; ms: number } {
  // Sob teste (vitest ou ORQ_TESTE=1) só o stub roda: sem ORQ_TRIADOR_CLAUDE,
  // o `claude` do PATH seria o de verdade, e a etapa nunca chama API.
  if (!process.env.ORQ_TRIADOR_CLAUDE && (process.env.VITEST || process.env.ORQ_TESTE === '1')) {
    throw new ChamadaRealRecusada('triador: claude real recusado sob teste (defina ORQ_TRIADOR_CLAUDE com o stub)')
  }
  const bin = process.env.ORQ_TRIADOR_CLAUDE || 'claude'
  const t0 = Date.now()
  const r = spawnSync(
    bin,
    ['-p', '--output-format', 'json', '--model', cfg.modelo ?? '', '--allowedTools', '', '--max-turns', '1', '--max-budget-usd', String(cfg.teto_caso_usd)],
    { input: prompt, encoding: 'utf8', timeout: cfg.timeout_secs * 1000, maxBuffer: 16 * 1024 * 1024, killSignal: 'SIGKILL' },
  )
  return { rc: r.status ?? (r.error ? 127 : 124), stdout: r.stdout ?? '', ms: Date.now() - t0 }
}

export function lerEnvelope(stdout: string): Envelope | null {
  try {
    const j = JSON.parse(stdout.trim()) as Record<string, unknown>
    if (typeof j.result !== 'string') return null
    const u = (j.usage ?? {}) as Record<string, unknown>
    const num = (v: unknown) => (typeof v === 'number' ? v : null)
    return { result: j.result, is_error: j.is_error === true, custo_usd: num(j.total_cost_usd), tokens_in: num(u.input_tokens), tokens_out: num(u.output_tokens) }
  } catch {
    return null
  }
}

// ─── a resposta ──────────────────────────────────────────────────────────────

export interface Resposta {
  classe: string
  confianca: 'alta' | 'media' | 'baixa'
  evidencia: Ref[]
  remedio: string
  requeue: string
  justificativa: string
}

const CLASSES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']
const REQUEUE = /^(sim|nao|sim_apos:(arvore_alvo_limpa|base_verde(:\S+)?|conserto_motor|maquina_ok))$/

function respostaDe(v: unknown): Resposta | null {
  if (!v || typeof v !== 'object') return null
  const j = v as Record<string, unknown>
  if (typeof j.classe !== 'string' || !CLASSES.includes(j.classe)) return null
  const confianca = j.confianca === 'alta' || j.confianca === 'media' || j.confianca === 'baixa' ? j.confianca : 'baixa'
  const evidencia = (Array.isArray(j.evidencia) ? j.evidencia : [])
    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
    .map((e) => ({ arquivo: String(e.arquivo ?? ''), linha: typeof e.linha === 'number' ? e.linha : null, trecho: trecho(String(e.trecho ?? '')) }))
  return {
    classe: j.classe,
    confianca,
    evidencia,
    remedio: String(j.remedio ?? '').split('\n')[0]!.trim(),
    requeue: typeof j.requeue === 'string' && REQUEUE.test(j.requeue) ? j.requeue : 'nao',
    justificativa: String(j.justificativa ?? ''),
  }
}

/** A última linha que o JSON.parse aceita com `classe` em R1-R7, de trás para frente (o molde do avaliador do legado). */
export function lerResposta(texto: string): Resposta | null {
  const inteira = (() => {
    try {
      return respostaDe(JSON.parse(texto.trim()))
    } catch {
      return null
    }
  })()
  if (inteira) return inteira
  const linhas = texto.split('\n')
  for (let i = linhas.length - 1; i >= 0; i--) {
    try {
      const r = respostaDe(JSON.parse(linhas[i]!.trim()))
      if (r) return r
    } catch {
      /* segue para cima */
    }
  }
  return null
}

/**
 * Cada `evidencia.arquivo` tem de ser um arquivo lido (o que está na cópia da
 * evidência) e a `linha` tem de estar nele: no recorte, uma linha que o
 * recorte guardou; no arquivo inteiro, de 1 ao fim. A que não confere sai.
 */
export function conferirEvidencia(ev: Evidencia, refs: Ref[]): { validas: Ref[]; descartadas: Ref[] } {
  const validas: Ref[] = []
  const descartadas: Ref[] = []
  for (const r of refs) {
    const l = ev.lidos.find((x) => x.arquivo === r.arquivo)
    let ok = false
    if (l && r.linha !== null && Number.isInteger(r.linha) && r.linha >= 1) {
      ok = l.faixas ? numerosDe(l.faixas).includes(r.linha) : r.linha <= l.conteudo.split('\n').length
    }
    ;(ok ? validas : descartadas).push(r)
  }
  return { validas, descartadas }
}

// ─── o ledger e os tetos ─────────────────────────────────────────────────────

export interface Gasto {
  repo: string
  id: string
  assinatura: string
  custo_usd: number | null
  tokens_in: number | null
  tokens_out: number | null
  custo_acima_do_teto?: true
}

const dia = (agora: number) => new Date(agora).toISOString().slice(0, 10)
const microdolares = (usd: number) => Math.round(usd * 1e6)

export function lerLedger(g: Guarda): { dias: Record<string, Gasto[]> } {
  try {
    const d = JSON.parse(readFileSync(join(g.raiz, 'custo.json'), 'utf8')) as { dias?: Record<string, Gasto[]> }
    return { dias: d.dias ?? {} }
  } catch {
    return { dias: {} }
  }
}

/** Gasto do dia; entrada sem custo conhecido conta como o teto do caso (o pior caso). */
export function gastoDoDia(g: Guarda, agora: number, tetoCaso: number): number {
  return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? tetoCaso), 0)
}

function registrar(g: Guarda, agora: number, x: Gasto): void {
  const l = lerLedger(g)
  ;(l.dias[dia(agora)] ??= []).push(x)
  g.escrever(join(g.raiz, 'custo.json'), JSON.stringify(l, null, 1) + '\n')
}

export interface RegistroModelo {
  modelo: string | null
  pulado?: 'teto_dia' | 'desligado'
  erro?: string
  custo_usd?: number | null
  tokens_in?: number | null
  tokens_out?: number | null
  custo_acima_do_teto?: true
  duracao_ms?: number
  entrada_tokens_est?: number
  cortes?: Entrada['cortes']
  evidencia_descartada?: number
  resposta?: Resposta
  envelope_bruto?: string
}

/** O passo do modelo que `triarTicket` chama para palpite e sem regra. */
export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoModelo {
  return ({ ev, ext, repo, assinatura, guarda, agora }) => {
    if (!cfg.modelo) return { registro: { modelo: null, pulado: 'desligado' } satisfies RegistroModelo }
    // Teto do dia: a chamada só sai se, mesmo no pior caso (o teto do caso), o dia não passa do teto.
    if (microdolares(gastoDoDia(guarda, agora, cfg.teto_caso_usd) + cfg.teto_caso_usd) > microdolares(cfg.teto_dia_usd)) {
      return { registro: { modelo: cfg.modelo, pulado: 'teto_dia' } satisfies RegistroModelo }
    }
    const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens)
    const r = chamar(entrada.prompt, cfg)
    const env = lerEnvelope(r.stdout)
    const gasto: Gasto = { repo, id: ev.id, assinatura, custo_usd: env?.custo_usd ?? null, tokens_in: env?.tokens_in ?? null, tokens_out: env?.tokens_out ?? null }
    if (env?.custo_usd != null && env.custo_usd > cfg.teto_caso_usd) gasto.custo_acima_do_teto = true
    registrar(guarda, agora, gasto)
    const reg: RegistroModelo = {
      modelo: cfg.modelo,
      custo_usd: gasto.custo_usd,
      tokens_in: gasto.tokens_in,
      tokens_out: gasto.tokens_out,
      ...(gasto.custo_acima_do_teto ? { custo_acima_do_teto: true as const } : {}),
      duracao_ms: r.ms,
      entrada_tokens_est: entrada.tokens_est,
      cortes: entrada.cortes,
      envelope_bruto: r.stdout.slice(0, 20000),
    }
    if (!env) return { registro: { ...reg, erro: `envelope ilegível (rc ${r.rc})` } }
    if (env.is_error) return { registro: { ...reg, erro: `envelope com is_error: ${env.result.slice(0, 200)}` } }
    const resp = lerResposta(env.result)
    if (!resp) return { registro: { ...reg, erro: 'resposta sem JSON com classe R1-R7' } }
    const { validas, descartadas } = conferirEvidencia(ev, resp.evidencia)
    const comResposta = { ...reg, evidencia_descartada: descartadas.length, resposta: resp }
    if (!validas.length) return { registro: { ...comResposta, erro: 'nenhuma evidência confere com a cópia' } }
    return { registro: comResposta, resposta: { ...resp, evidencia: validas } }
  }
}

export { PROMPT }
