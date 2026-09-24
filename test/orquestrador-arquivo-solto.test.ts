/**
 * Ticket 631 (harness manual, 24/09/2026) — arquivo solto fora da allowlist
 * reprova por mérito, com retry e o nome do arquivo no diagnóstico.
 *
 * Sequência real do 513 attempt-0 (23/09): o agente commitou o trabalho (9
 * arquivos na allowlist) e deixou um diag-tmp.txt NÃO rastreado. O
 * commit_do_agente fez `git add -A`, commitou `wip(513)` com o arquivo e logou
 * "o agente saiu sem commitar" (falso); o enforcement acusou
 * `fora_do_pathspec: diag-tmp.txt`, e o decisao.ts mandou para `refatiar`, sem
 * retry e sem diagnóstico. Um ticket verde saiu da fila por um rascunho.
 *
 * `run_attempt`/`drive_ticket` de VERDADE (executor.sh sourced) num repo git
 * sintético: o agente é o STUB nativo do executor; gates vazios; o juiz é
 * interceptado (aprova e conta chamadas); `claude_run` redefinido para falhar
 * alto (lição do 623: STUB depois do source, nunca o claude real).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

function fixtureRepo(maxRetries = 0): { fx: string; wt: string } {
  const tmp = mkdtempSync(join(tmpdir(), 'orq-631-'));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(fx, 'src'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });
  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & {
    _execucao_dos_gates: Record<string, unknown>;
  };
  // Gates não são o assunto: vazios, o motor aprova o conjunto sem rodar nada.
  cfg.gates = [];
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: [] };
  cfg.max_retries = maxRetries;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
  const ticket = {
    id: '901',
    bloco: 'B6',
    slug: 'solto',
    risco: 'baixo',
    status: 'pendente',
    origem: 'humano',
    objetivo: 'escreve a.ts',
    pathspec_allowlist: ['a.ts'],
    dependencias: [],
    criterios_aceite: [
      { tipo: 'alvo', descricao: 'o arquivo existe', cmd: 'test -f a.ts && echo ok', espera: 'ok' },
      { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
    ],
  };
  writeFileSync(join(fx, 'docs', 'fila', '901-solto.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\`\n`);
  writeFileSync(join(fx, 'src', 'base.ts'), 'base\n');
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('branch', String(cfg.branch_alvo));
  mkdirSync(join(fx, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(fx, 'node_modules', '.bin', 'tsx'));
  // O enforcement.sh resolve enforcement-core.ts por ORQ_EXEC_ROOT (o fixture):
  // o link aponta para o motor SOB TESTE, fora do git do fixture.
  symlinkSync(join(REPO_ROOT, 'scripts'), join(fx, 'scripts'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\nscripts\n.roteiro*\n.juiz-chamadas\n');
  const wt = join(tmp, '_worktrees', 'wt-901');
  g('worktree', 'add', '-q', '-b', 'teste/901', wt, 'main');
  return { fx, wt };
}

const COMMIT = "git -c user.email=a@a -c user.name=agente";
const JUIZ_APROVA = (fx: string) => `
    run_juiz() {
      echo x >> '${fx}/.juiz-chamadas'
      JUIZ_ROU=1; JUIZ_APROVADO=true; JUIZ_ILEGIVEL=0; JUIZ_MOTIVO=""; JUIZ_FALHOS=""
    }`;

/**
 * UMA tentativa (run_attempt) com o STUB fazendo o papel do agente, e o
 * diagnóstico de retry montado em seguida. Devolve log, veredito e diagnóstico.
 */
