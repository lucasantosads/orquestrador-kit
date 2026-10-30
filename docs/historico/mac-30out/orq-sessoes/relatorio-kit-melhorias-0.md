# Relatório: ETAPA MELHORIAS-0 (fila única de melhorias no git do kit)

Worktree `~/Projetos/_worktrees/kit-melhorias`, branch `kit/melhorias`, base `c6d9de4`. 28/10/2026.

## PASSO 0: leitura (entregue; nada escrito no kit)

Lidos inteiros: `~/orq-sessoes/leitura-videos/MELHORIAS-proposta.md` (777 linhas, M-01 a M-61), `CLAUDE.md`,
`docs/PECAS.md` (1470 linhas), a lista de `docs/defeitos/` (19 arquivos) e `docs/migracao-comarka.md`.
Conferência por leitura e grep no motor do kit (`scripts/orquestrador/**`, `scripts/orq`, `doutrina/`,
`schemas/`). Nada foi executado; o Comarka não foi aberto.

### Tabela

"existe?" é sobre o motor do kit, não sobre o Comarka. Status proposto no vocabulário da peça P1 (c).

| M-NN | existe? | arquivo:linha | status proposto |
|---|---|---|---|
| M-01 | não | veredito hoje é `{aprovado, motivo, criterios_falhos}` sem âncora (`juiz.ts:676-679`); ilegível vira ADIADO, não "insuficiente" (`executor.sh:892-901`) | ideia |
| M-02 | parcial | o retry já recebe: saída do gate em recorte, arquivo, linha, esperado/obtido (`diagnostico.ts:191-209`, `gates.ts:426,529-535`); motivo do juiz LITERAL e criterios_falhos do juiz (`executor.sh:1473-1498`, ticket 623); permissões negadas (`diagnostico.ts`, campo `permissoes_negadas`); prompt "REPROVAÇÃO ANTERIOR (corrija exatamente isto)" (`executor.sh:489-491`); mesma worktree com o commit anterior (`executor.sh:1537-1540`); diff idêntico bloqueia sem juiz (`executor.sh:1208-1231`); 2ª reprovação igual (mesmo sub, mesmo diff) bloqueia (`executor.sh:1779-1783`, `decisao-cli.ts:98`, 7b-4) | parcial: falta etiqueta externo/interno por tentativa, "diff quase igual" (hoje só idêntico por sha256), braço de controle em sombra e a curva por etiqueta |
| M-03 | não | o juiz já vê mensagens de commit rotuladas como declaração do agente (8e, `juiz-commits`); nenhum gate cruza referência do ticket com Read da transcrição (não há transcrição, ver M-28) | ideia |
| M-04 | não | um juiz por tentativa (`executor.sh:811-910`) | ideia |
| M-05 | não | o aplicador (MIG-A) aplica depois, com humano; nada roda a migration antes do juiz | ideia |
| M-06 | não | `liberacao_ok` só lê `liberacoes.json` (`lib.sh`, K8b-1); nenhuma condição git gera liberação | ideia |
| M-07 | não | o gate de ticket é estático e por regra (`gate-ticket.ts`, tabela `REGRAS:~110-140`) | ideia |
| M-08 | parcial | critério de triagem do seed escrito (`doutrina/templates/PLAYBOOK-seed.md`, K10); sem validador de formato, lastro ou obsolescência | parcial: falta validador de entrada (formato NUNCA/SEMPRE…porque, lastro arquivo:símbolo) e checador de obsolescência |
| M-09 | parcial | o aplicador classifica DROP/TRUNCATE/DELETE e mostra "AVISO de classe" (`migrations/sql.ts:133-140`, `migrations/aplicar.ts:126-134`); regra E barra DDL em prefixo (`enforcement-core.ts`, K11a-4a). PECAS:1468 "Aviso de classe vira trava" pendente | parcial: aviso existe só no aplicador; falta recusa na entrada (gate de ticket) e a marca "vai pela skill" |
| M-10 | não | o kit não tem pre-commit nem `validar-fila.py`; o gate de ticket não executa tsc/vitest (executar é 7d-2/1b, pendentes em PECAS:1310, 1403). Timeout já registrado em `docs/defeitos/2026-10-07-validar-fila-timeout-deixa-tsc-orfao.md` | ideia (ver pergunta 4) |
| M-11 | parcial | auth expirada reconhecida como causa `sessao` (`decisao.ts:234`, K11a-3; `lib.sh:1135`), adia sem consumir tentativa (`executor.sh:154-191`, probe; `preflight_ou_adia` `executor.sh:1869-1885`); aviso de AMBIENTE na entrada e na saída (`local-loop.sh:696-714`, 7b-5); pausa com dono existe no resolvedor (7f-b7) | parcial: falta pausa com dono e motivo "ação exclusiva do humano no terminal do Mac" disparada pela auth, e o resíduo de 1 ticket do defeito `2026-10-28-disjuntor-conta-falha-de-infra.md` |
| M-12 | não | veredito binário único, sem dimensão nem teto de palavras (`juiz.ts:219-221,676-679`) | ideia |
| M-13 | sim (mecanismo) | `diff_cap_linhas` acima do cap = `refatiar` sem juiz (`decisao.ts:452-456`), nunca escala (`decisao.ts:539-547`); valor 600 no CI e no fixture (`_referencia-ci/000-config.ci.json:68`, `fixture/docs/fila/000-config.json:101`), 2500 no template (`doutrina/templates/config.json:63`); cap declarado `diff_cap_ticket` no gate de ticket. A proposta erra ao dizer "falta no kit"; e o C8 do kit é outra regra (allowlist sobreposta, `gate-ticket.ts:124`) | parcial: o gate existe; falta só o limiar 300, que é valor de config por repo (pergunta 3) |
| M-14 | parcial | a confiança do triador é só registrada (`triador/triar.ts:41,111,187`); a promoção do resolvedor não a lê (`resolvedor/promocao.ts`, sem ocorrência) | parcial: falta a regra escrita no CONTRATO |
| M-15 | não | `schemas/ticket.schema.json` sem `fora_de_escopo`, `objetivo_pai` nem `falhas` (o lote 2 diz que `fora_de_escopo[]` já existe: não no kit) | ideia |
| M-16 | parcial | commit do loop leva só as chaves do motor, edição alheia vira `EDICAO_ALHEIA` (8b, `9b0addc`, CONTRATO §19.1) | parcial: falta versão/compare-and-swap ou ledger só-anexar |
| M-17 | não | sem `conflitos[]` nem `spec_conflitante` | ideia |
| M-18 | parcial | classe alto/baixo do juiz por path, palavra de risco, tamanho do diff e retry final (`juiz.ts:51-79`, `executor.sh:811-824`) | parcial: falta o nível 2 com pseudocódigo humano exigido na entrada |
| M-19 | parcial | regras anti-afrouxamento (.skip/.only/.todo, assert removido etc.) só nos testes vizinhos ampliados (`enforcement-core.ts:658-709`, 8c) | parcial: falta valer para todo o diff e cobrir `as any`, ts-ignore, try/catch novo, teste existente alterado |
| M-20 | parcial | varredura de credencial no diff em toda tentativa (`enforcement-core.ts:293-308`, violação `credencial`); proibição no prompt (`executor.sh:458`) | parcial: falta o checklist auth/RLS/env no material do juiz |
| M-21 | não | `merge_em_alvo` faz `merge --no-ff` direto, sem rebase nem gates de novo (`local-loop.sh:70-102`) | ideia |
| M-22 | não | sem `criterios_privados` | ideia |
| M-23 | não | 8f (vermelho antes mecânico) pendente, PECAS:1149 | ideia |
| M-24 | não | o `orq custo` mostra aprovação de primeira (`scripts/orq:317-329`), sem alarme de 0% | ideia |
| M-25 | não | o triador age depois do bloqueio (7f-b1), não antes | ideia |
| M-26 | não | L6 (guarda PreToolUse) pendente, PECAS:1182-1192 | ideia |
| M-27 | não | uma tentativa por vez | ideia |
| M-28 | não | só o envelope final `--output-format json` por tentativa (`executor.sh:1189`); `permission_denials` extraído dele; sem stream-json nem extrator | ideia |
| M-29 | parcial | custo por papel, ticket e tentativa com tokens de cache (`lib.sh:1398-1437`); `orq custo` por papel e por ticket com cache (`scripts/orq:281-310`) | parcial: falta custo por etapa no painel, P95, taxa de cache, alerta sobre média móvel e o contexto enxuto do juiz |
| M-30 | parcial | juiz roteado por risco (`juiz.ts:77-79`, `modelos.juiz_alto/juiz_baixo`); executor escala só com `sub=juiz` (`decisao.ts:586-601`, 7b-4) | parcial: falta rotear o executor por risco/dificuldade, em sombra |
| M-31 | parcial | o modelo do juiz já é configurável por classe (`juiz.ts:77-79`); o e2e de 08/09 rodou juiz sonnet em classe baixo | parcial: falta a medição no corpus (M-56) |
| M-32 | não | sem índice nem carga por superfície | ideia |
| M-33 | não | | ideia |
| M-34 | não | | ideia |
| M-35 | não | só reação ao limite: `RATE_LIMIT_REGEX` (`lib.sh:928`) e cooldown fixo; L5b (cooldown até o "resets") pendente, PECAS:1143. Nenhuma checagem de cota antes de despachar; o que existe antes é o teto em US$ (`lib.sh:1445-1475`) | planejado (como está) |
| M-36 | não | `notificar_fim` manda placar sem link por evento (`local-loop.sh:717-718`) | ideia |
| M-37 | parcial | o painel K12 tem o indicador "Última promoção" sempre "sem dado: o contrato não registra a promoção" (`orq-painel.py:833-837,1305`) | parcial: falta o evento PROMOCAO no contrato, idade, tamanho e alarme |
| M-38 | não | | ideia |
| M-39 | parcial | `--max-turns` real no executor (`executor.sh:1177-1190`) e `--max-turns 1` no juiz (`executor.sh:885`); teto em dólar por TICKET checado antes de cada chamada (`lib.sh:1445-1475`); `--max-budget-usd` só no triador (`triador/modelo.ts:21-54`, `teto_corte_usd`) | parcial: falta teto em dólar por chamada (`--max-budget-usd`) no executor e no juiz |
| M-40 | não | o ledger existente é do resolvedor (`resolvedor/ledger.ts`), não de objeções do juiz | ideia |
| M-41 | parcial | aprovação de primeira por dia, meta 70% (`scripts/orq:317-329`) | parcial: falta 2ª e 3ª tentativa e as quebras |
| M-42 | parcial | `decisoes-pendentes.md` (`lib.sh:1222`); iMessage e notificação do macOS para pausa (`resolvedor/pausa.ts:77-80`, 7f-b5) | parcial: falta canal único que receba todas as decisões |
| M-43 | não | | ideia |
| M-44 | não | nenhuma métrica C5 no `orq` nem no painel | planejado (como está) |
| M-45 | não | | ideia |
| M-46 | não | não há planejador no kit | planejado (como está) |
| M-47 | não | | ideia |
| M-48 | não | regra B confere faixa de migration, não unicidade (K11a-1); nenhum `reservar-ids` | ideia |
| M-49 | não | | ideia |
| M-50 | não | | ideia |
| M-51 | não | | ideia |
| M-52 | não | | ideia |
| M-53 | não | | ideia |
| M-54 | não | uma fila por repo; aberto em `docs/migracao-comarka.md:174` (6df04cc) | ideia |
| M-55 | parcial | M3 feito na L5a (`lib.sh:928`, `decisao.ts:237-238`, `8abf51d`, `169cf20`); nenhuma versão do CLI no preflight (grep de `--version` vazio); nenhum `CLAUDE_CODE_RETRY_WATCHDOG_*` | parcial: faltam M2 (versão mínima e aviso de troca no preflight) e M4 (espera do limite pelo CLI) |
| M-56 | não | o corpus que existe é do gate de ticket (`orquestrador-gate-corpus.test.ts`) e do triador (aceite C), não do juiz | planejado (como está) |
| M-57 | não | | ideia |
| M-58 | não | | ideia |
| M-59 | não | | ideia |
| M-60 | não | | ideia |
| M-61 | não | | ideia |

