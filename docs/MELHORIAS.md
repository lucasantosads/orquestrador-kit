# Melhorias do motor (fila única)

## Regras da fila
- Só o git é fonte. Este arquivo é a fila; cópia fora do kit não vale.
- Toda etapa do kit cita, no PASSO 0 e nos commits, os IDs que implementa. No último commit da etapa o status de cada ID muda para "feito (etapa X)" ou "parcial (etapa X): o que falta".
- Item novo só entra pela leitura semanal, e só depois de fechar ou descartar outro.
- Os conflitos ficam abertos até o Lucas decidir; cada um se decide no PASSO 0 da etapa que pegar o item.
- Vídeo novo entra pela leitura semanal.

Status possíveis: ideia | triado | planejado | em-etapa | parcial | feito | descartado | substituído. "feito (antes de 28/10, arquivo:linha)" e "parcial: o que falta" vêm da conferência no código da etapa MELHORIAS-0.

Marco B: só porte do Comarka, convergência, multi-fila e modo sombra (decisão de 28/10/2026). Itens de juiz e eval ficam no marco A.

Origem: consolidação de 28/10/2026 (`~/orq-sessoes/leitura-videos/MELHORIAS-proposta.md`), feita de base.md (itens 1 a 28, experimentos, decisão pendente dos hooks e reforços já listados) e dos lotes 1 a 6 (`~/orq-sessoes/leitura-videos/lote-1.md` a `lote-6.md`). Item que já estava em "Já planejado" entrou como planejado; o resto como ideia. Evidência "não registrada" marca item da base cuja força não foi anotada. Na etapa MELHORIAS-0 (28/10/2026) o status de cada item foi conferido no código do kit (`~/orq-sessoes/relatorio-kit-melhorias-0.md`); M-52, M-53 e M-55 a M-61 passaram de B para A, e M-10 de A para B. Itens do lote 6 do tipo DEFEITO NÃO REGISTRADO e LIÇÃO PERDIDA não estão na fila: estão nas três seções finais.

## Tabela
Ordenada por marco e, dentro do marco, por ID. Os IDs não mudam.

| ID | título | status | marco | ataca | evidência | depende de | fontes |
|---|---|---|---|---|---|---|---|
| M-01 | Contrato do veredito com objeção ancorada e meta-verificação | ideia | A | C2, C5 | medida | M-40 | base #1, v044, L3-07 |
| M-02 | Retry informado que só insiste com fato externo novo | parcial | A | C2, C1, custo | medida | M-41, M-28 | base #2, v100, v051, L1-01, L5-01 |
| M-03 | Alegação sem lastro e referência prometida e não lida | ideia | A | C5, C2 | medida | M-28 | base #21, v046, L3-06 |
| M-04 | Consenso entre juízes paralelos (com conflito) | ideia | A | C5, C2, custo | medida | M-56 | base #25, v052, v061, L3-01, L2-05 |
| M-05 | Gate que executa a migration antes do juiz | ideia | A | C5 | relato | | L6-07 |
| M-06 | Token derivado do git liberado pela promoção | ideia | A | C1 | relato | | L6-13 |
| M-07 | Revisão LLM do lote na entrada, só marcando | ideia | A | C2, C1 | relato | M-42 | v061, L6-16, L2-11 |
| M-08 | Higiene do PLAYBOOK com formato, lastro e obsolescência | parcial | A | C3, C2, C1 | relato | | base #15, v079, v061, v031, L1-05, L2-06, L5-02 |
| M-09 | Migration com drop ou delete recusada na entrada | parcial | A | C1 | relato | | L6-12 |
| M-11 | Auth expirada pausa com dono e avisa o humano | parcial | A | C1 | relato | M-42 | L6-18 |
| M-12 | Juiz por dimensão binário com teto de palavras | ideia | A | C2, C5, custo | relato | | base #3, v102, L2-09 |
| M-13 | Teto de diff no kit (limiar por repo) | parcial | A | C2, C5 | relato | | base #8 |
| M-14 | Confiança declarada pelo modelo nunca vira limiar | parcial | A | C5 | relato | M-40 | v048, L4-07 |
| M-15 | Ticket com 4 blocos de handoff | ideia | A | C1, C2 | opinião | | base #9, v095, L2-01 |
| M-16 | Estado do ticket só-anexar ou versionado | parcial | A | C1 | opinião | | v095, v061, L2-02 |
| M-17 | Contradição de spec exposta, nunca resolvida em silêncio | ideia | A | C1, C5 | opinião | M-03 | v093, L2-03 |
| M-18 | Nível de revisão 0/1/2 com marcha baixa para código crítico | parcial | A | C5 | opinião | | base #18, v084, L2-10 |
| M-19 | Anti-trapaça no diff | parcial | A | C5 | não registrada | | base #4 |
| M-20 | Varredura de segredos e checklist auth/RLS/env | parcial | A | C5 | não registrada | | base #5 |
| M-21 | Fila de merge com rebase e gates de novo | ideia | A | C1 | não registrada | | base #6 |
| M-22 | criterios_privados no ticket | ideia | A | C5 | não registrada | | base #10 |
| M-23 | Agente de testes antes do executor | ideia | A | C2, C5 | não registrada | | base #11 |
| M-24 | Alarme de 0% de aprovação | ideia | A | C2, C5 | não registrada | M-41 | base #19 |
| M-25 | Experimento: diagnóstico antes de bloquear | ideia | A | C1 | não registrada | | base (experimentos) |
| M-26 | Decisão pendente: hooks PostToolUse e Stop | ideia | A | C2 | não registrada | | base (decisão pendente) |
| M-52 | Autopreferência do juiz do mesmo modelo (com conflito) | ideia | A | C5 | medida | M-56 | v100, L1-02 |
| M-53 | Guardrail x north star com gate de regressão por dimensão | ideia | A | C2, C5 | relato | M-56 | base #22, v088, L1-03 |
| M-55 | Versão do CLI no preflight e espera do limite pelo CLI | parcial | A | C1 | relato | | L6-19 |
| M-56 | Eval permanente do juiz | planejado | A | C5, C2 | não registrada | | base (planejado e reforços) |
| M-57 | Viés de confiança: material do juiz com e sem alegações | ideia | A | C5 | não registrada | M-56 | base #20 |
| M-58 | Benchmark público não é meta | ideia | A | C5 | não registrada | | base #26 |
| M-59 | Juiz com enquadramento adversarial como variante A/B | ideia | A | C5 | não registrada | M-56 | base #27 |
| M-60 | Platô do harness: mudança que não mexe C2 nem C5 é encerrada | ideia | A | C2, C5, custo | não registrada | M-53 | base #28 |
| M-61 | Experimento: ablação de scaffolding | ideia | A | custo, C2 | não registrada | M-56 | base (experimentos) |
| M-10 | Validação da fila uma vez por lote, sem --no-verify | ideia | B | C1 | relato | | L6-15 |
| M-54 | N filas por repo, cada uma com base, pausa e resolvedor | ideia | B | C1 | relato | | L6-06 |
| M-27 | Experimento best-of-N com funil e perda do seletor | ideia | C | C5, C2, custo | medida | M-29, M-56 | base (experimentos), v052, v044, v048, v053, v054, v050, L3-02, L3-09, L4-01, L4-02, L5-03 |
| M-28 | Transcrição stream-json com extrator e taxonomia de falhas | ideia | C | C2, C3, custo | medida | | base #12, v061, v046, v048, L2-07, L3-05, L4-05 |
| M-29 | Custo por ticket e por etapa, cache e contexto enxuto do juiz | parcial | C | custo, C2 | medida | M-56 | base (planejado), v089, v048, L1-09, L4-06 |
| M-30 | Roteamento do executor por risco e dificuldade | parcial | C | custo, C2 | medida | M-41, M-45 | base (planejado), v053, v048, L4-04 |
| M-31 | Juiz num modelo abaixo do executor em risco baixo | parcial | C | custo | medida | M-56, M-30 | v052, L3-03 |
| M-32 | PLAYBOOK por divulgação progressiva | ideia | C | custo, C2 | medida | M-08 | v079, L1-04 |
| M-33 | Avaliador de processo e agente de melhoria semanal | ideia | C | C3, C2, C5 | medida | M-28, M-40 | base #24, v050, L5-04 |
| M-34 | Smoke E2E na staging que abre rascunho de ticket | ideia | C | C5, C1 | relato | M-42 | base #7, v063, L1-07 |
| M-35 | Cota antes de despachar com degraus de 70% e 95% | planejado | C | custo, C1 | relato | M-30 | base (planejado), v101, L1-06 |
| M-36 | Resumo diário com link para o artefato de cada evento | ideia | C | C1, C5 | relato | M-28 | v063, L1-08 |
| M-37 | Promoção pendente com idade, tamanho e alarme | parcial | C | C5 | relato | | L6-14 |
| M-38 | API em lote para rodadas sem pressa | ideia | C | custo | opinião | M-56 | v061, L2-08 |
| M-39 | Teto duro de turnos e dólares por claude -p | parcial | C | custo | não registrada | | base #13 |
| M-40 | Ledger de objeções do juiz e agrupador semanal | ideia | C | C3, C2 | não registrada | M-01 | base #14 |
| M-41 | Curva de aprovação por tentativa | parcial | C | C2 | não registrada | | base #16 |
| M-42 | Caixa de decisões no celular | parcial | C | C1 | não registrada | | base #17 |
| M-43 | Ordem de investimento: contexto, prompt, modelo | ideia | C | custo, C2 | não registrada | | base #23 |
| M-44 | C5 em taxa e em absoluto | planejado | C | C5 | não registrada | | base (reforços) |
| M-45 | minutos_humano_estimado no ticket | ideia | D | C2, C1 | medida | M-41 | v046, L3-04 |
| M-46 | Guardas do planejador com perguntas, critério estável e piso de tamanho | planejado | D | C1, C2, custo | medida | M-42 | base (planejado), v061, v044, v050, L2-04, L3-08, L5-05 |
| M-47 | Fusão de candidatos para saídas em texto | ideia | D | C2, C1 | medida | M-46 | v053, L4-03 |
| M-48 | Reserva de ids e de versões de migration para escritores paralelos | ideia | D | C1 | relato | | L6-02, L6-09 |
| M-49 | validar-fila confere aderência à semente do roadmap | ideia | D | C2 | relato | M-46 | L6-08 |
| M-50 | Alvo alcançável e lib nova com consumidor | ideia | D | C2 | relato | M-46 | L6-17 |
| M-51 | Experimento: canário no primeiro lote | ideia | D | C2 | não registrada | | base (experimentos) |

