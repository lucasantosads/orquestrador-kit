/**
 * autonomo.ts — as peças da operação autônoma (etapa 2.2.0): planejador (P1),
 * promotor (P2), avisos (P3) e relatório por execução (P4).
 *
 * Doutrina: doutrina/references/autoalimentacao.md §3 (planejador) e §6
 * (promoção). Tudo nasce DESLIGADO no kit e liga por config:
 *   loops.planejador.ativo / loops.planejador.modo (auto | dry_run)
 *   planejador.{limiar_fila, lote, regras_ticket, liberacao_automatica, ...}
 *   promotor.{modo (humano | auto), modelo_juiz, paths_gate_humano, gates}
 *   avisos.{hook_cmd, dedupe_horas}
 *
 * O ciclo de um disparo (local-loop.sh): pré-voo -> planejador (se pendentes <
 * limiar) -> drenagem -> promotor -> avisos e relatório. Um processo, um lock.
 *
 * O que este arquivo NUNCA faz: push, merge que não seja --ff-only na
 * principal, aplicar migration, falar com provedor externo. O promotor só
 * promove com gates verdes no topo da alvo, juiz independente aprovando e
 * nenhum path de gate humano no diff.
 *
 * CLI (chamada pelo local-loop.sh):
 *   autonomo.ts planejar  --checkout <main> --config <cfg> --alvo-wt <wt>
 *   autonomo.ts promover  --checkout <main> --config <cfg> --alvo-wt <wt>
 *   autonomo.ts aviso     --checkout <main> --config <cfg> --tipo T --nivel N --titulo X --texto Y [--chave K]
 *   autonomo.ts ciclo-fim --checkout <main> --config <cfg> --desde <linha-do-events.log>
 */
import { spawnSync } from 'node:child_process'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { globToRegExp } from './enforcement-core.js'

// ─── tipos ───────────────────────────────────────────────────────────────────

/* eslint-disable @typescript-eslint/no-explicit-any */
export type Cfg = Record<string, any>

export interface Frente {
  id: string
  entrega: string
  allowlist: string[]
  cria_novo?: boolean
  deps: string[]
  adrs?: string[]
  status: string
  tickets_estimados?: number
  lotes_descartados_consecutivos?: number
}
export interface Bloco {
  id: string
  nome?: string
  status: string
  por_que?: string
  dod?: string[]
  gates_humanos?: string[]
  frentes: Frente[]
}
export interface Mapa {
  blocos: Bloco[]
  [k: string]: unknown
}
export interface TicketFila {
  arquivo: string
  json: Record<string, any>
}

/** Contexto de uma chamada: caminhos e o runner de modelo (injetável no teste). */
export interface Ctx {
  checkout: string
  cfg: Cfg
  cfgPath: string
  filaDir: string
  runsDir: string
  alvoWt: string
  claude: RodarClaude
  agora: () => Date
}

// ─── utilidades ──────────────────────────────────────────────────────────────

/** `AAAA-MM-DDTHH:MM:SS±HHMM`, no fuso local: o formato da trilha (lib.sh:event). */
export function tsLocal(d: Date = new Date()): string {
  const p = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0')
  const off = -d.getTimezoneOffset()
  const z = `${off >= 0 ? '+' : '-'}${p(Math.trunc(off / 60))}${p(off % 60)}`
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}${z}`
}
export function diaLocal(d: Date = new Date()): string {
  return tsLocal(d).slice(0, 10)
}

/** Campo de evento é token: sem espaço, sem quebra (CONTRATO §4.1). */
function token(v: string): string {
  return v.replace(/\s+/g, '_').replace(/[\r\n]/g, '')
}

export function evento(runsDir: string, id: string, ev: string, campos: Record<string, string | number | boolean>, d = new Date()): void {
  mkdirSync(runsDir, { recursive: true })
  const cs = Object.entries(campos).map(([k, v]) => `${k}=${token(String(v))}`)
  appendFileSync(join(runsDir, 'events.log'), `${[tsLocal(d), id, ev, ...cs].join(' ')}\n`)
}

export function git(cwd: string, ...args: string[]): { rc: number; out: string; err: string } {
  const r = spawnSync('git', ['-C', cwd, ...args], {
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024,
    env: { ...process.env, LC_ALL: 'C', GIT_TERMINAL_PROMPT: '0' },
  })
  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' }
}

function emCaminho(o: unknown, caminho: string): unknown {
  let cur: any = o
  for (const k of caminho.split('.')) {
    if (cur === null || typeof cur !== 'object') return undefined
    cur = cur[k]
  }
  return cur
}

export function lerJson<T = any>(p: string): T | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return null
  }
}

/** O ÚLTIMO objeto JSON do texto: bloco ```json``` ou o maior `{...}` balanceado do fim. */
export function extrairJson(texto: string): any {
  const blocos = [...texto.matchAll(/```json\s*\n([\s\S]*?)\n```/g)]
  for (let i = blocos.length - 1; i >= 0; i--) {
    try {
      return JSON.parse(blocos[i]![1]!)
    } catch {
      /* próximo */
    }
  }
  const fim = texto.lastIndexOf('}')
  for (let ini = texto.indexOf('{'); ini !== -1 && ini < fim; ini = texto.indexOf('{', ini + 1)) {
    try {
      return JSON.parse(texto.slice(ini, fim + 1))
    } catch {
      /* tenta o próximo `{` */
    }
  }
  return null
}

export function casaGlob(caminho: string, globs: string[]): boolean {
  return globs.some((g) => globToRegExp(g).test(caminho))
}

// ─── modelo: claude -p ───────────────────────────────────────────────────────

export interface RespostaClaude {
  rc: number
  /** stdout cru (o envelope JSON de --output-format json). */
  saida: string
  /** o campo `result` do envelope, ou o stdout quando não há envelope. */
  texto: string
  envelope: Record<string, any> | null
}
export type RodarClaude = (o: { cwd: string; args: string[]; timeoutSecs: number }) => RespostaClaude

/**
 * `claude` real, com teto de tempo. O processo nasce em grupo próprio
 * (`detached`) para o corte alcançar os filhos (o mesmo defeito do A1-2).
 */
export const rodarClaudeReal: RodarClaude = ({ cwd, args, timeoutSecs }) => {
  const r = spawnSync('claude', args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutSecs * 1000,
    killSignal: 'SIGTERM',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const saida = `${r.stdout ?? ''}`
  let envelope: Record<string, any> | null = null
  try {
    envelope = JSON.parse(saida.trim().split('\n').filter((l) => l.startsWith('{')).pop() ?? '')
  } catch {
    envelope = null
  }
  const rc = r.error && (r.error as NodeJS.ErrnoException).code === 'ETIMEDOUT' ? 124 : (r.status ?? (r.signal ? 124 : 1))
  return { rc, saida: saida + (r.stderr ? `\n${r.stderr}` : ''), texto: typeof envelope?.result === 'string' ? envelope.result : saida, envelope }
}

/** Registra o usage do envelope em custo.json (mesmo formato do lib.sh:custo_registrar). */
export function registrarCusto(ctx: Ctx, papel: string, ticket: string, r: RespostaClaude): void {
  if (process.env.ORQ_TESTE === '1' && !process.env.ORQ_TESTE_CUSTO) return
  if (!r.envelope) return
  const campos = (ctx.cfg.orcamento?.campos_usage ?? {}) as Record<string, string>
  const pega = (k: string) => {
    const v = campos[k] ? emCaminho(r.envelope, campos[k]!) : undefined
    return typeof v === 'number' ? v : 0
  }
  const arq = join(ctx.checkout, String(ctx.cfg.orcamento?.custo_file ?? join(ctx.cfg.runs_dir ?? 'docs/fila/runs', 'custo.json')))
  const dia = diaLocal(ctx.agora())
  const led = lerJson<{ dias: Record<string, unknown[]> }>(arq) ?? { dias: {} }
  led.dias ??= {}
  led.dias[dia] = [
    ...(led.dias[dia] ?? []),
    { data: dia, papel, ticket, attempt: 0, tokens_in: pega('tokens_in'), tokens_out: pega('tokens_out'), tokens_cache: pega('tokens_cache'), custo_usd: pega('custo_usd') },
  ]
  mkdirSync(dirname(arq), { recursive: true })
  writeFileSync(arq, `${JSON.stringify(led, null, 2)}\n`)
}

export function gastoDoDia(ctx: Ctx): number {
  const arq = join(ctx.checkout, String(ctx.cfg.orcamento?.custo_file ?? 'docs/fila/runs/custo.json'))
  const led = lerJson<{ dias?: Record<string, { custo_usd?: number }[]> }>(arq)
  const regs = led?.dias?.[diaLocal(ctx.agora())] ?? []
  return regs.reduce((a, r) => a + (typeof r.custo_usd === 'number' ? r.custo_usd : 0), 0)
}

// ─── fila ────────────────────────────────────────────────────────────────────

export function blocoJsonDoTicket(md: string): Record<string, any> | null {
  const m = /```json\s*\n([\s\S]*?)\n```/.exec(md)
  if (!m) return null
  try {
    return JSON.parse(m[1]!)
  } catch {
    return null
  }
}

export function lerFila(filaDir: string): TicketFila[] {
  const out: TicketFila[] = []
  for (const f of readdirSync(filaDir).sort()) {
    if (!/^\d{3}[a-z0-9]*-.*\.md$/.test(f)) continue
    const json = blocoJsonDoTicket(readFileSync(join(filaDir, f), 'utf8'))
    if (json) out.push({ arquivo: join(filaDir, f), json })
  }
  return out
}

/** Maior id numérico da fila (arquivo ou json), para o próximo sequencial global. */
export function proximoId(fila: TicketFila[], filaDir: string): number {
  let max = 0
  for (const f of readdirSync(filaDir)) {
    const m = /^(\d{3,})/.exec(f)
    if (m) max = Math.max(max, Number(m[1]))
  }
  for (const t of fila) {
    const m = /^(\d+)/.exec(String(t.json.id ?? ''))
    if (m) max = Math.max(max, Number(m[1]))
  }
  return max + 1
}

/** Escreve o campo `status`/`notas_status` no bloco json do ticket, preservando a prosa. */
export function gravarTicketJson(arquivo: string, json: Record<string, any>): void {
  const md = readFileSync(arquivo, 'utf8')
  const novo = md.replace(/```json\s*\n[\s\S]*?\n```/, `\`\`\`json\n${JSON.stringify(json, null, 2)}\n\`\`\``)
  writeFileSync(arquivo, novo)
}

