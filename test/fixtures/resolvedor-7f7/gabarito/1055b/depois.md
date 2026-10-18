# Ticket 1055b: leitores da equipe, NPS, portal e ações leem a casa nova (team/nps, meta/overview, fila de NPS, meus clientes, ações recomendadas, relatório admin)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion", leva B (leitores), área carteira / equipe, segunda fatia. Seis leituras restantes dessa área:

```
src/app/api/team/nps/route.ts:73              notion_id, cliente, analista de todo o espelho (nome e gestor do cliente no NPS)
src/app/api/meta/overview/route.ts:109-121    nome do espelho casado por nome com clientes (ilike) para achar o notion_id
src/app/dashboard/clientes/nps/layout.tsx:51-56  nome por notion_id para a fila pendente
src/app/api/portal/meus-clientes/route.ts:27-69  universo = espelho com cliente_id; status/situacao/resultados/atencao/ultimo_feedback do espelho; receita por entrada_id
src/lib/acoes/motor.ts:64-77                   notion_id por cliente_id (ponte das acoes)
src/app/api/admin/clientes-sem-cliente-id/route.ts:32-33  relatorio das linhas do espelho sem cliente_id (paginado)
```

O portal muda de universo: `clientes` + quem-cuida + perfil + fase, receita por `cliente_id`. O relatório admin continua sendo sobre o espelho (é o relatório de quem ainda não tem vínculo) e lê pela lib. `test/quem-cuida.test.ts` semeia o espelho para o portal e é recalculado (semeia `clientes` e a receita com `cliente_id`).

## Campos de máquina

