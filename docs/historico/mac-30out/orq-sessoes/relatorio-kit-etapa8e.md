# Relatório da etapa 8e do kit: juiz com material completo, contexto limpo, REVIEW.md e harness fora do gate

Worktree `~/Projetos/_worktrees/kit-8e`, branch `kit/8e`. PASSO 0 entregue sobre `220068f`; as peças estão na seção Peças (HEAD `302a870`). Texto original do PASSO 0:
nenhum arquivo do kit foi escrito. Os únicos arquivos criados ficam no scratchpad da sessão (a cópia
dos 3 tickets do dashboard e o script de medição da P6).
Comarka e dashboard foram só lidos, com `GIT_OPTIONAL_LOCKS=0` e apenas log/show/rev-parse/ls-tree/merge-base.
Nenhum `claude` foi rodado.

## PASSO 0: tabela

| # | Pergunta | Resposta | arquivo:linha |
|---|---|---|---|
| 1 | Onde o material do juiz é montado | Em duas partes. `run_juiz` (bash) junta o JSON de entrada e `montarPromptJuiz` (TS) monta o texto. Entram: id, objetivo, critérios (tipo, descrição, cmd, espera), allowlist, `git diff base...HEAD`, `gates.txt`, a nota "commit dado pelo harness" (só quando ele commitou), `contexto_juiz` lido da base (622), as definições chamadas pelos testes novos lidas da base (628) e os testes vizinhos ampliados (8c). **O corpo dos commits não entra.** O jq de entrada só tem `{id, objetivo, criterios, allowlist, diff, gates, nota, contexto, definicoes, ampliados}`, o diff vem de `git diff`, que não carrega a mensagem, e não existe `git log` em `run_juiz`. Prova no disco: `grep -c Orq-Ticket` dá 0 nos 5 `juiz.prompt.txt` do lote (001/0, 002/0, 002/1, 003/0, 003/1). | `executor.sh:809-852` (jq em `:841-851`, diff em `:844`); `juiz.ts:85-124` (EntradaPrompt), `juiz.ts:458-499` (montarPromptJuiz) |
| 2 | cwd, flags e fontes de configuração do juiz | O cwd é **a worktree do ticket**: `claude_run "$wt" …` faz `cd "$dir" && exec claude "$@"`. Flags: `-p <prompt> --output-format json --model <m> --allowedTools "" --max-turns 1`. Não há `--setting-sources`, `--strict-mcp-config`, `--disable-slash-commands`, `--tools`, `--bare` nem env de config. **Pelo código, ele pode carregar o CLAUDE.md da branch e o `.claude/` da worktree.** A worktree fica em `../_worktrees/<nome>` e é um checkout da `staging-auto`, que versiona `CLAUDE.md` (148 linhas), `.claude/commands/neuro-content.md` e 21 skills em `.claude/skills/`. Também entram as fontes do usuário (`~/.claude/settings.json`, plugins, MCP). `--allowedTools ""` não tira as definições de ferramenta do contexto: só deixa de aprovar automaticamente. Indício (não prova) de contexto ambiente: `usage` dos `juiz.raw.json` com cache_creation de 35 a 53 mil tokens mais cache_read de 13 mil, para um prompt de 9 a 18 KB (uns 3 a 6 mil tokens). | `lib.sh:1510-1517`; `executor.sh:862-864`; `lib.sh:117` (WORKTREES_BASE); config do dashboard `worktrees_dir: ../_worktrees` |
| 3 | Por que reprovou na attempt-0 e aprovou na attempt-1 (002, 003) | **O corpo do commit não estava em nenhuma das duas tentativas, e o modelo foi o mesmo nas duas: Sonnet** (`modelUsage` dos raw; `retryFinal` = attempt ≥ max_retries=2, e a attempt-1 não é final). Quem subiu para Opus foi o **executor**, não o juiz. O que mudou entre os prompts: (i) o diff, porque na attempt-1 o teste ficou mais forte (`contagemMock`, asserções sobre o `console.error`, caso extra de tipo inexistente), e (ii) os tempos dos gates. O critério é composto: "falhariam contra a versão anterior" (dá para conferir lendo o diff) e "(o corpo do commit diz isso)" (não dá, sem o corpo). Na attempt-0 o juiz cobrou a segunda parte. Na attempt-1 cobrou só a primeira ("(a)/(b) ficariam vermelhos no código antigo"). É inconsistência do juiz sobre o mesmo pedaço de material ausente, favorecida por um teste melhor. Detalhe: na attempt-1 o corpo do commit **tinha** a contraprova caso a caso (`73aef447`, `2ea74789`), e o juiz aprovou sem ela. | diff dos `juiz.prompt.txt` abaixo; `runs/00{2,3}/attempt-{0,1}/juiz.raw.json` |
| 4 | Por que `test/orquestrador-*` entra no gate de testes do repo | É de propósito (K8d): `vendorizar_motor` copia 20 testes de harness e 7 fixtures para `<repo>/test/`, enumerados em `TESTES_HARNESS`. O gate `testes` do dashboard é `node_modules/.bin/vitest run`, com o include padrão do vitest e exclude só de `*.integration.test.ts` e `arquivo-solto`, então ele roda todos. No CI o include é `test/**`. O tsc do dashboard já exclui `test/orquestrador-*` e `test/fixtures/**`. O tsconfig do CI inclui `test` (é o defeito "tsconfig inclui o harness"). O timeout de 30 s nos 4 casos já está na `main` (`23866f1`), e a cópia do dashboard já tem os `30_000`. **Menor conserto (recomendo):** `gates.ts` exporta `ORQ_GATE=1` no `spawnSync` de cada gate, e os testes vendorizados usam um `describe` do `orq-harness.ts` que vira `describe.skip` sob `ORQ_GATE=1`. Não mexe em config do repo e vale para dashboard, CI e Actus. O harness continua rodando no `vitest run` humano e no kit, que é o valor da K8d. **Não resolve o tsc do CI.** Mover para `scripts/orquestrador/harness/*.harness.ts` com vitest config própria resolve os dois, mas reescreve os imports relativos dos 20 arquivos e o caso (h) do test-instalar: umas 4 a 5 vezes o tamanho. Timeout sozinho não serve: o defeito é contenção, e o teste de harness não é critério de nenhum ticket. | `instalar.sh:598-619`; `scripts/kit/vendorizado.sh` (lista e decisão K8d); `gates.ts:431` (spawnSync sem env); `vitest.config.ts` e `tsconfig.json` do dashboard e do CI |
| 5 | Validador hoje: (a) critério que depende do corpo do commit; (b) vitest autorizado com saída em `/dev/null` num ticket que pede vermelho antes | **Os dois passam calados.** Rodado o gate atual numa cópia dos tickets 002 e 003 (status trocado para pendente): `0 violação(ões), 0 isenção(ões), 0 aviso(s)`. (a) Nenhuma regra lê o conteúdo da descrição de critério avaliador. (b) A `6r` só pega redirecionamento que escreve arquivo da worktree (`/dev/null` não é), e a `6v` só pega leitura do texto do vitest (aqui é o rc). Proposta, as duas como **aviso** (D7): **C15** = descrição de critério casando `/(corpo\|mensagem) do commit/i` ("o juiz não recebe o commit; reescreva como critério que o diff ou um cmd provam"). **C16** = o ticket pede vermelho antes (objetivo ou descrição casa `falh… contra\|vermelho antes\|antes de corrigir\|rode o teste antes`) **e** todo `cmd` de critério com vitest descarta a saída (`>\s*/dev/null`) ("o agente só vê OK ou nada; não consegue mostrar quais casos falharam"). Medido no corpus: C15 dá **0** no Comarka (1479 tickets) e 2 no dashboard (002, 003). C16 dá **27** no Comarka (todos `done`) e 2 no dashboard (002, 003). Os 27 do Comarka **têm** o padrão, então não são falso positivo pela definição da P6. Mesmo assim, é você quem decide se eles contam. | `gate-ticket.ts:104-140` (REGRAS), `:1617-1745` (validarTicket); saída crua abaixo |
| 6 | Ticket de relatório: como o juiz confere arquivo:linha | **Recomendo que o motor anexe os trechos da BASE.** Para cada `path:L` ou `path:L-M` nas linhas ADICIONADAS de arquivos `.md` do diff: janela de L-2 a M+2 lida por `git show base:path`. Caminho curto (`pausar/route.ts:71`) é resolvido por sufixo único no `ls-tree` da base. Ambíguo ou ausente entra MARCADO, nunca some. Tetos: 40 citações, 12 linhas por trecho, 400 linhas e 16 KB no total, com truncamento marcado. O 001/0 tem 24 citações distintas, uns 170 linhas. Contra a alternativa (o ticket exigir a saída do grep no relatório): é o agente afirmando a própria prova, e a independência proíbe isso (`juiz.ts:13-15`). Conferi 9 das 24 citações do 001/0 contra a base provável `c1051f13`: as 9 batem com a linha do insert ou do fetch. A parte de "desde quando" (`git log -S`) **não** fica coberta pelos trechos e vira pergunta. | `juiz.ts:229-437` (LerBase e `lerDaBase` já existem, reaproveitáveis) |
| 7 | Onde entra `juiz.review_md` | Chave `juiz.review_md` (path; ausente = desligado) em `config-chaves.ts`, `obrigatoria:false`. O `run_juiz` lê com `git -C "$wt" show "$base:$path"`, da BASE e nunca da worktree, e passa `review` na EntradaPrompt. Se a chave existe e o arquivo falta na base, o juiz não roda (die), como o `contexto_juiz`. Em `montarPromptJuiz` o bloco vai **depois das cobranças, incluindo os itens condicionais 4 e 5, e antes de FORMATO**: mantém a numeração e fica no prefixo fixo por repo, que é cacheável. Ausente = prompt byte a byte igual. Pré-voo: item novo `cat.8 (review_md)` em `preVooRelampago`. Com a chave presente, o arquivo tem de existir na `branch_alvo` com ≤150 linhas e ≤8192 bytes; senão a drenagem aborta. Os rascunhos `REVIEW-dashboard-v1.md` (59 linhas, 4001 B) e `REVIEW-comarka-v1.md` (59 linhas, 4180 B) cabem. | `juiz.ts:471-479`; `executor.sh:841-851`; `prevoo.ts:268-276`; `config-chaves.ts:90-94` |
| 8 | Casos "deveria aprovar" no corpus | Montagem detalhada abaixo. Resumo: **003/0 é limpo** (a única queixa foi o corpo do commit). **002/0 é ambíguo**: o juiz também cobrou controle positivo em (a)-(c), e pela regra 3 do prompt ("no MESMO render/execução") a cobrança é defensável. **001/0 precisa do seu rótulo**: as citações batem, mas o juiz apontou também commits sem a saída do `git log -S` e uma inconsistência sobre `verificar-regras`. O 17º "deveria reprovar", 938: sha `6c228d877502f1c8`, merge `d37d426b21ca66e1`, base `4e0561282c8bb78d` (primeiro pai do merge, igual ao merge-base), conserto `10c88edb92f4b40a`, 2 commits (`a930be7` feat, `6c228d8` test), 3 arquivos, +196/-1. | corpus v0 e git do Comarka (saída abaixo) |

