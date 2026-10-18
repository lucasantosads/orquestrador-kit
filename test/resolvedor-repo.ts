/**
 * resolvedor-repo.ts — auxiliar dos testes do resolvedor (não é teste): um
 * `~/.orq` inteiro numa pasta temporária (só por variáveis de ambiente) e repos
 * git do legado-comarka montados a partir do gabarito de
 * `test/fixtures/resolvedor-7f/` (840, 929, 940, 932, os casos reais de 10/10).
 *
 * Cada repo é um `git init` com o ticket no formato real (o `antes.md` do
 * gabarito), a evidência do bloqueio nos números de linha originais (o
 * `materializar` do triador) e, quando o caso precisa, a `staging-auto` com o
 * que o resolvedor lê nela.
 */
import { execFileSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { materializar } from './triador-repo-legado.js'

export const FX_RES = join(import.meta.dirname, 'fixtures', 'resolvedor-7f')
export const FX_TRI = join(import.meta.dirname, 'fixtures', 'triador-7f')
/** Os resgates humanos de allowlist do Comarka depois de 11/10 (7f-b7). */
export const FX_7F7 = join(import.meta.dirname, 'fixtures', 'resolvedor-7f7')
export const GIT_REAL = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()

/** Onde está a evidência de cada caso do gabarito. */
export const CASO: Record<string, string> = {
  '840': join(FX_RES, 'casos', '01-840-L86356'),
  '929': join(FX_RES, 'casos', '02-929-L85996'),
  '940': join(FX_TRI, '36-940-L85222'),
  '932': join(FX_TRI, '37-932-L85272'),
  // R5 máquina (D4), sem gabarito humano: o ticket da fixture, posto em bloqueado
  '801': join(FX_TRI, '20-801-L72121'),
  // 7f-b7: os casos de ../fixtures/resolvedor-7f7 (gabarito ao lado)
  ...Object.fromEntries(
    (existsSync(join(FX_7F7, 'casos')) ? readdirSync(join(FX_7F7, 'casos')) : []).map((d) => [d.split('-')[1]!, join(FX_7F7, 'casos', d)]),
  ),
}

/** O gabarito (antes.md, depois.md) de um caso: o da 7f-b2 ou o da 7f-b7. */
const gabaritoDe = (id: string): string => (existsSync(join(FX_7F7, 'gabarito', id)) ? join(FX_7F7, 'gabarito', id) : join(FX_RES, 'gabarito', id))

export interface Ambiente {
  base: string
  env: Record<string, string>
  /** grava o repos.json do ambiente */
  repos: (itens: unknown[]) => void
}

/**
 * Um `~/.orq` temporário: repos.json, diagnósticos, resolvedor, interruptor e
 * um `pgrep` falso (ninguém rodando git, a não ser que o teste crie
 * `<base>/git-rodando`). Devolve as variáveis; quem chama as põe no ambiente.
 */
export function ambiente(): Ambiente {
  const base = mkdtempSync(join(tmpdir(), 'resolvedor-'))
  const orq = join(base, 'orq')
  mkdirSync(join(orq, 'diagnosticos'), { recursive: true })
  const pgrep = join(base, 'pgrep-falso.sh')
  writeFileSync(pgrep, `#!/bin/bash\n[ -e "${base}/git-rodando" ] && { echo 4242; exit 0; }\nexit 1\n`)
  chmodSync(pgrep, 0o755)
  const env = {
    ORQ_REPOS: join(orq, 'repos.json'),
    ORQ_DIAG_DIR: join(orq, 'diagnosticos'),
    ORQ_RESOLVEDOR_DIR: join(orq, 'resolvedor'),
    ORQ_RESOLVEDOR_PAUSADO: join(orq, 'RESOLVEDOR_PAUSADO'),
    ORQ_RESOLVEDOR_PGREP: pgrep,
    ORQ_RESOLVEDOR_ESPERA_GIT_S: '2',
    ORQ_TRIADOR_CONFIG: join(orq, 'triador.json'),
  }
  const repos = (itens: unknown[]) => writeFileSync(env.ORQ_REPOS, JSON.stringify({ $schema_versao: 1, repos: itens }, null, 2) + '\n')
  repos([])
  return { base, env, repos }
}

export const git = (raiz: string, ...a: string[]): string =>
  execFileSync(GIT_REAL, ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })

function escreve(raiz: string, rel: string, txt: string | Buffer): void {
  mkdirSync(dirname(join(raiz, rel)), { recursive: true })
  writeFileSync(join(raiz, rel), txt)
}

/** Os arquivos de uma árvore `.fonte` (o sufixo sai), relativos à raiz dela. */
function fontes(dir: string, rel = ''): [string, Buffer][] {
  const out: [string, Buffer][] = []
  for (const e of readdirSync(join(dir, rel), { withFileTypes: true })) {
    const r = rel ? `${rel}/${e.name}` : e.name
    if (e.isDirectory()) out.push(...fontes(dir, r))
    else out.push([r.replace(/\.fonte$/, ''), readFileSync(join(dir, r))])
  }
  return out
}

/** Um commit (numa branch órfã de nome dado) só com os arquivos dados; devolve o sha. */
function commitDe(raiz: string, branch: string, arquivos: [string, Buffer][]): string {
  git(raiz, 'checkout', '-q', '--orphan', branch)
  git(raiz, 'rm', '-rq', '--cached', '--ignore-unmatch', '.')
  for (const [rel, txt] of arquivos) escreve(raiz, rel, txt)
  git(raiz, 'add', '--', ...arquivos.map(([r]) => r))
  git(raiz, 'commit', '-q', '-m', branch)
  const sha = git(raiz, 'rev-parse', 'HEAD').trim()
  for (const [rel] of arquivos) git(raiz, 'rm', '-q', '--', rel)
  return sha
}

