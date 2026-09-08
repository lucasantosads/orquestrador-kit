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

export interface EnforceConfig {
  migrations_dir: string
  /** Segundo diretório de artefato .sql (ORQ-08). Opcional: config antiga sem o campo continua válida. */
  sql_pendente_dir?: string
  politica_schema: { comportamento_vigente: string }
  zona_proibida: {
    no_write_paths: string[]
    no_write_tables: string | string[]
    no_write_credenciais?: { padroes?: string[] }
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

  const linhas = addedLines(input.diff)
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
