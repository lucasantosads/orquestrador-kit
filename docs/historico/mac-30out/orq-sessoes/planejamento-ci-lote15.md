# Planejamento · CI · lote 15 · sincronizar o mapa e decompor B3-F4 (e B1-F2)

Data: 21/09/2026. Worktree: `/Users/lucasantos/Projetos/_worktrees/ci-fila-15` (branch `fila/lote-15`, base `672d3a3`).
Escrita só em `docs/roadmap/mapa.json`, `docs/roadmap/MAPA.md` e quatro tickets novos em `docs/fila/`. Sem commit, sem push, sem merge.

## Resumo

- Mapa sincronizado: seis frentes viram `concluida` (B1-F1, B1-F2, B2-F5, B2-F6, B2-F7, B2-F8). Duas a mais do que a leitura humana do briefing (B1-F2 e B2-F7), as duas justificadas pela contagem do `orq mapa status`.
- B3-F4 decomposta em quatro tickets, 267 a 270, todos `pendente`: migration 0031 (267), medidor puro (268), gravação do custo da sessão (269), leitura do custo por roteiro publicável (270).
- **B1-F2 não foi decomposta, e não deveria ser:** ela já foi decomposta no lote 8 (tickets 246 a 249) e os quatro estão `done`. Conferi a entrega no código, item por item (seção própria abaixo).
- **B3-F4 ficou `rascunho`, não `pronta`.** Com `pronta`, o lint cai na regra 8 (B3-F4 depende de B3-F1, que não está `concluida`), e a linha de chegada exige lint sem erro. As duas instruções não cabem juntas hoje; escolhi a linha de chegada e deixei a troca como um campo só, para quando B3-F1 fechar. O loop não olha status de frente (conferido em `local-loop.sh` e `lib.sh`), então os tickets correm do mesmo jeito.
- Uma edição de bloco, necessária: `humano:migration-0031` entrou nos gates de B3 (JSON e MD). Sem isso a regra 10 do lint reprova, porque 269 e 270 exigem o token.
- Linha de chegada: validar com `--fila` deste worktree 0 violações (rc 0); lint 10/10 (rc 0) tanto pelo `orq mapa lint` literal quanto pelo mesmo script rodado neste worktree; `git status` só com os seis caminhos permitidos. Ressalvas de ambiente na seção "Estado final".

## Passo 0 · o que li (as 5 linhas pedidas)

1. `docs/roadmap/MAPA.md` inteiro e `mapa.json` (convenções, B1 a B4), o PLAYBOOK nas regras de critério (linhas 38 a 43, lote 10, lote 12, peça 1 do gate de ticket) e `~/orq-sessoes/fila-ci-lote14.md` (as três causas: suíte alheia no 235, colisão do 228 no 231, critério sobre arquivo inexistente no 242 e no 244, alvo que já nascia verde no 231).
2. Tickets modelo 231, 241b e 244 (formato novo do lote 14: um comando por critério, `test $(` só no primeiro segmento, guarda de diff por `$BASE_REF`), mais 239 (modelo de migration) e 224 a 226, 246 a 249.
3. Código de B3-F4: `geracao.ts` (camposDeCusto), `precos.ts`, `provider.ts`, as três etapas de `geracao-guiada/`, `services/telemetria/**` inteiro, `gerar/actions.ts`, `gerar/deps.ts`, `aprovacoes.ts`, `home-desempenho.ts`, `DesempenhoCard.tsx` e o teste de render, migrations 0001, 0012, 0019, 0027 e 0030. Código de B1-F2: `organico.ts`, `angulos-gerar-core.ts`, `angulos-termos.ts`, `angulos-types.ts`, `SinalWeb.tsx`.
4. **Última migration existente: `0030_fila_aprovacao.sql`.** Nenhuma reserva documentada da 0031.
5. **Próximo ID livre: 267.** O maior ID em todas as branches locais é 266 (`git ls-tree` de cada branch); 251 a 260 nunca foram usados e não há reserva escrita, então segui a regra "sequencial global a partir do maior usado".

## Parte 1 · status do mapa

Contagem pelo comando pedido (ele lê a fila do checkout principal, `lib.sh:42`):

```
$ bash scripts/orq mapa status
FRENTES (a partir do campo frente dos tickets)

  B1-F1      (4)    4 done 
  B1-F2      (4)    4 done 
  B1-F3      (2)    2 done 
  B2-F1      (6)    6 done 
  B2-F2      (2)    2 done 
  B2-F3      (4)    4 done 
  B2-F4      (4)    4 done 
  B2-F5      (8)    8 done 
  B2-F6      (10)   10 done 
  B2-F7      (3)    3 done 
  B2-F8      (6)    6 done 
  B3-F1      (8)    6 done · 1 refatiar · 1 pendente 
  sem-frente (21)   21 done 
```

| Frente | Antes | Depois | Justificativa |
|---|---|---|---|
| B1-F1 | em_andamento | concluida | 4 de 4 done (224, 225, 226, 250) |
| B1-F2 | rascunho | concluida | 4 de 4 done (246, 247, 248, 249). **Fora da lista humana do briefing**; ver a seção B1-F2 |
| B2-F5 | em_andamento | concluida | 8 de 8 done |
| B2-F6 | em_andamento | concluida | 10 de 10 done |
| B2-F7 | em_andamento | concluida | 3 de 3 done. **Fora da lista humana do briefing:** o 236 foi mergeado durante a sessão (`41c4ebc fila: 236 done`, no checkout principal). Neste worktree, nascido em `672d3a3`, o arquivo do 236 ainda diz `pendente`; o merge traz o `done` |
| B2-F8 | pronta | concluida | 6 de 6 done |

Mais nada mudou em frente nenhuma: nem entrega, nem allowlist, nem deps, nem `tickets_estimados`. Consequências que **não** apliquei, porque status de bloco não é campo de frente e o DoD de bloco é gate humano: todas as frentes de B1 e de B2 ficam `concluida`, então os dois blocos estão prontos para o dono conferir o DoD e fechar.

Diff do `mapa.json` (as seis linhas de status e o gate da 0031):

