/**
 * P7 da etapa 8e do kit: corrida do corpus do juiz. Mora fora do kit.
 *
 *   tsx p7.ts montar   -> casos.json + prompts/<caso>.<variante>.txt (sem API)
 *   tsx p7.ts rodar    -> chama o juiz (claude -p), grava out/resultados.jsonl
 *   tsx p7.ts resumo   -> tabela de acerto por variante, por rótulo, por padrão e custo
 *
 * Variantes (modelo fixado em claude-sonnet-5-5 nas três):
 *   V0 = kit 220068f: prompt do motor de 220068f; cwd com o CLAUDE.md e o .claude/ do
 *        sha julgado (git archive, como a worktree de antes); flags de antes.
 *   V1 = HEAD da etapa sem REVIEW.md: commits + anexo de citações; cwd vazio; flags da P2.
 *   V2 = HEAD da etapa com REVIEW.md (REVIEW-<repo>-v1.md do levantamento 24/10).
 * Repos de produto: só leitura (GIT_OPTIONAL_LOCKS=0; show, log, diff, ls-tree,
 * merge-base, rev-parse, archive).
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { appendFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

process.env.GIT_OPTIONAL_LOCKS = '0'
const AQUI = import.meta.dirname
const HOME = process.env.HOME!
const COMARKA = join(HOME, 'Projetos/comarka-operacional')
const DASH = join(HOME, 'Projetos/dashboard-comercial-orq')
const LEV = join(HOME, 'orq-sessoes/medicao-comarka/levantamento-2410')
const MODELO = 'claude-sonnet-5-5'
const TETO_USD = 15
const SEED = 20261024
const VARIANTES = ['V0', 'V1', 'V2'] as const
type Variante = (typeof VARIANTES)[number]

const velho = await import(join(AQUI, 'kit-220068f/scripts/orquestrador/juiz.ts'))
const novo = await import(join(AQUI, 'kit-head/scripts/orquestrador/juiz.ts'))

const git = (repo: string, ...a: string[]) =>
  execFileSync('git', ['-C', repo, ...a], { encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 })

interface Caso {
  nome: string
  repo: 'comarka' | 'dashboard'
  id: string
  sha: string
  base: string
  esperado: 'reprovar' | 'aprovar'
  padrao: string
  defeito: string
  ticketArq: string
  gates: string
  diff?: string
}

// ─── corpus ────────────────────────────────────────────────────────────────

function mergesDoLoop(): Map<string, string> {
  const m = new Map<string, string>()
  for (const l of git(COMARKA, 'log', '--branches', '--merges', '--since=2026-09-15', '--format=%H %P%x1f%s').split('\n')) {
    if (!l) continue
    const [hp, s] = l.split('\x1f')
    const p = hp!.split(' ')
    if (s!.startsWith('orquestrador: merge frente/') && p.length >= 3) m.set(p[2]!, p[1]!)
  }
  return m
}

/** `<rev>:<path>` do ticket: no sha julgado; se ele não estiver lá (1303), a versão em que entrou na fila. */
function ticketNoSha(sha: string, id: string): string {
  const arq = git(COMARKA, 'ls-tree', '--name-only', sha, 'docs/fila/').split('\n').find((f) => f.startsWith(`docs/fila/${id}-`))
  if (arq) return `${sha}:${arq}`
  const l = git(COMARKA, 'log', '--all', '--diff-filter=A', '--format=%H', '--name-only', '--', `docs/fila/${id}-*`).trim().split('\n').filter(Boolean)
  if (l.length < 2) throw new Error(`ticket ${id} não achado`)
  return `${l[l.length - 2]}:${l[l.length - 1]}`
}

