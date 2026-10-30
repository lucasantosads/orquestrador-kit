# Relatório · etapa L13 do kit (retry que lê a mensagem, IMPEDIMENTO declarado, dependência fora da alvo, C15/C16 como erro)

IDs desta etapa: M-02 (parcial), M-17 (ideia → parcial), M-62 (novo), M-58 (descartar).

## PASSO 0 · leitura (30/10/2026)

Worktree: `~/Projetos/_worktrees/kit-l13`, branch `kit/l13`. **Não existia**: criei com
`git worktree add -b kit/l13 ~/Projetos/_worktrees/kit-l13 main` (main do kit em `fb1f98e`) e
linkei o `node_modules` do checkout principal, como no `kit-l12`. Nenhum outro arquivo escrito
além deste relatório. Leituras no dashboard e no Comarka só com `GIT_OPTIONAL_LOCKS=0` e
`log/show/cat-file/ls-tree/rev-parse`. As medições rodaram num clone descartável do dashboard
no scratchpad (`git clone --no-checkout`, que só lê o repo de origem).

### O dashboard andou depois do relatório do chat

| ref | relatório do chat | agora |
|---|---|---|
| main | `16c2977e` | `bfebb2e1` (o humano reabriu 001, 037, 039, 043 e 044; `c57e7488` reabre o 044) |
| staging-auto | `c2c69a07` | `2f8e6d1f` ("fixtures de fatura (BB, Nubank, MP) da main para os tickets 044 e 045") |

O loop está rodando: 037 e 039 têm `attempt-2` de hoje (19:21 a 19:30, ainda sem `veredito.json`
quando li), o 039 voltou a `bloqueado` no working tree e o 001 rodou `attempt-2` e `attempt-3`
(o `gates.txt` da `attempt-3` é `ok typecheck / ok testes 9814ms / ok build`). As fixtures que
uso são as tentativas de 29/10 (`attempt-0` e `attempt-1`), que não mudam.

### Tabela