```diff
diff --git a/docs/roadmap/mapa.json b/docs/roadmap/mapa.json
index bd8e21a..ba3490a 100644
--- a/docs/roadmap/mapa.json
+++ b/docs/roadmap/mapa.json
@@ -54,7 +54,7 @@
           "adrs": [
             "0004"
           ],
-          "status": "em_andamento",
+          "status": "concluida",
           "tickets_estimados": 4,
           "lotes_descartados_consecutivos": 0
         },
@@ -79,7 +79,7 @@
           "adrs": [
             "0004"
           ],
-          "status": "rascunho",
+          "status": "concluida",
           "tickets_estimados": 4,
           "lotes_descartados_consecutivos": 0
         },
@@ -227,7 +227,7 @@
             "0001",
             "0006"
           ],
-          "status": "em_andamento",
+          "status": "concluida",
           "tickets_estimados": 8,
           "lotes_descartados_consecutivos": 0
         },
@@ -261,7 +261,7 @@
             "0005",
             "0007"
           ],
-          "status": "em_andamento",
+          "status": "concluida",
           "tickets_estimados": 8,
           "lotes_descartados_consecutivos": 0
         },
@@ -285,7 +285,7 @@
             "0005",
             "0007"
           ],
-          "status": "em_andamento",
+          "status": "concluida",
           "tickets_estimados": 3,
           "lotes_descartados_consecutivos": 0
         },
@@ -311,7 +311,7 @@
           "adrs": [
             "0007"
           ],
-          "status": "pronta",
+          "status": "concluida",
           "tickets_estimados": 6,
           "lotes_descartados_consecutivos": 0
         }
@@ -327,7 +327,8 @@
       "marco_de_negocio": "3 clientes Comarka operando (resultado, nao criterio de aceite: fora do DoD).",
       "gates_humanos": [
         "humano:tk-103-bakeoff",
-        "humano:migration-0030"
+        "humano:migration-0030",
+        "humano:migration-0031"
       ],
       "status": "em_andamento",
       "frentes": [
```

No `MAPA.md` mudou a coluna Status das mesmas seis linhas e a linha "Gates humanos" de B3, que ganhou `humano:migration-0031`.

## B1-F2 · por que não há ticket novo

A frente foi decomposta no lote 8 (PLAYBOOK, "2026-09-05 (lote 8)") e os quatro tickets estão `done`, mergeados em `staging-auto`. A entrega escrita no mapa, frase por frase, contra o código de hoje:

| O que a entrega pede | Onde está |
|---|---|
| o caminho web usa de fato a chave SerpApi da org | 224 a 226 e migration 0023 (a própria entrega diz isso) |
| os termos de Trends e PAA saem da persona | `angulos-gerar-core.ts:57-59` (`termosDaPersona`, `termosDemanda` e `termosPerguntas` sempre preenchidos), ticket 247 |
| falha da fonte real degrada em vez de derrubar | `organico.ts:229-235` e `284-290` (catch), `organico.ts:492-498` (quem falhou vira `ausente`), ticket 246 |
| o selo segue a fonte que rodou | mesmo trecho de `organico.ts`, e `angulos-gerar-core.ts:69-80` levando `fonteWebTrends`/`fonteWebPerguntas` à tela |
| a tela conta a verdade sobre as duas trilhas | `SinalWeb.tsx:15-16` ("Buscas em alta", "Perguntas do público"), ticket 248 |
| (achado do lote 8) dedup de web distingue a persona | ticket 249 |

O que falta para o DoD de B1 é conferência humana (a geração real numa org com Perplexity e SerpApi), não ticket de B1-F2. Se o dono enxerga um buraco que eu não vi, a frente precisa ser reaberta com entrega nova escrita por ele; decompor de novo a entrega atual produziria tickets com alvo verde de nascença.

## B3-F4 · o que a leitura do código mudou no plano

**1. O custo que `camposDeCusto` calcula não passa pelo assistente `/gerar`.** O texto da frente diz que o custo "JÁ é calculado em geracao.ts e descartado". É verdade para `/roteirizar` (via `geracao/orquestrador.ts`) e para o bake-off. O assistente `/gerar`, que é o caminho do DoD de B3 e o que grava o pacote do 240, não chama `geracao.ts`: `estagio-ganchos.ts:112`, `estagio-body.ts:109` e `estagio-roteiro.ts:138` chamam `provider.generate` direto e jogam `usage` fora. Os três estão fora da allowlist. A saída foi medir no único ponto comum que está dentro dela: o provider criado em `actions.ts`, embrulhado por um medidor que tem o mesmo contrato (`LlmProvider`). Nenhuma etapa do motor precisa mudar.

**2. A allowlist da frente não tem diretório de teste da web.** Só `services/telemetria/test/**`. Como todo ticket precisa de teste novo no pathspec, a lógica de cada ticket mora em módulo novo de `services/telemetria/src/`, testável com provider e cliente falsos, e `actions.ts` e `home-desempenho.ts` ficam como cola fina, cobertas pela suíte da web e pelo typecheck.

**3. A tela do DoD não cabe na allowlist.** O card de custo é `apps/web/src/app/home/DesempenhoCard.tsx`, que hoje diz "Ainda não é possível calcular o custo por geração" (linha 77), e `apps/web/test/render/home-desempenho.test.tsx` afirma esse texto. Os dois estão fora da allowlist de B3-F4, assim como a fila interna `/aprovacoes` (244), onde "o roteiro aprovado com o custo ao lado" cairia naturalmente. Trocar o texto sem poder editar o teste que o afirma é a colisão do 201. Por isso o 270 entrega a leitura pronta e para ali. **Decisão do dono:** ampliar a allowlist de B3-F4 (card + teste de render, ou `aprovacoes-read.ts` + `aprovacoes/page.tsx` + o teste da fila) e, depois disso, escrever o ticket de tela.

**4. A regra do custo por roteiro publicável ficou escrita no 268**, antes do código: publicável é `veredito_205 = 'aprovado'`; o numerador soma todos os roteiros com custo, reprovados inclusive; custo nulo fica fora do numerador e do denominador e é contado à parte; zero publicáveis devolve `null`.

**5. Fora do escopo, registrado nos tickets:** o custo de fonte (Sonar na pesquisa profunda, SerpApi e Perplexity nos ângulos) não passa pelo provider do modelo. É o assunto da linha do 226 em `decisoes-pendentes.md` (teto em dólar). Sessão abandonada antes do Finalizar não deixa custo em roteiro nenhum.

**6. Dependências em B3-F1: nenhuma, e conferido arquivo por arquivo.** O briefing pede depender do último ticket de B3-F1 que cada um precisa, "conforme o que tocam". Nenhum dos quatro toca arquivo de 242, 243 ou 244, e nenhum lê coisa que eles criam: `actions.ts` foi tocado por último pelo 240 (done), `veredito_205` é da 0030 e é gravado pelo 240. Pôr 244 como dependência só atrasaria a frente atrás do 243, que acabou de voltar em `refatiar` (abaixo).

**7. A barreira de escrita em banco varre arquivos de teste.** `enforcement-core.ts`, regra 3: só `apps/*/src` e `services/*/src` são isentos; em qualquer outro arquivo executável, `.from('<tabela>')` seguido de `.update(` em até 6 linhas é `escrita_em_banco`. Um teste com cliente falso escrito do jeito óbvio seria barrado. Os objetivos do 267 e do 269 dizem isso ao executor com o caminho do arquivo e a forma segura.

