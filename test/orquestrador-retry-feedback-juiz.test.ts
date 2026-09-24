/**
 * Ticket 623 (harness manual, 23/09/2026) — o motivo do juiz chega ao retry, e
 * retry sem mudança bloqueia sem chamar o juiz.
 *
 * Causa (auditoria de 22/09): 488b e 499 fizeram três tentativas cada com o
 * MESMO diff. O juiz reprovou nas três, mas o prompt de retry chegou com
 * `criterios_falhos: []` — `diagnostico_retry` só via os critérios MECÂNICOS.
 * Sem hipótese nova, cada tentativa repetida pagou executor e juiz.
 *
 * `drive_ticket` de VERDADE (executor.sh sourced) num repo git sintético:
 *   - o agente é o STUB nativo do executor (`STUB`, eval na worktree), que
 *     escreve `src/a.ts` conforme o roteiro de cada tentativa;
 *   - o juiz é INTERCEPTADO (`run_juiz` redefinido): conta as chamadas num
 *     arquivo e reprova sempre, com motivo e criterios_falhos próprios;
 *   - gates vazios no config do fixture e `max_retries = 1` (duas tentativas);
 *   - enforcement, critérios, decisão e diagnóstico rodam de verdade.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

const MOTIVO_JUIZ =
  'O teste afirma só a ausência: nenhum caso prova que a linha EXISTE depois da ingestão (asserção positiva faltando em src/a.ts).';
const FALHOS_JUIZ = ['o teste tem asserção positiva de existência', 'o valor v2 é o exigido pelo ticket'];

function fixtureRepo(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'orq-623-'));
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
  // Duas tentativas: a primeira e UM retry.
  cfg.max_retries = 1;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
  const ticket = {
    id: '901',
    bloco: 'B6',
    slug: 'da-vez',
    risco: '',
    status: 'pendente',
    origem: 'humano',
    objetivo: 'escreve src/a.ts',
    pathspec_allowlist: ['src/a.ts'],
    dependencias: [],
    criterios_aceite: [
      { tipo: 'alvo', descricao: 'o arquivo existe', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' },
      { tipo: 'avaliador', descricao: 'avaliador: o valor é o certo', cmd: 'true', espera: 'avaliador' },
    ],
  };
  writeFileSync(join(fx, 'docs', 'fila', '901-da-vez.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\`\n`);
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
  return fx;
}

function ticket(fx: string): Record<string, unknown> {
  const md = readFileSync(join(fx, 'docs', 'fila', '901-da-vez.md'), 'utf8');
  const m = /```json\n([\s\S]*?)\n```/.exec(md);
  return JSON.parse(m![1]!) as Record<string, unknown>;
}

function chamadasDoJuiz(fx: string): number {
  const f = join(fx, '.juiz-chamadas');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0;
}

/**
 * UMA drenagem. `roteiro` diz o que o agente escreve em src/a.ts em cada
 * tentativa; `=` repete o conteúdo da tentativa anterior (o agente não muda
 * nada, a worktree é reaproveitada e o diff sai idêntico).
 */
function drenagem(fx: string, ...roteiro: string[]): string {
  writeFileSync(join(fx, '.roteiro'), roteiro.join('\n') + '\n');
  const stub = `v="$(head -1 '${fx}/.roteiro')"; sed -i.bak 1d '${fx}/.roteiro'; [ "$v" = "=" ] || printf '%s\\n' "$v" > src/a.ts`;
  const juiz = JSON.stringify({ aprovado: false, motivo: MOTIVO_JUIZ, criterios_falhos: FALHOS_JUIZ });
  // STUB é definido DEPOIS do source: executor.sh:28 zera a variável ao ser
  // carregado, e um STUB vindo só do ambiente cai no claude REAL (custou
  // US$ 0,95 na primeira versão deste teste, 23/09). E claude_run falha alto:
  // chamada paga dentro de teste é defeito, não fallback.
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
    drive_ticket "$(ticket_file_by_id 901)"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub },
  });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

const prompt = (fx: string, n: number) => readFileSync(join(fx, 'docs', 'fila', 'runs', '901', `attempt-${n}`, 'prompt.txt'), 'utf8');

describe('623 (a): o motivo do juiz chega ao prompt de retry', () => {
  it('juiz reprova com o mecânico verde: o retry traz gate juiz, o motivo LITERAL e os criterios_falhos do juiz', () => {
    const fx = fixtureRepo();
    const log = drenagem(fx, 'v1', 'v2');
    const p1 = prompt(fx, 1);
    expect(p1, log).toContain('"gate": "juiz"');
    // Literal, sem paráfrase nem corte.
    expect(p1).toContain(MOTIVO_JUIZ);
    for (const f of FALHOS_JUIZ) expect(p1).toContain(f);
    // A primeira tentativa não muda: não há motivo anterior nenhum nela.
    expect(prompt(fx, 0)).not.toContain(MOTIVO_JUIZ);
  }, 180_000);
});

describe('623 (b): retry com o MESMO diff bloqueia sem chamar o juiz', () => {
  it('segunda tentativa com diff.patch idêntico: bloqueado por retry_sem_mudanca, juiz chamado UMA vez', () => {
    const fx = fixtureRepo();
    const log = drenagem(fx, 'v1', '=');
    const t = ticket(fx);
    expect(chamadasDoJuiz(fx), log).toBe(1);
    expect(t.status).toBe('bloqueado');
    const nota = String(t.notas_status);
    expect(nota).toContain('retry_sem_mudanca');
    // Os dois hashes (sha256 = 64 hex) e o caminho das evidências.
    expect((nota.match(/[0-9a-f]{64}/g) ?? []).length).toBe(2);
    expect(nota).toContain('runs/901/attempt-1/diff.patch');
    // A evidência existe e é mesmo idêntica.
    const d0 = readFileSync(join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0', 'diff.patch'), 'utf8');
    const d1 = readFileSync(join(fx, 'docs', 'fila', 'runs', '901', 'attempt-1', 'diff.patch'), 'utf8');
    expect(d0).not.toBe('');
    expect(d1).toBe(d0);
  }, 180_000);

  it('contra-teste: segunda tentativa com diff DIFERENTE chama o juiz de novo (contador = 2)', () => {
    const fx = fixtureRepo();
    const log = drenagem(fx, 'v1', 'v2');
    const t = ticket(fx);
    expect(chamadasDoJuiz(fx), log).toBe(2);
    // Esgotou as tentativas pelo caminho de sempre, não por retry_sem_mudanca.
    expect(t.status).toBe('bloqueado');
    expect(String(t.notas_status)).not.toContain('retry_sem_mudanca');
  }, 180_000);
});
