# Inventário do motor do kit (main 85c49a6)

Fonte: subagente de leitura, 18/10. O kit não instala mod nem hook PreToolUse (0 ocorrências funcionais); a guarda de ferramenta é só --allowedTools/--disallowedTools.

## scripts/orquestrador/ (30 arquivos de motor)
| caminho | linhas | o que faz | último commit |
|---|---|---|---|
| executor.sh | 1684 | preflight, worktree, prompt, claude -p, enforcement, gates, critérios, juiz, decisão, retry, writeback | 48c031a 12/10 |
| local-loop.sh | 859 | drenagem, lock, pausa, pré-voo, reconcile, merge --no-ff, sem-progresso/adiamentos, autocommit | 23aa9f0 01/10 |
| lib.sh | 1495 | cfg, ticket, ticket_commit, trilha, STATUS, deps/liberações, pausa, cooldown, custo/orçamento, claude_run, criterio_match | bea11e7 24/09 |
| decisao.ts | 782 | restrição, desfecho, causas, retry/escalada, repetição, meta, base vermelha | 262feea 24/09 |
| decisao-cli.ts | 123 | ponte bash | 262feea |
| enforcement.sh | 63 | diff + config inteiro | 9e9b67b 09/09 |
| enforcement-core.ts | 778 | pathspec, zona proibida, migrations por faixa, escrita em banco, teste-SQL, credenciais | c484de1 08/09 |
| gates.ts | 371 | .gates[] do config, baseline, interrupção | ab1d848 24/09 |
| juiz.ts | 603 | risco, modelo do juiz, prompt, definições, parse do veredito | 957c178 24/09 |
| gate-ticket.ts | 1794 | gate estático do ticket com severidade | 3294224 25/09 |
| prevoo.ts | 485 | pré-voo relâmpago | 7918249 02/10 |
| perfil.ts | 329 | allowedTools derivadas + piso | 22794fd 08/09 |
| diagnostico.ts | 287 | JSON ~500 tokens para retry | 262feea |
| fila-read.ts 105, lock.ts 40, liberacoes-core.ts 257, liberar-cli.ts 133 | | | e6b3360 / c20f556 |
| config-chaves.ts 126, config-tabela.ts 472, config-cli.ts 238 | | | ca02acc / 6f37c21 |
| migrar-comum 125, migrar-config 384, migrar-liberacoes 190, migrar-tickets 237 | | | |
| orq-pause.sh | 54 | PAUSAR + .orq-pause | bea11e7 |
| orq-painel.py | 1504 | painel 127.0.0.1:8787, N repos | 596ca4c 23/09 |
| launchd-run.sh 152, instalar-launchd.sh 192, plist.template 78, reparar-trilha.sh 87 | | | |

## resolvedor/ (22 arquivos, ~3160 linhas)
passada.ts 262, decidir.ts 56, modos.ts 152, acoes.ts 219, r1.ts 197, r2.ts 225, r5.ts 74, repo.ts 202, ticket-md.ts 230, caminhos.ts 129, ledger.ts 55, desfecho.ts 205, promocao.ts 76, desfazer.ts 68, pausa.ts 208, gate-streak.ts 215, sobreposicao.ts 104, diff.ts 38, cli.ts 58, job.sh 39, instalar-job.sh 110, plist 48. Últimos: 1d59ce6 / 8264ad1 18/10.

## triador/ (15 arquivos, ~3120 linhas)
triar.ts 243, extrair.ts 320 (D0–D12), modelo.ts 535 (opus-5-5, US$3/dia), leitor.ts 63, leitor-kit.ts 268, leitor-legado-comarka.ts 557, comum.ts 205, recorte.ts 124, saida.ts 231, mascara.ts 26, git.ts 37, prompt.ts 114, tipos.ts 185, corrida.ts 108, cli.ts 106.

## scripts/orq 469 (CLI), scripts/kit/ (7 arq., 1526), scripts/roadmap/lint-mapa.py 150
## doutrina/ SKILL.md 260, EXECUTOR.md 29, CHANGELOG-v2 25, references/ (9 arq., 911), templates/ (11 arq.)
## Testes: 29 shell + 98 vitest (10 triador, 21 resolvedor); fixtures 2593 arquivos.

