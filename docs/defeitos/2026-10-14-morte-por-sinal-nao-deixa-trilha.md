# Defeito: morte do executor por SIGPIPE/SIGTERM não deixa EXECUTOR_MORREU, e a causa vira "INICIO"

Origem: conteudos-infinitos, drenagens de 14/10 (tickets 273 e 274). Fonte: `docs/fila/runs/local-loop.log` e `docs/fila/runs/events.log` daquele repo, mais o `launchd.log`. Estado: ABERTO, não implementado. As linhas abaixo são do kit (`scripts/orquestrador/`), e o defeito é o mesmo na cópia instalada.

## O que aconteceu

Foram cinco mortes, todas por interrupção humana (confirmado pelo operador). Nenhuma deixou rastro na trilha:

| hora | ticket | interrupção | rc visto pela drenagem | trilha |
|---|---|---|---|---|
| 12:12:11 | 273 attempt 1 | Ctrl-C na drenagem manual (o `tee` morre) | 141 | só `INICIO attempt=1` |
| 12:12:20 | 274 | idem (o `tee` novo já nasce sem leitor) | 141 | nada |
| 12:35:18 | 273 attempt 2 | Ctrl-C | 141 | só `INICIO attempt=2` |
| 12:35:23 | 274 | idem | 141 | nada |
| 12:45:06 | 273 attempt 3 | `pkill` no `local-loop.sh` (launchd-run: `Terminated: 15`, exit 143) | — | `INICIO` e `PERMISSAO_NEGADA`; o `STATUS.md` congelou em `executando · FASE gates` |

Em nenhuma das cinco aparece `EXECUTOR_MORREU`.

As consequências foram estas:
- As três tentativas do 273 foram consumidas (`tentativas: 3/3`) sem que gate ou juiz rodasse.
- A 3ª tentativa tinha terminado com sucesso (commit e enforcement ok) e morreu na entrada dos gates.
- O 274 acumulou `.sem-progresso 2/3` sem que o agente fosse chamado.

## Causa 1: `registrar_morte` faz `log` antes de `event`

`executor.sh:1587-1594`:

    log "MORTE ... INESPERADA: ..."          # lib.sh:86 -> printf ... >&2
    event "..." EXECUTOR_MORREU "rc=$rc" ...

O stderr do executor é o pipe do `tee` (`local-loop.sh:495`: `run_executor_once --ticket "$prox" 2>&1 | tee "$exe_out"`). Depois de um Ctrl-C ou de um `pkill` do loop, esse `tee` já morreu. O primeiro `printf` do `log` recebe SIGPIPE, e o bash morre ali pela ação padrão do sinal. O `event` e o `status_set` nunca rodam.

Vale para os três caminhos:
- **`trap_sinal` (TERM/INT, `executor.sh:1614`):** a morte por sinal fica sem registro, que é exatamente o caso que a peça 12 quis cobrir.
- **`trap_saida` (EXIT, `executor.sh:1596`):** quando há um rc≠0 comum e o pipe já está quebrado, também fica sem registro.
- **SIGPIPE direto:** não há trap para PIPE (`armar_traps`, `executor.sh:1623-1626`). Qualquer `log` em qualquer fase mata o executor com 141 sem passar por trap nenhum. Foi o caso do 274, que morreu no `cat "$err" >&2` do `preflight_ou_adia`, antes até da linha `preflight:`.

## Causa 2: `sem_progresso_causa` mostra o último evento, mesmo que seja INICIO

`local-loop.sh:209-222` pega o último evento do ticket na trilha. Se ele não for `EXECUTOR_MORREU`, usa `"$ev $campos"` como causa. Sem o evento de morte, o último é o próprio `INICIO`, e o log registrou:

    ticket 273 segue pendente sem cooldown (sem progresso 1/3) ... Causa: INICIO attempt=1 model=sonnet

`INICIO` não é desfecho. Uma volta cuja trilha termina em `INICIO` é, por definição, uma volta que morreu sem desfecho. A regra 5 ("executor saiu rc=N sem desfecho registrado"), que o 274 recebeu, é a frase correta. Ela também deveria trazer o rc e, quando o rc for 128+n, o nome do sinal.

## Proposta (não aplicada)

1. **`event` antes de `log` em `registrar_morte`.** Gravar `EXECUTOR_MORREU` e o `status_set` primeiro, porque escrevem em arquivo e não dependem do pipe. O `log` vem por último e com `|| true`.
2. **Log de morte direto em arquivo.** Em `registrar_morte`, escrever a linha `MORTE ...` também com `>> "$RUNS_BASE/local-loop.log"` (ou no arquivo de log do run), sem passar pelo stderr. Assim a linha sobrevive ao `tee` morto.
3. **Trap PIPE.** Em `armar_traps`, `trap 'trap_sinal PIPE 13' PIPE`, e dentro de `trap_sinal`, desarmar `PIPE` junto (`trap - EXIT TERM INT PIPE`). Com o item 1, uma escrita no pipe quebrado vira `EXECUTOR_MORREU rc=141 sinal=PIPE`, em vez de silêncio. Alternativa mais branda: `trap '' PIPE` no executor. A escrita falha com EPIPE e o processo segue até o desfecho, mas isso deixa o executor terminar um ticket cujo loop já foi interrompido, e é discutível.
4. **`sem_progresso_causa`.** Se o último evento for `INICIO`, ou se não houver evento desta volta, cair na regra 5 com o rc, e para rc>128 anexar o sinal: `executor saiu rc=141 (SIGPIPE) sem desfecho registrado — provável interrupção do loop`.
5. **Fora do escopo desta nota, mas visto junto.** Interrupção humana do loop consome tentativa (`tentativas` sobe no INICIO). Avaliar se `EXECUTOR_MORREU` com `sinal=INT|TERM|PIPE` deveria devolver a tentativa, como o `ADIADO` já faz com a recusa de preflight.

## Critério executável

Molde: `scripts/orquestrador/test-rc-executor.sh`. Fixture com executor falso que:
- **(a)** recebe TERM no meio da fase `gates` com o leitor do pipe já fechado: a trilha tem `EXECUTOR_MORREU rc=143 fase=gates sinal=TERM` e o STATUS sai de `executando`;
- **(b)** escreve no stderr depois que o `tee` morreu: a trilha tem `EXECUTOR_MORREU rc=141 ... sinal=PIPE`;
- **(c)** morre logo após `INICIO`, sem outro evento: a causa no `local-loop.log` não começa por `INICIO` e contém `rc=`.
