# Investigação dos relatórios de sessão x pesquisa de recursos (18/10/2026)

Fontes lidas: `sessoes/medicao-comarka/out/14d/{resumo.json,intervencoes.csv,tickets.csv,loop.csv}`, `relatorio-kit-etapa7f-b7.md`, `relatorio-kit-etapa7f-b6.md`, `relatorio-kit-etapa7f-b5.md`, `medicao-bloqueios-out.md`, `levantamento-bloqueios.md`, `levantamento-7d1-calibracao.md`, `medicao-comarka.md` (igual byte a byte a `medicao-comarka-ate-1010.md`, janela 27/09 a 10/10), `conserto-1006.md`, `conserto-840-929.md`, `primeiros-diagnosticos-comarka.md`, 7f-b1b a 7f-b4 (cabeçalhos e achados), `relatorio-porte-actus-status.md`, `cmk/.claude/settings.json`, `cmk/scripts/orquestrador/*.sh`, `/home/claude/pesquisa-claude-orquestrador-out2026.md`.

Abreviações: `iv.csv` = `medicao-comarka/out/14d/intervencoes.csv`; `b7` = `relatorio-kit-etapa7f-b7.md`; `b6` = `relatorio-kit-etapa7f-b6.md`; `b5` = `relatorio-kit-etapa7f-b5.md`; `mbo` = `medicao-bloqueios-out.md`; `pesq` = a pesquisa.

Ressalva: **não existe relatório escrito da medição de 04 a 17/10.** Só há os CSV e o `resumo.json` em `out/14d/`, mais a tabela por tipo e a análise das 22 de allowlist na `b7:81-142`. O `medicao-comarka.md` é da janela anterior (27/09 a 10/10).

---

## 1. Medição do Comarka, 04 a 17/10

### Placar (`resumo.json`)
- C1: atual 0, maior 0 na janela; 14 de 14 dias com intervenção. Desde 08/08 o maior é 2 (10 e 11/08).
- C2: **74,0%** (413/558; 561 done, 3 sem meta). Primeira linha do meta: done 413, reprovado 142, obsoleto 3.
- C3: 12 dias (última lição no PLAYBOOK em 05/10 15:32).
- Volume: 561 done (40,1/dia), 67 bloqueios (4,79/dia), 65 retomados, 2 sem retomada no corte (1165, 1248); 6,7 h médias bloqueado até a próxima tentativa; 1,5 tentativa por done.
- Horas: loop parado 72 h, pausa gate streak 29 h, operacional 17 h, manual 7 h.
- Custo: **sem dado** (`esforco.custo_usd`); executor 137.853 s nos done, 247 s por done. Causa: `executor.sh:577` e `avaliador.sh:136` do Comarka chamam `claude -p --output-format text`.
- Commits excluídos: 744 do executor, 10 do resolvedor (`Orq-Resolvedor`).
- Classes de linha: intervenção 77 + intervenção embutida 12 = **89**; alimentar_fila 36; curadoria 58; liberação 36; fora_da_fila 114.
- Coluna contrafactual `resolvedor_teria_agido`: não 67, sem dado 5, sim R1 11, sim R5 2, só proposta R2 4. A `b7:114` mostra que ela é otimista (diz "sim R1" em 924a, 1053, 1054, 1055b e 1058, onde o ledger mostra recusa ou aviso).

### C2 por classe de ticket
`tickets.csv` não tem classe de ticket. A única divisão possível é por loop (id ≥ 5000 = Apolo):
- plataforma: 71,3% (301/422);
- Apolo: 82,4% (112/136).

Tentativas por done: 1 = 416, 2 = 61, 3 = 54, 4 a 10 = 27, sem dado 3.

A `b7:78` dá a sequência das reprovas no log de 04 a 18/10: 176 reprovas com retry; o desfecho seguinte foi APROVADO 70, BLOQUEADO 66, outra reprova 33, PAUSADO 7. A medição **não separa o estágio da reprova** (typecheck, critério, vitest ou juiz).

### Os 89 por classe (antes/depois de 11/10, `b7:129-142`)

