# Commits de motor do Comarka, 28162a9 (21/09) até b9101cc (main, 18/10)

Fonte: subagente de leitura (GIT_OPTIONAL_LOCKS=0, só log/show/for-each-ref/worktree list), 18/10.

## Volume
- 3299 commits no período; 836 "orquestrador: merge frente/N"; 125 "status automatico do loop" (99 fila:, 26 fila(apolo):); 21 "status devolvido pelo loop" (não saem de local-loop.sh:393).
- Fora de HEAD com assunto de motor: 2386a5e, 6e1b19c (branch harness/colchete-e-ritual-noop, versão anterior do 8a0e855); merges de ritual f1a45b9, 2217596.
- 21a0a7a gravou no CLAUDE.md: motor é do kit; conserto local leva PORTE-PENDENTE:.
- P = tocou scripts/orquestrador/ sem PORTE-PENDENTE.

| sha | data | assunto | arquivos de motor | o que muda | P |
|---|---|---|---|---|---|
| 21a0a7a | 21/09 13:14 | doc: motor tem dono único | CLAUDE.md | regra: motor do kit; local só com PORTE-PENDENTE | |
| 1334d5d | 22/09 14:44 | validador exige exceção medida | validar-fila.py, teste, PLAYBOOK | `ausencia_ampla_sem_excecao` | |
| 0c5e85e | 23/09 10:52 | aviso de fila parada | avisa-bloqueio.sh | notificação macOS se .orq-pause > 40 min | sim |
| 4a4dc34 | 23/09 20:25 | 533 volta a pendente | roadmap/prontos.py | dep só resolve com status "done" | |
| a2a44b7 | 23/09 20:51 | aviso regex com acento | validar-fila.py | aviso `.`/`[áa]` em locale C (533) | |
| b819e6d | 23/09 20:51 | grep -F não é regex | validar-fila.py | | |
| 040d8f7 | 23/09 21:14 | run() em LC_ALL=C | validar-fila.py | | |
| a5f7784 | 24/09 14:13 | prontos.py separa deps-ok de pegável | avisa-fila-parada.sh (novo), prontos.py | 0 prontos reais > 40 min avisa | sim |
| 08ff0ae | 24/09 17:36 | validar-fila colisão de teste | validar-fila.py | `lint_colisao_teste` | |
| 64eb67d | 26/09 11:31 | executor aceita git rm | executor.sh | `Bash(git rm:*)` no ALLOWED_TOOLS | sim |
| e0aa530 | 30/09 19:53 | publicar.sh e ritual-staging.sh | scripts/publicar.sh, ritual-staging.sh | cria os dois | |
| 5f2785d | 01/10 23:27 | PORTE-PENDENTE: writeback-notion off + autocommit | local-loop.sh | `autocommit_status_fila` commita docs/fila/*.md modificados e push | |
| 6307912 | 02/10 00:29 | PORTE-PENDENTE: diff_lines via numstat | executor.sh, test-diff-lines.sh | DIFF-CAP = ins+del | |
| 4b22d30 | 02/10 00:32 | prontos.py regenera índice | estado-fila.py, prontos.py | | |
| 6fa82d9 | 02/10 10:37 | validar-fila camadas 6-9 | validar-fila.py +675 | camadas 6-9, WARN enquanto REGRAS_NOVAS_COMO_ERRO=False | |
| bed7c14 | 02/10 11:03 | PORTE-PENDENTE: avisa-bloqueio resolve repo | avisa-bloqueio.sh | REPO por BASH_SOURCE | |
| 7ee92c1 | 02/10 11:20 | validar-fila --help | validar-fila.py | | |
| 576d3a5 | 02/10 12:43 | H0 árvore sem índice herdado | validar-fila.py | run(isolado=True) | |
| 53da015 | 02/10 12:59 | merge main em staging-auto | vários | restaura 9 arquivos descartados em d8d2c6e | |
| d8027fe | 02/10 13:50 | ritual pausa e barra dano | ritual-staging.sh | .orq-pause, espera ocioso, "DANO" | |
| dd9fca0 | 02/10 14:03 | publicar avança checkout | publicar.sh, ritual | pull --ff-only; PUBLICAR_SEM_PUSH | |
| 2047d16 | 02/10 14:15 | publicar grava/retira pausa | publicar.sh | pausa "FALHOU no passo X" | |
| e30636b | 02/10 14:28 | ritual no-op | ritual-staging.sh | RITUAL_OK: nada a trazer | |
| 8a0e855 | 02/10 18:39 | rota [segmento]; ritual no-op | ritual, validar-fila | | |
| d33c111 | 07/10 14:25 | writeback_notion false | 000-config.json | | |
| c9ba443 | 05/10 10:56 | liberar.py | roadmap/liberar.py | token em liberacoes.json | |
| ea5a43c | 05/10 15:32 | lição 739 | validar-fila.py +222 | camadas 11, 12 | |
| e920841 | 10/10 22:19 | regras em .claude/rules e skills | .claude/rules/*, skills | CLAUDE.md quebrado por domínio | |
| 681284d | 11/10 00:35 | fechar_arvore sem prune | validar-fila.py | incidente 11/10 | |
| ee7d358 | 11/10 10:28 | plist 900→600 | plist.template, painel, orq-server | | sim |
| db3edde | 11/10 10:59 | instalar-launchd verifica bootstrap | instalar-launchd.sh, orq-server | | sim |
| fab89d5 | 11/10 11:02 | PORTE-PENDENTE: orq-server lê PID | orq-server.py | SIGTERM/SIGKILL não é falha | |
| 3a05c9c | 11/10 21:53 | regra base de critério | rules/fila.md | merge-base local | |
| 31104d0 | 12/10 11:11 | PORTE-PENDENTE: critério/recon bash novo | executor.sh | `roda_cmd_isolado` em vez de eval | |
| c254c77 | 14/10 11:11 | plano_secao, allowlist por loop | validar-fila.py | | |
| 6df04cc | 14/10 12:23 | PORTE-PENDENTE: loop apolo (ORQ_LOOP) | lib, local-loop, instalar, pause, plist, prontos, validar-fila, pre-commit | segundo loop | |
| 7464018 | 14/10 13:06 | PORTE-PENDENTE: ritual --loop apolo | ritual | | |
| 3a39865 | 14/10 13:31 | regra apolo | rules/apolo.md | | |
| dd1ee09 | 14/10 13:43 | estado-plano.py | roadmap/estado-plano.py | | |
| eb010cf | 14/10 19:34 | PORTE-PENDENTE: painel subfila apolo | painel, server, teste | | |
| a4af7a5 | 16/10 16:38 | versiona plist apolo | plist apolo | | sim |
| ce84bb2 | 16/10 20:12 | validar-fila 13, 14 | validar-fila.py | | |
| 457856c | 17/10 11:42 | consertos reprovas 13-17/10 | avaliador, enforcement, executor, lib, local-loop, testes, validar-fila | prevK, rebase_status_fila, vizinho, anti-afrouxamento, camadas 15-16 | PORTE só no corpo |
| 6ad8fbd | 18/10 00:19 | PORTE-PENDENTE: session limit | lib.sh, test-adiado.sh | RATE_LIMIT_REGEX | |
| 6bea005 | 18/10 00:22 | harness: guarda PreToolUse fail-closed | ver abaixo | | não toca scripts/orquestrador |
| 0e32a22 | 18/10 00:45 | regras de UI | rules/ui.md | | |
| e4e2602 | 18/10 00:56 | skills de UI | .claude/skills/** | não é motor | |
| 845eeec | 18/10 01:18 | ADR-020 | rules/apolo.md | | |
| ab2d4eb | 18/10 01:24 | promoção segura: trava schema | checar-promocao.py, harness-doctor, promover-plataforma.sh | | |
| 522f37c | 18/10 03:01 | nome de migration canônico | rules/banco.md, skill | | |
| c2c3f63 | 18/10 10:39 | promoção segura ajustes | checar-promocao.py | | |
| 2c50a23 | 18/10 11:46 | célula sem fonte | rules/front.md, ui.md | | |

## 6bea005
- settings.json:9-21 PreToolUse matcher `Bash|Read|mcp__.*__(execute_sql|apply_migration)`, timeout 15, onFailure block.
- settings.json:3-8 modelSettings Opus high / Sonnet medium / Haiku low; idleCompaction false.
- guarda-ferramenta.py:261-273 exceção → exit 2.
- :35-52, 71-113, 224-241 zona C0 a partir de 000-config.json c0_intocavel; :116-127 token c0-migration-<name> em origin/main:liberacoes.json.
- :159-205 bloqueia git add amplo, --no-verify, core.hooksPath, git push, publicar/ritual/promover (:133, :194), printenv/env, cat .env.
- :252-256 Read .env; Edit/Write não checados.
- agents/juiz-diff.md:2-6 opus high, 5 checagens, APROVA/REPROVA; agents/recon.md:2-6 haiku low.
- executor.sh:570-577 `claude -p ... --model` sem --settings: se o hook vale no headless = sem dado.

## (a) ba731d8 — CONFIRMADA
- 42 arquivos, sem trailer. 1361: objetivo trocado (CONCATENACAO) + status. 1371 e 1377: cmd de critério trocado + status.
- runs/1361: attempt-1.prev1/enforcement.json bloqueado (06:12Z); attempt-1/prompt.txt 05:55 já tem CONCATENACAO; done 08:58Z. Autor da edição: sem dado.
- local-loop.sh:376 seleciona qualquer docs/fila/*.md modificado; :388 git add arquivo inteiro; :393 commit; :350 rebase_status_fila add do arquivo inteiro.

## (d) trailers
- Orq-Resolvedor: 11 commits (6c42ce9, 76ee03e, 0ea5e3a, 09032c3, d6fd530, 6cbe3ea, f572436, b56a37d, 2273660, 9020fed, af20f48), todos R1 D6.
- Orq-Vigia: 0 commits.
