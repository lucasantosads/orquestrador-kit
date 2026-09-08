/**
 * enforcement-core.ts — barreira do Orquestrador Autônomo. Lógica PURA, auditada
 * por vitest; enforcement.sh a chama em modo CLI com o payload por stdin.
 *
 * ORQ-03: a lógica de zona proibida é REESCRITA, não adaptada. O comarka-os
 * modela o banco como allowlist (listas C0/ghl/dashboard + exceções os_owned);
 * aqui `no_write_tables` é "TODAS" — negação total, sem lista de exceção. Tudo
 * o que a barreira audita vem do 000-config.json; nada de nome de tabela, glob
 * ou caminho hardcoded neste arquivo.
 *
 * As 5 regras: 1) pathspec_allowlist  2) no_write_paths  3) escrita em banco
 * 4) politica_schema (escrever .sql pode; aplicar não)  5) credenciais.
 *
 * ORQ-12 — CAMINHO ANTES DE CONTEÚDO. O detector classifica o ARQUIVO primeiro
 * (`classificaArquivo`) e só então decide se olha o conteúdo. Não existe regra
 * de SQL que rode sem essa classificação antes: é ela que separa o que EXECUTA
 * do que é só DADO. Sem isso a barreira reprovava um artefato por DIZER, num
 * comentário `--`, que não deve ser aplicado automaticamente — qualquer arquivo
 * que documentasse a própria regra virava violação. A correção não é mais
 * regex; é a ordem das perguntas.
 */
import { readFileSync } from 'node:fs'

/**
 * A faixa de numeração das migrations, nas DUAS formas vivas: `[min, max]` (a
 * forma do kit) e `"0250-0299"` (a forma que o Actus tem no disco, em
 * `migrations_faixa_loop`). Aceitar as duas é o que permite que a migração de
 * config seja uma CÓPIA de valor, e não uma transformação — a regra 1 de
 * `config-tabela.ts`.
 */
export type Faixa = string | [number, number]

/**
 * Regra B (K11a-1), vinda do actus-saas. DESLIGADA quando `migrations` não
 * existe no config: é por isso que o `dir` mora aqui dentro e NÃO cai no
 * `migrations_dir` de topo — `migrations_dir` é obrigatório em todo repo, e
 * usá-lo como fallback ligaria a regra em quem nunca a pediu.
 */
export interface MigrationsRegra {
  dir?: string
  faixa?: Faixa
  faixas_reservadas?: Faixa[]
}

export interface EnforceConfig {
  migrations_dir: string
  /** Segundo diretório de artefato .sql (ORQ-08). Opcional: config antiga sem o campo continua válida. */
  sql_pendente_dir?: string
  politica_schema: { comportamento_vigente: string }
  /** Regra B. Ausente = desligada (o CI e o fixture não têm a chave). */
  migrations?: MigrationsRegra | undefined
  zona_proibida: {
    no_write_paths: string[]
    /** `"TODAS"` = negação total (CI); LISTA de tabelas = regra C nomeada (Actus). */
    no_write_tables: string | string[]
    no_write_credenciais?: { padroes?: string[] }
    /** Regra C, lado permissivo: escrita fora destes schemas reprova. Ausente = sem restrição. */
    schemas_permitidos?: string[] | undefined
    /** Regra C: tabelas liberadas mesmo fora de `schemas_permitidos`. */
    tabelas_permitidas?: string[] | undefined
    /** Regra D: colunas que o loop nunca escreve (`no_write_columns` no Actus). */
    colunas_congeladas?: string[] | undefined
    /** Regra D: as sombras declaradas (glob), que passam mesmo casando uma congelada. */
    colunas_sombra?: string[] | undefined
    /** Regra E: prefixos de OBJETO que o loop nunca cria, altera nem apaga (`no_write_prefixes` no Actus). */
    prefixos_sem_ddl?: string[] | undefined
  }
}

export interface EnforceInput {
  changedFiles: string[]
  allowlist: string[]
  diff: string
  config: EnforceConfig
}

