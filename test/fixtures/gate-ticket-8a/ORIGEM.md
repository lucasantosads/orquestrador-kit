# Origem das fixtures da etapa 8a

Cada `.md` de ticket é `git show <sha>:<caminho>` do comarka-operacional, sem edição:
o commit em que o ticket entrou na fila (não a versão consertada), ou, no controle
negativo, a versão que rodou (última `pendente` antes do loop pegar).

## c14/

| arquivo | origem | papel |
|---|---|---|
| 924b-conta-entregas-do-mes.md | 1f6d31f:docs/fila/924b-conta-entregas-do-mes.md | caso real (resgate 3f56478) |
| 924c-conta-conexoes-linhas.md | 1f6d31f:docs/fila/924c-conta-conexoes-linhas.md | caso real (resgate 3718afa) |
| 924d-conta-cadastro-linhas.md | 1f6d31f:docs/fila/924d-conta-cadastro-linhas.md | mesma família (3718afa) |
| 924f-conta-faixa-acao-e-ordem.md | 1f6d31f:docs/fila/924f-conta-faixa-acao-e-ordem.md | mesma família (3718afa) |
| 926b-avisos-marcos-inicio.md | 1f6d31f:docs/fila/926b-avisos-marcos-inicio.md | negativo: conserto preventivo |
| 999c-ficha-pendencia-respondida-no-portal.md | a269b0f:docs/fila/999c-ficha-pendencia-respondida-no-portal.md | negativo: resgate de premissa |
| 922b-marcos-prazos-config-tela.md | f01a989:docs/fila/922b-marcos-prazos-config-tela.md | controle negativo P1r |

## c13/

| arquivo | origem | papel |
|---|---|---|
| 1004-crons-registram-execucao-motores.md | b6905eb:docs/fila/1004-crons-registram-execucao-motores.md | caso real (resgate f01a989) |
| 1012-indices-fk-e-rls-initplan-sql.md | f01a989:docs/fila/1012-indices-fk-e-rls-initplan-sql.md | controle negativo P1r (já com `merge-base HEAD staging-auto`) |

## c11/

Uma árvore reduzida por caso, montada num repo git temporário pelo teste (o sufixo
`.fixture` sai na montagem; ele existe para o vitest e o tsc não lerem os arquivos).
O `.md` do ticket e o `tsconfig.json` são verbatim; cada item de `src/` da allowlist é
um stub de uma linha; cada teste traz só as linhas de import e de citação (caminho,
caminho sem extensão, `@/...`, ou o basename do item com 6 ou mais caracteres), com
cabeçalho `<sha>:<caminho>`. A lista completa, com a contagem de linhas, está em
`c11/ORIGEM-c11.txt`.

| pasta | ticket | árvore | papel |
|---|---|---|---|
| 950-entrada | 378e359 (entrada) | 5611e08 | caso real: etapa2-funil-motor importa o motor (estava em testes_conferidos) |
| 1006-entrada | b6905eb (entrada) | d1a62a6 | caso real: quem-cuida importa/cita as rotas |
| 840-prevoo | 7787af3^ (antes do resgate) | ba78cc9 | caso real: o teste nasceu depois da entrada; só a árvore do pré-voo o tem |
| 844-controle | 00b8ef7 (rodou de primeira) | 111a043 | controle negativo P1r: só o basename `nps-disparo` aparece no teste |
