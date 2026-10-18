# Ticket 762: Backfill do GHL por job: agendado por cron, concluído ou com erro registrado

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Conserta a causa dos 0 leads. Um cron novo (`/api/cron/ghl-backfill`, a cada 15 minutos) acha cada conexão ativa com backfill não concluído e enfileira o job `ghl_backfill` uma vez por conexão. O worker que já roda a cada 5 minutos processa o job. O AQUINO entra sozinho na primeira passada.

- O job pagina os contatos em elos encadeados até o fim (cursor no payload) e grava `backfill_concluido_em` ao terminar.
- Toda falha grava `ultimo_erro` e `ultimo_erro_em` na conexão, com prefixo "Backfill": página que falhou, contatos não gravados, agendamento que falhou. Nenhuma falha fica só no console.
- Reconectar zera a conclusão e o backfill recomeça. Repetir um backfill que falhou é pelo "Sincronizar agora" (744).
- O status da conexão não muda.

Por que cron e não enfileirar no callback: o teste do callback está sendo reescrito pela frente 831. Enfileirar ali prenderia esta frente atrás dela.

## Campos de máquina

```json
{
  "id": "762",
  "slug": "ghl-backfill-job-conexao",
  "lane": "produto",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 600 linhas (~190 em src/lib/perf/ghl-backfill.ts, ~4 em src/lib/jobs/handlers/index.ts, ~3 em src/lib/perf/crm-conexao.ts, ~45 na rota NOVA src/app/api/cron/ghl-backfill/route.ts, ~4 em vercel.json, ~340 no teste NOVO test/ghl-backfill-job.test.ts). Se passar do teto, pare e reporte. FONTE: decisoes do Lucas de 03/10 (regra de MQL do cliente no Setup > CRM passa a usar etapas reais do GHL; tags nos tickets 746 a 748; etapas canonicas seguem so para relatorio agregado). Piloto AQUINO ADV (location BAs5Fw46Xz3uvTtq6Gmz, cliente 7837ac12-c6db-47e8-b4e8-6e043633eb6d): conectado, 7 pipelines em perf_crm_pipelines, 50 etapas em perf_crm_etapas, todas com etapa_canonica nula, location_nome nula, backfill iniciado e nao concluido, 0 linhas em perf_crm_oportunidades e 0 em perf_leads (o backfill de contatos nunca rodou: nada chama a rota nem enfileira job; a ingestao nasce nos tickets 760 a 763). CAUSA DOS 0 LEADS (recon de 03/10): (a) o backfill nunca rodou. Nada em src chama POST /api/perf/ghl/backfill/[clienteId] e nada enfileira job para ele (src/lib/jobs/handlers/index.ts so registra resumo_grupo_semanal; ops_jobs nunca teve tipo de backfill; logs de producao: 0 requisicoes a rota depois do callback das 18:22:39). backfill_iniciado_em e so o carimbo do upsert em conectarContaCliente, e sincronizarConexao vira 'ativa' depois de puxar SO pipelines e etapas. A rota, mesmo chamada, nao escreve em perf_crm_conexoes: por isso nenhum ultimo_erro. (b) Tempo real: 0 POST em /api/webhooks/ghl/app em producao desde a conexao; o codigo nao explica isso (configuracao do app no Marketplace, fora do repo). PASSO 1: leia src/lib/perf/ghl-backfill.ts (761), src/lib/jobs/core/enqueue.ts (idempotencia por tipo + chave em status vivo), src/lib/jobs/core/finalize.ts (transitorio consome tentativa com backoff; JobPermanentError falha direto; JobConfigError adia), src/app/api/jobs/worker/route.ts (cron a cada 5 min, maxDuration 300, ate 5 jobs, corte por tipo), src/lib/jobs/handlers/index.ts, src/lib/jobs/core/cron-registro.ts e src/app/api/cron/ghl-agencia-refresh/route.ts (padrao de cron: CRON_SECRET ou PERF_CRON_SECRET, registrarExecucaoCron), src/lib/perf/crm-conexao.ts (conectarContaCliente). ops_jobs.tipo NAO tem CHECK (conferido no banco em 03/10): tipo novo nao precisa de DDL. POR QUE CRON E NAO ENFILEIRAR NO CALLBACK: o callback do OAuth e coberto por test/ghl-oauth.test.ts, que outra frente (831) reescreve; enfileirar ali obrigaria a editar esse teste e prender esta frente atras dela. O cron tambem cobre a conta que JA esta conectada (AQUINO) sem acao manual. FAZER: (1) src/lib/perf/ghl-backfill.ts: export const TIPO_JOB_BACKFILL = 'ghl_backfill'. export async function enfileirarBackfillGhl(db, { clienteId, locationId, fase = 'contatos', cursor = null, passo = 0, acumulado }) chama enqueue com chave_idempotencia `ghl_backfill:${locationId}:${fase}:${passo}`, cliente_id e payload { cliente_id, location_id, fase, cursor, passo, processados, falhas }. export async function agendarBackfillsPendentes(db): para cada perf_crm_conexoes com status 'ativa', backfill_iniciado_em preenchido e backfill_concluido_em nulo, enfileira o passo 0 SO se nao existe em ops_jobs nenhum job TIPO_JOB_BACKFILL do mesmo cliente_id criado depois de backfill_iniciado_em (qualquer status): o agendador dispara UMA vez por conexao; reconectar (novo backfill_iniciado_em) dispara de novo; repetir um backfill que falhou e acao humana ('Sincronizar agora', 744). Falha ao enfileirar uma conexao grava ultimo_erro = `Backfill não pôde ser agendado: <motivo>` + ultimo_erro_em nela e segue para a proxima; erro de leitura das conexoes ou dos jobs lanca. Devolve { agendados, ja_agendados, falhas }. export async function processarJobBackfillGhl(job, db): fase 'contatos' chama backfillContatos em voltas de 5 paginas enquanto houver tempo (orcamento interno de 200 s, medido com Date.now; o corte do tipo e 240 s). (a) Pagina com erro (BackfillErro ou excecao): grava em perf_crm_conexoes (location_id) ultimo_erro = `Backfill de contatos parou: <mensagem>` (comeca com PREFIXO_ERRO_BACKFILL) e ultimo_erro_em = agora, e RELANCA (o motor de jobs refaz com backoff a partir do cursor do payload; BackfillErro 404/409 vira JobPermanentError, porque repetir nao resolve). Gravar o erro falhando = console.error e relanca o erro original: falha nunca fica muda. (b) Orcamento acabou e nao terminou: enfileira o proximo elo (passo + 1, cursor novo, acumulados) e conclui este job com { continua: true }. (c) Terminou: backfill_concluido_em = agora e, se ultimo_erro comeca com 'Backfill', ultimo_erro e ultimo_erro_em = null; acumulado de falhas > 0 grava ultimo_erro = `Backfill concluído com N contatos não gravados` + ultimo_erro_em (estado 'concluido', motivo visivel). Resultado { processados, falhas }. Status da conexao NAO muda em nenhum caso (continua 'ativa'). (2) src/lib/jobs/handlers/index.ts: registrar(TIPO_JOB_BACKFILL, processarJobBackfillGhl, { corteMs: 240_000 }). (3) src/lib/perf/crm-conexao.ts: o upsert de perf_crm_conexoes em conectarContaCliente passa a mandar backfill_concluido_em: null junto de backfill_iniciado_em (reconectar recomeca o backfill). Nada mais muda nesse arquivo. (4) NOVA rota src/app/api/cron/ghl-backfill/route.ts GET e POST (maxDuration 30): mesma autenticacao do ghl-agencia-refresh; registrarExecucaoCron('ghl-backfill', 'cron', () => agendarBackfillsPendentes(db)); erro = 500 { error: motivo }. (5) vercel.json: novo cron { \"path\": \"/api/cron/ghl-backfill\", \"schedule\": \"*/15 * * * *\" }; nada mais muda. (6) NOVO test/ghl-backfill-job.test.ts (supabase, fetch e backfillContatos mockados, Date.now controlado): enfileirar usa a chave com location, fase e passo; agendador enfileira a conexao sem job depois do inicio, pula a que ja tem (inclusive 'falhou'), pula a concluida e grava ultimo_erro quando o enqueue falha; job que termina grava backfill_concluido_em e limpa erro antigo de backfill, mas nao limpa ultimo_erro de pipeline (sem o prefixo); pagina com erro grava ultimo_erro com o prefixo e ultimo_erro_em e relanca; 404/409 viram JobPermanentError; orcamento estourado enfileira passo + 1 com o cursor e acumulados; falhas > 0 no fim gravam a mensagem de contatos nao gravados; status da conexao nunca muda; registro tem corte de 240 s; rota do cron 401 sem segredo e 200 com o placar. FORA DE ESCOPO: fase de oportunidades (763), rota manual de backfill (761; segue igual), callback do OAuth e test/ghl-oauth.test.ts (831), tela, crm-status. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; ghl_etapa_mapa e as demais ghl_* do comercial sao leitura pura e a regra nova NAO depende delas nem de perf_crm_etapas.etapa_canonica (que continua existindo so para relatorio agregado; nao altere nem apague); zero migration e zero .sql (so o 746 escreve .sql, e nao aplica); nada e escrito de volta no GHL (so GET); token do GHL so por obterTokenLocation (src/lib/perf/ghl-agencia.ts), nunca lido direto de integration_tokens e nunca logado; falha de leitura (banco ou GHL) nunca vira zero, lista vazia ou null silencioso: nada de `?? []`, `|| []`, `|| 0` ou catch que devolve vazio numa leitura, o erro sobe com o motivo; dado ausente aparece como 's/ dado' ou 'sem base' com o motivo, nunca zero e nunca verde; nenhum jargao de banco em texto de tela (nome de tabela, view, coluna, tipo_regra ou uuid); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em Geist Mono (classe font-mono ja usada no repo); Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json, ou res.text() + JSON.parse quando precisar do corpo de erro, como pedirCrm em tabs/config-tab.tsx; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch, getSession e resolveCockpitId sempre mockados nos testes (vi.mock), nunca banco real nem GHL real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou leitura de fonte com readFileSync; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel ou data-testid, nunca em classe de estilo; nunca toEqual numa lista inteira (afirme itens com toContain/some). TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "src/app/api/cron/ghl-backfill/route.ts",
    "test/ghl-backfill-job.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/perf/ghl-backfill.ts",
    "src/lib/jobs/handlers/index.ts",
    "src/lib/perf/crm-conexao.ts",
    "src/app/api/cron/ghl-backfill/route.ts",
    "vercel.json",
    "test/ghl-backfill-job.test.ts"
  ],
  "dependencias": [
    "761"
  ],
  "prioridade": 38,
  "recon_esperado": [
    {
      "descricao": "handlers so registram o resumo semanal",
      "cmd": "grep -c '^registrar(' 'src/lib/jobs/handlers/index.ts'",
      "espera": "1"
    },
    {
      "descricao": "conexao nao zera backfill_concluido_em hoje",
      "cmd": "grep -c 'backfill_concluido_em' 'src/lib/perf/crm-conexao.ts'",
      "espera": "0"
    },
    {
      "descricao": "vercel.json nao tem cron de backfill do GHL",
      "cmd": "grep -c 'ghl-backfill' 'vercel.json'",
      "espera": "0"
    },
    {
      "descricao": "src/app/api/cron/ghl-backfill/route.ts ainda nao existe",
      "cmd": "test -e 'src/app/api/cron/ghl-backfill/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/ghl-backfill-job.test.ts ainda nao existe",
      "cmd": "test -e 'test/ghl-backfill-job.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada (diff contra o merge-base com staging-auto)",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/lib/perf/ghl-backfill.ts' 'src/lib/jobs/handlers/index.ts' 'src/lib/perf/crm-conexao.ts' 'src/app/api/cron/ghl-backfill/route.ts' | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma leitura nova vira vazio em silencio (?? [] ou || [] em linha nova de src do ticket)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/lib/perf/ghl-backfill.ts' 'src/lib/jobs/handlers/index.ts' 'src/lib/perf/crm-conexao.ts' 'src/app/api/cron/ghl-backfill/route.ts' | grep -E '^[+][^+]' | grep -cE '[?][?] *\\[\\]|[|][|] *\\[\\]'); [ \"$n\" = 0 ] && echo SEM_VAZIO_SILENCIOSO || echo VAZIO_SILENCIOSO_$n",
      "espera": "SEM_VAZIO_SILENCIOSO",
      "tipo": "guarda"
    },
    {
      "descricao": "arquivos fora do escopo intocados",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- 'src/app/api/perf/ghl/backfill/[clienteId]/route.ts' 'test/ghl-backfill.test.ts' 'test/ghl-oauth.test.ts' 'src/app/api/auth/ghl/callback/route.ts' 'src/lib/perf/crm-status.ts' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADOS || echo TOCOU_$n",
      "espera": "INTOCADOS",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/lib/perf/ghl-backfill.ts' 'src/lib/jobs/handlers/index.ts' 'src/lib/perf/crm-conexao.ts' 'src/app/api/cron/ghl-backfill/route.ts' 'vercel.json' 'test/ghl-backfill-job.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 600 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 600 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma escrita nova em tabela C0 ou ghl_* do comercial",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- src | grep -E '^[+][^+]' | grep -E '[.](insert|update|upsert|delete)[(]' | grep -cE 'clientes_receita|leads_crm|ads_metadata|ads_performance|trafego_|vw_|ghl_etapa_mapa|ghl_user_map|ghl_funnel'); [ \"$n\" = 0 ] && echo SEM_ESCRITA_C0 || echo ESCREVE_C0_$n",
      "espera": "SEM_ESCRITA_C0",
      "tipo": "guarda"
    },
    {
      "descricao": "status da conexao nao e mudado pelo backfill",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/lib/perf/ghl-backfill.ts' | grep -E '^[+][^+]' | grep -cE \"status: *'(erro|backfill|ativa)'|status: *\\\"(erro|backfill|ativa)\\\"\"); [ \"$n\" = 0 ] && echo STATUS_INTACTO || echo MUDA_STATUS_$n",
      "espera": "STATUS_INTACTO",
      "tipo": "guarda"
    },
    {
      "descricao": "vercel.json so ganhou o cron novo",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; s=$(git diff --numstat \"$b\" HEAD -- 'vercel.json' | awk '{print $1\"_\"$2}'); case \"$s\" in [3-5]_[0-1]|'') echo SO_CRON_NOVO;; *) echo VERCEL_MUDOU_$s;; esac",
      "espera": "SO_CRON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "testes do GHL, jobs, crons e rota de backfill seguem verdes",
      "cmd": "npx vitest run test/ghl-agencia-2a.test.ts test/ghl-conectar-ficha.test.ts test/middleware-webhooks.test.ts test/ingest-ghl.test.ts test/fechamentos.test.ts test/qualificacao-motor.test.ts test/jobs-motor-geral.test.ts test/setup-assistente-crm-concluir.test.ts test/ghl-app-webhook.test.ts test/ghl-backfill.test.ts test/ghl-oauth.test.ts test/ghl-backfill-lib.test.ts test/jobs-worker.test.ts test/cron-paths-vercel.test.ts test/crons-meta-consolidacao.test.ts test/n8n-fase1.test.ts test/n8n-fase2.test.ts test/alertas-motor-metrica-limite.test.ts test/eventos-resposta-grupo.test.ts test/onboarding-criador-lote-c.test.ts test/relatorio-mensal-cron.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "teste novo verde (test/ghl-backfill-job.test.ts)",
      "cmd": "test -f test/ghl-backfill-job.test.ts && npx vitest run test/ghl-backfill-job.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "job registrado, cron agendando e conexao recebendo conclusao e erro",
      "cmd": "a=$(grep -c 'TIPO_JOB_BACKFILL' 'src/lib/jobs/handlers/index.ts'); b=$(grep -c '/api/cron/ghl-backfill' 'vercel.json'); c=$(grep -c 'backfill_concluido_em' 'src/lib/perf/ghl-backfill.ts' 2>/dev/null); d=$(grep -c 'ultimo_erro_em' 'src/lib/perf/ghl-backfill.ts' 2>/dev/null); e=$(grep -c 'agendarBackfillsPendentes' 'src/app/api/cron/ghl-backfill/route.ts' 2>/dev/null); [ \"$a\" -ge 1 ] && [ \"$b\" = 1 ] && [ \"${c:-0}\" -ge 1 ] && [ \"${d:-0}\" -ge 1 ] && [ \"${e:-0}\" -ge 1 ] && echo JOB_OK || echo JOB_${a}_${b}_${c:-0}_${d:-0}_${e:-0}",
      "espera": "JOB_OK"
    },
    {
      "descricao": "reconectar zera a conclusao do backfill",
      "cmd": "grep -c 'backfill_concluido_em: null' 'src/lib/perf/crm-conexao.ts'",
      "espera": "1"
    },
    {
      "descricao": "avaliador: conexao com backfill nao concluido recebe o job pelo cron (uma vez por conexao); o job pagina ate o fim em elos encadeados, grava backfill_concluido_em ao terminar e ultimo_erro/ultimo_erro_em em toda falha, inclusive de agendamento. REPROVE se: alguma falha so vai para console; status da conexao muda; limpa ultimo_erro que nao e do backfill; erro definitivo (404/409) fica repetindo; o agendador reenfileira em loop uma conexao cujo job falhou; mexe no callback do OAuth ou no teste dele.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "colunas_escritas": [
    "perf_crm_conexoes.backfill_concluido_em",
    "perf_crm_conexoes.ultimo_erro",
    "perf_crm_conexoes.ultimo_erro_em",
    "ops_jobs.tipo",
    "ops_jobs.chave_idempotencia",
    "ops_jobs.payload",
    "ops_jobs.cliente_id"
  ],
  "testes_conferidos": [
    {
      "teste": "test/ghl-agencia-2a.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ghl-conectar-ficha.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/middleware-webhooks.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ingest-ghl.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/fechamentos.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/qualificacao-motor.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/jobs-motor-geral.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/setup-assistente-crm-concluir.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ghl-app-webhook.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ghl-backfill.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ghl-backfill-lib.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/jobs-worker.test.ts",
      "motivo": "importa jobs/handlers, crm-conexao ou ghl-backfill pelo grafo; o ticket acrescenta um tipo de job. jobs-motor-geral so afirma toContain do resumo semanal e jobs-worker limpa o registro antes de cada caso. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/ghl-oauth.test.ts",
      "motivo": "exercita o callback, que chama conectarContaCliente: o upsert ganha so backfill_concluido_em: null e o teste usa toMatchObject; nada novo e escrito. Criterio roda sem edicao (o teste e reescrito pelo 831, por isso fica fora da allowlist)"
    },
    {
      "teste": "test/cron-paths-vercel.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/crons-meta-consolidacao.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/n8n-fase1.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/n8n-fase2.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/alertas-motor-metrica-limite.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/eventos-resposta-grupo.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/onboarding-criador-lote-c.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    },
    {
      "teste": "test/relatorio-mensal-cron.test.ts",
      "motivo": "le vercel.json; o ticket so acrescenta um cron em /api/cron/*, coberto pelo middleware como os outros. Nenhum conta crons. Criterio roda todos sem edicao"
    }
  ],
  "status": "pendente",
  "tentativas": 0,
  "notas_status": "pausa cross-ticket: gate 'vitest' reprovou tickets 762,851 seguidos — suspeito é o gate, não o código (ver /Users/lucasantos/Projetos/comarka-operacional/docs/fila/.orq-pause)"
}
```
