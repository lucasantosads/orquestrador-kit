/**
 * Etapa 7f-b1, peça 4 · a saída do triador fora do repo (spec 7f-a §1, §5, §6).
 *
 * Pronto quando:
 *   - o triador roda num repo GIT de fixture e `git status --porcelain` não
 *     muda, nenhum mtime muda (nem de diretório: um index.lock criado e
 *     apagado mudaria o mtime de .git) e nenhum `index.lock` aparece;
 *   - um `git` falso na frente do PATH registra o ambiente de cada chamada, e
 *     todas levam `GIT_OPTIONAL_LOCKS=0` (e houve ao menos uma: o falso foi
 *     usado de verdade);
 *   - escrita com destino dentro de um repo do repos.json lança erro;
 *   - mesma assinatura não roda duas vezes; trava O_EXCL; histórico; cópia
 *     da evidência com segredo mascarado.
 *
 * Toda escrita do triador vai para um ORQ_DIAG_DIR temporário.
 */
import { execFileSync, spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { materializar } from './triador-repo-legado.js'

const RAIZ = join(import.meta.dirname, '..')
const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
const TSX = join(RAIZ, 'node_modules', '.bin', 'tsx')
const GIT_REAL = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()

interface Mods {
  Guarda: new (extra?: string[]) => { escrever: (p: string, c: string) => void; raiz: string }
  EscritaRecusada: new (...a: unknown[]) => Error
  triarTicket: (o: { repo: { nome: string; caminho: string }; id: string; agora?: number }) => { feito: string; diagnostico?: { classe: string | null; firme: boolean } }
  gitLeitura: (raiz: string, args: string[]) => { rc: number }
  GitProibido: new (...a: unknown[]) => Error
}
async function carregar(): Promise<Mods | null> {
  try {
    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
    const m = { ...(await imp('saida.ts')), ...(await imp('triar.ts')), ...(await imp('git.ts')) }
    return typeof m.Guarda === 'function' && typeof m.triarTicket === 'function' ? (m as unknown as Mods) : null
  } catch {
    return null
  }
}

const SEGREDO = 'sk-ant-api03-ABCDEFGHIJKLMNOPQRSTUV1234567890'

/** Um repo git do legado com o caso 627j: os fontes dos testes vermelhos no commit que o head.txt aponta. */
function repoGit(base: string): string {
  const raiz = join(base, 'comarka-fx')
  mkdirSync(raiz, { recursive: true })
  const d = join(FX, '07-627j-L57368')
  const git = (...a: string[]) => execFileSync(GIT_REAL, ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'pipe' })
  git('init', '-q', '-b', 'main')
  const fontes = join(d, 'fontes')
  for (const head of readdirSync(fontes)) {
    const varre = (dir: string, rel: string): void => {
      for (const e of readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) varre(join(dir, e.name), `${rel}${e.name}/`)
        else {
          mkdirSync(join(raiz, rel), { recursive: true })
          writeFileSync(join(raiz, rel, e.name.replace(/\.fonte$/, '')), readFileSync(join(dir, e.name)))
        }
      }
    }
    varre(join(fontes, head), '')
  }
  git('add', '-A')
  git('commit', '-q', '-m', 'fontes')
  const sha = execFileSync(GIT_REAL, ['-C', raiz, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
  materializar(d, raiz)
  const serie = JSON.parse(readFileSync(join(d, 'serie.json'), 'utf8')) as { dir: string }[]
  for (const s of serie) {
    writeFileSync(join(raiz, s.dir, 'head.txt'), `${sha}\n`)
    const co = join(raiz, s.dir, 'claude-output.txt')
    writeFileSync(co, `${existsSync(co) ? readFileSync(co, 'utf8') : ''}\nchave vazada: ${SEGREDO}\n`)
  }
  // o ticket bloqueado, como o motor do legado deixa
  const caso = JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { arquivo_ticket: string }
  const tk = readFileSync(join(raiz, caso.arquivo_ticket), 'utf8').replace(/"status": "[a-z]+"/, '"status": "bloqueado"')
  writeFileSync(join(raiz, caso.arquivo_ticket), tk)
  git('add', '-A')
  git('commit', '-q', '-m', 'repo')
  // mtimes da série no instante do bloqueio (o add/commit não mexe, mas o write acima sim)
  const fimS = Date.parse((JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { fim: string }).fim) / 1000 - 60
  for (const s of serie) for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
  return raiz
}

/** mtime e tamanho de TUDO sob a raiz, inclusive .git e os próprios diretórios. */
function retrato(raiz: string): Record<string, string> {
  const out: Record<string, string> = {}
  const varre = (p: string) => {
    const st = statSync(p, { bigint: true })
    out[p] = `${st.mtimeNs}:${st.isDirectory() ? 'd' : st.size}`
    if (st.isDirectory()) for (const f of readdirSync(p)) varre(join(p, f))
  }
  varre(raiz)
  return out
}

let base: string
let diag: string
const envAntes = { ...process.env }
beforeEach(() => {
  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-saida-')))
  diag = join(base, 'diag')
  process.env.ORQ_DIAG_DIR = diag
  process.env.ORQ_REPOS = join(base, 'repos.json')
})
afterEach(() => {
  process.env = { ...envAntes }
})

function triarCli(raiz: string, args: string[] = []) {
  const bin = join(base, 'bin')
  mkdirSync(bin, { recursive: true })
  writeFileSync(join(bin, 'git'), `#!/usr/bin/env bash\nprintf '%s\\t%s\\n' "\${GIT_OPTIONAL_LOCKS-<ausente>}" "$*" >> "${join(base, 'git.log')}"\nexec "${GIT_REAL}" "$@"\n`)
  chmodSync(join(bin, 'git'), 0o755)
  return spawnSync(TSX, [join(TRIADOR, 'cli.ts'), raiz, ...args], {
    encoding: 'utf8',
    cwd: RAIZ,
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ORQ_DIAG_DIR: diag, ORQ_REPOS: join(base, 'repos.json') },
  })
}