| # | pergunta | resposta | arquivo:linha |
|---|---|---|---|
| 1a | M-02, M-17, M-58 e regras da fila | M-02 **parcial** (já tem recorte do gate, motivo literal do juiz, bloqueio de diff idêntico e de reprovação repetida). M-17 **ideia**: `conflitos[]` e status `spec_conflitante`, que encerra sem gastar teto e vai ao triador na classe spec. M-58 **ideia** (régua só com corpus próprio). Regras: status muda no último commit da etapa para "feito (etapa X)" ou "parcial (etapa X): o que falta"; **item novo só entra depois de fechar ou descartar outro**, e o M-62 entra no lugar do M-58 descartado, então a regra fica cumprida. Conflito em aberto do M-02: 3 rodadas da base contra 1 retry de L1-01 (ver Q5). | `docs/MELHORIAS.md:3-9`, `:22`, `:36`, `:51`, `:96-107`, `:251-259`, `:630-637`, `:669` |
| 1b | 8f e 7d-2 | 8f (vermelho antes MECÂNICO: árvore temporária com o `src` da base e os testes da HEAD, `vermelho-antes.txt` para o juiz) e 7d-2 (o gate executa recon, guarda e alvo contra a branch alvo) seguem nos PENDENTES. Ficam fora. | `docs/PECAS.md:1182-1196`, `:1343-1348` |
| 1c | Existe etapa L13 com outro sentido? | **Não.** Zero ocorrência de `L13` em `docs/`, `CONTRATO.md`, `CLAUDE.md`, `scripts/` e nos nomes de `~/orq-sessoes/`. | grep |
| 2a | O que entra hoje na assinatura do `retry_sem_mudanca` | **Só o sha256 do `diff.patch` inteiro** (`git diff base...HEAD`). Mensagem de commit não entra. Só vale com o agente saído rc 0 e a partir da 2ª tentativa da drenagem (`rundir_anterior` não vazio). O desfecho sai cedo, sem enforcement, gates, critérios nem juiz, e o drive bloqueia sem passar pelo `decisao.ts`. | `executor.sh:1047` (grava `diff.patch`), `:1208-1231` (comparação), `:1692-1695` (`rundir_anterior`), `:1717-1730` (bloqueio, nota, trilha) |
| 2b | Os gates de uma tentativa com diff idêntico podem ser reaproveitados? | **Sim, sob 4 condições, e só quando a reprovação anterior foi só do juiz.** (1) mesma base: `base_ticket` é fixo na drenagem quando a worktree é reaproveitada (`:1677-1685`), mas nasce de novo quando o enforcement falhou; (2) mesma árvore: diff idêntico sobre a mesma base implica o mesmo `HEAD^{tree}`, que é a prova barata; (3) mesmo config de gates: os gates leem `000-config.json` da MAIN a cada tentativa (`:1251`), e a main recebe commits da fila entre uma tentativa e outra; (4) mesma allowlist ampliada (8c, `:1155`), que muda enforcement e critérios. Hoje **nada disso fica gravado no rundir**: não há base, árvore nem hash do config. Ficam gravados `gates.txt`, `gate-falha.txt`, `enforcement.json`, `criterios.txt` e `veredito.json` (`causa`). Precisa de um `assinatura.json` novo por tentativa. Instável (L11) e base vermelha recalculam sozinhos: reaproveito só com `gates_rc 0`, enforcement ok e critérios ok na anterior. | `executor.sh:1155`, `:1251-1252`, `:1677-1685`, `:1502-1517` (meta não tem base) |
| 3a | Como o prompt define IMPEDIMENTO | Não define no prompt do executor (`build_prompt`). O prompt pede `CRITÉRIO SUSPEITO:` para critério errado (`:475`). `IMPEDIMENTO:` aparece (a) na doutrina vendorizada ("UMA linha no corpo do commit começando com `IMPEDIMENTO:`"), que o prompt manda ler só quando existe `docs/orquestrador/skill/EXECUTOR.md` no repo; (b) no diagnóstico do retry ("se o quebrado está fora, reporte IMPEDIMENTO no commit"; "commite o que tem e reporte IMPEDIMENTO"). | `doutrina/EXECUTOR.md:24-25`, `doutrina/templates/TICKET.md:92`, `doutrina/references/custo-e-contexto.md:77`, `diagnostico.ts:13`, `:68`, `:83`, `executor.sh:475` |
| 3b | Algum lugar do motor já lê a palavra? | **Não.** O único casamento é `decisao.ts:124` (`/ambiente|impedimento/i → 'ambiente'`), que casa **rótulos do config** (`causas_que_adiam`), não o commit. A `custo-e-contexto.md:77` diz "o harness lê `IMPEDIMENTO:` do `git log`", mas nada no código faz isso. Quem lê o corpo dos commits hoje é só o juiz (8e-P1), cru. | `decisao.ts:124`, `:142`; `executor.sh:860`; `juiz.ts:125`, `:489` |
| 4a | gate-ticket da main do kit contra 037, 039, 043, 044 (clone, main `ea57887c`, staging-auto `c2c69a07`) | **Nem C9, nem C15, nem C16 dispararam nos quatro.** Avisos que saíram: 037 `6b` (`saidas/lancamentos/route.ts`), 039 `6b` (`fontes.ts`), 043 `6b` (`ds.tsx, format.ts`) e `8` (sobrepõe o 022), 044 nenhum. Contraprova: 002 e 003 saem com C15 e C16. O motivo: os quatro pedem "Diga no corpo do commit qual caso foi visto falhando antes do código existir (controle negativo)" **no objetivo**. O C15 só olha a `descricao` dos critérios, e o `RE_PEDE_VERMELHO` do C16 não casa "visto falhando antes" nem "controle negativo". | `gate-ticket.ts:134-135` (tabela), `:1304`, `:1307`, `:1772-1785` |
| 4b | O motor do clone tinha C15 e C16 quando os tickets entraram? | **Sim.** C15/C16 entraram no dashboard em `96eb3940` (24/10, motor do kit `2c0f469`). 037 e 039 entraram em `0d0df709` (29/10), 043 em `5422a7b3` (29/10), 044 em `ea57887c` (29/10). O `gate-ticket.ts` do dashboard é idêntico ao da main do kit. Os dois avisos existiam e não pegaram a forma escrita no objetivo. | `git log -S"'C15'"` no dashboard |
| 4c | Linha do C9 | O C9 está em `gate-ticket.ts:138`, não em `:137` (a `:137` é o C4). | `gate-ticket.ts:138`, código em `:1584-1589` |
| 5a | 044: fixtures na allowlist ou só lidas? | **Só lidas.** A allowlist tem os 4 arquivos de `cria_novo`. A fixture `src/lib/financeiro/v2/fatura/__fixtures__/bb-2026-08.txt` aparece só no objetivo ("lendo a fixture … com fs") e como string no cmd de uma guarda (`grep -q -F 'bb-2026-08.txt'`). O objetivo diz "fixtures (só ler, não editar)" depois de FORA DE ESCOPO. | `ea57887c:docs/fila/044-fin-v2-fatura-leitor-bb.md` |
| 5b | Por que o C9 não pegou | O C9 só confere **itens da allowlist** (`checarArvore`, `:1584`). Dependência de leitura fora da allowlist não é olhada por nenhuma regra. O `6b` também não pegou, porque o `RE_CAMINHO` só reconhece `tsx?/jsx?/mjs/cjs/sql/json/sh/md/ya?ml`, e `.txt` não entra. | `gate-ticket.ts:533-534`, `:1576-1589` |
| 5c | Regra que barra o 044 no pré-voo | **Dependência de leitura fora da alvo:** caminho citado no objetivo ou num `cmd` de critério, com qualquer extensão, não coberto por `pathspec_allowlist` nem por `cria_novo`, que **existe na árvore do checkout** e **não existe na branch alvo**. A saída lista os arquivos e as duas refs com sha. Roda no `drive_ticket` depois do gate de ticket e antes de `setup_worktree` e do contador, então não gasta tentativa e **independe do `modo_pre_voo`** (é fato de topologia, não regra calibrada). Medido: estado de 29/10 do dashboard (main `ea57887c` × staging-auto `c2c69a07`), 48 tickets, **2 disparos, os dois verdadeiros**: 044 (`bb-2026-08.txt`) e 045 (`nubank-2026-08.txt`, `mercadopago-2026-09.txt`), que bateria no mesmo muro. Estado atual do dashboard: 49 tickets, 0. Comarka main × staging-auto e main × staging-apolo: 13 pendentes, 0 nos dois. **Custo:** dois `ls-tree` (o da alvo já é feito pelo C9/C11 via `ContextoRepo`) e uma regex no texto, milissegundos, sem tentativa e sem chamada paga. | medição: `scratchpad/dep-alvo.py` |
| 6 | Corpus de falso positivo de C15 e C16 | Ver a tabela "Corpus C15/C16" abaixo. Resumo: **C15 atual: 0 FP** (Comarka 0 disparos em 1519; dashboard 2, os dois causais: 002 e 003 reprovados por isso). Só que ele não pega nenhum dos 4 casos de 30/10. **C16 atual: não é zero** (Comarka 27 done e 1 bloqueado; dashboard 5 done, dos quais 007 e 011 aprovados de primeira). **A versão ampliada que pega 037/039/044** (C15 também no objetivo; C16 aceitando "visto falhando"/"controle negativo"): dashboard 20 disparos, 13 done (7 aprovados sem reprova por essa causa: 007, 011, 012, 017, 019, 025, 026, 042, e 035 reprovou por outra causa); Comarka C15a 3 done, C16a 31 done. **Pela D7 (erro só com zero FP nos done), nenhuma forma que pega os casos de 30/10 vira erro.** | `scratchpad/corpus-c15c16.mts` |
| 7 | A 8e cobre o timeout do 001? | **Sim, e confirmado no dado vivo.** Kit: 30 s nos 4 casos (`test/orquestrador-contexto-juiz-fixtures.test.ts:149`, `:168`; `test/orquestrador-contexto-juiz.test.ts:146`, `:156`) e `ORQ_GATE=1` no gate (`gates.ts:437-448`), que pula o harness (`test/fixtures/orq-harness.ts:20-24`, `describeHarness = describe.skipIf(ORQ_GATE === '1')`). Dashboard: as mesmas 4 linhas com `30_000`, `ORQ_GATE` em `scripts/orquestrador/gates.ts:428-439` e `test/fixtures/orq-harness.ts`. O 001 de 24/10 tinha `Test timed out in 5000ms` 4x (`runs/001/attempt-1/gates.txt:13-22`, `base_vermelha`); a `attempt-3` de hoje tem `ok testes 9814ms`. | idem |
| 8a | Triador: classe das causas novas | `IMPEDIMENTO_DECLARADO` → **R3** ("spec precisa de decisão, token, motor ou refatiamento"), regra nova (D13), firme na classe (o motor decidiu, como o D5 do `base_vermelha_motor`), com a nota do agente como evidência e o remédio "decidir: <nota>". Hoje uma série terminada sem gate nem juiz cai no fallback do `extrair.ts`. `DEPENDENCIA_FORA_DA_ALVO` → bloqueio sem tentativa, que o triador já rotula **D0** ("bloqueado sem tentativa: decisão humana", com a nota) sem mudar nada. Opcional: R5 com `requeue sim_apos:alvo_tem:<arquivo>`, verificável sem suíte (`git cat-file -e alvo:arquivo`), que o resolvedor poderia reabrir sozinho. | `triador/extrair.ts:23`, `:63-71`, `:195-203`, `:238-240`; `resolvedor/r5.ts:1-15` |
| 8b | Entram em gate_streak e adiamentos? | **Não, nos dois.** `gate_streak` não existe no motor do kit: é do loop legado do Comarka, e o resolvedor só lê o sentinela (`resolvedor/gate-streak.ts:1-30`). Ele conta gate que REPROVA, e as duas causas são BLOQUEADO sem gate. `.adiamentos` só conta ADIADO (`local-loop.sh:237-255`). As duas são bloqueio: não consomem tentativa (como `base_vermelha`, `executor.sh:1698-1700`) e não zeram adiamentos. | idem |

