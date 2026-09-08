/**
 * Peça 1 — o JUIZ de diff (passo 7 do pipeline).
 *
 * Dois compromissos que puxam para lados opostos e que este arquivo cobra ao
 * mesmo tempo: o juiz REPROVA o que o gate mecânico não enxerga (o caso 204 do
 * PLAYBOOK), e veredito ILEGÍVEL nunca reprova — adia, porque ilegível não é
 * veredito sobre o trabalho.
 *
 * Além do comportamento novo, cada bloco tem o par NEGATIVO: com o gatilho
 * desarmado, o pipeline continua exatamente como era antes desta peça.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';
import {
  classeDeRisco,
  modeloDoJuiz,
  montarPromptJuiz,
  extrairVeredito,
  tocaTeste,
  type JuizCfg,
} from '../scripts/orquestrador/juiz.js';

const CFG = JSON.parse(
  readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'),
) as JuizCfg & { politica_adiamento: { causas_que_adiam: string[] } };

const RISCO_BASE = { arquivos: ['apps/web/src/app/home/page.tsx'], objetivo: 'ajusta o texto do card', diffLines: 40, retryFinal: false };

/** Envelope do `claude -p --output-format json` como ele CHEGA ao harness. */
const envelope = (result: string) =>
  JSON.stringify({ type: 'result', is_error: false, result, total_cost_usd: 0.02, usage: { input_tokens: 10, output_tokens: 5 } });

// ─── Veredito ─────────────────────────────────────────────────────────────

describe('veredito válido: aprovado e reprovado', () => {
  it('aprovado sai com criterios_falhos vazio', () => {
    const v = extrairVeredito(envelope('{"aprovado": true, "motivo": "integra e testa", "criterios_falhos": []}'));
    expect(v).toEqual({ aprovado: true, motivo: 'integra e testa', criterios_falhos: [] });
  });

  it('reprovado carrega motivo e os critérios que caíram', () => {
    const v = extrairVeredito(
      envelope('{"aprovado": false, "motivo": "ausência sem controle positivo", "criterios_falhos": ["avaliador: cobre INTEGRACAO"]}'),
    );
    expect(v!.aprovado).toBe(false);
    expect(v!.criterios_falhos).toEqual(['avaliador: cobre INTEGRACAO']);
  });

  it('tolera cerca de código e prosa em volta — é o formato que o modelo emite na prática', () => {
    const v = extrairVeredito(
      envelope('Analisei o diff.\n```json\n{"aprovado": false, "motivo": "teste tautológico", "criterios_falhos": []}\n```\nFim.'),
    );
    expect(v!.aprovado).toBe(false);
    expect(v!.motivo).toBe('teste tautológico');
  });

  it('sem envelope (stub que imprime só o JSON) lê igual', () => {
    expect(extrairVeredito('{"aprovado": true, "motivo": "ok", "criterios_falhos": []}')!.aprovado).toBe(true);
  });

  it('campos ausentes não inventam veredito: só `aprovado` booleano vale', () => {
    expect(extrairVeredito(envelope('{"motivo": "esqueci de decidir"}'))).toBeNull();
    expect(extrairVeredito(envelope('{"aprovado": "sim"}'))).toBeNull();
  });
});

