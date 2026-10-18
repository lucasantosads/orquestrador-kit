# Ticket 1053: feedbacks, histórico de situação, PATCH da carteira e nicho derivado param de gravar no espelho

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion", N5 (terceira leva de escrita). Quatro escritores restantes:

- `POST /api/team/feedbacks` gravava `ultimo_feedback` no espelho depois de inserir em `client_feedbacks`: passa a gravar em `ops_cliente_perfil.ultimo_feedback` pela lib do 1052b (best-effort, sinalizado na resposta).
- `POST /api/team/situation-history` fazia `update` em `clientes_notion_mirror.situacao` e dependia de um gatilho do banco para inserir a linha base em `client_situation_history`: passa a gravar `situacao` em `ops_cliente_perfil` e a inserir a linha do histórico ela mesma (situação anterior lida do perfil, origem `gestor_manual`, contexto e gestor da sessão).
- `PATCH /api/dashboard/clientes` (edição inline da carteira) gravava no espelho por `notion_id` e criava linha `local_...` para quem não tinha: passa a resolver `cliente_id` (resolver único; `pending_<entrada_id>` resolve por `clientes_receita.cliente_id`, só leitura) e a gravar fase em `ops_cliente_negocio` e os campos de perfil em `ops_cliente_perfil`; `nicho`, `orcamento` e `pagamento` deixam de ser editáveis por aqui (mensagem humana).
- `recalcNichoPrincipal` (N6) deixa de gravar `nicho` no espelho: só devolve o nome derivado das contas (quem mostra usa `contaDeOrigem`).

Recon de 13/10 (staging-auto):

```
team/feedbacks/route.ts:88-91          .from("clientes_notion_mirror").update({ ultimo_feedback }).eq("notion_id", ...)
team/situation-history/route.ts:47-51  .update({ situacao: situacao_nova }); :54-66 patch da linha mais recente (gatilho insere)
dashboard/clientes/route.ts:170-182    MIRROR_FIELD (status, situacao, resultados, atencao, nicho, analista, orcamento, dia_otimizacao, ultimo_feedback, ultima_otimizacao, pagamento)
dashboard/clientes/route.ts:300-344    PATCH: insert local_<uuid> para pending_ e update por notion_id
nicho-principal.ts:53-61               .update({ nicho: nome }).eq("cliente_id", clienteId)
test/nicho-principal-manual.test.ts:65 expect(banco.updates).toEqual([{ tabela: "clientes_notion_mirror", valores: { nicho: "Bancário" } }])
test/papel-nas-escritas.test.ts:84     PATCH com { notion_id: "n1", field: "status", value: "Ativo" } so para 401/403
migrations/migration-client-situation-history.sql:9-19  colunas: cliente_notion_id, situacao_anterior, situacao_nova, data_mudanca, origem, contexto, gestor_id (+ cliente_id desde 29/09)
```

O 1032 (prioridade 22) também edita `src/app/api/dashboard/clientes/route.ts` e cria `test/carteira-pilares.test.ts` (só sobre o GET); este ticket depende dele para não nascer de base velha e o executor deve rodar esse teste junto com os guardas quando ele existir.

## Campos de máquina

