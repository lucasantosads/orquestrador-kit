/**
 * Etapa 2.2.0, defeito A1-12: o gate-falha.txt guardava a saída inteira do
 * gate e o evento REPROVADO só o motivo genérico: para saber QUAL teste
 * quebrou era preciso garimpar o log. Pronto quando: o gate-falha.txt começa
 * com uma linha `# teste que falhou: <arquivo> > <nome>` por teste, e o lib.sh
 * devolve o primeiro como token de evento (`teste=<arquivo>::<nome>`, sem
 * espaço). Controle: saída sem FAIL de teste (tsc) não inventa teste.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { testesQueFalharam } from '../scripts/orquestrador/gates.js'
import { bashNoFixture, criarFixture, REPO_ROOT } from './fixtures/orq-harness.js'

const VITEST = [
  ' RUN  v2.1.9 /repo',
  ' ✓ test/a.test.ts (3 tests) 12ms',
  ' ❯ test/b.test.ts (2 tests | 1 failed) 20ms',
  '   × convite > envia pela API oficial 9ms',
  '',
  '⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯',
  '',
  ' FAIL  test/b.test.ts > convite > envia pela API oficial',
  'AssertionError: expected 0 to be 1',
  ' Test Files  1 failed | 1 passed (2)',
].join('\n')

describe('A1-12 · evidência do gate com arquivo e nome do teste', () => {
  it('testesQueFalharam lê o FAIL do vitest; tsc não vira teste', () => {
    expect(testesQueFalharam(VITEST)).toEqual([{ arquivo: 'test/b.test.ts', nome: 'convite > envia pela API oficial' }])
    expect(testesQueFalharam("src/x.ts(3,1): error TS2304: Cannot find name 'y'.")).toEqual([])
  })

  it('gates.ts --saida-falha escreve o cabeçalho; o lib.sh devolve o token do evento', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-gate-teste-'))
    writeFileSync(join(raiz, 'saida.txt'), VITEST)
    const cfg = join(raiz, 'config.json')
    writeFileSync(
      cfg,
      JSON.stringify({ gates: [{ nome: 'testes', cmd: 'cat saida.txt; exit 1', tipo: 'exit_code' }], _execucao_dos_gates: { ordem_obrigatoria: ['testes'] } }),
    )
    const arq = join(raiz, 'gate-falha.txt')
    spawnSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), [join(REPO_ROOT, 'scripts', 'orquestrador', 'gates.ts'), '--run-cli', raiz, '--config', cfg, '--saida-falha', arq], { encoding: 'utf8' })
    const txt = readFileSync(arq, 'utf8')
    expect(txt.split('\n')[0]).toBe('# teste que falhou: test/b.test.ts > convite > envia pela API oficial')
    expect(txt).toContain(VITEST)
    const fx = criarFixture()
    const r = bashNoFixture(fx, `teste_falho_token "${arq}"`)
    expect(r.stdout).toBe('test/b.test.ts::convite_>_envia_pela_API_oficial')
  })
})
