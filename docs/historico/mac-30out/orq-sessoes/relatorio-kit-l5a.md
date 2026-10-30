# Relatório kit L5a: porte do 6ad8fbd ("You've hit your session limit")

Worktree `~/Projetos/_worktrees/kit-l5a`, branch `kit/l5a`, base `2b97aef`. 28/10/2026.

## PASSO 0: leitura

Nada escrito no worktree. Única execução: as regexes atuais contra as mensagens (grep com a
linha 926 extraída, e `detectarCausaInfra` via tsx num script do scratchpad). Saída crua:

```
sh rc=1 | You've hit your session limit · resets 3:45pm
sh rc=1 | You've hit your weekly limit · resets Oct 20
sh rc=1 | You've hit your Opus limit · resets 3:45pm
sh rc=0 | 5-hour session limit reached
sh rc=0 | Claude AI usage limit reached
sh rc=1 | O cliente atingiu o limite de verba da campanha.
ts null | You've hit your session limit · resets 3:45pm
ts null | You've hit your weekly limit · resets Oct 20
ts null | You've hit your Opus limit · resets 3:45pm
ts null | 5-hour session limit reached
ts "quota" | Claude AI usage limit reached
ts null | O cliente atingiu o limite de verba da campanha.
```

(`sh rc=0` = casa a RATE_LIMIT_REGEX; `ts null` = nenhuma causa de infra.)

### Tabela

