# Levantamento 7d-1a: calibração do validador de spec

Sessão só de leitura, 25/09/2026. Não escrevi código de produto. Não escrevi em nenhum repo e não fiz commit, push, checkout, stash, worktree, `claude -p`, `instalar.sh` nem `launchctl`. Os scripts de simulação ficaram no scratchpad da sessão (`…/scratchpad/cal/`: `inventario.py`, `casos.py`, `simkit.ts`, `simcomarka.py`, `sim6v.ts`, `sim10.ts`, `seguro.py`). Eles importam o `gate-ticket.ts` do kit e as funções puras do `validar-fila.py` do Comarka, e rodam em memória. Todo git no Comarka rodou com `GIT_OPTIONAL_LOCKS=0`. As árvores de base foram extraídas com `git archive` para o scratchpad e apagadas depois do uso.

**HEAD durante a sessão:**
- **Kit:** começou em `9365f5e`. Durante a sessão entrou o `38864fd` (só `docs/defeitos/2026-09-25-aceite-vermelho.md`). `gate-ticket.ts`, `executor.sh` e `decisao.ts` não mudaram, então as linhas citadas valem para os dois.
- **Comarka:** o loop andou de `92bee2c` para `9efdf46` durante a sessão. Os `M` em `docs/fila` (306b, 360, 361, 544b, 545) são writeback do loop. Não toquei neles.

---

## 1. PASSO 0

### 1.1 Kit (`9365f5e`)

**`scripts/orquestrador/gate-ticket.ts`, os checks na ordem do `validarTicket` (`:739`):**

