# 306b — perf-fechamentos-ingest

> A **fonte de verdade de máquina** é o bloco ```json abaixo. A prosa é para humanos.

## Objetivo (prosa)

Onda 3 · frente F1 · camada API+UI · tamanho M · série `ficha`

CONTEXTO: perf_fechamentos (cliente_id, tese_id, lead_id, modalidade, valor_total, entrada, n_parcelas, pct_exito, data_fechamento, origem) tem 0 linhas — é dinheiro DO CLIENTE (permitido). D5: etapa 'comprou' no GHL + formulário manual na ficha. FAZER: (a) na rota de ingest do GHL (existente), evento de etapa 'comprou' cria perf_fechamentos com lead_id (perf_leads por telefone/id externo), origem='ghl', data_fechamento; (b) na ficha (Conta › Resultados), formulário 'Registrar fechamento' com modalidade/valor/entrada/parcelas/%êxito/tese, origem='manual', definido_por = sessão. Se o diff passar de 400 linhas, entregar só (a) e reportar (b) como pendente no commit.

## Recon assumido (caminhos são hipótese até `--validate --repo`)

- `src/app/api/perf/ingest/ghl/**`
- `src/lib/perf/fechamentos*.ts`
- `src/app/dashboard/clientes/[id]/**`
- `src/app/api/perf/fechamentos/**`
- `test/fechamentos.test.ts`
- `test/header-cliente-consolidado.test.ts`
- `test/abas-montadas.test.ts`

## Campos de máquina

```json
{
  "id": "306b",
  "slug": "perf-fechamentos-ingest",
  "onda": 3,
  "frente": "F1",
  "camada": "API+UI",
  "serie": "ficha",
  "tam": "M",
  "objetivo": "CONTEXTO: perf_fechamentos (cliente_id, tese_id, lead_id, modalidade, valor_total, entrada, n_parcelas, pct_exito, data_fechamento, origem) tem 0 linhas — é dinheiro DO CLIENTE (permitido). D5: etapa 'comprou' no GHL + formulário manual na ficha. FAZER: (a) na rota de ingest do GHL (existente), evento de etapa 'comprou' cria perf_fechamentos com lead_id (perf_leads por telefone/id externo), origem='ghl', data_fechamento; (b) na ficha (Conta › Resultados), formulário 'Registrar fechamento' com modalidade/valor/entrada/parcelas/%êxito/tese, origem='manual', definido_por = sessão. Se o diff passar de 400 linhas, entregar só (a) e reportar (b) como pendente no commit. REGRAS INVIOLÁVEIS: (0) Rota de cron nova NÃO edita vercel.json — reporte no commit a entrada que o humano deve registrar. (1) git add só por pathspec explícito. (2) Zona C0 = zero escrita e zero DDL em clientes_receita, leads_crm, leads_crm_historico, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month; leitura via SELECT é permitida. (3) Nunca tocar as rotas da lista negra — src/app/api/auth/**, src/app/api/nps/public/**, src/app/api/briefing-publico/**, src/app/api/publico/**, src/app/api/webhooks/**, src/app/api/perf/ingest/**, src/app/api/perf/reunioes/webhook/**, src/app/api/cron/** — nem as páginas públicas que elas servem, salvo quando a allowlist deste ticket os listar; nunca adicionar gate de sessão nelas. (4) Regra 19: nenhuma cifra em R$ de MRR, mensalidade ou LTV da agência em tela; LTV = meses na casa; dinheiro DO CLIENTE (fechamentos, ROI, ticket da tese) é permitido. (5) Sem dado = estado cinza 'sem base', nunca verde, nunca zero fingindo medição; todo número com denominador nomeado na mesma linha. (6) localStorage/sessionStorage proibidos. (7) Não editar docs/FAQ-USO.md nem tsconfig.tsbuildinfo. (8) UNIVERSO: 'cliente ativo' = a fonte única entregue pelo ticket 037 (leia docs/fila/037-*.md para o nome da função/rota; hoje = clientes_receita.status='ativo' = 78) — nunca contar por conta própria. (9) Se um arquivo ou rota citado aqui não existir no disco, pare e escreva no commit o que encontrou; não crie um paralelo. (10) Leitura de tabela C0 (clientes_receita etc.) em função própria, a 8+ linhas de qualquer insert/update/upsert/delete, e nunca citar nome de tabela C0 em comentário perto de mutação — o enforcement casa mutação numa janela de 6 linhas e bloqueia o ticket. (11) Só edite testes existentes se estiverem na allowlist; ao editar, recalcule asserções sob a nova regra com o porquê em comentário — nunca remover asserção, trocar toBe por toBeDefined, skip ou deletar teste.\n\nREESCRITO EM 19/09 — LEIA docs/fila/runs/306b/ ANTES DE COMECAR. A tentativa 1 passou no enforcement; a tentativa 2 foi barrada com dois fora_do_pathspec: src/lib/perf/leads-ghl.ts e supabase/migrations/20260919_306b_fechamentos_origem_ghl.sql. O diff era de 351 linhas em 7 arquivos — tamanho nunca foi o problema, so o pathspec. As duas correcoes: (A) src/lib/perf/leads-ghl.ts ENTROU NA ALLOWLIST. Ele nao existia quando este ticket foi escrito: veio com o 306, que foi promovido para main em 19/09, e e onde mora ingerirLeadGhl — o unico caminho de ingestao do GHL. Tratar a etapa 'comprou' obriga a passar por la. Junto entrou test/ingest-ghl.test.ts, SO COMO GUARDA de nao-regressao: ele tem 7 it medidas em 19/09, prende o comportamento do webhook por workflow do 306 e nao pode ser afrouxado — proibido remover assercao, trocar toBe por toBeDefined, usar skip/only ou deletar teste. Quem mandar lead sem os campos novos tem de continuar recebendo exatamente a mesma resposta de hoje. (B) A DDL SAIU PARA O TICKET 306b0. Este ticket NAO escreve nada em supabase/migrations/. A tabela perf_fechamentos so aceita origem 'funil', 'manual' ou 'estimativa' (CHECK perf_fechamentos_origem_check, medido em pg_constraint em 19/09) — 'ghl' e recusado pelo banco ate o 306b0 ser aplicado, e por isso 306b0 e humano:ddl-306b0 sao dependencias e este ticket fica bloqueado ate a liberacao. O 306b0 tambem cria o indice unico parcial uq_perf_fechamentos_ghl_lead sobre (lead_id) WHERE origem='ghl', que e a idempotencia de reentrega do webhook: conte com ela, nao a reimplemente e nao a recrie. Se ao rodar o banco ainda recusar origem='ghl', o sinal e que o 306b0 nao entrou: PARE e reporte no commit, nao contorne com outro valor de origem e nao escreva migration aqui. (C) ORDEM COM A ONDA GHL: o ticket 475c tambem estende src/lib/perf/leads-ghl.ts (mapper do app e ghl_contact_id). Por isso 475c e dependencia declarada — comece da arvore com ele dentro e ESTENDA o helper, nunca reescreva o que ele deixou. (D) MEDIDO EM 19/09: perf_fechamentos tem 18 colunas e 0 linhas; valor_total e modalidade JA sao anulaveis, entao lead sem valor informado grava NULL — nunca 0, que fingiria medicao (REGRA 5).",
  "pathspec_allowlist": [
    "src/app/api/perf/ingest/ghl/**",
    "src/lib/perf/leads-ghl.ts",
    "src/lib/perf/fechamentos*.ts",
    "src/app/dashboard/clientes/[id]/**",
    "src/app/api/perf/fechamentos/**",
    "test/fechamentos.test.ts",
    "test/ingest-ghl.test.ts",
    "test/header-cliente-consolidado.test.ts",
    "test/abas-montadas.test.ts"
  ],
  "dependencias": [
    "306",
    "296",
    "258",
    "311a1",
    "311a2",
    "311b",
    "337",
    "065b",
    "323",
    "306b0",
    "475c",
    "humano:ghl-locations-mapeadas",
    "humano:decisao-D5",
    "humano:ddl-306b0",
    "500"
  ],
  "recon_esperado": [
    {
      "descricao": "diretório src/app/api/perf/ingest/ghl existe",
      "cmd": "( test -d 'src/app/api/perf/ingest/ghl' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "diretório src/app/dashboard/clientes/[id] existe",
      "cmd": "( test -d 'src/app/dashboard/clientes/[id]' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "o helper do 306 existe, exporta ingerirLeadGhl e e o unico caminho da rota de ingest",
      "cmd": "( grep -qF 'export async function ingerirLeadGhl' src/lib/perf/leads-ghl.ts && grep -qF 'ingerirLeadGhl' src/app/api/perf/ingest/ghl/route.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "a guarda de nao-regressao do 306 existe com as 7 it medidas",
      "cmd": "( [ \"$(grep -c 'it(' test/ingest-ghl.test.ts)\" = 7 ] && ! grep -qE '[.](skip|only|todo)[(]' test/ingest-ghl.test.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "a DDL do 306b0 ainda nao esta no repo e este ticket nao a escreve",
      "cmd": "( [ \"$(ls supabase/migrations | grep -c '306b')\" = 0 ] && [ \"$(ls supabase/migrations | grep -c 'fechamentos_origem_ghl')\" = 0 ] ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "perf_fechamentos ainda nao e escrita por codigo nenhum do repo",
      "cmd": "( ! grep -rqE 'from[(][\"]perf_fechamentos[\"][)][.](insert|update|upsert|delete)' src ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "etapa comprou tratada no caminho de ingestao do GHL",
      "cmd": "( grep -rqF 'comprou' src/lib/perf/leads-ghl.ts || grep -rqF 'comprou' src/lib/perf ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "alvo"
    },
    {
      "descricao": "origem 'ghl' e 'manual' aparecem no caminho de fechamento",
      "cmd": "( grep -rqE \"'ghl'|'manual'\" src/lib/perf/fechamentos.ts src/app/api/perf/fechamentos 2>/dev/null ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "alvo"
    },
    {
      "descricao": "GUARDA: NENHUMA migration foi escrita por este ticket — a DDL e do 306b0",
      "cmd": "( [ \"$(ls supabase/migrations | grep -c '306b_')\" = 0 ] && [ \"$(git diff --name-only origin/staging-auto...HEAD -- supabase/migrations | wc -l | tr -d ' ')\" = 0 ] ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "test/fechamentos.test.ts existe com >= 6 it, sem skip/only, e passa",
      "cmd": "( test -f test/fechamentos.test.ts && [ \"$(grep -c 'it(' test/fechamentos.test.ts)\" -ge 6 ] && ! grep -qE '[.](skip|only|todo)[(]' test/fechamentos.test.ts && npx vitest run 'test/fechamentos.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "alvo"
    },
    {
      "descricao": "GUARDA: a ingestao por workflow do 306 nao regride — test/ingest-ghl.test.ts com >= 7 it, sem skip, verde",
      "cmd": "( [ \"$(grep -c 'it(' test/ingest-ghl.test.ts)\" -ge 7 ] && ! grep -qE '[.](skip|only|todo)[(]' test/ingest-ghl.test.ts && npx vitest run 'test/ingest-ghl.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "GUARDA: o helper do 306 continua exportando ingerirLeadGhl e a rota de ingest continua entrando por ele",
      "cmd": "( grep -qF 'export async function ingerirLeadGhl' src/lib/perf/leads-ghl.ts && grep -qF 'ingerirLeadGhl' src/app/api/perf/ingest/ghl/route.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "GUARDA: a ficha do cliente nao regride — header e abas montadas seguem verdes",
      "cmd": "( npx vitest run 'test/header-cliente-consolidado.test.ts' 'test/abas-montadas.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "GUARDA: test/c0-guard.test.ts verde",
      "cmd": "( npx vitest run 'test/c0-guard.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "GUARDA: tsc no baseline de 3 erros em src/",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -c '^src/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: ZERO DDL NESTE TICKET. Nenhum arquivo em supabase/migrations/ aparece no diff. O ticket conta com origem='ghl' e com o indice unico parcial uq_perf_fechamentos_ghl_lead ja aplicados pelo 306b0 — nao os recria, nao os contorna e nao inventa outro valor de origem. Se o banco recusar origem='ghl', o ticket para e reporta.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "descricao": "avaliador: O HELPER DO 306 FOI ESTENDIDO, NAO REESCRITO. A etapa 'comprou' entra por src/lib/perf/leads-ghl.ts, que ja resolve location, mapeia, valida e grava. Nenhuma duplicacao desse fluxo dentro da rota nem dentro de fechamentos.ts. Chamada sem os campos novos se comporta exatamente como hoje, e test/ingest-ghl.test.ts passa com as MESMAS assercoes, sem afrouxamento.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "descricao": "avaliador: comprou -> perf_fechamentos com lead_id e origem='ghl'; o formulario manual grava origem='manual' e definido_por = sessao. Reentrega do mesmo evento nao duplica — a chave e o indice unico parcial do 306b0. Valor ausente grava NULL, nunca 0: valor_total e modalidade sao anulaveis (medido em 19/09) e zero fingiria medicao (REGRA 5).",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "descricao": "avaliador: os valores exibidos sao dinheiro DO CLIENTE (fechamento, entrada, parcela, exito) e estao rotulados assim — a REGRA 19 proibe cifra de MRR/mensalidade/LTV da agencia, nao isto. Nenhuma escrita em zona C0.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "reescrito 19/09: o enforcement da tentativa 2 barrou src/lib/perf/leads-ghl.ts (que veio com o 306, promovido depois que este ticket foi escrito) e a migration 20260919_306b_fechamentos_origem_ghl.sql. leads-ghl.ts entrou na allowlist e test/ingest-ghl.test.ts entrou como guarda; a DDL saiu para o ticket novo 306b0 (sql-proposta, nao aplica). Dependencias novas: 306b0, 475c e humano:ddl-306b0 — este ultimo ainda nao liberado, por isso o ticket permanece bloqueado."
}
```
