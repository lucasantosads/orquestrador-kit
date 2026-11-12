# Defeito: nenhum teste prova que o watchdog do `claude_run` mata o GRUPO

Origem: sessão do escritorio-os, 12/11/2026 (registro em `docs/orquestrador/defeitos-para-o-kit.md`
da branch `eo-defeitos-kit`, 377612c). Estado: **aberto**.

## O que acontece

`claude_run` (`lib.sh:1552-1576`) roda o agente em process group próprio (`set -m; exec claude`) e o
watchdog faz `kill -TERM -"$pid" || kill -TERM "$pid"`. Trocando por `kill -TERM "$pid"` e
`kill -KILL "$pid"` (mata só o líder; um neto do agente, como um `npx vitest` que ele disparou,
sobrevive), a suíte inteira do kit passa.

## Trilha

Mutação numa cópia do kit b59937b: 2090 testes verdes, 1 falha que também existe sem a mutação
(`orquestrador-resolvedor-job-claude`, ver CHANGELOG 2.1.8). Os 13 arquivos que citam `claude_run`
passam 143/143 com e sem a mutação.

## Pedido

Teste em que o `claude` falso dispara um neto (`sleep 60 &`, pid gravado em arquivo) e dorme além
do timeout; afirmar rc 124, neto morto logo após o corte e duração do `claude_run` menor que
timeout + 15 s.

## Critério

Com a mutação acima o teste novo fica vermelho; sem ela, verde.
