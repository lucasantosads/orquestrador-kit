# Ticket 940: Performance por nicho e tese: o agregado puro (mediana, faixa, amostra, score e desvio)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Primeira fatia da frente "Performance por nicho e tese" (decisões do Lucas de 09/10). Este ticket
é só a regra, sem I/O: recebe linhas já lidas e devolve o agregado nicho > tese > cliente > tipo de
funil, com mediana, faixa, base, cobertura, score e a contagem de semanas em desvio. A leitura do
banco e a rota são o 940b. Tudo o que vem depois (telas, foto mensal, avaliação, tarefa de desvio,
meta sugerida, prova comercial) consome este módulo.

As constantes ficam num arquivo só: amostra mínima de 3 clientes, pesos do score (CAC 50%, CPMQL
30%, %MQL 20%) e o gatilho de desvio (50% acima da mediana por 2 semanas seguidas).

Referência visual da frente: `docs/roadmap/mockups/performance-tese/README.md`.

## Recon de 09/10 (só leitura)

```
$ select count(*) ... (banco vivo, 09/10, só leitura)
perf_teses ativas 11 · perf_nichos ativos 11 · perf_campanha_tese ativos 4
perf_insights_daily: 490 linhas, 2 clientes, 22 campanhas (17/05 a 09/10)
campanhas com gasto desde 01/09: 6, com tese 4 (1 cliente: AQUINO ADV)
perf_leads: 1333 linhas, 162 com campaign_id, 0 com tese_id, 0 MQL, 0 venda_em
perf_fechamentos: 0 · perf_tese_premissas ativas: 0 · clientes_teses com ticket: 0
```
Com esse volume, toda tese e todo nicho saem "sem amostra" hoje. O agregado precisa nascer certo
para quando a coleta crescer, e os testes provam a regra com fixture.

## Campos de máquina

