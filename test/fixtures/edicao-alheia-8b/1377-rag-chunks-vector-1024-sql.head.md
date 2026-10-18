# Ticket 1377: rag_chunks passa para vector(1024), dimensão da Voyage (proposta SQL)

> Escrito em 18/10/2026 (madrugada) a partir do ADR-020 (docs/plano/apolo/adr/ADR-020-ia-claude-por-tarefa.md) e das decisoes do Lucas de 17/10 23h52 (trocar todos os provedores de IA pelo Claude, modelo e versao por tarefa conforme a performance de cada uma) e 18/10 00h40 (transcricao de video fica no Gemini, embeddings na Voyage, decisao tipada fica no Clef). Estudo: claude/estudo-ia-claude-17out.md no projeto do Lucas.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

A Anthropic nao tem modelo de embedding e recomenda a Voyage AI; o ADR-020 adota voyage-4 em 1024 dimensoes. A coluna rag_chunks.embedding e vector(1536) (OpenAI). A tabela esta vazia em 18/10/2026, entao a troca so muda o tipo e recria o indice; o .sql para se encontrar qualquer linha. rag_buscar_chunks nao muda (parametro vector sem dimensao).

## SQL revisado (o .sql do ticket e este bloco, byte a byte)

```sql
-- =============================================================
-- Migration: rag_chunks.embedding passa de vector(1536) para vector(1024), dimensao da Voyage voyage-4 (ticket 1377, ADR-020)
-- APLICAR E HUMANO. Este arquivo e so a proposta versionada.
-- Token humano apos aplicar e conferir: humano:migration-1377-aplicada
--
-- O QUE FAZ
--   1. Para (raise, nada muda) se rag_chunks tiver qualquer linha: trocar a dimensao com dado
--      exige reprocessar os embeddings, e este arquivo parte da tabela vazia.
--   2. Derruba o indice hnsw idx_rag_chunks_embedding, troca o tipo da coluna para
--      extensions.vector(1024) e recria o mesmo indice (hnsw, vector_cosine_ops).
--   rag_buscar_chunks(uuid, vector, integer) nao muda: o parametro e vector sem dimensao.
--
-- POR QUE
--   ADR-020 (18/10/2026): a Anthropic nao tem modelo de embedding e recomenda a Voyage AI.
--   O OS passa a embedar com voyage-4 em 1024 dimensoes (ticket 1378). Medido em 18/10/2026:
--   rag_chunks e rag_documentos com 0 linhas, entao a troca nao perde nada.
--
-- QUEM APLICA: o Lucas, pela skill aplicar-migration-ddl. A versao canonica e a deste
--   arquivo (20261018030500): a skill alinha supabase_migrations.schema_migrations a ela.
--   O arquivo nunca e renomeado.
--
-- POS-APLICACAO (so leitura)
--   select format_type(atttypid, atttypmod) from pg_attribute where attrelid = 'public.rag_chunks'::regclass and attname = 'embedding'; -- vector(1024)
--   select indexdef from pg_indexes where schemaname = 'public' and indexname = 'idx_rag_chunks_embedding';                                -- USING hnsw (embedding vector_cosine_ops)
--   select count(*) from public.rag_chunks;                                                                                                -- 0
--
-- REVERSAO EXATA (rodar so se precisar desfazer, com rag_chunks vazia)
--   drop index if exists public.idx_rag_chunks_embedding;
--   alter table public.rag_chunks alter column embedding type extensions.vector(1536);
--   create index idx_rag_chunks_embedding on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);
-- =============================================================

begin;

do $$
begin
  if exists (select 1 from public.rag_chunks) then
    raise exception 'rag_chunks tem linhas: trocar a dimensao exige reprocessar os embeddings; nada foi alterado';
  end if;
end
$$;

drop index if exists public.idx_rag_chunks_embedding;

alter table public.rag_chunks
  alter column embedding type extensions.vector(1024);

create index idx_rag_chunks_embedding
  on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);

comment on column public.rag_chunks.embedding is
  'Embedding Voyage voyage-4 em 1024 dimensoes (ADR-020, ticket 1378).';

commit;
```

## Campos de máquina

