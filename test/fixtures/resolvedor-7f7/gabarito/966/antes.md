# Ticket 966: aba Criativos no grupo Campanhas (tabela por vídeo + painel do criativo)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket I da frente Motor de Criativos. Mockup: canvas "Motor de Criativos · Visão, Campanhas e Tráfego", artboard "Ficha › Campanhas › Criativos". Pedido do Lucas em 09/10: em Campanhas, os melhores criativos por hook e body em detalhe, com o vídeo da Meta. A aba lista uma linha por vídeo (impressões, hook, body, retenção 25/50/75/100, leads, MQL, CPMQL, CAC), as imagens abaixo sem hook e body, e um painel à direita com o vídeo reproduzido pela rota do 965, as quatro métricas, a leitura "prende e qualifica" e os anúncios do vídeo. A transcrição (hook, body, CTA e classificação) entra no painel na fase 2; aqui o painel mostra só o que existe.

Os grupos da ficha continuam 5 (teto do ui-guard): "criativos" é filho de Campanhas, depois de Teses.

## Campos de máquina

```json
{
  "id": "966",
  "slug": "campanhas-aba-criativos",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 600 linhas (~350 em src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx NOVO, ~12 em src/app/dashboard/clientes/[id]/tabs/ficha-types.ts, ~8 em src/app/dashboard/clientes/[id]/page.tsx, ~220 em test/campanhas-aba-criativos.test.tsx NOVO, ~4 em test/campanhas-sem-duplicatas.test.ts). Se passar do teto, pare e reporte. Depende do 963b e do 965. MOCKUP: artboard 'Ficha . Campanhas . Criativos' do canvas 'Motor de Criativos' (09/10). PASSO 1: leia src/app/dashboard/clientes/[id]/tabs/ficha-types.ts (ChildTab, TAB_GROUPS, CHILD_LABELS; CHILD_TO_PARENT e derivado), src/app/dashboard/clientes/[id]/page.tsx (ramo grupoAtivo === 'performance': AnchorBlock de metricas, otimizacoes, painel, teses, analise, alertas-meta, calculadora), src/app/dashboard/clientes/[id]/tabs/metricas-tab.tsx (molde de aba que le useFicha: perfClienteId, periodoFicha, metricasStale), src/app/dashboard/clientes/[id]/_components/tabela-campanhas.tsx (padrao de cabecalho, pilulas de filtro, celula SemDado), src/app/api/perf/criativos/route.ts e src/lib/perf/criativos/agrupar.ts (contrato RespostaCriativos, CriativoAgrupado, ranking, ChaveRanking) e test/campanhas-aceite-mockup.test.tsx (afirma que os 4 primeiros filhos de performance sao metricas, otimizacoes, painel, teses e a ordem dos AnchorBlock: o filho novo entra DEPOIS de teses). FAZER: (1) src/app/dashboard/clientes/[id]/tabs/ficha-types.ts: ChildTab ganha 'criativos'; TAB_GROUPS performance.children vira ['metricas','otimizacoes','painel','teses','criativos','analise','alertas-meta','calculadora']; CHILD_LABELS.criativos = 'Criativos'. Nada mais muda. (2) src/app/dashboard/clientes/[id]/page.tsx: import { CriativosTab } from './tabs/criativos-tab' ao lado dos imports de tabs e, IMEDIATAMENTE depois do AnchorBlock id='teses', `<AnchorBlock id=\"criativos\" label={CHILD_LABELS.criativos} active={activeTab === \"criativos\"}>{activeTab === \"criativos\" ? <CriativosTab /> : null}</AnchorBlock>` com comentario de uma linha citando o ticket 966. (3) NOVO src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx ('use client'): export type EstadoAba = { tipo: 'carregando' } | { tipo: 'erro'; mensagem: string } | { tipo: 'sem_conta' } | { tipo: 'ok'; dados: RespostaCriativos }. export function CriativosTabView({ estado, ordem, onOrdem, filtro, onFiltro, selecionado, onSelecionar }: { estado: EstadoAba; ordem: ChaveRanking; onOrdem: (c: ChaveRanking) => void; filtro: FiltroStatus; onFiltro: (f: FiltroStatus) => void; selecionado: string | null; onSelecionar: (chave: string | null) => void }): raiz data-testid='aba-criativos'. Topo: 5 cartoes pequenos (grid md:grid-cols-5 gap-3, cada um rounded-xl border bg-card p-3): 'Vídeos no período' = videos.length com linha `+ ${imagens.length} imagens · piso ${piso} impressões`; 'Hook rate · mediana do cliente' = mediana dos hook_rate nao nulos dos videos acima do piso (1 casa) com linha 'tese: {mediana}% · P75 {p75}%' quando ha benchmark, senao 'sem benchmark da tese'; 'Body rate · mediana do cliente' idem com body; 'CPMQL · vídeo x imagem' = mediana de funil.cpmql nao nulo dos videos e das imagens com sem_base false, formato 'R$ 74 · R$ 118', e linha 'vídeo converte {x}% mais barato' so quando os dois existem e video < imagem (senao linha vazia); 'Cobertura' = `${cobertura.contas_com_retencao} de ${cobertura.contas} contas com retenção` e linha 'última coleta {dd/mm}' ou 'retenção ainda não coletada'. Valor nulo em qualquer cartao mostra 'sem base' em text-muted-foreground, nunca 0. Bloco principal: grid lg:grid-cols-[minmax(0,1fr)_420px] gap-4. Esquerda: cartao com h2 'Criativos', pilulas 'Ordenar por' (Hook, Body, CPMQL, CAC, Investido => ChaveRanking hook_rate, body_rate, cpmql, cac, gasto; a ativa com aria-pressed=true) e 'Mostrar' (Ativos, Pausados, Todos => FiltroStatus; onFiltro refaz a chamada), subtitulo 'Uma linha por vídeo, somando todos os anúncios que o usam · imagens entram sem hook e body · funil pelo anúncio de origem do lead'; tabela em div overflow-x-auto com colunas: thumb (img alt='' w-13 h-8 ou placeholder), Vídeo (titulo truncado + linha `${n_anuncios} anúncios · ${n_campanhas} campanhas`), Impressões, Hook, Body, 'Retenção 25·50·75·100' (4 barrinhas de altura proporcional em div, title com os 4 percentuais), Leads, MQL, CPMQL, CAC; linhas = videos ordenados pela chave (nulos no fim; cpmql e cac crescentes) seguidas das imagens; linha selecionada com bg-primary/10; clique na linha chama onSelecionar(chave) (botao type=button ocupando a linha, acessivel); celula nula mostra 'sem base' quando o motivo e funil (funil.sem_base); nunca um traco solto no lugar: use o texto 'imagem' nas celulas de hook/body/retencao de imagens e 'sem venda' em CAC sem venda; hook abaixo da mediana da tese e CPMQL acima de 1,5x a mediana em text-orange-400 (so com benchmark); abaixo_piso mostra a pilula 'abaixo do piso' ao lado do titulo. Rodape text-fs-label: 'Hook em laranja: abaixo da mediana da tese · CPMQL em laranja: acima de 1,5x a mediana · sem base: menos de 20 leads no período'. Direita (painel), so com selecionado: cartao com titulo do criativo, linha `${duracao ou 'duração não informada'} · ${n_anuncios} anúncios em ${n_campanhas} campanhas`, botao X aria-label='Fechar painel'; para video: <video controls preload='none' poster={thumbnail_url ou undefined} src={`/api/perf/criativos/${criativo_id}/midia?tipo=video`} className='w-full rounded-lg bg-muted' /> so quando criativo_id existe, senao uma linha 'vídeo ainda não resolvido na Meta · próxima coleta às 00:30'; grid de 4 numeros (Hook, Body, CPMQL, CAC, 'sem base' quando nulo); leitura em uma linha: posicao_tese p90 ou p75 com cpmql <= mediana da tese => 'Prende e qualifica: hook no {P90|P75} da tese e CPMQL abaixo da mediana. Vale replicar.'; hook acima do P75 com cpmql > 1,5x a mediana => 'Prende mas não qualifica: hook alto e CPMQL acima de 1,5x a mediana da tese.' em text-orange-400; sem benchmark => 'Sem benchmark da tese ainda'; lista 'Anúncios' com ad_nome, campaign_nome e pilula Ativo/Pausado por anuncio; linha final text-fs-label 'Transcrição do hook e do body entra na próxima fase'. Sem painel selecionado nada e renderizado a direita (sem cartao vazio). export function CriativosTab(): le useFicha() (perfClienteId, periodoFicha); sem perfClienteId => estado sem_conta com a mesma copy de metricas-tab ('Nenhuma conta Meta vinculada a este cliente'); com conta faz fetchJson<RespostaCriativos>(`/api/perf/criativos?cliente_id=${perfClienteId}&from=${from}&to=${to}&status=${filtro}`) ao montar, ao mudar periodoFicha e ao mudar o filtro; ordem e selecionado em useState. Nenhum seletor de periodo proprio: o periodo e o da barra. (4) NOVO test/campanhas-aba-criativos.test.tsx (vitest + renderToStaticMarkup): TAB_GROUPS performance.children tem 'criativos' na posicao 4 (indice) e os 4 primeiros continuam metricas, otimizacoes, painel, teses; CHILD_LABELS.criativos === 'Criativos'; page.tsx tem exatamente 1 `AnchorBlock id=\"criativos\"` e ele vem depois do `AnchorBlock id=\"teses\"` e antes do `AnchorBlock id=\"analise\"` (indexOf no fonte); a view em ok com 3 videos e 1 imagem rende 4 linhas, a imagem com 'imagem' nas celulas de hook e body e nunca '0,0%'; ordenar por cpmql poe o menor primeiro e os nulos no fim; linha selecionada abre o painel com <video e src contendo '/midia?tipo=video'; video sem criativo_id nao rende <video; 'Prende e qualifica' aparece so no caso certo; copy renderizada sem o travessao (U+2014) e sem 's/ dado'. Regras do repo: texto de interface sem nome de tabela, view ou rota; sem travessao (U+2014); getSession nunca em 'use client'; nenhuma escrita; TAB_GROUPS continua com 5 grupos (test/ui-guard.test.ts). (5) test/campanhas-sem-duplicatas.test.ts, teste (h): a asserção que fixa a lista exata de filhos de performance ganha 'criativos' depois de 'teses' (lista de 8), com comentario 'Ticket 966: criativos entra depois de teses' acima; NENHUMA outra linha do teste muda (nenhuma asserção removida, nenhum skip/only, nenhum toBe trocado). Depende do 925 (tambem edita TAB_GROUPS em ficha-types.ts) para nao nascer de base velha. FORA DE ESCOPO: transcricao, classificacao e botoes Gerar roteiros / Copiar transcricao (fase 2); tela do Trafego (fase 3); mudar a tabela de Campanhas da Visao; seletor de periodo proprio.",
  "cria_novo": [
    "src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx",
    "test/campanhas-aba-criativos.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx",
    "src/app/dashboard/clientes/[id]/tabs/ficha-types.ts",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "test/campanhas-aba-criativos.test.tsx",
    "test/campanhas-sem-duplicatas.test.ts"
  ],
  "testes_conferidos": [
    {
      "teste": "test/aba-na-url.test.ts",
      "motivo": "itera os filhos de cada grupo e o ?aba= da URL; o filho novo tem rotulo e AnchorBlock como os demais"
    },
    {
      "teste": "test/ficha-abas-orfas.test.ts",
      "motivo": "exige que todo ChildTab tenha rotulo e montagem em page.tsx; o ticket entrega os tres juntos"
    },
    {
      "teste": "test/ficha-subsecoes-sequencia.test.ts",
      "motivo": "itera os filhos de TAB_GROUPS montando AnchorBlock por chave; o filho novo entra no mesmo padrao"
    },
    {
      "teste": "test/rbac-visual.test.ts",
      "motivo": "confere que performance contem metricas e o mapeamento de nos RBAC por grupo, nao a lista exata de filhos"
    },
    {
      "teste": "test/campanhas-sem-duplicatas.test.ts",
      "motivo": "entra na allowlist: o teste (h) fixa a lista exata de filhos de performance e e recalculado com criativos depois de teses (criterio anti-afrouxamento)"
    },
    {
      "teste": "test/visao-geral-ordem.test.ts",
      "motivo": "le TAB_GROUPS e page.tsx para a ordem dos grupos, que nao muda"
    },
    {
      "teste": "test/ficha-nav-colapsavel.test.ts",
      "motivo": "navegacao colapsavel por grupo; um filho a mais em Campanhas nao altera o comportamento"
    },
    {
      "teste": "test/a11y/app-dashboard-clientes-id-page.test.ts",
      "motivo": "varredura de acessibilidade da pagina; o AnchorBlock novo segue o padrao dos existentes"
    },
    {
      "teste": "test/ui-guard.test.ts",
      "motivo": "trava o numero de GRUPOS em 5; criativos e filho de Campanhas, nao grupo"
    },
    {
      "teste": "test/campanhas-aceite-mockup.test.tsx",
      "motivo": "afirma os 4 primeiros filhos de performance e a ordem dos AnchorBlock metricas, otimizacoes, painel, teses; o filho novo entra depois de teses e nao mexe nos 4"
    },
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "exige um AnchorBlock por filho de TAB_GROUPS em page.tsx; o ticket adiciona o de criativos junto com o filho"
    },
    {
      "teste": "test/visao-aceite-mockup.test.tsx",
      "motivo": "recorta o ramo da Visao e o de performance de page.tsx por marcadores de grupo; um AnchorBlock a mais dentro do ramo de performance nao muda os marcadores nem o ramo da Visao"
    },
    {
      "teste": "test/painel-em-campanhas.test.ts",
      "motivo": "olha o filho painel e seu AnchorBlock, que continuam iguais e na mesma posicao"
    }
  ],
  "dependencias": [
    "963b",
    "965",
    "925"
  ],
  "prioridade": 37,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/campanhas-aba-criativos.test.tsx ainda nao existe",
      "cmd": "test -e 'test/campanhas-aba-criativos.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o filho criativos ainda nao existe no registro das abas",
      "cmd": "n=$(grep -c '\"criativos\"' 'src/app/dashboard/clientes/[id]/tabs/ficha-types.ts'); [ \"$n\" = 0 ] && echo SEM_FILHO || echo ST_$n",
      "espera": "SEM_FILHO"
    },
    {
      "descricao": "page.tsx monta o AnchorBlock de teses dentro do ramo de performance",
      "cmd": "grep -c 'AnchorBlock id=\"teses\"' 'src/app/dashboard/clientes/[id]/page.tsx'",
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
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx' 'src/app/dashboard/clientes/[id]/tabs/ficha-types.ts' 'src/app/dashboard/clientes/[id]/page.tsx' 'test/campanhas-aba-criativos.test.tsx' 'test/campanhas-sem-duplicatas.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 600 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 600 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes que leem o registro das abas seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ui-guard.test.ts test/campanhas-aceite-mockup.test.tsx test/abas-montadas.test.ts test/visao-aceite-mockup.test.tsx test/painel-em-campanhas.test.ts test/aba-na-url.test.ts test/ficha-abas-orfas.test.ts test/ficha-subsecoes-sequencia.test.ts test/rbac-visual.test.ts test/campanhas-sem-duplicatas.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "filho criativos registrado depois de teses e montado uma vez em page.tsx, na ordem certa",
      "cmd": "t='src/app/dashboard/clientes/[id]/tabs/ficha-types.ts'; p='src/app/dashboard/clientes/[id]/page.tsx'; r=$(grep -c '\"teses\", \"criativos\", \"analise\"' \"$t\"); l=$(grep -c 'criativos: \"Criativos\"' \"$t\"); n=$(grep -c 'AnchorBlock id=\"criativos\"' \"$p\"); a=$(grep -n 'AnchorBlock id=\"teses\"' \"$p\" | head -1 | cut -d: -f1); m=$(grep -n 'AnchorBlock id=\"criativos\"' \"$p\" | head -1 | cut -d: -f1); b=$(grep -n 'AnchorBlock id=\"analise\"' \"$p\" | head -1 | cut -d: -f1); [ \"$r\" = 1 ] && [ \"$l\" = 1 ] && [ \"$n\" = 1 ] && [ \"$a\" -lt \"$m\" ] && [ \"$m\" -lt \"$b\" ] && echo FILHO_MONTADO || echo ST_${r}_${l}_${n}_${a}_${m}_${b}",
      "espera": "FILHO_MONTADO",
      "tipo": "alvo"
    },
    {
      "descricao": "a aba reproduz o video pela rota de midia, ordena pela lib e nao tem seletor de periodo proprio",
      "cmd": "f='src/app/dashboard/clientes/[id]/tabs/criativos-tab.tsx'; v=$(grep -c 'midia?tipo=video' \"$f\"); o=$(grep -c 'ChaveRanking' \"$f\"); u=$(grep -c 'useFicha()' \"$f\"); s=$(grep -ciE 'MODOS_PERIODO|setModoPeriodo|PeriodSelector' \"$f\"); t=$(grep -c $'\\u2014' \"$f\"); d=$(grep -c 's/ dado' \"$f\"); [ \"$v\" -ge 1 ] && [ \"$o\" -ge 1 ] && [ \"$u\" -ge 1 ] && [ \"$s\" = 0 ] && [ \"$t\" = 0 ] && [ \"$d\" = 0 ] && echo ABA_OK || echo ST_${v}_${o}_${u}_${s}_${t}_${d}",
      "espera": "ABA_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "anti-afrouxamento em test/campanhas-sem-duplicatas.test.ts: so a lista esperada ganhou criativos; nenhuma asserção removida, nenhum skip ou only",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; rem=$(git diff \"$b\" HEAD -- test/campanhas-sem-duplicatas.test.ts | grep -cE '^-.*(expect|it\\(|toBe|toEqual)'); add=$(git diff \"$b\" HEAD -- test/campanhas-sem-duplicatas.test.ts | grep -cE '^\\+.*\"teses\", \"criativos\", \"analise\"'); sk=$(grep -cE '\\.(skip|only)\\(' test/campanhas-sem-duplicatas.test.ts); [ \"$rem\" -le 1 ] && [ \"$add\" = 1 ] && [ \"$sk\" = 0 ] && echo RECALCULADO || echo ST_${rem}_${add}_${sk}",
      "espera": "RECALCULADO",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/campanhas-aba-criativos.test.tsx)",
      "cmd": "test -f test/campanhas-aba-criativos.test.tsx && npx vitest run test/campanhas-aba-criativos.test.tsx >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: o grupo Campanhas ganha a aba Criativos com uma linha por video (hook, body, retencao, funil), imagens sem hook e body, ordenacao e filtro, e um painel que reproduz o video da Meta pela rota de midia com as metricas e a leitura contra a tese. REPROVE se: metrica nula vira 0; cor laranja sem benchmark; seletor de periodo proprio; painel vazio renderizado como cartao; grupo novo em TAB_GROUPS; filho fora da posicao depois de teses; teste conferido afrouxado.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "motivo repetido: provável defeito de spec/harness, não do código — gate vitest: suíte vermelha (ver /Users/lucasantos/Projetos/comarka-operacional/docs/fila/runs/966/attempt-2/gate-vitest.txt)"
}
```