```json
{
  "id": "940",
  "slug": "nicho-tese-agregado-lib",
  "lane": "produto",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 780 linhas (~35 em constantes.ts, ~280 em agregar.ts, ~80 em score.ts, ~50 em desvio.ts, ~320 no teste NOVO test/perf-nicho-tese-agregar.test.ts). Se passar do teto, pare e reporte. DECISOES DO LUCAS (09/10/2026), valem para a frente inteira: (a) tese vem da campanha (perf_campanha_tese ativo=true); cliente com mais de uma tese entra em cada tese e conta 1 vez no total do nicho. (b) Metricas-norte: %MQL, CPMQL e CAC. Valor de linha = MEDIANA entre os clientes, com faixa (minimo a maximo) embaixo; tese ou nicho com menos de 3 clientes nao ranqueia e mostra 'sem amostra · N clientes'. (c) Custo por resultado segue o objetivo da campanha (src/lib/perf/objetivo-campanha.ts); engajamento entra no Investido e fica fora do custo. Tipo de funil: Todos, Formulario, Mensagem, LP, Webinar; em Todos o custo aparece por tipo ('Form R$ 44 / Msg R$ 2,30'), nunca somado. (d) Score do ranking: CAC 50%, CPMQL 30%, %MQL 20% (posicao normalizada); sem venda registrada a tese entra so com CPMQL e %MQL, renormalizados, e fica marcada 'parcial'. (e) Periodo: o seletor padrao do OS (usePeriodoUrl), um so para a aba. (f) Aba Avaliacao: so superadmin e Head de Trafego, pelo RBAC existente, nunca lista de e-mails. (g) Desvio: CPMQL 50% ou mais acima da mediana da tese por 2 semanas seguidas, numeros em constante exportada unica. (h) Sem dado = 's/ dado' em cinza com o motivo, nunca zero; todo numero com o denominador na mesma linha. (i) Regra 19: nenhum R$ de mensalidade, MRR ou LTV da agencia; dinheiro DO CLIENTE (contratos, faturamento gerado, ROAS, investimento em anuncio) e permitido. (j) Zona C0 intocavel; DDL e cron novo so com token humano; nunca editar vercel.json. CONTEXTO (recon 09/10, so leitura): hoje Performance so tem a Carteira (uma linha por cliente) e /api/perf/dashboard/overview tem um by_tese que SOMA gasto e leads de todos os clientes (nao mediana, sem amostra, sem tipo de funil). Banco vivo 09/10: 2 clientes coletando, 1 com tese, 0 MQL, 0 fechamento; o agregado nasce 'sem amostra' e a prova e por fixture. ESTE TICKET E SO REGRA PURA (sem supabase, sem fetch, sem next): a leitura e a rota sao o 940b. PASSO 1: leia src/lib/perf/objetivo-campanha.ts, src/lib/perf/familia-resultado.ts (somarPorIndicador, familiaDoIndicador, nomeDoIndicador), src/lib/perf/metricas-por-tipo.ts linhas 1-32 (grupoDoTipo) e src/lib/perf/teses-cliente.ts (molde de funcao pura). FAZER: (1) NOVO src/lib/perf/nicho-tese/constantes.ts: exporte AMOSTRA_MINIMA_CLIENTES = 3; PESOS_SCORE = { cac: 0.5, cpmql: 0.3, pct_mql: 0.2 } as const; DESVIO_TESE = { pct_acima: 50, semanas_seguidas: 2 } as const (constante UNICA do gatilho de desvio, consumida pelo 934 e pelo 935; nenhum outro arquivo repete 50 ou 2 para isso); TIPOS_FUNIL = ['formulario','mensagem','lp','webinar'] as const (os do filtro; 'outro' existe nos dados mas nao no filtro) e ROTULO_TIPO curto para a tela: formulario 'Form', mensagem 'Msg', lp 'LP', webinar 'Webinar', outro 'Outro'. (2) NOVO src/lib/perf/nicho-tese/agregar.ts com os tipos exportados e a funcao exportada agregarNichoTese(entrada): entrada = { insights: {cliente_id, campaign_id, campaign_nome, gasto, resultado_indicador, resultado_qtd}[], funil: {campaign_id, tipo_funil}[], vinculos: {campaign_id, tese_id}[], teses: {id, nome, nicho_id}[], nichos: {id, nome}[], clientes: {id, nome}[], mqls: {cliente_id, campaign_id, tese_id}[], fechamentos: {cliente_id, campaign_id, tese_id, valor_total}[], tickets: {tese_id, cliente_id|null, ticket}[], gestores: {cliente_id, gestor_id, nome}[], filtro: { tipo: 'todos'|TipoFunil, nicho_id: string|null } }. tipo de funil da campanha: config_funil_campanha.tipo_funil (valores no banco em 09/10: formulario, landing_page, mensagens, outro, webinar; 64 linhas) mapeado para 'formulario' (formulario), 'mensagem' (mensagens, direct), 'lp' (landing_page), 'webinar' (webinar) e 'outro' (outro ou sem config); o OBJETIVO vem de classificarObjetivo(tipo_funil, null, null) de src/lib/perf/objetivo-campanha.ts e, quando der 'nao_identificado', da familia do resultado (familiaDoIndicador de src/lib/perf/familia-resultado.ts sobre o resultado_indicador das linhas da campanha: familia 'lead' = captacao, 'engajamento' = engajamento; sem indicador = nao_identificado). Campanha sem config com resultado de conversa vira 'mensagem', de formulario vira 'formulario', de lead do site vira 'lp'. Regras por CAMPANHA: investido = soma de gasto; campanha de engajamento soma em investido_engajamento e em investido, e fica FORA de resultados, custo, CPMQL e CAC; campanha de captacao soma resultados (resultado_qtd da familia lead) e investido_captacao no seu tipo. Por CLIENTE dentro de uma tese: investido, investido_engajamento, custo_por_tipo [{tipo, investido, resultados, custo = investido/resultados ou null}], leads (soma dos resultados de captacao), mqls (perf_leads MQL da campanha ou, sem campanha, com tese_id da tese), pct_mql = mqls/leads*100 (null sem lead), cpmql = investido_captacao/mqls (null sem MQL), contratos = fechamentos da tese (por campaign_id da tese ou tese_id), cac = investido_captacao/contratos (null sem contrato), gerado = contratos x ticket da tese (ticket do proprio cliente se houver, senao o da tese com cliente_id null; null sem ticket), roas = gerado/investido (null sem gerado). Filtro tipo != 'todos': so campanhas desse tipo entram (engajamento sai). Filtro nicho: so teses do nicho. MULTITESE: cliente com campanhas em 2 teses aparece nas 2; no NICHO o cliente conta 1 vez, com os valores somados das campanhas dele dentro daquele nicho (soma, depois razao). MEDIANA: funcao exportada mediana(valores) (par = media dos dois do meio; vazio = null) e faixa {min, max}; objeto Mediana = { valor: number|null, min: number|null, max: number|null, n: number, motivo: 'sem_amostra'|'sem_dado'|null } onde n = clientes que TEM a metrica. AMOSTRA: tese ou nicho com menos de AMOSTRA_MINIMA_CLIENTES clientes tem sem_amostra = true e TODAS as Medianas da linha com valor/min/max null e motivo 'sem_amostra' (os clientes continuam listados no detalhe); com amostra e n = 0 numa metrica, motivo 'sem_dado'. Linha de tese: { tese_id, nome, nicho_id, clientes, sem_amostra, investido (soma), investido_engajamento (soma), pct_mql, cpmql, cac, roas, investido_mediano (Mediana), custo_por_tipo: {tipo, mediana: Mediana}[] (so tipos que aparecem), contratos (soma), gerado (soma ou null), clientes_detalhe: LinhaCliente[] com gestor principal {gestor_id, nome}|null e distancia_mediana_pct = (cpmql do cliente / mediana cpmql da tese - 1)*100 arredondado (null sem um dos dois) }. Linha de nicho: os mesmos campos agregados por cliente unico + teses: LinhaTese[]. Sem tese: { clientes, investido, campanhas } das campanhas com gasto sem vinculo. Cobertura: { campanhas_com_gasto, classificadas, investido_total, investido_classificado, pendentes: {campaign_id, campaign_nome, cliente_id, cliente_nome, investido}[] ordenadas por investido desc }. Indicadores do topo: Mediana de investido, pct_mql, cpmql, cac e roas entre TODOS os clientes do recorte (um valor por cliente, sem amostra abaixo de 3 clientes). Resposta: { cobertura, indicadores, nichos, sem_tese }. (3) NOVO src/lib/perf/nicho-tese/score.ts: export function calcularScore(linhas: {id, sem_amostra, cac: number|null, cpmql: number|null, pct_mql: number|null}[]) devolve {id, score: number|null, parcial: boolean, posicao: number|null}[]. So linhas sem sem_amostra ranqueiam. Para cada metrica, ordene as linhas que tem a metrica (CAC e CPMQL: menor e melhor; %MQL: maior e melhor) e de a posicao normalizada 1 - (pos-1)/(N-1) (N = 1 da 1). score = soma(peso x normalizada) / soma(pesos das metricas presentes) x 100, arredondado a 1 casa. Sem CAC: parcial = true e o score sai so de CPMQL e %MQL renormalizados (pesos 0.3 e 0.2 sobre 0.5). Sem CPMQL e sem %MQL: score null. posicao = ordem por score desc (empate: menor CPMQL primeiro, depois nome), null quando score null ou sem amostra. (4) NOVO src/lib/perf/nicho-tese/desvio.ts: export function semanasEmDesvio(serie: {semana: string, cpmql_cliente: number|null, mediana_tese: number|null}[]): number = quantas semanas seguidas, contando da mais recente para tras, o cpmql_cliente ficou >= mediana_tese x (1 + DESVIO_TESE.pct_acima/100); semana com qualquer dos dois null interrompe a contagem. export function emDesvio(serie) = semanasEmDesvio(serie) >= DESVIO_TESE.semanas_seguidas. export function pctAcima(cpmql, mediana) arredondado. (5) NOVO test/perf-nicho-tese-agregar.test.ts (so funcoes puras, sem mock de banco), um it por regra: mediana impar, par e vazia; faixa min/max; tese com 2 clientes => sem_amostra true e Mediana valor null com motivo 'sem_amostra'; tese com 3 clientes => mediana numerica; MULTITESE: cliente com campanhas em 2 teses do mesmo nicho aparece nas 2 teses e o nicho tem clientes = 1 a menos que a soma das teses; ENGAJAMENTO: campanha com resultado_indicador 'actions:post_engagement' (fixture do AQUINO de 01 a 09/10: R$ 230,20 e 27.379 interacoes) soma no investido e nao entra em custo_por_tipo nem em cpmql; custo por tipo NUNCA somado: cliente com Form R$ 841,76 / 15 e Msg R$ 409,61 / 261 tem custo_por_tipo com 2 entradas (56,12 e 1,57 arredondados a 2 casas) e nenhum campo de custo unico; filtro tipo 'formulario' tira a campanha de mensagem; cobertura conta campanha sem vinculo em pendentes; score com CAC (pesos 50/30/20) e sem CAC (parcial true, renormalizado); semanasEmDesvio = 2 com duas semanas em 150% da mediana, 0 com 149%, e 1 quando a semana anterior e null. FORA DE ESCOPO: leitura do banco, rota, tela, cron, qualquer arquivo fora da allowlist, overview e carteira. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; vercel.json intocado; chave oficial do cliente e cliente_id (uuid); churn_log: nunca leia mensalidade nem ltv_total; falha de leitura nunca vira zero, lista vazia ou verde: nada de `?? []`, `|| []` ou `|| 0` numa leitura, o erro sobe com o motivo (500 na rota, ErrorState na tela); dado ausente aparece como 's/ dado' ou 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup, esbuild transformSync no molde de test/bloco-vazio-linha.test.ts, ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira; var() nao resolve em atributo de apresentacao SVG. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/travessao-mudo.test.ts, test/c0-guard.test.ts, test/regra19.test.ts, test/ui-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "src/lib/perf/nicho-tese/constantes.ts",
    "src/lib/perf/nicho-tese/agregar.ts",
    "src/lib/perf/nicho-tese/score.ts",
    "src/lib/perf/nicho-tese/desvio.ts",
    "test/perf-nicho-tese-agregar.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/perf/nicho-tese/constantes.ts",
    "src/lib/perf/nicho-tese/agregar.ts",
    "src/lib/perf/nicho-tese/score.ts",
    "src/lib/perf/nicho-tese/desvio.ts",
    "test/perf-nicho-tese-agregar.test.ts"
  ],
  "dependencias": [],
  "prioridade": 30,
  "recon_esperado": [
    {
      "descricao": "src/lib/perf/nicho-tese/agregar.ts ainda nao existe",
      "cmd": "test -e src/lib/perf/nicho-tese/agregar.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/lib/perf/nicho-tese/constantes.ts ainda nao existe",
      "cmd": "test -e src/lib/perf/nicho-tese/constantes.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/perf-nicho-tese-agregar.test.ts ainda nao existe",
      "cmd": "test -e test/perf-nicho-tese-agregar.test.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/lib/perf/objetivo-campanha.ts existe",
      "cmd": "test -e src/lib/perf/objetivo-campanha.ts && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "classificarObjetivo existe com a assinatura (tipoGestor, tipoDetectado, objetivoMeta)",
      "cmd": "grep -cF 'export function classificarObjetivo(' src/lib/perf/objetivo-campanha.ts",
      "espera": "1"
    },
    {
      "descricao": "medicao do criterio de pureza contra HEAD: usos de @supabase, next/ ou fetch( nos 4 arquivos do criterio hoje (todos ausentes) = 0, sem uso legitimo a excetuar",
      "cmd": "cat src/lib/perf/nicho-tese/constantes.ts src/lib/perf/nicho-tese/agregar.ts src/lib/perf/nicho-tese/score.ts src/lib/perf/nicho-tese/desvio.ts 2>/dev/null | grep -cE '@supabase|from \"next/|fetch[(]'",
      "espera": "0"
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
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "vercel.json intocado",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- vercel.json | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo VERCEL_INTOCADO || echo VERCEL_EDITADO",
      "espera": "VERCEL_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/lib/perf/nicho-tese/constantes.ts src/lib/perf/nicho-tese/agregar.ts src/lib/perf/nicho-tese/score.ts src/lib/perf/nicho-tese/desvio.ts | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' src/lib/perf/nicho-tese/constantes.ts src/lib/perf/nicho-tese/agregar.ts src/lib/perf/nicho-tese/score.ts src/lib/perf/nicho-tese/desvio.ts test/perf-nicho-tese-agregar.test.ts | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 780 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 780 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "zero escrita em banco nas linhas adicionadas dos arquivos de src do ticket",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/lib/perf/nicho-tese/constantes.ts src/lib/perf/nicho-tese/agregar.ts src/lib/perf/nicho-tese/score.ts src/lib/perf/nicho-tese/desvio.ts | grep -E '^[+][^+]' | grep -cE '[.](insert|update|upsert|delete|rpc)[(]'); [ \"$n\" = 0 ] && echo SEM_ESCRITA || echo ESCRITA_$n",
      "espera": "SEM_ESCRITA",
      "tipo": "guarda"
    },
    {
      "descricao": "constante unica do desvio exportada com 50 e 2",
      "cmd": "n=$(grep -cF 'export const DESVIO_TESE' src/lib/perf/nicho-tese/constantes.ts 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo DESVIO_OK || echo FALTA_${n:-0}",
      "espera": "DESVIO_OK"
    },
    {
      "descricao": "amostra minima de 3 exportada",
      "cmd": "n=$(grep -cF 'AMOSTRA_MINIMA_CLIENTES = 3' src/lib/perf/nicho-tese/constantes.ts 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo AMOSTRA_OK || echo FALTA_${n:-0}",
      "espera": "AMOSTRA_OK"
    },
    {
      "descricao": "agregarNichoTese exportada",
      "cmd": "n=$(grep -cF 'export function agregarNichoTese' src/lib/perf/nicho-tese/agregar.ts 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo AGREGAR_OK || echo FALTA_${n:-0}",
      "espera": "AGREGAR_OK"
    },
    {
      "descricao": "calcularScore exportada",
      "cmd": "n=$(grep -cF 'export function calcularScore' src/lib/perf/nicho-tese/score.ts 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo SCORE_OK || echo FALTA_${n:-0}",
      "espera": "SCORE_OK"
    },
    {
      "descricao": "semanasEmDesvio exportada",
      "cmd": "n=$(grep -cF 'export function semanasEmDesvio' src/lib/perf/nicho-tese/desvio.ts 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo DESVIO_FN_OK || echo FALTA_${n:-0}",
      "espera": "DESVIO_FN_OK"
    },
    {
      "descricao": "a lib e pura: nenhum import de supabase, next ou fetch( nos 4 arquivos. Teto medido em 09/10 contra HEAD 2460a9f e origin/staging-auto com o mesmo grep: 0 (os 4 arquivos nao existem; recon lista a medicao). EXCETO: nenhum uso legitimo a preservar; teto 0",
      "cmd": "test -f src/lib/perf/nicho-tese/agregar.ts && teto=0 && n=$(cat src/lib/perf/nicho-tese/constantes.ts src/lib/perf/nicho-tese/agregar.ts src/lib/perf/nicho-tese/score.ts src/lib/perf/nicho-tese/desvio.ts 2>/dev/null | grep -cE '@supabase|from \"next/|fetch[(]'); [ \"$n\" -le \"$teto\" ] && echo PURA || echo IO_$n",
      "espera": "PURA"
    },
    {
      "descricao": "o numero 50 do gatilho nao se repete fora da constante (desvio.ts usa DESVIO_TESE)",
      "cmd": "test -f src/lib/perf/nicho-tese/desvio.ts && n=$(grep -c 'DESVIO_TESE' src/lib/perf/nicho-tese/desvio.ts) && m=$(grep -vE '^ *(//|\\*)' src/lib/perf/nicho-tese/desvio.ts | grep -cE '\\b50\\b'); [ \"$n\" -ge 1 ] && [ \"$m\" = 0 ] && echo SEM_NUMERO_SOLTO || echo ST_${n:-0}_${m:-x}",
      "espera": "SEM_NUMERO_SOLTO"
    },
    {
      "descricao": "teste(s) novo(s) verde(s) (test/perf-nicho-tese-agregar.test.ts)",
      "cmd": "test -f test/perf-nicho-tese-agregar.test.ts && npx vitest run test/perf-nicho-tese-agregar.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: mediana com faixa e base; tese ou nicho com menos de 3 clientes sem numero ('sem amostra'); multitese conta o cliente nas duas teses e 1 vez no nicho; engajamento no investido e fora do custo; custo por tipo nunca somado; score 50/30/20 com renormalizacao 'parcial' sem CAC; desvio por constante unica. REPROVE se: custo somado entre tipos; mediana calculada sobre linhas em vez de clientes; zero no lugar de null; I/O na lib; numero do gatilho fora da constante.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/bloco-vazio-linha.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/consistencia-contagens.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/fetch-json-teto.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/regra19.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/travessao-mudo.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/ui-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Mediana entre clientes com faixa e n; <3 clientes zera todas as Medianas com sem_amostra; multitese une por cliente no nicho; engajamento só no investido; custo_por_tipo sem soma entre tipos; score 50/30/20, parcial renormaliza; DESVIO_TESE único; lib sem I/O. Ressalva: toEqual em lista de 1 item no teste."
}
```