describe('saída do triador (peça 4)', () => {
  it('num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0', () => {
    const raiz = repoGit(base)
    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
    const status = () => execFileSync(GIT_REAL, ['-C', raiz, 'status', '--porcelain'], { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
    expect(status()).toBe('')
    const antes = retrato(raiz)
    const r = triarCli(raiz)
    const depois = retrato(raiz)
    expect(r.status, r.stderr).toBe(0)
    expect(r.stdout).toMatch(/627j\tR1\tfirme D6/)
    expect(depois).toEqual(antes)
    expect(existsSync(join(raiz, '.git', 'index.lock'))).toBe(false)
    expect(status()).toBe('')
    const log = existsSync(join(base, 'git.log')) ? readFileSync(join(base, 'git.log'), 'utf8').split('\n').filter(Boolean) : []
    expect(log.length, 'o git falso não foi chamado').toBeGreaterThan(0)
    expect(log.filter((l) => !l.startsWith('0\t'))).toEqual([])
    expect(log.every((l) => /^0\t-C \S+ (show|log|rev-parse|ls-tree|status --porcelain)\b/.test(l)), log.join('\n')).toBe(true)
    // o diagnóstico ficou fora do repo, no formato da spec §5
    const d = JSON.parse(readFileSync(join(diag, 'comarka-fx', '627j.json'), 'utf8')) as Record<string, unknown>
    expect(d).toMatchObject({ $schema_versao: 1, repo: 'comarka-fx', id: '627j', leitor: 'legado-comarka', classe: 'R1', firme: true, fonte: 'extracao', regra: 'D6', modelo: null, encerrado_em: null })
  })

  it('mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico', () => {
    const raiz = repoGit(base)
    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
    expect(triarCli(raiz).status).toBe(0)
    const atual = join(diag, 'comarka-fx', '627j.json')
    const m1 = statSync(atual).mtimeMs
    const ass1 = (JSON.parse(readFileSync(atual, 'utf8')) as { assinatura: string }).assinatura
    const r2 = triarCli(raiz)
    expect(r2.stdout).toMatch(/627j\tmesma_assinatura/)
    expect(statSync(atual).mtimeMs).toBe(m1)
    // uma tentativa reescrita (requeue, nova tentativa) muda a assinatura
    const serie = JSON.parse(readFileSync(join(FX, '07-627j-L57368', 'serie.json'), 'utf8')) as { dir: string }[]
    const f = join(raiz, serie.at(-1)!.dir, 'diff.stat')
    const st = statSync(f)
    utimesSync(f, st.atime, new Date(st.mtimeMs + 1000))
    expect(triarCli(raiz).stdout).toMatch(/627j\tR1/)
    const ass2 = (JSON.parse(readFileSync(atual, 'utf8')) as { assinatura: string }).assinatura
    expect(ass2).not.toBe(ass1)
    expect(readdirSync(join(diag, 'comarka-fx', '627j', 'historico'))).toEqual([`${ass1.slice(0, 12)}.json`])
  })

  it('cópia da evidência fora do repo, com o segredo mascarado', () => {
    const raiz = repoGit(base)
    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
    expect(triarCli(raiz).status).toBe(0)
    const d = JSON.parse(readFileSync(join(diag, 'comarka-fx', '627j.json'), 'utf8')) as { copia_evidencia: string; evidencia: { arquivo: string }[] }
    expect(d.copia_evidencia.startsWith(diag)).toBe(true)
    const copias: string[] = []
    const varre = (p: string) => {
      for (const e of readdirSync(p, { withFileTypes: true })) (e.isDirectory() ? varre : (x: string) => copias.push(x))(join(p, e.name))
    }
    varre(d.copia_evidencia)
    const co = copias.filter((p) => p.endsWith('claude-output.txt'))
    expect(co.length).toBeGreaterThan(0)
    for (const p of copias) expect(readFileSync(p, 'utf8'), p).not.toContain(SEGREDO)
    expect(co.some((p) => readFileSync(p, 'utf8').includes('chave vazada: ‹segredo›'))).toBe(true)
    // toda evidência do diagnóstico tem cópia
    for (const e of d.evidencia) expect(existsSync(join(d.copia_evidencia, e.arquivo)), e.arquivo).toBe(true)
  })

  it('escrita com destino dentro de um repo do repos.json lança erro, e fora da raiz também', async () => {
    const m = await carregar()
    const repo = join(base, 'um-repo')
    mkdirSync(repo)
    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: repo }] }))
    const tenta = (f: () => void) => {
      if (!m) return 'sem módulo'
      try {
        f()
        return 'escreveu'
      } catch (e) {
        return e instanceof m.EscritaRecusada ? 'recusou' : `outro erro: ${(e as Error).message}`
      }
    }
    expect(tenta(() => new m!.Guarda().escrever(join(diag, 'ok.json'), '{}'))).toBe('escreveu')
    expect(tenta(() => new m!.Guarda().escrever(join(repo, 'docs', 'x.json'), '{}'))).toBe('recusou')
    expect(tenta(() => new m!.Guarda().escrever(join(base, 'fora.json'), '{}'))).toBe('recusou')
    expect(tenta(() => new m!.Guarda().escrever(join(diag, '..', 'um-repo', 'y'), '{}'))).toBe('recusou')
    process.env.ORQ_DIAG_DIR = join(repo, '.orq-diag')
    expect(tenta(() => new m!.Guarda().escrever(join(repo, '.orq-diag', 'z.json'), '{}'))).toBe('recusou')
    // o repo que está sendo triado é protegido mesmo fora do repos.json
    process.env.ORQ_DIAG_DIR = diag
    const outro = join(base, 'outro')
    mkdirSync(outro)
    expect(tenta(() => new m!.Guarda([outro]).escrever(join(outro, 'w'), '{}'))).toBe('recusou')
    expect(existsSync(join(repo, 'docs')) || existsSync(join(base, 'fora.json')) || existsSync(join(outro, 'w'))).toBe(false)
  })

  it('trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda', async () => {
    const m = await carregar()
    const raiz = repoGit(base)
    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
    const trava = join(diag, 'comarka-fx', '627j.lock')
    mkdirSync(dirname(trava), { recursive: true })
    writeFileSync(trava, '{"pid": 1}\n')
    const repo = { nome: 'comarka-fx', caminho: raiz }
    expect(m?.triarTicket({ repo, id: '627j' }).feito).toBe('travado')
    expect(existsSync(join(diag, 'comarka-fx', '627j.json'))).toBe(false)
    const velho = new Date(Date.now() - 11 * 60 * 1000)
    utimesSync(trava, velho, velho)
    const r = m?.triarTicket({ repo, id: '627j' })
    expect(r?.feito).toBe('diagnosticado')
    expect(existsSync(trava)).toBe(false)
  })

  it('gitLeitura recusa verbo de escrita e status sem --porcelain, antes de existir processo', async () => {
    const m = await carregar()
    const recusa = (args: string[]) => {
      if (!m) return 'sem módulo'
      try {
        m.gitLeitura(base, args)
        return 'rodou'
      } catch (e) {
        return e instanceof m.GitProibido ? 'recusou' : 'outro'
      }
    }
    for (const a of [['checkout', 'main'], ['fetch'], ['worktree', 'add', 'x'], ['stash'], ['status'], ['commit', '-m', 'x'], ['add', '.']]) {
      expect(recusa(a), a.join(' ')).toBe('recusou')
    }
    expect(recusa(['rev-parse', '--version'])).toBe('rodou')
  })
})
