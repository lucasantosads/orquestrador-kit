/**
 * Etapa L13, P2 (M-17 parcial): IMPEDIMENTO declarado pelo agente é a primeira
 * forma do spec_conflitante.
 *
 * Causa (dashboard-comercial, 29/10/2026): no 043 o juiz reprovou porque a
 * prévia do rateio não aparecia. Na tentativa 2 o agente fez um commit VAZIO
 * (3be96fdc) cujo corpo é só uma linha `IMPEDIMENTO:` (a lista de clientes não
 * chega por nenhum arquivo da allowlist). O motor rotulou retry_sem_mudanca,
 * como se o agente não tivesse hipótese nova, e a nota dele sumiu.
 *
 * Regra (opção (a), decisão do Lucas de 30/10): diff igual ao da anterior ou
 * vazio, e o corpo dos commits DESTA tentativa só com linhas `IMPEDIMENTO:`
 * (sem assunto, trailers e linhas vazias) = bloqueado com causa
 * IMPEDIMENTO_DECLARADO, a nota do agente no motivo, sem juiz e sem consumir
 * tentativa. O 037 (commit vazio ce346b5d com 25 linhas de controle negativo e
 * um IMPEDIMENTO no meio) NÃO é impedimento: vai ao juiz pela P1.
 */
import { it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeHarness } from './fixtures/orq-harness.js';
import { chamadasDoJuizCaso, drenagemCaso, repoDoCaso, ticketDoCaso } from './fixtures/l13/caso.js';
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js';
import { extrair } from '../scripts/orquestrador/triador/extrair.js';

describeHarness('L13 P2: IMPEDIMENTO declarado com diff igual', () => {
  it('043 (commit vazio 3be96fdc): bloqueado por IMPEDIMENTO_DECLARADO com a nota do agente; triador R3/D13', () => {
    const c = repoDoCaso('043');
    const log = drenagemCaso(c, 'real0', 'vazio1');
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    const nota = String(t.notas_status);
    expect(nota, log).toContain('IMPEDIMENTO_DECLARADO');
    expect(nota).not.toContain('retry_sem_mudanca');
    // A frase do agente, literal.
    expect(nota).toContain('previaRateio (mds-util.ts:36) precisa da lista de clientes da MDS com valor_mensal');
    expect(chamadasDoJuizCaso(c)).toBe(1);
    // Bloqueio não consome: a tentativa 2 foi devolvida.
    expect(t.tentativas).toBe(1);
    const v = JSON.parse(readFileSync(join(c.fx, 'docs', 'fila', 'runs', '043', 'attempt-1', 'veredito.json'), 'utf8'));
    expect(v.causa).toBe('IMPEDIMENTO_DECLARADO');
    expect(v.contaComoRetry).toBe(false);
    const eventos = readFileSync(join(c.fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8');
    expect(eventos).toMatch(/ 043 BLOQUEADO motivo=IMPEDIMENTO_DECLARADO attempt=2/);
    const x = extrair(lerRepoKit(c.fx, '043'));
    expect(x.classe).toBe('R3');
    expect(x.regra).toBe('D13');
    expect(x.remedio).toContain('previaRateio');
  }, 180_000);

  it('diff vazio na 1ª tentativa, só o commit de IMPEDIMENTO: bloqueia sem juiz', () => {
    const c = repoDoCaso('043');
    const log = drenagemCaso(c, 'vazio1');
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    expect(String(t.notas_status)).toContain('IMPEDIMENTO_DECLARADO');
    expect(chamadasDoJuizCaso(c)).toBe(0);
    expect(t.tentativas).toBe(0);
  }, 180_000);

  it('contraprova: 037 (IMPEDIMENTO no meio de um corpo longo) não é impedimento e vai ao juiz', () => {
    const c = repoDoCaso('037');
    const log = drenagemCaso(c, 'real0', 'vazio1');
    expect(chamadasDoJuizCaso(c), log).toBe(2);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('IMPEDIMENTO_DECLARADO');
  }, 180_000);
});
