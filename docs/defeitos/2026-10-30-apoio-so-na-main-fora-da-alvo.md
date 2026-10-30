# Defeito: arquivo de apoio entra só na main e a frente, que nasce da alvo, não o vê

Origem: dashboard-comercial (clone `~/Projetos/dashboard-comercial-orq`), 29/10/2026, ticket 044. Fonte: relatório de bloqueios do chat do dashboard, 30/10. Estado: **consertado na etapa L13** (`c9a8665`, P3). O dashboard só recebe o conserto quando o motor for reinstalado lá.

## O que aconteceu

| quando | fato | evidência |
|---|---|---|
| 29/10 16:44 UTC | `ea57887c` ("fila: lote 7") põe os tickets 044 a 049 e as fixtures `src/lib/financeiro/v2/fatura/__fixtures__/{bb-2026-08,nubank-2026-08,mercadopago-2026-09}.txt` só na `main` | `git show --stat ea57887c` |
| 29/10 19:56 UTC | a frente do 044 nasce da `staging-auto` (`c2c69a07`), sem as fixtures; o teste do leitor dá `ENOENT … __fixtures__/bb-2026-08.txt` e o gate de testes reprova | `docs/fila/runs/044/attempt-0/gates.txt` |
| 29/10 19:57 UTC | tentativa 2 com o mesmo diff: `retry_sem_mudanca` | `docs/fila/runs/044/attempt-1/veredito.json` |
| 30/10 | um humano copia as fixtures para a `staging-auto` (`2f8e6d1f`) e reabre o 044 (`c57e7488`) | `git log staging-auto` |

A fixture não está na allowlist do 044: o ticket só a LÊ ("lendo a fixture … com fs"; "fixtures (só ler, não editar)"). O C9 (`gate-ticket.ts:138`) só confere itens da allowlist. O 6b não reconhece `.txt`. Nada no pré-voo olhava dependência de leitura, e o ticket gastou duas tentativas contra um arquivo que não existia na base da frente. O 045 bateria no mesmo muro.

## Conserto (etapa L13, P3)

`gate-ticket.ts:dependenciasForaDaAlvo` acha o caminho citado no objetivo ou num `cmd` de critério, fora da allowlist e de `cria_novo`, que existe no checkout e não existe na branch alvo. O `drive_ticket` chama `gate-ticket --dependencias-alvo` depois do gate de ticket e antes da worktree e do contador, em qualquer `modo_pre_voo`. Com saída, o ticket fica `bloqueado`, trilha `BLOQUEADO motivo=DEPENDENCIA_FORA_DA_ALVO arquivos=…`, e a nota traz os arquivos, `existe em <checkout>@<sha>` e `ausente em <alvo>@<sha>`. Não gasta tentativa. Triador: D0.

Medido antes: dashboard no estado de 29/10 (main `ea57887c` × staging-auto `c2c69a07`), 2 disparos (044 e 045), os dois verdadeiros; dashboard em 30/10, 0; Comarka (main × staging-auto e × staging-apolo), 0.

## Critério executável

`test/orquestrador-dependencia-alvo.test.ts`: o 044 real com a fixture só na main bloqueia sem `INICIO`, sem `attempt-0` e com 0 tentativas; com a fixture também na alvo, roda. A função dá vazio para o 037 e para os arquivos da própria allowlist.
