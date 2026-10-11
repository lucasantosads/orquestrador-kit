# 532

```json
{
  "id": "532",
  "bloco": "B4",
  "frente": "painel-comercial",
  "origem": "humano",
  "slug": "ghl-usuarios-nome-closer",
  "objetivo": "(1) Migration supabase/migrations/0290_ghl_user_map_nome.sql (NAO aplicar): (a) alter table comercial.ghl_user_map add column nome text, nullable e sem default, com CHECK (nome is null or length(btrim(nome)) between 1 and 200), ADITIVA como a 0270; (b) create function public.fn_ranking_por_closer_v2() NOVA com o corpo COMPLETO da 0278 reescrita pelo 499c (leia supabase/migrations/0278_ranking_por_closer.sql inteira e cite-a), as MESMAS colunas na mesma ordem MAIS closer_nome text no fim, vindo de left join em comercial.ghl_user_map VIVA (deleted_at is null) por (tenant_id, ghl_user_id); security invoker, set search_path to '' com tudo schema-qualificado, sem parametro, tenant pela RLS 0160/0161; revoke all de public, anon e ‹segredo› numa linha e grant execute so a authenticated numa linha, como na 0278. NAO tocar a 0278 nem a fn_ranking_por_closer. Zero DROP, zero DML. (2) Cliente src/lib/connectors/ghl/users-client.ts (import 'server-only'): listarUsuariosGhl(svc, tenantId, fetchImpl = fetch) no molde EXATO de listarPipelinesGhl em src/lib/connectors/ghl/pipelines-client.ts (mesmo SELECT unico de tenant_connectors tipo 'ghl' vivo e ativo com external_account_id, credencial SO por fn_resolver_secret_conector, requireEnv('GHL_API_BASE_URL'), header Version como o cliente de pipelines, ConectorIndisponivel nos mesmos casos): GET {base}/users/?locationId={external_account_id}; corpo esperado { users: [...] }; cada usuario vira { ghlUserId, nome }, com nome = name nao vazio, senao firstName + ' ' + lastName aparados, senao null. NUNCA leia nem devolva email, phone ou outro campo pessoal (LGPD: so id e nome). Nao ok = log do corpo REDIGIDO (mesmo redigirCorpo) e erro com o status; formato inesperado = erro de formato; 401/403 cita no erro que falta o escopo users.readonly. (3) Sync src/lib/comercial/ghl-usuarios/sincronizar.ts: sincronizarUsuariosGhl(svc, tenantId, deps) no molde de sincronizarGhlStages (src/lib/comercial/funil/ghl-stages-sync.ts): le as linhas VIVAS de comercial.ghl_user_map do tenant; usuario novo = insert (tenant_id, ghl_user_id, nome) com user_id NULL; existente com nome diferente = update SO de nome; nome igual = nao escreve (segundo sync identico e no-op real); NUNCA escreve user_id, NUNCA soft-deleta nem apaga (usuario que sumiu do GHL mantem a linha e o nome); lista vazia do GHL = throw sem escrever nada; nome null do GHL nunca sobrescreve nome existente. Devolve { inseridos, atualizados, inalterados }. Erro do cliente propaga cru. (4) Rota src/app/api/jobs/sincronizar-usuarios-ghl/route.ts no molde de src/app/api/jobs/reprocessar-midias/route.ts: runtime nodejs, dynamic force-dynamic, GET e POST, autorizadoPorCron (401 sem Bearer CRON_SECRET), service role, roda o sync para cada tenant vivo com conector ghl ativo, isola falha por tenant (uma falha nao derruba os outros, entra no resumo com a mensagem e vai para log.error), 500 se TODOS falharem. SEM cron novo (nao tocar vercel.json). (5) Ranking: em src/lib/comercial/painel/ranking-closer.ts, rankingPorCloser passa a chamar supabase.rpc(\"fn_ranking_por_closer_v2\") SEM argumento, mesmo cliente autenticado createServerSupabase e mesmas normalizacoes, e LinhaRankingCloser ganha closer_nome: string | null; rotuloCloser(linha) devolve closer_nome aparado quando nao vazio, senao o ghl_user_id (como hoje). Em src/app/(painel)/comercial/closers/page.tsx, a coluna Closer mostra rotuloCloser, e o ID em font-mono fica visivel so quando ha nome (texto secundario text-muted-foreground); o texto do estado vazio continua. So tokens do design system. (6) TESTES: src/lib/connectors/ghl/users-client.test.ts (fetch injetado: shape feliz com name e com firstName/lastName; email/phone nunca aparecem no retorno; 401 cita users.readonly; corpo sem users = erro de formato; conector inativo = ConectorIndisponivel); src/lib/comercial/ghl-usuarios/sincronizar.test.ts (fake de supabase: insercao, update so de nome, no-op no segundo sync, user_id nunca no payload, nenhuma delecao, lista vazia lanca sem escrever, nome null nao sobrescreve); test/ghl-user-map-0290.integration.test.ts (PGlite com as migrations reais do disco 0106 (ou o recorte dela que o teste da 0278 ja usa), 0278 e 0290, sem recriar funcao: fn_ranking_por_closer_v2 devolve closer_nome do mapa vivo, null sem mapa, ignora linha com deleted_at, isola dois tenants pela claim, e authenticated executa mas ‹segredo› nao; CHECK recusa nome vazio); atualize test/ranking-closer-tela.test.ts (rotuloCloser com nome, sem nome e com nome so de espacos devolve o id; o mock chama fn_ranking_por_closer_v2). TYPECHECK: tsconfig tem target ES2015; nao itere Map/Set com for...of nem spread, use Array.from ou forEach. FORA DE ESCOPO: vincular user_id do Actus, derivar responsavel da conversa, abrir o ranking para SDR, tocar a 0278, cron agendado, reinstalar o app ou pedir escopo (humano).",
  "pathspec_allowlist": [
    "supabase/migrations/0290_ghl_user_map_nome.sql",
    "src/lib/connectors/ghl/users-client.ts",
    "src/lib/connectors/ghl/users-client.test.ts",
    "src/lib/comercial/ghl-usuarios/sincronizar.ts",
    "src/lib/comercial/ghl-usuarios/sincronizar.test.ts",
    "src/app/api/jobs/sincronizar-usuarios-ghl/route.ts",
    "src/lib/comercial/painel/ranking-closer.ts",
    "src/app/(painel)/comercial/closers/page.tsx",
    "test/ranking-closer-tela.test.ts",
    "test/ghl-user-map-0290.integration.test.ts"
  ],
  "cria_novo": [
    "supabase/migrations/0290_ghl_user_map_nome.sql",
    "src/lib/connectors/ghl/users-client.ts",
    "src/lib/connectors/ghl/users-client.test.ts",
    "src/lib/comercial/ghl-usuarios/sincronizar.ts",
    "src/lib/comercial/ghl-usuarios/sincronizar.test.ts",
    "src/app/api/jobs/sincronizar-usuarios-ghl/route.ts",
    "test/ghl-user-map-0290.integration.test.ts"
  ],
  "dependencias": [
    "humano:ghl-escopo-users-confirmado"
  ],
  "diff_estimado": 650,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "teste de integracao da 0290 verde (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run test/ghl-user-map-0290.integration.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "alvo",
      "descricao": "testes do cliente, do sync e da tela verdes (le o rc do vitest)",
      "cmd": "node_modules/.bin/vitest run src/lib/connectors/ghl/users-client.test.ts src/lib/comercial/ghl-usuarios/sincronizar.test.ts test/ranking-closer-tela.test.ts >/dev/null 2>&1 && echo TESTS_OK",
      "espera": "TESTS_OK"
    },
    {
      "tipo": "guarda",
      "descricao": "0290 sem DROP, sem DML e sem create or replace (fora de comentario)",
      "cmd": "{ grep -ciE '^[^-]*(insert into|update [a-z_.]+ set|delete from|drop |create or replace)' supabase/migrations/0290_ghl_user_map_nome.sql || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^[^-]*(insert into|update [a-z_.]+ set|delete from|drop |create or replace)",
          "positivo": "create or replace function public.fn_ranking_por_closer()",
          "negativo": "-- rollback manual: drop function public.fn_ranking_por_closer_v2()",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "alvo",
      "descricao": "0290: coluna nome aditiva (add column numa linha, fora de comentario)",
      "cmd": "{ grep -ciE '^[^-]*add column nome text' supabase/migrations/0290_ghl_user_map_nome.sql || true; }",
      "espera": "^1$",
      "exemplos_regex": [
        {
          "regex": "^[^-]*add column nome text",
          "positivo": "  add column nome text",
          "negativo": "-- add column nome text nullable, como a 0270",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "alvo",
      "descricao": "0290: execute da v2 so para authenticated, revoke de ‹segredo› numa linha",
      "cmd": "{ grep -ciE '^(revoke all on function public\\.fn_ranking_por_closer_v2\\(\\) from public, anon, ‹segredo›;|grant execute on function public\\.fn_ranking_por_closer_v2\\(\\) to authenticated;)$' supabase/migrations/0290_ghl_user_map_nome.sql || true; }",
      "espera": "^2$",
      "exemplos_regex": [
        {
          "regex": "^(revoke all on function public\\.fn_ranking_por_closer_v2\\(\\) from public, anon, ‹segredo›;|grant execute on function public\\.fn_ranking_por_closer_v2\\(\\) to authenticated;)$",
          "positivo": "grant execute on function public.fn_ranking_por_closer_v2() to authenticated;",
          "negativo": "grant execute on function public.fn_ranking_por_closer_v2() to ‹segredo›;",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "a 0278 nao e tocada pelo diff",
      "cmd": "{ git diff --name-only $BASE_REF...HEAD | grep -cE '^supabase/migrations/0278_' || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^supabase/migrations/0278_",
          "positivo": "supabase/migrations/0278_ranking_por_closer.sql",
          "negativo": "supabase/migrations/0290_ghl_user_map_nome.sql"
        }
      ]
    },
    {
      "tipo": "alvo",
      "descricao": "leitor chama a v2 sem argumento (fora de comentario)",
      "cmd": "{ grep -cE '^[^/]*\\.rpc\\(\"fn_ranking_por_closer_v2\"\\)' src/lib/comercial/painel/ranking-closer.ts || true; }",
      "espera": "^[1-9]",
      "exemplos_regex": [
        {
          "regex": "^[^/]*\\.rpc\\(\"fn_ranking_por_closer_v2\"\\)",
          "positivo": "  const { data, error } = await supabase.rpc(\"fn_ranking_por_closer_v2\");",
          "negativo": "  const { data, error } = await supabase.rpc(\"fn_ranking_por_closer_v2\", { p_tenant_id: t });"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "cliente de usuarios nao le email nem telefone (fora de comentario)",
      "cmd": "{ grep -ciE '^[^/]*(\\.email|\\.phone|\"email\"|\"phone\")' src/lib/connectors/ghl/users-client.ts || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^[^/]*(\\.email|\\.phone|\"email\"|\"phone\")",
          "positivo": "    email: bruto.email,",
          "negativo": "// nunca email nem phone (LGPD): so id e nome",
          "flags": "-iE"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "sync nunca escreve user_id nem apaga (fora de comentario)",
      "cmd": "{ grep -cE '^[^/]*(user_id:|\\.delete\\(|deleted_at:)' src/lib/comercial/ghl-usuarios/sincronizar.ts || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^[^/]*(user_id:|\\.delete\\(|deleted_at:)",
          "positivo": "      .update({ nome: u.nome, user_id: null })",
          "negativo": "// nunca escreve user_id: o vinculo com o Actus e humano"
        }
      ]
    },
    {
      "tipo": "guarda",
      "descricao": "sem cron novo e nada fora da allowlist (grep -v conta o que sobra)",
      "cmd": "{ git diff --name-only $BASE_REF...HEAD | grep -vcE '^supabase/migrations/0290_ghl_user_map_nome\\.sql$|^src/lib/connectors/ghl/users-client(\\.test)?\\.ts$|^src/lib/comercial/ghl-usuarios/sincronizar(\\.test)?\\.ts$|^src/app/api/jobs/sincronizar-usuarios-ghl/route\\.ts$|^src/lib/comercial/painel/ranking-closer\\.ts$|^src/app/\\(painel\\)/comercial/closers/page\\.tsx$|^test/ranking-closer-tela\\.test\\.ts$|^test/ghl-user-map-0290\\.integration\\.test\\.ts$' || true; }",
      "espera": "^0$",
      "exemplos_regex": [
        {
          "regex": "^supabase/migrations/0290_ghl_user_map_nome\\.sql$|^src/lib/connectors/ghl/users-client(\\.test)?\\.ts$|^src/lib/comercial/ghl-usuarios/sincronizar(\\.test)?\\.ts$|^src/app/api/jobs/sincronizar-usuarios-ghl/route\\.ts$|^src/lib/comercial/painel/ranking-closer\\.ts$|^src/app/\\(painel\\)/comercial/closers/page\\.tsx$|^test/ranking-closer-tela\\.test\\.ts$|^test/ghl-user-map-0290\\.integration\\.test\\.ts$",
          "positivo": "src/lib/connectors/ghl/users-client.test.ts",
          "negativo": "vercel.json"
        }
      ]
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: (a) 0290 aditiva (add column nullable com CHECK, funcao v2 NOVA com o corpo completo da 0278 e closer_nome por left join no mapa vivo, invoker, grant so authenticated), 0278 intocada; (b) cliente no molde do de pipelines (Vault, um SELECT, erro redigido), so id e nome, 401/403 citando users.readonly; (c) sync idempotente, nunca escreve user_id, nunca apaga ou soft-deleta, lista vazia lanca sem escrever, nome null nao sobrescreve; (d) rota manual com CRON_SECRET, falha isolada por tenant, sem cron; (e) tela mostra o nome quando existe e o id como hoje quando nao existe, so com tokens; (f) testes cobrem cada caso com asercao positiva, e a integracao usa migrations reais sem recriar funcao.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "bloqueado 27/09/2026 (criacao): depende da reinstalacao do app GHL Marketplace com o escopo users.readonly (o token atual nao tem). Liberar com humano:ghl-escopo-users-confirmado e mudar status para pendente. Migration 0290 reservada a este ticket.",
  "tentativas": 0
}
```
