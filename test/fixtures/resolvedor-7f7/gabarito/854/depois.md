# Ticket 854: Remove a tela /equipe-geral (gêmea de /portal/equipe)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente F5. `/equipe-geral` (lista de time pelo Notion legado, `/api/notion/team`) é gêmea de `/portal/equipe` (menu Time › Equipe, `/api/employees`). Sai a tela e o error boundary dela; `/dashboard/team` passa a redirecionar para `/portal/equipe` (hoje redireciona para `/equipe-geral` e viraria 404). A raiz `/` já não aponta para `/equipe-geral` desde o df5ea6e (701, redirect para `/dashboard`), por isso o 853 ficou obsoleto e saiu das dependências; o único arquivo de src que ainda cita a tela é `src/app/dashboard/team/page.tsx`.

## Campos de máquina

```json
{
  "id": "854",
  "slug": "remove-equipe-geral",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 300 linhas (a remocao conta: o git diff conta linha apagada). Se passar do teto, pare e reporte. FONTE: docs/mapa/00-MAPA-GERAL.md (secao 6.1, D-h telas gemeas) e docs/mapa/01a-ui.md secao 1 e 4 (duplicacoes). Decisao humana pendente: humano:decisao-telas-gemeas. PASSO 1: leia src/app/equipe-geral/page.tsx, src/app/equipe-geral/error.tsx, src/app/dashboard/team/page.tsx (redirect para /equipe-geral) e test/error-boundaries-rotas-lote5.test.ts:8 (entrada da equipe geral). FAZER: (1) apagar src/app/equipe-geral/page.tsx e src/app/equipe-geral/error.tsx. (2) src/app/dashboard/team/page.tsx: redirect('/portal/equipe') e comentario atualizado, sem citar /equipe-geral nem no comentario (e o unico arquivo de src que cita a tela desde o df5ea6e; a raiz / ja redireciona para /dashboard). (3) teste de error boundary: tirar so a entrada de src/app/equipe-geral/error.tsx. (4) test/rotas-orfas.test.ts: o unico href para /dashboard/team/${id} ficava em src/app/equipe-geral/page.tsx, entao /dashboard/team/[id] vira orfa (gate vitest do 12/10: 'expected 21 to be 20' e orphans ['/dashboard/team/[id]']). A page NAO sai: o layout do ticket 710 (src/app/dashboard/team/[id]/layout.tsx) redireciona para o Inicio antes de ela renderizar, e test/team-redireciona-inicio.test.ts exige que ela exista (decisao do Lucas em 12/10: opcao (ii), allowlist com motivo). FAZER no teste, no mesmo molde de COMUNICADOS_EQUIPE: nova categoria `const TEAM_ID_710 = ['/dashboard/team/[id]']` com `TEAM_ID_710_RATIONALE = 'Ticket 854: a lista /equipe-geral (unico href para /dashboard/team/${id}) saiu; a rota fica no disco por decisao do 710, cujo layout redireciona para o Inicio antes de a page renderizar. Sem href por desenho, nunca recebe link.'`, comentario de 2 a 4 linhas acima citando o 854 e o 710, `addAll(TEAM_ID_710, TEAM_ID_710_RATIONALE)` junto dos outros addAll, e `...TEAM_ID_710` no array combinado do it 'prova de vermelho' (ela e orfa de fato pro scanner). A invariante `orphansSemAllowlist.length).toBe(Object.keys(ALLOWLIST).length - LEGAL_CONFIG.length)` NAO muda: fecha sozinha (21 orfas = 22 entradas - 1). Nenhuma outra linha do teste muda. NAO apague nem edite src/app/dashboard/team/[id]/ (page.tsx e layout.tsx). /api/notion/team fica (rota sem chamador vira divida 18, fora deste ticket). Testes existentes que citam a tela (test/error-boundaries-rotas-lote5.test.ts): tirar SO a entrada da tela removida (lista de rotas, caminho lido); nenhuma outra assercao muda. NOVO test/remove-equipe-geral.test.ts: afirma que a rota removida nao existe e que nenhum href/redirect de src aponta para ela. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; zero migration e zero .sql; chave oficial do cliente e cliente_id (uuid), notion_id e so apelido aceito em URL legada (decisao-chave-oficial-cliente-id, 26/09); falha de leitura nunca vira zero, lista vazia ou verde: erro aparece como erro (500 na rota, aviso na tela); dado ausente aparece como 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; trocar o alvo de um vi.mock do resolver antigo para @/lib/clientes/resolver-cliente nao e afrouxar; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "test/remove-equipe-geral.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/equipe-geral/page.tsx",
    "src/app/equipe-geral/error.tsx",
    "src/app/dashboard/team/page.tsx",
    "test/error-boundaries-rotas-lote5.test.ts",
    "test/remove-equipe-geral.test.ts",
    "test/rotas-orfas.test.ts"
  ],
  "dependencias": [
    "humano:decisao-telas-gemeas"
  ],
  "prioridade": 45,
  "recon_esperado": [
    {
      "descricao": "src/app/equipe-geral/page.tsx existe na arvore do loop",
      "cmd": "test -e 'src/app/equipe-geral/page.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "src/app/equipe-geral/error.tsx existe na arvore do loop",
      "cmd": "test -e 'src/app/equipe-geral/error.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "src/app/dashboard/team/page.tsx existe na arvore do loop",
      "cmd": "test -e 'src/app/dashboard/team/page.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "test/remove-equipe-geral.test.ts ainda nao existe",
      "cmd": "test -e 'test/remove-equipe-geral.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "quem aponta para /equipe-geral em src (arquivos): so src/app/dashboard/team/page.tsx (a raiz saiu no df5ea6e)",
      "cmd": "grep -rl '/equipe-geral' src | wc -l | tr -d ' '",
      "espera": "1"
    },
    {
      "descricao": "rotas-orfas ainda nao tem allowlist para /dashboard/team/[id] (hoje ela tem href vindo de /equipe-geral)",
      "cmd": "n=$(grep -cF \"'/dashboard/team/[id]'\" test/rotas-orfas.test.ts); [ \"$n\" = 0 ] && echo SEM_ENTRADA || echo ST_$n",
      "espera": "SEM_ENTRADA"
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
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada (diff contra o merge-base com staging-auto)",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/cartao-topo-perfil.test.tsx test/travessao-mudo.test.ts test/c0-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/app/equipe-geral/page.tsx' 'src/app/equipe-geral/error.tsx' 'src/app/dashboard/team/page.tsx' | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "arquivos fora do escopo intocados",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- 'src/app/api/notion/team/route.ts' 'src/app/portal/equipe/page.tsx' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADOS || echo TOCOU_$n",
      "espera": "INTOCADOS",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/equipe-geral/page.tsx' 'src/app/equipe-geral/error.tsx' 'src/app/dashboard/team/page.tsx' 'test/error-boundaries-rotas-lote5.test.ts' 'test/remove-equipe-geral.test.ts' 'test/rotas-orfas.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 300 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 300 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "arquivos da tela removidos",
      "cmd": "n=0; for f in 'src/app/equipe-geral/page.tsx' 'src/app/equipe-geral/error.tsx'; do [ -e \"$f\" ] && n=$((n+1)); done; [ \"$n\" = 0 ] && echo REMOVIDA || echo SOBRA_$n",
      "espera": "REMOVIDA"
    },
    {
      "descricao": "anti-afrouxamento de test/error-boundaries-rotas-lote5.test.ts: segue com pelo menos 1 it e sem .skip/.only; so sai a entrada da tela removida (o avaliador confere)",
      "cmd": "[ -f test/error-boundaries-rotas-lote5.test.ts ] || { echo APAGOU; exit 0; }; a=$(grep -c 'it(' test/error-boundaries-rotas-lote5.test.ts); s=$(grep -cE '[.](skip|only|todo)[(]' test/error-boundaries-rotas-lote5.test.ts); [ \"$a\" -ge 1 ] && [ \"$s\" = 0 ] && echo NAO_AFROUXOU || echo ST_${a}_${s}",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "nada em src cita /equipe-geral (href, redirect ou comentario)",
      "cmd": "n=$(grep -rl '/equipe-geral' src | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SEM_LINK || echo LINK_$n",
      "espera": "SEM_LINK"
    },
    {
      "descricao": "/dashboard/team redireciona para /portal/equipe",
      "cmd": "f=src/app/dashboard/team/page.tsx; grep -q 'redirect(' \"$f\" && grep -q '/portal/equipe' \"$f\" && echo VAI_PORTAL || echo FICOU",
      "espera": "VAI_PORTAL"
    },
    {
      "descricao": "teste novo verde (test/remove-equipe-geral.test.ts)",
      "cmd": "test -f test/remove-equipe-geral.test.ts && npx vitest run test/remove-equipe-geral.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "/dashboard/team/[id] entra na allowlist do rotas-orfas como categoria propria e na prova de vermelho; a page e o layout do 710 seguem no disco",
      "cmd": "f=test/rotas-orfas.test.ts; d=$(grep -cF \"const TEAM_ID_710 = ['/dashboard/team/[id]']\" \"$f\"); a=$(grep -cF 'addAll(TEAM_ID_710, TEAM_ID_710_RATIONALE)' \"$f\"); p=$(grep -cF '...TEAM_ID_710' \"$f\"); pg=0; [ -e 'src/app/dashboard/team/[id]/page.tsx' ] && [ -e 'src/app/dashboard/team/[id]/layout.tsx' ] && pg=1; [ \"$d\" = 1 ] && [ \"$a\" = 1 ] && [ \"$p\" = 1 ] && [ \"$pg\" = 1 ] && echo TEAM_ID_NA_ALLOWLIST || echo ST_${d}_${a}_${p}_${pg}",
      "espera": "TEAM_ID_NA_ALLOWLIST",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/rotas-orfas.test.ts: mesmo numero de it( e expect(, so 1 linha removida (o for da prova de vermelho), invariante de contagem intacta, nenhum skip ou only",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=test/rotas-orfas.test.ts; ia=$(git show \"$b:$f\" | grep -c 'it('); ea=$(git show \"$b:$f\" | grep -c 'expect('); i=$(grep -c 'it(' \"$f\"); e=$(grep -c 'expect(' \"$f\"); rem=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^-[^-]'); inv=$(grep -cF 'toBe(Object.keys(ALLOWLIST).length - LEGAL_CONFIG.length)' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$i\" = \"$ia\" ] && [ \"$e\" = \"$ea\" ] && [ \"$rem\" -le 1 ] && [ \"$inv\" = 1 ] && [ \"$sk\" = 0 ] && echo ORFAS_INTACTO || echo ST_${ia}_${i}_${ea}_${e}_${rem}_${inv}_${sk}",
      "espera": "ORFAS_INTACTO",
      "tipo": "guarda"
    },
    {
      "descricao": "rotas-orfas e o teste do 710 verdes depois da mudanca",
      "cmd": "npx vitest run test/rotas-orfas.test.ts test/team-redireciona-inicio.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: a tela saiu inteira, nada aponta para ela, e nos testes so saiu a entrada dela; /dashboard/team/[id] entrou na allowlist do rotas-orfas com o motivo do 710 e a page e o layout dela ficaram. REPROVE se: apagou ou editou algo em src/app/dashboard/team/[id]/; mexeu na invariante de contagem do rotas-orfas. REPROVE se: outra tela mudou; assercao de outra rota caiu; link quebrado sobrou.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "testes_conferidos": [
    {
      "teste": "test/team-redireciona-inicio.test.ts",
      "motivo": "exige que src/app/dashboard/team/[id]/page.tsx exista e le o layout do 710; este ticket nao toca essa pasta (criterio TEAM_ID_NA_ALLOWLIST confere) e o teste roda no criterio de verdes"
    }
  ]
}
```
