# Spec 7f-a: triador de bloqueios (só leitura)

Sessão de spec, 10/10/2026. Kit lido em `main` `3ad99bf`; comarka-operacional lido em `66fd07d`, todo git com `GIT_OPTIONAL_LOCKS=0`, sem rodar script dele. O único arquivo escrito é este. O protótipo da extração está no scratchpad desta sessão (`…/56667982-…/scratchpad/proto/extrai3.py`, saída em `saida.json`) e leu os runs do Comarka e o `casos.json`/`comarka-ev.json` da medição de 09/10 (`…/4a712901-…/scratchpad/med/`).

**O que o triador é:** um processo do kit que, para cada ticket bloqueado de um repo do `~/.orq/repos.json`, lê a evidência que o motor já gravou, diz **qual dos sete destinos (R1 a R7)** o bloqueio tem, **onde está a prova** (`arquivo:linha`) e **o remédio em uma linha**, grava isso **fora do repo** e o painel K12 mostra. Ele não decide, não reabre e não reescreve nada.

---

## 0. Fontes lidas (PASSO 0)

### 0.1 Medição de 09/10 (`~/orq-sessoes/medicao-bloqueios-out.md`)
- Tabela por bloqueio: `:100-138` (37 eventos, todos do Comarka). Pausas sistêmicas: `:142-148`.
- Resíduo R1-R7: `:200-208`. Somas: `:210-213`. "A causa já estava escrita" no claude-output ou no verdict em ≥ 25 de 37: `:170`.
- Recomendação "só triador, diagnóstico no painel": `:241-246`.
- Achados do motor do Comarka (árvore suja vira "conflito"; streak zera com `--off`; streak confunde dois defeitos de spec): `:215-219`.

### 0.2 Kit (`3ad99bf`)
| o quê | onde |
|---|---|
| Painel: regra "lê só o contrato" | `scripts/orquestrador/orq-painel.py:9-19` |
| Painel: lista de repos (`~/.orq/repos.json`) | `orq-painel.py:113-144` |
| Painel: coleta por repo (lê `events.log`, tickets, STATUS) | `orq-painel.py:587-675`; trilha em `:593` |
| Painel: trilha ausente vira lista vazia | `orq-painel.py:219-226` |
| Painel: categoria do bloqueado, só de `motivo=`/`sub=` da trilha | `orq-painel.py:521-553` |
| Painel: motivo cortado + texto inteiro no clique | `orq-painel.py:506-518`, `:633-646`; HTML em `:1268-1290` |
| Painel: detalhe do repo por clique (`#repo/<nome>`) | `orq-painel.py:1332-1350`, roteamento `:1390-1392` |
| Painel: apuração em thread fora da resposta (K12-J, o molde do gatilho) | `CONTRATO.md:821-829`; `orq-painel.py:395-465` |
| **Como o painel trata o Comarka hoje** | ele está no `repos.json`, mas não tem `events.log`: `ler_trilha` devolve `[]` (`:224-226`), todo bloqueado cai em `"decisão sua"` / `"sem BLOQUEADO na trilha"` (`:529-542`), `parado_desde` e `parado_seg` saem "sem dado" (`:644-645`), e o motivo mostrado é o `notas_status` ("motivo repetido: provável defeito de spec/harness…") |
| CONTRATO: `runs/` (layout) | `CONTRATO.md:60-80` |
| CONTRATO: trilha e `BLOQUEADO` (motivos fechados) | `CONTRATO.md:161-205`, `BLOQUEADO` em `:187` |
| CONTRATO: linha `GATE` (`fora_do_pathspec=`) | `CONTRATO.md:361-393` |
| CONTRATO: `meta.json` (`attempt` 0-based, `diffLines`, `resultado`, `dir`) | `CONTRATO.md:415-420` |
| CONTRATO: `attempt-N/` (`gates.txt`, `enforcement.json`, `criterios.txt`, `veredito.json`, `juiz.veredito.json`, `claude.txt`, `diff.patch`) | `CONTRATO.md:422-439` |
| CONTRATO: `base_vermelha`, `retry_sem_mudanca`, `arquivo_solto` | `CONTRATO.md:894-915`; `veredito.json` com `causa`/`arquivos`/`evidencia` em `:919-921` |
| CONTRATO: painel (o que lê e escreve) | `CONTRATO.md:802-855` |
| `decisao.ts`: causas de infra e de mérito | `scripts/orquestrador/decisao.ts:87-99` |
| `decisao.ts`: sub-motivo (`gate_<papel>`, `criterio`, `juiz`, `exit`) | `decisao.ts:391-430`; da linha da trilha em `:609-640` |
| `diagnostico.ts`: extração pura já pronta (`primeiroLocal`, `arquivosDeTesteCitados`, `fora_da_allowlist`, `blocoDoCriterio`) | `scripts/orquestrador/diagnostico.ts:91-232` |
| Executor do kit: onde nasce cada `BLOQUEADO` | `executor.sh:1344` (gate_ticket), `:1423-1425` (base_vermelha), `:1439` (retry_sem_mudanca), `:1461` (teto ambiente), `:1496` (repeticao), `:1507` (demais); `local-loop.sh:514` (merge_falhou), `:633` (sem_progresso), `:648` (adiamentos) |
| Chamada paga com envelope JSON | `lib.sh:1036`, `claude_run` em `lib.sh:1400`; uso em `executor.sh:754` |
| Defeito do aceite vermelho (25/09) | `docs/defeitos/2026-09-25-aceite-vermelho.md` (pede `aceite-vermelhos.json` com `{it, arquivo_teste, linha, mensagem}`) |

