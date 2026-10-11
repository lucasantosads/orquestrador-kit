# Ticket 929: Aba Nichos e teses em Performance: filtros, cobertura, 5 indicadores e tabela nicho > tese

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Primeira tela da frente. Performance ganha a aba "Nichos e teses" entre Carteira e Metas de
Performance. Esta fatia monta: filtros (período padrão, tipo de funil, nicho), a linha de
Cobertura com "Classificar pendentes (N)", os 5 indicadores medianos com base, a tabela
nicho > tese expansível com o drill da tese (ranking dos clientes, gestor principal, distância
da mediana) e a linha "Sem tese", e a nota de rodapé. Ranking (930), Matriz e Retenção (931b),
criativos (318c) e Números da Comarka (937) entram depois, nos lugares marcados no README.

Ordem dos blocos e `data-testid`: `docs/roadmap/mockups/performance-tese/README.md`. O critério de ordem é por `grep -n`.

## Campos de máquina

```json
{
  "id": "929",
  "slug": "nichos-teses-aba",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 720 linhas (~12 em page.tsx, ~300 em nichos-teses-aba.tsx, ~140 em nichos-teses-tela.ts, ~110 em drill-tese.tsx, ~160 no teste NOVO). Se passar do teto, pare e reporte. DECISOES DO LUCAS (09/10/2026), valem para a frente inteira: (a) tese vem da campanha (perf_campanha_tese ativo=true); cliente com mais de uma tese entra em cada tese e conta 1 vez no total do nicho. (b) Metricas-norte: %MQL, CPMQL e CAC. Valor de linha = MEDIANA entre os clientes, com faixa (minimo a maximo) embaixo; tese ou nicho com menos de 3 clientes nao ranqueia e mostra 'sem amostra · N clientes'. (c) Custo por resultado segue o objetivo da campanha (src/lib/perf/objetivo-campanha.ts); engajamento entra no Investido e fica fora do custo. Tipo de funil: Todos, Formulario, Mensagem, LP, Webinar; em Todos o custo aparece por tipo ('Form R$ 44 / Msg R$ 2,30'), nunca somado. (d) Score do ranking: CAC 50%, CPMQL 30%, %MQL 20% (posicao normalizada); sem venda registrada a tese entra so com CPMQL e %MQL, renormalizados, e fica marcada 'parcial'. (e) Periodo: o seletor padrao do OS (usePeriodoUrl), um so para a aba. (f) Aba Avaliacao: so superadmin e Head de Trafego, pelo RBAC existente, nunca lista de e-mails. (g) Desvio: CPMQL 50% ou mais acima da mediana da tese por 2 semanas seguidas, numeros em constante exportada unica. (h) Sem dado = 's/ dado' em cinza com o motivo, nunca zero; todo numero com o denominador na mesma linha. (i) Regra 19: nenhum R$ de mensalidade, MRR ou LTV da agencia; dinheiro DO CLIENTE (contratos, faturamento gerado, ROAS, investimento em anuncio) e permitido. (j) Zona C0 intocavel; DDL e cron novo so com token humano; nunca editar vercel.json. TELA: leia docs/roadmap/mockups/performance-tese/README.md (ordem dos blocos e data-testid), DESIGN.md secao 6 e src/components/estados/sem-dado.tsx (SemDado, ValorOuSemDado) antes de escrever; cor e sinal: azul acao, verde saudavel, vermelho risco; sem cartao dentro de cartao, sem badge soup, sem gradiente; vazio vira uma linha de texto, nunca cartao vazio. DEPENDE DO 940b (GET /api/perf/nicho-tese?inicio&fim&tipo&nicho; tipos em src/lib/perf/nicho-tese/agregar.ts). PASSO 1: leia docs/roadmap/mockups/performance-tese/README.md, src/app/dashboard/performance/page.tsx, src/app/dashboard/performance/carteira/carteira-aba.tsx (molde: usePeriodoUrl + SeletorPeriodo + Suspense + timeout de 15s + ErrorState com retry), src/lib/perf/nicho-tese/agregar.ts e src/app/api/perf/nicho-tese/route.ts. FAZER: (1) page.tsx: so acrescente <TabsTrigger value=\"nichos-teses\">Nichos e teses</TabsTrigger> ENTRE Carteira e Metas de Performance e o <TabsContent value=\"nichos-teses\"> com <NichosTesesAba /> entre os dois TabsContent existentes. Nada mais muda: page.tsx segue com 0 <SeletorPeriodo, 0 role=\"group\", 0 aria-label e 0 ariaLabel= (test/performance-seletores.test.ts), sem usePeriodoUrl(), toISOString, getUTC, 86400000 nem \"30d\" (test/lote-b3-2-periodo.test.ts), H1 e LoadingState/ErrorState intactos. (2) NOVO nichos-teses/nichos-teses-tela.ts, logica PURA sem React (testavel em Node): urlNichoTese(inicio, fim, tipo, nicho), textoMediana(m: Mediana, formato) => texto da linha ('R$ 42,10', '18,4%') ou 'sem amostra · N clientes' ou 's/ dado' com motivo; textoFaixa(m) => 'R$ 30,00 a R$ 61,20' ou null; textoBase(n) => '7 clientes'/'1 cliente'; textoCustoPorTipo(lista) => 'Form R$ 44,00 / Msg R$ 2,30' na ordem Form, Msg, LP, Webinar, Outro (NUNCA soma); textoDistancia(pct) => '34% abaixo' / '12% acima' / 'na mediana' / null; textoCobertura(c) => 'Cobertura: 41 de 52 campanhas com investimento tem tese (R$ 18.400,00 de R$ 21.000,00)'. Dinheiro com toLocaleString pt-BR BRL. (3) NOVO nichos-teses/nichos-teses-aba.tsx ('use client', export function NichosTesesAba com Suspense por causa do useSearchParams): um periodo so via usePeriodoUrl (o MESMO da URL da Carteira) e <SeletorPeriodo ariaLabel=\"Periodo de nichos e teses\" />; filtro Tipo de funil (Todos, Formulario, Mensagem, LP, Webinar) e Nicho (Todos + nichos da resposta), ambos <select> com aria-label; fetchJson da rota; timeout de 15s vira ErrorState com 'Tentar novamente'. Blocos NESTA ORDEM no arquivo, cada um com o data-testid: nt-filtros (os 3 controles), nt-cobertura (UMA linha de texto com textoCobertura e o botao 'Classificar pendentes (N)' que expande a lista das campanhas sem tese: campanha, cliente, investido, link 'Abrir ficha' para /dashboard/clientes/<cliente_id>, onde a tabela de Campanhas da Visao tem o seletor de tese; com 0 pendentes o botao nao aparece e a linha diz 'todas as campanhas com investimento tem tese'), nt-indicadores (5 indicadores na ordem Investido, %MQL, CPMQL, CAC, ROAS dos clientes; cada um com rotulo, mediana em font-mono, faixa embaixo e base 'N clientes' na mesma linha; sem amostra ou sem dado em cinza com o motivo no title), nt-tabela (tabela nicho > tese: linha de nicho com clientes, investido, custo por tipo (em Todos via textoCustoPorTipo; com tipo filtrado, o custo daquele tipo), %MQL, CPMQL, CAC, contratos; clique no nicho expande as teses; clique na tese abre o DrillTese; tese ou nicho sem amostra mostra 'sem amostra · N clientes' nas colunas de metrica; ULTIMA linha 'Sem tese' com clientes, investido e campanhas, sem metricas), nt-rodape (texto: 'Custo por resultado segue o objetivo de cada campanha; engajamento entra no investido e fica fora do custo. MQL vem do CRM; contratos, dos fechamentos registrados. Valor de linha e a mediana entre os clientes; abaixo de 3 clientes nao ha amostra.'). Entre nt-indicadores e nt-tabela fica o lugar do Ranking (930) e entre nt-tabela e nt-rodape o de Matriz e Retencao (931b): nao crie placeholder visivel. (4) NOVO nichos-teses/drill-tese.tsx: export function DrillTese({tese}) com o ranking dos clientes da tese ordenado por CPMQL crescente (sem CPMQL no fim): cliente, gestor principal (ou 's/ gestor principal' cinza), investido, custo por tipo, %MQL, CPMQL, CAC e distancia da mediana via textoDistancia; numeros em font-mono; tese sem amostra mostra os clientes com uma linha de aviso 'sem amostra · N clientes: sem mediana para comparar'. (5) NOVO test/performance-nichos-teses-aba.test.ts: funcoes puras de nichos-teses-tela.ts (textoCustoPorTipo com 2 tipos devolve 'Form R$ 56,12 / Msg R$ 1,57' e nunca um total; textoMediana sem amostra devolve 'sem amostra · 2 clientes'; textoDistancia(-34) = '34% abaixo'; textoCobertura) e, por readFileSync, a ordem dos data-testid na aba, o TabsTrigger 'Nichos e teses' entre 'Carteira' e 'Metas de Performance' em page.tsx, e o texto 'Classificar pendentes' na aba. FORA DE ESCOPO: ranking do periodo, matriz, retencao, criativos, numeros da Comarka, aba Avaliacao, a Carteira, as rotas. REGRAS: zona C0 (clientes_receita, leads_crm, leads_crm_historico, ads_metadata, ads_performance, fn_mql_sql_by_month, prefixos trafego_* e vw_*) e leitura pura: nada de escrita, DDL, grant, RLS ou trigger nelas; vercel.json intocado; chave oficial do cliente e cliente_id (uuid); churn_log: nunca leia mensalidade nem ltv_total; falha de leitura nunca vira zero, lista vazia ou verde: nada de `?? []`, `|| []` ou `|| 0` numa leitura, o erro sobe com o motivo (500 na rota, ErrorState na tela); dado ausente aparece como 's/ dado' ou 'sem base' com o motivo; nenhum jargao de banco em texto de tela (nome de tabela, coluna ou operador); nenhum travessao (U+2014) em texto de tela nem em string de copy (guarda travessao-mudo); numeros de tela em font-mono; Set e Map so com Array.from (tsc sem downlevelIteration); nenhum .json() literal novo em src (cliente: fetchJson de @/lib/fetch-json; rota: lerCorpoJson de @/lib/fetch-json); getSession e server-only, nunca em arquivo 'use client'; supabase, fetch e getSession sempre mockados nos testes (vi.mock), nunca banco real; fixture de uuid RFC-4122 (00000000-0000-4000-8000-000000000000 ou crypto.randomUUID()); testes sem JSX (React.createElement + renderToStaticMarkup, esbuild transformSync no molde de test/bloco-vazio-linha.test.ts, ou readFileSync da fonte; o projeto nao tem jsdom nem @testing-library); teste ancora em texto visivel, data-testid ou nome exportado, nunca em classe de estilo; nunca toEqual numa lista inteira; var() nao resolve em atributo de apresentacao SVG. TESTES EXISTENTES da allowlist: se a mudanca quebrar uma assercao, RECALCULE o valor sob a regra nova com comentario acima citando o ticket e de onde veio o numero; PROIBIDO remover assercao, trocar toBe/toEqual/toMatch por toBeDefined/toBeTruthy, usar .skip/.only/.todo, apagar it( ou o arquivo. GUARDAS GLOBAIS (fora da allowlist, nao edite): test/fetch-json-teto.test.ts, test/consistencia-contagens.test.ts, test/bloco-vazio-linha.test.ts, test/abas-montadas.test.ts, test/travessao-mudo.test.ts, test/c0-guard.test.ts, test/regra19.test.ts, test/ui-guard.test.ts. Se um teste FORA da allowlist quebrar, PARE e descreva. Motor do orquestrador (scripts/orquestrador/, docs/orquestrador/) intocado.",
  "cria_novo": [
    "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx",
    "src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts",
    "src/app/dashboard/performance/nichos-teses/drill-tese.tsx",
    "test/performance-nichos-teses-aba.test.ts"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/performance/page.tsx",
    "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx",
    "src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts",
    "src/app/dashboard/performance/nichos-teses/drill-tese.tsx",
    "test/performance-nichos-teses-aba.test.ts"
  ],
  "dependencias": [
    "940b"
  ],
  "prioridade": 35,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx ainda nao existe",
      "cmd": "test -e src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts ainda nao existe",
      "cmd": "test -e src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/app/dashboard/performance/page.tsx existe",
      "cmd": "test -e src/app/dashboard/performance/page.tsx && echo EXISTE || echo AUSENTE",
      "espera": "EXISTE"
    },
    {
      "descricao": "page.tsx tem 2 TabsTrigger hoje (Carteira e Metas)",
      "cmd": "grep -cF '<TabsTrigger value=' src/app/dashboard/performance/page.tsx",
      "espera": "2"
    },
    {
      "descricao": "page.tsx sem SeletorPeriodo hoje",
      "cmd": "grep -cF '<SeletorPeriodo' src/app/dashboard/performance/page.tsx",
      "espera": "0"
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
      "cmd": "npx vitest run test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma guarda global foi editada",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- test/fetch-json-teto.test.ts test/consistencia-contagens.test.ts test/bloco-vazio-linha.test.ts test/abas-montadas.test.ts test/travessao-mudo.test.ts test/c0-guard.test.ts test/regra19.test.ts test/ui-guard.test.ts | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo INTOCADAS || echo EDITOU_$n",
      "espera": "INTOCADAS",
      "tipo": "guarda"
    },
    {
      "descricao": "vercel.json intocado",
      "cmd": "n=$(git diff --name-only \"$(git merge-base HEAD origin/staging-auto)\" -- vercel.json | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo VERCEL_INTOCADO || echo VERCEL_EDITADO",
      "espera": "VERCEL_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhuma linha nova com .json() nos arquivos de src do ticket (teto do 295)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/app/dashboard/performance/page.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts src/app/dashboard/performance/nichos-teses/drill-tese.tsx | grep -cE '^[+][^+].*[.]json[(][)]'); [ \"$n\" = 0 ] && echo ZERO_JSON_NOVO || echo JSON_NOVO_$n",
      "espera": "ZERO_JSON_NOVO",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' src/app/dashboard/performance/page.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts src/app/dashboard/performance/nichos-teses/drill-tese.tsx test/performance-nichos-teses-aba.test.ts | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 720 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 720 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "zero escrita em banco nas linhas adicionadas dos arquivos de src do ticket",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff \"$b\" HEAD -- src/app/dashboard/performance/page.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx src/app/dashboard/performance/nichos-teses/nichos-teses-tela.ts src/app/dashboard/performance/nichos-teses/drill-tese.tsx | grep -E '^[+][^+]' | grep -cE '[.](insert|update|upsert|delete|rpc)[(]'); [ \"$n\" = 0 ] && echo SEM_ESCRITA || echo ESCRITA_$n",
      "espera": "SEM_ESCRITA",
      "tipo": "guarda"
    },
    {
      "descricao": "testes que leem page.tsx seguem verdes sem edicao",
      "cmd": "npx vitest run test/performance-titulo.test.ts test/performance-seletores.test.ts test/estados-crm-fin-perf.test.ts test/lote-b3-2-periodo.test.ts test/performance-coleta-ui.test.ts test/trafego-carteira.test.tsx >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "blocos da aba na ordem do README (grep -n dos data-testid)",
      "cmd": "f=src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx; [ -f \"$f\" ] || { echo SEM_ARQUIVO; exit 0; }; p=0; r=ORDEM_OK; for id in nt-filtros nt-cobertura nt-indicadores nt-tabela nt-rodape; do n=$(grep -nF \"data-testid=\\\"$id\\\"\" \"$f\" | head -1 | cut -d: -f1); if [ -z \"$n\" ]; then r=FALTA_$id; elif [ \"$n\" -le \"$p\" ]; then r=FORA_DE_ORDEM_$id; else p=$n; fi; done; echo $r",
      "espera": "ORDEM_OK"
    },
    {
      "descricao": "a aba Nichos e teses fica entre Carteira e Metas de Performance em page.tsx",
      "cmd": "c=$(grep -n 'value=\"carteira\">Carteira<' src/app/dashboard/performance/page.tsx | head -1 | cut -d: -f1); n=$(grep -n 'value=\"nichos-teses\">Nichos e teses<' src/app/dashboard/performance/page.tsx | head -1 | cut -d: -f1); m=$(grep -n 'value=\"metas\">Metas de Performance<' src/app/dashboard/performance/page.tsx | head -1 | cut -d: -f1); [ -n \"$n\" ] && [ \"$c\" -lt \"$n\" ] && [ \"$n\" -lt \"$m\" ] && echo ABA_NO_LUGAR || echo ST_${c}_${n:-0}_${m}",
      "espera": "ABA_NO_LUGAR"
    },
    {
      "descricao": "page.tsx continua sem seletor de periodo nem aria-label (o seletor mora na aba)",
      "cmd": "test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx || true) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx || true) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx || true); [ \"${s:-x}\" = 0 ] && [ \"${a:-x}\" = 0 ] && [ \"${t:-x}\" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s:-x}_${a:-x}_${t:-x}",
      "espera": "PERIODO_NA_ABA"
    },
    {
      "descricao": "a aba usa o periodo padrao do OS",
      "cmd": "n=$(grep -cF usePeriodoUrl src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo PERIODO_PADRAO || echo FALTA_${n:-0}",
      "espera": "PERIODO_PADRAO"
    },
    {
      "descricao": "botao Classificar pendentes",
      "cmd": "n=$(grep -cF 'Classificar pendentes' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo PENDENTES_OK || echo FALTA_${n:-0}",
      "espera": "PENDENTES_OK"
    },
    {
      "descricao": "linha Sem tese na tabela",
      "cmd": "n=$(grep -cF 'Sem tese' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo SEM_TESE_OK || echo FALTA_${n:-0}",
      "espera": "SEM_TESE_OK"
    },
    {
      "descricao": "drill mostra distancia da mediana",
      "cmd": "n=$(grep -cF textoDistancia src/app/dashboard/performance/nichos-teses/drill-tese.tsx 2>/dev/null); [ \"${n:-0}\" -ge 1 ] && echo DISTANCIA_OK || echo FALTA_${n:-0}",
      "espera": "DISTANCIA_OK"
    },
    {
      "descricao": "teste(s) novo(s) verde(s) (test/performance-nichos-teses-aba.test.ts)",
      "cmd": "test -f test/performance-nichos-teses-aba.test.ts && npx vitest run test/performance-nichos-teses-aba.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: a aba Nichos e teses aparece entre Carteira e Metas, com filtros, cobertura com 'Classificar pendentes (N)', 5 indicadores medianos com faixa e base, tabela nicho > tese com drill (gestor principal e distancia da mediana) e 'Sem tese' por ultimo, rodape; tudo na ordem do README. REPROVE se: custo somado entre tipos; numero sem base na linha; 0 no lugar de s/ dado; seletor de periodo no page.tsx; cartao vazio; jargao de banco na tela.",
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
      "teste": "test/estados-crm-fin-perf.test.ts",
      "motivo": "le page.tsx: LoadingState e ErrorState importados e usados, sem Loader2; o ticket nao remove nenhum; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/fetch-json-teto.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/lote-b3-2-periodo.test.ts",
      "motivo": "monta page.tsx com esbuild e stubs (import relativo ou @/ novo vira componente nulo) e le a fonte: page.tsx segue sem usePeriodoUrl(), toISOString, getUTC, 86400000 e \"30d\"; o periodo da aba nova mora no arquivo da aba; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/performance-coleta-ui.test.ts",
      "motivo": "le page.tsx: sem <HistoricoSemanal e sem coleta={semanal.coleta}; o ticket nao os traz de volta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/performance-seletores.test.ts",
      "motivo": "le page.tsx e carteira-aba.tsx: page.tsx precisa seguir com 0 <SeletorPeriodo, 0 role=\"group\", 0 aria-label e 0 ariaLabel=; o seletor da aba nova mora no arquivo da aba, nunca no page.tsx; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/performance-titulo.test.ts",
      "motivo": "le page.tsx: H1 'Performance' com token de escala; o ticket so acrescenta TabsTrigger/TabsContent e nao mexe no H1; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/regra19.test.ts",
      "motivo": "guarda global: nao editavel; o criterio de guardas roda ela"
    },
    {
      "teste": "test/trafego-carteira.test.tsx",
      "motivo": "le page.tsx: <Tabs defaultValue=\"carteira\">, TabsTrigger carteira e metas e <CarteiraAba />, sem value=\"analytics\"; o ticket so acrescenta outra aba; se quebrar, PARE e descreva"
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
  "status": "pendente",
  "notas_status": ""
}
```
