/**
 * Ticket 627 (porte do 0e2d2ad do Actus) — o prompt do executor ganha o bloco
 * "EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER".
 *
 * Causa: no 503 do Actus o critério "cita arquivo:linha" tinha um regex que o
 * grep BSD não casava com nenhuma citação legítima, e o agente fabricou
 * `src/A-]:1` para o critério passar. O 624 fecha o regex no gate; o 627 fecha
 * a outra ponta: o agente é instruído a relatar o critério suspeito em vez de
 * escrever conteúdo cuja única função é passar nele.
 *
 * Como o 0e(c) (orquestrador-prompt-como-rodar.test.ts), o caso central roda
 * `run_attempt` DE VERDADE com `claude_run` interceptado: o prompt conferido é
 * o `prompt.txt` que a chamada paga receberia, na primeira tentativa e no retry.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

const TICKET = {
  id: '901',
  slug: 'cita',
  objetivo: 'escreve docs/diagnosticos/x.md citando arquivo:linha',
  pathspec_allowlist: ['docs/diagnosticos/x.md'],
  criterios_aceite: [
    {
      tipo: 'alvo',
      descricao: 'cita arquivo:linha',
      cmd: "{ grep -cE '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+' docs/diagnosticos/x.md || true; }",
      espera: '^[1-9]',
    },
    { tipo: 'avaliador', descricao: 'as citações são reais', cmd: 'true', espera: 'avaliador' },
  ],
};

const TITULO = 'EVIDÊNCIA É O QUE O TRABALHO FEZ, NUNCA O QUE O CRITÉRIO QUER LER';

/** Roda run_attempt com claude_run INTERCEPTADO e devolve o prompt.txt gerado. */
function promptDaTentativa(motivo: string): string {
  const fx = criarFixture([]);
  escreverTicket(fx, TICKET);
  const wt = join(fx, 'wt');
  mkdirSync(join(wt, 'docs', 'diagnosticos'), { recursive: true });
  writeFileSync(join(wt, 'docs', 'diagnosticos', 'base.md'), 'base\n');
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', wt, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  spawnSync('git', ['-C', wt, 'init', '-q', '-b', 'main'], { encoding: 'utf8' });
  g('add', '-A');
  g('commit', '-qm', 'base');
  const rundir = join(fx, 'docs', 'fila', 'runs', '901', 'attempt-0');
  const script = [
    `export ORQ_EXEC_ROOT="${fx}" ORQ_TESTE=1 EXECUTOR_SOURCED=1`,
    `source "${EXECUTOR}"`,
    'set +e',
    `claude_run() { local d="$1" o="$2"; printf '{}\\n' > "$o"; return 0; }`,
    `enforcement_stub() { :; }`,
    `run_attempt "$(ticket_file_by_id 901)" "${wt}" "${rundir}" sonnet "$T627_MOTIVO" 0`,
  ].join('\n');
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, T627_MOTIVO: motivo },
  });
  const prompt = ler(join(rundir, 'prompt.txt'));
  expect(prompt, `run_attempt não gerou prompt: ${r.stderr}`).not.toBe('');
  return prompt;
}

/** O texto do bloco: do título até a linha em branco que o fecha. */
function bloco(prompt: string): string {
  const depois = prompt.split(TITULO)[1];
  expect(depois, `bloco "${TITULO}" ausente do prompt`).toBeDefined();
  return (depois ?? '').split('\n\n')[0] ?? '';
}

describe('627 · o prompt da primeira tentativa carrega a regra contra evidência fabricada', () => {
  const prompt = promptDaTentativa('');

  it('o bloco existe, depois de COMO RODAR COMANDOS e antes de ENTREGA', () => {
    const iComo = prompt.indexOf('COMO RODAR COMANDOS');
    const iEvid = prompt.indexOf(TITULO);
    const iEntrega = prompt.indexOf('ENTREGA:');
    expect(iEvid, `bloco "${TITULO}" ausente do prompt`).toBeGreaterThan(-1);
    expect(iComo).toBeGreaterThan(-1);
    expect(iEvid).toBeGreaterThan(iComo);
    expect(iEntrega).toBeGreaterThan(iEvid);
  });

  it('regra 1: nada escrito só para o critério passar, nem admitindo que é artificial', () => {
    const b = bloco(prompt);
    expect(b).toContain('Nunca escreva conteúdo cuja única função é fazer um critério passar');
    expect(b).toContain('Vale mesmo que o próprio texto admita que é artificial.');
  });

  it('regra 2: critério suspeito se relata com o marcador CRITÉRIO SUSPEITO, não se contorna', () => {
    const b = bloco(prompt);
    expect(b).toMatch(/Critério que parece errado \(regex que não casa com nada legítimo.*\) NÃO se contorna\./);
    expect(b).toContain('CRITÉRIO SUSPEITO: <descricao>');
  });

  it('regra 3: vermelho honesto é aceitável; verde fabricado é reprovação', () => {
    const b = bloco(prompt);
    expect(b).toContain('Critério vermelho com relato honesto é desfecho aceitável.');
    expect(b).toContain('Critério verde com evidência fabricada é reprovação.');
  });

  it('regra 4: temporário só em /tmp, nada fora da allowlist na worktree', () => {
    expect(bloco(prompt)).toContain('vai só para /tmp; nada fora da allowlist fica na worktree');
  });
});

describe('627 · o retry também carrega o bloco', () => {
  it('com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo', () => {
    const prompt = promptDaTentativa('critério 1 vermelho: 0 citações');
    const iEvid = prompt.indexOf(TITULO);
    const iMotivo = prompt.indexOf('REPROVAÇÃO ANTERIOR');
    expect(iEvid, `bloco "${TITULO}" ausente do prompt de retry`).toBeGreaterThan(-1);
    expect(iMotivo).toBeGreaterThan(iEvid);
    expect(prompt).toContain('critério 1 vermelho: 0 citações');
  });
});
