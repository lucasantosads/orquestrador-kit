# Ticket 1054: leitores da ficha do cliente leem a casa nova (lib/data, ficha por id, resumo, diagnóstico, entregáveis)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion", leva B (leitores), área ficha do cliente. Depois das escritas (1051 a 1053c), quem lê score, risco, fase (status), situação, resultados, atenção, analista, último feedback e nicho tem de ler onde o dado passou a ser gravado: `ops_cliente_negocio` (lib `negocio.ts`), `ops_cliente_perfil` (lib `perfil-operacional.ts`) e o catálogo de nichos (`ops_cliente_nichos` + `perf_nichos`). As colunas legadas sem casa (`meta_campaign_id`, `fb_url`, `entregaveis`, `raw_properties`...) e a ponte `notion_id` ↔ `cliente_id` passam pela única porta de leitura (`espelho-legado.ts`, 1050b). Nenhum arquivo deste ticket cita `clientes_notion_mirror` ao final.

Arquivos e o que cada um lia (staging-auto, 13/10):

```
src/lib/data.ts:102-128           getClientes: select * do espelho -> Cliente (status, situacao, resultados, atencao, nicho, analista, plataformas, orcamento, dia_otimizacao, ultimo_feedback, ultima_otimizacao, pagamento, automacao, fb, gads, tiktok)
src/lib/data.ts:131-156           getClienteById(notionId): idem por notion_id
src/lib/data.ts:164-178           getClientesDoEmployee: espelho (notion_id, cliente_id) + quem-cuida + getClientes
src/app/api/notion/clientes/[id]/route.ts:42-51  notionIdDoCliente: primeira linha do espelho por cliente_id; :17-28 clienteNativo devolve os campos vazios
src/app/api/clientes/[id]/resumo/route.ts:80-86   analista, nicho, risco_churn, entrada_id por notion_id; :103-110 receita por entrada_id
src/app/api/clientes/[id]/diagnostico/route.ts:39-73  espelho por entrada_id (notion_id, nicho, analista, cliente_id) + score_saude, risco_churn, risco_churn_motivo, meta_campaign_id
src/app/api/clientes/entregaveis/route.ts:39-45   entregaveis jsonb por notion_id
```

Testes que mockam o espelho nesses caminhos: `test/resumo-cliente.test.ts:69,108,160,187` (recalculado), `test/resolver-cliente-rota-diagnostico.test.ts:44` (mock por tabela; a ponte por entrada passa a vir da lib, que usa o mesmo client), `test/ficha-por-uuid.test.ts:32` e `test/quem-cuida.test.ts:63-68,120` (banco em memória; a lib lê a mesma memória).

## Campos de máquina

