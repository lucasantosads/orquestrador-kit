# Relatório kit etapa 7d-1b: severidade por regra e calibração do gate de ticket

Branch `kit/etapa7d1`, worktree `~/Projetos/_worktrees/kit-etapa7d1`, saindo de `b58cc8f` (main). Sessão de 25/09/2026.

## 0. PASSO 0

### 0.1 Levantamento de calibração (`~/orq-sessoes/levantamento-7d1-calibracao.md`, 402 linhas, lido inteiro)

- Tabela de decisão: §5, `:339-387`. Critério: ERRO só com 0 FP em (a) nos três repos.
  - ERRO sem mudança: 1, 4, 5e, 6a (crase, eval, sudo, curl, wget), 7, 9, 10c (`:384`).
  - CORRIGIR → ERRO: 2, 3, 5t, 5c, 10x (`:346-350`, `:364`).
  - CORRIGIR → AVISO: 6r, 6v, 8 (vira C8) (`:355-356`, `:360`).
  - AVISO: 6a `rm`/`bash`/`sh -c`, 6q, 6b, 10n, C2 `grep -c || echo`, C2 saída vazia, C3, C4, C6, C8, C9, C11, C12 (`:353`, `:357-358`, `:362`, `:366-379`).
  - DESLIGAR: 6a `$(`, C2 sem `2>&1`, C13 (`:352`, `:368`, `:381`).
  - ERRO copiado do Comarka: C1, C2 `grep -P`, C7 (`:365`, `:370`, `:375`).
- Casos especiais: §4.1 check 10 com aspas escapadas (`:282-309`: regra 2 compara com o texto cru, regra 3 com o padrão resolvido pelo shell; segunda família: `grep -v` de comentário); §4.2 vitest por texto (`:311-335`: correção "só marca o que aprovaria uma suíte com falha"; `vitest.config` não é o comando).
- Lacunas: §6, `:391-402` (40% dos `cmd` não rodaram; base do Actus em 48/91; snapshot da fila; dicionário de acento com a árvore atual; efeitos das correções estimados, não re-simulados, exceto 6v).

### 0.2 Kit (`b58cc8f`)

- `scripts/orquestrador/gate-ticket.ts` (1056 linhas, lido inteiro):
  - `CAMPOS_PENDENTE` `:48-58` (inclui `bloco` e `risco`); `RE_ID` `:63`; `Violacao` com `isencao`/`aviso` `:67-75`; `GateCfg` `:77-91`.
  - `mascararAspas` `:144`, `segmentarCmd` `:178`, `RE_REDIR`/`redirecionamentosProibidos` `:229-242` (o alvo do `>` é `[^\s;|&]*`, então `2>/dev/null)` vira arquivo `/dev/null)`).
  - `checarCmd` `:366-407` (6a por padrão, isenção só do `$(` no 1º segmento, 6r, 6v via `saidaTextualDoVitest` `:321-327`, 6q via `grepQuietoEmPipe` `:297-309`).
  - `caminhosForaDaAllowlist` (6b) `:345`.
  - check 10: `palavrasShell` `:472`, `padroesDoCmd` `:516-577`, `checarExemplosRegex` `:659-703`; regra 2 (`cmd.includes(e.regex)`) em `:692`.
  - `lerFila` `:705-715` (filtro `^\d{3}[a-z]?-`), `carregarCfg` `:717-733`.
  - `validarTicket` `:739-877`: 1 `:745-749`, 2 `:755-781`, 3 `:784-791`, 4 `:794-796`, 5 `:800-810`, 6/10 `:811-818`, 6b `:824-834`, 7 `:837-849`, 8 `:855-871` (dependência só direta), 9 `:874` + `checarContextoJuiz` `:897-927`.
  - CLI `main` `:947-1027`: rc 1 se houver violação que não é aviso nem isenção (`:1008`, `:1026`); `--violacoes` `:963`.
- Pré-voo do `drive_ticket`: `executor.sh:1248`; bloco 5b `:1269-1322`.
  - `modo_pre_voo` lido em `executor.sh:1285`; ausente = `aviso` `:1286-1289`; inválido = falha alta `:1290-1293`.
  - Gate chamado com `--violacoes` em `:1294`; wrapper `gate_ticket()` em `executor.sh:45`.
  - **`GATE_TICKET_AVISO` emitido em `executor.sh:1303`**, a cada passagem pelo pré-voo (sem memória).
  - Bloqueio em `:1308-1316` (`BLOQUEADO motivo=gate_ticket`).
- Ambiente de execução:
  - critérios: `run_criterios` `executor.sh:438-478`; o `eval` roda em `:454` com `BASE_REF` e `NO_COLOR=1` (sem `FORCE_COLOR`), saída limpa por `strip_ansi` (`:436`, `:455`); match em `lib.sh:1430-1440`.
  - gates: `executor.sh:1032` chama `gates.ts --run-cli`; `execBash` em `gates.ts:328-338` faz `spawnSync('bash', ['-c', cmd])` **herdando o ambiente inteiro**, sem `NO_COLOR` nem `FORCE_COLOR`.
  - o executor inteiro roda sob `set -euo pipefail` (`executor.sh:23`), e o subshell do critério herda.
- Chaves: `config-chaves.ts:94-96` (`gate_ticket.modo_pre_voo` aponta `executor.sh:1052`, linha velha); `config-tabela.ts:241-275`; template `doutrina/templates/config.json:105-140`; fixture `fixture/docs/fila/000-config.json:211-252`.
- Medição de cor feita agora, com o vitest 2.1.9 do kit (`tinyrainbow`): `"NO_COLOR" in env` desliga a cor sempre; `FORCE_COLOR` (qualquer valor, inclusive `0`) ou `CI` ligam a cor quando `NO_COLOR` está ausente. `FORCE_COLOR=0` sozinho **colore** (medido: `Tests \e[22m \e[1m\e[32m2 passed`).

### 0.3 Scripts de simulação da calibração

Existem, em `/private/tmp/claude-501/-Users-lucasantos-Projetos-orquestrador-kit/0b216d2f-2289-42ab-b28d-ee83350fd5b2/scratchpad/cal/`: `inventario.py`, `casos.py`, `simkit.ts`, `simcomarka.py`, `sim6v.ts`, `sim10.ts`, `seguro.py`, `agg.py`, `aggc.py`, `tarefa1.py`, e os dados `inventario.json` (26 MB), `casos.json` (763 casos + 13 sem `runs/`), `res_kit.json`, `res_comarka.json`, `res_6v.json`. As árvores (`arv/`) foram apagadas, como o relatório diz. O corpus desta etapa sai de `casos.json` + `inventario.json` + git só leitura.

### 0.4 Caixa de defeitos (`38864fd`, `b58cc8f`)

| Arquivo | Defeito | Toca esta etapa? |
|---|---|---|
| `docs/defeitos/2026-09-25-aceite-vermelho.md` | circuit breaker (`executor.sh:703-722`) rotula aceite vermelho por tela como "defeito de spec/harness"; pede ramo próprio com `aceite-vermelhos.json` | **Não.** É o circuit breaker de retry, fora de gate de ticket, severidade e ambiente de execução. Não resolvido. |
| `docs/defeitos/2026-09-25-teto-medido-fora-do-executor.md` | guarda de teto com número fixado na autoria trava a si mesma (627); pede regra de doutrina e um **aviso novo no `gate-ticket.ts`** | **Toca o gate de ticket** (pede uma regra nova, aviso), mas não é peça desta etapa. Não resolvido; a regra nova caberia na tabela de severidade como `aviso`. A parte de doutrina (`TICKET.md`, `higiene-de-execucao.md`) está fora do escopo de escrita. |

## 1. Peças: vermelho e verde

As saídas cruas estão resumidas às linhas de veredito de cada caso (✓/×, `ok`/`FALHA`, contagens), sem corte no meio de linha. Vermelhos de vitest são por asserção em todos os casos; nenhum por import.


### 7d1b-1 · corpus (`960d8e6`)

Vermelho por asserção, com a matriz da calibração reproduzida regra a regra (2: 4/48/557; 5t: 4/48/535; 5c: 0/0/192; 6a `$(`: 54/7/74; 6r: 0/3/48; 6v: 53/34/272; 6q: 0/12/83; 8: 3/15/119; 10n: 56/45/499; 10x: 0/8/0; 3: 0/0/23). Fica vermelho até a 3h, por desenho.

**Vermelho** (`p1-vermelho.txt`):

```
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 361ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

```
MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
10n	ERRO	56	45	499	6	9	32
10x	ERRO	0	8	0	0	0	0
2	ERRO	4	48	557	2	4	39
3	ERRO	0	0	23	0	0	1
5c	ERRO	0	0	192	0	0	10
5t	ERRO	4	48	535	2	4	36
6a:$(	ERRO	54	7	74	5	0	7
6a:bash	ERRO	0	1	6	0	0	0
6a:rm 	ERRO	0	13	20	0	0	1
6a:sh -c	ERRO	0	0	1	0	0	0
6b	aviso	55	60	363	5	10	26
6q	ERRO	0	12	83	0	4	3
6r	ERRO	0	3	48	0	0	7
6v	ERRO	53	34	272	6	9	14
8	ERRO	3	15	119	0	0	8
```


### 7d1b-2 · severidade (`635ddd3`)

Vermelho: 14 de 16 contra o `gate-ticket.ts`, `config-tabela.ts`, `config-chaves.ts` e template do HEAD anterior (os 2 que passavam são guardas de regressão: ERRO de crase/eval/sudo e 6q ERRO pelo config). Pré-voo (`test-gate-prevoo.sh`) com o gate antigo: o caso 8 (bloqueia, só aviso) bloqueava por 6v, 6q e 10n. Verde: suíte vitest inteira sem falha exceto o corpus (que segue vermelho só pelas regras CORRIGIR).

**Vermelho** (`p2-vermelho.txt`):

```
   × 7d1b-2 · a tabela única > a tabela aplica a decisão da calibração, regra a regra 3ms
   × 7d1b-2 · a tabela única > todo achado diz de que regra veio 2ms
   × 7d1b-2 · o que cada severidade faz > DESLIGAR: `$(` fora da isenção não acusa nada (54/7/74 FP, 0 causal) 1ms
   × 7d1b-2 · o que cada severidade faz > AVISO: `rm `, `bash` e `sh -c` saem como aviso, nunca como violação 1ms
   × 7d1b-2 · o que cada severidade faz > AVISO: grep -q em pipe (6q) e saída textual do vitest (6v) 1ms
   × 7d1b-2 · o que cada severidade faz > AVISO: redirecionamento para arquivo (6r) e regex sem exemplos (10n) 1ms
   × 7d1b-2 · o que cada severidade faz > AVISO: allowlist sobreposta com outro pendente (8) 1ms
   × 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > aviso vira erro, erro vira off, e o 6a:$( volta a acusar com a isenção de volta 1ms
   × 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > regra com severidade off não aparece nem com --relatorio 1ms
   × 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 106ms
   × 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > ticket só com avisos: rc 0, e --violacoes não imprime nada 102ms
   × 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > a saída sem --relatorio marca o aviso rebaixado, para não passar por violação 100ms
   × 7d1b-2 · a chave chega aos repos pelo migrar-config e pelo template > migrar: config sem gate_ticket.severidade ganha {} (vale a tabela); com a chave, nada muda 1ms
   × 7d1b-2 · a chave chega aos repos pelo migrar-config e pelo template > o template traz a chave vazia, e ela passa pela validação do gate 0ms
⎯⎯⎯⎯⎯⎯ Failed Tests 14 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected {} to deeply equal { '1': 'erro', '2': 'erro', …(21) }
AssertionError: expected [ …(5) ] to deeply equal []
+   "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: npx vitest run a 2>&1 | grep -q passed && rm -rf x && eval ls && echo `ls`",
AssertionError: expected [ { arquivo: '901-sev.md', …(2) } ] to deeply equal []
AssertionError: rm -rf .next && npm run build >/dev/null 2>&1 && echo ok: expected [ Array(1) ] to deeply equal []
AssertionError: expected [ …(2) ] to deeply equal []
+   "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: npx vitest run a 2>&1 | grep -q passed && echo ok",
AssertionError: expected [ Array(1) ] to deeply equal []
AssertionError: expected [ Array(1) ] to deeply equal []
AssertionError: expected [ undefined, undefined, undefined ] to deeply equal [ '6a:$(', '6q' ]
AssertionError: expected [ …(2) ] to deeply equal []
+     "mensagem": "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: npx vitest run a 2>&1 | grep -q passed && echo ok",
AssertionError: expected +0 to be 2 // Object.is equality
AssertionError: expected 1 to be +0 // Object.is equality
AssertionError: expected '901-sev.md:criterios_aceite[0] vitest…' to match /^901-sev\.md:criterios_aceite\[0\] A…/m
"901-sev.md:criterios_aceite[0] vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: npx vitest run a 2>&1 | grep -q passed && echo ok
AssertionError: expected undefined to deeply equal {}
AssertionError: expected undefined to deeply equal {}
 Test Files  1 failed (1)
      Tests  14 failed | 2 passed (16)
```

Pré-voo, vermelho (`p2-prevoo-vermelho.txt`):

```
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)
== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)
== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado
== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou
== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação
== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente
== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido
== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  FALHA o 903 não executou: [orq 15:03:25]   903-t.md:criterios_aceite[0] grep -q em pipe ('| grep -qE'): morre de SIGPIPE sob pipefail e a saída sai vazia com o trabalho verde (use grep -c ou grep -E com espera por regex) — cmd: node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok
  FALHA status=bloqueado por regra de AVISO: gate de ticket (pré-voo): 3 violação(ões): 903-t.md:criterios_aceite[0] vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed';  use '>/dev/null 2>&1 && echo OK' ou ';  echo rc=$?') — cmd: node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok; 903-t.md:criterios_aceite[0] grep -q em pipe ('| grep -qE'): morre de SIGPIPE sob pipefail e a saída sai vazia com o trabalho verde (use grep -c ou grep -E com espera por regex) — cmd: node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok; 903-t.md:criterios_aceite[0].exemplos_regex critério passa regex a grep e não declara exemplos_regex (lista de {regex, positivo, negativo})
  FALHA a trilha tem BLOQUEADO do 903
3 CHECK(S) FALHARAM
```

Pré-voo, verde (`p2-prevoo-verde.txt`):

```
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)
== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)
== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado
== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou
== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação
== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente
== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido
== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903
TODOS OS CHECKS PASSARAM
```

**Verde** (`p2-verde.txt`):

```
 ✓ test/orquestrador-decisao.test.ts (39 tests) 5ms
 ✓ test/orquestrador-enforcement.test.ts (47 tests) 22ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 20ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 11ms
 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 165ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1660ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 441ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3574ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 428ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 389ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 797ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 786ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 407ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4657ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 479ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 439ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 516ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 472ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 959ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 448ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 445ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 874ms
 ✓ test/doutrina-v2.test.ts (30 tests) 11ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 6336ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 467ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 430ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 442ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 441ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 851ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 390ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 340ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 349ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 471ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 763ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 320ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 409ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 6ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 5553ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru 304ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 646ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 360ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 307ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 368ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 403ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 335ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 396ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 320ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 1019ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3244ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 524ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 574ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 389ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 541ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 8ms
 ✓ test/orq-cli.test.ts (42 tests) 7549ms
   ✓ orq — imprime o STATUS.md > mostra o snapshot quando ele existe 581ms
   ✓ orq fila — placar por status lendo o JSON dos tickets > conta por status e lista cada ticket com frente 306ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 402ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 315ms
   ✓ read-only por construção > é executável 342ms
```


### 7d1b-3a · check 2 (`fe505ce`)

Casos reais: CI 015, Comarka 003, Actus 110 (FP), Comarka 346a (regra 2c).

**Vermelho** (`p3a-vermelho.txt`):

```
   × 7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria > CI 015 (done sem risco nem bloco) não é violação de campo obrigatório 5ms
   × 7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria > Comarka 003 e Actus 110 (os 557 e 48 FP da calibração) idem 1ms
   × 7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria > o que o executor lê segue ERRO: sem objetivo, sem allowlist, sem slug 1ms
   × 7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria > Comarka 346a (done sem criterios_aceite): regra 2c, AVISO — o executor roda ticket sem critério 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [ 'risco' ] to deeply equal []
AssertionError: Comarka 003: expected [ 'bloco', 'risco' ] to deeply equal []
AssertionError: expected [ 'objetivo', …(3) ] to deeply equal [ 'objetivo', …(2) ]
AssertionError: expected [ { …(4) } ] to deeply equal []
 Test Files  1 failed (1)
      Tests  4 failed | 1 passed (5)
```

**Verde** (`p3a-verde.txt`):

```
 ✓ test/orquestrador-gate-correcoes.test.ts (5 tests) 4ms
 Test Files  1 passed (1)
      Tests  5 passed (5)
```


### 7d1b-3b · check 3 (`2b49f34`)

Casos reais: Comarka 407a0 (b), 062a1, 315b1b (a).

**Vermelho** (`p3b-vermelho.txt`):

```
   × 7d1b-3 · check 3: id com sufixo de fatiamento (407a0, 315b1b) > Comarka 407a0 (bloqueado por spec) e 062a1 (done): o id é válido e bate com o arquivo 3ms
   × 7d1b-3 · check 3: id com sufixo de fatiamento (407a0, 315b1b) > a fila lê o arquivo 407a0-*.md (senão o check 7 não acha a dependência) 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: 407a0: expected [ Array(1) ] to deeply equal []
AssertionError: expected [] to deeply equal [ '407a0' ]
 Test Files  1 failed (1)
      Tests  2 failed | 6 passed (8)
```

**Verde** (`p3b-verde.txt`):

```
 ✓ test/orquestrador-gate-correcoes.test.ts (8 tests) 6ms
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 573ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 2486ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 317ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 432ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 520ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed | 2 passed (3)
      Tests  1 failed | 53 passed (54)
```


### 7d1b-3c · check 5 (`74fffeb`)

Casos reais: Actus 110, Comarka 003 (5t), Comarka 296b (5c).

**Vermelho** (`p3c-vermelho.txt`):

```
   × 7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critério avaliador > Actus 110 e Comarka 003 (critérios sem tipo): nenhum achado de tipo 3ms
   × 7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critério avaliador > Comarka 296b (espera "avaliador" sem cmd, o critério qualitativo): nenhum achado de cmd vazio 1ms
   × 7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critério avaliador > tipo PRESENTE fora do vocabulário segue ERRO 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: Actus 110: expected [ …(3) ] to deeply equal []
AssertionError: expected [ 'criterios_aceite[8]', …(2) ] to deeply equal []
AssertionError: expected [ …(4) ] to deeply equal [ Array(1) ]
 Test Files  1 failed (1)
      Tests  3 failed | 9 passed (12)
```

**Verde** (`p3c-verde.txt`):

```
 ✓ test/orquestrador-gate-correcoes.test.ts (12 tests) 7ms
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 482ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 797ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 358ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 2421ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 505ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 458ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 73 passed (74)
```


### 7d1b-3d · check 10x (`1d942d7`)

Casos reais: Actus 471, 471b, 471c, 508, 509, 510b, 512b, 528, 530.

**Vermelho** (`p3d-vermelho.txt`):

```
   × 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 22ms
   × 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > 510b[5]: o exemplo com \"perdida\" é o padrão depois das aspas resolvidas, e é aceito 20ms
   × 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > exemplo que não é padrão do cmd segue ERRO (a regra 2 do 624 continua valendo) 28ms
   × 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > padrão do grep -v sem exemplo é dispensado; padrão POSITIVO sem exemplo segue acusado 24ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: 471: expected [ …(3) ] to deeply equal []
AssertionError: expected [ { …(4) }, { …(4) } ] to deeply equal []
AssertionError: expected [ …(8) ] to deeply equal [ Array(1) ]
AssertionError: expected [ Array(1) ] to deeply equal []
 Test Files  1 failed (1)
      Tests  4 failed | 12 passed (16)
```

**Verde** (`p3d-verde.txt`):

```
 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 182ms
 ✓ test/orquestrador-gate-correcoes.test.ts (16 tests) 291ms
 ✓ test/orquestrador-gate-regex-exemplos.test.ts (11 tests) 567ms
 Test Files  3 passed (3)
      Tests  45 passed (45)
```


### 7d1b-3e · check 6r (`e6bd065`)

Casos reais: Comarka 202, Actus 418 (/tmp), Comarka 543 e 522 (`)`), Comarka 615 (segue acusado).

**Vermelho** (`p3e-vermelho.txt`):

```
   × 7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do redirecionamento > Comarka 202 e Actus 418 (npm run build > /tmp/build_<id>.log): nenhum achado 6r 3ms
   × 7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do redirecionamento > Comarka 543 (`2>/dev/null)` dentro de `$( )`): o alvo é /dev/null, não '/dev/null)' 1ms
   × 7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do redirecionamento > redirecionamento para arquivo da worktree segue acusado, dentro ou fora de $( ) 1ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: Comarka 202: expected [ Array(1) ] to deeply equal []
AssertionError: expected [ Array(1) ] to deeply equal []
AssertionError: expected [ …(3) ] to deeply equal [ …(2) ]
 Test Files  1 failed (1)
      Tests  3 failed | 17 passed (20)
```

**Verde** (`p3e-verde.txt`):

```
 ✓ test/orquestrador-gate-correcoes.test.ts (20 tests) 328ms
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 479ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 762ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 344ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 2222ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 419ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 430ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed | 3 passed (4)
      Tests  1 failed | 81 passed (82)
```


### 7d1b-3f · check 6v (`394c241`)

Casos reais: CI 015, Comarka 057, Actus 620 (vitest.config), Actus 001 (aprova falha), Comarka 570 (indeterminado).

**Vermelho** (`p3f-vermelho.txt`):

```
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > CI 015[6] (`grep -E 'Tests +[0-9]+ passed'`, espera passed): só casa sem falha, nenhum achado 3ms
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > Comarka 057[2] (`grep -c 'failed'`, espera 0): leitura equivalente ao rc, nenhum achado 0ms
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > Actus 620 (grep em vitest.config.ts): não é o comando vitest 0ms
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > Actus 001[1] (`grep -E 'passed|failed'`, espera passed): aprovaria a suíte vermelha, segue acusado 0ms
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > Comarka 570[6] (vitest dentro de $( )): indeterminado, segue acusado 1ms
   × 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > pipeline com comando fora dos filtros de texto não é executado: indeterminado 0ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-gate-correcoes.test.ts > 7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha > CI 015[6] (`grep -E 'Tests +[0-9]+ passed'`, espera passed): só casa sem falha, nenhum achado
AssertionError: expected [ { …(5) } ] to deeply equal []
+     "mensagem": "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: cd services/persona-roteirizador && npx vitest run test/roteiro-store-paginacao.test.ts 2>&1 | grep -E 'Tests +[0-9]+ passed'",
    213|   it("CI 015[6] (`grep -E 'Tests +[0-9]+ passed'`, espera passed): só …
AssertionError: expected [ { …(5) } ] to deeply equal []
+     "mensagem": "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: npx vitest run 2>&1 | grep -c 'failed' | tr -d ' '",
AssertionError: expected [ { …(5) } ] to deeply equal []
+     "mensagem": "vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: grep -oE '\"(src|test)/\\*\\*/\\*\\.test\\.ts\"' vitest.config.ts | wc -l | tr -d ' '",
AssertionError: expected 'vitest: saída textual interpretada em…' to match /aprovaria uma suíte com falha/
"vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: node_modules/.bin/vitest run src/lib/orquestrador-fixture.test.ts 2>&1 | grep -E 'passed|failed'"
AssertionError: expected 'vitest: saída textual interpretada em…' to match /não dá para saber/
"vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: { test -f test/getsession-notion-clientes.test.ts || { echo ARQUIVO_AUSENTE; exit 0; }; n=$(npx vitest run test/getsession-notion-clientes.test.ts 2>&1 | grep -E '^ +Tests ' | grep -oE '[0-9]+ passed' | grep -oE '^[0-9]+'); s=$(grep -cE '\\.(skip|only|todo)\\(' test/getsession-notion-clientes.test.ts); [ \"${n:-0}\" -ge 10 ] && [ \"$s\" = 0 ] && echo COBERTURA_OK || echo \"PASSARAM_${n:-0}_SKIP_${s}\"; true; }"
AssertionError: expected [ false ] to deeply equal [ true ]
 Test Files  1 failed (1)
      Tests  6 failed | 20 passed (26)
```

**Verde** (`p3f-verde.txt`):

```
 ✓ test/orquestrador-gate-grep-q.test.ts (19 tests) 11ms
 ✓ test/orquestrador-gate-vitest-aviso.test.ts (27 tests) 39ms
 ✓ test/orquestrador-gate-correcoes.test.ts (26 tests) 514ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 882ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 383ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 2711ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 494ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 320ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 590ms
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 4055ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed | 5 passed (6)
      Tests  1 failed | 133 passed (134)
```


### 7d1b-3g · check 8/C8 (`440b055`)

Casos reais: CI 240×242, Actus 222×211, Comarka 172×175.

**Vermelho** (`p3g-vermelho.txt`):

```
   × 7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA > CI 240 × 242 (242 depende do 241, que depende do 240): sem achado 8 13ms
   × 7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA > Actus 222 × 211 e Comarka 172 × 175: idem, pelo fecho 4ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-gate-correcoes.test.ts > 7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA > CI 240 × 242 (242 depende do 241, que depende do 240): sem achado 8
AssertionError: expected [ Array(1) ] to deeply equal []
    248|   it('CI 240 × 242 (242 depende do 241, que depende do 240): sem achad…
 FAIL  test/orquestrador-gate-correcoes.test.ts > 7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA > Actus 222 × 211 e Comarka 172 × 175: idem, pelo fecho
AssertionError: expected [ Array(1) ] to deeply equal []
    252|   it('Actus 222 × 211 e Comarka 172 × 175: idem, pelo fecho', () => {
 Test Files  1 failed (1)
      Tests  2 failed | 27 passed (29)
```

**Verde** (`p3g-verde.txt`):

```
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 451ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 772ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 317ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 2213ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 426ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 423ms
 Test Files  3 passed (3)
      Tests  89 passed (89)
```


### 7d1b-3h · severidade final (`08aa971`)

Vermelho: o corpus com `3` ERRO (1 FP, 346a). Verde: suíte inteira (1375). No mesmo commit, o `orq-cli.test.ts` "ticket torto", quebrado desde o 3a (confirmado rodando o teste antigo contra o gate de `635ddd3`: passa; contra `fe505ce`: falha).

**Vermelho** (`p3h-vermelho.txt`):

```
   × 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 2968ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
 Test Files  1 failed (1)
      Tests  1 failed | 1 passed (2)
```

**Verde** (`p3h-verde.txt`):

```
 ✓ test/orquestrador-decisao.test.ts (39 tests) 8ms
 ✓ test/orquestrador-enforcement.test.ts (47 tests) 26ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 27ms
 ✓ test/orquestrador-prevoo.test.ts (34 tests) 14ms
 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 208ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3101ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 405ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 307ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 654ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 675ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 315ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1502ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 430ms
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 1007ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 429ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 4443ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 457ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 409ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 417ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 419ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 900ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 427ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 471ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 902ms
 ✓ test/doutrina-v2.test.ts (30 tests) 11ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 6510ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 429ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 403ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 358ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 360ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 833ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 385ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 364ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 379ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 431ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 933ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 440ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 542ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 5639ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 506ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 315ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 447ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 332ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 319ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 398ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 1303ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 6ms
 ✓ test/orq-cli.test.ts (42 tests) 7415ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 420ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 382ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 446ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 345ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 342ms
   ✓ read-only por construção > é executável 328ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 7ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3761ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 615ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 625ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 385ms
   ✓ orq ticket mostra os commits do trailer > lista o commit quando ele existe 328ms
```


### 7d1b-4 · regras do Comarka (`62a8461`)

Vermelho: 11 de 30 (os 10 do Comarka + a tabela de severidade). No verde, a suíte inteira achou 2 falhas novas (C11 em produção achava o próprio arquivo de ticket numa fila que mora dentro de `test/`); consertado antes do commit (os tickets da fila não contam como teste).

**Vermelho** (`p4-vermelho.txt`):

```
   × 7d1b-4 · C2 (forma do cmd) > C2c: CI 003 [5] e [6] (`grep -c … || echo 0` imprimia "0\n0") — aviso 20ms
   × 7d1b-4 · C2 (forma do cmd) > C2c: Comarka 486 e 407a0, com causa; e `{ grep -c …; true; }` não acusa 6ms
   × 7d1b-4 · C2 (forma do cmd) > C2v: CI 212 (`test -f X && grep -c …`, espera 1): se o teste falhar a saída sai vazia — aviso 1ms
   × 7d1b-4 · C2 (forma do cmd) > C2P: grep -P é ERRO (não existe no /usr/bin/grep); arquivo com -P no nome não é a opção 1ms
   × 7d1b-4 · C3 e C4 (o que o padrão casa) > C3: Comarka 523b (proibia NEXT_PUBLIC_ no arquivo inteiro) — aviso 1ms
   × 7d1b-4 · C3 e C4 (o que o padrão casa) > C4: Comarka 391a ('Jur.dico' casa 'jurídico' só em UTF-8) e 243 (acento com grep -i sem LC_ALL) — aviso 1ms
   × 7d1b-4 · C9, C11 e C12 (o ticket contra a árvore) > C9: Comarka 057 ('src/lib/carteira/ranking.ts' está na main e não na base da execução) — aviso 14ms
   × 7d1b-4 · C9, C11 e C12 (o ticket contra a árvore) > C11: Comarka 402 (vercel.json citado em 3 testes fora da allowlist) — aviso, nomeando os testes 1ms
   × 7d1b-4 · C9, C11 e C12 (o ticket contra a árvore) > C12: item sem extensão que não existe e cujo diretório pai também não — aviso; pai existente não acusa 2ms
   × 7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila > repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda 255ms
   × 7d1b-2 · a tabela única > a tabela aplica a decisão da calibração, regra a regra 3ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 372ms
⎯⎯⎯⎯⎯⎯ Failed Tests 11 ⎯⎯⎯⎯⎯⎯⎯
AssertionError: expected [] to deeply equal [ 'criterios_aceite[5]', …(1) ]
AssertionError: expected 0 to be greater than 0
AssertionError: expected [] to include 'criterios_aceite[1]'
AssertionError: expected [] to deeply equal [ …(2) ]
AssertionError: expected 0 to be greater than 0
AssertionError: expected '' to match /'Jur\.dico' usa '\.' no lugar de letr…/
AssertionError: expected '' to match /'src\/lib\/carteira\/ranking\.ts'…/lib\
AssertionError: expected +0 to be 1 // Object.is equality
AssertionError: expected [] to deeply equal [ [ '\'nao/existe/pasta\'', true ] ]
AssertionError: expected '' to match /…/novo\.ts' existe no checkout mas não na branch alvo 'staging-auto'
AssertionError: expected { '1': 'erro', '2': 'erro', …(22) } to deeply equal { '1': 'erro', '2': 'erro', …(30) }
 Test Files  2 failed (2)
      Tests  11 failed | 19 passed (30)
```

**Verde** (`p4-verde.txt`):

```
 ✓ test/orquestrador-gate-comarka.test.ts (14 tests) 358ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 912ms
 Test Files  2 passed (2)
      Tests  30 passed (30)
```


### 7d1b-5 · sem cor (`da51053`)

Vermelho: executor do HEAD anterior no fixture, com `FORCE_COLOR=1` no ambiente: o gate `test` reprova (`FALHA test … exit 1`). O critério já passava antes: `run_criterios` exporta `NO_COLOR=1` desde antes desta etapa (`executor.sh:454` no PASSO 0), e o vitest 2 obedece `NO_COLOR` mesmo com `FORCE_COLOR`. O vermelho que a peça pedia no critério só existe no caminho dos gates; está registrado assim.

**Vermelho** (`p5-vermelho.txt`):

```
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI
== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  FALHA gate 'test' reprovado: ok   typecheck                 3ms FALHA test                    267ms — exit 1 
  ok    critério: saída '1' (o placar casou)
1 CHECK(S) FALHARAM
```

**Verde** (`p5-verde.txt`):

```
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI
== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  ok    gate 'test' aprovado com o placar lido por grep
  ok    critério: saída '1' (o placar casou)
TODOS OS CHECKS PASSARAM
```


### 7d1b-7 · aviso por versão (`b72e3bc`)

Vermelho: duas drenagens, dois `GATE_TICKET_AVISO`, sem hash.

**Vermelho** (`p7-vermelho.txt`):

```
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)
== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)
== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado
== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou
== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação
== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente
== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido
== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903
== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  FALHA 2 eventos GATE_TICKET_AVISO: 2026-09-25T12:36:53-0300 901 GATE_TICKET_AVISO violacoes=1
  FALHA evento sem hash: 2026-09-25T12:36:53-0300 901 GATE_TICKET_AVISO violacoes=1
  FALHA 3 eventos depois da edição
3 CHECK(S) FALHARAM
```

**Verde** (`p7-verde.txt`):

```
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)
== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)
== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado
== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou
== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação
== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente
== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido
== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903
== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  ok    UM GATE_TICKET_AVISO na trilha em dois disparos
  ok    o evento carrega o hash da versão
  ok    o 901 editado é versão nova: segundo GATE_TICKET_AVISO
