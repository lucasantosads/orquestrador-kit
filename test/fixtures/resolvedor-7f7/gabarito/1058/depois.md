# Ticket 1058: crons de score, risco, temperatura e alertas de campanha leem o universo e o legado pela lib

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Frente "saída do Notion", leva B (leitores), área performance / crons, primeira fatia. Os quatro crons de `src/app/api/clientes/*` já gravam na casa nova (1051, 1052) mas ainda leem o universo pelo espelho (`.in("entrada_id", ...)`) com as colunas legadas `meta_campaign_id`, `meta_leads_mes`, nome e nicho. Passam a ler pela lib (1050b, `lerEspelhoPorEntrada`), com o nicho de contexto da IA vindo do catálogo (`ops_cliente_nichos`) para quem tem `cliente_id`. Nenhum dos 4 cita `clientes_notion_mirror` ao final.

```
calcular-score/route.ts:207-212        select(notion_id, cliente_id, cliente, status, meta_campaign_id, meta_leads_mes).in(entrada_id)
analise-risco/route.ts:107-112         select(notion_id, cliente_id, cliente, nicho, meta_campaign_id, meta_leads_mes).in(entrada_id)
temperatura-comercial/route.ts:109-112 select(notion_id, cliente_id, cliente, status).in(entrada_id)
alertas-campanha/route.ts:106-110      select(notion_id, cliente, cliente_id, meta_campaign_id).in(entrada_id).not(meta_campaign_id is null)
```

Os testes dos crons mockam o espelho por tabela com chains que encadeiam `select/in` (crons-get-ia:40-60, temperatura-comercial-cron:46-58) ou usam o banco em memória (cron-get-alertas-consistencia:13); a lib usa o mesmo client e os mesmos métodos.

Os testes `test/negocio-lib.test.ts` (1051) e `test/negocio-temperatura.test.ts` (1052) leem a fonte destes crons; existirão na base quando este ticket rodar e o executor deve incluí-los na rodada de vitest junto com os guardas.

**Conserto 15/10.** Reprovou 2x no gate vitest com 10.712 verdes e 2 vermelhos (`negocio-temperatura` e `quem-cuida`). Causa: `lerEspelhoPorEntrada` descarta `entrada_id` que não é UUID e indexa por `entrada_id`; as duas fixtures usam ids falsos (`entrada-1`, `r1..r3`) e o espelho sem `entrada_id`, então o cron vê zero clientes. O código do executor estava certo. Os dois testes entram na allowlist só para a fixture virar UUID, com anti-afrouxamento; teto sobe de 480 para 520.

## Campos de máquina

