// Peça 4 (a) da 7f-b5: dos casos de allowlist do gabarito (edição humana depois de reprova),
// quantos o caminho atual (ticket bloqueado + R1 firme D6/D6b) pegaria, e quantos sairiam
// iguais ao humano. SÓ LEITURA do Comarka (GIT_OPTIONAL_LOCKS=0 via gitLeitura).
// uso: <kit>/node_modules/.bin/tsx ~/orq-sessoes/7f-b5/medir-allowlist.mts <kit>
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
const kit = process.argv[2]
const L = await import(`${kit}/scripts/orquestrador/triador/leitor-legado-comarka.ts`)
const { extrair } = await import(`${kit}/scripts/orquestrador/triador/extrair.ts`)
const { gitLeitura } = await import(`${kit}/scripts/orquestrador/triador/git.ts`)
const { blocoJson } = await import(`${kit}/scripts/orquestrador/triador/comum.ts`)
const { semAnsi, linhasDe } = await import(`${kit}/scripts/orquestrador/triador/recorte.ts`)
const R = '/Users/lucasantos/Projetos/comarka-operacional'
const runs = join(R, 'docs/fila/runs')
const gab = JSON.parse(readFileSync(`${process.env.HOME}/orq-sessoes/7f-b5/passo0/gab2.json`, 'utf8')) as any[]
const casos = gab.filter((o) => o.tipo === 'allowlist' && o.n_reprov > 0 && o.art && o.ultima_antes !== 'done')

// o log com a hora absoluta de cada linha (as "[orq HH:MM:SS]" herdam a data da última "[AAAA-MM-DD …]")
const todas = readFileSync(join(runs, 'local-loop.log'), 'utf8').split('\n')
const horas: number[] = []
{
  let dia = '', ult = 0
  for (const t of todas) {
    const f = /^\[(\d{4}-\d\d-\d\d) (\d\d:\d\d:\d\d)([-+]\d{4})\]/.exec(t)
    const o = /^\[orq (\d\d:\d\d:\d\d)\]/.exec(t)
    if (f) { dia = f[1]!; ult = Date.parse(`${f[1]}T${f[2]}${f[3]!.slice(0, 3)}:${f[3]!.slice(3)}`) }
    else if (o && dia) {
      // o [orq …] é UTC (date -u do lib.sh): monta com a data UTC do último carimbo
      const d = new Date(ult).toISOString().slice(0, 10)
      let x = Date.parse(`${d}T${o[1]}Z`)
      if (x < ult - 3600_000) x += 86400_000
      ult = x
    }
    horas.push(ult)
  }
}
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

function fonteAte(id: string, T: number, tk: { arquivo: string; json: any }) {
  const base = L.fonteRepoLegado(R, id, { agora: T })
  const metaBruto = (() => { const v = JSON.parse(readFileSync(join(runs, id, 'meta.json'), 'utf8')); return Array.isArray(v) ? v : [v] })()
  const metaSerie = L.serieDoMeta(metaBruto.filter((m: any) => Date.parse(m.ts) <= T))
  const fim = metaSerie.at(-1)?.ts ?? null
  const fimS = fim ? Date.parse(fim) / 1000 : T / 1000
  const ini = metaSerie[0] ? Date.parse(metaSerie[0].ts) / 1000 - (metaSerie[0].claude_dur_secs ?? 0) - 1800 : 0
  const mt = (d: string) => { let m = 0; for (const f of readdirSync(d)) m = Math.max(m, statSync(join(d, f)).mtimeMs / 1000); return m }
  const serie: { k: number; dir: string }[] = []
  for (const m of metaSerie) {
    let melhor: { m: number; d: string } | null = null
    for (const c of readdirSync(join(runs, id)).filter((d) => d === `attempt-${m.attempt}` || d.startsWith(`attempt-${m.attempt}.prev`))) {
      const x = mt(join(runs, id, c))
      if (x >= ini && x <= fimS + 180 && (!melhor || x > melhor.m)) melhor = { m: x, d: c }
    }
    if (melhor) serie.push({ k: m.attempt, dir: `docs/fila/runs/${id}/${melhor.d}` })
  }
  // o log até T: o último bloqueio do ticket e a série dele
  let cache: any[] | null = null
  const log = () => {
    if (cache) return cache
    const re = new RegExp(String.raw`ticket ${escape(id)}: (BLOQUEADO|reprovado após)`)
    let fimL = -1
    for (let i = todas.length - 1; i >= 0; i--) if (horas[i]! <= T && re.test(todas[i]!)) { fimL = i; break }
    if (fimL < 0 || horas[fimL]! < fimS * 1000 - 600_000) return (cache = [])
    const cab = new RegExp(String.raw`=== ticket ${escape(id)} \(.*\) — tentativa (\d+) `)
    let i0 = fimL
    while (i0 >= 0) { const m = cab.exec(todas[i0]!); if (m?.[1] === '1') break; i0-- }
    if (i0 < 0) return (cache = [])
    cache = []
    for (let i = i0; i <= fimL; i++) cache.push({ n: i + 1, t: semAnsi(todas[i]!) })
    return cache
  }
  return { ...base, ticket: () => tk, serie: () => serie, meta: () => metaSerie, fim: () => fim, log, vizinhos: () => vizinhos(fimS) }
}