**allowlist 22 (9/13)** · linhas `iv.csv:38 46 70 75 90 102 103 111 116 126 131 138 145 149 150 153 165 170 199 218 230 314`
- 4 não são resgate e sim release de migration aplicada por MCP ou renomeação para a versão do ledger: `c3cde4a` (889, 892, 897, 903), `676ca51` (898, 898b), `079d3f4` (952a, 972), `cc8d388` (932). Isso deixa **18 resgates reais**.
- 4 entraram no autocommit como embutidas: `ae22bc3` (711b3), `4b5dd2e` (318c, 933, 934b, 935), `b7a3eea` (7 tickets), `75db690` (1195).
- Na hora da edição, 0 ticket estava pendente depois de reprova; todos estavam BLOQUEADO (`b7:24-25`, `:112`).
- Causa raiz, caso a caso:
  - teste acoplado fora da allowlist: 762 (`src/middleware.ts`, `testes_conferidos` falso), 856 (`rotas-orfas.test.ts:257`), 711a (crit 14 proíbe o que `sem-insumo.test.ts:237` exige), 950 (`etapa2-funil-motor`), 1006 (`quem-cuida`), 840 (`nps-reacao-resposta`, gabarito da 7f-b2) (`mbo:123-135`);
  - arquivo de `src` fora, apontado só pelo juiz: 318c, 3 vezes "ampliar a allowlist" (`b6:151`);
  - executor parou com diff 0 porque faltavam importadores em `scripts/` e `test/`: 830 (`b6:152`, `:189`);
  - teste que lê por diretório ou por contagem fixa e não cita o nome do diff: 854 (`expected 21 to be 20`) e 966 (`expected 8 to be 7`) (`b6:154`, `:158`, `:191`, `:195`);
  - mais de um vermelho: 924a, 1054, 1055b, 1058. O humano pôs os mesmos 2 testes que o R1 nomeou e recusou (`b7:116-123`).
- Depois de 11/10, replay da 7f-b7 (`b7:291`): 4 idênticas (1006, 1054, 1055b, 1058), 0 divergentes, 10 sem ação:
  - palpite: 966, 854, 855, 1053b, 1059, 1195;
  - forma fora do R2: 830, 1053;
  - sem classe: 318c;
  - tudo ou nada: 924a.
- Nos 3 casos de dois vermelhos, o humano também subiu o `NO_TETO` em 40 a 60 linhas (`b7:302`).

**criterio 12 (7/5)** · `iv.csv:21 25 40 79 81 96 99 143 181 183 301 309`
- 739, 2 linhas: crit[0] contava comentários de 4 arquivos fora da allowlist, mais FK com DDL e token (`mbo:119`).
- 851: a spec mandava ler `valor_mensal`, que o `c0-guard` proíbe (`mbo:146`).
- `d7a8d54` (707, 741): aceite exige "Abrir grupo", que a tela não tem; o `detectar.ts` sem função pura (`mbo:127-128`).
- 900: a f-string do gerador virou `.{1,2}` (`mbo:130`).
- 707 `f2c3cef`: divergência do cabeçalho aceita; cria 707a e 707b.
- 898: o grep `delete` casa `on delete cascade` (`mbo:134`).
- `f01a989` (1004, 840, 963b, 994): critério comparando com `origin/staging-auto` defasado.
- `3f56478` (924b, 999c) e `3718afa` (924c, 924d, 924f, 926b): família `grep -c` encadeada com `&&`. Estão entre os 12 abertos que a `b6:305` mediu.
- `ce84bb2` (1200): `slice(-4)` mais camadas 13 e 14 do validar-fila.
- `fd12015` (1191, 5159): spec reaberta.
- Formas: shell `grep -c &&` em 2 linhas; regex frágil em 3 (739, 900, 898); premissa ou decisão em 4 (851, 707 ×2, 741); base `origin/` em 1; outras em 2.

**pausa_manual 9 (1/8)**, 7 h · `iv.csv:7 204 274 277 286 287 290 302 324`
- 05/10: erro no validador do 746 (45 min).
- 14/10: tickets do Apolo na fila da plataforma (10 min).
- 16/10, seis linhas: Lucas revisando a fila 1171 a 1173 da sessão Meta. A pausa foi **regravada 3 vezes porque "algo remove esta pausa"** (`iv.csv:277`, `:286`). Depois vieram o 1197 e o ajuste de spec do 1200, esperando o ok do Lucas.
- 17/10 19:11: o vigia pausou por **login expirado do claude CLI** desde ~19 h (preflight rc 1), até 20:31, 9 disparos (`iv.csv:324`).

