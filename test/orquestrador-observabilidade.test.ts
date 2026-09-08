/**
 * Peça 2 — observabilidade: contrato de references/observabilidade.md §1 a §3.
 *
 * §1 STATUS.md é SNAPSHOT: reescrito inteiro a cada transição, nunca append.
 * §2 events.log é TRILHA: uma linha por transição, `<iso8601> <id> <EVENTO> k=v`,
 *    com motivo= sempre token curto e grepável.
 *
 * Tudo roda contra o fixture fora de git — nenhuma escrita em docs/fila real.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  bashComLog,
  bashNoFixture,
  criarFixture,
  escrever,
  ler,
  REPO_ROOT,
} from './fixtures/orq-harness.js';

const STATUS = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'STATUS.md');
const EVENTS = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'events.log');

const FILA = [
  { id: '900', slug: 'a', status: 'done' },
  { id: '901', slug: 'b', status: 'pendente' },
  { id: '902', slug: 'c', status: 'pendente' },
  { id: '903', slug: 'd', status: 'bloqueado' },
];

function campos(md: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const l of md.split('\n')) {
    const m = /^([A-ZÚ]+) {2,}(.*)$/.exec(l);
    if (m) out[m[1]!] = m[2]!;
  }
  return out;
}

// ─── §1 · STATUS.md ───────────────────────────────────────────────────────

describe('status_set reescreve o snapshot INTEIRO', () => {
  it('grava todos os campos obrigatórios do contrato', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=executando" "ticket=901 b · tentativa 1/3" "fase=agente" "desde=10:00:00" "desde_epoch=$(date +%s)"');
    const c = campos(ler(STATUS(raiz)));
    for (const k of ['ESTADO', 'TICKET', 'DESDE', 'FASE', 'FILA', 'STAGING', 'ÚLTIMO']) {
      expect(Object.keys(c), `campo ${k}`).toContain(k);
    }
    expect(c.ESTADO).toBe('executando');
    expect(c.TICKET).toBe('901 b · tentativa 1/3');
    expect(c.FASE).toBe('agente');
  });

  it('NUNCA append: 20 transições e o arquivo continua do mesmo tamanho', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'for i in $(seq 1 20); do status_set "estado=executando" "fase=gates"; done');
    const linhas = ler(STATUS(raiz)).trim().split('\n');
    expect(linhas.length).toBeLessThanOrEqual(9);
    expect(linhas.filter((l) => l.startsWith('ESTADO')).length).toBe(1);
  });

  it('a transição seguinte APAGA o valor anterior (não convive com ele)', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, ['status_set "fase=agente"', 'status_set "fase=build"'].join('\n'));
    const md = ler(STATUS(raiz));
    expect(md).toContain('FASE     build');
    expect(md).not.toContain('agente');
  });

  it('ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(
      raiz,
      ['status_set "estado=executando" "ticket=901 b" "fase=gates"', 'status_set "estado=ocioso" "motivo=pausado"'].join('\n'),
    );
    const c = campos(ler(STATUS(raiz)));
    expect(c.ESTADO).toBe('ocioso');
    expect(c.TICKET).toBe('—');
    expect(c.FASE).toBe('—');
    expect(c.MOTIVO).toBe('pausado');
  });

  it('executando não carrega MOTIVO (motivo é só de fila parada)', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=executando" "motivo=pausado"');
    expect(ler(STATUS(raiz))).not.toContain('MOTIVO');
  });

  it('DESDE distingue trabalhando de travado: decorrido + quanto falta p/ timeout', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=executando" "desde=10:00:00" "desde_epoch=$(( $(date +%s) - 600 ))"');
    const c = campos(ler(STATUS(raiz)));
    expect(c.DESDE).toMatch(/^10:00:00 \(10min\) · timeout em \d+min$/);
  });
});

describe('FILA e STAGING são RELIDOS do disco a cada render (regra 9)', () => {
  it('placar bate com os tickets do fixture', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=ocioso" "motivo=x"');
    expect(campos(ler(STATUS(raiz))).FILA).toBe('2 pendente · 1 bloqueado · 1 done');
  });

  it('mudou o status de um ticket, mudou o placar — sem passar fila= nenhum', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=ocioso" "motivo=x"');
    const antes = campos(ler(STATUS(raiz))).FILA;
    bashNoFixture(raiz, [
      'f="$(ticket_file_by_id 901)"',
      'ticket_set_status "$f" done',
      'status_set "estado=ocioso" "motivo=x"',
    ].join('\n'));
    const depois = campos(ler(STATUS(raiz))).FILA;
    expect(antes).toBe('2 pendente · 1 bloqueado · 1 done');
    expect(depois).toBe('1 pendente · 1 bloqueado · 2 done');
  });

  it('STAGING mostra que o push está suprimido (regra 12)', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "estado=ocioso" "motivo=x"');
    expect(campos(ler(STATUS(raiz))).STAGING).toMatch(/push suprimido/);
  });

  it('chave desconhecida é ignorada com aviso, não escreve lixo no snapshot', () => {
    const raiz = criarFixture(FILA);
    const r = bashComLog(raiz, 'status_set "inventada=xpto" "estado=ocioso" "motivo=x"');
    expect(r.saida).toMatch(/chave desconhecida 'inventada'/);
    expect(ler(STATUS(raiz))).not.toContain('xpto');
  });
});

// ─── §2 · events.log ──────────────────────────────────────────────────────

describe('event: uma linha por transição, formato fixo', () => {
  it('<iso8601> <id> <EVENTO> chave=valor', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'event 901 INICIO attempt=0 model=sonnet');
    const l = ler(EVENTS(raiz)).trim();
    expect(l).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4} 901 INICIO attempt=0 model=sonnet$/);
  });

  it('anexa (a trilha é histórico), uma linha por chamada', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, ['event --- DRENAGEM_INICIO alvo=staging-auto', 'event 901 INICIO attempt=0', 'event --- DRENAGEM_FIM aprovados=1 dur=3min'].join('\n'));
    const linhas = ler(EVENTS(raiz)).trim().split('\n');
    expect(linhas.length).toBe(3);
    expect(linhas[0]).toContain('DRENAGEM_INICIO');
    expect(linhas[2]).toContain('DRENAGEM_FIM aprovados=1 dur=3min');
  });

  it('evento sem pares chave=valor não deixa espaço solto no fim', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'event 901 BLOQUEADO');
    expect(ler(EVENTS(raiz)).trim()).toMatch(/ 901 BLOQUEADO$/);
  });

  it('cabe numa tela: nenhuma linha passa de 200 colunas', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'event 901 REPROVADO motivo=criterio_qualidade attempt=1 diff=412');
    for (const l of ler(EVENTS(raiz)).trim().split('\n')) expect(l.length).toBeLessThan(200);
  });
});

describe('motivo é TOKEN grepável, nunca frase', () => {
  const casos: [string, string][] = [
    ['{"desfecho":"reprovado","causa":"enforcement","motivo":"diff fora do pathspec em 3 arquivos"}', 'enforcement'],
    ['{"desfecho":"reprovado","causa":"criterio_qualidade","motivo":"2 critérios falharam"}', 'criterio_qualidade'],
    ['{"desfecho":"adiado","causa":"rate_limit","motivo":"infraestrutura: rate_limit"}', 'rate_limit'],
    ['{"desfecho":"reprovado","causa":"diff_cap","motivo":"diff de 900 linhas"}', 'diff_cap'],
  ];
  it.each(casos)('%s => %s', (veredito, token) => {
    const raiz = criarFixture(FILA);
    const r = bashNoFixture(raiz, `motivo_token '${veredito}'`);
    expect(r.stdout.trim()).toBe(token);
  });

  it('sem causa, o texto vira slug curto sem espaço (ainda grepável)', () => {
    const raiz = criarFixture(FILA);
    const r = bashNoFixture(raiz, `motivo_token '{"motivo":"exit 137 no attempt 2"}'`);
    expect(r.stdout.trim()).toMatch(/^[a-z-]+$/);
    expect(r.stdout.trim()).not.toContain(' ');
  });

  it('veredito ilegível não quebra o evento', () => {
    const raiz = criarFixture(FILA);
    const r = bashNoFixture(raiz, `motivo_token 'lixo{{'`);
    expect(r.stdout.trim()).toBe('desconhecido');
  });
});

// ─── §2 · o evento GATE, com fora_do_pathspec ─────────────────────────────

/** Monta um rundir como o executor deixa e chama event_gate de verdade. */
function eventGate(gatesTxt: string, enfOk: 0 | 1, violacoes: unknown[] = [], falhos = '', total = 3) {
  const raiz = criarFixture(FILA);
  const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
  escrever(join(rundir, 'gates.txt'), gatesTxt);
  escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: enfOk === 1, violations: violacoes }));
  const r = bashNoFixture(
    raiz,
    [
      'export EXECUTOR_SOURCED=1',
      `source "${join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh')}"`,
      'set +e',
      `CRITERIOS_FALHOS='${falhos}'; CRITERIOS_TOTAL=${total}`,
      `event_gate 901 "${rundir}" ${enfOk}`,
    ].join('\n'),
  );
  return { linha: ler(EVENTS(raiz)).trim(), stderr: r.stderr };
}