describe('LIXO é adiado, nunca reprovado', () => {
  it('resposta em prosa pura é ilegível (null)', () => {
    expect(extrairVeredito(envelope('Não consegui avaliar este diff.'))).toBeNull();
  });

  it('envelope de erro do CLI é ilegível, não é reprovação', () => {
    expect(extrairVeredito(JSON.stringify({ type: 'result', is_error: true, result: 'API Error: Request rejected (429)' }))).toBeNull();
  });

  it('saída vazia é ilegível', () => {
    expect(extrairVeredito('')).toBeNull();
  });

  it('o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO)', () => {
    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', REPO_ROOT, 'parse'], {
      input: envelope('nada de json aqui'),
      encoding: 'utf8',
    });
    expect(r.status).toBe(3);
  });

  it('a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry', () => {
    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'desfecho'], {
      input: JSON.stringify({ exitCode: 0, saida: '', diffLines: 10, juizIlegivel: true }),
      encoding: 'utf8',
    });
    const v = JSON.parse(r.stdout);
    expect(v.desfecho).toBe('adiado');
    expect(v.causa).toBe('juiz_ilegivel');
    expect(v.contaComoRetry).toBe(false);
  });

  it('NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes', () => {
    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), REPO_ROOT, 'desfecho'], {
      input: JSON.stringify({ exitCode: 0, saida: '', diffLines: 10 }),
      encoding: 'utf8',
    });
    expect(JSON.parse(r.stdout).desfecho).toBe('aprovado');
  });

  it('o config continua sendo a autoridade: o rótulo está em causas_que_adiam', () => {
    expect(CFG.politica_adiamento.causas_que_adiam).toContain('veredito do juiz ilegível');
  });
});

// ─── Escolha do modelo por risco ──────────────────────────────────────────

describe('modelo por classe de risco (custo-e-contexto §7)', () => {
  it('baixo quando nada bate: sonnet', () => {
    const r = classeDeRisco(CFG, RISCO_BASE);
    expect(r.classe).toBe('baixo');
    expect(modeloDoJuiz(CFG, r.classe)).toBe(CFG.modelos.juiz_baixo);
  });

  it('path de alto risco NO DIFF sobe para opus', () => {
    const r = classeDeRisco(CFG, { ...RISCO_BASE, arquivos: ['apps/web/middleware.ts'] });
    expect(r.classe).toBe('alto');
    expect(r.motivo).toMatch(/middleware\.ts/);
    expect(modeloDoJuiz(CFG, r.classe)).toBe(CFG.modelos.juiz_alto);
  });

  it('glob com ** casa em profundidade (supabase/**)', () => {
    expect(classeDeRisco(CFG, { ...RISCO_BASE, arquivos: ['supabase/migrations/0026_x.sql'] }).classe).toBe('alto');
  });

  it('palavra de alto risco no objetivo sobe, mesmo com diff minúsculo', () => {
    const r = classeDeRisco(CFG, { ...RISCO_BASE, objetivo: 'corrige a permissão de leitura', diffLines: 3 });
    expect(r.classe).toBe('alto');
    expect(r.motivo).toMatch(/permiss/);
  });

  it('diff acima de juiz.diff_max_baixo sobe', () => {
    expect(classeDeRisco(CFG, { ...RISCO_BASE, diffLines: CFG.juiz.diff_max_baixo + 1 }).classe).toBe('alto');
    expect(classeDeRisco(CFG, { ...RISCO_BASE, diffLines: CFG.juiz.diff_max_baixo }).classe).toBe('baixo');
  });

  it('retry final é SEMPRE alto, aconteça o que acontecer com o resto', () => {
    const r = classeDeRisco(CFG, { ...RISCO_BASE, retryFinal: true });
    expect(r.classe).toBe('alto');
    expect(r.motivo).toBe('retry final');
  });

  it('o CLI devolve classe + modelo juntos (é o que o shell consome)', () => {
    const r = spawnSync('npx', ['tsx', join(REPO_ROOT, 'scripts', 'orquestrador', 'juiz.ts'), '--run-cli', REPO_ROOT, 'nivel'], {
      input: JSON.stringify({ ...RISCO_BASE, arquivos: ['supabase/migrations/x.sql'] }),
      encoding: 'utf8',
    });
    expect(JSON.parse(r.stdout)).toMatchObject({ classe: 'alto', modelo: CFG.modelos.juiz_alto });
  });
});

// ─── O prompt ─────────────────────────────────────────────────────────────

