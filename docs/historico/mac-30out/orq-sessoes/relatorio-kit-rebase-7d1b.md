# Relatório kit: rebase da 7d-1b sobre a main (09/10/2026)

Branch `kit/etapa7d1`, worktree `~/Projetos/_worktrees/kit-etapa7d1`.
Antes: 14 commits `960d8e6..ea63c8c` sobre `b58cc8f`. Depois: 14 commits rebaseados sobre `main` `18de15c` + `7d1b-9`. HEAD final `67b44e4`. Nada de push, merge, worktree nova, `git add -A/.` ou chamada de API. `node_modules` (symlink) não foi tocado e segue `??`.

## 0. PASSO 0

- `git status`: limpa, só `?? node_modules`. `git log -1`: `ea63c8c`. Confere com o esperado.
- `b58cc8f..main`: 19 commits (e2e-27/09 a–f, diff_cap, defeitos, `23aa9f0` autocommit, `7918249` fuso, `e167e0d` numstat, migracao-comarka, mais defeitos até `18de15c`).

### Os 4 arquivos tocados pelos dois lados

| arquivo | main | 7d-1b | sobreposição |
|---|---|---|---|
| `scripts/orquestrador/executor.sh` | `6045788`: `pacotes_do_checkout` aceita `node_modules` symlink (`-type d -o -type l`, `[ -d ]`), ~l.232. `e167e0d`: `DIFF_LINES` por numstat com `$1!="-"`, `2>/dev/null` e vazio vira 0, ~l.984 | `da51053` (7d1b-5): `FORCE_COLOR=0` no `run_criterios` (~l.451) e `NO_COLOR=1 FORCE_COLOR=0` no `gates.ts` (~l.1029). `b72e3bc` (7d1b-7): `GATE_TICKET_AVISO` com `hash=` da versão no `drive_ticket` (~l.1308) | **Não.** Cinco regiões diferentes, e nenhuma mexe no que a outra lê: o numstat e o symlink não tocam ambiente de cor nem a trilha. Merge automático. |
| `scripts/kit/test-shell.sh` | `6fd4f46`: bloco de comentário + `test-fixture-gates.sh` depois do laço. `7918249`: comentário do `test-preflight.sh`, `claude` falso, `test-preflight.sh` no `SCRIPTS`. `e167e0d`: comentário + `test-diff-lines.sh` no `SCRIPTS` | `da51053`: comentário "os da etapa 7d-1b" + `test-sem-cor.sh` no `SCRIPTS` | **Sim, textual.** Os dois lados acrescentam no mesmo ponto do cabeçalho e na mesma linha `SCRIPTS=`. Não há incompatibilidade de lógica: são entradas de lista. |
| `scripts/orquestrador/test-gate-prevoo.sh` | `7918249`: guarda `[ -f "$CONFIG_REAL" ] \|\| { ERRO …; exit 2; }` depois do `CONFIG_REAL` (~l.36) | `635ddd3` (7d1b-2): cabeçalho (caso 8), `RUIM` com `eval`, `SO_AVISO`, asserções dos casos 1 e 5, caso 8. `b72e3bc`: cabeçalho e caso 9 | **Não.** A guarda fica no preâmbulo e a 7d-1b mexe no cabeçalho e nos casos. Merge automático. |
| `CHANGELOG.md` | `174d9cc`: seção "e2e de 27/09". `1bc7386`: seção "27/09 · diff_cap" | `ea63c8c` (7d1b-8): seção "Etapa 7d-1b" | **Sim, textual.** As três seções foram acrescentadas no fim do arquivo. |

### docs/defeitos/ e docs/migracao-comarka.md: o que toca gate de ticket, severidade, execução de critérios ou gates

