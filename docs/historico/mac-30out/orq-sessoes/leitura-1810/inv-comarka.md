# Inventário do motor do Comarka OS (leitura de 18/10/2026)

Base: cópia em `/home/claude/leitura/cmk` (caminhos abaixo relativos a ela) e `cmk-log-motor.txt`.
Limite da leitura: `docs/fila/000-config.json`, `.githooks/`, `.claude/skills/` e `docs/harness/` NÃO estão na cópia. Tudo que depende do valor real do config (modelos, max_retries, gate_streak_limite, cooldown) está marcado como "valor do config não visto".
Legenda de qualidade: ROBUSTO, FRÁGIL, DEFEITO (defeito aparente, com evidência), [testar] (depende de comportamento do CLI não verificável aqui).

---

## 1. Chamadas `claude -p` (flags e ambiente)

**TEM, mínimo. Qualidade: FRÁGIL (nenhum dos R1 a R7 da pesquisa está fechado).**

Todas as chamadas passam por `claude_run` (`scripts/orquestrador/lib.sh:635-658`): `( set -m; cd "$dir" && exec claude "$@" ) > "$outf" 2>&1 &`, watchdog em bash com TERM e KILL no grupo, rc 143/137 normalizado para 124. stdout e stderr vão juntos para o mesmo arquivo.

| Chamada | Onde | cwd | Flags |
|---|---|---|---|
| Executor | `executor.sh:573-577` | worktree do ticket (`frente/<id>`, criada de staging-auto) | `-p "$(cat prompt.txt)" --allowedTools "$ALLOWED_TOOLS" --disallowedTools "$DISALLOWED_TOOLS" --output-format text --model "$exec_model"` |
| Juiz (avaliador) | `avaliador.sh:133-136` | `$ROOT` = worktree `orq-runner` (ver DEFEITO abaixo) | `-p "$(cat PROMPT_FILE)" --allowedTools "Read" --disallowedTools "Bash,Edit,Write,WebFetch,WebSearch" --output-format text --model "$AV_MODEL"` |
| Sonda do preflight | `executor.sh:893` | `$ROOT` (orq-runner) | `-p "responda apenas: ok" --output-format text --model "$pm"`, timeout 60s |
| Recon | não existe chamada `claude` de recon no motor. `run_recon` (`executor.sh:309-334`) é bash puro. O agente `recon.md` não é chamado por nenhum script (grep sem resultado). |

Allowlist do executor (`executor.sh:61`): `Read,Edit,Write,Glob,Grep,Bash(git add:*),Bash(git rm:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git restore:*),Bash(npx tsc:*),Bash(npx vitest:*),Bash(npm run build:*),Bash(ls:*),Bash(cat:*),Bash(mkdir:*),Bash(sed:*),Bash(grep:*)`.
Denylist (`executor.sh:63`): `Bash(git push:*),Bash(git reset:*),Bash(psql:*),Bash(supabase:*),Bash(npx supabase:*),Bash(curl:*),Bash(rm:*),WebFetch,WebSearch`.

Flags AUSENTES em todas as chamadas (grep em scripts, .claude, docs/orquestrador sem nenhum resultado): `--permission-mode`, `--setting-sources`, `--settings`, `--strict-mcp-config/--mcp-config`, `--bare`, `--max-turns`, `--max-budget-usd`, `--append-system-prompt`, `--json-schema`, `--effort`, `--plugin-dir`, `--fallback-model`, `stream-json`/`--verbose`.

Ambiente:
- Única variável passada: `ANTHROPIC_API_KEY=""` (vazia, não removida) em `local-loop.sh:97` (`ORQ_EXEC_ROOT="$RUNNER_WT" ANTHROPIC_API_KEY="" bash executor.sh`). [testar] se string vazia equivale a ausente na precedência de autenticação (R2); o certo é `env -u`.
- `launchd-run.sh:36-40` faz `set -a; . ~/.env.orquestrador` antes do loop: se esse arquivo tiver `ANTHROPIC_API_KEY`, ela é exportada e só a sobrescrita para "" do local-loop a neutraliza. Writeback e relatório rodam com ela.
- Plists: `com.comarka.orquestrador.plist` exporta só `NODE_DIR` e `NODE_OPTIONS`; o do apolo soma `ORQ_LOOP=apolo`.
- Nenhum `CLAUDE_CODE_DISABLE_AUTO_MEMORY`, `CLAUDE_CODE_FORK_SUBAGENT`, `CLAUDE_CODE_ENABLE_TELEMETRY`, `DISABLE_*`, OTel. `NO_COLOR/FORCE_COLOR` só nos comandos de critério (`executor.sh:31`), não no claude.

