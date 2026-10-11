# Ticket 840: Saída do resolverChave: api (e)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente F1d. Antes de apagar `@/lib/clientes/resolver-chave`, os importadores que sobram fora de `/api/clientes/[id]/*` passam para `src/lib/clientes/resolver-cliente.ts`. Camada `api`, pacote e:

- `src/app/api/cron/leitura-relacao/route.ts`
- `src/app/api/nps/public/[token]/route.ts`
- `src/app/api/nps/token/route.ts`
- `src/app/api/perf/clientes/[id]/resolver-chave/route.ts`

## Campos de máquina

```json
{
  "id": "840",
  "slug": "sai-resolver-chave-api-e",
  "lane": "produto",
  "perfil": "api",
  "objetivo": "ORCAMENTO DE DIFF: teto de 350 linhas (~40 por arquivo em 4 arquivo(s), ~110 no teste NOVO test/sai-resolver-chave-api-e.test.ts, ~20 por teste existente ajustado). Se passar do teto, pare e reporte. FONTE: docs/mapa/00-MAPA-GERAL.md (divida 6), docs/mapa/04-notion.md secao 3 (chave dupla; tabela dos resolvers) e docs/mapa/ref-auditoria-26set.md:57 e :201 (resolver unico e prioridade 1 da auditoria de 26/09). Pre-condicao: tickets 800 (resolver unico), F1b (801 a 825) e 826 (ficha) feitos. PASSO 1: leia src/lib/clientes/resolver-cliente.ts e cada arquivo da allowlist. FAZER: (1) nos arquivos src/app/api/cron/leitura-relacao/route.ts, src/app/api/nps/public/[token]/route.ts, src/app/api/nps/token/route.ts, src/app/api/perf/clientes/[id]/resolver-chave/route.ts, todo import de @/lib/clientes/resolver-chave sai e o uso passa para o resolver unico, com o mesmo mapeamento dos tickets F1b: resolveCockpitId kind 'unlinked' <=> par.cliente_id === null (mesma resposta de hoje); resolverChave {clienteId, notionId} <=> resolverCliente {cliente_id, notion_id}; filtroPelaChave <=> filtroDoCliente; chaveDaLinha <=> clienteDaLinha; clienteIdParaGravar e isUuid passam a vir de @/lib/clientes/resolver-cliente. Resolucao em laco vira resolverClientes (lote), nunca uma consulta por item. Erro de leitura segue aparecendo como erro (500 na rota, throw na lib), nunca lista vazia. (2) testes existentes da allowlist (test/leitura-relacao-cron-sem-base.test.ts, test/leitura-relacao-gatilhos.test.ts, test/chave-unica-cliente-id.test.ts, test/resolver-chave.test.ts): trocar o alvo do vi.mock para @/lib/clientes/resolver-cliente e o formato do par; cada assercao fica (regra RECALCULE). (3) NOVO test/sai-resolver-chave-api-e.test.ts: le a fonte de cada arquivo do pacote e afirma zero import de @/lib/clientes/resolver-chave e presenca de @/lib/clientes/resolver-cliente; e, para pelo menos uma funcao/rota do pacote com supabase mockado, que uuid e notion_id chegam ao mesmo cliente_id. FORA DE ESCOPO: @/lib/clientes/resolver-chave (o ticket de remocao apaga), src/lib/clientes/resolver-cliente.ts, arquivos fora da allowlist, migration. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; zero migration e zero .sql; chave oficial do cliente e cliente_id (uuid), notion_id e so apelido aceito em URL legada (decisao-chave-oficial-cliente-id, 26/09); falha de leitura nunca vira zero, lista vazia ou verde: erro aparece como erro (500 na rota, aviso na tela); dado ausente aparece como 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; trocar o alvo de um vi.mock do resolver antigo para @/lib/clientes/resolver-cliente nao e afrouxar; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "test/sai-resolver-chave-api-e.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/cron/leitura-relacao/route.ts",
    "src/app/api/nps/public/[token]/route.ts",
    "src/app/api/nps/token/route.ts",
    "src/app/api/perf/clientes/[id]/resolver-chave/route.ts",
    "test/leitura-relacao-cron-sem-base.test.ts",
    "test/leitura-relacao-gatilhos.test.ts",
    "test/chave-unica-cliente-id.test.ts",
    "test/resolver-chave.test.ts",
    "test/resolver-cliente.test.ts",
    "test/sai-resolver-chave-api-e.test.ts"
  ],
  "dependencias": [
    "800",
    "826",
    "801",
    "802",
    "803",
    "804",
    "805",
    "806",
    "807",
    "808",
    "809",
    "810",
    "811",
    "812",
    "813",
    "814",
    "815",
    "816",
    "817",
    "818",
    "819",
    "820",
    "821",
    "822",
    "823",
    "824",
    "825",
    "humano:decisao-chave-oficial-cliente-id",
    "839",
    "752"
  ],
  "prioridade": 43,
  "recon_esperado": [
    {
      "descricao": "src/app/api/cron/leitura-relacao/route.ts existe na arvore do loop",
      "cmd": "test -e 'src/app/api/cron/leitura-relacao/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "src/app/api/nps/public/[token]/route.ts existe na arvore do loop",
      "cmd": "test -e 'src/app/api/nps/public/[token]/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "src/app/api/nps/token/route.ts existe na arvore do loop",
      "cmd": "test -e 'src/app/api/nps/token/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "src/app/api/perf/clientes/[id]/resolver-chave/route.ts existe na arvore do loop",
      "cmd": "test -e 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "test/sai-resolver-chave-api-e.test.ts ainda nao existe",
      "cmd": "test -e 'test/sai-resolver-chave-api-e.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "arquivos do pacote que importam @/lib/clientes/resolver-chave hoje",
      "cmd": "n=0; for f in 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts'; do grep -qF '@/lib/clientes/resolver-chave' \"$f\" && n=$((n+1)); done; echo $n",
      "espera": "4"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts' | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "arquivos fora do escopo intocados",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- 'src/lib/clientes/resolver-cliente.ts' 'src/lib/clientes/resolver-chave.ts' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADOS || echo TOCOU_$n",
      "espera": "INTOCADOS",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts' 'test/leitura-relacao-cron-sem-base.test.ts' 'test/leitura-relacao-gatilhos.test.ts' 'test/chave-unica-cliente-id.test.ts' 'test/resolver-chave.test.ts' 'test/sai-resolver-chave-api-e.test.ts' 'test/resolver-cliente.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 350 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 350 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "anti-afrouxamento: nenhum teste existente da allowlist perdeu it(/expect(, ganhou .skip/.only/.todo ou toBeDefined() novo, nem foi apagado (contra o merge-base com staging-auto)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=NAO_AFROUXOU; for f in 'test/leitura-relacao-cron-sem-base.test.ts' 'test/leitura-relacao-gatilhos.test.ts' 'test/chave-unica-cliente-id.test.ts' 'test/resolver-chave.test.ts'; do [ -f \"$f\" ] || { git cat-file -e \"$b:$f\" 2>/dev/null && r=APAGOU_$f; continue; }; for p in 'expect(' 'it('; do a=$(git show \"$b:$f\" 2>/dev/null | grep -cF \"$p\"); n=$(grep -cF \"$p\" \"$f\"); [ \"${n:-0}\" -ge \"${a:-0}\" ] || r=CAIU_$f; done; s0=$(git show \"$b:$f\" 2>/dev/null | grep -cE '\\.(skip|only|todo)\\('); s1=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"${s1:-0}\" -le \"${s0:-0}\" ] || r=SKIP_NOVO_$f; d0=$(git show \"$b:$f\" 2>/dev/null | grep -c 'toBeDefined()'); d1=$(grep -c 'toBeDefined()' \"$f\"); [ \"${d1:-0}\" -le \"${d0:-0}\" ] || r=TOBEDEFINED_NOVO_$f; done; echo $r",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "testes existentes da allowlist verdes depois da mudanca",
      "cmd": "npx vitest run 'test/leitura-relacao-cron-sem-base.test.ts' 'test/leitura-relacao-gatilhos.test.ts' 'test/chave-unica-cliente-id.test.ts' 'test/resolver-chave.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum arquivo do pacote importa @/lib/clientes/resolver-chave",
      "cmd": "n=0; for f in 'src/app/api/cron/leitura-relacao/route.ts' 'src/app/api/nps/public/[token]/route.ts' 'src/app/api/nps/token/route.ts' 'src/app/api/perf/clientes/[id]/resolver-chave/route.ts'; do grep -qF '@/lib/clientes/resolver-chave' \"$f\" && n=$((n+1)); done; [ \"$n\" = 0 ] && echo SEM_IMPORT || echo IMPORTA_$n",
      "espera": "SEM_IMPORT"
    },
    {
      "descricao": "teste novo verde (test/sai-resolver-chave-api-e.test.ts)",
      "cmd": "test -f test/sai-resolver-chave-api-e.test.ts && npx vitest run test/sai-resolver-chave-api-e.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "anti-afrouxamento: test/resolver-cliente.test.ts continua existindo, nao perdeu it(/test(/expect(, nem ganhou .skip/.only/.todo (contra o merge-base com staging-auto)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=NAO_AFROUXOU; for f in test/resolver-cliente.test.ts; do [ -f \"$f\" ] || { git cat-file -e \"$b:$f\" 2>/dev/null && r=APAGOU_$f; continue; }; for p in 'expect(' 'it(' 'test('; do a=$(git show \"$b:$f\" 2>/dev/null | grep -cF \"$p\"); n=$(grep -cF \"$p\" \"$f\"); [ \"${n:-0}\" -ge \"${a:-0}\" ] || r=CAIU_$f; done; s0=$(git show \"$b:$f\" 2>/dev/null | grep -cE '\\.(skip|only|todo)\\('); s1=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"${s1:-0}\" -le \"${s0:-0}\" ] || r=SKIP_NOVO_$f; done; echo $r",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "avaliador: os arquivos do pacote nao importam mais @/lib/clientes/resolver-chave, usam o resolver unico com o mesmo comportamento (sem vinculo, 404/erro), lote em vez de consulta por item. REPROVE se: erro vira vazio; comportamento de sem vinculo mudou; assercao afrouxada; arquivo fora da allowlist.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "motivo repetido: provável defeito de spec/harness, não do código — gate vitest: suíte vermelha (ver /Users/lucasantos/Projetos/comarka-operacional/docs/fila/runs/840/attempt-2/gate-vitest.txt)"
}
```