| registro | toca | resumo |
|---|---|---|
| `2026-09-25-aceite-vermelho.md` | gates (circuit breaker pós-gate vitest) | aceite vermelho por tela rotulado "defeito de spec/harness"; pede nota e `aceite-vermelhos.json` próprios |
| `2026-09-25-teto-medido-fora-do-executor.md` | gate de ticket (check novo, aviso) e doutrina | guarda de teto com número fixado na autoria; pede aviso no `gate-ticket.ts` |
| `2026-09-27-grep-c-esconde-rc-127.md` | execução de critérios (`run_criterios`, PIPESTATUS) **ou** gate de ticket (aviso) | `cmd \| grep -c X` com espera `0` fica verde com o comando ausente (127) |
| `2026-10-05-aviso-allowlist-variavel-de-shell.md` | leitura do `cmd` do critério (`aviso_allowlist`, só no comarka) | `$f` literal gera aviso falso |
| `2026-10-07-validar-fila-timeout-deixa-tsc-orfao.md` | execução de critérios no validador do comarka (`validar-fila.py`) | timeout de 45 s mata só o bash e deixa o tsc e a árvore órfãos |
| `2026-09-27-test-lib-config-casos-do-actus.md` | teste de decisão (`decisao.ts`), não gate | marginal, listado por completude |
| `migracao-comarka.md` l.64 | gate de ticket | `gate-ticket.ts` × `validar-fila.py` ("que faz mais: executa o recon e o discrim") |
| `migracao-comarka.md` l.63 / item 11 | gates | `gates.ts` genérico × gates fixos; escopo do gate `baseline` (`baseline_scope_regex`) |
| `migracao-comarka.md` item 5 | gates | gate streak (`gate_streak_*`) |
| `migracao-comarka.md` item 12 | execução de critérios | dev server para critério curl (`serve_up/down`) |
| `migracao-comarka.md` l.174 | gate de ticket | "Os 35 pendentes não têm `bloco` nem `risco` (aviso no pré-voo)" |
| `migracao-comarka.md` l.83, opcionais | critérios | `aviso_allowlist` (opcional) |

Fora do tema: `medicao-da-fila-por-worktree`, `writeback-da-promocao-fora-do-git`, `orq-runner-congelada` e `writeback-notion-acumula-no-painel`.

## 1. Conflitos e resolução

`git rebase main`: 12 commits aplicaram limpos. Houve conflito em 2 commits.

1. **`da51053` (7d1b-5) em `scripts/kit/test-shell.sh`**, duas regiões:
   - cabeçalho: HEAD (main) tinha os blocos do `test-preflight.sh`, do `test-diff-lines.sh` e do `test-fixture-gates.sh` (kit); a 7d-1b tinha o bloco do `test-sem-cor.sh`. **Resolução:** ficam todos. O bloco da 7d-1b entra depois do `test-diff-lines.sh` e antes do "E um que mora no KIT…", porque o `test-sem-cor.sh` roda dentro do laço e o `test-fixture-gates.sh` roda depois dele.
   - `SCRIPTS=`: main `… test-orq-pause.sh test-preflight.sh test-diff-lines.sh`; 7d-1b `… test-orq-pause.sh test-sem-cor.sh`. **Resolução:** `… test-orq-pause.sh test-preflight.sh test-diff-lines.sh test-sem-cor.sh`.
   - `bash -n` ok. O `executor.sh` do mesmo commit fez merge automático. Novo sha: `da5ea35`.
2. **`ea63c8c` (7d1b-8) em `CHANGELOG.md`**: três seções acrescentadas no fim. **Resolução:** as três inteiras, em ordem cronológica: "Etapa 7d-1b (25/09)", depois "e2e de 27/09" e depois "27/09 · diff_cap". `git diff main -- CHANGELOG.md` não remove nenhuma linha da main. Novo sha: `ca02acc`.

Merge automático, conferido por grep depois do rebase: `executor.sh` tem os cinco trechos (`-type d -o -type l`, `[ -d "$nm" ]`, `$1!="-"`, `NO_COLOR=1 FORCE_COLOR=0` ×2 e `hash=$versao`). `test-gate-prevoo.sh` tem a guarda do `CONFIG_REAL` e os casos 8 e 9. Nenhuma incompatibilidade de lógica; não foi preciso `--abort`.

