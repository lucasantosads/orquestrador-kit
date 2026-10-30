# Medição do comarka-operacional: C1, C2, C3 (11/10/2026)

Sessão só de leitura. Janelas: **14 dias = 27/09 a 10/10** e **30 dias = 11/09 a 10/10**. O corte é 10/10 23:59:59 -03 (o dia de ontem): tudo depois disso fica de fora, e é isso que permite que duas rodadas seguidas deem o mesmo resultado com o loop vivo. Os dados de hoje, 11/10 (1006 destravado à mão, 1009 bloqueado às 14:10), ficam para a próxima rodada.

Arquivos: `~/orq-sessoes/medicao-comarka/medir.sh` (script), `classes-medicao.tsv` (classes R transcritas da medição de 09/10), `out/14d/` e `out/30d/` (`tickets.csv`, `intervencoes.csv`, `loop.csv`, `playbook.csv`, `resumo.json`).

---

## 0. Relatório da sessão

### Comandos contra o Comarka

Todo `git` rodou com `GIT_OPTIONAL_LOCKS=0` na frente. Não usei `checkout`, `fetch`, `stash`, `add`, `commit` nem `push`. Não rodei teste, `orq`, `local-loop`, `executor`, triador nem `launchctl`.

**Passo 0, à mão:**
- `git status --short`: antes, no meio e depois.
- `git log`, com estas variações:
  - autores e prefixos desde 26/09;
  - trailers;
  - `--grep=Orq-Resolvedor`;
  - histórico de `PLAYBOOK.md`, do 973 e do 1006;
  - `--merges` e `M^1..M^2` de um merge.
- `git show --unified=0` em três commits do PLAYBOOK (`ea5a43c`, `83b2023`, `64eb67d`).
- `git rev-parse --abbrev-ref HEAD` e `git worktree list`.
- `git for-each-ref` (contagem de `refs/heads`).
- `git diff -- docs/fila/1009-*.md`, para explicar a mudança no status (ver abaixo).
- **Fora da lista permitida, os dois só de leitura (registro aqui):**
  - `git branch -a --contains ea5a43c`;
  - `git check-ignore -v`, duas vezes (`runs/940/meta.json` e `docs/fila/.orq-pause`).
- Leitura com `cat`, `sed`, `grep`, `awk`, `jq`, `wc` e `ls`:
  - `CLAUDE.md`;
  - `docs/fila/000-config.json` e `_estado.json`;
  - os tickets 973 e 1006;
  - `docs/orquestrador/PLAYBOOK.md`;
  - `scripts/orquestrador/{executor,lib,local-loop,avaliador,orq-pause,launchd-run}.sh` e `scripts/publicar.sh`;
  - `docs/fila/runs/` (`meta.json`, `attempt-*/`, `.gitignore`, `local-loop.log`, `local-loop.log.20260821`, `launchd.log`).
- Fora do Comarka, também só leitura:
  - `~/.orq/` (diagnósticos, `ledger.jsonl`, `dry-run.jsonl`, `job.log`, `repos.json`);
  - o kit (`docs/migracao-comarka.md`, `docs/defeitos/*`, `CONTRATO.md`);
  - `~/orq-sessoes/medicao-bloqueios-out.md`;
  - `pmset -g log` (contagem de eventos de sono da máquina).

**`medir.sh`:**
- `git log --branches` (commits com `--name-status`, merges, criação de tickets e `-p` do PLAYBOOK);
- `git log M^1..M^2` para cada merge `orquestrador: merge frente/*`;
- `git log refs/heads/frente/* --not main staging-auto`;
- `git for-each-ref refs/heads/frente`;
- `git cat-file --batch`, para ler os blobs dos tickets e do PLAYBOOK;
- leitura de `runs/*/meta.json`, `local-loop.log*` e `~/.orq/diagnosticos/comarka-operacional/*.json`.

### Escrita

Só escrevi em `~/orq-sessoes/medicao-comarka/` (script, `out/`, `tmp/`, `status-*.txt`) e neste arquivo. Houve uma exceção no Passo 0: o arquivo `/tmp/x`, uma lista de ids. Apaguei o arquivo na mesma sessão e confirmei que ele não existe mais (`ls /tmp/x` → No such file). Daqui em diante, temporário só em `tmp/`.

### `git status --short` antes e depois