export function ticketMd(titulo: string, prosa: string, json: Record<string, any>): string {
  return [
    `# Ticket: ${titulo}`,
    '',
    '> A **fonte de verdade de máquina** é o bloco ```json abaixo. Os scripts do',
    '> orquestrador leem e escrevem SÓ esse bloco (via jq). A prosa é para humanos',
    '> e é ignorada pela automação.',
    '',
    '## Objetivo (prosa)',
    '',
    prosa.trim() || '(escrito pelo planejador; o objetivo de máquina está no bloco json)',
    '',
    '## Campos de máquina',
    '',
    '```json',
    JSON.stringify(json, null, 2),
    '```',
    '',
  ].join('\n')
}

/**
 * Commit de arquivos no checkout principal SEM mexer no índice de quem estiver
 * trabalhando nele (mesma técnica do lib.sh:commit_motor): índice temporário a
 * partir da HEAD, só os caminhos dados.
 */
export function commitArquivos(checkout: string, arquivos: string[], msg: string, trailer: string): boolean {
  const idx = join(mkdtempSync(join(tmpdir(), 'orq-idx-')), 'index')
  const env = { ...process.env, GIT_INDEX_FILE: idx, LC_ALL: 'C' }
  const g = (...a: string[]) => spawnSync('git', ['-C', checkout, ...a], { encoding: 'utf8', env })
  if (g('read-tree', 'HEAD').status !== 0) return false
  const rels: string[] = []
  for (const a of arquivos) {
    const rel = relative(realpathSync(checkout), realpathSync(a))
    const blob = spawnSync('git', ['-C', checkout, 'hash-object', '-w', '--', a], { encoding: 'utf8' }).stdout.trim()
    if (!blob || g('update-index', '--add', '--cacheinfo', `100644,${blob},${rel}`).status !== 0) return false
    rels.push(rel)
  }
  if (g('diff', '--cached', '--quiet').status === 0) return true
  if (g('commit', '-q', '-m', msg, '-m', trailer).status !== 0) return false
  spawnSync('git', ['-C', checkout, 'reset', '-q', '--', ...rels], { encoding: 'utf8' })
  return true
}

// ─── mapa ────────────────────────────────────────────────────────────────────

/** O mapa lido da BRANCH ALVO: é lá que o promotor escreve o fechamento de frente. */
export function lerMapaDaAlvo(ctx: Ctx): Mapa | null {
  const rel = String(ctx.cfg.mapa_json ?? 'docs/roadmap/mapa.json')
  const p = join(ctx.alvoWt, rel)
  return lerJson<Mapa>(p)
}

export function frentesProntas(mapa: Mapa): { bloco: Bloco; frente: Frente }[] {
  const concluidas = new Set(mapa.blocos.flatMap((b) => b.frentes.filter((f) => f.status === 'concluida').map((f) => f.id)))
  const out: { bloco: Bloco; frente: Frente }[] = []
  for (const b of mapa.blocos) {
    if (b.status !== 'em_andamento') continue
    for (const f of b.frentes) {
      if (f.status === 'pronta' && (f.deps ?? []).every((d) => concluidas.has(d))) out.push({ bloco: b, frente: f })
    }
  }
  return out
}

/** Troca o status da linha da frente no MAPA.md (última célula da linha `| <id> |`). */
export function statusNoMapaMd(md: string, frenteId: string, status: string): string {
  const esc = frenteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return md.replace(new RegExp(`^(\\|\\s*${esc}\\s*\\|.*\\|\\s*)[a-z_]+(\\s*\\|\\s*)$`, 'm'), `$1${status}$2`)
}

/**
 * Fecha a frente e aplica a liberação automática (DEC-036): no MESMO bloco,
 * frente `rascunho` cujas deps estão todas `concluida` vira `pronta`, até o
 * teto de 2 prontas por bloco (lint 7). Bloco novo nunca: devolve as frentes
 * de outros blocos que ficaram com as deps satisfeitas (aviso bloco_novo).
 */
export function fecharFrente(
  mapa: Mapa,
  frenteId: string,
  liberacao: string,
): { mapa: Mapa; liberadas: string[]; blocoNovo: string[]; blocoCompleto: string | null } {
  const m = JSON.parse(JSON.stringify(mapa)) as Mapa
  const bloco = m.blocos.find((b) => b.frentes.some((f) => f.id === frenteId))
  if (!bloco) return { mapa: m, liberadas: [], blocoNovo: [], blocoCompleto: null }
  bloco.frentes.find((f) => f.id === frenteId)!.status = 'concluida'
  const concl = () => new Set(m.blocos.flatMap((b) => b.frentes.filter((f) => f.status === 'concluida').map((f) => f.id)))
  const liberadas: string[] = []
  if (liberacao === 'bloco_atual') {
    for (const f of bloco.frentes) {
      const prontas = bloco.frentes.filter((x) => x.status === 'pronta').length
      if (prontas >= 2) break
      if (f.status === 'rascunho' && (f.deps ?? []).every((d) => concl().has(d))) {
        f.status = 'pronta'
        liberadas.push(f.id)
      }
    }
  }
  const c = concl()
  const blocoNovo = m.blocos
    .filter((b) => b.id !== bloco.id && b.status !== 'em_andamento' && b.status !== 'concluido')
    .flatMap((b) => b.frentes.filter((f) => f.status === 'rascunho' && (f.deps ?? []).includes(frenteId) && f.deps.every((d) => c.has(d))).map((f) => f.id))
  const blocoCompleto = bloco.frentes.every((f) => f.status === 'concluida') ? bloco.id : null
  return { mapa: m, liberadas, blocoNovo, blocoCompleto }
}

// ─── avisos (P3): fila do ciclo ──────────────────────────────────────────────

export interface Aviso {
  tipo: string
  nivel: 'acao' | 'info'
  titulo: string
  texto: string
  dados?: Record<string, unknown>
  /** tipo + chave = identidade para o dedupe de 24 h. */
  chave?: string
}

export const TIPOS_ACAO = [
  'push_pendente',
  'migration_pendente',
  'decisao_pendente',
  'frente_bloqueada',
  'bloco_novo',
  'promocao_recusada',
  'orcamento',
  'ambiente',
] as const

function arqAvisosDoCiclo(runsDir: string): string {
  return join(runsDir, 'avisos', 'ciclo.jsonl')
}

export function enfileirarAviso(runsDir: string, a: Aviso): void {
  mkdirSync(join(runsDir, 'avisos'), { recursive: true })
  appendFileSync(arqAvisosDoCiclo(runsDir), `${JSON.stringify(a)}\n`)
}

// ─── P1 · planejador ─────────────────────────────────────────────────────────

const TERMINAIS = new Set(['done', 'descartado', 'obsoleto'])

export interface ResultadoPlanejador {
  rodou: boolean
  motivo: string
  frente?: string
  escritos: string[]
  aprovados: string[]
  descartados: { id: string; motivo: string }[]
  cobertura?: 'coberta' | 'parcial' | 'nova'
}

function modelos(cfg: Cfg) {
  return {
    planejador: String(cfg.modelos?.planejador ?? 'sonnet'),
    juizLote: String(cfg.planejador?.modelo_juiz_lote ?? cfg.modelos?.juiz_ticket ?? 'opus'),
    juizPromocao: String(cfg.promotor?.modelo_juiz ?? 'opus'),
  }
}

function lerRegras(ctx: Ctx): string {
  const rel = ctx.cfg.planejador?.regras_ticket
  if (typeof rel !== 'string' || !rel) return ''
  try {
    return readFileSync(join(ctx.checkout, rel), 'utf8')
  } catch {
    return ''
  }
}

type RecusaPromocao = { ts: string; motivos: string[]; tickets: string[]; alvo: string; planejada?: string }
function estadoPlanejador(ctx: Ctx): Record<string, { coberta_em?: string; fecha_com?: string[]; descartes?: { ts: string; motivo: string; objetivo: string }[]; recusa?: RecusaPromocao }> {
  return lerJson(join(ctx.runsDir, 'planejador', 'estado.json')) ?? {}
}
function gravarEstadoPlanejador(ctx: Ctx, e: ReturnType<typeof estadoPlanejador>): void {
  mkdirSync(join(ctx.runsDir, 'planejador'), { recursive: true })
  writeFileSync(join(ctx.runsDir, 'planejador', 'estado.json'), `${JSON.stringify(e, null, 2)}\n`)
}

/** Arquivos versionados na alvo que casam a allowlist da frente (nomes, com teto). */
function arquivosDaFrente(ctx: Ctx, frente: Frente, teto = 200): string[] {
  const ls = git(ctx.alvoWt, 'ls-files').out.split('\n').filter(Boolean)
  return ls.filter((f) => casaGlob(f, frente.allowlist)).slice(0, teto)
}

