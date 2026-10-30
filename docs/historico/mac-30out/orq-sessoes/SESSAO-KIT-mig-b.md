SESSAO-KIT-MIG-B: PUBLICADOR DE UM ARQUIVO (APLICADOR E RESOLVEDOR PUBLICAM DADO NA ORIGIN SEM TOCAR NO CHECKOUT PRINCIPAL), LISTA DE BLOQUEADAS E VARIAS PASTAS POR REPO

CONTEXTO (decidido pelo Lucas em 18/10, 16h07)
- A MIG-A entrou na main do kit (908f2a1). O aplicador commita o token no liberacoes.json do checkout principal do repo, sem push. Isso repete o defeito medido no Comarka em 18/10: o resolvedor commitou b2854a5 no main local sem push, o main local divergiu da origin/main, o merge --ff-only foi recusado e 6 tokens publicados ficaram invisiveis para os loops ate um conserto manual (7ba4313). A regra do Comarka tambem proibe commitar no checkout principal.
- Decisao nova, que muda uma decisao fechada do programa: o motor continua sem pushar CODIGO, mas o aplicador e o resolvedor passam a PUBLICAR ARQUIVO DE DADOS (liberacoes e arquivo de ticket em docs/fila/) direto na origin, por worktree temporaria a partir da origin, com push origin HEAD:<branch>. Nunca mais escrevem no checkout principal.
- O Comarka vai sincronizar o checkout principal por ff-only no inicio de cada disparo (frente do chat do Comarka, commit MOTOR:). O kit nao depende disso para testar, mas o primeiro uso real do aplicador no Comarka so acontece depois.
- A etapa 8b esta aberta e mexe em resolvedor/repo.ts (branchEsperada). Esta sessao comeca DEPOIS do merge da 8b na main; o PASSO 0 confere isso.

REGRAS DA SESSAO
- Worktree ~/Projetos/_worktrees/kit-mig-b, branch kit/mig-b, a partir da main do kit, node_modules por symlink.
- Escrita so no worktree e em ~/orq-sessoes/relatorio-kit-mig-b.md. Comarka, dashboard-comercial, conteudos-infinitos e ~/.orq/ SO LEITURA (no Comarka, git com GIT_OPTIONAL_LOCKS=0 e so log, show, cat-file, ls-tree, diff, rev-parse).
- Testes so com repos git de fixture em tmp com origin bare local. Nunca push para remoto real, nunca banco, nunca segredo, nunca claude -p.
- Uma peca por commit, vermelho antes no mesmo commit, git add por pathspec, nunca push da propria branch.
- Documentacao em secoes proprias (CONTRATO, PECAS etapa MIG-B, CHANGELOG).
- Fechamento: npx tsc --noEmit, TZ=UTC vitest, test-shell.sh, test-instalar.sh, crus, com rc travando.

PASSO 0: LEITURA (entregue o resumo no relatorio e pare)
A. Confirme que a 8b esta na main do kit (sha e mensagem) e leia o estado atual de resolvedor/repo.ts (comitarUmArquivo, escreverEComitar, branchEsperada, esperarGit) e de migrations/liberacao.ts e aplicar.ts.
B. Liste todo lugar do kit que diz que o motor nao pusha (CONTRATO, CLAUDE.md, docs/PECAS.md, testes que asseveram isso) com arquivo:linha.
C. No Comarka: como a casa publica token hoje por worktree (scripts e regras, arquivo:linha), qual branch recebe docs/fila (main), o que o .githooks/pre-commit roda num commit so de docs/fila e quanto tempo pode levar, e o que congela a main (docs/fila/.orq-pause, pausar_file).
D. Proposta das pecas abaixo ajustada ao que leu, com arquivo e teto de linhas. Pare.

