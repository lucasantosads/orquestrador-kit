/**
 * Etapa L14, P1 (7d-2, C1): o recon roda na worktree recém-criada da branch
 * alvo, antes da tentativa. Divergiu = bloqueado com causa SPEC_DESATUALIZADA
 * (decisão D1 do Lucas, 18/10: não `obsoleto`), sem chamar modelo e sem
 * consumir tentativa, com o comando e a saída no motivo.
 *
 * Caso real (comarka-operacional, 08/10): o 853 espera `/` → `/equipe-geral`
 * (recon[2]), mas a staging-auto já redirecionava para `/dashboard`. O executor
 * de lá marcou `obsoleto (recon_esperado)` sem tentativa; o do kit não tinha
 * recon nenhum e mandaria o agente trabalhar sobre a premissa falsa.
 *
 * Calibração (relatório da L14, §4): C1 com 0 FP em 1712 comandos de recon nas
 * bases de 839 done do Comarka e 0 FP de ambiente em 2349 execuções reais.
 * Bloqueia em qualquer `modo_pre_voo` (o config de referência está em `aviso`).
 */
import { it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { describeHarness } from './fixtures/orq-harness.js';
import {
  chamadasDoAgente, drenagemL14, eventos, prevooTxt, repoL14, ticketDoCaso,
} from './fixtures/l14/caso.js';
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js';
import { extrair } from '../scripts/orquestrador/triador/extrair.js';

/** O 853 com critérios simples: os reais chamam npx e o git da frente. */
const CRIT = [
  { tipo: 'alvo', descricao: '/ vai para /portal', cmd: `grep -c 'redirect("/portal")' src/app/page.tsx`, espera: '1' },
  { tipo: 'avaliador', descricao: 'avaliador', cmd: 'true', espera: 'avaliador' },
];
const caso853 = (base: string, ajuste?: (t: Record<string, unknown>) => void) =>
  repoL14('853', {
    base: { 'src/app/page.tsx': base },
    ajuste: (t) => { t.criterios_aceite = CRIT; ajuste?.(t); },
  });

/** recon[2] real do 1084 (Comarka, 4aad08d): `paste -sd' '` sem `-` → `usage:` no macOS. */
const RECON_1084 = {
  descricao: 'so o teste proprio e o pacote E do 834b citam a rota ou a lib em test/',
  cmd: "grep -rl 'crm/backfill\\|backfill-progresso' test/ | sort | paste -sd' '",
  espera: 'test/crm-backfill-progresso.test.ts test/sai-cockpit-id-api-e.test.ts',
};

describeHarness('L14 P1: recon divergente bloqueia com SPEC_DESATUALIZADA', () => {
  it('853 real: recon[2] diverge na base → bloqueado, sem agente, sem INICIO, sem tentativa; triador R3/D14', () => {
    const c = caso853('page.tsx.txt');
    const log = drenagemL14(c, ['true']);
    const t = ticketDoCaso(c);
    expect(t.status, log).toBe('bloqueado');
    const nota = String(t.notas_status);
    expect(nota).toContain('SPEC_DESATUALIZADA');
    expect(nota).toContain(`recon[2]`);
    expect(nota).toContain(`grep -c 'redirect("/equipe-geral")' src/app/page.tsx`);
    expect(nota).toContain("esperava '1'");
    expect(nota).toContain("obteve '0'");
    expect(Number(t.tentativas ?? 0)).toBe(0);
    expect(chamadasDoAgente(c)).toBe(0);
    const ev = eventos(c);
    expect(ev).toMatch(/ 853 BLOQUEADO motivo=SPEC_DESATUALIZADA recon=2/);
    expect(ev).not.toMatch(/ 853 INICIO /);
    expect(existsSync(join(c.fx, 'docs', 'fila', 'runs', '853', 'attempt-0'))).toBe(false);
    const p = prevooTxt(c);
    expect(p).toMatch(/### recon\[0\] -> ok/);
    expect(p).toMatch(/### recon\[2\] -> DIVERGIU/);
    const x = extrair(lerRepoKit(c.fx, '853'));
    expect(x.classe).toBe('R3');
    expect(x.firme).toBe(true);
    expect(x.regra).toBe('D14');
    expect(x.remedio).toContain('recon[2]');
  }, 180_000);

  it('o nome novo `recon` vale igual ao `recon_esperado`', () => {
    const c = caso853('page.tsx.txt', (t) => { t.recon = t.recon_esperado; delete t.recon_esperado; });
    const log = drenagemL14(c, ['true']);
    expect(ticketDoCaso(c).status, log).toBe('bloqueado');
    expect(String(ticketDoCaso(c).notas_status)).toContain('SPEC_DESATUALIZADA');
  }, 180_000);

  it('contraprova: com a base de quando o 853 foi escrito (/equipe-geral) o recon passa e o agente roda', () => {
    const c = caso853('page-equipe-geral.tsx.txt');
    const log = drenagemL14(c, ['true', 'true']);
    expect(eventos(c), log).toMatch(/ 853 INICIO /);
    expect(chamadasDoAgente(c)).toBeGreaterThan(0);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('SPEC_DESATUALIZADA');
    // Só na primeira tentativa da drenagem: duas tentativas, um recon.
    expect(prevooTxt(c).match(/### recon\[2\]/g)?.length).toBe(1);
  }, 180_000);

  it('recon que não roda (usage: do paste, recon real do 1084) bloqueia com a saída no motivo', () => {
    const c = caso853('page-equipe-geral.tsx.txt', (t) => { (t.recon_esperado as unknown[]).push(RECON_1084); });
    const log = drenagemL14(c, ['true']);
    const nota = String(ticketDoCaso(c).notas_status);
    expect(ticketDoCaso(c).status, log).toBe('bloqueado');
    expect(nota).toContain('SPEC_DESATUALIZADA');
    expect(nota).toContain('recon[3]');
    expect(nota).toContain('usage:');
    expect(chamadasDoAgente(c)).toBe(0);
  }, 180_000);

  it('rc 127 bloqueia mesmo quando a saída casaria a espera', () => {
    const c = caso853('page-equipe-geral.tsx.txt', (t) => {
      (t.recon_esperado as unknown[]).push({ descricao: 'binário ausente', cmd: 'comando-que-nao-existe-l14', espera: '' });
    });
    const log = drenagemL14(c, ['true']);
    expect(ticketDoCaso(c).status, log).toBe('bloqueado');
    expect(String(ticketDoCaso(c).notas_status)).toContain('rc=127');
    expect(chamadasDoAgente(c)).toBe(0);
  }, 180_000);

  it('timeout do recon é aviso: PREVOO_AVISO regra=C1 e o ticket segue', () => {
    const c = caso853('page-equipe-geral.tsx.txt', (t) => {
      (t.recon_esperado as unknown[]).push({ descricao: 'lento', cmd: 'sleep 5; echo ok', espera: 'ok' });
    });
    const log = drenagemL14(c, ['true', 'true'], { ORQ_PREVOO_TETO_SECS: '1' });
    expect(eventos(c), log).toMatch(/ 853 PREVOO_AVISO regra=C1 recon=3 timeout=1s/);
    expect(eventos(c)).toMatch(/ 853 INICIO /);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('SPEC_DESATUALIZADA');
  }, 180_000);
});
