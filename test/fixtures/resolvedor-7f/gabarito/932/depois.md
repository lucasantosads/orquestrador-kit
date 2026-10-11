# Ticket 932: Foto mensal do ranking: proposta de DDL da tabela perf_ranking_foto_mensal

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

A variação de posição no mês (930) e a coluna "últimos 3 meses" da Avaliação (934) precisam de
uma foto do ranking no fim de cada mês. Este ticket só escreve a proposta versionada da tabela
`perf_ranking_foto_mensal` (prefixo `perf_`, do OS): uma linha por escopo (tese, nicho ou gestor),
por item e por mês, com as métricas em jsonb, o score, a posição e a marca de parcial.

**Aplicar é humano.** Depois de aplicar e conferir, o Lucas registra o token
`humano:ddl-ranking-foto-aplicada`, que destrava o 934 (Avaliação) e, junto com
`humano:cron-ranking-mensal`, o 933 (cron que grava a foto):

```
python3 scripts/roadmap/liberar.py ddl-ranking-foto-aplicada "20261009200000_perf_ranking_foto_mensal aplicada e conferida"
```

## Campos de máquina

```json
{
  "id": "932",
  "slug": "ranking-foto-mensal-ddl",
  "lane": "dados",
  "perfil": "sql-proposta",
  "objetivo": "ORCAMENTO DE DIFF: teto de 170 linhas (~55 no .sql NOVO supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql, ~100 no teste NOVO test/perf-ranking-foto-mensal-ddl.test.ts). Se passar do teto, pare e reporte. CONTEXTO: decisao do Lucas de 09/10 (frente Performance por nicho e tese): o ranking do periodo mostra a variacao de posicao no mes e a aba Avaliacao mostra os ultimos 3 meses por gestor; os dois leem uma foto mensal. A tabela nao existe no banco (conferido em 09/10). Este ticket SO escreve a proposta versionada; aplicar e humano, e o Lucas registra o token humano:ddl-ranking-foto-aplicada em docs/fila/liberacoes.json depois de aplicar e conferir (destrava o 933 e o 934). PASSO 1: leia supabase/migrations/20261008211455_perf_cliente_verba.sql (MOLDE EXATO: cabecalho, enable row level security, policy only_service_role guardada por pg_policies, revoke de anon e authenticated) e os testes que varrem a pasta (test/c0-guard.test.ts, test/migration-security-definer-anon.test.ts, test/migrations-cabecalho-aplicada.test.ts, test/migrations-policy-idempotente.test.ts, test/sync-log-status.test.ts). FAZER: (1) NOVO supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql: cabecalho com o que cria, por que (decisao de 09/10, tickets 930, 933 e 934), 'APLICAR E HUMANO. Este arquivo e so a proposta versionada.', quem aplica (o Lucas, nunca o loop), o token humano:ddl-ranking-foto-aplicada e a reversao (drop table public.perf_ranking_foto_mensal). NUNCA escreva 'nao aplicada' em nenhuma grafia (test/migrations-cabecalho-aplicada.test.ts proibe nas 5 primeiras linhas). Corpo, nesta ordem: create table if not exists public.perf_ranking_foto_mensal ( id uuid primary key default gen_random_uuid(), escopo text not null check (escopo in ('tese','nicho','gestor')), escopo_id uuid not null, mes date not null check (extract(day from mes) = 1), metricas jsonb not null, clientes integer not null check (clientes >= 0), score numeric, posicao integer check (posicao is null or posicao >= 1), parcial boolean not null default false, gerado_em timestamptz not null default now(), unique (escopo, escopo_id, mes) ); create index if not exists perf_ranking_foto_mensal_mes_idx on public.perf_ranking_foto_mensal (mes, escopo); alter table public.perf_ranking_foto_mensal enable row level security; policy only_service_role (for all to ‹segredo› using (true) with check (true)) dentro do do $$ que confere pg_policies, igual ao molde; revoke all on public.perf_ranking_foto_mensal from anon, authenticated;. Nada mais: sem funcao, trigger, view, grant a anon/authenticated nem tabela C0. (2) NOVO test/perf-ranking-foto-mensal-ddl.test.ts (readFileSync do .sql): cria a tabela com as 10 colunas; check do escopo com os 3 valores; unique (escopo, escopo_id, mes); RLS habilitada; policy so para ‹segredo›; revoke de anon e authenticated; cabecalho com 'APLICAR E HUMANO' e o token; nenhuma referencia a tabela C0 nem a vw_. FORA DE ESCOPO: aplicar (humano), codigo em src, cron, qualquer outra tabela. Zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*): nada de escrita nem DDL nelas. Motor do orquestrador intocado. Se um teste fora da allowlist quebrar, PARE e descreva.",
  "cria_novo": [
    "supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql",
    "test/perf-ranking-foto-mensal-ddl.test.ts"
  ],
  "pathspec_allowlist": [
    "supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql",
    "test/perf-ranking-foto-mensal-ddl.test.ts"
  ],
  "dependencias": [],
  "prioridade": 40,
  "recon_esperado": [
    {
      "descricao": "supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql ainda nao existe",
      "cmd": "test -e supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/perf-ranking-foto-mensal-ddl.test.ts ainda nao existe",
      "cmd": "test -e test/perf-ranking-foto-mensal-ddl.test.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "supabase/migrations/20261008211455_perf_cliente_verba.sql existe",
      "cmd": "test -e supabase/migrations/20261008211455_perf_cliente_verba.sql && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "nenhuma migration do repo cria perf_ranking_foto_mensal",
      "cmd": "n=$(grep -rl 'perf_ranking_foto_mensal' supabase/migrations | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SEM_TABELA || echo ST_$n",
      "espera": "SEM_TABELA"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "vercel.json intocado",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- vercel.json | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo VERCEL_INTOCADO || echo VERCEL_EDITADO",
      "espera": "VERCEL_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql test/perf-ranking-foto-mensal-ddl.test.ts | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 170 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 170 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "testes que varrem supabase/migrations seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/migration-security-definer-anon.test.ts test/migrations-cabecalho-aplicada.test.ts test/migrations-policy-idempotente.test.ts test/sync-log-status.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "um unico .sql novo, o da allowlist, e nenhum arquivo de src tocado",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; s=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); t=$(git diff --name-only \"$b\" HEAD -- src | wc -l | tr -d ' '); [ \"$s\" = 1 ] && [ \"$t\" = 0 ] && test -f supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql && echo SO_PROPOSTA || echo ST_${s}_${t}",
      "espera": "SO_PROPOSTA"
    },
    {
      "descricao": "o .sql cria a tabela com RLS, policy de ‹segredo› e revoke",
      "cmd": "f=supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql; test -f $f && c=$(grep -ci 'create table if not exists public.perf_ranking_foto_mensal' $f) && r=$(grep -ci 'enable row level security' $f) && p=$(grep -c 'only_service_role' $f) && v=$(grep -ciE 'revoke all on public.perf_ranking_foto_mensal from anon, authenticated' $f); [ \"$c\" = 1 ] && [ \"$r\" = 1 ] && [ \"$p\" -ge 1 ] && [ \"$v\" = 1 ] && echo TABELA_PROTEGIDA || echo ST_${c:-0}_${r:-0}_${p:-0}_${v:-0}",
      "espera": "TABELA_PROTEGIDA"
    },
    {
      "descricao": "cabecalho de proposta humana com o token, sem marcador proibido",
      "cmd": "f=supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql; test -f $f && h=$(head -12 $f | grep -c 'APLICAR E HUMANO') && k=$(head -12 $f | grep -c 'ddl-ranking-foto-aplicada') && m=$(head -5 $f | grep -ciE 'n.{1,2}o +aplicad'); [ \"$h\" = 1 ] && [ \"$k\" = 1 ] && [ \"$m\" = 0 ] && echo CABECALHO_OK || echo ST_${h:-0}_${k:-0}_${m:-x}",
      "espera": "CABECALHO_OK"
    },
    {
      "descricao": "sem funcao, trigger, view nem grant",
      "cmd": "f=supabase/migrations/20261009200000_perf_ranking_foto_mensal.sql; test -f $f && n=$(grep -v '^ *--' $f | grep -ciE 'create (or replace )?function|create trigger|create (or replace )?view|grant '); [ \"$n\" = 0 ] && echo SO_TABELA || echo ST_${n:-x}",
      "espera": "SO_TABELA"
    },
    {
      "descricao": "teste(s) novo(s) verde(s) (test/perf-ranking-foto-mensal-ddl.test.ts)",
      "cmd": "test -f test/perf-ranking-foto-mensal-ddl.test.ts && npx vitest run test/perf-ranking-foto-mensal-ddl.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: o .sql so cria perf_ranking_foto_mensal (escopo tese/nicho/gestor, escopo_id, mes dia 1, metricas jsonb, clientes, score, posicao, parcial, gerado_em, unique escopo+id+mes) com RLS, policy only_service_role e revoke de anon e authenticated, no molde do perf_cliente_verba; cabecalho APLICAR E HUMANO com token e reversao. REPROVE se: marcador 'nao aplicada' no cabecalho; grant a anon ou authenticated; funcao ou trigger; toca outra tabela; teste que nao le o arquivo.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/bloco-vazio-linha.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/consistencia-contagens.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/fetch-json-teto.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/migration-security-definer-anon.test.ts",
      "motivo": "varre supabase/migrations; o .sql novo tem de passar sem editar o teste"
    },
    {
      "teste": "test/migrations-cabecalho-aplicada.test.ts",
      "motivo": "varre supabase/migrations; o .sql novo tem de passar sem editar o teste"
    },
    {
      "teste": "test/migrations-policy-idempotente.test.ts",
      "motivo": "varre supabase/migrations; o .sql novo tem de passar sem editar o teste"
    },
    {
      "teste": "test/regra19.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/sync-log-status.test.ts",
      "motivo": "varre supabase/migrations; o .sql novo tem de passar sem editar o teste"
    },
    {
      "teste": "test/travessao-mudo.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/ui-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): SQL cria só perf_ranking_foto_mensal com as 10 colunas, os checks, unique (escopo, escopo_id, mes) e o índice. Tem RLS, policy only_service_role guardada por pg_policies e revoke de anon/authenticated. Cabeçalho tem APLICAR E HUMANO, token e reversão. Sem grant, função ou C0. Teste lê o .sql com readFileSync.",
  "colunas_escritas": [
    "perf_ranking_foto_mensal.escopo",
    "perf_ranking_foto_mensal.escopo_id",
    "perf_ranking_foto_mensal.mes",
    "perf_ranking_foto_mensal.metricas",
    "perf_ranking_foto_mensal.clientes",
    "perf_ranking_foto_mensal.score",
    "perf_ranking_foto_mensal.posicao",
    "perf_ranking_foto_mensal.parcial",
    "perf_ranking_foto_mensal.gerado_em"
  ]
}
```
