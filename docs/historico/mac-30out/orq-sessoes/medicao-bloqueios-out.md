# Medição de bloqueios de 25/09 a 09/10: o que sobra para o resolvedor (7f)

Sessão só de leitura, 09/10/2026 (recorte: 25/09 00:00 até 09/10 ~19:25 -03, 14,8 dias = 2,1 semanas). Não escrevi em nenhum repo e não fiz git add, commit, push, checkout, stash, worktree, `claude -p`, chamada de API, `instalar.sh` nem `launchctl`. Todo git no comarka-operacional rodou com `GIT_OPTIONAL_LOCKS=0`, e nenhum script dele rodou. Os scripts de simulação estão no scratchpad da sessão (`…/scratchpad/med/`: `trans.py`, `blocks.py`, `ev.py`, `prep.py`, `simgate.ts`, `sanity.ts`). O `simgate.ts` importa o `gate-ticket.ts` da main do kit e roda em memória. Três agentes auxiliares classificaram os eventos do Comarka, também só lendo (`class-grupo{0,1,2}.md` no mesmo scratchpad). Revisei as classes deles e consolidei.

---

## 1. PASSO 0

### 1.1 Levantamentos anteriores
- `levantamento-bloqueios.md` (24/09):
  - classes e legenda das colunas (a)-(e) em `:58-69`;
  - tabela de 165 tickets em `:71-237`;
  - agregado por classe em `:260-273`;
  - (e) do gate no loop: 0 de 165 causal (`:311-324`);
  - leitura para a decisão em `:326-345`: reescritor como candidato mais forte e triador "como diagnóstico, não como ação";
  - método: `git log -G'"status": "(bloqueado|refatiar|obsoleto)"'` em todas as branches (`:52`).
- `levantamento-7d1-calibracao.md` (25/09):
  - **taxa-base por ticket executado**: CI 25/83 (**30,1%**), Actus 38/128 (**29,7%**), Comarka 76/648 (**11,7%**) (`:126-133`);
  - por spec: 7,2% / 9,4% / 5,9%;
  - tabela de decisão por regra em `:339-387`.

### 1.2 Kit, main `3ad99bf`
- **Tabela de severidades**: `scripts/orquestrador/gate-ticket.ts:105-137` (`REGRAS`); resolução em `severidadeDe`, `:150`.
  - **erro**: 1, 2, 4, 5t, 5c, 5e, 6a (crase, eval, sudo, curl, wget), 7, 9, 10c, 10x e C2P.
  - **aviso**: 2c, 3, 6a:`rm `/`bash`/`sh -c`, 6r, 6v, 6q, 6b, 8, 9w, 10n, C2c, C2v, C3, C4, C9, C11 e C12.
  - **off**: 6a:`$(`.
- `validarTicket`: `:1393`. As regras de árvore (C9, C11, C12) ficam em `checarArvore`, `:1336`, sobre um `ContextoRepo` (`:1075`).
- Continua fora, por decisão: executar `recon`, `alvo` e `guarda` (`:12-14`).
- **`docs/defeitos/` (10 registros):**
  - **Motor do kit**:
    - `2026-09-25-aceite-vermelho.md`: nota "provável defeito de spec/harness" do circuit breaker em aceite que acha falta de tela;
    - `2026-09-25-teto-medido-fora-do-executor.md`: aviso de teto fixado na autoria;
    - `2026-09-27-grep-c-esconde-rc-127.md`;
    - `2026-09-27-test-lib-config-casos-do-actus.md`;
    - `2026-09-29-medicao-da-fila-por-worktree.md`;
    - `2026-09-29-writeback-da-promocao-fora-do-git.md`.
  - **Só na linhagem do Comarka**, registrados para a migração não herdar:
    - `2026-10-02-orq-runner-congelada.md`;
    - `2026-10-05-aviso-allowlist-variavel-de-shell.md`;
    - `2026-10-07-validar-fila-timeout-deixa-tsc-orfao.md`;
    - `2026-10-07-writeback-notion-acumula-no-painel.md`.
  - Os dois de 25/09 nasceram do 559 e do 627, que estão na tabela da §3.

### 1.3 Onde cada repo guarda o que esta sessão mede

| | conteudos-infinitos (CI) | actus-saas | comarka-operacional |
|---|---|---|---|
| HEAD lido | `57dfe96` (kit 2.1.0-dev) | `c1885e8` (kit `1bc7386`, `3fb5ee3`) | `56d5c5f`. **Motor próprio**, não migrado: `docs/migracao-comarka.md:127` "Antes de migrar" |
| status do ticket | `docs/fila/NNN-*.md`, bloco json | idem | idem. O loop grava no **working tree** do checkout principal (`scripts/orquestrador/lib.sh:35` `FILA_DIR`, `:115` `ticket_set_status`) e commita em lote ("status automatico do loop") |
| trilha | `docs/fila/runs/events.log` (`lib.sh:253`) | `docs/fila/runs/events.log` (`lib.sh:289`) | **sem events.log**: `docs/fila/runs/local-loop.log` (6 MB) |
| motivo do bloqueio | linha `BLOQUEADO motivo=` na trilha, mais `notas_status` | idem; `marca_refatiar`, `executor.sh:1154` | log: `executor.sh:700` (OBSOLETO por recon), `:703` (BLOQUEADO enforcement), `:713` (circuit breaker), `:721/:742` (PAUSADO, gate sistêmico), `:745` (retries esgotados); a causa fica nos `runs/<id>/attempt-N/{gate-vitest,criterios,claude-output,verdict}`, sobrescritos no requeue (`attempt-N.prevK`, `<id>.pre-requeue-*`) |
| custo | `runs/custo.json` e `total_cost_usd` por tentativa | idem | **não há.** Só `claude_dur_secs` em `runs/<id>/meta.json` (`lib.sh:692-698`). Estimei por tempo (ver §7) |