function vizinhos(fimS: number) {
  const out: any[] = []
  for (const t of readdirSync(runs)) {
    let ts: string[] = []
    try { ts = readdirSync(join(runs, t)).filter((d) => d.startsWith('attempt-')) } catch { continue }
    for (const a of ts) {
      const p = join(runs, t, a, 'gate-vitest.txt')
      let mt: number
      try { mt = statSync(p).mtimeMs / 1000 } catch { continue }
      if (Math.abs(mt - fimS) > 6 * 3600) continue
      const vistos = new Map<string, number>()
      for (const l of linhasDe(readFileSync(p, 'utf8'))) { const m = /^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)/.exec(l.t); if (m && !vistos.has(m[1]!)) vistos.set(m[1]!, l.n) }
      for (const [arquivo, linha] of vistos) out.push({ ticket: t.split('.')[0]!, dir: relative(R, join(runs, t, a)), arquivo, linha, ts: new Date(mt * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'), antes_do_bloqueio: mt <= fimS + 180 })
    }
  }
  return out
}

const out: any[] = []
for (const o of casos) {
  const sha = gitLeitura(R, ['rev-parse', o.commit]).stdout.trim()
  const T = Date.parse(gitLeitura(R, ['show', '-s', '--format=%cI', sha]).stdout.trim())
  const arq = gitLeitura(R, ['ls-tree', '--name-only', `${sha}^`, 'docs/fila/']).stdout.split('\n').find((f: string) => f.startsWith(`docs/fila/${o.id}-`))
  const json = blocoJson(gitLeitura(R, ['show', `${sha}^:${arq}`]).stdout)
  const fonte = fonteAte(o.id, T, { arquivo: arq, json })
  const ev = L.normalizarLegado(fonte)
  const bloqueado = ev.bloqueio.origem === 'motor'
  const ext = extrair(ev)
  const r1 = ext.classe === 'R1' && ext.firme && (ext.regra === 'D6' || ext.regra === 'D6b')
  const teste = r1 ? /^pôr (\S+) na allowlist/.exec(ext.remedio)?.[1] ?? null : null
  const humano: string[] = o.al_add
  const pegaria = bloqueado && r1
  const igual = pegaria && humano.length === 1 && humano[0] === teste
  const contem = pegaria && !!teste && humano.includes(teste)
  out.push({ id: o.id, commit: o.commit, data: o.data, tentativas: ev.tentativas.length, bloqueio: ev.bloqueio.token, bloqueado, classe: ext.classe, regra: ext.regra, firme: ext.firme, estagios: ext.detalhe.estagios, fora: ext.detalhe.fora_da_allowlist_e_do_diff, acoplado: ext.detalhe.acoplado, teste, humano, pegaria, igual, contem, remedio: ext.remedio.slice(0, 160) })
}
for (const x of out) console.log(JSON.stringify(x))
