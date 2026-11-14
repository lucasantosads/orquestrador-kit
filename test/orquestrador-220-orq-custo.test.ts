/**
 * Etapa 2.2.0, defeito A1-8 (2026-11-13 no defeitos-para-o-kit do escritorio-os):
 * depois da drenagem das 23:47 de 12/11, o `orq custo` da manhã seguinte dizia
 * `DIA 2026-11-13 · CHAMADAS 0 · US$ 0`, e o gasto de ontem (US$ 0,86) sumia
 * do placar. Os dois lados usam a data local (fuso America/Bahia); o defeito é
 * o verbo só olhar o dia corrente.
 *
 * Pronto quando: sem argumento, `orq custo` mostra o dia corrente E o último
 * dia com registro, cada bloco com a sua data. Controle no mesmo teste: com
 * argumento, só o dia pedido.
 */
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { criarFixture, REPO_ROOT } from './fixtures/orq-harness.js'

const TZ = 'America/Bahia'
const dia = (deslocDias: number) =>
  spawnSync('bash', ['-c', `date -v${deslocDias >= 0 ? '+' : ''}${deslocDias}d '+%Y-%m-%d'`], { encoding: 'utf8', env: { ...process.env, TZ } }).stdout.trim()

const orqTz = (fx: string, ...a: string[]) =>
  spawnSync(join(REPO_ROOT, 'scripts', 'orq'), a, { encoding: 'utf8', cwd: fx, env: { ...process.env, ORQ_EXEC_ROOT: fx, TZ } })

describe('A1-8 · orq custo sem argumento mostra o último dia com gasto', () => {
  it('custo.json só com ontem: imprime o bloco de ontem, com a data e o total', () => {
    const fx = criarFixture()
    const ontem = dia(-1)
    const hoje = dia(0)
    writeFileSync(
      join(fx, 'docs', 'fila', 'runs', 'custo.json'),
      JSON.stringify({ dias: { [ontem]: [{ data: ontem, papel: 'executor', ticket: '001', custo_usd: 0.69, tokens_in: 10, tokens_out: 5 }, { data: ontem, papel: 'probe', ticket: '-', custo_usd: 0.17, tokens_in: 1, tokens_out: 1 }] } }),
    )
    const r = orqTz(fx, 'custo')
    expect(r.stdout).toMatch(new RegExp(`^DIA +${hoje}$`, 'm'))
    expect(r.stdout).toMatch(new RegExp(`^DIA +${ontem} +\\(último dia com registro\\)$`, 'm'))
    expect(r.stdout).toMatch(/^CUSTO +US\$ 0\.86 /m)
    // controle: com argumento, só o dia pedido
    const so = orqTz(fx, 'custo', hoje)
    expect(so.stdout).not.toContain(ontem)
    expect(so.stdout).toMatch(/^CHAMADAS 0$/m)
  })
})
