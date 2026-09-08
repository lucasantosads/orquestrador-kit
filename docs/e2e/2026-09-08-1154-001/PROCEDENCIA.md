# Run e2e de 2026-09-08 11:54 · ticket 001 · kit 2.1.0-dev

Primeira travessia PAGA do loop pelo repo de fixture (peça K7-e2e, commit
`8525c49`), com OK humano explícito.

## O que está aqui

- `events.log.txt` — a trilha do run. Estava no disco desde 08/09 e **não estava
  versionada**: o `.gitignore` do kit barra `*.log` (linha 3). Renomeada para
  `.log.txt` na peça K7c, que é a convenção que o `scripts/kit/fixture-e2e.sh`
  passou a aplicar sozinho.
- `custo.json` — o ledger. Era o único arquivo deste run que o git guardava.

## O que NÃO está aqui, e não volta

Os `attempt-*/` do run — `gates.txt`, `criterios.txt`, `enforcement.json`,
`meta.json`, o prompt do executor, o diff e o veredito cru do juiz. O fixture
morava em `/tmp` e foi removido; a peça K7c (preservar a evidência ANTES de
qualquer limpeza) só existe por causa desta perda.

O que sobrevive daquele attempt é o que alguém copiou à mão para a mensagem do
commit `8525c49` e para `docs/PECAS.md` (K7-e2e): `ok typecheck` / `ok test` /
`VEREDITO: APROVADO`, `enforcement=ok`, `criterios=4/4`, merge `5d7c32d` na
`staging-auto`, uma tentativa, zero retry, US$ 0,369 contra `usd_ticket` 1.

A linha `GATE` daquela trilha diz
`typecheck=nao-rodou testes=nao-rodou build=nao-rodou` sobre gates que o
`gates.txt` do mesmo attempt registrava como `ok`. Não é erro de transcrição: é
o defeito que a peça K6b consertou, preservado aqui como estava.