### Corpus C15/C16 (status atual dos arquivos, contagem de 30/10)

| regra | Comarka (1519 com json) | dashboard (49 com json) |
|---|---|---|
| C15 atual (descrição do critério) | 0 | 2 done (002, 003: causais) |
| C16 atual | 28 (27 done, 1 bloqueado: 1478) | 5 done (002 e 003 causais; 007, 008, 011) |
| C15 ampliada (objetivo + descrição) | 3 done (1364, 295, 549) | 20: 13 done, 6 pendentes (037, 044-048), 1 bloqueado (039) |
| C16 ampliada ("visto falhando", "controle negativo") | 32 (31 done, 1 bloqueado) | 20: os mesmos 20 |

Desfecho dos 13 done do dashboard pela ampliada (veredito por tentativa):
002 e 003 `criterio_qualidade[corpo] → aprovado`; 032 `[corpo] → aprovado`; 034 `cq → cq[corpo] → aprovado`;
035 `cq → aprovado`; 017 `juiz_ilegivel → aprovado`; 007, 011, 012, 019, 025, 026 e 042 `aprovado` de primeira.

**Observação para a P4:** o dashboard roda com `gate_ticket.modo_pre_voo: "aviso"`. Regra erro lá
**não bloqueia no loop**, só faz `orq validar` sair 1. E o kit não tem mecanismo de "erro só para
ticket novo": o C14 é erro para todo `pendente` (é só a tabela), e o C13 tem a frase "vira erro
para ticket novo quando…" mas nenhum código. "O mesmo mecanismo do C13 e do C14" é, na prática,
`severidade: 'erro'` na tabela, valendo para todo pendente.