**motor 8 (0/8)** · `iv.csv:128 129 130 146 205 222 285 318`
- plist 900 para 600 (`ee7d358`);
- instalar-launchd verifica o job (`db3edde`);
- orq-server lê o PID (`fab89d5`);
- critério e recon em bash novo, o defeito HARNESS do `set -u` herdado (`31104d0`);
- loop Apolo (`6df04cc`), cartão do Apolo no painel (`eb010cf`) e plist do Apolo (`a4af7a5`): 3 de 8 são a expansão para o Apolo;
- `457856c`: consertos das reprovas de 13 a 17/10 (evidência do attempt preservada, autocommit com rebase, executor amplia a allowlist para teste vizinho, validar-fila camadas 15 e 16).

**writeback 7 (4/3)** · `iv.csv:51 114 115 120 142 163 265`
- `cfe9743`: 22 tickets, 802 a 823.
- `56d5c5f`: 831 done e liberação.
- `819c49a`: 932 e 940 aprovados no mérito, merge recusado por **árvore suja na staging-auto** rotulada "conflitou" (`mbo:136-137`, `:216`).
- `1a5d41d`: 970 e 980.
- `0388c97`: 1004, de novo `origin/staging-auto` defasado.
- `37a1bce`: 17 done, 855 bloqueado.
- `840d63f`: 1165 bloqueado no gate vitest.

**gate_streak 7 (5/2) e pausa_gate_streak 5 (4/1)**, 29 h · `iv.csv:2 16 33 87 89 140 155` e `iv.csv:3 17 35 88 156`
- 801/802: máquina lenta ou dormindo, `Timeout waiting for worker`. Pausa de 04/10 16:34 a 05/10 10:45, 32 disparos (`mbo:121`, `:144`).
- 760/761: base vermelha, `migrations-policy-idempotente`.
- 762/851: dois defeitos de spec independentes; o streak errou.
- 898/741a e 741a/707: base vermelha `useAcaoUnica`. O **streak zera com `--off`**, e o 741a bloqueou na retomada (`mbo:217`).
- 1009/953: falso positivo (testes diferentes). Gerou o `655c916`, que subiu `gate_streak_limite` de 2 para 4 (`b5:155`).
- 12/10, 835/854/318c/921: 4 defeitos de spec independentes, mesmo com o limite em 4. 921 é da família `grep -c &&` (`b6:305`).

**dependencia 7 (4/3)** · `iv.csv:9 34 56 77 123 152 248`
- `87522d9` (801, 802): deps Início e gate f1-rotas-go.
- `ef7dea4` (855) e `76d4fad` (865): embutidas.
- `917d35b` (826 depende do 866): allowlist sobreposta. A R8 decide a direção contrária à do humano (`b5:85-91`).
- `a269b0f` (840).
- `3047e6c` (835 espera o 834b): as 6 rotas nasceram depois do ticket, caso SPEC_DESATUALIZADA (`b6:139-143`).
- `32f8719` (1060): dublês do espelho, 5 ou mais vermelhos.

**outro 6 (2/4)** · `iv.csv:54 58 137 229 267 325`
- 4 embutidas no autocommit (846 a 848, 869, 991, 1082b).
- `47ff6ef`: renumera 1165 a 1167, que **colidiam com o lote 2 do Apolo na origin**.
- `d790bf4`: 1248 obsoleto, 42 tickets novos.

**reabertura 4 (2/2)** · `iv.csv:62 86 147 190`
- 867: o avaliador reprovou um recálculo honesto; o humano autorizou as contagens `:87` 16→15 e `:119` 13→12 (`mbo:125`).
- 898: base vermelha.
- 318c: `nichos-teses-aba.tsx` na allowlist.
- 1034: o gate vermelho era `auditoria-*-ddl` da staging sem o `caef86f`, base R5 (D7).

**config 2 (1/1)** · `iv.csv:63 141`
- `d33c111`: `writeback_notion` false.
- `655c916`: streak de 2 para 4.

Transversal: **12 dos 89 são edição humana de spec que o autocommit varreu junto com o status** (`intervencao_embutida`; `b6:97-112` mostra o `4b5dd2e` e o `b988f6c`, que levou 52 tickets). Mais **2 por `origin/` defasado** (`f01a989`, `0388c97`).

---

## 2. Levantamentos anteriores