/** gates.txt no formato do kit, a partir dos gate-*.txt da tentativa aprovada (avaliador antigo). */
function gatesComarka(id: string, sha: string): string {
  const runs = join(COMARKA, 'docs/fila/runs', id)
  const tents = existsSync(runs) ? readdirSync(runs).filter((d) => /^attempt-\d+$/.test(d)) : []
  const dir = tents.map((d) => join(runs, d)).find((d) => existsSync(join(d, 'head.txt')) && readFileSync(join(d, 'head.txt'), 'utf8').trim() === sha)
  if (!dir) return '(gates da tentativa aprovada não encontrados)\nVEREDITO: APROVADO'
  const linhas: string[] = []
  for (const g of readdirSync(dir).filter((f) => /^gate-.*\.txt$/.test(f)).sort()) {
    const cauda = readFileSync(join(dir, g), 'utf8').replace(/\x1B\[[0-9;]*m/g, '').trim().split('\n').slice(-3)
    linhas.push(`ok   ${g.replace(/^gate-|\.txt$/g, '')}`, ...cauda.map((c) => `       ${c.trim()}`))
  }
  return [...linhas, 'VEREDITO: APROVADO'].join('\n')
}

function sortear<T>(xs: T[], n: number, seed: number): T[] {
  let s = seed >>> 0
  const rnd = () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 2 ** 32)
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1))
    ;[a[i], a[j]] = [a[j]!, a[i]!]
  }
  return a.slice(0, n)
}

function montarCorpus(): { casos: Caso[]; sorteio: string[]; elegiveis: number } {
  const merges = mergesDoLoop()
  const baseDe = (sha: string) => {
    const p1 = merges.get(sha)
    if (!p1) throw new Error(`merge do loop não achado para ${sha}`)
    return git(COMARKA, 'merge-base', p1, sha).trim()
  }
  const casos: Caso[] = []
  for (const l of readFileSync(join(LEV, 'corpus-juiz-v0.tsv'), 'utf8').split('\n')) {
    if (!l || l.startsWith('#') || l.startsWith('id\t')) continue
    const [id, sha, , base, , padrao, defeito] = l.split('\t')
    casos.push({ nome: `C${id}`, repo: 'comarka', id: id!, sha: sha!, base: base!, esperado: 'reprovar', padrao: padrao!, defeito: defeito!, ticketArq: ticketNoSha(sha!, id!), gates: gatesComarka(id!, sha!) })
  }
  const s938 = '6c228d877502f1c84b9c406f0d5de731cef22793'
  casos.push({ nome: 'C938', repo: 'comarka', id: '938', sha: s938, base: '4e0561282c8bb78dda67b3c0c4acfff3fe865667', esperado: 'reprovar', padrao: 'outro', defeito: 'ticket_tese = gerado / contratos somava os contratos de clientes sem gerado informado; o teste não tinha cliente sem valor', ticketArq: ticketNoSha(s938, '938'), gates: gatesComarka('938', s938) })

  // Deveria aprovar: dashboard 003/0 e 5 do Comarka (coorte 26/09-09/10, aprovados de
  // primeira, sem retrabalho nenhum, nem forte nem fraco, na saída do c5.py).
  const d = join(DASH, 'docs/fila/runs/003/attempt-0')
  casos.push({ nome: 'D003-0', repo: 'dashboard', id: '003', sha: '1bfcbc1d72ed0b57e8d312a33246acf6539810fa', base: '3c5f3768', esperado: 'aprovar', padrao: 'aprovar', defeito: '', ticketArq: 'docs/fila/003-liga-conquistas-guarda-count.md', gates: readFileSync(join(d, 'gates.txt'), 'utf8'), diff: readFileSync(join(d, 'diff.patch'), 'utf8') })
  const csv = readFileSync(join(HOME, 'orq-sessoes/medicao-comarka/out/14d/retrabalho.csv'), 'utf8').trim().split('\n')
  const cab = csv[0]!.split(',')
  const por = new Map<string, Record<string, string>[]>()
  for (const l of csv.slice(1)) {
    const r = Object.fromEntries(l.split(',').map((v, i) => [cab[i]!, v]))
    if (r.coorte !== 'madura') continue
    por.set(r.id!, [...(por.get(r.id!) ?? []), r])
  }
  const eleg = [...por.entries()]
    .filter(([, rs]) => rs.every((r) => r.tipo === 'nenhum' && r.forca === '-' && r.aprovado_de_primeira === 'sim'))
    .map(([id, rs]) => ({ id, sha9: rs[0]!.sha_aprovado! }))
    .sort((a, b) => a.id.localeCompare(b.id))
  const sorteio = sortear(eleg, 5, SEED)
  for (const { id, sha9 } of sorteio) {
    const sha = git(COMARKA, 'rev-parse', sha9).trim()
    casos.push({ nome: `A${id}`, repo: 'comarka', id, sha, base: baseDe(sha), esperado: 'aprovar', padrao: 'aprovar', defeito: '', ticketArq: ticketNoSha(sha, id), gates: gatesComarka(id, sha) })
  }
  return { casos, sorteio: sorteio.map((x) => `${x.id}@${x.sha9}`), elegiveis: eleg.length }
}

