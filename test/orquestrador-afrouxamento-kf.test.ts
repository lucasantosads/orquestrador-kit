/**
 * Etapa KF, P1 (M-68, M-19 parcial): `enforcement.afrouxamento: "todo_teste"` liga
 * o anti-afrouxamento da 8c em todo arquivo de teste EXISTENTE tocado pelo diff,
 * não só nos vizinhos ampliados. Ausente (ou "ampliados") = o de hoje.
 *
 * Fixtures reais em `test/fixtures/afrouxamento-kf/` (ORIGEM.md): o `617d6ba` do
 * próprio kit pôs dois `it` em quarentena com `it.skip` (teste existente, nunca
 * ampliado), e o `21cf14b` criou um teste com `toBeDefined` (teste novo: fica de
 * fora, decisão P-5 do Lucas, 07/11).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { enforce, type EnforceConfig } from '../scripts/orquestrador/enforcement-core.js';
import { decidirDesfecho, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures');
const ler = (...p: string[]) => readFileSync(join(FIX, ...p), 'utf8');
const SKIP = ler('afrouxamento-kf', '617d6ba-agendamento.diff');
const NOVO = ler('afrouxamento-kf', '21cf14b-template-recon-novo.diff');
const ARQ_SKIP = 'test/orquestrador-agendamento.test.ts';
const ARQ_NOVO = 'test/orquestrador-template-recon.test.ts';

// Configs reais: o do CI (conteudos-infinitos) e o do dashboard (l13). Nenhum tem a chave.
const CI = JSON.parse(ler('config', 'ci-000-config.json')) as EnforceConfig;
const DASH = JSON.parse(ler('l13', 'config-dashboard.json')) as EnforceConfig;
const comChave = (c: EnforceConfig, modo: string): EnforceConfig =>
  ({ ...c, enforcement: { ...(c.enforcement ?? {}), afrouxamento: modo } }) as EnforceConfig;

const afrouxa = (config: EnforceConfig, arquivo: string, diff: string, ampliados: string[] = []) =>
  enforce({ changedFiles: [arquivo], allowlist: [arquivo], ampliados, diff, config })
    .violations.filter((v) => v.tipo === 'afrouxamento')
    .map((v) => v.detalhe);

describe('KF-P1 · sem a chave, nada muda (configs reais do CI e do dashboard)', () => {
  it.each([['CI', CI], ['dashboard', DASH]])('%s: o it.skip do 617d6ba num teste não ampliado passa, como hoje', (_n, cfg) => {
    expect(afrouxa(cfg, ARQ_SKIP, SKIP)).toEqual([]);
  });
  it('"ampliados" explícito é o mesmo que ausente', () => {
    expect(afrouxa(comChave(CI, 'ampliados'), ARQ_SKIP, SKIP)).toEqual([]);
  });
  it('o vizinho ampliado segue reprovando sem a chave (a 8c intocada)', () => {
    expect(afrouxa(CI, ARQ_SKIP, SKIP, [ARQ_SKIP]).length).toBeGreaterThan(0);
  });
});

describe('KF-P1 · com "todo_teste", teste existente tocado responde pelo afrouxamento', () => {
  it('o it.skip do 617d6ba reprova sem ampliação nenhuma', () => {
    const v = afrouxa(comChave(DASH, 'todo_teste'), ARQ_SKIP, SKIP);
    expect(v).toContain(`${ARQ_SKIP}: acrescenta .skip/.only/.todo (removidas 0, acrescentadas 2)`);
    expect(v).toContain(`${ARQ_SKIP}: remove it/test (removidas 2, acrescentadas 0)`);
  });
  it('teste criado pelo diff (21cf14b, com toBeDefined) fica de fora', () => {
    expect(afrouxa(comChave(DASH, 'todo_teste'), ARQ_NOVO, NOVO)).toEqual([]);
  });
  it('arquivo que não é teste fica de fora', () => {
    const diff = SKIP.replaceAll(ARQ_SKIP, 'scripts/orquestrador/launchd-run.ts');
    expect(afrouxa(comChave(DASH, 'todo_teste'), 'scripts/orquestrador/launchd-run.ts', diff)).toEqual([]);
  });
  it('teste existente apagado reprova', () => {
    const diff = `diff --git a/${ARQ_SKIP} b/${ARQ_SKIP}\ndeleted file mode 100644\n--- a/${ARQ_SKIP}\n+++ /dev/null\n-it('x', () => {})\n`;
    expect(afrouxa(comChave(DASH, 'todo_teste'), ARQ_SKIP, diff)).toEqual([`${ARQ_SKIP}: apaga o arquivo de teste`]);
  });
});

describe('KF-P1 · a decisão não diz "vizinho ampliado" de um teste que não foi ampliado', () => {
  const dcfg = JSON.parse(ler('checkout', 'docs', 'fila', '000-config.json')) as DecisaoConfig;
  it('motivo: "afrouxamento em teste: <detalhe>"', () => {
    const sinal: SinalTentativa = {
      exitCode: 0,
      saida: '',
      diffLines: 10,
      gateInterrompido: false,
      enforcementViolado: true,
      criteriosFalhos: [],
      violacoesEnforcement: [{ tipo: 'afrouxamento', detalhe: `${ARQ_SKIP}: acrescenta .skip/.only/.todo (removidas 0, acrescentadas 2)` }],
    };
    const v = decidirDesfecho(dcfg, sinal);
    expect([v.desfecho, v.causa]).toEqual(['reprovado', 'afrouxamento']);
    expect(v.motivo).toBe(`afrouxamento em teste: ${ARQ_SKIP}: acrescenta .skip/.only/.todo (removidas 0, acrescentadas 2)`);
  });
});
