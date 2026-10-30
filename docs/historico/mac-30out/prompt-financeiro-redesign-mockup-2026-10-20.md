# PROMPT CLAUDE CODE: Mockup do novo Financeiro + visão por closer
Data: 20/10/2026 · Repo: `dashboard-comercial` · Worktree NOVO de feature (nunca o `~/dashboard-comercial-deploy`)

Você está trabalhando em um dashboard comercial Next.js 14 (App Router, TypeScript, Tailwind, shadcn/ui dark, Supabase `ogfnojbbvumujzfklkhh`). Implemente um MOCKUP navegável que redesenha a seção Financeiro, simplificando a navegação, corrigindo a leitura dos números e criando a visão financeira por closer. É mockup: dados fixos, nenhuma página real alterada, nenhum deploy.

---

## CONTEXTO ACUMULADO (diagnóstico feito em produção em 20/10/2026)

A seção Financeiro hoje tem 6 abas no topo (Visão Geral, Recebimentos, Custos, Resultado, Comissões, Retenção), sub-abas em 3 delas e uma segunda camada de abas dentro de Custos Fixos. São 19 telas para responder 5 perguntas. Problemas encontrados, em ordem de gravidade:

1. **Números falsos por falta de lançamento de custos.** A tabela `despesas` não recebe lançamentos desde jun/2026 (o Lucas controla custos numa planilha externa). Consequência na tela:
   - `/fluxo-caixa`: saídas = R$ 0 de jul a out, saldo acumulado R$ 530 mil, runway 10,4 meses.
   - `/dre`: out/2026 com margem líquida 73,4% "EXCELENTE", folha R$ 0.
   - `/financeiro/custos`: lucro do ano R$ 534 mil (48,8% de margem).
   - Realidade pela planilha: jan a set somou **−R$ 8,9 mil** de resultado.
2. **O mesmo número aparece diferente em cada aba.** Clientes ativos: 86 (Recebimentos), 88 (Retenção), 68 (Consolidado). MRR: R$ 97,4 mil x R$ 126,6 mil. Churn de outubro: 7,4% x 8,0%. Receita de outubro: R$ 89,5 mil x R$ 88,5 mil.
3. **Três versões de "custo"** que não conversam: Custos Fixos (compromisso R$ 80,2 mil), Custos Agência (realizado, só até jun) e Consolidado (realizado R$ 0).
4. **Performance.** KPIs da Visão Geral ficam em "…"; Consolidado leva ~10 s ("Consolidando custos..."); Gateway Asaas fica em "Carregando"; Conciliação Asaas renderiza 680 linhas de uma vez (R$ 1,17 mi "não identificado", nenhuma sugestão de vínculo mesmo com CPF/CNPJ); Recebimentos renderiza todas as listas juntas (53 + 17 + 15 + pausados + 232 inativos).
5. **Ruído de engenharia na interface:** "fonte: /api/...", "shadow", "fonte antiga", "etapa 2", "a implementar", nome de flag (`metas_flags.comissao_niveis_oficial`).
6. **Jargão no DRE:** "Desfalque / churn evadido", "Queima em tráfego", "Custos fixos ocultos", "Lucro livre retornável", "Espectro extrato categórico".
7. **Comissões contraditória:** o card mostra Rogério R$ 2.530 e a lista diz "Nenhuma comissão para este mês"; cards de shadow vencidos em 13/10 ainda ocupam o topo.
8. **Não existe visão financeira por closer.** Só há filtro de closer na lista de Recebimentos. A análise individual de closer (seção Time) também não funciona de forma individual.

---

## PREMISSAS INEGOCIÁVEIS

- Fórmulas canônicas do CLAUDE.md/contexto do projeto valem integralmente (ROAS por entrada confirmada, investimento via `getInvestimentoMensal()`, MRR com 3 números distintos, `pendente_aprovacao` fora de receita, comissão só via `comissao-canonica.ts`).
- Páginas protegidas (`/dre`, `/trafego/visao-geral`, `/trafego/relatorios`, `/trafego/relatorio-auto`) NÃO são tocadas. O mockup vive em rota nova e isolada.
- Mockup NÃO grava nada no banco, NÃO cria migration, NÃO cria endpoint de escrita. Leitura via SQL só para montar fixtures.
- Qualquer métrica nova que aparecer no mockup e não existir hoje (ex.: custo por closer, ponto de equilíbrio) vem marcada com o selo discreto "proposta" e documentada em `docs/mockups/financeiro/metricas-propostas.md`. Nenhuma vira cálculo de produção sem aprovação do Lucas.
- **Privacidade:** o pró-labore aparece SÓ nas telas de admin (Lucas). Qualquer tela que um closer ou SDR possa ver não mostra pró-labore, linha "sócio" ou "direção"; nesses contextos o valor fica diluído em "Gestão" (entrega) e "Desenvolvimento da empresa" (investimento), sem nomear.
- 1 sessão de Claude Code por worktree. Nenhum push, merge ou deploy sem autorização explícita do Lucas.

