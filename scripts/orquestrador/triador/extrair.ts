/**
 * extrair.ts — a extração determinística e as regras D1-D12 (spec 7f-a §3).
 *
 * Recebe a `Evidencia` (de qualquer leitor) e devolve a classe, se é FIRME
 * (vai ao painel sem modelo) ou PALPITE (vai ao modelo com as provas), a regra
 * que decidiu, a evidência `arquivo:linha` do original, o remédio em uma linha
 * e o requeue. A primeira regra que casa decide; o estágio é o da ÚLTIMA
 * tentativa da série.
 *
 * Regra de falta (§2): a classe só é firme se as fontes que a regra usa
 * estão presentes. Sem o fonte do teste, o acoplamento é `null` e R1 vira
 * palpite; sem índice de vizinhos, a base vermelha não fecha; sem diff.stat
 * ou sem cap, o diff-cap não decide.
 *
 * O que o agente disse NUNCA entra numa regra (§6, regra 6).
 *
 * PURO: nada aqui lê disco.
 */
import { matchesAllowlist } from '../enforcement-core.js'
import { noDiff } from './leitor-legado-comarka.js'
import type { Evidencia, Ref, Tentativa, Vizinho } from './tipos.js'

export type Regra = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9' | 'D10' | 'D11' | 'D12'

export interface Extracao {
  /** `R1`..`R7` quando firme; palpite leva `?` (`R5?`, `R1|R2?`); `null` = nenhuma regra casou */
  classe: string | null
  firme: boolean
  regra: Regra | null
  rotulo: string
  evidencia: Ref[]
  remedio: string
  requeue: string
  detalhe: Detalhe
}

export interface Detalhe {
  estagios: string[]
  vermelhos: { tentativa: number; arquivo: string; linha: number | null; dentro_allowlist: boolean; no_diff: boolean }[]
  fora_da_allowlist_e_do_diff: string[]
  acoplado: boolean | null
  aceite: boolean
  vizinhos_base: { arquivo: string; tickets: string[] }[]
  maquina: boolean
  merge_recusado: string[]
  diff_linhas: number | null
  diff_cap: number | null
  criterios_falhos: { tentativa: number; criterio: string; saida: string[] }[]
}

const ROTULO: Record<string, string> = {
  R1: 'teste acoplado fora da allowlist',
  R2: 'critério com defeito de forma ou premissa',
  R3: 'spec precisa de decisão, token, motor ou refatiamento',
  R4: 'dependência: o aceite achou falta real no código',
  R5: 'ambiente',
  R6: 'motor: o orquestrador mediu ou decidiu errado',
  R7: 'humano: só o dono decide',
}
export const rotuloDe = (classe: string | null): string => {
  if (!classe) return 'sem regra'
  const cs = classe.replace('?', '').split('|')
  return cs.map((c) => ROTULO[c] ?? c).join(' ou ') + (classe.endsWith('?') ? ' (palpite)' : '')
}

// Acoplamento por nome (§3.1, item 5). Heurística: o que ela não pega fica palpite.
const STEM_GENERICO = new Set(['page', 'route', 'index', 'layout'])
const DIR_GENERICO = new Set(['dashboard', 'components', 'supabase', 'migrations', 'clientes'])

function stem(arquivo: string): string {
  const base = arquivo.split('/').pop() ?? arquivo
  return base.replace(/\.(test|spec)?\.?[cm]?[jt]sx?$|\.sql$|\.json$/, '')
}

/** O teste vermelho cita, no fonte em `head`, um nome-base ou um diretório do diff. */
export function acopla(fonte: string, diff: string[]): boolean {
  const stems = new Set(diff.map(stem).filter((s) => s.length >= 4 && !STEM_GENERICO.has(s)))
  const dirs = new Set(diff.flatMap((f) => f.split('/').slice(0, -1)).filter((d) => d.length >= 5 && !DIR_GENERICO.has(d)))
  return [...stems].some((s) => fonte.includes(s)) || [...dirs].some((d) => fonte.includes(d))
}

