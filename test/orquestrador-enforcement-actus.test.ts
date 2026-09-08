/**
 * K11a-1 — as regras B, C e D do enforcement do actus-saas, como regras POR
 * CONFIG do motor do kit.
 *
 * ORIGEM (só leitura, 2026-09-08):
 * `~/Projetos/actus-saas/scripts/orquestrador/enforcement.test.mjs`. Cada
 * `it(...)` daqui carrega o NOME ORIGINAL do `test(...)` de lá, para que a
 * correspondência caso-a-caso seja verificável por grep e não por memória. Os
 * casos de A (allowlist) já eram cobertos por `orquestrador-enforcement.test.ts`
 * (regra 1) e entram aqui só como os helpers que o Actus testa à parte.
 *
 * O QUE NÃO ENTROU nesta peça, e é gap NOMEADO (não esquecimento):
 *   - a exceção estreita de `supabase/tests/*.test.sql` (14 casos "teste-sql");
 *   - a regra E, `no_write_prefixes` (3 casos);
 *   - a regra F, `padroes_proibidos_no_diff` (10 casos).
 * Enquanto elas não entrarem, o Actus PERDE proteção ao trocar de motor — ver
 * K11a-4 em `docs/PECAS.md` PENDENTES.
 *
 * Toda regra aqui está DESLIGADA quando a chave do config não existe: o
 * `000-config.json` do CI (`_referencia-ci/`) e o do fixture não têm `migrations`
 * nem `zona_proibida.colunas_congeladas`, e têm `no_write_tables: "TODAS"` — o
 * bloco final deste arquivo prova isso contra os dois arquivos REAIS.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { enforce, parseFaixa } from '../scripts/orquestrador/enforcement-core.js';
import { validarConfig } from '../scripts/orquestrador/config-cli.js';
import type { EnforceConfig, TipoViolacao } from '../scripts/orquestrador/enforcement-core.js';

const RAIZ = join(import.meta.dirname, '..');

/**
 * O config do Actus, na forma do kit. Os VALORES são os do disco
 * (`~/Projetos/actus-saas/docs/fila/000-config.json`, lido no PASSO 0); os
 * NOMES são os do kit, e `config-tabela.ts` guarda o par de-para de cada um.
 */
const cfgActus: EnforceConfig = {
  migrations_dir: 'supabase/migrations',
  politica_schema: { comportamento_vigente: 'escrever_sql_nunca_aplicar' },
  migrations: {
    dir: 'supabase/migrations',
    faixa: '0250-0299',
    faixas_reservadas: ['0200-0249'],
  },
  zona_proibida: {
    no_write_paths: [],
    no_write_tables: ['public.leads', 'public.contratos', 'public.clientes_receita'],
    colunas_congeladas: ['etapa_canonica'],
    colunas_sombra: ['etapa_v2_*'],
  },
};

/** Diff mínimo de "novo arquivo" — o `diffNovoArquivo` do Actus. */
function diffNovoArquivo(path: string, linhas: string[]): string {
  return [
    `diff --git a/${path} b/${path}`,
    'new file mode 100644',
    'index 0000000..1111111',
    '--- /dev/null',
    `+++ b/${path}`,
    `@@ -0,0 +1,${linhas.length} @@`,
    ...linhas.map((l) => '+' + l),
    '',
  ].join('\n');
}

function checar(path: string, linhas: string[], allowlist: string[], config = cfgActus) {
  return enforce({ changedFiles: [path], allowlist, diff: diffNovoArquivo(path, linhas), config });
}

const tem = (r: { violations: { tipo: TipoViolacao }[] }, t: TipoViolacao) =>
  r.violations.some((v) => v.tipo === t);

// ─── helpers que o Actus testa à parte ───────────────────────────────────────