Resumo: 1 sim só no mecanismo (M-13), 17 parciais, 43 não.

### Itens de atenção especial, em uma linha cada

- **M-02**: sim, o retry já recebe a saída do gate (recorte) e as objeções do juiz literais; o que falta é a etiqueta e o controle em sombra.
- **M-13**: o teto existe e leva a `refatiar` (`decisao.ts:452-456`); o número é config (600 no CI). A frase "falta no kit" da proposta está errada.
- **M-21**: não existe; o merge é direto.
- **M-29 / M-39**: custo medido por papel/ticket/tentativa; teto por ticket antes da chamada; teto por chamada só no triador.
- **M-35**: não existe checagem de cota; só reação ao limite.
- **M-55**: M3 feito (L5a), M2 e M4 não.
- **M-10**: problema do `validar-fila.py` do Comarka; o kit não tem pre-commit.
- **M-11**: auth reconhecida e adiada; falta a pausa com dono e o aviso específico.
- **M-37**: só o placeholder "sem dado" no painel.

### Marco de M-54 e M-55 pela regra (a) (proposta, decido na P1)

- **M-54 fica em B**: é multi-fila (Comarka plataforma + apolo), está na regra.
- **M-55 vai para A**: não é porte nem convergência. M2 e M4 são propostas do handoff, não commits do Comarka (o único commit, 6ad8fbd, já virou a L5a). É preflight do motor.
- Com M-52, M-53, M-56 a M-61 em A, o marco B fica só com M-54.

