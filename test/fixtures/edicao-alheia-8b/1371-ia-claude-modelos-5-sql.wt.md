# Ticket 1371: Modelos Claude 5.x com preço de cache e faixa longa; função e cache no uso (proposta SQL)

> Escrito em 18/10/2026 (madrugada) a partir do ADR-020 (docs/plano/apolo/adr/ADR-020-ia-claude-por-tarefa.md) e das decisoes do Lucas de 17/10 23h52 (trocar todos os provedores de IA pelo Claude, modelo e versao por tarefa conforme a performance de cada uma) e 18/10 00h40 (transcricao de video fica no Gemini, embeddings na Voyage, decisao tipada fica no Clef). Estudo: claude/estudo-ia-claude-17out.md no projeto do Lucas.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Cadastra os modelos Claude 5.x (Haiku 5.5, Sonnet 5.5, Opus 5.5, Fable 5.1) com os precos oficiais conferidos em 18/10/2026, inclusive cache e a faixa de prompt acima de 100 mil tokens do Haiku, e acrescenta em perf_ia_uso a funcao que chamou e os tokens de cache. Nenhuma funcao muda de modelo aqui; a troca e das faixas (1374, 1375, 1376). Tudo em tabelas perf_* do OS, fora da zona C0. Aplicar e humano.

## SQL revisado (o .sql do ticket e este bloco, byte a byte)

```sql
-- =============================================================
-- Migration: modelos Claude 5.x em perf_ia_modelos, precos de cache e da faixa de prompt longo, e funcao e cache em perf_ia_uso (ticket 1371, ADR-020)
-- APLICAR E HUMANO. Este arquivo e so a proposta versionada.
-- Token humano apos aplicar e conferir: humano:migration-1371-aplicada
--
-- O QUE FAZ
--   1. perf_ia_modelos ganha preco_cache_escrita e preco_cache_leitura (US$ por milhao de
--      tokens, cache de 5 minutos) e preco_in_acima_limiar e preco_out_acima_limiar (preco
--      quando o prompt inteiro, contando cache, passa de threshold_contexto).
--   2. Insere claude-haiku-5-5, claude-sonnet-5-5, claude-opus-5-5 e claude-fable-5-1,
--      ativos e sem default (ou atualiza o preco, se a linha ja existir). Nenhuma funcao
--      muda de modelo aqui: a troca e das faixas (tickets 1374, 1375 e 1376).
--   3. perf_ia_uso ganha funcao, tokens_cache_escrita e tokens_cache_leitura, para o custo
--      por funcao e o custo do cache.
--
-- POR QUE
--   ADR-020 (18/10/2026): a IA de texto do OS passa para Claude por faixa. Precos da pagina
--   oficial (platform.claude.com/docs/en/about-claude/pricing), conferidos em 18/10/2026,
--   em US$ por milhao de tokens: Haiku 5.5 0,10 entrada e 0,50 saida ate 100 mil tokens de
--   prompt, 0,50 e 2,50 acima; Sonnet 5.5 2 e 10; Opus 5.5 4 e 20; Fable 5.1 10 e 50.
--   Cache de 5 minutos: escrita 1,25x a entrada; leitura 0,01 (Haiku), 0,10 (Sonnet),
--   0,20 (Opus) e 0,25 (Fable). Acima do limiar do Haiku, o cache sobe na mesma proporcao
--   da entrada (0,625 escrita e 0,05 leitura): o codigo aplica o fator, nao ha coluna para isso.
--
-- QUEM APLICA: o Lucas, pela skill aplicar-migration-ddl. A versao canonica e a deste
--   arquivo (20261018030100): a skill alinha supabase_migrations.schema_migrations a ela.
--   O arquivo nunca e renomeado.
--
-- POS-APLICACAO (so leitura)
--   select modelo, preco_in, preco_out, preco_cache_escrita, preco_cache_leitura, threshold_contexto, preco_in_acima_limiar, preco_out_acima_limiar, ativo, is_default from public.perf_ia_modelos where provedor = 'claude' order by modelo; -- 4 linhas 5.x ativas e sem default; as 3 linhas 4.x seguem ativo false
--   select modelo from public.perf_ia_modelos where is_default;                                -- gpt-5.4-mini (sem mudanca)
--   select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'perf_ia_uso' and column_name in ('funcao', 'tokens_cache_escrita', 'tokens_cache_leitura'); -- 3
--   select count(*) from public.perf_ia_uso where tokens_cache_escrita <> 0 or tokens_cache_leitura <> 0 or funcao is not null; -- 0
--
-- REVERSAO EXATA (rodar so se precisar desfazer)
--   update public.perf_ia_modelos set ativo = false where provedor = 'claude' and modelo in ('claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1');
--   delete from public.perf_ia_modelos where provedor = 'claude' and modelo in ('claude-haiku-5-5', 'claude-sonnet-5-5', 'claude-opus-5-5', 'claude-fable-5-1') and id not in (select modelo_id from public.perf_ia_uso where modelo_id is not null);
--   alter table public.perf_ia_uso drop column if exists tokens_cache_leitura, drop column if exists tokens_cache_escrita, drop column if exists funcao;
--   alter table public.perf_ia_modelos drop column if exists preco_out_acima_limiar, drop column if exists preco_in_acima_limiar, drop column if exists preco_cache_leitura, drop column if exists preco_cache_escrita;
-- =============================================================

begin;

alter table public.perf_ia_modelos
  add column if not exists preco_cache_escrita numeric,
  add column if not exists preco_cache_leitura numeric,
  add column if not exists preco_in_acima_limiar numeric,
  add column if not exists preco_out_acima_limiar numeric;

comment on column public.perf_ia_modelos.preco_cache_escrita is
  'US$ por milhao de tokens escritos no cache de 5 minutos. Nulo: o provedor nao cobra cache a parte.';
comment on column public.perf_ia_modelos.preco_cache_leitura is
  'US$ por milhao de tokens lidos do cache. Nulo: o provedor nao cobra cache a parte.';
comment on column public.perf_ia_modelos.preco_in_acima_limiar is
  'Preco de entrada quando o prompt inteiro (entrada mais cache) passa de threshold_contexto. Nulo: preco unico.';
comment on column public.perf_ia_modelos.preco_out_acima_limiar is
  'Preco de saida quando o prompt inteiro passa de threshold_contexto. Nulo: preco unico.';

insert into public.perf_ia_modelos
  (provedor, modelo, label, preco_in, preco_out, preco_cache_escrita, preco_cache_leitura, threshold_contexto, preco_in_acima_limiar, preco_out_acima_limiar, is_default, ativo)
values
  ('claude', 'claude-haiku-5-5',  'Claude Haiku 5.5',  0.10, 0.50, 0.125, 0.01, 100000, 0.50, 2.50, false, true),
  ('claude', 'claude-sonnet-5-5', 'Claude Sonnet 5.5', 2,    10,   2.50,  0.10, null,   null, null, false, true),
  ('claude', 'claude-opus-5-5',   'Claude Opus 5.5',   4,    20,   5,     0.20, null,   null, null, false, true),
  ('claude', 'claude-fable-5-1',  'Claude Fable 5.1',  10,   50,   12.50, 0.25, null,   null, null, false, true)
on conflict (provedor, modelo) do update set
  label                  = excluded.label,
  preco_in               = excluded.preco_in,
  preco_out              = excluded.preco_out,
  preco_cache_escrita    = excluded.preco_cache_escrita,
  preco_cache_leitura    = excluded.preco_cache_leitura,
  threshold_contexto     = excluded.threshold_contexto,
  preco_in_acima_limiar  = excluded.preco_in_acima_limiar,
  preco_out_acima_limiar = excluded.preco_out_acima_limiar,
  ativo                  = true;

alter table public.perf_ia_uso
  add column if not exists funcao text,
  add column if not exists tokens_cache_escrita integer not null default 0,
  add column if not exists tokens_cache_leitura integer not null default 0;

comment on column public.perf_ia_uso.funcao is
  'Funcao do registro de IA (src/lib/ia/funcoes.ts) que fez a chamada. Nulo nas linhas anteriores a 1371.';

commit;
```