## Tickets novos

| ID | Frente | Entrega | Deps | Diff estimado | Token |
|---|---|---|---|---|---|
| 267 | B3-F4 | migration `0031_custo_roteiro.sql`: seis colunas NULLABLE de custo em `public.roteiros` + teste estático que lê o `.sql` | nenhuma | 150 | `requer_liberacao: humano:migration-0031` |
| 268 | B3-F4 | `services/telemetria/src/custo-roteiro.ts`: medidor de provider, `lerCusto`, `somarCusto` e a regra do custo por roteiro publicável, com 12 casos | nenhuma | 340 | nenhum |
| 269 | B3-F4 | as três actions do `/gerar` medem, o acumulado atravessa o rascunho, o Finalizar grava o total na linha do roteiro (`custo-persistencia.ts`) | 267, 268, `humano:migration-0031` | 290 | consome `humano:migration-0031` |
| 270 | B3-F4 | `getCustoPorRoteiroPublicavel` em `home-desempenho.ts`, pela leitura estrutural `custo-leitura.ts`; sem tela | 267, 268, `humano:migration-0031` | 200 | consome `humano:migration-0031` |

Todos abaixo do teto de 600 linhas (`diff_cap_linhas`) e de 8 caminhos por allowlist. Todos os caminhos estão dentro da allowlist comum de B3-F4; `cria_novo` lista só arquivo ausente hoje (`test -e` em cada um: ausente). Sobreposição entre os quatro e os pendentes: nenhuma (o validar confere, regra 8).

**Sobre `requer_liberacao`.** O campo não existe no motor nem no kit (`grep -rn requer_liberacao` nos dois: nada). Pus no 267 como está no briefing, e ele é declarativo: o gate de ticket ignora chave desconhecida, e quem segura a fila de verdade é `humano:migration-0031` nas `dependencias` do 269 e do 270. Pôr o token nas `dependencias` do próprio 267 seria o deadlock que o PLAYBOOK registrou no 239.

**Sobre o teste do ticket de migration.** ADR-0005 diz "sempre um ticket sozinho, nunca fatiada junto com código de aplicação". O teste estático do 267 lê o `.sql` do disco e não é código de aplicação, então a regra do briefing (todo ticket com teste novo) e a do ADR cabem juntas.

## Critérios por ticket: comando, saída de hoje e tipo

Cada `cmd` foi rodado neste worktree como o executor roda (`executor.sh:435`): `( cd <worktree> && export BASE_REF=HEAD NO_COLOR=1 && eval "$cmd" ) 2>&1`, em bash (não no meu shell, que troca `grep` por `ugrep`), com o `criterio_match` copiado de `lib.sh:1137`. Ambiente igual ao do motor: `node_modules` da raiz, de `apps/web` e de `services/persona-roteirizador` ligados por symlink ao checkout principal, como faz `linkar_node_modules` (`executor.sh:254-266`), e removidos no fim. Nas saídas, o verificador guarda só os primeiros 160 caracteres, e o caminho do script dele, que aparece na mensagem `test: -ge: unary operator expected`, foi trocado por `<verificador>`.

Resultado: **31 alvos, todos vermelhos; 42 guardas, todas verdes; 0 anomalias.** Os critérios `avaliador` não rodam comando e estão listados ao fim de cada ticket.

Nenhum critério usa `|| echo`, `>/dev/null 2>&1 && echo ok`, `| tail -N`, `| grep -q`, nem espera não numérica que case `failed`. Os que esperam `ok` só imprimem `ok` depois de um `test` que passou, e nenhum caminho citado contém a substring `ok` (a armadilha do `[token]` no lote 10). As guardas sobre arquivo que o próprio ticket cria usam `grep -rh ... --include=<nome> <dir> | wc -l`, que dá 0 com o arquivo ausente: é isso que as deixa verdes hoje sem perder o sentido depois (no 244, as guardas desse tipo nascem vermelhas).

**Prova do lado positivo.** Alvo vermelho não prova que o ticket é possível: o 242 travou três vezes num critério impossível. Num espelho em scratchpad (`git archive` de `supabase`, `apps/web` e `services/telemetria`), escrevi as formas que cada objetivo pede (a migration com as seis linhas, os módulos com os exports, as linhas novas de `actions.ts` e `home-desempenho.ts`, testes com o número de `it(` pedido) e rodei todos os critérios de `grep` ali: **todos os alvos viraram verdes e todas as guardas continuaram verdes.** Depois injetei `not null` numa coluna e um `alter table public.personas drop column` na migration do espelho: as três guardas da migration acusaram (1, 1, 1). Os critérios de vitest, typecheck e `git diff` não entram nessa prova; vitest e typecheck são provados verdes hoje, na base.

### 267 · migration-custo-do-roteiro

1. **alvo** · o arquivo da migration 0031 existe
   ```
   $ test -f supabase/migrations/0031_custo_roteiro.sql && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

2. **alvo** · o cabecalho diz NÃO APLICAR
   ```
   $ test $(grep -c 'NÃO APLICAR' supabase/migrations/0031_custo_roteiro.sql) -ge 1 && echo ok
   espera: ok
   saída de hoje: grep: supabase/migrations/0031_custo_roteiro.sql: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

3. **alvo** · as seis colunas de custo sao acrescentadas a roteiros
   ```
   $ test $(grep -oE 'add column custo_(usd|estimado|tokens_entrada|tokens_saida|chamadas|precos_versao) ' supabase/migrations/0031_custo_roteiro.sql | wc -l) -eq 6 && echo ok
   espera: ok
   saída de hoje: grep: supabase/migrations/0031_custo_roteiro.sql: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

4. **alvo** · os quatro valores numericos nao aceitam negativo
   ```
   $ test $(grep -oE 'check \(custo_(usd|tokens_entrada|tokens_saida|chamadas) >= 0\)' supabase/migrations/0031_custo_roteiro.sql | wc -l) -eq 4 && echo ok
   espera: ok
   saída de hoje: grep: supabase/migrations/0031_custo_roteiro.sql: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

5. **alvo** · cada coluna nova e documentada no banco
   ```
   $ test $(grep -ciE 'comment on column public[.]roteiros[.]custo_' supabase/migrations/0031_custo_roteiro.sql) -ge 6 && echo ok
   espera: ok
   saída de hoje: grep: supabase/migrations/0031_custo_roteiro.sql: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

6. **alvo** · o teste estatico da migration existe e passa
   ```
   $ test -f services/telemetria/test/migration-0031-custo.test.ts && cd services/telemetria && npx vitest run test/migration-0031-custo.test.ts 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

