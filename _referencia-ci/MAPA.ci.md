# MAPA do roadmap: conteudos-infinitos

> Fonte única do roadmap, junto com `mapa.json` (máquina). `orq mapa lint` confere que os
> IDs daqui e de lá são os mesmos. Espelhos externos (Notion, task-master) recebem writeback;
> nunca o contrário. Só o dono edita blocos e frentes; a automação só escreve `status`.

> Criado em 2026-09-02 (Fase 0 brownfield, base `6dc9622`), a partir de `docs/recon-2026-09-02.md`.
> Enquanto `orq mapa lint` não existir, o lint é o script manual descrito em `docs/arquitetura.md`.

## Convenções
- Bloco = épico do PRD. Tem DoD verificável por humano em uma sessão. **Sem faixa de IDs:** ticket recebe ID
  sequencial global, na ordem em que entra na fila; `bloco` e `frente` no JSON do ticket carregam a pertença.
  `faixa_ids` sobrevive só em B0, como registro histórico da faixa 000–099 já fechada.
- Frente = unidade que o planejador decompõe. Tem allowlist comum, deps por ID e status.
- Ticket = único nível que entra na fila. Nasce na Fase 2 pelo planejador (ou humano).
- Status de frente: `rascunho` → `pronta` → `em_andamento` → `concluida` | `bloqueada_humano`.
- No máximo 2 frentes `pronta` por bloco; frente `pronta` só com deps `concluida`.
- Gate humano é token: o loop não o resolve. Migration produzida-e-não-aplicada é gate do bloco que a consome.

## B0 · Legado do lote B0-B5  (IDs 000–099) — `concluida`
**Por que existe:** Registrar o que o loop v1 ja entregou, para que a faixa 000-099 fique fechada e nenhum planejador futuro reabra IDs usados.
**DoD (gate humano):**
- 21/21 tickets done em docs/fila/0*.md, lote promovido em main pelo merge f43187d
**Gates humanos:** nenhum

*Sem frentes.* O lote nasceu como 21 tickets diretos, antes da v2; não há agrupamento a registrar.
O que cada ticket entregou está em `docs/recon-2026-09-02.md` §5.

## B1 · Motor honesto  — `em_andamento`
**Por que existe:** Hoje a web chama de real o que e fixture; enquanto isso valer, todo angulo que o produto mostra e invencao com cara de dado.
**DoD (gate humano):**
- Numa org com Perplexity e SerpApi configurados, 'Gerar angulos' em /angulos para uma persona com 5 dores persiste >=10 angulos, com sinais de juridico E web_trends E web_perguntas, cobrindo >=3 dores distintas (nao 1 tema x formatos).
- O selo de simulacao segue a FONTE, nao a credencial: com credencial presente mas fonte caindo em fixture, o selo continua aparecendo.
**Gates humanos:** `humano:custo-sinal-real`