Antes (`status-antes.txt`, 13:56):
```
?? scripts/__pycache__/
?? scripts/roadmap/__pycache__/
```

Depois (`status-depois.txt`, 14:13):
```
 M docs/fila/1009-carteira-cockpit-risco-leitura-completa.md
?? scripts/__pycache__/
?? scripts/roadmap/__pycache__/
```

**As duas saídas não são iguais, e a diferença não vem desta sessão.** O loop vivo bloqueou o 1009 às 14:10:36 e gravou `status: bloqueado` e `notas_status` no working tree do checkout principal. As evidências:
- `local-loop.log:89033-89034` (`ticket 1009: BLOQUEADO sem gastar a próxima volta`);
- o mtime do arquivo é 14:10;
- `git diff` mostra só esses dois campos.

É o comportamento normal do motor (`lib.sh:35` e `:115`): ele grava o status no disco e só commita no autocommit seguinte. Nenhum comando meu escreve no Comarka.

### `medir.sh` rodado duas vezes

Cada rodada executou `medir.sh 14` e `medir.sh 30`, todas com rc=0. O resultado da 1ª rodada foi copiado para `tmp/rodada1`, a 2ª gravou em `out/`, e a comparação foi `diff -r tmp/rodada1 out`:
```
diff -r rc=0 bytes=0        (tmp/diff-duas-rodadas.txt, vazio)
```

Os logs das duas rodadas estão em `tmp/rodada1.log` e `tmp/rodada2.log`.
- sha256 do `medir.sh`: `bc0e4dae…ff0a2`.
- sha256 do `classes-medicao.tsv`: `b88d7d5f…86112`.

---

## 1. Placar dos critérios

| critério | meta | 14 dias (27/09–10/10) | 30 dias (11/09–10/10) | maior sequência desde 08/08 | fonte |
|---|---|---|---|---|---|
| **C1** dias seguidos sem intervenção | 7 | **atual 0**; maior 2 (27–28/09); 12 de 14 dias com intervenção | **atual 0**; maior 2 (27–28/09); 28 de 30 dias | **2 dias, 10–11/08** | `out/*/resumo.json` → `C1`; dias e motivos em `C1.motivos_por_dia`; linhas em `intervencoes.csv` |
| C1 sem os dias que só tiveram writeback de status | (leitura auxiliar) | maior 3 (27–29/09) | maior 3 | 4 dias, 27–30/08 | `resumo.json` → `C1.sem_dias_so_de_writeback` |
| **C2** aprovados de primeira | ≥ 70% | **68,1%** (139/204; 1 done sem meta.json fora do denominador) | **67,4%** (416/617; 3 sem meta.json; 3 "não" só porque a 1ª linha foi `adiado`) | — | `tickets.csv`, coluna `aprovado_de_primeira`; `resumo.json` → `C2` |
| **C3** dias seguidos sem lição nova no PLAYBOOK | 3 | **atual 5** (06–10/10; última lição em 05/10, `ea5a43c`); maior 8 (27/09–04/10) | atual 5; maior 8; 14 lições na janela | 10 dias, 15–24/08 | `playbook.csv`; `resumo.json` → `C3` |

Como ler:
- **C1 nunca chegou perto de 7.** Os únicos dias limpos da janela (27 e 28/09) caíram num fim de semana em que a fila estava em pausa de promoção (`loop.csv`: 11 h e 24 h de pausa operacional). Ninguém interveio porque o loop não rodava.
- **C2 está a ~2 pontos da meta.** Seriam 3 aprovações de primeira a mais em 14 dias (143/204 = 70,1%).
- **C3 é cumprido hoje, mas medido só no PLAYBOOK.** Desde 05/10 a lição passou a ir para outros lugares:
  - 4 defeitos de origem Comarka entraram no kit em 10/10 (`orquestrador-kit/docs/defeitos/2026-10-10-*.md`);
  - o commit `e920841` (10/10) criou as regras em `.claude/rules/`.

  Se essas fontes contarem como lição, o C3 atual cai para 0.

---

## 2. Volume

