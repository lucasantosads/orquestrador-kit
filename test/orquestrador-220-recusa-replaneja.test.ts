/**
 * Etapa 2.2.0 · D4, achado no ciclo 5 do repo instalado (21:15, 14/11).
 *
 * O juiz de promoção recusou a alvo (024: negação sem controle positivo de um
 * só fator, R-01). A SPEC manda só avisar e seguir drenando, mas nada levava a
 * recusa de volta à fila: o planejador não a lia, e o promotor recusaria o
 * mesmo conteúdo a cada disparo. A frente nunca chegaria à principal sem
 * ticket escrito à mão.
 *
 * Pronto quando: a recusa do juiz grava os motivos no estado da frente de cada
 * ticket do intervalo; o planejador volta a essa frente mesmo com `fecha_com`
 * cumprido, e o prompt traz os motivos como correção obrigatória do 1º ticket;
 * a promoção aprovada apaga a recusa. Controle: sem recusa, a frente com
 * `fecha_com` cumprido não é replanejada.
 */
import { describe, expect, it } from 'vitest'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planejar, promover } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta, ticketDone, type RepoAutonomo } from './fixtures/autonomo-repo.js'

function ticketNaAlvo(fx: RepoAutonomo) {
  writeFileSync(join(fx.repo, 'docs', 'fila', '001-t.md'), ticketDone('001', 'B0-F2', 'convite'))
  fx.g(fx.repo, 'add', '-A')
  fx.g(fx.repo, 'commit', '-qm', 'fila: 001 done')
  fx.g(fx.alvoWt, 'checkout', '-q', '-b', 'frente/001')
  writeFileSync(join(fx.alvoWt, 'src', 'usuarios', 'convite.ts'), 'export function convite() {}\n')
  fx.g(fx.alvoWt, 'add', '-A')
  fx.g(fx.alvoWt, 'commit', '-qm', '001: trabalho')
  fx.g(fx.alvoWt, 'checkout', '-q', 'staging-auto')
  fx.g(fx.alvoWt, 'merge', '--no-ff', '-q', 'frente/001', '-m', 'orq: frente/001 (ticket 001) em staging-auto', '-m', 'Orq-Ticket: 001')
  mkdirSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador'), { recursive: true })
  writeFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador', 'estado.json'), JSON.stringify({ 'B0-F2': { fecha_com: ['001'] } }))
}
const estado = (fx: RepoAutonomo) => JSON.parse(readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador', 'estado.json'), 'utf8'))
const MOTIVO = 'R-01: negação sem controle positivo no mesmo it em test/usuarios/convite.test.ts'

describe('D4 · recusa do juiz de promoção volta à fila pelo planejador', () => {
  it('recusa grava os motivos na frente; o planejador replaneja a frente com os motivos no prompt; promoção aprovada apaga', () => {
    const fx = criarRepoAutonomo()
    ticketNaAlvo(fx)
    const r = promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: false, motivos: [MOTIVO], resumo: 'recusado' }) })))
    expect(r.motivo).toBe('juiz')
    expect(estado(fx)['B0-F2'].recusa).toMatchObject({ motivos: [MOTIVO], tickets: ['001'] })

    let prompt = ''
    const p = planejar(fx.ctx(claudePorPapel({
      planejador: (pr) => {
        prompt = pr
        return resposta({ entrega_coberta: true, tickets: [] })
      },
    })))
    expect(p).toMatchObject({ rodou: true, frente: 'B0-F2' })
    expect(prompt).toContain('Promoção recusada pelo juiz')
    expect(prompt).toContain(MOTIVO)

    promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: true, motivos: [], resumo: 'ok' }) })))
    expect(estado(fx)['B0-F2'].recusa).toBeUndefined()
  }, 120_000)

  it('a recusa vira lote uma vez só: com o lote de correção aprovado, a frente não é replanejada pela mesma recusa', () => {
    const fx = criarRepoAutonomo()
    ticketNaAlvo(fx)
    promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: false, motivos: [MOTIVO], resumo: 'recusado' }) })))
    const corr = {
      titulo: 'corrige o teste', slug: 'corrige-teste', prosa: 'recon ok',
      objetivo: 'Em test/usuarios/convite.test.ts ponha o controle positivo no mesmo it da negação.',
      pathspec_allowlist: ['test/usuarios/convite.test.ts'], cria_novo: ['test/usuarios/convite.test.ts'],
      recon: [{ descricao: 'convite existe', cmd: "grep -c 'convite' src/usuarios/convite.ts", espera: '1' }],
      dependencias: [], diff_estimado: 40,
      criterios_aceite: [
        { tipo: 'alvo', descricao: 'o teste existe', cmd: "grep -c 'convite' test/usuarios/convite.test.ts", espera: '1' },
        { tipo: 'avaliador', descricao: 'avaliador: controle no mesmo it.', cmd: 'true', espera: 'avaliador' },
      ],
    }
    const p1 = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [corr] }),
      'juiz de lote': () => resposta({ vereditos: [{ id: '002', aprovado: true, motivo: 'ok' }] }),
    })))
    expect(p1.aprovados).toEqual(['002'])
    expect(estado(fx)['B0-F2'].recusa.planejada).toBeTruthy()
    // o 002 terminou (done) e o promotor ainda não rodou: a mesma recusa não replaneja
    const f = join(fx.repo, 'docs', 'fila', '002-corrige-teste.md')
    writeFileSync(f, readFileSync(f, 'utf8').replace('"status": "pendente"', '"status": "done"'))
    const n = fx.chamadas.length
    expect(planejar(fx.ctx(claudePorPapel({}))).motivo).toBe('sem_frente')
    expect(fx.chamadas.length).toBe(n)
  }, 120_000)

  it('controle: sem recusa, a frente com fecha_com cumprido não é replanejada', () => {
    const fx = criarRepoAutonomo()
    ticketNaAlvo(fx)
    const p = planejar(fx.ctx(claudePorPapel({})))
    expect(p.motivo).toBe('sem_frente')
    expect(fx.chamadas).toHaveLength(0)
  }, 60_000)
})
