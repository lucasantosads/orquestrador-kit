SESSAO-KIT-MIG-A: APLICADOR DE MIGRATIONS DO KIT, LINHA DE BASE (MIG-0.5) E APLICACAO MANUAL COM UM COMANDO (MIG-5 MANUAL)

CONTEXTO (decidido pelo Lucas em 18/10)
- Fatos do recon (~/orq-sessoes/relatorio-recon-migrations.md e ~/orq-sessoes/recon-migrations/cruzamento-producao.md): no banco ogfnojbbvumujzfklkhh so o conector do Supabase do claude.ai aplica (apply_migration ou execute_sql), por chat, sessao ou a skill aplicar-migration-ddl do Comarka; a fila do Comarka trava esperando o token humano:migration-<id>-aplicada (15 tickets parados agora, 122 tokens liberados a mao em 14 dias); dos 272 arquivos, 235 batem com producao e 38 nao; 256 linhas de producao nao tem arquivo; o dashboard-comercial escreve no mesmo banco.
- Decisoes: (1) um caminho so aplica, o aplicador do kit; chats param de aplicar e DDL por execute_sql fica proibida; (2) o aplicador escreve pela API de gestao do Supabase com o SUPABASE_ACCESS_TOKEN do .env.local do repo, lido so pelo script, nunca pelo modelo e nunca impresso; (3) linha de base em 18/10: o que esta em producao e a verdade, nada antigo e renomeado nem cobrado; (4) o aplicador libera o token sozinho depois de conferir no ledger; (5) aplicador por banco, nao por repo.
- Molde: o resolvedor (job do kit que roda do checkout principal e le ~/.orq/repos.json). O aplicador e generico; o Comarka e o primeiro alvo e o kit nunca escreve motor no Comarka. A unica escrita do aplicador num repo e o token de liberacao, no formato do proprio repo, com trailer Orq-Aplicador:.
- Nesta etapa NADA e aplicado em banco real. O primeiro uso real e do Lucas, no terminal, depois do merge.

REGRAS DA SESSAO
- Worktree ~/Projetos/_worktrees/kit-mig-a, branch kit/mig-a, a partir da main do kit. node_modules por symlink para o do checkout principal.
- Escrita so no worktree e em ~/orq-sessoes/relatorio-kit-mig-a.md. ~/Projetos/comarka-operacional, ~/Projetos/dashboard-comercial, ~/Projetos/conteudos-infinitos e ~/.orq/ sao SO LEITURA; no Comarka, git so com GIT_OPTIONAL_LOCKS=0 e log, show, cat-file, ls-tree, diff, rev-parse.
- Nunca conectar em banco, nunca chamar a API de gestao, nunca ler valor de segredo (de .env so nomes), nunca usar o conector do Supabase. Testes so com stub HTTP e fixtures.
- Uma peca por commit, teste vermelho antes no mesmo commit, git add so por pathspec, nunca push, nunca claude -p nem API paga.
- As etapas 8a e 8b estao abertas em outras worktrees e mexem em CHANGELOG, PECAS e CONTRATO: escreva a documentacao desta etapa em secoes proprias (CONTRATO §19 Aplicador de migrations; PECAS etapa MIG-A) para o conflito ser so de posicao.
- Fechamento: npx tsc --noEmit, TZ=UTC vitest, test-shell.sh e test-instalar.sh, saida crua, com rc travando.

