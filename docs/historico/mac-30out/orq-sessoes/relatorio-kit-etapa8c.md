# Etapa 8c · teste vizinho liberado só quando falha · PASSO 0 (leitura)

Worktree `~/Projetos/_worktrees/kit-vizinhos-8c`, branch `kit/vizinhos-8c`, HEAD `0917131` (= `main`). Nada escrito no kit. Este relatório é a única escrita fora do scratchpad.

Comarka lido em `main b01d9d5`, só com `GIT_OPTIONAL_LOCKS=0` e `log`, `show`, `cat-file`, `ls-tree`, `rev-parse`, mais leitura de arquivo em `docs/fila/runs/*`. `~/.orq/` só lido (`resolvedor/ledger.jsonl`). Sem pausa e sem launchctl.

**A 8b não está na `main`.** `git merge-base --is-ancestor kit/etapa8a main` → falso. A `kit/etapa8a` tem `9b0addc 8b-1` commitado, e o worktree dela tem P2 a P4 sem commit (`resolvedor/acoes.ts`, `desfazer.ts`, `modos.ts`, `repo.ts`, `test/orquestrador-resolvedor-branch.test.ts`). As peças desta etapa esperam o merge.

Scripts e saídas (efêmeros) em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-vizinhos-8c/a197e23c-d104-411a-86f1-4664c6c363f7/scratchpad/`: `replay.py` → `replay.json`, `ligacao.ts` → `ligacao.json`, `afrouxa.py` → `afrouxa-full.txt`, `dirbarra.py`.

## 0. Resumo em 10 linhas

1. **Replay dos 19 casos:** a regra do 457856c amplia em **10** e cobre o resgate em **9**. A 8a estimou "cerca de 12". O 10º, o 762, amplia o teste errado: o resgate pôs `src/middleware.ts`, e liberar o teste convida o afrouxamento.
2. **Com a ligação da C11 v2 do kit (`testesVizinhos`) no lugar do `teste_cita`, amplia em 12 e cobre em 11.** Ela pega 924a e 855 (que leem caminho por `join(...)` e `dir + "x.tsx"`, coisa que o `teste_cita` não vê) e não pega o 762. O único que amplia sem cobrir é o 826 (o resgate foi spec nova).
3. **No kit, hoje, o caso vizinho nem chega a ser tratado: vira `base_vermelha` e bloqueia direto** (ticket 632, `executor.sh:1072-1098`). "Todo FAIL fora do diff e da allowlist" é exatamente a forma do vizinho. Daí o triador classifica D5 e o resolvedor só avisa. A ampliação tem de entrar **antes** da base vermelha.
4. **As duas ampliações reais do 457856c que não fecharam (1256, 1373) consertaram o teste e caíram no critério de lista fechada** (`SO_ALLOWLIST`, saída `FORA_test/ia-funcoes-agentes-atendimento.test.ts`). **Os 19 casos e os 3 reais têm esse critério.** Sem derivar o critério na tentativa ampliada, a ampliação morre aí. O `r1.ts` já faz isso no conserto permanente (passo 2).
5. **No kit, a ampliação precisa valer para o resto das tentativas do ticket, não só a seguinte.** A worktree é reaproveitada e o diff é medido contra a base do ticket (`executor.sh:1529`). Se a tentativa 3 perder a permissão, o enforcement barra o teste já editado na 2 e o ticket vira `refatiar`.
6. **Ação dupla real: 1373.** Foi ampliado em duas drenagens (o "uma vez por ticket" do 457856c é por chamada do `drive_ticket` e depende de `max_retries=2`), bloqueou, e o R1 D6 do resolvedor agiu às 14:25Z.
7. **Anti-afrouxamento mecânico:** 6 regras de contagem **líquida** (it/test, expect, skip/only/todo, matcher genérico, comentado, arquivo apagado) reprovam **0 de 33** arquivos de teste dos resgates e dos 4 consertos legítimos. A forma ingênua ("apagou linha com expect") reprovaria 19. Nenhuma regra pega o afrouxamento do tipo 762 (mexer no dado, não na asserção): esse fica com o juiz.
8. **`dir/`:** 4 done do Comarka têm `dir/` na allowlist. **1 muda de veredito** (295, o caso do comentário do `enforcement-core.ts` do Comarka). O conserto cabe em 3 linhas, em `matchesAllowlist`.
9. **Escopo:** a peça precisa de `decisao-cli.ts` (subcomando) e, para garantir que não haja ação dupla, de 1 a 3 linhas em `triador/extrair.ts`. Os dois estão fora da lista de escrita (perguntas 5 e 6).
10. **Conflito com a 8b:** nenhum conflito de texto previsto em `executor.sh` e `lib.sh` com o `9b0addc`. `local-loop.sh` não é tocado. Docs (PECAS, CHANGELOG, CONTRATO) vão conflitar por acréscimo.

## 1. Pergunta, resposta, arquivo:linha

### 1a. O 457856c no Comarka (item 1)

| pergunta | resposta | arquivo:linha (Comarka `b01d9d5`) |
|---|---|---|
| Como lê o FAIL | `vitest_arquivos_falhos`: tira ANSI e pega `^\s*FAIL\s+<arquivo>`, `sort -u` | `lib.sh:771-774` |
| Quando decide | Só no fail-fast do gate vitest, que vem depois do enforcement e do tsc e **antes dos critérios**. Só se a tentativa atual **não** veio ampliada (`-z "$ampliada"`) | `executor.sh:678-692` |
| Candidatos | `decide_vizinhos`: itens da allowlist sem `*` e sem `/` final, mais os arquivos do diff `base...HEAD` que casam a allowlist (`casa_allowlist`, com `*` atravessando `/` e `dir/` virando `dir/**`) | `executor.sh:440-451`; `lib.sh:778-789` |
| Como liga teste a candidato | `teste_cita`: o teste contém, **seguido de aspas** (`'`, `"`, crase), o caminho, o caminho sem extensão e sem `/index`, ou `@/` + o caminho sem `src/`. É string pura, sem resolver import | `lib.sh:792-802` |
| Quando amplia | **Todo** FAIL tem de estar fora da allowlist, ser teste (`test/*` ou `*.test/spec.ts(x)`) e citar um candidato. Um que falhe a condição cancela tudo, com `VIZ_MOTIVO` | `lib.sh:812-836` |
| O que vai para o executor | Na allowlist do prompt, cada teste com `[AMPLIADA só nesta tentativa...]`. Depois um bloco "TESTES VIZINHOS QUEBRADOS" com o FAIL, o erro e o local (até 40 linhas por arquivo, do `FAIL` até o `⎯`, mais o primeiro `❯ arquivo:L:C`). Depois a REGRA ANTI-AFROUXAMENTO, **só em texto** | `executor.sh:66-76`, `:128-140`; `lib.sh:838-848` |
| O que vai para o juiz | Se `rundir/allowlist-ampliada.txt` existe, um bloco com a lista e a regra: `aprovado=false` se apagar teste ou expect, usar `.skip/.only/.todo`, trocar asserção específica por genérica, ou mudar o valor esperado sem o objetivo exigir | `avaliador.sh:101-112` |
| Enforcement | `--allowlist-extra <arquivo>` soma as linhas à allowlist **só naquela execução**. Não há regra mecânica de afrouxamento | `enforcement.sh:8-11`, `:26`, `:35-38`, `:43`; chamada em `executor.sh:645` |
| Onde fica o "uma vez por ticket" | `VIZ_PROX` (global) é armado na decisão e consumido e zerado no `run_ticket` seguinte (`:518-525`), e zerado no começo do `drive_ticket` (`:764`). Na prática é "nunca em duas tentativas seguidas, dentro de uma chamada do drive". Com `max_retries=2` (Comarka `000-config.json:5`) isso dá uma vez. Numa nova drenagem, ele amplia de novo: o **1373 foi ampliado duas vezes** (`attempt-2.prev1` e `attempt-2`, ambos com `allowlist-ampliada.txt`) | `executor.sh:56-58`, `:518-525`, `:684`, `:764` |
| A tentativa ampliada conta? | **Sim.** `reprovado` faz `retries++`/`attempt++` como qualquer reprovação. O circuit breaker compara `norm_motivo`, e o motivo da ampliação é outro texto, então não dispara na 2ª | `executor.sh:777-804`; `lib.sh:699-702` |
| A worktree da tentativa ampliada | É recriada do zero a cada tentativa. A edição do teste da tentativa 2 **some** na 3 | `executor.sh` (`setup_worktree` em `run_ticket`) |
| Desfecho real desde 17/10 | **1327:** ampliou, e a tentativa 2 passou (o agente consertou o próprio teste novo; o bloco FAIL bastou). **1256** e **1373:** a tentativa ampliada deixou o vitest verde e reprovou no critério `SO_ALLOWLIST` com `FORA_<teste ampliado>`; a 3 voltou vermelha. O 1373 só fechou depois do R1 D6 do resolvedor | `runs/1327/attempt-2`, `runs/1256/attempt-3/criterios.txt:9-16`, `runs/1373/attempt-2/criterios.txt:9-16`; ledger 1373 `acao D6` 2026-10-18T14:25:50Z |

### 1b. O caminho equivalente no kit (item 2)

| pergunta | resposta | arquivo:linha (kit `0917131`) |
|---|---|---|
| Ordem da tentativa | agente → diff → retry sem mudança → **enforcement** → **gates** → **critérios** → base vermelha → juiz → `decisao desfecho` | `executor.sh:949-1152` |
| Como o enforcement recebe a allowlist | `enforcement.sh` monta `{changedFiles, allowlist: ticket.pathspec_allowlist, diff, config}`. O core aplica `matchesAllowlist` em cada arquivo do diff. **Não há** `--allowlist-extra` | `enforcement.sh:33-63`; `enforcement-core.ts:655-662` |
| Glob da allowlist | `globToRegExp`: `*` não atravessa `/`, `**` atravessa. **`dir/` não é normalizado** | `enforcement-core.ts:149-180` |
| Onde o gate vitest reprova | `gates.ts --run-cli` grava `gates.txt`; `gates_rc != 0`; o papel do gate que caiu vai em `papel_falho` | `executor.sh:1057-1070` |
| Base vermelha (ticket 632) | Com enforcement ok, critérios verdes, só gate de papel `testes` reprovado e **todo FAIL fora do diff e da allowlist**: `RESULT=bloqueado`, sem juiz, sem retry, sem consumir tentativa | `executor.sh:1072-1098`; `decisao.ts:750-782`; bloqueio em `executor.sh:1425-1434` |
| **O vizinho hoje no kit** | O teste vizinho vermelho é, por definição, FAIL fora do diff e da allowlist. **Cai na base vermelha e bloqueia na 1ª tentativa.** Se algum critério também falhou, vai pelo caminho normal: `criteriosFalhos += "gates reprovados"` → `reprovado criterio_qualidade` → retry com o diagnóstico | `executor.sh:1081`, `:1134-1136`; `decisao.ts:488-497` |
| Como a reprova volta para o retry | `decisao retry` (`decidirRetry`) decide o modelo. `MOTIVO_ANTERIOR` = `diagnostico_retry` (JSON do `diagnostico.ts`, com `fora_da_allowlist` = arquivos de teste citados no bloco que a allowlist não cobre). Ele entra no prompt como "REPROVAÇÃO ANTERIOR" | `executor.sh:1508-1524`, `:1194-1220`, `:423-425`; `diagnostico.ts:9`, `:187`, `:235` |
| Tentativas | `max_retries: 2` no template, ou seja, 3 tentativas. São persistidas no ticket (`tentativas`), e só reprovação consome. `decidirRetry` bloqueia com `tentativaAtual >= max_retries` | `fixture/docs/fila/000-config.json:11`; `executor.sh:1409`, `:1420`; `decisao.ts:557-559` |
| Causa sem regra de retry | `decidirRetry` devolve `bloquear` ("sem regra de retry para a causa") | `decisao.ts:560-563` |
| Enforcement reprovado | `refatiar` com causa `enforcement`, que gera decisão pendente "ampliar ou fatiar". Exceção: arquivo solto (631) | `decisao.ts:458-479` |
| Worktree no retry | Reaproveitada se o enforcement passou. O diff, o enforcement e o juiz medem contra `base_ticket`, ou seja, **o trabalho inteiro**, não a correção da vez | `executor.sh:1527-1540`, comentário `:1240-1270` |
| Corte de repetição | 2ª reprovação com o mesmo `sub` e o mesmo diff bloqueia | `executor.sh:1497-1505` |
| Juiz | Só com tudo verde. Recebe a allowlist do ticket. O bloco `ANTI_AFROUXAMENTO` entra **sozinho** quando a allowlist tem arquivo de teste (`tocaTeste`) | `executor.sh:707-786`, payload `:738-748`; `juiz.ts:120-122`, `:153-160`, `:438-466` |
| R1 do resolvedor (depois do bloqueio) | O triador classifica. **D6:** o mesmo vermelho fora da allowlist e do diff, acoplado, em ≥ 2 tentativas → `R1` firme. **D6b:** o enforcement da última barrou só aquele teste, que estava vermelho fora na tentativa anterior → `R1` firme. Em `auto`, o `r1.ts` põe o teste no fim da allowlist, acrescenta o caminho a todo critério que lista a allowlist fechada, insere a guarda de contagem (`it(`+`test(` ≥ N, `expect(` ≥ M, zero skip/only/todo) e reabre | `triador/extrair.ts:250-293`; `resolvedor/decidir.ts:48-49`; `resolvedor/r1.ts:1-24`, `:60-87`, `:136-190` |
| Base vermelha no triador | `base_vermelha_motor` (lido da trilha do kit) → D5 → `R5`, só aviso | `triador/extrair.ts:235-239`; `triador/leitor-kit.ts:222`; `resolvedor/decidir.ts:52` |
| Onde a ampliação entra | (a) No `run_attempt`, **antes do bloco da base vermelha** (`executor.sh:1072`), com o mesmo pré-requisito (enforcement ok, só gate de papel `testes`, sem `reexecutar`), mas **sem exigir critério verde**. (b) No `drive_ticket`, ao reprovar: trilha e arquivo de ampliação do ticket. (c) Nas tentativas seguintes: prompt, enforcement (`--allowlist-extra`), critérios de lista fechada e juiz | — |
| O que ela não pode quebrar | Base vermelha verdadeira (FAIL sem ligação continua bloqueando como hoje); `retry_sem_mudanca`; corte de repetição; "só reprovação consome"; `ENF_OK` e reaproveitamento de worktree; o prompt do juiz byte a byte quando não há ampliação; o vocabulário da trilha (evento novo, sem mudar os existentes); a lista de campos do motor da 8b (a ampliação **não** grava campo no ticket) | — |

## 2. Item 3 · replay dos 19 casos

Para cada caso: a última versão do ticket antes do commit de resgate (o primeiro em que o teste do gabarito entra na allowlist) e a **primeira** tentativa antes do resgate com FAIL legível no `gate-vitest.txt`. A ligação foi medida na árvore do `head.txt` da tentativa, porque o agente não toca teste fora da allowlist. Gabarito = `gt.json` da 8a, exceto 762: o resgate `09e85d2` pôs `src/middleware.ts`, nenhum teste, e a versão que rodou é a `ef7dea4`.

Colunas:
- **457856c:** a regra literal (`teste_cita`).
- **C11:** todo FAIL está em `testesVizinhos(allowlist, árvore)` do `gate-ticket.ts` (import direto resolvido mais citação, itens de `src/`).

| id | tentativa | FAILs | amplia (457856c) | motivo | amplia (C11) | cobre o resgate |
|---|---|---|---|---|---|---|
| 762 | attempt-1.prev1 | cron-paths-vercel | **sim** | lê `join(__dirname,"..","vercel.json")`; `vercel.json` está na allowlist | não (item fora de `src/`) | **não**: o resgate pôs `src/middleware.ts`. O teste exige o middleware, então liberar o teste só abre a porta para o afrouxamento |
| 856 | — | — (as tentativas antes do `9d7ef4d` foram sobrescritas; o que sobrou é o `attempt-1` aprovado) | não | sem evidência; pela classe (o `rotas-orfas` varre diretório, igual ao 854), não ligaria | não | não |
| 711a | attempt-1.prev1 | sem-insumo | não | importa `@/components/estados/sem-insumo` (fora) e lê `join(SRC,…)`; não cita item | não | não |
| 950 | attempt-1.prev1 | etapa2-funil-motor | sim | importa `@/lib/qualificacao/motor` | sim | **sim** |
| 1006 | attempt-1.prev1 | quem-cuida | sim | cita `alertas-campanha/route` | sim | **sim** |
| 840 | attempt-1.prev1 (série de 10/10) | nps-reacao-resposta | sim | cita `api/nps/public/[token]/route.ts` | sim | **sim** |
| 924a | attempt-1.prev1 | conta-entregas-vazio-unico, visao-aceite-mockup | não | `conta-entregas` lê `dir + "financeiro-tab.tsx"` | **sim** | sim com C11 |
| 1054 | attempt-1.prev1 | resolver-cliente-rota-diagnostico, -resumo | sim | cada um cita a sua rota | sim | **sim** |
| 1055b | attempt-1.prev1 | acoes-recomendadas-chave, relatorio-sem-cliente-id | sim | `acoes/motor.ts`; rota `clientes-sem-cliente-id` | sim | **sim** |
| 1058 | attempt-1.prev1 | negocio-temperatura, quem-cuida | sim | rotas `temperatura-comercial` e `alertas-campanha` | sim | **sim** |
| 854 | attempt-1.prev1 | rotas-orfas | não | varre diretório | não | não |
| 966 | attempt-1.prev1 | ficha-nav-colapsavel | sim | cita `clientes/[id]/page.tsx` | sim | **sim** |
| 830 | attempt-2 | sai-identidade-removido | não | falha **dentro** da allowlist. O teste do resgate (`dono-dry-run`) nunca falhou no vitest: o executor saiu com diff 0 | não | não |
| 826 | attempt-1.prev1 | resumo-grupo-wpp-tela, rotas-fantasma-ficha | não | leem por `resolve(RAIZ,"src/…")` e `join` | **sim** | **não**: o resgate `90b5727` foi spec nova, com outros testes |
| 855 | attempt-1.prev1 | adocao-predicado | não | `join('src','app',…)` | **sim** | sim com C11 |
| 1059 | attempt-2.prev1 | leitores-carteira-casa-nova, leitores-ficha-casa-nova | sim | rotas `notion/clientes-filtrados` e `notion/clientes/[id]` | sim | **sim** |
| 1195 | — | nenhum (vitest verde; o juiz reprovou; na tentativa 2 o agente editou o teste e o enforcement barrou) | não | não é falha de vitest; é a D6b | não | não |
| 711b3 | attempt-2.prev1 | saude-motivo-sem-base, sem-insumo | não | `sem-insumo` não cita; tudo ou nada | não (`sem-insumo` fora da lista) | não |
| 1053 | attempt-1.prev1 | papel-nas-escritas | sim | cita `api/dashboard/clientes/route.ts` | sim | **sim** |

**Totais (19):**

| régua de ligação | amplia | cobre o resgate | amplia errado |
|---|---|---|---|
| 457856c (`teste_cita`) | **10** | **9** | 1 (762) |
| C11 v2 (`testesVizinhos`) | **12** | **11** | 1 (826, spec errada) |
| as duas (restringe: 457856c **e** C11) | 9 | 9 | 0 |
| qualquer uma (457856c **ou** C11) | 13 | 11 | 2 |

**Fora do alcance de qualquer régua:** 856 e 854 (varrem diretório), 711a e 711b3 (`sem-insumo`: contradição entre critério e teste, import de arquivo fora), 830 (diff 0) e 1195 (a reprova não foi de vitest).

## 3. Item 4 · anti-afrouxamento mecânico

Medido no diff de teste da **tentativa aprovada depois do resgate** (o conserto real), por arquivo, só nos testes que o resgate liberou (o gabarito). Nos 4 consertos legítimos (966, 854, 867, 840), em todo teste editado que já existia. São 33 arquivos em 18 tickets. O 762 e o 826 não editaram teste do gabarito. Contagem por linha, a mesma régua da guarda do `r1.ts:60-71`. "Líquida" = linhas removidas com o padrão > linhas acrescentadas com o padrão, ou seja, a contagem no HEAD cai em relação à base.

| regra (só nos testes ampliados) | resgates reais que reprovaria | quais |
|---|---|---|
| remove `it(`/`test(` (contagem líquida cai) | **0** | — |
| remove `expect(` (contagem líquida cai) | **0** | — |
| acrescenta `.skip(`/`.only(`/`.todo(`/`xit(`/`xtest(`/`xdescribe(` | **0** | — |
| acrescenta matcher genérico, líquido: `toBeDefined()`, `toBeTruthy()`, `toBeFalsy()`, `expect.any/anything/objectContaining/arrayContaining/stringContaining(`, `.toMatchObject(` | **0** | — |
| comenta linha com `it(`/`test(`/`expect(` | **0** | — |
| apaga o arquivo de teste | **0** | — |
| *(contraprova)* apaga **qualquer** linha com `expect(`, mesmo trocada | **19** | 856, 711a, 950, 840, 924a ×2, 1055b ×2, 966 ×2, 1195, 711b3 ×2, 1053, 867 ×5 |

Os consertos reais trocam a linha do `expect` (valor recalculado, `slice(-9,-5)`, contagem 20→21) e nunca diminuem a contagem: as 6 regras líquidas dão 0 reprovação nos 33 arquivos.

**Limite medido:** o 762 mostra o afrouxamento que nenhuma regra pega. O `cron-paths-vercel` tem uma lista `CRON_PENDENTES_REVISAO`, e pôr a rota nova nela faz o teste passar sem mexer no middleware. É dado, não asserção: fica para o juiz (bloco de prompt). Não há caso real de afrouxamento nos runs para controle positivo, então o vermelho da P3 usa diffs sintéticos sobre os testes reais (remover um `expect`, pôr `.skip`, trocar `toEqual` por `toBeDefined`).

## 4. Item 5 · `testes_vizinhos` restringe ou registra

| opção | amplia | cobre | o que muda no replay |
|---|---|---|---|
| só registra (ligação do 457856c) | 10 | 9 | amplia o 762, errado; perde 924a e 855 |
| restringe (amplia só FAIL que **está na lista** da C11) | 12 | 11 | ganha 924a e 855, perde o 762; amplia o 826 sem cobrir |
| restringe e exige o `teste_cita` também | 9 | 9 | o mais conservador; perde 924a e 855 |

**Recomendo restringir pela C11.** "Está na lista" já é a ligação mais forte medida (import resolvido mais citação por `join` e concatenação), é a mesma função que o gate usa no pré-voo (`gate-ticket.ts:1534`), e tira justamente o caso perigoso (762: item fora de `src/`). A lista é recalculada no executor, na árvore do `base_ticket`, com `lerArvoreAlvo` + `testesVizinhos` (ambas exportadas; não há mudança no `gate-ticket.ts`). Ela não é lida do `--relatorio` do pré-voo. É o mesmo resultado e não depende de o pré-voo ter gravado arquivo.

## 5. Item 6 · `dir/`

| onde o kit compara caminho com allowlist | função | muda ao normalizar em `matchesAllowlist`? |
|---|---|---|
| `enforcement-core.ts:661` (`enforce`, `fora_do_pathspec`) | `matchesAllowlist` | **sim**: `src/x/` passa a cobrir `src/x/a.ts` |
| `decisao.ts:780` (`arquivosBaseVermelha`) | `matchesAllowlist` | sim: teste sob `dir/` passa a ser "próprio" e deixa de ser base vermelha |
| `gate-ticket.ts:1544` (C11 v2, "teste dentro") | `matchesAllowlist` | sim: teste sob `dir/` deixa de ser vizinho |
| `gate-ticket.ts:1538` (C11 v2, expansão do item) | `globToRegExp` só se tem `*` | não. `dir/` segue como item literal, e os arquivos do diretório não viram itens. Fora do escopo; é aviso |
| `gate-ticket.ts:553-560` (6b, caminho do objetivo) e `:1867` (9w) | `globToRegExp` direto | não (avisos) |
| `diagnostico.ts:235` (`fora_da_allowlist` do retry) | `globToRegExp` direto | **não**. Ficaria incoerente: diria "fora" de um teste que o enforcement aceita. Fora do escopo (pergunta 5) |
| `resolvedor/sobreposicao.ts:65-66`, `triador/extrair.ts:121` | `matchesAllowlist` | sim, sem edição: a sobreposição de allowlists e o "dentro" do triador passam a ver `dir/` |

**Comarka:** 1266 done; **4** com `dir/` na allowlist (145, 154, 219, 295). **1 muda de veredito**: o 295 (`src/app/dashboard/clientes/[id]/tabs/`), cujos arquivos do diff aprovado (`alertas-cliente-tab.tsx`, `alertas-meta-tab.tsx`, `auditoria-tab.tsx`, `calculadora-tab.tsx`…) só casam com a normalização. É o caso que o próprio Comarka documenta (31 violações `fora_do_pathspec`, `enforcement-core.ts:78-87` dele). Os outros 3 não têm diff aprovado sob o `dir/`.

## 6. Item 7 · interação com o resolvedor

- **A ampliação resolve na tentativa seguinte:** o ticket vai a `aguardando_merge`. O resolvedor não o vê e o ledger não registra nada. A trilha (`events.log`) ganha `VIZINHO_AMPLIADO`.
- **Ela não resolve:** o ticket bloqueia (tentativas esgotadas, corte de repetição ou afrouxamento). O triador vê a série:
  - se o agente **editou** o teste ampliado, ele está no diff daquela tentativa, deixa de ser "fora da allowlist e do diff" e a D6 não fecha;
  - se **não** editou e o teste segue vermelho, ele está fora em ≥ 2 tentativas e a **D6 fecha: o R1 age sobre o mesmo teste**. É a ação dupla. O 1373 mostra que ela acontece hoje, com o 457856c no Comarka e o resolvedor do kit (ledger: `aviso R1 palpite` às 06:37Z e `acao D6` às 14:25Z).
- **Para garantir que não haja ação dupla,** o triador precisa saber que o teste já foi ampliado. A proposta é contar o teste listado no `allowlist-ampliada.txt` da tentativa como "coberto" naquela tentativa (`triador/extrair.ts:121`, `cobre`, 1 a 3 linhas, e o leitor do kit passando a lista). Ele sai de `fora_da_allowlist_e_do_diff`, a D6/D6b não fecham, e o bloqueio vai para aviso, ou seja, decisão humana. **`triador/` está fora do escopo de escrita** (pergunta 6). Sem isso, o que a etapa garante só pelo executor é: uma ampliação por versão do ticket, e o R1 depois dela, se vier, é a escalada permanente (guarda e critério de lista), não a mesma ação repetida.
- **Ledger:** a ampliação é do executor e não escreve no ledger, que é do resolvedor (`resolvedor/ledger.ts:1-16`). Com o ajuste no triador, um bloqueio depois da ampliação vira uma linha `aviso` com o motivo "teste já ampliado pelo executor". Sem o ajuste, vira `acao` R1 D6 (como o 1373) e depois `desfecho`.

## 7. Item 8 · conflito com a 8b

`git diff main...kit/etapa8a` (só o commit `9b0addc`):

| arquivo | a 8b toca | a 8c precisa tocar | conflito no rebase |
|---|---|---|---|
| `executor.sh` | `:63-64` (preflight, `CAMPOS_DO_MOTOR_FILE`); `:1336` (hash da versão do aviso do gate) | `build_prompt` `:350-427`; `run_criterios` `:446-497`; `run_juiz` payload `:738-748`; `run_attempt` enforcement `:1039-1040` e nova seção antes de `:1072`; `drive_ticket` depois de `:1416` e antes de `:1425`, e o retry `:1524-1540` | **nenhum de texto**. Um ponto semântico: o hash de versão do ticket (`:1336`) passa a vir de `campos-do-motor.json` na 8b. A 8c usa o mesmo hash para o "uma vez por versão", então usar a forma da 8b depois do rebase |
| `lib.sh` | `:267-385` (115 linhas novas depois de `ticket_zera_adiamentos_ambiente`); `ticket_commit` `:272-279` reescrito | funções pequenas (arquivo de ampliação do ticket, leitura da trilha) **no fim do arquivo** | nenhum, se ficar longe de `:267-390`. A ampliação **não** cria campo no ticket, então `campos-do-motor.json` não muda |
| `local-loop.sh` | `:812-823` (`autocommit_status_fila`) | nada | nenhum |
| `resolvedor/*` (P2 a P4 da 8b, sem commit) | `acoes.ts`, `desfazer.ts`, `modos.ts`, `repo.ts` | nada | nenhum |
| `CHANGELOG.md`, `docs/PECAS.md`, `CONTRATO.md` | a P5 da 8b vai acrescentar | P5 desta | **sim, por acréscimo** (resolve à mão no rebase) |

## 8. Desenho do fluxo no kit

```
run_attempt (tentativa k)
  agente → diff → retry_sem_mudanca
  enforcement.sh --allowlist-extra runs/<id>/allowlist-ampliada.txt   (vazio = como hoje)
      core: allowlist ∪ ampliados; nos ampliados, as 6 regras líquidas → violação `afrouxamento`
  gates → critérios (cmd de lista fechada ganha os ampliados, só na execução)
  7a NOVO · VIZINHO (antes da base vermelha)
      pré: ENF_OK=1, gate de papel `testes` reprovou, sem `reexecutar`,
           ticket sem ampliação nesta versão (trilha: VIZINHO_AMPLIADO hash=<versão>)
      decisao vizinhos {gatesTxt, arquivosDoDiff, allowlist, wt, base}
          falhos = arquivosFalhosDoVitest
          amplia ⇔ falhos ≠ ∅ e ∀f: ¬matchesAllowlist, ∉ diff, é teste, f ∈ testesVizinhos(allowlist, árvore@base)
          devolve {amplia, testes, pares, motivo, bloco FAIL (≤ 40 linhas por teste, mais o local ❯)}
      amplia → VIZINHOS armado; base vermelha e juiz pulados; segue p/ `decisao desfecho`
               (gates reprovados → reprovado criterio_qualidade → retry normal)
      não amplia → 7b base vermelha como hoje
  7b base vermelha (inalterada)
  7c juiz (payload ganha `ampliados` → bloco próprio; tocaTeste liga o ANTI_AFROUXAMENTO)
  8 decisão: violação só `afrouxamento` → reprovado causa `afrouxamento` (sem regra de retry → bloqueia)

drive_ticket
  depois do run_attempt, com VIZINHOS armado:
      grava runs/<id>/allowlist-ampliada.txt e runs/<id>/attempt-N/vizinhos.txt (o bloco)
      event <id> VIZINHO_AMPLIADO testes=… hash=<versão> attempt=…
  retry: MOTIVO_ANTERIOR = diagnóstico + bloco FAIL; build_prompt marca os ampliados e põe a regra
  a ampliação vale até o fim do drive (worktree reaproveitada, diff contra base_ticket)
  tentativas esgotadas antes de usar a ampliação → bloqueio normal, com os testes na nota
```

## 9. Plano das peças (teto de ~300 linhas cada, código + teste)

| peça | o quê | arquivos | pronto quando | teto |
|---|---|---|---|---|
| **P1** | `dir/` → `dir/**` em `matchesAllowlist` (exporta `normalizarEntradaAllowlist`, como o Comarka) | `enforcement-core.ts`; teste novo | o 295 real (allowlist e diff aprovado, recortados) passa no `enforce`; `arquivosBaseVermelha` trata teste sob `dir/` como próprio; `testesVizinhos` não lista teste sob `dir/`; `src/x/` casa `src/x/a.ts` e não casa `src/xy/a.ts` | ~100 |
| **P2a** | decisão pura: `decidirVizinhos`, `blocoFailVitest`, `cmdComAmpliados` (porte do passo 2 do `r1.ts`), mais o subcomando `decisao vizinhos` (lê a árvore do `base` com `lerArvoreAlvo`) | `decisao.ts`, **`decisao-cli.ts`** (pergunta 5), teste com fixtures | fixtures reais em `test/fixtures/vizinhos-8c/`: 950, 1054 e 1059 ampliam; 924a e 855 ampliam (ligação por `join`); 762 não amplia (item fora de `src/`); 854 e 711b3 não; 830 não (FAIL dentro); o bloco FAIL do 950 bate com o `gate-vitest.txt` real; o critério `SO_ALLOWLIST` do 1373 ganha o teste | ~300 |
| **P2b** | ligação: `enforcement.sh --allowlist-extra`; 7a no `run_attempt`; trilha e arquivo de ampliação no `drive_ticket`; `run_criterios` com `cmdComAmpliados`; uma vez por versão | `executor.sh`, `enforcement.sh`, `lib.sh`, `scripts/orquestrador/test-vizinho-8c.sh` (stub de agente, molde do `test-fixture-executor.sh`) | stub: tentativa 1 quebra o vizinho → não bloqueia por base vermelha → `VIZINHO_AMPLIADO` uma vez → tentativa 2 edita o teste → enforcement e lista fechada passam → aprovado. Um FAIL sem ligação segue `base_vermelha`. Na 2ª versão igual, não amplia | ~300 |
| **P3** | as 6 regras líquidas, **só** nos ampliados, tipo `afrouxamento`; `decisao.ts`: violação só de afrouxamento → `reprovado` causa `afrouxamento` (sem regra → bloqueia; nunca `refatiar`) | `enforcement-core.ts`, `decisao.ts`, teste | diff que remove `expect`, põe `.skip` ou troca por `toBeDefined` num ampliado reprova. Os 33 diffs reais do item 4 (recortados aos testes) passam. A mesma mudança em teste **não** ampliado não dispara | ~220 |
| **P4** | prompts: `build_prompt` marca os ampliados e põe o bloco FAIL e a regra; `juiz.ts` ganha `ampliados?` em `EntradaPrompt` e um bloco; `run_juiz` passa a lista | `executor.sh`, `juiz.ts` (só o bloco), teste | o prompt do juiz sem `ampliados` sai byte a byte igual; com `ampliados`, o bloco aparece. O prompt do executor só tem o bloco na tentativa ampliada | ~200 |
| **P5** | docs | `docs/PECAS.md`, `CHANGELOG.md`, `CONTRATO.md` (trilha `VIZINHO_AMPLIADO`, causa `afrouxamento`, a tabela do replay) | — | ~120 |

Ordem: P1, P2a, P2b, P3, P4, P5. Se o triador entrar (pergunta 6), vira a P2c (~60).

## 10. Perguntas que só o Lucas responde

1. **A tentativa ampliada conta como tentativa?** O Comarka conta. Recomendo **contar**: no replay, 9 de 10 ampliam já na 1ª tentativa e sobram 2. A alternativa (não consumir, como a base vermelha) dá uma tentativa a mais por ticket.
2. **Anti-afrouxamento: erro de enforcement ou só prompt?** Recomendo **erro mecânico** com as 6 regras líquidas (0 de 33 nos reais), causa `afrouxamento` que bloqueia sem retry, **mais** o bloco no juiz para o que o mecânico não vê (tipo 762).
3. **`testes_vizinhos` restringe ou só registra?** Recomendo **restringir pela C11** (12 ampliam, 11 cobrem, sai o 762). Alternativas no §4.
4. **`dir/` entra agora?** Recomendo **sim**, como P1: 3 linhas, 1 done do Comarka muda (295).
5. **Escopo:** posso escrever em `scripts/orquestrador/decisao-cli.ts` (o subcomando `vizinhos`, sem ele o executor não chama a decisão)? E em `diagnostico.ts:235` (1 linha, para o `fora_da_allowlist` do retry concordar com o `dir/`)?
6. **Ação dupla com o R1:** posso tocar `triador/extrair.ts` e `triador/leitor-kit.ts` (o teste ampliado conta como coberto, e o R1 não age nele)? Ou aceita que o R1 aja depois de uma ampliação que não fechou, como no 1373?
7. **Ampliação até o fim do drive** (minha proposta; obrigatória no kit por causa da worktree reaproveitada) em vez de "só a tentativa seguinte" do Comarka. Confirma?
8. **Critério de lista fechada derivado na execução** (o ampliado entra no `cmd` só durante a tentativa, sem editar o ticket). Confirma? Sem isso, os 22 casos medidos caem como o 1256 e o 1373.
9. **A ampliação antes da base vermelha:** uma base vermelha de verdade cujo teste importe arquivo da allowlist passaria a ser ampliada em vez de bloqueada. Aceita o risco (contido pelas regras e pelo juiz), ou quer o teste rodado na base antes de ampliar (custo: uma rodada do vitest nos arquivos falhos)?

**Paro aqui e espero o ok. Antes da primeira peça: a 8b precisa estar na `main` (hoje não está), depois `git rebase main` e o HEAD neste relatório.**

## 11. Decisões do Lucas (ok do PASSO 0)

1. A tentativa ampliada **conta** como tentativa.
2. Anti-afrouxamento é **erro mecânico de enforcement**: as 6 regras líquidas, só nos testes ampliados, causa `afrouxamento`, que bloqueia sem retry. Além disso, o bloco no juiz cobre o que o mecânico não vê (tipo 762).
3. `testes_vizinhos` **restringe**: só amplia FAIL que está em `testesVizinhos(allowlist, árvore do base_ticket)`.
4. `dir/` entra agora, como **P1**.
5. Escopo ampliado: `scripts/orquestrador/decisao-cli.ts` (subcomando `vizinhos`) e `diagnostico.ts:235` (`fora_da_allowlist` coerente com `dir/`).
6. Escopo ampliado: `triador/extrair.ts` e `triador/leitor-kit.ts`, como **P2c**:
   - teste listado no `allowlist-ampliada.txt` da tentativa conta como coberto;
   - bloqueio depois de uma ampliação que não fechou vira aviso "teste já ampliado pelo executor", nunca R1;
   - o vermelho usa o caso real do 1373.
7. A ampliação vale **até o fim do drive**.
8. O critério de lista fechada é **derivado na execução**, sem editar o ticket.
9. **Antes de ampliar:** rodar só os arquivos falhos do vitest na árvore do `base_ticket`.
   - Se também falham na base, segue `base_vermelha` como hoje e não amplia.
   - A trilha registra qual dos dois aconteceu.
   - O teste do stub inclui uma base vermelha verdadeira cujo teste importa arquivo da allowlist: esse caso não amplia.

Ordem: P1, P2a, P2b, P2c, P3, P4, P5.

Estado: a 8b ainda não está na `main`. Nenhum código escrito. Espero a mensagem "8b na main"; aí vêm `git rebase main`, o HEAD neste relatório e a P1.

## 12. Rebase sobre a 8b

"8b na main" recebida. `git log --oneline main` mostra `9b0addc` (8b-1) até `f592745` (8b-5). `git rebase main`: "Successfully rebased and updated refs/heads/kit/vizinhos-8c". **HEAD depois do rebase: `f592745`** (o branch não tinha commit próprio).

## 13. Peças

Fixtures em `test/fixtures/vizinhos-8c/` (origem em `ORIGEM.md`); teste em `test/orquestrador-vizinhos-8c.test.ts`. Saídas cruas no scratchpad, `pecas/`.

### P1 · `dir/` vale `dir/**` · commit `2ea7e0c`

- `enforcement-core.ts:178-189` (`normalizarEntradaAllowlist` em `:183`, `matchesAllowlist` em `:187`): `normalizarEntradaAllowlist` (porte do Comarka) dentro de `matchesAllowlist`. Enforcement (`:670`), base vermelha (`decisao.ts:780`) e C11 "dentro" (`gate-ticket.ts:1544`) seguem sem edição.
- `diagnostico.ts:234-238` (`cobre` em `:236`): `cobre` passa a usar `matchesAllowlist` (decisão 5).
- Caso real: 295 do Comarka, `attempt-1.prev1` (03/09 15:06, versão `7057ab0`). O motor do Comarka deu 41 `fora_do_pathspec`, sendo 31 de ruído sob `tabs/` e 10 testes de fato fora. A fixture original da `prev2` (31) foi trocada pela `prev1`, porque na `prev2` a allowlist do working tree já tinha os 10 testes e não batia com nenhuma versão commitada.

Vermelho (motor `f592745`):
```
   × 8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico) > 295 (caso real): das 41 violações do Comarka, somem as 31 sob tabs/ e ficam só os 10 testes de fato fora 4ms
   × 8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico) > src/x/ casa src/x/a.ts e src/x/b/c.ts; não casa src/xy/a.ts nem src/x 0ms
   × 8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico) > base vermelha: FAIL em teste sob um dir/ da allowlist é próprio do ticket 0ms
   × 8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico) > C11 (gate): teste sob um dir/ da allowlist não é vizinho 1ms
   × 8c-P1 · dir/ na allowlist vale dir/** (enforcement, base vermelha, C11 e diagnóstico) > diagnóstico do retry: teste sob um dir/ da allowlist não sai em fora_da_allowlist 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
      Tests  5 failed (5)
rc=1
```

Verde:
```
 ✓ test/orquestrador-vizinhos-8c.test.ts (5 tests) 3ms
      Tests  5 passed (5)
rc=0
```

`npx tsc --noEmit` rc=0. `TZ=UTC node_modules/.bin/vitest run`: `Test Files 102 passed (102)`, `Tests 1613 passed (1613)`, rc=0.

### P2a · decisão pura e `decisao vizinhos` · commit `3b82da1`

- `decisao.ts:813` `decidirVizinhos`: todo FAIL (`arquivosFalhosDoVitest`) tem de ser teste, fora da allowlist (`matchesAllowlist`), fora do diff e estar em `testesVizinhos`. Tudo ou nada, com o motivo do primeiro que não cumpre.
- `decisao.ts:846` `blocoFailVitest`: da linha `FAIL` do teste até o `⎯`, no máximo 40 linhas, mais `local: <teste>:L:C`, sem ANSI.
- `decisao.ts:870` `cmdComAmpliados`: o passo 2 do `r1.ts`. Critério que lista toda a allowlist entre aspas simples ganha os ampliados depois do último item.
- `decisao-cli.ts:126` subcomando `vizinhos`: `lerArvoreAlvo(worktree, base)` + `testesVizinhos` + `decidirVizinhos`; devolve `{amplia, testes, pares, motivo, bloco}`. Árvore ilegível sai rc 1. Importar o `gate-ticket.ts` não muda o tempo de partida do CLI (0,11 s contra 0,12 s, `decisao-cli.ts worktree`).
- Fixtures: 9 casos do replay e o 1373 (`ORIGEM.md`). O `gate-vitest.txt` é recortado de `⎯ Failed Tests` ao fim; o do 711b3 ficou só com as linhas FAIL, porque o recorte tinha 5959 linhas de DOM. As árvores reduzidas levam o sufixo `.fixture`, como na 8a: sem ele o `tsc` e o vitest liam o recorte como código, e o primeiro `tsc` desta peça saiu rc 2 por isso. A C11 dá nelas o mesmo resultado que nas árvores inteiras.
- 1373: a versão que rodou é a `6f94e84`. A `6c42ce9`, que o PASSO 0 citou, já é a versão depois do R1, com o teste na allowlist. O teste roda o cmd real num repo temporário: o original dá `FORA_test/ia-funcoes-agentes-atendimento.test.ts`, como na tentativa 2, e o derivado dá `SO_ALLOWLIST`.

Vermelho (motor `2ea7e0c`):
```
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 950 (caso real, o 457856c também ampliaria): amplia ["test/etapa2-funil-motor.test.ts"] 5ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 1054 (caso real, o 457856c também ampliaria): amplia ["test/resolver-cliente-rota-diagnostico.test.ts","test/resolver-cliente-rota-resumo.test.ts"] 2ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 1059 (caso real, o 457856c também ampliaria): amplia ["test/leitores-carteira-casa-nova.test.ts","test/leitores-ficha-casa-nova.test.ts"] 2ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 924a (caso real, o teste_cita do 457856c não liga; a C11 liga): amplia — conta-entregas lê dir + "financeiro-tab.tsx" 2ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 855 (caso real, o teste_cita do 457856c não liga; a C11 liga): amplia — adocao-predicado lê join('src', …) 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 762 (caso real): cron-paths-vercel só cita vercel.json, item fora de src/ — não amplia (o resgate foi src/middleware.ts) 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 854 (caso real): rotas-orfas varre diretório — não amplia 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 711b3 (caso real): tudo ou nada — saude-motivo-sem-base é vizinho, sem-insumo não; não amplia nenhum 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > 830 (caso real): o FAIL está dentro da allowlist — não amplia 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > sem FAIL legível: não amplia (vazio nunca vira "só vizinho") 1ms
   × 8c-P2a · decidirVizinhos: amplia só se todo FAIL é teste vizinho (C11) fora do diff e da allowlist > teste vizinho que está no diff não é "fora": não amplia 1ms
   × 8c-P2a · blocoFailVitest: o FAIL, o erro e o local de cada teste ampliado > 950 (gate-vitest.txt real): FAIL, a asserção e o local test/etapa2-funil-motor.test.ts:92:50, sem ANSI 1ms
   × 8c-P2a · blocoFailVitest: o FAIL, o erro e o local de cada teste ampliado > no máximo 40 linhas por teste 0ms
   × 8c-P2a · cmdComAmpliados: o critério de lista fechada aceita o teste ampliado, só na execução > 1373 (caso real): o cmd original dá FORA_<ampliado> como na tentativa 2; o derivado dá SO_ALLOWLIST 170ms
   × 8c-P2a · cmdComAmpliados: o critério de lista fechada aceita o teste ampliado, só na execução > cmd que não lista a allowlist inteira fica igual; ampliado que já está no cmd não entra de novo 0ms
   × 8c-P2a · decisao-cli vizinhos: lê a árvore do base_ticket e decide > 950 num repo de verdade (árvore reduzida commitada como base): amplia, com o bloco 221ms
   1      → subcomando desconhecido: vizinhos
   1 AssertionError: subcomando desconhecido: vizinhos
   1 TypeError: blocoFailVitest is not a function
   2 TypeError: cmdComAmpliados is not a function
   9 TypeError: decidirVizinhos is not a function
⎯⎯⎯⎯⎯⎯ Failed Tests 16 ⎯⎯⎯⎯⎯⎯⎯
      Tests  16 failed | 5 passed (21)
rc=1
```

Verde:
```
 ✓ test/orquestrador-vizinhos-8c.test.ts (21 tests) 679ms
   ✓ 8c-P2a · cmdComAmpliados: o critério de lista fechada aceita o teste ampliado, só na execução > 1373 (caso real): o cmd original dá FORA_<ampliado> como na tentativa 2; o derivado dá SO_ALLOWLIST 379ms
      Tests  21 passed (21)
rc=0
```

`npx tsc --noEmit` rc=0. `vitest run` inteiro: `Test Files 102 passed (102)`, `Tests 1629 passed (1629)`, rc=0.

### P2b-1 · ligação no executor · commit `c37bc6f`

A P2b foi dividida em duas: esta é a ligação; a P2b-2 é a conferência na árvore do `base_ticket` (decisão 9). Esta peça tem 117 linhas de motor e 222 de teste, pouco acima do teto de ~300.

- `executor.sh:1104` (seção 7a): antes da base vermelha. Com enforcement ok, só o gate de papel `testes` reprovado e nenhuma ampliação em curso, chama `decisao vizinhos` e grava `vizinhos.json` e `vizinhos.txt` (o bloco). Se a versão do ticket já tem `VIZINHO_AMPLIADO`, a tentativa reprova pelo caminho de hoje, sem virar base vermelha, e com "já ampliado" no motivo.
- `executor.sh:454` `criterios_da_tentativa`: com `allowlist-ampliada.txt` no rundir, o critério de lista fechada aceita os ampliados (`decisao criterios-ampliados`). Ele é montado fora do `< <(...)`: erro dentro da substituição morreria no subshell e o laço veria zero critérios.
- `executor.sh:1072`: o enforcement recebe o extra. A base vermelha (`:1150`) conta os ampliados como allowlist; sem isso, a tentativa ampliada que não editou o teste viraria base vermelha.
- `drive_ticket`: zera `VIZ_AMPLIADA` no começo (`:1348`). Depois de um retry aprovado pelo plano, arma a ampliação e grava `VIZINHO_AMPLIADO testes=… hash=<versão> attempt=…` (`:1592`). Sem tentativa para usar, a decisão não é gravada e a versão segue elegível.
- `lib.sh`: `ticket_versao` (o hash que a 8b já usava no aviso do gate de ticket, agora numa função; `executor.sh:1402` passa a chamá-la) e `vizinho_ja_ampliado`.
- `enforcement.sh`: `--allowlist-extra <arquivo>`: soma à allowlist e manda `ampliados` no payload, para a P3.
- Teste: `test/orquestrador-vizinhos-8c-executor.test.ts`, `drive_ticket` de verdade no molde do teste da base vermelha. Caso 950: as linhas reais de import do teste vizinho, o recorte real do vitest e o critério de lista fechada do ticket (só `origin/staging-auto` → `staging-auto`).

Vermelho (motor `3b82da1`): os 4 caem; no primeiro, o log mostra o defeito do PASSO 0 reproduzido.
```
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > 950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova 2426ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > a ampliação vale até o fim do drive: com o teste não ajustado, as tentativas 2 e 3 levam a lista; um só VIZINHO_AMPLIADO 2362ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > uma vez por versão do ticket: com VIZINHO_AMPLIADO desta versão na trilha, não amplia de novo, e nem por isso vira base_vermelha 139ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > contra-teste: FAIL fora da allowlist em teste que não é vizinho segue base_vermelha como hoje, sem VIZINHO_AMPLIADO 2436ms
[orq 18:57:04]   base vermelha: FAIL só em test/etapa2-funil-motor.test.ts (fora do diff e da allowlist) — juiz NÃO chamado
[orq 18:57:05] BLOQUEADO: base_vermelha (test/etapa2-funil-motor.test.ts)
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
      Tests  4 failed (4)
rc=1
```

Verde:
```
 ✓ test/orquestrador-vizinhos-8c-executor.test.ts (4 tests) 33531ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > 950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova 5338ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > a ampliação vale até o fim do drive: com o teste não ajustado, as tentativas 2 e 3 levam a lista; um só VIZINHO_AMPLIADO 18270ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > uma vez por versão do ticket: com VIZINHO_AMPLIADO desta versão na trilha, não amplia de novo, e nem por isso vira base_vermelha 5866ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > contra-teste: FAIL fora da allowlist em teste que não é vizinho segue base_vermelha como hoje, sem VIZINHO_AMPLIADO 4056ms
      Tests  4 passed (4)
rc=0
```

`npx tsc --noEmit` rc=0. `vitest run` inteiro: `Test Files 103 passed (103)`, `Tests 1633 passed (1633)`, rc=0. `bash scripts/kit/test-shell.sh`: `TODOS OS SCRIPTS SAÍRAM rc 0`, rc=0.

### P2b-2 · conferência na árvore do `base_ticket` (decisão 9) · commit `8b4c6e1`

- `executor.sh:958` `vizinho_na_base`: `git worktree add --detach` no `base_ticket` e `linkar_node_modules`; roda `$VIZINHO_CMD_BASE <testes>` (padrão `npx --no-install vitest run`, `executor.sh:957`) sem cor; a saída vai para `vizinhos-base.txt`, e a worktree é removida no fim. rc 0 → `verde`. rc ≠ 0 com FAIL de algum desses arquivos → `vermelho`. Qualquer outra coisa → `inconclusivo`.
- Na seção 7a (`executor.sh:1162`): `VIZINHO_BASE resultado=… testes=…` na trilha. Só `verde` amplia. `vermelho` e `inconclusivo` seguem para a base vermelha de hoje (com critério verde, `BLOQUEADO motivo=base_vermelha`, sem consumir tentativa).
- `decisao-cli.ts`: `base-vermelha-arquivos` (os FAIL de uma saída do vitest, um por linha).
- Teste: o vitest da base é falso (`VIZINHO_CMD_BASE` trocado depois do `source`). Ele grava onde rodou e com quais argumentos. O caso verde prova que rodou só o arquivo falho e na árvore da base (`motor=0`: o motor sem a mudança do agente). Dois casos novos: a base vermelha verdadeira cujo teste importa arquivo da allowlist (a C11 liga o teste, mas ele falha também na base) não amplia; o runner que não roda também não.
- Conferência manual do runner padrão numa worktree destacada deste repo, com `node_modules` ligado: `npx --no-install vitest run test/orquestrador-vizinhos-8c.test.ts` → `Tests 21 passed (21)`, rc=0. Com um arquivo que não existe → rc=1, sem linha FAIL, ou seja, `inconclusivo`.

Vermelho (motor `c37bc6f`):
```
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > 950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova 6495ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > base vermelha verdadeira cujo teste importa arquivo da allowlist: o vizinho falha também no base_ticket → não amplia, segue base_vermelha, e a trilha diz 6573ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > runner que não roda na base (inconclusivo): não amplia; a base vermelha decide como hoje 7945ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
      Tests  3 failed | 3 passed (6)
rc=1
```

Verde:
```
 ✓ test/orquestrador-vizinhos-8c-executor.test.ts (6 tests) 32788ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > 950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova 8420ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > a ampliação vale até o fim do drive: com o teste não ajustado, as tentativas 2 e 3 levam a lista; um só VIZINHO_AMPLIADO 10108ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > uma vez por versão do ticket: com VIZINHO_AMPLIADO desta versão na trilha, não amplia de novo, e nem por isso vira base_vermelha 3342ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > contra-teste: FAIL fora da allowlist em teste que não é vizinho segue base_vermelha como hoje, sem VIZINHO_AMPLIADO 3138ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > base vermelha verdadeira cujo teste importa arquivo da allowlist: o vizinho falha também no base_ticket → não amplia, segue base_vermelha, e a trilha diz 3924ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > runner que não roda na base (inconclusivo): não amplia; a base vermelha decide como hoje 3855ms
      Tests  6 passed (6)
rc=0
```

`npx tsc --noEmit` rc=0. `vitest run` inteiro: `Test Files 103 passed (103)`, `Tests 1635 passed (1635)`, rc=0. `test-shell.sh`: `TODOS OS SCRIPTS SAÍRAM rc 0`, rc=0.

### P2c · parada por escopo (antes de escrever)

A decisão 6 liberou `triador/extrair.ts` e `triador/leitor-kit.ts`. Para cumpri-la com o vermelho do 1373 real, faltam dois arquivos:

- **`triador/tipos.ts`**: o `Tentativa` (`tipos.ts:76-109`) é o que chega ao `extrair.ts`. Para o extrair saber que um teste foi ampliado naquela tentativa, o tipo precisa de um campo opcional (`ampliados?: string[]`, 2 linhas). Sem ele, o `leitor-kit.ts` não tem como passar a lista.
- **`triador/leitor-legado-comarka.ts`**: o 1373 é do Comarka, que roda o motor legado, e quem monta as tentativas dele é este leitor, não o `leitor-kit.ts`. O 457856c já grava `attempt-N/allowlist-ampliada.txt` no Comarka (1256, 1327, 1373). Basta lê-lo (~3 linhas, como no `leitor-kit.ts`).

Sem os dois, a P2c cobre só repos do kit, e o vermelho do 1373 real não fecha. Foi o 1373 que mostrou a ação dupla, e ela acontece no Comarka.

### P2c · o triador e o teste já ampliado · commit `04012f5`

Escopo liberado: `triador/tipos.ts` e `triador/leitor-legado-comarka.ts`, além de `extrair.ts` e `leitor-kit.ts`. `resolvedor/` não foi tocado.

- `tipos.ts:113`: `Tentativa.ampliados?`.
- `leitor-legado-comarka.ts:104` e `leitor-kit.ts:184`: leem o arquivo da tentativa quando ele existe; sem ele, a chave nem aparece. Quando existe, entra em `lidos`.
- `extrair.ts:134`: o teste ampliado conta como dentro da allowlist naquela tentativa. `extrair.ts:252` (D6v, antes da D6b e depois da base vermelha): vermelho fora da allowlist que a série já ampliou dá `R1` firme com regra `D6v` e rótulo "teste já ampliado pelo executor", sem `r1_testes`. Firme, para não chamar modelo. O `decidir.ts` não tem ação para `D6v` e devolve `aviso`.
- O motivo da linha `aviso` no ledger é o texto do `decidir.ts` ("R1: só diagnóstico e aviso (decisão humana)"), que fica no resolvedor e não foi tocado. O texto "teste já ampliado pelo executor" vai no rótulo e no remédio do diagnóstico; a regra `D6v` vai na linha do ledger.
- Caso real: `test/fixtures/vizinhos-8c/1373-triador/`, gerado do Comarka no formato `triador-7f` com os recortes do próprio leitor (`ORIGEM.md`). Com o triador de antes: `R1 D6` firme e `r1_allowlist` em auto, a mesma ação de 14:25Z.
- Byte a byte: o sha256 da evidência e da extração dos 65 casos reais sem ampliação (todos os `triador-7f` e os dois `conteudos-243` pelo leitor kit) foi gravado com o triador do `8b4c6e1`. Os 65 batem depois da peça. O `mtime_ns` de `lidos` do leitor kit fica fora do hash, porque muda a cada checkout (conferido com `touch`).

Vermelho (motor `8b4c6e1`); os 66 testes da régua e o contra-teste passam, como devem:
```
   × 8c-P2c · 1373 (caso real): bloqueio depois de ampliação que não fechou vira aviso, nunca R1 > o leitor legado lê a ampliação da tentativa 2, e só dela 6ms
     → expected [ undefined, undefined, undefined ] to deeply equal [ undefined, …(2) ]
   × 8c-P2c · 1373 (caso real): bloqueio depois de ampliação que não fechou vira aviso, nunca R1 > a extração não fecha D6 nem D6b: R1 D6v firme, "teste já ampliado pelo executor", sem r1_testes 2ms
     → expected 'D6' to be 'D6v' // Object.is equality
   × 8c-P2c · 1373 (caso real): bloqueio depois de ampliação que não fechou vira aviso, nunca R1 > o resolvedor em auto para R1 só avisa (antes desta peça: r1_allowlist, a ação de 14:25Z) 2ms
     → expected 'r1_allowlist' to be 'aviso' // Object.is equality
   × 8c-P2c · 1373 (caso real): bloqueio depois de ampliação que não fechou vira aviso, nunca R1 > o teste ampliado conta como coberto naquela tentativa (e só nela) 2ms
     → expected false to be true // Object.is equality
   × 8c-P2c · o leitor kit lê attempt-N/allowlist-ampliada.txt > um repo do kit com a ampliação gravada pelo executor na tentativa 2 4ms
     → expected undefined to deeply equal [ 'test/vizinho.test.ts' ]
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
      Tests  5 failed | 67 passed (72)
rc=1
```

Verde:
```
      Tests  72 passed (72)
rc=0
```

`npx tsc --noEmit` rc=0. `vitest run` inteiro: `Test Files 104 passed (104)`, `Tests 1707 passed (1707)`, rc=0. `test-shell.sh`: `TODOS OS SCRIPTS SAÍRAM rc 0`, rc=0.

### P3 · anti-afrouxamento mecânico · commit `660211e`

- `enforcement-core.ts:665` `REGRAS_AFROUXAMENTO` e `:695` `violacoesDeAfrouxamento`: as 6 regras do item 4, por contagem líquida de linhas no diff do arquivo, só em `EnforceInput.ampliados` (que o `enforcement.sh` já manda desde a P2b-1). Arquivo apagado é violação direta. Tipo `afrouxamento` (`:145`).
- `decisao.ts:464`: qualquer violação `afrouxamento` faz `reprovado` com causa `afrouxamento`, e ela manda sobre as outras violações. Nenhuma regra de retry nomeia essa causa, então o `decidirRetry` bloqueia. Nunca vira `refatiar`.
- Testes:
  - as 6 regras com diffs mínimos;
  - o mesmo diff num teste que não foi ampliado não dispara;
  - valor recalculado com a mesma contagem não dispara;
  - os 33 testes dos consertos reais (18 tickets, `afrouxamento/`) passam;
  - a decisão;
  - no `drive_ticket`, a tentativa ampliada que põe `it.skip` no vizinho do 950 reprova por afrouxamento e bloqueia, sem tentativa 3, sem juiz e sem REFATIAR.

Vermelho (motor `04012f5`); os 18 consertos reais passam antes e depois:
```
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > remove it/test 2ms
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > remove expect 1ms
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > acrescenta .skip/.only/.todo 0ms
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > acrescenta matcher genérico 0ms
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > comenta it/test/expect 0ms
   × 8c-P3 · as 6 regras líquidas reprovam o afrouxamento num teste ampliado > apaga o arquivo de teste 0ms
   × 8c-P3 · decisão: afrouxamento reprova sem retry (nunca refatiar) > só afrouxamento: reprovado, causa afrouxamento, e o plano de retry bloqueia 1ms
   × 8c-P3 · decisão: afrouxamento reprova sem retry (nunca refatiar) > afrouxamento junto com fora_do_pathspec: o afrouxamento manda (não vira refatiar) 1ms
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > P3 · a tentativa ampliada que põe it.skip no teste vizinho: enforcement reprova por afrouxamento e bloqueia sem 3ª tentativa 3634ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 9 ⎯⎯⎯⎯⎯⎯⎯
      Tests  9 failed | 49 passed (58)
rc=1
```

Verde:
```
      Tests  58 passed (58)
rc=0
```

`npx tsc --noEmit` rc=0. `vitest run` inteiro: `Test Files 104 passed (104)`, `Tests 1738 passed (1738)`, rc=0. `test-shell.sh`: `TODOS OS SCRIPTS SAÍRAM rc 0`, rc=0.

### P4 · prompts do executor e do juiz · commit `c1d86b2`

- `executor.sh:352` `build_prompt`: os ampliados entram na lista da allowlist com `[AMPLIADA até o fim deste ticket: …]`, e no fim vêm o bloco "TESTES VIZINHOS QUEBRADOS PELO SEU DIFF" (o `vizinhos.txt` da tentativa da decisão) e a REGRA ANTI-AFROUXAMENTO, que diz o que o enforcement reprova e o que só o juiz pega. Sem argumento, ele lê `VIZ_AMPLIADA` e `VIZ_BLOCO` do drive. A chamada continua `build_prompt "$file" "$motivo_anterior" "$tools"`, que o `orquestrador-prompt-como-rodar.test.ts` confere letra a letra; a primeira versão mudou essa chamada e derrubou esse teste na suíte inteira.
- `executor.sh:794`: o `run_juiz` manda `ampliados`.
- `juiz.ts:169` `blocoAmpliados` (item 5: reprovar a mudança de DADO, como a lista de exceções do 762, ou de valor esperado sem que o objetivo peça). O `ANTI_AFROUXAMENTO` liga também quando só o ampliado é teste. Com `ampliados` ausente ou vazio, o prompt sai byte a byte igual.
- Testes: o prompt do juiz igual com `ampliados` ausente ou `[]`; o bloco com ampliados. No `drive_ticket` com o `run_juiz` real e o `STUB_JUIZ` nativo: o prompt do executor da tentativa 1 não tem o bloco e o da tentativa 2 tem (o local `:92:50` do 950); o `juiz.prompt.txt` da tentativa 2 lista o teste ampliado.

Vermelho (motor `660211e`):
```
   × 8c-P4 · prompt do juiz: o bloco do teste vizinho ampliado só quando há ampliação > com ampliados: lista os testes, liga o anti-afrouxamento e cobra o afrouxamento por dado (o 762) 4ms
     → expected 'Você é o JUIZ de uma esteira automati…' to contain 'TESTE VIZINHO AMPLIADO'
   × 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > P4 · o bloco FAIL e a regra só no prompt da tentativa ampliada; o juiz (run_juiz real, STUB_JUIZ) recebe a lista ampliada 4927ms
     → expected 'Você é um engenheiro executando um ti…' to contain '  - test/etapa2-funil-motor.test.ts  …'
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
+   "trecho": " FAIL  test/etapa2-funil-motor.test.ts > funil e motor dão o mesmo número para o mesmo lead > cada classe do funil conta exatamente os leads que o motor marcou\nAssertionError: expected [ [ 'MQL', 'RM', 'RR' ], …(3) ] to deeply equal [ [ 'MQL', 'RM', 'RR' ], …(3) ]\n ❯ test/etapa2-funil-motor.test.ts:92:50\n⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯\n- Expected\n+ Received\n@@ -6,9 +6,12 @@\n    ],\n    [\n      \"MQL\",\n    ],\n    [\n+     \"MQL\",\n+     \"RM\",\n+     \"RR\",",
      Tests  2 failed | 59 passed (61)
rc=1
```

Verde:
```
      Tests  61 passed (61)
rc=0
```

Na primeira rodada da suíte inteira desta peça, 1 teste falhou (`run_attempt deriva tools uma vez…`, por causa da chamada mudada) e o `test-shell.sh` saiu rc=1 em `test-fixture-gates.sh (kit)` (`FALHA: gates.ts rc=1`). Com a chamada restaurada, o `test-fixture-gates.sh` sozinho deu `VERDE`, e depois: `npx tsc --noEmit` rc=0; `vitest run` inteiro com `Test Files 104 passed (104)` e `Tests 1741 passed (1741)`, rc=0; `test-shell.sh` com `TODOS OS SCRIPTS SAÍRAM rc 0`, rc=0.

### P5 · docs · commit `ba2ec6a`

- `CONTRATO.md`:
  - §21 nova (era §20 antes do rebase sobre a MIG-A, que ocupou a §20; ver §17), depois da §20 da MIG-A e antes da §10 "Divergências conhecidas", que fica no fim: dir/, a decisão com a tabela do replay, a ampliação, o anti-afrouxamento com a tabela medida, o triador e o resolvedor, os prompts, os testes;
  - §4.1: `VIZINHO_BASE` e `VIZINHO_AMPLIADO`, depois de `EDICAO_ALHEIA`;
  - §11.3: a base vermelha cede ao vizinho, e a causa `afrouxamento`;
  - §13: a linha D6v antes da D6b.
- `CHANGELOG.md`: "Etapa 8c", depois da "Etapa 8b".
- `docs/PECAS.md`: a 8c em FEITAS, depois da 8b. Em PENDENTES, a entrada da 8c sai e entram duas:
  - o runner da conferência na base roda na raiz da worktree (monorepo dá `inconclusivo`);
  - o motivo genérico da linha `aviso` da D6v no ledger (resolvedor fora do escopo).

Sem vermelho: docs não são motor (CLAUDE.md).

## 14. Tabela final: caso real, amplia antes, amplia depois, cobre o resgate

"Antes" é o kit em `f592745`, a `main` com a 8b. "Depois" é `ba2ec6a`, com a régua da C11 v2 das P2a e P2b.

- A coluna "amplia depois" supõe a conferência na base (P2b-2) verde. Ela não foi rodada nos casos reais, porque não há registro desses testes vizinhos rodando na base. Nos 12, o vizinho falhou com o diff do agente; se falhar também na base, segue a base vermelha.
- No kit de antes, o vizinho vermelho com critério verde bloqueava como `base_vermelha` na 1ª tentativa (P2b-1, vermelho reproduzido com o 950). Com critério vermelho junto, ia a retry sem poder tocar o teste.

| caso real | amplia antes | amplia depois | cobre o resgate |
|---|---|---|---|
| 762 | não | não (só cita `vercel.json`, fora de `src/`) | não (o resgate foi `src/middleware.ts`) |
| 856 | não | não (varre diretório; sem evidência pré-resgate) | não |
| 711a | não | não (`sem-insumo` não liga) | não |
| 950 | não | **sim** | **sim** |
| 1006 | não | **sim** | **sim** |
| 840 | não | **sim** | **sim** |
| 924a | não | **sim** | **sim** |
| 1054 | não | **sim** | **sim** |
| 1055b | não | **sim** | **sim** |
| 1058 | não | **sim** | **sim** |
| 854 | não | não (varre diretório) | não |
| 966 | não | **sim** | **sim** |
| 830 | não | não (FAIL dentro da allowlist; o resgate foi diff 0) | não |
| 826 | não | sim | não (o resgate foi spec nova, com outros testes) |
| 855 | não | **sim** | **sim** |
| 1059 | não | **sim** | **sim** |
| 1195 | não | não (vitest verde; é a D6b) | não |
| 711b3 | não | não (tudo ou nada: `sem-insumo` não liga) | não |
| 1053 | não | **sim** | **sim** |
| **total** | **0** | **12** | **11** |

Além do replay, nos casos em que o 457856c já ampliou no Comarka:
- 1256 e 1373: a lista fechada derivada (P2b-1) teria tirado o `FORA_<teste>` da tentativa ampliada.
- 1373: depois da ampliação, o triador (P2c) dá D6v e o R1 não age de novo.

## 15. As quatro suítes (worktree em `ba2ec6a`)

Sem rebase, por instrução: a `main` do kit vai mudar com o merge da MIG-A, e o rebase entra na corrente de fechamento.

```
$ npx tsc --noEmit
tsc rc=0
```

```
$ TZ=UTC node_modules/.bin/vitest run   (cauda)

 Test Files  104 passed (104)
      Tests  1741 passed (1741)
   Start at  20:04:32
   Duration  71.87s (transform 1.32s, setup 0ms, collect 24.20s, tests 531.29s, environment 14ms, prepare 4.71s)

vitest rc=0
```

```
$ bash scripts/kit/test-shell.sh   (cauda)
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
shell rc=0
```

```
$ bash scripts/kit/test-instalar.sh   (cauda)
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
instalar rc=0
```

Saídas inteiras, e o vermelho e o verde de cada peça, em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-vizinhos-8c/a197e23c-d104-411a-86f1-4664c6c363f7/scratchpad/pecas/`. Sem push, sem `--no-verify`, sem `claude -p`. No Comarka, só leitura (`GIT_OPTIONAL_LOCKS=0`; `show`, `log`, `ls-tree`, `cat-file`, `rev-parse` e leitura de `docs/fila/runs/`).

## 16. Para o Lucas

- **Commits da 8c, sobre `f592745`:** `2ea7e0c` (P1), `3b82da1` (P2a), `c37bc6f` (P2b-1), `8b4c6e1` (P2b-2), `04012f5` (P2c), `660211e` (P3), `c1d86b2` (P4), `ba2ec6a` (P5). Sem merge e sem push.
- **Desvios do plano, todos anotados nas peças:**
  - a P2b virou duas;
  - a P2b-1 passou um pouco do teto (117 linhas de motor e 222 de teste);
  - a fixture do 295 é a `prev1`;
  - a versão do 1373 que rodou é a `6f94e84`, não a `6c42ce9`;
  - o primeiro rascunho da P4 mudou a chamada do `build_prompt` e foi corrigido.
- **Incidente sem efeito:** na P4, um heredoc foi cortado num `EOF` que estava dentro do próprio texto, e o zsh executou o resto como comando. Isso deixou um arquivo vazio chamado `",` na raiz do worktree. Conferi e apaguei; nenhum arquivo do kit mudou nesse passo.
- **O que o Comarka ganharia com o porte de volta:**
  - o critério de lista fechada derivado na execução: 1256 e 1373 caíram nele;
  - a ampliação até o fim do drive, em vez de só a tentativa seguinte;
  - a C11 como ligação, no lugar do `teste_cita`: pega 924a e 855 e não amplia o 762.
  Se for o caso, é registro em `docs/migracao-comarka.md`, fora do escopo desta etapa.

## 17. Rebase sobre a MIG-A (`main` em `01e6fc4`)

A MIG-A foi mergeada e enviada ao remoto (`a69698d` a `01e6fc4`, cinco commits). Ela mexeu em código (`scripts/orquestrador/migrations/`, `scripts/orq`, `resolvedor/caminhos.ts`, `resolvedor/repo.ts` e testes próprios). Antes do rebase, conferi que os arquivos que ela e a 8c tocam em comum são só `CHANGELOG.md`, `CONTRATO.md` e `docs/PECAS.md`.

**`git rebase main`:**
- os sete commits de código da 8c passaram sem conflito;
- o 8c-5 conflitou em `CHANGELOG.md` e `CONTRATO.md`, os dois só por acréscimo (a MIG-A em cima e a 8c embaixo). Ficaram os dois blocos, nessa ordem, com uma linha em branco em cada costura;
- o `docs/PECAS.md` mesclou sozinho, porque a MIG-A tem seção própria no fim do arquivo (`## ETAPA MIG-A`), fora da lista FEITAS. Ali a 8c continua depois da 8b e a seção da MIG-A continua onde a MIG-A a pôs. A ordem 8a, 8b, MIG-A, 8c vale em CHANGELOG e CONTRATO; no PECAS, a MIG-A não está na mesma lista.

**Renumeração:** a MIG-A ocupa a §20 do CONTRATO, e a 8c virou §21:
- `CONTRATO.md`: `## 21.` e `### 21.1` a `### 21.7`, o `§21.6` dentro da seção, as duas linhas da trilha (`§21`), a base vermelha (`§21`), a causa `afrouxamento` (`§21.4`) e a D6v (`§21.5`);
- `CHANGELOG.md`: "CONTRATO §21" na abertura da Etapa 8c e no item 8c-5;
- `docs/PECAS.md`: a 8c em FEITAS (`§21`) e as duas pendências (`§21.2`, `§21.5`);
- este relatório: a P5 (§13).

As referências §20 da MIG-A ficaram como estavam. A mensagem do 8c-5 foi reescrita para "CONTRATO §21" (`git commit --amend`, local).

**Novo HEAD: `0b59155`.**

| peça | antes (sobre `f592745`) | depois (sobre `01e6fc4`) | `range-diff` |
|---|---|---|---|
| 8c-1 | `2ea7e0c` | `46ce561` | `=` |
| 8c-2a | `3b82da1` | `342372e` | `=` |
| 8c-2b1 | `c37bc6f` | `ae1f94f` | `=` |
| 8c-2b2 | `8b4c6e1` | `49cf161` | `=` |
| 8c-2c | `04012f5` | `04b8fe6` | `=` |
| 8c-3 | `660211e` | `00867c8` | `=` |
| 8c-4 | `c1d86b2` | `a45f557` | `=` |
| 8c-5 | `ba2ec6a` | `0b59155` | `!` (só docs: costura, §20→§21 e a mensagem) |

### 17.1 Nenhum arquivo de código mudou no rebase

O comando pedido **não sai vazio**, e não tinha como sair: o `ORIG_HEAD` (`ba2ec6a`) é a 8c sobre a `main` velha, e o `HEAD` é a 8c sobre a `main` nova. Por isso o diff entre os dois mostra exatamente o código que a MIG-A trouxe:

```
$ git diff --stat ORIG_HEAD HEAD -- scripts test
 scripts/orq                                        |   21 +
 scripts/orquestrador/migrations/aplicar.ts         |  187 ++
 scripts/orquestrador/migrations/arquivos.ts        |   48 +
 scripts/orquestrador/migrations/caminhos.ts        |   75 +
 scripts/orquestrador/migrations/cli.ts             |  176 ++
 scripts/orquestrador/migrations/config.ts          |  210 +++
 scripts/orquestrador/migrations/liberacao.ts       |  116 ++
 scripts/orquestrador/migrations/plano.ts           |  121 ++
 scripts/orquestrador/migrations/sql.ts             |  187 ++
 scripts/orquestrador/migrations/supabase.ts        |  153 ++
 scripts/orquestrador/resolvedor/caminhos.ts        |    5 +-
 scripts/orquestrador/resolvedor/repo.ts            |   29 +-
 test/fixtures/migrations/LEIA-ME.md                |   16 +
 test/fixtures/migrations/comarka-arquivos.tsv      |  273 +++
 test/fixtures/migrations/comarka-producao.tsv      |  492 +++++
 .../migrations/liberacoes-comarka-18-10.json       | 1953 ++++++++++++++++++++
 test/orquestrador-migrations-aplicar.test.ts       |  501 +++++
 test/orquestrador-migrations-config.test.ts        |  154 ++
 test/orquestrador-migrations-plano.test.ts         |  156 ++
 test/orquestrador-migrations-supabase.test.ts      |  291 +++
 20 files changed, 5155 insertions(+), 9 deletions(-)
rc=0
```

As duas conferências que provam que o código da 8c não mudou:

```
$ cmp <(git diff ba2ec6a HEAD -- scripts test) <(git diff f592745 main -- scripts test)
IGUAIS (rc=0): a única diferença de código entre o antes e o depois é a MIG-A

$ cmp <(git diff f592745 ba2ec6a -- scripts test) <(git diff main HEAD -- scripts test)
IGUAIS (rc=0): o código da 8c é byte a byte o mesmo sobre a main nova
```

O `range-diff` confirma: os sete commits de código têm patch idêntico (`=`), e só o 8c-5, de docs, mudou (`!`):

```
$ git range-diff f592745..ba2ec6a main..HEAD
1:  2ea7e0c = 1:  46ce561 8c-1: dir/ na allowlist vale dir/** (matchesAllowlist e diagnóstico do retry)
2:  3b82da1 = 2:  342372e 8c-2a: decisão do teste vizinho (C11 no base_ticket), bloco FAIL e critério de lista fechada derivado
3:  c37bc6f = 3:  ae1f94f 8c-2b1: teste vizinho no executor — amplia antes da base vermelha, até o fim do drive, uma vez por versão
4:  8b4c6e1 = 4:  49cf161 8c-2b2: antes de ampliar, os arquivos falhos rodam na árvore do base_ticket
5:  04012f5 = 5:  04b8fe6 8c-2c: o triador sabe que o teste foi ampliado — bloqueio depois da ampliação vira aviso, nunca R1
6:  660211e = 6:  00867c8 8c-3: anti-afrouxamento mecânico só nos testes ampliados (erro de enforcement, bloqueia sem retry)
7:  c1d86b2 = 7:  a45f557 8c-4: prompts — o executor vê o bloco FAIL e a regra só na tentativa ampliada; o juiz recebe a lista ampliada
8:  ba2ec6a ! 8:  0b59155 8c-5: CONTRATO §20 (e §4.1, §11.3, §13), CHANGELOG e PECAS — teste vizinho liberado só quando falha
```

### 17.2 As quatro suítes (worktree em `0b59155`)

```
$ npx tsc --noEmit
tsc rc=0
```

```
$ TZ=UTC node_modules/.bin/vitest run   (cauda)

 Test Files  108 passed (108)
      Tests  1785 passed (1785)
   Start at  20:34:58
   Duration  60.21s (transform 1.39s, setup 0ms, collect 20.79s, tests 461.11s, environment 13ms, prepare 4.41s)

vitest rc=0
```

```
$ bash scripts/kit/test-shell.sh   (cauda)
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
shell rc=0
```

```
$ bash scripts/kit/test-instalar.sh   (cauda)
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
instalar rc=0
```

São 4 arquivos e 44 testes a mais que em `ba2ec6a` (104 e 1741): são os testes da MIG-A. Saídas inteiras em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-vizinhos-8c/a197e23c-d104-411a-86f1-4664c6c363f7/scratchpad/pecas/rb-*.txt` e `rebase-conferencia.txt`. Sem push.

## 18. 8c-6 · o merge desfeito: a régua byte a byte dependia do caminho do checkout

**O que aconteceu:** às 20:54 UTC, no checkout principal, o vitest deu 2 falhas no `orquestrador-vizinhos-8c-triador.test.ts`, nos casos `kit:triador-custo-real/conteudos-243` e `kit:triador-leitor-kit/conteudos-243`. A extração bateu (`81407754fc254a11`), e a evidência não: `fdb7e0b8ae3ffa5e` virou `e9822462919f01b2`, e `001edb074354c161` virou `e70c2bc7de971d22`.

### 18.1 O campo e a origem

**Não é o relógio.** A evidência do 243 sai idêntica com o relógio deslocado (`Date` e `new Date()` trocados no processo) em +30 e −400 dias, e com `TZ=America/Bahia`.

**É `Evidencia.repo`.** O leitor kit grava ali o caminho absoluto do checkout: `scripts/orquestrador/triador/leitor-kit.ts:250`, `repo: raiz`. A régua tinha sido gravada no worktree da etapa. Prova: trocando só o `repo` pelo caminho do checkout principal, os hashes saem exatamente os do merge:

| caso | `repo` = worktree da etapa | `repo` = `/Users/lucasantos/Projetos/orquestrador-kit/...` |
|---|---|---|
| `triador-custo-real/conteudos-243` | `fdb7e0b8ae3ffa5e` (a régua) | `e9822462919f01b2` (o que o merge deu) |
| `triador-leitor-kit/conteudos-243` | `001edb074354c161` (a régua) | `e70c2bc7de971d22` (o que o merge deu) |

O leitor legado (os outros 63 casos) grava `fixture:<caso>` (`leitor-legado-comarka.ts:fonteFixture`, `raiz`) e não depende do caminho.

### 18.2 O conserto, só no teste · commit `d3ce1b0`

Desvio do pedido, porque a causa medida não é o relógio:
- o vermelho é o caso copiado para outro diretório, e não o relógio +30 dias (que passa hoje);
- a mensagem do commit diz "não depende do checkout" no lugar de "fixa o relógio".

A conferência do relógio entrou como guarda permanente.

- `test/orquestrador-vizinhos-8c-triador.test.ts`: `semAmbiente(ev, rel)` tira o `mtime_ns` (como antes) e troca `repo` pelo caminho relativo do caso. Dois testes novos:
  - cada caso kit copiado para um diretório temporário dá o mesmo hash;
  - os 65 casos com o relógio em +30 e −400 dias (`vi.useFakeTimers({ toFake: ['Date'] })`) dão os mesmos hashes.
- `test/fixtures/vizinhos-8c/triador-sem-ampliacao.json`: os dois hashes de evidência kit passaram a `f1191bf9441f79ce` e `ffa70e550a3ade90`, recalculados com o triador de antes da P2c (`49cf161`, o `8b4c6e1` rebaseado), numa worktree temporária. Antigo e atual dão os mesmos 65 hashes com o `repo` normalizado. As extrações e os 63 do legado não mudaram.
- `ORIGEM.md`: a nota da régua.
- Motor e leitor não mudaram: `git diff --stat 0b59155 HEAD -- scripts` vazio.

Vermelho (teste novo, régua e normalização de `0b59155`):
```
   × 8c-P2c · sem allowlist-ampliada.txt, leitor e extração ficam byte a byte iguais (65 casos reais) > kit:triador-custo-real/conteudos-243 copiado para outro diretório dá o mesmo hash (a régua não depende do checkout) 7ms
     → expected { evidencia: '98176e64838d8011', …(1) } to deeply equal { evidencia: 'fdb7e0b8ae3ffa5e', …(1) }
   × 8c-P2c · sem allowlist-ampliada.txt, leitor e extração ficam byte a byte iguais (65 casos reais) > kit:triador-leitor-kit/conteudos-243 copiado para outro diretório dá o mesmo hash (a régua não depende do checkout) 4ms
     → expected { evidencia: 'f45040d58b52787d', …(1) } to deeply equal { evidencia: '001edb074354c161', …(1) }
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
      Tests  2 failed | 73 passed (75)
rc=1
```

Verde:
```
      Tests  75 passed (75)
rc=0
```

O mesmo arquivo de teste rodado de outro caminho de checkout (uma worktree destacada de `d3ce1b0` no scratchpad, o equivalente ao checkout principal): `Tests  75 passed (75)`.

### 18.3 Os outros 64 casos não dependem do relógio

Os 65 hashes (evidência e extração; o kit com `repo` normalizado) foram medidos com o relógio de hoje, com +30 dias, com −400 dias e com `TZ=America/Bahia`. Diferenças em relação a hoje: nenhuma nos quatro. Os 63 do legado batem com a régua gravada na P2c.

### 18.4 As quatro suítes, e o vitest duas vezes (worktree em `d3ce1b0`)

```
$ npx tsc --noEmit
tsc rc=0
```

```
$ TZ=UTC node_modules/.bin/vitest run   (cauda)

 Test Files  108 passed (108)
      Tests  1788 passed (1788)
   Start at  21:00:28
   Duration  71.75s (transform 1.50s, setup 0ms, collect 23.84s, tests 546.22s, environment 16ms, prepare 5.53s)

vitest UTC rc=0
```

```
$ TZ=America/Bahia node_modules/.bin/vitest run   (cauda)

 Test Files  108 passed (108)
      Tests  1788 passed (1788)
   Start at  18:01:40
   Duration  111.41s (transform 2.23s, setup 0ms, collect 34.70s, tests 835.86s, environment 21ms, prepare 10.08s)

vitest America/Bahia rc=0
```

```
$ bash scripts/kit/test-shell.sh   (cauda)
TODOS OS SCRIPTS SAÍRAM rc 0
shell rc=0
```

```
$ bash scripts/kit/test-instalar.sh   (cauda)
TODOS OS CHECKS PASSARAM
instalar rc=0
```

**Novo HEAD: `d3ce1b0`**, sobre `0b59155`. São 3 testes a mais que na §17 (1788): o caso copiado, duas vezes, e a guarda do relógio. Sem push.