### Shas citados que ficaram velhos (registrado, não corrigido)

O rebase trocou os shas. O `CHANGELOG.md` (13 menções) e o `docs/PECAS.md` (13 menções em 4 linhas) da 7d1b-8 citam os shas antigos. O `CONTRATO.md` não cita nenhum. Não corrigi nesta sessão porque o `PECAS.md` estava fora do escopo de escrita. **Corrigido depois no 7d1b-10 (`3ad99bf`, seção 8).** Mapa:

```
960d8e6 -> c798949  7d1b-1      1d942d7 -> 4dc09dd  7d1b-3d     62a8461 -> 3294224  7d1b-4
635ddd3 -> 2a016b4  7d1b-2      e6bd065 -> 924fa84  7d1b-3e     da51053 -> da5ea35  7d1b-5
fe505ce -> 227de0f  7d1b-3a     394c241 -> f219c7f  7d1b-3f     b72e3bc -> 7e96201  7d1b-7
2b49f34 -> f0e5f49  7d1b-3b     440b055 -> 9eecc1b  7d1b-3g     ea63c8c -> ca02acc  7d1b-8
74fffeb -> d857f8c  7d1b-3c     08aa971 -> 69d9e14  7d1b-3h
```

O relatório anterior (`relatorio-kit-etapa7d1b.md`) também usa os shas antigos.

## 2. 7d1b-9

`67b44e4` "7d1b-9: CLAUDE.md, dono do motor". O kit **não tinha** `CLAUDE.md`, então o arquivo nasce só com a seção "Dono do motor":
- código de motor (`scripts/`, `test/`, `instalar.sh`, `doutrina/`) só entra por etapa do chat do projeto Orquestrador, com worktree, vermelho antes e merge humano;
- outras frentes commitam só docs, e só em `docs/migracao-comarka.md` e `docs/defeitos/`;
- defeito de motor achado num repo vira registro em `docs/defeitos/`.

Conferido: o `instalar.sh` copia só caminhos explícitos, então um `CLAUDE.md` na raiz do kit não vai para os repos instalados.

## 3. Defeitos de docs/defeitos/ cobertos por peça da 7d-1b

Nenhum defeito é coberto por inteiro. O que existe de relação:

- **`2026-09-27-grep-c-esconde-rc-127`**: **não coberto.** A regra **C2c** (7d1b-4, `3294224`) pega a família vizinha `grep -c … || echo` (saída "0 0"), não `cmd | grep -c X` com espera `0`. A **C3** só dispara com padrão amplo (`NEXT_PUBLIC_`, `process.env`, `fetch`, `import`), e `'error TS'` não é amplo. As duas opções do pedido (PIPESTATUS no `run_criterios` e aviso no gate) seguem abertas.
- **`2026-09-25-teto-medido-fora-do-executor`**: **não coberto.** A C3 vai no sentido contrário: ela **isenta** quem declara `teto`. Não existe regra que avise de teto com número literal no critério.
- **`2026-10-07-validar-fila-timeout-deixa-tsc-orfao`**: **não se aplica ao kit.** A 7d1b-4 portou só as regras **estáticas** do `validar-fila.py`: o gate de ticket do kit não executa recon nem critério, então não tem o caminho do timeout. As execuções que existem no gate (grep/awk do check 10) usam `spawnSync` com `timeout_cmd_secs` desde o porte do Actus (`957c178`), anterior à 7d-1b. O defeito continua a valer para o comarka até a migração.
- **`2026-09-25-aceite-vermelho`**, **`aviso-allowlist-variavel-de-shell`**: não cobertos e sem peça relacionada.
- Relacionado da `migracao-comarka.md` (não é defeito): a l.174 diz "35 pendentes sem `bloco` nem `risco` (aviso no pré-voo)". A **7d1b-3a** (`227de0f`) tirou os dois da lista obrigatória do check 2, e eles não geram mais violação. A nota da migração ficou mais forte do que o motor atual: fica para o dono dessa doc.