**Estado atual das filas:** no CI, 1 bloqueado (243, desde 21/09); no Actus, 7 (517a, 518-521, 527 e 532), todos de antes do período ou nascidos bloqueados; no Comarka, 2 (932 e 940, do período).

---

## 2. Taxas por repo e comparação com 24/09

**Fontes:**
- **Executado**: o ticket tem tentativa com ts ≥ 25/09 03:00Z (`meta.json` no Comarka; `INICIO` no `events.log` no CI e no Actus).
- **Bloqueio**: evento `BLOQUEADO` na trilha, inclusive os que nunca chegaram a commit. No Comarka eles não aparecem no git: dos 37 eventos de `BLOQUEADO` do log, só 13 viraram transição `pendente→bloqueado` commitada, porque o humano reabre no working tree antes do autocommit.

| | CI | Actus | Comarka |
|---|---|---|---|
| drenagens no período | 340, todas ociosas (`OCIOSO pendentes=1 244=dependencia:243:bloqueado`) | 354; 251 ociosas, 1 pausada | ~1 a cada 15 min |
| **tickets executados** | **0** | **2** (531, 533) | **270** (268 com agente, mais 2 obsoletos por recon sem tentativa) |
| done | 0 | 2 | 266 |
| **com ≥1 bloqueio** | 0 | 0 | **33 tickets / 37 eventos** |
| refatiar | 0 | 0 | 0 (o motor do Comarka não tem esse status; o diff cap reprova e bloqueia) |
| obsoleto por recon divergente | — (sem recon) | — | **2** (724 `local-loop.log:68629`; 853 `:84622`). Mais o 854, que um humano bloqueou ao ver o recon divergir (`435e1f1`) e que nunca rodou |
| pausa por gate sistêmico (sem bloqueio) | 0 | 0 | 5 eventos (802, 761, 851, 741a, 707) |
| nasceu bloqueado (humano), sem executar | 0 | 1 (532, `331087a`) | 1 (854) |
| **taxa de bloqueio / executado** | n/a (24/09: 30,1%) | **0/2** (24/09: 29,7%) | **33/268 = 12,3%** (24/09: 11,7%) |
| taxa só spec (`spec_criterio` + `spec_allowlist`) | n/a (7,2%) | 0 (9,4%) | **22/268 = 8,2%** (5,9%; 9,0% somando os obsoletos por recon) |

**Leitura:**
- **CI e Actus**, os dois repos com o motor do kit, **quase não executaram**:
  - o CI ficou 15 dias ocioso, com a fila presa em 243 → 244;
  - o Actus rodou 2 tickets em 27-28/09, sem bloqueio. O 531 teve só um adiamento por orçamento e um "status congelado" de 7 h, recuperado (`events.log` desde a linha 1638).
  - **Não há amostra para comparar taxa nesses dois.**
- **O Comarka não "bloqueia muito pouco".** A taxa por ticket é a mesma de 24/09 (12,3% contra 11,7%), e a parte de spec subiu (8,2% contra 5,9%).
  - O que mudou foi o **tempo até destravar**: mediana de **2,7 h**, em geral com Lucas e uma sessão Claude reescrevendo a spec no mesmo dia.
  - A impressão de "bloqueia pouco" vem daí e do volume: 266 done em 2 semanas.
- O C1 do Comarka (recon como ERRO no validar-fila) **não aparece como redução**. O recon rodou e passou (`recon_esperado: ok`) em 39 dos 42 eventos; os outros 3 não tinham recon. Ele pegou 3 tickets no período (724, 853 e 854), que são justamente os que não viraram bloqueio.

---

## 3. Tabela por bloqueio

**Legenda:**
- **Data**: hora local da última tentativa da série.
- **Custo antes**: tentativas, segundos de agente (`claude_dur_secs`) e US$ estimado a 0,40/min (§7). No 801, o tempo de agente foi limitado a 3000 s, porque a máquina travou.
- **Horas**: até a próxima tentativa (requeue). "segue" = ainda bloqueado em 09/10 19:25.
- **Gate**: `gate-ticket.ts` de `3ad99bf` rodado em memória sobre a versão do ticket no último commit antes do bloqueio, com status forçado a `pendente` no objeto e fila, branch alvo e disco no instante (reflog de `origin/staging-auto` e `main`). Config do Comarka: o `gate_ticket` do fixture, porque ele não tem o próprio. **Nenhum caso deu erro; a coluna lista os avisos.**
- **(c)**: um agente que só escreve em `docs/fila/<ticket>.md` resolveria sem afrouxar.
- **(d)**: um diagnóstico pronto pouparia tempo humano.
- **Caminhos**: relativos a `comarka-operacional/docs/fila/`; `L:` = `runs/local-loop.log`.