export type TipoViolacao =
  | 'fora_do_pathspec'
  | 'zona_proibida'
  | 'escrita_em_banco'
  | 'aplica_migration'
  | 'credencial'
  // --- K11a-1: as regras B/C/D do Actus. Cada uma NOMEIA a regra que violou,
  // porque "escrita_em_banco" para seis causas diferentes manda quem lê o
  // enforcement.json abrir o diff para descobrir qual delas foi.
  | 'migration_fora_do_dir'
  | 'migration_sem_numero'
  | 'migration_fora_da_faixa'
  | 'migration_faixa_reservada'
  | 'tabela_congelada'
  | 'tabela_nao_permitida'
  | 'coluna_congelada'
  // --- K11a-4: a regra E do Actus. Tipo PRÓPRIO, e não `zona_proibida`: o que
  // ela acusa é DDL de um objeto pelo NOME dele, e quem lê o enforcement.json
  // precisa saber que a causa foi o prefixo — não um caminho de arquivo.
  | 'prefixo_sem_ddl'

export interface Violation {
  tipo: TipoViolacao
  detalhe: string
}
export interface EnforceResult {
  ok: boolean
  violations: Violation[]
}

/** Converte um glob (`*`, `**`, `?`) num RegExp ancorado. */
export function globToRegExp(glob: string): RegExp {
  let re = '^'
  for (let i = 0; i < glob.length; i++) {
    // i < glob.length, então o índice existe (noUncheckedIndexedAccess deste repo
    // não vale no tsconfig do comarka-os, de onde o glob veio).
    const c = glob[i]!
    if (c === '*') {
      if (glob[i + 1] === '*') {
        i++
        if (glob[i + 1] === '/') {
          i++
          re += '(?:.*/)?' // **/ => zero ou mais segmentos de diretório
        } else {
          re += '.*'
        }
      } else {
        re += '[^/]*'
      }
    } else if (c === '?') {
      re += '[^/]'
    } else if ('.+^${}()|[]\\/'.includes(c)) {
      re += '\\' + c
    } else {
      re += c
    }
  }
  return new RegExp(re + '$')
}

export function matchesAllowlist(file: string, allowlist: string[]): boolean {
  return allowlist.some((g) => globToRegExp(g).test(file))
}

/**
 * Linhas adicionadas COM o arquivo de destino, dos cabeçalhos '+++ b/<path>'.
 * Saber o arquivo importa: prosa que MENCIONA um comando proibido é
 * documentação, não execução. No comarka-os dois tickets foram re-bloqueados a
 * cada disparo por esse falso positivo, barrando 812 linhas corretas.
 */
