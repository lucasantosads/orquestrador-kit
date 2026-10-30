# Actus: bloqueados resolvidos e fila nova (22/09/2026)

Sessão manual no checkout principal (`~/Projetos/actus-saas`, branch `main`, remoto `lucasantosads/actus-saas`).
Nada foi aplicado no banco e nada foi pushado. O sentinela `docs/fila/.orq-pause` continua no lugar.
`decisao.ts` e `000-config.json` não foram tocados.

**Estado antes de escrever:** às 10:14 o `STATUS.md` mostrava `executando` (481, tentativa 1). Esperei até `ocioso` (10:21:57). O 481 terminou ADIADO por `ambiente`, e só então comecei a escrever.

## Verificação final

| Checagem | Resultado |
|---|---|
| `gate-ticket --pendentes` | **0 violações**, 13 avisos (caminho citado só para leitura), 15 tickets, rc 0 |
| `vitest run test/orquestrador` (10 arquivos) | verde, rc 0 |
| `test-drenagem`, `test-gate-prevoo`, `test-lib-config`, `test-retry-worktree`, `test-tentativas-persistidas` | rc 0 |
| `test-preflight.sh` | **rc 1, 1 check**: `fixtures de envelope ausentes`. A falha já existia e virou o ticket 504 (o B3 não era manual), por isso continua vermelha |
| `tsc -p tsconfig.scripts.json` (config de `staging-auto`) | 0 erros |

## Commits (todos locais, em `main`)

| Commit | Tarefa |
|---|---|
| `c63c58b` | A1: 470 refatiado em 470b/470c; 472 reescrito; 471 religado |
| `9a3c8d9` | A2: 497 done por refatiamento; as fatias restantes viraram tarefa manual |
| `76af390` | A3: `PORTE-PENDENTE:` contexto_juiz (622); 622 done; 501 reaberto |
| `ae29dcd` | A4: `PORTE-PENDENTE:` teto de adiamento por `ambiente` |
| `c7e81bc` | A4: `PORTE-PENDENTE:` "PROIBIDO" com o mesmo tratamento de "FORA DE ESCOPO" |
| `550703d` `b42f2e2` `5250203` `fea57b1` | B1 a B4: tickets 502, 503, 504, 505 |

Os três commits de harness levam o prefixo `PORTE-PENDENTE:`, como pede o CLAUDE.md (§Motor do orquestrador: dono único). O motor é do orquestrador-kit, e um `instalar.sh --atualizar` apaga essas mudanças. **O kit precisa portar os três antes da próxima atualização.**

## O que foi resolvido

### A1 · 470: espelho cru
- **470b**: ticket da migration **0275** `comercial.ghl_stages`. Número conferido em `staging-auto` `cb2f9b5`. 0274 é reserva do 501; 0265 está em `main`; 0267 era a reserva do 483, resolvido com 0270/0271.
  - Colunas de mapeamento com os nomes que você decidiu: `mapeamento_canonico` (CHECK nos 5 valores) e `mapeamento_origem` (`sugerido`|`humano`), com CHECK de coerência "nulos juntos".
  - Nada chamado `etapa_canonica` no arquivo. Um critério conta zero ocorrências.
  - RLS e GRANTs copiados da 0103. Sem FK para `comercial.pipelines`, porque o espelho é autônomo.
- **470c**: sync pelo cliente do 500 (`listarPipelinesGhl`).
  - Upsert em dois passos, porque o índice é parcial e o PostgREST não aceita `onConflict` nele.
  - Soft delete das etapas que sumiram. Nunca grava `mapeamento_*`.
  - Resposta vazia do GHL lança erro em vez de soft-deletar tudo.
- **470**: done por refatiamento, apontando para 470b e 470c.
- **471**: continua bloqueado, com dependência religada para o 470c e a nota que você ditou.
- **472**: reescrito. Sugere `mapeamento_canonico` só onde é NULL, com `origem='sugerido'`, e o UPDATE tem guarda `mapeamento_canonico is null`.
  - Nunca sobrescreve `humano` nem uma sugestão que já existe. Valor fora dos 5 não é gravado e vai para o log.
  - Não toca `funnel_stages`. Depende do 470c.

