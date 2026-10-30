# Kit, capacidades 27–34 + modo sombra + sha de sincronização (leitura 18/10)

## 27 Liberações
- liberacao_ok lib.sh:636-668: .tokens[] inteiro, depois união .tokens ∪ .liberadas sem humano: (aviso no stderr) → lê o Comarka.
- RE_TOKEN liberacoes-core.ts:42 recusa c0-migration-<name> e 4 tokens existentes (n8n-1, c0-guard-pasta-super-admin-857, f1-rotas-go, 867-botoes-reuniao-escolhidos) + n8n-cockpit-dispensado nas deps. Aplicado só em liberar-cli.ts:64; migração só anota (:222-223).

## 28 Zona proibida
- EnforceConfig enforcement-core.ts:78-104 (zona_proibida com no_write_paths/tables/credenciais, schemas/tabelas permitidas, colunas congeladas/sombra, prefixos_sem_ddl; migrations faixa; politica_schema; testes_sql). Regras :258, :266, :272, :306, :392, :515, :549, :577, :623, :641.
- Sem c0: config-tabela.ts:427-430 deixa c0_intocavel intacta e avisa zona_proibida AUSENTE; no_write_prefixes → prefixos_sem_ddl (:117). Sem semântica de exceções (os_owned_excecoes).

## 29 Worktrees/lock
- setup_worktree executor.sh:292-316; limpeza :318-325; worktrees_prefixo decisao.ts:728-735 (Comarka usa worktree_prefix, não lido); staging lib.sh:762-797.
- Sem runner (ORQ_EXEC_ROOT aceito lib.sh:19-24 nunca definido). Juiz roda na worktree do ticket (claude_run "$wt", lib.sh:1407; executor.sh:759-761) → herda .claude da branch.
- Órfãs: só a corrente; preflight remove *.lock órfão (executor.sh:76-99). lock.ts usado de verdade (local-loop.sh:38-48; launchd-run.sh:65-81 kill -0). Um loop por repo.

## 30 Agendamento
- template :64-65 StartInterval, :70-71 RunAtLoad, :57-62 NODE_DIR. launchd-run decidir_disparo :97-112 (recupera/em-curso/segue), caffeinate :128-147. instalar-launchd padrão 1800 (:77-79).
- resolvedor plist :22-41 (300 s, RunAtLoad false); job.sh :11-39.

## 31 Notificação
- notificar lib.sh:1240-1268 (sempre loga notificacoes.log); deve_notificar :1188; transicao_ambiente :1216-1231. pausa.ts :5-25, :91-127 (iMessage não configurado). painel alarmes orq-painel.py:928-1000.

## 32 Instalação
- instalar.sh --verificar :199-226 byte a byte, não valida config. config-cli.ts validarConfig :90; schemas/ sem config. prevoo cat.0/1/3/6/7.

## 33 Testes: nenhuma cópia inline; só stubs de dependência. test-diff-lines.sh:22,36 e orquestrador-juiz.test.ts:253 extraem código real.

## 34 Lote
- Doutrina: humano/planejador/sentinela (SKILL.md:8,37,96,102,148,210; autoalimentacao.md:29-51); planejador não implementado. BASE_REF=branch_alvo executor.sh:471 (:454-459); doutrina não fala de base/origin/.
- Comarka histórico: 408 tickets com merge-base HEAD staging-auto, 284 com origin/staging-auto, 0 BASE_REF; nenhum apolo cita staging-apolo.

## Sombra
- (i) validarTicket gate-ticket.ts:1393 importável (main guardado :1783-1793); contextoGit :1095-1133 roda git leitura SEM GIT_OPTIONAL_LOCKS=0; leituraDoVitest :511 bash -c em tmpdir. Sem gate_ticket no config a regra 6 fica muda.
- (ii) enforce :641 pura; sem zona_proibida lança TypeError :643-644.
- (iii) criterio_match lib.sh:1430 idêntico ao do Comarka (lib.sh:684-694) → concordância por construção; run_criterios escreve → fora.
- (iv) proximo_pendente :724 via source lib.sh com ORQ_EXEC_ROOT; seleção vai divergir por prioridade e apolo.
- Impedimentos: fila sem apolo/ (167 tickets; 4 pendentes dependem de ids do apolo: 1322→5225, 1314→5221, 1325→5227, 1318→5224); prioridade/recon_esperado/loop/testes_conferidos não lidos; config schema 1 com 28 chaves obrigatórias faltando; events.log não é lido por nenhuma das 4; criterios.txt formato diferente (comum.ts:101 criteriosFalhosLegado já entende).
- Reaproveitável: leitor-legado-comarka.ts (:20, :394, :554; não lê apolo :405), comum.ts:101, git.ts:15.
- Dry-runs: migrar-tickets não escreve no repo (tmp em diffUnificado); migrar-config dry-run grava tmp e não apaga (:337-342) e roda npx (:251-254).
- ~/.orq/repos.json: comarka resolvedor {padrao diagnostico, R1 auto, R5 auto, R2 sombra}, pausa_gate auto.
- ledger.jsonl 480 linhas (478 comarka): sobreposicao 337, pausa 72, nao_agiu 23, aviso 16, acao 11, desfecho 11, proposta 3, comparacao 3, pausa_fim 2.
- Menor caminho (palpite do leitor): adaptador 60-80 + config em memória 40 + sombra enforcement 50 + critério 40 + seleção 30 + saída 20 ≈ 250-300 linhas + testes.

## Sha de sincronização
- Só prosa: docs/migracao-comarka.md:3-4 (comarka 718206d), :8, :121-123 (portados), :162-167 (PORTE-PENDENTE abertos). Comarka main 4851598 (18/10 12:45) está 2078 commits depois de 718206d. ORIGEM.md:5 é do conteudos-infinitos.