export function addedLines(diff: string): { arquivo: string; linha: string }[] {
  const out: { arquivo: string; linha: string }[] = []
  let atual = ''
  for (const l of diff.split('\n')) {
    if (l.startsWith('+++ ')) {
      atual = l.slice(4).replace(/^b\//, '').trim()
      continue
    }
    if (l.startsWith('+') && !l.startsWith('+++')) out.push({ arquivo: atual, linha: l.slice(1) })
  }
  return out
}

/** Prosa: o agente não executa nada a partir de um .md. */
export function ehProsa(arquivo: string): boolean {
  return /\.(md|markdown|txt)$/i.test(arquivo)
}

/** Arquivo de migration legítimo: .sql sob o migrations_dir do config. */
export function ehArquivoDeMigration(arquivo: string, migrationsDir: string): boolean {
  return ehArtefatoSql(arquivo, [migrationsDir])
}

/**
 * Os diretórios de ARTEFATO .sql, lidos do config — nunca hardcoded aqui. Hoje
 * `migrations_dir` e `sql_pendente_dir`; um terceiro entra acrescentando campo no
 * 000-config.json, não editando este arquivo.
 */
export function dirsDeArtefatoSql(config: EnforceConfig): string[] {
  return [config.migrations_dir, config.sql_pendente_dir].filter((d): d is string => !!d)
}

/**
 * Arquivo de ARTEFATO .sql: `.sql` sob qualquer um dos diretórios de artefato.
 *
 * ORQ-11: `docs/sql-pendente/` nasceu no ORQ-08 e ficou de fora desta regra,
 * que só conhecia `supabase/migrations/`. O ticket 002 foi reprovado por
 * `escrita_em_banco` citando o DELETE de dentro do próprio .sql que ele tinha
 * sido mandado produzir — falso positivo da barreira, não do trabalho. Um .sql
 * é DADO INERTE, do mesmo jeito que a prosa: não executa nada. Quem executa é o
 * script — e esse continua reprovando por APLICA_MIGRATION.
 */
export function ehArtefatoSql(arquivo: string, dirs: string[]): boolean {
  if (!/\.sql$/i.test(arquivo)) return false
  return dirs.some((d) => {
    const dir = String(d ?? '').replace(/\/+$/, '')
    return !!dir && arquivo.startsWith(dir + '/')
  })
}

/**
 * O que este arquivo É, decidido SÓ pelo caminho — antes de qualquer regex de
 * conteúdo. Três classes, e a classe manda no que pode ser auditado:
 *
 *  - `artefato_sql`  .sql sob um diretório de artefato do config. DADO INERTE.
 *                    O conteúdo NÃO é auditado por SQL nenhum: nem DDL, nem
 *                    DML, nem comentário. O que a barreira audita aqui é o
 *                    CAMINHO (regras 1 e 2), mais nada.
 *  - `prosa`         .md/.txt. Documentação não executa.
 *  - `executavel`    todo o resto (.ts/.sh/.js/.json/.sql fora dos dirs de
 *                    artefato). É a ÚNICA classe com o conteúdo auditado por
 *                    aplica_migration e escrita_em_banco.
 *
 * A classificação é deliberadamente independente de `politica_schema`: um .sql
 * sob o diretório de artefato é artefato pelo LUGAR onde está, não pela política
 * vigente no momento. Amarrar a classe à política era o que fazia o DELETE de
 * dentro do próprio artefato ser lido como escrita em banco.
 */
export type ClasseDeArquivo = 'artefato_sql' | 'prosa' | 'executavel'

export function classificaArquivo(arquivo: string, config: EnforceConfig): ClasseDeArquivo {
  if (ehArtefatoSql(arquivo, dirsDeArtefatoSql(config))) return 'artefato_sql'
  if (ehProsa(arquivo)) return 'prosa'
  return 'executavel'
}

/** APLICAR migration/DDL: comando executado, em qualquer via. */
const APLICA_MIGRATION =
  /(supabase\s+(db\s+(push|reset|execute)|migration\s+up)|\bpsql\b|\bapply_migration\b|\bexecute_sql\b|\bdb\.push\b|prisma\s+migrate\s+(deploy|dev)|mcp__[a-z0-9_]*supabase[a-z0-9_]*__(apply_migration|execute_sql))/i

/** Escrita em tabela via cliente: .from('x') seguido de mutação. */
const FROM_TABELA = /\.from\(\s*['"`]([A-Za-z0-9_.]+)['"`]\s*\)/g
const MUTACAO = /\.(insert|update|delete|upsert)\s*\(/

/** DML cru em arquivo que NÃO é migration (script/seed executando SQL). */
const DML_CRU = /\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|TRUNCATE\s+TABLE)\b/i

/** Credenciais: formatos reais de chave + atribuição de segredo com valor denso. */
const CREDENCIAL_FORMATOS = [
  /\bsk-[A-Za-z0-9_-]{20,}/,
  /\bsk-ant-[A-Za-z0-9_-]{20,}/,
  /\b(ghp|gho|ghs|ghu)_[A-Za-z0-9]{30,}/,
  /\bgithub_pat_[A-Za-z0-9_]{30,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/, // JWT
]
const CREDENCIAL_ATRIBUICAO =
  /\b(api[_-]?key|secret|token|password|passwd|service[_-]?role|access[_-]?key)\b\s*[:=]\s*['"`]([^'"`]{16,})['"`]/i
/** Valores obviamente falsos não são vazamento. */
const PLACEHOLDER = /^(<.*>|\$\{.*\}|x{3,}|\*{3,}|\.{3,}|(your|my|example|dummy|fake|placeholder|changeme|redacted|test|sample|mock)[-_a-z0-9]*)$/i

export function pareceCredencial(linha: string): boolean {
  if (CREDENCIAL_FORMATOS.some((re) => re.test(linha))) return true
  const m = CREDENCIAL_ATRIBUICAO.exec(linha)
  if (!m) return false
  const valor = (m[2] ?? '').trim()
  if (PLACEHOLDER.test(valor)) return false
  return /[A-Za-z]/.test(valor) && /[0-9]/.test(valor)
}

// ─── K11a-1 · regra B: migrations por faixa ─────────────────────────────────

/**
 * `[min, max]` a partir de `"0250-0299"` ou da própria tupla. Porte do
 * `parseFaixa` do actus-saas (`enforcement.mjs:111`), com a forma numérica
 * acrescentada. LANÇA em faixa ilegível: uma faixa que não parseia vira, em
 * silêncio, "nenhuma restrição" — e é justamente a restrição que se pediu.
 */
export function parseFaixa(faixa: Faixa): [number, number] {
  if (Array.isArray(faixa)) {
    const [a, b] = faixa
    if (typeof a !== 'number' || typeof b !== 'number' || !Number.isFinite(a) || !Number.isFinite(b)) {
      throw new Error(`faixa de migration inválida: ${JSON.stringify(faixa)}`)
    }
    return [a, b]
  }
  const m = /^0*(\d+)\s*-\s*0*(\d+)$/.exec(String(faixa))
  if (!m) throw new Error(`faixa de migration inválida: ${faixa}`)
  return [Number(m[1]), Number(m[2])]
}

/** Regra B, arquivo a arquivo. Vazio quando `migrations.dir` não está no config. */
export function violacoesDeMigration(arquivos: string[], config: EnforceConfig): Violation[] {
  const regra = config.migrations
  const dir = String(regra?.dir ?? '').replace(/\/+$/, '')
  if (!dir) return []
  const v: Violation[] = []
  // Os OUTROS diretórios de artefato (hoje `sql_pendente_dir`) continuam sendo
  // lugar legítimo de .sql — e .sql que não é migration não tem numeração a
  // cobrar. Cobrar faixa deles reprovaria o artefato que o ticket pediu.
  const outrosDirs = dirsDeArtefatoSql(config).filter((d) => d.replace(/\/+$/, '') !== dir)
  const faixa = regra?.faixa ? parseFaixa(regra.faixa) : null
  const reservadas = (regra?.faixas_reservadas ?? []).map(parseFaixa)

  for (const arq of arquivos) {
    if (!arq || !/\.sql$/i.test(arq)) continue
    if (ehArtefatoSql(arq, outrosDirs)) continue
    if (!arq.startsWith(dir + '/')) {
      v.push({ tipo: 'migration_fora_do_dir', detalhe: `${arq}: .sql fora de ${dir}/` })
      continue
    }
    const base = arq.slice(dir.length + 1)
    const mm = /^(\d{3,})[_-]/.exec(base)
    if (!mm) {
      v.push({ tipo: 'migration_sem_numero', detalhe: `${arq}: .sql sem número legível — não dá para checar a faixa` })
      continue
    }
    const n = Number(mm[1])
    const reservada = reservadas.find(([a, b]) => n >= a && n <= b)
    if (reservada) {
      v.push({
        tipo: 'migration_faixa_reservada',
        detalhe: `${arq}: ${mm[1]} está na faixa RESERVADA ${reservada[0]}-${reservada[1]}`,
      })
      continue
    }
    if (faixa && (n < faixa[0] || n > faixa[1])) {
      v.push({
        tipo: 'migration_fora_da_faixa',
        detalhe: `${arq}: ${mm[1]} fora da faixa ${faixa[0]}-${faixa[1]}`,
      })
    }
  }
  return v
}

// ─── K11a-1 · regras C e D: escrita por tabela e por coluna ─────────────────

/** `public.leads` → casa `public.leads`, `leads`, `"leads"`, `outro.leads`. */
function parteDeTabela(tabela: string): string {
  const bare = tabela.replace(/^[a-z_]+\./i, '')
  return `(?:[a-z_]+\\.)?"?${bare.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"?`
}

/**
 * Toda tabela ESCRITA no texto: DML/DDL cru mais a cadeia `.from().insert()`.
 * Leitura (`select`, `.select()`) não aparece aqui, e é isso que faz "leitura
 * nunca reprova" ser uma propriedade do DETECTOR, e não um caso de teste.
 *
 * Recebe o BLOCO de linhas adicionadas de um arquivo, não uma linha: a cadeia
 * `sb.from('contratos')\n  .insert({...})` é a forma normal em TS, e um detector
 * por linha não a enxerga. É a mesma razão da janela de 6 linhas da regra 3.
 */
export function tabelasEscritas(texto: string): string[] {
  const out: string[] = []
  const sql =
    /\b(?:insert\s+into|update|delete\s+from|truncate(?:\s+table)?|alter\s+table|drop\s+table|copy)\s+([A-Za-z0-9_."]+)/gi
  let m: RegExpExecArray | null
  while ((m = sql.exec(texto)) !== null) out.push((m[1] ?? '').replace(/"/g, ''))
  const js = /\.from\(\s*['"`]([A-Za-z0-9_.]+)['"`]\s*\)[\s\S]{0,120}?\.(?:insert|update|upsert|delete)\s*\(/g
  while ((m = js.exec(texto)) !== null) out.push(m[1] ?? '')
  return [...new Set(out.filter(Boolean))]
}

/**
 * Todo nome de coluna ESCRITO no texto — o alvo de um `SET`, a lista de colunas
 * de um `INSERT INTO`, e as chaves do objeto passado a `.update/.insert/.upsert`.
 * `where etapa_canonica = 'x'` não entra: WHERE é leitura.
 */
export function colunasEscritas(texto: string): string[] {
  const out: string[] = []
  const ident = /[A-Za-z_][A-Za-z0-9_]*/g
  // SET a = 1, b = 2 — cada alvo de atribuição até o WHERE.
  for (const m of texto.matchAll(/\bset\b([\s\S]*?)(?=\bwhere\b|;|$)/gi)) {
    for (const atrib of (m[1] ?? '').split(',')) {
      const alvo = /^\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*=/.exec(atrib)
      if (alvo?.[1]) out.push(alvo[1])
    }
  }
  // INSERT INTO tabela (a, b, c)
  for (const m of texto.matchAll(/\binsert\s+into\s+[A-Za-z0-9_."]+\s*\(([^)]*)\)/gi)) {
    for (const c of (m[1] ?? '').split(',')) {
      const n = /^\s*["']?([A-Za-z_][A-Za-z0-9_]*)["']?\s*$/.exec(c)
      if (n?.[1]) out.push(n[1])
    }
  }
  // .update({ a: 1, b: 2 }) — as chaves do objeto literal.
  for (const m of texto.matchAll(/\.(?:update|insert|upsert)\s*\(\s*\{([^}]*)\}/g)) {
    for (const par of (m[1] ?? '').split(',')) {
      const n = /^\s*["'`]?([A-Za-z_][A-Za-z0-9_]*)["'`]?\s*:/.exec(par)
      if (n?.[1]) out.push(n[1])
      else {
        // shorthand `{ etapa_canonica }`
        const s = ident.exec(par.trim())
        ident.lastIndex = 0
        if (s && s[0] === par.trim()) out.push(s[0])
      }
    }
  }
  return [...new Set(out)]
}

/**
 * Regra C · escrita por tabela. Duas metades independentes, e as duas saem do
 * config:
 *   - `no_write_tables` como LISTA: aquelas tabelas são congeladas por NOME;
 *   - `schemas_permitidos` (+ `tabelas_permitidas`): tudo o que estiver fora
 *     delas reprova.
 * Sem nenhuma das duas, a regra não acusa nada — que é o estado do CI, onde
 * `no_write_tables` é a string `"TODAS"` e quem age é a regra 3.
 */
export function violacoesDeTabela(arquivo: string, texto: string, config: EnforceConfig): Violation[] {
  const zp = config.zona_proibida
  const congeladas = Array.isArray(zp.no_write_tables) ? zp.no_write_tables : []
  const schemas = zp.schemas_permitidos
  const permitidas = zp.tabelas_permitidas ?? []
  if (congeladas.length === 0 && !schemas) return []
  const casa = (padrao: string, alvo: string) => new RegExp(`^${parteDeTabela(padrao)}$`, 'i').test(alvo)
  const v: Violation[] = []
  for (const alvo of tabelasEscritas(texto)) {
    const congelada = congeladas.find((t) => casa(t, alvo))
    if (congelada) {
      v.push({ tipo: 'tabela_congelada', detalhe: `${arquivo}: escrita em '${alvo}' (tabela congelada '${congelada}')` })
      continue
    }
    if (!schemas) continue
    if (permitidas.some((t) => casa(t, alvo))) continue
    const schema = alvo.includes('.') ? alvo.slice(0, alvo.indexOf('.')) : ''
    if (!schemas.some((s) => s.toLowerCase() === schema.toLowerCase())) {
      v.push({
        tipo: 'tabela_nao_permitida',
        detalhe: `${arquivo}: escrita em '${alvo}', fora de schemas_permitidos [${schemas.join(', ')}]`,
      })
    }
  }
  return v
}

/**
 * Regra D · colunas-sombra. `colunas_congeladas` são GLOBS (um nome literal é o
 * glob que casa só a si mesmo), e `colunas_sombra` vence: uma sombra declarada
 * passa mesmo casando uma congelada. É essa ordem que torna o par
 * `congeladas: ["etapa_*"] / sombra: ["etapa_v2_*"]` exprimível — sem ela, a
 * lista de sombras não decidiria nada e o repo teria de enumerar cada coluna.
 */
export function violacoesDeColuna(arquivo: string, texto: string, config: EnforceConfig): Violation[] {
  const zp = config.zona_proibida
  const congeladas = zp.colunas_congeladas ?? []
  if (congeladas.length === 0) return []
  const sombras = zp.colunas_sombra ?? []
  const v: Violation[] = []
  for (const nome of colunasEscritas(texto)) {
    if (sombras.some((g) => globToRegExp(g).test(nome))) continue
    const congelada = congeladas.find((g) => globToRegExp(g).test(nome))
    if (congelada) {
      v.push({ tipo: 'coluna_congelada', detalhe: `${arquivo}: escrita na coluna '${nome}' (congelada por '${congelada}')` })
    }
  }
  return v
}

/**
 * Regra E · CREATE/ALTER/DROP de objeto cujo nome começa por um prefixo
 * declarado. Porte do laço `no_write_prefixes` do actus-saas
 * (`enforcement.mjs:270-275`), com a MESMA janela de 60 caracteres entre o verbo
 * e o nome — é ela que faz `create or replace view vw_x` casar sem que a regra
 * precise conhecer a gramática de `CREATE`, e o Comarka usa a mesma chave com
 * outros donos (`trafego_`, `vw_`).
 *
 * E é DDL, e só. Escrever DADO num objeto de nome proibido é assunto das regras
 * C e D, que julgam por tabela e por coluna: sem essa separação, `prefixos_sem_ddl`
 * viraria um segundo `no_write_tables` por semelhança de nome.
 */
export function violacoesDePrefixo(arquivo: string, texto: string, config: EnforceConfig): Violation[] {
  const prefixos = config.zona_proibida.prefixos_sem_ddl ?? []
  if (prefixos.length === 0) return []
  const v: Violation[] = []
  for (const pref of prefixos) {
    const p = pref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(`\\b(create|alter|drop)\\b[\\s\\S]{0,60}?\\b${p}\\w+`, 'i')
    if (re.test(texto)) {
      v.push({
        tipo: 'prefixo_sem_ddl',
        detalhe: `${arquivo}: CREATE/ALTER/DROP de objeto com prefixo proibido '${pref}'`,
      })
    }
  }
  return v
}

export function enforce(input: EnforceInput): EnforceResult {
  const v: Violation[] = []
  const zp = input.config.zona_proibida
  const negacaoTotal = zp.no_write_tables === 'TODAS'

  const proibidos = [...zp.no_write_paths, ...(zp.no_write_credenciais?.padroes ?? [])]

  for (const f of input.changedFiles) {
    if (!f) continue
    // 2) zona proibida por caminho — vale mesmo se o ticket declarou no allowlist.
    const glob = proibidos.find((g) => globToRegExp(g).test(f))
    if (glob) v.push({ tipo: 'zona_proibida', detalhe: `${f} (casa '${glob}')` })
    // 1) pathspec do ticket
    else if (!matchesAllowlist(f, input.allowlist)) v.push({ tipo: 'fora_do_pathspec', detalhe: f })
  }

  // B) migrations por faixa — CAMINHO, nunca conteúdo. Desligada sem `migrations`.
  v.push(...violacoesDeMigration(input.changedFiles, input.config))

  const linhas = addedLines(input.diff)

  // C+D+E) escrita por tabela, por coluna e DDL por prefixo, POR ARQUIVO — o bloco de linhas
  // adicionadas daquele arquivo, não a linha solta (a cadeia
  // `.from('x')\n.insert({})` é a forma normal em TS).
  //
  // A classe decide, e a decisão aqui é DIFERENTE da regra 3 de propósito:
  //   `prosa`        fica de fora, como sempre (documentar a proibição não é violá-la);
  //   `artefato_sql` ENTRA. A regra 3 (`TODAS`) o deixa de fora porque é uma
  //                  negação em bloco, e foi ela que reprovou o DELETE de dentro
  //                  do artefato que o próprio ticket pediu (ORQ-11). C e D são
  //                  proibições NOMEADAS — três tabelas, uma coluna —, e um
  //                  `insert into public.leads` dentro de uma migration é
  //                  exatamente o que o Actus proíbe: alguém vai APLICAR aquele
  //                  arquivo. Nomear é o que separa a regra do falso positivo.
  const porArquivo = new Map<string, string[]>()
  for (const { arquivo, linha } of linhas) {
    if (classificaArquivo(arquivo, input.config) === 'prosa') continue
    const atual = porArquivo.get(arquivo)
    if (atual) atual.push(linha)
    else porArquivo.set(arquivo, [linha])
  }
  for (const [arquivo, corpo] of porArquivo) {
    const texto = corpo.join('\n')
    v.push(...violacoesDeTabela(arquivo, texto, input.config))
    v.push(...violacoesDeColuna(arquivo, texto, input.config))
    v.push(...violacoesDePrefixo(arquivo, texto, input.config))
  }

  for (let i = 0; i < linhas.length; i++) {
    const { arquivo, linha } = linhas[i]!

    // PRIMEIRO o arquivo, depois o conteúdo. A classe decide o que pode ser
    // olhado; nenhuma regex de SQL roda antes desta linha.
    const classe = classificaArquivo(arquivo, input.config)

    // 5) credenciais: varre TUDO, em qualquer classe — vazamento é vazamento,
    // e uma chave colada dentro de um .sql vaza igual. Esta é a ÚNICA regra de
    // conteúdo que não depende da classe.
    if (pareceCredencial(linha)) {
      v.push({ tipo: 'credencial', detalhe: `${arquivo}: ${linha.trim().slice(0, 80)}` })
    }

    // 3+4) Só `executavel` tem o conteúdo auditado por SQL.
    //   - `prosa`: documentação não executa nada.
    //   - `artefato_sql`: DADO INERTE. Nem o DDL, nem o DML, nem o comentário
    //     que descreve a regra. Aplicar é um COMANDO, e comando mora em arquivo
    //     executável — nunca numa linha de dentro do .sql.
    if (classe !== 'executavel') continue

    // 4) aplicar migration é proibido em arquivo executável, em qualquer via.
    if (APLICA_MIGRATION.test(linha)) {
      v.push({ tipo: 'aplica_migration', detalhe: `${arquivo}: ${linha.trim()}` })
    }

    // 3) no_write_tables TODAS: nenhuma escrita em tabela, por nenhuma via.
    // CAMINHO ANTES DO CONTEUDO (licao dos falsos positivos 002 e 001): codigo de
    // APLICACAO usa o client do Supabase — e o trabalho, nao violacao. A regra
    // proibe o LOOP de escrever no banco durante a execucao, nao proibe o app de
    // funcionar. Sem isso a barreira reprova qualquer ticket que toque qualquer tela.
    const ehCodigoDeApp =
      /^apps\/[^/]+\/src\//.test(arquivo) || /^services\/[^/]+\/src\//.test(arquivo)
    if (ehCodigoDeApp) continue
    if (!negacaoTotal) continue
    if (DML_CRU.test(linha)) {
      v.push({ tipo: 'escrita_em_banco', detalhe: `${arquivo}: ${linha.trim()}` })
    }
    FROM_TABELA.lastIndex = 0
    let m: RegExpExecArray | null
    while ((m = FROM_TABELA.exec(linha)) !== null) {
      const janela = linhas
        .slice(i, i + 6)
        .filter((x) => x.arquivo === arquivo)
        .map((x) => x.linha)
        .join(' ')
      if (MUTACAO.test(janela)) {
        v.push({ tipo: 'escrita_em_banco', detalhe: `${arquivo}: ${m[1]} — ${linha.trim()}` })
      }
    }
  }

  return { ok: v.length === 0, violations: v }
}

// --- CLI: enforcement.sh chama `npx tsx enforcement-core.ts --run-cli` --------
// O guard confere o ARQUIVO invocado, não só a flag: este módulo é IMPORTADO
// por juiz.ts (globToRegExp), e um `npx tsx juiz.ts --run-cli ...` disparava a
// CLI da barreira só por a flag estar no argv — ela lia stdin e derrubava o
// processo com o payload errado. Módulo com CLI de efeito colateral precisa
// saber se é ele quem foi chamado.
if (process.argv.includes('--run-cli') && /enforcement-core\.(ts|js)$/.test(process.argv[1] ?? '')) {
  const input = JSON.parse(readFileSync(0, 'utf8')) as EnforceInput
  const result = enforce(input)
  process.stdout.write(JSON.stringify(result, null, 2) + '\n')
  process.exit(result.ok ? 0 : 1)
}