describe('o prompt cobra o que o gate mecânico não vê', () => {
  const base = {
    id: '999',
    objetivo: 'monta o card na home',
    allowlist: ['apps/web/src/app/home/Card.tsx'],
    diff: '+ const Card = () => null',
    gates: 'ok   testes_por_pacote  [9 pacotes, 711p/0f]',
    criterios: [
      { tipo: 'alvo', descricao: 'o card existe', cmd: 'test -f x', espera: 'ok' },
      { tipo: 'avaliador', descricao: 'cobre INTEGRACAO: o card é importado e montado na page', cmd: 'true', espera: 'avaliador' },
    ],
  };

  it('as quatro cobranças estão no texto', () => {
    const p = montarPromptJuiz(base);
    expect(p).toMatch(/INTEGRAÇÃO, não existência/);
    expect(p).toMatch(/tautológico/i);
    expect(p).toMatch(/CONTROLE POSITIVO/);
    expect(p).toMatch(/ficaria VERMELHO se a mudança fosse revertida/);
  });

  it('o critério AVALIADOR chega com a descrição inteira — hoje ele não chega a lugar nenhum', () => {
    const p = montarPromptJuiz(base);
    expect(p).toContain('cobre INTEGRACAO: o card é importado e montado na page');
    expect(p).toMatch(/\[avaliador · JULGUE VOCÊ\]/);
  });

  it('os critérios mecânicos vão marcados como já verificados (o juiz não reexecuta)', () => {
    expect(montarPromptJuiz(base)).toMatch(/\[alvo · já verificado por comando\]/);
  });

  it('diff cru e gates entram; nada de resumo do agente', () => {
    const p = montarPromptJuiz(base);
    expect(p).toContain('+ const Card = () => null');
    expect(p).toContain('711p/0f');
    expect(p).toMatch(/o que o agente diz que fez nunca é evidência/);
  });

  it('o formato de saída é o JSON que o decisao.ts já entende', () => {
    expect(montarPromptJuiz(base)).toMatch(/"aprovado".*"motivo".*"criterios_falhos"/s);
  });

  it('anti-afrouxamento entra SÓ quando a allowlist tem arquivo de teste', () => {
    expect(tocaTeste(['src/a.ts'])).toBe(false);
    expect(tocaTeste(['test/a.test.ts'])).toBe(true);
    expect(tocaTeste(['apps/web/test/x.spec.tsx'])).toBe(true);
    expect(montarPromptJuiz(base)).not.toMatch(/ANTI-AFROUXAMENTO/);
    const comTeste = montarPromptJuiz({ ...base, allowlist: [...base.allowlist, 'apps/web/test/card.test.tsx'] });
    expect(comTeste).toMatch(/ANTI-AFROUXAMENTO/);
    expect(comTeste).toMatch(/toBeDefined/);
    expect(comTeste).toMatch(/\.skip/);
    expect(comTeste).toMatch(/RECALCULADO/);
  });

  it('o prompt diz explicitamente que não há ferramenta', () => {
    expect(montarPromptJuiz(base)).toMatch(/VOCÊ NÃO TEM FERRAMENTAS/);
  });
});

// ─── A chamada e a evidência (contrato da casca de shell) ─────────────────

