/**
 * r2.ts — a PROPOSTA de R2 (critério com defeito de forma), só em sombra:
 * nunca aplica (decisão do chat do programa, 7f-b2). O gabarito é o 929
 * (7787af3, ~/orq-sessoes/conserto-840-929.md).
 *
 * Forma tratada nesta etapa: o critério reprovou com `unbound variable` (o
 * executor roda o cmd sob `set -euo pipefail`). Causa: `v=$(grep -c …)` sem
 * `|| true` numa corrente com `&&`: com contagem 0 o grep sai 1, a corrente
 * para e a variável seguinte nunca é atribuída. Conserto, o do humano no 929:
 * `|| true` dentro de cada `$(grep -c …)` e toda expansão dessas variáveis
 * como `${v:-x}`. Outra forma de defeito: "não consegui", com o motivo.
 *
 * A prova (o que vai na proposta), no harness do executor do legado
 * (`out="$( ( cd … && eval "$cmd" ) 2>&1 || true )"` sob `set -euo pipefail`):
 *   - estado em que o trabalho NÃO foi feito: os arquivos que o cmd cita, como
 *     estão no branch alvo (o que não existe lá fica ausente). O cmd novo tem
 *     de rodar sem abortar e REPROVAR; o antigo, para comparar;
 *   - o head da última tentativa (quando a evidência tem `head.txt`): só
 *     registro, o mérito não é do critério.
 * Roda numa pasta temporária, com cópias: nunca no repo, nunca script do repo.
 * cmd que chama git, npx, node, gerenciador de pacote, shell ou script do repo
 * não é provado (seria rodar o repo): "não consegui".
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { gitLeitura } from '../triador/git.js'
import type { Diagnostico } from '../triador/triar.js'
import { noAlvo, type Plano } from './r1.js'
import { bloco, EdicaoRecusada, trocarCmd } from './ticket-md.js'

export interface Rodada {
  estado: 'nao_feito' | 'head'
  cmd: 'novo' | 'antigo'
  saida: string
  abortou: boolean
  passa: boolean
}

export interface PropostaR2 {
  indice: number
  criterio: string
  descricao: string
  espera: string
  cmd_antigo: string
  cmd_novo: string
  arquivos: { nao_feito: string[]; head: string[] }
  /** o conteúdo de cada arquivo da prova: a comparação com o humano (peça 5) roda sobre ele */
  arvores: { nao_feito: Record<string, string>; head: Record<string, string> | null }
  ref_alvo: string | null
  head: string | null
  prova: Rodada[]
  novo: string
}

const RE_ATRIB = /\b([A-Za-z_]\w*)=\$\((\s*grep\s+(?:-[A-Za-z]*c[A-Za-z]*|--count)\s[^()]*?)\)/g

/** O conserto do `unbound variable` de `v=$(grep -c …)`; `null` se o cmd não tem essa forma. */
export function consertarUnbound(cmd: string): string | null {
  const vars: string[] = []
  let out = cmd.replace(RE_ATRIB, (todo, v: string, dentro: string) => {
    if (/\|\|\s*true\s*$/.test(dentro)) return todo
    vars.push(v)
    return `${v}=$(${dentro.replace(/\s+$/, '')} || true)`
  })
  if (!vars.length) return null
  for (const v of new Set(vars)) {
    out = out.replace(new RegExp(String.raw`\$\{${v}(?::-[^}]*)?\}`, 'g'), `\${${v}:-x}`)
    out = out.replace(new RegExp(String.raw`\$${v}(?![A-Za-z0-9_])`, 'g'), `\${${v}:-x}`)
  }
  return out
}

/** O `criterio_match` do lib.sh do legado: número puro é igualdade; senão igual ou ERE. */
export function criterioPassa(out: string, espera: string): boolean {
  const o = out.trim()
  const e = espera.trim()
  if (/^\d+$/.test(e)) return o === e
  if (o === e) return true
  try {
    return new RegExp(e).test(o)
  } catch {
    return false
  }
}

