# Relatório da etapa 7f-b6 · PASSO 0 (recon só leitura) e plano

12/10/2026. Branch `kit/etapa7f6`, worktree `~/Projetos/_worktrees/kit-etapa7f6`.

**Nenhum código escrito.** Nenhum commit no kit.

**Onde escrevi.** Só em:
- este relatório;
- `~/orq-sessoes/7f-b6/` (`contar-formas.py` e `.txt`);
- o scratchpad da sessão: reprodução do 933 e triagem sem modelo com `ORQ_DIAG_DIR` desviado.

**`~/.orq`: nenhuma escrita.** As mtimes de `diagnosticos/comarka-operacional/{830,835,966}.json` e `custo.json` às 11:27–11:28 (14:27Z) são do job vivo do resolvedor (`gerado_em` 14:26:53Z). A minha triagem rodou às 11:31 e gravou no scratchpad.

**Comarka: só leitura**, com `GIT_OPTIONAL_LOCKS=0`; nenhum `checkout`, `fetch` ou `stash`.

## 0. O que mudou no Comarka durante o recon (importante)

A `main` local do Comarka tem **6 commits sem push** (`origin/main..main`, ref local, sem fetch):

```
0637106 fila: 834b migra as 6 rotas de /api/clientes/[id] para o resolver unico
05d951e fila: reabre 830 com os 2 scripts de scripts/dados e test/dono-dry-run na allowlis
af768b0 fila: reabre 966 com test/ficha-nav-colapsavel.test.ts na allowlist
eafd2a0 chore(fila): libera ddl-marcos-prazo-aplicada (ledger 20261012142126)
bc49286 fila: reabre 318c com nichos-teses-aba.tsx na allowlist
31104d0 PORTE-PENDENTE: executor roda critério/recon num bash novo em vez de eval
```

**O `31104d0` já mudou o motor do Comarka.** Ele cria o `roda_cmd_isolado` = `env -u SHELLOPTS -u BASHOPTS NO_COLOR=1 FORCE_COLOR=0 bash --noprofile --norc -c "$1"`, usado no priming, nos critérios e no recon.
- Não foi esta sessão.
- O item "critério em bash -c isolado" da parte Comarka **já está feito, sem push**. Sai do brief do porte, ou vira só a conferência dele.

**Os 8 já têm conserto humano, ou em andamento:**
- 318c, 933, 934b e 935 estão `pendente`: os 4 voltaram pelo `4b5dd2e`, e o 318c também pelo `bc49286`.
- 830 e 966: reabertos (`05d951e`, `af768b0`).
- 835: depende do 834b novo.

Isso não muda a classificação abaixo, mas muda o que a **leitura atual** do `.md` diz (ver o 966 em B.1).

## A. Comarka (arquivo:linha e saída crua)

### A1. Por que o critério herdava `set -euo pipefail`

Antes do `31104d0` (`git show 4b5dd2e:scripts/orquestrador/executor.sh`):
- `executor.sh:21`: `set -euo pipefail`.
- `executor.sh:231` (`run_criterios`):
  ```
  out="$( ( cd "$wt" && export NO_COLOR=1 FORCE_COLOR=0 && { [ "$sane" = sim ] && {...}; eval "$cmd"; } ) 2>&1 || true )"
  ```
  O `eval` roda num subshell `( … )` do próprio executor. Subshell herda `-e`, `-u` e `pipefail`. É por isso que a mensagem cita `executor.sh: line 231`.
- O mesmo vale para o priming (`:221`) e para o `run_recon` (`:291`).

**Dois defeitos empilhados, não um.** Reproduzi o `criterio[15]` do 933 no estado CERTO: rota existe e nada está agendado (`scratchpad/repro933.sh`).

```
--- motor antigo (eval num subshell com set -euo pipefail herdado):
repro933.sh: line 12: b: unbound variable
--- motor novo 31104d0 (bash limpo):
ST_0_x
rc=0
```

- **Com o harness consertado, o critério ainda reprova no estado certo.** `a=$(grep -c …)` com 0 ocorrências sai rc 1, o `&&` não atribui `b`, e `[ "$b" = 0 ]` falha.
- O que destravou 933/934b/935 foi a reescrita humana da spec que **entrou no `4b5dd2e` junto com o status** (A3): passou de `&&` para `;` e o `test -f` foi para o fim.
- Logo, a classe certa dos três é **HARNESS + SPEC_CRITERIO**, e só o primeiro já foi consertado.

