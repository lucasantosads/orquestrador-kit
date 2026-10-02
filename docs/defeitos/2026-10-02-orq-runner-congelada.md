# Defeito: worktree de execução orq-runner fica congelada no commit em que nasceu

Origem: comarka-operacional, 02/10. Estado: ABERTO, não implementado. Só existe na linhagem do motor do comarka (o `local-loop.sh` do kit não tem `orq-runner` nem `ORQ_EXEC_ROOT`); entra aqui para a migração do comarka para o kit não herdar o problema.

## O que aconteceu

- `ensure_runner_worktree` (`scripts/orquestrador/local-loop.sh:93-106` no comarka) só cria `_worktrees/orq-runner` quando ela não existe (`git worktree add --detach … "$BRANCH_ALVO"`). Depois disso, a cada drenagem, faz `git reset --hard` e `git clean -fd` contra o próprio HEAD. Ela nunca avança.
- Em 02/10 a `orq-runner` estava em `1466b24` (merge do lote 6), com `executor.sh:366` ainda contando `dl` por `wc -l` do diff cru, enquanto o executor real (`6307912`) já conta por numstat.
- Não afeta o run hoje: `run_executor_once` (`local-loop.sh:83-88`) executa `$REPO/scripts/orquestrador/executor.sh` do checkout principal, e a `orq-runner` serve só de `ORQ_EXEC_ROOT` (raiz de git + guarda de árvore suja).

## Risco

- Quem lê o motor pela `orq-runner` vê código velho e tira conclusão errada (foi o que quase aconteceu ao conferir o porte do numstat).
- Qualquer mudança futura que passe a executar código a partir de `ORQ_EXEC_ROOT` roda o motor de quando a worktree nasceu.

## Por que um README na raiz dela não resolve

O `git clean -fd` do próprio `ensure_runner_worktree` apaga arquivo não rastreado a cada drenagem; um README commitado apareceria em todo checkout do repo.

## Pedido

Na migração do comarka para o kit, ou se o kit adotar a worktree de execução: alinhar a worktree ao `BRANCH_ALVO` a cada drenagem (`git -C "$wt" checkout --detach --force "$BRANCH_ALVO"` antes do `reset --hard`/`clean -fd`), com o loop dono do lock.

## Critério executável

- Fixture: worktree de execução criada em C1; `BRANCH_ALVO` avança para C2; nova drenagem → `git -C orq-runner rev-parse HEAD` = C2.
- Árvore suja na worktree de execução continua sendo limpa (comportamento de hoje).