**`levantamento-bloqueios.md` (24/09, 165 tickets: CI 26, Actus 59, Comarka 80)**
- Classes (`:264-273`): motor 32, spec_criterio 29, spec_allowlist 28, humano 24, tamanho 15 (todos no Comarka), topologia 14, dependência 10, ambiente 9, mérito 3, indeterminado 1.
- spec_criterio + spec_allowlist = 57 (35%) e US$ 113,87 de US$ 148,46 medidos (77%). Com o reescritor, (c) = sim em 50 dos 57 (`:328-333`).
- Total por resposta (`:282`): o motor de então evita 12%; bloqueia mais barato 33%; peça prevista 8%; reescritor 42%; só humano 45%.
- Gate de ticket no loop (`:318-321`): recusaria 118/165 bloqueados contra 165/181 do controle (o schema antigo). **Causal 0 de 165.**
- Afrouxamentos (`:349`): 8 claros e 7 leves, todos commits do Lucas.
- Defeito achado: awk `-v` com `\n` impede a regra de AMBIENTE (CI 269 e 270).
- Faltava gravar: rc do critério, sinal do desfecho, base, saída do merge, testes falhos cruzados com a allowlist, não rastreados, diagnóstico da última tentativa, versão do motor (§5).

**`levantamento-7d1-calibracao.md` (25/09)**
- Taxa por ticket executado (`:131-133`): CI 30,1% (25/83), Actus 29,7% (38/128), Comarka 11,7% (76/648). Só spec: 7,2%, 9,4% e 5,9%.
- O Comarka bloqueia menos pelo recon (398 de 608 done com recon) e pelo validar-fila no pre-commit.
- Causa pega por alguma regra: 18/57; nenhuma regra pega 39/57 (`:265-266`).
  - Famílias que escapam: premissa falsa, teste acoplado que o basename não acha, contradição entre critérios, allowlist sem o arquivo real.
- O C1 do recon é a única regra com causa e zero falso positivo (`:387`).
- O C11 é o melhor detector de allowlist, mas pega só 4 de 28 (`:379`).
- O validar-fila do Comarka escreve ao rodar (§1.4).

**`medicao-bloqueios-out.md` (25/09 a 09/10)**
- Comarka: 270 executados, 33 tickets com 37 eventos de bloqueio, taxa 12,3% (só spec 8,2%). CI 0 e Actus 2 executados, sem amostra.
- Destravar: mediana de 2,7 h.
- Agregado (`:159-165`): allowlist 13, critério 10, ambiente 6, dependência 5, motor 2, humano 1. Cerca de US$ 106 estimados e cerca de 385 h bloqueadas.
- Mérito como causa: 0 (`:167`).
- A causa já estava escrita no claude-output ou no verdict em pelo menos 25 dos 37 (`:170`).
- Gate do kit: recusaria 0 de 44 (`:178`), causal 0 de 37.
- Resíduo (`:202-208`): R1 11, R2 9, R3 5, R4 4, R5 6, R6 1, R7 1. (c) sim em 20/37 (54%); (d) sim em 36/37.
- Recomendação de então: só o triador (US$ 5/semana); o reescritor depois da migração.
- Achados de motor do Comarka (`:216-219`):
  - árvore suja vira "conflito";
  - `--off` zera o streak;
  - o streak confunde defeitos independentes;
  - a nota "provável defeito de spec/harness" aparece em tudo.

---

## 3. 7f-b6 (plano não escrito) e 7f-b7 (pendências)

### 7f-b6
Só a P0 entrou (`48c031a`, critério em bash isolado no kit, `b6:371-397`). Não foram escritas:
- **P1** (`b6:274-281`, ~180 linhas): classes como rótulo sobre R1 a R7.
  - D-harness → R6 firme;
  - D-juiz-allowlist → R1 palpite (318c);
  - EXECUTOR_DESISTIU como estado, com a última mensagem só exibida.
- **P2** (`:283-289`, ~220 linhas): reprodução ao bloquear, pelo `head.txt` (o commit das tentativas ainda existe sem ref). Com base verde e tentativa vermelha, 854 e 966 viram R1 firme.
- **P3** (`:291-295`, ~150 linhas): ação pronta (patch do .md, motivo do juiz extraído, requeue em lote para HARNESS).
- **P4** (`:297-308`, ~200 linhas): regras no gate de ticket (`grep -c &&` sem `|| true`, `origin/` em critério, importador fora da allowlist em remoção, C11 como erro para ticket novo).
  - 12 abertos do Comarka tinham a forma (921 a 926b);
  - reproduzir cada um ficou por fazer.
