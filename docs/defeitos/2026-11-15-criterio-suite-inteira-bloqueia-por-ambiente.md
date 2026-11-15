# Defeito: critério-guarda com a suíte inteira bloqueia ticket certo por falha de ambiente

Origem: ciclo 5 do primeiro repo com a operação autônoma (2.2.0), 14/11/2026. Estado: **aberto**.

## O que aconteceu

O planejador escreveu o ticket 031 com um critério `guarda` que roda a suíte inteira:

```
npx vitest run 2>&1 | grep -c 'Test Files.*failed'    espera 0
```

Trilha real (events.log do repo instalado):

```
2026-11-14T21:32:49 031 INICIO attempt=1 model=sonnet
2026-11-14T22:10:47 031 GATE typecheck=ok testes=ok enforcement=ok criterios=4/5 build=ok
2026-11-14T22:10:47 031 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=104
2026-11-14T22:10:48 031 RETRY attempt=2 ...
2026-11-14T22:55:33 031 BLOQUEADO motivo=retry_sem_mudanca attempt=2
```

O gate `testes` passou; o mesmo `vitest run`, repetido pelo critério 35 minutos depois (o Mac
dormiu durante o critério), saiu com 1 arquivo falhando. O diff estava certo, o agente não tinha
o que mudar, e o `retry_sem_mudanca` bloqueou. Rodando a suíte do repo duas vezes com o Mac
entrando em sono, cada rodada falhou em 3 arquivos DIFERENTES (harness do orquestrador e um teste
puro de RBAC), um deles com 3626102 ms: timeouts do vitest disparando ao acordar.

## Por que é do motor

- O gate `testes` já tem a classificação de base vermelha (falha só fora do diff e da allowlist
  vira `base_vermelha`, sem consumir tentativa). O critério que roda a mesma suíte não tem: a
  mesma falha de ambiente, vista pelo critério, vira `criterio_qualidade` e queima o retry.
- O planejador escreve esse critério porque o prompt pede "guarda de typecheck e da suíte
  inteira", que é redundante com os gates `typecheck` e `testes`.

## Pedido

1. Prompt do planejador: a guarda da suíte inteira e do typecheck são os gates; o ticket não
   repete `vitest run` inteiro nem `tsc` inteiro como critério.
2. Gate de ticket: critério cujo cmd roda a suíte inteira do repo (o cmd do gate de papel
   `testes`, com ou sem pipe) é aviso para ticket novo.
3. Critério que reprova com o gate `testes` verde na MESMA tentativa e cujo cmd é a suíte inteira:
   reclassificar como `base_vermelha`/ambiente (sem consumir tentativa), como o gate faz.

## Critério executável

- Vermelho: ticket de fixture com o critério acima e um `vitest run` que falha só na 2ª chamada
  (stub) sai `REPROVADO criterio_qualidade`; depois do conserto, sai sem consumir tentativa e sem
  `retry_sem_mudanca`.
- Controle: critério `alvo` que roda um arquivo de teste do ticket e falha continua reprovando.
- Prompt do planejador não contém mais "guarda de typecheck e da suíte inteira".
