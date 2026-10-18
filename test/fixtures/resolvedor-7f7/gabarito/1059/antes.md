# Ticket 1059: rotas /api/notion/* com consumidor viram /api/clientes e /api/onboarding (com redirect); as sem consumidor saem

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion". `src/app/api/notion/` ainda tem 10 arquivos de rota (staging-auto, 13/10). O nome é herança do fork: nenhuma delas fala com o Notion. Recon de consumidores (`grep -rn 'api/notion/' src`, fora de `src/app/api/notion`):

```
src/components/gestor-capacidade.tsx:17              fetch("/api/notion/clientes-filtrados")
src/app/dashboard/clientes/[id]/page.tsx:722,732     fetch(`/api/notion/clientes/${id}`)
src/app/dashboard/onboarding/[id]/page.tsx:53        fetch(`/api/notion/onboarding/${id}`)   (pagina legada, orfa por decisao: test/rotas-orfas LEGACY_DINAMICA)
src/app/dashboard/clientes/onboarding/page.tsx:146,182  /api/notion/onboarding e /api/notion/sync: o 1041c tira os dois da pagina
```

Sem consumidor em `src/`: `clientes` (lista), `gestores`, `member/[id]`, `team`, `update` (alias 308 de `/api/clientes/situacao`) e, depois do 1041c, `onboarding` (lista) e `sync` (stub 410). Testes que importam ou citam as rotas: `test/getsession-notion-clientes.test.ts`, `test/getsession-notion-onboarding-team.test.ts`, `test/ficha-por-uuid.test.ts`, `test/quem-cuida.test.ts:174,179` (lê a fonte de member/[id] e clientes-filtrados), `test/c0-guard.test.ts:306` (lista de rotas sancionadas a ler valor_mensal, por caminho: só o caminho muda, a regra não).

`test/rotas-orfas.test.ts` olha páginas de `src/app/dashboard/**`, não rotas de API: não muda.

## Campos de máquina

