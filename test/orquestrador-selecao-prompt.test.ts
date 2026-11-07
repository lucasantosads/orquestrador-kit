/**
 * Etapa M69, P4 — o prompt do executor manda rodar só os afetados.
 *
 * Em sombra e afetados, o item 2 de ENTREGA ganha uma linha: o gate de testes
 * se roda com o `cmd_afetados` já com a base da tentativa (e os
 * `testes_sempre`, se houver), não com a suíte inteira. O comando entra no
 * `--allowedTools` da MESMA chamada (defeito 2026-10-30: prompt que manda
 * rodar o que a permissão nega). Em inteira e sem a chave, o texto e as tools
 * são os do ouro, byte a byte (P1).
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { describeHarness } from './fixtures/orq-harness.js'
import { OURO, configCom, promptETools, semTmp, type Repo } from './fixtures/m69/harness.js'

type Gate = { nome: string; selecao_testes?: unknown }
const SPECS = {
  dashboard: {
    nome: 'testes',
    cmd_afetados: 'node_modules/.bin/vitest run --changed {base}',
    cmd_listar: 'node_modules/.bin/vitest list --filesOnly --changed {base}',
    gateCmd: 'node_modules/.bin/vitest run',
  },
  comarka: {
    nome: 'vitest',
    cmd_afetados: 'npx vitest run --changed {base}',
    cmd_listar: 'npx vitest list --filesOnly --changed {base}',
    gateCmd: 'npx vitest run',
  },
} as const

function comModo(repo: keyof typeof SPECS, modo: string, extra: Record<string, unknown> = {}) {
  const s = SPECS[repo]
  return configCom(repo as Repo, (c) => {
    ;(c.gates as Gate[]).find((g) => g.nome === s.nome)!.selecao_testes = {
      modo,
      cmd_afetados: s.cmd_afetados,
      cmd_listar: s.cmd_listar,
      rede_suite_inteira: 'M-21 fila de merge',
      ...extra,
    }
  })
}

const ouroTools = (repo: string) => readFileSync(join(OURO, `${repo}-tools.txt`), 'utf8').trim().split(',')
const novasTools = (repo: string, r: { tools: string }) => r.tools.split(',').filter((t) => !ouroTools(repo).includes(t))
const linhaGates = (prompt: string) => prompt.split('\n').findIndex((l) => l.startsWith('2. Os gates deste repo, nesta ordem:'))

for (const repo of ['dashboard', 'comarka'] as const) {
  describeHarness(`M69 P4: prompt e tools em sombra e afetados (${repo})`, () => {
    const s = SPECS[repo]
    for (const modo of ['sombra', 'afetados'] as const) {
      it(`${modo}: o item 2 manda rodar os afetados com a base, e só isso muda no prompt`, () => {
        const r = promptETools(comModo(repo, modo))
        const cmd = s.cmd_afetados.replace('{base}', r.base)
        const linhas = semTmp(r.prompt).split('\n')
        const ouro = readFileSync(join(OURO, `${repo}-prompt.txt`), 'utf8').split('\n')
        const i = linhaGates(linhas.join('\n'))
        expect(i).toBeGreaterThan(-1)
        const nova = linhas[i + 1]!
        expect(nova).toBe(
          `   Gate ${s.nome}: rode só os testes afetados pelo seu diff, com '${cmd}'. NÃO rode a suíte inteira: ${modo === 'sombra' ? 'o motor roda a suíte inteira' : 'o motor roda os afetados'} depois de você.`,
        )
        // O resto do prompt é o do ouro, menos as tools novas da lista "COMO RODAR
        // COMANDOS" (ela sai da mesma string do --allowedTools).
        const novas = new Set(novasTools(repo, r).map((t) => `  - ${t}`))
        expect([...linhas.slice(0, i + 1), ...linhas.slice(i + 2)].filter((l) => !novas.has(l))).toEqual(ouro)
      })

      it(`${modo}: o comando de afetados está no --allowedTools da mesma chamada`, () => {
        const r = promptETools(comModo(repo, modo))
        const cmd = s.cmd_afetados.replace('{base}', r.base)
        const tools = r.tools.split(',')
        // `Bash(<prefixo>:*)` casa por prefixo: um deles cobre o comando inteiro.
        const cobre = tools.some((t) => {
          const m = /^Bash\((.*):\*\)$/.exec(t)
          return (m && cmd.startsWith(m[1]!)) || t === `Bash(${cmd})`
        })
        expect(cobre, `nenhuma tool cobre '${cmd}': ${r.tools}`).toBe(true)
        // Tudo o que havia continua, e o que entra a mais é só o comando de afetados.
        for (const t of ouroTools(repo)) expect(tools).toContain(t)
        expect(novasTools(repo, r)).toEqual(repo === 'dashboard' ? [`Bash(${cmd})`, `Bash(${cmd}:*)`] : [])
      })
    }

    it('testes_sempre entram na linha do prompt com o cmd do próprio gate', () => {
      const r = promptETools(comModo(repo, 'sombra', { testes_sempre: ['test/a.test.ts', 'test/b.test.ts'] }))
      expect(r.prompt).toContain(`e '${s.gateCmd} test/a.test.ts test/b.test.ts'.`)
    })

    it('inteira: prompt e tools iguais ao ouro', () => {
      const r = promptETools(comModo(repo, 'inteira'))
      expect(semTmp(r.prompt)).toBe(readFileSync(join(OURO, `${repo}-prompt.txt`), 'utf8'))
      expect(`${r.tools}\n`).toBe(readFileSync(join(OURO, `${repo}-tools.txt`), 'utf8'))
    })
  })
}

describeHarness('M69 P4: dashboard em sombra ganha a forma literal (node_modules/.bin)', () => {
  it('Bash(node_modules/.bin/vitest run --changed <base>) nas duas formas', () => {
    const r = promptETools(comModo('dashboard', 'sombra'))
    const cmd = `node_modules/.bin/vitest run --changed ${r.base}`
    expect(r.tools.split(',')).toEqual(expect.arrayContaining([`Bash(${cmd})`, `Bash(${cmd}:*)`]))
  })
})
