# Ticket 318c: Ranking de criativos dentro do drill da tese

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Tela do 318b: no drill da tese (aba Nichos e teses), abaixo do ranking dos clientes, o ranking de
criativos daquela tese, com o mesmo tipo de funil do filtro da aba. Sem amostra e sem base em
uma linha de texto.

Referência visual: `docs/roadmap/mockups/performance-tese/README.md`.

## Campos de máquina

```json
{
  "id": "318c",
  "slug": "nichos-teses-ranking-criativos-tela",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 400 linhas (~200 em ranking-criativos.tsx, ~15 em drill-tese.tsx, ~170 no teste NOVO). Se passar do teto, pare e reporte. DECISOES DO LUCAS (09/10/2026), valem para a frente inteira: (a) tese vem da campanha (perf_campanha_tese ativo=true); cliente com mais de uma tese entra em cada tese e conta 1 vez no total do nicho. (b) Metricas-norte: %MQL, CPMQL e CAC. Valor de linha = MEDIANA entre os clientes, com faixa (minimo a maximo) embaixo; tese ou nicho com menos de 3 clientes nao ranqueia e mostra 'sem amostra · N clientes'. (c) Custo por resultado segue o objetivo da campanha (src/lib/perf/objetivo-campanha.ts); engajamento entra no Investido e fica fora do custo. Tipo de funil: Todos, Formulario, Mensagem, LP, Webinar; em Todos o custo aparece por tipo ('Form R$ 44 / Msg R$ 2,30'), nunca somado. (d) Score do ranking: CAC 50%, CPMQL 30%, %MQL 20% (posicao normalizada); sem venda registrada a tese entra so com CPMQL e %MQL, renormalizados, e fica marcada 'parcial'. (e) Periodo: o seletor padrao do OS (usePeriodoUrl), um so para a aba. (f) Aba Avaliacao: so superadmin e Head de Trafego, pelo RBAC existente, nunca lista de e-mails. (g) Desvio: CPMQL 50% ou mais acima da mediana da tese por 2 semanas seguidas, numeros em constante exportada unica. (h) Sem dado = 's/ dado' em cinza com o motivo, nunca zero; todo numero com o denominador na mesma linha. (i) Regra 19: nenhum R$ de mensalidade, MRR ou LTV da agencia; dinheiro DO CLIENTE (contratos, faturamento gerado, ROAS, investimento em anuncio) e permitido. (j) Zona C0 intocavel; DDL e cron novo so com token humano; nunca editar vercel.json. TELA: leia docs/roadmap/mockups/performance-tese/README.md (ordem dos blocos e data-testid), DESIGN.md secao 6 e src/components/estados/sem-dado.tsx (SemDado, ValorOuSemDado) antes de escrever; cor e sinal: azul acao, verde saudavel, vermelho risco; sem cartao dentro de cartao, sem badge soup, sem gradiente; vazio vira uma linha de texto, nunca cartao vazio. DEPENDE DO 318b (GET /api/perf/nicho-tese/criativos?inicio&fim&tese&tipo) e DO 929 (drill-tese.tsx). PASSO 1: leia docs/roadmap/mockups/performance-tese/README.md (drill da tese), src/app/dashboard/performance/nichos-teses/drill-tese.tsx, src/lib/trafego/ranking-criativos.ts e src/app/api/perf/nicho-tese/criativos/route.ts. FAZER: (1) NOVO nichos-teses/ranking-criativos.tsx: export function RankingCriativos({teseId, inicio, fim, tipo}) com fetchJson da rota (falha => ErrorState com retry); titulo 'Criativos da tese'; tabela: posicao, anuncio (ad_id curto), tipo, investido, custo por resultado, %MQL, CPMQL, CAC, e o degrau que decidiu a posicao em texto pequeno ('decidido por CPMQL'); numeros em font-mono; sem_amostra_criativos numa linha de texto embaixo ('N criativos sem amostra em nenhum degrau'); tese sem amostra ou sem base: UMA linha de texto com o motivo da rota. Sem nome de tabela ou coluna na tela. (2) drill-tese.tsx: monte <RankingCriativos /> ABAIXO do ranking dos clientes, recebendo tese, periodo e tipo que o drill ja tem (acrescente as props que faltarem, com o mesmo nome em quem chama, so no drill). (3) NOVO test/performance-ranking-criativos-tela.test.ts por readFileSync e funcoes puras se houver: RankingCriativos le /api/perf/nicho-tese/criativos; o drill monta RankingCriativos depois do ranking dos clientes (indice no texto); textos 'Criativos da tese' e 'sem amostra'. FORA DE ESCOPO: lib e rota (318b), a aba fora do drill. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; vercel.json intocado; chave oficial do cliente e cliente_id (uuid); churn_log: nunca leia mensalidade nem ltv_total; falha de leitura nunca vira zero, lista vazia ou verde: nada de `?? []`, `|| []` ou `|| 0` numa leitura, o erro sobe com o motivo (500 na rota, ErrorState na tela); dado ausente aparece como 's/ dado' ou 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup, esbuild transformSync no molde de test/bloco-vazio-linha.test.ts, ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira; var() nao resolve em atributo de apresentacao SVG. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/travessao-mudo.test.ts, test/c0-guard.test.ts, test/regra19.test.ts, test/ui-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx",
    "test/performance-ranking-criativos-tela.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx",
    "src/app/dashboard/performance/nichos-teses/drill-tese.tsx",
    "test/performance-ranking-criativos-tela.test.ts"
  ],
  "dependencias": [
    "318b",
    "929"
  ],
  "prioridade": 55,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx ainda nao existe",
      "cmd": "test -e src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
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
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "vercel.json intocado",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD staging-auto)\" -- vercel.json | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo VERCEL_INTOCADO || echo VERCEL_EDITADO",
      "espera": "VERCEL_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx src/app/dashboard/performance/nichos-teses/drill-tese.tsx | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx src/app/dashboard/performance/nichos-teses/drill-tese.tsx test/performance-ranking-criativos-tela.test.ts | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 400 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 400 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "zero escrita em banco nas linhas adicionadas dos arquivos de src do ticket",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx src/app/dashboard/performance/nichos-teses/drill-tese.tsx | grep -E '^[+][^+]' | grep -cE '[.](insert|update|upsert|delete|rpc)[(]'); [ \"$n\" = 0 ] && echo SEM_ESCRITA || echo ESCRITA_$n",
      "espera": "SEM_ESCRITA",
      "tipo": "guarda"
    },
    {
      "descricao": "componente le a rota do 318b",
      "cmd": "n=$(grep -cF /api/perf/nicho-tese/criativos src/app/dashboard/performance/nichos-teses/ranking-criativos.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo ROTA_OK || echo FALTA_${n:-0}",
      "espera": "ROTA_OK"
    },
    {
      "descricao": "drill monta o ranking de criativos",
      "cmd": "n=$(grep -cF '<RankingCriativos' src/app/dashboard/performance/nichos-teses/drill-tese.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo MONTADO_OK || echo FALTA_${n:-0}",
      "espera": "MONTADO_OK"
    },
    {
      "descricao": "teste(s) novo(s) verde(s) (test/performance-ranking-criativos-tela.test.ts, test/performance-nichos-teses-aba.test.ts)",
      "cmd": "test -f test/performance-ranking-criativos-tela.test.ts && test -f test/performance-nichos-teses-aba.test.ts && npx vitest run test/performance-ranking-criativos-tela.test.ts test/performance-nichos-teses-aba.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: drill da tese mostra o ranking de criativos da tese com o tipo de funil do filtro, degrau decisivo, sem amostra em texto, sem base com motivo; erro aparece como erro. REPROVE se: criativos da carteira inteira; zero no lugar de s/ dado; cartao vazio.",
      "cmd": "",
      "espera": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/bloco-vazio-linha.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/c0-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/consistencia-contagens.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/fetch-json-teto.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/performance-nichos-teses-aba.test.ts",
      "motivo": "criado pelo 929: confere a ordem RELATIVA dos 5 blocos dele (nt-filtros, nt-cobertura, nt-indicadores, nt-tabela, nt-rodape) e as funcoes de texto; o bloco novo entra entre eles sem mudar essa ordem; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/regra19.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/travessao-mudo.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/ui-guard.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    }
  ],
  "status": "bloqueado",
  "notas_status": "reprovado apos 2 retries: O filtro de tipo não chega ao drill: nichos-teses-aba.tsx:372 monta <DrillTese tese={tese} /> sem tipo e o default 'todos' fica fixo, então o ranking ignora o filtro de funil. O critério exige o tipo do filtro. O arquivo que chama está fora da allowlist; ampliar a allowlist."
}
```