export function promptPlanejador(ctx: Ctx, bloco: Bloco, frente: Frente, daFrente: TicketFila[], descartes: string[], lote: number, proximo: number, recusa?: RecusaPromocao): string {
  const regras = lerRegras(ctx)
  const tickets = daFrente.map((t) => ({
    id: t.json.id,
    status: t.json.status,
    objetivo: String(t.json.objetivo ?? '').slice(0, 700),
    pathspec_allowlist: t.json.pathspec_allowlist,
  }))
  const exemplo = [...daFrente].reverse().find((t) => t.json.status === 'done') ?? daFrente[0]
  const todosDone = daFrente.length > 0 && daFrente.every((t) => TERMINAIS.has(String(t.json.status)))
  const template = (() => {
    try {
      return readFileSync(join(ctx.filaDir, '_TEMPLATE.md'), 'utf8').slice(0, 6000)
    } catch {
      return ''
    }
  })()
  return [
    'PAPEL: planejador do orquestrador (escreve tickets; nunca código).',
    '',
    `Você escreve o próximo lote de tickets da frente ${frente.id} do bloco ${bloco.id} (${bloco.nome ?? ''}).`,
    'Seu diretório de trabalho é uma cópia LIMPA da branch alvo: leia o código com Read, Grep e Glob para',
    'fazer o recon (todo arquivo, função e tabela que o ticket citar tem de existir, ou estar em cria_novo).',
    '',
    '## A frente (mapa.json)',
    JSON.stringify(frente, null, 2),
    '',
    '## O bloco',
    JSON.stringify({ id: bloco.id, nome: bloco.nome, por_que: bloco.por_que, dod: bloco.dod, gates_humanos: bloco.gates_humanos }, null, 2),
    '',
    '## Tickets que já existem nesta frente',
    tickets.length ? JSON.stringify(tickets, null, 2) : '(nenhum)',
    '',
    descartes.length ? `## Descartes recentes desta frente (não repita o erro)\n${descartes.join('\n')}\n` : '',
    recusa
      ? [
          `## Promoção recusada pelo juiz (${recusa.ts}, tickets ${recusa.tickets.join(', ')}): corrija PRIMEIRO`,
          'O código destes tickets já está na branch alvo, mas o juiz de promoção recusou levá-lo à principal pelos',
          'motivos abaixo. O PRIMEIRO ticket do lote corrige exatamente estes motivos, só nos arquivos citados, sem',
          'mudar comportamento; os motivos valem como regra. Só depois, se faltar parte da entrega, escreva o resto.',
          'Não responda entrega_coberta: true enquanto houver motivo sem ticket de correção.',
          ...recusa.motivos.map((m) => `- ${m}`),
          '',
        ].join('\n')
      : '',
    '## Arquivos versionados que casam a allowlist da frente',
    arquivosDaFrente(ctx, frente).join('\n') || '(nenhum: a frente cria arquivos novos)',
    '',
    regras ? `## Regras de ticket deste repo (obrigatórias; o juiz de lote reprova quem violar)\n${regras}\n` : '',
    template ? `## Template de ticket deste repo\n${template}\n` : '',
    exemplo ? `## Exemplo de ticket real desta fila (formato do bloco json)\n${JSON.stringify(exemplo.json, null, 2).slice(0, 9000)}\n` : '',
    '## O que fazer',
    todosDone
      ? [
          'Todos os tickets desta frente estão done. Compare a ENTREGA da frente com os objetivos dos tickets done:',
          '- se a entrega está coberta, responda entrega_coberta: true e tickets: [];',
          '- se falta parte, escreva SÓ o que falta (até ' + lote + ' tickets) e marque fecha_frente: true quando',
          '  esses tickets, prontos, cobrirem a entrega inteira.',
        ].join('\n')
      : tickets.length
        ? `Continue a frente: escreva até ${lote} tickets que avançam a entrega sem repetir os existentes. fecha_frente: true só se, com eles, a entrega fica coberta.`
        : `A frente ainda não tem ticket: escreva o primeiro lote (até ${lote} tickets), na ordem de execução. fecha_frente: true só se o lote cobre a entrega inteira.`,
    '- Granularidade: um ticket = uma mudança revisável (diff_estimado <= 600), allowlist mínima (<= 8 paths) e',
    '  dentro da allowlist da frente; critério `alvo` executável que FALHA hoje e passa depois; guarda de typecheck',
    '  e da suíte inteira; um critério `avaliador` com o que o juiz deve conferir.',
    '- Dependência entre tickets do lote: use "#1", "#2" (posição no lote); para ticket existente use o id.',
    '- Nunca escreva em caminho fora da allowlist da frente. Nunca invente decisão de produto: se faltar uma',
    '  decisão humana para escrever o ticket, responda duvida com a pergunta exata e tickets: [].',
    `- Os ids são atribuídos pelo script (o próximo é ${String(proximo).padStart(3, '0')}): NÃO ponha id, status, origem, frente nem bloco.`,
    '',
    '## Saída (só isto, num bloco ```json no fim da resposta)',
    '```json',
    JSON.stringify(
      {
        entrega_coberta: false,
        duvida: null,
        fecha_frente: false,
        tickets: [
          {
            titulo: 'frase curta',
            slug: 'kebab-curto',
            prosa: 'por que, decisões aplicadas, recon feito (arquivo:linha)',
            objetivo: 'o objetivo de máquina, completo e verificável',
            pathspec_allowlist: ['caminho/exato.ts'],
            cria_novo: ['caminho/novo.ts'],
            contexto_juiz: ['arquivo/que/o/juiz/deve/ler.ts'],
            recon: [{ descricao: '...', cmd: "grep -c 'x' arquivo", espera: '1' }],
            dependencias: ['#1'],
            diff_estimado: 200,
            criterios_aceite: [{ tipo: 'alvo', descricao: '...', cmd: '...', espera: '...' }],
          },
        ],
      },
      null,
      2,
    ),
    '```',
  ].join('\n')
}

export function promptJuizLote(ctx: Ctx, frente: Frente, candidatos: Record<string, any>[]): string {
  return [
    'PAPEL: juiz de lote do orquestrador. Contexto limpo: você só vê o que está abaixo.',
    '',
    'Julgue cada ticket candidato contra as REGRAS do repo e a frente. Reprove o candidato que viola',
    'qualquer regra, que sai da allowlist da frente, cujo critério alvo é tautológico ou não falha hoje,',
    'que inventa decisão de produto ou que é grande demais para um diff revisável.',
    '',
    '## Frente',
    JSON.stringify(frente, null, 2),
    '',
    '## Regras do repo',
    lerRegras(ctx) || '(o repo não declarou regras_ticket)',
    '',
    '## Candidatos',
    JSON.stringify(candidatos, null, 2),
    '',
    '## Saída (só isto, num bloco ```json)',
    '```json',
    '{"vereditos": [{"id": "024", "aprovado": true, "motivo": "uma frase"}]}',
    '```',
  ].join('\n')
}

/** O gate de ticket do kit (gate-ticket.ts) sobre os ids dados: id -> violações. */
export function gateDeTicket(ctx: Ctx, ids: string[]): Map<string, string[]> {
  const out = new Map<string, string[]>()
  if (ids.length === 0) return out
  const tsx = join(ctx.checkout, 'node_modules', '.bin', 'tsx')
  const gate = join(dirname(fileURLToPath(import.meta.url)), 'gate-ticket.ts')
  const r = spawnSync(existsSync(tsx) ? tsx : 'npx', [...(existsSync(tsx) ? [] : ['--no-install', 'tsx']), gate, '--fila', ctx.filaDir, '--violacoes', ...ids], {
    encoding: 'utf8',
    cwd: ctx.checkout,
    timeout: 300_000,
  })
  if (r.status === 2 || r.status === null) {
    for (const id of ids) out.set(id, [`gate de ticket não rodou: ${(r.stderr ?? '').trim().slice(0, 300) || 'sem saída'}`])
    return out
  }
  for (const l of (r.stdout ?? '').split('\n').filter(Boolean)) {
    const m = /^(\d{3}[a-z0-9]*)-[^:]*:(\S*) (.*)$/.exec(l)
    if (!m) continue
    out.set(m[1]!, [...(out.get(m[1]!) ?? []), `${m[2]}: ${m[3]}`])
  }
  return out
}

