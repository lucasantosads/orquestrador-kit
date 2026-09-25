/**
 * Ticket 624, caso a caso — o check 10 do gate de ticket (exemplos_regex).
 *
 * Cada caso monta UM ticket pendente numa fila de fixture, roda o gate como o
 * pré-voo roda (`validar`) e compara a lista EXATA de mensagens do campo
 * `criterios_aceite[0].exemplos_regex`: aceito = lista vazia; recusado = as
 * mensagens que o autor do ticket vai ler.
 *
 * Só importa o que o gate já exportava antes do 624 (`lerFila`, `validar`):
 * sem o check 10, o arquivo carrega e os recusados falham por ASSERÇÃO (lista
 * vazia onde se esperava a mensagem), não por import.
 *
 * Casos reais (test/fixtures/gate-regex-casos-reais/criterios.json): dois do
 * conteudos-infinitos e um do actus-saas que o check marca na simulação
 * done-como-pendente, cada um com a versão corrigida que passa. A prova é
 * sempre no /usr/bin/grep e no /usr/bin/awk (nenhum mock do casamento).
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, escreverTicket, REPO_ROOT } from './fixtures/orq-harness.js';
import { lerFila, validar, type GateCfg } from '../scripts/orquestrador/gate-ticket.js';

const GATE_TS = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [] };
const REAIS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-regex-casos-reais', 'criterios.json'), 'utf8'),
) as Record<string, Record<string, unknown>>;

/** O critério de fixture sem as chaves de proveniência (`_de`). */
function real(nome: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const { _de: _, ...c } = REAIS[nome]!;
  return { ...c, ...extra };
}

let seq = 910;

