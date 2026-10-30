# Inventário do motor do Comarka (main b9101cc, 18/10 12:03)

Fonte: subagente de leitura. Desvio registrado: rodou uma vez `git config --get core.hooksPath` (leitura pura, fora da lista permitida).

Código que roda é o do checkout principal: local-loop.sh:97-98 chama executor do $REPO; enforcement.sh:63-64 roda do MAIN_CHECKOUT. orq-runner parada em 3037d25 (11/10), só ROOT de git.

## scripts/orquestrador/
| caminho | linhas | o que faz | último commit |
|---|---|---|---|
| lib.sh | 871 | ORQ_LOOP :39-44; fila/config do main :49-50; bloco json :93; seleção prioridade+deps :162-240; rate limit/cooldown :390-446; pausa :455-466; gate streak :486-573; adiamento :603-627; claude_run :635; vizinho :771-849; write_meta :855 | 6ad8fbd 18/10 |
| executor.sh | 969 | ALLOWED_TOOLS :61-63; build_prompt :66; gates :150-173; run_criterios :223; run_recon :309; run_ticket :493; drive_ticket retry/disjuntor :757; reconcile_merged :827; preflight :847; main :908 | 457856c 17/10 |
| avaliador.sh | 204 | prompt :77-122; claude só Read :133-136; adia 31/30 :145-153; parser :160-189; merge --no-ff :50-59,:197; done :198 | 457856c |
| enforcement.sh | 69 | diff base...HEAD + allowlist extra :34-46; core do MAIN_CHECKOUT :63-64 | 457856c |
| enforcement-core.ts | 258 | pathspec :199-204; ddl_em_c0 :228; aplica_migration :232; escrita C0 .from() :236-245; isenta prosa :126,:209; comentário :147,:226; teste só ddl :171,:228 | 02e00a5 04/09 |
| local-loop.sh | 546 | lock mkdir :424; pausa/cooldown :440-450; fetch 3x :461-469; worktrees :104,:473; drenar :163; disjuntor :129-153,:246-279; push por ticket :212-222; autocommit :368; rebase :316; writeback :519-539 | 457856c |
| launchd-run.sh | 65 | PATH, .env.orquestrador, caffeinate, launchd.log (compartilhado pelos 2 loops) | 0a64d44 06/09 |
| orq-pause.sh | 29 | sentinela global ou --loop apolo | 6df04cc 14/10 |
| fila-read.ts | 90 | leitura p/ writeback; não usado pelo bash | 64ca2b1 08/08 |
| lock.ts | 37 | lock órfão puro; loop usa mkdir (morto) | 64ca2b1 |
| perfil.ts | 19 | allowlist por perfil; executor não usa (morto) | 64ca2b1 |
| telemetria.ts | 276 | agregador antigo, formato errado (0 de 313 runs) (morto) | 5ff54c2 08/08 |
| orq-telemetria.py | 212 | telemetria real; 8 baldes de motivo :78,:90 | b50c2fe 05/09 |
| orq-painel.py | 640 | painel multi-repo; deps entre filas :144; diagnosticar :294 | eb010cf 14/10 |
| orq-server.py | 1983 | 127.0.0.1:8787; SUBFILAS :111; 24h :800; reprovas :944; ações :1322-1387; kickstart sem -k :1358; lê events.log se existir :488 | eb010cf |
| orq-contrato.py | 233 | confere contrato ticket/meta | 115fbec 05/09 |
| orq-granularidade.py | 406 | régua de granularidade | 115fbec |
| writeback-notion.ts | 224 | Notion, desligado (local-loop.sh:519) | 1a58dd2 21/08 |
| relatorio-email.ts | 185 | Resend; sem chamador | 762a20a 12/08 |
| avisa-bloqueio.sh | 11 | pausa >40 min; agendamento sem dado | bed7c14 02/10 |
| avisa-fila-parada.sh | 18 | 0 prontos >40 min; agendamento sem dado | a5f7784 24/09 |
| limpar-worktrees.sh | 40 | manual; loop usa lib.sh:324 | f5a1ebf 17/09 |
| instalar-launchd.sh | 97 | --loop plataforma/apolo | 6df04cc |
| instalar-orq-server.sh | 118 | | 65d0495 06/09 |
| plists (template plataforma 45, apolo 51+51, orq-server 74+74) | | plataforma 600s; cópias não versionadas desatualizadas | ee7d358 / a4af7a5 / 65d0495 |
| testes (15) | 1971 | adiado, autocommit-rebase, cleanup-worktree, cooldown-causa, diff-lines, disjuntor, drenagem(×3), gate-streak, painel-subfila, parser-verdict (cópia morta), preserva-evidencia, prioridade, vizinho-vitest, worktree-prefix | vários |

## .claude/ e guarda
| caminho | linhas | o que faz | último commit |
|---|---|---|---|
| .claude/hooks/guarda-ferramenta.py | 277 | PreToolUse; C0 MCP :224-241 com token :116-127; git amplo/no-verify/hooksPath/push :159-184; scripts do Lucas :133,:194; .env/printenv :138-205,:252-255; psql :208; erro bloqueia :266-269 | 6bea005 18/10 |
| .claude/settings.json | 24 | modelSettings :4-8; idleCompaction :3; hook onFailure block :10-21 | 6bea005 |
| .claude/settings.local.json | 183 | permissions (não versionado) | — |
| .claude/agents/recon.md | 14 | haiku low | 6bea005 |
| .claude/agents/juiz-diff.md | 17 | opus high; usado pela skill publicar, não pelo loop | 6bea005 |
| .claude/rules/{motor 13, fila 50, apolo 18, banco 61, testes 23, seguranca 15, api 39, front 37, ui 42} | 298 | regras por domínio | e920841 / ab2d4eb / 845eeec / 2c50a23 |
| scripts/test-guarda-ferramenta.py | 219 | 16 testes | 6bea005 |

