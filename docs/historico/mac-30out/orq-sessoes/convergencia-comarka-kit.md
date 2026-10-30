# Convergência de motor: Comarka OS × orquestrador-kit

Data: 18/10/2026. Leitura só, sem rodar nada dos dois repos.
- Kit: main 85c49a6.
- Comarka: lido em main b9101cc (12:03). A main andou para 4851598 (12:45) enquanto eu lia; as linhas citadas são de b9101cc.
- Notas de base, com o detalhe de cada afirmação, em `~/orq-sessoes/convergencia/notas/`:
  - 00 mapa do Passo 0;
  - 01 contexto e evidências a–d;
  - 02 inventário do motor do Comarka;
  - 03 commits de motor do Comarka;
  - 04 inventário do motor do kit;
  - 05 Comarka, capacidades 27–34;
  - 06 kit, capacidades 27–34, sombra e sha de sincronização.
- Os 89 resgates da janela 04–17/10 estão extraídos em `convergencia/tmp/resgates-89.csv`, tirados de `medicao-comarka/out/14d/intervencoes.csv`.
- Custo em linhas é estimativa minha, a partir do tamanho do código vizinho. Não é medição.

## Confirmação da leitura do Passo 0 (com correções)
1. **Contagem de commits: eram 52, não 51.** A tabela de commits de motor desde 28162a9 tem 52 linhas. O "51" que eu escrevi estava errado. Tirando o e4e2602 (skills de UI, que toca `.claude` mas não é motor), sobram 51, e um deles é merge (53da015).
2. **Autocommit: confere, com um ajuste de linha.** No Comarka o `git add` do arquivo inteiro está em `local-loop.sh:388`; o `:393` é o commit; no rebase, o add é `:350`. O kit tem o mesmo defeito em `local-loop.sh:816`.
3. **ba731d8: corrigido.** O objetivo mudou só no 1361. No 1371 e no 1377 o que mudou foi o `cmd` de critério (a busca do ticket ganhou um fallback para `git-common-dir`). Quem fez as edições: sem dado. O autor registrado do commit é o próprio autocommit.
4. **Runner sem settings: confere, com um ajuste.**
   - Juiz e sonda do pré-voo da plataforma rodam em `orq-runner`, parado em 3037d25, que não tem `.claude/settings.json` (git cat-file; `avaliador.sh:133`, `executor.sh:893`, `lib.sh:16`). O `~/.claude/settings.json` do usuário não tem PreToolUse nem modelSettings.
   - O ajuste: o `orq-runner-apolo` foi recriado hoje em 9357ca8, que já contém o 6bea005. Ou seja, só a plataforma está sem a guarda.
   - O 1360 está `done` só na staging-auto (8e1d090). O config da main ainda tem `sonnet`/`opus`/`opus` (`000-config.json:17-19`).
5. **Resolvedor e branch: confere.** `resolvedor/repo.ts:179-202` não confere a branch; o grep por abbrev-ref, symbolic-ref ou branch_protegida em `resolvedor/` dá 0.

Uma correção que pesa na matriz: **o kit não tem gate streak.** O defeito `docs/defeitos/2026-10-10-streak-confunde-...md:3` diz isso: "só existe na linhagem do comarka". O streak não é CONSERTAR_NOS_DOIS.

---

## F. Riscos ativos agora

Cada item: evidência → impacto → conserto mínimo → quem conserta. Ordem: o que pode custar ticket ou qualidade primeiro.

**F1. O juiz da plataforma aprova veredito truncado.**
- Evidência:
  - `avaliador.sh:174-185`: o `grep '"aprovado": true'` no texto cru vira `APROVADO=true`, seguido de merge e `done`.
  - Isso já aconteceu de verdade em `local-loop.log:17531` ("json ilegivel — 'aprovado=true' recuperado").
  - O teste que deveria cobrir isso (`test-parser-verdict.sh:22-40`) exercita uma cópia de `parse_verdict_json`, função que não existe mais no executor.
- Impacto: um `done` sem o juiz ter terminado de julgar. Isso é qualidade, não resgate; não aparece nos 89.
- Conserto mínimo: no ramo `*true)` sair com 30 (adiar), como já acontece quando nada é legível. É 1 linha. Mais um teste que roda o `avaliador.sh` de verdade com saída truncada (cerca de 40 linhas), substituindo o teste-cópia.
- Quem: chat do Comarka, com PORTE-PENDENTE. O kit já adia nesse caso (`juiz.ts:501-520` → `juiz_ilegivel`).

**F2. Juiz e sonda da plataforma rodam sem a configuração do projeto.**
- Evidência:
  - `ensure_runner_worktree` (`local-loop.sh:104-116`) só cria o runner se o diretório não existe; depois disso faz `reset --hard` no próprio HEAD.
  - O `orq-runner` está em 3037d25 (11/10), antes do 6bea005 (18/10 00:22).
  - O juiz roda com `claude_run "$ROOT"` (`avaliador.sh:133`), e ROOT é esse runner.
- Impacto:
  - O juiz Opus roda sem o `modelSettings` de esforço.
  - Qualquer regra nova em `.claude/` que entrar depois de 11/10 nunca chega ao juiz.
  - O juiz só tem a ferramenta Read, então o risco de segurança é baixo; o risco é de qualidade.
  - O runner do Apolo tem a configuração e o da plataforma não: os dois loops julgam diferente.
- Conserto mínimo: no `ensure_runner_worktree`, fazer `git -C "$wt" checkout -q --detach "$BRANCH_ALVO"` antes do reset, para o runner sempre seguir a staging. São cerca de 3 linhas.
- Quem: chat do Comarka. Como paliativo, você pode, com a fila pausada, apagar o diretório `orq-runner` para ele ser recriado da staging-auto na próxima drenagem. Isso mexe no loop vivo, então a decisão é sua.

