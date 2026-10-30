# C5 retrabalho: relatório

Sessão de 24/10/2026. Estado: **P1 a P5 entregues, parado.** O PASSO 0 vem logo abaixo, sem alteração. As peças começam em "Depois do ok" (fim do arquivo).

Resumo em quatro linhas:
- **C5 oficial: 8,0%.** São 18 de 225 tickets do loop com retrabalho forte na coorte madura de 26/09 a 09/10 (`medir.sh 14 --ate 2026-10-23`). Todos são plataforma; o apolo não tinha done nessa coorte.
- **04 a 17/10, parcial:** 5,0% (28 de 558), com acompanhamento entre 6 e 14 dias (mediana 10).
- **Todo o forte é `fix_na_linha`.** saiu_de_done, revert e ticket_conserto deram 0 nas três janelas.
- **C2 inflado:** 7 dos 156 aprovados de primeira da coorte oficial tiveram conserto forte. Na leitura da P4, 10 dos 33 tickets com forte (cerca de 30%) parecem mudança de requisito ou falso positivo, e não defeito.

No PASSO 0 não escrevi nada além deste relatório. Os scripts de levantamento rodaram do scratchpad e foram copiados para `levantamento-2410/`. Usaram só `git log`, `show`, `cat-file` e `diff`, sempre com `GIT_OPTIONAL_LOCKS=0`.

## Conferência dos SHAs do pedido

| Item | Pedido | Encontrado (`git rev-parse` em 24/10) |
|---|---|---|
| Kit main | a001fde | a001fde93108 ✔ |
| Kit porte do Actus | 9365f5e | existe, é ancestral da main ("porte-actus m: CHANGELOG do porte…") ✔ |
| Comarka main | c16e2b8 | **main = b4c0ca0** (24/10 15:31). c16e2b8 é ancestral, 4 commits atrás. `git diff --stat c16e2b8 main -- scripts/orquestrador` vem vazio, então todo arquivo:linha do motor abaixo vale para os dois. |
| Comarka staging | — | a branch se chama `staging-auto` (1c9cd9c). O loop apolo usa `staging-apolo`. |
| Pasta da medição | — | **não é repositório git** (`fatal: not a git repository`). Cópia de segurança: medir.sh.bak-2410. Nas peças entrego `diff -u` contra ela. |

Os arquivo:linha do motor citam a main de cada repo (Comarka b4c0ca0, kit a001fde). medir.sh é o da pasta.

## PASSO 0: tabela

| # | Pergunta | Resposta | arquivo:linha |
|---|---|---|---|
| 1a | Como medir.sh identifica o ticket | **Não lê trailer nem branch de commit.** O ticket vem de três fontes: (1) nome da pasta `docs/fila/runs/<id>[.sufixo]/meta.json`; (2) linhas do `local-loop.log` (`ticket X: … BLOQUEADO`, `drenagem: ticket X`); (3) caminho `docs/fila/(_hold/\|_to_delete/)?<id>-*.md` nos commits, com o bloco ```json do ticket lido por `cat-file`. Os commits do agente são marcados em bloco (lado `frente/<id>` de cada merge "orquestrador: merge frente/…"), mas sem guardar o id por commit. O log só pede os trailers Co-Authored-By e Orq-Resolvedor. | medir.sh:65-93, 96-145, 177-181, 199-207, 210, 297-311 |
| 1b | Status e transições | Status = campo `status` do bloco json no .md, antes e depois de cada commit. `done_git` = primeiro commit em que vira done. Tipo da mudança: allowlist > criterio > dependencia > **reabertura (qualquer status → `pendente`)** > outro. | medir.sh:255-262, 308-311 |
| 1c | De onde vêm C1, C2, C3 | **C1** = maior sequência de dias sem intervenção (commits classificados `intervencao`/`intervencao_embutida` + pausas manual e gate_streak). **C2** = done na janela com meta.json de uma linha só e resultado done, sobre done com meta. **C3** = sequência de dias sem lição nova no PLAYBOOK §7. | C1 427-453, 670-674, 681-684 · C2 488-489, 648-651, 685-688 · C3 563-626, 675-676, 689-691 |
| 1d | Suíte de teste do medir.sh? | **Não existe.** A pasta só tem medir.sh, classes-medicao.tsv, out/ e tmp/ (`agrega.py` e `contrafactual.py` em tmp/ são avulsos e nada os chama). A P1 cria a suíte. | — |
| 2a | Como um done se liga aos commits | **O Comarka não tem trailer `Orq-Ticket` nem `Orq-Loop`.** Trailers desde 01/08 em todas as branches: Co-Authored-By 2614, Claude-Session 73, Orq-Resolvedor 12, e nada mais. A ligação é o **assunto do merge** `orquestrador: merge frente/<id> (ticket <id>) em staging-auto\|staging-apolo`, gravado pelo avaliador. Os commits do ticket são `p1..p2` desse merge. A main avança por fast-forward até a staging-auto: o first-parent da main na janela tem 420 desses merges e nenhum merge de promoção próprio. | avaliador.sh:53 · lib.sh:357 |
| 2b | Done sem ligação na janela | Dos 561 done da medição, 558 têm merge do loop: é o mesmo denominador do C2. Os 558 merges da janela **já estão todos na main** (`merge-base --is-ancestor`: 0 fora). **3 done sem merge**, todos fechados à mão: 1082b (870d18d, 16/10), 1116 (e89de95, 16/10), 751 (5a6bc98, 05/10). São os `done_sem_meta: 3` do resumo. Proposta: ficam fora do universo do C5, porque o loop não os aprovou. | out/14d/tickets.csv; resumo.json C2 |
| 2c | Dois loops | 136 dos 561 done são do **apolo** (ids 5xxx, fila `docs/fila/apolo`, alvo `staging-apolo`). Os runs ficam em `docs/fila/runs/` também, por isso medir.sh já os conta no C2. | lib.sh:40-45, 64 |
| 3a | Onde fica a trilha de reabertura | No git, a troca de `status` no bloco json do .md. Em disco, `runs/<id>.pre-requeue-*` (3 pastas, a última 856, 06/10) e `runs/_arquivo/<id>-spec-v1`. meta.json só acrescenta linhas e não registra reabertura. | medir.sh:261 · lib.sh:150 |
| 3b | Os 4 resgates de reabertura | **Nenhum é done reaberto: os quatro são `bloqueado → pendente`**: 867 (ee9efbee9, 07/10, autoriza contagens e reabre), 898 (b7858391f, 08/10, libera DDL e reabre após suíte vermelha corrigida), 318c (bc492863f, 12/10, `nichos-teses-aba.tsx` entra na allowlist depois de 6 reprovas do juiz), 1034 (d23ee91ff, 13/10, gate vermelho de auditoria-ddl da staging). Os commits de curadoria do mesmo tipo (854, 1056b, 1171, 1138, 5159) também vêm de bloqueado ou em_execucao. | `git show <sha>^:<md>` vs `<sha>:<md>`; intervencoes.csv linhas 62, 86, 147, 190 |
| 3c | done → outro em toda a história | Varredura de todos os .md em todas as branches: **3 transições na história inteira, nenhuma na janela**: 5241 e 5242 (75963952b, 18/10, colisão de id, "done sem rodar") e 5243 (db1bc0daa, 19/10, "volta ao loop, opção B"). **No Comarka, conserto de done não reabre o ticket: vira commit humano ou ticket novo.** Também não há linha de meta.json depois do done em até 14 dias para nenhum dos 561. | done_sai.out |
| 4 | git revert na janela | **Zero.** Os últimos são 812f085 (21/09, reverte liberação do 481b) e 66b120a (16/09, reverte liberação do ddl-400), ambos de arquivo da fila e não de código de ticket. Os outros acertos de "revert" na busca são palavras do domínio ("reverte churn"). | levanta.out § reverts |
| 5 | Commits fora do loop que tocam arquivo de ticket done nos 14 dias anteriores | Fora do loop = não está no lado frente de merge do loop, sem trailer Orq-Resolvedor, assunto que não é "fila: status automatico do loop". Arquivos de docs/fila excluídos. **301 commits fora do loop na janela; 55 tocam arquivo de ticket done nos 14 dias anteriores; 27 desses têm fix/corrige/conserta/bug na mensagem.** Sem os 20 arquivos quentes: 49 (26 com fix). Exemplos: **a2cd69ec8** (08/10, "fix(pos-release-0810): chip Saúde da ficha e Início lento" → 694, 699, 705, 711a); **80a212fdb** (08/10, "fix(pos-release-0810): paginação…" → 741, 741a, 861); **10c88edb9** (12/10, "fix: revisao pos-release 12/10…" → 318b, 898c, 938, 953, 974, 983); **9a81d7081** (08/10, "fix(ghl-backfill): backfill resumível…" → 744, 761, 762, 763); **5912a0dfd** (15/10, "fix(ficha): status do Grupo WhatsApp vem do vínculo…" → 924c). | levanta.out § item 5; linhas.out |
| 6a | O que entra no prompt do juiz | **Comarka (avaliador.sh):** objetivo; critérios qualitativos (`espera=="avaliador"`); bloco de allowlist ampliada (se houver); `criterios.txt` (saída mecânica dos critérios, até 400 linhas); aviso de instáveis; diff.stat completo; diff.raw até `diff_cap_linhas` (padrão 2500). Não entram o ticket inteiro, a saída dos gates verdes (só a frase "todos verdes"), a allowlist nem os critérios mecânicos como lista. **Kit (juiz.ts):** cabeçalho de independência, cobranças 1-3, anti-afrouxamento (se a allowlist tem teste), testes ampliados, formato, id, objetivo, allowlist, todos os critérios (mecânicos com cmd/espera), nota do harness (commit dado pelo harness), `contexto_juiz`, definições chamadas pelos testes novos, gates.txt, diff cru sem teto no juiz (o cap é mecânico, antes). **Nos dois:** o juiz roda `claude -p` com cwd num checkout, sem restringir fontes de configuração. Por padrão o Claude Code carrega o CLAUDE.md e `.claude/` desse diretório. No Comarka o cwd é o worktree `orq-runner` (código da main); **no kit é a worktree do ticket, ou seja, o CLAUDE.md da branch do agente.** Isso não está confirmado nos crus (confirmar exige chamar o claude). | Comarka avaliador.sh:77-129, 140-144 · lib.sh:16, 652 · local-loop.sh:97 · Kit juiz.ts:131-187, 458-499 · executor.sh:822-832, 842-844 · lib.sh:1517 |
| 6b | O juiz recebe texto do executor sobre o próprio trabalho? | **Direto, não, nos dois.** O kit diz isso no próprio prompt (juiz.ts:13-15, 131-134). O Comarka não passa `claude-output.txt` nem o prompt do executor. **Indireto, sim, nos dois:** o diff cru leva comentário de código, doc e linha de PLAYBOOK escritos pelo agente. O template do Comarka manda o executor registrar "Lição aprendida → linha no PLAYBOOK no MESMO commit". O Comarka ainda dá `Read` ao juiz (cwd orq-runner, onde `docs/fila/runs/` não existe porque é ignorado pelo git). Não testei leitura fora do cwd. No kit, o CLAUDE.md da worktree do ticket (6a) entraria como instrução se o agente o editasse. | avaliador.sh:141 · _TEMPLATE.md "Contrato inviolável" · `git check-ignore docs/fila/runs` |
| 6c | Onde fica o motivo de cada reprova | **Comarka:** `runs/<id>/attempt-N/verdict.json` = `{aprovado, motivo}` (motivo até 300 caracteres pedido no prompt), preservado nas tentativas sobrescritas como `attempt-N.prevK/`. Também vai para `notas_status` do ticket ("reprovado (tentativa N): motivo", só o último) e para a linha `avaliador: REPROVADO — …` do local-loop.log. O meta.json grava `resultado` sem motivo. O motivo volta ao próximo prompt do executor como "REPROVAÇÃO ANTERIOR". **Kit:** `runs/<id>/attempt-N/juiz.veredito.json` = `{aprovado, motivo, criterios_falhos[]}`, cru em `juiz.raw.json`, prompt em `juiz.prompt.txt`. O events.log leva só `JUIZ veredito=… classe= modelo= attempt=`, sem motivo. O motivo segue literal para o retry via `diagnostico_retry`. | avaliador.sh:38-47 · executor.sh (Comarka):125-128, 787 · lib.sh (Comarka):1016-1036 · executor.sh (kit):854-867, 1360-1384 |
| 7 | Formato de `contexto_juiz` | Campo opcional do ticket: **lista de strings, cada uma um caminho do repo. Não aceita texto inline.** O harness lê de `git show <base>:<path>` (estado de antes do agente). Tetos fixos no código: 400 linhas por arquivo, 1200 no total, com truncamento marcado. Caminho ausente na base derruba o juiz (`die`). O gate de ticket (check 9) exige que o caminho exista na `branch_alvo` e reprova se ele estiver listado na allowlist do próprio ticket; se só um glob da allowlist cobrir o caminho, dá aviso 9w. O prompt rotula o bloco como "ARQUIVOS DE REFERÊNCIA (estado na base, NÃO fazem parte do diff) … para você COMPARAR com o diff". **Exemplo real do Actus:** `docs/fila/501-visao-consolidada-sync-por-conector.md:69-71` → `"contexto_juiz": ["supabase/migrations/0264_admin_visao_consolidada.sql"]` (campo entrou em 76af390; 501 done em c7e21e3, 22/09). O bloco aparece em `runs/501/attempt-3/juiz.prompt.txt`. | CONTRATO.md:872-877 · doutrina/templates/TICKET.md:78 · executor.sh:747-787 · juiz.ts:104-111, 189-208 · gate-ticket.ts:1823-1876 |
| 8 | Os 20 arquivos mais tocados na janela | Tabela abaixo. O pior caso é `src/app/dashboard/clientes/[id]/page.tsx`: 25 commits na janela e 18 tickets done diferentes. Com a regra "ticket posterior tocou o mesmo arquivo", qualquer done que mexa na ficha vira retrabalho de 17 outros. **A comparação por linha (proposta abaixo) elimina quase todo esse falso positivo**, porque só conta linha que o próprio ticket adicionou. A exclusão de quentes fica só para o sinal fraco por arquivo. | levanta.out § top 20 |

**Item 8: 20 arquivos mais tocados por commits não-merge na janela (fora de docs/fila).** Colunas: commits, tickets done da janela que tocaram, arquivo.

```
  25  18 src/app/dashboard/clientes/[id]/page.tsx
  14   8 src/app/dashboard/clientes/[id]/tabs/geral-tab.tsx
  14   0 docs/roadmap/BACKLOG-MAPEADO.md
  12   0 docs/plano/apolo/glossario.md
  11   0 docs/plano/apolo/aprendizados.md
  11   5 src/lib/perf/ghl-backfill.ts
   9   7 src/lib/jobs/handlers/index.ts
   9   3 src/app/api/webhooks/ghl/app/route.ts
   9   7 vercel.json
   9   7 src/middleware.ts
   9   7 src/app/dashboard/clientes/page.tsx
   8   5 src/app/dashboard/clientes/[id]/tabs/ficha-types.ts
   8   7 src/lib/perf/alertas-engine.ts
   8   6 src/app/api/dashboard/clientes/route.ts
   8   0 src/app/dashboard/clientes/[id]/_components/metricas-diarias.tsx
   7   7 test/erro-cru-teto.test.ts
   7   7 src/app/portal/page.tsx
   7   1 docs/plano/apolo/04-ROADMAP.md
   7   7 src/app/dashboard/clientes/[id]/tabs/atendimento-tab.tsx
   7   5 src/lib/perf/sync-insights-anuncio.ts
