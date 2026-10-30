# Inventário do motor do kit contra a pesquisa de out/2026

Base: cópia do orquestrador-kit `main 85c49a6` em `/home/claude/leitura/kit`. Só leitura. Caminhos relativos a `scripts/orquestrador/` salvo indicação. Itens marcados [inferência] são leitura de código, não execução; [testar] pede spike.

Legenda: **TEM** / **TEM PARCIAL** / **NÃO TEM**.

---

## 1. Chamadas exatas do `claude -p`

Todas as chamadas do executor passam por `claude_run` (`lib.sh:1400-1424`): `( set -m; cd "$dir" && exec claude "$@" ) > "$outf" 2>&1 &` (`lib.sh:1407`), watchdog em bash puro (TERM no grupo, 10 s, KILL), rc 143/137 normalizado para 124. stdout e stderr vão juntos para o mesmo arquivo.

| chamada | arquivo:linha | flags exatas | cwd | timeout |
|---|---|---|---|---|
| sondagem (probe) | `executor.sh:177` | `-p "responda apenas: ok" --output-format json --model "$m"` | `$ROOT` | 60 s |
| juiz | `executor.sh:759-761` | `-p "$(cat "$prompt")" --output-format json --model "$modelo" --allowedTools "" --max-turns 1` | **`$wt` (a worktree do ticket)** | `claude_timeout_secs` (template 1800) |
| executor | `executor.sh:986-989` | `-p "$(cat "$prompt")" --output-format json --model "$modelo" --max-turns "$turns" --allowedTools "$tools" ${piso:+--disallowedTools "$piso"}` | `$wt` | `claude_timeout_secs` |
| triador | `triador/modelo.ts:242-246` (spawnSync) | `-p --output-format json --model <cfg.modelo> --allowedTools "" --max-turns 1 --max-budget-usd <teto_corte_usd>`; prompt por **stdin** | herdado do job | `timeout_secs` (padrão 120), `killSignal: SIGKILL` |

Não existe nenhuma outra chamada a modelo no motor (grep de `claude` em `scripts/`: só estas quatro; `orq`, `prevoo.ts`, `resolvedor/*` não chamam; `prevoo.ts:10-15` diz que de propósito não sonda).

**Flags ausentes em todas as quatro** (grep vazio em `scripts/`, `doutrina/`, `instalar.sh`): `--permission-mode`, `--setting-sources`, `--settings`, `--strict-mcp-config`, `--mcp-config`, `--bare`, `--append-system-prompt`, `--json-schema`, `--fallback-model`, `--verbose`, `stream-json`. `--max-budget-usd` só no triador.

**Variáveis de ambiente:** nenhuma é passada ao `claude`. Não há `CLAUDE_CODE_*`, nem `env -u ANTHROPIC_API_KEY`. O único `env -u` do executor é para o comando de critério (`executor.sh:471`, `env -u SHELLOPTS -u BASHOPTS ... NO_COLOR=1 FORCE_COLOR=0`). O plist do loop só define `NODE_OPTIONS` (`com.orquestrador.plist.template:56-59`); o do resolvedor só `PATH` (`resolvedor/com.orq.resolvedor.plist.template:31-34`); `launchd-run.sh:8-11` não carrega env de propósito. Em execução manual pelo terminal, o `claude` herda o ambiente inteiro do shell [inferência]. `test-preflight.sh:176` tem como fixture a mensagem do CLI "ANTHROPIC_API_KEY ... takes precedence over your claude.ai login": o caso já foi visto, mas não há trava.

**De onde vem o modelo:**
- executor: config `.executor_model` (`executor.sh:1362`, `drive_ticket`); template `"sonnet"` (alias). Escalada para `.retry_final_model` (template `"opus"`) só com `sub=juiz` (`decisao.ts:575`). `modelos.executor` e `modelos.retry_final` **não são lidos** (`config-tabela.ts:131-141`, decisão registrada).
- juiz: `modelos.juiz_baixo` / `modelos.juiz_alto` (`juiz.ts:77-81`), por classe de risco; template `sonnet` / `opus` (aliases).
- probe: só `.executor_model` é sondado; os outros papéis só são checados por marcador `PENDENTE_*` (`executor.sh:154-157`).
- triador: **ID completo fixo no código**, `modelo: 'claude-opus-5-5'` (`triador/modelo.ts:61`), sobreponível por `~/.orq/triador.json` ou `ORQ_TRIADOR_CONFIG`; `modelo: null` desliga.
- O template diz "use alias curto ou id completo" (`doutrina/templates/config.json`, `_modelos`). Resultado: **executor e juiz em alias, triador em ID completo.** Confirma o R7 da pesquisa.
- Modelo recusado é detectado por TEXTO (`decisao.ts:48`, `modeloRecusado`) e aborta como erro de config (`executor.sh:189-195`).

