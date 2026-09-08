/**
 * migrar-tickets.ts — o BLOCO JSON dos tickets `pendente` (peça K8b-5).
 *
 * Uso:
 *   migrar-tickets.ts <docs/fila> [--dry-run|--aplicar]
 *
 * O que ele muda, e SÓ isso:
 *   tentativas_consumidas → tentativas
 *   recon_esperado        → recon
 *
 * O que ele NÃO faz, cada item por um motivo:
 *   - não toca ticket que não seja `pendente`. Status terminal (`done`,
 *     `obsoleto`, `bloqueado`) foi escrito sob schemas anteriores e já
 *     entregou; reescrever o JSON de quem já entregou é mexer em histórico;
 *   - não inventa `tipo` de critério. 178 critérios do Comarka e os 10 do Actus
 *     não têm `tipo`, e o valor certo (`alvo` | `guarda` | `avaliador`) depende
 *     de o comando FALHAR ou PASSAR na base atual — é o passo 3 do gate de
 *     ticket, não um chute de migração;
 *   - não inventa `risco`. O gate o classifica (passo 6); vazio é o estado
 *     legítimo até lá;
 *   - não inventa `bloco`. Os 46 pendentes do Comarka não têm — eles têm
 *     `frente`/`onda`/`serie`/`camada`, que é outro modelo de roadmap. Traduzir
 *     isso é decisão de quem conhece o roadmap;
 *   - não toca `perfil` nem `lane`. São do Comarka, e a K11 decide o destino;
 *   - não move UM BYTE da prosa. É a afirmação central desta peça, e o teste a
 *     verifica byte a byte, não por semelhança.
 *
 * `--aplicar` grava SEM `.bak`, e é a única migração do kit que não deixa um: o
 * ticket É versionado (ao contrário do `liberacoes.json` de alguns repos e do
 * pause file, que não são), então o git já é o backup — e o commit é humano.
 * Um `.bak` ao lado de cada ticket sujaria a fila com 46 arquivos que o próprio
 * `ticket_files` não ignora... na verdade ignora (`[0-9]*.md`), mas o `git
 * status` não, e árvore suja mata o preflight do run seguinte.
 */
import { existsSync, readFileSync, readdirSync, realpathSync, statSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { cabecalho, diffUnificado, lerOpcoes } from './migrar-comum.js'

const QUEM = 'migrar-tickets'

/** Os renomes. Tabela curta e explícita, como a do config. */
export const RENOMES_TICKET: Array<{ de: string; para: string; porque: string }> = [
  {
    de: 'tentativas_consumidas',
    para: 'tentativas',
    porque:
      'o contador de retry. `tentativas` é o nome do schema (schemas/ticket.schema.json) e o que o executor grava em `meta.json`; `tentativas_consumidas` é o nome v1 e aparece em 39 tickets no disco.',
  },
  {
    de: 'recon_esperado',
    para: 'recon',
    porque:
      'a lista de verificações de fonte (todo path/rota/tabela citado existe). `recon` é o nome do schema; `recon_esperado` é o nome v1 e aparece em 250 tickets no disco, 44 deles PENDENTES no Comarka.',
  },
]

export interface TicketMigrado {
  arquivo: string
  /** O conteúdo novo, ou `null` quando nada muda. */
  depois: string | null
  /** Uma linha por decisão. */
  notas: string[]
  /** Foi pulado? Se sim, por quê. */
  pulado?: string
}

/**
 * Acha o bloco ```json — por LINHA, para poder devolvê-lo ao lugar sem tocar em
 * mais nada. Devolve os índices das linhas de conteúdo (fences fora).
 */
export function acharBloco(md: string): { inicio: number; fim: number; quantos: number } | null {
  const linhas = md.split('\n')
  let inicio = -1
  let fim = -1
  let quantos = 0
  let dentro = false
  for (let i = 0; i < linhas.length; i++) {
    const t = linhas[i]!.trim()
    if (!dentro && t === '```json') {
      dentro = true
      quantos += 1
      if (inicio === -1) inicio = i + 1
      continue
    }
    if (dentro && t === '```') {
      dentro = false
      if (fim === -1) fim = i
    }
  }
  if (inicio === -1 || fim === -1) return null
  return { inicio, fim, quantos }
}

/**
 * Migra UM ticket. `md` entra, `md` sai — e tudo fora das linhas do bloco sai
 * byte a byte igual, porque o retorno é literalmente o array de linhas original
 * com uma fatia trocada.
 */
export function migrarTicket(md: string): { depois: string | null; notas: string[]; pulado?: string } {
  const notas: string[] = []
  const b = acharBloco(md)
  if (!b) return { depois: null, notas, pulado: 'sem bloco ```json' }

  // Mais de um bloco NÃO é mais motivo para pular (peça D10). A divergência 10
  // foi FECHADA no motor: o ticket é o PRIMEIRO bloco, e os três leitores
  // (`gate-ticket.ts:blocoJson`, `fila-read.ts:extractJsonBlock`,
  // `lib.sh:ticket_json`) concordam. A migração segue o motor — `acharBloco` já
  // aponta para o primeiro —, e o `quantos` continua sendo contado só para a
  // NOTA: quem lê o relatório merece saber que o arquivo tem outro bloco.
  if (b.quantos > 1) {
    notas.push(`${b.quantos} blocos \`\`\`json no arquivo — o ticket é o PRIMEIRO (CONTRATO §2); os demais são prosa e saem intactos`)
  }

  const linhas = md.split('\n')
  const bruto = linhas.slice(b.inicio, b.fim).join('\n')
  let json: Record<string, unknown>
  try {
    const p = JSON.parse(bruto)
    if (!p || typeof p !== 'object' || Array.isArray(p)) throw new Error('não é objeto')
    json = p as Record<string, unknown>
  } catch (e) {
    return { depois: null, notas, pulado: `bloco não parseia (${(e as Error).message})` }
  }

  if (json.status !== 'pendente') {
    return { depois: null, notas, pulado: `status ${JSON.stringify(json.status)} — só pendente é migrado` }
  }

  // Renome PRESERVANDO A POSIÇÃO da chave. Reconstruir na ordem original é o
  // que faz o diff mostrar uma linha trocada em vez do bloco inteiro embaralhado
  // — e um diff embaralhado é um diff que ninguém lê.
  let mudou = false
  const novo: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(json)) {
    const r = RENOMES_TICKET.find((x) => x.de === k)
    if (!r) {
      novo[k] = v
      continue
    }
    if (k in json && r.para in json) {
      novo[k] = v
      notas.push(`'${r.de}' e '${r.para}' coexistem: NÃO renomeei, os dois ficam (decida qual vale)`)
      continue
    }
    novo[r.para] = v
    mudou = true
    notas.push(`${r.de} → ${r.para}`)
  }
  if (!mudou) return { depois: null, notas }

  // Só as linhas do bloco são substituídas. O resto do array não é tocado.
  const serializado = JSON.stringify(novo, null, 2).split('\n')
  const saida = [...linhas.slice(0, b.inicio), ...serializado, ...linhas.slice(b.fim)]
  return { depois: saida.join('\n'), notas }
}

