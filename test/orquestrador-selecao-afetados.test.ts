/**
 * Etapa M69, P5 — modo afetados: o gate de testes roda só o conjunto afetado.
 *
 * O que roda é o `cmd` do PRÓPRIO gate com a lista de arquivos no fim (o
 * conjunto do `cmd_listar` mais os `testes_sempre`), não o `cmd_afetados`:
 * medido no vitest 4.1.9, `run --changed <base> <arquivo>` é INTERSEÇÃO (e sai
 * rc 0 com "No test files found"), então os `testes_sempre` não rodariam. A
 * lista explícita é o mesmo conjunto que a sombra mede. Por isso `afetados`
 * exige gate com comando simples (sem `;`, `&&`, `|`, subshell).
 *
 * Nome do gate, linha ok/FALHA, recorte e gate-falha.txt: os de hoje. Depois do
 * VEREDITO, uma linha `selecao:` diz ao juiz o que rodou (Q-M69-4).
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { describeHarness } from './fixtures/orq-harness.js'
import { OURO, cenario, configCom, rodarGatesCli, semMs, semTmp, type Cenario } from './fixtures/m69/harness.js'
import { checarSelecao, preVooRelampago, type PreVooDeps } from '../scripts/orquestrador/prevoo.js'
import { validarSelecao } from '../scripts/orquestrador/selecao-testes.js'

type Gate = { nome: string; cmd: string; selecao_testes?: unknown }
const AFETADOS = {
  modo: 'afetados',
  cmd_afetados: 'node_modules/.bin/vitest run --changed {base}',
  cmd_listar: 'node_modules/.bin/vitest list --filesOnly --changed {base}',
  rede_suite_inteira: 'M-21 fila de merge',
}
const cfg = (extra: Record<string, unknown> = {}) =>
  configCom('dashboard', (c) => {
    ;(c.gates as Gate[]).find((g) => g.nome === 'testes')!.selecao_testes = { ...AFETADOS, ...extra }
  })

/** O diff do 1523 do Comarka (mais o que o caso pedir) sobre uma base commitada. */
function comDiff(raiz: string, extras: Record<string, string> = {}): string {
  const g = (...a: string[]) => spawnSync('git', ['-C', raiz, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
  writeFileSync(join(raiz, '.gitignore'), '.stub/\nnode_modules/\ngate-falha.txt\n')
  g('init', '-q', '-b', 'main')
  g('add', '-A')
  g('commit', '-qm', 'base')
  const base = g('rev-parse', 'HEAD').stdout.trim()
  const arqs = { 'scripts/roadmap/plano.py': 'print(1)\n', 'test/plano-brief.test.ts': '// teste\n', ...extras }
  for (const [a, c] of Object.entries(arqs)) {
    mkdirSync(join(raiz, a, '..'), { recursive: true })
    writeFileSync(join(raiz, a), c)
  }
  g('add', '-A')
  g('commit', '-qm', 'ticket')
  return base
}

function afetados(config: string, c: Cenario, extras: Record<string, string> = {}, comBase = true) {
  return rodarGatesCli(config, c, [], (raiz) => {
    const base = comDiff(raiz, extras)
    return comBase ? ['--base', base] : []
  })
}

const linhasSemSelecao = (t: string) => t.split('\n').filter((l) => !l.startsWith('selecao: ')).join('\n')

describeHarness('M69 P5: afetados roda o conjunto', () => {
  it('verde: o gate roda o cmd com a lista, e o gates.txt é o de hoje mais a linha selecao', () => {
    const c = cenario(false)
    c['vitest-list'] = { saida: 'test/plano-brief.test.ts\n', rc: 0 }
    const r = afetados(cfg(), c)
    // A escolha sai antes da passada: o cmd_listar roda antes do primeiro gate.
    expect(r.chamadas.split('\n').filter(Boolean)).toEqual([
      expect.stringMatching(/^vitest list --filesOnly --changed [0-9a-f]{40}$/),
      'tsc --noEmit',
      'vitest run test/plano-brief.test.ts',
      'next build',
    ])
    const txt = `rc=${r.rc}\n${semMs(semTmp(r.gatesTxt))}`
    expect(txt).toContain('VEREDITO: APROVADO\nselecao: afetados (1 arquivo(s) de teste afetado(s); suíte inteira: M-21 fila de merge)\n')
    expect(linhasSemSelecao(txt)).toBe(readFileSync(join(OURO, 'dashboard-verde-gates.txt'), 'utf8'))
  })

  it('vermelho no conjunto: FALHA testes, recorte e gate-falha.txt iguais aos de hoje', () => {
    const c = cenario(true)
    c['vitest-list'] = { saida: 'test/estado-plano-orfas.test.ts\ntest/plano-brief.test.ts\n', rc: 0 }
    const r = afetados(cfg(), c)
    expect(r.rc).toBe(1)
    expect(r.chamadas).toContain('vitest run test/estado-plano-orfas.test.ts test/plano-brief.test.ts\n')
    const txt = `rc=${r.rc}\n${semMs(semTmp(r.gatesTxt))}`
    expect(txt).toContain('VEREDITO: REPROVADO\nselecao: afetados (2 arquivo(s) de teste afetado(s); suíte inteira: M-21 fila de merge)\n')
    expect(linhasSemSelecao(txt)).toBe(readFileSync(join(OURO, 'dashboard-vermelho-gates.txt'), 'utf8'))
    expect(r.falha).toBe(readFileSync(join(OURO, 'dashboard-vermelho-gate-falha.txt'), 'utf8'))
  })

  it('testes_sempre rodam junto do conjunto', () => {
    const c = cenario(false)
    c['vitest-list'] = { saida: 'test/plano-brief.test.ts\n', rc: 0 }
    const r = afetados(cfg({ testes_sempre: ['test/sem-segredo-no-repo.test.ts'] }), c)
    expect(r.chamadas).toContain('vitest run test/plano-brief.test.ts test/sem-segredo-no-repo.test.ts\n')
  })

  it('fallback por package.json: a suíte inteira roda, sem listar, e a linha diz por quê', () => {
    const c = cenario(false)
    const r = afetados(cfg(), c, { 'package.json': '{}\n' })
    expect(r.chamadas.split('\n').filter(Boolean)).toEqual(['tsc --noEmit', 'vitest run', 'next build'])
    expect(r.gatesTxt).toContain('VEREDITO: APROVADO\nselecao: inteira (diff casa suite_inteira_se: package.json (**/package.json))\n')
  })

  it('conjunto vazio: a suíte inteira roda', () => {
    const c = cenario(false)
    c['vitest-list'] = { saida: '', rc: 0 }
    const r = afetados(cfg(), c)
    expect(r.chamadas).toMatch(/^vitest run$/m)
    expect(r.gatesTxt).toContain('selecao: inteira (conjunto afetado vazio)')
  })

  it('sem --base: a suíte inteira roda', () => {
    const r = afetados(cfg(), cenario(false), {}, false)
    expect(r.chamadas).toMatch(/^vitest run$/m)
    expect(r.gatesTxt).toContain('selecao: inteira (sem a base da tentativa)')
  })

  it('arquivo com aspas ou espaço vai citado para o bash', () => {
    const c = cenario(false)
    c['vitest-list'] = { saida: "test/it's.test.ts\n", rc: 0 }
    const r = afetados(cfg(), c)
    expect(r.chamadas).toContain("vitest run test/it's.test.ts\n")
  })
})

describe('M69 P5: recusas', () => {
  it('afetados sem rede_suite_inteira (gates.ts rc 2, já na P1)', () => {
    const r = rodarGatesCli(cfg({ rede_suite_inteira: undefined }), cenario(false))
    expect(r.rc).toBe(2)
    expect(r.gatesTxt).toContain('modo "afetados" exige rede_suite_inteira')
  })

  it('afetados em gate de comando composto (o testes_por_pacote do CI)', () => {
    const c = { gates: [{ nome: 'testes_por_pacote', cmd: 'set -e; npm test; (cd apps/web && npx vitest run)', selecao_testes: AFETADOS }] }
    expect(validarSelecao(c).join('\n')).toMatch(
      /gates\[testes_por_pacote\]\.selecao_testes: modo "afetados" exige que o cmd do gate seja um comando simples/,
    )
    expect(validarSelecao({ gates: [{ ...c.gates[0]!, selecao_testes: { ...AFETADOS, modo: 'sombra' } }] })).toEqual([])
  })

  const deps = {
    tsxLocal: () => true,
    arquivoComConteudo: () => true,
    contarArquivosCommitados: () => 6,
    lerOrigin: () => 'git@github.com:x/dash.git',
    lerEnv: () => 'X=1',
    filaTemArquivo: () => true,
    filaTemDir: () => true,
    lerLiberacoes: () => '{"tokens":[]}',
    ultimaSondagem: () => ({ dia: '2026-11-07', falhou: false }),
    hoje: () => '2026-11-07',
  } as unknown as PreVooDeps

  it('pré-voo cat.10: NO-GO com a mensagem da chave', () => {
    const config = { gates: [{ nome: 'testes', cmd: 'node_modules/.bin/vitest run', selecao_testes: { ...AFETADOS, rede_suite_inteira: '' } }] }
    const v = preVooRelampago({ config, deps })
    expect(v).toMatchObject({ ok: false, token: 'cat.10', item: 'pré-voo cat.10 (selecao_testes)' })
    expect(v.motivo).toMatch(/modo "afetados" exige rede_suite_inteira/)
  })

  it('pré-voo cat.10: só aparece com a chave', () => {
    expect(checarSelecao({ gates: [{ nome: 'testes', cmd: 'x' }] })).toBeNull()
    const v = preVooRelampago({ config: { gates: [{ nome: 'testes', cmd: 'node_modules/.bin/vitest run', selecao_testes: AFETADOS }] }, deps })
    expect(v.ok).toBe(true)
    expect(v.itens.map((i) => i.token)).toContain('cat.10')
    expect(preVooRelampago({ config: {}, deps }).itens.map((i) => i.token)).not.toContain('cat.10')
  })
})
