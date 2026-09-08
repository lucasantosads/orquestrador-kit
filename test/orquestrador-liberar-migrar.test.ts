/**
 * Peça K8b-2 — `orq liberar` e `migrar-liberacoes.ts`.
 *
 * As duas pontas da mesma decisão: como uma liberação NASCE (o verbo) e como as
 * que já existem chegam à v2 (a migração). Elas são um par porque `orq liberar`
 * RECUSA arquivo fora da v2 — se a migração não existisse, o verbo não teria
 * onde escrever; se o verbo não existisse, a v2 seria um formato sem produtor.
 *
 * A migração roda contra os arquivos REAIS dos três repos
 * (`test/fixtures/liberacoes/`, cópias byte a byte — ver o PROCEDENCIA.md de
 * lá). Os três repos são SÓ LEITURA nesta sessão: tudo aqui acontece em cópias
 * dentro de `mkdtemp`.
 */
import { describe, it, expect } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ehV2, jaLiberado, migrar, comPrefixo, RE_TOKEN } from '../scripts/orquestrador/liberacoes-core.js';
import { liberar, hoje } from '../scripts/orquestrador/liberar-cli.js';
import { migrarArquivo } from '../scripts/orquestrador/migrar-liberacoes.js';
import { bashComLog, criarFixture, liberacoes, orq, REPO_ROOT } from './fixtures/orq-harness.js';

const FIX_LIB = join(REPO_ROOT, 'test', 'fixtures', 'liberacoes');

/** Cópia do arquivo real num tmp descartável. O original nunca é tocado. */
function copiaReal(nome: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-mig-'));
  const alvo = join(dir, 'liberacoes.json');
  copyFileSync(join(FIX_LIB, `${nome}.json`), alvo);
  return alvo;
}

function ler(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf8'));
}

// ─── migração · o que ela produz ────────────────────────────────────────────
describe('migrar-liberacoes: qualquer forma viva → v2', () => {
  it('CI (7 strings COM prefixo) → 7 objetos v2, mesma ordem', () => {
    const p = copiaReal('ci-tokens-com-prefixo');
    const antes = (ler(p) as { tokens: string[] }).tokens;
    migrarArquivo(p, 'aplicar');
    const depois = ler(p) as { $schema_versao: number; tokens: Array<{ token: string }> };
    expect(depois.$schema_versao).toBe(2);
    expect(depois.tokens.map((t) => t.token)).toEqual(antes);
  });

  it('Actus (5 strings SEM prefixo) ganha o prefixo, sem perder nem inventar token', () => {
    const p = copiaReal('actus-tokens-sem-prefixo');
    const antes = (ler(p) as { tokens: string[] }).tokens;
    migrarArquivo(p, 'aplicar');
    const depois = ler(p) as { tokens: Array<{ token: string }> };
    expect(depois.tokens.map((t) => t.token)).toEqual(antes.map((t) => `humano:${t}`));
  });

  it('Comarka: 61 entradas → 47 tokens únicos, e NENHUM some', () => {
    const p = copiaReal('comarka-duas-listas');
    const bruto = ler(p) as { tokens: string[]; liberadas: Array<{ token: string }> };
    const esperados = new Set([
      ...bruto.tokens.map(comPrefixo),
      ...bruto.liberadas.map((l) => comPrefixo(l.token)),
    ]);
    migrarArquivo(p, 'aplicar');
    const depois = ler(p) as { tokens: Array<{ token: string }>; liberadas?: unknown };
    expect(depois.tokens.length).toBe(47);
    expect(new Set(depois.tokens.map((t) => t.token))).toEqual(esperados);
    expect(depois.liberadas).toBeUndefined();
  });

  it('Comarka: `em` vira `liberado_em`, e `por`/`nota` chegam inteiros', () => {
    const p = copiaReal('comarka-duas-listas');
    migrarArquivo(p, 'aplicar');
    const t = (ler(p) as { tokens: Array<Record<string, string>> }).tokens.find(
      (x) => x.token === 'humano:aplicar-migration-contratual',
    )!;
    expect(t.liberado_em).toBe('2026-08-13');
    expect(t.por).toBe('lucas');
    expect(t.nota).toContain('arq_documentos revisada');
    expect(t).not.toHaveProperty('em');
  });

  it('Comarka: a duplicata exata dentro de liberadas[] vira UM registro', () => {
    const p = copiaReal('comarka-duas-listas');
    const r = migrarArquivo(p, 'dry-run');
    expect(r.linhas.join('\n')).toMatch(/migration-196-aplicada \(2×\)/);
    const tokens = (JSON.parse(r.depois) as { tokens: Array<{ token: string }> }).tokens;
    expect(tokens.filter((t) => t.token === 'humano:migration-196-aplicada').length).toBe(1);
  });

  it('Comarka: a chave de raiz `descricao` é PRESERVADA, e a preservação é relatada', () => {
    const p = copiaReal('comarka-duas-listas');
    const r = migrarArquivo(p, 'dry-run');
    expect((JSON.parse(r.depois) as { descricao?: string }).descricao).toBe(
      (ler(p) as { descricao: string }).descricao,
    );
    expect(r.linhas.join('\n')).toMatch(/chave de raiz 'descricao' preservada intacta/);
  });
});