| # | repo | id | data | classe | causa real (evidência) | custo antes | quem destravou, como | horas | gate 3ad99bf | (c) | (d) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | comarka | 559 | 25/09 10:24 | dependencia | aceite correto achou falta de tela (Auditoria, travessões); 3º `it` era premissa velha (WhatsApp) — `runs/559/attempt-2.prev2/gate-vitest.txt:980,1071,1366`; L:55043 | 2 · 408 s · 2,72 | Lucas `92bee2c`: cria 626 (src) + nota na spec | 0,5 | não (10n, 6b) | parcial | sim |
| 2 | comarka | 559 | 25/09 10:59 | dependencia | resta travessão no `formatBytes` (`runs/559/attempt-2/gate-vitest.txt:979`); é o caso de `defeitos/2026-09-25-aceite-vermelho.md` | 2 · 395 s · 2,63 | Lucas `73a1a46`: cria 559a | 0,5 | não (10n, 6b) | não | sim |
| 3 | comarka | 627 | 25/09 11:38 | spec_criterio | teto 273 medido com outro contador; o do ticket dá 278 (`runs/627/attempt-2/gate-vitest.txt:936`); diff 0, mas o gate rodou teste não commitado (defeito `2026-09-25-teto-medido…`) | 2 · 125 s · 0,83 | Lucas `d01396a`: teto pelo contador do teste | 0,3 | não (10n, 6b) | sim | sim |
| 4 | comarka | 600 | 25/09 13:52 | dependencia | aceite achou falta real ("Campanhas" no cartão) — `runs/600/attempt-3/gate-vitest.txt:983`; o claude-output aponta `geral-tab.tsx:931` | 3 · 962 s · 6,41 | Lucas `d35dd41`: cria 600a (src `f2b3c4d`) | 3,3 | não (10n, 6b) | não | sim |
| 5 | comarka | 627b | 25/09 14:17 | spec_criterio | crit[2] lia teto anterior em `HEAD`, que já é o commit novo: sempre `234_234_234` (`runs/627b/attempt-3/criterios.txt:17`; L:55993) | 3 · 850 s · 5,67 | Lucas `d35dd41`: `merge-base` | 3,0 | não (10n, 6b, C11 sem causa) | sim | sim |
| 6 | comarka | 549c | 25/09 19:08 | spec_criterio | premissa velha: o 619 já pusera o 20º cron, crit pedia 20 (`runs/549c/attempt-2/criterios.txt:17`) | 3 · 107 s · 0,71 | Lucas `80010ba`: 20 → 21 | 0,2 | não (6b, C11 sem causa) | sim | sim |
| 7 | comarka | 627j | 25/09 19:50 | spec_allowlist | `test/painel-campanhas-mockup.test.ts` fora da allowlist: "Cannot find module sem-dado" (`runs/627j/attempt-3/gate-vitest.txt:949`) | 3 · 684 s · 4,56 | Lucas `ba984b0`: stub/teste na allowlist | 0,2 | não (C11 citou outro teste) | sim | sim |
| 8 | comarka | 635 | 25/09 23:12 | motor (+allowlist) | executor sem `Bash(git rm:*)` (`635.pre-requeue-26set/attempt-2/gate-vitest.txt:2239`) + `test/cartao-topo-setup-e-closer.test.ts` fora (`:974`) | 2 · 262 s · 1,75 | Lucas `64eb67d` (motor) + `64c6b22`/`a09e47a` (allowlist) | 12,8 | não (10n, 6b, 8 ×22) | parcial | sim |
| 9 | comarka | 654 | 26/09 13:54 | spec_allowlist | teste do 636 fora da allowlist fixa a string que o ticket remove (`654.pre-requeue-26set/attempt-2/gate-vitest.txt:975`) | 3 · 277 s · 1,85 | Lucas `5d9f7cc`: teste na allowlist + anti-afrouxamento | 1,7 | não (10n, 6b) | sim | sim |
| 10 | comarka | 407a | 29/09 19:08 | spec_criterio | `{ grep -o … \| wc -l; } \|\| echo ARQUIVO_AUSENTE` sob pipefail imprime "0 ARQUIVO_AUSENTE" (`runs/407a/attempt-2.prev1/criterios.txt:113`; L:64265) | 2 · 330 s · 2,20 | Lucas `89b66ca`: 17 critérios para `if/else` | 49,2 | não (10n) | sim | sim |
| 11 | comarka | 689 | 30/09 16:52 | spec_allowlist | `test/cron-paths-vercel.test.ts` fora exige a rota que o ticket libera (`runs/689/attempt-2/gate-vitest.txt:1375`) | 2 · 158 s · 1,05 | Lucas `44fa47c`: teste na allowlist; escopo do teto vai ao 721 | 28,4 | não (6q, 8 ×721 **parcial**, 10n, 6b) | sim | sim |
| 12 | comarka | 691 | 30/09 17:10 | spec_criterio | `m=$([ -f ] && grep -ci … \|\| echo 0)` vira "0 0" (`runs/691/attempt-1.prev1/criterios.txt:65`; L:65362) | 2 · 105 s · 0,70 | Lucas `89b66ca` | 20,1 | não (10n, 6b; C2c não pega dentro de `$( )`) | sim | sim |
| 13 | comarka | 346d | 01/10 13:31 | spec_allowlist | `test/lote-b3-2-periodo.test.ts` fora; na T2 o agente o editou e o enforcement barrou (`runs/346d/attempt-2/enforcement.json`; L:66186) | 2 · 321 s · 2,14 | Lucas `7fd9e5f`: teste na allowlist, piso 32 → 28 expect (afrouxou leve, com guarda) | 2,1 | não (10n, 8) | sim | sim |
| 14 | comarka | 407a | 01/10 20:24 | spec_criterio | nome de migration fixo anterior ao do 691 e crit[32] exigia timestamp maior: impossível (`runs/407a/attempt-3/criterios.txt:222`) | 3 · 303 s · 2,02 | Lucas `0bf46f8`: renomeia e compara com `ls-tree origin/staging-auto` | 2,7 | não (10n, 6r, C4) | sim | sim |
| 15 | comarka | 722 | 01/10 21:25 | spec_allowlist | `test/leitura-relacao-gatilhos.test.ts` fora, 5 `it` (`runs/722/attempt-1.prev1/gate-vitest.txt:1412`) | 2 · 174 s · 1,16 | Lucas `0bf46f8`: teste na allowlist + anti-zeragem | 2,2 | não (10n, 6b) | sim | sim |
| 16 | comarka | 723 | 02/10 00:10 | motor | DIFF-CAP por `wc -l` do diff cru: 1162/1050 contra diff real de 720/650 (L:68717; `runs/723/attempt-*/diff.stat`) | 2 · 496 s · 3,31 | Lucas `46bbb3a` (numstat); antes fatiou à toa (`c7b8af1`) e desfez (`718206d`) | 10,9 | não (10n, 6b) | não | sim (forte) |
| 17 | comarka | 715 | 02/10 00:20 | spec_allowlist | `test/crons-meta-consolidacao.test.ts:442` `toHaveLength(25)` fora da allowlist (`runs/715/attempt-2/gate-vitest.txt:1443`) | 2 · 219 s · 1,46 | Lucas `718206d`: cria 726 (lista nominal) e põe dependência | 10,9 | não (6q ×2 sem causa, 10n, 6b) | sim | sim |
| 18 | comarka | 737 | 02/10 16:05 | spec_criterio | `case "$f" in $p)` lê `[id]` como classe de caractere: falso `FORA_` (L:69906) | 3 · 465 s · 3,10 | Lucas `b8842d9`/`02942f7`: remove o critério, redundante com o enforcement | 1,6 | não (10n, 6b) | sim | sim |
| 19 | comarka | 739 | 03/10 14:23 | spec_criterio (+humano) | crit[0] contava comentários de 4 arquivos fora da allowlist; T2 caiu no enforcement (L:71698); faltava FK com DDL | 2 · 170 s · 1,13 | Lucas+Claude `23267e2`, FK `113647b`, token `2f1eeb7` | 71,7 | não (6v, 10n, 6a:`rm `) | parcial | sim |
| 20 | comarka | 801 | 04/10 04:45 | ambiente | máquina lenta/dormindo: claude 2 h, vitest 3654 s, `Timeout waiting for worker` (`runs/801/attempt-2/gate-vitest.txt:1593`) | 2 · 10973 s (cap 3000) · 20,0 | pausa desligada à mão; gate humano `87522d9`→`34f29da` | 60,3 | não (10n, 6b) | não | parcial |
| 21 | comarka | 760 | 05/10 12:15 | ambiente (base vermelha) | `test/migrations-policy-idempotente.test.ts:212` vermelho desde `8e8b525` (`attempt-1.prev1/gate-vitest.txt:1553`) | 2 · 359 s · 2,39 | Lucas+Claude `ea77243` (.sql da base) | 2,2 | não (10n, 6b) | não | sim |
| 22 | comarka | 762 | 05/10 15:20 | spec_allowlist | cron novo exige `src/middleware.ts` fora da allowlist; `testes_conferidos` falso (`attempt-1.prev1/gate-vitest.txt:1583`) | 2 · 330 s · 2,20 | Lucas+Claude `09e85d2` | 3,1 | não (10n, 6b) | sim | sim |
| 23 | comarka | 856 | 06/10 13:49 | spec_allowlist | `test/rotas-orfas.test.ts:257` fora (`856.pre-requeue-06out/attempt-1/gate-vitest.txt:1640`) | 2 · 142 s · 0,95 | Lucas+Claude `9d7ef4d` | 1,0 | não (10n, 6b) | sim | sim |
| 24 | comarka | 867 | 07/10 13:04 | spec_allowlist (+humano) | linhas `:87`/`:119` de teste na allowlist fora da lista fechada de asserções; o avaliador reprovou recálculo honesto (L:76748, :76769) | 3 · 372 s · 2,48 | Lucas `ee9efbe`: autoriza no .md **e** em `liberacoes.json` | 1,1 | não (8, C11 citou outro teste, 10n, 6b) | parcial | sim |
| 25 | comarka | 711a | 07/10 18:32 | spec_allowlist | crit[14] proíbe `corScoreSaude` que `test/sem-insumo.test.ts:237` (fora) exige (`attempt-1.prev1/gate-vitest.txt:1831`) | 3 · 791 s · 5,27 | Lucas+Claude `2d79bee` | 0,7 | não (10n, 6b) | sim | sim |
| 26 | comarka | 711b3 | 07/10 20:13 | spec_allowlist | `test/saude-motivo-sem-base.test.ts:65,70` e `sem-insumo` fora; T1 parou pedindo inclusão (`attempt-1.prev1/claude-output.txt`) | 3 · 402 s · 2,68 | edição humana varrida no autocommit `ae22bc3` (afrouxou leve) | 4,5 | não (8, 10n, 6b) | sim | sim |
| 27 | comarka | 741 | 07/10 21:37 | dependencia | `detectar.ts` (861) sem função pura e proibido de mudar; diff 0 (`runs/741/attempt-1.prev1/claude-output.txt`) | 2 · 41 s · 0,27 | Lucas `208b849`/`d7a8d54`: cria 741a | 14,8 | não (10n, 6b) | não | sim |
| 28 | comarka | 707 | 07/10 22:11 | humano | aceite exige "Abrir grupo", que a tela não tem; o ticket mandava deixar `it` vermelho e o gate exige suíte verde | 2 · 441 s · 2,94 | decisão do Lucas na spec (`d7a8d54`) | 13,7 | não (6b) | não | sim |
| 29 | comarka | 826 | 08/10 01:37 | spec_allowlist (+premissa) | cartões em `geral-tab.tsx` fora da allowlist; reuniões/resumos sem bloco (`attempt-3.prev1/verdict.json`) | 3 · 1022 s · 6,81 | Lucas `90b5727`: spec nova + 826b, 908, 909, 909b | 34,0 | não (8, 10n, 6b) | parcial | sim |
| 30 | comarka | 900 | 08/10 04:44 | spec_criterio | f-string do gerador virou `.{1,2}` em `(1, 2)`: crit[7] sempre ST_0_2 (`runs/900/attempt-1.prev1/criterios.txt:57`) | 2 · 190 s · 1,27 | Lucas+Claude `21437fe` | 10,8 | não (10n, 6b) | sim | sim |
| 31 | comarka | 898 | 08/10 10:49 | ambiente (base vermelha) | `Cannot find module '@/hooks/useAcaoUnica'` por `e931b00` (humano) na staging-auto | 2 · 137 s · 0,91 | reaberto sem mudar spec (`b785839`); base `780c1a6` | 4,4 | não (6q, 10n, 6b) | não | sim |
| 32 | comarka | 741a | 08/10 11:40 | ambiente (+topologia) | mesma base vermelha; o conserto estava só na main e a pausa saiu antes (`--off` zera o streak, L:82725) | 2 · 329 s · 2,19 | streak `2b75247`; base `e202b05` | 0,5 | não (6r, 6q, 10n, 6b) | não | sim |
| 33 | comarka | 707 | 08/10 13:07 | dependencia (+humano) | 3 `it` = lacunas reais de tela; T1 o avaliador pegou afrouxamento (mérito) (`attempt-3.prev1/claude-output.txt`) | 3 · 731 s · 4,87 | Lucas+Claude `f2c3cef`: cria 707a e 707b | 1,6 | não (6b) | não | sim |
| 34 | comarka | 898 | 08/10 15:22 | spec_criterio | grep `delete` do crit[4] casa `on delete cascade`, que a spec exige (`attempt-1.prev2/criterios.txt:33`) | 3 · 299 s · 1,99 | Lucas `c5d74cd`: sed antes do grep | 2,8 | não (6q, 10n, 6b) | sim | sim |
| 35 | comarka | 950 | 09/10 15:48 | spec_allowlist | `test/etapa2-funil-motor.test.ts:92` fora (`runs/950/attempt-2/claude-output.txt`) | 2 · 151 s · 1,01 | Lucas `4dc5d71`: teste na allowlist; teto 260 → 270 (afrouxou leve) | 2,7 | não (6q, 10n, 6b) | sim | sim |
| 36 | comarka | 940 | 09/10 16:56 | ambiente (árvore suja) + motor | **aprovado no mérito**; merge recusou por `docs/fila/854-…md` modificado em `_worktrees/staging-auto`, rotulado "conflitou" (L:85202-85203, :85217) | 2 · 342 s · 2,28 | **ninguém: segue bloqueado** (árvore limpa desde 18:04) | segue (~2,5) | não (6q, 10n, 6b) | não | sim |
| 37 | comarka | 932 | 09/10 17:29 | ambiente (árvore suja) + motor | idem (L:85252, :85267) | 2 · 74 s · 0,49 | **segue bloqueado** | segue (~1,9) | não (6q, 10n, 6b) | não | sim |