**F3. O runner do Apolo pode perder o registro no git e parar o loop, e há um bug de stdout.**
- Evidência:
  - O caminho e os números de linha são de `docs/fila/runs/local-loop-apolo.log`.
  - Das 11:02 às 12:17 toda drenagem falhou com "not a git repository … worktrees/orq-runner-apolo" e "repo errado: origin=''" (`executor.sh:870`; log `:14317` em diante). O 5242 foi bloqueado por "3/3 sem progresso" às 11:24:15.
  - A recriação às 12:27:22 quebrou em `jq: error: Could not open file [2026-10-18 12:27:22-0300] criando...`. Isso vem de `local-loop.sh:107`, onde um `say` escreve no stdout dentro de `RUNNER_WT="$(ensure_runner_worktree)"` (`:503`).
  - Quem podou o registro: sem dado.
- Impacto: 75 minutos sem drenar no Apolo e um ticket bloqueado sem ter culpa.
- Conserto mínimo (cerca de 10 linhas):
  - mandar o `say` para o stderr;
  - se `git -C "$wt" rev-parse` falhar com o diretório presente, mover o diretório e recriar;
  - travar o `orq-runner-apolo` com lock, como o `orq-runner` já tem.
- Quem: chat do Comarka.

**F4. Falha do pré-voo vira "sem progresso" do ticket.**
- Evidência:
  - O pré-voo roda dentro do executor, por ticket (`executor.sh:847-905`). Quando ele falha com `die`, o local-loop conta como sem progresso do ticket escolhido (`local-loop.sh:129-153`).
  - Foi assim que o 5242 bloqueou hoje (F3).
  - Em 17/10 o login do claude expirou, e a pausa foi gravada à mão por uma sessão (`local-loop.log:112910`). Nada no motor detecta login expirado.
- Impacto: falha de ambiente queima ticket, e você só fica sabendo olhando.
- Conserto mínimo: falha de pré-voo grava uma pausa com `dono: preflight`, notifica uma vez e não incrementa o sem-progresso. São cerca de 25 linhas. O kit já faz o pré-voo antes de escolher ticket (`local-loop.sh:767`).
- Quem: chat do Comarka.

**F5. O autocommit de status leva o arquivo inteiro, nos dois motores.**
- Evidência:
  - O ba731d8 (07:39) levou o objetivo do 1361 e os critérios do 1371 e do 1377, sem trailer.
  - Também `4b5dd2e` e `b988f6c`, que levou 52 tickets (`relatorio-kit-etapa7f-b6.md:97-112`).
  - No Comarka: `local-loop.sh:376/:388/:393/:350`. No kit: `local-loop.sh:796-824`.
- Impacto: uma edição de spec feita por humano, pela vigia ou por uma sessão entra na main como "status automatico", sem autor e sem trailer. A revisão e a vigia não conseguem separar uma coisa da outra.
- Conserto mínimo: o autocommit só commita o arquivo se o diff dele contra o HEAD tocar só as chaves que o loop escreve (`status`, `notas_status`, `tentativas`, `adiado_ate`, `adiamentos_ambiente`). Senão, pula o arquivo e loga "edição alheia". São cerca de 40 linhas em cada motor.
- Quem: kit (lote L1) e chat do Comarka (PORTE-PENDENTE). Veredito: CONSERTAR_NOS_DOIS.

**F6. O resolvedor commita na branch em que o checkout do Comarka estiver.**
- Evidência: `resolvedor/repo.ts:179-202` não confere a branch. O autocommit do Comarka só roda em `main` (`local-loop.sh:371`).
- Impacto: hoje, zero (os 11 commits do resolvedor estão na main). Se o checkout principal for para outra branch por alguns minutos, a correção do R1 cai fora da main, e o loop, que lê o working tree, roda com uma spec que a main não tem.
- Conserto mínimo: recusar quando `rev-parse --abbrev-ref HEAD` for diferente da `branch_protegida` do repo. São cerca de 10 linhas e um teste.
- Quem: kit (lote L2).

**F7. O 1360 está `done`, mas não vale.**
- Evidência: está mergeado só na staging-auto (8e1d090). O loop lê o config do checkout principal (`lib.sh:50`), que ainda usa apelidos. O `modelSettings` do `.claude/settings.json:4-8` está escrito por ID completo.
- Impacto: se o esforço por modelo está valendo para o executor ou não: sem dado. O plano diz "vale por completo depois do 1360" (`plano-claude-code-out26.md:42-43`).
- Conserto: publicar ou promover o 1360.
- Quem: você.

**F8. A pausa manual é removida por terceiros.**
- Evidência:
  - Em 16/10, a mesma pausa precisou ser regravada três vezes: "regravada 3a vez, algo remove esta pausa" (resgate `pausa_manual` 16/10 15:26).
  - `publicar.sh` grava e retira a pausa sozinho (2047d16). `docs/defeitos/2026-10-16-elegibilidade-working-tree.md:72-116` descreve uma pausa manual removida sem ninguém pedir.
  - O resolvedor retoma a pausa de gate com `orq-pause.sh --off` (`gate-streak.ts:208`), que apaga as duas sentinelas.
- Impacto: o loop volta a rodar enquanto você ainda está revisando spec. Pesa 9 dos 89 resgates, que são do tipo `pausa_manual`.
- Conserto mínimo:
  - quem retira a pausa só retira a que ele mesmo gravou, conferindo a linha `dono:`;
  - o `--off` do resolvedor passa a remover só a pausa de gate.
