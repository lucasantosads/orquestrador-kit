# Defeito: lock órfão nunca é recuperado (`lock_stale` quebra no import de `lock.js`)

Origem: pré-voo do escritorio-os, cat. 7 (disparo duplo no fixture do kit), 12/11/2026.
Estado: **aberto**.

## O que acontece

`local-loop.sh:38-48` (`lock_stale`) roda `tsx -e` com
`import {parseLockFile, isLockStale} from '$ORQ_LIB_DIR/lock.js'`. Com tsx 4.23.15 e Node 24.21.0 o
eval não resolve `.js` para `lock.ts`: `Error: Cannot find module '.../scripts/orquestrador/lock.js'`,
rc 1. O `lock_adquirir` lê rc 1 como "não é órfão" e encerra com `outro run vivo`.

Dois efeitos:
- disparo duplo: o segundo run morre, mas pelo crash, não pela decisão do lock (no fixture saiu
  `outro run vivo (pid )`, pid vazio, porque o primeiro já tinha removido o lock);
- lock órfão de run que caiu nunca é removido: toda drenagem seguinte encerra em `outro run vivo`,
  sem evento `RECUPERADO` e sem alarme.

## Trilha

`/private/tmp/orq-fixture-Rkubko/repo/docs/fila/runs/local-loop.log`, 19:37:06. Reprodução no
escritorio-os com lock falso `99999\n1000\n` (pid morto, epoch antigo) e o snippet do `lock_stale`:
com `lock.js` rc 1; com `lock.ts` rc 0 (órfão, certo).

## Pedido

Importar `lock.ts` (ou chamar um CLI `.ts`) e tratar falha do tsx como erro alto, não como "vivo".

## Critério

Teste de shell com lock órfão (pid morto, epoch antigo): a drenagem registra
`RECUPERADO motivo=lock-orfao` e segue. Com o import de hoje, vermelho.