| Frente | Entrega | Allowlist comum | Deps | ADRs | Status | Tk |
|---|---|---|---|---|---|---|
| B1-F1 | As portas do caminho organico passam a construir as sources com as CREDENCIAIS DA ORG (o que run-organico.ts ja faz no CLI) e a reportar QUAL fonte usaram; o selo deriva da fonte usada, nunca da presenca de credencial; teto mensal de geracoes com fonte real por org degrada para fixture, sem erro na tela. REABERTA: o tema que vai a fonte juridica paga era texto de fixture com o UUID da persona dentro, e o dedup do sinal juridico dependia desse UUID — o tema passa a derivar da persona e a persona entra na base do hash, com fonte_ref preservado. | `services/orquestrador/src/organico.ts`, `apps/web/src/server/angulos.ts`, `apps/web/src/app/angulos/page.tsx`, `apps/web/src/app/angulos/SeloSimulacao.tsx`, `apps/web/test/angulos*`, `services/orquestrador/test/noop-dormente.test.ts`, `services/orquestrador/test/organico-fonte-usada.test.ts`, `apps/web/src/server/angulos-gerar-core.ts`, `apps/web/src/server/angulos-types.ts`, `apps/web/src/lib/organico-teto.ts`, `apps/web/src/server/organico-uso.ts`, `apps/web/test/organico-teto.test.ts` `services/ingestao-organico/src/**`, `services/ingestao-organico/test/**` *(cria_novo)* | nenhuma | 0004 | em_andamento | 4 |
| B1-F2 | O caminho web usa de fato a chave SerpApi da org: os termos de Trends e PAA saem da persona (nao de texto de fixture), falha da fonte real degrada em vez de derrubar a geracao, o selo segue a fonte que rodou e a tela conta a verdade sobre as duas trilhas de web. A resolucao por org via Vault e a tela de credenciais ja vieram nos tickets 224-226 e na migration 0023. | `services/orquestrador/src/organico.ts`, `services/orquestrador/test/**`, `services/ingestao-demanda/src/**`, `services/ingestao-demanda/test/**`, `services/ingestao-perguntas/src/**`, `services/ingestao-perguntas/test/**`, `apps/web/src/server/angulos*`, `apps/web/src/app/angulos/**`, `apps/web/test/angulos*` *(cria_novo)* | B1-F1 | 0004 | rascunho | 4 |
| B1-F3 | Ranking honesto: feature de intencao deixa de zerar com persona bem cadastrada, e o top-N diversifica por tema/dor em vez de repetir a dor melhor ranqueada. Sinal real nao corrige ranking dominado por aderencia de formato. Peso de formato: reabrir apos medicao com dados. | `src/topic-engine/features.ts`, `src/topic-engine/engine.ts`, `src/topic-engine/weights.ts`, `test/engine.e2e.test.ts`, `test/features-persist.test.ts`, `test/scoring.test.ts` | nenhuma | — | concluida | 2 |

## B2 · Demo readiness  — `em_andamento`
**Por que existe:** O produto nao e demonstravel a um escritorio novo: nao sobe em staging, nao tem health, e entrega texto que o Provimento 205 nunca leu.
**DoD (gate humano):**
- Num escritorio novo, cliente -> angulo -> roteiro -> export em menos de 10 min, sem jargao tecnico na tela e sem nenhum dado fake.
**Gates humanos:** `humano:migration-0025`, `humano:migration-0027`, `humano:migration-0028`, `humano:migration-0029`, `humano:vercel-staging`, `humano:tk-201-arquetipos`