```json
{
  "id": "1054",
  "slug": "negocio-leitores-ficha",
  "lane": "dados",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 760 linhas (~45 em src/lib/clientes/nichos-catalogo.ts NOVO, ~130 em src/lib/data.ts, ~35 em src/app/api/notion/clientes/[id]/route.ts, ~45 em src/app/api/clientes/[id]/resumo/route.ts, ~60 em src/app/api/clientes/[id]/diagnostico/route.ts, ~20 em src/app/api/clientes/entregaveis/route.ts, ~50 de recalculo em test/resumo-cliente.test.ts, ~250 em test/leitores-ficha-casa-nova.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion, leva B): libs prontas: src/lib/clientes/negocio.ts (1051: lerNegocio(db, id), lerNegocios(db, ids) -> Map; campos score_saude, score_calculado_em, risco_churn, risco_churn_motivo, risco_churn_acao, risco_calculado_em, temperatura, temperatura_em, fase), src/lib/clientes/perfil-operacional.ts (1052b: lerPerfilOperacional(db, id), lerPerfisOperacionais(db, ids) -> Map; analista, situacao, resultados, atencao, dia_otimizar, ultimo_feedback, data_otimizacao, plataformas), src/lib/clientes/espelho-legado.ts (1050b: pontePorCliente, notionUnicoDoCliente, pontePorNotion, pontePorEntrada, lerEspelhoPorNotion, lerEspelhoPorCliente, lerEspelhoPorEntrada, lerEspelhoTodo; colunas legadas tipadas em ColunaLegada). Depende de 1050b, 1051, 1052b, 1053 e 1053b. REGRA DE LEITURA (vale para todos os leitores da frente): campo de negocio vem de negocio (fase -> status operacional); campo de perfil vem do perfil; nicho vem do catalogo (nomes unidos por ', '); so quando o cliente NAO tem cliente_id (linha legada do espelho sem vinculo) o valor legado do espelho e usado como fallback, para a ficha nao ficar em branco; coluna legada sem casa (fb_url, gads_url, tiktok_url, otimizacao, orcamento*, pagamento, automacao, raw_properties, entregaveis, meta_*) continua vindo do espelho PELA LIB. PASSO 1: leia as tres libs, src/lib/data.ts linhas 1-180, src/app/api/notion/clientes/[id]/route.ts inteiro, src/app/api/clientes/[id]/resumo/route.ts linhas 60-160, src/app/api/clientes/[id]/diagnostico/route.ts linhas 25-140, src/app/api/clientes/entregaveis/route.ts linhas 1-50, test/resumo-cliente.test.ts inteiro, test/resolver-cliente-rota-diagnostico.test.ts linhas 30-100, test/ficha-por-uuid.test.ts e test/quem-cuida.test.ts linhas 55-125. FAZER: (1) NOVO src/lib/clientes/nichos-catalogo.ts (recebe db; sem client proprio): export async function lerNomesNichosPorCliente(db, clienteIds: string[]): Promise<Map<string, string[]>> ([] -> Map vazio sem consulta; le ops_cliente_nichos select 'cliente_id, nicho_id' .in('cliente_id', ids) e perf_nichos select 'id, nome' .in('id', nicho_ids); erro lanca new Error(`nichos: ${message}`); nomes em ordem alfabetica por cliente); export function nichoTexto(nomes: string[] | undefined, legado: unknown): string (nomes.join(', ') se houver, senao String(legado ?? '')). (2) src/lib/data.ts: funcao interna `async function montarClientes(linhas: LinhaEspelho[]): Promise<Cliente[]>`: ids = cliente_id nao nulos; `const [negocios, perfis, nichos] = await Promise.all([lerNegocios(supabase, ids), lerPerfisOperacionais(supabase, ids), lerNomesNichosPorCliente(supabase, ids)])`; cada linha vira Cliente com: notion_id, nome: m.cliente, status: negocio?.fase ?? m.status ?? '', situacao: perfil?.situacao ?? m.situacao ?? '', resultados, atencao e analista idem, nicho: nichoTexto(nichos.get(cid), m.nicho), dia_otimizacao: perfil?.dia_otimizar ?? m.dia_otimizar ?? '', ultimo_feedback: perfil?.ultimo_feedback ?? m.ultimo_feedback ?? '', ultima_otimizacao: perfil?.data_otimizacao ?? m.otimizacao ?? '', e os legados (plataformas por fb_url/gads_url/tiktok_url, orcamento, pagamento, automacao, fb, gads, tiktok) como hoje; o fallback `?? m.x` so se aplica quando a linha nao tem cliente_id (com cliente_id, o valor e o da casa nova ou ''). getClientes(): `montarClientes(await lerEspelhoTodo(supabase, COLUNAS_CLIENTE))` onde COLUNAS_CLIENTE lista as ColunaLegada usadas (cliente, status, situacao, resultados, atencao, nicho, analista, fb_url, gads_url, tiktok_url, orcamento, dia_otimizar, ultimo_feedback, otimizacao, pagamento, automacao); a regra `filter((m) => m.cliente)` continua; erro: hoje devolve [] em erro (linha 107) e PASSA A LANCAR (a rota /api/notion/clientes ja trata com 500). getClienteById(notionId): `lerEspelhoPorNotion(supabase, [notionId], COLUNAS_CLIENTE)`; sem linha null; senao `(await montarClientes([linha]))[0]`. getClientesDoEmployee(employeeId): `lerEspelhoTodo(supabase, COLUNAS_CLIENTE, { soComCliente: true })`, filtra por cuidaDoCliente(q, employeeId, m.cliente_id) e monta so essas linhas (sem chamar getClientes de novo). Zero `.from('clientes_notion_mirror')` em data.ts ao final (as funcoes de escrita ja sairam no 1052b). Imports: lerNegocios, lerPerfisOperacionais, lerNomesNichosPorCliente, nichoTexto, lerEspelhoTodo, lerEspelhoPorNotion e o tipo LinhaEspelho. (3) src/app/api/notion/clientes/[id]/route.ts: notionIdDoCliente usa `pontePorCliente(supabase, [clienteId])` e devolve o notion_id da primeira linha (mesma regra de hoje: primeira por notion_id, e null quando igual ao proprio id); clienteNativo deixa de devolver os campos vazios: le lerNegocio, lerPerfilOperacional e lerNomesNichosPorCliente para o uuid e preenche status (fase), situacao, resultados, atencao, nicho, analista, dia_otimizacao, ultimo_feedback, ultima_otimizacao; os legados sem casa (plataformas, orcamento, pagamento, automacao, fb, gads, tiktok) continuam ''; erro de leitura lanca (cai no 500 existente). A ordem uuid-primeiro, o 404 com notion_id e o getClienteById ficam. (4) src/app/api/clientes/[id]/resumo/route.ts: o select do espelho (linhas 80-86) SAI; com par.cliente_id: `lerPerfilOperacional` (gestor = perfil.analista), `lerNomesNichosPorCliente` (nicho = nomes unidos) e a receita por `.eq('cliente_id', par.cliente_id)` (select mes_fechamento, fidelidade_inicio, fidelidade_fim; SO LEITURA; limit 1); sem par.cliente_id mas com par.notion_id: `lerEspelhoPorNotion(supabase, [par.notion_id], ['analista', 'nicho'])` e a ponte entrada_id da linha para a receita (fallback legado); semDados continua = nenhuma fonte (perfil/linha legada, reunioes, tracking); campos nulos continuam omitidos. (5) src/app/api/clientes/[id]/diagnostico/route.ts: os dois selects do espelho (linhas 39-73) SAEM; `clienteIdLinha = entrada.cliente_id ?? (primeira linha com cliente_id de pontePorEntrada(supabase, [id]))?.cliente_id ?? null`; `chaveResolver = clienteIdLinha ?? (primeira linha de pontePorEntrada)?.notion_id ?? null` (mesma regra de hoje, pela lib); com clienteIdLinha: negocio (score_saude, risco_churn, risco_churn_motivo), perfil (analista), nichos (nomes) e `lerEspelhoPorCliente(supabase, [clienteIdLinha], ['meta_campaign_id'])` para o meta_campaign_id legado; o contexto da IA usa esses valores ('não calculado' quando nulo, como hoje); sem clienteIdLinha tudo fica 'não calculado' (e o traco que a rota ja usa) como hoje. (6) src/app/api/clientes/entregaveis/route.ts: getEntregaveis usa `lerEspelhoPorNotion(supabase, [clienteId], ['entregaveis'])` (sem linha -> []); o cabecalho passa a dizer que os entregaveis sao coluna legada do espelho lida pela lib ate ganhar casa. (7) test/resumo-cliente.test.ts RECALCULADO (comentario 'Ticket 1054: ...' acima de cada mudanca): mockComDados ganha perfil (ops_cliente_perfil), nichos (ops_cliente_nichos + perf_nichos) e receita por cliente_id; o resolverCliente mockado devolve cliente_id para os casos de dado presente; 'timeline mescla ...' espera gestor 'Ana Silva' vindo do perfil e nicho 'Direito' vindo do catalogo; 'campos nulos sao omitidos' com perfil nulo e sem nichos; 'sem reunioes' idem; NENHUM it removido. (8) NOVO test/leitores-ficha-casa-nova.test.ts (vi.mock de @supabase/supabase-js com from por tabela; vi.mock de @/lib/session; vi.mock de @/lib/clientes/resolver-cliente onde a rota o usa; uuids RFC-4122): getClienteById monta status da fase e situacao/analista do perfil e nicho do catalogo para linha com cliente_id, e usa o legado do espelho para linha sem cliente_id; getClientes lanca quando o espelho falha (nunca []); getClientesDoEmployee filtra por cuidaDoCliente; GET /api/notion/clientes/[id] por uuid devolve status/situacao preenchidos da casa nova; diagnostico usa score/risco de ops_cliente_negocio e meta_campaign_id pela lib; entregaveis GET le pela lib; its estaticos: zero 'clientes_notion_mirror' nos 6 arquivos de src da allowlist. PROIBIDO remover assercao, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: sem .json() novo em src; mensagens humanas sem nome de tabela; sem travessao (U+2014) em string nova; getSession server-only; nenhuma escrita em banco neste ticket; falha de leitura vira erro (500), nunca lista vazia nem 'sem base' falso; Set e Map so com Array.from.  (7) Os dois testes de rota que caem com a lib (13/10, tentativas 1 e 3 cairam aqui; entram na allowlist): em test/resolver-cliente-rota-diagnostico.test.ts, a funcao cadeia() ganha 'in' na lista de metodos (['select', 'eq', 'is', 'order', 'limit', 'in']) e montar() devolve, para a tabela clientes_notion_mirror, `cadeia({ data: opts.mirror ? [opts.mirror] : [], error: null }, t)` (a lib le LISTA por select().in(), nunca maybeSingle); os 5 its e todas as assercoes sobre filtros.or ficam identicos. Em test/resolver-cliente-rota-resumo.test.ts, a lista de metodos do chain ganha 'in' (['select', 'eq', 'or', 'order', 'limit', 'is', 'gte', 'lte', 'insert', 'in']); nada mais muda (6 its, o it 'resumo segue lendo a linha antiga pela ponte' continua esperando 200 e or sem cliente_id.eq). REGRA DURA (a tentativa 2 foi reprovada pelo avaliador por isso): as rotas resumo e diagnostico leem o espelho SOMENTE pelas funcoes da lib (lerEspelhoPorEntrada, lerEspelhoPorNotion, lerEspelhoPorCliente, pontePorEntrada); nunca from('clientes_notion_mirror') nem from(TABELA_ESPELHO) nem importar TABELA_ESPELHO na rota; o diagnostico continua mandando meta_campaign_id para a IA (lerEspelhoPorCliente com a coluna). FORA DE ESCOPO: contrato-dados.ts, relacao.ts, reunioes/store.ts e comentarios da ficha (1054b), geral-tab.tsx (1060b), rotas /api/notion/* renomeadas (1059), resolver-cliente.ts (1060), telas, migration.",
  "cria_novo": [
    "src/lib/clientes/nichos-catalogo.ts",
    "test/leitores-ficha-casa-nova.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/clientes/nichos-catalogo.ts",
    "src/lib/data.ts",
    "src/app/api/notion/clientes/[id]/route.ts",
    "src/app/api/clientes/[id]/resumo/route.ts",
    "src/app/api/clientes/[id]/diagnostico/route.ts",
    "src/app/api/clientes/entregaveis/route.ts",
    "test/resumo-cliente.test.ts",
    "test/leitores-ficha-casa-nova.test.ts",
    "test/resolver-cliente-rota-diagnostico.test.ts",
    "test/resolver-cliente-rota-resumo.test.ts"
  ],
  "dependencias": [
    "1050b",
    "1051",
    "1052b",
    "1053",
    "1053b"
  ],
  "prioridade": 34,
  "recon_esperado": [
    {
      "descricao": "src/lib/clientes/nichos-catalogo.ts e test/leitores-ficha-casa-nova.test.ts ainda nao existem",
      "cmd": "a=$(test -e src/lib/clientes/nichos-catalogo.ts && echo 1 || echo 0); b=$(test -e test/leitores-ficha-casa-nova.test.ts && echo 1 || echo 0); [ \"$a\" = 0 ] && [ \"$b\" = 0 ] && echo AUSENTES || echo ST_${a}_${b}",
      "espera": "AUSENTES"
    },
    {
      "descricao": "data.ts ainda le o espelho com select * em getClientes e getClienteById",
      "cmd": "f=src/lib/data.ts; a=$(grep -c 'from(\"clientes_notion_mirror\")' $f); b=$(grep -c 'export async function getClienteById' $f); c=$(grep -c 'export async function getClientesDoEmployee' $f); [ \"$a\" -ge 3 ] && [ \"$b\" = 1 ] && [ \"$c\" = 1 ] && echo LE_ESPELHO || echo ST_${a}_${b}_${c}",
      "espera": "LE_ESPELHO"
    },
    {
      "descricao": "as 4 rotas da area ainda leem o espelho direto",
      "cmd": "a=$(grep -c 'from(\"clientes_notion_mirror\")' 'src/app/api/notion/clientes/[id]/route.ts'); b=$(grep -c 'from(\"clientes_notion_mirror\")' 'src/app/api/clientes/[id]/resumo/route.ts'); c=$(grep -c 'from(\"clientes_notion_mirror\")' 'src/app/api/clientes/[id]/diagnostico/route.ts'); d=$(grep -c 'from(\"clientes_notion_mirror\")' src/app/api/clientes/entregaveis/route.ts); [ \"$a\" = 1 ] && [ \"$b\" = 1 ] && [ \"$c\" = 2 ] && [ \"$d\" = 1 ] && echo ROTAS_LEEM_ESPELHO || echo ST_${a}_${b}_${c}_${d}",
      "espera": "ROTAS_LEEM_ESPELHO"
    },
    {
      "descricao": "test/resumo-cliente.test.ts ainda mocka o espelho por tabela",
      "cmd": "a=$(grep -c 'table === \"clientes_notion_mirror\"' test/resumo-cliente.test.ts); b=$(grep -c 'ops_cliente_perfil' test/resumo-cliente.test.ts); [ \"$a\" = 1 ] && [ \"$b\" = 0 ] && echo MOCK_ESPELHO || echo ST_${a}_${b}",
      "espera": "MOCK_ESPELHO"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/clientes/nichos-catalogo.ts' 'src/lib/data.ts' 'src/app/api/notion/clientes/[id]/route.ts' 'src/app/api/clientes/[id]/resumo/route.ts' 'src/app/api/clientes/[id]/diagnostico/route.ts' 'src/app/api/clientes/entregaveis/route.ts' 'test/resumo-cliente.test.ts' 'test/leitores-ficha-casa-nova.test.ts' 'test/resolver-cliente-rota-diagnostico.test.ts' 'test/resolver-cliente-rota-resumo.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 760 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 760 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes que leem os 6 arquivos seguem verdes (inclui test/resumo-cliente.test.ts recalculado)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ficha-por-uuid.test.ts test/getsession-notion-clientes.test.ts test/getsession-notion-onboarding-team.test.ts test/quem-cuida.test.ts test/sai-resolver-chave-lib-g.test.ts test/situacao-gate.test.ts test/cabecalho-campos-destino.test.ts test/comissao-autorizacao.test.ts test/profile-gate.test.ts test/carteira-sort.test.ts test/carteira-edicao.test.ts test/clientes-getsession-lote1.test.ts test/clientes-getsession-lote2.test.ts test/resolver-cliente-rota-diagnostico.test.ts test/resolver-cliente-rota-resumo.test.ts test/guardrail14-financeiro.test.ts test/ia-default-do-banco.test.ts test/ia-relacao-reuniao-operacional.test.ts test/registros-cliente.test.ts test/resumo-ia.test.ts test/whatsapp-resumo-periodo.test.ts test/resumo-score-fonte-unica.test.ts test/erro-objeto-nao-quebra.test.ts test/resumo-erro-nao-persiste.test.ts test/closer-analysis-sessao.test.ts test/resumo-cliente.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum dos 6 arquivos de src cita mais o espelho; data.ts e as rotas leem pelas libs (nem pelo nome nem por TABELA_ESPELHO)",
      "cmd": "a=$(grep -c 'clientes_notion_mirror\\|TABELA_ESPELHO' src/lib/data.ts 'src/app/api/notion/clientes/[id]/route.ts' 'src/app/api/clientes/[id]/resumo/route.ts' 'src/app/api/clientes/[id]/diagnostico/route.ts' src/app/api/clientes/entregaveis/route.ts src/lib/clientes/nichos-catalogo.ts | awk -F: '{s+=$NF} END {print s+0}'); b=$(grep -c 'lerNegocios(' src/lib/data.ts); c=$(grep -c 'lerPerfisOperacionais(' src/lib/data.ts); d=$(grep -c 'lerNomesNichosPorCliente(' src/lib/data.ts); e=$(grep -c 'pontePorCliente(' 'src/app/api/notion/clientes/[id]/route.ts'); f=$(grep -c 'lerPerfilOperacional(' 'src/app/api/clientes/[id]/resumo/route.ts'); g=$(grep -c 'lerNegocio(' 'src/app/api/clientes/[id]/diagnostico/route.ts'); h=$(grep -c 'lerEspelhoPorNotion(' src/app/api/clientes/entregaveis/route.ts); i=$(grep -c 'export async function lerNomesNichosPorCliente(' src/lib/clientes/nichos-catalogo.ts); [ \"$a\" = 0 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$d\" -ge 1 ] && [ \"$e\" -ge 1 ] && [ \"$f\" -ge 1 ] && [ \"$g\" -ge 1 ] && [ \"$h\" -ge 1 ] && [ \"$i\" = 1 ] && echo LEITORES_NA_CASA_NOVA || echo ST_${a}_${b}_${c}_${d}_${e}_${f}_${g}_${h}_${i}",
      "espera": "LEITORES_NA_CASA_NOVA",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/resumo-cliente.test.ts: nenhum expect(/it( a menos, mock do perfil presente, nenhum skip/only/todo",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/resumo-cliente.test.ts; a=$(git show \"$b:$f\" | grep -cF 'expect('); n=$(grep -cF 'expect(' \"$f\"); ia=$(git show \"$b:$f\" | grep -cF 'it('); ni=$(grep -cF 'it(' \"$f\"); o=$(grep -c 'ops_cliente_perfil' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$n\" -ge \"$a\" ] && [ \"$ni\" -ge \"$ia\" ] && [ \"$o\" -ge 1 ] && [ \"$sk\" = 0 ] && echo RECALCULADO_1054 || echo ST_${a}_${n}_${ia}_${ni}_${o}_${sk}",
      "espera": "RECALCULADO_1054",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento nos 2 testes de rota: its intactos (5 e 6), chain com 'in', espelho em lista no diagnostico, assercao legada do resumo mantida; diagnostico ainda manda meta_campaign_id",
      "cmd": "d='test/resolver-cliente-rota-diagnostico.test.ts'; r='test/resolver-cliente-rota-resumo.test.ts'; a=$(grep -c '^  it(' \"$d\" || true); b=$(grep -c '\"in\"' \"$d\" || true); c=$(grep -c '\\[opts.mirror\\]' \"$d\" || true); e=$(grep -c 'filtros.or' \"$d\" || true); f=$(grep -c '^  it(' \"$r\" || true); g=$(grep -c '\"in\"' \"$r\" || true); h=$(grep -c 'not.toContain(\"cliente_id.eq\")' \"$r\" || true); k=$(grep -c 'meta_campaign_id' 'src/app/api/clientes/[id]/diagnostico/route.ts' || true); [ \"$a\" = 5 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$e\" -ge 6 ] && [ \"$f\" = 6 ] && [ \"$g\" -ge 1 ] && [ \"$h\" = 1 ] && [ \"$k\" -ge 1 ] && echo RECALCULADO_ROTAS_1054 || echo ST_${a}_${b}_${c}_${e}_${f}_${g}_${h}_${k}",
      "espera": "RECALCULADO_ROTAS_1054"
    },
    {
      "descricao": "testes verdes (test/leitores-ficha-casa-nova.test.ts)",
      "cmd": "test -f test/leitores-ficha-casa-nova.test.ts && npx vitest run test/leitores-ficha-casa-nova.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: lib/data monta o Cliente da ficha com fase/perfil/catalogo para quem tem cliente_id e so cai no legado do espelho (pela lib) para linha sem vinculo; getClientes lanca em erro; a ficha por uuid devolve os campos da casa nova; resumo e diagnostico leem perfil, negocio e catalogo e a ponte por entrada so pela lib; entregaveis le pela lib; zero leitura direta do espelho nos 6 arquivos. REPROVE se: resta .from('clientes_notion_mirror') em arquivo da allowlist; erro de leitura vira lista vazia; cliente com cliente_id mostra valor do espelho em vez da casa nova; nicho como texto livre quando o catalogo tem vinculo; funcao exportada de data.ts removida ou renomeada; assercao removida ou afrouxada; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/ficha-por-uuid.test.ts",
      "motivo": "banco em memoria com o espelho e a rota /api/notion/clientes/[id]; a lib le a mesma memoria (ponte por cliente_id) e as tabelas novas nascem vazias no helper; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/getsession-notion-clientes.test.ts",
      "motivo": "testa 401 sem sessao nas rotas notion/clientes; a ordem getSession primeiro nao muda"
    },
    {
      "teste": "test/getsession-notion-onboarding-team.test.ts",
      "motivo": "testa getSession em rotas que usam getTeam/getOnboarding de lib/data, intocadas"
    },
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "banco em memoria com o espelho e quem-cuida; getClientesDoEmployee passa a ler pela lib na mesma memoria e a falha simulada do espelho continua virando 500 (a lib lanca); afirma que lib/data nao contem getClientesByAnalista; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sai-resolver-chave-lib-g.test.ts",
      "motivo": "testa addOtimizacaoEntry de lib/data, intocado"
    },
    {
      "teste": "test/situacao-gate.test.ts",
      "motivo": "mocka @/lib/data por nome; nomes exportados preservados"
    },
    {
      "teste": "test/cabecalho-campos-destino.test.ts",
      "motivo": "monta o mock de @/lib/data pelos imports da rota situacao; nomes preservados"
    },
    {
      "teste": "test/comissao-autorizacao.test.ts",
      "motivo": "mocka getTeam de lib/data; intocado"
    },
    {
      "teste": "test/profile-gate.test.ts",
      "motivo": "usa getTeam por transitividade; intocado"
    },
    {
      "teste": "test/carteira-sort.test.ts",
      "motivo": "importa so o tipo Cliente de lib/data; a interface nao muda"
    },
    {
      "teste": "test/carteira-edicao.test.ts",
      "motivo": "importa mutations.ts, que usa so o tipo Cliente; intocado"
    },
    {
      "teste": "test/acao-unica-ficha-mutacoes.test.tsx",
      "motivo": "importa ficha-context, que usa so o tipo Cliente de lib/data; intocado"
    },
    {
      "teste": "test/acao-unica-reunioes.test.tsx",
      "motivo": "idem: tipo Cliente por transitividade; intocado"
    },
    {
      "teste": "test/campanhas-aba-criativos.test.tsx",
      "motivo": "idem: chega a lib/data por transitividade de tipos; intocado"
    },
    {
      "teste": "test/clientes-getsession-lote1.test.ts",
      "motivo": "testa 401 sem sessao no diagnostico e em outras rotas; getSession continua antes de qualquer leitura"
    },
    {
      "teste": "test/clientes-getsession-lote2.test.ts",
      "motivo": "testa 401 sem sessao em entregaveis e outras rotas; idem"
    },
    {
      "teste": "test/guardrail14-financeiro.test.ts",
      "motivo": "confere que o resumo le clientes_receita so por mes_fechamento/fidelidade_*; a leitura passa a ser por cliente_id com as mesmas colunas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ia-default-do-banco.test.ts",
      "motivo": "cita a rota do resumo por caminho na lista de rotas de IA; o modelo nao muda"
    },
    {
      "teste": "test/ia-relacao-reuniao-operacional.test.ts",
      "motivo": "idem; intocado"
    },
    {
      "teste": "test/registros-cliente.test.ts",
      "motivo": "cita o caminho da pasta do resumo por outro motivo (registros); intocado"
    },
    {
      "teste": "test/resumo-ia.test.ts",
      "motivo": "testa o resumo de IA (outra rota da mesma pasta); intocado"
    },
    {
      "teste": "test/whatsapp-resumo-periodo.test.ts",
      "motivo": "cita a pasta do resumo por outro motivo; intocado"
    },
    {
      "teste": "test/resumo-score-fonte-unica.test.ts",
      "motivo": "afirma que a rota do resumo nao le score_saude do espelho; continua verdadeiro (o select saiu por inteiro)"
    },
    {
      "teste": "test/erro-objeto-nao-quebra.test.ts",
      "motivo": "cita lib/data pelo padrao de erro; intocado"
    },
    {
      "teste": "test/resumo-erro-nao-persiste.test.ts",
      "motivo": "cita lib/data por outro motivo; intocado"
    },
    {
      "teste": "test/closer-analysis-sessao.test.ts",
      "motivo": "cita lib/data por outro motivo; intocado"
    },
    {
      "teste": "test/resumo-cliente.test.ts",
      "motivo": "entra na allowlist: mocka o espelho por tabela; recalculado para perfil, catalogo e receita por cliente_id (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: o diagnostico esta na lista de rotas sancionadas para ler clientes_receita; continua SELECT por id (nenhuma escrita C0)"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): data.ts monta com fase/perfil/catálogo e só usa o legado do espelho, pela lib, sem cliente_id; getClientes lança; ficha uuid, resumo, diagnóstico (com meta_campaign_id) e entregáveis leem pela lib; zero leitura direta do espelho; asserções e its mantidos. Ressalva: cast as unknown as ColunaLegada[]."
}
```