### 0.3 comarka-operacional (`66fd07d`, motor próprio)
| o quê | onde |
|---|---|
| Fila e runs no checkout principal | `scripts/orquestrador/lib.sh:35` (`FILA_DIR`); `docs/fila/000-config.json` → `runs_dir: docs/fila/runs`, `diff_cap_linhas: 900`, `max_retries: 2` |
| Status e motivo no ticket (`status`, `notas_status`, 1º bloco json) | `lib.sh:115-116` (`ticket_set_status`, `ticket_set_nota`) |
| `runs/<id>/meta.json` (`attempt` 1-based, `model`, `claude_dur_secs`, `diff_lines`, `resultado`, `ts`) | `lib.sh:696-712` |
| `runs/<id>/attempt-N/`, e o rename para `attempt-N.prevK` a cada nova série | `executor.sh:454`, `:459-464` |
| `<id>.pre-requeue-*` (rename **humano**, não do motor: 635, 654, 856) | `docs/fila/runs/` |
| `claude-output.txt` | `executor.sh:515` |
| `diff.raw`, `diff.stat`, `head.txt`; `dl` por numstat (desde o 723) | `executor.sh:560-567` |
| `enforcement.json` e bloqueio por enforcement | `executor.sh:587-592` |
| DIFF-CAP (sem gate, sem verdict) | `executor.sh:600-607` |
| `gate-tsc.txt`, `gate-vitest.txt`, `gate-build.txt` (fail-fast) | `executor.sh:122`, `:129`, `:137`; reprovas em `:611-644` |
| `criterios.txt` (`### criterio[i] -> PASS\|FALHA`, `cmd:`, `espera:`, `-- saida --`) | `executor.sh:194-246` |
| `recon.txt` | `executor.sh:279-298` |
| `verdict.json` (`{aprovado, motivo}`), só quando o avaliador roda | `avaliador.sh:39`; motivo lido em `executor.sh:667` |
| `avaliador-claude.txt` (o JSON cru do juiz) | `runs/<id>/attempt-N/` (ex.: `940/attempt-2`) |
| Merge em `_worktrees/staging-auto`; falha vira "aprovado no mérito, mas merge … conflitou" | `avaliador.sh:50-58`, `:185-191` |
| Guarda de árvore suja só na sincronização, não no merge do avaliador | `local-loop.sh:375-379` |
| Motivo de bloqueio no log | `executor.sh:700` (OBSOLETO), `:703` (BLOQUEADO enforcement), `:713-727` (circuit breaker, nota "provável defeito de spec/harness"), `:718-722` e `:735-740` (PAUSADO), `:745-748` (retries esgotados) |
| Cabeçalho de tentativa no log | `executor.sh:469` (`=== ticket <id> (<slug>) — tentativa N · modo: … ===`) |
| Relógio do log: `[orq HH:MM:SS]` em UTC **sem data**; a data vem das linhas de drenagem `[AAAA-MM-DD HH:MM:SS-0300]` | `lib.sh:39`; ex.: `local-loop.log:85215-85222` |
| Pausa sistêmica: sentinela `.orq-pause` e streak | `lib.sh:408`, `:433`, `:483-520` |
| Normalização do motivo e extração do gate | `lib.sh:645-665` |
| O caso árvore suja, com a evidência | `local-loop.log:85202-85203` e `:85217-85218` ("Your local changes to the following files would be overwritten by merge: docs/fila/854-…md") + `runs/940/attempt-2/avaliador-claude.txt` (`"aprovado": true`) |

**Duas diferenças que mandam no desenho:**
1. **O Comarka não guarda a causa da reprova mecânica em arquivo.** Sem `verdict.json`, o estágio que parou sai da **presença** dos arquivos (fail-fast de `executor.sh:587-650`): só `diff.stat` → enforcement ou diff-cap; `gate-tsc` sem `gate-vitest` → tsc; `gate-vitest` sem `criterios` → vitest; `criterios` sem `gate-build` → critério; `gate-build` sem `verdict` → build; `verdict.json` → juiz ou merge.
2. **O Comarka sobrescreve a evidência** no requeue (`attempt-N` vira `attempt-N.prevK`). O kit não (0-based e monotônico, `CONTRATO.md:424-427`). O triador **tira cópia do que leu** na hora do diagnóstico.

---

## 1. Gatilho e deduplicação

**Três gatilhos, um só código:**

| gatilho | quem dispara | o que roda |
|---|---|---|
| **G1. Bloqueio novo** | a thread de apuração do painel (molde K12-J, `CONTRATO.md:821-829`), a cada volta de 15 s, ao ver um ticket `bloqueado` sem diagnóstico com a assinatura atual | extração; modelo se a extração não fechar e houver orçamento |
| **G2. Pausa sistêmica** | a mesma thread, ao ver o sentinela de pausa (kit: `pausar_file` + `PAUSA` na trilha; Comarka: `.orq-pause` com `gate sistemico: "<gate>" reprovou N tickets seguidos (<ids>)`, `lib.sh:513-518`) | extração para **cada** id listado, mesmo pendente, com a pergunta "é base/ambiente ou são defeitos independentes?" (o erro do 762+851) |
| **G3. Passada** | a mesma thread, a cada 15 min, e `orq-triador --passada` na linha de comando | só extração, sem modelo, nos diagnósticos de até 6 h atrás com classe em palpite (`R5?`, `R1?`), porque a prova de base vermelha às vezes chega depois (760 → 761 em 17 min; 898 → 741a em 25 min) |

Sem painel aberto, nada roda sozinho. Sem launchd novo na 7f (fica de fora, §9).

**Assinatura do bloqueio** (o que impede rodar duas vezes):

```
sha256( repo_caminho | id | status | notas_status
      | para cada diretório de tentativa da série, em ordem: nome, mtime_ns, tamanho de cada arquivo lido )
```