```json
{
  "id": "1059",
  "slug": "notion-rotas-renomeadas",
  "lane": "produto",
  "perfil": "api",
  "objetivo": "ORCAMENTO DE DIFF: teto de 760 linhas (~190 nas 3 rotas novas, copias das atuais; ~30 nos 3 redirects; ~7 rotas removidas (~150 de remocao); ~4 nos 2 consumidores; ~80 de recalculo em test/getsession-notion-clientes.test.ts, test/getsession-notion-onboarding-team.test.ts, test/ficha-por-uuid.test.ts, test/quem-cuida.test.ts e test/c0-guard.test.ts; ~150 em test/notion-rotas-renomeadas.test.ts NOVO). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion; 29/09 o OS nao fala com o Notion): as rotas de src/app/api/notion/ sao herdadas do fork e so leem Supabase. Depende de 1054 (que mexe na rota clientes/[id]) e de 1041c (que tira /api/notion/onboarding e /api/notion/sync da pagina de onboarding). PASSO 1: leia os 10 arquivos de src/app/api/notion/ (clientes-filtrados/route.ts, clientes/[id]/route.ts, clientes/route.ts, gestores/route.ts, member/[id]/route.ts, onboarding/[id]/route.ts, onboarding/route.ts, sync/route.ts, team/route.ts, update/route.ts), src/app/api/notion/update/route.ts (molde de redirect 308), os 3 consumidores citados na prosa e os 5 testes citados. Confirme com `grep -rn 'api/notion/' src --include=*.ts --include=*.tsx | grep -v '^src/app/api/notion'` que so os 3 consumidores restam (se aparecer outro, PARE e descreva). FAZER: (1) MOVER (conteudo identico, so o caminho): src/app/api/notion/clientes-filtrados/route.ts -> NOVO src/app/api/clientes/filtrados/route.ts; src/app/api/notion/clientes/[id]/route.ts -> NOVO src/app/api/clientes/[id]/ficha/route.ts; src/app/api/notion/onboarding/[id]/route.ts -> NOVO src/app/api/onboarding/legado/[id]/route.ts (ajuste so os prefixos de log '[/api/notion/...]' para os caminhos novos). (2) Os 3 arquivos antigos viram redirect de compatibilidade no molde de update/route.ts: `export async function GET(req: NextRequest, ...) { return NextResponse.redirect(new URL(<caminho novo com o mesmo [id] e a mesma query>, req.url), 308); }` com comentario de uma linha citando o 1059 e a data de remocao sugerida (30 dias). (3) REMOVER (zero consumidor em src, provado pelo grep do PASSO 1): src/app/api/notion/clientes/route.ts, src/app/api/notion/gestores/route.ts, src/app/api/notion/member/[id]/route.ts, src/app/api/notion/team/route.ts, src/app/api/notion/update/route.ts, src/app/api/notion/sync/route.ts, src/app/api/notion/onboarding/route.ts (a pasta notion fica so com os 3 redirects). As funcoes de src/lib/data.ts que essas rotas usavam (getClientes, getTeam, getOnboarding, getClientesDoEmployee, getReunioesByPessoa) FICAM (fora da allowlist; limpeza e outro ticket). (4) Consumidores: src/components/gestor-capacidade.tsx linha 17 -> '/api/clientes/filtrados'; src/app/dashboard/clientes/[id]/page.tsx linhas 722 e 732 -> `/api/clientes/${id}/ficha` e `/api/clientes/${nid}/ficha`; src/app/dashboard/onboarding/[id]/page.tsx linha 53 -> `/api/onboarding/legado/${id}`. (5) RECALCULE (comentario 'Ticket 1059: ...' acima de cada mudanca): test/getsession-notion-clientes.test.ts: imports de clientes-filtrados e clientes/[id] apontam para os caminhos novos; os casos das rotas removidas (clientes lista, gestores, member/[id]) SAEM junto com seus imports (autorizado por este ticket: a rota deixou de existir), e o comentario de cabecalho lista as rotas que sairam; nenhum outro caso mexido; test/getsession-notion-onboarding-team.test.ts: o caso de onboarding/[id] aponta para o caminho novo; os casos de onboarding (lista) e notion/team SAEM com seus imports (mesma autorizacao); os casos de team/employees e avaliacoes-internas ficam; test/ficha-por-uuid.test.ts: import e URL do caso apontam para /api/clientes/[id]/ficha; test/quem-cuida.test.ts linha 174: a assercao passa a provar que a rota do membro nao existe mais (existsSync false) e que a carteira do employee vive em src/app/api/equipe/carteira/route.ts (contem 'cuidaDoCliente('); linha 179: o caminho vira src/app/api/clientes/filtrados/route.ts com a mesma assercao 'gestor_nome: nomeDeQuemCuida('; test/c0-guard.test.ts linha 306: a entrada da lista sancionada troca so o caminho (join('src', 'app', 'api', 'clientes', 'filtrados', 'route.ts')) e a rationale deixa de dizer 'sync interno com Notion' ('lista filtrada de clientes para a capacidade da equipe inclui entrada_valor_mensal'); NENHUMA outra linha do c0-guard muda. (6) NOVO test/notion-rotas-renomeadas.test.ts: as 3 rotas novas existem e exportam GET; os 3 redirects respondem 308 para o caminho novo preservando [id] e query; os 7 arquivos removidos nao existem; nenhum arquivo de src fora de src/app/api/notion contem '/api/notion/' (grep na fonte com readdirSync recursivo); os 3 consumidores contem as URLs novas. PROIBIDO remover assercao fora dos casos das rotas removidas, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: getSession server-only; sem .json() novo em src; mensagens sem nome de tabela; sem travessao (U+2014); nenhuma escrita em banco; rota nova que exige papel usaria exigirPapel (as movidas sao existentes e mantem getSession, como a regra permite). FORA DE ESCOPO: mudar handlers, lib/data.ts, a pagina legada de onboarding alem da URL, middleware (nenhuma dessas rotas esta em CRON_PATHS), migration.",
  "cria_novo": [
    "src/app/api/clientes/filtrados/route.ts",
    "src/app/api/clientes/[id]/ficha/route.ts",
    "src/app/api/onboarding/legado/[id]/route.ts",
    "test/notion-rotas-renomeadas.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/clientes/filtrados/route.ts",
    "src/app/api/clientes/[id]/ficha/route.ts",
    "src/app/api/onboarding/legado/[id]/route.ts",
    "src/app/api/notion/clientes-filtrados/route.ts",
    "src/app/api/notion/clientes/[id]/route.ts",
    "src/app/api/notion/onboarding/[id]/route.ts",
    "src/app/api/notion/clientes/route.ts",
    "src/app/api/notion/gestores/route.ts",
    "src/app/api/notion/member/[id]/route.ts",
    "src/app/api/notion/team/route.ts",
    "src/app/api/notion/update/route.ts",
    "src/app/api/notion/sync/route.ts",
    "src/app/api/notion/onboarding/route.ts",
    "src/components/gestor-capacidade.tsx",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "src/app/dashboard/onboarding/[id]/page.tsx",
    "test/getsession-notion-clientes.test.ts",
    "test/getsession-notion-onboarding-team.test.ts",
    "test/ficha-por-uuid.test.ts",
    "test/quem-cuida.test.ts",
    "test/c0-guard.test.ts",
    "test/notion-rotas-renomeadas.test.ts"
  ],
  "dependencias": [
    "1054",
    "1041c",
    "1055",
    "1055b",
    "926",
    "1087"
  ],
  "prioridade": 40,
  "excecao_tamanho": {
    "motivo": "renomear 3 rotas (3 novas + 3 redirects) e remover 7 sem consumidor toca os 10 arquivos da pasta notion de uma vez (rename parcial deixaria a pasta meio viva), mais 3 consumidores de URL e os 5 testes que importam as rotas por caminho"
  },
  "recon_esperado": [
    {
      "descricao": "as 3 rotas novas e o teste novo ainda nao existem",
      "cmd": "n=0; for f in src/app/api/clientes/filtrados/route.ts 'src/app/api/clientes/[id]/ficha/route.ts' 'src/app/api/onboarding/legado/[id]/route.ts' test/notion-rotas-renomeadas.test.ts; do test -e \"$f\" && n=$((n+1)); done; [ \"$n\" = 0 ] && echo AUSENTES || echo ST_$n",
      "espera": "AUSENTES"
    },
    {
      "descricao": "src/app/api/notion tem 10 rotas e 3 ou 4 arquivos de src citam /api/notion/ fora da pasta (4 hoje; 3 depois do 1041c tirar a pagina de onboarding)",
      "cmd": "n=$(find src/app/api/notion -name route.ts | wc -l | tr -d ' '); c=$(grep -rln 'api/notion/' src --include=*.ts --include=*.tsx | grep -v '^src/app/api/notion' | grep -v 'src/app/api/clientes/situacao/route.ts' | wc -l | tr -d ' '); [ \"$n\" = 10 ] && [ \"$c\" -ge 3 ] && [ \"$c\" -le 4 ] && echo DEZ_ROTAS_CONSUMIDORES_LEGADOS || echo ST_${n}_${c}",
      "espera": "DEZ_ROTAS_CONSUMIDORES_LEGADOS"
    },
    {
      "descricao": "os testes ainda importam as rotas antigas e o c0-guard sanciona o caminho antigo",
      "cmd": "a=$(grep -c '@/app/api/notion/' test/getsession-notion-clientes.test.ts); b=$(grep -c '@/app/api/notion/' test/getsession-notion-onboarding-team.test.ts); c=$(grep -c \"join('src', 'app', 'api', 'notion', 'clientes-filtrados', 'route.ts')\" test/c0-guard.test.ts); d=$(grep -c 'src/app/api/notion/member/\\[id\\]/route.ts' test/quem-cuida.test.ts); [ \"$a\" = 5 ] && [ \"$b\" = 3 ] && [ \"$c\" = 1 ] && [ \"$d\" = 1 ] && echo TESTES_ANTIGOS || echo ST_${a}_${b}_${c}_${d}",
      "espera": "TESTES_ANTIGOS"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/clientes/filtrados/route.ts' 'src/app/api/clientes/[id]/ficha/route.ts' 'src/app/api/onboarding/legado/[id]/route.ts' 'src/app/api/notion/clientes-filtrados/route.ts' 'src/app/api/notion/clientes/[id]/route.ts' 'src/app/api/notion/onboarding/[id]/route.ts' 'src/app/api/notion/clientes/route.ts' 'src/app/api/notion/gestores/route.ts' 'src/app/api/notion/member/[id]/route.ts' 'src/app/api/notion/team/route.ts' 'src/app/api/notion/update/route.ts' 'src/app/api/notion/sync/route.ts' 'src/app/api/notion/onboarding/route.ts' 'src/components/gestor-capacidade.tsx' 'src/app/dashboard/clientes/[id]/page.tsx' 'src/app/dashboard/onboarding/[id]/page.tsx' 'test/getsession-notion-clientes.test.ts' 'test/getsession-notion-onboarding-team.test.ts' 'test/ficha-por-uuid.test.ts' 'test/quem-cuida.test.ts' 'test/c0-guard.test.ts' 'test/notion-rotas-renomeadas.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
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
      "descricao": "guardas globais e os testes das rotas e consumidores seguem verdes (inclui os 5 recalculados)",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ui-guard.test.ts test/rotas-orfas.test.ts test/rotas-fantasma-ficha.test.ts test/getsession-notion-clientes.test.ts test/getsession-notion-onboarding-team.test.ts test/ficha-por-uuid.test.ts test/quem-cuida.test.ts test/ficha-sem-reescrita-notion.test.ts test/abas-montadas.test.ts test/aba-na-url.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "3 rotas novas existem, 3 antigas sao redirect 308, 7 removidas, e nenhum consumidor fora da pasta notion cita /api/notion/",
      "cmd": "n=0; for f in src/app/api/clientes/filtrados/route.ts 'src/app/api/clientes/[id]/ficha/route.ts' 'src/app/api/onboarding/legado/[id]/route.ts'; do test -e \"$f\" && n=$((n+1)); done; r=$(grep -l 'redirect(' src/app/api/notion/clientes-filtrados/route.ts 'src/app/api/notion/clientes/[id]/route.ts' 'src/app/api/notion/onboarding/[id]/route.ts' 2>/dev/null | wc -l | tr -d ' '); e=0; for f in src/app/api/notion/clientes/route.ts src/app/api/notion/gestores/route.ts 'src/app/api/notion/member/[id]/route.ts' src/app/api/notion/team/route.ts src/app/api/notion/update/route.ts src/app/api/notion/sync/route.ts src/app/api/notion/onboarding/route.ts; do test -e \"$f\" && e=$((e+1)); done; c=$(grep -rln 'api/notion/' src --include=*.ts --include=*.tsx | grep -v '^src/app/api/notion' | grep -v 'src/app/api/clientes/situacao/route.ts' | wc -l | tr -d ' '); [ \"$n\" = 3 ] && [ \"$r\" = 3 ] && [ \"$e\" = 0 ] && [ \"$c\" = 0 ] && echo RENOMEADAS || echo ST_${n}_${r}_${e}_${c}",
      "espera": "RENOMEADAS",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento: c0-guard so trocou o caminho de 1 entrada sancionada (1 linha removida); os 4 outros testes recalculados sem skip/only e sem toBeDefined novo; quem-cuida continua exigindo nomeDeQuemCuida na rota renomeada",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=RECALCULADO_1059; f=test/c0-guard.test.ts; rem=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^-[^-]'); novo=$(grep -c \"join('src', 'app', 'api', 'clientes', 'filtrados', 'route.ts')\" \"$f\"); velho=$(grep -c \"join('src', 'app', 'api', 'notion', 'clientes-filtrados', 'route.ts')\" \"$f\"); [ \"$rem\" -le 2 ] && [ \"$novo\" = 1 ] && [ \"$velho\" = 0 ] || r=C0_${rem}_${novo}_${velho}; for t in test/getsession-notion-clientes.test.ts test/getsession-notion-onboarding-team.test.ts test/ficha-por-uuid.test.ts test/quem-cuida.test.ts; do sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$t\"); d0=$(git show \"$b:$t\" | grep -c 'toBeDefined()'); d1=$(grep -c 'toBeDefined()' \"$t\"); [ \"$sk\" = 0 ] && [ \"$d1\" -le \"$d0\" ] || r=AFROUXOU_$t; done; q=$(grep -c 'src/app/api/clientes/filtrados/route.ts' test/quem-cuida.test.ts); g=$(grep -c 'gestor_nome: nomeDeQuemCuida(' test/quem-cuida.test.ts); [ \"$q\" -ge 1 ] && [ \"$g\" -ge 1 ] || r=QUEM_CUIDA_${q}_${g}; echo $r",
      "espera": "RECALCULADO_1059",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/notion-rotas-renomeadas.test.ts)",
      "cmd": "test -f test/notion-rotas-renomeadas.test.ts && npx vitest run test/notion-rotas-renomeadas.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: as 3 rotas com consumidor mudam so de caminho (handler identico) e ganham redirect 308 no caminho antigo preservando [id] e query; as 7 sem consumidor sao removidas com prova por grep; os 3 consumidores apontam para as URLs novas; os testes sao recalculados sem perder caso de rota que continua existindo e o c0-guard so troca o caminho de uma entrada. REPROVE se: handler alterado; redirect sem preservar [id] ou query; rota removida com consumidor em src; c0-guard com qualquer mudanca alem do caminho e da rationale daquela entrada; caso de rota existente removido; lib/data.ts mexido; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/getsession-notion-clientes.test.ts",
      "motivo": "entra na allowlist: importa 5 rotas notion; recalculado (2 renomeadas, 3 removidas com seus casos; criterio anti-afrouxamento)"
    },
    {
      "teste": "test/getsession-notion-onboarding-team.test.ts",
      "motivo": "entra na allowlist: importa 3 rotas notion; recalculado (1 renomeada, 2 removidas com seus casos; criterio anti-afrouxamento)"
    },
    {
      "teste": "test/ficha-por-uuid.test.ts",
      "motivo": "entra na allowlist: importa a rota da ficha por id; recalculado para o caminho novo (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "entra na allowlist: le a fonte de member/[id] e clientes-filtrados por caminho; recalculado (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "entra na allowlist: a lista de rotas sancionadas a ler valor_mensal cita clientes-filtrados por caminho; so o caminho muda, a regra C0 nao (criterio anti-afrouxamento com 1 linha removida)"
    },
    {
      "teste": "test/rotas-orfas.test.ts",
      "motivo": "olha paginas de src/app/dashboard, nao rotas de API; a pagina legada de onboarding continua na LEGACY_DINAMICA"
    },
    {
      "teste": "test/rotas-fantasma-ficha.test.ts",
      "motivo": "confere que toda rota chamada pela ficha existe: a URL nova /api/clientes/[id]/ficha existe no mesmo commit; se o teste resolver caminhos dinamicos de outro jeito, PARE e descreva"
    },
    {
      "teste": "test/a11y/app-dashboard-clientes-id-page.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aba-na-url.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aba-resultados-fechamentos.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/acao-unica-ficha-mutacoes.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ativo-pela-receita.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/barra-visao.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/bloco-tarefas-visao.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/campanhas-aba-criativos.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/campanhas-aceite-mockup.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cartao-copy-sem-travessao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cartao-topo-setup-e-closer.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-cadastro-operacao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-conexoes-entregaveis.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-conexoes.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-crm-sem-contradicao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-quadro-contrato-aberto.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-resultados-escritorio.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/crm-escritorio-rolagem.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-objeto-nao-quebra.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-aba-comercial.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-abas-orfas.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-nav-colapsavel.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-nps-do-mes.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-nps.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-obs-contrato.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-relacao-estados.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-relacao-leitura.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-reunioes-resumos-cliente-id.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-rotulo-moldura.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-sem-reescrita-notion.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-subsecoes-sequencia.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ghl-um-lugar-so.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/header-cliente-consolidado.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/kpis-visao-buraco-coleta.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/leitura-relacao-tela.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/link-setup-notion-id.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/lote-b3-1-periodo.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/lote-d-colunas.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ltv-na-conta.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/metricas-filtros-periodo.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/metricas-invalidacao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/observacoes-notas-fora.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/orquestrador-enforcement.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/otimizacoes-tela.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/painel-em-campanhas.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/painel-estado-explicito.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/perf-cliente-438.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/rbac-visual.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/registrar-verificacao-rotulo.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/registro-unico-relacao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-aceite.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-config-para-conta.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-responder-tela.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-sem-escrita-reuniao.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resumo-grupo-wpp-tela.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resumo-score-fonte-unica.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/reuniao-venda-ficha.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/saude-chip-ficha.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/saude-motivo-sem-base.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/score-saude-fonte-unica.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/timeline-relacao.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-aceite-estrutura.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-aceite-mockup.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-copy-ausencia.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-dado-parado-e-link.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-geral-ordem.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-limpeza-final.test.tsx",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-sem-cockpit-antigo.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/whatsapp-grupos-ui.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/a11y/app-dashboard-onboarding-id-page.test.ts",
      "motivo": "importa (direta ou transitivamente) ou cita um arquivo do ticket (rota renomeada, consumidor com a URL nova ou pagina da ficha); o ticket so muda caminhos de rota e URLs de fetch, sem mudar handlers, contratos de resposta nem tela; se quebrar, PARE e descreva"
    }
  ],
  "status": "bloqueado",
  "notas_status": "reprovado apos 2 retries: criterio[5] mecânico: esperado 'RENOMEADAS', obteve 'ST_0_0_7_3'"
}
```
