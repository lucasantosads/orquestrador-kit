/**
 * Etapa L14b, P0: `recon` que não é array de objetos com `cmd` string matava o
 * executor. O jq de `prevoo_exec` (`(.recon // .recon_esperado)[$i].cmd`) dá
 * rc 5 num objeto ou numa string, e a atribuição sob `set -euo pipefail` encerra
 * o processo: EXECUTOR_MORREU, ticket sem nota, e a drenagem seguinte pega o
 * mesmo ticket e morre de novo. Agora a passada confere o formato antes do laço
 * e bloqueia com SPEC_DESATUALIZADA (a classe de spec da L14), sem tentativa e
 * sem modelo.
 *
 * O `drenagemL14` roda com `set +e` (onde o jq que falha só esvazia o `cmd`);
 * aqui o driver é o `main` de produção: `set -e` da linha 23, traps armados e
 * `proximo_pendente`.
 */
import { it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';
import { chamadasDoAgente, eventos, prevooTxt, repoL14, ticketDoCaso, type Caso } from './fixtures/l14/caso.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const CRIT = [
  { tipo: 'alvo', descricao: '/ vai para /portal', cmd: `grep -c 'redirect("/portal")' src/app/page.tsx`, espera: '1' },
  { tipo: 'avaliador', descricao: 'avaliador', cmd: 'true', espera: 'avaliador' },
];
const caso = (recon: unknown) =>
  repoL14('853', {
    base: { 'src/app/page.tsx': 'page-equipe-geral.tsx.txt' },
    ajuste: (t) => { t.criterios_aceite = CRIT; delete t.recon_esperado; t.recon = recon; },
  });

/** Uma drenagem com o errexit e os traps de produção. */
function drenagemProducao(c: Caso): string {
  const { fx } = c;
  writeFileSync(join(fx, '.roteiro-0'), 'true\n');
  const stub = `echo x >> '${fx}/.agente-chamadas'; bash '${fx}/.roteiro-0'`;
  const script = `
    source '${EXECUTOR}'
    STUB="$ORQ_TESTE_STUB"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_juiz() { JUIZ_ROU=1; JUIZ_APROVADO=false; JUIZ_ILEGIVEL=0; JUIZ_MOTIVO='teste'; JUIZ_FALHOS='x'; }
    armar_traps
    file="$(proximo_pendente)"
    [ -n "$file" ] || { echo 'nenhum pendente'; exit 0; }
    drive_ticket "$file"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub },
  });
  return `rc=${r.status}\n${r.stdout ?? ''}${r.stderr ?? ''}`;
}

describeHarness('L14b P0: recon malformado bloqueia em vez de matar o executor', () => {
  for (const [nome, recon, tipo] of [
    ['objeto', { cmd: 'echo x', espera: 'x' }, 'object'],
    ['array de strings', ['test -f src/app/page.tsx'], 'array de string'],
  ] as const) {
    it(`recon ${nome} → bloqueado SPEC_DESATUALIZADA com nota; a 2ª drenagem não tenta de novo`, () => {
      const c = caso(recon);
      const log = drenagemProducao(c);
      expect(eventos(c), log).not.toMatch(/EXECUTOR_MORREU/);
      const t = ticketDoCaso(c);
      expect(t.status, log).toBe('bloqueado');
      const nota = String(t.notas_status);
      expect(nota).toContain('SPEC_DESATUALIZADA');
      expect(nota).toContain(`recon malformado (${tipo})`);
      expect(prevooTxt(c)).toContain(`### recon -> MALFORMADO (${tipo})`);
      expect(eventos(c)).toMatch(/ 853 BLOQUEADO motivo=SPEC_DESATUALIZADA recon=malformado/);
      expect(eventos(c)).not.toMatch(/ 853 INICIO /);
      expect(Number(t.tentativas ?? 0)).toBe(0);
      expect(chamadasDoAgente(c)).toBe(0);

      const log2 = drenagemProducao(c);
      expect(log2).toContain('nenhum pendente');
      expect(eventos(c).match(/ 853 BLOQUEADO /g)?.length).toBe(1);
      expect(chamadasDoAgente(c)).toBe(0);
    }, 180_000);
  }
});