**Pausas por gate sistêmico (não são bloqueio; o ticket volta a pendente e a fila para):**

| id | data | classe | causa | horas | gate |
|---|---|---|---|---|---|
| 802 | 04/10 15:56 | ambiente | igual ao 801 (máquina) | 50,7 | não |
| 761 | 05/10 12:32 | ambiente | igual ao 760 (base) | 2,1 | não |
| 851 | 05/10 15:35 | spec_criterio | spec mandava selecionar `valor_mensal`, proibido por `test/c0-guard.test.ts` (Guardrail 14). **O streak errou**: eram 2 defeitos de spec independentes (762 e 851) | 19,8 | não |
| 741a | 08/10 11:14 | ambiente | base `useAcaoUnica` | 0,4 | não |
| 707 | 08/10 11:58 | ambiente | idem | 1,0 | não |

**Fora da execução** (gate rodado também; nenhum recusaria):
- **724 e 853:** obsoletos por recon no loop, sem tentativa.
- **854:** recon divergente visto em revisão humana; bloqueado em `435e1f1` e reaberto em `8b60d47`.
- **Actus 532:** nasceu bloqueado por `humano:ghl-escopo-users-confirmado`; segue.

**Agregado dos 37 eventos de bloqueio:**

| classe | eventos | US$ est. | horas bloqueadas | (c) sim | (c) parcial | (d) sim |
|---|---|---|---|---|---|---|
| spec_allowlist | 13 | 33,62 | 92,6 | 11 | 2 | 13 |
| spec_criterio | 10 | 19,63 | 162,4 | 9 | 1 | 10 |
| ambiente | 6 | 28,27 | ~71,8 | 0 | 0 | 5 + 1 parcial |
| dependencia | 5 | 16,91 | 20,7 | 0 | 1 | 5 |
| motor | 2 | 5,05 | 23,7 | 0 | 1 | 2 |
| humano | 1 | 2,94 | 13,7 | 0 | 0 | 1 |
| **total** | **37** | **~106** | **~385** | **20** | **5** | **36 + 1 parcial** |

