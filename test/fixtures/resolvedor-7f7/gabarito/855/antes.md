# Ticket 855: Remove a tela /dashboard/team/[id] (gêmea de /equipe/[id]), passo 3 de 3

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente F5. `/dashboard/team/[id]` sai (decisão `decisao-telas-gemeas`, 05/10). A tela já é inalcançável desde o 710: o `layout.tsx` da pasta redireciona no servidor antes de renderizar. O arquivo tem 1789 linhas e o loop reprova diff acima de 900 (inserções + deleções). Decisão do Lucas em 11/10: não subir o cap global; a remoção vai em três passos dentro do cap (855a → 855b → 855). Dois não cabem: só as deleções obrigatórias já somam 1797 linhas, e o passo final ainda edita testes e cria um.

Passo final: `page.tsx` vira um stub de poucas linhas. A pasta e o `layout.tsx` do 710 ficam, para o link legado continuar redirecionando em vez de dar 404 (e `test/team-redireciona-inicio.test.ts`, que exige o `page.tsx` no disco, segue verde). Saem a entrada do CONGELADO, o `it` da carteira e o `describe` da tela; nasce `test/remove-team-id.test.ts`.

## Campos de máquina

```json
{
  "id": "855",
  "slug": "remove-team-id",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 880 linhas (~720 linhas apagadas na tela, ~45 nos testes, ~60 no teste NOVO). Se passar do teto, pare e reporte. Frente F5, decisao humano:decisao-telas-gemeas (05/10): /dashboard/team/[id] sai. A tela ja e inalcancavel desde o ticket 710: src/app/dashboard/team/[id]/layout.tsx redireciona no servidor antes de renderizar, e test/team-redireciona-inicio.test.ts exige que page.tsx continue existindo. O arquivo tem 1789 linhas e o diff_cap_linhas do loop e 900 (inserções + deleções, executor.sh:566); decisao do Lucas em 11/10: NAO subir o cap global, quebrar a remocao em passos dentro do cap: 855a, 855b e 855 (final). Cada passo deixa a tela compilando; como o layout redireciona, ninguem ve o estado intermediario. PASSO 3 de 3 (depois do 855a e do 855b). FONTE: docs/mapa/00-MAPA-GERAL.md (secao 6.1, D-h telas gemeas). PASSO 1: leia src/app/dashboard/team/[id]/page.tsx, src/app/dashboard/team/[id]/layout.tsx, test/team-redireciona-inicio.test.ts, test/anon-navegador-congelado.test.ts (CONGELADO lista o arquivo), test/carteira-membro.test.ts (describe da tela) e test/ativo-pela-receita.test.ts (it da carteira do membro). FAZER: (1) src/app/dashboard/team/[id]/page.tsx vira um stub, exatamente: um comentario de 1 a 2 linhas ('Ticket 855: a tela saiu (decisao-telas-gemeas, 05/10). O layout.tsx do 710 redireciona antes de renderizar; este arquivo so mantem a rota.') e 'export default function TeamMemberPage() { return null; }'. Sem 'use client', sem import. O layout.tsx e a pasta [id] FICAM: apagar a pasta derrubaria o redirect do 710 (link legado viraria 404) e quebraria test/team-redireciona-inicio.test.ts, que exige page.tsx no disco. (2) test/anon-navegador-congelado.test.ts: tirar so a linha 'src/app/dashboard/team/[id]/page.tsx' de CONGELADO (o stub nao usa o anon). (3) test/ativo-pela-receita.test.ts: tirar so o it 'carteira do membro (equipe): ativos pela receita...' que le a tela. (4) test/carteira-membro.test.ts: tirar so o describe que le a tela (ticket 136); o describe da rota GET /api/dashboard/clientes fica. A carteira do membro por id foi migrada para /equipe/[id] no ticket 862 (done antes deste): se alguma regra afirmada so nesse describe nao tiver teste equivalente para /equipe/[id], PARE e descreva antes de apagar. (5) NOVO test/remove-team-id.test.ts (readFileSync, sem banco): a tela e o stub (no maximo 10 linhas, contem 'return null', nao contem '@/lib/supabase' nem 'use client'); o layout.tsx do 710 existe e chama redirect(; nenhum .ts/.tsx de src monta href para /dashboard/team/${ (varrer src com readdirSync recursivo). test/a11y/app-dashboard-team-id-page.test.ts FICA sem edicao (o stub passa). REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; zero migration e zero .sql; chave oficial do cliente e cliente_id (uuid), notion_id e so apelido aceito em URL legada (decisao-chave-oficial-cliente-id, 26/09); falha de leitura nunca vira zero, lista vazia ou verde: erro aparece como erro (500 na rota, aviso na tela); dado ausente aparece como 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json, nunca req.json()); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; trocar o alvo de um vi.mock do resolver antigo para @/lib/clientes/resolver-cliente nao e afrouxar; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( fora dos dois citados acima, ou apagar arquivo de teste. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/cartao-topo-perfil.test.tsx, test/travessao-mudo.test.ts, test/c0-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado. FORA DE ESCOPO: layout.tsx, /equipe/[id], qualquer outra tela, o diff_cap_linhas do 000-config.json.",
  "cria_novo": [
    "test/remove-team-id.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/team/[id]/page.tsx",
    "test/anon-navegador-congelado.test.ts",
    "test/ativo-pela-receita.test.ts",
    "test/carteira-membro.test.ts",
    "test/remove-team-id.test.ts"
  ],
  "dependencias": [
    "855b",
    "852",
    "854",
    "862",
    "humano:decisao-telas-gemeas"
  ],
  "prioridade": 45,
  "recon_esperado": [
    {
      "descricao": "a tela existe na arvore do loop",
      "cmd": "test -e 'src/app/dashboard/team/[id]/page.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "test/remove-team-id.test.ts ainda nao existe",
      "cmd": "test -e 'test/remove-team-id.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o layout do 710 que redireciona a rota existe",
      "cmd": "grep -c 'redirect(' 'src/app/dashboard/team/[id]/layout.tsx'",
      "espera": "4"
    },
    {
      "descricao": "a tela ainda esta em CONGELADO",
      "cmd": "grep -cF '\"src/app/dashboard/team/[id]/page.tsx\",' test/anon-navegador-congelado.test.ts",
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
      "descricao": "arquivos fora do escopo intocados",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- 'src/app/equipe/[id]/page.tsx' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADOS || echo TOCOU_$n",
      "espera": "INTOCADOS",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do ok=0; for p in 'src/app/dashboard/team/[id]/page.tsx' 'test/anon-navegador-congelado.test.ts' 'test/ativo-pela-receita.test.ts' 'test/carteira-membro.test.ts' 'test/remove-team-id.test.ts'; do if [ \"$f\" = \"$p\" ]; then ok=1; fi; done; [ $ok = 1 ] || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do cap do loop (<= 880 linhas somando adicoes e remocoes; diff_cap_linhas 900 nao muda)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 880 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() na tela (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff \"$b\" HEAD -- 'src/app/dashboard/team/[id]/page.tsx' | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "anti-afrouxamento de test/anon-navegador-congelado.test.ts: segue com pelo menos 1 it e sem .skip/.only; so sai a entrada da tela removida (o avaliador confere)",
      "cmd": "[ -f test/anon-navegador-congelado.test.ts ] || { echo APAGOU; exit 0; }; a=$(grep -c 'it(' test/anon-navegador-congelado.test.ts); s=$(grep -cE '[.](skip|only|todo)[(]' test/anon-navegador-congelado.test.ts); [ \"$a\" -ge 1 ] && [ \"$s\" = 0 ] && echo NAO_AFROUXOU || echo ST_${a}_${s}",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "anti-afrouxamento de test/ativo-pela-receita.test.ts: segue com pelo menos 1 it e sem .skip/.only; so sai a entrada da tela removida (o avaliador confere)",
      "cmd": "[ -f test/ativo-pela-receita.test.ts ] || { echo APAGOU; exit 0; }; a=$(grep -c 'it(' test/ativo-pela-receita.test.ts); s=$(grep -cE '[.](skip|only|todo)[(]' test/ativo-pela-receita.test.ts); [ \"$a\" -ge 1 ] && [ \"$s\" = 0 ] && echo NAO_AFROUXOU || echo ST_${a}_${s}",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "anti-afrouxamento de test/carteira-membro.test.ts: segue com pelo menos 1 it e sem .skip/.only; so sai a entrada da tela removida (o avaliador confere)",
      "cmd": "[ -f test/carteira-membro.test.ts ] || { echo APAGOU; exit 0; }; a=$(grep -c 'it(' test/carteira-membro.test.ts); s=$(grep -cE '[.](skip|only|todo)[(]' test/carteira-membro.test.ts); [ \"$a\" -ge 1 ] && [ \"$s\" = 0 ] && echo NAO_AFROUXOU || echo ST_${a}_${s}",
      "espera": "NAO_AFROUXOU",
      "tipo": "guarda"
    },
    {
      "descricao": "nada em src aponta para /dashboard/team/<id>",
      "cmd": "n=$(grep -rlF '/dashboard/team/${' src | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SEM_LINK || echo LINK_$n",
      "espera": "SEM_LINK"
    },
    {
      "descricao": "a tela virou stub (<= 10 linhas, return null, sem anon, sem use client)",
      "cmd": "f='src/app/dashboard/team/[id]/page.tsx'; l=$(wc -l < \"$f\" | tr -d ' '); r=$(grep -c 'return null' \"$f\"); s=$(grep -cE '@/lib/supabase|use client' \"$f\"); [ \"$l\" -le 10 ] && [ \"$r\" = 1 ] && [ \"$s\" = 0 ] && echo STUB || echo ST_${l}_${r}_${s}",
      "espera": "STUB"
    },
    {
      "descricao": "layout do 710 intocado e seu teste verde",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD -- 'src/app/dashboard/team/[id]/layout.tsx' test/team-redireciona-inicio.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && npx vitest run test/team-redireciona-inicio.test.ts test/a11y/app-dashboard-team-id-page.test.ts >/dev/null 2>&1 && echo REDIRECT_OK || echo QUEBROU_$n",
      "espera": "REDIRECT_OK",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum arquivo de teste apagado",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-status \"$b\" HEAD -- test | awk '$1==\"D\"' | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo NENHUM_APAGADO || echo APAGOU_$n",
      "espera": "NENHUM_APAGADO",
      "tipo": "guarda"
    },
    {
      "descricao": "teste novo verde (test/remove-team-id.test.ts)",
      "cmd": "test -f test/remove-team-id.test.ts && npx vitest run test/remove-team-id.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: a tela virou stub, o redirect do 710 segue, nada aponta para a rota, e nos testes so sairam a entrada do CONGELADO, o it da carteira e o describe da tela. REPROVE se: layout mudou; outra tela mudou; assercao de outra rota caiu; link sobrou.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/a11y/app-dashboard-team-id-page.test.ts",
      "motivo": "le a tela; o stub nao tem controle, segue verde sem edicao (855)"
    },
    {
      "teste": "test/team-redireciona-inicio.test.ts",
      "motivo": "exige page.tsx no disco e le o layout; o stub mantem os dois (855)"
    },
    {
      "teste": "test/adocao-predicado.test.ts",
      "motivo": "afetado pelo grafo mas nao cita a tela removida pelo caminho (grep em 03/10); se quebrar, PARE e descreva"
    }
  ],
  "status": "bloqueado",
  "notas_status": "motivo repetido: provável defeito de spec/harness, não do código — gate vitest: suíte vermelha (ver /Users/lucasantos/Projetos/comarka-operacional/docs/fila/runs/855/attempt-2/gate-vitest.txt)"
}
```