```json
{
  "id": "1377",
  "slug": "rag-chunks-vector-1024-sql",
  "loop": "plataforma",
  "lane": "dados",
  "perfil": "sql-proposta",
  "objetivo": "ORCAMENTO DE DIFF: teto de 220 linhas (o .sql NOVO e o teste NOVO). Se passar do teto, pare e reporte. Este ticket SO escreve a proposta versionada; aplicar e humano (skill aplicar-migration-ddl) e o Lucas libera humano:migration-1377-aplicada depois de rodar o POS-APLICACAO. RECON 18/10 (banco vivo): rag_chunks.embedding e extensions.vector(1536) not null; indice idx_rag_chunks_embedding hnsw (embedding vector_cosine_ops); rag_chunks e rag_documentos com 0 linhas; rag_buscar_chunks(uuid, vector, integer) recebe vector sem dimensao; a extensao vector esta no schema extensions; a versao 20261018030500 esta livre. FAZER: (1) NOVO supabase/migrations/20261018030500_rag_chunks_vector_1024.sql com o conteudo EXATO do bloco ```sql da prosa deste ticket (docs/fila/1377-*.md), byte a byte, terminando em quebra de linha; nao reescreva, nao reformate, nao traduza. (2) NOVO test/rag-vector-1024-sql.test.ts (vitest, sem banco, readFileSync do .sql): cabecalho com 'APLICAR E HUMANO', 'humano:migration-1377-aplicada', 'REVERSAO EXATA' e 'POS-APLICACAO'; nenhuma das 5 primeiras linhas com 'NAO APLICADA'/'NÃO APLICADA'; corpo entre 'begin;' e 'commit;'; bloco do $$ que faz raise exception se rag_chunks tiver linha; drop index if exists public.idx_rag_chunks_embedding; alter column embedding type extensions.vector(1024); create index idx_rag_chunks_embedding hnsw com extensions.vector_cosine_ops; nenhum create or replace function; nenhum nome de tabela C0 no arquivo. FORA DE ESCOPO: codigo em src/, outras migrations. Regras do repo: sem travessao (U+2014); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month), nem nome dessas tabelas em comentario de .sql; sem .json() novo em src (use res.text() com JSON.parse, ou fetchJson, parseJsonResponse ou lerCorpoJson de src/lib/fetch-json.ts); falha de leitura nunca vira zero, lista vazia nem verde; mensagem de tela ou de erro em portugues claro, sem nome de tabela, coluna ou view; chave de API nunca vai em URL, log, erro nem teste; PROIBIDO remover assercao, trocar matcher por toBeDefined, usar .skip, .only ou .todo.",
  "colunas_escritas": [
    "rag_chunks.embedding"
  ],
  "cria_novo": [
    "supabase/migrations/20261018030500_rag_chunks_vector_1024.sql",
    "test/rag-vector-1024-sql.test.ts"
  ],
  "pathspec_allowlist": [
    "supabase/migrations/20261018030500_rag_chunks_vector_1024.sql",
    "test/rag-vector-1024-sql.test.ts"
  ],
  "dependencias": [
    "humano:adr-020-aceita"
  ],
  "prioridade": 33,
  "recon_esperado": [
    {
      "descricao": "supabase/migrations/20261018030500_rag_chunks_vector_1024.sql ainda nao existe",
      "cmd": "test -e 'supabase/migrations/20261018030500_rag_chunks_vector_1024.sql' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/rag-vector-1024-sql.test.ts ainda nao existe",
      "cmd": "test -e 'test/rag-vector-1024-sql.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
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
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'supabase/migrations/20261018030500_rag_chunks_vector_1024.sql' 'test/rag-vector-1024-sql.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 220 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 220 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "so 1 .sql novo e e supabase/migrations/20261018030500_rag_chunks_vector_1024.sql",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); m=$(git diff --name-only \"$b\" HEAD | grep -Fxc 'supabase/migrations/20261018030500_rag_chunks_vector_1024.sql'); [ \"$n\" = 1 ] && [ \"$m\" = 1 ] && echo SQL_CERTO || echo ST_sqlnovos${n}_alvo${m}",
      "espera": "SQL_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "o .sql e byte a byte o bloco revisado na prosa do ticket",
      "cmd": "f='supabase/migrations/20261018030500_rag_chunks_vector_1024.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; t=$(ls docs/fila/1377-*.md); python3 -c \"import re,sys; t=open(sys.argv[2],encoding='utf-8').read(); b=re.search(r'\\x60\\x60\\x60sql\\n(.*?)\\x60\\x60\\x60', t, re.S).group(1); a=open(sys.argv[1],encoding='utf-8').read(); print('IGUAL_AO_TICKET' if a==b else 'DIVERGE')\" \"$f\" \"$t\"",
      "espera": "IGUAL_AO_TICKET",
      "tipo": "alvo"
    },
    {
      "descricao": "guardas globais seguem verdes (test/c0-guard.test.ts, test/fetch-json-teto.test.ts, test/travessao-mudo.test.ts, test/migrations-cabecalho-aplicada.test.ts, test/migrations-policy-idempotente.test.ts, test/migration-security-definer-anon.test.ts)",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/fetch-json-teto.test.ts' 'test/travessao-mudo.test.ts' 'test/migrations-cabecalho-aplicada.test.ts' 'test/migrations-policy-idempotente.test.ts' 'test/migration-security-definer-anon.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma tabela da zona C0 nem do comercial no .sql",
      "cmd": "f='supabase/migrations/20261018030500_rag_chunks_vector_1024.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; n=$(grep -ciE 'leads_crm|ads_metadata|ads_performance|clientes_receita|trafego_|vw_|ghl_funnel|ghl_sdr|fn_mql' \"$f\"); [ \"$n\" = 0 ] && echo SEM_C0 || echo C0_$n",
      "espera": "SEM_C0",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/rag-vector-1024-sql.test.ts)",
      "cmd": "test -f test/rag-vector-1024-sql.test.ts && npx vitest run test/rag-vector-1024-sql.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: .sql identico ao bloco revisado; guarda de tabela vazia antes de qualquer DDL. REPROVE se: muda o .sql; recria a funcao de busca; teste sem conferir a guarda.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [],
  "status": "pendente",
  "notas_status": ""
}
```