// ─── material e prompts ────────────────────────────────────────────────────

function blocoJson(md: string): Record<string, unknown> {
  const m = /```json\s*\n([\s\S]*?)\n```/.exec(md)
  if (!m) throw new Error('ticket sem bloco json')
  return JSON.parse(m[1]!)
}

function prompts(c: Caso): Record<Variante, string> {
  const repo = c.repo === 'comarka' ? COMARKA : DASH
  const ticketMd = c.repo === 'dashboard'
    ? readFileSync(join(AQUI, '../../Projetos/_worktrees/kit-8e/test/fixtures/gate-ticket-8e', c.ticketArq.split('/').pop()!), 'utf8')
    : git(repo, 'show', c.ticketArq)
  const t = blocoJson(ticketMd) as { objetivo?: string; criterios_aceite?: Record<string, unknown>[]; pathspec_allowlist?: string[]; contexto_juiz?: string[] }
  const diff = c.diff ?? git(repo, 'diff', `${c.base}...${c.sha}`)
  const ler = novo.lerDaBase(repo, c.base)
  const contexto = (t.contexto_juiz ?? []).map((p) => {
    const linhas = (ler(p) ?? '').split('\n')
    return { path: p, conteudo: linhas.length > 400 ? `${linhas.slice(0, 400).join('\n')}\n[... TRUNCADO ...]` : linhas.join('\n') }
  })
  const base = {
    id: c.id,
    objetivo: t.objetivo ?? '',
    criterios: (t.criterios_aceite ?? []).map((k) => ({ tipo: k.tipo, descricao: String(k.descricao ?? ''), cmd: k.cmd, espera: String(k.espera ?? '') })),
    allowlist: t.pathspec_allowlist ?? [],
    diff,
    gates: c.gates,
    nota: '',
    contexto,
    ampliados: [],
  }
  const p0 = velho.montarPromptJuiz({ ...base, definicoes: velho.definicoesChamadasPelosTestes(diff, velho.lerDaBase(repo, c.base)) })
  const listar = () => git(repo, 'ls-tree', '-r', '--name-only', c.base).split('\n').filter(Boolean)
  const novoBase = {
    ...base,
    definicoes: novo.definicoesChamadasPelosTestes(diff, ler),
    commits: git(repo, 'log', '--format=commit %H%n%n%B', `${c.base}..${c.sha}`),
    anexo: novo.anexoCitacoes(diff, ler, listar, novo.commitDaBase(repo, c.base)),
  }
  const review = readFileSync(join(LEV, c.repo === 'comarka' ? 'REVIEW-comarka-v1.md' : 'REVIEW-dashboard-v1.md'), 'utf8')
  return { V0: p0, V1: novo.montarPromptJuiz(novoBase), V2: novo.montarPromptJuiz({ ...novoBase, review }) }
}

// ─── chamada ───────────────────────────────────────────────────────────────