| # | Pergunta | Resposta | arquivo:linha |
|---|---|---|---|
| 1a | Regex e gate | `RATE_LIMIT_REGEX` na 926, comentário 914-925. `is_rate_limited`: rc != 0, arquivo existe, `LC_ALL=C grep -qiE`. | `scripts/orquestrador/lib.sh:914-926`, `:938-943` |
| 1b | Quem chama | (i) `is_adiavel`, que junta timeout, 129/130, sem envelope, interrupção, servidor e limite. (ii) o probe do preflight: `is_adiavel` e depois `is_rate_limited` decide se arma cooldown, `exit 75`. O `local-loop.sh` NÃO chama `is_rate_limited` nem `is_adiavel`: só lê `cooldown_active`. | `lib.sh:1179-1191`; `executor.sh:185-191`; `local-loop.sh:449-451`, `:537`, `:555` |
| 1c | **Achado: quem decide o adiamento do TICKET** | No caminho do ticket o executor NÃO usa a regex do shell: monta o sinal com `tail -c 4000` da saída do agente e pergunta ao `decisao.ts` (`decisao desfecho`); o `cooldown` do veredito decide se arma. Logo a regex do lib.sh só cobre o probe. **O conserto que importa para o ticket é a P2**; a P1 sozinha não muda o ticket. | `executor.sh:1325`, `:1353`, `:1663-1667` |
| 2a | Como a causa sai no TS | `detectarCausaInfra`: 124, 129/130, gateInterrompido, `exitCode === 0` devolve null (gate duplo), saída vazia = `sessao`, depois o primeiro `PADRAO_CAUSA` que casa, em ordem. | `decisao.ts:339-388` (laço na 387) |
| 2b | PADRAO_CAUSA de limite | `rate_limit`: `rate[ _-]?limit\|too many requests\|\(429\)\|\b429\b`. `quota`: `quota\|usage limit\|usage_cap_reached\|credit balance`. Nenhum casa "hit your ... limit". Também não casa "limit reached" nem "5-hour session limit" (divergência ANTERIOR com o shell, ver pergunta 1). | `decisao.ts:235-236` |
| 2c | Causas com cooldown | `['rate_limit', 'quota']` | `decisao.ts:134-138` |
| 2d | Outra regex decide "limite"? | Não. Fora de fixtures, só `RATE_LIMIT_REGEX` e `PADRAO_CAUSA`. `ROTULO_PARA_CAUSA` casa rótulos do config ("rate limit"), não saída. `SERVIDOR_REGEX` e `INTERRUPCAO_REGEX` não falam de limite. | `decisao.ts:112-125`; `lib.sh:930`, `:1133` |
| 3a | Testes shell candidatos | `test-causa-adiamento.sh` roda o executor real com `claude` falso de casos fixos (`429`, `503`, `sleep`); ganhar um caso novo exige mexer no `claude` falso do `test-fixture-executor.sh:154` (fora do escopo e acima do teto). `test-adiamentos-limite.sh` testa o contador, não o texto. `test-preflight.sh` cobre o probe com o envelope 429 real. **`test-lib-config.sh`** já tem a tabela `caso <rótulo> <texto> <rc>` sobre `is_adiavel`, carrega o lib.sh e roda no `test-shell.sh`. | `test-lib-config.sh:100-122`; `test-causa-adiamento.sh:14`, `:62-67`; `test-fixture-executor.sh:154` |
| 3b | Qual recebe (shell) | **`test-lib-config.sh`**: é o equivalente direto do `test-adiado.sh` do Comarka (unidade sobre a regex), já carrega o lib.sh e já tem negativa com rc 0. Os casos novos chamam `is_rate_limited` (o que arma cooldown), não só `is_adiavel`. | `test-lib-config.sh:100-106` |
| 3c | Qual recebe (vitest) | **`test/orquestrador-causas-adiamento.test.ts`**: é o teste da tabela de causas da 7b-2, já tem "429 e rate limit continuam rate_limit" e a checagem de `cooldown` por causa. | `test/orquestrador-causas-adiamento.test.ts:66`, `:88` |
| 3d | Um corpus só, dá? | Dá, pelo padrão da 7b-9: os `test-*.sh` viajam para o repo instalado sem `test/fixtures/`, então levam o corpus em heredoc, e o vitest extrai o heredoc lendo o .sh. Aqui o corpus vive SÓ no heredoc do `test-lib-config.sh` (não crio arquivo em `test/fixtures/`, que está fora do escopo de escrita) e o vitest lê o mesmo heredoc. | `test/orquestrador-sub-repeticao.test.ts:105-123` |
| 4 | O 6ad8fbd | `lib.sh`: `hit your [a-z ]{0,30}limit\|` no começo da regex e 3 linhas de comentário. `test-adiado.sh`: laço com as 3 mensagens e rc 1 (adia) e a negativa "O cliente atingiu o limite de verba da campanha." com rc 1 (não adia). A regex do Comarka ainda tem `overloaded`, `capacity`, `\(529\)`, `529 `: não portar. | Comarka `6ad8fbd`: `lib.sh:381-391`, `test-adiado.sh:35-41` |
| 5 | Mensagem real | **Não há.** `docs/fila/runs` do Comarka (1653 entradas) sem nenhum "hit your", "session limit", "weekly limit" nem "resets <n>". Fixture rotulada como texto do commit 6ad8fbd (que cita a doc oficial code.claude.com/docs/en/errors), não captura real. | `grep -rIi` em `~/Projetos/comarka-operacional/docs/fila/runs` |
| 6 | Onde a lista de mensagens está escrita | Só no comentário do lib.sh. `CONTRATO.md` lista CAUSAS, não mensagens (não muda). `docs/PECAS.md` só cita a 7b-2. `doutrina/` não lista. | `lib.sh:914-918`; `CONTRATO.md:247-253`; `docs/PECAS.md:756` |
| 7a | Minutos de cooldown | `cooldown_minutes` do config, 60 se ausente ou inválido. Grava epoch em `runs/.cooldown-until`. | `lib.sh:961-971`; `doutrina/templates/config.json:11` |
| 7b | "weekly limit" bloqueia pelo `adiamentos_limite` (4)? | **Não.** O adiado COM cooldown não conta nem zera o `.adiamentos`; só o adiado sem cooldown soma. Com cooldown ativo a drenagem para no topo do laço e o ramo de contagem (`elif ! cooldown_active`) é pulado. Sem-progresso idem. | `local-loop.sh:241-245`, `:449-451`, `:555`, `:600-612` |
| 7c | E o que acontece então no weekly | A cada 60 min o cooldown vence, o disparo seguinte roda: o probe (se `preflight_probe` não for false) bate no limite, rearma 60 min e sai com 75, sem worktree; sem probe, o ticket roda, o agente bate no limite e adia com cooldown. Ticket nunca bloqueia, mas há uma chamada recusada por hora até o reset (dias). O "resets ..." não é lido. | `executor.sh:155`, `:185-191`; `lib.sh:961-971` |

