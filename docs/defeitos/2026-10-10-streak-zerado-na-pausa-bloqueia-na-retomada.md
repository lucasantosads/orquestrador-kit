# Defeito: streak zerado na pausa faz o 1º ticket depois da retomada virar BLOQUEADO em vez de PAUSADO

Origem: comarka-operacional, ticket 741a, 08/10. Fonte: `~/orq-sessoes/medicao-bloqueios-out.md` §3 (linha 32) e §5. Estado: ABERTO, não implementado. Só existe na linhagem do comarka: o kit não tem streak cross-ticket (`config-tabela.ts:439`, "o motor do kit não tem esse conceito hoje"). Entra aqui para o porte não herdar o defeito.

## O que acontece

- `scripts/orquestrador/lib.sh:500-519` (`gate_streak_pausar`) volta os tickets envolvidos a `pendente`, grava `.orq-pause` e, na última linha, chama `gate_streak_reset` (`:518`). O comentário diz que é para "evitar re-disparo imediato assim que um humano remover o sentinela".
- A medição atribui o zero ao `orq-pause --off`; no código o zero acontece na própria pausa, e o `--off` (`orq-pause.sh:9-10`) só apaga o sentinela. O efeito é o mesmo: a retomada começa com streak 0.
- Retomada com a base ainda vermelha (o conserto estava só na `main`, não na `staging-auto`): o 1º ticket reprova 2x no mesmo gate, o circuit breaker por ticket (`executor.sh:705-723`) dispara, `gate_streak_registrar` conta 1 (< limite 2) e o ticket vai a `bloqueado` com "provável defeito de spec/harness". Só o 2º ticket depois da retomada volta a pausar.
- O streak existe para tirar o código são do bloqueio quando o gate é o culpado (`lib.sh:492-499`, "bloquear código são foi exatamente o dano de 01/09"). A retomada prematura é o caso mais provável de gate ainda quebrado, e é onde a proteção está desligada.

## Trilha real

`docs/fila/runs/local-loop.log` do comarka, 08/10:

    82653 [orq 14:14:22]   GATE STREAK: 'vitest' reprovou 2 tickets seguidos (898,741a) — ... PAUSANDO A FILA.
    82654 [orq 14:14:28] ticket 741a: PAUSADO (gate sistêmico) em vez de bloqueado
    (retomada)
    82701 [orq 14:33:23] === ticket 741a (promessas-avaliar-pura) — tentativa 1 · modo: real ===
    82725 [orq 14:40:06] ticket 741a: motivo de reprova REPETIU — circuit breaker (por ticket)
    82726 [orq 14:40:06] ticket 741a: BLOQUEADO sem gastar a próxima volta
    82794 [orq 14:58:13]   GATE STREAK: 'vitest' reprovou 2 tickets seguidos (741a,707) — ... PAUSANDO A FILA.

Mesma base vermelha (`useAcaoUnica`), conserto em `e202b05` só na `main`. 741a bloqueado por 0,5 h com código são.

## Pedido

1. A pausa não zera o streak: grava em `.gate-streak` uma marca `pausado_em=<ts> gate=<g> sha_alvo=<sha da branch alvo na pausa>`.
2. Na retomada, enquanto a branch alvo estiver no mesmo `sha_alvo`, a 1ª reprova repetida no mesmo gate PAUSA de novo (volta a pendente, nunca bloqueia), com nota `retomada sem mudança na <alvo>: gate '<g>' segue vermelho`.
3. Quando a branch alvo avança (merge novo), o streak zera como hoje.
4. Opcional, barato: `orq-pause.sh --off` avisa se `.gate-streak` tem `sha_alvo` igual ao HEAD da alvo ("a base não mudou desde a pausa").

## Critério executável

Molde: `scripts/orquestrador/test-gate-streak.sh`.
- Streak pausa em (A,B); remove o sentinela sem mudar a branch alvo; ticket C reprova 2x com `gate vitest:` => C vai a `pendente` com nota `retomada sem mudança`, fila pausada de novo, C nunca `bloqueado`.
- Contraprova: mesmo roteiro com um commit novo na branch alvo antes de C => C segue o fluxo atual (streak 1, circuit breaker por ticket bloqueia).
