/**
 * ticket-md.ts — edições no 1º bloco ```json de um ticket .md (CONTRATO §2)
 * que mudam SÓ o necessário e mantêm o resto byte a byte (etapa 7f-b2).
 *
 * O texto não é reserializado: um analisador de JSON com posições acha o
 * trecho exato de cada valor, e a edição troca ou insere só ali, no recuo que
 * o arquivo já usa. Toda edição é conferida por parse: o objeto novo tem de
 * ser IGUAL ao esperado (o antigo com a mudança pedida), senão lança
 * `EdicaoRecusada` e nada é escrito. Assim o diff do resolvedor é o diff que um
 * humano faria à mão (o gabarito 7787af3/819c49a da peça 1).
 *
 * PURO: nada aqui lê ou escreve disco.
 */
import { isDeepStrictEqual } from 'node:util'

export class EdicaoRecusada extends Error {}

interface No {
  ini: number
  fim: number
  tipo: 'objeto' | 'lista' | 'valor'
  campos?: Map<string, No>
  itens?: No[]
}

/** Analisador de JSON que guarda [ini, fim) de cada valor. Lança em JSON inválido. */
function analisar(t: string): No {
  let i = 0
  const ws = () => {
    while (i < t.length && ' \t\n\r'.includes(t[i]!)) i++
  }
  const erro = (o: string): never => {
    throw new EdicaoRecusada(`json inválido em ${i}: ${o}`)
  }
  const texto = (): string => {
    const ini = i
    if (t[i] !== '"') erro('esperava "')
    i++
    while (i < t.length && t[i] !== '"') i += t[i] === '\\' ? 2 : 1
    if (t[i] !== '"') erro('string sem fim')
    i++
    return JSON.parse(t.slice(ini, i)) as string
  }
  const valor = (): No => {
    ws()
    const ini = i
    const c = t[i]
    if (c === '{') {
      i++
      const campos = new Map<string, No>()
      ws()
      if (t[i] === '}') {
        i++
        return { ini, fim: i, tipo: 'objeto', campos }
      }
      for (;;) {
        ws()
        const k = texto()
        ws()
        if (t[i] !== ':') erro('esperava :')
        i++
        campos.set(k, valor())
        ws()
        if (t[i] === ',') {
          i++
          continue
        }
        if (t[i] === '}') {
          i++
          return { ini, fim: i, tipo: 'objeto', campos }
        }
        erro('esperava , ou }')
      }
    }
    if (c === '[') {
      i++
      const itens: No[] = []
      ws()
      if (t[i] === ']') {
        i++
        return { ini, fim: i, tipo: 'lista', itens }
      }
      for (;;) {
        itens.push(valor())
        ws()
        if (t[i] === ',') {
          i++
          continue
        }
        if (t[i] === ']') {
          i++
          return { ini, fim: i, tipo: 'lista', itens }
        }
        erro('esperava , ou ]')
      }
    }
    if (c === '"') {
      texto()
      return { ini, fim: i, tipo: 'valor' }
    }
    const m = /^(?:-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|true|false|null)/.exec(t.slice(i))
    if (!m) erro('valor desconhecido')
    i += m![0].length
    return { ini, fim: i, tipo: 'valor' }
  }
  const raiz = valor()
  ws()
  if (i !== t.length) erro('sobra depois do json')
  return raiz
}

export interface Bloco {
  /** posição do texto json dentro do .md */
  ini: number
  fim: number
  texto: string
  json: Record<string, unknown>
}

/** O PRIMEIRO bloco ```json (o mesmo de `blocoJson` do triador). */
export function bloco(md: string): Bloco {
  const m = /```json\n([\s\S]*?)\n```/.exec(md)
  if (!m) throw new EdicaoRecusada('ticket sem bloco ```json')
  const ini = m.index + '```json\n'.length
  const texto = m[1]!
  let json: unknown
  try {
    json = JSON.parse(texto)
  } catch (e) {
    throw new EdicaoRecusada(`bloco json ilegível: ${(e as Error).message}`)
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) throw new EdicaoRecusada('bloco json não é objeto')
  return { ini, fim: ini + texto.length, texto, json: json as Record<string, unknown> }
}

/** O recuo (espaços do começo da linha) de uma posição. */
function recuo(t: string, pos: number): string {
  const ini = t.lastIndexOf('\n', pos - 1) + 1
  return /^[ \t]*/.exec(t.slice(ini))![0]
}

type Edicao = { ini: number; fim: number; novo: string }

function aplicar(t: string, es: Edicao[]): string {
  let out = t
  for (const e of [...es].sort((a, b) => b.ini - a.ini)) out = out.slice(0, e.ini) + e.novo + out.slice(e.fim)
  return out
}

