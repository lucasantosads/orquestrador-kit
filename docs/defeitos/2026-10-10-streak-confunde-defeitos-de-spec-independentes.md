# Defeito: streak cross-ticket confunde dois defeitos de spec independentes com falha sistêmica

Origem: comarka-operacional, tickets 762 e 851, 05/10. Fonte: `~/orq-sessoes/medicao-bloqueios-out.md` §3 (pausas, linha 851) e §5. Estado: ABERTO, não implementado. Só existe na linhagem do comarka (o kit não tem streak); entra aqui para o porte não herdar o defeito.

## O que acontece

- A chave do streak é só o rótulo do gate: `extrai_gate_motivo` (`scripts/orquestrador/lib.sh:657-665`) reduz o motivo a `tsc | vitest | build | criterio`, e `gate_streak_registrar` (`lib.sh:459-490`) conta tickets distintos com o mesmo rótulo.
- Dois tickets seguidos com vermelho de vitest em arquivos e causas sem relação contam como "o gate está quebrado".
- O efeito colateral piora: `gate_streak_pausar` (`lib.sh:507-512`) volta TODOS os envolvidos a `pendente`, inclusive o que o circuit breaker já tinha bloqueado com razão. 762 foi desbloqueado sem conserto e reprovou de novo às 21:26.
- Custo medido: 19,8 h de fila parada por um "gate sistêmico" que não existia.

## Trilha real

`docs/fila/runs/local-loop.log` do comarka, 05/10:

    72651 ticket 762: reprovado — retry 1/2. motivo: gate vitest: suíte vermelha (ver .../762/attempt-1/gate-vitest.txt)
    72665 [orq 18:20:36] ticket 762: BLOQUEADO sem gastar a próxima volta
    72711 ticket 851: reprovado — retry 1/2. motivo: gate vitest: suíte vermelha (ver .../851/attempt-1/gate-vitest.txt)
    72722 [orq 18:35:39]   GATE STREAK: 'vitest' reprovou 2 tickets seguidos (762,851) — suspeito é o gate, não o código. PAUSANDO A FILA.
    72840 [orq 21:26:17] ticket 762: reprovado — retry 1/2. motivo: criterio[5] mecânico: ...

- 762: teste novo exigia `src/middleware.ts`, fora da allowlist (spec_allowlist; `runs/762/attempt-1.prev1/gate-vitest.txt:1583`).
- 851: spec mandava selecionar `valor_mensal`, proibido por `test/c0-guard.test.ts` (spec_criterio).
- Arquivos vermelhos diferentes, ambos dentro do que o ticket tocou. Nada em comum além do rótulo `vitest`.

## Pedido

Falha sistêmica é vermelho que o ticket não causou. O streak só acumula quando a assinatura bate E o vermelho está fora do diff:
1. Assinatura do vitest = conjunto de arquivos de teste vermelhos (linhas `FAIL`/`❯ test/<arq>` do `gate-vitest.txt`, ANSI removido). Para tsc, arquivos com `error TS`. Gravar em `.gate-streak` junto com o rótulo.
2. Conta para o streak só se (a) a assinatura tem interseção com a do ticket anterior E (b) pelo menos um arquivo vermelho não está no diff do ticket nem é teste que importa arquivo do diff (o mínimo: não está em `diff.stat`).
3. Vermelho todo dentro do diff do ticket => é do ticket: não acumula, segue o circuit breaker por ticket.
4. A pausa não desbloqueia ticket que o circuit breaker bloqueou com vermelho dentro do próprio diff.

## Critério executável

Molde: `scripts/orquestrador/test-gate-streak.sh` com fixtures de `gate-vitest.txt` e `diff.stat`.
- A vermelho em `test/a.test.ts` (no diff de A), B vermelho em `test/b.test.ts` (no diff de B) => sem pausa; A e B `bloqueado`.
- Contraprova: A e B vermelhos em `test/c0-guard.test.ts`, fora dos dois diffs => pausa, ambos `pendente`.