| | 14 dias | 30 dias | fonte |
|---|---|---|---|
| tickets done | 205 (**14,6 por dia**) | 620 (**20,7 por dia**) | `tickets.csv`; `resumo.json` → `volume` |
| tentativas médias por done | 1,63 | 1,67 | linhas `done`, `reprovado` e `bloqueado` do `meta.json` |
| bloqueios | 30 (**2,1 por dia**) | 101 (**3,4 por dia**) | linhas `BLOQUEADO` e `DISJUNTOR` do `local-loop.log` |
| tempo médio bloqueado até destravar | **14,1 h** (29 casos; 840 segue bloqueado) | **12,2 h** (91 casos; 10 sem retomada até o corte) | do bloqueio no log até o início da tentativa seguinte no `meta.json` |
| horas de loop parado com trabalho processável | 79 h | 138 h | `loop.csv`, `horas_loop_parado` |
| horas de pausa: operacional, manual, gate streak | 59, 3, 27 | 59, 71, 50 | `loop.csv` |

Done por dia na janela de 14 dias (`loop.csv`): 0, 0, 1, 9, 20, 18, 3, 0, 7, 37, 36, 39, 8, 26.

Sobre as 79 h de "loop parado":
- Em quase todas o loop simplesmente não partiu, em geral de madrugada, e a primeira partida depois do buraco já pegou ticket. Exemplo: 09/10, sem nenhuma partida entre 00h e 11h09 (`local-loop.log:84788`).
- O `pmset -g log` registra 316 eventos de sono da máquina em outubro, o que é compatível com o Mac dormindo.
- Os ABORTA são poucos: staging-auto suja em 30/09–02/10 (14) e fetch que falhou (9).
- A heurística está em `medir.sh`, seção 7: a hora sem atividade só conta como parada se a próxima partida drenou um ticket.

---

## 3. Intervenções manuais por tipo

**Contrafactual.** A coluna `resolvedor_teria_agido` não descreve o que aconteceu: o resolvedor só começou a rodar em 11/10 03:54Z, tem zero ações no `ledger.jsonl` e zero commits `Orq-Resolvedor` no repo. A coluna diz o que R1 e R5 em `auto`, ou R2 em proposta, teriam feito com a classe do bloqueio:
- quando há diagnóstico em `~/.orq/diagnosticos`, a classe vem dele (840 R1 D6 firme; 929 `R2?`, só palpite; 1006 R1 pela regra D6b);
- quando não há, vem da §5 de `medicao-bloqueios-out.md`;
- quando nenhum dos dois tem classe, fica "sem dado".

Cada commit foi classificado uma vez só, pela regra mais forte. Os dias com pausa manual ou gate streak entram no C1.

| tipo | 14d: linhas (tickets) | 14d: R1/R5 auto cobririam | 14d: R2 só proposta | 30d: linhas (tickets) | 30d: R1/R5 | 30d: R2 | 30d: sem dado |
|---|---|---|---|---|---|---|---|
| allowlist | 16 (33) | 10 | 2 | 46 (66) | 12 | 2 | 26 |
| critério | 12 (10) | 0 | 7 | 27 (76) | 0 | 10 | 9 |
| writeback de status (humano commitando o status que o loop escreveu) | 11 (74) | 0 | 0 | 56 (323) | 0 | 0 | 0 |
| outro (fatiar, emenda, obsoleto) | 6 (10) | 1 | 1 | 26 (41) | 1 | 1 | 13 |
| dependência | 6 (9) | 2 | 0 | 13 (87) | 3 | 0 | 4 |
| gate streak (evento) + pausa de gate streak | 5 + 4 | 0 | 0 | 8 + 7 | 0 | 0 | 0 |
| motor / config | 3 / 1 | 0 | 0 | 18 / 1 | 0 | 0 | 0 |
| pausa manual | 3 | 0 | 0 | 23 | 0 | 0 | 0 |
| reabertura | 2 (2) | 0 | 0 | 8 (8) | 0 | 0 | 6 |
| **total** | **69 linhas em 12 dias** | **13** | **10** | **233 linhas em 28 dias** | **16** | **13** | **58** |

Fonte: `out/*/intervencoes.csv` (filtro `classe` = `intervencao` ou `intervencao_embutida`) e `resumo.json` → `intervencoes`.

**Contados à parte, não são intervenção** (`intervencoes.csv`, coluna `classe`):

| classe | 14d | 30d |
|---|---|---|
| `alimentar_fila` | 23 | 175 |
| `curadoria` (ticket sem tentativa) | 40 | 119 |
| `liberacao` (`liberacoes.json`) | 18 | 36 |
| `fora_da_fila` | 310 | 386 |