describe('a chamada do juiz: sem ferramentas, medida, com evidência', () => {
  const exec = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh'), 'utf8');

  it('roda sem ferramenta nenhuma e com um turno só', () => {
    expect(exec).toMatch(/--allowedTools ""\s*--max-turns 1/);
  });

  it('a chamada do AGENTE continua com as ferramentas dos gates (não foi afetada)', () => {
    expect(exec).toMatch(/--allowedTools "\$tools"/);
  });

  it('é medida com papel juiz, como as outras duas', () => {
    expect(exec).toMatch(/custo_registrar juiz "\$id" "\$attempt" "\$raw"/);
  });

  it('grava prompt e CRU em runs/<id>/attempt-N/', () => {
    expect(exec).toContain('prompt="$rundir/juiz.prompt.txt"; raw="$rundir/juiz.raw.json"');
  });

  it('só roda com TODO o mecânico verde e o diff no cap (fail-fast por custo)', () => {
    expect(exec).toMatch(
      // `$ENF_OK` e não `$enf_ok`: a variável virou GLOBAL na peça 0, porque o
      // `drive_ticket` lê o enforcement da tentativa para decidir se a próxima
      // reaproveita a worktree. O nome em minúsculas era `local` de run_attempt.
      /if \[ "\$ENF_OK" = 1 \] && \[ "\$gates_rc" = 0 \] && \[ -z "\$CRITERIOS_FALHOS" \][\s\S]{0,80}?DIFF_LINES" -le "\$CFG_DIFF_CAP"[\s\S]{0,80}?run_juiz/,
    );
  });

  it('o juiz NÃO recebe o prompt do executor nem o stdout do agente', () => {
    const bloco = /run_juiz\(\) \{[\s\S]*?\n\}/.exec(exec)![0];
    // `$rundir/prompt.txt` é o prompt do EXECUTOR e `$saida` é o stdout do
    // agente: os dois vivem no mesmo rundir e nenhum dos dois pode entrar aqui.
    expect(bloco).not.toContain('$rundir/prompt.txt');
    expect(bloco).not.toContain('$saida');
    expect(bloco).toContain('git -C "$wt" diff "$base"...HEAD');
  });
});

// ─── Ponta a ponta com stub, dentro de uma worktree de verdade ────────────

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');

/**
 * Roda `run_juiz` numa worktree git de mentira (um repo temporário com um
 * commit), com o juiz substituído por `--stub-juiz`. Prova o caminho inteiro:
 * prompt montado, envelope gravado, veredito lido.
 */
function juizComStub(raiz: string, stub: string, diffLines = 10) {
  const wt = join(raiz, 'wt');
  const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
  escrever(join(wt, 'a.txt'), 'base\n');
  escrever(join(rundir, 'gates.txt'), 'ok   testes_por_pacote  [9 pacotes, 711p/0f]\nVEREDITO: APROVADO\n');
  for (const cmd of [['init', '-q'], ['add', 'a.txt'], ['-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-qm', 'base']]) {
    spawnSync('git', ['-C', wt, ...cmd], { encoding: 'utf8' });
  }
  const base = spawnSync('git', ['-C', wt, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).stdout.trim();
  const r = spawnSync(
    'bash',
    [
      '-c',
      [
        'export EXECUTOR_SOURCED=1',
        `source "${EXECUTOR}" --stub-juiz ${JSON.stringify(stub)}`,
        'set +e',
        `DIFF_LINES=${diffLines}`,
        `run_juiz "$(ticket_file_by_id 901)" "${wt}" "${rundir}" "${base}" 0`,
        'echo "APROVADO=$JUIZ_APROVADO ILEGIVEL=$JUIZ_ILEGIVEL ROU=$JUIZ_ROU"',
      ].join('\n'),
    ],
    { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
  );
  return { saida: `${r.stdout}${r.stderr}`, rundir };
}

const TICKET_901 = {
  id: '901',
  slug: 'da-vez',
  status: 'pendente',
  objetivo: 'monta o card na home',
  pathspec_allowlist: ['apps/web/src/app/home/Card.tsx', 'apps/web/test/card.test.tsx'],
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'o card existe', cmd: 'test -f x && echo ok', espera: 'ok' },
    { tipo: 'avaliador', descricao: 'o card é IMPORTADO e MONTADO na page', cmd: 'true', espera: 'avaliador' },
  ],
};