## Achado que muda o desenho da P1

Na P1, o corpo do commit é **texto do agente**. Hoje o CABECALHO diz que o juiz não recebe "resumo nenhum do
agente", porque "o que o agente diz que fez nunca é evidência". E o corpo de `1bfcbc1d` (003/0) diz que "(a) e (b) FALHARAM
contra o código anterior", enquanto o `claude.txt` da mesma tentativa admite que "deduzo do código antigo" e "não vi quais
casos falharam". Com a P1 o juiz conseguiria conferir que o corpo do commit afirma o vermelho antes, mas não que a afirmação é verdadeira.
Proponho a P1 com o bloco rotulado "MENSAGENS DE COMMIT (escritas pelo agente: declaração, não evidência)". O
remédio de fundo é um vermelho-antes **mecânico**: o harness roda os testes de `cria_novo` contra o `src` da base.
Isso é peça de outra etapa, e a pergunta Q3 trata dela.

## Plano das peças (teto de linhas de motor + teste, sem contar fixture copiada)

| Peça | O que | Arquivos | Vermelho antes | Teto |
|---|---|---|---|---|
| P1 | Bloco `MENSAGENS DE COMMIT` com `git log --format=%H%n%B base..HEAD`, rotulado como declaração do agente; teto de 200 linhas / 8 KB marcado; sem commit = bloco ausente (prompt igual) | `executor.sh` (run_juiz), `juiz.ts` | teste com a fixture de 003/0 (diff.patch, gates.txt e corpo de `1bfcbc1d` copiados): `Orq-Ticket: 003` e "FALHARAM contra o código anterior" no `juiz.prompt.txt` | 150 |
| P2 | Juiz com cwd em `mktemp -d` vazio, fora de qualquer repo, mais as flags de isolamento confirmadas (Q2) | `executor.sh` (só a chamada do juiz) | `claude` falso no PATH (padrão de `test-fixture-executor.sh:150-175`) grava `pwd` e argv; o teste falha hoje porque o pwd é a worktree | 100 |
| P3 | Trechos da BASE por arquivo:linha citado em `.md` do diff, com os tetos da linha 6 | `juiz.ts` (função pura e bloco), `executor.sh` (subcomando como `definicoes`) | fixture de 001/0 (diff.patch + os arquivos citados de `c1051f13`): o prompt passa a ter a linha 186 de `avaliar-alerta-trafego/route.ts` | 220 |
| P4 | `juiz.review_md`: leitura da base, bloco depois das cobranças, pré-voo com tetos | `juiz.ts`, `executor.sh`, `prevoo.ts`, `config-chaves.ts` | (i) sem a chave: prompt byte a byte igual ao golden de `220068f`; (ii) com a chave: bloco presente e na posição; (iii) pré-voo reprova 151 linhas e 8193 B | 160 |
| P5 | `ORQ_GATE=1` no spawn dos gates; os 20 vendorizados usam `describeHarness` | `gates.ts`, `test/fixtures/orq-harness.ts`, os 20 de `TESTES_HARNESS`, `test-instalar.sh` | caso novo no test-instalar: o repo de fixture instalado roda o gate `testes` e o `orquestrador-*` aparece skipped (hoje roda) | 120 |
| P6 | Avisos C15 e C16 | `gate-ticket.ts`, teste próprio | cópias dos tickets 002 e 003 dão 0 aviso hoje (saída abaixo); depois, aviso nos dois e 0 C15 no Comarka | 130 |
| P7 | Corrida do corpus (só com seu ok) | script em `~/orq-sessoes`, fora do motor | não se aplica | não se aplica |