7. **alvo** · o teste estatico tem os 6 casos pedidos
   ```
   $ test $(grep -c 'it(' services/telemetria/test/migration-0031-custo.test.ts) -ge 6 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/test/migration-0031-custo.test.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

8. **guarda** · nenhuma coluna de custo nasce NOT NULL nem com default (NULL e sem registro, nunca zero)
   ```
   $ grep -rhiE 'add column custo_[a-z_]+ .*(not null|default)' --include=0031_custo_roteiro.sql supabase/migrations | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

9. **guarda** · nenhuma policy, funcao, trigger, indice, drop ou alter column na 0031
   ```
   $ grep -rhiE 'create policy|create (or replace )?function|security definer|create trigger|create index|drop |alter column' --include=0031_custo_roteiro.sql supabase/migrations | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

10. **guarda** · o unico alter table da 0031 e o de public.roteiros: nenhuma outra tabela e alterada
   ```
   $ grep -rhiE 'alter table' --include=0031_custo_roteiro.sql supabase/migrations | grep -vc 'public[.]roteiros'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

11. **guarda** · o diff toca so os dois arquivos do ticket (nenhuma migration anterior, nada em apps nem em outro service)
   ```
   $ git diff --name-only $BASE_REF...HEAD | grep -cvE '^(supabase/migrations/0031_custo_roteiro[.]sql|services/telemetria/test/migration-0031-custo[.]test[.]ts)$'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

12. **guarda** · nenhum skip, only ou todo no teste novo
   ```
   $ grep -rhE '[.](skip|only|todo)[(]' --include=migration-0031-custo.test.ts services/telemetria/test | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

13. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (1/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/registrar.test.ts) -ge 6 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

14. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (2/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/derivar-lastro.test.ts) -ge 10 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

15. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (3/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/contract.test.ts) -ge 9 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

16. **guarda** · a suite da telemetria continua verde
   ```
   $ cd services/telemetria && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

17. **avaliador** · MIGRATION NAO APLICADA. Leia o diff inteiro. REPROVE se aparecer QUALQUER comando ou instrucao de APLICAR a migration: chamada de MCP, supabase db push, psql, script de aplicacao, ou texto dizendo que foi aplicada. O ADR... (sem comando; texto integral no ticket)

18. **avaliador** · NULL E SEM REGISTRO, NUNCA ZERO. Confira que as seis colunas sao NULLABLE e SEM default, e que os comentarios dizem isso: os roteiros que ja existem nasceram antes desta migration e ninguem mediu quanto custaram, e um de... (sem comando; texto integral no ticket)

19. **avaliador** · O TESTE LE O ARQUIVO REAL. Confira que services/telemetria/test/migration-0031-custo.test.ts le supabase/migrations/0031_custo_roteiro.sql do disco (readFileSync com caminho relativo a import.meta.url) e afirma cada regr... (sem comando; texto integral no ticket)


### 268 · medidor-de-custo-da-geracao

1. **alvo** · o teste do medidor existe e passa
   ```
   $ test -f services/telemetria/test/custo-roteiro.test.ts && cd services/telemetria && npx vitest run test/custo-roteiro.test.ts 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

2. **alvo** · o teste tem os 12 casos pedidos
   ```
   $ test $(grep -c 'it(' services/telemetria/test/custo-roteiro.test.ts) -ge 12 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/test/custo-roteiro.test.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

3. **alvo** · o modulo existe
   ```
   $ test -f services/telemetria/src/custo-roteiro.ts && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

4. **alvo** · as quatro funcoes publicas estao exportadas
   ```
   $ test $(grep -oE 'export function (somarCusto|medirProvider|lerCusto|custoPorRoteiroPublicavel)[(]' services/telemetria/src/custo-roteiro.ts | wc -l) -eq 4 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-roteiro.ts: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

5. **alvo** · os dois tipos e a constante vazia estao exportados
   ```
   $ test $(grep -oE 'export (interface CustoRoteiro|interface ResumoCusto|const CUSTO_VAZIO)' services/telemetria/src/custo-roteiro.ts | wc -l) -eq 3 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-roteiro.ts: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

6. **alvo** · o preco vem da tabela versionada, nao de numero novo
   ```
   $ test $(grep -cE 'calcularCusto|PRECOS_VERSAO' services/telemetria/src/custo-roteiro.ts) -ge 2 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-roteiro.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

7. **guarda** · o modulo e puro: sem supabase, sem server-only, sem rede
   ```
   $ grep -rhE '^import .*(supabase|server-only)|fetch[(]' --include=custo-roteiro.ts services/telemetria/src | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

8. **guarda** · o diff toca so os dois arquivos do ticket (precos.ts e provider.ts intocados)
   ```
   $ git diff --name-only $BASE_REF...HEAD | grep -cvE '^services/telemetria/(src|test)/custo-roteiro([.]test)?[.]ts$'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

9. **guarda** · nenhum skip, only ou todo no teste novo
   ```
   $ grep -rhE '[.](skip|only|todo)[(]' --include=custo-roteiro.test.ts services/telemetria/test | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

10. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (1/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/registrar.test.ts) -ge 6 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

11. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (2/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/derivar-lastro.test.ts) -ge 10 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

12. **guarda** · anti-afrouxamento: os tres testes que ja existem na telemetria nao perderam caso (3/3)
   ```
   $ test $(grep -c 'it(' services/telemetria/test/contract.test.ts) -ge 9 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

13. **guarda** · a suite da telemetria continua verde
   ```
   $ cd services/telemetria && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

14. **guarda** · a suite do motor de roteiros continua verde (precos.ts e provider.ts sao importados daqui)
   ```
   $ cd services/persona-roteirizador && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

15. **avaliador** · O MEDIDOR E TRANSPARENTE E NAO ESCONDE FALHA. Abra services/telemetria/src/custo-roteiro.ts e confira que o provider devolvido por medirProvider repassa a MESMA req ao original e devolve a MESMA resposta, sem reescrever ... (sem comando; texto integral no ticket)

16. **avaliador** · A REGRA DO CUSTO POR ROTEIRO PUBLICAVEL. Confira em custoPorRoteiroPublicavel e no teste: (a) custo nulo nao entra no total nem no denominador e e contado em roteirosSemCusto, porque trata-lo como zero puxaria a media pa... (sem comando; texto integral no ticket)


### 269 · custo-da-sessao-chega-ao-roteiro

1. **alvo** · o teste da gravacao existe e passa
   ```
   $ test -f services/telemetria/test/custo-persistencia.test.ts && cd services/telemetria && npx vitest run test/custo-persistencia.test.ts 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

