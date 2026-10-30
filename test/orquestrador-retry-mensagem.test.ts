/**
 * Etapa L13, P1 (M-02 parcial): a assinatura do retry_sem_mudanca inclui as
 * mensagens dos commits da frente.
 *
 * Causa (dashboard-comercial, 29/10/2026): no 037 e no 039 a tentativa 1 passou
 * typecheck, testes, build e critérios, e o juiz reprovou só o CORPO do commit
 * ("não vi o controle negativo falhar"). Na tentativa 2 o agente mudou só a
 * mensagem (037: commit vazio ce346b5d; 039: amend 24ed0691). O diff.patch saiu
 * idêntico e o executor bloqueou por retry_sem_mudanca sem chamar o juiz, que
 * era o único que podia ler a correção.
 *
 * Fixtures: `test/fixtures/l13/<id>/` copiadas de `docs/fila/runs/<id>` do
 * dashboard (diff.patch de cada tentativa e o corpo dos commits reais). O ticket
 * é o bloco real, com os critérios trocados por `test -f` (os reais rodam o
 * vitest do dashboard, que não existe no repo sintético). Gates vazios.
 *
 * `drive_ticket` de VERDADE, juiz interceptado (reprova sempre), como no
 * orquestrador-retry-feedback-juiz.test.ts.
 */
import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeHarness } from './fixtures/orq-harness.js';
import { type Caso, chamadasDoJuizCaso, drenagemCaso, repoDoCaso, ticketDoCaso } from './fixtures/l13/caso.js';

const run = (c: Caso, n: number, f: string) => join(c.fx, 'docs', 'fila', 'runs', c.id, `attempt-${n}`, f);

describeHarness('L13 P1: diff igual com mensagem nova chama o juiz', () => {
  it('037 (commit vazio ce346b5d): o juiz é chamado de novo, sem retry_sem_mudanca', () => {
    const c = repoDoCaso('037');
    const log = drenagemCaso(c, 'real0', 'vazio1');
    expect(readFileSync(run(c, 1, 'diff.patch'), 'utf8'), log).toBe(readFileSync(run(c, 0, 'diff.patch'), 'utf8'));
    expect(chamadasDoJuizCaso(c), log).toBe(2);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('retry_sem_mudanca');
    // A tentativa 2 rodou o pipeline inteiro de novo (sem reaproveitar gates).
    expect(existsSync(run(c, 1, 'enforcement.json')), log).toBe(true);
    expect(existsSync(run(c, 1, 'criterios.txt')), log).toBe(true);
    // mensagens.txt: o corpo real, sem o trailer do config e sem Co-Authored-By.
    const m1 = readFileSync(run(c, 1, 'mensagens.txt'), 'utf8');
    expect(m1).toContain('Controles negativos (todos deram exit 1 sem OK)');
    expect(m1).not.toMatch(/^Orq-Ticket:/m);
    expect(m1).not.toMatch(/^Co-Authored-By:/m);
  }, 180_000);

  it('039 (amend 24ed0691): o juiz é chamado de novo, sem retry_sem_mudanca', () => {
    const c = repoDoCaso('039');
    const log = drenagemCaso(c, 'real0', 'amend1');
    expect(readFileSync(run(c, 1, 'diff.patch'), 'utf8'), log).toBe(readFileSync(run(c, 0, 'diff.patch'), 'utf8'));
    expect(chamadasDoJuizCaso(c), log).toBe(2);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('retry_sem_mudanca');
  }, 180_000);

  it('contraprova: mesmo diff e mesma mensagem continua bloqueando por retry_sem_mudanca', () => {
    const c = repoDoCaso('037');
    const log = drenagemCaso(c, 'real0', '=');
    expect(chamadasDoJuizCaso(c), log).toBe(1);
    const t = ticketDoCaso(c);
    expect(t.status).toBe('bloqueado');
    expect(String(t.notas_status)).toContain('retry_sem_mudanca');
  }, 180_000);
});