function tentativa(fx: string, wt: string, stub: string): { log: string; veredito: Record<string, unknown>; diag: string; rundir: string } {
  const rundir = join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0');
  const script = `
    source '${EXECUTOR}'
    set +e
    STUB="$ORQ_TESTE_STUB"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    ${JUIZ_APROVA(fx)}
    f="$(ticket_file_by_id 901)"
    base="$(git -C '${wt}' rev-parse HEAD)"
    run_attempt "$f" '${wt}' '${rundir}' sonnet "" 0 "$base" ""
    echo "RESULT=$RESULT"
    echo "DIAG_INICIO"
    diagnostico_retry "$f" '${rundir}'
    echo
    echo "DIAG_FIM"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub },
  });
  const log = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const vf = join(rundir, 'veredito.json');
  const veredito = existsSync(vf) ? (JSON.parse(readFileSync(vf, 'utf8')) as Record<string, unknown>) : {};
  const diag = /DIAG_INICIO\n([\s\S]*?)\nDIAG_FIM/.exec(r.stdout ?? '')?.[1] ?? '';
  return { log, veredito, diag, rundir };
}

const soltos = (rundir: string) => readFileSync(join(rundir, 'arquivos-soltos.txt'), 'utf8');

describe('631: arquivo solto', () => {
  it('sequência do 513: agente commita a.ts e deixa diag-tmp.txt solto -> reprovado/arquivo_solto com retry e o nome no diagnóstico', () => {
    const { fx, wt } = fixtureRepo();
    const stub = `echo a > a.ts && ${COMMIT} add a.ts && ${COMMIT} commit -qm trabalho && echo rascunho > diag-tmp.txt`;
    const { log, veredito, diag, rundir } = tentativa(fx, wt, stub);

    expect(soltos(rundir), log).toContain('diag-tmp.txt');
    expect(log).toContain('RESULT=reprovado');
    expect(veredito.desfecho).toBe('reprovado');
    expect(veredito.causa).toBe('arquivo_solto');
    expect(veredito.contaComoRetry).toBe(true);
    expect(String(veredito.motivo)).toContain('diag-tmp.txt');
    expect(diag).toContain('diag-tmp.txt');
    expect(diag).toContain('/tmp');
    expect(diag).toContain('remova da worktree: diag-tmp.txt');
    expect(log).not.toContain('saiu sem commitar');
    expect(log).toContain('commitou e deixou 1 arquivo(s) solto(s): diag-tmp.txt');
  }, 180_000);

  it('contra-teste: o agente COMMITA diag-tmp.txt ele mesmo -> refatiar por enforcement', () => {
    const { fx, wt } = fixtureRepo();
    const stub = `echo a > a.ts && echo rascunho > diag-tmp.txt && ${COMMIT} add a.ts diag-tmp.txt && ${COMMIT} commit -qm trabalho`;
    const { log, veredito, rundir } = tentativa(fx, wt, stub);

    expect(soltos(rundir), log).toBe('');
    expect(veredito.desfecho).toBe('refatiar');
    expect(veredito.causa).toBe('enforcement');
  }, 180_000);

  it('contra-teste: arquivo solto que casa zona proibida -> refatiar', () => {
    const { fx, wt } = fixtureRepo();
    const stub =
      `echo a > a.ts && ${COMMIT} add a.ts && ${COMMIT} commit -qm trabalho && ` +
      `printf 'insert into public.leads (id) values (1);\\n' > rascunho.sql`;
    const { log, veredito, rundir } = tentativa(fx, wt, stub);

    expect(soltos(rundir), log).toContain('rascunho.sql');
    const enf = JSON.parse(readFileSync(join(rundir, 'enforcement.json'), 'utf8')) as { violations: { tipo: string }[] };
    // além do fora_do_pathspec, uma violação de zona (escrita em tabela congelada)
    expect(enf.violations.some((v) => v.tipo !== 'fora_do_pathspec'), JSON.stringify(enf)).toBe(true);
    expect(veredito.desfecho).toBe('refatiar');
    expect(veredito.causa).toBe('enforcement');
  }, 180_000);

  it('contra-teste: um solto mais um commitado fora da allowlist (violação mista) -> refatiar', () => {
    const { fx, wt } = fixtureRepo();
    const stub =
      `echo a > a.ts && echo b > b.ts && ${COMMIT} add a.ts b.ts && ${COMMIT} commit -qm trabalho && ` +
      `echo rascunho > diag-tmp.txt`;
    const { log, veredito, rundir } = tentativa(fx, wt, stub);

    expect(soltos(rundir), log).toContain('diag-tmp.txt');
    expect(veredito.desfecho).toBe('refatiar');
    expect(veredito.causa).toBe('enforcement');
  }, 180_000);

  it('contra-teste: nenhum commit do agente e tudo solto dentro da allowlist -> "saiu sem commitar" e sem violação', () => {
    const { fx, wt } = fixtureRepo();
    const { log, veredito, rundir } = tentativa(fx, wt, 'echo a > a.ts');

    expect(soltos(rundir), log).toContain('a.ts');
    expect(log).toContain('agente saiu sem commitar');
    expect(log).not.toContain('commitou e deixou');
    expect(veredito.desfecho).toBe('aprovado');
    const enf = JSON.parse(readFileSync(join(rundir, 'enforcement.json'), 'utf8')) as { violations?: unknown[] };
    expect(enf.violations ?? []).toEqual([]);
  }, 180_000);

  it('drive_ticket: o retry do arquivo_solto reaproveita a worktree, mantém o modelo e aprova quando o agente remove o arquivo', () => {
    const { fx } = fixtureRepo(1);
    writeFileSync(
      join(fx, '.roteiro'),
      [
        `echo a > a.ts && ${COMMIT} add a.ts && ${COMMIT} commit -qm trabalho && echo rascunho > diag-tmp.txt`,
        `${COMMIT} rm -q diag-tmp.txt && ${COMMIT} commit -qm 'remove o rascunho'`,
      ].join('\n') + '\n',
    );
    const stub = `cmd="$(head -1 '${fx}/.roteiro')"; sed -i.bak 1d '${fx}/.roteiro'; eval "$cmd"`;
    const script = `
      source '${EXECUTOR}'
      set +e
      STUB="$ORQ_TESTE_STUB"
      claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
      ticket_commit() { return 0; }
      cooldown_arm() { return 0; }
      ${JUIZ_APROVA(fx)}
      drive_ticket "$(ticket_file_by_id 901)"
    `;
    const r = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub },
    });
    const log = `${r.stdout ?? ''}${r.stderr ?? ''}`;
    const ev = readFileSync(join(fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8')
      .split('\n')
      .filter((l) => / 901 /.test(l));

    const reprovado = ev.find((l) => / REPROVADO /.test(l)) ?? '';
    expect(reprovado, log).toContain('motivo=arquivo_solto');
    const retry = ev.find((l) => / RETRY /.test(l)) ?? '';
    expect(retry).toContain('worktree=reaproveitada');
    expect(retry).toContain('model=sonnet');
    expect(ev.some((l) => / APROVADO /.test(l))).toBe(true);
    expect(ev.some((l) => / REFATIAR /.test(l))).toBe(false);
    // o prompt do retry leva a instrução com o nome do arquivo
    const p1 = readFileSync(join(fx, 'docs', 'fila', 'runs', '901', 'attempt-1', 'prompt.txt'), 'utf8');
    expect(p1).toContain('remova da worktree: diag-tmp.txt');
  }, 180_000);
});