### Achados fora da pergunta

1. **O prompt contradiz a permissão (defeito do motor, candidato a nota em `docs/defeitos/`).**
   O `build_prompt` manda "Os gates deste repo, nesta ordem: typecheck -> testes -> build"
   (`executor.sh:481`, `runs/037/attempt-0/prompt.txt:90`), mas `tools_do_ticket` deriva o
   `--allowedTools` **só dos `cmd` dos critérios** (`executor.sh:394-397`). O comentário de
   `executor.sh:1172` diz "os `cmd` dos critérios entram junto com os dos gates", e o código não
   faz isso. No dashboard faltam `tsc --noEmit`, `next build` e `vitest run`. É a origem de
   todas as linhas `IMPEDIMENTO: typecheck e build não rodaram` (037 att-0 e att-1, 039 att-0,
   043 att-0) e da frase do 037 "a permissão da sessão só aceita o comando de teste final, então
   não rodei o teste sem a lib". Ou seja, é parte da causa do próprio controle negativo que o
   juiz reprovou.
2. **Isso muda o desenho da P2.** A `attempt-1` do 037 (`ce346b5d`, commit vazio) **também tem
   uma linha `IMPEDIMENTO:` nova** (texto diferente do da att-0), igual ao 043 (`3be96fdc`, commit
   vazio). "IMPEDIMENTO novo com diff igual" sozinho bloquearia o 037, que a P1 quer mandar ao
   juiz. Ver a pergunta Q1.
