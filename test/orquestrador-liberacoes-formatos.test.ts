/**
 * Peça K8b-1 — o motor lê `liberacoes.json` em TODAS as formas vivas.
 *
 * O levantamento (PASSO 0 da etapa 5, `jq` no disco dos três repos) achou três
 * formas em produção e nenhuma delas coincide com o schema:
 *
 *   CI       {"tokens": ["humano:migration-0025", ...]}          strings COM prefixo
 *   Actus    {"tokens": ["migration-0255-aplicada", ...]}        strings SEM prefixo
 *   Comarka  {"liberadas": [{"token","em","por","nota"}, ...],   objetos + strings,
 *             "tokens": ["decisao-D1", ...]}                     os dois SEM prefixo
 *   (v2)     {"tokens": [{"token","liberado_em","por"}, ...]}    objetos — o DESTINO
 *
 * Antes desta peça, só a primeira e a `liberadas[]` da terceira resolviam.
 * As outras duas falhavam EM SILÊNCIO — o ticket ficava pendente para sempre,
 * que é literalmente o incidente de 2026-09-03 (PLAYBOOK do CI) acontecendo de
 * novo em dois repos onde ninguém olhou.
 *
 * Os arquivos reais estão em `test/fixtures/liberacoes/`, byte a byte do disco
 * (ver o PROCEDENCIA.md de lá). Estrutura inventada não prova compatibilidade
 * com um formato que já existe: só o arquivo de verdade prova.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { bashComLog, criarFixture, liberacoes, REPO_ROOT } from './fixtures/orq-harness.js';

const FIX_LIB = join(REPO_ROOT, 'test', 'fixtures', 'liberacoes');

function real(nome: string): { tokens?: unknown[]; liberadas?: unknown[] } {
  return JSON.parse(readFileSync(join(FIX_LIB, `${nome}.json`), 'utf8'));
}

/** `liberacao_ok <token>` contra um conteúdo de liberacoes.json. */
function resolve(conteudo: unknown, token: string): { ok: boolean; saida: string } {
  const raiz = criarFixture([]);
  liberacoes(raiz, conteudo);
  const r = bashComLog(raiz, `liberacao_ok "${token}" && echo RESOLVEU || echo NAO`);
  return { ok: /\bRESOLVEU\b/.test(r.saida), saida: r.saida };
}

/** O ticket inteiro: `deps_resolvidas` é quem o loop chama de verdade. */
function processavel(conteudo: unknown, dep: string): { ok: boolean; saida: string } {
  const raiz = criarFixture([{ id: '900', slug: 'dep-humana', dependencias: [dep] }]);
  liberacoes(raiz, conteudo);
  const r = bashComLog(
    raiz,
    ['f="$(proximo_pendente)"', 'printf "P=%s\\n" "$([ -n "$f" ] && echo sim || echo nao)"'].join('\n'),
  );
  return { ok: /P=sim/.test(r.saida), saida: r.saida };
}

// ─── v2: objetos em .tokens[] (CONTRATO.md §10, divergência 2) ──────────────
describe('v2 — `tokens[]` de OBJETOS resolve dependência', () => {
  const V2 = {
    $schema_versao: 2,
    tokens: [
      { token: 'humano:migration-0025', liberado_em: '2026-09-08', por: 'lucas', nota: 'aplicada e conferida' },
      { token: 'humano:tk-201-arquetipos', liberado_em: '2026-09-08', por: 'lucas' },
    ],
  };

  it('liberacao_ok aceita o objeto (era a divergência 2: objeto ali não resolvia NADA)', () => {
    expect(resolve(V2, 'humano:migration-0025').ok).toBe(true);
  });

  it('o ticket que depende dele fica PROCESSÁVEL', () => {
    expect(processavel(V2, 'humano:migration-0025').ok).toBe(true);
  });

  it('objeto de OUTRO token continua não resolvendo', () => {
    expect(resolve(V2, 'humano:migration-0026').ok).toBe(false);
  });

  it('objeto sem campo `token` é ignorado, não resolve tudo', () => {
    expect(resolve({ tokens: [{ liberado_em: '2026-09-08', por: 'lucas' }] }, 'humano:x-1').ok).toBe(false);
  });

  it('resolução por v2 NÃO grava aviso: é a forma de destino', () => {
    expect(resolve(V2, 'humano:migration-0025').saida).not.toMatch(/AVISO/);
  });
});