export function planejar(ctx: Ctx): ResultadoPlanejador {
  const res: ResultadoPlanejador = { rodou: false, motivo: '', escritos: [], aprovados: [], descartados: [] }
  const loop = ctx.cfg.loops?.planejador ?? {}
  const pl = ctx.cfg.planejador ?? {}
  if (loop.ativo !== true) return { ...res, motivo: 'desligado' }
  const modo = loop.modo === 'auto' ? 'auto' : 'dry_run'
  const fila = lerFila(ctx.filaDir)
  const pendentes = fila.filter((t) => t.json.status === 'pendente').length
  const limiar = Number(pl.limiar_fila ?? 3)
  if (pendentes >= limiar) return { ...res, motivo: `fila_cheia_${pendentes}` }
  const teto = Number(ctx.cfg.orcamento?.usd_dia ?? 0)
  const reserva = Number(pl.reserva_orcamento_pct ?? 20)
  if (teto > 0 && gastoDoDia(ctx) > teto * (1 - reserva / 100)) {
    evento(ctx.runsDir, '---', 'PLANEJADOR', { motivo: 'orcamento', gasto: gastoDoDia(ctx).toFixed(2), teto })
    return { ...res, motivo: 'orcamento' }
  }
  const mapa = lerMapaDaAlvo(ctx)
  if (!mapa) return { ...res, motivo: 'sem_mapa' }

  // A frente: a primeira pronta (deps concluídas) do bloco em andamento cujos
  // tickets estão todos fora do caminho de execução. Frente com bloqueado vira
  // aviso, não lote novo: tapar bloqueio com ticket novo esconde o defeito.
  let escolha: { bloco: Bloco; frente: Frente } | null = null
  for (const c of frentesProntas(mapa)) {
    const daFrente = fila.filter((t) => t.json.frente === c.frente.id)
    const bloqueados = daFrente.filter((t) => t.json.status === 'bloqueado').map((t) => String(t.json.id))
    if (bloqueados.length > 0) {
      enfileirarAviso(ctx.runsDir, {
        tipo: 'frente_bloqueada',
        nivel: 'acao',
        titulo: `Frente ${c.frente.id} com ticket bloqueado`,
        texto: `A frente ${c.frente.id} tem ${bloqueados.join(', ')} bloqueado(s); o planejador não escreve lote novo para ela até isso ser resolvido.`,
        dados: { frente: c.frente.id, tickets: bloqueados },
        chave: `${c.frente.id}:${bloqueados.join(',')}`,
      })
      continue
    }
    if (daFrente.some((t) => !TERMINAIS.has(String(t.json.status)))) continue
    const est = estadoPlanejador(ctx)[c.frente.id]
    // Recusa do juiz de promoção (2.2.0, D4): a frente volta, mesmo coberta ou
    // com fecha_com cumprido, para o lote que corrige os motivos.
    if (est?.recusa && !est.recusa.planejada) {
      escolha = c
      break
    }
    if (est?.coberta_em) continue
    if (est?.fecha_com?.length && est.fecha_com.every((id) => fila.some((t) => String(t.json.id) === id && t.json.status === 'done'))) continue
    escolha = c
    break
  }
  if (!escolha) {
    evento(ctx.runsDir, '---', 'PLANEJADOR', { motivo: 'sem_frente', pendentes })
    return { ...res, motivo: 'sem_frente' }
  }
  const { bloco, frente } = escolha
  res.rodou = true
  res.frente = frente.id
  const daFrente = fila.filter((t) => t.json.frente === frente.id)
  res.cobertura = daFrente.length === 0 ? 'nova' : 'parcial'
  const est = estadoPlanejador(ctx)
  const seteDias = ctx.agora().getTime() - 7 * 86400_000
  const descartes = (est[frente.id]?.descartes ?? []).filter((d) => Date.parse(d.ts) >= seteDias).slice(-20).map((d) => `- ${d.motivo}: ${d.objetivo}`)
  const lote = Math.max(1, Math.min(5, Number(pl.lote ?? 3)))
  const proximo = proximoId(fila, ctx.filaDir)
  evento(ctx.runsDir, '---', 'PLANEJADOR_INICIO', { frente: frente.id, modo, pendentes, proximo: String(proximo).padStart(3, '0') })

  // A escrita do lote: cwd numa worktree descartável da alvo, só leitura.
  const pasta = join(ctx.runsDir, 'planejador', tsLocal(ctx.agora()).replace(/[:]/g, '').slice(0, 15))
  mkdirSync(pasta, { recursive: true })
  const prompt = promptPlanejador(ctx, bloco, frente, daFrente, descartes, lote, proximo, est[frente.id]?.recusa)
  writeFileSync(join(pasta, 'prompt.txt'), prompt)
  const wtLeitura = worktreeDescartavel(ctx, 'planejador')
  let r: RespostaClaude
  try {
    r = ctx.claude({
      cwd: wtLeitura ?? ctx.alvoWt,
      timeoutSecs: Number(pl.timeout_secs ?? ctx.cfg.claude_timeout_secs ?? 1800),
      args: [
        '-p', prompt,
        '--output-format', 'json',
        '--model', modelos(ctx.cfg).planejador,
        '--strict-mcp-config',
        '--setting-sources', 'project',
        '--disable-slash-commands',
        '--allowedTools', 'Read', 'Grep', 'Glob',
        '--disallowedTools', 'Bash', 'Edit', 'Write', 'NotebookEdit', 'WebFetch', 'WebSearch', 'Task',
        '--max-turns', String(pl.max_turns ?? 40),
      ],
    })
  } finally {
    if (wtLeitura) removerWorktree(ctx, wtLeitura)
  }
  writeFileSync(join(pasta, 'saida.json'), r.saida)
  registrarCusto(ctx, 'planejador', frente.id, r)
  const saida = extrairJson(r.texto)
  if (!saida || typeof saida !== 'object') {
    evento(ctx.runsDir, '---', 'REPOSICAO', { motivo: 'parse', frente: frente.id, rc: r.rc })
    return { ...res, motivo: 'parse' }
  }

  // Dúvida de escopo: decisão pendente, frente bloqueada_humano, aviso. Nunca inventa.
  if (typeof saida.duvida === 'string' && saida.duvida.trim()) {
    const linha = `- [ ] ${diaLocal(ctx.agora())} · ${frente.id} · planejador: ${saida.duvida.trim().replace(/\n+/g, ' ')}\n`
    const decisoes = join(ctx.checkout, String(ctx.cfg.decisoes_file ?? 'docs/fila/decisoes-pendentes.md'))
    appendFileSync(decisoes, linha)
    commitArquivos(ctx.checkout, [decisoes], `fila: decisão pendente da ${frente.id} (planejador)`, 'Orq-Planejador: duvida')
    marcarFrenteNaAlvo(ctx, frente.id, 'bloqueada_humano', `orq: ${frente.id} bloqueada_humano (dúvida do planejador)`)
    enfileirarAviso(ctx.runsDir, {
      tipo: 'decisao_pendente',
      nivel: 'acao',
      titulo: `Decisão pendente na ${frente.id}`,
      texto: saida.duvida.trim(),
      dados: { frente: frente.id },
      chave: `${frente.id}:${createHash('sha256').update(saida.duvida).digest('hex').slice(0, 12)}`,
    })
    evento(ctx.runsDir, '---', 'DECISAO_PENDENTE', { frente: frente.id, origem: 'planejador' })
    return { ...res, motivo: 'duvida' }
  }

  const brutos = Array.isArray(saida.tickets) ? (saida.tickets as Record<string, any>[]).slice(0, lote) : []
  if (brutos.length === 0) {
    if (saida.entrega_coberta === true) {
      const e = estadoPlanejador(ctx)
      e[frente.id] = { ...(e[frente.id] ?? {}), coberta_em: tsLocal(ctx.agora()) }
      gravarEstadoPlanejador(ctx, e)
      evento(ctx.runsDir, '---', 'PLANEJADOR_FIM', { frente: frente.id, entrega: 'coberta', escritos: 0 })
      return { ...res, cobertura: 'coberta', motivo: 'entrega_coberta' }
    }
    evento(ctx.runsDir, '---', 'REPOSICAO', { motivo: 'lote_vazio', frente: frente.id })
    return { ...res, motivo: 'lote_vazio' }
  }

  // IDs sequenciais globais, do script. Dependência "#n" vira o id do lote.
  const ids = brutos.map((_, i) => String(proximo + i).padStart(3, '0'))
  const arquivos: string[] = []
  const jsons: Record<string, any>[] = []
  brutos.forEach((b, i) => {
    const slug = String(b.slug ?? `planejado-${ids[i]}`).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || `planejado-${ids[i]}`
    const deps = (Array.isArray(b.dependencias) ? b.dependencias : []).map((d: unknown) => {
      const m = /^#(\d+)$/.exec(String(d))
      return m ? ids[Number(m[1]) - 1] ?? String(d) : String(d)
    })
    const json: Record<string, any> = {
      id: ids[i],
      bloco: bloco.id,
      frente: frente.id,
      slug,
      origem: 'planejador',
      status: 'pendente',
      objetivo: String(b.objetivo ?? ''),
      pathspec_allowlist: Array.isArray(b.pathspec_allowlist) ? b.pathspec_allowlist : [],
      ...(Array.isArray(b.cria_novo) && b.cria_novo.length ? { cria_novo: b.cria_novo } : {}),
      ...(Array.isArray(b.contexto_juiz) && b.contexto_juiz.length ? { contexto_juiz: b.contexto_juiz } : {}),
      ...(Array.isArray(b.recon) && b.recon.length ? { recon: b.recon } : {}),
      dependencias: deps,
      diff_estimado: Number(b.diff_estimado ?? 0),
      risco: '',
      criterios_aceite: Array.isArray(b.criterios_aceite) ? b.criterios_aceite : [],
      hash_candidato: createHash('sha256')
        .update(JSON.stringify([b.objetivo, b.pathspec_allowlist, b.criterios_aceite, deps]))
        .digest('hex')
        .slice(0, 16),
    }
    const arq = join(ctx.filaDir, `${ids[i]}-${slug}.md`)
    writeFileSync(arq, ticketMd(String(b.titulo ?? slug), String(b.prosa ?? ''), json))
    arquivos.push(arq)
    jsons.push(json)
    evento(ctx.runsDir, ids[i]!, 'CANDIDATO', { frente: frente.id, origem: 'planejador' })
  })
  res.escritos = ids

  // Gate de ticket (gate-ticket.ts), depois juiz de lote nos que passaram.
  const descartar = (i: number, motivo: string, detalhe: string) => {
    jsons[i]!.status = 'descartado'
    jsons[i]!.notas_status = `descartado (${motivo}): ${detalhe}`.slice(0, 1500)
    gravarTicketJson(arquivos[i]!, jsons[i]!)
    res.descartados.push({ id: ids[i]!, motivo })
    evento(ctx.runsDir, ids[i]!, 'DESCARTADO', { motivo, frente: frente.id })
  }
  const viol = gateDeTicket(ctx, ids)
  ids.forEach((id, i) => {
    const v = viol.get(id)
    if (v?.length) descartar(i, 'gate', v.join(' | '))
  })
  const vivos = ids.map((id, i) => ({ id, i })).filter(({ i }) => jsons[i]!.status !== 'descartado')
  if (vivos.length > 0) {
    const pj = promptJuizLote(ctx, frente, vivos.map(({ i }) => jsons[i]!))
    writeFileSync(join(pasta, 'juiz-lote.prompt.txt'), pj)
    const cwdJuiz = mkdtempSync(join(tmpdir(), 'orq-juiz-lote-'))
    const rj = ctx.claude({
      cwd: cwdJuiz,
      timeoutSecs: Number(ctx.cfg.claude_timeout_secs ?? 1800),
      args: ['-p', pj, '--output-format', 'json', '--model', modelos(ctx.cfg).juizLote, '--tools', '', '--allowedTools', '', '--max-turns', '1', '--strict-mcp-config', '--setting-sources', 'project', '--disable-slash-commands'],
    })
    rmSync(cwdJuiz, { recursive: true, force: true })
    writeFileSync(join(pasta, 'juiz-lote.saida.json'), rj.saida)
    registrarCusto(ctx, 'juiz_lote', frente.id, rj)
    const vj = extrairJson(rj.texto)
    const vereditos = new Map<string, { aprovado: boolean; motivo: string }>()
    for (const v of Array.isArray(vj?.vereditos) ? vj.vereditos : []) vereditos.set(String(v.id), { aprovado: v.aprovado === true, motivo: String(v.motivo ?? '') })
    for (const { id, i } of vivos) {
      const v = vereditos.get(id)
      if (!v) descartar(i, 'juiz_lote_ilegivel', 'o juiz de lote não deu veredito legível para este candidato')
      else if (!v.aprovado) descartar(i, 'juiz_lote', v.motivo)
    }
  }
  for (const { id, i } of vivos) {
    if (jsons[i]!.status === 'descartado') continue
    jsons[i]!.status = modo === 'auto' ? 'pendente' : 'candidato'
    jsons[i]!.gate_ok = tsLocal(ctx.agora())
    gravarTicketJson(arquivos[i]!, jsons[i]!)
    res.aprovados.push(id)
    evento(ctx.runsDir, id, modo === 'auto' ? 'PENDENTE' : 'CANDIDATO_APROVADO', { frente: frente.id, origem: 'planejador' })
  }

  // Estado da frente: descartes (aprendizado barato) e o lote que fecha a frente.
  const e = estadoPlanejador(ctx)
  const ef = e[frente.id] ?? {}
  ef.descartes = [
    ...(ef.descartes ?? []),
    ...res.descartados.map((d) => ({ ts: tsLocal(ctx.agora()), motivo: d.motivo, objetivo: String(jsons[ids.indexOf(d.id)]?.objetivo ?? '').slice(0, 200) })),
  ].slice(-40)
  // Só o lote INTEIRO fecha a frente (2.2.0, D2): com descarte, o que caiu
  // falta na entrega, e a frente segue aberta para o próximo planejamento.
  if (saida.fecha_frente === true && res.aprovados.length > 0 && res.descartados.length === 0) ef.fecha_com = [...res.aprovados]
  // A recusa vira lote uma vez só (D4): outra recusa, com motivos novos, reabre.
  if (ef.recusa && res.aprovados.length > 0) ef.recusa.planejada = tsLocal(ctx.agora())
  e[frente.id] = ef
  gravarEstadoPlanejador(ctx, e)

  // Commit dos tickets no checkout principal (a fila é fonte única lá), sem push.
  commitArquivos(
    ctx.checkout,
    arquivos,
    `fila: planejador ${frente.id} (${res.aprovados.length} ${modo === 'auto' ? 'pendente' : 'candidato'}, ${res.descartados.length} descartado)`,
    `Orq-Planejador: ${frente.id} ${ids.join(',')}`,
  )

  // Duas drenagens seguidas com o lote inteiro descartado: frente bloqueada_humano.
  if (res.aprovados.length === 0) {
    const n = (frente.lotes_descartados_consecutivos ?? 0) + 1
    const lim = Number(ctx.cfg.gate_ticket?.lotes_descartados_para_bloquear_frente ?? 2)
    if (n >= lim) {
      marcarFrenteNaAlvo(ctx, frente.id, 'bloqueada_humano', `orq: ${frente.id} bloqueada_humano (${n} lotes descartados)`)
      enfileirarAviso(ctx.runsDir, {
        tipo: 'frente_bloqueada',
        nivel: 'acao',
        titulo: `Frente ${frente.id} bloqueada: ${n} lotes descartados`,
        texto: res.descartados.map((d) => `${d.id}: ${d.motivo}`).join('; '),
        dados: { frente: frente.id },
        chave: `${frente.id}:lotes`,
      })
    } else {
      marcarFrenteNaAlvo(ctx, frente.id, null, `orq: ${frente.id} lote descartado (${n})`, n)
    }
  } else if ((frente.lotes_descartados_consecutivos ?? 0) > 0) {
    marcarFrenteNaAlvo(ctx, frente.id, null, `orq: ${frente.id} lote aceito`, 0)
  }
  evento(ctx.runsDir, '---', 'PLANEJADOR_FIM', {
    frente: frente.id,
    escritos: ids.length,
    aprovados: res.aprovados.join(',') || '-',
    descartados: res.descartados.length,
    modo,
  })
  res.motivo = 'ok'
  return res
}

