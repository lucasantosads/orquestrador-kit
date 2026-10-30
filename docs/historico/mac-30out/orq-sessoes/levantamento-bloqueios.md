# Levantamento de bloqueios da frota: CI, Actus e Comarka

Sessão só de leitura, 24/09/2026. O objetivo é medir, com dado real, o que leva um ticket a `bloqueado` ou `refatiar`, e decidir se um **triador** e um **reescritor de spec** no motor do kit se pagam. Nenhum código foi escrito e nenhum repo foi tocado. Os agentes auxiliares (6, um por lote) também só leram.

## 1. Estado encontrado no PASSO 0

**Kit** (`~/Projetos/orquestrador-kit`): HEAD `596ca4c` (K12-J), árvore limpa.

| Etapa | Na main? | sha |
|---|---|---|
| 7b | sim | 7b-1 `a28fe81`, 7b-2 `cfb5cf3`, 7b-3 `dd3ecd7`, 7b-4 `ffab528`, 7b-5 `052ac50`, 7b-6 `470c237`, 7b-7 `27177af`, 7b-8 `551e967`, 7b-9 `da97b3a` |
| 7c | **não** | só prevista, em `relatorio-kit-etapa7b.md:6479-6490`: launchd.md, test-lib-config sem números fixos, preflight de ticket único, gate streak cross-ticket (E2) |
| 7d | **não** | só prevista, em `relatorio-kit-etapa7b.md:6491-6494`: gate de ticket como pré-voo do `drive_ticket` (Actus `c404986`), `grep -q` em pipe (`aab3f4e`), saída textual do vitest (`a15daca`) |
| 7e | **não** | só prevista, em `relatorio-kit-k12.md:616` e `PECAS.md:878,909`: custo do `pendentes_razoes` |
| K12 | sim | A `7062e86`, B `b32a6c2`, C `85e4796`, D `1bc8bd0`, E `6ba83bc`, F `c559fa6`, G `8548365`, H `ece6719`, I `740f874`, J `596ca4c` |
| K15 | **não** | PENDENTES, `PECAS.md:1019` |

**Pré-voos e validações de critério na main do kit:**
- **Pré-voo de drenagem**, `prevoo.ts:257`:
  - checagens: cat.7 toolchain (`:109`), cat.0 spec vendorizada (`:122`), cat.1 identidade (`:146`), cat.6 estrutura da fila (`:178`) e cat.3 sondagem, só informativa (`:219`);
  - chamado de `local-loop.sh:733`;
  - **nenhuma checagem olha ticket.**
- **Preflight do executor**, `executor.sh:53-130`, mais a sondagem de modelos (`:147`). A recusa vira `ADIADO motivo=preflight` (`:1265`).
- **Restrição de execução**: `executor.sh:1022`, que chama `decisao.ts:70`.
- **Gate de ticket**: `gate-ticket.ts:349`, checks 1 a 8.
  - Só roda pelo `orq gate` (`scripts/orq:302`). **O loop não o chama** (divergência 7, peça 1c).
  - Não executa alvo nem guarda (divergência 6, peça 1b).
- **Critérios depois do agente**: `executor.sh:429` (`run_criterios`) e o match em `lib.sh:1322` (`criterio_match`).

**Motor do kit, os pontos que esta sessão usa:**

| O quê | Onde |
|---|---|
| Tabela de causas | `decisao.ts:85-96`, `:109`, `:128`, `:192`, `:283` |
| Desfecho | `decisao.ts:345` |
| Sub-motivo | `decisao.ts:325`, `:501` |
| Repetição | `decisao.ts:536` |
| Retry e escalada | `decisao.ts:425`, `:417` (NUNCA_ESCALA), `:461` (ESCALAR só com sub=juiz) |
| Refatiar | `executor.sh:1111`, que chama `marca_refatiar` (`:923-941`) |
| Mapa de modelos | `config-tabela.ts:77-88` (juiz alto e baixo); `:132-140` explica que `executor_model` e `retry_final_model` são lidos direto (`executor.sh:1035`, `decisao.ts:474`); juiz por risco em `juiz.ts:62-81` |

**Repos:**

| Repo | HEAD | Motor | Trilha |
|---|---|---|---|
| conteudos-infinitos | `8a16aa0` | kit `da97b3a` (7b) | `docs/fila/runs/events.log`, desde 03/09 |
| actus-saas | `e01b5e0` | kit + 17 commits `PORTE-PENDENTE` | `events.log` desde 11/09; antes, `local-loop.log`, `launchd.log` e `pre-voo-*.md` |
| comarka-operacional | `a5f7784`; `M` em 544b e 545, 545 `em_execucao`, não tocados | **próprio**, config v1 | **sem events.log**: `local-loop.log` (desde 21/08) e `.20260821`; `runs/<id>/attempt-N[.prevK]/` |

**Recorte:**
- **Tickets na tabela:** 165, todos os que passaram por `bloqueado` ou `refatiar`. São 26 do CI, 59 do Actus e 80 do Comarka. No Comarka, só transições desde 26/07/2026 (60 dias), porque a fila tem 718 tickets.
- **Método:** `git log -G'"status": "(bloqueado|refatiar|obsoleto)"' -- docs/fila/*.md` em todas as branches. Ficaram de fora os arquivos em `.bak/`.
- **Obsoletos que nunca passaram por bloqueado/refatiar** (fora da tabela): Comarka 23, Actus 0, CI 0.
- **Refatiar hoje:** nenhum ticket está nesse status nas três filas.

## 2. Tabela por ticket

**Legenda das colunas:**
- **custo**: US$ até o bloqueio.
  - CI: `runs/custo.json`, que só existe desde 03/09.
  - Actus: `total_cost_usd` das tentativas até a hora do bloqueio; o ledger só existe desde 11/09.
  - Comarka: não tem ledger nem `total_cost_usd` em nenhum attempt. Aparece `sem dado (dur Ns)`, a soma de `claude_dur_secs`, que **não é custo**.
- **tent.**: tentativas até o bloqueio. No Comarka inclui todos os `attempt-N.prevK`, com as vazias contadas à parte.
- **(a)**: o motor do kit na main **hoje** teria evitado. `sim`; `mais barato` (bloquearia assim mesmo, mas antes ou sem opus); `formal` (o ticket ficaria `pendente` com dependência em vez de `bloqueado`: não evita o humano); `parcial`; `não`.
- **(b)**: algo só previsto em PECAS.md ou nos relatórios da 7b e da K12 teria evitado. Cita a peça.
- **(c)**: um agente com escrita só em `docs/fila/<ticket>` (o próprio arquivo, sem fatiar) teria resolvido **sem afrouxar** o critério.
- **(d)**: algum commit `PORTE-PENDENTE` do Actus teria evitado. `mais barato: sha` = bloquearia do mesmo jeito, mais cedo.
- **(e)**: o `gate-ticket.ts` da main do kit, rodando no loop antes do executor (peça 1c), teria recusado. **Medido:** o gate rodou sobre a fila do commit anterior ao 1º bloqueio, com o ticket forçado a `pendente`. `recusaria: 2x1 5x5` = check 2 uma vez, check 5 cinco vezes. `causal` diz se o check tem relação com a causa do bloqueio.
- Evidência com `L:` = `docs/fila/runs/local-loop.log`, e `LL0821:` = `local-loop.log.20260821`, ambos no Comarka.