Também ficaram de fora 256 commits do agente executor (14d; 813 nos 30d) e 0 do resolvedor.

**Quanto o resolvedor tiraria de C1 (contrafactual por dia, `tmp/contrafactual.py`).**
- **Zero dias.** Com R1, R5 e R2 todos em `auto`, os 14 dias continuam com 12 dias de intervenção, e os 30 dias continuam com 28.
- O motivo: em cada dia, junto com o caso R1/R5/R2, houve outra intervenção que o resolvedor não cobre.
- O resolvedor reduz trabalho (13 a 23 commits em 14 dias), mas sozinho não mexe no C1.

---

## 4. Top 5 causas que sobram depois do resolvedor

Contagem das linhas com `resolvedor_teria_agido` igual a `nao` ou `sem dado`, nos 30 dias (14 dias entre parênteses).

| # | causa | linhas 30d (14d) | tickets de exemplo | spec ou motor |
|---|---|---|---|---|
| 1 | **Edição humana de spec de ticket que já reprovou ou bloqueou, sem diagnóstico R1/R2.** Allowlist, critério ou dependência ajustados no meio da série, muitas vezes entrando junto no autocommit (`intervencao_embutida`). | allowlist 32, critério 17, dependência 10, outro 24 (14d: 17) | 699 (`d2884fa`, `f94bf16`), 728/729 (`41df16b`, `b53ac82`), 855, 865, 869, 826 (`917d35b`, `90b5727`), 313b/331/343 (setembro, sem classe) | **spec** (fila): allowlist sem o teste acoplado, critério com premissa, deps que faltaram |
| 2 | **Writeback manual de status.** Antes do autocommit de 01/10 (`5f2785d`), todo done só ia para o git por commit humano. Depois disso ainda houve `dff6dc1` (29/09, promoção) e `cfe9743` (06/10). | 56 (11) | 656–677, 802–823, 369 | **motor**: `defeitos/2026-09-29-writeback-da-promocao-fora-do-git.md` |
| 3 | **Pausa manual** para sessão interativa, migration DDL ou conferência. | 23 episódios, 71 h (3 episódios, 3 h) | 02/10 "aplicar migration do 730", 03/10 "conferir 624", 05/10 "746 com erro no validador" | **spec / humano por desenho** (DDL é do Lucas, `CLAUDE.md:8`) |
| 4 | **Gate streak: a fila pausa e alguém precisa destravar.** Em 762+851 foram dois defeitos de spec independentes; em 741a o streak zerou na pausa. | 8 eventos + 7 pausas, 50 h (5 + 4, 27 h) | 801/802, 760/761, 762/851, 898/741a, 741a/707 | **motor**: `2026-10-10-streak-confunde-defeitos-de-spec-independentes.md` e `2026-10-10-streak-zerado-na-pausa-bloqueia-na-retomada.md` |
| 5 | **Mudança no próprio motor** (portes, harness). | 18 + 1 config (3 + 1) | `6307912` (numstat), `bed7c14` (avisa-bloqueio), `5f2785d` (autocommit), `d33c111` (config) | **motor** (portes de `migracao-comarka.md`) |

Fica de fora do top 5 o grupo R3/R4/R5-base, com 2 a 6 linhas por janela: aceite que achou falta real no código, decisão ou token, base vermelha. Exemplos: 739, 707, 867, 898 #31, 741. Esses casos são spec que pede decisão humana, ou motor no caso da base vermelha (`2026-10-10-nota-defeito-de-spec-em-falha-que-nao-e-spec.md`).

**Contrafactual composto, o mais otimista** (`tmp/contrafactual.py`): R1, R5 e R2 em `auto`, mais as causas 2, 4 e 5 consertadas.
- 14 dias: os dias de intervenção caem de 12 para **5**, e a maior sequência sobe para **5**.
- 30 dias: caem de 28 para 21, maior sequência também 5.

Ainda falta a causa 1 e as pausas manuais (02, 03, 05, 07 e 08/10).

---

## 5. Custo

**Custo em US$: sem dado.** O executor e o avaliador chamam o `claude -p` com `--output-format text` (`executor.sh:519`, `avaliador.sh:124`), então o `total_cost_usd` não fica gravado em lugar nenhum. O `meta.json` só guarda `claude_dur_secs` do executor (`lib.sh:692-712`).

