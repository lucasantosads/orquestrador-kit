# Defeito: árvore suja na worktree de staging vira "conflito" e bloqueia ticket aprovado

Origem: comarka-operacional, tickets 940 e 932, 09/10. Fonte: `~/orq-sessoes/medicao-bloqueios-out.md` §3 (linhas 36 e 37) e §5. Estado: ABERTO, não implementado. Existe nas duas linhagens, com sintoma diferente.

## O que acontece

**No comarka** (motor próprio, não migrado):
- `scripts/orquestrador/avaliador.sh:50-58` (`merge_em_staging`) roda `git merge --no-ff` direto na `_worktrees/staging-auto`, sem olhar se ela está suja. Qualquer falha do merge volta 1.
- `avaliador.sh:190-192`: merge falhou => `reprova "aprovado no mérito, mas merge em staging-auto conflitou"`. Árvore suja e conflito real saem com o mesmo rótulo.
- `executor.sh:705-723`: a reprova vira retry. O agente roda de novo do zero (custo e tempo inteiros), passa de novo em tudo, o merge falha de novo pelo mesmo motivo, o circuit breaker vê motivo repetido e bloqueia com "provável defeito de spec/harness".
- A única guarda de sujeira é a da raiz de execução (`executor.sh:849-860`, `orq-runner`). A medição citava `avaliador.sh:50-58` como local da guarda; lá está o merge sem guarda.

**No kit** (`3ad99bf`):
- `scripts/orquestrador/local-loop.sh:82-85` já recusa merge com worktree de staging suja, mas devolve o mesmo `return 1` do merge que conflitou (`:98-100`).
- `local-loop.sh:510-516` trata os dois iguais: `bloqueado` + nota "aprovado mas merge em ... falhou" + evento `BLOQUEADO motivo=merge_falhou`. Não reroda o agente, mas bloqueia um ticket aprovado por um problema de ambiente e não diz qual.

## Trilha real

`docs/fila/runs/local-loop.log` do comarka:

    85202 error: Your local changes to the following files would be overwritten by merge:
    85203   docs/fila/854-remove-equipe-geral.md
    85205 [orq 19:51:12] avaliador: REPROVADO — aprovado no mérito, mas merge em staging-auto conflitou
    85206 [orq 19:51:13] ticket 940: reprovado — retry 1/2. motivo: aprovado no mérito, mas merge em staging-auto conflitou
    (tentativa 2: claude 185 s, todos os gates ok, mesmo erro de merge)
    85221 [orq 19:56:08] ticket 940: motivo de reprova REPETIU — circuit breaker (por ticket)

932 igual (L:85252-85271). `runs/940/meta.json`: 2 tentativas, 738 e 653 linhas, as duas com todos os gates verdes. Os dois ficaram bloqueados ~2 dias com mérito aprovado (a árvore estava limpa desde 18:04 do mesmo dia) e destravavam 940b, que segura 10 tickets em `prontos.py`. Requeue manual em 10/10.

## Pedido

1. Antes do merge, `git status --porcelain` na worktree de staging. Sujo => código de saída próprio (ex.: 3, `staging_suja`), distinto de conflito (1) e de branch protegida (2).
2. `staging_suja` não é reprova e não é bloqueio: o ticket fica `pendente` sem consumir tentativa, a branch `frente/<id>` é mantida, nota `aprovado, merge adiado: staging suja (<até 5 arquivos>)`, evento `AMBIENTE motivo=staging_suja`, e a drenagem para (é ambiente, peça 7a-8).
3. No disparo seguinte, se a branch `frente/<id>` ainda existe e já tem veredito aprovado sobre o mesmo HEAD, tenta só o merge, sem rodar o agente de novo.
4. Conflito real continua bloqueando, com a lista de arquivos em conflito na nota (`git diff --name-only --diff-filter=U` antes do `--abort`).
5. Na migração do comarka, o `avaliador.sh` some (inventário `migracao-comarka.md` §a #2); o pedido vale para `merge_em_alvo` e o chamador em `local-loop.sh`.

## Critério executável

Fixture com staging-auto contendo um arquivo rastreado modificado e um ticket aprovado (molde: `test-drenagem.sh`, com `merge_em_alvo` real):
- `merge_em_alvo` volta 3;
- o ticket fica `pendente`, `tentativas` inalterado, nota começa por `aprovado, merge adiado: staging suja`;
- a trilha tem `AMBIENTE motivo=staging_suja` e não tem `BLOQUEADO`;
- `run_executor_once` (stub contador) não é chamado de novo para esse ticket no disparo seguinte; limpa a árvore, o disparo seguinte mergeia e o ticket vai a `done`.

Contraprova: fixture com conflito real de conteúdo na mesma worktree limpa => `return 1`, `bloqueado`, nota com o arquivo em conflito.
