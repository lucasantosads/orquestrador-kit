# Migração comarka-operacional → kit

Inventário de 02/10/2026. Fonte: `bash instalar.sh --atualizar ~/Projetos/comarka-operacional --dry-run`
(kit 2.1.0-dev, comarka main 718206d): **126 diferenças** — 28 só no comarka, 74 só no kit, 24 nos dois com conteúdo diferente.

O motor do comarka é de linhagem própria (nunca instalado pelo kit, sem `VERSAO`). O `--atualizar` hoje
recusaria só por o loop não estar pausado; não é por isso que ele não roda: rodar agora perde capacidade
(seção "Antes de migrar"). O PORTE-PENDENTE de comarka 6307912 já é equivalente ao kit e167e0d e fecha na migração.

Lembrete de mecânica: o `--atualizar` copia por cima, sem `--delete` (`instalar.sh:16`). Arquivo do grupo (a)
não some — fica no disco e para de funcionar quando o `lib.sh`/`executor.sh`/`local-loop.sh`/`orq-painel.py`/`fila-read.ts`
de que depende é sobrescrito.

Legenda: **ESP** = específico do comarka → vira configuração ou extensão no kit · **GEN** = melhoria genérica → sobe
para o kit antes da migração · **OBS** = obsoleto/artefato, já coberto pelo kit ou sem uso.

---

## a) Só no comarka (28)

