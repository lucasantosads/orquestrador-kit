/**
 * Etapa L11-P4 — o juiz sabe do instável (porte do aviso do 86dec07 no avaliador.sh).
 *
 * Com o gate de testes fora da conta por instável, o juiz roda, mas a SAÍDA DOS
 * GATES mostra `FALHA <gate>` e o cabeçalho diz que os gates passaram. O bloco diz
 * o que aconteceu, antes da saída: a suíte ficou vermelha SÓ em teste sem relação
 * com o diff que passou rodado isolado. Ausente ou vazio: o prompt sai byte a
 * byte como antes. O caminho executor -> juiz é o caso A do test-gate-instavel.sh.
 */
import { describe, it, expect } from 'vitest';
import { montarPromptJuiz, type EntradaPrompt } from '../scripts/orquestrador/juiz.js';

const BASE: EntradaPrompt = {
  id: '1523',
  objetivo: 'plano brief',
  criterios: [],
  allowlist: ['scripts/roadmap/plano.py', 'test/plano-brief.test.ts'],
  diff: 'diff --git a/scripts/roadmap/plano.py b/scripts/roadmap/plano.py\n',
  gates: 'ok   tsc 10ms\nFALHA vitest 41530ms — exit 1\n',
};

describe('L11-P4 · bloco de instáveis no prompt do juiz', () => {
  it('com instáveis: o bloco lista os arquivos, logo antes da saída dos gates', () => {
    const p = montarPromptJuiz({ ...BASE, instaveis: ['test/estado-plano-orfas.test.ts'] });
    const i = p.indexOf('TESTE INSTÁVEL FORA DA CONTA');
    expect(i).toBeGreaterThan(0);
    expect(p.slice(i, p.indexOf('SAÍDA DOS GATES MECÂNICOS:'))).toContain('  - test/estado-plano-orfas.test.ts');
    expect(p.indexOf('SAÍDA DOS GATES MECÂNICOS:')).toBeGreaterThan(i);
  });

  it('ausente ou vazio: o prompt sai byte a byte como antes', () => {
    expect(montarPromptJuiz({ ...BASE, instaveis: [] })).toBe(montarPromptJuiz(BASE));
    expect(montarPromptJuiz(BASE)).not.toContain('INSTÁVEL');
  });
});
