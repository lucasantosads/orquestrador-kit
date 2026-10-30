# Defeito: o retry_sem_mudanca ignora a mensagem do commit e engole o IMPEDIMENTO do agente

Origem: dashboard-comercial (clone `~/Projetos/dashboard-comercial-orq`), 29/10/2026, tickets 037, 039 e 043. Fonte: relatório de bloqueios do chat do dashboard, 30/10. Estado: **consertado na etapa L13** (`e2ab076`, P1; `d279bbb`, P2). O dashboard só recebe o conserto quando o motor for reinstalado lá.

## O que aconteceu

| ticket | tentativa 1 | tentativa 2 | desfecho | evidência |
|---|---|---|---|---|
| 037 | typecheck, testes, build e critérios verdes; o juiz reprova só o corpo do commit `5818364` ("controle negativo: NÃO foi visto falhando") | commit VAZIO `ce346b5d` com 25 linhas de controle negativo observado | `retry_sem_mudanca`, juiz não chamado | `docs/fila/runs/037/attempt-0/veredito.json`, `attempt-1/veredito.json` |
| 039 | idem, corpo de `565f237f` ("Nao vi nenhum caso falhando") | amend `24ed0691` com os controles | `retry_sem_mudanca`, juiz não chamado | `docs/fila/runs/039/attempt-{0,1}/veredito.json` |
| 043 | o juiz reprova: `previaRateio` não é usada | commit VAZIO `3be96fdc`, corpo só `IMPEDIMENTO: previaRateio (mds-util.ts:36) precisa da lista de clientes da MDS…` | `retry_sem_mudanca`; a nota do agente sumiu | `docs/fila/runs/043/attempt-1/claude.txt` |

A assinatura do `retry_sem_mudanca` era só o sha256 do `diff.patch` (`executor.sh:1208-1231` na main `fb1f98e`). Nos três casos o agente fez o que o retry pedia: corrigiu a mensagem que o juiz reprovou (037, 039) ou declarou que o pedido não cabe na allowlist (043). O motor tratou as duas coisas como "nenhuma hipótese nova".

## Conserto (etapa L13)

- P1 (`e2ab076`, M-02): `grava_mensagens` grava `mensagens.txt` em cada tentativa (`git log --format=%B base..HEAD`, sem o trailer do config e sem `Co-Authored-By`). Diff igual com mensagem nova roda enforcement, gates, critérios e juiz de novo; diff igual com a mesma mensagem segue bloqueado. Sem reaproveitar gates (decisão do Lucas, 30/10).
- P2 (`d279bbb`, M-17): diff vazio ou igual ao anterior, e o corpo dos commits desta tentativa só com linhas `IMPEDIMENTO:`, vira `bloqueado` com causa `IMPEDIMENTO_DECLARADO` e a nota do agente, sem juiz e sem consumir tentativa. Triador: D13 → R3.

## Critério executável

- `test/orquestrador-retry-mensagem.test.ts`: fixtures 037 e 039 (`test/fixtures/l13/`), juiz chamado 2 vezes; contraprova com a mesma mensagem bloqueia por `retry_sem_mudanca`.
- `test/orquestrador-impedimento.test.ts`: fixture 043 bloqueia com `IMPEDIMENTO_DECLARADO` e a frase do agente; 037 (IMPEDIMENTO no meio de um corpo longo) vai ao juiz.
