/**
 * Peça 5 — custo e orçamento (regra 17: orçamento é GATE, não relatório).
 *
 * Dois compromissos que o teste cobra ao mesmo tempo e que puxam para lados
 * opostos: o gate PARA o gasto quando o teto é atingido, e a contabilidade
 * NUNCA bloqueia um ticket quando o usage vem ilegível. Custo é medição; barrar
 * entrega por falha de medição troca um problema por outro pior.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { bashComLog, bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const custoFile = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'custo.json');
const runs = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);
const CFG = JSON.parse(readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8'));
const HOJE = new Date().toISOString().slice(0, 10);

const FILA = [{ id: '901', slug: 'da-vez', status: 'pendente' }, { id: '902', slug: 'depois', status: 'pendente' }];

/** Saída do `claude -p --output-format json` como ela CHEGA ao harness. */
const SAIDA_JSON = JSON.stringify({
  type: 'result',
  is_error: false,
  result: 'ok',
  total_cost_usd: 0.4212,
  usage: { input_tokens: 1200, output_tokens: 340, cache_read_input_tokens: 18000, cache_creation_input_tokens: 900 },
});

function registrar(raiz: string, saida: string, papel = 'executor', ticket = '901', attempt = 0) {
  escrever(runs(raiz, 'saida.json'), saida);
  return bashComLog(raiz, `custo_registrar ${papel} ${ticket} ${attempt} "${runs(raiz, 'saida.json')}"`);
}

function comCusto(raiz: string, registros: unknown[], dia = HOJE) {
  escrever(custoFile(raiz), JSON.stringify({ dias: { [dia]: registros } }));
}

// ─── Contabilidade ────────────────────────────────────────────────────────

describe('custo_registrar grava o consumo real da chamada', () => {
  it('acrescenta em dias.<AAAA-MM-DD>[] com os campos do contrato', () => {
    const raiz = criarFixture(FILA);
    registrar(raiz, SAIDA_JSON);
    const j = JSON.parse(ler(custoFile(raiz)));
    expect(Object.keys(j.dias)).toEqual([HOJE]);
    expect(j.dias[HOJE]).toHaveLength(1);
    expect(j.dias[HOJE][0]).toEqual({
      data: HOJE,
      papel: 'executor',
      ticket: '901',
      attempt: 0,
      tokens_in: 1200,
      tokens_out: 340,
      tokens_cache: 18000,
      custo_usd: 0.4212,
    });
  });

  it('os NOMES dos campos vêm do config, não do código', () => {
    expect(CFG.orcamento.campos_usage).toEqual({
      custo_usd: 'total_cost_usd',
      tokens_in: 'usage.input_tokens',
      tokens_out: 'usage.output_tokens',
      tokens_cache: 'usage.cache_read_input_tokens',
    });
    const lib = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh'), 'utf8');
    expect(lib).toContain(".orcamento.campos_usage.custo_usd");
    // nenhum nome de campo do CLI hardcoded no shell:
    expect(lib).not.toContain('total_cost_usd');
    expect(lib).not.toContain('cache_read_input_tokens');
  });

  it('duas chamadas somam no mesmo dia, uma linha cada', () => {
    const raiz = criarFixture(FILA);
    registrar(raiz, SAIDA_JSON, 'executor', '901', 0);
    registrar(raiz, SAIDA_JSON, 'executor', '901', 1);
    expect(JSON.parse(ler(custoFile(raiz))).dias[HOJE]).toHaveLength(2);
  });

  it('papel e ticket distinguem as chamadas (é o que o orq custo agrega)', () => {
    const raiz = criarFixture(FILA);
    registrar(raiz, SAIDA_JSON, 'executor', '901');
    registrar(raiz, SAIDA_JSON, 'probe', '---');
    const r = JSON.parse(ler(custoFile(raiz))).dias[HOJE];
    expect(r.map((x: { papel: string }) => x.papel)).toEqual(['executor', 'probe']);
  });

  it('pega o ÚLTIMO objeto JSON: o arquivo carrega stdout + stderr, não só JSON', () => {
    const raiz = criarFixture(FILA);
    registrar(raiz, `aviso solto do CLI\n${SAIDA_JSON}\n`);
    expect(JSON.parse(ler(custoFile(raiz))).dias[HOJE][0].custo_usd).toBe(0.4212);
  });
});

