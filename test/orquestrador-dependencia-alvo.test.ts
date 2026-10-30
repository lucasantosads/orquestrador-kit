/**
 * Etapa L13, P3: dependência de leitura fora da branch alvo barrada no pré-voo.
 *
 * Causa (dashboard-comercial, 29/10/2026): as fixtures
 * `src/lib/financeiro/v2/fatura/__fixtures__/*.txt` entraram em ea57887c
 * ("fila: lote 7") só na main. A frente do 044 nasce da staging-auto e o teste
 * deu ENOENT; o 044 gastou duas tentativas e bloqueou por retry_sem_mudanca. O
 * C9 não viu porque só confere a allowlist, e a fixture é só LIDA.
 *
 * Regra: caminho citado no objetivo ou num cmd de critério, fora da allowlist e
 * de cria_novo, que existe no checkout e não existe na branch alvo. Barra antes
 * da worktree e do contador, em qualquer modo_pre_voo, com a causa
 * DEPENDENCIA_FORA_DA_ALVO. Medido no dashboard em 29/10: 2 disparos (044, 045),
 * os dois verdadeiros; 0 hoje; 0 no Comarka.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';
import { chamadasDoJuizCaso, drenagemCaso, repoDoCaso, ticketDoCaso } from './fixtures/l13/caso.js';
import { dependenciasForaDaAlvo } from '../scripts/orquestrador/gate-ticket.js';
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js';
import { extrair } from '../scripts/orquestrador/triador/extrair.js';

const FX_L13 = join(REPO_ROOT, 'test', 'fixtures', 'l13');
const ticketReal = (id: string) => JSON.parse(readFileSync(join(FX_L13, id, 'ticket.json'), 'utf8')) as Record<string, unknown>;
const FIXTURE_BB = 'src/lib/financeiro/v2/fatura/__fixtures__/bb-2026-08.txt';

describe('L13 P3: dependenciasForaDaAlvo', () => {
  const ctx = (checkout: string[], alvo: string[]) => ({
    noDisco: (p: string) => checkout.includes(p),
    naAlvo: (p: string) => (alvo.includes(p) ? ('arquivo' as const) : null),
  });

  it('044: a fixture lida pelo teste existe no checkout e não na alvo', () => {
    expect(dependenciasForaDaAlvo(ticketReal('044'), ctx([FIXTURE_BB], []))).toEqual([FIXTURE_BB]);
  });

  it('044 com a fixture na alvo: nada', () => {
    expect(dependenciasForaDaAlvo(ticketReal('044'), ctx([FIXTURE_BB], [FIXTURE_BB]))).toEqual([]);
  });

  it('arquivo da allowlist ou de cria_novo nunca é dependência', () => {
    const t = ticketReal('044');
    const allow = t.pathspec_allowlist as string[];
    expect(dependenciasForaDaAlvo(t, ctx(allow, []))).toEqual([]);
  });

  it('ticket sem dependência (037): nada', () => {
    expect(dependenciasForaDaAlvo(ticketReal('037'), ctx([], []))).toEqual([]);
  });
});

describeHarness('L13 P3: o pré-voo barra o 044 sem gastar tentativa', () => {
  function repo044(): ReturnType<typeof repoDoCaso> {
    const c = repoDoCaso('044');
    const d = join(c.fx, 'src', 'lib', 'financeiro', 'v2', 'fatura', '__fixtures__');
    mkdirSync(d, { recursive: true });
    writeFileSync(join(c.fx, FIXTURE_BB), 'Vencimento\n08/08/2026\n');
    const g = (...a: string[]) => spawnSync('git', ['-C', c.fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
    g('add', '-A');
    g('commit', '-qm', 'fila: lote 7 (fixtures só na main)');
    return c;
  }

  it('fixture só na main: bloqueado por DEPENDENCIA_FORA_DA_ALVO, sem worktree, sem INICIO, sem tentativa', () => {
    const c = repo044();
    const log = drenagemCaso(c, 'real0');
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    const nota = String(t.notas_status);
    expect(nota).toContain('DEPENDENCIA_FORA_DA_ALVO');
    expect(nota).toContain(FIXTURE_BB);
    expect(nota).toMatch(/existe em main@[0-9a-f]{8}/);
    expect(nota).toMatch(/ausente em staging-auto@[0-9a-f]{8}/);
    expect(Number(t.tentativas ?? 0)).toBe(0);
    expect(chamadasDoJuizCaso(c)).toBe(0);
    const eventos = readFileSync(join(c.fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8');
    expect(eventos).toMatch(/ 044 BLOQUEADO motivo=DEPENDENCIA_FORA_DA_ALVO arquivos=src\/lib\/financeiro\/v2\/fatura\/__fixtures__\/bb-2026-08\.txt/);
    expect(eventos).not.toMatch(/ 044 INICIO /);
    expect(existsSync(join(c.fx, 'docs', 'fila', 'runs', '044', 'attempt-0'))).toBe(false);
    // Triador: bloqueado sem tentativa (D0), com a nota (decisão do Lucas, 30/10).
    const x = extrair(lerRepoKit(c.fx, '044'));
    expect(x.regra).toBe('D0');
    expect(x.evidencia.map((e) => e.trecho).join(' ')).toContain('DEPENDENCIA_FORA_DA_ALVO');
  }, 180_000);

  it('contraprova: com a fixture também na alvo, o 044 roda (INICIO e juiz)', () => {
    const c = repo044();
    spawnSync('git', ['-C', c.fx, 'branch', '-f', 'staging-auto', 'main'], { encoding: 'utf8' });
    const log = drenagemCaso(c, 'real0', '=');
    const eventos = readFileSync(join(c.fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8');
    expect(eventos, log).toMatch(/ 044 INICIO /);
    expect(chamadasDoJuizCaso(c)).toBeGreaterThan(0);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('DEPENDENCIA_FORA_DA_ALVO');
  }, 180_000);
});