```

## O que muda na definição proposta do C5

O que o levantamento mostrou:

1. **(a) saiu de done:** 0 na janela, 3 na história toda. Fica na conta porque é barato, mas não vai pesar.
2. **(b) revert:** 0 na janela. Mesma situação.
3. **(c) ticket posterior que cita o id e toca arquivo dele:** 70 pares citam um done da janela em até 14 dias. Com arquivo em comum e palavra de conserto sobram 2, e **os 2 são falso positivo** (1043/1044 e 1243/1245, tickets irmãos do mesmo lote). As citações reais são "no molde do 1227", "depende do 1032", "leia o arquivo do 1161". Sem um campo explícito no ticket (por exemplo `"conserta": ["867"]`), (c) não mede nada.
4. **O retrabalho está no commit humano de "fix pós-release"**, que a proposta original deixava como fraco. Testei uma regra mais estreita que "toca o mesmo arquivo": **o commit de fix apaga ou altera uma linha não trivial que o ticket adicionou** (linha `-` do commit igual a linha `+` do diff `p1...p2` do merge; pelo menos 12 caracteres e 3 letras). Só usa `git show` e `git diff`, sem blame. Prévia, que **não é o número da P3**: 103 pares ticket×commit; sem os rituais de migração, **35 pares fortes, 29 tickets done, 15 commits, 16 desses tickets aprovados de primeira**; 23 tickets com linha em comum sem palavra de fix (evolução: feat/perf).
5. **Ruído de ritual:** 44 pares vêm de commits de release que só renomeiam o caminho da migration num teste: `daa34e62e` "migrations(apolo): 47 .sql com o número do ledger" bate em 34 tickets apolo de uma vez; também `release(…)`, `chore(migrations)` e `caef86f60`. É custo de processo, não defeito do ticket. Proposta: excluir por prefixo de mensagem e, opcionalmente, contar à parte.
6. **Maturidade:** medir.sh descarta tudo depois do corte (`--ate`, 23:59:59), e é isso que torna duas rodadas idênticas (medir.sh:10-12, 81, 120, 197). Um done de 17/10 medido com `--ate 2026-10-17` teria 0 dia de acompanhamento. Hoje (24/10), só **154 dos 561** done de 04 a 17/10 já têm os 14 dias completos.

**Definição ajustada (para o ok):**

- **Universo:** tickets que o loop aprovou (merge `orquestrador: merge frente/<id>`) e viraram done numa **coorte defasada** `[INI−14, ATE−14]`. Todos têm 14 dias de acompanhamento dentro do corte, e medir.sh continua determinístico. Para `medir.sh 14 --ate 2026-10-17`, a coorte é de 20/09 a 03/10. A janela corrente sai à parte como `C5_parcial`, com a coluna `dias_acompanhados`. Os 3 done fechados à mão ficam fora.
- **Forte, em até 14 dias depois do done:**
  - (a) `saiu_de_done`: status do .md sai de done.
  - (b) `revert`: commit com "This reverts commit <sha>" ou assunto "Revert", em que `<sha>` é do lado frente ou do merge do ticket.
  - (c) `ticket_conserto`: só com declaração explícita (campo novo no ticket, que depende do Lucas) ou com os padrões `conserta|conserto do|corrige o <id>` **e** linha do ticket alterada. Hoje mede 0.
  - **(d) `fix_na_linha`, novo:** commit fora do loop, mensagem com `fix|corrig|conserta|bug|hotfix`, sem prefixo de ritual, que apaga pelo menos 1 linha não trivial adicionada pelo ticket.
- **Fraco (listado, fora da conta):**
  - (e) `linha_sem_fix`: mesma sobreposição de linha, sem palavra de fix (evolução).
  - (f) `fix_no_arquivo`: fix que toca arquivo do ticket sem linha em comum, excluídos os 20 quentes da janela.
- **Excluído:** commits de ritual de release ou migration, por lista de prefixos (`release(`, `migrations(`, `chore(migrations)`, mais casos nomeados).
- **C5** = tickets com pelo menos um forte / universo, em %, separado por loop (plataforma e apolo) e total.
- **Saída:** `out/<N>d/retrabalho.csv` com `id, loop, done_em, dias_acompanhados, tipo, forca, evidencia_sha, sha_aprovado, arquivos, linhas, aprovado_de_primeira`, e a chave `C5` no resumo.json com `{universo, coorte_de, coorte_ate, fortes_por_tipo, fracos, pct, pct_plataforma, pct_apolo, aprovados_de_primeira_com_forte, parcial: {...}}`. `sha_aprovado` = ponta da frente julgada (merge p2, que é o `head.txt` da tentativa aprovada).

## Plano das peças (depois do ok)

| Peça | O que | Arquivos | Teto |
|---|---|---|---|
| P1 | Fixtures reais do Comarka em `fixtures/c5/`. Cada caso guarda o `git show` do commit de fix e o `git diff p1...p2` do merge, cortados aos hunks relevantes, com id e sha de origem num `ORIGEM.tsv`. Positivos fortes (d): 763 × da1f4f1ce, 741a × 80a212fdb, 953 × 10c88edb9. Fracos (e/f): 743 × e48094409 (feat, linha sem fix), 924 × e7895d7cf. Negativos: 5135 × daa34e62e (ritual), 1043 × 1044 (citação de lote), 952a × 079d3f465 (release). Mais casos sintéticos mínimos de (a) e (b), marcados como sintéticos porque não há caso real na janela. Teste em Python stdlib (`unittest`), vermelho antes da P2. | fixtures/c5/*, test_c5.py | 150 linhas (sem contar fixtures copiadas) |
| P2 | C5 no medir.sh. Antes: snapshot de out/14d e out/30d (ver pergunta 7) e rodada de referência com medir.sh.bak-2410. Depois: mesma janela com o novo e `diff` dos dois resumo.json, em que só a chave `C5` pode aparecer, mais os csv antigos byte a byte. `bash medir.sh 14` com rc 0. | medir.sh (+ c5.py, se aprovado) | 200 linhas |
| P3 | Rodar 04 a 17/10 e os últimos 14 dias. Tabela com done, fortes por tipo, fracos, C5 e C2 lado a lado, por loop. Lista do "C2 inflado" (aprovados de primeira com forte). | relatório | — |
| P4 | Corpus candidato do juiz: id, sha aprovado, sha do conserto, uma linha sobre o defeito, se o defeito era visível no diff aprovado. Tudo "a confirmar pelo Lucas". | relatório | — |
| P5 | Desenho do REVIEW.md (só texto). | relatório | — |

Esboço da P5, para o ok já levar em conta:

- **contexto_juiz não serve bem para isso.** É por ticket (todo ticket teria que declarar), aceita só caminho, e o prompt o apresenta como "referência para comparar com o diff", não como regra de revisão.
- **O caminho limpo no kit:** chave de config `juiz.review_md` (caminho), lida da base pelo mesmo `lerDaBase`/`git show <base>:` (executor.sh:807-821), campo opcional novo em `EntradaPrompt` (juiz.ts:85-124) e bloco logo depois de `COBRANCAS` (juiz.ts:474-478). Fica na parte fixa do prompt, boa para cache, e o prompt sai byte a byte igual quando o campo está ausente, como no 622 e no 628.
- **No Comarka:** uma seção no heredoc do avaliador.sh:81-129, com `git show "$BASE":<caminho>` (o `--base` já chega ao script, avaliador.sh:30).
- **Atalho rejeitado:** importar o REVIEW.md no CLAUDE.md. É implícito, também chega ao executor e, no kit, viria da branch do agente (6a).

## Perguntas do PASSO 0 (respondidas pelo Lucas em 24/10; o que foi aplicado está em "Depois do ok")

1. **Coorte defasada:** C5 principal sobre os done de `[INI−14, ATE−14]` (determinístico, igual ao resto do medir.sh) e `C5_parcial` para a janela corrente? A alternativa é ler o git depois do corte, o que quebra "duas rodadas dão arquivos idênticos".
2. **P3 "janela 04 a 17/10":** a coorte só fica madura em 31/10. Aceita acompanhamento parcial até 23/10, com 154 de 561 maduros, coluna de dias e o número rotulado como parcial? Ou fica para 01/11? E "últimos 14 dias" vira a coorte madura de 26/09 a 09/10 mais o parcial de 10 a 23/10?
3. **`fix_na_linha` (d) como forte?** É onde está praticamente todo o sinal; (a), (b) e (c) dão 0 na janela. Parte dele é revisão de produto pós-release ("revisão pós-release 12/10"), que eu leio como retrabalho, sim.
4. **Lista de ritual excluído:** `release(`, `migrations(`, `chore(migrations)` e `caef86f60` ("fix(test): aponta auditoria para migrations renomeadas"). Confirma, ou o rename de migration deve contar à parte?
5. **Separar por loop** (plataforma vs apolo) no resumo? O apolo é 136 dos 561 e concentra o ruído de ritual.
6. **Onde mora a lógica:** módulo `c5.py` ao lado do medir.sh (testável com `unittest` sobre fixtures, chamado pelo heredoc) ou tudo dentro do heredoc, com o teste montando um repo git de fixture e rodando medir.sh com `COMARKA_REPO`? Recomendo `c5.py`: teste menor e o medir.sh cresce pouco. Ele está dentro da pasta, mas não é "script que o medir.sh já usa", por isso pergunto.
7. **Snapshot antes de rodar:** `bash medir.sh 14` sobrescreve out/14d, que hoje guarda a medição de 04 a 17/10 (gerada em 18/10). Posso copiar para `out/14d.ate-2026-10-17/` (e out/30d igual) antes da P2?
8. **Sessão Claude conta como "fora do loop"?** Commits "Lucas + sessão Claude" e de autor "Claude" sem merge do loop, como e15c1e284. Eu trato como humano, porque foi conduzido pelo Lucas.
9. **(c) daqui para frente:** quer um campo explícito no ticket do Comarka (`conserta: [ids]`) para o ticket de conserto se declarar? Isso é mudança no Comarka, fora do meu escopo.
10. **CLAUDE.md no juiz:** pelo padrão do Claude Code, os dois juízes carregam o CLAUDE.md do cwd (no kit, o da worktree do agente). Confirmar exige rodar o claude, que está proibido aqui. Quer que isso vire item da P5 ou um ticket à parte?

## Anexo: saída crua do levantamento

Os scripts e as saídas ficaram no scratchpad da sessão: `levanta.py`/`levanta.out`, `done_sai.py`/`done_sai.out`, `citacoes.py`/`citacoes.out`, `linhas.py`/`linhas.out`, todos em `/private/tmp/claude-501/-Users-lucasantos-orq-sessoes-medicao-comarka/ded3a57d-7c60-4a5b-8968-a6882b967002/scratchpad/`. O scratchpad é temporário. Se quiser, copio para a pasta da medição na P1.

```
$ python3 -I levanta.py   (rc=0)
done na janela: 561  apolo(5xxx): 136
done sem merge do loop: 3 ['1082b', '1116', '751']
== reverts (todas as branches, desde 15/09)
  7e05534 2026-10-02 12:33 migration 407a/407c: receita volta ao status anterior da saida revertida; ...
  614ec84 2026-10-02 10:45 fix(migration 407c): fn_reativar_churn atualiza so uma linha ...
  5848706 2026-10-01 23:13 407b: DELETE de churn-log reverte por fn_reativar_churn; ...
  29fa315 2026-10-01 23:07 407a: fn_reativar_churn (migration), churn-log DELETE marca revertido ...
  5d9f93b 2026-10-01 20:16 fila: 407a volta a pendente com spec corrigida (... filtro revertido ...)
  d77ab1e 2026-09-29 13:20 fix(churn): tela /churn reverte pelo DELETE do churn-log; ...
  812f085 2026-09-21 12:53 Revert "fila: 481b resolve campanha->conta por ads_metadata + insights ..."
  66b120a 2026-09-16 20:08 Revert "fila: libera ddl-400 (contrato ops_jobs aplicado)"
== item 5
commits fora do loop na janela: 301
tocam arquivo de ticket done nos 14d anteriores: 55
  ... com fix/corrige na mensagem: 27
  ... excluindo os 20 quentes: 49  com fix: 26
== item 3: done -> outro status em ate 14d
   (vazio: nenhum meta.json com linha depois do done, nenhum .md done->outro desde 01/10 entre os 561)
== maturidade: done da janela com 14d completos ate 2026-10-24 : 154

$ python3 -I done_sai.py   (rc=0; historia toda, --branches)
db1bc0daa 2026-10-19 00:37 Lucas Santos 5243 done -> pendente | apolo: 5243 volta ao loop (opcao B); ...
75963952b 2026-10-18 10:15 Lucas Santos 5241 done -> pendente | fila: 5230 da janela vira 5242 e reabre, 5241 reabre (id colidido, done sem rodar) ...
75963952b 2026-10-18 10:15 Lucas Santos 5242 done -> pendente | (mesmo commit)
total: 3

$ python3 -I citacoes.py   (rc=0)
pares (done, ticket posterior que cita o id em <=14d): 70
com arquivo em comum + palavra de conserto + nao so dependencia: 2  tickets done distintos: 2
  F ('1043', '1044', '10-13', '10-13', 1, ...)  -> irmaos do mesmo lote (falso positivo)
  F ('1243', '1245', '10-17', '10-17', 1, ...)  -> irmaos do mesmo lote (falso positivo)

$ python3 -I linhas.py   (rc=0; commits fora do loop de 04/10 a 24/10)
pares (ticket done, commit fora do loop que apaga linha adicionada pelo ticket, <=14d): 103
tickets done distintos: 91  | done na janela 04-17/10 com isso: 91
commits distintos: 37
desses tickets, aprovados de primeira: 67
# reclassificado por prefixo/palavra:
pares ritual (excluidos): 44 tickets 44
pares fortes (fix + linha): 35 tickets 29 commits 15 aprov. de primeira: 16
pares fracos (linha sem fix): 24 tickets 23
['318b','694','699','705','711a','740','741','741a','744','761','762','763','826','861','898c',
 '908','924c','928','938','952b','953','954','974','982','983','997','1301','1303','5053']
```

Ressalvas da prévia: 5053 (e15c1e284, "conserto de spec") provavelmente é falso positivo, porque o commit conserta spec de outros tickets. 1301 e 1303 têm só 7 dias de acompanhamento até 24/10. Os números finais saem da P3, com a regra aprovada.

---

# Depois do ok (24/10)

## Como apliquei as respostas

| # | Resposta | Onde está |
|---|---|---|
| 1 | Coorte madura `[INI-14, ATE-14]` + `C5_parcial` com `dias_acompanhados` | medir.sh seção 8b (`C_INI, C_FIM`); coluna `coorte` e `dias_acompanhados` no `retrabalho.csv` |
| 2 | Oficial = `medir.sh 14 --ate 2026-10-23` (coorte 26/09 a 09/10). 04 a 17/10 como PARCIAL | Tabelas da P3. O parcial de 04 a 17/10 vem de `medir.sh 20 --ate 2026-10-23`, filtrado nos done até 17/10, e por isso tem acompanhamento até 23/10. Com `--ate 2026-10-17` o acompanhamento pararia em 17/10. |
| 3 | `fix_na_linha` é forte | `c5.FORTES`. A P4 marca à parte o que parece requisito |
| 4 | Ritual fora do C5, contado à parte | `c5.RITUAL`, `RITUAL_SHAS`; chave `ritual: {C5: {pares, tickets, commits}, C5_parcial: {...}}` |
| 5 | Plataforma, apolo e total | `resumir()` → `plataforma`, `apolo`, `total` (loop pelo alvo do merge: `staging-apolo` = apolo) |
| 6 | `c5.py` + `test_c5.py`, stdlib | os dois na pasta da medição |
| 7 | Snapshot antes de rodar | `cp -R` para `out/14d.ate-2026-10-17/` e `out/30d.ate-2026-10-17/`; `diff -r` vazio (rc 0 nos dois) antes da primeira rodada |
| 8 | Sessão do Claude conta como fora do loop | só o lado frente dos merges do loop, Orq-Resolvedor e "fila: status automatico do loop" ficam de fora |
| 9 | Não mexer no Comarka | nenhum write no Comarka nem no kit; só git de leitura |
| 10 | CLAUDE.md da worktree vira etapa do kit | citado só como dependência na P5 |
| + | Levantamento copiado | `levantamento-2410/` (levanta, done_sai, citacoes, linhas: .py e .out, mais pares.txt), antes da P1 |
| + | 5053 × e15c1e284 | **confirmado e posto nos negativos.** O commit é "fila(apolo): conserto de spec de 5025, 5042 e 5055 (bloqueados pelo teste, nao pelo codigo)". O arquivo de teste que ele altera (`test/inteligencia/escritor-forma.test.ts`) lê o .md do 5042 como molde. Regra mecânica: commit com assunto `fila(`/`fila:` ou que só toca `docs/` não conta como fix (`c5.eh_spec`). |

## P1: fixtures e teste (vermelho)

Fixtures em `fixtures/c5/`, geradas por `fixtures/c5/extrair.py` (55 linhas, só `git diff/show/log/rev-parse`, reproduzível). Procedência em `fixtures/c5/ORIGEM.tsv`. Cada caso guarda o `git diff base...frente -- <arquivo>` do ticket, o `git show <sha> -- <arquivo>` do commit e um `caso.json` com done_em, sha aprovado, merge, assunto, arquivos e o esperado.

| Caso | Ticket × commit | Esperado | Origem |
|---|---|---|---|
| d_763 | 763 × da1f4f1ce (`src/lib/perf/ghl-backfill.ts`) | fix_na_linha, forte | merge 915d44ad1, frente 652f46458 |
| d_741a | 741a × 80a212fdb (`src/lib/promessas/detectar.ts`) | fix_na_linha, forte | merge 553df03b9, frente e006c6b19 |
| d_953 | 953 × 10c88edb9 (`src/lib/comercial/funil-cliente.ts`) | fix_na_linha, forte | merge 3b5c52916, frente 52f3ffc80 |
| e_743 | 743 × e48094409 (feat, `src/lib/qualificacao/motor.ts`) | linha_sem_fix, fraco | merge ae812fd17, frente 907ad050b |
| f_982 | 982 × 07b6ae52f (fix sem linha comum, `tabela-campanhas.tsx`) | fix_no_arquivo, fraco; some se o arquivo for quente | merge cb63efff6, frente 58e384d4f |
| n_ritual_5135 | 5135 × daa34e62e (`migrations(apolo): 47 .sql…`) | ritual, fora do C5, contado | merge d129b945e |
| n_ritual_952a | 952a × 079d3f465 (`release(1110): …`) | ritual | merge 115931778 |
| n_spec_5053 | 5053 × e15c1e284 (`fila(apolo): conserto de spec…`) | nada | merge a9702859b |
| n_cita_1043_1044 | 1043 × ticket 1044 (cita "do 1043", lote irmão, mesmo arquivo) | nada (não é ticket_conserto) | 1044: merge a2b4efe8c, .md de 3718afa |
| s_* (no teste) | saiu_de_done, revert, ticket_conserto positivo | forte | **sintéticos**: não há caso real na janela |

`test_c5.py`: 134 linhas, 9 testes (`unittest`, stdlib). Cobre os casos reais, quente derruba só o fraco por arquivo, janela de 14 dias e corte, `dias_acompanhados` com teto 14, os três sintéticos e o resumo por loop com o C2 inflado.

**Vermelho, antes de existir `c5.py`** (`tmp/p1-vermelho.txt`):

```
$ python3 -I test_c5.py -v ; echo rc=$?
rc=1
Traceback (most recent call last):
  File "/Users/lucasantos/orq-sessoes/medicao-comarka/test_c5.py", line 8, in <module>
    import c5
ModuleNotFoundError: No module named 'c5'
```

Nota: a primeira tentativa foi `python3 -I -m unittest test_c5`, que falha por outro motivo (o `-I` tira a pasta do `sys.path` e o próprio arquivo de teste não é achado). Não contei esse vermelho. O uso certo ficou no docstring: `python3 -I test_c5.py -v`.

## P2: C5 no medir.sh

Arquivos: `c5.py` novo (124 linhas, puro: sem git, sem disco) e medir.sh (+94 −1). **Total 218 linhas, 18 acima do teto de 200.** Sem docstring, comentário e linha em branco são 181 (92 em `c5.py` e 89 no medir.sh). Não enxuguei à força.

**Verde** (`tmp/fechamento-testes.txt`):

```
$ python3 -I test_c5.py -v ; echo rc=$?
test_dias_acompanhados_tem_teto_14 (__main__.Janela) ... ok
test_fora_dos_14_dias_ou_depois_do_corte_nao_conta (__main__.Janela) ... ok
test_arquivo_quente_derruba_so_o_fix_no_arquivo (__main__.Reais) ... ok
test_cada_caso_real (__main__.Reais) ... ok
test_citacao_de_lote_nao_e_ticket_conserto (__main__.Reais) ... ok
test_por_loop_e_c2_inflado (__main__.Resumo) ... ok
test_s_revert_de_sha_do_ticket (__main__.Sinteticos) ... ok
test_s_saiu_de_done (__main__.Sinteticos) ... ok
test_s_ticket_conserto_com_linha_do_ticket (__main__.Sinteticos) ... ok
----------------------------------------------------------------------
Ran 9 tests in 0.011s
OK
rc=0
```

**Prova de que C1, C2, C3 e os csv antigos não mudaram.** Protocolo: com o script antigo (`bash medir.sh.bak-2410`) gravei a referência em `tmp/base-ate1023/` e `tmp/base-ate1017/`, rodei o script novo nas mesmas janelas e comparei.

```
# referência antiga x snapshot de 18/10 (prova de reprodutibilidade antes de tudo)
$ diff -r tmp/base-ate1017 out/14d.ate-2026-10-17 ; echo rc=$?
rc=0

# --ate 2026-10-23 (janela oficial)
tickets.csv identico / intervencoes.csv identico / loop.csv identico / playbook.csv identico   (cmp)
diff tmp/base-ate1023/resumo.json out/14d/resumo.json: 141 linhas '>' e 0 linhas '<' (tmp/p2-diff-resumo-1023.txt)
chaves novas: ['C5', 'C5_parcial', 'ritual']  removidas: []  iguais nas antigas: True

# --ate 2026-10-17 (janela da medição anterior)
tickets.csv identico / intervencoes.csv identico / loop.csv identico / playbook.csv identico
diff: 0 linhas '<' (tmp/p2-diff-resumo-1017.txt)
novas: ['C5', 'C5_parcial', 'ritual'] antigas iguais: True
C2 413 558 74.0
```

O universo do `C5_parcial` é exatamente o denominador do C2: 609 ids na janela 10 a 23/10 e 558 na de 04 a 17/10, conferido id a id (zero só de um lado).

**diff -u contra a cópia de segurança** (a pasta não é git; `tmp/p2-medir.diff`):

```diff
--- medir.sh.bak-2410	2026-10-24 15:55:11
+++ medir.sh	2026-10-24 16:45:13
@@ -11,7 +11,8 @@
 # O corte e o fim do dia --ate (23:59:59 -03). Tudo depois do corte e ignorado, por isso
 # duas rodadas seguidas dao arquivos identicos mesmo com o loop vivo.
 #
-# Saida: out/<DIAS>d/{tickets,intervencoes,loop,playbook}.csv + resumo.json
+# Saida: out/<DIAS>d/{tickets,intervencoes,loop,playbook,retrabalho}.csv + resumo.json
+# C5 (retrabalho em 14 dias depois do done): regra em c5.py, testes em test_c5.py.
 # rc 0 so se tudo rodou. Escreve so em out/ e tmp/ ao lado deste script.
 set -euo pipefail
 export LC_ALL=C TZ=America/Bahia GIT_OPTIONAL_LOCKS=0
@@ -624,6 +625,91 @@
                      "data_na_licao": r["dl"] or "-", "licao": r["txt"][:140],
                      "fonte": "git show %s:%s linha %d" % (r["h"][:9], PB, r["linha"])})
 dias_licao = {loc(r["dt"]).date() for r in linhas_p}
+
+# ---------------------------------------------------------------- 8b. C5 retrabalho (regra e testes: c5.py)
+# Coorte madura = done em [INI-14, ATE-14]: todo ticket dela tem 14 dias de acompanhamento antes do
+# corte. A janela corrente sai como C5_parcial. Nada depois do corte entra, como no resto.
+sys.path.insert(0, os.path.dirname(os.path.dirname(OUT)))
+import c5
+C_INI, C_FIM = INI - timedelta(days=14), CORTE - timedelta(days=14)
+MRG = re.compile(r"^orquestrador: merge frente/(\S+) \(ticket (\S+)\) em (\S+)$")
+mrg, patch = {}, {}
+for l in git("log", "--branches", "--merges", "--since=2026-08-01", "--format=%H %P" + FS + "%at" + FS + "%s").splitlines():
+    hp, at, s = l.split(FS); p = hp.split(); m = MRG.match(s); dt = datetime.fromtimestamp(int(at), UTC)
+    if m and len(p) >= 3 and dt <= CORTE:
+        mrg.setdefault(m.group(2), []).append((dt, p[0], p[2], p[1], m.group(3)))
+def merge_patch(mm):   # (dt, merge, frente, base, alvo) -> diff do lado frente, sem docs/fila
+    if mm[1] not in patch:
+        patch[mm[1]] = git("diff", "--no-color", mm[3] + "..." + mm[2], "--", ".", ":!docs/fila")
+    return patch[mm[1]]
+def universo(ini, fim):
+    us = []
+    for tid, rows in sorted(meta.items()):
+        d = [r["ts"] for r in rows if r["res"] == "done" and ini <= r["ts"] <= fim]
+        ms = sorted(mm for mm in mrg.get(tid, []) if d and mm[0] <= d[-1] + timedelta(hours=1))
+        if not ms:
+            continue
+        add, arqs = {}, set()
+        for mm in ms:
+            for f, v in c5.linhas_diff(merge_patch(mm), "+").items():
+                add.setdefault(f, set()).update(v)
+            arqs.update(x[6:] for x in merge_patch(mm).split("\n") if x.startswith("+++ b/"))
+        us.append({"id": tid, "loop": "apolo" if ms[-1][4] == "staging-apolo" else "plataforma", "done_em": d[-1],
+                   "sha_aprovado": ms[-1][2], "shas": {x for mm in ms for x in mm[1:3]}, "adicionadas": add, "arquivos": arqs,
+                   "prim": "sim" if len(rows) == 1 and rows[0]["res"] == "done" else "nao"})
+    return us
+u_mad, u_par = universo(C_INI, C_FIM), universo(INI, CORTE)
+ids_u = {t["id"] for t in u_mad + u_par}
+arqs_u = {f for t in u_mad + u_par for f in t["arquivos"]}
+rev = dict(b.partition(FS)[::2] for b in git("log", "--branches", "--no-merges", "--since=2026-08-01",
+           "--grep=This reverts commit", "--format=" + SEP + "%H" + FS + "%b").split(SEP)[1:])
+fora, qt = [], {}
+for c in commits:
+    fs = [p[-1] for _, p in c["arqs"]]
+    if c["dt"] < C_INI:
+        continue
+    for f in set(fs) - {f for f in fs if f.startswith("docs/fila/")}:
+        qt[f] = qt.get(f, 0) + 1
+    if c["h"] in agente or c["orr"] or c["s"].startswith("fila: status automatico do loop") or \
+            (c["h"] not in rev and not set(fs) & arqs_u):
+        continue
+    fora.append({"sha": c["h"], "dt": c["dt"], "assunto": c["s"], "corpo": rev.get(c["h"], ""), "arquivos": fs,
+                 "removidas": c5.linhas_diff(git("show", "--no-color", "--format=", c["h"], "--", ".", ":!docs/fila"), "-")})
+quentes = set(sorted(qt, key=lambda f: (-qt[f], f))[:20])
+TMD = re.compile(r"^docs/fila/(?:apolo/|_hold/|_to_delete/)?([0-9]{3,4}[a-z0-9]*)-[^/]*\.md$")
+cat = subprocess.Popen(["git", "-C", REPO, "cat-file", "--batch"], stdin=subprocess.PIPE, stdout=subprocess.PIPE)
+trans = []
+for blk in git("log", "--branches", "--no-merges", "-M", "--name-status", "--since=" + C_INI.isoformat(),
+               "--format=" + SEP + "%H" + FS + "%at", "--", "docs/fila").split(SEP)[1:]:
+    ls = blk.strip("\n").split("\n"); h, at = ls[0].split(FS); dt = datetime.fromtimestamp(int(at), UTC)
+    for l in ls[1:] if dt <= CORTE else []:
+        p = l.split("\t"); m = len(p) >= 2 and (TMD.match(p[-1]) or TMD.match(p[1]))
+        if not m or m.group(1) not in ids_u:
+            continue
+        a = (partes(blob(h + "^:" + p[1]))[0] or {}).get("status")
+        b = (partes(blob(h + ":" + p[-1]))[0] or {}).get("status") if p[0][0] != "D" else "(apagado)"
+        if a == "done" and b != "done":
+            trans.append({"id": m.group(1), "dt": dt, "sha": h, "para": b})
+add_path, novos = {}, []
+for blk in git("log", "--branches", "--diff-filter=A", "--name-only", "--format=" + SEP + "%H", "--", "docs/fila").split(SEP)[1:]:
+    ls = blk.strip().split("\n")
+    for p in ls[1:]:
+        if TMD.match(p):
+            add_path[TMD.match(p).group(1)] = (ls[0], p)   # do mais novo ao mais velho: fica a 1a adicao
+for tid, ms in sorted(mrg.items()):
+    tx = (blob("%s:%s" % add_path[tid]) or "") if tid in add_path else ""
+    for mm in ms if c5.ids_citados(tx) & ids_u else []:
+        if mm[0] >= C_INI:
+            novos.append({"id": tid, "sha": mm[1], "dt": mm[0], "texto": tx, "removidas": c5.linhas_diff(merge_patch(mm), "-")})
+cat.stdin.close(); cat.wait()
+l_mad, r_mad = c5.avaliar(u_mad, fora, CORTE, trans, novos, quentes)
+l_par, r_par = c5.avaliar(u_par, fora, CORTE, trans, novos, quentes)
+def bloco_c5(us, ls, rt, ini, fim):
+    r = c5.resumir(us, ls, rt); r.pop("ritual")
+    dias = {l["id"]: l["dias_acompanhados"] for l in ls}
+    r.update(coorte_de=dstr(ini), coorte_ate=dstr(fim), quentes_excluidos_do_fraco=sorted(quentes),
+             dias_acompanhados_min=min(dias.values()) if dias else None, com_14_dias=sum(1 for v in dias.values() if v >= 14))
+    return r
 
 # ---------------------------------------------------------------- 9. escrita
 def grava(nome, linhas, cols):
@@ -643,6 +729,11 @@
                              "horas_ocioso_sem_processavel", "horas_pausa_operacional", "horas_pausa_manual",
                              "horas_pausa_gate_streak", "horas_sem_dado", "dia_com_intervencao", "fonte"])
 grava("playbook.csv", linhas_p, ["data", "commit", "data_na_licao", "licao", "fonte"])
+grava("retrabalho.csv", sorted([dict(l, coorte=k, evidencia_sha=l["evidencia_sha"][:9], sha_aprovado=l["sha_aprovado"][:9])
+                                for k, ls in (("madura", l_mad), ("parcial", l_par)) for l in ls],
+                               key=lambda r: (r["coorte"], r["done_em"], r["id"], r["tipo"], r["evidencia_sha"])),
+      ["coorte", "id", "loop", "done_em", "dias_acompanhados", "tipo", "forca", "evidencia_sha", "sha_aprovado",
+       "arquivos", "linhas", "aprovado_de_primeira"])
 
 # resumo
 done_t = [r for r in linhas_t if r["status"] == "done" and r["data_done_ou_bloqueio"] != "-"]
@@ -707,6 +798,9 @@
                 "claude_dur_secs_por_done": round(sum(esf_done) / len(esf_done)) if esf_done else None,
                 "custo_usd": "sem dado"},
 }