// ─── migração · o que ela NÃO faz ───────────────────────────────────────────
describe('migrar-liberacoes: não inventa e não apaga', () => {
  it('token sem data no disco fica `desconhecido`, com a origem marcada', () => {
    const { v2 } = migrar({ tokens: ['migration-0255-aplicada'] });
    expect(v2.tokens[0]).toMatchObject({
      token: 'humano:migration-0255-aplicada',
      liberado_em: 'desconhecido',
      por: 'desconhecido',
      origem: 'v1:tokens',
    });
  });

  it('o relatório DIZ que não inventou data', () => {
    expect(migrar({ tokens: ['migration-0255-aplicada'] }).notas.join('\n')).toMatch(
      /NÃO inventa data/,
    );
  });

  it('token nas duas listas: a segunda aparição ENRIQUECE, não sobrescreve', () => {
    const { v2 } = migrar({
      tokens: ['decisao-C1'], //                                          sem metadados
      liberadas: [{ token: 'decisao-C1', em: '2026-09-04', por: 'lucas', nota: 'ok' }],
    });
    expect(v2.tokens.length).toBe(1);
    expect(v2.tokens[0]).toMatchObject({ liberado_em: '2026-09-04', por: 'lucas', nota: 'ok' });
  });

  it('dado presente na PRIMEIRA aparição não é sobrescrito pela segunda', () => {
    const { v2 } = migrar({
      tokens: [{ token: 'humano:x-1', liberado_em: '2026-01-01', por: 'primeiro' }],
      liberadas: [{ token: 'x-1', em: '2026-12-31', por: 'segundo' }],
    });
    expect(v2.tokens[0]).toMatchObject({ liberado_em: '2026-01-01', por: 'primeiro' });
  });

  it('a ORDEM de leitura é a ordem das chaves no arquivo, não uma ordem fixa', () => {
    const libsPrimeiro = migrar({ liberadas: [{ token: 'b' }], tokens: ['a'] });
    const toksPrimeiro = migrar({ tokens: ['a'], liberadas: [{ token: 'b' }] });
    expect(libsPrimeiro.v2.tokens.map((t) => t.token)).toEqual(['humano:b', 'humano:a']);
    expect(toksPrimeiro.v2.tokens.map((t) => t.token)).toEqual(['humano:a', 'humano:b']);
  });

  it('token que não casa o padrão do schema é migrado assim mesmo, e RELATADO', () => {
    const m = migrar({ tokens: ['SEM_TRACO'] });
    expect(m.v2.tokens[0]!.token).toBe('humano:SEM_TRACO');
    expect(m.notas.join('\n')).toMatch(/NÃO casa/);
  });

  it('entrada sem token não vira registro, e a perda é relatada', () => {
    const m = migrar({ tokens: [{ por: 'lucas' }] });
    expect(m.v2.tokens.length).toBe(0);
    expect(m.notas.join('\n')).toMatch(/entrada sem token/);
  });
});