**Qualidade / riscos achados:**
- R1 da pesquisa confirmado e agravado: o **juiz roda com cwd na worktree depois do agente** (`executor.sh:759`). Ele carrega o `CLAUDE.md`, o `.claude/settings.json` e hooks da worktree **como o agente os deixou**. O que é versionado passa pelo enforcement antes (o juiz só roda com `ENF_OK=1`, `executor.sh:1103`), mas arquivo **ignorado pelo git** (`.claude/settings.local.json`, `CLAUDE.local.md`) não entra no diff, escapa do enforcement e é carregado pelo juiz [inferência, testar].
- "Juiz sem ferramentas" é garantido de fato pelo `--max-turns 1`, não pelo `--allowedTools ""`: sem `--permission-mode`, Read/Glob/Grep não pedem permissão em `-p` [testar]. Uma chamada de ferramenta esgota a volta, o envelope vem sem `result` e cai em ILEGÍVEL (adiado) [inferência]. Mesmo vale para o triador.
- O executor não nega `Agent`/`Task` (piso em §2), e não fixa `CLAUDE_CODE_FORK_SUBAGENT` (R5).
- Prompt do executor e do juiz vão por **argv** (`-p "$(cat ...)"`); com diff grande o juiz pode bater ARG_MAX [inferência]. O triador já usa stdin.
- Executor e juiz não têm `--max-budget-usd`; o teto de custo é só o gate de orçamento antes da tentativa (§13).

## 2. Piso de ferramentas e caminhos proibidos

**Allowlist derivada do ticket: TEM.** `tools_do_ticket` (`executor.sh:332-336`) passa `criterios_aceite[].cmd` para `decisao tools`, que chama `toolsDoTicket` (`perfil.ts:283-307`):
1. `BASE_TOOLS` fixa (`perfil.ts:19-36`): `Read, Edit, Write, Glob, Grep, Bash(git add|commit|status|diff|log|restore:*)`, `Bash(ls|cat|mkdir|sed|grep:*)`.
2. Comandos dos gates (`comandosDeGates`, `perfil.ts:48-66`): só `npm run <x>`, `npm test`, `npx <bin>`, nas formas exata e `:*`.
3. Prefixo de cada `cmd` de critério (`prefixoDeCmd`, `perfil.ts:89-121`): corta no primeiro `|` ou espaço duplo de nível de cima, respeitando aspas e `$(...)`. `:*` só para prefixo sem metacaractere (`prefixoSimples`, `perfil.ts:130-132`).
4. `COMANDO_PROIBIDO` (`perfil.ts:144-154`) nunca vira permissão: `rm, sudo, chmod, curl, wget, psql, git push, supabase, npx supabase`.
5. Piso por último, e vence (`filtrarPeloPiso`, `perfil.ts:306`).
A mesma string vai no `--allowedTools` e na lista "COMO RODAR COMANDOS" do prompt (`executor.sh:364-367`, uma fonte só).

**Piso `--disallowedTools`: TEM** (T17). `tools_proibidas` (`executor.sh:349`) lê `proibicoes_absolutas.tools` (`perfil.ts:260-266`). Template (`doutrina/templates/config.json`, `proibicoes_absolutas.tools`): `Bash(git push:*)`, `Bash(git reset:*)`, `Bash(psql:*)`, `Bash(supabase:*)`, `Bash(npx supabase:*)`, `Bash(curl:*)`, `Bash(rm:*)`, `WebFetch`, `WebSearch`, `Bash(pnpm install:*)`, `Bash(npm install:*)`, `Bash(npm ci:*)`. Config sem `.tools` (os repos legados com array de prosa) = piso vazio e a flag nem é passada (`config-chaves.ts:118`).
Não estão no piso: `Agent`/`Task`, `NotebookEdit`, `Bash(git checkout|switch|stash|rebase:*)`, MCP. `git restore` está na BASE (pode desfazer arquivo de teste).

**Caminhos proibidos e `.claude/**`: TEM PARCIAL, fraco.**
- O enforcement só proíbe caminho por `zona_proibida.no_write_paths` + `no_write_credenciais.padroes` (`enforcement-core.ts:653`). **O template não tem `no_write_paths`** (chaves de `zona_proibida` no template: `descricao, revisado_humano, no_write_tables, no_write_prefixes, readonly_ok, excecoes_os_owned`). Lista ausente = regra 2 desligada.
- `.claude/**` aparece só em `paths_harness` do template, e `paths_harness` **não é lido pelo motor**: só pelo `scripts/roadmap/lint-mapa.py:58-64` (cruza allowlist do mapa com `paths_harness`). O gate de ticket não cruza allowlist com `paths_harness`.
- Na prática `.claude/**` é protegido só porque não está na allowlist do ticket (vira `fora_do_pathspec`, refatiar). Ticket cuja allowlist cubra `.claude/**` passa. Arquivo ignorado pelo git nunca é visto (§1).
- `build_prompt` imprime `$(cfg '.zona_proibida.no_write_paths | join(", ")')` (`executor.sh:395`); com a chave ausente o `jq` falha em `null | join` [inferência, testar o que o `cfg` devolve].
- `Write`/`Edit` não têm restrição de caminho na permissão: a barreira de escrita é só o diff.

## 3. Enforcement por diff

`enforcement.sh` monta `{changedFiles, allowlist, diff, config}` com `git diff BASE...HEAD` e chama `enforce` (`enforcement-core.ts:641-764`). Roda ANTES dos gates (`executor.sh:1039`).