TODOS OS CHECKS PASSARAM
```

## 2. Matriz final do corpus e severidade final de cada regra

Saída da suíte de fechamento (`TZ=UTC npx vitest run`, `test/orquestrador-gate-corpus.test.ts`). FP = done que a regra marca (a); VP = bloqueado por spec que a regra marca (b). Regra sem linha não disparou em nenhum caso.

```
MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
10n	aviso	56	41	487	6	9	32
2c	aviso	0	0	1	0	0	0
3	aviso	0	0	1	0	0	0
6a:bash	aviso	0	1	6	0	0	0
6a:rm 	aviso	0	13	20	0	0	1
6a:sh -c	aviso	0	0	1	0	0	0
6b	aviso	55	60	363	5	10	26
6q	aviso	0	12	83	0	4	3
6r	aviso	0	0	1	0	0	0
6v	aviso	0	23	250	0	9	13
8	aviso	0	14	77	0	0	3
C11	aviso	22	24	122	2	2	10
C2c	aviso	0	1	4	1	0	2
C2v	aviso	36	0	0	3	0	0
C3	aviso	3	0	9	0	0	2
C4	aviso	0	0	11	0	0	1
C9	aviso	0	0	28	0	0	0
```

Nenhuma regra ERRO tem FP nos três repos. Severidade final (tabela `REGRAS`, `gate-ticket.ts:105`):

| Severidade | Regras |
|---|---|
| **erro** | `1`, `2` (0/0/0 depois de 3a), `4`, `5t` (0/0/0 depois de 3c), `5c` (0/0/0 depois de 3c), `5e`, `6a` (crase, `eval`, `sudo`, `curl http(s)`, `wget`), `7` (= C7), `9`, `10c`, `10x` (0/0/0 depois de 3d), `C2P` |
| **aviso** | `2c` (0/0/1), `3` (0/0/1 depois de 3b; não promovida), `6a:rm `, `6a:bash`, `6a:sh -c`, `6r` (0/0/1 depois de 3e), `6v` (0/23/250 depois de 3f), `6q`, `6b`, `8`/C8 (0/14/77 depois de 3g), `9w`, `10n`, `C2c`, `C2v`, `C3`, `C4`, `C9`, `C11`, `C12` |
| **off** | `6a:$(` |

Diferenças contra a tabela da calibração, todas medidas no corpus:
- **`3` não chegou a ERRO.** A calibração estimou FP → 0 com `[a-z0-9]*`; sobra 1 done no Comarka, o `346a-lib-periodo-compartilhada` (id com o slug colado, sem `criterios_aceite`), que rodou e fechou. Pelo critério (ERRO só com 0 FP), `3` ficou aviso na 3h. Decisão que vale revisar com o dono: é um único ticket claramente malformado.
- **`2` foi dividido.** O mesmo 346a deixava FP 1 em "campo obrigatório" (critérios ausentes). `criterios_aceite` ausente ou vazio virou a regra `2c` (aviso; o executor roda ticket sem critério), e o `2` (os campos que o executor lê) ficou 0/0/0 e ERRO.
- **`10x` precisou de mais que a correção escrita.** Comparar só com o padrão resolvido deixava 510b[4], 512b[1] e 528[1] do Actus como FP (os exemplos foram escritos na forma crua, a única que a regra antiga aceitava) e criava um FP novo (530[14], exemplo para `grep -c` sem `-E`). A regra aceita o exemplo nas duas formas (como o shell entrega o padrão, ou como está escrito entre as aspas de fora), prova positivo e negativo com o padrão que a ferramenta recebe, e conta padrões não-ERE para a correspondência. Resultado 0/0/0.
- **`6v`** bate caso a caso com a estimativa da calibração (FP 0/23/250, VP 0/9/13).
- **`8`** com fecho transitivo bate com o C8 da calibração (0/14/77, VP 0/0/3).
- **C2c** (0/1/4, VP 1/0/2) e **C3** (3/0/9, VP 0/0/2) iguais à calibração. **C4** 0/0/11 (calibração 0/0/12): o dicionário do kit sai de `**/src/**/*.ts(x)`; o do Comarka inclui os mockups HTML, e `Anal.tico` (analítico) não está em `src/`.
- **C11** 22/24/122 (calibração 9/4/122): o kit procura teste em qualquer `test/`, `tests/`, `__tests__/` e `*.test.*`/`*.spec.*` (o CI tem `apps/web/test/` e `services/*/test/`); o Comarka só em `test/` da raiz. VP 2/2/10.
- **C2v** 36/0/0 (calibração, executando: 5/0/0): a forma estática (espera numérica com `test`/`[` encadeado por `&&` antes do número, sem `||`) acusa o risco, não a ocorrência. Aviso.
- **C9** 0/0/28 (calibração 0/1/0): o corpus compara a main no instante da escrita (cadeia de primeiro pai) com a **base da execução** (o pai do merge em staging-auto), que é o que a worktree viu; a calibração comparou com a staging-auto no instante da escrita. Os 28 são tickets do Comarka de agosto cujos testes de aceite estavam na main e não na staging-auto da execução; o ticket criou o arquivo e fechou. O Actus 502 da calibração não dispara com a base (o arquivo já estava lá).

## 3. Medição do pipefail (7d1b-6, sem commit de código)

Script `sim_pipefail.py` no scratchpad desta sessão: os `cmd` de critério do corpus que passam no filtro `seguro()` da calibração (grep, awk, sed, wc, test, find, jq, cat, head, echo e afins; nenhum npx, npm, node, git, curl, bash, rm), rodados contra a base de cada caso (extraída com `git archive`, `GIT_OPTIONAL_LOCKS=0`, apagada depois), com `bash -c 'eval "$CMD"'` e com `bash -c 'set -o pipefail; eval "$CMD"'`, ambiente `NO_COLOR=1 FORCE_COLOR=0 BASE_REF=staging-auto`, PATH do sistema.

```
cmd de critério de inspeção pura executados: 2492 (o filtro seguro() da calibração, contra a base de cada caso)
mudam de rc com set -o pipefail: 280 (161 tickets)
por repo/grupo: {'Actus a': 14, 'CI a': 9, 'CI b': 3, 'Comarka a': 237, 'Comarka b': 17}
rc sem -> com: {'0->2': 79, '0->1': 201}
a saída muda: 0 | o veredito (criterio_match) muda: 0

  80  B arquivo ausente num estágio que não é o último (grep/awk/cat rc 2; o último estágio imprime 0)
  17  C arquivo ausente com stderr descartado (grep/cat 2>/dev/null rc 2)
  12  D ls de caminho ausente (rc 1) antes de wc -l
 171  E grep sem casamento num estágio do meio (rc 1; wc/head/tr/awk depois imprimem a contagem)

[B] Actus a 497a[1] rc 0->2 | grep -ciE 'scripts/orquestrador/[a-z0-9_.-]+:[0-9]+' docs/diagnosticos/2026-09-15-seletor-fila.md | awk '$1>0{print "ok"}' | espera 'ok' | saída 'grep: docs/diagnosticos/2026-09-15-seletor-fila.md: No such '
[B] Actus a 471b[4] rc 0->2 | awk '/^grant execute on function public\.fn_ghl_stage_criterio_gravar/{g=1} g{s=s " " $0} g && /;/{print s; g=0; s=""}' supabase/migrations/ | espera '^1-0$' | saída "0-0\nawk: can't open file supabase/migrations/0281_ghl_stage_"
[B] Actus a 509[2] rc 0->2 | grep -oE '(src|scripts|supabase)/[A-Za-z0-9_./()-]+:[0-9]+' docs/diagnosticos/orfaos-id-map-ghl.md | wc -l | espera '^ *([5-9]|[1-9][0-9]+)$' | saída '0\ngrep: docs/diagnosticos/orfaos-id-map-ghl.md: No such file'
[C] Comarka a 494[3] rc 0->2 | grep -ohE 's/ dado|sem dado' 'src/app/dashboard/clientes/[id]/_components/tabela-campanhas.tsx' 2>/dev/null | wc -l | tr -d ' ' | espera '0' | saída '0'
[C] Comarka a 495[3] rc 0->2 | grep -ohE 's/ dado|sem dado' 'src/app/dashboard/clientes/[id]/_components/bloco-relacao.tsx' 2>/dev/null | wc -l | tr -d ' ' | espera '0' | saída '0'
[C] Comarka a 487[2] rc 0->2 | grep -oE 'grupo: "[a-z-]+"' src/lib/perf/metricas-catalogo.ts 2>/dev/null | sort -u | wc -l | tr -d ' ' | espera '3' | saída '0'
[D] Comarka a 239[0] rc 0->1 | ls src/app/api/closer-analysis/route.ts 2>/dev/null | wc -l | tr -d ' ' | espera '1' | saída '0'
[D] Comarka a 242[0] rc 0->1 | ls supabase/migrations/*_ia_leitura_comercial.sql 2>/dev/null | wc -l | tr -d ' ' | espera '1' | saída '0'
[D] Comarka a 498[1] rc 0->1 | ls 'src/app/dashboard/clientes/[id]/_components/timeline-visao.tsx' 'src/app/dashboard/clientes/[id]/_components/bloco-otimizacoes.tsx' 2>/d | espera '2' | saída '0'
[E] Actus a 490a[5] rc 0->1 | tr '\n' ' ' < supabase/migrations/0269_teses_catalogo.sql | grep -oiE 'create unique index [a-z_]+ +on comercial\.tenant_teses *\( *tenant_i | espera '1' | saída '0'
[E] CI a 267[7] rc 0->1 | grep -rhiE 'add column custo_[a-z_]+ .*(not null|default)' --include=0031_custo_roteiro.sql supabase/migrations | wc -l | tr -d ' ' | espera '0' | saída '0'
[E] CI a 267[8] rc 0->1 | grep -rhiE 'create policy|create (or replace )?function|security definer|create trigger|create index|drop |alter column' --include=0031_cust | espera '0' | saída '0'
```

Leitura:
- **Nenhum dos 280 muda a saída, e nenhum muda o veredito do critério** (`criterio_match` compara a saída). O `pipefail` do executor (herdado pelo subshell do critério, `executor.sh:23`) muda só o `rc_cmd`, que o executor usa para uma coisa: rc 126/127 = critério não executado (causa `ambiente`). Nenhum dos 280 vai a 126/127.
- Os motivos são dois, e os dois são rc de um estágio que NÃO é o último: `grep` sem casamento no meio do pipeline (171, rc 1; o `wc -l`/`head`/`tr` depois imprime a contagem) e arquivo ausente (80 + 17 com stderr descartado + 12 `ls`, rc 2 ou 1). O caso "arquivo ausente" é o mesmo que o C5 e o C2 rc>1 da calibração: grep sobre arquivo que o próprio ticket cria, medido na base.
- **Nenhum SIGPIPE (rc 141) na amostra.** A família que custou caro no Actus (`vitest --reporter=dot | grep -q`, 431, 470, 480, 481) precisa de um produtor que escreva depois que o `grep -q` sai; com arquivos pequenos o produtor termina antes. Os `cmd` com vitest não são de inspeção pura e não rodaram. Essa família não é medível aqui; o 6q (aviso) continua sendo o sinal dela.

Lista completa (repo grupo id[critério] rc_sem->rc_com motivo; A SIGPIPE, B arquivo ausente, C arquivo ausente com stderr descartado, D `ls` de caminho ausente, E grep sem casamento no meio):

```
(repo grupo id[i] rc_sem->rc_com motivo)
Actus a 497a[1] 0->2 B
Actus a 471b[4] 0->2 B
Actus a 509[2] 0->2 B
Actus a 509[3] 0->2 B
Actus a 509[5] 0->1 B
Actus a 490a[5] 0->1 E
Actus a 506[1] 0->2 B
Actus a 506[2] 0->2 B
Actus a 508[8] 0->2 B
Actus a 508[9] 0->2 B
Actus a 471d[2] 0->2 B
Actus a 471d[3] 0->2 B
Actus a 615[0] 0->1 B
Actus a 486[1] 0->2 B
CI a 000[1] 0->1 B
CI a 267[7] 0->1 E
CI a 267[8] 0->1 E
CI a 267[11] 0->1 E
CI a 210[3] 0->1 E
CI a 017[0] 0->1 E
CI a 017[1] 0->1 E
CI b 003[1] 0->2 B
CI b 003[3] 0->2 B
CI b 003[4] 0->2 B
CI a 268[6] 0->1 E
CI a 268[8] 0->1 E
Comarka a 502[2] 0->1 E
Comarka b 154[1] 0->2 B
Comarka b 154[2] 0->2 B
Comarka a 304[1] 0->1 E
Comarka a 304[2] 0->1 E
Comarka a 062c[5] 0->1 E
Comarka a 279[1] 0->1 E
Comarka a 279[2] 0->1 E
Comarka a 238[1] 0->1 E
Comarka a 238[2] 0->1 E
Comarka a 238[11] 0->1 E
Comarka a 287[1] 0->2 B
Comarka a 287[2] 0->2 B
Comarka a 255[1] 0->1 E
Comarka a 236[1] 0->1 E
Comarka a 236[2] 0->2 B
Comarka b 288[1] 0->1 E
Comarka b 288[2] 0->1 E
Comarka a 254[1] 0->1 E
Comarka a 254[3] 0->1 E
Comarka a 170[1] 0->1 E
Comarka a 170[2] 0->1 E
Comarka a 530[13] 0->1 E
Comarka a 494[3] 0->2 C
Comarka a 243[0] 0->1 E
Comarka a 243[2] 0->1 E
Comarka a 243[4] 0->1 E
Comarka a 243[5] 0->1 E
Comarka a 243[11] 0->1 E
Comarka a 217[5] 0->1 E
Comarka a 411[1] 0->1 E
Comarka a 245[1] 0->1 E
Comarka a 245[2] 0->1 E
Comarka a 245[4] 0->1 E
Comarka a 231[1] 0->1 E
Comarka a 231[2] 0->1 E
Comarka a 231[3] 0->2 B
Comarka a 231[6] 0->2 B
Comarka a 231[7] 0->2 B
Comarka a 231[8] 0->2 B
Comarka a 132[1] 0->1 E
Comarka a 504[8] 0->1 E
Comarka a 481[2] 0->1 E
Comarka a 481[3] 0->1 E
Comarka a 532[6] 0->1 E
Comarka a 495[3] 0->2 C
Comarka a 253[1] 0->1 E
Comarka a 276[2] 0->2 B
Comarka a 276[3] 0->2 B
Comarka a 159[1] 0->2 B
Comarka a 159[2] 0->2 B
Comarka a 487[2] 0->2 C
Comarka a 487[3] 0->2 C
Comarka a 562[6] 0->1 E
Comarka a 059[3] 0->2 B
Comarka a 341c[9] 0->1 E
Comarka a 190[3] 0->1 E
Comarka a 293[2] 0->1 E
Comarka a 496[3] 0->2 C
Comarka a 403[1] 0->2 B
Comarka a 239[0] 0->1 D
Comarka a 239[1] 0->2 B
Comarka a 239[2] 0->2 B
Comarka a 239[3] 0->2 B
Comarka a 239[4] 0->1 E
Comarka a 239[7] 0->1 E
Comarka a 560[7] 0->1 E
Comarka a 248[1] 0->1 E
Comarka a 248[2] 0->1 E
Comarka a 248[4] 0->1 E
Comarka a 311b[20] 0->1 E
Comarka a 561[7] 0->1 E
Comarka a 237[1] 0->1 E
Comarka a 237[4] 0->2 B
Comarka a 156[1] 0->1 E
Comarka a 156[2] 0->1 E
Comarka a 563[6] 0->1 E
Comarka a 275[3] 0->2 B
Comarka b 402[1] 0->2 B
Comarka b 402[2] 0->2 B
Comarka b 410[1] 0->1 E
Comarka a 303[2] 0->1 E
Comarka a 303[3] 0->1 E
Comarka a 191[3] 0->1 E
Comarka a 212[0] 0->1 E
Comarka a 010[3] 0->1 E
Comarka a 291[1] 0->1 E
Comarka a 291[2] 0->1 E
Comarka a 291[4] 0->1 E
Comarka a 251[1] 0->1 E
Comarka a 251[2] 0->1 E
Comarka a 242[0] 0->1 D
Comarka a 242[3] 0->1 B
Comarka a 242[6] 0->1 B
Comarka a 242[8] 0->1 B
Comarka a 266[1] 0->1 E
Comarka a 292[2] 0->1 E
Comarka a 292[3] 0->1 E
Comarka a 267[1] 0->1 E
Comarka a 223[1] 0->1 E
Comarka a 223[5] 0->2 B
Comarka a 564[6] 0->1 E
Comarka a 235[1] 0->1 E
Comarka a 235[2] 0->2 B
Comarka a 235[3] 0->2 B
Comarka a 235[4] 0->2 B
Comarka a 256[1] 0->1 E
Comarka a 256[3] 0->1 E
Comarka a 256[4] 0->1 E
Comarka b 538[6] 0->1 E
Comarka b 514[10] 0->1 E
Comarka a 521[8] 0->1 E
Comarka a 137[1] 0->1 E
Comarka a 068a[1] 0->1 E
Comarka a 497[2] 0->2 C
Comarka a 497[4] 0->2 C
Comarka a 401[2] 0->2 B
Comarka a 297[1] 0->1 E
Comarka a 297[2] 0->1 E
Comarka a 498[1] 0->1 D
Comarka a 498[2] 0->2 C
Comarka a 498[3] 0->2 C
Comarka b 294[1] 0->1 E
Comarka a 566[7] 0->1 E
Comarka a 123[2] 0->2 B
Comarka a 157[1] 0->1 E
Comarka b 486[2] 0->1 E
Comarka b 486[3] 0->2 C
Comarka a 227[0] 0->1 D
Comarka a 227[2] 0->1 B
Comarka a 227[4] 0->1 B
Comarka a 227[5] 0->1 B
Comarka a 227[7] 0->1 B
Comarka a 216[2] 0->2 B
Comarka a 216[3] 0->2 B
Comarka a 165[1] 0->1 E
Comarka a 165[2] 0->2 C
Comarka a 485[2] 0->1 E
Comarka a 206[1] 0->1 E
Comarka a 302[2] 0->1 E
Comarka a 230[0] 0->2 B
Comarka a 230[3] 0->1 E
Comarka a 230[5] 0->1 E
Comarka a 230[6] 0->1 E
Comarka a 296[3] 0->1 E
Comarka a 296[4] 0->1 E
Comarka a 296[8] 0->1 E
Comarka a 233[3] 0->1 E
Comarka a 486b[5] 0->1 E
Comarka a 405[1] 0->1 E
Comarka a 405[2] 0->1 E
Comarka a 541[7] 0->1 E
Comarka a 265[1] 0->1 E
Comarka a 552[2] 0->1 E
Comarka a 552[6] 0->1 E
Comarka a 488d[7] 0->1 E
Comarka a 299[1] 0->1 E
Comarka a 493[1] 0->2 C
Comarka a 493[3] 0->2 C
Comarka a 520b[6] 0->1 E
Comarka a 301[1] 0->1 E
Comarka a 301[2] 0->1 E
Comarka a 281[3] 0->1 E
Comarka a 281[4] 0->1 E
Comarka a 484[1] 0->1 E
Comarka a 531[8] 0->1 E
Comarka a 215[0] 0->1 D
Comarka a 215[2] 0->1 B
Comarka a 215[4] 0->2 B
Comarka a 240[0] 0->1 D
Comarka a 240[1] 0->2 B
Comarka a 240[2] 0->2 B
Comarka a 240[3] 0->2 B
Comarka a 240[4] 0->1 E
Comarka a 240[6] 0->2 B
Comarka a 220[0] 0->1 D
Comarka a 220[3] 0->1 B
Comarka a 220[4] 0->1 B
Comarka a 220[6] 0->1 B
Comarka a 076[1] 0->1 E
Comarka a 515[7] 0->1 E
Comarka b 161[1] 0->1 E
Comarka b 161[2] 0->1 E
Comarka a 499[3] 0->2 C
Comarka a 499[14] 0->1 E
Comarka a 499[15] 0->1 E
Comarka a 221[2] 0->2 B
Comarka a 221[3] 0->2 B
Comarka a 221[5] 0->2 B
Comarka a 166[1] 0->1 E
Comarka a 166[2] 0->1 E
Comarka a 226[0] 0->1 E
Comarka a 226[3] 0->1 E
Comarka a 488b[4] 0->1 E
Comarka a 520[6] 0->1 E
Comarka a 519[5] 0->1 E
Comarka a 225[0] 0->1 E
Comarka a 225[1] 0->1 E
Comarka a 225[2] 0->1 E
Comarka a 224[0] 0->1 D
Comarka a 224[4] 0->1 B
Comarka a 224[5] 0->1 B
Comarka a 406[1] 0->1 E
Comarka a 406[2] 0->1 E
Comarka a 541b[6] 0->1 E
Comarka a 129[1] 0->1 E
Comarka a 129[3] 0->1 E
Comarka a 289[1] 0->1 E
Comarka a 289[2] 0->1 E
Comarka a 192[3] 0->1 E
Comarka a 062a1[5] 0->1 D
Comarka a 222[2] 0->2 B
Comarka a 222[3] 0->2 B
Comarka a 222[6] 0->2 B
Comarka a 057[3] 0->1 E
Comarka a 290[1] 0->1 E
Comarka a 290[4] 0->1 E
Comarka a 247[3] 0->1 E
Comarka a 179[2] 0->1 E
Comarka a 505[4] 0->1 E
Comarka a 505[5] 0->1 E
Comarka a 062a2[4] 0->1 D
Comarka b 277[1] 0->1 E
Comarka b 277[3] 0->1 E
Comarka b 277[4] 0->1 E
Comarka a 278[1] 0->1 E
Comarka a 278[2] 0->1 E
Comarka a 278[3] 0->1 E
Comarka a 491[2] 0->1 E
Comarka a 491[3] 0->2 C
Comarka a 409[1] 0->1 E
Comarka a 260[9] 0->1 E
Comarka a 516[5] 0->1 E
Comarka a 172[3] 0->2 C
Comarka a 412[1] 0->1 E
Comarka a 298[1] 0->1 E
Comarka a 298[2] 0->2 B
Comarka a 193[4] 0->1 E
Comarka a 517[8] 0->1 E
Comarka a 539b[9] 0->1 E
Comarka a 158[1] 0->2 B
Comarka a 158[2] 0->2 B
Comarka a 512[9] 0->1 E
Comarka a 408[1] 0->2 B
Comarka a 062b2[4] 0->1 D
Comarka a 056[3] 0->2 B
Comarka a 056[4] 0->2 B
Comarka a 229[0] 0->1 D
Comarka a 229[2] 0->1 B
Comarka a 229[4] 0->1 B
Comarka a 483[1] 0->2 C
Comarka a 404[1] 0->1 E
Comarka a 197[4] 0->1 E
Comarka a 263[1] 0->1 E
```

## 4. Suítes de fechamento (uma de cada vez, rc capturado)

```
rc(typecheck)=0
rc(vitest)=0
rc(test-shell.sh)=0
rc(test-instalar.sh)=0
rc(test-drenagem.sh, no fixture /tmp/orq-fixture-NeSWlV/repo)=0
rc(test-ambiente.sh)=0
```

- typecheck: `npx tsc --noEmit`, saída vazia.
- vitest: `Test Files  66 passed (66)`, `Tests  1389 passed (1389)`.
- `scripts/kit/test-shell.sh` (fixture): os 23 scripts rc 0, incluindo o novo `test-sem-cor.sh`:

```
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
  rc=0  test-gate-prevoo.sh
  rc=0  test-tentativas-persistidas.sh
  rc=0  test-orq-pause.sh
  rc=0  test-sem-cor.sh
```

- `scripts/kit/test-instalar.sh`: `TODOS OS CHECKS PASSARAM` (o caso (c) pulado por não ter `ORQ_CI_CHECKOUT`, como por padrão).
- `test-drenagem.sh`: rodado na cópia do fixture (`scripts/kit/fixture.sh`), porque ele copia `docs/fila/000-config.json` do checkout e o kit não tem fila; é como o `test-shell.sh` o roda. 24 `ok`, `TODOS OS CHECKS PASSARAM`.
- `test-ambiente.sh`: direto do kit (fixture própria em `mktemp -d`), `TODOS OS CHECKS PASSARAM`.

## 5. Dry-runs do instalador

`bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`: rc 0, 43 diferenças listadas.

```

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
```

`bash instalar.sh --atualizar ~/Projetos/actus-saas --dry-run`: rc 0, 47 diferenças listadas.

```

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/actus-saas' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
```

Os dois dry-runs dizem que o `--atualizar` de verdade **recusaria**: os loops não estão pausados. Não criei sentinela em nenhum repo, e `git status` dos dois (com `GIT_OPTIONAL_LOCKS=0`) segue limpo.

## 6. Notas, desvios e o que não fiz

- **`node_modules` do worktree é symlink humano** para `~/Projetos/orquestrador-kit/node_modules`. Nunca entrou em `git add` (todo `add` foi por arquivo), não foi removido e nada foi escrito dentro dele. O vitest dos testes de cor rodou projetos num `mktemp -d`/scratchpad, com o cache no próprio tmp. `git status` no fim: só `?? node_modules`.
- **Comarka:** só leitura de `scripts/validar-fila.py` e `scripts/orquestrador/executor.sh` (`sed -n`), e git com `GIT_OPTIONAL_LOCKS=0` (log, ls-tree, cat-file, grep, archive, rev-list). Nenhum script dele rodou; nada em `docs/fila`, `runs`, locks ou sentinelas.
- **Teste antigo quebrado entre commits:** o `orq-cli.test.ts` "ticket torto" ficou vermelho de `fe505ce` (3a) até `08aa971` (3h), porque na 3a rodei só a suíte do gate e não a inteira. Rebase é proibido, então o conserto foi no 3h, com a mesma asserção. Os commits 3a a 3g têm esse teste vermelho (e o do corpus, por desenho).
- **Testes antigos atualizados com asserção de mesma força** (cada um com comentário no código): regra (d) da isenção do `$(` (agora com `6a:$(` ligada pelo config); o 6v do 903 como aviso; `test-gate-prevoo.sh` com `RUIM` usando `eval` (o `grep -q`/vitest virou o caso 8); `risco` ausente e a lista `CAMPOS_PENDENTE`; a mensagem do id `9z1`; a mensagem da regra 2 do 624 (dois testes); o "ticket torto" do `orq-cli.test.ts`; a asserção do CONTRATO em `doutrina-v2.test.ts`.
- **Pendência de doutrina:** `doutrina/SKILL.md` e `DOUTRINA-v2` ainda dizem que o gate cobra a chave `risco`. Estão fora do escopo de escrita. O `doutrina-v2.test.ts` (decisão 4) agora cobra o texto novo do CONTRATO e mantém a asserção da SKILL como está, com a divergência escrita no teste e no PECAS.md.
- **Peça 5:** o vermelho pedido ("critério … falha hoje") não existe no caminho do critério, que já tinha `NO_COLOR=1`. Existe no caminho dos gates, e é lá que o teste o prova. Medido também: `FORCE_COLOR=0` **sozinho** colore o vitest 2 (`tinyrainbow` testa `"FORCE_COLOR" in env`); o que desliga é o `NO_COLOR=1`. Os dois vão juntos.
- **Peça 7:** a "versão" do ticket é o hash do bloco JSON sem `status`, `notas_status`, `tentativas`, `adiamentos_ambiente` e `adiado_ate` (os campos que o loop do kit reescreve). A dedupe lê a trilha (`events.log`): trilha apagada ou rotacionada = o aviso sai de novo, uma vez.
- **Contexto de árvore (C4, C9, C11, C12):** em produção, `contextoGit` pergunta ao git do repo da fila (`branch_alvo` do config para C9/C12; disco do checkout para C9, C11 e o dicionário do C4). Fora de repo git, ou com a branch alvo inexistente, essas regras não rodam (nunca acusam por não saber).
- **Testes novos são do kit:** `orquestrador-gate-corpus`, `-severidade`, `-correcoes`, `-comarka` e `test-sem-cor.sh` não entraram no `TESTES_HARNESS` do `vendorizado.sh` (o corpus tem 6 MB de dados de três repos; `vendorizado.sh` não estava no escopo de escrita). O `test-sem-cor.sh` entrou no `test-shell.sh`.
- **Scripts de geração do corpus** estão no próprio fixture (`gerar.py`, `gerar-arvores.py`); eles leem o scratchpad da calibração e o git dos três repos só leitura.

## 7. Caixa de defeitos (38864fd, b58cc8f)

Nenhum resolvido; listados no PASSO 0 (§0.4):
- `2026-09-25-aceite-vermelho.md` (circuit breaker rotula aceite vermelho por tela como defeito de spec): **não toca** gate de ticket, severidade nem execução de critérios e gates.
- `2026-09-25-teto-medido-fora-do-executor.md` (guarda de teto com número fixado na autoria, 627): **toca o gate de ticket** (pede um aviso novo no `gate-ticket.ts`) e a doutrina. Não é peça desta etapa; entrou no PECAS.md como pendente, na forma de uma linha `aviso` na tabela `REGRAS`.

## 8. Commits (branch `kit/etapa7d1`, sem push)

```
960d8e6 7d1b-1: corpus da calibração do gate de ticket (57 de spec + 706 done) e teste que reprova regra ERRO com falso positivo
635ddd3 7d1b-2: severidade por regra no gate de ticket (tabela REGRAS, gate_ticket.severidade no config)
fe505ce 7d1b-3a: check 2 sem bloco e sem risco obrigatórios; criterios_aceite ausente vira a regra 2c (aviso)
2b49f34 7d1b-3b: check 3 aceita id com sufixo de fatiamento (407a0, 315b1b), também na leitura da fila
74fffeb 7d1b-3c: check 5 infere o tipo ausente (5t) e aceita cmd vazio em critério espera 'avaliador' (5c)
1d942d7 7d1b-3d: check 10x compara o exemplo com o padrão que o shell entrega e dispensa exemplo no grep -v
e6bd065 7d1b-3e: check 6r aceita redirecionamento para /tmp e fecha o alvo no ')'
394c241 7d1b-3f: check 6v só acusa critério que aprovaria uma suíte com falha
440b055 7d1b-3g: check 8 com fecho transitivo das dependências (C8 do comarka-operacional)
08aa971 7d1b-3h: severidade final das regras corrigidas pela matriz do corpus; o teste do corpus fica verde
62a8461 7d1b-4: regras estáticas do validar-fila do comarka-operacional no gate de ticket
da51053 7d1b-5: critérios e gates rodam com NO_COLOR=1 e FORCE_COLOR=0
b72e3bc 7d1b-7: GATE_TICKET_AVISO uma vez por ticket e por versão do conteúdo
ea63c8c 7d1b-8: CHANGELOG, PECAS e CONTRATO da etapa 7d-1b, com os shas
```

## Apêndice · diff cru de cada commit

Inteiro, exceto os dois JSON grandes do corpus (`casos.json`, 5,66 MB, e `arvores.json`, 0,32 MB), que aparecem só no `--stat` e no blob abaixo: são dados copiados do git dos três repos pelos geradores `gerar.py` e `gerar-arvores.py`, que estão no diff.

### 960d8e6 7d1b-1: corpus da calibração do gate de ticket (57 de spec + 706 done) e teste que reprova regra ERRO com falso positivo

~~~~diff
commit 960d8e6257d854dbe58dd7a02205b5ec4679d4f2
Author: Lucas Santos
Date: Fri Sep 25 11:58:29 2026 -0300

7d1b-1: corpus da calibração do gate de ticket (57 de spec + 706 done) e teste que reprova regra ERRO com falso positivo

O teste nasce vermelho: 2, 5t, 6v, 10n, 3, 5c, 6a, 6q, 6r, 8 e 10x são ERRO
hoje e marcam done do Comarka, do Actus ou do CI. A matriz impressa reproduz
a da calibração de 25/09 regra a regra.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 test/fixtures/gate-corpus-7d1/casos.json | 765 +++++++++++++++++++++++++++++++
 test/fixtures/gate-corpus-7d1/gerar.py   | 118 +++++
 test/orquestrador-gate-corpus.test.ts    | 150 ++++++
 3 files changed, 1033 insertions(+)
diff --git a/test/fixtures/gate-corpus-7d1/gerar.py b/test/fixtures/gate-corpus-7d1/gerar.py
new file mode 100644
index 0000000..290b667
--- /dev/null
+++ b/test/fixtures/gate-corpus-7d1/gerar.py
@@ -0,0 +1,118 @@
+"""Gera test/fixtures/gate-corpus-7d1/casos.json a partir dos dados da calibração
+de 25/09 (casos.json + inventario.json) e do git dos três repos, só leitura.
+
+Uso: python3 gerar_corpus.py <saida.json>
+"""
+import json, os, re, subprocess, sys
+from collections import Counter
+
+CAL = '/private/tmp/claude-501/-Users-lucasantos-Projetos-orquestrador-kit/0b216d2f-2289-42ab-b28d-ee83350fd5b2/scratchpad/cal'
+REPO = {'CI': '~/Projetos/conteudos-infinitos', 'Actus': '~/Projetos/actus-saas', 'Comarka': '~/Projetos/comarka-operacional'}
+REPO = {k: os.path.expanduser(v) for k, v in REPO.items()}
+ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
+RMAP = {'conteudos-infinitos': 'CI', 'actus-saas': 'Actus', 'comarka-operacional': 'Comarka'}
+
+def git(repo, *a):
+    return subprocess.run(['git', '-C', REPO[repo], *a], capture_output=True, text=True, env=ENV)
+
+def bloco(t):
+    m = re.search(r"```json\n(.*?)\n```", t or '', re.S)
+    if not m: return None
+    try: return json.loads(m.group(1))
+    except Exception: return None
+
+inv = json.load(open(f'{CAL}/inventario.json'))
+casos = json.load(open(f'{CAL}/casos.json'))
+
+# causa anotada dos 57, da tabela do levantamento de bloqueios
+causa = {}
+for l in open(os.path.expanduser('~/orq-sessoes/levantamento-bloqueios.md')):
+    c = [x.strip().replace('\\|', '|') for x in re.split(r'(?<!\\)\|', l)]
+    if len(c) > 6 and c[1] in RMAP and c[5] in ('spec_criterio', 'spec_allowlist'):
+        causa[(RMAP[c[1]], c[2])] = c[6]
+
+CAMPOS = ['id', 'slug', 'bloco', 'objetivo', 'pathspec_allowlist', 'dependencias', 'criterios_aceite',
+          'status', 'risco', 'contexto_juiz', 'cria_novo']
+CAMPOS_CRIT = ['tipo', 'descricao', 'cmd', 'espera', 'exemplos_regex']
+
+def reduz(j):
+    t = {k: j[k] for k in CAMPOS if k in j}
+    if isinstance(t.get('criterios_aceite'), list):
+        t['criterios_aceite'] = [
+            {k: c[k] for k in CAMPOS_CRIT if k in c} if isinstance(c, dict) else c for c in t['criterios_aceite']
+        ]
+    return t
+
+# versões parseadas por repo/arquivo
+vers = {r: {a: [(x['t'], bloco(x['txt'])) for x in v['hist']] for a, v in inv[r].items()} for r in inv}
+
+def fila_em(repo, T):
+    out = {}
+    for a, vs in vers[repo].items():
+        j = None; ok = False
+        for t, jj in vs:
+            if t < T: j = jj; ok = True
+            else: break
+        if ok and j and isinstance(j.get('id'), str): out[j['id']] = j
+    return out
+
+def deps_de(j):
+    return [d for d in (j.get('dependencias') or []) if isinstance(d, str) and not d.startswith('humano:')]
+
+ls_cache = {}
+def fila_git(repo, sha):
+    """ids -> json da fila no commit (para dependência cujo arquivo não existe mais hoje)."""
+    if (repo, sha) not in ls_cache:
+        nomes = git(repo, 'ls-tree', '--name-only', sha, 'docs/fila/').stdout.split()
+        ls_cache[(repo, sha)] = nomes
+    return ls_cache[(repo, sha)]
+
+resgatados = []
+saida = []
+sel = [c for c in casos if c['grupo'] == 'b' or c.get('tem_runs')]
+for c in sel:
+    j = bloco(c['txt'])
+    repo = c['repo']
+    fila = fila_em(repo, c['T'])
+    tid = j.get('id')
+    # dependência que o snapshot de hoje não tem: lida do git no commit do evento
+    for d in deps_de(j):
+        if d in fila: continue
+        for nome in fila_git(repo, c['sha_ev']):
+            b = os.path.basename(nome)
+            if re.match(rf'^{re.escape(d)}-.*\.md$', b):
+                jj = bloco(git(repo, 'show', f"{c['sha_ev']}:{nome}").stdout)
+                if jj and jj.get('id') == d:
+                    fila[d] = jj; resgatados.append((repo, tid, d))
+                break
+    # contexto mínimo: dependências (fecho), pendentes com allowlist em comum e o fecho deles
+    minhas = set(map(str, j.get('pathspec_allowlist') or []))
+    incluir = set()
+    for oid, o in fila.items():
+        if oid == tid or o.get('status') != 'pendente': continue
+        if minhas & set(map(str, o.get('pathspec_allowlist') or [])): incluir.add(oid)
+    pilha = deps_de(j) + [d for o in list(incluir) for d in deps_de(fila[o])]
+    while pilha:
+        d = pilha.pop()
+        if d in incluir or d == tid: continue
+        if d in fila:
+            incluir.add(d); pilha.extend(deps_de(fila[d]))
+    ctx = []
+    for oid in sorted(incluir):
+        o = fila[oid]
+        ctx.append({'id': oid, 'status': o.get('status'), 'pathspec_allowlist': o.get('pathspec_allowlist') or [],
+                    'dependencias': o.get('dependencias') or []})
+    caso = {'grupo': c['grupo'], 'repo': repo, 'id': c['id'], 'arquivo': c['arq']}
+    if c['grupo'] == 'b':
+        caso['classe'] = c['classe']; caso['causa'] = causa.get((repo, c['id']), '')
+    caso['ticket'] = reduz(j)
+    caso['fila'] = ctx
+    saida.append(caso)
+
+ordem = {'b': 0, 'a': 1}; orep = {'CI': 0, 'Actus': 1, 'Comarka': 2}
+saida.sort(key=lambda x: (ordem[x['grupo']], orep[x['repo']], x['id']))
+with open(sys.argv[1], 'w') as f:
+    f.write('[\n' + ',\n'.join(json.dumps(x, ensure_ascii=False) for x in saida) + '\n]\n')
+print(Counter((x['grupo'], x['repo']) for x in saida))
+print('dependências resgatadas do git:', len(resgatados), resgatados)
+print('sem causa:', [(x['repo'], x['id']) for x in saida if x['grupo'] == 'b' and not x.get('causa')])
diff --git a/test/orquestrador-gate-corpus.test.ts b/test/orquestrador-gate-corpus.test.ts
new file mode 100644
index 0000000..dee1881
--- /dev/null
+++ b/test/orquestrador-gate-corpus.test.ts
@@ -0,0 +1,150 @@
+/**
+ * Etapa 7d-1b, peça 1 — o corpus de calibração do gate de ticket.
+ *
+ * `test/fixtures/gate-corpus-7d1/casos.json` guarda os tickets reais da
+ * calibração de 25/09/2026 (`~/orq-sessoes/levantamento-7d1-calibracao.md`),
+ * só com os campos que o gate lê, cada um na versão que rodou:
+ *
+ *   (b) os 57 bloqueados por spec (`spec_criterio`/`spec_allowlist`), com a
+ *       causa anotada no levantamento de bloqueios — todo disparo é VP;
+ *   (a) os done que nunca bloquearam e rodaram no loop (CI 58, Actus 91,
+ *       Comarka 557 desde 26/07) — todo disparo é FP por definição.
+ *
+ * `fila` de cada caso é a fila no instante T reduzida ao que os checks 7 e 8
+ * leem: as dependências (com o fecho), os pendentes com allowlist em comum e o
+ * fecho deles. As 19 dependências cujo arquivo não existe mais hoje foram
+ * lidas do git no commit do evento (o artefato que a calibração conferiu à mão).
+ *
+ * A régua: o comarka-operacional é a mais madura da frota, e NENHUMA regra de
+ * severidade ERRO pode ter falso positivo em (a), em nenhum dos três repos. O
+ * teste imprime a matriz (VP em (b), FP em (a), por regra e por repo) e falha
+ * nomeando cada regra ERRO com FP.
+ *
+ * A severidade é a que o gate DEVOLVE em cada achado (`aviso`/violação), não uma
+ * tabela copiada aqui: o teste mede o gate como o pré-voo o consome.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { REPO_ROOT } from './fixtures/orq-harness.js';
+import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
+
+interface Caso {
+  grupo: 'a' | 'b';
+  repo: 'CI' | 'Actus' | 'Comarka';
+  id: string;
+  arquivo: string;
+  classe?: string;
+  causa?: string;
+  ticket: Record<string, unknown>;
+  fila: Record<string, unknown>[];
+}
+
+const CASOS = JSON.parse(
+  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1', 'casos.json'), 'utf8'),
+) as Caso[];
+// A calibração rodou os três repos com o config do template (o Comarka não tem
+// `gate_ticket`): é o mesmo que o fixture do kit carrega.
+const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));
+const REPOS = ['CI', 'Actus', 'Comarka'] as const;
+
+/**
+ * A regra de um achado. Depois da peça 2 o gate diz (`regra`); antes, a
+ * mensagem é classificada como a simulação da calibração classificava
+ * (`simkit.ts:chave`), para o corpus medir o gate de ANTES também.
+ */
+function regraDe(v: Violacao): string {
+  const r = (v as Violacao & { regra?: string }).regra;
+  if (r) return r;
+  const m = v.mensagem;
+  const campo = v.campo;
+  if (campo === 'json') return '1';
+  if (campo === 'id') return '3';
+  if (campo === 'status') return '4';
+  if (campo.startsWith('dependencias')) return '7';
+  if (campo === 'pathspec_allowlist') return '8';
+  if (campo.startsWith('contexto_juiz')) return v.aviso ? '9w' : '9';
+  if (campo === 'objetivo' && v.aviso) return '6b';
+  if (campo.endsWith('.exemplos_regex')) {
+    return m.includes('não declara exemplos_regex') ? '10n' : m.includes('dentro de classe') ? '10c' : '10x';
+  }
+  if (v.isencao) return '6i';
+  if (m.includes('campo obrigatório') || m.includes('classe de risco')) return '2';
+  if (m.startsWith('tipo ')) return '5t';
+  if (m === 'cmd vazio') return '5c';
+  if (m === 'espera vazia') return '5e';
+  if (m.startsWith('padrão proibido')) return `6a:${/'([^']*)'/.exec(m)?.[1] ?? '?'}`;
+  if (m.startsWith('redirecionamento')) return '6r';
+  if (m.startsWith('vitest:')) return '6v';
+  if (m.startsWith('grep -q em pipe')) return '6q';
+  return `?${campo}`;
+}
+
+function rodarCaso(c: Caso): Violacao[] {
+  const dir = `/corpus-7d1/${c.repo}`;
+  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: { ...c.ticket, status: 'pendente' } };
+  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
+  fila.push(alvo);
+  return validarTicket(alvo, fila, CFG);
+}
+
+interface Celula {
+  tickets: Set<string>;
+  erro: boolean;
+}
+
+function matriz(): Map<string, Record<string, Celula>> {
+  const m = new Map<string, Record<string, Celula>>();
+  for (const c of CASOS) {
+    for (const v of rodarCaso(c)) {
+      if (v.isencao) continue;
+      const regra = regraDe(v);
+      if (!m.has(regra)) m.set(regra, {});
+      const linha = m.get(regra)!;
+      const col = `${c.grupo}:${c.repo}`;
+      linha[col] ??= { tickets: new Set(), erro: false };
+      linha[col]!.tickets.add(c.id);
+      if (!v.aviso) linha[col]!.erro = true;
+    }
+  }
+  return m;
+}
+
+function imprimir(m: Map<string, Record<string, Celula>>): string {
+  const cols = [...REPOS.map((r) => `a:${r}`), ...REPOS.map((r) => `b:${r}`)];
+  const tot = (col: string) => CASOS.filter((c) => `${c.grupo}:${c.repo}` === col).length;
+  const linhas = [
+    `regra\tseveridade\t${cols.map((c) => `${c.startsWith('a') ? 'FP' : 'VP'} ${c.slice(2)}/${tot(c)}`).join('\t')}`,
+  ];
+  for (const regra of [...m.keys()].sort()) {
+    const l = m.get(regra)!;
+    const sev = Object.values(l).some((x) => x.erro) ? 'ERRO' : 'aviso';
+    linhas.push(`${regra}\t${sev}\t${cols.map((c) => l[c]?.tickets.size ?? 0).join('\t')}`);
+  }
+  return linhas.join('\n');
+}
+
+describe('7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo', () => {
+  it('o corpus é o da calibração: 58/91/557 done e 6/12/39 bloqueados por spec, todos com causa', () => {
+    const n = (g: string, r: string) => CASOS.filter((c) => c.grupo === g && c.repo === r).length;
+    expect([n('a', 'CI'), n('a', 'Actus'), n('a', 'Comarka')]).toEqual([58, 91, 557]);
+    expect([n('b', 'CI'), n('b', 'Actus'), n('b', 'Comarka')]).toEqual([6, 12, 39]);
+    expect(CASOS.filter((c) => c.grupo === 'b' && !c.causa).map((c) => `${c.repo} ${c.id}`)).toEqual([]);
+  });
+
+  it('matriz por regra e por repo; regra ERRO com FP em (a) reprova', () => {
+    const m = matriz();
+    const tabela = imprimir(m);
+    console.log(`\nMATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)\n${tabela}\n`);
+    const erroComFp: string[] = [];
+    for (const [regra, l] of m) {
+      for (const r of REPOS) {
+        const cel = l[`a:${r}`];
+        if (cel?.erro && cel.tickets.size > 0) {
+          erroComFp.push(`${regra} ${r}: ${cel.tickets.size} FP (${[...cel.tickets].slice(0, 6).join(', ')}${cel.tickets.size > 6 ? ', …' : ''})`);
+        }
+      }
+    }
+    expect(erroComFp, tabela).toEqual([]);
+  }, 180_000);
+});
~~~~