**Kit: o mesmo defeito, ainda vivo.**
- `scripts/orquestrador/executor.sh:23`: `set -euo pipefail`.
- `executor.sh:466`:
  ```
  ( cd "$wt" && export BASE_REF="$CFG_BRANCH_ALVO" NO_COLOR=1 FORCE_COLOR=0 && eval "$cmd" ) > "$tmp_out" 2>&1 || rc_cmd=$?
  ```
- O kit **não isola**: herda os mesmos três. O `gates.ts:327` (`execBash`) já usa `spawnSync('bash', ['-c', cmd])`, mas isso só vale para os gates, não para os critérios.
- O kit não tem recon no executor.

### A2. Onde as branches das tentativas são apagadas

| repo | onde | o quê |
|---|---|---|
| Comarka | `executor.sh:421` `setup_worktree` | `:424` worktree remove, `:426` `git branch -D frente/<id>`, incondicional, a cada tentativa |
| Comarka | `executor.sh:444` `cleanup_worktree` | `:446`/`:447` remove e `branch -D`; chamado em `:494 :563 :660 :677 :683 :690 :714 :717` (reprova, bloqueio, retry e done) |
| kit | `executor.sh` | `:295`/`:297` (setup), `:321`/`:322` (cleanup) |
| kit | `local-loop.sh:717`/`:718` | a mesma remoção e `branch -D` |

**Achado: os commits das tentativas ainda estão no object store** do Comarka, inalcançáveis, sem ref. O `head.txt` de cada tentativa aponta para eles:

```
318c/attempt-1 head=da2bc48… EXISTE contido_em=[nenhuma ref] feat(trafego): ranking de criativos da tese no drill (318c)
854/attempt-2  head=1d74332… EXISTE contido_em=[nenhuma ref] refactor(equipe): remove a tela gemea /equipe-geral …
933/attempt-2  head=5f6d34f… EXISTE …   934b/attempt-2 fef59a9… EXISTE   935/attempt-3 8b21e3a… EXISTE   966/attempt-2 639d917… EXISTE
830/*, 835/* head=1e3b306 (a base: diff 0, sem commit)
933/attempt-1  head.txt vazio (série sobrescrita; a anterior está em attempt-1.prev1, 74a17c3, EXISTE)
```

Com isso, reproduzir hoje não exige o `diff.raw`: basta `git worktree add --detach <tmp> $(cat head.txt)`. Só que o `gc` (prune de 2 semanas) os leva. Daí a ref `refs/orq/tentativas/<id>-<n>` do porte.

### A3. Por que o autocommit levou a edição manual (`4b5dd2e`)

`local-loop.sh:278` `autocommit_status_fila`:
- `:285`: `arquivos="$(git -C "$mc" diff --name-only HEAD -- ':(glob)docs/fila/*.md')"`, o arquivo **inteiro** de todo `.md` com qualquer diff contra o HEAD;
- `:297`: `git -C "$mc" add -- "${paths[@]}"`; o commit com `-- paths`;
- chamada em `:412`, no fim de toda drenagem.

Não há filtro de campo: o que estiver no working tree vai junto.

O `4b5dd2e` (11:08, "status automatico do loop … (318c 933 934b 935)") levou, além de `status`/`notas_status`:
- **318c:** o `objetivo` (parágrafo novo sobre `nichos-teses-aba.tsx`), `nichos-teses-aba.tsx` na allowlist e 3 `cmd` com o arquivo a mais;
- **933, 934b e 935:** o `cmd` reescrito (`&&` → `;`).

Era a edição humana das 11:0x, apanhada pela drenagem das 11:09 (`[2026-10-12 11:09:25-0300] autocommit fila: commit 4b5dd2e`).

Do mesmo jeito, o `b988f6c` (06:17) pegou **52 tickets** de uma vez.

### A4. A coluna "tent." do painel do Comarka sai "?"

- `orq-server.py` não monta a tabela: importa o `orq-painel.py` (`orq-server.py:5-6`).
- `orq-painel.py:203`: `"tentativas": o.get("tentativas", "?")`, o campo `tentativas` do bloco JSON do ticket.
- O cabeçalho está em `:450` e a célula em `:454`.