| Frente | Entrega | Allowlist comum | Deps | ADRs | Status | Tk |
|---|---|---|---|---|---|---|
| B2-F1 | Gate 205 em dois estagios: M6 segue como pre-checagem (nao gasta legenda em roteiro ruim) e o Finalizar reavalia roteiro + legenda em estagio-roteiro.ts, sempre, sem checkbox. pos-aprovacao.ts fica FORA da allowlist de proposito: exigirAprovado nao pode ser tocado. | `services/persona-roteirizador/src/geracao/gate.ts`, `services/persona-roteirizador/src/geracao-guiada/estagio-roteiro.ts`, `services/persona-roteirizador/test/g5-gate*`, `services/persona-roteirizador/test/estagio-roteiro*`, `apps/web/src/app/gerar/**`, `apps/web/src/app/roteirizar/**`, `apps/web/src/server/roteirizar.ts`, `apps/web/src/server/roteirizar-map.ts`, `apps/web/src/server/roteirizar-types.ts`, `apps/web/test/gate-205*` *(cria_novo)* | nenhuma | 0003 | concluida | 6 |
| B2-F2 | /api/health responde 200 com versao e commit; npm run smoke chama uma URL de env; deploy da staging documentado. | `apps/web/src/app/api/**`, `apps/web/test/api-health*`, `package.json`, `apps/web/package.json`, `scripts/smoke/**`, `docs/deploy-staging.md`, `apps/web/src/lib/auth/routes.ts`, `apps/web/test/auth-validation.test.ts` *(cria_novo)* | nenhuma | — | concluida | 2 |
| B2-F3 | Ativacao vira estado persistente (onboarding_step / ativado_em gravados e lidos pelo painel). Sem ticket de schema: a 0025 esta APLICADA (confirmado no banco em 2026-09-03). | `apps/web/src/server/onboarding.ts`, `apps/web/src/app/onboarding/**`, `apps/web/src/server/home-read.ts`, `apps/web/src/app/home/**`, `apps/web/src/app/page.tsx`, `apps/web/test/briefing-gate.test.ts`, `apps/web/test/ativacao*` *(cria_novo)* | nenhuma | 0005 | concluida | 4 |
| B2-F4 | Persona ganha nome proprio (P2-24). A tabela personas nao tem coluna nome: a migration e ticket sozinho. | `supabase/migrations/**`, `apps/web/src/server/personas*`, `apps/web/src/app/personas/**`, `services/persona-roteirizador/src/types.ts`, `apps/web/test/personas-edicao.test.ts` | nenhuma | 0005 | concluida | 4 |
| B2-F5 | BlocoRoteiro tipado, com esqueleto vindo de UM dos 4 arquetipos do ADR-0006 (os 16 estilos mapeiam neles, em codigo), alimenta N renderers; carrossel, story e post, com o texto renderizado passando pelo Gate 205 como o roteiro. O RECORTE DERIVA DE angulos.formato, nao de formato.tipo_tecnico: os 16 formatos criativos do catalogo tem tipo_tecnico 'reels' (catalogo.ts, linhas 7 a 9), entao derivar de la seria codigo inalcancavel. apps/web/src/app/gerar/actions.ts fica FORA desta allowlist de proposito: com a derivacao no motor a Server Action nao precisa mudar, e ela e de B3-F1. | `services/persona-roteirizador/src/blocos/**`, `services/persona-roteirizador/src/geracao/montagem.ts`, `services/persona-roteirizador/test/**`, `apps/web/src/server/roteirizar-map.ts`, `services/persona-roteirizador/src/geracao-guiada/estagio-roteiro.ts`, `services/persona-roteirizador/src/geracao-guiada/tipos.ts`, `services/persona-roteirizador/src/entrega.ts`, `apps/web/src/app/gerar/WizardGerar.tsx`, `apps/web/test/gerar-carrossel.test.tsx`, `apps/web/test/gerar-story-post.test.tsx` *(cria_novo)* | B2-F1 | 0001, 0006 | em_andamento | 8 |
| B2-F6 | Cadastro de persona guiado, nascido do feedback do dono olhando o produto em 2026-09-04: o guard de escritorio para de mandar o dono de um escritorio existente refazer o onboarding e o formulario para de zerar quando o salvamento falha; faixa de renda vira lista de ate duas (A+ a D), nicho vira catalogo de 11 com 'Outros' abrindo texto livre, tom de voz vira lista fechada, e o CTA sai do formulario porque o gerador o deriva de oferta e formato. A migration 0028 e ticket sozinho. No lote 7 a frente ganha o ticket 245, que fecha a divergencia registrada em decisoes-pendentes.md: a org ativa passa a ser o vinculo MAIS ANTIGO (organization_members.created_at asc) nos DOIS lugares que a resolvem, por um helper PURO que recebe o cliente por parametro — o middleware monta o cliente dos cookies da request, org.ts monta de next/headers. Por isso apps/web/src/lib/supabase/middleware.ts entra nesta allowlist, e o ticket e de risco alto. | `apps/web/src/lib/auth/org*`, `apps/web/src/lib/nicho-exibicao.ts`, `apps/web/src/server/personas*`, `apps/web/src/server/nichos*`, `apps/web/src/app/personas/**`, `apps/web/src/components/fields.tsx`, `apps/web/test/persona*`, `apps/web/test/org-*`, `supabase/migrations/0028_catalogo_nichos_e_faixas.sql`, `services/persona-roteirizador/src/faixa-renda.ts`, `services/persona-roteirizador/src/supabase-store.ts`, `services/persona-roteirizador/src/geracao/cta.ts`, `services/persona-roteirizador/test/cta-por-formato.test.ts`, `apps/web/src/lib/supabase/middleware.ts`, `apps/web/test/briefing-gate.test.ts` *(cria_novo)* | B2-F4, B2-F5 | 0005, 0007 | em_andamento | 8 |
| B2-F7 | Sugestoes de dor e palavra-chave por nicho (ADR-0007): semente compartilhada curada pela Comarca, somente leitura para todo escritorio; uso e telemetria de escolha por escritorio; nenhum texto de um tenant exposto a outro, com a RLS separando as duas populacoes na mesma tabela. Os chips na tela sao o 3o ticket (236), escrito no lote 7 sobre o formulario do 231: por isso a allowlist cresceu para PersonaForm.tsx e fields.tsx, e por isso a frente passou a depender de B2-F6. | `supabase/migrations/0029_sugestoes_persona.sql`, `apps/web/src/server/sugestoes*`, `apps/web/src/server/funil.ts`, `apps/web/test/sugestoes.test.ts`, `apps/web/src/components/fields.tsx`, `apps/web/src/app/personas/PersonaForm.tsx`, `apps/web/test/personas-chips-sugestao.test.tsx` *(cria_novo)* | B2-F6 | 0005, 0007 | em_andamento | 3 |

