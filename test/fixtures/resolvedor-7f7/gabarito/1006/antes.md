# Ticket 1006: rotas legadas usam o token Meta da conexão ativa, não do env

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Plano de conserto, item 1.3. Quatro rotas antigas do OS ainda leem `META_ADS_ACCESS_TOKEN` do ambiente (token de usuário, longo, fora do controle de conexões): `/api/clientes/performance`, `/api/clientes/[id]/performance`, `/api/clientes/calcular-score` e `/api/clientes/alertas-campanha`. A coleta nova já resolve o token pela conexão ativa (`resolveMetaConn`, precedência system user, depois OAuth do cliente, depois agência).

Recon de 10/10: a conexão system user (2c3cba71) está ativa e sem vencimento; a de agência (478e0a26) está com o acesso vencido desde 15/08. As 4 rotas só chamam a Meta quando o espelho do Notion tem `meta_campaign_id`, e hoje são 0 de 344 linhas, então a troca não muda número na tela; ela tira o OS da dependência do token do ambiente (que pode ser removido da Vercel depois). A troca do vínculo das 8 contas para a conexão system user é dado e fica com o Lucas.

## Campos de máquina

```json
{
  "id": "1006",
  "slug": "token-meta-pela-conexao",
  "lane": "infra",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 360 linhas (~30 em src/lib/perf/conn-resolver.ts, ~15 a 25 em cada uma das 4 rotas, ~220 em test/token-meta-sem-env.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (plano de conserto item 1.3; recon de 10/10): 4 rotas leem process.env.META_ADS_ACCESS_TOKEN para chamar a Graph API por campanha: src/app/api/clientes/performance/route.ts (fetchCampaignSpend), src/app/api/clientes/[id]/performance/route.ts (fetchCampaignRange e fetchCampaignMonthly), src/app/api/clientes/calcular-score/route.ts (fetchCampaignMetrics) e src/app/api/clientes/alertas-campanha/route.ts (fetchSpend3d). A coleta nova resolve o token por src/lib/perf/conn-resolver.ts (resolveMetaConn(clienteId): system_user ativo sem cliente, senao oauth_cliente do cliente, senao agencia_bm ativa; decifra com a rpc decrypt_meta_token e LANCA sem chave ou se a decifragem falhar). No banco: conexao system_user ativa sem vencimento; agencia_bm ativa com token_expires_at 15/08. As 4 rotas so chamam a Meta quando clientes_notion_mirror.meta_campaign_id esta preenchido (0 de 344 hoje). FAZER: (1) conn-resolver.ts: export async function resolveMetaConnAgencia(): Promise<ResolvedMetaConn | null> com a mesma decifragem de resolveMetaConn e precedencia system_user ativo sem cliente, senao agencia_bm ativa (sem o passo do cliente); resolveMetaConn continua igual (pode compartilhar codigo sem mudar comportamento). (2) Nas 4 rotas troque process.env.META_ADS_ACCESS_TOKEN pelo token de resolveMetaConnAgencia(), resolvido UMA vez por requisicao e so quando houver campanha a consultar (memo local; nada de chamada ao banco quando nao ha meta_campaign_id); sem conexao (null) ou com erro de decifragem a rota se comporta como hoje sem token (spend sem dado para aquela campanha), com console.error sem o token. As funcoes de fetch recebem o token por parametro. Nao mude URL, campos, periodo nem calculo. (3) NOVO test/token-meta-sem-env.test.ts: com vi.mock('@supabase/supabase-js') de cliente falso: resolveMetaConnAgencia escolhe system_user quando existe, cai para agencia_bm quando nao, devolve null sem nenhuma, nunca consulta oauth_cliente e decifra via rpc; leitura do texto: nenhuma ocorrencia de META_ADS_ACCESS_TOKEN em src/ (varre a pasta; anti-no-op: a varredura acha pelo menos 100 arquivos) e as 4 rotas importam resolveMetaConnAgencia. Regras do repo: sem .json() novo em src (lerCorpoJson nas rotas); mensagens humanas sem nome de tabela; sem travessao (U+2014); getSession server-only; nenhuma escrita em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_atribuicao_proporcional). PROIBIDO remover assercao, afrouxar matcher ou usar .skip/.only. FORA DE ESCOPO: trocar o vinculo das contas em perf_ad_accounts (dado, decisao do Lucas), remover META_ADS_ACCESS_TOKEN da Vercel, mudar a fonte de campanha (espelho do Notion), metaGet/freio de limite (970), tela.",
  "cria_novo": [
    "test/token-meta-sem-env.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/perf/conn-resolver.ts",
    "src/app/api/clientes/performance/route.ts",
    "src/app/api/clientes/[id]/performance/route.ts",
    "src/app/api/clientes/calcular-score/route.ts",
    "src/app/api/clientes/alertas-campanha/route.ts",
    "test/token-meta-sem-env.test.ts"
  ],
  "dependencias": [],
  "prioridade": 20,
  "recon_esperado": [
    {
      "descricao": "test/token-meta-sem-env.test.ts ainda nao existe",
      "cmd": "test -e 'test/token-meta-sem-env.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "5 leituras do token do env em src (4 rotas)",
      "cmd": "n=$(grep -rn 'META_ADS_ACCESS_TOKEN' src | wc -l | tr -d ' '); [ \"$n\" = 5 ] && echo CINCO || echo ST_$n",
      "espera": "CINCO"
    },
    {
      "descricao": "resolveMetaConnAgencia ainda nao existe",
      "cmd": "n=$(grep -c 'resolveMetaConnAgencia' 'src/lib/perf/conn-resolver.ts'); [ \"$n\" = 0 ] && echo SEM_AGENCIA || echo ST_$n",
      "espera": "SEM_AGENCIA"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/perf/conn-resolver.ts' 'src/app/api/clientes/performance/route.ts' 'src/app/api/clientes/[id]/performance/route.ts' 'src/app/api/clientes/calcular-score/route.ts' 'src/app/api/clientes/alertas-campanha/route.ts' 'test/token-meta-sem-env.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 360 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 360 ] && echo NO_TETO || echo ESTOUROU_$t",
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
      "descricao": "src sem token do env e resolver exportado",
      "cmd": "n=$(grep -rn 'META_ADS_ACCESS_TOKEN' src | wc -l | tr -d ' '); m=$(grep -c 'export async function resolveMetaConnAgencia' src/lib/perf/conn-resolver.ts); [ \"$n\" = 0 ] && [ \"$m\" = 1 ] && echo FEITO || echo ST_${n}_${m}",
      "espera": "FEITO",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/token-meta-sem-env.test.ts, test/meta-conexao-canonica.test.ts)",
      "cmd": "test -f test/token-meta-sem-env.test.ts && npx vitest run 'test/token-meta-sem-env.test.ts' 'test/meta-conexao-canonica.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: as 4 rotas legadas usam o token da conexao ativa (system user, senao agencia) resolvido uma vez e so quando ha campanha, sem nenhuma leitura do token do ambiente, com o mesmo calculo e sem logar token. REPROVE se: resolveMetaConn mudou de comportamento; a rota consulta o banco sem campanha a buscar; erro de decifragem derruba a rota inteira; token aparece em log ou resposta; mudou URL, periodo ou calculo; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/agregacoes-truncadas-ficha.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/agregacoes-truncadas-visao.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/carteira-campanha.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/clientes-getsession-lote2.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/coleta-meta-falha-alto.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cron-get-alertas-consistencia.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/crons-get-sem-efeito.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/crons-meta-rodam.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-string-crons-score-campanha.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ghl-backfill-job.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/insights-buracos.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-motor-geral.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-worker.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/lote-b3-3-r2.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meta-activity.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meta-conexao-canonica.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meta-entity-action.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/meta-otimizacoes-import.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/n8n-fase1.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/perf-insights-sync-direto.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/performance-reunioes-select.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-leitura-ia-fonte-unica.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-lembrete-quem-cuida.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-mensal-cron.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-mensal-envio.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-pagina-params.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-rascunho-ia.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-rascunho-paginado.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-semanal-cron.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-semanal-envio.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-semanal-nomes-meta.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-semanal-regerar.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relatorio-semanal-tela.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resolver-cliente-rota-performance.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resolver-cliente-rota-relatorio-semanal.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resultado-derivado-sync.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resultado-meta.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sai-cockpit-id-api-c.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sincronizar-cliente.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-ads-ad-map-chave.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-ads-persistencia.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-campos-novos.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-cliente-job.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sync-persistencia.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/tarefas-recorrentes-por-cliente.test.ts",
      "motivo": "importam o conn-resolver ou as rotas legadas; o ticket so acrescenta resolveMetaConnAgencia (resolveMetaConn intacto) e troca a origem do token nas 4 rotas, sem mudar calculo nem resposta; se quebrar, PARE e descreva"
    }
  ],
  "status": "bloqueado",
  "notas_status": "enforcement: fora_do_pathspec: test/quem-cuida.test.ts"
}
```