### Defeitos da seção "Para docs/defeitos e PLAYBOOK"

| item | registrado? | onde | proposta |
|---|---|---|---|
| L6-01 autocommit pusha sem rebase e colide com o `publicar.sh` | **sim, e não se aplica ao motor do kit** | o kit não pusha (D11; `local-loop.sh:15`, `perfil.ts:186`). Registrado em `docs/migracao-comarka.md:160` (push do autocommit fica fora do motor), `:188` pedaço (3) do 457856c, e `docs/defeitos/2026-10-16-elegibilidade-working-tree.md` "Evidência 2" (o writeback empurrou commits alheios) | não criar arquivo |
| L6-03 publicação concorrente sem trava; pausa órfã do `publicar.sh` morto | **parcial** | pausa com dono e "publicar só remove a própria" em `docs/defeitos/2026-10-16-elegibilidade-working-tree.md` §Concorrência (cita até o `.orq-pause.orfa-1937`); no kit, pausa com dono (7f-b7) e `pausa_registrar` (K12-F). Não registrados: a trava de publicação com pid e a pausa que se reconhece órfã quando o pid do dono morre | criar `2026-10-28-pausa-orfa-sem-pid.md`, só a parte do motor (PAUSAR sem pid) |
| L6-04 o `publicar.sh` faz cherry-pick só do sha passado e perde os commits de baixo | **não** | o `publicar.sh` é script do Comarka, não do motor (zero ocorrência em `scripts/` do kit) | pergunta 1 |
| L6-05 a staging do loop diverge da origin e o ritual roda com ticket em curso | **parcial** | o ritual fica no Comarka (`docs/migracao-comarka.md:175` e `:188` pedaço 4); a sincronização com a origin está aberta no 4318257 (`:183`). Não registrada: a divergência da branch alvo local contra a origin. O kit faz `fetch` (`local-loop.sh:864`) e mergeia na worktree local da alvo (`local-loop.sh:70-102`), sem comparar com a `origin/<alvo>` | criar `2026-10-28-staging-local-diverge-da-origin.md`, só a parte do loop |
| L6-11 camadas 15 e 16 do validador sem porte | **sim** | `docs/migracao-comarka.md:188`: camada 15 portada no 8c, camada 16 **aberta** ("portar como avisos novos no molde de C13 a C16"). O "risco aberto de 28/10" é essa linha | não criar arquivo; na MELHORIAS só aponta para a linha |

