/**
 * Ticket 632 (harness manual, 24/09/2026) — gate de testes vermelho só por
 * arquivo alheio bloqueia como `base_vermelha`, sem juiz, sem retry e sem
 * consumir tentativa.
 *
 * Sequência real do 510c (23/09, docs/fila/runs/events.log):
 *   GATE typecheck=ok testes=falha enforcement=ok criterios=7/7
 *   REPROVADO motivo=criterio_qualidade -> RETRY opus -> BLOQUEADO retry_sem_mudanca
 * O único FAIL do gates.txt era test/ingestao-descarte-0283.integration.test.ts
 * (Hook timed out in 10000ms), fora do diff e da allowlist do 510c. Duas
 * tentativas pagas para concluir que a base estava vermelha.
 *
 * `drive_ticket` de VERDADE (executor.sh sourced) num repo git sintético, no
 * molde de test/orquestrador-retry-feedback-juiz.test.ts:
 *   - o agente é o STUB nativo do executor, que toca os dois arquivos do 510c;
 *   - o gate `testes` do config imprime a fixture (recorte do gates.txt real do
 *     510c attempt-0) e sai 1; o `gates.ts` roda de verdade;
 *   - o juiz é interceptado (`run_juiz` conta chamadas num arquivo);
 *   - `claude_run` falha alto (lição do 623).
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FIXTURE_510C = join(REPO_ROOT, 'test', 'fixtures', 'orquestrador-base-vermelha', 'gates-510c-attempt-0.txt');
const ARQ_0283 = 'test/ingestao-descarte-0283.integration.test.ts';
const ALLOWLIST_510C = ['scripts/resgate-mensagens-descartadas.mjs', 'test/resgate-escopo-528.integration.test.ts'];

interface Caso {
  /** Saída do gate de testes (o recorte do vitest); por padrão, a fixture do 510c. */
  saidaTestes?: string;
  /** typecheck reprovado junto com o de testes. */
  typecheckFalha?: boolean;
}