- **Mérito como causa de bloqueio: 0.** Houve mérito só em tentativas intermediárias (600 T2, 627j T2, 407a T2 e 707 T1), e o juiz pegou nos quatro.
- **Afrouxamento no destrave:** leve em 6 (559, 346d, 711b3, 715, 950 e 707 com a divergência aceita); claro em nenhum.
- **Base vermelha contra teste acoplado:** dos eventos com gate vitest vermelho, o arquivo vermelho estava fora da allowlist em quase todos. Separar os dois casos é o que muda o remédio: allowlist (spec) contra consertar a base.
- **A causa já estava escrita** no `claude-output.txt` ou no `verdict.json` da última tentativa em pelo menos 25 dos 37. O log, porém, só dizia "suíte vermelha" ou "motivo repetiu: provável defeito de spec/harness".

---

## 4. Cobertura do gate atual (kit `3ad99bf`)

| | casos | recusaria (≥1 erro) | avisos por ticket (regras mais frequentes) |
|---|---|---|---|
| bloqueios + pausas + 4 fora da execução | 44 | **0** | 6b 91%, 10n 89%, 6q 20%, 8 14%, C11 9%, 6r 7%, C4/6v/6a:`rm ` 2% |
| **controle**: done do período sem nenhum bloqueio (232 Comarka + Actus 531 e 533), versão antes da 1ª tentativa | 234 | 1, artefato (729: arquivo ausente no sha da simulação, regra 1) → **0 real** | 6b 94%, 10n 91%, C11 17%, 6q 9%, 6a:`rm ` 6%, 8 6%, 6r 3% |

