/**
 * Etapa M69, P1 — a chave `selecao_testes` é lida e validada; ausente = inteira.
 *
 * Valor inválido é FALHA ALTA nas duas portas: o preflight do executor adia o
 * run (ADIADO motivo=preflight, nenhuma tentativa consumida) e o `gates.ts
 * --run-cli` sai rc 2 sem rodar gate nenhum. `modo: "inteira"` escrito por
 * extenso é o motor de hoje, byte a byte, como a chave ausente.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { describeHarness, criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js'
import { CONFIGS, OURO, cenario, configCom, promptETools, rodarGatesCli, semMs, semTmp } from './fixtures/m69/harness.js'
import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js'
import { SUITE_INTEIRA_PADRAO, papelDoGate, validarSelecao } from '../scripts/orquestrador/selecao-testes.js'

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh')
const TEMPLATE = join(REPO_ROOT, 'doutrina', 'templates', 'config.json')

type Gate = { nome: string; cmd: string; papel?: string; selecao_testes?: unknown }
const SOMBRA = {
  modo: 'sombra',
  cmd_afetados: 'npx vitest run --changed {base}',
  cmd_listar: 'npx vitest list --filesOnly --changed {base}',
}
const comSelecao = (sel: unknown, nome = 'vitest') => ({ gates: [{ nome, cmd: 'npx vitest run', selecao_testes: sel }] as Gate[] })

describe('validarSelecao', () => {
  it('ausente é válida', () => {
    expect(validarSelecao({ gates: [{ nome: 'vitest', cmd: 'npx vitest run' }] })).toEqual([])
  })

  it.each([
    ['inteira', { modo: 'inteira' }],
    ['sombra', SOMBRA],
    ['afetados com rede', { ...SOMBRA, modo: 'afetados', rede_suite_inteira: 'M-21 fila de merge' }],
    ['com listas', { ...SOMBRA, suite_inteira_se: ['package.json'], testes_sempre: ['test/a.test.ts'] }],
  ])('%s é válida', (_n, sel) => {
    expect(validarSelecao(comSelecao(sel))).toEqual([])
  })

  it.each([
    ['modo desconhecido', { modo: 'metade' }, /modo "metade" não é inteira, sombra nem afetados/],
    ['chave com erro de digitação', { modo: 'inteira', modos: 'x' }, /chave desconhecida 'modos'/],
    ['sombra sem cmd_listar', { modo: 'sombra', cmd_afetados: 'npx vitest run --changed {base}' }, /cmd_listar é obrigatório no modo sombra/],
    ['cmd sem {base}', { ...SOMBRA, cmd_afetados: 'npx vitest run' }, /cmd_afetados .* tem de conter \{base\}/],
    ['afetados sem rede', { ...SOMBRA, modo: 'afetados' }, /modo "afetados" exige rede_suite_inteira/],
    ['afetados com rede vazia', { ...SOMBRA, modo: 'afetados', rede_suite_inteira: '  ' }, /exige rede_suite_inteira/],
    ['lista que não é lista', { ...SOMBRA, testes_sempre: 'test/a.test.ts' }, /testes_sempre tem de ser lista/],
    ['não é objeto', 'sombra', /tem de ser objeto/],
  ])('%s é recusada', (_n, sel, msg) => {
    const erros = validarSelecao(comSelecao(sel))
    expect(erros.join('\n')).toMatch(msg)
  })

  it('em gate que não é de testes é recusada', () => {
    expect(validarSelecao(comSelecao({ modo: 'inteira' }, 'build')).join('\n')).toMatch(/não tem papel testes/)
  })

  it('em dois gates é recusada', () => {
    const c = { gates: [comSelecao({ modo: 'inteira' }).gates[0]!, { nome: 'testes_web', cmd: 'x', selecao_testes: { modo: 'inteira' } }] }
    expect(validarSelecao(c).join('\n')).toMatch(/selecao_testes em 2 gates \(vitest, testes_web\)/)
  })

  it('papel segue o papel_do_gate do executor (vitest e testes_por_pacote são testes)', () => {
    expect(papelDoGate({ nome: 'vitest' })).toBe('testes')
    expect(papelDoGate({ nome: 'testes_por_pacote' })).toBe('testes')
    expect(papelDoGate({ nome: 'tsc' })).toBe('typecheck')
    expect(papelDoGate({ nome: 'verificacao', papel: 'testes' })).toBe('testes')
  })
})

describeHarness('gates.ts --run-cli: selecao_testes inválida sai rc 2 sem rodar gate', () => {
  it('modo desconhecido no dashboard', () => {
    const cfg = configCom('dashboard', (c) => {
      ;(c.gates as Gate[]).find((g) => g.nome === 'testes')!.selecao_testes = { modo: 'metade' }
    })
    const r = rodarGatesCli(cfg, cenario(false))
    expect(r.rc).toBe(2)
    expect(r.gatesTxt).toContain('gates[testes].selecao_testes: modo "metade" não é inteira, sombra nem afetados')
    expect(r.chamadas).toBe('')
  })
})

describeHarness('preflight: selecao_testes inválida adia o run (falha alta)', () => {
  it('ADIADO motivo=preflight com a mensagem da chave', () => {
    const fx = criarFixture([])
    const cfg = configCom('dashboard', (c) => {
      ;(c.gates as Gate[]).find((g) => g.nome === 'testes')!.selecao_testes = { ...SOMBRA, modo: 'afetados' }
    })
    writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), cfg)
    const t = escreverTicket(fx, { id: '6902' })
    const r = spawnSync('bash', ['-c', `source "${EXECUTOR}"; preflight_ou_adia "${t}"`], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1' },
    })
    const ev = ler(join(fx, 'docs', 'fila', 'runs', 'events.log'))
    expect(ev, r.stderr).toMatch(/ 6902 ADIADO motivo=preflight causa=preflight: gates\[testes\]\.selecao_testes: modo "afetados" exige rede_suite_inteira/)
  })
})

describeHarness('modo "inteira" escrito por extenso = chave ausente, byte a byte', () => {
  for (const repo of ['comarka', 'dashboard'] as const) {
    const nomeTestes = repo === 'comarka' ? 'vitest' : 'testes'
    const cfg = configCom(repo, (c) => {
      ;(c.gates as Gate[]).find((g) => g.nome === nomeTestes)!.selecao_testes = { modo: 'inteira' }
    })
    it(`${repo}: prompt e tools`, () => {
      const r = promptETools(cfg)
      expect(semTmp(r.prompt)).toBe(readFileSync(join(OURO, `${repo}-prompt.txt`), 'utf8'))
      expect(`${r.tools}\n`).toBe(readFileSync(join(OURO, `${repo}-tools.txt`), 'utf8'))
    })
    it.each([['verde', false], ['vermelho', true]] as const)(`${repo} %s: gates.txt e gate-falha.txt`, (nome, v) => {
      const r = rodarGatesCli(cfg, cenario(v))
      expect(`rc=${r.rc}\n${semMs(semTmp(r.gatesTxt))}`).toBe(readFileSync(join(OURO, `${repo}-${nome}-gates.txt`), 'utf8'))
      expect(r.falha).toBe(readFileSync(join(OURO, `${repo}-${nome}-gate-falha.txt`), 'utf8'))
    })
  }
})

describe('documentação da chave', () => {
  it('config-chaves lista gates[].selecao_testes como opcional', () => {
    const e = CHAVES_CONFIG.find((c) => c.chave === 'gates[].selecao_testes')
    expect(e?.obrigatoria).toBe(false)
    expect(e?.onde).toMatch(/selecao-testes\.ts/)
  })

  it('o template documenta a chave e a lista padrão de suite_inteira_se', () => {
    const t = JSON.parse(readFileSync(TEMPLATE, 'utf8')) as Record<string, unknown>
    const doc = t._selecao_testes as { _descricao: string; exemplo: { suite_inteira_se: string[] } }
    expect(doc._descricao).toMatch(/ausente.*inteira/i)
    expect(doc.exemplo.suite_inteira_se).toEqual([...SUITE_INTEIRA_PADRAO])
    expect(validarSelecao({ gates: [{ nome: 'testes', cmd: 'x', selecao_testes: doc.exemplo }] })).toEqual([])
  })

  it('os configs reais desta etapa não têm a chave (o ouro é do motor sem ela)', () => {
    for (const c of Object.values(CONFIGS)) expect(readFileSync(c, 'utf8')).not.toContain('selecao_testes')
  })
})