export interface RepoCaso {
  raiz: string
  /** caminho do ticket, relativo à raiz */
  ticket: string
  antes: string
  depois: string
  /** a worktree alvo (`../_worktrees/staging-auto`) */
  alvo: string
}

/**
 * O repo de um caso do gabarito em `<base>/<nome>`:
 *   - branches com o que cada `head.txt` da série aponta (os fontes dos
 *     vermelhos no 840; a árvore da tentativa no 929) e a `staging-auto`;
 *   - a `main` com o ticket (o `antes.md`) e o config commitados;
 *   - a evidência do bloqueio em `docs/fila/runs/` (ignorada pelo git, como no
 *     Comarka);
 *   - `../_worktrees/staging-auto`, um repo git limpo (ou sujo, com `arvoreSuja`).
 */
export function repoDoCaso(base: string, id: string, o: { nome?: string; arvoreSuja?: boolean } = {}): RepoCaso {
  const raiz = join(base, o.nome ?? `comarka-${id}`)
  mkdirSync(raiz, { recursive: true })
  git(raiz, 'init', '-q', '-b', 'main')
  git(raiz, 'config', 'user.name', 'resolvedor-teste')
  git(raiz, 'config', 'user.email', 'r@t')
  const d = CASO[id]!
  const caso = JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { arquivo_ticket: string }
  const serie = JSON.parse(readFileSync(join(d, 'serie.json'), 'utf8')) as { k: number; dir: string }[]

  // os heads da série e a staging-auto
  const shas = new Map<string, string>()
  let alvoSha: string | null = null
  if (existsSync(join(d, 'fontes'))) {
    for (const h of readdirSync(join(d, 'fontes'))) shas.set(h, commitDe(raiz, `head-${h.slice(0, 7)}`, fontes(join(d, 'fontes', h))))
    alvoSha = [...shas.values()].at(-1)!
  }
  if (id === '929') {
    const arv = join(FX_RES, 'arvores', '929')
    const head = commitDe(raiz, 'frente-929', fontes(join(arv, 'head')))
    for (const s of serie) shas.set(readFileSync(join(d, `attempt-${s.k}`, 'head.txt'), 'utf8').trim(), head)
    alvoSha = commitDe(raiz, 'alvo-929', fontes(join(arv, 'alvo')))
  }

  git(raiz, 'checkout', '-q', '--orphan', 'main')
  git(raiz, 'rm', '-rq', '--cached', '--ignore-unmatch', '.')
  materializar(d, raiz)
  const gab = gabaritoDe(id)
  const tk = JSON.parse(readFileSync(join(d, 'ticket.json'), 'utf8')) as Record<string, unknown>
  const antes = existsSync(gab)
    ? readFileSync(join(gab, 'antes.md'), 'utf8')
    : `# ${id}\n\n\`\`\`json\n${JSON.stringify({ ...tk, status: 'bloqueado', notas_status: 'motivo repetido: gate vitest' }, null, 2)}\n\`\`\`\n`
  const depois = existsSync(gab) ? readFileSync(join(gab, 'depois.md'), 'utf8') : ''
  writeFileSync(join(raiz, caso.arquivo_ticket), antes)
  writeFileSync(join(raiz, '.gitignore'), 'docs/fila/runs/\n')
  for (const s of serie) {
    const p = join(raiz, s.dir, 'head.txt')
    if (existsSync(p)) {
      const velho = readFileSync(p, 'utf8').trim()
      if (!shas.has(velho)) continue
      // o mtime fica o da materialização: a série do leitor é por mtime (≤ fim + 180 s)
      const st = statSync(p)
      writeFileSync(p, `${shas.get(velho)}\n`)
      utimesSync(p, st.atime, st.mtime)
    }
  }
  git(raiz, 'add', '--', '.gitignore', caso.arquivo_ticket, 'docs/fila/000-config.json')
  git(raiz, 'commit', '-q', '-m', 'fila')
  git(raiz, 'branch', 'staging-auto', alvoSha ?? 'HEAD')

  const alvo = join(base, '_worktrees', 'staging-auto')
  if (!existsSync(alvo)) {
    mkdirSync(alvo, { recursive: true })
    git(alvo, 'init', '-q', '-b', 'staging-auto')
    writeFileSync(join(alvo, 'LEIA.md'), 'alvo\n')
    git(alvo, 'add', 'LEIA.md')
    git(alvo, 'commit', '-q', '-m', 'alvo')
  }
  if (o.arvoreSuja) writeFileSync(join(alvo, 'LEIA.md'), 'sujo\n')
  return { raiz, ticket: caso.arquivo_ticket, antes, depois, alvo }
}

/** O 1º bloco json de um ticket .md. */
export function jsonDo(md: string): Record<string, unknown> {
  return JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)![1]!) as Record<string, unknown>
}

/** As linhas que mudaram entre dois textos de mesmo tamanho em linhas (índices). */
export function linhasDiferentes(a: string, b: string): number[] {
  const la = a.split('\n')
  const lb = b.split('\n')
  if (la.length !== lb.length) return [-1]
  return la.flatMap((l, i) => (l === lb[i] ? [] : [i]))
}

/** Põe as variáveis do ambiente no process.env e devolve quem as tira. */
export function comEnv(env: Record<string, string>): () => void {
  const antes = new Map(Object.keys(env).map((k) => [k, process.env[k]]))
  Object.assign(process.env, env)
  return () => {
    for (const [k, v] of antes) {
      if (v === undefined) delete process.env[k]
      else process.env[k] = v
    }
  }
}
