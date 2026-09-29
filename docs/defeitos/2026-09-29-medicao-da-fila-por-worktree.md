# Defeito: medir a fila em worktree dá o estado commitado, mas o loop lê o working tree do checkout principal

Origem: comarka-operacional, 29/09. Estado: ABERTO, não implementado.

## O que aconteceu

- O loop lê `FILA_DIR="$MAIN_CHECKOUT/docs/fila"` (`scripts/orquestrador/lib.sh:42` no kit; `:35` no comarka-operacional): o **working tree** do checkout principal, não o que está commitado.
- Em 29/09, `estado-fila.py` e `prontos.py` foram rodados na worktree `staging-auto` (porque o checkout principal estava com outra sessão). Resultado: `pendente 48`, `REAL_PRONTOS=14`.
- No checkout principal, os mesmos 14 tickets estavam `done` no disco (writeback da promoção `41e57cb` não commitado; ver `2026-09-29-writeback-da-promocao-fora-do-git.md`). Medido ali: `pendente 15`, `REAL_PRONTOS=0`.
- O número errado (14 rodáveis) chegou ao painel de estado antes de ser corrigido. Se a pausa fosse removida com base nele, a expectativa seria de 14 tickets rodando, e na prática não rodaria nenhum.
- Depois do commit `dff6dc1`, as duas árvores voltaram a concordar.

## Onde mora

- A regra de leitura (`FILA_DIR`) é do motor: `lib.sh`.
- `estado-fila.py` e `prontos.py` são scripts do comarka-operacional (`scripts/roadmap/`), **não** do kit. O aviso pedido abaixo pode morar no kit como utilitário (ex.: `scripts/orquestrador/fila-diverge.sh`) chamado pelos scripts do repo, ou nos próprios scripts do repo. A decisão de onde mora é do kit.

## Pedido

Exibir um aviso quando a medição roda numa worktree e o working tree do checkout principal diverge do que a worktree lê:

1. Resolver `MAIN_CHECKOUT` pela mesma regra do `lib.sh` (`git rev-parse --git-common-dir`).
2. Se a árvore atual não é o checkout principal, comparar o status de cada `docs/fila/NNN-*.md` nas duas (ou simplesmente `git -C "$MAIN_CHECKOUT" status --porcelain -- docs/fila/`).
3. Havendo diferença: imprimir `AVISO: o loop lê <MAIN_CHECKOUT>/docs/fila; N ticket(s) com status diferente do medido aqui` e a lista, antes da contagem. `REAL_PRONTOS` continua sendo impresso, com o aviso junto.

## Critério executável

- Fixture: worktree com o ticket X `pendente` commitado e o checkout principal com X `done` só no disco → a medição na worktree imprime o AVISO com X.
- Sem diferença → nenhum aviso, saída igual à de hoje.

## Evidência

- comarka-operacional `scripts/orquestrador/lib.sh:35`; promoção `41e57cb`; writeback `dff6dc1`.
- `prontos.py` na staging-auto: `REAL_PRONTOS=14`; no checkout principal: `REAL_PRONTOS=0` (29/09, antes do `dff6dc1`).