| regra | onde | estado |
|---|---|---|
| 1 pathspec_allowlist | `:655-660` | TEM (glob próprio `globToRegExp`, `:149`) |
| 2 no_write_paths / credenciais por caminho | `:653-658` | TEM, desligada no template (sem a chave) |
| 3 escrita em banco (`no_write_tables: "TODAS"`) | `:740-760` | TEM; isenta `apps/*/src/**` e `services/*/src/**` hardcoded (`:741-743`) |
| 4 aplicar migration em arquivo executável | `:736-738` | TEM |
| 5 credencial em qualquer linha adicionada | `:722-724` | TEM |
| B migrations por faixa/numeração | `:665`, `violacoesDeMigration` `:392` | TEM, desligada sem `migrations` no config |
| C tabela congelada / não permitida | `violacoesDeTabela` `:515` | TEM, só com `no_write_tables` em LISTA |
| D coluna congelada (+ sombras) | `violacoesDeColuna` `:549` | TEM, opcional |
| E prefixo sem DDL | `violacoesDePrefixo` `:577` | TEM, opcional |
| F `enforcement.padroes_proibidos_no_diff` | `violacoesDePadrao` `:623-639`, chamada `:695` | TEM o mecanismo; **template sem nenhum padrão** (não há chave `enforcement` de topo). Regex inválida vira violação própria (`padrao_regex_invalida`) |
| exceção teste-SQL | `:698-710`, `checarTesteSql` `:358` | TEM, opcional |

Classificação "caminho antes de conteúdo" (`classificaArquivo`, `:258`): prosa fica fora de C/D/E/F; artefato `.sql` entra em C/D/E/F mas não em 3/4.

**Padrões proibidos padrão (anti-placeholder): NÃO TEM.** Nenhum `TODO`, `it.skip`, `xit`, `not implemented` no template. Confirma 3.6.
**Teto de linhas:** `diff_cap_linhas` (template 2500) por numstat inserções+deleções (`executor.sh:1000`); acima vira `refatiar` sem juiz e sem tentativa (`decisao.ts:452-460`). **Não há teto de linhas removidas** nem teto fora da allowlist. `diff_cap_ticket` (600) e `gate_ticket.max_paths_allowlist` (8) estão no template e **ninguém lê** (grep vazio).
**Proteção de teste existente: NÃO TEM no enforcement.** O que existe é: (a) prompt do juiz `ANTI_AFROUXAMENTO` (`juiz.ts:153-160`), só quando a allowlist tem arquivo `.test.`/`.spec.` (`tocaTeste`, `:121`), julgado por LLM; (b) guarda de contagem `it(`/`test(`/`expect(` e zero `.skip/.only/.todo` que o resolvedor R1 acrescenta ao ticket quando põe o teste na allowlist (`resolvedor/r1.ts:1-20`); (c) gate de ticket `6v` (aviso). Nenhum `testes_reescritos`.

## 4. Gates, retry e escalada

**Ordem de uma tentativa** (`run_attempt`, `executor.sh:949-1153`): build_prompt, agente, `permissoes_negadas` (lê `permission_denials[]` do envelope, `:824`), `commit_do_agente` (`git add -A` do harness, `:876-909`, grava `arquivos-soltos.txt`), DIFF_LINES por numstat, `diff.patch`, **retry_sem_mudanca** (sha256 do patch igual ao anterior com rc 0, bloqueia sem juiz, `:1017-1032`), enforcement, gates (`gates.ts` com config da MAIN, `:1057`), critérios (`run_criterios`, `:446`, cada `cmd` em `bash --noprofile --norc` novo), evento GATE, **base vermelha** (`:1080-1098`), juiz só com tudo verde e diff ≤ cap (`:1103-1108`), `decisao desfecho` (`:1147`).
Antes de tudo isso, em `drive_ticket` (`:1273`): restrição de execução, **gate de ticket pré-voo** (`:1319`), orçamento a cada volta.

**Gates** (`gates.ts:273-299`): ordem de `_execucao_dos_gates.ordem_obrigatoria`, para no primeiro que falha, `preparo[]` com rc ignorado, tipos `exit_code`, `baseline` (com `direcao` e `contagem_regex`), `baseline_placar`. Interrupção (`ehInterrupcao`) = `reexecutar`, nunca vale parcial. **Sem timeout por gate**: `spawnSync('bash', ['-c', cmd])` sem `timeout` (`gates.ts:331`) e o executor não envolve em watchdog [inferência: gate travado prende a drenagem].

**Saída enviada ao retry: TEM PARCIAL.** `diagnostico_retry` (`executor.sh:1194-1225`) monta JSON ≤ 500 tokens via `diagnostico.ts`: `gate, arquivo, linha, esperado, obtido, trecho, criterios_falhos, fora_da_allowlist, permissoes_negadas, juiz{motivo, criterios_falhos}, instrucao`. O `trecho` são as **primeiras** 15 linhas do recorte (`diagnostico.ts:85`, `recorta`), e o recorte do gates.txt são até 40 linhas marcadas por padrão de falha completadas pela cauda (`gates.ts:317-326`). **Não manda o caminho do log** do gate nem "últimas N linhas". Entra no prompt como bloco `REPROVAÇÃO ANTERIOR (corrija exatamente isto)` (`executor.sh:423-426`). Contexto não é limpo: retry com enforcement verde **reaproveita a worktree** e o commit anterior (`executor.sh:1527-1538`), por desenho (peça 0).

**Motivo do juiz no retry: TEM.** Literal, sem corte, na frente da lista (`executor.sh:1195-1210`, ticket 623). Defeito registrado: não portado para o conteudos-infinitos (`docs/defeitos/2026-10-14-retry-sem-motivo-do-juiz-no-conteudos.md`).

