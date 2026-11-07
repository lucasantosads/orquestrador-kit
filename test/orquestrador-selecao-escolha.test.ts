/**
 * Etapa M69, P2 — a escolha pura: (diff com status, spec, listar) -> o que roda.
 *
 * Os diffs são de tickets e commits REAIS do Comarka (`git diff --name-status`,
 * só leitura; procedência em test/fixtures/m69/PROCEDENCIA.md). A saída do
 * `cmd_listar` tem o formato do `vitest list --filesOnly` 4.1.9 (um caminho por
 * linha), medido no PASSO 0.
 *
 * Cai para a inteira: diff que casa `suite_inteira_se`, diff que apaga ou
 * renomeia (o `--changed` não vê o teste que importava o arquivo apagado), erro
 * do cálculo e conjunto vazio (o vitest sai rc 0 com "No test files found").
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { M69 } from './fixtures/m69/harness.js'
import { escolherSelecao, lerNameStatus, type SelecaoTestes } from '../scripts/orquestrador/selecao-testes.js'

const diff = (nome: string) => lerNameStatus(readFileSync(join(M69, 'diffs-comarka', `${nome}.ns`), 'utf8'))
const SPEC: SelecaoTestes = {
  modo: 'sombra',
  cmd_afetados: 'npx vitest run --changed {base}',
  cmd_listar: 'npx vitest list --filesOnly --changed {base}',
}
const lista = (...arqs: string[]) => () => ({ rc: 0, saida: arqs.map((a) => `${a}\n`).join('') })
const nuncaLista = () => {
  throw new Error('o cmd_listar não devia rodar')
}

describe('lerNameStatus', () => {
  it('lê A/M/D e o destino do R (com a origem guardada)', () => {
    expect(diff('renomeia-823ad7a')[0]).toEqual({
      status: 'R',
      caminho: 'supabase/migrations/20261029193628_inteligencia_briefing_analista.sql',
      origem: 'supabase/migrations/20261029120000_inteligencia_briefing_analista.sql',
    })
    expect(diff('apaga-1016').map((d) => d.status)).toEqual(['D', 'D', 'D', 'D', 'D', 'D', 'A'])
  })
})

describe('escolherSelecao com diffs reais do Comarka', () => {
  it('ticket 1008, só src e test: afetados, com o conjunto do cmd_listar', () => {
    const e = escolherSelecao(diff('src-1008'), SPEC, lista('test/ficha-dados-leitura-completa.test.ts', 'test/perf-dashboard-cliente.test.ts'))
    expect(e).toEqual({
      modo_efetivo: 'afetados',
      motivo: '2 arquivo(s) de teste afetado(s)',
      arquivos: ['test/ficha-dados-leitura-completa.test.ts', 'test/perf-dashboard-cliente.test.ts'],
    })
  })

  it('ticket 1023, só docs: conjunto vazio cai para a inteira', () => {
    expect(escolherSelecao(diff('docs-1023'), SPEC, lista())).toEqual({
      modo_efetivo: 'inteira',
      motivo: 'conjunto afetado vazio',
      arquivos: [],
    })
  })

  it('commit 022aac1, package.json: inteira sem calcular', () => {
    const e = escolherSelecao(diff('package-022aac1'), SPEC, nuncaLista)
    expect(e.modo_efetivo).toBe('inteira')
    expect(e.motivo).toBe('diff casa suite_inteira_se: package-lock.json (**/package-lock.json), package.json (**/package.json)')
  })

  it('commit c4409dc, fixture compartilhada: inteira', () => {
    const e = escolherSelecao(diff('fixture-c4409dc'), SPEC, nuncaLista)
    expect(e).toMatchObject({ modo_efetivo: 'inteira', motivo: 'diff casa suite_inteira_se: test/fixtures/ghl-escopos-app.txt (**/test/fixtures/**)' })
  })

  it('commit 4009a64, helper de teste novo: inteira', () => {
    expect(escolherSelecao(diff('helper-4009a64'), SPEC, nuncaLista).motivo).toBe(
      'diff casa suite_inteira_se: test/helpers/carregar-tsx.ts (**/test/helpers/**)',
    )
  })

  it('ticket 1012, migration: inteira', () => {
    expect(escolherSelecao(diff('migration-1012'), SPEC, nuncaLista).modo_efetivo).toBe('inteira')
  })

  it('ticket 1016, apaga arquivo: inteira, mesmo sem casar glob', () => {
    expect(escolherSelecao(diff('apaga-1016'), SPEC, nuncaLista)).toEqual({
      modo_efetivo: 'inteira',
      motivo: 'diff apaga ou renomeia: fetch-openapi.js (D), fetch-setup.js (D), fix-schema.js (D), patch-columns.js (D), reset-db-password.js (D), run-sql.js (D)',
      arquivos: [],
    })
  })

  it('commit 823ad7a, renomeia: inteira (o R vem antes do glob de migration)', () => {
    expect(escolherSelecao(diff('renomeia-823ad7a'), SPEC, nuncaLista).motivo).toBe(
      'diff apaga ou renomeia: supabase/migrations/20261029193628_inteligencia_briefing_analista.sql (R)',
    )
  })

  it('erro do cálculo (cmd_listar rc 1): inteira', () => {
    const e = escolherSelecao(diff('src-1008'), SPEC, () => ({ rc: 1, saida: 'Error: Failed to load config\n' }))
    expect(e).toEqual({ modo_efetivo: 'inteira', motivo: 'cmd_listar falhou (rc 1)', arquivos: [] })
  })

  it('erro do cálculo (cmd_listar não roda): inteira', () => {
    const e = escolherSelecao(diff('src-1008'), SPEC, () => {
      throw new Error('spawn ENOENT')
    })
    expect(e).toEqual({ modo_efetivo: 'inteira', motivo: 'cmd_listar falhou (spawn ENOENT)', arquivos: [] })
  })

  it('suite_inteira_se declarada substitui a padrão', () => {
    const e = escolherSelecao(diff('package-022aac1'), { ...SPEC, suite_inteira_se: ['vitest.config.*'] }, lista('test/x.test.ts'))
    expect(e.modo_efetivo).toBe('afetados')
  })

  it('modo inteira não calcula nada', () => {
    expect(escolherSelecao(diff('src-1008'), { modo: 'inteira' }, nuncaLista)).toEqual({ modo_efetivo: 'inteira', motivo: 'modo inteira', arquivos: [] })
  })

  it('diff vazio: inteira', () => {
    expect(escolherSelecao([], SPEC, nuncaLista)).toEqual({ modo_efetivo: 'inteira', motivo: 'diff vazio', arquivos: [] })
  })
})