describe('falha de contabilidade NUNCA bloqueia o ticket', () => {
  it('usage ilegível: loga e segue com rc 0', () => {
    const raiz = criarFixture(FILA);
    const r = registrar(raiz, 'API Error: alguma coisa\nsem json nenhum\n');
    expect(r.rc).toBe(0);
    expect(r.saida).toMatch(/usage ilegível/);
  });

  it('saída vazia: loga e segue com rc 0', () => {
    const raiz = criarFixture(FILA);
    const r = registrar(raiz, '');
    expect(r.rc).toBe(0);
    expect(r.saida).toMatch(/sem usage para registrar/);
  });

  it('campos ausentes viram 0, não quebram o arquivo', () => {
    const raiz = criarFixture(FILA);
    registrar(raiz, JSON.stringify({ type: 'result', result: 'ok' }));
    expect(JSON.parse(ler(custoFile(raiz))).dias[HOJE][0]).toMatchObject({
      custo_usd: 0,
      tokens_in: 0,
      tokens_out: 0,
      tokens_cache: 0,
    });
  });
});

// ─── O gate ───────────────────────────────────────────────────────────────

function veredito(raiz: string, id = '901') {
  return bashNoFixture(raiz, `orcamento_veredito ${id}`).stdout.trim();
}

/** Veredito + o que o `log` escreveu (stderr), para provar o aviso do fail-open. */
function vereditoComAviso(raiz: string, id = '901') {
  const r = bashNoFixture(raiz, `orcamento_veredito ${id}`);
  return { veredito: r.stdout.trim(), log: r.stderr };
}

describe('orcamento_veredito: ok | dia | ticket', () => {
  it('sem consumo, ok', () => {
    expect(veredito(criarFixture(FILA))).toBe('ok');
  });

  it('abaixo dos tetos, ok', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '901', custo_usd: 1, tokens_in: 10, tokens_out: 10 }]);
    expect(veredito(raiz)).toBe('ok');
  });

  it('teto de USD/dia atingido => dia', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: CFG.orcamento.usd_dia, tokens_in: 1, tokens_out: 1 }]);
    expect(veredito(raiz)).toBe('dia');
  });

  it('teto de tokens/dia atingido => dia (mesmo com USD baixo)', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: 0.1, tokens_in: CFG.orcamento.tokens_dia, tokens_out: 0 }]);
    expect(veredito(raiz)).toBe('dia');
  });

  it('teto por ticket atingido => ticket (e só para ESSE ticket)', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '901', custo_usd: CFG.orcamento.usd_ticket, tokens_in: 1, tokens_out: 1 }]);
    expect(veredito(raiz, '901')).toBe('ticket');
    expect(veredito(raiz, '902')).toBe('ok');
  });

  it('consumo de ONTEM não conta hoje', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '901', custo_usd: 999, tokens_in: 1, tokens_out: 1 }], '2020-01-01');
    expect(veredito(raiz)).toBe('ok');
  });

  it('custo.json corrompido não vira "dia" acidental (custo não bloqueia)', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), 'não é json');
    expect(veredito(raiz)).toBe('ok');
  });
});

