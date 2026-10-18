/**
 * repo.ts — a ÚNICA porta de escrita do resolvedor DENTRO de um repo
 * instalado (decisões do chat do programa, 7f-b2).
 *
 *   - só o arquivo do ticket bloqueado: `docs/fila/<id>-<slug>.md`, com o
 *     caminho real dentro de `<raiz>/docs/fila` (symlink que sai de lá é recusado);
 *   - antes de escrever, espera nenhum git rodando: nem `index.lock`/`HEAD.lock`
 *     no git dir, nem processo `git` (`pgrep -x git`; `ORQ_RESOLVEDOR_PGREP`
 *     troca o binário nos testes), até `ORQ_RESOLVEDOR_ESPERA_GIT_S` (60 s);
 *   - o arquivo tem de estar como foi lido (senão outro processo mexeu: não age);
 *   - nenhuma tentativa nova desde a leitura (7f-b5): o `runs/<id>/` igual
 *     (nenhum `attempt-*` novo ou mexido), o log do loop sem o começo de uma
 *     tentativa do ticket e o ticket fora de `em_execucao`; senão desiste;
 *   - commit só daquele arquivo (`git commit --only -- <arquivo>`: o que mais
 *     estiver no índice fica onde está), com o trailer
 *     `Orq-Resolvedor: <classe> <regra> <assinatura>`;
 *   - NUNCA `--no-verify`: o hook do repo (no Comarka, validar-fila) é a
 *     segunda trava; se ele recusar, o arquivo volta ao que era;
 *   - nunca push, nunca outro verbo de escrita;
 *   - só na branch esperada do repo (8b): `branch` do item no repos.json,
 *     senão `branch_protegida` do config do repo, senão `main`. Fora dela não
 *     escreve, e quem chama registra `branch_inesperada` (acoes.ts).
 *
 * Toda leitura de git continua em `gitLeitura` (GIT_OPTIONAL_LOCKS=0).
 */
