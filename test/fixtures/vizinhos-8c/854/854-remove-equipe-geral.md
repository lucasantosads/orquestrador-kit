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
  "objetivo": "ORCAMENTO DE DIFF: teto de 300 linhas (a remocao conta: o git diff conta linha apagada). Se passar do teto, pare e reporte. FONTE: docs/mapa/00-MAPA-GERAL.md (secao 6.1, D-h telas gemeas) e docs/mapa/01a-ui.md secao 1 e 4 (duplicacoes). Decisao humana pendente: humano:decisao-telas-gemeas. PASSO 1: leia src/app/equipe-geral/page.tsx, src/app/equipe-geral/error.tsx, src/app/dashboard/team/page.tsx (redirect para /equipe-geral) e test/error-boundaries-rotas-lote5.test.ts:8 (entrada da equipe geral). FAZER: (1) apagar src/app/equipe-geral/page.tsx e src/app/equipe-geral/error.tsx. (2) src/app/dashboard/team/page.tsx: redirect('/portal/equipe') e comentario atualizado, sem citar /equipe-geral nem no comentario (e o unico arquivo de src que cita a tela desde o df5ea6e; a raiz / ja redireciona para /dashboard). (3) teste de error boundary: tirar so a entrada de src/app/equipe-geral/error.tsx. /api/notion/team fica (rota sem chamador vira divida 18, fora deste ticket). Testes existentes que citam a tela (test/error-boundaries-rotas-lote5.test.ts): tirar SO a entrada da tela removida (lista de rotas, caminho lido); nenhuma outra assercao muda. NOVO test/remove-equipe-geral.test.ts: afirma que a rota removida nao existe e que nenhum href/redirect de src aponta para ela. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; zero migration e zero .sql; chave oficial do cliente e cliente_id (uuid), notion_id e so apelido aceito em URL legada (decisao-chave-oficial-cliente-id, 26/09); falha de leitura nunca vira zero, lista vazia ou verde: erro aparece como erro (500 na rota, aviso na tela); dado ausente aparece como 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; trocar o alvo de um vi.mock do resolver antigo para @/lib/clientes/resolver-cliente nao e afrouxar; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "test/remove-equipe-geral.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/equipe-geral/page.tsx",
    "src/app/equipe-geral/error.tsx",
    "src/app/dashboard/team/page.tsx",
    "test/error-boundaries-rotas-lote5.test.ts",
    "test/remove-equipe-geral.test.ts"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/equipe-geral/page.tsx' 'src/app/equipe-geral/error.tsx' 'src/app/dashboard/team/page.tsx' 'test/error-boundaries-rotas-lote5.test.ts' 'test/remove-equipe-geral.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
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
      "descricao": "avaliador: a tela saiu inteira, nada aponta para ela, e nos testes so saiu a entrada dela. REPROVE se: outra tela mudou; assercao de outra rota caiu; link quebrado sobrou.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "motivo repetido: provável defeito de spec/harness, não do código — gate vitest: suíte vermelha (ver /Users/lucasantos/Projetos/comarka-operacional/docs/fila/runs/854/attempt-2/gate-vitest.txt)"
}
```