| # | O quê | Linha |
|---|---|---|
| 1 | bloco ```json parseável; fail-fast | `:744-749` (extração em `blocoJson`, `:109`) |
| 2 | campos obrigatórios de `pendente` (`CAMPOS_PENDENTE`, `:48`); `risco` basta existir | `:754-781` |
| 3 | `id` no formato `RE_ID = /^\d{3}[a-z]?$/` (`:63`) e igual ao prefixo do arquivo | `:783-791` |
| 4 | `status` no vocabulário | `:793-796` |
| 5 | critério: `tipo` ∈ alvo/guarda/avaliador, `cmd` e `espera` não vazios | `:800-810` |
| 6 | `checarCmd` (`:366-407`): `proibido_no_cmd` com isenção só do `$(` no 1º segmento; redirecionamento (`:229-242`); vitest com saída textual (`saidaTextualDoVitest`, `:321-327`); `grep -q` em pipe (`grepQuietoEmPipe`, `:297-309`) | chamado em `:811-814` |
| 6b | AVISO: caminho citado no objetivo fora da allowlist (`caminhosForaDaAllowlist`, `:345`) | `:823-834` |
| 7 | dependência = id da fila ou `humano:<token>` | `:836-849` |
| 8 | allowlist sobreposta com outro pendente sem dependência **direta** | `:851-871` |
| 9 | `contexto_juiz` (existe na branch alvo, não está na allowlist) | `:873-874`, `:897-927` |
| 10 | `exemplos_regex` (624): `checarExemplosRegex` (`:659-703`) sobre `padroesDoCmd` (`:516-577`); regra 2 = `cmd.includes(e.regex)` (`:692`) | chamado em `:815-818` |

- **Fora por decisão:** rodar alvo e guarda contra HEAD e executar `recon[]` (`:12-14`, peça 1b).
- **Pré-voo do `drive_ticket`** (`executor.sh:1248`):
  - bloco 5b em `executor.sh:1269-1325`;
  - `modo_pre_voo` é lido em `:1285`; ausente vale `aviso` (`:1286-1289`), e valor inválido é falha alta (`:1290-1293`);
  - em `aviso`: grava `GATE_TICKET_AVISO` e segue (`:1301-1306`);
  - em `bloqueia`: marca `bloqueado` sem worktree e sem tentativa (`:1309-1318`);
  - a chave está documentada em `config-chaves.ts:94`.
- **Onde o gate roda:** também em `orq validar` (`scripts/orq:297-302`). **Não há hook de pre-commit** no kit nem no `fixture/`: o gate não roda na criação do ticket.
- **Retry e escalada** (`decisao.ts`):
  - `decidirDesfecho`, `:444`: `diff_cap` vira `refatiar` (`:450-455`) e enforcement vira `refatiar` (`:475`);
  - `NUNCA_ESCALA`, `:531`;
  - `decidirRetry`, `:539`, com `max_retries` em `:554`;
  - ESCALAR só com `sub=juiz`, `:570`;
  - repetição em `ehRepeticao`, `:650`.
- **Critério:** o match fica em `lib.sh:1430-1440`. Número é igualdade exata; o resto é igualdade ou `grep -E`. A avaliação roda sob `pipefail` (`gate-ticket.ts:289-293`).
- **CHANGELOG** (`CHANGELOG.md:715-760`): seção "Porte do Actus", com as peças a (6v, 6q, 6b), b (pré-voo e `modo_pre_voo`), h (624) e l (casos do check 10). O próprio texto diz que os testes de k e l não entraram no `TESTES_HARNESS`.

### 1.2 Levantamentos
- **`levantamento-bloqueios.md`:**
  - 165 tickets, dos quais 57 em `spec_criterio` (29) ou `spec_allowlist` (28): CI 6, Actus 12, Comarka 39;
  - a tabela está em `:71-237`;
  - afrouxamentos no §4 (`:347-380`);
  - achado de lá: o (e), gate no loop, deu **0 de 165 causal** (`:311-324`).
- **`relatorio-porte-actus.md`:**
  - **R2.2** (`:207-213`): check 10 marca 77/84 done no CI e 76/143 no Actus;
  - **R2.3** (`:215-221`): o 510b[5] com `\"` não tem `regex` de exemplo que passe;
  - **§6** (`:89-114`): o 216 do CI como falso positivo da regra do vitest.

### 1.3 Comarka (só leitura)

**`scripts/validar-fila.py` (573 linhas):**

| Ponto | Linha |
|---|---|
| `compara` (substring; número = igualdade) | `:36-40` |
| `run()`: **`subprocess.run(cmd, shell=True, executable="/bin/bash")` no cwd**, env `NO_COLOR=1 FORCE_COLOR=0 LC_ALL=C` | `:43-56` |
| C1 recon: roda cada `recon_esperado`, divergiu = ERRO | `:502-512` |
| C2 forma (`lint_forma`): `grep -c … \|\| echo` = ERRO (`:116-123`, `:131-134`); `grep -P` WARN; prefixo `arquivo:` com espera numérica WARN; `grep -r` em alvo único WARN; espera numérica e saída vazia WARN; `rc>1` = ERRO (exceção: rc 127 com `cria_novo`); sem `2>&1` WARN | `:126-166` |
| C3 ausência com padrão amplo sem exceção (523b), WARN | `:189-210`, `:520-526` |
| C4 regex com acento em locale C (533), WARN | `:247-283`, `:511`, `:527` |
| C5 guarda que **já falha** contra HEAD = ERRO | `:538-543` |
| C6 alvo que **já passa** contra HEAD = WARN | `:544-547` |
| C7 dependência órfã = ERRO | `:377-380` |
| C8 allowlist sobreposta sem dependência (fecho **transitivo**) = WARN | `:386-409` |
| C9 topologia: pathspec existe no disco (main) e não em `origin/staging-auto` = ERRO | `:302-343` |
| C10 `prioridade` fora de 1..99 = ERRO | `:346-369` |
| C11 colisão de teste: basename (≥6 chars) de arquivo da allowlist citado em 1 a 4 testes fora da allowlist = WARN | `:412-467` |

- **Quando roda:** o `.githooks/pre-commit:31-40` roda o `validar-fila.py <ids>` nos tickets em staging, com `core.hooksPath=.githooks`. **Valida na criação.**
- **Formato de ticket:**
  - `docs/fila/_TEMPLATE.md`, com o bloco ```json; o `tipo` do critério não é obrigatório;
  - `espera: "avaliador"` com `cmd` vazio é o critério qualitativo;
  - campos opcionais `recon_esperado`, `cria_novo` e `prioridade`.
- **Motor** (`scripts/orquestrador/executor.sh`):
  - `run_recon` (`:280-303`) roda o recon na worktree antes do modelo; se diverge, o ticket vira **`obsoleto`** sem tentativa (`:471-484`);
  - `aviso_allowlist` só avisa (`:329-402`);
  - a última tentativa usa `retry_final_model=opus` (`:498-506`);
  - **enforcement é `bloqueado` imediato, sem retry** (`:566-593`);
  - **diff cap é `reprovado`** (gasta retry, não refatia; `:597-605`);
  - circuit breaker por motivo normalizado, na 2ª repetição (`:703-724`);
  - pausa da fila por gate repetido entre tickets (`:711-719`, `:734-740`);
  - retries esgotados viram `bloqueado` (`:741-746`);
  - sobe um dev server para critério HTTP (`:159-190`).
- **Config:** `max_retries 2`, `diff_cap_linhas 900`, `gate_streak_limite 2`, `disjuntor_sem_progresso_limite 3` (`docs/fila/000-config.json`). **Não tem `gate_ticket`.**
- **Match:** `lib.sh:630-640`, idêntico ao do kit.
- **PLAYBOOK, lições de 26/08 a 04/09** (`docs/orquestrador/PLAYBOOK.md`):
  - `:334-354` (26/08): critério negativo não pode proibir o que a tarefa exige. Testar o `espera 0` contra artefato que já passou; proibir o padrão menos a exceção.
  - `:356-401` (03/09): allowlist `dir/` não casava nada (conserto `normalizarEntradaAllowlist`). O gate streak não vale para o enforcement.
  - `:403-428` (03/09): o gate consertado rodava de cópia congelada. "Código de harness tem UMA casa".
  - `:430-454` (03/09): **o validador roda em main e o executor em staging-auto.** Todo `cmd` tem de dar o mesmo resultado nas duas; usar `>=` com o número medido em main.
  - `:501-527` (04/09): comentário não executa (`ehComentario`).
  - `:529-548` (04/09): 8 bloqueados revisados. Critério que reexecuta gate, guarda com `git diff HEAD`, recon envelhecido.
  - `:598-656` (04/09): allowlist incompleta torna o ticket impossível. **Regra de recon `grep -rl "<basename>" test/`, cada resultado na allowlist com guarda de contagem e de skip** (`:607-624`). Critério `alvo` em arquivo a criar (`:626-633`). Recusa fundamentada não é falha de gate (`:635-646`).
  - `:718-778` (07-08/09): "criar X" exige recon que prove ausência. Allowlist que não cobre o arquivo real faz o agente construir paralelo. Objetivo com N frentes estoura o cap N vezes.

### 1.4 O `validar-fila` do Comarka escreve ao rodar? **Sim. Não é só leitura.**

Evidência no código:
- **Executa comandos arbitrários.** `validar-fila.py:54-55` roda cada `cmd` de `recon_esperado` (`:504`) e de `criterios_aceite` (`:529`) com `shell=True` no checkout principal. Esses `cmd` escrevem. Exemplos reais dos tickets:
  - `npm run build > /tmp/build_257.log` (257, 264, 273, 277, 288, 294);
  - `rm -rf .next && npm run build` (161);
  - `npx vitest run …` (cache em `node_modules/.vite`) e `npx tsc --noEmit` (`tsconfig.tsbuildinfo`, `.next/types`).
- **Roda git sem `GIT_OPTIONAL_LOCKS=0`.** São `git rev-parse`, `merge-base`, `rev-list`, `cat-file` (`:321`, `:325-326`, `:338`) e `git ls-files test/` (`:425`), todos herdando o ambiente sem a variável. Isso viola a regra desta sessão para o Comarka.

Por isso **não rodei o validar-fila**. Reimplementei em memória:
- **Regras estáticas:** importei as funções puras do arquivo (`grep_c_ou_echo`, `lint_forma`, `ausencia_ampla_sem_excecao`, `regex_com_acento`). O `import` só executa `def`s e constantes.
- **Regras de fila, topologia e colisão:** reescritas sobre dados do git.
- **Regras que executam `cmd`:** rodaram numa cópia da árvore de base no scratchpad, e **só para `cmd` de inspeção pura**: grep, awk, sed, wc, test, find, jq, cat, head, echo e afins. Nenhum npx, npm, node, git, curl, bash, rm ou crase.

---

## 2. Por que o Comarka bloqueia menos

### 2.1 Números

**Recorte:** tickets que rodaram no loop (existe `runs/<id>/attempt-*`). No Comarka, só os de 1ª execução desde 26/07/2026 (60 dias). CI e Actus, histórico inteiro. Bloqueios vêm da tabela do levantamento.

| | CI | Actus | Comarka |
|---|---|---|---|
| tickets executados | 83 | 128 | 648 |
| com bloqueio (qualquer classe), dos que rodaram | 25 (**30,1%**) | 38 (**29,7%**) | 76 (**11,7%**) |
| bloqueios com ≥1 tentativa (exclui os que nasceram bloqueados) | 23 (27,7%) | 31 (24,2%) | 73 (11,3%) |
| **bloqueio por spec** (`spec_criterio` + `spec_allowlist`) | 6 (**7,2%**) | 12 (**9,4%**) | 38 (**5,9%**) |
| `obsoleto` pelo recon sem tentativa (não conta como bloqueio) | — (sem recon) | — | 20 (`meta.json` com `obsoleto`) |
| allowlist por ticket done, média / mediana | 3,3 / 3 | 2,5 / 2 | 3,7 / 3 |
| critérios por ticket done, total / executáveis (mediana) | 15,2 / 13 | 6,2 / 5 | 7,5 / 5 |
| tickets done com `recon_esperado` | 0 | 0 | **398 de 608 (65%)** |
| `tipo` do critério: guarda / alvo / avaliador / **sem tipo** | 568 / 380 / 164 / 131 | 206 / 193 / 66 / 329 | 1180 / 243 / 17 / **3134** |

**Padrões de `cmd` dominantes** (% dos critérios executáveis dos done; um critério pode ter vários):
- **CI:** `grep -c` 70%, `$(` 36%, `wc -l` 23%, `test -f` 17%, `git diff/log` 16%, vitest lido por texto 14%.
- **Actus:** `grep -c` 45%, `git diff/log` 19%, `grep -q` 15%, vitest por rc 12%, vitest por texto 8%.
- **Comarka:** `|| echo` 59% (a forma `… && echo OK || echo FAIL`), `grep -c` 40%, `grep -q` 23%, `$(` 19%, vitest por rc 17%, `tsc` 10%, vitest por texto 10%.

**Leitura:**
1. **No bloqueio por spec, a diferença é menor do que parece.** Comarka 5,9% contra 7,2% (CI) e 9,4% (Actus). A taxa total, 11,7% contra ~30%, vem de outras classes:
   - CI: 13 bloqueios de `motor`, quase todos o placar ANSI de agosto;
   - Actus: 21 `humano` (os tickets de harness 622-632 por desenho) e 9 `dependencia` nascidos bloqueados;
   - e do volume: 648 tickets em 60 dias diluem.
2. **Parte do "bloqueia menos" é reclassificação.** Recon divergente vira `obsoleto`, não `bloqueado` (`executor.sh:471-484`). São 20 tickets no Comarka que em outro motor contariam como bloqueio de spec. Somando esses 20 aos 38, o Comarka vai a ~9,0%, no mesmo patamar dos outros dois.
3. **O que de fato reduz o bloqueio de spec no Comarka é o que acontece antes do loop:**
   - recon executável em 65% dos tickets;
   - validador executando os critérios na criação (pre-commit);
   - um PLAYBOOK de lições de spec aplicado na escrita (grep dos testes que citam o alvo, "criar exige provar ausência", `>=` medido).
   - A política de retry do Comarka é **mais dura** que a do kit: enforcement bloqueia na 1ª, diff cap gasta retry até bloquear. Os 15 bloqueios de `tamanho` são todos dele. Não é por ela que ele bloqueia menos.

### 2.2 O que o Comarka faz e o kit não faz

| # | Comarka | Kit | Valor medido nesta sessão |
|---|---|---|---|
| 1 | Valida na criação: pre-commit roda o validador nos tickets em staging (`.githooks/pre-commit:31-40`) | só no pré-voo do `drive_ticket` (`executor.sh:1269-1325`, padrão `aviso`) e no `orq validar` manual (`scripts/orq:297-302`); sem hook | o erro chega a quem escreve antes de gastar tentativa |
| 2 | Executa `recon_esperado` na criação (`validar-fila.py:502-512`) e no run, antes do modelo (`executor.sh:280-303`, `:471-484` → `obsoleto`) | não executa recon (`gate-ticket.ts:12-14`); o `migrar-tickets` só renomeia `recon_esperado` → `recon` (`CONTRATO.md:724`) | C1: **0 falso positivo** nos 3 repos; pegou 288 e 264 com causa |
| 3 | Executa critério contra HEAD: guarda que já falha = ERRO, alvo que já passa = WARN (`:538-547`) | fora por decisão (peça 1b, `gate-ticket.ts:12-14`) | C6 pegou 391a; C5 dá 66 FP no formato kit (ver §3) |
| 4 | `grep -c … \|\| echo` = ERRO (`:116-134`) | nada | pegou CI 003, Comarka 407a0 e 486, todos com causa |
| 5 | Colisão de teste por basename (`:412-467`) | só o AVISO do objetivo (6b, `gate-ticket.ts:823-834`) | C11 pegou 152, 161, 402 e 277 com causa (o arquivo que o humano pôs na allowlist é o que a regra lista) |
| 6 | Ausência com padrão amplo sem exceção (`:189-210`) | nada | pegou 523b |
| 7 | Regex com acento em locale C e paridade de ambiente (`LC_ALL=C NO_COLOR`) no validador (`:53`, `:247-283`) | nada; o kit também roda sob launchd | 12 avisos em (a) no Comarka, 0 com causa |
| 8 | Sobreposição de allowlist com fecho **transitivo** e como WARN (`:386-409`) | dependência **direta** e ERRO (`gate-ticket.ts:851-871`) | FP cai de 3/15/119 para 0/14/77 |
| 9 | Distingue guarda de alvo no aviso de allowlist (`executor.sh:385-388`) | o 5 exige `tipo`, mas nenhuma regra usa a distinção | — |
| 10 | Dev server para critério HTTP (`executor.sh:159-190`) | nada | fora da amostra (classe `motor`) |

**O que o kit deveria copiar, em ordem de retorno medido:**
1. O **recon executado**, na criação e no pré-voo, contra a branch alvo e não contra main (a lição de `PLAYBOOK.md:430-454`), com o `obsoleto` sem tentativa;
2. a **colisão de teste** (C11) como aviso;
3. o **`grep -c || echo`** (C2);
4. o **hook de pre-commit** rodando o gate de ticket (o valor está em avisar na hora de escrever, não no loop);
5. a **ausência ampla** (C3);
6. o **fecho transitivo** no check 8;
7. **paridade de ambiente** do validador com o executor (`LC_ALL=C`, `NO_COLOR`, `BASE_REF`).

---

## 3. Matriz por regra e por repo

### Método
- **(a) done que nunca bloquearam:**
  - done hoje, sem nenhum `bloqueado`/`refatiar` em nenhuma versão do arquivo em nenhuma branch (`git log --all`), e com `runs/<id>/attempt-*`;
  - CI 58, Actus 91, **Comarka 557** (done com 1ª execução desde 26/07);
  - a versão avaliada é a última antes do 1º commit com `em_execucao`/`done`.
- **(b) os 57:** a versão avaliada é a última antes do 1º commit com `bloqueado`/`refatiar`.
- **Status:** forçado a `pendente` no objeto JSON (em memória, sem `replace` de texto: não repeti o defeito do levantamento).
- **Fila para os checks 7, 8 e C8:** a versão de cada ticket no instante T.
- **Base para as regras de árvore:**
  - (a) = **1º pai do merge `frente/<id>` em staging-auto**: CI 58/58, Comarka 555/557, Actus só **43/91**. No Actus o staging-auto foi recriado e o merge de 48 tickets não existe mais.
  - Nesses 48, usei `staging-auto` antes de T, que **já contém o trabalho do ticket**. Por isso "alvo já passa" do Actus (a) não é medível: os 31 disparos são todos desses 48.
  - (b) = `staging-auto` antes do 1º bloqueio.
- **C9 (topologia):** `main` contra `staging-auto` no instante do commit da versão do ticket.
- **Config das regras 6 do kit:** a do template (`fixture/docs/fila/000-config.json`) nos três repos, porque o Comarka não tem `gate_ticket`. Com a config própria de CI e Actus, só muda o `$(` do CI (a): 54 → 37.
- **`cmd` executados:**
  - (a): CI 459 de 780, Actus 232 de 467, Comarka 2564 de 4498;
  - (b): CI 56/91, Actus 19/54, Comarka 207/331;
  - o resto não é inspeção pura (npx, npm, git, node, curl) e **não foi rodado**.
- **"Causal"** = a regra aponta o defeito que bloqueou ou o que o humano mudou para destravar. É juízo meu, ticket a ticket, contra a causa da tabela do levantamento e o commit de destrave. Conferi 402, 277 e 313b pelo diff do destrave.

### 3.1 Disparos em tickets

(a) = falso positivo por definição. (b) = verdadeiro positivo por definição. A coluna "causal" diz quantos dos disparos em (b) acertam a causa.

| regra | nível hoje | (a) CI /58 | (a) Actus /91 | (a) Comarka /557 | (b) CI /6 | (b) Actus /12 | (b) Comarka /39 | causal em (b) |
|---|---|---|---|---|---|---|---|---|
| **kit 1** json | erro | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **kit 2** campos (risco 609, bloco 461, criterios 1) | erro | 4 | 48 | 557 | 2 | 4 | 39 | 0 |
| **kit 3** id `NNN[a]` | erro | 0 | 0 | 23 | 0 | 0 | 1 | 0 |
| **kit 4** status | erro | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **kit 5t** `tipo` ausente | erro | 4 | 48 | 535 | 2 | 4 | 36 | 0 |
| **kit 5c** cmd vazio (`espera: avaliador`) | erro | 0 | 0 | 192 | 0 | 0 | 10 | 0 |
| **kit 6a `$(`** | erro | 54 | 7 | 74 | 5 | 0 | 7 | 0 |
| **kit 6a `rm `** | erro | 0 | 13 | 20 | 0 | 0 | 1 | 0 |
| **kit 6a `bash`/`sh -c`** | erro | 0 | 1 | 7 | 0 | 0 | 0 | 0 |
| **kit 6a** crase, `eval`, `sudo`, `curl`, `wget` | erro | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **kit 6r** redirecionamento | erro | 0 | 3 | 48 | 0 | 0 | 7 | 0 |
| **kit 6v** vitest por texto | erro | 53 | 34 | 272 | 6 | 9 | 14 | **6** (CI 016; Actus 431, 461, 470, 480, 481) |
| **kit 6q** `grep -q` em pipe | erro | 0 | 12 | 83 | 0 | 4 | 3 | **4** (Actus 431, 470, 480, 481) |
| **kit 6b** objetivo cita fora da allowlist | aviso | 55 | 60 | 363 | 5 | 10 | 26 | **1** (Actus 488) |
| **kit 7** dependência | erro | 0* | 0* | 0* | 0* | 0* | 0* | 0 |
| **kit 8** sobreposição direta | erro | 3 | 15 | 119 | 0 | 0 | 8 | 0 |
| **kit 9** contexto_juiz | erro | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **kit 10n** sem `exemplos_regex` | erro | 56 | 45 | 499 | 6 | 9 | 32 | 0 |
| **kit 10c** `\[`/`\]` em classe | erro | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **kit 10x** exemplo × padrão | erro | 0 | 8 | 0 | 0 | 0 | 0 | 0 |
| **C1** recon diverge | ERRO | 0 | 0 | **0** | 0 | 0 | 3 | **2** (288, 264) |
| **C2** `grep -c \|\| echo` | ERRO | 0 | 1 | 4 | 1 | 0 | 2 | **3** (CI 003; 407a0, 486) |
| **C2** rc>1 | ERRO | 36 | 9 | 20 | 3 | 2 | 0 | 0 |
| **C2** sem `2>&1` com rc>1 | WARN | 36 | 9 | 20 | 3 | 2 | 0 | 0 |
| **C2** espera numérica, saída vazia | WARN | 5 | 0 | 0 | 0 | 0 | 0 | 0 |
| **C2** `grep -P` / prefixo `arq:` / `grep -r` em alvo único | WARN | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **C3** ausência ampla | WARN | 3 | 0 | 9 | 0 | 0 | 2 | **1** (523b) |
| **C4** acento | WARN | 0 | 0 | 12 | 0 | 0 | 1 | 0 |
| **C5** guarda já falha contra a base | ERRO | 44 | 22 | 0 | 3 | 2 | 0 | 0 |
| **C6** alvo já passa contra a base | WARN | 3 | n/m (31†) | 87 | 1 | 1 | 4 | **1** (391a) |
| **C7** dependência órfã | ERRO | 0* | 0* | 0* | 0* | 0* | 0* | 0 |
| **C8** sobreposição transitiva | WARN | 0 | 14 | 77 | 0 | 0 | 3 | 0 |
| **C9** topologia | ERRO | 0 | 1 | 0 | 0 | 0 | 0 | 0 |
| **C10** prioridade | ERRO | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **C11** colisão de teste | WARN | 9 | 4 | 122 | 1 | 2 | 10 | **4** (152, 161, 402, 277) |
| **C12** allowlist sem arquivo e sem diretório pai (executor) | aviso | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| **C13** vitest de alvo fora da allowlist (executor) | aviso | 48 | 11 | 123 | 6 | 4 | 5 | 0 |

**Notas da tabela:**
- \* **Checks 7 e C7.** A simulação acusou 6 (Actus) + 8 (Comarka) em (a) e 4 em (b). **Conferi os 19 no `git ls-tree`: em todos, o arquivo da dependência existia na fila na hora.** O erro era do meu snapshot, montado só com arquivos que existem hoje. FP real: 0. Os checks 8 e C8 usam o mesmo snapshot, então podem ter o mesmo viés (para menos ou para mais).
- † **C6 no Actus (a):** os 31 disparos caem nos 48 tickets sem merge localizável, cuja base já tem o trabalho. Nos 43 com base correta: 0.
- **C5 no formato kit:** CI e Actus usam `guarda` para "o arquivo novo não tem skip/only" (`grep -cE '[.](skip|only|todo)\(' <teste novo>`). Na base o arquivo não existe, e o grep sai rc 2. É o mesmo motivo de C2 rc>1 disparar 36/9/20. No Comarka, guarda é quase sempre regressão de arquivo existente, e o C5 dá 0.
- **O 6v no Comarka acerta a forma.** Nos 326 critérios `grep -E 'passed|failed' | head -1` com espera `passed`, a suíte vermelha **aprovaria**. Os 272 tickets passaram porque o gate de vitest do motor cobre a suíte, não porque o critério prova algo.

### 3.2 Cobertura dos 57

- **Pela definição da sessão** (qualquer regra dispara = verdadeiro positivo): **57 de 57 são pegos, e 0 escapa.** O número não serve para decidir. Os checks 2, 5t e 10n disparam em 100% de (a) no Comarka e na maior parte de CI e Actus, ou seja, pegam o schema e não o defeito.
- Sem as regras de schema (2, 3, 5t, 5c, 10n): (b) 6/6, 12/12, 36/39; (a) 57/58, 89/91, 523/557. A regra continua sem discriminar.
- **Pela causa** (uma regra aponta o defeito que bloqueou):

| | CI | Actus | Comarka | total |
|---|---|---|---|---|
| pegos com causa só por regra do **kit** | 1 (016) | 6 (431, 461, 470, 480, 481, 488) | 0 | 7 |
| pegos com causa só por regra do **Comarka** | 1 (003) | 0 | 10 (407a0, 486, 288, 264, 391a, 152, 161, 402, 277, 523b) | 11 |
| **pegos por alguma regra, com causa** | **2/6** | **6/12** | **10/39** | **18/57** |
| **nenhuma regra pega com causa** | **4** (201, 230, 231, 242) | **6** (212, 441, 483, 490, 496, 497) | **29** | **39/57** |

**Os 39 que nenhuma regra pega com causa, por família:**
- **Premissa falsa ou trabalho já existente:** Comarka 103a, 336, 341, 257, 407; Actus 483, 490. Alvo e guarda não rodaram (cmd não seguro) ou não discriminam.
- **Teste acoplado fora da allowlist que o basename não acha:**
  - CI 230, 231, 201; Comarka 317, 328, 330, 331, 343, 528;
  - o motivo: basename curto (`route`, `page`), mais de 4 testes citando (o C11 corta em 4), ou acoplamento por import e não por nome.
- **Contradição entre critérios:** 032, 184, 475c, 522, 514, 273.
- **Allowlist sem o arquivo real, sem sinal textual:** Comarka 294, 306b, 313b, 325a, 335b, 342, 368, 391e, 410, 490, 538; Actus 441, 496, 497.
- **Espera como regex × `grep -c`:** Actus 212, resolvido no motor (`lib.sh:1430`).
- **Arquivo que sumiu por outro ticket:** CI 242. A guarda que lia `aprovacoes-link.test.ts` não disparou na base anterior ao 1º bloqueio.

---

## 4. Casos especiais

### 4.1 Check 10 com aspas duplas escapadas (R2.3, actus-saas 510b)

**Reproduzido** em memória com o `gate-ticket.ts` do HEAD (`sim10.ts`). O cmd do 510b[5]:

```
grep -vE '^[[:space:]]*(//|/?\*)' scripts/… | grep -oE "'perdida'|\"perdida\"|…" | tr -d "'\"" | sort -u | wc -l
```

Saída do check 10:
- `padrão '^[[:space:]]*(//|/?\*)' do cmd (grep) sem exemplo correspondente`;
- `regex de exemplo ''perdida'|"perdida"|…' não aparece literal no cmd`.

**Causa:** a regra 2 (`gate-ticket.ts:692`) procura o `regex` do exemplo no texto **cru** do cmd, onde está `\"perdida\"`. A regra 3 (`:686-690`) compara com o padrão **depois** da resolução de aspas pelo shell (`padroesDoCmd`, `:516`, via `palavrasShell`, `:472`), onde está `"perdida"`. Nenhum valor de `regex` satisfaz as duas regras ao mesmo tempo. O mesmo defeito, com aspas simples concatenadas (`'reenvio_legitimo|'perdida'|sem_evento'`), está no 528[1]; com `['"]`, no 510b[4] e no 512b[1].

**Correção (texto da regra):**
> Regra 2 passa a ser: "o `regex` de cada exemplo é **igual a um dos padrões que o shell entrega ao grep/awk** (o padrão depois de resolvidas as aspas, o mesmo que a regra 3 extrai do cmd)". Deixa de existir a comparação com o texto cru do cmd. As regras 2 e 3 viram a mesma bijeção: todo padrão extraído tem exemplo e todo exemplo corresponde a um padrão extraído.

**Achado junto, segunda família de falso positivo do 10x.** Os filtros de comentário `grep -vE '^[[:space:]]*(//|/?\*)'` e `grep -vE '^[[:space:]]*--'` são 12 das 20 mensagens do 10x em (a): 471, 471b, 471c, 508, 509, 510b, 512b.

**Correção (texto da regra):**
> "Padrão passado a grep com `-v` (exclusão de linha) não exige exemplo."

- **Alternativa mais estrita:** exige exemplo só positivo (a linha excluída), sem negativo.

**Efeito estimado na matriz** (lendo as 20 mensagens; não re-simulei):
- 10x (a) Actus: 8 → **0**. Os 8 tickets só tinham mensagens dessas duas famílias.
- 10x continua 0 no CI e no Comarka, e 0 causal em (b).
- Com zero FP nos três repos, o 10x corrigido passa a ser elegível a ERRO. O 10n (sem exemplos) não muda: 56/45/499.

### 4.2 Vitest com saída textual (falso positivo no CI 216)

**Classificação dos critérios marcados pelo 6v** (`sim6v.ts`). O pipeline depois do vitest roda com duas saídas simuladas de vitest: uma vermelha (`Tests  1 failed | 5 passed (6)`, `Test Files  1 failed | 2 passed (3)`) e uma verde (`Tests  6 passed (6)`). O match é o do harness.

| | (a) CI | (a) Actus | (a) Comarka | (b) CI | (b) Actus | (b) Comarka |
|---|---|---|---|---|---|---|
| **seguro**: só casa sem falhas (ex.: `grep -cE 'Tests +[0-9]+ passed'` espera `1`; `grep -c failed` espera `0`) | 113 critérios | 7 | 27 | 12 | 0 | 1 |
| **mente**: casa com a suíte vermelha (`grep -E 'passed\|failed' \| head -1` espera `passed`; `tail -5` espera `passed`) | 0 | 23 | 310 | 0 | 13 | 22 |
| não casa nem o verde (`… \| head -1 \|\| echo 'sem falha'`, cujo `\|\|` nunca dispara) | 0 | 6 | 21 | 0 | 0 | 1 |
| indeterminado (vitest dentro de `$( )`) | 0 | 0 | 37 | 0 | 0 | 0 |
| `vitest.config.ts` (falso positivo do §7 do porte) | 0 | 1 | 0 | 0 | 0 | 0 |

**Correção (texto da regra):**
> "Critério em que a saída do vitest (ou `npm test`/`pnpm test`) alimenta um pipe é violação **se, e só se, o critério aprovaria uma suíte com falha**: o pipeline depois do vitest, aplicado a uma saída de referência com `Tests  1 failed | 5 passed`, produz saída que casa a `espera`. Pipeline que só casa com zero falhas (`Tests +[0-9]+ passed` com `grep -c` e espera `1`, `grep -c failed` com espera `0`) é leitura equivalente ao rc e passa. `vitest` seguido de `.` (ex.: `vitest.config.ts`) não é o comando vitest."

- **Implementação sugerida (não é regra, é como medir):** reusar o mecanismo do check 10, rodando o trecho depois do pipe sobre duas saídas fixas.

**Efeito estimado em tickets:**
- (a) CI 53 → **0**; Actus 34 → 23; Comarka 272 → 250.
- (b): CI 6 → 0; Actus 9 → 9; Comarka 14 → 13.
- **Causal: 6 → 5.** O CI 016 deixa de ser pego. A causa real dele era ANSI sem `NO_COLOR` (`Tests +[0-9]+ passed` não casa com a saída colorida), e isso o motor já corrige (`executor.sh:454`, `NO_COLOR=1`).
- Os 23 e 250 que sobram são critérios que de fato mentem.
- **Mesmo corrigida, a regra não chega a zero falso positivo em (a):** os tickets passaram porque o gate de vitest cobre a suíte.

**Observação sobre a causa real no Actus.** Os 5 bloqueios caros (431, 461, 470, 480, 481; US$ 60+) não foram critério que **mente** com a suíte vermelha. Foram critério que **nunca imprime o esperado** com a suíte verde: `--reporter=dot` não imprime `passed`, e o `grep -q` em pipe morre de SIGPIPE sob `pipefail`. A regra acerta esses casos pelo sintoma (lê texto em vez de rc), não pelo motivo que o comentário dela dá.

---

## 5. Tabela de decisão

Critério: **ERRO só com 0 falso positivo em (a) nos três repos**. Valores de (a) na ordem CI/Actus/Comarka; causal = dos 57.

| Regra | Decisão | Justificativa (números) |
|---|---|---|
| kit 1 json | **ERRO** | 0/0/0; falha alta necessária para o executor ler o ticket |
| kit 2 campos obrigatórios | **CORRIGIR** → ERRO | 4/48/557 FP, 0 causal. Os disparos são `risco` (609 tickets) e `bloco` (461): nenhum dos dois é lido pelo executor. **Correção:** obrigatórios só `id, slug, objetivo, pathspec_allowlist, criterios_aceite, dependencias, status`; `risco` e `bloco` opcionais. FP depois da correção: 0/0/1 (Comarka com `criterios_aceite: []`, que é defeito real). ERRO depois disso |
| kit 3 id | **CORRIGIR** → ERRO | 0/0/23 FP: ids de fatiamento `407a0`, `315b1b`. **Correção:** `RE_ID = /^\d{3}[a-z0-9]*$/`, o mesmo sufixo do hook do Comarka. FP → 0 |
| kit 4 status | **ERRO** | 0/0/0 |
| kit 5t `tipo` ausente | **CORRIGIR** → ERRO | 4/48/535 FP, 0 causal; todos inferíveis. **Correção:** `tipo` ausente vale `avaliador` se `espera == "avaliador"`, senão `alvo`; só `tipo` presente e fora do vocabulário é erro. FP → 0 |
| kit 5c cmd vazio | **CORRIGIR** → ERRO | 0/0/192 FP, todos `espera: "avaliador"` sem cmd (critério qualitativo do Comarka). **Correção:** cmd pode ser vazio quando o critério é avaliador. FP → 0 |
| kit 5e espera vazia | **ERRO** | 0/0/0 |
| kit 6a `$(` | **DESLIGAR** | 54/7/74 FP, 0 causal (o levantamento já mostrava: o 242 destravou mantendo o `$(`). É a forma dominante de comparação numérica nos três repos (CI 36%, Comarka 19%) |
| kit 6a `rm `, `bash`, `sh -c` | **AVISO** | `rm`: 0/13/20 (`rm -rf .next` antes do build); `bash`/`sh -c`: 0/1/7. 0 causal |
| kit 6a crase, `eval`, `sudo`, `curl`, `wget` | **ERRO** | 0/0/0 FP e 0 TP: é regra de segurança, custo zero de calibração |
| kit 6r redirecionamento | **CORRIGIR** → AVISO | 0/3/48 FP, 0 causal. 49 são `npm run build > /tmp/build_<id>.log`; 1 é defeito de parse (`2>/dev/null)` dentro de `$( )` lido como arquivo `/dev/null)`, Comarka 522). **Correção:** o alvo do redirecionamento para no `)`; `/tmp/*` fora da worktree é aceito. Sobra 1 FP (`>` solto) → AVISO |
| kit 6v vitest por texto | **CORRIGIR** → AVISO | 53/34/272 FP; causal 6. Com a correção do §4.2: 0/23/250 FP, causal 5. Nunca chega a zero FP |
| kit 6q `grep -q` em pipe | **AVISO** | 0/12/83 FP; causal 4 (Actus, US$ 60+). O dano depende do `pipefail` do executor do kit. A correção de fundo é no executor (avaliar o critério sem `pipefail`, ou gravar o rc: item 1 do §5 do levantamento). Fora do escopo desta regra |
| kit 6b objetivo cita fora da allowlist | **AVISO** (manter) | 55/60/363 FP (83% de (a)); causal 1 (488, US$ 10). Muito ruído. Se o aviso passar a aparecer no pre-commit, restringir a caminho precedido de verbo de edição |
| kit 7 dependência | **ERRO** (manter) | 0/0/0 depois de conferir os 19 disparos da simulação (artefato); 0 causal |
| kit 8 sobreposição direta | **CORRIGIR** → AVISO | 3/15/119 FP, 0 causal. **Correção:** fecho transitivo (C8), que baixa para 0/14/77; como ainda há FP, AVISO |
| kit 9 contexto_juiz | **ERRO** (manter) | 0/0/0; amostra pequena (só Actus usa o campo) |
| kit 10n sem `exemplos_regex` | **AVISO** | 56/45/499 FP, 0 causal; nenhum ticket anterior ao 624 declara exemplos. Só dá para ERRO depois de migrar os pendentes |
| kit 10c `\[`/`\]` em classe | **ERRO** | 0/0/0 (o caso-origem 503 está fora da amostra) |
| kit 10x exemplo × padrão | **CORRIGIR** → ERRO | 0/8/0 FP, todos das duas famílias do §4.1. Depois da correção: 0/0/0 (estimado) |
| C1 recon diverge | **ERRO** (copiar) | 0/0/**0** FP (Comarka: 398 tickets com recon; CI e Actus não usam); causal 2 (288, 264). Rodar contra a branch alvo, não contra main. Divergiu no run = `obsoleto` sem tentativa, como o Comarka |
| C2 `grep -c … \|\| echo` | **AVISO** (copiar) | 0/1/4 FP; causal 3 (CI 003, 407a0, 486). Os 5 FP são o mesmo defeito latente (passaram porque o grep achou ≥1). Não fecha zero |
| C2 rc>1 | **CORRIGIR** → AVISO | 36/9/20 FP, 0 causal: grep em arquivo que o próprio ticket cria (rc 2). **Correção:** a exceção de `cria_novo` (hoje só rc 127) passa a valer para "No such file" de arquivo que está na allowlist do ticket. FP restante não medido |
| C2 sem `2>&1` | **DESLIGAR** | mesmos 36/9/20 do rc>1, é duplicata, 0 causal |
| C2 saída vazia com espera numérica | **AVISO** | 5/0/0 FP, 0 causal |
| C2 `grep -P`, prefixo `arquivo:`, `grep -r` em alvo único | **ERRO** para `grep -P`; **AVISO** para os outros dois | 0 disparo em (a) e (b). `grep -P` não existe no /usr/bin/grep, então é erro de plataforma com 0 FP. Os outros dois dependem da saída e não têm dado |
| C3 ausência ampla sem exceção | **AVISO** (copiar) | 3/0/9 FP; causal 1 (523b) |
| C4 acento em locale C | **AVISO** (copiar) | 0/0/12 FP, 0 causal. O kit roda sob launchd, com a mesma exposição |
| C5 guarda já falha | **CORRIGIR** → AVISO | 44/22/0 FP, 0 causal: guarda sobre arquivo que o ticket cria. **Correção:** guarda que cita arquivo ausente na base e presente na allowlist não é avaliada contra a base (é alvo disfarçado). Resíduo não medido |
| C6 alvo já passa | **AVISO** (copiar) | 3/n.m./87 FP; causal 1 (391a). É a regra certa para "premissa falsa" (103a, 336, 341), mas lá os `cmd` não eram de inspeção pura e não rodaram |
| C7 dependência órfã | **ERRO** | igual ao kit 7 |
| C8 sobreposição transitiva | **AVISO** | 0/14/77 FP, 0 causal; substitui o kit 8 |
| C9 topologia | **AVISO** | 0/1/0 FP, 0 causal (a classe dele, `topologia`, está fora dos 57). No kit, rodar contra `branch_alvo` torna a regra redundante com o C1 |
| C10 prioridade | **ERRO** se o kit adotar o campo | 0/0/0; o kit não tem `prioridade` |
| C11 colisão de teste | **AVISO** (copiar) | 9/4/122 FP; causal 4 (152, 161, 402, 277). É o melhor detector de `spec_allowlist` medido. Pega 4 de 28, porque o corte de 4 testes e o basename ≥6 deixam de fora 317, 328, 330, 343 e 528 |
| C12 allowlist sem arquivo e sem pai | **AVISO** | 0 disparos; sem dado |
| C13 vitest de alvo fora da allowlist | **DESLIGAR** | 48/11/123 FP, 0 causal; o parse captura `2>&1` e `--testNamePattern` como arquivo |

**Resumo para o modo do pré-voo:**
- **ERRO hoje, sem mudança de código:** 1, 4, 5e, 6a (crase, eval, sudo, curl, wget), 7, 9 e 10c. Nenhuma delas pegou causa nos 57.
- **Viram ERRO depois de correção** que é texto de regra: 2, 3, 5t, 5c, 10x.
- **Todas as regras que pegaram causa são AVISO por este critério:** 6v, 6q, 6b, C1, C2, C3, C6 e C11, com uma exceção (C1).
- **O C1 é a única com causa e zero falso positivo nos três repos**, e é a que o kit não tem.

---

## 6. Lacunas

1. **Comandos não executados.** 40% dos `cmd` de critério de (a) e metade dos de (b) não rodaram: npx, npm, node, git, curl, bash. Com isso, C5, C6, rc e saída vazia estão **subcontados**, em especial nos tickets de premissa falsa (103a, 336, 341), cujo critério discriminante chamava vitest ou tsc. Rodar esses comandos exigiria `node_modules` do repo, o que escreve cache dentro dele. Fica para uma sessão com worktree isolada.
2. **Base do Actus.** Para 48 dos 91 tickets (a) o merge em staging-auto não existe mais (staging-auto recriado em 11/09, `d034f60`). Neles, C6, C5 e rc rodaram contra uma árvore que já tem o trabalho: C6 não é medível ali.
3. **Snapshot da fila.** Só tenho os arquivos que existem hoje. Os 19 disparos do check 7 eram artefato disso e foram conferidos um a um. Os checks 8 e C8 usam o mesmo snapshot e **não** foram conferidos um a um.
4. **Dicionário de acento (C4)** montado com a árvore atual de cada repo, não com a da base.
5. **C9** replica o pre-commit com `main` e `staging-auto` locais no instante do commit da versão do ticket (`rev-list --before`). O validar-fila usa `origin/staging-auto` e o disco do checkout, e reflog de remoto não existe para o passado.
6. **Causal** é juízo meu, por ticket, contra a causa da tabela e o commit de destrave. Conferi o diff do destrave em 402, 277 e 313b. Nos outros, a leitura foi da tabela e das mensagens.
7. **Os efeitos das correções** do §4 e do §5 (10x, 2, 3, 5t, 5c, 6r, 6v) são contagem sobre os disparos já medidos, não re-simulação com o código corrigido. Exceção: a do 6v, que foi simulada pipeline a pipeline com saída de vitest de referência, e não com vitest real.
8. **Os 20 `obsoleto` por recon do Comarka** saíram de `runs/*/meta.json`, sem recorte de data. Não sei quantos seriam `spec` num motor sem recon.
9. **Recortes:** Comarka (a) = done com 1ª execução desde 26/07 **e** com `runs/`. Ficaram de fora 9 done sem `runs/` (merge manual ou reconciliação); no Actus foram 3 e no CI 1.
10. **O validar-fila não foi executado** (§1.4). O que está aqui é reimplementação. Onde ela diverge do original, a divergência é deliberada: rodar contra a base do executor, e não contra main, foi o pedido da sessão, e é a lição de `PLAYBOOK.md:430-454`.