/**
 * Aplica edições ao bloco e confere: o json novo tem de ser `esperado`.
 * Devolve o .md inteiro.
 */
function editar(md: string, f: (t: string, raiz: No, json: Record<string, unknown>) => { edicoes: Edicao[]; esperado: Record<string, unknown> }): string {
  const b = bloco(md)
  const raiz = analisar(b.texto)
  if (raiz.tipo !== 'objeto') throw new EdicaoRecusada('bloco json não é objeto')
  const { edicoes, esperado } = f(b.texto, raiz, b.json)
  const novo = aplicar(b.texto, edicoes)
  let obtido: unknown
  try {
    obtido = JSON.parse(novo)
  } catch (e) {
    throw new EdicaoRecusada(`a edição quebrou o json: ${(e as Error).message}`)
  }
  if (!isDeepStrictEqual(obtido, esperado)) throw new EdicaoRecusada('a edição não deu o objeto esperado')
  return md.slice(0, b.ini) + novo + md.slice(b.fim)
}

const campo = (n: No, k: string): No | undefined => n.campos?.get(k)

/** status → `pendente`, notas_status → "" (o reabrir do humano no 840, 940 e 932). */
export function reabrir(md: string): string {
  return editar(md, (_t, raiz, j) => {
    if (j.status !== 'bloqueado') throw new EdicaoRecusada(`status é ${JSON.stringify(j.status)}, não bloqueado`)
    const es: Edicao[] = []
    const st = campo(raiz, 'status')!
    es.push({ ini: st.ini, fim: st.fim, novo: '"pendente"' })
    const nt = campo(raiz, 'notas_status')
    if (nt) es.push({ ini: nt.ini, fim: nt.fim, novo: '""' })
    return { edicoes: es, esperado: { ...j, status: 'pendente', ...(nt ? { notas_status: '' } : {}) } }
  })
}

/** Acrescenta um caminho no fim de `pathspec_allowlist`, no recuo dos outros. */
export function acrescentarAllowlist(md: string, caminho: string): string {
  return editar(md, (t, raiz, j) => {
    const al = campo(raiz, 'pathspec_allowlist')
    const ultimo = al?.itens?.at(-1)
    if (!al || al.tipo !== 'lista' || !ultimo) throw new EdicaoRecusada('pathspec_allowlist ausente ou vazia')
    const lista = j.pathspec_allowlist as unknown[]
    return {
      edicoes: [{ ini: ultimo.fim, fim: ultimo.fim, novo: `,\n${recuo(t, ultimo.ini)}${JSON.stringify(caminho)}` }],
      esperado: { ...j, pathspec_allowlist: [...lista, caminho] },
    }
  })
}

/** Troca o `cmd` do critério `indice` de `criterios_aceite`. */
export function trocarCmd(md: string, indice: number, novo: string): string {
  return editar(md, (_t, raiz, j) => {
    const c = campo(raiz, 'criterios_aceite')?.itens?.[indice]
    const cmd = c && campo(c, 'cmd')
    if (!cmd) throw new EdicaoRecusada(`criterio[${indice}] sem cmd`)
    const cs = [...(j.criterios_aceite as Record<string, unknown>[])]
    cs[indice] = { ...cs[indice], cmd: novo }
    return { edicoes: [{ ini: cmd.ini, fim: cmd.fim, novo: JSON.stringify(novo) }], esperado: { ...j, criterios_aceite: cs } }
  })
}

/**
 * Insere um critério logo DEPOIS do critério `depoisDe`, com os campos na
 * ordem dada, no recuo do vizinho (`{` e campos).
 */
export function inserirCriterio(md: string, depoisDe: number, criterio: Record<string, string>): string {
  return editar(md, (t, raiz, j) => {
    const viz = campo(raiz, 'criterios_aceite')?.itens?.[depoisDe]
    const primeiro = viz?.campos?.values().next().value as No | undefined
    if (!viz || viz.tipo !== 'objeto' || !primeiro) throw new EdicaoRecusada(`criterio[${depoisDe}] ausente`)
    const rObj = recuo(t, viz.ini)
    // o recuo dos campos: o da linha da 1ª chave do vizinho (chave e valor na mesma linha)
    const rCampo = recuo(t, primeiro.ini)
    const corpo = Object.entries(criterio)
      .map(([k, v]) => `${rCampo}${JSON.stringify(k)}: ${JSON.stringify(v)}`)
      .join(',\n')
    const cs = [...(j.criterios_aceite as unknown[])]
    cs.splice(depoisDe + 1, 0, criterio)
    return { edicoes: [{ ini: viz.fim, fim: viz.fim, novo: `,\n${rObj}{\n${corpo}\n${rObj}}` }], esperado: { ...j, criterios_aceite: cs } }
  })
}
