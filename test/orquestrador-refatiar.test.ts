/**
 * Peça 2 — `refatiar` (regra 19) e o diagnóstico estruturado (§6).
 *
 * As duas metades do mesmo problema, que o 201 pagou por inteiro em 2026-09-02:
 * reprovação MECÂNICA (fora da allowlist, diff acima do cap) não é falha de
 * capacidade e repetir a tentativa não conserta — vira `refatiar`, sem consumir
 * retry; e quando a reprovação É de mérito, o retry passa a receber ONDE, não
 * só o quê, com os arquivos de teste que a allowlist não cobre nomeados.
 *
 * A evidência dos gates e do enforcement usada aqui é a REAL das três
 * tentativas do 201 (`docs/fila/runs/201/`, capturada em test/fixtures/): o
 * cenário do teste tem que ser o que aconteceu, não o que eu imagino que
 * acontece.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FX_CHECKOUT, REPO_ROOT, criarFixture, escrever, ler } from './fixtures/orq-harness.js';
import { classificar } from '../scripts/orquestrador/fila-read.js';
import {
  montarDiagnostico,
  arquivosDeTesteCitados,
  gateQueFalhou,
  primeiroLocal,
  INSTRUCAO,
} from '../scripts/orquestrador/diagnostico.js';
import { recorteDeFalha } from '../scripts/orquestrador/gates.js';

const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
const FIXT = join(REPO_ROOT, 'test', 'fixtures', 'runs-201');
const fx = (f: string) => readFileSync(join(FIXT, f), 'utf8');

/**
 * O gates.txt como o motor passa a escrevê-lo: placar + recorte do gate que
 * reprovou. Montado aqui pela MESMA função que o CLI usa, sobre a saída real do
 * vitest — assim o teste não congela um formato que o motor não produz.
 * Ver test/fixtures/runs-201/PROCEDENCIA.md.
 */
const GATES_COM_RECORTE = `${fx('attempt-2.gates.txt').trimEnd()}\n\n--- recorte de testes_por_pacote ---\n${recorteDeFalha(fx('vitest-falha.saida.txt')).join('\n')}\n`;
const TESTE_QUEBRADO = 'test/zz-captura-falha.test.ts';

const decisao = (sinal: unknown) =>
  JSON.parse(
    spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'desfecho'], {
      input: JSON.stringify(sinal),
      encoding: 'utf8',
    }).stdout,
  );

const SINAL_OK = { exitCode: 0, saida: '', diffLines: 10 };

// ─── Os gatilhos de refatiar ──────────────────────────────────────────────

describe('reprovação MECÂNICA vira refatiar, sem consumir retry', () => {
  it('diff acima do cap: refatiar, contaComoRetry false', () => {
    const v = decisao({ ...SINAL_OK, diffLines: CFG.diff_cap_linhas + 1 });
    expect(v.desfecho).toBe('refatiar');
    expect(v.causa).toBe('diff_cap');
    expect(v.contaComoRetry).toBe(false);
  });

  it('arquivo fora da allowlist (enforcement): refatiar', () => {
    const v = decisao({ ...SINAL_OK, enforcementViolado: true });
    expect(v.desfecho).toBe('refatiar');
    expect(v.causa).toBe('enforcement');
    expect(v.contaComoRetry).toBe(false);
  });

  it('zona proibida entra pelo MESMO campo — é a barreira que classifica', () => {
    // enforcement-core devolve `zona_proibida` e `fora_do_pathspec` no mesmo
    // enforcement.json; o executor só passa adiante "a barreira reprovou".
    const v = decisao({ ...SINAL_OK, enforcementViolado: true, diffLines: 5 });
    expect(v.desfecho).toBe('refatiar');
  });

  it('refatiar NÃO gera retry (o plano diz deveTentar=false)', () => {
    const r = spawnSync(
      'npx',
      ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'retry', '0', 'sonnet'],
      { input: JSON.stringify({ desfecho: 'refatiar', causa: 'enforcement', motivo: 'x', contaComoRetry: false }), encoding: 'utf8' },
    );
    const plano = JSON.parse(r.stdout);
    expect(plano.deveTentar).toBe(false);
    expect(plano.escalou).toBe(false);
    expect(plano.motivo).toMatch(/desfecho refatiar não gera retry/);
  });

  it('NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry', () => {
    const v = decisao({ ...SINAL_OK, criteriosFalhos: ['o card é montado na page'] });
    expect(v.desfecho).toBe('reprovado');
    expect(v.causa).toBe('criterio_qualidade');
    expect(v.contaComoRetry).toBe(true);
    const plano = JSON.parse(
      spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), FX_CHECKOUT, 'retry', '0', 'sonnet'], {
        input: JSON.stringify(v),
        encoding: 'utf8',
      }).stdout,
    );
    expect(plano.deveTentar).toBe(true);
  });

  it('NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar', () => {
    // Diff estourado E rate limit ao mesmo tempo: adia. O diff grande pode ser
    // consequência de o agente ter sido cortado no meio.
    const v = decisao({ exitCode: 1, saida: 'API Error: Request rejected (429)', diffLines: 9999 });
    expect(v.desfecho).toBe('adiado');
  });
});