- **P5** (`:310-315`, ~120 linhas): o comparador do R2 aceita equivalência por resultado (os 3 "erros" falsos 933/934b/935), mais `orq resolvedor reavaliar` (append no ledger, dry-run por padrão), direção da sobreposição, D6 firme errado no 762 e `grep -c` como segunda forma mecânica.
- **P6** (`:317-323`, ~200 + 40 linhas): painel com classe por linha, tentativas reais no legado, reprovas das últimas 24 h por classe, alerta de main com commits sem push, diagnóstico sem deriva (966).
- **Lado Comarka** (`b6:256-264`):
  1. conferir o `31104d0` (já feito e na origin);
  2. ref `refs/orq/tentativas/<id>-<n>`;
  3. importadores no pré-voo;
  4. autocommit por campo;
  5. HARNESS não consome retry;
  6. BASELINE_VERMELHA pausa;
  7. coluna "tent." pelo meta;
  8. promover a camada 6 e a regra `grep -c` no validar-fila.
  - Os itens 2 e 4 ficaram parcialmente cobertos pelo `457856c` (evidência preservada, autocommit com rebase), mas o autocommit ainda leva a edição inteira: incidente do 1361 em 18/10 (memória `convergencia-comarka`).

### 7f-b7, pendências
- P1 literal (`na_reprova`) adiada: no Comarka nunca há pendente entre tentativas (`b7:15-21`). No kit, o ticket fica pendente durante a série; seria preciso "série encerrada" pelo `events.log` (`b7:79`).
- 924a sem ação pelo tudo ou nada; decisão aceita (`b7:247-252`, `:365-367`).
- O R1 não sobe o `NO_TETO`; vira `limite_apos_r1` só como proposta (`b7:301-304`, P5).
- Diagnósticos gravados antes da etapa não têm `r1_testes` e seguem recusando até nova triagem (`b7:268`).
- O limite de 30 min da pausa com dono não tem calibração; `pausa_fim` só a partir da 7f-b7 (`b7:160-165`). A recalibração pelo p95 ficou para 25/10 (memória).
- Ainda da 7f-b5 (`b5:191-200`): direção da R8, D6 firme errado no 762, R2 com 0 de 25 formas, família do `grep -c` sai 1 (4 casos).

---

## 4. spike-mods

**A pasta `spike-mods` não está no material** (consta em `sessoes-ls.txt`, mas não foi copiada; `grep` em `sessoes/`, `kit/` e `cmk/` não acha relatório). O que se sabe vem só da pesquisa e da memória:
- o contorno do enforcement por `sed`/`printf` (`pesq:29`);
- a negação do mod não aparece em `permission_denials` (`pesq:82`);
- um mod pode aprovar por cima de deny por padrão (`pesq:119`);
- a regra fechada é: mods só por `--plugin-dir`, só negam (memória `kit-visao-geral`).

Resultado detalhado: **sem dado**.

---

## 5. Itens da pesquisa contra o medido

Universo: 89 resgates (`resumo.json`), 67 bloqueios, 176 reprovas com retry (`b7:78`).

**Seção 1 (riscos)**
- **R1** `--setting-sources user` / `--strict-mcp-config`: atacaria **0 dos 89**; nenhum resgate veio de hook ou MCP do repo.
  - Risco inverso medido: o Comarka **depende** do `.claude/settings.json` do projeto para a guarda PreToolUse fail-closed e o esforço por modelo (`cmk/.claude/settings.json:9-21`). Aplicar R1 no Comarka desliga a guarda; ela teria de ir para o `--settings` do kit.
- **R2** `ANTHROPIC_API_KEY`: 0. O Comarka já zera a variável (`cmk/scripts/orquestrador/local-loop.sh:97`); no executor do kit, `grep` dá 0. O risco é do kit.
- **R3** auto memory, **R4** `--permission-mode`, **R7** aliases: **sem dado**.
- **R5** fork subagents: sem dado de incidente.
  - Conflito: o Comarka usa os agentes `recon` e `juiz-diff` (`cmk/.claude/agents/`, commit `6bea005`), então `--disallowedTools Agent` quebraria isso.
