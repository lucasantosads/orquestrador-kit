/**
 * Etapa 2.2.0 · defeitos achados no ciclo 5 do repo instalado (21:03, 14/11).
 *
 * D1 · lote com dependência interna: o 2º ticket depende do 1º e cita no
 *   `contexto_juiz` o arquivo que o 1º cria. O gate de ticket (regra 9) exigia
 *   que o arquivo existisse JÁ na branch alvo e descartava o 2º (`motivo=gate`).
 *   Pronto quando: referência que ainda não existe é aceita se está na
 *   allowlist de um ticket listado em `dependencias` e ainda não terminal;
 *   controle: sem a dependência declarada, segue violação.
 * D2 · `fecha_com` com lote parcialmente descartado: o planejador gravava
 *   `fecha_com` com os aprovados mesmo quando parte do lote caiu, e o promotor
 *   fechava a frente sem a parte descartada. Pronto quando: `fecha_com` só é
 *   gravado com o lote inteiro aprovado; controle: lote inteiro aprovado grava.
 */
import { describe, expect, it } from 'vitest'
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planejar, lerFila } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta } from './fixtures/autonomo-repo.js'

const nucleo = {
  titulo: 'núcleo do convite',
  slug: 'convite-nucleo',
  prosa: 'recon: src/usuarios/lista.ts existe.',
  objetivo: 'Crie src/usuarios/convite.ts exportando a função convidar e o teste test/usuarios/convite.test.ts que a exercita.',
  pathspec_allowlist: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
  cria_novo: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
  recon: [{ descricao: 'a lista existe', cmd: "grep -c 'export const lista' src/usuarios/lista.ts", espera: '1' }],
  dependencias: [],
  diff_estimado: 120,
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'a função existe', cmd: "grep -c 'export function convidar' src/usuarios/convite.ts", espera: '1' },
    { tipo: 'avaliador', descricao: 'avaliador: a função é usada pelo teste.', cmd: 'true', espera: 'avaliador' },
  ],
}
const tela = {
  ...nucleo,
  titulo: 'tela do convite',
  slug: 'convite-tela',
  objetivo: 'Crie src/usuarios/tela.ts que chama convidar de ./convite e o teste test/usuarios/tela.test.ts.',
  pathspec_allowlist: ['src/usuarios/tela.ts', 'test/usuarios/tela.test.ts'],
  cria_novo: ['src/usuarios/tela.ts', 'test/usuarios/tela.test.ts'],
  dependencias: ['#1'],
  contexto_juiz: ['src/usuarios/convite.ts'],
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'a tela existe', cmd: "grep -c 'convidar' src/usuarios/tela.ts", espera: '1' },
    { tipo: 'avaliador', descricao: 'avaliador: a tela usa o núcleo.', cmd: 'true', espera: 'avaliador' },
  ],
}
const aprovaTudo = (p: string) => resposta({ vereditos: [...p.matchAll(/"id": "(\d{3})"/g)].map((m) => ({ id: m[1], aprovado: true, motivo: 'ok' })) })
const estado = (repo: string) => JSON.parse(readFileSync(join(repo, 'docs', 'fila', 'runs', 'planejador', 'estado.json'), 'utf8'))

describe('D1 · lote com dependência interna e contexto_juiz do arquivo que a dependência cria', () => {
  it('o 2º passa no gate (vira pendente) e o lote inteiro fecha a frente', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ entrega_coberta: false, duvida: null, fecha_frente: true, tickets: [nucleo, tela] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(r.descartados).toEqual([])
    expect(r.aprovados).toEqual(['001', '002'])
    const t2 = lerFila(join(fx.repo, 'docs', 'fila')).find((t) => t.json.id === '002')!.json
    expect(t2).toMatchObject({ status: 'pendente', dependencias: ['001'], contexto_juiz: ['src/usuarios/convite.ts'] })
    expect(estado(fx.repo)['B0-F2'].fecha_com).toEqual(['001', '002'])
  }, 120_000)

  it('controle: a mesma referência sem a dependência declarada continua violação da regra 9', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [nucleo, { ...tela, dependencias: [] }] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(r.descartados).toEqual([{ id: '002', motivo: 'gate' }])
    const t2 = lerFila(join(fx.repo, 'docs', 'fila')).find((t) => t.json.id === '002')!.json
    expect(t2.notas_status).toMatch(/contexto_juiz\[0\]: 'src\/usuarios\/convite\.ts' não existe na branch alvo/)
  }, 120_000)
})

describe('D2 · fecha_com só com o lote inteiro aprovado', () => {
  it('juiz descarta 1 de 2 com fecha_frente: fecha_com não é gravado; controle: lote inteiro aprovado grava', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [nucleo, { ...tela, slug: 'outro', dependencias: [], contexto_juiz: undefined }] }),
      'juiz de lote': () => resposta({ vereditos: [{ id: '001', aprovado: true, motivo: 'ok' }, { id: '002', aprovado: false, motivo: 'R-01' }] }),
    })))
    expect(r.aprovados).toEqual(['001'])
    expect(estado(fx.repo)['B0-F2'].fecha_com).toBeUndefined()

    const fx2 = criarRepoAutonomo()
    planejar(fx2.ctx(claudePorPapel({
      planejador: () => resposta({ fecha_frente: true, tickets: [nucleo, { ...tela, slug: 'outro', dependencias: [], contexto_juiz: undefined }] }),
      'juiz de lote': aprovaTudo,
    })))
    expect(estado(fx2.repo)['B0-F2'].fecha_com).toEqual(['001', '002'])
    writeFileSync(join(fx2.base, 'ok'), '')
  }, 120_000)
})