## B3 · Piloto pago  — `em_andamento`
**Por que existe:** O produto entrega para o operador, nao para o cliente do escritorio. Sem um artefato que o advogado mande ao cliente dele, nao ha piloto pago, so demo.
**DoD (gate humano):**
- Voce cria um roteiro, gera o link publico, abre o link numa janela anonima, aprova como se fosse o cliente, e ve no painel do escritorio o roteiro aprovado com o custo por roteiro publicavel ao lado.
**Marco de negócio (fora do DoD):** 3 clientes Comarka operando (resultado, nao criterio de aceite: fora do DoD).
**Gates humanos:** `humano:tk-103-bakeoff`, `humano:migration-0030`

| Frente | Entrega | Allowlist comum | Deps | ADRs | Status | Tk |
|---|---|---|---|---|---|---|
| B3-F1 | Fila de aprovacao com link publico. Persiste legenda e veredito 205 (hoje ambos efemeros: nao ha coluna legenda em roteiros, e o veredito da SEGUNDA avaliacao sai de avaliarMockRoteiro, fora do sink que grava em roteiro_compliance_avaliacoes) e o token do link: 32 bytes aleatorios, um por roteiro, 30 dias, revogavel. /aprovar e a UNICA rota publica nova e entra em PUBLIC_PREFIXES explicitamente; /aprovacoes, a fila interna, continua protegida. Quem tem o link ve roteiro, legenda e veredito 205 e pode aprovar ou pedir ajuste com comentario, e nada alem disso. A migration e ticket sozinho. | `supabase/migrations/0030_fila_aprovacao.sql`, `apps/web/src/server/aprovacoes*`, `apps/web/src/app/gerar/actions.ts`, `apps/web/src/app/aprovar/**`, `apps/web/src/app/aprovacoes/**`, `apps/web/src/lib/auth/routes.ts`, `apps/web/test/aprovacoes*`, `apps/web/test/aprovar-publico.test.tsx`, `apps/web/test/auth-validation.test.ts` *(cria_novo)* | B2-F1, B2-F2 | 0003, 0005 | pronta | 6 |
| B3-F2 | Portal do cliente: o advogado manda um link, o cliente ve o roteiro e aprova ou pede ajuste. Superficie publica com token: juiz forte sempre. | `apps/web/src/app/portal/**`, `apps/web/src/server/portal*`, `apps/web/test/portal*` *(cria_novo)* | B3-F1 | — | rascunho | 6 |
| B3-F3 | 'Pedir pauta': o cliente pede um tema pelo mesmo link e o pedido entra na fila do escritorio. | `apps/web/src/app/portal/**`, `apps/web/src/server/portal*`, `supabase/migrations/**` *(cria_novo)* | B3-F2 | 0005 | rascunho | 4 |
| B3-F4 | Custo por roteiro publicavel na telemetria. O custo JA e calculado em geracao.ts (camposDeCusto espalha usage/custoUsd em cada ItemGerado) e descartado: nenhum consumidor em apps/web nem em services/telemetria. A frente liga essa ponta ao que persiste. | `services/telemetria/src/**`, `services/telemetria/test/**`, `services/persona-roteirizador/src/llm/precos.ts`, `services/persona-roteirizador/src/geracao/geracao.ts`, `apps/web/src/app/gerar/actions.ts`, `apps/web/src/server/home-desempenho.ts`, `supabase/migrations/**` | B3-F1 | 0005 | rascunho | 5 |

