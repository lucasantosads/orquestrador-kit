/**
 * Etapa L14, P3 (M-17): conflito de spec estruturado.
 *
 * O agente declara cada conflito numa linha do corpo do commit, irmã do
 * `IMPEDIMENTO:` da L13:
 *
 *     CONFLITO: <o ticket diz> | <o código ou a base diz> | <arquivo:linha>
 *
 * O motor monta runs/<id>/attempt-N/conflitos.json (sempre; `[]` sem conflito)
 * e, com ≥ 1 conflito e QUALQUER diff, encerra a tentativa sem enforcement, sem
 * juiz e sem merge: bloqueado com causa SPEC_CONFLITANTE, tentativa devolvida, o
 * diff guardado em runs/<id>/attempt-N/ (decisões do Lucas, 01/11: sem status
 * literal novo). Triador: D15, R3 firme.
 *
 * Caso real (dashboard-comercial, 29/10): o 043 descobriu que a prévia do rateio
 * por cliente não tem fonte na allowlist, escreveu isso em prosa num IMPEDIMENTO
 * e o motor só viu na tentativa seguinte, com o diff parado. Com o diff da
 * tentativa 0 (que muda) e a linha CONFLITO, o conflito agora para na hora.
 */
import { it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';
import {
  FX_L14, chamadasDoJuiz, drenagemL14, eventos, repoL14, ticketDoCaso,
} from './fixtures/l14/caso.js';
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js';
import { extrair } from '../scripts/orquestrador/triador/extrair.js';

const L13 = join(REPO_ROOT, 'test', 'fixtures', 'l13', '043');
const OK = '-c user.email=t@t -c user.name=t';
/** Critérios reais 1, 2 (grep) e 4 (avaliador); os de vitest saem rc 127 no repo sintético e o juiz seria pulado. */
const caso043 = () =>
  repoL14('043', { base: { 'src/components/financeiro-v2/entradas-cliente.tsx': 'entradas-cliente.tsx.txt' }, criterios: [1, 2, 4] });
/** O diff real da tentativa 0 com o corpo de commit dado. */
const comDiff = (corpo: string) =>
  `git apply '${L13}/attempt-0.diff.patch' && git add -A -- src && git ${OK} commit -q -F '${corpo}'`;
const runs = (fx: string, ...p: string[]) => join(fx, 'docs', 'fila', 'runs', '043', ...p);

describeHarness('L14 P3: CONFLITO declarado bloqueia com SPEC_CONFLITANTE', () => {
  it('043 com diff que muda e uma linha CONFLITO: bloqueado sem enforcement, sem juiz, sem merge; tentativa devolvida; R3/D15', () => {
    const c = caso043();
    const log = drenagemL14(c, [comDiff(join(FX_L14, '043', 'commit-conflito.txt'))]);
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    const nota = String(t.notas_status);
    expect(nota).toContain('SPEC_CONFLITANTE');
    expect(nota).toContain('o ticket pede a prévia do rateio por cliente no cartão da MDS');
    expect(nota).toContain('src/lib/financeiro/v2/entradas.ts:35');
    // O IMPEDIMENTO do mesmo commit vai junto no motivo.
    expect(nota).toContain('IMPEDIMENTO: typecheck e build não rodados');
    expect(chamadasDoJuiz(c)).toBe(0);
    expect(Number(t.tentativas ?? 0)).toBe(0);
    const conf = JSON.parse(readFileSync(runs(c.fx, 'attempt-0', 'conflitos.json'), 'utf8'));
    expect(conf).toEqual([{
      ticket: 'o ticket pede a prévia do rateio por cliente no cartão da MDS',
      codigo: 'resumo.mds traz só { clientes, valorMensal }, sem a lista por cliente (ticket 031, fora da allowlist)',
      ref: 'src/lib/financeiro/v2/entradas.ts:35',
    }]);
    const v = JSON.parse(readFileSync(runs(c.fx, 'attempt-0', 'veredito.json'), 'utf8'));
    expect(v.causa).toBe('SPEC_CONFLITANTE');
    expect(v.contaComoRetry).toBe(false);
    // O diff fica guardado; enforcement não rodou; nada foi mergeado.
    expect(readFileSync(runs(c.fx, 'attempt-0', 'diff.patch'), 'utf8')).toContain('mds-util.test.ts');
    expect(existsSync(runs(c.fx, 'attempt-0', 'enforcement.json'))).toBe(false);
    const ev = eventos(c);
    expect(ev).toMatch(/ 043 BLOQUEADO motivo=SPEC_CONFLITANTE conflitos=1 attempt=1/);
    expect(ev).not.toMatch(/ 043 (MERGE|APROVADO|ENFORCEMENT)/);
    const x = extrair(lerRepoKit(c.fx, '043'));
    expect(x.classe).toBe('R3');
    expect(x.firme).toBe(true);
    expect(x.regra).toBe('D15');
    expect(x.remedio).toContain('prévia do rateio');
  }, 180_000);

  it('dois CONFLITO num commit vazio: os dois no conflitos.json e na nota', () => {
    const c = caso043();
    const log = drenagemL14(c, [`git ${OK} commit -q --allow-empty -F '${join(FX_L14, '043', 'commit-dois-conflitos.txt')}'`]);
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    const conf = JSON.parse(readFileSync(runs(c.fx, 'attempt-0', 'conflitos.json'), 'utf8'));
    expect(conf).toHaveLength(2);
    expect(conf[1].ref).toBe('src/app/api/financeiro-v2/entradas/mds/route.ts:1');
    expect(String(t.notas_status)).toContain('{ mes, resumoMds, aoMudar }');
    expect(eventos(c)).toMatch(/ 043 BLOQUEADO motivo=SPEC_CONFLITANTE conflitos=2 attempt=1/);
  }, 180_000);

  it('contraprova: o 043 real da tentativa 0 (só IMPEDIMENTO, diff que muda) segue ao juiz e grava conflitos.json vazio', () => {
    const c = caso043();
    const log = drenagemL14(c, [comDiff(join(L13, 'commit-attempt-0.txt')), 'true']);
    expect(chamadasDoJuiz(c), log).toBeGreaterThan(0);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('SPEC_CONFLITANTE');
    expect(JSON.parse(readFileSync(runs(c.fx, 'attempt-0', 'conflitos.json'), 'utf8'))).toEqual([]);
  }, 180_000);

  it('o prompt ensina a linha CONFLITO', () => {
    const c = caso043();
    drenagemL14(c, [comDiff(join(FX_L14, '043', 'commit-conflito.txt'))]);
    const prompt = readFileSync(runs(c.fx, 'attempt-0', 'prompt.txt'), 'utf8');
    expect(prompt).toContain('CONFLITO: <o ticket diz> | <o código ou a base diz> | <arquivo:linha>');
  }, 180_000);
});