## Plano das peças (depois do ok)

**P1 · lib.sh** (teto 30 linhas com teste)
- `lib.sh:926`: `hit your [a-z ]{0,30}limit|` no começo da regex; 2 linhas no comentário 914-918 (CLI 2.1.30x, fonte 6ad8fbd, sem captura real).
- `test-lib-config.sh`: heredoc `LIMITE_ASSINATURA` com as 3 mensagens (rótulo: texto do commit 6ad8fbd) e heredoc `LIMITE_NAO` com "O cliente atingiu o limite de verba da campanha."; laço: cada SIM com rc 1 casa `is_rate_limited`; cada SIM com rc 0 não casa; a NAO com rc 1 não casa.
- Vermelho: as 3 linhas SIM falham contra o lib.sh atual. Verde: 3 adiam, negativa e rc 0 não adiam, casos antigos (`menção a rate limit com rc=0`) seguem ok.

**P2 · decisao.ts** (teto 30 linhas com teste)
- `decisao.ts:235`: `hit your [a-z ]{0,30}limit|` no `rate_limit`, 1 linha de comentário.
- `orquestrador-causas-adiamento.test.ts`: lê os heredocs `LIMITE_ASSINATURA` e `LIMITE_NAO` do `test-lib-config.sh` (mesmo extrator do `sub-repeticao.test.ts:108-114`); SIM com rc 1: `detectarCausaInfra` = `rate_limit` e `decidirDesfecho` adiado com `cooldown: true`; SIM com rc 0 e NAO: null.
- Vermelho: SIM dá `null` hoje (medido acima). Verde: os dois testes concordam sobre o mesmo corpus.

**P3 · docs** (teto 20 linhas)
- `docs/PECAS.md`: entrada "L5a" em FEITAS, com os shas de P1 e P2, evidência e testes.
- `docs/migracao-comarka.md:177`: "aberto" vira "portado", com os shas.

## Perguntas que só o Lucas responde

1. **"5-hour session limit reached" já diverge hoje**: o shell adia (por "limit reached"), o TS dá null, e no caminho do ticket quem manda é o TS, então essa mensagem já reprova o ticket. Ponho `limit reached|5-hour session limit` também no `rate_limit` do TS na P2, e a mensagem no corpus? (Recomendo sim: +1 linha de regex, +1 linha de corpus, cabe no teto.)
2. **Weekly limit**: hoje vira uma chamada recusada por hora durante dias, sem bloquear. Ler o "resets ..." para armar o cooldown até o reset fica fora da L5a? Se sim, registro como pendente em `docs/PECAS.md` na P3.
3. **Fixture sem captura real**: aceita as 3 mensagens do commit 6ad8fbd, rotuladas como texto do commit e não como saída capturada?
4. A variante **Sonnet** (citada no commit, sem caso de teste lá) entra como 4ª linha do corpus? A regex já a cobre.

Respondidas pelo Lucas em 28/10: (1) sim, mas "5-hour session limit" na linha de quota, não "limit reached" no rate_limit; (2) fora da L5a, pendente em PECAS; (3) sim, rotuladas; (4) sim, Sonnet é a 4ª linha.

## Peças (depois do ok)

Commits na `kit/l5a`, sem push: `8abf51d` (P1), `169cf20` (P2), `9420eb0` (P3).

Antes da P2, conferi quem afirma a causa de "usage limit reached": `test/orquestrador-causas-adiamento.test.ts:79` (quota) e `test/orquestrador-decisao.test.ts:148` (só adiado). Seguem verdes: "5-hour session limit" foi para a linha de quota, e "limit reached" não entrou no rate_limit.

### P1 · `8abf51d` · lib.sh (25 linhas com teste)

- `scripts/orquestrador/lib.sh:918-919` comentário; `:928` `hit your [a-z ]{0,30}limit|` no começo da `RATE_LIMIT_REGEX`.
- `scripts/orquestrador/test-lib-config.sh`: bloco "limite da assinatura (L5a)" com o heredoc `LIMITE_ASSINATURA` (`<causa>|<mensagem>`, 6 linhas: session, weekly, Opus, Sonnet como rate_limit; "5-hour session limit reached" como quota; a negativa "limite de verba" como nao). Texto do commit 6ad8fbd, sem captura real.