Lições candidatas: nenhuma das duas está no PLAYBOOK nem na doutrina (grep vazio em `docs/PLAYBOOK.md` e `doutrina/`):

- **L6-10**: classe de bloqueio vista 2 vezes vira aviso na entrada (1058 e 1060, fixture com id não UUID).
- **L6-20**: como desenhar um lote que drena sem humano (noite de 17/10, 58 aprovados).

Ficam como "Lições candidatas (decisão do Lucas)" na MELHORIAS. O PLAYBOOK não é tocado.

Defeitos novos que a P3 criaria (se você aprovar as perguntas 1 e 2): 2 (L6-03 parte motor, L6-05 parte loop).

### Correções à proposta achadas na leitura

1. M-13 diz "falta no kit" e "já existe como C8 no Comarka". O teto existe no kit (`diff_cap_linhas`), e o C8 do kit é a allowlist sobreposta. Não conferi a numeração do Comarka (`git grep` está fora das operações permitidas lá).
2. M-15 (via v084) supõe `fora_de_escopo[]` já existente: não existe no schema do kit.
3. M-55 diz "M3 já está no kit": confere (L5a).
4. v107 tem o mesmo título de v105; v025, v037, v043, v105 e v106 aparecem como "só extração", mas foram relidos crus no lote 0 (correção (d) do pedido).