## Campos de máquina

```json
{
  "id": "1371",
  "slug": "ia-claude-modelos-5-sql",
  "loop": "plataforma",
  "lane": "dados",
  "perfil": "sql-proposta",
  "objetivo": "ORCAMENTO DE DIFF: teto de 260 linhas (o .sql NOVO e o teste NOVO). Se passar do teto, pare e reporte. Este ticket SO escreve a proposta versionada; aplicar e humano (skill aplicar-migration-ddl) e o Lucas libera humano:migration-1371-aplicada depois de rodar o POS-APLICACAO. RECON 18/10 (banco vivo): perf_ia_modelos tem id, provedor, modelo, label, preco_in, preco_out, threshold_contexto, is_default, ativo, created_at, unique (provedor, modelo) e indice unico parcial de is_default; as linhas claude existentes sao claude-haiku-4-5, claude-sonnet-4-6 e claude-opus-4-8, todas ativo false; perf_ia_uso nao tem funcao nem colunas de cache; a versao 20261018030100 esta livre. FAZER: (1) NOVO supabase/migrations/20261018030100_ia_claude_modelos_5.sql com o conteudo EXATO do bloco ```sql da prosa deste ticket (docs/fila/1371-*.md), byte a byte, terminando em quebra de linha; nao reescreva, nao reformate, nao traduza. (2) NOVO test/ia-claude-modelos-sql.test.ts (vitest, sem banco, readFileSync do .sql): cabecalho com 'APLICAR E HUMANO', 'humano:migration-1371-aplicada', 'REVERSAO EXATA' e 'POS-APLICACAO'; nenhuma das 5 primeiras linhas com 'NAO APLICADA'/'NÃO APLICADA'; corpo entre 'begin;' e 'commit;'; alter table public.perf_ia_modelos com as 4 colunas (preco_cache_escrita, preco_cache_leitura, preco_in_acima_limiar, preco_out_acima_limiar) por add column if not exists; insert dos 4 modelos claude-haiku-5-5, claude-sonnet-5-5, claude-opus-5-5 e claude-fable-5-1 com on conflict (provedor, modelo) do update; nenhum is_default true no insert; o Haiku com threshold_contexto 100000 e preco acima 0.50 e 2.50; alter table public.perf_ia_uso com funcao, tokens_cache_escrita e tokens_cache_leitura por add column if not exists; nenhum drop fora do cabecalho; nenhum nome de tabela C0 no arquivo. FORA DE ESCOPO: codigo em src/, outras migrations. Regras do repo: sem travessao (U+2014); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month), nem nome dessas tabelas em comentario de .sql; sem .json() novo em src (use res.text() com JSON.parse, ou fetchJson, parseJsonResponse ou lerCorpoJson de src/lib/fetch-json.ts); falha de leitura nunca vira zero, lista vazia nem verde; mensagem de tela ou de erro em portugues claro, sem nome de tabela, coluna ou view; chave de API nunca vai em URL, log, erro nem teste; PROIBIDO remover assercao, trocar matcher por toBeDefined, usar .skip, .only ou .todo.",
  "cria_novo": [
    "supabase/migrations/20261018030100_ia_claude_modelos_5.sql",
    "test/ia-claude-modelos-sql.test.ts"
  ],
  "pathspec_allowlist": [
    "supabase/migrations/20261018030100_ia_claude_modelos_5.sql",
    "test/ia-claude-modelos-sql.test.ts"
  ],
  "dependencias": [],
  "prioridade": 30,
  "recon_esperado": [
    {
      "descricao": "supabase/migrations/20261018030100_ia_claude_modelos_5.sql ainda nao existe",
      "cmd": "test -e 'supabase/migrations/20261018030100_ia_claude_modelos_5.sql' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/ia-claude-modelos-sql.test.ts ainda nao existe",
      "cmd": "test -e 'test/ia-claude-modelos-sql.test.ts' && echo EXISTE || echo AUSENTE",
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'supabase/migrations/20261018030100_ia_claude_modelos_5.sql' 'test/ia-claude-modelos-sql.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 260 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 260 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "so 1 .sql novo e e supabase/migrations/20261018030100_ia_claude_modelos_5.sql",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); m=$(git diff --name-only \"$b\" HEAD | grep -Fxc 'supabase/migrations/20261018030100_ia_claude_modelos_5.sql'); [ \"$n\" = 1 ] && [ \"$m\" = 1 ] && echo SQL_CERTO || echo ST_sqlnovos${n}_alvo${m}",
      "espera": "SQL_CERTO",
      "tipo": "alvo"
    },
    {
      "descricao": "o .sql e byte a byte o bloco revisado na prosa do ticket",
      "cmd": "f='supabase/migrations/20261018030100_ia_claude_modelos_5.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; t=$(ls docs/fila/1371-*.md 2>/dev/null || ls \"$(git rev-parse --git-common-dir)\"/../docs/fila/1371-*.md); python3 -c \"import re,sys; t=open(sys.argv[2],encoding='utf-8').read(); b=re.search(r'\\x60\\x60\\x60sql\\n(.*?)\\x60\\x60\\x60', t, re.S).group(1); a=open(sys.argv[1],encoding='utf-8').read(); print('IGUAL_AO_TICKET' if a==b else 'DIVERGE')\" \"$f\" \"$t\"",
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
      "cmd": "f='supabase/migrations/20261018030100_ia_claude_modelos_5.sql'; test -f \"$f\" || { echo SEM_ARQUIVO; exit 0; }; n=$(grep -ciE 'leads_crm|ads_metadata|ads_performance|clientes_receita|trafego_|vw_|ghl_funnel|ghl_sdr|fn_mql' \"$f\"); [ \"$n\" = 0 ] && echo SEM_C0 || echo C0_$n",
      "espera": "SEM_C0",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/ia-claude-modelos-sql.test.ts)",
      "cmd": "test -f test/ia-claude-modelos-sql.test.ts && npx vitest run test/ia-claude-modelos-sql.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: .sql identico ao bloco revisado; teste prova por regex cada item do FAZER. REPROVE se: muda o .sql; liga default; toca outra tabela; teste sem conferir precos e colunas.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): O .sql bate com o bloco do ticket. Nenhum modelo liga is_default e o update não mexe nele. Só perf_ia_modelos e perf_ia_uso são alteradas. O teste confere por regex o cabeçalho, begin/commit, as 4+3 colunas, os 4 modelos, o on conflict, os preços de cada modelo, o limiar do Haiku, a ausência de drop no corpo e de nome C0."
}
```
