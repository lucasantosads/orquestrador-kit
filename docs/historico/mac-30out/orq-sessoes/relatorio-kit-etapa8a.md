# Etapa 8a · validador na entrada · PASSO 0 (leitura)

Worktree `~/Projetos/_worktrees/kit-validador-8a`, branch `kit/validador-8a`, HEAD `85c49a6`. Nada escrito no kit. Este relatório é a única escrita fora de `/tmp` e do scratchpad.

Comarka lido só com `GIT_OPTIONAL_LOCKS=0` e `log`, `show`, `cat-file`, `ls-tree`, `rev-parse`, e leitura de arquivo (`docs/fila/runs/*`, `scripts/validar-fila.py`). Sem pausa e sem launchctl.

## 0. Resumo em 8 linhas

1. **Hoje o gate não teria barrado nenhum dos 39 tickets reais.** Na versão de entrada, nenhum deles dispara regra `erro`. A C11 dispara em 924a, 999c, 924d, 1053 e 1053b, sempre como aviso. Só no 924a ela nomeia o teste real.
2. **O defeito de allowlist quase nunca é falta de detecção. É `testes_conferidos` errado.** A camada 6 do Comarka já acha o teste acoplado na criação. O escritor o declara "conferido, não quebra", e ele quebra. Isso aconteceu em 13 dos 19 casos de teste (tabela §3a).
3. **C11 por import e citação** pega o teste real em 14 de 19 casos (variante c15), com a árvore do pré-voo. Para isso, ela precisa ignorar `testes_conferidos`, e aí o FP é **180 em 368** done aprovados de primeira. Respeitando `testes_conferidos`, o FP cai para 87 e ela pega 3 dos 19. **Nenhuma variante chega a zero FP**, então a C11 fica aviso, e entra a alternativa do item 5 (`testes_vizinhos`).
4. Dos 6 casos que a P1 cobra, 950, 1006 e 840 disparam (o 840 só com a árvore do pré-voo). 762 só dispara na variante híbrida. **856 e 711a não disparam em nenhuma variante**: são outra classe de defeito (§3a).
5. **C14** (`v=$(grep -c …) &&` com `v` podendo valer 0 no estado certo): **0 FP** nos done que rodaram. Pega 924b, 924c, 924d e 924f. Pode ser `erro`.
6. **C13** (`origin/` em critério): 120 FP em 368. Pega o 1004, mas a forma está em 313 done. Pela régua da casa, é aviso.
7. **C15** como foi pedida (critério que conta arquivo por diretório) **não pega 854 nem 966**. Neles, quem conta por diretório é um *teste*, não um critério. FP 1 em 368. Recomendo não fazer.
8. Glob: `*` atravessa `/` no bash e no fnmatch do Comarka, e não atravessa no `globToRegExp` do kit. O kit também não normaliza `dir/`. Isso afeta 1 dos 259 disparos atuais da C11. A P5 vira 3 linhas dentro da P1.

## 1. Método e ressalvas

- **Árvore de cada ticket:** `staging-auto` **first-parent** antes do commit de interesse (`git log -1 --first-parent --before=<data> staging-auto`). Sem `--first-parent`, o `log` devolvia o próprio commit da `main`, com a árvore errada. Materializada em `/tmp/orq-8a/arv/<sha>/` (só `src/` e `test/`, mais a lista completa de caminhos) com `ls-tree -r` + `cat-file --batch`.
- **Fila "copiada em /tmp":** `/tmp/orq-8a/comarka` = árvore de `staging-auto c124b2f` + `docs/fila` de `main b9101cc`, num repo git novo, criado em `/tmp`.
- **`orq validar` literal** (`ORQ_EXEC_ROOT=/tmp/orq-8a/comarka bash scripts/orq validar 950 762 1006`) sai **rc 0 sem uma linha**. Os checks 5, 6, C2*, C11 e C12 só rodam em `pendente` (`gate-ticket.ts:1461`, `:1585`), então o done passa sem ser olhado. Com `--pendentes`, rc 1, 188 linhas, 22 de C11. Por isso a medição chama `validarTicket` do worktree com `status` forçado a `pendente` em memória, como a calibração 7d-1 (`levantamento-7d1-calibracao.md:191`). O config é o do template (`fixture/docs/fila/000-config.json`), porque o Comarka não tem `gate_ticket`, mais `branch_alvo: staging-auto`.
- **Populações:**
  - **TODOS:** os 1266 done de hoje, na versão atual, com a árvore atual. É o número comparável ao "FP nos done" histórico, mas é pessimista: conta teste criado depois do ticket.
  - **P1r** (a régua que proponho para severidade): os done **aprovados de primeira** na janela 04 a 17/10 (`tickets.csv`, 413), na **versão que rodou**, ou seja, a última `pendente` antes do primeiro commit com outro status, com a árvore daquele momento. Sobraram 368. Os outros 45 nunca tiveram versão `pendente` em commit da `main`. Em 123 dos 368, a versão que rodou difere da de entrada. Exemplo: o 924d, consertado antes de rodar. Como foram aprovados de primeira, todo disparo é FP por definição.
  - **Casos:** os 39 tickets reais, na versão de entrada (`git log --diff-filter=A`), com a árvore da entrada. Os 22 de allowlist também foram medidos na versão `resgate^` com a árvore do momento do resgate. É o que o pré-voo veria (`executor.sh:1295-1320` roda o gate por ticket na hora da execução).
