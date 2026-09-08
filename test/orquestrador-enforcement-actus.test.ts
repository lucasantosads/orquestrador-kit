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
 * A K11a-4 acrescentou a regra E (`prefixos_sem_ddl`), a regra F
 * (`enforcement.padroes_proibidos_no_diff`) e a exceção estreita de teste-SQL
 * (`enforcement.testes_sql`) — os casos de cada uma carregam, do mesmo jeito, o
 * nome original do `test(...)` do Actus.
 *
 * Com a K11a-4 fechada, o Actus não perde regra nenhuma de enforcement ao
 * trocar de motor: A–F e a exceção de teste-SQL têm, cada uma, os casos do
 * `enforcement.test.mjs` de lá.
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
import { propor } from '../scripts/orquestrador/migrar-config.js';
import { RENOMES } from '../scripts/orquestrador/config-tabela.js';
import type { EnforceConfig, TipoViolacao } from '../scripts/orquestrador/enforcement-core.js';

const RAIZ = join(import.meta.dirname, '..');

/**
 * As três entradas de `zona_proibida.padroes_proibidos_no_diff` do Actus,
 * COPIADAS BYTE A BYTE de `~/Projetos/actus-saas/docs/fila/000-config.json`
 * (só leitura, 2026-09-08). O texto escapado do JSON e o de uma string TS com
 * aspas simples são os MESMOS caracteres, então a cópia é literal: nenhuma
 * regex foi reescrita, reindentada nem "melhorada" na travessia — a peça
 * K11a-4d prova isso comparando este array com o config real em fixture.
 *
 * A primeira carrega a correção medida no ticket 615 do Actus: o `[^;]*` entre
 * `SET` e o alvo atravessava a fronteira da cláusula e casava `set deleted_at =
 * now() where tenant_id = $1`, com `tenant_id` só na WHERE. O
 * `(?:(?!\bwhere\b)[^;])*` é o conserto, e o caso de regressão abaixo falha
 * com a forma antiga.
 */
const PADROES_ACTUS = [
  {
    nome: 'update_tenant_id_messages_particionada',
    regex: '(?is)update\\s+comercial\\.messages\\b[^;]*?\\bset\\b(?:(?!\\bwhere\\b)[^;])*\\btenant_id\\s*=',
    motivo:
      'comercial.messages é particionada por RANGE em enviada_em; UPDATE de tenant_id pode cruzar partição e corromper a linha. Reancoragem é ETL humano, não loop.',
  },
  {
    nome: 'session_replication_role',
    regex: '(?i)session_replication_role',
    motivo: 'Desliga triggers/RLS a nível de sessão — ferramenta de humano em ETL/manutenção, nunca do loop.',
  },
  {
    nome: 'delete_fisico',
    regex: '(?is)\\bdelete\\s+from\\b(?![^;]*\\bwhere\\b[^;]*\\bfalse\\b)',
    motivo:
      'DELETE físico proibido: exclusão de dado de negócio é soft delete (deleted_at). Vale para .sql e SQL cru no código. Expurgo LGPD é migration/rota humana explícita, fora do loop.',
  },
];