// ─── migração · dry-run, .bak e idempotência ────────────────────────────────
describe('migrar-liberacoes: --dry-run, .bak e rodar duas vezes', () => {
  it('--dry-run NÃO escreve, e imprime o diff', () => {
    const p = copiaReal('actus-tokens-sem-prefixo');
    const antes = readFileSync(p, 'utf8');
    const r = migrarArquivo(p, 'dry-run');
    expect(readFileSync(p, 'utf8')).toBe(antes);
    expect(existsSync(`${p}.bak`)).toBe(false);
    const saida = r.linhas.join('\n');
    expect(saida).toMatch(/^--- .*\(atual\)/m);
    expect(saida).toMatch(/^\+\+\+ .*\(v2 proposto\)/m);
    expect(saida).toMatch(/^\+.*"token": "humano:migration-0255-aplicada"/m);
  });

  it('--aplicar grava e deixa o .bak com o conteúdo ANTERIOR', () => {
    const p = copiaReal('actus-tokens-sem-prefixo');
    const antes = readFileSync(p, 'utf8');
    migrarArquivo(p, 'aplicar');
    expect(readFileSync(`${p}.bak`, 'utf8')).toBe(antes);
    expect(ehV2(ler(p))).toBe(true);
  });

  it('rodar de novo é no-op: nada a fazer, e o .bak NÃO é sobrescrito', () => {
    const p = copiaReal('comarka-duas-listas');
    const original = readFileSync(p, 'utf8');
    migrarArquivo(p, 'aplicar');
    const depoisDaPrimeira = readFileSync(p, 'utf8');
    const r = migrarArquivo(p, 'aplicar');
    expect(r.mudou).toBe(false);
    expect(r.linhas.join('\n')).toMatch(/já está em v2/);
    expect(readFileSync(p, 'utf8')).toBe(depoisDaPrimeira);
    expect(readFileSync(`${p}.bak`, 'utf8')).toBe(original);
  });

  it('o resultado da migração PASSA no leitor do motor: todo token resolve', () => {
    const p = copiaReal('comarka-duas-listas');
    migrarArquivo(p, 'aplicar');
    const v2 = ler(p) as { tokens: Array<{ token: string }> };
    const raiz = criarFixture([]);
    liberacoes(raiz, v2);
    // Uma chamada só, com os 47 num laço de bash: 47 spawns de node custariam
    // mais que o teste inteiro.
    const lista = v2.tokens.map((t) => t.token).join(' ');
    const r = bashComLog(raiz, `for t in ${lista}; do liberacao_ok "$t" || echo "FALHOU $t"; done; echo FIM`);
    expect(r.saida).not.toMatch(/FALHOU/);
    expect(r.saida).toMatch(/FIM/);
  });

  it('depois da migração o motor não grava mais AVISO de forma legada', () => {
    const p = copiaReal('comarka-duas-listas');
    migrarArquivo(p, 'aplicar');
    const raiz = criarFixture([]);
    liberacoes(raiz, ler(p));
    const r = bashComLog(raiz, 'liberacao_ok "humano:decisao-C1" && echo OK');
    expect(r.saida).toMatch(/\bOK\b/);
    expect(r.saida).not.toMatch(/AVISO/);
  });
});

// ─── orq liberar · a decisão pura ───────────────────────────────────────────
describe('orq liberar: as quatro recusas', () => {
  const V2 = { $schema_versao: 2 as const, tokens: [] as unknown[] };

  it('recusa token sem o prefixo humano:', () => {
    const r = liberar(V2, 'migration-0025', undefined, 'lucas', '2026-09-08');
    expect(r.ok).toBe(false);
    expect((r as { motivo: string }).motivo).toMatch(/não começa com 'humano:'/);
    expect((r as { motivo: string }).motivo).toMatch(/humano:migration-0025/);
  });

  it('recusa token fora do padrão do schema', () => {
    const r = liberar(V2, 'humano:SEM_TRACO', undefined, 'lucas', '2026-09-08');
    expect(r.ok).toBe(false);
    expect((r as { motivo: string }).motivo).toMatch(/não casa/);
  });

  it('recusa duplicata, inclusive contra a lista legada liberadas[]', () => {
    const comLegado = { $schema_versao: 2, tokens: [], liberadas: [{ token: 'migration-0025' }] };
    // Este arquivo nem é v2 (tem `liberadas`), então a recusa vem antes; o que
    // o caso prova é o `jaLiberado`, que olha as duas listas.
    expect(jaLiberado(comLegado, 'humano:migration-0025')).toBe(true);
    const emV2 = {
      $schema_versao: 2,
      tokens: [{ token: 'humano:migration-0025', liberado_em: '2026-09-01', por: 'lucas' }],
    };
    const r = liberar(emV2, 'humano:migration-0025', undefined, 'lucas', '2026-09-08');
    expect(r.ok).toBe(false);
    expect((r as { motivo: string }).motivo).toMatch(/já está liberado/);
  });

  it('recusa arquivo fora da v2, e a mensagem traz o comando da migração', () => {
    const r = liberar({ tokens: ['humano:migration-0025'] }, 'humano:x-1', undefined, 'lucas', '2026-09-08');
    expect(r.ok).toBe(false);
    const m = (r as { motivo: string }).motivo;
    expect(m).toMatch(/não está em v2/);
    expect(m).toMatch(/--migrar --dry-run/);
  });

  it('o arquivo do CI (strings) é recusado — a v1 canônica também não é v2', () => {
    const CI = JSON.parse(readFileSync(join(FIX_LIB, 'ci-tokens-com-prefixo.json'), 'utf8'));
    const r = liberar(CI, 'humano:novo-1', undefined, 'lucas', '2026-09-08');
    expect(r.ok).toBe(false);
    expect((r as { motivo: string }).motivo).toMatch(/não está em v2/);
  });
});

