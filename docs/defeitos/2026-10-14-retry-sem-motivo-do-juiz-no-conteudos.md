# Defeito: retry recebe a reprovação do juiz vazia no conteudos-infinitos (motor instalado anterior ao 623)

Origem: conteudos-infinitos, ticket 243, tentativas de 21/09. Fonte: `docs/fila/runs/243/` daquele repo. Estado: **já corrigido no kit** (`ab1d848`, 24/09, ticket 623). Falta o PORTE para o conteudos-infinitos, que ainda não foi feito. Nenhuma mudança de motor foi feita nesta nota.

## O que aconteceu

O 243 bloqueou depois de três tentativas que contam (`max_retries: 2`). Nas três, typecheck, testes e build passaram, e o juiz reprovou.

| pasta | modelo | desfecho | bloco `REPROVAÇÃO ANTERIOR` no `prompt.txt` |
|---|---|---|---|
| attempt-0 | sonnet | refatiar (barreira de credencial), não conta | — |
| attempt-1 | sonnet | reprovado pelo juiz | — (retomada do refatiar) |
| attempt-2 | opus | reprovado pelo juiz | `gate: ""`, `criterios_falhos: []`, sem motivo |
| attempt-3 | opus | reprovado pelo juiz | `gate: ""`, `criterios_falhos: []`, sem motivo |

O juiz deixou o motivo completo em `juiz.veredito.json` e em `veredito.json` (falta de controle positivo nos testes de ausência; barra do app escondida só por CSS). Nada disso chegou ao agente. A tentativa 3 entregou um `diff.patch` byte a byte igual ao da tentativa 2, e o agente escreveu no resultado: "A reprovação anterior veio vazia… não havia correção específica a fazer". O juiz foi chamado de novo sobre o mesmo diff.

## Causa verificada

A hipótese inicial era um defeito do motor atual. **Não é.** O motor instalado no conteudos-infinitos é anterior à correção:

- `scripts/orquestrador/executor.sh` do conteudos-infinitos é **idêntico** ao do kit em `da97b3a` (etapa 7b). Foi instalado pelo commit `18400e0` daquele repo, em 21/09 às 19:49, minutos antes das tentativas do 243 (20:00–20:07). Não foi atualizado depois disso.
- Nessa versão, `diagnostico_retry` (`executor.sh:946` da cópia instalada) monta `criteriosFalhos` só a partir de `$CRITERIOS_FALHOS`, que guarda os critérios **mecânicos**. Quando o juiz reprova e o mecânico está verde, a lista sai vazia, e o `diagnostico.ts` gera o bloco com `gate: ""`.
- O kit corrigiu isso em `ab1d848` (porte do 623 do Actus, 24/09). Em `executor.sh:1194-1217` da `main`, quando `JUIZ_ROU=1` e `JUIZ_APROVADO=false`, o motivo do juiz entra **literal** e vai **na frente** de `criteriosFalhos`, junto com os `criterios_falhos` do `juiz.veredito.json`. O mesmo commit trouxe o `retry_sem_mudanca` (`executor.sh:1024`): uma tentativa com `diff.patch` de mesmo sha256 bloqueia sem chamar o juiz. Com o motor da `main`, a tentativa 3 do 243 teria bloqueado sem pagar o juiz.
- Cópias com a correção: o actus-saas tem; o conteudos-infinitos não. O comarka-operacional usa outro motor (`avaliador.sh`), e esta nota não o cobre.

## Prova (14/10)

`test/orquestrador-retry-feedback-juiz.test.ts`, já no kit desde `ab1d848`:

- **`main` (`ee0f238`):** 3/3 passam.
- **`da97b3a`, o motor instalado no conteudos-infinitos:** rodei o mesmo arquivo de teste numa worktree desanexada temporária, já removida. Resultado: **2 falham e 1 passa**.
  - Em 623 (a), a asserção `"gate": "juiz"` recebe um prompt sem o bloco.
  - Em 623 (b), o retry com diff idêntico não bloqueia por `retry_sem_mudanca`.
  - O contra-teste (diff diferente chama o juiz de novo) passa nas duas versões.

## Pedido

Fazer o porte do kit para o conteudos-infinitos com `instalar.sh --atualizar` a partir da `main`. Revisar o salto de `da97b3a` até a `main` antes, porque o porte traz tudo o que entrou no kit desde a etapa 7b, não só o 623.

Fora desta nota, e do lado do repo, não do motor: o 243 também precisa de `apps/web/src/components/Nav.tsx` na allowlist (ou de um ticket antes dele só para isso). Sem esse arquivo, o item 3 do objetivo ("sem menu, sem cabeçalho do app") não tem solução honesta: a barra vem do `layout.tsx` raiz. Mesmo com o feedback chegando, o agente só conseguiria corrigir a parte dos testes.

## Critério executável

No conteudos-infinitos, depois do porte:

    grep -c 'JUIZ QUE REPROVOU' scripts/orquestrador/executor.sh     # espera >= 1 (hoje: 0)
    grep -c 'retry_sem_mudanca' scripts/orquestrador/executor.sh     # espera >= 1 (hoje: 0)

No kit, o teste que prova o comportamento continua sendo:

    npx vitest run test/orquestrador-retry-feedback-juiz.test.ts     # 3 passed
