/**
 * fila-read.ts — leitura da fila para os scripts de relatório/writeback.
 * Extrai o bloco ```json de cada ticket docs/fila/NNN-*.md. Somente Node/fs.
 *
 * PORTE (ORQ-02): vindo de comarka-os. A lógica veio inteira; a única mudança
 * são os tipos opcionais escritos como `string | undefined` em vez de `string`.
 * Lá o tsconfig não liga `exactOptionalPropertyTypes`; aqui liga, e atribuir
 * `undefined` a um campo `campo?: string` é erro de tipo. Sem isso o gate
 * typecheck_root reprova assim que um teste importar este módulo.
 */
import { readFileSync, readdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'

export interface Ticket {
  id: string
  slug: string
  lane?: string | undefined
  perfil?: string | undefined
  status: string
  objetivo?: string | undefined
  dependencias: string[]
  notas_status?: string | undefined
  file: string
}

export function extractJsonBlock(md: string): unknown {
  const lines = md.split('\n')
  let inBlock = false
  const buf: string[] = []
  for (const line of lines) {
    if (!inBlock && line.trim() === '```json') {
      inBlock = true
      continue
    }
    if (inBlock && line.trim() === '```') break
    if (inBlock) buf.push(line)
  }
  if (buf.length === 0) return null
  try {
    return JSON.parse(buf.join('\n'))
  } catch {
    return null
  }
}

export function readTickets(filaDir: string): Ticket[] {
  if (!existsSync(filaDir)) return []
  const files = readdirSync(filaDir)
    .filter((f) => /^\d.*\.md$/.test(f))
    .sort()
  const out: Ticket[] = []
  for (const f of files) {
    const parsed = extractJsonBlock(readFileSync(join(filaDir, f), 'utf8')) as
      | Record<string, unknown>
      | null
    if (!parsed || typeof parsed.id !== 'string') continue
    out.push({
      id: String(parsed.id),
      slug: String(parsed.slug ?? ''),
      lane: parsed.lane ? String(parsed.lane) : undefined,
      perfil: parsed.perfil ? String(parsed.perfil) : undefined,
      status: String(parsed.status ?? 'desconhecido'),
      objetivo: parsed.objetivo ? String(parsed.objetivo) : undefined,
      dependencias: Array.isArray(parsed.dependencias)
        ? (parsed.dependencias as unknown[]).map(String)
        : [],
      notas_status: parsed.notas_status ? String(parsed.notas_status) : undefined,
      file: join(filaDir, f),
    })
  }
  return out
}

export function liberacoesTokens(liberacoesFile: string): Set<string> {
  if (!existsSync(liberacoesFile)) return new Set()
  try {
    const j = JSON.parse(readFileSync(liberacoesFile, 'utf8')) as {
      liberadas?: { token?: string }[]
    }
    return new Set((j.liberadas ?? []).map((l) => String(l.token)))
  } catch {
    return new Set()
  }
}

/**
 * Classifica um ticket para o relatório:
 * passou | travou | refatiar | aguarda | pendente | andando
 *
 * `refatiar` (regra 19) é classe PRÓPRIA e nunca "pendente": o ticket voltou
 * porque a allowlist não cobre o que ele precisa tocar, ou porque o diff não
 * cabe no cap. Quem resolve é humano (origem: humano) ou o planejador, e o
 * executor NÃO o reprocessa — `proximo_pendente` só olha `pendente`. Cair em
 * "pendente" aqui faria o relatório prometer trabalho que não vai acontecer.
 */
export function classificar(t: Ticket, liberados: Set<string>): string {
  if (t.status === 'done') return 'passou'
  if (t.status === 'bloqueado') return 'travou'
  if (t.status === 'refatiar') return 'refatiar'
  if (t.status === 'em_execucao') return 'andando'
  const humanoPendente = t.dependencias.some(
    (d) => d.startsWith('humano:') && !liberados.has(d.slice('humano:'.length)),
  )
  return humanoPendente ? 'aguarda' : 'pendente'
}