// ─── O status na fila ─────────────────────────────────────────────────────

describe('a fila reconhece o status refatiar', () => {
  const t = (status: string) => ({ id: '901', slug: 's', status, dependencias: [], file: 'x' });

  it('fila-read classifica como classe própria, nunca como pendente', () => {
    expect(classificar(t('refatiar'), new Set())).toBe('refatiar');
    expect(classificar(t('pendente'), new Set())).toBe('pendente');
  });

  it('o placar da fila lista refatiar na ordem fixa', () => {
    const raiz = criarFixture([
      { id: '901', status: 'refatiar' },
      { id: '902', status: 'pendente' },
      { id: '903', status: 'done' },
    ]);
    const r = spawnSync('bash', ['-c', `export ORQ_EXEC_ROOT="${raiz}"; source "${join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh')}"; placar_fila`], {
      encoding: 'utf8',
      cwd: raiz,
    });
    expect(r.stdout.trim()).toBe('1 pendente · 1 refatiar · 1 done');
  });

  it('refatiar NÃO é processável: proximo_pendente pula e pega o pendente', () => {
    const raiz = criarFixture([
      { id: '901', status: 'refatiar' },
      { id: '902', status: 'pendente' },
    ]);
    const r = spawnSync('bash', ['-c', `export ORQ_EXEC_ROOT="${raiz}"; source "${join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh')}"; proximo_pendente`], {
      encoding: 'utf8',
      cwd: raiz,
    });
    expect(r.stdout.trim()).toMatch(/902-/);
    expect(r.stdout).not.toMatch(/901-/);
  });

  it('orq fila mostra o ticket com o status refatiar', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'refatiar' }]);
    const r = spawnSync(join(REPO_ROOT, 'scripts', 'orq'), ['fila'], {
      encoding: 'utf8',
      cwd: raiz,
      env: { ...process.env, ORQ_EXEC_ROOT: raiz },
    });
    expect(r.stdout).toMatch(/refatiar\s+901/);
  });
});

// ─── O caminho no executor ────────────────────────────────────────────────

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