```json
{
  "id": "1055b",
  "slug": "negocio-leitores-equipe-nps-portal",
  "lane": "dados",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 700 linhas (~25 em src/app/api/team/nps/route.ts, ~20 em src/app/api/meta/overview/route.ts, ~12 em src/app/dashboard/clientes/nps/layout.tsx, ~70 em src/app/api/portal/meus-clientes/route.ts, ~15 em src/lib/acoes/motor.ts, ~15 em src/app/api/admin/clientes-sem-cliente-id/route.ts, ~40 de recalculo em test/quem-cuida.test.ts, ~230 em test/leitores-equipe-nps-portal-casa-nova.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion, leva B): libs prontas: src/lib/clientes/negocio.ts (lerNegocios -> fase), src/lib/clientes/perfil-operacional.ts (lerPerfisOperacionais -> analista, situacao, resultados, atencao, ultimo_feedback), src/lib/clientes/espelho-legado.ts (1050b: lerEspelhoTodo(db, colunas, { soComCliente }), lerEspelhoPorNotion, pontePorCliente; erro lanca). REGRA DE LEITURA: casa nova para quem tem cliente_id; legado do espelho so sem vinculo; coluna sem casa pela lib. Depende de 1050b, 1051, 1052b, 1053 e 1055. PASSO 1: leia as 3 libs, src/app/api/team/nps/route.ts linhas 60-130, src/app/api/meta/overview/route.ts linhas 95-130, src/app/dashboard/clientes/nps/layout.tsx linhas 35-65, src/app/api/portal/meus-clientes/route.ts inteiro, src/lib/acoes/motor.ts linhas 40-90, src/app/api/admin/clientes-sem-cliente-id/route.ts inteiro e src/lib/clientes/sem-cliente-id.ts (classificarSemClienteId, fora da allowlist), test/quem-cuida.test.ts linhas 40-125 e test/acoes-recomendadas-chave.test.ts linhas 60-110. FAZER: (1) src/app/api/team/nps/route.ts: `supabase.from('clientes_notion_mirror').select('notion_id, cliente, analista')` vira `lerEspelhoTodo(supabase, ['cliente', 'analista'])` dentro do mesmo Promise.all (erro -> 500 como e2 hoje); para as linhas com cliente_id, `lerPerfisOperacionais` e clientesMap.gestor = perfil?.analista ?? null (legado so sem vinculo); clientesMap.nome continua o nome do espelho (coluna legada pela lib). (2) src/app/api/meta/overview/route.ts: o casamento por nome (linhas 109-121) SAI; `clientUuidToNotionId` passa a vir de `pontePorCliente(supabase, ids de clientesAll)` (primeira linha por cliente); a leitura de `clientes` (id, nome) continua; erro da ponte -> 500 pelo catch existente. (3) src/app/dashboard/clientes/nps/layout.tsx: o select por notion_id vira `lerEspelhoPorNotion(supabase, notionIds, ['cliente'])` dentro de try (erro -> nomePorNotion vazio e a tela mostra 'sem base', como o comentario das linhas 44-46 manda; nunca quebra a pagina). (4) src/app/api/portal/meus-clientes/route.ts: o universo deixa de ser o espelho: le `clientes` (select 'id, nome'; erro -> 500), filtra por cuidaDoCliente(q, session.employeeId, c.id); vazio -> []; para os ids: lerNegocios (status = fase), lerPerfisOperacionais (situacao, resultados, atencao, ultimo_feedback), pontePorCliente (notion_id da primeira linha ou null) e clientes_receita select 'cliente_id, valor_mensal, status_financeiro, risco_churn' .in('cliente_id', ids) (SO LEITURA; erro -> 500); o filtro de status financeiro (ativo, pausado, pagou_integral, parceria) e os campos da resposta (notion_id, cliente_id, nome, situacao, resultados, atencao, ultimo_feedback, status, entrada_valor_mensal, risco_churn) ficam iguais, nome de clientes.nome, ordenado por nome. (5) src/lib/acoes/motor.ts: `supabaseAdmin.from('clientes_notion_mirror').select('cliente_id, notion_id').in('cliente_id', ids)` vira `pontePorCliente(supabaseAdmin, ids)` (erro lanca pela lib; a mensagem 'clientes_notion_mirror: ...' da linha 69 SAI); notionIdPorId = primeira linha por cliente; sem_cadastro_os continua contando quem nao tem ponte; os comentarios das linhas 44 e 214 passam a dizer 'ponte do espelho (lib espelho-legado)'. (6) src/app/api/admin/clientes-sem-cliente-id/route.ts: a leitura paginada do espelho vira `lerEspelhoTodo(sb, ['cliente'])` (o relatorio e sobre o espelho e continua sendo; truncated passa a considerar so receitas e clientes); classificarSemClienteId e sua assinatura nao mudam. (7) test/quem-cuida.test.ts RECALCULADO (comentario 'Ticket 1055b: ...' acima de cada mudanca): semear() ganha db.clientes = [{ id: CLI_COM, nome: 'Com Gestor', status: 'ativo' }, { id: CLI_SEM, nome: 'Sem Gestor', status: 'ativo' }, { id: CLI_EX, nome: 'Gestor Saiu', status: 'ativo' }] e as linhas de clientes_receita ganham cliente_id (r1 -> CLI_COM, r2 -> CLI_SEM, r3 -> CLI_EX); os its 'vem do gestor principal' e 'head ve os clientes sem gestor' mantem as mesmas listas de nomes; o it 'falha de leitura e 500' passa a falhar a leitura de 'clientes' (mem.falharSelect.add('clientes')); as linhas do espelho continuam semeadas (o passo 1 do setup e outros its as usam); NENHUM it removido. (8) NOVO test/leitores-equipe-nps-portal-casa-nova.test.ts (vi.mock de @supabase/supabase-js por tabela ou banco em memoria do helper; vi.mock de @/lib/session; uuids RFC-4122): team/nps GET global devolve gestor do perfil para cliente vinculado; meta/overview monta clientUuidToNotionId pela ponte sem casar por nome (fonte sem 'toLowerCase()' no trecho e com 'pontePorCliente('); meus-clientes devolve status da fase e situacao do perfil e 500 quando clientes falha; motor conta sem_cadastro_os pela ponte da lib; admin relatorio le pela lib; its estaticos: zero 'clientes_notion_mirror' nos 6 arquivos de src. PROIBIDO remover assercao, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: sem .json() novo em src; mensagens humanas sem nome de tabela; sem travessao (U+2014) em string nova; getSession server-only; nenhuma escrita em banco; clientes_receita so SELECT; falha de leitura vira erro (500 ou lanca), nunca lista vazia, exceto o layout da fila de NPS que por desenho cai em 'sem base' (comentario existente); Set e Map so com Array.from.  (9) Dois testes antigos caem com a lib e entram na allowlist (13/10, tentativas 1 e 3): test/acoes-recomendadas-chave.test.ts: a lib so aceita uuid (uuidsUnicos filtra) e as fixtures usam ids 'A', 'B', 'C'; declare `const A = \"a0000000-0000-4000-8000-000000000001\"`, B (...0002) e C (...0003) e troque TODAS as ocorrencias dos ids literais ('A', 'B', 'C') nas fixtures (perf_ad_accounts, clientes, clientes_notion_mirror) e nas assercoes (`a.cliente_id !== B`, `=== A`) pelas constantes; o Proxy do chain nao muda; os 5 its e os valores esperados (sem_cadastro_os 2) ficam. test/relatorio-sem-cliente-id.test.ts: o fake de @supabase/supabase-js ganha o metodo 'in' na lista (registrando em metodosChamados como os outros) e um `q.then = (ok, ko) => Promise.resolve({ data: dados[tabela] ?? [], error: null }).then(ok, ko)` (a lib le por select().in() e aguarda o chain; range continua para as leituras paginadas); no it 'superadmin recebe o relatorio e so ha select', a lista permitida vira ['select', 'order', 'range', 'in']; os 7 its e os numeros esperados (total_ativos 4, sem_cliente_id 2) ficam. CORRECOES EXIGIDAS PELO AVALIADOR (tentativa 2): (a) nps/layout.tsx: a fila de NPS continua VISIVEL quando a lib falha; so o nome do cliente cai para 'sem base'; nunca esconder itens nem mostrar 'aguardando migracao'; com a lib ok, nomePorNotion vem preenchido com a coluna cliente de cada notion_id visivel. (b) acoes/motor.ts: SO pontePorCliente(supabaseAdmin, ids); nunca lerEspelhoTodo nem leitura do espelho inteiro. (c) admin/clientes-sem-cliente-id: passa o proprio client `sb` para lerEspelhoTodo (o tipo DbEspelho e { from }); nenhum adaptador, nenhum cast `as`. FORA DE ESCOPO: team/feedbacks e situation-history (1053), nps/public e nps/registrar (1056), telas, migration.",
  "cria_novo": [
    "test/leitores-equipe-nps-portal-casa-nova.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/team/nps/route.ts",
    "src/app/api/meta/overview/route.ts",
    "src/app/dashboard/clientes/nps/layout.tsx",
    "src/app/api/portal/meus-clientes/route.ts",
    "src/lib/acoes/motor.ts",
    "src/app/api/admin/clientes-sem-cliente-id/route.ts",
    "test/quem-cuida.test.ts",
    "test/leitores-equipe-nps-portal-casa-nova.test.ts",
    "test/acoes-recomendadas-chave.test.ts",
    "test/relatorio-sem-cliente-id.test.ts"
  ],
  "dependencias": [
    "1050b",
    "1051",
    "1052b",
    "1053",
    "1055"
  ],
  "prioridade": 36,
  "excecao_tamanho": {
    "motivo": "6 leituras de ponte da mesma area (4 rotas, 1 layout de tela, 1 lib) com a mesma troca mecanica pela lib espelho-legado; o layout e a lib tem 1 consulta cada; separar por camada nao reduz risco"
  },
  "recon_esperado": [
    {
      "descricao": "test/leitores-equipe-nps-portal-casa-nova.test.ts ainda nao existe",
      "cmd": "test -e 'test/leitores-equipe-nps-portal-casa-nova.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "os 6 arquivos ainda leem o espelho direto (6 selects)",
      "cmd": "n=$(grep -c 'from(\"clientes_notion_mirror\")' src/app/api/team/nps/route.ts src/app/api/meta/overview/route.ts src/app/dashboard/clientes/nps/layout.tsx src/app/api/portal/meus-clientes/route.ts src/lib/acoes/motor.ts src/app/api/admin/clientes-sem-cliente-id/route.ts | awk -F: '{s+=$NF} END {print s+0}'); [ \"$n\" = 6 ] && echo SEIS_DIRETAS || echo ST_$n",
      "espera": "SEIS_DIRETAS"
    },
    {
      "descricao": "meta/overview ainda casa por nome e o portal ainda parte do espelho",
      "cmd": "a=$(grep -c 'nomeToNotionId' src/app/api/meta/overview/route.ts); b=$(grep -c 'mirrorTodos' src/app/api/portal/meus-clientes/route.ts); [ \"$a\" -ge 2 ] && [ \"$b\" -ge 1 ] && echo LEGADO || echo ST_${a}_${b}",
      "espera": "LEGADO"
    },
    {
      "descricao": "test/quem-cuida.test.ts ainda falha a leitura do espelho no it do portal e nao semeia clientes",
      "cmd": "a=$(grep -c 'mem.falharSelect.add(\"clientes_notion_mirror\")' test/quem-cuida.test.ts); b=$(grep -c 'db.clientes = \\[' test/quem-cuida.test.ts); [ \"$a\" = 1 ] && [ \"$b\" = 0 ] && echo SEMEIA_ESPELHO || echo ST_${a}_${b}",
      "espera": "SEMEIA_ESPELHO"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/team/nps/route.ts' 'src/app/api/meta/overview/route.ts' 'src/app/dashboard/clientes/nps/layout.tsx' 'src/app/api/portal/meus-clientes/route.ts' 'src/lib/acoes/motor.ts' 'src/app/api/admin/clientes-sem-cliente-id/route.ts' 'test/quem-cuida.test.ts' 'test/leitores-equipe-nps-portal-casa-nova.test.ts' 'test/acoes-recomendadas-chave.test.ts' 'test/relatorio-sem-cliente-id.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 700 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 700 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes diretos dos 6 arquivos seguem verdes (inclui test/quem-cuida.test.ts recalculado)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ui-guard.test.ts test/ficha-nps-do-mes.test.ts test/ficha-sem-reescrita-notion.test.ts test/getsession-team-situacao-nps.test.ts test/sai-resolver-chave-api-f.test.ts test/sem-insumo.test.ts test/erro-string-tempo-reunioes.test.ts test/rotas-get-sem-cache.test.ts test/nps-lote-links.test.tsx test/nps-taxa-variacao.test.tsx test/nps-universo-ativo.test.tsx test/fila-item-abre.test.tsx test/dividas-avaliador-314.test.ts test/estados-portal.test.ts test/funcao-escondida-sem-papel.test.tsx test/acoes-recomendadas-chave.test.ts test/onboarding-sla-prazo-card.test.ts test/relatorio-sem-cliente-id.test.ts test/quem-cuida.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "os 6 arquivos nao citam mais o espelho; overview faz a ponte pela lib sem casar por nome; portal parte de clientes com fase e perfil",
      "cmd": "a=$(grep -c 'clientes_notion_mirror' src/app/api/team/nps/route.ts src/app/api/meta/overview/route.ts src/app/dashboard/clientes/nps/layout.tsx src/app/api/portal/meus-clientes/route.ts src/lib/acoes/motor.ts src/app/api/admin/clientes-sem-cliente-id/route.ts | awk -F: '{s+=$NF} END {print s+0}'); b=$(grep -c 'lerEspelhoTodo(' src/app/api/team/nps/route.ts); c=$(grep -c 'pontePorCliente(' src/app/api/meta/overview/route.ts); d=$(grep -c 'nomeToNotionId' src/app/api/meta/overview/route.ts); e=$(grep -c 'lerEspelhoPorNotion(' src/app/dashboard/clientes/nps/layout.tsx); f=$(grep -c 'lerNegocios(' src/app/api/portal/meus-clientes/route.ts); g=$(grep -c 'lerPerfisOperacionais(' src/app/api/portal/meus-clientes/route.ts); h=$(grep -c 'from(\"clientes\")' src/app/api/portal/meus-clientes/route.ts); i=$(grep -c 'pontePorCliente(' src/lib/acoes/motor.ts); j=$(grep -c 'lerEspelhoTodo(' src/app/api/admin/clientes-sem-cliente-id/route.ts); [ \"$a\" = 0 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$d\" = 0 ] && [ \"$e\" -ge 1 ] && [ \"$f\" -ge 1 ] && [ \"$g\" -ge 1 ] && [ \"$h\" -ge 1 ] && [ \"$i\" -ge 1 ] && [ \"$j\" -ge 1 ] && echo EQUIPE_NA_CASA_NOVA || echo ST_${a}_${b}_${c}_${d}_${e}_${f}_${g}_${h}_${i}_${j}",
      "espera": "EQUIPE_NA_CASA_NOVA",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/quem-cuida.test.ts: nenhum expect(/it( a menos, semeia clientes e falha a leitura de clientes no it do portal, nenhum skip/only/todo",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/quem-cuida.test.ts; a=$(git show \"$b:$f\" | grep -cF 'expect('); n=$(grep -cF 'expect(' \"$f\"); ia=$(git show \"$b:$f\" | grep -cF 'it('); ni=$(grep -cF 'it(' \"$f\"); o=$(grep -c 'db.clientes = \\[' \"$f\"); v=$(grep -c 'mem.falharSelect.add(\"clientes\")' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$n\" -ge \"$a\" ] && [ \"$ni\" -ge \"$ia\" ] && [ \"$o\" -ge 1 ] && [ \"$v\" -ge 1 ] && [ \"$sk\" = 0 ] && echo RECALCULADO_1055B || echo ST_${a}_${n}_${ia}_${ni}_${o}_${v}_${sk}",
      "espera": "RECALCULADO_1055B",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento nos 2 testes antigos (5 e 7 its, uuids no motor, 'in' no fake do relatorio) e correcoes do avaliador (motor sem lerEspelhoTodo, admin sem cast)",
      "cmd": "a='test/acoes-recomendadas-chave.test.ts'; r='test/relatorio-sem-cliente-id.test.ts'; m='src/lib/acoes/motor.ts'; d='src/app/api/admin/clientes-sem-cliente-id/route.ts'; p=$(grep -c '^ *it(' \"$a\" || true); q=$(grep -c '4000-8000-' \"$a\" || true); s=$(grep -c 'sem_cadastro_os).toBe(2)' \"$a\" || true); u=$(grep -c '^ *it(' \"$r\" || true); v=$(grep -c '\"in\"' \"$r\" || true); w=$(grep -c 'not.toContain(proibido)' \"$r\" || true); x=$(grep -c 'lerEspelhoTodo' \"$m\" || true); y=$(grep -c 'pontePorCliente(' \"$m\" || true); z=$(grep -c ' as DbEspelho\\| as unknown as' \"$d\" || true); [ \"$p\" = 5 ] && [ \"$q\" -ge 3 ] && [ \"$s\" = 2 ] && [ \"$u\" = 7 ] && [ \"$v\" -ge 2 ] && [ \"$w\" = 1 ] && [ \"$x\" = 0 ] && [ \"$y\" -ge 1 ] && [ \"$z\" = 0 ] && echo RECALCULADO_1055B_ANTIGOS || echo ST_${p}_${q}_${s}_${u}_${v}_${w}_${x}_${y}_${z}",
      "espera": "RECALCULADO_1055B_ANTIGOS"
    },
    {
      "descricao": "testes verdes (test/leitores-equipe-nps-portal-casa-nova.test.ts)",
      "cmd": "test -f test/leitores-equipe-nps-portal-casa-nova.test.ts && npx vitest run test/leitores-equipe-nps-portal-casa-nova.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: team/nps, nps/layout, acoes/motor e o relatorio admin leem o espelho so pela lib; meta/overview faz a ponte por cliente_id (nunca mais por nome); o portal parte de clientes + quem-cuida com fase, perfil, ponte e receita por cliente_id, mantendo os campos da resposta; contratos preservados. REPROVE se: resta .from('clientes_notion_mirror') em arquivo da allowlist; casamento por nome sobrevive no overview; erro de leitura vira lista vazia fora do layout da fila (desenho existente); campo de resposta removido ou renomeado; escrita em banco; assercao removida ou afrouxada; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "entra na allowlist: semeia o espelho como universo do portal; recalculado para semear clientes e a receita por cliente_id (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: o portal continua so SELECT em clientes_receita; nenhuma escrita C0"
    },
    {
      "teste": "test/getsession-team-situacao-nps.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sai-resolver-chave-api-f.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/adocao-predicado.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-string-tempo-reunioes.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/rotas-get-sem-cache.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/funcao-escondida-sem-papel.test.tsx",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/onboarding-sla-prazo-card.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 6 arquivos; o ticket troca a leitura do espelho pela lib espelho-legado (mesma tabela, mesmo client) e, no portal e no NPS, sobrepoe perfil/fase da casa nova; contratos de resposta preservados; se quebrar, PARE e descreva"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Os 6 arquivos leem o espelho só pela lib. O overview monta a ponte por cliente_id e não casa mais por nome. O portal parte de clientes + quem-cuida, com fase, perfil, ponte e receita por cliente_id, e mantém os campos. Erro vira 500, exceto no layout da fila de NPS. Sem escrita, cast ou asserção afrouxada; testes recalculados conforme o ticket."
}
```
