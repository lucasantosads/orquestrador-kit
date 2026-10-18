# Ticket 1053b: fase operacional do churn e passo do Setup param de gravar no espelho

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion", N5 (quarta leva de escrita). Dois escritores restantes do lado operacional:

- `src/lib/clientes/espelho-status.ts`: as 4 rotas de churn (`churn-log`, `churnar-cliente`, `churn/remover`, `churn-aprovacoes`) usam `gravarFaseNoEspelho` para deixar a fase em "Finalizado"/"Ativo" e `receitaIdPelaChave`/`clienteIdDaReceita` para achar o cliente. A fase passa a ser gravada em `ops_cliente_negocio.fase` (lib do 1051) com auditoria, e as chaves passam a ser resolvidas pelo resolver único em vez de ler o espelho direto. A assinatura e o formato de retorno (`ResultadoEspelho` com `notionIds`) ficam iguais, porque `churnar-cliente/route.ts:118` usa `espelho.notionIds[0]` para o `churn_log`.
- `POST /api/perf/setup/[clienteId]/passo`: o passo `basico` gravava nicho, analista e o vínculo `cliente_id` no espelho; a transição final gravava `status = "Ativo"`. Passam a: analista em `ops_cliente_perfil`, nicho no catálogo (`vincularNichoPeloNome` do 1052b), fase em `ops_cliente_negocio`. O vínculo `cliente_id` por aqui deixa de existir (cliente sem cadastro no OS recebe 409; o cadastro nasce pelo job `sync-clientes`).

Recon de 13/10 (staging-auto):

```
espelho-status.ts:35-47   linhasDoEspelho le o espelho por entrada_id/notion_id
espelho-status.ts:69-73   .update({ status, editado_em }).eq("notion_id", ...); :80-87 logAudit entidade clientes_notion_mirror
espelho-status.ts:109,142,147  receitaIdPelaChave e clienteIdDaReceita leem o espelho (entrada_id, cliente_id)
passo/route.ts:56-73      getMirror / getMirrorByClienteId; :138-162 basico grava nicho/analista/cliente_id no espelho; :345-350 status Ativo
test/espelho-fase-churn.test.ts:63-76  semear(): espelho em memoria; :85-110 expectativas sobre espelho("n-acme").status e auditoria entidade clientes_notion_mirror
test/churn-log-auth.test.ts:27 e test/churn-reativar-rota.test.ts:42  mockam gravarFaseNoEspelho devolvendo { ok, notionIds, alterados, erro }
```

## Campos de máquina

