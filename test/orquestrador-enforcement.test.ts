/**
 * ORQ-03 — barreira de enforcement. Um caso POSITIVO (passa) e um NEGATIVO
 * (reprova) para cada uma das 5 regras, com diff sintético: nada toca o repo.
 *
 * A config vem do 000-config.json REAL — se a zona proibida mudar lá, estes
 * testes mudam de comportamento junto, que é o ponto de não hardcodar regra.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  enforce,
  pareceCredencial,
  ehArquivoDeMigration,
  ehArtefatoSql,
  dirsDeArtefatoSql,
  classificaArquivo,
} from '../scripts/orquestrador/enforcement-core.js';
import type { EnforceConfig, TipoViolacao } from '../scripts/orquestrador/enforcement-core.js';

const CONFIG_PATH = join(import.meta.dirname, 'fixtures', 'checkout', 'docs', 'fila', '000-config.json');
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as EnforceConfig;

/** Monta um diff unificado sintético para um arquivo. */
function diffDe(arquivo: string, ...linhas: string[]): string {
  return [`--- a/${arquivo}`, `+++ b/${arquivo}`, '@@ -0,0 +1 @@', ...linhas.map((l) => `+${l}`)].join('\n');
}

function rodar(arquivo: string, allowlist: string[], ...linhas: string[]) {
  return enforce({ changedFiles: [arquivo], allowlist, diff: diffDe(arquivo, ...linhas), config: cfg });
}

const tipos = (r: { violations: { tipo: TipoViolacao }[] }) => r.violations.map((x) => x.tipo);

// ─── Regra 1 · pathspec_allowlist ─────────────────────────────────────────

describe('regra 1 — pathspec_allowlist', () => {
  it('POSITIVO: arquivo dentro do escopo declarado passa', () => {
    const r = rodar('src/exemplo/a.ts', ['src/exemplo/**'], 'export const a = 1');
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: arquivo fora do escopo reprova', () => {
    const r = rodar('src/outro/b.ts', ['src/exemplo/**'], 'export const b = 1');
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('fora_do_pathspec');
  });
});

// ─── Regra 2 · no_write_paths ─────────────────────────────────────────────