import { spawnSync } from 'node:child_process'
import { closeSync, existsSync, lstatSync, openSync, readdirSync, readFileSync, readSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { blocoJson } from '../triador/comum.js'
import { gitLeitura } from '../triador/git.js'
import { runsDir } from '../triador/leitor.js'
import { dentro } from './caminhos.js'

export class EscritaNoRepoRecusada extends Error {}

/** `docs/fila/<id>-<slug>.md` do ticket (relativo à raiz), se há exatamente um. */
export function arquivoDoTicket(raiz: string, id: string): string | null {
  let nomes: string[] = []
  try {
    nomes = readdirSync(join(raiz, 'docs/fila')).filter((f) => f.startsWith(`${id}-`) && f.endsWith('.md'))
  } catch {
    return null
  }
  return nomes.length === 1 ? `docs/fila/${nomes[0]}` : null
}

/** O caminho real do arquivo do ticket, ou exceção se ele não é o ticket do id dentro de docs/fila. */
export function confereTicket(raiz: string, id: string, rel: string): string {
  if (isAbsolute(rel) || !new RegExp(`^docs/fila/${id.replace(/[^0-9a-z]/g, '')}-[^/]+\\.md$`).test(rel)) {
    throw new EscritaNoRepoRecusada(`escrita fora do ticket ${id}: ${rel}`)
  }
  const abs = resolve(raiz, rel)
  if (!existsSync(abs) || lstatSync(abs).isSymbolicLink()) throw new EscritaNoRepoRecusada(`ticket ${rel} não existe ou é symlink`)
  const fila = realpathSync(join(raiz, 'docs/fila'))
  const real = realpathSync(abs)
  if (!dentro(real, fila) || real === fila) throw new EscritaNoRepoRecusada(`ticket ${rel} sai de docs/fila: ${real}`)
  return real
}

/**
 * O estado do loop para um ticket na hora da leitura (7f-b5): as entradas de
 * `<runs>/<id>/` com o mtime, e o tamanho do log do loop (`events.log` do kit
 * ou `local-loop.log` do legado). O loop relê o ticket a cada tentativa e só
 * marca `em_execucao` DEPOIS de ler (no Comarka, `executor.sh:466-496`): o
 * `mkdir attempt-N` e a linha `=== ticket <id> … — tentativa N` vêm antes.
 */
export interface Retrato {
  runs: string
  entradas: Record<string, number>
  log: string
  tamanhoLog: number
}

function entradasDe(dir: string): Record<string, number> {
  const out: Record<string, number> = {}
  try {
    for (const e of readdirSync(dir)) {
      try {
        const p = join(dir, e)
        const st = statSync(p)
        // um attempt-* conta pelo mais novo entre ele e o que tem dentro
        let m = st.mtimeMs
        if (st.isDirectory()) for (const f of readdirSync(p)) m = Math.max(m, statSync(join(p, f)).mtimeMs)
        out[e] = m
      } catch {
        /* sumiu entre o readdir e o stat: conta como mudança na próxima leitura */
      }
    }
  } catch {
    /* sem runs/<id>: nenhuma tentativa */
  }
  return out
}

export function retratoDoLoop(raiz: string, id: string): Retrato {
  const runs = runsDir(raiz)
  const log = existsSync(join(raiz, runs, 'events.log')) ? `${runs}/events.log` : `${runs}/local-loop.log`
  let tamanhoLog = 0
  try {
    tamanhoLog = statSync(join(raiz, log)).size
  } catch {
    tamanhoLog = 0
  }
  return { runs: `${runs}/${id}`, entradas: entradasDe(join(raiz, runs, id)), log, tamanhoLog }
}

const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Por que há uma tentativa nova do ticket desde o retrato, ou `null`. */
export function tentativaNova(raiz: string, id: string, rel: string, r: Retrato): string | null {
  try {
    if (blocoJson(readFileSync(join(raiz, rel), 'utf8'))?.status === 'em_execucao') return 'tentativa nova: o ticket está em_execucao'
  } catch {
    /* ticket ilegível: a conferência do arquivo decide */
  }
  const agora = entradasDe(join(raiz, r.runs))
  for (const [e, m] of Object.entries(agora)) {
    if (!(e in r.entradas)) return `tentativa nova: ${r.runs}/${e} apareceu depois da leitura`
    if (r.entradas[e] !== m) return `tentativa nova: ${r.runs}/${e} mudou depois da leitura`
  }
  let tam = 0
  try {
    tam = statSync(join(raiz, r.log)).size
  } catch {
    tam = 0
  }
  if (tam > r.tamanhoLog) {
    const buf = Buffer.alloc(tam - r.tamanhoLog)
    const fd = openSync(join(raiz, r.log), 'r')
    try {
      readSync(fd, buf, 0, buf.length, r.tamanhoLog)
    } finally {
      closeSync(fd)
    }
    const re = new RegExp(String.raw`=== ticket ${escapa(id)} \(|^\S+ ${escapa(id)} INICIO\b`)
    const l = buf.toString('utf8').split('\n').find((x) => re.test(x))
    if (l) return `tentativa nova: ${r.log}: ${l.trim().slice(0, 120)}`
  }
  return null
}

const dorme = (ms: number) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)