Modelo: alias vindo do config (`executor.sh:565-566` default `sonnet`; `avaliador.sh:127-128` default `opus`; tentativa final `retry_final_model` default `opus`, `executor.sh:559-563`). O template de config (`docs/orquestrador/skill/templates/config.json:46-48`) usa `sonnet`/`opus`. R7 aberto.

DEFEITO, juiz no cwd errado: `avaliador.sh:133` roda em `$ROOT`, que no loop é o `orq-runner` (`lib.sh:16`, `local-loop.sh:97`). O próprio motor admite que o runner "NUNCA avanca para o HEAD da branch alvo" (`enforcement.sh:50-53`; `local-loop.sh:108-113` só faz `reset --hard` no HEAD que já tem). Consequências: (a) o `Read` do juiz enxerga código velho, não a branch do ticket; (b) o juiz carrega `CLAUDE.md`, `.claude/rules/*` e `.claude/settings.json` (hook e modelSettings) de um snapshot antigo; (c) a sonda do preflight idem.

Risco R1 concreto: o executor roda na worktree do ticket, então carrega `.claude/settings.json` e o hook versionados nela. Se o `6bea005` (guarda e modelSettings, commit na main em 18/10) ainda não chegou à staging-auto pelo ritual, o executor roda SEM a guarda. Não dá para confirmar daqui. E o agente tem `Edit`/`Write` sem restrição de caminho e a guarda não protege `.claude/`: pode editar o próprio settings no meio da sessão [testar se o CLI recarrega].

R5 (subagentes): o executor não nega `Agent`/`Task`. Com 2.1.302, fork subagent em `-p` vem ligado. Os agentes `recon` e `juiz-diff` do repo ficam disponíveis ao executor. [testar]

---

## 2. Guarda PreToolUse (`.claude/hooks/guarda-ferramenta.py`)

**TEM PARCIAL. Qualidade: ROBUSTO no que cobre (C0, git, segredo), mas NÃO é guarda de escopo.**

Registro (`.claude/settings.json`): matcher `Bash|Read|mcp__.*__(execute_sql|apply_migration)`, `timeout: 15`, `onFailure: "block"`.

O que nega (`guarda-ferramenta.py:219-258`):
1. MCP `execute_sql`/`apply_migration` com escrita, DDL, GRANT/REVOKE, trigger, policy, index, comment, refresh em objeto C0 (`ALVOS` 71-88, `alvos_c0` 92-113). Lista C0 lida de `docs/fila/000-config.json` do projeto (`carregar_c0` 35-44). `apply_migration` em C0 só passa com token `c0-migration-<nome>` presente em `origin/main:docs/fila/liberacoes.json` (`tokens_publicados` 116-127, lido via `git show`).
2. Bash: `git add` amplo (`-A --all -u --update . :/ * ./`), `git commit --no-verify` ou `-n` em cluster, `git -c core.hooksPath=...`, qualquer `git push` (`motivo_git` 159-184, trata `-C`, `-c`, `--git-dir`); `publicar.sh`, `ritual-staging.sh`, `promover-apolo.sh` nos 3 primeiros tokens (194-195); `printenv` e `env` sem argumento (196-197); `cat/head/tail/less/...` de `.env*` exceto `.env.example` (198-199); `grep/rg/sed/awk` em `.env*` sem `-q/-c/-l` (200-204); `psql`/`supabase db` com SQL em C0 (208-214).
3. Read de `.env*` (252-256).

Escopo: NÃO usa allowlist do ticket. Não lê ticket nenhum. Raiz = `CLAUDE_PROJECT_DIR` ou `cwd` do evento (264). Mesma regra em sessão humana e no executor; fora de ticket não muda nada.

Log da negação: só stderr devolvido ao modelo (`main` 270-272). Não grava arquivo de log. No executor a negação some dentro do `claude-output.txt` em modo text (sem `permission_denials`, sem OTel).

Fail-closed: sim, duas camadas. Exceção no script vira exit 2 com "BLOQUEADO: a guarda ... falhou" (266-269), e `onFailure: "block"` no settings cobre o processo não subir. Config C0 ausente gera exceção, logo bloqueia (226, 249).

Cobertura: Edit e Write NÃO estão no matcher. O código tem ramo para eles (252) mas não nega nada (só Read de `.env`). Grep e Glob também fora do matcher.

Redirecionamento e `sed -i`: NÃO bloqueia. Não há análise de `>`, `>>`, `tee`, `sed -i`. Somado ao `Bash(sed:*)` e `Bash(cat:*)` do executor, o agente pode escrever fora da worktree por caminho absoluto (por exemplo `docs/fila/*.md` ou `scripts/orquestrador/` do checkout principal), e o enforcement (diff da worktree) não vê. [testar] o que o CLI faz com caminho absoluto fora do cwd em `Edit` e em `sed -i` liberado por regra.

