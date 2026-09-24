/**
 * Ticket 624 (harness manual, 24/09/2026) — o pré-voo executa os regex dos
 * critérios contra exemplos declarados no próprio ticket.
 *
 * Causa (auditoria de 22/09/2026): o regex "cita arquivo:linha" do 503 tinha
 * `\[\]` dentro da classe. No grep BSD o `]` fecha a classe e o padrão passa a
 * exigir o literal `-]`: das 15 citações reais do documento o grep contou 0, e
 * o agente fabricou `src/A-]:1` para passar. O shell interativo usa ugrep, que
 * aceita o padrão; a prova é sempre com /usr/bin/grep.
 *
 * Tudo aqui roda o /usr/bin/grep de verdade (nenhum mock do casamento).
 */
import { describe, it, expect } from 'vitest';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, REPO_ROOT } from './fixtures/orq-harness.js';
import {
  checarExemplosRegex,
  classeComColcheteEscapado,
  execRegexPadrao,
  lerFila,
  padroesDoCmd,
  validar,
  type GateCfg,
} from '../scripts/orquestrador/gate-ticket.js';

const GATE_TS = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] };
const EXEC = execRegexPadrao(CFG);

const REGEX_VELHO = '(src|scripts|supabase)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+';
const REGEX_NOVO = '(src|scripts|supabase)/[A-Za-z0-9_./()-]+:[0-9]+';
const POSITIVO_503 = 'src/app/api/comercial/briefing/route.ts:68';
const NEGATIVO_503 = 'src/A-]:1';

const cmdCita = (re: string) => `{ grep -cE '${re}' docs/diagnosticos/x.md || true; }`;

