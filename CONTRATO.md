# CONTRATO — o que o motor faz, hoje

> **Descritivo, não aspiracional.** Cada afirmação deste arquivo foi conferida
> por `grep` no código deste kit, e a linha da conferência está entre
> parênteses. Onde o desejado difere do feito, a diferença está em
> **Divergências conhecidas** (§10), com a peça de `docs/PECAS.md` que a fecha —
> nunca "corrigida" aqui na prosa. Contrato que descreve o que se gostaria que o
> código fizesse é pior que contrato nenhum: ele faz alguém confiar no que não
> existe.
>
> Versão do kit: ver `VERSAO`. Escopo: `scripts/orquestrador/**`, `scripts/orq`,
> `scripts/roadmap/**` e `doutrina/**` — o MOTOR. O que é do repo instalado está
> marcado como tal em cada seção.

---

## 1. Layout de arquivos

### 1.1 O que é MOTOR (vendorizado pelo kit, idêntico em todo repo)

O mapa origem→destino é um só, e três lugares o executam: `instalar.sh`
(`comparar_tudo`/`atualizar`), `scripts/kit/fixture.sh` (bloco "3. o motor,
vendorizado") e `ORIGEM.md`.

| No kit | No repo instalado |
|---|---|
| `scripts/orquestrador/` | `scripts/orquestrador/` (sem o `*.plist` instanciado) |
| `scripts/orq` | `scripts/orq` |
| `scripts/roadmap/` | `scripts/roadmap/` |
| `doutrina/` | `docs/orquestrador/skill/` |
| `VERSAO` | `docs/orquestrador/skill/VERSAO` (carimbo) |
| a lista de `scripts/kit/vendorizado.sh` | os mesmos caminhos em `test/` |

`scripts/roadmap/` é motor porque `orq mapa lint` roda
`python3 scripts/roadmap/lint-mapa.py` a partir do `MAIN_CHECKOUT`
(`scripts/orq:226`). O `*.plist` instanciado NÃO é motor: é artefato de uma
máquina, e o nome dele varia por repo (é o `launchd.label` do config), então a
regra de exclusão é por sufixo — `*.plist` que não seja `*.plist.template`.

### 1.2 O que é DO REPO (o kit lê, nunca sobrescreve)

```
docs/fila/
  000-config.json          fonte única de config (§8)
  <NNN>[a]-<slug>.md       um ticket por arquivo (§2)
  _TEMPLATE.md             cópia de doutrina/templates/TICKET.md
  liberacoes.json          tokens humanos (§6)
  decisoes-pendentes.md    decisões para humano (cfg .decisoes_file)
  PAUSAR                   kill switch (§7); legado: .orq-pause
  runs/                    evidência, NÃO versionada (§4, §5)
docs/orquestrador/
  PLAYBOOK.md              memória do loop naquele repo
  skill/                   a doutrina vendorizada (motor)
```

`instalar.sh --atualizar` não toca `docs/fila/**` em caso nenhum — nem ticket,
nem config, nem `liberacoes.json`, nem o `PAUSAR`. Migração de artefato legado é
a peça K8b.

### 1.3 `runs/` — tudo o que o motor escreve lá

`RUNS_BASE = MAIN_CHECKOUT/<cfg .runs_dir>` (`lib.sh:72`), e por contrato o
diretório se ignora no git (`runs/.gitignore`: `*`). Evidência de run é efêmera:
se ela sujar a árvore, o preflight do run SEGUINTE morre.

| Caminho | O que é |
|---|---|
| `STATUS.md` | snapshot, sobrescrito (§3) |
| `.status.json` | estado entre chamadas; o `.md` é derivado dele |
| `events.log` | a trilha, append-only (§4) |
| `custo.json` | ledger de custo (§5); caminho vem de `cfg .orcamento.custo_file` |
| `<id>/meta.json` | array de tentativas daquele ticket (§5.2) |
| `<id>/attempt-N/` | evidência de UMA tentativa (§5.3) |
| `<id>/.sem-progresso` | contador persistente de disparos sem progresso, `N\|primeira\|ultima` (peça 7a-3, §4.1 `BLOQUEADO`) |
| `.local-loop.lock` | lock da drenagem (pid + idade) |
| `.cooldown-until` | adiamento por limite (`lib.sh:567`) |
| `.notificacao-fila-vazia` | marca de notificação já emitida |
| `local-loop.log`, `launchd.log`, `launchd-agent.log` | logs verbosos |
| `notificacoes.log` | canal `arquivo` (§8, `canal_notificacao`) |
| `probe-falha-*` | saída da sondagem de modelo que falhou |

---

## 2. Ticket

Um arquivo `.md` por ticket em `docs/fila/`, nomeado `<id>-<slug>.md`. A **fonte
de verdade de máquina** é o PRIMEIRO bloco ```json``` do arquivo; a prosa é para
humanos e a automação a ignora, e isso inclui QUALQUER outro bloco ```json do
arquivo — um exemplo de payload no meio do texto é prosa, não ticket. Schema em
`schemas/ticket.schema.json`.

Os três leitores concordam, e a cerca é comparada sem o espaço em volta nos
três: `gate-ticket.ts:blocoJson` (`:99`), `fila-read.ts:extractJsonBlock` e
`lib.sh:ticket_json` (`:86`). `ticket_set` reescreve SÓ o primeiro bloco.

O que o gate cobra hoje (`scripts/orquestrador/gate-ticket.ts`):

- `id` casa `^\d{3}[a-z0-9]*$` (`RE_ID`, `gate-ticket.ts:76`) **e** é igual ao
  prefixo do nome do arquivo. O sufixo existe: `001a`, `309a`, e o de fatiamento
  `407a0`, `315b1b` (etapa 7d-1b; regra `3`, aviso, §12).
- `status` ∈ `pendente · em_execucao · done · bloqueado · obsoleto · refatiar`
  (`STATUS_VALIDOS`, `:28`).
- Campos obrigatórios **só para `pendente`** (`CAMPOS_PENDENTE`, `:58`): `id`,
  `slug`, `objetivo`, `pathspec_allowlist`, `dependencias`,
  `criterios_aceite`, `status`. `bloco` e `risco` são opcionais desde a etapa
  7d-1b; `criterios_aceite` ausente ou vazio é a regra `2c` (aviso, §12). Status terminal (`done`, `obsoleto`,
  `bloqueado`) só precisa parsear: a fila tem dezenas escritos sob schemas
  anteriores, e cobrar campo de quem já entregou não é gate, é ruído.
- `dependencias` basta ser lista — `[]` é o caso NORMAL. Cada item é `id` de
  outro ticket (resolve quando `done`) ou `humano:<token>` (§6).
- `risco` é opcional; se tiver valor, ∈ `baixo · alto` (vazio até o passo 6
  do gate classificar).
- `criterios_aceite[].tipo`, quando presente, ∈ `alvo · guarda · avaliador`
  (`TIPOS_CRITERIO`); ausente, é inferido (`espera: "avaliador"` = avaliador, o
  resto = alvo). `cmd` pode ser vazio só no critério `espera: "avaliador"`, que o
  executor não roda.
- `criterios_aceite[].cmd` só com prefixo de `gate_ticket.cmd_prefixos_permitidos`
  e sem nada de `gate_ticket.proibido_no_cmd`.
- Allowlist sobreposta entre dois `pendente` pede dependência entre eles,
  direta ou transitiva (regra `8`, aviso desde a etapa 7d-1b, §12).
- Cada regra tem severidade `erro`, `aviso` ou `off` (tabela `REGRAS`,
  `gate-ticket.ts:105`, sobrescrevível por `gate_ticket.severidade`); o rc do
  gate, e o pré-voo em modo `bloqueia`, só contam `erro` (§12).

---

## 3. `runs/STATUS.md` — o snapshot

**Sobrescrito a cada transição, nunca append.** Se crescer, está errado.
Renderizado por `status_render` (`lib.sh`), a partir de `.status.json`.

```
ORQUESTRADOR · 2026-09-08 11:54:33
ESTADO   executando
TICKET   001 soma-de-negativos · tentativa 1/3
DESDE    11:54:03 (12min) · timeout em 18min
FASE     claude -p
FILA     3 pendentes · 5 bloqueados · 41 done
STAGING  c5ba050e · push suprimido
ÚLTIMO   056 APROVADO 15:13:58 (487s)
MOTIVO   sem ticket processável
```

- As chaves que `status_set` aceita são exatamente sete: `estado`, `ticket`,
  `desde`, `desde_epoch`, `fase`, `ultimo`, `motivo` (`lib.sh:287`). Qualquer
  outra é ignorada com aviso no log.
- `FILA` e `STAGING` **não** são chaves: são relidos do disco e do git a cada
  render. Snapshot com placar velho é pior que snapshot sem placar.
- `ESTADO` ∈ `executando · ocioso · encerrado`. Em `ocioso` e `encerrado`,
  `TICKET` e `FASE` viram `—` na renderização, mesmo que o estado guardado diga
  outra coisa — campo preenchido ali é estado velho lido como atual.
- `MOTIVO` só aparece quando `ESTADO` != `executando`.
- `DESDE` ganha `(Nmin) · timeout em Nmin` só em `executando`, usando
  `claude_timeout_secs`.
- **Na LEITURA** (`orq`, `cmd_status`), `executando` com `DESDE` além do
  `claude_timeout_secs` é reescrito como `MORTO há <dur>`: o processo não existe
  mais. O `orq` não corrige o arquivo — ele é read-only.

---

## 4. `runs/events.log` — a trilha

Uma linha por transição, append-only. É o artefato que se cola num chat.

**Formato** (`event()`, `lib.sh:252`):
`<ISO8601 com offset> <id> <EVENTO> [chave=valor ...]`

O `id` é `—` quando não há ticket e `---` nos eventos de drenagem. Toda a linha
passa por `uma_linha`: um evento que carregue comando com quebra não pode
quebrar a trilha.

### 4.1 Vocabulário FECHADO de eventos

Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):

| Evento | Onde | Campos que carrega |
|---|---|---|
| `DRENAGEM_INICIO` | `local-loop.sh:129,241` | `alvo=` `processaveis=` · ou `motivo=pausado` |
| `DRENAGEM_FIM` | `local-loop.sh:drenar,main_local_loop` | `aprovados=` `bloqueados=` `adiados=` `refatiar=` `sem_progresso=` `dur=` · ou, na pausa, `aprovados=` `bloqueados=` `adiados=` `dur=` `motivo=pausado` |
| `INICIO` | `executor.sh:1032` | `attempt=` `model=` |
| `WORKTREE` | `executor.sh:1026` | `modo=reaproveitada` `de=` `base=` |
| `GATE` | `executor.sh:539` | ver §4.2 |
| `JUIZ` | `executor.sh:615,623` | `veredito=aprovado\|reprovado\|ilegivel` `classe=` `modelo=` `attempt=` |
| `APROVADO` | `executor.sh:1048` | `merge=aguardando` `dur=` `attempt=` |
| `REPROVADO` | `executor.sh:drive_ticket` | `motivo=` `sub=` `attempt=` `diff=` (`sub=` desde a 7b-4) |
| `ADIADO` | `executor.sh:drive_ticket`, `executor.sh:preflight_ou_adia` | `motivo=` `attempt=` `rc=` `dur=` `cooldown=sim\|nao` · recusa de preflight: `motivo=preflight` `causa=<uma linha>` (a causa vai até o fim da linha) |
| `BLOQUEADO` | `executor.sh:drive_ticket`, `local-loop.sh:drenar` | `motivo=` [`attempt=`] · repetição: `motivo=repeticao` `sub=` `diff=` `attempt=` · da drenagem: `motivo=merge_falhou`, `motivo=sem_progresso` `n=` `limite=`, ou `motivo=adiamentos` `n=` `limite=` · porte do Actus (§11): `motivo=gate_ticket` `violacoes=`, `motivo=retry_sem_mudanca` `attempt=` `sha256=`, `motivo=base_vermelha` `arquivos=` `attempt=`, `motivo=teto-adiamento-ambiente` `adiamentos=` `attempt=` |
| `RETRY` | `executor.sh:drive_ticket` | `attempt=` `model=` `motivo=` `sub=` `worktree=` |
| `REFATIAR` | `executor.sh:896` | `motivo=` `arquivos=` |
| `MERGE` | `local-loop.sh:173` | `alvo=` `sha=` |
| `RECUPERADO` | `executor.sh:reconcile_merged`, `local-loop.sh:55`, `launchd-run.sh:102`, `lib.sh:reabertura_humana` | `motivo=ja-mergeado\|lock-orfao\|status-congelado` · devolução humana: `motivo=reaberto` `de=bloqueado` (7b-8) |
| `EXECUTOR_MORREU` | `executor.sh:1136` | `rc=` `fase=` [`sinal=`] |
| `ORCAMENTO` | `lib.sh:954` | `escopo=` `adiado_ate=` `consumo=` |
| `COMMIT_HARNESS` | `executor.sh:commit_do_agente` | `motivo=agente-saiu-sem-commitar` · ou `motivo=agente-commitou-e-deixou-N-arquivo(s)-solto(s)` / `motivo=agente-commitou-e-deixou-mudança-não-commitada` (631, §11) |
| `DECISAO_PENDENTE` | `lib.sh:744` | `origem=` |
| `ANOTACAO` | `lib.sh:274` | `nota=` |
| `GATE_TICKET_AVISO` | `executor.sh:drive_ticket` (porte do Actus, §11) | `violacoes=<N>` `hash=<12 hex>` — o pré-voo achou violação e `gate_ticket.modo_pre_voo` é `aviso`: o ticket SEGUE. Uma vez por ticket e por versão (`hash` do bloco JSON sem `status`, `notas_status`, `tentativas`, `adiamentos_ambiente`, `adiado_ate`; etapa 7d-1b, §12) |
| `PREVOO_NOGO` | `local-loop.sh:prevoo_ou_sai` | `item=cat.0\|cat.1\|cat.6` |
| `OCIOSO` | `local-loop.sh:drenar` (peça 7a-4) | `pendentes=` e um `<id>=<razão>` por pendente; ver abaixo |
| `AMBIENTE` | `local-loop.sh:drenar` (peça 7a-8) | `tickets=<id>,<id>` `causa=<normalizada>` (a causa vai até o fim da linha); ver abaixo |
| `AMBIENTE_ADIAMENTO_DESFEITO` | `local-loop.sh:adiamentos_ambiente_desfazer` (porte-actus j2) | `adiamentos_ambiente=<antes>-><depois>` — a drenagem terminou em `AMBIENTE` e o `adiamentos_ambiente` que o executor somou no ticket nesta drenagem volta ao valor de antes (commitado); um por ticket ainda pendente cujo valor mudou |
| `EDICAO_ALHEIA` | `lib.sh:_aviso_edicao_alheia`, chamada por `commit_motor` (ticket_commit e autocommit; etapa 8b, §19) | `arquivo=<nome do ticket>` `campos=<chave>,…\|prosa\|nao_rastreado` `hash=<12 hex>` — o ticket tinha edição que não é do motor; o commit do loop levou só as chaves do motor e a edição ficou no working tree. Uma vez por edição (`hash` do ticket sem os campos do motor) |
| `VIZINHO_BASE` | `executor.sh:run_attempt`, seção 7a (etapa 8c, §21) | `resultado=verde\|vermelho\|inconclusivo` `testes=<arquivo>,…` — o FAIL só em teste vizinho foi rodado na árvore do `base_ticket` antes de ampliar; só `verde` amplia |
| `VIZINHO_AMPLIADO` | `executor.sh:drive_ticket` (etapa 8c, §21) | `testes=<arquivo>,…` `hash=<12 hex>` `attempt=<N>` — a tentativa N reprovou só em teste vizinho e as seguintes, até o fim do drive, podem editá-lo. Uma vez por versão do ticket (o `hash` é o do `GATE_TICKET_AVISO`, `lib.sh:ticket_versao`); gravado só quando há tentativa para usar |
| `PAUSA` | `lib.sh:pausa_registrar`, chamada por `orq pausar`, pelo `orq-pause.sh` (514, §11) e pelo painel (peças K12-C, K12-F) | `motivo=<token>` `por=terminal\|painel` |
| `RETOMADA` | `lib.sh:retomada_registrar`, chamada por `orq retomar` e pelo painel (peças K12-C, K12-F) | `por=terminal\|painel` `dur=<N>min` |

`motivo=` é sempre token curto e estável (grepável), nunca frase.

**`DRENAGEM_FIM sem_progresso=`** (peça 7a-2) conta as voltas em que o ticket
seguiu `pendente` sem cooldown. Até a 7a-2 a primeira delas ENCERRAVA a
drenagem; agora o id entra numa memória da drenagem (`proximo_pendente
"<ids>"` o pula) e ela segue para o próximo não tentado, até não sobrar
processável fora da memória. O `MOTIVO` do STATUS lista todos os pulados
(`sem progresso em 901 902`).

**`BLOQUEADO motivo=sem_progresso n=<N> limite=<L>`** (peça 7a-3): a mesma
volta sem progresso soma em `runs/<id>/.sem-progresso`, que PERSISTE entre
disparos. No limite (`sem_progresso_limite`, §8) o ticket vai para
`bloqueado` pelo `ticket_set` + `ticket_commit` (commitado, nunca só no
disco), com `notas_status` = `sem_progresso: <N> disparos sem progresso entre
<primeira> e <ultima>; última causa: <causa>`. A causa é o DESFECHO do
executor na trilha (`EXECUTOR_MORREU` vira `executor morreu (rc=, fase=)` mais
a linha `[orq ERRO]`/`fatal:` da saída); sem desfecho, a nota nova, e só por
último a linha com `ERRO|fatal|FAIL`. Não conta: adiamento (com cooldown, ou
com `ADIADO`/nota `adiado` sem cooldown). Zera: o ticket sair de `pendente`, ou
a branch alvo avançar na vez dele. Desde a peça 7a-8 o bloqueio acontece no FIM
da drenagem, e só se ela não terminar em `AMBIENTE`.

**`AMBIENTE tickets=<id>,<id> causa=<normalizada>`** (peça 7a-8). Antes de somar,
a causa da volta sem progresso é NORMALIZADA (`local-loop.sh:causa_normalizada`):
caminhos viram `<caminho>`, o id do ticket vira `<id>`, shas viram `<sha>` e
números viram `<n>`. Se a mesma causa normalizada já apareceu nesta drenagem
para OUTRO ticket, o problema não é de ticket, é de ambiente (recusa de
preflight, lock de git, identidade): nenhum contador soma nesta drenagem (o que
já tinha somado volta ao valor anterior), nenhum bloqueio pendente vale, a
trilha ganha UM `AMBIENTE` com os dois tickets que colidiram, a drenagem para
com `motivo_ocioso=ambiente` e o `MOTIVO` do STATUS é `ambiente: <causa>`. Não
sai `OCIOSO` nesse fim. No máximo 2 chamadas ao executor por disparo com o
ambiente quebrado. Um ticket isolado com causa própria segue a regra de cima.

```
--- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
```

**`ADIADO`: causa, medida e cooldown** (peça 7b-2). O `motivo=` do adiado é a
causa de infra do `decisao.ts`: `conexao`, `sessao`, `rate_limit`, `quota`,
`servidor` (5xx, overloaded; até a 7b-2 era `rate_limit`), `timeout`,
`gate_interrompido` (morto por fora: rc 129/130, ou rc 124 bem abaixo do teto,
peça 7b-3), `gate_crash` (o runner do gate não rodou: rc 126/127, command not
found, ENOENT do binário, Missing script, saída vazia; no papel testes, também
sem placar e sem teste falhando) e `juiz_ilegivel`. `rc=` e `dur=` são a
MEDIDA da chamada do agente. `cooldown=sim` só para `rate_limit` e `quota`;
todo o resto adia sem cooldown e o próximo disparo retoma sem espera.

```
901 ADIADO motivo=timeout attempt=1 rc=124 dur=1802s cooldown=nao
901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=40s cooldown=nao
901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /x/repo — commite ou stashe antes:\n?? lixo.txt
```

`motivo=preflight` substitui o `EXECUTOR_MORREU rc=1 fase=?` de id `—` que a
recusa de preflight gravava até a 7b-2: o evento sai no ticket da vez, o
executor sai 0, e nenhum ticket é TOCADO (nem nota nem commit). A régua de
AMBIENTE (7a-8) vale sobre todo ADIADO sem cooldown, `preflight` incluído: a
mesma causa normalizada em dois tickets na mesma drenagem é `AMBIENTE`.

**`REPROVADO sub=`** (peça 7b-4): qual mérito reprovou, na ordem em que o
pipeline para: `gate_<papel>` (`typecheck`, `testes`, `build`, `lint`), `juiz`,
`criterio`, `exit`. `motivo=` segue `criterio_qualidade` para todos. O RETRY
repete o `sub=`, e só `sub=juiz` escala modelo (§8). Permissão negada com
critério vermelho é `sub=criterio`: mérito, sem escalar.

```
461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
461 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
```

**`BLOQUEADO motivo=repeticao sub= diff=`** (peça 7b-4): a reprovação que
repete a anterior do MESMO ticket (mesmo sub, mesmo `diff=`) bloqueia na hora,
sem 3ª volta, com `notas_status` = `repetição: 2ª reprovação igual à anterior
(sub=, diff=), sem 3ª volta. <motivo>`. A anterior é a última `REPROVADO` do
ticket na trilha, de qualquer drenagem, desde que nada tenha encerrado a série
(APROVADO, MERGE, BLOQUEADO, REFATIAR, RECUPERADO; ADIADO não encerra). Linha de
antes da 7b-4, sem `sub=`, tem o sub derivado do `GATE`/`JUIZ` da mesma
tentativa (`criterios=3/4` com os gates ok = `criterio`).

**`BLOQUEADO motivo=adiamentos n=<N> limite=<L>`** (peça 7b-3): o ADIADO sem
cooldown soma em `runs/<id>/.adiamentos`, que persiste entre disparos. No limite
(`adiamentos_limite`, §8) o ticket vai para `bloqueado` no fim da drenagem, pelo
`ticket_commit`, com `notas_status` = `adiado <N> vezes: <causa real>`. A causa
real é a MEDIDA do último ADIADO: `<motivo> (rc=<rc>, <dur> de execução)`, ou
`preflight: <causa>`; um rc 124 de 9 s nunca vira "timeout". Adiado COM
cooldown não conta nem zera; sair de `pendente` ou a branch alvo avançar zera;
drenagem que termina em `AMBIENTE` desfaz o que somou.

**Tentativas no ticket** (peça 7b-4): o contador de retry é o campo
`tentativas` do ticket, e não mais um `attempt=0` por chamada. O executor grava
`tentativas+1` (com commit) antes de cada tentativa e devolve o valor quando o
desfecho não é reprovação; a drenagem zera ao mergear. `max_retries` vale no
TOTAL do ticket, não por drenagem, e o `attempt=` da trilha continua de onde
parou.

**Devolução humana zera os contadores** (peça 7b-8). Um ticket `bloqueado` que um
humano devolve para `pendente` (status editado e commitado) volta a rodar com
`tentativas`, `runs/<id>/.sem-progresso` e `runs/<id>/.adiamentos` zerados. A
regra (`decisao.ts:reabertoDeBloqueado`): status `pendente` e o último desfecho
do ticket na trilha é `BLOQUEADO`, porque o loop nunca tira um ticket de
bloqueado. O zero de `tentativas` passa pelo `ticket_commit`, e a trilha ganha
`RECUPERADO motivo=reaberto de=bloqueado`, que também impede zerar duas vezes.
Roda na drenagem antes de chamar o executor (vale mesmo com o preflight
recusando) e no executor antes de ler `tentativas`. Toda gravação de
`tentativas` é commitada (`executor.sh:drive_ticket`, antes de cada tentativa e
no commit de cada desfecho): a árvore de `docs/fila` fica limpa entre uma
tentativa e outra. Devolução de `refatiar` não está coberta.

**Notificação de AMBIENTE** (peça 7b-5): avisa quando a drenagem ENTRA em
`AMBIENTE`, cala nas seguintes que terminam no mesmo estado, e a primeira que
sai manda UM aviso de saída, com o placar, no lugar do cartão de fim. A memória
é `runs/.notificacao-ambiente`, como a da fila vazia; pausa não conta como
saída.

**`OCIOSO`** (peça 7a-4) sai UMA vez por drenagem, logo antes do
`DRENAGEM_FIM`, quando ela termina sem nenhum pendente processável e há ao menos
um pendente. Não sai em pausa (quem pausou já sabe) nem com a fila sem
pendente. Uma linha só, como todo evento; cada pendente vira um campo
`<id>=<razão>`, e a razão é, nesta precedência:

```
--- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
```

- `dependencia:<id>:<status>` (ou `:inexistente`), `liberacao:<token>` e
  `adiado_ate:<AAAA-MM-DD>` vêm de `razao_nao_processavel` (`lib.sh`), a mesma
  régua do `deps_resolvidas`: "por que não roda" e "roda ou não roda" não
  divergem. A razão estrutural vence as de baixo, que passam sozinhas;
- `sem_progresso` / `adiado`: liberado, mas pulado nesta drenagem (peça 7a-2);
- `cooldown:<HH:MM>`: liberado, mas o cooldown global vale até essa hora.

O `MOTIVO` do STATUS repete a razão em texto (`244 espera 241b (bloqueado) ·
231 sem liberação humano:migration-0031`), cortado em 6 com "e mais N".

**`PAUSA` e `RETOMADA`: a pausa na trilha** (peças K12-C e K12-F, "pausa na
trilha" da etapa 7). Dois emissores, uma régua: `orq pausar`/`orq retomar`
(`por=terminal`) e os botões do painel (`por=painel`) chamam as MESMAS funções
do `lib.sh`. Pausar cria o `pausar_file` (§7) com `<AAAA-MM-DD HH:MM> | <motivo
livre>` e grava `PAUSA motivo=<token> por=<quem>` (`pausa_registrar`), onde o
token é o motivo livre sem acento, em minúsculas, com `-` no lugar do resto, até
40 caracteres (`manual` se vazio; `pausa_token`, byte a byte); o texto inteiro
fica no arquivo. Retomar lê o início da pausa ANTES de apagar o arquivo
(`pausa_inicio_epoch`), apaga, e grava `RETOMADA por=<quem> dur=<N>min`
(`retomada_registrar`; `dur=?` sem início legível). O início é a primeira
`PAUSA` depois da última `RETOMADA` (`pausa_registro`), desde que não seja mais
velha que o minuto escrito no arquivo; senão, o minuto do arquivo. As duas
linhas passam pelo `event()`, com o id `---`. Pausa nunca interrompe o ticket em
curso (§7), e ninguém oferece "pausar agora". Uma pausa feita à mão (o arquivo
criado sem `orq` nem painel) não tem `PAUSA`, e quem retoma diz isso.

```
--- PAUSA motivo=leva-da-tarde por=painel
--- RETOMADA por=terminal dur=21min
```

### 4.2 A linha `GATE`

Um evento por passagem de gates (`event_gate`, `executor.sh:530-545`). Campos,
NESTA ordem:

```
<id> GATE typecheck=<m> testes=<m> enforcement=<ok|falha> criterios=<n>/<N> build=<m> [lint=<m>] [fora_do_pathspec=<a,b>]
```

`<m>` ∈ **`ok · falha · nao-rodou · nao-configurado`**, e os quatro são
distintos por desenho (`papel_marca`, `executor.sh:505-522`):

- `ok` — todos os gates daquele PAPEL rodaram e passaram;
- `falha` — algum gate do papel reprovou;
- `nao-rodou` — há gate do papel no config e ele não chegou a rodar (o motor de
  gates para no primeiro que reprova);
- `nao-configurado` — o repo **não tem** gate com esse papel. Sai do CONFIG, não
  do `gates.txt`: é o que distingue "não tenho build" de "tenho e não rodou".

O PAPEL de um gate é `"papel"` declarado no config, ou INFERIDO do nome
(`papel_do_gate`, `executor.sh:476-492`): `*typecheck*|*tsc*|*types*` →
`typecheck`; `*lint*` → `lint`; `*build*|*compil*` → `build`; `*test*|*spec*` →
`testes`. Declarado ganha do inferido — é a única saída para um gate chamado
`verificacao`. Vários gates do mesmo papel combinam: falha de um é falha do
papel.

Dois campos são CONDICIONAIS:
- `lint=` só entra quando o repo TEM gate de lint (`nao-configurado` é suprimido).
  Acrescentar o campo sempre mudaria a linha de todo repo sem lint;
- `fora_do_pathspec=` só entra quando o ENFORCEMENT reprovou, com os arquivos que
  a allowlist não cobre — é o dado que transforma um beco em ticket acionável.

---

## 5. Evidência de execução

### 5.1 `runs/custo.json` — o ledger

Um objeto, agregado por dia (`custo_registrar`, `lib.sh:851-895`). Arquivo novo
nasce `{"dias":{}}`.

```json
{ "dias": { "2026-09-08": [
  { "data": "2026-09-08", "papel": "executor", "ticket": "001", "attempt": 0,
    "tokens_in": 0, "tokens_out": 0, "tokens_cache": 0, "custo_usd": 0.1967 }
] } }
```

De onde vem cada número: os NOMES dos campos no envelope do agente são do
config (`orcamento.campos_usage.{custo_usd,tokens_in,tokens_out,tokens_cache}`),
lidos por `getpath`, porque o envelope muda de versão para versão. Usage
ilegível **nunca bloqueia ticket**: loga e segue (regra de fail-open do
orçamento). `attempt` aqui é 0-based, como o diretório.

### 5.2 `runs/<id>/meta.json` — as tentativas

Array, um objeto por tentativa (`grava_meta`, `executor.sh:928-943`):
`attempt` (0-based), `modelo`, `duracaoSecs`, `diffLines`, `resultado`, `ts`
(UTC), `dir` (`attempt-N`, o que amarra contador de retry a diretório),
`commitDoHarness`.

### 5.3 `runs/<id>/attempt-N/` — uma tentativa

`N` é 0-based e monotônico por ticket (`slot_base_attempt`). A trilha e o
STATUS falam 1-based (`attempt=1` é a primeira): são a mesma conta em dois
formatos, e renomear diretório invalidaria evidência já gravada.

| Arquivo | Conteúdo |
|---|---|
| `prompt.txt` | o prompt do executor |
| `claude.txt` | stdout+stderr do agente (o envelope) |
| `diff.patch` | o diff cru da tentativa |
| `enforcement.json` | veredito de fronteira: `.ok`, `.violations[].tipo/.detalhe` |
| `gates.txt` | uma linha por gate: `ok <nome> <ms>` ou `FALHA <nome> …` |
| `criterios.txt` | um por critério de aceite |
| `veredito.json` | a decisão da tentativa |
| `juiz.prompt.txt`, `juiz.raw.json`, `juiz.veredito.json` | o passo 7, quando roda |

O juiz recebe diff cru + `gates.txt` + critérios. **Nunca** o prompt do executor
(que está no mesmo diretório e não entra) nem o stdout do agente.

---

## 6. `docs/fila/liberacoes.json` — as liberações humanas

Formato de **DESTINO** (v2), o que `orq liberar` escreve e o que a migração
produz. Schema em `schemas/liberacoes.schema.json`:

```json
{
  "$schema_versao": 2,
  "tokens": [
    { "token": "humano:migration-0025", "liberado_em": "2026-09-08",
      "por": "lucas", "nota": "aplicada e conferida no banco" }
  ]
}
```

O token é o INTEIRO, com o prefixo `humano:`, porque é a forma que a dependência
do ticket usa.

### 6.1 As formas que `liberacao_ok` resolve (peça K8b-1)

Levantadas por `jq` no disco dos três repos em 2026-09-08; as cópias byte a byte
estão em `test/fixtures/liberacoes/` com a procedência de cada uma.

| Forma | Onde vive | Exemplo | Avisa? |
|---|---|---|---|
| `tokens[]` de objetos (v2) | destino da migração | `{"token":"humano:x-1","liberado_em":…}` | não |
| `tokens[]` de strings COM prefixo | conteudos-infinitos (CI), 7 tokens | `"humano:migration-0025"` | não |
| `tokens[]` de strings SEM prefixo | actus-saas, 5 tokens | `"migration-0255-aplicada"` | **sim** |
| `liberadas[]` de objetos (campo `em`) | comarka-operacional, 31 entradas | `{"token":"decisao-C1","em":"2026-08-13",…}` | **sim** |

Regras que valem para todas:

- **A comparação ignora o prefixo `humano:` dos DOIS lados.** `liberacao_ok` só é
  chamada para dependência que já começa com `humano:` (`deps_resolvidas`), então
  não existe segundo namespace com que colidir.
- **Um arquivo que mistura as formas resolve a UNIÃO.** O Comarka tem 47 tokens
  únicos espalhados pelas duas listas, e 34 deles moram em uma lista só: ler uma
  só é como um token liberado deixa de destravar um ticket.
- Entrada malformada (nem string, nem objeto com `.token`) é **ignorada**, nunca
  casa com tudo.
- O AVISO nomeia a forma legada **e o comando que a migra**
  (`instalar.sh --atualizar <repo> --migrar`). A forma canônica é MUDA de
  propósito: avisar a cada dependência resolvida encheria a trilha de ruído
  sobre um arquivo que não tem problema nenhum.

A normalização de prefixo existe porque a v1 consultava `.liberadas[]` com o
token sem prefixo enquanto o ticket declarava a dependência COM: nenhum token
liberado resolvia dependência nenhuma, e o ticket ficava pendente para sempre,
em silêncio (PLAYBOOK do CI, 2026-09-03). O Actus estava, até esta peça, no
mesmo estado — cinco tokens liberados, zero dependências resolvidas, sem uma
linha de log.

`scripts/roadmap/lint-mapa.py` monta o conjunto de tokens satisfeitos pela MESMA
regra, e o teste executa o bloco do lint em vez de reimplementá-lo (marcadores
`# <sat>` … `# </sat>`).

### 6.2 `orq liberar` — o quarto verbo que escreve

`orq liberar humano:<tipo>-<id> ["nota"]` acrescenta um objeto v2. Recusa (rc 1)
token sem o prefixo `humano:`, token fora de `^humano:[a-z-]+-[0-9A-Za-z-]+$`,
token duplicado, e arquivo que ainda não está em v2 — neste último caso mandando
rodar a migração. Nunca converte o arquivo por conta própria: migrar é operação
com `--dry-run`, diff e `.bak`, não efeito colateral de um verbo de consulta.

---

## 7. `docs/fila/PAUSAR` — o kill switch

Arquivo, não sinal (`pausa_ativa`, `lib.sh:619`). O caminho vem de
`cfg .pausar_file`; o legado `docs/fila/.orq-pause` também é reconhecido, e
`pausa_motivo` lê o primeiro dos dois que existir.

**Não interrompe o ticket em curso.** A drenagem lê o arquivo ENTRE tickets e
encerra em `ocioso`. Matar o processo garante ticket órfão — por isso `orq
pausar` escreve arquivo e nada mais.

Conteúdo: `<AAAA-MM-DD HH:MM> | <motivo>`. `orq pausar [motivo]` cria, `orq
retomar` remove; os dois deixam uma linha na trilha (§4.1, `PAUSA` e
`RETOMADA`), e o `retomar` imprime quem pausou, quando e por quê antes de
apagar.

**Migração do nome legado (peça K8b-3).** `instalar.sh --atualizar <repo>
--migrar` renomeia `docs/fila/.orq-pause` para `docs/fila/PAUSAR`, PRESERVANDO o
conteúdo como motivo. `git mv` não serve: os três repos têm `.orq-pause` no
`.gitignore`, ou seja, ele não está no índice. Se os DOIS existirem, a migração
**não** decide: o conteúdo é de duas pausas diferentes, e escolher uma apaga a
outra — ela imprime as duas primeiras linhas e pede a decisão.

**O `.gitignore` do repo é do dono.** O instalador RELATA o que falta e não
edita: um instalador que costura linha no `.gitignore` produz conflito de merge
em arquivo que ninguém esperava ver mudado. Só o `--novo` escreve um
`.gitignore`, e escreve o inicial. A pergunta é feita ao GIT
(`git check-ignore`), não a um `grep` por linha literal — o CI não tem
`docs/fila/runs/` no `.gitignore` da raiz e mesmo assim ignora tudo lá, porque
`docs/fila/runs/.gitignore` traz `*`; um grep acusaria uma linha que não falta.

---

## 8. `docs/fila/000-config.json`

`$schema_versao: 2`. Fonte única; lido por `jq` a cada drenagem e entre tickets.
As chaves que o motor efetivamente lê estão enumeradas, com o arquivo e a linha
de onde cada uma é lida, em `scripts/orquestrador/config-chaves.ts` — a lista
saiu de `grep -ohE "cfg '[^']*'" scripts/orquestrador/*.sh` mais os acessos
diretos dos `.ts`, e `orq config` a usa para acusar chave obrigatória ausente.

Placeholder `<...>` em qualquer valor é config NÃO preenchido: `orq config`
recusa (rc 1). Um `000-config.json` recém-copiado do template não é config — é
formulário em branco. Um valor é placeholder quando ELE É um (começa com `<` e
termina com `>`), nunca quando apenas menciona um: a `descricao` do template diz
"Placeholders <ASSIM> são decisões locais", e cobrar por substring reprovaria o
próprio texto que explica a regra.

`proibicoes_absolutas` tem duas metades desde a T17: `regras` (a prosa que vai
no prompt) e `tools`, o **piso de `--disallowedTools`**. O piso é passado na
chamada do agente E tirado da allowlist derivada do ticket
(`perfil.ts:filtrarPeloPiso`) — o ticket pede, o config nega, o config ganha.
Ausente, o piso é vazio e a flag não é passada: é o estado dos três repos do
disco, onde `proibicoes_absolutas` ainda é um array de prosa.

Um gate de `tipo: "baseline"` é julgado pela CONTAGEM na saída, não pelo exit
code (`gates.ts:avaliaGate`): `baseline: N` mais `direcao: "max"` (padrão — ok
com contagem ≤ N, o caso dos erros de tipo herdados) ou `"min"` (ok com ≥ N).
`contagem_regex` diz o que contar — sem grupo de captura, quantas LINHAS casam;
com grupo, a SOMA dos números capturados; ausente, o `error TS\d+` de sempre.
`preparo: [...]` são comandos rodados antes do `cmd`, com o rc IGNORADO (é
higiene, não verificação). Em `direcao: "max"`, exit != 0 com contagem ZERO
reprova assim mesmo: é o comando que falhou por outro motivo, não o baseline.
Em `direcao: "min"` o exit code continua valendo.

Todo gate do config precisa de um PAPEL que o executor consiga ver — declarado
ou inferível do nome (§4.2) —, **exceto** os de `tipo: preparacao`, que não
verificam nada (no CI é o `limpeza_artefatos`, um `rm -rf` do artefato de build
que roda antes dos gates de verdade). Gate que não verifica não aparece na linha
GATE, e é correto que não apareça.

**`push_suprimido` é INFORMATIVA — não é interruptor** (peça D11). A chave não
está em `config-chaves.ts` e nenhum script do motor a lê: o valor não muda
comportamento nenhum, e o config do CI a tem em `false` sem que o loop de lá
pushe. O motor não pusha **por construção** — `local-loop.sh` abre dizendo "Sem
push: publicar é humano" e não há um único `git push` no motor. Quem *impede* o
push são outras duas coisas, e são elas que se conferem quando a pergunta é
"tem como isto publicar sozinho?":

1. `proibicoes_absolutas.tools` com `Bash(git push:*)` — o piso vai na flag
   `--disallowedTools` E é tirado da allowlist derivada do ticket
   (`perfil.ts:filtrarPeloPiso`): o ticket pede, o config nega, o config ganha.
2. `branch_protegida` — `local-loop.sh:merge_em_alvo` recusa mergear nela e
   recusa mergear a partir de uma worktree que esteja nela.

O snapshot diz `push suprimido (publicar é humano neste repo)` **sempre**
(`lib.sh:staging_linha`), por construção e não por leitura do config. Escrever a
chave como registro da decisão é legítimo; tratá-la como o que segura o push é
confiar num interruptor que não está ligado a nada.

**`sem_progresso_limite`** (peça 7a-3, opcional, padrão **3**): quantos
disparos seguidos um ticket pode seguir `pendente` sem progresso antes de ir
para `bloqueado` (§4.1, `BLOQUEADO motivo=sem_progresso`). Lida a cada volta
(`local-loop.sh:sem_progresso_limite`); ausente, zero ou não numérica vale 3.
Está em `config-chaves.ts` e no formulário v2 (`doutrina/templates/config.json`),
e **não** na tabela de chaves novas do `--migrar` (`config-tabela.ts:NOVAS`): um
repo instalado segue com o padrão do código sem que a migração mude o proposto
dele.

**`adiamentos_limite`** (peça 7b-3, opcional, padrão **4**): quantos
adiamentos SEM cooldown seguidos um ticket pode ter antes de ir para
`bloqueado` (§4.1, `BLOQUEADO motivo=adiamentos`). Lida a cada volta
(`local-loop.sh:adiamentos_limite`); ausente, zero ou não numérica vale 4. Está
em `config-chaves.ts` e no formulário v2, e, como o `sem_progresso_limite`, não
em `config-tabela.ts:NOVAS`.

**`politica_adiamento.causas_que_adiam`: os mesmos 7 rótulos ligam 9 causas**
(peça 7b-2). `servidor` (5xx) é ligado pelo rótulo "rate limit" e `gate_crash`
pelo "gate interrompido": pedir rótulo novo faria todo repo instalado deixar de
adiar um 503 no dia da atualização. Tirar o rótulo desliga as duas causas dele.

**`politica_retry.por_causa.<causa>.modelo = "ESCALAR"` vale só para
`sub=juiz`** (peça 7b-4). O REPROVADO carrega o sub-motivo (`juiz`, `criterio`,
`gate_<papel>`, `exit`; §4.1), e `decidirRetry` (`decisao.ts`) só troca para
`retry_final_model` quando quem reprovou foi o juiz. Critério vermelho, gate
vermelho e exit repetem com o MESMO modelo, qualquer que seja o config: nos 30
dias até 21/09, 82 de 82 retries do kit foram para opus porque tudo caía em
`criterio_qualidade`. `MANTER` segue como sempre, e a proibição de escalar por
`diff_cap` e `enforcement` segue rejeitando o config que mandar o contrário.

**`000-config.proposto.json` é NOME RESERVADO do instalador.** É onde o
`migrar-config.ts --propor` escreve e de onde o `--aplicar` lê. Desde a peça M1
o `--propor` **RECUSA** (rc 1) se o arquivo já existir, e o `instalar.sh
--atualizar --migrar` repassa a recusa em vez de engoli-la — o `--dry-run`
avisa e continua sem escrever. Antes disso o `writeFileSync` era incondicional:
um segundo `--migrar` reescrevia por cima de um proposto já revisado e
preenchido, em silêncio, e o `--aplicar` seguinte instalava a versão de máquina
com os placeholders `<...>` intactos.

Por isso **revisão humana usa outro nome**: a convenção do kit é
`docs/fila/000-config.revisado.json`, que o instalador não conhece — não lê, não
escreve, não apaga. Quem trabalhou o config em separado copia o revisado por
cima do oficial (com o `.bak` sob sua responsabilidade) **depois** de rodar o
`--migrar`; usar o nome do proposto para isso é entregar o arquivo ao
instalador. O `--aplicar` continua sendo o caminho de quem preencheu o proposto
no lugar dele: ele MOVE o que foi lido, sem recalcular.

`orq config` roda ANTES do `lib.sh` (`scripts/orq`, topo) e resolve o caminho do
config sem ele. O `lib.sh` lê o config no carregamento, então um
`000-config.json` ilegível derrubava o `orq` inteiro com rc 5 — a ferramenta que
responde "meu config está quebrado?" era justamente a que não rodava quando ele
estava.

---

## 9. Verbos

### 9.1 `orq` (no repo instalado) — READ-ONLY por construção

| Invocação | Faz |
|---|---|
| `orq` / `orq status` | imprime `runs/STATUS.md` (com a correção de status congelado) |
| `orq fila` | placar por status, lido do JSON de cada ticket |
| `orq eventos [n]` | últimas n linhas da trilha (default 20) |
| `orq erro` | último REPROVADO/BLOQUEADO: id, motivo, e o RECORTE do gate que falhou |
| `orq ticket <id>` | última tentativa, evidência e commits com o trailer |
| `orq custo [dia]` | `custo.json` por papel e por ticket, contra o teto, + "de primeira" |
| `orq decisoes` | `decisoes-pendentes.md` |
| `orq mapa lint\|status` | lint `MAPA.md` × `mapa.json`; placar por frente |
| `orq validar [ids\|--pendentes]` | gate de ticket; repassa o rc (1 com violação) |
| `orq versao` | `docs/orquestrador/skill/VERSAO` do repo, e o do kit se `ORQ_KIT` apontar |
| `orq config` | acusa placeholder, chave obrigatória ausente, gate sem papel, `launchd.label` ausente |
| `orq pausar [motivo]` | cria o `pausar_file` e grava `PAUSA motivo=<token> por=terminal` na trilha — **escreve** |
| `orq retomar` | imprime quem pausou, quando e por quê; remove o `pausar_file` e grava `RETOMADA por=terminal dur=<N>min` — **escreve** |
| `orq liberar <humano:token> [nota]` | acrescenta um token v2 em `liberacoes_file` — **escreve** (§6.2) |
| `orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]` | triador de bloqueios (§13): lê OUTRO repo e grava o diagnóstico em `~/.orq/diagnosticos`, nunca no repo; despachado antes do `lib.sh` (`scripts/orq:88`) |

`orq triar` não escreve no repo: toda escrita dele passa pela `Guarda` (§13.4), fora
de qualquer repo do `repos.json`.
Os TRÊS que escrevem escrevem UM arquivo do repo cada, nunca estado de execução;
`pausar` e `retomar` acrescentam, além dele, UMA linha à trilha (peça K12-F), pelo
`event()` do `lib.sh`, a mesma que o painel grava. A trilha é append-only e não é
estado de execução: nenhuma decisão do motor lê `PAUSA` ou `RETOMADA`.
Nenhum subcomando toca ticket, staging, worktree, branch ou lock, e nenhum mata
processo. Se `orq` puder alterar estado, alguém vai alterá-lo no meio de um run.

### 9.2 `instalar.sh` (no kit)

| Invocação | Faz |
|---|---|
| `--verificar <repo>` | compara o motor de `<repo>` com o do kit; rc 0 se idêntico, 1 se não |
| `--atualizar <repo> [--dry-run] [--forcar] [--migrar]` | copia o motor por cima e carimba o `VERSAO`; com `--migrar`, também migra `docs/fila/**` |
| `--novo <repo>` | instala num repo git que ainda **não** tem `docs/fila` |

`--dry-run` **prevê as recusas** em vez de dizer que está tudo bem: ele continua
saindo 0 (não é o gate), mas imprime `O --atualizar de verdade RECUSARIA, por:`
com o motivo. Um ensaio que aprova e uma execução que recusa é um ensaio que
mentiu. A recusa prevista **não** impede o dry-run de listar tudo.

`--atualizar` é `cp`, nunca `rsync --delete`: o que só existe no repo sobrevive
e reaparece como `só no repo` no `--verificar` que ele imprime no fim. Três
recusas, e só a terceira cede a `--forcar`:

1. loop não pausado (nem `PAUSAR` nem `.orq-pause`);
2. `runs/STATUS.md` que não diz `ocioso` (ausência não é recusa);
3. modificação não commitada no motor do repo — nos MESMOS caminhos que o bloco
   de cópia escreve, `scripts/roadmap/` e os testes de harness incluídos.

`--novo` cria o layout de §1.2 do zero. O bloco de vendorização é o MESMO do
`--atualizar` (`vendorizar_motor`), e os artefatos do repo vêm de
`doutrina/templates/`: `config.json` → `000-config.json` (FORMULÁRIO, com
placeholders), `TICKET.md` → `_TEMPLATE.md`, `decisoes-pendentes.md`,
`mapa.json`, `MAPA.md`, `PLAYBOOK-seed.md` → `PLAYBOOK.md`, `PECAS-seed.md` →
`PECAS.md`; `liberacoes.json` nasce em **v2 vazio**. Duas recusas com rc 1: o
diretório não é repo git (sem git não há ground truth), e `docs/fila` já existe
(aí o verbo é `--atualizar` — um `--novo` que sobrescreve fila é um `--novo` que
apaga tickets).

`--novo` **escreve** o `.gitignore`, e é a diferença deliberada para o
`--atualizar --migrar`, que só relata (§7): num repo novo o arquivo ou não
existe, ou não tem opinião sobre `docs/fila` — não há ordem nem comentário de
ninguém para atropelar. Ele ACRESCENTA o que falta e não reescreve o resto.

**Nada de launchd.** Instalar o job é passo separado (`instalar-launchd.sh`),
depois do config preenchido: ele RECUSA sem `launchd.label`, e o label é um dos
placeholders do formulário. Agendar um loop cujo config ainda é formulário é
agendar um loop que não roda.

### 9.3 As migrações (no kit, chamadas por `--atualizar --migrar`)

| Passo | Migra | Como aplica |
|---|---|---|
| `migrar_pausa` (em `instalar.sh`) | `docs/fila/.orq-pause` → `docs/fila/PAUSAR`, motivo preservado (§7) | `mv`; recusa com os dois presentes |
| `migrar-liberacoes.ts` | `liberacoes.json` de qualquer forma viva (§6.1) para v2 | `--aplicar` grava e deixa `.bak` |
| `migrar-config.ts` | `000-config.json` schema 1 → 2, pela tabela de `config-tabela.ts` | **`--propor` só**: grava `000-config.proposto.json` ao lado, e RECUSA (rc 1) se ele já existir (M1). O oficial nunca é tocado pelo instalador |
| `migrar-tickets.ts` | o bloco ```json dos tickets `pendente`: `tentativas_consumidas` → `tentativas`, `recon_esperado` → `recon` | `--aplicar` grava **sem** `.bak` |
| `relatar_gitignore` (em `instalar.sh`) | nada — RELATA o que o repo deve ignorar (§7) | nunca escreve |
| `orq validar --pendentes` | nada — RELATA o que a migração deliberadamente não inventou | read-only |

**Tickets: a prosa não se move um byte.** O migrador troca só as linhas do bloco
```json; tudo fora delas é o array de linhas original, devolvido intacto. Ele não
inventa `tipo` de critério (depende de o comando FALHAR na base atual — é o passo
3 do gate, não um chute), nem `risco` (o gate classifica no passo 6), nem `bloco`
(os 46 pendentes do Comarka usam `frente`/`onda`/`serie`/`camada`, outro modelo de
roadmap), e não toca `perfil` nem `lane`. É a única migração **sem `.bak`**: o
ticket é versionado, o git já é o backup, e 46 arquivos `.bak` na fila deixariam
a árvore suja — que mata o preflight do run seguinte.

Ticket com **mais de um** bloco ```json é PULADO, nomeado no relatório: é
exatamente o caso em que os três leitores discordam (ver §10, divergência 10), e
a migração não desempata divergência do motor por conta própria.

Ele roda **depois** da cópia do motor. Se alguém parar no meio, o repo fica com
motor novo sobre dados velhos — que funciona, porque desde a K8b-1 o motor lê
todas as formas vivas. O contrário (dados novos, motor velho) é o repo travado.

**O config é a exceção, e é a peça funcionando.** As outras migrações mudam a
forma de um fato já decidido (um token foi liberado; a fila está pausada). O
config é DECISÃO: o proposto sai com placeholders nas decisões que a v1 nunca
tomou (teto de orçamento, `launchd.label`, `juiz.paths_alto_risco`), e gravar
isso por cima de um config em uso trocaria um arquivo que funciona por um
formulário. O `--aplicar` do `migrar-config.ts` é passo humano, depois de
preencher e reler — e ele MOVE o proposto revisado, sem recalcular: recalcular
aplicaria um arquivo diferente do que foi lido.

A tabela `de → para` vive em `scripts/orquestrador/config-tabela.ts`, escrita à
mão. Três grupos: `RENOMES` (o motor lê a mesma coisa por outro nome — renomear
é COPIAR, o nome antigo fica), `NOVAS` (chave do schema 2 que a v1 não tinha,
com `procedencia` = `politica` | `local` | `derivada`) e `PROPRIAS_DE_REPO` (fica
intocada e vira item nomeado do relatório, para a K11). Chave obrigatória que a
tabela não cobre aparece no relatório como `AINDA AUSENTE` — silêncio ali seria
a migração declarando completo o que não é.

E o instalador sugere **dois commits**, não um: o motor é vendorizado e o diff
dele é "o kit mudou"; `docs/fila/**` são os dados do dono e o diff é "os meus
dados mudaram de forma". Juntar os dois faz o `git log` do repo perder a única
linha que alguém vai procurar quando uma liberação parar de resolver.

Regras que valem para TODAS (`migrar-comum.ts`):

1. `--dry-run` é o **padrão**. Sem `--aplicar`, nada é escrito.
2. `--dry-run` imprime o **diff**, não um resumo. "3 chaves migradas" não deixa
   ninguém decidir nada.
3. O **primeiro** `--aplicar` deixa um `.bak` ao lado; um `.bak` que já exista
   NÃO é sobrescrito — ele vale como o estado antes da primeira migração.
4. Migração **nunca apaga dado**: chave desconhecida fica onde está, token não
   some, prosa não se move. O que a migração não entende, ela PRESERVA e RELATA.
5. Migração é **idempotente**: rodar duas vezes é no-op. Inclusive a `origem` já
   registrada é preservada em vez de reinferida — sem isso, o segundo `--aplicar`
   reescreveria `v1:tokens` como `v2` e apagaria a procedência de um
   `liberado_em: desconhecido`.

### 9.4 `instalar-launchd.sh` (no repo instalado)

Renderiza `com.orquestrador.plist.template` com `launchd.label` e
`launchd.start_interval` do config, e carrega o job. RECUSA (rc 1) sem
`launchd.label` — nunca inventa um: label inventado não dá erro, dá um SEGUNDO
job ao lado do antigo. RECUSA também instalar de um checkout sob `/tmp` ou com
`ORQ_TESTE=1`, salvo `--permitir-tmp` (peça K6e; ver `docs/PLAYBOOK.md`).
`--dry-run` renderiza sem instalar, em qualquer caso.

O plist sai com `RunAtLoad` **true** (peça 7b-7, porte do `5791209` do Actus):
o `bootstrap` de cada instalação dispara o primeiro tick na hora, em vez de só
depois de um `StartInterval` inteiro. `docs/launchd.md` ainda mostra o exemplo
antigo com `false`; é divergência conhecida até a 7c.

### 9.5 `orq-painel.py` (peça K12): o painel, local

`python3 scripts/orquestrador/orq-painel.py [--porta N]` serve em `127.0.0.1` (Host
fixo) a página e `/api/estado`, que a página relê a cada 15 s e aplica só onde mudou.
`--estado` e `--html` imprimem uma vez.

**A lista de repos** é `~/.orq/repos.json` (ou `ORQ_REPOS`), o mesmo arquivo que o job
único da K15 vai ler:

```json
{ "$schema_versao": 1, "repos": [ { "caminho": "/abs/repo", "nome": "opcional" } ] }
```

`nome` padrão é o nome do diretório. Nada no painel depende do nome: label, intervalo,
timeout e caminhos saem do config de cada repo.

**Lê** só: `STATUS.md` (§3), `events.log` (§4, incremental), `custo.json` (§5.1), o
primeiro bloco json dos tickets (§2), o config (§8: `runs_dir`, `pausar_file`,
`liberacoes_file`, `orcamento.custo_file`, `claude_timeout_secs`, `launchd.label`,
`launchd.start_interval`), o `pausar_file` e o legado `.orq-pause` (§7), e `launchctl print`
do label. `liberacoes.json` e o cooldown entram pelo motor: o painel roda
`pendentes_razoes` (`local-loop.sh`, a régua do `OCIOSO`) com `ORQ_EXEC_ROOT` no repo.

**A apuração de razões roda fora da resposta** (peça K12-J): uma thread por repo, no
máximo uma de cada vez, disparada quando a fila muda (tickets, liberações, cooldown, e o
minuto) e o recuo de falha já passou. Timeout de 10 s por repo, matando o grupo de
processos; recuo de 1, 2, 5 e 10 min depois de falha, teto de 10 min, zerado no sucesso.
`/api/estado` espera no máximo 0,6 s somados, e só por apurações que acabaram de começar;
depois responde com o cache, e cada repo traz `razoes.estado` (`ok`, `apurando`,
`falhou`), a hora da última tentativa e em quanto tempo vem a próxima. Com resultado antigo
e a fila mudada, a tela usa o antigo e diz de quando é. O cache é da memória do processo:
não sobrevive a reinício. `--estado` na linha de comando espera todas as apurações.

**Escreve** no repo só o `pausar_file` (criar/apagar, guardado dentro de `docs/fila` e
nunca o `.orq-pause`) e, junto, uma linha `PAUSA`/`RETOMADA` na trilha (§4.1),
pelas mesmas funções do `lib.sh` que o `orq` usa; o `por=` da `PAUSA` de pé é
como o cartão diz quem pausou. Dispara
`launchctl kickstart gui/<uid>/<label>` (sem `-k`) só com STATUS `ocioso`, sem pausa e job
carregado. Não edita ticket, não roda executor, não faz git.

**Categoria de bloqueio**, do último `BLOQUEADO` do ticket (e do `sub=` do `REPROVADO`
anterior quando o bloqueio não o traz): `enforcement`; `tamanho` (`diff_cap`); `ambiente`
(`sem_progresso`, `adiamentos`); `merge` (`merge_falhou`); pelo sub, `teste`
(`gate_testes`), `gate` (outro `gate_*`), `spec` (`criterio`), `juiz`, `exit`; sem
`BLOQUEADO` na trilha, ou com `RECUPERADO` depois dele, `decisão sua`.

**Alarmes**, cada um uma frase: `launchd_exit` (job carregado com `last exit code` != 0);
`mudo` (job carregado, sem PAUSAR, último `DRENAGEM_INICIO` além de 2× `start_interval`,
ou nenhum); `pausa_furada` (PAUSAR de pé e, depois dele, `DRENAGEM_INICIO` sem
`motivo=pausado` ou `INICIO` de ticket que não era o em curso); `pausa_longa` (PAUSAR há
mais de 40 min); `execucao_longa` (STATUS `executando` e o `INICIO` do ticket além de
`claude_timeout_secs` + 10 min). Chave ausente no config vira "sem dado", não alarme.

---

## 11. Porte do Actus (branch `porte-actus`, 24/09/2026)

O que o motor do Actus pagou com incidente entre 12 e 24/09/2026 e o kit não
tinha, portado commit a commit (base comum: kit `3c7ef69` = motor vendorizado
no Actus em `0bc0bf2`). Onde o kit já tinha peça própria, ficou a do kit e o
teste do Actus passou a valer sobre ela (decisões do Lucas, 24/09/2026).

### 11.1 Ticket (§2)

- `contexto_juiz` (opcional, 622): lista de caminhos de REFERÊNCIA que o
  critério manda comparar e que não fazem parte do diff. O harness lê da BASE
  da tentativa (`git show <base>:<path>`), 400 linhas por arquivo e 1200 no
  total, truncamento marcado; caminho ausente na base = erro alto. Gate, check
  9: lista de strings, existe na branch alvo, não é arquivo da própria
  allowlist.
- `criterios_aceite[].exemplos_regex` (624): obrigatório quando o `cmd` passa
  padrão ERE a `grep` ou literal `/.../` a `awk`; ver o dicionário em
  `doutrina/templates/TICKET.md`. Gate, check 10.
- `adiamentos_ambiente` (escrito só pela automação, ae29dcd): adiamentos
  CONSECUTIVOS por causa `ambiente`; no 3º o ticket bloqueia. Some quando o
  status sai de `pendente` e na devolução humana (7b-8).

### 11.2 Gate de ticket e pré-voo

- Regras novas no `cmd` (aab3f4e, a15daca): `| grep -q` em pipe reprova
  (SIGPIPE + pipefail esvaziam a saída); ler a saída TEXTUAL do vitest
  reprova (use o rc). AVISO, que não muda o rc: caminho citado no objetivo
  fora da allowlist (texto depois de "PROIBIDO" não conta).
- `--pendentes` também pega ticket SEM JSON parseável em qualquer status
  (630).
- O `drive_ticket` roda o gate no ticket selecionado ANTES da worktree e do
  contador (c404986). `gate_ticket.modo_pre_voo`: `bloqueia` (ticket
  bloqueado, `BLOQUEADO motivo=gate_ticket`, nenhuma tentativa consumida) ou
  `aviso` (`GATE_TICKET_AVISO`, o ticket segue). Ausente = `aviso`. Gate que
  não roda (rc fora de 0/1, rc 1 sem violação deste ticket, ou rc 2 do check
  10 por binário ausente/timeout) é falha alta nos dois modos.

### 11.3 Desfechos e causas

- Causa de infra `ambiente` (rótulo "falha de ambiente da worktree", 8ª causa
  do template e do `--migrar`): SÓ quando a única falha é de critério e o
  harness não conseguiu EXECUTAR o comando dele (rc 126/127,
  `criteriosNaoExecutados`). Critério que rodou e reprovou é sempre mérito;
  permissão negada ao agente não pesa em desfecho. Sem cooldown.
- `retry_sem_mudanca` (623): da 2ª tentativa em diante, com o agente saído rc
  0, `diff.patch` com o mesmo sha256 da tentativa anterior bloqueia sem juiz.
  Diff idêntico depois de falha de infra é adiamento, não bloqueio.
- `base_vermelha` (632): gate(s) reprovado(s) todos de papel `testes`,
  enforcement ok, critérios verdes, e TODO arquivo das linhas ` FAIL  <arquivo>`
  fora do diff e da allowlist = bloqueado sem juiz, sem retry, sem consumir
  tentativa; lista vazia ou arquivo do ticket = caminho de sempre. Antes dela
  vem o teste vizinho (etapa 8c, §21): FAIL só em teste que importa ou cita item
  da allowlist e passa na base não é base vermelha. Os testes ampliados contam
  como allowlist aqui.
- `arquivo_solto` (631): toda violação do enforcement é `fora_do_pathspec` de
  arquivo que estava NÃO rastreado antes do `add -A` do harness = reprovado com
  retry (`MANTER`, em `NUNCA_ESCALA`), o nome no diagnóstico ("remova da
  worktree"), e a worktree é reaproveitada. Precisa da regra
  `politica_retry.por_causa.arquivo_solto`; sem ela o `decidirRetry` bloqueia.
- `afrouxamento` (etapa 8c, §21.4): alguma violação do enforcement é do tipo
  `afrouxamento` (num teste vizinho ampliado) = reprovado, e a causa manda sobre
  as outras violações (nunca `refatiar`). Nenhuma regra de `politica_retry`
  a nomeia: o `decidirRetry` bloqueia, sem nova tentativa.
- O diagnóstico de retry leva o motivo LITERAL do juiz e os criterios_falhos
  dele na frente (623). O juiz recebe, lido da base, o corpo das
  funções/fixtures chamadas pelos testes adicionados (628).

### 11.4 `runs/` e STATUS

- `runs/<id>/attempt-N/arquivos-soltos.txt` (631): os `??` antes do `add -A`
  (vazio quando não há). `veredito.json` ganha `causa: base_vermelha` com
  `arquivos` e `evidencia`.
- STATUS.md: linha `CORROMPIDA fila corrompida: <arquivo>` por ticket com JSON
  quebrado, e o placar conta `corrompido` sem zerar os válidos (630). `MOTIVO
  pausado (<sentinela>: <conteúdo>)` (514).
- Linha GATE: `gates_ausentes=` só para gate que falta SEM falha antes dele na
  ordem do config; gate pulado depois de uma FALHA (ou de interrupção) não é
  ausente (626, com a correção de marcação).

### 11.5 Pausa (§7)

`scripts/orquestrador/orq-pause.sh` trata as DUAS sentinelas (`pausar_file`
e o legado `.orq-pause`): `--off` remove as duas e diz quais, `--status`
lista cada uma, e pausar/retomar por ele gravam `PAUSA`/`RETOMADA`
`por=terminal`. O `orq retomar` continua escrevendo só o `pausar_file` (§9.1):
o legado vira `PAUSAR` pelo `--migrar`.

### 11.6 Config (§8)

| Chave | Valor no template / `--migrar` | Lida em |
|---|---|---|
| `gate_ticket.modo_pre_voo` | `aviso` | `executor.sh`, passo 5b do `drive_ticket` |
| `politica_retry.por_causa.arquivo_solto` | `{modelo: MANTER, acao: "remover o arquivo solto da worktree"}` | `decisao.ts:decidirRetry` |
| `politica_adiamento.causas_que_adiam` | + `"falha de ambiente da worktree"` (o `--migrar` acrescenta no fim de uma lista que já exista: `ITENS_NOVOS` da `config-tabela.ts`) | `decisao.ts:ROTULO_PARA_CAUSA` |

## 12. Etapa 7d-1b: severidade por regra e calibração do gate de ticket (25/09/2026)

A régua é a calibração de 25/09 (`~/orq-sessoes/levantamento-7d1-calibracao.md`
§5): ERRO só com ZERO falso positivo nos done dos três repos. O corpus dela
está em `test/fixtures/gate-corpus-7d1/` (57 bloqueados por spec, com a causa,
e 706 done), e `test/orquestrador-gate-corpus.test.ts` reprova se uma regra
ERRO marcar um done.

### 12.1 Severidade

Tabela única `REGRAS` (`gate-ticket.ts:105`). `erro` é violação (rc 1, e o
pré-voo em `bloqueia` bloqueia); `aviso` sai na saída com `AVISO (<regra>):` e
nunca bloqueia; `off` não é avaliada. `gate_ticket.severidade` no config
sobrescreve por regra (`{"6q": "erro", "6a:rm ": "off"}`); valor fora de
`erro|aviso|off` ou regra desconhecida é falha alta (rc 2). Chave `_*` é
comentário.

| Severidade | Regras |
|---|---|
| `erro` | `1` json, `2` campos, `4` status, `5t` tipo presente fora do vocabulário, `5c` cmd vazio em critério que roda, `5e` espera vazia, `6a` crase/`eval`/`sudo`/`curl`/`wget` (e padrão sem linha própria), `7` dependência órfã (= C7), `9` contexto_juiz, `10c` colchete escapado em classe, `10x` exemplo × padrão, `C2P` `grep -P`, `C14` `v=$(grep -c …) &&` com 0 possível (8a) |
| `aviso` | `2c` critérios ausentes, `3` id, `6a:rm `, `6a:bash`, `6a:sh -c`, `6r` redirecionamento, `6v` vitest por texto, `6q` `grep -q` em pipe, `6b` objetivo fora da allowlist, `8` sobreposição (fecho transitivo = C8), `9w`, `10n` sem exemplos, `C2c` `grep -c … \|\| echo`, `C2v` saída vazia, `C3` ausência ampla, `C4` acento em locale C, `C9` topologia, `C11` teste vizinho (v2 da 8a), `C12` allowlist sem arquivo nem pai, `C13` `origin/` em critério (8a) |
| `off` | `6a:$(` |

### 12.2 Regras corrigidas

`2` sem `bloco` e `risco`; `3` aceita `[a-z0-9]*` (também no `lerFila`); `5t`
infere o tipo; `5c` aceita o avaliador sem cmd; `6r` aceita `/tmp/*` e fecha o
alvo no `)`; `6v` só acusa o critério que aprovaria uma suíte com falha
(roda o trecho depois do pipe sobre uma saída de referência com
`Tests  1 failed | 5 passed`, só com filtros de texto; indeterminado continua
acusado); `8` usa o fecho transitivo das dependências; `10x` aceita o exemplo
como o shell entrega o padrão OU como ele está escrito entre as aspas de fora,
prova positivo e negativo com o padrão real, e dispensa exemplo no `grep -v`.

### 12.3 Regras do comarka-operacional

Portadas do `validar-fila.py` sem executar critério (C1, C5 e C6 ficam para a
etapa seguinte). C4, C9, C11 e C12 leem o repositório por `ContextoRepo`
(`validarTicket`, 4º parâmetro): em produção, `contextoGit` usa a
`branch_alvo` do config (C9, C11, C12) e o disco do checkout da fila (C9, e o
dicionário de palavras acentuadas de `**/src/**/*.ts(x)` para o C4). Fora de
repositório git, essas regras não rodam; branch alvo inexistente = C9/C11/C12
não rodam. Os tickets da própria fila não contam como teste no C11. A C11 desta
seção (basename em 1 a 4 testes) foi trocada pela v2 da etapa 8a (§12.6).

### 12.4 Execução sem cor

`run_criterios` e o `gates.ts` rodam com `NO_COLOR=1 FORCE_COLOR=0`
(`executor.sh:458`, `:1040`). O vitest obedece `NO_COLOR`; `FORCE_COLOR=0`
desliga o que segue supports-color/chalk.

### 12.5 Config (§8)

| Chave | Valor no template / `--migrar` | Lida em |
|---|---|---|
| `gate_ticket.severidade` | `{}` (vale a tabela) | `gate-ticket.ts:lerSeveridade`, `:severidadeDe` |

### 12.6 Etapa 8a: validador na entrada (18/10/2026)

Medição do Comarka de 04 a 17/10 (`~/orq-sessoes/relatorio-kit-etapa8a.md`): dos 89
resgates, 18 de allowlist e 12 de critério nascem na escrita do ticket, e o gate de
antes não barrava nenhum (nenhuma regra `erro` nos 39 tickets reais, na versão de
entrada). A régua de FP desta etapa é a **P1r**: os 368 done do Comarka aprovados de
primeira na janela, na versão que rodou (a última `pendente` antes do loop pegar), com a
árvore da `staging-auto` daquele momento — todo disparo ali é FP. O corpus 7d-1 continua
valendo (C14 `erro` passa nele com zero FP).

| Regra | Sev. | O que olha | FP P1r | Casos reais |
|---|---|---|---|---|
| `C14` | `erro` | `v=$(… grep -c …) &&` com o grep -c como último comando do `$( )` e `v` comparada com 0 (`=`, `-eq`) ou com teto (`-le`, `-lt`): com zero matches o grep -c sai 1 e o `&&` corta a cadeia no estado certo (`grepCEncadeado`) | 0/368 (1 nos 1266 done: 1116, done manual que nunca rodou, com o defeito) | 924b, 924c (+924d, 924f) |
| `C13` | `aviso` | `origin/<ref>` em critério executável; a worktree nasce da `branch_alvo` local (`refsOrigin`) | 120/368 (318 dos 1266 done) | 1004 |
| `C11` v2 | `aviso` | arquivo de `src/` da allowlist (glob expandido) importado **direto** por teste fora da allowlist — relativo ou pelos `paths` do `tsconfig.json`, resolvido contra a árvore — ou citado pelo caminho (porte da camada 15 do `validar-fila.py`, 457856c) (`testesVizinhos`) | 180/368 | 950, 1006 (entrada); 840 (pré-voo); 14 de 19 resgates de allowlist com teste como causa, no pré-voo |

C11 v2, como decide:
- lê a **árvore da `branch_alvo`** (`lerArvoreAlvo`: `ls-tree` mais um `cat-file
  --batch` com os testes e o tsconfig, memorizado por commit), não o disco do checkout;
- "dentro da allowlist" é `matchesAllowlist`, a mesma função do enforcement;
- teste = `*.test.*`/`*.spec.*` de código, fora de `e2e/` e da própria fila;
- `testes_conferidos` **não isenta**: o teste conferido sai marcado na mensagem
  ("declarado conferido; em 13 de 19 resgates medidos o conferido quebrou"). Com a
  isenção, o FP seria 87/368 e ela pegaria 3 de 19;
- `--relatorio` imprime `testes_vizinhos (C11): [...]` por ticket: o insumo da 8c.

Fora do alcance, por decisão: 856 e 854 (teste que varre diretório, sem citar o
arquivo), 711a (critério que contradiz teste), 762 (o teste cita `vercel.json`, item
fora de `src/`; a variante que cita item fora de `src/` dava 262/368), 318c, 1053b e 830
(arquivo de `src`/`scripts` fora da allowlist). A C15 pedida (critério que conta arquivo
por diretório) não entrou: 0 dos casos reais, porque em 854/966 quem conta é teste.

---

## 13. Etapa 7f-b1: triador de bloqueios, só leitura (10/10/2026)

Spec: `~/orq-sessoes/spec-7f-triador.md` (7f-a), peças 1 a 5 da §8, com as decisões do
chat do programa: modelo `claude-opus-5-5` com teto de US$ 3,00 por dia e entrada cortada
em 30 mil tokens; a passada pode promover palpite a firme; o painel nunca dispara gasto
(quem roda é `orq triar`, manual e depois job do launchd, peça 7 redefinida na 7f-b2); a
corrida real com o modelo (peça 6) não é da sessão de etapa. O painel (§9.5) ainda não lê
os diagnósticos: isso é a 7f-b2.

### 13.1 O que é

Para cada ticket `bloqueado` de um repo, o triador lê a evidência que o motor já gravou,
diz qual dos sete destinos (R1 a R7) o bloqueio tem, onde está a prova (`arquivo:linha` do
artefato ORIGINAL) e o remédio em uma linha, e grava isso FORA do repo. Não decide, não
reabre, não muda status, nota ou critério, não roda script do repo.

Código: `scripts/orquestrador/triador/`. Comando: `orq triar` (`cli.ts`).

### 13.2 Fontes (dois leitores, uma `Evidencia`)

O leitor sai da forma do diretório (`leitor.ts:22`): `<runs_dir>/events.log` → `kit`;
sem ela e com `docs/fila/runs/local-loop.log` → `legado-comarka`. Os dois devolvem a mesma
`Evidencia` (`tipos.ts`); a extração e o modelo só veem ela.

| | `kit` (`leitor-kit.ts:71`) | `legado-comarka` (`leitor-legado-comarka.ts:195`) |
|---|---|---|
| ticket | 1º bloco json de `docs/fila/<id>-*.md` (§2) | idem |
| bloqueio | último `BLOQUEADO` do id na trilha (§4); token = `motivo[:sub]` | última linha `ticket <id>: BLOQUEADO …`/`reprovado após` do `local-loop.log`; token `circuit_breaker`, `enforcement`, `retries_esgotados` |
| série | `INICIO` do id desde o desfecho anterior; `attempt=N` → `attempt-(N-1)` (§5.3) | última sequência 1..n do `meta.json` (`serieDoMeta`, `:378`); entre `attempt-k` e `attempt-k.prevJ`, o de mtime mais recente até fim + 180 s (`:32`) |
| estágio | `veredito.json .causa`, `FALHA <gate>` do `gates.txt`, juiz | pela PRESENÇA dos arquivos, o fail-fast do executor do legado (`estagioPorPresenca`, `:65`) |
| vermelho | recorte do próprio `gates.txt` (`--- recorte de … ---`) | `gate-vitest.txt` recortado (`recorte.ts:59`) |
| fonte do teste | não há HEAD por tentativa: acoplamento `null` | `git show <head.txt>:<teste>` por `gitLeitura` |
| vizinhos | `BLOQUEADO motivo=base_vermelha arquivos=` de outros ids | todo `FAIL` de `runs/*/attempt-*/gate-vitest.txt` com mtime nas ±6 h (`:31`) |

Recorte do gate de testes (`recorte.ts:59`): âncoras fortes (`FAIL`, `❯ arquivo:N:M`,
`Test Files`, `Tests`, Timeout, EMFILE, ENOSPC, `Cannot find module`) sempre; sem `FAIL`, só
elas; depois as fracas (AssertionError, Expected, Received, `Error:`) e contexto de 6
linhas até 300; quadro de pilha que não cita arquivo de teste nunca entra. Cada linha
guarda o número do original.

Regra de falta: fonte ausente entra em `falta[]` e a classe só é firme com as fontes que a
regra usa. Nada é estimado.

### 13.3 Regras (`extrair.ts:108`)

A primeira que casa decide; o estágio é o da última tentativa. Firme vai ao diagnóstico
sem modelo; palpite (`?`) ou sem regra vai ao modelo, se houver orçamento.

| # | condição | classe | linha |
|---|---|---|---|
| D0 | nenhuma tentativa na série (7f-b3, §15.2): "bloqueado sem tentativa", sem modelo | sem classe | `:182` |
| D1 | merge recusado por mudança local (`overwritten by merge`) e juiz aprovou | R5 árvore suja | `:194` |
| D2 | diff-cap e diff.stat ≤ `diff_cap_linhas` | R6 | `:207` |
| D3 | diff-cap e diff.stat > cap | R3? | `:207` |
| D4 | `Timeout waiting for worker`/`Timeout starting`/EMFILE/ENOSPC na última tentativa | R5 máquina | `:217` |
| D5 | o motor do kit já decidiu `base_vermelha`; ou o vermelho fora da allowlist e do diff aparece em outra família nas ±6 h | R5 base | `:224` |
| D6v | vermelho fora da allowlist e do diff que o executor já ampliou nesta série (`allowlist-ampliada.txt` de alguma tentativa; etapa 8c, §21.5): rótulo "teste já ampliado pelo executor", firme, sem `r1_testes`; o resolvedor só avisa | R1 (sem ação) | `extrair.ts:D6v` |
| D6b | enforcement na última tentativa com UMA violação, `fora_do_pathspec` de um arquivo que estava vermelho fora da allowlist e do diff nessa tentativa ou na anterior (7f-b3, §15.1) | R1 | `:239` |
| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff; firme só com o mesmo teste vermelho fora em ≥ 2 tentativas da série, senão `R1?` (7f-b1-7) | R1 / R1? | `:261` |
| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:277` |
| D8 | enforcement | R1? | `:281` |
| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:286` |
| D10 | vitest, vermelho dentro | R2? | `:286` |
| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:292` |
| D12 | critério | R2? | `:292` |

Allowlist pelo `matchesAllowlist` do enforcement (`enforcement-core.ts:178`); local do
vermelho pelo `primeiroLocal` (`diagnostico.ts:109`). A prova de um vermelho é a linha
`FAIL`, o erro logo abaixo e o local `❯`. O que o agente disse nunca entra em regra.

Placar na fixture dos 37 (estado da passada): 16 firmes certos (15 até a 7f-b3; o 346d
voltou pela D6b), 0 firme errado, 13 palpites certos, 7 errados, 1 sem regra; no instante
do bloqueio, 14 firmes (760 e 898 #31 ficam `R5?` até o vizinho aparecer). Nenhum dos 20
de controle e nenhum dos 5 de série cortada sai firme.

A restrição da D6 (7f-b1-7, decisão do chat do programa) existe porque um vermelho fora da
allowlist numa tentativa só pode ser mérito que o próprio agente resolve no retry: os 5
controles cortados na última tentativa que reprovou (671d, 624, 627e, 808, 367) saíam R1
firme, e errado. O preço é o 346d, R1 de verdade com o vermelho numa tentativa só (na T2 o
mesmo teste aparece como violação de enforcement): virava `R1?` e ia ao modelo. Desde a
7f-b3 a D6b o pega (§15.1).

### 13.4 Saída (`saida.ts`)

Raiz: `ORQ_DIAG_DIR` ou `~/.orq/diagnosticos` (`raizDiagnosticos`, `:25`).

| caminho | o quê |
|---|---|
| `<repo>/<id>.json` | o diagnóstico atual (`$schema_versao: 1`, formato da spec §5) |
| `<repo>/<id>.lock` | trava `O_EXCL` com pid e hora; órfã depois de 10 min (`travar`, `:160`) |
| `<repo>/<id>/historico/<assinatura12>.json` | os anteriores (`gravarDiagnostico`, `:200`) |
| `<repo>/<id>/<assinatura12>/evidencia/<caminho original>` | cópia do que foi lido, recortada e mascarada (`copiarEvidencia`, `:213`) |
| `custo.json` | ledger do modelo: `{dias: {"AAAA-MM-DD": [{repo, id, assinatura, custo_usd, tokens_in, tokens_out}]}}`; `reserva: true` durante a chamada e `custo_desconhecido: true` quando ela começou e não devolveu custo (7f-b3, §15.3) |

`<repo>` é o `nome` do `repos.json` (padrão: o nome do diretório), o mesmo do painel.

Regras duras:
- **Guarda** (`saida.ts:79`): toda escrita resolve o caminho real e LANÇA se ele não está
  sob a raiz, ou está sob qualquer caminho do `repos.json` ou sob o repo triado. Raiz
  dentro de um repo lança no construtor.
- **Git** (`git.ts:24`): só `gitLeitura`, com `GIT_OPTIONAL_LOCKS=0`; verbos `show`, `log`,
  `rev-parse`, `ls-tree`, `status --porcelain`; outro verbo lança antes de existir processo.
- **Assinatura** (`saida.ts:152`): sha256 de repo, id, status, nota e nome/mtime/tamanho de
  cada arquivo lido; o arquivo lido em recorte (a trilha) entra pelas faixas e pelo
  conteúdo recortado, não pelo stat (7f-b4, §16.1). Mesma assinatura: não roda (só
  `--forcar`, ou o diagnóstico gravado sem modelo quando o modelo volta, §16.3).
  Assinatura nova: o anterior vai para o histórico.
- **Passada** (`--passada`, `triar.ts:133`): sem modelo; só diagnósticos de até 6 h com
  classe em palpite; grava só se a extração ficou firme (promove).
- Ticket que saiu de `bloqueado`: o diagnóstico fica, com `encerrado_em` (`triarRepo`, `:203`).
- `arvore_alvo_agora`: `git status --porcelain` da worktree alvo, só registro, nunca prova.
- Máscara (`mascara.ts:22`): `sk-…`, JWT, `service_role`, `SUPABASE_*=`/`*_KEY=`/`*_TOKEN=`
  com valor, e-mail → `‹segredo›`, antes de qualquer envio e na cópia.

### 13.5 Modelo e tetos (`modelo.ts`)

Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.erro`).

- Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json` (`lerConfigModelo`, `:63`):
  `modelo` (padrão `claude-opus-5-5`; `null` desliga), `teto_dia_usd` (3,00),
  `teto_caso_usd` (0,30), `teto_corte_usd` (0,60, 7f-b1b), `entrada_max_tokens` (30000),
  `timeout_secs` (120), `prompt` (`spec`; `7f-b1b-r3` é a proposta de §13.7).
  `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia; `ORQ_TRIADOR_PROMPT`, o prompt. Prompt
  desconhecido é erro.
- Entrada (`montarEntrada`, `:161`): as 7 seções da spec §4 (ticket; extração; recorte do
  vitest; critérios FALHA; diff.stat; juiz; o que o agente disse, 3000 + 1500 caracteres),
  cortadas de baixo para cima até `entrada_max_tokens × 3,5` caracteres, e mascaradas. O
  diff cru não entra. O prompt padrão é o literal da spec (`prompt.ts`, `PROMPT`).
- Chamada (`chamar`, `:223`): `claude -p --output-format json --model <m> --allowedTools ""
  --max-turns 1 --max-budget-usd <teto_corte>`, prompt pela entrada padrão. O binário é
  `ORQ_TRIADOR_CLAUDE` ou `claude`; sob teste (vitest ou `ORQ_TESTE=1`) sem
  `ORQ_TRIADOR_CLAUDE`, a chamada é recusada. Com uma volta só, o `--max-budget-usd` não
  impede o gasto: a volta é paga e, acima do corte, o CLI devolve `error_max_budget_usd`
  sem `result` (§13.7). Por isso o corte (0,60) fica acima do teto do caso (0,30), que só
  marca `custo_acima_do_teto` no ledger, como na spec §4.
- Envelope (`lerEnvelope`, `:244`): o de erro do CLI, sem `result`, é lido como `is_error`
  com `subtype`, `errors` e o custo pago, que vai ao ledger.
- Teto do dia (`criarPassoModelo`, `:453`): a chamada só sai se gasto do dia + corte ≤
  teto do dia (entrada sem custo conhecido conta como o corte, `gastoDoDia`, `:384`);
  senão `modelo: {pulado: "teto_dia"}` e vale a extração. Desde a 7f-b3, reserva antes,
  custo real depois, devolução se a chamada não começou (§15.3).
- Resposta (`lerResposta`, `:299`): a última linha JSON com `classe` em R1-R7. Cada
  evidência tem de ser de um arquivo lido e de uma linha que ele tem (no recorte, uma
  linha guardada); a que não confere sai e conta `evidencia_descartada`
  (`conferirEvidencia`, `:325`). A resposta do modelo nunca é firme.
- Descarte (`Descarte`, `:378`): toda resposta descartada grava `modelo.erro` e
  `modelo.descartado = {regra, trecho}`, com `regra` em `nao_iniciou` (7f-b3),
  `envelope_ilegivel`,
  `teto_corte_cli`, `envelope_is_error`, `resposta_sem_classe` ou
  `evidencia_nenhuma_confere`; vale a extração, e o placar mostra
  `[descartado: <regra>: <trecho>]`.

### 13.6 Fixture e testes

`test/fixtures/triador-7f/`: os 37 bloqueios da medição de 09/10, 20 done de controle e,
em `cortados/`, 5 controles cortados na última tentativa que reprovou, montados por
`montar.py` (só leitura do comarka-operacional, git com `GIT_OPTIONAL_LOCKS=0`; os
cortados saem de `controle/`, `--so-cortados`), cada um com `esperado.json` (classe e
evidência da medição, com a linha da tabela; nos de controle e cortados, `firme_proibido`). `orq triar --fixture <dir> [--casos a,b,…]` (`corrida.ts:51`) roda o triador sobre
os 37 (ou só os casos pedidos) e imprime o placar (C) da spec §7.2; é a corrida da peça 6.
Os 22 palpites trazem `resposta-modelo.json`, a resposta gravada na corrida real (§13.7).

Testes: `orquestrador-triador-{fixture,leitores,extrair,aceite,saida,modelo}.test.ts`. O
`claude` deles é `test/fixtures/claude-envelope/triador-stub.sh`; o do PATH é uma trava.

### 13.7 Etapa 7f-b1b: replay da corrida real e conserto do descarte (10/10/2026)

A corrida real da peça 6 (`~/orq-sessoes/corrida-7f-peca6.txt`) deu 21/37 no aceite (C),
que pede ≥ 30.

- **Replay.** As 22 `resposta-modelo.json` de `~/.orq/corrida-7f-peca6/` estão na fixture.
  O aceite (C) roda a corrida com o stub devolvendo cada `envelope_bruto` gravado (com o rc
  da corrida), pelo parser, pela conferência e pelo ledger de verdade, no relógio e no teto
  da corrida. Sem chamada de API. Sem conserto, o placar sai igual, byte a byte, ao da
  corrida: 21/37, 22 chamadas, US$ 4,1376.
- **Os 6 `[extracao]` sem motivo** (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707): o
  CLI cortou no `--max-budget-usd` = teto do caso (0,30) DEPOIS da volta paga (US$ 0,31 a
  0,40) e devolveu `error_max_budget_usd` sem `result`. `lerEnvelope` exigia `result`: o
  envelope virava "ilegível" e o custo sumia do ledger e do placar (a corrida pagou
  US$ 6,1265, não 4,1376). Conserto: corte do CLI separado (`teto_corte_usd`), o envelope de
  erro entra no ledger com o custo, e o descarte `teto_corte_cli` sai no placar. No replay,
  0 dos 6 passam a usar a resposta do modelo: o envelope não tem `result` para recuperar.
- **Evidência equivalente** (só no teste de aceite): além da evidência da medição (±3), vale
  a que existe na cópia, cujo trecho está na linha, que carrega o sinal da classe e sustenta
  o remédio (R1: vermelho de teste fora da allowlist citado no remédio; R2: bloco `FALHA` de
  `criterio[i]` citado no remédio; R3: juiz ou log com token, lista fechada, autorização,
  `liberacoes.json`, DDL/FK, refatiar ou motor, e remédio de decisão; R4: vermelho de teste
  dentro da allowlist, e remédio de ticket). R5, R6 e R7 só contam com a da medição. Dos 8
  "classe certa, evidência fora", 7 valem; o 741 não (nenhum artefato mostra a falta de
  código). Placar: 28/37.
- **R3 no prompt:** proposta `7f-b1b-r3` (`prompt.ts`, `R3_7F_B1B` `:84` e
  `REGRAS_R3_7F_B1B`), só por opt-in; virar padrão é mudar a spec. A mini-corrida paga (9
  casos, teto US$ 5,40) está em `~/orq-sessoes/corrida-7f-r3.cmd` e não foi rodada.

## 14. Etapa 7f-b2: resolvedor de bloqueios rodando sozinho (10/10/2026)

O triador (§13) diagnostica; o resolvedor age. A cada passada, para cada repo do
`~/.orq/repos.json`, ele tria os bloqueados com o triador existente e conserta sozinho o
que a classe e o modo do repo permitem, registrando tudo para aprender. Decisões do chat
do programa; gabarito: os consertos humanos de 10/10 no comarka-operacional (`7787af3`:
840 R1 e 929 R2; `819c49a`: 940 e 932 R5 árvore suja).

Código: `scripts/orquestrador/resolvedor/`. Comandos: `orq resolver` e `orq desfazer`
(`cli.ts`, despachados pelo `scripts/orq` antes do `lib.sh`, como o `triar`). Job:
`resolvedor/instalar-job.sh` (§14.7).

### 14.1 Passada (`passada.ts:118`)

```
orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]
```

1. Interruptor: existindo `ORQ_RESOLVEDOR_PAUSADO` (padrão `~/.orq/RESOLVEDOR_PAUSADO`),
   nada roda: nem triagem, nem ledger (`passada.ts:121`); vale também entre um ticket e
   outro.
2. Trava global: `resolver.lock` com `O_EXCL`, pid e hora, órfã depois de 15 min
   (`travarPassada`, `caminhos.ts:104`). Outra passada segurando: nada roda.
3. Os repos em ordem de modo (7f-b3, §15.4): os com alguma classe em `auto`, depois os
   com alguma em `sombra`, depois os só em `diagnostico`; empate na ordem do repos.json.
   É a ordem de consumo do teto do dia do modelo.
4. Por repo, antes da triagem: o desfecho das ações e propostas anteriores e a
   promoção/rebaixamento (§14.6); o modo que vale na passada já é o novo.
5. Os bloqueados, do que tem mais tickets esperando por ele ao que tem menos
   (`ordenarBloqueados`, `passada.ts:64`): tickets fora de `done`/`obsoleto` com o id em
   `dependencias` (direta); empate pela ordem do arquivo.
6. Cada um pelo `triarTicket` (§13); mesma assinatura: vale o diagnóstico gravado. O
   modelo entra como no `orq triar` (só palpite e sem regra), com teto de **US$ 5,00 por
   dia** (`TETO_DIA_USD`, `passada.ts:32`; `ORQ_RESOLVEDOR_TETO_DIA` sobrepõe), contado
   no mesmo `custo.json` do triador.
7. A decisão (§14.2) e a ação (§14.3, §14.4).

`--dry-run`: não escreve no repo, não chama modelo, não toca o ledger nem as propostas;
o que faria (com o diff) vai para `dry-run.jsonl` e para a saída, uma linha por
bloqueado: `repo id deps=N classe regra [firme] modo acao feito motivo [commit] [proposta]`.

### 14.2 Modos e decisão (`modos.ts`, `decidir.ts:38`)

Campo `resolvedor` de cada item do `repos.json` (o resto do item é o que o painel já lê,
`lerRepos`): ausente → `diagnostico` em toda classe; uma string → a mesma em toda classe;
um objeto `{"padrao": …, "R1": …, …}` → por classe. Repo fora do `repos.json` (passado por
caminho) fica em `diagnostico`.

| classe (regra) | auto | sombra | diagnostico |
|---|---|---|---|
| R5 árvore suja (D1), firme | reabre quando a worktree alvo está limpa | proposta | só triagem |
| R5 máquina (D4), firme | reabre com carga ≤ 0,75 por CPU e ≥ 2 GiB livres | proposta | só triagem |
| R5 base vermelha (D5) | aviso | aviso | só triagem |
| R1 (D6 ou D6b), firme | allowlist com guarda, critério da lista, reabre | proposta | só triagem |
| R2 (firme ou palpite) | **proposta** (nesta etapa R2 nunca aplica) | proposta | só triagem |
| R3, R4, R6, R7; palpite fora de R2; sem classe | aviso | aviso | só triagem |

Só diagnóstico firme da extração aplica; a resposta do modelo nunca é firme. Config de
partida (decisão do chat do programa, o humano escreve no `repos.json`): comarka-operacional
`{"padrao": "diagnostico", "R1": "auto", "R5": "auto", "R2": "sombra"}`; repos do kit sem o
campo.

### 14.3 Ações (`acoes.ts:73`, `r1.ts:106`, `r5.ts:46`, `ticket-md.ts`)

O ticket é editado no texto do 1º bloco json, só onde muda, no recuo que o arquivo usa;
toda edição é conferida por parse contra o objeto esperado, senão nada é escrito
(`editar`, `ticket-md.ts:154`). O diff é o que o humano fez à mão.

- **Reabrir** (`reabrir`, `ticket-md.ts:173`): `status` → `pendente`, `notas_status` → `""`.
  É o que o humano fez no 840, no 940 e no 932 (no 940/932 o `done` de `819c49a` é o loop
  rodando depois do reabrir: merges `dd94c08` e `4d52ef7`).
- **R1** (`planejarR1`, `r1.ts:106`): o teste do remédio (`pôr <teste> na allowlist`),
  único em `fora_da_allowlist_e_do_diff`, vai para o fim de `pathspec_allowlist`; todo
  critério cujo `cmd` cita todos os caminhos da allowlist entre aspas simples ganha o mesmo
  caminho depois do último; a guarda entra depois da última `tipo: guarda` (ou antes do
  avaliador) com o `cmd` do 840 letra por letra (`cmdGuarda`, `r1.ts:63`): `it(`+`test(` e
  `expect(` no mínimo a contagem ATUAL do teste no branch alvo (`branch_alvo`, local e depois
  `origin/`, por `gitLeitura`), contada por linha como o `grep -c`, e zero
  `.skip/.only/.todo`; e o ticket reabre. Não age se o teste já tem skip/only/todo, não
  existe no alvo, ou há mais de um vermelho fora.
- **R5** (`condicaoR5`, `r5.ts:46`): D1, `git status --porcelain` vazio na worktree alvo
  (`worktrees_dir`/`branch_alvo`, os do triador); D4, a máquina (`ORQ_RESOLVEDOR_MAQUINA`
  troca a leitura nos testes). A condição não sumiu: "não consegui" com o motivo.
- **Sombra**: o mesmo plano vira `<repo>/<id>/proposta.md` (o diff) e `.json`; o repo não é
  tocado.

### 14.4 R2 em sombra (`r2.ts:162`, `agirR2` `acoes.ts:137`)

Forma tratada: critério que reprovou com `unbound variable` por `v=$(grep -c …)` sem
`|| true` numa corrente com `&&` sob `set -euo pipefail`. Conserto (`consertarUnbound`,
`r2.ts:60`), o do humano no 929 letra por letra: `|| true` dentro de cada `$(grep -c …)` e
toda expansão dessas variáveis como `${v:-x}`. A prova roda o critério no harness do
executor (`out="$( ( cd … && eval "$cmd" ) 2>&1 || true )"` sob `set -euo pipefail`), numa
pasta temporária com cópias dos arquivos que o cmd cita: no branch alvo (trabalho não
feito) o novo tem de rodar sem abortar e REPROVAR; o antigo e o head da última tentativa
entram como registro. cmd que chama git, npx, node, gerenciador de pacote, shell ou
`scripts/` não é provado ("não consegui"). Saída: `<repo>/<id>/proposta.md` (cmd antigo e
novo, tabela da prova, diff) e `proposta.json` (com o conteúdo dos arquivos da prova, para
a comparação), uma por assinatura. Nunca aplica, nem no modo `auto`.

### 14.5 Travas e escrita (`repo.ts`, `caminhos.ts`)

- **Uma ação por ticket**: com uma `acao` no ledger, o próximo bloqueio do mesmo ticket vai
  para humano ("não consegui: segunda vez bloqueado"), mesmo depois de `orq desfazer`.
  **Trocada na 7f-b7 (§18.2)**: uma ação por bloqueio, no máximo 2 por ticket.
- **Interruptor** e **trava global**: §14.1.
- **Espera git** (`esperarGit`, `repo.ts:66`): nem `index.lock`/`HEAD.lock` no git dir, nem
  processo `git` (`pgrep -x git`; `ORQ_RESOLVEDOR_PGREP` nos testes), até
  `ORQ_RESOLVEDOR_ESPERA_GIT_S` (60 s); passou do teto, não escreve.
- **Só o arquivo do ticket** (`confereTicket`, `repo.ts:40`): `docs/fila/<id>-<slug>.md`, o
  caminho real dentro de `docs/fila`, não symlink; e como foi lido (outro processo mexeu:
  não age).
- **Commit** (`escreverEComitar`, `repo.ts:92`): `git commit --only -- <arquivo>` (o resto
  do índice fica), mensagem `orq-resolvedor: <id> <classe> <regra>: <o que mudou>` e o
  trailer **`Orq-Resolvedor: <classe> <regra> <assinatura do diagnóstico>`**
  (`trailer`, `repo.ts:77`). **Nunca `--no-verify`** (`gitEscrita` recusa): o hook do repo
  (no Comarka, `validar-fila`) é a segunda trava; recusou, o arquivo volta ao que era. Commit
  com outro arquivo ou outro pai: "não consegui", alto. Nunca push; nenhum outro verbo de
  escrita.
- **Fora do repo** (`GuardaResolvedor`, `caminhos.ts:39`): só sob `ORQ_RESOLVEDOR_DIR`
  (padrão `~/.orq/resolvedor`) e o próprio `repos.json`; nunca dentro de um repo do
  `repos.json`. Troca atômica.
- No repo instalado, leitura só por `gitLeitura` (`GIT_OPTIONAL_LOCKS=0`); nenhum script do
  repo roda (o hook é do `git commit`); runs, locks, sentinelas e `_worktrees` só lidos.
  Exceção desde a 7f-b5: `orq-pause.sh --off` do repo, só com `pausa_gate: auto` e
  veredito `falso_positivo` (§17.4). Antes de trocar o ticket, a trava de tentativa nova
  (§17.5).

### 14.6 Ledger, desfecho, promoção (`ledger.ts`, `desfecho.ts`, `promocao.ts`)

`~/.orq/resolvedor/ledger.jsonl`, só acrescentado, uma linha JSON por fato:

| tipo | quando | campos |
|---|---|---|
| `acao` | ação aplicada | classe, regra, assinatura, `acao`, `mudou`, `commit`, `arquivo`, `copia` (`acoes/<ts>/antes.md` e `depois.md`), `bloqueado_em`, `tempo_ate_destravar_s` |
| `proposta` | proposta nova em sombra | `acao`, `mudou`, `proposta`, `proposta_json` |
| `nao_agiu` | "não consegui" | `acao`, `modo`, `motivo`; uma por (ticket, assinatura, motivo) |
| `aviso` | classe sem ação | idem |
| `desfecho` | ação fechada (`apurarAcoes`, `desfecho.ts:45`) | `desfecho`: `done` (bom), `bloqueou_de_novo`, `humano_mexeu` (o json fora de `status`, `notas_status`, `tentativas`, `adiamentos_ambiente` difere do gravado) ou `desfeito`; `bom`, `tempo_ate_desfecho_s` |
| `comparacao` | proposta R2 contra o humano (`apurarPropostas`, `desfecho.ts:104`) | `resultado` `acerto` (`igual`, ou `equivalente`: mesma saída nos estados guardados na proposta) ou `erro` (`diferente`, ou `humano_nao_trocou`: saiu de bloqueado com o cmd antigo); bloqueado com o cmd antigo: espera |
| `promocao`, `rebaixamento` | o modo mudou sozinho (`promoverRebaixar`, `promocao.ts:44`) | `classe`, `de`, `para`, `motivo`, `considerados` |
| `desfeito` | `orq desfazer` | `commit_desfeito`, `commit` |

Promoção: R2 em sombra sobe para `auto` com **9 acertos nas 10 últimas** comparações
(nesta etapa, R2 em auto continua só propondo). Rebaixamento: qualquer classe em `auto`
volta para `sombra` com **2 desfechos ruins seguidos** (para R2, comparação com erro). Só
conta o que veio depois da última mudança de modo daquela classe no repo. A mudança vai ao
ledger e ao `repos.json` (`gravarModo`, `modos.ts:89`: só o campo `resolvedor` daquele
item; item string vira objeto).

### 14.7 `orq desfazer` e o job

`orq desfazer <repo> <id>` (`desfazer.ts:34`) reverte a última ação do ledger no ticket só
se o commit tem o trailer `Orq-Resolvedor` igual ao do ledger, nenhum commit depois toca o
arquivo e o arquivo no disco é o do commit (nem writeback do loop). Volta à cópia do antes,
pela mesma porta, com o trailer `Orq-Resolvedor-Desfaz: <sha>`; ledger `desfeito` e
desfecho `desfeito`. Não respeita o interruptor (é o comando do humano).

Job (`instalar-job.sh`, `com.orq.resolvedor.plist.template`, `job.sh`): label
`com.orq.resolvedor`, um por máquina, `StartInterval` 300, `job.sh` sai em 0 com o
interruptor antes de chamar o node e roda `orq resolver` (trava global na passada); log em
`~/.orq/resolvedor/job.log`. `--dry-run` só imprime o plist; com `ORQ_TESTE=1` ou de
checkout sob `/tmp`, só o `--dry-run` roda. Quem instala é o humano, do checkout principal
do kit. Desde a 7f-b4, o PATH do plist tem o diretório do `claude`, e o job sem ele
segue só com extração (§16.3).

### 14.8 Testes

`orquestrador-resolvedor-{gabarito,passada,acoes,r2,ledger,promocao,desfazer,job}.test.ts`
sobre repos `git init` em pasta temporária com os tickets reais (`test/resolvedor-repo.ts`,
fixture `test/fixtures/resolvedor-7f/`, montada por `montar.py`, só leitura do Comarka);
`~/.orq` só por variáveis (`ORQ_REPOS`, `ORQ_DIAG_DIR`, `ORQ_RESOLVEDOR_DIR`,
`ORQ_RESOLVEDOR_PAUSADO`, `ORQ_RESOLVEDOR_PGREP`). Gabarito: o 840 sai igual ao commit
humano (só a `descricao` da guarda é livre), o 940 e o 932 mudam as mesmas duas linhas para
`pendente` e nota vazia, o 929 só ganha a proposta com o cmd do humano.

## 15. Etapa 7f-b3: ajustes do primeiro dia do resolvedor (11/10/2026)

O job `com.orq.resolvedor` rodou o primeiro dia em 11/10. Três defeitos, medidos em
`~/.orq/diagnosticos` e no comarka-operacional (relatório:
`~/orq-sessoes/relatorio-kit-etapa7f-b3.md`):

- o 1006 do Comarka (enforcement `fora_do_pathspec: test/quem-cuida.test.ts`, com o mesmo
  arquivo vermelho em `:137` na tentativa anterior) saiu `R1?`: no legado o enforcement
  roda antes dos gates, então a D6 nunca vê o vermelho em duas tentativas. O humano
  consertou como R1 (`~/orq-sessoes/conserto-1006.md`);
- as 8 entradas do `custo.json` de 11/10 têm `custo_usd: null` e nenhuma chamada real: o
  `claude` não estava no PATH do job (rc 127, 0 a 1 ms, stdout vazio). Contadas como o
  corte (US$ 0,60), comeram US$ 4,80 do teto de US$ 3,00, e o 1006 foi pulado por
  `teto_dia`. 7 delas são bloqueados do Actus sem nenhuma tentativa;
- o teto foi consumido por repos em `diagnostico` antes do Comarka (R1 em `auto`).

### 15.1 D6b · R1 firme pelo enforcement (`extrair.ts:239`)

A última tentativa parou no enforcement com UMA violação, `fora_do_pathspec: <arquivo>`, e
esse arquivo estava vermelho fora da allowlist e do diff nessa tentativa ou na anterior.
São duas provas em duas tentativas (o vermelho e o agente mexendo nele), como a D6 pede.
Sai R1 firme; a evidência é o `FAIL`, o erro, o `❯` e o `enforcement.json`; o remédio
começa por `pôr <arquivo> na allowlist com guarda`, que é o que a ação R1 lê. Vem depois
da D5 (base vermelha ganha). `decidir` trata D6b como D6 (`decidir.ts:49`); a guarda
cita a regra (`descricaoGuarda`, `r1.ts:77`). Fixture: `triador-7f/primeiro-dia/01-1006-L88744`
(`montar.py --so-primeiro-dia`, esperado R1 pelo conserto humano). Na matriz, só o 1006 e
o 346d mudam (`R1?` → R1 firme, os dois certos); zero firme errado nos 37, nos 20 de
controle e nos 5 cortados, nos dois instantes. O replay da corrida da peça 6 fica 22/37,
21 chamadas, US$ 5,8840 (o 346d não vai mais ao modelo).

### 15.2 D0 · sem evidência, sem modelo (`extrair.ts:182`, `triar.ts:167`)

Série sem tentativa sai "bloqueado sem tentativa": classe nula, regra D0, a nota do ticket
(`notas_status`) de evidência, e no remédio cada dependência ainda não `done` com o estado
(`espera 517 (pendente), 518 (bloqueado)`) e cada token `humano:` sem liberação no
`docs/fila/liberacoes.json` (`jaLiberado`). O estado vem do leitor (`estadoDasDependencias`,
`leitor.ts:43`); sem tentativa, ele entra na assinatura (`saida.ts:154`): dependência que
fica `done` faz o ticket ser triado de novo. O modelo não é chamado e o ledger não é
tocado: `modelo: {modelo: null, pulado: "sem_tentativa"}`. Fixture:
`triador-sem-tentativa/actus-1110` (`montar.py`, só leitura do Actus), os 7 de 11/10.

### 15.3 Custo real sempre (`modelo.ts`: `reservar` `:393`, `acertar` `:402`)

Antes de chamar, o `custo.json` ganha a reserva do pior caso (`reserva: true`, o corte).
Depois:

| o que aconteceu | o ledger fica com |
|---|---|
| envelope com `total_cost_usd` (sucesso, `is_error`, `error_max_budget_usd`) | o custo real |
| o processo não começou (`ENOENT`, `EACCES`, `ENOTDIR`, `EPERM`: `chamar`, `:232`) | nada: a reserva é devolvida; `modelo.descartado.regra = nao_iniciou` |
| a chamada foi recusada sob teste (sem stub) | nada |
| começou e não devolveu custo (timeout, envelope ilegível) | `custo_usd: null`, `custo_desconhecido: true`: conta o corte, o único limite do que pode ter sido pago |

`gastoDoDia` não mudou: soma o custo, e o corte onde ele é nulo (a reserva em curso e o
custo desconhecido). A entrada nula de antes da 7f-b3, sem marca, também conta o corte.
O placar da corrida não conta `nao_iniciou` como chamada.

### 15.4 Teto por prioridade (`ordenarRepos`, `passada.ts:73`)

Na passada, o modo mais forte de cada repo (de qualquer classe, ou o padrão) decide a
ordem: `auto`, depois `sombra`, depois `diagnostico`; empate na ordem do repos.json. O
teto do dia é consumido nessa ordem. Vale dentro de uma passada: uma passada anterior que
já gastou o teto não é desfeita.

### 15.5 Testes

`orquestrador-triador-aceite.test.ts` (primeiro-dia: o 1006 R1 firme D6b nos dois
instantes; (B) com os 16 firmes da spec; replay 22/37), `orquestrador-triador-sem-tentativa.test.ts`
(os 7: zero chamada, ledger vazio, D0, dependências no remédio),
`orquestrador-triador-custo-real.test.ts` (o 243 com o binário ausente; 8 que não
começam e a 9ª sai; reserva só durante a chamada; erro com custo; timeout; recusa; o teto
só com gasto real), `orquestrador-resolvedor-prioridade.test.ts` (com US$ 4,30 de US$ 5,00,
o Comarka em auto chama e o Actus em diagnostico, listado antes, fica pulado) e
`orquestrador-resolvedor-passada.test.ts` (D6b decide `r1_allowlist`).

## 16. Etapa 7f-b4: ligar o modelo do triador com segurança (11/10/2026)

O job de 11/10 nunca chamou o modelo: o `claude` (em `~/.local/bin`) estava fora do PATH
do plist (§15). Antes de pô-lo no PATH, dois defeitos que o modelo ligado tornaria pagos
(relatório: `~/orq-sessoes/relatorio-kit-etapa7f-b4.md`):

- o 243 do conteudos-infinitos ganhou 24 assinaturas em 11/10, uma a cada ~30 min, sem
  tentativa nova: a assinatura levava o stat do `runs/events.log` inteiro, e o loop do
  repo acrescenta 3 linhas a cada drenagem (`--- DRENAGEM_INICIO`, `--- OCIOSO …
  244=dependencia:243:bloqueado`, `--- DRENAGEM_FIM`). A cópia da evidência das 24 é
  igual byte a byte;
- a prioridade da 7f-b3 (§15.4) vale dentro de uma passada: repos em diagnostico com
  bloqueio novo em passadas anteriores ainda esgotam o teto antes de um bloqueio em auto.

### 16.1 Assinatura estável (`assinatura`, `saida.ts:152`)

A assinatura só muda quando muda algo do próprio ticket: o arquivo do ticket, os
artefatos das tentativas dele (stat), a trilha DELE e o motivo do bloqueio. O arquivo lido
em recorte (`Lido.faixas`: o `events.log` do kit, o `local-loop.log` do legado, que são de
todos os tickets) entra como `arquivo | recorte | faixas | sha256(conteúdo recortado)`,
nunca pelo mtime e tamanho do arquivo inteiro. Os arquivos inteiros seguem pelo stat.
Gabaritos e a matriz da 7f-b3 iguais (63 linhas, `diff` vazio). A guarda do replay da
corrida da peça 6 (resposta gravada da mesma evidência) confere pela fórmula da corrida.

Efeito único no merge: todo diagnóstico existente muda de assinatura uma vez (fórmula
nova) e é triado de novo; com o modelo, só o que não é firme nem D0 chama.

### 16.2 Fatia do teto para auto (`teto_reserva_auto`; `passoModelo`, `passada.ts:117`)

Chave nova no topo do `~/.orq/repos.json`: `teto_reserva_auto`, de 0 a 1, padrão **0.7**
(ausente ou fora de 0..1: 0.7; `lerTetoReservaAuto`, `modos.ts:73`). Repo em auto
(`emAuto`, `passada.ts:84`: alguma classe, ou o padrão, em `auto`) usa o teto do dia
inteiro. Repo fora de auto (sombra e diagnostico) confere também a fatia
(`criarPassoModelo`, `modelo.ts:471`):

    gasto do dia dos repos fora de auto + corte ≤ (1 − teto_reserva_auto) × teto do dia

Os "repos fora de auto" são os do ledger cujo `repo` não é nome de repo em auto no
repos.json (sombra, diagnostico, e o que não está listado). Passando: `modelo: {pulado:
"teto_reserva_auto"}`, sem reserva, vale a extração. Com o teto padrão do resolvedor
(US$ 5,00), sombra e diagnostico juntos gastam até US$ 1,50 por dia; os US$ 3,50 restantes
só os repos em auto alcançam. Com `--repo X`, os repos em auto são os do repos.json
inteiro (a fatia é do dia, não da passada).

### 16.3 O `claude` no PATH do job (`instalar-job.sh`, `job.sh`, `triar.ts:147`)

- `instalar-job.sh` acha `command -v claude` e põe o diretório (o do link, não o alvo
  versionado, que muda a cada atualização) no PATH do plist, **depois** do `NODE_DIR`
  (o `~/.local/bin` também tem um `node`). Placeholder novo no template: `{{CLAUDE_DIR}}`.
  Sem `claude` no PATH, recusa com `ERRO: claude nao esta no PATH`, rc 1, com ou sem
  `--dry-run`, antes de escrever ou chamar `launchctl`.
- `job.sh`: sem o `claude` (ou o `ORQ_TRIADOR_CLAUDE`), a passada roda com
  `--sem-modelo` (nem chamada, nem reserva no teto), e o job.log ganha UMA linha
  `<ts> MODELO_INDISPONIVEL claude fora do PATH (<PATH>): …` por dia UTC; a marca do dia
  fica em `<resolvedor>/modelo-indisponivel`.
- `triarTicket`: diagnóstico gravado com `modelo: null` (sem modelo) quando o modelo
  cabia (nem firme, nem D0) é triado de novo, uma vez, quando a triagem tem modelo, mesmo
  com a mesma assinatura. Sem isso, o ticket triado com o `claude` fora do PATH nunca
  ganharia o modelo.

### 16.4 Testes

`orquestrador-triador-assinatura-estavel.test.ts` (o 243 com duas drenagens ociosas: a
mesma assinatura; o ticket, uma tentativa nova, o motivo do bloqueio e um artefato
reescrito mudam), `orquestrador-resolvedor-fatia-auto.test.ts` (18 passadas de um repo em
diagnostico com assinatura nova a cada uma; o bloqueio do Comarka em auto que aparece
depois chama; o diagnostico parou em US$ 1,00 de US$ 1,50 com `teto_reserva_auto`; a
leitura da chave), `orquestrador-resolvedor-job-claude.test.ts` (`--dry-run` com o PATH
novo; recusa sem claude; job sem claude: uma linha por dia, nada no teto; o claude volta e
o 243 é triado de novo, uma vez) e `orquestrador-resolvedor-job.test.ts` (um `claude`
falso no PATH do teste: o `--dry-run` agora o exige).

## 17. Etapa 7f-b5: sobras da 7f-b4, pausas e o que a medição do Comarka pediu (11/10/2026)

A medição do comarka-operacional (`~/orq-sessoes/medicao-comarka.md`) apontou a edição
humana de spec de ticket já reprovado (allowlist, critério, dependência) como a maior
causa de intervenção. O PASSO 0 desta etapa mostrou que a "edição no meio da série" é,
quase sempre, edição de ticket BLOQUEADO pelo circuit breaker, com o status ainda não
commitado (o writeback de antes de 01/10), e que a dependência que faltou era, em 5 de 8
casos, para um ticket criado na mesma hora. O chat do programa reduziu a etapa ao que
segue (relatório: `~/orq-sessoes/relatorio-kit-etapa7f-b5.md`).

### 17.1 Pulado pelo teto, refeito uma vez por dia (`triar.ts:152`)

Diagnóstico gravado com `modelo.pulado = "teto_dia"` num dia UTC anterior ao da triagem
(`gerado_em`) é triado de novo quando a triagem tem modelo, mesmo com a mesma assinatura.
O `gerado_em` passa a ser o de hoje: pulado de novo hoje, só amanhã. `teto_reserva_auto`
não entra (é a fatia, §16.2, e volta sozinha quando o repo vai para auto).

### 17.2 Leitor do kit: uma leitura por tentativa real (`leitor-kit.ts:119`)

O diretório de cada `INICIO` da série é a entrada do `runs/<id>/meta.json` com `dir`
(`attempt-N`) cujo `ts` cai depois do INICIO e até o INICIO seguinte; nenhum `dir` é
usado duas vezes. Sem `dir`/`ts` no meta, vale o de antes (`attempt-(attempt=−1)`). O
dado da tentativa (`diffLines`, `duracaoSecs`) vem da mesma entrada. No 243 do
conteudos-infinitos (dois `INICIO attempt=1`: a volta que terminou em `REFATIAR` e a
seguinte) as tentativas são `attempt-0..3`, uma vez cada; antes eram `attempt-0` duas
vezes e nunca o `attempt-3`. Efeito único no merge: a assinatura do 243 (e de qualquer
série com INICIO repetido) muda uma vez.

### 17.3 Aviso de pausa (`pausa.ts`, `passada.ts:207`)

A cada passada (fora do `--dry-run`, e só com o interruptor desligado), o sentinela de
cada repo do repos.json: `pausar_file` do config, `docs/fila/PAUSAR` ou
`docs/fila/.orq-pause`, o primeiro que existir (`lerPausa`, `:38`). Pausa nova, pelo
sha256 do conteúdo, vira UMA vez:

- `osascript` `display notification`, título `orq: <repo> pausado`, corpo a primeira
  linha do motivo sem o carimbo `AAAA-MM-DD HH:MM | ` (e o veredito da §17.4);
- com `notificar.imessage` no TOPO do repos.json (um destinatário ou uma lista; quem
  preenche é o humano), uma mensagem pelo Messages para cada um;
- linha `pausa` no ledger: `arquivo`, `sha`, `motivo`, `notificacao: {macos, imessage}`
  (`enviada`, `falhou`, `sem_osascript`, `nao_configurado`), mais `veredito` e
  `pausa_gate` quando é pausa de gate sistêmico.

Os textos vão ao AppleScript por `argv` (`on run argv`), nunca colados no script. O
sentinela só é lido; quem retoma é o humano, ou a §17.4.

### 17.4 Veredito da pausa de gate sistêmico (`gate-streak.ts`)

Sentinela do loop legado do Comarka: `gate sistemico: "<gate>" reprovou N tickets
seguidos (A,B,…) em <ts>` (`lerPausaGate`, `:51`). Para cada ticket, o
`gate-<gate>.txt` da última tentativa até a hora da pausa + 180 s, entre `attempt-N` e
`attempt-N.prevK` (`artefatoDoGate`, `:75`); os arquivos que falharam (`FAIL` do vitest;
`arquivo(l,c): error TS` do tsc). Veredito (`vereditoDaPausa`, `:122`):

| o que os artefatos mostram | veredito |
|---|---|
| nenhum arquivo falhou em dois ou mais tickets | `falso_positivo` (provável) |
| algum arquivo falhou em dois ou mais | `base_vermelha` (provável), com os arquivos |
| artefato ausente; gate sem lista (`criterio`, `build`, `enforcement`); artefato sem arquivo que falhou; sinal de máquina (worker do vitest, EMFILE, ENOSPC) | `sem_veredito`, com o motivo |

Chave nova no ITEM do repo no repos.json: **`pausa_gate`**: `diagnostico` | `sombra` |
`auto`, padrão **`sombra`** (`pausaGateDe`, `modos.ts:38`). `diagnostico`: só o veredito;
`sombra`: o veredito e o que faria; `auto`: retoma, e só com `falso_positivo`
(`decidirPausa`, `:166`; `retomar`, `:192`):

- pelo script do próprio repo, `bash scripts/orquestrador/orq-pause.sh --off` (nunca `rm`;
  repo sem o script: não retoma). É a única exceção a "nenhum script do repo roda"
  (§14.5), e só neste modo;
- no máximo uma retomada automática por repo a cada 6 h (`JANELA_RETOMADA_MS`), e nunca
  de novo quando o mesmo par (conjunto de tickets) pausar outra vez depois de uma
  retomada (`travaRetomada`, `:150`);
- logo antes, o sentinela tem de ter o mesmo sha que foi lido e o interruptor tem de
  estar desligado; senão, `nao_agiu` com `acao: retomar_pausa_gate`;
- no ledger, `retomada` (`sha`, `par`, `gate`, `veredito`, `saida` do script).

O defeito `docs/defeitos/2026-10-10-streak-zerado-na-pausa-bloqueia-na-retomada.md`
segue aberto no Comarka: a pausa zera o streak, e retomar com a base ainda vermelha
bloqueia o primeiro ticket depois da retomada. A retomada automática só acontece com
`falso_positivo`, onde a base não é a suspeita; o risco fica no veredito errado.

### 17.5 Trava de tentativa nova (`repo.ts:92`, `:107`, `:184`)

Antes de qualquer troca de ticket (ação e `orq desfazer`), o resolvedor compara o estado
do loop com o da leitura (`retratoDoLoop`): as entradas de `<runs>/<id>/` com o maior
mtime de cada uma (o legado arquiva o `attempt-N` em `.prevK` e recria; o kit cria
`attempt-N`) e o tamanho do log do loop (`events.log` do kit ou `local-loop.log` do
legado). Depois da espera do git e antes de escrever (`tentativaNova`), desiste com
`tentativa nova: …` (`nao_agiu` no ledger) se: o ticket está `em_execucao`; uma entrada
de `runs/<id>/` apareceu ou mudou; ou o log ganhou `=== ticket <id> (` (legado) ou
`<ts> <id> INICIO` (kit). O loop do Comarka relê o ticket a cada tentativa e só marca
`em_execucao` depois de ler (recon e prompt, `executor.sh:477-496`): o diretório e a
linha do log vêm antes.

### 17.6 Allowlist sobreposta (R8, D13; só diagnóstico) (`sobreposicao.ts`, `passada.ts:133`)

Par: dois tickets fora de `done`/`obsoleto` com `pathspec_allowlist` sobreposta (o mesmo
caminho, ou um glob de um que casa um caminho do outro) e sem caminho de dependência
entre eles em nenhum sentido (fecho transitivo dos ids; `humano:` não conta). Proposta:
o id MAIOR passa a depender do menor; ciclo é impossível. A passada grava
`<resolvedor>/<repo>/sobreposicoes.json` (o retrato) e uma linha `sobreposicao` por par
novo no ledger (`id` = o maior, `depende_de`, `arquivos`, `classe: R8`, `regra: D13`,
`firme: false`, `modo: diagnostico`). Nunca escreve no repo; não há modo `sombra` nem
`auto` para R8 (a medição, no relatório, decide).

### 17.7 Ledger: tipos novos

| tipo | quando | campos |
|---|---|---|
| `pausa` | pausa nova num repo (§17.3) | `arquivo`, `sha`, `motivo`, `notificacao`, e `veredito`, `pausa_gate` (§17.4) |
| `retomada` | retomada automática (§17.4) | `sha`, `par`, `gate`, `veredito`, `script`, `saida` |
| `sobreposicao` | par novo de allowlist sobreposta (§17.6) | `id`, `depende_de`, `arquivos`, `proposta`, `classe`, `regra`, `firme`, `modo` |
| `nao_agiu` | também `acao: retomar_pausa_gate` e o motivo `tentativa nova: …` (§17.5) | idem §14.6 |

### 17.8 Testes

`orquestrador-resolvedor-pulado-teto.test.ts` (pulado hoje não refaz; pulado ontem refaz
uma vez, com o teto cheio ou livre), `orquestrador-triador-leitor-kit-tentativas.test.ts`
(fixture `test/fixtures/triador-leitor-kit/conteudos-243`, `montar.py` só lê o repo),
`orquestrador-resolvedor-pausa.test.ts` (osascript falso no PATH: um aviso por pausa,
iMessage com `notificar.imessage`, dry-run e interruptor não avisam, sentinela intacto),
`orquestrador-resolvedor-pausa-gate.test.ts` (os três vereditos, máquina, 4 tickets,
`diagnostico`/`sombra`/`auto`, a janela de 6 h, o mesmo par, o sentinela que muda antes da
retomada), `orquestrador-resolvedor-tentativa-nova.test.ts` (a corrida: a tentativa nova
aparece no `pgrep` da espera do git, entre a leitura e a troca; o ticket fica intacto) e
`orquestrador-resolvedor-sobreposicao.test.ts` (os pares, fecho transitivo, ciclo, glob, o
ledger uma vez por par, o repo intocado).

## 18. Etapa 7f-b7: R1 com mais de um vermelho e pausa com dono silenciosa (18/10/2026)

O PASSO 0 (`~/orq-sessoes/relatorio-kit-etapa7f-b7.md`) mostrou que no Comarka não há
janela `pendente` entre tentativas: a reprova vira retry no mesmo processo, com o ticket em
`em_execucao` (`executor.sh:554`, `:799-803`), e `fora_do_pathspec` bloqueia direto
(`:627-652`). Os 22 resgates humanos de allowlist de 04 a 17/10 foram todos em ticket já
bloqueado. A ação "na reprova" (`na_reprova`) saiu do escopo (PECAS, PENDENTES). O que
ficou: o R1 com mais de um vermelho fora da allowlist (4 dos 13 resgates depois de 11/10
recusados por isso, com o humano pondo exatamente os mesmos testes) e o barulho das pausas.

### 18.1 R1 com mais de um vermelho, tudo ou nada (`r1.ts`, `extrair.ts`)

A extração grava, para R1 (D6 ou D6b), `extracao.r1_testes`: cada vermelho fora da
allowlist e do diff com a regra que ele cumpre SOZINHO: `D6b` (o arquivo que o enforcement
barrou, vermelho nessa tentativa ou na anterior), `D6` (acoplado ao diff e vermelho fora em
pelo menos 2 tentativas) ou `null`. Fica fora do `detalhe`, que vai literal ao prompt do
modelo (o prompt não muda).

Com mais de um vermelho fora, o R1 age só se TODOS cumprem D6 ou D6b; se um só não cumpre,
nenhuma ação (`não consegui: … tudo ou nada: <arquivo> não cumpre D6 nem D6b sozinho`).
Cumprindo, num commit só (uma ação): todos no fim da `pathspec_allowlist`, todos no critério
que lista os arquivos permitidos, UMA guarda de contagem por teste (a do 840, medida no
branch alvo) e o ticket reabre. O ledger `acao` ganha `testes` (a lista). Diagnóstico
gravado antes desta etapa (sem `r1_testes`) continua recusando mais de um vermelho até ser
triado de novo.

### 18.2 Uma ação por bloqueio, no máximo 2 por ticket (`acoes.ts`)

Troca a regra de §14.5 ("uma ação por ticket"):

- o MESMO bloqueio com ação no ledger vai para humano: mesma `assinatura`, ou mesmo
  `bloqueado_em` (o `bloqueio.quando`, fim da série pelo `meta.json`). A assinatura sozinha
  não basta: ela lê o mtime do arquivo do ticket, e o `orq desfazer` (ou o writeback do
  loop) a troca sem série nova, o que faria o resolvedor agir de novo no que o humano
  desfez;
- uma série nova (outro bloqueio do ticket reaberto) pode ter a 2ª ação;
- com `TETO_ACOES_TICKET` (2) ações no ticket, só aviso (`aviso` no ledger, `teto de 2 ações
  do resolvedor no ticket`);
- o rebaixamento segue: 2 desfechos ruins seguidos em auto devolvem a classe a sombra (§14).

### 18.2b O R1 com vários testes isolado: `r1_multi` e `limite_apos_r1` (peça 5)

A ação de R1 com 2 ou mais testes (§18.1) é a subclasse **`r1_multi`**:

- modo próprio: `resolvedor.r1_multi` no item do repos.json, opcional; ausente, vale o
  modo do R1 do repo (`modoDaChave`, `modos.ts`). Em sombra, a ação de 2 ou mais testes
  vira proposta (com o prefixo `r1_multi em sombra:`), e a de um teste segue o R1; em
  diagnostico, só aviso;
- contador de desfecho próprio: o desfecho (e o `desfeito` do `orq desfazer`) leva
  `subclasse` (`r1_multi` quando a ação tem `testes` com 2 ou mais, senão a classe), e o
  rebaixamento (§14) conta por ela: 2 desfechos ruins seguidos de `r1_multi` devolvem só
  `r1_multi` a sombra (`rebaixamento` com `classe: r1_multi`; o repos.json ganha
  `resolvedor.r1_multi: sombra`); o R1 de um teste segue em auto.

Ticket que o resolvedor reabriu e que bloqueia de novo por **limite de linhas** é o
desfecho **`limite_apos_r1`** (`limiteDaNota`, `desfecho.ts`): a nota do bloqueio traz
`criterio[i] … obteve '…ESTOUROU_<n>'` (o limite é o `-le <L>` do cmd desse critério; no
Comarka, o `NO_TETO`) ou `diff grande (<n> linhas > <L>)` (o diff_cap). Ele:

- tem `bom: null` e não conta como ruim (nem como bom) para nenhuma subclasse;
- notifica uma vez (macOS e iMessage, como a pausa), quando o desfecho é apurado;
- grava no ledger `proposta_limite` com `criterio`, `limite_atual`, `diff_reprovou` e o
  texto da proposta. **Só proposta**: o resolvedor nunca altera limite de linhas.

Motivo (PASSO 0 e replay da P2): nos 3 resgates reais de dois vermelhos, o humano também
subiu o `NO_TETO` em 40 a 60 linhas; o R1 não sobe. Sem isso, a reprova por limite de um
ticket reaberto rebaixaria o R1 inteiro.

### 18.3 Pausa com dono silenciosa (`pausa.ts`, `modos.ts`)

Chaves novas no ITEM do repo no repos.json:

| chave | padrão | o quê |
|---|---|---|
| `pausa_donos` | `["publicar.sh", "promocao-apolo"]` | donos de pausa planejada |
| `pausa_dono_max_min` | `30` | minutos até a pausa com dono notificar |

Para a pausa nova (o sha do sentinela, §17.3):

- motivo com `FALHOU`: notifica na hora, com ou sem dono; o corpo leva `FALHOU no passo
  <passo>` e o ledger `falhou_passo`;
- motivo com `dono: X |` e X em `pausa_donos`: linha `pausa` no ledger com `dono`,
  `silenciosa: true` e `notificacao: {macos: silenciada, imessage: silenciada}`, sem aviso.
  Se a mesma pausa (o mesmo sha) ainda está lá `pausa_dono_max_min` depois de vista,
  notifica uma vez: `pausa_longa` (`dono`, `minutos`, `limite_min`, `notificacao`);
- o resto (sem dono, ou dono fora da lista): notifica como na §17.3, com `dono` no ledger.

Quando o sentinela some, ou passa a ser outra pausa, a pausa aberta (a última `pausa` do
repo sem `pausa_fim`) fecha: `pausa_fim` com `arquivo`, `sha`, `dono`, `motivo`, `inicio`
(o `ts` da `pausa`) e `duracao_s` (de quando a pausa foi vista até a passada que viu o fim:
resolução de uma passada, 300 s). Só fecha pausa registrada a partir desta etapa (a que tem
`dono` no ledger, mesmo nulo): as de antes não têm hora confiável de fim.

**O limite de 30 min é provisório**: será recalibrado pelo p95 de `pausa_fim.duracao_s` das
pausas com dono depois de 7 dias de `pausa_fim` no ledger. Antes desta etapa a duração da
pausa não estava registrada em lugar nenhum.

### 18.4 Ledger: tipos e campos novos

| tipo | quando | campos |
|---|---|---|
| `pausa` | também a silenciosa (§18.3) | mais `dono`, `silenciosa`, `falhou_passo` |
| `pausa_longa` | pausa com dono passou do limite | `arquivo`, `sha`, `dono`, `motivo`, `minutos`, `limite_min`, `notificacao` |
| `pausa_fim` | o sentinela sumiu ou mudou | `arquivo`, `sha`, `dono`, `motivo`, `inicio`, `duracao_s` |
| `acao` | também o R1 com mais de um vermelho | mais `testes` |
| `desfecho` | também `limite_apos_r1` (§18.2b) | mais `subclasse`; `bom: null` no limite |
| `proposta_limite` | reprova por limite de ticket reaberto (§18.2b) | `id`, `commit`, `acao`, `subclasse`, `criterio`, `limite_atual`, `diff_reprovou`, `proposta`, `notificacao` |
| `rebaixamento` | também `classe: r1_multi` (§18.2b) | idem §14.6 |
| `aviso` | também o teto de 2 ações por ticket | idem §14.6 |

### 18.5 Testes

`orquestrador-resolvedor-r1-multi.test.ts` (1054, 1055b e 1058 reais: os dois testes do
humano, um commit, uma guarda por teste; 924a: tudo ou nada, ticket intacto; o mesmo
bloqueio com o ticket reescrito; a 2ª ação numa série nova; o teto de 2),
`orquestrador-resolvedor-replay-allowlist.test.ts` (os 13 resgates humanos de allowlist
depois de 11/10, fixture `test/fixtures/resolvedor-7f7`, `montar.py` só lê o Comarka: 4
ações idênticas às do humano, zero divergente, 10 sem ação com o motivo) e
`orquestrador-resolvedor-r1-multi-isolado.test.ts` (1054, 1055b, 1006 e 1058 reais num repo
só; nota do bloqueio seguinte em `test/fixtures/resolvedor-7f7/p5`: 2 reprovas por limite
depois de `r1_multi` não rebaixam nada e gravam a proposta; 2 ruins de `r1_multi` devolvem
só ele a sombra, e o 1006 segue aplicando) e
`orquestrador-resolvedor-pausa-dono.test.ts` (as 17 pausas reais de 17 e 18/10, fixture
`test/fixtures/pausas-7f7`: 2 notificações, eram 17; o limite; o FALHOU; a pausa sem dono;
as chaves do item).

## 19. Etapa 8b: riscos ativos do lado do kit (18/10/2026)

Origem: relatório de convergência Comarka × kit de 18/10 (F5, F6, F8 e a coordenação com a
Vigia da fila). Relatório da etapa: `~/orq-sessoes/relatorio-kit-etapa8b.md`.

### 19.1 O commit do loop leva só as chaves do motor (`lib.sh:commit_motor`)

`scripts/orquestrador/campos-do-motor.json` é a lista ÚNICA dos campos que o motor escreve
no ticket: `status`, `notas_status`, `tentativas`, `adiamentos_ambiente`, `adiado_ate`. Ela é
lida pelo `lib.sh`, pelo hash de versão do gate de ticket (`executor.sh`) e pelo
`desfecho.ts`. O preflight recusa sem ela.

`ticket_commit` e `autocommit_status_fila` passam por `commit_motor <msg> <arquivo>…`, que
monta o commit num índice temporário a partir da HEAD:

- ticket sem edição alheia (o bloco sem os campos do motor e a prosa iguais à HEAD): entra o
  arquivo do working tree;
- com edição alheia: entra a HEAD com só os campos do motor do working tree; a edição fica no
  working tree, sem commit; o índice real volta a casar a HEAD; `EDICAO_ALHEIA` na trilha
  (§4.1) e um aviso no log, uma vez por edição (`runs/<id>/.edicao-alheia`);
- ticket fora da HEAD: não entra (`campos=nao_rastreado`).

O commit é `git commit` (os hooks do repo rodam; nunca `--no-verify`) e leva um trailer
`Orq-Loop: <id>` por ticket. No kit o loop roda no checkout principal: a edição alheia
deixada no working tree faz o preflight seguinte recusar por árvore suja, o que é AMBIENTE
(§4.1) e não queima ticket, até o dono da edição commitar.

### 19.2 O resolvedor só commita na branch esperada (`repo.ts:branchEsperada`)

Branch esperada: `branch` do item no repos.json; senão `branch_protegida` de
`docs/fila/000-config.json` do repo; senão `main`. O `escreverEComitar` confere
`rev-parse --abbrev-ref HEAD` logo antes de escrever; fora dela não escreve e devolve
`branch_inesperada: checkout em 'X', esperada 'Y'`.

### 19.3 Pausa com dono é intocável (`gate-streak.ts`)

A pausa de gate sistêmico (§17.4) é só o sentinela cuja primeira linha não vazia COMEÇA por
`gate sistemico: "<gate>" reprovou N tickets seguidos (…)` e não tem `dono:`. A retomada não
chama o `--off` do repo se outro sentinela (`pausar_file`, `PAUSAR`, `.orq-pause`) existir:
o `--off` do kit apaga os dois. Fica de fora a janela entre a conferência do sha e o `rm` do
script do repo (o script é do repo cliente).

### 19.4 Humano mexeu, antes de agir (`humano.ts`)

O R1/R5 em `auto` não age se, depois de `bloqueio.quando` (trilha no kit, `meta.json` no
legado), o arquivo do ticket recebeu um commit que muda algo fora dos campos do motor e não é
do loop (trailer `Orq-Loop`, ou o assunto exato do motor nos commits antigos) nem do
resolvedor (`Orq-Resolvedor`, `Orq-Resolvedor-Desfaz`), ou se há edição sem commit no working
tree fora dos campos do motor. O commit com `Orq-Vigia:` é `quem: vigia`; o resto, `humano`.
O commit que cria o arquivo não conta.

### 19.5 Ledger: tipos novos

| tipo | quando | campos |
|---|---|---|
| `branch_inesperada` | o checkout do repo não está na branch esperada (§19.2) | `repo`, `id`, `branch`, `esperada`, `notificacao` (só na primeira vez do repo naquela branch) |
| `humano_mexeu` | alguém mexeu depois do bloqueio (§19.4) | `repo`, `id`, `classe`, `regra`, `assinatura`, `acao`, `quem` (`vigia`, `humano`, `nao_commitado`), `commit`, `assunto`, `bloqueado_em` |
| `nao_agiu` | também a retomada recusada por outro sentinela (§19.3) | `motivo: outra pausa presente: …` |

O `humano_mexeu` do desfecho (§14.6) passa a ignorar `adiado_ate`, que é campo do motor.

### 19.6 Testes

`orquestrador-edicao-alheia.test.ts` (1361, 1371 e 1377 reais de ba731d8^ e ba731d8, fixture
`test/fixtures/edicao-alheia-8b`), `orquestrador-resolvedor-branch.test.ts` (o 840 real com o
checkout em outra branch), `orquestrador-resolvedor-pausa-dono-intocavel.test.ts` (a pausa de
gate real de 12/10 e a pausa com dono real de 16/10) e
`orquestrador-resolvedor-humano-mexeu.test.ts` (o 840 real com commit `Orq-Vigia`, commit
humano e edição sem commit; controles: edição antes do bloqueio e commit do loop).

## 20. Aplicador de migrations, etapa MIG-A (18/10/2026)

Recon (`~/orq-sessoes/relatorio-recon-migrations.md`): no banco `ogfnojbbvumujzfklkhh` só o
conector do Supabase do claude.ai aplicava (`apply_migration` ou `execute_sql`), por chat,
sessão ou pela skill `aplicar-migration-ddl` do Comarka. A fila do Comarka travava esperando
`humano:migration-<id>-aplicada` (122 tokens liberados à mão em 14 dias). Decisões de 18/10:
um caminho só aplica (este); a escrita vai pela API de gestão com a credencial do `.env.local`
do repo, lida só pelo script; a linha de base de 18/10 é a verdade; o aplicador libera o token
sozinho depois de conferir no ledger; aplicador por banco, não por repo. Código em
`scripts/orquestrador/migrations/`, verbo `orq migrations` (despachado antes do lib.sh, como o
`resolver`). Relatório: `~/orq-sessoes/relatorio-kit-mig-a.md`.

### 20.1 Config por banco (`config.ts`)

Bloco de TOPO `migrations.bancos` no `~/.orq/repos.json`, e não em cada item de `.repos[]`
(E1): o dashboard-comercial escreve no mesmo banco do Comarka, não tem fila, e em `.repos[]`
seria varrido pelo resolvedor e pelo painel. Por banco: `ferramenta` (só `supabase`),
`banco_id`, `timeouts` (`lock_timeout_s` 5, `statement_timeout_s` 60, `http_timeout_s` 120) e
`repos`. Cada repo: `repo` (nome em `.repos[]`) ou `caminho`, `dir`, `refs` (padrão `HEAD`),
`somente_leitura`; o escritor (no máximo um por banco) leva ainda `credencial_env` (o NOME),
`env_arquivo` (`.env.local`), `token` (`formato` `liberadas` ou `v2`, `molde` com `{id}`, `por`)
e `pre_check` (comando do repo, `{arquivo}` vira o `.sql` extraído). Erro por campo; um
`banco_id` em dois bancos e um repo em dois bancos são recusados. Nada no `000-config.json`.

### 20.2 O SQL e a API (`sql.ts`, `supabase.ts`)

Tudo por `POST /v1/projects/<ref>/database/query`. O `POST /database/migrations`, que o
`apply_migration` usa, não recebe versão e grava a hora da aplicação (OpenAPI conferido no
PASSO 0), por isso não é usado (E4). Um texto só, transação IMPLÍCITA (o Postgres roda as
instruções de uma mensagem Query como uma transação):

    select set_config('lock_timeout', '<n>s', true);
    select set_config('statement_timeout', '<n>s', true);
    <corpo do arquivo>
    ;
    insert into supabase_migrations.schema_migrations(version, name, statements, created_by)
      values (<versão do arquivo>, <nome do arquivo>, array[<instruções>], 'orq-aplicador:<usuário>');

Os literais vão em dollar-quote com etiqueta aleatória que não aparece no texto. A tabela tem
`version`, `statements`, `name`, `created_by`, `idempotency_key` e `rollback`, sem default nem
trigger (medido pelo chat em 18/10); o aplicador grava as quatro primeiras.

O ENVELOPE `begin;` (primeira instrução) e `commit;` (última), que 77 de 77 migrations do
Comarka desde 16/10 trazem, é tirado; o resto vai byte a byte. Recusa: begin, commit, end,
rollback, savepoint ou release no meio; envelope pela metade; `CONCURRENTLY`; `VACUUM`;
`ALTER SYSTEM`; literal ou comentário sem fim. O leitor conhece `--`, `/* */` aninhado,
`'...'`, `E'...'`, `"..."` e `$tag$...$tag$`: `;` e `commit` dentro de corpo de função não contam.

Respostas: 2xx legível = ok; 4xx = erro certo (o Postgres recusou, nada ficou); 5xx, timeout,
rede ou corpo ilegível = INCERTO. A credencial sai do `env_arquivo` do repo pelo nome e toda
mensagem passa por `mascarar` (o valor, o miolo sem `sbp_` e qualquer `sbp_...`). Com
`ORQ_TESTE=1` só fala com `http://127.0.0.1:<porta>` (`ORQ_MIGRATIONS_API`); sem ele, só com
`https://api.supabase.com`.

**Sonda** (`QUERY_SONDA`): `set_config('orq.sonda', txid_current()::text, true)` e, na mesma
mensagem, `current_setting('orq.sonda')::bigint = txid_current()`. Obrigatória por banco
(`<banco>.sonda.json` com `mesma_transacao: true`), porque o aplicador é genérico. No
`ogfnojbbvumujzfklkhh` o chat mediu verde em 18/10.

### 20.3 Linha de base e plano (`plano.ts`)

`orq migrations linha-base <banco> [--corte V] [--herdados-desde V] [--substituir]` grava
`~/.orq/migrations/<banco>.json`: o corte (padrão: a maior versão de produção), as linhas do
ledger naquele momento, os `pendentes_herdados` (E2, opção b: arquivos com piso < versão <=
corte sem linha no ledger) e `antigos_sem_ledger` (só contados). Sem `--herdados-desde`, nenhum
herdado: no Comarka, "todo arquivo sem linha até o corte" dá 36, e 31 são de maio a setembro,
que a decisão 3 manda não cobrar. Trocar a linha de base pede `--substituir`.

O plano, contra o ledger de agora: **pendente** = arquivo de qualquer repo do banco com versão
> corte sem linha que case; **herdado** = os da linha de base que ainda não casam; **drift** =
linha com versão > corte sem arquivo que case em nenhum repo; mais as aplicadas desde o corte,
com `created_by`. Casar: a mesma versão, ou o mesmo nome (sem o prefixo, ou o nome base inteiro:
o dashboard grava `20261006_<nome>`, e 7 arquivos do Comarka de 27-29/09 também). Versão de 8
dígitos é completada com zeros. Os arquivos saem dos `refs` por `gitLeitura` (`ls-tree`,
`show`): 5 dos 6 pendentes de 18/10 só existiam nas stagings. O mesmo caminho com blob
diferente entre refs é `divergente`.

### 20.4 Aplicar (`aplicar.ts`, `liberacao.ts`, `caminhos.ts`)

Recusas, todas antes de qualquer escrita: `~/.orq/MIGRATIONS_PAUSADO`; repo `somente_leitura`;
sem TTY; sem sonda verde; sem linha de base; repo pausado (`pausar_file` do config ou
`docs/fila/.orq-pause`); arquivo de liberação modificado na árvore (E5); a trava
`<banco>.lock` (O_EXCL com o pid) segura por processo vivo (órfã: assume); arquivo fora do plano
ou divergente; token ausente, duplo ou já liberado (o token sai do `.sql`, pelo molde, ou do
`--token`, conferido contra o molde); SQL recusado; `pre_check` com rc diferente de 0;
confirmação que não é a versão digitada. Depois de mostrar o SQL e o aviso de classe (DROP,
TRUNCATE, DELETE, RENAME, GRANT, REVOKE, POLICY, SECURITY DEFINER, ALTER COLUMN, SET NOT NULL;
só aviso nesta etapa), aplica e CONFERE no `schema_migrations` que a versão entrou com o nome.

| Resposta da API | Linha no ledger depois | O que acontece |
|---|---|---|
| ok | sim | `aplicada`, token escrito (`token_emitido`) |
| ok | não | `conferencia_falhou`, sem token |
| erro (4xx) | não | `falhou`, sem token |
| incerto | sim | `aplicada` com `incerto_resolvido`, token escrito |
| incerto, ou conferência sem resposta | não | `incerto`, sem token: `orq migrations plano` decide depois |

O token (a única escrita num repo): formato `liberadas` acrescenta `{token sem 'humano:', em,
por, nota}` em `.liberadas[]` (Comarka: `por: lucas`, nota `aplicador do kit, versão X, arquivo
Y, ref Z, usuário $USER`, E6); formato `v2` usa a decisão do `orq liberar`. O commit é o da
porta `comitarUmArquivo` de `resolvedor/repo.ts` (espera o git livre, só o arquivo,
`--only`, nunca `--no-verify`, desfaz se o hook recusa, confere um arquivo e o pai), com
`Orq-Aplicador: <banco> <versão> <arquivo>`. Nunca push (E7): o loop do Comarka lê o arquivo
local do checkout principal (`lib.sh:64`), e o push segue no ritual. Ledger em
`~/.orq/migrations/ledger.jsonl` (`aplicar_inicio`, `aplicada`, `token_emitido`,
`token_falhou`, `falhou`, `incerto`, `conferencia_falhou`), escrito pela `GuardaResolvedor`
com a raiz `~/.orq/migrations`.

### 20.5 O que o aplicador nunca faz

Push; merge; escrever no repo outro arquivo que não o de liberação; usar `POST
/database/migrations` ou `execute_sql` do MCP; imprimir ou gravar a credencial; aplicar sem
TTY, sem a versão digitada ou sem sonda verde; emitir token sem a linha conferida; renomear
arquivo ou mexer em linha antiga do ledger. A troca da skill e do `banco.md` do Comarka para
`orq migrations aplicar` é frente do Comarka, depois do merge (E8).

### 20.6 Testes

`orquestrador-migrations-config.test.ts` (a config real do Comarka e do dashboard; erro por
campo), `orquestrador-migrations-supabase.test.ts` (stub HTTP: sucesso, erro, incerto,
recusas do SQL, envelope do 1377, sonda, mascaramento, `ORQ_TESTE`),
`orquestrador-migrations-plano.test.ts` (fixture real `test/fixtures/migrations/`: corte
20261004 → 6 pendentes e 29 de drift; corte de hoje com herdados desde 20261004 → drift zero,
5 herdados e 1 pendente) e `orquestrador-migrations-aplicar.test.ts` (cada recusa, a trava,
o `pre_check`, a conferência, o commit de um arquivo e o replay no `liberacoes.json` real do
Comarka de 18/10).

## 21. Etapa 8c: teste vizinho liberado só quando falha (18/10/2026)

Origem: a medição do Comarka de 04 a 17/10 (allowlist é a maior classe de resgate, 22, 18
reais) e a 8a, que mostrou que nenhuma regra estática separa o teste que vai quebrar do que
não vai (§12.6). Porte do 457856c do Comarka no desenho do kit. Relatório:
`~/orq-sessoes/relatorio-kit-etapa8c.md`.

### 21.1 `dir/` vale `dir/**` (`enforcement-core.ts:normalizarEntradaAllowlist`)

`matchesAllowlist` normaliza o item terminado em `/`. Valem a mesma régua: o enforcement, a
base vermelha (`decisao.ts:arquivosBaseVermelha`), o "dentro" da C11 (`gate-ticket.ts`), o
`fora_da_allowlist` do diagnóstico de retry (`diagnostico.ts:cobre`), o triador e a
sobreposição. Caso real: o 295 do Comarka, cujas 31 violações sob `tabs/` eram ruído; as 10
reais ficam. A expansão de item `dir/` na C11 (`gate-ticket.ts:1538`) não mudou: segue aviso.

### 21.2 A decisão (`decisao.ts:decidirVizinhos`, `decisao vizinhos`)

Na tentativa em que o gate de papel `testes` reprova, com enforcement ok e sem
`reexecutar`, ANTES da base vermelha (`executor.sh`, seção 7a): amplia só se TODO arquivo
com ` FAIL ` é teste fora do diff e da allowlist e está em `testesVizinhos(allowlist, árvore
do base_ticket)` (a C11 v2: import direto resolvido ou citação de item de `src/`). Tudo ou
nada. Critério vermelho junto não impede (o retry conserta os dois). Depois, os arquivos
falhos rodam na árvore do `base_ticket` (`vizinho_na_base`: worktree destacada,
`VIZINHO_CMD_BASE`, padrão `npx --no-install vitest run`); só `verde` amplia; `vermelho`
(falha também na base) e `inconclusivo` (o runner não rodou) seguem a base vermelha de hoje.
`VIZINHO_BASE` na trilha nos três casos.

Replay dos 19 casos de allowlist da 8a (relatório 8c §2):

| régua de ligação | amplia | cobre o resgate | amplia errado |
|---|---|---|---|
| `teste_cita` do 457856c | 10 | 9 | 1 (762: o conserto era `src/middleware.ts`) |
| **C11 v2 (a do kit)** | **12** | **11** | 1 (826: o resgate foi spec nova) |

Fora do alcance: 854 e 856 (varrem diretório), 711a e 711b3 (`sem-insumo`), 830 (diff 0), 1195
(a reprova não foi de vitest; é a D6b).

### 21.3 A ampliação (`executor.sh`, `lib.sh`, `enforcement.sh`)

- Vale da tentativa seguinte à decisão até o FIM DO DRIVE: a worktree é reaproveitada e o
  diff é medido contra o `base_ticket`, então a tentativa 3 sem a ampliação barraria o teste
  editado na 2. Nunca passa de um drive a outro.
- Conta como tentativa (a reprovação que a decide consome, como qualquer outra).
- Uma vez por versão do ticket: `VIZINHO_AMPLIADO` com o `hash` da versão. Com a ampliação
  desta versão já usada, o vizinho vermelho reprova pelo caminho de hoje (nem amplia, nem é
  base vermelha) e a nota diz "teste vizinho já ampliado".
- No rundir de cada tentativa ampliada: `allowlist-ampliada.txt`. A decisão fica em
  `vizinhos.json`, `vizinhos.txt` (o bloco FAIL) e `vizinhos-base.txt`.
- O enforcement recebe `--allowlist-extra rundir/allowlist-ampliada.txt` (somado à
  allowlist e mandado em `ampliados`). O critério de lista fechada (o cmd lista a allowlist
  inteira entre aspas) ganha os ampliados SÓ na execução (`criterios_da_tentativa`,
  `cmdComAmpliados`, o passo 2 do `r1.ts`); o ticket não muda. Sem isto, as tentativas
  ampliadas do 1256 e do 1373 no Comarka consertaram o teste e reprovaram com
  `FORA_<teste>`.
- O ticket não ganha campo: `campos-do-motor.json` (8b) não muda.

### 21.4 Anti-afrouxamento (`enforcement-core.ts:violacoesDeAfrouxamento`)

Só nos arquivos de `ampliados`, por contagem LÍQUIDA de linhas no diff do arquivo (a régua
da guarda do R1). Violação tipo `afrouxamento`, causa `afrouxamento` (§11.3):

| regra | resgates reais reprovados (33 testes, 18 tickets) |
|---|---|
| remove `it(`/`test(` | 0 |
| remove `expect(` | 0 |
| acrescenta `.skip(`/`.only(`/`.todo(`/`xit(`/`xtest(`/`xdescribe(` | 0 |
| acrescenta matcher genérico (`toBeDefined()`, `toBeTruthy()`, `toBeFalsy()`, `expect.any/anything/objectContaining/arrayContaining/stringContaining(`, `.toMatchObject(`) | 0 |
| comenta linha com `it(`/`test(`/`expect(` | 0 |
| apaga o arquivo de teste | 0 |
| *(contraprova)* apaga qualquer linha com `expect(` | 19 |

O que muda o DADO e não a asserção (o 762: pôr a rota na lista de pendências do teste) não é
mecânico: fica com o juiz (§21.6).

### 21.5 O triador e o resolvedor (`tipos.ts`, `leitor-kit.ts`, `leitor-legado-comarka.ts`, `extrair.ts`)

`Tentativa.ampliados` vem de `attempt-N/allowlist-ampliada.txt` (os dois leitores; o legado
lê o que o 457856c grava no Comarka). O teste ampliado conta como dentro da allowlist
naquela tentativa. Vermelho fora que a série já ampliou fecha a D6v (§13): o bloqueio depois
de uma ampliação que não fechou vira aviso, nunca R1. Caso real: a série do 1373 que o R1 D6
consertou às 14:25Z de 18/10, depois de o 457856c a ter ampliado. Sem o arquivo, a evidência e
a extração dos 65 casos reais ficam byte a byte iguais.

### 21.6 Prompts (`executor.sh:build_prompt`, `juiz.ts:blocoAmpliados`)

Na tentativa ampliada, o executor vê os testes marcados na allowlist, o bloco FAIL da
decisão e a regra (o que o enforcement reprova e o que o juiz pega). O juiz recebe
`ampliados`: o bloco 5 (reprovar mudança de dado ou de valor esperado sem o objetivo pedir) e o
anti-afrouxamento. Sem ampliação, os dois prompts saem byte a byte como antes.

### 21.7 Testes

`orquestrador-vizinhos-8c.test.ts` (dir/ com o 295; a decisão com 950, 1054, 1059, 924a, 855,
762, 854, 711b3 e 830 reais; o bloco FAIL do 950; a lista fechada do 1373 rodada num repo; o
CLI; as 6 regras e os 33 consertos reais; a decisão de afrouxamento; o prompt do juiz),
`orquestrador-vizinhos-8c-executor.test.ts` (`drive_ticket` de verdade com o 950: amplia e
aprova; até o fim do drive; uma vez por versão; não vizinho segue base vermelha; vermelho e
inconclusivo na base; `it.skip` bloqueia; os prompts) e `orquestrador-vizinhos-8c-triador.test.ts`
(o 1373 real e os 65 casos byte a byte). Fixtures em `test/fixtures/vizinhos-8c/` (`ORIGEM.md`).

## 22. Etapa 8d: `.env` fora da worktree e template sem drift (22/10/2026)

Origem: `~/orq-sessoes/relatorio-adocao-dashboard-paridade.md`, seção D item 1, seção H
(rascunho do config do dashboard-comercial) e seção B, linha Zona C0. No dashboard, o
`.env.local` do checkout principal tem a credencial do banco de PRODUÇÃO, compartilhado com o
Comarka OS. Relatório: `~/orq-sessoes/relatorio-kit-etapa8d.md`.

### 22.1 `worktree.linkar_env` (`executor.sh:linkar_env_cfg`, `env_na_worktree`)

| valor | o que a worktree recebe |
|---|---|
| ausente, ou `true` | o de antes, byte a byte: symlink do `.env.local` do principal na raiz e em `apps/web` (lista fixa, achado K6 em aberto) |
| `false` | nenhum `.env*` é ligado nem copiado. Os symlinks `.env*` que sobraram (worktree reaproveitada de uma tentativa com `true`) são apagados; arquivo regular (versionado, ex. `.env.example`) fica. Evento `WORKTREE env=nao-linkado motivo=worktree.linkar_env=false apagados=<N>` |
| qualquer outro (`"false"`, `0`, `null`, `worktree` que não é objeto) | o preflight ABORTA: `preflight: worktree.linkar_env=<valor json> — worktree.linkar_env aceita só true ou false`. O `orq config` acusa a mesma chave |

A leitura não usa `.worktree.linkar_env // true`: o `//` do jq trata `false` como ausente.
`env_na_worktree` roda no `setup_worktree` e, com `false`, também na worktree reaproveitada.
Com `true` o reaproveitamento segue como antes. O evento `WORKTREE` (§4.1) ganha esses
campos; o vocabulário de eventos não muda.

### 22.2 O que `false` não cobre

- **O preflight continua lendo o `.env.local` do principal** (identidade contra
  `ambiente_id` e `preflight_env_keys`). Só lê e compara: `env_key_present` é `grep -q`
  (`lib.sh:1564-1570`), `env_value` imprime um `local` capturado num `local` do preflight
  (`lib.sh:1575-1583`, `executor.sh:108`, `:117`). Não há `export`, `source` nem
  `allexport` em `lib.sh` e `executor.sh`, e o plist só exporta `NODE_OPTIONS` e `NODE_DIR`.
  Por isso o valor não chega a gates, critérios, agente nem juiz (caso de teste).
- **Variável já exportada no ambiente de quem dispara o loop** chega aos filhos como
  sempre. O motor não carrega env (`launchd-run.sh:8-11`).
- **Leitura por caminho absoluto** do `.env.local` do principal pelo agente: fica para o L6
  (guarda PreToolUse) e para o piso de `--disallowedTools` (`docs/PECAS.md`).
- **`.env*` versionado** vem do git, não do motor.

### 22.3 Template sem drift em `zona_proibida` (`doutrina/templates/config.json`)

O template passa a escrever só chaves que o enforcement lê: `no_write_paths`,
`no_write_credenciais.padroes`, `no_write_tables`, `prefixos_sem_ddl` (o antigo
`no_write_prefixes`, renome da K11a-4). Saem `readonly_ok` e `excecoes_os_owned`: o motor não
tem regra de leitura nem de ownership, e o `_zona_proibida` diz isso. `descricao` e
`revisado_humano` ficam: são de processo humano. `config-chaves.ts` ganha as subchaves
`zona_proibida.no_write_paths`, `.no_write_credenciais.padroes` e `.no_write_tables`
(opcionais como subchave: `zona_proibida` inteira já é obrigatória).

### 22.4 Testes

`orquestrador-linkar-env.test.ts` (repo git de verdade; config do CI sem a chave e o rascunho
da seção H com `false`, cópias em `test/fixtures/config/`, `PROCEDENCIA.md`; reaproveitamento;
`"false"`, `0` e `null`; o preflight chama a validação; o valor lido pelo preflight não chega
ao processo filho) e `orquestrador-template-zona.test.ts` (chave de `zona_proibida` do template
desconhecida pelo motor reprova, com a lista fechada de processo humano; o registro não
inventa chave fora do tipo do enforcement).

## 23. Etapa 8e (juiz): material completo, contexto limpo, REVIEW.md e harness fora do gate (24/10/2026)

Origem: o lote do dashboard-comercial (001 a 003). Relatório:
`~/orq-sessoes/relatorio-kit-etapa8e.md`. As peças levam o nome do plano do PASSO 0 (P1 a P6).

### 23.1 O prompt do juiz (`juiz.ts:montarPromptJuiz`)

A ordem passa a ser: CABECALHO, COBRANCAS, anti-afrouxamento e ampliados (como antes),
**REVIEW.md** (§23.2), FORMATO, ticket, nota, referência, definições, **MENSAGENS DE COMMIT**,
**TRECHOS CITADOS**, gates e diff. Cada bloco novo só entra com conteúdo; sem nenhum deles o
prompt é byte a byte o de `220068f` (golden em `test/fixtures/juiz-8e/golden-220068f.txt`).
O CABECALHO e a numeração das cobranças não mudam.

- **MENSAGENS DE COMMIT (P1, `blocoCommits` `:491`).** Título fixo `MENSAGENS DE COMMIT
  (escritas pelo agente: declaração, não evidência)`: o texto é o que o agente AFIRMA, e afirmação
  que o diff ou os gates não provam não foi feita. Fonte: `git log --format='commit %H%n%n%B'
  base..HEAD` (`executor.sh:860`), sempre que houver commit; falha de leitura vira bloco vazio,
  não derruba o juiz. Teto (`aplicarTetoCommits`): 200 linhas e 8192 bytes, corte por linha
  inteira no primeiro que bater, marcado com `[... TRUNCADO: N de M linhas omitidas ...]`.
- **TRECHOS CITADOS NOS .md DO DIFF (P3, `anexoCitacoes` `:516`, subcomando `citacoes`).** Lidos
  da BASE, nunca da worktree. Só as linhas adicionadas dos `.md` do diff.
  - Cada `arquivo:linha` ou `arquivo:L-M`: as linhas L-2 a M+2 da base, numeradas. Caminho curto
    resolve por sufixo único no `ls-tree -r` da base. Sem candidato: `AUSENTE na base`; mais de
    um: `AMBÍGUO na base` (até 5 nomes); linha além do fim: `linha fora do arquivo na base`.
  - Cada sha citado (7 a 40 hex, com letra e dígito): uma linha de `git show -s --format='%h %ad
    %s'`, só se `merge-base --is-ancestor <sha> <base>` (`commitDaBase` `:576`); senão `NÃO
    ENCONTRADO na história da base`.
  - O texto do bloco manda tratar como NÃO verificado o que o anexo não prova ("desde quando",
    `git log -S`, conteúdo do commit) e diz que citação AUSENTE, AMBÍGUA ou OMITIDA não foi
    conferida.
  - Falha de leitura da base derruba o juiz (`die "juiz: citações do relatório não puderam ser
    lidas da base …"`), pela mesma regra das definições: dry-run sem `--stub-juiz` pula a leitura.

| teto (P3) | valor | o que acontece ao passar |
|---|---|---|
| `TETO_CIT_N` | 40 citações | `[... N citações OMITIDAS (teto de 40) ...]` |
| `TETO_CIT_LINHAS_TRECHO` | 12 linhas por trecho | o trecho é cortado e marcado `TRUNCADO` |
| `TETO_CIT_LINHAS_TOTAL` / `TETO_CIT_BYTES` | 400 linhas / 16384 bytes, somando os trechos | a citação sai como `OMITIDO: teto … atingido` |
| `TETO_CIT_SHAS` | 20 shas | `[... N shas OMITIDOS (teto de 20) ...]` |

### 23.2 `juiz.review_md` (P4; §8)

Chave **opcional**, path relativo à raiz do repo (`config-chaves.ts`, `obrigatoria: false`).

| estado | o que acontece |
|---|---|
| ausente, ou string vazia | desligado: nenhum bloco, nenhum item de pré-voo |
| presente, arquivo na base | `git show <base>:<path>` (`executor.sh:842`), lido da BASE e nunca da worktree; entra no bloco `REVIEW.md DO REPO (regras de revisão deste repositório; valem junto com os itens acima):` depois das cobranças (itens 4 e 5 incluídos) e antes de FORMATO, no prefixo fixo por repo |
| presente, arquivo ausente na base | o juiz não roda: `die "juiz: juiz.review_md '<path>' ausente na base <sha8>"` (dry-run sem `--stub-juiz` não lê) |

**Pré-voo `cat.8`** (`prevoo.ts:checarReviewMd` `:257`), só quando a chave existe, entre `cat.6`
e `cat.3`: `git show <branch_alvo>:<path>` tem de existir e caber em **150 linhas e 8192 bytes**
(`TETO_REVIEW_LINHAS`, `TETO_REVIEW_BYTES`), porque o arquivo vai inteiro em toda chamada do juiz.
Falhar é NO-GO como os outros itens: `PREVOO_NOGO item=cat.8` (§4.1 ganha esse valor de `item=`;
o vocabulário de eventos não muda), com o motivo `juiz.review_md '<path>' ausente em <branch>` ou
`<path> tem N linhas e B bytes (teto: 150 linhas, 8192 bytes)`.

### 23.3 O juiz roda com contexto limpo (P2, `executor.sh:run_juiz`)

- **cwd**: um `mktemp -d "${TMPDIR:-/tmp}/orq-juiz.XXXXXX"` vazio, fora de qualquer repo, apagado
  depois da chamada. Antes era a worktree do ticket, com o `CLAUDE.md` e o `.claude/` da branch.
  `mktemp` que falha derruba o juiz.
- **flags novas**, as três confirmadas no `claude --help` 2.1.302, postas depois do
  `--max-turns 1`: `--tools ""` (tira as definições de ferramenta do contexto; o
  `--allowedTools ""`, que fica, só deixava de aprovar), `--strict-mcp-config` sem `--mcp-config`
  (nenhum MCP) e `--disable-slash-commands` (nenhuma skill).
- **Fica fora**: `--setting-sources` e `--bare` (não confirmados ou quebram a autenticação do loop)
  e o `~/.claude/CLAUDE.md` do usuário, que nenhuma flag confirmada tira. Aberto.

### 23.4 `ORQ_GATE=1` e `describeHarness` (P5)

- `gates.ts:execBash` (`:439`), o spawn de todo gate, exporta `ORQ_GATE=1` para o `bash -c`.
- `test/fixtures/orq-harness.ts:24` exporta `describeHarness = describe.skipIf(process.env.ORQ_GATE
  === '1')`. Os 19 testes de `TESTES_HARNESS` (`vendorizado.sh`) usam `describeHarness` no
  `describe` de topo: dentro do gate do repo instalado eles saem `skipped`; no vitest humano e no
  kit, rodam. Os gates do PRODUTO não mudam: `ORQ_GATE` só é lido pelo harness.
- O typecheck do repo instalado continua compilando o harness quando o `tsconfig.json` inclui
  `test/` (o caso do CI): pendência em `docs/PECAS.md`.

### 23.5 Avisos `C15` e `C16` do gate de ticket (P6; §12)

Severidade `aviso`, só em ticket pendente (`gate-ticket.ts:validarTicket`).

| Regra | O que olha | Medido |
|---|---|---|
| `C15` | a `descricao` de um critério casa `RE_CORPO_COMMIT` (`/(corpo\|mensagem) do commit/i`): o juiz recebe o commit só como declaração do agente (§23.1). Um achado por critério, em `criterios_aceite[i]` | 0 nos 1479 tickets do Comarka; 2 no dashboard (002, 003) |
| `C16` | o objetivo ou uma descrição pede vermelho antes (`RE_PEDE_VERMELHO`) e TODO cmd de critério com `vitest` manda a saída para `/dev/null` (`vitestSoEmDevNull`): o agente não vê quais casos falharam. Um achado por ticket, em `criterios_aceite` | 27 `done` no Comarka (contados como acerto: defeito latente); 2 no dashboard (002, 003) |

### 23.6 Testes

`orquestrador-juiz-isolamento.test.ts` (P2: o `claude` falso grava cwd e argv),
`orquestrador-juiz-commits.test.ts` (P1: o corpo real de `1bfcbc1d`, teto),
`orquestrador-juiz-citacoes.test.ts` (P3: o 001/0 real com 3 arquivos da base `c1051f13`),
`orquestrador-juiz-review.test.ts` (P4: golden sem a chave, bloco, `die` e `cat.8`),
`orquestrador-gate-8e.test.ts` (P6: 002 e 003 disparam, 001 é o controle negativo),
`orquestrador-gate-severidade.test.ts` (inventário com C15 e C16) e o caso (h4) de
`scripts/kit/test-instalar.sh` (P5: `Test Files 1 skipped` dentro do gate, `1 passed` fora).
Fixtures em `test/fixtures/juiz-8e/` e `test/fixtures/gate-ticket-8e/` (`ORIGEM.md`).

## 10. Divergências conhecidas

O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.

| # | Divergência | Peça |
|---|---|---|
| 1 | ~~`--novo` não existe.~~ **FECHADA pela K8b-6:** `--novo <repo>` cria o layout de §1.2 do zero, com `vendorizar_motor` compartilhado com o `--atualizar` e os artefatos vindos de `doutrina/templates/`. | ~~K8b-6~~ **feita** |
| 2 | ~~`tokens` de OBJETOS não resolvia dependência nenhuma, em silêncio.~~ **FECHADA pela K8b-1:** `liberacao_ok` resolve as quatro formas vivas (§6.1), normalizando o prefixo dos dois lados, e `lint-mapa.py` monta `sat` pela mesma regra. O schema continua sendo documento e insumo, nunca gate. | ~~K8b-1~~ **feita** |
| 3 | `gate-ticket.ts` NÃO valida contra `schemas/ticket.schema.json`: continua com os checks escritos à mão. O schema é documento e insumo do `orq config`. | **"gate valida pelo schema"** (em PENDENTES) |
| 4 | `schemas/ticket.schema.json` fecha `status` no vocabulário do gate (6 valores). `doutrina/templates/TICKET.md` cita ainda `candidato` (ticket do planejador antes do gate) e `descartado` (só do gate) — dois status que o motor de hoje não conhece, porque planejador e sentinela nascem desligados. | **K10** (doutrina v2) |
| 5 | ~~`schemas/motivo_categoria.json` copia os 8 baldes do `orq-telemetria.py`; eles entrariam com o painel.~~ **FECHADA pela K12, por decisão:** o painel categoriza pelo `motivo=` e `sub=` da trilha (§9.5), nunca por padrão no texto da nota, que é o que aqueles baldes fazem. O schema fica como registro da taxonomia antiga; nada o lê. | ~~K12~~ **feita** |
| 6 | `criterios_aceite[].cmd` é LIDO pelo gate (prefixo, proibições) mas não EXECUTADO: `alvo` que já passa e `guarda` que já falha não são detectados. | **1b** |
| 7 | O `drenar` não roda o gate de ticket antes de gastar agente. | **1c** |
| 8 | Dois testes de harness são byte-idênticos ao do CI e ainda assim não viajam com o motor, porque hardcodam valores do config do CI (`orq-cli.test.ts:205,237`; `orquestrador-observabilidade.test.ts:216-217`). | **K8e** |
| 9 | ~~Não há alarme para "job do launchd carregado e mudo".~~ **FECHADA pela K12 (bloco D):** `launchd_exit` e `mudo` no painel (§9.5). | ~~K12a~~ **feita** |
| 10 | ~~**Qual bloco ```json vale, num ticket com mais de um.** Três leitores, três respostas.~~ **FECHADA pela D10:** o ticket é o **PRIMEIRO** bloco; qualquer outro é prosa. `lib.sh:ticket_json` deixou de concatenar e `ticket_set` de reescrever mais de um; `gate-ticket.ts` e `fila-read.ts` já liam o primeiro; §2 diz isso; `migrar-tickets.ts` deixou de pular e passou a NOTAR. | ~~D10~~ **feita** |