PECAS (ajustaveis pelo PASSO 0)
P1 publicador de um arquivo (modulo novo, generico): recebe repo, caminho relativo (so docs/fila/**), branch (da branchEsperada), uma transformacao pura conteudo_atual -> conteudo_novo, mensagem e trailer. Faz fetch; recusa com .orq-pause ou pausar_file do repo; cria worktree destacada da origin/<branch> num diretorio do kit (fora de qualquer checkout de repo, nunca em /tmp do repo); aplica a transformacao; commita so o arquivo, sem --no-verify; push origin HEAD:<branch>; se o push for recusado por nao fast-forward, refaz do zero a partir da origin nova e reaplica a transformacao, ate 2 tentativas; remove a worktree em todo caminho (sucesso, erro, sinal); nunca toca no checkout principal nem no index dele; devolve o sha publicado.
  Pronto quando: testes com origin bare cobrem publicacao simples, corrida (outro commit chega na origin entre o fetch e o push: segunda tentativa publica com os dois), transformacao que nao muda nada (nao commita), hook pre-commit vermelho (nao publica, worktree removida), pausa do repo (recusa), caminho fora de docs/fila (recusa), e prova que o checkout principal ficou byte a byte igual (HEAD, index e arvore).
P2 aplicador publica o token pelo publicador: a transformacao do liberacoes.json no formato do repo (o que a MIG-A ja faz) roda sobre o conteudo da origin, nao da arvore local; depois do push, confere com git show origin/<branch>:<arquivo> que o token esta la; se o push falhar depois da migration aplicada, grava no ledger "aplicada_sem_token" com a nota pronta e imprime o comando para publicar de novo (orq migrations publicar-token <banco> <versao>), que tambem e novo e idempotente.
  Pronto quando: replay com o liberacoes.json real do Comarka na origin fixture; publicar-token idempotente (rodar duas vezes nao duplica); checkout principal intacto.
  Mais: o token gravado SEM o prefixo humano: (formato liberadas do Comarka) e um teste de ida e volta que roda o deps_resolvidas/liberacao_ok real do Comarka (copiado para fixture, com sha de origem) contra o arquivo publicado e prova que a dependencia humano:migration-<id>-aplicada resolve. Motivo: em 18/10 a skill gravou humano:migration-1332-aplicada e o 1329 e o 1334 nao destravaram, porque o deps_resolvidas tira o prefixo da dependencia e compara por igualdade exata.
P3 resolvedor publica pelo publicador: escreverEComitar troca o commit local pelo publicador, mantendo as travas de hoje (uma acao por bloqueio, teto por ticket, so docs/fila/<id>-*.md, trailer Orq-Resolvedor:, desfazer). orq desfazer passa a publicar o revert do mesmo jeito.
  Pronto quando: os testes do resolvedor seguem verdes com o ajuste minimo de fixture (origin bare), e um teste novo prova que depois de uma acao o checkout principal nao ganhou commit e a origin ganhou exatamente um.
P4 lista de bloqueadas por banco: migrations.bancos.<banco>.bloqueadas = [{arquivo, motivo, desde}] no repos.json. O plano mostra a secao Bloqueadas com o motivo; o aplicar recusa com o motivo. Valores iniciais que o manual vai sugerir: 20261018003200_employees_public_sem_anon (quebra leitura anon do dashboard-comercial em employees_public) e 20261007190900_churn_fecha_leitura_anon (absorvida pela 20261010231000).
  Pronto quando: plano e aplicar testados com as duas.
P5 varias pastas e refs por repo somente_leitura: dir aceita lista (dirs), e refs vale tambem para repo somente_leitura; arquivo casado em qualquer pasta conta para o plano e o drift.
  Pronto quando: fixture do dashboard com supabase/migrations, migrations/ e scripts/ casa os nomes de outubro que hoje aparecem como drift quando o corte e 20261004.
P6 documentacao: CONTRATO (secao nova: o que o kit publica sozinho, so dado em docs/fila/, por worktree temporaria, nunca codigo), PECAS etapa MIG-B, CHANGELOG, manual do aplicador atualizado (publicar-token, bloqueadas, o aplicador nao toca no checkout principal).

ENTREGA
Relatorio em ~/orq-sessoes/relatorio-kit-mig-b.md: tabela peca, sha, testes, pronto quando; diff cru; quatro suites cruas; perguntas abertas. Nunca push.