### Perguntas que só o Lucas responde

1. **L6-04 (e L6-01)**: são defeitos de script do Comarka (`publicar.sh`, push do autocommit), fora do motor do kit. Proponho não criar arquivo em `docs/defeitos/` e listá-los na MELHORIAS como "fora do motor, ficam no Comarka". Ok, ou quer o registro mesmo assim?
2. **L6-03 e L6-05**: crio os dois defeitos só com a parte do motor (pausa sem pid; branch alvo local contra a origin)?
3. **M-13**: marco como "parcial: o gate existe (`decisao.ts:452`), o limiar 300 é decisão de config por repo", ou como "feito (antes de 28/10)" e abro o 300 como pergunta de config?
4. **M-10**: o defeito é do `validar-fila.py` do Comarka e o kit não tem pre-commit. Fica no marco A, como está, ou vai para B como convergência? Pela letra da regra (a) iria para B, mas a (a) só manda mudar juiz e eval de marco.
5. **Conflitos**: os seis da proposta (M-04, M-52, M-27, M-02, M-18, M-07) ficam abertos como estão. Algum já está decidido?

Respostas do Lucas (28/10): (1) L6-01 e L6-04 sem arquivo, numa seção "Fora do motor (ficam no Comarka)"; (2) criar os dois defeitos, só a parte do motor; (3) M-13 "parcial", medir a aprovação por faixa de diff antes de mexer no 2500 do template, o 300 da fonte não se copia; (4) M-10 vai para o marco B; (5) os seis conflitos ficam abertos com a nota "decide no PASSO 0 da etapa que pegar o item"; M-55 vai para A.

## Peças (depois do ok)

| peça | sha | o que mudou |
|---|---|---|
| P1 | `cebb6b4` | `docs/MELHORIAS.md` novo (797 linhas) |
| P2 | `4debb11` | `CLAUDE.md`: seção "Fila de melhorias", 5 linhas com o título |
| P3 | `e54448c` | `docs/defeitos/2026-10-28-pausa-orfa-sem-pid.md` e `docs/defeitos/2026-10-28-staging-local-diverge-da-origin.md` |
| P4 | `ba73def` | `docs/PECAS.md`: uma linha no topo de PENDENTES apontando para `docs/MELHORIAS.md` |

Nenhum push, nenhum `--no-verify`, nenhuma chamada paga. `docs/PLAYBOOK.md`, `~/.orq/` e o Comarka não foram escritos. No Comarka só li os três handoffs de origem dos defeitos (`docs/historico/projeto-claude/`), com `grep` no arquivo, sem git.

### P1: o que mudou na proposta

- Regras da fila no topo (correção f) e "parcial" no vocabulário de status.
- 61 IDs na tabela e 61 blocos de item, sem renumerar. A tabela foi reordenada por marco: 34 em A, 2 em B, 18 em C, 7 em D.
- Mudança de marco:
  - M-52, M-53 e M-56 a M-61 de B para A, pela regra (a): são de juiz e eval.
  - M-55 de B para A: não é porte nem convergência. M2 e M4 são propostas do handoff, não commits do Comarka; o único commit (6ad8fbd) já virou a L5a. É preflight do motor.
  - M-54 fica em B: é multi-fila.
  - M-10 de A para B, por decisão do Lucas: convergência com o `validar-fila.py` do Comarka (o kit não tem pre-commit nem esse validador).
  - Marco B fica com M-10 e M-54, nenhum outro.
