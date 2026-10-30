/**
 * r1.ts — a ação de R1 (teste acoplado fora da allowlist), no formato do
 * conserto humano do 840 (7787af3, ~/orq-sessoes/conserto-840-929.md):
 *
 *   1. o teste vai para o fim de `pathspec_allowlist`;
 *   2. todo critério cujo cmd lista os arquivos permitidos (todos os caminhos
 *      da allowlist, entre aspas simples) ganha o mesmo caminho depois do
 *      último deles — sem isso, editar o teste daria `FORA_<teste>` e o ticket
 *      bloquearia de novo;
 *   3. a guarda de contagem entra depois da última guarda (`tipo: guarda`), ou
 *      antes do critério do avaliador: `it(`+`test(` e `expect(` no mínimo a
 *      contagem ATUAL do teste no branch alvo, e zero `.skip/.only/.todo` (o
 *      piso numérico do 711b3, com `|| true` e `${x:-…}`, que não aborta sob
 *      `set -u`);
 *   4. o ticket reabre (status `pendente`, nota vazia).
 *
 * Mais de um vermelho fora (7f-b7): tudo ou nada. Cada um tem de cumprir
 * SOZINHO a D6 ou a D6b (`extracao.r1_testes`); se um só não cumpre, nenhuma
 * ação. Cumprindo, todos entram de uma vez: na allowlist, no critério da
 * lista, uma guarda de contagem por teste, num commit só (uma ação).
 *
 * Só planeja: devolve o .md novo ou o motivo de não conseguir. Quem escreve é
 * acoes.ts. O git é só `gitLeitura` (show do branch alvo).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { gitLeitura } from '../triador/git.js'
import type { Diagnostico } from '../triador/triar.js'
import { acrescentarAllowlist, bloco, EdicaoRecusada, inserirCriterio, reabrir, trocarCmd } from './ticket-md.js'

export type Plano<T> = { ok: true; plano: T } | { ok: false; motivo: string }

export interface Contagem {
  it: number
  test: number
  expect: number
  skip: number
}

export interface TesteR1 {
  teste: string
  /** a regra que o teste cumpre sozinho */
  regra: string
  /** o ref onde a contagem foi medida (`staging-auto` ou `origin/staging-auto`) */
  ref: string
  contagem: Contagem
}

export interface PlanoR1 {
  /** os testes que entram, na ordem do diagnóstico (um, ou todos os vermelhos fora) */
  testes: TesteR1[]
  /** índices dos critérios que listam os arquivos permitidos (os caminhos entraram neles) */
  criteriosLista: number[]
  /** índices dos critérios novos (as guardas, uma por teste) no ticket novo */
  guardas: number[]
  novo: string
}