/** Os arquivos que o motor considera tickets: `[0-9]*.md`, sem descer. */
export function ticketsDe(fila: string): string[] {
  return readdirSync(fila)
    .filter((n) => /^[0-9].*\.md$/.test(n))
    .filter((n) => statSync(join(fila, n)).isFile())
    .sort()
    .map((n) => join(fila, n))
}

export interface Resultado {
  linhas: string[]
  migrados: number
  pulados: number
}

export function migrarFila(fila: string, modo: 'dry-run' | 'aplicar'): Resultado {
  const linhas: string[] = []
  const arquivos = ticketsDe(fila)
  linhas.push(
    `${arquivos.length} arquivo(s) de ticket em ${fila} (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)`,
  )
  let migrados = 0
  const pulados: string[] = []

  for (const f of arquivos) {
    const antes = readFileSync(f, 'utf8')
    const r = migrarTicket(antes)
    if (r.pulado) {
      // "status não-pendente" é o caso NORMAL e não vira linha: a fila tem
      // centenas deles e o relatório precisa ser lido.
      if (!r.pulado.startsWith('status ')) pulados.push(`${f.split('/').pop()}: ${r.pulado}`)
      continue
    }
    if (!r.depois) continue
    migrados += 1
    const nome = f.split('/').pop()!
    linhas.push('', `--- ${nome}: ${r.notas.join(', ')} ---`)
    linhas.push(diffUnificado(antes, r.depois, `${nome} (atual)`, `${nome} (migrado)`).trimEnd())
    if (modo === 'aplicar') writeFileSync(f, r.depois)
  }

  if (pulados.length) {
    linhas.push('', 'PULADOS (não são "status terminal"; leia cada um):')
    for (const p of pulados) linhas.push(`  ${p}`)
  }
  linhas.push(
    '',
    migrados === 0
      ? 'nenhum ticket pendente a migrar.'
      : modo === 'aplicar'
        ? `${migrados} ticket(s) GRAVADO(S). Sem .bak: o ticket é versionado, o git é o backup e o commit é humano.`
        : `${migrados} ticket(s) mudariam. (--dry-run: nada foi escrito.)`,
  )
  return { linhas, migrados, pulados: pulados.length }
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
    const fila = resto[0]
    if (!fila) throw new Error(`${QUEM}: falta o caminho de docs/fila`)
    const abs = resolve(fila)
    if (!existsSync(abs)) throw new Error(`${QUEM}: '${abs}' não existe`)
    process.stdout.write(cabecalho(QUEM, abs, modo))
    const r = migrarFila(abs, modo)
    for (const l of r.linhas) process.stdout.write(`${l}\n`)
    process.exit(0)
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n`)
    process.exit(2)
  }
}
