/**
 * Causa 'ambiente' NÃO engole falha de mérito (harness manual, 22/09/2026).
 *
 * Até aqui, `detectarCausaInfra` devolvia 'ambiente' para QUALQUER falha de
 * resultado acompanhada de uma permissão negada. Resultado medido: o 470c
 * (runs/470c/attempt-0) teve typecheck vermelho (TS2352) e o 481 (22/09 13:21Z)
 * teve o juiz reprovando o teste — e os dois foram ADIADOS por 'ambiente' só
 * porque um `grep` incidental do agente tinha sido negado. Adiado não consome
 * tentativa nem devolve o feedback ao agente: a falha real some.
 *
 * Regra: gate (typecheck/testes/build), enforcement e juiz que reprovou são
 * SEMPRE mérito. Desde o ticket 625 (23/09/2026), critério de aceite que RODOU
 * e reprovou também é mérito, com ou sem permissão negada ao agente: no 503
 * attempt-0 o comando negado era o próprio critério, que o agente tentou
 * conferir, e o adiamento escondeu a falha real. 'ambiente' por critério só
 * quando o HARNESS não conseguiu executar o comando do critério (rc 126/127,
 * sinal `criteriosNaoExecutados`) — casos em test/orquestrador-criterio-merito.test.ts.
 *
 * O sinal é montado como o executor monta (executor.sh, passo 8): gate
 * reprovado entra como o literal "gates reprovados" em criteriosFalhos; juiz
 * que reprovou entra como "juiz: <motivo>" seguido dos criterios_falhos dele.
 */
import { describe, it, expect } from 'vitest';
import { decidirDesfecho, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
import { configDeReferencia } from './fixtures/orq-harness.js';

const config = JSON.parse(configDeReferencia()) as DecisaoConfig;

function sinal(parcial: Partial<SinalTentativa>): SinalTentativa {
  return { exitCode: 0, saida: '', diffLines: 50, ...parcial };
}

describe("causa 'ambiente' × falha de mérito", () => {
  it('typecheck falho + permissão negada = reprovado, não adiado (caso real do 470c)', () => {
    const v = decidirDesfecho(
      config,
      sinal({
        diffLines: 541,
        criteriosFalhos: ['gates reprovados'],
        permissoesNegadas: [
          "{ git diff main...HEAD -- src/lib/comercial/funil/ghl-stages-sync.ts | grep -c '^+.*mapeamento_' || true; }",
        ],
      }),
    );
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('criterio_qualidade');
    expect(v.contaComoRetry).toBe(true);
  });

  it('juiz reprova + permissão negada = reprovado (caso do 481)', () => {
    const v = decidirDesfecho(
      config,
      sinal({
        criteriosFalhos: [
          "juiz: O teste 'rodar duas vezes não cria mensagem nova' usa um mock de ingerirEventoGhlConversa",
          'idempotência não provada contra a ingestão real',
        ],
        permissoesNegadas: ['grep -n "order(" node_modules/@supabase/postgrest-js/dist/cjs/PostgrestTransformBuilder.d.ts'],
      }),
    );
    expect(v.desfecho).toBe('reprovado');
    expect(v.contaComoRetry).toBe(true);
    expect(v.motivo).toContain('juiz:');
  });

  it('gate falho + critério falho + permissão negada = reprovado (gate manda)', () => {
    const v = decidirDesfecho(
      config,
      sinal({ criteriosFalhos: ['gates reprovados', 'o script existe e tem teste'], permissoesNegadas: ['ls x'] }),
    );
    expect(v.desfecho).toBe('reprovado');
  });

  it('enforcement + permissão negada = desfecho de mérito (refatiar), não ambiente', () => {
    const v = decidirDesfecho(config, sinal({ enforcementViolado: true, permissoesNegadas: ['ls x'] }));
    expect(v.desfecho).toBe('refatiar');
    expect(v.causa).toBe('enforcement');
  });

  it('SÓ critério falho + permissão negada = reprovado (ticket 625: permissão negada ao agente não pesa)', () => {
    const v = decidirDesfecho(
      config,
      sinal({
        criteriosFalhos: ['o script existe e tem teste'],
        permissoesNegadas: ['grep -m1 "\\"version\\"" node_modules/vitest/package.json'],
      }),
    );
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('criterio_qualidade');
    expect(v.contaComoRetry).toBe(true);
  });

  it('entrega verde + permissão negada = aprovado (regra do 488 mantida)', () => {
    const v = decidirDesfecho(config, sinal({ criteriosFalhos: [], permissoesNegadas: ['ls x'] }));
    expect(v.desfecho).toBe('aprovado');
  });
});