A ordem proposta é P2, P1, P3, P4, P6, P5. A P2 vem primeiro porque muda o custo e o ruído de todas as chamadas
seguintes. Ela não muda o texto do prompt, e os goldens das outras peças continuam valendo.

## Corpus: como montar os casos "deveria aprovar"

Para cada caso, o script da P7 monta a `EntradaPrompt` e chama `montarPromptJuiz` de duas versões do kit: atual
(`220068f`) e nova (o HEAD da etapa):
- **003/0 (aprovar):** ticket `003` como estava na base da tentativa; `runs/003/attempt-0/diff.patch` e `gates.txt`;
  commits = `1bfcbc1d` (só esse; o `base..HEAD` da attempt-0).
- **002/0 (ambíguo):** a mesma montagem com `runs/002/attempt-0` e o commit `7ef99c08`.
- **001/0 (precisa do seu rótulo):** `runs/001/attempt-0`; base provável `c1051f13` (último commit da `staging-auto`
  antes do run das 18:58Z). O commit do relatório não existe mais em ref nenhuma, porque a tentativa bloqueou e a frente não foi
  mergeada. A P1 entra sem bloco de commits nesse caso.
- **Comarka (17 "reprovar"):** ticket por `git show <sha_aprovado>:docs/fila/<id>-*.md`, diff `git diff base...sha`,
  commits `git log base..sha`. Os `runs/` do Comarka não têm `gates.txt` nem `juiz.prompt.txt` (são do avaliador antigo,
  `avaliador-prompt.txt` e `gate-*.txt`), então os gates entram montados dos `gate-*.txt` da tentativa aprovada. A
  variante "atual" também precisa ser **re-rodada**: o veredito histórico é de outro prompt.

