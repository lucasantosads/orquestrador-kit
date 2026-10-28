/**
 * Etapa 8c · P2b — o teste vizinho liberado só quando falha, no `drive_ticket`
 * de verdade (executor.sh sourced), no molde de orquestrador-base-vermelha.test.ts.
 *
 * O caso é o 950 do Comarka (`test/fixtures/vizinhos-8c/950/`):
 *   - a árvore do branch alvo tem `src/lib/qualificacao/motor.ts` e o teste
 *     vizinho `test/etapa2-funil-motor.test.ts` (as linhas reais de import), que
 *     importa o motor e está fora da allowlist;
 *   - o gate `testes` imprime o recorte real do gate-vitest.txt do 950 e sai 1
 *     enquanto o teste vizinho não tiver sido ajustado (marca `AJUSTADO`);
 *   - o critério de lista fechada é o do 950 (`criterios_aceite[2]`), com
 *     `origin/staging-auto` trocado por `staging-auto` (o repo sintético não tem
 *     origin);
 *   - o agente é o STUB nativo: a cada tentativa mexe no motor e, se
 *     `AJUSTA_TESTE=1`, ajusta o teste vizinho a partir da 2ª;
 *   - o juiz é interceptado e `claude_run` falha alto;
 *   - a conferência na base (P2b-2) roda um vitest falso (`VIZINHO_CMD_BASE`):
 *     verde, vermelho (imprime o mesmo FAIL real) ou inconclusivo (runner ausente).
 *     Ele grava onde rodou e com que argumentos, para provar que foi na árvore do
 *     base_ticket e só nos arquivos falhos.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
const FIX = join(REPO_ROOT, 'test', 'fixtures', 'vizinhos-8c', '950');
const VIZINHO = 'test/etapa2-funil-motor.test.ts';
const MOTOR = 'src/lib/qualificacao/motor.ts';

const ticket950 = () => {
  const md = readdirSync(FIX).find((f) => f.endsWith('.md'))!;
  return JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(FIX, md), 'utf8'))![1]!) as {
    pathspec_allowlist: string[];
    criterios_aceite: { cmd: string }[];
  };
};

interface Caso {
  /** saída do gate de testes enquanto o vizinho não foi ajustado; por padrão, o recorte real do 950 */
  saidaTestes?: string;
  maxRetries?: number;
  /** linhas já na trilha antes da drenagem (com `HASH` trocado pela versão do ticket) */
  trilhaAntes?: string[];
}

