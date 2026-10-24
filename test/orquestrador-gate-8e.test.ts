/**
 * Etapa 8e, P6: dois avisos do gate de ticket, medidos no lote do
 * dashboard-comercial (002 e 003 reprovaram na attempt-0 pelo corpo do commit).
 *   C15: critério que depende do corpo/mensagem do commit;
 *   C16: ticket pede vermelho antes, e todo cmd de critério com vitest manda a
 *        saída para /dev/null (o agente não vê quais casos falharam).
 * Fixtures: `test/fixtures/gate-ticket-8e/` (origem no ORIGEM.md da pasta).
 */
import { describe, it, expect } from 'vitest';
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
  it.each(['002', '003'])('%s (versão de entrada): C15 no avaliador e C16 no ticket, os dois como aviso', (id) => {
    const v = rodar(id);
    expect(regra(v, 'C15').map((x) => x.campo)).toEqual(['criterios_aceite[2]']);
    expect(regra(v, 'C16').map((x) => x.campo)).toEqual(['criterios_aceite']);
    expect([...regra(v, 'C15'), ...regra(v, 'C16')].every((x) => x.aviso)).toBe(true);
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

  it('a tabela registra C15 e C16 como aviso, com a medida no porque', () => {
    expect([REGRAS.C15?.severidade, REGRAS.C16?.severidade]).toEqual(['aviso', 'aviso']);
    expect(REGRAS.C16?.porque).toMatch(/27/);
  });
});
