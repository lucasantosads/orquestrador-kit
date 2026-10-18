/**
 * sql.ts — o .sql antes de ir para o banco (etapa MIG-A, P2). Puro, sem rede.
 *
 * O aplicador roda o arquivo numa transação IMPLÍCITA: o texto inteiro vai num
 * POST /database/query, e o Postgres roda as instruções de uma mensagem só como
 * uma transação (C2, medido pelo chat em 18/10 com a sonda: txid igual). Por
 * isso o arquivo não pode ter controle de transação próprio, com uma exceção:
 * o ENVELOPE `begin;` como primeira instrução e `commit;` como última, que 77
 * de 77 migrations recentes do Comarka trazem, é tirado (o resto do texto vai
 * byte a byte). Fora isso, recusa: begin/commit/rollback/savepoint no meio,
 * CONCURRENTLY, VACUUM e ALTER SYSTEM, que não rodam numa transação.
 *
 * As instruções saem de um leitor que conhece comentário (`--`, `/* *\/`
 * aninhado), literal ('...', E'...', "..."), e dollar-quote ($$...$$,
 * $tag$...$tag$): `;` ou `commit` dentro de corpo de função não conta.
 */
import { randomBytes } from 'node:crypto'

export interface Instrucao {
  ini: number
  fim: number
  /** o primeiro caractere de código (depois de espaço e comentário) */
  codigoIni: number
  /** o texto sem comentário e sem literal, minúsculo e com espaço único */
  codigo: string
}

export class SqlIlegivel extends Error {}

const IDENT = /[A-Za-z0-9_$]/

/** Cada instrução de nível de topo do texto, com o código mascarado. */
export function instrucoes(sql: string): Instrucao[] {
  const mask: string[] = []
  const out: Instrucao[] = []
  let ini = 0
  let i = 0
  const n = sql.length
  const branco = (a: number, b: number) => {
    for (let k = a; k < b; k++) mask[k] = sql[k] === '\n' ? '\n' : ' '
  }
  const fecha = (fim: number) => {
    const cru = mask.slice(ini, fim).join('')
    const codigo = cru.replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase()
    if (codigo) out.push({ ini, fim, codigoIni: ini + cru.search(/\S/), codigo })
    ini = fim
  }
  while (i < n) {
    const c = sql[i]!
    const d = sql[i + 1]
    if (c === '-' && d === '-') {
      const f = sql.indexOf('\n', i)
      const fim = f < 0 ? n : f
      branco(i, fim)
      i = fim
    } else if (c === '/' && d === '*') {
      let prof = 1
      let k = i + 2
      while (k < n && prof > 0) {
        if (sql[k] === '/' && sql[k + 1] === '*') (prof++, (k += 2))
        else if (sql[k] === '*' && sql[k + 1] === '/') (prof--, (k += 2))
        else k++
      }
      if (prof > 0) throw new SqlIlegivel('comentário /* sem fim')
      branco(i, k)
      i = k
    } else if (c === "'" || c === '"') {
      const esc = c === "'" && /[eE]/.test(sql[i - 1] ?? '') && !IDENT.test(sql[i - 2] ?? '')
      let k = i + 1
      for (;;) {
        if (k >= n) throw new SqlIlegivel(`literal ${c} sem fim`)
        if (esc && sql[k] === '\\') k += 2
        else if (sql[k] === c && sql[k + 1] === c) k += 2
        else if (sql[k] === c) break
        else k++
      }
      mask[i] = c
      branco(i + 1, k)
      mask[k] = c
      i = k + 1
    } else if (c === '$' && !IDENT.test(sql[i - 1] ?? '') && /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.test(sql.slice(i, i + 64))) {
      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64))![0]
      const f = sql.indexOf(tag, i + tag.length)
      if (f < 0) throw new SqlIlegivel(`dollar-quote ${tag} sem fim`)
      branco(i, f + tag.length)
      i = f + tag.length
    } else {
      mask[i] = c
      i++
      if (c === ';') fecha(i)
    }
  }
  fecha(n)
  return out
}

const ABRE = /^(begin( work| transaction)?|start transaction)$/
const FECHA = /^(commit|end)( work| transaction)?$/
const TRANSACAO = /^(begin|start transaction|commit|end|rollback|abort|savepoint|release|prepare transaction)\b/
const SKILL = 'aplique por fora do aplicador (no Comarka, a skill aplicar-migration-ddl): use a skill'

export type Preparo = { ok: true; corpo: string; statements: string[]; envelope: boolean } | { ok: false; motivo: string }