// ─── Actus: tokens[] de strings SEM prefixo ─────────────────────────────────
describe('Actus — `tokens[]` de strings SEM o prefixo `humano:`', () => {
  const ACTUS = real('actus-tokens-sem-prefixo');

  it('os 5 tokens do arquivo real resolvem a dependência `humano:<token>`', () => {
    for (const t of ACTUS.tokens as string[]) {
      const r = resolve(ACTUS, `humano:${t}`);
      expect(r.ok, `token ${t}: ${r.saida}`).toBe(true);
    }
  });

  it('o ticket fica PROCESSÁVEL (antes: pendente para sempre, sem uma linha de log)', () => {
    expect(processavel(ACTUS, 'humano:migration-0255-aplicada').ok).toBe(true);
  });

  it('grava AVISO nomeando a forma legada e o comando que a migra', () => {
    const saida = resolve(ACTUS, 'humano:migration-0255-aplicada').saida;
    expect(saida).toMatch(/AVISO/);
    expect(saida).toMatch(/--atualizar .* --migrar|--migrar/);
  });

  it('token que o arquivo não tem continua não resolvendo', () => {
    expect(resolve(ACTUS, 'humano:migration-9999-aplicada').ok).toBe(false);
  });
});

// ─── Comarka: as duas listas ────────────────────────────────────────────────
describe('Comarka — `liberadas[]` de objetos + `tokens[]` de strings', () => {
  const COMARKA = real('comarka-duas-listas');

  it('token que só existe em `liberadas[]` resolve (campo `em`, sem prefixo)', () => {
    // `aplicar-migration-contratual` está em liberadas[] e NÃO em tokens[].
    expect(resolve(COMARKA, 'humano:aplicar-migration-contratual').ok).toBe(true);
  });

  it('token que só existe em `tokens[]` resolve', () => {
    // `decisao-D10` está em tokens[] e NÃO em liberadas[].
    expect(resolve(COMARKA, 'humano:decisao-D10').ok).toBe(true);
  });

  it('token nas DUAS listas resolve uma vez só, sem erro', () => {
    expect(resolve(COMARKA, 'humano:decisao-C1').ok).toBe(true);
  });

  it('TODOS os 47 tokens únicos do arquivo real resolvem', () => {
    const dos = (xs: unknown[] | undefined) =>
      (xs ?? []).map((x) => (typeof x === 'string' ? x : ((x as { token?: string }).token ?? '')));
    const unicos = [...new Set([...dos(COMARKA.tokens), ...dos(COMARKA.liberadas)])].filter(Boolean);
    expect(unicos.length).toBe(47);
    for (const t of unicos) {
      const r = resolve(COMARKA, `humano:${t}`);
      expect(r.ok, `token ${t}: ${r.saida}`).toBe(true);
    }
  });
});

// ─── união e prefixo dos dois lados ─────────────────────────────────────────
describe('um arquivo que MISTURA as formas resolve a UNIÃO', () => {
  const MISTO = {
    tokens: [
      'humano:a-1', //                       v1 com prefixo
      'b-2', //                              v1 sem prefixo
      { token: 'humano:c-3', liberado_em: '2026-09-08', por: 'lucas' }, // v2
      { token: 'd-4', liberado_em: '2026-09-08', por: 'lucas' }, //       v2 sem prefixo
    ],
    liberadas: [{ token: 'e-5', em: '2026-08-13', por: 'lucas' }], //     legado
  };

  for (const t of ['a-1', 'b-2', 'c-3', 'd-4', 'e-5']) {
    it(`resolve humano:${t}`, () => expect(resolve(MISTO, `humano:${t}`).ok).toBe(true));
  }

  it('não resolve o que não está em forma nenhuma', () => {
    expect(resolve(MISTO, 'humano:f-6').ok).toBe(false);
  });

  it('a comparação ignora o prefixo dos DOIS lados: dep sem prefixo casa token com prefixo', () => {
    // `deps_resolvidas` só chama `liberacao_ok` para dep que COMEÇA com
    // `humano:`; aqui a chamada é direta, para provar a normalização.
    expect(resolve({ tokens: ['humano:a-1'] }, 'a-1').ok).toBe(true);
  });
});

