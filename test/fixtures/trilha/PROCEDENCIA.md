# `test/fixtures/trilha/` · procedência

## `actus-461-reprovado.log` (peça 7b-4)

Linhas **434 a 437** de `~/Projetos/actus-saas/docs/fila/runs/events.log`
(arquivo ignorado pelo git do Actus; HEAD do repo na coleta: `f438730`), copiadas
byte a byte com `sed -n 434,437p` em **2026-09-21**, só leitura. cksum
`1004446157 411`.

É a primeira tentativa do 461 em 2026-09-15: permissão negada 3 vezes, gates
verdes, `criterios=3/4` e `REPROVADO motivo=criterio_qualidade attempt=1
diff=717`. As duas tentativas seguintes, em opus, repetiram `diff=717` e o mesmo
critério vermelho (linhas 443 e 448). O teste da 7b-4 põe estas quatro linhas
na trilha do fixture e prova que a próxima reprovação igual (mesmo sub, mesmo
diff) bloqueia na hora, sem 3ª volta. A linha é do formato de antes da 7b-4,
sem `sub=`: o sub dela é derivado do GATE da mesma tentativa (`criterios=3/4`
com typecheck, testes e build ok = `criterio`).

Os outros dois arquivos desta pasta (`events-quebrado.log`,
`permissao-negada-234.cmd`) são de peças anteriores e têm a procedência nos
testes que os usam.