## Custo estimado da corrida do corpus

Custo medido por chamada do juiz (Sonnet, 5 chamadas do lote): 0,216; 0,147; 0,158; 0,181; 0,184. Média US$ 0,177, máximo US$ 0,216.

- 20 casos (17 + 3) × 2 variantes × 0,177 = **US$ 7,08**; no máximo medido, US$ 8,64.
- Com 3 variantes (atual; nova sem REVIEW; nova com REVIEW): US$ 10,62, ou US$ 12,96 no máximo.
- Com 2 repetições por caso para medir a variância (o 002/003 mostrou que ela existe): o dobro.
- A P2 deve baixar o custo por chamada (uns 45 mil tokens por chamada não são material), mas isso não foi medido, e a estimativa não conta com essa queda.
- Os diffs do Comarka são maiores (938: +196). **Proponho teto de US$ 15** para 3 variantes × 1 repetição, com o
  modelo fixado em Sonnet nas variantes, para isolar o efeito do material.

## Perguntas que só você responde

1. **P5:** fica o skip por `ORQ_GATE=1` (menor, sem tocar config de repo, não resolve o tsc do CI) ou a mudança para
   `scripts/orquestrador/harness/*.harness.ts` (resolve os dois, 4 a 5 vezes maior)? E o `--atualizar --dry-run` contra o
   dashboard e o CI roda `git status --porcelain` (`instalar.sh:497`), que não está na sua lista de comandos git permitidos. Autoriza esse comando nos
   dois, com `GIT_OPTIONAL_LOCKS=0`?
2. **P2:** posso rodar `claude --help` (local, sem API) para confirmar no binário instalado os nomes e o efeito de
   `--setting-sources`, `--strict-mcp-config`, `--disable-slash-commands` e `--tools`? Sem isso, a P2 entrega só o cwd neutro,
   que já tira o CLAUDE.md e o `.claude/` da branch, e as flags ficam para depois.
3. **P1:** o bloco de commits entra **sempre** ou só quando algum critério cita "commit"? E aceita o rótulo
   "declaração do agente, não evidência"? Abre-se uma etapa para o vermelho-antes mecânico?
4. **P6 / C16:** os 27 `done` do Comarka com o mesmo padrão contam como acerto (o defeito latente) ou como falso positivo?
5. **Corpus:** qual é o rótulo do 001/0 e do 002/0 (aprovar, reprovar ou excluir)? Qual é a descrição do defeito do 938? Quantas variantes
   (2 ou 3), quantas repetições, e o teto em US$?
6. **P3:** a parte "desde quando" (commit citado) também ganha anexo (`git show -s` de cada sha citado), ou o
   critério desse tipo vira "não verificado" por regra?
7. **P4:** o bloco do REVIEW.md vai depois dos itens 4 e 5 (como proponho) ou logo depois do item 3?

## Saída crua

### Diff entre os `juiz.prompt.txt` de 003 attempt-0 e attempt-1 (rc 1)
```
61,63c61,63
< ok   typecheck             59405ms
< ok   testes                43756ms
< ok   build                218039ms
---
> ok   typecheck             34616ms
> ok   testes                58894ms
> ok   build                170327ms
69c69
< index 00000000..5b48494c
---
> index 00000000..fa18711f
72c72
< @@ -0,0 +1,83 @@
---
> @@ -0,0 +1,116 @@
(o resto é só o diff do arquivo de teste: contagemMock, erroSpy, asserções de console.error, caso "tipo inexistente")
```
002: mesma forma (tempos dos gates e o diff do teste, de 88 para 119 linhas). Nenhuma outra linha muda.

