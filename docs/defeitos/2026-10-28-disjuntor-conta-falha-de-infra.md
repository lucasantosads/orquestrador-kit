# Defeito: o disjuntor de retry conta falha de infra do preflight como "sem progresso do ticket" e bloqueia ticket sadio

Origem: comarka-operacional, tickets 1523, 5281 e 5291, 27 e 28/10/2026. Fonte: `docs/fila/runs/1523/`, `docs/fila/runs/5281/` e `docs/fila/runs/5291/` daquele repo e os commits de status do loop `c9021ac` e `ac8fb76`. Estado: **conserto aplicado no comarka (`c2ae29b`), sem prefixo PORTE-PENDENTE e sem porte no kit**. Nenhuma mudanca de motor foi feita no kit por esta nota.

## O que aconteceu

O login do `claude` CLI expirou. O preflight do executor abortou com "abortando sem consumir tentativa", mas o disjuntor contou cada aborto como falta de progresso e bloqueou o ticket sem o agente ter rodado nenhuma vez.

| quando (28/10, -03) | fato | evidencia |
|---|---|---|
| 11:56 a 12:21 | 3 disparos do loop sobre o 1523, todos abortados no preflight | commits `c9021ac` e `ac8fb76`; `notas_status` do 1523: "preflight: claude CLI nao respondeu (rc=1) ... abortando sem consumir tentativa" |
| 13:33 | causa do rc=1 confirmada: `claude -p` respondeu "Failed to authenticate: OAuth session expired and could not be refreshed" | execucao manual no Mac |
| 13:33 | conserto no comarka e 1523 reaberto | `c2ae29b`, `d5aee3b` |

Os 3 disparos bastam porque `disjuntor_sem_progresso_limite` e 3 em `docs/fila/000-config.json`. Em 5281 e 5291 o gatilho foi outro preflight (origin vazio, ver o defeito `2026-10-28-runner-worktree-gitdir-quebrado.md`) e o resultado foi o mesmo: bloqueio sem tentativa real.

## Causa verificada

No comarka-operacional:

- `scripts/orquestrador/local-loop.sh`, `drenar()`: o ramo "segue pendente sem cooldown" chama `sem_progresso_incrementar` para qualquer saida de erro do executor. So poupa o adiamento por limite da assinatura (529/500/503), que sai antes pelo `mark_adiado`.
- `scripts/orquestrador/executor.sh:899-957`: o preflight termina com `die "preflight: ... abortando sem consumir tentativa"` em varias saidas (sintaxe `:904`, repo errado `:922`, banco errado `:928`, claude CLI `:953`; env faltando `:939` sai sem a frase mas e do mesmo tipo). O texto diz "sem consumir tentativa", o disjuntor ignora o texto.
- Resultado: o contador `runs/<id>/.sem-progresso` sobe a cada disparo e o ticket vira `bloqueado` na 3a vez, sem o agente ter escrito uma linha.
- Reabertura e manual: nao existe resolvedor de bloqueados.

Observacao de linhagem: o motor do comarka nao foi instalado pelo kit (sem `VERSAO`, ver `.claude/rules/motor.md` daquele repo). Caminhos e linhas sao da copia de la. Antes de portar, conferir no kit onde o disjuntor decide e se `docs/defeitos/2026-10-10-streak-confunde-defeitos-de-spec-independentes.md` e as etapas de streak ja cobrem esse caso.

## Comportamento pedido

1. Falha de AMBIENTE no preflight (claude CLI fora, repo errado, banco errado, env faltando, script com erro de sintaxe) nao incrementa o contador, nao bloqueia o ticket e encerra a drenagem da volta (todo ticket bateria no mesmo preflight). O log diz a causa e que nao conta contra o ticket.
2. "bloco json invalido" continua contando: e culpa do ticket.
3. O reconhecimento nao pode depender so de casar texto de log. Se o kit ja tem um codigo de saida ou uma categoria de motivo para infra, usar esse canal em vez de `grep` na mensagem.

## Criterio executavel

- `scripts/orquestrador/test-disjuntor.sh`, caso 5 (comarka `c2ae29b`): com limite 1 no config e o executor simulando `preflight: claude CLI nao respondeu (rc=1) ... abortando sem consumir tentativa`, tres disparos deixam o ticket `pendente`, sem arquivo `.sem-progresso` e com a linha "preflight de infra falhou" no log.
- Vermelho antes: o mesmo caso 5 contra o motor anterior (`c2ae29b^`) falha em "preflight de infra NAO pode bloquear o ticket". O relatorio da etapa deve mostrar essa falha.

## Pendencias de processo

- `c2ae29b` entrou no comarka sem o prefixo `PORTE-PENDENTE:` que `.claude/rules/motor.md` exige. Registrar na tabela "PORTE-PENDENTE abertos no comarka" de `docs/migracao-comarka.md`.