/** Mensagens do check 10 para um ticket com o critério dado como criterios_aceite[0]. */
function check10(criterio: Record<string, unknown>): { msgs: string[]; fx: string; id: string } {
  const fx = criarFixture([]);
  const id = String(seq++);
  escreverTicket(fx, {
    id,
    slug: `regex-${id}`,
    bloco: 'B6',
    risco: 'baixo',
    objetivo: 'fixture do check 10',
    pathspec_allowlist: ['src/nada.ts'],
    criterios_aceite: [criterio, { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' }],
  });
  const fila = lerFila(join(fx, 'docs', 'fila'));
  const msgs = validar(fila.filter((t) => t.arquivo.includes(`/${id}-`)), fila, CFG)
    .filter((v) => v.campo === 'criterios_aceite[0].exemplos_regex')
    .map((v) => v.mensagem);
  return { msgs, fx, id };
}

const crit = (cmd: string, exemplos?: unknown) => ({
  tipo: 'alvo',
  descricao: 'fixture',
  cmd,
  espera: '1',
  ...(exemplos === undefined ? {} : { exemplos_regex: exemplos }),
});

const SEM_EXEMPLO_GREP = 'critério passa regex a grep e não declara exemplos_regex (lista de {regex, positivo, negativo})';
const SEM_EXEMPLO_AWK = 'critério passa regex a awk e não declara exemplos_regex (lista de {regex, positivo, negativo})';

describe('624 · casos reais do conteudos-infinitos', () => {
  it('012[0] (grep -cE no placar do vitest, sem exemplos): RECUSA pela regra 1', () => {
    expect(check10(real('ci_012')).msgs).toEqual([SEM_EXEMPLO_GREP]);
  });

  it('012[0] com exemplos: ACEITA; o negativo é o placar COM falha, que o padrão não casa', () => {
    const exemplos = [
      { regex: 'Tests +[0-9]+ passed', positivo: '      Tests  5 passed (5)', negativo: '      Tests  1 failed | 5 passed (6)' },
    ];
    expect(check10(real('ci_012', { exemplos_regex: exemplos })).msgs).toEqual([]);
  });

  it('015[2] (awk com dois literais /.../, sem exemplos): RECUSA pela regra 1, nomeando awk', () => {
    expect(check10(real('ci_015')).msgs).toEqual([SEM_EXEMPLO_AWK]);
  });

  it('015[2] com UM exemplo só: RECUSA o literal que ficou sem exemplo', () => {
    const exemplos = [
      { regex: 'listarRecentesPaginado', positivo: '  async listarRecentesPaginado(', negativo: '  async listarRecentes(', ferramenta: 'awk' },
    ];
    expect(check10(real('ci_015', { exemplos_regex: exemplos })).msgs).toEqual([
      "padrão '^  }' do cmd (awk) sem exemplo correspondente em exemplos_regex",
    ]);
  });

  it('015[2] com os dois exemplos em awk: ACEITA', () => {
    const exemplos = [
      { regex: 'listarRecentesPaginado', positivo: '  async listarRecentesPaginado(', negativo: '  async listarRecentes(', ferramenta: 'awk' },
      { regex: '^  }', positivo: '  }', negativo: '    }', ferramenta: 'awk' },
    ];
    expect(check10(real('ci_015', { exemplos_regex: exemplos })).msgs).toEqual([]);
  });

  it('002[3] (grep -ciE): sem flags o exemplo é provado com -E e o positivo em maiúsculas NÃO casa; com flags -iE ACEITA', () => {
    const re = "like\\s*'e2e|like\\s*'%e2e";
    const ex = { regex: re, positivo: "where email LIKE 'e2e%'", negativo: 'where id = any($1)' };
    expect(check10(real('ci_002', { exemplos_regex: [ex] })).msgs).toEqual([
      `positivo 'where email LIKE 'e2e%'' NÃO casa '${re}' (grep -E)`,
    ]);
    expect(check10(real('ci_002', { exemplos_regex: [{ ...ex, flags: '-iE' }] })).msgs).toEqual([]);
  });
});

describe('624 · caso real do actus-saas', () => {
  it('631[8] como está no done: RECUSA o primeiro grep -E, que ficou sem exemplo (o segundo tem)', () => {
    expect(check10(real('actus_631')).msgs).toEqual([
      "padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em exemplos_regex",
    ]);
  });

  it('631[8] com o exemplo do primeiro grep acrescentado: ACEITA', () => {
    const exemplos = [
      ...(REAIS.actus_631!.exemplos_regex as unknown[]),
      { regex: '^[+-][^+-]', positivo: '+    "max_retries": 3,', negativo: '+++ b/docs/fila/000-config.json' },
    ];
    expect(check10(real('actus_631', { exemplos_regex: exemplos })).msgs).toEqual([]);
  });

  it('pelo CLI, o 631[8] do done sai com rc 1 e a mensagem', () => {
    const { fx, id } = check10(real('actus_631'));
    const r = spawnSync(TSX, [GATE_TS, '--fila', join(fx, 'docs', 'fila'), id], { encoding: 'utf8' });
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(1);
    expect(`${r.stdout}${r.stderr}`).toContain("padrão '^[+-][^+-]' do cmd (grep) sem exemplo correspondente em exemplos_regex");
  });
});

describe('624 · regras, uma por caso', () => {
  const RE = '(src|scripts)/[A-Za-z0-9_./()-]+:[0-9]+';
  const CMD = `{ grep -cE '${RE}' docs/x.md || true; }`;
  const OK = { regex: RE, positivo: 'src/app/route.ts:68', negativo: 'src/A-]:1' };

  it('aceita: grep -F e grep sem -E não exigem exemplo', () => {
    expect(check10(crit("{ grep -cF 'a|b' f || true; }")).msgs).toEqual([]);
    expect(check10(crit("{ grep -c 'passed' f || true; }")).msgs).toEqual([]);
  });

  it('aceita: exemplo certo para o padrão do cmd', () => {
    expect(check10(crit(CMD, [OK])).msgs).toEqual([]);
  });

  it('recusa (regra 1): lista de exemplos vazia conta como ausente', () => {
    expect(check10(crit(CMD, [])).msgs).toEqual([SEM_EXEMPLO_GREP]);
  });

  it('recusa (regra 2): regex de exemplo que não aparece literal no cmd', () => {
    expect(check10(crit(CMD, [OK, { regex: 'fora', positivo: 'fora', negativo: 'x' }])).msgs).toEqual([
      "regex de exemplo 'fora' não aparece literal no cmd",
    ]);
  });

  it('recusa (regra 3): positivo que não casa', () => {
    expect(check10(crit(CMD, [{ ...OK, positivo: 'app/route.ts:68' }])).msgs).toEqual([
      `positivo 'app/route.ts:68' NÃO casa '${RE}' (grep -E)`,
    ]);
  });

  it('recusa (regra 4): negativo que casa', () => {
    expect(check10(crit(CMD, [{ ...OK, negativo: 'scripts/orq:1' }])).msgs).toEqual([
      `negativo 'scripts/orq:1' CASA '${RE}' (grep -E)`,
    ]);
  });

  it('recusa (regra 5): \\[ \\] dentro de classe, no cmd e no exemplo; e o grep BSD confirma o estrago', () => {
    const velho = '(src|scripts)/[A-Za-z0-9_./\\[\\]()-]+:[0-9]+';
    const cmd = `{ grep -cE '${velho}' docs/x.md || true; }`;
    expect(check10(crit(cmd, [{ ...OK, regex: velho }])).msgs).toEqual([
      `regex '${velho}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`,
      `regex de exemplo '${velho}' tem \\[ ou \\] dentro de classe [...]`,
      `positivo 'src/app/route.ts:68' NÃO casa '${velho}' (grep -E)`,
      `negativo 'src/A-]:1' CASA '${velho}' (grep -E)`,
    ]);
  });

  it('recusa: exemplo malformado, e o padrão fica sem exemplo', () => {
    expect(check10(crit(CMD, [{ regex: RE, positivo: 'src/a.ts:1' }])).msgs).toEqual([
      "exemplos_regex[0] malformado: precisa de regex, positivo, negativo (strings), flags? string, ferramenta? 'grep'|'awk'",
      `padrão '${RE}' do cmd (grep) sem exemplo correspondente em exemplos_regex`,
    ]);
  });

  it('recusa: regex que o /usr/bin/grep rejeita (rc 2) vira violação do ticket', () => {
    const msgs = check10(crit("{ grep -cE 'a(' f || true; }", [{ regex: 'a(', positivo: 'a(', negativo: 'b' }])).msgs;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]).toMatch(/^regex 'a\(' recusada: \/usr\/bin\/grep rc=2: .*parenthes/);
  });
});