### Modelo, custo e tokens do juiz (`juiz.raw.json`)
```
001/0 {"m":["claude-sonnet-5-5"],"c":0.216139,"t":1}
002/0 {"m":["claude-sonnet-5-5"],"c":0.146525,"t":1}
002/1 {"m":["claude-sonnet-5-5"],"c":0.158257,"t":1}
003/0 {"m":["claude-sonnet-5-5"],"c":0.180867,"t":1}
003/1 {"m":["claude-sonnet-5-5"],"c":0.183841,"t":1}
001/0 usage {"input_tokens":2,"cache_creation_input_tokens":52883,"cache_read_input_tokens":13030,"output_tokens":330}  prompt 17808 B
002/0 usage {"input_tokens":2,"cache_creation_input_tokens":35307,"cache_read_input_tokens":13030,"output_tokens":399}  prompt  9243 B
003/0 usage {"input_tokens":2,"cache_creation_input_tokens":44315,"cache_read_input_tokens":13030,"output_tokens":230}  prompt  9181 B
```

### Gate de ticket atual sobre cópia de 002 e 003 (rc 0)
```
GATE DE TICKET · 2 ticket(s) · fila …/scratchpad/fila-dc
002-liga-cartas-guarda-count.md  OK
003-liga-conquistas-guarda-count.md  OK
TOTAL: 0 violação(ões), 0 isenção(ões), 0 aviso(s), em 2 ticket(s)
```

### Medição das regras candidatas (script com o parser `blocoJson` do kit)
```
Comarka:   arquivos 1479, json ok 1479
(a) 0
(b) 27  1031 1040 1063 1301 1314 1322 1382 339 734b 869 873 875 876 877 878 880 882 891 893 894 896 897b 899 904 905 906 923 (todos done)
Dashboard: arquivos 3, json ok 3
(a) 2  002 003
(b) 2  002 003
```

### 938 no git do Comarka
```
6c228d877502f1c84b9c406f0d5de731cef22793 test(perf): verba recomendada pela tese (938)
10c88edb92f4b40a01bdff66f668135fb2bf26aa fix: revisao pos-release 12/10 (funil no dia de SP, %MQL na mesma base, reaper do worker, teste do recon, resolvedor, verba, ritmo, ranking)
d37d426b… 4e0561282c… 6c228d877… orquestrador: merge frente/938 (ticket 938) em staging-auto
base=4e0561282c8bb78dda67b3c0c4acfff3fe865667
 3 files changed, 196 insertions(+), 1 deletion(-)
a930be7 feat(perf): verba recomendada pela tese no assistente de metas (938)
6c228d8 test(perf): verba recomendada pela tese (938)
```

### Citações do 001/0 conferidas na base `c1051f13` (9 de 24)
```
src/app/api/ia/avaliar-alerta-trafego/route.ts:186 =>       await supabase.from("trafego_regras_historico").insert({
src/app/api/meta/ativar/route.ts:53 =>     await supabase.from("trafego_regras_historico").insert({
src/app/api/meta/duplicar/route.ts:53 =>     await supabase.from("trafego_regras_historico").insert({
src/app/api/meta/editar-budget/route.ts:66 =>     await supabase.from("trafego_regras_historico").insert({
src/app/api/meta/pausar/route.ts:64 =>     await supabase.from("trafego_regras_historico").insert({
src/app/api/trafego/verificar-regras/route.ts:182 =>                   await supabase.from("trafego_regras_historico").insert({
src/app/api/trafego/regras-historico/route.ts:40 =>   const { error } = await supabaseAdmin.from("trafego_regras_historico").insert({
src/app/trafego/gerenciar/_gerenciar-content.tsx:406 =>       await fetch(`/api/meta/${isActive ? "pausar" : "ativar"}`, {
src/app/inteligencia/page.tsx:586 =>           const res = await fetch("/api/meta/pausar", {
```

## Peças (entregue em 24/10/2026, depois do ok com Q1 a Q7)

Branch `kit/8e`, worktree `~/Projetos/_worktrees/kit-8e`. Nenhum push e nenhum merge.
Ordem executada: P2, P1, P3, P4, P6, P5, um commit por peça, cada uma com o vermelho rodado
contra o motor anterior (o teste novo com `scripts/` revertido para o commit pai).

| Peça | Commit | Linhas motor+teste (sem fixture copiada) | Teto | Vermelho antes |
|---|---|---|---|---|
| P2 | `faf24b4` | +99 | 100 | 1/1 falha: o `claude` falso gravou a worktree como cwd |
| P1 | `1574417` | +134 | 150 | 2/3 falham: o corpo de `1bfcbc1d` não chega; teto não existe |
| P3 | `e1bb1fa` | +219 | 220 | 2/2 falham: sem bloco; `anexoCitacoes` não existe |
| P4 | `e7cbb8d` | +160 | 160 | 5/6 falham (o golden sem review já passava, como devia) |
| P6 | `71f3fdf` | +82 | 130 | 3/5 falham: 002 e 003 dão 0 aviso; C15/C16 fora da tabela |
| P5 | `8e656c0` | +106 (+118 contando o `orq-harness.ts`) | 120 | (h4) do `test-instalar.sh`: `FALHA gate: test/orquestrador-pacotes.test.ts RODOU dentro do gate` |
| doc | `302a870` | CHANGELOG e `docs/PECAS.md` | — | — |

Sobre os tetos: a P3 saiu com +231 na primeira versão, e a P2 com +117. Antes de commitar,
enxuguei comentários e o teste (sem tirar caso nem asserção) até caber: P3 com +219 e P2 com +99.
Nenhuma peça foi commitada acima do teto. O commit de doc saiu primeiro como `ca9f651`; só a
mensagem foi corrigida (`302a870`), e a árvore é a mesma (`7fb4043`).

