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