## B4 · Loop de aprendizado  — `rascunho`
**Por que existe:** O score e uma opiniao ate que dado de publicacao o corrija. Sem isso, 'roteiro com lastro de dados' e marketing.
**DoD (gate humano):**
- Voce publica um roteiro, registra a metrica real, roda o ranking de novo para a mesma persona e a ORDEM dos angulos muda, com a tela dizendo qual sinal de performance mudou o que.
**Gates humanos:** `humano:migration-0026`, `humano:adaptacao-terceiros`

| Frente | Entrega | Allowlist comum | Deps | ADRs | Status | Tk |
|---|---|---|---|---|---|---|
| B4-F1 | Loop A fechado: publicado -> performance -> score, sobre roteiro_publicacoes (0018) e roteiro_publicacao_metricas (0026). Dep de B3-F1 por CONTEUDO: o loop le o estado de aprovacao que B3-F1 persiste. A sobreposicao de allowlist que justificava a dep (publicacoes*, entrega/**, publicacoes.test.ts) deixou de existir quando a decomposicao de B3-F1, no lote 7, tirou esses paths da frente. | `apps/web/src/server/publicacoes*`, `apps/web/src/app/entrega/**`, `services/telemetria/src/**`, `src/feedback/**`, `apps/web/test/publicacoes.test.ts` | B3-F1 | 0005 | rascunho | 6 |
| B4-F2 | Score composto do R2: performance x demanda x atualidade. | `src/topic-engine/weights.ts`, `src/topic-engine/engine.ts`, `src/topic-engine/features.ts`, `test/engine.e2e.test.ts` | B4-F1, B1-F3 | — | rascunho | 4 |
| B4-F3 | Apify como fonte de TEMA e TENDENCIA (performance + autoridade), nunca conteudo bruto para reproducao. | `services/ingestao-trafego/src/**`, `services/orquestrador/src/organico.ts`, `apps/web/src/server/credenciais*`, `services/orquestrador/test/**` | B1-F2 | 0002, 0004 | rascunho | 5 |
| B4-F4 | Motor de adaptacao: 3 modos + anti-similaridade 5-gram. Servico puro, prova offline, sem integracao web. | `services/persona-roteirizador/src/adaptacao/**`, `services/persona-roteirizador/test/**` *(cria_novo)* | B4-F3 | 0002 | rascunho | 4 |
| B4-F5 | Proveniencia com RLS (migration como ticket sozinho) + consentimento do operador + integracao web + Gate 205 no output da adaptacao. | `services/persona-roteirizador/src/adaptacao/**`, `supabase/migrations/**`, `apps/web/src/app/gerar/**`, `services/persona-roteirizador/test/**` *(cria_novo)* | B4-F4, B2-F1 | 0002, 0003, 0005 | rascunho | 4 |

## Totais

| Bloco | Frentes | Tickets estimados |
|---|---|---|
| B0 | 0 | 0 |
| B1 | 3 | 13 |
| B2 | 7 | 33 |
| B3 | 4 | 21 |
| B4 | 5 | 23 |
| **total** | **19** | **90** |