```json
{
  "id": "1058",
  "slug": "negocio-leitores-crons-score-risco-temperatura-alertas",
  "lane": "dados",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 520 linhas (~25 em src/app/api/clientes/calcular-score/route.ts, ~35 em src/app/api/clientes/analise-risco/route.ts, ~20 em src/app/api/clientes/temperatura-comercial/route.ts, ~25 em src/app/api/clientes/alertas-campanha/route.ts, ~200 em test/leitores-crons-casa-nova.test.ts NOVO, ~40 de recalculo em test/crons-get-ia.test.ts e test/temperatura-comercial-cron.test.ts se o mock precisar). Se passar do teto, pare e reporte. CONTEXTO (frente saida do Notion, leva B): libs: src/lib/clientes/espelho-legado.ts (1050b: lerEspelhoPorEntrada(db, entradaIds, colunas) -> Map<entrada_id, LinhaEspelho> com notion_id, cliente_id, entrada_id e as colunas pedidas; erro lanca 'espelho: ...'; lista vazia nao consulta), src/lib/clientes/nichos-catalogo.ts (1054: lerNomesNichosPorCliente(db, ids), nichoTexto(nomes, legado)). Os 4 crons ja gravam pela lib negocio (1051/1052) e tratam linha sem cliente_id como 'sem cadastro no OS'. Depende de 1050b, 1054 e 1057. PASSO 1: leia as 2 libs, os 4 crons nas linhas citadas na prosa, test/crons-get-ia.test.ts linhas 40-70, test/temperatura-comercial-cron.test.ts linhas 40-90 e test/cron-get-alertas-consistencia.test.ts linhas 1-40. FAZER: (1) src/app/api/clientes/calcular-score/route.ts: o select do espelho vira `const porEntrada = await lerEspelhoPorEntrada(supabase, entradasAtivas.map((e) => e.id), ['cliente', 'status', 'meta_campaign_id', 'meta_leads_mes'])` dentro de try (erro -> 500 { error: 'Não foi possível ler os clientes do espelho' }, acento no codigo, nunca lista vazia); `const lista = Array.from(porEntrada.values())` com o mesmo formato de linha (notion_id, cliente_id, cliente, status, meta_campaign_id, meta_leads_mes); o resto do cron fica igual; o comentario de cabecalho cita a lib. (2) src/app/api/clientes/analise-risco/route.ts: idem com colunas ['cliente', 'nicho', 'meta_campaign_id', 'meta_leads_mes']; o nicho do contexto da IA passa a ser `nichoTexto(nichos.get(c.cliente_id), c.nicho)` com `const nichos = await lerNomesNichosPorCliente(supabase, ids com cadastro)` (erro -> 500); o resto igual. (3) src/app/api/clientes/temperatura-comercial/route.ts: idem com colunas ['cliente', 'status']; o resto igual. (4) src/app/api/clientes/alertas-campanha/route.ts: idem com colunas ['cliente', 'meta_campaign_id'] e o filtro `.not('meta_campaign_id', 'is', null)` vira filtro em codigo (`.filter((c) => c.meta_campaign_id)`); erro -> o mesmo 500 { error } de hoje; o resto igual. (5) test/crons-get-ia.test.ts e test/temperatura-comercial-cron.test.ts: RECALCULE so se o chain falso nao encadear select/in (hoje encadeia); se mudar, comentario 'Ticket 1058: ...' e NENHUM it removido. (6) NOVO test/leitores-crons-casa-nova.test.ts (mock por tabela registrando chamadas; vi.mock de @/lib/clientes/universo-cron, @/lib/ia/provider e @/lib/ia/lente-comercial como em test/crons-get-ia.test.ts; uuids RFC-4122): cada cron consulta o espelho so via from('clientes_notion_mirror') com .in('entrada_id', ids) (a lib) e nunca com .not; alertas-campanha ignora linha sem meta_campaign_id em codigo; analise-risco manda para a IA o nicho do catalogo quando ha vinculo e o legado sem; erro do espelho vira 500 nos 4; its estaticos: zero 'clientes_notion_mirror' nos 4 arquivos. PROIBIDO remover assercao, trocar matcher por toBeDefined/toBeTruthy, usar .skip/.only/.todo. Regras do repo: sem .json() novo em src; mensagens humanas sem nome de tabela; sem travessao (U+2014) em string nova; nenhuma escrita nova em banco; falha de leitura vira 500, nunca lista vazia; Set e Map so com Array.from. (7) CONSERTO 15/10 (2 reprovacoes no gate vitest, causa medida): lerEspelhoPorEntrada descarta entrada_id que nao e UUID (uuidsUnicos) e indexa por entrada_id, entao fixture com id de entrada falso volta Map vazio e o cron processa zero clientes. test/negocio-temperatura.test.ts (clientes_receita id 'entrada-1' e espelho SEM entrada_id) e test/quem-cuida.test.ts (entradas 'r1','r2','r3') quebram por isso. RECALCULE SO A FIXTURE nos dois: cada id de entrada vira UUID RFC-4122 fixo (ex.: 00000000-0000-4000-8000-0000000000e1) e cada linha do espelho ganha o entrada_id da sua entrada; a lib devolve UMA linha por entrada, entao em negocio-temperatura a receita falsa passa a ter uma entrada por cliente do espelho (2 entradas, uma para ID_RECENTE e outra para ID_ANTIGO), mantendo os mesmos 2 clientes; comentario 'Ticket 1058: entrada_id UUID porque a lib descarta id nao-UUID'; NENHUM expect/it removido ou alterado, nenhum valor esperado muda. NAO mexa na lib espelho-legado. FORA DE ESCOPO: rotas de performance, cockpit e a tela legada (1058b), vercel.json, middleware, migration.",
  "cria_novo": [
    "test/leitores-crons-casa-nova.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/api/clientes/calcular-score/route.ts",
    "src/app/api/clientes/analise-risco/route.ts",
    "src/app/api/clientes/temperatura-comercial/route.ts",
    "src/app/api/clientes/alertas-campanha/route.ts",
    "test/crons-get-ia.test.ts",
    "test/temperatura-comercial-cron.test.ts",
    "test/leitores-crons-casa-nova.test.ts",
    "test/negocio-temperatura.test.ts",
    "test/quem-cuida.test.ts"
  ],
  "dependencias": [
    "1050b",
    "1054",
    "1057",
    "1051",
    "1052"
  ],
  "prioridade": 39,
  "recon_esperado": [
    {
      "descricao": "test/leitores-crons-casa-nova.test.ts ainda nao existe",
      "cmd": "test -e 'test/leitores-crons-casa-nova.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "os 4 crons ainda leem o universo pelo espelho com .in(entrada_id)",
      "cmd": "n=$(grep -c '.in(\"entrada_id\", entradasAtivas.map((e) => e.id))' src/app/api/clientes/calcular-score/route.ts src/app/api/clientes/analise-risco/route.ts src/app/api/clientes/temperatura-comercial/route.ts src/app/api/clientes/alertas-campanha/route.ts | awk -F: '{s+=$NF} END {print s+0}'); m=$(grep -c 'lerEspelhoPorEntrada' src/app/api/clientes/calcular-score/route.ts src/app/api/clientes/analise-risco/route.ts src/app/api/clientes/temperatura-comercial/route.ts src/app/api/clientes/alertas-campanha/route.ts | awk -F: '{s+=$NF} END {print s+0}'); [ \"$n\" = 4 ] && [ \"$m\" = 0 ] && echo UNIVERSO_NO_ESPELHO || echo ST_${n}_${m}",
      "espera": "UNIVERSO_NO_ESPELHO"
    },
    {
      "descricao": "alertas-campanha ainda filtra meta_campaign_id no banco com .not",
      "cmd": "n=$(grep -c '.not(\"meta_campaign_id\", \"is\", null)' src/app/api/clientes/alertas-campanha/route.ts); [ \"$n\" = 1 ] && echo NOT_NO_BANCO || echo ST_$n",
      "espera": "NOT_NO_BANCO"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/api/clientes/calcular-score/route.ts' 'src/app/api/clientes/analise-risco/route.ts' 'src/app/api/clientes/temperatura-comercial/route.ts' 'src/app/api/clientes/alertas-campanha/route.ts' 'test/crons-get-ia.test.ts' 'test/temperatura-comercial-cron.test.ts' 'test/leitores-crons-casa-nova.test.ts' 'test/negocio-temperatura.test.ts' 'test/quem-cuida.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 520 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 520 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes diretos dos 4 crons seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/cron-registro-clientes.test.ts test/crons-get-sem-efeito.test.ts test/crons-meta-consolidacao.test.ts test/erro-string-crons-score-campanha.test.ts test/token-meta-sem-env.test.ts test/sai-resolver-chave-api-b.test.ts test/sai-resolver-chave-api-d.test.ts test/cron-get-alertas-consistencia.test.ts test/quem-cuida.test.ts test/universo-cron.test.ts test/crons-get-ia.test.ts test/temperatura-comercial-cron.test.ts test/negocio-temperatura.test.ts test/negocio-lib.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "os 4 crons nao citam mais o espelho, leem o universo pela lib e o risco usa o catalogo de nichos",
      "cmd": "a=$(grep -c 'clientes_notion_mirror' src/app/api/clientes/calcular-score/route.ts src/app/api/clientes/analise-risco/route.ts src/app/api/clientes/temperatura-comercial/route.ts src/app/api/clientes/alertas-campanha/route.ts | awk -F: '{s+=$NF} END {print s+0}'); b=$(grep -l 'lerEspelhoPorEntrada(' src/app/api/clientes/calcular-score/route.ts src/app/api/clientes/analise-risco/route.ts src/app/api/clientes/temperatura-comercial/route.ts src/app/api/clientes/alertas-campanha/route.ts | wc -l | tr -d ' '); c=$(grep -c 'lerNomesNichosPorCliente(' src/app/api/clientes/analise-risco/route.ts); d=$(grep -c '.not(\"meta_campaign_id\", \"is\", null)' src/app/api/clientes/alertas-campanha/route.ts); [ \"$a\" = 0 ] && [ \"$b\" = 4 ] && [ \"$c\" -ge 1 ] && [ \"$d\" = 0 ] && echo CRONS_PELA_LIB || echo ST_${a}_${b}_${c}_${d}",
      "espera": "CRONS_PELA_LIB",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento nos 4 testes recalculaveis (crons-get-ia e temperatura-comercial-cron podem nao mudar; negocio-temperatura e quem-cuida so fixture): nenhum expect(/it( a menos, nenhum skip/only/todo; e o teste novo prova o universo pela lib",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=NAO_AFROUXOU_1058; for f in test/crons-get-ia.test.ts test/temperatura-comercial-cron.test.ts test/negocio-temperatura.test.ts test/quem-cuida.test.ts; do a=$(git show \"$b:$f\" | grep -cF 'expect('); n=$(grep -cF 'expect(' \"$f\"); ia=$(git show \"$b:$f\" | grep -cF 'it('); ni=$(grep -cF 'it(' \"$f\"); sk=$(grep -cE '\\.(skip|only|todo)\\(' \"$f\"); [ \"$n\" -ge \"$a\" ] && [ \"$ni\" -ge \"$ia\" ] && [ \"$sk\" = 0 ] || r=ST_${f}_${a}_${n}_${ia}_${ni}_${sk}; done; t=$(test -f test/leitores-crons-casa-nova.test.ts && grep -c 'entrada_id' test/leitores-crons-casa-nova.test.ts || echo 0); [ \"$t\" -ge 1 ] || r=SEM_PROVA_UNIVERSO; echo $r",
      "espera": "NAO_AFROUXOU_1058",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/leitores-crons-casa-nova.test.ts)",
      "cmd": "test -f test/leitores-crons-casa-nova.test.ts && npx vitest run test/leitores-crons-casa-nova.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: os 4 crons leem o universo (linhas do espelho por entrada da receita ativa) e as colunas legadas so pela lib, com erro de leitura virando 500; o risco manda o nicho do catalogo para a IA; alertas-campanha filtra meta_campaign_id em codigo; gravacoes e respostas nao mudam. REPROVE se: resta .from('clientes_notion_mirror') em arquivo da allowlist; erro de leitura vira lista vazia; universo mudou de regra (continua entradas ativas de listarEntradasAtivas); escrita em banco mexida; assercao removida ou afrouxada; skip/only.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/negocio-temperatura.test.ts",
      "motivo": "entra na allowlist (conserto 15/10): fixture com entrada 'entrada-1' e espelho sem entrada_id volta Map vazio pela lib; recalcula so a fixture para UUID, assercoes intactas (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/crons-get-ia.test.ts",
      "motivo": "entra na allowlist: chain falso do espelho encadeia select/in (linhas 40-60), que e o que a lib chama; recalculado so se precisar (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/temperatura-comercial-cron.test.ts",
      "motivo": "entra na allowlist: chain falso encadeia select/in (linhas 46-58); recalculado so se precisar (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/cron-get-alertas-consistencia.test.ts",
      "motivo": "banco em memoria; a lib le a mesma memoria por entrada_id e o filtro de meta_campaign_id passa a ser em codigo com o mesmo resultado"
    },
    {
      "teste": "test/quem-cuida.test.ts",
      "motivo": "entra na allowlist (conserto 15/10): banco em memoria com entradas 'r1'..'r3', que a lib descarta por nao serem UUID; recalcula so a fixture para UUID, assercoes intactas (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: leads_crm e clientes_receita continuam so SELECT nos crons"
    },
    {
      "teste": "test/cron-registro-clientes.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/crons-get-sem-efeito.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-string-crons-score-campanha.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/token-meta-sem-env.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sai-resolver-chave-api-b.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/sai-resolver-chave-api-d.test.ts",
      "motivo": "importa (direta ou transitivamente) um dos 4 crons; o ticket troca a leitura do espelho (universo por entrada_id e colunas legadas) pela lib espelho-legado (mesma tabela, mesmo client, mesmo filtro por entrada) e o nicho de contexto pelo catalogo; respostas e registros preservados; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