| # | arquivo | o que faz | par no kit | classe |
|---|---|---|---|---|
| 1 | `scripts/orquestrador/.impeccable/` | cache do hook do impeccable, não versionado | — | OBS |
| 2 | `avaliador.sh` | juiz: chama o claude, lê o veredito, merge `--no-ff` em staging-auto | total: `juiz.ts` + executor + `merge_em_alvo` do local-loop | OBS |
| 3 | `avisa-bloqueio.sh` | osascript quando `.orq-pause` passa de 40 min (crontab `*/20`). Até 02/10 estava morto (caminho relativo, cron roda do `$HOME`); consertado no comarka bed7c14 (PORTE-PENDENTE, ver abaixo) | parcial: `notificar()` + alarmes do painel | ESP |
| 4 | `avisa-fila-parada.sh` | osascript quando 0 prontos e 0 em execução por mais de 40 min (crontab `*/20`) | parcial: evento OCIOSO + `deve_notificar` | ESP |
| 5 | `com.comarka.orq-server.plist.template` | launchd de **serviço** (RunAtLoad + KeepAlive) do painel em 127.0.0.1:8787 | nenhum: o kit não tem plist de serviço para o painel | GEN |
| 6 | `com.comarka.orquestrador.plist.template` | job do loop, label fixo, StartInterval 900 | total: `com.orquestrador.plist.template` com `{{LABEL}}`/`{{START_INTERVAL}}` | OBS |
| 7 | `instalar-orq-server.sh` | instala o plist do serviço do painel | nenhum | GEN (com o #5) |
| 8 | `limpar-worktrees.sh` | varre worktrees órfãs de todos os repos de `~/Projetos` (N dias, árvore limpa), dry-run por padrão | parcial: o kit só remove a worktree do ticket corrente | GEN (raiz vira config) |
| 9 | `orq-contrato.py` | conformidade com o contrato antigo entre repos | total: `CONTRATO.md` + `gate-ticket.ts` + `schemas/` | OBS |
| 10 | `orq-granularidade.py` | régua de granularidade + backtest sobre os runs | parcial: só em prosa (`doutrina/SKILL.md`) e triagem em `PECAS.md` | GEN com ressalva (dá falso sinal: score 6 em todo ticket) |
| 11 | `orq-server.py` | painel HTTP multi-repo com pausar/retomar/kick/instalar_agente; `LABELS` fixo | quase total: `orq-painel.py` K12 (mesma porta 8787). Falta `instalar_agente` | OBS |
| 12 | `orq-telemetria.py` | métricas do `meta.json` + 8 baldes de motivo | total via trilha (`orq`, `orq custo`); baldes em `schemas/motivo_categoria.json` | OBS (dependência do #11) |
| 13 | `relatorio-email.ts` | relatório diário via Resend (GitHub Actions `30 11 * * *`) | parcial: `notificar()` canal arquivo | ESP |
| 14 | `telemetria.ts` | agregador quebrado (0 de 313) | total | OBS |
| 15 | `test-adiado.sh` | rate limit volta a pendente sem gastar retry | total: `test-causa-adiamento.sh`, `test-ambiente-adiado.sh` | OBS |
| 16 | `test-cleanup-worktree.sh` | prova `limpar_worktrees_orfaos` (ticket 282) | nenhum | GEN (com o #8) |
| 17 | `test-cooldown-causa.sh` | cooldown só para causa remota | total: `test-causa-adiamento.sh` (porte declarado) | OBS |
| 18 | `test-disjuntor.sh` | disjuntor sem progresso | total: `test-sem-progresso-limite.sh` | OBS |
| 19 | `test-drenagem-divergente.sh` | drena 2 tickets com push por ticket | parcial: `test-drenagem.sh`/`test-ocioso.sh`; push proibido (D11) | OBS |
| 20 | `test-gate-streak.sh` | pausa quando o mesmo gate reprova N tickets diferentes | nenhum (`config-tabela.ts`: "conceito novo") | GEN |
| 21 | `test-parser-verdict.sh` | parser do veredito, lixo vira ADIADO | total: `test/orquestrador-juiz.test.ts` | OBS |
| 22 | `test-prioridade.sh` | campo `prioridade` na seleção (menor vence, default 50, respeita dependência) | nenhum: o loop do kit ignora o campo | GEN |
| 23 | `test-worktree-prefix.sh` | prefixo de worktree por repo (colisão com o actus, 21/09) | total: `worktrees_prefixo` + `decisao.ts:nomeWorktree` | OBS |
| 24 | `writeback-notion.ts` | upsert do estado da fila numa página do Notion (`NOTION_PAGE_ID` fixo); importado por 2 testes vitest | nenhum (`config-tabela.ts:443`) | ESP |
| 25 | `scripts/roadmap/estado-fila.py` | contagem da fila, grava `_estado.json`; lê o **último** bloco json | parcial: `orq fila` | ESP (vira OBS depois) |
| 26 | `scripts/roadmap/gerar-a11y-a1.py` | gerador único dos 60 tickets a11y A1, já executado | nenhum | OBS |
| 27 | `scripts/roadmap/prontos.py` | prontos/presos/travados na ordem do loop; lê só `.liberadas` | quase total: `pendentes_razoes` + card do painel | ESP (vira OBS depois) |
| 28 | `docs/orquestrador/skill/references/instalacao-portavel.md` | guia de instalação portável; Fase 2 = adaptador de writeback para board | parcial: `fase-0-arquitetar.md`, `setup.md`, `docs/launchd.md` | GEN (Fase 2; tirar exemplos do comarka) |

Totais: GEN 8 (#5, 7, 8, 10, 16, 20, 22, 28) · ESP 6 (#3, 4, 13, 24, 25, 27) · OBS 14.

## b) Só no kit (74), por capacidade

| capacidade | arquivos | o que traz | par no comarka |
|---|---|---|---|
| CLI único | `scripts/orq` | fila, eventos, erro, ticket, custo, decisoes, mapa, validar, versao, config, prevoo; escreve só pausar/retomar/liberar | peças soltas: `orq-pause.sh`, painel, `prontos.py`, `estado-fila.py` |
| Config v2 | `config-chaves.ts`, `config-cli.ts`, `config-tabela.ts` | chaves lidas pelo motor com `arquivo:linha`; `orq config` acusa placeholder e obrigatória ausente; de-para v1→v2 | nenhum. Hoje o comarka não tem **32 das 40** chaves obrigatórias |
| Migração de `docs/fila` | `migrar-comum.ts`, `migrar-config.ts`, `migrar-liberacoes.ts`, `migrar-tickets.ts`, `liberacoes-core.ts` | dry-run por padrão, `--aplicar` com `.bak`, só via `instalar.sh --migrar` | nenhum |
| Liberação humana | `liberar-cli.ts` | `orq liberar humano:token [nota]`, exige liberações v2 | edição à mão |
| Decisão e diagnóstico | `decisao.ts`, `decisao-cli.ts`, `diagnostico.ts` | adiar/reprovar, retry e escada de modelo por causa, reabertura humana, base vermelha (632), diagnóstico de retry em JSON | espalhado em `lib.sh` (`is_adiavel`, `cooldown_*`, `gate_streak_*`) e `local-loop.sh` (`disjuntor_*`) |
| Gates genéricos | `gates.ts` | percorre `.gates[]` do config, tipo `baseline` com direção | `gate_tsc/vitest/build` fixos em `executor.sh` |
| Gate de ticket | `gate-ticket.ts` | schema, id, critérios, segurança do `cmd`, deps, sobreposição; pré-voo por ticket (`aviso` por padrão) | `scripts/validar-fila.py`, que faz **mais**: executa o recon e o discrim contra HEAD |
| Juiz | `juiz.ts` | risco baixo/alto por diff, paths e palavras; dois modelos; `contexto_juiz` | `avaliador.sh`, um modelo só |
| Pré-voo da drenagem | `prevoo.ts` | spec vendorizada, identidade, estrutura da fila, tsx, sondagem; NO-GO deixa ocioso | `preflight()` do executor, por ticket |
| Reparo de trilha | `reparar-trilha.sh` | reparo único do `events.log` | sem `events.log` no comarka |
| Lint do roadmap | `scripts/roadmap/lint-mapa.py` | cruza `MAPA.md` × `mapa.json` × config | o comarka não tem `mapa.json`/`MAPA.md` (outro modelo: frente/onda/serie/camada) |
| launchd | `com.orquestrador.plist.template` | label e intervalo vêm do config | template próprio, label fixo |
| Doutrina | `EXECUTOR.md` (raiz da skill), `CHANGELOG-v2.md`, `templates/PECAS-seed.md` | prefixo do prompt (já existe no comarka só em `templates/`), mudanças v1→v2, semente do backlog de harness | `CHANGELOG-v3.md` local |
| Testes de shell (24) | `test-adiamentos-limite`, `-ambiente`, `-ambiente-adiado`, `-causa-adiamento`, `-notificacao-ambiente`, `-reprovado-sub`, `-retry-worktree`, `-tentativas-persistidas`, `-reabertura-humana`, `-sem-progresso-limite`, `-ocioso`, `-rc-executor`, `-orq-pause`, `-lib-config`, `-gate-prevoo`, `-preflight`, `-painel-{alarmes,detalhe,lento,pausa,visao}`, fixtures `-fixture-{drenagem,executor,painel}` | cobrem decisão, drenagem, gate de ticket, pré-voo e painel | portes de `test-cooldown-causa`, `test-disjuntor` |
| Testes vitest (19) e fixtures (8) | `test/orquestrador-*.test.ts`, `test/fixtures/orq-harness.ts`, `criterios/`, `trilha/`, `gate-ticket-grep-q/`, `orquestrador-base-vermelha/` | juiz, gates, gate de ticket, trilha, executor/prompt, decisão | — |

Atenção: os testes vitest entram em `test/` do comarka, logo no `include` do tsconfig e no gate de tsc (baseline 3).
Qualquer erro de tipo neles muda a contagem.

## c) Nos dois, comportamento divergente (18)

| arquivo | diferença | o que o comarka tem e o kit não | classe |
|---|---|---|---|
| `executor.sh` (899 × 1659) | o kit tem juiz em dois níveis, refatiar, pré-voo, custo, retry por causa, base vermelha; o comarka tem gates fixos, recon, dev server e avaliador.sh | `run_recon` executado antes do agente | **GEN** |
| | | `Bash(git rm:*)` nas tools (64eb67d) | **GEN** |
| | | `aviso_allowlist` (só avisa) | GEN menor |
| | | gates tsc/vitest/build com `baseline_scope_regex`; C0 e baseline no prompt; `serve_up/down` para critério curl; chamada ao `avaliador.sh` | ESP |
| `lib.sh` (712 × 1495) | o kit tem trilha, custo, notificação, ambiente; faltam no kit 13 funções do comarka | `ticket_prioridade`/`selecionar_pendente` | **GEN** |
| | | `gate_streak_*`/`extrai_gate_motivo` | **GEN** |
| | | `limpar_worktrees_orfaos` | **GEN** |
| | | `wt_add_or_die` (stderr visível) | GEN menor |
| `local-loop.sh` (444 × 859) | o kit tem lock em TS, pré-voo, guarda da branch protegida, razões de ociosidade | orq-runner/`ORQ_EXEC_ROOT`, push por ticket e do autocommit, writeback Notion | ESP (push conflita com D11; orq-runner é defeito aberto, 8fb9047) |
| | | fetch com retry 3×20s ao acordar | GEN menor |
| `enforcement-core.ts` | o C0 do comarka está no código; no kit vem do config (zona_proibida, migration, credencial, coluna) | `normalizarEntradaAllowlist` (`dir/` → `dir/**`, ticket 295) | **GEN** |
| | | `ehComentario` tira comentário da varredura C0/DDL (184) | **GEN** |
| | | `ehArquivoDeTeste` isenta DDL em teste vitest (170) | **GEN** |
| | | lista C0 | ESP → `zona_proibida` |
| `enforcement.sh` | o comarka manda só `c0_intocavel` e roda do MAIN_CHECKOUT por causa do orq-runner; o kit manda o config inteiro | rodar do MAIN_CHECKOUT | ESP |
| `launchd-run.sh` | o comarka carrega `~/.env.orquestrador`; o kit recusa e recupera STATUS congelado | eco do motivo da pausa no log | ESP (env); GEN menor (eco) |
| `instalar-launchd.sh` | label e template fixos × `launchd.*` do config com dry-run | label, intervalo 900 | ESP → config |
| `orq-pause.sh` | o comarka usa só `.orq-pause`; o kit trata `PAUSAR` + `.orq-pause` com trilha | — | kit é superconjunto |
| `perfil.ts` | o comarka tem `toolsForPerfil` sem uso; o kit deriva as tools dos gates | `perfis_tools` | ESP opcional |
| `fila-read.ts` | o kit tem a classe `refatiar` e tipos exactOptional | — | kit é superconjunto |
| `orq-painel.py` | HTML estático + `orq-server.py` × servidor K12 com `repos.json` | coluna de prioridade | ESP (substituído pelo K12) |
| `test-drenagem.sh` | cada um testa o próprio `drenar()` | cenário de ordem por prioridade | GEN (com a prioridade) |
| `doutrina SKILL.md` | o kit tem motor versionado, ID global, `risco` derivado | regra 21 (ticket humano validado por máquina), lições de `grep -rc` em alvo único, "critério impossível ensina a driblar o gate", "`recon_esperado` é campo" | **GEN** |
| `references/autoalimentacao.md` | v1 (faixa de IDs) × v2 (ID global) | — | kit é superconjunto |
| `references/setup.md` | fluxo v1 ("gere os scripts", board Notion) × `instalar.sh --novo` | §6.5 board Notion | ESP; resto obsoleto |
| `templates/PLAYBOOK-seed.md` | o kit acrescenta 15 lições do conteudos-infinitos | — | kit é superconjunto |
| `templates/TICKET.md` | o comarka tem o exemplo de `recon_esperado`; o kit tem `contexto_juiz`/`exemplos_regex` | exemplo de recon | GEN (com o recon) |
| `templates/config.json` | o kit acrescenta branch_protegida, launchd, políticas; o comarka tem `proibicoes_absolutas` em prosa | — | kit é superconjunto (migrar a prosa é humano) |

## d) Nos dois, diferença cosmética ou de caminho (6)

| arquivo | tipo |
|---|---|
| `lock.ts` | só o comentário de cabeçalho (nota de porte) |
| `test-diff-lines.sh` | mesmo teste do numstat (6307912 = e167e0d); variável `dl` → `DIFF_LINES` |
| `test-drenagem-sem-progresso.sh` | porte declarado, comportamento equivalente; fixture diferente |
| `references/fase-0-arquitetar.md` | só o trecho de faixa de IDs (v1 → v2) |
| `templates/MAPA.md` | faixa de IDs por bloco removida |
| `templates/mapa.json` | `faixa_ids` → `_sem_faixa_ids` |

Já portados do comarka para o kit (não contam como divergência): 6307912 → e167e0d (numstat), 5f2785d → 23aa9f0
(autocommit, sem push), 50c6b02 → `worktrees_prefixo`, e0973b0/c31cfc8/a082b79 → `sem_progresso_*` e `--ticket`,
be8b0a7 → RunAtLoad (porte Actus 7b-7).

---

## Antes de migrar

### Sobe para o kit: melhorias genéricas (10)

1. **Recon executado no loop** antes do agente: `run_recon`, o exemplo no `TICKET.md` e a lição do `SKILL.md`. O kit adiou de propósito ("peça 1b", `gate-ticket.ts:12`); cerca de 44 pendentes do comarka usam.
2. **Allowlist `dir/` → `dir/**`**: `normalizarEntradaAllowlist`.
3. **Comentário fora da varredura C0/DDL** (`ehComentario`) e **DDL em teste vitest isento** (`ehArquivoDeTeste`). Os dois estão em `enforcement-core.ts`; um porte só.
4. **Campo `prioridade`** com seleção num único lugar (`selecionar_pendente`), mais o cenário de `test-prioridade.sh`/`test-drenagem.sh`.
5. **Gate streak**: `gate_streak_*`, `extrai_gate_motivo` e `test-gate-streak.sh`. O comarka roda com `gate_streak_limite=2`.
6. **`Bash(git rm:*)`** em `BASE_TOOLS` do `perfil.ts`.
7. **Limpeza de worktree órfã**: `limpar_worktrees_orfaos` no início da drenagem + `limpar-worktrees.sh` (raiz em config) + `test-cleanup-worktree.sh`.
8. **Painel como serviço launchd**: template RunAtLoad/KeepAlive + instalador, apontando para o `orq-painel.py` do kit. Inclui ou descarta `instalar_agente`.
9. **Doutrina**: regra 21 e as lições de critério do `SKILL.md`, e a Fase 2 de `instalacao-portavel.md` sem os exemplos do comarka.
15. **Aviso de loop parado, não só de fila pausada** (registrado 02/10; numerado 15 para não renumerar as referências ao item 10). O `avisa-bloqueio.sh` só olha a idade do `docs/fila/.orq-pause`. Não detecta o LaunchAgent descarregado nem o loop sem rodar há horas: em 01→02/10 o loop ficou desligado a madrugada inteira via `launchctl bootout` e nenhum aviso saiu. Proposta: alertar quando o run mais recente em `docs/fila/runs/*/meta.json` tiver mais de N horas (N em config) **e** houver ticket pendente elegível (mesma seleção do `selecionar_pendente`, para não alertar com a fila vazia ou toda bloqueada). Entra como caso do gancho do item 10. Só registrado, não implementado.

Opcionais (o comarka não perde nada que use todo dia): fetch com retry ao acordar, `aviso_allowlist`, `wt_add_or_die` com stderr, eco do motivo da pausa, `orq-granularidade.py` (só depois de corrigir o falso sinal).

### Sobe para o kit: pontos de configuração/extensão para o que é do comarka (5)

10. **Gancho de extensão pós-drenagem/notificação** para plugar writeback Notion (`writeback-notion.ts`), relatório por e-mail (`relatorio-email.ts`) e os avisos de fila parada/bloqueada sem tocar no motor.
    - **Nota (02/10):** desde 29/09/2026 o Notion não é mais usado na operação da Comarka. Decidido em 02/10:
      o `writeback-notion.ts` e tudo que depende dele **não é portado; remover na migração** (já está desligado, nada
      sai antes). O gancho fica só para e-mail e avisos. Remover na migração, no comarka (02/10, 718206d):
      - `scripts/orquestrador/local-loop.sh:414-436` — passo 4 da drenagem (`npx tsx scripts/orquestrador/writeback-notion.ts sync`); só roda com `ORQ_NOTION_WRITEBACK=1`, que não está no plist instalado, então já está inativo localmente
      - `.github/workflows/orquestrador.yml:84` — `writeback-notion.ts sync` no workflow (disparo manual)
      - `test/writeback.test.ts` e `test/writeback-notion-chunking.test.ts` — importam o módulo; apagar o `.ts` sem apagar os dois quebra o vitest
      - `docs/fila/000-config.json:14-15` — chave `writeback_notion: true` e sua descrição (lida pelo local-loop)
      - doutrina: `references/setup.md` §6.5 (board Notion) e a Fase 2 de `references/instalacao-portavel.md` (adaptador de writeback)
11. **Escopo no gate `baseline`** (o equivalente de `baseline_scope_regex`): sem ele a contagem do tsc do comarka (baseline 3, filtro `^\.next/`) deixa de valer.
12. **Dev server para critério curl/localhost** (`serve_up/down`) como capacidade opcional de config.
13. **`migrar-config` cobre os nomes do comarka**: `worktree_prefix` → `worktrees_prefixo` (sem isso volta a colisão com o actus) e `disjuntor_sem_progresso_limite` → `sem_progresso_limite`. Grep vazio hoje.
14. **Execução fora do checkout principal**: o caso orq-runner/`ORQ_EXEC_ROOT` (defeito aberto 8fb9047) precisa de resposta no kit — suporte ou decisão escrita de abandonar o orq-runner — porque o `enforcement.sh` do comarka depende disso.

Fica como configuração no comarka, sem mudança no kit: `zona_proibida` (lista C0), `launchd.label` + `start_interval: 900`, `perfis_tools`, `modelos.juiz_*` (de `avaliador_model`). Fica fora do motor: push por ticket e do autocommit (D11 proíbe; vira passo humano ou extensão do item 10).

### PORTE-PENDENTE abertos no comarka

| commit comarka | o que é | estado no kit |
|---|---|---|
| 6307912 | `diff_lines` via numstat | equivalente ao kit e167e0d; fecha na migração |
| bed7c14 (02/10) | `avisa-bloqueio.sh`: shebang bash e repo resolvido por `dirname "${BASH_SOURCE[0]}"`. Antes testava `~/docs/fila/.orq-pause` (cron roda do `$HOME`) e nunca avisava. Provado com repo falso pausado há 2h: antes silêncio, depois `IDADE=120` e osascript | o kit não tem o arquivo (grupo a, #3, ESP). Não porta como script: entra como caso do gancho do item 10, e a lição genérica é "script de cron do motor resolve o repo pelo próprio caminho" |

### Lado do comarka, na hora da migração (não é item do kit)

- Preencher as 32 chaves obrigatórias que faltam no `000-config.json` (orçamento, `branch_protegida`, `juiz.*`, `gate_ticket.*`, `ambiente_id`…).
- `migrar-liberacoes`: a chave `liberadas` some. Ajustar quem lê: `prontos.py`, `orq-painel.py`, `orq-server.py`, `validar-fila.py`, `test-validar-fila.py`.
- `migrar-tickets`: `recon_esperado` → `recon`. Ajustar `validar-fila.py`, `test-validar-fila.py`, `orq-telemetria.py`, `test/recon-esperado.test.ts`.
- Os 35 pendentes não têm `bloco` nem `risco` (aviso no pré-voo).
- Os scripts que ficam no repo leem o **último** bloco json; o contrato do kit lê o **primeiro** (`estado-fila.py`, `orq-contrato.py`).
- Criar `docs/roadmap/MAPA.md` + `mapa.json` ou desligar o lint do mapa.
- Descarregar `com.comarka.orq-server` antes (KeepAlive na porta 8787, que é a mesma do painel do kit; o `orq-server.py` importa funções que o `orq-painel.py` do kit não tem).
- Remover os crons `*/20` dos avisos e trocar pelo item 10; revisar o job do GitHub Actions do relatório.
- Remover o writeback Notion (decidido 02/10): `writeback-notion.ts`, o passo 4 de `local-loop.sh:414-436`, a chamada em `.github/workflows/orquestrador.yml:84`, `test/writeback.test.ts` + `test/writeback-notion-chunking.test.ts`, e a chave `writeback_notion` em `docs/fila/000-config.json:14-15`.
- Rodar a contagem do tsc com os testes vitest do kit dentro de `test/`.

## Estimativa

**15 itens precisam subir para o kit** antes de o comarka poder ser instalado sem perder capacidade:
10 melhorias genéricas + 5 pontos de configuração/extensão. Os maiores são o recon no loop (1), a prioridade (4),
o gate streak (5) e o gancho de extensão (10). Os outros são portes de função ou de chave.
Mais 5 opcionais pequenos. Do lado do comarka são 10 frentes de adaptação, a maioria mecânica via `--migrar`.

Classificação: grupo (a) e (c) do comarka lidos arquivo a arquivo; (b) agrupado por capacidade. As afirmações
"quebra depois da troca" sobre `orq-server.py` e os `test-*.sh` são inferência por leitura, não execução.