Vermelho (teste novo contra o lib.sh anterior, rodado no fixture):
```
== limite da assinatura (L5a): corpus lido também pelo vitest ==
  FALHA rc 1: You've hit your session limit · resets 3:45pm -> nao (esperava adia)
  ok   rc 0: You've hit your session limit · resets 3:45pm -> nao
  FALHA rc 1: You've hit your weekly limit · resets Oct 20 -> nao (esperava adia)
  ok   rc 0: You've hit your weekly limit · resets Oct 20 -> nao
  FALHA rc 1: You've hit your Opus limit · resets 3:45pm -> nao (esperava adia)
  ok   rc 0: You've hit your Opus limit · resets 3:45pm -> nao
  FALHA rc 1: You've hit your Sonnet limit · resets 3:45pm -> nao (esperava adia)
  ok   rc 0: You've hit your Sonnet limit · resets 3:45pm -> nao
  ok   rc 1: 5-hour session limit reached -> adia
  ok   rc 0: 5-hour session limit reached -> nao
  ok   rc 1: O cliente atingiu o limite de verba da campanha. -> nao

4 CHECK(S) FALHARAM
```
Verde (rc=0): as 11 linhas `ok`, `TODOS OS CHECKS PASSARAM`; os 12 casos antigos de `is_adiavel` (inclusive "menção a rate limit com rc=0") seguem ok.

### P2 · `169cf20` · decisao.ts (25 linhas com teste)

- `scripts/orquestrador/decisao.ts:235-236` comentário; `:237` `hit your [a-z ]{0,30}limit|` no `rate_limit`; `:238` `|5-hour session limit` no `quota`.
- `test/orquestrador-causas-adiamento.test.ts`: lê o heredoc `LIMITE_ASSINATURA` do `test-lib-config.sh` (um corpus só); cada linha SIM com rc 1 dá `adiado`, a causa da linha e `cooldown: true`; com rc 0, `detectarCausaInfra` null; a `nao` não adia.

Vermelho:
```
   × ... limite da assinatura: "You've hit your session limit · resets 3:45pm" -> rate_limit
     → expected [ 'reprovado', …(2) ] to deeply equal [ 'adiado', 'rate_limit', true ]
   × ... "You've hit your weekly limit · resets Oct 20" -> rate_limit   (idem, 'reprovado')
   × ... "You've hit your Opus limit · resets 3:45pm" -> rate_limit     (idem)
   × ... "You've hit your Sonnet limit · resets 3:45pm" -> rate_limit   (idem)
   × ... "5-hour session limit reached" -> quota
     → expected [ 'reprovado', …(2) ] to deeply equal [ 'adiado', 'quota', true ]
      Tests  5 failed | 34 passed (39)
```
Ou seja, hoje as 5 viram REPROVADO no caminho do ticket e consomem retry.

Verde: `Tests  39 passed (39)`, com os 7 casos do corpus `✓` (verbose).

### P3 · `9420eb0` · docs (15 linhas)

- `docs/PECAS.md`: L5a em FEITAS; em PENDENTES, "L5b · cooldown até o resets ...", com a medição (uma chamada recusada por hora até o reset, sem bloquear ticket, `local-loop.sh:241-245`, `:555`). O nome L5b é sugestão minha; troque se quiser.
- `docs/migracao-comarka.md:177`: 6ad8fbd **portado**, com `8abf51d` e `169cf20`.

## Fechamento (HEAD `9420eb0`)

```
tsc rc=0            (npx tsc --noEmit, sem saída)
vitest rc=0         Test Files  116 passed (116) / Tests  1857 passed (1857)
test-shell rc=0     27 scripts rc=0 ... TODOS OS SCRIPTS SAÍRAM rc 0
test-instalar rc=0  TODOS OS CHECKS PASSARAM ((c) pulado: ORQ_CI_CHECKOUT vazio)
```
Saídas inteiras em `/private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-l5a/f65e4699-ffb0-433b-8194-ca2dea388e4f/scratchpad/` (`tsc.txt`, `vitest.txt`, `shell.txt`, `instalar.txt`, `rcs.txt`).

Sem push e sem merge. Pronto para o merge humano da `kit/l5a`.
