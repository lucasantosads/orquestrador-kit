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

- `id` casa `^\d{3}[a-z]?$` (`RE_ID`, `gate-ticket.ts:61`) **e** é igual ao
  prefixo do nome do arquivo (`:398`). O sufixo de letra existe: `001a`, `309a`.
- `status` ∈ `pendente · em_execucao · done · bloqueado · obsoleto · refatiar`
  (`STATUS_VALIDOS`, `:28`).
- Campos obrigatórios **só para `pendente`** (`CAMPOS_PENDENTE`, `:46`): `id`,
  `slug`, `bloco`, `objetivo`, `pathspec_allowlist`, `dependencias`,
  `criterios_aceite`, `status`, `risco`. Status terminal (`done`, `obsoleto`,
  `bloqueado`) só precisa parsear: a fila tem dezenas escritos sob schemas
  anteriores, e cobrar campo de quem já entregou não é gate, é ruído.
- `dependencias` basta ser lista — `[]` é o caso NORMAL. Cada item é `id` de
  outro ticket (resolve quando `done`) ou `humano:<token>` (§6).
- `risco` basta EXISTIR; se tiver valor, ∈ `baixo · alto` (vazio até o passo 6
  do gate classificar) (`:381-386`).
- `criterios_aceite[].tipo` ∈ `alvo · guarda · avaliador` (`TIPOS_CRITERIO`,
  `:59`). Cada critério tem `tipo`, `cmd`, `espera`, `descricao`.
- `criterios_aceite[].cmd` só com prefixo de `gate_ticket.cmd_prefixos_permitidos`
  e sem nada de `gate_ticket.proibido_no_cmd`.
- Allowlist sobreposta entre dois `pendente` exige dependência declarada entre
  eles (`:445-461`).

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
| `DRENAGEM_FIM` | `local-loop.sh:205,242` | `aprovados=` `bloqueados=` `adiados=` `dur=` [`motivo=`] |
| `INICIO` | `executor.sh:1032` | `attempt=` `model=` |
| `WORKTREE` | `executor.sh:1026` | `modo=reaproveitada` `de=` `base=` |
| `GATE` | `executor.sh:539` | ver §4.2 |
| `JUIZ` | `executor.sh:615,623` | `veredito=aprovado\|reprovado\|ilegivel` `classe=` `modelo=` `attempt=` |
| `APROVADO` | `executor.sh:1048` | `merge=aguardando` `dur=` `attempt=` |
| `REPROVADO` | `executor.sh:1057` | `motivo=` `attempt=` `diff=` |
| `ADIADO` | `executor.sh:1039` | `motivo=` `attempt=` |
| `BLOQUEADO` | `executor.sh:1064`, `local-loop.sh:181` | `motivo=` [`attempt=`] |
| `RETRY` | `executor.sh:1077` | `attempt=` `model=` `motivo=` |
| `REFATIAR` | `executor.sh:896` | `motivo=` `arquivos=` |
| `MERGE` | `local-loop.sh:173` | `alvo=` `sha=` |
| `RECUPERADO` | `executor.sh:1105`, `local-loop.sh:55`, `launchd-run.sh:102` | `motivo=ja-mergeado\|lock-orfao\|status-congelado` |
| `EXECUTOR_MORREU` | `executor.sh:1136` | `rc=` `fase=` [`sinal=`] |
| `ORCAMENTO` | `lib.sh:954` | `escopo=` `adiado_ate=` `consumo=` |
| `COMMIT_HARNESS` | `executor.sh:725` | `motivo=agente-saiu-sem-commitar` |
| `DECISAO_PENDENTE` | `lib.sh:744` | `origem=` |
| `ANOTACAO` | `lib.sh:274` | `nota=` |
| `PREVOO_NOGO` | `local-loop.sh:prevoo_ou_sai` | `item=cat.0\|cat.1\|cat.6` |

`motivo=` é sempre token curto e estável (grepável), nunca frase.

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
retomar` remove.

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
| `orq pausar [motivo]` | cria o `pausar_file` — **escreve** |
| `orq retomar` | remove o `pausar_file` — **escreve** |
| `orq liberar <humano:token> [nota]` | acrescenta um token v2 em `liberacoes_file` — **escreve** (§6.2) |

Os TRÊS que escrevem escrevem UM arquivo do repo cada, nunca estado de execução.
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

---

## 10. Divergências conhecidas

O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.

| # | Divergência | Peça |
|---|---|---|
| 1 | ~~`--novo` não existe.~~ **FECHADA pela K8b-6:** `--novo <repo>` cria o layout de §1.2 do zero, com `vendorizar_motor` compartilhado com o `--atualizar` e os artefatos vindos de `doutrina/templates/`. | ~~K8b-6~~ **feita** |
| 2 | ~~`tokens` de OBJETOS não resolvia dependência nenhuma, em silêncio.~~ **FECHADA pela K8b-1:** `liberacao_ok` resolve as quatro formas vivas (§6.1), normalizando o prefixo dos dois lados, e `lint-mapa.py` monta `sat` pela mesma regra. O schema continua sendo documento e insumo, nunca gate. | ~~K8b-1~~ **feita** |
| 3 | `gate-ticket.ts` NÃO valida contra `schemas/ticket.schema.json`: continua com os checks escritos à mão. O schema é documento e insumo do `orq config`. | **"gate valida pelo schema"** (em PENDENTES) |
| 4 | `schemas/ticket.schema.json` fecha `status` no vocabulário do gate (6 valores). `doutrina/templates/TICKET.md` cita ainda `candidato` (ticket do planejador antes do gate) e `descartado` (só do gate) — dois status que o motor de hoje não conhece, porque planejador e sentinela nascem desligados. | **K10** (doutrina v2) |
| 5 | `schemas/motivo_categoria.json` copia os 8 baldes do `orq-telemetria.py` do **comarka-operacional**, que não está no kit. Nada no motor deste kit os usa hoje: eles entram com o painel. | **K12** |
| 6 | `criterios_aceite[].cmd` é LIDO pelo gate (prefixo, proibições) mas não EXECUTADO: `alvo` que já passa e `guarda` que já falha não são detectados. | **1b** |
| 7 | O `drenar` não roda o gate de ticket antes de gastar agente. | **1c** |
| 8 | Dois testes de harness são byte-idênticos ao do CI e ainda assim não viajam com o motor, porque hardcodam valores do config do CI (`orq-cli.test.ts:205,237`; `orquestrador-observabilidade.test.ts:216-217`). | **K8e** |
| 9 | Não há alarme para "job do launchd carregado e mudo". O incidente de 2026-09-08 passou 1h40 sem detecção automática. | **K12a** |
| 10 | ~~**Qual bloco ```json vale, num ticket com mais de um.** Três leitores, três respostas.~~ **FECHADA pela D10:** o ticket é o **PRIMEIRO** bloco; qualquer outro é prosa. `lib.sh:ticket_json` deixou de concatenar e `ticket_set` de reescrever mais de um; `gate-ticket.ts` e `fila-read.ts` já liam o primeiro; §2 diz isso; `migrar-tickets.ts` deixou de pular e passou a NOTAR. | ~~D10~~ **feita** |