DEFEITOS e brechas:
- Ferramenta `Grep` (permitida no executor) sobre `.env.local` imprime o segredo: fora do matcher. `.env.local` é linkado na worktree (`executor.sh:470-471`).
- `bash -c 'git push'`, `sh -c`, `eval` passam (o prog vira `bash`). No executor `bash` não está na allowlist, então o risco é de sessão humana.
- Regex de `-n` (`guarda-ferramenta.py:180`) casa qualquer cluster curto com `n` em `git commit` (ex.: `-an`): falso positivo raro, aceitável.

---

## 3. Agentes `.claude/agents`

**TEM (arquivos), NÃO USADOS pelo motor. Qualidade: inertes no loop.**

- `recon.md`: `model: haiku`, `effort: low`, `tools: Read, Grep, Glob, Bash`. Instrução de não escrever, mas `Bash` livre (só instrução, sem deny).
- `juiz-diff.md`: `model: opus`, `effort: high`, `tools: Read, Grep, Glob, Bash`. Revisa `git diff <base>...HEAD`: C0, regras, teste afrouxado, número divergente, falha de leitura virando zero.
- Quem chama: ninguém no motor (grep de `juiz-diff`, `agents/recon`, `--agent` sem resultado em scripts). Citados só no `CLAUDE.md:28`, para sessões humanas.
- O juiz do LOOP é o `avaliador.sh`, não o `juiz-diff`. Ele recebe (`avaliador.sh:81-122`): objetivo, critérios qualitativos, allowlist ampliada com regra anti-afrouxamento (se houver), `criterios.txt` (até 400 linhas, saídas mecânicas), `diff.stat` completo, `diff.raw` até `diff_cap_linhas` (2500 default).
- Autoexplicação do executor: o juiz NÃO recebe `claude-output.txt` nem mensagem de commit (só `git diff`). Bom, alinhado com 3.8. Mas, por rodar no orq-runner, carrega um `CLAUDE.md` velho (item 1).
- Observação: alias `opus`/`haiku` no frontmatter (R7).

---

## 4. modelSettings, effort e roteamento

**TEM PARCIAL. Qualidade: FRÁGIL.**

- `.claude/settings.json`: `modelSettings` com `claude-opus-5-5: high`, `claude-sonnet-5-5: medium`, `claude-haiku-5-5: low`; `idleCompaction: false`. Chave por ID completo, mas o motor chama por alias (`--model sonnet/opus`). [testar] se o alias resolve para a chave; [testar] se `modelSettings` é chave válida nesta versão.
- Só vale onde o settings for carregado: executor (settings da staging-auto, que pode não ter o `6bea005`) e juiz (settings do orq-runner, velho). Ou seja, o "esforço por modelo" do `6bea005` provavelmente não está em vigor no loop hoje.
- Roteamento: só por tentativa. Tentativas normais = `executor_model`; última (`attempt >= max_retries+1`) = `retry_final_model` (`executor.sh:559-567`). Não há roteamento por ticket, risco, perfil ou tamanho. Campo `perfil` do ticket (`docs/fila/_TEMPLATE.md`, "Define a allowlist de tools") e `scripts/orquestrador/perfil.ts` ("executor.sh usa cfg() + jq para a mesma lógica") são DOC MENTIROSA: o executor usa `ALLOWED_TOOLS` fixo e nunca lê `perfil`.
- IDs: aliases (R7 aberto).

---

## 5. 429, limite de sessão/semanal, overloaded, cooldown

**TEM. Qualidade: FRÁGIL, com DEFEITOS de classificação.**

Detecção: regex em texto do `claude-output.txt` (stdout+stderr), nunca stream-json.
- `RATE_LIMIT_REGEX` (`lib.sh:391`): `hit your [a-z ]{0,30}limit` (o `6ad8fbd`, "You've hit your session limit"), `rate limit`, `rate_limit_error`, `limit reached`, `usage limit`, `usage_cap_reached`, `overloaded`, `too many requests`, `quota`, `capacity`, `credit balance`, `5-hour session limit`, `(429)`, `(529)`, `error/status/rejected 42x`, `529 `.
- `SERVIDOR_INDISPONIVEL_REGEX` (`lib.sh:390`): `API Error: (529|500|503)|Overloaded|Internal Server Error|Service Unavailable` (sem `-i`).
- `INTERRUPCAO_REGEX` (`lib.sh:584`): `went to sleep|API Error|ECONNRESET|ETIMEDOUT|socket hang up|network error`.
- Gate duplo: só classifica com `rc != 0` (`lib.sh:401-406`, 589-601). `is_adiavel` (`lib.sh:603-613`): rc 124 (timeout), 129/130 (sinal), interrupção ou rate limit.

