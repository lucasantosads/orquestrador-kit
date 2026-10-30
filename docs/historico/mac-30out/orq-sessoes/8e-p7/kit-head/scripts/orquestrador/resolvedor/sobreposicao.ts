/**
 * sobreposicao.ts — allowlist sobreposta entre tickets sem dependência entre
 * eles (etapa 7f-b5, peça 3). SÓ DIAGNÓSTICO: classe R8, regra D13, nunca
 * firme; o resolvedor só registra, nunca escreve no repo.
 *
 * Par: dois tickets fora de done/obsoleto cujas `pathspec_allowlist` se
 * sobrepõem (o mesmo caminho, ou um glob de um que casa um caminho do outro),
 * sem caminho de dependência entre eles em nenhum sentido (fecho transitivo
 * pelas `dependencias` que são ids; `humano:` não conta). Proposta (decisão do
 * chat do programa): o de id MAIOR passa a depender do menor, serializando os
 * dois. Ciclo é impossível: com qualquer caminho entre os dois não há par.
 *
 * Gabarito (Comarka): 826/866 (`917d35b`) e 306b/500 (`ded72e1`). Nos dois o
 * humano fez o de id menor, que já tinha reprovado, esperar o maior; a medição
 * da 7f-b5 compara as duas direções antes de qualquer promoção.
 *
 * PURO sobre a fila: só lê `docs/fila/*.md`.
 */
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { matchesAllowlist } from '../enforcement-core.js'
import { blocoJson } from '../triador/comum.js'

export interface ParSobreposto {
  menor: string
  maior: string
  /** os caminhos do maior (ou do menor, quando o glob é do maior) que o outro também cobre */
  arquivos: string[]
  proposta: string
}

interface T {
  id: string
  status: string
  allow: string[]
  deps: string[]
}

const ordem = (a: string, b: string) => a.localeCompare(b, 'en', { numeric: true })

export function lerFila(raiz: string): T[] {
  const fila = join(raiz, 'docs/fila')
  let nomes: string[] = []
  try {
    nomes = readdirSync(fila).filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
  } catch {
    return []
  }
  const out: T[] = []
  for (const f of nomes) {
    const j = blocoJson(readFileSync(join(fila, f), 'utf8'))
    if (!j || typeof j.id !== 'string') continue
    const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])
    out.push({ id: j.id, status: typeof j.status === 'string' ? j.status : '', allow: strs(j.pathspec_allowlist), deps: strs(j.dependencias).filter((d) => !d.startsWith('humano:')) })
  }
  return out
}

/** Os caminhos em que duas allowlists se sobrepõem. */
export function sobrepostos(a: string[], b: string[]): string[] {
  const out = new Set<string>()
  for (const x of a) {
    for (const y of b) {
      if (x === y) out.add(x)
      else if (matchesAllowlist(x, [y])) out.add(x)
      else if (matchesAllowlist(y, [x])) out.add(y)
    }
  }
  return [...out].sort()
}

export function sobreposicoesDe(fila: T[]): ParSobreposto[] {
  const porId = new Map(fila.map((t) => [t.id, t]))
  // fecho transitivo: de cada id, todos os que ele espera
  const espera = new Map<string, Set<string>>()
  const fecho = (id: string, vendo = new Set<string>()): Set<string> => {
    const pronto = espera.get(id)
    if (pronto) return pronto
    const s = new Set<string>()
    if (vendo.has(id)) return s
    vendo.add(id)
    for (const d of porId.get(id)?.deps ?? []) {
      s.add(d)
      for (const x of fecho(d, vendo)) s.add(x)
    }
    espera.set(id, s)
    return s
  }
  const vivos = fila.filter((t) => t.status !== 'done' && t.status !== 'obsoleto' && t.allow.length).sort((a, b) => ordem(a.id, b.id))
  const out: ParSobreposto[] = []
  for (let i = 0; i < vivos.length; i++) {
    for (let j = i + 1; j < vivos.length; j++) {
      const a = vivos[i]!
      const b = vivos[j]!
      if (fecho(a.id).has(b.id) || fecho(b.id).has(a.id)) continue
      const arquivos = sobrepostos(b.allow, a.allow)
      if (!arquivos.length) continue
      out.push({ menor: a.id, maior: b.id, arquivos, proposta: `acrescentar ${a.id} às dependencias do ${b.id}` })
    }
  }
  return out
}

export const sobreposicoes = (raiz: string): ParSobreposto[] => sobreposicoesDe(lerFila(raiz))
