/**
 * Etapa 8e, P6: dois avisos do gate de ticket, medidos no lote do
 * dashboard-comercial (002 e 003 reprovaram na attempt-0 pelo corpo do commit).
 *   C15: critério que depende do corpo/mensagem do commit;
 *   C16: ticket pede vermelho antes, e todo cmd de critério com vitest manda a
 *        saída para /dev/null (o agente não vê quais casos falharam).
 * Fixtures: `test/fixtures/gate-ticket-8e/` (origem no ORIGEM.md da pasta).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { lerFila, validarTicket, REGRAS, type GateCfg, type Violacao } from '../scripts/orquestrador/gate-ticket.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures', 'gate-ticket-8e');
const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [], branch_alvo: 'staging-auto' };

function rodar(id: string, mexer?: (t: Record<string, unknown>) => void): Violacao[] {
  const fila = lerFila(FIX);
  const alvo = fila.find((t) => t.arquivo.split('/').pop()!.startsWith(`${id}-`))!;
  if (mexer) mexer(alvo.json as Record<string, unknown>);
  return validarTicket(alvo, fila, CFG, null);
}
const regra = (v: Violacao[], r: string) => v.filter((x) => x.regra === r);

describe('8e-P6 · C15 e C16', () => {
  // Etapa L13 (P4, M-62): o C15 vira erro (0 FP: Comarka 0 em 1519; dashboard
  // 2, os dois causais). O C16 segue aviso.
  it.each(['002', '003'])('%s (versão de entrada): C15 no avaliador sai como ERRO e C16 como aviso', (id) => {
    const v = rodar(id);
    expect(regra(v, 'C15').map((x) => x.campo)).toEqual(['criterios_aceite[2]']);
    expect(regra(v, 'C16').map((x) => x.campo)).toEqual(['criterios_aceite']);
    expect(regra(v, 'C15').every((x) => !x.aviso)).toBe(true);
    expect(regra(v, 'C16').every((x) => x.aviso)).toBe(true);
  });

  it('001 (relatório, sem vitest, sem corpo do commit): nenhum dos dois', () => {
    const v = rodar('001');
    expect([...regra(v, 'C15'), ...regra(v, 'C16')]).toEqual([]);
  });

  it('C16 não dispara quando algum cmd de vitest mostra a saída', () => {
    const v = rodar('003', (t) => {
      const c = (t.criterios_aceite as { cmd: string }[])[0]!;
      c.cmd = c.cmd.replace(' >/dev/null 2>&1', '');
    });
    expect(regra(v, 'C16')).toEqual([]);
  });

  it('a tabela: C15 erro; C16 e C15o aviso, com a medida no porque (etapa L13)', () => {
    expect([REGRAS.C15?.severidade, REGRAS.C16?.severidade, REGRAS.C15o?.severidade]).toEqual(['erro', 'aviso', 'aviso']);
    expect(REGRAS.C16?.porque).toMatch(/27/);
    expect(REGRAS.C15o?.porque).toMatch(/25/);
  });

  // C15o (etapa L13): o pedido do corpo do commit no OBJETIVO, a forma dos
  // tickets de 30/10 do dashboard, que o C15 não via. Aviso: 0 FP não se cumpre.
  it.each(['037', '044'])('%s (dashboard, 29/10): C15o como aviso, sem C15', (id) => {
    const fila = lerFila(FIX);
    const json = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'l13', id, 'ticket.json'), 'utf8')) as Record<string, unknown>;
    const v = validarTicket({ arquivo: `${id}-l13.md`, json }, fila, CFG, null);
    expect(regra(v, 'C15')).toEqual([]);
    expect(regra(v, 'C15o').map((x) => [x.campo, x.aviso])).toEqual([['objetivo', true]]);
  });
});
