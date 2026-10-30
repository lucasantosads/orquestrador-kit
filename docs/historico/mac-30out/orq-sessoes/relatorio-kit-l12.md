# Relatório kit L12 · PASSO 0 (leitura)

Worktree `~/Projetos/_worktrees/kit-l12`, branch `kit/l12`, base `c6d9de4`. Nada escrito além deste
arquivo. Nada executado além de leitura (`git show` no Comarka com `GIT_OPTIONAL_LOCKS=0`, `sed`,
`grep`). Linhas do kit são da base `c6d9de4`.

## Achado que muda o pedido

**No kit, "bloco json inválido" NÃO é culpa do ticket da vez.** O laço do preflight varre TODOS os
tickets (`executor.sh:67-69`, `for f in $(ticket_files)`) e morre no primeiro arquivo corrompido. Só
que a drenagem nunca escolhe um ticket corrompido: `proximo_pendente` pula esse arquivo
(`lib.sh:837`, `ticket_corrompido`, ticket 630 do Actus). Resultado: o ADIADO cai no ticket SADIO da
vez, com a causa "bloco json inválido em <OUTRO arquivo>". Hoje:

- com 2 ou mais elegíveis, a causa é igual nos dois e a régua 7a-8 já faz disso AMBIENTE (nada soma);
- com 1 elegível, soma em `adiamentos` do ticket inocente e bloqueia ele no 4º disparo.