---

## PASSO 0: PRÉ-LEITURA OBRIGATÓRIA (antes de qualquer arquivo novo)

1. Carregue as skills de design instaladas, nesta ordem: `ui-ux-produto` (princípios de UX, estados, tabela, formulário, acessibilidade, checklist) e `frontend-design` (direção estética e tipografia). NÃO use `ui-comarka-os`: ela é do repo `comarka-os` e os tokens são outros.
2. Leia os tokens reais deste repo: `tailwind.config.*`, `src/app/globals.css` e os componentes de `src/components/ui/`. O mockup usa SÓ esses tokens e componentes (nada de paleta nova).
3. Mapeie as rotas atuais do Financeiro e liste o arquivo de cada uma: `/financeiro`, `/recebimentos` (+ `?view=gateway`), `/financeiro/asaas`, `/custos-fixos`, `/financeiro/custos`, `/financeiro/custos/consolidado`, `/financeiro/custos/projecoes`, `/dre` (+ `?view=margem`), `/fluxo-caixa`, `/financeiro/comissoes`, `/retencao`.
4. Para cada número que o mockup vai exibir, confirme a fonte canônica com `information_schema.columns` antes de qualquer query (nunca assumir nome de coluna).
5. **Diagnóstico (só reportar, não corrigir):** encontre a tela de análise individual do closer (procure em Time & Equipe › Gestão `/equipe`, em Vendas e em componentes com "closer" no nome) e descubra por que ela não filtra/mostra um closer individualmente. Registre causa-raiz confirmada com query real em `docs/mockups/financeiro/diagnostico-analise-closer.md`.
6. Grave o resultado do PASSO 0 em `docs/mockups/financeiro/00-recon.md` (rotas, arquivos, fontes de cada número, tempo de carregamento observado por aba).

Se algo do contexto acima não bater com o que você encontrar no código, PARE e reporte antes de seguir.

---

## TAREFA 1: Nova arquitetura de informação (documento antes do código)

Escreva `docs/mockups/financeiro/01-arquitetura.md` com a navegação proposta abaixo e, para cada aba, a pergunta que ela responde, os blocos, a fonte canônica de cada número e o que sai da tela atual (e para onde vai).

Navegação nova: **um nível de abas só**, sem sub-aba aninhada. Dentro da aba, no máximo um seletor segmentado.

| Aba nova | Pergunta que responde | Absorve hoje |
|---|---|---|
| **Resumo** | Como está o mês: entrou, saiu, sobrou? | Visão Geral |
| **Entradas** | Quem pagou, quem deve, o que falta conciliar? | Recebimentos, Gateway Asaas, Conciliação Asaas |
| **Saídas** | Quanto gastei, com o quê, e o que está comprometido? | Custos Fixos, Custos Agência, Consolidado, Projeções |
| **Resultado** | A empresa deu lucro? Quanto tenho de caixa? | DRE, Fluxo de Caixa, Margem por Cliente |
| **Carteira** | Estou perdendo cliente? Quem está para sair? | Retenção, fidelidades expirando, inadimplência por cliente |
| **Time** | Quanto cada closer trouxe, custou e vai receber? | Comissões + visão por closer (nova) |

Mesmo seletor de período em todas as abas (mês atual por padrão; presets 3M, 6M, 12M, Ano), no mesmo lugar.

---

## TAREFA 2: Rota e estrutura do mockup

- Rota isolada: `/mockup/financeiro/[aba]` (resumo, entradas, saidas, resultado, carteira, time) + `/mockup/financeiro/time/[closer]`.
- Protegida pelo mesmo middleware de auth, acessível só a admin.
- Dados vêm de fixtures em `src/app/mockup/financeiro/_fixtures/*.ts`, montadas com queries read-only (registre cada query usada em `docs/mockups/financeiro/fixtures.sql`). Custos de jan a set vêm da tabela da TAREFA 9 (planilha do Lucas), não de `despesas`.
- Faixa fixa no topo do mockup: "Mockup · dados de 20/10/2026 · nada aqui grava no banco".
- Server Components por padrão; client só para interação (filtro, seletor, drawer).