Tratamento:
- Executor (`executor.sh:589-613`): qualquer `is_adiavel` vira ADIADO (pendente, não conta tentativa, encerra o run). Cooldown armado em TUDO, exceto rc=124 (`executor.sh:600-601`).
- Juiz (`avaliador.sh:145-153`): `is_transitorio` primeiro, exit 31 (adia sem cooldown); depois `is_adiavel`, exit 30 (adia COM cooldown, `executor.sh:744-750`, `mark_adiado` com `arma` default `sim`).
- Preflight (`executor.sh:889-903`): sonda de 60s; se adiável, arma cooldown e sai 0.
- Cooldown (`lib.sh:413-446`): arquivo `docs/fila/runs/.cooldown-until`, `cooldown_minutes` (default 60), compartilhado entre os dois loops (mesmo `RUNS_BASE`), checado pelo local-loop no início e entre tickets (`local-loop.sh:174-177`, 447-450). Não lê o horário de reset da mensagem ("resets 3:45pm"): limite semanal vira sonda a cada disparo.

DEFEITOS:
- O comentário de `lib.sh:387-389` diz que 529/overloaded saiu do `RATE_LIMIT_REGEX`, mas `overloaded`, `\(529\)` e `529 ` continuam lá (`lib.sh:391`). No EXECUTOR não existe a checagem `is_transitorio`: 529/overloaded no executor arma 60 min de cooldown (o incidente do 291 de 03/09 continua possível pelo executor).
- Interrupção de ambiente ("went to sleep", ECONNRESET, qualquer "API Error") e rc 129/130 no executor também armam cooldown, contra o que dizem `lib.sh:578-583` e `test-cooldown-causa.sh:5-8` (só o rc 124 escapa).
- Juiz com timeout (rc 124) arma cooldown (exit 30), inconsistente com o executor.
- Juiz com saída ilegível e sem `"aprovado": true|false` recuperável sai 30 (`avaliador.sh:182-183`): adiado COM cooldown. O disjuntor do local-loop não conta adiamento (`local-loop.sh:255-258`). Juiz que falha sempre igual deixa o ticket pendente para sempre, com 1h de fila parada a cada volta.
- Limite que saia com rc 0 não é detectado (gate duplo). [testar] o rc do CLI 2.1.30x ao bater o limite.
- Regex amplo (`quota`, `capacity`, `limit reached`) com rc != 0 pode classificar crash como limite.

---

## 6. Gates, ordem, retry

**TEM. Qualidade: ROBUSTO na ordem e no fail-fast; FRÁGIL no feedback de retry.**

Ordem (`executor.sh:487-491`, implementada 535-752): recon_esperado (antes do modelo) > claude -p > detecção de adiado > diff/numstat > enforcement > diff-cap (2500 linhas alteradas, numstat) > tsc (erro fora de `baseline_scope_regex`) > vitest (suíte inteira) > critérios mecânicos > build > juiz > merge `--no-ff` em staging-auto.

Saída enviada ao retry (variável `MOTIVO`, injetada em "REPROVAÇÃO ANTERIOR", `executor.sh:126-128`):
- tsc/vitest/build: só a frase e o caminho do log (`"gate tsc: erro fora do baseline (ver $rundir/gate-tsc.txt)"`, 671, 680, 709). Nenhuma linha do erro. O caminho é absoluto no checkout principal; o agente só vê o erro se decidir ler (Read sem restrição de caminho). Nem curta greppável, nem log inteiro: só ponteiro.
- critério: `criterio[N] mecânico: esperado 'X', obteve '<160 chars>'` (`executor.sh:273`).
- vizinho: até 40 linhas de FAIL por teste mais o local (`lib.sh:836-847`).
- juiz: `.motivo` do `verdict.json`, pedido com no máximo 300 chars (`avaliador.sh:88`, `executor.sh:736`).
- enforcement não tem retry: BLOQUEIA direto (`executor.sh:645-655`).

Tentativas: `max_retries` do config (template 2, então 3 tentativas). Escalada: última tentativa vai para `retry_final_model` (opus).
Circuit breaker por ticket (`executor.sh:781-798`): motivo normalizado (minúsculas, sem dígitos, `lib.sh:699-702`) igual ao da tentativa anterior bloqueia na hora; na prática a escalada para opus raramente acontece em reprova repetida de gate.
Contexto limpo: sim e total. Nova chamada `-p`, worktree e branch recriadas do zero (`executor.sh:458-464`, `776`). O trabalho commitado da tentativa anterior é DESCARTADO: cada retry refaz o ticket inteiro só com o motivo.

Defeito menor: `gate_tsc` aceita qualquer quantidade de erro em arquivo que case o escopo do baseline (`executor.sh:154`), não compara contagem; e o prompt fixa "Baseline tsc = 3 erros" em texto (`executor.sh:108`).

---

## 7. Flaky e gate_streak

**Flaky: NÃO TEM.** Vitest roda uma vez (`executor.sh:158-161`); não há rerun nem quarentena.

