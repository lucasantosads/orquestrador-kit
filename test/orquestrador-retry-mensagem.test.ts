/**
 * Etapa L13, P1 (M-02 parcial): a assinatura do retry_sem_mudanca inclui as
 * mensagens dos commits da frente.
 *
 * Causa (dashboard-comercial, 29/10/2026): no 037 e no 039 a tentativa 1 passou
 * typecheck, testes, build e critérios, e o juiz reprovou só o CORPO do commit
 * ("não vi o controle negativo falhar"). Na tentativa 2 o agente mudou só a
 * mensagem (037: commit vazio ce346b5d; 039: amend 24ed0691). O diff.patch saiu
 * idêntico e o executor bloqueou por retry_sem_mudanca sem chamar o juiz, que
 * era o único que podia ler a correção.
 *
 * Fixtures: `test/fixtures/l13/<id>/` copiadas de `docs/fila/runs/<id>` do
 * dashboard (diff.patch de cada tentativa e o corpo dos commits reais). O ticket
 * é o bloco real, com os critérios trocados por `test -f` (os reais rodam o
 * vitest do dashboard, que não existe no repo sintético). Gates vazios.
 *
 * `drive_ticket` de VERDADE, juiz interceptado (reprova sempre), como no
 * orquestrador-retry-feedback-juiz.test.ts.
 */
import { it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describeHarness, REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FX_L13 = join(REPO_ROOT, 'test', 'fixtures', 'l13');

interface Caso {
  fx: string;
  id: string;
  arquivo: string;
}

/** Repo sintético com o ticket real `id` e a base que o diff.patch dele precisa. */
export function repoDoCaso(id: string): Caso {
  const tmp = mkdtempSync(join(tmpdir(), `orq-l13-${id}-`));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(fx, 'src'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });
  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & {
    _execucao_dos_gates: Record<string, unknown>;
  };
  cfg.gates = [];
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: [] };
  cfg.max_retries = 1;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
  const t = JSON.parse(readFileSync(join(FX_L13, id, 'ticket.json'), 'utf8')) as Record<string, unknown>;
  const allow = t.pathspec_allowlist as string[];
  t.status = 'pendente';
  t.criterios_aceite = [
    { tipo: 'alvo', descricao: 'o primeiro arquivo da allowlist existe', cmd: `test -f ${allow[0]} && echo ok`, espera: 'ok' },
    { tipo: 'avaliador', descricao: 'avaliador: o objetivo do ticket real', cmd: 'true', espera: 'avaliador' },
  ];
  const arquivo = `${id}-${String(t.slug)}.md`;
  writeFileSync(join(fx, 'docs', 'fila', arquivo), `# ${id}\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
  writeFileSync(join(fx, 'src', 'base.ts'), 'base\n');
  if (id === '043') {
    const d = join(fx, 'src', 'components', 'financeiro-v2');
    mkdirSync(d, { recursive: true });
    copyFileSync(join(FX_L13, '043', 'base', 'entradas-cliente.tsx.txt'), join(d, 'entradas-cliente.tsx'));
  }
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('branch', String(cfg.branch_alvo));
  mkdirSync(join(fx, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(fx, 'node_modules', '.bin', 'tsx'));
  symlinkSync(join(REPO_ROOT, 'scripts'), join(fx, 'scripts'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\nscripts\n.roteiro*\n.juiz-chamadas\n');
  return { fx, id, arquivo };
}

/**
 * O que o agente faz em cada tentativa, com os commits REAIS do caso:
 *   `real0`  aplica o diff.patch da tentativa 0 e commita com o corpo real dela;
 *   `vazio1` commit vazio com o corpo real da tentativa 1 (037, 043);
 *   `amend1` amend com o corpo real da tentativa 1 (039);
 *   `=`      não faz nada (mesmo diff, mesma mensagem).
 */
export function passo(id: string, p: string): string {
  const d = join(FX_L13, id);
  const ok = `-c user.email=t@t -c user.name=t`;
  switch (p) {
    case 'real0':
      return `git apply '${d}/attempt-0.diff.patch' && git add -A -- src && git ${ok} commit -q -F '${d}/commit-attempt-0.txt'`;
    case 'vazio1':
      return `git ${ok} commit -q --allow-empty -F '${d}/commit-attempt-1.txt'`;
    case 'amend1':
      return `git ${ok} commit -q --amend -F '${d}/commit-attempt-1.txt'`;
    default:
      return 'true';
  }
}

export function drenagemCaso(c: Caso, ...roteiro: string[]): string {
  const { fx } = c;
  roteiro.forEach((p, i) => writeFileSync(join(fx, `.roteiro-${i}`), passo(c.id, p) + '\n'));
  writeFileSync(join(fx, '.roteiro-n'), '0\n');
  const stub = `n="$(cat '${fx}/.roteiro-n')"; echo $((n + 1)) > '${fx}/.roteiro-n'; bash '${fx}/.roteiro-'"$n"`;
  const juiz = JSON.stringify({ aprovado: false, motivo: 'o corpo do commit não diz qual caso foi visto falhando', criterios_falhos: ['controle negativo relatado'] });
  const script = `
    source '${EXECUTOR}'
    set +e
    STUB="$ORQ_TESTE_STUB"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_juiz() {
      local rundir="$3"
      echo x >> '${fx}/.juiz-chamadas'
      printf '%s\\n' '${juiz}' > "$rundir/juiz.veredito.json"
      JUIZ_ROU=1; JUIZ_APROVADO=false; JUIZ_ILEGIVEL=0
      JUIZ_MOTIVO="$(jq -r '.motivo' "$rundir/juiz.veredito.json")"
      JUIZ_FALHOS="$(jq -r '.criterios_falhos[]' "$rundir/juiz.veredito.json" | paste -sd';' - | sed 's/;/; /g')"
    }
    drive_ticket "$(ticket_file_by_id ${c.id})"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub },
  });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