## Publicação, staging, roadmap
| caminho | linhas | o que faz | último commit |
|---|---|---|---|
| scripts/publicar.sh | 269 | 1 commit para main; pausa :150; espera só lock plataforma :134,:155; gate :209-241; push :255-258 | 2047d16 02/10 |
| scripts/ritual-staging.sh | 296 | main→staging(-apolo) :106-110; pausa/lock :171-194; DANO :251-279; commit --no-verify :284; push :289 | 7464018 14/10 |
| scripts/promover-plataforma.sh | 228 | staging→main ff; 2 locks :127-130; checar-promocao :157 | ab2d4eb 18/10 |
| scripts/promover-apolo.sh | 331 | staging-apolo→main | ab2d4eb |
| scripts/validar-fila.py | 1765 | 16 camadas :16-63; faixa apolo :700-716; REGRAS_NOVAS_COMO_ERRO=False :76; so_status_staged :1535; via .githooks/pre-commit | 457856c |
| .githooks/pre-commit | 44 | roda validar-fila nos tickets em stage | 6df04cc |
| testes validar-fila / ritual / publicar | 1378/288/235 | | |
| roadmap/checar-promocao.py | 507 | trava de schema | c2c3f63 18/10 |
| roadmap/estado-fila.py 87, prontos.py 75, estado-plano.py 130, harness-doctor.py 139, liberar.py 16, gerar-a11y-a1.py 171 | | | |
| docs/harness/plano-claude-code-out26.md | 169 | plano de 18/10 | 6bea005 |

## Pontos-chave
- Seleção: lib.sh:88-90, :208-213 (prioridade, ausente=50 :191-198), selecionar_pendente :228-237; deps :162-176 (humano: em liberacoes :155-159; done em qualquer fila :118-130).
- Pré-voo executor.sh:847-905 (bash -n, JSON, identidade repo/banco :863-880, env, sonda claude 60s); recusa checkout principal/árvore suja :923-930; recon divergente → obsoleto :535-543; aviso_allowlist só avisa :355-434.
- Prompt build_prompt :66-141; prompt.txt :547.
- Allowlist fixa :61; disallowed :63; perfil/perfis_tools não usados; juiz só Read avaliador.sh:134-135. Hook vale no executor (worktree sai da staging com .claude/settings.json).
- Enforcement: test/ varrido por pathspec, aplica_migration e escrita_em_c0; isento só de ddl.
- Gates: ordem :488-490; diff-cap 900 :659-666; gate_tsc regex :150-156; vitest suíte inteira :158-161; critérios bash isolado :30-32,:223-282; dev server :3004.
- Juiz: parser :160-185 recupera booleano do texto cru (ainda vale). Saída 20 documentada e nunca emitida (:16).
- Retry: max_retries 2; tentativa 3 = opus :559-567; disjuntor por motivo repetido :777-798; config main sonnet/opus/opus :17-19. 1360 (IDs completos) done só na staging-auto (8e1d090): não vale no loop.
- Esforço: motor não passa --effort; só settings.json:4-8; apelido → chave completa = sem dado.
- Causas: lib.sh:390-391, :584; is_adiavel :603-613; timeout LOCAL sem cooldown, limite REMOTO com cooldown executor.sh:589-613; cooldown 60 min compartilhado pelos 2 loops (:413-425); gate streak 4 por loop; sem-progresso limite 3.
- Autocommit local-loop.sh:368-405: só no main :371; :376 .md modificados na raiz da fila do loop; :388 add arquivo inteiro; :392-393 commit pathspec; rebase :300-361 (reabertura humana vence); push :400; passa pelo pre-commit.
- Pausa global docs/fila/.orq-pause + por loop.
- Merge por ticket avaliador.sh:50-59; push por ticket local-loop.sh:212-222.
- Telemetria: meta.json array lib.sh:855-871; custo SEM DADO (--output-format text, executor.sh:577, avaliador.sh:136).
- Painel orq-server 8787, subfila apolo com pausar/retomar desabilitados (409).

## Apolo
- docs/fila/apolo: 167 tickets (148 done, 19 pend), 5019–5242. Chaves extras plano_secao, atualiza_plano, lane, plano_item, colunas_escritas.
- Por loop: FILA_REL, staging-apolo, prefixo orq-apolo-, pausa, gate streak, log, lock. Compartilhado: config, runs/, .cooldown-until, liberacoes, pausa global. publicar.sh espera só o lock da plataforma.

## Fila
- Raiz 1422 tickets (1266 done, 61 pend, 94 obsoletos, 1 em_execucao = 1363 ao vivo às 12:14). Formato: bloco ```json no .md (lib.sh:93-99), sem frontmatter YAML.
- 000-config.json 120 linhas; liberacoes.json 318 tokens; runs/ 1460 dirs não versionados; local-loop.log 8,5 MB.
- events.log NÃO EXISTE no Comarka; nem STATUS.md.

## Atenção
1. C.1: juiz e sonda do pré-voo rodam em ROOT=orq-runner (3037d25) sem .claude/settings.json → juiz opus sem effort high e sem hook. Config de usuário: sem dado.
2. guarda não lista promover-plataforma.sh em SCRIPTS_DO_LUCAS (:133).
3. Loop Apolo quebrado às 12:17 (orq-runner-apolo inválida; preflight "repo errado: origin=''"; 5242 a 2/3 no disjuntor); diretório renomeado .quebrada-1810 às 12:16:51 e .sem-progresso zerado 12:23 → outra sessão mexendo. Não tocado.
4. Comentários desatualizados: local-loop.sh:2, plist local 1800, perfil.ts:4, avaliador.sh:16.