**O executor do Comarka nunca grava `tentativas` no ticket.** Nenhum `ticket_set` desse campo em `executor.sh` ou `lib.sh`: o contador vive em variável local (`executor.sh:702`) e no `runs/<id>/meta.json` (`lib.sh:692`). Só 24 tickets antigos têm o campo, e nenhum dos 8:

```
318c … tent= AUSENTE    830 … tent= AUSENTE    … (os 8)
```

**Conserto.** Contar `attempt-*` da série atual no `meta.json`, que o `leitor-legado-comarka.ts` do kit já faz (`serieDoMeta`, `:378`), em vez de ler o campo.

### A5. Pré-voo do recon

**Já existe** no Comarka (HARDENING 129):
- `executor.sh:488` `run_recon` (definido em `:289`) roda depois do `setup_worktree` (`:481`) e **antes** do `build_prompt` e do Claude;
- se diverge, `:489-495` marca o ticket como `obsoleto` sem gastar tentativa.

**O que falta é conteúdo, não lugar.**
- O recon do 830 e do 835 só confere se o arquivo existe (`test -e … && echo EXISTE`).
- Ninguém confere os importadores do símbolo removido em `src/`, `scripts/` e `test/`.
- Uma checagem "importador fora da allowlist" entraria exatamente aqui (`:488`), como um recon implícito para ticket de remoção. Sairia SPEC_DESATUALIZADA em vez de `obsoleto`, que é outro destino.

**Atenção à P4.** No 835, as 6 rotas nasceram **depois** do ticket:
- ticket `00b8ef7`, 03/10;
- rotas em 05/10 (2×), 07/10, 08/10, 09/10 e 11/10 (`git log --diff-filter=A`).

Por isso a checagem só na criação não pega o 835: ela precisa rodar também no pré-voo.

No 830, os importadores são anteriores ao ticket (`scripts/dados/370-identidade.ts` 05/09, `685-dono-dry-run.ts` e `test/dono-dry-run.test.ts` 30/09). Ali a checagem na criação pegaria.

### A6. Artefatos no disco (`docs/fila/runs/<id>/`)

| id | tentativas no disco | artefatos | o que falhou (saída crua) |
|---|---|---|---|
| 318c | attempt-1..3 (04:18–04:26) | completos, `verdict.json` nos 3 | juiz, 3×: "…nichos-teses-aba.tsx:372 monta <DrillTese tese={tese} /> sem tipo… **ampliar a allowlist**" |
| 830 | 1..3 (00:34–00:38), diff.raw 0 B nos 3 | sem `criterios.txt` na 2 | `criterio[8]` `SOBRA_1`; claude-output: "Ampliar a allowlist com `scripts/dados/370-identidade.ts` e `scripts/dados/685-dono-dry-run.ts`…" |
| 835 | 1..2 (00:50–00:52), diff 0 | | `criterio[8]` `EXISTE`, `[9]` `IMPORTA_6`; claude-output: "as 6 rotas precisam migrar… 8 testes fora da allowlist" |
| 854 | 1..2 (01:16–01:18), 238 linhas | sem `criterios.txt` | `FAIL test/rotas-orfas.test.ts … expected [ '/dashboard/team/[id]' ] to deeply equal []` (`:297`) e `expected 21 to be 20` (`:267`), nas 2 |
| 933 | 1..2 (01:44–01:47) + `attempt-1.prev1` | | `criterio[15]`: `executor.sh: line 231: b: unbound variable`, nas 2 |
| 934b | 1..2 (01:59–02:02) | | `criterio[12]`: `line 231: a: unbound variable`, nas 2 |
| 935 | 1..3 (03:21–03:31) | | T1: `[11] FALTA_1`, `[12] FALTA_0` (mérito, resolvido no retry) e `[14] unbound`; T2 e T3: `[14] line 231: b: unbound variable` |
| 966 | 1..2 (05:48–05:52), 481 linhas | sem `criterios.txt` | `FAIL test/ficha-nav-colapsavel.test.ts … expected 8 to be 7` (`:115`), nas 2 |

## B. Kit

### B1. Classes, regras e como os 8 saem hoje