- Status vindo do PASSO 0: os 18 itens "parcial" da tabela acima, cada um com "parcial: o que já existe (arquivo:linha); falta ...". M-13 com o texto decidido. M-29 deixou de ser "planejado" e virou "parcial". Nenhum item ficou "feito". O resto ficou como estava.
- M-13: título "Teto de diff no kit (limiar por repo)" (mesmo ID); o texto que dizia "falta no kit" e "mesmo limiar do C8" foi corrigido.
- Conflitos: os seis da lista mais o do M-26 (decisão dos hooks) levam a nota "Decide no PASSO 0 da etapa que pegar o item", no item e na seção.
- Diário (correção d): v025, v037, v043, v105 e v106 como "relido cru (lote 0)", 28/10, rendimento médio para v037, v043 e v105 e baixo para v025 e v106; v107 "provável duplicata de v105 (mesmo título), conferir". Contagem: 29 relidos crus (5 no lote 0 e 24 nos lotes 1 a 5), 78 só extração.
- A seção "Para docs/defeitos e PLAYBOOK" virou três: "Defeitos registrados nesta etapa" (os dois arquivos da P3, mais a L6-11 apontando para a linha já existente da migração), "Fora do motor (ficam no Comarka)" (L6-01, L6-04) e "Lições candidatas (decisão do Lucas, não estão no PLAYBOOK)" (L6-10, L6-20).

### P3: defeitos criados

- `docs/defeitos/2026-10-28-pausa-orfa-sem-pid.md` (L6-03): o sentinela não tem pid nem host; pausa com dono `publicar.sh` é silenciada por 30 min e depois vira `pausa_longa`, nunca "órfã" (`resolvedor/pausa.ts:179-195`, `resolvedor/modos.ts:46-48`). Pede pid e host na linha, órfã avisada na hora, remoção ainda humana. Fontes: HANDOFF-15out-loop-apolo.md:50 e HANDOFF-17out-tarde-migrations-lote38.md:6.
- `docs/defeitos/2026-10-28-staging-local-diverge-da-origin.md` (L6-05): o loop faz `fetch` mas nunca compara `<alvo>` com `origin/<alvo>` (`local-loop.sh:864`, `:70-102`; `lib.sh:851-858`, `:881-902`). Pede classificar igual, atrás, à frente ou divergente, com ff-only, reconciliação sem push quando os commits locais são só do loop, e parada com aviso no resto. Fonte: HANDOFF-16out-noite-migrations-tokens.md:4 e :23.

### Lições candidatas (não estão no PLAYBOOK)

- L6-10: classe de bloqueio vista 2 vezes vira aviso na entrada.
- L6-20: como desenhar um lote que drena sem humano.

### Conflitos em aberto

M-04, M-52, M-27, M-02, M-18 e M-07 (e a decisão pendente do M-26). Cada um se decide no PASSO 0 da etapa que pegar o item.

## Fechamento

Rodado em `~/Projetos/_worktrees/kit-melhorias`, HEAD `ba73def`. As saídas inteiras (2949 linhas) ficaram no scratchpad da sessão; aqui vão o trecho final cru de cada uma e o rc.

### `npx tsc --noEmit`, rc=0

```
(saída vazia)
```

### `TZ=UTC node_modules/.bin/vitest run`, rc=0

```
 Test Files  119 passed (119)
      Tests  1870 passed (1870)
   Start at  22:33:40
   Duration  68.90s (transform 1.45s, setup 0ms, collect 21.06s, tests 500.55s, environment 16ms, prepare 5.25s)
```

### `bash scripts/kit/test-shell.sh`, rc=0

```
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
  rc=0  test-gate-prevoo.sh
  rc=0  test-tentativas-persistidas.sh
  rc=0  test-orq-pause.sh
  rc=0  test-preflight.sh
  rc=0  test-diff-lines.sh
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-gate-instavel.sh
  rc=0  test-instavel-recorrente.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
```

### `bash scripts/kit/test-instalar.sh`, rc=0

140 linhas `ok`, 0 com `FALH`. Seções (a), (b), (d) a (k) e (v) rodaram; (c) pulada por desenho. Trecho final:

```
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
```

## Shas

`cebb6b4` (P1), `4debb11` (P2), `e54448c` (P3), `ba73def` (P4), sobre `c6d9de4`. Branch `kit/melhorias`, sem push; o merge na `main` é humano.

## Rebase sobre a L12

A `main` andou para `77bedbb` (etapa L12, que mexeu em `docs/PECAS.md`). `git rebase main` na `kit/melhorias`: só o P4 conflitou, em `docs/PECAS.md`. Resolução: o conteúdo da `main` inteiro (os três pendentes novos da L12) e só a linha do ponteiro para `docs/MELHORIAS.md` reinserida no topo de `## PENDENTES`. `git add docs/PECAS.md` e `git rebase --continue` com a mensagem do P4 mantida. Nenhum outro arquivo conflitou. Os shas antigos (`cebb6b4`, `4debb11`, `e54448c`, `ba73def`) foram substituídos pelos de baixo.