---

## TAREFA 3: Aba Resumo

Topo, em uma linha, 4 números grandes: **Entrou** (recebido no mês) · **Saiu** (custo realizado) · **Sobrou** (entrou − saiu) · **Caixa hoje**. Embaixo de cada um, a variação vs mês anterior em texto ("+12% vs set").

Regra de completude (obrigatória): se o mês não tem custo lançado (ou tem menos de 70% da média dos 3 meses anteriores), **Saiu, Sobrou, Margem e Runway NÃO mostram número**. Mostram "Custos de out/26 não lançados" com botão "Importar planilha do mês" (leva para Saídas). Nunca exibir lucro com custo zerado.

Segunda faixa: MRR canônico (`status_financeiro='ativo'`), clientes pagantes, inadimplência (R$ e nº), churn do mês. Cada número com UMA fonte, a mesma usada nas outras abas.

Gráfico único: barras de receita x custo por mês + linha de resultado (jan a dez), meses sem custo lançado em cinza hachurado com legenda "sem lançamento".

Bloco "Precisa de você" (no máximo 5 itens, ordenados por valor): clientes atrasados, pagamentos a conciliar, fidelidades vencendo em 7 dias, comissões a aprovar, mês sem custo lançado.

---

## TAREFA 4: Aba Entradas

Uma tabela só, paginada (50 linhas), com filtros em chips: status (Pago, A vencer, Atrasado, Pagou integral), carteira (Advogados, MDS), closer, plataforma. Colunas: cliente, closer, valor, vencimento, status, pago em, meses de casa. Ações por linha num menu de três pontos (nunca botão solto por linha).

Totais no rodapé da tabela respeitando o filtro ativo.

Seletor segmentado no topo: **Recebimentos** | **A conciliar (Asaas)**.
- "A conciliar" é uma fila: só itens recebidos e sem vínculo, do mais recente para o mais antigo, paginada. Cada item mostra sugestão de cliente por CPF/CNPJ e por nome (badge "sugestão" com % de confiança no mockup) e ações Vincular / Ignorar. Cobranças futuras (vencimento depois de hoje) NÃO entram na fila; ficam num contador "agendadas".
- Pausados e inativos/churned saem daqui e vão para Carteira.

---

## TAREFA 5: Aba Saídas

Unifica as 3 versões de custo em uma tela com 3 blocos verticais:

1. **Realizado do mês** por grupo (Aquisição, Entrega, Estrutura, Investimento, Pró-labore), com barra horizontal empilhada e tabela grupo › categoria expansível. Mesma taxonomia da TAREFA 9.
2. **Comprometido** (folha, recorrentes, parcelas) com o próximo alívio em destaque ("−R$ 8,9 mil/mês a partir de nov/26") e a lista de parcelas que encerram.
3. **Importar planilha do mês** (fluxo desenhado, sem gravar): upload de CSV no formato da planilha do Lucas (linhas = categoria, colunas = meses), pré-visualização do que vai entrar por categoria, diferença vs o que já existe em `despesas`, botão "Confirmar importação" desabilitado com tooltip "mockup". Documente em `metricas-propostas.md` o mapeamento categoria da planilha › categoria de `despesas`.

---

## TAREFA 6: Aba Resultado

DRE em linguagem simples, uma coluna, de cima para baixo:
Receita recebida › (−) cancelamentos › Receita líquida › (−) Aquisição › Margem de contribuição › (−) Entrega › (−) Estrutura › Resultado operacional › (−) Impostos › (−) Investimento › (−) Pró-labore › **Resultado final**.

Cada linha com valor, % da receita e comparação com o mês anterior. Mesma regra de completude da TAREFA 3: mês sem custo lançado mostra o DRE com o aviso e sem a linha de resultado.

Abaixo: fluxo de caixa mensal (entradas, saídas, saldo acumulado) e runway, com o saldo inicial informado explicitamente ("saldo inicial: a definir" enquanto não houver). Margem por cliente sai da tela até existir custo de servir modelado; no lugar, um card "em construção" de uma linha.

---

## TAREFA 7: Aba Carteira

KPIs: clientes pagantes, MRR canônico, churn do mês (nº, R$ e %), tempo médio de casa. Gráfico de churn mensal. Três listas curtas (top 10, com "ver todos"): fidelidades vencendo em 30 dias, inadimplentes por valor, saídas do mês com motivo. Pausados e inativos ficam aqui, recolhidos por padrão. Sem nenhum texto "fonte antiga".

