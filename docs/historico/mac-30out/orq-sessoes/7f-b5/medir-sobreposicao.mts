// Peça 3 da 7f-b5: a regra de allowlist sobreposta no corpus. SÓ LEITURA (git com GIT_OPTIONAL_LOCKS=0).
// uso: <kit>/node_modules/.bin/tsx ~/orq-sessoes/7f-b5/medir-sobreposicao.mts <kit>
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
const kit = process.argv[2]
const S = await import(`${kit}/scripts/orquestrador/resolvedor/sobreposicao.ts`)
const env = { ...process.env, GIT_OPTIONAL_LOCKS: '0' }
const git = (r: string, ...a: string[]) => spawnSync('git', ['-C', r, ...a], { encoding: 'utf8', env, maxBuffer: 1 << 28 }).stdout
const bloco = (md: string) => { const m = /```json\s*\n([\s\S]*?)\n```/.exec(md); try { return m ? JSON.parse(m[1]!) : null } catch { return null } }
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

/** a fila numa árvore do git (sha), pelo cat-file --batch */
function filaEm(r: string, rev: string) {
  const nomes = git(r, 'ls-tree', '--name-only', `${rev}:docs/fila/`).split('\n').filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
  const p = spawnSync('git', ['-C', r, 'cat-file', '--batch'], { input: nomes.map((f) => `${rev}:docs/fila/${f}`).join('\n') + '\n', env, maxBuffer: 1 << 28 })
  const out: any[] = []
  const buf: Buffer = p.stdout as unknown as Buffer
  let i = 0
  while (i < buf.length) {
    const nl = buf.indexOf(10, i)
    const cab = buf.subarray(i, nl).toString('utf8').split(' ')
    const tam = Number(cab[2])
    if (cab[1] === 'missing' || Number.isNaN(tam)) { i = nl + 1; continue }
    const corpo = buf.subarray(nl + 1, nl + 1 + tam).toString('utf8')
    i = nl + 1 + tam + 1
    const j = bloco(corpo)
    if (j && typeof j.id === 'string') out.push({ id: j.id, status: typeof j.status === 'string' ? j.status : '', allow: strs(j.pathspec_allowlist), deps: strs(j.dependencias).filter((d: string) => !d.startsWith('humano:')) })
  }
  return out
}

const REPOS = ['/Users/lucasantos/Projetos/comarka-operacional', '/Users/lucasantos/Projetos/actus-saas', '/Users/lucasantos/Projetos/conteudos-infinitos']
console.log('## estado atual (working tree)')
for (const r of REPOS) {
  const pares = S.sobreposicoes(r)
  console.log(JSON.stringify({ repo: r.split('/').pop(), pares: pares.length, exemplos: pares.slice(0, 5).map((p: any) => `${p.menor}<${p.maior} [${p.arquivos.join(' ')}]`) }))
}

const C = REPOS[0]!
console.log('## gabarito (árvore antes da edição humana)')
for (const [c, alvo, dep] of [['917d35bca', '826', '866'], ['ded72e169', '306b', '500'], ['ec421bcbe', '522', '522c']]) {
  const pares = S.sobreposicoesDe(filaEm(C, `${c}^`))
  const p = pares.find((x: any) => (x.menor === alvo && x.maior === dep) || (x.menor === dep && x.maior === alvo))
  console.log(JSON.stringify({ commit: c, humano: `${alvo} passa a depender do ${dep}`, par_detectado: !!p, direcao_da_regra: p ? `${p.maior} depende do ${p.menor}` : null, direcao_igual: p ? p.maior === alvo : null, arquivos: p?.arquivos ?? [], pares_no_repo_naquele_instante: pares.length }))
}

console.log('## histórico (main ao fim de cada dia, 11/09 a 10/10)')
const meta = (id: string) => { try { const v = JSON.parse(readFileSync(join(C, 'docs/fila/runs', id, 'meta.json'), 'utf8')); return Array.isArray(v) ? v : [v] } catch { return [] } }
const vistos = new Map<string, { primeiro: string; arquivos: string[] }>()
for (let d = Date.parse('2026-09-11T23:59:59-03:00'); d <= Date.parse('2026-10-10T23:59:59-03:00'); d += 86400_000) {
  const rev = git(C, 'rev-list', '-1', `--before=${new Date(d).toISOString()}`, 'main').trim()
  if (!rev) continue
  for (const p of S.sobreposicoesDe(filaEm(C, rev))) {
    const k = `${p.menor}<${p.maior}`
    if (!vistos.has(k)) vistos.set(k, { primeiro: new Date(d).toISOString(), arquivos: p.arquivos })
  }
}
// desfecho de cada par: o humano pôs dependência entre eles depois (acerto do par), os dois chegaram a done sem reprova depois do 1º dia (falso positivo), ou outro
const depsAgora = new Map<string, string[]>()
for (const t of S.lerFila(C)) depsAgora.set(t.id, t.deps)
const statusAgora = new Map<string, string>(S.lerFila(C).map((t: any) => [t.id, t.status]))
const cont: Record<string, number> = {}
const exemplos: Record<string, string[]> = {}
for (const [k, v] of vistos) {
  const [a, b] = k.split('<') as [string, string]
  const desde = Date.parse(v.primeiro) - 86400_000
  const reprovou = (id: string) => meta(id).some((m: any) => Date.parse(m.ts) >= desde && /reprovado|bloqueado/.test(m.resultado ?? ''))
  const ligados = (depsAgora.get(a) ?? []).includes(b) || (depsAgora.get(b) ?? []).includes(a)
  const ambosDone = statusAgora.get(a) === 'done' && statusAgora.get(b) === 'done'
  const r = ligados ? 'humano ligou os dois depois' : ambosDone && !reprovou(a) && !reprovou(b) ? 'falso positivo (os dois done sem reprova)' : ambosDone ? 'os dois done, com reprova (indeterminado)' : 'ainda aberto ou obsoleto (indeterminado)'
  cont[r] = (cont[r] ?? 0) + 1
  ;(exemplos[r] ??= []).length < 6 && exemplos[r]!.push(`${k} [${v.arquivos.slice(0, 2).join(' ')}]`)
}
console.log(JSON.stringify({ pares_distintos: vistos.size, desfecho: cont, exemplos }, null, 1))