describe('ponta a ponta com --stub-juiz', () => {
  it('veredito aprovado: JUIZ_APROVADO=true e evidência gravada', () => {
    const raiz = criarFixture([TICKET_901]);
    const r = juizComStub(raiz, `printf '%s' ${JSON.stringify(envelope('{"aprovado":true,"motivo":"integra","criterios_falhos":[]}'))}`);
    expect(r.saida).toContain('APROVADO=true ILEGIVEL=0 ROU=1');
    expect(existsSync(join(r.rundir, 'juiz.prompt.txt'))).toBe(true);
    expect(existsSync(join(r.rundir, 'juiz.raw.json'))).toBe(true);
    // O CRU é preservado inteiro — foi o cru que provou, num incidente real,
    // que o parser errava e não o veredito (regra 8).
    expect(ler(join(r.rundir, 'juiz.raw.json'))).toContain('total_cost_usd');
  });

  it('o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento', () => {
    const raiz = criarFixture([TICKET_901]);
    const r = juizComStub(raiz, `printf '%s' ${JSON.stringify(envelope('{"aprovado":true,"motivo":"ok","criterios_falhos":[]}'))}`);
    const p = ler(join(r.rundir, 'juiz.prompt.txt'));
    expect(p).toContain('o card é IMPORTADO e MONTADO na page');
    expect(p).toMatch(/ANTI-AFROUXAMENTO/);
    expect(p).toContain('711p/0f');
  });

  it('veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry', () => {
    const raiz = criarFixture([TICKET_901]);
    const r = juizComStub(
      raiz,
      `printf '%s' ${JSON.stringify(envelope('{"aprovado":false,"motivo":"ausência sem controle positivo","criterios_falhos":["o card é IMPORTADO e MONTADO na page"]}'))}`,
    );
    expect(r.saida).toContain('APROVADO=false ILEGIVEL=0 ROU=1');
    expect(r.saida).toMatch(/juiz: REPROVADO — ausência sem controle positivo/);
    expect(JSON.parse(ler(join(r.rundir, 'juiz.veredito.json'))).criterios_falhos).toHaveLength(1);
  });

  it('lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria', () => {
    const raiz = criarFixture([TICKET_901]);
    const r = juizComStub(raiz, `printf 'desculpe, não consegui avaliar'`);
    expect(r.saida).toContain('ILEGIVEL=1');
    expect(r.saida).toMatch(/veredito ILEGÍVEL/);
    expect(existsSync(join(r.rundir, 'juiz.veredito.json'))).toBe(false);
    expect(ler(join(r.rundir, 'juiz.raw.json'))).toContain('não consegui avaliar');
  });

  it('a trilha registra o veredito, a classe e o modelo, com attempt 1-based', () => {
    const raiz = criarFixture([TICKET_901]);
    juizComStub(raiz, `printf '%s' ${JSON.stringify(envelope('{"aprovado":true,"motivo":"ok","criterios_falhos":[]}'))}`);
    const ev = ler(join(raiz, 'docs', 'fila', 'runs', 'events.log'));
    expect(ev).toMatch(/901 JUIZ veredito=aprovado classe=baixo modelo=sonnet attempt=1/);
  });

  it('o risco sobe pelo objetivo e leva o modelo forte junto', () => {
    const raiz = criarFixture([{ ...TICKET_901, objetivo: 'ajusta a permissão do painel' }]);
    const r = juizComStub(raiz, `printf '%s' ${JSON.stringify(envelope('{"aprovado":true,"motivo":"ok","criterios_falhos":[]}'))}`);
    expect(r.saida).toMatch(/juiz: risco alto .*modelo opus/);
  });

  it('NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito', () => {
    const raiz = criarFixture([TICKET_901]);
    const r = spawnSync(
      'bash',
      [
        '-c',
        [
          'export EXECUTOR_SOURCED=1',
          `source "${EXECUTOR}" --dry`,
          'set +e',
          'DIFF_LINES=10',
          'run_juiz "$(ticket_file_by_id 901)" "/tmp" "/tmp" "HEAD" 0',
          'echo "ROU=$JUIZ_ROU ILEGIVEL=$JUIZ_ILEGIVEL"',
        ].join('\n'),
      ],
      { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
    );
    expect(`${r.stdout}${r.stderr}`).toContain('ROU=0 ILEGIVEL=0');
    expect(`${r.stdout}${r.stderr}`).toMatch(/dry-run não inventa veredito/);
  });
});