## Itens

### M-01 Contrato do veredito com objeção ancorada e meta-verificação
- status: ideia
- o que é: o veredito do juiz segue um contrato: cada objeção com arquivo:linha; objeção sem âncora não reprova; existe o estado insuficiente; a classe do defeito vem com todas as ocorrências; da 2ª tentativa em diante o juiz vê só o delta. Antes de a reprova virar retry, uma passada barata confere se cada objeção se sustenta.
- como entra no kit: schema do veredito com os campos acima e validação na saída do juiz; passo de meta-verificação entre o juiz e o retry; objeção descartada vai para o ledger (M-40) como "objeção inventada".
- detalhes executáveis:
  - números da base: Anthropic relata aprovação de 65% para 78% com esse contrato.
  - meta-verificação faz duas perguntas por objeção: "o arquivo:linha existe no diff e o trecho mostra o problema alegado?" e "a nota segue das objeções apontadas?".
  - se o veredito era reprova e não sobra nenhuma objeção válida, vira estado insuficiente, não reprova.
  - taxa de objeções inventadas entra como métrica do juiz.
- fontes: base #1, v044, L3-07

### M-02 Retry informado que só insiste com fato externo novo
- status: parcial: o retry já recebe o recorte do gate que reprovou (scripts/orquestrador/diagnostico.ts:191-209), o motivo literal do juiz (scripts/orquestrador/executor.sh:1473-1498), bloqueia diff idêntico (scripts/orquestrador/executor.sh:1208-1231) e reprovação repetida (scripts/orquestrador/executor.sh:1779-1783); falta a etiqueta externo/interno por tentativa, o diff quase igual, o braço de controle em sombra e a curva por etiqueta
- o que é: o retry leva saída do gate, objeções, diff anterior e post-mortem. Pela literatura citada, o loop só paga quando chega fato externo novo (compilador, teste, schema); sem isso o modelo não se corrige e às vezes piora, e o ganho estabiliza depois do primeiro refinamento.
- como entra no kit: o pacote do retry da base, mais etiqueta do tipo de feedback em cada tentativa e um braço de controle em sombra (reamostragem sem contexto) para provar que o contexto extra paga.
- detalhes executáveis:
  - base: assinatura repetida 2x bloqueia; diff quase igual não conta como tentativa nova; 3 rodadas e depois "repense a abordagem"; sessão nova por tentativa; saídas em arquivo e prompt com caminhos.
  - etiqueta por tentativa: externo (gate com saída nova) ou interno (só objeção do juiz).
  - na curva M-41, medir conversão por etiqueta; se reprova só do juiz não converter na 2ª tentativa, o teto para esse caso cai para 1 retry e o resto vai para bloqueio.
  - em sombra, numa amostra de reprovas, comparar a 2ª tentativa informada contra reamostragem em sessão nova sem objeções nem diff anterior; se a informada não ganhar, o retry informado não está pagando o contexto extra.
  - cada rodada de refinamento custa 2n+1 chamadas em série (v100).
- conflitos: tensão (não marcada pelo lote) entre "3 rodadas" da base e o corte para 1 retry de L1-01 nos casos de reprova só do juiz. Não decidido. Decide no PASSO 0 da etapa que pegar o item.
- fontes: base #2, v100, v051, L1-01, L5-01

### M-03 Alegação sem lastro e referência prometida e não lida
- status: ideia
- o que é: o relatório do executor é cruzado com o diff e a transcrição. Caso concreto medido no GDPval: a falha mais comum é o modelo prometer consultar a referência, não consultar e inventar no lugar.
- como entra no kit: gate mecânico sobre a transcrição stream-json (M-28) antes do juiz.
- detalhes executáveis:
  - todo arquivo listado como referência ou contexto obrigatório no ticket precisa aparecer como Read na transcrição da tentativa.
  - se não aparecer, o gate reprova antes do juiz com a objeção literal "referência X não lida".
  - alegação do relatório sem correspondência no diff ou na transcrição vira objeção ancorada.
- fontes: base #21, v046, L3-06

### M-04 Consenso entre juízes paralelos (com conflito)
- status: ideia
- o que é: vários juízes em paralelo decidem juntos. O Weaver mostra que isso só funciona com filtro de qualidade e peso medido; a média simples ajuda de forma não monotônica e a verificação por rubrica só com prompt empata ou perde para o voto majoritário.
- como entra no kit: pool de juízes avaliado no corpus do juiz (M-56), com piso de acerto e peso por juiz.
- detalhes executáveis:
  - cada juiz medido no corpus; abaixo de um piso de acerto, fica fora do pool.
  - peso por juiz igual ao acerto medido, recalculado quando o corpus muda.
  - variante de prompt que sempre concorda com outra já existente não entra no pool (sem discordância não há sinal novo).
  - voto simples entre juízes com prompts diferentes não conta como melhoria sem A/B no corpus.
  - L2-05 (aplicação ao planejador, marco D, em sombra): decompor 3 a 5 vezes com enquadramentos fixos ("mínimo de tickets", "risco primeiro", "só o verificável"); agregar em consenso, divergente e outlier; fronteira de ticket ou dependência em minoria marca o trecho como ambíguo e vai para a caixa de decisões (M-42). Custo relatado de US$ 3 a 4 por rodada com 10 agentes.
- conflitos: L3-01 está marcado como SUBSTITUI o item 25 da base. O item 25 propõe consenso entre juízes paralelos; L3-01 propõe que consenso só entre com filtro e peso medidos e que voto simples não seja aceito. Não decidido. Decide no PASSO 0 da etapa que pegar o item.
- fontes: base #25, v052, v061, L3-01, L2-05

### M-05 Gate que executa a migration antes do juiz
- status: ideia
- o que é: para ticket *-sql, done hoje é "migration proposta". Cinco bugs passaram pelo juiz e só apareceram no teste a seco humano, cada um virando ticket de conserto.
- como entra no kit: gate novo para tickets de migration, antes do juiz.
- detalhes executáveis:
  - aplicar a migration num banco efêmero (ou em transação desfeita no banco de sombra) e rodar a função com o dia de teste.
  - casos que esse gate pegaria: round(double precision, integer) em 5142 e 5169; máscara de telefone em 5070 ("(75) 98122-8387" virava "(75) [CEP]7"); 16 perguntas em vez de 17 no 5067; gravar do 5183 falhando pela PK.
- fontes: L6-07

### M-06 Token derivado do git liberado pela promoção
- status: ideia
- o que é: tokens como apolo-<id>-na-main são fato mecânico (o commit do ticket está na main), mas dependem de sessão humana. O loop ficou 17 h parado esperando tokens assim e um script ad hoc (liberar-na-main.py) foi escrito para isso.
- como entra no kit: a promoção libera sozinha todo token cuja condição é verificável no git.
- detalhes executáveis:
  - classe "token derivado" no contrato de liberações, com a condição em forma de comando git.
  - a promoção, ao terminar, avalia todas as condições e grava as liberações com o sha que as satisfaz.
- fontes: L6-13

### M-07 Revisão LLM do lote na entrada, só marcando
- status: ideia
- o que é: com o validar-fila verde (0 erro, camadas 15 e 16), um revisor LLM independente achou 5 defeitos bloqueantes no lote 4 do ADR-014. A mesma ideia aparece como debate com papéis fixos, que pegou premissa que o consenso tinha aceitado.
- como entra no kit: camada de aviso do validador na entrada: revisão LLM do lote com objeções ancoradas, que só pode marcar ticket como ambíguo ou mal fatiado, nunca reescrever; marcação vai para a caixa de decisões (M-42).
- detalhes executáveis:
  - defeitos que o revisor achou: limiar com 2 casas, escopo GHL não declarado, nota duplicada, ordem de promoção da lib, tempo do cron.
  - variante em sombra para lotes do planejador (L2-11): uma rodada com 3 papéis fixos (caçador de casos de borda, contrário, pragmático); medir contra resgates de spec do lote.
- conflitos: L6-16 propõe marco A (lote humano na entrada) e L2-11 propõe marco D (lote do planejador). Fundidos no A; a variante com papéis fica para quando o planejador existir. Decide no PASSO 0 da etapa que pegar o item.
- fontes: v061, L6-16, L2-11

### M-08 Higiene do PLAYBOOK com formato, lastro e obsolescência
- status: parcial: o critério de triagem do seed está escrito (doutrina/templates/PLAYBOOK-seed.md, K10); falta o validador de entrada (formato, lastro) e o checador de obsolescência
- o que é: a lição do PLAYBOOK tem assinatura, exige 2 ocorrências, nomeia a superfície, substitui em vez de anexar e é revertida se o defeito volta. Os lotes acrescentam formato fixo, redação a partir da tentativa que passou e lastro com detecção de obsolescência.
- como entra no kit: validador do PLAYBOOK na entrada de lição e checador determinístico periódico.
- detalhes executáveis:
  - formato literal: "categoria: NUNCA/SEMPRE faça X porque Y"; lição sem categoria, sem NUNCA/SEMPRE ou sem "porque" é rejeitada (L2-06).
  - proposta só é aceita com referência à tentativa reprovada e à tentativa corrigida que passou gates e juiz; o texto é redigido do diff da que passou (L1-05).
  - origem válida nova: "bug causado por suposição errada", a partir do post-mortem.
  - campo de lastro: ids de tentativa, commits e caminhos arquivo:símbolo (L5-02).
  - checador sem LLM marca a lição como "suspeita" quando um caminho citado some da staging ou o defeito citado foi revertido; lição suspeita sai do contexto do executor até revisão.
  - lição que cita duas superfícies sem relação é recusada e precisa ser dividida.
  - contagem de regras ativas no painel como sinal de inchaço.