// ─── o NEGATIVO que importa: o CI não muda ──────────────────────────────────
describe('o que o CI faz diferente: NADA', () => {
  const CI = real('ci-tokens-com-prefixo');

  it('o arquivo real do CI tem 7 tokens, todos na forma canônica', () => {
    expect((CI.tokens as string[]).length).toBe(7);
    for (const t of CI.tokens as string[]) expect(t).toMatch(/^humano:/);
  });

  it('os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada)', () => {
    for (const t of CI.tokens as string[]) {
      const r = resolve(CI, t);
      expect(r.ok, `token ${t}`).toBe(true);
      expect(r.saida, `token ${t}`).not.toMatch(/AVISO/);
    }
  });

  it('é byte a byte o mesmo arquivo de test/fixtures/checkout', () => {
    const a = readFileSync(join(FIX_LIB, 'ci-tokens-com-prefixo.json'));
    const b = readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', 'liberacoes.json'));
    expect(a.equals(b)).toBe(true);
  });
});

// ─── o lint do mapa lê as MESMAS formas ─────────────────────────────────────
describe('lint-mapa.py monta o conjunto de satisfeitos pelas mesmas regras', () => {
  /** Roda só o trecho de leitura do lint, contra um liberacoes.json qualquer. */
  function satisfeitos(conteudo: unknown): string[] {
    const raiz = criarFixture([]);
    liberacoes(raiz, conteudo);
    const lint = readFileSync(join(REPO_ROOT, 'scripts', 'roadmap', 'lint-mapa.py'), 'utf8');
    // O bloco que constrói `sat`, extraído por marcador — assim o teste NÃO
    // reimplementa a regra: ele executa a do lint. Se o marcador sumir, falha.
    const m = /# <sat>\n([\s\S]*?)# <\/sat>\n/.exec(lint);
    expect(m, 'marcadores # <sat> ... # </sat> em lint-mapa.py').toBeTruthy();
    const py = ['import json', `lib=json.load(open(${JSON.stringify(join(raiz, 'docs', 'fila', 'liberacoes.json'))}))`, m![1], 'print("\\n".join(sorted(sat)))'].join('\n');
    const r = spawnSync('python3', ['-c', py], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    return r.stdout.split('\n').filter(Boolean);
  }

  it('v2 (objetos) entra em `sat` — antes só strings entravam', () => {
    const sat = satisfeitos({ tokens: [{ token: 'humano:c-3', liberado_em: '2026-09-08', por: 'lucas' }] });
    expect(sat).toContain('humano:c-3');
  });

  it('string sem prefixo entra normalizada, com o prefixo', () => {
    expect(satisfeitos({ tokens: ['b-2'] })).toContain('humano:b-2');
  });

  it('`liberadas[]` continua entrando', () => {
    expect(satisfeitos({ liberadas: [{ token: 'e-5', em: '2026-08-13' }] })).toContain('humano:e-5');
  });

  it('os 47 do Comarka entram, sem duplicata', () => {
    const sat = satisfeitos(real('comarka-duas-listas'));
    expect(sat.length).toBe(47);
    expect(new Set(sat).size).toBe(47);
  });

  it('os 7 do CI entram exatamente como estão', () => {
    const CI = real('ci-tokens-com-prefixo');
    expect(satisfeitos(CI).sort()).toEqual([...(CI.tokens as string[])].sort());
  });
});