- Quem: chat do Comarka (publicar e ritual) e kit (`gate-streak.ts`, no lote L2).

**F9. O `publicar.sh` não espera o loop do Apolo.**
- Evidência:
  - `publicar.sh:134` espera só o `runs/.local-loop.lock`.
  - Os `promover-*.sh` esperam os dois locks (`:127-130`).
  - A guarda não lista `promover-plataforma.sh` em `SCRIPTS_DO_LUCAS` (`guarda-ferramenta.py:133`).
- Impacto: um publicar no meio de um ticket do Apolo. A pausa global segura o próximo ticket, mas não o que já está rodando. Não achei caso real.
- Conserto: esperar também o `.local-loop-apolo.lock` (cerca de 5 linhas) e acrescentar o script à lista da guarda (1 linha).
- Quem: chat do Comarka.

**F10. Há 51 worktrees fantasmas registradas no Comarka.**
- Evidência:
  - `git worktree list` mostra 51 entradas em `/sessions/rcw-*/tmp/validar-fila-*/arvore`, todas `locked initializing`, criadas em 17/10 entre 12:17 e 20:17.
  - Origem: `validar-fila.py:1076-1099`. Quando o `add` falha (sandbox Cowork), ele apaga o tmp e deixa o registro.
  - O `fechar_arvore` não remove worktree travada (`:1102-1110`), e o prune foi tirado de propósito no 681284d.
- Impacto: ruído e tentação de rodar um `git worktree prune` global. Foi um prune assim que podou a staging em 11/10, e é a hipótese para o runner do Apolo de hoje (sem dado).
- Conserto: `abrir_arvore` desfaz o registro quando o `add` falha (cerca de 8 linhas).
- Quem: o código é do chat do Comarka. A limpeza das 51 entradas é sua, no Mac e com a fila pausada.

**F11. O alarme não cobre o Apolo.**
- Evidência: `avisa-bloqueio.sh` só olha `docs/fila/.orq-pause`, e `avisa-fila-parada.sh` só a fila da plataforma. A pausa de gate do Apolo fica em `PAUSA_LOOP_FILE` (`lib.sh:569`).
- Impacto: o Apolo pode ficar parado sem aviso. As 75 minutos do F3 não alarmaram nada.
- Conserto: iterar pelos dois loops (cerca de 10 linhas).
- Quem: chat do Comarka.

---

## A. Matriz

Legenda dos vereditos:
- **P** = PORTAR_PARA_KIT
- **S** = SUGERIR_AO_COMARKA
- **E** = EQUIVALENTE
- **C2** = CONSERTAR_NOS_DOIS
- **D** = DECIDIR

C = Comarka, K = kit. Arquivos sem prefixo de pasta estão em `scripts/orquestrador/` do respectivo repo.

