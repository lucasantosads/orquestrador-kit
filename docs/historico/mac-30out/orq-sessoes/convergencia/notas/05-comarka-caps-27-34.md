# Comarka, capacidades 27–34 (leitura 18/10)

## 27 Liberações
- liberacoes.json: liberadas 318 {token,em,por,nota}; tokens []; pendentes_ddl {} (ninguém lê). Prefixos: ddl- 52, migration- 109, decisao- 76, c0- 1, c0-migration- 0, humano: 0 (só na dependência).
- Leitores: lib.sh:155-159 (local, .liberadas[].token); deps :166-167; guarda :116-127 lê origin/main (fonte divergente); orq-server.py:866-941; validar-fila.py:800,807 não confere existência do token.
- Registro de migration aplicada: skill aplicar-migration-ddl SKILL.md:23-31 → liberar.py (16 linhas, sem validar prefixo). Duas convenções: banco.md:34 humano:ddl-*, fila.md:34 humano:migration-<id>-aplicada.

## 28 C0/SQL
- 000-config.json:35-82 c0_intocavel (no_write_tables, prefixos trafego_/vw_, ghl_comercial, dashboard_readonly, os_owned_excecoes).
- enforcement-core.ts: ddl_em_c0 :228 (não pega CREATE POLICY, GRANT, INSERT em SQL, CREATE INDEX); aplica_migration :232 em todo arquivo; escrita_em_c0 :236-244 janela 6 linhas.
- guarda: carregar_c0 :35-44; execute_sql C0 bloqueia sempre :239; apply_migration com token publicado :232-238; fail-closed :226.
- banco.md :13-15, :33-34, :36-38, :39-42, :44-58 (fase expansao/contracao obrigatória a partir de 20261019).
- checar-promocao.py :136-149, :352, :368, :447, :414; sem credencial bloqueia.

## 29 Worktrees/runner/lock
- WORKTREES_BASE lib.sh:84; prefixo orq-comarka- (config:11, lib.sh:71), apolo orq-apolo- (:74); fixos :306-309.
- ensure_runner_worktree local-loop.sh:104-116: cria só se diretório não existe; reset/clean no próprio HEAD com || true; registro podado com diretório presente não é detectado.
- BUG: `say` em :107 vai para stdout dentro de RUNNER_WT="$(ensure_runner_worktree)" (:503) → variável com 2 linhas (jq error às 12:27:22).
- limpar_worktrees_orfaos lib.sh:324-350: ids com letra nunca limpos (:336); sem prune.
- lock mkdir :424 sem PID/idade; um por loop (:49,:53). publicar.sh:134,155 espera só o lock da plataforma; ritual :83-86,107 o do alvo; promover-* os dois.
- 51 worktrees /sessions/rcw-*/tmp/validar-fila-*/arvore locked initializing (17/10 12:17–20:17): validar-fila.py abrir_arvore :1076-1099 deixa registro quando add falha (:1090); fechar_arvore :1102-1110 remove --force simples não tira locked; 681284d tirou prune.
- Apolo 18/10: preflight ok 05:17 (log :12679); 11:02–12:17 "not a git repository … orq-runner-apolo" + "repo errado: origin=''" (executor.sh:870; 1ª ocorrência log :14317); 5242 bloqueado 3/3 às 11:24:15; 12:27:22 recriado (bug do say); 12:37:57 normal. Quem podou: sem dado. orq-runner-apolo sem lock (orq-runner e staging-* têm).
- Runner plataforma 3037d25 sem 6bea005 → juiz/sonda sem settings; runner apolo recriado em 9357ca8 já tem 6bea005 (assimetria). Conferido à mão.

## 30 Agendamento
- plists instalados: 600 s, RunAtLoad true, NODE_DIR v24.19.0, NODE_OPTIONS 4096; apolo ORQ_LOOP. orq-server KeepAlive, node v24.21.0. local-loop.sh:39 PATH fixo v24.19.0. plist do repo (fora do git) com 1800.
- crontab: */20 avisa-bloqueio.sh e avisa-fila-parada.sh. GitHub Actions relatório diário (.github/workflows/orquestrador.yml:12-13,86-106).

## 31 Notificação
- avisa-bloqueio só pausa global (não vê apolo nem PAUSA_LOOP_FILE lib.sh:569); avisa-fila-parada só plataforma.
- orq-painel notificar :510-520 (plist próprio não instalado).
- Login expirado: nada detecta; preflight die → sem-progresso → disjuntor. Pausa de 17/10 (local-loop.log:112910) gravada à mão.

## 32 Instalação/config
- instalar-launchd.sh :38-88; instalar-orq-server.sh :28-74; harness-doctor.py :13,:40,:50,:71,:79,:91,:103,:110; orq-contrato.py :86-187.
- Sem schema do 000-config ($schema_versao 1 sem leitor). Um config para os dois loops.

## 33 Testes do motor
- Todos REAL exceto test-parser-verdict.sh (cópia inline de função morta, :22-40); test-preserva-evidencia.sh parcial (executa() reimplementado :39-43). Nenhum teste de ensure_runner_worktree.

## 34 Geração do lote
- Sessões humanas+Claude (2c50a23, e9990d9 71 tickets, d790bf4 42). Gerador só gerar-a11y-a1.py (sem origin/).
- fila.md:19-35 (proíbe origin/, cita só staging-auto, nada sobre staging-apolo). _TEMPLATE.md:33 critério tsc antigo diverge de fila.md:20; :38 curl localhost:3004.
- Nenhum gerador/template/regra escreve origin/; validar-fila não tem camada contra origin/ em critério.
- Pendentes: plataforma 59, 0 com origin/, 56 com merge-base; apolo 18, 0 com origin/.

## Gate streak
- por rótulo (lib.sh:711-719, :513-548); registra só no breaker e em retries esgotados (executor.sh:787-788, :808-809); _gate_streak (config:23) cita enforcement mas extrai_gate_motivo não tem. Limite 4 (config:24; 655c916 11/10 2→4).
