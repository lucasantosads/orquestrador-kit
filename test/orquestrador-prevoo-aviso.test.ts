/**
 * Etapa L14, P2 (7d-2, C5 e C6): na mesma passada do recon, a guarda que JÁ
 * FALHA e o alvo que JÁ PASSA na base viram AVISO: log, runs/<id>/prevoo.txt e
 * o evento PREVOO_AVISO, uma vez por versão do ticket. Nunca bloqueiam e nunca
 * vão ao prompt do agente (decisão do Lucas, 01/11).
 *
 * Por que aviso (relatório da L14, §4): nenhum dos dois deu zero FP.
 *   C5: dashboard 98 disparos em done; com a exceção de arquivo que o ticket
 *       cria (caminho da allowlist ou de cria_novo ausente na base), 32 em 15
 *       tickets — quase todos alvo negativo rotulado guarda (o 002).
 *   C6: dashboard 10 em 8 tickets, Comarka 8 em 8 (o 926).
 */
import { it, expect } from 'vitest';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeHarness } from './fixtures/orq-harness.js';
import { chamadasDoAgente, drenagemL14, eventos, prevooTxt, repoL14, ticketDoCaso } from './fixtures/l14/caso.js';

const avisos = (ev: string, id: string) => ev.split('\n').filter((l) => l.includes(` ${id} PREVOO_AVISO `));

describeHarness('L14 P2: guarda que já falha e alvo que já passa viram aviso', () => {
  it('002 (dashboard): guarda negativa que já falha na base → C5 aviso, o ticket segue, nada no prompt', () => {
    const c = repoL14('002', { base: { 'src/lib/liga-cartas.ts': 'liga-cartas.ts.txt' } });
    const log = drenagemL14(c, ['true', 'true']);
    const ev = eventos(c);
    expect(avisos(ev, '002'), log).toHaveLength(1);
    expect(ev).toMatch(/ 002 PREVOO_AVISO regra=C5 criterio=1 hash=[0-9a-f]{12}/);
    expect(prevooTxt(c)).toMatch(/C5 criterio=1: guarda já falha na base/);
    expect(log).toMatch(/AVISO do pré-voo \(C5, criterio=1\)/);
    // Segue: INICIO, agente, e nenhum bloqueio de pré-voo.
    expect(ev).toMatch(/ 002 INICIO /);
    expect(chamadasDoAgente(c)).toBeGreaterThan(0);
    expect(String(ticketDoCaso(c).notas_status)).not.toMatch(/SPEC_DESATUALIZADA|C5/);
    const prompt = readFileSync(join(c.fx, 'docs', 'fila', 'runs', '002', 'attempt-0', 'prompt.txt'), 'utf8');
    expect(prompt).not.toMatch(/já falha na base|PREVOO|C5/);
  }, 180_000);

  it('uma vez por versão: a segunda drenagem da mesma versão não repete o evento', () => {
    const c = repoL14('002', { base: { 'src/lib/liga-cartas.ts': 'liga-cartas.ts.txt' } });
    drenagemL14(c, ['true', 'true']);
    const f = join(c.fx, 'docs', 'fila', c.arquivo);
    const t = ticketDoCaso(c);
    Object.assign(t, { status: 'pendente', tentativas: 0, notas_status: '' });
    writeFileSync(f, `# 002\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
    const log = drenagemL14(c, ['true', 'true']);
    expect(avisos(eventos(c), '002'), log).toHaveLength(1);
    expect(prevooTxt(c).match(/C5 criterio=1/g)?.length).toBe(2);
  }, 180_000);

  it('019 (dashboard): guardas sobre as rotas que o ticket cria não são avaliadas (exceção) → nenhum aviso', () => {
    const c = repoL14('019');
    const log = drenagemL14(c, ['true', 'true']);
    expect(avisos(eventos(c), '019'), log).toHaveLength(0);
    expect(prevooTxt(c)).toMatch(/criterio=1 -> exceção: cita .*cobrancas\/route\.ts, que o ticket cria/);
  }, 180_000);

  it('926 (Comarka): alvo SEM_CALCULO já passa na base → C6 aviso', () => {
    // Critérios mantidos: o alvo 6 (grep puro) e o avaliador; os outros chamam npx e git.
    const c = repoL14('926', {
      base: { 'src/lib/clientes/pontos-acao.ts': 'pontos-acao.ts.txt', 'src/components/estados/bloco-vazio-linha.tsx': 'bloco-vazio-linha.tsx.txt' },
      criterios: [6, 9],
    });
    const log = drenagemL14(c, ['true', 'true']);
    expect(eventos(c), log).toMatch(/ 926 PREVOO_AVISO regra=C6 criterio=0 hash=/);
    expect(prevooTxt(c)).toMatch(/C6 criterio=0: alvo já passa na base/);
    expect(eventos(c)).toMatch(/ 926 INICIO /);
  }, 180_000);
});