/** Muda status (ou o contador de lotes descartados) da frente no mapa da ALVO, num commit lá. */
export function marcarFrenteNaAlvo(ctx: Ctx, frenteId: string, status: string | null, msg: string, lotesDescartados?: number): boolean {
  const relJ = String(ctx.cfg.mapa_json ?? 'docs/roadmap/mapa.json')
  const relM = String(ctx.cfg.mapa_md ?? 'docs/roadmap/MAPA.md')
  const mapa = lerJson<Mapa>(join(ctx.alvoWt, relJ))
  if (!mapa) return false
  const f = mapa.blocos.flatMap((b) => b.frentes).find((x) => x.id === frenteId)
  if (!f) return false
  if (status) f.status = status
  if (lotesDescartados !== undefined) f.lotes_descartados_consecutivos = lotesDescartados
  writeFileSync(join(ctx.alvoWt, relJ), `${JSON.stringify(mapa, null, 2)}\n`)
  const arqs = [relJ]
  if (status && existsSync(join(ctx.alvoWt, relM))) {
    writeFileSync(join(ctx.alvoWt, relM), statusNoMapaMd(readFileSync(join(ctx.alvoWt, relM), 'utf8'), frenteId, status))
    arqs.push(relM)
  }
  git(ctx.alvoWt, 'add', '--', ...arqs)
  return git(ctx.alvoWt, '-c', 'user.name=orquestrador', '-c', 'user.email=orquestrador@localhost', 'commit', '-q', '-m', msg, '-m', 'Orq-Mapa: writeback', '--', ...arqs).rc === 0
}

// ─── worktrees descartáveis ──────────────────────────────────────────────────

function dirWorktrees(ctx: Ctx): string {
  return resolve(ctx.checkout, String(ctx.cfg.worktrees_dir ?? '../_worktrees'))
}

/** Worktree destacada no topo da alvo, com node_modules (e .env.local se o config deixar) linkados. */
export function worktreeDescartavel(ctx: Ctx, papel: string, comNodeModules = false): string | null {
  const alvo = String(ctx.cfg.branch_alvo)
  const pref = String(ctx.cfg.worktrees_prefixo ?? 'orq-')
  const wt = join(dirWorktrees(ctx), `${pref}${papel}-${process.pid}`)
  mkdirSync(dirname(wt), { recursive: true })
  if (existsSync(wt)) removerWorktree(ctx, wt)
  if (git(ctx.checkout, 'worktree', 'add', '--detach', '-q', wt, alvo).rc !== 0) return null
  if (comNodeModules) {
    const nm = join(ctx.checkout, 'node_modules')
    if (existsSync(nm) && !existsSync(join(wt, 'node_modules'))) symlinkSync(nm, join(wt, 'node_modules'))
    if (ctx.cfg.worktree?.linkar_env !== false) {
      for (const env of ['.env.local']) {
        if (existsSync(join(ctx.checkout, env)) && !existsSync(join(wt, env))) symlinkSync(join(ctx.checkout, env), join(wt, env))
      }
    }
  }
  return wt
}

export function removerWorktree(ctx: Ctx, wt: string): void {
  git(ctx.checkout, 'worktree', 'remove', '--force', wt)
  if (existsSync(wt)) rmSync(wt, { recursive: true, force: true })
}

// ─── P2 · promotor ───────────────────────────────────────────────────────────

export interface ResultadoPromotor {
  rodou: boolean
  promovido: boolean
  motivo: string
  de?: string
  para?: string
  tickets?: string[]
  frentesConcluidas?: string[]
  liberadas?: string[]
}

function ticketsDoIntervalo(ctx: Ctx, de: string, ate: string): string[] {
  const trailer = String(ctx.cfg.executor?.trailer_commit ?? 'Orq-Ticket')
  const log = git(ctx.checkout, 'log', '--format=%B', `${de}..${ate}`).out
  const ids = new Set<string>()
  for (const m of log.matchAll(new RegExp(`^${trailer}: (\\S+)$`, 'gm'))) ids.add(m[1]!)
  return [...ids].sort()
}

function filaRel(ctx: Ctx): string {
  return relative(realpathSync(ctx.checkout), realpathSync(ctx.filaDir))
}

/** Arquivos do diff principal..alvo, sem a fila (a fila é do loop, não do ticket). */
function arquivosDoDiff(ctx: Ctx, principal: string, alvo: string): string[] {
  return git(ctx.checkout, 'diff', '--name-only', `${principal}...${alvo}`).out.split('\n').filter(Boolean)
}

export function promptJuizPromocao(ctx: Ctx, diff: string, tickets: Record<string, any>[], principal: string, alvo: string): string {
  const cap = Number(ctx.cfg.promotor?.cap_diff_chars ?? 150_000)
  const regrasRepo = lerRegras(ctx)
  const proib = ctx.cfg.proibicoes_absolutas?.regras ?? []
  return [
    'PAPEL: juiz de promoção do orquestrador. Contexto limpo: você só vê o que está abaixo.',
    '',
    `Decida se o diff ${principal}..${alvo} pode entrar na ${principal} LOCAL (nunca há push; o push é humano).`,
    'Os gates (typecheck, testes completos, build, lint do mapa) já passaram no topo da alvo. Você cobra o que',
    'gate não pega: mudança fora do que os tickets pediram, regra do repo violada, teste afrouxado ou tautológico,',
    'segredo ou dado pessoal no diff, efeito colateral perigoso (escrita externa, migration aplicada, envio).',
    'Na dúvida, recuse com o motivo: recusar só adia, e a fila continua drenando na alvo.',
    '',
    '## Regras do repo',
    regrasRepo || '(sem regras_ticket)',
    proib.length ? `\n## Proibições absolutas do config\n${proib.map((r: string) => `- ${r}`).join('\n')}` : '',
    '',
    '## Tickets incluídos',
    JSON.stringify(tickets, null, 2).slice(0, 40_000),
    '',
    `## Diff (${diff.length > cap ? `truncado em ${cap} de ${diff.length} caracteres` : 'inteiro'})`,
    diff.slice(0, cap),
    '',
    '## Saída (só isto, num bloco ```json)',
    '```json',
    '{"aprovar": true, "motivos": ["..."], "resumo": "uma frase do que entra na principal"}',
    '```',
  ].join('\n')
}

/** Roda os gates do promotor numa worktree limpa no topo da alvo; devolve o primeiro que falhou. */
export function gatesDoPromotor(ctx: Ctx, wt: string, pasta: string): { ok: boolean; falhou?: string; teste?: string } {
  const nomes: string[] = Array.isArray(ctx.cfg.promotor?.gates) ? ctx.cfg.promotor.gates : ['typecheck', 'testes', 'build', 'lint-mapa']
  const tout = Number(ctx.cfg.promotor?.timeout_gate_secs ?? 1800) * 1000
  const linhas: string[] = []
  for (const nome of nomes) {
    let cmd: string | null = null
    if (nome === 'lint-mapa') cmd = 'python3 scripts/roadmap/lint-mapa.py'
    else {
      const g = (ctx.cfg.gates ?? []).find((x: any) => x?.nome === nome || x?.papel === nome)
      cmd = g?.cmd ?? null
    }
    if (!cmd) {
      linhas.push(`FALHA ${nome} — gate não existe no config`)
      writeFileSync(join(pasta, 'gates.txt'), `${linhas.join('\n')}\n`)
      return { ok: false, falhou: nome }
    }
    const t0 = Date.now()
    const r = spawnSync('bash', ['-c', cmd], {
      cwd: wt,
      encoding: 'utf8',
      timeout: tout,
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, ORQ_GATE: '1', NO_COLOR: '1', FORCE_COLOR: '0', CI: '1' },
    })
    const saida = `${r.stdout ?? ''}${r.stderr ?? ''}`
    const ok = r.status === 0
    linhas.push(`${ok ? 'ok   ' : 'FALHA'} ${nome} ${Math.round((Date.now() - t0) / 1000)}s rc=${r.status ?? 'timeout'}`)
    if (!ok) {
      writeFileSync(join(pasta, `gate-${nome}.txt`), saida)
      writeFileSync(join(pasta, 'gates.txt'), `${linhas.join('\n')}\n`)
      const m = /^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)\s+>\s+(.+)$/m.exec(saida)
      return { ok: false, falhou: nome, ...(m ? { teste: `${m[1]}::${m[2]!.trim()}` } : {}) }
    }
  }
  writeFileSync(join(pasta, 'gates.txt'), `${linhas.join('\n')}\n`)
  return { ok: true }
}

