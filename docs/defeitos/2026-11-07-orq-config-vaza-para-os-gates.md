# Defeito: o `ORQ_CONFIG` do loop vaza para o comando de gate

Origem: PASSO 0 da etapa KF (o kit roda a própria fila, M-68), 07/11/2026, achado A2 de
`~/orq-sessoes/relatorio-kit-fila-propria.md`. Estado: **contornado no config da fila do kit**
(`docs/fila-kit/000-config.json`, todo gate começa com `env -u ORQ_CONFIG -u ORQ_GATE`, etapa KF P2; o `-u ORQ_GATE` é outro assunto, ver CONTRATO §30); o motor
segue repassando a variável. Conserto por etapa.

## O que acontece

Desde a c0052-B1a (M-54), o `lib.sh` exporta `ORQ_CONFIG` relativo ao checkout principal
(`lib.sh:62`, `export ORQ_CONFIG="$_cfg_rel"`) para que os CLIs em TS achem a fila. O `gates.ts`
roda cada gate com o ambiente inteiro do loop:

```
gates.ts:444-448   spawnSync('bash', ['-c', cmd], { ..., env: { ...process.env, ORQ_GATE: '1' } })
```

O comando do gate roda na worktree do ticket, mas o `ORQ_CONFIG` herdado aponta para a fila do
loop. Qualquer coisa dentro do gate que carregue o `lib.sh` (ou chame um CLI do motor) num OUTRO
checkout resolve o `ORQ_CONFIG` contra esse checkout, não acha o arquivo e aborta:

```
[orq ERRO] ORQ_CONFIG 'docs/fila-kit/000-config.json' não existe (checkout: /var/folders/.../orq-fx-XXXX)
```

É o caso dos testes do próprio kit: `test/fixtures/orq-harness.ts:bashNoFixture` e os
`scripts/orquestrador/test-*.sh` fazem `source lib.sh` num fixture em `mktemp -d`. Com a fila do kit
escolhida por `ORQ_CONFIG`, todo ticket do kit sairia com o gate de testes vermelho por ambiente, sem
relação com o diff.

Repo instalado com uma fila só (sem `ORQ_CONFIG`) não é afetado. Repo com N filas (Comarka
plataforma e apolo, depois do corte do C-0052) é afetado se algum teste dele carregar o motor em
fixture.

## Trilha real

Reproduzido no teste da P2 da KF (`test/orquestrador-fila-kit.test.ts`, "com ORQ_CONFIG exportado,
o lib.sh num fixture aborta sem o prefixo e carrega com ele"): `bash -c 'export
ORQ_EXEC_ROOT=<fixture>; source lib.sh'` com `ORQ_CONFIG=docs/fila-kit/000-config.json` no ambiente
sai com rc != 0 e `ORQ_CONFIG` no stderr; com `env -u ORQ_CONFIG` na frente, carrega e
`FILA_DIR=<fixture>/docs/fila`.

## Pedido

O gate não herda o `ORQ_CONFIG` do loop: `gates.ts` (e o `roda_vitest_isolado` da L11,
`lib.sh:1678`, e o `claude -p` do executor, que roda os gates no prompt) tira a variável do ambiente
do comando. O loop precisa dela; o código sob teste não.

`gates.ts` é régua na fila do kit (`zona_proibida`): o conserto é sessão manual, nunca ticket.

## Critério executável

- Gate com `cmd` `bash -c 'test -z "${ORQ_CONFIG:-}"'` passa quando o `gates.ts --run-cli` roda com
  `ORQ_CONFIG` exportado (vermelho hoje: o gate reprova).
- Depois do conserto, o `-u ORQ_CONFIG` do prefixo dos 4 gates de `docs/fila-kit/000-config.json` sai, e o
  teste da KF P2 que exige o prefixo passa a exigir a ausência dele.