// ─── Fail-open do ledger ──────────────────────────────────────────────────
//
// O gate de orçamento é a única coisa no harness que pode PARAR a fila por
// conta própria. Por isso o ledger tem a política inversa da do gate: qualquer
// coisa que impeça de ler o consumo devolve "ok" e deixa passar. Barrar a
// entrega porque a contabilidade quebrou troca um problema de medição por um
// problema de entrega — e um teto que não pode ser calculado não é um teto
// atingido.
//
// O aviso no log é metade da regra, não enfeite: "ok" silencioso de arquivo
// ilegível é indistinguível de "ok" de consumo zero, e é assim que um teto
// deixa de valer por semanas sem ninguém notar.
describe('ledger ilegível nunca para a fila (fail-open com aviso)', () => {
  it('arquivo AUSENTE => ok, com aviso no log', () => {
    const raiz = criarFixture(FILA);
    expect(existsSync(custoFile(raiz))).toBe(false); // o fixture nasce sem ledger
    const r = vereditoComAviso(raiz);
    expect(r.veredito).toBe('ok');
    expect(r.log).toMatch(/orçamento: sem ledger legível/);
    expect(r.log).toMatch(/fail-open/);
  });

  it('arquivo VAZIO (0 byte) => ok, com aviso no log', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), '');
    const r = vereditoComAviso(raiz);
    expect(r.veredito).toBe('ok');
    expect(r.log).toMatch(/sem ledger legível/);
  });

  it('arquivo CORROMPIDO => ok, com aviso no log', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), 'não é json {{{');
    const r = vereditoComAviso(raiz);
    expect(r.veredito).toBe('ok');
    expect(r.log).toMatch(/ledger ilegível/);
    expect(r.log).toMatch(/fail-open/);
  });

  it('JSON VÁLIDO com a forma errada => ok, com aviso (jq quebra, o gate não)', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), JSON.stringify({ dias: 42 }));
    const r = vereditoComAviso(raiz);
    expect(r.veredito).toBe('ok');
    expect(r.log).toMatch(/ledger ilegível/);
  });

  it('truncado no meio da escrita => ok, sem "dia" acidental', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), '{"dias":{"' + HOJE + '":[{"custo_usd":99');
    expect(vereditoComAviso(raiz).veredito).toBe('ok');
  });

  it('o aviso sai no LOG (stderr), nunca no stdout: o veredito é uma palavra só', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), 'não é json');
    const r = bashNoFixture(raiz, `orcamento_veredito 901`);
    expect(r.stdout.trim().split('\n')).toEqual(['ok']);
  });

  it('a DRENAGEM segue com ledger corrompido: o executor é chamado', () => {
    const raiz = criarFixture(FILA);
    escrever(custoFile(raiz), 'não é json');
    const r = drenarComStub(raiz);
    expect(r.saida).toContain('EXECUTOR CHAMADO');
    expect(r.saida).not.toMatch(/teto diário atingido/);
  });

  it('a DRENAGEM segue sem ledger nenhum: o executor é chamado', () => {
    const raiz = criarFixture(FILA);
    const r = drenarComStub(raiz);
    expect(r.saida).toContain('EXECUTOR CHAMADO');
  });

  it('fail-open NÃO é fail-always: ledger legível acima do teto ainda para', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: CFG.orcamento.usd_dia, tokens_in: 1, tokens_out: 1 }]);
    expect(veredito(raiz)).toBe('dia');
  });
});

describe('mark_adiado_orcamento: adiado, não reprovado', () => {
  const amanha = () => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  };

  it('volta a pendente com adiado_ate = próximo dia', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'ticket_commit() { return 0; }\nmark_adiado_orcamento "$(ticket_file_by_id 901)" dia');
    const t = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(ler(join(raiz, 'docs', 'fila', '901-da-vez.md')))![1]!);
    expect(t.status).toBe('pendente');
    expect(t.adiado_ate).toBe(amanha());
    expect(t.notas_status).toMatch(/^orcamento —/);
  });

  it('escopo ticket grava a nota orcamento_ticket', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'ticket_commit() { return 0; }\nmark_adiado_orcamento "$(ticket_file_by_id 901)" ticket');
    const t = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(ler(join(raiz, 'docs', 'fila', '901-da-vez.md')))![1]!);
    expect(t.notas_status).toMatch(/^orcamento_ticket —/);
  });

  it('emite o evento ORCAMENTO com escopo e consumo', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '901', custo_usd: 51, tokens_in: 10, tokens_out: 5 }]);
    bashNoFixture(raiz, 'ticket_commit() { return 0; }\nmark_adiado_orcamento "$(ticket_file_by_id 901)" dia');
    const ev = ler(runs(raiz, 'events.log'));
    expect(ev).toMatch(/901 ORCAMENTO escopo=dia adiado_ate=\d{4}-\d{2}-\d{2} consumo=US\$ 51/);
  });

  it('ticket adiado até amanhã não é processável hoje', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'ticket_commit() { return 0; }\nmark_adiado_orcamento "$(ticket_file_by_id 901)" dia');
    const r = bashComLog(raiz, 'printf "PROX=%s\\n" "$(basename "$(proximo_pendente)")"');
    expect(r.saida).toContain('PROX=902-depois.md');
  });

  it('adiamento vencido volta a ser processável (não é bloqueio permanente)', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente', adiado_ate: '2020-01-01' }]);
    const r = bashComLog(raiz, 'printf "PROX=%s\\n" "$(basename "$(proximo_pendente)")"');
    expect(r.saida).toContain('PROX=901-da-vez.md');
  });
});

// ─── O gate no fluxo da drenagem ──────────────────────────────────────────

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');

