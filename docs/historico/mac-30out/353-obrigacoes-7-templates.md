# 353 — obrigacoes-7-templates

> A **fonte de verdade de máquina** é o bloco ```json abaixo. A prosa é para humanos.

## Objetivo (prosa)

Onda 2 · frente F9 · camada seed+lib+test · tamanho M

CONTEXTO: ops_tarefa_template está vazia (0) e ops_tarefa_ocorrencia também; o 374 adicionou por_cliente, fonte_evidencia, cliente_id, evidencia, estado. As 7 obrigações do gestor por cliente vêm de docs/obrigacoes/LISTA.md (o humano escreve antes: nome, recorrência, fonte de evidência — token decisao-obrigacoes-lista). D23: daily = reunião do time, presença via Calendar. D24: interação no grupo = 48h úteis sem mensagem da equipe. FAZER: (a) seed idempotente scripts/dados/353-templates.ts (dry-run padrão) lendo docs/obrigacoes/LISTA.md → 7 ops_tarefa_template por_cliente=true com fonte_evidencia; (b) gerador src/lib/obrigacoes/gerador.ts: para cada template × (cliente, gestor) ativo em perf_cliente_gestor cria ops_tarefa_ocorrencia (chave única do 374) por período; (c) avaliador src/lib/obrigacoes/evidencia.ts: por fonte_evidencia consulta a fonte (meta_activity → 361; cron_relatorio; calendar → 356; whatsapp → 360; manual) e grava estado ok|atrasado|sem_fonte com evidencia jsonb — fonte sem integração ⇒ 'sem_fonte', NUNCA 'atrasado' nem 'ok'; (d) registra fonte 'obrigacoes' no motor 315b1 (itens = ocorrências atrasadas com dono = responsavel_id).

## Recon assumido (caminhos são hipótese até `--validate --repo`)

- `scripts/dados/353-templates.ts`
- `src/lib/obrigacoes/**`
- `src/lib/hoje/fontes/obrigacoes*.ts`
- `test/obrigacoes.test.ts`

## Campos de máquina

```json
{
  "id": "353",
  "slug": "obrigacoes-7-templates",
  "onda": 2,
  "frente": "F9",
  "camada": "seed+lib+test",
  "serie": null,
  "tam": "M",
  "objetivo": "CONTEXTO: ops_tarefa_template está vazia (0) e ops_tarefa_ocorrencia também; o 374 adicionou por_cliente, fonte_evidencia, cliente_id, evidencia, estado. As 7 obrigações do gestor por cliente vêm de docs/obrigacoes/LISTA.md (o humano escreve antes: nome, recorrência, fonte de evidência — token decisao-obrigacoes-lista). D23: daily = reunião do time, presença via Calendar. D24: interação no grupo = 48h úteis sem mensagem da equipe. FAZER: (a) seed idempotente scripts/dados/353-templates.ts (dry-run padrão) lendo docs/obrigacoes/LISTA.md → 7 ops_tarefa_template por_cliente=true com fonte_evidencia; (b) gerador src/lib/obrigacoes/gerador.ts: para cada template × (cliente, gestor) ativo em perf_cliente_gestor cria ops_tarefa_ocorrencia (chave única do 374) por período; (c) avaliador src/lib/obrigacoes/evidencia.ts: por fonte_evidencia consulta a fonte (meta_activity → 361; cron_relatorio; calendar → 356; whatsapp → 360; manual) e grava estado ok|atrasado|sem_fonte com evidencia jsonb — fonte sem integração ⇒ 'sem_fonte', NUNCA 'atrasado' nem 'ok'; (d) registra fonte 'obrigacoes' no motor 315b1 (itens = ocorrências atrasadas com dono = responsavel_id). REGRAS INVIOLÁVEIS: (0) Rota de cron nova NÃO edita vercel.json — reporte no commit a entrada que o humano deve registrar. (1) git add só por pathspec explícito. (2) Zona C0 = zero escrita e zero DDL em clientes_receita, leads_crm, leads_crm_historico, trafego_*, ads_metadata, ads_performance, vw_*, fn_mql_sql_by_month; leitura via SELECT é permitida. (3) Nunca tocar as rotas da lista negra — src/app/api/auth/**, src/app/api/nps/public/**, src/app/api/briefing-publico/**, src/app/api/publico/**, src/app/api/webhooks/**, src/app/api/perf/ingest/**, src/app/api/perf/reunioes/webhook/**, src/app/api/cron/** — nem as páginas públicas que elas servem, salvo quando a allowlist deste ticket os listar; nunca adicionar gate de sessão nelas. (4) Regra 19: nenhuma cifra em R$ de MRR, mensalidade ou LTV da agência em tela; LTV = meses na casa; dinheiro DO CLIENTE (fechamentos, ROI, ticket da tese) é permitido. (5) Sem dado = estado cinza 'sem base', nunca verde, nunca zero fingindo medição; todo número com denominador nomeado na mesma linha. (6) localStorage/sessionStorage proibidos. (7) Não editar docs/FAQ-USO.md nem tsconfig.tsbuildinfo. (8) UNIVERSO: 'cliente ativo' = a fonte única entregue pelo ticket 037 (leia docs/fila/037-*.md para o nome da função/rota; hoje = clientes_receita.status='ativo' = 78) — nunca contar por conta própria. (9) Se um arquivo ou rota citado aqui não existir no disco, pare e escreva no commit o que encontrou; não crie um paralelo. (10) Leitura de tabela C0 (clientes_receita etc.) em função própria, a 8+ linhas de qualquer insert/update/upsert/delete, e nunca citar nome de tabela C0 em comentário perto de mutação — o enforcement casa mutação numa janela de 6 linhas e bloqueia o ticket. (11) Só edite testes existentes se estiverem na allowlist; ao editar, recalcule asserções sob a nova regra com o porquê em comentário — nunca remover asserção, trocar toBe por toBeDefined, skip ou deletar teste.",
  "pathspec_allowlist": [
    "scripts/dados/353-templates.ts",
    "src/lib/obrigacoes/**",
    "src/lib/hoje/fontes/obrigacoes*.ts",
    "test/obrigacoes.test.ts"
  ],
  "dependencias": [
    "315b1",
    "355",
    "363",
    "humano:ddl-374",
    "humano:decisao-obrigacoes-lista",
    "humano:decisao-D23",
    "humano:decisao-D24"
  ],
  "recon_esperado": [
    {
      "descricao": "pasta-base scripts existe",
      "cmd": "( test -d 'scripts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "gerador e avaliador exportados",
      "cmd": "( grep -Eq 'export (async )?function gerarOcorrencias' src/lib/obrigacoes/gerador.ts && grep -Eq 'export (async )?function avaliarEvidencia' src/lib/obrigacoes/evidencia.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "sem_fonte tratado",
      "cmd": "( grep -q 'sem_fonte' src/lib/obrigacoes/evidencia.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "fonte registrada no motor",
      "cmd": "( grep -q 'registrarFonte' src/lib/hoje/fontes/obrigacoes.ts ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "test/obrigacoes.test.ts verde",
      "cmd": "( npx vitest run 'test/obrigacoes.test.ts' ) >/dev/null 2>&1 && echo OK || echo FAIL",
      "espera": "OK"
    },
    {
      "descricao": "avaliador: templates lidos da LISTA (não inventados); ocorrência por cliente×gestor com a chave do 374; sem integração ⇒ sem_fonte; fonte 'obrigacoes' no motor; nada escrito sem --apply no seed",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