- A série é a última sequência de tentativas que terminou no bloqueio:
  - kit: da última linha `INICIO` do id até o `BLOQUEADO`, em `events.log`; o diretório é `attempt-(N-1)` para `attempt=N` (`CONTRATO.md:424-427`);
  - Comarka: do último cabeçalho `=== ticket <id> … tentativa 1` (`executor.sh:469`) até a linha `BLOQUEADO`/`reprovado após`. Os diretórios são `attempt-1..n` **sem** sufixo `.prevK`, porque o triador roda antes do requeue. Na leitura de fixture, ganha a variante com mtime ≤ fim da série + 180 s.
- O diagnóstico grava a assinatura. **Mesma assinatura: não roda.** Assinatura nova (requeue, edição humana da nota, nova tentativa): o diagnóstico anterior vai para `historico/` e um novo é feito.
- **Modelo no máximo uma vez por assinatura**, mesmo que a chamada falhe (fica `modelo.erro`). Só `--forcar` repete.
- **Trava:** `~/.orq/diagnosticos/<repo>/<id>.lock`, criado com `O_EXCL`, com pid e hora. Com mais de 10 min é órfão, e o próximo apaga. Dois painéis abertos não pagam duas vezes.
- Ticket que **saiu** de `bloqueado` (reaberto, done): o diagnóstico fica, marcado `encerrado_em`, e some da tabela.

---

## 2. Fontes de evidência por tipo de repo

**Normalização:** os dois leitores devolvem a mesma estrutura `Evidencia` (`tentativas[]` com `estagio`, `vermelhos[]`, `criterios_falhos[]`, `diff_arquivos[]`, `diff_linhas`, `juiz`, `agente_disse`, `head`), e a extração e o modelo só veem isso. Não há ramo por nome de repo. O leitor sai da forma do diretório: `runs/events.log` presente → `kit`; ausente com `runs/local-loop.log` → `legado-comarka`.

| evidência | kit (CONTRATO) | legado-comarka | se faltar |
|---|---|---|---|
| status, nota, allowlist, critérios | 1º bloco json de `docs/fila/<id>-*.md`: `.status`, `.notas_status`, `.pathspec_allowlist`, `.criterios_aceite[]` | idem | ticket ilegível → diagnóstico `classe: null`, `falta: ["ticket"]`, nada mais roda |
| quando bloqueou e por quê (token) | `events.log`: linha `<ts> <id> BLOQUEADO motivo=… [sub=] [arquivos=] [attempt=]` (`CONTRATO.md:187`) | `runs/local-loop.log`: `ticket <id>: BLOQUEADO …` / `reprovado após N retries — BLOQUEADO` (`executor.sh:703,724,745`); data das linhas `[AAAA-MM-DD …-0300]` | sem linha (bloqueio humano) → `origem: "humano"`, extração roda sobre a última série que existir, e o painel continua "decisão sua" |
| tentativas da série | `runs/<id>/meta.json` `[].dir`, `.resultado`, `.diffLines` | `runs/<id>/meta.json` `[].attempt`, `.resultado`, `.diff_lines`, `.ts` | sem meta → contar diretórios `attempt-*` com mtime na janela da série |
| estágio que parou | `gates.txt` (`FALHA <nome>`), `enforcement.json .ok`, `veredito.json .causa` | presença de arquivos (§0.3, diferença 1) | sem nada além de `prompt.txt` → `estagio: "agente"` (o agente não produziu diff) |
| vermelho de teste | recorte em `gates.txt` depois de `--- recorte de … ---` | `gate-vitest.txt`: `FAIL  <arquivo>`, `❯ <arquivo>:<linha>:<col>`, `Test Files  N failed`, sem ANSI | — |
| vermelho de critério | `criterios.txt` | `criterios.txt`: `### criterio[i] -> FALHA`, `cmd:`, `espera:`, `-- saida --` | — |
| tamanho do diff | `diff.patch` contado (+/-, sem cabeçalho); `meta.diffLines` | `diff.stat` (último "N insertions, M deletions"); `meta.diff_lines` | sem nenhum: `diff_linhas: null` (a regra R6 não roda) |
| arquivos do diff | `diff.patch` (`+++ b/…`) | `diff.stat` (coluna antes de `\|`) | idem |
| juiz | `juiz.veredito.json` (`aprovado`, `motivo`, `criterios_falhos`) | `avaliador-claude.txt` (JSON do juiz) e `verdict.json` (`{aprovado, motivo}` final, que pode ser o do merge) | sem juiz: o campo fica `null` |
| o que o agente disse | `claude.txt` (envelope; campo `.result`) | `claude-output.txt` | sem: `null`. **Nunca** é prova sozinho (§6) |
| merge recusado | `BLOQUEADO motivo=merge_falhou` (`local-loop.sh:514`) | linhas `error: Your local changes … overwritten by merge:` + arquivo seguinte, no trecho do log da série | — |
| vizinhos (mesmo vermelho em outro ticket) | `events.log` `BLOQUEADO motivo=base_vermelha arquivos=` e `gates.txt` de outros ids | índice dos `FAIL` de `runs/*/attempt-*/gate-vitest.txt` com mtime em ±6 h | índice vazio → a regra de base vermelha não fecha, fica palpite |
| fonte do teste vermelho (para acoplamento) | `git show <head>:<arquivo>` com `GIT_OPTIONAL_LOCKS=0` | idem, `head.txt` da tentativa | `head` ausente ou `git show` falhou → `acoplado: null` (R1 vira palpite) |
| árvore da worktree alvo | `git -C <worktree alvo> status --porcelain` com `GIT_OPTIONAL_LOCKS=0` | idem, em `_worktrees/staging-auto` | só registro (`arvore_alvo_agora`), nunca prova do passado |

**Regra de falta:** cada fonte ausente entra em `falta[]` no diagnóstico. A classe só é firme se as fontes que a regra usa estão presentes. Faltou, vira palpite ou vai ao modelo. Nada é estimado (a mesma regra do painel, `orq-painel.py:17-18`).

