/**
 * Etapa MIG-A, peça P2 · o adaptador supabase e o preparo do SQL.
 *
 * Pronto quando (tudo contra um stub HTTP em 127.0.0.1, nunca o banco):
 *   - sucesso: um POST em /database/query com os timeouts, o corpo e o insert
 *     no schema_migrations (versão e nome DO ARQUIVO, created_by do aplicador);
 *   - erro do Postgres (4xx) é erro certo; 5xx, timeout e resposta ilegível são
 *     estado INCERTO;
 *   - recusa begin/commit no meio, CONCURRENTLY e VACUUM; aceita e tira o
 *     envelope begin;...commit; (77 de 77 migrations recentes do Comarka o têm);
 *   - o token nunca aparece em log, erro ou mensagem;
 *   - com ORQ_TESTE=1 só fala com 127.0.0.1, e sem ele só com a API oficial.
 */
import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import type { AddressInfo } from 'node:net'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
import { comEnv } from './resolvedor-repo.js'

const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'migrations')
// montados em tempo de execução: nenhum literal no fonte casa com o padrão de token real
const TOKEN = 'sbp' + '_' + '0123456789abcdef0123456789abcdef01234567'
const OUTRO_TOKEN = 'sbp' + '_' + 'f'.repeat(20)

type Prep = { ok: true; corpo: string; statements: string[]; envelope: boolean } | { ok: false; motivo: string }
type Res = { ok: true } | { ok: false; incerto: boolean; mensagem: string }
type Adaptador = {
  listarAplicadas: () => Promise<{ version: string; name: string | null; created_by: string | null }[]>
  aplicar: (m: { corpo: string; statements: string[]; versao: string; nome: string; criadoPor: string }) => Promise<Res>
  sonda: () => Promise<boolean>
  mascarar: (s: string) => string
}
type SqlMod = { prepararSql: (s: string) => Prep; avisosDeClasse: (s: string) => string[]; literal: (s: string) => string }
type SupaMod = {
  criarAdaptador: (o: { bancoId: string; token: string; timeouts: { lockS: number; statementS: number; httpS: number } }) => Adaptador
  baseDaApi: () => string
  lerCredencial: (raiz: string, envArquivo: string, nome: string) => string
  mascarar: (s: string, segredos: string[]) => string
}

/** o stub: guarda cada pedido e responde o que o teste mandar */
type Pedido = { metodo: string; url: string; auth: string; corpo: Record<string, unknown> }
let responder: (p: Pedido, res: ServerResponse) => void = (_p, res) => res.end('[]')
const pedidos: Pedido[] = []
let srv: Server
let base = ''

const json = (res: ServerResponse, status: number, v: unknown) => {
  res.writeHead(status, { 'content-type': 'application/json' })
  res.end(JSON.stringify(v))
}

const TIMEOUTS = { lockS: 5, statementS: 60, httpS: 5 }

/** O SQL do 1377 (ticket real de 18/10), no formato que o Comarka entrega. */
const SQL_1377 = `-- APLICAR E HUMANO (skill aplicar-migration-ddl); libera humano:migration-1377-aplicada
-- fase: contracao
begin;

do $$
begin
  if exists (select 1 from public.rag_chunks) then
    raise exception 'rag_chunks tem linha; commit; nao troca o tipo';
  end if;
end
$$;

drop index if exists public.idx_rag_chunks_embedding;
alter table public.rag_chunks alter column embedding type extensions.vector(1024);
create index idx_rag_chunks_embedding on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);

commit;
-- REVERSAO EXATA: ...
`