3. **Normalização da mensagem:** o amend do 039 trocou o corpo e também a ordem dos trailers
   (`Co-Authored-By` some num e aparece no outro). Sem tirar `Co-Authored-By` além do
   `Orq-Ticket` (o `executor.trailer_commit` do config), um amend que só mexe em trailer contaria
   como mensagem nova.

### Plano das peças (teto de linhas = código + teste, sem contar fixture copiada)

Escopo de escrita proposto (lista fechada):
- `scripts/orquestrador/executor.sh`
- `scripts/orquestrador/gate-ticket.ts`
- `scripts/orquestrador/triador/extrair.ts`, `scripts/orquestrador/triador/leitor-kit.ts`
- `test/orquestrador-retry-mensagem.test.ts` (novo), `test/orquestrador-impedimento.test.ts` (novo), `test/orquestrador-dependencia-alvo.test.ts` (novo), `test/gate-ticket*.test.ts` (P4, só os de C15/C16), `test/orquestrador-triador*.test.ts` (só o caso novo)
- `test/fixtures/l13/` (novo: 037, 039, 043, 044, 002, 003 copiados dos runs reais: `diff.patch`, corpo dos commits, bloco json do ticket, `veredito.json` da att-0)
- `docs/defeitos/2026-10-30-retry-sem-mudanca-ignora-mensagem.md`, `docs/defeitos/2026-10-30-apoio-so-na-main-fora-da-alvo.md` (e, se você quiser, `docs/defeitos/2026-10-30-prompt-manda-rodar-gate-sem-permissao.md`)
- `docs/PECAS.md`, `docs/MELHORIAS.md`, `CONTRATO.md` (§4 trilha: motivos novos; §11: assinatura do `retry_sem_mudanca`; seção nova §26 L13)
- `~/orq-sessoes/relatorio-kit-l13.md`