`git log --oneline -6`:

```
e80c856 MELHORIAS-0 P4: PECAS aponta para docs/MELHORIAS.md nos pendentes
9afa086 MELHORIAS-0 P3: dois defeitos do lote 6 (L6-03 e L6-05, parte do motor)
9cdcda7 MELHORIAS-0 P2: CLAUDE.md aponta para a fila de melhorias
93c5b00 MELHORIAS-0 P1: docs/MELHORIAS.md, fila única de melhorias do motor
77bedbb L12-P3: docs (PECAS, CONTRATO §4 e §25, migracao) da recusa de preflight como AMBIENTE
9c9aed0 L12-P2: ADIADO de preflight e AMBIENTE ja no 1o ticket (resíduo do comarka c2ae29b)
```

`git diff 77bedbb --stat`:

```
 CLAUDE.md                                          |   6 +
 docs/MELHORIAS.md                                  | 797 +++++++++++++++++++++
 docs/PECAS.md                                      |   2 +
 docs/defeitos/2026-10-28-pausa-orfa-sem-pid.md     |  37 +
 .../2026-10-28-staging-local-diverge-da-origin.md  |  37 +
 5 files changed, 879 insertions(+)
```

Fechamento depois do rebase, HEAD `e80c856`:

| comando | rc | saída (trecho final cru) |
|---|---|---|
| `npx tsc --noEmit` | 0 | vazia |
| `TZ=UTC node_modules/.bin/vitest run` | 0 | `Test Files  119 passed (119)` / `Tests  1870 passed (1870)` / `Duration  65.72s` |
| `bash scripts/kit/test-shell.sh` | 0 | 29 linhas `rc=0`, nenhuma `rc` diferente de 0; `TODOS OS SCRIPTS SAÍRAM rc 0` |
| `bash scripts/kit/test-instalar.sh` | 0 | 140 linhas `ok`, 0 com `FALH`; `TODOS OS CHECKS PASSARAM` |

### P5: status depois da L12

Commit `fb1f98e` ("MELHORIAS-0 P5"), só em `docs/MELHORIAS.md` (1 linha). IDs alterados: **M-11**. M-55 conferido e sem mudança.

- **M-11 → "parcial (L12)".** A L12 fechou o resíduo de 1 ticket do defeito `2026-10-28-disjuntor-conta-falha-de-infra.md` (comarka `c2ae29b`): o `ADIADO motivo=preflight` vira AMBIENTE já no 1º ticket, e nada soma em `.adiamentos` (`scripts/orquestrador/local-loop.sh:586-611`, `9c9aed0`). O vermelho é o caso 4 de `test-ambiente-adiado.sh:130` (`9212ab2`). Ainda falta o resto do que o item pede: a pausa com dono, o motivo literal "auth do claude expirada, ação exclusiva do humano no terminal do Mac" e o aviso pela caixa de decisões (M-42). Por isso fica parcial, não feito.
- **M-55 sem mudança.** Os arquivos da L12 são `local-loop.sh`, `test-ambiente.sh`, `test-ambiente-adiado.sh` e `test-preflight.sh`. O grep de `--version` e de `RETRY_WATCHDOG` em `scripts/` segue vazio, então M2 e M4 continuam faltando.

`git log --oneline -6` depois do P5: `fb1f98e` (P5), `e80c856` (P4), `9afa086` (P3), `9cdcda7` (P2), `93c5b00` (P1), `77bedbb`. O `git diff 77bedbb --stat` segue com os mesmos 5 arquivos.

Fechamento depois do P5, HEAD `fb1f98e`:

| comando | rc | saída (trecho final cru) |
|---|---|---|
| `npx tsc --noEmit` | 0 | vazia |
| `TZ=UTC node_modules/.bin/vitest run` | 0 | `Test Files  119 passed (119)` / `Tests  1870 passed (1870)` / `Duration  65.29s` |
| `bash scripts/kit/test-shell.sh` | 0 | 29 linhas `rc=0`; `TODOS OS SCRIPTS SAÍRAM rc 0` |
| `bash scripts/kit/test-instalar.sh` | 0 | 140 linhas `ok`, 0 com `FALH`; `TODOS OS CHECKS PASSARAM` |

Sem push. O merge na `main` é humano.
