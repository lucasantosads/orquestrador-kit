/**
 * prevoo.ts — o pré-voo ⚡ da drenagem (peça K11a-2).
 *
 * PORTE do `pre-voo.mjs` do actus-saas (lido no PASSO 0 da etapa 6, só
 * leitura): checagens BARATAS, reexecutadas no início de toda drenagem, ANTES
 * do lock e do cooldown. Falha aqui aborta o disparo inteiro — nunca toca lock
 * de outro run, nunca consome retry de ticket nenhum.
 *
 * UMA DIFERENÇA DELIBERADA em relação ao original: a cat.3 do Actus é uma
 * chamada NOVA ao `claude -p` ("responda apenas OK"). Aqui ela NÃO existe como
 * chamada: quem sonda o modelo é o `probe_modelos` do `executor.sh` (ORQ-07),
 * que já roda antes de qualquer gasto e já sabe distinguir config errada
 * (aborta) de ambiente caído (adia com cooldown). O pré-voo do kit LÊ o
 * resultado da última sondagem em `runs/` e diz há quanto tempo foi — item
 * informativo, sem veredito. Duplicar a sondagem seria pagar duas chamadas por
 * drenagem para responder a mesma pergunta, e o pré-voo é justamente o passo
 * que existe para não gastar.
 *
 * PURO: todo acesso a disco/git entra por `deps`. `preVooRelampago` NUNCA lança
 * e NUNCA devolve Promise — exceção de dep vira `{ ok:false, item, motivo }`,
 * que é aborto LIMPO da drenagem em vez de crash no meio do disparo (que
 * deixava lock e ticket pendurados).
 */
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Os arquivos da spec vendorizada que precisam existir COM CONTEÚDO em
 * `docs/orquestrador/skill/`. Pasta existir ≠ spec presente: o `--atualizar`
 * copia diretório, e diretório vazio passa em `test -d`.
 */
export const ARQUIVOS_SPEC = [
  'SKILL.md',
  'EXECUTOR.md',
  'references/setup.md',
  'references/pre-voo.md',
  'templates/TICKET.md',
  'templates/config.json',
] as const

/** Piso de arquivos COMMITADOS sob a spec. Menos que isso é spec no disco e fora do git. */
export const MINIMO_COMMITADOS = 5

export interface Item {
  ok: boolean
  /** Informativo: entra na saída, não decide o veredito. */
  info?: boolean
  /**
   * Token CURTO e estável da checagem (`cat.0`, `cat.1`, `cat.6`, `cat.3`). É o
   * que vai no `item=` do evento `PREVOO_NOGO` da trilha: campo de evento é
   * token grepável, nunca frase (CONTRATO §4.1).
   */
  token: string
  item: string
  motivo?: string
}

export interface PreVooConfig {
  repo_origin_deve_conter?: string
  ambiente_id?: string
}

export interface PreVooDeps {
  arquivoComConteudo: (rel: string) => boolean
  contarArquivosCommitados: () => number
  lerOrigin: () => string
  lerEnv: () => string
  filaTemArquivo: (rel: string) => boolean
  filaTemDir: (rel: string) => boolean
  lerLiberacoes: () => string
  /** Dia (AAAA-MM-DD) da última sondagem registrada, e se ela falhou. */
  ultimaSondagem: () => { dia: string; falhou: boolean } | null
  /** Hoje, injetado: teste de pré-voo não lê relógio. */
  hoje: () => string
}

/**
 * Dep de checagem TEM que devolver boolean. Uma Promise (dep async injetada por
 * engano) é truthy: `!promise` é false e a checagem passa sozinha — default-allow
 * silencioso, que é justamente o que o pré-voo existe para impedir.
 */
