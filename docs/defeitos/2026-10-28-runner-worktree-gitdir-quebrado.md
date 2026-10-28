# Defeito: worktree de execucao com diretorio presente e gitdir sumido nao e recriada, e o preflight recusa com "repo errado: origin=''"

Origem: comarka-operacional, loop apolo, tickets 5281 e 5291, 27 e 28/10/2026. Fonte: `docs/fila/runs/5281/`, `docs/fila/runs/5291/` e a worktree `~/Projetos/_worktrees/orq-runner-apolo` daquele repo. Estado: **conserto aplicado no comarka (`54fccc1`), sem prefixo PORTE-PENDENTE e sem porte no kit**. Nenhuma mudanca de motor foi feita no kit por esta nota.

## O que aconteceu

O diretorio `orq-runner-apolo` continuou no disco, mas o registro dele em `.git/worktrees/` sumiu. O loop nao recriou a worktree, o executor caiu num fallback e o preflight bloqueou os dois tickets do Apolo. O disjuntor (defeito `2026-10-28-disjuntor-conta-falha-de-infra.md`) transformou isso em ticket `bloqueado`.

## Evidencia (Mac, 28/10/2026)

- `git -C ~/Projetos/_worktrees/orq-runner-apolo rev-parse --git-common-dir` responde `fatal: not a git repository: .../comarka-operacional/.git/worktrees/orq-runner-apolo`.
- `git worktree list` nao lista a runner apolo. Lista `orq-runner`, `staging-apolo` e `staging-auto`, todas `locked`.
- Dezenas de worktrees nao travadas do mesmo repo estao quebradas do mesmo jeito; as 3 travadas sobreviveram.

## Causa verificada

No comarka-operacional:

- `scripts/orquestrador/local-loop.sh:104`, `ensure_runner_worktree`: so cria a worktree quando o diretorio NAO existe (`[ ! -d "$wt" ]`). Com o diretorio presente e o gitdir invalido, segue como se estivesse tudo certo; o `reset --hard` seguinte falha sem aviso (descrito no diagnostico do comarka de 28/10, nao reexecutado por esta nota).
- `scripts/orquestrador/lib.sh` (comentarios nas linhas 288-290): sem worktree valida, `MAIN_CHECKOUT` cai no fallback `ROOT`, `git remote get-url origin` volta vazio.
- `scripts/orquestrador/executor.sh:922`: o preflight recusa com `repo errado: origin='' nao contem '<repo>'`.

Hipotese forte, nao provada: um `git worktree prune` rodado de uma sessao na nuvem ou VM (que nao enxerga `/Users/lucasantos`) removeu o registro de toda worktree sem `lock`. A evidencia e consistente (so as travadas sobreviveram), mas nenhum log mostra o prune.

Observacao de linhagem: o motor do comarka nao foi instalado pelo kit (sem `VERSAO`). Ver `docs/defeitos/2026-10-02-orq-runner-congelada.md` para um defeito vizinho da runner e conferir se o kit ja trata gitdir invalido.

## Comportamento pedido

1. `ensure_runner_worktree` detecta gitdir invalido (`git -C "$wt" rev-parse --git-dir` falha com o diretorio presente), move o diretorio para `<nome>.quebrada-<ddHHMMSS>` (nunca apaga) e recria a worktree limpa a partir do branch alvo.
2. A mensagem de log diz que a worktree estava quebrada, para onde foi movida e que deve ser travada com `git worktree lock`.
3. Falha do `reset --hard` da runner nao pode ser silenciosa: ou aborta com causa de infra, ou registra no log.
4. Depois de recriar, travar a worktree com `git worktree lock --reason "runner do orquestrador"` evita o `prune` acidental. Avaliar se o loop deve travar sozinho.

## Criterio executavel

- `scripts/orquestrador/test-runner-quebrado.sh` (comarka `54fccc1`): monta um repo de fixture com a runner de diretorio presente e gitdir removido; depois de `ensure_runner_worktree`, o diretorio antigo existe como `*.quebrada-*` e a runner nova responde a `rev-parse --git-dir`.
- Vermelho antes: o mesmo teste contra o motor anterior (`54fccc1^`) deve falhar. O controle negativo foi feito na VM do comarka em 28/10 (passa com o patch, falha sem ele); o relatorio da etapa precisa repetir e mostrar a falha.

## Pendencias de processo

- `54fccc1` entrou no comarka sem o prefixo `PORTE-PENDENTE:`. Registrar na tabela "PORTE-PENDENTE abertos no comarka" de `docs/migracao-comarka.md`.
- Regra operacional ja registrada no comarka: nunca rodar `git worktree prune` fora do Mac.