- Classes: `extrair.ts:51`, R1 a R7.
  - R1 teste acoplado fora da allowlist;
  - R2 critério com defeito;
  - R3 spec precisa de decisão ou refatiamento;
  - R4 dependência / falta real;
  - R5 ambiente;
  - R6 motor mediu errado;
  - R7 humano.
- R8 (sobreposição, D13): só diagnóstico.
- Regras D0–D13: `CONTRATO.md:1056-1069` e `§17.6`.

"Na hora" é o que o triador gravou em `~/.orq/diagnosticos` no bloqueio (lido do `.json` atual ou do `historico/`). "Agora sem modelo" é a minha corrida com `ORQ_DIAG_DIR` no scratchpad, `--sem-modelo --forcar`, só para os 4 ainda `bloqueado`:

```
830	R2?	palpite D12	consertar criterio[8] no .md: saída "SOBRA_1"
835	R2?	palpite D12	consertar criterio[8] no .md: saída "EXISTE"
854	R5?	palpite D7	conferir se test/rotas-orfas.test.ts já está vermelho na base; senão pôr na allowlist com guarda
966	R2?	palpite D10	conferir o critério ou a premissa do teste test/ficha-nav-colapsavel.test.ts
```

### Tabela dos 8

| ticket | extração na hora | final na hora (modelo) | classe certa | por que errou | arquivo:linha |
|---|---|---|---|---|---|
| 318c | sem regra (juiz ×3) | R4 alta | **SPEC_ALLOWLIST** (R1, arquivo de `src`) | o R1 só nasce de vermelho de teste (D6/D6b); motivo de juiz não tem regra; o juiz já escreveu "ampliar a allowlist" e ninguém extrai | `extrair.ts:108` (nenhuma D casa estágio `juiz`); `r1.ts:106` |
| 830 | R2? D12 | R3 média | **EXECUTOR_DESISTIU** → SPEC_ALLOWLIST (importadores em `scripts/` e `test/`) | estágio `criterios` com diff 0: a D12 trata o critério como culpado, mas ele só falhou porque o executor parou no PASSO 1; o motivo está no `claude-output.txt`, que a regra não lê ("o que o agente disse nunca entra em regra", §13.3) | `extrair.ts:292` |
| 835 | R2? D12 | R4 (hist.); hoje R2? da extração | **EXECUTOR_DESISTIU** → SPEC_DESATUALIZADA (6 rotas posteriores) | idem; `IMPORTA_6` na base seria a prova mecânica | `extrair.ts:292` |
| 854 | **R5? D7** | R1 alta → **aviso** | **SPEC_ALLOWLIST** (R1) | `rotas-orfas.test.ts` lê `src/app/dashboard` por diretório e não cita nome do diff: `acoplado: false`, D6 não casa. Mesmo vermelho nas 2 tentativas, sem vizinho na base. O R1 só age em firme: ledger `04:22:26Z aviso 854 R1 D7 "R1 é palpite: o resolvedor só age em diagnóstico firme"` | `extrair.ts:261` (D6), `:277` (D7) |
| 933 | R2? D12 | R2 alta → **proposta** | **HARNESS** (R6) + SPEC_CRITERIO (R2, `grep -c`) | nada lê `executor.sh: line N` / `unbound variable` como motor | `extrair.ts:292` |
| 934b | R2? D12 | R2 alta → proposta | HARNESS + SPEC_CRITERIO | idem | idem |
| 935 | R2? D12 | R2 alta → proposta | HARNESS + SPEC_CRITERIO (T1 teve mérito real) | idem | idem |
| 966 | R1? D7 (08:55Z) | R1 palpite → **aviso**; hoje R2? D10 (deriva) | **SPEC_ALLOWLIST** (R1, `toBe(7)` de contagem fixa) | o mesmo da D6 no 854: o teste lê `CHILD_LABELS` e não cita o nome do diff. Ledger `08:55:24Z aviso 966 R1 D7` | `extrair.ts:261/277` |

**Deriva do 966, achado.**
- O triador lê o `.md` do **checkout atual**, inclusive edição não commitada ou commit posterior.
- O humano pôs `ficha-nav-colapsavel.test.ts` na allowlist (`af768b0`), e a reextração das 14:26Z passou a ver o vermelho "dentro": D10, R2?.
- O diagnóstico do bloqueio foi sobrescrito por uma classe que só vale depois do conserto.