/** principal à frente de origin/principal: o push que só o humano faz. */
export function avisoPushPendente(ctx: Ctx, juiz?: { resumo?: string; motivos?: string[] }): void {
  const principal = String(ctx.cfg.branch_principal ?? ctx.cfg.branch_protegida ?? 'main')
  if (git(ctx.checkout, 'rev-parse', '--verify', '--quiet', `refs/remotes/origin/${principal}`).rc !== 0) return
  const n = Number(git(ctx.checkout, 'rev-list', '--count', `origin/${principal}..${principal}`).out.trim() || 0)
  if (n === 0) return
  const sha = git(ctx.checkout, 'rev-parse', '--short', principal).out.trim()
  const log = git(ctx.checkout, 'log', '--oneline', '--no-decorate', `origin/${principal}..${principal}`).out.trim().split('\n')
  const stat = git(ctx.checkout, 'diff', '--shortstat', `origin/${principal}..${principal}`).out.trim()
  enfileirarAviso(ctx.runsDir, {
    tipo: 'push_pendente',
    nivel: 'acao',
    titulo: `Push pendente: ${principal} local ${n} commit(s) à frente de origin/${principal}`,
    texto: [
      `${principal} local em ${sha}, ${n} commit(s) à frente de origin/${principal} (${stat}).`,
      juiz?.resumo ? `Juiz de promoção: ${juiz.resumo}` : '',
      `Comando (seu): git -C ${ctx.checkout} push origin ${principal}`,
    ]
      .filter(Boolean)
      .join('\n'),
    dados: { commits: log.slice(0, 30), sha, n, stat, ...(juiz ? { juiz } : {}) },
    chave: `${principal}:${sha}`,
  })
}

/**
 * Recusa do juiz de promoção no estado do planejador (2.2.0, D4): cada frente
 * dos tickets do intervalo guarda os motivos, e o planejador volta a ela com a
 * correção como 1º ticket. `null` apaga (promoção aprovada).
 */
function marcarRecusaNasFrentes(ctx: Ctx, fila: TicketFila[], tickets: string[], r: RecusaPromocao | null): void {
  const frentes = new Set(tickets.map((id) => fila.find((t) => String(t.json.id) === id)?.json.frente).filter((f): f is string => typeof f === 'string'))
  if (frentes.size === 0) return
  const e = estadoPlanejador(ctx)
  let mudou = false
  for (const f of frentes) {
    if (r) {
      e[f] = { ...(e[f] ?? {}), recusa: { ...r, tickets: tickets.filter((id) => fila.find((t) => String(t.json.id) === id)?.json.frente === f) } }
      mudou = true
    } else if (e[f]?.recusa) {
      delete e[f]!.recusa
      mudou = true
    }
  }
  if (mudou) gravarEstadoPlanejador(ctx, e)
}

export function promover(ctx: Ctx): ResultadoPromotor {
  const pr = ctx.cfg.promotor ?? {}
  const res: ResultadoPromotor = { rodou: false, promovido: false, motivo: '' }
  const principal = String(ctx.cfg.branch_principal ?? ctx.cfg.branch_protegida ?? 'main')
  const alvo = String(ctx.cfg.branch_alvo)
  if (pr.modo !== 'auto') return { ...res, motivo: 'modo_humano' }
  if (principal === alvo) return { ...res, motivo: 'alvo_igual_principal' }
  if (git(ctx.checkout, 'rev-list', '--count', `${principal}..${alvo}`).out.trim() === '0') {
    avisoPushPendente(ctx)
    return { ...res, motivo: 'nada_a_promover' }
  }
  res.rodou = true
  const recusa = (motivo: string, detalhe: string, extra: Record<string, string | number> = {}): ResultadoPromotor => {
    evento(ctx.runsDir, '---', 'PROMOCAO_RECUSADA', { motivo, ...extra })
    if (motivo !== 'gate_humano') {
      enfileirarAviso(ctx.runsDir, {
        tipo: 'promocao_recusada',
        nivel: 'acao',
        titulo: `Promoção recusada (${motivo})`,
        texto: detalhe,
        dados: { motivo, ...extra },
        chave: `${motivo}:${git(ctx.checkout, 'rev-parse', '--short', alvo).out.trim()}`,
      })
    }
    avisoPushPendente(ctx)
    return { ...res, motivo }
  }
  // Bloqueio duro: checkout principal sujo (o ff mexeria em árvore com trabalho alheio).
  const sujo = git(ctx.checkout, 'status', '--porcelain', '--untracked-files=no').out.trim()
  if (sujo) return recusa('principal_sujo', `O checkout principal tem modificação não commitada:\n${sujo.slice(0, 2000)}`)
  const atual = git(ctx.checkout, 'rev-parse', '--abbrev-ref', 'HEAD').out.trim()
  if (atual !== principal) return recusa('principal_fora_de_branch', `O checkout principal está em '${atual}', não em ${principal}.`)

  // Sincronia: a principal anda com os commits de status da fila (o loop
  // commita lá). Eles entram na alvo por merge (sem conflito: ticket nenhum
  // toca a fila), e só então a principal é ancestral da alvo e o ff existe.
  if (git(ctx.checkout, 'merge-base', '--is-ancestor', principal, alvo).rc !== 0) {
    if (git(ctx.alvoWt, 'status', '--porcelain', '--untracked-files=no').out.trim()) return recusa('alvo_suja', `A worktree da ${alvo} (${ctx.alvoWt}) está suja.`)
    const fora = git(ctx.checkout, 'diff', '--name-only', `${alvo}...${principal}`).out.split('\n').filter(Boolean)
    const r = git(ctx.alvoWt, '-c', 'user.name=orquestrador', '-c', 'user.email=orquestrador@localhost', 'merge', '--no-ff', '-q', '-m', `orq: sincroniza ${principal} em ${alvo} (promotor)`, '-m', 'Orq-Promotor: sincronia', principal)
    if (r.rc !== 0) {
      git(ctx.alvoWt, 'merge', '--abort')
      return recusa('sync_conflito', `O merge de ${principal} em ${alvo} deu conflito (arquivos da ${principal}: ${fora.slice(0, 20).join(', ')}). Resolva à mão com o loop pausado.`)
    }
    evento(ctx.runsDir, '---', 'SINCRONIA', { de: principal, para: alvo, arquivos: fora.length })
  }
  if (git(ctx.checkout, 'merge-base', '--is-ancestor', principal, alvo).rc !== 0) return recusa('principal_nao_ancestral', `${principal} não é ancestral de ${alvo} depois da sincronia.`)

  const de = git(ctx.checkout, 'rev-parse', principal).out.trim()
  const para = git(ctx.checkout, 'rev-parse', alvo).out.trim()
  res.de = de
  res.para = para
  const arquivos = arquivosDoDiff(ctx, principal, alvo)
  const tickets = ticketsDoIntervalo(ctx, principal, alvo)
  res.tickets = tickets

  // Bloqueio duro, sem juiz: path de gate humano ou da zona proibida no diff.
  const gatesHumanos: string[] = Array.isArray(pr.paths_gate_humano) ? pr.paths_gate_humano : []
  const zona: string[] = [
    ...(ctx.cfg.zona_proibida?.no_write_paths ?? []),
    ...(ctx.cfg.zona_proibida?.no_write_credenciais?.padroes ?? []),
  ].filter((g: unknown) => typeof g === 'string' && !String(g).startsWith('<'))
  const humanos = arquivos.filter((f) => casaGlob(f, gatesHumanos))
  const proibidos = arquivos.filter((f) => casaGlob(f, zona))
  if (proibidos.length > 0) return recusa('zona_proibida', `O diff toca a zona proibida: ${proibidos.join(', ')}`, { arquivos: proibidos.join(',') })
  if (humanos.length > 0) {
    const migs = humanos.filter((f) => f.endsWith('.sql'))
    const pasta = join(ctx.runsDir, 'promotor')
    mkdirSync(pasta, { recursive: true })
    const linhas = humanos.map((f) => {
      const conteudo = git(ctx.checkout, 'show', `${alvo}:${f}`).out
      return { arquivo: f, sha256: createHash('sha256').update(conteudo).digest('hex') }
    })
    for (const l of linhas) {
      enfileirarAviso(ctx.runsDir, {
        tipo: l.arquivo.endsWith('.sql') ? 'migration_pendente' : 'promocao_recusada',
        nivel: 'acao',
        titulo: l.arquivo.endsWith('.sql') ? `Migration pendente: ${basename(l.arquivo)}` : `Gate humano: ${l.arquivo}`,
        texto: [
          `A ${alvo} tem ${l.arquivo} (sha256 ${l.sha256}). Aplicar é seu; o promotor não leva a ${alvo} para a ${principal} enquanto este arquivo estiver no diff.`,
          `Tickets no intervalo: ${tickets.join(', ') || '—'}.`,
        ].join('\n'),
        dados: { arquivo: l.arquivo, sha256: l.sha256, alvo, tickets },
        chave: `${l.arquivo}:${l.sha256}`,
      })
    }
    writeFileSync(join(pasta, 'gate-humano.json'), `${JSON.stringify(linhas, null, 2)}\n`)
    return recusa('gate_humano', `paths de gate humano no diff: ${humanos.join(', ')}`, { arquivos: humanos.join(','), migrations: migs.length })
  }

  // Gates em primeiro plano numa worktree limpa no topo da alvo.
  const pasta = join(ctx.runsDir, 'promotor', tsLocal(ctx.agora()).replace(/[:]/g, '').slice(0, 15))
  mkdirSync(pasta, { recursive: true })
  const wt = worktreeDescartavel(ctx, 'promotor', true)
  if (!wt) return recusa('worktree', 'não consegui criar a worktree limpa da alvo para os gates')
  let g: ReturnType<typeof gatesDoPromotor>
  try {
    g = gatesDoPromotor(ctx, wt, pasta)
  } finally {
    removerWorktree(ctx, wt)
  }
  if (!g.ok) return recusa(`gate_${g.falhou}`, `O gate ${g.falhou} falhou no topo da ${alvo}${g.teste ? ` (${g.teste})` : ''}. Evidência: ${pasta}`, { gate: g.falhou ?? '?', ...(g.teste ? { teste: g.teste } : {}) })
  evento(ctx.runsDir, '---', 'PROMOCAO_GATES', { ok: 'sim', alvo: para.slice(0, 8) })

  // Juiz de promoção: contexto limpo, sem conectores.
  const diff = git(ctx.checkout, 'diff', `${principal}...${alvo}`, '--', '.', `:(exclude)${filaRel(ctx)}/**`).out
  const fila = lerFila(ctx.filaDir)
  const tks = tickets.map((id) => {
    const t = fila.find((x) => String(x.json.id) === id)
    return { id, frente: t?.json.frente, objetivo: String(t?.json.objetivo ?? '').slice(0, 1500), pathspec_allowlist: t?.json.pathspec_allowlist }
  })
  const pj = promptJuizPromocao(ctx, diff, tks, principal, alvo)
  writeFileSync(join(pasta, 'juiz.prompt.txt'), pj)
  const cwdJuiz = mkdtempSync(join(tmpdir(), 'orq-juiz-promocao-'))
  const rj = ctx.claude({
    cwd: cwdJuiz,
    timeoutSecs: Number(ctx.cfg.claude_timeout_secs ?? 1800),
    args: ['-p', pj, '--output-format', 'json', '--model', modelos(ctx.cfg).juizPromocao, '--tools', '', '--allowedTools', '', '--max-turns', '1', '--strict-mcp-config', '--setting-sources', 'project', '--disable-slash-commands'],
  })
  rmSync(cwdJuiz, { recursive: true, force: true })
  writeFileSync(join(pasta, 'juiz.saida.json'), rj.saida)
  registrarCusto(ctx, 'juiz_promocao', tickets.join(',') || '-', rj)
  const v = extrairJson(rj.texto)
  if (!v || typeof v.aprovar !== 'boolean') return recusa('juiz_ilegivel', `O juiz de promoção não deu veredito legível (rc=${rj.rc}). Evidência: ${pasta}`)
  writeFileSync(join(pasta, 'veredito.json'), `${JSON.stringify(v, null, 2)}\n`)
  const juiz = { resumo: String(v.resumo ?? ''), motivos: Array.isArray(v.motivos) ? v.motivos.map(String) : [] }
  if (!v.aprovar) {
    marcarRecusaNasFrentes(ctx, fila, tickets, { ts: tsLocal(ctx.agora()), motivos: juiz.motivos.length ? juiz.motivos : [juiz.resumo], tickets, alvo: para.slice(0, 8) })
    return recusa('juiz', `O juiz de promoção recusou: ${juiz.motivos.join('; ') || juiz.resumo}`, { tickets: tickets.join(',') || '-' })
  }

  // Aprovado: ff-only na principal. Nunca push.
  const ff = git(ctx.checkout, 'merge', '--ff-only', '-q', alvo)
  if (ff.rc !== 0) return recusa('ff_impossivel', `git merge --ff-only ${alvo} falhou: ${ff.err.trim().slice(0, 500)}`)
  res.promovido = true
  evento(ctx.runsDir, '---', 'PROMOVIDO', { de: de.slice(0, 8), para: para.slice(0, 8), tickets: tickets.join(',') || '-' })
  marcarRecusaNasFrentes(ctx, fila, tickets, null)

  // Writeback de frente concluída, em commit próprio na alvo, e ff de novo.
  const fechadas = writebackFrentes(ctx)
  res.frentesConcluidas = fechadas.concluidas
  res.liberadas = fechadas.liberadas
  if (fechadas.concluidas.length > 0) {
    const ff2 = git(ctx.checkout, 'merge', '--ff-only', '-q', alvo)
    if (ff2.rc === 0) evento(ctx.runsDir, '---', 'PROMOVIDO', { de: para.slice(0, 8), para: git(ctx.checkout, 'rev-parse', '--short=8', alvo).out.trim(), writeback: fechadas.concluidas.join(',') })
  }
  avisoPushPendente(ctx, juiz)
  res.motivo = 'promovido'
  return res
}

