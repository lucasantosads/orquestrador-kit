/**
 * Etapa 2.2.0, defeito A1-4: o gate de ticket roda grep/awk/bash com a entrada
 * por `spawnSync(..., { input })`. Quando o filho sai antes de ler tudo (`grep
 * -q` casa na 1ª linha) e a entrada passa do buffer do pipe, a escrita dá EPIPE
 * e o gate trata como "não rodou" (GateNaoRodou) ou como "não casou". Sob
 * carga isso aparecia como instabilidade de orquestrador-gate-regex-exemplos;
 * com entrada grande acontece sempre.
 *
 * Pronto quando: entrada de MB com `grep -qE` que casa na 1ª linha devolve
 * casa=true, vinte vezes seguidas, sem EPIPE; e o controle (padrão que não
 * casa em lugar nenhum) devolve casa=false.
 */
import { describe, expect, it } from 'vitest'
import { casaExemplo } from '../scripts/orquestrador/gate-ticket.js'

const EXEC = { grep: '/usr/bin/grep', awk: '/usr/bin/awk', timeoutMs: 20_000 }
const GRANDE = 'alvo\n' + ('x'.repeat(200) + '\n').repeat(50_000)

describe('A1-4 · entrada grande sem EPIPE no gate de ticket', () => {
  it('grep -qE que casa na 1ª linha de 10 MB: casa=true, 20 de 20, sem erro', () => {
    for (let i = 0; i < 20; i++) {
      expect(casaExemplo({ regex: 'alvo', flags: '-qE', positivo: 'alvo', negativo: 'x' }, GRANDE, EXEC)).toEqual({ casa: true })
    }
  })

  it('controle no mesmo texto: padrão ausente dá casa=false, e awk lê tudo', () => {
    expect(casaExemplo({ regex: 'nao-esta-aqui', flags: '-qE', positivo: 'nao-esta-aqui', negativo: 'x' }, GRANDE, EXEC)).toEqual({ casa: false })
    expect(casaExemplo({ regex: 'alvo', ferramenta: 'awk', positivo: 'alvo', negativo: 'x' }, GRANDE, EXEC)).toEqual({ casa: true })
  })
})