### O que cada peça faz

- **P2.** O cwd do juiz é um `mktemp -d` vazio, apagado depois da chamada. Flags novas:
  `--tools ""`, `--strict-mcp-config` e `--disable-slash-commands`. Saída do
  `claude --help` (2.1.302) que as confirma:
  `--tools … Use "" to disable all tools`; `--strict-mcp-config  Only use MCP servers from --mcp-config, ignoring all other MCP configurations`;
  `--disable-slash-commands  Disable all skills`.
  **Ficaram fora (Q2):**
  - `--setting-sources`: o help diz só "Comma-separated list of setting sources to load (user, project, local)" e não confirma que `""` desliga todas. Com o cwd vazio, project e local já não existem; o user (hooks, plugins) continua.
  - `--bare`: lê só `ANTHROPIC_API_KEY`/`apiKeyHelper` ("OAuth and keychain are never read") e quebraria a autenticação do loop.
  - O CLAUDE.md do usuário (`~/.claude/CLAUDE.md`): nenhuma flag confirmada o tira.
  - Achado: `--max-turns`, que o juiz já usava, **não aparece** no `--help` 2.1.302. Continua aceito (as 69 chamadas da P7 rodaram com ele), mas não é documentado.
- **P1.** Bloco `MENSAGENS DE COMMIT (escritas pelo agente: declaração, não evidência)` com
  `git log --format='commit %H%n%n%B' base..HEAD`, sempre que houver commit; teto de 200 linhas e
  8192 bytes, com corte por linha marcado. Sem commit, o prompt fica igual. O CABECALHO não mudou;
  a frase "declaração, não evidência" mora no bloco.
- **P3.** `anexoCitacoes` (juiz.ts) e o subcomando `citacoes`.
  - Trechos: L-2 a M+2, numerados. Caminho curto resolvido por sufixo único no `ls-tree` da base. Ausente, ambíguo, linha fora do arquivo e omitido por teto entram marcados.
  - Commits citados (Q6): uma linha de `git show -s --format='%h %ad %s'` por sha, só se o sha for ancestral da base (`merge-base --is-ancestor`); senão, "NÃO ENCONTRADO na história da base". Teto de 20.
  - O bloco manda tratar "desde quando", `git log -S` e conteúdo de commit como não verificado.
  - No 001/0 real (fixture com 3 arquivos da base `c1051f13`): 24 citações, 6 com trecho e 18 marcadas AUSENTE, porque a fixture só tem 3 arquivos.
- **P4.** Chave `juiz.review_md`, lida com `git show base:path`, entre as cobranças (itens 4 e 5
  incluídos) e FORMATO.
  - Chave presente e arquivo ausente na base: `die` e o juiz não roda.
  - Pré-voo `cat.8`, só quando a chave existe: o arquivo tem de estar na `branch_alvo` com até 150 linhas e 8192 bytes.
  - `config-chaves.ts` ganhou a entrada. O golden do prompt de `220068f` está em `test/fixtures/juiz-8e/golden-220068f.txt`, gerado com o motor de `220068f` e com os itens 4 e 5, nota, referência e definições.
  - **CONTRATO.md não foi atualizado** (a seção da chave nova falta).
- **P6.** C15 e C16 como aviso, só em ticket pendente. Medido com as funções do motor:
  - Comarka: 1479 arquivos, C15 **0** e C16 **27** (todos `done`, os mesmos 27 do PASSO 0).
  - Fixtures do dashboard: C15 2 (002, 003) e C16 2 (002, 003). O 001 é o controle negativo.
  - O inventário de severidades (`orquestrador-gate-severidade.test.ts`) ganhou as duas linhas.
- **P5.** `gates.ts:execBash` exporta `ORQ_GATE=1`. `describeHarness = describe.skipIf(ORQ_GATE=1)`
  mora em `test/fixtures/orq-harness.ts`, e os 19 testes de `TESTES_HARNESS` trocaram o `describe` de topo
  por ele. Os 3 que não importavam o harness (`prefixo-aspas`, `gate-grep-q`, `gate-vitest-aviso`)
  passaram a importar. O caso (h4) prova as duas pontas: dentro do gate, `Test Files 1 skipped`;
  no vitest humano, `1 passed`. O tsc do CI ficou fora (Q1) e virou pendência em `docs/PECAS.md`.
- **8f** (Q3) está descrita em `docs/PECAS.md`, PENDENTES. Desenho: worktree temporária da base,
  com os arquivos de teste da HEAD por cima, roda o cmd do critério `cria_novo` e grava
  `vermelho-antes.txt` como evidência do harness.

Asserções existentes que mudaram: nenhuma. Na P2, para o teste textual
`orquestrador-juiz.test.ts:228` (`/--allowedTools ""\s*--max-turns 1/`) continuar valendo
sem ser tocado, as flags novas foram postas depois do `--max-turns 1`.

### Fechamento (HEAD `302a870`, árvore `7fb4043`)