```json
{
  "id": "1053b",
  "slug": "fase-churn-e-setup-param-de-gravar-no-espelho",
  "lane": "dados",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 690 linhas (~110 em src/lib/clientes/espelho-status.ts, ~80 em src/app/api/perf/setup/[clienteId]/passo/route.ts, ~90 de recalculo em test/espelho-fase-churn.test.ts, ~220 em test/fase-e-setup-casa-nova.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion): src/lib/clientes/negocio.ts (1051: lerNegocio(db, id), gravarNegocio(db, id, { fase }, atualizadoPor), FASES_OPERACIONAIS), src/lib/clientes/perfil-operacional.ts (1052b: gravarPerfilOperacional, vincularNichoPeloNome), src/lib/clientes/resolver-cliente.ts (resolverCliente(id) -> { cliente_id, notion_id }; erro lanca); src/lib/clientes/espelho-legado.ts (1050b: pontePorEntrada, pontePorNotion; a unica porta de leitura do espelho). Depende de 1050b, 1051 e 1052b. PASSO 1: leia src/lib/clientes/espelho-status.ts inteiro, as 4 rotas que o importam (src/app/api/churn-log/route.ts linhas 55-110 e 190-210, src/app/api/financeiro/churnar-cliente/route.ts linhas 85-125, src/app/api/churn/remover/route.ts linhas 60-75, src/app/api/financeiro/churn-aprovacoes/route.ts linhas 105-125), src/app/api/perf/setup/[clienteId]/passo/route.ts inteiro, test/espelho-fase-churn.test.ts inteiro e test/helpers/supabase-memoria.ts (suporta upsert com onConflict). FAZER: (0) src/lib/clientes/espelho-legado.ts (entra na allowlist; 13/10, as 2 tentativas cairam aqui): a linha `import \"server-only\";` vira o comentario `// Server-only por convencao, nao pelo pacote: 'server-only' nao esta no package.json e quebra os testes que importam rotas (1053b).` NADA mais muda nesse arquivo (nenhuma funcao, nenhuma assinatura). Motivo: o pacote nao esta instalado; qualquer rota que importe a lib (direta ou via espelho-status.ts) derruba os testes que importam a rota com 'Cannot find package server-only' (foi o que quebrou test/churn-pipeline-por-id.test.ts, churn-gate-admin e churn-motivo-obrigatorio). Em espelho-status.ts importe espelho-legado ESTATICAMENTE no topo (nunca import() dinamico dentro de try: o erro viraria aviso e esconderia falha de leitura).  (1) src/lib/clientes/espelho-status.ts (o nome do arquivo e das funcoes exportadas NAO muda, para nao tocar as 4 rotas nem os mocks por nome): o cabecalho passa a dizer 'fase operacional em ops_cliente_negocio.fase (frente saida do Notion, 1053b); o nome do modulo e historico'. ChaveEspelho e ResultadoEspelho ficam iguais. Nova funcao interna `async function clienteDaChave(db, chave): Promise<{ cliente_id: string | null; notion_id: string | null }>`: com chave.entradaId le clientes_receita (select 'cliente_id, notion_id' por id; SO LEITURA; erro lanca) e usa cliente_id de la; se nulo, a ponte por entrada `pontePorEntrada(db, [chave.entradaId])` ('@/lib/clientes/espelho-legado', 1050b: primeira linha com cliente_id, e seu notion_id); se ainda nulo, resolverCliente(notion_id da receita ou chave.notionId); com so chave.notionId usa resolverCliente(chave.notionId). gravarFaseNoEspelho(db, chave, status, autor): resolve pelo clienteDaChave (erro -> { ok: false, notionIds: [], alterados: 0, erro }); sem cliente_id -> { ok: false, notionIds: [], alterados: 0, erro: 'cliente sem cadastro no OS: fase operacional não atualizada' } (acento no codigo); `const atual = await lerNegocio(db, cliente_id)` (erro -> ok false); se atual?.fase === status devolve { ok: true, notionIds: [notion_id ?? ...vazio], alterados: 0, erro: null } sem gravar nem auditar; senao gravarNegocio(db, cliente_id, { fase: status }, autor.nome ?? autor.id ?? 'churn') (erro -> ok false), alterados 1, logAudit({ quem: autor.id, quemNome: autor.nome, entidade: 'ops_cliente_negocio', entidadeId: cliente_id, campo: 'fase', de: atual?.fase ?? null, para: status }) (auditoria que falha vira erro 'fase gravada, auditoria não registrada' com ok false, como hoje); notionIds = [par.notion_id] quando houver, senao []. linhasDoEspelho SAI (era so para o update). receitaIdPelaChave: o passo (1) que lia o espelho por notion_id (entrada_id) vira: `pontePorNotion(db, [chave.notionId])` e, se a linha tiver entrada_id, devolve-o; senao resolverCliente(chave.notionId) e, com cliente_id, select id em clientes_receita por cliente_id (limit 2, unico); os passos 2 (receita por notion_id), 3 (id direto) e 4 (clienteId) ficam iguais. clienteIdDaReceita: a receita (cliente_id, notion_id) continua primeiro; o lookup por entrada vira `pontePorEntrada(db, [receitaId])` (primeira linha com cliente_id) e o lookup por notion_id vira `rec?.notion_id ? (await resolverCliente(rec.notion_id)).cliente_id : null`. Zero ocorrencias de clientes_notion_mirror no arquivo ao final. Imports: lerNegocio e gravarNegocio de '@/lib/clientes/negocio'; resolverCliente de '@/lib/clientes/resolver-cliente'; pontePorEntrada e pontePorNotion de '@/lib/clientes/espelho-legado'. (2) src/app/api/perf/setup/[clienteId]/passo/route.ts: getMirror e getMirrorByClienteId SAEM; depois do resolverCliente, sem par.cliente_id -> 409 { error: 'Cliente sem cadastro no OS: o cadastro nasce pela sincronização diária; depois volte ao setup' } (acento no codigo) (o 404 sem cliente_id e sem notion_id continua antes; o alias 308 continua); `const clienteId = par.cliente_id; const notionId = par.notion_id ?? clienteId;` (o notionId segue sendo a chave dos writes legados por notion_id: clientes_extra etc., como hoje); le `clientes` (select 'id, nome' por id; erro -> 500; sem linha -> 404) para o nome; case 'basico': dados.analista -> gravarPerfilOperacional(supabase, clienteId, { analista }); dados.nicho -> vincularNichoPeloNome(supabase, clienteId, dados.nicho) e { ok: false, motivo } vira 400 { error: motivo }; dados.criar_cliente e dados.cliente_id deixam de existir (ensureClienteId e seu import SAEM se nao houver outro uso; body com so esses campos -> 400 'Nada para gravar no passo basico'); nada de update no espelho; os outros cases ficam iguais (trocando mirror.cliente_id por clienteId e mirror.cliente por nome do cadastro onde aparecerem); a transicao final: `const negocio = await lerNegocio(supabase, clienteId)` (erro -> 500) e `if (setup && obrigatoriosOk && (negocio?.fase ?? 'Não iniciado') === 'Não iniciado') { await gravarNegocio(supabase, clienteId, { fase: 'Ativo' }, session.employeeId ?? 'setup'); transicao = true; }` (erro -> transicao false com console.error). O cabecalho (linhas 1-30) passa a descrever as casas novas; 'calcularP3Contas(supabase' e 'aplicarP3(' continuam antes de 'const obrigatoriosOk' e a expressao 'setup.p1_basico && setup.p3_meta && setup.p5_crm && setup.p6_whatsapp && setup.p7_metas' fica identica (test/setup-cinco-passos.test.ts le a fonte). Zero ocorrencias de clientes_notion_mirror no arquivo ao final. (3) test/espelho-fase-churn.test.ts RECALCULADO (comentario 'Ticket 1053b: ...' acima de cada mudanca): semear() ganha db.clientes = [{ id: CLI_ACME, nome: 'Acme', status: 'ativo' }] com CLI_ACME uuid valido, clientes_receita[0].cliente_id = CLI_ACME, as linhas do espelho ganham cliente_id (n-acme -> CLI_ACME; n-outro -> null) e db.ops_cliente_negocio = []; `espelho(id)` vira `negocio(cid)` lendo db.ops_cliente_negocio por cliente_id; `auditoria()` filtra entidade 'ops_cliente_negocio'; as expectativas: 'acha pela entrada' -> negocio(CLI_ACME)?.fase === 'Finalizado', n-outro intocado (sem linha de negocio), auditoria com entidade_id CLI_ACME, campo 'fase', valor_anterior null (sem linha antes) e valor_novo 'Finalizado'; 'ja no status pedido' -> segunda chamada alterados 0 e auditoria com 1; 'sem linha no espelho' vira 'sem cadastro no OS' (notionId 'nao-existe' -> ok false, erro contendo 'sem cadastro', auditoria vazia); 'leitura que falha' usa mem.falharSelect em 'ops_cliente_negocio' ou 'clientes_receita'; os its das rotas (churnar-cliente, churn-log, remover, aprovacoes) trocam espelho('n-acme')?.status por negocio(CLI_ACME)?.fase e a regex /Espelho/ por /fase/ onde a rota passou a dizer fase (se a copy da rota nao mudar, a regex nao muda); NENHUM it removido. (4) NOVO test/fase-e-setup-casa-nova.test.ts (vi.mock de @supabase/supabase-js com from por tabela; vi.mock de @/lib/session; vi.mock de @/lib/clientes/resolver-cliente configuravel; uuids RFC-4122): passo basico com analista grava ops_cliente_perfil; com nicho do catalogo vincula em ops_cliente_nichos; sem cliente_id -> 409 e nenhuma gravacao; transicao: obrigatorios ok com negocio sem linha grava fase 'Ativo' em ops_cliente_negocio; com fase 'Ativo' ja gravada nao grava de novo; its estaticos lendo as duas fontes: zero ocorrencias de 'clientes_notion_mirror' em src/lib/clientes/espelho-status.ts e em src/app/api/perf/setup/[clienteId]/passo/route.ts, e 'ensureClienteId' ausente da rota. PROIBIDO remover assercao, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: sem .json() novo em src (o req.json() existente da rota fica); mensagens humanas sem nome de tabela ou coluna; sem travessao (U+2014); getSession server-only; nenhuma escrita em zona C0 (clientes_receita so SELECT; a excecao C0 das rotas de churn fica como esta, fora da allowlist); falha de leitura vira erro, nunca sucesso; Set e Map so com Array.from. FORA DE ESCOPO: as 4 rotas de churn (contrato de gravarFaseNoEspelho preservado), test/churn-log-auth.test.ts e test/churn-reativar-rota.test.ts (mockam por nome), src/lib/setup/p1-basico.ts e o GET do setup (leitores, 1058), sync-clientes (1053c), migration.",
  "cria_novo": [
    "test/fase-e-setup-casa-nova.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/clientes/espelho-status.ts",
    "src/app/api/perf/setup/[clienteId]/passo/route.ts",
    "test/espelho-fase-churn.test.ts",
    "test/fase-e-setup-casa-nova.test.ts",
    "src/lib/clientes/espelho-legado.ts"
  ],
  "dependencias": [
    "1051",
    "1052b",
    "1050b"
  ],
  "prioridade": 33,
  "recon_esperado": [
    {
      "descricao": "test/fase-e-setup-casa-nova.test.ts ainda nao existe",
      "cmd": "test -e 'test/fase-e-setup-casa-nova.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "espelho-status.ts ainda grava status no espelho e audita a entidade clientes_notion_mirror",
      "cmd": "f=src/lib/clientes/espelho-status.ts; a=$(grep -c 'update({ status, editado_em' $f); b=$(grep -c 'entidade: \"clientes_notion_mirror\"' $f); c=$(grep -c 'clientes_notion_mirror' $f); d=$(grep -c 'export async function gravarFaseNoEspelho' $f); [ \"$a\" = 1 ] && [ \"$b\" = 1 ] && [ \"$c\" -ge 6 ] && [ \"$d\" = 1 ] && echo GRAVA_NO_ESPELHO || echo ST_${a}_${b}_${c}_${d}",
      "espera": "GRAVA_NO_ESPELHO"
    },
    {
      "descricao": "o passo do setup ainda le e grava o espelho (basico e transicao) e usa ensureClienteId",
      "cmd": "f='src/app/api/perf/setup/[clienteId]/passo/route.ts'; a=$(grep -c 'clientes_notion_mirror' \"$f\"); b=$(grep -c 'update({ status: \"Ativo\" })' \"$f\"); c=$(grep -c 'ensureClienteId' \"$f\"); [ \"$a\" -ge 4 ] && [ \"$b\" = 1 ] && [ \"$c\" -ge 2 ] && echo SETUP_NO_ESPELHO || echo ST_${a}_${b}_${c}",
      "espera": "SETUP_NO_ESPELHO"
    },
    {
      "descricao": "as 4 rotas de churn importam gravarFaseNoEspelho/receitaIdPelaChave/clienteIdDaReceita por esses nomes",
      "cmd": "n=$(grep -l 'from \"@/lib/clientes/espelho-status\"' src/app/api/churn-log/route.ts src/app/api/financeiro/churnar-cliente/route.ts src/app/api/churn/remover/route.ts src/app/api/financeiro/churn-aprovacoes/route.ts | wc -l | tr -d ' '); m=$(grep -c 'espelho.notionIds\\[0\\]' src/app/api/financeiro/churnar-cliente/route.ts); [ \"$n\" = 4 ] && [ \"$m\" = 1 ] && echo CONTRATO_EM_USO || echo ST_${n}_${m}",
      "espera": "CONTRATO_EM_USO"
    },
    {
      "descricao": "o teste de fase do churn ainda espera o espelho em memoria",
      "cmd": "f=test/espelho-fase-churn.test.ts; a=$(grep -c 'a.entidade === \"clientes_notion_mirror\"' $f); b=$(grep -c 'ops_cliente_negocio' $f); [ \"$a\" = 1 ] && [ \"$b\" = 0 ] && echo ESPERA_ESPELHO || echo ST_${a}_${b}",
      "espera": "ESPERA_ESPELHO"
    }
  ],
  "colunas_escritas": [
    "ops_cliente_negocio.fase",
    "ops_cliente_negocio.atualizado_em",
    "ops_cliente_negocio.atualizado_por",
    "ops_cliente_perfil.analista",
    "ops_cliente_perfil.updated_at",
    "ops_cliente_nichos.cliente_id",
    "ops_cliente_nichos.nicho_id",
    "os_audit_log.entidade",
    "os_audit_log.entidade_id",
    "os_audit_log.campo",
    "os_audit_log.valor_anterior",
    "os_audit_log.valor_novo"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/clientes/espelho-status.ts' 'src/app/api/perf/setup/[clienteId]/passo/route.ts' 'test/espelho-fase-churn.test.ts' 'test/fase-e-setup-casa-nova.test.ts' 'src/lib/clientes/espelho-legado.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 690 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 690 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes que leem os 2 arquivos e as 4 rotas de churn seguem verdes (inclui test/espelho-fase-churn.test.ts recalculado)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/churn-log-auth.test.ts test/churn-reativar-rota.test.ts test/quem-cuida.test.ts test/sai-cockpit-id-api-c.test.ts test/setup-cinco-passos.test.ts test/espelho-fase-churn.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "espelho-legado.ts sem import de server-only e espelho-status.ts importa a lib estaticamente",
      "cmd": "a=$(grep -c 'server-only\";' src/lib/clientes/espelho-legado.ts || true); b=$(grep -c 'espelho-legado\"' src/lib/clientes/espelho-status.ts || true); c=$(grep -c 'import(' src/lib/clientes/espelho-status.ts || true); [ \"$a\" = 0 ] && [ \"$b\" -ge 1 ] && [ \"$c\" = 0 ] && echo SEM_SERVER_ONLY || echo ST_${a}_${b}_${c}",
      "espera": "SEM_SERVER_ONLY"
    },
    {
      "descricao": "os dois arquivos nao citam mais o espelho; a fase vai para ops_cliente_negocio com auditoria; o setup grava analista no perfil, nicho no catalogo e fase via lib; o contrato das 4 rotas de churn fica (nomes exportados)",
      "cmd": "e=src/lib/clientes/espelho-status.ts; p='src/app/api/perf/setup/[clienteId]/passo/route.ts'; a=$(grep -c 'clientes_notion_mirror' $e \"$p\" | awk -F: '{s+=$2} END {print s+0}'); b=$(grep -c 'gravarNegocio(' $e); c=$(grep -cE \"entidade: ['\\\"]ops_cliente_negocio['\\\"]\" $e); d=$(grep -cE 'export async function (gravarFaseNoEspelho|receitaIdPelaChave|clienteIdDaReceita)\\(' $e); f=$(grep -c 'gravarNegocio(' \"$p\"); g=$(grep -c 'gravarPerfilOperacional(' \"$p\"); h=$(grep -c 'vincularNichoPeloNome(' \"$p\"); i=$(grep -c 'ensureClienteId' \"$p\"); j=$(grep -c 'setup.p1_basico && setup.p3_meta && setup.p5_crm && setup.p6_whatsapp && setup.p7_metas' \"$p\"); [ \"$a\" = 0 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$d\" = 3 ] && [ \"$f\" -ge 1 ] && [ \"$g\" -ge 1 ] && [ \"$h\" -ge 1 ] && [ \"$i\" = 0 ] && [ \"$j\" = 1 ] && echo CASA_NOVA || echo ST_${a}_${b}_${c}_${d}_${f}_${g}_${h}_${i}_${j}",
      "espera": "CASA_NOVA",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/espelho-fase-churn.test.ts: nenhum expect(/it( a menos, passa a semear ops_cliente_negocio e a auditar essa entidade, nenhum skip/only/todo",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/espelho-fase-churn.test.ts; a=$(git show \"$b:$f\" | grep -cF 'expect('); n=$(grep -cF 'expect(' \"$f\"); ia=$(git show \"$b:$f\" | grep -cF 'it('); ni=$(grep -cF 'it(' \"$f\"); o=$(grep -c 'ops_cliente_negocio' \"$f\"); v=$(grep -c 'a.entidade === \"clientes_notion_mirror\"' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$n\" -ge \"$a\" ] && [ \"$ni\" -ge \"$ia\" ] && [ \"$o\" -ge 3 ] && [ \"$v\" = 0 ] && [ \"$sk\" = 0 ] && echo RECALCULADO_1053B || echo ST_${a}_${n}_${ia}_${ni}_${o}_${v}_${sk}",
      "espera": "RECALCULADO_1053B",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/fase-e-setup-casa-nova.test.ts)",
      "cmd": "test -f test/fase-e-setup-casa-nova.test.ts && npx vitest run test/fase-e-setup-casa-nova.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: gravarFaseNoEspelho resolve o cliente pela chave (receita por id so leitura; resolver unico), grava a fase em ops_cliente_negocio so quando muda, audita entidade ops_cliente_negocio/campo fase com valor anterior, devolve o mesmo formato (notionIds da ponte) e explica cliente sem cadastro; receitaIdPelaChave e clienteIdDaReceita param de ler o espelho; o passo do setup grava analista no perfil, nicho no catalogo, fase Ativo na transicao, recusa cliente sem cadastro (409) e nao linka mais cliente_id no espelho. REPROVE se: resta leitura ou escrita do espelho nos 2 arquivos; nome exportado de espelho-status renomeado ou removido; rota de churn ou teste mockado por nome mexido; escrita nova em clientes_receita; cliente sem cadastro grava ou some em silencio; auditoria sem valor anterior; assercao removida ou afrouxada; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/churn-log-auth.test.ts",
      "motivo": "mocka gravarFaseNoEspelho e receitaIdPelaChave por nome e testa a rota churn-log; nomes e formato de retorno preservados"
    },
    {
      "teste": "test/churn-reativar-rota.test.ts",
      "motivo": "mocka gravarFaseNoEspelho por nome e confere a chamada com { notionId: 'n-1' } e 'Ativo'; a assinatura nao muda"
    },
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "testa calcularP1Basico (p1-basico.ts, fora da allowlist) e le a fonte do passo apenas para o aplicarP1; a chamada calcularP1Basico(supabase, [notionId]) continua"
    },
    {
      "teste": "test/sai-cockpit-id-api-c.test.ts",
      "motivo": "prova que a rota do passo importa '@/lib/clientes/resolver-cliente' e nao o resolve-cockpit-id; o import continua"
    },
    {
      "teste": "test/setup-cinco-passos.test.ts",
      "motivo": "le a fonte do passo: calcularP3Contas(supabase, aplicarP3( antes de const obrigatoriosOk e a expressao dos 5 obrigatorios; tudo preservado literalmente"
    },
    {
      "teste": "test/espelho-fase-churn.test.ts",
      "motivo": "entra na allowlist: semeia o espelho em memoria e espera status/auditoria nele; recalculado para ops_cliente_negocio (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/churn-gate-admin.test.ts",
      "motivo": "importa as rotas churn-aprovacoes e churnar-cliente (que importam espelho-status) e testa so o gate de admin; os nomes exportados e o formato de retorno nao mudam"
    },
    {
      "teste": "test/churn-motivo-obrigatorio.test.ts",
      "motivo": "importa churn-aprovacoes e churn/remover (que importam espelho-status) e testa o motivo obrigatorio; contrato preservado"
    },
    {
      "teste": "test/churn-pipeline-por-id.test.ts",
      "motivo": "importa churn-log e churnar-cliente com supabase em memoria; gravarFaseNoEspelho passa a gravar em ops_cliente_negocio (tabela ausente na memoria e aceita pelo helper) e o teste olha o pipeline de clientes, nao o espelho; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/espelho-legado-lib.test.ts",
      "motivo": "so a linha import server-only sai da lib; o teste ja mocka server-only (mock de modulo que ninguem importa e inofensivo) e o it de fonte nao cita server-only; nenhuma funcao muda"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Atende ao objetivo: fase gravada em ops_cliente_negocio só quando muda; auditoria com valor anterior; espelho lido só pela ponte; cliente sem cadastro dá 409 com motivo. Rotas de churn intocadas, sem escrita na receita. O aviso virar toBeUndefined vem do fixture mandado e está comentado."
}
```
