/**
 * Peça 12 — morte por sinal deixa rastro.
 *
 * O trap de EXIT NÃO roda quando o processo morre por sinal não trapeado: o
 * shell termina pela ação padrão do sinal e nada mais é executado. Medido em
 * 2026-09-06 15:38 UTC no `local-loop.log`: `gates: REPROVADO (rc=143)` seguido
 * de `Terminated: 15` e NENHUM evento na trilha. 143 é 128+15 — o executor foi
 * morto por SIGTERM no meio dos gates e não deixou uma linha.
 *
 * Do lado de fora sobravam duas coisas erradas: um ticket que ninguém sabia
 * dizer por que parou, e um STATUS eternamente `executando` — que é a matéria
 * prima da peça 11. Por isso limpar o STATUS faz parte do registro: quem morre
 * desliga a própria luz.
 *
 * O sinal é ENVIADO DE FORA nos casos abaixo, por um processo irmão. Um
 * `kill -TERM $$` provaria só que o handler roda quando chamado.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const runs = (fx: string) => join(fx, 'docs', 'fila', 'runs');

/**
 * Sobe um executor com os traps armados, em plena "fase gates", e manda o sinal
 * de outro processo. Devolve o rc e o que ficou na trilha e no STATUS.
 */
function morteExterna(sinal: 'TERM' | 'INT') {
  const fx = criarFixture([{ id: '240', slug: 'finalizar' }]);
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}"`,
    'set +e',
    'armar_traps',
    // o estado que o executor teria no meio de uma tentativa
    'TICKET_EM_CURSO=240',
    'FASE_EM_CURSO=gates',
    'status_set "estado=executando" "ticket=240 finalizar · tentativa 1/3" "fase=gates"',
    // processo IRMÃO manda o sinal: morte de fora, como a do launchd/loop
    `( sleep 0.4; kill -${sinal} $$ ) >/dev/null 2>&1 &`,
    // `& wait` e não `sleep` em primeiro plano: é assim que o `claude_run`
    // espera o agente, e `wait` é interrompível por trap. Em primeiro plano o
    // bash SEGURA o handler até o comando voltar (ver o caso mais abaixo).
    // Os redirecionamentos são para o sleep órfão não segurar o pipe de saída
    // depois que o executor morre — senão o teste espera os 20s por nada.
    'sleep 20 >/dev/null 2>&1 & wait $!',
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } });
  return {
    rc: r.status,
    sinalRecebido: r.signal,
    saida: `${r.stdout ?? ''}${r.stderr ?? ''}`,
    trilha: ler(join(runs(fx), 'events.log')),
    estado: JSON.parse(readFileSync(join(runs(fx), '.status.json'), 'utf8')),
    status: ler(join(runs(fx), 'STATUS.md')),
  };
}

describe('SIGTERM: o caso de 06/09 15:38', () => {
  const m = morteExterna('TERM');

  it('grava EXECUTOR_MORREU com o sinal, o rc e a fase', () => {
    expect(m.trilha).toMatch(/ 240 EXECUTOR_MORREU rc=143 fase=gates sinal=TERM/);
  });

  it('rc 143 = 128+15: o desfecho é contável, não silencioso', () => {
    expect(m.rc).toBe(143);
    // Morreu pelo handler, não pela ação padrão do sinal.
    expect(m.sinalRecebido).toBeNull();
  });

  it('LIMPA o STATUS: nada de `executando` eterno (é a peça 11 na origem)', () => {
    expect(m.estado.estado).toBe('ocioso');
    expect(m.estado.motivo).toContain('sinal TERM');
    expect(m.estado.ticket).toBe('—');
    expect(m.status).toContain('ESTADO   ocioso');
    expect(m.status).not.toMatch(/^ESTADO {3}executando/m);
  });

  it('UMA morte, UM registro: o trap de EXIT não duplica', () => {
    const mortes = m.trilha.trimEnd().split('\n').filter((l) => l.includes('EXECUTOR_MORREU'));
    expect(mortes).toHaveLength(1);
  });

  it('e o log diz que foi por sinal, para quem estiver lendo o local-loop.log', () => {
    expect(m.saida).toContain('MORTE POR SINAL TERM');
  });
});