```
tsc rc=0
vitest rc=0          Test Files 116 passed (116) · Tests 1850 passed (1850)
test-shell rc=0      TODOS OS SCRIPTS SAÍRAM rc 0
test-instalar rc=0   TODOS OS CHECKS PASSARAM   (inclui o (h4) novo)
```
`instalar.sh --atualizar <repo> --dry-run` com `GIT_OPTIONAL_LOCKS=0` (Q1):
- dashboard (`~/Projetos/dashboard-comercial-orq`): rc 0, 26 diferenças, todas de motor e harness. O `--atualizar` de verdade recusaria, porque o loop do dashboard não está pausado.
- CI (`~/Projetos/conteudos-infinitos`): rc 0.

## P7: corrida do corpus

Script e material em `~/orq-sessoes/8e-p7/` (`p7.ts montar|rodar|resumo`), fora do kit. Os
motores das variantes vêm de `git archive` de `220068f` e de `302a870`. Repos de produto
só em leitura.

- **Variantes, todas com `claude-sonnet-5-5`** (o único modelo que apareceu no `modelUsage`):
  - **V0** = prompt de `220068f`, cwd com o `CLAUDE.md` e o `.claude/` do sha julgado (por `git archive`; não é repo git, então é uma aproximação da worktree antiga) e flags antigas.
  - **V1** = HEAD sem REVIEW.md, com commits e anexo, cwd vazio e flags da P2.
  - **V2** = V1 mais o `REVIEW-<repo>-v1.md` do levantamento de 24/10.
- **Corpus, 23 casos:**
  - 17 "deveria reprovar": os 16 do `corpus-juiz-v0.tsv` mais o 938 (base `4e05612`, sha `6c228d8`, defeito conforme a Q5).
  - 6 "deveria aprovar": o dashboard 003/0 (diff e `gates.txt` da attempt-0, base `3c5f3768`) e 5 do Comarka.
  - Os 5 do Comarka saíram de 111 elegíveis: coorte madura de 26/09 a 09/10 em `out/14d/retrabalho.csv`, todas as linhas `tipo=nenhum`, `forca=-` e `aprovado_de_primeira=sim`. Sorteio por LCG com **seed 20261024** sobre a lista ordenada por id: **821 @a5ea0b22d, 850 @467cb047b, 407b @584870632, 713 @daea7ed4f, 889c @d9611c07d**.
- **Montagem dos casos do Comarka:**
  - Ticket: o do sha julgado. O 1303 não está na árvore do próprio sha, então entrou a versão em que ele chegou à fila (`2a8b661`).
  - Diff: `base...sha`.
  - Gates: `ok <nome>` mais as 3 últimas linhas de cada `gate-*.txt` da tentativa cujo `head.txt` é o sha.
- **Teto:** antes de cada chamada, gasto + reserva (o maior custo visto, mínimo 0,30) não pode passar de US$ 15. O teto **não foi atingido**: 69 de 69 chamadas, **US$ 9,07** no total. Ordem intercalada (1 aprovar a cada 3 reprovar), com as três variantes por caso.

### Resultado (1 repetição)

| variante | total | deveria reprovar | deveria aprovar | ilegível | custo médio/chamada | tokens de entrada médios |
|---|---|---|---|---|---|---|
| V0 (220068f) | 8/23 (35%) | 5/17 (29%) | 3/6 (50%) | 0 | US$ 0,1804 | 53.729 |
| V1 (sem REVIEW) | 12/23 (52%) | 9/17 (53%) | 3/6 (50%) | 0 | US$ 0,1032 | 22.181 |
| V2 (com REVIEW) | 12/23 (52%) | 11/17 (65%) | 1/6 (17%) | 1 | US$ 0,1108 | 24.138 |

Acerto por padrão (V0 / V1 / V2):

| padrão | V0 | V1 | V2 |
|---|---|---|---|
| 1 (teto de 1000) | 2/3 | 3/3 | 2/3 (o terceiro é o ilegível) |
| 1;2 | 1/2 | 1/2 | 1/2 |
| 2 (consulta em série) | 0/4 | 1/4 | 2/4 |
| 3 (id notion × OS) | 0/1 | 0/1 | 1/1 |
| 4 (campo legado) | 1/1 | 1/1 | 1/1 |
| 5 (dia de SP) | 0/1 | 1/1 | 1/1 |
| outro (761, 762, 974, 1303, 938) | 1/5 | 2/5 | 3/5 |
| aprovar | 3/6 | 3/6 | 1/6 |

Por caso:
```
caso   | esperado | V0      | V1      | V2
D003-0 | aprovar  | reprova | reprova | reprova
C715   | reprovar | aprova  | reprova | ilegível
C734   | reprovar | reprova | reprova | reprova
C740   | reprovar | reprova | reprova | reprova
A821   | aprovar  | aprova  | aprova  | aprova
C741a  | reprovar | aprova  | aprova  | aprova
C861   | reprovar | reprova | reprova | reprova
C694   | reprovar | aprova  | reprova | reprova
A850   | aprovar  | aprova  | aprova  | reprova
C699   | reprovar | aprova  | aprova  | reprova
C705   | reprovar | aprova  | aprova  | aprova
C763   | reprovar | aprova  | aprova  | aprova
A407b  | aprovar  | reprova | reprova | reprova
C737   | reprovar | aprova  | aprova  | reprova
C924c  | reprovar | reprova | reprova | reprova
C953   | reprovar | aprova  | reprova | reprova
A713   | aprovar  | aprova  | aprova  | reprova
C761   | reprovar | aprova  | aprova  | aprova
C762   | reprovar | aprova  | reprova | reprova
C974   | reprovar | aprova  | aprova  | reprova
A889c  | aprovar  | reprova | reprova | reprova
C1303  | reprovar | reprova | reprova | reprova
C938   | reprovar | aprova  | aprova  | aprova
```

