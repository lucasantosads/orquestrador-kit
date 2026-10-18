# Ticket 1004: motores (alertas, tarefas, saúde, fila) registram execução

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Plano de conserto, item 2.4 (todo cron grava execução). Hoje só 8 dos 27 crons do `vercel.json` deixam rastro no banco (7 em `ops_jobs` pelo `registrarExecucaoCron` de `src/lib/jobs/core/cron-registro.ts` e o `perf-insights-sync` em `perf_sync_logs`). Os outros 19 rodam sem registro: se pararem, ninguém fica sabendo.

Este é o grupo dos motores: alertas, tarefas recorrentes, foto diária de saúde e o worker da fila (a cada 5 min, uma linha por dia com as tentativas somando). Depende do 1000 por causa de `tarefas-recorrentes/gerar`.

O padrão já existe e está em produção (ex.: `nps-disparo`, `ghl-backfill`): o trabalho da rota roda dentro de `registrarExecucaoCron(tipo, "cron", fn)`, que abre a linha do dia em `ops_jobs`, fecha como concluído ou falhou e relança o erro. Este ticket só aplica o padrão; o aviso de cron atrasado é o 1005.

## Campos de máquina

```json
{
  "id": "1004",
  "slug": "crons-registram-execucao-motores",
  "lane": "infra",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 300 linhas (~10 a 25 por rota, ~140 em test/cron-registro-motores.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (plano de conserto item 2.4; recon de 10/10 na staging-auto): so 8 dos 27 crons do vercel.json registram execucao no banco. O padrao e registrarExecucaoCron(tipo, 'cron', fn) de src/lib/jobs/core/cron-registro.ts (abre/reaproveita a linha do dia em ops_jobs, fecha concluido com duracao e resultado ou falhou com a classe do erro e RELANCA o erro; sem env de banco roda fn direto). Exemplos vivos: src/app/api/cron/nps-disparo/route.ts e src/app/api/cron/ghl-backfill/route.ts; teste de molde: test/cron-registro-rotas.test.ts. No worker (src/app/api/jobs/worker/route.ts) registre so no GET do cron (o POST com JOBS_WORKER_SECRET segue sem registro); a linha de registro nunca fica 'pendente', entao o claim (fn_ops_job_claim) nao a pega. FAZER: (1) Em cada rota abaixo, depois da checagem do segredo (401 continua igual e NAO registra), envolva o trabalho em registrarExecucaoCron com o tipo indicado, origem 'cron'. Pulos de fim de semana ou de dia sem trabalho ficam DENTRO do registro (o retorno do pulo vira o resultado), para o aviso de atraso nao acusar o dia pulado. O corpo da resposta e o status HTTP de sucesso e de erro continuam os mesmos de hoje (o wrapper relanca: o catch que ja existe responde). Rotas e tipos: src/app/api/perf/alertas/avaliar/route.ts -> 'alertas-avaliar'; src/app/api/ops/tarefas-recorrentes/gerar/route.ts -> 'tarefas-recorrentes'; src/app/api/perf/health/snapshot/route.ts -> 'health-snapshot'; src/app/api/jobs/worker/route.ts -> 'jobs-worker'. (2) NOVO test/cron-registro-motores.test.ts (leitura do texto das rotas, sem rede): para cada rota, importa registrarExecucaoCron de '@/lib/jobs/core/cron-registro', chama registrarExecucaoCron(\"<tipo>\" com o tipo da lista, a chamada vem DEPOIS da checagem do segredo (indice de 'registrarExecucaoCron(' maior que o de 'CRON_SECRET' ou do helper de segredo da rota) e, quando a rota tem getDay(), o indice de 'registrarExecucaoCron(' e MENOR que o de 'getDay()'. Anti-no-op: as 4 rotas existem e os 4 tipos sao distintos. Regras do repo: sem .json() novo em src (lerCorpoJson nas rotas); mensagens humanas sem nome de tabela; sem travessao (U+2014); getSession server-only; nenhuma escrita em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_atribuicao_proporcional). PROIBIDO remover assercao, afrouxar matcher ou usar .skip/.only. FORA DE ESCOPO: logica dos crons, schedule, vercel.json, middleware, aviso de atraso (ticket 1005), rotas fora da lista.",
  "cria_novo": [
    "test/cron-registro-motores.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/perf/alertas/avaliar/route.ts",
    "src/app/api/ops/tarefas-recorrentes/gerar/route.ts",
    "src/app/api/perf/health/snapshot/route.ts",
    "src/app/api/jobs/worker/route.ts",
    "test/cron-registro-motores.test.ts"
  ],
  "dependencias": [
    "1000"
  ],
  "prioridade": 32,
  "recon_esperado": [
    {
      "descricao": "test/cron-registro-motores.test.ts ainda nao existe",
      "cmd": "test -e 'test/cron-registro-motores.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "nenhuma das rotas registra execucao hoje",
      "cmd": "r=SEM_REGISTRO; for f in 'src/app/api/perf/alertas/avaliar/route.ts' 'src/app/api/ops/tarefas-recorrentes/gerar/route.ts' 'src/app/api/perf/health/snapshot/route.ts' 'src/app/api/jobs/worker/route.ts'; do [ \"$(grep -c 'registrarExecucaoCron' \"$f\")\" = 0 ] || r=JA_TEM_$f; done; echo $r",
      "espera": "SEM_REGISTRO"
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
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/perf/alertas/avaliar/route.ts' 'src/app/api/ops/tarefas-recorrentes/gerar/route.ts' 'src/app/api/perf/health/snapshot/route.ts' 'src/app/api/jobs/worker/route.ts' 'test/cron-registro-motores.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 300 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 300 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "cada rota registra com o seu tipo",
      "cmd": "r=FEITO; [ \"$(grep -c 'registrarExecucaoCron(\"alertas-avaliar\"' 'src/app/api/perf/alertas/avaliar/route.ts')\" -ge 1 ] && [ \"$(grep -c '@/lib/jobs/core/cron-registro' 'src/app/api/perf/alertas/avaliar/route.ts')\" -ge 1 ] || r=FALTA_alertas-avaliar; [ \"$(grep -c 'registrarExecucaoCron(\"tarefas-recorrentes\"' 'src/app/api/ops/tarefas-recorrentes/gerar/route.ts')\" -ge 1 ] && [ \"$(grep -c '@/lib/jobs/core/cron-registro' 'src/app/api/ops/tarefas-recorrentes/gerar/route.ts')\" -ge 1 ] || r=FALTA_tarefas-recorrentes; [ \"$(grep -c 'registrarExecucaoCron(\"health-snapshot\"' 'src/app/api/perf/health/snapshot/route.ts')\" -ge 1 ] && [ \"$(grep -c '@/lib/jobs/core/cron-registro' 'src/app/api/perf/health/snapshot/route.ts')\" -ge 1 ] || r=FALTA_health-snapshot; [ \"$(grep -c 'registrarExecucaoCron(\"jobs-worker\"' 'src/app/api/jobs/worker/route.ts')\" -ge 1 ] && [ \"$(grep -c '@/lib/jobs/core/cron-registro' 'src/app/api/jobs/worker/route.ts')\" -ge 1 ] || r=FALTA_jobs-worker; echo $r",
      "espera": "FEITO",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/cron-registro-motores.test.ts, test/jobs-worker.test.ts)",
      "cmd": "test -f test/cron-registro-motores.test.ts && npx vitest run 'test/cron-registro-motores.test.ts' 'test/jobs-worker.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: cada rota da lista roda o trabalho dentro de registrarExecucaoCron com o tipo pedido, depois da checagem do segredo, com o pulo de fim de semana dentro do registro, e responde igual a hoje em sucesso e em erro. REPROVE se: 401 passou a registrar; o tipo difere da lista; o erro deixou de chegar ao catch da rota; mudou calculo, filtro ou corpo de resposta; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/crons-meta-consolidacao.test.ts",
      "motivo": "exercitam ou leem a rota de cron; o ticket so envolve o trabalho em registrarExecucaoCron (que roda fn direto sem env de banco e relanca o erro), sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-motor-geral.test.ts",
      "motivo": "exercitam ou leem a rota de cron; o ticket so envolve o trabalho em registrarExecucaoCron (que roda fn direto sem env de banco e relanca o erro), sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-worker.test.ts",
      "motivo": "exercitam ou leem a rota de cron; o ticket so envolve o trabalho em registrarExecucaoCron (que roda fn direto sem env de banco e relanca o erro), sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/tarefas-recorrentes-por-cliente.test.ts",
      "motivo": "exercitam ou leem a rota de cron; o ticket so envolve o trabalho em registrarExecucaoCron (que roda fn direto sem env de banco e relanca o erro), sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