2. **alvo** · o teste tem os 8 casos pedidos
   ```
   $ test $(grep -c 'it(' services/telemetria/test/custo-persistencia.test.ts) -ge 8 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/test/custo-persistencia.test.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

3. **alvo** · as quatro funcoes da gravacao estao exportadas
   ```
   $ test $(grep -oE 'export (async )?function (custoDoRascunho|comCusto|colunasDeCusto|gravarCustoDoRoteiro)[(]' services/telemetria/src/custo-persistencia.ts | wc -l) -eq 4 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-persistencia.ts: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

4. **alvo** · o tipo estrutural do cliente esta exportado
   ```
   $ test $(grep -cE 'export (interface|type) ClienteCusto' services/telemetria/src/custo-persistencia.ts) -eq 1 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-persistencia.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

5. **alvo** · as seis colunas da 0031 sao escritas pela gravacao
   ```
   $ test $(grep -oE 'custo_(usd|estimado|tokens_entrada|tokens_saida|chamadas|precos_versao)' services/telemetria/src/custo-persistencia.ts | sort -u | wc -l) -eq 6 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-persistencia.ts: No such file or directory
   ```
   NAO_PASSA: vermelho, como deve.

6. **alvo** · nenhum provider do assistente sai sem medidor
   ```
   $ grep 'criarProviderDoEnv()' apps/web/src/app/gerar/actions.ts | grep -cv 'medirProvider('
   espera: 0
   saída de hoje: 3
   ```
   NAO_PASSA: vermelho, como deve.

7. **alvo** · as tres actions que chamam o modelo usam o provider medido
   ```
   $ test $(grep -c 'medirProvider(criarProviderDoEnv())' apps/web/src/app/gerar/actions.ts) -ge 3 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

8. **alvo** · as tres actions leem o acumulado do rascunho
   ```
   $ test $(grep -c 'custoDoRascunho(' apps/web/src/app/gerar/actions.ts) -ge 3 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

9. **alvo** · ganchos e corpos gravam o acumulado no rascunho
   ```
   $ test $(grep -c 'comCusto(' apps/web/src/app/gerar/actions.ts) -ge 2 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

10. **alvo** · o Finalizar grava o custo na linha do roteiro (1/2): a chamada existe
   ```
   $ test $(grep -c 'gravarCustoDoRoteiro(' apps/web/src/app/gerar/actions.ts) -eq 1 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

11. **alvo** · o Finalizar grava o custo na linha do roteiro (2/2): o cliente e convertido para o tipo estrutural (sem isso o typecheck estoura TS2589)
   ```
   $ test $(grep -c 'as unknown as ClienteCusto' apps/web/src/app/gerar/actions.ts) -ge 1 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

12. **guarda** · o pacote do ticket 240 continua sendo persistido uma vez
   ```
   $ grep -c 'await persistirPacoteDeEntrega(' apps/web/src/app/gerar/actions.ts
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

13. **guarda** · o retorno do Finalizar nao muda
   ```
   $ grep -c 'return { ok: true, final, rascunhoPersistido }' apps/web/src/app/gerar/actions.ts
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

14. **guarda** · as cinco actions continuam exportadas
   ```
   $ grep -cE '^export async function acao' apps/web/src/app/gerar/actions.ts
   espera: 5
   saída de hoje: 5
   ```
   PASSA: verde, como deve.

15. **guarda** · nenhuma chave de servico no assistente
   ```
   $ grep -cE 'SERVICE_ROLE|createSupabaseClientFromEnv' apps/web/src/app/gerar/actions.ts
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

16. **guarda** · a gravacao e pura: sem supabase, sem server-only
   ```
   $ grep -rhE '^import .*(supabase|server-only)' --include=custo-persistencia.ts services/telemetria/src | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

17. **guarda** · o diff toca so os tres arquivos do ticket (tipos, deps, wizard, testes da web e o modulo do 268 intocados)
   ```
   $ git diff --name-only $BASE_REF...HEAD | grep -cvE '^(apps/web/src/app/gerar/actions[.]ts|services/telemetria/(src|test)/custo-persistencia([.]test)?[.]ts)$'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

18. **guarda** · nenhum skip, only ou todo no teste novo
   ```
   $ grep -rhE '[.](skip|only|todo)[(]' --include=custo-persistencia.test.ts services/telemetria/test | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

19. **guarda** · anti-afrouxamento: os testes da web que dublam o assistente nao perderam caso (1/3)
   ```
   $ test $(grep -c 'it(' apps/web/test/gate-205-web.test.tsx) -ge 3 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

20. **guarda** · anti-afrouxamento: os testes da web que dublam o assistente nao perderam caso (2/3)
   ```
   $ test $(grep -c 'it(' apps/web/test/gerar-carrossel.test.tsx) -ge 4 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

21. **guarda** · anti-afrouxamento: os testes da web que dublam o assistente nao perderam caso (3/3)
   ```
   $ test $(grep -c 'it(' apps/web/test/gerar-story-post.test.tsx) -ge 4 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

22. **guarda** · a suite da telemetria continua verde
   ```
   $ cd services/telemetria && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

23. **guarda** · a suite da web continua verde
   ```
   $ cd apps/web && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

24. **guarda** · typecheck da web sem erro (pega o TS2589 que o vitest nao pega)
   ```
   $ npm run typecheck:web 2>&1 | grep -c 'error TS'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

25. **avaliador** · FALHA DE CUSTO NUNCA DERRUBA O ROTEIRO. Abra services/telemetria/src/custo-persistencia.ts e apps/web/src/app/gerar/actions.ts. Confira que gravarCustoDoRoteiro nunca lanca (erro devolvido e excecao viram { ok: false }),... (sem comando; texto integral no ticket)

26. **avaliador** · A CONTA E DA SESSAO INTEIRA, E COMECA DO ZERO NA SESSAO NOVA. Confira que acaoAprofundarEGanchos e acaoProporBodies somam o custo desta chamada ao acumulado lido do rascunho ANTES de gerar, e gravam o total no payload co... (sem comando; texto integral no ticket)


### 270 · leitura-do-custo-por-roteiro-publicavel

1. **alvo** · o teste da leitura existe e passa
   ```
   $ test -f services/telemetria/test/custo-leitura.test.ts && cd services/telemetria && npx vitest run test/custo-leitura.test.ts 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

2. **alvo** · o teste tem os 7 casos pedidos
   ```
   $ test $(grep -c 'it(' services/telemetria/test/custo-leitura.test.ts) -ge 7 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/test/custo-leitura.test.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

3. **alvo** · a leitura estrutural esta exportada
   ```
   $ test $(grep -cE 'export async function lerCustoPorRoteiroPublicavel[(]' services/telemetria/src/custo-leitura.ts) -eq 1 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-leitura.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

4. **alvo** · o tipo estrutural do cliente de leitura esta exportado
   ```
   $ test $(grep -cE 'export (interface|type) ClienteLeituraCusto' services/telemetria/src/custo-leitura.ts) -eq 1 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-leitura.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