function drenarComStub(raiz: string) {
  const r = spawnSync(
    'bash',
    [
      '-c',
      [
        'export LOCAL_LOOP_SOURCED=1',
        `source "${LOOP}"`,
        'set +e',
        'ensure_staging_worktree() { echo "/tmp"; }',
        'ticket_commit() { return 0; }',
        'run_executor_once() { echo "EXECUTOR CHAMADO" >&2; return 0; }',
        'drenar',
      ].join('\n'),
    ],
    { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
  );
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento', () => {
  it('o executor nunca é chamado', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: 60, tokens_in: 1, tokens_out: 1 }]);
    const r = drenarComStub(raiz);
    expect(r.saida).toMatch(/teto diário atingido/);
    expect(r.saida).not.toContain('EXECUTOR CHAMADO');
  });

  it('STATUS.md fica ocioso com MOTIVO orcamento', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: 60, tokens_in: 1, tokens_out: 1 }]);
    drenarComStub(raiz);
    const md = ler(runs(raiz, 'STATUS.md'));
    expect(md).toContain('ESTADO   ocioso');
    expect(md).toContain('MOTIVO   orcamento');
  });

  it('o ticket fica adiado, sem consumir tentativa, e a trilha registra', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '902', custo_usd: 60, tokens_in: 1, tokens_out: 1 }]);
    drenarComStub(raiz);
    const t = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(ler(join(raiz, 'docs', 'fila', '901-da-vez.md')))![1]!);
    expect(t.status).toBe('pendente');
    expect(t.adiado_ate).toBeTruthy();
    const ev = ler(runs(raiz, 'events.log'));
    expect(ev).toMatch(/ORCAMENTO escopo=dia/);
    expect(ev).toMatch(/DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1/);
  });
});

describe('teto por TICKET adia só aquele ticket e a fila segue', () => {
  it('adia o 901 por orcamento_ticket e passa ao 902', () => {
    const raiz = criarFixture(FILA);
    comCusto(raiz, [{ papel: 'executor', ticket: '901', custo_usd: CFG.orcamento.usd_ticket, tokens_in: 1, tokens_out: 1 }]);
    const r = drenarComStub(raiz);
    expect(r.saida).toMatch(/já consumiu o teto por ticket/);
    expect(r.saida).toContain('EXECUTOR CHAMADO');
    const t901 = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(ler(join(raiz, 'docs', 'fila', '901-da-vez.md')))![1]!);
    expect(t901.notas_status).toMatch(/^orcamento_ticket/);
  });
});

// ─── A chamada paga ───────────────────────────────────────────────────────

describe('toda chamada ao claude -p é medida e gateada', () => {
  const exec = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh'), 'utf8');

  it('nenhuma chamada usa mais --output-format text', () => {
    expect(exec).not.toContain('--output-format text');
  });

  // Passou de 2 para 3 com o JUIZ (peça 1 da sessão B). Esta contagem é o que
  // impede o custo de um papel novo de escapar do gate de orçamento — o único
  // freio de gasto do loop. Papel novo que chame o modelo entra AQUI junto.
  it('as três chamadas (agente, sondagem e juiz) usam json', () => {
    expect(exec.match(/--output-format json/g) ?? []).toHaveLength(3);
  });

  it('cada chamada é seguida de custo_registrar', () => {
    expect(exec.match(/custo_registrar/g) ?? []).toHaveLength(3);
    expect(exec).toMatch(/--output-format json[\s\S]{0,400}?custo_registrar executor/);
    expect(exec).toMatch(/--output-format json[\s\S]{0,400}?custo_registrar probe/);
    expect(exec).toMatch(/--output-format json[\s\S]{0,400}?custo_registrar juiz/);
  });

  it('o gate roda ANTES da worktree e antes da sondagem', () => {
    // Ordem provada por POSIÇÃO dentro do laço de retry, não por janela de
    // caracteres: a janela de 600 quebrou na peça 0b só porque entraram
    // comentários entre as duas linhas — distância em bytes nunca foi a regra,
    // "o gate vem antes" é.
    const laco = /while :; do[\s\S]*?\n  done/.exec(exec)![0];
    expect(laco.indexOf('orcamento_veredito')).toBeGreaterThanOrEqual(0);
    expect(laco.indexOf('setup_worktree')).toBeGreaterThan(laco.indexOf('orcamento_veredito'));
    expect(exec).toMatch(/orcamento_veredito '---'[\s\S]{0,400}?claude_run/);
  });

  it('o diff continua vindo do git, não do stdout do agente', () => {
    expect(exec).toMatch(/DIFF_LINES="\$\(git -C "\$wt" diff/);
  });
});
