/**
 * Teto de adiamento por causa 'ambiente' (harness manual, 22/09/2026).
 *
 * Adiamento não consome tentativa, de propósito: falha de infraestrutura não é
 * defeito do trabalho. Mas a causa 'ambiente' (permissão negada junto com falha
 * de resultado, harness de 2026-09-20) nem sempre passa sozinha. O 481 foi
 * adiado por 'ambiente' em drenagem atrás de drenagem, e cada uma pagava uma
 * execução inteira do agente e do juiz (a de 22/09 levou 888 s) sem nunca chegar
 * a um desfecho. Adiamento sem teto é um retry sem teto disfarçado.
 *
 * Regra: 3 adiamentos CONSECUTIVOS por 'ambiente' do mesmo ticket = bloqueado,
 * com notas_status explicando a causa. O contador zera quando o ticket passa de
 * fase (qualquer status diferente de pendente, e também reprovação, que quebra a
 * sequência) ou é reaberto. Adiamento por OUTRA causa não conta e não zera.
 *
 * `drive_ticket` de VERDADE (executor.sh sourced), com `run_attempt` STUBADO
 * num repo git sintético. Zero modelo.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

// Ticket 629: cada caso roda o drive_ticket de verdade N vezes (uma por
// chamada a drenagem) e ganha N * TIMEOUT_POR_DRENAGEM_MS. O padrão de 5 s do
// vitest estourava com a suíte em paralelo e a máquina carregada (23/09, 626).
const TIMEOUT_POR_DRENAGEM_MS = 15_000;

function fixtureRepo(): string {
  const tmp = mkdtempSync(join(tmpdir(), 'orq-teto-amb-'));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(fx, 'src'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });
  const cfg = configDeReferencia();
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), cfg);
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
    criterios_aceite: [{ tipo: 'alvo', descricao: 'o arquivo existe', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' }],
  };
  writeFileSync(join(fx, 'docs', 'fila', '901-da-vez.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\`\n`);
  writeFileSync(join(fx, 'src', 'base.ts'), 'base\n');
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('branch', (JSON.parse(cfg) as { branch_alvo: string }).branch_alvo);
  // O motor recusa rodar sem <checkout>/node_modules/.bin/tsx (peça T1). Depois
  // do commit, para não versionar o link no repo do fixture.
  mkdirSync(join(fx, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(fx, 'node_modules', '.bin', 'tsx'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\n.roteiro*\n');
  return fx;
}

function ticket(fx: string): Record<string, unknown> {
  const md = readFileSync(join(fx, 'docs', 'fila', '901-da-vez.md'), 'utf8');
  const m = /```json\n([\s\S]*?)\n```/.exec(md);
  return JSON.parse(m![1]!) as Record<string, unknown>;
}

/** Reabertura HUMANA: o dono edita o status à mão, fora do harness. */
function reabrir(fx: string): void {
  const p = join(fx, 'docs', 'fila', '901-da-vez.md');
  const t = { ...ticket(fx), status: 'pendente' };
  writeFileSync(p, `# 901\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
}

/**
 * UMA drenagem (uma chamada de drive_ticket). Cada run_attempt consome o
 * próximo desfecho do roteiro: ambiente | rate_limit (adiamentos) | reprovado |
 * aprovado.
 */
function drenagem(fx: string, ...roteiro: string[]): string {
  writeFileSync(join(fx, '.roteiro'), roteiro.join('\n') + '\n');
  const script = `
    source '${EXECUTOR}'
    set +e
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_attempt() {
      local file="$1" wt="$2" rundir="$3" d
      mkdir -p "$rundir"
      d="$(head -1 '${fx}/.roteiro')"; sed -i.bak 1d '${fx}/.roteiro'
      case "$d" in
        ambiente)   RESULT=adiado;    CAUSA=ambiente;           MOTIVO='infraestrutura: ambiente' ;;
        rate_limit) RESULT=adiado;    CAUSA=rate_limit;         MOTIVO='infraestrutura: rate_limit' ;;
        reprovado)  RESULT=reprovado; CAUSA=criterio_qualidade; MOTIVO='criterio: saida vazia' ;;
        aprovado)   RESULT=aprovado;  CAUSA=nenhuma;            MOTIVO=ok ;;
      esac
      PERMISSOES_NEGADAS='["Bash(grep -rn x node_modules)"]'
      ENF_OK=1; DUR=1; DIFF_LINES=0
      printf '{"desfecho":"%s","causa":"%s","motivo":"%s","contaComoRetry":false}\\n' "$RESULT" "$CAUSA" "$MOTIVO" > "$rundir/veredito.json"
    }
    drive_ticket "$(ticket_file_by_id 901)"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1' },
  });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

describe('teto de adiamento por ambiente', () => {
  it('3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota', () => {
    const fx = fixtureRepo();
    drenagem(fx, 'ambiente');
    expect(ticket(fx).status).toBe('pendente');
    expect(ticket(fx).adiamentos_ambiente).toBe(1);
    drenagem(fx, 'ambiente');
    expect(ticket(fx).status).toBe('pendente');
    expect(ticket(fx).adiamentos_ambiente).toBe(2);
    drenagem(fx, 'ambiente');
    const t = ticket(fx);
    expect(t.status).toBe('bloqueado');
    expect(String(t.notas_status)).toMatch(/3 adiamentos consecutivos/i);
    expect(String(t.notas_status)).toMatch(/ambiente/);
    // A evidência de ambiente (permissão negada) vai junto: é o que o dono lê.
    expect(String(t.notas_status)).toContain('grep -rn x node_modules');
  }, 3 * TIMEOUT_POR_DRENAGEM_MS);

  it('reprovação no meio quebra a sequência (o contador zera)', () => {
    const fx = fixtureRepo();
    drenagem(fx, 'ambiente');
    drenagem(fx, 'ambiente');
    drenagem(fx, 'reprovado', 'ambiente');
    const t = ticket(fx);
    expect(t.status).toBe('pendente');
    expect(t.adiamentos_ambiente).toBe(1);
  }, 3 * TIMEOUT_POR_DRENAGEM_MS);

  it('adiamento por OUTRA causa não conta nem zera', () => {
    const fx = fixtureRepo();
    drenagem(fx, 'ambiente');
    drenagem(fx, 'rate_limit');
    drenagem(fx, 'rate_limit');
    drenagem(fx, 'rate_limit');
    expect(ticket(fx).status).toBe('pendente');
    expect(ticket(fx).adiamentos_ambiente).toBe(1);
  }, 4 * TIMEOUT_POR_DRENAGEM_MS);

  it('passar de fase zera: aprovado leva a aguardando_merge sem contador', () => {
    const fx = fixtureRepo();
    drenagem(fx, 'ambiente');
    drenagem(fx, 'ambiente');
    drenagem(fx, 'aprovado');
    const t = ticket(fx);
    expect(t.status).toBe('aguardando_merge');
    expect(t.adiamentos_ambiente).toBeUndefined();
  }, 3 * TIMEOUT_POR_DRENAGEM_MS);

  it('reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento)', () => {
    const fx = fixtureRepo();
    drenagem(fx, 'ambiente');
    drenagem(fx, 'ambiente');
    drenagem(fx, 'ambiente');
    expect(ticket(fx).status).toBe('bloqueado');
    reabrir(fx);
    drenagem(fx, 'ambiente');
    const t = ticket(fx);
    expect(t.status).toBe('pendente');
    expect(t.adiamentos_ambiente).toBe(1);
  }, 4 * TIMEOUT_POR_DRENAGEM_MS);
});