export function ticketDoCaso(c: Caso): Record<string, unknown> {
  const md = readFileSync(join(c.fx, 'docs', 'fila', c.arquivo), 'utf8');
  return JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)![1]!) as Record<string, unknown>;
}

export function chamadasDoJuizCaso(c: Caso): number {
  const f = join(c.fx, '.juiz-chamadas');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0;
}

const run = (c: Caso, n: number, f: string) => join(c.fx, 'docs', 'fila', 'runs', c.id, `attempt-${n}`, f);

describeHarness('L13 P1: diff igual com mensagem nova chama o juiz', () => {
  it('037 (commit vazio ce346b5d): o juiz é chamado de novo, sem retry_sem_mudanca', () => {
    const c = repoDoCaso('037');
    const log = drenagemCaso(c, 'real0', 'vazio1');
    expect(readFileSync(run(c, 1, 'diff.patch'), 'utf8'), log).toBe(readFileSync(run(c, 0, 'diff.patch'), 'utf8'));
    expect(chamadasDoJuizCaso(c), log).toBe(2);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('retry_sem_mudanca');
    // A tentativa 2 rodou o pipeline inteiro de novo (sem reaproveitar gates).
    expect(existsSync(run(c, 1, 'enforcement.json')), log).toBe(true);
    expect(existsSync(run(c, 1, 'criterios.txt')), log).toBe(true);
    // mensagens.txt: o corpo real, sem o trailer do config e sem Co-Authored-By.
    const m1 = readFileSync(run(c, 1, 'mensagens.txt'), 'utf8');
    expect(m1).toContain('Controles negativos (todos deram exit 1 sem OK)');
    expect(m1).not.toMatch(/^Orq-Ticket:/m);
    expect(m1).not.toMatch(/^Co-Authored-By:/m);
  }, 180_000);

  it('039 (amend 24ed0691): o juiz é chamado de novo, sem retry_sem_mudanca', () => {
    const c = repoDoCaso('039');
    const log = drenagemCaso(c, 'real0', 'amend1');
    expect(readFileSync(run(c, 1, 'diff.patch'), 'utf8'), log).toBe(readFileSync(run(c, 0, 'diff.patch'), 'utf8'));
    expect(chamadasDoJuizCaso(c), log).toBe(2);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('retry_sem_mudanca');
  }, 180_000);

  it('contraprova: mesmo diff e mesma mensagem continua bloqueando por retry_sem_mudanca', () => {
    const c = repoDoCaso('037');
    const log = drenagemCaso(c, 'real0', '=');
    expect(chamadasDoJuizCaso(c), log).toBe(1);
    const t = ticketDoCaso(c);
    expect(t.status).toBe('bloqueado');
    expect(String(t.notas_status)).toContain('retry_sem_mudanca');
  }, 180_000);
});