/**
 * Frente fecha quando: todos os tickets dela estão done E na principal, e o
 * planejador declarou a entrega coberta (ou o lote que a fecha está todo done).
 */
export function writebackFrentes(ctx: Ctx): { concluidas: string[]; liberadas: string[] } {
  const principal = String(ctx.cfg.branch_principal ?? ctx.cfg.branch_protegida ?? 'main')
  const trailer = String(ctx.cfg.executor?.trailer_commit ?? 'Orq-Ticket')
  const relJ = String(ctx.cfg.mapa_json ?? 'docs/roadmap/mapa.json')
  const relM = String(ctx.cfg.mapa_md ?? 'docs/roadmap/MAPA.md')
  let mapa = lerJson<Mapa>(join(ctx.alvoWt, relJ))
  if (!mapa) return { concluidas: [], liberadas: [] }
  const fila = lerFila(ctx.filaDir)
  const est = estadoPlanejador(ctx)
  const naPrincipal = new Set<string>()
  for (const m of git(ctx.checkout, 'log', '--format=%B', principal).out.matchAll(new RegExp(`^${trailer}: (\\S+)$`, 'gm'))) naPrincipal.add(m[1]!)
  const concluidas: string[] = []
  const liberadas: string[] = []
  let md = existsSync(join(ctx.alvoWt, relM)) ? readFileSync(join(ctx.alvoWt, relM), 'utf8') : null
  const lib = String(ctx.cfg.planejador?.liberacao_automatica ?? 'nenhuma')
  for (const b of mapa.blocos) {
    for (const f of b.frentes) {
      if (f.status !== 'pronta' && f.status !== 'em_andamento') continue
      const daFrente = fila.filter((t) => t.json.frente === f.id && t.json.status !== 'descartado' && t.json.status !== 'obsoleto')
      if (daFrente.length === 0) continue
      if (!daFrente.every((t) => t.json.status === 'done' && naPrincipal.has(String(t.json.id)))) continue
      const e = est[f.id]
      const declarada = !!e?.coberta_em || (!!e?.fecha_com?.length && e.fecha_com.every((id) => daFrente.some((t) => String(t.json.id) === id)))
      if (!declarada) continue
      const r = fecharFrente(mapa, f.id, lib)
      mapa = r.mapa
      concluidas.push(f.id)
      liberadas.push(...r.liberadas)
      if (md !== null) {
        md = statusNoMapaMd(md, f.id, 'concluida')
        for (const l of r.liberadas) md = statusNoMapaMd(md, l, 'pronta')
      }
      evento(ctx.runsDir, '---', 'FRENTE_CONCLUIDA', { frente: f.id, liberadas: r.liberadas.join(',') || '-' })
      for (const l of r.liberadas) evento(ctx.runsDir, '---', 'FRENTE_LIBERADA', { frente: l, por: f.id })
      if (r.blocoNovo.length > 0 || r.blocoCompleto) {
        enfileirarAviso(ctx.runsDir, {
          tipo: 'bloco_novo',
          nivel: 'acao',
          titulo: r.blocoCompleto ? `Bloco ${r.blocoCompleto} com todas as frentes concluídas` : `Frentes de bloco novo com deps prontas`,
          texto: r.blocoCompleto
            ? `Todas as frentes do ${r.blocoCompleto} estão concluídas: validar o DoD e liberar o próximo bloco é seu.`
            : `As frentes ${r.blocoNovo.join(', ')} (bloco novo) ficaram com as dependências concluídas. Liberar bloco novo é seu.`,
          dados: { frentes: r.blocoNovo, bloco: r.blocoCompleto },
          chave: `${r.blocoCompleto ?? ''}:${r.blocoNovo.join(',')}`,
        })
      }
    }
  }
  if (concluidas.length === 0) return { concluidas, liberadas }
  writeFileSync(join(ctx.alvoWt, relJ), `${JSON.stringify(mapa, null, 2)}\n`)
  const arqs = [relJ]
  if (md !== null) {
    writeFileSync(join(ctx.alvoWt, relM), md)
    arqs.push(relM)
  }
  git(ctx.alvoWt, 'add', '--', ...arqs)
  git(
    ctx.alvoWt,
    '-c', 'user.name=orquestrador', '-c', 'user.email=orquestrador@localhost',
    'commit', '-q',
    '-m', `orq: frente ${concluidas.join(', ')} concluída${liberadas.length ? `; ${liberadas.join(', ')} liberada` : ''} (promotor)`,
    '-m', 'Orq-Mapa: writeback',
    '--', ...arqs,
  )
  return { concluidas, liberadas }
}

// ─── P3 + P4 · fim do ciclo: relatório, dedupe e entrega ────────────────────

export interface EstadoAvisos {
  [chave: string]: { hash: string; ts: string }
}

export function idAviso(a: Aviso): string {
  return `${a.tipo}:${a.chave ?? a.titulo}`
}
export function hashAviso(a: Aviso): string {
  return createHash('sha256').update(`${a.titulo}\n${a.texto}`).digest('hex').slice(0, 16)
}

/** Dedupe: o mesmo aviso (tipo + chave), sem mudança, não repete em `horas`. */
export function filtrarRepetidos(avisos: Aviso[], estado: EstadoAvisos, agora: Date, horas: number): Aviso[] {
  const vistos = new Set<string>()
  return avisos.filter((a) => {
    const id = idAviso(a)
    if (vistos.has(id)) return false
    vistos.add(id)
    const e = estado[id]
    if (!e) return true
    if (e.hash !== hashAviso(a)) return true
    return agora.getTime() - Date.parse(e.ts) >= horas * 3600_000
  })
}

