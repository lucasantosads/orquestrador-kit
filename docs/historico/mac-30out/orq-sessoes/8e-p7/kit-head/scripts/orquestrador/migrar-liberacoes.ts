/**
 * migrar-liberacoes.ts — `docs/fila/liberacoes.json` em qualquer forma viva → v2.
 *
 * Uso:
 *   migrar-liberacoes.ts <caminho-do-liberacoes.json> [--dry-run|--aplicar]
 *
 * `--dry-run` é o PADRÃO e imprime o diff. `--aplicar` grava e deixa um `.bak`
 * ao lado, no primeiro. rc 0 sempre que a leitura deu certo — migração que não
 * tem nada a fazer não é erro, e sinalizar erro aí faria o `--atualizar
 * --migrar` abortar num repo já migrado.
 *
 * A regra de conversão inteira, com o porquê de cada linha, está em
 * `liberacoes-core.ts`. Este arquivo é só a casca: argumentos, disco e a
 * impressão do relatório.
 */
import { existsSync } from 'node:fs'
import { readFileSync, realpathSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { DESCONHECIDO, descreverForma, ehV2, migrar } from './liberacoes-core.js'
import type { TokenV2 } from './liberacoes-core.js'
import { cabecalho, diffUnificado, gravarComBak, json, lerJson, lerOpcoes } from './migrar-comum.js'

const QUEM = 'migrar-liberacoes'

// ─── K8b-7 · datar pelo git ─────────────────────────────────────────────────

/** Teto de toda chamada a git daqui: migração não pode pendurar por credencial. */
export const TIMEOUT_GIT_MS = 15_000

/** O que o git sabe sobre UM token, ou null quando não sabe nada. */
export interface DataDeToken {
  em: string
  por: string
}

/** Quem responde "quando este token entrou no arquivo?". Injetável no teste. */
export type Datador = (token: string) => DataDeToken | null

/**
 * O datador REAL: `git log --format='%cs %an' -S'<token>' -- <arquivo>`.
 *
 * `-S` lista os commits em que a CONTAGEM daquela string mudou no arquivo — ou
 * seja, os que a introduziram ou removeram. O git imprime do mais novo para o
 * mais velho, e quem interessa é o MAIS VELHO: é ele que introduziu o token, e
 * é essa a data em que o humano liberou. O mais novo seria a última vez que
 * alguém mexeu na linha (reindentação, renome de prefixo), que não é a
 * liberação.
 *
 * A busca é pelo token SEM o prefixo `humano:`. O prefixo é acrescentado pela
 * própria migração, e no disco do Actus os tokens estão sem ele — procurar a
 * forma com prefixo não acharia nada justamente no repo que mais precisa.
 *
 * `null` em tudo o que não seja uma resposta clara: arquivo fora do git,
 * `git` ausente, timeout, saída vazia. Sem história, `desconhecido` FICA — a
 * migração não inventa data, e é a mesma regra do `liberacoes-core`.
 */
export function datadorGit(arquivo: string, git = rodarGit): Datador {
  const dir = dirname(arquivo)
  const rastreado = git(dir, ['ls-files', '--error-unmatch', arquivo])
  if (rastreado.status !== 0) return () => null
  return (token: string) => {
    const bare = token.replace(/^humano:/, '')
    if (!bare) return null
    const r = git(dir, ['log', '--format=%cs %an', `-S${bare}`, '--', arquivo])
    if (r.status !== 0) return null
    const linhas = r.stdout.split('\n').map((l) => l.trim()).filter(Boolean)
    const maisVelha = linhas.at(-1)
    if (!maisVelha) return null
    const m = /^(\d{4}-\d{2}-\d{2})\s+(.+)$/.exec(maisVelha)
    if (!m) return null
    return { em: m[1]!, por: m[2]! }
  }
}

function rodarGit(dir: string, args: string[]): { status: number | null; stdout: string } {
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', timeout: TIMEOUT_GIT_MS })
  return { status: r.error ? null : r.status, stdout: r.stdout ?? '' }
}

/**
 * Preenche `liberado_em` e `por` dos tokens que continuam `desconhecido`.
 *
 * NUNCA sobrescreve dado presente: um token que já traz data no arquivo tem
 * uma data que alguém escreveu à mão, e a data do commit é a data em que o
 * registro foi COMMITADO — parecidas, não iguais, e a escrita à mão é a que
 * carrega a intenção.
 */
export function datar(tokens: TokenV2[], datador: Datador): { datados: number; notas: string[] } {
  let datados = 0
  const notas: string[] = []
  for (const t of tokens) {
    if (t.liberado_em !== DESCONHECIDO && t.por !== DESCONHECIDO) continue
    let d: DataDeToken | null = null
    try {
      d = datador(t.token)
    } catch {
      d = null
    }
    if (!d) continue
    if (t.liberado_em === DESCONHECIDO) t.liberado_em = d.em
    if (t.por === DESCONHECIDO) t.por = d.por
    datados += 1
  }
  if (datados) {
    notas.push(`${datados} token(s) datado(s) pelo git (o commit MAIS VELHO que introduziu cada token no arquivo)`)
  }
  return { datados, notas }
}

export interface Resultado {
  /** Havia algo a mudar? */
  mudou: boolean
  /** O conteúdo v2, serializado. */
  depois: string
  /** O relatório, linha a linha. */
  linhas: string[]
}

export function migrarArquivo(
  caminho: string,
  modo: 'dry-run' | 'aplicar',
  datador?: Datador,
): Resultado {
  const linhas: string[] = []
  const raiz = lerJson(caminho)
  const antes = readFileSync(caminho, 'utf8')

  linhas.push(`forma no disco: ${descreverForma(raiz)}`)

  const m = migrar(raiz)
  // K8b-7: o git só é consultado DEPOIS da conversão, e só para os buracos.
  const datacao = datar(m.v2.tokens, datador ?? datadorGit(caminho))
  m.notas.push(...datacao.notas)
  const depois = json(m.v2)

  linhas.push(
    `${m.lidas} entrada(s) lida(s) → ${m.v2.tokens.length} token(s) único(s) em v2` +
      (m.duplicados.length
        ? `; ${m.duplicados.length} token(s) apareciam mais de uma vez: ${m.duplicados
            .map((d) => `${d.token} (${d.vezes}×)`)
            .join(', ')}`
        : ''),
  )
  for (const n of m.notas) linhas.push(`nota: ${n}`)

  if (ehV2(raiz) && antes === depois) {
    linhas.push('já está em v2 e byte a byte igual ao que esta migração produziria: nada a fazer.')
    return { mudou: false, depois, linhas }
  }

  const d = diffUnificado(antes, depois, `${caminho} (atual)`, `${caminho} (v2 proposto)`)
  if (!d) {
    linhas.push('nada a mudar.')
    return { mudou: false, depois, linhas }
  }
  linhas.push('', d.trimEnd())

  if (modo === 'aplicar') {
    const { bak } = gravarComBak(caminho, depois)
    linhas.push('', bak ? `GRAVADO. Cópia do estado anterior em ${bak}` : `GRAVADO. O .bak já existia e NÃO foi tocado (ele é o estado ANTES da primeira migração).`)
  }
  return { mudou: true, depois, linhas }
}

function chamadoComoCli(): boolean {
  try {
    return realpathSync(process.argv[1] ?? '') === realpathSync(fileURLToPath(import.meta.url))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  try {
    const { modo, resto } = lerOpcoes(process.argv.slice(2), QUEM)
    const caminho = resto[0]
    if (!caminho) throw new Error(`${QUEM}: falta o caminho do liberacoes.json`)
    const abs = resolve(caminho)
    if (!existsSync(abs)) throw new Error(`${QUEM}: '${abs}' não existe`)
    process.stdout.write(cabecalho(QUEM, abs, modo))
    const r = migrarArquivo(abs, modo)
    for (const l of r.linhas) process.stdout.write(`${l}\n`)
    process.exit(0)
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(2)
  }
}
