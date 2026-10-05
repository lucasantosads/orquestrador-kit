# Defeito: aviso_allowlist não resolve variável de shell no cmd

Origem: comarka-operacional, 05/10. Estado: ABERTO, não implementado. Só existe na linhagem do motor do comarka (o kit não tem `aviso_allowlist`); entra aqui para a migração do comarka para o kit não herdar o problema.

## O que aconteceu

- `aviso_allowlist` (`scripts/orquestrador/executor.sh:324-403` no comarka) procura, em cada critério não-guarda, o arquivo de `npx vitest run <arquivo>` com a regex de `executor.sh:389` (`[[ "$cmd" =~ npx\ vitest\ run\ ([^[:space:]]+) ]]`) e confere se ele casa a `pathspec_allowlist`.
- Quando o cmd usa variável (`f=test/x.test.ts; … npx vitest run $f`), a captura é o literal `$f`. Ele não casa nada e o log imprime `aviso allowlist: $f (criterio[i]) está FORA da pathspec_allowlist — o agente será bloqueado`, embora o caminho real esteja na allowlist.
- Visto no ticket 860 do comarka em 05/10 (`criterio[16]`, `f=test/wpp-evolution-credencial.test.ts`), na tentativa 1.

## Impacto

- Não afeta o veredicto. A função só chama `log` e usa variáveis `local` (`executor.sh:306`: "Só AVISA, nunca reprova"). O enforcement compara o diff real (`enforcement.sh:29`, `git diff --name-only "$BASE"...HEAD`) com a `pathspec_allowlist` (`enforcement.sh:34`) e nunca lê o cmd dos critérios.
- Custo: a frase "será bloqueado" é falsa e manda alguém conferir à mão um bloqueio que não existe. Aviso que mente ensina a desconfiar do log inteiro (mesmo argumento de `executor.sh:335-340`).

## Pedido

Uma das duas, no `aviso_allowlist`:

- ignorar captura que começa com `$` (não dá para conferir, então não avisa); ou
- antes do match, resolver as atribuições `VAR=valor` do mesmo cmd e trocar `$VAR`/`${VAR}` pelo valor.

## Critério executável

- Fixture: ticket com critério não-guarda `f=test/a.test.ts; npx vitest run $f` e `test/a.test.ts` na allowlist → nenhum aviso "FORA da pathspec_allowlist".
- Mesmo critério com `test/a.test.ts` fora da allowlist → aviso continua (se a opção escolhida for resolver a variável) ou some sem falso positivo (se for ignorar `$`).
- Critério com caminho literal fora da allowlist → aviso continua, como hoje.
