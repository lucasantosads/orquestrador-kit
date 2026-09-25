/**
 * Etapa 7d-1b, peça 3 — as correções de regra, cada uma com o caso REAL do
 * corpus (`test/fixtures/gate-corpus-7d1/casos.json`) que ela marcava como
 * falso positivo, e o caso que ela ainda precisa pegar.
 *
 * O caso real roda como no corpus: status forçado a `pendente`, a fila no
 * instante T reduzida ao contexto dos checks 7 e 8, config do template.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { carregarCfg, lerFila, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';

interface Caso {
  grupo: 'a' | 'b';
  repo: string;
  id: string;
  arquivo: string;
  ticket: Record<string, unknown>;
  fila: Record<string, unknown>[];
}

const CASOS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1', 'casos.json'), 'utf8'),
) as Caso[];
const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));

function caso(repo: string, id: string): Caso {
  const c = CASOS.find((x) => x.repo === repo && x.id === id);
  if (!c) throw new Error(`caso ${repo} ${id} não está no corpus`);
  return c;
}

/** Os achados do gate no caso real, com um ajuste opcional no ticket. */
function rodar(repo: string, id: string, ajuste: (t: Record<string, unknown>) => void = () => {}): Violacao[] {
  const c = caso(repo, id);
  const t = structuredClone({ ...c.ticket, status: 'pendente' });
  ajuste(t);
  const dir = `/corpus-7d1/${c.repo}`;
  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: t };
  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
  fila.push(alvo);
  return validarTicket(alvo, fila, CFG);
}

const erros = (v: Violacao[]) => v.filter((x) => !x.aviso && !x.isencao);
const daRegra = (v: Violacao[], regra: string) => v.filter((x) => (x as Violacao & { regra?: string }).regra === regra);

describe('7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria', () => {
  it('CI 015 (done sem risco nem bloco) não é violação de campo obrigatório', () => {
    const t = caso('CI', '015').ticket;
    expect(t.risco).toBeUndefined();
    expect(erros(rodar('CI', '015')).filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo)).toEqual([]);
  });

  it('Comarka 003 e Actus 110 (os 557 e 48 FP da calibração) idem', () => {
    for (const [r, id] of [['Comarka', '003'], ['Actus', '110']] as const) {
      expect(erros(rodar(r, id)).filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo), `${r} ${id}`).toEqual([]);
    }
  });

  it('o que o executor lê segue ERRO: sem objetivo, sem allowlist, sem slug', () => {
    const v = erros(rodar('CI', '015', (t) => {
      delete t.objetivo;
      t.pathspec_allowlist = [];
      delete t.slug;
    }));
    expect(v.filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo).sort()).toEqual([
      'objetivo',
      'pathspec_allowlist',
      'slug',
    ]);
  });

  it('risco presente com lixo segue violação', () => {
    expect(erros(rodar('CI', '015', (t) => (t.risco = 'medio'))).some((x) => /'medio' não é classe de risco/.test(x.mensagem))).toBe(true);
  });

  it('Comarka 346a (done sem criterios_aceite): regra 2c, AVISO — o executor roda ticket sem critério', () => {
    const v = rodar('Comarka', '346a-lib-periodo-compartilhada');
    expect(erros(v).filter((x) => x.campo === 'criterios_aceite')).toEqual([]);
    expect(daRegra(v, '2c').map((x) => [x.campo, x.aviso])).toEqual([['criterios_aceite', true]]);
  });
});

describe('7d1b-3 · check 3: id com sufixo de fatiamento (407a0, 315b1b)', () => {
  it('Comarka 407a0 (bloqueado por spec) e 062a1 (done): o id é válido e bate com o arquivo', () => {
    for (const id of ['407a0', '062a1', '315b1b']) {
      expect(daRegra(rodar('Comarka', id), '3').map((x) => x.mensagem), id).toEqual([]);
    }
    expect(caso('Comarka', '407a0').arquivo).toMatch(/^407a0-/);
  });

  it('a fila lê o arquivo 407a0-*.md (senão o check 7 não acha a dependência)', () => {
    const dir = mkdtempSync(join(tmpdir(), 'orq-id-'));
    writeFileSync(join(dir, '407a0-x.md'), '# 407a0\n\n```json\n{"id": "407a0"}\n```\n');
    expect(lerFila(dir).map((f) => f.json?.id)).toEqual(['407a0']);
  });

  it('id torto segue acusado: 9z1, e o 346a-lib-periodo-compartilhada (slug colado no id)', () => {
    expect(daRegra(rodar('Comarka', '407a0', (t) => (t.id = '9z1')), '3').length).toBeGreaterThan(0);
    expect(daRegra(rodar('Comarka', '346a-lib-periodo-compartilhada'), '3').map((x) => x.campo)).toContain('id');
  });
});

