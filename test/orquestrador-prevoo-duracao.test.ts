/**
 * Etapa L14b, P2: cada passada do pré-voo fecha com
 * `fim=<ISO 8601 UTC> duracao_s=<inteiro> saida=ok|bloqueio|morte` no
 * `runs/<id>/prevoo.txt`. A leitura semanal confere a duração por ticket;
 * até aqui o arquivo só tinha a hora de início. Passada sem `fim=` = morte
 * por KILL (nenhum trap roda).
 *
 * Fixture: `test/fixtures/l14b/prevoo-070.txt`, o primeiro prevoo.txt real do
 * dashboard (runs/070, 02/11 14:51, motor b2b1c0b), copiado sem mudança. Entra
 * como a passada anterior do mesmo ticket: tem de sair intacta, e a nova
 * passada vem depois dela.
 *
 * Gatilho real da morte por `set -e` (caso c): critério que não é objeto. O jq
 * de `prevoo_criterios` dá rc 5 ("Cannot index string with string \"tipo\"").
 * Com o `recon` malformado já não serve: a P0 o transformou em bloqueio.
 */
import { it, expect } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';
import { drenagemL14, eventos, prevooTxt, repoL14, type Caso } from './fixtures/l14/caso.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FIXTURE = readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'l14b', 'prevoo-070.txt'), 'utf8');
const FIM = (saida: string) => new RegExp(`^fim=\\d{4}-\\d\\d-\\d\\dT\\d\\d:\\d\\d:\\d\\dZ duracao_s=\\d+ saida=${saida}$`, 'm');

const CRIT = [
  { tipo: 'alvo', descricao: '/ vai para /portal', cmd: `grep -c 'redirect("/portal")' src/app/page.tsx`, espera: '1' },
  { tipo: 'avaliador', descricao: 'avaliador', cmd: 'true', espera: 'avaliador' },
];

function caso(base: string, ajuste?: (t: Record<string, unknown>) => void): Caso {
  const c = repoL14('853', {
    base: { 'src/app/page.tsx': base },
    ajuste: (t) => { t.criterios_aceite = CRIT; ajuste?.(t); },
  });
  mkdirSync(join(c.fx, 'docs', 'fila', 'runs', '853'), { recursive: true });
  writeFileSync(join(c.fx, 'docs', 'fila', 'runs', '853', 'prevoo.txt'), FIXTURE);
  return c;
}

/** O `main` de produção: `set -e` da linha 23 e traps armados. */
function scriptProducao(c: Caso): string {
  writeFileSync(join(c.fx, '.roteiro-0'), 'true\n');
  return `
    source '${EXECUTOR}'
    STUB="echo x >> '${c.fx}/.agente-chamadas'"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_juiz() { JUIZ_ROU=1; JUIZ_APROVADO=false; JUIZ_ILEGIVEL=0; JUIZ_MOTIVO='teste'; JUIZ_FALHOS='x'; }
    armar_traps
    drive_ticket "$(ticket_file_by_id ${c.id})"
  `;
}
const envProducao = (c: Caso, extra: Record<string, string> = {}) =>
  ({ ...process.env, ORQ_EXEC_ROOT: c.fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ...extra });

/** A passada nova: o que vem depois da fixture, que fica intacta. */
function passadaNova(c: Caso): string {
  const p = prevooTxt(c);
  expect(p.startsWith(FIXTURE)).toBe(true);
  const nova = p.slice(FIXTURE.length);
  expect(nova).toMatch(/^=== pré-voo executado /);
  expect(nova.match(/^fim=/gm)?.length).toBe(1);
  return nova;
}

describeHarness('L14b P2: a passada do pré-voo grava fim, duração e saída', () => {
  it('(a) passada normal: recon ok → saida=ok, linha de início intacta', () => {
    const c = caso('page-equipe-geral.tsx.txt');
    const log = drenagemL14(c, ['true', 'true']);
    const nova = passadaNova(c);
    expect(nova, log).toMatch(FIM('ok'));
    expect(nova).toMatch(/^=== pré-voo executado \d{4}-\d\d-\d\dT\d\d:\d\d:\d\d[+-]\d{4} · base /);
    expect(nova.trimEnd().split('\n').pop()).toMatch(FIM('ok'));
  }, 180_000);

  it('(b) passada que bloqueia: recon[2] do 853 diverge → saida=bloqueio', () => {
    const c = caso('page.tsx.txt');
    const log = drenagemL14(c, ['true']);
    const nova = passadaNova(c);
    expect(nova, log).toMatch(/### recon\[2\] -> DIVERGIU/);
    expect(nova.trimEnd().split('\n').pop()).toMatch(FIM('bloqueio'));
  }, 180_000);

  it('(b2) recon malformado (P0) também fecha a passada com saida=bloqueio', () => {
    const c = caso('page-equipe-geral.tsx.txt', (t) => { delete t.recon_esperado; t.recon = { cmd: 'x', espera: 'x' }; });
    const log = drenagemL14(c, ['true']);
    expect(passadaNova(c).trimEnd().split('\n').pop(), log).toMatch(FIM('bloqueio'));
  }, 180_000);

  it('(c) morte por set -e no meio da passada (critério que não é objeto) → saida=morte', () => {
    const c = caso('page-equipe-geral.tsx.txt', (t) => { t.criterios_aceite = [CRIT[0], 'texto solto']; });
    const r = spawnSync('bash', ['-c', scriptProducao(c)], { encoding: 'utf8', cwd: c.fx, env: envProducao(c) });
    const log = `rc=${r.status}\n${r.stdout}${r.stderr}`;
    // O gatilho: o executor ainda morre aqui (rc 5 do jq), com a passada aberta.
    expect(eventos(c), log).toMatch(/ 853 EXECUTOR_MORREU rc=5/);
    const nova = passadaNova(c);
    expect(nova).toMatch(/### recon\[2\] -> ok/);
    expect(nova.trimEnd().split('\n').pop()).toMatch(FIM('morte'));
  }, 180_000);

  it('(d) TERM no meio de um recon → saida=morte, uma vez só', async () => {
    const c = caso('page-equipe-geral.tsx.txt', (t) => {
      (t.recon_esperado as unknown[]).push({ descricao: 'lento', cmd: 'sleep 20; echo ok', espera: 'ok' });
    });
    const filho = spawn('bash', ['-c', scriptProducao(c)], { cwd: c.fx, env: envProducao(c, { ORQ_PREVOO_TETO_SECS: '20' }) });
    let log = '';
    filho.stdout.on('data', (d) => (log += d));
    filho.stderr.on('data', (d) => (log += d));
    const fim = new Promise<number | null>((ok) => filho.on('close', (code) => ok(code)));
    const txt = join(c.fx, 'docs', 'fila', 'runs', '853', 'prevoo.txt');
    for (let i = 0; i < 200; i++) {
      if (existsSync(txt) && readFileSync(txt, 'utf8').slice(FIXTURE.length).includes('### recon[2] -> ok')) break;
      await new Promise((ok) => setTimeout(ok, 100));
    }
    filho.kill('SIGTERM');
    const rc = await fim;
    expect(eventos(c), `rc=${rc}\n${log}`).toMatch(/ 853 EXECUTOR_MORREU rc=143 .*sinal=TERM/);
    expect(passadaNova(c).trimEnd().split('\n').pop()).toMatch(FIM('morte'));
  }, 180_000);
});