describe('orq liberar: o que ele grava', () => {
  const V2 = { $schema_versao: 2 as const, tokens: [] as unknown[] };

  it('grava o objeto v2 com token, data, por e nota', () => {
    const r = liberar(V2, 'humano:migration-0025', 'aplicada e conferida', 'lucas', '2026-09-08');
    expect(r.ok).toBe(true);
    const o = JSON.parse((r as { conteudo: string }).conteudo);
    expect(o.tokens[0]).toEqual({
      token: 'humano:migration-0025',
      liberado_em: '2026-09-08',
      por: 'lucas',
      nota: 'aplicada e conferida',
      origem: 'v2',
    });
  });

  it('sem nota, o campo não aparece (opcional é opcional)', () => {
    const r = liberar(V2, 'humano:migration-0025', '  ', 'lucas', '2026-09-08');
    const o = JSON.parse((r as { conteudo: string }).conteudo);
    expect(o.tokens[0]).not.toHaveProperty('nota');
  });

  it('acrescenta NO FIM, sem mexer nos que já estavam', () => {
    const cheio = {
      $schema_versao: 2,
      descricao: 'não mexa em mim',
      tokens: [{ token: 'humano:a-1', liberado_em: '2026-01-01', por: 'outro' }],
    };
    const r = liberar(cheio, 'humano:b-2', undefined, 'lucas', '2026-09-08');
    const o = JSON.parse((r as { conteudo: string }).conteudo);
    expect(o.tokens.map((t: { token: string }) => t.token)).toEqual(['humano:a-1', 'humano:b-2']);
    expect(o.tokens[0].por).toBe('outro');
    expect(o.descricao).toBe('não mexa em mim');
  });

  it('o que ele grava é aceito pelo próprio ehV2 e pelo padrão do schema', () => {
    const r = liberar(V2, 'humano:tk-201-arquetipos', 'nota', 'lucas', hoje());
    const o = JSON.parse((r as { conteudo: string }).conteudo);
    expect(ehV2(o)).toBe(true);
    expect(RE_TOKEN.test(o.tokens[0].token)).toBe(true);
  });
});

// ─── orq liberar · pelo verbo de verdade, contra o fixture ──────────────────
describe('orq liberar: pelo `scripts/orq`, num repo de fixture', () => {
  /** Fixture com liberacoes.json v2 vazio, como `--novo` o cria. */
  function repo(): string {
    const raiz = criarFixture([]);
    liberacoes(raiz, { $schema_versao: 2, tokens: [] });
    return raiz;
  }

  it('libera, sai 0 e o arquivo passa a ter o token', () => {
    const raiz = repo();
    const r = orq(raiz, 'liberar', 'humano:migration-0025', 'aplicada no banco');
    expect(r.rc, r.err).toBe(0);
    expect(r.out).toMatch(/LIBERADO\s+humano:migration-0025/);
    const o = JSON.parse(readFileSync(join(raiz, 'docs', 'fila', 'liberacoes.json'), 'utf8'));
    expect(o.tokens[0].token).toBe('humano:migration-0025');
    expect(o.tokens[0].nota).toBe('aplicada no banco');
    expect(o.tokens[0].liberado_em).toBe(hoje());
  });

  it('o token liberado DESTRAVA o ticket que dependia dele', () => {
    const raiz = repo();
    writeFileSync(
      join(raiz, 'docs', 'fila', '901-dep.md'),
      '# 901\n\n```json\n' +
        JSON.stringify({ id: '901', slug: 'dep', status: 'pendente', dependencias: ['humano:migration-0025'], objetivo: 'x', pathspec_allowlist: [], criterios_aceite: [] }, null, 2) +
        '\n```\n',
    );
    const antes = bashComLog(raiz, 'f="$(proximo_pendente)"; printf "P=%s\\n" "$([ -n "$f" ] && echo sim || echo nao)"');
    expect(antes.saida).toMatch(/P=nao/);
    expect(orq(raiz, 'liberar', 'humano:migration-0025').rc).toBe(0);
    const depois = bashComLog(raiz, 'f="$(proximo_pendente)"; printf "P=%s\\n" "$([ -n "$f" ] && echo sim || echo nao)"');
    expect(depois.saida).toMatch(/P=sim/);
  });

  it('duplicata: rc 1, RECUSADO, e o arquivo NÃO muda', () => {
    const raiz = repo();
    orq(raiz, 'liberar', 'humano:migration-0025');
    const arq = join(raiz, 'docs', 'fila', 'liberacoes.json');
    const antes = readFileSync(arq, 'utf8');
    const r = orq(raiz, 'liberar', 'humano:migration-0025');
    expect(r.rc).toBe(1);
    expect(r.err).toMatch(/RECUSADO.*já está liberado/s);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  });

  it('sem token: erro de uso, e o arquivo NÃO muda', () => {
    const raiz = repo();
    const arq = join(raiz, 'docs', 'fila', 'liberacoes.json');
    const antes = readFileSync(arq, 'utf8');
    const r = orq(raiz, 'liberar');
    expect(r.rc).not.toBe(0);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  });

  it('arquivo em v1: recusa e manda migrar, sem tocar em nada', () => {
    const raiz = criarFixture([]);
    liberacoes(raiz, { tokens: ['humano:ja-existente-1'] });
    const arq = join(raiz, 'docs', 'fila', 'liberacoes.json');
    const antes = readFileSync(arq, 'utf8');
    const r = orq(raiz, 'liberar', 'humano:novo-1');
    expect(r.rc).toBe(1);
    expect(r.err).toMatch(/não está em v2/);
    expect(r.err).toMatch(/--migrar/);
    expect(readFileSync(arq, 'utf8')).toBe(antes);
  });
});