---

## TAREFA 8: Aba Time (visão financeira por closer) e detalhe do closer

### 8.1 Lista (admin)
Uma linha por closer ativo (Lucas fora, `CLOSER_DIRETOR_IDS`), com período selecionável. Colunas:
reuniões feitas · conversão · entrada vendida · valor total vendido · recebido no período (caixa) · inadimplência da carteira dele · churn da carteira dele · comissão do período · % da meta.

Abaixo da tabela, comissões do mês em formato de fechamento: colaborador, base, faixa, %, valor, status (Sugerida › Aprovada › Paga). Sem cards de shadow; a comparação de cálculo vai para um drawer "comparar cálculo" quando houver divergência.

### 8.2 Detalhe `/mockup/financeiro/time/[closer]`
- Linha do tempo mensal (jan a out): entrada vendida em barras, com duas linhas de referência tracejadas, **Equilíbrio** e **Meta**. Barras acima do equilíbrio em azul, abaixo em laranja, sempre com o valor escrito em cima (cor nunca sozinha).
- Bloco "Quanto custou gerar as vendas dele" (selo "proposta"): reuniões × custo de anúncio por reunião (`getInvestimentoMensal()` ÷ reuniões realizadas do mês em `vw_reunioes_consolidada`), fixo do closer, pré-vendas (fixo do SDR rateado por reuniões + R$ 12 por reunião), marketing rateado, comissão. Total e custo por contrato.
- Bloco "Ponto de equilíbrio" (selo "proposta"): entrada mínima por mês para pagar o que ele consome.
- Comparação com a média do time (não com o colega nominalmente).
- Visão do próprio closer (prévia, toggle "ver como closer"): mesma tela sem pró-labore, sem custos da empresa por categoria e sem números de outros closers.

Fórmulas propostas (documentar em `metricas-propostas.md`, NÃO implementar em produção):
```
custo_reuniao_mes      = investimento_mes / reunioes_realizadas_mes
custo_pre_vendas_closer = sdr_fixo × (reunioes_closer / reunioes_total) + 12 × reunioes_closer
custo_aquisicao_closer = custo_reuniao_mes × reunioes_closer + fixo_closer + custo_pre_vendas_closer
                         + marketing_mes × (reunioes_closer / reunioes_total) + comissao_closer
custo_por_contrato     = custo_aquisicao_closer / contratos_ativos_closer
```
Atenção: `closers.salario_fixo` está 0 para todos no banco; no mockup use R$ 2.000 de fixo como fixture e sinalize a lacuna no recon.

---

## TAREFA 9: Fixtures (valores reais para o mockup)

Custos e receita por mês, em R$ mil (planilha do Lucas, jan a set/2026). Grupos: Aquisição = Ads + equipe comercial + comissões + equipe de MKT + audiovisual; Entrega = equipe operacional + ferramentas; Estrutura = aluguel, energia, internet, telefone, limpeza, contador, mercado, manutenção, equipe adm, imposto, outros, terceirizado, prejuízo, obra; Investimento = mentoria, cursos, equipamento, eventos, comemoração, bonificações, investimentos.

| Grupo | jan | fev | mar | abr | mai | jun | jul | ago | set |
|---|---|---|---|---|---|---|---|---|---|
| Aquisição | 18.1 | 24.7 | 23.4 | 38.7 | 27.6 | 48.1 | 34.4 | 45.3 | 44.1 |
| Entrega | 26.8 | 24.4 | 20.1 | 20.5 | 22.2 | 24.8 | 24.9 | 20.2 | 24.3 |
| Estrutura | 13.2 | 11.7 | 23.2 | 34.0 | 18.6 | 21.4 | 16.0 | 15.7 | 14.4 |
| Investimento | 18.5 | 20.0 | 17.8 | 22.0 | 27.2 | 18.5 | 20.0 | 7.8 | 18.3 |
| Pró-labore | 20.0 | 16.4 | 22.4 | 25.6 | 17.9 | 28.2 | 21.3 | 13.4 | 22.1 |
| Custo total | 96.7 | 97.2 | 106.8 | 140.8 | 113.5 | 141.1 | 116.7 | 102.4 | 123.1 |
| Receita | 91.1 | 101.8 | 112.0 | 117.0 | 164.6 | 109.2 | 118.0 | 92.0 | 123.6 |
| Resultado | −5.6 | 4.6 | 5.1 | −23.8 | 51.1 | −31.9 | 1.3 | −10.4 | 0.5 |