function fixtureRepo(caso: Caso = {}): { fx: string; tmp: string } {
  const tmp = mkdtempSync(join(tmpdir(), 'orq-8c-'));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });

  const saida = join(tmp, 'saida-testes.txt');
  writeFileSync(saida, caso.saidaTestes ?? readFileSync(join(FIX, 'gate-vitest.txt'), 'utf8'));

  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & { _execucao_dos_gates: Record<string, unknown> };
  cfg.gates = [
    { nome: 'typecheck', cmd: 'true', tipo: 'exit', papel: 'typecheck' },
    {
      nome: 'testes',
      cmd: `if grep -q AJUSTADO '${VIZINHO}'; then echo ' Test Files  1 passed (1)'; echo '      Tests  4 passed (4)'; exit 0; fi; cat '${saida}'; exit 1`,
      tipo: 'exit',
      papel: 'testes',
    },
  ];
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: ['typecheck', 'testes'] };
  cfg.max_retries = caso.maxRetries ?? 2;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));

  const real = ticket950();
  const t = {
    id: '901',
    bloco: 'B4',
    slug: 'vizinho-950',
    risco: 'alto',
    status: 'pendente',
    origem: 'humano',
    objetivo: 'cascata de marcos no motor de qualificação (950 do Comarka)',
    pathspec_allowlist: real.pathspec_allowlist,
    dependencias: [],
    criterios_aceite: [
      {
        tipo: 'guarda',
        descricao: 'lista fechada (950, criterios_aceite[2])',
        cmd: real.criterios_aceite[2]!.cmd.split('origin/staging-auto').join('staging-auto'),
        espera: 'SO_ALLOWLIST',
      },
      { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
    ],
  };
  writeFileSync(join(fx, 'docs', 'fila', '901-vizinho-950.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);

  // A árvore do branch alvo: o motor, o teste vizinho (linhas reais de import) e o tsconfig real.
  const escreve = (rel: string, txt: string) => {
    mkdirSync(dirname(join(fx, rel)), { recursive: true });
    writeFileSync(join(fx, rel), txt);
  };
  escreve(MOTOR, 'export function qualificarLead() { return 1 }\n');
  escreve(VIZINHO, readFileSync(join(FIX, 'arvore', `${VIZINHO}.fixture`), 'utf8'));
  escreve('test/outro-alheio.test.ts', "import { describe } from 'vitest'\n");
  escreve('tsconfig.json', readFileSync(join(FIX, 'arvore', 'tsconfig.json.fixture'), 'utf8'));

  const g = (...a: string[]) => spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('branch', String(cfg.branch_alvo));
  mkdirSync(join(fx, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(fx, 'node_modules', '.bin', 'tsx'));
  symlinkSync(join(REPO_ROOT, 'scripts'), join(fx, 'scripts'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\nscripts\n.juiz-chamadas\n');

  if (caso.trilhaAntes) {
    const versao = spawnSync('bash', ['-c', `source '${LIB}'; ticket_versao "$(ticket_file_by_id 901)"`], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_TESTE: '1' },
    }).stdout.trim();
    expect(versao).toMatch(/^[0-9a-f]{12}$/);
    writeFileSync(join(fx, 'docs', 'fila', 'runs', 'events.log'), caso.trilhaAntes.map((l) => l.replace('HASH', versao)).join('\n') + '\n');
  }
  return { fx, tmp };
}

type Base = 'verde' | 'vermelho' | 'inconclusivo';

function vitestDaBase(tmp: string, base: Base): string {
  const f = join(tmp, 'vitest-base.sh');
  const corpo =
    base === 'verde'
      ? "echo ' Test Files  1 passed (1)'; exit 0"
      : base === 'vermelho'
        ? `cat '${join(tmp, 'saida-testes.txt')}'; exit 1`
        : "echo 'sh: vitest: command not found'; exit 127";
  writeFileSync(
    f,
    `#!/bin/bash\n{ echo "cwd=$PWD"; echo "args=$*"; echo "motor=$(grep -c tentativa ${MOTOR})"; } >> '${join(tmp, 'base-chamadas')}'\n${corpo}\n`,
    { mode: 0o755 },
  );
  return f;
}

function drenagem(fx: string, tmp: string, ajustaTeste: boolean | 'skip', base: Base = 'verde', juizReal = false): string {
  // Conta as tentativas fora do repo; da 2ª em diante, ajusta o teste vizinho se
  // pedido ('skip': ajusta e ainda põe um it.skip — o afrouxamento da P3).
  const ajuste = ajustaTeste === 'skip' ? `echo '// AJUSTADO'; echo "it.skip('o motor marca', () => {})"` : `echo '// AJUSTADO ao comportamento novo'`;
  const stub =
    `n=$(cat '${tmp}/n' 2>/dev/null || echo 0); n=$((n+1)); echo $n > '${tmp}/n'; ` +
    `echo "// tentativa $n" >> ${MOTOR}; ` +
    (ajustaTeste ? `if [ $n -ge 2 ]; then { ${ajuste}; } >> ${VIZINHO}; fi` : 'true');
  const script = `
    source '${EXECUTOR}'
    set +e
    STUB="$ORQ_TESTE_STUB"
    VIZINHO_CMD_BASE='${vitestDaBase(tmp, base)}'
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    ${
      juizReal
        ? `STUB_JUIZ='echo x >> ${fx}/.juiz-chamadas; echo "{\\"aprovado\\": true, \\"motivo\\": \\"ok\\", \\"criterios_falhos\\": []}"'`
        : `run_juiz() {
      echo x >> '${fx}/.juiz-chamadas'
      JUIZ_ROU=1; JUIZ_APROVADO=true; JUIZ_ILEGIVEL=0; JUIZ_MOTIVO=""; JUIZ_FALHOS=""
    }`
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

const ticket = (fx: string) =>
  JSON.parse(/```json\n([\s\S]*?)\n```/.exec(readFileSync(join(fx, 'docs', 'fila', '901-vizinho-950.md'), 'utf8'))![1]!) as Record<string, unknown>;
const trilha = (fx: string) => {
  const f = join(fx, 'docs', 'fila', 'runs', 'events.log');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter((l) => / 901 /.test(l)) : [];
};
const run = (fx: string, n: number, arq: string) => join(fx, 'docs', 'fila', 'runs', '901', `attempt-${n}`, arq);
const juiz = (fx: string) => {
  const f = join(fx, '.juiz-chamadas');
  return existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0;
};

describe('8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive', () => {
  it('950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, true);
    const ev = trilha(fx);

    expect(ev.join('\n'), log).not.toContain('base_vermelha');
    const amp = ev.filter((l) => / VIZINHO_AMPLIADO /.test(l));
    expect(amp, log).toHaveLength(1);
    expect(amp[0]).toContain(`testes=${VIZINHO}`);
    expect(amp[0]).toMatch(/ hash=[0-9a-f]{12}( |$)/);
    expect(ev.find((l) => / REPROVADO /.test(l)) ?? '').toContain('attempt=1');
    expect(ev.find((l) => / APROVADO /.test(l)) ?? '', log).toContain('attempt=2');

    expect(readFileSync(run(fx, 0, 'vizinhos.txt'), 'utf8')).toContain(`local: ${VIZINHO}:92:50`);
    // P2b-2: antes de ampliar, só o arquivo falho rodou na árvore do base_ticket (sem a mudança do agente)
    const vb = ev.filter((l) => / VIZINHO_BASE /.test(l));
    expect(vb, log).toHaveLength(1);
    expect(vb[0]).toContain('resultado=verde');
    expect(vb[0]).toContain(`testes=${VIZINHO}`);
    const chamadas = readFileSync(join(tmp, 'base-chamadas'), 'utf8');
    expect(chamadas).toContain(`args=${VIZINHO}\n`);
    expect(chamadas).toContain('motor=0');
    expect(existsSync(run(fx, 0, 'allowlist-ampliada.txt'))).toBe(false);
    expect(readFileSync(run(fx, 1, 'allowlist-ampliada.txt'), 'utf8').trim()).toBe(VIZINHO);
    expect(JSON.parse(readFileSync(run(fx, 1, 'enforcement.json'), 'utf8')).ok).toBe(true);
    const crit = readFileSync(run(fx, 1, 'criterios.txt'), 'utf8');
    expect(crit).toContain(`'${VIZINHO}'`);
    expect(crit).toContain('saida: SO_ALLOWLIST');
    expect(juiz(fx)).toBe(1);

    const t = ticket(fx);
    expect(t.status).toBe('aguardando_merge');
    expect(t.tentativas).toBe(1); // a tentativa ampliada conta (decisão 1): a 1ª reprovou e consumiu
    // o ticket não ganhou campo: a ampliação mora na trilha e no rundir
    expect(Object.keys(t)).not.toContain('allowlist_ampliada');
  }, 240_000);

  it('a ampliação vale até o fim do drive: com o teste não ajustado, as tentativas 2 e 3 levam a lista; um só VIZINHO_AMPLIADO', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, false);
    const ev = trilha(fx);

    expect(ev.filter((l) => / VIZINHO_AMPLIADO /.test(l)), log).toHaveLength(1);
    expect(readFileSync(run(fx, 1, 'allowlist-ampliada.txt'), 'utf8').trim()).toBe(VIZINHO);
    expect(readFileSync(run(fx, 2, 'allowlist-ampliada.txt'), 'utf8').trim()).toBe(VIZINHO);
    expect(ev.join('\n')).not.toContain('base_vermelha');
    expect(ticket(fx).status).toBe('bloqueado');
  }, 240_000);

  it('uma vez por versão do ticket: com VIZINHO_AMPLIADO desta versão na trilha, não amplia de novo, e nem por isso vira base_vermelha', () => {
    const { fx, tmp } = fixtureRepo({
      maxRetries: 0,
      trilhaAntes: [`2026-10-18T10:00:00-0300 901 VIZINHO_AMPLIADO testes=${VIZINHO} hash=HASH attempt=1`],
    });
    const log = drenagem(fx, tmp, true);
    const ev = trilha(fx);

    expect(ev.filter((l) => / VIZINHO_AMPLIADO /.test(l)), log).toHaveLength(1);
    expect(ev.join('\n')).not.toContain('base_vermelha');
    expect(ev.find((l) => / REPROVADO /.test(l)) ?? '', log).toContain('motivo=criterio_qualidade');
    expect(String(ticket(fx).notas_status)).toContain('já ampliado');
  }, 240_000);

  it('contra-teste: FAIL fora da allowlist em teste que não é vizinho segue base_vermelha como hoje, sem VIZINHO_AMPLIADO', () => {
    const outra = readFileSync(join(FIX, 'gate-vitest.txt'), 'utf8').split(VIZINHO).join('test/outro-alheio.test.ts');
    const { fx, tmp } = fixtureRepo({ saidaTestes: outra });
    // L11: o FAIL sem relação roda isolado antes da base vermelha, pelo mesmo
    // runner (VIZINHO_CMD_BASE). 'vermelho' faz ele falhar isolado também: aí
    // segue base_vermelha (se passasse isolado, seria instável e sairia da conta).
    const log = drenagem(fx, tmp, true, 'vermelho');
    const ev = trilha(fx);

    expect(existsSync(run(fx, 0, 'isolado-1.txt')), log).toBe(true);
    expect(ev.find((l) => / BLOQUEADO /.test(l)) ?? '', log).toContain('motivo=base_vermelha');
    expect(ev.some((l) => / VIZINHO_AMPLIADO /.test(l))).toBe(false);
    expect(JSON.parse(readFileSync(run(fx, 0, 'vizinhos.json'), 'utf8')).amplia).toBe(false);
  }, 240_000);

  it('base vermelha verdadeira cujo teste importa arquivo da allowlist: o vizinho falha também no base_ticket → não amplia, segue base_vermelha, e a trilha diz', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, true, 'vermelho');
    const ev = trilha(fx);

    expect(JSON.parse(readFileSync(run(fx, 0, 'vizinhos.json'), 'utf8')).amplia).toBe(true); // a C11 liga o teste
    expect(ev.find((l) => / VIZINHO_BASE /.test(l)) ?? '', log).toContain('resultado=vermelho');
    expect(ev.some((l) => / VIZINHO_AMPLIADO /.test(l))).toBe(false);
    expect(ev.find((l) => / BLOQUEADO /.test(l)) ?? '', log).toContain('motivo=base_vermelha');
    expect(readFileSync(run(fx, 0, 'vizinhos-base.txt'), 'utf8').replace(/\x1b\[[0-9;]*m/g, '')).toContain(`FAIL  ${VIZINHO}`);
    expect(ticket(fx).tentativas ?? 0).toBe(0);
  }, 240_000);

  it('runner que não roda na base (inconclusivo): não amplia; a base vermelha decide como hoje', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, true, 'inconclusivo');
    const ev = trilha(fx);

    expect(ev.find((l) => / VIZINHO_BASE /.test(l)) ?? '', log).toContain('resultado=inconclusivo');
    expect(ev.some((l) => / VIZINHO_AMPLIADO /.test(l))).toBe(false);
    expect(ev.find((l) => / BLOQUEADO /.test(l)) ?? '', log).toContain('motivo=base_vermelha');
  }, 240_000);

  it('P3 · a tentativa ampliada que põe it.skip no teste vizinho: enforcement reprova por afrouxamento e bloqueia sem 3ª tentativa', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, 'skip');
    const ev = trilha(fx);

    const enf = JSON.parse(readFileSync(run(fx, 1, 'enforcement.json'), 'utf8')) as { ok: boolean; violations: { tipo: string; detalhe: string }[] };
    expect(enf.ok, log).toBe(false);
    expect(enf.violations.map((v) => v.tipo)).toEqual(['afrouxamento']);
    expect(enf.violations[0]!.detalhe).toContain(VIZINHO);
    expect(ev.find((l) => / REPROVADO /.test(l) && /attempt=2/.test(l)) ?? '', log).toContain('motivo=afrouxamento');
    expect(ev.find((l) => / BLOQUEADO /.test(l)) ?? '').toContain('motivo=afrouxamento');
    expect(existsSync(join(fx, 'docs', 'fila', 'runs', '901', 'attempt-2'))).toBe(false);
    expect(ev.join('\n')).not.toContain('REFATIAR');
    expect(juiz(fx)).toBe(0);
    expect(String(ticket(fx).notas_status)).toContain('afrouxamento');
  }, 240_000);

  it('P4 · o bloco FAIL e a regra só no prompt da tentativa ampliada; o juiz (run_juiz real, STUB_JUIZ) recebe a lista ampliada', () => {
    const { fx, tmp } = fixtureRepo();
    const log = drenagem(fx, tmp, true, 'verde', true);

    const p0 = readFileSync(run(fx, 0, 'prompt.txt'), 'utf8');
    const p1 = readFileSync(run(fx, 1, 'prompt.txt'), 'utf8');
    expect(p0, log).not.toContain('TESTES VIZINHOS QUEBRADOS');
    expect(p0).not.toContain('[AMPLIADA');
    expect(p1).toContain(`  - ${VIZINHO}   [AMPLIADA até o fim deste ticket: teste vizinho quebrado pelo seu diff]`);
    expect(p1).toContain('TESTES VIZINHOS QUEBRADOS PELO SEU DIFF');
    expect(p1).toContain(`local: ${VIZINHO}:92:50`);
    expect(p1).toContain('REGRA ANTI-AFROUXAMENTO');

    expect(existsSync(run(fx, 0, 'juiz.prompt.txt'))).toBe(false); // a 1ª reprovou no gate: juiz não chamado
    const j1 = readFileSync(run(fx, 1, 'juiz.prompt.txt'), 'utf8');
    expect(j1).toContain('TESTE VIZINHO AMPLIADO');
    expect(j1).toContain(`  - ${VIZINHO}`);
    expect(juiz(fx)).toBe(1);
    expect(ticket(fx).status).toBe('aguardando_merge');
  }, 240_000);
});