**gate_streak: TEM. Qualidade: ROBUSTO na intenção, com cobertura limitada.**
- Estado em `docs/fila/runs/.gate-streak` (apolo: `.gate-streak-apolo`), linha `gate=<g> count=<n> tickets=<csv>` (`lib.sh:486-487`).
- Só registra no fim de um ticket: quando o breaker por ticket dispara ou os retries acabam (`executor.sh:787-788`, 808-809). Gate extraído do texto do motivo: `tsc|vitest|build|criterio` (`lib.sh:711-719`); motivo de juiz ou diff-cap zera.
- Conta tickets distintos seguidos com o mesmo gate; limiar `gate_streak_limite` (default 2, `lib.sh:492-496`).
- Ao bater: todos os tickets da sequência voltam a `pendente` (nunca bloqueado), grava `.orq-pause` do loop com motivo e zera (`lib.sh:554-573`). Retomada só manual (`orq-pause.sh --off`).
- Zera em aprovação (`executor.sh:768`) e em bloqueio por enforcement (`executor.sh:649`).
- Limite: pausa a fila por um teste flaky alheio do mesmo jeito que por suíte quebrada; é a origem dos 7 resgates de gate_streak da medição.

---

## 8. Proteção de testes e teste vizinho (`457856c`)

**Proteção de teste: TEM PARCIAL (só LLM). Qualidade: FRÁGIL.**
- Mecânico: nada impede o agente de apagar ou afrouxar asserção em teste que esteja na allowlist. O enforcement só olha caminho e linhas ADICIONADAS (`enforcement-core.ts:199-246`); remoção não é inspecionada.
- LLM: regra anti-afrouxamento no prompt do executor só quando há bloco de vizinho (`executor.sh:135-139`) e no prompt do juiz só quando há `allowlist-ampliada.txt` (`avaliador.sh:101-111`). O `juiz-diff` tem a regra mas não roda no loop.
- Pré-fila: camada 6 do validar-fila exige critério anti-afrouxamento ou `testes_conferidos`, mas em nível WARN (`REGRAS_NOVAS_COMO_ERRO = False`, `validar-fila.py:76`).

**Teste vizinho: TEM. Regra exata** (`executor.sh:678-691`, `decide_vizinhos` 440-451, `lib.sh:771-849`):
1. Só se a tentativa atual NÃO veio ampliada (uma vez por ticket).
2. Lê os arquivos com `FAIL` no `gate-vitest.txt`.
3. TODO arquivo falho tem de: estar FORA da allowlist; ser arquivo de teste (`test/*`, `*.test.ts(x)`, `*.spec.ts(x)`); citar entre aspas (`'`, `"`, crase) o caminho, o caminho sem extensão/`/index` ou `@/...` de um candidato. Candidatos = entradas da allowlist sem glob e sem `/` final, mais arquivos do diff que casam a allowlist.
4. Se tudo bate, a PRÓXIMA tentativa recebe esses testes como permitidos (`allowlist-ampliada.txt`, passado ao enforcement por `--allowlist-extra`) e o bloco FAIL no prompt.

Riscos:
- O agente ganha escrita total nesses testes e só um LLM (juiz) confere afrouxamento.
- `teste_cita` é grep de string: um teste que só cita o caminho num fixture entra.
- Divergência de glob: `casa_allowlist` usa `[[ $f == $pat ]]`, em que `*` atravessa `/`; o enforcement (`globToRegExp`, `enforcement-core.ts:42-68`) não atravessa. Um teste em subpasta pode ser julgado "dentro da allowlist" pelo bash (sem ampliação) e "fora" pelo enforcement. O `validar-fila` usa `fnmatch` (também atravessa). Três semânticas de glob no mesmo motor.

---

## 9. Padrões proibidos, anti-placeholder, teto de deleção

**Padrões proibidos no diff: NÃO TEM** (a regra F do kit não existe aqui). O enforcement só tem quatro checagens: fora da allowlist, DDL em C0, aplica migration, escrita em C0 via `.from(C0).insert|update|delete|upsert` (`enforcement-core.ts:31-33`, 199-246). Isenções: prosa `.md/.txt`, linha de comentário, DDL em arquivo de teste.
**Anti-placeholder: NÃO TEM** (nenhum `TODO`, `.skip`, `xit`, `not implemented`).
**Teto de deleção: TEM PARCIAL.** `diff_cap_linhas` soma inserções e deleções do numstat (`executor.sh:624`, 659-666), então deleção em massa dentro da allowlist cai no cap; não há teto próprio de deleção.
Fragilidade: `enforcement.sh:41-46` passa o diff inteiro como argumento do `jq --arg`. Diff muito grande pode estourar ARG_MAX; o `set -e` derruba o script e o ticket sai BLOQUEADO com "enforcement falhou", sem causa clara. O enforcement roda ANTES do diff-cap.