| peça | o que faz | prova (vermelho → verde) | teto |
|---|---|---|---|
| P1 (M-02) | `grava_diff_patch` também grava `mensagens.txt` (`git log --format=%B base..HEAD`, sem o trailer do config e sem `Co-Authored-By`, sem linhas vazias no fim) e `assinatura.json` (`base`, `head`, `tree`, sha do config da main, sha da allowlist ampliada, `gates_rc`, `enf_ok`, `criterios_ok`). Assinatura do retry = diff **e** mensagens. Diff igual e mensagem igual: bloqueia como hoje. Diff igual e mensagem nova: segue; se as 4 condições da Q2b batem e a anterior reprovou só no juiz, copia `gates.txt`/`enforcement.json`/`criterios.txt` marcados "reaproveitado de attempt-N" e chama só o juiz; senão roda tudo. Anterior sem `mensagens.txt` (motor velho): compara só o diff, como hoje. | Fixture 037 (att-0 `5818364`, att-1 `ce346b5d` vazio) e 039 (amend `565f237f` → `24ed0691`), no harness do `orquestrador-retry-feedback-juiz.test.ts`: hoje `retry_sem_mudanca` e juiz chamado 1x (vermelho); depois juiz chamado 2x e gates não reexecutados. Contraprova: mesma mensagem continua bloqueando. | 320 |
| P2 (M-17 parcial) | Com diff igual ao anterior ou vazio, e o(s) commit(s) **desta tentativa** (`head_anterior..HEAD`, ou `base..HEAD` se não for ancestral) com corpo **só de linhas `IMPEDIMENTO:`** (sem trailers e sem o assunto): bloqueia com `causa: IMPEDIMENTO_DECLARADO`, a nota do agente literal no motivo, sem juiz, sem consumir tentativa, sem contar como `retry_sem_mudanca`. Triador: D13 → R3. | Fixture 043 (`aa6b4a97` → `3be96fdc`): hoje `retry_sem_mudanca` (vermelho); depois `BLOQUEADO motivo=impedimento_declarado` com a frase do agente. Contraprova: a fixture 037 (corpo longo com IMPEDIMENTO no meio) segue para o juiz pela P1. | 260 |
| P3 | `gate-ticket.ts` exporta `dependenciasForaDaAlvo` (reusa `ContextoRepo`) e ganha `--dependencias-alvo <ticket>`. O `drive_ticket` roda depois do gate de ticket e antes da worktree, em qualquer `modo_pre_voo`: com saída, bloqueia com `motivo=dependencia_fora_da_alvo`, a nota lista os arquivos e `existe em <checkout>@<sha>, ausente em <alvo>@<sha>`, sem tentativa. | Fixture 044 (repo sintético com o arquivo só na main): hoje cria worktree e gasta tentativa (vermelho); depois bloqueado sem `INICIO` na trilha. Contraprova: o mesmo ticket com o arquivo na alvo passa igual, e um ticket sem dependência não muda nada. | 240 |
| P4 (M-62) | Depende da Q2. Pela D7, só o **C15 atual** tem zero FP. Proposta: C15 vira `erro` (forma atual, 0 FP, 002 e 003 saem com erro); a forma ampliada entra como **aviso** novo (C15o/C16v ou dentro do C15/C16) com o número no `porque`; C16 fica aviso com o número. | 002 e 003 em fixture: hoje aviso, rc 0 (vermelho); depois erro, rc 1. 037 e 044 em fixture: aviso da forma ampliada. | 120 |
| P5 | Os dois defeitos (e o terceiro, se você quiser); MELHORIAS: M-02 e M-17 "parcial (etapa L13): o que falta", M-58 "descartado (30/10, decisão do Lucas): princípio, não ação", linha M-62 com status e fonte "relatório de bloqueios do dashboard, 30/10"; ideia (fonte "etapa L13"): o juiz reprovar declaração honesta de falta de vermelho empurra o agente a alegar sem prova (liga 8f e M-57); linha no PECAS; CONTRATO. | só docs | 180 (docs) |

### Perguntas que só você responde

1. **P2: como separar o 043 do 037?** Os dois têm diff idêntico, commit vazio e linha `IMPEDIMENTO:` nova.
   - (a) **recomendado:** IMPEDIMENTO_DECLARADO só quando o corpo dos commits **desta tentativa** é só `IMPEDIMENTO:` (043 sim; 037 tem 25 linhas de controle negativo, então vai ao juiz). Mecânico, acerta os 3 casos reais, mas é heurística de forma.
   - (b) token novo no prompt (ex. `IMPEDIMENTO DE SPEC:`). Fica mais limpo, mas a fixture real do 043 não casaria sem editar a cópia, o que contraria "fixtures copiadas dos runs reais".
   - (c) qualquer IMPEDIMENTO novo. Bloquearia o 037 por um IMPEDIMENTO que é de permissão (achado 1).
2. **P4 com o número na mão:** a D7 só deixa o C15 **atual** virar erro, e ele não pega nenhum dos casos de 30/10. Aceita "C15 atual vira erro + forma ampliada como aviso novo + C16 segue aviso"? Ou quer outra definição de FP (por exemplo, contar como acerto o done que tem o defeito latente, como a 8e fez com os 27 do Comarka)? Lembrete: no dashboard (`modo_pre_voo: aviso`) erro não bloqueia o loop, só o `orq validar`. E não existe "só ticket novo" no kit: erro vale para todo pendente, e hoje 037 e 044-048 disparam a forma ampliada.
3. **P1, reaproveitar gates:** faço o reaproveitamento com as 4 condições (custa um `assinatura.json` e cerca de 60 linhas a mais, e economiza cerca de 2,5 min de typecheck+build por retry desses) ou rodo tudo de novo e chamo o juiz (mais simples, sem estado novo)? Recomendo reaproveitar.
4. **P3:** confirma que o barramento vale em qualquer `modo_pre_voo`, inclusive `aviso`? E bloqueado, não adiado? Recomendo sim e bloqueado: é fato de topologia com 2/2 verdadeiros e 0 falso no corpus, e a solução real do 044 foi humana (`2f8e6d1f`). Quer o R5 com requeue automático no triador/resolvedor, ou fica D0?
5. **Achado 1 (prompt manda rodar gate que a permissão nega):** registro como terceiro defeito em `docs/defeitos/` na P5? Não proponho consertar nesta etapa.
6. **Conflito do M-02 (3 rodadas × 1 retry de L1-01):** a P1 não precisa dele. Deixo aberto e anoto isso no MELHORIAS?