export function linhasDoCiclo(runsDir: string, desde: number): string[] {
  try {
    return readFileSync(join(runsDir, 'events.log'), 'utf8').split('\n').filter(Boolean).slice(desde)
  } catch {
    return []
  }
}

export function relatorioMd(ctx: Ctx, linhas: string[], avisos: Aviso[]): string {
  const conta = (ev: string) => linhas.filter((l) => l.split(' ')[2] === ev).length
  const ids = (ev: string) => linhas.filter((l) => l.split(' ')[2] === ev).map((l) => l.split(' ')[1]).filter((x) => x && x !== '---')
  const custo = gastoDoDia(ctx)
  const teto = Number(ctx.cfg.orcamento?.usd_dia ?? 0)
  return [
    `# Execução ${tsLocal(ctx.agora()).slice(0, 16).replace('T', ' ')}`,
    '',
    '## Placar',
    `- aprovados: ${conta('APROVADO')} (${ids('APROVADO').join(', ') || '—'})`,
    `- reprovados: ${conta('REPROVADO')} · bloqueados: ${conta('BLOQUEADO')} (${ids('BLOQUEADO').join(', ') || '—'}) · adiados: ${conta('ADIADO')}`,
    `- planejador: ${conta('CANDIDATO')} escrito(s), ${conta('PENDENTE')} pendente(s), ${conta('DESCARTADO')} descartado(s)`,
    `- promoção: ${conta('PROMOVIDO') ? 'promovido' : conta('PROMOCAO_RECUSADA') ? 'recusada' : '—'}; frentes concluídas: ${linhas.filter((l) => l.includes(' FRENTE_CONCLUIDA ')).map((l) => /frente=(\S+)/.exec(l)?.[1]).join(', ') || '—'}`,
    `- custo do dia: US$ ${custo.toFixed(2)}${teto ? ` / ${teto}` : ''}`,
    '',
    '## Avisos',
    avisos.length ? avisos.map((a) => `- [${a.nivel}] ${a.tipo}: ${a.titulo}\n  ${a.texto.replace(/\n/g, '\n  ')}`).join('\n') : '- nenhum',
    '',
    '## Trilha',
    '```',
    ...linhas.slice(-120),
    '```',
    '',
  ].join('\n')
}

/** Novidade = algo processado, promovido, escrito pelo planejador, ou aviso a entregar. */
export function houveNovidade(linhas: string[], avisos: Aviso[]): boolean {
  if (avisos.length > 0) return true
  const evs = new Set(['APROVADO', 'REPROVADO', 'BLOQUEADO', 'ADIADO', 'REFATIAR', 'PROMOVIDO', 'PROMOCAO_RECUSADA', 'CANDIDATO', 'DESCARTADO', 'FRENTE_CONCLUIDA', 'EXECUTOR_MORREU'])
  return linhas.some((l) => evs.has(l.split(' ')[2] ?? ''))
}

export function notificarNativo(titulo: string, texto: string): void {
  if (process.env.ORQ_TESTE === '1') return
  const t = titulo.replace(/["\\]/g, '')
  const c = texto.replace(/["\\]/g, '').slice(0, 240)
  spawnSync('osascript', ['-e', `display notification "${c}" with title "${t}"`], { timeout: 10_000 })
}

export function cicloFim(ctx: Ctx, desde: number): { novidade: boolean; enviados: string[]; relatorio?: string; hookRc?: number | null } {
  const linhas = linhasDoCiclo(ctx.runsDir, desde)
  const fila = join(ctx.runsDir, 'avisos', 'ciclo.jsonl')
  const brutos: Aviso[] = existsSync(fila)
    ? readFileSync(fila, 'utf8').split('\n').filter(Boolean).flatMap((l) => {
        try {
          return [JSON.parse(l) as Aviso]
        } catch {
          return []
        }
      })
    : []
  rmSync(fila, { force: true })
  // Avisos que a trilha já carrega (orçamento, ambiente), sem o loop precisar enfileirar.
  for (const l of linhas) {
    const ev = l.split(' ')[2]
    if (ev === 'ORCAMENTO') brutos.push({ tipo: 'orcamento', nivel: 'acao', titulo: 'Teto de orçamento do dia atingido', texto: l.split(' ').slice(2).join(' '), chave: diaLocal(ctx.agora()) })
    // Sem o timestamp: o mesmo NO-GO a cada 30 min é o MESMO aviso (dedupe de 24 h).
    const semTs = l.split(' ').slice(2).join(' ')
    if (ev === 'AMBIENTE' || ev === 'PREVOO_NOGO' || ev === 'LOCK_ERRO') brutos.push({ tipo: 'ambiente', nivel: 'acao', titulo: `Ambiente: ${ev}`, texto: semTs, chave: semTs })
  }
  const estadoArq = join(ctx.runsDir, 'avisos', 'estado.json')
  const estado = lerJson<EstadoAvisos>(estadoArq) ?? {}
  const horas = Number(ctx.cfg.avisos?.dedupe_horas ?? 24)
  const avisos = filtrarRepetidos(brutos, estado, ctx.agora(), horas)
  const novidade = houveNovidade(linhas, avisos)
  if (!novidade) return { novidade: false, enviados: [] }

  const md = relatorioMd(ctx, linhas, avisos)
  const relDir = join(ctx.runsDir, 'relatorios')
  mkdirSync(relDir, { recursive: true })
  const nome = `${tsLocal(ctx.agora()).slice(0, 16).replace('T', '-').replace(':', '')}.md`
  const relArq = join(relDir, nome)
  writeFileSync(relArq, md)

  for (const a of avisos) if (a.nivel === 'acao') notificarNativo(`Orquestrador: ${a.titulo}`, a.texto)
  const acao = avisos.filter((a) => a.nivel === 'acao')
  const principal = acao[0] ?? avisos[0]
  const payload = {
    tipo: principal?.tipo ?? 'ciclo',
    nivel: acao.length > 0 ? 'acao' : 'info',
    titulo: principal ? (avisos.length > 1 ? `${principal.titulo} (+${avisos.length - 1})` : principal.titulo) : 'Execução do orquestrador',
    texto: avisos.length ? avisos.map((a) => `[${a.nivel}] ${a.titulo}: ${a.texto}`).join('\n\n') : 'Execução com novidade; sem ação pendente. Detalhe no relatório.',
    dados: { avisos, relatorio_md: md, relatorio_arquivo: relArq, repo: basename(ctx.checkout) },
    ts: tsLocal(ctx.agora()),
  }
  let hookRc: number | null | undefined
  const hook = ctx.cfg.avisos?.hook_cmd
  if (typeof hook === 'string' && hook.trim()) {
    const r = spawnSync('bash', ['-c', hook], {
      cwd: ctx.checkout,
      input: JSON.stringify(payload),
      encoding: 'utf8',
      timeout: Number(ctx.cfg.avisos?.timeout_secs ?? 600) * 1000,
    })
    hookRc = r.status
    // Falha do hook nunca derruba o loop: vira evento e segue.
    evento(ctx.runsDir, '---', 'AVISO_HOOK', { rc: r.status ?? 'timeout', tipo: payload.tipo, nivel: payload.nivel, avisos: avisos.length })
  }
  for (const a of avisos) {
    estado[idAviso(a)] = { hash: hashAviso(a), ts: tsLocal(ctx.agora()) }
    evento(ctx.runsDir, '---', 'AVISO', { tipo: a.tipo, nivel: a.nivel })
  }
  mkdirSync(dirname(estadoArq), { recursive: true })
  writeFileSync(estadoArq, `${JSON.stringify(estado, null, 2)}\n`)
  return { novidade: true, enviados: avisos.map((a) => a.tipo), relatorio: relArq, hookRc: hookRc ?? null }
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

export function ctxDoCli(args: Record<string, string>, claude: RodarClaude = rodarClaudeReal): Ctx {
  const checkout = resolve(args.checkout ?? process.cwd())
  const cfgPath = resolve(args.config ?? join(checkout, 'docs', 'fila', '000-config.json'))
  const cfg = JSON.parse(readFileSync(cfgPath, 'utf8')) as Cfg
  return {
    checkout,
    cfg,
    cfgPath,
    filaDir: dirname(cfgPath),
    runsDir: join(checkout, String(cfg.runs_dir ?? 'docs/fila/runs')),
    alvoWt: resolve(args['alvo-wt'] ?? checkout),
    claude,
    agora: () => new Date(),
  }
}

export function main(argv: string[]): number {
  const [cmd, ...resto] = argv
  const args: Record<string, string> = {}
  for (let i = 0; i < resto.length; i++) {
    const a = resto[i]!
    if (a.startsWith('--')) args[a.slice(2)] = resto[++i] ?? ''
  }
  const ctx = ctxDoCli(args)
  switch (cmd) {
    case 'planejar': {
      const r = planejar(ctx)
      process.stdout.write(`${JSON.stringify(r)}\n`)
      return 0
    }
    case 'promover': {
      const r = promover(ctx)
      process.stdout.write(`${JSON.stringify(r)}\n`)
      return 0
    }
    case 'aviso': {
      enfileirarAviso(ctx.runsDir, {
        tipo: args.tipo ?? 'ambiente',
        nivel: args.nivel === 'info' ? 'info' : 'acao',
        titulo: args.titulo ?? '',
        texto: args.texto ?? '',
        ...(args.chave ? { chave: args.chave } : {}),
      })
      return 0
    }
    case 'push-pendente': {
      avisoPushPendente(ctx)
      return 0
    }
    case 'ciclo-fim': {
      const r = cicloFim(ctx, Number(args.desde ?? 0))
      process.stdout.write(`${JSON.stringify(r)}\n`)
      return 0
    }
    default:
      process.stderr.write('uso: autonomo.ts planejar|promover|aviso|push-pendente|ciclo-fim --checkout <dir> --config <cfg> [--alvo-wt <wt>]\n')
      return 2
  }
}

function chamadoComoCli(): boolean {
  const argv1 = process.argv[1]
  if (!argv1) return false
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(argv1))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  try {
    process.exit(main(process.argv.slice(2)))
  } catch (e) {
    process.stderr.write(`autonomo.ts: ${(e as Error)?.stack ?? e}\n`)
    process.exit(3)
  }
}