- **R6** `-p` mudo na 2.1.296: sem dado na janela.
  - O incidente parecido é outro: o job do resolvedor sem o `claude` no PATH deu rc 127 vazio e reservou US$ 4,80 sem chamada (`relatorio-kit-etapa7f-b3.md:53-82`).

**Seção 3**
- **3.1 Stop hook com gate rápido:** atacaria **0 dos 89 resgates**.
  - Os 22 de allowlist e os 12 de critério são defeito de spec: o agente não pode tornar verde um critério errado nem tocar teste fora da allowlist.
  - Num critério defeituoso, o hook só gastaria até 8 bloqueios. Exemplos: 933, 934b e 935, que reprovavam no estado certo (`b6:63`); 900; 898.
  - O alvo real é C2: teto de 70 reprovas que passaram no retry seguinte (`b7:78`), entre 142 done fora de primeira (`resumo.json`). Quantas eram typecheck ou critério, e não juiz: **sem dado**.
- **3.2 Testes só crescem:** atacaria **0 dos 89**.
  - Mérito como causa: 0 de 37 (`mbo:167`); o juiz pegou o afrouxamento nas 4 tentativas intermediárias (600, 627j, 407a, 707).
  - Risco medido: a regra literal reprovaria a correção legítima em pelo menos 4 resgates, em que o teste existente muda uma linha:
    - 966: `toBe(7)` vira 8 (`b6:158`);
    - 854: 21 vira 20 (`b6:154`);
    - 867: contagens 16→15 e 13→12 (`iv.csv:62`);
    - 840: troca o alvo do `vi.mock` (`conserto-840-929.md`).
  - O 1006 só acrescenta linhas e passa (`conserto-1006.md`). O R1 do resolvedor precisaria declarar `testes_reescritos`.
- **3.3 Spec impossível:** remove **0 resgates sozinho**, mas antecipa a evidência em até **34** (22 de allowlist + 12 de critério).
  - Base: a causa já estava escrita em pelo menos 25 dos 37 bloqueios (`mbo:170`): 830 e 835 com diff 0 e o executor dizendo o que faltava (`b6:189-190`); 711b3 parou pedindo inclusão (`mbo:127`); 318c, o juiz 3 vezes (`b6:151`).
  - Ganho: 1 tentativa a menos por caso (247 s por done). O resgate continua humano ou R1 enquanto a regra exigir vermelho firme: 7 dos 13 recusados por palpite (`b7:26-30`).
- **3.4 Quarentena de flaky:** atacaria **1 dos 7 gate_streak e 1 das 5 pausas** (801/802, `Timeout waiting for worker` com a máquina travada: `mbo:121`, `:144`; `iv.csv:2-3`, cerca de 18 h).
  - Os outros 6 rodariam vermelho de novo: 3 de base vermelha determinística (760/761, 898/741a, 741a/707) e 3 de spec independentes (762/851, 1009/953, 835/854/318c/921).
  - A pesquisa ("parte dos 7 gate_streak e das pausas", `pesq:56`) superestima. O veredito da 7f-b5 já acerta 6 de 6 (`b5:148-160`).
- **3.5 Saída curta no retry:** **sem dado causal.** Universo: 33 reprovas seguidas de outra reprova e 66 bloqueios depois de reprova (`b7:78`).
- **3.6 Anti-placeholder e antideleção:** atacaria **0 dos 89**; mérito 0 de 37 (`mbo:167`). O único drible histórico é o 523b, que montou o nome com join (`levantamento-bloqueios.md`, §4).
- **3.7 stream-json e 429:** atacaria **1 das 9 pausas manuais** (login expirado em 17/10, `iv.csv:324`, cerca de 1 h 20), se o erro de autenticação virar causa por evento.
  - Adiado por rate limit na 1ª linha: 0 em 14 dias (`resumo.json` C2) e 3 em 30 dias (`medicao-comarka.md:233`).
  - Fecha o "custo sem dado" (`cmk executor.sh:577`, `avaliador.sh:136`, os dois em `text`).
  - O `6ad8fbd` (18/10) já reconhece o limite de sessão por texto.
