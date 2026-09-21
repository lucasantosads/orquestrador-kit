<!-- FIXTURE do kit (peça 7b-1). Origem: ~/Projetos/comarka-operacional/docs/fila/306-perf-leads-ingest-ghl-completa.md no commit 38fd7cb (2026-09-04, "fila: plano v4.1"), a última versão com status pendente e recon_esperado; no HEAD fc8eacb o ticket já é done. Copiado em 2026-09-21 por `git show`, só leitura. Esta linha é a única diferença para o original (cksum do original: 3974020104 5804). -->
# 306 — perf-leads-ingest-ghl-completa

> A **fonte de verdade de máquina** é o bloco ```json abaixo. A prosa é para humanos.

## Objetivo (prosa)

Onda 2 · frente F1 · camada API · tamanho M

CONTEXTO: a rota src/app/api/perf/ingest/ghl JÁ EXISTE (lista negra: não ganha gate de sessão; autentica por segredo próprio); perf_leads tem 0 linhas; perf_ghl_locations mapeia location_id → cliente_id (humano preencheu — token). FAZER: completar a rota existente (não criar outra): resolver cliente_id via perf_ghl_locations (location inativa/não mapeada → responder 202 com motivo e console.warn; sem tabela nova); gravar em perf_leads: telefone_e164, nome, email, ad_id/adset_id/campaign_id, ctwa_clid (+payload/recebido_em), utm_*, etapa, primeira_mensagem, fonte='ghl', atribuicao; chamar aplicarQualificacao do 307; idempotente por (cliente_id, telefone_e164) ou id externo no payload. Testes com payload real de webhook do GHL (fixture).

## Recon assumido (caminhos são hipótese até `--validate --repo`)

- `src/app/api/perf/ingest/ghl/**`
- `src/lib/perf/leads*.ts`
- `test/ingest-ghl.test.ts`

## Campos de máquina

```json
{
  "id": "306",
  "slug": "perf-leads-ingest-ghl-completa",
  "onda": 2,
  "frente": "F1",
  "camada": "API",
  "serie": null,
  "tam": "M",
  "objetivo": "CONTEXTO: a rota src/app/api/perf/ingest/ghl JÁ EXISTE (lista negra: não ganha gate de sessão; autentica por segredo próprio); perf_leads tem 0 linhas; perf_ghl_locations mapeia location_id → cliente_id (humano preencheu — token). FAZER: completar a rota existente (não criar outra): resolver cliente_id via perf_ghl_locations (location inativa/não mapeada → responder 202 com motivo e console.warn; sem tabela nova); gravar em perf_leads: telefone_e164, nome, email, ad_id/adset_id/campaign_id, ctwa_clid (+payload/recebido_em), utm_*, etapa, primeira_mensagem, fonte='ghl', atribuicao; chamar aplicarQualificacao do 307; idempotente por (cliente_id, telefone_e164) ou id externo no payload. Testes com payload real de webhook do GHL (fixture). REGRAS INVIOLÁVEIS: (0) Rota de cron nova NÃO edita vercel.json — reporte no commit a entrada que o humano deve registrar. (1) git add só por pathspec explícito. (2) Zona C0 = zero escrita e zero DDL em clientes_receita, leads_crm, leads_crm_historico, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month; leitura via SELECT é permitida. (3) Nunca tocar as rotas da lista negra — src/app/api/auth/**, src/app/api/nps/public/**, src/app/api/briefing-publico/**, src/app/api/publico/**, src/app/api/webhooks/**, src/app/api/perf/ingest/**, src/app/api/perf/reunioes/webhook/**, src/app/api/cron/** — nem as páginas públicas que elas servem, salvo quando a allowlist deste ticket os listar; nunca adicionar gate de sessão nelas. (4) Regra 19: nenhuma cifra em R$ de MRR, mensalidade ou LTV da agência em tela; LTV = meses na casa; dinheiro DO CLIENTE (fechamentos, ROI, ticket da tese) é permitido. (5) Sem dado = estado cinza 'sem base', nunca verde, nunca zero fingindo medição; todo número com denominador nomeado na mesma linha. (6) localStorage/sessionStorage proibidos. (7) Não editar docs/FAQ-USO.md nem tsconfig.tsbuildinfo. (8) UNIVERSO: 'cliente ativo' = a fonte única entregue pelo ticket 037 (leia docs/fila/037-*.md para o nome da função/rota; hoje = clientes_receita.status='ativo' = 78) — nunca contar por conta própria. (9) Se um arquivo ou rota citado aqui não existir no disco, pare e escreva no commit o que encontrou; não crie um paralelo. (10) Leitura de tabela C0 (clientes_receita etc.) em função própria, a 8+ linhas de qualquer insert/update/upsert/delete, e nunca citar nome de tabela C0 em comentário perto de mutação — o enforcement casa mutação numa janela de 6 linhas e bloqueia o ticket. (11) Só edite testes existentes se estiverem na allowlist; ao editar, recalcule asserções sob a nova regra com o porquê em comentário — nunca remover asserção, trocar toBe por toBeDefined, skip ou deletar teste.",
  "pathspec_allowlist": [
    "src/app/api/perf/ingest/ghl/**",
    "src/lib/perf/leads*.ts",
    "test/ingest-ghl.test.ts"
  ],
  "dependencias": [
    "307",
    "065b",
    "humano:ghl-locations-mapeadas",
    "humano:decisao-D6"
  ],
  "recon_esperado": [
    {
      "descricao": "diretório src/app/api/perf/ingest/ghl existe",
      "cmd": "( test -d 'src/app/api/perf/ingest/ghl' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "perf_ghl_locations usada",
      "cmd": "( grep -rq 'perf_ghl_locations' 'src/app/api/perf/ingest/ghl' || grep -rq 'perf_ghl_locations' src/lib/perf ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "qualificação aplicada",
      "cmd": "( grep -rq 'qualificacao/motor' 'src/app/api/perf/ingest/ghl' || grep -rq 'qualificacao/motor' src/lib/perf ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "sem gate de sessão na rota pública",
      "cmd": "( ! grep -rq 'getSession' 'src/app/api/perf/ingest/ghl' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "test/ingest-ghl.test.ts verde",
      "cmd": "( npx vitest run 'test/ingest-ghl.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "avaliador: rota existente completada (não duplicada); mapeamento por location; idempotência; ctwa e primeira_mensagem preservados; qualificação chamada; auth por segredo mantida",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