---

## 10. Spec impossível / desistência

**NÃO TEM.** Nenhum canal para o executor declarar spec impossível. O prompt manda seguir e commitar mesmo com negação (`executor.sh:123-125`).
Vizinhos próximos: `recon_esperado` divergente marca `obsoleto` sem chamar modelo e sem gastar tentativa (`executor.sh:535-543`); diff vazio reprova (critério ou juiz, `avaliador.sh:68-70`) e consome tentativa.

---

## 11. validar-fila: camadas e quando roda

**TEM. Qualidade: ROBUSTO no desenho; DEFEITO na função de comparação.**

Camadas (`scripts/validar-fila.py:16-60` e `_validar` 1626-1758):
1. recon: roda `recon_esperado` e compara. ERRO.
2. forma: roda todo cmd para inspecionar o formato (flag multi-alvo, `grep -P` no BSD). ERRO/WARN.
3. discriminação: critério que já passa contra HEAD é WARN; critério `tipo: guarda` que já falha é ERRO.
4. estático e topologia: dependência inexistente (ERRO), allowlists sobrepostas sem dependência (fecho transitivo), pathspec no disco mas ausente em `origin/<branch_alvo>` (ERRO), alvo atrás da main (WARN).
5. prioridade: fora de 1..99 ou não inteiro. ERRO.
6. testes afetados: teste dependente da allowlist (grafo de import ou caminho citado) tem de estar na allowlist com critério anti-afrouxamento ou em `testes_conferidos`. WARN.
7. tamanho: mais de 10 arquivos, ou lib + api + tela juntos; `excecao_tamanho` dispensa. WARN.
8. árvore: recon e critérios numa worktree temporária de `origin/<branch_alvo>`. ERRO se não abrir.
9. schema vivo: migration ou escrita declarada exige `colunas_escritas` conferidas no banco. WARN (ERRO com `--schema-obrigatorio`).
10. colchete: rota `[seg]` usada como padrão. ERRO.
11. contagem com comentário: `grep -c` sem filtrar comentário, com o ident em arquivo fora da allowlist. WARN.
12. embed com FK: `tabela!x_fkey(` inexistente no banco. ERRO.
13. espera literal: espera não numérica tem de sair de printf literal. WARN.
14. contraprova: `n=$(...)` comparado com 0 exige recon positivo ou `contraprova`; contraprova declarada que falha é ERRO. WARN no resto.
15. teste vizinho: arquivo `src/` da allowlist importado ou citado por teste em `test/` fora da allowlist e de `testes_conferidos`. ERRO.
16. saída e rota: saída de falha `ST_` sem rótulo é WARN; `grep` de `/api/...` sem delimitador é ERRO.
Extra sem número: `lint_apolo` (`plano_secao` e `atualiza_plano` obrigatórios no apolo, faixa de id 5000-5999, `ALLOWLIST_APOLO`).
Regra global: 6, 7, 9, 13 e 14 são WARN enquanto `REGRAS_NOVAS_COMO_ERRO = False` (`validar-fila.py:76`). Commit que só muda `status/notas_status` pula 6, 7, 9 e rebaixa 10, 13, 14, 16 para WARN.

Quando roda: na criação/edição do ticket (pre-commit em `.githooks`, `core.hooksPath`; citado em `guarda-ferramenta.py:171` e `PLAYBOOK.md:572`; o hook em si não está na cópia) e manual. NÃO roda antes de executar: o docstring diz "nunca dentro do loop" (`validar-fila.py:3-6`). No loop só se repete a camada 1 (`run_recon`, mecânico) e um aviso de allowlist que nunca reprova (`aviso_allowlist`, `executor.sh:355-434`).

DEFEITOS:
- `compara()` (`validar-fila.py:87-91`) NÃO é a do harness, apesar do aviso "TEM de ser byte-a-byte a mesma" (79-86). Validador: igualdade se os dois lados forem dígitos, senão SUBSTRING. Harness (`criterio_match`, `lib.sh:684-694`): espera numérica exige igualdade da saída inteira; não numérica é igualdade OU regex ERE. Exemplos: espera `3` com saída `13`: validador passa por substring, harness reprova. Espera `a|b` ou com `.`: harness casa como regex, validador não. Isto contamina as camadas 1, 3 e a contraprova (falso verde e falso vermelho). A camada 13 é um remendo parcial disso.
- `run()` (`validar-fila.py:121-122`) usa `timeout=45` sem capturar `TimeoutExpired`: um critério lento derruba o validador com traceback e trava o commit.

---

## 12. Custo e telemetria