+res["C5"] = bloco_c5(u_mad, l_mad, r_mad, C_INI, C_FIM)
+res["C5_parcial"] = bloco_c5(u_par, l_par, r_par, INI, CORTE)
+res["ritual"] = {"C5": r_mad, "C5_parcial": r_par}
 with open(os.path.join(OUT, "resumo.json"), "w") as fh:
     json.dump(res, fh, ensure_ascii=False, indent=1, sort_keys=True); fh.write("\n")
 print("ok %s: tickets=%d intervencoes=%d loop=%d playbook=%d" % (
```

`c5.py` e `test_c5.py` são arquivos novos (diff contra `/dev/null` = o arquivo inteiro, na pasta). Decisões que vale saber:
- **Fronteira da janela:** `done_em < evidência ≤ min(done_em + 14d, corte)`.
- **Linha que conta:** pelo menos 12 caracteres e 3 letras seguidas; ignora fecha-chave e import de uma letra.
- **Arquivos quentes:** os 20 mais tocados por commit não-merge entre o início da coorte madura e o corte. Só derrubam o `fix_no_arquivo`.
- **(c) ticket_conserto:** exige `conserta|conserto do|corrige [o] <id>` no texto de criação do ticket novo **e** linha do ticket alterada pelo merge do novo.
- **Tempo de rodada:** 38 s no script novo contra 21 s no antigo, em `--ate 2026-10-23`.

## P3: as janelas

`retrabalho.csv` + `levantamento-2410/p3.py` (cria só a tabela). "C2 da coorte" é aprovado de primeira / universo do C5 (os mesmos tickets). Em 04 a 17/10 bate com o C2 oficial, 413/558 = 74,0%. "C2 sem retrabalho forte" tira do numerador quem teve forte.

**Oficial: coorte madura 26/09 a 09/10** (`medir.sh 14 --ate 2026-10-23`, todos com 14 dias):

| loop | done | saiu_de_done | revert | ticket_conserto | fix_na_linha | fracos (sem forte) | ritual | **C5** | C2 da coorte | C2 sem retrabalho forte |
|---|---|---|---|---|---|---|---|---|---|---|
| plataforma | 225 | 0 | 0 | 0 | 18 | 47 | 6 | **8,0% (18)** | 69,3% (156) | 66,2% (149) |
| apolo | 0 | — | — | — | — | — | — | — (loop começou em 14/10) | — | — |
| total | 225 | 0 | 0 | 0 | 18 | 47 | 6 | **8,0% (18)** | 69,3% (156) | 66,2% (149) |

**PARCIAL: 04 a 17/10** (`medir.sh 20 --ate 2026-10-23`, done até 17/10; acompanhamento até 23/10):

| loop | done | saiu_de_done | revert | ticket_conserto | fix_na_linha | fracos (sem forte) | ritual | C5 parcial | C2 da coorte | C2 sem retrabalho forte | dias acomp. mín/mediana |
|---|---|---|---|---|---|---|---|---|---|---|---|
| plataforma | 422 | 0 | 0 | 0 | 28 | 36 | 10 | 6,6% (28) | 71,3% (301) | 67,8% (286) | 6 / 11 |
| apolo | 136 | 0 | 0 | 0 | 0 | 3 | 34 | 0,0% (0) | 82,4% (112) | 82,4% (112) | 6 / 6 |
| total | 558 | 0 | 0 | 0 | 28 | 39 | 44 | 5,0% (28) | **74,0% (413)** | 71,3% (398) | 6 / 10 |

**PARCIAL: últimos 14 dias, 10 a 23/10** (`C5_parcial` de `medir.sh 14 --ate 2026-10-23`):

| loop | done | fix_na_linha | fracos (sem forte) | ritual | C5 parcial | C2 da coorte | C2 sem retrabalho forte | dias acomp. mín/mediana |
|---|---|---|---|---|---|---|---|---|
| plataforma | 436 | 16 | 21 | 4 | 3,7% (16) | 71,8% (313) | 69,5% (303) | 1 / 7 |
| apolo | 173 | 0 | 3 | 34 | 0,0% (0) | 83,8% (145) | 83,8% (145) | 3 / 6 |
| total | 609 | 16 | 24 | 38 | 2,6% (16) | 75,2% (458) | 73,6% (448) | 1 / 6 |

Leitura:
- **O parcial subestima.** A coorte madura (14 dias) dá 8,0%; a de 04 a 17/10, com 10 dias medianos, dá 6,6% na plataforma; a de 10 a 23/10, com 6, dá 3,7%. É o mesmo processo visto com menos tempo. Por isso o oficial é o maduro.
- **Apolo 0% não quer dizer apolo sem defeito.** Ainda não houve commit humano de fix em código do apolo; o que houve foi ritual de migration (34 pares) e conserto de spec (5053, fora por regra).
- **A (c) faz falta?** Nesta medição, não: deu 0 nas três janelas e nenhum conserto real escapou por falta dela (o conserto vem de commit humano, que a `fix_na_linha` pega). Ela faria falta se o retrabalho passasse a vir como ticket do loop, que hoje não acontece.

**C2 inflado: aprovados de primeira com retrabalho forte.** Na oficial, **7 de 156**: 666b (4509aa021), 734 (80a212fdb, a2cd69ec8), 763 (9a81d7081, da1f4f1ce), 699 (a2cd69ec8), 705 (a2cd69ec8), 861 (80a212fdb), 740 (29afed53d). No parcial de 04 a 17/10, **15 de 413**: 763, 699, 705, 861, 740, 952b (8124e3e8c, bc3fae812, fcc533de7), 974 (10c88edb9), 982 (1d5940d5c), 954 (8124e3e8c), 908 (f16164c25), 318b, 898c, 938 (10c88edb9), 997 (2c76b10f7), 1301 (ac83a7777). Pela P4, desses 15, 952b, 954, 982 e 1301 parecem mudança de requisito, e 908 e 997 parecem falso positivo. Sobram 9: 6 com cara de defeito (763, 699, 705, 861, 740, 974) e 3 sem diagnóstico (318b, 898c, 938).

## P4: candidatos ao corpus de regressão do juiz (TUDO "a confirmar pelo Lucas")

Universo: os fortes da coorte oficial mais os do parcial de 04 a 17/10, 33 tickets e 17 commits de conserto. O "sha aprovado" é a ponta da frente que o juiz julgou. Conferi em 763, 740, 953 e 1303 que é igual ao `head.txt` da tentativa com `verdict.json` aprovado. Fonte do defeito: corpo do commit de conserto e linhas do ticket que ele apagou (`levantamento-2410/p4.out`).

Classe: **D** = defeito; **R** = parece mudança de requisito (marcado à parte, como pedido); **FP** = provável falso positivo da regra por linha; **?** = commit sem corpo, defeito não identificável só pelo git.

| id | sha aprovado | sha conserto | classe | defeito (uma linha) | visível no diff aprovado? |
|---|---|---|---|---|---|
| 715 | 020e33ef9 | 80a212fdb | D | lê mensagens com `.limit(5000)`; o servidor corta em 1000 e as mais recentes somem | sim (`.order(asc).limit` no diff; o teto de 1000 é conhecimento externo) |
| 734 | a8ea88e1a | 80a212fdb, a2cd69ec8 | D | mesmo teto de 1000 no vácuo + contatos lidos cliente a cliente (N+1) | sim |
| 740 | 6c6449993 | 29afed53d | D | `fecharPromessas` com o mesmo teto de 1000: entrega recente nunca chega ao modelo | sim |
| 741a | e006c6b19 | 80a212fdb | D | detectar promessas: teto de 1000 + contatos N+1 | sim |
| 861 | a9114d6a8 | 80a212fdb | D | detectar promessas: teto de 1000 | sim |
| 741 | 0788ddccb | 80a212fdb | FP | só a linha do mock de teste mudou (mock ganha `.range`) | — |
| 694 | 03f0d77f0 | a2cd69ec8 | D | Início lento: 2 consultas em série por cliente | sim (await por cliente no diff) |
| 699 | 419a92762 | a2cd69ec8 | D | equipe do head: uma carga por gestor, mais uma em série para o head | sim |
| 705 | ad532d736 | a2cd69ec8 | D | carregar-carteira: leituras em série (mesmo item "Início lento") | sim |
| 711a | 3b4bc09b3 | a2cd69ec8 | D | `/api/clientes/sinais` só aceitava id do OS; a ficha manda notion id e recebe `{}` (chip Saúde vazio) | em parte (a rota está no diff; quem chama com notion id, não) |
| 735 | 855321476 | 85a69a377 | D | rota exige uuid (`z.string().uuid()`); ficha aberta por notion_id manda id cru → 422 | em parte |
| 737 | e79eaf5ad | 85a69a377 | D | page passa `String(id)` cru da URL para `ResponderAgora` | sim |
| 763 | 652f46458 | da1f4f1ce (+9a81d7081) | D | backfill a ~2 s por item (gravação e requalificação em série por oportunidade) | sim (await em loop) |
| 761 | b548169e8 | da1f4f1ce (+9a81d7081) | D | falha engolida no `catch` não vira `ultimo_erro` na retomada | sim |
| 762 | 3179addba | da1f4f1ce (+9a81d7081) | D | conclusão/erro do backfill sem registro na retomada | sim |
| 744 | f22f4f5f0 | 9a81d7081 | R | backfill vira resumível com fases e checkpoint ("junta 7a6356c e 2f4df6f"): redesenho | — |
| 924c | 788f92272 | 5912a0dfd | D | status do grupo WhatsApp lido do campo legado `whatsapp_group_url`: 25 clientes com grupo aparecem "Sem link do grupo" | sim (lê `extra.whatsapp_group_url`; que é legado exige contexto) |
| 928 | 12934f946 | 262b71c30 | D | pendência de CRM lida de `clientes_crm_config`, sem linha para cliente do fluxo novo | em parte |
| 953 | 52f3ffc80 | 10c88edb9 | D | funil compara datas sem o dia de SP (`d >= from && d < aposTo`) | sim |
| 974 | c4a7986cf | 10c88edb9 | D | ritmo guarda estado em memória do módulo em função serverless | sim (o próprio comentário apagado dizia isso) |
| 983 | 4db2560a6 | 10c88edb9 | D | %MQL com leads de uma base e MQL de outra ("na mesma base") | em parte |
| 1303 | 354ab5945 | ac83a7777, 2c76b10f7 | D | troca de aba renderiza antes do fetch e a aba nova recebe o payload da anterior (quebra em `mudancas.slice`); aba começa "inicio" antes de ler o hash | sim |
| 318b | edb555f6c | 10c88edb9 | ? | item "ranking" da revisão pós-release 12/10 (leitura de fechamentos em lote) | a confirmar |
| 898c | 133bc3e33 | 10c88edb9 | ? | item "verba" (mensagem de `dadoAtrasado`) | a confirmar |
| 938 | 6c228d877 | 10c88edb9 | ? | cálculo do `ticket_tese` no assistente de metas | a confirmar |
| 666b | 856ef9301 | 4509aa021 | R | regra B3.2 nova de leads/CPL "pela regra da ficha" (1 linha em comum) | — |
| 952b | c57e5eba4 | fcc533de7, bc3fae812, 8124e3e8c | R | atribuição ganha a nota do STEVO e uma precedência nova ("decisão do Lucas 13/10"); "bug 7b" no assunto | — |
| 954 | 20d52f6bd | 8124e3e8c | R | `ORIGENS_PAGAS` ganha `whatsapp_sem_referral` (decisão de 13/10) | — |
| 982 | 58e384d4f | 1d5940d5c | R | seletor de tipo ganha "sugerido" (assinatura de `PilulaFunil` muda) | — |
| 1301 | 492198f89 | ac83a7777 | R | rota da prévia ganha a aba Briefing ("igual ao portal público") | — |
| 826 | 4f52a6e46 | 1d5940d5c, f16164c25 | FP | linhas de prop/contexto (`motivoSemNotion`) tocadas por mudança alheia | — |
| 908 | 216c73c45 | f16164c25 | FP | linha de import no `ficha-context` | — |
| 997 | af11b9fa3 | 2c76b10f7 | FP | `abaDoHash` movida para o portal-shell (refatoração) | — |

Contagem: **20 D, 6 R, 4 FP, 3 ?** (de 33 tickets; 761, 762 e 763 ficam como D pela da1f4f1ce, e a 9a81d7081 deles é redesenho). Padrões para o corpus:
1. **Teto de 1000 linhas do servidor com `.limit` maior** (5 tickets, 2 commits). O mock aprovado ignorava `limit`.
2. **Consulta em série por item (N+1)** (6 tickets).
3. **Id de notion e id do OS trocados entre rota e ficha** (3 tickets).
4. **Campo legado lido como fonte** (2 tickets).
5. **Data sem fuso** (1 ticket).

Os padrões 1, 2 e 5 são visíveis no diff aprovado sem contexto externo. São os melhores candidatos a regressão do juiz. Os falsos positivos mostram o limite da regra por linha: linha de lista ou import editada por motivo alheio e código movido conta como apagado. Um piso de 2 linhas em comum tiraria só 741 e 908 (1 linha cada; e também o 666b, que é R). 826 (3 linhas pelo 1d5940d5c) e 997 (5, código movido) pediriam outra regra, como ignorar linha que reaparece igual em `+` no mesmo commit. Não mudei a regra.

## P5: desenho do REVIEW.md (só texto)

**Onde mora.** `docs/orquestrador/REVIEW.md` nos dois repos, ao lado do PLAYBOOK (o Comarka tem `docs/orquestrador/PLAYBOOK.md`; o dashboard ganhou o seu em 27172481). É versionado e muda por commit humano, nunca pelo loop. A zona proibida do enforcement deve incluir o caminho, para nenhum ticket poder editá-lo.

**Como o juiz do kit lê, pela direção aprovada (`juiz.review_md`):**
- `docs/fila/000-config.json` ganha `juiz.review_md: "docs/orquestrador/REVIEW.md"` (opcional), e `JuizCfg.juiz` ganha o campo (juiz.ts:22-30).
- `run_juiz` (executor.sh:806-832) lê **da base da tentativa**, como o 622: `git -C "$wt" show "$base:$review_md"`, ao lado de `contexto_juiz_json` (executor.sh:807-809). Chave ausente: nada muda. Chave presente e arquivo ausente na base: erro alto, como em executor.sh:769. O conteúdo vai no JSON de entrada como `revisao` (executor.sh:822-831).
- `EntradaPrompt` ganha `revisao?: string` (juiz.ts:85-124). Em `montarPromptJuiz` (juiz.ts:471-478) o bloco entra **logo depois de `COBRANCAS`**, sem número (as cobranças numeradas 1 a 5 não renumeram), com cabeçalho "REGRAS DESTE REPOSITÓRIO (REVIEW.md, estado na base, NÃO fazem parte do diff): reprove o diff que tiver a cara de uma destas falhas". Fica na parte fixa do prompt, antes do material variável, o que preserva o cache de prefixo (comentário em juiz.ts:454-457).
- **Ausente = prompt byte a byte igual**, com o mesmo teste que existe para o 622 (`test/orquestrador-contexto-juiz.test.ts`, caso (a)) e para o 628.
- Ler da base, e não da worktree, impede o agente de afrouxar a regra no próprio diff.

**Dependência que o REVIEW.md não resolve:** o juiz do kit roda `claude -p` com cwd na worktree do ticket (executor.sh:842; lib.sh:1517), e o Claude Code carrega o CLAUDE.md dali por padrão, ou seja, o da branch do agente. O REVIEW.md lido da base não muda isso; fica para a etapa própria do kit (resposta 10).

**Comarka (sem tocar agora; só o desenho):** no heredoc do avaliador.sh, depois da linha "Regra: …" (avaliador.sh:92-93), uma seção com `git -C "$ROOT" show "$BASE:docs/orquestrador/REVIEW.md"`. O `--base` já chega ao script (avaliador.sh:30) e o executor passa o merge-base (executor.sh:663, 777). A chave entra em `000-config.json` como `review_md`. Ausente: heredoc igual ao de hoje.

**Teto de tamanho:** 150 linhas e 8 KB, checados no **pré-voo** (gate de ticket do kit, ao lado do check 9 em gate-ticket.ts:1823), e não por truncamento: regra cortada some sem ninguém ver. Quatro seções de cerca de 25 linhas cabem com folga. A 8 KB, são uns 2 mil tokens a mais por julgamento, quase todos em prefixo cacheável no kit.

**Primeira versão, Comarka (`comarka-operacional/docs/orquestrador/REVIEW.md`):**

```markdown
# REVIEW — o que o juiz cobra neste repositório
Cada seção é uma falha que já passou por aqui. Reprove o diff que tiver a cara dela.

## 1. Config apontando para produção
Cara no diff: teste ou script que lê .env.local ou monta cliente do Supabase com a URL/chave
real; rota GET que grava; escrita sem trava de ambiente.
Reprove se: o diff conecta no projeto real a partir de teste/script, ou grava em GET.
Fonte: dashboard-comercial 0f24c418 (teste v128 lia .env.local e rodou contra produção; 18 vezes,
08e6bb67) e 6213cdc8 (GET de /api/financeiro/entradas no Mac contra produção gravou ltv_meses +1 em
12 clientes). Aqui: PLAYBOOK "Secrets só humano" (linha 76). [Sem incidente próprio do Comarka.]

## 2. Teste que não testa a regra
Cara no diff: dublê do Supabase que devolve tudo e ignora .limit/.range
(`for (const m of [... "limit" ...]) cadeia[m] = () => cadeia`); teste só de ausência; teste que
passaria com o código antigo.
Reprove se: a regra do objetivo depende de teto, página, fuso ou tipo de id e o teste usa dublê
que não reproduz esse limite.
Fonte: 80a212fdb e 29afed53d (vácuo, eventos, promessas e fechar liam .limit(5000); o servidor
corta em 1000; tickets 715, 734, 740, 741a e 861 aprovados com mock que ignorava limit);
kit juiz.ts:7-11 (ticket 204, ausência provada no vazio).

## 3. Doc ou comentário que mente
Cara no diff: comentário, PLAYBOOK ou doc com número, fonte ou comportamento que o diff não prova;
campo marcado como legado lido como fonte da verdade.
Reprove se: o diff afirma fato (contagem, "nenhuma tela grava", "a fonte é X") sem a prova no
próprio diff ou no material.
Fonte: dashboard-comercial 08e6bb67 (PLAYBOOK e vitest.config diziam 3 execuções contra produção;
eram 18). Aqui: 5912a0dfd (924c lia whatsapp_group_url, legado: 25 clientes "Sem link do grupo")
e f16164c25 (ficha lia clientes_extra.meta_account_id, que nenhuma tela grava).

## 4. Escrita em tabela de outro dono
Cara no diff: .from("<tabela>").insert/update/upsert/delete, RPC ou migration que escreve em
tabela de `c0_intocavel` (docs/fila/000-config.json: clientes_receita, leads_crm, ...), ou em
clientes_crm_config (o dashboard comercial lê e grava).
Reprove se: o diff ADICIONA escrita (não comentário, não linha removida) em tabela de outro dono.
Fonte: PLAYBOOK "Lição (04/09)" (ticket 184: o OS escrevia em clientes_receita); 262b71c30 e
f16164c25 (consertos que deixam clientes_crm_config intocada porque o dono é o dashboard).
```

**Primeira versão, dashboard (`dashboard-comercial-orq/docs/orquestrador/REVIEW.md`):** as mesmas quatro seções, com as fontes do lado do dashboard:
1. **Produção:** 0f24c418, 08e6bb67, 6213cdc8, 37fe4b01 (os outros efeitos colaterais do GET de entradas) e aa40e754 (guarda que falha alto se a URL ou a service role de produção estiverem no ambiente do teste).
2. **Teste:** 5ed537c7 (a suíte padrão dependia de credencial real; barreira e controle negativo) e f3b78920 (controle negativo chamava `.retry(false)`, que não existe na versão do lockfile; só passava com node_modules emprestado).
3. **Doc:** 08e6bb67, mais o mesmo erro deixado em `grace-softdelete-v128.integration.test.ts:10`, que o próprio commit aponta.
4. **Outro dono:** **sem incidente encontrado do lado do dashboard.** A seção nasce do espelho do C0 do Comarka: as tabelas que o OS criou (perf_*, ops_*, wpp_*) são do OS. **A confirmar pelo Lucas** se ela entra na v1 do dashboard ou espera o primeiro caso.

**Como medir se cada reprova do juiz estava certa.** Fonte: `runs/<id>/meta.json` (sequência de `resultado`), `runs/<id>/attempt-N{,.prevK}/verdict.json` (motivo) e `diff.raw`/`head.txt` de cada tentativa no Comarka; `juiz.veredito.json` e `diff.patch` no kit; história do .md no git (o que o medir.sh já classifica em `intervencoes.csv`).

| desfecho da reprova | regra | leitura |
|---|---|---|
| corrigida pela próxima tentativa | próxima tentativa do mesmo ticket termina done **e** o diff mudou no arquivo citado no motivo (hash de `diff.raw` diferente) | reprova certa e útil |
| certa, mas por spec | o ticket bloqueia depois das reprovas, um humano muda allowlist, critério ou objetivo (tipo allowlist/criterio em `intervencoes.csv`) e depois passa. Ex.: 318c, 6 reprovas, `nichos-teses-aba.tsx` entrou na allowlist em bc492863f | juiz certo, ticket errado |
| humano liberou contra o juiz | depois de reprova do juiz, o ticket vira done sem aprovação do loop (`done_sem_meta`, commit humano) ou é reaberto **sem** mudança de spec e aprova com o mesmo hash de diff | reprova errada |
| ruído | reprovado e depois aprovado com `diff.raw` idêntico (o kit já bloqueia o idêntico em executor.sh:1612; o Comarka não) | juiz inconsistente |
| aprovação errada | aprovado com retrabalho forte no C5 (P4) | o outro lado da mesma régua |

## Perguntas abertas

1. **P4:** confirma a classe (D, R, FP, ?) de cada linha? Os 3 "?" (318b, 898c, 938) vêm do 10c88edb9, que não tem corpo; só você sabe o que a revisão pós-release consertou em cada um.
2. **Regra por linha:** os 4 FP são de linha de import ou prop, ou de código movido. Quer na próxima volta um piso de 2 linhas (tira 741 e 908) e/ou desconsiderar linha que o mesmo commit readiciona igual (pega código movido, como em 997)?
3. **Teto da P2:** 218 linhas contra 200 (181 de código). Aceita, ou quer que eu enxugue os docstrings?
4. **REVIEW.md do dashboard, seção 4:** entra sem incidente próprio ou espera o primeiro caso?
5. **out/30d** continua o de 11/10 (não rodei de novo). Quer `medir.sh 30` com o C5 também?

## Fechamento (saída crua)

```
$ python3 -I test_c5.py -v ; echo rc=$?
... (9 testes, todos ok)
Ran 9 tests in 0.011s
OK
testes rc=0

$ bash medir.sh 14 ; echo rc=$?
ok /Users/lucasantos/orq-sessoes/medicao-comarka/out/14d: tickets=613 intervencoes=334 loop=14 playbook=50
medir rc=0
```

Estado da pasta (só ela foi escrita, além deste relatório):
- **Novos:** `c5.py`, `test_c5.py`, `fixtures/c5/`, `levantamento-2410/` (inclui `p3.py`, `p4.py`, `p4.out`), `out/14d.ate-2026-10-17/`, `out/30d.ate-2026-10-17/`, `out/20d/`, e em tmp/: `base-ate1023/`, `base-ate1017/`, `c5-ate1017/`, `p1-vermelho.txt`, `p2-*.txt`, `p2-medir.diff`, `fechamento-*.txt`.
- **Alterado:** `medir.sh`. `out/14d/` agora é a janela 10 a 23/10, com `retrabalho.csv`; a de 04 a 17/10 está no snapshot e em `tmp/c5-ate1017/`, esta já com C5.
- **Não tocados:** Comarka, kit, dashboard e `~/.orq/` (só git de leitura com `GIT_OPTIONAL_LOCKS=0`). Nada de push, de `claude -p` ou de API paga.

---

# Volta 2 (24/10, fechamento do Lucas)

Estado: **itens 1 a 6 feitos, parado.** A volta 1 acima fica como estava; os números válidos daqui em diante são os desta seção.

## 1. Regra nova: linha que o mesmo commit readiciona igual não conta

**O caso 997 não some com esta regra.** O 2c76b10f7 apaga 5 linhas que o 997 adicionou em `src/app/r/escritorio/[token]/page.tsx` e readiciona igual só uma, `return ABAS_PRONTAS.includes(h) ? h : "inicio";`. As outras quatro (`const abaDoHash = () => {`, `const f = () => setAba(abaDoHash());`, `const h = typeof window …`, o `import { ABAS_PRONTAS, PortalShell, … }`) voltam reescritas no portal-shell, com outra assinatura. A regra, do jeito que foi pedida, leva o par de 5 para 4 linhas, e o 997 segue forte. Não estiquei a regra para pegar código movido e reescrito. O teste cobra exatamente esse comportamento.

Fixture real nova: `fixtures/c5/m_997_movido/` (ticket.patch = `git diff 3543cc9a1...af11b9fa3 -- <page.tsx>`; commit.patch = `git show 2c76b10f7 -- . :!docs/fila` **inteiro**, porque a readição pode cair em qualquer arquivo). Gerada pelo `extrair.py` e registrada no `ORIGEM.tsv`. Merge 6b7f8aeac, frente af11b9fa3.

**Vermelho** (`tmp/v2-vermelho.txt`), com o `c5.py` da volta 1:

```
$ python3 -I test_c5.py -v ; echo rc=$?
rc=1
...
test_linha_readicionada_pelo_mesmo_commit_nao_conta (__main__.Reais) ... FAIL
...
FAIL: test_linha_readicionada_pelo_mesmo_commit_nao_conta (__main__.Reais)
  File "/Users/lucasantos/orq-sessoes/medicao-comarka/test_c5.py", line 71, in test_linha_readicionada_pelo_mesmo_commit_nao_conta
    self.assertEqual(linhas[0]["linhas"], j["esperado"]["linhas"])
AssertionError: 5 != 4
Ran 10 tests in 0.010s
FAILED (failures=1)
```

**Mudança** (sem cópia da versão anterior do `c5.py`, então vão as linhas antes e depois):

```diff
 # c5.py, docstring
+Linha que o mesmo commit apaga e readiciona igual, em qualquer arquivo, nao conta (codigo movido).
 # c5.py
-def _comum(removidas, adicionadas):
-    return {f: v for f, v in ((f, removidas[f] & adicionadas[f]) for f in removidas if f in adicionadas) if v}
+def _comum(removidas, adicionadas, readicionadas=frozenset()):
+    return {f: v for f, v in ((f, (removidas[f] & adicionadas[f]) - readicionadas) for f in removidas if f in adicionadas) if v}
-            comum = _comum(c["removidas"], t["adicionadas"])
+            comum = _comum(c["removidas"], t["adicionadas"], set().union(*(c.get("adicionadas") or {}).values()))
 # medir.sh (seção 8b): o git show do commit vira variável e entrega também as linhas '+'
-    fora.append({... "removidas": c5.linhas_diff(git("show", ..., c["h"], "--", ".", ":!docs/fila"), "-")})
+    show = git("show", "--no-color", "--format=", c["h"], "--", ".", ":!docs/fila")
+    fora.append({... "removidas": c5.linhas_diff(show, "-"), "adicionadas": c5.linhas_diff(show, "+")})
 # test_c5.py: commit() passa "adicionadas"; teste novo test_linha_readicionada_pelo_mesmo_commit_nao_conta
```

A regra vale para commit fora do loop (`fix_na_linha`, `linha_sem_fix` e ritual), não para `ticket_conserto`, que compara o merge de um ticket novo. `diff -u medir.sh.bak-2410 medir.sh` completo em `tmp/v2-medir.diff` (+95 −1; a volta 1 era +94 −1). `c5.py` 125 linhas, `test_c5.py` 144.

**Verde e asserts nas duas janelas.** Referências do script antigo: `tmp/base-ate1023/` (14 dias) e `tmp/base20-ate1023/` (20 dias, gravada nesta volta com `bash medir.sh.bak-2410 20 --ate 2026-10-23`). Saídas da volta 1 guardadas em `tmp/v1-14d-ate1023/` e `tmp/v1-20d-ate1023/`.

```
$ bash medir.sh 14 --ate 2026-10-23 ; echo rc   -> ok .../out/14d: tickets=613 intervencoes=334 loop=14 playbook=50   rc14=0
$ bash medir.sh 20 --ate 2026-10-23 ; echo rc   -> ok .../out/20d: tickets=741 intervencoes=447 loop=20 playbook=50   rc20=0
14 tickets identico / 14 intervencoes identico / 14 loop identico / 14 playbook identico
14 novas: ['C5', 'C5_parcial', 'ritual'] removidas: [] antigas iguais: True C2: 458 609 75.2
20 tickets identico / 20 intervencoes identico / 20 loop identico / 20 playbook identico
20 novas: ['C5', 'C5_parcial', 'ritual'] removidas: [] antigas iguais: True C2: 545 736 74.0
```

**O que a regra mudou nos fortes (volta 1 → volta 2):**

| Janela | Saiu do forte | Linhas a menos nos que ficaram |
|---|---|---|
| oficial 26/09 a 09/10 | **741** × 80a212fdb vira `fix_no_arquivo` (era FP na P4). Três `linha_sem_fix` somem (648 × 33737ed71, 653 × c43255de2, 744 × 1cd373f5f) | 694: 73→24, 762: 66→38, 763: 50→34, 715: 11→4, 740: 11→5 e outros; todos seguem fortes |
| parcial 04 a 17/10 | 741 e **898c** × 10c88edb9 (era "?") viram `fix_no_arquivo` | 997: 5→4, 1303: 31→23, 952b: 4→3 |
| parcial 10 a 23/10 | 898c e 1323 × ac83a7777 viram `fix_no_arquivo` | 997, 1303, 952b como acima |

## P3, volta 2

**Oficial: coorte madura 26/09 a 09/10** (`medir.sh 14 --ate 2026-10-23`, todos com 14 dias):

| loop | done | saiu_de_done | revert | ticket_conserto | fix_na_linha | fracos (sem forte) | ritual | **C5** | C2 da coorte | C2 sem retrabalho forte |
|---|---|---|---|---|---|---|---|---|---|---|
| plataforma | 225 | 0 | 0 | 0 | 17 | 48 | 6 | **7,6% (17)** | 69,3% (156) | 66,2% (149) |
| apolo | 0 | — | — | — | — | — | — | — | — | — |
| total | 225 | 0 | 0 | 0 | 17 | 48 | 6 | **7,6% (17)** | 69,3% (156) | 66,2% (149) |

**PARCIAL: 04 a 17/10** (`medir.sh 20 --ate 2026-10-23`, done até 17/10):

| loop | done | fix_na_linha | fracos (sem forte) | ritual | C5 parcial | C2 da coorte | C2 sem retrabalho forte | dias acomp. mín/mediana |
|---|---|---|---|---|---|---|---|---|
| plataforma | 422 | 26 | 38 | 10 | 6,2% (26) | 71,3% (301) | 68,0% (287) | 6 / 11 |
| apolo | 136 | 0 | 3 | 34 | 0,0% (0) | 82,4% (112) | 82,4% (112) | 6 / 6 |
| total | 558 | 26 | 41 | 44 | 4,7% (26) | **74,0% (413)** | 71,5% (399) | 6 / 10 |

**PARCIAL: 10 a 23/10** (`C5_parcial` de `medir.sh 14 --ate 2026-10-23`):

| loop | done | fix_na_linha | fracos (sem forte) | ritual | C5 parcial | C2 da coorte | C2 sem retrabalho forte | dias acomp. mín/mediana |
|---|---|---|---|---|---|---|---|---|
| plataforma | 436 | 15 | 22 | 4 | 3,4% (15) | 71,8% (313) | 69,7% (304) | 1 / 7 |
| apolo | 173 | 0 | 3 | 34 | 0,0% (0) | 83,8% (145) | 83,8% (145) | 3 / 6 |
| total | 609 | 15 | 25 | 38 | 2,5% (15) | 75,2% (458) | 73,7% (449) | 1 / 6 |

Saiu_de_done, revert e ticket_conserto seguem 0 nas três janelas.

**C2 inflado:** oficial **7 de 156**, sem mudança (666b, 734, 763, 699, 705, 861, 740; o 741 não era aprovado de primeira). Parcial de 04 a 17/10: **14 de 413** (sai o 898c): 763, 699, 705, 861, 740, 952b, 974, 982, 954, 908, 318b, 938, 997, 1301.

## P4, volta 2 (classes mantidas)

Universo: 31 tickets com forte (eram 33; saem 741 e 898c).

| classe | volta 1 | volta 2 | quem |
|---|---|---|---|
| D | 20 | **20** | sem mudança |
| R | 6 | **6** | 666b, 744, 952b, 954, 982, 1301 |
| FP | 4 | **3** | 826, 908, 997 (741 saiu pela regra nova) |
| ? | 3 | **2 fortes + 1 fraco** | 318b e 938 continuam fortes; 898c virou fraco. **Os três seguem fora do corpus até o Lucas responder.** |

## 5. Corpus do juiz v0

`levantamento-2410/corpus-juiz-v0.tsv`, gerado por `levantamento-2410/corpus.py` (só `git log`, `rev-parse`, `merge-base`). Colunas: `id, sha_aprovado, merge, base, sha_conserto, padrao, defeito`, todos com sha completo no arquivo. `base` = merge-base(staging no momento do merge, frente), ou seja, o diff `base...sha_aprovado` que o juiz julgou. Não rodei o juiz.

16 linhas, todas D com "sim" na coluna "visível no diff aprovado" da P4. Ficaram fora as D "em parte" (711a, 735, 928, 983), as R, os FP e os "?".

| id | aprovado | merge | base | conserto | padrão |
|---|---|---|---|---|---|
| 715 | 020e33ef9 | 3e6e3859c | 3eb240b61 | 80a212fdb | 1 |
| 734 | a8ea88e1a | 0d0134e64 | 1aa88303d | 80a212fdb; a2cd69ec8 | 1;2 |
| 740 | 6c6449993 | 64279a610 | 09b11dd25 | 29afed53d | 1 |
| 741a | e006c6b19 | 553df03b9 | e202b050f | 80a212fdb | 1;2 |
| 861 | a9114d6a8 | 09b11dd25 | a6432bbfb | 80a212fdb | 1 |
| 694 | 03f0d77f0 | 23af23686 | 7a69328f3 | a2cd69ec8 | 2 |
| 699 | 419a92762 | 77cb74ea8 | 1042bdeb4 | a2cd69ec8 | 2 |
| 705 | ad532d736 | 8a235c76e | c8131ff08 | a2cd69ec8 | 2 |
| 763 | 652f46458 | 915d44ad1 | f373db674 | da1f4f1ce | 2 |
| 737 | e79eaf5ad | ca77c75cf | d9bb12d48 | 85a69a377 | 3 |
| 924c | 788f92272 | 8ee824e59 | a0b083940 | 5912a0dfd | 4 |
| 953 | 52f3ffc80 | 3b5c52916 | 25e80c0f6 | 10c88edb9 | 5 |
| 761 | b548169e8 | 29b41f579 | 7699b4990 | da1f4f1ce | – |
| 762 | 3179addba | f373db674 | 755d1511b | da1f4f1ce | – |
| 974 | c4a7986cf | 273a0c473 | ef7cc18a0 | 10c88edb9 | – |
| 1303 | 354ab5945 | 63d184cbc | 56b379bec | ac83a7777; 2c76b10f7 | – |

Padrões: 1 teto de 1000 linhas do servidor com `.limit` maior; 2 consulta em série por item; 3 id do notion × id do OS; 4 campo legado lido como fonte; 5 data sem o dia de SP. **4 linhas não cabem nos 5 padrões e saem com "–":** 761 e 762 (falha do backfill engolida sem registro para a retomada), 974 (estado em memória numa função serverless) e 1303 (corrida na troca de aba). Ficaram no corpus porque são D e visíveis; se o corpus só aceita os padrões 1 a 5, são 4 linhas a tirar.

## 3 e 4. REVIEW.md v1 com seis seções

Os textos estão em arquivos para medir de verdade: `levantamento-2410/REVIEW-comarka-v1.md` e `levantamento-2410/REVIEW-dashboard-v1.md`. Substituem as versões do bloco da P5 da volta 1.

```
$ wc -l -c REVIEW-comarka-v1.md REVIEW-dashboard-v1.md
      59    4180 REVIEW-comarka-v1.md
      59    4001 REVIEW-dashboard-v1.md
```

As duas cabem no teto de 150 linhas e 8 KB, com folga (59 linhas e 4,1 KB e 4,0 KB). O que mudou em relação à volta 1:

- **Comarka:**
  - **Seção 2** agora diz explicitamente: "o servidor do Supabase devolve no máximo 1000 linhas por chamada, e o código pede `.limit(N)` com N maior que 1000 (ou nenhum limite) sem paginar com `.range`". O "reprove se" ganhou "ou se há `.limit` acima de 1000 lendo tabela que cresce".
  - **Seção 5, "Consulta em série por item":** fontes a2cd69ec8 (34 → 108 consultas de 3 para 40 clientes), da1f4f1ce (~2 s por item) e 80a212fdb (contatos cliente a cliente).
  - **Seção 6, "Data comparada sem o dia de São Paulo":** 10c88edb9 (ticket 953, `d >= periodo.from && d < aposTo`), mais o dashboard 6213cdc8 (`getMonth()` em BRT) como segundo exemplo.
- **Dashboard:**
  - **Seção 4 entra**, com fonte em `~/orq-sessoes/relatorio-dc-orq-conteudo.md` (mapa de dono de 22/10, decisão L2; tabela "Zona protegida", por volta da linha 603, e a varredura de escritas nas linhas 81-88). "Dentro": C0 analítico, as 7 `meta_*` do OS por nome, `perf_*` e `ia_prompts`. "Fora" e permitido: `ghl_comercial` e `dashboard_readonly`.
  - **Seções 5 e 6 entram** com as fontes do Comarka (mesmo banco e mesma stack); a 6 usa também o 6213cdc8, que é do próprio dashboard.
  - **Seção 2** também deixa explícito o teto de 1000.

## Fechamento da volta 2 (saída crua)

```
$ python3 -I test_c5.py -v ; echo rc=$?
test_dias_acompanhados_tem_teto_14 (__main__.Janela) ... ok
test_fora_dos_14_dias_ou_depois_do_corte_nao_conta (__main__.Janela) ... ok
test_arquivo_quente_derruba_so_o_fix_no_arquivo (__main__.Reais) ... ok
test_cada_caso_real (__main__.Reais) ... ok
test_citacao_de_lote_nao_e_ticket_conserto (__main__.Reais) ... ok
test_linha_readicionada_pelo_mesmo_commit_nao_conta (__main__.Reais) ... ok
test_por_loop_e_c2_inflado (__main__.Resumo) ... ok
test_s_revert_de_sha_do_ticket (__main__.Sinteticos) ... ok
test_s_saiu_de_done (__main__.Sinteticos) ... ok
test_s_ticket_conserto_com_linha_do_ticket (__main__.Sinteticos) ... ok
----------------------------------------------------------------------
Ran 10 tests in 0.020s
OK
testes rc=0

$ bash medir.sh 14 ; echo rc=$?
ok /Users/lucasantos/orq-sessoes/medicao-comarka/out/14d: tickets=613 intervencoes=334 loop=14 playbook=50
medir rc=0
(tickets, intervencoes, loop e playbook .csv: cmp idêntico a tmp/base-ate1023)
```

Não rodei `medir.sh 30` nem o juiz. Escrevi só na pasta da medição: `c5.py`, `test_c5.py`, `medir.sh`, `fixtures/c5/` (extrair.py, m_997_movido/, ORIGEM.tsv), `levantamento-2410/` (corpus.py, corpus-juiz-v0.tsv, REVIEW-*-v1.md), `out/14d`, `out/20d` e `tmp/` (v1-*, base20-ate1023, v2-*). Fora isso, só este relatório. Comarka, kit, dashboard e `~/.orq/` ficaram só em leitura.

**Decisão final do Lucas (24/10):** o 997 fica como falso positivo conhecido, sem regra nova. 761, 762, 974 e 1303 ficam no `corpus-juiz-v0.tsv` com padrão `outro` no lugar de `-`; só o tsv foi editado, sem rodar nada (o `corpus.py` ainda gera `-`). As perguntas abaixo ficam respondidas.

## Perguntas abertas da volta 2

1. **997:** a regra pedida não o tira (4 de 5 linhas voltam reescritas). Ele fica como FP conhecido, ou quer uma regra para código movido e reescrito?
2. **Corpus:** as 4 linhas sem padrão (761, 762, 974, 1303) ficam com "–" ou saem do v0?
3. **"?":** 318b e 938 continuam fortes e fora do corpus; 898c virou fraco com a regra nova.