function exigirBooleano(v: unknown, oque: string): boolean {
  if (typeof v === 'boolean') return v
  if (v && typeof (v as { then?: unknown }).then === 'function') {
    throw new Error(`${oque} devolveu Promise — as deps do pré-voo são SÍNCRONAS por contrato`)
  }
  throw new Error(`${oque} devolveu ${typeof v} (esperado boolean)`)
}

/** cat.0 · spec vendorizada presente COM conteúdo e COMMITADA. */
export function checarSpecVendorizada(deps: Pick<PreVooDeps, 'arquivoComConteudo' | 'contarArquivosCommitados'>): Item {
  for (const rel of ARQUIVOS_SPEC) {
    if (!exigirBooleano(deps.arquivoComConteudo(rel), `arquivoComConteudo(${rel})`)) {
      return {
        ok: false,
        token: 'cat.0',
        item: `pré-voo cat.0 (spec vendorizada): docs/orquestrador/skill/${rel}`,
        motivo: 'ausente ou vazio (test -s falhou)',
      }
    }
  }
  const n = deps.contarArquivosCommitados()
  if (n < MINIMO_COMMITADOS) {
    return {
      ok: false,
      token: 'cat.0',
      item: 'pré-voo cat.0 (spec vendorizada): docs/orquestrador/skill/',
      motivo: `git ls-files retornou ${n} arquivo(s) (< ${MINIMO_COMMITADOS}) — spec está no disco mas não commitada`,
    }
  }
  return { ok: true, token: 'cat.0', item: 'spec vendorizada' }
}

/** cat.1 · identidade — origin do checkout e ambiente_id do .env. */
export function checarIdentidade(
  entrada: { config: PreVooConfig } & Pick<PreVooDeps, 'lerOrigin' | 'lerEnv'>,
): Item {
  const { config } = entrada
  // Chave ausente = check daquele lado DESLIGADO. É o mesmo desenho do
  // executor.sh:104-114, que só compara quando o config declara o valor.
  if (config.repo_origin_deve_conter) {
    const origin = entrada.lerOrigin()
    if (!origin || !origin.includes(config.repo_origin_deve_conter)) {
      return {
        ok: false,
        token: 'cat.1',
        item: 'pré-voo cat.1 (identidade): origin',
        motivo: `origin '${origin || ''}' não contém '${config.repo_origin_deve_conter}' — checkout errado`,
      }
    }
  }
  if (config.ambiente_id) {
    const env = entrada.lerEnv()
    if (!env || !env.includes(config.ambiente_id)) {
      return {
        ok: false,
        token: 'cat.1',
        item: 'pré-voo cat.1 (identidade): ambiente_id',
        motivo: `.env não contém ambiente_id '${config.ambiente_id}' — ambiente errado`,
      }
    }
  }
  return { ok: true, token: 'cat.1', item: 'identidade' }
}

/** cat.6 · estrutura da fila — _TEMPLATE.md, liberacoes.json, rascunhos/, runs/. */
export function checarEstruturaFila(
  deps: Pick<PreVooDeps, 'filaTemArquivo' | 'filaTemDir' | 'lerLiberacoes'>,
): Item {
  for (const rel of ['_TEMPLATE.md', 'liberacoes.json']) {
    if (!exigirBooleano(deps.filaTemArquivo(rel), `filaTemArquivo(${rel})`)) {
      return { ok: false, token: 'cat.6', item: `pré-voo cat.6 (estrutura da fila): docs/fila/${rel}`, motivo: 'ausente' }
    }
  }
  for (const rel of ['rascunhos', 'runs']) {
    if (!exigirBooleano(deps.filaTemDir(rel), `filaTemDir(${rel})`)) {
      return { ok: false, token: 'cat.6', item: `pré-voo cat.6 (estrutura da fila): docs/fila/${rel}/`, motivo: 'ausente' }
    }
  }
  try {
    JSON.parse(deps.lerLiberacoes())
  } catch (e) {
    return {
      ok: false,
      token: 'cat.6',
      item: 'pré-voo cat.6 (estrutura da fila): docs/fila/liberacoes.json',
      motivo: `JSON inválido — ${(e as Error).message}`,
    }
  }
  return { ok: true, token: 'cat.6', item: 'estrutura da fila' }
}

