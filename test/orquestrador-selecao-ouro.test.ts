/**
 * Etapa M69 — chave `selecao_testes` AUSENTE = o motor de hoje, byte a byte.
 *
 * Os gabaritos de `test/fixtures/m69/ouro/` foram gravados com o motor de
 * `ee8c4a7` (antes da M69), rodando este mesmo arquivo com
 * `M69_GRAVAR_OURO=1`. Com os configs REAIS do Comarka (migrado pelo kit), do
 * CI e do dashboard, o prompt, o `--allowedTools`, o `gates.txt` e o
 * `gate-falha.txt` têm de sair iguais. O config da fila do próprio kit
 * (`docs/fila-kit/000-config.json`) entrou na etapa KF, com o ouro gravado
 * pelo mesmo motor `ee8c4a7`.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { expect, it } from 'vitest'
import { describeHarness } from './fixtures/orq-harness.js'
import { CONFIGS, OURO, cenario, promptETools, rodarGatesCli, semMs, semTmp, type Repo } from './fixtures/m69/harness.js'

const GRAVAR = process.env.M69_GRAVAR_OURO === '1'
const REPOS = Object.keys(CONFIGS) as Repo[]

function confere(nome: string, atual: string): void {
  const arq = join(OURO, nome)
  if (GRAVAR) {
    mkdirSync(OURO, { recursive: true })
    writeFileSync(arq, atual)
    return
  }
  expect(existsSync(arq), `gabarito ausente: ${arq}`).toBe(true)
  expect(atual).toBe(readFileSync(arq, 'utf8'))
}

describeHarness('M69: sem selecao_testes, prompt e --allowedTools iguais aos de ee8c4a7', () => {
  it.each(REPOS)('%s', (repo) => {
    const r = promptETools(readFileSync(CONFIGS[repo], 'utf8'))
    expect(r.prompt, r.stderr).not.toBe('')
    confere(`${repo}-prompt.txt`, semTmp(r.prompt))
    confere(`${repo}-tools.txt`, `${r.tools}\n`)
  })
})

describeHarness('M69: sem selecao_testes, gates.txt e gate-falha.txt iguais aos de ee8c4a7', () => {
  for (const repo of REPOS) {
    it.each([['verde', false], ['vermelho', true]] as const)(`${repo} %s`, (nome, vermelho) => {
      const r = rodarGatesCli(readFileSync(CONFIGS[repo], 'utf8'), cenario(vermelho))
      confere(`${repo}-${nome}-gates.txt`, `rc=${r.rc}\n${semMs(semTmp(r.gatesTxt))}`)
      confere(`${repo}-${nome}-gate-falha.txt`, r.falha)
      confere(`${repo}-${nome}-chamadas.txt`, r.chamadas)
    })
  }
})