**Cópia da evidência:** tudo o que foi lido, já recortado (§3.1), vai para `~/.orq/diagnosticos/<repo>/<id>/<assinatura12>/evidencia/`. Isso salva a prova do rename `.prevK` e alimenta a próxima fixture de graça.

---

## 3. Extração determinística primeiro

### 3.1 O que sai sem modelo

1. **Recorte do vitest:** de `gate-vitest.txt`, sem ANSI, as linhas `FAIL`, `❯ …:N:M`, `AssertionError`, `Expected`/`Received`, `Error:`, `Cannot find module`, `Timeout`, `Test Files`/`Tests`, com 6 linhas de contexto, até 300 linhas. Guarda o número da linha original de cada trecho (a evidência aponta o arquivo **original**, não o recorte).
2. **Estágio de cada tentativa** (§2).
3. **Vermelhos:** arquivo de teste, `arquivo:linha` (de `❯`; `primeiroLocal` do `diagnostico.ts:109`), nome do `it`.
4. **Dentro ou fora da allowlist** (`globToRegExp`, o mesmo do enforcement) e **dentro ou fora do diff**.
5. **Acoplamento:** o teste vermelho fora da allowlist cita, no fonte em `head`, o nome-base de algum arquivo do diff (≥ 4 caracteres, sem `page`, `route`, `index`, `layout`) ou um diretório do diff (≥ 5 caracteres, sem os genéricos). Isso é heurística; o que ela não pega fica palpite.
6. **Base vermelha:** o mesmo arquivo vermelho, fora da allowlist e fora do diff, em tentativa de **outro ticket de outra família** (prefixo numérico diferente; o 711a não conta para o 711b3) nas ±6 h. No kit, `BLOQUEADO motivo=base_vermelha` já é a prova.
7. **Máquina:** `Timeout waiting for worker`, `Timeout starting`, `EMFILE`, `ENOSPC` no vitest, ou `claude_dur_secs` acima do teto do config.
8. **Árvore suja:** merge recusado (`overwritten by merge`) **e** juiz aprovou (`avaliador-claude.txt .aprovado == true`, ou `juiz.veredito.json`). Prova: as duas linhas.
9. **diff.stat contra o cap:** estágio diff-cap **e** `inserções + deleções` do `diff.stat` ≤ `diff_cap_linhas` do config na data do bloqueio. Isso prova contador errado do motor (o 723: 650 contra 1050).
10. **Critério:** `criterio[i]`, `cmd`, `espera` e as 2 primeiras linhas da saída; saída **idêntica em todas as tentativas** da série com diff diferente é sinal de forma ou premissa (não de código).
11. **Aceite:** toda a allowlist em `test/` e o vermelho dentro dela, com o mesmo conjunto de `it` em todas as tentativas (é a condição do `defeitos/2026-09-25-aceite-vermelho.md`).

### 3.2 Regras, nesta ordem (a primeira que casa decide)

| # | condição (estágio é o da **última** tentativa) | classe | firme? |
|---|---|---|---|
| D1 | merge recusado e juiz aprovou | R5 (árvore suja) | sim |
| D2 | diff-cap e diff.stat ≤ cap | R6 | sim |
| D3 | diff-cap e diff.stat > cap | R3 (refatiar) | palpite |
| D4 | máquina (item 7) | R5 | sim |
| D5 | base vermelha (item 6) | R5 | sim |
| D6 | vitest ou enforcement, vermelho fora da allowlist e fora do diff em alguma tentativa, e acoplado | R1 | sim |
| D7 | vitest, vermelho fora da allowlist, não acoplado | R5? | palpite |
| D8 | enforcement sem vermelho | R1? | palpite |
| D9 | vitest, vermelho dentro, aceite | R4? | palpite |
| D10 | vitest, vermelho dentro, não aceite | R2? | palpite |
| D11 | critério e alguma tentativa anterior com vermelho fora | R1\|R2? | palpite |
| D12 | critério | R2? | palpite |
| — | nada casou | `null` | vai ao modelo |

**Firme** = vai para o painel sem modelo. **Palpite** = vai ao modelo com o palpite e as provas.

### 3.3 Quanto se resolve só com isso (medido no protótipo)

Sobre os 37, com a classe da medição como verdade:

| | casos | quais |
|---|---|---|
| **firme e certa** | **16** | R1: 627j, 689, 346d, 722, 715, 762, 856, 711b3, 950 (9 de 11). R5: 801, 760, 898 #31, 741a #32, 940, 932 (**6 de 6**). R6: 723 (**1 de 1**) |
| firme e errada | **0** | — |
| palpite certo (modelo confirma) | 13 | 559 #2, 600, 707 #33 (R4?); 549c, 407a #10, 691, 737, 900, 898 #34 (R2?); 627b, 407a #14 (R1\|R2? → R2); 654, 711a (R1\|R2? → R1) |
| palpite errado ou sem palpite | 8 | 559 #1 (R3, deu R4?), 627 (R2, deu R4?), 635 (R3, deu R5?), 739 (R3, deu R1?), 867 (R3, deu R2?), 741 (R4, deu R2?), 707 #28 (R7, deu R4?), 826 (R3, sem regra) |

- **Só extração: 16 de 37 (43%) com classe e evidência certas, e todos os R5 e R6.**
- **No instante do bloqueio são 14.** O 760 e o 898 #31 só fecham como base vermelha quando o vizinho aparece (761 em 17 min; 741a em 25 min). Até lá ficam `R5?` e fecham na passada G3, **sem modelo**. O aceite (§7) mede o estado depois da passada.
- **R3 e R7 nunca saem da extração.** É decisão, token ou motor; o texto é o que diz.
- **Cuidado: as regras foram afinadas sobre esses mesmos 37.** O "0 firme errado" é sobre dado de treino. A 7f-b cobra também os bloqueios de 10/10 em diante, que nenhuma regra viu (§7.3).
- **O sinal de "permissão negada" no claude-output não discrimina** (aparece em 18 dos 37, inclusive em R1 e R5 limpos). Entra como campo, não como regra.