describe('regra 2 — no_write_paths (zona proibida por caminho)', () => {
  it('POSITIVO: arquivo comum, fora da zona, passa', () => {
    const r = rodar('src/lib/util.ts', ['src/**'], 'export const x = 1');
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: .github/workflows/** reprova', () => {
    const r = rodar('.github/workflows/ci.yml', ['**'], 'name: CI');
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('zona_proibida');
  });

  it('NEGATIVO: .env reprova mesmo declarado no allowlist do ticket', () => {
    const r = rodar('.env.local', ['.env.local'], 'FOO=1');
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('zona_proibida');
  });

  it('NEGATIVO: apps/web/DESIGN.md reprova', () => {
    expect(rodar('apps/web/DESIGN.md', ['**'], '# design').ok).toBe(false);
  });

  it('NEGATIVO: docs/orquestrador/** reprova', () => {
    expect(rodar('docs/orquestrador/PLAYBOOK.md', ['**'], '# playbook').ok).toBe(false);
  });
});

// ─── Regra 3 · no_write_tables: TODAS ─────────────────────────────────────

describe('regra 3 — no_write_tables TODAS (nenhuma escrita em banco)', () => {
  it('POSITIVO: LEITURA em tabela passa (select não é escrita)', () => {
    const r = rodar('src/repo.ts', ['src/**'], "const { data } = await client.from('roteiros').select('*')");
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: .from(...).insert(...) reprova', () => {
    const r = rodar('src/seed.ts', ['src/**'], "await client.from('roteiros').insert({ id: 1 })");
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('NEGATIVO: update/delete/upsert também reprovam', () => {
    for (const op of ['update', 'delete', 'upsert']) {
      const r = rodar('src/seed.ts', ['src/**'], `await client.from('personas').${op}({})`);
      expect(tipos(r)).toContain('escrita_em_banco');
    }
  });

  it('NEGATIVO: DML cru num script de seed reprova', () => {
    const r = rodar('scripts/seed.ts', ['scripts/**'], "await run('INSERT INTO personas (id) VALUES (1)')");
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('NEGATIVO: mutação na janela seguinte ao .from() reprova (encadeamento em várias linhas)', () => {
    const r = rodar('src/seed.ts', ['src/**'], "await client.from('angulos')", '  .insert({ id: 2 })');
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('POSITIVO: prosa que MENCIONA insert não reprova (documentação não executa)', () => {
    const r = rodar('docs/notas.md', ['docs/**'], "nunca faça client.from('roteiros').insert({})");
    expect(r.ok).toBe(true);
  });
});

// ─── Regra 4 · politica_schema: produzir_e_parar ──────────────────────────

describe('regra 4 — escrever .sql PODE, aplicar NÃO', () => {
  it('POSITIVO: adicionar supabase/migrations/0025_x.sql PASSA, com DDL dentro', () => {
    const r = rodar(
      'supabase/migrations/0025_x.sql',
      ['supabase/migrations/**'],
      'CREATE TABLE roteiro_tags (id uuid PRIMARY KEY);',
      'ALTER TABLE roteiros ADD COLUMN tag_id uuid;',
    );
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: script chamando "supabase db push" REPROVA', () => {
    const r = rodar('scripts/aplicar.sh', ['scripts/**'], 'supabase db push --linked');
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('aplica_migration');
  });

  it('NEGATIVO: psql aplicando o .sql reprova', () => {
    const r = rodar('scripts/aplicar.sh', ['scripts/**'], 'psql "$DB_URL" -f supabase/migrations/0025_x.sql');
    expect(tipos(r)).toContain('aplica_migration');
  });

  it('NEGATIVO: MCP do Supabase aplicando migration reprova', () => {
    const r = rodar('scripts/x.ts', ['scripts/**'], 'await mcp__claude_ai_Supabase__apply_migration({})');
    expect(tipos(r)).toContain('aplica_migration');
  });

  it('NEGATIVO: execute_sql reprova', () => {
    expect(tipos(rodar('scripts/x.ts', ['scripts/**'], 'await execute_sql(sql)'))).toContain('aplica_migration');
  });

  it('o .sql de migration e o comando que o aplica NÃO se confundem', () => {
    const sql = rodar('supabase/migrations/0025_x.sql', ['supabase/migrations/**'], 'CREATE TABLE t (id int);');
    const cmd = rodar('scripts/aplicar.sh', ['scripts/**'], 'supabase db push');
    expect([sql.ok, cmd.ok]).toEqual([true, false]);
  });

  it('ehArquivoDeMigration só aceita .sql sob o migrations_dir do config', () => {
    expect(ehArquivoDeMigration('supabase/migrations/0025_x.sql', cfg.migrations_dir)).toBe(true);
    expect(ehArquivoDeMigration('src/0025_x.sql', cfg.migrations_dir)).toBe(false);
    expect(ehArquivoDeMigration('supabase/migrations/leia.md', cfg.migrations_dir)).toBe(false);
  });
});

// ─── Regra 4b · ORQ-11: docs/sql-pendente/ é ARTEFATO ─────────────────────
// O falso positivo real: o ticket 002 mandou produzir
// docs/sql-pendente/002-remove-usuarios-e2e.sql com um DELETE dentro, e a
// barreira reprovou por 'escrita_em_banco' citando o conteúdo do próprio
// artefato que ela pediu. A regra só conhecia supabase/migrations/.

describe('regra 4b — .sql sob sql_pendente_dir é artefato, não escrita em banco', () => {
  const SQL_DIR = cfg.sql_pendente_dir!;
  const ARQUIVO = `${SQL_DIR}/002-remove-usuarios-e2e.sql`;
  const DELETE_REAL =
    "DELETE FROM auth.users WHERE id IN ('8f8f11f5-bca4-41f6-ab75-cd84da223d29', '4fa6e658-c20b-4caf-bf4d-2928f6ed3655');";

  it('o config REGISTRA o caminho junto do migrations_dir (nada hardcoded no core)', () => {
    expect(cfg.sql_pendente_dir).toBeTruthy();
    expect(dirsDeArtefatoSql(cfg)).toEqual([cfg.migrations_dir, cfg.sql_pendente_dir]);
  });

  it('POSITIVO: .sql em docs/sql-pendente/ com DELETE FROM PASSA', () => {
    const r = rodar(
      ARQUIVO,
      [ARQUIVO],
      '-- conferência antes do delete',
      "SELECT id, email FROM auth.users WHERE id IN ('8f8f11f5-bca4-41f6-ab75-cd84da223d29');",
      'BEGIN;',
      DELETE_REAL,
      'COMMIT;',
      '-- depois de aplicar: get_advisors security e performance',
    );
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: script chamando psql com o MESMO DELETE REPROVA', () => {
    const r = rodar('scripts/limpar-usuarios.sh', ['scripts/**'], `psql "$DB_URL" -c "${DELETE_REAL}"`);
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('aplica_migration');
  });

  it('NEGATIVO: os outros executores continuam reprovando com o mesmo DELETE', () => {
    const casos: [string, string][] = [
      ['scripts/x.sh', 'supabase db push --linked'],
      ['scripts/x.ts', `await mcp__claude_ai_Supabase__apply_migration({ query: "${DELETE_REAL}" })`],
      ['scripts/x.ts', `await execute_sql("${DELETE_REAL}")`],
      ['scripts/x.sh', 'npx prisma migrate deploy'],
    ];
    for (const [arq, linha] of casos) {
      expect(tipos(rodar(arq, ['scripts/**'], linha))).toContain('aplica_migration');
    }
  });

  it('NEGATIVO: o mesmo DELETE num .ts fora dos diretórios de artefato reprova por escrita_em_banco', () => {
    const r = rodar('scripts/limpar.ts', ['scripts/**'], `await run(\`${DELETE_REAL}\`)`);
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('NEGATIVO: .sql FORA dos diretórios de artefato não ganha o passe', () => {
    const r = rodar('scripts/limpar.sql', ['scripts/**'], DELETE_REAL);
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('ehArtefatoSql exige .sql E um dos dirs do config; ehArquivoDeMigration segue restrito ao migrations_dir', () => {
    const dirs = dirsDeArtefatoSql(cfg);
    expect(ehArtefatoSql(ARQUIVO, dirs)).toBe(true);
    expect(ehArtefatoSql(`${cfg.migrations_dir}/0025_x.sql`, dirs)).toBe(true);
    expect(ehArtefatoSql(`${SQL_DIR}/leia.md`, dirs)).toBe(false);
    expect(ehArtefatoSql('src/0025_x.sql', dirs)).toBe(false);
    // Prefixo parecido não é o diretório: 'docs/sql-pendente-rascunho/' não passa.
    expect(ehArtefatoSql(`${SQL_DIR}-rascunho/x.sql`, dirs)).toBe(false);
    expect(ehArquivoDeMigration(ARQUIVO, cfg.migrations_dir)).toBe(false);
  });
});

// ─── Regra 4c · ORQ-12: caminho antes de conteúdo ─────────────────────────
// O ORQ-11 ensinou o CORE a tratar docs/sql-pendente/ como artefato e mesmo
// assim o ticket 002 reprovou de novo, por DOIS defeitos que estes testes
// travam. Os fixtures abaixo são as 4 linhas REAIS citadas em
// docs/fila/runs/002/attempt-2/enforcement.json — copiadas do commit que
// reprovou, não reescritas.

describe('regra 4c — ORQ-12: o detector classifica o ARQUIVO antes de olhar o conteúdo', () => {
  const ARQUIVO = `${cfg.sql_pendente_dir}/002-remove-usuarios-e2e.sql`;

  /** As 4 linhas exatas do enforcement.json do attempt-2. */
  const LINHAS_QUE_REPROVARAM = [
    '-- aplicado por este processo — nada de psql, supabase db push, apply_migration',
    '-- ou execute_sql automatizado. A aplicação é humana, via MCP Supabase.',
    'insert into alvo_e2e (id) values',
    '  delete from auth.users',
  ];

  it('DEFEITO 1: comentário do .sql que CITA os comandos proibidos não é violação', () => {
    const r = rodar(ARQUIVO, [ARQUIVO], ...LINHAS_QUE_REPROVARAM);
    expect(r.violations).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it('um arquivo que DOCUMENTA a própria regra não vira violação por dizê-la', () => {
    // A regra inteira, escrita dentro do artefato que ela governa.
    const r = rodar(
      ARQUIVO,
      [ARQUIVO],
      '-- NUNCA aplicar por psql, supabase db push, apply_migration, execute_sql',
      '-- nem prisma migrate deploy. A aplicação é humana, via MCP Supabase.',
    );
    expect(r.violations).toEqual([]);
  });

  it('classificaArquivo decide SÓ pelo caminho: artefato_sql | prosa | executavel', () => {
    expect(classificaArquivo(ARQUIVO, cfg)).toBe('artefato_sql');
    expect(classificaArquivo(`${cfg.migrations_dir}/0025_x.sql`, cfg)).toBe('artefato_sql');
    expect(classificaArquivo('docs/nota.md', cfg)).toBe('prosa');
    expect(classificaArquivo('scripts/aplicar.sh', cfg)).toBe('executavel');
    expect(classificaArquivo('scripts/x.ts', cfg)).toBe('executavel');
    // .sql FORA dos dirs de artefato NÃO ganha o passe — continua executável.
    expect(classificaArquivo('scripts/limpar.sql', cfg)).toBe('executavel');
  });

  it('a classe do artefato NÃO depende de politica_schema (é o lugar, não a política)', () => {
    const outraPolitica = {
      ...cfg,
      politica_schema: { comportamento_vigente: 'qualquer_outra_coisa' },
    } as EnforceConfig;
    expect(classificaArquivo(ARQUIVO, outraPolitica)).toBe('artefato_sql');
    const r = enforce({
      changedFiles: [ARQUIVO],
      allowlist: [ARQUIVO],
      diff: diffDe(ARQUIVO, ...LINHAS_QUE_REPROVARAM),
      config: outraPolitica,
    });
    expect(r.violations).toEqual([]);
  });

  it('CONTRAPROVA: script .ts com execute_sql e o MESMO delete REPROVA', () => {
    const r = rodar(
      'scripts/limpar-usuarios-e2e.ts',
      ['scripts/**'],
      "import { execute_sql } from './db.js'",
      '  delete from auth.users',
      'await execute_sql(DELETE_REAL)',
    );
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('aplica_migration');
    expect(tipos(r)).toContain('escrita_em_banco');
  });

  it('CONTRAPROVA: .sh/.js/.json com as mesmas linhas também reprovam', () => {
    for (const arq of ['scripts/x.sh', 'scripts/x.js', 'scripts/x.json']) {
      const r = rodar(arq, ['scripts/**'], 'psql "$DB_URL" -c "delete from auth.users"');
      expect(tipos(r)).toContain('aplica_migration');
    }
  });

  it('credencial dentro do artefato .sql AINDA reprova (a classe não isenta vazamento)', () => {
    const r = rodar(ARQUIVO, [ARQUIVO], "-- token = 'sk-ant-api03-AbCdEf0123456789GhIjKlMnOpQrStUv'");
    expect(tipos(r)).toContain('credencial');
  });
});

// ─── Regra 4d · ORQ-12: o TRANSPORTE do config até o core ─────────────────
// DEFEITO 2, e a razão de o ORQ-11 ter parecido verde. Estes testes leem o
// config do DISCO, então enxergavam sql_pendente_dir e passavam. A produção
// não: enforcement.sh montava o payload com uma projeção jq escrita à mão
// (`{migrations_dir, politica_schema, zona_proibida}`) que NÃO listava o campo
// novo. O core recebia sql_pendente_dir=null, docs/sql-pendente/ deixava de ser
// diretório de artefato e o artefato do 002 era auditado como se fosse script.
// Campo esquecido na projeção não dá erro — degrada calado.

describe('regra 4d — o config chega INTEIRO ao core (transporte)', () => {
  const SH = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'enforcement.sh');
  const sh = readFileSync(SH, 'utf8');

  /** O filtro jq que enforcement.sh usa para montar o campo `config` do payload. */
  const filtroConfig = (/--argjson config "\$\(cfg '([^']*)'\)"/.exec(sh) ?? [])[1];

  it('enforcement.sh monta o campo config com um filtro jq legível pelo teste', () => {
    expect(filtroConfig).toBeTruthy();
  });

  it('o payload REAL preserva todo diretório de artefato do config — nenhum some no caminho', () => {
    const transportado = JSON.parse(
      execFileSync('jq', [filtroConfig!, CONFIG_PATH], { encoding: 'utf8' }),
    ) as EnforceConfig;
    expect(dirsDeArtefatoSql(transportado)).toEqual(dirsDeArtefatoSql(cfg));
    expect(transportado.sql_pendente_dir).toBe(cfg.sql_pendente_dir);
  });

  it('o payload REAL classifica o artefato do 002 como artefato (era isto que quebrava)', () => {
    const transportado = JSON.parse(
      execFileSync('jq', [filtroConfig!, CONFIG_PATH], { encoding: 'utf8' }),
    ) as EnforceConfig;
    const arquivo = `${cfg.sql_pendente_dir}/002-remove-usuarios-e2e.sql`;
    expect(classificaArquivo(arquivo, transportado)).toBe('artefato_sql');
  });

  it('REGRESSÃO: com a projeção antiga o mesmo diff reprovava — prova de que o transporte é a falha', () => {
    const projecaoAntiga = JSON.parse(
      execFileSync('jq', ['{migrations_dir, politica_schema, zona_proibida}', CONFIG_PATH], {
        encoding: 'utf8',
      }),
    ) as EnforceConfig;
    const arquivo = `${cfg.sql_pendente_dir}/002-remove-usuarios-e2e.sql`;
    expect(projecaoAntiga.sql_pendente_dir).toBeUndefined();
    expect(classificaArquivo(arquivo, projecaoAntiga)).toBe('executavel');
  });
});


// ─── Regra 5 · credenciais ────────────────────────────────────────────────

describe('regra 5 — credenciais no diff', () => {
  it('POSITIVO: leitura de env, sem literal, passa', () => {
    const r = rodar('src/cfg.ts', ['src/**'], 'const key = process.env.ANTHROPIC_API_KEY');
    expect(r.ok).toBe(true);
  });

  it('POSITIVO: placeholder óbvio em fixture passa', () => {
    const r = rodar('test/fix.ts', ['test/**'], "const apiKey = '<sua-chave-aqui>'", "const token = 'test-token-123'");
    expect(r.ok).toBe(true);
  });

  it('NEGATIVO: chave sk-ant real reprova', () => {
    const r = rodar('src/cfg.ts', ['src/**'], "const k = 'sk-ant-api03-AbCdEf0123456789GhIjKlMnOpQrStUv'");
    expect(tipos(r)).toContain('credencial');
  });

  it('NEGATIVO: JWT (service-role) reprova', () => {
    const jwt = 'eyJhbGciOiJIUzI1NiJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.QWxnMTIzNDU2Nzg5MA';
    expect(tipos(rodar('src/cfg.ts', ['src/**'], `const s = '${jwt}'`))).toContain('credencial');
  });

  it('NEGATIVO: token do GitHub e chave AWS reprovam', () => {
    expect(pareceCredencial("t = 'ghp_" + 'a'.repeat(36) + "'")).toBe(true);
    expect(pareceCredencial("k = 'AKIAIOSFODNN7EXAMPLE'")).toBe(true);
  });

  it('NEGATIVO: reprova mesmo em teste/fixture', () => {
    const r = rodar('test/fixtures/creds.ts', ['test/**'], "export const secret = 'p7Kx9mQ2vL4nR8tW1zY6'");
    expect(r.ok).toBe(false);
    expect(tipos(r)).toContain('credencial');
  });

  it('NEGATIVO: credencial em prosa também reprova (vazamento é vazamento)', () => {
    const r = rodar('docs/nota.md', ['docs/**'], "a chave é sk-ant-api03-AbCdEf0123456789GhIjKlMnOpQrStUv");
    expect(tipos(r)).toContain('credencial');
  });
});

// ─── Regressão: diff limpo não inventa violação ───────────────────────────

describe('diff limpo', () => {
  it('não produz violação nenhuma', () => {
    const r = rodar('src/exemplo/a.ts', ['src/exemplo/**'], 'export function soma(a: number, b: number) {', '  return a + b', '}');
    expect(r).toEqual({ ok: true, violations: [] });
  });

  it('o cabeçalho +++ do diff não vira linha adicionada', () => {
    const r = enforce({
      changedFiles: ['src/a.ts'],
      allowlist: ['src/**'],
      diff: diffDe('src/a.ts', 'const a = 1'),
      config: cfg,
    });
    expect(r.violations).toEqual([]);
  });
});