| repo | id | 1º bloqueio | status hist→atual | classe | causa | evidência | destravado por | custo | tent. | (a) motor hoje | (b) previsto | (c) reescritor | (d) PORTE-PENDENTE | (e) gate-ticket | afrouxou |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| conteudos-infinitos | 001 | 21/08 | bloqueado→done | motor | placar 8/9 pacotes por `parsePlacar` cego a ANSI; falso positivo da barreira em `.from('personas')`; a1 com 772>600 | runs/001/attempt-{0,1,2}/gates.txt; attempt-2/enforcement.json; ccf5d3d | 3dafc08 Lucas: fatiou em 001a/001b | sem dado | 3 | mais barato (placar ANSI já corrigido, gates.ts:106; a a1 iria para refatiar por diff_cap) | não | não | não | recusaria: 2x1 5x5; causal não | não |
| conteudos-infinitos | 001a | 23/08 | bloqueado×6→done | topologia | worktree nascia de staging-auto sem o 004 (jsdom/alias); depois placar ANSI, diff 625>600 e grep ANSI | 29868e0 (nota); be8b946; 3ac634a/74f2014/d7b1eea/a21912c/34f9e73 | 29868e0 Lucas: staging-auto sincronizada; liberação final 34f9e73 | sem dado | 3 | mais barato (sub=criterio sem opus); nada sincroniza a base | não | não | não | recusaria: 2x1 5x3 8x1; causal não | não |
| conteudos-infinitos | 001b | 26/08 | bloqueado×3→done | motor | gate 8/9 pacotes por placar ANSI (diagnosticado errado 2×) | ccf5d3d (cita 001b); runs/001b/attempt-{1,2}/gates.txt | d7b1eea Lucas: requeue após ccf5d3d | sem dado | 3 | sim (strip ANSI, gates.ts:106) | n/a | não | não | recusaria: 2x1 5x2; causal não | não |
| conteudos-infinitos | 002 | 19/08 | bloqueado×5→done | motor | barreira auditava `docs/sql-pendente/*.sql` como script e reprovava o DELETE do próprio artefato; depois placar ANSI | 7b60682; 7ef2149 (nota); ccf5d3d | 7ef2149 Lucas: barreira por caminho, critério 8 reescrito; final d7b1eea | sem dado | 6 | sim (provável: barreira por caminho, enforcement-core.ts:213-217, e placar ANSI) | não | não | não | recusaria: 2x1 5x8; causal não | limítrofe (critério 8 passou a excluir *.sql) |
| conteudos-infinitos | 003 | 26/08 | bloqueado×4→done | spec_criterio | guardas com `grep -c … \|\| echo 0` imprimiam "0\n0"; gates também 8/9 (ANSI) | 3ac634a (nota e diff); 9b29a6d | 3ac634a Lucas: `\|\| echo 0`→`\| head -1`; final 34f9e73 | sem dado | 3 | mais barato (sub=criterio mantém sonnet) | sim: 1b (guarda que já falha contra HEAD) | não (o gate ANSI seguiria) | não | recusaria: 2x1 5x8; causal não | não |
| conteudos-infinitos | 004 | 19/08 | bloqueado→done | ambiente | jsdom e @testing-library declarados e nunca instalados (node_modules em symlink, sem npm install) | 9531d18; runs/004/attempt-{0,1,2}/gates.txt | 9531d18 Lucas: fora do loop (deps instaladas, oxc.jsx corrigido, critérios endurecidos) | sem dado | 3 | mais barato (sem opus) | não | não | não | recusaria: 2x1 5x5; causal não | não (endureceu) |
| conteudos-infinitos | 005 | 26/08 | bloqueado→done | motor | regex escapado quebrava no `@tsv` do jq; gate 8/9 por placar ANSI | 8d28d22 (nota); 8bde1de; runs/005/attempt-*/gates.txt | 8d28d22 Lucas: aprovado em revisão humana (merge 92f7f90) | sem dado | 3 | sim (join \u001f, executor.sh:450; strip ANSI) | n/a | não | não | recusaria: 2x1 5x9; causal não | não |
| conteudos-infinitos | 006 | 28/08 | bloqueado→done | motor | gate 8/9 (714p/0f) por placar ANSI; requeue culpou cache do vite | runs/006/attempt-{1,2}/gates.txt; 74f2014; ccf5d3d | 74f2014 Lucas: requeue; aprovado 01/09 após ccf5d3d | sem dado | 3 | sim (gates.ts:106) | n/a | não | não | recusaria: 2x1 5x8; causal não | não |
| conteudos-infinitos | 007 | 18/08 | bloqueado→done | humano | nasceu bloqueado: `apps/web/DESIGN.md` em no_write_paths, exigia escrita à mão | 64e87a4 (notas_status) | 511abd2 Lucas: feito à mão (9393186) | sem dado | 0 | não | não | não | não | recusaria: 2x2 5x1; causal não | não |
| conteudos-infinitos | 008 | 28/08 | bloqueado→done | motor | gate 8/9 por placar ANSI | ccf5d3d (cita 008); runs/008/attempt-{1,2}/gates.txt | 4f8f815 Lucas: requeue; aprovado após ccf5d3d | sem dado | 3 | sim (gates.ts:106) | n/a | não | não | recusaria: 2x1 5x8; causal não | não |
| conteudos-infinitos | 009 | 19/08 | bloqueado×3→done | motor | 1º e 2º: gate 8/9 com 6 critérios verdes (ANSI); 3º: guarda `main...HEAD` sobre branch de staging-auto | 1a05acd; ccf5d3d; 771b1fe; f039a03 | a21912c Lucas: requeue após f039a03 | sem dado | 3 | parcial (1º e 2º sim; 3º não) | sim: 1b (para o 3º) | não | não | recusaria: 2x1 5x7; causal não | não |
| conteudos-infinitos | 010 | 28/08 | bloqueado→done | motor | gate 8/9 por placar ANSI (a1 também com 768 linhas) | ccf5d3d (cita 010); runs/010/attempt-*/gates.txt | 4f8f815 Lucas: requeue; aprovado 01/09 | sem dado | 3 | sim (provável) | n/a | não | não | recusaria: 2x1 5x9; causal não | não |
| conteudos-infinitos | 011 | 01/09 | bloqueado→done | topologia | guarda `git diff main...HEAD` rodava sobre branch de staging-auto e contava o page.tsx do 010 | f039a03 (mensagem: "Reprovou 009, 011, 013, 014"); 93cee58 | a21912c Lucas: requeue após f039a03 (cmd com `$BASE_REF`) | sem dado | 3 | mais barato (BASE_REF é exportado, executor.sh:442, mas o cmd fixava main) | sim: 1b | sim | não | recusaria: 2x1 5x8; causal não | não |
| conteudos-infinitos | 013 | 01/09 | bloqueado→done | topologia | mesma guarda `main...HEAD` contando o page.tsx do 010 | f039a03; 3c227fe | a21912c Lucas | sem dado | 3 | mais barato | sim: 1b | sim | não | recusaria: 2x1 5x7; causal não | não |
| conteudos-infinitos | 014 | 01/09 | bloqueado→done | topologia | mesma guarda `main...HEAD` em page.tsx/loading.tsx | f039a03; ba23b05 | a21912c Lucas | sem dado | 3 | mais barato | sim: 1b | sim | não | recusaria: 2x1 5x7; causal não | não |
| conteudos-infinitos | 016 | 01/09 | bloqueado×2→done | spec_criterio | critério fazia grep 'Tests N passed' na saída colorida do vitest 4 | f039a03 (Bug 2); a7de3ff; 34f9e73 | 34f9e73 Lucas: requeue após 98fe1e7 (NO_COLOR no harness) | sem dado | 3 | sim (NO_COLOR e strip_ansi no critério, executor.sh:442) | sim: 7d (saída textual do vitest) | sim | não | recusaria: 2x1 5x8; causal não | não |
| conteudos-infinitos | 201 | 02/09 | bloqueado→done | spec_allowlist | `geracao-guiada.test.ts` fora da allowlist afirmava a regra antiga: respeitar a fronteira = gate vermelho, cruzar = fora_do_pathspec | runs/201/attempt-1/enforcement.json; attempt-2/gates.txt; PLAYBOOK.md:42 | 1016c3d Lucas: teste e actions.ts na allowlist + avaliador anti-afrouxamento | sem dado | 3 | mais barato (refatiar na 2ª, decisao.ts:357-365) | não | sim | não | não recusaria; causal não | não |
| conteudos-infinitos | 227 | 04/09 | bloqueado→done | motor | após o juiz reprovar a 1ª, as tentativas 2 e 3 nasceram em worktree vazia (diff=0) | events.log:127-137; 6c46cfc; 3435f53 | 6c46cfc Lucas: requeue após 3435f53 (retry na mesma worktree) | 1,57 | 3 | sim (worktree reaproveitada, executor.sh:1072; diagnóstico no retry) | n/a | não | não | recusaria: 6x1 8x1; causal não | não |
| conteudos-infinitos | 230 | 06/09 | bloqueado→obsoleto | spec_allowlist | trocar `faixa_renda` para lista quebra PersonaForm.tsx:101 e personas-form-preserva.test.tsx, fora da allowlist | runs/230/attempt-4/gates.txt; events.log:229-520; 8a7f9b5; PLAYBOOK.md:165 | 8a7f9b5 Lucas: obsoleto, redesenho em 230a/230b | 15,83 | 5 | mais barato (3 tentativas e não 5; sem opus) | não | sim (provável) | não | recusaria: 6x5 6x14; causal não | não (redesenho) |
| conteudos-infinitos | 231 | 08/09 | bloqueado→done | spec_allowlist | colisão não declarada: personas-form-preserva.test.tsx:75 fora da allowlist | runs/231/attempt-2/gates.txt; events.log:713-725; 16871b4 | 16871b4 Lucas: arquivo na allowlist com 5 guardas anti-afrouxamento | 7,29 | 3 | mais barato (sem opus) | não | sim | não | recusaria: 6x3 6x1; causal não | não |
| conteudos-infinitos | 235 | 08/09 | bloqueado→done | ambiente | base vermelha: 7 falhas em test/orquestrador-notificacao.test.ts após 1a3f6e5; critérios 25/25 | runs/235/attempt-2/gates.txt; events.log:782-795; 1a3f6e5; f0b2abf | 16871b4 Lucas: requeue sem mudar spec, após f0b2abf | 3,77 | 3 | mais barato (corte de repetição na 2ª, ~US$ 1,37 a menos) | não | não | mais barato: 284a147 (base_vermelha na 1ª) | não recusaria; causal não | não |
| conteudos-infinitos | 241 | 07/09 | refatiar→obsoleto | motor | barreira de credencial pegou 3 fixtures `token: 'token-…000'` com gates verdes; refatiar sem retry com remédio errado | events.log:640-642; 8a7f9b5; PLAYBOOK.md:167 | 8a7f9b5 Lucas: 241a/241b com a regra "token de fixture por expressão" | 1,11 | 1 | não (o kit faz o mesmo, decisao.ts:357-365) | não | sim | não | recusaria: 6x6 6x6; causal não | não |
| conteudos-infinitos | 242 | 08/09 | bloqueado→done | spec_criterio | guarda lia `aprovacoes-link.test.ts`, que sumiu com o split do 241 ("No such file" nas 3) | runs/242/attempt-2/criterios.txt; events.log:740-754; 16871b4 | 16871b4 Lucas: critério sobre os 3 arquivos reais | 4,07 | 3 | mais barato (corte na 2ª, sem opus) | sim: 1b | sim | não | recusaria: 6x7 6x10; causal não | não (endureceu) |
| conteudos-infinitos | 243 | 21/09 | refatiar→pendente→bloqueado | motor | barreira de credencial casou `const TOKEN='tok-secreto-…'` com 27/27 critérios; refatiar sem retry. Depois o juiz reprovou 3× (mérito) | events.log:1380-1382; 3c0d902; events.log:1445-1459; 2dd9674 | 3c0d902 Lucas: randomBytes + critério anti-literal; voltou a bloquear em 2dd9674 (repetição, sub=juiz), segue bloqueado | 0,53 (4,81 até o bloqueio atual) | 1 (4 até hoje) | não | não | sim (para o refatiar) | não | não recusaria; causal não | não |
| conteudos-infinitos | 269 | 22/09 | bloqueado→done | motor | 4 adiamentos de preflight por árvore suja (liberacoes.json do `orq liberar` sem commit); AMBIENTE não disparou com 269 e 270 na mesma drenagem (bug `local-loop.sh:541`, ver §6) | events.log:1462-1480; a3a0b23 | 9e10cba Lucas: liberação commitada, reaberto | 0,00 | 0 (4 adiamentos) | não (é o motor atual que bloqueou) | não | não | não | não recusaria; causal não | não |
| conteudos-infinitos | 270 | 22/09 | bloqueado→done | motor | idêntico ao 269 | events.log:1463-1480; a3a0b23 | 9e10cba Lucas | 0,00 | 0 (4 adiamentos) | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 111 | 14/08 | obsoleto,bloqueado→done | motor | aprovado em 13/08, mas o status não ficou no arquivo da fila; rodou de novo sobre base com a 0254 e o juiz reprovou duplicatas | runs/launchd.log:314; c2c4fb9; fecbf51 | 1956b42 Lucas: obsoleto por decisão; 20be5d9: done | sem dado | 3 | sim (o kit commita o status: "fila: N aguardando merge/done") | não | não | não | recusaria: 2x1 5x5; causal não | não |
| actus-saas | 212 | 09/09 | bloqueado×2→done | spec_criterio | espera "[1-9]" comparada como literal contra `grep -c` | 51611bc; runs/212/attempt-2/resultado.json; b394782 | b394782 Lucas: critérios viraram `grep -q && echo ok`; 2º bloqueio saiu em 1d440ba | sem dado | 3 | sim (`criterio_match` trata espera não numérica como regex, lib.sh:1322) | não | sim | não | recusaria: 2x1 5x6; causal não | **sim** (b394782) |
| actus-saas | 321 | 25/08 | bloqueado×2→done | merito | ESLint no próprio mt.test.ts (`_nome`/`_params`); a 3ª caiu por TS7053 em arquivo alheio | runs/321/attempt-4/resultado.json; attempt-3/gate-typecheck.txt | b394782 Lucas: requeue depois do 114; aprovado 09/09 | sem dado | 4 | não | não | não | não | recusaria: 2x1 5x5; causal não | não |
| actus-saas | 430 | 10/09 | bloqueado→done | topologia | critério "nenhum src/" com `main...HEAD` numa frente de staging-auto divergente contava 5 arquivos herdados | runs/430/attempt-3/criterios.txt | 1d440ba Lucas; aprovado 13/09 após sync main/staging-auto | sem dado | 3 | não (o ticket escreveu main) | sim: 1b | sim (`$BASE_REF`) | não | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 431 | 09/09 (nasceu); 20/09 e 21/09 | bloqueado×3→done | spec_criterio | nasceu segurado pela 0264 (humano); depois de liberado, 2 bloqueios por critério 4/5 com `\| grep -q` (SIGPIPE) e vitest lido por texto | d5d8d72; events.log:789-802, 941-953; aab3f4e; 487ad3d | 28a9bbb (0264 aplicada); aab3f4e/487ad3d/4991234 Lucas: critérios reescritos (rc) | 11,54 | 6 (+0 no nascimento) | mais barato (corte de repetição; sem opus) | sim: 7d (grep -q em pipe, saída textual do vitest) | sim | não | recusaria: 2x1 5x5; causal não | não |
| actus-saas | 440 | 09/09 | bloqueado→done | motor | harness antigo: `git add` atômico falhou por pathspec inexistente e o `commit --allow-empty` deu diff vazio com o trabalho pronto | runs/440/attempt-2/claude.stdout.txt; launchd.log:2086; relatorio-actus-faseA.md:970-976 | 9d65938 Lucas: done sem merge, superado pelo 480 | sem dado | 3 | sim (COMMIT_HARNESS com `git add -A`) | não | sim | não | recusaria: 2x1 5x6 8x1; causal não | não |
| actus-saas | 441 | 10/09 | bloqueado→done | spec_allowlist | allowlist sem sugestao-card.tsx e com diretório inexistente; juiz reprovou a UI não ligada; depois diff vazio pelo git add atômico | launchd.log:2088; runs/441/attempt-3/claude.stdout.txt | 9b5550d Lucas: superado pela fatia 460/461/462 | sem dado | 3 | não | não | não (motivo livre × CHECK de enum exigia decisão) | não | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 442 | 10/09 | bloqueado→done | humano | as 15 etapas exigem INSERT na etapa_canonica (coluna congelada, CHECK de 5 valores); o executor parou pedindo decisão | launchd.log:2090,2131; 9b5550d | 9b5550d Lucas: superado por 470-472 | sem dado | 3 | mais barato (refatiar na 1ª por enforcement) | não | não | não | recusaria: 2x1 5x5; causal não | não |
| actus-saas | 443 | 11/09 | bloqueado→done | topologia | entrega aprovada 09/09 só na branch legado/harness-2026-09, fora de main após recriar staging-auto | d034f60 (nota) | 1d440ba Lucas: cherry-pick 0a5e66d, merge 18d3680 | sem dado | 1 | não | não | não | não | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 444 | 11/09 | bloqueado→done | topologia | idem 443 | d034f60 | 1d440ba Lucas | sem dado | 1 | não | não | não | não | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 445 | 11/09 | bloqueado→done | topologia | idem 443 | d034f60 | 1d440ba Lucas | sem dado | 1 | não | não | não | não | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 447 | 11/09 | bloqueado→done | topologia | migration 0266 aprovada só em legado/harness-2026-09 | d034f60 | feb8dfe Lucas: 0266 extraída e aplicada; 8ee80b6 | sem dado | 1 | não | não | não | não | recusaria: 2x1 5x5; causal não | não |
| actus-saas | 460 | 12/09 | bloqueado×3→done | dependencia | `fn_sugestao_resolver` não aceita motivo; o agente parou no PARE do ticket (diff=0); faltava a fn _v2 (494/0271) | events.log:110; runs/460/attempt-0/claude.txt | bd6ce4c Lucas: reescrito para `fn_sugestao_resolver_v2`, dep 494 | 1,81 | 3 | mais barato (corte na 2ª, diff 0 igual) | não | não | mais barato: 0aa3c83 | não recusaria; causal não | leve (2c21ba8, depois removido) |
| actus-saas | 461 | 12/09 (nasceu); 15/09 e 16/09 | bloqueado×3→done | spec_criterio | nasceu segurado pelo 460; liberado, bloqueou 2× com critérios 3/4 lendo texto do build/vitest (diff 717/717/717 e 684×3) | 4187d82; events.log:436-449, 566-579; 8f4af33; f9f14ad | 8f4af33/2e13284/f9f14ad Lucas: critérios leem rc; duplicados de gate removidos | 8,86 | 6 | mais barato (corte de repetição na 2ª; sem opus) | sim: 7d (saída textual do vitest) | sim | mais barato: 0aa3c83 | recusaria: 2x1 5x4; causal não | não |
| actus-saas | 462 | 12/09 | bloqueado→done | dependencia | nasceu segurado: esperava o 461 em produção | 4187d82 | ec81622 Lucas: dependências satisfeitas | 0 | 0 | formal (ficaria pendente com dependência, sem bloquear) | não | não | não | recusaria: 2x1 5x3 8x1; causal não | não |
| actus-saas | 470 | 12/09 | refatiar×2,bloqueado×3→done | spec_criterio | critério `vitest --reporter=dot \| grep -qiE passed && echo ok` nunca imprimia ok; typecheck vermelho pela base 21b50e8 | events.log:126; runs/470/attempt-0/criterios.txt; 3677bec/f8af204 | c63c58b Lucas: done por refatiamento em 470b/470c | 4,27 | 3 | mais barato (corte na 2ª, diff 1021 igual) | sim: 7d (a15daca saída textual do vitest, aab3f4e) | sim (ler o rc) | não | não recusaria; causal não | não |
| actus-saas | 471 | 12/09 | bloqueado→(renomeado) | dependencia | nasceu segurado pelo 470; virou redesenho | bcc8457; c63c58b | 3e3b7dc Lucas: reescrito (0280), fatias 471b/c/d | 0 | 0 | formal | não | não | não | não recusaria; causal não | não |
| actus-saas | 472 | 12/09 | bloqueado→done | dependencia | nasceu segurado pelo 471 | bcc8457 | c63c58b Lucas: reescrito como espelho cru | 0 | 0 | formal | não | não | não | recusaria: 8x1; causal não | não |
| actus-saas | 480 | 13/09 | bloqueado→done | spec_criterio | `vitest --reporter=dot \| grep -q passed` saía vazio; guarda `main...HEAD` acusava a 0264 herdada | events.log:219; runs/480/attempt-0/criterios.txt | ecf6f4e Lucas: done por cherry-pick para main sem rerodar critérios | 4,41 | 3 | mais barato (corte na 2ª) | sim: 1b e 7d | sim | não | não recusaria; causal não | leve (7509d3c: guarda `HEAD~1`) |
| actus-saas | 481 | 13/09 (nasceu); 13, 15, 17, 21 e 22/09 | bloqueado×8→done | spec_criterio | nasceu segurado pelo 480; liberado, bloqueou 3× por critério 3/4 lendo texto (diff 697×3, 606×3, 621×3), depois teste fora do include do vitest e leitura de node_modules negada | events.log:222-235, 453-467, 584-598, 821-1065; 8f4af33; c0ef499; 232a2b5 | 3f044a1 Lucas: implementação manual fora do loop (23/09) | 28,44 | 21 | mais barato (corte na 2ª em cada série; sem 18 tentativas em opus) | sim: 7d (saída textual do vitest) | sim (critério por rc; include) | mais barato: 0aa3c83 | não recusaria; causal não | não |
| actus-saas | 482 | 13/09 | bloqueado→done | dependencia | edita os mesmos arquivos do 480; segurado até ele entrar em main | 0119ab2 | f9b8d56 Lucas | 0 | 0 | formal | não | não | não | recusaria: 8x1; causal não | não |
| actus-saas | 483 | 13/09 | bloqueado→done | spec_criterio | objetivo impossível: `create or replace` com parâmetro novo cria overload ambíguo (42725), e o CHECK recusa texto livre | events.log:257; 23c4a31 | 3ce9589 Lucas: resolvido fora do loop (0270/0271) | 4,96 | 3 | não (diffs diferentes) | não | sim (redesenhar para fn _v2) | não | não recusaria; causal não | não |
| actus-saas | 488 | 21/09 | bloqueado→done | spec_allowlist | objetivo exigia resolver anexo via ingest.ts/detalhe-mensagem.ts, fora da allowlist e no FORA DE ESCOPO | events.log:992; ae2bc80; 1e6b08d | 1e6b08d Lucas: refatiado em 488 e 488b | 10,30 | 6 | mais barato (corte na 2ª) | não | sim | mais barato: 0aa3c83 | não recusaria; causal não | não |
| actus-saas | 488b | 22/09 | bloqueado→done | motor | juiz não via a fixture fora do diff; retry sem o motivo do juiz repetiu o diff de 31 linhas 3× | events.log:1133; 29c20e9; b28e896 | b28e896 Lucas: fixture nova + critérios awk | 3,73 | 3 | mais barato (corte na 2ª) | não | sim | sim: d825b2c e 0aa3c83 | não recusaria; causal não | não (endureceu) |
| actus-saas | 490 | 14/09 | bloqueado→done | spec_criterio | índice acento-insensível com `unaccent` (STABLE): o CREATE INDEX falharia | events.log:354; e1977aa | 3ce9589 Lucas: índice sobre lower(nome) | 5,79 | 3 | mais barato (corte na 2ª) | não | sim | mais barato: 0aa3c83 | não recusaria; causal não | **sim** (3ce9589) |
| actus-saas | 491a | 17/09 | bloqueado×2→done | ambiente | critério `pnpm run build` no subshell saía vazio com o gate de build verde; permissões negadas | events.log:626; runs/491a/attempt-0/criterios.txt; 31bafd0 | f9f14ad Lucas: removeu critérios que duplicavam gates | 6,08 | 3 | mais barato (corte na 2ª) | não | sim | mais barato: 0aa3c83 | não recusaria; causal não | formal (f9f14ad) |
| actus-saas | 496 | 23/09 | bloqueado→done | spec_allowlist | juiz exigia reuso de `aplicarEnriquecimento`, em ingest.ts fora da allowlist; TS2802 da base derrubou 1 e 3 | events.log:1323; 168c410 | 168c410 Lucas: ingest.ts na allowlist | 3,56 | 3 | não | não | sim | não | não recusaria; causal não | não |
| actus-saas | 497 | 14/09 | refatiar→done | spec_allowlist | allowlist `scripts/orquestrador/**` colide com no_write_paths; premissa falsa | events.log:391; runs/497/attempt-0/claude.txt | 9a3c8d9 Lucas: done por refatiamento (497a, manuais) | 4,55 | 2 | não | não | não (zona proibida) | não | não recusaria; causal não | não |
| actus-saas | 499 | 22/09 | bloqueado→done | motor | juiz apontou lacunas reais nos testes, mas o retry não recebeu o motivo e repetiu o diff de 36 linhas 3× | events.log:1150; ebe4616; 0aa3c83 (mensagem) | b28e896 Lucas: casos explícitos | 3,73 | 3 | mais barato (corte na 2ª) | não | sim | sim: 0aa3c83 | não recusaria; causal não | não (endureceu) |
| actus-saas | 499c | 23/09 | refatiar→done | motor | `checarTesteSql` lê só linhas adicionadas; a abertura do `DO $teste_0278$` ficou como contexto e virou falso "sem bloco DO" | events.log:1407; 6a2c49d | 6a2c49d Lucas: contorno no ticket (tag nova) | 1,00 | 1 | não (mesma regra, enforcement-core.ts:358-363) | não | sim | não | não recusaria; causal não | não |
| actus-saas | 501 | 21/09 | bloqueado→done | motor | juiz sem ferramentas só via o diff; o avaliador mandava comparar com a 0264, fora do diff | events.log:939; runs/501/attempt-2/juiz.veredito.json | 76af390 Lucas: contexto_juiz=[0264] + dep 622 | 3,85 | 3 | não | não | não | sim: 76af390 | não recusaria; causal não | não |
| actus-saas | 505b | 23/09 | refatiar→done | motor | `debug-0276.txt` esquecido na worktree, commitado pelo harness, virou refatiar | events.log:1360; 226e05e | 226e05e Lucas: "debug só em /tmp", novos critérios | 1,19 | 1 | não | não | sim | sim: 0c093de, 0e2d2ad | não recusaria; causal não | não (apertou) |
| actus-saas | 510 | 23/09 | bloqueado→done | humano | nasceu bloqueado: decisão do mecanismo de resgate e números do 509 em produção | 510-resgate-mensagens-descartadas.md:143@8c05758 | 828c792, 8af9b2a Lucas: tokens liberados | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 510c | 23/09 | bloqueado→done | ambiente | base vermelha: hookTimeout de 10 s num teste alheio sob carga; retry repetiu o diff | events.log:1509,1514; runs/510c/attempt-0/gates.txt:8-9 | 6a2c49d Lucas: reaberto, depende do 510a (hookTimeout) | 1,22 | 2 | não | não | não | mais barato: 284a147 | não recusaria; causal não | não |
| actus-saas | 513 | 23/09 | refatiar→done | motor | `diag-tmp.txt` solto commitado pelo harness virou refatiar; e 2 critérios pela frase "service role" | events.log:1424; baa7b5e | baa7b5e Lucas: frase corrigida, temporário em /tmp, dep 512b | 1,56 | 1 | não | não | sim | sim: 0c093de, 0e2d2ad | não recusaria; causal não | não (apertou) |
| actus-saas | 514 | 23/09 | bloqueado→done | humano | harness por desenho: motor é zona proibida; implementação manual | 514-orq-pause-remove-todos-sentinelas.md:59@168c410 | 9b673b2 Lucas: manual em main (a196762) | 0 | 0 | não | não | não | é a própria peça (a196762) | não recusaria; causal não | não |
| actus-saas | 517 | 23/09 | bloqueado→pendente | humano | nasceu esperando a decisão da fonte da etapa GHL | 517-leitor-criterio-etapa-motor.md:48@168c410 | 7c852ae Lucas: token gravado; pendente atrás do 517a | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 517a | 24/09 | bloqueado (atual) | humano | nasceu bloqueado: nada prova que o evento de oportunidade do GHL chega (escopo ausente) | 517a-etapa-crm-da-oportunidade.md:171@7c852ae | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 518 | 23/09 | bloqueado (atual) | dependencia | aguarda 516 e 517 | 518-prompt-criterio-etapa.md:45@168c410 | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 519 | 23/09 | bloqueado (atual) | dependencia | aguarda o 517 | 519-criterios-shadow-schema.md:49@168c410 | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 520 | 23/09 | bloqueado (atual) | dependencia | aguarda 517, 518 e 519 | 520-criterios-shadow-fiacao.md:45@168c410 | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 521 | 23/09 | bloqueado (atual) | dependencia | aguarda 519 e 520 | 521-criterios-shadow-telemetria.md:50@168c410 | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 522 | 23/09 | bloqueado→pendente | humano | decisão de produto (shadow, flag por tenant) | 522-ativacao-criterios-ghl-por-tenant.md:39@168c410 | 7c852ae Lucas: decisões escritas; pendente | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 523 | 23/09 | bloqueado→done | humano | esperava as queries do 506 rodadas em produção | 523-medir-causa-audio-comarka.md:37@168c410 | 8af9b2a Lucas: resultado colado, token liberado | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 525 | 23/09 | bloqueado→obsoleto | humano | aguardava 523 e decisão da hipótese de formato do anexo | 525-ler-anexo-formato-real.md:48@168c410 | 8af9b2a Lucas: obsoleto (hipótese derrubada) | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 526 | 23/09 | bloqueado→done | humano | aguardava 523 e confirmação da hipótese "busca de detalhe falhou" | 526-detalhe-ghl-erro-acionavel.md:45@168c410 | 8af9b2a Lucas: hipótese confirmada, reescopo | 0 | 0 | não | não | não | não | não recusaria; causal não | não (reescopo) |
| actus-saas | 527 | 23/09 | bloqueado (atual) | humano | aguarda 496 e a causa corrigida pelo 525/526 | 527-reprocessar-outro-historico-audio.md:47@168c410 | nunca | 0 | 0 | não | não | não | não | não recusaria; causal não | não |
| actus-saas | 622 | 21/09 | bloqueado→done | humano | harness por desenho (motor é zona proibida) | 622-contexto-juiz.md:114@379dab6 | 76af390 Lucas: manual | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 623 | 22/09 | bloqueado→done | humano | harness por desenho | 623-retry-feedback-juiz.md:76@b8ba5f0 | 4d67308 Lucas (0aa3c83) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 624 | 22/09 | bloqueado→done | humano | harness por desenho | 624-pre-voo-regex-criterio.md:92@5d75f66 | 1b30f7b Lucas (8d16413) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 625 | 22/09 | bloqueado→done | humano | harness por desenho | 625-criterio-aceite-falho-e-merito.md:84@b8ba5f0 | 78465db Lucas (8eec421) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 626 | 22/09 | bloqueado→done | humano | harness por desenho | 626-gates-fonte-unica.md:77@b8ba5f0 | 9ddf8b2 Lucas (77aa9a3) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 627 | 22/09 | bloqueado→done | humano | harness por desenho | 627-regra-evidencia-fabricada.md:73@b8ba5f0 | c15e236 Lucas (0e2d2ad) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 628 | 22/09 | bloqueado→done | humano | harness por desenho | 628-contexto-juiz-fixtures.md:83@b8ba5f0 | 00249d8 Lucas (d825b2c) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 629 | 23/09 | bloqueado→done | humano | harness por desenho | 629-timeout-teto-adiamento-ambiente.md:133@0565f99 | 3d25ab2 Lucas (274a216) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 630 | 23/09 | bloqueado→done | humano | harness por desenho | 630-fila-json-quebrado-falha-alto.md:123@db3520f | fec5d8e Lucas (7f64c80) | 0 | 0 | não | não | não | é a própria peça | recusaria: 6x1; causal não | não |
| actus-saas | 631 | 23/09 | bloqueado→done | humano | harness por desenho | 631-arquivo-solto-reprova-por-merito.md:136@baa7b5e | 2da6723 Lucas (0c093de) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 632 | 23/09 | bloqueado→done | humano | harness por desenho | 632-base-vermelha-bloqueia-sem-retry.md:129@6a2c49d | 1feea97 Lucas (284a147) | 0 | 0 | não | não | não | é a própria peça | não recusaria; causal não | não |
| actus-saas | 900 | 11/09 | bloqueado×2→done | topologia | worktree de staging-auto antiga com config sem `_execucao_dos_gates`: gates.ts quebrou em todas as tentativas e virou criterio_qualidade; 2º bloqueio por TS2802 na base | events.log:26, 76; runs/900/attempt-0/gates.txt | d034f60 Lucas (recriar staging-auto); 8499896 Lucas (reabriu) | 3,44 | 3 | não (viraria gate_crash e adiaria até o teto) | não | não | sim: 77aa9a3 (1º bloqueio) | não recusaria; causal não | não (endureceu) |
| comarka-operacional | 001 | 07/08 | bloqueado→done | motor | executor.sh morria com `model_flag[@]: unbound variable` antes do agente; gates sobre .next stale | runs/001/attempt-1/claude-output.txt; attempt-2/gate-tsc.txt; 64efa32 | baa3347 Lucas: done por merge manual e3bcb42 | sem dado | 3 (3 vazias) | sim | não | não | não | recusaria: 2x2 5x4 8x2; causal não | **sim** (`< 400` → `< 900`) |
| comarka-operacional | 027 | 09/08 | bloqueado→done | motor | critério faz curl em localhost:3004 e nada sobe a app: 000 em vez de 401 | LL0821:810, 2080; runs/027/attempt-2/criterios.txt; PLAYBOOK.md:124-131 | d68fa3d Lucas: executor sobe dev server para critérios HTTP; done 939096f | sem dado (dur 2175s) | 3 (0 vazias) | parcial (AMBIENTE 7a-8 poupa os seguintes) | parcial: gate streak E2 (7c/K11b) | sim (critério via vitest do handler) | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 029 | 09/08 | bloqueado→done | motor | curl localhost:3004 sem servidor (000≠401) | LL0821:860-874 | d68fa3d + 046ae62 Lucas | sem dado (dur 1301s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 030 | 09/08 | bloqueado→done | motor | idem 029 | LL0821:892-906 | d68fa3d + 046ae62 Lucas | sem dado (dur 1134s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 031 | 13/08 | bloqueado→done | ambiente | worktree orq-031 stale: o agente rodou fora do worktree, diff 0, rotulado "enforcement falhou" | LL0821:2488, 2756, 3165; runs/031/attempt-1.prev3/claude-output.txt; 48b7ad8 | 48b7ad8, 3871568, ba1d176 Lucas; done fd2eba9 | sem dado (dur 3570s) | 7 (0 vazias; 2 sem diff) | sim (worktree recriada/reaproveitada; preflight; juiz ilegível adia) | não | não | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 032 | 13/08 | bloqueado→done | spec_criterio | crit[2] `grep -c nivel_acesso`=0 proíbe a chave que o crit[4] exige; o agente ofuscou | 939096f (crits 2 e 4); runs/032/attempt-3/verdict.json | 3871568 Lucas: crit[2] restrito ao `.select()` + anti-ofuscação | sem dado (dur 2430s) | 8 | não | não | sim | não | recusaria: 2x2 5x5; causal não | limítrofe (critério tsc do ticket removido) |
| comarka-operacional | 037 | 13/08 | bloqueado→done | ambiente | CLI com stdin EBADF e worktree stale, rotulados "enforcement falhou"; 2 testes alheios fora da allowlist | LL0821:3896, 6136-6149; runs/037/attempt-2/claude-output.txt | 939096f, cd0dfcc Lucas | sem dado (dur 2104s) | 5 (3 vazias) | sim (sem envelope vira adiado); a allowlist ainda seria preciso ajustar | não | não | não | recusaria: 2x2 5x5; causal não | não (endureceu) |
| comarka-operacional | 038 | 09/08 | bloqueado→done | motor | critério HTTP sem servidor (000) | LL0821:1061-1075 | d68fa3d Lucas | sem dado (dur 1267s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5 8x1; causal não | não |
| comarka-operacional | 040 | 09/08 | bloqueado→done | motor | idem 038 | LL0821:1152 | d68fa3d Lucas | sem dado (dur 1435s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5 8x1; causal não | não |
| comarka-operacional | 043 | 09/08 | bloqueado×2→done | motor | guard aplica_migration casou `supabase db push` em prosa .md | runs/043/attempt-1.prev1/enforcement.json; LL0821:1251 | 5bfc942 + 1e4076f Lucas | sem dado (dur 788s) | 1 | sim (prosa .md é documentação, enforcement-core.ts:182-186) | não | não | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 046 | 09/08 | bloqueado→done | motor | critério HTTP sem servidor | LL0821:1295 | d68fa3d Lucas | sem dado (dur 706s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 047 | 09/08 | bloqueado→done | motor | critério HTTP sem servidor | LL0821:1339 | d68fa3d Lucas | sem dado (dur 1884s) | 2 | parcial | parcial: E2 | sim | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 049 | 09/08 | bloqueado×2→done | motor | critério HTTP sem servidor; depois falso positivo aplica_migration em comentário SQL e auditoria-tab.tsx fora da allowlist | LL0821:1385, 3548, 11154; 4ba47cd | d68fa3d, 5bfc942, 4ba47cd Lucas | sem dado (dur 1220s) | 2 | parcial | parcial: E2 | sim (1º bloqueio) | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 050 | 09/08 | bloqueado→done | motor | veredicto ilegível do avaliador contado como reprova | LL0821:1420-1447; runs/050/attempt-3/verdict.json | 046ae62 Lucas: parser tolerante | sem dado (dur 3047s) | 3 | sim (juiz_ilegivel adia, decisao.ts) | não | não | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 062 | 15/08 | obsoleto,bloqueado→obsoleto | tamanho | 4 eixos num ticket; diffs 10552/843/10784 com cap 2500 | LL0821:7388, 7409 | 9cc12dd/c175e9a Lucas: fatiou em 062a/b/c | sem dado (dur 3329s) | 3 | mais barato (refatiar na 1ª) | não | não | não | recusaria: 2x2 5x5 8x4; causal não | não |
| comarka-operacional | 062a | 16/08 | obsoleto,bloqueado→obsoleto | tamanho | cap estourado 2× (4377/4485); a que cabia caiu no crit[4] que contradiz "entregue menos" | LL0821:7501-7521 | 59d06f9 Lucas: fatiou em 062a1/a2 | sem dado (dur 1488s) | 3 | mais barato | não | não | não | recusaria: 2x2 5x10; causal não | não |
| comarka-operacional | 062b | 16/08 | obsoleto,bloqueado→obsoleto | tamanho | substituído antes de rodar (~3150 linhas previstas) | 59d06f9 | 59d06f9 Lucas: fatiou | 0 | 0 | não | não | não | não | recusaria: 2x2 5x9; causal não | não |
| comarka-operacional | 065 | 09/09 | obsoleto,bloqueado→obsoleto | tamanho | diff 1302 > 900; também token Meta não liberado, c0-guard.test fora da allowlist, crit[0] que já passa | LL:19849, 19867; f9e6d08 | 3103702 Lucas: fatiou em 065c-f | sem dado (dur 1503s) | 2 (1 vazia) | mais barato (refatiar na 1ª) | parcial: 1b (crit[0] já passa) | não | não | recusaria: 2x2 5x3; causal não | não |
| comarka-operacional | 068 | 14/08 | bloqueado→(.bak) | tamanho | 2 timeouts de 1800s com diff 0; 4 eixos | LL0821:7011, 7135; a3f4aa0 | 3871568 Lucas: fatiou em 068a/068b | sem dado (dur 3600s) | 2 (2 vazias) | não | não | não | não | recusaria: 2x2 5x6 8x4; causal não | não |
| comarka-operacional | 103 | 19/08 | obsoleto,bloqueado→obsoleto | merito | o agente criava bloco novo em vez de corrigir a tela; v1 escreveu em clientes_receita (C0) | LL0821:14171, 14447; runs/103/attempt-3/verdict.json | 55fa1a0 Lucas: fatias 103a/103b | sem dado (dur 2838s) | 5 | não | não | não | não | recusaria: 2x1 5x4; causal não | não |
| comarka-operacional | 103a | 19/08 | bloqueado→done | spec_criterio | mudança 1 exigida já estava no código; o juiz reprovou 3× por não entregar | LL0821:14968; runs/103a/attempt-3/verdict.json | 93caf5f Lucas: done manual com a mudança 1 "sem objeto" | sem dado (dur 964s) | 3 | não | não | sim | não | recusaria: 2x1 5x4 8x1; causal não | **sim** (requisito retirado, done sem juiz) |
| comarka-operacional | 147 | 23/08 | obsoleto,bloqueado→obsoleto | dependencia | o sheet do kanban não cobre responsável/prazo; o agente recusou remover a rota (diff 0) | runs/147/attempt-1/claude-output.txt; LL:1343, 1355 | f9a5677 Lucas: obsoleto | sem dado (dur 622s) | 5 (1 vazia) | não | não | não | não | recusaria: 2x1 5x3; causal não | não |
| comarka-operacional | 152 | 23/08 | bloqueado→done | spec_allowlist | entrada de menu muda test/rotas-orfas.test.ts, fora da allowlist | LL:1768, 1777; f9a5677 | f9a5677 + d139838 Lucas | sem dado (dur 593s) | 2 | não | não | sim | não | recusaria: 2x1 5x4 8x1; causal não | não |
| comarka-operacional | 154 | 23/08 | bloqueado→done | spec_allowlist | allowlist `src/lib/qualidade/` (barra final) não expande | LL:1502; f9a5677 | f9a5677 Lucas: `/**` | sem dado (dur 268s) | 1 | não (globToRegExp também não expande) | não | sim | não | recusaria: 2x1 5x5; causal não | não |
| comarka-operacional | 161 | 23/08 | bloqueado→done | spec_allowlist | idem 152 | LL:2004, 2012; f9a5677 | f9a5677 + d139838 Lucas | sem dado (dur 681s) | 2 | não | não | sim | não | recusaria: 2x1 5x6; causal não | não |
| comarka-operacional | 184 | 25/08 | obsoleto,bloqueado→obsoleto | spec_criterio | crit[2] "zero clientes_receita em api/churn" proíbe a leitura necessária; o gate casava comentário | LL:3330-3819; PLAYBOOK.md:503-513; 02e00a5 | 02e00a5 Lucas: obsoleto (trabalho na árvore; critérios impossíveis) | sem dado (dur 1818s) | 5 | não | não | sim | não | recusaria: 2x1 5x11; causal não | não |
| comarka-operacional | 205 | 25/08 | bloqueado→done | ambiente | suíte vermelha por test/timer-timeout.test.ts alheio: base anterior ao fix e741c18 | LL:4405, 4418; runs/205/attempt-2/gate-vitest.txt; fa9191d | fa9191d Lucas | sem dado (dur 520s) | 3 (1 vazia) | sim (gate baseline por contagem não atribui falha da base) | não | não | mais barato: 284a147 | recusaria: 2x2 5x6 6x1 6x1; causal não | não |
| comarka-operacional | 214 | 26/08 | bloqueado→obsoleto | indeterminado | crit[3] `bash test-sync-main.sh >/dev/null; echo $?` deu 1; saída descartada | local-loop.log:4867; runs/214/attempt-2/criterios.txt | 02e00a5 Lucas: obsoleto | sem dado (dur 2685s) | 2 | não | não | não | não | recusaria: 2x2 5x13 8x1; causal não | não |
| comarka-operacional | 257 | 01/09 | bloqueado→obsoleto | spec_criterio | premissa superada pelo 082 (rota responde 410); o agente recusou com fundamento | local-loop.log:8218; PLAYBOOK.md:637-642 | d6b8430 Lucas: obsoleto | sem dado (dur 162s) | 2 | não | não | sim | não | recusaria: 2x2 5x9 6x1 6x1; causal não | não |
| comarka-operacional | 258 | 01/09 | bloqueado→done | merito | juiz reprovou com razão; linha "Permission allow rule" antes do JSON virou "veredicto truncado" | local-loop.log:8258, 8349; runs/258/attempt-1.prev1/avaliador-claude.txt | 02e00a5+4c0d237, d6b8430 Lucas; done com opus | sem dado (dur 2094s) | 4 | não | não | não | não | recusaria: 2x3 5x10 6x1 8x7 6x1; causal não | não |
| comarka-operacional | 264 | 01/09 | bloqueado→done | spec_criterio | spec mandava reusar um "padrão de bump" inexistente | local-loop.log:8654; e61091c | 02e00a5 Lucas: recon refeito | sem dado (dur 1421s) | 2 | não | não | sim | não | recusaria: 2x2 5x8 6x1 8x7 6x1; causal não | não |
| comarka-operacional | 271 | 01/09 | bloqueado→done | topologia | worktree de staging-auto local desatualizada; vitest vermelho por arquivo alheio | local-loop.log:9019; runs/271/attempt-2.prev1/gate-vitest.txt; ca1c534 | de8729c (motor: sincroniza com origin); ca1c534 Lucas | sem dado (dur 1071s) | 2 | sim (baseline por contagem; AMBIENTE com 272/273) | não | não | mais barato: 284a147 | recusaria: 2x2 5x10 6x1 6x1; causal não | não |
| comarka-operacional | 273 | 02/09 | bloqueado→done | spec_criterio | crit[2] `git diff --name-only HEAD \| grep -c` dá 0 depois do commit do agente | local-loop.log:9219; runs/273/attempt-3/criterios.txt | 02e00a5 Lucas: critério equivalente | sem dado (dur 2999s) | 5 | não | não | sim | não | recusaria: 2x2 5x5 6x1 6x1; causal não | não |
| comarka-operacional | 277 | 01/09 | bloqueado×2→done | spec_criterio | spec apontava para o motor de onboarding aposentado; depois testes órfãos fora da allowlist e `grep -rc` impossível | cc690b2; PLAYBOOK.md:546; local-loop.log:9507, 11200, 11672 | 02e00a5/684c977, d6b8430, 8ca2bef Lucas | sem dado (dur 835s) | 1 | não | não | sim | não | recusaria: 2x2 5x6 6x1 6x1; causal não | não |
| comarka-operacional | 280 | 02/09 | bloqueado→done | ambiente | timeout rc=124 e depois `claude -p` travado 10h40 sem watchdog | local-loop.log:9613, 9671-9677; fc22b9c | 992f10b Lucas: done (run aprovado) | sem dado (dur 39521s) | 2 | não | não | não | não | recusaria: 2x2 5x6 6x2 6x2; causal não | não |
| comarka-operacional | 288 | 02/09 | bloqueado→obsoleto | spec_criterio | nasceu segurado; recon dizia 0 ocorrências e já havia 5: trabalho já existia | 09d6ef5; PLAYBOOK.md:545 | 02e00a5 Lucas: obsoleto | 0 | 0 | não | não | sim | não | recusaria: 2x2 6x1 6x1; causal não | não |
| comarka-operacional | 294 | 03/09 | bloqueado→done | spec_allowlist | literal em mais 5 libs fora da allowlist; recon mediu só src/app/api | local-loop.log:10517; PLAYBOOK.md:384 | b2b241c Lucas: 5 libs na allowlist | sem dado (dur 694s) | 2 | não | não | sim | não | recusaria: 2x2 6x1 6x1; causal não | não (mais estrito) |
| comarka-operacional | 306b | 19/09 | bloqueado (atual) | spec_allowlist | enforcement barrou leads-ghl.ts e a migration de origem | local-loop.log:34543; 41697c8 | 41697c8 reescreveu; segue esperando humano:ddl-306b0 | sem dado (dur 311s) | 2 | não | não | não (DDL depende de token) | não | recusaria: 2x2 5x4 7x2; causal não | não |
| comarka-operacional | 311 | 08/09 | bloqueado→obsoleto | tamanho | diff 969 > 900 | local-loop.log:17988 | 00954ca Lucas: fatiou em 311a/b/c | sem dado (dur 2203s) | 2 | mais barato (refatiar na 1ª) | não | não | não | recusaria: 2x2 5x3; causal não | não |
| comarka-operacional | 311a | 11/09 | bloqueado→obsoleto | tamanho | diff 907 > 900 | local-loop.log:20924 | 0f007b9 Lucas: fatiou em 311a1/a2 | sem dado (dur 1070s) | 2 | mais barato | não | não | não | recusaria: 2x2 5x10; causal não | não |
| comarka-operacional | 313b | 12/09 | bloqueado→done | spec_allowlist | helper sem arquivo permitido; agente exportou do route.ts (TS2344) | local-loop.log:21998; 5864c94 | 5864c94 Lucas: _lib.ts na allowlist | sem dado (dur 1391s) | 3 | não | não | sim | não | recusaria: 2x2 5x6; causal não | não |
| comarka-operacional | 315a | 13/09 | bloqueado→obsoleto | tamanho | 8 adiamentos por timeout de 1500s + 2 reprovações (diff 1014) | local-loop.log:22244-22589; PLAYBOOK.md:771 | 89871a5 Lucas: fatiou em 9 | sem dado (dur 13719s) | 10 (8 adiadas) | mais barato (teto de adiamentos 7b-3 no 4º) | parcial: 1b | não | mais barato: ae29dcd | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 315b1 | 08/09 | bloqueado→obsoleto | tamanho | motor + 5 fontes num ticket: 916 > 900 | local-loop.log:16854; PLAYBOOK.md:768 | 64bb53a Lucas: fatiou | sem dado (dur 1932s) | 3 | mais barato | não | não | não | recusaria: 2x2 3x1 5x4; causal não | não |
| comarka-operacional | 317 | 16/09 | bloqueado→done | spec_allowlist | os 6 testes invalidados estavam fora da allowlist, que citava arquivo inexistente | local-loop.log:27431; runs/317/attempt-3/gate-vitest.txt; a133de8 | 41697c8 Lucas: 6 testes na allowlist | sem dado (dur 1801s) | 3 | não | não | sim | não | recusaria: 2x2 5x5 7x2; causal não | não |
| comarka-operacional | 325a | 08/09 | bloqueado×2→done | spec_allowlist | fora_do_pathspec em teste; 2º bloqueio por premissa falsa | local-loop.log:18703, 19046 | 25cc595, 6a54a01 Lucas | sem dado (dur 743s) | 2 | não | não | sim | não | recusaria: 2x2 5x2; causal não | não (reescopo) |
| comarka-operacional | 328 | 06/09 | bloqueado→done | spec_allowlist | allowlist citava o teste errado; o real estava fora | local-loop.log:12497, 15310; 8139fda | 8139fda Lucas | sem dado (dur 683s) | 3 | não | não | sim | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 330 | 06/09 | bloqueado→done | spec_allowlist | teste que o 330 invalida estava fora da allowlist | local-loop.log:12705, 15393; 8139fda | 8ca2bef, 8139fda Lucas | sem dado (dur 3795s) | 4 | não | não | sim | não | recusaria: 2x2 5x6; causal não | não |
| comarka-operacional | 331 | 13/09 | bloqueado→done | spec_allowlist | fora_do_pathspec em test/config-integracoes-ia.test.tsx | local-loop.log:22886 | 03d73c7 Lucas | sem dado (dur 1330s) | 2 | não | não | sim | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 335 | 08/09 | bloqueado→obsoleto | tamanho | três frentes: 2076 > 900 | local-loop.log:18066; PLAYBOOK.md:768 | af2c82a Lucas: fatiou | sem dado (dur 2248s) | 3 | mais barato | não | não | não | recusaria: 2x2 5x5 7x1; causal não | não |
| comarka-operacional | 335b | 08/09 | bloqueado→done | spec_allowlist | faltava supabase/migrations/** na allowlist | local-loop.log:18372; PLAYBOOK.md:763 | e944a82 Lucas | sem dado (dur 1133s) | 2 | não | não | sim | não | recusaria: 2x2; causal não | não |
| comarka-operacional | 336 | 08/09 | bloqueado→obsoleto | spec_criterio | premissa falsa: o registro manual de NPS já existia; o agente duplicou (931 linhas) | local-loop.log:16925; PLAYBOOK.md:720; 64bb53a | 64bb53a Lucas: obsoleto, substituído pelo 336c | sem dado (dur 2507s) | 2 | mais barato (refatiar na 1ª) | parcial: 1b | sim | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 341 | 08/09 | bloqueado→obsoleto | spec_criterio | 3 dos 4 itens já existiam; o agente recriou a tela (1167 linhas) | local-loop.log:17021; PLAYBOOK.md:720 | 64bb53a Lucas: obsoleto | sem dado (dur 1669s) | 3 | não | parcial: 1b | sim | não | recusaria: 2x2 5x3; causal não | não |
| comarka-operacional | 342 | 07/09 | bloqueado→obsoleto | spec_allowlist | telas de destino fora da allowlist, componentes órfãos; depois 1083 linhas | local-loop.log:13076, 15637, 20112; bcef8fa | bcef8fa; 361a9f9 Lucas: fatiou | sem dado (dur 8595s) | 7 | não | não | não | não | recusaria: 2x2 5x6; causal não | não |
| comarka-operacional | 343 | 12/09 | bloqueado→obsoleto | spec_allowlist | fora_do_pathspec em 2 testes de menu; diffs de 4832 e 2051 | local-loop.log:21114; dff3629 | dff3629; fbe4cb8 Lucas: fatiou | sem dado (dur 6552s) | 5 | mais barato (refatiar na 1ª) | não | não | não | recusaria: 2x2 5x5; causal não | não |
| comarka-operacional | 346 | 09/09 | bloqueado→obsoleto | tamanho | opus a3 fez 1803 > 900; 4 testes acoplados fora da allowlist | L:20190; 733306b | 82dca3c Lucas: fatiou em 346a-d | sem dado (dur 2911s) | 3 | não | não | não | não | recusaria: 2x2 5x3; causal não | não |
| comarka-operacional | 346d | 15/09 | bloqueado (atual) | humano | bloqueio manual: decisão de produto (1 conta Meta) | e822399 | nunca | 0 | 0 | não | não | não | não | recusaria: 2x2 5x7 8x1; causal não | não |
| comarka-operacional | 347 | 13/09 | bloqueado→obsoleto | tamanho | juiz reprovou a1/a2; opus a3 fez 1123 > 900 | L:23152; 81cd0ee | 7e72f9e Lucas: fatiou | sem dado (dur 3011s) | 3 | não | não | não | não | recusaria: 2x2 5x5 7x2; causal não | não |
| comarka-operacional | 348 | 13/09 | bloqueado→obsoleto | tamanho | juiz reprovou o rename pela metade; opus a3 fez 966 > 900 | L:23208; 81cd0ee | 7e72f9e Lucas: fatiou | sem dado (dur 1690s) | 3 | não | não | não | não | recusaria: 2x2 5x3; causal não | não |
| comarka-operacional | 353 | 15/09 | bloqueado→(renomeado) | humano | bloqueio manual: decisão "a lista é tela" tornou o ticket aposentado | daa5bc8 | 41697c8 Lucas: reescrito como novo ticket | 0 | 0 | não | não | não | não | recusaria: 2x2 5x5 7x1; causal não | não |
| comarka-operacional | 355 | 09/09 | bloqueado→obsoleto | tamanho | diff 1032 e 929 > 900; API e tela juntas | L:19337-19338; 1976d2a | 149b8f6 Lucas: fatiou em 355a/b | sem dado (dur 2873s) | 3 | mais barato (refatiar na a2) | não | não | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 368 | 13/09 | bloqueado→done | spec_allowlist | allowlist e critérios apontavam `src/app/api/inbox` (inexistente) | L:23275; 22f7cae | a61946f+22f7cae Lucas: código em sessão interativa | sem dado (dur 1090s) | 3 | não | não | sim | não | recusaria: 2x2 5x3; causal não | **sim** (requisito mudou: "produtor desligado" → "exclusão no consumidor") |
| comarka-operacional | 391a | 16/09 | bloqueado→done | spec_criterio | premissa falsa forçava 2º fetch; allowlist mudou no meio da execução | L:28069; runs/391a/attempt-2.prev3/prompt.txt:8; 286b6fe | 286b6fe+3f39778 Lucas | sem dado (dur 3857s) | 7 (2 adiadas) | não | não | sim | não | recusaria: 2x2 5x9 8x2; causal não | não |
| comarka-operacional | 391e | 17/09 | bloqueado→done | spec_allowlist | testes que usam isClienteAtivo fora da allowlist; critério[4] `origin/main...HEAD` impossível | L:28699; 0a94443; 31ab7ad; 3a53eb5 | 0a94443/31ab7ad/3a53eb5 Lucas | sem dado (dur 1019s) | 2 (4 até c7f21f1) | não | não | sim | não | recusaria: 2x2 5x9; causal não | **sim** (crit[4] "=2" → "≤12") |
| comarka-operacional | 392a | 16/09 | bloqueado→done | topologia | padrão de listagem só em main local (32 commits sem push); staging-auto sem ele | L:28159; d45d283 | d45d283 Lucas: push de main + merge em staging-auto | sem dado (dur 1556s) | 3 | não | não | não | não | recusaria: 2x2 5x6; causal não | não |
| comarka-operacional | 393a | 16/09 | bloqueado→done | topologia | mesma base errada: diff de 3069 com arquivos da main | L:28198-28199; d45d283 | d45d283; 5be6748; 1be7117 Lucas | sem dado (dur 289s) | 1 | não | não | não | não | recusaria: 2x2 5x6; causal não | não |
| comarka-operacional | 394a | 16/09 | bloqueado→obsoleto | topologia | base sem o padrão; depois 928 > 900 | L:28257; d45d283 | d45d283; 41697c8 Lucas: fatiou | sem dado (dur 205s) | 2 | não | não | não | não | recusaria: 2x2 5x7; causal não | não |
| comarka-operacional | 402 | 18/09 | bloqueado→done | spec_allowlist | entrada no vercel.json quebra teste fora da allowlist | L:30018; L:30874; 41697c8 | 41697c8 Lucas | sem dado (dur 331s) | 2 (4 até o commit) | não | não | sim | não | recusaria: 2x1 5x4; causal não | não |
| comarka-operacional | 407 | 17/09 | bloqueado→obsoleto | spec_criterio | tarefa exigia as 6 escritas em clientes_receita, que a regra C0 proíbe; 2 critérios impossíveis | L:28791; 74d51f5 | 74d51f5 Lucas: obsoleto por decisão, vira 407a0/a/b | sem dado (dur 389s) | 1 | não | não | não | não | recusaria: 2x1 5x4; causal não | não |
| comarka-operacional | 407a0 | 21/09 | bloqueado→done | spec_criterio | `grep -c … \|\| echo` imprime "0 ARQUIVO_AUSENTE" no caso certo | L:37575; 0ece764 | 0ece764 Lucas | sem dado (dur 73s) | 2 | não | não | sim | não | recusaria: 2x2 3x1 5x11; causal não | leve ("=1" → "≥1") |
| comarka-operacional | 410 | 18/09 | bloqueado→obsoleto | spec_allowlist | controles em 8 abas fora da allowlist; critério inalcançável | L:30340; L:30990; f23d65a | f23d65a Lucas: fatiou | sem dado (dur 927s) | 3 (6 até o commit) | não | não | não | não | recusaria: 2x1 5x3; causal não | não |
| comarka-operacional | 440 | 21/09 | bloqueado→done | ambiente | `_worktrees/orq-440` era worktree vivo do actus-saas (mesmo prefixo) | L:32318-32322; e0973b0 | 50c6b02 Lucas: prefixo por repo | sem dado (dur 0s) | 19 (19 vazias) | sim (prefixo de worktree por repo, decisao.ts:600-621; sem-progresso pararia em 3) | não | não | não | recusaria: 2x2 5x4; causal não | não |
| comarka-operacional | 475c | 22/09 | bloqueado→done | spec_criterio | critério pedia reportar env/URL na mensagem de commit, que o juiz não vê | L:41867; 15d1e5a | 15d1e5a Lucas | sem dado (dur 1447s) | 3 | não | não | sim | não | recusaria: 2x2 5x5 7x1 8x1; causal não | não |
| comarka-operacional | 486 | 21/09 | bloqueado→done | spec_criterio | `grep -cE … \|\| echo 0` imprimia "0 0" no caso correto | L:37318; 0ece764 | 0ece764 Lucas | sem dado (dur 868s) | 4 | não | não | sim | não | recusaria: 2x2 5x6; causal não | leve ("=1" → "≥1") |
| comarka-operacional | 490 | 21/09 | bloqueado→done | spec_allowlist | geral-tab.tsx fora da allowlist; o agente usou createPortal | L:37434; 5af948f | 5af948f Lucas | sem dado (dur 1278s) | 3 | não | não | sim | não | recusaria: 2x2 5x5 8x3; causal não | não |
| comarka-operacional | 514 | 22/09 | bloqueado→done | spec_criterio | o awk do critério parava em `/^}/` antes do corpo | L:40458; 4668674 | 4668674 Lucas: `/^}$/` | sem dado (dur 251s) | 2 | não | não | sim | não | recusaria: 2x2 5x8 8x4; causal não | não |
| comarka-operacional | 522 | 22/09 | bloqueado→done | spec_criterio | aceite exigia "Timeline", o 515 entregou "Linha do tempo" | L:41210; PLAYBOOK.md:966; fb0ef60 | fb0ef60/d7441c2/ec421bc Lucas | sem dado (dur 1432s) | 3 | não | não | sim | não | recusaria: 2x2 5x16 6x2 6x7; causal não | **sim** (Timeline → Linha do tempo; "sem base" deixou de ser exigido) |
| comarka-operacional | 523b | 22/09 | bloqueado→done | spec_criterio | critério proibia NEXT_PUBLIC_ no arquivo inteiro, mas NEXT_PUBLIC_SUPABASE_URL já existia; a3 driblou com join | L:40866; PLAYBOOK.md:944; 1334d5d | 1334d5d Lucas: exceção medida + ANTI-FUGA | sem dado (dur 1245s) | 3 | não | não | sim | não | recusaria: 2x2 5x5; causal não | **sim** (exceção medida) |
| comarka-operacional | 528 | 22/09 | bloqueado→done | spec_allowlist | o teste do 514, fora da allowlist, proíbe o que o item (3) exige | L:41257; 60662ec | 60662ec Lucas | sem dado (dur 1286s) | 2 | não | não | sim | não | recusaria: 2x2 5x6 8x16; causal não | não |
| comarka-operacional | 533 | 23/09 | bloqueado→done | tamanho | diff 1000 e 925 > 900 | L:46089; 54a2ad4 | 54a2ad4 Lucas: fatiou | sem dado (dur 348s) | 3 | mais barato (refatiar na a1) | não | não | não | recusaria: 2x2 5x10; causal não | não |
| comarka-operacional | 538 | 24/09 | bloqueado→done | spec_allowlist | rota pública relatorio-cliente/[token] fora da allowlist | L:46627; 7f10beb | 7f10beb Lucas | sem dado (dur 719s) | 3 | não | não | sim | não | recusaria: 2x2 5x5; causal não | não |

**Reclassificação que fiz sobre o relatório de um agente:** 431, 461 e 481 do Actus vieram como `humano`/`dependencia` pelo bloqueio de nascimento. A trilha mostra que, depois de liberados, eles bloquearam de novo por critério que lia texto do vitest/build ou usava `| grep -q`:
- 481: `events.log:222-235, 453-467, 584-598`
- 461: `:436-449, 566-579`
- 431: `:789-802, 941-953`

Foi aí que saíram US$ 28,44, US$ 8,86 e US$ 11,54. A classe ficou `spec_criterio`, com o nascimento anotado na causa.

## 3. Agregado

**Legenda:**
- `a=S`: o motor atual evita.
- `a=S|B`: evita ou bloqueia mais barato.
- `b=S`: peça prevista evita.
- `b=S|P`: inclui parcial.
- `c=S`: reescritor resolve sem afrouxar.
- `d=S`: PORTE-PENDENTE evita.
- `só humano`: nem (a), nem (b), nem (c), nem (d) resolve sozinho. Os 12 tickets de harness do Actus (“é a própria peça”) contam aqui.
- `US$`: soma do que tem dado.
- `sd`: tickets sem dado de custo.
- `e rec.`: quantos o gate recusaria.

### Por classe

| classe | n | US$ | sd | a=S | a=S\|B | b=S | b=S\|P | c=S | d=S | d=S\|B | só humano | e rec. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| spec_criterio | 29 | 72,34 | 21 | 7% | 38% | 28% | 34% | **93%** | 0% | 10% | 3% | 24 |
| spec_allowlist | 28 | 41,53 | 23 | 0% | 18% | 0% | 0% | **79%** | 0% | 4% | 21% | 24 |
| motor | 32 | 18,27 | 21 | 38% | 47% | 3% | 28% | 50% | 16% | 16% | 9% | 23 |
| ambiente | 9 | 11,07 | 6 | 44% | 78% | 0% | 0% | 11% | 0% | 44% | 44% | 6 |
| topologia | 14 | 3,44 | 13 | 7% | 36% | 29% | 29% | 29% | 7% | 14% | 57% | 13 |
| dependencia | 10 | 1,81 | 1 | 0% | 10% | 0% | 0% | 0% | 0% | 10% | 100% | 4 |
| humano | 24 | 0,00 | 4 | 0% | 4% | 0% | 0% | 0% | 0% | 0% | 100% | 5 |
| tamanho | 15 | 0,00 | 15 | 0% | 67% | 0% | 13% | 0% | 0% | 7% | 100% | 15 |
| merito | 3 | 0,00 | 3 | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 100% | 3 |
| indeterminado | 1 | 0,00 | 1 | 0% | 0% | 0% | 0% | 0% | 0% | 0% | 100% | 1 |

### Por repo

| repo | n | US$ | sd | a=S | a=S\|B | b=S | b=S\|P | c=S | d=S | d=S\|B | só humano | e rec. |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| conteudos-infinitos | 26 | 34,17 | 17 | 31% | 77% | 27% | 27% | 38% | 0% | 4% | 27% | 21 |
| actus-saas | 59 | 114,29 | 11 | 5% | 25% | 10% | 10% | 31% | 10% | 22% | 64% | 17 |
| comarka-operacional | 80 | sem dado | 80 | 10% | 25% | 0% | 15% | 53% | 0% | 4% | 38% | 80 |
| **total** | **165** | **148,46** | **108** | **12%** | **33%** | **8%** | **15%** | **42%** | **4%** | **10%** | **45%** | **118** |

### Classe por repo (contagem)

| classe | CI | Actus | Comarka |
|---|---|---|---|
| motor | 13 | 8 | 11 |
| spec_criterio | 3 | 8 | 18 |
| spec_allowlist | 3 | 4 | 21 |
| humano | 1 | 21 | 2 |
| tamanho | 0 | 0 | 15 |
| topologia | 4 | 6 | 4 |
| dependencia | 0 | 9 | 1 |
| ambiente | 2 | 2 | 5 |
| merito | 0 | 1 | 2 |
| indeterminado | 0 | 0 | 1 |

### O mesmo agregado, pesado por custo (57 tickets com dado, US$ 148,46)

| Resposta | Tickets | US$ |
|---|---|---|
| (a) motor atual evita | 19 | 1,57 |
| (a) motor atual bloqueia mais barato | 36 | 119,92 |
| (b) peça prevista evita | 13 | 61,59 (quase tudo 7d e 1b) |
| **(c) reescritor resolveria sem afrouxar** | **70** | **128,25 (86%)** |
| (d) PORTE-PENDENTE evita | 6 | 17,50 |
| (d) PORTE-PENDENTE bloqueia mais barato | 11 | 66,27 |
| só humano | 75 | 11,35 |

### (e), separado: o gate-ticket no loop

| | Bloqueados | Controle (done nunca bloqueados, mesma medição) |
|---|---|---|
| CI | 21/26 recusados | 12/15 |
| Actus | 17/59 | 11/24 |
| Comarka | 80/80 | 142/142 |
| **Total** | **118/165 (72%)** | **165/181 (91%)** |

- O gate recusa **mais** os que passaram limpo do que os que bloquearam. Quase toda recusa é do check 2 (`risco` ausente) e do check 5 (`tipo` do critério vazio), ou seja, é o schema antigo.
- **Causal: 0 de 165. Custo evitado pelo (e): US$ 0.**
- Os checks 6 e 8 aparecem em 17 e 22 tickets, mas em nenhum a violação apontada é a que bloqueou.
  - Exemplo: o 242 é recusado pelo `$(` do critério que falhou, e a reescrita que o destravou manteve o `$(`.
- Ligar a 1c hoje pararia a fila por formato, não por qualidade de spec. Antes, os tickets vivos precisariam migrar para o schema v2.

### Leitura para a decisão

1. **Reescritor de spec: é o candidato mais forte.**
   - `spec_criterio` + `spec_allowlist` = 57 de 165 tickets (35%) e US$ 113,87 de US$ 148,46 medidos (77%).
   - Nessas duas classes, (c) = sim em 50 de 57.
   - A maior parte dos padrões se repete: `grep -c … || echo 0`, `main...HEAD` sobre staging-auto, texto do vitest em vez de rc, `| grep -q`, teste acoplado fora da allowlist, allowlist com diretório (`dir/`), recon medido só num subdiretório.
   - Há duas condições para ele se pagar:
     - **ter trava contra afrouxar**: em 12 dos 70 casos (c)=sim, o humano de fato destravou afrouxando (§4);
     - **não poder fatiar**: `tamanho` (15, todos no Comarka) fica fora do escopo "só o próprio arquivo".
2. **Triador: se paga como diagnóstico, não como ação.**
   - O motor atual, com o que já está na main, evita só 12% dos casos e deixa 33% mais baratos. Ele já corta repetição e não escala por critério.
   - O problema é outro: **quem** decide o remédio. Hoje o humano relê notas, gates.txt e trilha para cada caso.
   - 45% são "só humano" (decisão, token, fatiar, base/branch): o triador não resolve esses, mas os roteia.
   - Com o dado que o motor já grava, os agentes classificaram 164 de 165 sem rerodar nada. O único indeterminado (Comarka 214) é o critério que mandava a saída para `/dev/null`.
   - Então o dado **quase** basta. O que falta está no §5.
3. **Peças previstas com retorno medido:**
   - **7d** (saída textual do vitest, `grep -q`): 431, 461, 470, 480, 481 e 016, somando US$ 61+;
   - **1b** (guarda que já falha contra HEAD): 003, 009, 011, 013, 014, 242, 430, 480;
   - **1c no formato atual: nenhum retorno.**
4. **Defeito vivo no motor da main** (achado nesta sessão). A regra de AMBIENTE (7a-8) não dispara quando a causa contém `\n`, e a recusa de preflight por árvore suja sempre contém. Foi o que bloqueou 269 e 270 no CI (detalhe no §6).

## 4. Casos em que destravar exigiu afrouxar o critério

Oito afrouxamentos claros e sete leves ou limítrofes. Todos são commits de Lucas.

**Claros:**

| Ticket | Commit | Antes | Depois |
|---|---|---|---|
| actus-saas 212 | `b394782` | `grep -A3 'export function avaliarAlarmes' … \| grep -c MonitorWhatsappEstado`, espera `[1-9]` (o tipo na assinatura), e `grep -c 'export function alarmesMonitorWhatsapp'`, espera `1` | `grep -q MonitorWhatsappEstado alarmes.ts && echo ok` (em qualquer lugar do arquivo) e presença em vez de exatamente 1 |
| actus-saas 490 | `3ce9589` | "índice de busca acento-insensível" (`grep unaccent`) | "índice sobre lower(nome)" + guarda "nenhum unaccent"; o acento saiu do índice e foi para a consulta do 491a |
| comarka 001 | `baa3347` | "page.tsx virou shell enxuto" com espera `< 400` | `< 900` ("o run real aprovado landou 867 linhas"); fechado por merge manual `e3bcb42` |
| comarka 103a | `93caf5f` | juiz reprovou 3× por "Mudança 1 não entregue" | done à mão, mudança 1 dispensada como "sem objeto" (`churn/page.tsx:631` já tinha a linha); o juiz não aprovou |
| comarka 368 | `22f7cae` | "produtor desligado" (`grep skipped\|desativado`) | "lead_atribuido presente e sem flag skipped": contenção no consumidor, porque o trigger é C0; código feito em sessão interativa (`a61946f`) |
| comarka 391e | `3a53eb5` | crit[4] `git diff --name-only origin/main...HEAD \| grep -c '^src/'` = 2 (impossível: dava 57) | "≤12 arquivos de src com pagou_integral" (mais fraco) |
| comarka 522 | `fb0ef60`, `ec421bc` | exigia `>Timeline</h3>` e proibia "Linha do tempo"; chip NPS exigia "sem base"; renovação exigia "Renovação" + "sem base" | exige "Linha do tempo"; NPS aceita "NPS", "NPS <nota>" ou "NPS · sem base"; renovação aceita badge com dado OU "sem base" (o próprio ticket dizia "nunca afrouxamento do aceite") |
| comarka 523b | `1334d5d` | nenhum `NEXT_PUBLIC_` no arquivo | exceção para `NEXT_PUBLIC_SUPABASE_URL` com teto =1 + guarda ANTI-FUGA nova (a a3 tinha driblado montando o nome com join) |

**Leves ou limítrofes:**

| Ticket | Commit | O que mudou |
|---|---|---|
| conteudos-infinitos 002 | `7ef2149` | critério 8 passou a excluir `*.sql` da varredura (`':(exclude)*.sql'`). A prova "nenhum executável aplica SQL" se mantém. |
| actus-saas 460 | `2c21ba8` | `grep -qi motivo '…/[id]/route.ts'` → `grep -rqi motivo …/sugestoes/`; depois removido em `bd6ce4c` por critério mais rígido |
| actus-saas 480 | `7509d3c` | guarda `main...HEAD` → `HEAD~1...HEAD` (só o último commit); corrigido para `$BASE_REF` em `1e3065e`, mas o 480 foi fechado por cherry-pick sem rerodar critérios (`ecf6f4e`) |
| actus-saas 491a | `f9f14ad` | removidos "Suite verde" e "build passa", que duplicavam gates (formal: o gate continua cobrindo) |
| comarka 032 | `3871568` | crit[2] restrito ao `.select()` (correção da contradição com o crit[4], com anti-ofuscação); critério tsc do ticket removido, gate tsc global mantido |
| comarka 407a0 | `0ece764` | [1] e [2] `=1` → `≥1` contando só linhas de código |
| comarka 486 | `0ece764` | [4] `=1` → `≥1`; o [6] ficou mais forte |

**Parecem afrouxamento e não são:**
- **Allowlist ampliada com guarda anti-afrouxamento:** CI 201 e 231; Actus 626 e 631; Comarka 152, 161, 294, 317, 328, 330, 402, 490, 528 e 538.
- **Critérios endurecidos:** CI 004 e 242; Actus 488b, 499, 505b, 513 e 900; Comarka 037 e 331.
- **Correção de base** (`main` → `$BASE_REF`): CI 011, 013 e 014.
- **Reescopo por decisão:** Actus 526; Comarka 325a; CI 230.

## 5. Onde um triador entraria no motor do kit

**Pontos em que o ticket vira `bloqueado` ou `refatiar`** (main `596ca4c`):

| # | Onde | Gatilho | Grava na hora |
|---|---|---|---|
| 1 | `executor.sh:1111-1113`, que chama `marca_refatiar` (`:923-941`) | `decidirDesfecho` (`decisao.ts:345-367`): diff_cap ou enforcement | status, `notas_status` com arquivos (`:929`), commit, `REFATIAR motivo= arquivos=` (`:931`), linha em decisoes-pendentes (`lib.sh:1012`) se `origem: humano` |
| 2 | `executor.sh:1119-1128` | corte de repetição (`decisao.ts:536`): mesmo sub + mesmo diff | `REPROVADO sub= diff=`, status, nota, `BLOQUEADO motivo=repeticao sub= diff=` |
| 3 | `executor.sh:1132-1139` | `decidirRetry` (`decisao.ts:425-440`): max_retries ou causa sem regra | nota com motivo + plano, `BLOQUEADO motivo=<tok>` |
| 4 | `local-loop.sh:483-486` | `merge_em_alvo` falhou (`:94-101`) | nota fixa "merge falhou", `BLOQUEADO motivo=merge_falhou` |
| 5 | `local-loop.sh:596-599` | `.sem-progresso` no limite | nota com a última causa, `BLOQUEADO motivo=sem_progresso n= limite=` |
| 6 | `local-loop.sh:612-614` | `.adiamentos` no limite | nota "adiado N vezes: <causa real>", `BLOQUEADO motivo=adiamentos` |
| 7 | fora do motor | humano escreve `bloqueado` à mão (44 dos 165 nasceram bloqueados: 30 Actus, 13 Comarka, 1 CI) | só o commit |

**O que já fica gravado em toda tentativa**, em `runs/<id>/attempt-N/`:
- arquivos: `prompt.txt`, `claude.txt` (envelope, com `total_cost_usd`), `diff.patch`, `enforcement.json`, `gates.txt`, `criterios.txt` (cmd, espera e saída de cada critério), `veredito.json` (desfecho, causa, motivo, sub), `juiz.prompt.txt`, `juiz.raw.json`, `juiz.veredito.json`;
- `meta.json` (`grava_meta`, `executor.sh:962`);
- `custo.json`;
- na trilha: `GATE` (com `criterios=n/N` e `fora_do_pathspec=`), `REPROVADO sub= diff=`, `RETRY`, `JUIZ`.

**O que faltaria gravar para diagnosticar sem rerodar** (cada item é um caso desta amostra que precisou de inferência):
1. **O rc de cada critério.**
   - Onde: `run_criterios`, `executor.sh:441`, roda `eval "$cmd" … || true` e guarda só a saída.
   - Por que falta: sem o rc não se separa "o cmd não roda" (126/127, SIGPIPE do `| grep -q`) de "reprovou". Casos: Actus 431 e 491a, Comarka 214. O Actus já faz isso no `8eec421`.
2. **O `sinal` que entra no `decisao desfecho`.**
   - Onde: `executor.sh:876-888`, o JSON com exitCode, gatesRc, papel falho, criteriosFalhos, juizReprovou e duração.
   - Por que falta: hoje só o `veredito.json` fica, e o triador precisa da entrada, não só da saída.
3. **A base e a versão do ticket no `INICIO`.**
   - Onde: `base` existe em `executor.sh:784`, mas só vai para a trilha no `WORKTREE` de reaproveitamento.
   - O que gravar: `base=<sha>`, `alvo=<branch>` e o blob do arquivo do ticket.
   - Por que falta: todo caso de `topologia` (14) exigiu reconstruir qual base a worktree tinha.
4. **A saída do `git merge` que falhou.**
   - Onde: `local-loop.sh:94` manda para `/dev/null`.
   - O que gravar: os arquivos em conflito.
5. **Os testes que falharam, por arquivo, cruzados com a allowlist.**
   - Por que falta: é o que separa `spec_allowlist` (teste acoplado fora da allowlist: CI 230 e 231; Comarka 317, 328, 330 e 528) de base vermelha (CI 235, Actus 510c, Comarka 205). Hoje isso está só na prosa do `gates.txt`.
   - O Actus já faz isso no `284a147` (`arquivosFalhosDoVitest`).
6. **Os arquivos não rastreados antes do `add -A`.**
   - Por que falta: sem essa lista, o refatiar por arquivo solto (Actus 505b e 513) parece violação de escopo. O `cleanup_worktree` apaga a worktree.
   - O Actus já faz isso no `0c093de`.
7. **O diagnóstico estruturado da última tentativa.**
   - Onde: `diagnostico_retry` (`executor.sh:946`) só roda quando há retry. No bloqueio, o diagnóstico que existe é o da tentativa anterior, e só dentro do `prompt.txt` seguinte.
8. **O veredito do gate de ticket (1c) e da execução de alvo/guarda (1b).** Hoje nunca rodam.
9. **A versão do motor e do config por tentativa** (`VERSAO`, hash do config).
   - Por que falta: Actus 900 e Comarka 031, 037 e 271 foram causados por config ou motor diferente do esperado.

**Onde encaixar o triador com menos cirurgia:** um passo **único** no fim do `drenar`, antes do `DRENAGEM_FIM` (`local-loop.sh:642`).
- Ele lê da trilha os `BLOQUEADO`/`REFATIAR` desta drenagem.
- Para cada um, lê `runs/<id>/attempt-*/` e grava `runs/<id>/triagem.json`, mais um evento `TRIAGEM classe=<…> acao=<…>`.
- Gravar em `runs/` não suja `docs/fila`.
- Pega os pontos 1 a 6 sem tocar o `executor.sh`.
- O ponto 7 (bloqueio manual) só é visível se o triador também rodar sobre `bloqueado` sem `BLOQUEADO` na trilha. É a mesma régua que o painel já usa para a categoria "decisão sua".

**A K12 já tem onde exibir um diagnóstico? Parcialmente.**
- Onde cabe: a tabela de bloqueados (`orq-painel.py:629-645`, o dict `bl`) tem a linha que abre no clique, com o `<pre>` do `motivo_inteiro` (`:1281`). Um campo `triagem` no `bl`, lido de `runs/<id>/triagem.json`, caberia ali.
- A categoria (`categoria_bloqueio`, `:521`) já sai de `motivo=`/`sub=` da trilha e poderia ser trocada pela classe do triador.
- **Lacuna:** o painel só lista `status == "bloqueado"` (`:611`). **`refatiar` não aparece em lugar nenhum da K12** (`grep refatiar orq-painel.py` = 0). Nenhum refatiar desta amostra teria aparecido no painel.

## 6. Lacunas

- **Defeito vivo no motor, confirmado sem tocar repo** (CI 269 e 270).
  - Em `local-loop.sh:541`, `awk -F'\t' -v c="$norm"` interpreta escapes: o `\n` literal da causa normalizada vira quebra de linha real, e `$2 == c` nunca casa.
  - Prova isolada: com `norm='antes:\n M <caminho>'`, `-v c=` não casa e `ENVIRON["C"]` casa.
  - Toda recusa de preflight por árvore suja traz `\n` (`events.log:1462-1478` do CI). Por isso 269 e 270 somaram 4 adiamentos cada e foram bloqueados (`:1479-1480`) em vez de gerar um `AMBIENTE`.
  - Não corrigi: sessão sem código.
- **Custo.** 108 dos 165 tickets não têm custo: o Comarka inteiro, o CI antes de 03/09 e o Actus antes de 11/09. O "86% do custo resolvível pelo reescritor" vale para US$ 148,46 medidos em 57 tickets, não para a frota.
  - No CI, o custo é o do agente, até a data do bloqueio.
  - No Actus, é o `total_cost_usd` das tentativas até a hora do bloqueio.
  - Os dois métodos diferem quando houve rodada no mesmo dia depois do bloqueio (Actus 460, 488, 496, 499c).
- **(a), (b), (c) e (d) são inferência a partir do código e da evidência. Nada foi executado.**
  - Em especial, (c) é juízo de cada agente sobre se o reescritor saberia o conserto. Os padrões são repetitivos, mas não houve teste.
  - (e) é o único item medido.
- **Minha medição do (e) teve um defeito, corrigido dentro da sessão.**
  - O script forçava `status: pendente` com `String.replace`, que interpreta `$'`/`$&` no cmd dos critérios e corrompeu o JSON de 13 tickets do Actus, gerando um falso "check 1".
  - Corrigido (substituição por função) e rodado de novo nos 165 e no controle. A coluna (e) acima é da segunda rodada.
  - Os lotes que os agentes receberam ainda traziam o valor antigo. O agente do lote C apontou o artefato, e ninguém classificou por ele.
- **Indeterminado: 1** (Comarka 214). O critério que reprovou era `bash test-sync-main.sh >/dev/null; echo $?`. Sem a saída, não dá para separar mérito de ambiente sem rodar o script.
- **Classes com julgamento** (a alternativa entre parênteses):
  - CI 241 e 243 como `motor` (spec: o ticket não avisava da regra de credencial);
  - CI 001 e 002: causa múltipla, ficou a que o commit de destrave nomeia;
  - Actus 513 (mérito parcial);
  - Actus 900 (o 2º bloqueio é base);
  - Actus 514 e 622-632 como `humano` (o defeito de fundo é do motor, mas a zona proibida exige mão);
  - Actus 518-521 como `dependencia` (a raiz é a decisão do 517);
  - Comarka, grupo "000" (027, 029, 030, 038, 040, 046, 047, 049) como `motor` (ambiente);
  - Comarka 037, 065, 184, 277, 317, 391a e 407.
- **Evidência sobrescrita.**
  - CI 001a, 002, 009, 010 e 016: attempts antigos sobrescritos pelas rodadas seguintes. A causa vem das notas dos commits de requeue e das mensagens de `ccf5d3d` e `f039a03`.
  - Actus 321: tentativas 1 e 2 sobrescritas.
  - Comarka 001: sem meta.json.
- **Bloqueios não commitados.**
  - Comarka 258, 273, 328, 330 e 342: houve bloqueios em runtime antes do commit que a tabela usa como 1º bloqueio.
  - Actus 443-447: um bloqueio em `launchd.log:2113-2120` nunca foi commitado.
  - A contagem de transições do §1 vem do git, então subconta esses casos.
- **Recorte do Comarka.** Transições desde 26/07. Tickets bloqueados antes disso e nunca mais tocados não entram. A contagem de obsoletos fora da tabela (23) é do status atual, sem recorte de data.
- **Arquivos de trabalho fora do escopo de escrita.** Para medir o (e) e montar os lotes, gravei TSVs e cópias de `docs/fila` (via `git archive`) no scratchpad da sessão, em `/private/tmp/claude-501/…/scratchpad/`. Nenhum repo foi escrito.