/** Contagem por LINHA, como `grep -c` (a mesma régua que a guarda usa ao rodar). */
export function contar(fonte: string): Contagem {
  const ls = fonte.split('\n')
  if (ls.at(-1) === '') ls.pop()
  const n = (f: (l: string) => boolean) => ls.filter(f).length
  return {
    it: n((l) => l.includes('it(')),
    test: n((l) => l.includes('test(')),
    expect: n((l) => l.includes('expect(')),
    skip: n((l) => /[.](skip|only|todo)[(]/.test(l)),
  }
}

const shellSeguro = (s: string) => (/^[A-Za-z0-9._/-]+$/.test(s) ? s : `'${s.replace(/'/g, `'\\''`)}'`)

/** O cmd da guarda, letra por letra o do 840 (piso numérico do 711b3). */
export function cmdGuarda(teste: string, minItTest: number, minExpect: number): string {
  return (
    `f=${shellSeguro(teste)}; [ -f "$f" ] || { echo APAGOU_$f; exit 0; }; ` +
    `i=$(grep -cF 'it(' "$f" || true); t=$(grep -cF 'test(' "$f" || true); e=$(grep -cF 'expect(' "$f" || true); ` +
    `s=$(grep -cE '[.](skip|only|todo)[(]' "$f" || true); ` +
    `[ $(( \${i:-0} + \${t:-0} )) -ge ${minItTest} ] && [ "\${e:-0}" -ge ${minExpect} ] && [ "\${s:-x}" = 0 ] && echo CONTAGEM_MANTIDA || echo CAIU_\${i:-x}_\${t:-x}_\${e:-x}_\${s:-x}`
  )
}

const ddmm = (agora: number) => {
  const d = new Date(agora)
  return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}

export function descricaoGuarda(teste: string, c: Contagem, ref: string, assinatura: string, agora: number, regra = 'D6'): string {
  const porque = regra === 'D6b' ? 'vermelho fora da allowlist e barrado pelo enforcement' : 'vermelho fora da allowlist acoplado ao diff'
  return (
    `anti-afrouxamento: ${teste} (entrou na allowlist em ${ddmm(agora)} pelo resolvedor, R1 ${regra} ${assinatura.slice(0, 12)}: ${porque}) ` +
    `mantem >= ${c.it + c.test} it(/test( e >= ${c.expect} expect( e nao tem .skip/.only/.todo ` +
    `(medido em ${ref} em ${ddmm(agora)}: ${c.it} it(, ${c.test} test(, ${c.expect} expect(, ${c.skip} skip/only/todo)`
  )
}

/** O branch alvo do config do repo (`branch_alvo`, padrão `staging-auto`, o mesmo do triador). */
export function branchAlvo(raiz: string): string {
  try {
    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { branch_alvo?: unknown }
    if (typeof c.branch_alvo === 'string' && c.branch_alvo) return c.branch_alvo
  } catch {
    /* sem config: o padrão */
  }
  return 'staging-auto'
}

/** O arquivo no branch alvo (local, depois `origin/`), por `gitLeitura`. */
export function noAlvo(raiz: string, arquivo: string): { ref: string; texto: string } | null {
  const alvo = branchAlvo(raiz)
  for (const ref of [alvo, `origin/${alvo}`]) {
    const r = gitLeitura(raiz, ['show', `${ref}:${arquivo}`])
    if (r.rc === 0) return { ref, texto: r.stdout }
  }
  return null
}

/** Os testes que o R1 põe na allowlist, ou o motivo de não pôr nenhum (tudo ou nada). */
function testesDoPlano(diag: Diagnostico): { ok: true; testes: { teste: string; regra: string }[] } | { ok: false; motivo: string } {
  const nomeado = /^pôr (\S+) na allowlist/.exec(diag.remedio)?.[1]
  const fora = diag.extracao.fora_da_allowlist_e_do_diff
  if (!nomeado) return { ok: false, motivo: 'o remédio do diagnóstico não nomeia o teste' }
  if (fora.length === 1 && fora[0] === nomeado) return { ok: true, testes: [{ teste: nomeado, regra: diag.regra ?? 'D6' }] }
  const por = diag.extracao.r1_testes
  if (fora.length < 2 || !fora.includes(nomeado)) return { ok: false, motivo: `o remédio nomeia ${nomeado}, fora da allowlist estão ${fora.join(', ') || 'nenhum'}` }
  if (!por) return { ok: false, motivo: `mais de um vermelho fora da allowlist (${fora.join(', ')}) num diagnóstico sem a regra por teste: um conserto só não destrava` }
  const regra = (f: string) => por.find((p) => p.arquivo === f)?.regra ?? null
  const fracos = fora.filter((f) => !regra(f))
  if (fracos.length) {
    return { ok: false, motivo: `mais de um vermelho fora da allowlist, tudo ou nada: ${fracos.join(', ')} não cumpre D6 nem D6b sozinho; nenhuma ação` }
  }
  return { ok: true, testes: fora.map((f) => ({ teste: f, regra: regra(f)! })) }
}

export function planejarR1(raiz: string, diag: Diagnostico, md: string, agora: number): Plano<PlanoR1> {
  const quais = testesDoPlano(diag)
  if (!quais.ok) return quais
  let j: Record<string, unknown>
  try {
    j = bloco(md).json
  } catch (e) {
    return { ok: false, motivo: (e as Error).message }
  }
  const al = Array.isArray(j.pathspec_allowlist) ? (j.pathspec_allowlist as unknown[]).filter((x): x is string => typeof x === 'string') : []
  const testes: TesteR1[] = []
  for (const { teste, regra } of quais.testes) {
    if (al.includes(teste)) return { ok: false, motivo: `${teste} já está na allowlist` }
    const fonte = noAlvo(raiz, teste)
    if (!fonte) return { ok: false, motivo: `${teste} não existe no branch alvo (${branchAlvo(raiz)}): sem contagem para a guarda` }
    const c = contar(fonte.texto)
    if (c.skip > 0) return { ok: false, motivo: `${teste} já tem ${c.skip} .skip/.only/.todo em ${fonte.ref}: a guarda exige zero` }
    if (c.it + c.test === 0 || c.expect === 0) return { ok: false, motivo: `${teste} sem it(/test( ou expect( em ${fonte.ref}: nada a guardar` }
    testes.push({ teste, regra, ref: fonte.ref, contagem: c })
  }

  const cs = Array.isArray(j.criterios_aceite) ? (j.criterios_aceite as Record<string, unknown>[]) : []
  const lista: number[] = []
  cs.forEach((cr, i) => {
    if (typeof cr?.cmd === 'string' && al.length > 0 && al.every((a) => (cr.cmd as string).includes(`'${a}'`))) lista.push(i)
  })
  let ultimaGuarda = -1
  cs.forEach((cr, i) => {
    if (cr?.tipo === 'guarda') ultimaGuarda = i
  })
  const avaliador = cs.findIndex((cr) => cr?.espera === 'avaliador')
  const depoisDe = ultimaGuarda >= 0 ? ultimaGuarda : avaliador > 0 ? avaliador - 1 : cs.length - 1
  if (depoisDe < 0) return { ok: false, motivo: 'ticket sem critério: não há onde pôr a guarda' }

  try {
    let novo = md
    for (const t of testes) novo = acrescentarAllowlist(novo, t.teste)
    const aspas = testes.map((t) => ` '${t.teste}'`).join('')
    for (const i of lista) {
      const cmd = cs[i]!.cmd as string
      let fim = -1
      for (const a of al) {
        const p = cmd.lastIndexOf(`'${a}'`)
        if (p >= 0) fim = Math.max(fim, p + a.length + 2)
      }
      novo = trocarCmd(novo, i, `${cmd.slice(0, fim)}${aspas}${cmd.slice(fim)}`)
    }
    testes.forEach((t, k) => {
      novo = inserirCriterio(novo, depoisDe + k, {
        descricao: descricaoGuarda(t.teste, t.contagem, t.ref, diag.assinatura, agora, t.regra),
        cmd: cmdGuarda(t.teste, t.contagem.it + t.contagem.test, t.contagem.expect),
        espera: 'CONTAGEM_MANTIDA',
        tipo: 'guarda',
      })
    })
    novo = reabrir(novo)
    return { ok: true, plano: { testes, criteriosLista: lista, guardas: testes.map((_, k) => depoisDe + 1 + k), novo } }
  } catch (e) {
    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
    throw e
  }
}