- **Contraprova do simulador** (`sanity.ts`): um ticket com crase, `grep -P` e dependência órfã sai com ERRO em 6a, C2P e 7, e com aviso em C2c. O zero acima é do gate, não do simulador.
- **Causal: 0 de 37.** Conferi um a um os avisos que poderiam apontar a causa:
  - **C11** disparou em 627b, 549c, 627j e 867, sempre citando outro teste. O que quebrou no 627j foi `painel-campanhas-mockup`, e o C11 citou `ui-guard`; no 867 citou `dossie-reuniao-bloco`, e o problema estava em `acao-unica-ficha-controles`.
  - Os testes acoplados que bloquearam (`cron-paths-vercel`, `rotas-orfas`, `sem-insumo`, `etapa2-funil-motor`, `crons-meta-consolidacao`…) escapam do C11 por basename curto, por mais de 4 testes citando ou por acoplamento por import, não por nome. É o mesmo diagnóstico da calibração (`levantamento-7d1-calibracao.md:270-272`).
  - **6q** disparou em 9, sem causa em nenhum. O `grep -Fxq` do critério SO_ALLOWLIST do Comarka passou em todos.
  - **Parcial: 1.** O aviso 8 no 689 (sobreposição com o 721) aponta o arranjo que o humano fez no destrave (escopo movido para o 721), mas não o vermelho.