### Leitura (uma repetição; a variância medida no 002/003 é real, então isto é indício, não prova)

- **Efeito da P2 no custo:** −43% por chamada (0,180 → 0,103) e −59% nos tokens de entrada (53,7 mil → 22,2 mil), com prompts de V1 de 1 a 3% maiores que os de V0. É o contexto ambiente (CLAUDE.md, skills, definições de ferramenta) saindo. Mede P2 junto com P1/P3, mas esses dois só **somam** bytes.
- **V0 → V1:** +4 em "deveria reprovar" (715, 694, 953, 762) e nenhuma perda em "deveria aprovar". Não separei P2 de P1/P3 (não havia variante para isso).
- **V1 → V2 (REVIEW.md):** +2 em reprovar (699, 737, 974 viram certos; 715 virou ilegível), mas **−2 em aprovar** (850 e 713 passam a reprovar). No 850, o motivo cita a regra do teto de 1000 do REVIEW (`.range(0, 9999)` sem paginar), e não é óbvio que seja falso positivo: o ticket não teve retrabalho em 14 dias, mas isso não prova que o código é correto. O 713 cobra "campanha ativa" e "dia de SP". Os dois precisam do seu olho antes de virar conclusão.
- **003/0 continua reprovado nas três**, mas por razões diferentes:
  - V0, como no lote: "o material não traz o corpo do commit".
  - V1 e V2 já recebem o commit e reprovam pela regra 3 (ausência sem controle positivo nos casos (a) a (c)).
  - A queixa do PASSO 0 (pedir o que não recebe) sumiu. A queixa nova é a mesma que deixou o 002/0 ambíguo.
- **407b e 889c reprovam nas três** pela regra 3 também. Somando o 003/0, 3 dos 6 "deveria aprovar" caem na mesma cobrança, o que pede uma olhada na redação da regra 3 (fora desta etapa).
- **Ilegível no C715.V2:** o modelo pôs aspas sem escape dentro do `motivo` (`JSON.parse`: "Expecting ',' delimiter"). O conteúdo era reprovação correta. No loop isso vira ADIADO, sem consumir tentativa.
- **Nunca pegos (0/3):** 741a, 705, 763, 761 e 938, que somam padrão 2, outro e o 938.

Saída crua: `~/orq-sessoes/8e-p7/out/` (`resultados.jsonl`, `<caso>.<variante>.raw.json`,
`rodar.log`, `resumo.txt`); prompts em `~/orq-sessoes/8e-p7/prompts/`; casos e sorteio em `casos.json`.

## Pendências desta entrega

1. CONTRATO.md sem a seção de `juiz.review_md` (e sem o `ORQ_GATE`).
2. Defeito do tsc do CI e etapa 8f registrados em `docs/PECAS.md` (PENDENTES).
3. Para decidir: os "deveria aprovar" que caem na regra 3 (003/0, 407b, 889c) e as duas perdas do REVIEW.md (850, 713).
4. `--setting-sources` e o CLAUDE.md do usuário no contexto do juiz continuam abertos (P2).

## P8: CONTRATO.md (24/10/2026)

- **P8** `2c0f469` (árvore `6b8b68f`): §23 no `CONTRATO.md`, só doc, +99 linhas, nenhum código tocado.
  - 23.1: ordem do prompt; blocos MENSAGENS DE COMMIT e TRECHOS CITADOS, com os tetos.
  - 23.2: `juiz.review_md` (opcional, ausente = desligado, lida da base, `die` se a chave existe e o arquivo falta) e o pré-voo `cat.8` (150 linhas, 8192 bytes, `PREVOO_NOGO item=cat.8`).
  - 23.3: juiz com cwd vazio e as três flags novas; o que ficou fora.
  - 23.4: `ORQ_GATE=1` e `describeHarness`.
  - 23.5: avisos C15 e C16.
  - 23.6: os testes.
- A pendência 1 desta entrega está fechada. A linha "CONTRATO não foi atualizado" do
  CHANGELOG ficou como estava, porque a peça era só CONTRATO.md.

### Fechamento (HEAD `2c0f469`)

```
tsc rc=0
vitest rc=0          Test Files  116 passed (116) · Tests  1850 passed (1850)
test-shell rc=0      TODOS OS SCRIPTS SAÍRAM rc 0
test-instalar rc=0   TODOS OS CHECKS PASSARAM   (0 FALHA; (h4): gate rc 0, pacotes skipped, vitest humano roda)
```
No `test-instalar`, o caso que lê o checkout do CI saiu `pulado: ORQ_CI_CHECKOUT vazio ou
inexistente` porque `ORQ_CI_CHECKOUT` não foi definido. Nenhum push e nenhum merge.
