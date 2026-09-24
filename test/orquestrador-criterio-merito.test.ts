/**
 * Ticket 625 (harness manual, 23/09/2026) — critério de aceite reprovado é
 * MÉRITO, não ambiente.
 *
 * Causa (auditoria de 22/09): no 503 attempt-0 o critério "cita arquivo:linha"
 * reprovou de verdade (saída 0, regex quebrado), e o agente teve negado o
 * PRÓPRIO comando do critério, que tentou rodar para conferir. A regra antiga
 * ('ambiente' = só critério falho + permissão negada) adiou a tentativa: a
 * falha não consumiu tentativa nem voltou ao agente.
 *
 * Regra nova: 'ambiente' por critério só quando o HARNESS não conseguiu
 * executar o comando do critério (rc 126 ou 127), sinal próprio
 * `criteriosNaoExecutados`. Permissão negada ao AGENTE não pesa no desfecho de
 * critério.
 *
 * Os dados do caso 503 são os de docs/fila/runs/503/attempt-0 (criterios.txt e
 * permission_denials do claude.txt), copiados literalmente.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { decidirDesfecho, type DecisaoConfig, type SinalTentativa } from '../scripts/orquestrador/decisao.js';
import { montarDiagnostico } from '../scripts/orquestrador/diagnostico.js';
import { configDeReferencia, criarFixture, escreverTicket, REPO_ROOT } from './fixtures/orq-harness.js';

const config = JSON.parse(configDeReferencia()) as DecisaoConfig;
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

// docs/fila/runs/503/attempt-0: o critério reprovado e os dois comandos negados.
const CRITERIO_503 = 'cita arquivo:linha';
const NEGADAS_503 = [
  "{ grep -cE '(src|scripts|supabase)/[A-Za-z0-9_./()\\[\\]-]+:[0-9]+' docs/diagnosticos/briefing-escritores.md || true; }",
  "{ grep -cE '(src|scripts|supabase)/[A-Za-z0-9_./()\\[\\]-]+:[0-9]+' docs/diagnosticos/briefing-escritores.md; }",
];
const CRITERIOS_TXT_503 = [
  '### o documento existe e tem conteudo',
  'cmd: test -s docs/diagnosticos/briefing-escritores.md && echo ok',
  'espera: ok',
  'saida: ok',
  '',
  `### ${CRITERIO_503}`,
  "cmd: { grep -cE '(src|scripts|supabase)/[A-Za-z0-9_./()\\[\\]-]+:[0-9]+' docs/diagnosticos/briefing-escritores.md || true; }",
  'espera: ^[1-9][0-9]*$',
  'saida: 0',
  '',
].join('\n');

function sinal(parcial: Partial<SinalTentativa>): SinalTentativa {
  return { exitCode: 0, saida: '', diffLines: 60, ...parcial };
}

describe('625: a sequência do 503 attempt-0 vira mérito', () => {
  it('gates verdes, enforcement ok, só o critério falho, duas permissões negadas, rc 0: REPROVADO e consome tentativa', () => {
    const s = sinal({ criteriosFalhos: [CRITERIO_503], permissoesNegadas: NEGADAS_503, enforcementViolado: false });
    const v = decidirDesfecho(config, s);
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('criterio_qualidade');
    expect(v.contaComoRetry).toBe(true);
    expect(v.motivo).toContain(CRITERIO_503);
  });

  it('o diagnóstico da mesma entrada devolve o critério ao agente (gate criterios)', () => {
    const d = montarDiagnostico({
      criteriosTxt: CRITERIOS_TXT_503,
      criteriosFalhos: [CRITERIO_503],
      permissoesNegadas: NEGADAS_503,
      allowlist: ['docs/diagnosticos/briefing-escritores.md'],
    });
    expect(d.gate).toBe('criterios');
    expect(d.criterios_falhos).toContain(CRITERIO_503);
    expect(d.obtido).toBe('0');
  });
});

describe("625: 'ambiente' por critério só quando o harness não executou o comando", () => {
  it('critério com rc 126/127 (criteriosNaoExecutados) = adiado por ambiente, sem consumir tentativa', () => {
    const v = decidirDesfecho(
      config,
      sinal({ criteriosFalhos: ['o documento existe'], criteriosNaoExecutados: ['o documento existe'] }),
    );
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('ambiente');
    expect(v.contaComoRetry).toBe(false);
  });

  it('gate reprovado + critério não executado = reprovado (gate continua mandando)', () => {
    const v = decidirDesfecho(
      config,
      sinal({ criteriosFalhos: ['gates reprovados', 'o documento existe'], criteriosNaoExecutados: ['o documento existe'] }),
    );
    expect(v.desfecho).toBe('reprovado');
  });
});

describe('625: run_criterios separa o comando que não executou do critério que reprovou', () => {
  it('rc 127 (não encontrado) e rc 126 (não executável) entram na lista; reprovação comum não entra', () => {
    const fx = criarFixture([]);
    escreverTicket(fx, {
      id: '902',
      slug: 'crit',
      objetivo: 'x',
      pathspec_allowlist: ['src/a.ts'],
      criterios_aceite: [
        { tipo: 'alvo', descricao: 'comando inexistente', cmd: 'comando_inexistente_625_xyz', espera: 'ok' },
        { tipo: 'alvo', descricao: 'arquivo sem permissao de execucao', cmd: './nao-executavel.sh', espera: 'ok' },
        { tipo: 'alvo', descricao: 'reprovacao comum', cmd: 'echo nao', espera: '^sim$' },
        { tipo: 'alvo', descricao: 'criterio verde', cmd: 'echo ok', espera: 'ok' },
      ],
    });
    const wt = join(fx, 'wt');
    mkdirSync(wt, { recursive: true });
    writeFileSync(join(wt, 'nao-executavel.sh'), '#!/bin/sh\necho ok\n');
    chmodSync(join(wt, 'nao-executavel.sh'), 0o644);
    const rundir = join(fx, 'docs', 'fila', 'runs', '902', 'attempt-0');
    mkdirSync(rundir, { recursive: true });
    const script = [
      `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
      `source "${EXECUTOR}"`,
      'set +e',
      `run_criterios "$(ticket_file_by_id 902)" "${wt}" "${rundir}"`,
      'printf "FALHOS=%s\\n" "$CRITERIOS_FALHOS"',
      'printf "NAO_EXEC=%s\\n" "$CRITERIOS_NAO_EXECUTADOS"',
    ].join('\n');
    const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: fx, env: { ...process.env } });
    const out = `${r.stdout}${r.stderr}`;
    const naoExec = JSON.parse(/^NAO_EXEC=(.*)$/m.exec(r.stdout)?.[1] ?? 'null') as string[] | null;
    expect(naoExec, out).toEqual(['comando inexistente', 'arquivo sem permissao de execucao']);
    // Os três falharam; só os dois primeiros NÃO executaram.
    const falhos = /^FALHOS=(.*)$/m.exec(r.stdout)?.[1] ?? '';
    expect(falhos).toContain('reprovacao comum');
    expect(falhos).toContain('comando inexistente');
    expect(falhos).not.toContain('criterio verde');
  });
});