**`contexto_juiz`: TEM.** Caminhos de referência lidos da BASE (`git show <base>:<p>`), teto 400 linhas por arquivo e 1200 no total, truncamento marcado (`executor.sh:675-705`); caminho ausente na base derruba o executor. Mais `definicoes` (ticket 628): corpo das funções/fixtures que os testes adicionados chamam, lido da base (`juiz.ts:340-374`).

**Tentativas:** `max_retries` (template 2, ou seja 3 tentativas); persistidas no ticket (`tentativas`, peça 7b-4), consumidas ANTES de rodar (`executor.sh:1405-1407`) e devolvidas se o desfecho não for reprovado. Bloqueio em `tentativaAtual >= max_retries` (`decisao.ts:554`).

**Escalada:** `politica_retry.por_causa` do config; `ESCALAR` só vale com `sub=juiz` (`decisao.ts:575-584`); `diff_cap`, `enforcement`, `arquivo_solto` nunca escalam e config contrária é rejeitada com exceção (`decisao.ts:531`, `:564-569`). Juiz sempre `alto` no retry final (`juiz.ts:65`).

**Cortes extras:** repetição (2ª reprovação com mesmo `sub` e mesmo `diff=` bloqueia, lida da trilha, `decisao.ts:650`, `executor.sh:1497`); retry_sem_mudanca; base vermelha.

**Cooldown:** arquivo `runs/.cooldown-until` **por repo** (`lib.sh:849`), `cooldown_minutes` (60). Só arma para `rate_limit` e `quota` (`decisao.ts:134`); timeout, 5xx, sessão, rede, gate_crash adiam sem cooldown.

**Tabela de causas (7b)** (`decisao.ts`): infra = `conexao, sessao, rate_limit, quota, servidor, timeout, gate_interrompido, gate_crash, juiz_ilegivel, ambiente`; mérito = `diff_cap, enforcement, criterio_qualidade, arquivo_solto`; desfechos `aprovado, adiado, reprovado, refatiar`; `sub` de reprovação `gate_<papel> | juiz | criterio | exit`. O config é autoridade: causa só adia se o rótulo estiver em `politica_adiamento.causas_que_adiam` (`ROTULO_PARA_CAUSA`, `decisao.ts:112-125`). rc 124 só é `timeout` se a duração medida chegou ao teto, senão `gate_interrompido` "morto por fora" (`cortadoPeloRelogio`). Saída vazia com rc≠0 = `sessao` (envelope ausente). `gate_crash` por `gateNaoRodou` (`decisao.ts:268`): rc 126/127, command not found, ENOENT, Missing script, recorte vazio, ou papel testes sem placar.

**AMBIENTE:** só quando a ÚNICA falha é de critério E o harness não conseguiu executar o cmd (rc 126/127) (`decisao.ts:339-360`, ticket 625). Permissão negada ao agente não pesa no desfecho. Teto de 3 adiamentos consecutivos por ambiente, constante `TETO_ADIAMENTO_AMBIENTE=3` (`lib.sh:253`), bloqueia (`executor.sh:1458-1475`).

**Adiamentos:** `mark_adiado` (`lib.sh:1093`) volta a pendente sem tentativa; teto `adiamentos_limite` (4) de adiamentos SEM cooldown no `local-loop.sh:234+`; `sem_progresso_limite` (3); adiado com cooldown não conta. Preflight recusado vira `ADIADO motivo=preflight` sem tocar ticket (`preflight_ou_adia`). Orçamento estourado vira `adiado_ate` próximo dia (`lib.sh:1379`).

## 5. Detecção de 429 e limite da assinatura

**TEM PARCIAL, por texto.** Saída é `--output-format json` (envelope final), não `stream-json`. Duas réguas gêmeas:
- shell: `RATE_LIMIT_REGEX` (`lib.sh:816`: `rate[ _-]?limit|rate_limit_error|limit reached|usage limit|usage_cap_reached|too many requests|quota|credit balance|5-hour session limit|\(429\)|...42[0-9]`), `SERVIDOR_REGEX` (`lib.sh:820`), `INTERRUPCAO_REGEX`, `sem_envelope` (`lib.sh:1054`), combinados em `is_adiavel` (`lib.sh:1069`). Usado **só no probe** (`executor.sh:181-182`).
- TS: `PADRAO_CAUSA` (`decisao.ts:227-244`) sobre `tail -c 4000` de `claude.txt` (`executor.sh:1119`). Usado na tentativa e no juiz.
- Gate duplo: texto só conta com rc≠0 (`decisao.ts:` curto-circuito `exitCode === 0 → null`). Depende de o CLI sair ≠0 em 429; o comentário de `lib.sh:1036-1046` diz que foi medido no 2.1.259 que o envelope vem com `is_error:true`. O campo `is_error`/`subtype` do envelope **não é lido** pelo executor.
- Não há `api_retry`, `error_status`, `billing_error`, `account_on_hold`, nem distinção HTTP 400 de limite do Console vs 429 sem `retry-after` (pesquisa §4).
- Cooldown por repo, não global: os outros repos na mesma assinatura seguem batendo (K15 pendente).
- Triador: lê `subtype` e `is_error` do envelope (`triador/modelo.ts:252-275`); trata `error_max_budget_usd`; 429 vira `envelope_is_error` registrado como erro, sem cooldown nem classificação (`:509-521`).