function fixtureRepo(caso: Caso = {}): string {
  const tmp = mkdtempSync(join(tmpdir(), 'orq-632-'));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(fx, 'src'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });

  // A saída do gate fica FORA do repo: o gate a imprime por caminho absoluto.
  const saida = join(tmp, 'saida-testes.txt');
  const recorte = readFileSync(FIXTURE_510C, 'utf8').split('\n').slice(5).join('\n');
  writeFileSync(saida, caso.saidaTestes ?? recorte);

  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & {
    _execucao_dos_gates: Record<string, unknown>;
  };
  cfg.gates = [
    // No kit (peça 7b-2) gate que falha SEM saída é crash de runner (gate_crash,
    // adia): o typecheck reprovado imprime o erro, como um tsc de verdade.
    {
      nome: 'typecheck',
      cmd: caso.typecheckFalha ? "echo 'src/a.ts(1,7): error TS2322: tipo errado'; exit 1" : 'true',
      tipo: 'exit',
      papel: 'typecheck',
    },
    { nome: 'testes', cmd: `cat '${saida}'; exit 1`, tipo: 'exit', papel: 'testes' },
  ];
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: ['typecheck', 'testes'] };
  // Uma tentativa só: no caminho de hoje, a reprovação já vira bloqueio, sem
  // retry — o que se compara é a CAUSA.
  cfg.max_retries = 0;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));

  const ticket = {
    id: '901',
    bloco: 'B4',
    slug: 'resgate-510c',
    risco: 'alto',
    status: 'pendente',
    origem: 'humano',
    objetivo: 'toca os dois arquivos do 510c',
    pathspec_allowlist: ALLOWLIST_510C,
    dependencias: [],
    criterios_aceite: [
      {
        tipo: 'alvo',
        descricao: 'os dois arquivos existem',
        cmd: `test -f ${ALLOWLIST_510C[0]} && test -f ${ALLOWLIST_510C[1]} && echo ok`,
        espera: 'ok',
      },
      { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
    ],
  };
  writeFileSync(
    join(fx, 'docs', 'fila', '901-resgate-510c.md'),
    `# 901\n\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\`\n`,
  );
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
  // o link aponta para o motor SOB TESTE, fora do git do fixture. A worktree não
  // herda o link (não é rastreado), então o STUB escreve em diretório próprio.
  symlinkSync(join(REPO_ROOT, 'scripts'), join(fx, 'scripts'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\nscripts\n.juiz-chamadas\n');
  return fx;
}

function drenagem(fx: string): string {
  // O agente toca exatamente os dois arquivos do 510c, dentro da allowlist.
  const stub = `mkdir -p scripts test && echo 'resgate' > ${ALLOWLIST_510C[0]} && echo 'teste' > ${ALLOWLIST_510C[1]}`;
  // STUB depois do source (executor.sh zera a variável ao ser carregado) e
  // claude_run falhando alto: chamada paga dentro de teste é defeito.
  const script = `
    source '${EXECUTOR}'
    set +e
    STUB="$ORQ_TESTE_STUB"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_juiz() {
      echo x >> '${fx}/.juiz-chamadas'
      JUIZ_ROU=1; JUIZ_APROVADO=true; JUIZ_ILEGIVEL=0; JUIZ_MOTIVO=""; JUIZ_FALHOS=""
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

function ticket(fx: string): Record<string, unknown> {
  const md = readFileSync(join(fx, 'docs', 'fila', '901-resgate-510c.md'), 'utf8');
  const m = /```json\n([\s\S]*?)\n```/.exec(md);
  return JSON.parse(m![1]!) as Record<string, unknown>;
}

function trilha(fx: string): string[] {
  const f = join(fx, 'docs', 'fila', 'runs', 'events.log');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => / 901 /.test(l)) : [];
}

function chamadasDoJuiz(fx: string): number {
  const f = join(fx, '.juiz-chamadas');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0;
}

describe('632: base vermelha', () => {
  it('sequência do 510c: FAIL só no 0283 bloqueia com base_vermelha, sem juiz, sem retry e sem consumir tentativa', () => {
    const fx = fixtureRepo();
    const log = drenagem(fx);
    const ev = trilha(fx);
    const t = ticket(fx);

    // o gate de testes reprovou com enforcement e critérios verdes, como no 510c
    const gate = ev.find((l) => / GATE /.test(l)) ?? '';
    expect(gate, log).toContain('testes=falha');
    expect(gate).toContain('enforcement=ok');
    expect(gate).toContain('criterios=1/1');

    const bloqueio = ev.find((l) => / BLOQUEADO /.test(l)) ?? '';
    expect(bloqueio, log).toContain('motivo=base_vermelha');
    expect(bloqueio).toContain(`arquivos=${ARQ_0283}`);
    expect(ev.some((l) => / REPROVADO /.test(l))).toBe(false);
    expect(ev.some((l) => / RETRY /.test(l))).toBe(false);
    expect(chamadasDoJuiz(fx)).toBe(0);

    expect(t.status).toBe('bloqueado');
    expect(String(t.notas_status)).toContain('base_vermelha');
    expect(String(t.notas_status)).toContain(ARQ_0283);
    expect(String(t.notas_status)).toContain('attempt-0/gates.txt');
    expect(t.tentativas ?? 0).toBe(0);

    const veredito = JSON.parse(
      readFileSync(join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0', 'veredito.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(veredito.causa).toBe('base_vermelha');
    expect(veredito.arquivos).toEqual([ARQ_0283]);
  }, 180_000);

  it('contra-teste: FAIL num arquivo DA allowlist segue o caminho de hoje (REPROVADO criterio_qualidade, sem base_vermelha)', () => {
    const recorte = readFileSync(FIXTURE_510C, 'utf8').split('\n').slice(5).join('\n');
    const fx = fixtureRepo({ saidaTestes: recorte.split(ARQ_0283).join(ALLOWLIST_510C[1]!) });
    const log = drenagem(fx);
    const ev = trilha(fx);
    const t = ticket(fx);

    const reprovado = ev.find((l) => / REPROVADO /.test(l)) ?? '';
    expect(reprovado, log).toContain('motivo=criterio_qualidade');
    expect(ev.join('\n')).not.toContain('base_vermelha');
    expect(String(t.notas_status)).not.toContain('base_vermelha');
    // caminho de hoje: a reprovação consumiu a tentativa
    expect(t.tentativas).toBe(1);
  }, 180_000);

  it('contra-teste: typecheck reprovado junto segue o caminho de hoje, sem base_vermelha', () => {
    const fx = fixtureRepo({ typecheckFalha: true });
    const log = drenagem(fx);
    const ev = trilha(fx);
    const t = ticket(fx);

    expect(ev.find((l) => / GATE /.test(l)) ?? '', log).toContain('typecheck=falha');
    expect(ev.some((l) => / REPROVADO /.test(l))).toBe(true);
    expect(ev.join('\n')).not.toContain('base_vermelha');
    expect(String(t.notas_status)).not.toContain('base_vermelha');
  }, 180_000);

  it('contra-teste: saída de testes sem linha FAIL reconhecível segue o caminho de hoje', () => {
    // Com o placar do vitest (o runner RODOU, peça 7b-2 do kit), mas sem linha
    // ` FAIL  <arquivo>` que o parser reconheça.
    const fx = fixtureRepo({
      saidaTestes: 'Error: algo quebrou sem FAIL de arquivo\n Test Files  1 failed (1)\n      Tests  1 failed | 3 passed (4)\n',
    });
    const log = drenagem(fx);
    const ev = trilha(fx);

    expect(ev.find((l) => / REPROVADO /.test(l)) ?? '', log).toContain('motivo=criterio_qualidade');
    expect(ev.join('\n')).not.toContain('base_vermelha');
  }, 180_000);
});