```json
{
  "id": "1053",
  "slug": "negocio-team-e-carteira-param-de-gravar-no-espelho",
  "lane": "dados",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 620 linhas (~20 em src/app/api/team/feedbacks/route.ts, ~45 em src/app/api/team/situation-history/route.ts, ~70 em src/app/api/dashboard/clientes/route.ts, ~12 em src/lib/perf/nicho-principal.ts, ~15 de recalculo em test/nicho-principal-manual.test.ts, ~260 em test/escritas-team-carteira-casa-nova.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion): src/lib/clientes/negocio.ts (1051: gravarNegocio(db, clienteId, { fase }, atualizadoPor)) e src/lib/clientes/perfil-operacional.ts (1052b: lerPerfilOperacional(db, id), gravarPerfilOperacional(db, id, patch)) sao as portas das casas novas; src/lib/clientes/resolver-cliente.ts tem resolverCliente(id) -> { cliente_id, notion_id } e clienteIdParaGravar(id); src/lib/clientes/espelho-legado.ts (1050b) tem pontePorEntrada(db, entradaIds). Depende de 1050b, 1051, 1052b e 1032 (que tambem edita a rota da carteira). PASSO 1: leia as duas libs, src/app/api/team/feedbacks/route.ts linhas 60-95, src/app/api/team/situation-history/route.ts inteiro, src/app/api/dashboard/clientes/route.ts linhas 160-185 e 295-344, src/lib/perf/nicho-principal.ts inteiro, test/nicho-principal-manual.test.ts linhas 1-70 e test/papel-nas-escritas.test.ts linhas 70-100. FAZER: (1) src/app/api/team/feedbacks/route.ts: o bloco das linhas 87-91 (update no espelho) SAI; no lugar: `let perfilAtualizado = false; if (insert.cliente_id) { try { await gravarPerfilOperacional(supabase, insert.cliente_id, { ultimo_feedback: String(body.data_feedback).slice(0, 10) }); perfilAtualizado = true; } catch (e) { console.error('[team/feedbacks] ultimo feedback nao atualizado no perfil', (e as Error).message); } }`; a resposta vira { success: true, feedback: data, perfil_atualizado: perfilAtualizado }. (2) src/app/api/team/situation-history/route.ts, POST: depois da validacao do body, `const par = await resolverCliente(cliente_notion_id)` (erro de leitura -> 500 { error }); sem par.cliente_id -> 409 { error: 'Cliente sem cadastro no OS: situação não registrada' } (acento no codigo); `const atual = await lerPerfilOperacional(supabase, par.cliente_id)` (erro -> 500); `await gravarPerfilOperacional(supabase, par.cliente_id, { situacao: situacao_nova })` (erro -> 500); insert em client_situation_history { cliente_notion_id, cliente_id: par.cliente_id, situacao_anterior: atual?.situacao ?? null, situacao_nova, origem: 'gestor_manual', contexto: contexto || null, gestor_id: session.employeeId || null } (erro -> 500 { error: 'Não foi possível registrar a mudança de situação' }); o bloco 'anexa contexto a row mais recente' (linhas 54-66) SAI; resposta { success: true }. O cabecalho (linhas 1-10) passa a descrever o fluxo novo. Imports: resolverCliente de '@/lib/clientes/resolver-cliente'; lerPerfilOperacional e gravarPerfilOperacional de '@/lib/clientes/perfil-operacional'. GET nao muda. (3) src/app/api/dashboard/clientes/route.ts, so o PATCH e o mapa: MIRROR_FIELD (linhas 170-182) vira `const DESTINO_CAMPO: Record<string, { casa: 'negocio'; coluna: 'fase' } | { casa: 'perfil'; coluna: 'situacao' | 'resultados' | 'atencao' | 'analista' | 'dia_otimizar' | 'ultimo_feedback' | 'data_otimizacao' }>` = { status: negocio/fase, situacao: perfil/situacao, resultados: perfil/resultados, atencao: perfil/atencao, analista: perfil/analista, dia_otimizacao: perfil/dia_otimizar, ultimo_feedback: perfil/ultimo_feedback, ultima_otimizacao: perfil/data_otimizacao }; no PATCH: campo fora do mapa -> 400 { error: 'Este campo não se edita pela carteira' } (nicho, orcamento, pagamento incluidos); cliente_id: se notion_id comeca com 'pending_', `const entradaId = notion_id.slice('pending_'.length)`, select 'cliente_id' em clientes_receita por id (SO LEITURA, C0) e, se vier nulo, a ponte do espelho por entrada (`pontePorEntrada(supabase, [entradaId])` de '@/lib/clientes/espelho-legado', 1050b: primeira linha com cliente_id), senao `(await resolverCliente(notion_id)).cliente_id`; erro de leitura -> 500; sem cliente_id -> 409 { error: 'Cliente sem cadastro no OS: nada foi alterado' }; casa negocio -> gravarNegocio(supabase, clienteId, { fase: value }, g.session.employeeId ?? 'rota:carteira') (exigirPapel devolve { session, papel } quando libera); casa perfil -> gravarPerfilOperacional(supabase, clienteId, { [coluna]: coluna === 'ultimo_feedback' || coluna === 'data_otimizacao' ? String(value).slice(0, 10) : value }); erro de gravacao -> 500 { error: 'Não foi possível salvar a alteração' }; o insert de linha local_<uuid> no espelho e o update por notion_id SAEM; resposta { success: true }. O GET NAO muda neste ticket (leitura e do 1055). O cabecalho (linhas 1-10) passa a dizer onde o PATCH grava. Imports: resolverCliente, gravarNegocio, gravarPerfilOperacional, pontePorEntrada. (4) src/lib/perf/nicho-principal.ts: o bloco das linhas 53-61 (update no espelho) SAI; a funcao devolve `nome` direto; o cabecalho passa a dizer 'deriva o nicho principal das contas ativas; nao persiste (N6, ticket 1053): a casa do nicho e ops_cliente_nichos e a tela usa contaDeOrigem'. (5) test/nicho-principal-manual.test.ts RECALCULADO: a assercao da linha 65 vira `expect(banco.updates).toEqual([]);` com o comentario 'Ticket 1053 (N6): o nicho derivado nao e mais gravado no espelho; a funcao so devolve o nome' na linha acima; NENHUMA outra linha muda. (6) NOVO test/escritas-team-carteira-casa-nova.test.ts (vi.mock de @supabase/supabase-js com from por tabela registrando inserts/upserts; vi.mock de @/lib/session; vi.mock de @/lib/clientes/resolver-cliente com resolverCliente e clienteIdParaGravar configuraveis; vi.mock de @/lib/auth/exigir-papel devolvendo sessao de admin para o PATCH; uuids RFC-4122): feedbacks POST com cliente_id grava client_feedbacks e faz upsert em ops_cliente_perfil com ultimo_feedback 'AAAA-MM-DD' e responde perfil_atualizado true; sem cliente_id responde 200 com perfil_atualizado false e nenhum upsert; situation-history POST sem cliente_id -> 409 sem insert; com cliente_id -> upsert em ops_cliente_perfil com situacao nova, insert em client_situation_history com situacao_anterior lida do perfil, origem gestor_manual, cliente_id e gestor_id da sessao; carteira PATCH status -> upsert em ops_cliente_negocio com fase; situacao -> upsert em ops_cliente_perfil; nicho -> 400; pending_<entrada> resolve por clientes_receita (select, nunca update) ou pela ponte por entrada e grava; sem cliente_id -> 409; em NENHUM caso from('clientes_notion_mirror') recebe insert ou update (its estaticos lendo as 4 fontes: zero '.update(' ou '.insert(' nas 3 linhas depois de from(\"clientes_notion_mirror\") e zero 'local_'). PROIBIDO remover assercao, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: sem .json() novo em src (os req.json() existentes ficam, nenhum novo); mensagens humanas sem nome de tabela ou coluna; sem travessao (U+2014); getSession server-only; nenhuma escrita em zona C0 (clientes_receita so SELECT); falha de leitura vira erro, nunca sucesso; Set e Map so com Array.from. FORA DE ESCOPO: GET da carteira (1055), espelho-status.ts, perf/setup passo e sync-clientes (1053b), telas, test/papel-nas-escritas.test.ts (401/403 continuam antes de qualquer leitura), migration.",
  "cria_novo": [
    "test/escritas-team-carteira-casa-nova.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/team/feedbacks/route.ts",
    "src/app/api/team/situation-history/route.ts",
    "src/app/api/dashboard/clientes/route.ts",
    "src/lib/perf/nicho-principal.ts",
    "test/nicho-principal-manual.test.ts",
    "test/escritas-team-carteira-casa-nova.test.ts"
  ],
  "dependencias": [
    "1051",
    "1052b",
    "1032",
    "1050b",
    "1063"
  ],
  "prioridade": 33,
  "recon_esperado": [
    {
      "descricao": "test/escritas-team-carteira-casa-nova.test.ts ainda nao existe",
      "cmd": "test -e 'test/escritas-team-carteira-casa-nova.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "feedbacks e situation-history ainda fazem update no espelho",
      "cmd": "a=$(grep -A2 'from(\"clientes_notion_mirror\")' src/app/api/team/feedbacks/route.ts | grep -c '\\.update('); b=$(grep -A2 'from(\"clientes_notion_mirror\")' src/app/api/team/situation-history/route.ts | grep -c '\\.update('); [ \"$a\" = 1 ] && [ \"$b\" = 1 ] && echo DOIS_UPDATES || echo ST_${a}_${b}",
      "espera": "DOIS_UPDATES"
    },
    {
      "descricao": "o PATCH da carteira ainda tem MIRROR_FIELD com 11 campos, insere local_ e faz update por notion_id",
      "cmd": "f=src/app/api/dashboard/clientes/route.ts; a=$(sed -n '/^const MIRROR_FIELD/,/^};/p' $f | grep -cE '^  [a-z_]+: \"'); b=$(grep -c 'local_\\${crypto.randomUUID()}' $f); c=$(grep -c 'from(\"clientes_notion_mirror\").update(update).eq(\"notion_id\", notion_id)' $f); [ \"$a\" = 11 ] && [ \"$b\" = 1 ] && [ \"$c\" = 1 ] && echo PATCH_NO_ESPELHO || echo ST_${a}_${b}_${c}",
      "espera": "PATCH_NO_ESPELHO"
    },
    {
      "descricao": "recalcNichoPrincipal ainda grava nicho no espelho e o teste fixa isso",
      "cmd": "a=$(grep -c 'update({ nicho: nome })' src/lib/perf/nicho-principal.ts); b=$(grep -c 'valores: { nicho: \"Bancário\" }' test/nicho-principal-manual.test.ts); [ \"$a\" = 1 ] && [ \"$b\" = 1 ] && echo GRAVA_NICHO || echo ST_${a}_${b}",
      "espera": "GRAVA_NICHO"
    }
  ],
  "colunas_escritas": [
    "ops_cliente_negocio.fase",
    "ops_cliente_negocio.atualizado_em",
    "ops_cliente_negocio.atualizado_por",
    "ops_cliente_perfil.situacao",
    "ops_cliente_perfil.resultados",
    "ops_cliente_perfil.atencao",
    "ops_cliente_perfil.analista",
    "ops_cliente_perfil.dia_otimizar",
    "ops_cliente_perfil.ultimo_feedback",
    "ops_cliente_perfil.data_otimizacao",
    "ops_cliente_perfil.updated_at",
    "client_situation_history.cliente_notion_id",
    "client_situation_history.cliente_id",
    "client_situation_history.situacao_anterior",
    "client_situation_history.situacao_nova",
    "client_situation_history.origem",
    "client_situation_history.contexto",
    "client_situation_history.gestor_id"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/team/feedbacks/route.ts' 'src/app/api/team/situation-history/route.ts' 'src/app/api/dashboard/clientes/route.ts' 'src/lib/perf/nicho-principal.ts' 'test/nicho-principal-manual.test.ts' 'test/escritas-team-carteira-casa-nova.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 620 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 620 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes que leem os 4 arquivos seguem verdes (inclui test/nicho-principal-manual.test.ts recalculado)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/getsession-churn-feedbacks.test.ts test/getsession-legados-onboarding-churn.test.ts test/sai-resolver-chave-api-f.test.ts test/getsession-team-situacao-nps.test.ts test/agregacoes-truncadas-ficha.test.ts test/carteira-edicao.test.ts test/carteira-membro.test.ts test/erro-string-carteira-perfil-disputa.test.ts test/nps-lote-links.test.tsx test/nps-universo-ativo.test.tsx test/papel-nas-escritas.test.ts test/sem-insumo.test.ts test/json-malformado-perf-contas.test.ts test/nicho-principal-manual.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum dos 4 arquivos escreve mais no espelho; feedbacks e situacao gravam no perfil; a carteira grava fase e perfil pelas libs e nao cria mais linha local_",
      "cmd": "f1=src/app/api/team/feedbacks/route.ts; f2=src/app/api/team/situation-history/route.ts; f3=src/app/api/dashboard/clientes/route.ts; f4=src/lib/perf/nicho-principal.ts; a=$(grep -A3 'from(\"clientes_notion_mirror\")' $f1 $f2 $f3 $f4 | grep -cE '\\.(update|insert|upsert)\\('); b=$(grep -c 'gravarPerfilOperacional(' $f1); c=$(grep -c 'gravarPerfilOperacional(' $f2); d=$(grep -cE 'from\\(\"client_situation_history\"\\)\\.insert|\\.insert\\(\\{' $f2); e=$(grep -c 'gravarNegocio(' $f3); g=$(grep -c 'gravarPerfilOperacional(' $f3); h=$(grep -c 'local_' $f3); i=$(grep -c 'DESTINO_CAMPO' $f3); j=$(grep -c 'update({ nicho: nome })' $f4); [ \"$a\" = 0 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$d\" -ge 1 ] && [ \"$e\" -ge 1 ] && [ \"$g\" -ge 1 ] && [ \"$h\" = 0 ] && [ \"$i\" -ge 2 ] && [ \"$j\" = 0 ] && echo CASA_NOVA || echo ST_${a}_${b}_${c}_${d}_${e}_${g}_${h}_${i}_${j}",
      "espera": "CASA_NOVA",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/nicho-principal-manual.test.ts: so a assercao do update mudou para lista vazia com o comentario do 1053; nenhuma linha a menos de expect/it, nenhum skip/only/todo",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/nicho-principal-manual.test.ts; a=$(git show \"$b:$f\" | grep -cF 'expect('); n=$(grep -cF 'expect(' \"$f\"); v=$(grep -c 'expect(banco.updates).toEqual(\\[\\]);' \"$f\"); o=$(grep -c 'valores: { nicho: \"Bancário\" }' \"$f\"); c=$(grep -c 'Ticket 1053 (N6)' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$n\" -ge \"$a\" ] && [ \"$v\" -ge 2 ] && [ \"$o\" = 0 ] && [ \"$c\" -ge 1 ] && [ \"$sk\" = 0 ] && echo RECALCULADO_1053 || echo ST_${a}_${n}_${v}_${o}_${c}_${sk}",
      "espera": "RECALCULADO_1053",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/escritas-team-carteira-casa-nova.test.ts)",
      "cmd": "test -f test/escritas-team-carteira-casa-nova.test.ts && npx vitest run test/escritas-team-carteira-casa-nova.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: feedbacks grava ultimo_feedback no perfil (best-effort sinalizado); situation-history grava a situacao no perfil e insere a linha do historico com situacao_anterior lida do perfil, origem gestor_manual, cliente_id e gestor da sessao, sem depender de gatilho; o PATCH da carteira resolve cliente_id (pending_ por clientes_receita so leitura; senao resolver unico), grava fase via gravarNegocio e perfil via gravarPerfilOperacional, recusa nicho/orcamento/pagamento com mensagem humana e nao cria mais linha no espelho; recalcNichoPrincipal so deriva. REPROVE se: resta insert/update no espelho em qualquer dos 4 arquivos; cliente sem cliente_id grava ou falha em silencio; escrita nova em clientes_receita; historico de situacao sem situacao_anterior; GET da carteira mexido; assercao removida ou afrouxada; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/getsession-churn-feedbacks.test.ts",
      "motivo": "confere 401 sem sessao e que com sessao a rota toca o banco; o POST de feedbacks continua inserindo em client_feedbacks antes de qualquer coisa"
    },
    {
      "teste": "test/getsession-legados-onboarding-churn.test.ts",
      "motivo": "cita team/feedbacks por caminho na lista de rotas com getSession; nada muda"
    },
    {
      "teste": "test/sai-resolver-chave-api-f.test.ts",
      "motivo": "le as fontes de team/feedbacks e team/nps para provar que usam so o resolver unico; o ticket importa resolverCliente/clienteIdParaGravar do mesmo modulo"
    },
    {
      "teste": "test/getsession-team-situacao-nps.test.ts",
      "motivo": "401 sem sessao sem tocar banco, 400 com JSON invalido e com sessao toca o banco: a ordem getSession -> parse -> leituras e mantida"
    },
    {
      "teste": "test/agregacoes-truncadas-ficha.test.ts",
      "motivo": "testa o GET da carteira (leitura completa de reunioes), que nao muda neste ticket"
    },
    {
      "teste": "test/carteira-edicao.test.ts",
      "motivo": "testa mutations.ts (payload do PATCH e podeRegistrarChurn), fora da allowlist; o contrato { notion_id, field, value } continua"
    },
    {
      "teste": "test/carteira-membro.test.ts",
      "motivo": "testa o GET da carteira e kpis/gestores, que nao mudam"
    },
    {
      "teste": "test/erro-string-carteira-perfil-disputa.test.ts",
      "motivo": "confere que erro de leitura do GET vira mensagem; GET intocado"
    },
    {
      "teste": "test/nps-lote-links.test.tsx",
      "motivo": "cita /api/dashboard/clientes como fonte da tela de NPS; GET intocado"
    },
    {
      "teste": "test/nps-universo-ativo.test.tsx",
      "motivo": "idem; GET intocado"
    },
    {
      "teste": "test/papel-nas-escritas.test.ts",
      "motivo": "o PATCH sem sessao responde 401 e sem papel 403 antes de qualquer leitura (exigirPapel continua primeiro); se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sem-insumo.test.ts",
      "motivo": "cita a rota da carteira para o estado sem insumo do GET; GET intocado"
    },
    {
      "teste": "test/json-malformado-perf-contas.test.ts",
      "motivo": "cita nicho-principal por caminho na lista de modulos que leem perf_ad_accounts; a leitura nao muda"
    },
    {
      "teste": "test/nicho-principal-manual.test.ts",
      "motivo": "entra na allowlist: fixa o update no espelho; recalculado para lista vazia (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: a rota da carteira esta na lista de rotas sancionadas para ler valor_mensal; o PATCH so faz SELECT em clientes_receita (cliente_id por id), nunca escrita"
    }
  ],
  "status": "bloqueado",
  "notas_status": "motivo repetido: provável defeito de spec/harness, não do código — criterio[2] mecânico: esperado 'SO_ALLOWLIST', obteve 'FORA_test/papel-nas-escritas.test.ts'"
}
```