---

## 4. Classificação com modelo, só para o resto

**Quando:** classe `null` ou palpite, depois da extração, uma vez por assinatura, se o orçamento do dia deixar. Nos 37: **21 casos** (57%), ~10/semana no ritmo do Comarka.

**Modelo:** `claude-opus-5-5`, esforço `medium` (o padrão dele), pela mesma chamada paga do kit (`claude_run … -p --output-format json --model`, `lib.sh:1400`), **sem ferramentas** e com timeout de 120 s. O custo sai do envelope (`total_cost_usd`). O modelo fica no config (`triador.modelo`), e trocar é decisão humana.

**Entrada máxima:** 30 mil tokens, contados por `chars / 3,5`. Monta nesta ordem e corta de baixo para cima:
1. ticket: `id`, `slug`, `objetivo` (até 1500 caracteres), `pathspec_allowlist`, os `criterios_aceite` que falharam (inteiros) e `notas_status`;
2. o JSON da extração (estágios, vermelhos, dentro/fora, acoplamento, vizinhos, palpite e regra);
3. o recorte do vitest da última tentativa (até 300 linhas) e o das anteriores, se o vermelho mudou;
4. os blocos `FALHA` do `criterios.txt` de cada tentativa;
5. `diff.stat` de cada tentativa;
6. juiz (`motivo`, `criterios_falhos`) de cada tentativa;
7. o que o agente disse na última tentativa (até 3000 caracteres) e na anterior (até 1500).

O diff cru **não** entra.

**Mascarar antes de mandar:** `sk-…`, `eyJ…` (JWT), `service_role`, chaves `SUPABASE_*`/`*_KEY=`/`*_TOKEN=` com valor, e e-mail. Isso vira `‹segredo›`.

**Tetos:**
- **por caso: US$ 0,30.** Entrada máxima a US$ 4/MTok dá US$ 0,12, e 2 mil tokens de saída a US$ 20/MTok dão US$ 0,04: ~US$ 0,16 no pior caso. Envelope acima do teto marca `custo_acima_do_teto` no ledger.
- **por dia: US$ 3,00**, somando todos os repos (~18 casos; o pico medido foi 17,5 bloqueios por semana). Estourou: o diagnóstico fica só com a extração e `modelo: {pulado: "teto_dia"}`, e o painel diz isso.
- **Ledger:** `~/.orq/diagnosticos/custo.json`, `{dias: {"AAAA-MM-DD": [{repo, id, assinatura, custo_usd, tokens_in, tokens_out}]}}`.
- **Estimativa:** ~10 chamadas por semana × ~US$ 0,13 = **~US$ 1,30 por semana**.

**Prompt (texto completo; `{…}` é preenchido pelo triador):**

```
Você é o triador de bloqueios de um orquestrador de tickets. Um ticket foi
executado por um agente, reprovou nos gates ou no juiz, e o motor o bloqueou.
Sua tarefa é dizer POR QUE ele está bloqueado, com prova, e o remédio. Você não
decide nada: um humano lê o que você escrever e decide.

Os destinos possíveis (escolha exatamente um):

R1  Teste acoplado fora da allowlist. Um teste que o ticket não pode editar
    ficou vermelho por causa do que o ticket mudou. Remédio típico: pôr o teste
    na allowlist com guarda anti-afrouxamento (mesma contagem de it/expect, sem
    skip), ou mover a mudança para outro ticket.
R2  Critério com defeito de forma ou premissa. O cmd/espera do critério está
    errado (shell, pipefail, regex, contador, nome fixo, premissa velha da base)
    e reprovaria qualquer implementação. Remédio: consertar o critério no .md.
R3  Spec que precisa de decisão humana, token, motor ou refatiamento. Parte do
    remédio não cabe no .md do ticket.
R4  Dependência: o aceite achou falta REAL no código fora do escopo do ticket.
    Remédio: ticket novo de código; o aceite está certo.
R5  Ambiente: base vermelha em arquivo que o diff não tocou, máquina lenta,
    árvore suja na worktree alvo. O código do ticket não é o problema.
R6  Motor: o próprio orquestrador mediu ou decidiu errado (contador, rótulo).
R7  Humano: o ticket pede algo contraditório ou impossível e só o dono decide.

Regras:
- Prova é arquivo:linha de um artefato abaixo (saída de gate, critério, juiz,
  diff.stat). O que o agente executor "disse" é pista, nunca prova sozinho.
- A extração determinística já rodou. Se ela deu um palpite, confirme ou
  derrube com prova; não repita o palpite sem conferir.
- Mérito (o código do ticket está errado e um retry resolveria) não é um
  destino: se for o caso, responda R4 se falta código fora do escopo, ou diga
  na justificativa que o bloqueio parece mérito e use confianca "baixa".
- "requeue" é reabrir o ticket SEM mudar a spec. Só diga "sim" se nada no
  ticket precisa mudar; "sim_apos:<condição>" se basta uma condição externa
  (base verde, árvore limpa, conserto do motor); senão "nao".
- Remédio em UMA linha, imperativa, concreta (arquivo e o que fazer).
- Responda SÓ com um objeto JSON, sem texto antes ou depois:
  {"classe":"R1".."R7","confianca":"alta"|"media"|"baixa",
   "evidencia":[{"arquivo":"<caminho do artefato>","linha":<n>,"trecho":"<até 160 chars>"}],
   "remedio":"<uma linha>","requeue":"sim"|"nao"|"sim_apos:<condição>",
   "justificativa":"<até 3 frases>"}

Ticket {id} ({slug}) do repo {repo}, bloqueado em {quando} pela regra do motor
"{token_do_bloqueio}", depois de {n} tentativa(s).

== TICKET ==
{ticket}

== EXTRAÇÃO DETERMINÍSTICA ==
{extracao_json}

== GATE DE TESTES (recorte; os números de linha são do arquivo original) ==
{recortes_vitest}

== CRITÉRIOS QUE FALHARAM ==
{criterios_falhos}

== DIFF.STAT POR TENTATIVA ==
{diff_stats}

== JUIZ ==
{juiz}

== O QUE O AGENTE EXECUTOR DISSE (pista, não prova) ==
{agente}
```