// ─── a saída obedece ao schema, lido do disco ───────────────────────────────
// O schema é documento e insumo, nunca gate (CONTRATO.md §10) — o kit não tem
// dependência de runtime e não vai ganhar um validador de JSON Schema só para
// isto. O que dá para checar sem biblioteca, e é o que importa, são as três
// afirmações que o schema faz sobre CADA registro: os campos obrigatórios, o
// padrão de `liberado_em` e a lista fechada de propriedades. Elas são lidas DO
// ARQUIVO, não recopiadas aqui: um schema que mude sem o código acompanhar
// falha neste teste.
describe('o que a migração escreve casa com schemas/liberacoes.schema.json', () => {
  const schema = JSON.parse(
    readFileSync(join(REPO_ROOT, 'schemas', 'liberacoes.schema.json'), 'utf8'),
  );
  const item = schema.properties.tokens.items;
  const obrigatorios: string[] = item.required;
  const permitidas = new Set(Object.keys(item.properties));
  const reData = new RegExp(item.properties.liberado_em.pattern);
  const reToken = new RegExp(item.properties.token.pattern);

  for (const nome of ['ci-tokens-com-prefixo', 'actus-tokens-sem-prefixo', 'comarka-duas-listas']) {
    it(`${nome} migrado passa nas asserções do schema`, () => {
      const p = copiaReal(nome);
      migrarArquivo(p, 'aplicar');
      const o = ler(p) as { $schema_versao: number; tokens: Array<Record<string, string>> };
      expect(o.$schema_versao).toBe(schema.properties.$schema_versao.const);
      expect(o.tokens.length).toBeGreaterThan(0);
      for (const t of o.tokens) {
        for (const c of obrigatorios) expect(t, `${t.token}: falta ${c}`).toHaveProperty(c);
        for (const k of Object.keys(t)) expect(permitidas, `${t.token}: chave ${k}`).toContain(k);
        expect(reData.test(t.liberado_em ?? ''), `${t.token}: liberado_em=${t.liberado_em}`).toBe(true);
        expect(reToken.test(t.token ?? ''), `token ${t.token}`).toBe(true);
      }
    });
  }

  it('o registro que `orq liberar` grava também passa', () => {
    const r = liberar({ $schema_versao: 2, tokens: [] }, 'humano:migration-0025', 'nota', 'lucas', hoje());
    const t = JSON.parse((r as { conteudo: string }).conteudo).tokens[0];
    for (const c of obrigatorios) expect(t).toHaveProperty(c);
    for (const k of Object.keys(t)) expect(permitidas).toContain(k);
    expect(reData.test(t.liberado_em)).toBe(true);
  });
});

// ─── o fixture do kit nasce em v2 ───────────────────────────────────────────
describe('o template de fixture do kit já nasce em v2', () => {
  it('fixture/docs/fila/liberacoes.json é v2 (é o que `--novo` copia)', () => {
    const p = join(REPO_ROOT, 'fixture', 'docs', 'fila', 'liberacoes.json');
    expect(ehV2(JSON.parse(readFileSync(p, 'utf8')))).toBe(true);
  });
});