### B2. Ledger do resolvedor (`~/.orq/resolvedor/ledger.jsonl`, 53 linhas)

```
04:22:26Z aviso    854  R1 D7  modo auto  "R1 é palpite: o resolvedor só age em diagnóstico firme"
04:47:47Z proposta 933  R2 D12 r2_proposta  mudou "criterio[15]: cmd sem unbound variable sob set -u"
05:03:03Z proposta 934b R2 D12 r2_proposta
06:33:40Z proposta 935  R2 D12 r2_proposta
08:55:24Z aviso    966  R1 D7  "R1 é palpite: …"
14:11:49Z comparacao 933/934b/935 R2  resultado "erro"  como "diferente"
14:26:53Z nao_agiu 835  R2? D12 sombra  "forma do defeito fora do que esta etapa conserta (saída: EXISTE)"
23:40:50Z (11/10) sobreposicao 966 (5×) e 934b  R8 D13 diagnostico
```

O 318c e o 830 não têm linha de ação no ledger (a única que cita o 318c é a `sobreposicao` id 321, do ticket que `depende_de` 318c): R4 e R3 vindos do modelo viram `aviso` sem registro novo.

**Por que o R1 não agiu.**
- **854 e 966:** a classe é palpite (D7 → modelo) e o R1 exige firme D6/D6b (`CONTRATO.md:1252`).
- **318c:** não há R1 a partir do juiz, e o modelo disse R4.

**Achado: o R2 acertou os 3 e o ledger marcou "erro".**
- A proposta trocava `a=$(grep -c …)` por `a=$(grep -c … || true)`.
- No scratchpad, a proposta e o `cmd` humano dão `NAO_AGENDOU` no estado certo e `ST_1_0` no errado: equivalentes.
- O comparador (`desfecho.ts:95` `equivalentes`) roda nas árvores guardadas `nao_feito` e `head`, e exige **saída idêntica**.
- A árvore `nao_feito` do 933 não tem `route.ts`. A proposta sai `ST_x_x`, o humano `ST_0_0`: os dois reprovam, o texto difere, e conta "erro".
- Isso derruba a promoção do R2 (9 em 10), e conta 3 erros falsos.

### B3. Painel K12 do kit

- A **classe do triador não aparece.**
  - A coluna "Categoria" sai do token da trilha (`orq-painel.py:521` `categoria_bloqueio`, montada em `:632`/`:639`).
  - Nenhum `.py` do painel lê `~/.orq/diagnosticos`; só `scripts/orq` e `resolvedor/modos.ts` citam o caminho.
- **Tentativas:**
  - `orq-painel.py:298`/`:306` lê o campo `tentativas` do ticket; a célula em `:1285` mostra "sem dado" quando falta.
  - O kit grava o campo (`lib.sh:206` `ticket_set_tentativas`), então nos repos do kit sai o número.
  - Num repo legado (Comarka) sairia "sem dado", pela mesma causa da A4.

### Mapa das classes do documento sobre R1–R7

| classe do brief | já existe como | novo? | nota |
|---|---|---|---|
| HARNESS | **R6** "motor: mediu ou decidiu errado" | regra nova (D-harness), firme | hoje nenhuma regra produz R6 a partir de critério |
| SPEC_ALLOWLIST | **R1** | ampliação | hoje só "teste acoplado" (D6/D6b); falta (a) a prova por reprodução (854, 966) e (b) o motivo do juiz (318c) |
| SPEC_CRITERIO | **R2** | a família `grep -c` é forma nova | o R2 mecânico de hoje só vê `unbound variable` |
| SPEC_DESATUALIZADA | nenhuma; mais perto de R3/R4 | **nova** | prova: o recon ou o critério de pré-condição falha no HEAD da base |
| EXECUTOR_DESISTIU | nenhuma | **nova, mas como estado** | diff 0 e parada declarada é *como* falhou, não o destino. Proponho que seja um campo (`desistiu: {motivo}`) com a classe da causa por baixo (830 → SPEC_ALLOWLIST, 835 → SPEC_DESATUALIZADA) |
| BASELINE_VERMELHA | **R5 base** (D5) | — | ganha a prova por reprodução da P2 |
| CODIGO | (ausência de classe) | rótulo | só quando nada acima casa; é o retry normal |