describe('7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critério avaliador', () => {
  it('Actus 110 e Comarka 003 (critérios sem tipo): nenhum achado de tipo', () => {
    for (const [r, id] of [['Actus', '110'], ['Comarka', '003']] as const) {
      expect(daRegra(rodar(r, id), '5t').map((x) => x.mensagem), `${r} ${id}`).toEqual([]);
    }
  });

  it('Comarka 296b (espera "avaliador" sem cmd, o critério qualitativo): nenhum achado de cmd vazio', () => {
    const t = caso('Comarka', '296b').ticket;
    const crs = t.criterios_aceite as Record<string, unknown>[];
    expect(crs.some((c) => c.espera === 'avaliador' && !c.cmd)).toBe(true);
    expect(daRegra(rodar('Comarka', '296b'), '5c').map((x) => x.campo)).toEqual([]);
  });

  it('tipo PRESENTE fora do vocabulário segue ERRO', () => {
    const v = rodar('Comarka', '003', (t) => ((t.criterios_aceite as Record<string, unknown>[])[0]!.tipo = 'smoke'));
    expect(erros(daRegra(v, '5t')).map((x) => x.mensagem)).toEqual(["tipo 'smoke' inválido (alvo, guarda, avaliador)"]);
  });

  it('cmd vazio em critério que o executor RODA (espera que não é avaliador) segue ERRO', () => {
    const v = rodar('Comarka', '296b', (t) => {
      const c = (t.criterios_aceite as Record<string, unknown>[]).find((x) => x.espera === 'avaliador')!;
      c.espera = 'ok';
    });
    expect(erros(daRegra(v, '5c')).map((x) => x.mensagem)).toContain('cmd vazio');
  });
});

describe('7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo', () => {
  // Os 8 da calibração (0/8/0) mais o 530, que a primeira versão da correção
  // marcava (exemplo para um grep sem -E).
  const CASOS_10X = ['471', '471b', '471c', '508', '509', '510b', '512b', '528', '530'];

  it('os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x', () => {
    for (const id of CASOS_10X) {
      expect(daRegra(rodar('Actus', id), '10x').map((x) => `${x.campo} ${x.mensagem}`), id).toEqual([]);
    }
  });

  it("510b[5]: o exemplo com \\\"perdida\\\" é o padrão depois das aspas resolvidas, e é aceito", () => {
    const cr = (caso('Actus', '510b').ticket.criterios_aceite as Record<string, unknown>[])[5]!;
    expect(String(cr.cmd)).toContain('\\"perdida\\"');
    expect(daRegra(rodar('Actus', '510b'), '10x').filter((x) => x.campo === 'criterios_aceite[5].exemplos_regex')).toEqual([]);
  });

  it('exemplo que não é padrão do cmd segue ERRO (a regra 2 do 624 continua valendo)', () => {
    const v = rodar('Actus', '510b', (t) => {
      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
      (cr.exemplos_regex as Record<string, unknown>[]).push({ regex: 'nao-esta-no-cmd', positivo: 'nao-esta-no-cmd', negativo: 'x' });
    });
    expect(erros(daRegra(v, '10x')).map((x) => x.mensagem)).toEqual([
      "regex de exemplo 'nao-esta-no-cmd' não é padrão que o cmd passa ao grep/awk (compare com o padrão já com as aspas resolvidas pelo shell)",
    ]);
  });

  it('padrão do grep -v sem exemplo é dispensado; padrão POSITIVO sem exemplo segue acusado', () => {
    const doCriterio1 = (v: Violacao[]) =>
      daRegra(v, '10x').filter((x) => x.campo === 'criterios_aceite[1].exemplos_regex').map((x) => x.mensagem);
    const soPositivo = rodar('Actus', '510b', (t) => {
      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
      cr.exemplos_regex = [{ regex: 'em_conversa_apagada', positivo: 'em_conversa_apagada: {}', negativo: 'x' }];
    });
    expect(doCriterio1(soPositivo)).toEqual([]);
    const soExclusao = rodar('Actus', '510b', (t) => {
      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
      cr.exemplos_regex = [{ regex: '^[[:space:]]*(//|/?\\*)', positivo: '// x', negativo: 'x' }];
    });
    expect(doCriterio1(soExclusao)).toEqual([
      "padrão 'em_conversa_apagada' do cmd (grep) sem exemplo correspondente em exemplos_regex",
    ]);
  });
});