5. **alvo** · a projecao e explicita: so custo e veredito
   ```
   $ test $(grep -c "'custo_usd, veredito_205'" services/telemetria/src/custo-leitura.ts) -ge 1 && echo ok
   espera: ok
   saída de hoje: grep: services/telemetria/src/custo-leitura.ts: No such file or directory <verificador> (cortado)
   ```
   NAO_PASSA: vermelho, como deve.

6. **alvo** · a home ganha a leitura do custo por roteiro publicavel
   ```
   $ grep -c 'export async function getCustoPorRoteiroPublicavel' apps/web/src/server/home-desempenho.ts
   espera: 1
   saída de hoje: 0
   ```
   NAO_PASSA: vermelho, como deve.

7. **alvo** · a home delega a leitura ao modulo da telemetria, com o cliente convertido
   ```
   $ test $(grep -c 'as unknown as ClienteLeituraCusto' apps/web/src/server/home-desempenho.ts) -ge 1 && echo ok
   espera: ok
   saída de hoje: (vazia)
   ```
   NAO_PASSA: vermelho, como deve.

8. **guarda** · home-desempenho.ts so ganha linhas: DesempenhoResumo e getDesempenhoResumo intactos
   ```
   $ git diff $BASE_REF...HEAD -- apps/web/src/server/home-desempenho.ts | grep -cE '^-[^-]'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

9. **guarda** · a interface que o teste de render tipa continua la, uma vez
   ```
   $ grep -cE '^export interface DesempenhoResumo' apps/web/src/server/home-desempenho.ts
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

10. **guarda** · nenhuma chave de servico na home
   ```
   $ grep -cE 'SERVICE_ROLE|createSupabaseClientFromEnv' apps/web/src/server/home-desempenho.ts
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

11. **guarda** · a leitura e pura: sem supabase, sem server-only
   ```
   $ grep -rhE '^import .*(supabase|server-only)' --include=custo-leitura.ts services/telemetria/src | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

12. **guarda** · nada de select de tudo na leitura nova
   ```
   $ grep -rhE "select[(]'[*]'" --include=custo-leitura.ts services/telemetria/src | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

13. **guarda** · o diff toca so os tres arquivos do ticket (card, page e testes da web intocados)
   ```
   $ git diff --name-only $BASE_REF...HEAD | grep -cvE '^(apps/web/src/server/home-desempenho[.]ts|services/telemetria/(src|test)/custo-leitura([.]test)?[.]ts)$'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

14. **guarda** · nenhum skip, only ou todo no teste novo
   ```
   $ grep -rhE '[.](skip|only|todo)[(]' --include=custo-leitura.test.ts services/telemetria/test | wc -l | tr -d ' '
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

15. **guarda** · anti-afrouxamento: o teste de render da home nao perdeu caso (1/2)
   ```
   $ test $(grep -c 'it(' apps/web/test/render/home-desempenho.test.tsx) -ge 6 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

16. **guarda** · anti-afrouxamento: o teste de render da home nao perdeu caso (2/2)
   ```
   $ test $(grep -c 'expect(' apps/web/test/render/home-desempenho.test.tsx) -ge 16 && echo ok
   espera: ok
   saída de hoje: ok
   ```
   PASSA: verde, como deve.

17. **guarda** · a suite da telemetria continua verde
   ```
   $ cd services/telemetria && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

18. **guarda** · a suite da web continua verde
   ```
   $ cd apps/web && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'
   espera: 1
   saída de hoje: 1
   ```
   PASSA: verde, como deve.

19. **guarda** · typecheck da web sem erro (pega o TS2589 e a quebra do teste de render)
   ```
   $ npm run typecheck:web 2>&1 | grep -c 'error TS'
   espera: 0
   saída de hoje: 0
   ```
   PASSA: verde, como deve.

20. **avaliador** · AQUI HA SESSAO, ENTAO A RLS SEPARA. Abra apps/web/src/server/home-desempenho.ts e services/telemetria/src/custo-leitura.ts. Confira que a leitura usa o cliente AUTENTICADO (createClient de @/lib/supabase/server), no mesm... (sem comando; texto integral no ticket)

21. **avaliador** · SO ACRESCENTA, E A CONTA NAO E REFEITA AQUI. Confira que DesempenhoResumo, FormatoBucket e getDesempenhoResumo ficaram byte a byte como estavam: apps/web/test/render/home-desempenho.test.tsx, fora da allowlist, declara o... (sem comando; texto integral no ticket)


Totais conferidos na montagem deste relatório: 31 alvos, 42 guardas.

## Saída crua do validar

### Linha de chegada, apontada para a fila deste worktree

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar --fila /Users/lucasantos/Projetos/_worktrees/ci-fila-15/docs/fila --pendentes --relatorio
GATE DE TICKET · 8 ticket(s) · fila /Users/lucasantos/Projetos/_worktrees/ci-fila-15/docs/fila

236-chips-de-sugestao-no-formulario-de-persona.md  OK
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-chips-sugestao.test.tsx) -ge 9 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE '^export function ChipsSugestao' apps/web/src/components/fields.tsx) -eq 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes\?:|aoUsarSugestao\?:' apps/web/src/components/fields.tsx | wc -l) -ge 2 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarSugestoes' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'registrarUsoSugestao' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes=' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 2 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function (LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -eq 8 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form.test.tsx) -ge 2 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[12] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12 && echo ok
242-leitura-e-decisao-por-token.md  OK
  242-leitura-e-decisao-por-token.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 5 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
243-rota-e-tela-publica-de-aprovacao.md  OK
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "'/aprovar'" apps/web/src/lib/auth/routes.ts) -eq 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'lerRoteiroPorToken|notFound' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'decidirPorToken' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "/aprovar|/aprovacoes" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[12] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'/[a-z-]+'" apps/web/src/lib/auth/routes.ts | wc -l) -eq 5 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[16] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok
244-fila-interna-de-aprovacao.md  OK
  244-fila-interna-de-aprovacao.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[21] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[22] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
267-migration-custo-do-roteiro.md  OK
  267-migration-custo-do-roteiro.md:criterios_aceite[1] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'NÃO APLICAR' supabase/migrations/0031_custo_roteiro.sql) -ge 1 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'add column custo_(usd|estimado|tokens_entrada|tokens_saida|chamadas|precos_versao) ' supabase/migrations/0031_custo_roteiro.sql | wc -l) -eq 6 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'check \(custo_(usd|tokens_entrada|tokens_saida|chamadas) >= 0\)' supabase/migrations/0031_custo_roteiro.sql | wc -l) -eq 4 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -ciE 'comment on column public[.]roteiros[.]custo_' supabase/migrations/0031_custo_roteiro.sql) -ge 6 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/migration-0031-custo.test.ts) -ge 6 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[12] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/registrar.test.ts) -ge 6 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/derivar-lastro.test.ts) -ge 10 && echo ok
  267-migration-custo-do-roteiro.md:criterios_aceite[14] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/contract.test.ts) -ge 9 && echo ok
268-medidor-de-custo-da-geracao.md  OK
  268-medidor-de-custo-da-geracao.md:criterios_aceite[1] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/custo-roteiro.test.ts) -ge 12 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function (somarCusto|medirProvider|lerCusto|custoPorRoteiroPublicavel)[(]' services/telemetria/src/custo-roteiro.ts | wc -l) -eq 4 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (interface CustoRoteiro|interface ResumoCusto|const CUSTO_VAZIO)' services/telemetria/src/custo-roteiro.ts | wc -l) -eq 3 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'calcularCusto|PRECOS_VERSAO' services/telemetria/src/custo-roteiro.ts) -ge 2 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/registrar.test.ts) -ge 6 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/derivar-lastro.test.ts) -ge 10 && echo ok
  268-medidor-de-custo-da-geracao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/contract.test.ts) -ge 9 && echo ok
269-custo-da-sessao-chega-ao-roteiro.md  OK
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[1] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/custo-persistencia.test.ts) -ge 8 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (async )?function (custoDoRascunho|comCusto|colunasDeCusto|gravarCustoDoRoteiro)[(]' services/telemetria/src/custo-persistencia.ts | wc -l) -eq 4 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export (interface|type) ClienteCusto' services/telemetria/src/custo-persistencia.ts) -eq 1 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'custo_(usd|estimado|tokens_entrada|tokens_saida|chamadas|precos_versao)' services/telemetria/src/custo-persistencia.ts | sort -u | wc -l) -eq 6 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'medirProvider(criarProviderDoEnv())' apps/web/src/app/gerar/actions.ts) -ge 3 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'custoDoRascunho(' apps/web/src/app/gerar/actions.ts) -ge 3 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'comCusto(' apps/web/src/app/gerar/actions.ts) -ge 2 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'gravarCustoDoRoteiro(' apps/web/src/app/gerar/actions.ts) -eq 1 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'as unknown as ClienteCusto' apps/web/src/app/gerar/actions.ts) -ge 1 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/gate-205-web.test.tsx) -ge 3 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/gerar-carrossel.test.tsx) -ge 4 && echo ok
  269-custo-da-sessao-chega-ao-roteiro.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/gerar-story-post.test.tsx) -ge 4 && echo ok
270-leitura-do-custo-por-roteiro-publicavel.md  OK
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[1] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' services/telemetria/test/custo-leitura.test.ts) -ge 7 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function lerCustoPorRoteiroPublicavel[(]' services/telemetria/src/custo-leitura.ts) -eq 1 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export (interface|type) ClienteLeituraCusto' services/telemetria/src/custo-leitura.ts) -eq 1 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c "'custo_usd, veredito_205'" services/telemetria/src/custo-leitura.ts) -ge 1 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'as unknown as ClienteLeituraCusto' apps/web/src/server/home-desempenho.ts) -ge 1 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[14] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/render/home-desempenho.test.tsx) -ge 6 && echo ok
  270-leitura-do-custo-por-roteiro-publicavel.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/render/home-desempenho.test.tsx) -ge 16 && echo ok

TOTAL: 0 violação(ões), 74 isenção(ões), em 8 ticket(s)
rc=0
```