| # | capacidade | Comarka | kit | melhor e evidência | veredito | custo e risco |
|---|---|---|---|---|---|---|
| 1 | seleção, prioridade e dependências | prioridade 1-99 (ausente=50), seleção única em `lib.sh:162-240`; dependência `done` em qualquer das duas filas (`:118-130`) | ordem alfabética (`lib.sh:121-123`), `razao_nao_processavel` com `adiado_ate` (`:670-692`) | C: a fila usa prioridade (1360 com 20, 1361 com 40); paridade entre painel e loop no 819707f | P | ~60 linhas; risco baixo (ausente=50 mantém a ordem) |
| 2 | multi-fila | `ORQ_LOOP` (`lib.sh:39-44,60,73,306-309,456,487`); Apolo com 167 tickets, 148 done | não tem (`lib.sh:42`, `maxdepth 1`) | C: o Apolo roda desde 14/10. Mas compartilha cooldown, config, `runs/` e lock com o publicar (F9) | P, com cooldown e lock por loop | ~250 linhas; risco médio |
| 3 | pré-voo | por ticket, dentro do executor (`executor.sh:847-905`), com identidade de repo e banco (`:863-880`); falha conta como sem progresso | relâmpago antes de selecionar (`prevoo.ts:268`, `local-loop.sh:767,849`) | K: a falha não queima ticket (F4, 5242 de hoje). C: confere o banco (`supabase_project_id`) | S para a falha; P para a identidade do banco | S ~25 linhas, P ~30; risco baixo |
| 4 | recon antes do agente | `run_recon` (`executor.sh:309-334`); divergente vira `obsoleto` sem claude (`:535-543`) | não executa recon; só renomeia o campo (`migrar-tickets.ts:51`) | C barateia o caso obsoleto (revisão M1, `revisao-comarka-vs-kit.md:139`), mas o recon→obsoleto estava em "não portar" (`:309-321`) | D: recon divergente vira obsoleto ou bloqueado? | ~80 linhas |
| 5 | montagem do prompt e contexto | `build_prompt` (`executor.sh:66-141`) + `.claude/rules` por domínio (e920841) + bloco anti-afrouxamento | `build_prompt` (`executor.sh:350-427`) + diagnóstico JSON no retry (`diagnostico.ts:147`) | sem medição comparativa. Revisão: diagnóstico do K melhor (A2 `:111`); rules do C vêm da branch | E (S do diagnóstico no lote C9) | — |
| 6 | allowlist e guardas de ferramenta | allowlist fixa (`executor.sh:61-63`) + PreToolUse fail-closed (`guarda-ferramenta.py`, 277 linhas; `settings.json:9-21`) | `perfil.ts` derivado + piso (`executor.sh:335,348,986-989`); sem hook | C: o CLI real bloqueou `git add -A` (mensagem do 6bea005). Lacuna do C: não vale no juiz (F2) | P (hook genérico lido de `zona_proibida` + scripts humanos) | ~280 linhas; risco médio (fail-closed trava se o hook quebrar; exige CLI ≥2.1.302) |
| 7 | allowlist de arquivos e teste vizinho | executor amplia a allowlist uma vez com o teste vizinho (457856c; `executor.sh:56-75,436-449`; `lib.sh:771-849`) | R1 do resolvedor, fora do loop (11 ações, todas com desfecho, por exemplo o 1373 hoje) | allowlist é o maior tipo de resgate (22 de 89), todos antes do vizinho existir; R1 teria agido em 11 | D: vizinho no loop, R1 fora, ou os dois (e o R1 sabendo da ampliação)? | ~30 linhas para o R1 ler `allowlist-ampliada.txt` |
| 8 | critério executável | bash novo (31104d0); `criterio_match` (`lib.sh:684-694`); sem `BASE_REF`; dev server na 3004 | bash novo (48c031a); `BASE_REF=branch_alvo` (`executor.sh:471`); rc 126/127 = ambiente (`:483-487`) | `criterio_match` idêntico. K: `BASE_REF` resolve o Apolo, onde `fila.md:24-30` só cita staging-auto | S (exportar `BASE_REF`; 126/127 como ambiente) | ~10 linhas; risco baixo |
| 9 | enforcement por diff | isenta prosa, comentário (`:226`) e teste só de DDL (`:228`); `aplica_migration` varre test/ (`:232`) | mais regras (faixa de migration, credenciais, colunas: `enforcement-core.ts:258-641`); sem isenção de teste nem de comentário | os dois bloqueiam o 1361 (`attempt-1.prev1/enforcement.json`); o K é mais largo (`:265-266`) | C2: `aplica_migration` isento em arquivo de teste; P de `ehComentario`/`ehArquivoDeTeste` (`migracao-comarka.md:92-93`) | K ~60 linhas, C ~2; risco baixo (teste não chama MCP) |
| 10 | gates, base vermelha, baseline | ordem fixa (`executor.sh:488-490`); `gate_tsc` por regex (`:150-156`); vitest da suíte inteira | `gates.ts` do config; base vermelha bloqueia sem juiz e sem culpar o ticket (`executor.sh:1080-1098`, `decisao.ts:773`) | K. 12 dos 89 resgates são gate streak ou pausa de gate, todos vitest, 29 h parado (`resumo.json`) | S | ~80 linhas; risco médio |
| 11 | limite de diff e refatiar | numstat (6307912 = kit e167e0d); estouro gasta retry | refatiar sem retry, `NUNCA_ESCALA` (`decisao.ts:532`) | K. Revisão I1 (`:129`); 15 bloqueios por tamanho, todos do Comarka (`levantamento-bloqueios.md:262-273`) | S | ~30 linhas |
| 12 | juiz | parser recupera o booleano (F1); juiz com Read, rodando no runner (F2); juiz-diff só na publicação | `extrairVeredito` balanceado, ilegível adia (`juiz.ts:501-520`); sem ferramentas, `max-turns 1`; modelo por risco (`:64,:77`) | K. `local-loop.log:17531` aprovou um truncado. Lacuna do K: não tem teste de truncado | S (parser, F1); P de um caso de teste de truncado no K | C 1 linha + teste; K ~20 linhas |
| 13 | retry, diagnóstico, escalada | a 3ª tentativa sempre usa opus (`executor.sh:559-567`); disjuntor por motivo repetido (`:777-798`) | escala só com `sub=juiz` (`decisao.ts:574-593`); diff igual bloqueia (`executor.sh:1018-1031`) | K: só escala quando o modelo é o problema. 58 de 798 tentativas do C em opus (`revisao:26-47`); custo sem dado (#22) | S | ~40 linhas |
| 14 | esforço por modelo | só `settings.json:4-8`; não chega ao juiz (F2); o motor não passa `--effort` | não existe (grep effort = 0) | nenhum medido; plano M1 pede `--effort` por papel no kit (`plano-claude-code-out26.md:96-113`) | P (por papel, flag explícita, não settings) | ~30 linhas; risco baixo |
| 15 | causas, adiamento, cooldown, rate limit | regex mais nova (6ad8fbd "hit your … limit"); timeout local × limite remoto (`executor.sh:589-613`); cooldown compartilhado pelos dois loops (`lib.sh:413`) | tabela de causas (`decisao.ts:87-138`), teto de ambiente 3 (`lib.sh:253`), AMBIENTE coletivo (`local-loop.sh:582`), orçamento | K na estrutura; C no texto da regex | P (regex do 6ad8fbd) | ~5 linhas + teste |
| 16 | disjuntores | motivo repetido; sem progresso persistente; gate streak por rótulo (`lib.sh:513-548,711-719`), limite 4 (655c916) | sem progresso 3, adiamentos 4, repetição (`decisao.ts:650`); **sem gate streak** | C tem o streak e o defeito dele: 762/851 deu 19,8 h (`docs/defeitos/2026-10-10-streak-confunde`); pausa que zera o streak (`…streak-zerado-na-pausa`, 741a) | S (chave = rótulo + assinatura do teste falho); D: o kit precisa de streak, tendo base vermelha? | C ~60 linhas |
| 17 | evidência da tentativa | `.prevK` (457856c) | `tentativas` persistido e slot monotônico (revisão B4 `:115`) | os dois perdem o commit da tentativa sem ref (`relatorio-kit-etapa7f-b6.md:85-95`) | E | — |
| 18 | writeback e autocommit | arquivo inteiro, rebase e push na main (5f2785d, 457856c) | arquivo inteiro, sem push (`local-loop.sh:796-824`); `ticket_commit` por mudança (`lib.sh:274-279`) | os dois têm o defeito (F5) | C2 | ~40 linhas em cada |
| 19 | pausa | global + por loop; publicar e ritual gravam e retiram | PAUSAR + `.orq-pause`; pausa com dono silenciada (37320b8, de 17 avisos para 2) | K no aviso; os dois removem pausa alheia (F8). 9 resgates `pausa_manual` | C2 (só o dono retira) | ~40 linhas no total |
| 20 | merge e push por ticket | push da staging por ticket (`local-loop.sh:212-222`) | merge sem push (`lib.sh:404-408`) | revisão: não portar o push por ticket (`:309-321`); mas sessões Cowork e o critério dependem da staging publicada | D: o kit ganha push opcional por config? | ~20 linhas |
| 21 | staging e promoção | `ritual-staging.sh` 296, `publicar.sh` 269, `promover-*` 559, `checar-promocao.py` 507 | não há código (`SKILL.md:39`); `orq promover` citado e inexistente | C é o único que tem | D: promoção entra no kit ou fica por repo? | se P, >1000 linhas em vários lotes |
| 22 | telemetria e custo | `meta.json` em array (`lib.sh:855-871`); **custo sem dado** (`--output-format text`, `executor.sh:577`) | `grava_meta` + `custo.json` + orçamento fail-open (`lib.sh:1290-1342`) | K. A revisão já apontava "sem ledger" no C | S | ~40 linhas (json + gravar custo) |
| 23 | trilha / events.log | não existe; `local-loop.log` em texto livre, 8,5 MB | vocabulário fechado (`CONTRATO.md:172+`, `lib.sh:436-450`) | K (revisão L1 `:138`) | S | ~80 linhas; não bloqueia a sombra |
| 24 | painel | `orq-server.py` 1983, com subfila, ações e métrica de 24 h | `orq-painel.py` 1504, com alarmes (`:928-1000`) | sem medição | E (subfila entra com o #2) | — |
| 25 | validação do ticket na criação | `validar-fila.py` 1765, 16 camadas nascidas de incidentes (533, 739, 1200), no pre-commit, as novas em aviso (`:76`) | `gate-ticket.ts` 1794, com severidade; sem hook de criação | o gate do K recusaria 91% do controle (`levantamento-bloqueios.md:311-324`); as camadas do C têm caso real | P camada a camada (D a severidade) | ~40-80 linhas por camada |
| 26 | agentes fora do loop | vigia (`VIGIA.md` v2) + executor ampliando a allowlist | triador e resolvedor com ledger e travas (`repo.ts`, `acoes.ts`) | K na engenharia (`repo.ts:107-199`); coordenação de mão única; 0 commits Orq-Vigia | P (o resolvedor trata Orq-Vigia e edição humana como "humano mexeu" e não age no dia) | ~30 linhas |
| 27 | liberações e tokens | `.liberadas` local; a guarda lê `origin/main` (fonte divergente); duas convenções (`banco.md:34` × `fila.md:34`) | compatibilidade lê o C (`lib.sh:636-668`); `RE_TOKEN` recusa `c0-migration-<name>` e 4 tokens existentes | cada um tem uma falha | C2 (K: `RE_TOKEN`; C: uma convenção) | K ~5, C ~10 linhas + texto |
| 28 | zonas protegidas e SQL | `c0_intocavel` com `os_owned_excecoes` (`000-config.json:35-82`); guarda no MCP | `zona_proibida` mais rica, sem exceções (`enforcement-core.ts:78-104`) | K nas regras; C nas exceções e no MCP | P das exceções; D do mapeamento | ~60 linhas |
| 29 | worktrees, runner, lock | runner congelado (F2), registro podado (F3), lock por mkdir sem PID (`local-loop.sh:424`), faxina (`lib.sh:324-350`, que pula id com letra) | sem runner (juiz na worktree do ticket), `lock.ts` com PID (`local-loop.sh:38-48`), limpa só a worktree corrente | K no lock e no juiz; C na faxina | S (runner e lock); P (faxina, corrigida para id com letra) | S ~15, P ~50 linhas |
| 30 | agendamento e jobs | 600 s, RunAtLoad; PATH com node fixo no código (`local-loop.sh:39`), node diferente no orq-server (v24.21 × v24.19) | `decidir_disparo` (recupera / em-curso / segue, `launchd-run.sh:97-112`); job único do resolvedor | K | E (S menor: node vindo só de `NODE_DIR`) | ~5 linhas |
| 31 | notificação e alarmes | crontab a cada 20 min, só plataforma (F11); login expirado não detectado (F4) | `notificar` com log, transição AMBIENTE (`lib.sh:1188-1268`), `pausa.ts` | K | S | ~30 linhas |
| 32 | instalação, config, verificação | `harness-doctor.py` (versão do CLI, hook, env do loop, regex de limite); sem schema | `instalar.sh --verificar` byte a byte; `config-cli.ts` com chaves obrigatórias; sem schema de config | metade em cada | P (checagens do doctor no `--verificar`) | ~80 linhas |
| 33 | testes do próprio motor | `test-parser-verdict.sh` é cópia de função morta; `test-preserva-evidencia.sh` é parcial; sem teste do runner | nenhuma cópia (só stubs de dependência) | K | S | ~60 linhas (junto com o F1) |
| 34 | geração do lote | sessões + `rules/fila.md`; `_TEMPLATE.md:33` com tsc antigo e `:38` com curl 3004; regra cita só staging-auto; nenhum gerador escreve `origin/` (0 de 77 pendentes) | doutrina sem regra de base de critério; planejador não implementado | C tem a regra; K tem o `BASE_REF` | S (template, `BASE_REF`, staging-apolo); P (regra de base na doutrina) | ~20 linhas + texto |

---

## B. Lotes de porte para o kit

Ordem por impacto. Cada lote tem no máximo ~300 linhas e um caso real do Comarka para servir de vermelho-antes.

**L1. Autocommit restrito às chaves do loop (C2, F5), ~60 linhas com teste.**
- Vermelho-antes: fixture com o `docs/fila/1361-*.md` de antes do ba731d8 mais as duas edições (o `objetivo` e o `status`). Hoje o autocommit leva as duas; depois do conserto, pula o arquivo e loga "edição alheia".
- Tem um segundo caso: o 1371, onde a edição está no `cmd`.

**L2. Travas do resolvedor (F6 e F8), ~70 linhas.**
- O resolvedor recusa a escrita se a branch for diferente da protegida.
- O `gate-streak.ts` remove só a pausa de gate, nunca uma pausa com `dono:`.
- Commits `Orq-Vigia:` ou sem trailer no ticket nas últimas 24 h contam como "humano mexeu" (#26).
- Vermelho-antes:
  - a branch: sem caso real, vermelho sintético (checkout em outra branch);
  - a pausa: a pausa manual regravada três vezes em 16/10 (resgates `pausa_manual` 15:06 e 15:26).

**L3. Isenções de teste e comentário no enforcement, mais `RE_TOKEN` (#9 e #27), ~90 linhas.**
- Vermelho-antes:
  - o `diff.raw` do `runs/1361/attempt-1.prev1` com a tool como literal no `test/`; o `enforce` do kit bloqueia hoje e deve passar;
  - `orq liberar c0-migration-<nome>`, que hoje é recusado.

**L4. Prioridade e dependência entre filas na leitura (#1 e o começo do #2), ~150 linhas.**
- Vermelho-antes: a fila do Comarka de 18/10. O 1360 (prioridade 20) tem de sair antes de um id menor com prioridade 50. Os pendentes 1322→5225, 1314→5221, 1325→5227 e 1318→5224 hoje dão `dependencia:inexistente` no kit.

**L5. Regex de limite e esforço por papel (#15 e #14), ~50 linhas.**
- Vermelho-antes: a string "You've hit your session limit", que o 6ad8fbd cobre e o kit não. Para o esforço, um teste que confere `--effort` no argv do executor e do juiz.

**L6. Guarda PreToolUse genérica (#6 e parte do #28), ~280 linhas.**
- O hook é parametrizado por `zona_proibida`, por uma lista de scripts humanos e pela proibição de add amplo, push e `.env`. Fail-closed, com teste.
- Vermelho-antes: o `git add -A` bloqueado pelo CLI 2.1.302 (6bea005) e o `apply_migration` em C0 sem token.
- Depende de decidir o mapeamento C0 para `zona_proibida` (pergunta D5).

**L7. Multi-fila (resto do #2), ~250 linhas.**
- `ORQ_LOOP`: fila, branch, lock, pausa, streak e cooldown por loop.
- Vermelho-antes: o Apolo de hoje. O publicar só esperou o lock da plataforma (F9), e o cooldown é compartilhado (`lib.sh:413`).

**L8. Doctor no `--verificar` (#32), ~80 linhas.**
- Vermelho-antes: o runner sem `.claude/settings.json` (F2). O `--verificar` tem de acusar que o juiz roda sem o hook ou sem o esforço do repo.

**L9. Faxina de worktree (#29), ~50 linhas.**
- Vermelho-antes: ids com letra, como 407c, que o `limpar_worktrees_orfaos` pula (`lib.sh:336`).

**L10. Recon e camadas do `validar-fila` (#4 e #25).** Só depois das respostas D1 e D7, uma camada por lote.

O modo sombra (seção D) é um lote próprio, **LS, com ~250-300 linhas**. Ele pode correr em paralelo com o L1 e o L2 porque não toca o motor.

---

## C. Sugestões ao Comarka

Ordem pelo impacto nos 89 resgates. Cada uma está pronta para colar.

**C1. Base vermelha e chave do gate streak (12 resgates, 29 h parado).**
> No motor (PORTE-PENDENTE): os 12 resgates de gate streak e de pausa de gate entre 04 e 17/10 foram todos 'vitest', com 29 h de fila parada (medicao-comarka/out/14d). Dois conselhos: (1) quando o vitest falha só em teste fora do diff e fora da allowlist do ticket, marque 'base vermelha', não reprove o ticket e não conte para o streak (o kit faz isso em executor.sh:1080-1098); (2) a chave do streak passa a ser rótulo + nome do teste falho, não só o rótulo (lib.sh:711-719), para que dois defeitos independentes não pausem a fila (caso 762/851, 19,8 h). Tamanho: ~80 linhas + teste com o par 762/851.

**C2. Critério com `$BASE_REF` e regra para o Apolo (12 resgates de critério; f01a989 e 0388c97 com base defasada).**
> No executor (PORTE-PENDENTE): exportar BASE_REF=<branch alvo do loop> antes de rodar critério e recon (o kit faz em executor.sh:471), e tratar rc 126/127 como ambiente, não mérito. Na regra .claude/rules/fila.md:24-30: trocar 'git merge-base HEAD staging-auto' por "$BASE_REF", que vale para staging-apolo também (hoje nenhum ticket do apolo cita staging-apolo). No _TEMPLATE.md:33 o critério de tsc ainda é o antigo (diverge de fila.md:20), e :38 traz curl localhost:3004. No validar-fila: camada nova que rejeita 'origin/' em cmd de critério. Tamanho: ~10 linhas de motor + texto + ~30 da camada.

**C3. Só o dono retira a pausa (9 resgates de pausa_manual).**
> publicar.sh e ritual-staging.sh gravam e retiram a pausa sozinhos (2047d16); em 16/10 a pausa manual teve de ser regravada 3 vezes ('algo remove esta pausa'). Regra: quem remove a .orq-pause só remove a que gravou, conferindo a linha 'dono:'; se a pausa tiver outro dono, espera ou sai com aviso. Tamanho: ~25 linhas + teste.

**C4. Autocommit só das chaves que o loop escreve (7 resgates de writeback + ba731d8).**
> No motor (PORTE-PENDENTE): autocommit_status_fila (local-loop.sh:376-393) e rebase_status_fila (:350) fazem add do arquivo inteiro. O ba731d8 (07:39) levou como 'status automatico' a mudança do objetivo do 1361 e dos critérios do 1371 e 1377, sem trailer. Conserto: só commitar o arquivo se o diff contra o HEAD tocar apenas status, notas_status, tentativas, adiado_ate e adiamentos_ambiente; senão pular e logar 'edição alheia'. O kit faz o mesmo conserto em paralelo. Tamanho: ~40 linhas + teste com o 1361.

**C5. Runner que segue a staging e sobrevive a poda (F2 e F3).**
> No motor (PORTE-PENDENTE): (1) ensure_runner_worktree (local-loop.sh:104-116) nunca avança o runner: o orq-runner está em 3037d25, sem .claude/settings.json, e o juiz e a sonda do preflight rodam ali (avaliador.sh:133, executor.sh:893), sem o esforço e sem a guarda do 6bea005; fazer checkout --detach do BRANCH_ALVO a cada drenagem. (2) Se o diretório existe e o registro git sumiu (caso do apolo de 11:02 a 12:17, com 5242 bloqueado 3/3), mover e recriar. (3) O say da linha 107 vai para o stdout dentro de $(...) (linha 503) e corrompeu RUNNER_WT às 12:27:22: mandar para o stderr. (4) Travar o orq-runner-apolo como o orq-runner. Tamanho: ~15 linhas + teste.

**C6. Falha de pré-voo vira pausa com dono e aviso, não sem progresso (F4).**
> Quando o preflight morre (login expirado em 17/10, runner podado em 18/10), hoje conta como sem-progresso do ticket e o disjuntor bloqueia um ticket inocente. Conserto: falha de preflight grava .orq-pause com 'dono: preflight', notifica uma vez (osascript) e não toca o .sem-progresso. Tamanho: ~25 linhas.

**C7. Juiz não aprova veredito truncado (qualidade, F1).**
> avaliador.sh:174-185: no ramo '*true)' do JSON ilegível, adiar (exit 30) em vez de aprovar; já houve um done assim (local-loop.log:17531). Apagar o test-parser-verdict.sh, que testa uma cópia de parse_verdict_json, função que não existe mais, e escrever um teste que roda o avaliador.sh real com saída truncada. Tamanho: 1 linha + ~40 de teste.

**C8. Estouro do limite de diff vira refatiar sem gastar retry, e escalar só por reprova do juiz.**
> Hoje o diff-cap reprova e consome tentativa, e a 3ª tentativa sempre vai para opus (executor.sh:559-567). Os 15 bloqueios por tamanho do levantamento de 24/09 foram todos do Comarka. Sugestão: diff-cap vira 'refatiar' sem retry; opus só quando a reprova anterior foi do juiz (o kit faz em decisao.ts:532,574-593). Tamanho: ~40 linhas.

**C9. Custo medido.**
> Trocar --output-format text por json no executor e no avaliador (executor.sh:577, avaliador.sh:136) e gravar total_cost_usd e usage no meta.json. Hoje o custo do Comarka é 'sem dado'. Tamanho: ~30 linhas.

**C10. Higiene que evita podas e não deixa o Apolo sem alarme (F9, F10, F11).**
> (1) validar-fila.py:1076-1099: quando o 'worktree add' falha, desfazer o registro (51 worktrees 'locked initializing' de sessões Cowork em 17/10). (2) publicar.sh:134 esperar também o .local-loop-apolo.lock. (3) guarda-ferramenta.py:133 incluir promover-plataforma.sh. (4) avisa-bloqueio e avisa-fila-parada olharem também o apolo. Tamanho: ~30 linhas no total.

---

## D. Viabilidade do modo sombra

**O que roda hoje sem custo e sem escrita** (lido no código do kit, nada executado):
- **Enforcement**: `enforce` (`enforcement-core.ts:641`) é puro. A entrada pode vir de `docs/fila/runs/<id>/attempt-N/diff.raw` e da allowlist do ticket. O Comarka tem 1460 diretórios de run, e o `enforcement.json` de cada um é o gabarito. **É a sombra de maior valor.**
- **Validação**: `validarTicket` (`gate-ticket.ts:1393`) é importável. Ressalvas:
  - o `contextoGit` (`:1095-1133`) roda git de leitura sem `GIT_OPTIONAL_LOCKS=0`, então é preciso pôr a variável no ambiente;
  - a `leituraDoVitest` (`:511`) roda `bash -c` em tmpdir.
- **Seleção**: `proximo_pendente` (`lib.sh:724`) via `source lib.sh` com `ORQ_EXEC_ROOT` apontando para o Comarka. Só escreve log no stderr. O gabarito é a escolha que está no `local-loop.log`.
- **Critério**: o `criterio_match` é idêntico ao do Comarka, então concorda por construção e quase não informa. O `run_criterios` executa comandos e grava arquivos, então fica fora da sombra.

**O que impede hoje:**
- **Config:** o Comarka está no schema 1 e faltam 28 chaves obrigatórias. Sem `zona_proibida`, o `enforce` lança TypeError (`:643-644`). Sem `gate_ticket`, a regra 6 do gate fica muda.
- **Formato do ticket:** a fila do kit não desce em `apolo/` (167 tickets). O kit não lê `prioridade` nem `recon_esperado`. 4 pendentes dependem de ids do Apolo.
- **Evidência:** o `criterios.txt` tem outro formato, mas `triador/comum.ts:101` já entende.
- **events.log:** não faz falta, nenhuma das quatro decisões lê.
- **Liberações:** resolvem pela compatibilidade (`lib.sh:636-668`).

**Menor caminho para ligar**: o lote LS, de ~250-300 linhas, inteiro no kit. Nada é escrito no Comarka.
1. Adaptador de leitura: topo + `apolo/` numa fila só, reaproveitando `leitor-legado-comarka.ts`.
2. Config traduzido **em memória**: `c0_intocavel` vira `zona_proibida`, depois da resposta D5.
3. Sombra do enforcement sobre os runs existentes.
4. Sombra da seleção.
5. Sombra da validação.
6. Saída em `~/.orq/sombra/comarka.jsonl`, com concordo/discordo por decisão.
- Rodar exige o seu ok, porque é código do kit lendo o Comarka vivo, mesmo só lendo.
- Primeiro marco: a taxa de concordância do enforcement nos runs de 04 a 17/10.

---

## E. Vigia de convergência

**Registro, em dois lugares:**
- **No kit:** `docs/sincronia-comarka.json`, versionado e escrito só por commit de porte, dentro da etapa. Formato: `{ "comarka_sha": "<sha>", "em": "<data>", "por": "<etapa>", "pendentes": [{ "sha", "assunto", "caminhos", "estado": "aberto|portado|recusado|sugerido", "lote", "kit_sha" }] }`.
  - Substitui a prosa de `docs/migracao-comarka.md:3-4` e `:162-167`, que hoje ancora 718206d, 2078 commits atrás.
  - O md passa a apontar para o json.
- **Fora dos repos:** `~/.orq/convergencia/deteccoes.jsonl`, append-only, escrito pela vigia.

**Detecção, só leitura e sem fetch.** Usa a main local do Comarka, que o autocommit e o publicar mantêm em dia.
```
GIT_OPTIONAL_LOCKS=0 git -C ~/Projetos/comarka-operacional log --format='%H%x09%ad%x09%s' --date=iso <comarka_sha>..main -- \
  scripts/orquestrador .claude/hooks .claude/settings.json .claude/agents .claude/rules/motor.md \
  scripts/test-guarda-ferramenta.py scripts/publicar.sh scripts/ritual-staging.sh scripts/promover-*.sh \
  scripts/validar-fila.py scripts/roadmap .githooks docs/fila/000-config.json
```
- Unir com `log --grep='^MOTOR:' --grep='^PORTE-PENDENTE:' <sha>..main` e tirar os repetidos.
- Classificação de cada commit:
  - `MOTOR:` ou `PORTE-PENDENTE:` → esperado;
  - caminho de motor sem prefixo → **alarme "motor sem prefixo"**. Nesta janela foram 6: 0c5e85e, a5f7784, 64eb67d, ee7d358, db3edde e a4af7a5.
  - O commit de autocommit `fila: status automatico` que toca só `docs/fila/*.md` não aparece, porque os caminhos acima não incluem tickets.

**Quem roda e quando:**
- Um passo de leitura no runbook da Vigia da fila (4 vezes por dia). Não precisa de job novo e não mexe no `com.orq.resolvedor`.
- A vigia grava em `deteccoes.jsonl` os pendentes que ainda não estão no json do kit e avisa só quando aparece um novo.
- Atualizar o `comarka_sha` é coisa do lote de porte, nunca da vigia.

**No Comarka:** pedir ao chat que a `.claude/rules/motor.md` passe a exigir o prefixo `MOTOR:` em todo commit nos caminhos acima. Hoje exige só `PORTE-PENDENTE:`, e só em `scripts/orquestrador/`.

**sha inicial:** a pergunta D6.

---

## DECIDIR: as perguntas

- **D1.** Recon divergente: o ticket vira `obsoleto` (como no Comarka, sem gastar modelo) ou `bloqueado` com a evidência?
- **D2.** Teste vizinho: fica a ampliação dentro do loop (Comarka, 457856c), fica o R1 fora do loop (kit), ou os dois, com o R1 lendo `allowlist-ampliada.txt`?
- **D3.** O kit ganha push da staging por ticket como opção de config, ou o push continua fora do motor?
- **D4.** A promoção (ritual, publicar, promover e checar-promocao) entra no kit como `orq promover`, ou fica por repo?
- **D5.** Mapeamento do C0 para `zona_proibida`:
  - `ghl_comercial` e `dashboard_readonly` viram `no_write_tables`?
  - Como representar `os_owned_excecoes`?
- **D6.** sha inicial da sincronização:
  - 28162a9, com os 52 commits desta janela como pendentes; ou
  - b9101cc, considerando estes 52 resolvidos por este relatório?
  - Recomendo 28162a9.
- **D7.** Camadas do `validar-fila` no kit: quais viram regra do `gate-ticket` e com que severidade? O próprio Comarka mantém as novas como aviso (`REGRAS_NOVAS_COMO_ERRO=False`).
- **D8.** O kit precisa de gate streak entre tickets, já tendo base vermelha? Ou o streak só entra corrigido (C1)?
