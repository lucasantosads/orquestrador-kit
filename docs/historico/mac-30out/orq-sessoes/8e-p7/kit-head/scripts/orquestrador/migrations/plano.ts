/**
 * plano.ts — linha de base e plano de um banco (etapa MIG-A, P3). Puro.
 *
 * Linha de base (decisão 3 de 18/10: o que está em produção é a verdade, nada
 * antigo é renomeado nem cobrado), gravada em `~/.orq/migrations/<banco>.json`:
 *   corte                a maior versão de produção naquele momento (ou a dada)
 *   aplicadas            as linhas do schema_migrations naquele momento
 *   herdados_desde       piso dos herdados (opcional); sem ele, nenhum
 *   pendentes_herdados   arquivos com piso < versão <= corte SEM linha no ledger
 *                        (E2, opção b): o plano os mostra à parte, aplicáveis
 *   antigos_sem_ledger   quantos arquivos <= corte sem linha ficaram de fora
 *
 * O piso existe porque "todo arquivo sem linha até o corte" no Comarka dá 36
 * (18/10), e 31 são de maio a setembro (aplicados com outro nome, descartados
 * ou nunca aplicados): cobrar esses é o que a decisão 3 proíbe.
 *
 * Plano, contra o ledger de agora:
 *   pendentes  arquivo com versão > corte e sem linha que case
 *   herdados   os da linha de base que ainda não casam
 *   drift      linha com versão > corte sem arquivo que case, em nenhum repo do banco
 * Casar: a mesma versão, OU o mesmo nome (o nome sem o prefixo, ou o nome base
 * inteiro: o dashboard-comercial grava `20261006_<nome>` como nome).
 */
import type { Aplicada } from './supabase.js'

export interface ArquivoMig {
  repo: string
  /** relativo à raiz do repo */
  arquivo: string
  versao: string
  nome: string
  /** o nome do arquivo sem `.sql` */
  base: string
  /** os refs onde o arquivo existe */
  refs: string[]
  /** o conteúdo muda entre os refs: o aplicador recusa */
  divergente: boolean
  somenteLeitura: boolean
}

export interface Herdado {
  repo: string
  arquivo: string
  versao: string
  nome: string
}

export interface LinhaBase {
  $versao: 1
  banco: string
  criado_em: string
  corte: string
  herdados_desde: string | null
  aplicadas: Aplicada[]
  pendentes_herdados: Herdado[]
  antigos_sem_ledger: number
}

export interface Plano {
  corte: string
  pendentes: ArquivoMig[]
  herdados: ArquivoMig[]
  drift: Aplicada[]
  aplicadasDesdeCorte: (Aplicada & { arquivo: string | null })[]
}

/** A versão com 14 dígitos (`20260612` → `20260612000000`). */
export const normaliza = (v: string): string => v.padEnd(14, '0')

export function versaoDoArquivo(rel: string): { versao: string; nome: string; base: string } | null {
  const b = rel.split('/').pop() ?? ''
  const m = /^(\d{14}|\d{8})_(.+)\.sql$/.exec(b)
  return m ? { versao: normaliza(m[1]!), nome: m[2]!, base: b.slice(0, -4) } : null
}

const porVersao = <T extends { versao: string; arquivo: string }>(a: T, b: T) => (a.versao === b.versao ? a.arquivo.localeCompare(b.arquivo) : a.versao < b.versao ? -1 : 1)

function indice(aplicadas: Aplicada[]) {
  const versoes = new Set(aplicadas.map((a) => normaliza(a.version)))
  const nomes = new Set(aplicadas.map((a) => a.name).filter((n): n is string => !!n))
  return (a: ArquivoMig) => versoes.has(a.versao) || nomes.has(a.nome) || nomes.has(a.base)
}

/** O arquivo que casa uma linha do ledger, ou null. */
function arquivoDa(l: Aplicada, arquivos: ArquivoMig[]): ArquivoMig | null {
  const v = normaliza(l.version)
  return arquivos.find((a) => a.versao === v) ?? arquivos.find((a) => !!l.name && (a.nome === l.name || a.base === l.name)) ?? null
}

export function montarLinhaBase(o: { banco: string; aplicadas: Aplicada[]; arquivos: ArquivoMig[]; corte?: string; herdadosDesde?: string; agora: Date }): LinhaBase {
  const maior = o.aplicadas.reduce((m, a) => (normaliza(a.version) > m ? normaliza(a.version) : m), '')
  const corte = normaliza(o.corte ?? maior)
  if (!/^\d{14}$/.test(corte)) throw new Error(`corte inválido: ${JSON.stringify(o.corte ?? maior)} (AAAAMMDD ou AAAAMMDDHHMMSS)`)
  const piso = o.herdadosDesde === undefined ? null : normaliza(o.herdadosDesde)
  if (piso !== null && (!/^\d{14}$/.test(piso) || piso > corte)) throw new Error(`herdados_desde inválido: ${o.herdadosDesde} (AAAAMMDD[HHMMSS], até o corte ${corte})`)
  const casa = indice(o.aplicadas)
  const semLedger = o.arquivos.filter((a) => a.versao <= corte && !casa(a)).sort(porVersao)
  const herdados = piso === null ? [] : semLedger.filter((a) => a.versao > piso)
  return {
    $versao: 1,
    banco: o.banco,
    criado_em: o.agora.toISOString(),
    corte,
    herdados_desde: piso,
    aplicadas: o.aplicadas,
    pendentes_herdados: herdados.map(({ repo, arquivo, versao, nome }) => ({ repo, arquivo, versao, nome })),
    antigos_sem_ledger: semLedger.length - herdados.length,
  }
}

export function montarPlano(lb: LinhaBase, aplicadas: Aplicada[], arquivos: ArquivoMig[]): Plano {
  const casa = indice(aplicadas)
  const pendentes = arquivos.filter((a) => a.versao > lb.corte && !casa(a)).sort(porVersao)
  const herdados = lb.pendentes_herdados
    .map((h) => arquivos.find((a) => a.repo === h.repo && a.arquivo === h.arquivo))
    .filter((a): a is ArquivoMig => !!a && !casa(a))
    .sort(porVersao)
  const acima = aplicadas.filter((l) => normaliza(l.version) > lb.corte).sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0))
  const aplicadasDesdeCorte = acima.map((l) => ({ ...l, arquivo: arquivoDa(l, arquivos)?.arquivo ?? null }))
  return { corte: lb.corte, pendentes, herdados, drift: acima.filter((l) => !arquivoDa(l, arquivos)), aplicadasDesdeCorte }
}
