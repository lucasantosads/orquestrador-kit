# Relatório — Actus, tarefas 1 a 4 (21/09/2026)

Repo: `lucasantos/actus-saas`, branch `main`. Commits locais, **sem push**. Loop
pausado pelo sentinela `docs/fila/.orq-pause` durante toda a rodada (não removido).
Nenhuma escrita no banco. Harness, `decisao.ts` e `000-config.json` não foram tocados
fora do que cada tarefa pediu (`decisao.ts` e `000-config.json`: intocados).

## Commits

| Tarefa | Commit | Assunto |
|---|---|---|
| 1 | `1e6b08d` | fila: refatia o 488 (adapter puro) e cria o 488b (ingest por messageId) |
| 2 | `1e3065e` | fila: guardas HEAD~1...HEAD viram $BASE_REF...HEAD (17 critérios, 10 tickets) |
| 3 | `a15daca` | gate-ticket: reprova saída textual do vitest; avisa caminho fora da allowlist |
| 4 | `132716b` | fila: 490a FK composta por tenant nos satélites da 0269 (não aplicada) |

## Tarefa 1 — fatiar o 488

Decisões do Lucas durante a tarefa: o 488 exporta o mapa (detalhe-mensagem.ts entra
na allowlist do 488 só para `export`); nenhum campo do payload marca áudio (medido em
produção pelo Lucas: `contentType` sempre `text/plain`; único sinal = extensão da URL do
anexo); sem anexo o adapter não decide tipo; nenhum ticket registra IMPEDIMENTO.

- **488** — `pendente`, `tentativas: 0`, nota "refatiado: objetivo contradizia a
  allowlist; resolução por messageId foi para o 488b".
  - Allowlist: `contratos.ts`, `adapter.ts`, `adapter.test.ts`,
    `persistencia.test.ts`, `detalhe-mensagem.ts` (só `export` de
    `EXTENSAO_AUDIO_PARA_MIME` e `mimeDeAudioPorUrl`).
  - COM anexo: áudio só pela extensão via `mimeDeAudioPorUrl` importado (proibido
    duplicar). SEM anexo: loga `midia_ghl_sem_anexo` só para WhatsApp + body vazio
    (trim) + sem anexo; não dispara com body nem com anexo.
  - Critérios leem rc; um exige os 3 testes do log; um guarda troca `adapter.ts` pelo
    da base (`git checkout $BASE_REF -- …`), exige o teste "dispara" vermelho e
    restaura sempre. Fluxo simulado sob `set -euo pipefail`: marca só no vermelho,
    restauração nos dois casos.
- **488b** — novo, `pendente`, depende de `488`.
  - Recon em `staging-auto`: `ingest.ts` já resolve áudio por messageId (ticket 480):
    `aplicarEnriquecimento`, ramo `audio`, grava `tipo: "audio"` e
    `metadata.ghlAudioMimeType`, mas NÃO preenche `msg.midia`. Áudio sem
    `ReferenciaMidia` é o que `src/lib/comercial/midia/pipeline.ts:141` rejeita —
    causa plausível das 534 linhas do Covas em `erro`.
  - Escopo: preencher `midia` nesse ramo (`provider 'ghl'`, `midiaExternalId` =
    messageId, `mimetype` do enriquecimento). Allowlist: `ingest.ts`, `ingest.test.ts`.
  - Desvio do pedido original: não toca `detalhe-mensagem.ts` (o export ficou no 488 e
    o mime já chega calculado).
- **489** passa a depender de `["488","488a","488b"]`; **496** de `["489","488b"]`.

## Tarefa 2 — guardas HEAD~1

`HEAD~1...HEAD` trocado por `$BASE_REF...HEAD` (variável que o executor exporta para
todo critério, `executor.sh:435`), só nas linhas `cmd` de tickets
pendente/bloqueado/refatiar. 17 critérios em 10 tickets:

431, 470, 471, 472, 481, 496, 497, 499, 499a, 501.