- **3.8 Juiz:** atacaria **1 das 4 reaberturas** (867, recálculo honesto reprovado: `mbo:125`). As outras 3 são base ou allowlist.
  - Dado de calibração disponível: 4 reaberturas mais 10 desfechos R1 bons (memória `resolvedor`).
  - O 318c mostra o juiz certo e o triador sem extrair (`b6:188`).
  - Haiku ou Sonnet no triador: sem dado de replay.
- **3.9 Canário de versão:** **sem dado** (nenhuma troca de versão do CLI ou de modelo na janela).
- **3.10 Telemetria:** 0 resgates. Fecha 2 lacunas medidas: custo (`resumo.json`) e duração de pausa (`b7:160`).
- **3.11 Sandbox:** 0 resgates; nenhum incidente de credencial ou rede medido.

**Resumo:** os itens da pesquisa atacam diretamente no máximo **3 dos 89** (1 flaky ou máquina, 1 login, 1 juiz), mais o efeito em C2 (até 70 reprovas). As maiores classes ficam sem dono na pesquisa:
- allowlist 22 e critério 12: precisam do 7f-b6 P1 a P4 ou do R1 ampliado;
- pausa manual 8 de 9, motor 8 e writeback 7.

---

## 6. Incidentes e lições que a pesquisa não cobre

1. **Autocommit leva edição humana de spec** junto com o status: 12 dos 89 (`intervencao_embutida`); `4b5dd2e`, `b988f6c` com 52 tickets (`b6:97-112`); 1361 pela vigia em 18/10.
2. **`set -euo pipefail` herdado no critério** (HARNESS): 929, 933, 934b, 935 (`b6:42-73`). Corrigido no Comarka pelo `31104d0` e no kit pela P0. A forma `grep -c &&` ainda reprova no estado certo, em 12 abertos (`b6:305`) e em 2 resgates de critério da janela.
3. **Critério contra `origin/staging-auto` defasado:** 2 resgates (`f01a989`, `0388c97`).
4. **Árvore suja na staging-auto rotulada "conflitou":** 940 e 932 aprovados no mérito ficaram bloqueados (`mbo:136-137`).
5. **Streak:** confunde defeitos independentes em 3 de 7 eventos e zera com `--off` (741a bloqueado na retomada). O limite foi de 2 para 4 e ainda pausou com 4 defeitos de spec em 12/10.
6. **Pausa removida por outro ator:** em 16/10 a pausa manual foi regravada 3 vezes (`iv.csv:277`, `:286`).
7. **`publicar FALHOU` silenciado como pausa com dono** (`b7:167`); corrigido na P3.
8. **Mac dormindo:** 72 h de loop parado na janela (`resumo.json`); 316 eventos de sono em outubro (`medicao-comarka.md:125`); 801 com 2 h de agente.
9. **Commits das tentativas sem ref** (o gc leva em 2 semanas) e triador lendo o `.md` atual (deriva do 966) (`b6:85-95`, `:197-200`).
10. **Comparador do R2 exige texto idêntico:** 3 erros falsos que derrubam a promoção (`b6:221-226`).
11. **Job do resolvedor:** sem `claude` no PATH (rc 127, US$ 4,80 de teto reservado sem chamada); assinatura nova a cada 30 min no 243, que pagaria a cada passada (`relatorio-kit-etapa7f-b3.md:53-86`; b4 `:31-75`).
12. **Corrida do triador:** 6 respostas descartadas em silêncio pelo corte do CLI. O placar mostrava US$ 4,14 e a corrida pagou US$ 6,13 (`relatorio-kit-etapa7f-b1b.md:18-26`).
13. **Duas sessões na mesma worktree** (porte-actus, 24/09): suíte contaminada, o rc 0 não vale (`relatorio-porte-actus-status.md:6-20`).
14. **Colisão de ids entre loops** (1165 a 1167 contra o lote do Apolo, `iv.csv:267`) e tickets do Apolo na fila da plataforma (`iv.csv:204`).
15. **Afrouxamento humano no destrave:** 4 dos 11 R1 (`mbo:250`). O humano sobe o `NO_TETO` junto (`b7:302`).
16. **Contadores honestos:** só 13 dos 37 bloqueios viram commit, o resto não aparece no git (`mbo:62`); o painel do legado mostra "tent." como "?" (`b6:114-126`).
17. **Conflitos da pesquisa com o Comarka:** R1 desliga a guarda PreToolUse do projeto; R5 (`--disallowedTools Agent`) quebra os agentes `recon` e `juiz-diff`.
