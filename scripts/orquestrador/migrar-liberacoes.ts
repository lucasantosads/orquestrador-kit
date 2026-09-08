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
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { descreverForma, ehV2, migrar } from './liberacoes-core.js'
import { cabecalho, diffUnificado, gravarComBak, json, lerJson, lerOpcoes } from './migrar-comum.js'

const QUEM = 'migrar-liberacoes'

export interface Resultado {
  /** Havia algo a mudar? */
  mudou: boolean
  /** O conteúdo v2, serializado. */
  depois: string
  /** O relatório, linha a linha. */
  linhas: string[]
}

export function migrarArquivo(caminho: string, modo: 'dry-run' | 'aplicar'): Resultado {
  const linhas: string[] = []
  const raiz = lerJson(caminho)
  const antes = readFileSync(caminho, 'utf8')

  linhas.push(`forma no disco: ${descreverForma(raiz)}`)

  const m = migrar(raiz)
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
