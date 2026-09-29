# Defeito do motor: o writeback de status da promoção não é commitado, e o loop despausa com `docs/fila` sujo

Origem: comarka-operacional, promoção staging-auto → main de 27/09. Achado em 29/09. Estado: ABERTO, não implementado.

## O que aconteceu

- 27/09 12:57: o loop foi pausado por `orq-pause.sh` (`docs/fila/.orq-pause`: `2026-09-27 12:57 | promocao staging-auto -> main`).
- 27/09 13:02: a promoção `41e57cb` (`promocao: staging-auto -> main (27/09, 633-677)`) levou para a `main` o código dos tickets 633 a 677.
- O writeback de status (`pendente` → `done`, com `notas_status` "aprovado (tentativa N): …") dos 33 tickets de 656 a 677 ficou **só no working tree do checkout principal**. Nada o commitou. Os 23 tickets de 633 a 655 da mesma promoção tinham `done` commitado.
- As 33 aprovações ficaram 2 dias fora do git. Qualquer `checkout`, `reset` ou `stash` no checkout principal as apagaria. Uma segunda sessão trabalhou nesse checkout nesse intervalo (commits `2e9a315`, `1d7e0b2`, com `pull --rebase`) e as 33 sobreviveram porque nenhum comando dela descartou o working tree, não porque algo as protegesse.
- 29/09: o writeback entrou no commit `dff6dc1` (`chore(fila): writeback de status 656-677 da promocao de 27/09`): 33 arquivos, 66+/66-, só `status` e `notas_status`.

## Por que é do motor

O writeback é escrito pelo motor em `$FILA_DIR`, que é o working tree do checkout principal (`scripts/orquestrador/lib.sh:42` no kit; `:35` no comarka-operacional: `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`). A promoção e a despausa não conferem se esse diretório está limpo no git. Nenhuma das duas etapas falha quando o estado da fila existe só no disco.

## Pedido

1. **Promoção termina com `docs/fila` limpo no git.** O passo que fecha a promoção (ou `orq-pause.sh` ao retomar) roda `git status --porcelain -- docs/fila/` no checkout principal. Se houver ticket modificado, falha e lista os arquivos. Não commita sozinho: commitar o writeback é decisão humana, por pathspec.
2. **O loop não despausa com `docs/fila` modificado.** `orq-pause.sh` (retomar) e `launchd-run.sh`, ao encontrar a pausa removida, recusam seguir se `git status --porcelain -- docs/fila/*.md` não estiver vazio, com a mensagem e a lista.
3. Ignorar o que já é gitignored (`docs/fila/_estado.json`, `docs/fila/runs/`).

## Critério executável

- Fixture: checkout principal com um `docs/fila/NNN-*.md` modificado e a pausa removida → `launchd-run.sh` sai sem pegar ticket, com rc != 0 e o nome do arquivo na saída.
- A mesma fixture com o arquivo commitado → o ciclo segue normal.
- `test-orq-pause.sh` ganha o caso "retomar com `docs/fila` sujo" → recusa.

## Evidência

- comarka-operacional: `41e57cb` (promoção, 27/09 13:02), `dff6dc1` (writeback, 29/09), `scripts/orquestrador/lib.sh:35`.
- Contagem no checkout principal antes do commit: working tree `done 740 · pendente 15`; commitado `done 707 · pendente 48`.
