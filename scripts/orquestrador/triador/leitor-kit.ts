/**
 * leitor-kit.ts — o leitor de um repo com o motor do kit (CONTRATO §4 e §5).
 *
 * Fontes: o 1º bloco json do ticket (§2), a trilha `runs/events.log` (§4: o
 * último `BLOQUEADO` do id e os `INICIO` da série), `runs/<id>/meta.json` e
 * `runs/<id>/attempt-N/` (§5.2-5.3: `gates.txt`, `enforcement.json`,
 * `criterios.txt`, `veredito.json`, `juiz.veredito.json`, `claude.txt`,
 * `diff.patch`). O `attempt=N` da trilha é 1-based e o diretório é
 * `attempt-(N-1)` (CONTRATO §5.3).
 *
 * SÓ LEITURA. O kit não guarda o HEAD julgado por tentativa: sem `head`, o
 * acoplamento fica `null` e a regra R1 vira palpite (§2, "se faltar").
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { blocoJson, criteriosFalhosKit, diffPatch, juizDe, ref, ticketLido, vermelhosDe } from './comum.js'
import { faixas, linhasDe } from './recorte.js'
import type { Arquivo, Estagio, Evidencia, Lido, Ref, Tentativa, Vizinho } from './tipos.js'

interface LinhaTrilha {
  n: number
  t: string
  ts: string
  id: string
  evento: string
  campos: Record<string, string>
}

function parseTrilha(txt: string): LinhaTrilha[] {
  const out: LinhaTrilha[] = []
  txt.split('\n').forEach((t, i) => {
    const m = /^(\S+)\s+(\S+)\s+([A-Z_]+)(.*)$/.exec(t)
    if (!m) return
    const campos: Record<string, string> = {}
    for (const c of m[4]!.matchAll(/(\w+)=(\S*)/g)) campos[c[1]!] = c[2]!
    out.push({ n: i + 1, t, ts: m[1]!, id: m[2]!, evento: m[3]!, campos })
  })
  return out
}

function lerJson<T>(p: string): T | null {
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as T
  } catch {
    return null
  }
}

function estagioKit(dirAbs: string, gates: string | null, ultimo: boolean, motivoBloq: string | null): Estagio {
  const vd = lerJson<{ desfecho?: string; causa?: string; sub?: string }>(join(dirAbs, 'veredito.json'))
  const jz = lerJson<{ aprovado?: boolean }>(join(dirAbs, 'juiz.veredito.json'))
  if (ultimo && motivoBloq === 'merge_falhou' && jz?.aprovado === true) return 'juiz_ok_merge_falhou'
  if (vd?.causa === 'diff_cap') return 'diff_cap'
  if (vd?.causa === 'enforcement' || vd?.causa === 'arquivo_solto') return 'enforcement'
  const falho = gates ? /^FALHA\s+(\S+)/m.exec(gates)?.[1] : undefined
  if (falho) {
    if (/test|vitest|spec/i.test(falho)) return 'vitest'
    if (/typecheck|tsc/i.test(falho)) return 'tsc'
    if (/build/i.test(falho)) return 'build'
    return 'gate'
  }
  if (vd?.causa === 'base_vermelha') return 'vitest'
  if (jz?.aprovado === false || vd?.sub === 'juiz') return 'juiz'
  if (vd?.sub === 'criterio') return 'criterios'
  if (vd?.desfecho === 'aprovado') return 'aprovado'
  const presentes = existsSync(dirAbs) ? readdirSync(dirAbs) : []
  if (presentes.every((f) => f === 'prompt.txt' || f === 'claude.txt')) return 'agente'
  return 'desconhecido'
}

export function lerRepoKit(raiz: string, id: string): Evidencia {
  const falta: string[] = []
  const cfg = lerJson<Record<string, unknown>>(join(raiz, 'docs/fila/000-config.json')) ?? {}
  const runsRel = typeof cfg.runs_dir === 'string' ? cfg.runs_dir : 'docs/fila/runs'
  const runs = join(raiz, runsRel)
  const trilhaRel = `${runsRel}/events.log`
  let trilhaTxt = ''
  try {
    trilhaTxt = readFileSync(join(raiz, trilhaRel), 'utf8')
  } catch {
    falta.push('events.log')
  }
  const trilha = parseTrilha(trilhaTxt)
  const trilhaArq: Arquivo = { rel: trilhaRel, linhas: trilha.map((l) => ({ n: l.n, t: l.t })), total: trilhaTxt.split('\n').length }

  // ticket
  let arquivoTicket: string | null = null
  try {
    const f = readdirSync(join(raiz, 'docs/fila')).find((x) => x.startsWith(`${id}-`) && x.endsWith('.md'))
    arquivoTicket = f ? `docs/fila/${f}` : null
  } catch {
    arquivoTicket = null
  }
  const tkJson = arquivoTicket ? blocoJson(readFileSync(join(raiz, arquivoTicket), 'utf8')) : null
  const tk = arquivoTicket ? ticketLido(arquivoTicket, tkJson) : null
  if (!tk) falta.push('ticket')

  // a série: os INICIO do id desde o último desfecho anterior até o BLOQUEADO
  const doId = trilha.filter((l) => l.id === id)
  const iBloq = doId.map((l) => l.evento).lastIndexOf('BLOQUEADO')
  const bloq = iBloq >= 0 ? doId[iBloq]! : null
  const ate = iBloq >= 0 ? iBloq : doId.length
  const inicios: LinhaTrilha[] = []
  for (let i = ate - 1; i >= 0; i--) {
    const l = doId[i]!
    if (['BLOQUEADO', 'APROVADO', 'RECUPERADO'].includes(l.evento)) break
    if (l.evento === 'INICIO') inicios.unshift(l)
  }
  const meta = lerJson<{ attempt: number; diffLines?: number; duracaoSecs?: number; dir?: string; ts?: string }[]>(join(runs, id, 'meta.json')) ?? []
  if (!meta.length) falta.push('meta')
  const motivoBloq = bloq?.campos.motivo ?? null

  // O diretório de cada INICIO (7f-b5): a entrada do meta com `dir` que
  // terminou depois dele e até o INICIO seguinte. O `attempt=` do INICIO não
  // basta: no 243 a volta que terminou em REFATIAR e a seguinte começam as
  // duas em `attempt=1`, e `attempt-(N-1)` lia o attempt-0 duas vezes e nunca
  // o attempt-3. Sem `dir`/`ts` no meta (ou já usado), vale `attempt-(N-1)`.
  const usados = new Set<string>()
  const dirDoInicio = (k: number, N: number): string => {
    const de = Date.parse(inicios[k]!.ts)
    const ate = k + 1 < inicios.length ? Date.parse(inicios[k + 1]!.ts) : Infinity
    const m = meta.find((x) => {
      const t = x.ts ? Date.parse(x.ts) : NaN
      return typeof x.dir === 'string' && /^attempt-\d+$/.test(x.dir) && !usados.has(x.dir) && t > de && t <= ate
    })
    const dir = m?.dir && !usados.has(m.dir) ? m.dir : `attempt-${N - 1}`
    usados.add(dir)
    return dir
  }

  const lidos: Lido[] = []
  const lido = (a: Arquivo, inteiro = true) => {
    let st: { size: bigint; mtimeNs: bigint } | null = null
    try {
      st = statSync(join(raiz, a.rel), { bigint: true })
    } catch {
      st = null
    }
    lidos.push({
      arquivo: a.rel,
      tamanho: Number(st?.size ?? 0n),
      mtime_ns: (st?.mtimeNs ?? 0n).toString(),
      conteudo: a.linhas.map((l) => l.t).join('\n'),
      ...(inteiro ? {} : { faixas: faixas(a.linhas.map((l) => l.n)) }),
    })
  }
  const lerArq = (rel: string): Arquivo | null => {
    try {
      const linhas = linhasDe(readFileSync(join(raiz, rel), 'utf8'))
      return { rel, linhas, total: linhas.length }
    } catch {
      return null
    }
  }

  const tentativas: Tentativa[] = inicios.map((ini, k) => {
    const N = Number(ini.campos.attempt ?? k + 1)
    const dirNome = dirDoInicio(k, N)
    const dirRel = `${runsRel}/${id}/${dirNome}`
    const dirAbs = join(raiz, dirRel)
    if (!existsSync(dirAbs)) falta.push(`${dirRel}/`)
    const gates = lerArq(`${dirRel}/gates.txt`)
    const gatesTxt = gates ? gates.linhas.map((l) => l.t).join('\n') : null
    // o recorte do gate que reprovou vem no próprio gates.txt (`--- recorte de X ---`)
    const iRec = gates ? gates.linhas.findIndex((l) => /^--- recorte de .* ---$/.test(l.t)) : -1
    const recorte: Arquivo | null = gates && iRec >= 0 ? { rel: gates.rel, linhas: gates.linhas.slice(iRec + 1), total: gates.total } : null
    const v = recorte ? vermelhosDe(recorte) : { vermelhos: [], arquivos: [], falhas: [], maquina: [] }
    const patch = lerArq(`${dirRel}/diff.patch`)
    const dp = patch ? diffPatch(patch) : null
    const vd = lerJson<{ motivo?: string; criterios_falhos?: string[]; criteriosFalhos?: string[] }>(join(dirAbs, 'veredito.json'))
    const falhos = vd?.criterios_falhos ?? vd?.criteriosFalhos ?? (/reprovado\(s\):\s*(.*)$/.exec(vd?.motivo ?? '')?.[1] ?? '').split(/;\s*/).filter(Boolean)
    const crit = lerArq(`${dirRel}/criterios.txt`)
    const enf = lerArq(`${dirRel}/enforcement.json`)
    let enforcement: Tentativa['enforcement'] = null
    if (enf) {
      try {
        const j = JSON.parse(enf.linhas.map((l) => l.t).join('\n')) as { ok?: boolean; violations?: { tipo?: string; detalhe?: string }[] }
        enforcement = { ok: j.ok !== false, violacoes: (j.violations ?? []).map((x) => `${x.tipo ?? ''}: ${x.detalhe ?? ''}`), ref: ref(enf, 1, enf.linhas.map((l) => l.t).join(' ')) }
      } catch {
        enforcement = null
      }
    }
    const jz = lerArq(`${dirRel}/juiz.veredito.json`)
    const cl = lerArq(`${dirRel}/claude.txt`)
    let agente: string | null = null
    if (cl) {
      const txt = cl.linhas.map((l) => l.t).join('\n')
      try {
        const r = (JSON.parse(txt) as { result?: unknown }).result
        agente = typeof r === 'string' ? r : txt
      } catch {
        agente = txt
      }
    }
    for (const a of [gates, crit, enf, jz, patch]) if (a) lido(a)
    const m = meta.find((x) => x.dir === dirNome) ?? meta.find((x) => x.attempt === N - 1)
    return {
      n: k + 1,
      dir: dirRel,
      estagio: estagioKit(dirAbs, gatesTxt, k === inicios.length - 1, motivoBloq),
      vermelhos: v.vermelhos,
      arquivos_vermelhos: v.arquivos,
      falhas: v.falhas,
      criterios_falhos: crit ? criteriosFalhosKit(crit, falhos) : [],
      diff_arquivos: dp?.arquivos ?? [],
      diff_linhas: dp ? dp.linhas : typeof m?.diffLines === 'number' ? m.diffLines : null,
      diff_ref: dp?.ref ?? null,
      enforcement,
      juiz: jz ? juizDe(jz) : null,
      agente_disse: agente,
      head: null,
      dur_secs: typeof m?.duracaoSecs === 'number' ? m.duracaoSecs : null,
      maquina: v.maquina,
      recorte_vitest: recorte,
      recorte_criterios: crit,
      diff_stat: null,
      fontes: Object.fromEntries(v.arquivos.filter((a) => !(dp?.arquivos ?? []).includes(a)).map((a) => [a, null])),
    }
  })

  const refTrilha = (l: LinhaTrilha): Ref => ref(trilhaArq, l.n, l.t)
  const base_vermelha_motor =
    bloq && motivoBloq === 'base_vermelha'
      ? { arquivos: (bloq.campos.arquivos ?? '').split(',').filter(Boolean), ref: refTrilha(bloq) }
      : null
  const vizinhos: Vizinho[] = trilha
    .filter((l) => l.evento === 'BLOQUEADO' && l.campos.motivo === 'base_vermelha' && l.id !== id)
    .flatMap((l) =>
      (l.campos.arquivos ?? '').split(',').filter(Boolean).map((arquivo) => ({
        ticket: l.id,
        dir: trilhaRel,
        arquivo,
        linha: l.n,
        ts: l.ts,
        antes_do_bloqueio: !bloq || l.n < bloq.n,
      })),
    )
  const linhasDoId: Arquivo = { rel: trilhaRel, linhas: doId.map((l) => ({ n: l.n, t: l.t })), total: trilhaArq.total }
  if (doId.length) lido(linhasDoId, false)
  if (arquivoTicket) {
    const t = lerArq(arquivoTicket)
    if (t) lido(t)
  }
  const num = (v: unknown) => (typeof v === 'number' ? v : null)
  for (const t of tentativas) for (const [arq] of Object.entries(t.fontes)) falta.push(`fonte:${arq}@sem-head`)
  return {
    leitor: 'kit',
    repo: raiz,
    id,
    ticket: tk,
    bloqueio: {
      quando: bloq?.ts ?? null,
      token: bloq ? [motivoBloq, bloq.campos.sub].filter(Boolean).join(':') : null,
      nota_do_motor: tk?.notas_status ?? '',
      tentativas: tentativas.length,
      origem: bloq ? 'motor' : 'humano',
      refs: bloq ? [refTrilha(bloq)] : [],
    },
    tentativas,
    merge_recusado: null,
    motor: doId.filter((l) => ['REPROVADO', 'BLOQUEADO', 'GATE', 'JUIZ'].includes(l.evento)).map(refTrilha),
    base_vermelha_motor,
    vizinhos,
    config: { diff_cap_linhas: num(cfg.diff_cap_linhas), claude_timeout_secs: num(cfg.claude_timeout_secs) },
    falta,
    lidos,
  }
}