### A2 · 497
O 497a e o `local-loop.log` de 13/09 (12:58 a 13:22) respondem a pergunta 1: o sintoma **não aconteceu**. O 480 estava `pendente` quando entrou na drenagem e só foi marcado done à mão às 13:22:50 (`ecf6f4e`), depois do bloqueio.

As duas fatias que sobram ficam em `scripts/orquestrador/**` (no_write_paths), então viraram tarefas manuais M1 e M2, sem ticket. O 497 fica done por refatiamento.

### A3 · 622: contexto_juiz (implementado agora)
- **Contra-teste** `test/orquestrador-contexto-juiz.test.ts`: roda `run_juiz` de verdade, com juiz stubado. **9 vermelhos antes** (o critério cita um arquivo fora do diff e o material do juiz não o trazia) e 14/14 verdes depois.
- **(a)** Ticket sem o campo gera prompt idêntico byte a byte. O teste fixa o sha256 medido antes da mudança.
- **(b)** O executor lê cada caminho com `git show <base>:<path>`.
  - Teto de 400 linhas por arquivo e 1200 no total, como constante. O truncamento fica escrito no texto.
  - Caminho ausente na base dá `die`.
- **(c)** O bloco `ARQUIVOS DE REFERÊNCIA (estado na base, NÃO fazem parte do diff)` entra antes dos gates, e cada arquivo leva o rótulo "estado na base, NÃO faz parte do diff".
  - **Desvio consciente:** a frase "referência é para comparar" ficou dentro do bloco, e não no CABECALHO. No CABECALHO ela quebraria o item (a).
- **(d)** Check 9 do gate-ticket: lista de strings, e cada caminho tem que existir na `branch_alvo` (`git cat-file`).
  - Caminho **listado** na allowlist é violação.
  - Caminho coberto só por **glob** é aviso. Esse é o caso do 501: a allowlist `supabase/migrations/*.sql` casa a 0264. Com casamento por glob, o 501 seria recusado.
- Resultado na fila: 622 done. 501 reaberto (pendente, tentativas 0) com `contexto_juiz: ["supabase/migrations/0264_admin_visao_consolidada.sql"]`, e o gate dá OK para ele.

### A4 · harness
- **Teto de adiamento por `ambiente`:** o contador `adiamentos_ambiente` fica no ticket.
  - O 3º adiamento consecutivo vira `bloqueado`, com nota que traz a causa, o último motivo e as permissões negadas.
  - Zera quando o ticket passa de fase: `ticket_set_status` para qualquer status que não seja pendente, o que inclui o bloqueio. Por isso o ticket reaberto volta sem contador.
  - Zera também numa reprovação, que quebra a sequência.
  - Adiamento por outra causa não conta nem zera.
  - Não precisou mexer em `decisao.ts` nem no config: a causa já chega classificada em `veredito.causa`, e o teto é constante.
  - Contra-teste com `drive_ticket` real: 4 vermelhos antes, 5/5 depois.
- **"PROIBIDO"**: o aviso de caminho fora da allowlist agora corta no primeiro "FORA DE ESCOPO" ou "PROIBIDO". Contra-teste: 3 vermelhos antes, 27/27 depois.

## Tickets novos

| Ticket | O que entrega | Dependências | Processável agora? |
|---|---|---|---|
| **470b** | migration 0275 `comercial.ghl_stages` (só `.sql`) | — | sim |
| **470c** | sync GHL para `ghl_stages` | 470b, 500 (done) | depois do 470b |
| **472** (reescrito) | sugestão de `mapeamento_canonico` | 470c | depois do 470c |
| **502** (B1) | teste da casca CLI de `auditar-webhooks-ghl.mjs` + remoção do placeholder | — | sim |
| **503** (B2) | `docs/diagnosticos/briefing-escritores.md` | — | sim |
| **504** (B3) | `test/fixtures/claude-envelope/` (2 envelopes reais do kit) | — | sim |
| **505** (B4) | migration 0276, soft delete das duplicatas GHL (só `.sql`) | — | sim |