describe('SIGINT: o Ctrl-C do humano conta a mesma história', () => {
  const m = morteExterna('INT');

  it('grava EXECUTOR_MORREU rc=130 sinal=INT e limpa o STATUS', () => {
    expect(m.trilha).toMatch(/ 240 EXECUTOR_MORREU rc=130 fase=gates sinal=INT/);
    expect(m.rc).toBe(130);
    expect(m.estado.estado).toBe('ocioso');
  });
});

describe('o handler espera o comando em primeiro plano — e isso explica o log de 06/09', () => {
  it('SIGTERM durante um comando em primeiro plano só é tratado quando ele volta', () => {
    // Por isso o local-loop.log traz "gates: REPROVADO (rc=143)" ANTES da morte:
    // o TERM foi para o grupo, o `npx tsx gates.ts` voltou 143, a linha do gate
    // foi impressa, e só então o executor tratou o sinal. Sem trap de TERM, esse
    // "só então" era o fim silencioso do processo.
    const fx = criarFixture([{ id: '240', slug: 'finalizar' }]);
    const t0 = Date.now();
    const r = spawnSync(
      'bash',
      [
        '-c',
        [
          `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
          `source "${EXECUTOR}"`,
          'set +e',
          'armar_traps',
          'TICKET_EM_CURSO=240',
          'FASE_EM_CURSO=gates',
          '( sleep 0.3; kill -TERM $$ ) >/dev/null 2>&1 &',
          'sleep 2',                       // primeiro plano: o handler fica pendente
          'echo "gates voltaram"',
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: fx, env: { ...process.env } },
    );
    const decorrido = Date.now() - t0;
    expect(decorrido).toBeGreaterThanOrEqual(1900);
    expect(r.status).toBe(143);
    // O `echo` depois do sleep NÃO roda: o handler entra assim que o comando
    // em primeiro plano volta, e ele sai.
    expect(r.stdout ?? '').not.toContain('gates voltaram');
    expect(ler(join(runs(fx), 'events.log'))).toContain('EXECUTOR_MORREU rc=143 fase=gates sinal=TERM');
  }, 30_000);
});

describe('o que NÃO mudou', () => {
  const src = readFileSync(EXECUTOR, 'utf8');

  it('a produção arma os três traps, e é a mesma função que o teste exercita', () => {
    expect(src).toMatch(/armar_traps\(\) \{\s*\n\s*trap trap_saida EXIT\s*\n\s*trap 'trap_sinal TERM 15' TERM\s*\n\s*trap 'trap_sinal INT 2' INT/);
    expect(src).toContain('[ "${EXECUTOR_SOURCED:-0}" = 1 ] || { armar_traps; main; }');
  });

  it('sourced (EXECUTOR_SOURCED=1) NÃO arma trap nenhum: o teste vermelho não vira morte', () => {
    const fx = criarFixture([]);
    const r = spawnSync(
      'bash',
      ['-c', `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1\nsource "${EXECUTOR}"\nexit 3`],
      { encoding: 'utf8', cwd: fx, env: { ...process.env } },
    );
    expect(r.status).toBe(3);
    expect(ler(join(runs(fx), 'events.log'))).toBe('');
  });

  it('desfecho nomeado continua sem virar EXECUTOR_MORREU no EXIT', () => {
    const fx = criarFixture([]);
    const r = spawnSync(
      'bash',
      [
        '-c',
        [
          `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
          `source "${EXECUTOR}"`,
          'armar_traps',
          'DESFECHO_NOMEADO=1',
          'exit 1',
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: fx, env: { ...process.env } },
    );
    expect(r.status).toBe(1);
    expect(ler(join(runs(fx), 'events.log'))).not.toContain('EXECUTOR_MORREU');
  });

  it('saída rc!=0 sem sinal continua registrando, sem campo `sinal`', () => {
    const fx = criarFixture([{ id: '240', slug: 'finalizar' }]);
    spawnSync(
      'bash',
      [
        '-c',
        [
          `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
          `source "${EXECUTOR}"`,
          'armar_traps',
          'TICKET_EM_CURSO=240',
          'FASE_EM_CURSO=enforcement',
          'exit 7',
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: fx, env: { ...process.env } },
    );
    const t = ler(join(runs(fx), 'events.log'));
    expect(t).toMatch(/ 240 EXECUTOR_MORREU rc=7 fase=enforcement$/m);
    expect(t).not.toContain('sinal=');
  });
});
