/**
 * Etapa M69, P3 — modo sombra: a suíte inteira roda e decide como hoje; o motor
 * só calcula o conjunto afetado e grava o que teria acontecido.
 *
 * O caso é o 1523 do Comarka (test/fixtures/instavel-l11/ORIGEM.md): o diff
 * mexe em `scripts/roadmap/plano.py` e `test/plano-brief.test.ts`, e a inteira
 * falha em `test/estado-plano-orfas.test.ts`, fora dele. Com o conjunto
 * afetado só com `test/plano-brief.test.ts`, isso é ESCAPE: rodando só os
 * afetados, a falha não teria aparecido.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { expect, it } from 'vitest'
import { describeHarness, criarFixture, ler, REPO_ROOT } from './fixtures/orq-harness.js'
import { OURO, cenario, configCom, rodarGatesCli, semMs, semTmp, type Cenario } from './fixtures/m69/harness.js'

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh')
type Gate = { nome: string; selecao_testes?: unknown }
const SOMBRA = {
  modo: 'sombra',
  cmd_afetados: 'node_modules/.bin/vitest run --changed {base}',
  cmd_listar: 'node_modules/.bin/vitest list --filesOnly --changed {base}',
}
const cfgSombra = configCom('dashboard', (c) => {
  ;(c.gates as Gate[]).find((g) => g.nome === 'testes')!.selecao_testes = SOMBRA
})

/** O diff do 1523 em cima de uma base, no próprio checkout de papel. */
function comDiff1523(raiz: string): string {
  const g = (...a: string[]) => spawnSync('git', ['-C', raiz, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
  writeFileSync(join(raiz, '.gitignore'), '.stub/\nnode_modules/\ngate-falha.txt\nselecao.json\n')
  g('init', '-q', '-b', 'main')
  g('add', '-A')
  g('commit', '-qm', 'base')
  const base = g('rev-parse', 'HEAD').stdout.trim()
  mkdirSync(join(raiz, 'scripts', 'roadmap'), { recursive: true })
  mkdirSync(join(raiz, 'test'), { recursive: true })
  writeFileSync(join(raiz, 'scripts', 'roadmap', 'plano.py'), 'print(1)\n')
  writeFileSync(join(raiz, 'test', 'plano-brief.test.ts'), '// teste\n')
  g('add', '-A')
  g('commit', '-qm', 'ticket 1523')
  return base
}

function sombra(c: Cenario) {
  return rodarGatesCli(cfgSombra, c, [], (raiz) => {
    const base = comDiff1523(raiz)
    return ['--base', base, '--selecao-json', join(raiz, 'selecao.json')]
  })
}

describeHarness('M69 P3: sombra', () => {
  it('inteira vermelha fora do conjunto afetado: escape detectado', () => {
    const c = cenario(true)
    c['vitest-list'] = { saida: 'test/plano-brief.test.ts\n', rc: 0 }
    const r = sombra(c)
    const s = JSON.parse(ler(join(r.raiz, 'selecao.json')))
    expect(s).toMatchObject({
      modo: 'sombra',
      arquivos_do_diff: ['scripts/roadmap/plano.py', 'test/plano-brief.test.ts'],
      escolha: { modo_efetivo: 'afetados', motivo: '1 arquivo(s) de teste afetado(s)', arquivos: ['test/plano-brief.test.ts'] },
      gate: 'testes',
      testes_rodou: true,
      inteira_ok: false,
      falhas_da_inteira: ['test/estado-plano-orfas.test.ts'],
      escape: true,
      escapes: ['test/estado-plano-orfas.test.ts'],
    })
    expect(typeof s.segundos_inteira).toBe('number')
    expect(r.chamadas).toMatch(/^vitest list --filesOnly --changed [0-9a-f]{40}$/m)
  })

  it('falha dentro do conjunto afetado: sem escape', () => {
    const c = cenario(true)
    c['vitest-list'] = { saida: 'test/estado-plano-orfas.test.ts\ntest/plano-brief.test.ts\n', rc: 0 }
    const s = JSON.parse(ler(join(sombra(c).raiz, 'selecao.json')))
    expect(s).toMatchObject({ escape: false, escapes: [], falhas_da_inteira: ['test/estado-plano-orfas.test.ts'] })
  })

  it('inteira verde: sem escape, e a estimativa sai das durações por arquivo', () => {
    const c = cenario(false)
    c['vitest-list'] = { saida: 'test/estado-plano-orfas.test.ts\n', rc: 0 }
    const s = JSON.parse(ler(join(sombra(c).raiz, 'selecao.json')))
    expect(s).toMatchObject({ inteira_ok: true, falhas_da_inteira: [], escape: false, estimativa: 'por_arquivo' })
  })

  it('fallback para inteira (cálculo falhou): sem escape possível, motivo gravado', () => {
    const c = cenario(true)
    c['vitest-list'] = { saida: 'Error: Failed to load config\n', rc: 1 }
    const s = JSON.parse(ler(join(sombra(c).raiz, 'selecao.json')))
    expect(s).toMatchObject({ escolha: { modo_efetivo: 'inteira', motivo: 'cmd_listar falhou (rc 1)' }, escape: false, segundos_afetados_estimados: s.segundos_inteira })
  })

  it.each([['verde', false], ['vermelho', true]] as const)('a decisão é a de hoje (%s): gates.txt e gate-falha.txt iguais ao ouro', (nome, v) => {
    const c = cenario(v)
    c['vitest-list'] = { saida: 'test/plano-brief.test.ts\n', rc: 0 }
    const r = sombra(c)
    expect(`rc=${r.rc}\n${semMs(semTmp(r.gatesTxt))}`).toBe(readFileSync(join(OURO, `dashboard-${nome}-gates.txt`), 'utf8'))
    expect(r.falha).toBe(readFileSync(join(OURO, `dashboard-${nome}-gate-falha.txt`), 'utf8'))
  })

  it('sem a chave, --base e --selecao-json não gravam nada', () => {
    const r = rodarGatesCli(readFileSync(join(REPO_ROOT, 'test/fixtures/m69/config-dashboard.json'), 'utf8'), cenario(true), [], (raiz) => {
      const base = comDiff1523(raiz)
      return ['--base', base, '--selecao-json', join(raiz, 'selecao.json')]
    })
    expect(ler(join(r.raiz, 'selecao.json'))).toBe('')
    expect(r.chamadas).not.toMatch(/vitest list/)
  })
})

describeHarness('M69 P3: linha SELECAO na trilha', () => {
  it('uma linha por tentativa com selecao.json; nenhuma sem ele', () => {
    const fx = criarFixture([])
    const rundir = join(fx, 'docs', 'fila', 'runs', '1523', 'attempt-1')
    mkdirSync(rundir, { recursive: true })
    const s = {
      modo: 'sombra',
      escolha: { modo_efetivo: 'afetados', motivo: '1 arquivo(s) de teste afetado(s)', arquivos: ['test/plano-brief.test.ts'] },
      escape: true,
      escapes: ['test/estado-plano-orfas.test.ts'],
      segundos_inteira: 41.5,
      segundos_afetados_estimados: 1.6,
    }
    const roda = () =>
      spawnSync('bash', ['-c', `source "${EXECUTOR}"; event_selecao 1523 "${rundir}"`], {
        encoding: 'utf8',
        cwd: fx,
        env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1' },
      })
    roda()
    expect(ler(join(fx, 'docs', 'fila', 'runs', 'events.log'))).toBe('')
    writeFileSync(join(rundir, 'selecao.json'), JSON.stringify(s))
    roda()
    expect(ler(join(fx, 'docs', 'fila', 'runs', 'events.log'))).toMatch(
      /^\S+ 1523 SELECAO modo=sombra efetivo=afetados n=1 escape=sim escapes=test\/estado-plano-orfas\.test\.ts s_inteira=41\.5 s_afetados=1\.6 motivo=1 arquivo\(s\) de teste afetado\(s\)\n$/,
    )
  })
})