## Divisão do trabalho

**KIT (esta sessão)**
- Isolamento do critério no executor do kit (`executor.sh:466`; vale também para o legado do kit). É motor do kit: entra por esta etapa, com vermelho.
- P1 a P6 abaixo.

**COMARKA (porte separado, só plano)**
1. Conferir e dar push do `31104d0` (já feito, sem push). O item do brief vira só verificação.
2. Preservar a tentativa: `git update-ref refs/orq/tentativas/<id>-<n> HEAD` antes do `cleanup_worktree` (`executor.sh:444`) e do `setup_worktree` (`:421`), com poda por idade.
3. Importadores no pré-voo: em `executor.sh:488`, para ticket de remoção, bloquear como SPEC_DESATUALIZADA sem chamar o Claude.
4. Autocommit por campo: em `local-loop.sh:285`, commitar só se o diff do arquivo contra o HEAD estiver contido em `status`/`notas_status`. Arquivo com outra mudança fica de fora, com aviso no log.
5. HARNESS não consome retry: detectado pelo padrão da saída no `run_criterios`, depois do `:231`.
6. BASELINE_VERMELHA comprovada pausa e alerta.
7. Coluna "tent." (`orq-painel.py:203`) pelo `meta.json`.
8. Regras da P4 no `validar-fila.py`: a camada 6 já existe como WARN (`:58` `REGRAS_NOVAS_COMO_ERRO = False`); é promover para ticket novo, mais a regra `grep -c &&`.

## Plano (por prioridade; teto de linhas de código de produção por item, testes à parte)

**P0 · isolar o critério no kit**
- O que muda: `executor.sh:466` passa a usar o `roda_cmd_isolado`, com o `BASE_REF` exportado no env.
- Teto: **~25 linhas**.
- Vermelho: `test-*.sh` com o critério do 933 no estado certo dá `unbound variable` hoje.
- Verde: a mesma saída do bash limpo (`ST_0_x`, que segue reprovando, e é certo).

**P1 · classes como rótulo sobre R1..R7**
- Campo `rotulo_classe` mais o estado `desistiu`.
- Regras novas, cada uma com a linha real de hoje como fixture:
  - D-harness → R6 firme;
  - D-juiz-allowlist → R1 **palpite** (318c);
  - D-desistiu → lê só a **última** mensagem do `claude-output.txt` e o diff 0. Isso fere "o que o agente disse nunca entra em regra" (pergunta 3).
- Teto: **~180 linhas**.
- Gabarito: os 8 mais os da 7f-b1 a 7f-b5, com zero firme errado.

**P2 · reprodução ao bloquear**
- Uma worktree temporária fora do repo, no `head.txt` (o commit existe, A2), ou no `diff.raw` aplicado se o commit sumiu.
- Roda o critério que falhou isolado (`env -u SHELLOPTS -u BASHOPTS bash --noprofile --norc -c`) na tentativa e na base.
- O vitest só nos arquivos que falharam, com `node_modules/.bin/vitest`; ausente, erro explícito.
- Grava as saídas no diagnóstico e apaga ao fim.
- Teto: **~220 linhas**.
- Isto é o que pode tornar 854 e 966 R1 **firme**: base verde e tentativa vermelha no mesmo teste, em ≥ 2 tentativas.

**P3 · ação sugerida pronta**
- SPEC_ALLOWLIST: o patch do `.md` (allowlist e `testes_conferidos`) e um comando de 1 linha.
- Motivo do juiz com "ampliar a allowlist com X" vira ação extraída.
- HARNESS: a lista de requeue em lote.
- Teto: **~150 linhas**.

**P4 · prevenção no `gate-ticket.ts`**
- Regras:
  - `x=$(… grep -c …) &&` sem `|| true`;
  - `origin/` em critério;
  - remoção de símbolo com importador fora da allowlist;
  - C11 vira **erro só para ticket novo**.
- Teto: **~200 linhas**.
- **Medição estática já feita** (`7f-b6/contar-formas.txt`):
  - a forma `grep -c &&` está em **12 tickets abertos do Comarka** (921, 921b, 922, 922b, 923, 923b, 924, 924b, 924c, 924d, 924f, 926b) e em 7 done;
  - Actus e conteudos-infinitos: 0;
  - `origin/`: 1 aberto (991) e 316 done no Comarka. Erro só para ticket novo, senão é ruído.