const PROIBIDO = /(^|[\s;&|(`])(git|npx|npm|pnpm|yarn|node|tsx|vitest|tsc|python3?|bash|sh|zsh|curl|wget|psql|rm|mv|cp|chmod|make|\.\/|scripts\/)/

/** Os caminhos que o cmd cita (tokens com `/` ou extensão). */
function citados(cmd: string): string[] {
  const toks = cmd.match(/[A-Za-z0-9_.\-[\]/]+/g) ?? []
  return [...new Set(toks.filter((t) => /\/|\.[A-Za-z0-9]+$/.test(t) && !/^\.+$/.test(t) && !t.startsWith('/')))]
}

const HARNESS = `set -euo pipefail
cd "$1"
out="$( ( export NO_COLOR=1 FORCE_COLOR=0 && eval "$2" ) 2>&1 || true )"
printf '%s' "$out"`

export function rodar(dir: string, cmd: string, espera: string): { saida: string; abortou: boolean; passa: boolean } {
  const r = spawnSync('bash', ['-c', HARNESS, 'prova', dir, cmd], {
    encoding: 'utf8',
    timeout: 10_000,
    env: { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', HOME: dir, LANG: 'C' },
    stdio: ['ignore', 'pipe', 'pipe'],
  })
  const saida = `${r.stdout ?? ''}${r.status === 0 ? '' : r.stderr ?? ''}`.trim().replaceAll(dir, '<arvore>')
  return { saida, abortou: r.status !== 0 || /unbound variable|syntax error/.test(saida), passa: r.status === 0 && criterioPassa(saida, espera) }
}

/** Uma árvore temporária com os arquivos dados (caminho → conteúdo). */
function arvoreDe(conteudos: Record<string, string>): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-r2-'))
  for (const [f, txt] of Object.entries(conteudos)) {
    mkdirSync(dirname(join(dir, f)), { recursive: true })
    writeFileSync(join(dir, f), txt)
  }
  return dir
}

/** Os arquivos citados, como estão num ref (o que não existe lá fica de fora). */
function conteudosEm(raiz: string, ref: string | ((f: string) => string | null), arquivos: string[]): Record<string, string> {
  const out: Record<string, string> = {}
  for (const f of arquivos) {
    const g = typeof ref === 'function' ? null : gitLeitura(raiz, ['show', `${ref}:${f}`])
    const txt = typeof ref === 'function' ? ref(f) : g!.rc === 0 ? g!.stdout : null
    if (txt !== null) out[f] = txt
  }
  return out
}

/** Roda os cmds dados num estado (cópia temporária), no harness do executor. */
export function rodarEm(conteudos: Record<string, string>, cmds: [string, string][], espera: string): ({ cmd: string } & ReturnType<typeof rodar>)[] {
  const dir = arvoreDe(conteudos)
  try {
    return cmds.map(([qual, cmd]) => ({ cmd: qual, ...rodar(dir, cmd, espera) }))
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

/** O índice do critério: `criterio[i]` (legado) ou a descrição (kit). */
function indiceDo(nome: string, cs: Record<string, unknown>[]): number {
  const m = /^criterio\[(\d+)\]$/.exec(nome)
  if (m) return Number(m[1])
  return cs.findIndex((c) => c?.descricao === nome)
}

/** O head da última tentativa, pelo `head.txt` ao lado da evidência do critério. */
function headDa(raiz: string, diag: Diagnostico): string | null {
  for (const e of [...diag.evidencia].reverse()) {
    const p = join(raiz, dirname(e.arquivo), 'head.txt')
    if (existsSync(p)) {
      const h = readFileSync(p, 'utf8').trim()
      if (/^[0-9a-f]{7,40}$/.test(h) && gitLeitura(raiz, ['rev-parse', '--verify', '-q', `${h}^{commit}`]).rc === 0) return h
    }
  }
  return null
}

export function planejarR2(raiz: string, diag: Diagnostico, md: string): Plano<PropostaR2> {
  const falhos = diag.extracao.criterios_falhos
  const ult = Math.max(0, ...falhos.map((c) => c.tentativa))
  const daUltima = falhos.filter((c) => c.tentativa === ult)
  const alvo = daUltima.find((c) => c.saida.some((s) => /unbound variable/.test(s)))
  if (!alvo) {
    return { ok: false, motivo: daUltima.length ? `forma do defeito fora do que esta etapa conserta (saída: ${daUltima[0]!.saida.join(' | ').slice(0, 120)})` : 'sem critério reprovado na última tentativa' }
  }
  let j: Record<string, unknown>
  try {
    j = bloco(md).json
  } catch (e) {
    return { ok: false, motivo: (e as Error).message }
  }
  const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
  const i = indiceDo(alvo.criterio, cs)
  const c = cs[i]
  if (i < 0 || !c || typeof c.cmd !== 'string') return { ok: false, motivo: `${alvo.criterio} não está no ticket` }
  const antigo = c.cmd
  const espera = typeof c.espera === 'string' ? c.espera : ''
  const novoCmd = consertarUnbound(antigo)
  if (!novoCmd) return { ok: false, motivo: `${alvo.criterio}: o cmd não tem a forma v=$(grep -c …) sem || true` }
  const proibido = PROIBIDO.exec(antigo)
  if (proibido) return { ok: false, motivo: `${alvo.criterio} chama ${proibido[2]}: provar exigiria rodar o repo` }

  const arqs = citados(antigo)
  const fonteAlvo = (f: string) => noAlvo(raiz, f)
  const alvoRef = arqs.map(fonteAlvo).find((x) => x)?.ref ?? null
  const nf = conteudosEm(raiz, (f) => fonteAlvo(f)?.texto ?? null, arqs)
  const head = headDa(raiz, diag)
  const hd = head ? conteudosEm(raiz, head, arqs) : null
  const prova: Rodada[] = []
  for (const [estado, a] of [['nao_feito', nf], ['head', hd]] as const) {
    if (!a) continue
    for (const r of rodarEm(a, [['novo', novoCmd], ['antigo', antigo]], espera)) prova.push({ estado, ...(r as Omit<Rodada, 'estado'>) })
  }
  const novoNf = prova.find((p) => p.estado === 'nao_feito' && p.cmd === 'novo')!
  if (novoNf.abortou) return { ok: false, motivo: `o cmd consertado ainda aborta no estado não feito: ${novoNf.saida.slice(0, 120)}` }
  if (novoNf.passa) return { ok: false, motivo: `o cmd consertado APROVA o estado em que o trabalho não foi feito (${novoNf.saida.slice(0, 60)}): ficaria frouxo` }
  let novo: string
  try {
    novo = trocarCmd(md, i, novoCmd)
  } catch (e) {
    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
    throw e
  }
  return {
    ok: true,
    plano: {
      indice: i,
      criterio: alvo.criterio,
      descricao: typeof c.descricao === 'string' ? c.descricao : '',
      espera,
      cmd_antigo: antigo,
      cmd_novo: novoCmd,
      arquivos: { nao_feito: Object.keys(nf), head: hd ? Object.keys(hd) : [] },
      arvores: { nao_feito: nf, head: hd },
      ref_alvo: alvoRef,
      head,
      prova,
      novo,
    },
  }
}
