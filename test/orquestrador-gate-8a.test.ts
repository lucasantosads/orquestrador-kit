/**
 * Etapa 8a — validador na entrada: barrar na criação o ticket que vai precisar
 * de resgate por critério ou por allowlist (medição do Comarka de 04 a 17/10,
 * `~/orq-sessoes/relatorio-kit-etapa8a.md`).
 *
 * As fixtures em `test/fixtures/gate-ticket-8a/` são os tickets reais, copiados
 * verbatim do commit em que entraram na fila (a origem de cada um está no
 * `ORIGEM.md` da pasta). O controle negativo de cada regra é um done da P1r
 * (aprovado de primeira, na versão que rodou).
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { lerFila, validarTicket, REGRAS, type GateCfg, type Violacao } from '../scripts/orquestrador/gate-ticket.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures', 'gate-ticket-8a');
// O Comarka não tem `gate_ticket` no config: o gate roda com a tabela pura.
const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [], branch_alvo: 'staging-auto' };

function rodar(pasta: string, id: string): Violacao[] {
  const fila = lerFila(join(FIX, pasta));
  const alvo = fila.find((t) => t.arquivo.split('/').pop()!.startsWith(`${id}-`));
  if (!alvo) throw new Error(`${id} não está em ${pasta}`);
  return validarTicket(alvo, fila, CFG, null);
}
const regra = (v: Violacao[], r: string) => v.filter((x) => x.regra === r);

describe('8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo', () => {
  // Com zero matches o grep -c imprime 0 e sai 1; a atribuição herda o rc e o
  // && corta a cadeia: o critério reprova exatamente no estado certo.
  it.each([
    ['924b', 'criterios_aceite[6]'],
    ['924c', 'criterios_aceite[5]'],
    ['924d', 'criterios_aceite[5]'],
    ['924f', 'criterios_aceite[7]'],
  ])('%s (versão de entrada) dispara C14 como erro em %s', (id, campo) => {
    const v = regra(rodar('c14', id), 'C14');
    expect(v.map((x) => x.campo)).toEqual([campo]);
    expect(v.every((x) => !x.aviso && !x.isencao)).toBe(true);
  });

  it('926b: grep -c encadeado, mas as variáveis esperam ≥ 1 — a cadeia cortada já é reprova certa; não dispara', () => {
    expect(regra(rodar('c14', '926b'), 'C14')).toEqual([]);
  });

  it('999c: grep -c separado por ; (o resgate foi de premissa) — não dispara', () => {
    expect(regra(rodar('c14', '999c'), 'C14')).toEqual([]);
  });

  it('922b (controle negativo P1r, rodou de primeira): grep -c | awk — o rc é do awk; não dispara', () => {
    expect(regra(rodar('c14', '922b'), 'C14')).toEqual([]);
  });

  it('a tabela registra C14 como erro, com o FP medido no porque', () => {
    expect(REGRAS.C14?.severidade).toBe('erro');
    expect(REGRAS.C14?.porque).toMatch(/0\/368/);
  });
});

describe('8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local)', () => {
  it('1004 (versão de entrada) dispara C13 como aviso nos 3 critérios com origin/staging-auto, com a dica da branch local', () => {
    const v = regra(rodar('c13', '1004'), 'C13');
    expect(v.map((x) => x.campo)).toEqual(['criterios_aceite[1]', 'criterios_aceite[2]', 'criterios_aceite[3]']);
    expect(v.every((x) => x.aviso)).toBe(true);
    expect(v[0]!.mensagem).toContain("'staging-auto' local");
  });

  it('1012 (controle negativo P1r): merge-base com a branch local — não dispara', () => {
    expect(regra(rodar('c13', '1012'), 'C13')).toEqual([]);
  });

  it('a tabela registra C13 como aviso, com o FP e a condição para virar erro no porque', () => {
    expect(REGRAS.C13?.severidade).toBe('aviso');
    expect(REGRAS.C13?.porque).toMatch(/120\/368/);
    expect(REGRAS.C13?.porque).toMatch(/erro para ticket novo/);
  });
});