Outubro: sem custos lançados (use para demonstrar a regra de completude).

Closers, entrada vendida por mês em R$ mil (contratos `ativo` + `cancelado`, `vw_reunioes_consolidada` para reuniões). Confirme com query antes de usar; se divergir, use o banco e reporte:

| | jan | fev | mar | abr | mai | jun | jul | ago | set | out* |
|---|---|---|---|---|---|---|---|---|---|---|
| Rogério · entrada | 1.5 | 1.7 | 14.5 | 16.4 | 40.2 | 11.4 | 11.9 | 6.5 | 19.9 | 27.0 |
| Rogério · reuniões | 19 | 10 | 55 | 50 | 42 | 41 | 53 | 45 | 44 | 20 |
| Mariana · entrada | 16.3 | 7.9 | 15.6 | 24.2 | 11.9 | 7.2 | 18.3 | 0 | 13.6 | 2.7 |
| Mariana · reuniões | 45 | 27 | 35 | 43 | 26 | 22 | 49 | 37 | 38 | 7 |

*out até 20/10. Mariana com zero em agosto e 37 reuniões: verifique no recon se é dado real ou falha de lançamento.

Referências de setembro para o detalhe do Rogério (selo "proposta"): custo por reunião R$ 432 (anúncio R$ 348 + SDR R$ 36 + marketing R$ 48); custo de aquisição R$ 22.686 para 8 contratos (R$ 2.836 por contrato); equilíbrio R$ 20,6 mil de entrada; meta R$ 30 mil.

---

## TAREFA 10: Padrões de design e performance (valem para todas as abas)

- Hierarquia: 1 número principal por bloco; rótulo em cima, número grande, contexto em uma linha embaixo. Máximo 4 KPIs por linha.
- Toda informação técnica ("fonte", endpoint, tabela, shadow, flag) sai da tela e vai para um ícone "i" que abre um drawer "De onde vem este número", visível só para admin.
- Vocabulário em português simples (zero jargão do DRE atual). Acentuação correta em todo texto visível.
- Estados obrigatórios em cada bloco: carregando (skeleton do tamanho final), vazio (frase + ação), erro (frase + tentar de novo), dado incompleto (aviso da TAREFA 3).
- Cor nunca carrega significado sozinha: status sempre com texto ou sinal (+/−).
- Tabelas: paginação de 50, cabeçalho fixo, números alinhados à direita com `tabular-nums`, totais no rodapé.
- Performance (meta para a implementação real, demonstrada no mockup): uma chamada agregada por aba, primeiro número visível em menos de 1,5 s, nenhuma lista com mais de 50 linhas renderizadas, gráficos carregados depois dos KPIs, nada de 680 linhas no DOM.
- Responsivo até 1280 px de largura sem scroll horizontal na página.

---

## REVISÃO FINAL OBRIGATÓRIA

1. Rode o checklist da skill `ui-ux-produto` em cada aba e registre o resultado em `docs/mockups/financeiro/02-checklist.md`.
2. Tire screenshot de cada uma das 7 telas (6 abas + detalhe do closer) e salve em `docs/mockups/financeiro/screens/`.
3. Confirme que nenhum arquivo fora de `src/app/mockup/financeiro/` e `docs/mockups/financeiro/` foi alterado (`git status` e `git diff --stat`). Se algo fora disso mudou, desfaça e reporte.
4. TypeScript: delta-0 erros novos sobre o baseline da working tree.
5. Entregue um resumo com: o que cada aba nova resolve dos 8 problemas do contexto, as métricas marcadas como "proposta", o diagnóstico da análise individual do closer e a lista de decisões que dependem do Lucas.

---

## NÃO FAZER

- NÃO alterar nenhuma página existente, componente compartilhado, rota protegida ou fórmula canônica.
- NÃO criar migration, view, tabela, endpoint de escrita ou cron.
- NÃO corrigir o bug da análise individual do closer nesta tarefa (só diagnosticar).
- NÃO importar a planilha para `despesas` de verdade.
- NÃO usar tabelas banidas (`clientes`, `vw_churn_mensal`, `vw_trafego_funil_mensal`, `lancamentos_despesa`) nem `config_mensal` para investimento.
- NÃO criar paleta, fonte ou componente visual fora dos tokens do repo.
- NÃO mostrar pró-labore, "sócio" ou "direção" em nenhuma tela que um closer ou SDR possa ver.
- NÃO fazer push, merge ou deploy.