### 635ddd3 7d1b-2: severidade por regra no gate de ticket (tabela REGRAS, gate_ticket.severidade no config)

~~~~diff
commit 635ddd371b4518521f1b7447c9076add2c0d2210
Author: Lucas Santos
Date: Fri Sep 25 12:05:59 2026 -0300

7d1b-2: severidade por regra no gate de ticket (tabela REGRAS, gate_ticket.severidade no config)

Cada achado do gate carrega a regra, e a tabela única decide erro, aviso ou
off; o config sobrescreve por gate_ticket.severidade (valor ou regra
desconhecida = falha alta, rc 2). O rc, e portanto o modo_pre_voo
'bloqueia', só conta ERRO.

Tabela da calibração de 25/09: 6a:$( off; 6a:rm/bash/sh -c, 6q, 6b, 10n
aviso; 6r, 6v e 8 aviso (CORRIGIR -> AVISO); 2, 3, 5t, 5c e 10x seguem
erro até a correção da peça 3.

Testes antigos atualizados com asserção de mesma força: a isenção do $(
(regra d) com 6a:$( ligada pelo config; o 6v do 903 como aviso; o RUIM do
test-gate-prevoo passa a usar eval (ERRO), e o critério grep -q/vitest vira o
caso 8 (bloqueia, só aviso: executa).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 doutrina/templates/config.json              |   2 +
 scripts/orquestrador/config-chaves.ts       |   3 +-
 scripts/orquestrador/config-tabela.ts       |   7 +
 scripts/orquestrador/gate-ticket.ts         | 242 +++++++++++++++++++++++-----
 scripts/orquestrador/test-gate-prevoo.sh    |  35 +++-
 test/orquestrador-gate-severidade.test.ts   | 211 ++++++++++++++++++++++++
 test/orquestrador-gate-ticket.test.ts       |  22 ++-
 test/orquestrador-gate-vitest-aviso.test.ts |   6 +-
 8 files changed, 472 insertions(+), 56 deletions(-)
diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index e11844f..8961aa6 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -109,6 +109,8 @@
     "timeout_cmd_secs": 120,
     "modo_pre_voo": "aviso",
     "_modo_pre_voo": "Pré-voo do gate de ticket no drive_ticket (porte do Actus, c404986 e 624): 'aviso' registra as violações no log e na trilha (GATE_TICKET_AVISO) e deixa o ticket seguir; 'bloqueia' marca o ticket bloqueado antes da worktree, sem consumir tentativa. Ausente = 'aviso'. Gate que não roda é falha alta nos dois.",
+    "severidade": {},
+    "_severidade": "Severidade por regra do gate de ticket (etapa 7d-1b): objeto regra -> erro|aviso|off por cima da tabela REGRAS do gate-ticket.ts. Vazio = a tabela, que aplica a calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). 'bloqueia' no modo_pre_voo bloqueia SÓ por regra erro. Ex.: {\"6q\": \"erro\", \"6a:rm \": \"off\"}. Regra ou valor desconhecido é falha alta.",
     "cmd_prefixos_permitidos": [
       "npx vitest run",
       "npx jest",
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index 18c2598..ee4eccd 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -91,7 +91,8 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: 'modelos.juiz_baixo', onde: 'juiz.ts:76', obrigatoria: true },
 
   // --- gate de ticket -------------------------------------------------------
-  { chave: 'gate_ticket.modo_pre_voo', onde: 'executor.sh:1052', obrigatoria: false, nota: "ausente = 'aviso'; valor fora de aviso|bloqueia é falha alta (porte do Actus, c404986/624)" },
+  { chave: 'gate_ticket.modo_pre_voo', onde: 'executor.sh:1285', obrigatoria: false, nota: "ausente = 'aviso'; valor fora de aviso|bloqueia é falha alta (porte do Actus, c404986/624)" },
+  { chave: 'gate_ticket.severidade', onde: 'gate-ticket.ts:846', obrigatoria: false, nota: "regra -> erro|aviso|off por cima da tabela REGRAS (gate-ticket.ts:92); ausente = a tabela; valor ou regra desconhecida é falha alta, rc 2 (etapa 7d-1b)" },
   { chave: 'gate_ticket.cmd_prefixos_permitidos', onde: 'gate-ticket.ts:275', obrigatoria: true, nota: 'lista vazia reprova TODO critério com cmd' },
   { chave: 'gate_ticket.proibido_no_cmd', onde: 'gate-ticket.ts:281', obrigatoria: true },
 
diff --git a/scripts/orquestrador/config-tabela.ts b/scripts/orquestrador/config-tabela.ts
index 796d719..78f56ed 100644
--- a/scripts/orquestrador/config-tabela.ts
+++ b/scripts/orquestrador/config-tabela.ts
@@ -244,6 +244,13 @@ export const NOVAS: Nova[] = [
     porque:
       "executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.",
   },
+  {
+    chave: 'gate_ticket.severidade',
+    procedencia: 'politica',
+    valor: {},
+    porque:
+      "gate-ticket.ts:846 (lerSeveridade) e gate-ticket.ts:128 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.",
+  },
   {
     chave: 'gate_ticket.cmd_prefixos_permitidos',
     procedencia: 'politica',
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index cef5314..95699d7 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -62,12 +62,85 @@ export const TIPOS_CRITERIO = ['alvo', 'guarda', 'avaliador'] as const
 /** `231`, `001a`. Três dígitos, sufixo de letra opcional para o ticket enxertado. */
 export const RE_ID = /^\d{3}[a-z]?$/
 
+// ─── Severidade por regra (etapa 7d-1b) ───────────────────────────────────
+//
+// Cada regra do gate tem UMA severidade, nesta tabela, e o config pode
+// sobrescrevê-la (`gate_ticket.severidade`). `erro` é violação: muda o rc, e o
+// pré-voo em modo `bloqueia` bloqueia por ela. `aviso` sai na saída e nunca
+// bloqueia. `off` não é avaliada.
+//
+// A régua é a calibração de 25/09/2026 (`levantamento-7d1-calibracao.md` §5):
+// ERRO só com ZERO falso positivo nos done dos três repos (o comarka-operacional
+// é a régua mais madura da frota). Os números de cada linha são os FP em (a),
+// CI/Actus/Comarka, medidos pelo corpus (`test/fixtures/gate-corpus-7d1`).
+
+export type Severidade = 'erro' | 'aviso' | 'off'
+export const SEVERIDADES = ['erro', 'aviso', 'off'] as const
+
+export interface Regra {
+  severidade: Severidade
+  /** O que a regra olha, em uma linha. */
+  oque: string
+  /** Por que esta severidade: a medida que a decidiu. */
+  porque: string
+}
+
+/**
+ * A tabela única. `6a:<padrão>` é a linha de UM padrão de `proibido_no_cmd`;
+ * padrão sem linha própria cai em `6a`.
+ */
+export const REGRAS: Readonly<Record<string, Regra>> = {
+  '1': { severidade: 'erro', oque: 'bloco ```json parseável', porque: '0/0/0 FP; sem JSON o executor não lê o ticket' },
+  '2': { severidade: 'erro', oque: 'campo obrigatório de pendente', porque: 'CORRIGIR: 4/48/557 FP por risco e bloco, que o executor não lê' },
+  '3': { severidade: 'erro', oque: 'id no formato e igual ao prefixo do arquivo', porque: 'CORRIGIR: 0/0/23 FP por ids de fatiamento (407a0)' },
+  '4': { severidade: 'erro', oque: 'status no vocabulário', porque: '0/0/0 FP' },
+  '5t': { severidade: 'erro', oque: 'tipo do critério', porque: 'CORRIGIR: 4/48/535 FP por tipo ausente, todo inferível' },
+  '5c': { severidade: 'erro', oque: 'cmd do critério não vazio', porque: 'CORRIGIR: 0/0/192 FP por critério avaliador sem cmd' },
+  '5e': { severidade: 'erro', oque: 'espera do critério não vazia', porque: '0/0/0 FP' },
+  '6a': { severidade: 'erro', oque: 'padrão de proibido_no_cmd sem linha própria', porque: 'crase, eval, sudo, curl, wget: 0/0/0 FP; regra de segurança' },
+  '6a:$(': { severidade: 'off', oque: "'$(' fora da isenção do 1º segmento", porque: 'DESLIGAR: 54/7/74 FP, 0 causal; forma dominante de comparação numérica' },
+  '6a:rm ': { severidade: 'aviso', oque: "'rm ' no cmd", porque: '0/13/20 FP (rm -rf .next antes do build), 0 causal' },
+  '6a:bash': { severidade: 'aviso', oque: "'bash' no cmd", porque: '0/1/6 FP, 0 causal' },
+  '6a:sh -c': { severidade: 'aviso', oque: "'sh -c' no cmd", porque: '0/0/1 FP, 0 causal' },
+  '6r': { severidade: 'aviso', oque: 'redirecionamento que escreve arquivo', porque: 'CORRIGIR → AVISO: 0/3/48 FP, 0 causal' },
+  '6v': { severidade: 'aviso', oque: 'saída textual do vitest em pipe', porque: 'CORRIGIR → AVISO: 53/34/272 FP; causal 6, nunca chega a zero FP' },
+  '6q': { severidade: 'aviso', oque: 'grep -q recebendo pipe', porque: '0/12/83 FP; causal 4 (Actus); o dano é do pipefail do executor' },
+  '6b': { severidade: 'aviso', oque: 'objetivo cita caminho fora da allowlist', porque: '55/60/363 FP; causal 1 (488)' },
+  '7': { severidade: 'erro', oque: 'dependência é id da fila ou humano:<token> (C7, dependência órfã)', porque: '0/0/0 FP depois de conferir as 19 do snapshot' },
+  '8': { severidade: 'aviso', oque: 'allowlist sobreposta com outro pendente sem dependência', porque: 'CORRIGIR → AVISO: 3/15/119 FP, 0 causal' },
+  '9': { severidade: 'erro', oque: 'contexto_juiz existe na branch alvo e não está na allowlist', porque: '0/0/0 FP (só o Actus usa o campo)' },
+  '9w': { severidade: 'aviso', oque: 'contexto_juiz coberto por glob da allowlist', porque: 'o caso do 501: referência que o ticket pode editar' },
+  '10n': { severidade: 'aviso', oque: 'critério com regex sem exemplos_regex', porque: '56/45/499 FP, 0 causal; nenhum ticket anterior ao 624 declara exemplos' },
+  '10c': { severidade: 'erro', oque: '\\[ ou \\] dentro de classe [...]', porque: '0/0/0 FP (caso-origem 503)' },
+  '10x': { severidade: 'erro', oque: 'exemplos_regex contra o padrão do cmd', porque: 'CORRIGIR: 0/8/0 FP, todos das aspas escapadas e do grep -v' },
+}
+
+export function severidadePadrao(regra: string): Severidade {
+  const r = REGRAS[regra] ?? (regra.startsWith('6a:') ? REGRAS['6a'] : undefined)
+  return r?.severidade ?? 'erro'
+}
+
+/**
+ * A severidade que vale para a regra: a do config, se houver, senão a da tabela.
+ * Para `6a:<padrão>`: a linha do padrão no config, a da tabela, a linha `6a` do
+ * config, a `6a` da tabela — nessa ordem.
+ */
+export function severidadeDe(regra: string, cfg: GateCfg): Severidade {
+  const s = cfg.severidade ?? {}
+  if (s[regra]) return s[regra]!
+  if (REGRAS[regra]) return REGRAS[regra]!.severidade
+  if (regra.startsWith('6a:') && s['6a']) return s['6a']!
+  return severidadePadrao(regra)
+}
+
 // ─── Resultado ────────────────────────────────────────────────────────────
 
 export interface Violacao {
   arquivo: string
   campo: string
   mensagem: string
+  /** A regra da tabela `REGRAS` que produziu o achado (etapa 7d-1b). */
+  regra: string
   /** Isenção NÃO é violação: entra na saída para ser vista, mas não muda o rc. */
   isencao?: boolean
   /** Aviso NÃO é violação: sinal para quem escreve o ticket, não muda o rc. */
@@ -88,6 +161,11 @@ export interface GateCfg {
    * do check 10 (exemplos_regex, ticket 624). Ausente = 10 s.
    */
   timeout_cmd_secs?: number
+  /**
+   * `gate_ticket.severidade` do config (etapa 7d-1b): regra → erro|aviso|off,
+   * por cima da tabela `REGRAS`. Ausente = a tabela inteira.
+   */
+  severidade?: Record<string, Severidade>
 }
 
 /** O ticket como ele chega do disco: sem promessa nenhuma sobre os campos. */
@@ -280,6 +358,8 @@ function contemPadrao(visivel: string, padrao: string): boolean {
 
 export interface AchadoCmd {
   mensagem: string
+  /** `6a:<padrão>`, `6r`, `6v` ou `6q` (tabela `REGRAS`). */
+  regra: string
   isencao?: boolean
 }
 
@@ -379,28 +459,32 @@ export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
       if (isentavel && ISENTAVEIS.has(padrao)) {
         achados.push({
           mensagem: `ISENCAO '${padrao}' no segmento 1 pelo prefixo permitido '${prefixo}' — cmd: ${cmd}`,
+          regra: `6a:${padrao}`,
           isencao: true,
         })
         continue
       }
       const onde = i === 0 ? 'segmento 1' : `segmento ${i + 1} ('${seg}')`
-      achados.push({ mensagem: `padrão proibido '${padrao}' em ${onde} — cmd: ${cmd}` })
+      achados.push({ mensagem: `padrão proibido '${padrao}' em ${onde} — cmd: ${cmd}`, regra: `6a:${padrao}` })
     }
 
     for (const r of redirecionamentosProibidos(visivel)) {
       achados.push({
         mensagem: `redirecionamento '${r}' escreve arquivo (só 2>&1, >/dev/null e 2>/dev/null passam) — cmd: ${cmd}`,
+        regra: '6r',
       })
     }
   })
   if (saidaTextualDoVitest(cmd)) {
     achados.push({
       mensagem: `vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: ${cmd}`,
+      regra: '6v',
     })
   }
   for (const g of grepQuietoEmPipe(cmd)) {
     achados.push({
       mensagem: `grep -q em pipe ('${g}'): morre de SIGPIPE sob pipefail e a saída sai vazia com o trabalho verde (use grep -c ou grep -E com espera por regex) — cmd: ${cmd}`,
+      regra: '6q',
     })
   }
   return achados
@@ -657,19 +741,38 @@ export function casaExemplo(ex: ExemploRegex, texto: string, exec: ExecRegex): {
 
 /** Regras 1–5 do ticket 624 para UM critério. Devolve as mensagens de violação. */
 export function checarExemplosRegex(cmd: string, exemplosCru: unknown, exec: ExecRegex): string[] {
-  const msgs: string[] = []
+  return achadosExemplosRegex(cmd, exemplosCru, exec).map((a) => a.mensagem)
+}
+
+export interface AchadoRegex {
+  regra: '10n' | '10c' | '10x'
+  mensagem: string
+}
+
+/**
+ * O mesmo, com a regra de cada mensagem: `10n` (regex sem exemplos), `10c`
+ * (colchete escapado dentro de classe) e `10x` (exemplo contra o padrão).
+ */
+export function achadosExemplosRegex(
+  cmd: string,
+  exemplosCru: unknown,
+  exec: ExecRegex,
+): AchadoRegex[] {
+  const out: AchadoRegex[] = []
+  // Tudo que não é `10n` nem `10c` é `10x`: a mesma partição da calibração.
+  const msgs = { push: (mensagem: string, regra: AchadoRegex['regra'] = '10x') => out.push({ regra, mensagem }) }
   const padroes = padroesDoCmd(cmd)
   for (const p of padroes) {
     if (classeComColcheteEscapado(p.regex)) {
-      msgs.push(`regex '${p.regex}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`)
+      msgs.push(`regex '${p.regex}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`, '10c')
     }
   }
-  if (padroes.length === 0 && exemplosCru === undefined) return msgs
+  if (padroes.length === 0 && exemplosCru === undefined) return out
   if (!ehArray(exemplosCru) || exemplosCru.length === 0) {
     if (padroes.length > 0) {
-      msgs.push(`critério passa regex a ${padroes[0]!.ferramenta} e não declara exemplos_regex (lista de {regex, positivo, negativo})`)
+      msgs.push(`critério passa regex a ${padroes[0]!.ferramenta} e não declara exemplos_regex (lista de {regex, positivo, negativo})`, '10n')
     }
-    return msgs
+    return out
   }
   const exemplos: ExemploRegex[] = []
   exemplosCru.forEach((e, i) => {
@@ -691,7 +794,7 @@ export function checarExemplosRegex(cmd: string, exemplosCru: unknown, exec: Exe
   for (const e of exemplos) {
     if (!cmd.includes(e.regex)) msgs.push(`regex de exemplo '${e.regex}' não aparece literal no cmd`)
     if (classeComColcheteEscapado(e.regex)) {
-      msgs.push(`regex de exemplo '${e.regex}' tem \\[ ou \\] dentro de classe [...]`)
+      msgs.push(`regex de exemplo '${e.regex}' tem \\[ ou \\] dentro de classe [...]`, '10c')
     }
     const pos = casaExemplo(e, e.positivo, exec)
     if (pos.erro) msgs.push(`regex '${e.regex}' recusada: ${pos.erro}`)
@@ -699,7 +802,7 @@ export function checarExemplosRegex(cmd: string, exemplosCru: unknown, exec: Exe
     const neg = casaExemplo(e, e.negativo, exec)
     if (!neg.erro && neg.casa) msgs.push(`negativo '${e.negativo}' CASA '${e.regex}' (${e.ferramenta ?? 'grep'} ${e.flags ?? '-E'})`)
   }
-  return msgs
+  return out
 }
 
 export function lerFila(filaDir: string): TicketLido[] {
@@ -729,7 +832,33 @@ export function carregarCfg(filaDir: string): GateCfg {
       ? g.cmd_prefixos_permitidos.map(String)
       : [],
     ...(typeof g.timeout_cmd_secs === 'number' && g.timeout_cmd_secs > 0 ? { timeout_cmd_secs: g.timeout_cmd_secs } : {}),
+    ...(g.severidade !== undefined ? { severidade: lerSeveridade(g.severidade, p) } : {}),
+  }
+}
+
+/**
+ * `gate_ticket.severidade`: objeto regra → erro|aviso|off. Valor fora do
+ * vocabulário ou regra que a tabela não conhece é falha ALTA (GateNaoRodou, rc
+ * 2): um erro de digitação ('6Q', 'avsio') que o gate engolisse deixaria a regra
+ * na severidade da tabela sem ninguém saber. Chave que começa com `_` é
+ * comentário, como no resto do config.
+ */
+export function lerSeveridade(cru: unknown, origem: string): Record<string, Severidade> {
+  if (!cru || typeof cru !== 'object' || Array.isArray(cru)) {
+    throw new GateNaoRodou(`${origem}: gate_ticket.severidade não é objeto (regra -> ${SEVERIDADES.join('|')})`)
   }
+  const out: Record<string, Severidade> = {}
+  for (const [regra, v] of Object.entries(cru as Record<string, unknown>)) {
+    if (regra.startsWith('_')) continue
+    if (!REGRAS[regra] && !/^6a:.+/.test(regra)) {
+      throw new GateNaoRodou(`${origem}: gate_ticket.severidade.${regra}: regra desconhecida (${Object.keys(REGRAS).join(', ')}, ou 6a:<padrão>)`)
+    }
+    if (typeof v !== 'string' || !(SEVERIDADES as readonly string[]).includes(v)) {
+      throw new GateNaoRodou(`${origem}: gate_ticket.severidade.${regra}='${String(v)}' não é ${SEVERIDADES.join('|')}`)
+    }
+    out[regra] = v as Severidade
+  }
+  return out
 }
 
 /**
@@ -739,12 +868,20 @@ export function carregarCfg(filaDir: string): GateCfg {
 export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg): Violacao[] {
   const v: Violacao[] = []
   const arq = basename(alvo.arquivo)
-  const erro = (campo: string, mensagem: string) => v.push({ arquivo: arq, campo, mensagem })
+  // Todo achado passa por aqui: a tabela `REGRAS`, por cima dela o config,
+  // decidem se ele é violação, aviso ou nada (etapa 7d-1b).
+  const achado = (regra: string, campo: string, mensagem: string, isencao = false) => {
+    const sev = severidadeDe(regra, cfg)
+    if (sev === 'off') return
+    if (isencao) v.push({ arquivo: arq, campo, mensagem, regra, isencao: true })
+    else if (sev === 'aviso') v.push({ arquivo: arq, campo, mensagem, regra, aviso: true })
+    else v.push({ arquivo: arq, campo, mensagem, regra })
+  }
 
   // 1. bloco ```json parseável.
   if (!alvo.json) {
     const r = blocoJson(readFileSync(alvo.arquivo, 'utf8'))
-    erro('json', r.ok ? 'bloco ```json ilegível' : r.motivo)
+    achado('1', 'json', r.ok ? 'bloco ```json ilegível' : r.motivo)
     return v // sem JSON não há o que checar depois: fail-fast de verdade.
   }
   const t = alvo.json
@@ -760,7 +897,7 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       // existir e ser lista, nada além.
       if (campo === 'dependencias') {
         if (!ehArray(t.dependencias)) {
-          erro(campo, 'campo obrigatório de ticket pendente ausente ou não é lista')
+          achado('2', campo, 'campo obrigatório de ticket pendente ausente ou não é lista')
         }
         continue
       }
@@ -770,29 +907,29 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       // ter feito o que o próprio gate ainda não faz.
       if (campo === 'risco') {
         if (t.risco === undefined || t.risco === null) {
-          erro(campo, 'campo obrigatório de ticket pendente ausente')
+          achado('2', campo, 'campo obrigatório de ticket pendente ausente')
         } else if (typeof t.risco === 'string' && t.risco !== '' && t.risco !== 'baixo' && t.risco !== 'alto') {
-          erro(campo, `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
+          achado('2', campo, `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
         }
         continue
       }
-      if (vazio(t[campo])) erro(campo, 'campo obrigatório de ticket pendente ausente ou vazio')
+      if (vazio(t[campo])) achado('2', campo, 'campo obrigatório de ticket pendente ausente ou vazio')
     }
   }
 
   // 3. `id` no formato e igual ao prefixo do nome do arquivo.
   const id = typeof t.id === 'string' ? t.id : ''
   if (!RE_ID.test(id)) {
-    erro('id', `'${id}' fora do formato NNN[a] (três dígitos, letra opcional)`)
+    achado('3', 'id', `'${id}' fora do formato NNN[a] (três dígitos, letra opcional)`)
   }
   const prefixoArquivo = /^(\d{3}[a-z]?)-/.exec(arq)?.[1] ?? ''
   if (id && prefixoArquivo && id !== prefixoArquivo) {
-    erro('id', `'${id}' não bate com o prefixo do nome do arquivo ('${prefixoArquivo}')`)
+    achado('3', 'id', `'${id}' não bate com o prefixo do nome do arquivo ('${prefixoArquivo}')`)
   }
 
   // 4. `status` dentro do vocabulário.
   if (!(STATUS_VALIDOS as readonly string[]).includes(status)) {
-    erro('status', `'${status}' não é status de fila (${STATUS_VALIDOS.join(', ')})`)
+    achado('4', 'status', `'${status}' não é status de fila (${STATUS_VALIDOS.join(', ')})`)
   }
 
   // 5 e 6 só em ticket pendente: é o que ainda vai rodar. Critério de ticket
@@ -803,18 +940,18 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       const cr = (c ?? {}) as Cru
       const tipo = typeof cr.tipo === 'string' ? cr.tipo : ''
       if (!(TIPOS_CRITERIO as readonly string[]).includes(tipo)) {
-        erro(campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
+        achado('5t', campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
       }
-      if (vazio(cr.cmd)) erro(campo, 'cmd vazio')
-      if (vazio(cr.espera)) erro(campo, 'espera vazia')
+      if (vazio(cr.cmd)) achado('5c', campo, 'cmd vazio')
+      if (vazio(cr.espera)) achado('5e', campo, 'espera vazia')
 
       if (typeof cr.cmd === 'string' && cr.cmd.trim() !== '') {
-        for (const a of checarCmd(cr.cmd, cfg)) {
-          v.push(a.isencao ? { arquivo: arq, campo, mensagem: a.mensagem, isencao: true } : { arquivo: arq, campo, mensagem: a.mensagem })
-        }
+        // A isenção do `$(` segue a linha do padrão: `6a:$(` desligada não
+        // isenta nem acusa.
+        for (const a of checarCmd(cr.cmd, cfg)) achado(a.regra, campo, a.mensagem, a.isencao === true)
         // 10. regex do critério contra os exemplos declarados (ticket 624).
-        for (const m of checarExemplosRegex(cr.cmd, cr.exemplos_regex, execRegexPadrao(cfg))) {
-          erro(`${campo}.exemplos_regex`, m)
+        for (const a of achadosExemplosRegex(cr.cmd, cr.exemplos_regex, execRegexPadrao(cfg))) {
+          achado(a.regra, `${campo}.exemplos_regex`, a.mensagem)
         }
       }
     })
@@ -824,12 +961,11 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
   if (pendente && typeof t.objetivo === 'string' && ehArray(t.pathspec_allowlist)) {
     const fora = caminhosForaDaAllowlist(t.objetivo, t.pathspec_allowlist.map(String))
     if (fora.length > 0) {
-      v.push({
-        arquivo: arq,
-        campo: 'objetivo',
-        mensagem: `AVISO: o objetivo cita caminho(s) fora da allowlist: ${fora.join(', ')} (se é para EDITAR, falta na allowlist; se é só para ler, ignore)`,
-        aviso: true,
-      })
+      achado(
+        '6b',
+        'objetivo',
+        `AVISO: o objetivo cita caminho(s) fora da allowlist: ${fora.join(', ')} (se é para EDITAR, falta na allowlist; se é só para ler, ignore)`,
+      )
     }
   }
 
@@ -840,11 +976,11 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       const dep = String(d)
       if (dep.startsWith('humano:')) {
         if (dep.slice('humano:'.length).trim() === '') {
-          erro(`dependencias[${i}]`, "'humano:' sem token")
+          achado('7', `dependencias[${i}]`, "'humano:' sem token")
         }
         return
       }
-      if (!ids.has(dep)) erro(`dependencias[${i}]`, `'${dep}' não é id de ticket da fila nem 'humano:<token>'`)
+      if (!ids.has(dep)) achado('7', `dependencias[${i}]`, `'${dep}' não é id de ticket da fila nem 'humano:<token>'`)
     })
   }
 
@@ -863,7 +999,8 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       if (comuns.length === 0) continue
       const depsDele = ehArray(o.dependencias) ? o.dependencias.map(String) : []
       if (minhasDeps.includes(o.id) || depsDele.includes(id)) continue
-      erro(
+      achado(
+        '8',
         'pathspec_allowlist',
         `sobrepõe o ${o.id} sem dependência declarada entre os dois: ${comuns.join(', ')}`,
       )
@@ -871,7 +1008,7 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
   }
 
   // 9. contexto_juiz — só em ticket pendente, como 5–8: é o que ainda vai rodar.
-  if (pendente) v.push(...checarContextoJuiz(alvo, cfg))
+  if (pendente) for (const c of checarContextoJuiz(alvo, cfg)) achado(c.regra, c.campo, c.mensagem)
 
   return v
 }
@@ -901,23 +1038,24 @@ function checarContextoJuiz(alvo: TicketLido, cfg: GateCfg): Violacao[] {
   const v: Violacao[] = []
   const ctx = t.contexto_juiz
   if (!Array.isArray(ctx) || ctx.some((c) => typeof c !== 'string' || c.trim() === '')) {
-    v.push({ arquivo: arq, campo: 'contexto_juiz', mensagem: 'não é lista de strings não-vazias (caminhos de repo)' })
+    v.push({ arquivo: arq, campo: 'contexto_juiz', regra: '9', mensagem: 'não é lista de strings não-vazias (caminhos de repo)' })
     return v
   }
   const allow = ehArray(t.pathspec_allowlist) ? t.pathspec_allowlist.map(String) : []
   ;(ctx as string[]).forEach((c, i) => {
     const campo = `contexto_juiz[${i}]`
     if (!cfg.branch_alvo) {
-      v.push({ arquivo: arq, campo, mensagem: `sem branch_alvo no 000-config.json para conferir que '${c}' existe` })
+      v.push({ arquivo: arq, campo, regra: '9', mensagem: `sem branch_alvo no 000-config.json para conferir que '${c}' existe` })
     } else if (!existeNaBranch(dirname(alvo.arquivo), cfg.branch_alvo, c)) {
-      v.push({ arquivo: arq, campo, mensagem: `'${c}' não existe na branch alvo '${cfg.branch_alvo}'` })
+      v.push({ arquivo: arq, campo, regra: '9', mensagem: `'${c}' não existe na branch alvo '${cfg.branch_alvo}'` })
     }
     if (allow.includes(c)) {
-      v.push({ arquivo: arq, campo, mensagem: `'${c}' está na pathspec_allowlist do próprio ticket: arquivo editado chega ao juiz pelo diff, não como referência` })
+      v.push({ arquivo: arq, campo, regra: '9', mensagem: `'${c}' está na pathspec_allowlist do próprio ticket: arquivo editado chega ao juiz pelo diff, não como referência` })
     } else if (allow.some((g) => globToRegExp(g).test(c))) {
       v.push({
         arquivo: arq,
         campo,
+        regra: '9w',
         mensagem: `AVISO: '${c}' é coberto por glob da pathspec_allowlist — se o ticket puder editá-lo, a referência (estado na base) e o diff vão divergir`,
         aviso: true,
       })
@@ -968,7 +1106,17 @@ function main(argv: string[]): number {
   }
 
   const fila = lerFila(filaDir)
-  const cfg = carregarCfg(filaDir)
+  let cfg: GateCfg
+  try {
+    cfg = carregarCfg(filaDir)
+  } catch (e) {
+    // Config de severidade inválido é falha ALTA, como check que não rodou.
+    if (e instanceof GateNaoRodou) {
+      process.stderr.write(`gate-ticket: ${e.message}\n`)
+      return 2
+    }
+    throw e
+  }
 
   let alvos: TicketLido[]
   if (pendentes) {
@@ -1014,7 +1162,7 @@ function main(argv: string[]): number {
       const meus = achados.filter((a) => a.arquivo === arq)
       const erros = meus.filter((a) => !a.isencao && !a.aviso)
       process.stdout.write(`${arq}  ${erros.length === 0 ? 'OK' : `${erros.length} violação(ões)`}\n`)
-      for (const a of meus) process.stdout.write(`  ${arq}:${a.campo} ${a.mensagem}\n`)
+      for (const a of meus) process.stdout.write(`  ${linha(a)}\n`)
     }
     const isencoes = achados.filter((a) => a.isencao).length
     const avisos = achados.filter((a) => a.aviso).length
@@ -1022,10 +1170,20 @@ function main(argv: string[]): number {
     return 0
   }
 
-  for (const a of soViolacoes ? violacoes : achados) process.stdout.write(`${a.arquivo}:${a.campo} ${a.mensagem}\n`)
+  for (const a of soViolacoes ? violacoes : achados) process.stdout.write(`${linha(a)}\n`)
   return violacoes.length > 0 ? 1 : 0
 }
 
+/**
+ * `<arquivo>:<campo> <mensagem>`. Achado rebaixado a aviso pela tabela de
+ * severidade ganha o prefixo `AVISO:` que as regras que já nasceram aviso (6b,
+ * 9w) trazem no texto: na saída sem --relatorio, é o que o separa de violação.
+ */
+function linha(a: Violacao): string {
+  const prefixo = a.aviso && !a.mensagem.startsWith('AVISO') ? `AVISO (${a.regra}): ` : ''
+  return `${a.arquivo}:${a.campo} ${prefixo}${a.mensagem}`
+}
+
 // `import.meta.url` só bate com o argv quando o arquivo foi CHAMADO, não
 // importado: é o que deixa o teste importar as funções sem disparar a CLI.
 //
diff --git a/scripts/orquestrador/test-gate-prevoo.sh b/scripts/orquestrador/test-gate-prevoo.sh
index d29391e..8942c71 100644
--- a/scripts/orquestrador/test-gate-prevoo.sh
+++ b/scripts/orquestrador/test-gate-prevoo.sh
@@ -23,6 +23,14 @@
 #       GATE_TICKET_AVISO na trilha;
 #   6 · chave gate_ticket.modo_pre_voo ausente: vale 'aviso', dito no log;
 #   7 · valor desconhecido: falha alta.
+#   8 · etapa 7d-1b: modo 'bloqueia' com ticket que só tem AVISO pela tabela de
+#       severidade (grep -q em pipe e vitest por texto, rebaixados pela
+#       calibração de 25/09): executa, nada bloqueia.
+#
+# Etapa 7d-1b: o RUIM dos casos 1, 3 e 5 era o critério com `| grep -q` e saída
+# textual do vitest. As duas regras viraram AVISO (calibração), e o ticket com
+# elas não bloqueia mais — é o caso 8. O RUIM passou a ter uma regra que segue
+# ERRO (`eval`), e as asserções dos casos 1 e 5 procuram essa violação.
 #
 # Uso: bash scripts/orquestrador/test-gate-prevoo.sh
 
@@ -72,7 +80,8 @@ ticket() {
 TICKET
 }
 
-RUIM='node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok'
+RUIM='test -f src/a901.ts && eval "echo ok"'
+SO_AVISO='node_modules/.bin/vitest run visao 2>&1 | grep -qE "[1-9] passed" && echo ok'
 BOM='test -f src/a902.ts && echo ok'
 
 # fixture_repo [modo] — o modo vai para gate_ticket.modo_pre_voo: 'bloqueia' (o
@@ -126,7 +135,7 @@ drive() {
   ORQ_EXEC_ROOT="$1" EXECUTOR_SOURCED=1 AQUI_T="$AQUI" TID_T="$2" bash -c "$STUB_EXECUTOR" 2>&1
 }
 
-echo "== 1 · critério com '| grep -q' em pipe: bloqueia ANTES da worktree =="
+echo "== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree =="
 fx="$(fixture_repo)"
 if [ -z "$fx" ]; then
   falha "não consegui montar o fixture"
@@ -137,7 +146,7 @@ else
     && falha "o ticket 901 foi EXECUTADO com critério inválido" || ok "o ticket 901 não foi executado"
   [ "$(campo "$f901" '.status')" = bloqueado ] \
     && ok "status bloqueado" || falha "status=$(campo "$f901" '.status') (esperado bloqueado)"
-  campo "$f901" '.notas_status' | grep -q "grep -q em pipe" \
+  campo "$f901" '.notas_status' | grep -q "padrão proibido 'eval'" \
     && ok "a nota lista a violação" || falha "nota sem a violação: $(campo "$f901" '.notas_status')"
   campo "$f901" '.notas_status' | grep -q "AVISO" \
     && falha "a nota trouxe AVISO junto com a violação" || ok "a nota não mistura aviso"
@@ -225,7 +234,7 @@ else
     && ok "status não é bloqueado" || falha "status=bloqueado em modo aviso"
   grep -qE ' 901 GATE_TICKET_AVISO violacoes=[1-9]' "$fx/docs/fila/runs/events.log" 2>/dev/null \
     && ok "evento GATE_TICKET_AVISO na trilha" || falha "sem GATE_TICKET_AVISO: $(grep ' 901 ' "$fx/docs/fila/runs/events.log" 2>/dev/null | head -3)"
-  printf '%s\n' "$s5" | grep -q "grep -q em pipe" \
+  printf '%s\n' "$s5" | grep -q "padrão proibido 'eval'" \
     && ok "o log lista a violação" || falha "o log não lista a violação"
   rm -rf "$(dirname "$fx")"
 fi
@@ -266,6 +275,24 @@ else
   rm -rf "$(dirname "$fx")"
 fi
 
+echo
+echo "== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa =="
+fx="$(fixture_repo)"
+if [ -z "$fx" ]; then
+  falha "não consegui montar o fixture"
+else
+  ticket "$fx" 903 "$SO_AVISO" "escreve src/a903.ts"
+  (cd "$fx" && git add -A && git -c user.email=t@t -c user.name=t commit -qm t903) >/dev/null 2>&1
+  s8="$(drive "$fx" 903)"
+  printf '%s\n' "$s8" | grep -q "ENTRADA 903" \
+    && ok "o 903 foi executado (grep -q e vitest por texto são aviso)" || falha "o 903 não executou: $(printf '%s' "$s8" | tail -3)"
+  [ "$(campo "$fx/docs/fila/903-t.md" '.status')" != bloqueado ] \
+    && ok "status não é bloqueado" || falha "status=bloqueado por regra de AVISO: $(campo "$fx/docs/fila/903-t.md" '.notas_status')"
+  grep -q ' 903 BLOQUEADO' "$fx/docs/fila/runs/events.log" 2>/dev/null \
+    && falha "a trilha tem BLOQUEADO do 903" || ok "a trilha não tem BLOQUEADO do 903"
+  rm -rf "$(dirname "$fx")"
+fi
+
 echo
 if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
 echo "$FALHAS CHECK(S) FALHARAM"; exit 1
diff --git a/test/orquestrador-gate-severidade.test.ts b/test/orquestrador-gate-severidade.test.ts
new file mode 100644
index 0000000..ca96d43
--- /dev/null
+++ b/test/orquestrador-gate-severidade.test.ts
@@ -0,0 +1,211 @@
+/**
+ * Etapa 7d-1b, peça 2 — severidade por regra no gate de ticket.
+ *
+ * Cada regra tem UMA severidade (erro, aviso, off) numa tabela única
+ * (`REGRAS` no gate-ticket.ts), e o config sobrescreve por
+ * `gate_ticket.severidade`. A tabela aplica a decisão da calibração de 25/09
+ * (`levantamento-7d1-calibracao.md` §5): ERRO só com zero falso positivo nos
+ * done dos três repos. O pré-voo em modo `bloqueia` bloqueia só por ERRO, porque
+ * o rc do gate só conta ERRO.
+ *
+ * O gate é importado como namespace: antes da peça 2 `REGRAS` não existe, e o
+ * teste falha por ASSERÇÃO (undefined contra a tabela), não por import.
+ */
+import { describe, it, expect } from 'vitest';
+import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import * as gate from '../scripts/orquestrador/gate-ticket.js';
+import { propor } from '../scripts/orquestrador/migrar-config.js';
+import { FX_CHECKOUT, REPO_ROOT } from './fixtures/orq-harness.js';
+
+const CFG_REAL = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
+const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
+const GATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
+
+type Achado = gate.Violacao & { regra?: string };
+
+/** Fila num tmp com o config do fixture (mais o `severidade` pedido) e UM ticket. */
+function fila(cmd: string, severidade?: Record<string, unknown>, extra: Record<string, unknown> = {}): string {
+  const dir = mkdtempSync(join(tmpdir(), 'orq-sev-'));
+  const cfg = structuredClone(CFG_REAL);
+  if (severidade !== undefined) cfg.gate_ticket.severidade = severidade;
+  writeFileSync(join(dir, '000-config.json'), JSON.stringify(cfg, null, 2));
+  const t = {
+    id: '901',
+    slug: 'sev',
+    bloco: 'B1',
+    risco: '',
+    objetivo: 'escreve src/a.ts',
+    pathspec_allowlist: ['src/a.ts'],
+    dependencias: [],
+    status: 'pendente',
+    criterios_aceite: [{ tipo: 'alvo', descricao: 'c', cmd, espera: 'ok' }],
+    ...extra,
+  };
+  writeFileSync(join(dir, '901-sev.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
+  return dir;
+}
+
+function achados(dir: string): Achado[] {
+  const f = gate.lerFila(dir);
+  return gate.validarTicket(f[0]!, f, gate.carregarCfg(dir)) as Achado[];
+}
+
+const erros = (a: Achado[]) => a.filter((x) => !x.aviso && !x.isencao);
+const avisos = (a: Achado[]) => a.filter((x) => x.aviso);
+
+function cli(dir: string, ...args: string[]) {
+  const r = spawnSync(TSX, [GATE, '--fila', dir, ...args], { encoding: 'utf8' });
+  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
+}
+
+describe('7d1b-2 · a tabela única', () => {
+  it('a tabela aplica a decisão da calibração, regra a regra', () => {
+    const sev = Object.fromEntries(Object.entries(gate.REGRAS ?? {}).map(([k, r]) => [k, r.severidade]));
+    expect(sev).toEqual({
+      '1': 'erro',
+      '2': 'erro',
+      '3': 'erro',
+      '4': 'erro',
+      '5t': 'erro',
+      '5c': 'erro',
+      '5e': 'erro',
+      '6a': 'erro',
+      '6a:$(': 'off',
+      '6a:rm ': 'aviso',
+      '6a:bash': 'aviso',
+      '6a:sh -c': 'aviso',
+      '6r': 'aviso',
+      '6v': 'aviso',
+      '6q': 'aviso',
+      '6b': 'aviso',
+      '7': 'erro',
+      '8': 'aviso',
+      '9': 'erro',
+      '9w': 'aviso',
+      '10n': 'aviso',
+      '10c': 'erro',
+      '10x': 'erro',
+    });
+  });
+
+  it('todo achado diz de que regra veio', () => {
+    const a = achados(fila("npx vitest run a 2>&1 | grep -q passed && rm -rf x && eval ls && echo `ls`"));
+    expect(a.length).toBeGreaterThan(0);
+    expect(a.filter((x) => !x.regra).map((x) => x.mensagem)).toEqual([]);
+  });
+});
+
+describe('7d1b-2 · o que cada severidade faz', () => {
+  it("DESLIGAR: `$(` fora da isenção não acusa nada (54/7/74 FP, 0 causal)", () => {
+    const a = achados(fila('test -f src/a.ts && test $(grep -c x src/a.ts) -ge 1 && echo ok'));
+    expect(a.filter((x) => x.mensagem.includes("'$('"))).toEqual([]);
+  });
+
+  it('AVISO: `rm `, `bash` e `sh -c` saem como aviso, nunca como violação', () => {
+    for (const cmd of ['rm -rf .next && npm run build >/dev/null 2>&1 && echo ok', 'bash scripts/x.sh && echo ok', "sh -c 'ls' && echo ok"]) {
+      const a = achados(fila(cmd));
+      expect(erros(a).map((x) => x.mensagem), cmd).toEqual([]);
+      expect(avisos(a).some((x) => x.mensagem.startsWith('padrão proibido')), cmd).toBe(true);
+    }
+  });
+
+  it('ERRO: crase, eval, sudo, curl e wget seguem violação', () => {
+    for (const cmd of ['echo `ls`', 'eval ls', 'sudo ls', 'curl https://x.y', 'wget http://x.y']) {
+      expect(erros(achados(fila(cmd))).some((x) => x.mensagem.startsWith('padrão proibido')), cmd).toBe(true);
+    }
+  });
+
+  it('AVISO: grep -q em pipe (6q) e saída textual do vitest (6v)', () => {
+    const a = achados(fila('npx vitest run a 2>&1 | grep -q passed && echo ok'));
+    expect(erros(a).map((x) => x.mensagem)).toEqual([]);
+    expect(avisos(a).map((x) => x.regra).sort()).toEqual(['6q', '6v']);
+  });
+
+  it('AVISO: redirecionamento para arquivo (6r) e regex sem exemplos (10n)', () => {
+    const r = achados(fila('npm run build > build.log 2>&1 && echo ok'));
+    expect(erros(r).map((x) => x.mensagem)).toEqual([]);
+    expect(avisos(r).map((x) => x.regra)).toContain('6r');
+    const n = achados(fila("grep -cE 'a|b' src/a.ts"));
+    expect(erros(n).map((x) => x.mensagem)).toEqual([]);
+    expect(avisos(n).map((x) => x.regra)).toContain('10n');
+  });
+
+  it('AVISO: allowlist sobreposta com outro pendente (8)', () => {
+    const dir = fila('test -f src/a.ts && echo ok');
+    const t = readFileSync(join(dir, '901-sev.md'), 'utf8').replaceAll('"901"', '"902"').replace('# 901', '# 902');
+    writeFileSync(join(dir, '902-sev.md'), t);
+    const a = achados(dir);
+    expect(erros(a).map((x) => x.mensagem)).toEqual([]);
+    expect(avisos(a).map((x) => x.regra)).toEqual(['8']);
+  });
+});
+
+describe('7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade)', () => {
+  it('aviso vira erro, erro vira off, e o 6a:$( volta a acusar com a isenção de volta', () => {
+    const dir = fila('test -f src/a.ts && test $(grep -c x src/a.ts) -ge 1 && npx vitest run a | grep -q passed', {
+      '6q': 'erro',
+      '6a:$(': 'erro',
+      '4': 'off',
+    }, { status: 'pendente' });
+    const a = achados(dir);
+    expect(erros(a).map((x) => x.regra).sort()).toEqual(['6a:$(', '6q']);
+    const iso = achados(fila("test $(grep -c 'it(' f.ts) -ge 8 && echo ok", { '6a:$(': 'aviso' }));
+    expect(iso.filter((x) => x.isencao).map((x) => x.regra)).toEqual(['6a:$(']);
+  });
+
+  it('regra com severidade off não aparece nem com --relatorio', () => {
+    const dir = fila('npx vitest run a 2>&1 | grep -q passed && echo ok', { '6q': 'off', '6v': 'off' });
+    expect(achados(dir)).toEqual([]);
+  });
+
+  it('valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio', () => {
+    const ruim = cli(fila('test -f src/a.ts && echo ok', { '6q': 'avsio' }), '--pendentes');
+    expect(ruim.rc).toBe(2);
+    expect(ruim.err).toMatch(/gate_ticket\.severidade\.6q='avsio'/);
+    const desconhecida = cli(fila('test -f src/a.ts && echo ok', { '6Q': 'erro' }), '--pendentes');
+    expect(desconhecida.rc).toBe(2);
+    expect(desconhecida.err).toMatch(/gate_ticket\.severidade\.6Q: regra desconhecida/);
+    expect(cli(fila('test -f src/a.ts && echo ok', { _nota: 'comentário', '6a:wget': 'aviso' }), '--pendentes').rc).toBe(0);
+  });
+});
+
+describe('7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO', () => {
+  const SO_AVISO = 'npx vitest run a 2>&1 | grep -q passed && echo ok';
+
+  it('ticket só com avisos: rc 0, e --violacoes não imprime nada', () => {
+    const dir = fila(SO_AVISO);
+    expect(cli(dir, '--pendentes').rc).toBe(0);
+    const v = cli(dir, '--violacoes', '--pendentes');
+    expect(v.rc).toBe(0);
+    expect(v.out.trim()).toBe('');
+  });
+
+  it('a saída sem --relatorio marca o aviso rebaixado, para não passar por violação', () => {
+    const out = cli(fila(SO_AVISO), '--pendentes').out;
+    expect(out).toMatch(/^901-sev\.md:criterios_aceite\[0\] AVISO \(6q\): grep -q em pipe/m);
+  });
+
+  it('o mesmo ticket com 6q em erro pelo config: rc 1 e a linha na saída de --violacoes', () => {
+    const v = cli(fila(SO_AVISO, { '6q': 'erro' }), '--violacoes', '--pendentes');
+    expect(v.rc).toBe(1);
+    expect(v.out).toMatch(/^901-sev\.md:criterios_aceite\[0\] grep -q em pipe/m);
+  });
+});
+
+describe('7d1b-2 · a chave chega aos repos pelo migrar-config e pelo template', () => {
+  it('migrar: config sem gate_ticket.severidade ganha {} (vale a tabela); com a chave, nada muda', () => {
+    const sem = JSON.parse(propor({ $schema_versao: 2, gates: [], gate_ticket: { proibido_no_cmd: [] } }).proposto);
+    expect(sem.gate_ticket.severidade).toEqual({});
+    const com = JSON.parse(propor({ $schema_versao: 2, gates: [], gate_ticket: { severidade: { '6q': 'erro' } } }).proposto);
+    expect(com.gate_ticket.severidade).toEqual({ '6q': 'erro' });
+  });
+
+  it('o template traz a chave vazia, e ela passa pela validação do gate', () => {
+    const tpl = JSON.parse(readFileSync(join(REPO_ROOT, 'doutrina', 'templates', 'config.json'), 'utf8'));
+    expect(tpl.gate_ticket.severidade).toEqual({});
+    expect(gate.lerSeveridade(tpl.gate_ticket.severidade, 'template')).toEqual({});
+  });
+});
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
index 247eee2..9a3a0f2 100644
--- a/test/orquestrador-gate-ticket.test.ts
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -357,13 +357,21 @@ describe('check 6 · o veto, a isenção e o que a isenção NÃO alcança', ()
     expect(checarCmd("grep -c 'form ' src/a.ts", cfg).filter((a) => !a.isencao)).toEqual([]);
   });
 
-  it('regra (d): a isenção chega ao ticket, nomeando o critério e o prefixo', () => {
-    const dir = criarFila([
-      pendenteBom({
-        id: '901',
-        criterios_aceite: [{ tipo: 'alvo', cmd: "test $(grep -c 'it(' f.ts) -ge 8 && echo ok", espera: 'ok' }],
-      }),
-    ]);
+  // Etapa 7d-1b: a linha `6a:$(` nasce DESLIGADA (calibração: 54/7/74 FP, 0
+  // causal), e desligada ela não acusa nem isenta. Ligada pelo config, a regra
+  // (d) volta inteira: a isenção chega ao ticket com o prefixo.
+  it('regra (d): a isenção chega ao ticket, nomeando o critério e o prefixo (com 6a:$( ligada)', () => {
+    const ticket = pendenteBom({
+      id: '901',
+      criterios_aceite: [{ tipo: 'alvo', cmd: "test $(grep -c 'it(' f.ts) -ge 8 && echo ok", espera: 'ok' }],
+    });
+    const desligada = criarFila([ticket]);
+    expect(violacoes(desligada, '901')).toEqual([]);
+    expect(isencoes(desligada, '901')).toEqual([]);
+    const dir = criarFila([ticket]);
+    const cfg = JSON.parse(CFG_REAL);
+    cfg.gate_ticket.severidade = { '6a:$(': 'erro' };
+    writeFileSync(join(dir, '000-config.json'), JSON.stringify(cfg));
     expect(violacoes(dir, '901')).toEqual([]);
     const i = isencoes(dir, '901');
     expect(i).toHaveLength(1);
diff --git a/test/orquestrador-gate-vitest-aviso.test.ts b/test/orquestrador-gate-vitest-aviso.test.ts
index c9e9c3a..4a42c05 100644
--- a/test/orquestrador-gate-vitest-aviso.test.ts
+++ b/test/orquestrador-gate-vitest-aviso.test.ts
@@ -52,10 +52,12 @@ describe('(a) saída textual do vitest reprova', () => {
     expect(saidaTextualDoVitest(cmd)).toBe(false);
   });
 
-  it('entra no validar como violação do critério', () => {
+  // Etapa 7d-1b: a regra (6v) virou AVISO pela calibração de 25/09 (53/34/272
+  // FP nos done). A asserção segue exigindo o achado, agora com a marca de aviso.
+  it('entra no validar como aviso do critério (regra 6v)', () => {
     const fila = lerFila(FILA);
     const v = validar(fila.filter((t) => t.arquivo.includes('903-')), fila, CFG);
-    expect(v.some((x) => !x.aviso && x.campo.startsWith('criterios_aceite') && /vitest: saída textual/.test(x.mensagem))).toBe(true);
+    expect(v.some((x) => x.aviso && x.regra === '6v' && x.campo.startsWith('criterios_aceite') && /vitest: saída textual/.test(x.mensagem))).toBe(true);
   });
 });
 
~~~~

### fe505ce 7d1b-3a: check 2 sem bloco e sem risco obrigatórios; criterios_aceite ausente vira a regra 2c (aviso)

~~~~diff
commit fe505ce5c2fdf6f7cf2989b7fda929b1e0eb0be2
Author: Lucas Santos
Date: Fri Sep 25 12:07:47 2026 -0300

7d1b-3a: check 2 sem bloco e sem risco obrigatórios; criterios_aceite ausente vira a regra 2c (aviso)

Calibração: o check 2 marcava 4/48/557 done por risco (609 tickets) e bloco
(461), que o executor não lê. Com os dois opcionais sobra 1 done no Comarka
(346a-lib-periodo-compartilhada, sem criterios_aceite), que rodou e fechou:
o executor roda ticket sem critério. Esse caso vai para a regra 2c, aviso, e
o 2 fica com 0/0/0 FP e segue ERRO. risco presente continua tendo de ser
classe de risco.

Testes antigos com asserção de mesma força: 'risco ausente' passa de
violação a lista vazia; a lista de CAMPOS_PENDENTE sem bloco e risco.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts       | 33 +++++++-----
 test/orquestrador-gate-correcoes.test.ts  | 85 +++++++++++++++++++++++++++++++
 test/orquestrador-gate-severidade.test.ts |  1 +
 test/orquestrador-gate-ticket.test.ts     | 12 +++--
 4 files changed, 112 insertions(+), 19 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 95699d7..11d961d 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -44,17 +44,24 @@ export const STATUS_VALIDOS = [
  */
 export const STATUS_TERMINAIS = ['done', 'obsoleto', 'bloqueado'] as const
 
-/** Campos que um ticket `pendente` PRECISA ter para o executor poder lê-lo. */
+/**
+ * Campos que um ticket `pendente` PRECISA ter para o executor poder lê-lo.
+ *
+ * Etapa 7d-1b: `bloco` e `risco` saíram. Nenhum dos dois é lido pelo executor,
+ * e cobrá-los marcava 4/48/557 done (CI/Actus/Comarka) na calibração de 25/09
+ * — 609 tickets sem `risco`, 461 sem `bloco`. `risco` presente continua tendo de
+ * ser classe de risco. `criterios_aceite` segue na lista, mas ausente ou vazio é
+ * a regra `2c` (aviso): o executor roda ticket sem critério (o juiz decide), e o
+ * Comarka tem um done assim (346a).
+ */
 export const CAMPOS_PENDENTE = [
   'id',
   'slug',
-  'bloco',
   'objetivo',
   'pathspec_allowlist',
   'dependencias',
   'criterios_aceite',
   'status',
-  'risco',
 ] as const
 
 export const TIPOS_CRITERIO = ['alvo', 'guarda', 'avaliador'] as const
@@ -91,7 +98,8 @@ export interface Regra {
  */
 export const REGRAS: Readonly<Record<string, Regra>> = {
   '1': { severidade: 'erro', oque: 'bloco ```json parseável', porque: '0/0/0 FP; sem JSON o executor não lê o ticket' },
-  '2': { severidade: 'erro', oque: 'campo obrigatório de pendente', porque: 'CORRIGIR: 4/48/557 FP por risco e bloco, que o executor não lê' },
+  '2': { severidade: 'erro', oque: 'campo obrigatório de pendente (risco, se presente, é classe de risco)', porque: 'era 4/48/557 FP por risco e bloco, que o executor não lê; sem os dois: 0/0/0' },
+  '2c': { severidade: 'aviso', oque: 'criterios_aceite ausente ou vazio', porque: '0/0/1 FP (Comarka 346a, done sem critério: o executor roda e o juiz decide)' },
   '3': { severidade: 'erro', oque: 'id no formato e igual ao prefixo do arquivo', porque: 'CORRIGIR: 0/0/23 FP por ids de fatiamento (407a0)' },
   '4': { severidade: 'erro', oque: 'status no vocabulário', porque: '0/0/0 FP' },
   '5t': { severidade: 'erro', oque: 'tipo do critério', porque: 'CORRIGIR: 4/48/535 FP por tipo ausente, todo inferível' },
@@ -901,20 +909,17 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
         }
         continue
       }
-      // `risco` também basta EXISTIR: quem o preenche é o PASSO 6 do gate
-      // (classe de risco), que fica de fora desta peça. Os 7 pendentes de hoje o
-      // trazem vazio, e exigir valor aqui seria o gate reprovando ticket por não
-      // ter feito o que o próprio gate ainda não faz.
-      if (campo === 'risco') {
-        if (t.risco === undefined || t.risco === null) {
-          achado('2', campo, 'campo obrigatório de ticket pendente ausente')
-        } else if (typeof t.risco === 'string' && t.risco !== '' && t.risco !== 'baixo' && t.risco !== 'alto') {
-          achado('2', campo, `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
-        }
+      if (campo === 'criterios_aceite') {
+        if (vazio(t[campo])) achado('2c', campo, 'campo obrigatório de ticket pendente ausente ou vazio')
         continue
       }
       if (vazio(t[campo])) achado('2', campo, 'campo obrigatório de ticket pendente ausente ou vazio')
     }
+    // `risco` é opcional (etapa 7d-1b). Presente, vale o vocabulário: vazio até
+    // o PASSO 6 do gate classificar, depois baixo ou alto.
+    if (typeof t.risco === 'string' && t.risco !== '' && t.risco !== 'baixo' && t.risco !== 'alto') {
+      achado('2', 'risco', `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
+    }
   }
 
   // 3. `id` no formato e igual ao prefixo do nome do arquivo.
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
new file mode 100644
index 0000000..36041ad
--- /dev/null
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -0,0 +1,85 @@
+/**
+ * Etapa 7d-1b, peça 3 — as correções de regra, cada uma com o caso REAL do
+ * corpus (`test/fixtures/gate-corpus-7d1/casos.json`) que ela marcava como
+ * falso positivo, e o caso que ela ainda precisa pegar.
+ *
+ * O caso real roda como no corpus: status forçado a `pendente`, a fila no
+ * instante T reduzida ao contexto dos checks 7 e 8, config do template.
+ */
+import { describe, it, expect } from 'vitest';
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import { REPO_ROOT } from './fixtures/orq-harness.js';
+import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
+
+interface Caso {
+  grupo: 'a' | 'b';
+  repo: string;
+  id: string;
+  arquivo: string;
+  ticket: Record<string, unknown>;
+  fila: Record<string, unknown>[];
+}
+
+const CASOS = JSON.parse(
+  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1', 'casos.json'), 'utf8'),
+) as Caso[];
+const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));
+
+function caso(repo: string, id: string): Caso {
+  const c = CASOS.find((x) => x.repo === repo && x.id === id);
+  if (!c) throw new Error(`caso ${repo} ${id} não está no corpus`);
+  return c;
+}
+
+/** Os achados do gate no caso real, com um ajuste opcional no ticket. */
+function rodar(repo: string, id: string, ajuste: (t: Record<string, unknown>) => void = () => {}): Violacao[] {
+  const c = caso(repo, id);
+  const t = structuredClone({ ...c.ticket, status: 'pendente' });
+  ajuste(t);
+  const dir = `/corpus-7d1/${c.repo}`;
+  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: t };
+  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
+  fila.push(alvo);
+  return validarTicket(alvo, fila, CFG);
+}
+
+const erros = (v: Violacao[]) => v.filter((x) => !x.aviso && !x.isencao);
+const daRegra = (v: Violacao[], regra: string) => v.filter((x) => (x as Violacao & { regra?: string }).regra === regra);
+
+describe('7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em regra própria', () => {
+  it('CI 015 (done sem risco nem bloco) não é violação de campo obrigatório', () => {
+    const t = caso('CI', '015').ticket;
+    expect(t.risco).toBeUndefined();
+    expect(erros(rodar('CI', '015')).filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo)).toEqual([]);
+  });
+
+  it('Comarka 003 e Actus 110 (os 557 e 48 FP da calibração) idem', () => {
+    for (const [r, id] of [['Comarka', '003'], ['Actus', '110']] as const) {
+      expect(erros(rodar(r, id)).filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo), `${r} ${id}`).toEqual([]);
+    }
+  });
+
+  it('o que o executor lê segue ERRO: sem objetivo, sem allowlist, sem slug', () => {
+    const v = erros(rodar('CI', '015', (t) => {
+      delete t.objetivo;
+      t.pathspec_allowlist = [];
+      delete t.slug;
+    }));
+    expect(v.filter((x) => /campo obrigatório/.test(x.mensagem)).map((x) => x.campo).sort()).toEqual([
+      'objetivo',
+      'pathspec_allowlist',
+      'slug',
+    ]);
+  });
+
+  it('risco presente com lixo segue violação', () => {
+    expect(erros(rodar('CI', '015', (t) => (t.risco = 'medio'))).some((x) => /'medio' não é classe de risco/.test(x.mensagem))).toBe(true);
+  });
+
+  it('Comarka 346a (done sem criterios_aceite): regra 2c, AVISO — o executor roda ticket sem critério', () => {
+    const v = rodar('Comarka', '346a-lib-periodo-compartilhada');
+    expect(erros(v).filter((x) => x.campo === 'criterios_aceite')).toEqual([]);
+    expect(daRegra(v, '2c').map((x) => [x.campo, x.aviso])).toEqual([['criterios_aceite', true]]);
+  });
+});
diff --git a/test/orquestrador-gate-severidade.test.ts b/test/orquestrador-gate-severidade.test.ts
index ca96d43..436bb6b 100644
--- a/test/orquestrador-gate-severidade.test.ts
+++ b/test/orquestrador-gate-severidade.test.ts
@@ -67,6 +67,7 @@ describe('7d1b-2 · a tabela única', () => {
     expect(sev).toEqual({
       '1': 'erro',
       '2': 'erro',
+      '2c': 'aviso',
       '3': 'erro',
       '4': 'erro',
       '5t': 'erro',
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
index 9a3a0f2..bf60c69 100644
--- a/test/orquestrador-gate-ticket.test.ts
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -157,26 +157,28 @@ describe('check 2 · campos obrigatórios (só para pendente)', () => {
     }
   });
 
-  it('`risco` basta EXISTIR: vazio passa (quem preenche é o passo 6), lixo não', () => {
+  // Etapa 7d-1b: `risco` e `bloco` viraram OPCIONAIS (a calibração de 25/09
+  // mediu 609 done sem risco e 461 sem bloco; o executor não lê nenhum dos
+  // dois). O caso "ausente" passou de violação a nenhuma violação; vazio e lixo
+  // seguem como eram.
+  it('`risco` é opcional: ausente e vazio passam, lixo não', () => {
     const vazio = criarFila([pendenteBom({ id: '901', risco: '' })]);
     expect(violacoes(vazio, '901')).toEqual([]);
     const ausente = criarFila([pendenteBom({ id: '902', risco: undefined })]);
-    expect(violacoes(ausente, '902')).toContain('risco campo obrigatório de ticket pendente ausente');
+    expect(violacoes(ausente, '902')).toEqual([]);
     const lixo = criarFila([pendenteBom({ id: '903', risco: 'medio' })]);
     expect(violacoes(lixo, '903')[0]).toMatch(/^risco 'medio' não é classe de risco/);
   });
 
-  it('a lista de campos obrigatórios é a do contrato, item a item', () => {
+  it('a lista de campos obrigatórios é a do contrato, item a item (sem bloco e sem risco desde a 7d-1b)', () => {
     expect([...CAMPOS_PENDENTE]).toEqual([
       'id',
       'slug',
-      'bloco',
       'objetivo',
       'pathspec_allowlist',
       'dependencias',
       'criterios_aceite',
       'status',
-      'risco',
     ]);
   });
 });
~~~~

### 2b49f34 7d1b-3b: check 3 aceita id com sufixo de fatiamento (407a0, 315b1b), também na leitura da fila

~~~~diff
commit 2b49f34843e3313943b1d3fadecae6a2c4a32252
Author: Lucas Santos
Date: Fri Sep 25 12:08:43 2026 -0300

7d1b-3b: check 3 aceita id com sufixo de fatiamento (407a0, 315b1b), também na leitura da fila

RE_ID de [a-z]? para [a-z0-9]* (o sufixo do pre-commit do Comarka), e o
mesmo no prefixo do arquivo e no filtro do lerFila: sem isso o 407a0-*.md
nem entrava na fila, e o check 7 não achava a dependência. FP no corpus: de
0/0/23 para 0/0/1; o 1 é o 346a-lib-periodo-compartilhada, id com o slug
colado, que segue acusado.

Teste antigo com asserção de mesma força: a mensagem exata do '9z1' com o
formato novo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts      | 17 +++++++++++------
 test/orquestrador-gate-correcoes.test.ts | 25 +++++++++++++++++++++++--
 test/orquestrador-gate-ticket.test.ts    |  6 +++++-
 3 files changed, 39 insertions(+), 9 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 11d961d..7c015fe 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -66,8 +66,13 @@ export const CAMPOS_PENDENTE = [
 
 export const TIPOS_CRITERIO = ['alvo', 'guarda', 'avaliador'] as const
 
-/** `231`, `001a`. Três dígitos, sufixo de letra opcional para o ticket enxertado. */
-export const RE_ID = /^\d{3}[a-z]?$/
+/**
+ * `231`, `001a`, `407a0`, `315b1b`. Três dígitos e um sufixo de letras e
+ * dígitos: o ticket enxertado (`a`) e o fatiado de um fatiado (`a0`, `b1b`).
+ * Etapa 7d-1b: era `[a-z]?`, e marcava 23 done do Comarka (calibração de 25/09);
+ * o sufixo agora é o do pre-commit do Comarka.
+ */
+export const RE_ID = /^\d{3}[a-z0-9]*$/
 
 // ─── Severidade por regra (etapa 7d-1b) ───────────────────────────────────
 //
@@ -510,7 +515,7 @@ function vazio(v: unknown): boolean {
   return false
 }
 
-/** Todo `NNN[a]-*.md` do diretório da fila, lido uma vez. */
+/** Todo `NNN[sufixo]-*.md` do diretório da fila, lido uma vez. */
 // ─── Check 10: regex do critério contra exemplos declarados (ticket 624) ──
 //
 // Causa (auditoria de 22/09/2026): o regex "cita arquivo:linha" do 503 tinha
@@ -816,7 +821,7 @@ export function achadosExemplosRegex(
 export function lerFila(filaDir: string): TicketLido[] {
   if (!existsSync(filaDir)) return []
   return readdirSync(filaDir)
-    .filter((f) => /^\d{3}[a-z]?-.*\.md$/.test(f))
+    .filter((f) => /^\d{3}[a-z0-9]*-.*\.md$/.test(f))
     .sort()
     .map((f) => {
       const arquivo = join(filaDir, f)
@@ -925,9 +930,9 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
   // 3. `id` no formato e igual ao prefixo do nome do arquivo.
   const id = typeof t.id === 'string' ? t.id : ''
   if (!RE_ID.test(id)) {
-    achado('3', 'id', `'${id}' fora do formato NNN[a] (três dígitos, letra opcional)`)
+    achado('3', 'id', `'${id}' fora do formato NNN[sufixo] (três dígitos e letras/dígitos minúsculos, ex.: 407a0)`)
   }
-  const prefixoArquivo = /^(\d{3}[a-z]?)-/.exec(arq)?.[1] ?? ''
+  const prefixoArquivo = /^(\d{3}[a-z0-9]*)-/.exec(arq)?.[1] ?? ''
   if (id && prefixoArquivo && id !== prefixoArquivo) {
     achado('3', 'id', `'${id}' não bate com o prefixo do nome do arquivo ('${prefixoArquivo}')`)
   }
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index 36041ad..951b44c 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -7,10 +7,11 @@
  * instante T reduzida ao contexto dos checks 7 e 8, config do template.
  */
 import { describe, it, expect } from 'vitest';
-import { readFileSync } from 'node:fs';
+import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
+import { tmpdir } from 'node:os';
 import { join } from 'node:path';
 import { REPO_ROOT } from './fixtures/orq-harness.js';
-import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
+import { carregarCfg, lerFila, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
 
 interface Caso {
   grupo: 'a' | 'b';
@@ -83,3 +84,23 @@ describe('7d1b-3 · check 2: risco e bloco opcionais; critérios ausentes em reg
     expect(daRegra(v, '2c').map((x) => [x.campo, x.aviso])).toEqual([['criterios_aceite', true]]);
   });
 });
+
+describe('7d1b-3 · check 3: id com sufixo de fatiamento (407a0, 315b1b)', () => {
+  it('Comarka 407a0 (bloqueado por spec) e 062a1 (done): o id é válido e bate com o arquivo', () => {
+    for (const id of ['407a0', '062a1', '315b1b']) {
+      expect(daRegra(rodar('Comarka', id), '3').map((x) => x.mensagem), id).toEqual([]);
+    }
+    expect(caso('Comarka', '407a0').arquivo).toMatch(/^407a0-/);
+  });
+
+  it('a fila lê o arquivo 407a0-*.md (senão o check 7 não acha a dependência)', () => {
+    const dir = mkdtempSync(join(tmpdir(), 'orq-id-'));
+    writeFileSync(join(dir, '407a0-x.md'), '# 407a0\n\n```json\n{"id": "407a0"}\n```\n');
+    expect(lerFila(dir).map((f) => f.json?.id)).toEqual(['407a0']);
+  });
+
+  it('id torto segue acusado: 9z1, e o 346a-lib-periodo-compartilhada (slug colado no id)', () => {
+    expect(daRegra(rodar('Comarka', '407a0', (t) => (t.id = '9z1')), '3').length).toBeGreaterThan(0);
+    expect(daRegra(rodar('Comarka', '346a-lib-periodo-compartilhada'), '3').map((x) => x.campo)).toContain('id');
+  });
+});
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
index bf60c69..a2855b8 100644
--- a/test/orquestrador-gate-ticket.test.ts
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -205,7 +205,11 @@ describe('check 3 · id NNN[a], igual ao prefixo do nome do arquivo', () => {
     const md = readFileSync(join(dir, '9z1-torto.md'), 'utf8');
     const r = blocoJson(md);
     const v = validarTicket({ arquivo: join(dir, '9z1-torto.md'), json: r.ok ? r.json : null }, fila, cfg);
-    expect(v.map((x) => x.mensagem)).toContain("'9z1' fora do formato NNN[a] (três dígitos, letra opcional)");
+    // Etapa 7d-1b: o sufixo passou de `[a-z]?` a `[a-z0-9]*` (407a0, 315b1b), e a
+    // mensagem diz o formato novo. O 9z1 continua fora dele.
+    expect(v.map((x) => x.mensagem)).toContain(
+      "'9z1' fora do formato NNN[sufixo] (três dígitos e letras/dígitos minúsculos, ex.: 407a0)",
+    );
   });
 
   it('MAU: id que não bate com o prefixo do arquivo', () => {
~~~~

### 74fffeb 7d1b-3c: check 5 infere o tipo ausente (5t) e aceita cmd vazio em critério espera 'avaliador' (5c)

~~~~diff
commit 74fffeb6cd4c8dc61ada50d8e6f791c520465a5e
Author: Lucas Santos
Date: Fri Sep 25 12:09:28 2026 -0300

7d1b-3c: check 5 infere o tipo ausente (5t) e aceita cmd vazio em critério espera 'avaliador' (5c)

Tipo ausente marcava 4/48/535 done e todo ele é inferível (espera
'avaliador' é o critério qualitativo; o resto é alvo); presente, tem de
estar no vocabulário. cmd vazio marcava 192 done do Comarka, todos o
critério qualitativo que o run_criterios pula; em critério que o executor
roda, segue ERRO. Um commit só: o 5c usa o avaliador que o 5t reconhece.
FP no corpus: 5t e 5c 0/0/0.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts      | 21 +++++++++++++++------
 test/orquestrador-gate-correcoes.test.ts | 28 ++++++++++++++++++++++++++++
 2 files changed, 43 insertions(+), 6 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 7c015fe..d8befdb 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -107,8 +107,8 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '2c': { severidade: 'aviso', oque: 'criterios_aceite ausente ou vazio', porque: '0/0/1 FP (Comarka 346a, done sem critério: o executor roda e o juiz decide)' },
   '3': { severidade: 'erro', oque: 'id no formato e igual ao prefixo do arquivo', porque: 'CORRIGIR: 0/0/23 FP por ids de fatiamento (407a0)' },
   '4': { severidade: 'erro', oque: 'status no vocabulário', porque: '0/0/0 FP' },
-  '5t': { severidade: 'erro', oque: 'tipo do critério', porque: 'CORRIGIR: 4/48/535 FP por tipo ausente, todo inferível' },
-  '5c': { severidade: 'erro', oque: 'cmd do critério não vazio', porque: 'CORRIGIR: 0/0/192 FP por critério avaliador sem cmd' },
+  '5t': { severidade: 'erro', oque: 'tipo do critério, quando presente, no vocabulário', porque: 'era 4/48/535 FP por tipo ausente, todo inferível; inferido: 0/0/0' },
+  '5c': { severidade: 'erro', oque: 'cmd não vazio em critério que o executor roda', porque: 'era 0/0/192 FP por espera "avaliador" sem cmd; aceito: 0/0/0' },
   '5e': { severidade: 'erro', oque: 'espera do critério não vazia', porque: '0/0/0 FP' },
   '6a': { severidade: 'erro', oque: 'padrão de proibido_no_cmd sem linha própria', porque: 'crase, eval, sudo, curl, wget: 0/0/0 FP; regra de segurança' },
   '6a:$(': { severidade: 'off', oque: "'$(' fora da isenção do 1º segmento", porque: 'DESLIGAR: 54/7/74 FP, 0 causal; forma dominante de comparação numérica' },
@@ -948,11 +948,20 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
     t.criterios_aceite.forEach((c, i) => {
       const campo = `criterios_aceite[${i}]`
       const cr = (c ?? {}) as Cru
-      const tipo = typeof cr.tipo === 'string' ? cr.tipo : ''
-      if (!(TIPOS_CRITERIO as readonly string[]).includes(tipo)) {
-        achado('5t', campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
+      // Etapa 7d-1b: `tipo` AUSENTE é inferido, como o executor já faz ao ler
+      // (`espera: "avaliador"` é o critério qualitativo; o resto é alvo). Cobrar
+      // o campo marcava 4/48/535 done na calibração de 25/09. Presente, tem de
+      // estar no vocabulário.
+      const avaliador = cr.espera === 'avaliador'
+      if (cr.tipo !== undefined && cr.tipo !== null) {
+        const tipo = typeof cr.tipo === 'string' ? cr.tipo : ''
+        if (!(TIPOS_CRITERIO as readonly string[]).includes(tipo)) {
+          achado('5t', campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
+        }
       }
-      if (vazio(cr.cmd)) achado('5c', campo, 'cmd vazio')
+      // `cmd` vazio só vale onde o executor não roda o critério: `espera:
+      // "avaliador"` (run_criterios pula). Eram 192 done do Comarka.
+      if (vazio(cr.cmd) && !avaliador) achado('5c', campo, 'cmd vazio')
       if (vazio(cr.espera)) achado('5e', campo, 'espera vazia')
 
       if (typeof cr.cmd === 'string' && cr.cmd.trim() !== '') {
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index 951b44c..e4c1168 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -104,3 +104,31 @@ describe('7d1b-3 · check 3: id com sufixo de fatiamento (407a0, 315b1b)', () =>
     expect(daRegra(rodar('Comarka', '346a-lib-periodo-compartilhada'), '3').map((x) => x.campo)).toContain('id');
   });
 });
+
+describe('7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critério avaliador', () => {
+  it('Actus 110 e Comarka 003 (critérios sem tipo): nenhum achado de tipo', () => {
+    for (const [r, id] of [['Actus', '110'], ['Comarka', '003']] as const) {
+      expect(daRegra(rodar(r, id), '5t').map((x) => x.mensagem), `${r} ${id}`).toEqual([]);
+    }
+  });
+
+  it('Comarka 296b (espera "avaliador" sem cmd, o critério qualitativo): nenhum achado de cmd vazio', () => {
+    const t = caso('Comarka', '296b').ticket;
+    const crs = t.criterios_aceite as Record<string, unknown>[];
+    expect(crs.some((c) => c.espera === 'avaliador' && !c.cmd)).toBe(true);
+    expect(daRegra(rodar('Comarka', '296b'), '5c').map((x) => x.campo)).toEqual([]);
+  });
+
+  it('tipo PRESENTE fora do vocabulário segue ERRO', () => {
+    const v = rodar('Comarka', '003', (t) => ((t.criterios_aceite as Record<string, unknown>[])[0]!.tipo = 'smoke'));
+    expect(erros(daRegra(v, '5t')).map((x) => x.mensagem)).toEqual(["tipo 'smoke' inválido (alvo, guarda, avaliador)"]);
+  });
+
+  it('cmd vazio em critério que o executor RODA (espera que não é avaliador) segue ERRO', () => {
+    const v = rodar('Comarka', '296b', (t) => {
+      const c = (t.criterios_aceite as Record<string, unknown>[]).find((x) => x.espera === 'avaliador')!;
+      c.espera = 'ok';
+    });
+    expect(erros(daRegra(v, '5c')).map((x) => x.mensagem)).toContain('cmd vazio');
+  });
+});
~~~~

### 1d942d7 7d1b-3d: check 10x compara o exemplo com o padrão que o shell entrega e dispensa exemplo no grep -v

~~~~diff
commit 1d942d747a2346b40cca32e148d1ffe241ac5289
Author: Lucas Santos
Date: Fri Sep 25 12:13:23 2026 -0300

7d1b-3d: check 10x compara o exemplo com o padrão que o shell entrega e dispensa exemplo no grep -v

A regra 2 do 624 procurava o regex do exemplo no texto CRU do cmd e a
regra 3 comparava com o padrão depois das aspas resolvidas: com \"perdida\"
no cmd (510b[5] do Actus) nenhum exemplo satisfazia as duas. Agora o
exemplo corresponde a um padrão se é o que o shell entrega ao grep/awk ou o
argumento como está escrito entre as aspas de fora (a forma que a regra
antiga obrigava: 510b[4], 512b[1], 528[1]); positivo e negativo são
provados com o padrão que a ferramenta recebe. Padrão de grep -v não exige
exemplo (o filtro de comentário era 12 das 20 mensagens), e padrão não-ERE
conta para a correspondência (530[14]). padroesDoCmd não muda.
FP no corpus: de 0/8/0 para 0/0/0.

Testes antigos com asserção de mesma força: a mensagem da regra 2
('não é padrão que o cmd passa ao grep/awk') nos dois testes do 624.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts           | 110 ++++++++++++++++++++------
 test/orquestrador-gate-correcoes.test.ts      |  45 +++++++++++
 test/orquestrador-gate-regex-casos.test.ts    |   6 +-
 test/orquestrador-gate-regex-exemplos.test.ts |   6 +-
 4 files changed, 141 insertions(+), 26 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index d8befdb..ee93e49 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -125,7 +125,7 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '9w': { severidade: 'aviso', oque: 'contexto_juiz coberto por glob da allowlist', porque: 'o caso do 501: referência que o ticket pode editar' },
   '10n': { severidade: 'aviso', oque: 'critério com regex sem exemplos_regex', porque: '56/45/499 FP, 0 causal; nenhum ticket anterior ao 624 declara exemplos' },
   '10c': { severidade: 'erro', oque: '\\[ ou \\] dentro de classe [...]', porque: '0/0/0 FP (caso-origem 503)' },
-  '10x': { severidade: 'erro', oque: 'exemplos_regex contra o padrão do cmd', porque: 'CORRIGIR: 0/8/0 FP, todos das aspas escapadas e do grep -v' },
+  '10x': { severidade: 'erro', oque: 'exemplos_regex contra o padrão do cmd', porque: 'era 0/8/0 FP, todos das aspas escapadas e do grep -v de comentário' },
 }
 
 export function severidadePadrao(regra: string): Severidade {
@@ -567,9 +567,19 @@ export class GateNaoRodou extends Error {}
  * escapa `$`, `` ` ``, `"`, `\` e quebra de linha; fora de aspas escapa tudo.
  */
 export function palavrasShell(seg: string): string[] {
-  const out: string[] = []
+  return palavrasShellComCru(seg).map((w) => w.valor)
+}
+
+/**
+ * O mesmo, com o texto CRU de cada palavra como está no cmd (etapa 7d-1b): o
+ * exemplo do check 10 pode ser escrito na forma que o shell entrega ou na forma
+ * que está entre as aspas do cmd.
+ */
+export function palavrasShellComCru(seg: string): { valor: string; cru: string }[] {
+  const out: { valor: string; cru: string }[] = []
   let atual = ''
   let tem = false
+  let inicio = 0
   let aspas: string | null = null
   for (let i = 0; i < seg.length; i++) {
     const c = seg[i]!
@@ -584,6 +594,7 @@ export function palavrasShell(seg: string): string[] {
       else atual += c
       continue
     }
+    if (!tem && !/\s/.test(c)) inicio = i
     if (c === "'" || c === '"') {
       aspas = c
       tem = true
@@ -595,7 +606,7 @@ export function palavrasShell(seg: string): string[] {
       continue
     }
     if (/\s/.test(c)) {
-      if (tem) out.push(atual)
+      if (tem) out.push({ valor: atual, cru: seg.slice(inicio, i) })
       atual = ''
       tem = false
       continue
@@ -603,22 +614,56 @@ export function palavrasShell(seg: string): string[] {
     atual += c
     tem = true
   }
-  if (tem) out.push(atual)
+  if (tem) out.push({ valor: atual, cru: seg.slice(inicio) })
   return out
 }
 
+/** O texto cru de um argumento sem o par de aspas de fora (`'a|'b'|c'` → `a|'b'|c`). */
+function semAspasDeFora(cru: string): string {
+  const q = cru[0]
+  if ((q === "'" || q === '"') && cru.length >= 2 && cru.endsWith(q)) return cru.slice(1, -1)
+  return cru
+}
+
 const OPCOES_GREP_COM_ARG = new Set(['m', 'A', 'B', 'C', 'd', 'D', 'e', 'f'])
 
 /** Padrões ERE passados a grep (com -E, ou egrep) e literais /.../ de programas awk. */
 export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
-  const out: PadraoDoCmd[] = []
+  return argumentosDePadrao(cmd)
+    .filter((p) => p.ere)
+    .map(({ ferramenta, regex }) => ({ ferramenta, regex }))
+}
+
+/** Um padrão que o cmd passa a grep ou awk, com o que o check 10 precisa saber dele. */
+export interface ArgumentoDePadrao extends PadraoDoCmd {
+  /** O argumento como está escrito no cmd, sem o par de aspas de fora. */
+  cru: string
+  /** Passado a `grep -v`: exclusão de linha. */
+  exclusao: boolean
+  /** ERE (grep -E, egrep, awk): só estes exigem exemplo (regra 1 do 624). */
+  ere: boolean
+}
+
+/**
+ * Todo padrão que o cmd passa a grep (ERE, BRE ou -F) e todo literal /.../ de
+ * awk. Etapa 7d-1b: o check 10 precisa de três coisas que `padroesDoCmd` não
+ * dá — o texto cru (o exemplo pode estar escrito como no cmd), a marca de
+ * exclusão (padrão de `grep -v` não exige exemplo: o filtro de comentário
+ * `grep -vE '^[[:space:]]*(//|/?\*)'` era 12 das 20 mensagens do 10x nos done
+ * do Actus, calibração §4.1) e os padrões não-ERE (um exemplo declarado para
+ * `grep -c 'x'` corresponde a ele, 530[14] do Actus).
+ */
+export function argumentosDePadrao(cmd: string): ArgumentoDePadrao[] {
+  const out: ArgumentoDePadrao[] = []
   for (const seg of segmentarCmd(cmd)) {
-    const ws = palavrasShell(seg)
+    const pal = palavrasShellComCru(seg)
+    const ws = pal.map((w) => w.valor)
+    const cru = (k: number) => semAspasDeFora(pal[k]!.cru)
     for (let i = 0; i < ws.length; i++) {
       const nome = basename(ws[i]!)
       if (nome === 'grep' || nome === 'egrep') {
         let flags = nome === 'egrep' ? 'E' : ''
-        const pads: string[] = []
+        const pads: { regex: string; cru: string }[] = []
         let arquivoDePadrao = false
         let j = i + 1
         for (; j < ws.length; j++) {
@@ -630,7 +675,8 @@ export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
           if (w.startsWith('--')) {
             if (w === '--extended-regexp') flags += 'E'
             else if (w === '--fixed-strings') flags += 'F'
-            else if (w.startsWith('--regexp=')) pads.push(w.slice(9))
+            else if (w === '--invert-match') flags += 'v'
+            else if (w.startsWith('--regexp=')) pads.push({ regex: w.slice(9), cru: w.slice(9) })
             else if (w.startsWith('--file=')) arquivoDePadrao = true
             continue
           }
@@ -639,7 +685,9 @@ export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
               const o = w[k]!
               if (OPCOES_GREP_COM_ARG.has(o)) {
                 const resto = w.slice(k + 1)
-                const arg = resto !== '' ? resto : ws[++j]
+                let arg: { regex: string; cru: string } | undefined
+                if (resto !== '') arg = { regex: resto, cru: resto }
+                else if (j + 1 < ws.length) arg = { regex: ws[++j]!, cru: cru(j) }
                 if (o === 'e' && arg !== undefined) pads.push(arg)
                 if (o === 'f') arquivoDePadrao = true
                 break
@@ -650,10 +698,9 @@ export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
           }
           break
         }
-        if (pads.length === 0 && !arquivoDePadrao && j < ws.length) pads.push(ws[j]!)
-        if (!flags.includes('F') && flags.includes('E')) {
-          for (const p of pads) out.push({ ferramenta: 'grep', regex: p })
-        }
+        if (pads.length === 0 && !arquivoDePadrao && j < ws.length) pads.push({ regex: ws[j]!, cru: cru(j) })
+        const ere = !flags.includes('F') && flags.includes('E')
+        for (const p of pads) out.push({ ferramenta: 'grep', ...p, exclusao: flags.includes('v'), ere })
       } else if (nome === 'awk') {
         let j = i + 1
         for (; j < ws.length; j++) {
@@ -666,7 +713,9 @@ export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
           break
         }
         const prog = ws[j]
-        if (prog !== undefined) for (const r of literaisRegexAwk(prog)) out.push({ ferramenta: 'awk', regex: r })
+        if (prog !== undefined) {
+          for (const r of literaisRegexAwk(prog)) out.push({ ferramenta: 'awk', regex: r, cru: r, exclusao: false, ere: true })
+        }
       }
     }
   }
@@ -774,16 +823,18 @@ export function achadosExemplosRegex(
   const out: AchadoRegex[] = []
   // Tudo que não é `10n` nem `10c` é `10x`: a mesma partição da calibração.
   const msgs = { push: (mensagem: string, regra: AchadoRegex['regra'] = '10x') => out.push({ regra, mensagem }) }
-  const padroes = padroesDoCmd(cmd)
+  const todos = argumentosDePadrao(cmd)
+  const padroes = todos.filter((p) => p.ere)
   for (const p of padroes) {
     if (classeComColcheteEscapado(p.regex)) {
       msgs.push(`regex '${p.regex}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`, '10c')
     }
   }
   if (padroes.length === 0 && exemplosCru === undefined) return out
+  const exigem = padroes.filter((p) => !p.exclusao)
   if (!ehArray(exemplosCru) || exemplosCru.length === 0) {
-    if (padroes.length > 0) {
-      msgs.push(`critério passa regex a ${padroes[0]!.ferramenta} e não declara exemplos_regex (lista de {regex, positivo, negativo})`, '10n')
+    if (exigem.length > 0) {
+      msgs.push(`critério passa regex a ${exigem[0]!.ferramenta} e não declara exemplos_regex (lista de {regex, positivo, negativo})`, '10n')
     }
     return out
   }
@@ -799,20 +850,35 @@ export function achadosExemplosRegex(
     }
     exemplos.push(x as unknown as ExemploRegex)
   })
-  for (const p of padroes) {
-    if (!exemplos.some((e) => e.regex === p.regex)) {
+  // O exemplo corresponde a um padrão do cmd se é o padrão como o SHELL o
+  // entrega ao grep/awk, ou o argumento como está ESCRITO entre as aspas de fora
+  // (`['\"]` dentro de aspas duplas, `'a|'b'|c'` concatenado): a segunda forma é
+  // a única que a regra 2 antiga aceitava, e os tickets do 624 em diante a usam
+  // (510b[4], 512b[1], 528[1] do Actus). A prova de positivo e negativo roda
+  // sempre com o padrão que a ferramenta recebe de fato.
+  const padraoDe = (e: ExemploRegex) => todos.find((p) => p.regex === e.regex) ?? todos.find((p) => p.cru === e.regex)
+  for (const p of exigem) {
+    if (!exemplos.some((e) => padraoDe(e) === p)) {
       msgs.push(`padrão '${p.regex}' do cmd (${p.ferramenta}) sem exemplo correspondente em exemplos_regex`)
     }
   }
   for (const e of exemplos) {
-    if (!cmd.includes(e.regex)) msgs.push(`regex de exemplo '${e.regex}' não aparece literal no cmd`)
+    // Regra 2, etapa 7d-1b: o exemplo é comparado com o padrão que o SHELL
+    // entrega ao grep/awk (aspas resolvidas, o mesmo que a regra 3 extrai), não
+    // com o texto cru do cmd. Com `\"perdida\"` no cmd (510b[5] do Actus),
+    // nenhum valor satisfazia as duas regras ao mesmo tempo.
+    const p = padraoDe(e)
+    if (!p) {
+      msgs.push(`regex de exemplo '${e.regex}' não é padrão que o cmd passa ao grep/awk (compare com o padrão já com as aspas resolvidas pelo shell)`)
+    }
     if (classeComColcheteEscapado(e.regex)) {
       msgs.push(`regex de exemplo '${e.regex}' tem \\[ ou \\] dentro de classe [...]`, '10c')
     }
-    const pos = casaExemplo(e, e.positivo, exec)
+    const prova = p ? { ...e, regex: p.regex } : e
+    const pos = casaExemplo(prova, e.positivo, exec)
     if (pos.erro) msgs.push(`regex '${e.regex}' recusada: ${pos.erro}`)
     else if (!pos.casa) msgs.push(`positivo '${e.positivo}' NÃO casa '${e.regex}' (${e.ferramenta ?? 'grep'} ${e.flags ?? '-E'})`)
-    const neg = casaExemplo(e, e.negativo, exec)
+    const neg = casaExemplo(prova, e.negativo, exec)
     if (!neg.erro && neg.casa) msgs.push(`negativo '${e.negativo}' CASA '${e.regex}' (${e.ferramenta ?? 'grep'} ${e.flags ?? '-E'})`)
   }
   return out
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index e4c1168..531c62b 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -132,3 +132,48 @@ describe('7d1b-3 · check 5: tipo ausente é inferido; cmd vazio vale em critér
     expect(erros(daRegra(v, '5c')).map((x) => x.mensagem)).toContain('cmd vazio');
   });
 });
+
+describe('7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo', () => {
+  // Os 8 da calibração (0/8/0) mais o 530, que a primeira versão da correção
+  // marcava (exemplo para um grep sem -E).
+  const CASOS_10X = ['471', '471b', '471c', '508', '509', '510b', '512b', '528', '530'];
+
+  it('os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x', () => {
+    for (const id of CASOS_10X) {
+      expect(daRegra(rodar('Actus', id), '10x').map((x) => `${x.campo} ${x.mensagem}`), id).toEqual([]);
+    }
+  });
+
+  it("510b[5]: o exemplo com \\\"perdida\\\" é o padrão depois das aspas resolvidas, e é aceito", () => {
+    const cr = (caso('Actus', '510b').ticket.criterios_aceite as Record<string, unknown>[])[5]!;
+    expect(String(cr.cmd)).toContain('\\"perdida\\"');
+    expect(daRegra(rodar('Actus', '510b'), '10x').filter((x) => x.campo === 'criterios_aceite[5].exemplos_regex')).toEqual([]);
+  });
+
+  it('exemplo que não é padrão do cmd segue ERRO (a regra 2 do 624 continua valendo)', () => {
+    const v = rodar('Actus', '510b', (t) => {
+      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
+      (cr.exemplos_regex as Record<string, unknown>[]).push({ regex: 'nao-esta-no-cmd', positivo: 'nao-esta-no-cmd', negativo: 'x' });
+    });
+    expect(erros(daRegra(v, '10x')).map((x) => x.mensagem)).toEqual([
+      "regex de exemplo 'nao-esta-no-cmd' não é padrão que o cmd passa ao grep/awk (compare com o padrão já com as aspas resolvidas pelo shell)",
+    ]);
+  });
+
+  it('padrão do grep -v sem exemplo é dispensado; padrão POSITIVO sem exemplo segue acusado', () => {
+    const doCriterio1 = (v: Violacao[]) =>
+      daRegra(v, '10x').filter((x) => x.campo === 'criterios_aceite[1].exemplos_regex').map((x) => x.mensagem);
+    const soPositivo = rodar('Actus', '510b', (t) => {
+      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
+      cr.exemplos_regex = [{ regex: 'em_conversa_apagada', positivo: 'em_conversa_apagada: {}', negativo: 'x' }];
+    });
+    expect(doCriterio1(soPositivo)).toEqual([]);
+    const soExclusao = rodar('Actus', '510b', (t) => {
+      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
+      cr.exemplos_regex = [{ regex: '^[[:space:]]*(//|/?\\*)', positivo: '// x', negativo: 'x' }];
+    });
+    expect(doCriterio1(soExclusao)).toEqual([
+      "padrão 'em_conversa_apagada' do cmd (grep) sem exemplo correspondente em exemplos_regex",
+    ]);
+  });
+});
diff --git a/test/orquestrador-gate-regex-casos.test.ts b/test/orquestrador-gate-regex-casos.test.ts
index 45b15df..c681307 100644
--- a/test/orquestrador-gate-regex-casos.test.ts
+++ b/test/orquestrador-gate-regex-casos.test.ts
@@ -152,9 +152,11 @@ describe('624 · regras, uma por caso', () => {
     expect(check10(crit(CMD, [])).msgs).toEqual([SEM_EXEMPLO_GREP]);
   });
 
-  it('recusa (regra 2): regex de exemplo que não aparece literal no cmd', () => {
+  // Etapa 7d-1b: mesma recusa, com a mensagem da regra 2 corrigida (o padrão
+  // que o shell entrega ao grep, não o texto cru do cmd).
+  it('recusa (regra 2): regex de exemplo que não é padrão do cmd', () => {
     expect(check10(crit(CMD, [OK, { regex: 'fora', positivo: 'fora', negativo: 'x' }])).msgs).toEqual([
-      "regex de exemplo 'fora' não aparece literal no cmd",
+      "regex de exemplo 'fora' não é padrão que o cmd passa ao grep/awk (compare com o padrão já com as aspas resolvidas pelo shell)",
     ]);
   });
 
diff --git a/test/orquestrador-gate-regex-exemplos.test.ts b/test/orquestrador-gate-regex-exemplos.test.ts
index 20b95cc..a0fc294 100644
--- a/test/orquestrador-gate-regex-exemplos.test.ts
+++ b/test/orquestrador-gate-regex-exemplos.test.ts
@@ -110,13 +110,15 @@ describe('624 · o critério "cita arquivo:linha" do 503', () => {
     expect(v).toEqual([`negativo 'scripts/orq:1' CASA '${REGEX_NOVO}' (grep -E)`]);
   });
 
-  it('regra 2: regex de exemplo que não aparece literal no cmd reprova', () => {
+  // Etapa 7d-1b: a regra 2 compara o exemplo com o padrão que o shell entrega
+  // ao grep (não mais com o texto cru do cmd), e a mensagem diz isso.
+  it('regra 2: regex de exemplo que não é padrão do cmd reprova', () => {
     const fx = criarFixture([]);
     ticket503(fx, '907', REGEX_NOVO, [
       { regex: REGEX_NOVO, positivo: POSITIVO_503, negativo: NEGATIVO_503 },
       { regex: 'nao-esta-no-cmd', positivo: 'nao-esta-no-cmd', negativo: 'x' },
     ]);
-    expect(doTicket(fx, '907').some((x) => /não aparece literal no cmd/.test(x.mensagem))).toBe(true);
+    expect(doTicket(fx, '907').some((x) => /'nao-esta-no-cmd' não é padrão que o cmd passa ao grep\/awk/.test(x.mensagem))).toBe(true);
   });
 });
 
~~~~

### e6bd065 7d1b-3e: check 6r aceita redirecionamento para /tmp e fecha o alvo no ')'

~~~~diff
commit e6bd065044458a951b2567268adf575c81549ea6
Author: Lucas Santos
Date: Fri Sep 25 12:14:26 2026 -0300

7d1b-3e: check 6r aceita redirecionamento para /tmp e fecha o alvo no ')'

49 dos 51 disparos eram 'npm run build > /tmp/build_<id>.log', que escreve
fora da worktree; e o alvo só parava em espaço, então '2>/dev/null)' dentro
de $( ) virava o arquivo '/dev/null)' (522, 543). FP no corpus: de 0/3/48
para 0/0/1; o 1 é o 615 do Comarka, que faz 'git show <sha>:"$f" > "$f"'
e sobrescreve arquivo do repo — segue acusado, e a regra segue AVISO.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts      | 20 +++++++++++++-------
 test/orquestrador-gate-correcoes.test.ts | 29 +++++++++++++++++++++++++++++
 2 files changed, 42 insertions(+), 7 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index ee93e49..670a432 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -115,7 +115,7 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '6a:rm ': { severidade: 'aviso', oque: "'rm ' no cmd", porque: '0/13/20 FP (rm -rf .next antes do build), 0 causal' },
   '6a:bash': { severidade: 'aviso', oque: "'bash' no cmd", porque: '0/1/6 FP, 0 causal' },
   '6a:sh -c': { severidade: 'aviso', oque: "'sh -c' no cmd", porque: '0/0/1 FP, 0 causal' },
-  '6r': { severidade: 'aviso', oque: 'redirecionamento que escreve arquivo', porque: 'CORRIGIR → AVISO: 0/3/48 FP, 0 causal' },
+  '6r': { severidade: 'aviso', oque: 'redirecionamento que escreve arquivo da worktree', porque: 'era 0/3/48 FP (build para /tmp, `)` lido como alvo); corrigida: 0/0/1 (615, que sobrescreve arquivo do repo)' },
   '6v': { severidade: 'aviso', oque: 'saída textual do vitest em pipe', porque: 'CORRIGIR → AVISO: 53/34/272 FP; causal 6, nunca chega a zero FP' },
   '6q': { severidade: 'aviso', oque: 'grep -q recebendo pipe', porque: '0/12/83 FP; causal 4 (Actus); o dano é do pipefail do executor' },
   '6b': { severidade: 'aviso', oque: 'objetivo cita caminho fora da allowlist', porque: '55/60/363 FP; causal 1 (488)' },
@@ -312,12 +312,17 @@ export function segmentarCmd(cmd: string): string[] {
 }
 
 /**
- * Redirecionamentos INÓCUOS, e só eles: `2>&1`, `>/dev/null`, `2>/dev/null`.
- * Qualquer `>` ou `>>` para arquivo real reprova SEMPRE — inclusive dentro de
- * prefixo permitido. Critério de aceite que escreve arquivo deixou de ser
- * medição e virou efeito colateral.
+ * Redirecionamentos INÓCUOS, e só eles: `2>&1`, `>/dev/null`, `2>/dev/null` e
+ * arquivo em `/tmp/`. Qualquer `>` ou `>>` para arquivo da worktree reprova
+ * SEMPRE — inclusive dentro de prefixo permitido. Critério de aceite que
+ * escreve arquivo do repo deixou de ser medição e virou efeito colateral.
+ *
+ * Etapa 7d-1b (calibração de 25/09, 0/3/48 FP): `npm run build >
+ * /tmp/build_<id>.log` escreve FORA da worktree e era 49 dos 51 disparos; e o
+ * alvo parava só em espaço, então `2>/dev/null)` dentro de `$( )` virava o
+ * arquivo `/dev/null)`. O `)` agora fecha o alvo.
  */
-const RE_REDIR = /(\d?)(>>?)\s*(&\d|[^\s;|&]*)/g
+const RE_REDIR = /(\d?)(>>?)\s*(&\d|[^\s;|&)]*)/g
 
 export function redirecionamentosProibidos(segmentoVisivel: string): string[] {
   const ruins: string[] = []
@@ -327,6 +332,7 @@ export function redirecionamentosProibidos(segmentoVisivel: string): string[] {
     const seta = m[2]!
     const alvo = m[3] ?? ''
     if (seta === '>' && (alvo === '/dev/null' || /^&\d$/.test(alvo))) continue
+    if (/^\/tmp\/[^/]/.test(alvo)) continue
     ruins.push(`${m[1] ?? ''}${seta}${alvo}`)
   }
   return ruins
@@ -483,7 +489,7 @@ export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
 
     for (const r of redirecionamentosProibidos(visivel)) {
       achados.push({
-        mensagem: `redirecionamento '${r}' escreve arquivo (só 2>&1, >/dev/null e 2>/dev/null passam) — cmd: ${cmd}`,
+        mensagem: `redirecionamento '${r}' escreve arquivo (só 2>&1, >/dev/null, 2>/dev/null e /tmp/* passam) — cmd: ${cmd}`,
         regra: '6r',
       })
     }
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index 531c62b..29dd496 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -177,3 +177,32 @@ describe('7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; gre
     ]);
   });
 });
+
+describe('7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do redirecionamento', () => {
+  it('Comarka 202 e Actus 418 (npm run build > /tmp/build_<id>.log): nenhum achado 6r', () => {
+    for (const [r, id] of [['Comarka', '202'], ['Actus', '418']] as const) {
+      expect(daRegra(rodar(r, id), '6r').map((x) => x.mensagem), `${r} ${id}`).toEqual([]);
+    }
+  });
+
+  it("Comarka 543 (`2>/dev/null)` dentro de `$( )`): o alvo é /dev/null, não '/dev/null)'", () => {
+    expect(daRegra(rodar('Comarka', '543'), '6r').map((x) => x.mensagem)).toEqual([]);
+    expect(daRegra(rodar('Comarka', '522'), '6r').map((x) => x.mensagem)).toEqual([]);
+  });
+
+  it('Comarka 615 (`git show <sha>:"$f" > "$f"`, sobrescreve arquivo do repo) segue acusado', () => {
+    expect(daRegra(rodar('Comarka', '615'), '6r').length).toBeGreaterThan(0);
+  });
+
+  it('redirecionamento para arquivo da worktree segue acusado, dentro ou fora de $( )', () => {
+    const v = rodar('Comarka', '202', (t) => {
+      const cr = t.criterios_aceite as Record<string, unknown>[];
+      cr.push({ tipo: 'alvo', descricao: 'x', cmd: 'npm run build > build.log 2>&1 && echo ok', espera: 'ok' });
+      cr.push({ tipo: 'alvo', descricao: 'y', cmd: 'n=$(grep -c x src/a.ts 2>erro.txt); echo $n', espera: '1' });
+    });
+    expect(daRegra(v, '6r').map((x) => x.mensagem.split(' — ')[0])).toEqual([
+      "redirecionamento '>build.log' escreve arquivo (só 2>&1, >/dev/null, 2>/dev/null e /tmp/* passam)",
+      "redirecionamento '2>erro.txt' escreve arquivo (só 2>&1, >/dev/null, 2>/dev/null e /tmp/* passam)",
+    ]);
+  });
+});
~~~~

### 394c241 7d1b-3f: check 6v só acusa critério que aprovaria uma suíte com falha

~~~~diff
commit 394c241487f912e26c70836458d8d7efe2db0b83
Author: Lucas Santos
Date: Fri Sep 25 12:16:29 2026 -0300

7d1b-3f: check 6v só acusa critério que aprovaria uma suíte com falha

O trecho depois do pipe do vitest roda sobre duas saídas de referência
(suíte com 1 falha, suíte verde), com a comparação do harness: casa com a
falha = acusado; só casa com o verde ('Tests +[0-9]+ passed' espera 1,
'grep -c failed' espera 0) ou nunca casa = não é o defeito desta regra. Só
roda filtro de texto (grep, awk, sed sem -i, wc, head, tail...), sem $( ),
crase ou escrita de arquivo, com PATH do sistema e em diretório temporário;
fora disso é indeterminado e segue acusado. 'vitest.config' não é o comando.
checarCmd sem espera mantém a forma mínima de antes.

FP no corpus: de 53/34/272 para 0/23/250; VP de 6/9/14 para 0/9/13 — a
estimativa da calibração, caso a caso. Segue AVISO.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts      | 120 +++++++++++++++++++++++++++++--
 test/orquestrador-gate-correcoes.test.ts |  37 ++++++++++
 2 files changed, 151 insertions(+), 6 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 670a432..64a1e20 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -21,6 +21,7 @@
  */
 import { spawnSync } from 'node:child_process'
 import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs'
+import { tmpdir } from 'node:os'
 import { basename, dirname, join, resolve } from 'node:path'
 import { fileURLToPath } from 'node:url'
 import { globToRegExp } from './enforcement-core.js'
@@ -116,7 +117,7 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '6a:bash': { severidade: 'aviso', oque: "'bash' no cmd", porque: '0/1/6 FP, 0 causal' },
   '6a:sh -c': { severidade: 'aviso', oque: "'sh -c' no cmd", porque: '0/0/1 FP, 0 causal' },
   '6r': { severidade: 'aviso', oque: 'redirecionamento que escreve arquivo da worktree', porque: 'era 0/3/48 FP (build para /tmp, `)` lido como alvo); corrigida: 0/0/1 (615, que sobrescreve arquivo do repo)' },
-  '6v': { severidade: 'aviso', oque: 'saída textual do vitest em pipe', porque: 'CORRIGIR → AVISO: 53/34/272 FP; causal 6, nunca chega a zero FP' },
+  '6v': { severidade: 'aviso', oque: 'critério que lê o texto do vitest e aprovaria uma suíte com falha', porque: 'era 53/34/272 FP; só o que aprovaria a falha: 0/23/250 medido na calibração, nunca chega a zero FP' },
   '6q': { severidade: 'aviso', oque: 'grep -q recebendo pipe', porque: '0/12/83 FP; causal 4 (Actus); o dano é do pipefail do executor' },
   '6b': { severidade: 'aviso', oque: 'objetivo cita caminho fora da allowlist', porque: '55/60/363 FP; causal 1 (488)' },
   '7': { severidade: 'erro', oque: 'dependência é id da fila ou humano:<token> (C7, dependência órfã)', porque: '0/0/0 FP depois de conferir as 19 do snapshot' },
@@ -418,11 +419,100 @@ export function grepQuietoEmPipe(cmd: string): string[] {
  * list | grep -c` conta testes, não interpreta resultado, e passa.
  */
 export function saidaTextualDoVitest(cmd: string): boolean {
+  return jusanteDoVitest(cmd) !== null
+}
+
+/**
+ * O que vem DEPOIS do pipe que recebe o stdout do vitest, ou null se não há.
+ * Etapa 7d-1b: `vitest` seguido de `.` (`vitest.config.ts`) é arquivo, não o
+ * comando (o 620 do Actus lia o config com grep).
+ */
+export function jusanteDoVitest(cmd: string): string | null {
   // `2>&1`/`>&2` saem antes da busca: o `&` deles cortaria o segmento.
   const visivel = mascararAspas(cmd).replace(/\d?>&\d/g, '    ')
   const re =
-    /(?:(?<![\w-])vitest(?![\w-])(?!\s+list(?![\w-]))|(?<![\w-])npm\s+(?:run\s+)?test(?![\w-])|(?<![\w-])pnpm\s+(?:run\s+)?test(?![\w-]))[^|;&]*\|(?!\|)/
-  return re.test(visivel)
+    /(?:(?<![\w-])vitest(?![\w.-])(?!\s+list(?![\w-]))|(?<![\w-])npm\s+(?:run\s+)?test(?![\w-])|(?<![\w-])pnpm\s+(?:run\s+)?test(?![\w-]))[^|;&]*\|(?!\|)/
+  const m = re.exec(visivel)
+  return m ? cmd.slice(m.index + m[0].length) : null
+}
+
+/**
+ * Saídas de referência do vitest para o 6v (calibração de 25/09, §4.2): a
+ * suíte com UMA falha e a suíte verde. O executor compara sem ANSI (NO_COLOR e
+ * strip_ansi), então a referência não tem cor.
+ */
+export const VITEST_COM_FALHA =
+  ' Test Files  1 failed | 2 passed (3)\n      Tests  1 failed | 5 passed (6)\n   Start at  10:00:00\n   Duration  1.00s'
+export const VITEST_VERDE = ' Test Files  3 passed (3)\n      Tests  6 passed (6)\n   Start at  10:00:00\n   Duration  1.00s'
+
+/** Os únicos comandos que o 6v roda sobre a saída de referência: filtros de texto. */
+const FILTROS_DE_TEXTO = new Set([
+  'grep', 'egrep', 'awk', 'sed', 'wc', 'head', 'tail', 'cat', 'tr', 'cut', 'sort', 'uniq',
+  'echo', 'printf', 'test', '[', 'true', 'false', ':',
+])
+
+export type LeituraDoVitest =
+  | { tipo: 'aprova_falha' }
+  | { tipo: 'so_verde' }
+  | { tipo: 'nunca_casa' }
+  | { tipo: 'indeterminado'; motivo: string }
+
+/** A comparação do harness (`lib.sh:criterio_match`): número = igualdade; senão igualdade ou grep -E. */
+function casaEspera(saida: string, espera: string, grep: string): boolean {
+  const o = saida.trim()
+  const e = espera.trim()
+  if (/^\d+$/.test(e)) return o === e
+  if (o === e) return true
+  return spawnSync(grep, ['-qE', '--', e], { input: o, encoding: 'utf8' }).status === 0
+}
+
+/**
+ * O critério aprovaria uma suíte com falha? (regra 6v, etapa 7d-1b.) Roda o
+ * trecho DEPOIS do pipe do vitest sobre as duas saídas de referência, como a
+ * calibração mediu. Só roda se o trecho for feito de filtros de texto, sem `$(`,
+ * crase e sem escrever arquivo, com PATH do sistema, em diretório temporário;
+ * senão é indeterminado — e indeterminado continua acusado.
+ */
+export function leituraDoVitest(cmd: string, espera: string, exec: ExecRegex): LeituraDoVitest | null {
+  let resto = jusanteDoVitest(cmd)
+  if (resto === null) return null
+  if (/\$\(|`/.test(resto)) return { tipo: 'indeterminado', motivo: 'o vitest está dentro de $( ) ou há subcomando depois dele' }
+  // O pipe pode estar dentro de `{ …; }` ou `( … )`: o fechamento sem abertura
+  // no trecho é do grupo de fora, e sai antes de rodar.
+  for (const [abre, fecha] of [['{', '}'], ['(', ')']] as const) {
+    let vis = mascararAspas(resto)
+    const conta = (c: string) => vis.split('').filter((x) => x === c).length
+    while (conta(fecha) > conta(abre)) {
+      const k = vis.lastIndexOf(fecha)
+      resto = resto.slice(0, k) + resto.slice(k + 1)
+      vis = mascararAspas(resto)
+    }
+  }
+  if (redirecionamentosProibidos(mascararAspas(resto)).length > 0) {
+    return { tipo: 'indeterminado', motivo: 'o trecho depois do vitest escreve arquivo' }
+  }
+  for (const seg of segmentarCmd(resto)) {
+    const ws = palavrasShell(seg).filter((w) => !['{', '}', '(', ')', '!'].includes(w) && !/^[A-Za-z_]\w*=/.test(w))
+    const nome = ws[0] === undefined ? '' : basename(ws[0])
+    if (nome === '' || nome === 'fi' || nome === 'done') continue
+    if (!FILTROS_DE_TEXTO.has(nome) || (nome === 'sed' && ws.some((w) => /^-[a-z]*i/.test(w))) || /system\s*\(/.test(seg)) {
+      return { tipo: 'indeterminado', motivo: `'${nome}' depois do vitest não é filtro de texto que o gate roda` }
+    }
+  }
+  const roda = (entrada: string) => {
+    const r = spawnSync('/bin/bash', ['-c', resto!], {
+      input: entrada,
+      encoding: 'utf8',
+      cwd: tmpdir(),
+      timeout: exec.timeoutMs,
+      env: { PATH: '/usr/bin:/bin', LC_ALL: 'C' },
+    })
+    if (r.error) throw new GateNaoRodou(`/bin/bash não rodou o trecho do 6v: ${r.error.message}`)
+    return `${r.stdout ?? ''}${r.stderr ?? ''}`
+  }
+  if (casaEspera(roda(VITEST_COM_FALHA), espera, exec.grep)) return { tipo: 'aprova_falha' }
+  if (casaEspera(roda(VITEST_VERDE), espera, exec.grep)) return { tipo: 'so_verde' }
+  return { tipo: 'nunca_casa' }
 }
 
 /** Caminho de arquivo (com extensão de código/dado) ou glob de diretório. */
@@ -462,7 +552,12 @@ export function caminhosForaDaAllowlist(objetivo: string, allowlist: string[]):
   return fora
 }
 
-export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
+/**
+ * `espera` (etapa 7d-1b) liga a leitura do 6v: com ela, só é acusado o critério
+ * que aprovaria uma suíte com falha (ou que o gate não consegue avaliar). Sem
+ * ela, vale a forma mínima de antes: saída textual do vitest em pipe.
+ */
+export function checarCmd(cmd: string, cfg: GateCfg, espera?: string): AchadoCmd[] {
   const achados: AchadoCmd[] = []
   const segmentos = segmentarCmd(cmd)
   const primeiro = segmentos[0] ?? ''
@@ -494,7 +589,18 @@ export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
       })
     }
   })
-  if (saidaTextualDoVitest(cmd)) {
+  const leitura = espera === undefined ? null : leituraDoVitest(cmd, espera, execRegexPadrao(cfg))
+  if (leitura?.tipo === 'aprova_falha') {
+    achados.push({
+      mensagem: `vitest: saída textual interpretada em vez do rc, e o critério aprovaria uma suíte com falha (com 'Tests 1 failed | 5 passed' a saída casa a espera '${espera}'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: ${cmd}`,
+      regra: '6v',
+    })
+  } else if (leitura?.tipo === 'indeterminado') {
+    achados.push({
+      mensagem: `vitest: saída textual interpretada em vez do rc, e não dá para saber se o critério aprovaria uma suíte com falha (${leitura.motivo}; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: ${cmd}`,
+      regra: '6v',
+    })
+  } else if (espera === undefined && saidaTextualDoVitest(cmd)) {
     achados.push({
       mensagem: `vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: ${cmd}`,
       regra: '6v',
@@ -1039,7 +1145,9 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
       if (typeof cr.cmd === 'string' && cr.cmd.trim() !== '') {
         // A isenção do `$(` segue a linha do padrão: `6a:$(` desligada não
         // isenta nem acusa.
-        for (const a of checarCmd(cr.cmd, cfg)) achado(a.regra, campo, a.mensagem, a.isencao === true)
+        for (const a of checarCmd(cr.cmd, cfg, cr.espera === undefined || cr.espera === null ? '' : String(cr.espera))) {
+          achado(a.regra, campo, a.mensagem, a.isencao === true)
+        }
         // 10. regex do critério contra os exemplos declarados (ticket 624).
         for (const a of achadosExemplosRegex(cr.cmd, cr.exemplos_regex, execRegexPadrao(cfg))) {
           achado(a.regra, `${campo}.exemplos_regex`, a.mensagem)
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index 29dd496..fd2a815 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -206,3 +206,40 @@ describe('7d1b-3 · check 6r: /tmp é fora da worktree; o `)` fecha o alvo do re
     ]);
   });
 });
+
+describe('7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com falha', () => {
+  const doCriterio = (v: Violacao[], i: number) => daRegra(v, '6v').filter((x) => x.campo === `criterios_aceite[${i}]`);
+
+  it("CI 015[6] (`grep -E 'Tests +[0-9]+ passed'`, espera passed): só casa sem falha, nenhum achado", () => {
+    expect(String((caso('CI', '015').ticket.criterios_aceite as Record<string, unknown>[])[6]!.cmd)).toMatch(/Tests \+\[0-9\]\+ pa/);
+    expect(doCriterio(rodar('CI', '015'), 6)).toEqual([]);
+  });
+
+  it("Comarka 057[2] (`grep -c 'failed'`, espera 0): leitura equivalente ao rc, nenhum achado", () => {
+    expect(doCriterio(rodar('Comarka', '057'), 2)).toEqual([]);
+  });
+
+  it('Actus 620 (grep em vitest.config.ts): não é o comando vitest', () => {
+    expect(daRegra(rodar('Actus', '620'), '6v')).toEqual([]);
+  });
+
+  it("Actus 001[1] (`grep -E 'passed|failed'`, espera passed): aprovaria a suíte vermelha, segue acusado", () => {
+    const v = doCriterio(rodar('Actus', '001'), 1);
+    expect(v.length).toBe(1);
+    expect(v[0]!.mensagem).toMatch(/aprovaria uma suíte com falha/);
+  });
+
+  it('Comarka 570[6] (vitest dentro de $( )): indeterminado, segue acusado', () => {
+    const v = doCriterio(rodar('Comarka', '570'), 6);
+    expect(v.length).toBe(1);
+    expect(v[0]!.mensagem).toMatch(/não dá para saber/);
+  });
+
+  it('pipeline com comando fora dos filtros de texto não é executado: indeterminado', () => {
+    const v = rodar('Actus', '001', (t) => {
+      const cr = (t.criterios_aceite as Record<string, unknown>[])[1]!;
+      cr.cmd = 'node_modules/.bin/vitest run a.test.ts 2>&1 | node -e "process.exit(0)" && echo passed';
+    });
+    expect(doCriterio(v, 1).map((x) => /não dá para saber/.test(x.mensagem))).toEqual([true]);
+  });
+});
~~~~

### 440b055 7d1b-3g: check 8 com fecho transitivo das dependências (C8 do comarka-operacional)

~~~~diff
commit 440b055fdf2754848bcd273a58061268ee15c7e0
Author: Lucas Santos
Date: Fri Sep 25 12:17:55 2026 -0300

7d1b-3g: check 8 com fecho transitivo das dependências (C8 do comarka-operacional)

Sobreposição de allowlist entre pendentes só é acusada se nenhum dos dois
alcança o outro pelas dependências, direta ou transitivamente (242 -> 241
-> 240 nunca rodam da mesma base). Só a direta marcava 3/15/119 done; com
o fecho, 0/14/77 — o número do C8 na calibração. Segue AVISO.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts      | 29 +++++++++++++++++++++++++----
 test/orquestrador-gate-correcoes.test.ts | 20 ++++++++++++++++++++
 2 files changed, 45 insertions(+), 4 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 64a1e20..eff1711 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -121,7 +121,7 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '6q': { severidade: 'aviso', oque: 'grep -q recebendo pipe', porque: '0/12/83 FP; causal 4 (Actus); o dano é do pipefail do executor' },
   '6b': { severidade: 'aviso', oque: 'objetivo cita caminho fora da allowlist', porque: '55/60/363 FP; causal 1 (488)' },
   '7': { severidade: 'erro', oque: 'dependência é id da fila ou humano:<token> (C7, dependência órfã)', porque: '0/0/0 FP depois de conferir as 19 do snapshot' },
-  '8': { severidade: 'aviso', oque: 'allowlist sobreposta com outro pendente sem dependência', porque: 'CORRIGIR → AVISO: 3/15/119 FP, 0 causal' },
+  '8': { severidade: 'aviso', oque: 'allowlist sobreposta com outro pendente sem dependência, nem transitiva (C8)', porque: 'era 3/15/119 FP só com a dependência direta; com o fecho (C8): 0/14/77 na calibração, 0 causal' },
   '9': { severidade: 'erro', oque: 'contexto_juiz existe na branch alvo e não está na allowlist', porque: '0/0/0 FP (só o Actus usa o campo)' },
   '9w': { severidade: 'aviso', oque: 'contexto_juiz coberto por glob da allowlist', porque: 'o caso do 501: referência que o ticket pode editar' },
   '10n': { severidade: 'aviso', oque: 'critério com regex sem exemplos_regex', porque: '56/45/499 FP, 0 causal; nenhum ticket anterior ao 624 declara exemplos' },
@@ -1187,17 +1187,38 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
   //    entre os dois. A doutrina (passo 5) manda que sobreposição de superfície
   //    vire dependência por ID: dois agentes na mesma linha do mesmo arquivo é
   //    conflito de merge garantido, e o segundo reprova por trabalho do primeiro.
+  //
+  //    Etapa 7d-1b (C8 do comarka-operacional): a dependência vale TRANSITIVA.
+  //    242 depende de 241, que depende de 240: os dois nunca rodam da mesma
+  //    base. Olhar só a direta marcava 3/15/119 done na calibração de 25/09.
   if (pendente && ehArray(t.pathspec_allowlist)) {
     const meus = new Set(t.pathspec_allowlist.map(String))
-    const minhasDeps = ehArray(t.dependencias) ? t.dependencias.map(String) : []
+    const deps = new Map<string, string[]>()
+    for (const f of fila) {
+      const o = f.json
+      if (!o || typeof o.id !== 'string') continue
+      deps.set(o.id, ehArray(o.dependencias) ? o.dependencias.map(String).filter((d) => !d.startsWith('humano:')) : [])
+    }
+    deps.set(id, ehArray(t.dependencias) ? t.dependencias.map(String).filter((d) => !d.startsWith('humano:')) : [])
+    const alcance = (de: string): Set<string> => {
+      const vistos = new Set<string>()
+      const pilha = [...(deps.get(de) ?? [])]
+      while (pilha.length > 0) {
+        const d = pilha.pop()!
+        if (vistos.has(d)) continue
+        vistos.add(d)
+        pilha.push(...(deps.get(d) ?? []))
+      }
+      return vistos
+    }
+    const meuAlcance = alcance(id)
     for (const outro of fila) {
       const o = outro.json
       if (!o || o.status !== 'pendente' || o.id === id || typeof o.id !== 'string') continue
       const dele = ehArray(o.pathspec_allowlist) ? o.pathspec_allowlist.map(String) : []
       const comuns = dele.filter((p) => meus.has(p))
       if (comuns.length === 0) continue
-      const depsDele = ehArray(o.dependencias) ? o.dependencias.map(String) : []
-      if (minhasDeps.includes(o.id) || depsDele.includes(id)) continue
+      if (meuAlcance.has(o.id) || alcance(o.id).has(id)) continue
       achado(
         '8',
         'pathspec_allowlist',
diff --git a/test/orquestrador-gate-correcoes.test.ts b/test/orquestrador-gate-correcoes.test.ts
index fd2a815..05fe973 100644
--- a/test/orquestrador-gate-correcoes.test.ts
+++ b/test/orquestrador-gate-correcoes.test.ts
@@ -243,3 +243,23 @@ describe('7d1b-3 · check 6v: só marca o critério que aprovaria uma suíte com
     expect(doCriterio(v, 1).map((x) => /não dá para saber/.test(x.mensagem))).toEqual([true]);
   });
 });
+
+describe('7d1b-3 · check 8 vira o C8: sobreposição sem dependência nem TRANSITIVA', () => {
+  it('CI 240 × 242 (242 depende do 241, que depende do 240): sem achado 8', () => {
+    expect(daRegra(rodar('CI', '240'), '8').map((x) => x.mensagem)).toEqual([]);
+  });
+
+  it('Actus 222 × 211 e Comarka 172 × 175: idem, pelo fecho', () => {
+    expect(daRegra(rodar('Actus', '222'), '8').map((x) => x.mensagem)).toEqual([]);
+    expect(daRegra(rodar('Comarka', '172'), '8').map((x) => x.mensagem)).toEqual([]);
+  });
+
+  it('sem caminho nenhum entre os dois, segue acusado (aviso, nomeando o path comum)', () => {
+    // O 211 alcança o 222 pelo 221 (211 -> 221 -> 222). Com outro id, o 221
+    // passa a depender de um ticket que não é este, e não sobra caminho.
+    const v = rodar('Actus', '222', (t) => (t.id = '299'));
+    const oito = daRegra(v, '8');
+    expect(oito.length).toBeGreaterThan(0);
+    expect(oito.every((x) => x.aviso && /sobrepõe o \d{3}[a-z0-9]* sem dependência declarada entre os dois/.test(x.mensagem))).toBe(true);
+  });
+});
~~~~

### 08aa971 7d1b-3h: severidade final das regras corrigidas pela matriz do corpus; o teste do corpus fica verde

~~~~diff
commit 08aa971631867ff626cbbd751d4ecf8b51e7538e
Author: Lucas Santos
Date: Fri Sep 25 12:21:30 2026 -0300

7d1b-3h: severidade final das regras corrigidas pela matriz do corpus; o teste do corpus fica verde

Matriz depois das correções (FP em (a) CI/Actus/Comarka): 2, 5t, 5c e
10x 0/0/0, seguem ERRO; 3 fica 0/0/1 (346a-lib-periodo-compartilhada, id
com o slug colado, que rodou e fechou) e vira AVISO; 6r 0/0/1, 6v 0/23/250
e 8 0/14/77 seguem AVISO, sem promoção. Nenhuma regra ERRO com FP.

Conserta também o orq-cli 'ticket torto', quebrado desde o 7d1b-3a
(fe505ce): o ticket da fixture só era torto por bloco e risco, que
deixaram de ser obrigatórios. Mesma asserção (rc 1 e a linha
arquivo:campo), com objetivo vazio.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts       | 2 +-
 test/orq-cli.test.ts                      | 7 +++++--
 test/orquestrador-gate-severidade.test.ts | 3 ++-
 3 files changed, 8 insertions(+), 4 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index eff1711..961f335 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -106,7 +106,7 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '1': { severidade: 'erro', oque: 'bloco ```json parseável', porque: '0/0/0 FP; sem JSON o executor não lê o ticket' },
   '2': { severidade: 'erro', oque: 'campo obrigatório de pendente (risco, se presente, é classe de risco)', porque: 'era 4/48/557 FP por risco e bloco, que o executor não lê; sem os dois: 0/0/0' },
   '2c': { severidade: 'aviso', oque: 'criterios_aceite ausente ou vazio', porque: '0/0/1 FP (Comarka 346a, done sem critério: o executor roda e o juiz decide)' },
-  '3': { severidade: 'erro', oque: 'id no formato e igual ao prefixo do arquivo', porque: 'CORRIGIR: 0/0/23 FP por ids de fatiamento (407a0)' },
+  '3': { severidade: 'aviso', oque: 'id no formato e igual ao prefixo do arquivo', porque: 'era 0/0/23 FP por ids de fatiamento (407a0); corrigida: 0/0/1 (346a-lib-periodo-compartilhada, id com o slug colado, que rodou e fechou) — com FP, não é ERRO' },
   '4': { severidade: 'erro', oque: 'status no vocabulário', porque: '0/0/0 FP' },
   '5t': { severidade: 'erro', oque: 'tipo do critério, quando presente, no vocabulário', porque: 'era 4/48/535 FP por tipo ausente, todo inferível; inferido: 0/0/0' },
   '5c': { severidade: 'erro', oque: 'cmd não vazio em critério que o executor roda', porque: 'era 0/0/192 FP por espera "avaliador" sem cmd; aceito: 0/0/0' },
diff --git a/test/orq-cli.test.ts b/test/orq-cli.test.ts
index 8ca6761..c947a8a 100644
--- a/test/orq-cli.test.ts
+++ b/test/orq-cli.test.ts
@@ -346,10 +346,13 @@ describe('orq validar — o gate de ticket, com o rc repassado', () => {
   });
 
   it('ticket torto: rc 1, e a linha nomeia arquivo e campo', () => {
-    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
+    // Etapa 7d-1b: bloco e risco deixaram de ser obrigatórios (calibração de
+    // 25/09), e eram eles que tornavam torto este ticket (a fixture preenche o
+    // resto). O torto agora é o objetivo vazio, campo que o executor lê.
+    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente', objetivo: '' }]);
     const r = orq(raiz, 'validar', '--pendentes');
     expect(r.rc).toBe(1);
-    expect(r.out).toMatch(/901-da-vez\.md:(bloco|risco) campo obrigatório/);
+    expect(r.out).toMatch(/901-da-vez\.md:objetivo campo obrigatório/);
   });
 
   it('--relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar)', () => {
diff --git a/test/orquestrador-gate-severidade.test.ts b/test/orquestrador-gate-severidade.test.ts
index 436bb6b..ec3de99 100644
--- a/test/orquestrador-gate-severidade.test.ts
+++ b/test/orquestrador-gate-severidade.test.ts
@@ -68,7 +68,8 @@ describe('7d1b-2 · a tabela única', () => {
       '1': 'erro',
       '2': 'erro',
       '2c': 'aviso',
-      '3': 'erro',
+      // 7d1b-3h: a correção do id deixou 1 FP (346a-lib-periodo-compartilhada).
+      '3': 'aviso',
       '4': 'erro',
       '5t': 'erro',
       '5c': 'erro',
~~~~

### 62a8461 7d1b-4: regras estáticas do validar-fila do comarka-operacional no gate de ticket

~~~~diff
commit 62a8461175ea803dd02909a288c9b76f6dc88efb
Author: Lucas Santos
Date: Fri Sep 25 12:31:36 2026 -0300

7d1b-4: regras estáticas do validar-fila do comarka-operacional no gate de ticket

Na severidade da calibração: C2c grep -c || echo (aviso), C2v espera
numérica com saída vazia possível (aviso; forma estática: test/[ antes do
número por &&), C2P grep -P (erro), C3 ausência ampla (aviso), C4 acento em
locale C (aviso), C9 topologia (aviso), C11 colisão de teste (aviso), C12
allowlist sem arquivo nem diretório pai (aviso). C7 é o check 7, que já
existia (ERRO). Nada executa critério: C1, C5 e C6 ficam para a próxima.

C4, C9, C11 e C12 leem o repositório por ContextoRepo (4º parâmetro de
validarTicket): em produção, git e disco do checkout da fila (branch_alvo
do config; os tickets da própria fila não contam como teste); no corpus,
os fatos da base de cada caso (arvores.json, acentos.json, gerados do git
dos três repos só leitura). Matriz: C2c 0/1/4 e C3 3/0/9 iguais à
calibração; C4 0/0/11; C11 22/24/122; C2v 36/0/0; C9 0/0/28.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/gate-ticket.ts            | 370 +++++++++++-
 test/fixtures/gate-corpus-7d1/acentos.json     |  10 +
 test/fixtures/gate-corpus-7d1/arvores.json     | 765 +++++++++++++++++++++++++
 test/fixtures/gate-corpus-7d1/contexto.ts      |  43 ++
 test/fixtures/gate-corpus-7d1/gerar-arvores.py |  93 +++
 test/orquestrador-gate-comarka.test.ts         | 196 +++++++
 test/orquestrador-gate-corpus.test.ts          |  19 +-
 test/orquestrador-gate-severidade.test.ts      |   9 +
 8 files changed, 1488 insertions(+), 17 deletions(-)
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
index 961f335..98247bb 100644
--- a/scripts/orquestrador/gate-ticket.ts
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -22,7 +22,7 @@
 import { spawnSync } from 'node:child_process'
 import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs'
 import { tmpdir } from 'node:os'
-import { basename, dirname, join, resolve } from 'node:path'
+import { basename, dirname, join, relative, resolve } from 'node:path'
 import { fileURLToPath } from 'node:url'
 import { globToRegExp } from './enforcement-core.js'
 
@@ -126,6 +126,14 @@ export const REGRAS: Readonly<Record<string, Regra>> = {
   '9w': { severidade: 'aviso', oque: 'contexto_juiz coberto por glob da allowlist', porque: 'o caso do 501: referência que o ticket pode editar' },
   '10n': { severidade: 'aviso', oque: 'critério com regex sem exemplos_regex', porque: '56/45/499 FP, 0 causal; nenhum ticket anterior ao 624 declara exemplos' },
   '10c': { severidade: 'erro', oque: '\\[ ou \\] dentro de classe [...]', porque: '0/0/0 FP (caso-origem 503)' },
+  'C2c': { severidade: 'aviso', oque: "grep -c … || echo com a saída indo direto ao resultado ('0 0')", porque: 'Comarka: 0/1/4 FP; causal 3 (CI 003, 407a0, 486); os FP são o mesmo defeito latente' },
+  'C2v': { severidade: 'aviso', oque: 'espera numérica com test/[ encadeado por && antes do número (saída vazia)', porque: 'Comarka (executado): 5/0/0 FP, 0 causal; aqui na forma estática' },
+  'C2P': { severidade: 'erro', oque: 'grep -P, que o /usr/bin/grep do macOS não tem', porque: '0 disparo em (a) e (b); erro de plataforma' },
+  'C3': { severidade: 'aviso', oque: 'ausência com padrão amplo sem exceção nem teto', porque: 'Comarka: 3/0/9 FP; causal 1 (523b)' },
+  'C4': { severidade: 'aviso', oque: 'regex que casa diferente em locale C e em UTF-8 (acento)', porque: 'Comarka: 0/0/12 FP, 0 causal; o kit roda sob launchd com a mesma exposição' },
+  'C9': { severidade: 'aviso', oque: 'item da allowlist no checkout e fora da branch alvo (topologia)', porque: 'Comarka: 0/1/0 FP, 0 causal' },
+  'C11': { severidade: 'aviso', oque: 'arquivo da allowlist citado em 1 a 4 testes fora dela (colisão de teste)', porque: 'Comarka: 9/4/122 FP; causal 4 (152, 161, 402, 277)' },
+  'C12': { severidade: 'aviso', oque: 'item sem extensão da allowlist sem arquivo nem diretório pai na branch alvo', porque: 'executor do Comarka: 0 disparo, sem dado' },
   '10x': { severidade: 'erro', oque: 'exemplos_regex contra o padrão do cmd', porque: 'era 0/8/0 FP, todos das aspas escapadas e do grep -v de comentário' },
 }
 
@@ -1052,13 +1060,341 @@ export function lerSeveridade(cru: unknown, origem: string): Record<string, Seve
   return out
 }
 
+// ─── Regras estáticas do comarka-operacional (etapa 7d-1b, peça 4) ─────────
+//
+// Portadas do `scripts/validar-fila.py` do comarka-operacional, a régua mais
+// madura da frota, só as que NÃO executam critério (C1, C5 e C6 ficam para a
+// etapa seguinte). A severidade é a da tabela `REGRAS`, pela calibração de
+// 25/09. C7 (dependência órfã) é o check 7 do kit, que já existia.
+
+/**
+ * O que as regras C4, C9, C11 e C12 precisam saber do repositório. Em produção
+ * vem do git e do disco do checkout que contém a fila (`contextoGit`); o corpus
+ * de calibração injeta os fatos gravados da base de cada caso.
+ */
+export interface ContextoRepo {
+  /** O caminho na branch alvo: arquivo, diretório, ausente (null) ou não sei (undefined). */
+  naAlvo(caminho: string): 'arquivo' | 'diretorio' | null | undefined
+  /** O caminho existe no checkout de onde a fila é lida (C9, topologia). */
+  noDisco(caminho: string): boolean
+  /** Arquivos de teste rastreados que citam o texto (C11, colisão de teste). */
+  testesQueCitam(texto: string): string[]
+  /** Palavras com letra acentuada do código do repo (C4). */
+  palavrasAcentuadas(): Set<string>
+}
+
+// Onde mora teste, em qualquer repo da frota: `test/` (Comarka), `apps/web/test/` (CI), `*.test.ts`.
+const RE_ARQ_TESTE = /(^|\/)(test|tests|__tests__)\/|\.(test|spec)\.[^/]*$/
+const PATHSPEC_TESTES = [':(glob)**/test/**', ':(glob)**/tests/**', ':(glob)**/__tests__/**', ':(glob)**/*.test.*', ':(glob)**/*.spec.*']
+
+/**
+ * O contexto real: o repositório que contém a fila, a `branch_alvo` do config
+ * para C9/C12 e o disco do checkout para C9, C11 e C4 (é o que o pre-commit do
+ * Comarka lê). Fora de repositório git, null: as regras de árvore não rodam.
+ */
+export function contextoGit(filaDir: string, cfg: GateCfg): ContextoRepo | null {
+  const r = spawnSync('git', ['-C', filaDir, 'rev-parse', '--show-toplevel'], { encoding: 'utf8' })
+  if (r.status !== 0) return null
+  const raiz = r.stdout.trim()
+  // Os tickets da própria fila não são teste, nem quando a fila mora dentro de
+  // um `test/` (as fixtures do kit): um ticket cita a própria allowlist.
+  const filaRel = relative(realpathSync(raiz), realpathSync(filaDir))
+  const branch = cfg.branch_alvo
+  const alvo = new Map<string, 'arquivo' | 'diretorio' | null | undefined>()
+  const testes = new Map<string, string[]>()
+  let palavras: Set<string> | null = null
+  return {
+    naAlvo(caminho) {
+      if (!branch) return undefined
+      if (!alvo.has(caminho)) {
+        const t = spawnSync('git', ['-C', raiz, 'cat-file', '-t', `${branch}:${caminho}`], { encoding: 'utf8' })
+        const v = spawnSync('git', ['-C', raiz, 'rev-parse', '--verify', '--quiet', `${branch}^{commit}`], { encoding: 'utf8' })
+        // branch que não existe: não sei (a regra não roda), nunca "ausente".
+        alvo.set(caminho, v.status !== 0 ? undefined : t.status !== 0 ? null : t.stdout.trim() === 'tree' ? 'diretorio' : 'arquivo')
+      }
+      return alvo.get(caminho)
+    },
+    noDisco: (caminho) => existsSync(join(raiz, caminho)),
+    testesQueCitam(texto) {
+      if (!testes.has(texto)) {
+        const g = spawnSync('git', ['-C', raiz, 'grep', '-l', '-F', '-e', texto, '--', ...PATHSPEC_TESTES], { encoding: 'utf8' })
+        const achados = g.status === 0 ? g.stdout.split('\n').filter(Boolean) : []
+        testes.set(texto, achados.filter((f) => filaRel === '' || !f.startsWith(`${filaRel}/`)))
+      }
+      return testes.get(texto)!
+    },
+    palavrasAcentuadas() {
+      if (palavras) return palavras
+      palavras = new Set()
+      const ls = spawnSync('git', ['-C', raiz, 'ls-files', '--', ':(glob)**/src/**/*.ts', ':(glob)**/src/**/*.tsx'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
+      for (const f of (ls.stdout ?? '').split('\n').filter(Boolean)) {
+        let txt = ''
+        try {
+          txt = readFileSync(join(raiz, f), 'utf8')
+        } catch {
+          continue
+        }
+        for (const w of txt.match(/[\p{L}\p{N}_]+/gu) ?? []) if (/[^\x00-\x7f]/.test(w)) palavras.add(w.toLowerCase())
+      }
+      return palavras
+    },
+  }
+}
+
+/**
+ * O cmd visto só no nível de topo do shell (`_nivel_topo` do Comarka): aspas
+ * viram Q, `$( … )` e crase viram S (a saída de dentro não vai direto para o
+ * resultado), e grupos `{ …; true; }` somem (o `true` fixa rc 0 e o `||`
+ * seguinte nunca dispara).
+ */
+export function nivelTopo(cmd: string): string {
+  const out: string[] = []
+  const n = cmd.length
+  let i = 0
+  while (i < n) {
+    const ch = cmd[i]!
+    if (ch === '\\' && i + 1 < n) {
+      out.push('x')
+      i += 2
+      continue
+    }
+    if (ch === "'") {
+      let j = cmd.indexOf("'", i + 1)
+      if (j < 0) j = n - 1
+      out.push('Q')
+      i = j + 1
+      continue
+    }
+    if (ch === '"') {
+      let j = i + 1
+      while (j < n && cmd[j] !== '"') j += cmd[j] === '\\' ? 2 : 1
+      out.push('Q')
+      i = j + 1
+      continue
+    }
+    if (ch === '`') {
+      let j = cmd.indexOf('`', i + 1)
+      if (j < 0) j = n - 1
+      out.push('S')
+      i = j + 1
+      continue
+    }
+    if (cmd.startsWith('$(', i)) {
+      let prof = 1
+      let j = i + 2
+      while (j < n && prof > 0) {
+        if (cmd[j] === "'") {
+          const k = cmd.indexOf("'", j + 1)
+          j = k < 0 ? n : k + 1
+          continue
+        }
+        if (cmd[j] === '(') prof++
+        else if (cmd[j] === ')') prof--
+        j++
+      }
+      out.push('S')
+      i = j
+      continue
+    }
+    out.push(ch)
+    i++
+  }
+  let topo = out.join('')
+  let anterior: string | null = null
+  while (anterior !== topo) {
+    anterior = topo
+    topo = topo.replace(/\{[^{}]*;\s*true\s*;?\s*\}/g, 'G')
+  }
+  return topo
+}
+
+/**
+ * C2c: `grep -c … || echo X` com a saída do grep indo direto para o resultado.
+ * Com zero matches o grep -c IMPRIME 0 e sai 1, o `||` dispara e imprime de
+ * novo: "0 0" (486[6] do Comarka), "0 ARQUIVO_AUSENTE" (407a0[3]), "0\n0" (003
+ * do CI).
+ */
+export function grepCOuEcho(cmd: string): boolean {
+  return /\bgrep\s+-[A-Za-z]*c[A-Za-z]*\b[^|;&]*\|\|\s*echo\b/.test(nivelTopo(cmd))
+}
+
+/**
+ * C2v (a forma estática do "espera numérica e saída vazia" do Comarka, que lá
+ * roda o cmd): espera numérica, e um `test`/`[` encadeado por `&&` antes do
+ * comando que imprime o número, sem `||` que dê saída quando o teste falha. Se
+ * o arquivo não existir, a saída é vazia e o critério reprova por forma, não
+ * por número (212, 229 e 234 do CI).
+ */
+export function saidaVaziaPossivel(cmd: string, espera: string): boolean {
+  if (!/^\d+$/.test(espera.trim())) return false
+  const topo = nivelTopo(cmd)
+  if (topo.includes('||')) return false
+  const elos = topo.split('&&')
+  return elos.length > 1 && elos.slice(0, -1).some((e) => /^\s*[{(]?\s*(test|\[\[?)\s/.test(e))
+}
+
+/** C2P: `grep -P` (ou `--perl-regexp`) — não existe no /usr/bin/grep do macOS. */
+export function grepPerl(cmd: string): boolean {
+  for (const seg of segmentarCmd(cmd)) {
+    const ws = palavrasShell(seg)
+    for (let i = 0; i < ws.length; i++) {
+      const nome = basename(ws[i]!)
+      if (nome !== 'grep' && nome !== 'egrep') continue
+      for (let j = i + 1; j < ws.length; j++) {
+        const w = ws[j]!
+        if (w === '--') break
+        if (w === '--perl-regexp') return true
+        if (w.startsWith('--')) continue
+        if (!w.startsWith('-') || w.length < 2) break
+        for (let k = 1; k < w.length; k++) {
+          if (w[k] === 'P') return true
+          if (OPCOES_GREP_COM_ARG.has(w[k]!)) {
+            if (k === w.length - 1) j++
+            break
+          }
+        }
+      }
+    }
+  }
+  return false
+}
+
+/** Padrão AMPLO de grep (C3): casa uso legítimo que o ticket não tem por que tocar. */
+const AMPLOS: [string, RegExp][] = [
+  ['NEXT_PUBLIC_', /NEXT_PUBLIC_(?![A-Z0-9])/],
+  ['process.env', /process\\*\.env(?!\\*\.[A-Za-z_]|\\*\[)/],
+  ['fetch', /(?<!git )\bfetch\b/],
+  ['import', /\bimport\b(?![^'"]*[/@])/],
+]
+/** Exceção ou teto declarado, na descrição ou no cmd. */
+const DECLARA = /EXCE[CÇ][AÃ]O|\bexce[cç][aã]o|\bEXCETO\b|\bexceto\b|\bteto\b|\bTETO\b|grep\s+-\w*v/
+
+/** Os padrões (entre aspas simples ou duplas) passados a cada grep do cmd, como o Comarka os lê. */
+function padroesGrepEntreAspas(cmd: string): { flags: string; padrao: string }[] {
+  const out: { flags: string; padrao: string }[] = []
+  for (const m of cmd.matchAll(/\bgrep\b((?:\s+-[A-Za-z]+)*)\s+(['"])(.*?)\2/g)) out.push({ flags: m[1] ?? '', padrao: m[3] ?? '' })
+  return out
+}
+
+/**
+ * C3: critério de AUSÊNCIA com padrão amplo e sem exceção nem teto declarado.
+ * Incidente 523b do Comarka (22/09): proibia `NEXT_PUBLIC_` no arquivo que já
+ * lia `NEXT_PUBLIC_SUPABASE_URL`; a tentativa 3 montou o nome com `.join("_")`.
+ */
+export function ausenciaAmpla(cmd: string, espera: string, descricao: string): string[] {
+  const ausencia =
+    espera.trim() === '0' || /^\s*AUS[EÊ]NCIA/i.test(descricao) || /=\s*"?0"?\s*\]|-eq\s+0\b|!\s*grep\b/.test(cmd)
+  if (!ausencia || DECLARA.test(descricao) || DECLARA.test(cmd)) return []
+  const achados: string[] = []
+  for (const { padrao } of padroesGrepEntreAspas(cmd)) {
+    for (const [nome, rx] of AMPLOS) if (rx.test(padrao) && !achados.includes(nome)) achados.push(nome)
+  }
+  return achados
+}
+
+const PALAVRA_PONTO = /(?<![\\\w.])([A-Za-z]{2,})((?:(?<!\\)\.){1,2})([A-Za-z]+)/g
+const NAO_ASCII = /[^\x00-\x7f]/
+
+/**
+ * C4: grep que casa diferente em locale C e em UTF-8 (incidente 533 do Comarka:
+ * o loop roda sob launchd sem LANG, onde `.` casa UM byte e acento tem dois).
+ *  1. `.` no lugar de letra acentuada (`Relat.rio`, contra o dicionário do repo)
+ *     ou `..` entre letras (`Implementa..o`);
+ *  2. acento dentro de `[...]`, ou acento com `grep -i` sem LC_ALL;
+ *  3. `wc -m` / `cut -c` sem LC_ALL.
+ */
+export function regexComAcento(cmd: string, palavras: () => Set<string>): string[] {
+  const achados: string[] = []
+  const temLc = cmd.includes('LC_ALL=')
+  for (const { flags, padrao } of padroesGrepEntreAspas(cmd)) {
+    const fixo = /-\w*F/.test(flags)
+    if (!fixo) {
+      for (const t of padrao.matchAll(PALAVRA_PONTO)) {
+        const [inteiro, esq, pontos, dir] = t as unknown as [string, string, string, string]
+        if (pontos.length === 2) {
+          achados.push(`'${inteiro}' usa '..' no lugar de letra acentuada`)
+          continue
+        }
+        const esc = (x: string) => x.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+        const rx = new RegExp(`${esc(esq)}[^\\x00-\\x7f]{1,2}${esc(dir)}`, 'u')
+        const ex = [...palavras()].sort().find((w) => rx.test(w))
+        if (ex) achados.push(`'${inteiro}' usa '.' no lugar de letra acentuada (casa '${ex}' só em UTF-8)`)
+      }
+    }
+    if (!NAO_ASCII.test(padrao)) continue
+    if (!fixo && /\[[^\]]*[^\x00-\x7f][^\]]*\]/.test(padrao)) achados.push(`'${padrao}' tem acento dentro de [...]`)
+    else if (!temLc && /-\w*i/.test(flags)) achados.push(`'${padrao}' tem acento com grep -i sem LC_ALL`)
+  }
+  if (!temLc && /\bwc\s+-\w*m|\bcut\s+-\w*c/.test(cmd)) achados.push('wc -m / cut -c sem LC_ALL: acento conta 2 caracteres em locale C')
+  return achados
+}
+
+const DICA_ACENTO =
+  "o loop roda em locale C, onde '.' casa 1 byte e acento tem 2 (533 do Comarka). Forma segura: âncora ASCII da mesma palavra, '.{1,2}' no lugar do acento, ou o literal acentuado sem -i e sem [...]"
+
+/** C9, C11 e C12: a allowlist contra a árvore. */
+function checarArvore(t: Cru, ctx: ContextoRepo, achado: (regra: string, campo: string, mensagem: string) => void, branch: string) {
+  const allow = ehArray(t.pathspec_allowlist) ? t.pathspec_allowlist.map(String) : []
+  const itens = allow.filter((p) => !p.includes('*') && !p.endsWith('/'))
+  const crs = ehArray(t.criterios_aceite) ? t.criterios_aceite : []
+  const blob = `${typeof t.objetivo === 'string' ? t.objetivo : JSON.stringify(t.objetivo ?? '')} ${crs
+    .map((c) => String(((c ?? {}) as Cru).cmd ?? ''))
+    .join(' ')}`
+  const cria = new Set(ehArray(t.cria_novo) ? t.cria_novo.map(String) : [])
+
+  // C9 — topologia (392a/393a/394a do Comarka, 16-17/09): o arquivo existe no
+  // checkout e não na branch de onde a worktree nasce. O ticket que DECLARA
+  // criar o caminho ("NOVO <caminho>") é esperado ausente.
+  for (const p of itens) {
+    if (blob.includes(`NOVO ${p}`) || blob.includes(`novo ${p}`)) continue
+    if (ctx.naAlvo(p) === null && ctx.noDisco(p)) {
+      achado('C9', 'pathspec_allowlist', `'${p}' existe no checkout mas não na branch alvo '${branch}' — ticket escrito contra árvore diferente da que o loop usa (mergeie antes de enfileirar)`)
+    }
+  }
+
+  // C11 — colisão de teste (HARDENING do Comarka, 24/09): o arquivo que o
+  // ticket toca é citado em 1 a 4 testes fora da allowlist. Basename curto
+  // (< 6) é ruído; mais de 4 testes é arquivo "hub", não pista.
+  for (const src of itens) {
+    if (RE_ARQ_TESTE.test(src) || cria.has(src)) continue
+    const nome = basename(src).replace(/\.[^.]*$/, '')
+    if (nome.length < 6) continue
+    const fora = ctx.testesQueCitam(nome).filter((tf) => !allow.includes(tf))
+    if (fora.length > 0 && fora.length <= 4) {
+      achado(
+        'C11',
+        'pathspec_allowlist',
+        `a allowlist toca ${src} (basename '${nome}'), citado em ${[...fora].sort().join(', ')} — fora da allowlist. Se a mudança quebrar esse teste, o executor não pode corrigi-lo: declare o teste na allowlist (com critério anti-afrouxamento) ou confirme que a mudança não o afeta`,
+      )
+    }
+  }
+
+  // C12 — allowlist sem arquivo e sem diretório pai (aviso_allowlist (c) do
+  // executor do Comarka): não parece arquivo novo a criar; o pathspec pode
+  // estar errado. Só item sem extensão, como lá.
+  for (const p of itens) {
+    const aqui = ctx.naAlvo(p)
+    if (aqui !== null || basename(p).includes('.')) continue
+    const pai = dirname(p)
+    if (pai === '.' || pai === '') continue
+    if (ctx.naAlvo(pai) === null) {
+      achado('C12', 'pathspec_allowlist', `'${p}' não casa arquivo nem diretório da branch alvo, e o diretório pai '${pai}' também não existe — confira se o pathspec está correto`)
+    }
+  }
+}
+
 /**
  * Valida UM ticket. `fila` é a fila inteira, necessária para os checks 7
- * (dependência por id existente) e 8 (sobreposição de allowlist).
+ * (dependência por id existente) e 8 (sobreposição de allowlist). `contexto`
+ * (etapa 7d-1b) é o repositório que C4, C9, C11 e C12 leem: ausente, o gate o
+ * monta do git do diretório da fila, só se alguma regra precisar; null, essas
+ * regras não rodam.
  */
-export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg): Violacao[] {
+export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg, contexto?: ContextoRepo | null): Violacao[] {
   const v: Violacao[] = []
   const arq = basename(alvo.arquivo)
+  let ctx = contexto
+  const obterCtx = (): ContextoRepo | null => (ctx === undefined ? (ctx = contextoGit(dirname(alvo.arquivo), cfg)) : ctx)
   // Todo achado passa por aqui: a tabela `REGRAS`, por cima dela o config,
   // decidem se ele é violação, aviso ou nada (etapa 7d-1b).
   const achado = (regra: string, campo: string, mensagem: string, isencao = false) => {
@@ -1152,6 +1488,24 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
         for (const a of achadosExemplosRegex(cr.cmd, cr.exemplos_regex, execRegexPadrao(cfg))) {
           achado(a.regra, `${campo}.exemplos_regex`, a.mensagem)
         }
+        // C2, C3, C4 do comarka-operacional (peça 4), só onde o executor roda.
+        if (!avaliador) {
+          const esp = cr.espera === undefined || cr.espera === null ? '' : String(cr.espera)
+          if (grepCOuEcho(cr.cmd)) {
+            achado('C2c', campo, "grep -c seguido de '|| echo' com a saída do grep indo direto para o resultado: com zero matches imprime duas vezes ('0 0', 486 do Comarka) — use '{ grep -c ...; true; }' ou compare dentro de $( )")
+          }
+          if (saidaVaziaPossivel(cr.cmd, esp)) {
+            achado('C2v', campo, `espera numérica ('${esp}'), mas um test/[ encadeado por && vem antes do número: se ele falhar a saída sai vazia e o critério reprova por forma, não por número`)
+          }
+          if (grepPerl(cr.cmd)) achado('C2P', campo, 'grep -P não existe no /usr/bin/grep do macOS — use -E')
+          const amplos = ausenciaAmpla(cr.cmd, esp, typeof cr.descricao === 'string' ? cr.descricao : '')
+          if (amplos.length > 0) {
+            achado('C3', campo, `ausência com padrão amplo (${amplos.join(', ')}) sem exceção nem teto medido — liste os usos legítimos que já existem (ex.: EXCETO NEXT_PUBLIC_SUPABASE_URL, teto 1); senão o executor escolhe entre reprovar e esconder (523b do Comarka)`)
+          }
+          for (const a of regexComAcento(cr.cmd, () => obterCtx()?.palavrasAcentuadas() ?? new Set())) {
+            achado('C4', campo, `${a} — ${DICA_ACENTO}`)
+          }
+        }
       }
     })
   }
@@ -1227,6 +1581,12 @@ export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg
     }
   }
 
+  // C9, C11, C12: a allowlist contra a árvore (peça 4).
+  if (pendente && ehArray(t.pathspec_allowlist)) {
+    const c = obterCtx()
+    if (c) checarArvore(t, c, (regra, campo, mensagem) => achado(regra, campo, mensagem), cfg.branch_alvo ?? '?')
+  }
+
   // 9. contexto_juiz — só em ticket pendente, como 5–8: é o que ainda vai rodar.
   if (pendente) for (const c of checarContextoJuiz(alvo, cfg)) achado(c.regra, c.campo, c.mensagem)
 
@@ -1284,8 +1644,8 @@ function checarContextoJuiz(alvo: TicketLido, cfg: GateCfg): Violacao[] {
   return v
 }
 
-export function validar(alvos: TicketLido[], fila: TicketLido[], cfg: GateCfg): Violacao[] {
-  return alvos.flatMap((a) => validarTicket(a, fila, cfg))
+export function validar(alvos: TicketLido[], fila: TicketLido[], cfg: GateCfg, contexto?: ContextoRepo | null): Violacao[] {
+  return alvos.flatMap((a) => validarTicket(a, fila, cfg, contexto))
 }
 
 // ─── CLI ──────────────────────────────────────────────────────────────────
diff --git a/test/fixtures/gate-corpus-7d1/acentos.json b/test/fixtures/gate-corpus-7d1/acentos.json
new file mode 100644
index 0000000..ceb9307
--- /dev/null
+++ b/test/fixtures/gate-corpus-7d1/acentos.json
@@ -0,0 +1,10 @@
+{
+ "CI": [],
+ "Actus": [],
+ "Comarka": [
+  "análise",
+  "análises",
+  "jurídico",
+  "reuniões"
+ ]
+}
\ No newline at end of file
diff --git a/test/fixtures/gate-corpus-7d1/contexto.ts b/test/fixtures/gate-corpus-7d1/contexto.ts
new file mode 100644
index 0000000..198b86e
--- /dev/null
+++ b/test/fixtures/gate-corpus-7d1/contexto.ts
@@ -0,0 +1,43 @@
+/**
+ * O contexto de repositório de um caso do corpus (etapa 7d-1b, peça 4): os
+ * fatos de árvore gravados por `gerar-arvores.py` em `arvores.json` e o
+ * dicionário de acento de `acentos.json`, na forma que o gate lê
+ * (`ContextoRepo`). Em produção o gate pergunta ao git e ao disco; aqui, aos
+ * fatos da base de cada caso. Caminho que o gerador não consultou é ausente.
+ */
+import { readFileSync } from 'node:fs';
+import { join } from 'node:path';
+import type { ContextoRepo } from '../../../scripts/orquestrador/gate-ticket.js';
+
+export interface CasoCorpus {
+  grupo: 'a' | 'b';
+  repo: 'CI' | 'Actus' | 'Comarka';
+  id: string;
+  arquivo: string;
+  classe?: string;
+  causa?: string;
+  ticket: Record<string, unknown>;
+  fila: Record<string, unknown>[];
+}
+
+interface Arvore {
+  alvo: Record<string, 'arquivo' | 'diretorio'>;
+  disco: string[];
+  testes: Record<string, string[]>;
+}
+
+const DIR = import.meta.dirname;
+const ARVORES = JSON.parse(readFileSync(join(DIR, 'arvores.json'), 'utf8')) as Record<string, Arvore>;
+const ACENTOS = JSON.parse(readFileSync(join(DIR, 'acentos.json'), 'utf8')) as Record<string, string[]>;
+
+export function contextoDoCorpus(c: CasoCorpus): ContextoRepo {
+  const a = ARVORES[`${c.grupo}:${c.repo}:${c.id}`] ?? { alvo: {}, disco: [], testes: {} };
+  const disco = new Set(a.disco);
+  const palavras = new Set(ACENTOS[c.repo] ?? []);
+  return {
+    naAlvo: (p) => a.alvo[p] ?? null,
+    noDisco: (p) => disco.has(p),
+    testesQueCitam: (texto) => a.testes[texto] ?? [],
+    palavrasAcentuadas: () => palavras,
+  };
+}
diff --git a/test/fixtures/gate-corpus-7d1/gerar-arvores.py b/test/fixtures/gate-corpus-7d1/gerar-arvores.py
new file mode 100644
index 0000000..a4ef1a7
--- /dev/null
+++ b/test/fixtures/gate-corpus-7d1/gerar-arvores.py
@@ -0,0 +1,93 @@
+"""Gera test/fixtures/gate-corpus-7d1/arvores.json e acentos.json (etapa 7d-1b,
+peça 4): os fatos de árvore que as regras C9, C11 e C12 e o C4 leem, para cada
+caso do corpus, tirados do git dos três repos, só leitura (GIT_OPTIONAL_LOCKS=0).
+
+  arvores.json  {"<grupo>:<repo>:<id>": {"alvo": {caminho: "arquivo"|"diretorio"},
+                                          "disco": [caminho...],
+                                          "testes": {texto: [arquivo de teste...]}}}
+     alvo   = a base do caso (a mesma da calibração: pai do merge em staging-auto,
+              ou staging-auto antes de T), para os itens da allowlist e os pais;
+     disco  = os itens da allowlist que existiam em main no instante E (C9), pela
+              cadeia de primeiro pai (o estado da main naquele instante, não um
+              commit do próprio ticket que o merge trouxe para o histórico);
+     testes = para cada basename (>= 6) de item da allowlist, os arquivos de teste
+              da base que o citam (git grep -l -F na base).
+  acentos.json  {"<repo>": [palavra acentuada...]}: as palavras do código atual
+              (**/src/**/*.ts e *.tsx) que casam algum `letra.letra` de grep do
+              corpus — o dicionário do C4, com a lacuna 4 da calibração (árvore atual).
+
+Uso: python3 gerar_arvores.py <dir-do-corpus>
+"""
+import json, os, re, subprocess, sys
+
+CAL = '/private/tmp/claude-501/-Users-lucasantos-Projetos-orquestrador-kit/0b216d2f-2289-42ab-b28d-ee83350fd5b2/scratchpad/cal'
+REPO = {k: os.path.expanduser(v) for k, v in {'CI': '~/Projetos/conteudos-infinitos', 'Actus': '~/Projetos/actus-saas', 'Comarka': '~/Projetos/comarka-operacional'}.items()}
+ENV = dict(os.environ, GIT_OPTIONAL_LOCKS='0')
+TESTES = [':(glob)**/test/**', ':(glob)**/tests/**', ':(glob)**/__tests__/**', ':(glob)**/*.test.*', ':(glob)**/*.spec.*']
+RE_TESTE = re.compile(r'(^|/)(test|tests|__tests__)/|\.(test|spec)\.')
+
+def git(repo, *a, inp=None):
+    return subprocess.run(['git', '-C', REPO[repo], *a], capture_output=True, text=True, env=ENV, input=inp)
+
+dirc = sys.argv[1]
+corpus = json.load(open(os.path.join(dirc, 'casos.json')))
+cal = {(c['grupo'], c['repo'], c['id']): c for c in json.load(open(f'{CAL}/casos.json'))}
+
+def tipos(repo, rev, caminhos):
+    if not rev or not caminhos: return {}
+    inp = ''.join(f'{rev}:{p}\n' for p in caminhos)
+    out = git(repo, 'cat-file', '--batch-check', inp=inp).stdout.splitlines()
+    res = {}
+    for p, l in zip(caminhos, out):
+        if l.endswith('missing') or l.endswith('ambiguous'): continue
+        t = l.split()[1] if len(l.split()) > 1 else ''
+        if t == 'blob': res[p] = 'arquivo'
+        elif t == 'tree': res[p] = 'diretorio'
+    return res
+
+arvores = {}
+for n, x in enumerate(corpus):
+    c = cal[(x['grupo'], x['repo'], x['id'])]
+    repo = x['repo']; base = c.get('base')
+    t = x['ticket']
+    allow = [p for p in (t.get('pathspec_allowlist') or []) if isinstance(p, str)]
+    itens = [p for p in allow if '*' not in p and not p.endswith('/')]
+    pais = sorted({os.path.dirname(p) or '.' for p in itens})
+    alvo = tipos(repo, base, sorted(set(itens) | set(pais)))
+    main_e = git(repo, 'rev-list', '-1', '--first-parent', f"--before={c.get('E', c['T'])}", 'main').stdout.strip()
+    disco = sorted(tipos(repo, main_e, itens).keys())
+    cria = set(t.get('cria_novo') or [])
+    testes = {}
+    for src in sorted(p for p in itens if not RE_TESTE.search(p) and p not in cria):
+        b = os.path.splitext(os.path.basename(src))[0]
+        if len(b) < 6 or b in testes or not base: continue
+        r = git(repo, 'grep', '-l', '-F', '-e', b, base, '--', *TESTES)
+        testes[b] = sorted(l.split(':', 1)[1] for l in r.stdout.splitlines() if ':' in l)
+    arvores[f"{x['grupo']}:{repo}:{x['id']}"] = {'alvo': alvo, 'disco': disco, 'testes': testes}
+    if n % 100 == 0: print(n, len(corpus), file=sys.stderr)
+
+# dicionário de acento: candidatos `letra.letra` dos grep do corpus
+PONTO = re.compile(r"(?<![\\\w.])([A-Za-z]{2,})((?:(?<!\\)\.){1,2})([A-Za-z]+)")
+cand = {r: [] for r in REPO}
+for x in corpus:
+    for cr in x['ticket'].get('criterios_aceite') or []:
+        if not isinstance(cr, dict): continue
+        for m in re.finditer(r"\bgrep\b((?:\s+-[A-Za-z]+)*)\s+(['\"])(.*?)\2", cr.get('cmd') or ''):
+            for tt in PONTO.finditer(m.group(3)):
+                if len(tt.group(2)) == 1:
+                    cand[x['repo']].append(re.compile(re.escape(tt.group(1).lower()) + r"[^\x00-\x7f]{1,2}" + re.escape(tt.group(3).lower())))
+acentos = {}
+for repo in REPO:
+    arqs = git(repo, 'ls-files', '--', ':(glob)**/src/**/*.ts', ':(glob)**/src/**/*.tsx').stdout.split()
+    palavras = set()
+    for f in arqs:
+        try: txt = open(os.path.join(REPO[repo], f), encoding='utf-8').read()
+        except (OSError, UnicodeDecodeError): continue
+        palavras.update(w.lower() for w in re.findall(r'\w+', txt) if re.search(r'[^\x00-\x7f]', w))
+    acentos[repo] = sorted(w for w in palavras if any(rx.search(w) for rx in cand[repo]))
+
+with open(os.path.join(dirc, 'arvores.json'), 'w') as f:
+    f.write('{\n' + ',\n'.join(f'{json.dumps(k)}: {json.dumps(v, ensure_ascii=False)}' for k, v in arvores.items()) + '\n}\n')
+with open(os.path.join(dirc, 'acentos.json'), 'w') as f:
+    json.dump(acentos, f, ensure_ascii=False, indent=1)
+print('arvores', len(arvores), 'acentos', {k: len(v) for k, v in acentos.items()})
diff --git a/test/orquestrador-gate-comarka.test.ts b/test/orquestrador-gate-comarka.test.ts
new file mode 100644
index 0000000..956fcab
--- /dev/null
+++ b/test/orquestrador-gate-comarka.test.ts
@@ -0,0 +1,196 @@
+/**
+ * Etapa 7d-1b, peça 4 — as regras estáticas do `validar-fila.py` do
+ * comarka-operacional, no gate de ticket do kit, na severidade da tabela da
+ * calibração de 25/09:
+ *
+ *   C2c  grep -c … || echo (aviso)          C3   ausência com padrão amplo (aviso)
+ *   C2v  espera numérica, saída vazia (aviso) C4  acento em locale C (aviso)
+ *   C2P  grep -P (erro)                     C7   dependência órfã (erro) = check 7
+ *   C9   topologia (aviso)                  C11  colisão de teste (aviso)
+ *   C12  allowlist sem arquivo nem diretório pai (aviso)
+ *
+ * Nada aqui executa critério: C1 (recon), C5 e C6 (critério contra a base)
+ * ficam para a próxima etapa.
+ *
+ * Os casos são os do corpus (`test/fixtures/gate-corpus-7d1`). C9, C11, C12 e o
+ * dicionário do C4 leem o repositório; no corpus, o contexto vem dos fatos
+ * gravados em `arvores.json` e `acentos.json` (a base de cada caso), e o gate
+ * recebe o contexto pelo 4º parâmetro de `validarTicket`.
+ */
+import { describe, it, expect } from 'vitest';
+import { execSync, spawnSync } from 'node:child_process';
+import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { REPO_ROOT } from './fixtures/orq-harness.js';
+import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
+import { contextoDoCorpus, type CasoCorpus } from './fixtures/gate-corpus-7d1/contexto.js';
+
+const DIR = join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1');
+const CASOS = JSON.parse(readFileSync(join(DIR, 'casos.json'), 'utf8')) as CasoCorpus[];
+const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));
+
+type Achado = Violacao & { regra?: string };
+
+function caso(grupo: string, repo: string, id: string): CasoCorpus {
+  const c = CASOS.find((x) => x.grupo === grupo && x.repo === repo && x.id === id);
+  if (!c) throw new Error(`caso ${grupo} ${repo} ${id} não está no corpus`);
+  return c;
+}
+
+function rodar(grupo: string, repo: string, id: string, ajuste: (t: Record<string, unknown>) => void = () => {}): Achado[] {
+  const c = caso(grupo, repo, id);
+  const t = structuredClone({ ...c.ticket, status: 'pendente' });
+  ajuste(t);
+  const dir = `/corpus-7d1/${c.repo}`;
+  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: t };
+  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
+  fila.push(alvo);
+  return (validarTicket as (...a: unknown[]) => Violacao[])(alvo, fila, CFG, contextoDoCorpus(c)) as Achado[];
+}
+
+const regra = (v: Achado[], r: string) => v.filter((x) => x.regra === r);
+const crit = (t: Record<string, unknown>) => t.criterios_aceite as Record<string, unknown>[];
+
+describe('7d1b-4 · C2 (forma do cmd)', () => {
+  it('C2c: CI 003 [5] e [6] (`grep -c … || echo 0` imprimia "0\\n0") — aviso', () => {
+    const v = regra(rodar('b', 'CI', '003'), 'C2c');
+    expect(v.map((x) => x.campo)).toEqual(['criterios_aceite[5]', 'criterios_aceite[6]']);
+    expect(v.every((x) => x.aviso)).toBe(true);
+  });
+
+  it('C2c: Comarka 486 e 407a0, com causa; e `{ grep -c …; true; }` não acusa', () => {
+    expect(regra(rodar('b', 'Comarka', '486'), 'C2c').length).toBeGreaterThan(0);
+    expect(regra(rodar('b', 'Comarka', '407a0'), 'C2c').length).toBeGreaterThan(0);
+    const v = rodar('b', 'CI', '003', (t) => {
+      for (const c of crit(t)) c.cmd = '{ grep -c x src/a.ts || true; }';
+    });
+    expect(regra(v, 'C2c')).toEqual([]);
+  });
+
+  it('C2v: CI 212 (`test -f X && grep -c …`, espera 1): se o teste falhar a saída sai vazia — aviso', () => {
+    const v = regra(rodar('a', 'CI', '212'), 'C2v');
+    expect(v.map((x) => x.campo)).toContain('criterios_aceite[1]');
+    expect(v.every((x) => x.aviso)).toBe(true);
+    // com fallback (`|| echo 0`) ou espera não numérica, não é o caso
+    const semVazio = rodar('a', 'CI', '212', (t) => {
+      for (const c of crit(t)) if (typeof c.cmd === 'string') c.cmd = `${c.cmd} || echo 0`;
+    });
+    expect(regra(semVazio, 'C2v')).toEqual([]);
+  });
+
+  it('C2P: grep -P é ERRO (não existe no /usr/bin/grep); arquivo com -P no nome não é a opção', () => {
+    const v = rodar('a', 'CI', '212', (t) => {
+      crit(t)[0]!.cmd = "grep -cP '\\d+' src/a.ts";
+      crit(t)[1]!.cmd = "grep -c 'x' src/foo-Page.tsx";
+      crit(t)[2]!.cmd = "grep --perl-regexp -c 'y' src/b.ts";
+    });
+    const p = regra(v, 'C2P');
+    expect(p.map((x) => [x.campo, x.aviso ?? false])).toEqual([
+      ['criterios_aceite[0]', false],
+      ['criterios_aceite[2]', false],
+    ]);
+  });
+});
+
+describe('7d1b-4 · C3 e C4 (o que o padrão casa)', () => {
+  it('C3: Comarka 523b (proibia NEXT_PUBLIC_ no arquivo inteiro) — aviso', () => {
+    const v = regra(rodar('b', 'Comarka', '523b'), 'C3');
+    expect(v.length).toBeGreaterThan(0);
+    expect(v[0]!.mensagem).toMatch(/NEXT_PUBLIC_/);
+    expect(v.every((x) => x.aviso)).toBe(true);
+  });
+
+  it("C4: Comarka 391a ('Jur.dico' casa 'jurídico' só em UTF-8) e 243 (acento com grep -i sem LC_ALL) — aviso", () => {
+    const a = regra(rodar('b', 'Comarka', '391a'), 'C4');
+    expect(a.map((x) => x.mensagem).join(' ')).toMatch(/'Jur\.dico' usa '\.' no lugar de letra acentuada \(casa 'jurídico'/);
+    const b = regra(rodar('a', 'Comarka', '243'), 'C4');
+    expect(b.map((x) => x.mensagem).join(' ')).toMatch(/acento com grep -i sem LC_ALL/);
+    expect([...a, ...b].every((x) => x.aviso)).toBe(true);
+  });
+});
+
+describe('7d1b-4 · C7 (dependência órfã) é o check 7', () => {
+  it('Actus 431 (dependência 430, cujo arquivo não existe mais hoje, lida do git): sem achado', () => {
+    expect(regra(rodar('b', 'Actus', '431'), '7')).toEqual([]);
+  });
+
+  it('dependência que não é id da fila: ERRO', () => {
+    const v = regra(rodar('b', 'Actus', '431', (t) => (t.dependencias = ['999'])), '7');
+    expect(v.map((x) => [x.mensagem, x.aviso ?? false])).toEqual([["'999' não é id de ticket da fila nem 'humano:<token>'", false]]);
+  });
+});
+
+describe('7d1b-4 · C9, C11 e C12 (o ticket contra a árvore)', () => {
+  // A calibração marcou o Actus 502 comparando main e staging-auto no instante
+  // da escrita; na BASE da execução (pai do merge) o arquivo já existia. O
+  // corpus usa a base, que é o que a worktree viu: o C9 dele é o Comarka 057.
+  it("C9: Comarka 057 ('src/lib/carteira/ranking.ts' está na main e não na base da execução) — aviso", () => {
+    const v = regra(rodar('a', 'Comarka', '057'), 'C9');
+    expect(v.map((x) => x.mensagem).join(' ')).toMatch(/'src\/lib\/carteira\/ranking\.ts' existe no checkout mas não na branch alvo/);
+    expect(v.every((x) => x.aviso)).toBe(true);
+    expect(regra(rodar('a', 'Actus', '502'), 'C9')).toEqual([]);
+  });
+
+  it('C9: o ticket que declara "NOVO <caminho>" não é acusado por ele', () => {
+    const v = rodar('a', 'Comarka', '057', (t) => {
+      t.objetivo = `${String(t.objetivo)} NOVO src/lib/carteira/ranking.ts`;
+    });
+    expect(regra(v, 'C9').map((x) => x.mensagem).join(' ')).not.toMatch(/ranking\.ts'/);
+  });
+
+  it('C11: Comarka 402 (vercel.json citado em 3 testes fora da allowlist) — aviso, nomeando os testes', () => {
+    const v = regra(rodar('b', 'Comarka', '402'), 'C11');
+    expect(v.length).toBe(1);
+    expect(v[0]!.aviso).toBe(true);
+    expect(v[0]!.mensagem).toMatch(/vercel\.json .*test\/crons-meta-consolidacao\.test\.ts/);
+  });
+
+  it('C11: teste que já está na allowlist não conta', () => {
+    const v = rodar('b', 'Comarka', '402', (t) => {
+      (t.pathspec_allowlist as string[]).push(
+        'test/crons-meta-consolidacao.test.ts',
+        'test/n8n-fase1.test.ts',
+        'test/n8n-fase2.test.ts',
+      );
+    });
+    expect(regra(v, 'C11')).toEqual([]);
+  });
+
+  it('C12: item sem extensão que não existe e cujo diretório pai também não — aviso; pai existente não acusa', () => {
+    const v = rodar('b', 'Comarka', '402', (t) => {
+      (t.pathspec_allowlist as string[]).push('nao/existe/pasta', 'test/pasta-nova');
+    });
+    expect(regra(v, 'C12').map((x) => [x.mensagem.split(' ')[0], x.aviso])).toEqual([["'nao/existe/pasta'", true]]);
+  });
+});
+
+describe('7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila', () => {
+  it('repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda', () => {
+    const raiz = mkdtempSync(join(tmpdir(), 'orq-ctx-'));
+    const sh = (c: string) => execSync(c, { cwd: raiz, stdio: 'pipe' });
+    mkdirSync(join(raiz, 'docs', 'fila'), { recursive: true });
+    mkdirSync(join(raiz, 'src'), { recursive: true });
+    mkdirSync(join(raiz, 'test'), { recursive: true });
+    writeFileSync(join(raiz, 'src', 'calculadora.ts'), 'export const x = 1\n');
+    writeFileSync(join(raiz, 'test', 'calculadora-soma.test.ts'), "import '../src/calculadora'\n");
+    const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'fixture', 'docs', 'fila', '000-config.json'), 'utf8'));
+    cfg.branch_alvo = 'staging-auto';
+    writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg));
+    sh('git init -q -b main . && git add -A && git -c user.email=t@t -c user.name=t commit -qm base && git branch staging-auto');
+    // main anda sem a branch alvo: src/novo.ts só existe no checkout
+    writeFileSync(join(raiz, 'src', 'novo.ts'), 'export const y = 2\n');
+    const t = {
+      id: '901', slug: 'ctx', status: 'pendente', objetivo: 'mexe na calculadora',
+      pathspec_allowlist: ['src/calculadora.ts', 'src/novo.ts', 'lib/inexistente/pasta'], dependencias: [],
+      criterios_aceite: [{ tipo: 'alvo', descricao: 'c', cmd: 'test -f src/calculadora.ts && echo ok', espera: 'ok' }],
+    };
+    writeFileSync(join(raiz, 'docs', 'fila', '901-ctx.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(t)}\n\`\`\`\n`);
+    sh('git add -A && git -c user.email=t@t -c user.name=t commit -qm main-anda');
+    const r = spawnSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), [join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts'), '--fila', join(raiz, 'docs', 'fila'), '--pendentes'], { encoding: 'utf8' });
+    expect(r.status, r.stderr).toBe(0);
+    expect(r.stdout).toMatch(/901-ctx\.md:pathspec_allowlist AVISO \(C9\): 'src\/novo\.ts' existe no checkout mas não na branch alvo 'staging-auto'/);
+    expect(r.stdout).toMatch(/AVISO \(C11\): a allowlist toca src\/calculadora\.ts \(basename 'calculadora'\), citado em test\/calculadora-soma\.test\.ts/);
+    expect(r.stdout).toMatch(/AVISO \(C12\): 'lib\/inexistente\/pasta' não casa arquivo nem diretório da branch alvo/);
+  });
+});
diff --git a/test/orquestrador-gate-corpus.test.ts b/test/orquestrador-gate-corpus.test.ts
index dee1881..9f30cd0 100644
--- a/test/orquestrador-gate-corpus.test.ts
+++ b/test/orquestrador-gate-corpus.test.ts
@@ -10,6 +10,9 @@
  *   (a) os done que nunca bloquearam e rodaram no loop (CI 58, Actus 91,
  *       Comarka 557 desde 26/07) — todo disparo é FP por definição.
  *
+ * `arvores.json`/`acentos.json` (peça 4) são os fatos de árvore da base de cada
+ * caso que C4, C9, C11 e C12 leem (`contexto.ts`).
+ *
  * `fila` de cada caso é a fila no instante T reduzida ao que os checks 7 e 8
  * leem: as dependências (com o fecho), os pendentes com allowlist em comum e o
  * fecho deles. As 19 dependências cujo arquivo não existe mais hoje foram
@@ -28,17 +31,7 @@ import { readFileSync } from 'node:fs';
 import { join } from 'node:path';
 import { REPO_ROOT } from './fixtures/orq-harness.js';
 import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
-
-interface Caso {
-  grupo: 'a' | 'b';
-  repo: 'CI' | 'Actus' | 'Comarka';
-  id: string;
-  arquivo: string;
-  classe?: string;
-  causa?: string;
-  ticket: Record<string, unknown>;
-  fila: Record<string, unknown>[];
-}
+import { contextoDoCorpus, type CasoCorpus as Caso } from './fixtures/gate-corpus-7d1/contexto.js';
 
 const CASOS = JSON.parse(
   readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1', 'casos.json'), 'utf8'),
@@ -85,7 +78,9 @@ function rodarCaso(c: Caso): Violacao[] {
   const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: { ...c.ticket, status: 'pendente' } };
   const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
   fila.push(alvo);
-  return validarTicket(alvo, fila, CFG);
+  // Peça 4: C4, C9, C11 e C12 leem o repositório; no corpus, os fatos gravados
+  // da base de cada caso (arvores.json, acentos.json).
+  return validarTicket(alvo, fila, CFG, contextoDoCorpus(c));
 }
 
 interface Celula {
diff --git a/test/orquestrador-gate-severidade.test.ts b/test/orquestrador-gate-severidade.test.ts
index ec3de99..50ed553 100644
--- a/test/orquestrador-gate-severidade.test.ts
+++ b/test/orquestrador-gate-severidade.test.ts
@@ -90,6 +90,15 @@ describe('7d1b-2 · a tabela única', () => {
       '10n': 'aviso',
       '10c': 'erro',
       '10x': 'erro',
+      // peça 4: as regras estáticas do comarka-operacional (C7 é o check 7)
+      C2c: 'aviso',
+      C2v: 'aviso',
+      C2P: 'erro',
+      C3: 'aviso',
+      C4: 'aviso',
+      C9: 'aviso',
+      C11: 'aviso',
+      C12: 'aviso',
     });
   });
 
~~~~

### da51053 7d1b-5: critérios e gates rodam com NO_COLOR=1 e FORCE_COLOR=0

~~~~diff
commit da510539a022baef8aba8d74b3c0bc86ba005f11
Author: Lucas Santos
Date: Fri Sep 25 12:34:16 2026 -0300

7d1b-5: critérios e gates rodam com NO_COLOR=1 e FORCE_COLOR=0

Os gates herdavam o ambiente de quem chamou o executor: com FORCE_COLOR ou
CI nele, o vitest colore o placar ('Tests \e[22m \e[1m\e[32m2 passed') e
um gate que lê o placar com grep reprova com a suíte verde. O gates.ts
agora roda com NO_COLOR=1 FORCE_COLOR=0; o run_criterios, que já exportava
NO_COLOR=1, ganha FORCE_COLOR=0 (supports-color/chalk ignoram NO_COLOR).

test-sem-cor.sh: executor real, vitest real, FORCE_COLOR=1 no ambiente.
Vermelho no gate (FALHA test, exit 1); o critério já passava antes, pelo
NO_COLOR=1 de sempre. Controle: sem NO_COLOR o vitest colore mesmo.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/kit/test-shell.sh            |  5 ++-
 scripts/orquestrador/executor.sh     | 12 ++++-
 scripts/orquestrador/test-sem-cor.sh | 86 ++++++++++++++++++++++++++++++++++++
 3 files changed, 100 insertions(+), 3 deletions(-)
diff --git a/scripts/kit/test-shell.sh b/scripts/kit/test-shell.sh
index 06ab7d6..67da390 100644
--- a/scripts/kit/test-shell.sh
+++ b/scripts/kit/test-shell.sh
@@ -43,6 +43,9 @@
 #   test-tentativas-persistidas.sh  o contador já está no arquivo quando o processo morre; done zera (f3aaa89, casos novos)
 #   test-orq-pause.sh               --off/--status tratam as duas sentinelas; trilha PAUSA/RETOMADA; orq retomar com o legado (514)
 #
+# E os da etapa 7d-1b:
+#   test-sem-cor.sh                 critérios e gates rodam com NO_COLOR=1 e FORCE_COLOR=0 (vitest real, peça 5)
+#
 # Cada um monta o PRÓPRIO `ORQ_EXEC_ROOT` num `mktemp -d` (drenagem e retry) ou
 # trabalha direto no checkout (lib-config); nada aqui precisa exportar
 # `ORQ_EXEC_ROOT` por fora — fazer isso sobrescreveria o isolamento que cada
@@ -57,7 +60,7 @@
 set -uo pipefail
 
 KIT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
-SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh test-painel-visao.sh test-painel-detalhe.sh test-painel-pausa.sh test-painel-alarmes.sh test-painel-lento.sh test-gate-prevoo.sh test-tentativas-persistidas.sh test-orq-pause.sh'
+SCRIPTS='test-lib-config.sh test-drenagem.sh test-retry-worktree.sh test-drenagem-sem-progresso.sh test-sem-progresso-limite.sh test-ocioso.sh test-rc-executor.sh test-ambiente.sh test-causa-adiamento.sh test-ambiente-adiado.sh test-adiamentos-limite.sh test-reprovado-sub.sh test-notificacao-ambiente.sh test-reabertura-humana.sh test-painel-visao.sh test-painel-detalhe.sh test-painel-pausa.sh test-painel-alarmes.sh test-painel-lento.sh test-gate-prevoo.sh test-tentativas-persistidas.sh test-orq-pause.sh test-sem-cor.sh'
 
 FX="$(bash "$KIT/scripts/kit/fixture.sh")" || {
   printf 'ERRO: fixture.sh falhou — nada foi rodado\n' >&2; exit 2
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 711bebd..14b851d 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -451,7 +451,11 @@ run_criterios() {
     # Ticket 625: o rc do COMANDO do critério agora é guardado (antes o pipe com
     # strip_ansi e o `|| true` o descartavam). A saída comparada é a mesma.
     tmp_out="$(mktemp)"; rc_cmd=0
-    ( cd "$wt" && export BASE_REF="$CFG_BRANCH_ALVO" NO_COLOR=1 && eval "$cmd" ) > "$tmp_out" 2>&1 || rc_cmd=$?
+    # Etapa 7d-1b: FORCE_COLOR=0 junto do NO_COLOR=1. O vitest (tinyrainbow)
+    # obedece NO_COLOR; quem segue supports-color/chalk ignora NO_COLOR e só
+    # desliga com FORCE_COLOR=0. Os dois, sempre: a cor entra no pipeline do
+    # critério antes do strip_ansi, que só limpa o resultado final.
+    ( cd "$wt" && export BASE_REF="$CFG_BRANCH_ALVO" NO_COLOR=1 FORCE_COLOR=0 && eval "$cmd" ) > "$tmp_out" 2>&1 || rc_cmd=$?
     out="$(strip_ansi < "$tmp_out" || true)"; rm -f "$tmp_out"
     printf '### %s\ncmd: %s\nespera: %s\nsaida: %s\n\n' "$desc" "$cmd" "$esp" "$out" >> "$rundir/criterios.txt"
     if criterio_match "$out" "$esp"; then
@@ -1029,7 +1033,11 @@ run_attempt() {
   fase gates
   # Ticket 626: executa NA worktree, lê o config da MAIN (fonte única, a mesma
   # de papel_marca, decisao-cli.ts e juiz.ts).
-  "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" --config "$MAIN_CHECKOUT/docs/fila/000-config.json" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
+  # Etapa 7d-1b: os gates rodam SEM COR, como os critérios. Herdavam o ambiente
+  # de quem chamou o executor, e com FORCE_COLOR ou CI nele o vitest colore o
+  # placar ("Tests \e[22m \e[1m\e[32m2 passed"): gate que lê o placar com grep
+  # reprovava com a suíte verde (test-sem-cor.sh).
+  NO_COLOR=1 FORCE_COLOR=0 "${ORQ_TSX[@]}" "$ORQ_LIB_DIR/gates.ts" --run-cli "$wt" --config "$MAIN_CHECKOUT/docs/fila/000-config.json" > "$rundir/gates.txt" 2>&1 || gates_rc=$?
   log "  gates: $([ "$gates_rc" = 0 ] && echo APROVADO || echo "REPROVADO (rc=$gates_rc)")"
   grep -qi 'reexecutar' "$rundir/gates.txt" && log "  gates: interrompidos — conjunto não vale parcialmente"
   # Peça 7b-2: o PAPEL do gate que reprovou vai para o decisao.ts, que separa
diff --git a/scripts/orquestrador/test-sem-cor.sh b/scripts/orquestrador/test-sem-cor.sh
new file mode 100755
index 0000000..7f4e8ba
--- /dev/null
+++ b/scripts/orquestrador/test-sem-cor.sh
@@ -0,0 +1,86 @@
+#!/usr/bin/env bash
+# test-sem-cor.sh — critérios e gates rodam sem cor (etapa 7d-1b, peça 5).
+#
+# O vitest 2.x colore a saída quando FORCE_COLOR (qualquer valor, inclusive 0)
+# ou CI estão no ambiente e NO_COLOR não está (tinyrainbow). Colorido, o placar
+# chega como "Tests \e[22m \e[1m\e[32m2 passed", e um `grep -E 'Tests +[0-9]+
+# passed'` DENTRO do comando não casa: o strip_ansi do executor só limpa a saída
+# depois que o pipeline inteiro já rodou. Foi o 016 do conteudos-infinitos
+# (vitest 4 com cor).
+#
+# O run_criterios já exportava NO_COLOR=1 (executor.sh:454); os GATES herdavam
+# o ambiente de quem chamou o executor. Agora os dois rodam com NO_COLOR=1 e
+# FORCE_COLOR=0 — NO_COLOR desliga o vitest; FORCE_COLOR=0 desliga quem segue o
+# supports-color/chalk, que ignora NO_COLOR.
+#
+# Executor DE VERDADE (test-fixture-executor.sh), vitest REAL do node_modules do
+# checkout, rodando um projeto de dois testes num tmp; o ambiente de quem chama
+# tem FORCE_COLOR=1:
+#   1 · o gate `vitest run | grep -cE 'Tests +[0-9]+ passed'` passa;
+#   2 · o critério com o mesmo pipeline, espera 1, passa;
+#   3 · controle: o mesmo vitest com FORCE_COLOR=1 e sem NO_COLOR colore mesmo
+#       (senão o caso não prova nada).
+#
+# Uso: bash scripts/orquestrador/test-sem-cor.sh
+
+set -uo pipefail
+AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
+
+export ORQ_TESTE=1
+ORQ_EXEC_ROOT="$(mktemp -d)/checkout"; export ORQ_EXEC_ROOT
+TMP_RAIZ="$(dirname "$ORQ_EXEC_ROOT")"
+source "$AQUI/test-fixture-executor.sh"
+trap 'fxe_limpa; rm -rf "$TMP_RAIZ"' EXIT
+
+FALHAS=0
+ok()    { printf '  ok    %s\n' "$*"; }
+falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
+
+VITEST="$FXE_NM/.bin/vitest"
+[ -x "$VITEST" ] || { echo "ERRO: $VITEST ausente — o teste precisa do vitest do checkout"; exit 2; }
+
+fxe_novo '.max_retries = 0'
+VT="$FXE/vt"
+mkdir -p "$VT"
+printf "import { it, expect } from 'vitest'\nit('a', () => expect(1).toBe(1))\nit('b', () => expect(2).toBe(2))\n" > "$VT/a.test.ts"
+echo 'export default {}' > "$VT/vitest.config.mjs"
+PIPE="cd '$VT' && '$VITEST' run 2>&1 | grep -cE 'Tests +[0-9]+ passed'"
+
+echo "== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest =="
+cru="$(cd "$VT" && env -u NO_COLOR FORCE_COLOR=1 "$VITEST" run 2>&1 | grep -a 'Tests ' || true)"
+case "$cru" in
+  *$'\e['*) ok "o placar sai com escape ANSI" ;;
+  *) falha "o vitest não coloriu com FORCE_COLOR=1 — o caso não prova nada: $cru" ;;
+esac
+
+# O gate de testes do fixture passa a ser o pipeline que lê o placar.
+fxe_gate test "$PIPE"
+# O critério do ticket 901 passa a ser o mesmo pipeline, espera 1.
+f="$FXE/repo/docs/fila/$FXE_ID-t.md"
+awk '/^```json$/{f=1;next} f&&/^```$/{exit} f' "$f" \
+  | jq --arg c "$PIPE" '.criterios_aceite[0].cmd = $c | .criterios_aceite[0].espera = "1"' > "$FXE/ticket.json" \
+  && { printf '# %s\n\n```json\n' "$FXE_ID"; cat "$FXE/ticket.json"; printf '```\n'; } > "$f"
+grep -q '"espera": "1"' "$f" || { echo "ERRO: não consegui trocar o critério do ticket"; exit 2; }
+git -C "$FXE/repo" commit -qam "fixture: critério lê o placar do vitest"
+
+echo
+echo "== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor =="
+export FORCE_COLOR=1
+unset NO_COLOR
+fxe_roda
+unset FORCE_COLOR
+att="$(dirname "$(ls "$FXE/repo/docs/fila/runs/$FXE_ID"/attempt-*/gates.txt 2>/dev/null | head -1)")"
+if [ ! -f "$att/gates.txt" ]; then
+  falha "o executor não chegou aos gates: $(tail -5 "$FXE/saida")"
+else
+  grep -qE '^ok +test' "$att/gates.txt" \
+    && ok "gate 'test' aprovado com o placar lido por grep" \
+    || falha "gate 'test' reprovado: $(grep -E '^(ok|FALHA)' "$att/gates.txt" | tr '\n' ' ')"
+  awk '/^### o arquivo existe/{f=1} f && /^saida:/{print; exit}' "$att/criterios.txt" | grep -qx 'saida: 1' \
+    && ok "critério: saída '1' (o placar casou)" \
+    || falha "critério: $(awk '/^### /{f=1} f && /^saida:/{print; exit}' "$att/criterios.txt")"
+fi
+
+echo
+if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
+echo "$FALHAS CHECK(S) FALHARAM"; exit 1
~~~~

### b72e3bc 7d1b-7: GATE_TICKET_AVISO uma vez por ticket e por versão do conteúdo

~~~~diff
commit b72e3bcc1a9b1adbcac7b78c90202baed0d786f3
Author: Lucas Santos
Date: Fri Sep 25 12:37:53 2026 -0300

7d1b-7: GATE_TICKET_AVISO uma vez por ticket e por versão do conteúdo

No modo_pre_voo 'aviso' o evento saía a cada drenagem que passava pelo
ticket. Agora carrega hash=<12 hex> da versão (o bloco JSON sem status,
notas_status, tentativas, adiamentos_ambiente e adiado_ate, que o loop
reescreve) e não repete se a trilha já tem o aviso dessa versão. O log da
drenagem continua listando as violações toda vez.

test-gate-prevoo.sh caso 9: duas drenagens seguidas com o ticket adiado
entre elas = um evento; o ticket editado = versão nova, segundo evento.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 scripts/orquestrador/executor.sh         | 13 ++++++-
 scripts/orquestrador/test-gate-prevoo.sh | 64 ++++++++++++++++++++++++++++++++
 2 files changed, 76 insertions(+), 1 deletion(-)
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 14b851d..b558044 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -1308,7 +1308,18 @@ drive_ticket() {
   if [ "$gate_rc" = 1 ] && [ "$modo_pv" = aviso ]; then
     log "AVISO do gate de ticket ($n_viol violação(ões)) — modo 'aviso': o ticket segue"
     printf '%s\n' "$gate_out" | sed 's/^/  /' | while IFS= read -r l; do log "$l"; done
-    event "$id" GATE_TICKET_AVISO "violacoes=$n_viol"
+    # UMA vez por versão do ticket (etapa 7d-1b). Antes a trilha ganhava um
+    # GATE_TICKET_AVISO a cada drenagem que passava pelo ticket, e o mesmo aviso
+    # repetido é o que ensina a não ler a trilha. A versão é o hash do bloco JSON
+    # SEM os campos que o próprio loop reescreve (status, nota, tentativas,
+    # adiamentos): editar o ticket gera versão nova e aviso novo.
+    local versao
+    versao="$(ticket_json "$file" | jq -S -c 'del(.status, .notas_status, .tentativas, .adiamentos_ambiente, .adiado_ate)' 2>/dev/null | shasum -a 256 | cut -c1-12)"
+    if grep -F " $id GATE_TICKET_AVISO " "$EVENTS_FILE" 2>/dev/null | grep -qE " hash=$versao( |\$)"; then
+      log "  gate de ticket: aviso desta versão já está na trilha (hash=$versao) — não repete"
+    else
+      event "$id" GATE_TICKET_AVISO "violacoes=$n_viol" "hash=$versao"
+    fi
     gate_rc=0
   fi
   case "$gate_rc" in
diff --git a/scripts/orquestrador/test-gate-prevoo.sh b/scripts/orquestrador/test-gate-prevoo.sh
index 8942c71..9a8e106 100644
--- a/scripts/orquestrador/test-gate-prevoo.sh
+++ b/scripts/orquestrador/test-gate-prevoo.sh
@@ -26,6 +26,10 @@
 #   8 · etapa 7d-1b: modo 'bloqueia' com ticket que só tem AVISO pela tabela de
 #       severidade (grep -q em pipe e vitest por texto, rebaixados pela
 #       calibração de 25/09): executa, nada bloqueia.
+#   9 · etapa 7d-1b: modo 'aviso', DUAS drenagens seguidas com o ticket
+#       adiado entre elas (o loop reescreve status, nota e tentativas): UM
+#       GATE_TICKET_AVISO, com o hash da versão; o ticket editado (outro cmd)
+#       é versão nova e ganha o seu.
 #
 # Etapa 7d-1b: o RUIM dos casos 1, 3 e 5 era o critério com `| grep -q` e saída
 # textual do vitest. As duas regras viraram AVISO (calibração), e o ticket com
@@ -293,6 +297,66 @@ else
   rm -rf "$(dirname "$fx")"
 fi
 
+echo
+echo "== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket =="
+fx="$(fixture_repo aviso)"
+if [ -z "$fx" ]; then
+  falha "não consegui montar o fixture"
+else
+  # O agente falso ADIA (causa local, sem cooldown): o ticket volta a pendente
+  # e o loop reescreve status, notas_status e tentativas — campos que não são
+  # a versão do ticket.
+  STUB_ADIA='
+    source "$AQUI_T/executor.sh"
+    set +e
+    ticket_commit() { return 0; }
+    cooldown_arm() { return 0; }
+    run_attempt() {
+      local rundir="$3"
+      mkdir -p "$rundir"
+      echo "ENTRADA $(ticket_field "$1" ".id")"
+      RESULT=adiado; MOTIVO="timeout local"; ENF_OK=1; DUR=1; DIFF_LINES=0; AGENTE_RC=124
+      printf "{\"desfecho\":\"adiado\",\"causa\":\"timeout\",\"motivo\":\"timeout local\",\"contaComoRetry\":false,\"cooldown\":false}\n" > "$rundir/veredito.json"
+    }
+    drive_ticket "$(ticket_file_by_id "$TID_T")"
+    echo "RC_DRIVE=$?"
+  '
+  disparo() {
+    ORQ_EXEC_ROOT="$fx" LOCAL_LOOP_SOURCED=1 AQUI_T="$AQUI" STUB_T="$STUB_ADIA" bash -c '
+      source "$AQUI_T/local-loop.sh"
+      set +e
+      ensure_staging_worktree() { echo /tmp; }
+      ticket_commit() { return 0; }
+      merge_em_alvo() { return 0; }
+      cleanup_frente() { return 0; }
+      run_executor_once() {
+        ORQ_EXEC_ROOT="$ORQ_EXEC_ROOT" EXECUTOR_SOURCED=1 AQUI_T="$AQUI_T" \
+          TID_T="$(ticket_field "$2" ".id")" bash -c "$STUB_T"
+      }
+      drenar
+    ' 2>&1
+  }
+  ev="$fx/docs/fila/runs/events.log"
+  d1="$(disparo)"; d2="$(disparo)"
+  n_pv="$(printf '%s\n%s\n' "$d1" "$d2" | grep -c 'AVISO do gate de ticket')"
+  [ "$n_pv" -ge 2 ] && ok "o 901 passou pelo pré-voo nos dois disparos ($n_pv)" \
+    || falha "o pré-voo não rodou nos dois disparos ($n_pv): $(printf '%s' "$d2" | tail -3)"
+  [ "$(campo "$fx/docs/fila/901-t.md" '.status')" = pendente ] \
+    && ok "o 901 segue pendente (adiado)" || falha "status=$(campo "$fx/docs/fila/901-t.md" '.status')"
+  n_ev="$(grep -c ' 901 GATE_TICKET_AVISO ' "$ev" 2>/dev/null || true)"
+  [ "$n_ev" = 1 ] && ok "UM GATE_TICKET_AVISO na trilha em dois disparos" \
+    || falha "$n_ev eventos GATE_TICKET_AVISO: $(grep ' 901 GATE_TICKET_AVISO ' "$ev" 2>/dev/null)"
+  grep -qE ' 901 GATE_TICKET_AVISO violacoes=[1-9][0-9]* hash=[0-9a-f]{12}$' "$ev" 2>/dev/null \
+    && ok "o evento carrega o hash da versão" || falha "evento sem hash: $(grep ' 901 GATE_TICKET_AVISO ' "$ev" 2>/dev/null)"
+  # Versão nova: outro cmd de critério (ainda com o eval). Terceiro disparo.
+  sed -i.bak 's|eval \\"echo ok\\"|eval \\"echo ok\\" \&\& true|' "$fx/docs/fila/901-t.md" && rm -f "$fx/docs/fila/901-t.md.bak"
+  grep -q '&& true' "$fx/docs/fila/901-t.md" || falha "não consegui editar o 901"
+  disparo > /dev/null
+  n_ev="$(grep -c ' 901 GATE_TICKET_AVISO ' "$ev" 2>/dev/null || true)"
+  [ "$n_ev" = 2 ] && ok "o 901 editado é versão nova: segundo GATE_TICKET_AVISO" || falha "$n_ev eventos depois da edição"
+  rm -rf "$(dirname "$fx")"
+fi
+
 echo
 if [ "$FALHAS" = 0 ]; then echo "TODOS OS CHECKS PASSARAM"; exit 0; fi
 echo "$FALHAS CHECK(S) FALHARAM"; exit 1
~~~~

### ea63c8c 7d1b-8: CHANGELOG, PECAS e CONTRATO da etapa 7d-1b, com os shas

~~~~diff
commit ea63c8c1310ac5d72ea7bf5df3777c33eff28d45
Author: Lucas Santos
Date: Fri Sep 25 12:41:50 2026 -0300

7d1b-8: CHANGELOG, PECAS e CONTRATO da etapa 7d-1b, com os shas

CONTRATO §2 (id com sufixo de fatiamento, bloco e risco opcionais, tipo
inferido, sobreposição transitiva, severidade), §4 (GATE_TICKET_AVISO com
hash= e uma vez por versão) e §12 (tabela de severidade, regras corrigidas,
regras do Comarka, execução sem cor, chave gate_ticket.severidade).
config-chaves e config-tabela com as linhas atuais do motor.

doutrina-v2.test.ts (decisão 4) cobrava 'risco basta EXISTIR' no CONTRATO:
a asserção passa a cobrar o texto novo, com a mesma força; a SKILL, fora do
escopo de escrita, ainda diz que o gate cobra a chave — pendência no PECAS.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


 CHANGELOG.md                          | 48 +++++++++++++++++++
 CONTRATO.md                           | 87 ++++++++++++++++++++++++++++++-----
 docs/PECAS.md                         | 32 +++++++++++++
 scripts/orquestrador/config-chaves.ts |  4 +-
 scripts/orquestrador/config-tabela.ts |  2 +-
 test/doutrina-v2.test.ts              | 11 +++--
 6 files changed, 165 insertions(+), 19 deletions(-)
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 9fc44c3..7445498 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -765,3 +765,51 @@ CONTRATO §11. Uma peça por commit, suíte inteira verde em cada um.
 Testes do kit ajustados, sem afrouxar asserção: arames de contagem (chamadas `ORQ_TSX`,
 desfechos nomeados 9 → 13, causas e rótulos 7 → 8), o formato do TOTAL do `--relatorio`,
 um `cmd` de exemplo que lia a saída do vitest, e a entrada do caso C citada acima.
+
+### Etapa 7d-1b · severidade por regra e calibração do gate de ticket (25/09/2026)
+
+Aplica a tabela de decisão da calibração de 25/09
+(`~/orq-sessoes/levantamento-7d1-calibracao.md` §5): ERRO só com zero falso positivo
+nos done dos três repos, e o comarka-operacional é a régua. CONTRATO §12.
+
+- **7d1b-1** `960d8e6`: corpus `test/fixtures/gate-corpus-7d1/` (os 57 bloqueados por
+  spec, com a causa, e os 706 done da calibração, só com os campos que o gate lê; a fila
+  no instante T reduzida ao contexto dos checks 7 e 8) e
+  `orquestrador-gate-corpus.test.ts`, que imprime a matriz (VP em (b), FP em (a), por
+  regra e por repo) e reprova regra ERRO com FP. Nasceu vermelho, com a matriz da
+  calibração reproduzida regra a regra.
+- **7d1b-2** `635ddd3`: tabela única `REGRAS` no `gate-ticket.ts` (erro, aviso, off),
+  `gate_ticket.severidade` no config (template `{}`, `--migrar`, config-chaves); todo
+  achado diz a regra; o rc, e o `modo_pre_voo` `bloqueia`, só contam ERRO.
+  `6a:$(` off; `6a:rm `/`bash`/`sh -c`, `6q`, `6b`, `10n`, `6r`, `6v`, `8` aviso.
+- **7d1b-3a** `fe505ce`: check 2 sem `bloco` e `risco` obrigatórios; critérios ausentes
+  viram a regra `2c` (aviso: o 346a do Comarka rodou sem critério).
+- **7d1b-3b** `2b49f34`: check 3 aceita `407a0`/`315b1b`, também no `lerFila`.
+- **7d1b-3c** `74fffeb`: check 5 infere o tipo ausente e aceita cmd vazio no critério
+  `espera: "avaliador"`.
+- **7d1b-3d** `1d942d7`: check 10x compara o exemplo com o padrão que o shell entrega
+  (ou como está escrito entre as aspas de fora), prova com o padrão real e dispensa
+  exemplo no `grep -v`.
+- **7d1b-3e** `e6bd065`: check 6r aceita `/tmp/*` e fecha o alvo no `)`.
+- **7d1b-3f** `394c241`: check 6v só acusa o critério que aprovaria uma suíte com falha.
+- **7d1b-3g** `440b055`: check 8 com o fecho transitivo das dependências (C8).
+- **7d1b-3h** `08aa971`: severidade final pela matriz: `3` vira aviso (0/0/1, o
+  `346a-lib-periodo-compartilhada`); o teste do corpus fica verde.
+- **7d1b-4** `62a8461`: regras estáticas do `validar-fila.py` do Comarka: C2c, C2v, C2P
+  (erro), C3, C4, C9, C11, C12 (aviso); C7 é o check 7. C4/C9/C11/C12 leem o repo por
+  `ContextoRepo` (git e disco em produção; fatos da base no corpus).
+- **7d1b-5** `da51053`: `run_criterios` e `gates.ts` com `NO_COLOR=1 FORCE_COLOR=0`
+  (`test-sem-cor.sh`, vitest real).
+- **7d1b-6** (sem commit de código): medição do `pipefail` nos 2492 `cmd` de inspeção
+  pura do corpus: 280 mudam de rc, nenhum muda a saída nem o veredito (relatório).
+- **7d1b-7** `b72e3bc`: `GATE_TICKET_AVISO` uma vez por ticket e por versão
+  (`hash=` do bloco JSON sem os campos que o loop reescreve).
+- **7d1b-8**: este registro, `docs/PECAS.md` e CONTRATO §2, §4 e §12.
+
+Matriz final do corpus (FP em (a) CI/Actus/Comarka): nenhuma regra ERRO com FP. Testes
+antigos ajustados com asserção de mesma força: a isenção do `$(` com `6a:$(` ligada pelo
+config; o 6v do 903 como aviso; o RUIM do `test-gate-prevoo.sh` com `eval`; `risco`
+ausente e a lista `CAMPOS_PENDENTE`; a mensagem do id `9z1`; a mensagem da regra 2 do
+624; o "ticket torto" do `orq-cli.test.ts` (quebrado desde o 3a, consertado no 3h); a
+asserção do CONTRATO em `doutrina-v2.test.ts` (a SKILL ainda diz que o gate cobra a
+chave `risco`: pendência de doutrina, fora do escopo de escrita).
diff --git a/CONTRATO.md b/CONTRATO.md
index 7808f0d..1030cbb 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -95,25 +95,32 @@ três: `gate-ticket.ts:blocoJson` (`:99`), `fila-read.ts:extractJsonBlock` e
 
 O que o gate cobra hoje (`scripts/orquestrador/gate-ticket.ts`):
 
-- `id` casa `^\d{3}[a-z]?$` (`RE_ID`, `gate-ticket.ts:61`) **e** é igual ao
-  prefixo do nome do arquivo (`:398`). O sufixo de letra existe: `001a`, `309a`.
+- `id` casa `^\d{3}[a-z0-9]*$` (`RE_ID`, `gate-ticket.ts:76`) **e** é igual ao
+  prefixo do nome do arquivo. O sufixo existe: `001a`, `309a`, e o de fatiamento
+  `407a0`, `315b1b` (etapa 7d-1b; regra `3`, aviso, §12).
 - `status` ∈ `pendente · em_execucao · done · bloqueado · obsoleto · refatiar`
   (`STATUS_VALIDOS`, `:28`).
-- Campos obrigatórios **só para `pendente`** (`CAMPOS_PENDENTE`, `:46`): `id`,
-  `slug`, `bloco`, `objetivo`, `pathspec_allowlist`, `dependencias`,
-  `criterios_aceite`, `status`, `risco`. Status terminal (`done`, `obsoleto`,
+- Campos obrigatórios **só para `pendente`** (`CAMPOS_PENDENTE`, `:58`): `id`,
+  `slug`, `objetivo`, `pathspec_allowlist`, `dependencias`,
+  `criterios_aceite`, `status`. `bloco` e `risco` são opcionais desde a etapa
+  7d-1b; `criterios_aceite` ausente ou vazio é a regra `2c` (aviso, §12). Status terminal (`done`, `obsoleto`,
   `bloqueado`) só precisa parsear: a fila tem dezenas escritos sob schemas
   anteriores, e cobrar campo de quem já entregou não é gate, é ruído.
 - `dependencias` basta ser lista — `[]` é o caso NORMAL. Cada item é `id` de
   outro ticket (resolve quando `done`) ou `humano:<token>` (§6).
-- `risco` basta EXISTIR; se tiver valor, ∈ `baixo · alto` (vazio até o passo 6
-  do gate classificar) (`:381-386`).
-- `criterios_aceite[].tipo` ∈ `alvo · guarda · avaliador` (`TIPOS_CRITERIO`,
-  `:59`). Cada critério tem `tipo`, `cmd`, `espera`, `descricao`.
+- `risco` é opcional; se tiver valor, ∈ `baixo · alto` (vazio até o passo 6
+  do gate classificar).
+- `criterios_aceite[].tipo`, quando presente, ∈ `alvo · guarda · avaliador`
+  (`TIPOS_CRITERIO`); ausente, é inferido (`espera: "avaliador"` = avaliador, o
+  resto = alvo). `cmd` pode ser vazio só no critério `espera: "avaliador"`, que o
+  executor não roda.
 - `criterios_aceite[].cmd` só com prefixo de `gate_ticket.cmd_prefixos_permitidos`
   e sem nada de `gate_ticket.proibido_no_cmd`.
-- Allowlist sobreposta entre dois `pendente` exige dependência declarada entre
-  eles (`:445-461`).
+- Allowlist sobreposta entre dois `pendente` pede dependência entre eles,
+  direta ou transitiva (regra `8`, aviso desde a etapa 7d-1b, §12).
+- Cada regra tem severidade `erro`, `aviso` ou `off` (tabela `REGRAS`,
+  `gate-ticket.ts:105`, sobrescrevível por `gate_ticket.severidade`); o rc do
+  gate, e o pré-voo em modo `bloqueia`, só contam `erro` (§12).
 
 ---
 
@@ -187,7 +194,7 @@ Estes, e só estes, são emitidos hoje (`grep -rn '^\s*event ' scripts/`):
 | `COMMIT_HARNESS` | `executor.sh:commit_do_agente` | `motivo=agente-saiu-sem-commitar` · ou `motivo=agente-commitou-e-deixou-N-arquivo(s)-solto(s)` / `motivo=agente-commitou-e-deixou-mudança-não-commitada` (631, §11) |
 | `DECISAO_PENDENTE` | `lib.sh:744` | `origem=` |
 | `ANOTACAO` | `lib.sh:274` | `nota=` |
-| `GATE_TICKET_AVISO` | `executor.sh:drive_ticket` (porte do Actus, §11) | `violacoes=<N>` — o pré-voo achou violação e `gate_ticket.modo_pre_voo` é `aviso`: o ticket SEGUE |
+| `GATE_TICKET_AVISO` | `executor.sh:drive_ticket` (porte do Actus, §11) | `violacoes=<N>` `hash=<12 hex>` — o pré-voo achou violação e `gate_ticket.modo_pre_voo` é `aviso`: o ticket SEGUE. Uma vez por ticket e por versão (`hash` do bloco JSON sem `status`, `notas_status`, `tentativas`, `adiamentos_ambiente`, `adiado_ate`; etapa 7d-1b, §12) |
 | `PREVOO_NOGO` | `local-loop.sh:prevoo_ou_sai` | `item=cat.0\|cat.1\|cat.6` |
 | `OCIOSO` | `local-loop.sh:drenar` (peça 7a-4) | `pendentes=` e um `<id>=<razão>` por pendente; ver abaixo |
 | `AMBIENTE` | `local-loop.sh:drenar` (peça 7a-8) | `tickets=<id>,<id>` `causa=<normalizada>` (a causa vai até o fim da linha); ver abaixo |
@@ -935,6 +942,62 @@ o legado vira `PAUSAR` pelo `--migrar`.
 | `politica_retry.por_causa.arquivo_solto` | `{modelo: MANTER, acao: "remover o arquivo solto da worktree"}` | `decisao.ts:decidirRetry` |
 | `politica_adiamento.causas_que_adiam` | + `"falha de ambiente da worktree"` (o `--migrar` acrescenta no fim de uma lista que já exista: `ITENS_NOVOS` da `config-tabela.ts`) | `decisao.ts:ROTULO_PARA_CAUSA` |
 
+## 12. Etapa 7d-1b: severidade por regra e calibração do gate de ticket (25/09/2026)
+
+A régua é a calibração de 25/09 (`~/orq-sessoes/levantamento-7d1-calibracao.md`
+§5): ERRO só com ZERO falso positivo nos done dos três repos. O corpus dela
+está em `test/fixtures/gate-corpus-7d1/` (57 bloqueados por spec, com a causa,
+e 706 done), e `test/orquestrador-gate-corpus.test.ts` reprova se uma regra
+ERRO marcar um done.
+
+### 12.1 Severidade
+
+Tabela única `REGRAS` (`gate-ticket.ts:105`). `erro` é violação (rc 1, e o
+pré-voo em `bloqueia` bloqueia); `aviso` sai na saída com `AVISO (<regra>):` e
+nunca bloqueia; `off` não é avaliada. `gate_ticket.severidade` no config
+sobrescreve por regra (`{"6q": "erro", "6a:rm ": "off"}`); valor fora de
+`erro|aviso|off` ou regra desconhecida é falha alta (rc 2). Chave `_*` é
+comentário.
+
+| Severidade | Regras |
+|---|---|
+| `erro` | `1` json, `2` campos, `4` status, `5t` tipo presente fora do vocabulário, `5c` cmd vazio em critério que roda, `5e` espera vazia, `6a` crase/`eval`/`sudo`/`curl`/`wget` (e padrão sem linha própria), `7` dependência órfã (= C7), `9` contexto_juiz, `10c` colchete escapado em classe, `10x` exemplo × padrão, `C2P` `grep -P` |
+| `aviso` | `2c` critérios ausentes, `3` id, `6a:rm `, `6a:bash`, `6a:sh -c`, `6r` redirecionamento, `6v` vitest por texto, `6q` `grep -q` em pipe, `6b` objetivo fora da allowlist, `8` sobreposição (fecho transitivo = C8), `9w`, `10n` sem exemplos, `C2c` `grep -c … \|\| echo`, `C2v` saída vazia, `C3` ausência ampla, `C4` acento em locale C, `C9` topologia, `C11` colisão de teste, `C12` allowlist sem arquivo nem pai |
+| `off` | `6a:$(` |
+
+### 12.2 Regras corrigidas
+
+`2` sem `bloco` e `risco`; `3` aceita `[a-z0-9]*` (também no `lerFila`); `5t`
+infere o tipo; `5c` aceita o avaliador sem cmd; `6r` aceita `/tmp/*` e fecha o
+alvo no `)`; `6v` só acusa o critério que aprovaria uma suíte com falha
+(roda o trecho depois do pipe sobre uma saída de referência com
+`Tests  1 failed | 5 passed`, só com filtros de texto; indeterminado continua
+acusado); `8` usa o fecho transitivo das dependências; `10x` aceita o exemplo
+como o shell entrega o padrão OU como ele está escrito entre as aspas de fora,
+prova positivo e negativo com o padrão real, e dispensa exemplo no `grep -v`.
+
+### 12.3 Regras do comarka-operacional
+
+Portadas do `validar-fila.py` sem executar critério (C1, C5 e C6 ficam para a
+etapa seguinte). C4, C9, C11 e C12 leem o repositório por `ContextoRepo`
+(`validarTicket`, 4º parâmetro): em produção, `contextoGit` usa a
+`branch_alvo` do config (C9, C12) e o disco do checkout da fila (C9, C11, e o
+dicionário de palavras acentuadas de `**/src/**/*.ts(x)` para o C4). Fora de
+repositório git, essas regras não rodam; branch alvo inexistente = C9/C12 não
+rodam. Os tickets da própria fila não contam como teste no C11.
+
+### 12.4 Execução sem cor
+
+`run_criterios` e o `gates.ts` rodam com `NO_COLOR=1 FORCE_COLOR=0`
+(`executor.sh:458`, `:1040`). O vitest obedece `NO_COLOR`; `FORCE_COLOR=0`
+desliga o que segue supports-color/chalk.
+
+### 12.5 Config (§8)
+
+| Chave | Valor no template / `--migrar` | Lida em |
+|---|---|---|
+| `gate_ticket.severidade` | `{}` (vale a tabela) | `gate-ticket.ts:lerSeveridade`, `:severidadeDe` |
+
 ---
 
 ## 10. Divergências conhecidas
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 247b9f5..89d4fe4 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -925,8 +925,40 @@
   *Teste:* caso 4 do `test-ambiente.sh`, com o texto real da recusa: 4 disparos, 1 AMBIENTE
   em cada, 906 e 907 pendentes. **Antes, nenhum AMBIENTE e os dois bloqueados no 4º.**
 
+- **Etapa 7d-1b · severidade por regra e calibração do gate de ticket** (25/09/2026).
+  Tabela `REGRAS` (erro/aviso/off) com `gate_ticket.severidade` por cima; o pré-voo em
+  `bloqueia` só bloqueia por ERRO. Correções de 2, 3, 5t, 5c, 6r, 6v, 8 (C8) e 10x; regras
+  estáticas do Comarka (C2c, C2v, C2P, C3, C4, C9, C11, C12); critérios e gates sem cor;
+  `GATE_TICKET_AVISO` uma vez por versão. Commits `960d8e6` (corpus), `635ddd3`
+  (severidade), `fe505ce` `2b49f34` `74fffeb` `1d942d7` `e6bd065` `394c241` `440b055`
+  `08aa971` (correções e severidade final), `62a8461` (Comarka), `da51053` (sem cor),
+  `b72e3bc` (aviso por versão).
+  *Evidência:* `~/orq-sessoes/levantamento-7d1-calibracao.md` §5 e
+  `~/orq-sessoes/relatorio-kit-etapa7d1b.md`.
+  *Teste:* `orquestrador-gate-corpus.test.ts` (nenhuma regra ERRO com FP nos 706 done),
+  `orquestrador-gate-severidade.test.ts`, `orquestrador-gate-correcoes.test.ts`,
+  `orquestrador-gate-comarka.test.ts`, `test-sem-cor.sh`, `test-gate-prevoo.sh` casos 8 e 9.
+
 ## PENDENTES
 
+- **7d-2 · o gate executa: C1, C5, C6.** Recon executado (C1, a única regra com causa e
+  zero FP nos três repos na calibração), guarda que já falha (C5, com a exceção de arquivo
+  que o ticket cria) e alvo que já passa (C6), contra a branch alvo em worktree
+  descartável; recon divergente = `obsoleto` sem tentativa, como no Comarka.
+  *Evidência:* calibração §5 (C1 0/0/0 FP, causal 288 e 264; C5 44/22/0 FP sem a exceção).
+  *Teste:* o corpus da 7d-1b com os `cmd` executados contra a base de cada caso.
+
+- **Doutrina do `risco` (SKILL.md, DOUTRINA-v2).** A SKILL diz que o gate cobra a CHAVE
+  `risco`; desde a 7d-1b o gate não cobra (`risco` e `bloco` opcionais). Fora do escopo de
+  escrita da 7d-1b; `doutrina-v2.test.ts` (decisão 4) registra a divergência.
+  *Teste:* a asserção da SKILL em `doutrina-v2.test.ts` passa a exigir o texto novo.
+
+- **Aviso de guarda de teto com número fixado na autoria** (caixa de defeitos,
+  `docs/defeitos/2026-09-25-teto-medido-fora-do-executor.md`, 627 do Comarka): regra nova
+  do gate de ticket, aviso, na tabela `REGRAS`.
+  *Teste:* o critério executável do próprio defeito (fixture com `TETO = 273` e
+  `[ "$t" -le 273 ]` avisa; a contraprova não).
+
 - **K6d · `scripts/kit/pureza.sh`.** O grep que TRANCA a pureza: em CÓDIGO (não em
   comentário) de `scripts/orquestrador/**` e `scripts/orq`, zero premissa de repo. As três
   premissas que a etapa 3 nomeou saíram (K6a, K6b, K6c) — falta o script que impede a próxima
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index ee4eccd..7b58d28 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -91,8 +91,8 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: 'modelos.juiz_baixo', onde: 'juiz.ts:76', obrigatoria: true },
 
   // --- gate de ticket -------------------------------------------------------
-  { chave: 'gate_ticket.modo_pre_voo', onde: 'executor.sh:1285', obrigatoria: false, nota: "ausente = 'aviso'; valor fora de aviso|bloqueia é falha alta (porte do Actus, c404986/624)" },
-  { chave: 'gate_ticket.severidade', onde: 'gate-ticket.ts:846', obrigatoria: false, nota: "regra -> erro|aviso|off por cima da tabela REGRAS (gate-ticket.ts:92); ausente = a tabela; valor ou regra desconhecida é falha alta, rc 2 (etapa 7d-1b)" },
+  { chave: 'gate_ticket.modo_pre_voo', onde: 'executor.sh:1293', obrigatoria: false, nota: "ausente = 'aviso'; valor fora de aviso|bloqueia é falha alta (porte do Actus, c404986/624)" },
+  { chave: 'gate_ticket.severidade', onde: 'gate-ticket.ts:1045', obrigatoria: false, nota: "regra -> erro|aviso|off por cima da tabela REGRAS (gate-ticket.ts:105); ausente = a tabela; valor ou regra desconhecida é falha alta, rc 2 (etapa 7d-1b)" },
   { chave: 'gate_ticket.cmd_prefixos_permitidos', onde: 'gate-ticket.ts:275', obrigatoria: true, nota: 'lista vazia reprova TODO critério com cmd' },
   { chave: 'gate_ticket.proibido_no_cmd', onde: 'gate-ticket.ts:281', obrigatoria: true },
 
diff --git a/scripts/orquestrador/config-tabela.ts b/scripts/orquestrador/config-tabela.ts
index 78f56ed..5993f9a 100644
--- a/scripts/orquestrador/config-tabela.ts
+++ b/scripts/orquestrador/config-tabela.ts
@@ -249,7 +249,7 @@ export const NOVAS: Nova[] = [
     procedencia: 'politica',
     valor: {},
     porque:
-      "gate-ticket.ts:846 (lerSeveridade) e gate-ticket.ts:128 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.",
+      "gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.",
   },
   {
     chave: 'gate_ticket.cmd_prefixos_permitidos',
diff --git a/test/doutrina-v2.test.ts b/test/doutrina-v2.test.ts
index 231d1fb..f24a8ef 100644
--- a/test/doutrina-v2.test.ts
+++ b/test/doutrina-v2.test.ts
@@ -133,10 +133,13 @@ describe('decisão 4 · `risco` é derivado, não exigido de quem escreve', () =
     expect(SKILL).toMatch(/passo 6/);
   });
 
-  it('NÃO contradiz o CONTRATO: o gate cobra a CHAVE, não o valor', () => {
-    // CONTRATO §2: "risco basta EXISTIR". A doutrina não pode dizer que a chave
-    // é dispensável enquanto o gate a cobra.
-    expect(CONTRATO).toMatch(/`risco` basta EXISTIR/);
+  // Etapa 7d-1b: o gate deixou de cobrar a chave (calibração de 25/09: 609 done
+  // sem `risco`), e o CONTRATO §2 diz isso. A SKILL (doutrina/, fora do escopo de
+  // escrita da etapa) ainda diz que o gate cobra a chave: PENDÊNCIA de doutrina,
+  // registrada no relatório e no PECAS.md. As duas asserções seguem com a mesma
+  // força: o CONTRATO com o texto novo, a SKILL com o texto que ela tem.
+  it('o CONTRATO diz que risco é opcional (7d-1b); a SKILL ainda cita a chave cobrada (pendência)', () => {
+    expect(CONTRATO).toMatch(/`risco` é opcional/);
     expect(SKILL).toMatch(/cobra que a\s+CHAVE exista/);
   });
 
~~~~

Blobs dos JSON do corpus: casos.json c0b8cacdbb612fdf56d20dc0fb847181732f7d28, arvores.json 49da9b6da20d0c25c0a804187d4e06efb86c0354.