## 6. Juiz

- **Recebe** (`executor.sh:740-749`, `juiz.ts:438-478`): cabeçalho fixo, cobranças (integração, teste que fica vermelho se revertido, ausência com controle positivo), anti-afrouxamento condicional, formato, id, objetivo, allowlist, critérios (marcando `[avaliador · JULGUE VOCÊ]` e `[já verificado por comando]`), nota do harness (commit wip), `contexto_juiz`, `definicoes`, **gates.txt inteiro**, **diff cru** `base...HEAD`. Ordem estável para cache de prefixo (fixo antes, variável por último).
- **Não recebe a autoexplicação do executor**: nem `prompt.txt` nem `claude.txt` (`executor.sh:657-661`, `juiz.ts:13-15`, `CABECALHO` diz isso ao modelo). Recebe, porém, comentários de código que o agente escreveu (estão no diff) e o `CLAUDE.md` da worktree (cwd, §1). Mensagens de commit não entram (`git diff`).
- **Modelo:** por classe de risco (`classeDeRisco`, `juiz.ts:64-75`): alto se retry final, path em `paths_alto_risco`, palavra de `palavras_alto_risco` no objetivo (substring), ou diff > `diff_max_baixo` (300); senão baixo.
- **Formato:** `{"aprovado": bool, "motivo": "<=2 frases>", "criterios_falhos": [...]}` (`juiz.ts:162-167`), na dúvida reprova.
- **Parse:** manual, tolerante (`extrairVeredito`, `juiz.ts:501-520`): `.result` do envelope, depois o ÚLTIMO objeto de nível superior com `aprovado` booleano. Ilegível = rc 3 = ADIADO, nunca reprovado (`executor.sh:771-777`); cru preservado em `juiz.raw.json`. Sem `--json-schema`.
- `juiz.max_tokens_veredicto` (300) está no tipo (`juiz.ts:25`) e **não é usado** em lugar nenhum.
- **Calibração: NÃO TEM.** Nenhuma medição do veredito contra reabertura/revert. O ledger do resolvedor mede desfecho do triador, não do juiz.

## 7. Triador e resolvedor (7f)

**Triador: TEM.** Extração determinística primeiro (`triador/extrair.ts`, regras D0 a D12), modelo só para o que não fechou.
- Classes (`triador/prompt.ts:13-27`, `CLASSES` em `modelo.ts:289`): R1 teste acoplado fora da allowlist; R2 critério com defeito de forma/premissa; R3 spec que pede decisão humana, token, motor ou refatiamento; R4 dependência (falta real fora do escopo); R5 ambiente (base vermelha, máquina, árvore suja); R6 motor mediu/decidiu errado; R7 humano (contraditório/impossível).
- D0 (`extrair.ts:193-202`): bloqueado sem tentativa, sem evidência e **sem modelo**; remédio lista dependências não done. D6 (`extrair.ts:280-293`): vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou, em ≥ 2 tentativas = R1 firme; em uma só = `R1?`. D6b: o enforcement barrou exatamente o teste vermelho. Outras: D1 R5 árvore suja com juiz aprovado; D2 R6 contador de diff errado; D3 `R3?` refatiar; D4 R5 máquina; D5 R5 base vermelha; D7 `R5?`; D8 `R1?`; D9 `R4?`; D10/D12 `R2?`; D11 `R1|R2?`.
- Chamada: §1 (Opus por ID completo, `--max-turns 1`, `--max-budget-usd 0,60`, stdin). Teto US$ 3/dia, US$ 0,30/caso (só marca), entrada 30 mil tokens estimados por chars/3,5; reserva do pior caso antes, devolvida se o binário não iniciou (`modelo.ts:28-35`). Segredos mascarados antes do envio (`triador/mascara.ts`). Uma chamada por assinatura de bloqueio.
- Entrada inclui "O QUE O AGENTE EXECUTOR DISSE (pista, não prova)", com até 3000 + 1500 chars da cauda do `claude.txt` (`modelo.ts:151-157`, `prompt.ts:68-69`).
- **Saída:** JSON `{classe, confianca, evidencia[{arquivo,linha,trecho}], remedio, requeue, justificativa}`, parse manual (`lerResposta`, `modelo.ts:311`: texto inteiro, senão última linha que parseia com classe válida); `requeue` validado por regex (`sim|nao|sim_apos:...`). Resposta do modelo **nunca é firme**.