describe('7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do redirecionamento', () => {
  it('Comarka 202 e Actus 418 (npm run build > /tmp/build_<id>.log): nenhum achado 6r', () => {
    for (const [r, id] of [['Comarka', '202'], ['Actus', '418']] as const) {
      expect(daRegra(rodar(r, id), '6r').map((x) => x.mensagem), `${r} ${id}`).toEqual([]);
    }
  });

  it("Comarka 543 (`2>/dev/null)` dentro de `$( )`): o alvo é /dev/null, não '/dev/null)'", () => {
    expect(daRegra(rodar('Comarka', '543'), '6r').map((x) => x.mensagem)).toEqual([]);
    expect(daRegra(rodar('Comarka', '522'), '6r').map((x) => x.mensagem)).toEqual([]);
  });

  it('Comarka 615 (`git show <sha>:"$f" > "$f"`, sobrescreve arquivo do repo) segue acusado', () => {
    expect(daRegra(rodar('Comarka', '615'), '6r').length).toBeGreaterThan(0);
  });

  it('redirecionamento para arquivo da worktree segue acusado, dentro ou fora de $( )', () => {
    const v = rodar('Comarka', '202', (t) => {
      const cr = t.criterios_aceite as Record<string, unknown>[];
      cr.push({ tipo: 'alvo', descricao: 'x', cmd: 'npm run build > build.log 2>&1 && echo ok', espera: 'ok' });
      cr.push({ tipo: 'alvo', descricao: 'y', cmd: 'n=$(grep -c x src/a.ts 2>erro.txt); echo $n', espera: '1' });
    });
    expect(daRegra(v, '6r').map((x) => x.mensagem.split(' — ')[0])).toEqual([
      "redirecionamento '>build.log' escreve arquivo (só 2>&1, >/dev/null, 2>/dev/null e /tmp/* passam)",
      "redirecionamento '2>erro.txt' escreve arquivo (só 2>&1, >/dev/null, 2>/dev/null e /tmp/* passam)",
    ]);
  });
});

describe('7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha', () => {
  const doCriterio = (v: Violacao[], i: number) => daRegra(v, '6v').filter((x) => x.campo === `criterios_aceite[${i}]`);

  it("CI 015[6] (`grep -E 'Tests +[0-9]+ passed'`, espera passed): só casa sem falha, nenhum achado", () => {
    expect(String((caso('CI', '015').ticket.criterios_aceite as Record<string, unknown>[])[6]!.cmd)).toMatch(/Tests \+\[0-9\]\+ pa/);
    expect(doCriterio(rodar('CI', '015'), 6)).toEqual([]);
  });

  it("Comarka 057[2] (`grep -c 'failed'`, espera 0): leitura equivalente ao rc, nenhum achado", () => {
    expect(doCriterio(rodar('Comarka', '057'), 2)).toEqual([]);
  });

  it('Actus 620 (grep em vitest.config.ts): não é o comando vitest', () => {
    expect(daRegra(rodar('Actus', '620'), '6v')).toEqual([]);
  });

  it("Actus 001[1] (`grep -E 'passed|failed'`, espera passed): aprovaria a suíte vermelha, segue acusado", () => {
    const v = doCriterio(rodar('Actus', '001'), 1);
    expect(v.length).toBe(1);
    expect(v[0]!.mensagem).toMatch(/aprovaria uma suíte com falha/);
  });

  it('Comarka 570[6] (vitest dentro de $( )): indeterminado, segue acusado', () => {
    const v = doCriterio(rodar('Comarka', '570'), 6);
    expect(v.length).toBe(1);
    expect(v[0]!.mensagem).toMatch(/não dá para saber/);
  });

  it('pipeline com comando fora dos filtros de texto não é executado: indeterminado', () => {
    const v = rodar('Actus', '001', (t) => {
      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
      cr.cmd = 'node_modules/.bin/vitest run a.test.ts 2>&1 | node -e "process.exit(0)" && echo passed';
    });
    expect(doCriterio(v, 1).map((x) => /não dá para saber/.test(x.mensagem))).toEqual([true]);
  });
});

describe('7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA', () => {
  it('CI 240 × 242 (242 depende do 241, que depende do 240): sem achado 8', () => {
    expect(daRegra(rodar('CI', '240'), '8').map((x) => x.mensagem)).toEqual([]);
  });

  it('Actus 222 × 211 e Comarka 172 × 175: idem, pelo fecho', () => {
    expect(daRegra(rodar('Actus', '222'), '8').map((x) => x.mensagem)).toEqual([]);
    expect(daRegra(rodar('Comarka', '172'), '8').map((x) => x.mensagem)).toEqual([]);
  });

  it('sem caminho nenhum entre os dois, segue acusado (aviso, nomeando o path comum)', () => {
    // O 211 alcança o 222 pelo 221 (211 -> 221 -> 222). Com outro id, o 221
    // passa a depender de um ticket que não é este, e não sobra caminho.
    const v = rodar('Actus', '222', (t) => (t.id = '299'));
    const oito = daRegra(v, '8');
    expect(oito.length).toBeGreaterThan(0);
    expect(oito.every((x) => x.aviso && /sobrepõe o \d{3}[a-z0-9]* sem dependência declarada entre os dois/.test(x.mensagem))).toBe(true);
  });
});