- Os 12 são candidatos a reprovar no estado certo, como o 933. Falta rodar cada um para separar o real do falso positivo, o que faço na peça.

**P5 · pendências da 7f-b5 e o comparador do R2**
- Direção da sobreposição (o que já reprovou espera o outro).
- O firme errado da D6 no 762.
- `grep -c` como segunda forma mecânica do R2.
- **Novo:** `equivalentes` (`desfecho.ts:95`) passa a aceitar "os dois reprovam" na árvore `nao_feito` (mesmo `passa`, saída diferente) e a exigir identidade só na `head`.
- Teto: **~120 linhas**.

**P6 · painel K12**
- Classe e ação por linha (lendo os diagnósticos).
- Tentativas reais pelo `meta.json` no legado.
- Reprovas das últimas 24 h por classe.
- Alerta de `main` local com commits sem push que tocam fila ou motor. O caso real de hoje: **6 commits, inclusive o motor**.
- Teto: **~200 linhas** (py e js).
- **Deriva (966):** o diagnóstico guarda a allowlist **do bloqueio** e não é sobrescrito por classe derivada de um `.md` editado depois. Cabe aqui ou na P1, com **~40 linhas**.

Ordem proposta: P0, P1, P2, P5 (comparador), P3, P4, P6. A P2 alimenta o firme da P1 para 854 e 966; antes dela, eles ficam palpite.

## Perguntas que só você responde

1. **O `31104d0`** (motor do Comarka, "PORTE-PENDENTE", sem push) foi seu ou de outra sessão? Posso tirar o isolamento do brief do porte e deixar só a conferência e o push?
2. **P0 no kit:** isolar o critério no `executor.sh:466` do kit entra nesta etapa? Recomendo que sim: é a mesma classe de bug e o kit é o motor.
3. **EXECUTOR_DESISTIU** como estado com a causa por baixo, em vez de classe? E posso ler a **última mensagem** do `claude-output.txt` para mostrar o motivo do executor? Hoje a §13.3 proíbe que o que o agente disse entre em regra. Proposta: entra só como **texto exibido**, nunca para decidir a classe.
4. **854 e 966 firmes:** com a P2 provando "base verde e tentativa vermelha no mesmo teste, em ≥ 2 tentativas", aceita R1 firme (o resolvedor em `auto` aplica)? Ou fica palpite até medir no corpus?
5. **318c (allowlist pelo juiz):** a ação deve ser só proposta, ou o R1 pode aplicar sozinho num arquivo de `src`, e não de teste? Recomendo só proposta.
6. **Comparador do R2:** aceita "os dois reprovam em `nao_feito`" como equivalente? Se sim, recontar os 3 erros de hoje (933, 934b, 935) como acertos no ledger, que é escrita em `~/.orq`, fora do escopo desta sessão? Ou só valer daqui para a frente?
7. **"Ticket novo"** para a C11 e as regras da P4 virarem erro: o critério é a data de criação do arquivo no git, depois do merge desta etapa? Ou a ausência de `status`?
8. **Os 12 abertos com `grep -c &&`** (921 a 926b): eles estão na `docs/fila` do Comarka, onde não posso escrever. Quer que eu só liste, com a reprodução de cada um, no relatório final?

## Respostas do usuário (12/10) e ajustes ao plano

1. **`31104d0`** (Lucas Santos, 12/10 11:11, só ref local): troca o `eval` por `roda_cmd_isolado` (`env -u SHELLOPTS -u BASHOPTS NO_COLOR=1 FORCE_COLOR=0 bash --noprofile --norc -c`) nos três pontos: priming, critério e recon. São 14 linhas adicionadas e 3 removidas em `executor.sh`.
   - **O que ele cobre:** a herança de `set -euo pipefail` no critério, no priming e no recon.
   - **O que ele NÃO cobre:** HARNESS sem consumir retry; refs das tentativas; importadores no pré-voo; autocommit por campo; BASELINE_VERMELHA; tent. pelo `meta.json`; promoção da camada 6 e da regra `grep -c` no `validar-fila.py`.
   - **No porte:** sai o isolamento. Entra uma conferência só de leitura: o `31104d0` isola de fato (reproduzir o 933 com ele) e HARNESS não consome retry (hoje consome: falta fazer).