describe('P2: adaptador supabase', () => {
  let sql: SqlMod | null = null
  let supa: SupaMod | null = null
  let tira: () => void = () => {}

  beforeAll(async () => {
    srv = createServer((req: IncomingMessage, res: ServerResponse) => {
      let b = ''
      req.on('data', (c) => (b += c))
      req.on('end', () => {
        const p = { metodo: req.method ?? '', url: req.url ?? '', auth: String(req.headers.authorization ?? ''), corpo: b ? (JSON.parse(b) as Record<string, unknown>) : {} }
        pedidos.push(p)
        responder(p, res)
      })
    })
    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
    base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
    tira = comEnv({ ORQ_TESTE: '1', ORQ_MIGRATIONS_API: base })
    try {
      sql = (await import(pathToFileURL(join(DIR, 'sql.ts')).href)) as SqlMod
      supa = (await import(pathToFileURL(join(DIR, 'supabase.ts')).href)) as SupaMod
    } catch {
      sql = supa = null
    }
  })
  afterAll(async () => {
    tira()
    srv.closeAllConnections()
    await new Promise((r) => srv.close(r))
  })
  afterEach(() => {
    pedidos.length = 0
    responder = (_p, res) => res.end('[]')
  })

  const adaptador = (httpS = 5) => supa!.criarAdaptador({ bancoId: 'ogfnojbbvumujzfklkhh', token: TOKEN, timeouts: { ...TIMEOUTS, httpS } })
  const migracao = () => {
    const p = sql!.prepararSql(SQL_1377)
    if (!p.ok) throw new Error(p.motivo)
    return { corpo: p.corpo, statements: p.statements, versao: '20261018030500', nome: 'rag_chunks_vector_1024', criadoPor: 'orq-aplicador:lucas' }
  }

  describe('o SQL', () => {
    it('aceita o envelope begin;...commit; e o tira, sem mexer no resto (nem no commit; dentro de literal)', () => {
      expect(sql).not.toBeNull()
      const p = sql!.prepararSql(SQL_1377)
      expect(p.ok).toBe(true)
      if (!p.ok) return
      expect(p.envelope).toBe(true)
      const ini = SQL_1377.indexOf('begin;') + 'begin;'.length
      const fim = SQL_1377.lastIndexOf('commit;')
      expect(p.corpo).toBe(SQL_1377.slice(ini, fim))
      expect(p.statements).toHaveLength(4)
      expect(p.statements[0]).toMatch(/^do \$\$/)
      expect(p.statements[3]).toMatch(/^create index idx_rag_chunks_embedding/)
      // sem envelope também vale, e o corpo é o arquivo inteiro
      const sem = sql!.prepararSql('create table public.x (id int);\n')
      expect(sem).toEqual({ ok: true, corpo: 'create table public.x (id int);\n', statements: ['create table public.x (id int);'], envelope: false })
    })

    it('recusa begin/commit no meio, envelope pela metade, CONCURRENTLY, VACUUM e ALTER SYSTEM', () => {
      expect(sql).not.toBeNull()
      const recusa = (s: string, re: RegExp) => {
        const p = sql!.prepararSql(s)
        expect(p.ok, s).toBe(false)
        if (!p.ok) expect(p.motivo).toMatch(re)
      }
      recusa('begin;\ncreate table a(i int);\ncommit;\nbegin;\ncreate table b(i int);\ncommit;\n', /transação no meio.*use a skill/s)
      recusa('create table a(i int);\nsavepoint s1;\n', /transação no meio/)
      recusa('begin;\ncreate table a(i int);\n', /envelope/)
      recusa('create table a(i int);\ncommit;\n', /envelope/)
      recusa('create index concurrently ix on t (c);\n', /CONCURRENTLY.*use a skill/s)
      recusa('begin;\nvacuum analyze t;\ncommit;\n', /VACUUM/)
      recusa('alter system set work_mem = 1;\n', /ALTER SYSTEM/)
      recusa("create table a(i int);\nselect 'sem fim;\n", /sem fim/)
      recusa('-- só comentário\n', /vazio/)
    })

    it('aviso de classe: as palavras fora de comentário e de literal', () => {
      expect(sql).not.toBeNull()
      expect(sql!.avisosDeClasse(SQL_1377)).toEqual(['DROP', 'ALTER COLUMN'])
      const s = "-- drop table x\ncreate function f() returns int language sql security definer as $$ select 1 $$;\ngrant select on t to anon;\nalter table t alter column c set not null;\ncreate policy p on t using (true);\ndelete from t; truncate t; alter table t rename to u; revoke all on t from anon;\nselect 'drop';\n"
      expect(sql!.avisosDeClasse(s)).toEqual(['DROP', 'TRUNCATE', 'DELETE', 'RENAME', 'GRANT', 'REVOKE', 'POLICY', 'SECURITY DEFINER', 'ALTER COLUMN', 'SET NOT NULL'].filter((x) => x !== 'DROP'))
    })

    it('literal em dollar-quote com etiqueta que não aparece no texto', () => {
      expect(sql).not.toBeNull()
      const l = sql!.literal("a $orq$ b ' c")
      const tag = l.slice(0, l.indexOf('$', 1) + 1)
      expect(l).toBe(`${tag}a $orq$ b ' c${tag}`)
      expect("a $orq$ b ' c").not.toContain(tag)
    })
  })

  describe('a API', () => {
    it('sucesso: um POST em /database/query com timeouts, corpo e o insert com a versão e o nome do arquivo', async () => {
      expect(supa).not.toBeNull()
      const r = await adaptador().aplicar(migracao())
      expect(r).toEqual({ ok: true })
      expect(pedidos).toHaveLength(1)
      const p = pedidos[0]!
      expect(p.metodo).toBe('POST')
      expect(p.url).toBe('/v1/projects/ogfnojbbvumujzfklkhh/database/query')
      expect(p.auth).toBe(`Bearer ${TOKEN}`)
      const q = String(p.corpo.query)
      expect(p.corpo.read_only).toBeUndefined()
      expect(q).not.toMatch(/^\s*begin\s*;/im)
      expect(q).not.toMatch(/^\s*commit\s*;/im)
      expect(q.indexOf("set_config('lock_timeout', '5s', true)")).toBeGreaterThanOrEqual(0)
      expect(q).toContain("set_config('statement_timeout', '60s', true)")
      expect(q).toContain(migracao().corpo)
      expect(q).toMatch(/insert into supabase_migrations\.schema_migrations\(version, name, statements, created_by\) values \(\$(orq\w*)\$20261018030500\$\1\$, \$\w+\$rag_chunks_vector_1024\$\w+\$, array\[/)
      expect(q).toMatch(/orq-aplicador:lucas\$\w+\$\);\s*$/)
      // o timeout de lock vem antes do corpo, o insert depois
      expect(q.indexOf('lock_timeout')).toBeLessThan(q.indexOf('drop index'))
      expect(q.indexOf('insert into supabase_migrations')).toBeGreaterThan(q.indexOf('create index'))
    })

    it('erro do Postgres (400) é erro certo, com a mensagem', async () => {
      expect(supa).not.toBeNull()
      responder = (_p, res) => json(res, 400, { message: 'Failed to run sql query: ERROR:  42P01: relation "public.rag_chunks" does not exist' })
      const r = await adaptador().aplicar(migracao())
      expect(r).toEqual({ ok: false, incerto: false, mensagem: expect.stringContaining('relation "public.rag_chunks" does not exist') })
    })

    it('5xx, timeout e resposta ilegível são estado incerto', async () => {
      expect(supa).not.toBeNull()
      responder = (_p, res) => json(res, 503, { message: 'upstream' })
      expect(await adaptador().aplicar(migracao())).toEqual({ ok: false, incerto: true, mensagem: expect.stringContaining('503') })
      responder = (_p, res) => {
        res.writeHead(200)
        res.end('<html>nao e json</html>')
      }
      expect(await adaptador().aplicar(migracao())).toEqual({ ok: false, incerto: true, mensagem: expect.stringMatching(/ilegível/) })
      responder = () => {
        /* nunca responde */
      }
      const ini = Date.now()
      const r = await adaptador(0.3).aplicar(migracao())
      expect(r).toEqual({ ok: false, incerto: true, mensagem: expect.stringMatching(/tempo/) })
      expect(Date.now() - ini).toBeLessThan(3000)
    })

    it('listar e sonda: só leitura, com created_by', async () => {
      expect(supa).not.toBeNull()
      responder = (p, res) =>
        String(p.corpo.query).includes('mesma_transacao')
          ? json(res, 201, [{ mesma_transacao: true }])
          : json(res, 201, [{ version: '20261018030500', name: 'rag_chunks_vector_1024', created_by: 'orq-aplicador:lucas' }])
      const a = adaptador()
      expect(await a.listarAplicadas()).toEqual([{ version: '20261018030500', name: 'rag_chunks_vector_1024', created_by: 'orq-aplicador:lucas' }])
      expect(pedidos[0]!.corpo.read_only).toBe(true)
      expect(String(pedidos[0]!.corpo.query)).toMatch(/select version, name, created_by from supabase_migrations\.schema_migrations/)
      expect(await a.sonda()).toBe(true)
      expect(pedidos[1]!.corpo.read_only).toBe(true)
      expect(String(pedidos[1]!.corpo.query)).toMatch(/txid_current\(\).*;\s*select .*txid_current\(\) as mesma_transacao/s)
      responder = (_p, res) => json(res, 201, [{ mesma_transacao: false }])
      expect(await a.sonda()).toBe(false)
    })

    it('o token nunca aparece: nem no erro que o servidor ecoa, nem no erro de listar, nem na falta de credencial', async () => {
      expect(supa).not.toBeNull()
      responder = (p, res) => json(res, 401, { message: `token invalido: ${p.auth} (${TOKEN.slice(4)})` })
      const r = await adaptador().aplicar(migracao())
      expect(r.ok).toBe(false)
      if (!r.ok) {
        expect(r.mensagem).not.toContain(TOKEN)
        expect(r.mensagem).not.toContain(TOKEN.slice(4))
        expect(r.mensagem).toContain('***')
      }
      const e = await adaptador().listarAplicadas().then(() => null, (x: Error) => x.message)
      expect(e).toBeTruthy()
      expect(e).not.toContain(TOKEN.slice(4))
      expect(supa!.mascarar(`a ${TOKEN} b ${OUTRO_TOKEN}`, [TOKEN])).toBe('a *** b ***')
      // a credencial é lida do arquivo do repo, pelo nome; a falta não mostra valor nenhum
      const raiz = mkdtempSync(join(tmpdir(), 'mig-cred-'))
      writeFileSync(join(raiz, '.env.local'), `OUTRA=segredo-que-nao-pode-vazar\nexport SUPABASE_ACCESS_TOKEN="${TOKEN}"\n`)
      expect(supa!.lerCredencial(raiz, '.env.local', 'SUPABASE_ACCESS_TOKEN')).toBe(TOKEN)
      let msg = ''
      try {
        supa!.lerCredencial(raiz, '.env.local', 'NAO_TEM')
      } catch (x) {
        msg = (x as Error).message
      }
      expect(msg).toMatch(/NAO_TEM.*\.env\.local/)
      expect(msg).not.toContain('segredo')
      expect(msg).not.toContain(TOKEN)
    })

    it('ORQ_TESTE=1 só fala com 127.0.0.1; sem ele, só com a API oficial', () => {
      expect(supa).not.toBeNull()
      expect(supa!.baseDaApi()).toBe(base)
      const t1 = comEnv({ ORQ_TESTE: '1', ORQ_MIGRATIONS_API: '' })
      try {
        expect(() => supa!.baseDaApi()).toThrow(/ORQ_TESTE=1/)
      } finally {
        t1()
      }
      const t2 = comEnv({ ORQ_TESTE: '', ORQ_MIGRATIONS_API: base })
      try {
        expect(() => supa!.baseDaApi()).toThrow(/api\.supabase\.com/)
      } finally {
        t2()
      }
      const t3 = comEnv({ ORQ_TESTE: '', ORQ_MIGRATIONS_API: '' })
      try {
        expect(supa!.baseDaApi()).toBe('https://api.supabase.com')
      } finally {
        t3()
      }
    })
  })
})
