# Backlog do kit: os casos genéricos do `test-lib-config.sh` do Actus deveriam morar no kit

Origem: porte do `actus-saas` `bf658ec` (diff_cap pela forma) em 27/09. Estado: BACKLOG, não implementado.

## O que está fora do lugar

O `test-lib-config.sh` do Actus (HEAD em 27/09, último commit no arquivo: `9ecd02b`) cresceu além do kit, e o que cresceu não é específico do Actus. Prova regra do motor (`decisao.ts`, `lib.sh`) contra qualquer config válido:

- **tabela `caso_decisao`** (seção "causas de CAMPO PRÓPRIO: decisao.ts, não is_adiavel"): roda `decisao-cli.ts <raiz> desfecho` pelo mesmo caminho do executor. Os 7 casos provam a regra de `permissoesNegadas` (incidente 488 e regra de 22/09): permissão negada com tudo verde dá `aprovado`, com gate reprovado dá `reprovado`, com só critério falho dá `adiado` sem contar retry, com rc != 0 dá `reprovado`. Mais o `impedimentoDeclarado` ignorado, o texto que menciona impedimento e a lista vazia.
- **`DL=1`** (`f8c6e77`): o `diffLines` dos casos é derivado, não cravado. 1 cabe em todo cap que passa a guarda de forma, então os casos de `aprovado` não viram `refatiar` por política.
- **cabeçalho**: 8 causas, duas de campo próprio (juiz ilegível e ambiente da worktree). O `impedimentoDeclarado` saiu em 20/09.

No kit está só a tabela `is_adiavel` (texto + rc). Com isso, a regra de `permissoesNegadas` só tem teste de shell no Actus. Um repo instalado a partir do kit recebe o motor sem esse teste, e o `--verificar` acusa o arquivo do Actus como `diferente`.

## Pedido

1. Trazer a seção `caso_decisao` e o `DL=1` para `scripts/orquestrador/test-lib-config.sh` do kit, com o cabeçalho de 8 causas.
2. Conferir antes, caso a caso, se o `decisao.ts` do kit já tem a regra do Actus (`748b31d`, `9ecd02b` "PORTE-PENDENTE"). Caso que falhar no kit é porte de motor pendente, não teste a afrouxar.
3. Depois disso, o Actus volta a receber o arquivo do kit sem diferença.

## Critério executável

- `bash scripts/kit/test-shell.sh`: `rc=0  test-lib-config.sh`, com os 7 casos `caso_decisao` listados como `ok`.
- O mesmo arquivo contra um config com `diff_cap_linhas = 2500`: rc 0 (o `DL=1` não depende do cap).
- `instalar.sh --verificar ~/Projetos/actus-saas` deixa de listar `scripts/orquestrador/test-lib-config.sh` como `diferente`.