**Leitura da resposta:** a última linha que o `JSON.parse` aceita com `classe` em R1-R7 (o mesmo varrer de trás para frente de `avaliador.sh:144-162`). Cada `evidencia.arquivo` tem de existir na cópia da evidência e `linha` tem de caber nele; a que não confere sai e conta `evidencia_descartada`. Resposta ilegível, sem evidência válida ou com classe fora da lista: vale a extração, `modelo.erro` registrado, sem segunda chamada.

---

## 5. Saída

**Onde:** `~/.orq/diagnosticos/<nome do repo no painel>/<id>.json` (o atual) e `…/<id>/historico/<assinatura12>.json` (os anteriores). A raiz é `ORQ_DIAG_DIR` ou esse padrão. Nunca dentro de um caminho do `repos.json` (§6).

**Formato** (`$schema_versao: 1`):

```json
{
  "$schema_versao": 1,
  "repo": "comarka-operacional", "id": "940", "leitor": "legado-comarka",
  "assinatura": "3f9c…", "gerado_em": "2026-10-09T20:01:12Z",
  "bloqueio": { "quando": "2026-10-09T19:56:08Z", "token": "circuit_breaker",
                "nota_do_motor": "motivo repetido: provável defeito de spec/harness, não do código — aprovado no mérito, mas merge em staging-auto conflitou",
                "tentativas": 2 },
  "classe": "R5", "rotulo": "ambiente: árvore suja na worktree alvo",
  "firme": true, "fonte": "extracao", "regra": "D1", "confianca": "alta",
  "evidencia": [
    { "arquivo": "docs/fila/runs/local-loop.log", "linha": 85217,
      "trecho": "error: Your local changes to the following files would be overwritten by merge:" },
    { "arquivo": "docs/fila/runs/local-loop.log", "linha": 85218, "trecho": "docs/fila/854-remove-equipe-geral.md" },
    { "arquivo": "docs/fila/runs/940/attempt-2/avaliador-claude.txt", "linha": 1, "trecho": "{\"aprovado\": true, …" }
  ],
  "remedio": "limpar docs/fila/854-remove-equipe-geral.md em _worktrees/staging-auto e reabrir: o mérito foi aprovado nas 2 tentativas",
  "requeue": "sim_apos:arvore_alvo_limpa",
  "arvore_alvo_agora": "limpa",
  "extracao": { "estagios": ["juiz_ok_merge_falhou", "juiz_ok_merge_falhou"], "vermelhos": [], "diff_linhas": 653, "…": "…" },
  "modelo": null,
  "falta": [],
  "copia_evidencia": "~/.orq/diagnosticos/comarka-operacional/940/3f9c1a2b4d5e/evidencia/",
  "encerrado_em": null
}
```

- `arquivo` é relativo à raiz do repo e aponta o artefato **original**; a cópia fica em `copia_evidencia`.
- `requeue`: `"sim"`, `"nao"` ou `"sim_apos:<condição>"`. Condições fechadas: `arvore_alvo_limpa`, `base_verde:<arquivo>`, `conserto_motor`, `maquina_ok`.
- **Remédio por classe** (modelo da linha; a extração preenche, o modelo pode trocar):

| classe | remédio (molde) | requeue |
|---|---|---|
| R1 | `pôr <teste> na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em <teste>:<linha>` | nao |
| R2 | `consertar criterio[<i>] no .md: saída "<saída>" em todas as tentativas, independe do diff` | nao |
| R3 | `decidir: <o que falta> (token, motor ou refatiar em N)` | nao |
| R4 | `criar ticket de código para <arquivo>: o aceite <teste>:<linha> está certo` | nao |
| R5 árvore | `limpar <arquivo> em <worktree alvo> e reabrir: mérito aprovado` | sim_apos:arvore_alvo_limpa |
| R5 base | `consertar a base: <teste>:<linha> vermelho também em <ids>, fora do diff` | sim_apos:base_verde:<teste> |
| R5 máquina | `reabrir com a máquina livre: <sinal> em <arquivo>:<linha>` | sim_apos:maquina_ok |
| R6 | `não fatiar: diff.stat dá <n> ≤ cap <cap>; o contador do motor está errado` | sim_apos:conserto_motor |
| R7 | `decidir na spec: <contradição>` | nao |

**Painel K12:**
- **`/api/estado`:** cada item de `bloqueados[]` ganha `diagnostico` (classe, rótulo, firme, fonte, remédio, requeue, evidência, gerado_em, `obsoleto` quando a assinatura atual difere da gravada, `pulado` quando o teto do dia cortou). A leitura é por mtime, com cache como o dos tickets (`orq-painel.py:266-300`).
- **Tabela de bloqueados** (`htmlBloqueados`, `:1268`): coluna nova **Diagnóstico**, com a pílula `R5 · ambiente`, a linha do remédio e um selo `requeue` quando for `sim`/`sim_apos`. Palpite aparece com "?" e em cinza. Sem diagnóstico: "triando…" se a trava existe, senão "sem diagnóstico".
- **Clique** (o `<details>` que já existe para o motivo): evidência como lista `arquivo:linha — trecho`, fonte (extração/modelo, regra ou custo), `falta[]`, e a nota original do motor riscada quando a classe a contradiz (o "provável defeito de spec/harness" do 940).
- **Filtro:** os botões de categoria ganham os de classe (R1…R7), sem tirar os de trilha.
- **Pausa sistêmica:** no cartão do repo pausado, uma linha por ticket da pausa com a classe (é o que teria separado 762 de 851).
- **CONTRATO §9.5:** passa a ler `~/.orq/diagnosticos/<nome>/*.json`, que **não é do repo**. A regra "lê só o contrato" (`orq-painel.py:9-19`) ganha essa exceção, escrita.