const familia = (id: string) => /^\d+/.exec(id)?.[0] ?? id
const JANELA_MS = 6 * 3600 * 1000

/** A prova de um vermelho: a linha FAIL, o erro logo abaixo e o local `❯ arquivo:linha`. */
function vermelhoRefs(t: Tentativa, arquivo: string): Ref[] {
  const fs = t.falhas.filter((f) => f.arquivo === arquivo).flatMap((f) => (f.erro ? [f.ref, f.erro] : [f.ref]))
  return [...fs, ...t.vermelhos.filter((v) => v.arquivo === arquivo && v.linha !== null).map((v) => v.ref)]
}

function dedup(refs: Ref[]): Ref[] {
  const vistos = new Set<string>()
  return refs.filter((r) => {
    const k = `${r.arquivo}:${r.linha}`
    if (vistos.has(k)) return false
    vistos.add(k)
    return true
  })
}

/** `arquivo:linha` do primeiro local `❯` entre as provas, ou só o arquivo. */
const local = (refs: Ref[], arquivo: string): string => {
  const m = refs.map((r) => /❯\s+\S+?:(\d+):\d+/.exec(r.trecho)).find(Boolean)
  return m ? `${arquivo}:${m[1]}` : arquivo
}

export function extrair(ev: Evidencia): Extracao {
  const al = ev.ticket?.pathspec_allowlist ?? []
  const cobre = (f: string) => al.length > 0 && matchesAllowlist(f, al)
  const ts = ev.tentativas
  const ult = ts.at(-1)
  const est = ts.map((t) => t.estagio)
  const fim = ev.bloqueio.quando ? Date.parse(ev.bloqueio.quando) : NaN
  const aceite = al.length > 0 && al.every((g) => g.startsWith('test/'))

  // vermelhos fora da allowlist e fora do diff da própria tentativa, com o fonte
  const fora: { t: Tentativa; arquivo: string }[] = []
  const vermelhos: Detalhe['vermelhos'] = []
  for (const t of ts) {
    for (const f of t.arquivos_vermelhos) {
      const dentro = cobre(f)
      const nd = noDiff(f, t.diff_arquivos)
      const loc = t.vermelhos.find((v) => v.arquivo === f)
      vermelhos.push({ tentativa: t.n, arquivo: f, linha: loc?.linha ?? null, dentro_allowlist: dentro, no_diff: nd })
      if (!dentro && !nd) fora.push({ t, arquivo: f })
    }
  }
  let acoplado: boolean | null = false
  const acoplados: { t: Tentativa; arquivo: string }[] = []
  for (const x of fora) {
    const src = x.t.fontes[x.arquivo]
    if (src === null || src === undefined) {
      if (acoplado === false) acoplado = null
      continue
    }
    if (acopla(src, x.t.diff_arquivos)) acoplados.push(x)
  }
  if (acoplados.length) acoplado = true

  // base vermelha: o mesmo arquivo, em outra família, nas ±6 h
  const vizinhosDe = (f: string): Vizinho[] =>
    ev.vizinhos.filter(
      (v) =>
        v.arquivo === f &&
        familia(v.ticket) !== familia(ev.id) &&
        (Number.isNaN(fim) || Number.isNaN(Date.parse(v.ts)) || Math.abs(Date.parse(v.ts) - fim) <= JANELA_MS),
    )
  const base: { t: Tentativa; arquivo: string; viz: Vizinho[] }[] = []
  for (const x of fora) {
    const viz = vizinhosDe(x.arquivo)
    if (viz.length) base.push({ ...x, viz })
  }

  const maquina = ult?.maquina ?? []
  const detalhe: Detalhe = {
    estagios: est,
    vermelhos,
    fora_da_allowlist_e_do_diff: [...new Set(fora.map((x) => x.arquivo))],
    acoplado,
    aceite,
    vizinhos_base: [...new Set(base.map((b) => b.arquivo))].map((arquivo) => ({
      arquivo,
      tickets: [...new Set(base.filter((b) => b.arquivo === arquivo).flatMap((b) => b.viz.map((v) => v.ticket)))].sort(),
    })),
    maquina: maquina.length > 0,
    merge_recusado: ev.merge_recusado?.arquivos ?? [],
    diff_linhas: ult?.diff_linhas ?? null,
    diff_cap: ev.config.diff_cap_linhas,
    criterios_falhos: ts.flatMap((t) => t.criterios_falhos.map((c) => ({ tentativa: t.n, criterio: c.criterio, saida: c.saida }))),
  }
  const sai = (classe: string | null, regra: Regra | null, evidencia: Ref[], remedio: string, requeue = 'nao'): Extracao => ({
    classe,
    firme: classe !== null && !classe.endsWith('?'),
    regra,
    rotulo: rotuloDe(classe),
    evidencia: dedup(evidencia),
    remedio,
    requeue,
    detalhe,
  })
  if (!ult) return sai(null, null, [], 'sem tentativa na série: decisão humana')
  const u = ult.estagio

  // D1 · merge recusado (árvore suja) e o juiz aprovou
  if (u === 'juiz_ok_merge_falhou' && ev.merge_recusado && ult.juiz?.aprovado === true) {
    const alvo = /merge em (\S+)/.exec(ts.map((t) => t.juiz?.motivo ?? '').join(' '))?.[1]
    const juizRefs = ts.filter((t) => t.juiz?.aprovado === true).map((t) => t.juiz!.ref)
    return sai(
      'R5',
      'D1',
      [...ev.merge_recusado.refs, ...juizRefs],
      `limpar ${ev.merge_recusado.arquivos.join(', ')} na worktree alvo${alvo ? ` (${alvo})` : ''} e reabrir: mérito aprovado em ${juizRefs.length} tentativa(s)`,
      'sim_apos:arvore_alvo_limpa',
    )
  }

  // D2 / D3 · diff-cap contra o diff.stat
  if (u === 'diff_cap' && ult.diff_ref && ult.diff_linhas !== null && ev.config.diff_cap_linhas !== null) {
    const cap = ev.config.diff_cap_linhas
    const provas = [...ts.map((t) => t.diff_ref).filter((r): r is Ref => r !== null), ...ev.motor.filter((r) => /diff grande|diff_cap|DIFF-CAP/i.test(r.trecho))]
    if (ult.diff_linhas <= cap) {
      return sai('R6', 'D2', provas, `não fatiar: diff.stat dá ${ult.diff_linhas} ≤ cap ${cap}; o contador do motor está errado`, 'sim_apos:conserto_motor')
    }
    return sai('R3?', 'D3', provas, `decidir: refatiar (diff.stat dá ${ult.diff_linhas} > cap ${cap})`)
  }

  // D4 · máquina (worker do vitest, EMFILE, ENOSPC na última tentativa)
  if (maquina.length) {
    const r = maquina[0]!
    const estouros = ult.falhas.flatMap((f) => (f.erro && /timed out/i.test(f.erro.trecho) ? [f.ref, f.erro] : []))
    return sai('R5', 'D4', [...maquina, ...estouros], `reabrir com a máquina livre: "${r.trecho.slice(0, 60)}" em ${r.arquivo}:${r.linha}`, 'sim_apos:maquina_ok')
  }

  // D5 · base vermelha
  if (ev.base_vermelha_motor) {
    const a = ev.base_vermelha_motor.arquivos[0] ?? ''
    return sai('R5', 'D5', [ev.base_vermelha_motor.ref], `consertar a base: ${ev.base_vermelha_motor.arquivos.join(', ')} vermelho fora do diff e da allowlist (o motor já decidiu)`, `sim_apos:base_verde:${a}`)
  }
  if (base.length) {
    const b = base[0]!
    const provas = [
      ...base.flatMap((x) => vermelhoRefs(x.t, x.arquivo)),
      ...base.flatMap((x) => x.viz.map((v) => ({ arquivo: `${v.dir}/gate-vitest.txt`, linha: v.linha, trecho: `FAIL ${v.arquivo} (${v.ticket}, ${v.ts})` }))),
    ]
    const ids = [...new Set(base.flatMap((x) => x.viz.map((v) => v.ticket)))].sort()
    return sai('R5', 'D5', provas, `consertar a base: ${local(vermelhoRefs(b.t, b.arquivo), b.arquivo)} vermelho também em ${ids.join(', ')}, fora do diff`, `sim_apos:base_verde:${b.arquivo}`)
  }

  // D6 · vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou.
  // Firme só com o MESMO teste vermelho fora em ≥ 2 tentativas da série
  // (7f-b1-7, decisão do chat do programa): com uma só, o agente ainda pode
  // resolver no retry (os 5 de série cortada da fixture), e vira `R1?`.
  if ((u === 'vitest' || u === 'enforcement') && fora.length && acoplado === true) {
    const tentativasDe = (f: string) => new Set(fora.filter((x) => x.arquivo === f).map((x) => x.t.n)).size
    const persistentes = acoplados.filter((x) => tentativasDe(x.arquivo) >= 2)
    const a = (persistentes.length ? persistentes : acoplados).at(-1)!
    const provas = acoplados.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
    const onde = local(vermelhoRefs(a.t, a.arquivo), a.arquivo)
    if (persistentes.length) {
      return sai('R1', 'D6', provas, `pôr ${a.arquivo} na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em ${onde}`)
    }
    return sai('R1?', 'D6', provas, `conferir ${a.arquivo}: vermelho fora da allowlist numa tentativa só (${onde}); se for acoplado, pôr na allowlist com guarda`)
  }
  const refsFora = fora.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
  // D7 · vermelho fora, não acoplado (ou acoplamento sem fonte): base ou acoplamento indireto
  if (u === 'vitest' && fora.length) {
    return sai('R5?', 'D7', refsFora, `conferir se ${fora[0]!.arquivo} já está vermelho na base; senão pôr na allowlist com guarda`)
  }
  // D8 · enforcement sem vermelho acoplado
  if (u === 'enforcement') {
    return sai('R1?', 'D8', ult.enforcement ? [ult.enforcement.ref] : [], `conferir o arquivo que o enforcement barrou: ${(ult.enforcement?.violacoes ?? []).join('; ').slice(0, 120)}`)
  }
  const refsUlt = ult.arquivos_vermelhos.flatMap((f) => vermelhoRefs(ult, f))
  // D9 / D10 · vitest com o vermelho dentro
  if (u === 'vitest' && ult.arquivos_vermelhos.length) {
    if (aceite) return sai('R4?', 'D9', refsUlt, `conferir se o aceite ${local(refsUlt, ult.arquivos_vermelhos[0]!)} achou falta real: criar ticket de código`)
    return sai('R2?', 'D10', refsUlt, `conferir o critério ou a premissa do teste ${ult.arquivos_vermelhos[0]}`)
  }
  const refsCrit = ult.criterios_falhos.map((c) => c.ref)
  // D11 / D12 · critério
  if (u === 'criterios' && fora.length) {
    return sai('R1|R2?', 'D11', [...refsCrit, ...refsFora], `conferir ${ult.criterios_falhos[0]?.criterio ?? 'o critério'} e o vermelho fora (${fora[0]!.arquivo}) de tentativa anterior`)
  }
  if (u === 'criterios' && ult.criterios_falhos.length) {
    const c = ult.criterios_falhos[0]!
    return sai('R2?', 'D12', refsCrit, `consertar ${c.criterio} no .md: saída "${c.saida.join(' | ').slice(0, 80)}"`)
  }
  return sai(null, null, [], 'nenhuma regra casou: vai ao modelo')
}
