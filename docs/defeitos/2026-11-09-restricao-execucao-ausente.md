# Defeito: o executor quebra quando o config não tem `restricao_execucao`

Origem: canário 001 da fila do kit (M-68), 09/11/2026. Estado: **fechado (etapa DEFEITO-KF, P1)**.

## O que acontece

`config-chaves.ts:81` declara a chave opcional ("inativa quando ausente"), mas
`avaliaRestricaoExecucao` lia o objeto sem guarda:

```
decisao.ts:73   const r = config.restricao_execucao
decisao.ts:75   if (!r.ativa || pendentes.length === 0) ...
```

O `executor.sh:1888` chama `decisao restricao "$slug"` em todo `drive_ticket`, antes de worktree e
de modelo. Sem a chave, o `decisao-cli.ts:63` lança `TypeError`, sai rc 1, e o executor lê esse rc
como RECUSA: loga `RECUSADO (1):` com mensagem vazia, grava `notas_status: "recusado: "` e commita
`fila: <id> recusado`. O ticket não consome tentativa, conta sem progresso, e a fila para sem nenhum
erro legível.

Sem a chave hoje: `docs/fila-kit/000-config.json`, `doutrina/templates/config.json` (todo repo
instalado do template novo nasce assim), `test/fixtures/m69/config-comarka.json` e
`config-comarka-migrado.json`. Com a chave: `config-ci.json` e `config-dashboard.json` (o dashboard
a pôs como contorno deste mesmo defeito, ver `_dc_restricao_execucao`).

## Trilha real

`docs/fila-kit/runs/local-loop.log` do checkout principal, 09/11:

```
/Users/lucasantos/Projetos/orquestrador-kit/scripts/orquestrador/decisao.ts:75
TypeError: Cannot read properties of undefined (reading 'ativa')
    at avaliaRestricaoExecucao (.../scripts/orquestrador/decisao.ts:75:10)
    at <anonymous> (.../scripts/orquestrador/decisao-cli.ts:63:15)
[orq 03:59:20] RECUSADO (1):
```

`events.log`: `00:59:21 --- OCIOSO pendentes=1 001=sem_progresso` e o mesmo às 01:03:02; o commit
`42c9368 fila: 001 recusado` grava `"notas_status": "recusado: "`.

## Pedido

Chave ausente = restrição inativa, como o `config-chaves.ts` promete. Com a chave presente, nada muda.

## Critério executável

`TZ=UTC node_modules/.bin/vitest run test/orquestrador-defeito-kf-restricao.test.ts`: o `decisao-cli
restricao` com o config real da fila do kit (`test/fixtures/defeito-kf/config-fila-kit.json`) e com
o `config-comarka.json` sai `{"permitido":true,"exitCode":0}` com rc 0 (vermelho antes: rc 1 e o
`TypeError`); com o `config-dashboard.json` o resultado é o de antes (permitido com `ativa` false;
recusa com o `recusa_exit_code` do config quando ativa e com papel `PENDENTE_*`).

## Fora deste conserto (anotado, não feito)

- O executor trata qualquer rc != 0 do `decisao restricao` como recusa (`executor.sh:1889-1893`):
  um crash do CLI vira "recusado" com nota vazia em vez de erro. Com a guarda o crash some, mas a
  leitura do rc continua confundindo as duas coisas.
- `executor.sh:166` monta a mensagem de papel pendente com `cfg '.restricao_execucao.desbloqueio'`:
  sem a chave o jq imprime `null` na mensagem (não quebra).
