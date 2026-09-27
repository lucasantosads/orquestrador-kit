# Run e2e de 2026-09-27 18:50 · ticket 001 · ADIADO (gate_crash)

Segunda travessia PAGA do fixture, com OK humano. Rodou com o motor do kit em
`b58cc8f` (HEAD da main na hora). **Falhou por defeito do motor, não do agente.**

## Desfecho

`ADIADO motivo=gate_crash`, uma tentativa, sem juiz e sem merge. O `gates.txt`
diz `FALHA typecheck … exit 127` / `sh: tsc: command not found`: a worktree
`fx-001` nasceu **sem `node_modules`**.

Causa: o `pacotes_do_checkout` do K6a (`d613b07`, 08/09 12:25) só casava
`node_modules` DIRETÓRIO (`find -type d`). O `node_modules` do fixture é SYMLINK
para o do kit (`fixture.sh`), então a lista saiu vazia e nada foi linkado. O e2e
de 08/09 (`docs/e2e/2026-09-08-1154-001`) passou porque rodou 31 min antes do
K6a. Reproduzido à mão, sem agente, com o próprio `gates.ts` sobre o commit do
executor: gates.txt idêntico sem `node_modules`, `APROVADO` com ele.

Conserto: `6045788` (motor) e `6fd4f46` (`test-fixture-gates.sh`, pré-requisito
grátis do e2e pago). A travessia que prova o conserto é o
`docs/e2e/2026-09-27-1913-001`.

## Custo por etapa

| etapa | US$ |
|---|---|
| sondagem (probe) | 0,0970 |
| executor (sonnet, 27 turnos, 4 permissões negadas procurando o vitest no disco) | 0,5835 |
| juiz | não rodou |
| **total** | **0,6804** |

## Achados que este run deixou

- O critério "typecheck não regride" (`npx tsc --noEmit 2>&1 | grep -c 'error TS'`,
  espera `0`) saiu **verde com o tsc ausente**: `grep -c` sem acerto imprime `0`.
  Ver `docs/defeitos/2026-09-27-grep-c-esconde-rc-127.md`. O critério do fixture
  mudou em `167b209`.
- `GATE_TICKET_AVISO violacoes=4`: eram do próprio ticket do fixture (critérios
  [1] e [2]). Corrigido em `681e8b2`.

## O que está aqui

`001/attempt-0/` inteiro (gates, critérios, enforcement, prompt, diff, saída do
agente, veredito), `001/meta.json`, `001/.adiamentos`, `events.log.txt` e
`custo.json`, copiados pelo `fixture-e2e.sh` (K7c). O fixture original ficou em
`/tmp/orq-fixture-76KMD4`.