## Pontos-chave
- Seleção: lib.sh:121-123 ordem lexicográfica, SEM prioridade; proximo_pendente :724-736; razao_nao_processavel :670-692 (adiado_ate, humano:, deps done); local-loop.sh:454; reconcile executor.sh:1548.
- Multi-fila: NÃO (lib.sh:42 FILA_DIR fixo; :122 maxdepth 1; local-loop.sh:808).
- Pré-voo prevoo.ts:268; local-loop.sh:767,:849; gate-ticket no drive_ticket executor.sh:1309-1358 (modo aviso padrão / bloqueia sem gastar tentativa); preflight :56; probe_modelos :150.
- Prompt build_prompt executor.sh:350-427; EXECUTOR.md só apontado (:362); retry com diagnostico_retry :1194 → diagnostico.ts:147.
- Tools: tools_do_ticket :335 → perfil.ts:283; piso :348; agente :986-989; juiz --allowedTools "" --max-turns 1 :759-761; permission_denials :824. Sem PreToolUse.
- Critério: run_criterios :446-496, bash novo, env -u SHELLOPTS (:471-472); criterio_match lib.sh:1430-1440; rc 126/127 = ambiente (:483-487).
- Enforcement: enforcement.sh:49-63; enforce :641; varre test/ sem exceção (:655-662); isenções: prosa (:202-204,:685), .sql de artefato, apps/*/src só para escrita em banco (:743-745), teste-SQL (:385-389,:703-711); credenciais em tudo (:722).
- Gates gates.ts:273-299; interrupção :81; executor.sh:1057; base vermelha :1080-1098 / decisao.ts:773; juiz só tudo verde :1103-1108.
- Juiz: risco juiz.ts:64; modelo :77; extrairVeredito :501-520; ilegível → rc 3 (:591-595) → executor.sh:771-777 → adiado juiz_ilegivel (decisao.ts:96,119); contexto_juiz :680; definicoes :737.
- Retry decidirRetry decisao.ts:539-610; NUNCA_ESCALA :532; escala só sub=juiz :574-593; laço executor.sh:1508-1540; worktree reaproveitada :1528-1540; repetição :1497; diff igual bloqueia :1018-1031,:1438-1448; tentativas consumidas antes :1409.
- Esforço por modelo: NÃO EXISTE; só modelo e claude_max_turns (:978-979).
- Causas decisao.ts:87-99, :111-124; cooldown só rate_limit/quota :133-138; decidirDesfecho :444; TETO_ADIAMENTO_AMBIENTE=3 lib.sh:253; adiamentos_limite 4 local-loop.sh:252,:648; sem_progresso 3 :164,:633; AMBIENTE :582; orçamento lib.sh:1379.
- Writeback: ticket_set lib.sh:162; ticket_commit :274-279 (add/commit só do ticket, sem trailer); commit_do_agente executor.sh:876-909 git add -A na worktree com Orq-Ticket; merge local-loop.sh:70-102 Orq-Ticket; autocommit_status_fila local-loop.sh:796-824 (docs/fila/[0-9]*.md modificados, sem trailer, sem push) — MESMO PADRÃO do Comarka (arquivo inteiro).
- Pausa lib.sh:906-910; local-loop.sh:834,:445; orq-pause.sh:22-50; painel escreve PAUSAR (~:1104).
- Publicação: nenhum git push no motor (lib.sh:404-408).
- Staging: ensure_branch_alvo lib.sh:743; ensure_staging_worktree :771; guard local-loop.sh:73-84,:830. Promoção sem código (SKILL.md:39); orq promover/relatorio não existem.
- Telemetria: grava_meta executor.sh:1223-1238 / decisao.ts:693; write_meta lib.sh:1479 morto; custo.json custo_registrar lib.sh:1290-1331; orcamento_veredito :1342 fail-open; orq custo orq:260.
- Painel orq-painel.py :52-53, ações :64, :1086, kickstart sem -k :1121.
- Validação na criação: sem hook; orq validar (orq:343) ou pré-voo; validarTicket gate-ticket.ts:1393; REGRAS :105-138; severidade :150.
- Liberações liberacoes-core.ts:42,:143,:245; liberacao_ok lib.sh:636-659.
- Triador/resolvedor: rodam do kit sobre ~/.orq/repos.json; job 300 s; triador só leitura, escreve ~/.orq/diagnosticos; resolvedor auto só R1 (D6/D6b) e R5 (D1/D4); porta única repo.ts:179-202; commit --only (:189); trailer :164; Orq-Resolvedor-Desfaz desfazer.ts:60. NÃO confere a branch do checkout cliente; roda orq-pause.sh --off do repo cliente (gate-streak.ts:208).

## Formatos
- Ticket: 1º bloco ```json; obrigatórios gate-ticket.ts:58-66; id ^\d{3}[a-z0-9]*$ (:76) — aceita 4 dígitos (1361) e 5000+ ; status :31-38; CONTRATO.md:84-123.
- events.log: `<ISO> <id> <EVENTO> [k=v]`, lib.sh:436-450, :289; vocabulário CONTRATO.md:172+.

## Divergências internas
- aguardando_merge gravado (executor.sh:1478) fora do schema; em_execucao no vocabulário e nunca gravado.
- schema exige bloco/risco (:87), gate-ticket não.
- TICKET.md:6 status candidato.
- linhas do CONTRATO desatualizadas (event() 252→436; INICIO 1032→1405; extrair 108→119).
- doutrina cita orq promover/relatorio inexistentes.
