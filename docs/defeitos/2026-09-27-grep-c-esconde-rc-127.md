# Defeito para o orquestrador-kit: `comando | grep -c` com espera "0" é verde quando o comando nem roda

Origem: e2e pago do fixture em 27/09 (`docs/e2e/2026-09-27-1851-001`), ticket 001. Estado: BACKLOG do motor, não implementado.

## O que acontece

O critério "typecheck não regride" era `npx tsc --noEmit 2>&1 | grep -c 'error TS'` com espera `0`. No e2e de 27/09 a worktree nasceu sem `node_modules` (K6a, conserto em `pacotes_do_checkout`), o `tsc` não existia e o critério saiu **verde**. `grep -c` sem nenhum acerto imprime `0`, e `0` era justamente a espera.

O `run_criterios` (executor.sh) já roda o `cmd` sob `set -euo pipefail` e guarda o rc (ticket 625). Só que compara **só a saída**: `criterio_match "$out" "$esp"`. Com a saída casando, o rc não entra na conta. `pipefail` também não resolve, e por dois motivos:
- o rc que ele devolve é o do elemento mais à DIREITA que falhou: o `1` do `grep -c` sem acerto cobre o `127` do produtor;
- e `grep -c` sem acerto sai 1 mesmo quando tudo correu bem, então "rc != 0" não separa os dois casos.

Reprodução (cópia da worktree sem `node_modules`):

```
$ set -euo pipefail; npx --no-install tsc --noEmit 2>&1 | grep -c 'error TS'
0          # rc=1, saída casa a espera "0"
```

## A família

Todo critério que conta ausência e espera zero: `cmd | grep -c X` (ou `| wc -l`) com espera `0`. Comando ausente (127), não executável (126), crash do runner ou rede fora dão todos saída vazia para o filtro, e o filtro transforma isso em `0`. O gate de ticket não pega hoje: o critério [0] do 001 passava limpo, e as 4 violações do aviso eram dos critérios [1] e [2].

## Contorno no ticket (aplicado no fixture)

`npx tsc --noEmit >/dev/null 2>&1 && echo OK`, com espera `OK`: a saída depende do rc. É a forma que o próprio gate-ticket recomenda para vitest.

## Correção pedida no motor (NÃO implementada)

Uma das duas, a decidir:

1. **executor.sh:run_criterios**: guardar o `PIPESTATUS` inteiro do `eval` (não só o rc final). Se QUALQUER estágio saiu 126 ou 127, o critério FALHA como "não executado", mesmo com a saída casando (já existe o caminho `CRITERIOS_NAO_EXECUTADOS` para quando a saída não casa). O `$?` sozinho não serve, pelo motivo acima.
   Cuidado: o `npx` de um binário ausente pode não dar 127 (ele tenta baixar o pacote e falha com outro rc). Então (1) pega `tsc` direto e `npm run`, mas não garante pegar `npx`.
2. **gate-ticket.ts**: aviso quando `cmd` termina em `| grep -c …` ou `| wc -l` e a `espera` é `0`. Mensagem: "contagem que espera zero é verde quando o comando nem roda; use `>/dev/null 2>&1 && echo OK`".

## Critério executável

- (1) Worktree de teste com `cmd` = `comando-que-nao-existe 2>&1 | grep -c x`, espera `0`: o critério sai FALHA e entra em `criterios_nao_executados`.
- (1) Contraprova: `true | grep -c x`, espera `0` (PIPESTATUS `0 1`): continua verde. Só 126/127 de algum estágio contam, nunca o rc 1 do `grep -c`.
- (2) Ticket com `npx tsc --noEmit 2>&1 | grep -c 'error TS'` e espera `0`: o gate-ticket avisa. Contraprova: a forma `>/dev/null 2>&1 && echo OK` não avisa.
- (2) Molde: `test/orquestrador-gate-regex-casos.test.ts`.