- fontes: base #15, v079, v061, v031, L1-05, L2-06, L5-02

### M-09 Migration com drop ou delete recusada na entrada
- status: parcial: o aplicador já mostra o aviso de classe DROP/DELETE (scripts/orquestrador/migrations/sql.ts:133-140, scripts/orquestrador/migrations/aplicar.ts:126-134); falta a recusa na entrada (gate de ticket) e a marca "vai pela skill"
- o que é: o aplicador cancela qualquer migration com drop. `drop trigger if exists` em tabela nova, `drop table if exists pg_temp` e `delete` no corpo da função cancelaram 5140, 5170 e 5196; a sessão editou o .sql à mão ou mandou pela skill. É detalhe do MIG-A ("aviso de classe vira trava").
- como entra no kit: regra no escritor e no validador na entrada.
- detalhes executáveis:
  - recusar drop inútil em tabela criada pela própria migration.
  - drop ou delete legítimo marca o ticket como "vai pela skill" já na entrada.
- fontes: L6-12

### M-10 Validação da fila uma vez por lote, sem --no-verify
- marco: B (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: o pre-commit do validar-fila usa 45 s e não aguenta tsc em lote grande. Três lotes (49, 38 e 42 tickets) só entraram com --no-verify e um commit ficou staged sem concluir, calado. Detalhe do defeito 2026-10-07-validar-fila-timeout-deixa-tsc-orfao, que fala do timeout e não do custo por lote.
- marco B: convergência com o `validar-fila.py` do Comarka; o kit não tem pre-commit nem esse validador.
- como entra no kit: modo de validação por lote no validar-fila e prova registrada no commit.
- detalhes executáveis:
  - tsc e vitest rodam uma vez para o lote inteiro, compartilhados entre os tickets.
  - validação feita por fora grava no commit a prova (sha da base, hash do lote, resultado) e o hook aceita essa prova em vez de exigir --no-verify.
- fontes: L6-15

### M-11 Auth expirada pausa com dono e avisa o humano
- status: parcial: auth expirada já é causa `sessao` e adia sem consumir tentativa (scripts/orquestrador/decisao.ts:234, scripts/orquestrador/executor.sh:154-191), e o aviso de AMBIENTE sai na entrada e na saída (scripts/orquestrador/local-loop.sh:696-714); falta a pausa com dono e motivo próprio, e o resíduo de 1 ticket de docs/defeitos/2026-10-28-disjuntor-conta-falha-de-infra.md
- o que é: o defeito 2026-10-28-disjuntor-conta-falha-de-infra pede que falha de ambiente não conte no disjuntor. Falta a outra metade: auth expirada só o humano resolve no terminal do Mac (`/login` não funciona pelo Remote Control) e ninguém é avisado.
- como entra no kit: preflight detecta auth expirada, pausa com dono e motivo e manda aviso pela caixa de decisões (M-42).
- detalhes executáveis:
  - motivo literal na pausa: auth do claude expirada, ação exclusiva do humano no terminal do Mac.
  - a sessão não precisa mais pausar a fila à mão para o disjuntor não bloquear os prontos.
- fontes: L6-18

### M-12 Juiz por dimensão binário com teto de palavras
- status: ideia
- o que é: o juiz avalia por dimensão com nota binária, escreve a explicação antes da nota e devolve JSON por schema. A prática relatada mostra que saída intermediária sem teto vira texto prolixo.
- como entra no kit: schema do veredito por dimensão e teto de palavras nos campos livres.
- detalhes executáveis:
  - campos de texto livre do juiz, do triador e do post-mortem ganham teto de palavras no schema; acima do teto, rejeitar e pedir de novo.
  - referência da fonte: teto de 300 palavras e formato fixo resolveram a saída verbosa.
  - o resumo diário (M-36) sai em formato fixo.
- fontes: base #3, v102, L2-09

### M-13 Teto de diff no kit (limiar por repo)
- status: parcial: o mecanismo existe (diff acima de `diff_cap_linhas` vira `refatiar` sem juiz, scripts/orquestrador/decisao.ts:452-456); falta medir a aprovação por faixa de tamanho de diff antes de mexer no padrão de 2500 do template (doutrina/templates/config.json:63). O limiar é decisão por repo e não se copia o 300 da fonte
- o que é: teto de linhas por diff de ticket. A fonte (base #8) cita 300 linhas como o C8 do Comarka. No kit o gate já existe (`diff_cap_linhas`); o C8 do kit é outra regra (allowlist sobreposta, `scripts/orquestrador/gate-ticket.ts:124`).
- como entra no kit: medir a aprovação por faixa de tamanho de diff e só então rever o padrão do template; o valor é de cada repo.
- detalhes executáveis:
  - limiar: por repo (600 no CI, 2500 no template); 300 é o número da fonte e não se copia.
  - complementa M-45 (que mede o esforço esperado) e o piso de tamanho de M-46.
- fontes: base #8

### M-14 Confiança declarada pelo modelo nunca vira limiar
- status: parcial: a confiança do triador já é só registrada (scripts/orquestrador/triador/triar.ts:111,187) e a promoção do resolvedor não a lê; falta a regra escrita no CONTRATO
- o que é: a probabilidade que o modelo dá às próprias saídas é mal calibrada e puxa para excesso de confiança (com 50% de acerto real, se dá cerca de 80%).
- como entra no kit: regra de desenho do contrato: nenhum gate, roteamento ou promoção a auto do triador usa confiança declarada como limiar.
- detalhes executáveis:
  - campo de confiança no veredito, se existir, é só registrado.
  - calibrar contra o desfecho no ledger (M-40) antes de pesar em qualquer decisão.
- fontes: v048, L4-07

### M-15 Ticket com 4 blocos de handoff
- status: ideia
- o que é: o ticket ganha falhas[], fora_de_escopo[] e objetivo_pai. O handoff entre agentes precisa de objetivo, contexto como dado, artefatos e restrições; histórico inteiro ou resumo vago em prosa são as duas formas erradas.
- como entra no kit: campos no schema do ticket e regras no validador na entrada.
- detalhes executáveis:
  - 4 blocos exigidos: objetivo/objetivo_pai; contexto como lista de caminhos ou arquivo:linha; artefatos existentes a reaproveitar; restrições.
  - contexto só em prosa, sem caminho nem número, gera aviso.
  - o mesmo esquema vale para o pacote do retry (M-02) e para o material do juiz.
- fontes: base #9, v095, L2-01

### M-16 Estado do ticket só-anexar ou versionado
- status: parcial: o commit do loop já leva só as chaves do motor (8b, `9b0addc`, CONTRATO §19.1); falta versão com compare-and-swap ou ledger só-anexar
- o que é: no estado compartilhado, o modo de falha é dois agentes sobrescreverem o mesmo campo. A classe writeback teve 7 resgates em 14 dias no Comarka.
- como entra no kit: escrita de status, tentativas e writeback vira ledger só-anexar ou com versão e compare-and-swap.
- detalhes executáveis:
  - escrita com versão velha falha alto em vez de sobrescrever.
  - arquivos de estado por rodada nascem limpos; o resto da rodada anterior vai para arquivo datado.
  - medir se a classe writeback cai.
- fontes: v095, v061, L2-02

### M-17 Contradição de spec exposta, nunca resolvida em silêncio
- status: ideia
- o que é: quando o ticket diz X e o código ou a base diz Y, o executor deve declarar o conflito em vez de escolher um lado. 51% dos resgates são de spec.
- como entra no kit: campo conflitos[] no relatório do executor e status novo.
- detalhes executáveis:
  - conflitos[]: ticket diz X, código ou base diz Y, com arquivo:linha.
  - status spec_conflitante encerra a tentativa sem gastar teto e vai para o triador na classe spec.
  - o juiz reprova diff que resolveu contradição de spec sem declarar no relatório (cruza com M-03).
- fontes: v093, L2-03

### M-18 Nível de revisão 0/1/2 com marcha baixa para código crítico
- status: parcial: a classe alto/baixo do juiz já sai do diff, de path e de palavra de risco (scripts/orquestrador/juiz.ts:51-79); falta o nível 2 com pseudocódigo humano exigido na entrada
- o que é: nível de revisão decidido pelo diff e pela zona da arquitetura. Para o novo, complexo e crítico, o humano escreve o pseudocódigo (atribuído a Charity Majors).
- como entra no kit: nível calculado no despacho; regra extra no validador para o nível 2.
- detalhes executáveis:
  - ticket de nível 2 que cria lógica nova numa zona crítica (não só edita) exige pseudocódigo humano num campo do ticket; sem ele, o validador na entrada barra.
- conflitos: tensão (não marcada pelo lote) entre exigir pseudocódigo humano e o marco D (planejador escreve o lote sem humano). Não decidido. Decide no PASSO 0 da etapa que pegar o item.
- fontes: base #18, v084, L2-10

### M-19 Anti-trapaça no diff
- status: parcial: o anti-afrouxamento já existe nos testes vizinhos ampliados (scripts/orquestrador/enforcement-core.ts:658-709, 8c); falta valer para o diff inteiro e cobrir `as any`, ts-ignore, try/catch novo e teste existente alterado
- o que é: detectar no diff o que afrouxa a verificação em vez de resolver o problema.
- como entra no kit: gate mecânico sobre o diff, antes do juiz.
- detalhes executáveis:
  - padrões: assert afrouxado, .skip/.only, `as any`, ts-ignore, catch e try/catch novos, teste existente alterado.
- fontes: base #4

### M-20 Varredura de segredos e checklist auth/RLS/env
- status: parcial: a varredura de credencial já roda em toda tentativa (scripts/orquestrador/enforcement-core.ts:293-308); falta o checklist auth/RLS/env no material do juiz
- o que é: varredura de segredos e checklist de auth, RLS e env em todas as tentativas, não só na primeira.
- como entra no kit: gate mecânico em cada tentativa e checklist no material do juiz.
- detalhes executáveis:
  - roda em todas as tentativas.
- fontes: base #5

### M-21 Fila de merge com rebase e gates de novo
- status: ideia
- o que é: antes do merge na staging, rebase na ponta e gates de novo.
- como entra no kit: etapa de merge serializada.
- detalhes executáveis:
  - rebase na ponta da staging e rerodar os gates antes do merge.
- fontes: base #6

### M-22 criterios_privados no ticket
- status: ideia
- o que é: critérios que o executor não vê, usados só na verificação.
- como entra no kit: campo criterios_privados no ticket, fora do prompt do executor.
- detalhes executáveis:
  - nenhum detalhe além do nome na base.
- fontes: base #10

### M-23 Agente de testes antes do executor
- status: ideia
- o que é: um agente escreve os testes antes de o executor implementar.
- como entra no kit: etapa anterior ao executor no despacho.
- detalhes executáveis:
  - nenhum detalhe além do nome na base; relaciona com o vermelho-antes (8f) pendente.
- fontes: base #11

### M-24 Alarme de 0% de aprovação
- status: ideia
- o que é: reprova total num lote aponta para avaliador ou critério suspeito, não para o executor.
- como entra no kit: alarme sobre a curva (M-41).
- detalhes executáveis:
  - 0% de aprovação dispara suspeita sobre o juiz ou o critério antes de qualquer ação sobre os tickets (exemplo da base: dashboard 0 de 3 no 1º lote).
- fontes: base #19

### M-25 Experimento: diagnóstico antes de bloquear
- status: ideia
- o que é: experimento já listado na base: rodar um diagnóstico antes de mover o ticket para bloqueio.
- como entra no kit: em sombra, antes do bloqueio.
- detalhes executáveis:
  - nenhum detalhe além do nome na base.
- fontes: base (experimentos)

### M-26 Decisão pendente: hooks PostToolUse e Stop
- status: ideia
- o que é: decisão pendente da base: hooks PostToolUse e Stop que devolvem erro ao executor durante a tentativa.
- como entra no kit: depende da decisão; a regra atual é que mods do Claude Code entram só por --plugin-dir e só negam.
- detalhes executáveis:
  - decidir antes de qualquer etapa que toque nos hooks.
- conflitos: decisão em aberto na base, não resolvida aqui. Decide no PASSO 0 da etapa que pegar o item.
- fontes: base (decisão pendente)

### M-27 Experimento best-of-N com funil e perda do seletor
- status: ideia
- o que é: gerar N candidatos por ticket e escolher um. A literatura mostra que o seletor é o gargalo (pass@k acima de 40% contra 10@k de cerca de 30% no AlphaCode), que candidatos do mesmo modelo e prompt saem parecidos e que a seleção pelo juiz piora quando N cresce demais.
- como entra no kit: experimento em sombra com funil fixo e registro por ticket.
- detalhes executáveis:
  - ordem do funil (L4-02): gates mecânicos eliminam; sobreviventes agrupados por assinatura de comportamento (conjunto de testes e critérios que passam, mais arquivos tocados); só um representante por grupo vai ao juiz; o juiz nunca recebe todos.
  - registro por ticket: cobertura (algum candidato passou todos os gates) e seleção (o escolhido passou gates e juiz); a diferença é a perda do seletor e decide entre mais N ou melhor seletor (L4-01).
  - campo grupos_distintos: se for 1 com N maior que 1, o N extra foi custo sem diversidade.
  - N testado: 2, 3, 5; parar no menor N depois do qual a curva fica plana (L3-02).
  - os N candidatos variam modelo ou enquadramento do prompt, não só a semente; registrar similaridade entre os diffs (L3-09).
  - amostra dos candidatos que passaram os gates conferida à mão para estimar falso positivo do próprio gate.
  - só abre N ramos quando diff e critérios ficam inteiramente dentro da worktree; ticket com migration, cron, API externa ou escrita em banco de produção roda em ramo único (L5-03).
  - registrar custo por ramo desde o primeiro lote.
- conflitos: tensão (não marcada pelo lote) entre L4-01, que proíbe seleção por convergência entre candidatos, e a fonte de L4-02 (AlphaCode 2), que mantém os 10 maiores grupos, ou seja, usa o tamanho do grupo como sinal. O kit em L4-02 não ranqueia por tamanho, mas a decisão de usar ou não o tamanho do grupo fica em aberto. Decide no PASSO 0 da etapa que pegar o item.
- fontes: base (experimentos), v052, v044, v048, v053, v054, v050, L3-02, L3-09, L4-01, L4-02, L5-03

### M-28 Transcrição stream-json com extrator e taxonomia de falhas
- status: ideia
- o que é: guardar a transcrição stream-json de cada tentativa e extrair tool calls, releituras, chamadas repetidas, pico de contexto (alarme em 70%), com redação de segredos. Os lotes acrescentam contexto fixo no turno zero, classes de falha e marcadores de incerteza.
- como entra no kit: extrator rodando ao fim de cada tentativa, saída em arquivo ao lado da transcrição.
- detalhes executáveis:
  - tokens fixos do claude -p no turno zero por repo e por ticket, com teto e alarme quando CLAUDE.md, skills ou mods passam do teto; referência medida: cerca de 9 mil tokens antes da 1ª mensagem (sistema e CLAUDE.md 4,9 mil, memória 2 mil, skills 1,7 mil) (L2-07).
  - tentativa que chega à compactação é marcada e o ticket vai para refatiar.
  - 5 classes de falha por tentativa reprovada: planejamento ruim, ferramenta errada, raciocínio errado, abandono prematuro, loop repetitivo (L3-05).
  - por regra: loop = mesma tool call com os mesmos argumentos 3 vezes ou mais; abandono = fim sem rodar os critérios; o resto por LLM.
  - marcadores de incerteza contados, inclusive em PT: "provavelmente", "talvez", "imagino que", "deve ser", "perhaps", "likely"; registrar os que não têm leitura ou busca logo depois (L4-05).
  - marcador sem verificação vai para o material do juiz como ponto a conferir e para o agrupador semanal (M-40) como sinal de contexto faltando.
- fontes: base #12, v061, v046, v048, L2-07, L3-05, L4-05

### M-29 Custo por ticket e por etapa, cache e contexto enxuto do juiz
- status: parcial: custo por papel, ticket e tentativa, com tokens de cache, já é gravado (scripts/orquestrador/lib.sh:1398-1437) e o `orq custo` agrega (scripts/orq:281-310); falta custo por etapa no painel, P95, taxa de cache, alerta sobre média móvel e o contexto enxuto do juiz
- o que é: medir custo por ticket e por etapa, usar prompt caching e enxugar o material do juiz. A leitura acrescenta a régua de verificação de qualquer corte e a extração por documento em vez de documento inteiro.
- como entra no kit: custo por etapa no registro da tentativa; painel do marco C; corte só com prova.
- detalhes executáveis:
  - otimizar primeiro a etapa mais cara do custo por ticket.
  - todo corte entra só com antes e depois de custo medido e o corpus do juiz sem regressão por dimensão (M-53) (L1-09).
  - painel: dólar por ticket, tokens por ticket, P95 de latência, taxa de acerto de cache, custo por dia com alerta acima da média móvel.
  - referência do curso: contexto de 3.700 para 1.500 tokens com top 4 trechos, histórico resumido e saída de ferramenta já usada descartada; 16 para 5 centavos por execução.
  - material do juiz e recon de fonte do planejador: cada arquivo de referência vira trecho com caminho:linha mais o motivo de ser relevante, em vez de entrar inteiro (L4-06); medir no corpus o acerto com material inteiro contra extraído antes de adotar.
- fontes: base (planejado), v089, v048, L1-09, L4-06

### M-30 Roteamento do executor por risco e dificuldade
- status: parcial: o juiz já é roteado por risco (scripts/orquestrador/juiz.ts:77-79) e o executor escala só com `sub=juiz` (scripts/orquestrador/decisao.ts:586-601, 7b-4); falta rotear o executor por risco e dificuldade, em sombra
- o que é: escolher modelo e esforço do executor por risco, em sombra. A leitura mostra que, para problemas fáceis, mais rodadas no mesmo modelo rendem; para os mais difíceis, modelo maior ganha mesmo com orçamento grande de inferência.
- como entra no kit: roteamento em sombra mais uma regra de escalada por faixa.
- detalhes executáveis:
  - curva por tentativa (M-41) quebrada por faixa de dificuldade (minutos_humano_estimado de M-45 ou nível de revisão de M-18).
  - na faixa em que a 2ª e a 3ª tentativa no mesmo modelo quase não convertem, escalar o modelo já na 1ª reprova.
  - na faixa fácil, retry no modelo barato continua o padrão.
- fontes: base (planejado), v053, v048, L4-04

### M-31 Juiz num modelo abaixo do executor em risco baixo
- status: parcial: o modelo do juiz já é configurável por classe (scripts/orquestrador/juiz.ts:77-79, `modelos.juiz_baixo`); falta a medição no corpus (M-56)
- o que é: gerador grande com verificador menor rendeu mais do que o inverso (GPT-3 6B e 175B), porque gerar é mais difícil do que verificar. Ressalva: eram verificadores treinados, não juízes por prompt.
- como entra no kit: teste em sombra dentro do roteamento por risco.
- detalhes executáveis:
  - em tickets de risco baixo, juiz um modelo abaixo do executor; medir concordância com o juiz atual no corpus (M-56) antes de adotar.
  - não inverter o padrão (executor barato com juiz caro) sem medir.
- fontes: v052, L3-03

### M-32 PLAYBOOK por divulgação progressiva
- status: ideia
- o que é: arquivo fixo entra em toda volta; carregar só nome e descrição custa uma fração do corpo inteiro (944 contra 53 tokens numa skill de 116 linhas). Manter o contexto abaixo de 70%.
- como entra no kit: PLAYBOOK vira índice mais corpo por superfície.
- detalhes executáveis:
  - índice com título e uma linha por lição.
  - o prompt do executor carrega inteiro só o corpo das superfícies que a allowlist do ticket toca; o resto como índice com caminho.
  - medir tokens fixos por chamada antes e depois e C2 em sombra.
- fontes: v079, L1-04

### M-33 Avaliador de processo e agente de melhoria semanal
- status: ideia
- o que é: avaliador de processo sobre a transcrição e agente semanal que propõe diff citando tentativas, com merge humano. O SWIRL mostra que, para imitação, só serve trajetória limpa; para aprender o que falta, servem também as reprovadas com bom processo.
- como entra no kit: dois filtros diferentes conforme o uso.
- detalhes executáveis:
  - exemplo a imitar no prompt do executor (diff de referência, ticket irmão resolvido) só vem de tentativa aprovada de primeira e sem objeção do avaliador de processo.
  - o agente semanal e o ledger (M-40) também leem tentativas reprovadas com processo limpo.
  - referência: 65 para 71 no HotpotQA treinando só em GSM8K (treino de modelo; a transposição para prompt é inferência).
- fontes: base #24, v050, L5-04

### M-34 Smoke E2E na staging que abre rascunho de ticket
- status: ideia
- o que é: smoke E2E agendado na staging. Falha não pode ser só alerta: deve virar algo acionável.
- como entra no kit: falha do smoke gera rascunho de ticket com a saída anexada, que entra na caixa de decisões (M-42) para aprovação humana antes da fila; não abre PR sozinho.
- detalhes executáveis:
  - registrar custo por rodada do smoke para escolher a frequência (referência: cerca de US$ 60 por rodada, 3 vezes por semana).
- fontes: base #7, v063, L1-07

### M-35 Cota antes de despachar com degraus de 70% e 95%
- status: planejado
- o que é: checar cota de 5h e semanal antes de despachar, com troca em 95%. A leitura acrescenta um degrau intermediário.
- como entra no kit: dois limiares no despacho.
- detalhes executáveis:
  - acima de 70% da janela, ticket de risco baixo desce um degrau de modelo.
  - acima de 95%, adia.
  - ticket de risco alto nunca desce por cota, só adia.
- fontes: base (planejado), v101, L1-06

### M-36 Resumo diário com link para o artefato de cada evento
- status: ideia
- o que é: o valor do resumo vem de clicar no que parece estranho, o que só funciona se cada linha leva ao artefato real.
- como entra no kit: cada linha do resumo diário (merge, reprova, resgate, bloqueio) leva caminho do diff, da transcrição (M-28) e do veredito.
- detalhes executáveis:
  - métrica: fração de linhas com link válido igual a 100%.
  - formato fixo (M-12).
- fontes: v063, L1-08

### M-37 Promoção pendente com idade, tamanho e alarme
- status: parcial: o painel já tem o indicador "Última promoção", sempre "sem dado" (scripts/orquestrador/orq-painel.py:833-837); falta o evento PROMOCAO no contrato, idade, tamanho e alarme
- o que é: done não é produção. Captura de conversas GHL e crons do Apolo ficaram done na staging-auto por 2 dias, com o banco em zero linhas, até um recon manual. A última promoção para a main tinha sido em 15/10, com 176 commits pendentes. Detalhe do K12 (painel, "última promoção").
- como entra no kit: campo de última promoção no contrato e no painel.
- detalhes executáveis:
  - painel mostra idade e número de commits da promoção pendente.
  - alarme acima de um limite de idade ou de tamanho (limiar a definir).
- fontes: L6-14

### M-38 API em lote para rodadas sem pressa
- status: ideia
- o que é: os provedores atendem requisições em lote em até um dia, mais barato.
- como entra no kit: eval permanente do juiz (200 a 400 casos), ablação e best-of-N em sombra rodam pela API em lote durante a noite, fora da cota de 5h do executor.
- detalhes executáveis:
  - custo dessas rodadas separado no custo por etapa (M-29).
- fontes: v061, L2-08

### M-39 Teto duro de turnos e dólares por claude -p
- status: parcial: `--max-turns` já vai no executor e no juiz (scripts/orquestrador/executor.sh:885, :1177-1190), o teto por ticket é checado antes de cada chamada (scripts/orquestrador/lib.sh:1445-1475) e o triador tem `--max-budget-usd` (scripts/orquestrador/triador/modelo.ts:21-54); falta o teto em dólar por chamada no executor e no juiz
- o que é: cada chamada de claude -p tem teto duro de turnos e de dólares.
- como entra no kit: flags ou vigia no lançamento da tentativa.
- detalhes executáveis:
  - nenhum limiar na base.
- fontes: base #13

### M-40 Ledger de objeções do juiz e agrupador semanal
- status: ideia
- o que é: cada objeção do juiz registrada com o desfecho; agrupador semanal por frequência x severidade (open coding e axial coding).
- como entra no kit: ledger só-anexar e job semanal.
- detalhes executáveis:
  - recebe também as objeções inventadas (M-01), as classes de falha e os marcadores de incerteza (M-28) e a calibração da confiança declarada (M-14).
- fontes: base #14

### M-41 Curva de aprovação por tentativa
- status: parcial: a aprovação de primeira por dia já sai no `orq custo` (scripts/orq:317-329); falta 2ª e 3ª tentativa e as quebras
- o que é: taxa de aprovação na 1ª, 2ª e 3ª tentativa.
- como entra no kit: métrica no painel.
- detalhes executáveis:
  - quebras pedidas por outros itens: tipo de feedback (M-02), faixa de dificuldade (M-30, M-45).
- fontes: base #16

### M-42 Caixa de decisões no celular
- status: parcial: já existem `decisoes-pendentes.md` (scripts/orquestrador/lib.sh:1222) e o aviso de pausa por iMessage e macOS (scripts/orquestrador/resolvedor/pausa.ts:77-80, 7f-b5); falta o canal único para todas as decisões
- o que é: decisões humanas pendentes chegam ao celular.
- como entra no kit: canal único para o que precisa de humano.
- detalhes executáveis:
  - recebem: rascunho do smoke (M-34), ambiguidade marcada (M-04, M-07, M-46), auth expirada (M-11).
- fontes: base #17

### M-43 Ordem de investimento: contexto, prompt, modelo
- status: ideia
- o que é: ao atacar uma métrica, mexer primeiro no contexto, depois no prompt, por último no modelo.
- como entra no kit: regra de triagem de propostas de melhoria.
- detalhes executáveis:
  - nenhum além da ordem.
- fontes: base #23

### M-44 C5 em taxa e em absoluto
- status: planejado
- o que é: reforço já listado: medir defeito que passa como taxa e em número absoluto.
- como entra no kit: métrica no painel.
- detalhes executáveis:
  - meta da base: C5 até 5% (Comarka 7,6%).
- fontes: base (reforços)

### M-45 minutos_humano_estimado no ticket
- status: ideia
- o que é: o horizonte em que o modelo acerta 80% é bem menor que o de 50% (Claude 3.7 Sonnet: cerca de 15 min contra 59 min no METR). O teto de 300 linhas mede o tamanho do resultado; isto mede o esforço esperado.
- como entra no kit: campo no ticket, aviso do validador e quebra de C2.
- detalhes executáveis:
  - campo minutos_humano_estimado preenchido pelo planejador; validador avisa acima de um teto.
  - C2 quebrado por faixa desse campo; a faixa em que C2 cai abaixo de 70% vira o teto para refatiar.
- fontes: v046, L3-04

### M-46 Guardas do planejador com perguntas, critério estável e piso de tamanho
- status: planejado
- o que é: guardas já planejadas: recon de fonte, DAG, teto, sobre-decomposição, suposicoes[]. A leitura acrescenta perguntas antes do contrato, checagem de critério por execução repetida e piso de tamanho.
- como entra no kit: etapas do planejador antes de o ticket entrar na fila.
- detalhes executáveis:
  - 5 categorias por ticket antes de escrever: requisitos declarados, suposições implícitas, pontos de decisão, modos de falha, escolhas de gosto; decisão e gosto sem resposta viram pergunta na caixa (M-42) e o ticket não entra até ter resposta; suposição vira suposicoes[]; modo de falha vira falhas[] (L2-04).
  - cada critério executável roda 2 vezes na base antes de o ticket entrar; resultado diferente volta ao planejador como instável; junta com o vermelho-antes (8f) e o gate de teste instável (L11), pendentes (L3-08).
  - piso de tamanho: não dividir objetivo que cabe num ticket só (abaixo de 300 linhas); registrar por lote quantos filhos ficaram com diff abaixo de 30 linhas como sinal de decomposição excessiva (L5-05).
- fontes: base (planejado), v061, v044, v050, L2-04, L3-08, L5-05

### M-47 Fusão de candidatos para saídas em texto
- status: ideia
- o que é: no Archon, fundir as melhores respostas supera até a escolha pelo oráculo; ranquear antes e fundir só as 5 melhores supera fundir todas.
- como entra no kit: só onde a saída é texto, não diff: lote do planejador, decomposição, relatório do triador.
- detalhes executáveis:
  - cadeia crítico, ranqueador, fusão das 5 melhores contra a escolha de uma, medida no corpus próprio.
  - regras de ordem da fonte: primeira camada é geração; uma técnica por camada; crítico antes de ranqueador ou fusor; gerador de teste seguido de avaliador.
  - para diff de código não fundir.
- fontes: v053, L4-03

### M-48 Reserva de ids e de versões de migration para escritores paralelos
- status: ideia
- o que é: sessões e escritores em paralelo colidem em números sequenciais. Três colisões de id em dois dias (lote de 49 deslocado +50; lote 4 do ADR-014 colidindo com o de 38 em 11 ids, 3 já done; 5179/5180 duplicados), cada uma com renumeração manual e um publicar.sh morto. A regra de faixa de migration (K11a) confere a faixa, não a unicidade.
- como entra no kit: comando de reserva e checagem de unicidade no validador.
- detalhes executáveis:
  - `orq reservar-ids N` grava a faixa reservada na origin antes de a sessão escrever (a K10 decidiu id sequencial global, mas não há reserva).
  - validador recusa versão de migration repetida entre tickets pendentes e arquivos já no diretório.
  - validador recusa cria_novo fora da allowlist.
- fontes: L6-02, L6-09

### M-49 validar-fila confere aderência à semente do roadmap
- status: ideia
- o que é: o escritor v0 passou no gate F0 (12 de 13 no validar-fila), mas a revisão humana reescreveu 13 de 13; no lote F1-2, 0 de 7 utilizáveis.
- como entra no kit: check que confronta o ticket com a semente de origem antes de contar como ticket bom.
- detalhes executáveis:
  - comparar deps, tabelas e critérios citados na semente com os do ticket.
- fontes: L6-08

### M-50 Alvo alcançável e lib nova com consumidor
- status: ideia
- o que é: o 1248 implementou num componente que nenhuma página importa e foi o único do lote de 38 a não fechar; o 5163 ficou done sem consumidor.
- como entra no kit: regra no validador e no planejador.
- detalhes executáveis:
  - validador confere que o arquivo alvo é alcançável a partir de uma rota ou página.
  - planejador lista lib nova sem consumidor.
- fontes: L6-17

### M-51 Experimento: canário no primeiro lote
- status: ideia
- o que é: experimento já listado: soltar um canário antes do primeiro lote de um repo.
- como entra no kit: no fluxo de repo novo.
- detalhes executáveis:
  - motivação na base: dashboard 0 de 3 no 1º lote.
- fontes: base (experimentos)

### M-52 Autopreferência do juiz do mesmo modelo (com conflito)
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: o avaliador do mesmo modelo tende a aprovar o próprio resultado ("everything looks good" em 94% das instâncias de matemática no self-refine); autopreferência citada de 10% para ChatGPT e 25% para Claude (atribuição a conferir). O autor não sabe se é correlação ou causa.
- como entra no kit: medição no corpus do juiz (M-56).
- detalhes executáveis:
  - medir a aprovação indevida quando juiz e executor são o mesmo modelo.
  - se o C5 do juiz no corpus ficar acima de 5% e a diferença contra um juiz de outro modelo passar de 10 pontos, reabrir o item descartado como experimento em sombra.
- conflitos: pressiona o descarte de "juiz de outra família de modelo" (base, Descartado por ora). O lote marcou como NOVO, não como CONTRADIZ, mas o critério de reabertura mexe numa decisão tomada. Não decidido. Decide no PASSO 0 da etapa que pegar o item.
- fontes: v100, L1-02

### M-53 Guardrail x north star com gate de regressão por dimensão
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: separar métricas que não podem cair (guardrail) da que se quer subir (north star). Exemplo didático: prompt "mais confiante" subiu relevância +5 e derrubou groundedness -12 e citação de 100% para 88%.
- como entra no kit: toda mudança no prompt do executor ou do juiz roda o corpus e gera tabela de delta por dimensão contra a linha de base versionada.
- detalhes executáveis:
  - qualquer dimensão vermelha bloqueia o merge da mudança, mesmo com C2 subindo.
  - casos novos vêm só de incidentes reais, nunca dos exemplos usados para escrever o prompt.
- fontes: base #22, v088, L1-03

### M-54 N filas por repo, cada uma com base, pausa e resolvedor
- status: ideia
- o que é: o Comarka roda plataforma e apolo com filas, staging e worktree próprias. A pausa global de uma sessão segurou os dois loops; o painel não pausa o segundo; o resolvedor só enxerga docs/fila; o validar-fila valida contra a base errada e critério que compara com a base nasce "reprovado por dívida pré-existente".
- como entra no kit: conceito de N filas por repo no kit.
- detalhes executáveis:
  - cada fila com base, staging, pausa e resolvedor próprios; caminho da fila configurável, não docs/fila fixo.
  - validar-fila roda contra a base da fila (staging-apolo, não staging-auto).
- fontes: L6-06

### M-55 Versão do CLI no preflight e espera do limite pelo CLI
- marco: A (mudou na etapa MELHORIAS-0)
- status: parcial: o M3 foi feito na L5a (scripts/orquestrador/lib.sh:928, scripts/orquestrador/decisao.ts:237-238); faltam M2 (versão mínima do CLI no preflight) e M4 (espera do limite pelo CLI)
- o que é: a mensagem de limite mudou entre versões do CLI e o limite virou reprova até alguém notar. O M3 (regex de limite) já está no kit; M2 e M4 do handoff não aparecem no PECAS.
- como entra no kit: preflight e configuração do claude -p.
- detalhes executáveis:
  - M2: registrar e exigir versão mínima do claude no preflight, com aviso quando a versão muda.
  - M4: `CLAUDE_CODE_RETRY_WATCHDOG_MAX_USAGE_LIMIT_WAIT_MS` para o CLI esperar o limite em vez do cooldown do motor, só depois do M3.
- fontes: L6-19

### M-56 Eval permanente do juiz
- marco: A (mudou na etapa MELHORIAS-0)
- status: planejado
- o que é: corpus próprio do juiz rodado de forma permanente, já planejado e com reforços listados na base.
- como entra no kit: corpus versionado e rodada a cada mudança de juiz ou executor.
- detalhes executáveis:
  - incidente vira caso; divisão 75/25; 200 a 400 casos; alvo de 40% de discordância; diff de referência.
  - base para M-04, M-27, M-31, M-52, M-53, M-57, M-59, M-61.
- fontes: base (planejado e reforços)

### M-57 Viés de confiança: material do juiz com e sem alegações
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: testar se o juiz muda o veredito quando lê as alegações do executor.
- como entra no kit: A/B no corpus (M-56).
- detalhes executáveis:
  - mesmo caso com e sem o relatório do executor no material.
- fontes: base #20

### M-58 Benchmark público não é meta
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: régua só com corpus próprio.
- como entra no kit: regra de governança das métricas.
- detalhes executáveis:
  - nenhuma mudança é justificada por benchmark público.
- fontes: base #26

### M-59 Juiz com enquadramento adversarial como variante A/B
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: variante do juiz instruída a procurar o defeito.
- como entra no kit: A/B no corpus (M-56).
- detalhes executáveis:
  - pela regra de M-04, variante que sempre concorda com a atual não agrega.
- fontes: base #27

### M-60 Platô do harness: mudança que não mexe C2 nem C5 é encerrada
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: mudança no harness que não move C2 nem C5 é encerrada.
- como entra no kit: regra de fechamento de etapa.
- detalhes executáveis:
  - medir pelo gate por dimensão (M-53).
- fontes: base #28

### M-61 Experimento: ablação de scaffolding
- marco: A (mudou na etapa MELHORIAS-0)
- status: ideia
- o que é: experimento já listado: retirar peças do harness uma a uma e medir o efeito.
- como entra no kit: em sombra, sobre o corpus.
- detalhes executáveis:
  - rodar pela API em lote (M-38).
- fontes: base (experimentos)
## Conflitos em aberto
- M-04: L3-01 marcado como SUBSTITUI o item 25 da base (consenso simples contra consenso com filtro e peso medidos). Decide no PASSO 0 da etapa que pegar o item.
- M-52: L1-02 pressiona o descarte de "juiz de outra família de modelo" com critério de reabertura. Decide no PASSO 0 da etapa que pegar o item.
- M-27 (tensão da consolidação): L4-01 proíbe seletor por convergência, mas a fonte de L4-02 usa o tamanho do grupo. Decide no PASSO 0 da etapa que pegar o item.
- M-02 (tensão da consolidação): 3 rodadas da base contra corte para 1 retry de L1-01. Decide no PASSO 0 da etapa que pegar o item.
- M-18 (tensão da consolidação): pseudocódigo humano em zona crítica contra o marco D sem humano. Decide no PASSO 0 da etapa que pegar o item.
- M-07 (tensão da consolidação): L6-16 no marco A, L2-11 no marco D. Decide no PASSO 0 da etapa que pegar o item.

## Diário de leitura
Extração automática dos 107 vídeos em 24/10/2026 (index.json e insights). Releitura crua, transcrição inteira, em 28/10/2026: 5 vídeos no lote 0 (v025, v037, v043, v105, v106) e 24 nos lotes 1 a 5. Os outros 78 estão marcados como "só extração"; v107 tem o mesmo título de v105 e é provável duplicata, a conferir. O lote 6 não leu vídeos: leu 19 handoffs de 15 a 18/10/2026 em pipeline/leitura-motor/handoffs/, em 28/10/2026, e rendeu 20 itens (13 na fila, 7 na seção final).

| vídeo | título | leitura | rendimento | data |
|---|---|---|---|---|
| v001 | Agents in Production: Evals, Hallucinations & Memory / Agentic AI Workshop, S3 | só extração | só extração | 24/10/2026 |
| v002 | Start a 1-Person Business with Claude (4 HOUR COURSE 2026) | só extração | só extração | 24/10/2026 |
| v003 | GoHighLevel AI Agents Can RUN Your Whole CRM NOW! | só extração | só extração | 24/10/2026 |
| v004 | Build & Sell Grok Bots (2 Hour Course) | só extração | só extração | 24/10/2026 |
| v005 | GoHighLevel AI Super Agents Full Tutorial (Beginner to Pro) | só extração | só extração | 24/10/2026 |
| v006 | GoHighLevel’s NEW AI Managed Agents Are INSANE… Full Tutorial | só extração | só extração | 24/10/2026 |
| v007 | This AI Demo Sells Your Service Before You Pitch (FREE Voice Agent) | só extração | só extração | 24/10/2026 |
| v008 | How I Sell GoHighLevel AI To Real Estate Agents For $997/mo (Copy This Setup) | só extração | só extração | 24/10/2026 |
| v009 | GoHighLevel AI Agents: Beginner’s Guide (Step-by-Step Tutorial) | só extração | só extração | 24/10/2026 |
| v010 | 3x Lead Conversions with AI Text Agents in GoHighLevel CRM | só extração | só extração | 24/10/2026 |
| v011 | The Ultimate GoHighLevel AI Agent Studio Tutorial (2026) | só extração | só extração | 24/10/2026 |
| v012 | 🔵 How To Use GoHighLevel MCP With Voice AI Agents / Full Step-By-Step Guide (2026) | só extração | só extração | 24/10/2026 |
| v013 | Watch me Set Up GoHighLevel Managed AI Sales Agents (Live Walkthrough) | só extração | só extração | 24/10/2026 |
| v014 | Meta Ad’s Biggest Update of 2026 🔥 / Watch before it’s too late | só extração | só extração | 24/10/2026 |
| v015 | Hermes Agent Full Guide / Build An AI Media Buyer In 35 Minutes | só extração | só extração | 24/10/2026 |
| v016 | AI Can Now Run Your Meta Ads on Autopilot (Research to Scale) | só extração | só extração | 24/10/2026 |
| v017 | How I Automated Alex Hormozi's Entire Ad Strategy With AI | só extração | só extração | 24/10/2026 |
| v018 | I Built an Entire Meta Ads Campaign With AI (Agent Zero Skills) | só extração | só extração | 24/10/2026 |
| v019 | How we Automated Meta Ads with 3 AI Systems | só extração | só extração | 24/10/2026 |
| v020 | Watch AI create my entire Meta ads campaign from scratch (targeting, budget, ad, etc.) | só extração | só extração | 24/10/2026 |
| v021 | Learn 97% of Meta Ads in Under 19 minutes | só extração | só extração | 24/10/2026 |
| v022 | Maestri: O App que Faz Vários Agentes de IA Programarem Juntos por Você! | só extração | só extração | 24/10/2026 |
| v023 | Maestri, o canvas infinito para orquestrar agentes de IA | só extração | só extração | 24/10/2026 |
| v024 | Building the future of agents with Claude | relido cru (lote 1) | baixo, conversa institucional da Anthropic; limpeza de tool results com lápide e memória já estão cobertas por saídas em arquivo e PLAYBOOK. | 28/10/2026 |
| v025 | Claude Agent SDK [Full Workshop], Thariq Shihipar, Anthropic | relido cru (lote 0) | baixo | 28/10/2026 |
| v026 | Introduction to Claude Agent SDK Series | só extração | só extração | 24/10/2026 |
| v027 | Claude Agent SDK Tutorial - Build AI Agents with Claude Code | só extração | só extração | 24/10/2026 |
| v028 | Skills vs MCP vs RAG vs Memory: What AI Agents Need to Know | só extração | só extração | 24/10/2026 |
| v029 | Architecting Agent Memory: Principles, Patterns, and Best Practices, Richmond Alake, MongoDB | relido cru (lote 5) | baixo, propaganda de MongoDB e taxonomia de memória sem número, sem regra e sem medição; zero itens | 28/10/2026 |
| v030 | AI Agent Memory: Building Self-Improving Agents | só extração | só extração | 24/10/2026 |
| v031 | Turning Agent Memory Into Skills That Work, Will Lyon, Neo4j | relido cru (lote 5) | médio, a ideia de skill ancorada em evidência com detecção de obsolescência e divisão por coerência melhora o item 15; o ganho medido (SkillsBench) aparece sem número | 28/10/2026 |
| v032 | What AI Agent Skills Are and How They Work | só extração | só extração | 24/10/2026 |
| v033 | The Four Types of Memory Every AI Agent Needs | só extração | só extração | 24/10/2026 |
| v034 | Human in the Loop Is Not a Governance Strategy for Agentic AI | só extração | só extração | 24/10/2026 |
| v035 | Build a Human-in-the-Loop AI Agent with LangGraph / Full LLM Coding Tutorial | só extração | só extração | 24/10/2026 |
| v036 | What is Human In The Loop with AI? How HITL Shapes AI Systems | só extração | só extração | 24/10/2026 |
| v037 | From Vibes to Production: Evaluating and Shipping AI Agents That Work 101, Laurie Voss, Arize AI | relido cru (lote 0) | médio | 28/10/2026 |
| v038 | Evaluating Large Language Models / Why Evals Matter / Part 1 | só extração | só extração | 24/10/2026 |
| v039 | AI Agent evaluation: A complete guide to measuring performance | só extração | só extração | 24/10/2026 |
| v040 | Agent Evals: Test, Score & Improve Your AI Agents in Production / Inngest | só extração | só extração | 24/10/2026 |
| v041 | How to evaluate agents in practice | só extração | só extração | 24/10/2026 |
| v042 | How to Evaluate Agents in Production | só extração | só extração | 24/10/2026 |
| v043 | How to build self-improving agents (full walkthrough) | relido cru (lote 0) | médio | 28/10/2026 |
| v044 | Vídeo do YouTube | relido cru (lote 3) | baixo, só a meta-verificação (DeepSeekMath V2) e a validação por execução repetida de tarefa gerada (Absolute Zero) servem; o resto é fine-tuning e inteligência por watt | 28/10/2026 |
| v045 | Vídeo do YouTube | só extração | só extração | 24/10/2026 |
| v046 | Vídeo do YouTube | relido cru (lote 3) | médio, traz o gap entre os horizontes de 50% e 80% com números, uma taxonomia de falhas do agente e a falha "promete ler a referência e não lê"; metade do vídeo é tendência de mercado | 28/10/2026 |
| v047 | Vídeo do YouTube | só extração | só extração | 24/10/2026 |
| v048 | Vídeo do YouTube | relido cru (lote 4) | médio, traz a ordem exata do funil de seleção do AlphaCode 2 com números, a perda medida entre cobertura e seleção e a extração por documento do Search-o1; o resto é pré-treino e logística de aula | 28/10/2026 |
| v049 | Vídeo do YouTube | só extração | só extração | 24/10/2026 |
| v050 | Vídeo do YouTube | relido cru (lote 5) | médio, traz dois casos em que a técnica NÃO funciona (ação irreversível; problema pequeno) e um achado medido sobre filtrar por processo versus por resultado, mas tudo é treino de modelo e a ponte para o kit é indireta | 28/10/2026 |
| v051 | Vídeo do YouTube | relido cru (lote 5) | baixo, testes públicos e privados repetem o item 10 e retry com feedback repete o item 2; sobra só a ressalva de que o feedback não ajuda o modelo base sozinho | 28/10/2026 |
| v052 | Vídeo do YouTube | relido cru (lote 3) | médio, a parte sobre o Weaver traz filtro e pesos medidos para o consenso de juízes e um resultado negativo para a verificação por rubrica feita só com prompt; o resto é treino de verificador e não serve ao kit | 28/10/2026 |
| v053 | Vídeo do YouTube | relido cru (lote 4) | médio, traz a lacuna geração e verificação com o voto majoritário estagnando, a repartição por dificuldade entre revisão sequencial e modelo maior e a fusão do Archon com regras de ordem entre operadores; metade é revisão de aula anterior | 28/10/2026 |
| v054 | Vídeo do YouTube | relido cru (lote 4) | baixo, é panorama de LLMs e logística do curso; o único dado novo (3 ou 4 corretas em 10.000 amostras) só reforça L4-01 | 28/10/2026 |
| v055 | We replaced our sales team with 20 AI agents, here’s what happened next / Jason Lemkin (SaaStr) | só extração | só extração | 24/10/2026 |
| v056 | AI AGENTS MASTERCLASS 4 HOURS: Build & Sell (2026) | só extração | só extração | 24/10/2026 |
| v057 | I Replaced My Marketing Team With 3 AI Agents (Here’s The Workflow) | só extração | só extração | 24/10/2026 |
| v058 | Build AI Agent Teams Better Than 99% of People (Grok Bot) | só extração | só extração | 24/10/2026 |
| v059 | I Replaced My Entire Team With AI Agents (Here's How) | só extração | só extração | 24/10/2026 |
| v060 | HERMES AGENT FULL COURSE 3 HOURS: Build & Sell (2026) | só extração | só extração | 24/10/2026 |
| v061 | AI Agents Full Course 2026: Master Agentic AI (2 Hours) | relido cru (lote 2) | médio, 7 itens aproveitáveis (formato de regra, contexto fixo medido, consenso com enquadramentos, perguntas reversas, debate, batch), quase tudo relato sem medida, e o resto é técnica de prompt já coberta ou negócio. | 28/10/2026 |
| v062 | Build & Sell Claude Code Operating Systems (2+ Hour Course) | só extração | só extração | 24/10/2026 |
| v063 | Most Valuable Skill of 2026: Managing AI Agents | relido cru (lote 1) | baixo, quase tudo é opinião e venda de Devin; sobram o smoke E2E que dispara triagem e o resumo diário com link para o artefato real. | 28/10/2026 |
| v064 | Marketing Agents Masterclass (GROW your startup) | só extração | só extração | 24/10/2026 |
| v065 | The $1M+ Solo AI Agent Business (Full Course) | só extração | só extração | 24/10/2026 |
| v066 | 8 ChatGPT Agents That Do My Work for Me (Steal These) | só extração | só extração | 24/10/2026 |
| v067 | AI Agents for Marketing are Actually HERE - Full Build of Your First One | só extração | só extração | 24/10/2026 |
| v068 | AI Agents run my business and life (Andrew Wilkinson) | só extração | só extração | 24/10/2026 |
| v069 | How to Start an AI Marketing Agency (Step-by-Step) | só extração | só extração | 24/10/2026 |
| v070 | How I Run A 0-Employee Marketing Agency With AI Tools | só extração | só extração | 24/10/2026 |
| v071 | Marketing Engineer: The $1M Job with AI Agents | só extração | só extração | 24/10/2026 |
| v072 | How I Run a Marketing Agency With 6 AI Agents | só extração | só extração | 24/10/2026 |
| v073 | Become AI Native in less than 60 mins | só extração | só extração | 24/10/2026 |
| v074 | Y Combinator Is Funding AI Agencies (And Why You’re Not Ready) | só extração | só extração | 24/10/2026 |
| v075 | How Top 1% AI-Native Organizations Actually Make Money / Harvard Business School, Rem Koning | só extração | só extração | 24/10/2026 |
| v076 | Building And Structuring An AI Native Company | só extração | só extração | 24/10/2026 |
| v077 | How to Build an AI-Native Services Company | só extração | só extração | 24/10/2026 |
| v078 | The Anatomy Of A Top 1% AI-Native Agency | só extração | só extração | 24/10/2026 |
| v079 | How AI agents & Claude skills work (Clearly Explained) | relido cru (lote 1) | médio, contagem de tokens de contexto fixo contra divulgação progressiva e o método de gravar a regra só depois da execução corrigida. | 28/10/2026 |
| v080 | What Are AI Agents Really About? | só extração | só extração | 24/10/2026 |
| v081 | How AI Agents Actually Work (Every Piece Explained & Built) | só extração | só extração | 24/10/2026 |
| v082 | The Four Types of Memory Every AI Agent Needs | só extração | só extração | 24/10/2026 |
| v083 | What Are Hierarchical AI Agents? Solving Context & Task Challenges | relido cru (lote 2) | baixo, os modos de falha do planejador (dependência perdida, sobre-decomposição) e o telefone sem fio já estão nas guardas do planejador e no item 9. | 28/10/2026 |
| v084 | Build AI Corporations: Stop managing agents and start architecting hierarchies. | relido cru (lote 2) | baixo, os 4 pilares da spec já existem como fora_de_escopo[], allowlist e critérios; sobra a ideia de marcha baixa para código crítico novo. | 28/10/2026 |
| v085 | Multi-Agent Patterns: Subagents, Handoffs, Skills, Router / NVIDIA Agentic AI Course 1.4 | só extração | só extração | 24/10/2026 |
| v086 | Build Advanced Multi-Agent AI Systems with LangGraph / Sub-Agents, Handoffs & Router Patterns | só extração | só extração | 24/10/2026 |
| v087 | Smart Model Routing in Omnigent / Reduce Coding Agent Costs | só extração | só extração | 24/10/2026 |
| v088 | 7.3 - Evaluating AI Agents: Golden Sets, LLM-as-Judge & Catching Regressions | relido cru (lote 1) | médio, o caso da regressão escondida (relevância sobe, groundedness cai 12 pontos) dá forma concreta ao gate por dimensão; o resto repete o eval já planejado. | 28/10/2026 |
| v089 | 7.4 - AI Agent Cost Control: 6 Levers to Cut Tokens & Latency | relido cru (lote 1) | médio, números concretos de antes e depois, mas as alavancas já estão no plano (teto, roteamento, cache, contexto); o que acrescenta é a régua de verificação do corte e as métricas do painel. | 28/10/2026 |
| v090 | 6.4 - AutoGen Explained: Multi-Agent Orchestration as a Conversation | só extração | só extração | 24/10/2026 |
| v091 | 6.2 - Microsoft Agent Framework and Semantic Kernel: Build an AI Agent in Code | só extração | só extração | 24/10/2026 |
| v092 | 6.1 - Agent Frameworks Explained: The Landscape and How to Choose | só extração | só extração | 24/10/2026 |
| v093 | 5.4 - Build a Multi-Agent Research Assistant: Planner, Researchers, Writer & Critic (Full Build) | relido cru (lote 2) | baixo, repete orquestrador, crítico com teto, fan-out limitado e trilha por spans já cobertos; só a regra de expor contradição em vez de escolher lado é nova. | 28/10/2026 |
| v094 | 5.3 - Debate, Voting & Consensus: Make AI Agents Disagree to Get Better Answers | só extração | só extração | 24/10/2026 |
| v095 | 5.2 - How AI Agents Talk: Message Passing, Blackboards & Handoffs | relido cru (lote 2) | médio, dá o contrato de handoff com 4 campos e o modo de falha de estado compartilhado sobrescrito (versionar ou só anexar). | 28/10/2026 |
| v096 | 5.1 - Orchestrator & Worker Agents: Turn One AI Agent Into a Team | só extração | só extração | 24/10/2026 |
| v097 | Deep Agents Series #3: Build Subagents with the Orchestrator-Worker Pattern | só extração | só extração | 24/10/2026 |
| v098 | Orchestrator-Worker Pattern Explained / How Enterprise AI Agents Coordinate Tasks | só extração | só extração | 24/10/2026 |
| v099 | The Agentic Engineer Workflow You Need In 2026 | relido cru (lote 1) | baixo, fluxo pessoal com 4 terminais e opiniões; nada que o kit já não tenha (worktree, esforço por tarefa, PR pequeno). | 28/10/2026 |
| v100 | Orchestrator-Workers & Evaluator-Optimizer - Agent Architectures & Design Patterns | relido cru (lote 1) | alto, traz as medidas de autocorreção sem fato externo e de autopreferência do avaliador, que mexem no retry e no descarte do juiz de outra família. | 28/10/2026 |
| v101 | Como Orquestrar Agentes de IA com Uma Skill DE GRAÇA #claudecode #codex #agentesdeia #ia #iagratis | relido cru (lote 1) | baixo, demo de skill de roteamento; só o degrau de 70% de cota é número novo. | 28/10/2026 |
| v102 | Mastering Multi-Agent Orchestration with Google Cloud ADK / Build with AI 2026 / GDG Vaasa | relido cru (lote 2) | baixo, demo genérica; único dado útil é o erro de saída verbosa corrigido com teto de 300 palavras e formato fixo. | 28/10/2026 |
| v103 | Agentic AI Frameworks Explained: Workflows, Multi-Agent, & Production | só extração | só extração | 24/10/2026 |
| v104 | Multi-Agent AI Orchestration Explained: 5 Frameworks Compared (May 2026) | só extração | só extração | 24/10/2026 |
| v105 | Como a Anthropic faz Code Review (o que dá pra copiar) | relido cru (lote 0) | médio | 28/10/2026 |
| v106 | Harness engineering não basta Por que a IA entrega resultados não confiáveis? | relido cru (lote 0) | baixo | 28/10/2026 |
| v107 | Como a Anthropic faz Code Review (o que dá pra copiar) | só extração | provável duplicata de v105 (mesmo título), conferir | 24/10/2026 |

## Defeitos registrados nesta etapa
- L6-03, parte do motor: a pausa não guarda o pid do dono e não se reconhece órfã. `docs/defeitos/2026-10-28-pausa-orfa-sem-pid.md`. Fontes: HANDOFF-15out-loop-apolo.md, HANDOFF-17out-tarde-migrations-lote38.md.
- L6-05, parte do motor: a branch alvo local diverge da origin sem ninguém ver. `docs/defeitos/2026-10-28-staging-local-diverge-da-origin.md`. Fonte: HANDOFF-16out-noite-migrations-tokens.md.
- L6-11 (camadas 15 e 16 do validador do Comarka) já estava registrado: camada 15 portada no 8c, camada 16 aberta em `docs/migracao-comarka.md`, linha do `457856c`, pedaço (5).

## Fora do motor (ficam no Comarka)
- L6-01: o `autocommit_status_fila` do loop do Comarka faz push sem `pull --rebase` e, em 15/10 às 13:28, colidiu com o `publicar.sh`. O motor do kit não pusha (D11); o push do autocommit já está fora do motor em `docs/migracao-comarka.md`. Fonte: HANDOFF-15out-f1-lote1-apolo.md.
- L6-04: o `publicar.sh` do Comarka faz cherry-pick só do sha passado e perde os commits de baixo quando a origin/main andou; devia recusar ou rebasear com mais de um commit à frente. Script do repo, sem par no kit. Fonte: HANDOFF-17out-madrugada.md.

## Lições candidatas (decisão do Lucas, não estão no PLAYBOOK)
- L6-10: classe de bloqueio vista 2 vezes ganha camada de aviso no validador na entrada, citando o caso. 1058 e 1060 bloquearam 2 vezes cada pela mesma classe (fixture com id não UUID). Ataca C1. Fonte: HANDOFF-15out-f1-lote1-apolo.md.
- L6-20: como desenhar um lote que drena sem humano. A noite de 17/10 aprovou 58 tickets com: lógica em funções SQL; cadeia por id, nunca por token humano; só o TS que lê tabela nova espera migration aplicada; arquivo compartilhado serializado por dependência; critério que compara com a base é alvo, nunca guarda. Hoje só está em handoff e no aprendizados.md do Comarka; é a receita que o planejador do marco D precisa seguir. Ataca C2. Fontes: HANDOFF-16out-noite-lote-49-apolo.md, HANDOFF-16out-lote3-comercial.md.