### O mesmo comando sem `--fila` (lê a fila do checkout principal, `lib.sh:42`; não vê os tickets novos)

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar --pendentes --relatorio
GATE DE TICKET · 1 ticket(s) · fila /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila

244-fila-interna-de-aprovacao.md  OK
  244-fila-interna-de-aprovacao.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[21] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[22] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok

TOTAL: 0 violação(ões), 10 isenção(ões), em 1 ticket(s)
rc=0
```

## Saída crua do mapa lint

### Literal (`scripts/orq:274` roda no checkout principal)

```
$ bash scripts/orq mapa lint
LINT MANUAL DO MAPA — docs/roadmap/{MAPA.md,mapa.json}

  PASS  1. faixas de ID: 1 bloco(s) declaram faixa (historico), disjuntas
  PASS  2. todo bloco tem dod nao vazio
  PASS  3. frentes: allowlist nao vazia, status valido, deps existentes, tickets_estimados <=8
  PASS  4. allowlist ∩ zona_proibida = vazio
  PASS  5. allowlist ∩ paths_harness = vazio
  PASS  6. globs casam no disco (git ls-files); 15 paths novos, todos em frente cria_novo
  PASS  7. <=2 frentes pronta por bloco
  PASS  8. frente pronta so com deps concluida
  PASS  9. IDs de MAPA.md == mapa.json (5 blocos, 20 frentes)
  PASS  10. gates humanos: 11 declarados, 0 exigidos por ticket aberto, 8 satisfeitos em liberacoes.json ['humano:custo-sinal-real', 'humano:migration-0025', 'humano:migration-0026', 'humano:migration-0027', 'humano:migration-0028', 'humano:migration-0029', 'humano:migration-0030', 'humano:tk-201-arquetipos']

10 passaram, 0 falharam, 0 aviso(s)
rc=0
```

### O mesmo script, rodado neste worktree (é este que lê as edições)

```
$ python3 scripts/roadmap/lint-mapa.py
LINT MANUAL DO MAPA — docs/roadmap/{MAPA.md,mapa.json}

  PASS  1. faixas de ID: 1 bloco(s) declaram faixa (historico), disjuntas
  PASS  2. todo bloco tem dod nao vazio
  PASS  3. frentes: allowlist nao vazia, status valido, deps existentes, tickets_estimados <=8
  PASS  4. allowlist ∩ zona_proibida = vazio
  PASS  5. allowlist ∩ paths_harness = vazio
  PASS  6. globs casam no disco (git ls-files); 15 paths novos, todos em frente cria_novo
  PASS  7. <=2 frentes pronta por bloco
  PASS  8. frente pronta so com deps concluida
  PASS  9. IDs de MAPA.md == mapa.json (5 blocos, 20 frentes)
  PASS  10. gates humanos: 12 declarados, 2 exigidos por ticket aberto, 8 satisfeitos em liberacoes.json ['humano:custo-sinal-real', 'humano:migration-0025', 'humano:migration-0026', 'humano:migration-0027', 'humano:migration-0028', 'humano:migration-0029', 'humano:migration-0030', 'humano:tk-201-arquetipos']