/** Ticket pendente com UM critério mecânico (o do 503) e um avaliador. */
function ticket503(fx: string, id: string, re: string, exemplos?: unknown) {
  escreverTicket(fx, {
    id,
    slug: `cita-${id}`,
    bloco: 'B6',
    risco: 'baixo',
    objetivo: 'escreve docs/diagnosticos/x.md',
    pathspec_allowlist: ['docs/diagnosticos/x.md'],
    criterios_aceite: [
      {
        tipo: 'alvo',
        descricao: 'cita arquivo:linha',
        cmd: cmdCita(re),
        espera: '^[1-9]',
        ...(exemplos === undefined ? {} : { exemplos_regex: exemplos }),
      },
      { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
    ],
  });
}

function gateCli(fx: string, ...args: string[]) {
  const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fila'), ...args], {
    encoding: 'utf8',
    env: { ...process.env },
  });
  return { rc: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

const doTicket = (fx: string, id: string) => {
  const fila = lerFila(join(fx, 'docs', 'fila'));
  return validar(fila.filter((t) => t.arquivo.includes(`/${id}-`)), fila, CFG);
};

describe('624 · o critério "cita arquivo:linha" do 503', () => {
  it('(a) regex VELHO (classe com \\[\\]) com os exemplos do 503 REPROVA pela regra 5 e pela regra 3', () => {
    const fx = criarFixture([]);
    ticket503(fx, '903', REGEX_VELHO, [{ regex: REGEX_VELHO, positivo: POSITIVO_503, negativo: NEGATIVO_503 }]);
    const v = doTicket(fx, '903').map((x) => x.mensagem);
    expect(v.some((m) => /dentro de classe/.test(m))).toBe(true);
    expect(v.some((m) => m.includes(`positivo '${POSITIVO_503}' NÃO casa`))).toBe(true);
    // e o negativo fabricado CASA com o regex velho no grep BSD: é o bug
    expect(v.some((m) => m.includes(`negativo '${NEGATIVO_503}' CASA`))).toBe(true);
    const cli = gateCli(fx, '903');
    expect(cli.rc, cli.out).toBe(1);
  });

  it('(b) regex NOVO com os mesmos exemplos PASSA: zero violações e o ticket no relatório como OK', () => {
    const fx = criarFixture([]);
    ticket503(fx, '904', REGEX_NOVO, [{ regex: REGEX_NOVO, positivo: POSITIVO_503, negativo: NEGATIVO_503 }]);
    expect(doTicket(fx, '904')).toEqual([]);
    const rel = gateCli(fx, '--relatorio', '904');
    expect(rel.rc, rel.out).toBe(0);
    expect(rel.out).toMatch(/^904-cita-904\.md {2}OK$/m);
    expect(rel.out).toContain('TOTAL: 0 violação(ões)');
    const cli = gateCli(fx, '904');
    expect(cli.rc, cli.out).toBe(0);
  });

  it('(c) critério com grep -cE e SEM exemplos_regex reprova (regra 1)', () => {
    const fx = criarFixture([]);
    ticket503(fx, '905', REGEX_NOVO);
    const v = doTicket(fx, '905');
    expect(v.some((x) => x.campo === 'criterios_aceite[0].exemplos_regex' && /não declara exemplos_regex/.test(x.mensagem))).toBe(true);
  });

  it('(d) negativo que CASA reprova (regra 4), e o positivo que casa não gera violação', () => {
    const fx = criarFixture([]);
    ticket503(fx, '906', REGEX_NOVO, [{ regex: REGEX_NOVO, positivo: POSITIVO_503, negativo: 'scripts/orq:1' }]);
    const v = doTicket(fx, '906').map((x) => x.mensagem);
    expect(v).toEqual([`negativo 'scripts/orq:1' CASA '${REGEX_NOVO}' (grep -E)`]);
  });

  it('regra 2: regex de exemplo que não aparece literal no cmd reprova', () => {
    const fx = criarFixture([]);
    ticket503(fx, '907', REGEX_NOVO, [
      { regex: REGEX_NOVO, positivo: POSITIVO_503, negativo: NEGATIVO_503 },
      { regex: 'nao-esta-no-cmd', positivo: 'nao-esta-no-cmd', negativo: 'x' },
    ]);
    expect(doTicket(fx, '907').some((x) => /não aparece literal no cmd/.test(x.mensagem))).toBe(true);
  });
});

describe('624 · quais comandos exigem exemplo', () => {
  it('(e) grep -F e grep -c sem -E não exigem exemplo', () => {
    expect(padroesDoCmd("{ grep -cF 'a|b' f || true; }")).toEqual([]);
    expect(padroesDoCmd("{ grep -c 'passed' f || true; }")).toEqual([]);
    expect(checarExemplosRegex("{ grep -cF 'a|b' f || true; }", undefined, EXEC)).toEqual([]);
    expect(checarExemplosRegex("{ grep -c 'passed' f || true; }", undefined, EXEC)).toEqual([]);
  });

  it('grep -vcE, -ciE, egrep e -e com -E exigem; o padrão é o da linha de comando depois das aspas', () => {
    expect(padroesDoCmd("{ git diff | grep -vcE '^a\\.ts$|^b\\.ts$' || true; }")).toEqual([{ ferramenta: 'grep', regex: '^a\\.ts$|^b\\.ts$' }]);
    expect(padroesDoCmd("grep -ciE 'x+' f")).toEqual([{ ferramenta: 'grep', regex: 'x+' }]);
    expect(padroesDoCmd("egrep 'x|y' f")).toEqual([{ ferramenta: 'grep', regex: 'x|y' }]);
    expect(padroesDoCmd("grep -E -e 'p1' -e 'p2' f")).toEqual([
      { ferramenta: 'grep', regex: 'p1' },
      { ferramenta: 'grep', regex: 'p2' },
    ]);
    expect(padroesDoCmd('grep -cE "\'aspas\'" f')).toEqual([{ ferramenta: 'grep', regex: "'aspas'" }]);
  });

  it('awk: os literais /.../ do programa são padrões', () => {
    expect(padroesDoCmd("awk '/^A$/{a=NR} /^B:$/{b=NR} END{print a}' f")).toEqual([
      { ferramenta: 'awk', regex: '^A$' },
      { ferramenta: 'awk', regex: '^B:$' },
    ]);
    const cmd = "awk '/^ENTREGA:$/{c=NR} END{print c}' f";
    expect(checarExemplosRegex(cmd, [{ regex: '^ENTREGA:$', positivo: 'ENTREGA:', negativo: 'ENTREGA: x', ferramenta: 'awk' }], EXEC)).toEqual([]);
    expect(
      checarExemplosRegex(cmd, [{ regex: '^ENTREGA:$', positivo: 'ENTREGA: x', negativo: 'ENTREGA:', ferramenta: 'awk' }], EXEC).length,
    ).toBe(2);
  });

  it('classe POSIX [[:space:]] não conta como colchete escapado', () => {
    expect(classeComColcheteEscapado('^[[:space:]]*(//|/?\\*)')).toBe(false);
    expect(classeComColcheteEscapado(REGEX_VELHO)).toBe(true);
    expect(classeComColcheteEscapado('a\\[b\\]')).toBe(false);
  });
});

describe('624 · falha alta', () => {
  it('(f) /usr/bin/grep ausente: o gate NÃO passa, sai com rc 2 dizendo o binário', () => {
    const fx = criarFixture([]);
    ticket503(fx, '908', REGEX_NOVO, [{ regex: REGEX_NOVO, positivo: POSITIVO_503, negativo: NEGATIVO_503 }]);
    const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fila'), '908'], {
      encoding: 'utf8',
      env: { ...process.env, GATE_TICKET_GREP: '/nao/existe/grep' },
    });
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(2);
    expect(r.stderr).toContain('/nao/existe/grep ausente');
    // controle: com o grep real, o mesmo ticket passa
    expect(gateCli(fx, '908').rc).toBe(0);
  });

  it('regex que o grep recusa vira violação do ticket, não falha do gate', () => {
    const msgs = checarExemplosRegex("{ grep -cE 'a(' f || true; }", [{ regex: 'a(', positivo: 'a(', negativo: 'b' }], EXEC);
    expect(msgs.some((m) => /recusada: .*rc=2/.test(m))).toBe(true);
  });
});