2. **P0 entra.**
   - Vermelho: critério com variável vazia e critério com `grep -c` sem ocorrência, os dois rodando dentro do executor.
   - Contra-teste: um critério que deve falhar continua falhando.
   - Sem instalar no CI.
3. **EXECUTOR_DESISTIU fica só como estado.** A causa é a última mensagem do executor, exibida como texto no diagnóstico e no painel, sem nenhuma ação automática.
4. **R1 firme vale só com três condições juntas:**
   - a reprodução prova base verde e tentativa vermelha no mesmo arquivo de teste;
   - esse arquivo está fora da allowlist;
   - a guarda de contagem (it/test e expect) é aplicada como no R1 atual.

   Rodar no corpus: o número de firmes errados segue zero, e o 762 entra no gabarito como caso negativo.

**Acréscimos ao plano:**
- **P5:** `desfecho.ts:95` passa a aceitar equivalência por resultado: proposta e comando humano, rodados no mesmo estado, dão a mesma saída. Texto idêntico deixa de ser exigido. Mostrar quantos R2 do ledger viram acerto.
- **P1/P2:** o diagnóstico lê o `.md` do ticket como estava no commit do bloqueio, nunca o atual.
- **P2:** reproduzir pelo `head.txt`, cujo commit ainda existe. Só cair no `diff.raw` se o objeto tiver sumido.
5. **318c:** só proposta, citando `nichos-teses-aba.tsx:372`. Sem ação automática.
6. **Ledger:** não reescrever. A recontagem fica no relatório.
   - Comando novo `orq resolvedor reavaliar`: acrescenta ao ledger uma linha `reavaliacao` para cada desfecho antigo que vira acerto pela regra nova.
   - Não apaga nem altera linhas existentes.
   - `--dry-run` é o padrão. O usuário roda depois do merge.
7. **Ticket novo:** o primeiro commit do arquivo é depois da data de corte, numa constante. Ticket ainda sem commit também conta como novo. Os antigos seguem como aviso.
8. **Os 12 com `grep -c &&`:**
   - reprodução de cada um no scratchpad, no estado "nada feito";
   - separar os que reprovam mesmo no estado certo;
   - dar o comando corrigido de cada um.

## P0 — fechada (`48c031a`, 7f-b6-0)

- `executor.sh:466`: troca o `eval` num subshell por `env -u SHELLOPTS -u BASHOPTS BASE_REF=… NO_COLOR=1 FORCE_COLOR=0 "$BASH" --noprofile --norc -c "$cmd"`.
- Teste: `scripts/orquestrador/test-criterio-isolado.sh`, no `test-shell.sh`. Roda o executor de verdade.
- Achado: o `-e` nunca agiu no critério, porque o `eval` estava dentro de uma lista `&&`. Os culpados eram o `-u` (variável vazia) e o `pipefail` (`n=$(grep -c … | tr) && echo`).
- Para a P1: a prova do R2 (`resolvedor/r2.ts:98`) imita o harness antigo e ainda não muda.

Vermelho antes (motor anterior):

```
== 1 · variável não definida não aborta o critério ==
  FALHA c1: saída '/private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.AyNycucGtY/repo/scripts/orquestrador/executor.sh: line 466: NAO_DEFINIDA_7F6: unbound variable'
== 2 · grep -c sem ocorrência imprime 0 ==
  FALHA c2: saída ''
== 3 · BASE_REF chega ao critério ==
  ok    saída 'base=staging-auto'
== 4 · contra-teste: grep -c 0 contra espera 1 continua falhando ==
  ok    saída '0' e critério FALHA
== 5 · contra-teste: test -n de variável vazia continua falhando ==
  ok    critério FALHA
== 6 · comando inexistente continua NÃO EXECUTADO (rc 127) ==
  ok    rc 127 visto

2 CHECK(S) FALHARAM
```

Depois: `test-criterio-isolado.sh` 6/6 ok; `tsc` rc 0; `vitest` rc 0 (92 arquivos, 1549 testes); `test-shell.sh` rc 0 (27 scripts).
