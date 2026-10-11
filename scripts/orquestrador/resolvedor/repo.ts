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
 *   - commit só daquele arquivo (`git commit --only -- <arquivo>`: o que mais
 *     estiver no índice fica onde está), com o trailer
 *     `Orq-Resolvedor: <classe> <regra> <assinatura>`;
 *   - NUNCA `--no-verify`: o hook do repo (no Comarka, validar-fila) é a
 *     segunda trava; se ele recusar, o arquivo volta ao que era;
 *   - nunca push, nunca outro verbo de escrita.
 *
 * Toda leitura de git continua em `gitLeitura` (GIT_OPTIONAL_LOCKS=0).
 */
import { spawnSync } from 'node:child_process'
import { existsSync, lstatSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
import { isAbsolute, join, resolve } from 'node:path'
import { gitLeitura } from '../triador/git.js'
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

export type Escrita = { ok: true; commit: string } | { ok: false; motivo: string }

/**
 * Troca o ticket de `antes` para `novo` e faz o commit só dele. Se qualquer
 * coisa falha depois de escrever (hook, commit com outro arquivo), o arquivo
 * volta a `antes`.
 */
export function escreverEComitar(raiz: string, id: string, rel: string, antes: string, novo: string, mensagem: string): Escrita {
  const real = confereTicket(raiz, id, rel)
  const esperando = esperarGit(raiz)
  if (esperando) return { ok: false, motivo: `git rodando: ${esperando}` }
  if (readFileSync(real, 'utf8') !== antes) return { ok: false, motivo: 'o ticket mudou desde a leitura: outro processo mexeu' }
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