**TEM PARCIAL. Qualidade: FRÁGIL; sem custo nenhum.**
- Por tentativa, `write_meta` (`lib.sh:855-871`) anexa a `docs/fila/runs/<id>/meta.json` (array): `attempt, model, claude_dur_secs, diff_lines, resultado, ts`. Só a duração do EXECUTOR; o juiz não tem duração nem modelo registrados. Sem tokens, sem USD (output `text` não traz `total_cost_usd`/usage).
- Evidência por tentativa em `runs/<id>/attempt-N/`: `prompt.txt`, `claude-output.txt`, `diff.raw`, `diff.stat`, `head.txt`, `enforcement.json`, `gate-*.txt`, `criterios.txt`, `recon.txt`, `vizinhos.txt`, `allowlist-ampliada.txt`, `avaliador-prompt.txt`, `avaliador-claude.txt`, `verdict.json`. Preservada como `attempt-N.prevK` (`lib.sh:754-760`, `executor.sh:510-515`), ROBUSTO.
- DEFEITO: `telemetria.ts` espera objeto plano (`ticket_id, tentativas, aprovado, aprovado_de_primeira`) e rejeita array (`telemetria.ts:55`). O próprio `orq-telemetria.py:5-8` registra "0 de 313 runs agregados desde sempre". `telemetria.ts` está morto.
- `orq-telemetria.py`: lê o array real; aprovação de primeira, tentativas, segundos, motivos por categoria (8 baldes). Conta `bloqueado` junto com adiado/obsoleto (`orq-telemetria.py:28`); lê motivos só de `docs/fila/[0-9]*.md` (não a fila apolo).
- `relatorio-email.ts` lê o formato certo (`AttemptMeta`).
- OTel: NÃO TEM.

---

## 13. Stop hook

**NÃO TEM.** Settings só tem PreToolUse. "Verde antes de encerrar" é instrução de prompt (`executor.sh:112`) e, para sessão humana, a skill `verificar` (`CLAUDE.md`, seção Pronto; skill fora da cópia).

---

## 14. CLAUDE.md, rules, auto memory

**TEM. Qualidade: ROBUSTO no tamanho; FRÁGIL no carregamento.**
- `CLAUDE.md`: 31 linhas, 2.646 bytes, humano e curto (C0, commit, guarda, onde está o resto).
- `.claude/rules/`: 9 arquivos, 298 linhas, ~18,8 KB. Com `paths:`: api, banco, fila, front, motor, seguranca, testes, ui (`src/**/*.tsx`). SEM `paths:`: `apolo.md` (18 linhas), então carrega em TODA sessão, inclusive executor da plataforma e juiz, e manda ler 5 documentos do plano Apolo antes de qualquer tarefa "relacionada".
- `motor.md` diz que o motor é do kit e não deve ser mexido; também registra que `instalar.sh --atualizar` NÃO deve rodar aqui até a migração.
- Auto memory: não desligada em lugar nenhum (R3 aberto). `idleCompaction: false` no settings.
- O juiz carrega a versão velha disso tudo (cwd no orq-runner).

---

## 15. Lock, writeback, autocommit, publicar, prioridade, dependências

- **Lock: TEM, FRÁGIL.** `mkdir` de `docs/fila/runs/.local-loop.lock` (apolo: `.local-loop-apolo.lock`), `trap rmdir` no EXIT (`local-loop.sh:424-427`). Sem PID nem idade: SIGKILL ou queda de energia deixam lock órfão que para o loop até alguém remover; ritual e promoção ficam esperando esse lock. `lock.ts` tem a lógica de lock órfão (PID + idade) mas ninguém a usa.
- **Status órfão: DEFEITO.** `em_execucao` é gravado no início (`executor.sh:554`) e nada o devolve a `pendente` se o processo morrer: o ticket some da seleção (só `pendente` é elegível, `lib.sh:231`). `reconcile_merged` só corrige ticket já mergeado.
- **Writeback Notion: TEM, desligado.** Só com `ORQ_NOTION_WRITEBACK=1` e `writeback_notion != false` (`local-loop.sh:519-539`).
- **Autocommit: TEM, ROBUSTO.** Ao fim da drenagem commita só `docs/fila/*.md` (apolo: `docs/fila/apolo/*.md`) com pathspec, faz `pull --rebase --autostash origin main` com resolução por arquivo (origin com `pendente` e nota vazia é reabertura humana e vence; senão vence o loop; conflito fora de `docs/fila` aborta) e `push origin main` (`local-loop.sh:300-405`). Risco: os dois loops commitam e fazem rebase no MESMO checkout principal sem lock comum entre eles (lock é por loop): corrida em `index.lock` e com a edição humana.
- **Push de staging: TEM.** Após cada aprovação, `push origin staging-auto:staging-auto` (`local-loop.sh:212-222`), suprimível com `ORQ_NO_PUSH=1`.
- **Publicar/ritual/promover:** scripts do Lucas (`publicar.sh`, `ritual-staging.sh`, `promover-plataforma.sh`, `promover-apolo.sh`), com pausa com dono, espera de lock, gate completo, fronteira apolo e trava de schema. Bloqueados para o agente pela guarda (só `promover-plataforma.sh` NÃO está em `SCRIPTS_DO_LUCAS`, `guarda-ferramenta.py:133`: DEFEITO, a guarda não impede o agente de rodar a promoção da plataforma).
- **Prioridade: TEM, ROBUSTO.** Inteiro 1..99, ausente = 50, inválido = 50 no motor e ERRO no validar-fila; uma casa de seleção (`lib.sh:191-240`).
- **Dependências: TEM.** `done` do ticket (em qualquer das duas filas, `lib.sh:118-130`, 162-176) ou `humano:<token>`. DEFEITO: `liberacao_ok` lê só `.liberadas[]` do `liberacoes.json` local (`lib.sh:155-159`), enquanto o painel (`orq-server.py:865-900`) aceita também a lista `tokens`, onde, pelo recon de 06/09 registrado no próprio orq-server, havia 23 tokens que NÃO estavam em `liberadas`. Painel diz liberado, motor diz pendente. Dependência de ticket `obsoleto` nunca resolve (só `done` conta).
- **Loop apolo:** `ORQ_LOOP=apolo` troca fila (`docs/fila/apolo`), branch (`staging-apolo`), prefixo de worktree, gate streak e pausa própria; cooldown e config são compartilhados (`lib.sh:39-73`, 452-459).