488, 488b e 490a nasceram com `$BASE_REF`. Varredura final: nenhum ticket aberto com o
padrão antigo (restam só em tickets `done`, fora do escopo).

## Tarefa 3 — duas regras novas no gate-ticket.ts

- **(a) reprova** critério em que o stdout de `vitest` (exceto `list`), `npm test` ou
  `pnpm test` alimenta um pipe `|`. Passa quem lê o rc (`>/dev/null 2>&1 && echo`,
  `; echo rc=$?`, `! vitest … && echo`) e `vitest list | grep -c`. `2>&1` é
  neutralizado antes da busca.
- **(b) avisa** (campo novo `Violacao.aviso`, não muda o rc) quando o objetivo cita
  caminho que a allowlist não cobre; texto depois de "FORA DE ESCOPO" não conta.
  `--relatorio` passa a contar avisos.
- Contra-teste `test/orquestrador-gate-vitest-aviso.test.ts`: 23 vermelhos antes,
  verdes depois. Fixture 903 = o 488 antes do refatiamento, verbatim: dispara o aviso
  (`detalhe-mensagem.ts`) e reprova por (a). O controle 902 (Tarefa A) passou a ler o
  rc, porque o `grep -cE` dele é saída textual pela regra (a).
- Varredura em pendente/bloqueado/refatiar (sem corrigir): (a) 11 critérios em 431,
  470, 471, 472, 489, 496, 497, 499, 499a, 900; (b) 12 tickets.

### Os 5 tickets TOCADOS nesta rodada que violam a regra (a)

| Ticket | Status | Critério | Comando exato |
|---|---|---|---|
| 431 | pendente | `criterios_aceite[2]` | `{ npx vitest run visao-consolidada --reporter=dot 2>&1 \| grep -cE '[1-9][0-9]* passed' \|\| true; }` |
| 489 | pendente | `criterios_aceite[0]` | `npx vitest run src/lib/comercial/midia 2>&1 \| grep -E 'passed\|failed'` |
| 496 | pendente | `criterios_aceite[0]` | `npx vitest run src/lib/comercial/midia/reprocessar.test.ts 2>&1 \| grep -E 'passed\|failed'` |
| 499 | pendente | `criterios_aceite[0]` | `npx vitest run src/lib/comercial/ghl-conversations/adapter.test.ts 2>&1 \| grep -E 'passed\|failed'` |
| 499a | pendente | `criterios_aceite[0]` | `npx vitest run src/lib/comercial/ghl-conversations/backfill-autor.test.ts 2>&1 \| grep -E 'passed\|failed'` |

Fora dos tocados, também cai em (a) e está pendente: **900** `criterios_aceite[1]`
(`node_modules/.bin/vitest run src/lib/format.test.ts 2>&1 | tail -5`). O critério do
431 é a reescrita da Tarefa A (`aab3f4e`), feita com `grep -cE` por instrução anterior.

## Tarefa 4 — 490a, FK composta da 0269

- Ticket **490a** (`pendente`, `risco: alto`, bloco B3) edita
  `supabase/migrations/0269_teses_catalogo.sql`: `unique (tenant_id, id)` em
  `tenant_teses`; FK composta `(tenant_id, tenant_tese_id) → tenant_teses (tenant_id,
  id)` nos 5 satélites no lugar da FK simples (MATCH SIMPLE: escopo catálogo, com os
  dois nulos, fica fora da checagem); índice único parcial `(tenant_id, catalogo_id)
  where deleted_at is null and catalogo_id is not null`; no rollback comentado da 0272,
  `briefing_campos_origem_check` no lugar do placeholder.
- Contra-teste: `supabase/tests/0269_teses_fk_composta.test.sql` (padrão do 615) +
  runner PGlite `test/teses-0269-fk-composta.integration.test.ts` que executa os
  arquivos reais; um critério troca a 0269 pela da base e exige vermelho.