/** A forma ANTIGA da primeira regex — o `[^;]*` que atravessava SET→WHERE. */
const REGEX_ANTIGA_TENANT_ID =
  '(?is)update\\s+comercial\\.messages\\b[^;]*?\\bset\\b[^;]*\\btenant_id\\s*=';

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
    prefixos_sem_ddl: ['vw_'],
  },
  enforcement: {
    padroes_proibidos_no_diff: PADROES_ACTUS,
    // O glob descreve quem ENTRA na exceção — no Actus, `tests_dir` inteiro
    // (`enforcement.mjs:217`). O sufixo `.test.sql` é a CONDIÇÃO 1, checada
    // pela regra: um glob já estreitado a `*.test.sql` deixaria a condição 1
    // inalcançável, porque o arquivo de nome errado nem entraria.
    testes_sql: { glob: 'supabase/tests/**' },
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

// ─── E · CREATE/ALTER/DROP por prefixo de objeto ─────────────────────────────

describe('regra E — prefixos_sem_ddl (origem: no_write_prefixes do Actus)', () => {
  it('E mau: create or replace view vw_x reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['create or replace view vw_saude as select 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'prefixo_sem_ddl')).toBe(true);
  });

  it('E mau: drop view vw_x reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['drop view vw_saude;'], ['supabase/migrations/**']);
    expect(tem(r, 'prefixo_sem_ddl')).toBe(true);
  });

  it('E bom: create function normal passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['create or replace function fn_x() returns int as $$ select 1 $$ language sql;'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('E mau: ALTER de objeto com o prefixo reprova (a terceira do CREATE/ALTER/DROP)', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['alter view vw_saude rename to vw_saude_2;'], ['supabase/migrations/**']);
    expect(tem(r, 'prefixo_sem_ddl')).toBe(true);
  });

  it('E: DML em objeto com o prefixo NÃO é desta regra — E é DDL', () => {
    // A regra E existe para "quem CRIA/ALTERA/APAGA o objeto"; escrever DADO
    // numa view é assunto das regras C/D, que julgam por tabela e por coluna.
    // Sem esta separação, `prefixos_sem_ddl` viraria um segundo `no_write_tables`
    // por nome parecido — e as duas regras têm donos e vocabulários diferentes.
    const r = checar('supabase/migrations/0250_x.sql', ['insert into vw_saude (id) values (1);'], ['supabase/migrations/**']);
    expect(tem(r, 'prefixo_sem_ddl')).toBe(false);
    expect(r.ok).toBe(true);
  });

  it('E: a violação NOMEIA o prefixo que a disparou', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['drop view vw_saude;'], ['supabase/migrations/**']);
    const v = r.violations.find((x) => x.tipo === 'prefixo_sem_ddl');
    expect(v?.detalhe).toContain('vw_');
    expect(v?.detalhe).toContain('supabase/migrations/0250_x.sql');
  });

  it('PROSA nunca reprova: um .md que documenta a proibição não é DDL', () => {
    const r = checar('docs/regras.md', ['Nunca faça `create view vw_saude` — o prefixo vw_ é humano.'], ['docs/**']);
    expect(r.ok).toBe(true);
  });

  it('DESLIGADA: sem `prefixos_sem_ddl`, E não acusa nada', () => {
    const cfg = {
      ...cfgActus,
      zona_proibida: { no_write_paths: [], no_write_tables: [] },
    };
    const r = checar('supabase/migrations/0250_x.sql', ['create or replace view vw_saude as select 1;'], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });
});

// ─── E · o que a MIGRAÇÃO faz com `no_write_prefixes` ────────────────────────

describe('regra E na tabela de config: no_write_prefixes → prefixos_sem_ddl', () => {
  it('a tabela conhece o renome, e o destino é o nome que o motor lê', () => {
    const r = RENOMES.find((x) => x.de === 'zona_proibida.no_write_prefixes');
    expect(r?.para).toBe('zona_proibida.prefixos_sem_ddl');
  });

  it('o valor é COPIADO e o nome antigo FICA (regra 1 da tabela)', () => {
    const { proposto } = propor({
      $schema_versao: 1,
      gates: [],
      zona_proibida: { no_write_paths: [], no_write_tables: 'TODAS', no_write_prefixes: ['vw_'] },
    });
    const o = JSON.parse(proposto);
    expect(o.zona_proibida.no_write_prefixes).toEqual(['vw_']);
    expect(o.zona_proibida.prefixos_sem_ddl).toEqual(['vw_']);
  });

  it('CONSEQUÊNCIA no CI, dita alto: migrar o config de lá LIGA a regra E com supabase_/auth_', () => {
    // O CI declara `no_write_prefixes: ["supabase_", "auth_"]` e o comentário do
    // arquivo os chama de "redundante dado no_write_tables=TODAS; registrados
    // para que um leitor que só olhe prefixos ainda acerte". A regra 3 (`TODAS`)
    // NÃO cobre DDL, então a regra E não é redundante — ela passa a valer. Isto
    // é mudança de veredito, e por isso está num caso de teste e na linha do
    // relatório do `--dry-run`, e não escondida no diff da tabela.
    const cru = JSON.parse(readFileSync(join(RAIZ, '_referencia-ci', '000-config.ci.json'), 'utf8'));
    expect(cru.zona_proibida.prefixos_sem_ddl).toBeUndefined();
    const { proposto, linhas } = propor(cru);
    const o = JSON.parse(proposto);
    expect(o.zona_proibida.prefixos_sem_ddl).toEqual(['supabase_', 'auth_']);
    expect(linhas.some((l: string) => l.includes('zona_proibida.prefixos_sem_ddl'))).toBe(true);
  });
});

// ─── F · padrões proibidos no diff ───────────────────────────────────────────

describe('regra F — enforcement.padroes_proibidos_no_diff (as três regexes do Actus)', () => {
  it('F mau: UPDATE tenant_id em comercial.messages reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ["update comercial.messages set tenant_id = 'x' where id = 1;"], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F mau: session_replication_role reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['set session_replication_role = replica;'], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F mau: DELETE físico reprova', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['delete from comercial.suggestions where id = 1;'], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F bom: soft delete (set deleted_at) passa', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['update comercial.suggestions set deleted_at = now() where id = 1;'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('F: a violação NOMEIA o padrão e carrega o motivo escrito no config', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['set session_replication_role = replica;'], ['supabase/migrations/**']);
    const v = r.violations.find((x) => x.tipo === 'padrao_proibido');
    expect(v?.detalhe).toContain('session_replication_role');
    expect(v?.detalhe).toContain('Desliga triggers/RLS');
  });

  it('regex que não compila vira violação PRÓPRIA, e não silêncio', () => {
    // Fail-closed pelo lado certo: uma regex quebrada não pode virar "nenhum
    // padrão casou". O Actus faz o mesmo (`enforcement.mjs:283`), e o tipo
    // separado é o que distingue "o diff violou" de "o config está quebrado".
    const cfg = { ...cfgActus, enforcement: { padroes_proibidos_no_diff: [{ nome: 'quebrada', regex: '(?i)[a-' }] } };
    const r = checar('supabase/migrations/0250_x.sql', ['select 1;'], ['supabase/migrations/**'], cfg);
    expect(tem(r, 'padrao_regex_invalida')).toBe(true);
  });

  it('PROSA nunca reprova: um .md que cita session_replication_role não é execução', () => {
    const r = checar('docs/regras.md', ['Nunca use `set session_replication_role = replica` — é ferramenta de humano.'], ['docs/**']);
    expect(r.ok).toBe(true);
  });

  it('DESLIGADA: sem `enforcement.padroes_proibidos_no_diff`, F não acusa nada', () => {
    const cfg = { ...cfgActus, enforcement: undefined };
    const r = checar('supabase/migrations/0250_x.sql', ['delete from comercial.suggestions where id = 1;'], ['supabase/migrations/**'], cfg);
    expect(r.ok).toBe(true);
  });
});

// ─── F(regressão) · `[^;]*` atravessava SET→WHERE ────────────────────────────
// O padrão existe para pegar REANCORAGEM (tenant_id ATRIBUÍDO no SET), mas o
// `[^;]*` da forma antiga cruzava a fronteira da cláusula: `set deleted_at =
// now() where tenant_id = $1` casava, com tenant_id só na WHERE. Achado pelo
// ticket 615 do Actus, que exercitou o enforcement com SQL real.
//
// O Actus escreveu estes casos em `supabase/tests/*.test.sql`, porque foi de lá
// que o SQL saiu. Aqui o arquivo é uma migration na faixa, para que o caso
// julgue SÓ a regra F: a exceção de teste-SQL é a peça K11a-4c, e é lá que os
// mesmos arquivos voltam ao caminho original.

describe('regra F — a regressão do [^;]* entre SET e WHERE', () => {
  it('F mau: UPDATE que ATRIBUI tenant_id continua reprovando (o alvo da regra)', () => {
    const r = checar('supabase/migrations/0250_reancora.sql', ["update comercial.messages set tenant_id = 'x';"], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F mau: SET tenant_id = x WHERE tenant_id = y continua reprovando', () => {
    const r = checar('supabase/migrations/0250_reancora2.sql', ['update comercial.messages set tenant_id = $1 where tenant_id = $2;'], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F mau: SET tenant_id com quebra de linha e caixa mista continua reprovando', () => {
    const r = checar('supabase/migrations/0250_reancora3.sql', ['UPDATE comercial.messages', '  SET', '    tenant_id = $1', '  WHERE id = $2;'], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F mau: alias (UPDATE ... AS m SET tenant_id) continua reprovando', () => {
    const r = checar('supabase/migrations/0250_reancora4.sql', ['update comercial.messages as m set tenant_id = $1 where m.id = $2;'], ['supabase/migrations/**']);
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });

  it('F bom: soft delete em comercial.messages com tenant_id só na WHERE passa', () => {
    const r = checar(
      'supabase/migrations/0250_soft_delete.sql',
      ['update comercial.messages', '   set deleted_at = now()', ' where tenant_id = v_tenant', '   and id = v_msg;'],
      ['supabase/migrations/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('F bom: WHERE em caixa mista e comentário `--` entre SET e WHERE passam', () => {
    const r = checar(
      'supabase/migrations/0250_soft_delete2.sql',
      ['update comercial.messages set deleted_at = now() -- não toca tenant_id', ' WhErE tenant_id = $1;'],
      ['supabase/migrations/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('F bom: múltiplas colunas no SET, tenant_id só na WHERE, passa', () => {
    const r = checar(
      'supabase/migrations/0250_soft_delete3.sql',
      ['update comercial.messages set deleted_at = now(), updated_at = now() where tenant_id = $1;'],
      ['supabase/migrations/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('o caso de regressão FALHA com a regex antiga — é isso que ele mede', () => {
    // Sem esta metade, o caso acima passaria com QUALQUER regex que não casasse
    // o soft delete, inclusive uma que não pegasse mais a reancoragem. Aqui o
    // MESMO diff é auditado com a forma antiga e com a atual: a antiga acusa
    // (falso positivo), a atual não, e as duas continuam pegando a reancoragem.
    const linhas = ['update comercial.messages set deleted_at = now() where tenant_id = $1;'];
    const antiga = {
      ...cfgActus,
      enforcement: { padroes_proibidos_no_diff: [{ nome: 'update_tenant_id_messages_particionada', regex: REGEX_ANTIGA_TENANT_ID }] },
    };
    const comAntiga = checar('supabase/migrations/0250_soft_delete.sql', linhas, ['supabase/migrations/**'], antiga);
    expect(tem(comAntiga, 'padrao_proibido')).toBe(true);

    const comAtual = checar('supabase/migrations/0250_soft_delete.sql', linhas, ['supabase/migrations/**']);
    expect(tem(comAtual, 'padrao_proibido')).toBe(false);

    const reancoragem = ["update comercial.messages set tenant_id = 'x';"];
    expect(tem(checar('supabase/migrations/0250_r.sql', reancoragem, ['supabase/migrations/**'], antiga), 'padrao_proibido')).toBe(true);
    expect(tem(checar('supabase/migrations/0250_r.sql', reancoragem, ['supabase/migrations/**']), 'padrao_proibido')).toBe(true);
  });
});

// ─── F · o que a MIGRAÇÃO faz com `padroes_proibidos_no_diff` ───────────────

describe('regra F na tabela de config: zona_proibida → enforcement', () => {
  it('a tabela conhece o renome, e o destino é o nome que o motor lê', () => {
    const r = RENOMES.find((x) => x.de === 'zona_proibida.padroes_proibidos_no_diff');
    expect(r?.para).toBe('enforcement.padroes_proibidos_no_diff');
  });

  it('as três regexes do Actus viajam BYTE A BYTE, e o nome antigo FICA', () => {
    // Reescrever uma regex numa migração é reescrever a proibição. O caso
    // compara caractere a caractere, não "compila igual".
    const { proposto } = propor({
      $schema_versao: 1,
      gates: [],
      zona_proibida: { no_write_paths: [], no_write_tables: 'TODAS', padroes_proibidos_no_diff: PADROES_ACTUS },
    });
    const o = JSON.parse(proposto);
    expect(o.zona_proibida.padroes_proibidos_no_diff).toEqual(PADROES_ACTUS);
    expect(o.enforcement.padroes_proibidos_no_diff).toEqual(PADROES_ACTUS);
    for (let i = 0; i < PADROES_ACTUS.length; i++) {
      expect(o.enforcement.padroes_proibidos_no_diff[i].regex).toBe(PADROES_ACTUS[i]!.regex);
    }
  });

  it('o config migrado do Actus REPROVA o que o motor de lá reprovava hoje', () => {
    // O fecho da peça: o Actus deixa de perder a regra F ao trocar de motor.
    const { proposto } = propor({
      $schema_versao: 1,
      gates: [],
      migrations_dir: 'supabase/migrations',
      zona_proibida: { no_write_paths: [], no_write_tables: [], padroes_proibidos_no_diff: PADROES_ACTUS },
    });
    const cfg = JSON.parse(proposto) as EnforceConfig;
    const arq = 'supabase/migrations/0250_x.sql';
    const r = enforce({
      changedFiles: [arq],
      allowlist: ['supabase/migrations/**'],
      diff: diffNovoArquivo(arq, ['delete from comercial.suggestions where id = 1;']),
      config: cfg,
    });
    expect(r.violations.some((v) => v.tipo === 'padrao_proibido')).toBe(true);
  });
});

// ─── exceção estreita · supabase/tests/*.test.sql ───────────────────────────
// As 4 condições do `checarTesteSql` do Actus (`enforcement.mjs:147-173`):
// nome `.test.sql`; bloco `DO` com `$$` (tag que aceita DÍGITO); `RAISE
// EXCEPTION` (o rollback proposital); e ZERO DDL/DML de TOPO fora do DO, com o
// comentário `--` removido antes. Qualquer uma que falhe reprova, e o detalhe
// cita a condição.

describe('exceção de teste-SQL — enforcement.testes_sql (as 4 condições)', () => {
  it('teste-sql bom: DO $$ ... RAISE EXCEPTION, sem DDL/DML de topo, passa', () => {
    const r = checar(
      'supabase/tests/analises_rollback.test.sql',
      [
        'DO $$',
        'BEGIN',
        '  IF 1 <> 1 THEN',
        "    RAISE EXCEPTION 'inalcançável';",
        '  END IF;',
        '  INSERT INTO comercial.analyses (id) VALUES (1);',
        "  RAISE EXCEPTION 'rollback proposital: teste ok';",
        'END $$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('teste-sql mau: sem RAISE EXCEPTION bloqueia', () => {
    const r = checar('supabase/tests/sem_rollback.test.sql', ['DO $$', 'BEGIN', '  PERFORM 1;', 'END $$;'], ['supabase/tests/**']);
    expect(r.ok).toBe(false);
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: CREATE TABLE no topo (fora do DO) bloqueia', () => {
    const r = checar(
      'supabase/tests/cria_tabela.test.sql',
      ['CREATE TABLE public.foo (id int);', 'DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: INSERT de topo (fora do DO) bloqueia', () => {
    const r = checar(
      'supabase/tests/insere_fora.test.sql',
      ['INSERT INTO comercial.analyses (id) VALUES (1);', 'DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: CREATE UNIQUE INDEX de topo (fora do DO) bloqueia', () => {
    const r = checar(
      'supabase/tests/indice_unico.test.sql',
      ['CREATE UNIQUE INDEX idx_foo ON public.foo (bar);', 'DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: CREATE MATERIALIZED VIEW de topo (fora do DO) bloqueia', () => {
    const r = checar(
      'supabase/tests/view_materializada.test.sql',
      ['CREATE MATERIALIZED VIEW public.foo_mv AS SELECT 1;', 'DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: nome sem sufixo .test.sql bloqueia', () => {
    const r = checar(
      'supabase/tests/qualquer.sql',
      ['DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql mau: sem bloco DO $$ bloqueia (só RAISE não basta)', () => {
    const r = checar(
      'supabase/tests/sem_do.test.sql',
      ['SELECT 1;', '-- RAISE EXCEPTION fora de qualquer bloco DO não conta'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'teste_sql_invalido')).toBe(true);
  });

  it('teste-sql: .sql em outro diretório (fora de migrations e de tests) segue bloqueado', () => {
    const r = checar(
      'supabase/outro/x.test.sql',
      ['DO $$', 'BEGIN', "  RAISE EXCEPTION 'rollback proposital';", 'END $$;'],
      ['supabase/outro/**'],
    );
    expect(tem(r, 'migration_fora_do_dir')).toBe(true);
  });

  it('teste-sql: migration normal na faixa continua passando mesmo com a exceção presente', () => {
    const r = checar('supabase/migrations/0250_x.sql', ['create table foo();'], ['supabase/migrations/**']);
    expect(r.ok).toBe(true);
  });

  it('teste-sql bom: dollar-quote COM TAG contendo dígitos ($teste_0250$) passa', () => {
    const r = checar(
      'supabase/tests/0250_monitor_whatsapp_estado.test.sql',
      ['do $teste_0250$', 'begin', "  raise exception 'RESULTADO >>> ok=1';", 'end', '$teste_0250$;'],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('teste-sql bom: DDL/DML DENTRO do bloco DO com tag é permitido (corpo é removido)', () => {
    const r = checar(
      'supabase/tests/0251_painel_funcoes_mt.test.sql',
      [
        'do $teste_0251$',
        'begin',
        '  create table pg_temp.sintetico (id uuid);',
        '  insert into pg_temp.sintetico (id) values (gen_random_uuid());',
        "  raise exception 'RESULTADO >>> isolamento=ok';",
        'end',
        '$teste_0251$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('teste-sql bom: DDL/DML citado em comentário `--` não conta como topo', () => {
    const r = checar(
      'supabase/tests/0252_fn_resolver_contato.test.sql',
      [
        '-- (passo 4 "Enriquecimento": UPDATE só roda quando algo de fato muda, e',
        '--      executa o UPDATE quando telefone/origem/nome de fato mudariam).',
        '-- Nada aqui faz INSERT INTO nem CREATE TABLE de verdade.',
        'do $teste_0252$',
        'begin',
        "  raise exception 'RESULTADO >>> nome_curado=sobreviveu';",
        'end',
        '$teste_0252$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('teste-sql mau: CREATE TABLE de topo REAL continua bloqueando (mesmo com tag)', () => {
    const r = checar(
      'supabase/tests/clandestina.test.sql',
      ['create table public.clandestina (id int);', 'do $teste_x$', 'begin', "  raise exception 'rollback proposital';", 'end', '$teste_x$;'],
      ['supabase/tests/**'],
    );
    const v = r.violations.find((x) => x.tipo === 'teste_sql_invalido');
    expect(v).toBeTruthy();
    expect(v?.detalhe).toMatch(/DDL de topo/i);
  });

  it('teste-sql mau: DML de topo REAL (fora de comentário) continua bloqueando', () => {
    const r = checar(
      'supabase/tests/dml_topo.test.sql',
      [
        '-- este comentário fala de INSERT INTO mas não executa nada',
        'insert into comercial.contacts (id) values (gen_random_uuid());',
        'do $teste_y$',
        'begin',
        "  raise exception 'rollback proposital';",
        'end',
        '$teste_y$;',
      ],
      ['supabase/tests/**'],
    );
    const v = r.violations.find((x) => x.tipo === 'teste_sql_invalido');
    expect(v).toBeTruthy();
    expect(v?.detalhe).toMatch(/DML de topo/i);
  });

  it('teste-sql mau: tag mal formada ($0250$, começa com dígito) NÃO é dollar-quote válida', () => {
    const r = checar(
      'supabase/tests/tag_invalida.test.sql',
      ['do $0250$', 'begin', "  raise exception 'x';", 'end', '$0250$;'],
      ['supabase/tests/**'],
    );
    const v = r.violations.find((x) => x.tipo === 'teste_sql_invalido');
    expect(v).toBeTruthy();
    expect(v?.detalhe).toMatch(/sem bloco DO/i);
  });

  it('a exceção TIRA o arquivo da regra B: um teste-SQL válido não vira migration_fora_do_dir', () => {
    const r = checar(
      'supabase/tests/0250_ok.test.sql',
      ['do $teste_0250$', 'begin', "  raise exception 'ok';", 'end', '$teste_0250$;'],
      ['supabase/tests/**'],
    );
    expect(r.violations.filter((v) => v.tipo.startsWith('migration_'))).toEqual([]);
  });

  it('DESLIGADA: sem `enforcement.testes_sql`, o .sql de teste cai na regra B como qualquer outro', () => {
    const cfg = { ...cfgActus, enforcement: { padroes_proibidos_no_diff: PADROES_ACTUS } };
    const r = checar(
      'supabase/tests/0250_ok.test.sql',
      ['do $teste_0250$', 'begin', "  raise exception 'ok';", 'end', '$teste_0250$;'],
      ['supabase/tests/**'],
      cfg,
    );
    expect(tem(r, 'migration_fora_do_dir')).toBe(true);
    expect(tem(r, 'teste_sql_invalido')).toBe(false);
  });
});

// ─── F + exceção juntas, nos caminhos ORIGINAIS do Actus ────────────────────
// Os três casos "F bom" do `enforcement.test.mjs` moram em
// `supabase/tests/*.test.sql`, e só passam quando as DUAS regras concordam: a
// regex nova não casa o soft delete E o arquivo satisfaz as 4 condições. É o
// caso de ponta a ponta do ticket 615.

describe('F + exceção de teste-SQL nos caminhos originais do Actus', () => {
  it('F bom: soft delete em comercial.messages com tenant_id só na WHERE passa', () => {
    const r = checar(
      'supabase/tests/soft_delete.test.sql',
      [
        'do $teste_0250$',
        'begin',
        '  update comercial.messages',
        '     set deleted_at = now()',
        '   where tenant_id = v_tenant',
        '     and id = v_msg;',
        "  raise exception 'RESULTADO >>> a4=ok';",
        'end',
        '$teste_0250$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('F bom: WHERE em caixa mista e comentário `--` entre SET e WHERE passam', () => {
    const r = checar(
      'supabase/tests/soft_delete2.test.sql',
      [
        'do $teste_0251$',
        'begin',
        '  update comercial.messages set deleted_at = now() -- não toca tenant_id',
        '   WhErE tenant_id = $1;',
        "  raise exception 'RESULTADO >>> ok';",
        'end',
        '$teste_0251$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('F bom: múltiplas colunas no SET, tenant_id só na WHERE, passa', () => {
    const r = checar(
      'supabase/tests/soft_delete3.test.sql',
      [
        'do $teste_0252$',
        'begin',
        '  update comercial.messages set deleted_at = now(), updated_at = now() where tenant_id = $1;',
        "  raise exception 'RESULTADO >>> ok';",
        'end',
        '$teste_0252$;',
      ],
      ['supabase/tests/**'],
    );
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('F mau: UPDATE que ATRIBUI tenant_id reprova mesmo dentro de um teste-SQL válido', () => {
    const r = checar(
      'supabase/tests/reancora.test.sql',
      ['do $teste_0250$', 'begin', "  update comercial.messages set tenant_id = 'x';", "  raise exception 'ok';", 'end', '$teste_0250$;'],
      ['supabase/tests/**'],
    );
    expect(tem(r, 'padrao_proibido')).toBe(true);
  });
});

// ─── K11a-4d · o config REAL do Actus, e o `migrations.dir` ─────────────────

describe('config real do actus-saas em fixture (K11a-4d)', () => {
  const ACTUS = join(RAIZ, 'test', 'fixtures', 'config', 'actus-000-config.json');
  const cru = () => JSON.parse(readFileSync(ACTUS, 'utf8'));

  it('as três regexes deste arquivo de teste são as do config real, CARACTERE A CARACTERE', () => {
    // Fecha a K11a-4b: "copiadas byte a byte" deixa de ser uma frase do commit
    // e vira um caso. "Compila igual" não é o mesmo que "é igual" — uma regex
    // reescrita na travessia é uma proibição reescrita.
    const doDisco = cru().zona_proibida.padroes_proibidos_no_diff;
    expect(doDisco).toEqual(PADROES_ACTUS);
    for (let i = 0; i < PADROES_ACTUS.length; i++) {
      expect(doDisco[i].regex).toBe(PADROES_ACTUS[i]!.regex);
      expect(doDisco[i].nome).toBe(PADROES_ACTUS[i]!.nome);
    }
  });

  it('a tabela conhece o renome migrations_dir → migrations.dir', () => {
    const r = RENOMES.find((x) => x.de === 'migrations_dir' && x.para === 'migrations.dir');
    expect(r).toBeTruthy();
    expect(r?.so_quando).toBe('migrations_faixa_loop');
  });

  it('o proposto do Actus traz migrations.dir, e `orq config` não acusa mais faixa sem dir', () => {
    // O achado do `--dry-run` da etapa 6: a faixa migrava sozinha e o dir ficava
    // para trás, então a regra B não mordia arquivo nenhum — o pior estado, com
    // o config DIZENDO que a faixa está protegida.
    const { proposto } = propor(cru());
    const o = JSON.parse(proposto);
    expect(o.migrations.dir).toBe('supabase/migrations');
    expect(o.migrations.faixa).toBe('0250-0299');
    expect(o.migrations_dir).toBe('supabase/migrations'); // o nome antigo FICA
    expect(validarConfig(o).filter((v) => v.chave === 'migrations.dir')).toEqual([]);
  });

  it('e a regra B do Actus passa a MORDER: .sql fora do dir e fora da faixa reprovam', () => {
    const cfg = JSON.parse(propor(cru()).proposto) as EnforceConfig;
    const fora = enforce({
      changedFiles: ['src/lib/seed.sql'],
      allowlist: ['src/lib/**'],
      diff: diffNovoArquivo('src/lib/seed.sql', ['select 1;']),
      config: cfg,
    });
    expect(fora.violations.some((v) => v.tipo === 'migration_fora_do_dir')).toBe(true);
    const antiga = enforce({
      changedFiles: ['supabase/migrations/0187_x.sql'],
      allowlist: ['supabase/migrations/**'],
      diff: diffNovoArquivo('supabase/migrations/0187_x.sql', ['select 1;']),
      config: cfg,
    });
    expect(antiga.violations.some((v) => v.tipo === 'migration_fora_da_faixa')).toBe(true);
  });

  it('CONDICIONAL: repo sem `migrations_faixa_loop` NÃO ganha migrations.dir', () => {
    // A decisão da K11a-1, preservada: renomear `migrations_dir` de arrasto
    // ligaria a regra B em TODO repo que tem migration. Quem pede a regra é a
    // FAIXA; o dir só diz onde ela vale. Sem a faixa declarada, o renome não
    // acontece — e o config do CI é a prova viva.
    const ci = JSON.parse(readFileSync(join(RAIZ, '_referencia-ci', '000-config.ci.json'), 'utf8'));
    expect(ci.migrations_faixa_loop).toBeUndefined();
    expect(ci.migrations_dir).toBe('supabase/migrations');
    const o = JSON.parse(propor(ci).proposto);
    expect(o.migrations).toBeUndefined();
    expect(o.migrations_dir).toBe('supabase/migrations');
  });

  it('o CI migrado continua com a regra B DESLIGADA: .sql fora do dir passa', () => {
    const ci = JSON.parse(readFileSync(join(RAIZ, '_referencia-ci', '000-config.ci.json'), 'utf8'));
    const cfg = JSON.parse(propor(ci).proposto) as EnforceConfig;
    const r = enforce({
      changedFiles: ['src/lib/seed.sql'],
      allowlist: ['src/lib/**'],
      diff: diffNovoArquivo('src/lib/seed.sql', ['select 1;']),
      config: cfg,
    });
    expect(r.violations.filter((v) => v.tipo.startsWith('migration_'))).toEqual([]);
  });

  it('ACHADO: `zona_proibida` sem `no_write_paths` não derruba a barreira', () => {
    // A `zona_proibida` do Actus é uma fronteira de BANCO — tabelas, colunas,
    // prefixos, padrões — e nunca teve lista de caminho. `no_write_paths` não é
    // chave obrigatória em `config-chaves.ts`, então o config estava certo e o
    // motor errado: o spread de `undefined` derrubava o `enforce` inteiro com um
    // TypeError, antes de qualquer regra rodar. Lista ausente é lista VAZIA.
    const cfg = JSON.parse(propor(cru()).proposto) as EnforceConfig;
    expect(cfg.zona_proibida.no_write_paths).toBeUndefined();
    const r = enforce({
      changedFiles: ['src/lib/x.ts'],
      allowlist: ['src/lib/**'],
      diff: diffNovoArquivo('src/lib/x.ts', ['export const x = 1']),
      config: cfg,
    });
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('a linha do relatório avisa sobre os testes .sql fora do dir', () => {
    // A regra B ligada reprova `supabase/tests/*.test.sql` por
    // `migration_fora_do_dir` enquanto ninguém declarar `enforcement.testes_sql`
    // — e o Actus TEM esses testes. O aviso mora onde um humano vai ler antes de
    // aplicar: a linha do renome, no relatório do `--dry-run`.
    const { linhas } = propor(cru());
    const l = linhas.find((x: string) => x.includes('migrations_dir → migrations.dir'));
    expect(l).toBeTruthy();
    expect(l).toMatch(/enforcement\.testes_sql/);
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
    it(`${nome}: nenhuma das chaves novas existe, então B/C/D/E/F nascem desligadas`, () => {
      const cru = JSON.parse(readFileSync(caminho, 'utf8')) as EnforceConfig;
      expect(cru.migrations).toBeUndefined();
      expect(cru.zona_proibida.colunas_congeladas).toBeUndefined();
      expect(cru.zona_proibida.schemas_permitidos).toBeUndefined();
      expect(cru.zona_proibida.tabelas_permitidas).toBeUndefined();
      expect(cru.zona_proibida.prefixos_sem_ddl).toBeUndefined();
      expect(cru.enforcement).toBeUndefined();
      // O nome v1 do Actus não está no tipo (o motor não o lê) — a asserção é
      // sobre o JSON cru, e é ela que prova que o CI também não o tem.
      const zpCru = (JSON.parse(readFileSync(caminho, 'utf8')) as { zona_proibida: Record<string, unknown> }).zona_proibida;
      expect(zpCru.padroes_proibidos_no_diff).toBeUndefined();
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

    it(`${nome}: DDL de objeto com o prefixo que o config JÁ declara segue passando (E desligada)`, () => {
      const cru = JSON.parse(readFileSync(caminho, 'utf8')) as EnforceConfig;
      const arq = 'src/lib/x.ts';
      const r = enforce({
        changedFiles: [arq],
        allowlist: ['src/lib/**'],
        diff: diffNovoArquivo(arq, ['await sql(`create table supabase_x (id int)`)']),
        config: cru,
      });
      expect(r.violations.filter((v) => v.tipo === 'prefixo_sem_ddl')).toEqual([]);
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