---

## 16. EXTRAS (não estão na lista nem na pesquisa)

1. Trava de identidade no preflight: origin do repo e project ref do Supabase têm de bater o config, senão aborta sem gastar (`executor.sh:859-880`).
2. Recusa de run real a partir do checkout principal ou de worktree de execução suja (`executor.sh:923-930`).
3. `reconcile_merged`: ticket com merge `(ticket <id>)` na branch alvo vira `done` antes da seleção (`executor.sh:827-839`).
4. Sincronização ff-only da branch alvo local com origin antes de criar worktree (`lib.sh:254-280`).
5. Critérios com `curl`/`localhost` escondidos do agente e rodados pelo harness com dev server lazy na porta 3004 (`executor.sh:81-88`, 194-221). DEFEITO de concorrência: porta fixa 3004 para os dois loops e `serve_down` mata com `kill -KILL` quem estiver ouvindo na 3004 (`executor.sh:216-217`), inclusive o dev server do outro loop ou do Lucas.
6. Comandos de critério e recon num bash novo, sem herdar `set -euo pipefail` (`executor.sh:30-32`).
7. Saneamento de `.next` e `tsbuildinfo` antes de todo tsc (`executor.sh:147`, 262).
8. Prompt obriga commit incremental (`executor.sh:113-122`).
9. Disjuntor persistente de "sem progresso entre disparos" (`.sem-progresso`, limite 3, bloqueia com causa e evidência) (`local-loop.sh:129-153`, 260-276).
10. Limpeza de worktrees órfãs por status (`lib.sh:324-355`) e por idade entre repos (`limpar-worktrees.sh`).
11. Avisos de allowlist antes do modelo (arquivo que já existe, pathspec sem pai, teste de critério fora da allowlist) (`executor.sh:355-434`).
12. Recuperação de veredito ilegível: grep de `"aprovado": true|false`; se achar `true`, APROVA e mergeia (`avaliador.sh:177-185`). FRÁGIL: aprovação por texto truncado.
13. Diff do juiz cortado por linhas do `diff.raw` (com contexto), não pelas linhas alteradas: diff entre ~1.500 e 2.500 linhas alteradas pode chegar truncado ao juiz.
14. `tail -r` no parse do veredito (`avaliador.sh:172`): só BSD/macOS.
15. `caffeinate -i` no disparo (`launchd-run.sh:42-44`).
16. Painel `orq-server.py` (127.0.0.1:8787) com ações em allowlist (pausar, retomar, kickstart sem `-k`) e checagem de Host; sem checagem de Origin nem token, então um POST cross-site do navegador consegue disparar ação (risco baixo).
17. `orq-contrato.py` (conformidade entre repos), `orq-granularidade.py` (régua de tamanho com backtest), notificações macOS (`avisa-bloqueio.sh`, `avisa-fila-parada.sh`), relatório diário por Resend (`relatorio-email.ts`).
18. Validação de sintaxe `bash -n` dos scripts e JSON de todos os tickets no preflight (`executor.sh:850-857`).
19. Concorrência: plataforma (StartInterval 1800) e apolo (600) rodam em paralelo na mesma máquina e na mesma assinatura; `npm run build` e vitest simultâneos competem por CPU e podem empurrar para o timeout de 1800s.
20. Seleção O(N) com `jq` por ticket a cada chamada (1.422 tickets em `_estado.json`): lento, não incorreto.