- Provado em rascunho (PGlite, scaffold mínimo):

| Caso | 0269 atual | 0269 corrigida |
|---|---|---|
| `tese_requisitos` com tenant A → tese de B | aceito | recusado 23503 |
| `tese_mapa_origem` cruzado | aceito | recusado 23503 |
| adoção viva duplicada do mesmo catálogo | aceita | recusada 23505 |
| mesmo tenant | aceito | aceito |
| escopo catalogo (nulos) | aceito | aceito |
| readoção após soft delete | aceita | aceita |

## Leituras do banco (produção `fqwhpcusmkmvtgyofuwh`, só leitura via MCP)

1. `select version, name from supabase_migrations.schema_migrations where version >=
   '0260'` → 0260, 0261, 0262, 0263, 0264, 0268, `20260913154422`
   (`0266_briefing_taxonomia`), `20260915140725` (`0271_fn_sugestao_resolver_v2`).
   **0269 e 0272 ausentes** (não aplicadas). Achados, não corrigidos: 0266 e 0271 com
   `version` em timestamp (não normalizadas); 0270 ausente com a 0271 aplicada;
   `docs/fila/ultima-migration-aplicada.txt` (0271) é marca d'água, não "tudo até 0271".
2. `information_schema.tables` em `comercial` para as sete tabelas da 0269 → **vazio**
   (nenhuma existe).

Houve uma terceira leitura, de apoio ao 490a: colunas NOT NULL de `public.tenants` →
`id`, `nome`, `slug`, `status`, `created_at`, `updated_at` (o teste SQL precisa de
`nome` e `slug`).

## Verificação final

- `gate-ticket --relatorio` nos 14 tickets tocados (488, 488b, 489, 496, 431, 470,
  471, 472, 481, 497, 499, 499a, 501, 490a): **5 violações** (as da tabela acima, todas
  da regra (a)), 7 avisos; os outros 9 OK.
- Suíte do harness: vitest `test/orquestrador` 8 arquivos, 101/101;
  `test-drenagem.sh`, `test-lib-config.sh`, `test-retry-worktree.sh`,
  `test-tentativas-persistidas.sh` verdes; `test-preflight.sh` com 1 falha
  pré-existente (fixtures ausentes em `test/fixtures/claude-envelope`).
- Árvore limpa; sentinela presente.

## Outros achados

- Pergunta lateral (rotas 491a/b/c, lidas em `staging-auto`): nenhuma consulta de
  escopo catálogo a `tese_requisitos`/`tese_exclusoes`/`tese_faixas`/`tese_renda_proxy`
  usa cliente autenticado. A única é `src/app/api/comercial/teses/adotar/route.ts:139-144`,
  com service role (`createServiceRoleSupabase()`, :64). A única consulta autenticada é
  `catalogo/route.ts:129-138`, sobre `tese_catalogo`, que tem policy própria.
- O loop não chama `gate-ticket` em runtime: as regras novas não bloqueiam execução.
- O ticket 621 ainda manda registrar IMPEDIMENTO — canal removido do harness; ajustar.

## Despausar?

**Ainda não.** Antes:

1. Identificar quem religou o loop às 11:54 (sentinela removido + launchd
   rebootstrapado fora desta sessão) — sem isso, a pausa não é confiável.
2. Decidir os 6 pendentes com critério de saída textual (431, 489, 496, 499, 499a,
   900). O loop não os barra; o risco é limitado porque o gate `testes` lê o rc da suíte
   inteira.
3. Aceitar que a próxima drenagem é o primeiro uso real das tentativas persistidas
   (`f3aaa89`) e dos critérios que trocam arquivo pela base (488, 488b, 490a) — ambos só
   provados com stub/simulação.

Com 1 e 2 resolvidos: `scripts/orquestrador/orq-pause.sh --off` e acompanhar a primeira
drenagem (commits "fila: N tentativa K", campo `tentativas` avançando, restauração dos
arquivos nos critérios de base).