const VERDE = [
  'ok   limpeza_artefatos       10ms',
  'ok   typecheck_root        1200ms',
  'ok   typecheck_web         3400ms',
  'ok   testes_por_pacote    22000ms [9 pacotes, 711p/0f]',
  'ok   build                 8000ms',
  'VEREDITO: APROVADO',
].join('\n');

describe('evento GATE resume a passagem inteira numa linha', () => {
  it('tudo verde', () => {
    const { linha } = eventGate(VERDE, 1);
    expect(linha).toContain('901 GATE');
    expect(linha).toContain('typecheck=ok');
    expect(linha).toContain('testes=ok');
    expect(linha).toContain('enforcement=ok');
    expect(linha).toContain('criterios=3/3');
    expect(linha).not.toContain('fora_do_pathspec');
  });

  it('gate que reprovou aparece como falha; os que não rodaram, como nao-rodou', () => {
    const txt = [
      'ok   limpeza_artefatos       10ms',
      'ok   typecheck_root        1200ms',
      'FALHA typecheck_web        3400ms — 4 erros acima do baseline',
      'VEREDITO: REPROVADO',
    ].join('\n');
    const { linha } = eventGate(txt, 1, [], 'critério x', 3);
    expect(linha).toContain('typecheck=falha');
    expect(linha).toContain('testes=nao-rodou');
    expect(linha).toContain('build=nao-rodou');
    expect(linha).toContain('criterios=2/3');
  });

  it('enforcement reprovado carrega fora_do_pathspec com os arquivos', () => {
    const { linha } = eventGate(VERDE, 0, [
      { tipo: 'fora_do_pathspec', detalhe: 'test/radar.test.ts' },
      { tipo: 'fora_do_pathspec', detalhe: 'apps/web/src/app/gerar/actions.ts' },
      { tipo: 'zona_proibida', detalhe: '.env.local' },
    ]);
    expect(linha).toContain('enforcement=falha');
    expect(linha).toContain('fora_do_pathspec=test/radar.test.ts,apps/web/src/app/gerar/actions.ts');
    // zona_proibida é outra violação: não entra no campo de colisão de escopo.
    expect(linha).not.toContain('.env.local');
  });

  it('enforcement verde nunca carrega fora_do_pathspec', () => {
    const { linha } = eventGate(VERDE, 1, [{ tipo: 'fora_do_pathspec', detalhe: 'x.ts' }]);
    expect(linha).not.toContain('fora_do_pathspec');
  });
});