O Comarka tem o mesmo laço (`executor.sh:907-908` de lá), então o "segue contando" do `c2ae29b`
também conta contra o ticket errado. A contraprova pedida em P1 ("bloco json inválido continua
somando e bloqueando") testaria e fixaria esse defeito. Precisa de decisão (pergunta 1).

## Tabela: pergunta, resposta, arquivo:linha

| # | pergunta | resposta | arquivo:linha |
|---|---|---|---|
| 1a | o que o `c2ae29b` muda em `drenar` | 10 linhas no ramo "segue pendente sem cooldown", depois do teste de adiado e antes de `sem_progresso_incrementar`: se a saída do executor casa a regex, loga e dá `break` (encerra a drenagem) sem contar | Comarka `local-loop.sh:260-269` (em `c2ae29b`) |
| 1b | como reconhece infra | **por texto**: `grep -Eq '\[orq ERRO\] preflight: (claude CLI\|repo errado\|banco errado\|env faltando\|.* com erro de sintaxe)'` na saída do executor. Fora da regex: bloco json inválido, config não é JSON, e qualquer die novo | Comarka `local-loop.sh:266` |
| 1c | o que o log diz | `disjuntor: preflight de infra falhou (<disjuntor_causa>) - nao conta contra o ticket <id>; encerrando drenagem`. Sem evento na trilha, sem notificação, sem teto | Comarka `local-loop.sh:267` |
| 1d | caso 5 do `test-disjuntor.sh` | ticket 904, limite 1, executor simulado escreve a linha `[orq ERRO] preflight: claude CLI não respondeu (rc=1) — abortando...` e sai rc 1; 3 disparos; espera `pendente`, sem `.sem-progresso`, linha "preflight de infra falhou" no `out.12` | Comarka `test-disjuntor.sh:67-70, 123-130` |
| 2a | quem grava o ADIADO | `preflight_ou_adia` roda `( preflight )` em subshell, guarda o rc, extrai a causa das linhas `[orq ERRO\|ADIA]`, grava `ADIADO motivo=preflight causa=<linha>` no ticket da vez, STATUS ocioso, `exit 0`. O **rc não vai para o evento** (só para o log) | `executor.sh:1937-1958`; evento `:1950`; chamada `:1965` |
| 2b | como a drenagem vê | `run_executor_once` rc 0, ticket segue `pendente`, sem cooldown; `foi_adiado` acha o `ADIADO` nos eventos do ticket desde `ev_antes` | `local-loop.sh:495`, `:567`, `:193-198` |
| 2c | régua AMBIENTE 7a-8 | normaliza a causa e procura a mesma causa em OUTRO id em `causas_vistas`; achou: desfaz `.sem-progresso`, `.adiamentos` e `adiamentos_ambiente`, grava `AMBIENTE`, `break`. Com 1 ticket nunca acha | `local-loop.sh:584-597` |
| 2d | soma em adiamentos | `adiado=1`: entra em `tentados`, `adiados+1`, `contador_incrementar runs/<id>/.adiamentos`; se `n >= adiamentos_limite` (4 se a chave falta), entra em `a_bloquear_ad` | `local-loop.sh:599-616`, limite `:252-257` |
| 2e | fim da drenagem | volta ao topo, `proximo_pendente "$tentados"` vazio, `motivo_ocioso="sem progresso em <id>"`, `break`; aplica `a_bloquear_ad` (status bloqueado, nota `adiado N vezes: preflight: preflight: <causa>` com o prefixo dobrado, commit, `BLOQUEADO motivo=adiamentos`); grava `OCIOSO`; `processados = adiados = 1`, então `deve_notificar` é 0 e sai `notificar_fim` | `local-loop.sh:454-459`, `:650-666`, `:681`, `:695`, `:718`; `causa_real_do_adiado` `:262-275` |
| 2f | N disparos, 1 elegível, claude CLI fora, sem `adiamentos_limite` no config | disparo 1, 2 e 3: `.adiamentos` = 1, 2, 3; ticket pendente; um cartão "Orquestrador CI: 0 aprovados, 0 bloqueados · adiados 1" **a cada disparo**. Disparo 4: `.adiamentos` = 4, `BLOQUEADO motivo=adiamentos n=4 limite=4`, cartão "0 aprovados, 1 bloqueados". Disparo 5 em diante: fila sem processável, um aviso de fila vazia e depois silêncio. Com `start_interval` 900 s, bloqueia cerca de 45 a 60 min depois da queda | idem 2d e 2e; `lib.sh:1300-1316` (`deve_notificar`) |
| 2g | o que não muda nesse caminho | `.sem-progresso` não sobe (ramo `adiado=1`), `adiamentos_ambiente` (teto 3) não sobe (o executor sai antes do `drive_ticket`), nenhuma tentativa consumida | `local-loop.sh:599`, `lib.sh:240-260`, `executor.sh:1965-1968` |
| 3 | os die do preflight | ver tabela abaixo | |
| 3b | já existe canal que separa ambiente de ticket? | **não** no evento: `ADIADO motivo=preflight` é igual para todos, e o rc fica só no log. Existe o **rc do subshell**: die sai 1 (`lib.sh:87`), a sondagem que adia sai **75** (`executor.sh:192`), `set -e` em `git branch` sai com o rc do git. Não há categoria em `decisao.ts` para preflight (as classes de lá são de causa de adiamento do agente, `decisao.ts:97,227`) | `lib.sh:87`, `executor.sh:23,192,1940` |
| 3c | canal mais barato e robusto | o **rc do subshell**, que `preflight_ou_adia` já tem na mão: o único die que não é ambiente (bloco json) passa a sair com um rc próprio (ex.: 65), e `preflight_ou_adia` grava um campo novo no evento, `escopo=ambiente` ou `escopo=fila` (nome a decidir). A drenagem lê o campo, não o texto. Mudança: `executor.sh` (2 a 4 linhas), `local-loop.sh` (o ramo novo), CONTRATO §4 (campo novo do ADIADO). `decisao.ts` não precisa entrar | `executor.sh:68,1940-1950` |
| 4 | depois de um ADIADO de preflight a drenagem segue ou encerra? | **segue** para o próximo não tentado. Com 2 ou mais elegíveis chama o executor de novo, recebe a mesma recusa e só então para em AMBIENTE (2 chamadas por disparo, coberto em `test-ambiente-adiado.sh:85`). Com 1, encerra por falta de candidato, sem AMBIENTE | `local-loop.sh:599-605`, `:454-459` |
| 5a | quem avisa o humano | `transicao_ambiente` + `notificar`: avisa ao ENTRAR em AMBIENTE, cala enquanto dura, avisa uma vez ao SAIR (peça 7b-5, `test-notificacao-ambiente.sh`). Só dispara com `motivo_ocioso=ambiente`, ou seja, nunca no caso de 1 ticket | `lib.sh:1328-1345`, `local-loop.sh:700-712` |
| 5b | painel K12 | alarmes: launchd rc, "mudo", pausa furada, pausa longa, execução longa. **Nenhum alarme de ambiente nem de ADIADO repetido.** Só classifica um `BLOQUEADO motivo=adiamentos` como categoria "ambiente" depois que ele já bloqueou | `orq-painel.py:928-1001`, `:547-548` |
| 5c | resolvedor | tem R5 de ambiente, mas para **bloqueado** já triado: árvore suja (D1) e máquina (D4) reabrem quando a condição some; base vermelha (D5) só avisa. Não há classe "claude CLI fora" nem "preflight" | `resolvedor/r5.ts:1-60`, `resolvedor/decidir.ts:7-9,50-52` |
| 5d | se ambiente deixar de somar, o que impede retentativa silenciosa infinita? | se o conserto **reusar o AMBIENTE da 7a-8** (o preflight de ambiente vira AMBIENTE já no 1º ticket), o aviso de entrada da 7b-5 sai no 1º disparo e o de saída quando o ambiente volta. Não fica silencioso; fica **calado depois do 1º aviso**, por desenho da 7b-5. O custo de cada retentativa é um preflight, e a sondagem é uma chamada `claude -p` curta (`executor.sh:180`), paga pelo orçamento como hoje | `lib.sh:1328-1345` |
| 6 | teto ou alerta | ver "Proposta" abaixo | |
| 7a | nome da etapa | "L12" livre em `docs/PECAS.md` (última é L11, `:1114`; nenhuma ocorrência de L12). Sugestão: **L12 · falha de ambiente no preflight não bloqueia o único elegível (resíduo do comarka c2ae29b)** | `docs/PECAS.md:1114-1124` |
| 7b | CONTRATO | §4: (1) campo novo do `ADIADO` de preflight (`escopo=`), linha `:186`; (2) `AMBIENTE` passa a aceitar **um** id (`tickets=<id>`) e uma origem (`origem=preflight`, ou só documentar), linha `:200` e texto `:232-245`; (3) texto da régua `:267-268`. Ninguém parseia `tickets=` hoje (painel, triador, resolvedor: grep vazio), então um id só não quebra leitor. Seção nova §25 curta para a L12 | `CONTRATO.md:186,200,232-268` |

### Os die do preflight (questão 3)

| die | linha | classe proposta |
|---|---|---|
| `<script> com erro de sintaxe` | `executor.sh:60` | ambiente (instalação) |
| `<config> não é JSON válido` | `:62` | ambiente (config) |
| `worktree.linkar_env` inválido | `:330` (via `:63`) | ambiente (config) |
| `.env*` solto no checkout principal | `:349` (via `:64`) | ambiente (checkout) |
| `campos-do-motor` ausente ou inválido | `:66` | ambiente (instalação) |
| **bloco json inválido em <arquivo>** | `:68` | **fila**: o arquivo é outro, não o da vez (ver achado) |
| árvore de execução suja | `:74` | ambiente |
| lock de git em uso / órfão que não sai | `:95`, `:103` | ambiente |
| repo errado | `:115` | ambiente |
| ambiente errado (é o "banco errado" do Comarka) | `:121` | ambiente |
| env faltando | `:131` | ambiente |
| modelo por papel não definido | `:163` | ambiente (config) |
| o claude recusou o modelo | `:198` | ambiente (config) |
| claude CLI falhou na sondagem (die, rc 1) | `:214` | ambiente |
| sondagem adia (`[orq ADIA]`, `exit 75`): limite remoto com cooldown, ou claude indisponível sem cooldown | `:183-192` | ambiente (a de limite já arma cooldown e não soma) |
| `git branch` de `ensure_branch_alvo` falha (sem die, pelo `set -e`) | `lib.sh:853-858` | ambiente |

Observação: o "OAuth session expired" do 1523 pode cair em `:192` (rc 75, se `sem_envelope` ou
`is_interrompido` reconhecer) ou em `:214` (rc 1). Não verifiquei qual sem uma captura real; nos dois
casos o evento é o mesmo `ADIADO motivo=preflight`, e a proposta trata os dois como ambiente.

Regra resultante: **tudo é ambiente, menos o bloco json**. Por isso o canal mais barato é marcar a
exceção (um rc próprio para o bloco json) e não listar as regras de ambiente; die novo no preflight
nasce ambiente sem ninguém lembrar de atualizar regex.

## Proposta (questão 6)

1. `preflight_ou_adia` grava `escopo=ambiente` (rc 1, 75 ou outro) ou `escopo=fila` (rc do bloco json)
   no `ADIADO motivo=preflight`.
2. Na drenagem, `ADIADO motivo=preflight` com `escopo=ambiente` não soma em `adiamentos`, e entra
   direto no caminho de AMBIENTE da 7a-8 já no 1º ticket: desfaz o que a drenagem somou, grava
   `AMBIENTE tickets=<id> causa=<normalizada>`, `motivo_ocioso=ambiente`, `break`. Ganha de graça:
   aviso de entrada no 1º disparo, silêncio no meio, aviso de saída (7b-5), STATUS "ambiente: ...",
   e 1 chamada do executor por disparo em vez de 2.
3. Alerta: o da 7b-5 como está (entrada e saída). Opcional, se o Lucas quiser: re-aviso a cada N horas
   enquanto o ambiente segue quebrado, pela idade de `runs/.notificacao-ambiente` (mtime), sem
   arquivo novo. Isso mexe na 7b-5 e cabe no teto só se N for constante, não config.
4. Sem teto que bloqueie: bloquear o único ticket não conserta login de CLI; o aviso é o teto.

## Plano das peças (teto de linhas, contando teste)

- **P1 · vermelho** (60): em `test-ambiente-adiado.sh`, caso 4 com fixture própria de 1 elegível
  (o 901, os outros `done`), executor simulado gravando o ADIADO real do `preflight_ou_adia` com
  `escopo=ambiente` e a causa copiada do 1523 do Comarka (`claude CLI não respondeu (rc=1)`, mais a
  variante do kit `:214`). 5 disparos: espera `pendente`, sem `.adiamentos`, um `AMBIENTE` por
  disparo, uma notificação só. Hoje: bloqueia no 4º. Contraprova conforme a pergunta 1. Os casos 1 a
  3 (901 a 903) seguem verdes. Mais um check em `test-preflight.sh` (já sourceia o executor) para o
  campo `escopo=` e o rc do bloco json.
- **P2 · conserto** (60): `executor.sh` (rc do bloco json, campo no evento), `local-loop.sh` (o ramo
  que lê o campo e entra no AMBIENTE com um id). `lib.sh` só se entrar o re-aviso.
- **P3 · docs** (30): `PECAS.md` (L12 em FEITAS), `CONTRATO.md` §4 e §25, linha do `c2ae29b` em
  `docs/migracao-comarka.md:186` passa a portado (equivalente), apontando o canal por rc.

## Perguntas que só o Lucas responde

1. **Bloco json inválido.** No kit o arquivo corrompido nunca é o ticket da vez (achado acima).
   Opções: (a) tratar como `escopo=fila`, que também vira AMBIENTE com a causa nomeando o arquivo e
   não soma em ninguém (recomendo: é um problema da fila inteira, e com 2 elegíveis já é assim hoje);
   (b) manter somando no ticket da vez, como pediu a contraprova da P1 e como faz o Comarka (bloqueia
   um inocente); (c) o preflight pular o arquivo corrompido em vez de recusar o run (muda
   comportamento, maior que o teto). Com (a), a contraprova da P1 vira: o caso de causas diferentes
   (caso 3) segue somando, e o bloco json não bloqueia o único elegível.
2. **Encerrar a drenagem no 1º ADIADO de ambiente** (como o Comarka), em vez de tentar o próximo
   ticket? Recomendo sim: todo ticket bate no mesmo preflight.
3. **Re-aviso** enquanto o ambiente segue quebrado: só entrada e saída (7b-5, como hoje), ou também a
   cada N horas? Se sim, qual N.
4. **Nome do campo**: `escopo=ambiente|fila` no `ADIADO`, ou outro.

## Execução (depois do ok de 28/10/2026)

Decisões aplicadas: (1) bloco json inválido pela opção (a); (2) encerra no 1º ADIADO de preflight;
(3) sem re-aviso, pendência do alarme no painel K12; (4) canal simplificado, sem `escopo=` e sem rc 65.

### Commits

| peça | commit | arquivos | linhas (+/-) | teto |
|---|---|---|---|---|
| P1 vermelho | `9212ab2` | `test-ambiente-adiado.sh`, `test-preflight.sh` | +72 / -3 | 60, **passou** |
| P2 conserto | `9c9aed0` | `local-loop.sh`, `test-ambiente.sh` | +21 / -5 | 60 |
| P3 docs | `77bedbb` | `CONTRATO.md`, `docs/PECAS.md`, `docs/migracao-comarka.md` | +66 / -5 | 30, **passou** |

Nenhum push, nenhum `--no-verify`, nenhum `claude -p`. `executor.sh` não mudou.

Desvios, ditos aqui para não passarem em silêncio:

- P1 e P2 em commits separados, como no plano das peças: o `9212ab2` sozinho deixa
  `test-ambiente-adiado.sh` vermelho (11 checks), e o `9c9aed0` o põe verde. A L11 juntava teste e
  conserto no mesmo commit; se preferir assim, os dois se juntam num squash no merge.
- Escopo ampliado com o seu ok no meio da P2: `test-ambiente.sh` (caso 4, linha 185), que o PASSO 0
  não apontou (falha minha).
- Tetos estourados: P1 em 12 linhas (7 casos pedidos) e P3 em 36 (L12 feita, 3 pendências, §4 em três
  pontos e §25).
- O único travessão em texto novo é a frase do 1523, copiada verbatim do Comarka como fixture
  (`test-ambiente-adiado.sh`, modo `claude1523`). A linha antiga `AMBIENTE: $outro e $prox_id ...`
  aparece no diff da P2 só porque mudou de indentação.

### Grep do começo da P1 (decisão 4)

```
$ awk 'NR>=56&&NR<=216 || NR>=328&&NR<=350' executor.sh | grep -n 'TICKET\|TID\|\$1\|\${1'
rc=1
$ sed -n 853,859p lib.sh | grep -n 'TICKET\|TID'
rc=1
```

`preflight` (`executor.sh:56-138`), `probe_modelos` (`:154-216`), `exigir_linkar_env_valido` (`:328`),
`exigir_principal_sem_env` (`:339`) e `ensure_branch_alvo` (`lib.sh:853-858`) não leem `TICKET`, `TID`
nem argumento; `preflight` é chamado sem argumento (`executor.sh:1940`). A única recusa que olha
ticket é o laço do bloco json (`executor.sh:67-69`), que varre TODOS os arquivos, e o corrompido
nunca é a vez (`lib.sh:837`). Confirmado: o sinal é o próprio `motivo=preflight`. Fica de guarda em
`test-preflight.sh` seção 6 (`declare -f` das cinco funções sem `$TICKET`/`$TID`, e o bloco json do
904 recusando a vez do 901). O regex do guarda foi conferido: pega `"$TICKET"` e `${TID}`, ignora
`$TICKETS_X`.

### Testes que usavam `motivo=preflight` (cuidado 1)

- `test-ambiente-adiado.sh` caso 1: **usa**. Duas asserções mudam, porque a drenagem agora encerra no
  1º ticket: `:85` "no máximo 2 chamadas por disparo" vira "1 chamada por disparo", e `:88`
  `AMBIENTE tickets=901,902` vira `tickets=901`. Normalização da causa (`:89-94`) e STATUS (`:97-99`)
  seguem iguais. CONTRATO §4 (linha do `AMBIENTE` e texto da 7a-8 e da 7b-2) e §25.
- `test-ambiente-adiado.sh` casos 2 (`sessao`) e 3 (`timeout`, `gate_crash`, `servidor`): não usam.
  Sem mudança.
- `test-ambiente.sh` caso 4 (árvore suja, `ADIADO motivo=preflight`): **usa**. `:185`
  `tickets=906,907` vira `tickets=906`; o resto do caso (1 AMBIENTE por disparo, `\n` literal na
  causa, 906 e 907 não bloqueados) segue igual. O caso 1 de lá usa `EXECUTOR_MORREU` (caminho antigo)
  e não muda.
- `test-notificacao-ambiente.sh` caso 1 usa `motivo=preflight` com 3 tickets e segue verde sem
  edição: só conta AMBIENTE e avisos.

### P1 · vermelho (`9212ab2` contra o motor `c6d9de4`)

`bash scripts/orquestrador/test-ambiente-adiado.sh`, rc=1:

```
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  FALHA um disparo chamou o executor 2 vezes
  trilha: 2026-10-28T19:05:18-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  FALHA evento fora do formato
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

== 4. 1 elegível, claude CLI fora (texto do 1523), 5 disparos ==
  --- disparo 6 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 7 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 8 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 9 (claude1523): chamadas [901 ] 901=bloqueado 902=done 903=done
  --- disparo 10 (claude1523): chamadas [] 901=bloqueado 902=done 903=done
  FALHA 901 virou bloqueado
  FALHA algum disparo somou em .adiamentos
  FALHA AMBIENTE: 0 em 5 disparos
  FALHA 5 avisos: 2026-10-28T19:05:23-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 901 BLOQUEADO 19:05:22 (adiado 4 vezes)

== 5. bloco json inválido de outro arquivo, fila de 1 ==
  --- disparo 11 (json): chamadas [901 ] 901=pendente 902=done 903=done
  ok    1 chamada, no 901
  FALHA 901 .adiamentos=1|2026-10-28 19:05:23-0300|2026-10-28 19:05:23-0300
  FALHA sem AMBIENTE do 901
  FALHA STATUS: MOTIVO   sem progresso em 901: 901 adiado

== 6. bloco json inválido de outro arquivo, fila de 2 ==
  --- disparo 12 (json): chamadas [901 902 ] 901=pendente 902=pendente 903=done
  FALHA chamadas: 901 902 
  FALHA 901 .adiamentos=1|2026-10-28 19:05:23-0300|2026-10-28 19:05:23-0300
  ok    902 sem .adiamentos

== 7. sondagem em limite remoto (cooldown armado): sem somar e sem AMBIENTE ==
  --- disparo 13 (limite): chamadas [901 ] 901=pendente 902=done 903=done
  ok    nenhum AMBIENTE
  ok    901 sem .adiamentos
  ok    STATUS diz cooldown

11 CHECK(S) FALHARAM
```

Leitura: caso 1 vermelho nas duas asserções novas; caso 4 bloqueia o 901 no 4º disparo, soma em
`.adiamentos`, 0 AMBIENTE e 5 avisos; casos 5 e 6 somam em `.adiamentos` e não dão AMBIENTE (o 6 chama
901 e 902); caso 7 (limite remoto com cooldown) já verde, como deve ficar.

`test-preflight.sh` seção 6 no `test-shell.sh` do P1 (verde antes, é guarda e não vermelho):

```
== 6 · o preflight não lê o ticket da vez (L12) ==
  ok    nenhuma recusa lê TICKET/TID
  ok    bloco json do 904 recusa a vez do 901 (é da fila, não do ticket)
```

`bash scripts/kit/test-shell.sh` no P1: rc=1, só `rc=1  test-ambiente-adiado.sh`.

### P2 · conserto (`9c9aed0`)

`local-loop.sh:586-611`: `ADIADO motivo=preflight` nos eventos do ticket, sem outro ticket com a mesma
causa, vira `amb_ids=$prox_id` e entra no caminho de AMBIENTE de sempre (desfaz, `AMBIENTE
tickets=<id> causa=<normalizada>`, `motivo_ocioso=ambiente`, `break`). `ambiente_causa` é a causa
crua no caso de preflight (STATUS e aviso nomeiam o arquivo), a normalizada no caso de dois tickets.
Com cooldown ativo o bloco inteiro é pulado (`local-loop.sh:555`, `elif ! cooldown_active`), por isso a
sondagem em limite remoto não muda.

Primeira rodada da bateria com o conserto: `test-shell.sh` rc=1 em `test-ambiente.sh` caso 4
(`FALHA evento fora do formato`, trilha `AMBIENTE tickets=906 causa=...`). Escopo ampliado com seu ok e
asserção trocada (acima).

`bash scripts/orquestrador/test-ambiente-adiado.sh`, rc=0:

```
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    1 chamada por disparo (máx: 1)
  trilha: 2026-10-28T19:10:24-0300 --- AMBIENTE tickets=901 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com o ticket da recusa
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.9ZraEZTnJp/checkout/.git/index.lock (pid 4242, vez do 901, HEAD 43173d0a)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

== 4. 1 elegível, claude CLI fora (texto do 1523), 5 disparos ==
  --- disparo 6 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 7 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 8 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 9 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  --- disparo 10 (claude1523): chamadas [901 ] 901=pendente 902=done 903=done
  ok    901 segue pendente
  ok    nenhum disparo somou em .adiamentos
  ok    um AMBIENTE por disparo
  ok    um aviso só, o de entrada

== 5. bloco json inválido de outro arquivo, fila de 1 ==
  --- disparo 11 (json): chamadas [901 ] 901=pendente 902=done 903=done
  ok    1 chamada, no 901
  ok    901 sem .adiamentos
  ok    AMBIENTE tickets=901
  ok    STATUS nomeia o arquivo corrompido

== 6. bloco json inválido de outro arquivo, fila de 2 ==
  --- disparo 12 (json): chamadas [901 ] 901=pendente 902=pendente 903=done
  ok    encerra no 1º, sem chamar o 902
  ok    901 sem .adiamentos
  ok    902 sem .adiamentos

== 7. sondagem em limite remoto (cooldown armado): sem somar e sem AMBIENTE ==
  --- disparo 13 (limite): chamadas [901 ] 901=pendente 902=done 903=done
  ok    nenhum AMBIENTE
  ok    901 sem .adiamentos
  ok    STATUS diz cooldown

TODOS OS CHECKS PASSARAM
```

Prefixo dobrado "preflight: preflight:": só sai de `causa_real_do_adiado`, chamada só ao montar
`a_bloquear_ad` (`local-loop.sh:625`), que só recebe ADIADO que somou. Desde a P2 o ADIADO de
preflight nunca soma: inalcançável, registrado como moot em PECAS.

### P3 · docs (`77bedbb`)

PECAS: L12 em FEITAS; pendentes "preflight pular o ticket corrompido", "alarme de ambiente prolongado no
painel K12" e "prefixo dobrado (moot)". CONTRATO: linha do `AMBIENTE` (§4), parágrafo da L12 depois da
7a-8, texto da régua na 7b-2, nota de inalcançável no `motivo=adiamentos`, §25 nova. migração: linha
do `c2ae29b` como "portado por outro canal".

### Fechamento (em `77bedbb`)

```
$ npx tsc --noEmit
rc=0
$ TZ=UTC node_modules/.bin/vitest run
 Test Files  119 passed (119)
      Tests  1870 passed (1870)
   Duration  63.41s (transform 1.55s, setup 0ms, collect 21.65s, tests 495.87s, environment 15ms, prepare 5.48s)
rc=0
$ bash scripts/kit/test-shell.sh
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
  rc=0  test-gate-prevoo.sh
  rc=0  test-tentativas-persistidas.sh
  rc=0  test-orq-pause.sh
  rc=0  test-preflight.sh
  rc=0  test-diff-lines.sh
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-gate-instavel.sh
  rc=0  test-instavel-recorrente.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
$ bash scripts/kit/test-instalar.sh
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```