---

## 6. Regras duras

1. **Nunca escreve no repo.** Toda escrita passa por uma função que resolve o caminho real (`realpath`) e recusa (exceção, não aviso) o que não estiver sob `ORQ_DIAG_DIR` ou o que estiver sob qualquer caminho do `repos.json`.
2. **Nunca muda status de ticket, nunca escreve nota, nunca reescreve critério, nunca reabre.** O triador não importa nem chama `ticket_set*`, `lib.sh`, `orq liberar`, `orq pausar`, nem nada que escreva.
3. **Git só leitura e só com `GIT_OPTIONAL_LOCKS=0`.** Verbos permitidos: `show`, `log`, `status --porcelain`, `rev-parse`, `ls-tree`. Um só ponto de chamada (`gitLeitura(args)`) põe o env e recusa outro verbo. Sem `fetch`, `checkout`, `worktree`, `stash`.
4. **Não roda script do repo.** Nem gate, nem critério, nem `recon`; só lê o que o motor já gravou.
5. **Diagnóstico é sugestão.** O painel não ganha botão de "aplicar remédio" nem de requeue a partir do diagnóstico.
6. **O que o agente disse não é prova sozinho.** Classe firme exige evidência de artefato de gate, critério, juiz, diff.stat ou log do motor.
7. **Uma chamada de modelo por assinatura**, dentro dos tetos; falha não repete.
8. **Segredo mascarado** antes de qualquer envio e também na cópia de evidência.

---

## 7. Fixture e vermelho antes

### 7.1 A fixture
`test/fixtures/triador-7f/<nn>-<id>-L<linha>/` para cada um dos 37, com **só o que o triador lê**, já recortado:
- `ticket.json`: o 1º bloco json do ticket no sha do `casos.json` (`ticketSha`);
- `attempt-K/`: `gate-vitest.txt` **recortado** (§3.1, com o mapa de linhas originais em `gate-vitest.linhas.json`), `gate-tsc.txt`, `criterios.txt`, `claude-output.txt`, `verdict.json`, `avaliador-claude.txt`, `diff.stat`, `enforcement.json`, `head.txt`, e `presenca.json` (que arquivos existiam, inclusive `gate-build.txt` e `diff.raw`, que não são copiados);
- `meta.json`;
- `log.txt`: o trecho do `local-loop.log` da série, com o número da linha original;
- `fontes/`: o fonte dos testes vermelhos em `head` (para o acoplamento);
- `vizinhos.tsv`: `(ticket, arquivo_vermelho, ts)` de ±6 h, com uma coluna `antes_do_bloqueio` (para medir os dois instantes);
- `config.json`: `diff_cap_linhas` na data;
- **`esperado.json`**: `{classe, evidencia: [{arquivo, linha}], requeue, fonte_da_verdade: "medicao-bloqueios-out.md:<linha>"}`, tirado da tabela da medição (`:102-138`) e da §5 dela.

Tamanho estimado: < 2,5 MB (o `gate-vitest` médio é 71 KB e recortado fica < 15 KB). Montada por um script de **etapa** (só leitura do Comarka, `GIT_OPTIONAL_LOCKS=0`), commitado junto.

### 7.2 Testes de aceite
- `test/orquestrador-triador-aceite.test.ts`:
  - **(A) só extração:** os 7 R5 e R6 saem com classe firme certa **e** ao menos uma evidência igual a uma do `esperado.json` (mesmo arquivo; linha a ±3 no original), usando `vizinhos.tsv` inteiro, que é o estado depois da passada G3; com só `antes_do_bloqueio`, 760 e 898 #31 saem `R5?` e não firmes (o teste fixa os dois instantes);
  - **(B) zero firme errado** nos 37;
  - **(C) extração + modelo:** classe e evidência certas em **≥ 30 de 37**, com as respostas do modelo **gravadas** em `resposta-modelo.json` por caso (replay, sem chamada no CI).
- **Vermelho antes:** contra o motor de `3ad99bf` os três falham, porque o módulo `triador` não existe (o import quebra). O relatório da etapa mostra essa saída.
- **Gravação das respostas:** uma corrida real e única na etapa, com os tetos de §4: 21 chamadas, ~US$ 3,40. O relatório da etapa mostra o placar dela, e o replay depois só prova o parser e a combinação.

### 7.3 Contraprova e fora da amostra
- **Controle:** 20 done do período sem bloqueio, montados como casos que nunca deveriam virar R1 firme (uma fixture de controle com vermelhos intermediários resolvidos no retry). Nenhum pode sair firme.
- **Fora da amostra:** os bloqueios do Comarka de 10/10 até o dia da etapa, sem afinar regra por eles. O relatório mostra o placar separado. Firme errado ali derruba a regra para palpite, não vira exceção.

---

## 8. Peças da 7f-b (uma por commit, worktree própria, vermelho antes, merge humano)

