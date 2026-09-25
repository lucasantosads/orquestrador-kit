# Defeito para o orquestrador-kit: aceite vermelho por tela classificado como defeito de spec/harness

Origem: comarka-operacional, ticket 559 (aceite da aba Conta), 25/09.

## O que acontece

`scripts/orquestrador/executor.sh:703-722` (circuit breaker, HARDENING 005 C7): quando o motivo normalizado de reprova repete entre duas tentativas, o ticket vai a `bloqueado` com a nota fixa

    "motivo repetido: provável defeito de spec/harness, não do código — <motivo>"

Para ticket de ACEITE (só escreve teste, allowlist só em `test/`), reprovar no gate vitest sempre com o mesmo conjunto de `it(` vermelhos é o resultado esperado quando a TELA ainda não cumpre um item, e não um defeito de spec. O rótulo manda o humano procurar o problema no lugar errado.

## Trilha real

- `docs/fila/runs/559/meta.json`: 4 tentativas reprovadas (01:35Z, 01:37Z, 13:22Z e a seguinte), diff de 362 a 481 linhas.
- `docs/fila/runs/559/attempt-2/gate-vitest.txt`: 1 failed / 5747 passed; o único vermelho é `test/conta-aceite.test.tsx:390`, it "copy: nenhum s/ dado nem travessao de ausencia na aba Conta".
- A causa era código de tela (`formatBytes` devolvendo "—" em `src/components/arquivos/documentos-section.tsx:55`), corrigida pelo ticket 559a (merge 2f58e67 na staging-auto).
- A nota do bloqueio dizia "provável defeito de spec/harness", e foi preciso ler o gate-vitest.txt à mão para achar o it.

## Comportamento pedido

Condição: slug do ticket contém `aceite` E todo item de `pathspec_allowlist` começa com `test/` E o gate vitest reprovou com o MESMO conjunto de nomes de `it(` vermelhos nas 2 últimas tentativas.

Então, no lugar do ramo atual do circuit breaker:
1. Extrair do `gate-vitest.txt` da tentativa os nomes dos `it(` vermelhos e o `arquivo:linha` de cada asserção (a linha `❯ test/<arq>:<linha>:<col>` do relatório do vitest, com ANSI removido).
2. `ticket_set_status bloqueado` + `ticket_set_nota "aceite vermelho por tela: <it1>; <it2>; ..."`, sem gastar a próxima rodada.
3. Gravar `docs/fila/runs/<id>/aceite-vermelhos.json` como lista de `{it, arquivo_teste, linha, mensagem}`.
4. NÃO gerar ticket de correção automaticamente: o relatório é para o humano.

A pausa cross-ticket (`gate_streak_*`, ticket 280) continua valendo antes deste ramo.

## Critério executável

Fixture de `gate-vitest.txt` com 1 falha em `test/x-aceite.test.tsx`, em ticket com slug `x-aceite` e allowlist `["test/x-aceite.test.tsx"]`, repetida em 2 tentativas:
- gera `aceite-vermelhos.json` com exatamente 1 item, com `it`, `arquivo_teste = "test/x-aceite.test.tsx"` e `linha` numérica;
- o status fica `bloqueado` com nota começando por `aceite vermelho por tela:`;
- não existe tentativa 3.

Contraprova: o mesmo fixture com slug sem `aceite`, ou com allowlist tocando `src/`, mantém a nota atual "motivo repetido: provável defeito de spec/harness".

Molde de teste: `scripts/orquestrador/test-cooldown-causa.sh` / `test-adiado.sh`.