10 passaram, 0 falharam, 0 aviso(s)
rc=0
```

Simulação em memória, sem gravar nada, do que aconteceria com B3-F4 em `pronta`:

```
regra 8 com B3-F4=pronta: FAIL  8. B3-F4 dep B3-F1 esta pronta
prontas em B3: ['B3-F1', 'B3-F4']
```

## B3-F2 × B3-F1 · para decisão do dono (não decomposta)

**O que B3-F2 diz:** "Portal do cliente: o advogado manda um link, o cliente vê o roteiro e aprova ou pede ajuste. Superfície pública com token: juiz forte sempre." Allowlist `apps/web/src/app/portal/**`, `apps/web/src/server/portal*`, `apps/web/test/portal*`; dep B3-F1.

**O que B3-F1 já entrega ou está entregando:** link público com token de 32 bytes, um por roteiro, 30 dias, revogável (241a, 241b); leitura e decisão pelo token, com aprovar ou pedir ajuste com comentário (242, done); a rota pública `/aprovar/[token]` com roteiro, legenda e veredito 205 (243, voltou em `refatiar`); a fila interna do escritório (244).

**Frase por frase, a entrega de B3-F2 já está coberta por B3-F1.** "Manda um link": 241a. "Vê o roteiro": 243. "Aprova ou pede ajuste": 242. "Superfície pública com token": é a própria B3-F1. Decompor B3-F2 como está escrita produziria uma segunda rota pública (`/portal`) fazendo o que `/aprovar` faz, e contrariaria a entrega de B3-F1, que declara `/aprovar` "a ÚNICA rota pública nova".

**Onde as duas de fato diferem, se o dono quiser que B3-F2 exista:**

| | B3-F1 (hoje) | B3-F2 (o que só faria sentido nela) |
|---|---|---|
| Unidade do link | um roteiro (`roteiro_id unique` na 0030) | um Cliente do escritório: um link para todos os roteiros dele |
| Vida do link | 30 dias, morre com a decisão | duradouro, o endereço do Cliente com o escritório |
| O que a pessoa vê | um roteiro, uma decisão | a lista do que espera aprovação e o histórico do que já foi decidido |
| Schema | pronto (0030) | token por Cliente: migration nova, e decisão de RLS nova |
| Base para B3-F3 | não serve: "pedir pauta pelo mesmo link" não tem sentido num link que morre com um roteiro | é o pré-requisito real de B3-F3 |

**Recomendação:** reescrever a entrega de B3-F2 como "portal por Cliente" (as linhas da direita), com a pergunta de segurança explícita (token por Cliente vive mais e vê mais, logo o custo de vazamento é maior; revogação e rotação precisam ser desenhadas antes do `.sql`), ou dar B3-F2 por absorvida em B3-F1 e religar B3-F3 a um desenho novo. As duas são decisão de produto, não de planejador.

## O que exige ação humana

1. **Migration 0031, quando o 267 for mergeado:** aplicar `supabase/migrations/0031_custo_roteiro.sql` via MCP (`apply_migration`), rodar `get_advisors` security e performance, e só então acrescentar `humano:migration-0031` a `docs/fila/liberacoes.json`. Até lá 269 e 270 ficam parados na fila, por construção. O `.sql` ainda não existe: ele nasce no 267 e deve ir íntegro no relatório daquela drenagem.
2. **B3-F4 para `pronta`:** um campo, em `mapa.json` e `MAPA.md`, depois que B3-F1 virar `concluida`. Hoje isso depende do 243 (refatiar) e do 244. Não muda nada no loop, que só lê dependência de ticket.
3. **Allowlist de B3-F4 para a tela do custo** (item 3 da seção B3-F4): escolher entre o card da home (`DesempenhoCard.tsx` + `test/render/home-desempenho.test.tsx`) e a fila interna (`aprovacoes-read.ts`, `aprovacoes/page.tsx`, `aprovacoes-fila.test.tsx`), e pedir o ticket de tela. Sem isso o DoD de B3 não fecha, mesmo com 267 a 270 done.
4. **B3-F2:** decidir entre reescrever como portal por Cliente e dar por absorvida (seção acima).
5. **Fechar B1 e B2:** todas as frentes dos dois blocos estão `concluida`; falta o dono conferir o DoD de cada bloco e mudar o status do bloco.
6. **Cache deixado pelo vitest:** `services/telemetria/node_modules/.vite/vitest/results.json`, ignorado pelo git, criado quando rodei a suíte da telemetria. O `rm` é negado neste harness. Para apagar: `! rm -r services/telemetria/node_modules` neste worktree.

## Achados fora do escopo (sem patch)

- **`orq mapa lint` lê o mapa do checkout principal**, como o `orq validar` lê a fila de lá: `scripts/orq:274` faz `cd "$MAIN_CHECKOUT"` antes de rodar `lint-mapa.py`. O comando literal da linha de chegada passa sem olhar a edição deste worktree (ele viu 11 gates declarados e 0 exigidos; o mesmo script rodado aqui vê 12 e 2). Por isso colei as duas saídas. O motor é do orquestrador-kit; fica a sugestão de um `--raiz` ou de um aviso quando rodado de worktree, a portar lá.
- **A fila principal andou durante a sessão:** 236 e 242 done, 243 em `refatiar` com decisão pendente (barreira de credencial: `const TOKEN = 'tok-secreto-9f8e7d6c'` em `aprovar-publico.test.tsx`, mesma classe do 241). É isso que empurra B3-F1, e com ela o `pronta` de B3-F4, para depois de hoje. Quando o 243 for refatiado, os filhos devem usar o sufixo de letra (243a, 243b), como 230a e 241a; os IDs 267 a 270 não colidem com isso.
- **Lição do lote 14 aplicada:** nenhum ticket novo conta `it(` de arquivo que outro pendente ainda vai criar, e nenhum critério lê arquivo que não existe nem é criado pelo próprio ticket.

## Estado final

- Os três symlinks de `node_modules` (raiz, `apps/web`, `services/persona-roteirizador`) foram criados para medir e removidos com `unlink`; o `ls` depois deles dá "No such file or directory" nos três.
- Ficou o cache do item 6 das ações humanas (ignorado pelo git, fora do `git status` comum).
- Nenhum ticket existente foi editado. Nenhum arquivo fora dos seis caminhos permitidos foi alterado no repositório.

```
$ git status --porcelain
 M docs/roadmap/MAPA.md
 M docs/roadmap/mapa.json
?? docs/fila/267-migration-custo-do-roteiro.md
?? docs/fila/268-medidor-de-custo-da-geracao.md
?? docs/fila/269-custo-da-sessao-chega-ao-roteiro.md
?? docs/fila/270-leitura-do-custo-por-roteiro-publicavel.md
$ git diff --stat
 docs/roadmap/MAPA.md   | 14 +++++++-------
 docs/roadmap/mapa.json | 15 ++++++++-------
 2 files changed, 15 insertions(+), 14 deletions(-)
```