| # | peça | pronto quando |
|---|---|---|
| 1 | **Fixture dos 37 e de controle** (`test/fixtures/triador-7f/`, script de montagem em `test/fixtures/triador-7f/montar.py`) | 37 diretórios + 20 de controle; `esperado.json` com a linha da medição em cada um; contagem por classe 11/9/5/4/6/1/1; < 3 MB; teste de sanidade da fixture verde. O teste de aceite (§7.2) entra **vermelho** neste commit |
| 2 | **Leitores** `kit` e `legado-comarka` → `Evidencia` (`scripts/orquestrador/triador/leitor-*.ts`), com o recorte do vitest e o mapa de linhas | os 37 dão o estágio por tentativa igual ao `presenca.json`; o recorte mantém todo `FAIL` e `❯` de 3 `gate-vitest` inteiros de teste; um repo-fixture do kit (o de `test-fixture-painel.sh`) é lido pelo leitor `kit` |
| 3 | **Extração e regras D1-D12** (`triador/extrair.ts`, reusa `diagnostico.ts` e `enforcement-core.ts`) | aceite (A) e (B) verdes; 16 firmes, 0 firme errado, 7/7 em R5+R6; os 20 de controle sem firme |
| 4 | **Saída fora do repo**: assinatura, trava `O_EXCL`, histórico, cópia da evidência, máscara de segredo, guarda de escrita e `gitLeitura` | teste que roda o triador num repo git de fixture e confere `git status --porcelain` vazio, mtimes iguais e nenhum `index.lock` criado; escrita com destino dentro de um repo do `repos.json` lança erro; um `git` de mentira no `PATH` registra o env e todo spawn tem `GIT_OPTIONAL_LOCKS=0`; mesma assinatura não roda duas vezes |
| 5 | **Modelo**: montagem da entrada com corte por ordem, prompt (§4, literal), parser, conferência da evidência, ledger e tetos (com stub de `claude` em `test/fixtures/claude-envelope`) | entrada acima de 30 mil tokens corta na ordem de §4; o teto do dia impede a chamada e grava `pulado`; envelope ilegível mantém a extração e grava `modelo.erro`; evidência com linha inexistente é descartada |
| 6 | **Corrida real única e replay** (`resposta-modelo.json` nos 21) | aceite (C) ≥ 30/37 no replay; custo real da corrida no relatório (≤ US$ 6,30, o teto de 21 × 0,30) |
| 7 | **Gatilhos G1-G3 no painel** (thread no molde K12-J; CLI `orq-triador --repo X [--passada] [--forcar]`) | `test-painel-triador.sh`: bloqueio novo gera diagnóstico em uma volta; pausa com 2 ids gera 2; passada promove `R5?` a `R5` quando o vizinho aparece; dois painéis não geram duas chamadas |
| 8 | **Painel mostra**: coluna, clique, filtro por classe, linha na pausa, "sem diagnóstico"/"triando…"/`pulado`/`obsoleto` | `test-painel-triador.sh` confere o HTML e o `/api/estado` com os 4 estados; o Comarka, sem trilha, mostra a classe ao lado do "decisão sua" |
| 9 | **CONTRATO** (§9.5 lê diagnósticos; §9.6 triador: fontes, regras, saída, tetos), CHANGELOG e PECAS com os shas | o texto cita `arquivo:linha` de cada peça; `doutrina-v2.test.ts` (ou o teste de contrato que houver) verde |

A ordem segue a dependência. As peças 7-8 só entram com 1-6 na `main`.

---

## 9. Riscos e o que fica de fora

**Riscos:**
- **Regras afinadas sobre os mesmos 37.** O 0 firme errado pode não se repetir. Mitigação: placar fora da amostra no relatório (§7.3), e regra que errar firme volta a palpite.
- **Acoplamento por nome é fraco.** Falha com acoplamento por import indireto ou por leitura de diretório (o 635 saiu "não acoplado" e era R3). Por isso D7 é palpite, nunca firme.
- **Base vermelha depende de vizinho.** Base vermelha num repo parado (um ticket só) nunca fecha por extração; fica `R5?` para o modelo. Uma regra por git (último commit humano no teste vermelho ou nos imports dele, no alvo) fica como candidata, não medida.
- **O log do Comarka não tem data na linha de tentativa.** A âncora é a linha de drenagem anterior; virada de dia UTC no meio de uma série pode errar a data. O teste usa o 801 (madrugada) como caso.
- **Evidência apagada antes do diagnóstico.** Um requeue humano em segundos (`.prevK`) troca os diretórios. A assinatura muda e o ticket já não está bloqueado; esse bloqueio fica sem diagnóstico, e o painel não precisa dele.
- **O painel passa a disparar gasto.** É limitado por teto diário e por assinatura, mas é o primeiro gasto que nasce de abrir uma tela. Desligável por `triador.modelo: null` no config do kit.
- **Segredo em saída de gate.** A máscara cobre os padrões conhecidos, não todos. A cópia de evidência fica em `~/.orq`, fora de git.
- **O Comarka muda de motor na migração.** O leitor `legado-comarka` vive até a migração e morre com ela; nada nele vira contrato.

**Fora da 7f:**
- **Reescritor** (escrever no `.md` do ticket): a medição recomenda reavaliar depois de 2 semanas de triador, se R1 + R2 com diagnóstico pronto e espera > 4 h passar de ~5/semana (`medicao-bloqueios-out.md:253`).
- **Auto-requeue**, mesmo de `requeue: "sim"`: decisão humana; o painel não ganha botão.
- **Consertar os defeitos do motor do Comarka** (árvore suja vira conflito; streak zera com `--off`; streak junta defeitos independentes): vão como registro em `docs/defeitos/` pela frente certa, não aqui.
- **Regras estáticas novas do gate** para as três formas de shell da medição (`:188-192`): é outra etapa, a custo zero, antes da tentativa.
- **launchd ou job próprio do triador**; **CI e Actus**: o leitor `kit` cobre, mas não há amostra (0 bloqueio no período).
- **Implementar o `aceite-vermelhos.json` do defeito de 25/09 no executor**: o triador entrega o mesmo dado (R4 com `it` e `arquivo:linha`) sem mexer no motor; o defeito continua aberto para o executor.
