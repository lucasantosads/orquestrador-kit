/**
 * Etapa MIG-A, peça P4 · `orq migrations aplicar` (e status, plano, linha-base, sonda).
 *
 * Um `~/.orq` temporário, um repo git de fixture com o `liberacoes.json` REAL
 * do Comarka (18/10, 324 entradas em `.liberadas`) e um stub HTTP em 127.0.0.1
 * no lugar da API de gestão. Nunca o banco.
 *
 * Pronto quando:
 *   - cada recusa tem teste, e nenhuma chega a aplicar nem a escrever no repo:
 *     MIGRATIONS_PAUSADO, sem TTY, sem sonda verde, sem linha de base, repo só
 *     leitura, arquivo fora do plano, arquivo divergente entre refs, token
 *     ausente/duplo/já liberado, pausar_file, .orq-pause, liberacoes modificado
 *     na árvore, SQL recusado, ORQ_TESTE=1 apontando para a API oficial,
 *     confirmação errada;
 *   - a trava por banco: com outro processo vivo segurando, recusa; órfã, assume;
 *   - pre_check vermelho para antes de aplicar;
 *   - conferência que falha (ou erro, ou incerto sem a linha) não emite token;
 *   - o commit tem só o arquivo de liberação, com o trailer Orq-Aplicador:, e o
 *     replay no formato real acrescenta exatamente uma entrada em `.liberadas`.
 */