Esforço aproximado, só o tempo do executor. **Não é custo**: não inclui o avaliador (Opus), que não grava duração.

| | 14d | 30d |
|---|---|---|
| `claude_dur_secs` somado nos tickets done (todas as tentativas) | 64.287 s (**17,9 h**) | 263.187 s (**73,1 h**) |
| por ticket done | **315 s** (204 com meta.json) | **425 s** (617) |

Fonte: `tickets.csv`, `esforco_claude_dur_secs`.

**Para ter custo:**
1. Usar `--output-format json` nas duas chamadas (executor e avaliador).
2. Gravar `total_cost_usd` e `duration_ms` no `write_meta`, com um campo `papel: executor|avaliador`.

O kit já faz isso (`runs/custo.json`); no Comarka entra na migração.

---

## 6. Três frases

1. **Não: o Comarka ainda não está completo.** C2 está a 2 pontos (68% contra 70%). C3 passa só se o PLAYBOOK for a única fonte de lição. C1 nunca passou de 2 dias seguidos desde 08/08 (4 se descontar o writeback), contra 7 de meta.
2. **O item que mais aproxima o Comarka dos critérios é parar a edição manual de spec de ticket que já tentou (causa 1).** Com o resolvedor, o motor e o streak resolvidos, essa é a intervenção que sobra em 4 dos 5 dias restantes da janela de 14 (o 5º, 03/10, só teve pausa manual). Ela é a maior fonte depois do writeback que o autocommit já resolveu. O caminho é a spec sair do gate de ticket já com a allowlist e os critérios certos, e a correção depois do bloqueio passar pela fila (R1 firme com D6b e R2 em `auto`), não por commit à mão.
3. **Para afirmar C1 faltam pelo menos 7 dias corridos limpos, e hoje (11/10) já não conta:** houve intervenção no 1006 (`5525c7d`), então o mais cedo seria 18/10 com 12–18/10 todos limpos. Pelo histórico (12 de 14 dias com intervenção), o realista é rodar `medir.sh 14` de novo duas semanas depois de mexer na causa 1.

---

## 7. Lacunas e decisões de método

- **`medir.sh` reusa a régua da medição anterior.** As classes R dos bloqueios até 09/10 vêm de juízo humano e de agentes (`medicao-bloqueios-out.md` §7), transcritas em `classes-medicao.tsv` com a linha de origem. Os 58 "sem dado" dos 30 dias são bloqueios de antes de 25/09, que ninguém classificou.
- **Writeback virou tipo próprio**: commit humano em que a única mudança do ticket é `status`/`notas_status` com nota no formato do loop. Classe `intervencao`, porque o ticket já tinha tentado.
- **"Outra mudança no autocommit"** = mudança de qualquer campo do JSON além de `status`/`notas_status`, mudança na prosa, ou `notas_status` que não começa com um prefixo que o loop escreve.
- **Promoção conta como pausa operacional**, igual a ritual e `publicar.sh` (palavras-chave `promocao`, `ritual`, `publicar`, `release`). A pausa "adoção do kit no Actus" e as de "sessão interativa" contam como manuais.
- **Dia com pausa manual** = qualquer dia entre a 1ª e a última linha `PAUSA ATIVA` do episódio, inclusive.
- **A regra "motor ou config" vale para qualquer commit humano** que toque `scripts/orquestrador/` ou `docs/fila/000-config.json`, tenha ou não trailer de sessão. Na janela, os 4 casos tinham trailer ou o prefixo `PORTE-PENDENTE`/`orquestrador:`.
- **Commits que consertam código para destravar a fila contam como `fora_da_fila`**, não como intervenção (exemplo: `ea77243`, `.sql` da base vermelha do 760), pelas regras combinadas. Isso deixa o C1 mais otimista, não mais pessimista.
- **Aprovado de primeira segue a definição literal:** só uma linha no `meta.json`, e ela é `done`. Nos 30 dias, 3 tickets deram "não" porque a 1ª linha foi `adiado` (rate limit). Com o `adiado` ignorado, o C2 de 30 dias iria a 67,9%.
- **Tempo bloqueado** vai do bloqueio no log até o início estimado da próxima tentativa (`ts - claude_dur_secs`). Inclui noite e máquina dormindo.