## 4. Suítes (uma de cada vez, rc capturado sem pipe)

```
rc(typecheck)=0                 npx tsc --noEmit, saída vazia
rc(vitest TZ=UTC)=0             Test Files 66 passed (66) · Tests 1392 passed (1392)
rc(vitest sem TZ)=0             (TZ da máquina -03) · Test Files 66 passed (66) · Tests 1392 passed (1392)
rc(test-shell.sh)=0             26 de 26 rc 0 (inclui test-preflight, test-diff-lines, test-sem-cor e test-fixture-gates do kit)
rc(test-instalar.sh)=0          TODOS OS CHECKS PASSARAM (caso (c) pulado: sem ORQ_CI_CHECKOUT, como por padrão)
rc(test-drenagem.sh)=0          no fixture /tmp/orq-fixture-5mUofI/repo (limpo depois), 24 ok
rc(test-ambiente.sh)=0          TODOS OS CHECKS PASSARAM
rc(corpus)=0                    TZ=UTC vitest test/orquestrador-gate-corpus.test.ts: 2 passed
```

Antes do rebase eram 1389 testes. Os 3 a mais vêm da main (`orquestrador-pacotes` symlink, prevoo dia local).

## 5. Matriz do corpus depois do rebase

**Idêntica** à da seção 2 do relatório da 7d-1b (diff linha a linha, 19 linhas, sem diferença). Nenhuma regra ERRO aparece, porque nenhuma disparou.

```
regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
10n	aviso	56	41	487	6	9	32
2c	aviso	0	0	1	0	0	0
3	aviso	0	0	1	0	0	0
6a:bash	aviso	0	1	6	0	0	0
6a:rm 	aviso	0	13	20	0	0	1
6a:sh -c	aviso	0	0	1	0	0	0
6b	aviso	55	60	363	5	10	26
6q	aviso	0	12	83	0	4	3
6r	aviso	0	0	1	0	0	0
6v	aviso	0	23	250	0	9	13
8	aviso	0	14	77	0	0	3
C11	aviso	22	24	122	2	2	10
C2c	aviso	0	1	4	1	0	2
C2v	aviso	36	0	0	3	0	0
C3	aviso	3	0	9	0	0	2
C4	aviso	0	0	11	0	0	1
C9	aviso	0	0	28	0	0	0
```

## 6. Dry-runs

- `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`: **rc 0, 48 diferenças** (eram 43 em 25/09).
- `bash instalar.sh --atualizar ~/Projetos/actus-saas --dry-run`: **rc 0, 18 diferenças** (eram 47 em 25/09; o Actus recebeu motor nesse meio-tempo). Entre elas: `executor.sh`, `gate-ticket.ts`, `config-chaves.ts`, `config-tabela.ts`, `prevoo.ts`, `local-loop.sh` e `test-gate-prevoo.sh` diferentes; `test-diff-lines.sh` e `test-sem-cor.sh` só no kit.
- Os dois avisam que o `--atualizar` de verdade **recusaria**, porque o loop não está pausado (nem `docs/fila/PAUSAR` nem `.orq-pause`). Nenhuma sentinela foi criada.

## 7. Estado final