import { spawn, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
import { createServer, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { dirname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import { ambiente, comEnv, git, type Ambiente } from './resolvedor-repo.js'

const KIT = join(import.meta.dirname, '..')
const DIR = join(KIT, 'scripts', 'orquestrador', 'migrations')
const FX = join(import.meta.dirname, 'fixtures', 'migrations')
const TOKEN = 'sbp_' + 'a1b2c3d4'.repeat(5)
const BANCO_ID = 'abcdefghijklmnopqrst'

const NOVA = 'supabase/migrations/20261020000100_nova.sql'
const ANTIGA = 'supabase/migrations/20261001000000_antiga.sql'
const HERDADA = 'supabase/migrations/20261005000000_herdada.sql'
const SQL_NOVA = '-- APLICAR E HUMANO; libera humano:migration-9001-aplicada\n-- fase: expansao\nbegin;\ncreate table public.t9001 (i int);\ndrop index if exists public.ix_velho;\ncommit;\n'

type Aplicada = { version: string; name: string | null; created_by: string | null }
type Saida = { ok: true; commit: string; token: string } | { ok: false; tipo: string; motivo: string }
type Meios = { tty: boolean; perguntar: (t: string) => Promise<string>; escrever: (t: string) => void; usuario: string; agora: () => Date }
type AplicarMod = { aplicar: (e: { repo: string; arquivo: string; token?: string }, m: Meios) => Promise<Saida> }
type CliMod = { main: (argv: string[], m?: Partial<Meios>) => Promise<number> }

/** o banco do stub */
let aplicadas: Aplicada[] = []
let modo: 'ok' | 'naoGrava' | 'erro400' | 'timeout' | 'grava503' = 'ok'
let sondaVerde = true
let inserts: string[] = []
let srv: Server
let api = ''

const json = (res: ServerResponse, status: number, v: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(v))
}
const lit = (q: string, i: number) => [...q.matchAll(/\$(orq[0-9a-f]+)\$([\s\S]*?)\$\1\$/g)].map((x) => x[2]!)[i]!

function stub(q: string, res: ServerResponse) {
  if (q.includes('mesma_transacao')) return json(res, 201, [{ mesma_transacao: sondaVerde }])
  if (q.startsWith('select version, name, created_by')) return json(res, 201, aplicadas)
  if (!q.includes('insert into supabase_migrations.schema_migrations')) return json(res, 400, { message: 'stub: query inesperada' })
  inserts.push(q)
  const ins = q.slice(q.indexOf('insert into supabase_migrations'))
  const n = [...ins.matchAll(/\$(orq[0-9a-f]+)\$/g)].length / 2
  const linha = { version: lit(ins, 0), name: lit(ins, 1), created_by: lit(ins, n - 1) }
  if (modo === 'ok') {
    aplicadas.push(linha)
    return json(res, 201, [])
  }
  if (modo === 'naoGrava') return json(res, 201, [])
  if (modo === 'erro400') return json(res, 400, { message: `ERROR: 42P07: relation "t9001" already exists (auth ${TOKEN})` })
  if (modo === 'grava503') {
    aplicadas.push(linha)
    return json(res, 503, { message: 'upstream timeout' })
  }
  /* timeout: nunca responde */
}

describe('P4: orq migrations aplicar', () => {
  let amb: Ambiente
  let tira: () => void = () => {}
  let ap: AplicarMod | null = null
  let cli: CliMod | null = null
  let raiz = ''
  let saida: string[] = []
  let n = 0
  const env = () => amb.env as Record<string, string>
  const migDir = () => env().ORQ_MIGRATIONS_DIR!

  const meios = (o: Partial<Meios> = {}): Meios => ({
    tty: true,
    perguntar: async () => '20261020000100',
    escrever: (t) => saida.push(t),
    usuario: 'lucas',
    agora: () => new Date('2026-10-20T15:00:00Z'),
    ...o,
  })

  const escreve = (rel: string, txt: string) => {
    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
    writeFileSync(join(raiz, rel), txt)
  }

  /** o repo do caso, o repos.json, a linha de base e a sonda */
  function montar(o: { preCheck?: string[]; somenteLeitura?: boolean; main?: Record<string, string>; staging?: Record<string, string>; cfg?: Record<string, unknown> } = {}) {
    raiz = join(amb.base, `c${++n}`, 'comarka')
    mkdirSync(raiz, { recursive: true })
    git(raiz, 'init', '-q', '-b', 'main')
    escreve('docs/fila/000-config.json', JSON.stringify({ liberacoes_file: 'docs/fila/liberacoes.json', ...o.cfg }, null, 2) + '\n')
    copyFileSync(join(FX, 'liberacoes-comarka-18-10.json'), join(raiz, 'docs/fila/liberacoes.json'))
    escreve('.gitignore', '.env.local\n')
    escreve('.env.local', `NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\nSUPABASE_ACCESS_TOKEN=${TOKEN}\n`)
    escreve(ANTIGA, 'create table public.antiga (i int);\n')
    escreve(NOVA, SQL_NOVA)
    escreve('src/outro.ts', 'export const a = 1\n')
    for (const [k, v] of Object.entries(o.main ?? {})) escreve(k, v)
    git(raiz, 'add', '-A')
    git(raiz, 'commit', '-q', '-m', 'inicio')
    git(raiz, 'checkout', '-q', '-b', 'staging-auto')
    escreve(HERDADA, '-- libera humano:migration-9002-aplicada\ncreate table public.t9002 (i int);\n')
    for (const [k, v] of Object.entries(o.staging ?? {})) escreve(k, v)
    git(raiz, 'add', '-A')
    git(raiz, 'commit', '-q', '-m', 'staging')
    git(raiz, 'checkout', '-q', 'main')
    const repo = o.somenteLeitura
      ? { repo: 'cmk', dir: 'supabase/migrations', refs: ['HEAD', 'staging-auto'], somente_leitura: true }
      : {
          repo: 'cmk',
          dir: 'supabase/migrations',
          refs: ['HEAD', 'staging-auto'],
          credencial_env: 'SUPABASE_ACCESS_TOKEN',
          token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
          ...(o.preCheck ? { pre_check: o.preCheck } : {}),
        }
    writeFileSync(
      env().ORQ_REPOS!,
      JSON.stringify({ $schema_versao: 1, repos: [{ nome: 'cmk', caminho: raiz }], migrations: { bancos: { b1: { ferramenta: 'supabase', banco_id: BANCO_ID, repos: [repo] } } } }, null, 2),
    )
    mkdirSync(migDir(), { recursive: true })
    writeFileSync(
      join(migDir(), 'b1.json'),
      JSON.stringify({
        $versao: 1,
        banco: 'b1',
        criado_em: '2026-10-18T17:00:00.000Z',
        corte: '20261010000000',
        herdados_desde: '20261002000000',
        aplicadas: [{ version: '20261001000000', name: 'antiga', created_by: 'conector-mcp' }],
        pendentes_herdados: [{ repo: 'cmk', arquivo: HERDADA, versao: '20261005000000', nome: 'herdada' }],
        antigos_sem_ledger: 0,
      }),
    )
    writeFileSync(join(migDir(), 'b1.sonda.json'), JSON.stringify({ banco: 'b1', banco_id: BANCO_ID, mesma_transacao: true, em: '2026-10-18T17:00:00.000Z' }))
    return raiz
  }

  const lib = () => readFileSync(join(raiz, 'docs/fila/liberacoes.json'), 'utf8')
  const ledger = () => {
    const p = join(migDir(), 'ledger.jsonl')
    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
  }
  const head = () => git(raiz, 'rev-parse', 'HEAD').trim()
  const original = () => readFileSync(join(FX, 'liberacoes-comarka-18-10.json'), 'utf8')

  /** recusa: nada aplicado, nada commitado, liberacoes intocado */
  async function recusa(e: { repo?: string; arquivo?: string; token?: string }, re: RegExp, m: Partial<Meios> = {}) {
    const h = head()
    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA, ...e }, meios(m))
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.motivo).toMatch(re)
    expect(inserts).toEqual([])
    expect(head()).toBe(h)
    expect(lib()).toBe(original())
    return r
  }

  beforeAll(async () => {
    srv = createServer((req, res) => {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => stub(String((JSON.parse(b || '{}') as { query?: string }).query ?? ''), res))
    })
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
    api = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
    amb = ambiente()
    Object.assign(amb.env, {
      ORQ_MIGRATIONS_DIR: join(amb.base, 'orq', 'migrations'),
      ORQ_MIGRATIONS_PAUSADO: join(amb.base, 'orq', 'MIGRATIONS_PAUSADO'),
      ORQ_TESTE: '1',
      ORQ_MIGRATIONS_API: api,
    })
    tira = comEnv(amb.env)
    try {
      ap = (await import(pathToFileURL(join(DIR, 'aplicar.ts')).href)) as AplicarMod
      cli = (await import(pathToFileURL(join(DIR, 'cli.ts')).href)) as CliMod
    } catch {
      ap = cli = null
    }
  })
  afterAll(async () => {
    tira()
    srv.closeAllConnections()
    await new Promise((r) => srv.close(r))
  })
  beforeEach(() => {
    aplicadas = [{ version: '20261001000000', name: 'antiga', created_by: 'conector-mcp' }]
    modo = 'ok'
    sondaVerde = true
    inserts = []
    saida = []
    rmSync(join(amb.base, 'orq', 'migrations'), { recursive: true, force: true })
    rmSync(env().ORQ_MIGRATIONS_PAUSADO!, { force: true })
  })

  it('caminho feliz: aplica, confere, e commita só o liberacoes.json com o trailer (replay no formato real)', async () => {
    expect(ap).not.toBeNull()
    montar()
    // algo já no índice fica no índice e fora do commit (git commit --only)
    writeFileSync(join(raiz, 'src/outro.ts'), 'export const a = 2\n')
    git(raiz, 'add', 'src/outro.ts')
    const h = head()
    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
    expect(r).toEqual({ ok: true, commit: expect.stringMatching(/^[0-9a-f]{40}$/), token: 'migration-9001-aplicada' })
    // o insert: versão e nome DO ARQUIVO, created_by do aplicador, sem o envelope
    expect(inserts).toHaveLength(1)
    expect(aplicadas.at(-1)).toEqual({ version: '20261020000100', name: 'nova', created_by: 'orq-aplicador:lucas' })
    expect(inserts[0]).not.toMatch(/^begin;/m)
    expect(inserts[0]).toContain('create table public.t9001 (i int);')
    // o commit
    expect(git(raiz, 'rev-parse', 'HEAD^').trim()).toBe(h)
    expect(git(raiz, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n')).toEqual(['docs/fila/liberacoes.json'])
    expect(git(raiz, 'log', '-1', '--format=%B')).toMatch(/\nOrq-Aplicador: b1 20261020000100 supabase\/migrations\/20261020000100_nova\.sql\n/)
    expect(git(raiz, 'diff', '--cached', '--name-only').trim()).toBe('src/outro.ts')
    // o replay: exatamente uma entrada a mais em .liberadas, o resto byte a byte
    const antes = JSON.parse(original()) as { liberadas: unknown[] }
    const depois = JSON.parse(lib()) as { liberadas: Record<string, string>[]; tokens: unknown[] }
    expect(depois.liberadas).toHaveLength(325)
    const nova = depois.liberadas.at(-1)!
    const d = new Date()
    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    expect(nova).toEqual({
      token: 'migration-9001-aplicada',
      em: hoje,
      por: 'lucas',
      nota: 'aplicador do kit, versão 20261020000100, arquivo supabase/migrations/20261020000100_nova.sql, ref HEAD, usuário lucas',
    })
    expect({ ...depois, liberadas: depois.liberadas.slice(0, -1) }).toEqual(antes)
    expect(git(raiz, 'diff', '--numstat', 'HEAD^', 'HEAD').trim()).toBe('6\t0\tdocs/fila/liberacoes.json')
    // mostrou o SQL e o aviso de classe; o token nunca aparece
    const tudo = saida.join('\n')
    expect(tudo).toContain('create table public.t9001 (i int);')
    expect(tudo).toMatch(/aviso.*DROP/i)
    expect(tudo).not.toContain(TOKEN.slice(4))
    expect(JSON.stringify(ledger())).not.toContain(TOKEN.slice(4))
    expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'aplicada', 'token_emitido'])
    expect(ledger().at(-1)).toEqual(expect.objectContaining({ banco: 'b1', repo: 'cmk', arquivo: NOVA, versao: '20261020000100', token: 'migration-9001-aplicada', commit: r.ok ? r.commit : '' }))
  })

  it('herdado que só existe na staging: aplica do ref, e a nota diz o ref', async () => {
    expect(ap).not.toBeNull()
    montar()
    const r = await ap!.aplicar({ repo: 'cmk', arquivo: '20261005000000_herdada.sql' }, meios({ perguntar: async () => '20261005000000' }))
    expect(r).toEqual(expect.objectContaining({ ok: true, token: 'migration-9002-aplicada' }))
    expect(inserts[0]).toContain('create table public.t9002 (i int);')
    expect((JSON.parse(lib()) as { liberadas: { nota: string }[] }).liberadas.at(-1)!.nota).toContain('ref staging-auto')
  })

  describe('recusas (nada aplicado, nada escrito no repo)', () => {
    it('MIGRATIONS_PAUSADO', async () => {
      expect(ap).not.toBeNull()
      montar()
      writeFileSync(env().ORQ_MIGRATIONS_PAUSADO!, 'manutenção\n')
      await recusa({}, /MIGRATIONS_PAUSADO/)
    })
    it('sem TTY', async () => {
      expect(ap).not.toBeNull()
      montar()
      await recusa({}, /sem TTY/, { tty: false })
    })
    it('sem sonda, e com a sonda vermelha', async () => {
      expect(ap).not.toBeNull()
      montar()
      rmSync(join(migDir(), 'b1.sonda.json'))
      await recusa({}, /sonda/)
      writeFileSync(join(migDir(), 'b1.sonda.json'), JSON.stringify({ mesma_transacao: false }))
      await recusa({}, /sonda/)
    })
    it('sem linha de base', async () => {
      expect(ap).not.toBeNull()
      montar()
      rmSync(join(migDir(), 'b1.json'))
      await recusa({}, /linha de base/)
    })
    it('repo só leitura', async () => {
      expect(ap).not.toBeNull()
      montar({ somenteLeitura: true })
      await recusa({}, /somente_leitura|só leitura/)
    })
    it('arquivo fora do plano (já aplicado) e arquivo que não existe', async () => {
      expect(ap).not.toBeNull()
      montar()
      await recusa({ arquivo: ANTIGA }, /fora do plano/)
      await recusa({ arquivo: 'supabase/migrations/20261099000000_nao_existe.sql' }, /fora do plano/)
    })
    it('arquivo com conteúdo diferente entre os refs', async () => {
      expect(ap).not.toBeNull()
      montar({ staging: { [NOVA]: SQL_NOVA.replace('t9001', 't9001x') } })
      await recusa({}, /diverge|diferente entre/)
    })
    it('token: ausente, dois no arquivo, já liberado', async () => {
      expect(ap).not.toBeNull()
      montar({ main: { 'supabase/migrations/20261020000200_sem_token.sql': 'create table public.s (i int);\n', 'supabase/migrations/20261020000300_dois.sql': '-- humano:migration-1-aplicada humano:migration-2-aplicada\ncreate table public.d (i int);\n' } })
      await recusa({ arquivo: 'supabase/migrations/20261020000200_sem_token.sql' }, /token/, { perguntar: async () => '20261020000200' })
      await recusa({ arquivo: 'supabase/migrations/20261020000300_dois.sql' }, /token/, { perguntar: async () => '20261020000300' })
      // já liberado (na forma do Comarka, sem prefixo)
      const d = JSON.parse(original()) as { liberadas: unknown[] }
      d.liberadas.push({ token: 'migration-9001-aplicada', em: '2026-10-19', por: 'lucas', nota: 'à mão' })
      writeFileSync(join(raiz, 'docs/fila/liberacoes.json'), JSON.stringify(d, null, 2) + '\n')
      git(raiz, 'commit', '-q', '-am', 'liberado à mão')
      const h = head()
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r).toEqual(expect.objectContaining({ ok: false, motivo: expect.stringMatching(/já está liberado/) }))
      expect(inserts).toEqual([])
      expect(head()).toBe(h)
    })
    it('--token explícito vale para o arquivo sem token, e é conferido contra o molde', async () => {
      expect(ap).not.toBeNull()
      montar({ main: { 'supabase/migrations/20261020000200_sem_token.sql': 'create table public.s (i int);\n' } })
      await recusa({ arquivo: 'supabase/migrations/20261020000200_sem_token.sql', token: 'decisao-D1' }, /molde/, { perguntar: async () => '20261020000200' })
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: 'supabase/migrations/20261020000200_sem_token.sql', token: 'humano:migration-777-aplicada' }, meios({ perguntar: async () => '20261020000200' }))
      expect(r).toEqual(expect.objectContaining({ ok: true, token: 'migration-777-aplicada' }))
    })
    it('pausar_file do repo, docs/fila/.orq-pause e liberacoes modificado na árvore', async () => {
      expect(ap).not.toBeNull()
      montar({ cfg: { pausar_file: 'docs/fila/PAUSAR' } })
      writeFileSync(join(raiz, 'docs/fila/PAUSAR'), 'x\n')
      await recusa({}, /pausar_file.*PAUSAR/)
      rmSync(join(raiz, 'docs/fila/PAUSAR'))
      writeFileSync(join(raiz, 'docs/fila/.orq-pause'), 'ritual\n')
      await recusa({}, /\.orq-pause.*ritual/)
      rmSync(join(raiz, 'docs/fila/.orq-pause'))
      const h = head()
      writeFileSync(join(raiz, 'docs/fila/liberacoes.json'), original().replace('"descricao"', '"descricao" ') )
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r).toEqual(expect.objectContaining({ ok: false, motivo: expect.stringMatching(/modificado na árvore/) }))
      expect(inserts).toEqual([])
      expect(head()).toBe(h)
    })
    it('SQL recusado (begin no meio)', async () => {
      expect(ap).not.toBeNull()
      montar({ main: { 'supabase/migrations/20261020000400_dupla.sql': '-- humano:migration-9004-aplicada\nbegin;\ncreate table a(i int);\ncommit;\nbegin;\ncreate table b(i int);\ncommit;\n' } })
      await recusa({ arquivo: 'supabase/migrations/20261020000400_dupla.sql' }, /transação no meio/, { perguntar: async () => '20261020000400' })
    })
    it('ORQ_TESTE=1 apontando para a API oficial', async () => {
      expect(ap).not.toBeNull()
      montar()
      const t = comEnv({ ORQ_MIGRATIONS_API: '' })
      try {
        await recusa({}, /ORQ_TESTE=1/)
      } finally {
        t()
      }
    })
    it('confirmação errada', async () => {
      expect(ap).not.toBeNull()
      montar()
      await recusa({}, /confirmação/, { perguntar: async () => 'sim' })
      expect(saida.join('\n')).toContain('create table public.t9001 (i int);')
    })
  })

  it('trava por banco: outro processo vivo segura, recusa; trava órfã, assume', async () => {
    expect(ap).not.toBeNull()
    montar()
    const vivo = spawn('sleep', ['30'])
    try {
      writeFileSync(join(migDir(), 'b1.lock'), JSON.stringify({ pid: vivo.pid, hora: '2026-10-20T14:00:00Z' }) + '\n')
      await recusa({}, new RegExp(`trava.*pid ${vivo.pid}`))
    } finally {
      vivo.kill()
    }
    // pid que não existe mais
    const morto = spawnSync('bash', ['-c', 'echo $$']).stdout.toString().trim()
    writeFileSync(join(migDir(), 'b1.lock'), JSON.stringify({ pid: Number(morto), hora: '2026-10-20T14:00:00Z' }) + '\n')
    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
    expect(r.ok).toBe(true)
    expect(existsSync(join(migDir(), 'b1.lock'))).toBe(false)
  })

  it('pre_check: vermelho para antes de aplicar; recebe o .sql extraído; verde segue', async () => {
    expect(ap).not.toBeNull()
    const pre = join(amb.base, 'pre.sh')
    writeFileSync(pre, `#!/bin/bash\ncp "$1" "${amb.base}/pre-viu.sql"\necho "BLOQUEIA contracao quebraria codigo vivo"\nexit "\${PRE_RC:-1}"\n`)
    chmodSync(pre, 0o755)
    montar({ preCheck: [pre, '{arquivo}'] })
    await recusa({}, /pre_check.*rc 1.*BLOQUEIA contracao/s)
    expect(readFileSync(join(amb.base, 'pre-viu.sql'), 'utf8')).toBe(SQL_NOVA)
    const t = comEnv({ PRE_RC: '0' })
    try {
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r.ok).toBe(true)
    } finally {
      t()
    }
  })

  describe('a conferência decide o token', () => {
    it('aplicou mas a linha não está no ledger: não emite token', async () => {
      expect(ap).not.toBeNull()
      montar()
      modo = 'naoGrava'
      const h = head()
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'falha', motivo: expect.stringMatching(/conferência/) }))
      expect(inserts).toHaveLength(1)
      expect(head()).toBe(h)
      expect(lib()).toBe(original())
      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'conferencia_falhou'])
    })
    it('erro do Postgres: não emite token, e o token não vaza do erro', async () => {
      expect(ap).not.toBeNull()
      montar()
      modo = 'erro400'
      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'falha', motivo: expect.stringContaining('already exists') }))
      if (!r.ok) expect(r.motivo).not.toContain(TOKEN.slice(4))
      expect(lib()).toBe(original())
      expect(JSON.stringify(ledger())).not.toContain(TOKEN.slice(4))
      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'falhou'])
    })
    it('incerto sem a linha: não emite token; incerto com a linha: emite', async () => {
      expect(ap).not.toBeNull()
      montar()
      modo = 'timeout'
      const t = comEnv({ ORQ_MIGRATIONS_HTTP_TIMEOUT_S: '0.3' })
      try {
        const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
        expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'incerto' }))
        expect(lib()).toBe(original())
      } finally {
        t()
      }
      modo = 'grava503'
      inserts = []
      const r2 = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
      expect(r2).toEqual(expect.objectContaining({ ok: true, token: 'migration-9001-aplicada' }))
      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'incerto', 'aplicar_inicio', 'aplicada', 'token_emitido'])
    })
  })

  describe('a CLI', () => {
    it('sem TTY de verdade: o orq recusa antes de qualquer rede', () => {
      expect(cli).not.toBeNull()
      montar()
      const r = spawnSync('bash', [join(KIT, 'scripts', 'orq'), 'migrations', 'aplicar', 'cmk', NOVA], { encoding: 'utf8', env: { ...process.env, ...env() }, input: '20261020000100\n' })
      expect(r.status).toBe(1)
      expect(r.stderr).toMatch(/sem TTY/)
      expect(lib()).toBe(original())
    })
    it('uso: verbo desconhecido sai 2 com o uso', () => {
      expect(cli).not.toBeNull()
      const r = spawnSync('bash', [join(KIT, 'scripts', 'orq'), 'migrations', 'voar'], { encoding: 'utf8', env: { ...process.env, ...env() } })
      expect(r.status).toBe(2)
      expect(r.stderr).toMatch(/uso: orq migrations/)
    })
    it('sonda, linha-base (não sobrescreve sem --substituir), plano e status', async () => {
      expect(cli).not.toBeNull()
      montar()
      rmSync(join(migDir(), 'b1.json'))
      rmSync(join(migDir(), 'b1.sonda.json'))
      const out: string[] = []
      const m = { escrever: (t: string) => out.push(t) }
      sondaVerde = false
      expect(await cli!.main(['sonda', 'b1'], m)).toBe(1)
      sondaVerde = true
      expect(await cli!.main(['sonda', 'b1'], m)).toBe(0)
      expect(JSON.parse(readFileSync(join(migDir(), 'b1.sonda.json'), 'utf8'))).toEqual(expect.objectContaining({ banco: 'b1', banco_id: BANCO_ID, mesma_transacao: true }))
      aplicadas.push({ version: '20261010000000', name: 'feita_no_editor', created_by: 'conector-mcp' })
      expect(await cli!.main(['linha-base', 'b1', '--herdados-desde', '20261002'], m)).toBe(0)
      const lb = JSON.parse(readFileSync(join(migDir(), 'b1.json'), 'utf8')) as { corte: string; pendentes_herdados: { arquivo: string }[] }
      expect(lb.corte).toBe('20261010000000')
      expect(lb.pendentes_herdados.map((h) => h.arquivo)).toEqual([HERDADA])
      expect(await cli!.main(['linha-base', 'b1'], m)).toBe(1)
      expect(out.join('\n')).toMatch(/--substituir/)
      aplicadas.push({ version: '20261019000000', name: 'sem_arquivo', created_by: 'conector-mcp' })
      out.length = 0
      expect(await cli!.main(['plano', 'b1'], m)).toBe(0)
      const p = out.join('\n')
      expect(p).toMatch(/Pendentes \(1\)[\s\S]*20261020000100_nova\.sql[\s\S]*migration-9001-aplicada/)
      expect(p).toMatch(/Herdados \(1\)[\s\S]*20261005000000_herdada\.sql[\s\S]*staging-auto/)
      expect(p).toMatch(/Drift \(1\)[\s\S]*20261019000000 sem_arquivo[\s\S]*conector-mcp/)
      out.length = 0
      expect(await cli!.main(['status'], m)).toBe(0)
      expect(out.join('\n')).toMatch(/b1.*corte 20261010000000.*sonda ok.*1 pendente.*1 herdado.*1 drift/s)
      expect(out.join('\n')).not.toContain(TOKEN.slice(4))
    })
  })
})