/** Dias inteiros entre dois `AAAA-MM-DD`. Negativo vira 0 (relógio para trás não é idade). */
export function diasEntre(de: string, ate: string): number {
  const a = Date.parse(`${de}T00:00:00Z`)
  const b = Date.parse(`${ate}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.max(0, Math.round((b - a) / 86_400_000))
}

/**
 * cat.3 · sondagem de modelo — INFORMATIVA, e é decisão. Quem sonda é o
 * `probe_modelos` do executor, antes de qualquer gasto; repetir a chamada aqui
 * cobraria duas vezes por drenagem a mesma pergunta. O que o pré-voo faz é
 * dizer o que a última sondagem registrou e quando, para que "faz três dias que
 * o loop não fala com o modelo" apareça no GO/NO-GO em vez de só no ledger.
 */
export function checarUltimaSondagem(deps: Pick<PreVooDeps, 'ultimaSondagem' | 'hoje'>): Item {
  const s = deps.ultimaSondagem()
  if (!s) {
    return { ok: true, info: true, token: 'cat.3', item: 'sondagem de modelo', motivo: 'nenhuma sondagem registrada em runs/ — a primeira será a do próximo executor' }
  }
  const dias = diasEntre(s.dia, deps.hoje())
  const quando = dias === 0 ? 'hoje' : dias === 1 ? 'ontem' : `há ${dias} dias`
  return {
    ok: true,
    info: true,
    token: 'cat.3',
    item: 'sondagem de modelo',
    motivo: s.falhou
      ? `a última sondagem em runs/ FALHOU (${s.dia}, ${quando}) — quem decide adiar é o probe do executor`
      : `última sondagem ${s.dia} (${quando})`,
  }
}

export interface Veredito {
  ok: boolean
  itens: Item[]
  /** O item que reprovou, quando há. */
  token?: string
  item?: string
  motivo?: string
}

/**
 * Roda cat. 0, 1, 6 em ordem; a primeira falha aborta nomeando o item. A cat.3
 * é informativa e sempre roda por último — mesmo em NO-GO ela não muda nada, e
 * por isso não roda: um NO-GO já é aborto, e a linha de sondagem sobre um repo
 * que nem tem fila só polui.
 */
export function preVooRelampago(entrada: { config: PreVooConfig; deps: PreVooDeps }): Veredito {
  const { config, deps } = entrada
  const checagens: [string, () => Item][] = [
    ['cat.0 (spec vendorizada)', () => checarSpecVendorizada(deps)],
    ['cat.1 (identidade)', () => checarIdentidade({ config, ...deps })],
    ['cat.6 (estrutura da fila)', () => checarEstruturaFila(deps)],
    ['cat.3 (sondagem de modelo)', () => checarUltimaSondagem(deps)],
  ]
  const itens: Item[] = []
  for (const [nome, checar] of checagens) {
    let r: Item
    try {
      r = checar()
    } catch (e) {
      const falha = { ok: false, token: nome.split(' ')[0] ?? '?', item: `pré-voo ${nome}`, motivo: `checagem lançou — ${(e as Error)?.message ?? e}` }
      itens.push(falha)
      return { ok: false, itens, token: falha.token, item: falha.item, motivo: falha.motivo }
    }
    if (r && typeof (r as unknown as { then?: unknown }).then === 'function') {
      // Dep async injetada por engano: o pré-voo é síncrono por contrato. Uma
      // Promise aqui viraria `r.ok === undefined` e passaria batido.
      const falha = { ok: false, token: nome.split(' ')[0] ?? '?', item: `pré-voo ${nome}`, motivo: 'checagem devolveu Promise — deps do pré-voo são SÍNCRONAS por contrato' }
      itens.push(falha)
      return { ok: false, itens, token: falha.token, item: falha.item, motivo: falha.motivo }
    }
    if (!r || typeof r.ok !== 'boolean') {
      const falha = { ok: false, token: nome.split(' ')[0] ?? '?', item: `pré-voo ${nome}`, motivo: `checagem devolveu resultado inválido (${JSON.stringify(r)})` }
      itens.push(falha)
      return { ok: false, itens, token: falha.token, item: falha.item, motivo: falha.motivo }
    }
    itens.push(r)
    if (!r.ok) return { ok: false, itens, token: r.token, item: r.item, ...(r.motivo ? { motivo: r.motivo } : {}) }
  }
  return { ok: true, itens }
}

// ─── deps reais ─────────────────────────────────────────────────────────────

/**
 * Teto de TODA chamada externa do pré-voo. Ele é o primeiro passo de toda
 * drenagem: um `git` pendurado aqui (prompt de credencial, index.lock alheio)
 * travaria o disparo antes de existir lock, relatório ou evidência.
 */
export const TIMEOUT_PRE_VOO_MS = 15_000

/**
 * Distingue "git respondeu que não" de "git NÃO respondeu". `spawnSync` não
 * lança em timeout/binário ausente: devolve `status: null` + `error`/`signal`.
 * Tratar isso como `status !== 0` faria o pré-voo culpar a spec ("0 arquivos
 * commitados") por uma falha de ferramenta.
 */
export interface SaidaGit {
  error?: Error | undefined
  status: number | null
  signal?: NodeJS.Signals | string | null
  stdout: string
}

function exigirGit(r: SaidaGit, oque: string): SaidaGit {
  if (r?.error) throw new Error(`${oque} falhou: ${r.error.message}`)
  if (r?.status === null || r?.status === undefined) {
    throw new Error(`${oque} não completou (sinal=${r?.signal ?? '?'}; timeout de ${TIMEOUT_PRE_VOO_MS}ms)`)
  }
  return r
}

/** Dia da última sondagem: o `custo.json` (papel `probe`) e os `probe-falha-*` de `runs/`. */
export function ultimaSondagemDe(runsDir: string, custoFile: string): { dia: string; falhou: boolean } | null {
  let sucesso = ''
  try {
    const ledger = JSON.parse(readFileSync(custoFile, 'utf8')) as { dias?: Record<string, { papel?: string }[]> }
    for (const [dia, regs] of Object.entries(ledger.dias ?? {})) {
      if (Array.isArray(regs) && regs.some((r) => r?.papel === 'probe') && dia > sucesso) sucesso = dia
    }
  } catch {
    /* sem ledger legível: só as falhas contam */
  }
  let falha = ''
  try {
    for (const f of readdirSync(runsDir)) {
      const m = /^probe-falha-(\d{4})(\d{2})(\d{2})T/.exec(f)
      if (m) {
        const dia = `${m[1]}-${m[2]}-${m[3]}`
        if (dia > falha) falha = dia
      }
    }
  } catch {
    /* sem runs/: nenhuma falha registrada */
  }
  if (!sucesso && !falha) return null
  // Empate no MESMO dia resolve para "sucesso": o ledger só registra `probe`
  // com envelope de resposta, então houve conversa com o modelo naquele dia.
  return falha > sucesso ? { dia: falha, falhou: true } : { dia: sucesso, falhou: false }
}

export function preVooDepsReais(entrada: {
  repoRoot: string
  filaDir: string
  runsDir: string
  custoFile: string
  git?: (...args: string[]) => SaidaGit
  hoje?: () => string
}): PreVooDeps {
  const rodarGit =
    entrada.git ??
    ((...args: string[]) =>
      spawnSync('git', ['-C', entrada.repoRoot, ...args], { encoding: 'utf8', timeout: TIMEOUT_PRE_VOO_MS }))
  return {
    arquivoComConteudo: (rel) => {
      try {
        return statSync(join(entrada.repoRoot, 'docs/orquestrador/skill', rel)).size > 0
      } catch {
        return false
      }
    },
    contarArquivosCommitados: () => {
      const r = exigirGit(rodarGit('ls-files', 'docs/orquestrador/skill/'), 'git ls-files')
      return r.status === 0 ? r.stdout.split('\n').filter(Boolean).length : 0
    },
    lerOrigin: () => {
      const r = exigirGit(rodarGit('remote', 'get-url', 'origin'), 'git remote get-url origin')
      return r.status === 0 ? r.stdout.trim() : ''
    },
    lerEnv: () => {
      for (const nome of ['.env.local', '.env']) {
        try {
          return readFileSync(join(entrada.repoRoot, nome), 'utf8')
        } catch {
          /* tenta o próximo */
        }
      }
      return ''
    },
    filaTemArquivo: (rel) => existsSync(join(entrada.filaDir, rel)),
    filaTemDir: (rel) => {
      try {
        return statSync(join(entrada.filaDir, rel)).isDirectory()
      } catch {
        return false
      }
    },
    lerLiberacoes: () => readFileSync(join(entrada.filaDir, 'liberacoes.json'), 'utf8'),
    ultimaSondagem: () => ultimaSondagemDe(entrada.runsDir, entrada.custoFile),
    hoje: entrada.hoje ?? (() => new Date().toISOString().slice(0, 10)),
  }
}

/** Uma linha por item, na ordem em que rodaram, mais o veredito. */
export function render(v: Veredito): string {
  const linhas = v.itens.map((i) => {
    const marca = i.info ? 'info ' : i.ok ? 'ok   ' : 'NO-GO'
    return `${marca} ${i.token} ${i.item}${i.motivo ? ` — ${i.motivo}` : ''}`
  })
  // A última linha é a que o `local-loop.sh` lê: `NO-GO <token> · <item>`, com
  // o token PRIMEIRO e sem pontuação antes dele, para que um `awk '{print $2}'`
  // baste e o campo `item=` do evento nasça curto.
  linhas.push(v.ok ? 'GO' : `NO-GO ${v.token} · ${v.item}${v.motivo ? ` — ${v.motivo}` : ''}`)
  return linhas.join('\n') + '\n'
}

// --- CLI: `prevoo.ts <checkout>` (READ-ONLY) ---------------------------------
export function main(argv: string[]): number {
  const raiz = argv[0]
  if (!raiz) {
    process.stderr.write('uso: prevoo.ts <checkout-principal>\n')
    return 2
  }
  let config: PreVooConfig & { runs_dir?: string; orcamento?: { custo_file?: string } } = {}
  const configPath = join(raiz, 'docs/fila/000-config.json')
  try {
    config = JSON.parse(readFileSync(configPath, 'utf8'))
  } catch (e) {
    process.stdout.write(`NO-GO cat.6 · pré-voo (config) — ${configPath}: ${(e as Error).message}\n`)
    return 1
  }
  const runsDir = join(raiz, config.runs_dir ?? 'docs/fila/runs')
  const v = preVooRelampago({
    config,
    deps: preVooDepsReais({
      repoRoot: raiz,
      filaDir: join(raiz, 'docs/fila'),
      runsDir,
      custoFile: join(raiz, config.orcamento?.custo_file ?? 'docs/fila/runs/custo.json'),
    }),
  })
  process.stdout.write(render(v))
  return v.ok ? 0 : 1
}

/**
 * O guard da peça 1d, e não um `endsWith`: `resolve(argv[1])` não resolve
 * symlink e o `import.meta.url` vem fisicamente resolvido, então sob caminho
 * com symlink (no macOS, `/tmp` -> `/private/tmp`) a CLI saía 0 e MUDA.
 */
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
  process.exit(main(process.argv.slice(2)))
}