describe('helpers', () => {
  it('parseFaixa lê 0250-0299', () => {
    expect(parseFaixa('0250-0299')).toEqual([250, 299]);
  });

  it('parseFaixa aceita a forma já numérica [min, max]', () => {
    expect(parseFaixa([250, 299])).toEqual([250, 299]);
  });

  it('parseFaixa recusa faixa ilegível em vez de adivinhar', () => {
    expect(() => parseFaixa('de 250 até 299')).toThrow(/faixa de migration inválida/);
  });
});

// ─── B · faixa de migration ──────────────────────────────────────────────────

describe('regra B — migrations por faixa (origem: migrations_faixa_loop do Actus)', () => {
  it('B bom: .sql na faixa 0250 passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['create table foo();'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('B mau: .sql fora da faixa (0187) reprova', () => {
    const r = checar('supabase/migrations/0187_x.sql', ['select 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'migration_fora_da_faixa')).toBe(true);
  });

  it('B mau: .sql na faixa RESERVADA da Agência (0200–0249) reprova para o loop', () => {
    const r = checar('supabase/migrations/0200_x.sql', ['select 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'migration_faixa_reservada')).toBe(true);
  });

  it('B mau: .sql acima da faixa (0300) reprova', () => {
    const r = checar('supabase/migrations/0300_x.sql', ['select 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'migration_fora_da_faixa')).toBe(true);
  });

  it('B mau: .sql sem número legível reprova', () => {
    const r = checar('supabase/migrations/ad_hoc.sql', ['select 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'migration_sem_numero')).toBe(true);
  });

  it('B mau: .sql fora do diretório de migrations reprova', () => {
    const r = checar('src/lib/seed.sql', ['select 1;'], ['src/lib/**']);
    expect(tem(r, 'migration_fora_do_dir')).toBe(true);
  });

  it('a violação NOMEIA a regra: o detalhe cita a faixa e o número', () => {
    const r = checar('supabase/migrations/0187_x.sql', ['select 1;'], ['supabase/migrations/**']);
    const v = r.violations.find((x) => x.tipo === 'migration_fora_da_faixa');
    expect(v?.detalhe).toContain('0187');
    expect(v?.detalhe).toContain('250-299');
  });

  it('o segundo diretório de artefato (sql_pendente_dir) não entra na faixa', () => {
    // `docs/sql-pendente/` existe para o .sql que ainda NÃO é migration (ORQ-08):
    // cobrar numeração dele reprovaria o artefato que o próprio ticket pediu.
    const r = checar(
      'docs/sql-pendente/ajuste.sql',
      ['select 1;'],
      ['docs/sql-pendente/**'],
      { ...cfgActus, sql_pendente_dir: 'docs/sql-pendente' },
    );
    expect(r.ok).toBe(true);
  });

  it('DESLIGADA: sem `migrations.dir` no config, nenhum .sql é cobrado por faixa', () => {
    const semRegra = { ...cfgActus, migrations: undefined };
    const r = checar('src/lib/seed.sql', ['select 1;'], ['src/lib/**'], semRegra);
    expect(r.violations.filter((v) => v.tipo.startsWith('migration_'))).toEqual([]);
  });
});

// ─── C · escrita por tabela ──────────────────────────────────────────────────

describe('regra C — escrita por tabela (no_write_tables como LISTA)', () => {
  it('C mau: INSERT em public.leads reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['insert into public.leads (id) values (1);'], ['supabase/migrations/**']);
    expect(tem(r, 'tabela_congelada')).toBe(true);
  });

  it('C mau: UPDATE em leads (sem schema) reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ["update leads set nome = 'x';"], ['supabase/migrations/**']);
    expect(tem(r, 'tabela_congelada')).toBe(true);
  });

  it("C mau: supabase .from('contratos').insert() reprova", () => {
    const r = checar('src/lib/x.ts', ["await sb.from('contratos').insert({ a: 1 })"], ['src/lib/**']);
    expect(tem(r, 'tabela_congelada')).toBe(true);
  });

  it("C bom: LEITURA .from('leads').select() passa", () => {
    const r = checar('src/lib/x.ts', ["const { data } = await sb.from('leads').select('id')"], ['src/lib/**']);
    expect(r.ok).toBe(true);
  });

  it('C bom: escrita em tabela PERMITIDA (comercial.analyses) passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['insert into comercial.analyses (id) values (1);'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('C bom: leitura de tabela congelada em SQL cru (SELECT) passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['select id from public.leads;'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('C mau: fora de `schemas_permitidos`, escrita em qualquer tabela reprova', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: { ...cfgActus.zona_proibida, schemas_permitidos: ['comercial'] },
    }
    const r = checar('supabase/migrations/0250_x.sql', ['insert into outro.coisa (id) values (1);'], ['supabase/migrations/**'], cfg);
    expect(tem(r, 'tabela_nao_permitida')).toBe(true);
  });

  it('C bom: dentro de `schemas_permitidos` a escrita passa', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: { ...cfgActus.zona_proibida, schemas_permitidos: ['comercial'] },
    }
    const r = checar('supabase/migrations/0250_x.sql', ['insert into comercial.analyses (id) values (1);'], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });

  it('C bom: `tabelas_permitidas` libera tabela de schema não listado', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: {
        ...cfgActus.zona_proibida,
        schemas_permitidos: ['comercial'],
        tabelas_permitidas: ['public.tenants'],
      },
    }
    const r = checar('supabase/migrations/0250_x.sql', ['insert into public.tenants (id) values (1);'], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });

  it('DESLIGADA: sem lista de tabelas nem listas de permissão, C não acusa nada', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: { no_write_paths: [], no_write_tables: [] },
    }
    const r = checar('supabase/migrations/0250_x.sql', ['insert into public.leads (id) values (1);'], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });

  it('PROSA nunca reprova: um .md que documenta a proibição não é escrita', () => {
    const r = checar('docs/regras.md', ['Nunca faça `insert into public.leads` — é tabela congelada.'], ['docs/**']);
    expect(r.ok).toBe(true);
  });
});

// ─── D · colunas-sombra ──────────────────────────────────────────────────────

describe('regra D — colunas congeladas e as sombras declaradas', () => {
  it('D mau: SET etapa_canonica reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ["update comercial.analyses set etapa_canonica = 'x';"], ['supabase/migrations/**']);
    expect(tem(r, 'coluna_congelada')).toBe(true);
  });

  it('D mau: .update({ etapa_canonica }) reprova', () => {
    const r = checar('src/lib/x.ts', ["await sb.from('comercial.analyses').update({ etapa_canonica: 'x' })"], ['src/lib/**']);
    expect(tem(r, 'coluna_congelada')).toBe(true);
  });

  it('D bom: LEITURA where etapa_canonica = ... passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ["select id from comercial.analyses where etapa_canonica = 'contato';"], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('D bom: escrever etapa_v2_* (a sombra) passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ["update comercial.analyses set etapa_v2 = 'x';"], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('D bom: a sombra DECLARADA vence a congelada que a cobriria por glob', () => {
    // `congeladas: ["etapa_*"]` congela a família inteira; a sombra é a saída
    // declarada. Sem a precedência da sombra, este par não seria exprimível e o
    // repo teria de enumerar coluna a coluna.
    const cfg = {
      ...cfgActus,
      zona_proibida: {
        ...cfgActus.zona_proibida,
        colunas_congeladas: ['etapa_*'],
        colunas_sombra: ['etapa_v2_*'],
      },
    }
    const sombra = checar('supabase/migrations/0250_x.sql', ["update comercial.analyses set etapa_v2_teste = 'x';"], ['supabase/migrations/**'], cfg);
    expect(sombra.ok).toBe(true);
    const canonica = checar('supabase/migrations/0250_x.sql', ["update comercial.analyses set etapa_canonica = 'x';"], ['supabase/migrations/**'], cfg);
    expect(tem(canonica, 'coluna_congelada')).toBe(true);
  });

  it('D mau: INSERT nomeando a coluna congelada reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['insert into comercial.analyses (id, etapa_canonica) values (1, 2);'], ['supabase/migrations/**']);
    expect(tem(r, 'coluna_congelada')).toBe(true);
  });

  it('DESLIGADA: sem `colunas_congeladas`, D não acusa nada', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: { no_write_paths: [], no_write_tables: [] },
    }
    const r = checar('supabase/migrations/0250_x.sql', ["update comercial.analyses set etapa_canonica = 'x';"], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });
});

// ─── caso limpo ponta a ponta ────────────────────────────────────────────────

describe('caso limpo', () => {
  it('diff totalmente limpo dentro da allowlist passa (ok=true, zero violações)', () => {
    const r = checar('src/lib/orq/x.ts', ['export const soma = (a, b) => a + b'], ['src/lib/orq/**']);
    expect(r).toEqual({ ok: true, violations: [] });
  });
});

// ─── o que o CI faz diferente: NADA ──────────────────────────────────────────

describe('o que o CI faz diferente: nada (provado com o config do CI)', () => {
  const configs: [string, string][] = [
    ['CI', join(RAIZ, '_referencia-ci', '000-config.ci.json')],
    ['fixture', join(RAIZ, 'fixture', 'docs', 'fila', '000-config.json')],
    ['FX_CHECKOUT', join(RAIZ, 'test', 'fixtures', 'checkout', 'docs', 'fila', '000-config.json')],
  ];

  for (const [nome, caminho] of configs) {
    it(`${nome}: nenhuma das chaves novas existe, então B/C/D nascem desligadas`, () => {
      const cru = JSON.parse(readFileSync(caminho, 'utf8')) as EnforceConfig;
      expect(cru.migrations).toBeUndefined();
      expect(cru.zona_proibida.colunas_congeladas).toBeUndefined();
      expect(cru.zona_proibida.schemas_permitidos).toBeUndefined();
      expect(cru.zona_proibida.tabelas_permitidas).toBeUndefined();
      // `TODAS` continua sendo negação total, e não lista.
      expect(cru.zona_proibida.no_write_tables).toBe('TODAS');
    });

    it(`${nome}: um .sql de artefato com DML segue passando, byte a byte como antes`, () => {
      const cru = JSON.parse(readFileSync(caminho, 'utf8')) as EnforceConfig;
      const arq = `${cru.migrations_dir}/0187_qualquer.sql`;
      const r = enforce({
        changedFiles: [arq],
        allowlist: [`${cru.migrations_dir}/**`],
        diff: diffNovoArquivo(arq, ['insert into public.leads (id) values (1);']),
        config: cru,
      });
      expect(r).toEqual({ ok: true, violations: [] });
    });
  }
});

// ─── `orq config` cobra o dir da faixa ───────────────────────────────────────

describe('orq config: faixa de migration sem `migrations.dir`', () => {
  const base = () => JSON.parse(readFileSync(join(RAIZ, 'fixture', 'docs', 'fila', '000-config.json'), 'utf8'));

  it('acusa faixa declarada sem dir — a proibição não valeria para arquivo nenhum', () => {
    const c = base();
    c.migrations = { faixa: '0250-0299' };
    const v = validarConfig(c).filter((x) => x.chave === 'migrations.dir');
    expect(v).toHaveLength(1);
    expect(v[0]!.mensagem).toMatch(/não vale para arquivo nenhum/);
  });

  it('acusa faixas_reservadas sem dir pelo mesmo motivo', () => {
    const c = base();
    c.migrations = { faixas_reservadas: ['0200-0249'] };
    expect(validarConfig(c).filter((x) => x.chave === 'migrations.dir')).toHaveLength(1);
  });

  it('com dir declarado, silêncio', () => {
    const c = base();
    c.migrations = { dir: 'db/migrations', faixa: '0250-0299' };
    expect(validarConfig(c).filter((x) => x.chave === 'migrations.dir')).toEqual([]);
  });

  it('sem a chave `migrations`, silêncio (o config do fixture e o do CI)', () => {
    expect(validarConfig(base()).filter((x) => x.chave.startsWith('migrations.'))).toEqual([]);
  });
});