**Resolvedor: TEM.** Modos por repo e por classe no `~/.orq/repos.json` (`resolvedor/modos.ts`): `diagnostico` (padrão) / `sombra` / `auto`; `r1_multi`. Tabela de ação (`resolvedor/decidir.ts:1-17`): R5 D1/D4 firme = reabrir; R5 D5 = aviso; R1 D6/D6b firme = allowlist + guarda de contagem + reabrir; R2 = só proposta (nunca aplica); R3, R4, R6, R7 e palpites = aviso.
- **Travas:** interruptor `~/.orq/RESOLVEDOR_PAUSADO` checado antes e entre tickets (`passada.ts:182-221`, `job.sh`); trava global `resolver.lock` O_EXCL, órfã após 15 min (`caminhos.ts:8`, `:104`); uma ação por ticket por bloqueio e teto de 2 ações por ticket (`acoes.ts:72`, `:84-91`); escrita só no arquivo do ticket, commit com trailer, nunca `--no-verify`, nunca push (`acoes.ts:11-13`); só diagnóstico firme da extração escreve; `teto_reserva_auto` (30%) do teto do dia para o modo auto; R5 só reabre com condição verificável sem suíte (carga/CPU ≤ 0,75, ≥ 2 GiB livres, worktree alvo limpa, `r5.ts:1-15`); R2 provado em pasta temporária com cópias, nunca rodando script do repo (`r2.ts:12-24`).
- **Promoção/rebaixamento automáticos** (`promocao.ts`): R2 sobe com 9 acertos em 10 comparações com o humano; qualquer classe em auto volta a sombra com 2 desfechos ruins seguidos.
- **Pausa de gate sistêmico** (`resolvedor/gate-streak.ts`): lê a pausa do loop legado do Comarka, veredito `falso_positivo | base_vermelha | sem_veredito` por arquivos em comum; retomada automática só em `auto`, 1 por repo a cada 6 h, nunca o mesmo par, sentinela conferido por sha.
- **Job** `com.orq.resolvedor` (`resolvedor/job.sh`): sem `claude` no PATH roda `--sem-modelo` e registra `MODELO_INDISPONIVEL`.

## 8. Flaky, spec impossível, Stop hook, sandbox, OTel

| item | estado | evidência |
|---|---|---|
| Quarentena de flaky | **NÃO TEM** | nenhuma re-execução de teste falho; `testes_quarentena: []` no template não é lido por nada; `docs/QUARENTENA.md` é sobre os testes do próprio kit. Vizinhos: base vermelha (632), `gate_crash`, triador D4/D5 |
| Spec impossível | **TEM PARCIAL** | prompt manda terminar com `CRITÉRIO SUSPEITO: <descricao>` (`executor.sh:409`) e o diagnóstico manda "reporte IMPEDIMENTO no commit" (`diagnostico.ts:67-68`, `:82-83`). Nada parseia isso: consome tentativa, juiz não vê; só chega ao triador como texto "pista". `refatiar` sem tentativa existe, mas só por gatilho mecânico (cap/enforcement) |
| Stop hook | **NÃO TEM** | grep vazio de `Stop`, `hooks`, `--settings`; só uma linha de doutrina sobre hook fail-safe (`doutrina/references/ferramentas.md:22`) |
| Sandbox nativo | **NÃO TEM** | grep vazio |
| OTel / telemetria nativa | **NÃO TEM** | grep vazio de `TELEMETRY`/`otel`. O que existe: `custo.json` do envelope (`custo_registrar`, `lib.sh:1290`), `events.log`, `meta.json`, `permission_denials` |
| Teste de argumentos da chamada | TEM PARCIAL | há `test-rc-executor.sh`, `test-fixture-executor.sh`; nenhum assevera a lista de flags montada [não li os testes inteiros] |

## 9. Gate de ticket e validador (7d-1b)

`gate-ticket.ts` (1794 linhas). Rodado por `orq validar [ids|--pendentes]` (`scripts/orq:338-348`) e no pré-voo de cada ticket em `drive_ticket` (`executor.sh:1319`). Modo `gate_ticket.modo_pre_voo`: `aviso` (padrão, segue e grava `GATE_TICKET_AVISO` uma vez por versão do ticket) ou `bloqueia` (só regra `erro` bloqueia, sem tentativa). Gate que não roda é falha alta. Severidade sobreponível por `gate_ticket.severidade` (`gate-ticket.ts:150-156`).

Tabela `REGRAS` (`gate-ticket.ts:105-138`), calibração "ERRO só com zero falso positivo nos done dos três repos":
- **erro:** 1 bloco json parseável; 2 campo obrigatório; 4 status no vocabulário; 5t tipo do critério; 5c cmd não vazio; 5e espera não vazia; 6a padrão de `proibido_no_cmd` (crase, eval, sudo, curl, wget); 7 dependência é id da fila ou `humano:<token>`; 9 `contexto_juiz` existe na branch alvo e fora da allowlist; 10c `\[`/`\]` dentro de classe; C2P `grep -P`; 10x `exemplos_regex` contra o padrão.
- **aviso:** 2c critérios vazios; 3 id/prefixo; 6a:rm, 6a:bash, 6a:sh -c; 6r redirecionamento que escreve na worktree; 6v critério que leria vitest com falha como verde; 6q `grep -q` com pipe; 6b objetivo cita caminho fora da allowlist; 8 allowlist sobreposta sem dependência (fecho transitivo); 9w contexto coberto pela allowlist; 10n regex sem exemplos; C2c `grep -c ... || echo`; C2v espera numérica com `test`/`[` encadeado; C3 ausência ampla sem teto; C4 regex sensível a locale; C9 topologia; C11 colisão de teste (arquivo citado em 1 a 4 testes fora); C12 item sem extensão inexistente.
- **off:** `6a:$(`.
- Não executa nada de ticket (`gate-ticket.ts:12-14`): `alvo`, `guarda`, `recon[]` ficam para a 7d-2/1b.
- Não checa allowlist contra `paths_harness`/`.claude/**`, nem teto de paths.

## 10. `docs/defeitos/` (17 arquivos)