// ─── §2 · os call sites existem de verdade ────────────────────────────────

describe('call sites: cada evento mínimo do contrato tem origem no harness', () => {
  const fontes = ['executor.sh', 'local-loop.sh']
    .map((f) => readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', f), 'utf8'))
    .join('\n');

  it.each([
    'DRENAGEM_INICIO',
    'INICIO',
    'GATE',
    'APROVADO',
    'REPROVADO',
    'ADIADO',
    'BLOQUEADO',
    'RECUPERADO',
    'RETRY',
    'DRENAGEM_FIM',
  ])('%s é emitido por event', (ev) => {
    expect(fontes).toMatch(new RegExp(`event[^\\n]*\\b${ev}\\b`));
  });

  it('DRENAGEM_FIM leva placar e duração', () => {
    expect(fontes).toMatch(/DRENAGEM_FIM[^\n]*aprovados=[^\n]*dur=/);
  });

  it('INICIO leva attempt e model', () => {
    expect(fontes).toMatch(/INICIO[^\n]*attempt=[^\n]*model=/);
  });

  it('APROVADO leva merge, dur e attempt', () => {
    expect(fontes).toMatch(/APROVADO[^\n]*merge=[^\n]*dur=[^\n]*attempt=/);
  });

  it('REPROVADO e ADIADO levam motivo=', () => {
    expect(fontes).toMatch(/REPROVADO[^\n]*motivo=/);
    expect(fontes).toMatch(/ADIADO[^\n]*motivo=/);
  });
});
