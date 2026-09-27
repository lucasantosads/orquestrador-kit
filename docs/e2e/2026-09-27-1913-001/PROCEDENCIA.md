# Run e2e de 2026-09-27 19:11 · ticket 001 · APROVADO

Terceira travessia PAGA do fixture, com OK humano, depois do conserto do K6a.
Rodou com o motor do kit em `167b209` (`6045788` conserto do
`pacotes_do_checkout`, `6fd4f46` `test-fixture-gates.sh`, `167b209` critério de
typecheck pelo rc).

## Desfecho

`APROVADO` na primeira tentativa, zero retry. Merge em `staging-auto`
(`fd0b86d`), ticket `done`. Linha GATE:
`typecheck=ok testes=ok enforcement=ok criterios=4/4 build=nao-configurado`.
Juiz sonnet (risco baixo): aprovado. Drenagem de 2 min (116 s no watchdog).
O pré-requisito grátis `test-fixture-gates.sh` saiu VERDE antes da primeira
chamada paga. Nenhum push: o origin é `example.invalid`.

## Custo por etapa

| etapa | US$ |
|---|---|
| sondagem (probe) | 0,0939 |
| executor (sonnet, 12 turnos, 0 permissões negadas) | 0,2844 |
| juiz (sonnet) | 0,0898 |
| **total** | **0,4681** |

Teto autorizado para este run: US$ 1,10. `usd_ticket` do fixture: 1.

## Ressalva

O ticket ainda tinha as 4 violações do gate de ticket nos critérios [1] e [2]
(`GATE_TICKET_AVISO violacoes=4`, modo aviso). Elas foram corrigidas DEPOIS deste
run, em `681e8b2`. Este run não exercitou a forma nova daqueles dois critérios,
só a do critério [0] (`167b209`). Ver também
`docs/defeitos/2026-09-27-grep-c-esconde-rc-127.md`.

## O que está aqui

`001/attempt-0/` inteiro (inclusive `juiz.prompt.txt`, `juiz.raw.json` e
`juiz.veredito.json`), `001/meta.json`, `events.log.txt` e `custo.json`. O
fixture ficou em `/tmp/orq-fixture-Msd1vZ`.