/** O corpo que vai para o banco, ou o porquê da recusa. */
export function prepararSql(sql: string): Preparo {
  let ins: Instrucao[]
  try {
    ins = instrucoes(sql)
  } catch (e) {
    return { ok: false, motivo: `SQL ilegível: ${(e as Error).message}` }
  }
  if (ins.length === 0) return { ok: false, motivo: 'SQL vazio: nenhuma instrução fora de comentário' }
  const abre = ABRE.test(ins[0]!.codigo)
  const fecha = ins.length > 1 && FECHA.test(ins[ins.length - 1]!.codigo)
  if (abre !== fecha) return { ok: false, motivo: `envelope pela metade: ${abre ? 'begin; sem o commit; no fim' : 'commit; sem o begin; no começo'}` }
  const corpo = abre ? ins.slice(1, -1) : ins
  for (const x of corpo) {
    const curto = x.codigo.slice(0, 80)
    if (TRANSACAO.test(x.codigo)) return { ok: false, motivo: `instrução de transação no meio do arquivo ('${curto}'): o aplicador roda o arquivo numa transação só; ${SKILL}` }
    if (/\bconcurrently\b/.test(x.codigo)) return { ok: false, motivo: `CONCURRENTLY não roda numa transação ('${curto}'); ${SKILL}` }
    if (/\bvacuum\b/.test(x.codigo)) return { ok: false, motivo: `VACUUM não roda numa transação ('${curto}'); ${SKILL}` }
    if (/^alter system\b/.test(x.codigo)) return { ok: false, motivo: `ALTER SYSTEM não roda numa transação ('${curto}'); ${SKILL}` }
  }
  if (corpo.length === 0) return { ok: false, motivo: 'SQL vazio: só o envelope begin;/commit;' }
  return {
    ok: true,
    corpo: abre ? sql.slice(ins[0]!.fim, ins[ins.length - 1]!.codigoIni) : sql,
    statements: corpo.map((x) => sql.slice(x.ini, x.fim).trim()),
    envelope: abre,
  }
}

/** As classes de risco do aviso (só aviso nesta etapa), na ordem fixa. */
const CLASSES: [string, RegExp][] = [
  ['DROP', /\bdrop\b/],
  ['TRUNCATE', /\btruncate\b/],
  ['DELETE', /\bdelete from\b/],
  ['RENAME', /\brename\b/],
  ['GRANT', /\bgrant\b/],
  ['REVOKE', /\brevoke\b/],
  ['POLICY', /\bpolicy\b/],
  ['SECURITY DEFINER', /\bsecurity definer\b/],
  ['ALTER COLUMN', /\balter column\b/],
  ['SET NOT NULL', /\bset not null\b/],
]

export function avisosDeClasse(sql: string): string[] {
  let codigo = ''
  try {
    codigo = instrucoes(sql).map((x) => x.codigo).join(' ; ')
  } catch {
    codigo = sql.toLowerCase().replace(/\s+/g, ' ')
  }
  return CLASSES.filter(([, re]) => re.test(codigo)).map(([nome]) => nome)
}

/** `s` como literal em dollar-quote, com uma etiqueta que não aparece nele. */
export function literal(s: string): string {
  for (;;) {
    const tag = `$orq${randomBytes(4).toString('hex')}$`
    if (!s.includes(tag)) return `${tag}${s}${tag}`
  }
}

export interface Migracao {
  corpo: string
  statements: string[]
  versao: string
  nome: string
  criadoPor: string
}

/** O texto único do POST: timeouts, o corpo e o insert do ledger, na mesma transação. */
export function montarQuery(m: Migracao, t: { lockS: number; statementS: number }): string {
  return [
    `select set_config('lock_timeout', '${t.lockS}s', true);`,
    `select set_config('statement_timeout', '${t.statementS}s', true);`,
    m.corpo,
    ';',
    `insert into supabase_migrations.schema_migrations(version, name, statements, created_by) values (${literal(m.versao)}, ${literal(m.nome)}, array[${m.statements.map(literal).join(', ')}]::text[], ${literal(m.criadoPor)});`,
  ].join('\n')
}

export const QUERY_LISTAR = 'select version, name, created_by from supabase_migrations.schema_migrations order by version'

/** Duas instruções no mesmo texto: na mesma transação, o txid é o mesmo (C2). */
export const QUERY_SONDA = "select set_config('orq.sonda', txid_current()::text, true);\nselect current_setting('orq.sonda')::bigint = txid_current() as mesma_transacao"