PASSO 0: LEITURA (entregue o resumo no relatorio e pare para o Lucas confirmar)
A. No kit: como o resolvedor le ~/.orq/repos.json, resolve o repo, espera git livre, commita so um arquivo e grava ledger (arquivo:linha); orq liberar e liberacao_ok (lib.sh:605-615); migrations.dir, migrations.faixa e faixas_reservadas (config-chaves.ts:102-104).
B. No Comarka: a skill .claude/skills/aplicar-migration-ddl/SKILL.md inteira; checar-promocao.py (--aplicar e --classificar, e como chama a API de gestao, linhas 38-52 e 248-275); formato real de docs/fila/liberacoes.json (liberadas[] e tokens[]) e quem le cada um; .claude/rules/banco.md e .claude/rules/fila.md:32-35.
C. Formato da tabela supabase_migrations.schema_migrations (version, statements, name, created_by, idempotency_key, rollback) e o que o apply_migration grava, segundo a documentacao publica do Supabase; diga o que nao conseguiu confirmar.
D. Proposta das pecas abaixo ajustada ao que voce leu, com arquivo de cada uma e teto de linhas. Pare.

PECAS (ajustaveis pelo PASSO 0)
P1 Config por banco em ~/.orq/repos.json: bloco migrations por repo (ferramenta supabase, dir, banco_id, credencial_env, formato do token, pre_check opcional como comando do repo, somente_leitura para repos que so contam para drift). Schema e validacao no kit; nada no 000-config dos repos.
  Pronto quando: config real do Comarka e do dashboard-comercial (este com somente_leitura) validam em fixture; banco_id repetido entre repos e aceito e agrupa.
P2 Adaptador supabase: listar_aplicadas (versao e nome) e aplicar(sql, versao, nome) pela API de gestao, numa transacao que roda o SQL e grava a linha no schema_migrations com a versao e o nome DO ARQUIVO. Recusa SQL com begin/commit proprio, CONCURRENTLY ou VACUUM (resposta: use a skill). Timeout e lock_timeout explicitos. Credencial lida do .env do repo pelo nome configurado, nunca logada.
  Pronto quando: testes com stub HTTP cobrem sucesso, erro do Postgres, timeout, recusa por begin/CONCURRENTLY e mascaramento do token em todo log e erro.
P3 Linha de base: orq migrations linha-base <banco> grava ~/.orq/migrations/<banco>.json com as versoes e nomes de producao naquele momento. Plano: arquivo de qualquer repo do banco acima da linha de base sem linha no ledger (casando por versao OU nome) e pendente; ordem por versao; linha de producao acima da linha de base sem arquivo em nenhum repo do banco e drift.
  Pronto quando: fixture com os numeros reais (copie do cruzamento-producao.md e do arquivos-migrations.tsv a lista reduzida) da os 6 pendentes recentes e os 29 de drift de outubro quando a linha de base e 20261004, e zero de ambos quando e a de hoje.
P4 orq migrations status|plano|aplicar <repo> <arquivo>: aplicar so com TTY e confirmacao digitada; recusa com ~/.orq/MIGRATIONS_PAUSADO, com ORQ_TESTE=1 fora de teste, sem TTY e se o arquivo nao esta no plano; trava por banco em ~/.orq/migrations/<banco>.lock; roda o pre_check do repo se houver e para se rc diferente de 0; mostra o SQL e o aviso de classe (regex simples: DROP, TRUNCATE, DELETE, RENAME, GRANT, POLICY, SECURITY DEFINER, ALTER COLUMN, SET NOT NULL; so aviso nesta etapa); aplica; confere no ledger que a versao entrou; emite o token no formato do repo e commita so o arquivo de liberacao com trailer Orq-Aplicador:; grava ~/.orq/migrations/ledger.jsonl.
  Pronto quando: testes cobrem cada recusa, a trava concorrente, pre_check vermelho, conferencia que falha (nao emite token) e o commit de um arquivo so; replay com o formato real do liberacoes.json do Comarka.
P5 Documentacao: CONTRATO §19, PECAS MIG-A, CHANGELOG, e a secao do manual de uso em docs/ (como aplicar, como pausar, o que o aplicador nunca faz).

ENTREGA
Relatorio em ~/orq-sessoes/relatorio-kit-mig-a.md: resumo, tabela peca, sha, testes, pronto quando cumprido sim ou nao; diff cru; as quatro suites cruas; perguntas abertas. Nunca push.