| arquivo | resumo | estado |
|---|---|---|
| 2026-09-25-aceite-vermelho | ticket de aceite reprovando sempre no mesmo `it(` é rotulado "provável defeito de spec/harness" pelo circuit breaker do Comarka | Comarka, aberto |
| 2026-09-25-teto-medido-fora-do-executor | guarda de teto com N medido por script do autor (273) contra contador do executor (278) trava a si mesma | vira peça de aviso no gate (PECAS) |
| 2026-09-27-grep-c-esconde-rc-127 | `cmd \| grep -c` com espera 0 fica verde quando o comando nem existe (rc 127 coberto pelo rc do grep) | backlog do motor do kit |
| 2026-09-27-test-lib-config-casos-do-actus | casos genéricos do `test-lib-config.sh` do Actus deveriam morar no kit | backlog |
| 2026-09-29-medicao-da-fila-por-worktree | medir a fila numa worktree dá o estado commitado, mas o loop lê o working tree do checkout principal | aberto |
| 2026-09-29-writeback-da-promocao-fora-do-git | writeback de status da promoção não é commitado e o loop despausa com `docs/fila` sujo | aberto |
| 2026-10-02-orq-runner-congelada | worktree `orq-runner` do Comarka fica congelada no commit em que nasceu | só Comarka, aberto |
| 2026-10-05-aviso-allowlist-variavel-de-shell | `aviso_allowlist` do Comarka não resolve variável de shell no cmd | só Comarka, aberto |
| 2026-10-07-validar-fila-timeout-deixa-tsc-orfao | `validar-fila.py` estoura 45 s e deixa `tsc` e árvore temporária órfãos | só Comarka, aberto |
| 2026-10-07-writeback-notion-acumula-no-painel | writeback Notion acumula em vez de sobrescrever | só Comarka; Notion abandonado |
| 2026-10-10-arvore-suja-na-staging-vira-conflito | árvore suja na worktree de staging vira "conflito" e bloqueia ticket aprovado (pedido: `staging_suja` adia sem tentativa) | duas linhagens, aberto |
| 2026-10-10-nota-defeito-de-spec-em-falha-que-nao-e-spec | a mesma nota "defeito de spec/harness" aparece em dependência, base vermelha e árvore suja | Comarka, aberto |
| 2026-10-10-streak-confunde-defeitos-de-spec-independentes | gate streak pausa por dois defeitos de spec independentes (762/851) | só Comarka, aberto |
| 2026-10-10-streak-zerado-na-pausa-bloqueia-na-retomada | streak zerado na pausa faz o 1º ticket após retomar virar BLOQUEADO em vez de PAUSADO | só Comarka, aberto |
| 2026-10-14-morte-por-sinal-nao-deixa-trilha | SIGPIPE/SIGTERM no executor não deixa EXECUTOR_MORREU e a causa vira "INICIO" (conteudos-infinitos, 273/274) | kit, aberto |
| 2026-10-14-retry-sem-motivo-do-juiz-no-conteudos | retry recebe o motivo do juiz vazio no conteudos-infinitos | corrigido no kit (`ab1d848`), falta porte |
| 2026-10-16-elegibilidade-working-tree | loop pega ticket que só existe no working tree (sem commit nem validação), 1165/1171 | aberto |

## 11. `docs/migracao-comarka.md`

Inventário de 02/10 (kit 2.1.0-dev contra comarka `718206d`): 126 diferenças (28 só no Comarka, 74 só no kit, 24 nos dois). O motor do Comarka é de linhagem própria; `--atualizar` hoje perderia capacidade e copia sem `--delete`.
**15 itens precisam subir para o kit antes:** 10 genéricos: (1) recon executado no loop, (2) allowlist `dir/` → `dir/**`, (3) comentário fora da varredura C0/DDL e DDL em teste vitest isento, (4) campo `prioridade` com seleção única, (5) gate streak, (6) `Bash(git rm:*)` na BASE_TOOLS, (7) limpeza de worktree órfã, (8) painel como serviço launchd, (9) doutrina (regra 21, lições de critério), (15) aviso de loop parado; 5 de configuração/extensão: (10) gancho pós-drenagem para e-mail e avisos (Notion decidido remover), (11) escopo no gate baseline (`baseline_scope_regex`), (12) dev server para critério curl, (13) `migrar-config` cobrir `worktree_prefix` e `disjuntor_sem_progresso_limite`, (14) resposta para o orq-runner/`ORQ_EXEC_ROOT`.
**Lado do Comarka:** 32 de 40 chaves obrigatórias ausentes no config; `liberadas` some; `recon_esperado` → `recon`; 35 pendentes sem `bloco`/`risco`; scripts locais leem o último bloco json (kit lê o primeiro); MAPA ou desligar lint; descarregar `com.comarka.orq-server` (porta 8787); trocar crons `*/20`; remover writeback Notion; recontar o tsc com os testes do kit em `test/`. PORTE-PENDENTE: `6307912` (equivale a `e167e0d`), `bed7c14` (vira caso do gancho 10).
Observação: o documento é de 02/10 e não reflete a direção de 18/10 (convergência/modo sombra, ver memória do projeto).

## 12. `docs/PECAS.md`: pendentes, na ordem do arquivo (`:1043-1249`)