/** Roda marca_refatiar num fixture, com a evidência REAL do 201 no rundir. */
function refatiarNoFixture(raiz: string, origem = 'humano') {
  const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
  escrever(join(rundir, 'enforcement.json'), fx('attempt-1.enforcement.json'));
  const r = spawnSync(
    'bash',
    [
      '-c',
      [
        'export EXECUTOR_SOURCED=1',
        `source "${EXECUTOR}"`,
        'set +e',
        'ticket_commit() { return 0; }',
        'DIFF_LINES=42; DUR=3; MOTIVO="barreira: violação de zona/escopo (ver enforcement.json)"',
        `marca_refatiar "$(ticket_file_by_id 901)" "${rundir}" enforcement`,
      ].join('\n'),
    ],
    { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
  );
  void origem;
  return { saida: `${r.stdout}${r.stderr}`, raiz };
}

const ticket901 = (origem: string) => ({
  id: '901',
  slug: 'da-vez',
  status: 'pendente',
  origem,
  pathspec_allowlist: ['services/x/src/a.ts'],
});

describe('marca_refatiar: status, nota, evento, commit e decisão pendente', () => {
  it('status vira refatiar e a nota LISTA os arquivos', () => {
    const { raiz } = refatiarNoFixture(criarFixture([ticket901('humano')]));
    const t = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(ler(join(raiz, 'docs', 'fila', '901-da-vez.md')))![1]!);
    expect(t.status).toBe('refatiar');
    expect(t.notas_status).toContain('services/persona-roteirizador/test/geracao-guiada.test.ts');
    expect(t.notas_status).toMatch(/não consome tentativa/);
  });

  it('a trilha registra REFATIAR com motivo= e arquivos=', () => {
    const { raiz } = refatiarNoFixture(criarFixture([ticket901('humano')]));
    const ev = ler(join(raiz, 'docs', 'fila', 'runs', 'events.log'));
    expect(ev).toMatch(/901 REFATIAR motivo=enforcement arquivos=services\/persona-roteirizador\/test\/geracao-guiada\.test\.ts/);
  });

  it('o commit de status é "fila: <id> refatiar"', () => {
    const exec = readFileSync(EXECUTOR, 'utf8');
    expect(exec).toContain('ticket_commit "$file" "fila: $id refatiar"');
  });

  it('origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa', () => {
    const raiz = criarFixture([ticket901('humano')]);
    escrever(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'), '| Data | Origem | Frente/Ticket | Pergunta | O que a máquina viu |\n|---|---|---|---|---|\n');
    refatiarNoFixture(raiz);
    const d = ler(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'));
    expect(d).toMatch(/\| humano-executor \| 901 \| allowlist não cobre .*: ampliar ou fatiar\? \|/);
    expect(d).toContain('geracao-guiada.test.ts');
  });

  it('a mesma pendência duas vezes não vira duas linhas', () => {
    const raiz = criarFixture([ticket901('humano')]);
    escrever(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'), '| Data | Origem |\n|---|---|\n');
    refatiarNoFixture(raiz);
    refatiarNoFixture(raiz);
    const linhas = ler(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md')).split('\n').filter((l) => l.includes('humano-executor'));
    expect(linhas).toHaveLength(1);
  });

  it('NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente)', () => {
    const raiz = criarFixture([ticket901('planejador')]);
    escrever(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'), '| Data | Origem |\n|---|---|\n');
    const r = refatiarNoFixture(raiz);
    expect(r.saida).toMatch(/volta ao planejador, sem decisão pendente/);
    expect(ler(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'))).not.toContain('humano-executor');
  });

  it('diff acima do cap, sem enforcement.json, ainda diz o tamanho na nota', () => {
    const raiz = criarFixture([ticket901('humano')]);
    const r = spawnSync(
      'bash',
      [
        '-c',
        [
          'export EXECUTOR_SOURCED=1',
          `source "${EXECUTOR}"`,
          'set +e',
          'DIFF_LINES=1200',
          'arquivos_do_refatiar "/tmp/nao-existe"',
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
    );
    expect(r.stdout).toContain('diff de 1200 linhas acima do cap de 600');
  });
});

// ─── O diagnóstico estruturado ────────────────────────────────────────────

describe('recorteDeFalha: o gates.txt passa a dizer QUAL arquivo quebrou', () => {
  it('pega as linhas de falha do vitest, não o log inteiro', () => {
    const bruto = fx('vitest-falha.saida.txt');
    const r = recorteDeFalha(bruto);
    expect(r.join('\n')).toContain(TESTE_QUEBRADO);
    expect(r.join('\n')).toContain('AssertionError');
    expect(r.length).toBeLessThanOrEqual(40);
    expect(r.length).toBeLessThan(bruto.split('\n').length);
  });

  it('o strip de ANSI vale para o vitest 4.x, que mantém cor mesmo redirecionado', () => {
    // A captura real veio do vitest 2.1.9 (services/), que DESLIGA a cor fora de
    // TTY — por isso ela não tem escape nenhum. Quem os mantém é o 4.1.9 de
    // apps/web, e foi ele que já cegou o parser do placar uma vez (gates.ts).
    expect(fx('vitest-falha.saida.txt')).not.toContain('\u001b[');
    const colorido = ' \u001b[31mFAIL\u001b[39m  apps/web/test/card.test.tsx > monta';
    expect(recorteDeFalha(colorido).join('\n')).toBe(' FAIL  apps/web/test/card.test.tsx > monta');
  });

  it('pega erro de tipo do tsc', () => {
    expect(recorteDeFalha('src/a.ts(12,7): error TS2322: Type X\nblabla').join('\n')).toContain('error TS2322');
  });

  it('saída vazia devolve recorte vazio, sem explodir', () => {
    expect(recorteDeFalha('')).toEqual([]);
  });
});

describe('montarDiagnostico: ONDE, não só o quê', () => {
  const ALLOW_201 = [
    'services/persona-roteirizador/src/geracao-guiada/estagio-roteiro.ts',
    'apps/web/src/app/gerar/WizardGerar.tsx',
  ];

  it('enforcement: nomeia o arquivo fora do pathspec (evidência real do 201)', () => {
    const d = montarDiagnostico({ enforcementJson: fx('attempt-1.enforcement.json'), allowlist: ALLOW_201 });
    expect(d.gate).toBe('enforcement');
    expect(d.fora_da_allowlist).toEqual(['services/persona-roteirizador/test/geracao-guiada.test.ts']);
    expect(d.instrucao).toBe(INSTRUCAO);
  });

  it('o gates.txt ANTIGO não dizia arquivo nenhum — é o buraco que esta peça fecha', () => {
    const d = montarDiagnostico({ gatesTxt: fx('attempt-2.gates.txt'), allowlist: ALLOW_201 });
    expect(d.gate).toBe('testes_por_pacote');
    expect(d.obtido).toContain('1 teste(s) falhando');
    expect(d.fora_da_allowlist).toEqual([]); // placar não tem nome de arquivo
    expect(d.arquivo).toBe('');
  });

  it('com o recorte, o arquivo de teste quebrado fora da allowlist é NOMEADO — a lição do 201', () => {
    const d = montarDiagnostico({ gatesTxt: GATES_COM_RECORTE, allowlist: ALLOW_201 });
    expect(d.gate).toBe('testes_por_pacote');
    expect(d.fora_da_allowlist).toContain(TESTE_QUEBRADO);
    expect(d.arquivo).toBe(TESTE_QUEBRADO);
    expect(d.linha).toBeGreaterThan(0);
    expect(d.esperado).toBe('false');
    expect(d.obtido).toBe('true');
  });

  it('NEGATIVO: com o arquivo DENTRO da allowlist, fora_da_allowlist fica vazio', () => {
    const d = montarDiagnostico({ gatesTxt: GATES_COM_RECORTE, allowlist: [...ALLOW_201, TESTE_QUEBRADO] });
    expect(d.fora_da_allowlist).toEqual([]);
    expect(d.arquivo).toBe(TESTE_QUEBRADO); // segue apontando ONDE quebrou
  });

  it('glob da allowlist conta como cobertura (não é comparação literal)', () => {
    const d = montarDiagnostico({ gatesTxt: GATES_COM_RECORTE, allowlist: ['test/**'] });
    expect(d.fora_da_allowlist).toEqual([]);
  });

  it('gate verde e critério vermelho: gate=criterios, com esperado vs obtido do criterios.txt', () => {
    const d = montarDiagnostico({
      gatesTxt: fx('attempt-0.gates.txt'),
      criteriosTxt: fx('attempt-0.criterios.txt'),
      criteriosFalhos: ['o checkbox de compliance sumiu do wizard'],
      allowlist: ALLOW_201,
    });
    expect(d.gate).toBe('criterios');
    expect(d.esperado).toBe('0');
    expect(d.obtido).toBe('1');
  });

  it('reprovação do JUIZ entra pelo mesmo caminho, marcada como gate=juiz', () => {
    const d = montarDiagnostico({
      gatesTxt: fx('attempt-0.gates.txt'),
      criteriosFalhos: ['juiz: o card não é montado em page.tsx', 'o card é IMPORTADO e MONTADO'],
      allowlist: ALLOW_201,
    });
    expect(d.gate).toBe('juiz');
    expect(d.criterios_falhos).toHaveLength(2);
    expect(d.obtido).toContain('não é montado');
  });

  it('o trecho tem no máximo 15 linhas (o JSON é ≤ 500 tokens, não um log)', () => {
    const d = montarDiagnostico({ gatesTxt: GATES_COM_RECORTE, allowlist: [] });
    expect(d.trecho.split('\n').length).toBeLessThanOrEqual(15);
    expect(JSON.stringify(d).length).toBeLessThan(2000);
  });

  it('a ordem é a do pipeline: enforcement explica antes dos gates', () => {
    const d = montarDiagnostico({
      enforcementJson: fx('attempt-1.enforcement.json'),
      gatesTxt: fx('attempt-2.gates.txt'),
      allowlist: [],
    });
    expect(d.gate).toBe('enforcement');
  });

  it('sem evidência nenhuma devolve a forma completa, com a instrução', () => {
    const d = montarDiagnostico({});
    expect(Object.keys(d).sort()).toEqual(
      // `permissoes_negadas` entrou na peça 0c: a forma é FECHADA de propósito,
      // então campo novo passa por aqui — é o teste que impede o diagnóstico de
      // crescer sem alguém decidir que ele deve crescer.
      ['arquivo', 'criterios_falhos', 'esperado', 'fora_da_allowlist', 'gate', 'instrucao', 'linha', 'obtido', 'permissoes_negadas', 'trecho'].sort(),
    );
    expect(d.instrucao).toMatch(/reporte IMPEDIMENTO no commit/);
  });

  it('os auxiliares fazem o que dizem', () => {
    expect(gateQueFalhou(fx('attempt-2.gates.txt'))).toBe('testes_por_pacote');
    expect(gateQueFalhou(fx('attempt-0.gates.txt'))).toBe('');
    expect(arquivosDeTesteCitados('FAIL test/a.test.ts > x\nFAIL apps/b.spec.tsx')).toEqual(['test/a.test.ts', 'apps/b.spec.tsx']);
    expect(primeiroLocal('❯ test/a.test.ts:42:9')).toEqual({ arquivo: 'test/a.test.ts', linha: 42 });
    expect(primeiroLocal('src/a.ts(12,7): error TS2322')).toEqual({ arquivo: 'src/a.ts', linha: 12 });
  });
});

describe('o retry recebe o JSON, não o texto livre', () => {
  const exec = readFileSync(EXECUTOR, 'utf8');

  it('MOTIVO_ANTERIOR sai do diagnostico_retry', () => {
    expect(exec).toMatch(/MOTIVO_ANTERIOR="\$\(diagnostico_retry "\$file" "\$rundir"\)/);
  });

  it('falha do diagnóstico NÃO custa o retry: cai no motivo em texto', () => {
    expect(exec).toMatch(/não consegui montar o JSON[\s\S]{0,80}?printf '%s' "\$MOTIVO"/);
  });

  it('o CLI monta o JSON a partir do rundir de verdade', () => {
    const raiz = criarFixture([]);
    const rundir = join(raiz, 'run');
    escrever(join(rundir, 'gates.txt'), GATES_COM_RECORTE);
    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'diagnostico.ts'), '--run-cli', rundir], {
      input: JSON.stringify({ allowlist: ['src/a.ts'], criteriosFalhos: [] }),
      encoding: 'utf8',
    });
    const d = JSON.parse(r.stdout);
    expect(d.gate).toBe('testes_por_pacote');
    expect(d.fora_da_allowlist.length).toBeGreaterThan(0);
  });
});

describe('permissão negada entra no diagnóstico do retry (peça 0c)', () => {
  // No 227 o agente levou 3 negativas em `npm run typecheck` e o campo
  // `permission_denials` do envelope era descartado. O retry seguinte recebia um
  // diagnóstico que falava só de critério e mandava o agente bater no mesmo muro.
  it('lista os comandos negados, sem repetir', () => {
    const d = montarDiagnostico({
      permissoesNegadas: ['npm run typecheck', 'npm run typecheck', 'npm run build'],
    });
    expect(d.permissoes_negadas).toEqual(['npm run typecheck', 'npm run build']);
  });

  it('a instrução ganha a linha que impede insistir no comando negado', () => {
    const d = montarDiagnostico({ permissoesNegadas: ['npm run typecheck'] });
    expect(d.instrucao).toContain(INSTRUCAO);
    expect(d.instrucao).toContain('não insista no comando negado');
  });

  it('sem negativa, a instrução fica exatamente como era', () => {
    expect(montarDiagnostico({}).instrucao).toBe(INSTRUCAO);
    expect(montarDiagnostico({}).permissoes_negadas).toEqual([]);
  });

  // O campo sobrevive ao caminho de enforcement, que retorna cedo com `...base`.
  it('sobrevive ao ramo de enforcement', () => {
    const d = montarDiagnostico({
      enforcementJson: JSON.stringify({ ok: false, violations: [{ tipo: 'fora_do_pathspec', detalhe: 'x.ts' }] }),
      permissoesNegadas: ['npm run typecheck'],
    });
    expect(d.gate).toBe('enforcement');
    expect(d.permissoes_negadas).toEqual(['npm run typecheck']);
  });
});