- **Variantes de C11:** foram implementadas em Python, como réplica dos algoritmos (`viz.py`). A linha `atual` é uma réplica do TS (basename ≥ 6, grep -F, 1 a 4 testes), não o TS. Nos TODOS, o número de C11 é o do TS (259).
- **Gabarito dos casos de teste:** o teste que o resgate pôs na allowlist (diff JSON de `resgate^` e `resgate`). No 762, o teste que falhou no `gate-vitest.txt` (`docs/fila/runs/762/attempt-1.prev1`): `test/cron-paths-vercel.test.ts`, `expected [ '/api/cron/ghl-backfill' ] to deeply equal []`.
- Scripts (efêmeros, no scratchpad): `materializar.py`, `medir.ts`, `casos.ts`, `prep*.py`, `viz.py`, `crit.py`, `c2.ts`, em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-validador-8a/17759aa1-fef0-473c-b621-5260262ee81c/scratchpad/`. As saídas JSON também estão lá.

## 2. Perguntas, respostas, arquivo:linha

| pergunta | resposta | arquivo:linha |
|---|---|---|
| Como a C11 decide "citado" hoje? | Pega cada item da allowlist **sem `*` e sem `/` final**. Pula teste e `cria_novo`. Usa o basename **sem extensão** e pula os com menos de 6 caracteres. Roda `git grep -l -F -e <basename>` nos pathspecs de teste da **árvore de trabalho do checkout** da fila, não da `branch_alvo`. Exclui a própria fila e os testes que estão na allowlist **por igualdade exata**. Dispara com 1 a 4 testes. É substring livre: casa comentário, identificador vizinho, outro arquivo com o mesmo nome | `gate-ticket.ts:1337-1338`, `:1358-1370`, `:1087-1088`, `:1118-1125` |
| Quando a C11 roda? | Só em `pendente`, e só se o ticket estiver num repo git | `gate-ticket.ts:1585-1588`, `:1095-1097` |
| Severidade e régua | C11 `aviso`. Erro só com zero FP nos done (calibração de 25/09) | `gate-ticket.ts:135`, `:85-88` |
| De onde vêm os 9/4/122? | Da calibração de 25/09 sobre o `validar-fila.py` do Comarka, ordem CI/Actus/Comarka, população (a): done nunca bloqueados desde 26/07, com `runs/`. Causa 4 (152, 161, 402, 277). O FP vem de basename comum citado por acaso, do teto de 4 que corta arquivo-hub e de casos em que o teste citado não quebrou. **O kit, medido no próprio corpus, deu 22/24/122** (procura teste em qualquer `test/`, `tests/`, `__tests__/`), e o `porque` da tabela nunca foi atualizado | `levantamento-7d1-calibracao.md:245`, `:379`; `relatorio-kit-etapa7d1b.md:804`, `:827` |
| 457856c: como acha o teste? | Em **tempo de execução**. O gate vitest reprova, e `vitest_arquivos_falhos` lê os `FAIL <arquivo>` do `gate-vitest.txt` | Comarka `lib.sh:771`, `executor.sh:678-692` |
| 457856c: como liga o teste ao arquivo? | `teste_cita`: o teste contém, seguido de aspas (`'`, `"` ou crase), um destes: o caminho; o caminho sem extensão e sem `/index`; ou `@/` + o caminho sem `src/`. É string pura, sem resolver import: import relativo `../src/x/y` casa porque termina em `src/x/y'`. Os candidatos são os itens sem glob da allowlist mais os arquivos do diff que casam a allowlist | Comarka `lib.sh:792-805`, `executor.sh:440-451` |
| 457856c: quando amplia? | Só se **toda** falha for teste (`test/*` ou `*.test.ts(x)`/`*.spec.ts(x)`) fora da allowlist e que cita um candidato. Uma vez por ticket (só se a tentativa não veio ampliada), só na tentativa seguinte, via `allowlist-ampliada.txt` (`--allowlist-extra` no enforcement), com o bloco FAIL e a regra anti-afrouxamento no prompt do executor e do juiz | Comarka `lib.sh:812-850`, `executor.sh:681-692`, `enforcement.sh:8-43`, `avaliador.sh:101-112` |
| 457856c na entrada (`validar-fila`) | Camada 15 `lint_teste_vizinho`, **ERRO**: arquivo de `src/` da allowlist importado **direto** (relativo e `@/`, resolvido) ou citado (`Grafo.citam`) por teste em `test/` fora da allowlist e **fora de `testes_conferidos`**. A camada 6 (`lint_testes_afetados`) faz o mesmo com import **transitivo** e para qualquer item fora de `test/`, mas sai WARN | Comarka `validar-fila.py:562-589`, `:858-957`, `:982-1032` |
| Semântica de glob no gate | `globToRegExp` em 6b e 9w: `*` **não** atravessa `/`, `**` atravessa, `**/` vale zero ou mais segmentos. A C11 ignora item com glob e compara teste com a allowlist por igualdade. O C8 usa igualdade. `dir/` não é normalizado | `enforcement-core.ts:149-174`; `gate-ticket.ts:555-556`, `:1634`, `:1338`, `:1362`, `:1573` |
| Semântica de glob no enforcement-core do kit | `matchesAllowlist` = `globToRegExp`: `*` **não** atravessa `/`. **Sem** `normalizarEntradaAllowlist`: `src/x/` não casa `src/x/a.ts` (conferido: `false`). O Comarka tem a normalização | kit `enforcement-core.ts:178-180`; Comarka `enforcement-core.ts:85-90` |
| Allowlist do executor do kit | Mesma função (`decisao.ts:780` usa `matchesAllowlist`). O kit não tem allowlist derivada em tempo de execução: o teste vizinho não foi portado | `decisao.ts:780`, `executor.sh:298` |
| Allowlist derivada no executor do Comarka (457856c) | `casa_allowlist`: `[[ "$f" == $pat ]]`, com `*` **atravessando** `/` (conferido: `src/a/b/c.ts == src/*.ts` → verdadeiro); `dir/` vira `dir/**` | Comarka `lib.sh:778-789` |
| Allowlist no `validar-fila` do Comarka | `fnmatch.fnmatch`: `*` **atravessa** `/` | Comarka `validar-fila.py:571`, `:960` |
| A divergência de glob afeta a C11? | Pouco. Em 1 dos 259 disparos atuais nos TODOS, um teste "fora" é coberto por glob da allowlist (com as duas semânticas). Há 244 done com glob ou `dir/` na allowlist | medição `base-done.json` |
| A worktree do kit nasce de onde? | Da `branch_alvo` **local**. Então `origin/<alvo>` em critério tem no kit o mesmo risco de defasagem do 1004 | `executor.sh:298` |

## 3. Item 3 · os casos reais, versão de entrada

A coluna "hoje" mostra o gate atual na versão de entrada, com a árvore da entrada. Sem nota, todas as regras listadas são `aviso`. `6b` e `10n` disparam em quase todos e não estão listadas (6b: 1000/1266 done; 10n: 954/1266). **Nenhum caso dispara regra `erro`.**

A coluna "C11 v2" mostra o teste real flagrado pela variante c15 (import direto mais citação, para `src/`) / pela híbrida (c15 mais citação de item fora de `src/`). `ent` = árvore da entrada; `pv` = árvore do pré-voo; `(conf)` = o teste real estava em `testes_conferidos`. Sem a isenção de `testes_conferidos`, a regra dispara; respeitando a isenção, não dispara.

### 3a. Allowlist (os 18 reais, e os demais da mesma linha de resgate)

| id | classe (causa) | regra que dispara hoje | C11 v2 (c15 / híb) | o que teria barrado |
|---|---|---|---|---|
| 762 | teste acoplado: `cron-paths-vercel` cita `vercel.json` (allowlist) e exige `src/middleware.ts` (fora) | nenhuma | -/S ent e pv (conf) | híbrida sem isenção; alternativa `testes_vizinhos` (o 457856c amplia: o teste cita `vercel.json`) |
| 856 | teste lê por diretório (`rotas-orfas` varre `src/app/dashboard` com `readdirSync`) | nenhuma | - / - | nada estático medido: o caminho é `join(SRC_ROOT,'app','dashboard')`, e o teste não cita o arquivo. O 457856c também não amplia |
| 711a | critério 14 contradiz `sem-insumo.test.ts:237` (o teste importa `@/components/estados/sem-insumo`, fora da allowlist) | nenhuma | - / - | nada por import; é contradição entre critério e teste |
| 950 | teste acoplado (`etapa2-funil-motor` importa `@/lib/qualificacao/motor`) | 6q | S/S (conf) | C11 v2 sem isenção |
| 1006 | teste acoplado (`quem-cuida` importa `alertas-campanha/route` e cita `performance/route.ts`) | 6q | S/S (conf) | C11 v2 sem isenção |
| 840 | teste acoplado (`nps-reacao-resposta`); o teste **nasceu depois** da entrada | nenhuma | ent -; **pv S/S** | C11 v2 no pré-voo, com ou sem isenção |
| 924a | dois testes do mesmo bloco | **C11 nomeia os 2 testes reais** (`visao-aceite-mockup`, `conta-entregas-vazio-unico`), 6q | S/S (conf) | C11 de hoje já nomeia; o escritor declarou conferido |
| 1054 | mais de um vermelho (2 testes importam as rotas) | 6q | S/S (conf) | C11 v2 sem isenção |
| 1055b | mais de um vermelho | 6q | S/S (conf) | C11 v2 sem isenção |
| 1058 | mais de um vermelho (`quem-cuida`; `negocio-temperatura` nasceu depois) | 6q | S/S; pv também com isenção | C11 v2 |
| 854 | teste lê por diretório (`rotas-orfas`, `expected 21 to be 20`) | nenhuma | - / - | nada estático medido |
| 966 | teste lê a navegação (`ficha-nav-colapsavel`) | 6q | S/S (conf) | C11 v2 sem isenção |
| 318c | arquivo de `src` fora (`nichos-teses-aba.tsx`), apontado só pelo juiz | 6q | n/a | nada estático: o arquivo nem existia na árvore da entrada |
| 830 | executor parou com diff 0: importadores em `scripts/dados` e `test/dono-dry-run` | nenhuma | - / - | grafo que inclua `scripts/` (fora do porte medido) |
| 826 | allowlist real diferente (spec nova) | nenhuma | S/S (conf) | C11 v2 sem isenção |
| 855 | `adocao-predicado` | nenhuma | S/S (conf) | C11 v2 sem isenção |
| 1059 | 2 testes que nasceram depois da entrada | 6q | ent -; **pv S/S** | C11 v2 no pré-voo |
| 1195 | `reuniao-manual-registro` (nasceu depois) | 6q | ent -; pv S/S (conf) | C11 v2 sem isenção, no pré-voo |
| 711b3 | `saude-motivo-sem-base` cita `page.tsx` e `geral-tab.tsx` | nenhuma | S/S (conf) | C11 v2 sem isenção |
| 1053 | `papel-nas-escritas` importa a rota | C11 (nomeia **outro** teste), 6q | S/S (conf) | C11 v2 sem isenção |
| 1053b | `src/lib/clientes/espelho-legado.ts` fora (arquivo de src) | C11 (outros testes), 6q | n/a | nada estático medido |
| 1056b | sem mudança de allowlist no `b7a3eea` | 6q | n/a | não é caso de allowlist |

Contagem (19 casos com teste como causa), na árvore do pré-voo:

| regra | pega o teste real (sem isenção) | pega o teste real (com isenção de `testes_conferidos`) |
|---|---|---|
| C11 de hoje | 1 (924a) | 0 |
| C11 v2 c15 | 14 | 3 (840, 1058, 1059) |
| C11 v2 híbrida | 15 | 3 |

**Em 13 dos 19 casos, o teste real estava em `testes_conferidos`** na versão que rodou. Isso confirma o `inv-sessoes.md:40` ("762 `testes_conferidos` falso") como padrão, não como exceção.

### 3b. Critério (os 12 da medição)

| id | classe | regra que dispara hoje | candidata | o que teria barrado |
|---|---|---|---|---|
| 739 | regex frágil (conta comentário de 4 arquivos fora da allowlist) | 6v, 6a:`rm ` (o ticket entrou `bloqueado`) | nenhuma | nada estático medido (é a camada 11 do Comarka) |
| 900 | regex frágil (`.{1,2}` da f-string) | nenhuma (só 6b/10n) | C13 | nada estático medido |
| 898 | regex frágil (`delete` casa `on delete cascade`) | 6a:`rm ` | C13 | nada estático medido |
| 851 | premissa errada (`valor_mensal`, que o c0-guard proíbe) | nenhuma | C13 | nada estático |
| 707 | premissa errada ("Abrir grupo" não existe) | nenhuma | C13 | nada estático |
| 741 | premissa errada (`detectar.ts` sem função pura) | nenhuma | C13 | nada estático |
| 924b | `grep -c &&` (`3f56478`) | 6q | **C14**, C13 | **C14** |
| 924c | `grep -c &&` (`3718afa`) | 6q | **C14**, C13 | **C14** |
| 924d, 924f | mesma família, consertados no `3718afa` | 6q (924d também C11) | **C14**, C13 | **C14** |
| 926b | mesmo commit; o conserto foi preventivo (variáveis esperadas ≥ 1, a cadeia quebrar já é reprova certa) | 6q | C13 | não é defeito; a C14 corretamente não dispara |
| 999c | mesmo commit que o 924b, mas o resgate foi de **premissa** (`import type`) | 6q, C11 | C13 | não é `grep -c` |
| 1004 | `origin/staging-auto` defasado (`f01a989`, mais 840, 963b, 994 preventivos) | 6q | **C13** | **C13** |
| 1200 | `slice(-4)` (`ce84bb2`) | 6q | nenhuma | nada estático |
| 1191 | spec reaberta (`fd12015`) | 6q | nenhuma | nada estático |

## 4. FP nos done

### 4a. Item 4 · linha de base (gate atual)

| regra | TODOS (1266, versão e árvore de hoje) | P1r (368, versão que rodou, árvore do momento) | calibração 25/09 (Comarka) |
|---|---|---|---|
| C11 | **259** (TS) | **66** (réplica) | 122 |
| C2c | **4** (215, 487, 489, 505) | **0** | 4 |
| C2v | **0** | **0** | 0 |

Outras regras nos TODOS, para referência: 6q 438, 6v 284, 8 303 (inflado: forçar todos a pendente cria sobreposição entre done), 6b 1000, 10n 954, C3 15, C4 15, 6a:`rm ` 42.

### 4b. Item 5 · C11 nova, FP por variante (tickets com ≥ 1 disparo)

| variante | P1r sem isenção | P1r com isenção `testes_conferidos` | P1 entrada (413) sem / com |
|---|---|---|---|
| atual (basename, 1 a 4) | 66 | 32 | 62 / 25 |
| atual sem o teto de 4 | 119 | 87 | 117 / 80 |
| **c15** (import direto resolvido, relativo e `@/`, mais citação; itens de `src/`) | **180** | **87** | 172 / 30 |
| c6 (import transitivo mais citação; todo item fora de `test/`) | 272 | 115 | 281 / 44 |
| exec (`teste_cita` do 457856c; todo item sem glob) | 163 | 82 | 149 / 19 |
| híbrida (c15 mais citação de item fora de `src/`) | 262 | 98 | 267 / 32 |

**Nenhuma variante chega a zero.** A melhor relação entre acerto e FP é a c15, que pega 14 de 19 com 180 de 368 FP (49%). A c15 com isenção fica com 87 FP e pega 3 de 19. O FP sem isenção não é ruído de algoritmo: são testes que de fato importam o arquivo e não quebraram. **Estaticamente não dá para distinguir o teste que vai quebrar do que não vai.** Por isso proponho a alternativa (§5, P7).

### 4c. Item 6 · regras novas de critério (critérios executáveis, `espera ≠ avaliador`)

| regra | definição medida | FP P1r (368) | disparos TODOS (1266) | casos reais que pega |
|---|---|---|---|---|
| **C13** | `origin/<ref>` no cmd | **120** | 318 (313 `origin/staging-auto`) | 1004 (28 dos 39 casos disparam, contando o 1004, por ser a forma padrão de `merge-base`) |
| C14a | a forma A da 7f-b6: `v=$(… grep -c …) &&` sem `\|\|` dentro | 7 | 16 | 924b, 924c, 924d, 924f, 926b |
| **C14** | C14a **e** `grep -c` como último comando do `$( )` (sem pipe depois) **e** `v` comparada com 0 (`=`, `-eq`) ou com teto (`-le`, `-lt`), ou seja, 0 é estado certo possível | **0** | 1 (**1116**: done manual, sem `meta.json`, nunca rodou no loop; o critério tem o defeito de fato: `m=0` quebra a cadeia e sai `ST`) | **924b, 924c, 924d, 924f** |
| C15a | `ls`/`find … \| wc -l` no cmd | 1 (5031) | 21 | **nenhum** |
| C15b | C15a comparado com número exato, sem teto | 1 (5031: `ls docs/fila/apolo/5991-*.md \| wc -l` espera 0, legítimo) | 20 (042 a 498) | **nenhum** |

A primeira versão da C14 pegou o 922b (`s=$(grep -c … | awk …)`): ali o rc é do `awk`, sem pipefail desde a P0. Por isso o refinamento "grep -c como último do pipe".

## 5. Plano das peças (teto de ~300 linhas cada)

| peça | o quê | severidade proposta | pronto quando | teto |
|---|---|---|---|---|
| **P1** | C11 v2: grafo de import da `branch_alvo` (relativo mais `paths` do `tsconfig.json` da raiz; `@/*` no Comarka), import **direto**, mais citação (porte de `Grafo.citam`). Variante c15 ou híbrida, a decidir (Q1). Teste "dentro" pela allowlist com `matchesAllowlist` do enforcement-core (absorve a P5). Lê a árvore da **branch alvo**, não do checkout (hoje `git grep` no disco, `gate-ticket.ts:1120`). `porque` com o FP medido aqui (e corrige o 9/4/122 desatualizado) | aviso | 950 e 1006 disparam na versão de entrada; 840 dispara com a árvore do pré-voo; 762 só se for a híbrida; FP no `porque` igual ao §4b. **856 e 711a ficam fora do critério de pronto** (não são alcançáveis por import nem citação) | ~280 |
| **P2** | C13: `origin/<branch_alvo>` em critério executável, com a dica "use `<branch_alvo>` local: a worktree nasce dela (`executor.sh:298`)" | aviso (Q2) | 1004 dispara; FP 120/368 escrito | ~90 |
| **P3** | C14 como no §4c | **erro** (0 FP) | 924b e 924c (os 2 reais), mais 924d e 924f, disparam; 926b, 999c e 922b não disparam; FP 0/368 escrito, com 1116 anotado | ~120 |
| ~~P4~~ | C15 | — | **recomendo não fazer**: 0 dos casos e 1 FP. O 854/856 é teste que varre diretório, e isso não tem detector estático medido | — |
| ~~P5~~ | glob único | — | absorvida na P1 (3 linhas). A normalização de `dir/` que falta no `enforcement-core.ts:178` do kit é motor fora do escopo desta etapa (Q5) | — |
| **P6** | docs: PECAS.md, CHANGELOG.md, CONTRATO.md (seção do gate) com a tabela de FP do §4 | — | — | ~120 |
| P7 (só com ok) | alternativa do item 5: o gate escreve no `--relatorio` a lista de testes vizinhos (c15, **sem** isenção) e sugere o campo `testes_vizinhos`; o executor o usa como allowlist de teste **condicionada a falha** (porte do 457856c). Pelo `teste_cita`, a ampliação do 457856c teria agido em ~12 dos 19 casos | — | exige escrever `executor.sh` e o enforcement: **fora do escopo desta etapa**, vira etapa própria | — |

Fixtures: o `.md` de entrada de cada caso copiado verbatim (`git show <E>:<arquivo>`); a árvore reduzida às linhas de import e citação de cada teste envolvido, com cabeçalho `<sha>:<caminho>`. Casos: 950, 1006 e 840 (com árvore de entrada e de pré-voo), 762 (se híbrida) e um done de P1r como controle negativo por regra. Para a P3: 924b, 924c, 924d, 924f, 926b, 999c e 922b.

Ordem: P3 (a mais limpa), P2, P1, P6.

## 6. Perguntas que só o Lucas responde

1. **C11 v2, variante:** c15 (só `src/`; pega 14/19; FP 180) ou híbrida (mais citação de `vercel.json`, migrations etc.; pega 15/19, inclui o 762; FP 262)?
2. **C11 v2 e `testes_conferidos`:** o kit não conhece o campo. Respeitar, como a camada 15 do Comarka (FP 87, pega 3/19), ou ignorar e só avisar (FP 180, pega 14/19)? Minha recomendação: **ignorar no aviso** e fazer da lista o insumo da P7, porque o defeito real é exatamente o conferido errado.
3. **Severidades:** C11 v2 `aviso` (FP ≠ 0) · C13 `aviso` (FP 120/368, mas cada disparo é defeito latente; a régua não deixa ser erro) · C14 **`erro`** (FP 0). Confirma? Ou a C13 vira erro "só para ticket novo" (a pergunta 7 da 7f-b6 ficou sem resposta)?
4. **Alternativa do item 5 (P7):** aceita `testes_vizinhos` como allowlist condicionada a falha? Se sim, vira etapa própria com escopo de executor e enforcement, ou entra nesta com o escopo ampliado?
5. **Normalização de `dir/`** no `enforcement-core.ts` do kit (o Comarka tem, o kit não): fica para a etapa da P7, ou registro como pendência de motor?
6. **P4 (C15):** confirma que sai? E a classe "teste que varre diretório" (854, 856) fica explicitamente sem detector estático?
7. **Critério de pronto da P1** revisto (sem 856 e 711a; 840 só no pré-voo): ok?
8. **Fixtures com trecho de teste do Comarka** dentro do kit (só as linhas de import e citação, com sha de origem): ok?

## 7. Decisões do Lucas (ok do PASSO 0)

c15 (não a híbrida); a C11 v2 ignora `testes_conferidos` e marca o conferido na mensagem; o `--relatorio` lista os vizinhos; C11 aviso, C13 aviso (vira erro para ticket novo quando o gerador do Comarka parar de escrever `origin/`), C14 erro; P7 e a normalização de `dir/` registradas em PECAS como etapa 8b; P4 sai e "teste que varre diretório" fica com o triador; P1 lê a `branch_alvo` e usa `matchesAllowlist` (absorve a P5); critério de pronto da P1: 950 e 1006 na entrada, 840 no pré-voo. Ordem: P3, P2, P1, P6.

## 8. Peças

Fixtures em `test/fixtures/gate-ticket-8a/` (origem de cada arquivo em `ORIGEM.md` e `c11/ORIGEM-c11.txt`); teste em `test/orquestrador-gate-8a.test.ts`. O vermelho de cada peça é o teste novo, rodado contra o motor do commit anterior, no mesmo commit.

### P3 · C14 (`erro`) · commit `578bf7d`

`gate-ticket.ts`: linha `C14` na tabela `REGRAS`, `grepCEncadeado` e a chamada junto das C2 (bloco de critério executável). A tabela de `orquestrador-gate-severidade.test.ts` ganhou `C14: 'erro'`.

Vermelho (motor `85c49a6`):
```
   × 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924b (versão de entrada) dispara C14 como erro em criterios_aceite[6] 6ms
   × 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924c (versão de entrada) dispara C14 como erro em criterios_aceite[5] 2ms
   × 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924d (versão de entrada) dispara C14 como erro em criterios_aceite[5] 1ms
   × 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924f (versão de entrada) dispara C14 como erro em criterios_aceite[7] 2ms
   × 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > a tabela registra C14 como erro, com o FP medido no porque 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯
      Tests  5 failed | 3 passed (8)
rc=1
```

Verde:
```
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924b (versão de entrada) dispara C14 como erro em criterios_aceite[6]
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924c (versão de entrada) dispara C14 como erro em criterios_aceite[5]
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924d (versão de entrada) dispara C14 como erro em criterios_aceite[5]
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 924f (versão de entrada) dispara C14 como erro em criterios_aceite[7]
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 926b: grep -c encadeado, mas as variáveis esperam ≥ 1 — a cadeia cortada já é reprova certa; não dispara
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 999c: grep -c separado por ; (o resgate foi de premissa) — não dispara
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > 922b (controle negativo P1r, rodou de primeira): grep -c | awk — o rc é do awk; não dispara
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo > a tabela registra C14 como erro, com o FP medido no porque
      Tests  8 passed (8)
rc=0
```

Medição com a função TS:
```
P1r 368 C14 []
TODOS 1266 C14 [ '1116' ]
casos C14 [ '924b', '924c', '924d', '924f' ]
```

O corpus 7d-1 (`orquestrador-gate-corpus.test.ts`, que reprova regra `erro` com FP nos 706 done dele) passou com a C14.

### P2 · C13 (`aviso`) · commit `bc63343`

`gate-ticket.ts`: linha `C13` na tabela (FP 120/368 e a condição para virar erro), `refsOrigin` e a mensagem com a `branch_alvo` local. A tabela de severidade ganhou `C13: 'aviso'`.

Vermelho (motor `578bf7d`):
```
 × test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > 1004 (versão de entrada) dispara C13 como aviso nos 3 critérios com origin/staging-auto, com a dica da branch local
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > 1012 (controle negativo P1r): merge-base com a branch local — não dispara
 × test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > a tabela registra C13 como aviso, com o FP e a condição para virar erro no porque
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > 1004 (versão de entrada) dispara C13 como aviso nos 3 critérios com origin/staging-auto, com a dica da branch local
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > a tabela registra C13 como aviso, com o FP e a condição para virar erro no porque
      Tests  2 failed | 9 passed (11)
rc=1
```

Verde:
```
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > 1004 (versão de entrada) dispara C13 como aviso nos 3 critérios com origin/staging-auto, com a dica da branch local
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > 1012 (controle negativo P1r): merge-base com a branch local — não dispara
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local) > a tabela registra C13 como aviso, com o FP e a condição para virar erro no porque
      Tests  11 passed (11)
rc=0
```

Medição com a função TS:
```
P1r 368 C13 120
TODOS 1266 C13 318
casos C13 28 de 39 | 1004: true
```

### P1 · C11 v2 (`aviso`) · commit `b68bd4b`

`gate-ticket.ts`:
- `ContextoRepo.testesQueCitam` virou `arvoreAlvo()`;
- `lerArvoreAlvo` (`ls-tree` mais um `cat-file --batch`, memorizado por commit; lê a `branch_alvo`, não o disco);
- `aliasesDoTsconfig` e `resolverImport` (relativo e `paths`);
- `citacaoDoTeste` e `testeCita` (porte de `Grafo.citacao`/`citam`);
- `testesVizinhos` (itens de `src/`, glob expandido; "dentro" por `matchesAllowlist`);
- a mensagem marca o conferido;
- `Violacao.vizinhos` e a linha `testes_vizinhos (C11): [...]` no `--relatorio`;
- o `porque` com 180/368 (sai o 9/4/122).

Fixtures `c11/`: 950 na entrada, 1006 na entrada, 840 no pré-voo e 844 como controle negativo da P1r (a C11 antiga o acusava pelo basename `nps-disparo`).

Asserções antigas que mudaram:
- `orquestrador-gate-comarka.test.ts`: os 2 testes da C11 antiga sobre o 402 viraram 1 (a v2 não acusa `vercel.json`, item fora de `src/`); o teste do CLI troca a mensagem esperada;
- `gate-corpus-7d1/contexto.ts` devolve `arvoreAlvo: undefined`.

Vermelho (motor `bc63343`):
```
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava)
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > lê a branch_alvo, não o disco do checkout
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > "dentro" é matchesAllowlist: glob da allowlist cobre o teste
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida)
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > --relatorio lista os testes vizinhos do ticket (insumo da 8b)
 × test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > a tabela: C11 aviso, com o FP medido na 8a no porque (não mais o 9/4/122 da calibração do Comarka)
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava)
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > lê a branch_alvo, não o disco do checkout
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida)
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > --relatorio lista os testes vizinhos do ticket (insumo da 8b)
 FAIL  test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > a tabela: C11 aviso, com o FP medido na 8a no porque (não mais o 9/4/122 da calibração do Comarka)
      Tests  8 failed | 12 passed (20)
rc=1
```

O 844 vermelho é a C11 antiga disparando:
```
+     "mensagem": "a allowlist toca src/lib/jobs/nps-disparo.ts (basename 'nps-disparo'), citado em test/cron-paths-vercel.test.ts — fora da allowlist. Se a mudança quebrar esse teste, o executor não pode corrigi-lo: declare o teste na allowlist (com critério anti-afrouxamento) ou confirme que a mudança não o afeta",
```

Verde:
```
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava)
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > lê a branch_alvo, não o disco do checkout
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > "dentro" é matchesAllowlist: glob da allowlist cobre o teste
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida)
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > --relatorio lista os testes vizinhos do ticket (insumo da 8b)
 ✓ test/orquestrador-gate-8a.test.ts > 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > a tabela: C11 aviso, com o FP medido na 8a no porque (não mais o 9/4/122 da calibração do Comarka)
      Tests  20 passed (20)
rc=0
```

Medição com `testesVizinhos` (TS) sobre as mesmas árvores do PASSO 0 (bate com o protótipo: 180, 87, 14 de 19):
```
pop-p1r.json 368 tickets | com C11 v2: 180 | com C11 v2 se conferidos isentassem: 87 | teste real nomeado: 0 
pop-pre.json 22 tickets | com C11 v2: 20 | com C11 v2 se conferidos isentassem: 13 | teste real nomeado: 14 1059 1053 1054 1055b 950 855 826 1006 1058 1195 840 924a 966 711b3
pop-casos-ent.json 39 tickets | com C11 v2: 30 | com C11 v2 se conferidos isentassem: 5 | teste real nomeado: 11 966 711b3 950 1054 1055b 1058 1053 924a 1006 826 855
```

Custo no CLI, cópia do Comarka em `/tmp/orq-8a/comarka`, 63 pendentes: `--pendentes` 19,4 s antes e 26,0 s depois; 1 ticket (formato do pré-voo) 1,5 s. Disparos de C11 nos pendentes: 22 linhas antes, 202 depois.

### P6 · docs · commit `1173f2a`

- CONTRATO §12.1 (tabela: C14 erro, C13 aviso, C11 v2), §12.3 (a C11 lê a `branch_alvo`) e §12.6 novo (a etapa, a régua P1r, a tabela de FP, o que fica fora);
- CHANGELOG "Etapa 8a";
- PECAS: 8a em FEITAS; em PENDENTES, a 8b (`testes_vizinhos` condicionado a falha mais a normalização de `dir/`, com os números de §3a e §4b) e a classe "teste que varre diretório" (854, 856), do triador.

Sem vermelho: docs não são motor (CLAUDE.md).

### P6b · renumeração 8b → 8c · commit `0917131`

Já existe uma etapa 8b em paralelo (riscos ativos do kit, worktree `kit-etapa8a`). A etapa do `testes_vizinhos` condicionado a falha, mais a normalização de `dir/`, passa a se chamar **8c**. Mudou só texto: PECAS (título e corpo da pendente), CHANGELOG (8a-4), CONTRATO §12.6, o comentário do `--relatorio` em `gate-ticket.ts` e o nome do teste "insumo da 8c". O commit `1173f2a` ainda diz "8b" na mensagem, porque commit não se reescreve. Nas seções 5 a 7 e 12 deste relatório, "8b" deve ser lido como 8c.

```
$ TZ=UTC node_modules/.bin/vitest run test/orquestrador-gate-8a.test.ts
 Test Files  1 passed (1)
      Tests  20 passed (20)
vitest rc=0
$ npx tsc --noEmit
tsc rc=0
```

## 9. Tabela final: caso real, regra, dispara antes, dispara depois

"Antes" é o motor `85c49a6`; "depois" é `1173f2a`. Versão de entrada, salvo onde diz pré-voo.

| caso | regra | antes | depois |
|---|---|---|---|
| 924b | C14 | não (só 6q aviso) | **sim, erro** |
| 924c | C14 | não | **sim, erro** |
| 924d | C14 | não (C11 antiga, outros testes) | **sim, erro** |
| 924f | C14 | não | **sim, erro** |
| 926b, 999c | C14 | não | não (correto: não é o defeito) |
| 1004 | C13 | não | **sim, aviso** |
| 950 | C11 | não | **sim, aviso** (nomeia `etapa2-funil-motor`, marcado conferido) |
| 1006 | C11 | não | **sim, aviso** (nomeia `quem-cuida`, marcado conferido) |
| 840 (pré-voo) | C11 | não | **sim, aviso** (nomeia `nps-reacao-resposta`) |
| 924a | C11 | sim, aviso (nomeia os 2 reais) | sim, aviso (nomeia os 2, marcados conferidos) |
| 966, 711b3, 1054, 1055b, 1058, 1053, 826, 855 | C11 | não | sim, aviso (teste real nomeado, entrada) |
| 1059, 1195 | C11 | não | sim, aviso no pré-voo |
| 762, 856, 854, 711a, 830, 318c, 1053b | C11 | não | não (fora do alcance, por decisão) |
| 739, 900, 898, 851, 707, 741, 1200, 1191 | — | não | não (regex frágil e premissa: sem regra estática) |
| 844 (controle P1r) | C11 | sim, aviso (FP pelo basename) | não |
| 922b, 1012 (controles P1r) | C14, C13 | não | não |

## 10. FP nos done por regra (depois)

| regra | sev. | P1r (368) | todos os done (1266) |
|---|---|---|---|
| C14 | erro | 0 | 1 (1116, manual, com o defeito) |
| C13 | aviso | 120 | 318 |
| C11 v2 | aviso | 180 (87 se o conferido isentasse) | não medido com a v2 (a antiga: 259) |
| C2c | aviso | 0 | 4 |
| C2v | aviso | 0 | 0 |

## 11. As quatro suítes (worktree em `1173f2a`)

```
$ npx tsc --noEmit
rc=0
```

```
$ TZ=UTC node_modules/.bin/vitest run   (cauda)
 Test Files  97 passed (97)
      Tests  1586 passed (1586)
   Start at  16:45:46
   Duration  84.18s (transform 1.29s, setup 0ms, collect 28.88s, tests 541.93s, environment 17ms, prepare 5.77s)

rc=0
```

```
$ bash scripts/kit/test-shell.sh   (cauda)
  rc=0  test-criterio-isolado.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

```
$ bash scripts/kit/test-instalar.sh   (cauda)

TODOS OS CHECKS PASSARAM
rc=0
```

Saídas inteiras em `/tmp/orq-8a/pecas/`. Sem push, sem `--no-verify`, sem `claude -p`. No Comarka foi só leitura.

## 12. Para o Lucas

- **Colisão de nome "8b".** Por decisão sua, o PECAS desta etapa registra a próxima como "8b" (`testes_vizinhos`). No meio desta sessão chegou uma mensagem dizendo que a etapa da *outra* sessão (`kit-etapa8a`) "passa a se chamar 8b", com docs e CHANGELOG nesse nome. Os dois nomes vão colidir no PECAS e no CHANGELOG. Essa mensagem parece ter vindo para esta sessão por engano: ela cita esta sessão como "a outra", e não agi sobre ela.
- A outra sessão também mexe em CHANGELOG, PECAS e CONTRATO. O merge das duas branches deve ter conflito nesses três arquivos.
