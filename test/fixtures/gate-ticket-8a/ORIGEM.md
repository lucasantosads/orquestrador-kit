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