Todos no schema v2. Os critérios de teste leem o rc, não há `grep -q` em pipe, e as guardas usam `$BASE_REF...HEAD`.

**B1: a premissa do pedido estava errada.** `scripts/auditar-webhooks-ghl.test.mjs` tem 7 linhas de comentário e nenhuma asserção. Os 21 testes do 224 moram em `src/lib/connectors/ghl/webhooks-auditoria.test.ts` e rodam verdes. Não havia asserção para "manter", e um `.test.ts` vazio faria o vitest falhar. Por isso o 502 testa a casca `.mjs`, que não tinha teste nenhum (env ausente dá rc 1 e nomeia as envs, sem rede), e remove o placeholder. Critério: `vitest list --filesOnly` acha o arquivo, e o rc fica verde.

**B4: grupos com mais de 2 linhas.** O UPDATE marca todas as linhas do grupo, menos a original (a mais antiga por `created_at, id`). Em grupo de 2, isso é "a cópia mais nova". O SELECT inicial traz o **tamanho máximo de grupo por tenant**: confira esse número antes de aplicar. A forma do UPDATE foi fixada no ticket para não disparar a regra `update_tenant_id_messages_particionada`.

## Tarefas manuais (fora do loop)

1. **M1 (497, motor):** `local-loop.sh:169-170` marca done só pelo exit code do `git merge`. Falta confirmar que o commit ficou alcançável na branch alvo. `ticket_mergeado_em_alvo` (`lib.sh:623`) existe e não tem nenhum chamador. É do kit: portar lá.
2. **M2 (497, motor):** falha de parse do bloco json em `proximo_pendente`/`pendentes_processaveis` é silenciosa. O ticket já é excluído, então não é bug de custo, mas deveria gerar log ou evento. Também é do kit.
3. **Porte ao kit** dos 3 commits `PORTE-PENDENTE:` (`76af390`, `ae29dcd`, `c7e81bc`). Até isso acontecer, não rodar `instalar.sh --atualizar` neste repo.
4. **Aplicar via MCP** as migrations 0275 (depois do 470b) e 0276 (depois do 505, conferindo o SELECT antes), com o push da branch dona antes do apply, como manda o CLAUDE.md.
5. **Opcional:** registrar 0274, 0275 e 0276 em RESERVADAS do CLAUDE.md. Hoje a faixa do loop (0250–0299) só existe no config.

## Decisão pendente sua
- **471:** os critérios de entrada e saída precisam de um lugar no modelo de `ghl_stages`. Pode ser coluna nova nessa tabela, tabela própria, ou continuar em `funnel_stages`. Está bloqueado com essa nota.

## É seguro despausar?

**Sim, com três ressalvas.**

A fila pega nesta ordem: 470b, 481, 488, 501, 502, 503, 504, 505. O 470c, o 472 e a cadeia do 488 esperam as dependências. Os dois tickets de migration só escrevem `.sql`.

1. **481:** vai tentar de novo. Se a causa `ambiente` persistir (grep em `node_modules` negado), o teto bloqueia no 3º adiamento. O contador começa do zero, porque os adiamentos anteriores não foram contados. São até 3 execuções pagas (cerca de 15 min cada, com juiz opus). Se não quiser gastar isso, conserte a allowlist de ferramentas do 481 antes de despausar.
2. **504:** o critério faz `cmp` contra `~/Projetos/orquestrador-kit/...` por caminho absoluto. Só funciona nesta máquina.
3. **Kit:** não atualizar o kit antes de ele portar os `PORTE-PENDENTE`, senão o 501 volta a reprovar por falta da 0264, e o teto de adiamento some.

Para despausar: `scripts/orquestrador/orq-pause.sh --off`.
