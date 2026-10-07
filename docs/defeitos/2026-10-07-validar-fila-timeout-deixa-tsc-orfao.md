# Defeito: validar-fila.py estoura o timeout de 45 s e deixa o tsc e a árvore temporária órfãos

Origem: comarka-operacional, 07/10. Estado: ABERTO, não implementado. O `scripts/validar-fila.py` existe só na linhagem do motor do comarka (o kit não distribui esse arquivo; no kit só há `scripts/roadmap/lint-mapa.py`). Ele entra aqui para a migração do comarka para o kit não herdar o problema. Blob examinado: `scripts/validar-fila.py` em `3553920` (HEAD da main do comarka, 07/10).

## O que aconteceu

Em 07/10, entre 17h30 e 18h10, cinco sessões escreveram tickets em paralelo e cada uma rodou `validar-fila.py` várias vezes (load average entre 10 e 17, 36 processos de tsc e vitest ao mesmo tempo). Os critérios de guarda de tsc (`npx tsc --noEmit ...`) passaram de 45 s e o validador caiu:

- O validador terminou com `subprocess.TimeoutExpired`, sem tratar a exceção. Pelo menos 5 tentativas seguidas falharam assim no ticket 894, e outras nos tickets 883 a 904. Nenhum ERRO ou WARN foi impresso para o ticket, só o traceback.
- Os processos tsc continuaram rodando depois que o validador saiu. Uma sessão matou 12 deles, todos com cwd numa árvore `validar-fila-*/arvore` que já não existia.
- Sobraram 10 diretórios em `$TMPDIR` (`/private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/`), de `validar-fila-sq9bflip` (17:47) a `validar-fila-djnepi7a` (18:00). Cada um tem só `arvore/tsconfig.tsbuildinfo`, com 716K. O tsc órfão gravou o buildinfo (o `tsconfig.json:18` do comarka tem `"incremental": true`) depois que `fechar_arvore` apagou a árvore e, com isso, recriou o diretório.
- Um 11º caso é diferente: `validar-fila-9mkluv54`, das 12:41, sobrou como worktree **registrada** e completa (44M, HEAD destacado em `e7b45dd`, presente em `git worktree list`). O `fechar_arvore` não rodou. A causa não foi apurada; uma hipótese é o processo do validador morto por sinal, com o `finally` sem chance de rodar. Foi removida à mão em 07/10 com `git worktree remove --force`.

## Mecanismo (arquivo:linha em 3553920)

- `TIMEOUT = 45` (`:54`), e `run()` chama `subprocess.run(cmd, shell=True, ..., timeout=TIMEOUT, executable="/bin/bash")` (`:104-105`), sem `try`.
- No timeout, `subprocess.run` mata só o filho direto, o `/bin/bash`. O `npx` e o `node .../tsc` que o bash criou não estão no alvo do kill (não há `start_new_session` nem kill do grupo de processos) e seguem vivos.
- `TimeoutExpired` sobe por `_validar` (`:1365` e `:1394`, recon e critérios rodando com `cwd=arvore`). O `try/finally` de `:1302-1305` chama `fechar_arvore` (`:802-807`), que remove a worktree e faz `rmtree` do diretório. O tsc órfão continua com cwd no caminho apagado e recria `arvore/tsconfig.tsbuildinfo` ao terminar.
- A exceção não é convertida em ERRO do critério: o validador inteiro cai, e os tickets seguintes daquela chamada não são validados.

## Pedido

- Em `run()`: `subprocess.Popen(..., start_new_session=True)` e, no timeout, `os.killpg(proc.pid, SIGTERM)` e depois `SIGKILL` após uma folga curta. Matar o grupo, não só o bash.
- Timeout de um comando vira resultado do critério (rc 124, saída `TIMEOUT apos Ns`), reportado como ERRO daquele critério, nunca exceção que derruba a rodada.
- Timeout configurável (ex.: `VALIDAR_FILA_TIMEOUT` ou chave no `000-config.json`), com o padrão atual de 45 s. Com a máquina livre, os mesmos critérios de tsc passaram dentro dos 45 s em 07/10; o tempo exato não foi medido.
- `fechar_arvore` só apaga o diretório depois de garantir que o grupo de processos da árvore morreu.
- Instalar handlers de SIGTERM e SIGINT que chamem `fechar_arvore` (hoje um sinal deixa a worktree registrada, como no `9mkluv54`). Na abertura, rodar `git worktree prune` e avisar quando existir `validar-fila-*` antigo em `$TMPDIR`.

## Critério executável

- Critério falso `cmd: "sleep 120 & sleep 120; echo X"` com timeout de 2 s: o validador termina com rc 1 e ERRO `TIMEOUT` no critério, sem traceback. Logo depois, `pgrep -f 'sleep 120'` vem vazio.
- Critério que cria um filho gravando no cwd (`bash -c 'sleep 5; touch marca' &` mais `sleep 60`) com timeout de 2 s: 10 s depois, nenhum `validar-fila-*/arvore/marca` existe em `$TMPDIR`.
- Validador recebendo SIGTERM durante um critério: `git worktree list` não mostra nenhuma `validar-fila-*` e o diretório em `$TMPDIR` não existe.
- Contraprova: critério rápido segue com o mesmo rc e a mesma saída de antes.

## Fora deste defeito

Os 10 diretórios só com `tsconfig.tsbuildinfo` em `$TMPDIR` ficaram no lugar em 07/10 (inofensivos, cerca de 7M no total). Limpeza manual, fora do motor.
