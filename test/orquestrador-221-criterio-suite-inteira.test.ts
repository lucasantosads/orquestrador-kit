/**
 * Etapa 2.2.1, D7 · gate de ticket descarta candidato com critério que roda a
 * suíte inteira (docs/defeitos/2026-11-15-criterio-suite-inteira-bloqueia-por-ambiente.md).
 *
 * Trilha real: o planejador escreveu o 031 com `npx vitest run 2>&1 | grep -c
 * 'Test Files.*failed'` espera 0; o gate `testes` passou, o mesmo vitest
 * repetido pelo critério 35 min depois falhou por ambiente e o ticket bloqueou
 * por retry_sem_mudanca (14/11 22:55).
 *
 * Pronto quando: candidato do planejador com cmd contendo `vitest run` sem
 * caminho, `npm test`, `npm run build` ou `next build` é descartado no gate
 * com motivo `criterio_suite_inteira`; `vitest run <arquivo>` passa; a lista de
 * padrões e a severidade são configuráveis em `gate_ticket`; ticket pendente
 * que já está na fila (pré-voo do executor, sem `--candidatos`) só recebe aviso.
 */
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planejar, lerFila } from '../scripts/orquestrador/autonomo.js'
import { cmdRodaSuiteInteira, validarTicket, type GateCfg } from '../scripts/orquestrador/gate-ticket.js'
import { claudePorPapel, criarRepoAutonomo, resposta } from './fixtures/autonomo-repo.js'

const base = {
  titulo: 'núcleo do convite',
  slug: 'convite-nucleo',
  prosa: 'recon: src/usuarios/lista.ts existe.',
  objetivo: 'Crie src/usuarios/convite.ts exportando a função convidar e o teste test/usuarios/convite.test.ts que a exercita.',
  pathspec_allowlist: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
  cria_novo: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
  dependencias: [],
  diff_estimado: 120,
}
const crit = (cmd: string) => [
  { tipo: 'alvo', descricao: 'a função existe', cmd: "grep -c 'export function convidar' src/usuarios/convite.ts", espera: '1' },
  { tipo: 'guarda', descricao: 'guarda', cmd, espera: '0' },
  { tipo: 'avaliador', descricao: 'avaliador: a função é usada pelo teste.', cmd: 'true', espera: 'avaliador' },
]
const aprovaTudo = (p: string) => resposta({ vereditos: [...p.matchAll(/"id": "(\d{3})"/g)].map((m) => ({ id: m[1], aprovado: true, motivo: 'ok' })) })

describe('2.2.1 D7 · cmdRodaSuiteInteira', () => {
  it('casa os quatro formatos e deixa passar o vitest com arquivo', () => {
    for (const cmd of [
      "npx vitest run 2>&1 | grep -c 'Test Files.*failed'",
      'npx vitest run --reporter=dot >/dev/null 2>&1 && echo OK',
      'npm test 2>&1 | tail -1',
      'npm run build >/dev/null 2>&1; echo rc=$?',
      'npx next build && echo OK',
    ]) expect(cmdRodaSuiteInteira(cmd), cmd).toBe(true)
    for (const cmd of [
      "npx vitest run test/rbac/actions-convite.test.ts 2>&1 | grep -c 'Test Files.*1 passed (1)'",
      'npx vitest run --reporter=dot test/usuarios/convite.test.ts >/dev/null 2>&1 && echo OK',
      "grep -c 'npm test' README.md",
      'npx tsc --noEmit -p . 2>&1 | grep -c error',
    ]) expect(cmdRodaSuiteInteira(cmd), cmd).toBe(false)
  })

  it('padrões configuráveis em gate_ticket.cmds_suite_inteira substituem os do kit', () => {
    expect(cmdRodaSuiteInteira('pnpm test', ['^pnpm test'])).toBe(true)
    expect(cmdRodaSuiteInteira('npm test', ['^pnpm test'])).toBe(false)
  })
})

describe('2.2.1 D7 · validarTicket', () => {
  const ticket = (cmd: string) => ({
    arquivo: '/x/032-t.md',
    json: { id: '032', bloco: 'B0', frente: 'B0-F2', slug: 't', status: 'pendente', objetivo: 'x', pathspec_allowlist: ['src/a.ts'], dependencias: [], criterios_aceite: crit(cmd) },
  })
  const cfg: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] }
  it('candidato: violação; pendente fora do planejador: só aviso; severidade off desliga', () => {
    const cmd = "npx vitest run 2>&1 | grep -c 'Test Files.*failed'"
    const cand = validarTicket(ticket(cmd), [], { ...cfg, candidatos: true }, null).filter((v) => v.regra === 'C18')
    expect(cand).toHaveLength(1)
    expect(cand[0]!.aviso).toBeUndefined()
    expect(cand[0]!.mensagem).toMatch(/^criterio_suite_inteira:/)
    const pend = validarTicket(ticket(cmd), [], cfg, null).filter((v) => v.regra.startsWith('C18'))
    expect(pend).toHaveLength(1)
    expect(pend[0]!.aviso).toBe(true)
    expect(validarTicket(ticket(cmd), [], { ...cfg, candidatos: true, severidade: { C18: 'off' } }, null).filter((v) => v.regra === 'C18')).toEqual([])
  })
})

describe('2.2.1 D7 · planejador', () => {
  it('candidato com a suíte inteira no critério sai descartado com motivo criterio_suite_inteira', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [{ ...base, criterios_aceite: crit("npx vitest run 2>&1 | grep -c 'Test Files.*failed'") }] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(r.descartados).toEqual([{ id: '001', motivo: 'criterio_suite_inteira' }])
    const t = lerFila(join(fx.repo, 'docs', 'fila')).find((x) => x.json.id === '001')!.json
    expect(t.status).toBe('descartado')
    expect(t.notas_status).toMatch(/criterio_suite_inteira/)
  }, 120_000)

  it('controle: vitest run com o arquivo do ticket passa no gate e vira pendente', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [{ ...base, criterios_aceite: crit('npx vitest run test/usuarios/convite.test.ts >/dev/null 2>&1; echo rc=$?') }] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(r.descartados).toEqual([])
    expect(r.aprovados).toEqual(['001'])
  }, 120_000)

  it('config: gate_ticket.severidade.C18=off deixa o candidato passar', () => {
    const fx = criarRepoAutonomo()
    const cfgArq = join(fx.repo, 'docs', 'fila', '000-config.json')
    const c = JSON.parse(fx.g(fx.repo, 'show', 'HEAD:docs/fila/000-config.json').out)
    c.gate_ticket = { ...(c.gate_ticket ?? {}), severidade: { ...(c.gate_ticket?.severidade ?? {}), C18: 'off' } }
    writeFileSync(cfgArq, `${JSON.stringify(c, null, 2)}\n`)
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [{ ...base, criterios_aceite: crit('npm run build >/dev/null 2>&1; echo rc=$?') }] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(r.descartados).toEqual([])
  }, 120_000)
})