/** Por que não dá para escrever agora (git rodando), ou `null`. */
export function gitRodando(raiz: string): string | null {
  const gd = gitLeitura(raiz, ['rev-parse', '--absolute-git-dir'])
  if (gd.rc === 0) {
    for (const f of ['index.lock', 'HEAD.lock']) if (existsSync(join(gd.stdout.trim(), f))) return `${f} no git dir`
  }
  const p = spawnSync(process.env.ORQ_RESOLVEDOR_PGREP || 'pgrep', ['-x', 'git'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
  if (p.status === 0 && p.stdout.trim()) return `processo git rodando (pid ${p.stdout.trim().split('\n').join(', ')})`
  return null
}

/** Espera nenhum git rodando; devolve o último motivo se o tempo acabou. */
export function esperarGit(raiz: string): string | null {
  const max = Number(process.env.ORQ_RESOLVEDOR_ESPERA_GIT_S ?? 60) * 1000
  const ini = Date.now()
  for (;;) {
    const m = gitRodando(raiz)
    if (!m) return null
    if (Date.now() - ini >= max) return m
    dorme(250)
  }
}

export const trailer = (classe: string, regra: string, assinatura: string) => `Orq-Resolvedor: ${classe} ${regra} ${assinatura}`

function gitEscrita(raiz: string, args: string[]): { rc: number; saida: string } {
  if (args[0] !== 'commit' || args.includes('--no-verify') || args.includes('-n')) throw new EscritaNoRepoRecusada(`verbo de escrita proibido: git ${args.join(' ')}`)
  const r = spawnSync('git', ['-C', raiz, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`.trim() }
}

export type Escrita = { ok: true; commit: string } | { ok: false; motivo: string; branch?: { atual: string; esperada: string } }

/** A branch em que o resolvedor pode commitar no repo (8b): a do item, a `branch_protegida` do config ou `main`. */
export function branchEsperada(raiz: string, doItem?: string): string {
  if (doItem) return doItem
  try {
    const b = (JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { branch_protegida?: unknown }).branch_protegida
    if (typeof b === 'string' && b.trim()) return b.trim()
  } catch {
    /* sem config legível: o padrão */
  }
  return 'main'
}

/**
 * Troca o ticket de `antes` para `novo` e faz o commit só dele. Se qualquer
 * coisa falha depois de escrever (hook, commit com outro arquivo), o arquivo
 * volta a `antes`.
 */
export function escreverEComitar(raiz: string, id: string, rel: string, antes: string, novo: string, mensagem: string, retrato?: Retrato, branch?: string): Escrita {
  const real = confereTicket(raiz, id, rel)
  const esperando = esperarGit(raiz)
  if (esperando) return { ok: false, motivo: `git rodando: ${esperando}` }
  // a última releitura antes da troca: tentativa nova do loop, desiste (7f-b5)
  const nova = retrato ? tentativaNova(raiz, id, rel, retrato) : null
  if (nova) return { ok: false, motivo: nova }
  if (readFileSync(real, 'utf8') !== antes) return { ok: false, motivo: 'o ticket mudou desde a leitura: outro processo mexeu' }
  const esperada = branchEsperada(raiz, branch)
  const atual = gitLeitura(raiz, ['rev-parse', '--abbrev-ref', 'HEAD']).stdout.trim()
  if (atual !== esperada) return { ok: false, motivo: `branch_inesperada: checkout em '${atual}', esperada '${esperada}'`, branch: { atual, esperada } }
  const headAntes = gitLeitura(raiz, ['rev-parse', 'HEAD']).stdout.trim()
  writeFileSync(real, novo)
  const c = gitEscrita(raiz, ['commit', '--only', '-q', '-m', mensagem, '--', rel])
  if (c.rc !== 0) {
    writeFileSync(real, antes)
    return { ok: false, motivo: `commit recusado (rc ${c.rc}): ${c.saida.split('\n').slice(-3).join(' | ').slice(0, 300)}` }
  }
  const sha = gitLeitura(raiz, ['rev-parse', 'HEAD']).stdout.trim()
  const arquivos = gitLeitura(raiz, ['show', '--name-only', '--format=', sha]).stdout.split('\n').filter(Boolean)
  const pai = gitLeitura(raiz, ['rev-parse', `${sha}^`]).stdout.trim()
  if (arquivos.length !== 1 || arquivos[0] !== rel || pai !== headAntes) {
    // não desfaz o commit de outro jeito que não seja pela mão humana: avisa alto
    return { ok: false, motivo: `commit ${sha} inesperado (arquivos: ${arquivos.join(', ')}; pai ${pai}): conferir à mão` }
  }
  return { ok: true, commit: sha }
}
