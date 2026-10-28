# Defeito: a branch alvo local diverge da origin e o loop não percebe

Origem: comarka-operacional, loop apolo, 16/10/2026. Fonte: `docs/historico/projeto-claude/HANDOFF-16out-noite-migrations-tokens.md` daquele repo, linha 4 ("Loop apolo travado por staging-apolo local divergente (merge do 5067 sem push contra ritual das 18:27): reconciliado com merge --no-ff + push (0aa545f)") e linha 23 ("Ritual do apolo rodou com o loop no meio de um ticket: ideia de ticket de harness para o loop resolver divergencia quando o unico commit local e dele"). Achado pela leitura dos handoffs (lote 6, item L6-05, `~/orq-sessoes/leitura-videos/lote-6.md`), registrado na etapa MELHORIAS-0. Estado: **aberto**. Nenhuma mudança de motor foi feita por esta nota.

Só a parte do motor está aqui. O ritual (`ritual-staging.sh`) é script do Comarka, e "o ritual recusa enquanto há ticket em execução" fica lá (`docs/migracao-comarka.md`, linhas do `7464018` e do `457856c`, pedaço 4).

## O que aconteceu

| quando (16/10) | fato | evidência |
|---|---|---|
| 18:27 | o ritual empurrou um merge na `origin/staging-apolo` | HANDOFF-16out-noite-migrations-tokens.md:4 |
| noite | o loop apolo mergeou o 5067 na `staging-apolo` LOCAL, sem push; local e origin divergiram | idem |
| noite | o loop travou até uma sessão reconciliar com `merge --no-ff` e push (`0aa545f`) | idem |
| depois | a sessão anotou: o ritual rodou com o loop no meio de um ticket; o loop devia resolver a divergência quando o único commit local é dele | HANDOFF-16out-noite-migrations-tokens.md:23 |

## Estado no kit (28/10/2026, por leitura, nada executado)

- A branch alvo nasce LOCAL, da branch protegida, sem push (`scripts/orquestrador/lib.sh:851-858`, `ensure_branch_alvo`), e o merge de cada ticket é feito numa worktree local dela (`lib.sh:881-902`, `ensure_staging_worktree`; `scripts/orquestrador/local-loop.sh:70-102`, `merge_em_alvo`). O motor não pusha (D11).
- O loop faz `git fetch origin` a cada disparo (`local-loop.sh:864`), mas nada compara `<alvo>` com `origin/<alvo>` (grep de `origin/$CFG_BRANCH_ALVO` e `origin/$BRANCH_ALVO` em `scripts/` vazio).
- Resultado: quando alguém (humano, ritual, promoção) avança a `origin/<alvo>`, a branch local segue merge após merge sem saber. A divergência só aparece quando um humano tenta publicar, e aí é reconciliação manual, como em 16/10.
- O vizinho é o `4318257` do Comarka (sincronizar o checkout principal com `origin/main`), aberto em `docs/migracao-comarka.md:183`. Ele trata a `main` do checkout principal; este defeito trata a branch alvo.

## Comportamento pedido

1. Depois do `fetch`, antes de drenar, quando `origin/<alvo>` existe, o loop classifica `<alvo>` contra `origin/<alvo>`: igual, atrás, à frente ou divergente.
2. Atrás: `merge --ff-only` na worktree da alvo, com evento na trilha.
3. À frente: nada (o push é humano), só a contagem no STATUS.
4. Divergente com commits locais que são **só** do loop (assunto `orq: frente/<id> (ticket <id>)` e trailer do config): `merge --no-ff origin/<alvo>` na worktree da alvo, sem push, com evento. Conflito: `merge --abort`, nenhum merge de ticket nesta drenagem, aviso de AMBIENTE com os shas.
5. Divergente com qualquer commit local que não é do loop: não mexe, não drena, avisa com os shas.

## Critério executável

- Fixture: repo com `origin` bare. `staging-auto` local recebe um merge do loop (`frente/901`) e a `origin/staging-auto` recebe outro commit por fora. Um disparo do loop com um ticket 902 pendente termina com a `staging-auto` local contendo o commit da origin e os merges de 901 e 902, e a trilha com o evento da reconciliação.
- Vermelho antes: o mesmo fixture contra o motor de hoje mergeia o 902 e deixa a local divergente, sem evento (`git rev-list --left-right --count staging-auto...origin/staging-auto` com os dois lados diferentes de 0).
- Contraprova 1: com um commit local alheio (sem o assunto e o trailer do loop), nenhum merge de ticket acontece e a trilha diz por quê.
- Contraprova 2: sem `origin/staging-auto`, o comportamento é o de hoje.
- Contraprova 3: nenhum `git push` em nenhum caso (o grep de push do `orquestrador-push-suprimido.test.ts` segue verde).