```
git log --oneline main..HEAD
67b44e4 7d1b-9: CLAUDE.md, dono do motor
ca02acc 7d1b-8: CHANGELOG, PECAS e CONTRATO da etapa 7d-1b, com os shas
7e96201 7d1b-7: GATE_TICKET_AVISO uma vez por ticket e por versão do conteúdo
da5ea35 7d1b-5: critérios e gates rodam com NO_COLOR=1 e FORCE_COLOR=0
3294224 7d1b-4: regras estáticas do validar-fila do comarka-operacional no gate de ticket
69d9e14 7d1b-3h: severidade final das regras corrigidas pela matriz do corpus; o teste do corpus fica verde
9eecc1b 7d1b-3g: check 8 com fecho transitivo das dependências (C8 do comarka-operacional)
f219c7f 7d1b-3f: check 6v só acusa critério que aprovaria uma suíte com falha
924fa84 7d1b-3e: check 6r aceita redirecionamento para /tmp e fecha o alvo no ')'
4dc09dd 7d1b-3d: check 10x compara o exemplo com o padrão que o shell entrega e dispensa exemplo no grep -v
d857f8c 7d1b-3c: check 5 infere o tipo ausente (5t) e aceita cmd vazio em critério espera 'avaliador' (5c)
f0e5f49 7d1b-3b: check 3 aceita id com sufixo de fatiamento (407a0, 315b1b), também na leitura da fila
227de0f 7d1b-3a: check 2 sem bloco e sem risco obrigatórios; criterios_aceite ausente vira a regra 2c (aviso)
2a016b4 7d1b-2: severidade por regra no gate de ticket (tabela REGRAS, gate_ticket.severidade no config)
c798949 7d1b-1: corpus da calibração do gate de ticket (57 de spec + 706 done) e teste que reprova regra ERRO com falso positivo

git status
?? node_modules
```

Pendências (estado da seção 7; ver a seção 8 para o que foi resolvido depois): (1) shas velhos no CHANGELOG/PECAS, resolvido no 7d1b-10; (2) merge da `kit/etapa7d1` na `main` e push, que são humanos; (3) a nota da l.174 da `migracao-comarka.md` sobre `bloco`/`risco`, registrada no CHANGELOG pelo 7d1b-10 e ainda a corrigir pela frente da migração.

## 8. 7d1b-10 · SHAs depois do rebase e nota da migração (pedido seguinte, mesma sessão)

Commit `3ad99bf` "7d1b-10: SHAs da 7d-1b depois do rebase no CHANGELOG e no PECAS; nota da migracao-comarka desatualizada". Escrita só em `CHANGELOG.md` e `docs/PECAS.md` (`git diff --stat`: 2 arquivos, 20+/17-).

- **SHAs.** Troca pelo mapa da seção 1, só em palavra inteira: 13 no `CHANGELOG.md` (a entrada da 7d-1b) e 13 no `docs/PECAS.md` (l.932-935, 4 linhas). Os 13 shas que ficaram nas seções da 7d-1b dos dois arquivos foram conferidos contra `git log --format=%h main..HEAD`, e todos estão lá: `c798949 2a016b4 227de0f f0e5f49 d857f8c 4dc09dd 924fa84 f219c7f 9eecc1b 69d9e14 3294224 da5ea35 7e96201`. Nenhum sha antigo sobrou nos dois arquivos. O `ca02acc` (7d1b-8) não é citado: a entrada da 7d1b-8 não tem sha.
- **Nota dos 35 pendentes.** Ela só existe em `docs/migracao-comarka.md:174`, fora do escopo de escrita. Perguntei, e a decisão foi não tocar nesse arquivo. Em vez disso, a entrada da 7d-1b do CHANGELOG ganhou uma linha: a `migracao-comarka.md:174` ficou desatualizada desde a 7d1b-3a `227de0f` (`bloco` e `risco` não geram mais violação), e quem corrige é a frente da migração.
- **Suítes**, uma de cada vez, rc capturado:

```
rc(vitest TZ=UTC)=0     Test Files 66 passed (66) · Tests 1392 passed (1392)
rc(test-shell.sh)=0     26 de 26 rc 0 · TODOS OS SCRIPTS SAÍRAM rc 0
```

- **Estado:** `git log --oneline main..HEAD` = 16 commits, topo `3ad99bf`. `git status` = só `?? node_modules`. Sem push.