Status: **PASSO 0 entregue, parado aguardando o ok.** IDs fechados: nenhum. Abertos: M-02, M-17, M-58, M-62.

---

## Execução (ok do Lucas, 30/10)

Decisões recebidas: P2 opção (a); P4 como proposto; P1 sem reaproveitar gates, só `mensagens.txt`;
P3 em qualquer `modo_pre_voo`, bloqueado, triador D0, R5 com requeue vai ao MELHORIAS como ideia;
terceiro defeito sim, consertado na P1b nova; conflito do M-02 fica aberto. Ordem P1, P1b, P2, P3, P4, P5.

### P1 · `e2ab076` · assinatura do retry_sem_mudanca com as mensagens (M-02)

- `executor.sh`: `grava_mensagens` (nova, depois de `grava_diff_patch`) grava `mensagens.txt`
  com `git log --format=%B base..HEAD` sem o trailer do config, sem `Co-Authored-By` e sem linha
  vazia no fim. No bloco 5b, diff igual com `mensagens.txt` diferente segue o pipeline inteiro;
  anterior sem `mensagens.txt` (motor velho) compara só o diff, como antes.
- Teste: `test/orquestrador-retry-mensagem.test.ts`, com fixtures `test/fixtures/l13/037` e `039`
  (diff.patch das duas tentativas e corpo real de `5818364`/`ce346b5d` e `565f237f`/`24ed0691`).
  Critérios do ticket trocados por `test -f` (os reais rodam o vitest do dashboard); gates vazios.
- Tamanho: 32 linhas no executor e 176 no teste (teto revisto, sem reaproveitar gates: 220).

Vermelho (motor da main, `fb1f98e`):
```
[orq 22:43:58]   retry sem mudança: diff.patch idêntico ao de attempt-0 (sha256 834fd2540474) — juiz NÃO chamado
[orq 22:43:58] BLOQUEADO: retry_sem_mudanca (runs/039/attempt-1/diff.patch idêntico a runs/039/attempt-0/diff.patch)
: expected 1 to be 2 // Object.is equality
 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
```
(os 2 que falharam: 037 e 039; o que passou: a contraprova "mesma mensagem bloqueia")

Verde:
```
   ✓ L13 P1: diff igual com mensagem nova chama o juiz > 037 (commit vazio ce346b5d): o juiz é chamado de novo, sem retry_sem_mudanca
   ✓ L13 P1: diff igual com mensagem nova chama o juiz > 039 (amend 24ed0691): o juiz é chamado de novo, sem retry_sem_mudanca
   ✓ L13 P1: diff igual com mensagem nova chama o juiz > contraprova: mesmo diff e mesma mensagem continua bloqueando por retry_sem_mudanca
 Test Files  1 passed (1)
      Tests  3 passed (3)
```
`bash scripts/kit/test-shell.sh` depois da P1: `TODOS OS SCRIPTS SAÍRAM rc 0`.

### P1b · PARADA: o conserto está fora do escopo aprovado

O comentário de `executor.sh:1172` está certo quanto à intenção: os gates **já** entram no
`--allowedTools`. `decisao-cli.ts:87-88` passa `config.gates[].cmd` para `toolsDoTicket`
(`perfil.ts:283`). Quem perde os gates é `comandosDeGates` (`perfil.ts`, logo acima de
`toolsDoTicket`), que só reconhece `npm run <script>`, `npm test` e `npx <bin>`. Os três gates do
dashboard são `node_modules/.bin/tsc --noEmit`, `node_modules/.bin/vitest run` e
`NEXT_PUBLIC_…=… node_modules/.bin/next build`, e nenhum casa. O conserto é em
`scripts/orquestrador/perfil.ts`, fora da lista aprovada. Pela instrução, parei e perguntei.