function chamar(c: Caso, v: Variante, prompt: string): { raw: string; ms: number; rc: number | null } {
  const cwd = mkdtempSync(join(tmpdir(), `p7-${v}-`))
  const repo = c.repo === 'comarka' ? COMARKA : DASH
  let args: string[]
  if (v === 'V0') {
    // A worktree de antes: CLAUDE.md e .claude/ do sha julgado.
    const tem = git(repo, 'ls-tree', '--name-only', c.sha).split('\n').filter((f) => f === 'CLAUDE.md' || f === '.claude')
    if (tem.length > 0) {
      const tar = execFileSync('git', ['-C', repo, 'archive', c.sha, ...tem], { maxBuffer: 256 * 1024 * 1024 })
      spawnSync('tar', ['-x', '-C', cwd], { input: tar })
    }
    args = ['-p', prompt, '--output-format', 'json', '--model', MODELO, '--allowedTools', '', '--max-turns', '1']
  } else {
    args = ['-p', prompt, '--output-format', 'json', '--model', MODELO, '--tools', '', '--allowedTools', '', '--max-turns', '1', '--strict-mcp-config', '--disable-slash-commands']
  }
  const t0 = Date.now()
  const r = spawnSync('claude', args, { cwd, encoding: 'utf8', timeout: 300_000, maxBuffer: 64 * 1024 * 1024 })
  rmSync(cwd, { recursive: true, force: true })
  return { raw: `${r.stdout ?? ''}${r.stderr ?? ''}`, ms: Date.now() - t0, rc: r.status }
}

function envelope(raw: string): Record<string, unknown> | null {
  for (const l of raw.split('\n').reverse()) {
    try {
      const o = JSON.parse(l.trim())
      if (o && typeof o === 'object' && 'total_cost_usd' in o) return o
    } catch { /* segue */ }
  }
  return null
}

// ─── main ──────────────────────────────────────────────────────────────────

const cmd = process.argv[2]
const OUT = join(AQUI, 'out')
mkdirSync(join(AQUI, 'prompts'), { recursive: true })
mkdirSync(OUT, { recursive: true })

