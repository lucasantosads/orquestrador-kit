# 322 — ia-carteira-mensal

> A **fonte de verdade de máquina** é o bloco ```json abaixo. A prosa é para humanos.

## Objetivo (prosa)

Onda 5 · frente F5 · camada job+UI · tamanho M

FAZER: job mensal que cruza churn_log (motivo × gestor × nicho × tempo de casa) com os dossiês do 320 e produz recomendações de processo em perf_analises (cliente_id null); bloco em Retenção; sem R$; inputs listados; 'sem base' quando n<3.

## Recon assumido (caminhos são hipótese até `--validate --repo`)

- `src/lib/jobs/ia-carteira*.ts`
- `src/app/api/cron/ia-carteira/**`
- `src/lib/ia-carteira/**`
- `src/app/dashboard/clientes/saude/**`
- `test/ia-carteira.test.ts`

## Campos de máquina

```json
{
  "id": "322",
  "slug": "ia-carteira-mensal",
  "onda": 5,
  "frente": "F5",
  "camada": "job+UI",
  "serie": null,
  "tam": "M",
  "objetivo": "FAZER: job mensal que cruza churn_log (motivo × gestor × nicho × tempo de casa) com os dossiês do 320 e produz recomendações de processo em perf_analises (cliente_id null); bloco em Retenção; sem R$; inputs listados; 'sem base' quando n<3. REGRAS INVIOLÁVEIS: (0) Rota de cron nova NÃO edita vercel.json — reporte no commit a entrada que o humano deve registrar. (1) git add só por pathspec explícito. (2) Zona C0 = zero escrita e zero DDL em clientes_receita, leads_crm, leads_crm_historico, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month; leitura via SELECT é permitida. (3) Nunca tocar as rotas da lista negra — src/app/api/auth/**, src/app/api/nps/public/**, src/app/api/briefing-publico/**, src/app/api/publico/**, src/app/api/webhooks/**, src/app/api/perf/ingest/**, src/app/api/perf/reunioes/webhook/**, src/app/api/cron/** — nem as páginas públicas que elas servem, salvo quando a allowlist deste ticket os listar; nunca adicionar gate de sessão nelas. (4) Regra 19: nenhuma cifra em R$ de MRR, mensalidade ou LTV da agência em tela; LTV = meses na casa; dinheiro DO CLIENTE (fechamentos, ROI, ticket da tese) é permitido. (5) Sem dado = estado cinza 'sem base', nunca verde, nunca zero fingindo medição; todo número com denominador nomeado na mesma linha. (6) localStorage/sessionStorage proibidos. (7) Não editar docs/FAQ-USO.md nem tsconfig.tsbuildinfo. (8) UNIVERSO: 'cliente ativo' = a fonte única entregue pelo ticket 037 (leia docs/fila/037-*.md para o nome da função/rota; hoje = clientes_receita.status='ativo' = 78) — nunca contar por conta própria. (9) Se um arquivo ou rota citado aqui não existir no disco, pare e escreva no commit o que encontrou; não crie um paralelo. (10) Leitura de tabela C0 (clientes_receita etc.) em função própria, a 8+ linhas de qualquer insert/update/upsert/delete, e nunca citar nome de tabela C0 em comentário perto de mutação — o enforcement casa mutação numa janela de 6 linhas e bloqueia o ticket. (11) Só edite testes existentes se estiverem na allowlist; ao editar, recalcule asserções sob a nova regra com o porquê em comentário — nunca remover asserção, trocar toBe por toBeDefined, skip ou deletar teste.",
  "pathspec_allowlist": [
    "src/lib/jobs/ia-carteira*.ts",
    "src/app/api/cron/ia-carteira/**",
    "src/lib/ia-carteira/**",
    "src/app/dashboard/clientes/saude/**",
    "test/ia-carteira.test.ts"
  ],
  "dependencias": [
    "314a",
    "314d",
    "320",
    "065b",
    "327",
    "328",
    "325a",
    "317",
    "315a6",
    "315a9",
    "312",
    "321"
  ],
  "recon_esperado": [
    {
      "descricao": "diretório src/app/dashboard/clientes/saude existe",
      "cmd": "( test -d 'src/app/dashboard/clientes/saude' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "sem cifra",
      "cmd": "( ! grep -rEq 'valor_mensal|ltv_total|mensalidade' src/lib/ia-carteira ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "test/ia-carteira.test.ts verde",
      "cmd": "( npx vitest run 'test/ia-carteira.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "avaliador: recomendações de processo, não de cliente; inputs listados; sem R$",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
