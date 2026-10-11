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

export interface PlanoR1 {
  teste: string
  /** o ref onde a contagem foi medida (`staging-auto` ou `origin/staging-auto`) */
  ref: string
  contagem: Contagem
  /** índices dos critérios que listam os arquivos permitidos (o caminho entrou neles) */
  criteriosLista: number[]
  /** índice do critério novo (a guarda) no ticket novo */
  guarda: number
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

export function descricaoGuarda(teste: string, c: Contagem, ref: string, assinatura: string, agora: number): string {
  return (
    `anti-afrouxamento: ${teste} (entrou na allowlist em ${ddmm(agora)} pelo resolvedor, R1 D6 ${assinatura.slice(0, 12)}: vermelho fora da allowlist acoplado ao diff) ` +
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

export function planejarR1(raiz: string, diag: Diagnostico, md: string, agora: number): Plano<PlanoR1> {
  const teste = /^pôr (\S+) na allowlist/.exec(diag.remedio)?.[1]
  const fora = diag.extracao.fora_da_allowlist_e_do_diff
  if (!teste) return { ok: false, motivo: 'o remédio do diagnóstico não nomeia o teste' }
  if (fora.length !== 1 || fora[0] !== teste) return { ok: false, motivo: `mais de um vermelho fora da allowlist (${fora.join(', ')}): um conserto só não destrava` }
  let j: Record<string, unknown>
  try {
    j = bloco(md).json
  } catch (e) {
    return { ok: false, motivo: (e as Error).message }
  }
  const al = Array.isArray(j.pathspec_allowlist) ? (j.pathspec_allowlist as unknown[]).filter((x): x is string => typeof x === 'string') : []
  if (al.includes(teste)) return { ok: false, motivo: `${teste} já está na allowlist` }
  const fonte = noAlvo(raiz, teste)
  if (!fonte) return { ok: false, motivo: `${teste} não existe no branch alvo (${branchAlvo(raiz)}): sem contagem para a guarda` }
  const c = contar(fonte.texto)
  if (c.skip > 0) return { ok: false, motivo: `${teste} já tem ${c.skip} .skip/.only/.todo em ${fonte.ref}: a guarda exige zero` }
  if (c.it + c.test === 0 || c.expect === 0) return { ok: false, motivo: `${teste} sem it(/test( ou expect( em ${fonte.ref}: nada a guardar` }

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
    let novo = acrescentarAllowlist(md, teste)
    for (const i of lista) {
      const cmd = cs[i]!.cmd as string
      let fim = -1
      for (const a of al) {
        const p = cmd.lastIndexOf(`'${a}'`)
        if (p >= 0) fim = Math.max(fim, p + a.length + 2)
      }
      novo = trocarCmd(novo, i, `${cmd.slice(0, fim)} '${teste}'${cmd.slice(fim)}`)
    }
    novo = inserirCriterio(novo, depoisDe, {
      descricao: descricaoGuarda(teste, c, fonte.ref, diag.assinatura, agora),
      cmd: cmdGuarda(teste, c.it + c.test, c.expect),
      espera: 'CONTAGEM_MANTIDA',
      tipo: 'guarda',
    })
    novo = reabrir(novo)
    return { ok: true, plano: { teste, ref: fonte.ref, contagem: c, criteriosLista: lista, guarda: depoisDe + 1, novo } }
  } catch (e) {
    if (e instanceof EdicaoRecusada) return { ok: false, motivo: `edição do ticket recusada: ${e.message}` }
    throw e
  }
}
