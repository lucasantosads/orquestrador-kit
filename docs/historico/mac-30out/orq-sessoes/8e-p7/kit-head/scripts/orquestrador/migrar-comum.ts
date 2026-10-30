/**
 * migrar-comum.ts — o que TODA migração do kit faz igual (peça K8b).
 *
 * As migrações (`migrar-liberacoes.ts`, `migrar-config.ts`, `migrar-tickets.ts`)
 * mexem em `docs/fila/**`, que é o único lugar do repo instalado que o
 * instalador nunca tocou até aqui — tickets, config e liberações são dados do
 * dono, não motor vendorizado. Por isso as três obedecem às MESMAS regras, e as
 * regras moram aqui em vez de serem reescritas três vezes:
 *
 *   1. `--dry-run` é o PADRÃO. Sem `--aplicar`, nada é escrito. Uma migração que
 *      grava por omissão é uma migração que alguém roda por engano.
 *   2. `--dry-run` imprime o DIFF, não um resumo. "3 chaves migradas" não deixa
 *      ninguém decidir nada; o diff deixa.
 *   3. O primeiro `--aplicar` deixa um `.bak` ao lado. É a rede para o caso em
 *      que o diff foi lido rápido demais.
 *   4. Migração NUNCA apaga dado. Chave desconhecida fica onde está, token não
 *      some, prosa não se move. O que a migração não entende, ela PRESERVA e
 *      RELATA — nesta ordem.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { basename } from 'node:path'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export type Modo = 'dry-run' | 'aplicar'

export interface Opcoes {
  modo: Modo
  /** O que sobrou de argv depois de tirar as flags conhecidas. */
  resto: string[]
}

/**
 * `--dry-run` (ou nada) e `--aplicar`. Passar os DOIS é erro de uso, não uma
 * preferência a resolver: quem escreveu os dois não sabe qual queria.
 */
export function lerOpcoes(argv: string[], quem: string): Opcoes {
  let dry = false
  let aplicar = false
  const resto: string[] = []
  for (const a of argv) {
    if (a === '--dry-run') dry = true
    else if (a === '--aplicar') aplicar = true
    else if (a.startsWith('--')) {
      throw new Error(`${quem}: opção desconhecida '${a}' (use --dry-run ou --aplicar)`)
    } else resto.push(a)
  }
  if (dry && aplicar) throw new Error(`${quem}: --dry-run e --aplicar juntos; escolha um`)
  return { modo: aplicar ? 'aplicar' : 'dry-run', resto }
}

/**
 * Diff unificado entre dois CONTEÚDOS, com rótulos legíveis.
 *
 * Roda o `diff -u` do sistema em vez de reimplementar Myers: o formato é o que
 * qualquer um já sabe ler, e um diff caseiro seria mais uma coisa para dar
 * errado dentro de uma ferramenta cujo trabalho inteiro é merecer confiança.
 * `LC_ALL=C` porque as mensagens do `diff` (e o `Common subdirectories`) mudam
 * de idioma — foi assim que o `instalar.sh --verificar` quase mentiu (peça K5).
 */
export function diffUnificado(antes: string, depois: string, rotAntes: string, rotDepois: string): string {
  if (antes === depois) return ''
  const dir = mkdtempSync(join(tmpdir(), 'orq-diff-'))
  try {
    const a = join(dir, 'antes')
    const b = join(dir, 'depois')
    writeFileSync(a, antes)
    writeFileSync(b, depois)
    const r = spawnSync('diff', ['-u', '--label', rotAntes, '--label', rotDepois, a, b], {
      encoding: 'utf8',
      env: { ...process.env, LC_ALL: 'C' },
    })
    // rc 0 = igual, 1 = diferente, >1 = erro do próprio diff. Só o >1 é problema.
    if ((r.status ?? 2) > 1) throw new Error(`diff falhou (rc ${r.status}): ${r.stderr}`)
    return r.stdout ?? ''
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/**
 * Grava, deixando `<arquivo>.bak` no PRIMEIRO --aplicar.
 *
 * "Primeiro" é literal: se o `.bak` já existe, ele NÃO é sobrescrito. O `.bak`
 * vale como o estado ANTES da primeira migração; refazê-lo a cada execução o
 * transformaria numa cópia do penúltimo estado, que é justamente o que ninguém
 * quer recuperar.
 */
export function gravarComBak(caminho: string, conteudo: string): { bak: string | null } {
  const bak = `${caminho}.bak`
  let criado: string | null = null
  if (existsSync(caminho) && !existsSync(bak)) {
    copyFileSync(caminho, bak)
    criado = bak
  }
  writeFileSync(caminho, conteudo)
  return { bak: criado }
}

/** Lê JSON com mensagem que diz QUAL arquivo não parseia. */
export function lerJson(caminho: string): unknown {
  const bruto = readFileSync(caminho, 'utf8')
  try {
    return JSON.parse(bruto)
  } catch (e) {
    throw new Error(`${caminho} não é JSON válido: ${(e as Error).message}`)
  }
}

/**
 * JSON com 2 espaços e newline final — o formato dos arquivos de fila do kit
 * (`fixture/docs/fila/*.json`, `doutrina/templates/config.json`). Sair dele
 * encheria o primeiro diff de ruído de reindentação.
 */
export function json(v: unknown): string {
  return `${JSON.stringify(v, null, 2)}\n`
}

/** Cabeçalho comum: quem, sobre qual arquivo, em que modo. */
export function cabecalho(quem: string, caminho: string, modo: Modo): string {
  const rotulo = modo === 'dry-run' ? '--dry-run: NADA é escrito' : '--aplicar: GRAVANDO'
  return `${quem.toUpperCase()}  ${basename(caminho)} (${caminho})\n           ${rotulo}\n`
}