1. 7f-b7 `na_reprova` adiado (só faz sentido no modo sombra).
2. 7f-b7 recalibrar `pausa_dono_max_min` (p95 após 7 dias).
3. 7f-b7 teto do diff depois do `r1_multi` (humano decide via `proposta_limite`).
4. 7f-b4 reinstalar o job com `claude` no PATH (humano).
5. 7f-b5 valores no repos.json do Comarka: `pausa_gate`, `notificar.imessage` (humano).
6. 7f-b5 D6 firme errado no 762 (aceitar ou apertar a D6).
7. 7f-b5 direção da R8 (allowlist sobreposta).
8. 7f-b5 formas de critério fora do R2 (propositor com modelo é peça futura).
9. 7f-b1b mini-corrida paga do R3 (9 casos, teto US$ 5,40).
10. 7f decisões para o chat: teto do caso 0,30, corte 0,60, prompt `7f-b1b-r3` como padrão.
11. 7f painel do triador e do resolvedor.
12. 7f-b2 primeira passada real e instalação do job (humano).
13. 7f-b2 R2 aplicando.
14. 7d-2 o gate executa: C1 recon, C5 guarda que já falha, C6 alvo que já passa.
15. Doutrina do `risco` (SKILL diverge do gate).
16. Aviso de guarda de teto com número fixado na autoria (defeito 627).
17. K6d `scripts/kit/pureza.sh`.
18. K8e testes que ainda não viajam.
19. Gate valida pelo schema.
20. K10b triagem das outras 114 lições do PLAYBOOK do CI.
21. K11b o que falta do Comarka: `perfis_tools`, gate streak (C0 e prefixos esperam decisão).
22. 1b o gate executa o que hoje só lê (sobrepõe a 7d-2).
23. 1c gate no loop e checks que faltaram (parte já feita pelo pré-voo do 21/09).
24. K13 python → TS.
25. K14 driver em Node.
26. K15 job único de launchd com lock global.
Nenhuma peça 7g, 7h, 7i, 7j ou 7k está escrita no PECAS.md desta cópia.

## 13. EXTRA: capacidades do kit que a pesquisa não cobre

- **Gate de orçamento** antes de cada tentativa e da sondagem (`orcamento_veredito`, `lib.sh:1342`): `usd_dia`, `tokens_dia`, `usd_ticket`, fail-open com aviso; estourou = `adiado_ate` amanhã sem tentativa. Ledger `custo.json` por papel/ticket/attempt a partir do envelope, com campos de usage configuráveis.
- **Probe de modelo** no preflight com detecção de modelo recusado por texto e papel `PENDENTE_*`; restrição de execução por allowlist de slugs enquanto houver papel pendente (`decisao.ts:avaliaRestricaoExecucao`).
- **Pré-voo da drenagem** (`prevoo.ts`): identidade, estrutura da fila, tsx, NO-GO deixa ocioso.
- **Base vermelha** (632): só gate de testes falhando em arquivo fora do diff e da allowlist bloqueia sem juiz e sem tentativa (`decisao.ts:773`).
- **retry_sem_mudanca** por sha256 do patch e **corte de repetição** por sub+diff da trilha.
- **Commit do harness** (`wip(<id>)`) para não perder trabalho não commitado, com nota ao juiz; **arquivo solto** como mérito barato que reaproveita a worktree.
- **refatiar** sem tentativa com linha em `decisoes-pendentes.md` (deduplicada) para ticket humano.
- **Tentativas persistidas** no ticket, consumidas antes de rodar; **reabertura humana** de bloqueado zera contadores (`reabertoDeBloqueado`).
- **Timeout honesto**: rc 124 só é timeout se a duração medida chegou ao teto.
- **Trap de morte** por EXIT/TERM/INT grava `EXECUTOR_MORREU` com fase e limpa o STATUS (defeito aberto para SIGPIPE).
- **Watchdog por process group** para não deixar `claude` órfão queimando cota.
- **Critério isolado** em `bash --noprofile --norc`, sem `set -e` herdado, sem cor; `strip_ansi` com `LC_ALL=C`; `criterio_match` número = igualdade, senão igualdade ou ERE.
- **Worktree**: `node_modules` linkado por pacote detectado, limpeza do cache `.vite`, prefixo por repo contra colisão; retry reaproveita worktree só com enforcement verde.
- **Juiz com classe de risco**, `contexto_juiz` e definições chamadas pelos testes lidas da base.
- **Triador**: reserva de custo do pior caso, máscara de segredos, uma chamada por assinatura, replay sem custo; **resolvedor** com promoção/rebaixamento por ledger e veredito de pausa de gate.
- **Config v2 com chaves rastreadas** (`config-chaves.ts`: cada chave com `arquivo:linha` de quem lê), `orq config`, migração v1 → v2 com dry-run e `.bak`.
- **CLI `orq`**, painel K12 multi-repo, trilha `events.log` com PAUSA/RETOMADA, `orq-pause.sh`, notificação.
- **Chaves mortas no template** (achado): `diff_cap_ticket`, `gate_ticket.max_paths_allowlist`, `juiz.max_tokens_veredicto`, `executor.auto_verificacao_max`, `executor.saida_compactada`, `executor.narracao_proibida`, `testes_quarentena`, `paths_harness` (só lint), `push_suprimido` (declarado informativo). Dão impressão de controle onde não há.
- **Gates sem timeout** (achado, `gates.ts:331`).