- **Os avisos não discriminam:** 6b e 10n aparecem em ~90% dos bloqueados e em ~92% do controle, e C11 em 9% contra 17%.
- **Três formas de shell que um gate estático pegaria e o atual não pega:**
  - `{ cmd | wc -l; } || echo X` sob pipefail (407a #10);
  - `$( … grep -c … || echo 0 )` (691 #12). A própria mensagem do C2c recomenda "compare dentro de `$( )`", que é a forma do defeito;
  - `case "$f" in $p)` com `[id]` no pathspec (737 #18).
  - Os três são `spec_criterio` com (c) = sim, e não discutidos aqui como regra nova.

---

## 5. Resíduo

**O resíduo são os 37.** O gate atual não recusaria nenhum, e o recon do Comarka rodou e passou (`recon_esperado: ok`) em 39 dos 42 eventos, sem recon nos outros 3. Por destino:

| grupo | n | casos | agente só em `docs/fila/<ticket>` resolve sem afrouxar? | diagnóstico pronto poupa humano? |
|---|---|---|---|---|
| **R1. Teste acoplado fora da allowlist** (spec_allowlist com vermelho em teste fora) | 11 | 627j, 654, 689, 346d, 722, 715, 762, 856, 711a, 711b3, 950 | **sim**, com a forma que o humano usou em todos: teste na allowlist + guarda anti-afrouxamento (contagem de `it`/`expect`, sem skip). Em 715, 346d, 711b3 e 950 o humano afrouxou de leve ao fazer isso; o reescritor precisaria de trava | **sim**: o arquivo e a linha vermelhos estão no gate-vitest e quase sempre já no claude-output |
| **R2. Critério com defeito de forma ou premissa** (spec_criterio) | 9 | 627, 627b, 549c, 407a ×2, 691, 737, 900, 898 #34 | **sim**: em todos o conserto foi só no `cmd`/`espera`/nome no .md | **sim**: a saída do critério ("0 ARQUIVO_AUSENTE", "SQL_1_0 0", "234_234_234", "ST_0_2") e o claude-output já davam o conserto |
| **R3. Spec que precisa de decisão ou token** | 5 | 739 (FK com DDL e token), 867 (`liberacoes.json`), 826 (refatiar em 4 tickets), 559 #1 (gap de src), 635 (motor) | **parcial**: a parte de spec sim; o resto exige token, motor ou ticket novo | sim |
| **R4. Dependência: o aceite achou falta real no código** | 4 | 559 #2, 600, 741, 707 #33 | **não**: o remédio é ticket novo de código (559a, 600a, 741a, 707a/b). O escopo "só o próprio arquivo" proíbe | **sim**: o `it` vermelho e o arquivo culpado (formatBytes, `geral-tab.tsx:931`) já estavam lá. É o pedido do `defeitos/2026-09-25-aceite-vermelho.md` |
| **R5. Ambiente** | 6 | 801, 760, 898 #31, 741a #32, 940, 932 | **não** | **sim** em 5: "base vermelha em arquivo que o diff não tocou, desde `<sha>`" e "árvore suja na staging-auto, não conflito". 940 e 932 **seguem bloqueados com o mérito aprovado**, porque o rótulo "conflitou" não mandou ninguém requeuear |
| **R6. Motor** | 1 | 723 (DIFF-CAP por `wc -l`) | não | **sim, forte**: o `diff.stat` mostrava 650 e o humano fatiou à toa |
| **R7. Humano** | 1 | 707 #28 | não | sim |

**Somas:**
- **(c) = sim: 20 de 37** (R1 + R2), 54%.
- **(c) sim ou parcial: 25 de 37.**
- **(d) = sim: 36 de 37.** O 801 é parcial, porque as 60 h foram espera por um gate humano posto depois.

**Achados do motor do Comarka no caminho** (não são do kit; registro aqui, não em `docs/defeitos/`, pelo escopo desta sessão):
- **Árvore suja vira "conflito":** o merge na `_worktrees/staging-auto` falha, o motor roda o agente de novo e bloqueia o ticket aprovado (940, 932). A guarda de sujeira só cobre a `orq-runner` (`avaliador.sh:50-58`, segundo o agente do grupo 2).
- **O streak zera com `orq-pause --off`:** o 1º ticket depois da retomada, na mesma base vermelha, vira BLOQUEADO em vez de PAUSADO (741a #32).
- **O streak confunde dois defeitos de spec independentes com falha sistêmica** (762 + 851).
- **A nota "provável defeito de spec/harness" aparece em dependência, base vermelha e árvore suja.** É o defeito já registrado em 25/09.

---

## 6. Recomendação de tamanho para a 7f

**Dimensionamento:**
- **Demanda no motor do kit hoje: 0 caso/semana.** CI e Actus não tiveram nenhum bloqueio de execução no período (0 e 2 executados).
- **Demanda real: 37 bloqueios em 2,1 semanas = 17,5/semana, todos no Comarka**, que ainda roda motor próprio. A 7f do kit só atende isso **depois da migração**.

**Custo por caso:**
- **Triador:** US$ 0,20 a 0,40. Ele lê `gate-vitest` recortado ao redor dos `FAIL`, `criterios.txt`, o claude-output da última tentativa e o ticket, ~40 a 80 mil tokens de entrada em Sonnet. Metade do trabalho é determinística e custa zero:
  - nomes dos `it` vermelhos e `arquivo:linha`;
  - o vermelho está dentro ou fora da allowlist;
  - o vermelho está num arquivo que o diff tocou ou não;
  - o arquivo já estava vermelho em outro ticket da mesma base;
  - `git status` da worktree alvo antes do merge.
- **Reescritor:** US$ 1 a 2 de agente, mais a nova série que o ticket roda de qualquer jeito (média estimada de US$ 2,88 por série bloqueada), mais a trava anti-afrouxamento.

| opção | casos/semana atendidos | o que atende | custo/caso | custo/semana | o que poupa |
|---|---|---|---|---|---|
| **(a) não construir** | 0 | — | 0 | 0 | — |
| **(b) só triador com diagnóstico no painel** | **17,5** (36/37 com diagnóstico útil) | os 37: classe, `arquivo:linha` do vermelho, dentro/fora da allowlist, base vermelha, árvore suja, o diagnóstico que o próprio agente escreveu | **~US$ 0,30** (parte determinística a US$ 0) | **~US$ 5** | a leitura manual de gate-vitest e claude-output em todo caso; os erros de remédio medidos (723 fatiado à toa; 940 e 932 parados com mérito aprovado; streak religado com conserto só na main) |
| **(c) triador + reescritor** | 17,5 diagnosticados, dos quais **9,5 resolvidos sem humano** (R1 + R2 = 20/37) e mais 2,4 parciais | (b) + reescrever allowlist/critério no .md | ~US$ 0,30 + ~US$ 1,5 = **~US$ 1,8** de resolução (+US$ 2,9 da série, que já se gasta hoje) | **~US$ 22** de resolução | horas de espera: mediana de 2,7 h por caso; soma de ~148 h nos 20 casos (c) = sim, puxada por 407a (49 h), 689 (28 h) e 691 (20 h), que pegaram noite e fim de semana |

**Recomendação: (b), construída como parte da migração do Comarka para o kit, e não antes.**
- Hoje a 7f no kit atenderia 0 caso/semana.
- No Comarka, o diagnóstico serve a 36/37 casos por ~US$ 5/semana. O que ele evita são justamente os casos em que o humano agiu errado ou não agiu: 723, 940, 932 e 741a.

**(c) não agora. Os números que justificam:**
1. O humano já destrava rápido: mediana de 2,7 h, quase sempre com uma sessão Claude no mesmo dia. O ganho do reescritor é principalmente noturno.
2. Em 4 dos 11 R1 o humano afrouxou de leve ao destravar. Um reescritor sem trava medida repetiria isso em ~1/3 dos casos de allowlist.
3. Os 9 R2 são forma de shell e premissa. Três deles (407a #10, 691, 737) cabem em regra estática nova do gate (§4), a custo zero e antes de gastar tentativa. Isso tira ~1,4 caso/semana do reescritor.

**Reavaliar (c)** quando a migração estiver feita e o triador tiver rodado 2 semanas. Se a fração "R1 + R2 com diagnóstico pronto e espera > 4 h" passar de ~5/semana, o reescritor se paga.

---

## 7. Lacunas

- **Custo do Comarka é estimativa.** Nenhum attempt grava `total_cost_usd`; a única medida é `claude_dur_secs`.
  - A taxa de US$ 0,40/min vem de 178 tentativas do Actus (`total_cost_usd / duration_ms`; mediana 0,47; média por tentativa US$ 1,26), só do executor, sem o juiz.
  - O 801 e o 802 têm 2 h de agente com a máquina travada; limitei a 3000 s.
- **Horas bloqueadas** = da última tentativa da série até a próxima tentativa do ticket. Incluem noite, fim de semana, gates humanos postos depois (801 e 802) e janelas em que o loop pode ter estado parado (não conferi o 407a de 49 h nem o 691 de 20 h).
- **Bloqueios fora do git.** No Comarka, só 13 dos 37 eventos viraram transição commitada. Contei pelo log (`executor.sh:703/713/745`). Um bloqueio que não deixou linha no log escaparia, mas não vi nenhum.
- **Versão do ticket usada no gate.** É o último commit antes do bloqueio, porque o loop lê o working tree.
  - 689, 691 e 739 rodaram antes do 1º commit do arquivo; usei o 1º commit (`94a46ba`, `cc5281c`), que pode ter ajuste posterior à execução.
  - Os autocommits "status automatico" misturam edição humana de spec (711b3, 707).
- **Bases das regras de árvore.** `origin/staging-auto@{data}` e `main@{data}` pelo reflog. O first-parent não serve no Comarka, porque a promoção fez fast-forward e a história de `staging-auto` passa pela da `main`. Usei o "disco" (C9 e C11) como `main` no instante, e o dicionário de acento (C4) da árvore atual.
- **Config do gate no Comarka.** Usei o `gate_ticket` do fixture, porque o Comarka não tem o próprio. Com outra lista de `proibido_no_cmd`, só mudam as regras 6a.
- **Classificação.** Foi feita por 3 agentes de leitura e revisada por mim, sem rerodar nada. Escolhi uma classe por evento onde havia duas:
  - 635: motor, com allowlist;
  - 739: spec_criterio, com humano;
  - 867: spec_allowlist, com humano;
  - 741a #32: ambiente, com topologia;
  - 707 #33: dependencia, com humano.
- **(c) e (d) são juízo, não teste.** Nenhum reescritor foi rodado. "Sem afrouxar" foi julgado contra o destrave real.
- **Autoria de quem sujou a `_worktrees/staging-auto`** (940, 932): provável, a sessão do commit `435e1f1`, mas não provado.
- **CI e Actus sem amostra.** Os bloqueios que seguem abertos lá (CI 243 desde 21/09; Actus 517a, 518-521 e 527 desde 23-24/09) são de antes do período e ficaram fora da tabela. São `humano`/`dependencia` pela classificação de 24/09.