describe('testes_sempre', () => {
  const sempre = { ...SPEC, testes_sempre: ['test/sem-segredo-no-repo.test.ts', 'test/perf-dashboard-cliente.test.ts'] }

  it('somam ao conjunto afetado, sem repetir', () => {
    const e = escolherSelecao(diff('src-1008'), sempre, lista('test/ficha-dados-leitura-completa.test.ts', 'test/perf-dashboard-cliente.test.ts'))
    expect(e.arquivos).toEqual([
      'test/ficha-dados-leitura-completa.test.ts',
      'test/perf-dashboard-cliente.test.ts',
      'test/sem-segredo-no-repo.test.ts',
    ])
    expect(e.motivo).toBe('2 arquivo(s) de teste afetado(s) + 1 de testes_sempre')
  })

  it('conjunto afetado vazio com testes_sempre preenchido continua caindo para a inteira', () => {
    expect(escolherSelecao(diff('docs-1023'), sempre, lista())).toEqual({ modo_efetivo: 'inteira', motivo: 'conjunto afetado vazio', arquivos: [] })
  })
})

describe('saída do cmd_listar', () => {
  it('ignora linha vazia, cor e linha que não é caminho (aviso do vitest)', () => {
    const saida = '\x1b[33mDEPRECATED\x1b[39m  a opção X mudou\n\ntest/a.test.ts\n  test/b.test.ts  \n'
    expect(escolherSelecao(diff('src-1008'), SPEC, () => ({ rc: 0, saida })).arquivos).toEqual(['test/a.test.ts', 'test/b.test.ts'])
  })
})