if (cmd === 'montar') {
  const { casos, sorteio, elegiveis } = montarCorpus()
  // Ordem intercalada: um "aprovar" a cada ~3 "reprovar", para que um corte pelo teto
  // não tire um rótulo inteiro.
  const rep = casos.filter((c) => c.esperado === 'reprovar')
  const apr = casos.filter((c) => c.esperado === 'aprovar')
  const ordem: Caso[] = []
  while (rep.length || apr.length) {
    if (apr.length) ordem.push(apr.shift()!)
    ordem.push(...rep.splice(0, 3))
  }
  for (const c of ordem) {
    const p = prompts(c)
    for (const v of VARIANTES) writeFileSync(join(AQUI, 'prompts', `${c.nome}.${v}.txt`), p[v])
    console.log(c.nome.padEnd(8), c.esperado.padEnd(9), VARIANTES.map((v) => `${v} ${Buffer.byteLength(p[v])}B`).join('  '))
  }
  writeFileSync(join(AQUI, 'casos.json'), JSON.stringify({ seed: SEED, elegiveis, sorteio, casos: ordem.map(({ diff, gates, ...r }) => r) }, null, 2))
  console.log(`casos: ${ordem.length}; sorteio (seed ${SEED}, ${elegiveis} elegíveis): ${sorteio.join(' ')}`)
} else if (cmd === 'rodar') {
  const { casos } = JSON.parse(readFileSync(join(AQUI, 'casos.json'), 'utf8')) as { casos: Caso[] }
  const res = join(OUT, 'resultados.jsonl')
  const feitos = new Set(existsSync(res) ? readFileSync(res, 'utf8').trim().split('\n').filter(Boolean).map((l) => { const o = JSON.parse(l); return `${o.caso}.${o.variante}` }) : [])
  let gasto = existsSync(res) ? readFileSync(res, 'utf8').trim().split('\n').filter(Boolean).reduce((s, l) => s + (JSON.parse(l).custo ?? 0), 0) : 0
  let maior = 0.3
  for (const c of casos) {
    for (const v of VARIANTES) {
      if (feitos.has(`${c.nome}.${v}`)) continue
      // Para ANTES da chamada que passaria do teto: reserva = o maior custo visto (mín. 0,30).
      if (gasto + maior > TETO_USD) {
        const msg = `PARADO pelo teto antes de ${c.nome}.${v}: gasto US$ ${gasto.toFixed(4)} + reserva ${maior.toFixed(4)} > ${TETO_USD}`
        appendFileSync(join(OUT, 'parada.txt'), msg + '\n')
        console.log(msg)
        process.exit(0)
      }
      const prompt = readFileSync(join(AQUI, 'prompts', `${c.nome}.${v}.txt`), 'utf8')
      const r = chamar(c, v, prompt)
      writeFileSync(join(OUT, `${c.nome}.${v}.raw.json`), r.raw)
      const env = envelope(r.raw)
      const custo = Number(env?.total_cost_usd ?? 0)
      const vd = novo.extrairVeredito(r.raw)
      gasto += custo
      maior = Math.max(maior, custo)
      const linha = { caso: c.nome, variante: v, esperado: c.esperado, padrao: c.padrao, aprovado: vd?.aprovado ?? null, motivo: vd?.motivo ?? null, custo, ms: r.ms, rc: r.rc, usage: env?.usage ?? null, modelos: env?.modelUsage ? Object.keys(env.modelUsage as object) : null }
      appendFileSync(res, JSON.stringify(linha) + '\n')
      console.log(`${c.nome}.${v} esperado=${c.esperado} aprovado=${linha.aprovado} US$ ${custo.toFixed(4)} (acum ${gasto.toFixed(4)})`)
    }
  }
  console.log(`FIM: gasto US$ ${gasto.toFixed(4)}`)
} else if (cmd === 'resumo') {
  const ls = readFileSync(join(OUT, 'resultados.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const acerto = (o: { aprovado: boolean | null; esperado: string }) => o.aprovado !== null && o.aprovado === (o.esperado === 'aprovar')
  const pct = (a: number, n: number) => (n ? `${a}/${n} (${Math.round((100 * a) / n)}%)` : '—')
  console.log('variante | total | deveria reprovar | deveria aprovar | ilegível | custo médio/chamada | custo total')
  for (const v of VARIANTES) {
    const x = ls.filter((o) => o.variante === v)
    const r = x.filter((o) => o.esperado === 'reprovar')
    const a = x.filter((o) => o.esperado === 'aprovar')
    const custo = x.reduce((s, o) => s + o.custo, 0)
    console.log(`${v} | ${pct(x.filter(acerto).length, x.length)} | ${pct(r.filter(acerto).length, r.length)} | ${pct(a.filter(acerto).length, a.length)} | ${x.filter((o) => o.aprovado === null).length} | ${(x.length ? custo / x.length : 0).toFixed(4)} | ${custo.toFixed(4)}`)
  }
  console.log('\npadrão | V0 | V1 | V2')
  for (const p of [...new Set(ls.map((o) => o.padrao))].sort()) {
    console.log(`${p} | ${VARIANTES.map((v) => { const x = ls.filter((o) => o.variante === v && o.padrao === p); return pct(x.filter(acerto).length, x.length) }).join(' | ')}`)
  }
  console.log('\ncaso | esperado | V0 | V1 | V2')
  for (const c of [...new Set(ls.map((o) => o.caso))]) {
    const x = (v: string) => ls.find((o) => o.caso === c && o.variante === v)
    const m = (o: { aprovado: boolean | null } | undefined) => (o ? (o.aprovado === null ? 'ilegível' : o.aprovado ? 'aprova' : 'reprova') : '—')
    console.log(`${c} | ${x('V0')?.esperado ?? x('V1')?.esperado} | ${m(x('V0'))} | ${m(x('V1'))} | ${m(x('V2'))}`)
  }
  const tok = (v: string) => { const x = ls.filter((o) => o.variante === v && o.usage); return x.length ? Math.round(x.reduce((s, o) => s + (o.usage.cache_creation_input_tokens ?? 0) + (o.usage.cache_read_input_tokens ?? 0) + (o.usage.input_tokens ?? 0), 0) / x.length) : 0 }
  console.log(`\ntokens de entrada médios por chamada: ${VARIANTES.map((v) => `${v} ${tok(v)}`).join(', ')}`)
  console.log(`modelos vistos: ${[...new Set(ls.flatMap((o) => o.modelos ?? []))].join(', ')}`)
} else {
  console.error('uso: p7.ts montar|rodar|resumo')
  process.exit(2)
}
