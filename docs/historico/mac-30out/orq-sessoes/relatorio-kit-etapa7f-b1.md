# Relatório da sessão kit 7f-b1: triador de bloqueios (peças 1 a 5, modelo só em stub)

Sessão de 10/10/2026, worktree `~/Projetos/_worktrees/kit-etapa7f`, branch `kit/etapa7f` a partir de `main` `2894d9f`. Sem push, merge ou rebase, sem `git add -A`/`.`, sem worktree criada ou removida, sem chamada de API (`claude -p` nunca rodou; o modelo existiu só no stub `test/fixtures/claude-envelope/triador-stub.sh`). No comarka-operacional só li, e todo git rodou com `GIT_OPTIONAL_LOCKS=0`. Não rodei script dele e não toquei em `docs/fila`, runs, locks ou sentinelas. `orq-painel.py` ficou como estava.

## Commits

| peça | sha | o quê |
|---|---|---|
| 1 | `0ebe0f6` | fixture (37 + 20 de controle, 2,6 MB), `montar.py`, teste de sanidade (verde) e aceite (vermelho) |
| 2 | `81574fc` | leitores `kit` e `legado-comarka` → `Evidencia`; recorte; `gitLeitura` |
| 3 | `541f9d1` | extração e regras D1-D12 |
| 4 | `6ce01fd` | saída em `ORQ_DIAG_DIR`, guarda, assinatura, trava, histórico, cópia mascarada |
| 5 | `9ed29f0` | modelo com stub, prompt literal, tetos, parser, `orq triar` |
| 6 | `48d682d` | CONTRATO §9.1 e §13, CHANGELOG, PECAS |
| 7 | `20f41b8` | D6 firme só com o mesmo vermelho fora em ≥ 2 tentativas; 5 casos de série cortada (decisão do chat do programa) |
| 8 | `cbda4ed` | CONTRATO §13.3 e §13.6, CHANGELOG, PECAS com o sha da 7f-b1-7 |

## Adendo 7f-b1-7: a restrição da D6 (decisão do chat do programa)

**Decisão.** R1 firme só quando o mesmo teste vermelho fora da allowlist (e do diff) aparece em pelo menos duas tentativas da série; com uma só, a D6 dá o palpite `R1?` e o caso vai ao modelo. Implementado em `extrair.ts:229-243`.

**Fixture.** `test/fixtures/triador-7f/cortados/` ganhou 5 casos de série cortada: 671d, 624, 627e, 808 e 367. Cada um é o controle cortado na última tentativa que reprovou, como se o motor tivesse bloqueado ali.
- **Montagem.** `montar.py` monta os cortados a partir de `controle/`, sem ler o comarka. Ficam a série até a tentativa k, o `meta.json` até k, o log até antes do cabeçalho da tentativa k+1, e o fim no `ts` de k. Os vizinhos são os do controle nas ±6 h do novo fim, com `antes_do_bloqueio` recalculado; o controle só guardou vizinhos nas ±6 h do fim dele, então a lista pode ter menos vizinhos que um bloqueio real.
- **Rodar só os cortados.** `python3 test/fixtures/triador-7f/montar.py --so-cortados` refaz só eles. Rodei duas vezes e deu o mesmo `shasum` nos 99 arquivos.
- **Tamanho.** A fixture tem agora 2.818.478 bytes, ainda abaixo do teto de 3 MB.

**Testes (vermelho antes, por asserção; saída crua em `p7-vermelho` no anexo A):**
- **aceite (cortados).** Nenhum dos 5 sai firme, nos dois instantes. No vermelho, os 5 saíram `R1` firme.
- **aceite (B).** Os firmes certos passam a ser 15 (os 16 da spec §3.3 menos o 346d), e o 346d tem de sair `R1?`. No vermelho, eram 16.
- **aceite (A), instante do bloqueio.** Os firmes passam de 14 a 13, porque o 346d é firme nos dois instantes. No vermelho, eram 14.
- **modelo, corrida da peça 6.** São 22 chamadas no teto de US$ 6,60, e não mais 21 a US$ 6,30, porque o 346d agora chama o modelo. No vermelho saíram 21. Com o teto antigo de 6,30, o 22º palpite seria pulado por `teto_dia`.
- **fixture (sanidade).** Ganhou o caso "série cortada". Ele é estrutural e já passa com os dados; o vermelho de comportamento é o do aceite.

Essas três asserções mudaram de número por decisão do chat do programa; a força continua a mesma (igualdade exata). Nenhuma outra mudou.

**Matriz nova (37 casos):**

| | depois da passada | no instante do bloqueio |
|---|---|---|
| firme certo | **15** (os 16 da spec menos o 346d) | 13 (760 e 898 #31 em `R5?`) |
| firme errado | **0** | 0 |
| palpite certo | 14 (346d entra como `R1?`) | 16 |
| palpite errado | 7 | 7 |
| sem regra | 1 (826) | 1 |
| controle (20, série inteira) | nenhum firme | nenhum firme |
| série cortada (5) | **nenhum firme**: os 5 saem `R1?` (D6) | nenhum firme |

Vão ao modelo na peça 6 **22 casos**: os 21 palpites e sem regra de antes, mais o 346d. O (C) sem modelo segue 14/37, porque o 346d já contava como "evidência fora".

**Série cortada, caso a caso:**

| caso | estágios | passada | bloqueio | evidência |
|---|---|---|---|---|
| 01-671d-L61399 | vitest | R1? (D6) | R1? | 671d/attempt-1/gate-vitest.txt:996 |
| 02-624-L71202 | vitest | R1? (D6) | R1? | 624/attempt-1/gate-vitest.txt:1538 |
| 03-627e-L56882 | juiz,vitest | R1? (D6) | R1? | 627e/attempt-2/gate-vitest.txt:946 |
| 04-808-L75274 | vitest | R1? (D6) | R1? | 808/attempt-1/gate-vitest.txt:1661 |
| 05-367-L80416 | vitest | R1? (D6) | R1? | 367/attempt-1/gate-vitest.txt:1867 |

**Comando da peça 6.** Está em `~/orq-sessoes/corrida-7f-peca6.cmd`, só o comando, com `ORQ_TRIADOR_TETO_DIA=6.60`. O que conferir está em `~/orq-sessoes/corrida-7f-peca6-conferir.md`. A seção "Comando da peça 6" mais abaixo foi atualizada para 22 e US$ 6,60.

**Suítes depois da 7f-b1-7 e da 7f-b1-8, uma de cada vez (saída crua no anexo B, `g-*`):**

| suíte | rc |
|---|---|
| `npx tsc --noEmit` | 0 |
| `TZ=UTC npx vitest run` | 0 (72 arquivos, 1434 passam, 1 todo: o (C) da peça 6) |
| `bash scripts/kit/test-shell.sh` | 0 |

Desta vez o pedido foi só essas três; `test-instalar.sh`, `test-drenagem.sh` e `test-ambiente.sh` não rodaram de novo. Nenhum push.

## PASSO 0

**Lido:** a spec inteira (`~/orq-sessoes/spec-7f-triador.md`, 421 linhas); `medicao-bloqueios-out.md` §3 (`:89-170`) e §5 (`:196-219`); o protótipo `…/56667982-…/scratchpad/proto/extrai3.py` e `saida.json`; os dados da medição (`…/4a712901-…/scratchpad/med/comarka-ev.json`, `casos.json`, `casos-controle.json`); `docs/defeitos/` inteiro, incluindo os 4 de 2026-10-10 (árvore suja vira conflito; nota "defeito de spec" em falha que não é spec; streak confunde defeitos independentes; streak zerado na pausa).

**Pontos de reuso confirmados, arquivo:linha (kit `2894d9f`):**
- `scripts/orquestrador/diagnostico.ts:109` `primeiroLocal`, usado em `triador/comum.ts` para o local `❯`. `:91` `arquivosDeTesteCitados` e `:138` `blocoDoCriterio` existem; não precisei deles. O `cobre` de `:234` não é exportado, então usei o do enforcement (próximo item).
- `scripts/orquestrador/enforcement-core.ts:178` `matchesAllowlist` (sobre `globToRegExp`, `:149`): é a allowlist da extração. `montar.py` porta o mesmo glob.
- `orq-painel.py`, trechos de leitura: regra "lê só o contrato" em `:9-19`; `ler_repos` em `:113-144` (o triador lê `repos.json` da mesma forma, `saida.ts:lerRepos`); `ler_trilha` em `:219-226`. Nenhuma mudança no painel.
- CONTRATO: §4 trilha/`BLOQUEADO` (`:161-205`), §5.2-5.3 meta e `attempt-N` 0-based (`:415-439`), §9.1 `orq` (`:654-680`), §9.5 painel (`:802-855`).
- `lib.sh:1400` `claude_run` e `executor.sh:753-755` (juiz: `--allowedTools "" --max-turns 1`) são o molde da chamada. O triador não carrega `lib.sh` (spec §6 regra 2), então a chamada é um `spawnSync` próprio em `modelo.ts:199`.
- `scripts/orq`: o dispatch antes do `lib.sh` segue o molde do `config` (`scripts/orq:43-63`). `orq triar` ficou em `scripts/orq:88`.

**O que o PASSO 0 achou e mudou o desenho:**
- O cap do Comarka foi 900 o período todo (`git log` do config, só leitura). O protótipo usava 1050 antes de 02/10, mas o resultado do 723 é o mesmo (`diff.stat` 650 ≤ 900).
- Os fontes de teste na fixture não podem ser `.test.ts`, porque o vitest e o tsc do kit os coletariam. Ficaram como `<arquivo>.fonte`.
- "Vermelho por asserção, nunca por import": os testes importam o triador por import dinâmico tolerante. Sem o módulo, cada caso sai "sem diagnóstico", e a falha é numérica (ex.: 0 de 16 firmes).

## Vermelho e verde de cada peça

Comando: `TZ=UTC npx vitest run <arquivo>`. O vermelho roda com o código da peça fora do lugar e o motor do commit anterior. Na peça 5 isso significou restaurar `scripts/orq` e `triador/` do `HEAD` e tirar os módulos novos. Em todas as peças, todas as falhas do vermelho são `AssertionError`. As saídas cruas estão no anexo A.

| peça | vermelho | verde |
|---|---|---|
| 1 | sanidade sem a fixture: 4 falhas (37≠0 casos, classes `{}`, inteiros 0…); aceite: 3 falhas (0 de 16 firmes) | sanidade 9/9; aceite segue vermelho (é o vermelho das peças 2-3) |
| 2 | 6/6 falham sem `triador/` | 6/6 |
| 3 | sem `extrair.ts`: 8 falhas (5 de regras + 3 do aceite) | regras 5/5, aceite 4/4 + 1 todo (C) |
| 4 | sem `saida/triar/cli/mascara`: 6/6 falham | 6/6 |
| 5 | contra `6ce01fd`: 10/10 falham | 10/10 |

Observações honestas:
- **Peça 4, caso `gitLeitura`.** O `gitLeitura` nasceu na peça 2, mas o caso só ficou vermelho porque o carregador do teste exige `saida.ts` e `triar.ts`. Contra o motor da peça 2, a parte do `git.ts` sozinha passaria.
- **Peça 5, caso `--passada`.** O caso que promove `R5?` a `R5` exercita lógica da peça 4 (`triar.ts`); na peça 5 ele entra pelo CLI.
- **Controle no aceite.** O caso "nenhum dos 20 sai firme" passa vacuamente quando não há triador: é uma asserção de zero.
- **Ajuste antes do commit, peças 4 e 5.** Dois casos ficaram vermelhos por `TypeError` (`m` nulo; `toBeLessThanOrEqual(undefined)`). Ajustei para asserção e recapturei o vermelho inteiro.

## Fixture (peça 1)

- **Conteúdo.** `test/fixtures/triador-7f/`: 37 casos `NN-<id>-L<linha>` e 20 em `controle/`. Ocupa 2.620.005 bytes em 1.771 arquivos.
- **Montagem.** `python3 test/fixtures/triador-7f/montar.py --comarka ~/Projetos/comarka-operacional`. Rodado duas vezes, deu saída idêntica (`diff -r` vazio).
- **Séries.** n, fim e último diretório batem com `comarka-ev.json` e com o `saida.json` do protótipo nos 37.
- **`esperado.json`.** Tem a classe da §5 e a linha da tabela da medição (102-138, uma por caso). Contagem 11/9/5/4/6/1/1.
- **Evidência citada só por trecho.** Em 707 #28, 898 #31 e 741a #32 a medição cita o trecho sem linha. A linha foi achada pelo trecho no gate-vitest da série (`origem: "trecho"`). No 723, "attempt-*" virou o `diff.stat` de cada tentativa da série.
- **Controle.** Os 10 únicos done do período com vitest vermelho intermediário na série final (todos fora da allowlist), mais os 10 primeiros com critério intermediário.
- **Tamanho.** Para caber em 3 MB:
  - recorte sem contexto quando a suíte passou;
  - quadro de pilha (`at …`) fora do recorte;
  - `criterios.txt` só com os blocos não-PASS, com mapa de linhas;
  - `objetivo` do ticket em 1500 caracteres (o que o triador lê);
  - os 3 gate-vitest inteiros em gzip.

## Matriz final da extração

Estado da passada (vizinhos inteiros) e instante do bloqueio (só vizinhos de antes):

| caso | medição | passada: classe (regra) | categoria | evidência da medição | instante do bloqueio |
|---|---|---|---|---|---|
| 01-559-L55054 | R3 | R4? (D9) | palpite errado | — | R4? |
| 02-559-L55209 | R4 | R4? (D9) | palpite certo | — | R4? |
| 03-627-L55356 | R2 | R4? (D9) | palpite errado | — | R4? |
| 04-600-L55898 | R4 | R4? (D9) | palpite certo | — | R4? |
| 05-627b-L56021 | R2 | R1|R2? (D11) | palpite certo | — | R1|R2? |
| 06-549c-L57053 | R2 | R2? (D12) | palpite certo | — | R2? |
| 07-627j-L57368 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 08-635-L58105 | R3 | R5? (D7) | palpite errado | — | R5? |
| 09-654-L59896 | R1 | R1|R2? (D11) | palpite certo | — | R1|R2? |
| 10-407a-L64280 | R2 | R2? (D12) | palpite certo | — | R2? |
| 11-689-L65280 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 12-691-L65374 | R2 | R2? (D12) | palpite certo | — | R2? |
| 13-346d-L66187 | R1 | R1? (D6) | palpite certo | — | R1? |
| 14-407a-L67585 | R2 | R1|R2? (D11) | palpite certo | — | R1|R2? |
| 15-722-L67970 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 16-723-L68736 | R6 | R6 (D2) | firme certo | sim | R6 firme |
| 17-715-L68793 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 18-737-L69920 | R2 | R2? (D12) | palpite certo | — | R2? |
| 19-739-L71699 | R3 | R1? (D8) | palpite errado | — | R1? |
| 20-801-L72121 | R5 | R5 (D4) | firme certo | sim | R5 firme |
| 21-760-L72407 | R5 | R5 (D5) | firme certo | sim | R5? |
| 22-762-L72665 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 23-856-L73817 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 24-867-L76790 | R3 | R2? (D12) | palpite errado | — | R2? |
| 25-711a-L78138 | R1 | R1|R2? (D11) | palpite certo | — | R1|R2? |
| 26-711b3-L78647 | R1 | R1 (D6) | firme certo | não | R1 firme |
| 27-741-L79081 | R4 | R2? (D12) | palpite errado | — | R2? |
| 28-707-L79202 | R7 | R4? (D9) | palpite errado | — | R4? |
| 29-826-L80362 | R3 | - (-) | sem regra | — | - |
| 30-900-L81564 | R2 | R2? (D12) | palpite certo | — | R2? |
| 31-898-L82594 | R5 | R5 (D5) | firme certo | sim | R5? |
| 32-741a-L82726 | R5 | R5 (D5) | firme certo | sim | R5 firme |
| 33-707-L83026 | R4 | R4? (D9) | palpite certo | — | R4? |
| 34-898-L83625 | R2 | R2? (D12) | palpite certo | — | R2? |
| 35-950-L85145 | R1 | R1 (D6) | firme certo | sim | R1 firme |
| 36-940-L85222 | R5 | R5 (D1) | firme certo | sim | R5 firme |
| 37-932-L85272 | R5 | R5 (D1) | firme certo | sim | R5 firme |


| | passada | instante do bloqueio |
|---|---|---|
| firme certo | **15** (os 16 da spec §3.3 menos o 346d, 7f-b1-7) | 13 (760 e 898 #31 em `R5?`) |
| firme errado | **0** | 0 |
| palpite certo | 14 | 16 |
| palpite errado | 7 | 7 |
| sem regra | 1 (826) | 1 |
| controle (20, série inteira) | 0 firme, todos sem regra | 0 firme |
| série cortada (5, 7f-b1-7) | 0 firme, os 5 `R1?` | 0 firme |

- Os 7 R5+R6 saem firmes e certos, com evidência da medição a ±3 linhas. Os 22 não firmes (com o 346d, desde a 7f-b1-7) são os que vão ao modelo na peça 6.
- **Medida extra, fora do aceite e importante para a peça 6 e a 7f-b2.** Cortei os 20 de controle na última tentativa que reprovou, como se o motor tivesse bloqueado ali. Com isso, **5 saem R1 firme (D6) e estão errados**: 671d, 624, 627e, 808 e 367. Nesses tickets o vermelho fora da allowlist foi resolvido pelo próprio agente no retry (era mérito). Quatro deles têm uma tentativa só, o que no Comarka não bloquearia; o **627e** tem duas e bloquearia.
  - **Implementada na 7f-b1-7, por decisão do chat do programa** (ver o adendo no topo). Era a restrição candidata: "o mesmo arquivo vermelho fora em ≥ 2 tentativas". Ela zera os 5 errados e mantém 8 dos 9 R1 firmes. O 346d cairia, porque na T2 o mesmo teste aparece como violação de enforcement, não como vermelho.
- **(C) sem modelo:** `orq triar --fixture … --sem-modelo` dá 14/37 com classe e evidência certas. Dois firmes certos ficam com a evidência fora da medição:
  - **346d:** a medição cita `enforcement.json` e `L:66186`; a D6 cita o vitest da T1.
  - **711b3:** a medição cita só `claude-output.txt`, que a regra nunca usa como prova (spec §6).
  - Na peça 6, decidir se o esperado do 711b3 ganha uma linha de gate, ou se a D6 passa a citar o `enforcement.json` quando a última tentativa é enforcement.

## Rc das suítes (fechamento, uma de cada vez)

| suíte | rc |
|---|---|
| `npx tsc --noEmit` | 0 |
| `TZ=UTC npx vitest run` | 0 (72 arquivos, 1432 passam, 1 todo: o (C) da peça 6) |
| `bash scripts/kit/test-shell.sh` | 0 (26 scripts, todos `rc = 0`) |
| `bash scripts/kit/test-instalar.sh` | 0 |
| `bash scripts/orquestrador/test-drenagem.sh` | 0 |
| `bash scripts/orquestrador/test-ambiente.sh` | 0 |

O `test-shell.sh` inclui o `test-preflight.sh`. Conferi que ele usa só stub (`--stub-juiz`, "nenhuma chamada paga"), sem API.

## Comando da peça 6 (para o humano, depois do merge)

Atualizado na 7f-b1-7: 22 palpites e US$ 6,60. O comando exato está em `~/orq-sessoes/corrida-7f-peca6.cmd`, e a lista do que conferir em `~/orq-sessoes/corrida-7f-peca6-conferir.md`; vale o que está lá.

No checkout principal do kit, com o `claude` logado:

```bash
cd ~/Projetos/orquestrador-kit
ORQ_DIAG_DIR=~/.orq/corrida-7f-peca6 ORQ_TRIADOR_TETO_DIA=6.60 \
  bash scripts/orq triar --fixture test/fixtures/triador-7f > ~/orq-sessoes/corrida-7f-peca6.txt 2>&1; echo "rc=$?"
```

- **Por que esse diretório.** O `ORQ_DIAG_DIR` próprio separa o ledger e as respostas da corrida do `~/.orq/diagnosticos` de uso real. Sem `ORQ_TRIADOR_CONFIG`, valem os padrões: `claude-opus-5-5`, US$ 0,30 por caso, 30 mil tokens, 120 s.
- **Como o teto funciona.** A chamada só sai se gasto do dia + 0,30 ≤ 6,60, e cada chamada leva `--max-budget-usd 0.3`, então os 22 cabem e o dia não passa de US$ 6,60.
- **Rodar de novo não paga de novo:** caso com a mesma assinatura é reaproveitado.

O que conferir na saída:
1. **37 linhas e a última, `-- (C) classe e evidência certas: N/37 (aceite: >= 30); chamadas novas: 21; custo desta corrida: US$ X`.**
   - Precisa ser exatamente **22 chamadas novas**: os 15 firmes não chamam.
   - **X ≤ 6,60.**
   - **N ≥ 30** é o aceite (C). Lembrar que 346d e 711b3 hoje contam como "evidência fora" (seção da matriz).
2. **Nenhuma linha de palpite deve ficar `[extracao]`** por `pulado: teto_dia` ou `modelo.erro`.
   - `grep -l '"erro"' ~/.orq/corrida-7f-peca6/fixture-triador-7f/*.json` deve sair vazio.
   - Se todas derem erro com a mesma mensagem, o mais provável é o CLI recusar uma flag (`--max-turns`/`--max-budget-usd`; a sessão não pôde testar contra o CLI real). Nesse caso, pare e traga a mensagem.
3. **Ledger:** `jq '[.dias[][] | .custo_usd] | add' ~/.orq/corrida-7f-peca6/custo.json` ≤ 6,60. Também `grep -c custo_acima_do_teto ~/.orq/corrida-7f-peca6/custo.json` = 0.
4. **Respostas do replay:** as 22 `~/.orq/corrida-7f-peca6/fixture-triador-7f/<caso>/resposta-modelo.json`. São elas que a sessão da peça 6 copia para a fixture.
5. **Repo intocado:** `git -C ~/Projetos/orquestrador-kit status --short` sem mudança em `test/fixtures/triador-7f`. A corrida protege a fixture pela Guarda.

## Dry-run do `instalar.sh`

`bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`: **rc 0**, 50 diferenças listadas (entre elas `só no kit scripts/orquestrador/triador` e `diferente scripts/orq`). Nada foi escrito: o `git status` do conteudos-infinitos ficou igual antes e depois.

O `--atualizar` de verdade **recusaria**: "o loop … não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause". **Não criei sentinela**; fica registrado. Saída crua no anexo C.

## Nota do node_modules

O `node_modules` da worktree é symlink humano para `/Users/lucasantos/Projetos/orquestrador-kit/node_modules`. Nunca entrou em `git add` (todo add foi por caminho explícito; `git status` mostra `?? node_modules` do começo ao fim), nunca foi removido e nada foi escrito dentro dele. Os testes e o `orq triar` resolvem o `tsx` por ele (`node_modules/.bin/tsx`).

## O que fica aberto

- **Peça 6:** corrida real e replay (C).
- **7f-b2:** gatilho redefinido e painel (peças 7-8 da spec).
- **Leitor `kit`:** sem amostra real; o kit não guarda HEAD por tentativa, então o acoplamento sai `null` e R1 por lá é sempre palpite.
- **Outra frente:** o pedido do `docs/defeitos/2026-09-25-aceite-vermelho.md` continua aberto para o executor. O triador entrega o dado (D9) sem mexer no motor.

## Anexo A. Vermelho e verde, saída crua

### p1-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-fixture.test.ts (9 tests | 4 failed) 8ms
   × fixture triador-7f (peça 1) > 37 casos de bloqueio e 20 de controle 5ms
     → expected [] to have a length of 37 but got +0
   × fixture triador-7f (peça 1) > esperado.json traz a classe e a linha da tabela da medição (102-138), uma linha por caso 1ms
     → expected [] to deeply equal [ 102, 103, 104, 105, 106, 107, …(31) ]
   × fixture triador-7f (peça 1) > contagem por classe é a da §5 da medição: 11/9/5/4/6/1/1 1ms
     → expected {} to deeply equal { R1: 11, R2: 9, R3: 5, R4: 4, …(3) }
   × fixture triador-7f (peça 1) > três gate-vitest inteiros (gzip) com o recorte de referência do montar.py 0ms
     → expected [] to have a length of 3 but got +0

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-fixture.test.ts > fixture triador-7f (peça 1) > 37 casos de bloqueio e 20 de controle
AssertionError: expected [] to have a length of 37 but got +0

- Expected
+ Received

- 37
+ 0

 ❯ test/orquestrador-triador-fixture.test.ts:58:21
     56| describe('fixture triador-7f (peça 1)', () => {
     57|   it('37 casos de bloqueio e 20 de controle', () => {
     58|     expect(casos()).toHaveLength(37)
       |                     ^
     59|     expect(controles()).toHaveLength(20)
     60|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  test/orquestrador-triador-fixture.test.ts > fixture triador-7f (peça 1) > esperado.json traz a classe e a linha da tabela da medição (102-138), uma linha por caso
AssertionError: expected [] to deeply equal [ 102, 103, 104, 105, 106, 107, …(31) ]

- Expected
+ Received

- Array [
-   102,
-   103,
-   104,
-   105,
-   106,
-   107,
-   108,
-   109,
-   110,
-   111,
-   112,
-   113,
-   114,
-   115,
-   116,
-   117,
-   118,
-   119,
-   120,
-   121,
-   122,
-   123,
-   124,
-   125,
-   126,
-   127,
-   128,
-   129,
-   130,
-   131,
-   132,
-   133,
-   134,
-   135,
-   136,
-   137,
-   138,
- ]
+ Array []

 ❯ test/orquestrador-triador-fixture.test.ts:70:42
     68|       return Number(m![1])
     69|     })
     70|     expect(linhas.sort((a, b) => a - b)).toEqual(Array.from({ length: …
       |                                          ^
     71|   })
     72| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  test/orquestrador-triador-fixture.test.ts > fixture triador-7f (peça 1) > contagem por classe é a da §5 da medição: 11/9/5/4/6/1/1
AssertionError: expected {} to deeply equal { R1: 11, R2: 9, R3: 5, R4: 4, …(3) }

- Expected
+ Received

- Object {
-   "R1": 11,
-   "R2": 9,
-   "R3": 5,
-   "R4": 4,
-   "R5": 6,
-   "R6": 1,
-   "R7": 1,
- }
+ Object {}

 ❯ test/orquestrador-triador-fixture.test.ts:79:15
     77|       n[k] = (n[k] ?? 0) + 1
     78|     }
     79|     expect(n).toEqual({ R1: 11, R2: 9, R3: 5, R4: 4, R5: 6, R6: 1, R7:…
       |               ^
     80|   })
     81| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  test/orquestrador-triador-fixture.test.ts > fixture triador-7f (peça 1) > três gate-vitest inteiros (gzip) com o recorte de referência do montar.py
AssertionError: expected [] to have a length of 3 but got +0

- Expected
+ Received

- 3
+ 0

 ❯ test/orquestrador-triador-fixture.test.ts:164:33
    162|     const dir = join(FX, 'vitest-inteiros')
    163|     const origem = existsSync(join(dir, 'origem.json')) ? json<Record<…
    164|     expect(Object.keys(origem)).toHaveLength(3)
       |                                 ^
    165|     for (const id of Object.keys(origem)) {
    166|       const txt = gunzipSync(readFileSync(join(dir, `${id}.txt.gz`))).…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

 Test Files  1 failed (1)
      Tests  4 failed | 5 passed (9)
   Start at  21:31:06
   Duration  240ms (transform 25ms, setup 0ms, collect 21ms, tests 8ms, environment 0ms, prepare 57ms)

rc=1
```

### p1-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-fixture.test.ts (9 tests) 184ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
   Start at  21:31:13
   Duration  384ms (transform 16ms, setup 0ms, collect 15ms, tests 184ms, environment 0ms, prepare 43ms)

rc=0
```

### p1-aceite-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-aceite.test.ts (5 tests | 3 failed | 1 skipped) 14ms
   × aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada) 10ms
     → [{"nome":"16-723-L68736","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"20-801-L72121","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"21-760-L72407","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"31-898-L82594","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"32-741a-L82726","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"36-940-L85222","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"37-932-L85272","classe":null,"firme":false,"certa":false,"evidencia":false}]: expected [] to deeply equal [ '16-723-L68736', …(6) ]
   × aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois) 2ms
     → expected { nome: '21-760-L72407', …(2) } to deeply equal { nome: '21-760-L72407', …(2) }
   × aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 16 da spec 1ms
     → expected [] to deeply equal [ '07-627j-L57368', …(15) ]

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada)
AssertionError: [{"nome":"16-723-L68736","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"20-801-L72121","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"21-760-L72407","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"31-898-L82594","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"32-741a-L82726","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"36-940-L85222","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"37-932-L85272","classe":null,"firme":false,"certa":false,"evidencia":false}]: expected [] to deeply equal [ '16-723-L68736', …(6) ]

- Expected
+ Received

- Array [
-   "16-723-L68736",
-   "20-801-L72121",
-   "21-760-L72407",
-   "31-898-L82594",
-   "32-741a-L82726",
-   "36-940-L85222",
-   "37-932-L85272",
- ]
+ Array []

 ❯ test/orquestrador-triador-aceite.test.ts:104:112
    102|       return { nome, classe: x.classe, firme: x.firme, certa: x.classe…
    103|     })
    104|     expect(placar.filter((p) => p.firme && p.certa && p.evidencia).map…
       |                                                                                                                ^
    105|   })
    106| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)
AssertionError: expected { nome: '21-760-L72407', …(2) } to deeply equal { nome: '21-760-L72407', …(2) }

- Expected
+ Received

  Object {
-   "classe": "R5?",
+   "classe": null,
    "firme": false,
    "nome": "21-760-L72407",
  }

 ❯ test/orquestrador-triador-aceite.test.ts:110:80
    108|     const r = await triarTodos('', 'bloqueio')
    109|     for (const nome of ['21-760-L72407', '31-898-L82594']) {
    110|       expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.…
       |                                                                                ^
    111|     }
    112|     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 16 da spec
AssertionError: expected [] to deeply equal [ '07-627j-L57368', …(15) ]

- Expected
+ Received

- Array [
-   "07-627j-L57368",
-   "11-689-L65280",
-   "13-346d-L66187",
-   "15-722-L67970",
-   "16-723-L68736",
-   "17-715-L68793",
-   "20-801-L72121",
-   "21-760-L72407",
-   "22-762-L72665",
-   "23-856-L73817",
-   "26-711b3-L78647",
-   "31-898-L82594",
-   "32-741a-L82726",
-   "35-950-L85145",
-   "36-940-L85222",
-   "37-932-L85272",
- ]
+ Array []

 ❯ test/orquestrador-triador-aceite.test.ts:121:43
    119|     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n)…
    120|     expect(errados).toEqual([])
    121|     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
       |                                           ^
    122|   })
    123| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed | 1 passed | 1 todo (5)
   Start at  21:33:02
   Duration  215ms (transform 22ms, setup 0ms, collect 19ms, tests 14ms, environment 0ms, prepare 40ms)

rc=1
```

### p2-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-leitores.test.ts (6 tests | 6 failed) 77ms
   × leitores do triador (peça 2) > os 37 e os 20 de controle: estágio por tentativa igual ao da presença dos arquivos 23ms
     → expected [ …(57) ] to deeply equal []
   × leitores do triador (peça 2) > o leitor distingue merge recusado com mérito aprovado (940, 932) e marca o estágio 1ms
     → 36-940-L85222: expected undefined to deeply equal [ 'juiz_ok_merge_falhou', …(1) ]
   × leitores do triador (peça 2) > o recorte guarda todo FAIL e todo ❯ de 3 gate-vitest inteiros, e é o mesmo do montar.py 2ms
     → 600: FAIL/❯ fora do recorte: expected [ 983, 994 ] to deeply equal []
   × leitores do triador (peça 2) > recortar de novo o recorte da fixture devolve o mesmo (o contexto conta pela linha original) 1ms
     → /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/test/fixtures/triador-7f/01-559-L55054/attempt-1: expected [] to deeply equal [ Array(181) ]
   × leitores do triador (peça 2) > um repo do molde test-fixture-painel.sh é lido pelo leitor kit 42ms
     → expected undefined to be 'kit' // Object.is equality
   × leitores do triador (peça 2) > o leitor legado num repo materializado de um caso dá a mesma evidência que a fixture (940, 760, 627b) 9ms
     → 36-940-L85222: expected undefined to be truthy

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > os 37 e os 20 de controle: estágio por tentativa igual ao da presença dos arquivos
AssertionError: expected [ …(57) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "01-559-L55054:  != vitest,vitest",
+   "02-559-L55209:  != vitest,vitest",
+   "03-627-L55356:  != vitest,vitest",
+   "04-600-L55898:  != vitest,criterios,vitest",
+   "05-627b-L56021:  != vitest,criterios,criterios",
+   "06-549c-L57053:  != criterios,criterios,criterios",
+   "07-627j-L57368:  != vitest,juiz-ou-merge,vitest",
+   "08-635-L58105:  != vitest,vitest",
+   "09-654-L59896:  != juiz-ou-merge,vitest,criterios",
+   "10-407a-L64280:  != criterios,criterios",
+   "11-689-L65280:  != vitest,vitest",
+   "12-691-L65374:  != criterios,criterios",
+   "13-346d-L66187:  != vitest,enforcement-ou-diff_cap",
+   "14-407a-L67585:  != criterios,vitest,criterios",
+   "15-722-L67970:  != vitest,vitest",
+   "16-723-L68736:  != enforcement-ou-diff_cap,enforcement-ou-diff_cap",
+   "17-715-L68793:  != vitest,vitest",
+   "18-737-L69920:  != tsc,criterios,criterios",
+   "19-739-L71699:  != criterios,enforcement-ou-diff_cap",
+   "20-801-L72121:  != vitest,vitest",
+   "21-760-L72407:  != vitest,vitest",
+   "22-762-L72665:  != vitest,vitest",
+   "23-856-L73817:  != vitest,vitest",
+   "24-867-L76790:  != juiz-ou-merge,juiz-ou-merge,criterios",
+   "25-711a-L78138:  != vitest,criterios,criterios",
+   "26-711b3-L78647:  != criterios,vitest,vitest",
+   "27-741-L79081:  != criterios,criterios",
+   "28-707-L79202:  != vitest,vitest",
+   "29-826-L80362:  != vitest,criterios,juiz-ou-merge",
+   "30-900-L81564:  != criterios,criterios",
+   "31-898-L82594:  != vitest,vitest",
+   "32-741a-L82726:  != vitest,vitest",
+   "33-707-L83026:  != juiz-ou-merge,vitest,vitest",
+   "34-898-L83625:  != criterios,juiz-ou-merge,criterios",
+   "35-950-L85145:  != vitest,vitest",
+   "36-940-L85222:  != juiz-ou-merge,juiz-ou-merge",
+   "37-932-L85272:  != juiz-ou-merge,juiz-ou-merge",
+   "01-633-L57993:  != criterios,vitest,juiz-ou-merge",
+   "02-671d-L61424:  != vitest,juiz-ou-merge",
+   "03-624-L71231:  != vitest,juiz-ou-merge",
+   "04-694-L77408:  != vitest,juiz-ou-merge,juiz-ou-merge",
+   "05-627e-L56919:  != juiz-ou-merge,vitest,juiz-ou-merge",
+   "06-656-L60917:  != vitest,juiz-ou-merge",
+   "07-808-L75301:  != vitest,juiz-ou-merge",
+   "08-706-L77972:  != vitest,juiz-ou-merge",
+   "09-367-L80446:  != vitest,juiz-ou-merge",
+   "10-891-L81042:  != vitest,juiz-ou-merge",
+   "11-907-L83771:  != criterios,juiz-ou-merge",
+   "12-707a-L83293:  != criterios,juiz-ou-merge",
+   "13-868-L78232:  != criterios,juiz-ou-merge",
+   "14-860-L72627:  != criterios,juiz-ou-merge",
+   "15-650-L59553:  != criterios,juiz-ou-merge",
+   "16-712-L68241:  != criterios,juiz-ou-merge",
+   "17-662b-L60556:  != criterios,juiz-ou-merge",
+   "18-735-L69839:  != criterios,juiz-ou-merge",
+   "19-648-L59226:  != criterios,criterios,juiz-ou-merge",
+   "20-744-L72998:  != criterios,criterios,juiz-ou-merge",
+ ]

 ❯ test/orquestrador-triador-leitores.test.ts:105:20
    103|     }
    104|     expect(n).toBeGreaterThan(100)
    105|     expect(difere).toEqual([])
       |                    ^
    106|   })
    107| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > o leitor distingue merge recusado com mérito aprovado (940, 932) e marca o estágio
AssertionError: 36-940-L85222: expected undefined to deeply equal [ 'juiz_ok_merge_falhou', …(1) ]

- Expected: 
Array [
  "juiz_ok_merge_falhou",
  "juiz_ok_merge_falhou",
]

+ Received: 
undefined

 ❯ test/orquestrador-triador-leitores.test.ts:112:55
    110|     for (const c of ['36-940-L85222', '37-932-L85272']) {
    111|       const ev = m?.lerCasoDeFixture(join(FX, c))
    112|       expect(ev?.tentativas.map((t) => t.estagio), c).toEqual(['juiz_o…
       |                                                       ^
    113|       expect(ev?.merge_recusado?.arquivos, c).toEqual(['docs/fila/854-…
    114|       expect(ev?.bloqueio.token, c).toBe('circuit_breaker')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > o recorte guarda todo FAIL e todo ❯ de 3 gate-vitest inteiros, e é o mesmo do montar.py
AssertionError: 600: FAIL/❯ fora do recorte: expected [ 983, 994 ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   983,
+   994,
+ ]

 ❯ test/orquestrador-triador-leitores.test.ts:132:106
    130|         .filter((l) => /^\s*FAIL\s/.test(l.t) || /❯\s+\S+:\d+:\d+/.tes…
    131|       expect(chaves.length, id).toBeGreaterThan(0)
    132|       expect(chaves.filter((l) => !guardadas.has(l.n)).map((l) => l.n)…
       |                                                                                                          ^
    133|       const ref = json<[number, number][]>(join(FX, 'vitest-inteiros',…
    134|         Array.from({ length: b - a + 1 }, (_, i) => a + i),

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > recortar de novo o recorte da fixture devolve o mesmo (o contexto conta pela linha original)
AssertionError: /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/test/fixtures/triador-7f/01-559-L55054/attempt-1: expected [] to deeply equal [ Array(181) ]

- Expected
+ Received

- Array [
-   139,
-   140,
-   141,
-   142,
-   143,
-   144,
-   145,
-   146,
-   156,
-   157,
-   158,
-   159,
-   169,
-   170,
-   171,
-   172,
-   182,
-   183,
-   184,
-   185,
-   195,
-   196,
-   197,
-   198,
-   208,
-   209,
-   210,
-   211,
-   221,
-   222,
-   223,
-   224,
-   234,
-   235,
-   236,
-   237,
-   247,
-   248,
-   249,
-   250,
-   410,
-   411,
-   412,
-   413,
-   414,
-   415,
-   416,
-   417,
-   421,
-   973,
-   974,
-   975,
-   976,
-   977,
-   978,
-   979,
-   980,
-   981,
-   982,
-   983,
-   984,
-   985,
-   986,
-   987,
-   988,
-   989,
-   1142,
-   1143,
-   1144,
-   1145,
-   1146,
-   1147,
-   1148,
-   1149,
-   1150,
-   1151,
-   1152,
-   1153,
-   1154,
-   1155,
-   1156,
-   1157,
-   1158,
-   1159,
-   1160,
-   1161,
-   1162,
-   1339,
-   1340,
-   1341,
-   1342,
-   1343,
-   1344,
-   1345,
-   1346,
-   1347,
-   1348,
-   1349,
-   1350,
-   1351,
-   1352,
-   1353,
-   1354,
-   1355,
-   1356,
-   1357,
-   1358,
-   1359,
-   1424,
-   1425,
-   1426,
-   1427,
-   1428,
-   1429,
-   1430,
-   1431,
-   1432,
-   1433,
-   1434,
-   1435,
-   1436,
-   1437,
-   1438,
-   1439,
-   1440,
-   1441,
-   1442,
-   1443,
-   1444,
-   1445,
-   1446,
-   1447,
-   1448,
-   1449,
-   1450,
-   1725,
-   1726,
-   1727,
-   1728,
-   1729,
-   1730,
-   1731,
-   1732,
-   1733,
-   1734,
-   1735,
-   1736,
-   1737,
-   1738,
-   1739,
-   1740,
-   1741,
-   1742,
-   1743,
-   1744,
-   1745,
-   1746,
-   1747,
-   4231,
-   4232,
-   4233,
-   4234,
-   4235,
-   4236,
-   4237,
-   4238,
-   4239,
-   4240,
-   4241,
-   4242,
-   4243,
-   4244,
-   4245,
-   4246,
-   4247,
-   4248,
-   4249,
-   4250,
-   4251,
-   4252,
-   4253,
- ]
+ Array []

 ❯ test/orquestrador-triador-leitores.test.ts:154:54
    152|         const linhas = ns.map((nn, i) => ({ n: nn, t: ts[i]! }))
    153|         const de_novo = m ? m.recortarVitest(linhas) : []
    154|         expect(de_novo.map((l) => l.n), `${d}/${k}`).toEqual(ns)
       |                                                      ^
    155|         n++
    156|       }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > um repo do molde test-fixture-painel.sh é lido pelo leitor kit
AssertionError: expected undefined to be 'kit' // Object.is equality

- Expected: 
"kit"

+ Received: 
undefined

 ❯ test/orquestrador-triador-leitores.test.ts:195:37
    193|     }
    194|     writeFileSync(join(runs, 'meta.json'), JSON.stringify([{ attempt: …
    195|     expect(m?.detectarLeitor(raiz)).toBe('kit')
       |                                     ^
    196|     const ev = m?.lerRepo(raiz, '501')
    197|     expect(ev?.leitor).toBe('kit')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

 FAIL  test/orquestrador-triador-leitores.test.ts > leitores do triador (peça 2) > o leitor legado num repo materializado de um caso dá a mesma evidência que a fixture (940, 760, 627b)
AssertionError: 36-940-L85222: expected undefined to be truthy

- Expected: 
true

+ Received: 
undefined

 ❯ test/orquestrador-triador-leitores.test.ts:225:39
    223|           })),
    224|         }
    225|       expect(resumo(daFixture), nome).toBeTruthy()
       |                                       ^
    226|       expect(resumo(doRepo), nome).toEqual(resumo(daFixture))
    227|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯

 Test Files  1 failed (1)
      Tests  6 failed (6)
   Start at  21:39:26
   Duration  264ms (transform 28ms, setup 0ms, collect 20ms, tests 77ms, environment 0ms, prepare 49ms)

rc=1
```

### p2-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 332ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  21:39:26
   Duration  492ms (transform 45ms, setup 0ms, collect 17ms, tests 332ms, environment 0ms, prepare 24ms)

rc=0
```

### p3-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-extrair.test.ts (5 tests | 5 failed) 41ms
   × regras do triador (peça 3) > sem o fonte do teste vermelho, o R1 acoplado vira palpite (regra de falta) 39ms
     → expected [ null, false, null ] to deeply equal [ 'R1', true, 'D6' ]
   × regras do triador (peça 3) > sem índice de vizinhos, a base vermelha não fecha (760 vira R5?) 1ms
     → expected [ null, null, '' ] to deeply equal [ 'R5', 'D5', …(1) ]
   × regras do triador (peça 3) > vizinho da MESMA família não prova base vermelha (711a não conta para o 711b3) 0ms
     → expected [ null, false ] to deeply equal [ 'R5?', false ]
   × regras do triador (peça 3) > o que o agente disse não muda a classe (nunca é prova sozinho) 1ms
     → expected null not to be null
   × regras do triador (peça 3) > kit: BLOQUEADO motivo=base_vermelha já é prova firme, com a linha da trilha 0ms
     → expected [ null, false, null, '' ] to deeply equal [ 'R5', true, 'D5', …(1) ]
 ❯ test/orquestrador-triador-aceite.test.ts (5 tests | 3 failed | 1 skipped) 42ms
   × aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada) 39ms
     → [{"nome":"16-723-L68736","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"20-801-L72121","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"21-760-L72407","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"31-898-L82594","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"32-741a-L82726","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"36-940-L85222","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"37-932-L85272","classe":null,"firme":false,"certa":false,"evidencia":false}]: expected [] to deeply equal [ '16-723-L68736', …(6) ]
   × aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois) 1ms
     → expected { nome: '21-760-L72407', …(2) } to deeply equal { nome: '21-760-L72407', …(2) }
   × aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 16 da spec 1ms
     → expected [] to deeply equal [ '07-627j-L57368', …(15) ]

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 8 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada)
AssertionError: [{"nome":"16-723-L68736","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"20-801-L72121","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"21-760-L72407","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"31-898-L82594","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"32-741a-L82726","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"36-940-L85222","classe":null,"firme":false,"certa":false,"evidencia":false},{"nome":"37-932-L85272","classe":null,"firme":false,"certa":false,"evidencia":false}]: expected [] to deeply equal [ '16-723-L68736', …(6) ]

- Expected
+ Received

- Array [
-   "16-723-L68736",
-   "20-801-L72121",
-   "21-760-L72407",
-   "31-898-L82594",
-   "32-741a-L82726",
-   "36-940-L85222",
-   "37-932-L85272",
- ]
+ Array []

 ❯ test/orquestrador-triador-aceite.test.ts:104:112
    102|       return { nome, classe: x.classe, firme: x.firme, certa: x.classe…
    103|     })
    104|     expect(placar.filter((p) => p.firme && p.certa && p.evidencia).map…
       |                                                                                                                ^
    105|   })
    106| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/8]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)
AssertionError: expected { nome: '21-760-L72407', …(2) } to deeply equal { nome: '21-760-L72407', …(2) }

- Expected
+ Received

  Object {
-   "classe": "R5?",
+   "classe": null,
    "firme": false,
    "nome": "21-760-L72407",
  }

 ❯ test/orquestrador-triador-aceite.test.ts:110:80
    108|     const r = await triarTodos('', 'bloqueio')
    109|     for (const nome of ['21-760-L72407', '31-898-L82594']) {
    110|       expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.…
       |                                                                                ^
    111|     }
    112|     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/8]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 16 da spec
AssertionError: expected [] to deeply equal [ '07-627j-L57368', …(15) ]

- Expected
+ Received

- Array [
-   "07-627j-L57368",
-   "11-689-L65280",
-   "13-346d-L66187",
-   "15-722-L67970",
-   "16-723-L68736",
-   "17-715-L68793",
-   "20-801-L72121",
-   "21-760-L72407",
-   "22-762-L72665",
-   "23-856-L73817",
-   "26-711b3-L78647",
-   "31-898-L82594",
-   "32-741a-L82726",
-   "35-950-L85145",
-   "36-940-L85222",
-   "37-932-L85272",
- ]
+ Array []

 ❯ test/orquestrador-triador-aceite.test.ts:121:43
    119|     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n)…
    120|     expect(errados).toEqual([])
    121|     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
       |                                           ^
    122|   })
    123| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/8]⎯

 FAIL  test/orquestrador-triador-extrair.test.ts > regras do triador (peça 3) > sem o fonte do teste vermelho, o R1 acoplado vira palpite (regra de falta)
AssertionError: expected [ null, false, null ] to deeply equal [ 'R1', true, 'D6' ]

- Expected
+ Received

  Array [
-   "R1",
-   true,
-   "D6",
+   null,
+   false,
+   null,
  ]

 ❯ test/orquestrador-triador-extrair.test.ts:40:54
     38|     if (ev) for (const t of ev.tentativas) for (const k of Object.keys…
     39|     const depois = m && ev ? m.extrair(ev) : NADA
     40|     expect([antes.classe, antes.firme, antes.regra]).toEqual(['R1', tr…
       |                                                      ^
     41|     expect([depois.classe, depois.firme, depois.regra]).toEqual(['R5?'…
     42|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/8]⎯

 FAIL  test/orquestrador-triador-extrair.test.ts > regras do triador (peça 3) > sem índice de vizinhos, a base vermelha não fecha (760 vira R5?)
AssertionError: expected [ null, null, '' ] to deeply equal [ 'R5', 'D5', …(1) ]

- Expected
+ Received

  Array [
-   "R5",
-   "D5",
-   "sim_apos:base_verde:test/migrations-policy-idempotente.test.ts",
+   null,
+   null,
+   "",
  ]

 ❯ test/orquestrador-triador-extrair.test.ts:50:56
     48|     if (ev) ev.vizinhos = []
     49|     const depois = m && ev ? m.extrair(ev) : NADA
     50|     expect([antes.classe, antes.regra, antes.requeue]).toEqual(['R5', …
       |                                                        ^
     51|     expect([depois.classe, depois.firme]).toEqual(['R5?', false])
     52|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/8]⎯

 FAIL  test/orquestrador-triador-extrair.test.ts > regras do triador (peça 3) > vizinho da MESMA família não prova base vermelha (711a não conta para o 711b3)
AssertionError: expected [ null, false ] to deeply equal [ 'R5?', false ]

- Expected
+ Received

  Array [
-   "R5?",
+   null,
    false,
  ]

 ❯ test/orquestrador-triador-extrair.test.ts:59:33
     57|     if (ev) ev.vizinhos = ev.vizinhos.map((v: { ticket: string }) => (…
     58|     const x = m && ev ? m.extrair(ev) : NADA
     59|     expect([x.classe, x.firme]).toEqual(['R5?', false])
       |                                 ^
     60|   })
     61| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/8]⎯

 FAIL  test/orquestrador-triador-extrair.test.ts > regras do triador (peça 3) > o que o agente disse não muda a classe (nunca é prova sozinho)
AssertionError: expected null not to be null
 ❯ test/orquestrador-triador-extrair.test.ts:73:19
     71|       expect(antes.evidencia.every((r) => !/claude-output/.test(r.arqu…
     72|     }
     73|     expect(m).not.toBeNull()
       |                   ^
     74|   })
     75| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/8]⎯

 FAIL  test/orquestrador-triador-extrair.test.ts > regras do triador (peça 3) > kit: BLOQUEADO motivo=base_vermelha já é prova firme, com a linha da trilha
AssertionError: expected [ null, false, null, '' ] to deeply equal [ 'R5', true, 'D5', …(1) ]

- Expected
+ Received

  Array [
-   "R5",
-   true,
-   "D5",
-   "sim_apos:base_verde:test/x.test.ts",
+   null,
+   false,
+   null,
+   "",
  ]

 ❯ test/orquestrador-triador-extrair.test.ts:93:53
     91|     }
     92|     const x = m ? m.extrair(ev) : NADA
     93|     expect([x.classe, x.firme, x.regra, x.requeue]).toEqual(['R5', tru…
       |                                                     ^
     94|     expect(x.evidencia).toEqual([ref])
     95|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/8]⎯

 Test Files  2 failed (2)
      Tests  8 failed | 1 passed | 1 todo (10)
   Start at  21:42:50
   Duration  211ms (transform 56ms, setup 0ms, collect 32ms, tests 83ms, environment 0ms, prepare 57ms)

rc=1
```

### p3-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 63ms
 ✓ test/orquestrador-triador-aceite.test.ts (5 tests | 1 skipped) 303ms

 Test Files  2 passed (2)
      Tests  9 passed | 1 todo (10)
   Start at  21:42:50
   Duration  453ms (transform 47ms, setup 0ms, collect 19ms, tests 366ms, environment 0ms, prepare 56ms)

rc=0
```

### p4-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-saida.test.ts (6 tests | 6 failed) 633ms
   × saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 219ms
     → node:internal/modules/esm/resolve:271
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/lucasantos/Projetos/_worktrees/kit-etapa7f/scripts/orquestrador/triador/cli.ts' imported from /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/
    at finalizeResolution (node:internal/modules/esm/resolve:271:11)
    at moduleResolve (node:internal/modules/esm/resolve:865:10)
    at defaultResolve (node:internal/modules/esm/resolve:992:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:701:20)
    at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:721:38)
    at nextStep (node:internal/modules/customization_hooks:189:26)
    at resolveBaseSync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:10932)
    at resolveDirectorySync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:12238)
    at resolveTsPathsSync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:13445)
    at resolve (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:15991) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/lucasantos/Projetos/_worktrees/kit-etapa7f/scripts/orquestrador/triador/cli.ts'
}

Node.js v24.19.0
: expected 1 to be +0 // Object.is equality
   × saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 157ms
     → expected 1 to be +0 // Object.is equality
   × saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 159ms
     → expected 1 to be +0 // Object.is equality
   × saída do triador (peça 4) > escrita com destino dentro de um repo do repos.json lança erro, e fora da raiz também 4ms
     → expected 'sem módulo' to be 'escreveu' // Object.is equality
   × saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 93ms
     → expected undefined to be 'travado' // Object.is equality
   × saída do triador (peça 4) > gitLeitura recusa verbo de escrita e status sem --porcelain, antes de existir processo 1ms
     → checkout main: expected 'sem módulo' to be 'recusou' // Object.is equality

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 6 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0
AssertionError: node:internal/modules/esm/resolve:271
    throw new ERR_MODULE_NOT_FOUND(
          ^

Error [ERR_MODULE_NOT_FOUND]: Cannot find module '/Users/lucasantos/Projetos/_worktrees/kit-etapa7f/scripts/orquestrador/triador/cli.ts' imported from /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/
    at finalizeResolution (node:internal/modules/esm/resolve:271:11)
    at moduleResolve (node:internal/modules/esm/resolve:865:10)
    at defaultResolve (node:internal/modules/esm/resolve:992:11)
    at #cachedDefaultResolve (node:internal/modules/esm/loader:701:20)
    at #resolveAndMaybeBlockOnLoaderThread (node:internal/modules/esm/loader:721:38)
    at nextStep (node:internal/modules/customization_hooks:189:26)
    at resolveBaseSync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:10932)
    at resolveDirectorySync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:12238)
    at resolveTsPathsSync (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:13445)
    at resolve (file:///Users/lucasantos/Projetos/orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:15991) {
  code: 'ERR_MODULE_NOT_FOUND',
  url: 'file:///Users/lucasantos/Projetos/_worktrees/kit-etapa7f/scripts/orquestrador/triador/cli.ts'
}

Node.js v24.19.0
: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ resolveBaseSync ../../orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:10932
 ❯ resolveDirectorySync ../../orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:12238
 ❯ resolveTsPathsSync ../../orquestrador-kit/node_modules/tsx/dist/register-SoqaU4rg.mjs:2:13445
 ❯ test/orquestrador-triador-saida.test.ts:138:32
    136|     const r = triarCli(raiz)
    137|     const depois = retrato(raiz)
    138|     expect(r.status, r.stderr).toBe(0)
       |                                ^
    139|     expect(r.stdout).toMatch(/627j\tR1\tfirme D6/)
    140|     expect(depois).toEqual(antes)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/6]⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico
AssertionError: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ test/orquestrador-triador-saida.test.ts:155:35
    153|     const raiz = repoGit(base)
    154|     writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_v…
    155|     expect(triarCli(raiz).status).toBe(0)
       |                                   ^
    156|     const atual = join(diag, 'comarka-fx', '627j.json')
    157|     const m1 = statSync(atual).mtimeMs

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/6]⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado
AssertionError: expected 1 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 1

 ❯ test/orquestrador-triador-saida.test.ts:176:35
    174|     const raiz = repoGit(base)
    175|     writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_v…
    176|     expect(triarCli(raiz).status).toBe(0)
       |                                   ^
    177|     const d = JSON.parse(readFileSync(join(diag, 'comarka-fx', '627j.j…
    178|     expect(d.copia_evidencia.startsWith(diag)).toBe(true)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/6]⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > escrita com destino dentro de um repo do repos.json lança erro, e fora da raiz também
AssertionError: expected 'sem módulo' to be 'escreveu' // Object.is equality

Expected: "escreveu"
Received: "sem módulo"

 ❯ test/orquestrador-triador-saida.test.ts:206:80
    204|       }
    205|     }
    206|     expect(tenta(() => new m!.Guarda().escrever(join(diag, 'ok.json'),…
       |                                                                                ^
    207|     expect(tenta(() => new m!.Guarda().escrever(join(repo, 'docs', 'x.…
    208|     expect(tenta(() => new m!.Guarda().escrever(join(base, 'fora.json'…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/6]⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda
AssertionError: expected undefined to be 'travado' // Object.is equality

- Expected: 
"travado"

+ Received: 
undefined

 ❯ test/orquestrador-triador-saida.test.ts:228:56
    226|     writeFileSync(trava, '{"pid": 1}\n')
    227|     const repo = { nome: 'comarka-fx', caminho: raiz }
    228|     expect(m?.triarTicket({ repo, id: '627j' }).feito).toBe('travado')
       |                                                        ^
    229|     expect(existsSync(join(diag, 'comarka-fx', '627j.json'))).toBe(fal…
    230|     const velho = new Date(Date.now() - 11 * 60 * 1000)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/6]⎯

 FAIL  test/orquestrador-triador-saida.test.ts > saída do triador (peça 4) > gitLeitura recusa verbo de escrita e status sem --porcelain, antes de existir processo
AssertionError: checkout main: expected 'sem módulo' to be 'recusou' // Object.is equality

Expected: "recusou"
Received: "sem módulo"

 ❯ test/orquestrador-triador-saida.test.ts:249:38
    247|     }
    248|     for (const a of [['checkout', 'main'], ['fetch'], ['worktree', 'ad…
    249|       expect(recusa(a), a.join(' ')).toBe('recusou')
       |                                      ^
    250|     }
    251|     expect(recusa(['rev-parse', '--version'])).toBe('rodou')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/6]⎯

 Test Files  1 failed (1)
      Tests  6 failed (6)
   Start at  21:46:59
   Duration  842ms (transform 19ms, setup 0ms, collect 25ms, tests 633ms, environment 0ms, prepare 29ms)

rc=1
```

### p4-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 2368ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 598ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 940ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 594ms

 Test Files  1 passed (1)
      Tests  6 passed (6)
   Start at  21:47:00
   Duration  2.52s (transform 53ms, setup 0ms, collect 24ms, tests 2.37s, environment 0ms, prepare 24ms)

rc=0
```

### p5-vermelho
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ❯ test/orquestrador-triador-modelo.test.ts (10 tests | 10 failed) 163ms
   × modelo do triador, com stub (peça 5) > o prompt é o literal da spec §4, e a entrada preenche todos os campos 50ms
     → expected null to be '3e016ee70c19d029d12be1726fcfeaca5f2a1…' // Object.is equality
   × modelo do triador, com stub (peça 5) > entrada acima de 30 mil tokens corta de baixo para cima, na ordem de §4, e vai mascarada 1ms
     → expected Infinity to be less than or equal to 105000
   × modelo do triador, com stub (peça 5) > o teto do dia impede a chamada e grava pulado; no limite exato ainda chama 2ms
     → expected undefined to deeply equal { modelo: 'claude-opus-5-5', …(1) }
   × modelo do triador, com stub (peça 5) > envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido) 2ms
     → expected [ undefined, undefined, …(2) ] to deeply equal [ 'R4?', 'extracao', false, 'D9' ]
   × modelo do triador, com stub (peça 5) > evidência com linha inexistente (ou arquivo que não foi lido) é descartada; a válida fica 1ms
     → expected [ undefined, undefined, …(2) ] to deeply equal [ 'R3', 'modelo', false, 'media' ]
   × modelo do triador, com stub (peça 5) > resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração 1ms
     → expected [ undefined, undefined ] to deeply equal [ 'R4?', 'extracao' ]
   × modelo do triador, com stub (peça 5) > sem stub, sob teste, a chamada real é recusada antes de existir processo 1ms
     → expected null to be true // Object.is equality
   × modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 33ms
     → jq: error: Could not open file /Users/lucasantos/Projetos/orquestrador-kit/docs/fila/000-config.json: No such file or directory
: expected 2 to be +0 // Object.is equality
   × modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga 44ms
     → jq: error: Could not open file /Users/lucasantos/Projetos/orquestrador-kit/docs/fila/000-config.json: No such file or directory
: expected 2 to be +0 // Object.is equality
   × modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 28ms
     → expected '' to match /\n760\tR5\?\tpalpite D7\t/

⎯⎯⎯⎯⎯⎯ Failed Tests 10 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > o prompt é o literal da spec §4, e a entrada preenche todos os campos
AssertionError: expected null to be '3e016ee70c19d029d12be1726fcfeaca5f2a1…' // Object.is equality

- Expected: 
"3e016ee70c19d029d12be1726fcfeaca5f2a13a3608cd8e942fb66a41813b833"

+ Received: 
null

 ❯ test/orquestrador-triador-modelo.test.ts:99:72
     97|   it('o prompt é o literal da spec §4, e a entrada preenche todos os c…
     98|     const c = await contexto()
     99|     expect(c && createHash('sha256').update(c.m.PROMPT).digest('hex'))…
       |                                                                        ^
    100|     const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext)
    101|     expect(e?.prompt.startsWith('Você é o triador de bloqueios de um o…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > entrada acima de 30 mil tokens corta de baixo para cima, na ordem de §4, e vai mascarada
AssertionError: expected Infinity to be less than or equal to 105000
 ❯ test/orquestrador-triador-modelo.test.ts:115:34
    113|     }
    114|     const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext, 3…
    115|     expect(e?.chars ?? Infinity).toBeLessThanOrEqual(30000 * 3.5)
       |                                  ^
    116|     expect(e?.cortes.map((x) => x.secao)).toEqual([7, 6, 5, 4, 3])
    117|     expect(e?.cortes.slice(0, 4).every((x) => x.para === 0)).toBe(true)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > o teto do dia impede a chamada e grava pulado; no limite exato ainda chama
AssertionError: expected undefined to deeply equal { modelo: 'claude-opus-5-5', …(1) }

- Expected: 
Object {
  "modelo": "claude-opus-5-5",
  "pulado": "teto_dia",
}

+ Received: 
undefined

 ❯ test/orquestrador-triador-modelo.test.ts:137:25
    135|     ledger([1.5, 1.3])
    136|     const r = c?.m.criarPassoModelo(CFG)(c.ctx)
    137|     expect(r?.registro).toEqual({ modelo: 'claude-opus-5-5', pulado: '…
       |                         ^
    138|     expect(chamadas()).toEqual([])
    139|     ledger([1.5, 1.2])

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido)
AssertionError: expected [ undefined, undefined, …(2) ] to deeply equal [ 'R4?', 'extracao', false, 'D9' ]

- Expected
+ Received

  Array [
-   "R4?",
-   "extracao",
-   false,
-   "D9",
+   undefined,
+   undefined,
+   undefined,
+   undefined,
  ]

 ❯ test/orquestrador-triador-modelo.test.ts:151:55
    149|     writeFileSync(join(base, 'resposta.json'), 'Error: conexão recusad…
    150|     const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, …
    151|     expect([d?.classe, d?.fonte, d?.firme, d?.regra]).toEqual(['R4?', …
       |                                                       ^
    152|     expect(d?.modelo?.erro).toMatch(/envelope ilegível/)
    153|     expect(chamadas()).toHaveLength(1)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > evidência com linha inexistente (ou arquivo que não foi lido) é descartada; a válida fica
AssertionError: expected [ undefined, undefined, …(2) ] to deeply equal [ 'R3', 'modelo', false, 'media' ]

- Expected
+ Received

  Array [
-   "R3",
-   "modelo",
-   false,
-   "media",
+   undefined,
+   undefined,
+   undefined,
+   undefined,
  ]

 ❯ test/orquestrador-triador-modelo.test.ts:169:59
    167|     )
    168|     const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, …
    169|     expect([d?.classe, d?.fonte, d?.firme, d?.confianca]).toEqual(['R3…
       |                                                           ^
    170|     expect(d?.modelo?.evidencia_descartada).toBe(2)
    171|     expect(d?.evidencia.map((r: { arquivo: string; linha: number }) =>…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração
AssertionError: expected [ undefined, undefined ] to deeply equal [ 'R4?', 'extracao' ]

- Expected
+ Received

  Array [
-   "R4?",
-   "extracao",
+   undefined,
+   undefined,
  ]

 ❯ test/orquestrador-triador-modelo.test.ts:182:37
    180|       envelope(result)
    181|       const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext…
    182|       expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
       |                                     ^
    183|       expect(d?.modelo?.erro).toBeTruthy()
    184|     }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > sem stub, sob teste, a chamada real é recusada antes de existir processo
AssertionError: expected null to be true // Object.is equality

- Expected: 
true

+ Received: 
null

 ❯ test/orquestrador-triador-modelo.test.ts:196:58
    194|       erro = e
    195|     }
    196|     expect(c && erro instanceof c.m.ChamadaRealRecusada).toBe(true)
       |                                                          ^
    197|   })
    198| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[7/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura
AssertionError: jq: error: Could not open file /Users/lucasantos/Projetos/orquestrador-kit/docs/fila/000-config.json: No such file or directory
: expected 2 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 2

 ❯ test/orquestrador-triador-modelo.test.ts:204:34
    202|     const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scr…
    203|     const r1 = orq('comarka-fx', '559')
    204|     expect(r1.status, r1.stderr).toBe(0)
       |                                  ^
    205|     expect(r1.stdout).toMatch(/^comarka-fx \(.*comarka-fx\) · modelo c…
    206|     expect(chamadas()).toHaveLength(1)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[8/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga
AssertionError: jq: error: Could not open file /Users/lucasantos/Projetos/orquestrador-kit/docs/fila/000-config.json: No such file or directory
: expected 2 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 2

 ❯ test/orquestrador-triador-modelo.test.ts:222:32
    220|       spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fix…
    221|     const r = orq('6.30')
    222|     expect(r.status, r.stderr).toBe(0)
       |                                ^
    223|     expect(chamadas()).toHaveLength(21)
    224|     expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[9/10]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)
AssertionError: expected '' to match /\n760\tR5\?\tpalpite D7\t/

- Expected: 
/\n760\tR5\?\tpalpite D7\t/

+ Received: 
""

 ❯ test/orquestrador-triador-modelo.test.ts:242:23
    240|     const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scr…
    241|     const r1 = orq('--sem-modelo')
    242|     expect(r1.stdout).toMatch(/\n760\tR5\?\tpalpite D7\t/)
       |                       ^
    243|     // o 761 fica vermelho no mesmo teste 17 min depois
    244|     const viz = join(raiz, 'docs/fila/runs/761/attempt-1')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[10/10]⎯

 Test Files  1 failed (1)
      Tests  10 failed (10)
   Start at  21:53:25
   Duration  375ms (transform 51ms, setup 0ms, collect 24ms, tests 163ms, environment 0ms, prepare 31ms)

rc=1
```

### p5-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-modelo.test.ts (10 tests) 2478ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 622ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga 1208ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 483ms

 Test Files  1 passed (1)
      Tests  10 passed (10)
   Start at  21:53:26
   Duration  2.66s (transform 68ms, setup 0ms, collect 25ms, tests 2.48s, environment 0ms, prepare 36ms)

rc=0
```

### p7-vermelho (7f-b1-7, `extrair.ts` ainda sem a restrição)
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 196ms
 ❯ test/orquestrador-triador-aceite.test.ts (6 tests | 3 failed | 1 skipped) 295ms
   × aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois) 50ms
     → expected [ '07-627j-L57368', …(13) ] to have a length of 13 but got 14
   × aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 15 (16 da spec menos o 346d) 43ms
     → expected [ '07-627j-L57368', …(15) ] to deeply equal [ '07-627j-L57368', …(14) ]
   × aceite do triador (spec 7f-a §7.2) > (cortados) nenhum dos 5 de série cortada sai firme, nos dois instantes (D6 pede o vermelho em ≥ 2 tentativas) 4ms
     → expected [ '01-671d-L61399=R1', …(4) ] to deeply equal []
 ❯ test/orquestrador-triador-modelo.test.ts (10 tests | 1 failed) 1798ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 630ms
   × modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga 543ms
     → expected [ …(21) ] to have a length of 22 but got 21
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 482ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)
AssertionError: expected [ '07-627j-L57368', …(13) ] to have a length of 13 but got 14

- Expected
+ Received

- 13
+ 14

 ❯ test/orquestrador-triador-aceite.test.ts:119:20
    117|     }
    118|     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
    119|     expect(firmes).toHaveLength(13)
       |                    ^
    120|   })
    121| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 15 (16 da spec menos o 346d)
AssertionError: expected [ '07-627j-L57368', …(15) ] to deeply equal [ '07-627j-L57368', …(14) ]

- Expected
+ Received

  Array [
    "07-627j-L57368",
    "11-689-L65280",
+   "13-346d-L66187",
    "15-722-L67970",
    "16-723-L68736",
    "17-715-L68793",
    "20-801-L72121",
    "21-760-L72407",
    "22-762-L72665",
    "23-856-L73817",
    "26-711b3-L78647",
    "31-898-L82594",
    "32-741a-L82726",
    "35-950-L85145",
    "36-940-L85222",
    "37-932-L85272",
  ]

 ❯ test/orquestrador-triador-aceite.test.ts:127:43
    125|     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n)…
    126|     expect(errados).toEqual([])
    127|     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
       |                                           ^
    128|     expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13…
    129|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (cortados) nenhum dos 5 de série cortada sai firme, nos dois instantes (D6 pede o vermelho em ≥ 2 tentativas)
AssertionError: expected [ '01-671d-L61399=R1', …(4) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "01-671d-L61399=R1",
+   "02-624-L71202=R1",
+   "03-627e-L56882=R1",
+   "04-808-L75274=R1",
+   "05-367-L80416=R1",
+ ]

 ❯ test/orquestrador-triador-aceite.test.ts:143:85
    141|       const r = await triarTodos('cortados', instante)
    142|       expect(r.size).toBe(5)
    143|       expect([...r].filter(([, x]) => x.firme).map(([n, x]) => `${n}=$…
       |                                                                                     ^
    144|     }
    145|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga
AssertionError: expected [ …(21) ] to have a length of 22 but got 21

- Expected
+ Received

- 22
+ 21

 ❯ test/orquestrador-triador-modelo.test.ts:223:24
    221|     const r = orq('6.60')
    222|     expect(r.status, r.stderr).toBe(0)
    223|     expect(chamadas()).toHaveLength(22)
       |                        ^
    224|     expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\…
    225|     const dir = join(base, 'diag', 'fixture-triador-7f')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

 Test Files  2 failed | 1 passed (3)
      Tests  4 failed | 21 passed | 1 todo (26)
   Start at  23:14:04
   Duration  1.97s (transform 95ms, setup 0ms, collect 73ms, tests 2.29s, environment 0ms, prepare 107ms)
```

### p7-verde
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 60ms
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 135ms
 ✓ test/orquestrador-triador-aceite.test.ts (6 tests | 1 skipped) 301ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 330ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 2409ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 688ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 902ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 567ms
 ✓ test/orquestrador-triador-modelo.test.ts (10 tests) 2566ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 622ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga 1189ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 557ms

 Test Files  6 passed (6)
      Tests  42 passed | 1 todo (43)
   Start at  23:14:18
   Duration  2.74s (transform 184ms, setup 0ms, collect 226ms, tests 5.80s, environment 0ms, prepare 168ms)
```

## Anexo B. Suítes, saída crua

### f-typecheck
```
typecheck rc=0
```

### f-vitest
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 81ms
 ✓ test/orquestrador-prevoo.test.ts (35 tests) 54ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 477ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 25ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 473ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 9696ms
   ✓ migrar-liberacoes: qualquer forma viva → v2 > CI (7 strings COM prefixo) → 7 objetos v2, mesma ordem 308ms
   ✓ migrar-liberacoes: qualquer forma viva → v2 > Actus (5 strings SEM prefixo) ganha o prefixo, sem perder nem inventar token 356ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 1307ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > depois da migração o motor não grava mais AVISO de forma legada 389ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 982ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 1815ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 1972ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > sem token: erro de uso, e o arquivo NÃO muda 419ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 944ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 4143ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 1000ms
   ✓ critérios do executor — strip de ANSI > a saída registrada na evidência já vem sem escape de cor 633ms
   ✓ critérios do executor — strip de ANSI > REGRESSÃO: sem o strip a mesma saída NÃO casava — a cegueira era do harness 493ms
   ✓ critérios do executor — strip de ANSI > critério NUMÉRICO também é imune a cor (igualdade exata sobre saída colorida) 549ms
   ✓ critérios do executor — strip de ANSI > texto acentuado sobrevive ao strip (o filtro não estraga UTF-8) 617ms
   ✓ critérios do executor — BASE_REF > o cmd recebe a base REAL da worktree (branch_alvo do config), não a protegida 503ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 17779ms
   ✓ check 2 · campos obrigatórios (só para pendente) > BOM: pendente completo não acusa campo nenhum 461ms
   ✓ check 2 · campos obrigatórios (só para pendente) > `risco` é opcional: ausente e vazio passam, lixo não 533ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 1563ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 1466ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 1654ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 1424ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 3005ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 1468ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 1419ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 3052ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 19336ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 1875ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 1357ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 1228ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 1370ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 2430ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 1314ms
   ✓ a fila reconhece o status refatiar > o placar da fila lista refatiar na ordem fixa 498ms
   ✓ a fila reconhece o status refatiar > refatiar NÃO é processável: proximo_pendente pula e pega o pendente 435ms
   ✓ a fila reconhece o status refatiar > orq fila mostra o ticket com o status refatiar 691ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 1011ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 1001ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 1277ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 2153ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 1069ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 1342ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 17028ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > com node_modules/.bin/tsx no checkout, resolve para ELE (caminho absoluto) 312ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru 732ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 1651ms
   ✓ as 15 chamadas do motor passam pela resolução única > `orq config` de verdade continua respondendo no fixture (rc 0) 642ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 1037ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 996ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 962ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 1487ms
   ✓ cat.7 · toolchain > a dep real é `test -x` no checkout: nada de npx, nada de rede 551ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 1005ms
   ✓ instalar.sh · recusa repo sem tsx > --atualizar RECUSA (rc 1) e a mensagem nomeia o repo e o comando 720ms
   ✓ instalar.sh · recusa repo sem tsx > --forcar NÃO dispensa: forçar copiaria um motor que não roda 606ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 1210ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 924ms
   ✓ instalar.sh · recusa repo sem tsx > --novo RECUSA (rc 1) e não escreve UM byte no repo alvo 508ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 2893ms
   ✓ instalar.sh · recusa repo sem tsx > o range do tsx sai do package.json do kit — nunca de uma constante à parte 474ms
 ✓ test/doutrina-v2.test.ts (30 tests) 49ms
 ✓ test/orq-cli.test.ts (42 tests) 20129ms
   ✓ orq — imprime o STATUS.md > mostra o snapshot quando ele existe 450ms
   ✓ orq — imprime o STATUS.md > sem snapshot, avisa e cai no placar em vez de imprimir nada 671ms
   ✓ orq fila — placar por status lendo o JSON dos tickets > conta por status e lista cada ticket com frente 794ms
   ✓ orq fila — placar por status lendo o JSON dos tickets > fila vazia não quebra 390ms
   ✓ orq eventos [n] > default 20, mais recentes por último 395ms
   ✓ orq eventos [n] > n corta a cauda 460ms
   ✓ orq eventos [n] > n não-numérico é erro explícito, não tail estranho 394ms
   ✓ orq eventos [n] > trilha vazia avisa em vez de falhar 347ms
   ✓ orq erro — último reprovado, com o recorte do gate que falhou > id, motivo e caminho da evidência 569ms
   ✓ orq erro — último reprovado, com o recorte do gate que falhou > recorta o gate que reprovou — aqui o enforcement, com o arquivo fora da allowlist 474ms
   ✓ orq erro — último reprovado, com o recorte do gate que falhou > no máximo 30 linhas de recorte (não é o log inteiro) 483ms
   ✓ orq erro — último reprovado, com o recorte do gate que falhou > sem nada reprovado, diz isso 496ms
   ✓ orq ticket <id> — última tentativa + evidência > mostra status do ticket e a ÚLTIMA tentativa do meta.json 663ms
   ✓ orq ticket <id> — última tentativa + evidência > sem id é erro de uso 349ms
   ✓ orq ticket <id> — última tentativa + evidência > ticket sem run ainda: avisa, não quebra 639ms
   ✓ orq custo [dia] — agregado por papel e por ticket, vs teto > soma o dia e compara com o teto do config 393ms
   ✓ orq custo [dia] — agregado por papel e por ticket, vs teto > quebra por papel e por ticket 463ms
   ✓ orq custo [dia] — agregado por papel e por ticket, vs teto > dia sem consumo: zera em vez de falhar 453ms
   ✓ orq custo [dia] — agregado por papel e por ticket, vs teto > teto estourado é dito com todas as letras 419ms
   ✓ orq custo [dia] — agregado por papel e por ticket, vs teto > sem custo.json ainda, informa o teto e sai 0 570ms
   ✓ orq decisoes > imprime o arquivo de decisões pendentes 444ms
   ✓ orq decisoes > sem arquivo, avisa e sai 0 400ms
   ✓ orq mapa lint|status > lint delega ao lint-mapa.py e devolve o rc dele 484ms
   ✓ orq mapa lint|status > status conta por frente a partir do campo frente do ticket 509ms
   ✓ orq mapa lint|status > ticket sem frente cai em sem-frente, não some do placar 412ms
   ✓ orq mapa lint|status > subcomando de mapa desconhecido é erro de uso 434ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > pausar cria o pausar_file do config com data e motivo 467ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 1055ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar sem pausa é idempotente 420ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > pausar NÃO toca ticket nem evidência 477ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 1167ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 941ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 996ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 1054ms
   ✓ orq validar — o gate de ticket, com o rc repassado > o verbo está no --help 421ms
   ✓ read-only por construção > é executável 564ms
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 5442ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 1818ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > padrão do grep -v sem exemplo é dispensado; padrão POSITIVO sem exemplo segue acusado 467ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 27ms
 ✓ test/orquestrador-triador-modelo.test.ts (10 tests) 14596ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 3352ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga 7426ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 2892ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 23998ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 1261ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 1299ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 1262ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 1327ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 2921ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 2968ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 2723ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 2749ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 2942ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 2850ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 1678ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 29ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 2100ms
   ✓ peça K6e · com --permitir-tmp, a instalação inteira passa pelo STUB > chama bootout e bootstrap no stub, e o launchd real nunca é tocado 353ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 9966ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 2121ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 4333ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 2210ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 1145ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 9335ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 1523ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 1390ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 921ms
   ✓ orq ticket mostra os commits do trailer > lista o commit quando ele existe 798ms
   ✓ orq ticket mostra os commits do trailer > sem commit nenhum, avisa em vez de fingir que achou 669ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 1768ms
   ✓ aprovação de primeira sai da trilha, com a conta 1-based > conta APROVADO com attempt=1 sobre o total de APROVADO do dia 445ms
   ✓ aprovação de primeira sai da trilha, com a conta 1-based > attempt=10 não conta como de primeira (a âncora não é prefixo) 503ms
   ✓ aprovação de primeira sai da trilha, com a conta 1-based > sem APROVADO no dia, diz isso em vez de dividir por zero 450ms
   ✓ aprovação de primeira sai da trilha, com a conta 1-based > trilha vazia não quebra o comando 429ms
   ✓ aprovação de primeira sai da trilha, com a conta 1-based > o dia filtra: APROVADO de ontem não entra na conta de hoje 423ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 1644ms
   ✓ leitores do triador (peça 2) > os 37 e os 20 de controle: estágio por tentativa igual ao da presença dos arquivos 800ms
   ✓ leitores do triador (peça 2) > o leitor legado num repo materializado de um caso dá a mesma evidência que a fixture (940, 760, 627b) 444ms
 ✓ test/orquestrador-gate-comarka.test.ts (14 tests) 2148ms
   ✓ 7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila > repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda 1574ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 24ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 35849ms
   ✓ custo_registrar grava o consumo real da chamada > acrescenta em dias.<AAAA-MM-DD>[] com os campos do contrato 1589ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 1248ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 1216ms
   ✓ custo_registrar grava o consumo real da chamada > pega o ÚLTIMO objeto JSON: o arquivo carrega stdout + stderr, não só JSON 591ms
   ✓ falha de contabilidade NUNCA bloqueia o ticket > usage ilegível: loga e segue com rc 0 446ms
   ✓ falha de contabilidade NUNCA bloqueia o ticket > saída vazia: loga e segue com rc 0 310ms
   ✓ falha de contabilidade NUNCA bloqueia o ticket > campos ausentes viram 0, não quebram o arquivo 541ms
   ✓ orcamento_veredito: ok | dia | ticket > sem consumo, ok 322ms
   ✓ orcamento_veredito: ok | dia | ticket > abaixo dos tetos, ok 379ms
   ✓ orcamento_veredito: ok | dia | ticket > teto de USD/dia atingido => dia 356ms
   ✓ orcamento_veredito: ok | dia | ticket > teto de tokens/dia atingido => dia (mesmo com USD baixo) 452ms
   ✓ orcamento_veredito: ok | dia | ticket > teto por ticket atingido => ticket (e só para ESSE ticket) 866ms
   ✓ orcamento_veredito: ok | dia | ticket > consumo de ONTEM não conta hoje 380ms
   ✓ orcamento_veredito: ok | dia | ticket > custo.json corrompido não vira "dia" acidental (custo não bloqueia) 462ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > arquivo AUSENTE => ok, com aviso no log 320ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > arquivo CORROMPIDO => ok, com aviso no log 407ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > JSON VÁLIDO com a forma errada => ok, com aviso (jq quebra, o gate não) 419ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > truncado no meio da escrita => ok, sem "dia" acidental 405ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > o aviso sai no LOG (stderr), nunca no stdout: o veredito é uma palavra só 528ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 4638ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 4328ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > fail-open NÃO é fail-always: ledger legível acima do teto ainda para 383ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > volta a pendente com adiado_ate = próximo dia 559ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > escopo ticket grava a nota orcamento_ticket 483ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > emite o evento ORCAMENTO com escopo e consumo 628ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 1114ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > adiamento vencido volta a ser processável (não é bloqueio permanente) 397ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 2460ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 2754ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 2366ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 4205ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 4900ms
   ✓ A9 · o que REALMENTE casa no envelope do CLI 2.1.259 > envelope de erro traz total_cost_usd: a chamada que falhou também é medida 481ms
   ✓ A9 · saída VAZIA com rc != 0 ⇒ adia (o CLI não chegou a falar) > NEGATIVO: erro de USO do CLI não é vazio — stderr cai no mesmo arquivo 328ms
   ✓ A9 · os dois gêmeos concordam em todos os casos > sucesso que menciona limite 326ms
   ✓ A9 · os dois gêmeos concordam em todos os casos > erro de uso do CLI 376ms
 ✓ test/orquestrador-contexto-juiz-fixtures.test.ts (8 tests) 9271ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE 3336ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (b) helper definido no próprio diff não entra no bloco e aparece UMA vez; o de fora aparece no bloco, no MESMO prompt 3076ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (c) diff sem teste novo: nenhum bloco, prompt igual ao montado sem definições 2849ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 26ms
 ✓ test/orquestrador-contexto-juiz.test.ts (14 tests) 17827ms
   ✓ run_juiz com contexto_juiz > o critério cita um arquivo fora do diff: o material do juiz passa a conter esse arquivo, rotulado 3434ms
   ✓ run_juiz com contexto_juiz > o conteúdo é o da BASE da tentativa, não o da HEAD 3196ms
   ✓ run_juiz com contexto_juiz > arquivo acima do teto é truncado, e o truncamento está escrito no texto 3081ms
   ✓ run_juiz com contexto_juiz > caminho ausente na base falha ALTO: rc != 0, nome do caminho no log, juiz não roda 1519ms
   ✓ run_juiz com contexto_juiz > ticket SEM contexto_juiz: nenhum bloco de referência 2794ms
   ✓ (d) gate-ticket valida contexto_juiz > ausente: nada a dizer 509ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho que existe na branch alvo e não é da allowlist: ok 538ms
   ✓ (d) gate-ticket valida contexto_juiz > não é lista de strings: violação 1055ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho que não existe na branch alvo: violação que nomeia o caminho 518ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho listado na allowlist do próprio ticket: violação 784ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho só coberto por GLOB da allowlist (o caso do 501): aviso, não violação 396ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 770ms
   ✓ o wrapper falha alto quando falta ferramenta > sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop) 335ms
 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 2449ms
   ✓ 624 · caso real do actus-saas > pelo CLI, o 631[8] do done sai com rc 1 e a mensagem 835ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 26105ms
   ✓ status_set reescreve o snapshot INTEIRO > grava todos os campos obrigatórios do contrato 765ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 8753ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 1059ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 1068ms
   ✓ status_set reescreve o snapshot INTEIRO > executando não carrega MOTIVO (motivo é só de fila parada) 809ms
   ✓ status_set reescreve o snapshot INTEIRO > DESDE distingue trabalhando de travado: decorrido + quanto falta p/ timeout 783ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > placar bate com os tickets do fixture 815ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 1419ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > STAGING mostra que o push está suprimido (regra 12) 732ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > chave desconhecida é ignorada com aviso, não escreve lixo no snapshot 691ms
   ✓ event: uma linha por transição, formato fixo > <iso8601> <id> <EVENTO> chave=valor 322ms
   ✓ event: uma linha por transição, formato fixo > anexa (a trilha é histórico), uma linha por chamada 340ms
   ✓ event: uma linha por transição, formato fixo > evento sem pares chave=valor não deixa espaço solto no fim 377ms
   ✓ event: uma linha por transição, formato fixo > cabe numa tela: nenhuma linha passa de 200 colunas 305ms
   ✓ motivo é TOKEN grepável, nunca frase > {"desfecho":"reprovado","causa":"criterio_qualidade","motivo":"2 critérios falharam"} => criterio_qualidade 364ms
   ✓ motivo é TOKEN grepável, nunca frase > {"desfecho":"adiado","causa":"rate_limit","motivo":"infraestrutura: rate_limit"} => rate_limit 316ms
   ✓ motivo é TOKEN grepável, nunca frase > {"desfecho":"reprovado","causa":"diff_cap","motivo":"diff de 900 linhas"} => diff_cap 311ms
   ✓ motivo é TOKEN grepável, nunca frase > sem causa, o texto vira slug curto sem espaço (ainda grepável) 344ms
   ✓ motivo é TOKEN grepável, nunca frase > veredito ilegível não quebra o evento 397ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 1311ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 1619ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 1461ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 1439ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 5640ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > aviso vira erro, erro vira off, e o 6a:$( volta a acusar com a isenção de volta 314ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 1846ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > ticket só com avisos: rc 0, e --violacoes não imprime nada 1388ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > a saída sem --relatorio marca o aviso rebaixado, para não passar por violação 568ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > o mesmo ticket com 6q em erro pelo config: rc 1 e a linha na saída de --violacoes 597ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 16ms
 ✓ test/orquestrador-gate-regex-exemplos.test.ts (11 tests) 3981ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (a) regex VELHO (classe com \[\]) com os exemplos do 503 REPROVA pela regra 5 e pela regra 3 839ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (b) regex NOVO com os mesmos exemplos PASSA: zero violações e o ticket no relatório como OK 1604ms
   ✓ 624 · falha alta > (f) /usr/bin/grep ausente: o gate NÃO passa, sai com rc 2 dizendo o binário 1226ms
 ✓ test/orq-versao-config.test.ts (16 tests) 10129ms
   ✓ orq versao > sem carimbo: diz "repo sem VERSAO" e sai 0 (não é erro, é ausência) 487ms
   ✓ orq versao > com carimbo: imprime a versão que está no docs/orquestrador/skill/VERSAO 505ms
   ✓ orq versao > com ORQ_KIT apontando para um kit, COMPARA e diz que difere 369ms
   ✓ orq versao > ORQ_KIT que não é kit: avisa e não finge que comparou 374ms
   ✓ orq config > config do fixture (limpo): rc 0 e diz que está preenchido 728ms
   ✓ orq config > placeholder <...> em qualquer valor: rc 1 e a mensagem NOMEIA a chave 790ms
   ✓ orq config > placeholder DENTRO de lista também é pego 585ms
   ✓ orq config > prosa que MENCIONA <ASSIM> não é placeholder (o valor tem de SER um) 648ms
   ✓ orq config > chave obrigatória ausente: rc 1, e a mensagem diz de ONDE ela é lida 676ms
   ✓ orq config > launchd.label ausente: rc 1 (é a chave que não pode ter default) 539ms
   ✓ orq config > gate sem papel inferível e sem "papel" declarado: rc 1 e a mensagem diz o nome 647ms
   ✓ orq config > o MESMO gate com "papel" declarado passa 749ms
   ✓ orq config > gate sem "nome": rc 1 e diz o índice 672ms
   ✓ orq config > config ilegível: rc 1, e não finge que leu 674ms
   ✓ orq config > config real e ANTIGO (snapshot @711ab5e): acusa launchd.label ausente 665ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 1020ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 27802ms
   ✓ v2 — `tokens[]` de OBJETOS resolve dependência > o ticket que depende dele fica PROCESSÁVEL 360ms
   ✓ v2 — `tokens[]` de OBJETOS resolve dependência > objeto de OUTRO token continua não resolvendo 315ms
   ✓ v2 — `tokens[]` de OBJETOS resolve dependência > objeto sem campo `token` é ignorado, não resolve tudo 367ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 1711ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > o ticket fica PROCESSÁVEL (antes: pendente para sempre, sem uma linha de log) 523ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > grava AVISO nomeando a forma legada e o comando que a migra 378ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > token que o arquivo não tem continua não resolvendo 384ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > token que só existe em `liberadas[]` resolve (campo `em`, sem prefixo) 347ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > token que só existe em `tokens[]` resolve 488ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > token nas DUAS listas resolve uma vez só, sem erro 335ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 16917ms
   ✓ um arquivo que MISTURA as formas resolve a UNIÃO > resolve humano:d-4 394ms
   ✓ um arquivo que MISTURA as formas resolve a UNIÃO > resolve humano:e-5 326ms
   ✓ um arquivo que MISTURA as formas resolve a UNIÃO > não resolve o que não está em forma nenhuma 345ms
   ✓ um arquivo que MISTURA as formas resolve a UNIÃO > a comparação ignora o prefixo dos DOIS lados: dep sem prefixo casa token com prefixo 352ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 2111ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 4472ms
   ✓ datadorGit contra um repo de verdade, com dois commits > cada token recebe a data e o autor do commit que o INTRODUZIU 726ms
   ✓ datadorGit contra um repo de verdade, com dois commits > token que nunca esteve no arquivo devolve null — nada é inventado 606ms
   ✓ datadorGit contra um repo de verdade, com dois commits > o token é procurado SEM o prefixo `humano:` (o Actus grava sem ele) 582ms
   ✓ datadorGit contra um repo de verdade, com dois commits > a data do MAIS VELHO vence: mexer na linha depois não redata o token 787ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > o v2 gravado sai datado, e o relatório diz quantos 769ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > rodar de novo é no-op: já datado, nada muda 914ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 10749ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > a trilha diz o que os gates disseram, e build sai como nao-configurado 1092ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 1202ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate CONFIGURADO que não chegou a rodar continua nao-rodou 1184ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 1318ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 1205ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 1213ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 1020ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 1264ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 1248ms
 ✓ test/orquestrador-migrar-config.test.ts (48 tests) 59957ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 2136ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 1530ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 1306ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 1298ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 1470ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 1440ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 2956ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 1390ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 1466ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 1666ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 1481ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 1118ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 11167ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 8040ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 9767ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 8335ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 1306ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 1485ms
 ✓ test/orquestrador-pacotes.test.ts (8 tests) 5632ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > pacote único: só a raiz 693ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > árvore do CI simulada: os 9 pacotes, na ordem do código antigo 755ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules ANINHADO não vira pacote 500ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules da raiz como SYMLINK para diretório de fora: é pacote, e a worktree ganha o link 1223ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules como symlink QUEBRADO não é pacote: lista vazia 618ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > diretório sem node_modules próprio fica de fora 564ms
   ✓ limpa_cache_vite purga o .vite de todo pacote detectado > apaga na raiz E nos pacotes aninhados, e não toca no resto 588ms
   ✓ a lista de pacotes é a MESMA que o linkador de worktree usa > linka node_modules de cada pacote detectado dentro da worktree 690ms
 ✓ test/orquestrador-gates-fonte-unica.test.ts (8 tests) 6485ms
   ✓ 626 (a): gates.ts executa na worktree e lê o config da main > config da main com typecheck + typecheck_scripts e worktree só com typecheck: os DOIS rodam; a linha GATE sai typecheck=ok 1636ms
   ✓ 626 (a): gates.ts executa na worktree e lê o config da main > sem --config o gates.ts falha alto: nunca cai no config da worktree 491ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (b) typecheck ok e typecheck_scripts ausente do gates.txt: typecheck=ok e gates_ausentes=typecheck_scripts na linha GATE e no STATUS.md 746ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (c) gate que rodou e falhou continua dando falha, mesmo com o outro do papel ok 874ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (d) papel sem nenhum gate executado continua nao-rodou 851ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (e) sem ausentes a linha GATE é byte a byte a de hoje, com typecheck=ok testes=ok build=ok 737ms
   ✓ 626: gates_ausentes no STATUS.md > STATUS.md: status_set com gates_ausentes preenchido imprime a linha 436ms
   ✓ 626: gates_ausentes no STATUS.md > STATUS.md: gates_ausentes vazio não imprime a linha, e ESTADO e TICKET continuam no mesmo render 711ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 16716ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 851ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 938ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > STATUS.md fica ocioso com MOTIVO pausado 867ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > a trilha registra a drenagem pausada, com par início/fim 966ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 994ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 1871ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o sentinela legado (.orq-pause) continua pausando 880ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 2342ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 2766ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 901ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 852ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 872ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 791ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 814ms
 ✓ test/orquestrador-sub-repeticao.test.ts (16 tests) 34ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 35ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 33ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 4036ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2711ms
   ✓ o que NÃO mudou > sourced (EXECUTOR_SOURCED=1) NÃO arma trap nenhum: o teste vermelho não vira morte 340ms
   ✓ o que NÃO mudou > desfecho nomeado continua sem virar EXECUTOR_MORREU no EXIT 322ms
   ✓ o que NÃO mudou > saída rc!=0 sem sinal continua registrando, sem campo `sinal` 654ms
 ✓ test/orquestrador-triador-fixture.test.ts (9 tests) 1160ms
   ✓ fixture triador-7f (peça 1) > cabe em 3 MB e não carrega segredo sem máscara 670ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 1932ms
   ✓ os TRÊS leitores dão a MESMA resposta: o primeiro bloco > os três concordam campo a campo 304ms
   ✓ a migração deixa de PULAR o ticket com dois blocos > o ticket migrado continua sendo lido igual pelos três 301ms
   ✓ ticket_set reescreve SÓ o primeiro bloco > trocar o status não duplica nem toca o bloco da prosa 683ms
   ✓ o caso de UM bloco só — os 517 tickets do disco — não muda > os três leitores seguem concordando 338ms
 ✓ test/orquestrador-arquivo-solto.test.ts (6 tests) 55484ms
   ✓ 631: arquivo solto > sequência do 513: agente commita a.ts e deixa diag-tmp.txt solto -> reprovado/arquivo_solto com retry e o nome no diagnóstico 7460ms
   ✓ 631: arquivo solto > contra-teste: o agente COMMITA diag-tmp.txt ele mesmo -> refatiar por enforcement 6511ms
   ✓ 631: arquivo solto > contra-teste: arquivo solto que casa zona proibida -> refatiar 7459ms
   ✓ 631: arquivo solto > contra-teste: um solto mais um commitado fora da allowlist (violação mista) -> refatiar 7201ms
   ✓ 631: arquivo solto > contra-teste: nenhum commit do agente e tudo solto dentro da allowlist -> "saiu sem commitar" e sem violação 7090ms
   ✓ 631: arquivo solto > drive_ticket: o retry do arquivo_solto reaproveita a worktree, mantém o modelo e aprova quando o agente remove o arquivo 19759ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 13458ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando DENTRO do timeout não está congelado 910ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 907ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 960ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 1188ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 1118ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 1011ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 1457ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > sem lock e sem STATUS congelado => segue 1272ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 1096ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 1494ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 1034ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 1008ms
 ✓ test/orquestrador-base-vermelha.test.ts (4 tests) 47888ms
   ✓ 632: base vermelha > sequência do 510c: FAIL só no 0283 bloqueia com base_vermelha, sem juiz, sem retry e sem consumir tentativa 10627ms
   ✓ 632: base vermelha > contra-teste: FAIL num arquivo DA allowlist segue o caminho de hoje (REPROVADO criterio_qualidade, sem base_vermelha) 12300ms
   ✓ 632: base vermelha > contra-teste: typecheck reprovado junto segue o caminho de hoje, sem base_vermelha 11332ms
   ✓ 632: base vermelha > contra-teste: saída de testes sem linha FAIL reconhecível segue o caminho de hoje 13628ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 13ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 73467ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 23844ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 850ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 740ms
   ✓ o fallback em arquivo é escrito SEMPRE > a linha do arquivo tem timestamp, título e corpo 433ms
   ✓ o fallback em arquivo é escrito SEMPRE > anexa: duas drenagens, duas linhas (é histórico, não snapshot) 675ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 917ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 1361ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 789ms
   ✓ o canal é decisão de config > canal diferente do nativo: nem tenta o osascript, e o arquivo vale 318ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 1719ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 3159ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 12931ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 6354ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 3351ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 2642ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 2380ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 3200ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 4658ms
   ✓ saída sem drenagem NUNCA notifica > lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log 991ms
   ✓ deve_notificar: a regra, isolada > processou ≥ 1: notifica, qualquer que seja o motivo do fim 913ms
   ✓ deve_notificar: a regra, isolada > zero processados por pausa, cooldown ou sem progresso: cala sempre 898ms
   ✓ deve_notificar: a regra, isolada > o motivo de fila vazia é a MESMA constante que o loop grava 340ms
 ✓ test/orquestrador-criterio-merito.test.ts (5 tests) 1143ms
   ✓ 625: run_criterios separa o comando que não executou do critério que reprovou > rc 127 (não encontrado) e rc 126 (não executável) entram na lista; reprovação comum não entra 1083ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 1256ms
 ✓ test/orquestrador-triador-aceite.test.ts (5 tests | 1 skipped) 1847ms
   ✓ aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada) 764ms
   ✓ aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois) 328ms
   ✓ aceite do triador (spec 7f-a §7.2) > (controle) nenhum dos 20 done sai firme, nos dois instantes 478ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 2703ms
   ✓ uma_linha: o escape que faltava > escapa \n, \r e \t como dois caracteres 302ms
   ✓ PERMISSAO_NEGADA com o comando multi-linha REAL do 234 > o evento sai em UMA linha, com \n literal e no máximo 160 caracteres de comando 506ms
   ✓ PERMISSAO_NEGADA com o comando multi-linha REAL do 234 > a trilha inteira continua 100% timestampada depois do evento 464ms
   ✓ o escape vale para QUALQUER evento, não só PERMISSAO_NEGADA > valor multi-linha em evento arbitrário sai numa linha só 571ms
   ✓ o escape vale para QUALQUER evento, não só PERMISSAO_NEGADA > o próprio EVENTO e o ID também são escapados (nada monta linha pelo cabeçalho) 365ms
 ✓ test/orquestrador-fila-json-quebrado.test.ts (6 tests) 6119ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes sai com rc != 0 citando o arquivo e o erro; sem o quebrado, rc 0 1261ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes pega o quebrado mesmo com status done no arquivo 691ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > STATUS mostra a fila corrompida, o placar conta os válidos e o seletor devolve o 902 1438ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > bloco ```json vazio conta como corrompido (jq empty com entrada vazia sai 0) 587ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila sem ticket quebrado: nenhuma linha de corrompida e placar sem corrompido 1091ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila vazia continua "sem ticket" no placar e no STATUS 1049ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 94ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 124ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 5179ms
   ✓ reparo sobre a trilha real quebrada > 100% das linhas passam a começar com timestamp 590ms
   ✓ reparo sobre a trilha real quebrada > o número de eventos é o mesmo de antes (contagem tirada imediatamente antes) 452ms
   ✓ reparo sobre a trilha real quebrada > conteúdo preservado BYTE A BYTE: desfazer o escape devolve o original 572ms
   ✓ reparo sobre a trilha real quebrada > o reparo se registra na trilha, como ANOTACAO 452ms
   ✓ reparo sobre a trilha real quebrada > guarda a cópia crua do ANTES, para a preservação ser conferível depois 511ms
   ✓ uma vez só, e por construção > a segunda passagem é no-op: não escreve, não anota 1151ms
   ✓ recusa em vez de inventar > arquivo que COMEÇA com linha órfã não é tocado (rc=2) 456ms
   ✓ recusa em vez de inventar > trilha já sã sai 0 sem tocar em nada 458ms
   ✓ a trilha reparada é legível pelas ferramentas que a liam errado > `grep PERMISSAO_NEGADA` acha os eventos, e não os heredocs deles 532ms
 ✓ test/orquestrador-ambiente-merito.test.ts (6 tests) 12ms
 ✓ test/orquestrador-gate-vitest-aviso.test.ts (27 tests) 1233ms
   ✓ (a) saída textual do vitest reprova > entra no validar como aviso do critério (regra 6v) 429ms
   ✓ (b) caminho do objetivo fora da allowlist avisa > o 488 antes do refatiamento (fixture 903) dispara o aviso, e o aviso NÃO é violação 532ms
 ✓ test/orquestrador-gate-grep-q.test.ts (19 tests) 469ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 6324ms
   ✓ liberacao_ok lê .tokens[] com o token INTEIRO > token presente em .tokens => ticket PROCESSÁVEL 342ms
   ✓ liberacao_ok lê .tokens[] com o token INTEIRO > token ausente => ticket NÃO processável, com o motivo no log 419ms
   ✓ liberacao_ok lê .tokens[] com o token INTEIRO > arquivo de liberações vazio => não processável 412ms
   ✓ liberacao_ok lê .tokens[] com o token INTEIRO > K8b-1: token SEM o prefixo em .tokens resolve, com aviso de forma legada 659ms
   ✓ formato antigo (.liberadas[].token) aceito por UMA versão, com aviso > resolve a dependência 548ms
   ✓ formato antigo (.liberadas[].token) aceito por UMA versão, com aviso > grava AVISO nomeando a forma legada e a migração 545ms
   ✓ formato antigo (.liberadas[].token) aceito por UMA versão, com aviso > formato antigo com outro token não resolve 458ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 2433ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 491ms
 ✓ test/orq-pausa-trilha.test.ts (8 tests) 4727ms
   ✓ orq pausar grava PAUSA na trilha > uma linha, id ---, motivo em token e por=terminal 635ms
   ✓ orq pausar grava PAUSA na trilha > sem motivo: o motivo padrão vira token 552ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > RETOMADA por=terminal dur=<N>min, depois da PAUSA 1116ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > imprime quem, quando e o motivo ANTES do RETOMADO 973ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > pausa feita pelo painel: o retomar do terminal diz "painel" e conta a duração da PAUSA 450ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > PAUSAR criado à mão, sem PAUSA na trilha: diz que não há registro e conta pelo conteúdo 405ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > retomar sem pausa não grava nada 356ms
stdout | test/orquestrador-gate-corpus.test.ts > 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova

MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
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


 ✓ test/orquestrador-gate-corpus.test.ts (2 tests) 25493ms
   ✓ 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 25486ms
 ✓ test/orquestrador-isolamento-teste.test.ts (26 tests) 35310ms
   ✓ ORQ_TESTE=1 recusa escrita fora do fixture > event fora de ORQ_EXEC_ROOT não chega à trilha real, e diz por quê 329ms
   ✓ ORQ_TESTE=1 recusa escrita fora do fixture > DENTRO do fixture a mesma chamada grava normalmente — a guarda não cega o teste 319ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 33317ms
 ✓ test/orquestrador-prompt-evidencia.test.ts (6 tests) 4473ms
   ✓ 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 4469ms
 ✓ test/orquestrador-retry-feedback-juiz.test.ts (3 tests) 48613ms
   ✓ 623 (a): o motivo do juiz chega ao prompt de retry > juiz reprova com o mecânico verde: o retry traz gate juiz, o motivo LITERAL e os criterios_falhos do juiz 18996ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > segunda tentativa com diff.patch idêntico: bloqueado por retry_sem_mudanca, juiz chamado UMA vez 17138ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > contra-teste: segunda tentativa com diff DIFERENTE chama o juiz de novo (contador = 2) 12478ms
 ✓ test/orquestrador-teto-adiamento-ambiente.test.ts (5 tests) 52850ms
   ✓ teto de adiamento por ambiente > 3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota 16189ms
   ✓ teto de adiamento por ambiente > reprovação no meio quebra a sequência (o contador zera) 15802ms
   ✓ teto de adiamento por ambiente > adiamento por OUTRA causa não conta nem zera 8255ms
   ✓ teto de adiamento por ambiente > passar de fase zera: aprovado leva a aguardando_merge sem contador 5375ms
   ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 7228ms

 Test Files  72 passed (72)
      Tests  1432 passed | 1 todo (1433)
   Start at  21:57:05
   Duration  120.20s (transform 4.97s, setup 0ms, collect 59.11s, tests 803.35s, environment 65ms, prepare 10.87s)

vitest rc=0
```

### f-test-shell
```
[fixture] tmp: /tmp/orq-fixture-njfGkA
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-njfGkA/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-njfGkA/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-njfGkA/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-njfGkA/repo
  CONFIG         = /private/tmp/orq-fixture-njfGkA/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap bate com o arquivo (600)
  ok   diff_cap é inteiro positivo

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  - falha de ambiente da worktree
  ok   8 causas declaradas
  ok   a causa de ambiente da worktree está declarada
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-njfGkA/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (388b3f7f)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

== mark_adiado: cooldown global só para limite real de conta (Actus 9e109cb) ==
  ok    tsx do checkout: /private/tmp/orq-fixture-njfGkA/repo/node_modules/.bin/tsx
  ok    causa 'ambiente' (arma=nao) => cooldown global NÃO armado
  ok    causa 'juiz_ilegivel' (arma=nao) => cooldown global NÃO armado
  ok    causa 'timeout' (arma=nao) => cooldown global NÃO armado
  ok    causa 'rate_limit' (arma=sim) => cooldown global ARMADO
  ok    causa 'quota' (arma=sim) => cooldown global ARMADO

== drenar: 1º ADIADO por 'ambiente' => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (922) foi executado
  ok    nenhum cooldown global armado
  ok    o adiado (921) roda UMA vez só nesta drenagem
  ok    922 terminou done

== drenar: 1º adiado por orcamento_ticket => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (932) foi executado
  ok    931 não foi ao executor

== drenar: executor adia por orcamento_ticket POR DENTRO => o 2º roda (Actus 9e109cb) ==
  ok    o 2º ticket (942) foi executado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20261010T215939Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-10-10 18:59:49-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-10 18:59:50-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-10 18:59:50-0300] ticket 902 (3 processáveis)
  | [2026-10-10 18:59:51-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-10-10 18:59:51-0300] ticket 903 (3 processáveis)
  | [2026-10-10 18:59:52-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-10-10 18:59:52-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-10-10 18:59:52-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-10-10T18:59:52-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-10-10 18:59:54-0300 e 2026-10-10 18:59:56-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-10-10T19:00:10-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-10-10 19:00:10
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  f44ad97 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-10-10T19:00:12-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-10-10T19:00:13-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:19:30
  ok    250: cooldown até 19:30
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 19:30

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 19:00:17-0300 e 2026-10-10 19:00:17-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 19:00:18-0300 e 2026-10-10 19:00:18-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 19:00:20-0300 e 2026-10-10 19:00:20-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 19:00:22-0300 e 2026-10-10 19:00:22-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-10-10T19:00:30-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-10-10T19:00:47-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

== 5. causa 'ambiente' em dois tickets: a absolvição não deixa o teto de 3 avançar ==
  --- disparo 11 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 12 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 13 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 14 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  ok    1 AMBIENTE em cada um dos 4 disparos
  ok    evento com 908,909 e o \n literal na causa
  ok    908 e 909 seguem pendentes (teto de 3 não atingido)
  ok    adiamentos_ambiente em 0 e ticket pendente depois de CADA disparo
  ok    trilha: 8 AMBIENTE_ADIAMENTO_DESFEITO (2 por disparo)
  ok    o evento diz de quanto para quanto
  ok    desfazer commitado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=1s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=0s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.QROu8RgDWD/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-10-10T19:01:43-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=0s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 0s, abaixo do limite de 30s: morto por fora) em 2026-10-10T22:01:54Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=6.40, núcleos=10)
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=1c99bf45
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=e9550a1b
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=54532082
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=8c21cea5
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=8c21cea5
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-10-10T19:03:10-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-10-10T19:03:16-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=7.33, núcleos=10)
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=4303ec94
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

--- test-painel-visao.sh ---
== 0. pendentes_razoes: a régua do OCIOSO, com o processável dito 'pronto' ==
  ok    531 pronto
  ok    601 espera 600
  ok    ocioso_razoes segue com rc 1 quando há processável

== 1. o estado sai do painel, lido só do contrato ==
  ok    painel --estado sai 0
  ok    3 repos, na ordem do repos.json

== 2. Precisa de você: tokens ordenados por quantos pendentes destravam ==
  ok    1º item: humano:cred-evo
  ok    cred-evo destrava 3 (600, e 601 e 602 atrás dele)
  ok    tickets destravados por cred-evo
  ok    2º item: humano:grupo-wa destrava 1
  ok    o item diz de qual repo é

== 3. estado em linguagem direta, com tempo ==
  ok    alfa: tipo
  ok    alfa: frase
  ok    alfa: tentativa e último resultado
  ok    beta: tipo
  ok    beta: frase
  ok    beta: o motivo da pausa
  ok    gama: tipo
  ok    gama: frase
  ok    gama: por que não pega
  ok    cada estado tem rótulo em texto, não só cor

== 4. o dia: aprovados contra reprovas (ontem não conta) ==
  ok    alfa: 2 aprovados, 2 reprovas
  ok    alfa: contagem da fila

== 5. próximos: os 3 primeiros da fila, com título ==
  ok    ids na ordem do loop
  ok    com título
  ok    e mais 1

== 6. bloqueados: categoria de motivo e sub, nunca da prosa ==
  ok    700 (repeticao sub=gate_testes) é teste
  ok    701 (criterio_qualidade, último sub=juiz) é juiz, apesar de 'fora_do_pathspec' na nota
  ok    702 (bloqueado sem BLOQUEADO na trilha) é decisão sua
  ok    243 (adiamentos) é ambiente
  ok    primeira linha do motivo
  ok    o resto fica para o clique
  ok    4 bloqueados nos 3 repos, cada um com o repo

== 7. nenhum ramo por nome de repo ==
  ok    o mesmo repo com outro nome dá o mesmo estado
  ok    orq-painel.py não cita nome de repo
  ok    orq-painel.py não lê meta.json nem log livre

== 8. repos.json ausente: a tela diz o que falta, não quebra ==
  ok    repos_erro nomeia o arquivo

== 9. a página: atualiza a cada 15 s e tem as seções ==
  ok    página contém 'Precisa de você'
  ok    página contém 'Bloqueados'
  ok    página contém '/api/estado'
  ok    página contém '15000'

== 10. razões que não se apuram: a faixa diz quem ficou fora da conta (K12-G) ==
  ok    os tokens do alfa continuam na faixa
  ok    a faixa diz qual repo ficou fora da conta
  ok    e por quê
  ok    timeout: nenhum token apurado
  ok    timeout: os dois repos fora da conta
  ok    o erro diz o tempo e quantos pendentes
  ok    o cartão mostra o erro
  ok    sem razões, prontos é desconhecido, não zero
  ok    gama ocioso sem razões: o cartão não diz 'sem ticket para pegar'
  ok    alfa segue rodando: isso vem do STATUS, não das razões
  ok    a página tem a frase de quem ficou fora

== 11. motivo longo: primeira frase ou 160 caracteres, o resto no clique (K12-H) ==
  ok    243: a primeira frase
  ok    243: o texto inteiro fica para o clique
  ok    244 sem ponto: cortado em até 160 caracteres mais '…' (160)
  ok    o corte avisa com '…'
  ok    o corte cai entre palavras
  ok    700 (motivo curto em duas linhas) segue igual
  ok    a página abre o texto inteiro no clique

== 12. bloqueados: filtro por repo, junto com o de categoria (K12-I) ==
  ok    contagem por repo, na ordem do repos.json, com o zero
  ok    sem filtro: todos os bloqueados
  ok    chip de repo sem bloqueado fica, desabilitado
  ok    e mostra o 0
  ok    clique em gama: só o 243
  ok    clique em alfa: os 3 do alfa
  ok    alfa + categoria teste: os dois filtros juntos
  ok    a atualização de 15 s mantém repo e categoria

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 8 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-visao.sh) = 0

--- test-painel-detalhe.sh ---
  ok    painel --estado sai 0

== 1. os 6 indicadores ==
  ok    tempo por ticket: média, mediana, pior (s)
  ok    aprovação na 1ª: 2 de 3, 67%
  ok    tentativas por aprovação: 5 inícios / 3 aprovações
  ok    fila estimada: 2 prontos × 980 s de execução por aprovação
  ok    ociosidade hoje: 12h menos 49 min em execução, 2h delas pausado
  ok    última promoção: sem dado, com o motivo
  ok    última promoção diz por que não tem dado
  ok    custo do dia (custo.json), só hoje

== 2. sem aprovação no dia, os indicadores dizem 'sem dado' em vez de zero ==
  ok    tempo_ticket: sem dado (nenhuma aprovação hoje)
  ok    primeira: sem dado (nenhuma aprovação hoje)
  ok    tentativas_por_aprovacao: sem dado (nenhuma aprovação hoje)
  ok    fila_estimada: sem dado (nenhuma aprovação hoje, sem ritmo)

== 3. bloqueados: categoria, motivo, allowlist, parado há, tentativas ==
  ok    820: enforcement
  ok    820: parado há 30 min
  ok    820: tentativas do BLOQUEADO (sem campo no ticket)
  ok    820: onde mexe

== 4. prontos: o que muda em uma frase, onde mexe, quantos destravam ==
  ok    prontos na ordem do loop
  ok    810: a primeira frase do objetivo
  ok    810: onde mexe
  ok    810 destrava 1 (o 812), 811 nenhum

== 5. hora a hora: aprovado, reprova, parado ==
  ok    9h: 1 aprovado, 1 reprova, 28 min em execução, 32 parado
  ok    10h: 2 aprovados, 16 min em execução
  ok    3h: parado a hora inteira
  ok    horas até agora (0 a 12)

== 6. arquivos mais disputados entre os pendentes ==
  ok    top 3

== 7. a página tem a vista de detalhe ==
  ok    página contém 'function detalhe'
  ok    página contém 'Hoje, hora a hora'
  ok    página contém 'Arquivos mais disputados'
  ok    página contém 'Prontos'
  ok    página contém 'sem dado'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 2 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-detalhe.sh) = 0

--- test-painel-pausa.sh ---
  servidor em http://127.0.0.1:63531
== 1. pausar: cria o PAUSAR do contrato e grava PAUSA na trilha ==
  ok    HTTP 200
  ok    docs/fila/PAUSAR criado
  ok    conteúdo no formato do §7: <AAAA-MM-DD HH:MM> | motivo
  ok    trilha: 2026-10-10T19:03:41-0300 --- PAUSA motivo=leva-da-tarde por=painel
  ok    a resposta explica que para ENTRE tickets
  ok    .orq-pause nunca é escrito
  ok    nada mais mudou no repo

== 2. pausar de novo: recusa, sem segunda linha ==
  ok    HTTP 409
  ok    sem PAUSA duplicada

== 3. o estado diz o que cada botão pode e por quê ==
  ok    rho: pausar desabilitado
  ok    rho: retomar habilitado
  ok    rho: disparo desabilitado (ticket em curso)
  ok    o motivo do disparo desabilitado está escrito
  ok    sem ação 'pausar agora'

== 4. retomar: apaga o PAUSAR e grava RETOMADA com a duração ==
  ok    HTTP 200
  ok    PAUSAR apagado
  ok    trilha: 2026-10-10T19:03:41-0300 --- RETOMADA por=painel dur=0min
  ok    nada mais mudou no repo
  ok    retomar sem pausa: 409

== 4b. quem pausou: painel e terminal gravam a mesma linha, e o painel diz quem foi (K12-F) ==
  ok    pausa pelo painel: o cartão diz 'pausado pelo painel'
  ok    retomar pelo painel diz quem pausou e por quê
  ok    pausa pelo terminal: o cartão diz 'pausado pelo terminal'
  ok    PAUSA do terminal e do painel no mesmo formato

== 5. legado .orq-pause: lido, nunca escrito nem apagado ==
  ok    sigma aparece pausado
  ok    sigma: retomar desabilitado
  ok    o motivo nomeia o .orq-pause
  ok    POST retomar no legado: 409
  ok    .orq-pause intacto
  ok    sigma continua sem PAUSAR

== 6. disparo: só com STATUS ocioso, e sem -k ==
  ok    com ticket em curso: 409
  ok    launchctl kickstart não chamado
  ok    ocioso: 200
  ok    kickstart gui/<uid>/<label do config>, sem -k

== 7. o resto é recusado ==
  ok    ação fora da allowlist: 403
  ok    repo desconhecido: 400
  ok    Host estranho: 403

== 8. a página: Pausar e Retomar, e o que a pausa faz ==
  ok    página contém 'Pausar'
  ok    página contém 'Retomar'
  ok    página contém 'ENTRE tickets'
  ok    página contém 'nada é interrompido'
  ok    sem 'Pausar agora'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 31 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-pausa.sh) = 0

--- test-painel-alarmes.sh ---
== 1. launchd_exit: last exit code != 0 ==
  ok    rc 127 com trilha recente: o job org.fixture.a1 saiu com rc 127 no último disparo (launchctl print: last exit code)
  ok    o card diz travado
  ok    rc 0 e drenagem dentro da janela: silêncio
  ok    job NÃO carregado (desagendado de propósito): silêncio

== 2. mudo: nenhum DRENAGEM_INICIO há mais de 2x o start_interval ==
  ok    DRENAGEM_INICIO de 3x o start_interval atrás: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    e diz o intervalo do job: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    o card diz travado
  ok    DRENAGEM_INICIO dentro de 2x o start_interval: silêncio
  ok    velho, mas job descarregado: silêncio
  ok    trilha sem nenhum DRENAGEM_INICIO, job carregado: nenhum DRENAGEM_INICIO na trilha, com o job org.fixture.a2d carregado (dispara a cada 30 min)

== 3. pausa_furada: PAUSAR de pé e a drenagem seguiu depois dele ==
  ok    DRENAGEM_INICIO sem motivo=pausado depois da PAUSA: a drenagem seguiu depois da pausa: DRENAGEM_INICIO às 11:40, com o PAUSAR de pé desde 11:29
  ok    pausa respeitada (motivo=pausado) e retry do 530, que já corria: sem pausa_furada
  ok    INICIO de OUTRO ticket depois da pausa: a drenagem seguiu depois da pausa: INICIO do 531 às 11:50, com o PAUSAR de pé desde 11:29

== 4. pausa_longa: PAUSAR há mais de 40 min ==
  ok    41 min: pausado há 41 min, mais de 40 min: motivo "madrugada"
  ok    39 min: silêncio

== 5. execucao_longa: além do timeout do config mais a margem ==
  ok    41 min com timeout de 30 e margem de 10: o 530 está em execução há 41 min; o timeout é 30 min (+10 min de margem para gates e juiz)
  ok    o card diz travado
  ok    30 min, dentro do timeout mais a margem: silêncio

== 6. todo alarme é texto, e o que falta no config vira 'sem dado' ==
  ok    sem dado: mudo: sem launchd.start_interval no config | execução longa: sem claude_timeout_secs no config
  ok    a página mostra o texto do alarme

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 19 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-alarmes.sh) = 0

--- test-painel-lento.sh ---
  servidor em http://127.0.0.1:63552
== 1. duas chamadas seguidas respondem abaixo de 1 s ==
  ok    1ª chamada em 0.978911s
  ok    2ª chamada em 0.000831s

== 2. o repo rápido vem completo; o lento vem marcado ==
  ok    rápido: razões apuradas
  ok    rápido: 1 pronto
  ok    rápido: o token dele está na faixa
  ok    lento: apurando
  ok    lento: o cartão diz que está apurando
  ok    lento: fora da conta da faixa, e dito

== 3. depois do timeout: sem apurar, com a hora da última tentativa, e o processo morto ==
  ok    lento: sem apurar
  ok    última tentativa às 19:03
  ok    o cartão diz a última tentativa
  ok    recuo de 1 min: próxima em 57s
  ok    o processo do lento morreu no timeout
  ok    rápido segue completo

== 4. no recuo, nada de tentar de novo a cada chamada ==
  ok    uma tentativa só

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 6 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-lento.sh) = 0

--- test-gate-prevoo.sh ---
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)

== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)

== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado

== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou

== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação

== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente

== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido

== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903

== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  ok    UM GATE_TICKET_AVISO na trilha em dois disparos
  ok    o evento carrega o hash da versão
  ok    o 901 editado é versão nova: segundo GATE_TICKET_AVISO

TODOS OS CHECKS PASSARAM

rc(test-gate-prevoo.sh) = 0

--- test-tentativas-persistidas.sh ---
== 1 · drenagem 1: reprovado + adiado(ambiente) -> tentativas = 1 ==
  ok    drenagem 1 começa em attempt=0 (ticket sem campo = 0)
  ok    depois de reprovado+adiado: tentativas=1 no arquivo
  ok    o adiamento devolve o ticket a pendente

== 3 · crash no meio da tentativa: o contador já está no arquivo ==
  ok    a tentativa foi persistida ANTES de rodar (o agente já via tentativas=1)
  ok    depois do crash: tentativas=1 (a tentativa morta conta)

== 4 · aprovado não consome; done zera ==
  ok    reprovado+aprovado: tentativas=1 (o aprovado não soma)
  ok    local-loop.sh zera tentativas junto com o status done

TODOS OS CHECKS PASSARAM

rc(test-tentativas-persistidas.sh) = 0

--- test-orq-pause.sh ---
== 1 · as duas sentinelas presentes: --status lista as duas ==
    PAUSADA: docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar
    PAUSADA: docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   duas linhas PAUSADA
  ok   PAUSAR com caminho e conteúdo
  ok   .orq-pause com caminho e conteúdo
== 4 · pausa_motivo devolve caminho + conteúdo das duas ==
    docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar; docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   pausa_motivo nomeia as duas
== 2 · --off remove as duas e pausa_ativa fica falso ==
    removida: docs/fila/PAUSAR
    removida: docs/fila/.orq-pause
    fila RETOMADA (2 sentinela(s) removida(s))
  ok   diz que removeu PAUSAR
  ok   diz que removeu .orq-pause
  ok   os dois arquivos sumiram
  ok   pausa_ativa falso
== 3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR ==
  ok   pausado por PAUSAR antes do --off
    removida: docs/fila/PAUSAR
    fila RETOMADA (1 sentinela(s) removida(s))
  ok   PAUSAR removido
  ok   conta uma removida
  ok   pausa_ativa falso
== 5 · nenhuma presente ==
  ok   --status: ativa (sem pausa)
  ok   --off não inventa remoção
  ok   nenhuma linha 'removida:'
== 6 · local-loop pausado: o STATUS nomeia a sentinela ==
    ESTADO   ocioso
    MOTIVO   pausado (docs/fila/PAUSAR: 2026-09-24 12:00 | pausa do teste)
  ok   MOTIVO com a sentinela e o conteúdo
== 7 · (kit, K12-F) pausar e retomar pelo orq-pause.sh gravam PAUSA e RETOMADA na trilha ==
  ok   PAUSA por=terminal na trilha
  ok   RETOMADA por=terminal na trilha

TODOS OK

rc(test-orq-pause.sh) = 0

--- test-preflight.sh ---
== 1 · papel em PENDENTE_* aborta (ROOT sintético, zero gasto) ==
  ok    abortou (rc=1)
  ok    diz que é erro de config
  ok    diz que não consome tentativa
  ok    aponta o desbloqueio LIDO DO CONFIG
  ok    nomeia o papel pendente
  ok    nenhuma sondagem disparada
  ok    nada gravado no custo.json do fixture

== 1b · qualquer um dos três papéis pendente basta ==
  ok    executor_model pendente => aborta nomeando o papel
  ok    avaliador_model pendente => aborta nomeando o papel
  ok    retry_final_model pendente => aborta nomeando o papel

== 1c · INVARIANTE do config real: nenhum papel pendente hoje ==
  ok    executor_model definido (sonnet)
  ok    avaliador_model definido (opus)
  ok    retry_final_model definido (opus)

== 2 · id de modelo inexistente é RECUSADO pelo texto do CLI ==
  ok    recusa detectada: [claude-code:unrecognized_model] {"model":"m…
  ok    recusa detectada: There's an issue with the selected model (xy…
  ok    recusa detectada: "PENDENTE_TK104" is not a model this version…
  ok    resposta normal não é recusa

== 3 · o que NÃO aconteceu ==
  ok    nenhuma worktree criada (0 antes, 0 depois)
  ok    nenhum attempt gravado no fixture
  ok    cooldown NÃO armado (erro de config não é adiamento)

== 4 · fronteira: sondagem limitada ADIA, não aborta ==
  ok    429 real => adiável
  ok    conexão recusada real => adiável
  ok    saída vazia com rc!=0 => adiável (CLI não falou)
  ok    modelo recusado NÃO é adiável

== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto ==
  ok    veredito válido lido do envelope
  ok    prompt gravado (evidência, regra 8)
  ok    output CRU preservado
  ok    o critério avaliador chega ao prompt
  ok    allowlist com *.test.* liga o anti-afrouxamento
  ok    o juiz não recebe o prompt do executor
  ok    lixo => ILEGÍVEL (o executor adia, não reprova)
  ok    nenhum veredito inventado a partir de lixo
  ok    nada gravado em custo.json (nenhuma chamada paga)

TODOS OS CHECKS PASSARAM

rc(test-preflight.sh) = 0

--- test-diff-lines.sh ---
C. diff vazio
  ✓ diff vazio = 0
A. inserções + deleções
  ✓ DIFF_LINES = 15 (diff cru tem 50 linhas)
B. binário conta zero
  ✓ binário não soma (DIFF_LINES continua 15)

PASS=3 FAIL=0

rc(test-diff-lines.sh) = 0

--- test-sem-cor.sh ---
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI

== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  ok    gate 'test' aprovado com o placar lido por grep
  ok    critério: saída '1' (o placar casou)

TODOS OS CHECKS PASSARAM

rc(test-sem-cor.sh) = 0

--- test-fixture-gates.sh (kit) ---
[fixture] tmp: /tmp/orq-fixture-RgMz9s
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-RgMz9s/repo
== gates reais numa worktree do motor · fixture em /tmp/orq-fixture-RgMz9s/repo ==

Preparing worktree (new branch 'frente/teste-gates')
ok: a worktree tem node_modules (symlink -> /private/tmp/orq-fixture-RgMz9s/repo/./node_modules)

--- gates.txt ---
ok   typecheck               739ms
ok   test                  38859ms
VEREDITO: APROVADO
--- fim (rc=0) ---

ok: gates.ts rc=0
ok: VEREDITO: APROVADO
ok: gate typecheck
ok: gate test

test-fixture-gates: VERDE

rc(test-fixture-gates.sh) = 0

== placar ==
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
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
test-shell rc=0
```

### f-test-instalar
```
[fixture] tmp: /tmp/orq-fixture-Z8EN0e
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-Z8EN0e/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-fixture-Z8EN0e/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-ELPqyy/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-Y2O3kP/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-FlUXyk/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-FlUXyk/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-FlUXyk/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-FlUXyk/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-FlUXyk/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-FlUXyk/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-FlUXyk/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-sDKadA/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-sDKadA/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-sDKadA/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-St1eS9/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-St1eS9/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-St1eS9/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-St1eS9/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-HDGEDw/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-HDGEDw/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-HDGEDw/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-HDGEDw/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 5751ms
  | 
  |  Test Files  21 passed (21)
  |       Tests  186 passed (186)
  |    Start at  19:05:56
  |    Duration  37.46s (transform 551ms, setup 0ms, collect 12.75s, tests 154.65s, environment 11ms, prepare 1.71s)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-verificar-RNG3hw/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-RNG3hw/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-RNG3hw/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-RNG3hw/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | --- /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -32,7 +29,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -55,17 +51,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -74,7 +67,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -88,7 +80,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -97,31 +88,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json. test-lib-config.sh cobra só a forma (bate com o arquivo, inteiro positivo), não o número: o 2500 do Actus também passa.",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -143,7 +129,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -151,7 +136,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -160,7 +144,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -177,18 +160,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -207,7 +187,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -247,10 +226,11 @@
  |        "wget",
  |        "> ",
  |        ">>"
  | -    ]
  | +    ],
  | +    "modo_pre_voo": "aviso",
  | +    "severidade": {}
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -264,7 +244,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -273,7 +252,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-8iUMyw/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-RNG3hw/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-RNG3hw/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-RNG3hw/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | @@ -2,17 +2,14 @@
  | @@ -32,7 +29,6 @@
  | @@ -55,17 +51,14 @@
  | @@ -74,7 +67,6 @@
  | @@ -88,7 +80,6 @@
  | @@ -97,31 +88,26 @@
  | @@ -143,7 +129,6 @@
  | @@ -151,7 +136,6 @@
  | @@ -160,7 +144,6 @@
  | @@ -177,18 +160,15 @@
  | @@ -207,7 +187,6 @@
  | @@ -247,10 +226,11 @@
  | @@ -264,7 +244,6 @@
  | @@ -273,7 +252,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-RNG3hw/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-novo-4seTDH
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     20 teste(s) de harness e 7 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
  |            repo /private/tmp/orq-novo-4seTDH
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-4seTDH/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-4seTDH
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-bSqyMU' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
  ok    árvore idêntica antes e depois
-- (k4) com o tsx de volta, o --atualizar segue normalmente --
  ok    rc 0
  ok    nenhuma reclamação de tsx

== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit ==
  ok    28 test-*.sh vendorizados no fixture varridos
  ok    nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
test-instalar rc=0
```

### f-test-drenagem
```
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /Users/lucasantos/Projetos/orquestrador-kit, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (2894d9ff)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

== mark_adiado: cooldown global só para limite real de conta (Actus 9e109cb) ==
  ok    tsx do checkout: /Users/lucasantos/Projetos/orquestrador-kit/node_modules/.bin/tsx
  ok    causa 'ambiente' (arma=nao) => cooldown global NÃO armado
  ok    causa 'juiz_ilegivel' (arma=nao) => cooldown global NÃO armado
  ok    causa 'timeout' (arma=nao) => cooldown global NÃO armado
  ok    causa 'rate_limit' (arma=sim) => cooldown global ARMADO
  ok    causa 'quota' (arma=sim) => cooldown global ARMADO

== drenar: 1º ADIADO por 'ambiente' => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (922) foi executado
  ok    nenhum cooldown global armado
  ok    o adiado (921) roda UMA vez só nesta drenagem
  ok    922 terminou done

== drenar: 1º adiado por orcamento_ticket => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (932) foi executado
  ok    931 não foi ao executor

== drenar: executor adia por orcamento_ticket POR DENTRO => o 2º roda (Actus 9e109cb) ==
  ok    o 2º ticket (942) foi executado

TODOS OS CHECKS PASSARAM
test-drenagem rc=0
```

### f-test-ambiente
```
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-10-10T19:07:15-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-10-10T19:07:27-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

== 5. causa 'ambiente' em dois tickets: a absolvição não deixa o teto de 3 avançar ==
  --- disparo 11 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 12 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 13 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 14 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  ok    1 AMBIENTE em cada um dos 4 disparos
  ok    evento com 908,909 e o \n literal na causa
  ok    908 e 909 seguem pendentes (teto de 3 não atingido)
  ok    adiamentos_ambiente em 0 e ticket pendente depois de CADA disparo
  ok    trilha: 8 AMBIENTE_ADIAMENTO_DESFEITO (2 por disparo)
  ok    o evento diz de quanto para quanto
  ok    desfazer commitado

TODOS OS CHECKS PASSARAM
test-ambiente rc=0
```

### g-typecheck (depois da 7f-b1-8)
```
rc=0

```

### g-vitest (depois da 7f-b1-8)
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-etapa7f

 ✓ test/orquestrador-enforcement.test.ts (47 tests) 19ms
 ✓ test/orquestrador-prevoo.test.ts (35 tests) 8ms
 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 27ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 10ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 172ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1544ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 408ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3140ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 392ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 323ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 659ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 707ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 388ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 5363ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 430ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 439ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 471ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 521ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 1025ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 490ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 502ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 981ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 6228ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 368ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 383ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 416ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 387ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 802ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 427ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 364ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 368ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 459ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 763ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 365ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 457ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 5553ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 518ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 324ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 349ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 356ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 471ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 357ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 372ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 332ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 1085ms
 ✓ test/doutrina-v2.test.ts (30 tests) 11ms
 ✓ test/orq-cli.test.ts (42 tests) 6929ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 380ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 381ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 340ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 339ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 338ms
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 1828ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 596ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 8ms
 ✓ test/orquestrador-triador-modelo.test.ts (10 tests) 4946ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 1198ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga 2493ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 928ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 8245ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 375ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 376ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 387ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 381ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 1059ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 1038ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 1047ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 998ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 1028ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 981ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 569ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 7ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 673ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3080ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 485ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 507ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 324ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 574ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 461ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3735ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 888ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1544ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 879ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 385ms
 ✓ test/orquestrador-gate-comarka.test.ts (14 tests) 732ms
   ✓ 7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila > repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda 578ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 7ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 12049ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 331ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 417ms
   ✓ orcamento_veredito: ok | dia | ticket > teto por ticket atingido => ticket (e só para ESSE ticket) 317ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1645ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1553ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 380ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 847ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 791ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 837ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1496ms
 ✓ test/orquestrador-contexto-juiz-fixtures.test.ts (8 tests) 3319ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE 1151ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (b) helper definido no próprio diff não entra no bloco e aparece UMA vez; o de fora aparece no bloco, no MESMO prompt 1135ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (c) diff sem teste novo: nenhum bloco, prompt igual ao montado sem definições 1028ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1757ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 9ms
 ✓ test/orquestrador-contexto-juiz.test.ts (14 tests) 6135ms
   ✓ run_juiz com contexto_juiz > o critério cita um arquivo fora do diff: o material do juiz passa a conter esse arquivo, rotulado 1058ms
   ✓ run_juiz com contexto_juiz > o conteúdo é o da BASE da tentativa, não o da HEAD 1084ms
   ✓ run_juiz com contexto_juiz > arquivo acima do teto é truncado, e o truncamento está escrito no texto 1092ms
   ✓ run_juiz com contexto_juiz > caminho ausente na base falha ALTO: rc != 0, nome do caminho no log, juiz não roda 526ms
   ✓ run_juiz com contexto_juiz > ticket SEM contexto_juiz: nenhum bloco de referência 1052ms
   ✓ (d) gate-ticket valida contexto_juiz > não é lista de strings: violação 326ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 229ms
 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 916ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 9023ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 2822ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 368ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 434ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 589ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 512ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 536ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 587ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 509ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 2107ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 670ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > ticket só com avisos: rc 0, e --violacoes não imprime nada 541ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 5ms
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 205ms
 ✓ test/orq-versao-config.test.ts (16 tests) 3620ms
   ✓ orq config > config do fixture (limpo): rc 0 e diz que está preenchido 305ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 389ms
 ✓ test/orquestrador-gate-regex-exemplos.test.ts (11 tests) 1370ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (b) regex NOVO com os mesmos exemplos PASSA: zero violações e o ticket no relatório como OK 478ms
   ✓ 624 · falha alta > (f) /usr/bin/grep ausente: o gate NÃO passa, sai com rc 2 dizendo o binário 527ms
 ✓ test/orquestrador-migrar-config.test.ts (48 tests) 19507ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 407ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 419ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 450ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 477ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 485ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 485ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 1007ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 480ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 469ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 491ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 474ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 393ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 3674ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2649ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 3178ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 2818ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 538ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 528ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 10059ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 673ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 6080ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 785ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 3752ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > a trilha diz o que os gates disseram, e build sai como nao-configurado 431ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 397ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate CONFIGURADO que não chegou a rodar continua nao-rodou 395ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 423ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 448ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 446ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 379ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 442ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 391ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1601ms
 ✓ test/orquestrador-gates-fonte-unica.test.ts (8 tests) 2378ms
   ✓ 626 (a): gates.ts executa na worktree e lê o config da main > config da main com typecheck + typecheck_scripts e worktree só com typecheck: os DOIS rodam; a linha GATE sai typecheck=ok 537ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (b) typecheck ok e typecheck_scripts ausente do gates.txt: typecheck=ok e gates_ausentes=typecheck_scripts na linha GATE e no STATUS.md 305ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (d) papel sem nenhum gate executado continua nao-rodou 313ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 6075ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 350ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 305ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > STATUS.md fica ocioso com MOTIVO pausado 334ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > a trilha registra a drenagem pausada, com par início/fim 312ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 314ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 665ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o sentinela legado (.orq-pause) continua pausando 330ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 891ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 892ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 321ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 351ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 320ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 333ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 355ms
 ✓ test/orquestrador-pacotes.test.ts (8 tests) 2175ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules da raiz como SYMLINK para diretório de fora: é pacote, e a worktree ganha o link 457ms
   ✓ a lista de pacotes é a MESMA que o linkador de worktree usa > linka node_modules de cada pacote detectado dentro da worktree 314ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 6ms
 ✓ test/orquestrador-sub-repeticao.test.ts (16 tests) 6ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 9ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 679ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2775ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2253ms
 ✓ test/orquestrador-base-vermelha.test.ts (4 tests) 17190ms
   ✓ 632: base vermelha > sequência do 510c: FAIL só no 0283 bloqueia com base_vermelha, sem juiz, sem retry e sem consumir tentativa 3697ms
   ✓ 632: base vermelha > contra-teste: FAIL num arquivo DA allowlist segue o caminho de hoje (REPROVADO criterio_qualidade, sem base_vermelha) 4594ms
   ✓ 632: base vermelha > contra-teste: typecheck reprovado junto segue o caminho de hoje, sem base_vermelha 4116ms
   ✓ 632: base vermelha > contra-teste: saída de testes sem linha FAIL reconhecível segue o caminho de hoje 4782ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 4786ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando DENTRO do timeout não está congelado 339ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 388ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 344ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 494ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 510ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 408ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 388ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > sem lock e sem STATUS congelado => segue 347ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 381ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 356ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 423ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 408ms
 ✓ test/orquestrador-arquivo-solto.test.ts (6 tests) 19857ms
   ✓ 631: arquivo solto > sequência do 513: agente commita a.ts e deixa diag-tmp.txt solto -> reprovado/arquivo_solto com retry e o nome no diagnóstico 2548ms
   ✓ 631: arquivo solto > contra-teste: o agente COMMITA diag-tmp.txt ele mesmo -> refatiar por enforcement 2314ms
   ✓ 631: arquivo solto > contra-teste: arquivo solto que casa zona proibida -> refatiar 2618ms
   ✓ 631: arquivo solto > contra-teste: um solto mais um commitado fora da allowlist (violação mista) -> refatiar 2622ms
   ✓ 631: arquivo solto > contra-teste: nenhum commit do agente e tudo solto dentro da allowlist -> "saiu sem commitar" e sem violação 2508ms
   ✓ 631: arquivo solto > drive_ticket: o retry do arquivo_solto reaproveita a worktree, mantém o modelo e aprova quando o agente remove o arquivo 7246ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 4ms
 ✓ test/orquestrador-triador-aceite.test.ts (6 tests | 1 skipped) 474ms
 ✓ test/orquestrador-criterio-merito.test.ts (5 tests) 336ms
   ✓ 625: run_criterios separa o comando que não executou do critério que reprovou > rc 127 (não encontrado) e rc 126 (não executável) entram na lista; reprovação comum não entra 331ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 26270ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 7917ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 493ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 507ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 632ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 476ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 586ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 1140ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 4548ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 2200ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 1280ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 1045ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 956ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 1216ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 1226ms
   ✓ saída sem drenagem NUNCA notifica > lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log 364ms
   ✓ deve_notificar: a regra, isolada > processou ≥ 1: notifica, qualquer que seja o motivo do fim 373ms
   ✓ deve_notificar: a regra, isolada > zero processados por pausa, cooldown ou sem progresso: cala sempre 362ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 444ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 1035ms
 ✓ test/orquestrador-fila-json-quebrado.test.ts (6 tests) 2308ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes sai com rc != 0 citando o arquivo e o erro; sem o quebrado, rc 0 483ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > STATUS mostra a fila corrompida, o placar conta os válidos e o seletor devolve o 902 586ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila sem ticket quebrado: nenhuma linha de corrompida e placar sem corrompido 422ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 7ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 43ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1998ms
   ✓ uma vez só, e por construção > a segunda passagem é no-op: não escreve, não anota 345ms
 ✓ test/orquestrador-ambiente-merito.test.ts (6 tests) 3ms
 ✓ test/orquestrador-gate-vitest-aviso.test.ts (27 tests) 488ms
 ✓ test/orquestrador-gate-grep-q.test.ts (19 tests) 218ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 2457ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 1013ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 265ms
 ✓ test/orq-pausa-trilha.test.ts (8 tests) 2008ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > RETOMADA por=terminal dur=<N>min, depois da PAUSA 443ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > imprime quem, quando e o motivo ANTES do RETOMADO 401ms
stdout | test/orquestrador-gate-corpus.test.ts > 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova

MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
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


 ✓ test/orquestrador-gate-corpus.test.ts (2 tests) 9119ms
   ✓ 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 9116ms
 ✓ test/orquestrador-isolamento-teste.test.ts (26 tests) 13192ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 12430ms
 ✓ test/orquestrador-prompt-evidencia.test.ts (6 tests) 2242ms
   ✓ 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 2240ms
 ✓ test/orquestrador-retry-feedback-juiz.test.ts (3 tests) 18658ms
   ✓ 623 (a): o motivo do juiz chega ao prompt de retry > juiz reprova com o mecânico verde: o retry traz gate juiz, o motivo LITERAL e os criterios_falhos do juiz 7190ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > segunda tentativa com diff.patch idêntico: bloqueado por retry_sem_mudanca, juiz chamado UMA vez 5978ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > contra-teste: segunda tentativa com diff DIFERENTE chama o juiz de novo (contador = 2) 5489ms
 ✓ test/orquestrador-teto-adiamento-ambiente.test.ts (5 tests) 22581ms
   ✓ teto de adiamento por ambiente > 3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota 5584ms
   ✓ teto de adiamento por ambiente > reprovação no meio quebra a sequência (o contador zera) 6765ms
   ✓ teto de adiamento por ambiente > adiamento por OUTRA causa não conta nem zera 4226ms
   ✓ teto de adiamento por ambiente > passar de fase zera: aprovado leva a aguardando_merge sem contador 2709ms
   ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 3296ms

 Test Files  72 passed (72)
      Tests  1434 passed | 1 todo (1435)
   Start at  23:15:34
   Duration  45.10s (transform 823ms, setup 0ms, collect 19.21s, tests 288.47s, environment 9ms, prepare 2.98s)
```

### g-test-shell (depois da 7f-b1-8)
```
[fixture] tmp: /tmp/orq-fixture-FpPw2E
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-FpPw2E/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-FpPw2E/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-FpPw2E/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-FpPw2E/repo
  CONFIG         = /private/tmp/orq-fixture-FpPw2E/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap bate com o arquivo (600)
  ok   diff_cap é inteiro positivo

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  - falha de ambiente da worktree
  ok   8 causas declaradas
  ok   a causa de ambiente da worktree está declarada
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-FpPw2E/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (3182508e)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

== mark_adiado: cooldown global só para limite real de conta (Actus 9e109cb) ==
  ok    tsx do checkout: /private/tmp/orq-fixture-FpPw2E/repo/node_modules/.bin/tsx
  ok    causa 'ambiente' (arma=nao) => cooldown global NÃO armado
  ok    causa 'juiz_ilegivel' (arma=nao) => cooldown global NÃO armado
  ok    causa 'timeout' (arma=nao) => cooldown global NÃO armado
  ok    causa 'rate_limit' (arma=sim) => cooldown global ARMADO
  ok    causa 'quota' (arma=sim) => cooldown global ARMADO

== drenar: 1º ADIADO por 'ambiente' => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (922) foi executado
  ok    nenhum cooldown global armado
  ok    o adiado (921) roda UMA vez só nesta drenagem
  ok    922 terminou done

== drenar: 1º adiado por orcamento_ticket => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (932) foi executado
  ok    931 não foi ao executor

== drenar: executor adia por orcamento_ticket POR DENTRO => o 2º roda (Actus 9e109cb) ==
  ok    o 2º ticket (942) foi executado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20261010T231638Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-10-10 20:16:44-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-10 20:16:44-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-10 20:16:44-0300] ticket 902 (3 processáveis)
  | [2026-10-10 20:16:45-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-10-10 20:16:45-0300] ticket 903 (3 processáveis)
  | [2026-10-10 20:16:46-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-10-10 20:16:46-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-10-10 20:16:46-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-10-10T20:16:46-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-10-10 20:16:47-0300 e 2026-10-10 20:16:48-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-10-10T20:16:56-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-10-10 20:16:56
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  1611fa8 · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-10-10T20:16:57-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-10-10T20:16:58-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:20:46
  ok    250: cooldown até 20:46
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 20:46

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 20:16:59-0300 e 2026-10-10 20:16:59-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 20:17:00-0300 e 2026-10-10 20:17:00-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 20:17:01-0300 e 2026-10-10 20:17:01-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-10 20:17:01-0300 e 2026-10-10 20:17:01-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-10-10T20:17:05-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-10-10T20:17:15-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

== 5. causa 'ambiente' em dois tickets: a absolvição não deixa o teto de 3 avançar ==
  --- disparo 11 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 12 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 13 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 14 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  ok    1 AMBIENTE em cada um dos 4 disparos
  ok    evento com 908,909 e o \n literal na causa
  ok    908 e 909 seguem pendentes (teto de 3 não atingido)
  ok    adiamentos_ambiente em 0 e ticket pendente depois de CADA disparo
  ok    trilha: 8 AMBIENTE_ADIAMENTO_DESFEITO (2 por disparo)
  ok    o evento diz de quanto para quanto
  ok    desfazer commitado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=2s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=0s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=1s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.Dg4uAYhnBz/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-10-10T20:17:58-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=1s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 1s, abaixo do limite de 30s: morto por fora) em 2026-10-10T23:18:05Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=6.28, núcleos=10)
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=04908ec8
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=b049e002
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=2dc795c4
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=acf1da8e
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=acf1da8e
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-10-10T20:18:54-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-10-10T20:18:59-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=4.78, núcleos=10)
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=4e495f51
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

--- test-painel-visao.sh ---
== 0. pendentes_razoes: a régua do OCIOSO, com o processável dito 'pronto' ==
  ok    531 pronto
  ok    601 espera 600
  ok    ocioso_razoes segue com rc 1 quando há processável

== 1. o estado sai do painel, lido só do contrato ==
  ok    painel --estado sai 0
  ok    3 repos, na ordem do repos.json

== 2. Precisa de você: tokens ordenados por quantos pendentes destravam ==
  ok    1º item: humano:cred-evo
  ok    cred-evo destrava 3 (600, e 601 e 602 atrás dele)
  ok    tickets destravados por cred-evo
  ok    2º item: humano:grupo-wa destrava 1
  ok    o item diz de qual repo é

== 3. estado em linguagem direta, com tempo ==
  ok    alfa: tipo
  ok    alfa: frase
  ok    alfa: tentativa e último resultado
  ok    beta: tipo
  ok    beta: frase
  ok    beta: o motivo da pausa
  ok    gama: tipo
  ok    gama: frase
  ok    gama: por que não pega
  ok    cada estado tem rótulo em texto, não só cor

== 4. o dia: aprovados contra reprovas (ontem não conta) ==
  ok    alfa: 2 aprovados, 2 reprovas
  ok    alfa: contagem da fila

== 5. próximos: os 3 primeiros da fila, com título ==
  ok    ids na ordem do loop
  ok    com título
  ok    e mais 1

== 6. bloqueados: categoria de motivo e sub, nunca da prosa ==
  ok    700 (repeticao sub=gate_testes) é teste
  ok    701 (criterio_qualidade, último sub=juiz) é juiz, apesar de 'fora_do_pathspec' na nota
  ok    702 (bloqueado sem BLOQUEADO na trilha) é decisão sua
  ok    243 (adiamentos) é ambiente
  ok    primeira linha do motivo
  ok    o resto fica para o clique
  ok    4 bloqueados nos 3 repos, cada um com o repo

== 7. nenhum ramo por nome de repo ==
  ok    o mesmo repo com outro nome dá o mesmo estado
  ok    orq-painel.py não cita nome de repo
  ok    orq-painel.py não lê meta.json nem log livre

== 8. repos.json ausente: a tela diz o que falta, não quebra ==
  ok    repos_erro nomeia o arquivo

== 9. a página: atualiza a cada 15 s e tem as seções ==
  ok    página contém 'Precisa de você'
  ok    página contém 'Bloqueados'
  ok    página contém '/api/estado'
  ok    página contém '15000'

== 10. razões que não se apuram: a faixa diz quem ficou fora da conta (K12-G) ==
  ok    os tokens do alfa continuam na faixa
  ok    a faixa diz qual repo ficou fora da conta
  ok    e por quê
  ok    timeout: nenhum token apurado
  ok    timeout: os dois repos fora da conta
  ok    o erro diz o tempo e quantos pendentes
  ok    o cartão mostra o erro
  ok    sem razões, prontos é desconhecido, não zero
  ok    gama ocioso sem razões: o cartão não diz 'sem ticket para pegar'
  ok    alfa segue rodando: isso vem do STATUS, não das razões
  ok    a página tem a frase de quem ficou fora

== 11. motivo longo: primeira frase ou 160 caracteres, o resto no clique (K12-H) ==
  ok    243: a primeira frase
  ok    243: o texto inteiro fica para o clique
  ok    244 sem ponto: cortado em até 160 caracteres mais '…' (160)
  ok    o corte avisa com '…'
  ok    o corte cai entre palavras
  ok    700 (motivo curto em duas linhas) segue igual
  ok    a página abre o texto inteiro no clique

== 12. bloqueados: filtro por repo, junto com o de categoria (K12-I) ==
  ok    contagem por repo, na ordem do repos.json, com o zero
  ok    sem filtro: todos os bloqueados
  ok    chip de repo sem bloqueado fica, desabilitado
  ok    e mostra o 0
  ok    clique em gama: só o 243
  ok    clique em alfa: os 3 do alfa
  ok    alfa + categoria teste: os dois filtros juntos
  ok    a atualização de 15 s mantém repo e categoria

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 8 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-visao.sh) = 0

--- test-painel-detalhe.sh ---
  ok    painel --estado sai 0

== 1. os 6 indicadores ==
  ok    tempo por ticket: média, mediana, pior (s)
  ok    aprovação na 1ª: 2 de 3, 67%
  ok    tentativas por aprovação: 5 inícios / 3 aprovações
  ok    fila estimada: 2 prontos × 980 s de execução por aprovação
  ok    ociosidade hoje: 12h menos 49 min em execução, 2h delas pausado
  ok    última promoção: sem dado, com o motivo
  ok    última promoção diz por que não tem dado
  ok    custo do dia (custo.json), só hoje

== 2. sem aprovação no dia, os indicadores dizem 'sem dado' em vez de zero ==
  ok    tempo_ticket: sem dado (nenhuma aprovação hoje)
  ok    primeira: sem dado (nenhuma aprovação hoje)
  ok    tentativas_por_aprovacao: sem dado (nenhuma aprovação hoje)
  ok    fila_estimada: sem dado (nenhuma aprovação hoje, sem ritmo)

== 3. bloqueados: categoria, motivo, allowlist, parado há, tentativas ==
  ok    820: enforcement
  ok    820: parado há 30 min
  ok    820: tentativas do BLOQUEADO (sem campo no ticket)
  ok    820: onde mexe

== 4. prontos: o que muda em uma frase, onde mexe, quantos destravam ==
  ok    prontos na ordem do loop
  ok    810: a primeira frase do objetivo
  ok    810: onde mexe
  ok    810 destrava 1 (o 812), 811 nenhum

== 5. hora a hora: aprovado, reprova, parado ==
  ok    9h: 1 aprovado, 1 reprova, 28 min em execução, 32 parado
  ok    10h: 2 aprovados, 16 min em execução
  ok    3h: parado a hora inteira
  ok    horas até agora (0 a 12)

== 6. arquivos mais disputados entre os pendentes ==
  ok    top 3

== 7. a página tem a vista de detalhe ==
  ok    página contém 'function detalhe'
  ok    página contém 'Hoje, hora a hora'
  ok    página contém 'Arquivos mais disputados'
  ok    página contém 'Prontos'
  ok    página contém 'sem dado'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 2 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-detalhe.sh) = 0

--- test-painel-pausa.sh ---
  servidor em http://127.0.0.1:64504
== 1. pausar: cria o PAUSAR do contrato e grava PAUSA na trilha ==
  ok    HTTP 200
  ok    docs/fila/PAUSAR criado
  ok    conteúdo no formato do §7: <AAAA-MM-DD HH:MM> | motivo
  ok    trilha: 2026-10-10T20:19:25-0300 --- PAUSA motivo=leva-da-tarde por=painel
  ok    a resposta explica que para ENTRE tickets
  ok    .orq-pause nunca é escrito
  ok    nada mais mudou no repo

== 2. pausar de novo: recusa, sem segunda linha ==
  ok    HTTP 409
  ok    sem PAUSA duplicada

== 3. o estado diz o que cada botão pode e por quê ==
  ok    rho: pausar desabilitado
  ok    rho: retomar habilitado
  ok    rho: disparo desabilitado (ticket em curso)
  ok    o motivo do disparo desabilitado está escrito
  ok    sem ação 'pausar agora'

== 4. retomar: apaga o PAUSAR e grava RETOMADA com a duração ==
  ok    HTTP 200
  ok    PAUSAR apagado
  ok    trilha: 2026-10-10T20:19:25-0300 --- RETOMADA por=painel dur=0min
  ok    nada mais mudou no repo
  ok    retomar sem pausa: 409

== 4b. quem pausou: painel e terminal gravam a mesma linha, e o painel diz quem foi (K12-F) ==
  ok    pausa pelo painel: o cartão diz 'pausado pelo painel'
  ok    retomar pelo painel diz quem pausou e por quê
  ok    pausa pelo terminal: o cartão diz 'pausado pelo terminal'
  ok    PAUSA do terminal e do painel no mesmo formato

== 5. legado .orq-pause: lido, nunca escrito nem apagado ==
  ok    sigma aparece pausado
  ok    sigma: retomar desabilitado
  ok    o motivo nomeia o .orq-pause
  ok    POST retomar no legado: 409
  ok    .orq-pause intacto
  ok    sigma continua sem PAUSAR

== 6. disparo: só com STATUS ocioso, e sem -k ==
  ok    com ticket em curso: 409
  ok    launchctl kickstart não chamado
  ok    ocioso: 200
  ok    kickstart gui/<uid>/<label do config>, sem -k

== 7. o resto é recusado ==
  ok    ação fora da allowlist: 403
  ok    repo desconhecido: 400
  ok    Host estranho: 403

== 8. a página: Pausar e Retomar, e o que a pausa faz ==
  ok    página contém 'Pausar'
  ok    página contém 'Retomar'
  ok    página contém 'ENTRE tickets'
  ok    página contém 'nada é interrompido'
  ok    sem 'Pausar agora'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 31 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-pausa.sh) = 0

--- test-painel-alarmes.sh ---
== 1. launchd_exit: last exit code != 0 ==
  ok    rc 127 com trilha recente: o job org.fixture.a1 saiu com rc 127 no último disparo (launchctl print: last exit code)
  ok    o card diz travado
  ok    rc 0 e drenagem dentro da janela: silêncio
  ok    job NÃO carregado (desagendado de propósito): silêncio

== 2. mudo: nenhum DRENAGEM_INICIO há mais de 2x o start_interval ==
  ok    DRENAGEM_INICIO de 3x o start_interval atrás: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    e diz o intervalo do job: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    o card diz travado
  ok    DRENAGEM_INICIO dentro de 2x o start_interval: silêncio
  ok    velho, mas job descarregado: silêncio
  ok    trilha sem nenhum DRENAGEM_INICIO, job carregado: nenhum DRENAGEM_INICIO na trilha, com o job org.fixture.a2d carregado (dispara a cada 30 min)

== 3. pausa_furada: PAUSAR de pé e a drenagem seguiu depois dele ==
  ok    DRENAGEM_INICIO sem motivo=pausado depois da PAUSA: a drenagem seguiu depois da pausa: DRENAGEM_INICIO às 11:40, com o PAUSAR de pé desde 11:29
  ok    pausa respeitada (motivo=pausado) e retry do 530, que já corria: sem pausa_furada
  ok    INICIO de OUTRO ticket depois da pausa: a drenagem seguiu depois da pausa: INICIO do 531 às 11:50, com o PAUSAR de pé desde 11:29

== 4. pausa_longa: PAUSAR há mais de 40 min ==
  ok    41 min: pausado há 41 min, mais de 40 min: motivo "madrugada"
  ok    39 min: silêncio

== 5. execucao_longa: além do timeout do config mais a margem ==
  ok    41 min com timeout de 30 e margem de 10: o 530 está em execução há 41 min; o timeout é 30 min (+10 min de margem para gates e juiz)
  ok    o card diz travado
  ok    30 min, dentro do timeout mais a margem: silêncio

== 6. todo alarme é texto, e o que falta no config vira 'sem dado' ==
  ok    sem dado: mudo: sem launchd.start_interval no config | execução longa: sem claude_timeout_secs no config
  ok    a página mostra o texto do alarme

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 19 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-alarmes.sh) = 0

--- test-painel-lento.sh ---
  servidor em http://127.0.0.1:64524
== 1. duas chamadas seguidas respondem abaixo de 1 s ==
  ok    1ª chamada em 0.557437s
  ok    2ª chamada em 0.000737s

== 2. o repo rápido vem completo; o lento vem marcado ==
  ok    rápido: razões apuradas
  ok    rápido: 1 pronto
  ok    rápido: o token dele está na faixa
  ok    lento: apurando
  ok    lento: o cartão diz que está apurando
  ok    lento: fora da conta da faixa, e dito

== 3. depois do timeout: sem apurar, com a hora da última tentativa, e o processo morto ==
  ok    lento: sem apurar
  ok    última tentativa às 20:19
  ok    o cartão diz a última tentativa
  ok    recuo de 1 min: próxima em 57s
  ok    o processo do lento morreu no timeout
  ok    rápido segue completo

== 4. no recuo, nada de tentar de novo a cada chamada ==
  ok    uma tentativa só

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 6 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-lento.sh) = 0

--- test-gate-prevoo.sh ---
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)

== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)

== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado

== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou

== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação

== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente

== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido

== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903

== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  ok    UM GATE_TICKET_AVISO na trilha em dois disparos
  ok    o evento carrega o hash da versão
  ok    o 901 editado é versão nova: segundo GATE_TICKET_AVISO

TODOS OS CHECKS PASSARAM

rc(test-gate-prevoo.sh) = 0

--- test-tentativas-persistidas.sh ---
== 1 · drenagem 1: reprovado + adiado(ambiente) -> tentativas = 1 ==
  ok    drenagem 1 começa em attempt=0 (ticket sem campo = 0)
  ok    depois de reprovado+adiado: tentativas=1 no arquivo
  ok    o adiamento devolve o ticket a pendente

== 3 · crash no meio da tentativa: o contador já está no arquivo ==
  ok    a tentativa foi persistida ANTES de rodar (o agente já via tentativas=1)
  ok    depois do crash: tentativas=1 (a tentativa morta conta)

== 4 · aprovado não consome; done zera ==
  ok    reprovado+aprovado: tentativas=1 (o aprovado não soma)
  ok    local-loop.sh zera tentativas junto com o status done

TODOS OS CHECKS PASSARAM

rc(test-tentativas-persistidas.sh) = 0

--- test-orq-pause.sh ---
== 1 · as duas sentinelas presentes: --status lista as duas ==
    PAUSADA: docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar
    PAUSADA: docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   duas linhas PAUSADA
  ok   PAUSAR com caminho e conteúdo
  ok   .orq-pause com caminho e conteúdo
== 4 · pausa_motivo devolve caminho + conteúdo das duas ==
    docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar; docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   pausa_motivo nomeia as duas
== 2 · --off remove as duas e pausa_ativa fica falso ==
    removida: docs/fila/PAUSAR
    removida: docs/fila/.orq-pause
    fila RETOMADA (2 sentinela(s) removida(s))
  ok   diz que removeu PAUSAR
  ok   diz que removeu .orq-pause
  ok   os dois arquivos sumiram
  ok   pausa_ativa falso
== 3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR ==
  ok   pausado por PAUSAR antes do --off
    removida: docs/fila/PAUSAR
    fila RETOMADA (1 sentinela(s) removida(s))
  ok   PAUSAR removido
  ok   conta uma removida
  ok   pausa_ativa falso
== 5 · nenhuma presente ==
  ok   --status: ativa (sem pausa)
  ok   --off não inventa remoção
  ok   nenhuma linha 'removida:'
== 6 · local-loop pausado: o STATUS nomeia a sentinela ==
    ESTADO   ocioso
    MOTIVO   pausado (docs/fila/PAUSAR: 2026-09-24 12:00 | pausa do teste)
  ok   MOTIVO com a sentinela e o conteúdo
== 7 · (kit, K12-F) pausar e retomar pelo orq-pause.sh gravam PAUSA e RETOMADA na trilha ==
  ok   PAUSA por=terminal na trilha
  ok   RETOMADA por=terminal na trilha

TODOS OK

rc(test-orq-pause.sh) = 0

--- test-preflight.sh ---
== 1 · papel em PENDENTE_* aborta (ROOT sintético, zero gasto) ==
  ok    abortou (rc=1)
  ok    diz que é erro de config
  ok    diz que não consome tentativa
  ok    aponta o desbloqueio LIDO DO CONFIG
  ok    nomeia o papel pendente
  ok    nenhuma sondagem disparada
  ok    nada gravado no custo.json do fixture

== 1b · qualquer um dos três papéis pendente basta ==
  ok    executor_model pendente => aborta nomeando o papel
  ok    avaliador_model pendente => aborta nomeando o papel
  ok    retry_final_model pendente => aborta nomeando o papel

== 1c · INVARIANTE do config real: nenhum papel pendente hoje ==
  ok    executor_model definido (sonnet)
  ok    avaliador_model definido (opus)
  ok    retry_final_model definido (opus)

== 2 · id de modelo inexistente é RECUSADO pelo texto do CLI ==
  ok    recusa detectada: [claude-code:unrecognized_model] {"model":"m…
  ok    recusa detectada: There's an issue with the selected model (xy…
  ok    recusa detectada: "PENDENTE_TK104" is not a model this version…
  ok    resposta normal não é recusa

== 3 · o que NÃO aconteceu ==
  ok    nenhuma worktree criada (0 antes, 0 depois)
  ok    nenhum attempt gravado no fixture
  ok    cooldown NÃO armado (erro de config não é adiamento)

== 4 · fronteira: sondagem limitada ADIA, não aborta ==
  ok    429 real => adiável
  ok    conexão recusada real => adiável
  ok    saída vazia com rc!=0 => adiável (CLI não falou)
  ok    modelo recusado NÃO é adiável

== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto ==
  ok    veredito válido lido do envelope
  ok    prompt gravado (evidência, regra 8)
  ok    output CRU preservado
  ok    o critério avaliador chega ao prompt
  ok    allowlist com *.test.* liga o anti-afrouxamento
  ok    o juiz não recebe o prompt do executor
  ok    lixo => ILEGÍVEL (o executor adia, não reprova)
  ok    nenhum veredito inventado a partir de lixo
  ok    nada gravado em custo.json (nenhuma chamada paga)

TODOS OS CHECKS PASSARAM

rc(test-preflight.sh) = 0

--- test-diff-lines.sh ---
C. diff vazio
  ✓ diff vazio = 0
A. inserções + deleções
  ✓ DIFF_LINES = 15 (diff cru tem 50 linhas)
B. binário conta zero
  ✓ binário não soma (DIFF_LINES continua 15)

PASS=3 FAIL=0

rc(test-diff-lines.sh) = 0

--- test-sem-cor.sh ---
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI

== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  ok    gate 'test' aprovado com o placar lido por grep
  ok    critério: saída '1' (o placar casou)

TODOS OS CHECKS PASSARAM

rc(test-sem-cor.sh) = 0

--- test-fixture-gates.sh (kit) ---
[fixture] tmp: /tmp/orq-fixture-rFKpGq
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-etapa7f/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-rFKpGq/repo
== gates reais numa worktree do motor · fixture em /tmp/orq-fixture-rFKpGq/repo ==

Preparing worktree (new branch 'frente/teste-gates')
ok: a worktree tem node_modules (symlink -> /private/tmp/orq-fixture-rFKpGq/repo/./node_modules)

--- gates.txt ---
ok   typecheck               788ms
ok   test                  34295ms
VEREDITO: APROVADO
--- fim (rc=0) ---

ok: gates.ts rc=0
ok: VEREDITO: APROVADO
ok: gate typecheck
ok: gate test

test-fixture-gates: VERDE

rc(test-fixture-gates.sh) = 0

== placar ==
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
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
```

## Anexo C. Dry-run, saída crua
```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-etapa7f)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/config-tabela.ts
diferente   scripts/orquestrador/decisao-cli.ts
diferente   scripts/orquestrador/decisao.ts
diferente   scripts/orquestrador/diagnostico.ts
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/gate-ticket.ts
diferente   scripts/orquestrador/gates.ts
diferente   scripts/orquestrador/juiz.ts
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
diferente   scripts/orquestrador/migrar-config.ts
diferente   scripts/orquestrador/orq-pause.sh
diferente   scripts/orquestrador/prevoo.ts
diferente   scripts/orquestrador/test-ambiente.sh
só no kit   scripts/orquestrador/test-diff-lines.sh
diferente   scripts/orquestrador/test-drenagem.sh
diferente   scripts/orquestrador/test-fixture-executor.sh
só no kit   scripts/orquestrador/test-gate-prevoo.sh
diferente   scripts/orquestrador/test-lib-config.sh
só no kit   scripts/orquestrador/test-orq-pause.sh
diferente   scripts/orquestrador/test-preflight.sh
diferente   scripts/orquestrador/test-reabertura-humana.sh
diferente   scripts/orquestrador/test-reprovado-sub.sh
diferente   scripts/orquestrador/test-retry-worktree.sh
só no kit   scripts/orquestrador/test-sem-cor.sh
só no kit   scripts/orquestrador/test-tentativas-persistidas.sh
só no kit   scripts/orquestrador/triador
diferente   scripts/orq
diferente   docs/orquestrador/skill/templates/TICKET.md
diferente   docs/orquestrador/skill/templates/config.json
diferente   test/fixtures/orq-harness.ts
diferente   test/orquestrador-pacotes.test.ts
só no kit   test/orquestrador-gate-grep-q.test.ts
só no kit   test/orquestrador-gate-vitest-aviso.test.ts
só no kit   test/orquestrador-contexto-juiz.test.ts
só no kit   test/orquestrador-retry-feedback-juiz.test.ts
só no kit   test/orquestrador-gates-fonte-unica.test.ts
só no kit   test/orquestrador-base-vermelha.test.ts
só no kit   test/orquestrador-fila-json-quebrado.test.ts
só no kit   test/orquestrador-arquivo-solto.test.ts
só no kit   test/orquestrador-contexto-juiz-fixtures.test.ts
só no kit   test/orquestrador-gate-regex-exemplos.test.ts
só no kit   test/orquestrador-criterio-merito.test.ts
só no kit   test/orquestrador-ambiente-merito.test.ts
só no kit   test/orquestrador-teto-adiamento-ambiente.test.ts
só no kit   test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md
só no kit   test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md
só no kit   test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md
só no kit   test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt

50 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
dry-run rc=0
```

## Anexo D. Diff cru de cada commit

Do `0ebe0f6`, o diff cru de `montar.py` e dos dois testes. Os 1.770 arquivos de dados da fixture (52 mil linhas) ficam no commit e se refazem com `montar.py`. O `--stat` resumido:
```
 1773 files changed, 52570 insertions(+)
```

### 0ebe0f6
```diff
commit 0ebe0f69959f30a40513397e055bd3070ae3ac65
Author: Lucas Santos
Date: Sat Oct 10 18:33:08 2026 -0300

7f-b1-1: fixture do triador (37 bloqueios + 20 de controle) e aceite vermelho

test/fixtures/triador-7f/ montada por montar.py, so leitura do
comarka-operacional (git so com GIT_OPTIONAL_LOCKS=0, show/log/rev-parse):
- 37 casos da medicao de 09/10 (medicao-bloqueios-out.md:102-138), cada um
  com esperado.json {classe da §5, evidencia, requeue, fonte_da_verdade};
- 20 done de controle com vermelho intermediario resolvido no retry;
- recorte do gate-vitest e dos criterios com mapa de linhas originais,
  segredo mascarado, fontes dos testes vermelhos em .fonte, vizinhos de ±6 h
  com a coluna antes_do_bloqueio; 2,6 MB.

orquestrador-triador-fixture.test.ts: sanidade (verde).
orquestrador-triador-aceite.test.ts: (A), (B) e controle; entra vermelho
por assercao (0 de 16 firmes), sem import quebrado.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/test/fixtures/triador-7f/montar.py b/test/fixtures/triador-7f/montar.py
new file mode 100644
index 0000000..c6eed43
--- /dev/null
+++ b/test/fixtures/triador-7f/montar.py
@@ -0,0 +1,586 @@
+#!/usr/bin/env python3
+"""montar.py — monta a fixture do triador 7f a partir do comarka-operacional.
+
+SÓ LEITURA do comarka. Todo git roda com GIT_OPTIONAL_LOCKS=0 e só com `show`,
+`log` e `rev-parse`; nenhum script do comarka roda; nada é escrito fora de
+<saida> (padrão: o diretório deste arquivo).
+
+    python3 test/fixtures/triador-7f/montar.py --comarka ~/Projetos/comarka-operacional
+
+De onde sai cada caso (spec 7f-a §7.1):
+  - os 37 bloqueios da medição de 09/10 (`medicao-bloqueios-out.md` §3, linhas
+    102-138; classe da §5), com a linha `BLOQUEADO` do local-loop.log (`L`);
+  - 20 tickets `done` do período, de controle (§7.3): os 10 com vermelho de
+    vitest numa tentativa intermediária, resolvido no retry, e 10 com critério
+    vermelho intermediário. Nenhum deles pode sair firme.
+
+O que vai para cada caso é SÓ o que o triador lê, já recortado:
+  caso.json, ticket.json, meta.json, config.json, log.txt, serie.json,
+  attempt-K/ (com presenca.json e os mapas *.linhas.json dos recortes),
+  fontes/<head>/<arquivo>.fonte, vizinhos.tsv, esperado.json.
+
+O recorte do gate-vitest é o mesmo algoritmo de `triador/recorte.ts`
+(`recortarVitest`): âncoras fortes sempre; depois âncoras fracas em ordem;
+depois contexto de até 6 linhas, do mais perto para o mais longe, até 300
+linhas. O teste da peça 2 confere que os dois dão o mesmo recorte.
+"""
+import argparse, glob, gzip, json, os, re, subprocess, sys
+from datetime import datetime, timedelta, timezone
+
+AQUI = os.path.dirname(os.path.abspath(__file__))
+INICIO_PERIODO = "2026-09-25T03:00:00Z"
+MEDICAO = "medicao-bloqueios-out.md"
+
+# --- A tabela da medição (§3 + §5). Uma linha por bloqueio: id, L (linha do
+# BLOQUEADO no local-loop.log), classe R1-R7 da §5, linha da tabela na medição,
+# e a evidência que a medição cita, relativa a docs/fila/ (L: = runs/local-loop.log).
+# `~"<trecho>"` = a medição cita o trecho sem linha: a linha é achada pelo trecho
+# no gate-vitest da série (montar marca `origem: "trecho"`). `serie:<arquivo>` =
+# a medição cita `attempt-*/<arquivo>`: vale o arquivo de cada tentativa da série.
+CASOS = [
+    ("559", 55054, "R3", 102, ["runs/559/attempt-2.prev2/gate-vitest.txt:980", "runs/559/attempt-2.prev2/gate-vitest.txt:1071", "runs/559/attempt-2.prev2/gate-vitest.txt:1366", "L:55043"]),
+    ("559", 55209, "R4", 103, ["runs/559/attempt-2/gate-vitest.txt:979"]),
+    ("627", 55356, "R2", 104, ["runs/627/attempt-2/gate-vitest.txt:936"]),
+    ("600", 55898, "R4", 105, ["runs/600/attempt-3/gate-vitest.txt:983"]),
+    ("627b", 56021, "R2", 106, ["runs/627b/attempt-3/criterios.txt:17", "L:55993"]),
+    ("549c", 57053, "R2", 107, ["runs/549c/attempt-2/criterios.txt:17"]),
+    ("627j", 57368, "R1", 108, ["runs/627j/attempt-3/gate-vitest.txt:949"]),
+    ("635", 58105, "R3", 109, ["runs/635.pre-requeue-26set/attempt-2/gate-vitest.txt:2239", "runs/635.pre-requeue-26set/attempt-2/gate-vitest.txt:974"]),
+    ("654", 59896, "R1", 110, ["runs/654.pre-requeue-26set/attempt-2/gate-vitest.txt:975"]),
+    ("407a", 64280, "R2", 111, ["runs/407a/attempt-2.prev1/criterios.txt:113", "L:64265"]),
+    ("689", 65280, "R1", 112, ["runs/689/attempt-2/gate-vitest.txt:1375"]),
+    ("691", 65374, "R2", 113, ["runs/691/attempt-1.prev1/criterios.txt:65", "L:65362"]),
+    ("346d", 66187, "R1", 114, ["runs/346d/attempt-2/enforcement.json", "L:66186"]),
+    ("407a", 67585, "R2", 115, ["runs/407a/attempt-3/criterios.txt:222"]),
+    ("722", 67970, "R1", 116, ["runs/722/attempt-1.prev1/gate-vitest.txt:1412"]),
+    ("723", 68736, "R6", 117, ["L:68717", "serie:diff.stat"]),
+    ("715", 68793, "R1", 118, ["runs/715/attempt-2/gate-vitest.txt:1443"]),
+    ("737", 69920, "R2", 119, ["L:69906"]),
+    ("739", 71699, "R3", 120, ["L:71698"]),
+    ("801", 72121, "R5", 121, ["runs/801/attempt-2/gate-vitest.txt:1593"]),
+    ("760", 72407, "R5", 122, ["runs/760/attempt-1.prev1/gate-vitest.txt:1553"]),
+    ("762", 72665, "R1", 123, ["runs/762/attempt-1.prev1/gate-vitest.txt:1583"]),
+    ("856", 73817, "R1", 124, ["runs/856.pre-requeue-06out/attempt-1/gate-vitest.txt:1640"]),
+    ("867", 76790, "R3", 125, ["L:76748", "L:76769"]),
+    ("711a", 78138, "R1", 126, ["runs/711a/attempt-1.prev1/gate-vitest.txt:1831"]),
+    ("711b3", 78647, "R1", 127, ["runs/711b3/attempt-1.prev1/claude-output.txt"]),
+    ("741", 79081, "R4", 128, ["runs/741/attempt-1.prev1/claude-output.txt"]),
+    ("707", 79202, "R7", 129, ['~"Abrir grupo"']),
+    ("826", 80362, "R3", 130, ["runs/826/attempt-3.prev1/verdict.json"]),
+    ("900", 81564, "R2", 131, ["runs/900/attempt-1.prev1/criterios.txt:57"]),
+    ("898", 82594, "R5", 132, ["~\"Cannot find module '@/hooks/useAcaoUnica'\""]),
+    ("741a", 82726, "R5", 133, ["L:82725", "~\"Cannot find module '@/hooks/useAcaoUnica'\""]),
+    ("707", 83026, "R4", 134, ["runs/707/attempt-3.prev1/claude-output.txt"]),
+    ("898", 83625, "R2", 135, ["runs/898/attempt-1.prev2/criterios.txt:33"]),
+    ("950", 85145, "R1", 136, ["runs/950/attempt-2/claude-output.txt", '~"etapa2-funil-motor.test.ts:92"']),
+    ("940", 85222, "R5", 137, ["L:85202", "L:85203", "L:85217"]),
+    ("932", 85272, "R5", 138, ["L:85252", "L:85267"]),
+]
+# Os 20 de controle: done no período, série final com >= 2 tentativas e
+# vermelho intermediário resolvido no retry (vitest nos 10 primeiros, critério
+# nos 10 seguintes). Escolha: os 10 únicos com vitest vermelho intermediário na
+# série final (todos com o vermelho FORA da allowlist), e os 10 primeiros com
+# critério intermediário, por ordem de id.
+CONTROLE = ["633", "671d", "624", "694", "627e", "656", "808", "706", "367", "891",
+            "907", "707a", "868", "860", "650", "712", "662b", "735", "648", "744"]
+
+# --- O recorte: o MESMO algoritmo de triador/recorte.ts -----------------------
+ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
+FORTES = [re.compile(p) for p in (
+    r"^\s*FAIL\s", r"❯\s+\S+:\d+:\d+", r"^\s*Test Files\s", r"^\s*Tests\s",
+    r"\bTimeout\b", r"timed out", r"\bEMFILE\b", r"\bENOSPC\b", r"Cannot find module")]
+FRACAS = [re.compile(p) for p in (r"AssertionError", r"\bExpected\b", r"\bReceived\b", r"\bError:")]
+# Quadro de pilha (`    at f (arquivo:l:c)`) não é âncora nem contexto, salvo
+# quando cita arquivo de teste: é ruído para quem lê, e enchia 60% do recorte.
+PILHA = re.compile(r"^\s+at\s")
+PILHA_DE_TESTE = re.compile(r"\.(?:test|spec)\.[cm]?[jt]sx?")
+CONTEXTO, TETO = 6, 300
+
+
+def ruido(l):
+    return bool(PILHA.match(l)) and not PILHA_DE_TESTE.search(l)
+
+
+def recortar(texto):
+    """[(linha_original_1based, texto)] do recorte, em ordem de linha."""
+    linhas = ANSI.sub("", texto).split("\n")
+    fortes = [i for i, l in enumerate(linhas) if not ruido(l) and any(r.search(l) for r in FORTES)]
+    # Sem nenhum FAIL a suíte passou: o recorte é só das âncoras fortes (o
+    # placar `Test Files`/`Tests` e algum sinal de máquina), sem fracas nem
+    # contexto. O `Error:` de stderr de teste verde é ruído.
+    if not any(FORTES[0].search(linhas[i]) for i in fortes):
+        return [(i + 1, linhas[i]) for i in fortes]
+    ja = set(fortes)
+    fracas = [i for i, l in enumerate(linhas) if i not in ja and not ruido(l) and any(r.search(l) for r in FRACAS)]
+    sel = set(fortes)
+    for i in fracas:
+        if len(sel) >= TETO:
+            break
+        sel.add(i)
+    ancoras = sorted(sel)
+    for d in range(1, CONTEXTO + 1):
+        for a in ancoras:
+            for i in (a - d, a + d):
+                if len(sel) >= TETO:
+                    break
+                if 0 <= i < len(linhas) and i not in sel and not ruido(linhas[i]):
+                    sel.add(i)
+    return [(i + 1, linhas[i]) for i in sorted(sel)]
+
+
+# --- Máscara de segredo: a MESMA de triador/mascara.ts ------------------------
+MASCARA = "‹segredo›"
+SEGREDOS = [
+    re.compile(r"\bsk-[A-Za-z0-9_-]{8,}"),
+    re.compile(r"\beyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}"),
+    re.compile(r"\bservice_role\b"),
+    re.compile(r"\b(?:SUPABASE_[A-Z0-9_]*|[A-Z0-9_]*_KEY|[A-Z0-9_]*_TOKEN)=[^\s\"'`]+"),
+    re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}"),
+]
+
+
+def mascarar(s):
+    for r in SEGREDOS:
+        s = r.sub(MASCARA, s)
+    return s
+
+
+# --- glob da allowlist: o MESMO de enforcement-core.ts:globToRegExp ----------
+def glob_re(g):
+    out, i = "^", 0
+    while i < len(g):
+        c = g[i]
+        if c == "*":
+            if i + 1 < len(g) and g[i + 1] == "*":
+                i += 1
+                if i + 1 < len(g) and g[i + 1] == "/":
+                    i += 1
+                    out += "(?:.*/)?"
+                else:
+                    out += ".*"
+            else:
+                out += "[^/]*"
+        elif c == "?":
+            out += "[^/]"
+        elif c in ".+^${}()|[]\\/":
+            out += "\\" + c
+        else:
+            out += c
+        i += 1
+    return re.compile(out + "$")
+
+
+def cobre(al, f):
+    return any(glob_re(g).match(f) for g in al)
+
+
+# --- Leitura do comarka (só leitura) ------------------------------------------
+class Comarka:
+    def __init__(self, raiz):
+        self.raiz = raiz
+        self.runs = os.path.join(raiz, "docs/fila/runs")
+        self._log = None
+        self._vermelhos = None
+
+    def git(self, *args):
+        assert args[0] in ("show", "log", "rev-parse"), args
+        r = subprocess.run(["git", "-C", self.raiz, *args], capture_output=True, text=True,
+                           env={**os.environ, "GIT_OPTIONAL_LOCKS": "0"})
+        return r.stdout if r.returncode == 0 else None
+
+    def log(self):
+        if self._log is None:
+            with open(os.path.join(self.runs, "local-loop.log"), encoding="utf-8", errors="replace") as f:
+                self._log = f.read().split("\n")
+        return self._log
+
+    def hora_da_linha(self, n):
+        """UTC da linha n (1-based): data da última linha de drenagem
+        `[AAAA-MM-DD HH:MM:SS-0300]` antes dela + hora `[orq HH:MM:SS]` (UTC)."""
+        log = self.log()
+        m = re.match(r"\[orq (\d\d):(\d\d):(\d\d)\]", log[n - 1])
+        for i in range(n - 1, -1, -1):
+            d = re.match(r"\[(\d{4}-\d\d-\d\d \d\d:\d\d:\d\d)([+-]\d{4})\]", log[i])
+            if d:
+                base = datetime.strptime(d.group(1) + d.group(2), "%Y-%m-%d %H:%M:%S%z").astimezone(timezone.utc)
+                if not m:
+                    return base
+                t = base.replace(hour=int(m.group(1)), minute=int(m.group(2)), second=int(m.group(3)))
+                if t < base - timedelta(minutes=5):
+                    t += timedelta(days=1)
+                return t
+        raise RuntimeError(f"linha {n} sem data de drenagem antes")
+
+    def ticket(self, sha, arquivo):
+        txt = self.git("show", f"{sha}:{arquivo}") or ""
+        m = re.search(r"```json\n(.*?)\n```", txt, re.S)
+        return json.loads(m.group(1)) if m else None
+
+    def arquivo_do_ticket(self, tid):
+        out = self.git("log", "--all", "--format=", "--name-only", "--", "docs/fila/") or ""
+        for l in out.splitlines():
+            m = re.match(r"docs/fila/(\d{3}[a-z0-9]*)-.*\.md$", l)
+            if m and m.group(1) == tid:
+                return l
+        raise RuntimeError(f"sem arquivo para {tid}")
+
+    def sha_antes(self, arquivo, quando):
+        sha = (self.git("log", "--all", "-1", "--format=%H", f"--before={quando}", "--", arquivo) or "").strip()
+        if sha:
+            return sha, True
+        sha = (self.git("log", "--all", "--reverse", "--format=%H", "--", arquivo) or "").split()[0]
+        return sha, False
+
+    def config_em(self, quando):
+        sha = (self.git("log", "--all", "-1", "--format=%H", f"--before={quando}", "--", "docs/fila/000-config.json") or "").strip()
+        c = json.loads(self.git("show", f"{sha}:docs/fila/000-config.json"))
+        return {"diff_cap_linhas": c.get("diff_cap_linhas"), "claude_timeout_secs": c.get("claude_timeout_secs"),
+                "max_retries": c.get("max_retries"), "fonte": f"docs/fila/000-config.json@{sha[:12]}"}
+
+    def metas(self, tid):
+        out = []
+        for m in sorted(glob.glob(f"{self.runs}/{tid}/meta.json") + glob.glob(f"{self.runs}/{tid}.pre-requeue-*/meta.json")):
+            arr = json.load(open(m))
+            arr = arr if isinstance(arr, list) else [arr]
+            out.append((os.path.basename(os.path.dirname(m)), arr))
+        return out
+
+    def vermelhos_de_todos(self):
+        """[(ticket, dir_rel, arquivo, linha do 1º FAIL, mtime)] de todo FAIL de
+        runs/*/attempt-*/gate-vitest.txt."""
+        if self._vermelhos is None:
+            self._vermelhos = []
+            for gv in glob.glob(f"{self.runs}/*/attempt-*/gate-vitest.txt"):
+                rel = os.path.relpath(os.path.dirname(gv), self.raiz)
+                tid = rel.split("/")[3].split(".")[0]
+                with open(gv, encoding="utf-8", errors="replace") as f:
+                    t = ANSI.sub("", f.read())
+                vistos = {}
+                for n, l in enumerate(t.split("\n"), 1):
+                    m = re.match(r"^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)", l)
+                    if m and m.group(1) not in vistos:
+                        vistos[m.group(1)] = n
+                for arq, n in sorted(vistos.items()):
+                    self._vermelhos.append((tid, rel, arq, n, os.path.getmtime(gv)))
+        return self._vermelhos
+
+
+def iso(ts):
+    return datetime.fromtimestamp(ts, timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
+
+
+def ts_de(s):
+    return datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp()
+
+
+def mtime_dir(d):
+    return max((os.path.getmtime(p) for p in glob.glob(d + "/*")), default=0)
+
+
+def escolhe_dirs(cm, base, n, fim):
+    """attempt-1..n da série: entre attempt-k e attempt-k.prevJ, o de mtime mais
+    recente que não passe de fim + 180 s (spec §1)."""
+    out = []
+    for k in range(1, n + 1):
+        cands = glob.glob(f"{cm.runs}/{base}/attempt-{k}") + glob.glob(f"{cm.runs}/{base}/attempt-{k}.prev*")
+        best = None
+        for c in cands:
+            m = mtime_dir(c)
+            if m <= fim + 180 and (best is None or m > best[0]):
+                best = (m, c)
+        if not best:
+            raise RuntimeError(f"{base} attempt-{k}: nenhum diretório até fim+180")
+        out.append(best[1])
+    return out
+
+
+COPIA = ["gate-tsc.txt", "criterios.txt", "claude-output.txt", "verdict.json", "avaliador-claude.txt",
+         "diff.stat", "enforcement.json", "head.txt"]
+
+
+def recortar_criterios(texto):
+    """[(linha_original, texto)]: todo bloco `### criterio[i] -> X` com X != PASS
+    inteiro; do PASS, só a linha do cabeçalho."""
+    out, passa = [], False
+    for n, l in enumerate(texto.split("\n"), 1):
+        m = re.match(r"### \S+ -> (\S+)", l)
+        if m:
+            passa = m.group(1) == "PASS"
+            out.append((n, l))
+        elif not passa:
+            out.append((n, l))
+    return out
+
+
+OBJETIVO_MAX = 1500
+
+
+def ticket_da_fixture(tk):
+    """O 1º bloco json, mascarado, com o `objetivo` no tamanho que o triador lê
+    (spec §4: até 1500 caracteres)."""
+    tk = json.loads(mascarar(json.dumps(tk, ensure_ascii=False)))
+    obj = tk.get("objetivo")
+    if isinstance(obj, str) and len(obj) > OBJETIVO_MAX:
+        tk["objetivo"] = obj[:OBJETIVO_MAX]
+        tk["_objetivo_cortado_na_fixture"] = len(obj)
+    return tk
+
+
+def stat_arquivos(texto):
+    return [l.split("|")[0].strip() for l in (texto or "").splitlines() if "|" in l]
+
+
+def no_diff(arq, diff_arqs):
+    for d in diff_arqs:
+        if d == arq or (d.startswith(".../") and arq.endswith(d[3:])):
+            return True
+    return False
+
+
+def faixas(ns):
+    """[3,4,5,9] -> [[3,5],[9,9]]: o mapa de linhas originais, compacto."""
+    out = []
+    for n in ns:
+        if out and out[-1][1] == n - 1:
+            out[-1][1] = n
+        else:
+            out.append([n, n])
+    return out
+
+
+def escreve(caminho, conteudo):
+    os.makedirs(os.path.dirname(caminho), exist_ok=True)
+    with open(caminho, "w", encoding="utf-8") as f:
+        f.write(conteudo)
+
+
+def json_escreve(caminho, obj):
+    escreve(caminho, json.dumps(obj, ensure_ascii=False, indent=1) + "\n")
+
+
+def monta_serie(cm, destino, tid, al, dirs, fim):
+    """Copia as tentativas, o recorte, a presença e os fontes dos vermelhos."""
+    serie, vermelhos = [], set()
+    for k, d in enumerate(dirs, 1):
+        rel = os.path.relpath(d, cm.raiz)
+        serie.append({"k": k, "dir": rel})
+        alvo = os.path.join(destino, f"attempt-{k}")
+        os.makedirs(alvo, exist_ok=True)
+        presentes = sorted(os.listdir(d))
+        json_escreve(os.path.join(alvo, "presenca.json"), presentes)
+        for f in COPIA:
+            p = os.path.join(d, f)
+            if not os.path.exists(p):
+                continue
+            with open(p, encoding="utf-8", errors="replace") as fh:
+                txt = fh.read()
+            if f == "criterios.txt":
+                # Bloco PASS fica só com o cabeçalho; o FALHA vai inteiro. O
+                # mapa de linhas originais vai ao lado, como no gate-vitest.
+                sel = recortar_criterios(txt)
+                escreve(os.path.join(alvo, f), "\n".join(mascarar(t) for _, t in sel))
+                json_escreve(os.path.join(alvo, "criterios.linhas.json"),
+                             {"total": len(txt.split("\n")), "faixas": faixas([n for n, _ in sel])})
+            else:
+                escreve(os.path.join(alvo, f), mascarar(txt))
+        gv = os.path.join(d, "gate-vitest.txt")
+        if os.path.exists(gv):
+            with open(gv, encoding="utf-8", errors="replace") as fh:
+                bruto = fh.read()
+            rec = recortar(bruto)
+            escreve(os.path.join(alvo, "gate-vitest.txt"), "\n".join(mascarar(t) for _, t in rec))
+            json_escreve(os.path.join(alvo, "gate-vitest.linhas.json"), {"total": len(bruto.split("\n")), "faixas": faixas([n for n, _ in rec])})
+            limpo = ANSI.sub("", bruto)
+            fails = sorted(set(re.findall(r"^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)", limpo, re.M)))
+            head = open(os.path.join(d, "head.txt")).read().strip() if os.path.exists(os.path.join(d, "head.txt")) else ""
+            diff_arqs = stat_arquivos(open(os.path.join(d, "diff.stat")).read() if os.path.exists(os.path.join(d, "diff.stat")) else "")
+            for arq in fails:
+                vermelhos.add(arq)
+                if head and not cobre(al, arq) and not no_diff(arq, diff_arqs):
+                    fonte = cm.git("show", f"{head}:{arq}")
+                    if fonte is not None:
+                        # `.fonte` no fim: um `.test.ts` aqui dentro seria
+                        # coletado pelo vitest e pelo tsc do kit.
+                        escreve(os.path.join(destino, "fontes", head, arq + ".fonte"), mascarar(fonte))
+    json_escreve(os.path.join(destino, "serie.json"), serie)
+    # vizinhos: o mesmo arquivo vermelho em QUALQUER tentativa de runs/ nas ±6 h
+    linhas = ["ticket\tdir\tarquivo\tlinha\tts\tantes_do_bloqueio"]
+    for t2, rel, arq, n, m in sorted(cm.vermelhos_de_todos(), key=lambda x: (x[4], x[1], x[2])):
+        if arq in vermelhos and abs(m - fim) <= 6 * 3600:
+            linhas.append(f"{t2}\t{rel}\t{arq}\t{n}\t{iso(m)}\t{1 if m <= fim + 180 else 0}")
+    escreve(os.path.join(destino, "vizinhos.tsv"), "\n".join(linhas) + "\n")
+
+
+def trecho_do_log(cm, ini, fim_linha):
+    log = cm.log()
+    return "".join(f"{n}\t{mascarar(log[n - 1])}\n" for n in range(ini, fim_linha + 1))
+
+
+def inicio_da_serie(cm, tid, L):
+    """Linha da última drenagem com data antes do cabeçalho `tentativa 1` da série."""
+    log = cm.log()
+    cab = re.compile(rf"=== ticket {re.escape(tid)} \(.*\) — tentativa (\d+) ")
+    i, n = L - 1, 0
+    while i >= 0:
+        m = cab.search(log[i])
+        if m:
+            n += 1
+            if m.group(1) == "1":
+                break
+        i -= 1
+    if i < 0:
+        raise RuntimeError(f"{tid}@{L}: sem cabeçalho de tentativa 1")
+    j = i
+    while j >= 0 and not re.match(r"\[\d{4}-\d\d-\d\d ", log[j]):
+        j -= 1
+    return j + 1, n
+
+
+def acha_esperado(cm, destino, serie, citacoes):
+    """As citações da medição viram {arquivo (relativo à raiz), linha|null, origem}."""
+    out = []
+    for c in citacoes:
+        if c.startswith("L:"):
+            n = int(c[2:])
+            out.append({"arquivo": "docs/fila/runs/local-loop.log", "linha": n, "origem": "medicao"})
+        elif c.startswith("serie:"):
+            # `runs/<id>/attempt-*/<arquivo>` da medição: o arquivo em cada tentativa da série.
+            for s in serie:
+                out.append({"arquivo": f"{s['dir']}/{c[6:]}", "linha": None, "origem": "medicao"})
+        elif c.startswith("~"):
+            trecho = json.loads(c[1:])
+            for s in serie:
+                p = os.path.join(cm.raiz, s["dir"], "gate-vitest.txt")
+                if not os.path.exists(p):
+                    continue
+                with open(p, encoding="utf-8", errors="replace") as fh:
+                    for n, l in enumerate(ANSI.sub("", fh.read()).split("\n"), 1):
+                        if trecho in l:
+                            out.append({"arquivo": f"{s['dir']}/gate-vitest.txt", "linha": n, "origem": "trecho", "trecho": trecho})
+                            break
+        else:
+            arq, _, lin = c.partition(":")
+            out.append({"arquivo": "docs/fila/" + arq, "linha": int(lin) if lin else None, "origem": "medicao"})
+    return out
+
+
+REQUEUE = {"R1": "nao", "R2": "nao", "R3": "nao", "R4": "nao", "R7": "nao", "R6": "sim_apos:conserto_motor"}
+
+
+def requeue_de(classe, caso_id):
+    if classe != "R5":
+        return REQUEUE[classe]
+    if caso_id in ("940", "932"):
+        return "sim_apos:arvore_alvo_limpa"
+    if caso_id == "801":
+        return "sim_apos:maquina_ok"
+    return "sim_apos:base_verde"
+
+
+def monta_caso(cm, saida, nn, tid, L, classe, linha_med, citacoes):
+    ini, n = inicio_da_serie(cm, tid, L)
+    hora_L = cm.hora_da_linha(L).timestamp()
+    melhor = None
+    for base, arr in cm.metas(tid):
+        for a in arr:
+            if a.get("ts", "") >= INICIO_PERIODO and a.get("attempt") == n:
+                d = abs(ts_de(a["ts"]) - hora_L)
+                if melhor is None or d < melhor[0]:
+                    melhor = (d, base, a)
+    if melhor is None or melhor[0] > 300:
+        raise RuntimeError(f"{tid}@{L}: sem meta da tentativa {n} perto de {iso(hora_L)}")
+    _, base, ultima = melhor
+    fim = ts_de(ultima["ts"])
+    destino = os.path.join(saida, f"{nn:02d}-{tid}-L{L}")
+    arquivo = cm.arquivo_do_ticket(tid)
+    sha, antes = cm.sha_antes(arquivo, iso(fim))
+    tk = cm.ticket(sha, arquivo)
+    al = (tk or {}).get("pathspec_allowlist", [])
+    dirs = escolhe_dirs(cm, base, n, fim)
+    os.makedirs(destino, exist_ok=True)
+    json_escreve(os.path.join(destino, "ticket.json"), ticket_da_fixture(tk))
+    arr = next(a for b, a in cm.metas(tid) if b == base)
+    json_escreve(os.path.join(destino, "meta.json"), [a for a in arr if a.get("ts", "") <= iso(fim + 180)])
+    json_escreve(os.path.join(destino, "config.json"), cm.config_em(iso(fim)))
+    escreve(os.path.join(destino, "log.txt"), trecho_do_log(cm, ini, L))
+    monta_serie(cm, destino, tid, al, dirs, fim)
+    serie = json.load(open(os.path.join(destino, "serie.json")))
+    json_escreve(os.path.join(destino, "caso.json"), {
+        "id": tid, "repo": "comarka-operacional", "arquivo_ticket": arquivo, "ticket_sha": sha, "ticket_antes": antes,
+        "linha_bloqueio": L, "log_inicio": ini, "fim": iso(fim), "tentativas": n, "meta_dir": f"docs/fila/runs/{base}"})
+    json_escreve(os.path.join(destino, "esperado.json"), {
+        "classe": classe, "evidencia": acha_esperado(cm, destino, serie, citacoes),
+        "requeue": requeue_de(classe, tid), "fonte_da_verdade": f"{MEDICAO}:{linha_med}"})
+    return destino
+
+
+def monta_controle(cm, saida, nn, tid):
+    arr = next(a for b, a in cm.metas(tid) if b == tid)
+    arr = [a for a in arr if a.get("ts", "") >= INICIO_PERIODO]
+    ultima = arr[-1]
+    assert ultima["resultado"] == "done", tid
+    n, fim = ultima["attempt"], ts_de(ultima["ts"])
+    log = cm.log()
+    aprov = re.compile(rf"ticket {re.escape(tid)}: APROVADO e mergeado")
+    cands = [i + 1 for i, l in enumerate(log) if aprov.search(l)]
+    L = min(cands, key=lambda c: abs(cm.hora_da_linha(c).timestamp() - fim))
+    ini, n_log = inicio_da_serie(cm, tid, L)
+    assert n_log == n, (tid, n_log, n)
+    destino = os.path.join(saida, "controle", f"{nn:02d}-{tid}-L{L}")
+    arquivo = cm.arquivo_do_ticket(tid)
+    primeira = ts_de(arr[-n]["ts"]) - 3600
+    sha, antes = cm.sha_antes(arquivo, iso(primeira))
+    tk = cm.ticket(sha, arquivo)
+    al = (tk or {}).get("pathspec_allowlist", [])
+    dirs = escolhe_dirs(cm, tid, n, fim)
+    os.makedirs(destino, exist_ok=True)
+    json_escreve(os.path.join(destino, "ticket.json"), ticket_da_fixture(tk))
+    json_escreve(os.path.join(destino, "meta.json"), [a for a in arr if a.get("ts", "") <= iso(fim + 180)])
+    json_escreve(os.path.join(destino, "config.json"), cm.config_em(iso(fim)))
+    escreve(os.path.join(destino, "log.txt"), trecho_do_log(cm, ini, L))
+    monta_serie(cm, destino, tid, al, dirs, fim)
+    json_escreve(os.path.join(destino, "caso.json"), {
+        "id": tid, "repo": "comarka-operacional", "arquivo_ticket": arquivo, "ticket_sha": sha, "ticket_antes": antes,
+        "linha_bloqueio": None, "linha_fim": L, "log_inicio": ini, "fim": iso(fim), "tentativas": n,
+        "meta_dir": f"docs/fila/runs/{tid}"})
+    json_escreve(os.path.join(destino, "esperado.json"), {
+        "classe": None, "controle": True, "firme_proibido": True,
+        "fonte_da_verdade": f"{MEDICAO}:179 (controle: done do período sem bloqueio)"})
+    return destino
+
+
+INTEIROS = [("627j", "docs/fila/runs/627j/attempt-3/gate-vitest.txt"),
+            ("627b", "docs/fila/runs/627b/attempt-1.prev1/gate-vitest.txt"),
+            ("600", "docs/fila/runs/600/attempt-3/gate-vitest.txt")]
+
+
+def main():
+    ap = argparse.ArgumentParser()
+    ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
+    ap.add_argument("--saida", default=AQUI)
+    a = ap.parse_args()
+    cm = Comarka(os.path.abspath(a.comarka))
+    for d in (glob.glob(os.path.join(a.saida, "[0-9][0-9]-*")) + glob.glob(os.path.join(a.saida, "controle", "[0-9][0-9]-*"))
+              + [os.path.join(a.saida, "vitest-inteiros")]):
+        subprocess.run(["rm", "-rf", d], check=True)
+    for nn, (tid, L, classe, lm, cit) in enumerate(CASOS, 1):
+        print("caso", nn, tid, L, file=sys.stderr)
+        monta_caso(cm, a.saida, nn, tid, L, classe, lm, cit)
+    for nn, tid in enumerate(CONTROLE, 1):
+        print("controle", nn, tid, file=sys.stderr)
+        monta_controle(cm, a.saida, nn, tid)
+    # Três gate-vitest INTEIROS (sem recorte, só com a máscara), para o teste da
+    # peça 2 provar que o recorte guarda todo FAIL e todo ❯.
+    for tid, rel in INTEIROS:
+        with open(os.path.join(cm.raiz, rel), encoding="utf-8", errors="replace") as fh:
+            inteiro = mascarar(fh.read())
+        os.makedirs(os.path.join(a.saida, "vitest-inteiros"), exist_ok=True)
+        # gzip com mtime 0: o mesmo conteúdo dá os mesmos bytes (montagem reproduzível).
+        with open(os.path.join(a.saida, "vitest-inteiros", f"{tid}.txt.gz"), "wb") as fh:
+            fh.write(gzip.compress(inteiro.encode("utf-8"), mtime=0))
+        json_escreve(os.path.join(a.saida, "vitest-inteiros", f"{tid}.recorte.json"), faixas([n for n, _ in recortar(inteiro)]))
+    json_escreve(os.path.join(a.saida, "vitest-inteiros", "origem.json"), dict(INTEIROS))
+
+
+if __name__ == "__main__":
+    main()
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
new file mode 100644
index 0000000..e25da5c
--- /dev/null
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -0,0 +1,133 @@
+/**
+ * Etapa 7f · aceite do triador de bloqueios (spec 7f-a §7.2), sobre a fixture
+ * dos 37 bloqueios da medição de 09/10 e dos 20 de controle.
+ *
+ *   (A) só extração: os 7 R5 e R6 saem com classe firme certa e ao menos uma
+ *       evidência igual a uma do esperado.json (mesmo arquivo; linha a ±3 no
+ *       original), com `vizinhos.tsv` inteiro (o estado depois da passada G3).
+ *       Com só os vizinhos de antes do bloqueio, 760 e 898 #31 saem `R5?`, não
+ *       firmes. O teste fixa os dois instantes.
+ *   (B) zero firme errado nos 37, e os 16 firmes certos são os da spec §3.3.
+ *   (controle) nenhum dos 20 sai firme.
+ *   (C) extração + modelo, por replay de `resposta-modelo.json`: peça 6, que
+ *       não é da 7f-b1 (a sessão não chama modelo).
+ *
+ * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
+ * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 16 firmes), não
+ * de import quebrado.
+ */
+import { existsSync, readdirSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { describe, expect, it } from 'vitest'
+
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
+const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/
+
+interface Ref {
+  arquivo: string
+  linha: number | null
+}
+interface Extracao {
+  classe: string | null
+  firme: boolean
+  regra: string | null
+  evidencia: Ref[]
+}
+interface Esperado {
+  classe: string | null
+  evidencia?: Ref[]
+}
+type Instante = 'bloqueio' | 'passada'
+interface Triador {
+  lerCasoDeFixture: (dir: string, opts?: { instante?: Instante }) => unknown
+  extrair: (ev: never) => Extracao
+}
+
+async function carregar(): Promise<Triador | null> {
+  try {
+    const leitor = (await import(pathToFileURL(join(TRIADOR, 'leitor-legado-comarka.ts')).href)) as Partial<Triador>
+    const extrator = (await import(pathToFileURL(join(TRIADOR, 'extrair.ts')).href)) as Partial<Triador>
+    if (!leitor.lerCasoDeFixture || !extrator.extrair) return null
+    return { lerCasoDeFixture: leitor.lerCasoDeFixture, extrair: extrator.extrair }
+  } catch {
+    return null
+  }
+}
+
+const SEM_DIAGNOSTICO: Extracao = { classe: null, firme: false, regra: null, evidencia: [] }
+const nomes = (sub = '') =>
+  existsSync(join(FX, sub)) ? readdirSync(join(FX, sub)).filter((d) => CASO_RE.test(d)).sort() : []
+
+async function triarTodos(sub: string, instante: Instante): Promise<Map<string, Extracao>> {
+  const t = await carregar()
+  const out = new Map<string, Extracao>()
+  for (const nome of nomes(sub)) {
+    if (!t) {
+      out.set(nome, SEM_DIAGNOSTICO)
+      continue
+    }
+    out.set(nome, t.extrair(t.lerCasoDeFixture(join(FX, sub, nome), { instante }) as never))
+  }
+  return out
+}
+
+function esperado(nome: string): Esperado {
+  return JSON.parse(readFileSync(join(FX, nome, 'esperado.json'), 'utf8')) as Esperado
+}
+
+/** Mesmo arquivo; linha a ±3 (linha nula no esperado casa qualquer linha do arquivo). */
+function evidenciaCasa(dada: Ref[], esp: Ref[]): boolean {
+  return dada.some((d) =>
+    esp.some((e) => e.arquivo === d.arquivo && (e.linha === null || (d.linha !== null && Math.abs(d.linha - e.linha) <= 3))),
+  )
+}
+
+// Spec §3.3: os 16 firmes e certos.
+const FIRMES_DA_SPEC = [
+  '07-627j-L57368', '11-689-L65280', '13-346d-L66187', '15-722-L67970', '17-715-L68793',
+  '22-762-L72665', '23-856-L73817', '26-711b3-L78647', '35-950-L85145',
+  '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272',
+  '16-723-L68736',
+].sort()
+const R5_R6 = ['16-723-L68736', '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272']
+
+describe('aceite do triador (spec 7f-a §7.2)', () => {
+  it('(A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada)', async () => {
+    const r = await triarTodos('', 'passada')
+    const placar = R5_R6.map((nome) => {
+      const x = r.get(nome) ?? SEM_DIAGNOSTICO
+      const e = esperado(nome)
+      return { nome, classe: x.classe, firme: x.firme, certa: x.classe === e.classe, evidencia: evidenciaCasa(x.evidencia, e.evidencia ?? []) }
+    })
+    expect(placar.filter((p) => p.firme && p.certa && p.evidencia).map((p) => p.nome), JSON.stringify(placar)).toEqual(R5_R6)
+  })
+
+  it('(A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)', async () => {
+    const r = await triarTodos('', 'bloqueio')
+    for (const nome of ['21-760-L72407', '31-898-L82594']) {
+      expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.firme }).toEqual({ nome, classe: 'R5?', firme: false })
+    }
+    const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
+    expect(firmes).toHaveLength(14)
+  })
+
+  it('(B) zero firme errado nos 37, e os firmes certos são os 16 da spec', async () => {
+    const r = await triarTodos('', 'passada')
+    const firmes = [...r].filter(([, x]) => x.firme)
+    const errados = firmes.filter(([n, x]) => x.classe !== esperado(n).classe).map(([n, x]) => `${n}=${x.classe}`)
+    expect(errados).toEqual([])
+    expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
+  })
+
+  it('(controle) nenhum dos 20 done sai firme, nos dois instantes', async () => {
+    for (const instante of ['bloqueio', 'passada'] as const) {
+      const r = await triarTodos('controle', instante)
+      expect(r.size).toBe(20)
+      expect([...r].filter(([, x]) => x.firme).map(([n, x]) => `${n}=${x.classe}`)).toEqual([])
+    }
+  })
+
+  it.todo('(C) extração + modelo ≥ 30/37 por replay de resposta-modelo.json (peça 6, fora da 7f-b1)')
+})
diff --git a/test/orquestrador-triador-fixture.test.ts b/test/orquestrador-triador-fixture.test.ts
new file mode 100644
index 0000000..261dadb
--- /dev/null
+++ b/test/orquestrador-triador-fixture.test.ts
@@ -0,0 +1,171 @@
+/**
+ * Etapa 7f-b1, peça 1 · a fixture do triador (spec 7f-a §7.1).
+ *
+ * Sanidade do que `test/fixtures/triador-7f/montar.py` montou a partir do
+ * comarka-operacional: os 37 bloqueios da medição de 09/10, os 20 de controle,
+ * a classe e a linha da medição em cada `esperado.json`, o mapa de linhas dos
+ * recortes e o teto de tamanho. O aceite do triador mora em
+ * `orquestrador-triador-aceite.test.ts`; este arquivo só prova que a régua
+ * existe e é a da medição.
+ */
+import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
+import { join } from 'node:path'
+import { gunzipSync } from 'node:zlib'
+import { describe, expect, it } from 'vitest'
+
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/
+
+const casos = () => (existsSync(FX) ? readdirSync(FX).filter((d) => CASO_RE.test(d)).sort() : [])
+const controles = () =>
+  existsSync(join(FX, 'controle')) ? readdirSync(join(FX, 'controle')).filter((d) => CASO_RE.test(d)).sort() : []
+const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
+
+interface Esperado {
+  classe: string | null
+  evidencia?: { arquivo: string; linha: number | null; origem: string }[]
+  requeue?: string
+  fonte_da_verdade: string
+  controle?: boolean
+  firme_proibido?: boolean
+}
+interface Caso {
+  id: string
+  tentativas: number
+  log_inicio: number
+  linha_bloqueio: number | null
+}
+
+function bytesDe(dir: string): number {
+  let n = 0
+  for (const e of readdirSync(dir, { withFileTypes: true })) {
+    const p = join(dir, e.name)
+    n += e.isDirectory() ? bytesDe(p) : statSync(p).size
+  }
+  return n
+}
+
+function todosOsDiretorios(): string[] {
+  return [...casos().map((c) => join(FX, c)), ...controles().map((c) => join(FX, 'controle', c))]
+}
+
+function faixasContam(faixas: [number, number][]): number {
+  return faixas.reduce((s, [a, b]) => s + (b - a + 1), 0)
+}
+
+describe('fixture triador-7f (peça 1)', () => {
+  it('37 casos de bloqueio e 20 de controle', () => {
+    expect(casos()).toHaveLength(37)
+    expect(controles()).toHaveLength(20)
+  })
+
+  it('esperado.json traz a classe e a linha da tabela da medição (102-138), uma linha por caso', () => {
+    const linhas = casos().map((c) => {
+      const e = json<Esperado>(join(FX, c, 'esperado.json'))
+      const m = /^medicao-bloqueios-out\.md:(\d+)$/.exec(e.fonte_da_verdade)
+      expect(m, `${c}: fonte_da_verdade "${e.fonte_da_verdade}"`).not.toBeNull()
+      expect(e.classe, c).toMatch(/^R[1-7]$/)
+      return Number(m![1])
+    })
+    expect(linhas.sort((a, b) => a - b)).toEqual(Array.from({ length: 37 }, (_, i) => 102 + i))
+  })
+
+  it('contagem por classe é a da §5 da medição: 11/9/5/4/6/1/1', () => {
+    const n: Record<string, number> = {}
+    for (const c of casos()) {
+      const k = json<Esperado>(join(FX, c, 'esperado.json')).classe ?? 'null'
+      n[k] = (n[k] ?? 0) + 1
+    }
+    expect(n).toEqual({ R1: 11, R2: 9, R3: 5, R4: 4, R5: 6, R6: 1, R7: 1 })
+  })
+
+  it('toda evidência esperada aponta artefato da série ou linha do log que está no trecho', () => {
+    for (const c of casos()) {
+      const e = json<Esperado>(join(FX, c, 'esperado.json'))
+      const serie = json<{ k: number; dir: string }[]>(join(FX, c, 'serie.json'))
+      const caso = json<Caso>(join(FX, c, 'caso.json'))
+      const log = new Set(
+        readFileSync(join(FX, c, 'log.txt'), 'utf8')
+          .split('\n')
+          .filter(Boolean)
+          .map((l) => Number(l.split('\t')[0])),
+      )
+      expect(e.evidencia?.length ?? 0, `${c}: sem evidência esperada`).toBeGreaterThan(0)
+      for (const ev of e.evidencia ?? []) {
+        if (ev.arquivo === 'docs/fila/runs/local-loop.log') {
+          expect(log.has(ev.linha!), `${c}: L:${ev.linha} fora do log.txt (início ${caso.log_inicio})`).toBe(true)
+        } else {
+          const dir = ev.arquivo.slice(0, ev.arquivo.lastIndexOf('/'))
+          expect(serie.map((s) => s.dir), `${c}: ${ev.arquivo}`).toContain(dir)
+        }
+      }
+    }
+  })
+
+  it('cada caso tem o que o triador lê, e uma attempt-K por tentativa, com presenca.json', () => {
+    for (const d of todosOsDiretorios()) {
+      for (const f of ['caso.json', 'ticket.json', 'meta.json', 'config.json', 'log.txt', 'serie.json', 'vizinhos.tsv', 'esperado.json']) {
+        expect(existsSync(join(d, f)), `${d}/${f}`).toBe(true)
+      }
+      const caso = json<Caso>(join(d, 'caso.json'))
+      const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
+      expect(serie.map((s) => s.k)).toEqual(Array.from({ length: caso.tentativas }, (_, i) => i + 1))
+      for (const s of serie) {
+        expect(json<string[]>(join(d, `attempt-${s.k}`, 'presenca.json')).length, `${d} attempt-${s.k}`).toBeGreaterThan(0)
+      }
+      expect(readFileSync(join(d, 'vizinhos.tsv'), 'utf8').split('\n')[0]).toBe(
+        'ticket\tdir\tarquivo\tlinha\tts\tantes_do_bloqueio',
+      )
+    }
+  })
+
+  it('o mapa de linhas originais tem uma entrada por linha do recorte (gate-vitest e criterios)', () => {
+    for (const d of todosOsDiretorios()) {
+      for (const k of readdirSync(d).filter((x) => /^attempt-\d+$/.test(x))) {
+        for (const base of ['gate-vitest', 'criterios']) {
+          const txt = join(d, k, `${base}.txt`)
+          if (!existsSync(txt)) continue
+          const mapa = json<{ total: number; faixas: [number, number][] }>(join(d, k, `${base}.linhas.json`))
+          const n = readFileSync(txt, 'utf8').split('\n').length
+          expect(faixasContam(mapa.faixas), `${d}/${k}/${base}`).toBe(n)
+          expect(mapa.faixas.at(-1)![1]).toBeLessThanOrEqual(mapa.total)
+        }
+      }
+    }
+  })
+
+  it('controle: done do período, sem classe e com firme proibido', () => {
+    for (const c of controles()) {
+      const e = json<Esperado>(join(FX, 'controle', c, 'esperado.json'))
+      expect(e).toMatchObject({ classe: null, controle: true, firme_proibido: true })
+      const meta = json<{ resultado: string }[]>(join(FX, 'controle', c, 'meta.json'))
+      expect(meta.at(-1)!.resultado, c).toBe('done')
+    }
+  })
+
+  it('cabe em 3 MB e não carrega segredo sem máscara', () => {
+    expect(bytesDe(FX)).toBeLessThan(3 * 1024 * 1024)
+    const segredo = /\bsk-[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}|\bSUPABASE_[A-Z_]*=[^\s"'‹]{8,}/
+    const varre = (dir: string): void => {
+      for (const e of readdirSync(dir, { withFileTypes: true })) {
+        const p = join(dir, e.name)
+        if (e.isDirectory()) varre(p)
+        else if (!p.endsWith('.gz') && !p.endsWith('montar.py')) {
+          expect(segredo.test(readFileSync(p, 'utf8')), p).toBe(false)
+        }
+      }
+    }
+    if (existsSync(FX)) varre(FX)
+  })
+
+  it('três gate-vitest inteiros (gzip) com o recorte de referência do montar.py', () => {
+    const dir = join(FX, 'vitest-inteiros')
+    const origem = existsSync(join(dir, 'origem.json')) ? json<Record<string, string>>(join(dir, 'origem.json')) : {}
+    expect(Object.keys(origem)).toHaveLength(3)
+    for (const id of Object.keys(origem)) {
+      const txt = gunzipSync(readFileSync(join(dir, `${id}.txt.gz`))).toString('utf8')
+      expect(txt).toMatch(/FAIL /)
+      expect(json<[number, number][]>(join(dir, `${id}.recorte.json`)).length).toBeGreaterThan(0)
+    }
+  })
+})
```

### 81574fc
```diff
commit 81574fc4ecfb7be04767ae27d35c7fd7b017a61f
Author: Lucas Santos
Date: Sat Oct 10 18:39:41 2026 -0300

7f-b1-2: leitores kit e legado-comarka produzindo a mesma Evidencia

scripts/orquestrador/triador/:
- tipos.ts: Evidencia, Tentativa, Ref (arquivo e linha do original);
- recorte.ts: recorte do gate de testes (fortes, fracas, contexto 6, teto
  300, sem quadro de pilha) e dos criterios, o mesmo algoritmo do montar.py;
- comum.ts: ticket (1o bloco json), vermelhos (primeiroLocal do
  diagnostico.ts), criterios falhos, diff.stat/diff.patch, juiz;
- leitor-legado-comarka.ts: estagio pela presenca, serie attempt-1..n com
  a variante .prevK de mtime <= fim + 180 s, merge recusado do log; duas
  fontes (repo e caso da fixture) na mesma normalizacao;
- leitor-kit.ts: events.log (BLOQUEADO, INICIO), meta.json, attempt-N;
- leitor.ts: o leitor sai da forma do diretorio;
- git.ts: gitLeitura, unico ponto de git (verbos de leitura,
  GIT_OPTIONAL_LOCKS=0).

orquestrador-triador-leitores.test.ts: estagio = presenca nos 57 casos;
recorte guarda todo FAIL e ❯ e bate com o do montar.py; repo do molde
test-fixture-painel.sh lido pelo leitor kit; repo do legado materializado
da fixture da a mesma evidencia.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orquestrador/triador/comum.ts b/scripts/orquestrador/triador/comum.ts
new file mode 100644
index 0000000..dfbe730
--- /dev/null
+++ b/scripts/orquestrador/triador/comum.ts
@@ -0,0 +1,190 @@
+/**
+ * comum.ts — leituras puras que os dois leitores dividem: o 1º bloco json do
+ * ticket, os vermelhos do gate de testes, os critérios que falharam, o
+ * diff.stat e o veredito do juiz. Recebem `Arquivo` (linhas com o número do
+ * original) e devolvem `Ref` que apontam o original.
+ */
+import { primeiroLocal } from '../diagnostico.js'
+import { trecho } from './recorte.js'
+import type { Arquivo, CriterioFalho, Juiz, Ref, TicketLido, Vermelho } from './tipos.js'
+
+export const ref = (a: Arquivo, n: number | null, t: string): Ref => ({ arquivo: a.rel, linha: n, trecho: trecho(t) })
+
+/** O PRIMEIRO bloco ```json de um ticket .md (CONTRATO §2). */
+export function blocoJson(md: string): Record<string, unknown> | null {
+  const m = /```json\n([\s\S]*?)\n```/.exec(md)
+  if (!m) return null
+  try {
+    const v = JSON.parse(m[1]!) as unknown
+    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : null
+  } catch {
+    return null
+  }
+}
+
+const str = (v: unknown): string => (typeof v === 'string' ? v : '')
+
+export function ticketLido(arquivo: string, j: Record<string, unknown> | null): TicketLido | null {
+  if (!j) return null
+  return {
+    arquivo,
+    id: str(j.id),
+    slug: str(j.slug),
+    status: str(j.status),
+    notas_status: str(j.notas_status),
+    objetivo: str(j.objetivo),
+    pathspec_allowlist: Array.isArray(j.pathspec_allowlist) ? j.pathspec_allowlist.filter((x): x is string => typeof x === 'string') : [],
+    criterios_aceite: Array.isArray(j.criterios_aceite) ? j.criterios_aceite : [],
+  }
+}
+
+const ARQ_TESTE = String.raw`\S+\.(?:test|spec)\.[cm]?[jt]sx?`
+const RE_FAIL = new RegExp(String.raw`^\s*FAIL\s+(${ARQ_TESTE})(?:\s+(?:>\s+)?(.*))?$`)
+const RE_LOCAL = new RegExp(String.raw`❯\s+(${ARQ_TESTE}):(\d+):\d+`)
+const RE_MAQUINA = /Timeout waiting for worker|Timeout starting|\bEMFILE\b|\bENOSPC\b/
+
+/**
+ * Os vermelhos de um recorte de gate de testes: um por `❯ arquivo:linha`
+ * (o local, por `primeiroLocal` do diagnostico.ts), e um por arquivo com FAIL
+ * que não teve local. O `it` é o nome do FAIL mais recente do mesmo arquivo.
+ */
+export function vermelhosDe(a: Arquivo): { vermelhos: Vermelho[]; arquivos: string[]; maquina: Ref[] } {
+  const vermelhos: Vermelho[] = []
+  const arquivos: string[] = []
+  const comLocal = new Set<string>()
+  const ultimoIt = new Map<string, string>()
+  const primeiroFail = new Map<string, { n: number; t: string; it: string | null }>()
+  const maquina: Ref[] = []
+  for (const l of a.linhas) {
+    const f = RE_FAIL.exec(l.t)
+    if (f) {
+      const arq = f[1]!
+      if (!arquivos.includes(arq)) arquivos.push(arq)
+      const it = (f[2] ?? '').replace(/\s*\[.*\]\s*$/, '').trim() || null
+      if (it) ultimoIt.set(arq, it)
+      if (!primeiroFail.has(arq)) primeiroFail.set(arq, { n: l.n, t: l.t, it })
+      continue
+    }
+    if (RE_LOCAL.test(l.t)) {
+      const loc = primeiroLocal(l.t.slice(l.t.indexOf('❯')))
+      if (loc.arquivo) {
+        comLocal.add(loc.arquivo)
+        if (!vermelhos.some((v) => v.arquivo === loc.arquivo && v.linha === loc.linha)) {
+          vermelhos.push({ arquivo: loc.arquivo, linha: loc.linha, it: ultimoIt.get(loc.arquivo) ?? null, ref: ref(a, l.n, l.t) })
+        }
+      }
+    }
+    if (RE_MAQUINA.test(l.t)) maquina.push(ref(a, l.n, l.t))
+  }
+  for (const [arq, f] of primeiroFail) {
+    if (!comLocal.has(arq)) vermelhos.push({ arquivo: arq, linha: null, it: f.it, ref: ref(a, f.n, f.t) })
+  }
+  return { vermelhos, arquivos, maquina }
+}
+
+/** Blocos `### criterio[i] -> X` com X != PASS do criterios.txt do legado. */
+export function criteriosFalhosLegado(a: Arquivo): CriterioFalho[] {
+  const out: CriterioFalho[] = []
+  let atual: CriterioFalho | null = null
+  let naSaida = false
+  for (const l of a.linhas) {
+    const h = /^### (\S+) -> (\S+)/.exec(l.t)
+    if (h) {
+      atual = h[2] === 'PASS' ? null : { criterio: h[1]!, cmd: '', espera: '', saida: [], ref: ref(a, l.n, l.t) }
+      if (atual) out.push(atual)
+      naSaida = false
+      continue
+    }
+    if (!atual) continue
+    if (naSaida) {
+      if (l.t.trim() && atual.saida.length < 2) atual.saida.push(l.t)
+      continue
+    }
+    const cmd = /^cmd:\s*(.*)$/.exec(l.t)
+    const esp = /^espera:\s*(.*)$/.exec(l.t)
+    if (cmd) atual.cmd = cmd[1]!
+    else if (esp) atual.espera = esp[1]!
+    else if (/^-- saida --/.test(l.t)) naSaida = true
+  }
+  return out
+}
+
+/** Blocos `### <descrição>` do criterios.txt do kit cujas descrições reprovaram. */
+export function criteriosFalhosKit(a: Arquivo, falhos: string[]): CriterioFalho[] {
+  const out: CriterioFalho[] = []
+  let atual: CriterioFalho | null = null
+  for (const l of a.linhas) {
+    const h = /^### (.*)$/.exec(l.t)
+    if (h) {
+      atual = falhos.includes(h[1]!.trim()) ? { criterio: h[1]!.trim(), cmd: '', espera: '', saida: [], ref: ref(a, l.n, l.t) } : null
+      if (atual) out.push(atual)
+      continue
+    }
+    if (!atual) continue
+    const m = /^(cmd|espera|saida):\s*(.*)$/.exec(l.t)
+    if (m?.[1] === 'cmd') atual.cmd = m[2]!
+    else if (m?.[1] === 'espera') atual.espera = m[2]!
+    else if (m?.[1] === 'saida') atual.saida.push(m[2]!)
+  }
+  return out
+}
+
+/** diff.stat: arquivos (coluna antes do `|`) e inserções + deleções da última linha de resumo. */
+export function diffStat(a: Arquivo): { arquivos: string[]; linhas: number | null; ref: Ref | null } {
+  const arquivos = a.linhas.filter((l) => l.t.includes('|')).map((l) => l.t.split('|')[0]!.trim())
+  let resumo: { n: number; t: string } | null = null
+  for (const l of a.linhas) if (/\d+ files? changed/.test(l.t)) resumo = l
+  if (!resumo) return { arquivos, linhas: arquivos.length ? null : 0, ref: null }
+  const ins = /(\d+) insertions?\(\+\)/.exec(resumo.t)
+  const del = /(\d+) deletions?\(-\)/.exec(resumo.t)
+  return { arquivos, linhas: Number(ins?.[1] ?? 0) + Number(del?.[1] ?? 0), ref: ref(a, resumo.n, resumo.t) }
+}
+
+/** diff.patch do kit: arquivos de `+++ b/` e linhas +/- sem cabeçalho. */
+export function diffPatch(a: Arquivo): { arquivos: string[]; linhas: number; ref: Ref | null } {
+  const arquivos: string[] = []
+  let linhas = 0
+  for (const l of a.linhas) {
+    if (l.t.startsWith('+++ ')) {
+      const f = l.t.slice(4).replace(/^b\//, '').trim()
+      if (f !== '/dev/null' && !arquivos.includes(f)) arquivos.push(f)
+    } else if (l.t.startsWith('--- ')) continue
+    else if ((l.t.startsWith('+') || l.t.startsWith('-')) && !l.t.startsWith('+++') && !l.t.startsWith('---')) linhas++
+  }
+  const primeira = a.linhas[0]
+  return { arquivos, linhas, ref: primeira ? ref(a, primeira.n, `${arquivos.length} arquivo(s), ${linhas} linhas +/-`) : null }
+}
+
+/**
+ * O JSON do juiz num arquivo que pode ter texto em volta: a ÚLTIMA linha que o
+ * JSON.parse aceita com `aprovado` (o mesmo varrer de trás para frente do
+ * avaliador do legado).
+ */
+export function juizDe(a: Arquivo): Juiz | null {
+  const tenta = (s: string): Record<string, unknown> | null => {
+    try {
+      const v = JSON.parse(s) as unknown
+      return v && typeof v === 'object' && 'aprovado' in (v as object) ? (v as Record<string, unknown>) : null
+    } catch {
+      return null
+    }
+  }
+  const inteiro = tenta(a.linhas.map((l) => l.t).join('\n'))
+  if (inteiro) return juizDoObjeto(a, inteiro, a.linhas[0]?.n ?? 1, a.linhas[0]?.t ?? '')
+  for (let i = a.linhas.length - 1; i >= 0; i--) {
+    const l = a.linhas[i]!
+    const j = tenta(l.t.trim())
+    if (j) return juizDoObjeto(a, j, l.n, l.t)
+  }
+  return null
+}
+
+function juizDoObjeto(a: Arquivo, j: Record<string, unknown>, n: number, t: string): Juiz {
+  const cf = j.criterios_falhos
+  return {
+    aprovado: typeof j.aprovado === 'boolean' ? j.aprovado : null,
+    motivo: str(j.motivo),
+    criterios_falhos: Array.isArray(cf) ? cf.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))) : [],
+    ref: ref(a, n, t),
+  }
+}
diff --git a/scripts/orquestrador/triador/git.ts b/scripts/orquestrador/triador/git.ts
new file mode 100644
index 0000000..f3810e8
--- /dev/null
+++ b/scripts/orquestrador/triador/git.ts
@@ -0,0 +1,37 @@
+/**
+ * git.ts — o ÚNICO ponto onde o triador chama git (spec 7f-a §6, regra 3).
+ *
+ * Só leitura e só com `GIT_OPTIONAL_LOCKS=0`: um `git status` comum regrava o
+ * índice (refresh de stat) e cria `index.lock` no repo de outro processo; o
+ * loop do repo instalado pode estar rodando na mesma hora. Verbos permitidos:
+ * `show`, `log`, `status --porcelain`, `rev-parse`, `ls-tree`. Qualquer outro
+ * lança exceção, antes de existir processo.
+ *
+ * O binário é o `git` do PATH: o teste da peça 4 põe um git falso na frente e
+ * confere o ambiente de cada chamada.
+ */
+import { spawnSync } from 'node:child_process'
+
+const PERMITIDOS = new Set(['show', 'log', 'rev-parse', 'ls-tree', 'status'])
+
+export class GitProibido extends Error {}
+
+export interface ResultadoGit {
+  rc: number
+  stdout: string
+}
+
+export function gitLeitura(raiz: string, args: string[]): ResultadoGit {
+  const verbo = args[0] ?? ''
+  if (!PERMITIDOS.has(verbo)) throw new GitProibido(`gitLeitura: verbo proibido "${verbo}"`)
+  if (verbo === 'status' && !args.includes('--porcelain')) {
+    throw new GitProibido('gitLeitura: status só com --porcelain')
+  }
+  const r = spawnSync('git', ['-C', raiz, ...args], {
+    encoding: 'utf8',
+    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
+    maxBuffer: 64 * 1024 * 1024,
+    stdio: ['ignore', 'pipe', 'pipe'],
+  })
+  return { rc: r.status ?? 1, stdout: r.stdout ?? '' }
+}
diff --git a/scripts/orquestrador/triador/leitor-kit.ts b/scripts/orquestrador/triador/leitor-kit.ts
new file mode 100644
index 0000000..e0ddd68
--- /dev/null
+++ b/scripts/orquestrador/triador/leitor-kit.ts
@@ -0,0 +1,248 @@
+/**
+ * leitor-kit.ts — o leitor de um repo com o motor do kit (CONTRATO §4 e §5).
+ *
+ * Fontes: o 1º bloco json do ticket (§2), a trilha `runs/events.log` (§4: o
+ * último `BLOQUEADO` do id e os `INICIO` da série), `runs/<id>/meta.json` e
+ * `runs/<id>/attempt-N/` (§5.2-5.3: `gates.txt`, `enforcement.json`,
+ * `criterios.txt`, `veredito.json`, `juiz.veredito.json`, `claude.txt`,
+ * `diff.patch`). O `attempt=N` da trilha é 1-based e o diretório é
+ * `attempt-(N-1)` (CONTRATO §5.3).
+ *
+ * SÓ LEITURA. O kit não guarda o HEAD julgado por tentativa: sem `head`, o
+ * acoplamento fica `null` e a regra R1 vira palpite (§2, "se faltar").
+ */
+import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
+import { join } from 'node:path'
+import { blocoJson, criteriosFalhosKit, diffPatch, juizDe, ref, ticketLido, vermelhosDe } from './comum.js'
+import { faixas, linhasDe } from './recorte.js'
+import type { Arquivo, Estagio, Evidencia, Lido, Ref, Tentativa, Vizinho } from './tipos.js'
+
+interface LinhaTrilha {
+  n: number
+  t: string
+  ts: string
+  id: string
+  evento: string
+  campos: Record<string, string>
+}
+
+function parseTrilha(txt: string): LinhaTrilha[] {
+  const out: LinhaTrilha[] = []
+  txt.split('\n').forEach((t, i) => {
+    const m = /^(\S+)\s+(\S+)\s+([A-Z_]+)(.*)$/.exec(t)
+    if (!m) return
+    const campos: Record<string, string> = {}
+    for (const c of m[4]!.matchAll(/(\w+)=(\S*)/g)) campos[c[1]!] = c[2]!
+    out.push({ n: i + 1, t, ts: m[1]!, id: m[2]!, evento: m[3]!, campos })
+  })
+  return out
+}
+
+function lerJson<T>(p: string): T | null {
+  try {
+    return JSON.parse(readFileSync(p, 'utf8')) as T
+  } catch {
+    return null
+  }
+}
+
+function estagioKit(dirAbs: string, gates: string | null, ultimo: boolean, motivoBloq: string | null): Estagio {
+  const vd = lerJson<{ desfecho?: string; causa?: string; sub?: string }>(join(dirAbs, 'veredito.json'))
+  const jz = lerJson<{ aprovado?: boolean }>(join(dirAbs, 'juiz.veredito.json'))
+  if (ultimo && motivoBloq === 'merge_falhou' && jz?.aprovado === true) return 'juiz_ok_merge_falhou'
+  if (vd?.causa === 'diff_cap') return 'diff_cap'
+  if (vd?.causa === 'enforcement' || vd?.causa === 'arquivo_solto') return 'enforcement'
+  const falho = gates ? /^FALHA\s+(\S+)/m.exec(gates)?.[1] : undefined
+  if (falho) {
+    if (/test|vitest|spec/i.test(falho)) return 'vitest'
+    if (/typecheck|tsc/i.test(falho)) return 'tsc'
+    if (/build/i.test(falho)) return 'build'
+    return 'gate'
+  }
+  if (vd?.causa === 'base_vermelha') return 'vitest'
+  if (jz?.aprovado === false || vd?.sub === 'juiz') return 'juiz'
+  if (vd?.sub === 'criterio') return 'criterios'
+  if (vd?.desfecho === 'aprovado') return 'aprovado'
+  const presentes = existsSync(dirAbs) ? readdirSync(dirAbs) : []
+  if (presentes.every((f) => f === 'prompt.txt' || f === 'claude.txt')) return 'agente'
+  return 'desconhecido'
+}
+
+export function lerRepoKit(raiz: string, id: string): Evidencia {
+  const falta: string[] = []
+  const cfg = lerJson<Record<string, unknown>>(join(raiz, 'docs/fila/000-config.json')) ?? {}
+  const runsRel = typeof cfg.runs_dir === 'string' ? cfg.runs_dir : 'docs/fila/runs'
+  const runs = join(raiz, runsRel)
+  const trilhaRel = `${runsRel}/events.log`
+  let trilhaTxt = ''
+  try {
+    trilhaTxt = readFileSync(join(raiz, trilhaRel), 'utf8')
+  } catch {
+    falta.push('events.log')
+  }
+  const trilha = parseTrilha(trilhaTxt)
+  const trilhaArq: Arquivo = { rel: trilhaRel, linhas: trilha.map((l) => ({ n: l.n, t: l.t })), total: trilhaTxt.split('\n').length }
+
+  // ticket
+  let arquivoTicket: string | null = null
+  try {
+    const f = readdirSync(join(raiz, 'docs/fila')).find((x) => x.startsWith(`${id}-`) && x.endsWith('.md'))
+    arquivoTicket = f ? `docs/fila/${f}` : null
+  } catch {
+    arquivoTicket = null
+  }
+  const tkJson = arquivoTicket ? blocoJson(readFileSync(join(raiz, arquivoTicket), 'utf8')) : null
+  const tk = arquivoTicket ? ticketLido(arquivoTicket, tkJson) : null
+  if (!tk) falta.push('ticket')
+
+  // a série: os INICIO do id desde o último desfecho anterior até o BLOQUEADO
+  const doId = trilha.filter((l) => l.id === id)
+  const iBloq = doId.map((l) => l.evento).lastIndexOf('BLOQUEADO')
+  const bloq = iBloq >= 0 ? doId[iBloq]! : null
+  const ate = iBloq >= 0 ? iBloq : doId.length
+  const inicios: LinhaTrilha[] = []
+  for (let i = ate - 1; i >= 0; i--) {
+    const l = doId[i]!
+    if (['BLOQUEADO', 'APROVADO', 'RECUPERADO'].includes(l.evento)) break
+    if (l.evento === 'INICIO') inicios.unshift(l)
+  }
+  const meta = lerJson<{ attempt: number; diffLines?: number; duracaoSecs?: number; dir?: string }[]>(join(runs, id, 'meta.json')) ?? []
+  if (!meta.length) falta.push('meta')
+  const motivoBloq = bloq?.campos.motivo ?? null
+
+  const lidos: Lido[] = []
+  const lido = (a: Arquivo, inteiro = true) => {
+    let st: { size: bigint; mtimeNs: bigint } | null = null
+    try {
+      st = statSync(join(raiz, a.rel), { bigint: true })
+    } catch {
+      st = null
+    }
+    lidos.push({
+      arquivo: a.rel,
+      tamanho: Number(st?.size ?? 0n),
+      mtime_ns: (st?.mtimeNs ?? 0n).toString(),
+      conteudo: a.linhas.map((l) => l.t).join('\n'),
+      ...(inteiro ? {} : { faixas: faixas(a.linhas.map((l) => l.n)) }),
+    })
+  }
+  const lerArq = (rel: string): Arquivo | null => {
+    try {
+      const linhas = linhasDe(readFileSync(join(raiz, rel), 'utf8'))
+      return { rel, linhas, total: linhas.length }
+    } catch {
+      return null
+    }
+  }
+
+  const tentativas: Tentativa[] = inicios.map((ini, k) => {
+    const N = Number(ini.campos.attempt ?? k + 1)
+    const dirRel = `${runsRel}/${id}/attempt-${N - 1}`
+    const dirAbs = join(raiz, dirRel)
+    if (!existsSync(dirAbs)) falta.push(`${dirRel}/`)
+    const gates = lerArq(`${dirRel}/gates.txt`)
+    const gatesTxt = gates ? gates.linhas.map((l) => l.t).join('\n') : null
+    // o recorte do gate que reprovou vem no próprio gates.txt (`--- recorte de X ---`)
+    const iRec = gates ? gates.linhas.findIndex((l) => /^--- recorte de .* ---$/.test(l.t)) : -1
+    const recorte: Arquivo | null = gates && iRec >= 0 ? { rel: gates.rel, linhas: gates.linhas.slice(iRec + 1), total: gates.total } : null
+    const v = recorte ? vermelhosDe(recorte) : { vermelhos: [], arquivos: [], maquina: [] }
+    const patch = lerArq(`${dirRel}/diff.patch`)
+    const dp = patch ? diffPatch(patch) : null
+    const vd = lerJson<{ motivo?: string; criterios_falhos?: string[]; criteriosFalhos?: string[] }>(join(dirAbs, 'veredito.json'))
+    const falhos = vd?.criterios_falhos ?? vd?.criteriosFalhos ?? (/reprovado\(s\):\s*(.*)$/.exec(vd?.motivo ?? '')?.[1] ?? '').split(/;\s*/).filter(Boolean)
+    const crit = lerArq(`${dirRel}/criterios.txt`)
+    const enf = lerArq(`${dirRel}/enforcement.json`)
+    let enforcement: Tentativa['enforcement'] = null
+    if (enf) {
+      try {
+        const j = JSON.parse(enf.linhas.map((l) => l.t).join('\n')) as { ok?: boolean; violations?: { tipo?: string; detalhe?: string }[] }
+        enforcement = { ok: j.ok !== false, violacoes: (j.violations ?? []).map((x) => `${x.tipo ?? ''}: ${x.detalhe ?? ''}`), ref: ref(enf, 1, enf.linhas.map((l) => l.t).join(' ')) }
+      } catch {
+        enforcement = null
+      }
+    }
+    const jz = lerArq(`${dirRel}/juiz.veredito.json`)
+    const cl = lerArq(`${dirRel}/claude.txt`)
+    let agente: string | null = null
+    if (cl) {
+      const txt = cl.linhas.map((l) => l.t).join('\n')
+      try {
+        const r = (JSON.parse(txt) as { result?: unknown }).result
+        agente = typeof r === 'string' ? r : txt
+      } catch {
+        agente = txt
+      }
+    }
+    for (const a of [gates, crit, enf, jz, patch]) if (a) lido(a)
+    const m = meta.find((x) => x.attempt === N - 1)
+    return {
+      n: k + 1,
+      dir: dirRel,
+      estagio: estagioKit(dirAbs, gatesTxt, k === inicios.length - 1, motivoBloq),
+      vermelhos: v.vermelhos,
+      arquivos_vermelhos: v.arquivos,
+      criterios_falhos: crit ? criteriosFalhosKit(crit, falhos) : [],
+      diff_arquivos: dp?.arquivos ?? [],
+      diff_linhas: dp ? dp.linhas : typeof m?.diffLines === 'number' ? m.diffLines : null,
+      diff_ref: dp?.ref ?? null,
+      enforcement,
+      juiz: jz ? juizDe(jz) : null,
+      agente_disse: agente,
+      head: null,
+      dur_secs: typeof m?.duracaoSecs === 'number' ? m.duracaoSecs : null,
+      maquina: v.maquina,
+      recorte_vitest: recorte,
+      recorte_criterios: crit,
+      diff_stat: null,
+      fontes: Object.fromEntries(v.arquivos.filter((a) => !(dp?.arquivos ?? []).includes(a)).map((a) => [a, null])),
+    }
+  })
+
+  const refTrilha = (l: LinhaTrilha): Ref => ref(trilhaArq, l.n, l.t)
+  const base_vermelha_motor =
+    bloq && motivoBloq === 'base_vermelha'
+      ? { arquivos: (bloq.campos.arquivos ?? '').split(',').filter(Boolean), ref: refTrilha(bloq) }
+      : null
+  const vizinhos: Vizinho[] = trilha
+    .filter((l) => l.evento === 'BLOQUEADO' && l.campos.motivo === 'base_vermelha' && l.id !== id)
+    .flatMap((l) =>
+      (l.campos.arquivos ?? '').split(',').filter(Boolean).map((arquivo) => ({
+        ticket: l.id,
+        dir: trilhaRel,
+        arquivo,
+        linha: l.n,
+        ts: l.ts,
+        antes_do_bloqueio: !bloq || l.n < bloq.n,
+      })),
+    )
+  const linhasDoId: Arquivo = { rel: trilhaRel, linhas: doId.map((l) => ({ n: l.n, t: l.t })), total: trilhaArq.total }
+  if (doId.length) lido(linhasDoId, false)
+  if (arquivoTicket) {
+    const t = lerArq(arquivoTicket)
+    if (t) lido(t)
+  }
+  const num = (v: unknown) => (typeof v === 'number' ? v : null)
+  for (const t of tentativas) for (const [arq] of Object.entries(t.fontes)) falta.push(`fonte:${arq}@sem-head`)
+  return {
+    leitor: 'kit',
+    repo: raiz,
+    id,
+    ticket: tk,
+    bloqueio: {
+      quando: bloq?.ts ?? null,
+      token: bloq ? [motivoBloq, bloq.campos.sub].filter(Boolean).join(':') : null,
+      nota_do_motor: tk?.notas_status ?? '',
+      tentativas: tentativas.length,
+      origem: bloq ? 'motor' : 'humano',
+      refs: bloq ? [refTrilha(bloq)] : [],
+    },
+    tentativas,
+    merge_recusado: null,
+    motor: doId.filter((l) => ['REPROVADO', 'BLOQUEADO', 'GATE', 'JUIZ'].includes(l.evento)).map(refTrilha),
+    base_vermelha_motor,
+    vizinhos,
+    config: { diff_cap_linhas: num(cfg.diff_cap_linhas), claude_timeout_secs: num(cfg.claude_timeout_secs) },
+    falta,
+    lidos,
+  }
+}
diff --git a/scripts/orquestrador/triador/leitor-legado-comarka.ts b/scripts/orquestrador/triador/leitor-legado-comarka.ts
new file mode 100644
index 0000000..ea7bfc3
--- /dev/null
+++ b/scripts/orquestrador/triador/leitor-legado-comarka.ts
@@ -0,0 +1,556 @@
+/**
+ * leitor-legado-comarka.ts — o leitor do motor próprio do comarka-operacional
+ * (spec 7f-a §0.3 e §2). Vive até a migração do comarka para o kit e morre com
+ * ela; nada aqui vira contrato.
+ *
+ * Duas fontes, a mesma normalização:
+ *   - `lerRepoLegado(raiz, id)`: o repo de verdade (runs/ no checkout principal,
+ *     log `runs/local-loop.log`, fonte do teste por `gitLeitura`);
+ *   - `lerCasoDeFixture(dir)`: um caso de `test/fixtures/triador-7f/`, que já
+ *     guarda a série escolhida, os recortes com o mapa de linhas originais, os
+ *     fontes e os vizinhos.
+ *
+ * O que manda no desenho (spec §0.3):
+ *   1. o legado não grava a causa da reprova mecânica: o estágio sai da
+ *      PRESENÇA dos arquivos (fail-fast do executor);
+ *   2. o legado sobrescreve a evidência no requeue (`attempt-N` vira
+ *      `attempt-N.prevK`): a série é `attempt-1..n` e, entre as variantes,
+ *      ganha a de mtime mais recente até o fim da série + 180 s.
+ *
+ * SÓ LEITURA: nada aqui escreve, e o git passa por `gitLeitura`.
+ */
+import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
+import { basename, join, relative } from 'node:path'
+import { blocoJson, criteriosFalhosLegado, diffStat, juizDe, ref, ticketLido, vermelhosDe } from './comum.js'
+import { gitLeitura } from './git.js'
+import { faixas, linhasDe, numerosDe, recortarCriterios, recortarVitest, semAnsi } from './recorte.js'
+import type { Arquivo, Bloqueio, Estagio, Evidencia, Lido, Linha, Ref, Tentativa, TicketLido, Vizinho } from './tipos.js'
+
+export const RUNS_LEGADO = 'docs/fila/runs'
+export const LOG_LEGADO = `${RUNS_LEGADO}/local-loop.log`
+const JANELA_VIZINHO_S = 6 * 3600
+const FOLGA_SERIE_S = 180
+
+/** Uma entrada do meta.json do legado (1-based). */
+export interface MetaLegado {
+  attempt: number
+  claude_dur_secs?: number
+  diff_lines?: number
+  resultado?: string
+  ts: string
+}
+
+/** O que a normalização precisa de uma fonte (repo ou fixture). */
+export interface FonteLegado {
+  raiz: string
+  id: string
+  ticket(): { arquivo: string; json: Record<string, unknown> | null } | null
+  /** a série: attempt-1..n, com o diretório (relativo à raiz) que ganhou */
+  serie(): { k: number; dir: string }[]
+  meta(): MetaLegado[]
+  fim(): string | null
+  presenca(dir: string): string[] | null
+  /** arquivo inteiro ou recortado; as linhas têm o número no original */
+  ler(rel: string): Arquivo | null
+  /** o trecho do log da série */
+  log(): Linha[]
+  config(): { diff_cap_linhas: number | null; claude_timeout_secs: number | null }
+  vizinhos(): Vizinho[]
+  fonteDoTeste(head: string, arquivo: string): string | null
+  stat(rel: string): { tamanho: number; mtime_ns: string } | null
+}
+
+// ─── normalização (as duas fontes passam por aqui) ──────────────────────────
+
+function estagioPorPresenca(fonte: FonteLegado, dir: string, presentes: string[]): Estagio {
+  const tem = (f: string) => presentes.includes(f)
+  if (tem('verdict.json')) {
+    const v = fonte.ler(`${dir}/verdict.json`)
+    const j = v ? juizDe(v) : null
+    const av = tem('avaliador-claude.txt') ? fonte.ler(`${dir}/avaliador-claude.txt`) : null
+    const juiz = av ? juizDe(av) : null
+    if (j?.aprovado) return 'aprovado'
+    if (juiz?.aprovado === true && /merge/i.test(j?.motivo ?? '')) return 'juiz_ok_merge_falhou'
+    return 'juiz'
+  }
+  if (tem('gate-build.txt')) return 'build'
+  if (tem('criterios.txt')) return 'criterios'
+  if (tem('gate-vitest.txt')) return 'vitest'
+  if (tem('gate-tsc.txt')) return 'tsc'
+  if (tem('diff.stat')) {
+    const e = fonte.ler(`${dir}/enforcement.json`)
+    try {
+      const j = e ? (JSON.parse(e.linhas.map((l) => l.t).join('\n')) as { ok?: boolean }) : null
+      return j?.ok === false ? 'enforcement' : 'diff_cap'
+    } catch {
+      return 'diff_cap'
+    }
+  }
+  return 'agente'
+}
+
+function tentativa(fonte: FonteLegado, k: number, dir: string, meta: MetaLegado | undefined, falta: string[]): Tentativa {
+  const presentes = fonte.presenca(dir) ?? []
+  if (!presentes.length) falta.push(`${dir}/`)
+  const ler = (f: string) => (presentes.includes(f) ? fonte.ler(`${dir}/${f}`) : null)
+  const vit = ler('gate-vitest.txt')
+  const crit = ler('criterios.txt')
+  const stat = ler('diff.stat')
+  const enf = ler('enforcement.json')
+  const av = ler('avaliador-claude.txt')
+  const vd = ler('verdict.json')
+  const co = ler('claude-output.txt')
+  const hd = ler('head.txt')
+  const v = vit ? vermelhosDe(vit) : { vermelhos: [], arquivos: [], maquina: [] }
+  const ds = stat ? diffStat(stat) : { arquivos: [], linhas: null, ref: null }
+  let enforcement: Tentativa['enforcement'] = null
+  if (enf) {
+    try {
+      const j = JSON.parse(enf.linhas.map((l) => l.t).join('\n')) as { ok?: boolean; violations?: { tipo?: string; detalhe?: string }[] }
+      enforcement = {
+        ok: j.ok !== false,
+        violacoes: (j.violations ?? []).map((x) => `${x.tipo ?? ''}: ${x.detalhe ?? ''}`),
+        ref: ref(enf, enf.linhas[0]?.n ?? 1, enf.linhas.map((l) => l.t).join(' ')),
+      }
+    } catch {
+      enforcement = null
+    }
+  }
+  const head = hd?.linhas.map((l) => l.t).join('').trim() || null
+  const fontes: Record<string, string | null> = {}
+  for (const arq of v.arquivos) {
+    if (!noDiff(arq, ds.arquivos)) fontes[arq] = head ? fonte.fonteDoTeste(head, arq) : null
+  }
+  return {
+    n: k,
+    dir,
+    estagio: estagioPorPresenca(fonte, dir, presentes),
+    vermelhos: v.vermelhos,
+    arquivos_vermelhos: v.arquivos,
+    criterios_falhos: crit ? criteriosFalhosLegado(crit) : [],
+    diff_arquivos: ds.arquivos,
+    diff_linhas: ds.linhas,
+    diff_ref: ds.ref,
+    enforcement,
+    juiz: (av && juizDe(av)) || (vd && juizDe(vd)) || null,
+    agente_disse: co ? co.linhas.map((l) => l.t).join('\n') : null,
+    head,
+    dur_secs: typeof meta?.claude_dur_secs === 'number' ? meta.claude_dur_secs : null,
+    maquina: v.maquina,
+    recorte_vitest: vit,
+    recorte_criterios: crit,
+    diff_stat: stat,
+    fontes,
+  }
+}
+
+/** O diff.stat abrevia caminho longo com `.../`: casa pelo sufixo. */
+export function noDiff(arq: string, diff: string[]): boolean {
+  return diff.some((d) => d === arq || (d.startsWith('.../') && arq.endsWith(d.slice(3))))
+}
+
+const RE_BLOQ = (id: string) => new RegExp(String.raw`ticket ${escape(id)}: (BLOQUEADO|reprovado após)`)
+const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+
+function bloqueioDoLog(fonte: FonteLegado, tk: TicketLido | null, n: number): { bloqueio: Bloqueio; motor: Ref[]; merge: Evidencia['merge_recusado'] } {
+  const log = fonte.log()
+  const a: Arquivo = { rel: LOG_LEGADO, linhas: log, total: log.at(-1)?.n ?? 0 }
+  const re = RE_BLOQ(fonte.id)
+  const linhaBloq = [...log].reverse().find((l) => re.test(l.t)) ?? null
+  const motor = log.filter((l) => /REPROVA|circuit breaker|diff grande/.test(l.t)).map((l) => ref(a, l.n, l.t))
+  let token: string | null = null
+  if (linhaBloq) {
+    if (/BLOQUEADO \(enforcement\)/.test(linhaBloq.t)) token = 'enforcement'
+    else if (/reprovado após/.test(linhaBloq.t)) token = 'retries_esgotados'
+    else token = 'circuit_breaker'
+  }
+  // Merge recusado por mudança local: a linha do git e os arquivos indentados
+  // logo abaixo dela (avaliador do legado roda `git merge` na staging-auto).
+  const arquivos: string[] = []
+  const refs: Ref[] = []
+  for (let i = 0; i < log.length; i++) {
+    if (!/overwritten by merge:/.test(log[i]!.t)) continue
+    refs.push(ref(a, log[i]!.n, log[i]!.t))
+    for (let j = i + 1; j < log.length && /^\s+\S/.test(log[j]!.t); j++) {
+      refs.push(ref(a, log[j]!.n, log[j]!.t))
+      const f = log[j]!.t.trim()
+      if (!arquivos.includes(f)) arquivos.push(f)
+    }
+  }
+  return {
+    bloqueio: {
+      quando: fonte.fim(),
+      token,
+      nota_do_motor: tk?.notas_status ?? '',
+      tentativas: n,
+      origem: linhaBloq ? 'motor' : 'humano',
+      refs: linhaBloq ? [ref(a, linhaBloq.n, linhaBloq.t)] : [],
+    },
+    motor,
+    merge: refs.length ? { arquivos, refs } : null,
+  }
+}
+
+export function normalizarLegado(fonte: FonteLegado): Evidencia {
+  const falta: string[] = []
+  const t = fonte.ticket()
+  const tk = t ? ticketLido(t.arquivo, t.json) : null
+  if (!tk) falta.push('ticket')
+  const serie = fonte.serie()
+  const metas = fonte.meta()
+  if (!metas.length) falta.push('meta')
+  const tentativas = serie.map((s) => tentativa(fonte, s.k, s.dir, metas.find((m) => m.attempt === s.k), falta))
+  const { bloqueio, motor, merge } = bloqueioDoLog(fonte, tk, serie.length)
+  if (!fonte.log().length) falta.push('log')
+  const config = fonte.config()
+  if (config.diff_cap_linhas === null) falta.push('config.diff_cap_linhas')
+  const vizinhos = fonte.vizinhos()
+  if (!vizinhos.length && tentativas.some((x) => x.arquivos_vermelhos.length)) falta.push('vizinhos')
+  for (const x of tentativas) {
+    for (const [arq, src] of Object.entries(x.fontes)) if (src === null) falta.push(`fonte:${arq}@${x.head ?? 'sem-head'}`)
+  }
+  return {
+    leitor: 'legado-comarka',
+    repo: fonte.raiz,
+    id: fonte.id,
+    ticket: tk,
+    bloqueio,
+    tentativas,
+    merge_recusado: merge,
+    motor,
+    base_vermelha_motor: null,
+    vizinhos,
+    config,
+    falta,
+    lidos: lidos(fonte, tk, tentativas),
+  }
+}
+
+function lidos(fonte: FonteLegado, tk: TicketLido | null, ts: Tentativa[]): Lido[] {
+  const out: Lido[] = []
+  const add = (a: Arquivo | null) => {
+    if (!a || out.some((x) => x.arquivo === a.rel)) return
+    const st = fonte.stat(a.rel)
+    const inteiro = a.linhas.length === a.total && a.linhas.every((l, i) => l.n === i + 1)
+    out.push({
+      arquivo: a.rel,
+      tamanho: st?.tamanho ?? 0,
+      mtime_ns: st?.mtime_ns ?? '0',
+      conteudo: a.linhas.map((l) => l.t).join('\n'),
+      ...(inteiro ? {} : { faixas: faixas(a.linhas.map((l) => l.n)) }),
+    })
+  }
+  if (tk) {
+    const st = fonte.stat(tk.arquivo)
+    out.push({ arquivo: tk.arquivo, tamanho: st?.tamanho ?? 0, mtime_ns: st?.mtime_ns ?? '0', conteudo: JSON.stringify(fonte.ticket()?.json ?? null, null, 1) })
+  }
+  for (const t of ts) {
+    for (const f of ['verdict.json', 'avaliador-claude.txt', 'claude-output.txt', 'enforcement.json', 'head.txt', 'gate-tsc.txt']) {
+      if ((fonte.presenca(t.dir) ?? []).includes(f)) add(fonte.ler(`${t.dir}/${f}`))
+    }
+    add(t.recorte_vitest)
+    add(t.recorte_criterios)
+    add(t.diff_stat)
+  }
+  const log = fonte.log()
+  if (log.length) {
+    out.push({ arquivo: LOG_LEGADO, tamanho: fonte.stat(LOG_LEGADO)?.tamanho ?? 0, mtime_ns: '0', conteudo: log.map((l) => l.t).join('\n'), faixas: faixas(log.map((l) => l.n)) })
+  }
+  return out
+}
+
+// ─── fonte: caso da fixture ─────────────────────────────────────────────────
+
+export type Instante = 'bloqueio' | 'passada'
+
+/**
+ * Um caso de `test/fixtures/triador-7f/`. `instante: 'bloqueio'` usa só os
+ * vizinhos que já existiam no fim da série (`antes_do_bloqueio`); `'passada'`
+ * usa todos (o estado da passada G3, até 6 h depois).
+ */
+export function fonteFixture(dirCaso: string, opts: { instante?: Instante } = {}): FonteLegado {
+  const instante = opts.instante ?? 'passada'
+  const json = <T>(f: string): T | null => {
+    try {
+      return JSON.parse(readFileSync(join(dirCaso, f), 'utf8')) as T
+    } catch {
+      return null
+    }
+  }
+  const caso = json<{ id: string; arquivo_ticket: string; fim: string; meta_dir: string; repo: string }>('caso.json')
+  if (!caso) throw new Error(`fixture sem caso.json: ${dirCaso}`)
+  const serie = json<{ k: number; dir: string }[]>('serie.json') ?? []
+  const porDir = new Map(serie.map((s) => [s.dir, `attempt-${s.k}`]))
+  const raiz = `fixture:${basename(dirCaso)}`
+  return {
+    raiz,
+    id: caso.id,
+    ticket: () => ({ arquivo: caso.arquivo_ticket, json: json<Record<string, unknown>>('ticket.json') }),
+    serie: () => serie,
+    meta: () => json<MetaLegado[]>('meta.json') ?? [],
+    fim: () => caso.fim,
+    presenca: (dir) => {
+      const k = porDir.get(dir)
+      return k ? json<string[]>(join(k, 'presenca.json')) : null
+    },
+    ler: (rel) => {
+      const i = rel.lastIndexOf('/')
+      const k = porDir.get(rel.slice(0, i))
+      if (!k) return null
+      const nome = rel.slice(i + 1)
+      const p = join(dirCaso, k, nome)
+      if (!existsSync(p)) return null
+      const texto = readFileSync(p, 'utf8')
+      const mapa = nome.endsWith('.txt')
+        ? json<{ total: number; faixas: [number, number][] }>(join(k, nome.replace(/\.txt$/, '.linhas.json')))
+        : null
+      if (!mapa) {
+        const linhas = linhasDe(texto)
+        return { rel, linhas, total: linhas.length }
+      }
+      const ns = numerosDe(mapa.faixas)
+      const ts = texto.split('\n')
+      return { rel, linhas: ns.map((n, j) => ({ n, t: ts[j] ?? '' })), total: mapa.total }
+    },
+    log: () => {
+      const p = join(dirCaso, 'log.txt')
+      if (!existsSync(p)) return []
+      return readFileSync(p, 'utf8')
+        .split('\n')
+        .filter(Boolean)
+        .map((l) => {
+          const tab = l.indexOf('\t')
+          return { n: Number(l.slice(0, tab)), t: l.slice(tab + 1) }
+        })
+    },
+    config: () => {
+      const c = json<{ diff_cap_linhas?: number; claude_timeout_secs?: number }>('config.json')
+      return { diff_cap_linhas: c?.diff_cap_linhas ?? null, claude_timeout_secs: c?.claude_timeout_secs ?? null }
+    },
+    vizinhos: () => {
+      const p = join(dirCaso, 'vizinhos.tsv')
+      if (!existsSync(p)) return []
+      const [cab, ...linhas] = readFileSync(p, 'utf8').split('\n').filter(Boolean)
+      const col = (cab ?? '').split('\t')
+      return linhas
+        .map((l) => Object.fromEntries(l.split('\t').map((v, i) => [col[i], v])) as Record<string, string>)
+        .map((r) => ({
+          ticket: r.ticket ?? '',
+          dir: r.dir ?? '',
+          arquivo: r.arquivo ?? '',
+          linha: r.linha ? Number(r.linha) : null,
+          ts: r.ts ?? '',
+          antes_do_bloqueio: r.antes_do_bloqueio === '1',
+        }))
+        .filter((v) => instante === 'passada' || v.antes_do_bloqueio)
+    },
+    fonteDoTeste: (head, arquivo) => {
+      const p = join(dirCaso, 'fontes', head, `${arquivo}.fonte`)
+      return existsSync(p) ? readFileSync(p, 'utf8') : null
+    },
+    stat: (rel) => {
+      const i = rel.lastIndexOf('/')
+      const k = porDir.get(rel.slice(0, i))
+      const p = k ? join(dirCaso, k, rel.slice(i + 1)) : null
+      return p && existsSync(p) ? { tamanho: statSync(p).size, mtime_ns: '0' } : null
+    },
+  }
+}
+
+export function lerCasoDeFixture(dirCaso: string, opts: { instante?: Instante } = {}): Evidencia {
+  return normalizarLegado(fonteFixture(dirCaso, opts))
+}
+
+// ─── fonte: o repo de verdade ────────────────────────────────────────────────
+
+const mtimeDir = (d: string): number => {
+  let m = 0
+  try {
+    for (const f of readdirSync(d)) m = Math.max(m, statSync(join(d, f)).mtimeMs / 1000)
+  } catch {
+    return 0
+  }
+  return m
+}
+
+/** A última série do meta: a sequência 1..n que termina na última entrada. */
+export function serieDoMeta(meta: MetaLegado[]): MetaLegado[] {
+  const out: MetaLegado[] = []
+  for (let i = meta.length - 1; i >= 0; i--) {
+    const m = meta[i]!
+    if (out.length && m.attempt !== out[0]!.attempt - 1) break
+    out.unshift(m)
+    if (m.attempt === 1) break
+  }
+  return out
+}
+
+/**
+ * O repo do legado. Só lê: `runs/` e o log pelo fs, o fonte do teste vermelho
+ * por `gitLeitura` (`show <head>:<arquivo>`). `agora` fixa o relógio dos
+ * vizinhos (padrão: o relógio do processo).
+ */
+export function fonteRepoLegado(raiz: string, id: string, opts: { agora?: number } = {}): FonteLegado {
+  const runs = join(raiz, RUNS_LEGADO)
+  const lerTxt = (p: string): string | null => {
+    try {
+      return readFileSync(p, 'utf8')
+    } catch {
+      return null
+    }
+  }
+  const arquivoTicket = (() => {
+    try {
+      const f = readdirSync(join(raiz, 'docs/fila')).find((x) => x.startsWith(`${id}-`) && x.endsWith('.md'))
+      return f ? `docs/fila/${f}` : null
+    } catch {
+      return null
+    }
+  })()
+  const metaBruto = (() => {
+    try {
+      const v = JSON.parse(readFileSync(join(runs, id, 'meta.json'), 'utf8')) as MetaLegado | MetaLegado[]
+      return Array.isArray(v) ? v : [v]
+    } catch {
+      return []
+    }
+  })()
+  const metaSerie = serieDoMeta(metaBruto)
+  const fim = metaSerie.at(-1)?.ts ?? null
+  const fimS = fim ? Date.parse(fim) / 1000 : (opts.agora ?? Date.now()) / 1000
+  const serie: { k: number; dir: string }[] = []
+  for (const m of metaSerie) {
+    let melhor: { m: number; d: string } | null = null
+    let cands: string[] = []
+    try {
+      cands = readdirSync(join(runs, id)).filter((d) => d === `attempt-${m.attempt}` || d.startsWith(`attempt-${m.attempt}.prev`))
+    } catch {
+      cands = []
+    }
+    for (const c of cands) {
+      const mt = mtimeDir(join(runs, id, c))
+      if (mt <= fimS + FOLGA_SERIE_S && (!melhor || mt > melhor.m)) melhor = { m: mt, d: c }
+    }
+    if (melhor) serie.push({ k: m.attempt, dir: `${RUNS_LEGADO}/${id}/${melhor.d}` })
+  }
+  let logCache: Linha[] | null = null
+  const log = (): Linha[] => {
+    if (logCache) return logCache
+    const txt = lerTxt(join(raiz, LOG_LEGADO))
+    if (!txt) return (logCache = [])
+    const todas = txt.split('\n')
+    const re = RE_BLOQ(id)
+    let fimL = -1
+    for (let i = todas.length - 1; i >= 0; i--) if (re.test(todas[i]!)) { fimL = i; break }
+    if (fimL < 0) return (logCache = [])
+    const cab = new RegExp(String.raw`=== ticket ${escape(id)} \(.*\) — tentativa (\d+) `)
+    let ini = fimL
+    while (ini >= 0) {
+      const m = cab.exec(todas[ini]!)
+      if (m?.[1] === '1') break
+      ini--
+    }
+    if (ini < 0) return (logCache = [])
+    while (ini > 0 && !/^\[\d{4}-\d\d-\d\d /.test(todas[ini]!)) ini--
+    logCache = []
+    for (let i = ini; i <= fimL; i++) logCache.push({ n: i + 1, t: semAnsi(todas[i]!) })
+    return logCache
+  }
+  const ler = (rel: string): Arquivo | null => {
+    const txt = lerTxt(join(raiz, rel))
+    if (txt === null) return null
+    const todas = linhasDe(txt)
+    if (rel.endsWith('/gate-vitest.txt')) return { rel, linhas: recortarVitest(todas), total: todas.length }
+    if (rel.endsWith('/criterios.txt')) return { rel, linhas: recortarCriterios(todas), total: todas.length }
+    return { rel, linhas: todas, total: todas.length }
+  }
+  return {
+    raiz,
+    id,
+    ticket: () => (arquivoTicket ? { arquivo: arquivoTicket, json: blocoJson(lerTxt(join(raiz, arquivoTicket)) ?? '') } : null),
+    serie: () => serie,
+    meta: () => metaSerie,
+    fim: () => fim,
+    presenca: (dir) => {
+      try {
+        return readdirSync(join(raiz, dir)).sort()
+      } catch {
+        return null
+      }
+    },
+    ler,
+    log,
+    config: () => {
+      try {
+        const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as Record<string, unknown>
+        const num = (v: unknown) => (typeof v === 'number' ? v : null)
+        return { diff_cap_linhas: num(c.diff_cap_linhas), claude_timeout_secs: num(c.claude_timeout_secs) }
+      } catch {
+        return { diff_cap_linhas: null, claude_timeout_secs: null }
+      }
+    },
+    vizinhos: () => vizinhosDoRepo(raiz, runs, fimS),
+    fonteDoTeste: (head, arquivo) => {
+      const r = gitLeitura(raiz, ['show', `${head}:${arquivo}`])
+      return r.rc === 0 ? r.stdout : null
+    },
+    stat: (rel) => {
+      try {
+        const st = statSync(join(raiz, rel), { bigint: true })
+        return { tamanho: Number(st.size), mtime_ns: st.mtimeNs.toString() }
+      } catch {
+        return null
+      }
+    },
+  }
+}
+
+/** Todo FAIL de `runs/*\/attempt-*\/gate-vitest.txt` com mtime nas ±6 h do fim da série. */
+function vizinhosDoRepo(raiz: string, runs: string, fimS: number): Vizinho[] {
+  const out: Vizinho[] = []
+  let tickets: string[] = []
+  try {
+    tickets = readdirSync(runs)
+  } catch {
+    return out
+  }
+  for (const t of tickets) {
+    let tentativas: string[] = []
+    try {
+      tentativas = readdirSync(join(runs, t)).filter((d) => d.startsWith('attempt-'))
+    } catch {
+      continue
+    }
+    for (const a of tentativas) {
+      const p = join(runs, t, a, 'gate-vitest.txt')
+      let mt: number
+      try {
+        mt = statSync(p).mtimeMs / 1000
+      } catch {
+        continue
+      }
+      if (Math.abs(mt - fimS) > JANELA_VIZINHO_S) continue
+      const vistos = new Map<string, number>()
+      for (const l of linhasDe(readFileSync(p, 'utf8'))) {
+        const m = /^\s*FAIL\s+(\S+\.(?:test|spec)\.[cm]?[jt]sx?)/.exec(l.t)
+        if (m && !vistos.has(m[1]!)) vistos.set(m[1]!, l.n)
+      }
+      for (const [arquivo, linha] of vistos) {
+        out.push({
+          ticket: t.split('.')[0]!,
+          dir: relative(raiz, join(runs, t, a)),
+          arquivo,
+          linha,
+          ts: new Date(mt * 1000).toISOString().replace(/\.\d{3}Z$/, 'Z'),
+          antes_do_bloqueio: mt <= fimS + FOLGA_SERIE_S,
+        })
+      }
+    }
+  }
+  return out
+}
+
+export function lerRepoLegado(raiz: string, id: string, opts: { agora?: number } = {}): Evidencia {
+  return normalizarLegado(fonteRepoLegado(raiz, id, opts))
+}
+
diff --git a/scripts/orquestrador/triador/leitor.ts b/scripts/orquestrador/triador/leitor.ts
new file mode 100644
index 0000000..c609360
--- /dev/null
+++ b/scripts/orquestrador/triador/leitor.ts
@@ -0,0 +1,33 @@
+/**
+ * leitor.ts — qual leitor serve um repo, pela FORMA do diretório (spec §2):
+ * `<runs>/events.log` presente → `kit`; ausente, com `docs/fila/runs/local-loop.log`
+ * → `legado-comarka`. Nada aqui olha o nome do repo.
+ */
+import { existsSync, readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { LOG_LEGADO, lerRepoLegado } from './leitor-legado-comarka.js'
+import { lerRepoKit } from './leitor-kit.js'
+import type { Evidencia, NomeLeitor } from './tipos.js'
+
+export function runsDir(raiz: string): string {
+  try {
+    const c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as { runs_dir?: unknown }
+    if (typeof c.runs_dir === 'string') return c.runs_dir
+  } catch {
+    /* sem config: o padrão do contrato */
+  }
+  return 'docs/fila/runs'
+}
+
+export function detectarLeitor(raiz: string): NomeLeitor | null {
+  if (existsSync(join(raiz, runsDir(raiz), 'events.log'))) return 'kit'
+  if (existsSync(join(raiz, LOG_LEGADO))) return 'legado-comarka'
+  return null
+}
+
+export function lerRepo(raiz: string, id: string, opts: { agora?: number } = {}): Evidencia {
+  const l = detectarLeitor(raiz)
+  if (l === 'kit') return lerRepoKit(raiz, id)
+  if (l === 'legado-comarka') return lerRepoLegado(raiz, id, opts)
+  throw new Error(`${raiz}: nem runs/events.log (kit) nem ${LOG_LEGADO} (legado)`)
+}
diff --git a/scripts/orquestrador/triador/recorte.ts b/scripts/orquestrador/triador/recorte.ts
new file mode 100644
index 0000000..f84ff1d
--- /dev/null
+++ b/scripts/orquestrador/triador/recorte.ts
@@ -0,0 +1,124 @@
+/**
+ * recorte.ts — o recorte do gate de testes e do criterios.txt (spec 7f-a §3.1, item 1).
+ *
+ * O MESMO algoritmo do `test/fixtures/triador-7f/montar.py` (`recortar` e
+ * `recortar_criterios`): a fixture foi montada por ele, e o teste da peça 2
+ * confere que os dois dão o mesmo recorte. Mudou aqui, muda lá.
+ *
+ * Gate de testes:
+ *   1. âncoras FORTES (FAIL, `❯ arquivo:N:M`, `Test Files`, `Tests`, Timeout,
+ *      EMFILE, ENOSPC, `Cannot find module`) entram sempre, mesmo além do teto;
+ *   2. sem nenhum FAIL a suíte passou: o recorte é só das fortes;
+ *   3. âncoras FRACAS (AssertionError, Expected, Received, `Error:`) em ordem,
+ *      até o teto;
+ *   4. contexto de até 6 linhas, do mais perto para o mais longe, até 300.
+ *   Quadro de pilha (`    at f (…)`) que não cita arquivo de teste nunca entra.
+ *
+ * Toda linha guarda o número no ORIGINAL: a evidência aponta o arquivo
+ * original, não o recorte.
+ *
+ * PURO: recebe texto, devolve linhas.
+ */
+import type { Linha } from './tipos.js'
+
+export const ANSI = /\x1b\[[0-9;?]*[A-Za-z]/g
+export const semAnsi = (s: string): string => s.replace(ANSI, '')
+
+const FORTES = [
+  /^\s*FAIL\s/,
+  /❯\s+\S+:\d+:\d+/,
+  /^\s*Test Files\s/,
+  /^\s*Tests\s/,
+  /\bTimeout\b/,
+  /timed out/,
+  /\bEMFILE\b/,
+  /\bENOSPC\b/,
+  /Cannot find module/,
+]
+const FAIL = FORTES[0]!
+const FRACAS = [/AssertionError/, /\bExpected\b/, /\bReceived\b/, /\bError:/]
+const PILHA = /^\s+at\s/
+const PILHA_DE_TESTE = /\.(?:test|spec)\.[cm]?[jt]sx?/
+export const CONTEXTO = 6
+export const TETO_LINHAS = 300
+
+const ruido = (l: string): boolean => PILHA.test(l) && !PILHA_DE_TESTE.test(l)
+
+/** As linhas de um texto inteiro, numeradas de 1, sem ANSI. */
+export function linhasDe(texto: string): Linha[] {
+  return semAnsi(texto)
+    .split('\n')
+    .map((t, i) => ({ n: i + 1, t }))
+}
+
+/**
+ * Recorte do gate de testes. Aceita o texto inteiro (linhas 1..N) ou um recorte
+ * já feito (linhas com buracos): o resultado é o mesmo, porque o contexto é
+ * contado pelo número no original.
+ */
+export function recortarVitest(entrada: Linha[]): Linha[] {
+  const porN = new Map(entrada.map((l) => [l.n, l.t]))
+  const ordem = entrada.map((l) => l.n)
+  const fortes = ordem.filter((n) => {
+    const t = porN.get(n)!
+    return !ruido(t) && FORTES.some((r) => r.test(t))
+  })
+  const em = (ns: Iterable<number>) => [...ns].sort((a, b) => a - b).map((n) => ({ n, t: porN.get(n)! }))
+  if (!fortes.some((n) => FAIL.test(porN.get(n)!))) return em(fortes)
+
+  const sel = new Set(fortes)
+  for (const n of ordem) {
+    if (sel.size >= TETO_LINHAS) break
+    const t = porN.get(n)!
+    if (!sel.has(n) && !ruido(t) && FRACAS.some((r) => r.test(t))) sel.add(n)
+  }
+  const ancoras = [...sel].sort((a, b) => a - b)
+  for (let d = 1; d <= CONTEXTO && sel.size < TETO_LINHAS; d++) {
+    for (const a of ancoras) {
+      for (const n of [a - d, a + d]) {
+        if (sel.size >= TETO_LINHAS) break
+        const t = porN.get(n)
+        if (t !== undefined && !sel.has(n) && !ruido(t)) sel.add(n)
+      }
+    }
+  }
+  return em(sel)
+}
+
+/** Recorte do criterios.txt do legado: bloco não-PASS inteiro; do PASS, só o cabeçalho. */
+export function recortarCriterios(entrada: Linha[]): Linha[] {
+  const out: Linha[] = []
+  let passa = false
+  for (const l of entrada) {
+    const m = /^### \S+ -> (\S+)/.exec(l.t)
+    if (m) {
+      passa = m[1] === 'PASS'
+      out.push(l)
+    } else if (!passa) out.push(l)
+  }
+  return out
+}
+
+/** [3,4,5,9] -> [[3,5],[9,9]]: o mapa de linhas originais, compacto. */
+export function faixas(ns: number[]): [number, number][] {
+  const out: [number, number][] = []
+  for (const n of ns) {
+    const u = out.at(-1)
+    if (u && u[1] === n - 1) u[1] = n
+    else out.push([n, n])
+  }
+  return out
+}
+
+/** O inverso de `faixas`. */
+export function numerosDe(fx: [number, number][]): number[] {
+  const out: number[] = []
+  for (const [a, b] of fx) for (let n = a; n <= b; n++) out.push(n)
+  return out
+}
+
+/** Corta um trecho de evidência em 160 caracteres (o limite do formato, §4). */
+export const trecho = (s: string, n = 160): string => {
+  const t = s.trim()
+  return t.length > n ? `${t.slice(0, n - 1)}…` : t
+}
diff --git a/scripts/orquestrador/triador/tipos.ts b/scripts/orquestrador/triador/tipos.ts
new file mode 100644
index 0000000..7bef548
--- /dev/null
+++ b/scripts/orquestrador/triador/tipos.ts
@@ -0,0 +1,163 @@
+/**
+ * tipos.ts — a estrutura `Evidencia` que os dois leitores devolvem (spec 7f-a §2).
+ *
+ * A extração e o modelo só veem isto: não há ramo por nome de repo. Todo
+ * `arquivo` de `Ref` é relativo à raiz do repo e aponta o artefato ORIGINAL
+ * (a linha também é a do original, nunca a do recorte).
+ */
+
+export type NomeLeitor = 'kit' | 'legado-comarka'
+
+/** Uma prova: `arquivo:linha` e o trecho daquela linha (até 160 caracteres). */
+export interface Ref {
+  arquivo: string
+  linha: number | null
+  trecho: string
+}
+
+/** Onde a tentativa parou (o primeiro estágio que reprovou). */
+export type Estagio =
+  | 'agente'
+  | 'enforcement'
+  | 'diff_cap'
+  | 'tsc'
+  | 'vitest'
+  | 'gate'
+  | 'criterios'
+  | 'build'
+  | 'juiz'
+  | 'juiz_ok_merge_falhou'
+  | 'aprovado'
+  | 'desconhecido'
+
+/** Uma linha de um arquivo lido, com o número no ORIGINAL (1-based). */
+export interface Linha {
+  n: number
+  t: string
+}
+
+/** O texto que o leitor guardou de um artefato: inteiro ou recortado. */
+export interface Arquivo {
+  /** relativo à raiz do repo, do original */
+  rel: string
+  linhas: Linha[]
+  /** linhas do original (para conferir que uma `linha` cabe nele) */
+  total: number
+}
+
+export interface Vermelho {
+  arquivo: string
+  linha: number | null
+  it: string | null
+  ref: Ref
+}
+
+export interface CriterioFalho {
+  criterio: string
+  cmd: string
+  espera: string
+  saida: string[]
+  ref: Ref
+}
+
+export interface Juiz {
+  aprovado: boolean | null
+  motivo: string
+  criterios_falhos: string[]
+  ref: Ref
+}
+
+export interface Tentativa {
+  /** 1-based dentro da série */
+  n: number
+  /** diretório da tentativa, relativo à raiz do repo */
+  dir: string
+  estagio: Estagio
+  /** um por local `❯ arquivo:linha` do vitest; FAIL sem local entra com linha nula */
+  vermelhos: Vermelho[]
+  /** arquivos de teste com FAIL na tentativa */
+  arquivos_vermelhos: string[]
+  criterios_falhos: CriterioFalho[]
+  diff_arquivos: string[]
+  diff_linhas: number | null
+  /** a linha de resumo do diff.stat (ou do diff.patch contado) */
+  diff_ref: Ref | null
+  enforcement: { ok: boolean; violacoes: string[]; ref: Ref } | null
+  juiz: Juiz | null
+  /** o que o agente disse (pista, nunca prova sozinha) */
+  agente_disse: string | null
+  head: string | null
+  dur_secs: number | null
+  /** sinais de máquina no gate de testes (Timeout de worker, EMFILE, ENOSPC) */
+  maquina: Ref[]
+  /** o recorte do gate de testes, com o número da linha no original */
+  recorte_vitest: Arquivo | null
+  /** o recorte do criterios.txt (blocos FALHA inteiros) */
+  recorte_criterios: Arquivo | null
+  /** diff.stat inteiro (para o modelo) */
+  diff_stat: Arquivo | null
+  /** fonte em `head` de cada teste vermelho que o diff não tocou; null = não deu para ler */
+  fontes: Record<string, string | null>
+}
+
+export interface Vizinho {
+  ticket: string
+  dir: string
+  arquivo: string
+  linha: number | null
+  ts: string
+  antes_do_bloqueio: boolean
+}
+
+export interface TicketLido {
+  arquivo: string
+  id: string
+  slug: string
+  status: string
+  notas_status: string
+  objetivo: string
+  pathspec_allowlist: string[]
+  criterios_aceite: unknown[]
+}
+
+export interface Bloqueio {
+  quando: string | null
+  /** token curto do motor: circuit_breaker, enforcement, retries_esgotados, base_vermelha… */
+  token: string | null
+  nota_do_motor: string
+  tentativas: number
+  origem: 'motor' | 'humano'
+  refs: Ref[]
+}
+
+/** Um arquivo que o leitor leu: entra na assinatura e na cópia de evidência. */
+export interface Lido {
+  arquivo: string
+  tamanho: number
+  mtime_ns: string
+  /** o conteúdo como o triador o guardou (recortado quando é o caso) */
+  conteudo: string
+  /** mapa de linhas originais quando `conteudo` é recorte */
+  faixas?: [number, number][]
+}
+
+export interface Evidencia {
+  leitor: NomeLeitor
+  /** caminho absoluto da raiz do repo */
+  repo: string
+  id: string
+  ticket: TicketLido | null
+  bloqueio: Bloqueio
+  tentativas: Tentativa[]
+  /** merge recusado por mudança local na worktree alvo (árvore suja) */
+  merge_recusado: { arquivos: string[]; refs: Ref[] } | null
+  /** linhas do motor na série (REPROVA, DIFF-CAP, circuit breaker) */
+  motor: Ref[]
+  /** o motor já decidiu base vermelha (kit: `BLOQUEADO motivo=base_vermelha`) */
+  base_vermelha_motor: { arquivos: string[]; ref: Ref } | null
+  vizinhos: Vizinho[]
+  config: { diff_cap_linhas: number | null; claude_timeout_secs: number | null }
+  /** fontes de evidência que faltaram (regra de falta, §2) */
+  falta: string[]
+  lidos: Lido[]
+}
diff --git a/test/orquestrador-triador-leitores.test.ts b/test/orquestrador-triador-leitores.test.ts
new file mode 100644
index 0000000..1ec6ad1
--- /dev/null
+++ b/test/orquestrador-triador-leitores.test.ts
@@ -0,0 +1,279 @@
+/**
+ * Etapa 7f-b1, peça 2 · os leitores `kit` e `legado-comarka` → `Evidencia`
+ * (spec 7f-a §2 e §8, peça 2).
+ *
+ * Pronto quando:
+ *   - os 37 e os 20 de controle dão o estágio por tentativa igual ao da
+ *     presença dos arquivos (`presenca.json`, fail-fast do executor do legado);
+ *   - o recorte guarda todo FAIL e todo `❯` de 3 gate-vitest inteiros, e é o
+ *     mesmo que o `montar.py` gravou;
+ *   - um repo do molde `test-fixture-painel.sh` é lido pelo leitor `kit`;
+ *   - e um repo do legado materializado de dois casos da fixture dá a mesma
+ *     evidência que o caso lido direto da fixture (a mesma estrutura pelas
+ *     duas fontes).
+ *
+ * Os módulos entram por import dinâmico tolerante: sem eles o vermelho é de
+ * asserção, não de import.
+ */
+import { execFileSync } from 'node:child_process'
+import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { gunzipSync } from 'node:zlib'
+import { describe, expect, it } from 'vitest'
+
+const RAIZ = join(import.meta.dirname, '..')
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
+const AQUI = join(RAIZ, 'scripts', 'orquestrador')
+const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/
+
+interface Linha { n: number; t: string }
+interface Ref { arquivo: string; linha: number | null; trecho: string }
+interface Tent {
+  n: number
+  dir: string
+  estagio: string
+  vermelhos: { arquivo: string; linha: number | null; ref: Ref }[]
+  arquivos_vermelhos: string[]
+  criterios_falhos: { criterio: string; ref: Ref }[]
+  diff_linhas: number | null
+}
+interface Ev {
+  leitor: string
+  bloqueio: { token: string | null; refs: Ref[]; origem: string }
+  tentativas: Tent[]
+  merge_recusado: { arquivos: string[]; refs: Ref[] } | null
+}
+interface Mods {
+  lerCasoDeFixture: (d: string) => Ev
+  lerRepoLegado: (raiz: string, id: string) => Ev
+  lerRepo: (raiz: string, id: string) => Ev
+  detectarLeitor: (raiz: string) => string | null
+  recortarVitest: (l: Linha[]) => Linha[]
+  linhasDe: (t: string) => Linha[]
+}
+
+async function carregar(): Promise<Mods | null> {
+  try {
+    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
+    const m = { ...(await imp('leitor-legado-comarka.ts')), ...(await imp('leitor.ts')), ...(await imp('recorte.ts')) }
+    for (const k of ['lerCasoDeFixture', 'lerRepoLegado', 'lerRepo', 'detectarLeitor', 'recortarVitest', 'linhasDe']) {
+      if (typeof m[k] !== 'function') return null
+    }
+    return m as unknown as Mods
+  } catch {
+    return null
+  }
+}
+
+const casos = () => [
+  ...readdirSync(FX).filter((d) => CASO_RE.test(d)).map((d) => join(FX, d)),
+  ...readdirSync(join(FX, 'controle')).filter((d) => CASO_RE.test(d)).map((d) => join(FX, 'controle', d)),
+]
+const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
+
+/** O estágio pela presença (spec §0.3, diferença 1), em famílias. */
+function familiaPorPresenca(p: string[]): string {
+  if (p.includes('verdict.json')) return 'juiz-ou-merge'
+  if (p.includes('gate-build.txt')) return 'build'
+  if (p.includes('criterios.txt')) return 'criterios'
+  if (p.includes('gate-vitest.txt')) return 'vitest'
+  if (p.includes('gate-tsc.txt')) return 'tsc'
+  if (p.includes('diff.stat')) return 'enforcement-ou-diff_cap'
+  return 'agente'
+}
+const FAMILIA: Record<string, string> = {
+  juiz: 'juiz-ou-merge', juiz_ok_merge_falhou: 'juiz-ou-merge', aprovado: 'juiz-ou-merge',
+  enforcement: 'enforcement-ou-diff_cap', diff_cap: 'enforcement-ou-diff_cap',
+}
+
+describe('leitores do triador (peça 2)', () => {
+  it('os 37 e os 20 de controle: estágio por tentativa igual ao da presença dos arquivos', async () => {
+    const m = await carregar()
+    const difere: string[] = []
+    let n = 0
+    for (const d of casos()) {
+      const serie = json<{ k: number }[]>(join(d, 'serie.json'))
+      const esperado = serie.map((s) => familiaPorPresenca(json<string[]>(join(d, `attempt-${s.k}`, 'presenca.json'))))
+      const lido = m ? m.lerCasoDeFixture(d).tentativas.map((t) => FAMILIA[t.estagio] ?? t.estagio) : []
+      n += esperado.length
+      if (JSON.stringify(lido) !== JSON.stringify(esperado)) difere.push(`${d.split('/').pop()}: ${lido} != ${esperado}`)
+    }
+    expect(n).toBeGreaterThan(100)
+    expect(difere).toEqual([])
+  })
+
+  it('o leitor distingue merge recusado com mérito aprovado (940, 932) e marca o estágio', async () => {
+    const m = await carregar()
+    for (const c of ['36-940-L85222', '37-932-L85272']) {
+      const ev = m?.lerCasoDeFixture(join(FX, c))
+      expect(ev?.tentativas.map((t) => t.estagio), c).toEqual(['juiz_ok_merge_falhou', 'juiz_ok_merge_falhou'])
+      expect(ev?.merge_recusado?.arquivos, c).toEqual(['docs/fila/854-remove-equipe-geral.md'])
+      expect(ev?.bloqueio.token, c).toBe('circuit_breaker')
+    }
+  })
+
+  it('o recorte guarda todo FAIL e todo ❯ de 3 gate-vitest inteiros, e é o mesmo do montar.py', async () => {
+    const m = await carregar()
+    const origem = json<Record<string, string>>(join(FX, 'vitest-inteiros', 'origem.json'))
+    for (const id of Object.keys(origem)) {
+      const txt = gunzipSync(readFileSync(join(FX, 'vitest-inteiros', `${id}.txt.gz`))).toString('utf8')
+      const todas = m ? m.linhasDe(txt) : []
+      const rec = m ? m.recortarVitest(todas) : []
+      const guardadas = new Set(rec.map((l) => l.n))
+      const chaves = txt
+        .replace(/\x1b\[[0-9;?]*[A-Za-z]/g, '')
+        .split('\n')
+        .map((t, i) => ({ n: i + 1, t }))
+        .filter((l) => /^\s*FAIL\s/.test(l.t) || /❯\s+\S+:\d+:\d+/.test(l.t))
+      expect(chaves.length, id).toBeGreaterThan(0)
+      expect(chaves.filter((l) => !guardadas.has(l.n)).map((l) => l.n), `${id}: FAIL/❯ fora do recorte`).toEqual([])
+      const ref = json<[number, number][]>(join(FX, 'vitest-inteiros', `${id}.recorte.json`)).flatMap(([a, b]) =>
+        Array.from({ length: b - a + 1 }, (_, i) => a + i),
+      )
+      expect(rec.map((l) => l.n), `${id}: recorte TS != montar.py`).toEqual(ref)
+      expect(rec.length).toBeLessThanOrEqual(Math.max(300, chaves.length))
+    }
+  })
+
+  it('recortar de novo o recorte da fixture devolve o mesmo (o contexto conta pela linha original)', async () => {
+    const m = await carregar()
+    let n = 0
+    for (const d of casos()) {
+      for (const k of readdirSync(d).filter((x) => /^attempt-\d+$/.test(x))) {
+        const p = join(d, k, 'gate-vitest.txt')
+        if (!existsSync(p)) continue
+        const ns = json<{ faixas: [number, number][] }>(join(d, k, 'gate-vitest.linhas.json')).faixas.flatMap(([a, b]) =>
+          Array.from({ length: b - a + 1 }, (_, i) => a + i),
+        )
+        const ts = readFileSync(p, 'utf8').split('\n')
+        const linhas = ns.map((nn, i) => ({ n: nn, t: ts[i]! }))
+        const de_novo = m ? m.recortarVitest(linhas) : []
+        expect(de_novo.map((l) => l.n), `${d}/${k}`).toEqual(ns)
+        n++
+      }
+    }
+    expect(n).toBeGreaterThan(100)
+  })
+
+  it('um repo do molde test-fixture-painel.sh é lido pelo leitor kit', async () => {
+    const m = await carregar()
+    const tmp = mkdtempSync(join(tmpdir(), 'triador-kit-'))
+    const raiz = join(tmp, 'repo-kit')
+    execFileSync('bash', ['-c', `
+      set -e
+      export ORQ_TESTE=1 ORQ_EXEC_ROOT="$1" AQUI="$2"
+      source "$AQUI/test-fixture-painel.sh"
+      mkdir -p "$1/docs/fila"
+      fp_repo "$1"
+      fp_ticket "$1" 501 bloqueado '[]' '{"pathspec_allowlist": ["src/a.ts", "test/a.test.ts"]}'
+      t=$(fp_epoch_hoje 10:00:00)
+      fp_evento "$1" "$t" 501 INICIO attempt=1 model=sonnet
+      fp_evento "$1" "$((t+60))" 501 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=12
+      fp_evento "$1" "$((t+120))" 501 INICIO attempt=2 model=opus
+      fp_evento "$1" "$((t+180))" 501 BLOQUEADO motivo=repeticao sub=gate_testes diff=12 attempt=2
+    `, '_', raiz, AQUI], { stdio: 'pipe' })
+    const runs = join(raiz, 'docs/fila/runs/501')
+    for (const k of [0, 1]) {
+      mkdirSync(join(runs, `attempt-${k}`), { recursive: true })
+      writeFileSync(join(runs, `attempt-${k}`, 'gates.txt'), [
+        'ok   typecheck              2240ms',
+        'FALHA testes                37971ms — exit 1',
+        'VEREDITO: REPROVADO',
+        '',
+        '--- recorte de testes ---',
+        ' FAIL  test/b.test.ts > b > soma',
+        'AssertionError: expected 2 to be 3',
+        ' ❯ test/b.test.ts:7:15',
+      ].join('\n'))
+      writeFileSync(join(runs, `attempt-${k}`, 'diff.patch'), '--- a/src/a.ts\n+++ b/src/a.ts\n@@ -1 +1 @@\n-x\n+y\n')
+      writeFileSync(join(runs, `attempt-${k}`, 'veredito.json'), JSON.stringify({ desfecho: 'reprovado', causa: 'criterio_qualidade', sub: 'gate_testes', motivo: 'gate testes' }))
+    }
+    writeFileSync(join(runs, 'meta.json'), JSON.stringify([{ attempt: 0, diffLines: 2, dir: 'attempt-0' }, { attempt: 1, diffLines: 2, dir: 'attempt-1' }]))
+    expect(m?.detectarLeitor(raiz)).toBe('kit')
+    const ev = m?.lerRepo(raiz, '501')
+    expect(ev?.leitor).toBe('kit')
+    expect(ev?.bloqueio.token).toBe('repeticao:gate_testes')
+    expect(ev?.bloqueio.refs[0]?.arquivo).toBe('docs/fila/runs/events.log')
+    expect(ev?.tentativas.map((t) => [t.dir, t.estagio, t.diff_linhas])).toEqual([
+      ['docs/fila/runs/501/attempt-0', 'vitest', 2],
+      ['docs/fila/runs/501/attempt-1', 'vitest', 2],
+    ])
+    expect(ev?.tentativas[1]?.vermelhos.map((v) => [v.arquivo, v.linha, v.ref.arquivo, v.ref.linha])).toEqual([
+      ['test/b.test.ts', 7, 'docs/fila/runs/501/attempt-1/gates.txt', 8],
+    ])
+  })
+
+  it('o leitor legado num repo materializado de um caso dá a mesma evidência que a fixture (940, 760, 627b)', async () => {
+    const m = await carregar()
+    for (const nome of ['36-940-L85222', '21-760-L72407', '05-627b-L56021']) {
+      const d = join(FX, nome)
+      const raiz = materializar(d)
+      const daFixture = m?.lerCasoDeFixture(d)
+      const doRepo = m?.lerRepoLegado(raiz, json<{ id: string }>(join(d, 'caso.json')).id)
+      const resumo = (e: Ev | undefined) =>
+        e && {
+          leitor: e.leitor,
+          bloqueio: { token: e.bloqueio.token, refs: e.bloqueio.refs, origem: e.bloqueio.origem },
+          merge: e.merge_recusado,
+          tentativas: e.tentativas.map((t) => ({
+            dir: t.dir, estagio: t.estagio, vermelhos: t.vermelhos, falhos: t.criterios_falhos.map((c) => c.ref), diff: t.diff_linhas,
+          })),
+        }
+      expect(resumo(daFixture), nome).toBeTruthy()
+      expect(resumo(doRepo), nome).toEqual(resumo(daFixture))
+    }
+  })
+})
+
+/**
+ * Um repo do legado a partir de um caso da fixture: os artefatos voltam ao
+ * caminho original, cada linha no número original. A linha que o recorte não
+ * guardou vira um quadro de pilha (que o recorte nunca escolhe), e o PASS de
+ * critério vira reticências; assim o leitor do repo recorta o mesmo.
+ */
+function materializar(d: string): string {
+  const raiz = mkdtempSync(join(tmpdir(), 'triador-legado-'))
+  const caso = json<{ id: string; arquivo_ticket: string; fim: string }>(join(d, 'caso.json'))
+  const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
+  const escreve = (rel: string, txt: string) => {
+    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
+    writeFileSync(join(raiz, rel), txt)
+  }
+  escreve(caso.arquivo_ticket, `# ${caso.id}\n\n\`\`\`json\n${readFileSync(join(d, 'ticket.json'), 'utf8')}\`\`\`\n`)
+  escreve('docs/fila/000-config.json', readFileSync(join(d, 'config.json'), 'utf8'))
+  const log = readFileSync(join(d, 'log.txt'), 'utf8').split('\n').filter(Boolean)
+  const ultimo = Number(log.at(-1)!.split('\t')[0])
+  const linhas = Array.from({ length: ultimo }, () => '')
+  for (const l of log) linhas[Number(l.slice(0, l.indexOf('\t'))) - 1] = l.slice(l.indexOf('\t') + 1)
+  escreve('docs/fila/runs/local-loop.log', linhas.join('\n') + '\n')
+  const base = serie[0]!.dir.split('/').slice(0, 4).join('/')
+  escreve(`${base}/meta.json`, readFileSync(join(d, 'meta.json'), 'utf8'))
+  const fimS = Date.parse(caso.fim) / 1000 - 60
+  for (const s of serie) {
+    const de = join(d, `attempt-${s.k}`)
+    for (const f of readdirSync(de)) {
+      if (f.endsWith('.linhas.json') || f === 'presenca.json') continue
+      let txt = readFileSync(join(de, f), 'utf8')
+      const mapa = join(de, f.replace(/\.txt$/, '.linhas.json'))
+      if (f.endsWith('.txt') && existsSync(mapa)) {
+        const { total, faixas } = json<{ total: number; faixas: [number, number][] }>(mapa)
+        const enche = f === 'gate-vitest.txt' ? '    at fora (do-recorte.js:1:1)' : '…'
+        const out: string[] = Array.from({ length: total }, () => enche)
+        const ts = txt.split('\n')
+        let i = 0
+        for (const [a, b] of faixas) for (let n = a; n <= b; n++) out[n - 1] = ts[i++]!
+        txt = out.join('\n')
+      }
+      escreve(`${s.dir}/${f}`, txt)
+    }
+    // os arquivos que a fixture não copiou (gate-build, diff.raw…) existem pela presença
+    for (const f of json<string[]>(join(de, 'presenca.json'))) {
+      if (!existsSync(join(raiz, s.dir, f))) escreve(`${s.dir}/${f}`, '')
+    }
+    for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
+  }
+  return raiz
+}
```

### 541f9d1
```diff
commit 541f9d152376696b7920099c8e50d3e78a4b60d2
Author: Lucas Santos
Date: Sat Oct 10 18:43:01 2026 -0300

7f-b1-3: extracao deterministica e regras D1-D12

scripts/orquestrador/triador/extrair.ts: a primeira regra que casa decide,
pelo estagio da ultima tentativa (spec 7f-a §3.2). Firme so com a fonte
que a regra usa presente: sem fonte do teste o acoplamento e null (R1 vira
palpite), sem indice de vizinhos a base nao fecha, sem diff.stat ou cap o
diff-cap nao decide. O que o agente disse nao entra em regra. Allowlist por
matchesAllowlist (enforcement-core.ts); local por primeiroLocal
(diagnostico.ts).

A evidencia de um vermelho e a linha FAIL, o erro logo abaixo e o local ❯
(Tentativa.falhas, lido em comum.ts).

Fixture, estado da passada: 16 firmes certos (os da spec §3.3), 0 firme
errado, 13 palpites certos, 7 errados, 1 sem regra; instante do bloqueio:
14 firmes (760 e 898 #31 em R5?); controle: nenhum firme.

orquestrador-triador-extrair.test.ts: regra de falta, familia do vizinho,
agente nao decide, base vermelha do kit.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orquestrador/triador/comum.ts b/scripts/orquestrador/triador/comum.ts
index dfbe730..c07d09e 100644
--- a/scripts/orquestrador/triador/comum.ts
+++ b/scripts/orquestrador/triador/comum.ts
@@ -6,7 +6,7 @@
  */
 import { primeiroLocal } from '../diagnostico.js'
 import { trecho } from './recorte.js'
-import type { Arquivo, CriterioFalho, Juiz, Ref, TicketLido, Vermelho } from './tipos.js'
+import type { Arquivo, CriterioFalho, Falha, Juiz, Ref, TicketLido, Vermelho } from './tipos.js'
 
 export const ref = (a: Arquivo, n: number | null, t: string): Ref => ({ arquivo: a.rel, linha: n, trecho: trecho(t) })
 
@@ -42,28 +42,42 @@ const ARQ_TESTE = String.raw`\S+\.(?:test|spec)\.[cm]?[jt]sx?`
 const RE_FAIL = new RegExp(String.raw`^\s*FAIL\s+(${ARQ_TESTE})(?:\s+(?:>\s+)?(.*))?$`)
 const RE_LOCAL = new RegExp(String.raw`❯\s+(${ARQ_TESTE}):(\d+):\d+`)
 const RE_MAQUINA = /Timeout waiting for worker|Timeout starting|\bEMFILE\b|\bENOSPC\b/
+const RE_ERRO = /Error|Cannot find module|timed out/
+const ATE_O_ERRO = 3
 
 /**
  * Os vermelhos de um recorte de gate de testes: um por `❯ arquivo:linha`
  * (o local, por `primeiroLocal` do diagnostico.ts), e um por arquivo com FAIL
  * que não teve local. O `it` é o nome do FAIL mais recente do mesmo arquivo.
  */
-export function vermelhosDe(a: Arquivo): { vermelhos: Vermelho[]; arquivos: string[]; maquina: Ref[] } {
+export function vermelhosDe(a: Arquivo): { vermelhos: Vermelho[]; arquivos: string[]; falhas: Falha[]; maquina: Ref[] } {
   const vermelhos: Vermelho[] = []
+  const falhas: Falha[] = []
   const arquivos: string[] = []
   const comLocal = new Set<string>()
   const ultimoIt = new Map<string, string>()
   const primeiroFail = new Map<string, { n: number; t: string; it: string | null }>()
   const maquina: Ref[] = []
-  for (const l of a.linhas) {
+  a.linhas.forEach((l, i) => {
     const f = RE_FAIL.exec(l.t)
     if (f) {
       const arq = f[1]!
+      // o erro é a linha logo abaixo do FAIL (até 3, sem buraco no original)
+      let erro: Ref | null = null
+      for (let j = i + 1; j <= i + ATE_O_ERRO && j < a.linhas.length; j++) {
+        const lj = a.linhas[j]!
+        if (lj.n !== l.n + (j - i) || RE_FAIL.test(lj.t)) break
+        if (RE_ERRO.test(lj.t)) {
+          erro = ref(a, lj.n, lj.t)
+          break
+        }
+      }
+      falhas.push({ arquivo: arq, ref: ref(a, l.n, l.t), erro })
       if (!arquivos.includes(arq)) arquivos.push(arq)
       const it = (f[2] ?? '').replace(/\s*\[.*\]\s*$/, '').trim() || null
       if (it) ultimoIt.set(arq, it)
       if (!primeiroFail.has(arq)) primeiroFail.set(arq, { n: l.n, t: l.t, it })
-      continue
+      return
     }
     if (RE_LOCAL.test(l.t)) {
       const loc = primeiroLocal(l.t.slice(l.t.indexOf('❯')))
@@ -75,11 +89,11 @@ export function vermelhosDe(a: Arquivo): { vermelhos: Vermelho[]; arquivos: stri
       }
     }
     if (RE_MAQUINA.test(l.t)) maquina.push(ref(a, l.n, l.t))
-  }
+  })
   for (const [arq, f] of primeiroFail) {
     if (!comLocal.has(arq)) vermelhos.push({ arquivo: arq, linha: null, it: f.it, ref: ref(a, f.n, f.t) })
   }
-  return { vermelhos, arquivos, maquina }
+  return { vermelhos, arquivos, falhas, maquina }
 }
 
 /** Blocos `### criterio[i] -> X` com X != PASS do criterios.txt do legado. */
diff --git a/scripts/orquestrador/triador/extrair.ts b/scripts/orquestrador/triador/extrair.ts
new file mode 100644
index 0000000..0db893d
--- /dev/null
+++ b/scripts/orquestrador/triador/extrair.ts
@@ -0,0 +1,260 @@
+/**
+ * extrair.ts — a extração determinística e as regras D1-D12 (spec 7f-a §3).
+ *
+ * Recebe a `Evidencia` (de qualquer leitor) e devolve a classe, se é FIRME
+ * (vai ao painel sem modelo) ou PALPITE (vai ao modelo com as provas), a regra
+ * que decidiu, a evidência `arquivo:linha` do original, o remédio em uma linha
+ * e o requeue. A primeira regra que casa decide; o estágio é o da ÚLTIMA
+ * tentativa da série.
+ *
+ * Regra de falta (§2): a classe só é firme se as fontes que a regra usa
+ * estão presentes. Sem o fonte do teste, o acoplamento é `null` e R1 vira
+ * palpite; sem índice de vizinhos, a base vermelha não fecha; sem diff.stat
+ * ou sem cap, o diff-cap não decide.
+ *
+ * O que o agente disse NUNCA entra numa regra (§6, regra 6).
+ *
+ * PURO: nada aqui lê disco.
+ */
+import { matchesAllowlist } from '../enforcement-core.js'
+import { noDiff } from './leitor-legado-comarka.js'
+import type { Evidencia, Ref, Tentativa, Vizinho } from './tipos.js'
+
+export type Regra = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9' | 'D10' | 'D11' | 'D12'
+
+export interface Extracao {
+  /** `R1`..`R7` quando firme; palpite leva `?` (`R5?`, `R1|R2?`); `null` = nenhuma regra casou */
+  classe: string | null
+  firme: boolean
+  regra: Regra | null
+  rotulo: string
+  evidencia: Ref[]
+  remedio: string
+  requeue: string
+  detalhe: Detalhe
+}
+
+export interface Detalhe {
+  estagios: string[]
+  vermelhos: { tentativa: number; arquivo: string; linha: number | null; dentro_allowlist: boolean; no_diff: boolean }[]
+  fora_da_allowlist_e_do_diff: string[]
+  acoplado: boolean | null
+  aceite: boolean
+  vizinhos_base: { arquivo: string; tickets: string[] }[]
+  maquina: boolean
+  merge_recusado: string[]
+  diff_linhas: number | null
+  diff_cap: number | null
+  criterios_falhos: { tentativa: number; criterio: string; saida: string[] }[]
+}
+
+const ROTULO: Record<string, string> = {
+  R1: 'teste acoplado fora da allowlist',
+  R2: 'critério com defeito de forma ou premissa',
+  R3: 'spec precisa de decisão, token, motor ou refatiamento',
+  R4: 'dependência: o aceite achou falta real no código',
+  R5: 'ambiente',
+  R6: 'motor: o orquestrador mediu ou decidiu errado',
+  R7: 'humano: só o dono decide',
+}
+export const rotuloDe = (classe: string | null): string => {
+  if (!classe) return 'sem regra'
+  const cs = classe.replace('?', '').split('|')
+  return cs.map((c) => ROTULO[c] ?? c).join(' ou ') + (classe.endsWith('?') ? ' (palpite)' : '')
+}
+
+// Acoplamento por nome (§3.1, item 5). Heurística: o que ela não pega fica palpite.
+const STEM_GENERICO = new Set(['page', 'route', 'index', 'layout'])
+const DIR_GENERICO = new Set(['dashboard', 'components', 'supabase', 'migrations', 'clientes'])
+
+function stem(arquivo: string): string {
+  const base = arquivo.split('/').pop() ?? arquivo
+  return base.replace(/\.(test|spec)?\.?[cm]?[jt]sx?$|\.sql$|\.json$/, '')
+}
+
+/** O teste vermelho cita, no fonte em `head`, um nome-base ou um diretório do diff. */
+export function acopla(fonte: string, diff: string[]): boolean {
+  const stems = new Set(diff.map(stem).filter((s) => s.length >= 4 && !STEM_GENERICO.has(s)))
+  const dirs = new Set(diff.flatMap((f) => f.split('/').slice(0, -1)).filter((d) => d.length >= 5 && !DIR_GENERICO.has(d)))
+  return [...stems].some((s) => fonte.includes(s)) || [...dirs].some((d) => fonte.includes(d))
+}
+
+const familia = (id: string) => /^\d+/.exec(id)?.[0] ?? id
+const JANELA_MS = 6 * 3600 * 1000
+
+/** A prova de um vermelho: a linha FAIL, o erro logo abaixo e o local `❯ arquivo:linha`. */
+function vermelhoRefs(t: Tentativa, arquivo: string): Ref[] {
+  const fs = t.falhas.filter((f) => f.arquivo === arquivo).flatMap((f) => (f.erro ? [f.ref, f.erro] : [f.ref]))
+  return [...fs, ...t.vermelhos.filter((v) => v.arquivo === arquivo && v.linha !== null).map((v) => v.ref)]
+}
+
+function dedup(refs: Ref[]): Ref[] {
+  const vistos = new Set<string>()
+  return refs.filter((r) => {
+    const k = `${r.arquivo}:${r.linha}`
+    if (vistos.has(k)) return false
+    vistos.add(k)
+    return true
+  })
+}
+
+/** `arquivo:linha` do primeiro local `❯` entre as provas, ou só o arquivo. */
+const local = (refs: Ref[], arquivo: string): string => {
+  const m = refs.map((r) => /❯\s+\S+?:(\d+):\d+/.exec(r.trecho)).find(Boolean)
+  return m ? `${arquivo}:${m[1]}` : arquivo
+}
+
+export function extrair(ev: Evidencia): Extracao {
+  const al = ev.ticket?.pathspec_allowlist ?? []
+  const cobre = (f: string) => al.length > 0 && matchesAllowlist(f, al)
+  const ts = ev.tentativas
+  const ult = ts.at(-1)
+  const est = ts.map((t) => t.estagio)
+  const fim = ev.bloqueio.quando ? Date.parse(ev.bloqueio.quando) : NaN
+  const aceite = al.length > 0 && al.every((g) => g.startsWith('test/'))
+
+  // vermelhos fora da allowlist e fora do diff da própria tentativa, com o fonte
+  const fora: { t: Tentativa; arquivo: string }[] = []
+  const vermelhos: Detalhe['vermelhos'] = []
+  for (const t of ts) {
+    for (const f of t.arquivos_vermelhos) {
+      const dentro = cobre(f)
+      const nd = noDiff(f, t.diff_arquivos)
+      const loc = t.vermelhos.find((v) => v.arquivo === f)
+      vermelhos.push({ tentativa: t.n, arquivo: f, linha: loc?.linha ?? null, dentro_allowlist: dentro, no_diff: nd })
+      if (!dentro && !nd) fora.push({ t, arquivo: f })
+    }
+  }
+  let acoplado: boolean | null = false
+  const acoplados: { t: Tentativa; arquivo: string }[] = []
+  for (const x of fora) {
+    const src = x.t.fontes[x.arquivo]
+    if (src === null || src === undefined) {
+      if (acoplado === false) acoplado = null
+      continue
+    }
+    if (acopla(src, x.t.diff_arquivos)) acoplados.push(x)
+  }
+  if (acoplados.length) acoplado = true
+
+  // base vermelha: o mesmo arquivo, em outra família, nas ±6 h
+  const vizinhosDe = (f: string): Vizinho[] =>
+    ev.vizinhos.filter(
+      (v) =>
+        v.arquivo === f &&
+        familia(v.ticket) !== familia(ev.id) &&
+        (Number.isNaN(fim) || Number.isNaN(Date.parse(v.ts)) || Math.abs(Date.parse(v.ts) - fim) <= JANELA_MS),
+    )
+  const base: { t: Tentativa; arquivo: string; viz: Vizinho[] }[] = []
+  for (const x of fora) {
+    const viz = vizinhosDe(x.arquivo)
+    if (viz.length) base.push({ ...x, viz })
+  }
+
+  const maquina = ult?.maquina ?? []
+  const detalhe: Detalhe = {
+    estagios: est,
+    vermelhos,
+    fora_da_allowlist_e_do_diff: [...new Set(fora.map((x) => x.arquivo))],
+    acoplado,
+    aceite,
+    vizinhos_base: [...new Set(base.map((b) => b.arquivo))].map((arquivo) => ({
+      arquivo,
+      tickets: [...new Set(base.filter((b) => b.arquivo === arquivo).flatMap((b) => b.viz.map((v) => v.ticket)))].sort(),
+    })),
+    maquina: maquina.length > 0,
+    merge_recusado: ev.merge_recusado?.arquivos ?? [],
+    diff_linhas: ult?.diff_linhas ?? null,
+    diff_cap: ev.config.diff_cap_linhas,
+    criterios_falhos: ts.flatMap((t) => t.criterios_falhos.map((c) => ({ tentativa: t.n, criterio: c.criterio, saida: c.saida }))),
+  }
+  const sai = (classe: string | null, regra: Regra | null, evidencia: Ref[], remedio: string, requeue = 'nao'): Extracao => ({
+    classe,
+    firme: classe !== null && !classe.endsWith('?'),
+    regra,
+    rotulo: rotuloDe(classe),
+    evidencia: dedup(evidencia),
+    remedio,
+    requeue,
+    detalhe,
+  })
+  if (!ult) return sai(null, null, [], 'sem tentativa na série: decisão humana')
+  const u = ult.estagio
+
+  // D1 · merge recusado (árvore suja) e o juiz aprovou
+  if (u === 'juiz_ok_merge_falhou' && ev.merge_recusado && ult.juiz?.aprovado === true) {
+    const alvo = /merge em (\S+)/.exec(ts.map((t) => t.juiz?.motivo ?? '').join(' '))?.[1]
+    const juizRefs = ts.filter((t) => t.juiz?.aprovado === true).map((t) => t.juiz!.ref)
+    return sai(
+      'R5',
+      'D1',
+      [...ev.merge_recusado.refs, ...juizRefs],
+      `limpar ${ev.merge_recusado.arquivos.join(', ')} na worktree alvo${alvo ? ` (${alvo})` : ''} e reabrir: mérito aprovado em ${juizRefs.length} tentativa(s)`,
+      'sim_apos:arvore_alvo_limpa',
+    )
+  }
+
+  // D2 / D3 · diff-cap contra o diff.stat
+  if (u === 'diff_cap' && ult.diff_ref && ult.diff_linhas !== null && ev.config.diff_cap_linhas !== null) {
+    const cap = ev.config.diff_cap_linhas
+    const provas = [...ts.map((t) => t.diff_ref).filter((r): r is Ref => r !== null), ...ev.motor.filter((r) => /diff grande|diff_cap|DIFF-CAP/i.test(r.trecho))]
+    if (ult.diff_linhas <= cap) {
+      return sai('R6', 'D2', provas, `não fatiar: diff.stat dá ${ult.diff_linhas} ≤ cap ${cap}; o contador do motor está errado`, 'sim_apos:conserto_motor')
+    }
+    return sai('R3?', 'D3', provas, `decidir: refatiar (diff.stat dá ${ult.diff_linhas} > cap ${cap})`)
+  }
+
+  // D4 · máquina (worker do vitest, EMFILE, ENOSPC na última tentativa)
+  if (maquina.length) {
+    const r = maquina[0]!
+    const estouros = ult.falhas.flatMap((f) => (f.erro && /timed out/i.test(f.erro.trecho) ? [f.ref, f.erro] : []))
+    return sai('R5', 'D4', [...maquina, ...estouros], `reabrir com a máquina livre: "${r.trecho.slice(0, 60)}" em ${r.arquivo}:${r.linha}`, 'sim_apos:maquina_ok')
+  }
+
+  // D5 · base vermelha
+  if (ev.base_vermelha_motor) {
+    const a = ev.base_vermelha_motor.arquivos[0] ?? ''
+    return sai('R5', 'D5', [ev.base_vermelha_motor.ref], `consertar a base: ${ev.base_vermelha_motor.arquivos.join(', ')} vermelho fora do diff e da allowlist (o motor já decidiu)`, `sim_apos:base_verde:${a}`)
+  }
+  if (base.length) {
+    const b = base[0]!
+    const provas = [
+      ...base.flatMap((x) => vermelhoRefs(x.t, x.arquivo)),
+      ...base.flatMap((x) => x.viz.map((v) => ({ arquivo: `${v.dir}/gate-vitest.txt`, linha: v.linha, trecho: `FAIL ${v.arquivo} (${v.ticket}, ${v.ts})` }))),
+    ]
+    const ids = [...new Set(base.flatMap((x) => x.viz.map((v) => v.ticket)))].sort()
+    return sai('R5', 'D5', provas, `consertar a base: ${local(vermelhoRefs(b.t, b.arquivo), b.arquivo)} vermelho também em ${ids.join(', ')}, fora do diff`, `sim_apos:base_verde:${b.arquivo}`)
+  }
+
+  // D6 · vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou
+  if ((u === 'vitest' || u === 'enforcement') && fora.length && acoplado === true) {
+    const a = acoplados.at(-1)!
+    const provas = acoplados.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
+    return sai('R1', 'D6', provas, `pôr ${a.arquivo} na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em ${local(vermelhoRefs(a.t, a.arquivo), a.arquivo)}`)
+  }
+  const refsFora = fora.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
+  // D7 · vermelho fora, não acoplado (ou acoplamento sem fonte): base ou acoplamento indireto
+  if (u === 'vitest' && fora.length) {
+    return sai('R5?', 'D7', refsFora, `conferir se ${fora[0]!.arquivo} já está vermelho na base; senão pôr na allowlist com guarda`)
+  }
+  // D8 · enforcement sem vermelho acoplado
+  if (u === 'enforcement') {
+    return sai('R1?', 'D8', ult.enforcement ? [ult.enforcement.ref] : [], `conferir o arquivo que o enforcement barrou: ${(ult.enforcement?.violacoes ?? []).join('; ').slice(0, 120)}`)
+  }
+  const refsUlt = ult.arquivos_vermelhos.flatMap((f) => vermelhoRefs(ult, f))
+  // D9 / D10 · vitest com o vermelho dentro
+  if (u === 'vitest' && ult.arquivos_vermelhos.length) {
+    if (aceite) return sai('R4?', 'D9', refsUlt, `conferir se o aceite ${local(refsUlt, ult.arquivos_vermelhos[0]!)} achou falta real: criar ticket de código`)
+    return sai('R2?', 'D10', refsUlt, `conferir o critério ou a premissa do teste ${ult.arquivos_vermelhos[0]}`)
+  }
+  const refsCrit = ult.criterios_falhos.map((c) => c.ref)
+  // D11 / D12 · critério
+  if (u === 'criterios' && fora.length) {
+    return sai('R1|R2?', 'D11', [...refsCrit, ...refsFora], `conferir ${ult.criterios_falhos[0]?.criterio ?? 'o critério'} e o vermelho fora (${fora[0]!.arquivo}) de tentativa anterior`)
+  }
+  if (u === 'criterios' && ult.criterios_falhos.length) {
+    const c = ult.criterios_falhos[0]!
+    return sai('R2?', 'D12', refsCrit, `consertar ${c.criterio} no .md: saída "${c.saida.join(' | ').slice(0, 80)}"`)
+  }
+  return sai(null, null, [], 'nenhuma regra casou: vai ao modelo')
+}
diff --git a/scripts/orquestrador/triador/leitor-kit.ts b/scripts/orquestrador/triador/leitor-kit.ts
index e0ddd68..216daf8 100644
--- a/scripts/orquestrador/triador/leitor-kit.ts
+++ b/scripts/orquestrador/triador/leitor-kit.ts
@@ -145,7 +145,7 @@ export function lerRepoKit(raiz: string, id: string): Evidencia {
     // o recorte do gate que reprovou vem no próprio gates.txt (`--- recorte de X ---`)
     const iRec = gates ? gates.linhas.findIndex((l) => /^--- recorte de .* ---$/.test(l.t)) : -1
     const recorte: Arquivo | null = gates && iRec >= 0 ? { rel: gates.rel, linhas: gates.linhas.slice(iRec + 1), total: gates.total } : null
-    const v = recorte ? vermelhosDe(recorte) : { vermelhos: [], arquivos: [], maquina: [] }
+    const v = recorte ? vermelhosDe(recorte) : { vermelhos: [], arquivos: [], falhas: [], maquina: [] }
     const patch = lerArq(`${dirRel}/diff.patch`)
     const dp = patch ? diffPatch(patch) : null
     const vd = lerJson<{ motivo?: string; criterios_falhos?: string[]; criteriosFalhos?: string[] }>(join(dirAbs, 'veredito.json'))
@@ -181,6 +181,7 @@ export function lerRepoKit(raiz: string, id: string): Evidencia {
       estagio: estagioKit(dirAbs, gatesTxt, k === inicios.length - 1, motivoBloq),
       vermelhos: v.vermelhos,
       arquivos_vermelhos: v.arquivos,
+      falhas: v.falhas,
       criterios_falhos: crit ? criteriosFalhosKit(crit, falhos) : [],
       diff_arquivos: dp?.arquivos ?? [],
       diff_linhas: dp ? dp.linhas : typeof m?.diffLines === 'number' ? m.diffLines : null,
diff --git a/scripts/orquestrador/triador/leitor-legado-comarka.ts b/scripts/orquestrador/triador/leitor-legado-comarka.ts
index ea7bfc3..f61c726 100644
--- a/scripts/orquestrador/triador/leitor-legado-comarka.ts
+++ b/scripts/orquestrador/triador/leitor-legado-comarka.ts
@@ -101,7 +101,7 @@ function tentativa(fonte: FonteLegado, k: number, dir: string, meta: MetaLegado
   const vd = ler('verdict.json')
   const co = ler('claude-output.txt')
   const hd = ler('head.txt')
-  const v = vit ? vermelhosDe(vit) : { vermelhos: [], arquivos: [], maquina: [] }
+  const v = vit ? vermelhosDe(vit) : { vermelhos: [], arquivos: [], falhas: [], maquina: [] }
   const ds = stat ? diffStat(stat) : { arquivos: [], linhas: null, ref: null }
   let enforcement: Tentativa['enforcement'] = null
   if (enf) {
@@ -127,6 +127,7 @@ function tentativa(fonte: FonteLegado, k: number, dir: string, meta: MetaLegado
     estagio: estagioPorPresenca(fonte, dir, presentes),
     vermelhos: v.vermelhos,
     arquivos_vermelhos: v.arquivos,
+    falhas: v.falhas,
     criterios_falhos: crit ? criteriosFalhosLegado(crit) : [],
     diff_arquivos: ds.arquivos,
     diff_linhas: ds.linhas,
diff --git a/scripts/orquestrador/triador/tipos.ts b/scripts/orquestrador/triador/tipos.ts
index 7bef548..f5690bf 100644
--- a/scripts/orquestrador/triador/tipos.ts
+++ b/scripts/orquestrador/triador/tipos.ts
@@ -52,6 +52,12 @@ export interface Vermelho {
   ref: Ref
 }
 
+export interface Falha {
+  arquivo: string
+  ref: Ref
+  erro: Ref | null
+}
+
 export interface CriterioFalho {
   criterio: string
   cmd: string
@@ -77,6 +83,8 @@ export interface Tentativa {
   vermelhos: Vermelho[]
   /** arquivos de teste com FAIL na tentativa */
   arquivos_vermelhos: string[]
+  /** cada linha FAIL e a linha de erro logo abaixo dela (Error, AssertionError, timed out) */
+  falhas: Falha[]
   criterios_falhos: CriterioFalho[]
   diff_arquivos: string[]
   diff_linhas: number | null
diff --git a/test/orquestrador-triador-extrair.test.ts b/test/orquestrador-triador-extrair.test.ts
new file mode 100644
index 0000000..c016379
--- /dev/null
+++ b/test/orquestrador-triador-extrair.test.ts
@@ -0,0 +1,95 @@
+/**
+ * Etapa 7f-b1, peça 3 · regras D1-D12 além do placar do aceite (spec 7f-a §2,
+ * §3 e §6): a regra de falta (fonte ausente vira palpite, nunca firme), o que o
+ * agente disse não decide nada, e a base vermelha que o motor do kit já
+ * decidiu é prova firme.
+ *
+ * Os módulos entram por import dinâmico tolerante: sem `extrair.ts` o vermelho
+ * é de asserção.
+ */
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { describe, expect, it } from 'vitest'
+
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
+
+interface Ext { classe: string | null; firme: boolean; regra: string | null; evidencia: { arquivo: string; linha: number | null }[]; requeue: string }
+type Ev = any
+interface Mods { lerCasoDeFixture: (d: string, o?: { instante?: string }) => Ev; extrair: (e: Ev) => Ext }
+
+async function carregar(): Promise<Mods | null> {
+  try {
+    const a = (await import(pathToFileURL(join(TRIADOR, 'leitor-legado-comarka.ts')).href)) as Partial<Mods>
+    const b = (await import(pathToFileURL(join(TRIADOR, 'extrair.ts')).href)) as Partial<Mods>
+    return a.lerCasoDeFixture && b.extrair ? { lerCasoDeFixture: a.lerCasoDeFixture, extrair: b.extrair } : null
+  } catch {
+    return null
+  }
+}
+const NADA: Ext = { classe: null, firme: false, regra: null, evidencia: [], requeue: '' }
+
+describe('regras do triador (peça 3)', () => {
+  it('sem o fonte do teste vermelho, o R1 acoplado vira palpite (regra de falta)', async () => {
+    const m = await carregar()
+    const ev = m?.lerCasoDeFixture(join(FX, '07-627j-L57368'))
+    const antes = m && ev ? m.extrair(ev) : NADA
+    if (ev) for (const t of ev.tentativas) for (const k of Object.keys(t.fontes)) t.fontes[k] = null
+    const depois = m && ev ? m.extrair(ev) : NADA
+    expect([antes.classe, antes.firme, antes.regra]).toEqual(['R1', true, 'D6'])
+    expect([depois.classe, depois.firme, depois.regra]).toEqual(['R5?', false, 'D7'])
+  })
+
+  it('sem índice de vizinhos, a base vermelha não fecha (760 vira R5?)', async () => {
+    const m = await carregar()
+    const ev = m?.lerCasoDeFixture(join(FX, '21-760-L72407'))
+    const antes = m && ev ? m.extrair(ev) : NADA
+    if (ev) ev.vizinhos = []
+    const depois = m && ev ? m.extrair(ev) : NADA
+    expect([antes.classe, antes.regra, antes.requeue]).toEqual(['R5', 'D5', 'sim_apos:base_verde:test/migrations-policy-idempotente.test.ts'])
+    expect([depois.classe, depois.firme]).toEqual(['R5?', false])
+  })
+
+  it('vizinho da MESMA família não prova base vermelha (711a não conta para o 711b3)', async () => {
+    const m = await carregar()
+    const ev = m?.lerCasoDeFixture(join(FX, '21-760-L72407'))
+    if (ev) ev.vizinhos = ev.vizinhos.map((v: { ticket: string }) => ({ ...v, ticket: v.ticket === '760' ? '760' : '760b' }))
+    const x = m && ev ? m.extrair(ev) : NADA
+    expect([x.classe, x.firme]).toEqual(['R5?', false])
+  })
+
+  it('o que o agente disse não muda a classe (nunca é prova sozinho)', async () => {
+    const m = await carregar()
+    for (const nome of ['36-940-L85222', '01-559-L55054', '29-826-L80362', '35-950-L85145']) {
+      const ev = m?.lerCasoDeFixture(join(FX, nome))
+      const antes = m && ev ? m.extrair(ev) : NADA
+      if (ev) for (const t of ev.tentativas) t.agente_disse = 'base vermelha: Timeout waiting for worker; árvore suja; overwritten by merge'
+      const depois = m && ev ? m.extrair(ev) : NADA
+      expect(depois.classe, nome).toBe(antes.classe)
+      expect(depois.evidencia, nome).toEqual(antes.evidencia)
+      expect(antes.evidencia.every((r) => !/claude-output/.test(r.arquivo)), nome).toBe(true)
+    }
+    expect(m).not.toBeNull()
+  })
+
+  it('kit: BLOQUEADO motivo=base_vermelha já é prova firme, com a linha da trilha', async () => {
+    const m = await carregar()
+    const ref = { arquivo: 'docs/fila/runs/events.log', linha: 12, trecho: '… 510c BLOQUEADO motivo=base_vermelha arquivos=test/x.test.ts attempt=1' }
+    const ev = {
+      leitor: 'kit', repo: '/r', id: '510c',
+      ticket: { arquivo: 'docs/fila/510c-x.md', id: '510c', slug: 'x', status: 'bloqueado', notas_status: '', objetivo: '', pathspec_allowlist: ['src/a.ts'], criterios_aceite: [] },
+      bloqueio: { quando: '2026-09-24T01:10:29Z', token: 'base_vermelha', nota_do_motor: '', tentativas: 1, origem: 'motor', refs: [ref] },
+      tentativas: [{
+        n: 1, dir: 'docs/fila/runs/510c/attempt-0', estagio: 'vitest', vermelhos: [], arquivos_vermelhos: ['test/x.test.ts'], falhas: [],
+        criterios_falhos: [], diff_arquivos: ['src/a.ts'], diff_linhas: 2, diff_ref: null, enforcement: null, juiz: null,
+        agente_disse: null, head: null, dur_secs: null, maquina: [], recorte_vitest: null, recorte_criterios: null, diff_stat: null,
+        fontes: { 'test/x.test.ts': null },
+      }],
+      merge_recusado: null, motor: [], base_vermelha_motor: { arquivos: ['test/x.test.ts'], ref },
+      vizinhos: [], config: { diff_cap_linhas: 600, claude_timeout_secs: 1800 }, falta: [], lidos: [],
+    }
+    const x = m ? m.extrair(ev) : NADA
+    expect([x.classe, x.firme, x.regra, x.requeue]).toEqual(['R5', true, 'D5', 'sim_apos:base_verde:test/x.test.ts'])
+    expect(x.evidencia).toEqual([ref])
+  })
+})
```

### 6ce01fd
```diff
commit 6ce01fd80b60db531167e286c69e424a51b0bba3
Author: Lucas Santos
Date: Sat Oct 10 18:47:17 2026 -0300

7f-b1-4: saida fora do repo, trava, historico, copia mascarada

scripts/orquestrador/triador/:
- saida.ts: raiz ORQ_DIAG_DIR (padrao ~/.orq/diagnosticos); Guarda, a unica
  porta de escrita, resolve o caminho real e LANCA se o destino cai fora da
  raiz ou dentro de um repo do repos.json ou do repo triado; assinatura
  sha256 (repo, id, status, nota, nome/mtime/tamanho do que foi lido); trava
  <id>.lock com O_EXCL, orfa depois de 10 min; historico/<assin12>.json;
  copia da evidencia recortada e mascarada;
- mascara.ts: os padroes da spec §4, os mesmos do montar.py;
- triar.ts: ler, assinatura (mesma: nao roda), trava, extracao, copia,
  diagnostico no formato da spec §5; passada so promove palpite a firme;
  ticket que saiu de bloqueado fica com encerrado_em; arvore_alvo_agora so
  como registro;
- cli.ts: <repo> [<id>] [--passada] [--forcar], resumo por ticket.

orquestrador-triador-saida.test.ts: repo git de fixture (627j) com git
falso no PATH: git status e mtimes (inclusive de .git) iguais, nenhum
index.lock, todo git com GIT_OPTIONAL_LOCKS=0 e so verbo de leitura;
mesma assinatura nao roda; historico; segredo mascarado na copia; escrita
dentro de repo lanca; trava.

test/triador-repo-legado.ts: o materializar do teste da peca 2, agora
compartilhado.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orquestrador/triador/cli.ts b/scripts/orquestrador/triador/cli.ts
new file mode 100644
index 0000000..bd1ea5a
--- /dev/null
+++ b/scripts/orquestrador/triador/cli.ts
@@ -0,0 +1,53 @@
+/**
+ * cli.ts — `orq triar <repo> [<id>] [--passada] [--forcar]`.
+ *
+ * Roda a partir do KIT, lê o repo (caminho ou nome do `~/.orq/repos.json`),
+ * grava o diagnóstico em `ORQ_DIAG_DIR` (padrão `~/.orq/diagnosticos`) e
+ * imprime o resumo: uma linha por ticket. Não escreve no repo.
+ */
+import { triarRepo, resolverRepo, type Resultado } from './triar.js'
+
+export function resumo(rs: Resultado[]): string {
+  const linhas = rs.map((r) => {
+    const d = r.diagnostico
+    if (!d) return `${r.id}\t${r.feito}`
+    const classe = d.classe ?? 'sem classe'
+    const como = d.fonte === 'modelo' ? `modelo (${d.confianca})` : d.firme ? `firme ${d.regra}` : `palpite ${d.regra ?? '-'}`
+    return `${r.id}\t${classe}\t${como}\t${d.remedio}${d.requeue !== 'nao' ? `\t[requeue ${d.requeue}]` : ''}`
+  })
+  const firmes = rs.filter((r) => r.diagnostico?.firme).length
+  const palpites = rs.filter((r) => r.diagnostico && !r.diagnostico.firme).length
+  linhas.push(`-- ${rs.length} ticket(s): ${firmes} firme(s), ${palpites} palpite(s)/modelo, ${rs.length - firmes - palpites} sem nova triagem`)
+  return linhas.join('\n')
+}
+
+export interface Args {
+  repo: string
+  id?: string
+  passada: boolean
+  forcar: boolean
+}
+
+export function parseArgs(argv: string[]): Args {
+  const pos = argv.filter((a) => !a.startsWith('--'))
+  const flags = argv.filter((a) => a.startsWith('--'))
+  for (const f of flags) if (!['--passada', '--forcar'].includes(f)) throw new Error(`flag desconhecida: ${f}`)
+  if (!pos[0] || pos.length > 2) throw new Error('uso: orq triar <repo> [<id>] [--passada] [--forcar]')
+  return { repo: pos[0], ...(pos[1] ? { id: pos[1] } : {}), passada: flags.includes('--passada'), forcar: flags.includes('--forcar') }
+}
+
+export function main(argv: string[]): number {
+  let a: Args
+  try {
+    a = parseArgs(argv)
+  } catch (e) {
+    process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
+    return 1
+  }
+  const repo = resolverRepo(a.repo)
+  const rs = triarRepo(repo, { ...(a.id ? { id: a.id } : {}), passada: a.passada, forcar: a.forcar })
+  process.stdout.write(`${repo.nome} (${repo.caminho})\n${resumo(rs)}\n`)
+  return 0
+}
+
+if (/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(main(process.argv.slice(2)))
diff --git a/scripts/orquestrador/triador/mascara.ts b/scripts/orquestrador/triador/mascara.ts
new file mode 100644
index 0000000..f14590e
--- /dev/null
+++ b/scripts/orquestrador/triador/mascara.ts
@@ -0,0 +1,26 @@
+/**
+ * mascara.ts — segredo vira `‹segredo›` antes de qualquer envio ao modelo e na
+ * cópia de evidência (spec 7f-a §4 e §6, regra 8).
+ *
+ * Os padrões são os mesmos do `test/fixtures/triador-7f/montar.py`
+ * (`SEGREDOS`): `sk-…`, JWT (`eyJ…`), `service_role`, `SUPABASE_*=`,
+ * `*_KEY=`, `*_TOKEN=` com valor, e e-mail. Cobre os padrões conhecidos, não
+ * todos (spec §9): a cópia fica em `~/.orq`, fora de git.
+ *
+ * Nunca muda o número de linhas: a máscara não tem quebra.
+ */
+export const MASCARA = '‹segredo›'
+
+const SEGREDOS = [
+  /\bsk-[A-Za-z0-9_-]{8,}/g,
+  /\beyJ[A-Za-z0-9_-]{8,}(?:\.[A-Za-z0-9_-]+){0,2}/g,
+  /\bservice_role\b/g,
+  /\b(?:SUPABASE_[A-Z0-9_]*|[A-Z0-9_]*_KEY|[A-Z0-9_]*_TOKEN)=[^\s"'`]+/g,
+  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
+]
+
+export function mascarar(s: string): string {
+  let out = s
+  for (const r of SEGREDOS) out = out.replace(r, MASCARA)
+  return out
+}
diff --git a/scripts/orquestrador/triador/saida.ts b/scripts/orquestrador/triador/saida.ts
new file mode 100644
index 0000000..732ad18
--- /dev/null
+++ b/scripts/orquestrador/triador/saida.ts
@@ -0,0 +1,221 @@
+/**
+ * saida.ts — onde o triador escreve, e a única porta de escrita dele (spec
+ * 7f-a §1, §5 e §6, regra 1).
+ *
+ * Raiz: `ORQ_DIAG_DIR`, ou `~/.orq/diagnosticos`. Dentro dela:
+ *   <repo>/<id>.json                       o diagnóstico atual
+ *   <repo>/<id>.lock                       a trava (O_EXCL, pid e hora; órfã depois de 10 min)
+ *   <repo>/<id>/historico/<assin12>.json   os anteriores
+ *   <repo>/<id>/<assin12>/evidencia/…      a cópia mascarada do que foi lido
+ *   custo.json                             o ledger do modelo (peça 5)
+ *
+ * GUARDA: toda escrita passa por `Guarda`, que resolve o caminho real e LANÇA
+ * (não avisa) se o destino não está sob a raiz, ou se está sob qualquer
+ * caminho do `repos.json` ou sob o repo que está sendo triado.
+ */
+import { createHash } from 'node:crypto'
+import { closeSync, existsSync, mkdirSync, openSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync, writeSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
+import { mascarar } from './mascara.js'
+import type { Evidencia } from './tipos.js'
+
+export class EscritaRecusada extends Error {}
+
+export function raizDiagnosticos(): string {
+  return resolve(process.env.ORQ_DIAG_DIR || join(homedir(), '.orq', 'diagnosticos'))
+}
+
+export function arquivoRepos(): string {
+  return process.env.ORQ_REPOS || join(homedir(), '.orq', 'repos.json')
+}
+
+export interface RepoListado {
+  nome: string
+  caminho: string
+}
+
+/** `~/.orq/repos.json` como o painel lê (`orq-painel.py:ler_repos`): nome padrão é o do diretório. */
+export function lerRepos(): RepoListado[] {
+  try {
+    const d = JSON.parse(readFileSync(arquivoRepos(), 'utf8')) as { repos?: unknown }
+    const itens = Array.isArray(d.repos) ? d.repos : []
+    const out: RepoListado[] = []
+    for (const it of itens) {
+      const cam = typeof it === 'string' ? it : it && typeof it === 'object' ? (it as { caminho?: unknown }).caminho : null
+      if (typeof cam !== 'string' || !cam.trim()) continue
+      const caminho = resolve(cam.replace(/^~(?=\/|$)/, homedir()))
+      const nomeDado = it && typeof it === 'object' ? (it as { nome?: unknown }).nome : null
+      let nome = typeof nomeDado === 'string' && nomeDado.trim() ? nomeDado : caminho.split(sep).pop()!
+      const base = nome
+      for (let n = 2; out.some((r) => r.nome === nome); n++) nome = `${base}-${n}`
+      out.push({ nome, caminho })
+    }
+    return out
+  } catch {
+    return []
+  }
+}
+
+/** O caminho real, mesmo que ainda não exista: realpath do ancestral que existe + o resto. */
+export function caminhoReal(p: string): string {
+  const abs = resolve(p)
+  let base = abs
+  const resto: string[] = []
+  while (!existsSync(base)) {
+    const pai = dirname(base)
+    if (pai === base) break
+    resto.unshift(base.slice(pai.length + (pai.endsWith(sep) ? 0 : 1)))
+    base = pai
+  }
+  return join(realpathSync(base), ...resto)
+}
+
+const dentro = (filho: string, pai: string) => {
+  const r = relative(pai, filho)
+  return r === '' || (!r.startsWith('..') && !isAbsolute(r))
+}
+
+export class Guarda {
+  readonly raiz: string
+  private readonly protegidos: string[]
+
+  constructor(protegidosExtra: string[] = []) {
+    this.raiz = caminhoReal(raizDiagnosticos())
+    this.protegidos = [...lerRepos().map((r) => r.caminho), ...protegidosExtra].map((p) => caminhoReal(p))
+    for (const p of this.protegidos) {
+      if (dentro(this.raiz, p)) throw new EscritaRecusada(`raiz de diagnósticos ${this.raiz} está dentro do repo ${p}`)
+    }
+  }
+
+  /** O destino real, ou exceção se ele cai fora da raiz ou dentro de um repo. */
+  confere(destino: string): string {
+    const real = caminhoReal(destino)
+    if (!dentro(real, this.raiz)) throw new EscritaRecusada(`escrita fora de ${this.raiz}: ${real}`)
+    for (const p of this.protegidos) if (dentro(real, p)) throw new EscritaRecusada(`escrita dentro do repo ${p}: ${real}`)
+    return real
+  }
+
+  mkdir(d: string): void {
+    mkdirSync(this.confere(d), { recursive: true })
+  }
+
+  escrever(destino: string, conteudo: string): void {
+    const real = this.confere(destino)
+    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    writeFileSync(real, conteudo)
+  }
+
+  mover(de: string, para: string): void {
+    const a = this.confere(de)
+    const b = this.confere(para)
+    mkdirSync(this.confere(dirname(b)), { recursive: true })
+    renameSync(a, b)
+  }
+
+  apagar(p: string): void {
+    unlinkSync(this.confere(p))
+  }
+
+  /** Cria com O_EXCL; false se já existe. */
+  criarExclusivo(p: string, conteudo: string): boolean {
+    const real = this.confere(p)
+    mkdirSync(this.confere(dirname(real)), { recursive: true })
+    let fd: number
+    try {
+      fd = openSync(real, 'wx')
+    } catch (e) {
+      if ((e as NodeJS.ErrnoException).code === 'EEXIST') return false
+      throw e
+    }
+    try {
+      writeSync(fd, conteudo)
+    } finally {
+      closeSync(fd)
+    }
+    return true
+  }
+}
+
+// ─── assinatura ──────────────────────────────────────────────────────────────
+
+/**
+ * sha256(repo | id | status | notas_status | para cada arquivo lido, em ordem:
+ * nome, mtime_ns, tamanho). Mesma assinatura: não roda de novo (§1).
+ */
+export function assinatura(ev: Evidencia): string {
+  const h = createHash('sha256')
+  h.update([ev.repo, ev.id, ev.ticket?.status ?? '', ev.ticket?.notas_status ?? ''].join('|'))
+  for (const l of [...ev.lidos].sort((a, b) => a.arquivo.localeCompare(b.arquivo))) {
+    h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
+  }
+  return h.digest('hex')
+}
+
+// ─── trava ───────────────────────────────────────────────────────────────────
+
+export const TRAVA_ORFA_MS = 10 * 60 * 1000
+
+/** A trava do ticket. `null` se outro processo a segura (e ela não é órfã). */
+export function travar(g: Guarda, repo: string, id: string, agora = Date.now()): (() => void) | null {
+  const p = join(g.raiz, repo, `${id}.lock`)
+  const corpo = JSON.stringify({ pid: process.pid, hora: new Date(agora).toISOString() }) + '\n'
+  if (!g.criarExclusivo(p, corpo)) {
+    let idade = 0
+    try {
+      idade = agora - statSync(p).mtimeMs
+    } catch {
+      idade = TRAVA_ORFA_MS + 1
+    }
+    if (idade <= TRAVA_ORFA_MS) return null
+    try {
+      g.apagar(p)
+    } catch {
+      /* outro processo levou a órfã */
+    }
+    if (!g.criarExclusivo(p, corpo)) return null
+  }
+  return () => {
+    try {
+      g.apagar(p)
+    } catch {
+      /* já saiu */
+    }
+  }
+}
+
+// ─── diagnóstico e cópia ─────────────────────────────────────────────────────
+
+export const caminhoDiagnostico = (g: Guarda, repo: string, id: string) => join(g.raiz, repo, `${id}.json`)
+
+export function lerDiagnostico<T>(g: Guarda, repo: string, id: string): T | null {
+  try {
+    return JSON.parse(readFileSync(caminhoDiagnostico(g, repo, id), 'utf8')) as T
+  } catch {
+    return null
+  }
+}
+
+/** Grava o atual; o anterior (se havia) vai para `historico/<assinatura12>.json`. */
+export function gravarDiagnostico(g: Guarda, repo: string, id: string, diag: { assinatura: string }): void {
+  const atual = caminhoDiagnostico(g, repo, id)
+  const anterior = lerDiagnostico<{ assinatura?: string }>(g, repo, id)
+  if (anterior) {
+    const base = join(g.raiz, repo, id, 'historico', (anterior.assinatura ?? 'sem-assinatura').slice(0, 12))
+    let destino = `${base}.json`
+    for (let n = 2; existsSync(destino); n++) destino = `${base}-${n}.json`
+    g.mover(atual, destino)
+  }
+  g.escrever(atual, JSON.stringify(diag, null, 2) + '\n')
+}
+
+/** A cópia do que foi lido, já recortado e mascarado (§2, "Cópia da evidência"). */
+export function copiarEvidencia(g: Guarda, repo: string, ev: Evidencia, assin: string): string {
+  const dir = join(g.raiz, repo, ev.id, assin.slice(0, 12), 'evidencia')
+  for (const l of ev.lidos) {
+    if (isAbsolute(l.arquivo) || l.arquivo.split('/').includes('..')) continue
+    g.escrever(join(dir, l.arquivo), mascarar(l.conteudo))
+    if (l.faixas) g.escrever(join(dir, `${l.arquivo}.linhas.json`), JSON.stringify({ faixas: l.faixas }) + '\n')
+  }
+  return dir
+}
diff --git a/scripts/orquestrador/triador/triar.ts b/scripts/orquestrador/triador/triar.ts
new file mode 100644
index 0000000..704dac0
--- /dev/null
+++ b/scripts/orquestrador/triador/triar.ts
@@ -0,0 +1,223 @@
+/**
+ * triar.ts — um ticket bloqueado vira diagnóstico gravado FORA do repo
+ * (spec 7f-a §1 e §5).
+ *
+ *   ler a evidência → assinatura → (mesma assinatura: não roda) → trava →
+ *   extração → [modelo, só para palpite ou sem regra] → cópia da evidência →
+ *   diagnóstico atual (o anterior vai para o histórico) → solta a trava.
+ *
+ * A PASSADA (`--passada`) não chama modelo: refaz só a extração dos
+ * diagnósticos de até 6 h com classe em palpite, e grava só se a extração
+ * ficou firme (a prova de base vermelha às vezes chega depois: 760 → 761 em
+ * 17 min). O aceite mede o estado depois da passada.
+ *
+ * O triador NUNCA muda status de ticket, nota, critério nem nada do repo:
+ * a escrita passa só pela `Guarda` de saida.ts, e o git só por `gitLeitura`.
+ */
+import { existsSync, readdirSync, readFileSync } from 'node:fs'
+import { join, resolve } from 'node:path'
+import { blocoJson } from './comum.js'
+import { extrair, type Extracao } from './extrair.js'
+import { gitLeitura } from './git.js'
+import { lerRepo } from './leitor.js'
+import { Guarda, assinatura, caminhoDiagnostico, copiarEvidencia, gravarDiagnostico, lerDiagnostico, lerRepos, travar, type RepoListado } from './saida.js'
+import type { Evidencia, Ref } from './tipos.js'
+
+export const PASSADA_JANELA_MS = 6 * 3600 * 1000
+
+export interface Diagnostico {
+  $schema_versao: 1
+  repo: string
+  id: string
+  leitor: string
+  assinatura: string
+  gerado_em: string
+  bloqueio: { quando: string | null; token: string | null; nota_do_motor: string; tentativas: number; origem: string }
+  classe: string | null
+  rotulo: string
+  firme: boolean
+  fonte: 'extracao' | 'modelo'
+  regra: string | null
+  confianca: 'alta' | 'media' | 'baixa' | null
+  evidencia: Ref[]
+  remedio: string
+  requeue: string
+  arvore_alvo_agora: string
+  extracao: Extracao['detalhe'] & { classe: string | null; regra: string | null; firme: boolean }
+  modelo: unknown
+  falta: string[]
+  copia_evidencia: string
+  encerrado_em: string | null
+}
+
+/**
+ * O passo do modelo, injetado por quem chama (peça 5). Recebe a evidência e a
+ * extração; devolve o que entra em `diagnostico.modelo` e, se a resposta valeu,
+ * a classe que substitui o palpite.
+ */
+export type PassoModelo = (ctx: { ev: Evidencia; ext: Extracao; repo: string; assinatura: string; guarda: Guarda; agora: number; copia: string }) => {
+  registro: unknown
+  resposta?: { classe: string; confianca: 'alta' | 'media' | 'baixa'; evidencia: Ref[]; remedio: string; requeue: string; justificativa: string }
+}
+
+export interface Resultado {
+  id: string
+  feito: 'diagnosticado' | 'promovido' | 'mesma_assinatura' | 'travado' | 'sem_palpite_recente' | 'nao_promoveu'
+  diagnostico?: Diagnostico
+}
+
+const rotuloR5 = (regra: string | null) =>
+  regra === 'D1' ? 'ambiente: árvore suja na worktree alvo' : regra === 'D4' ? 'ambiente: máquina' : regra === 'D5' ? 'ambiente: base vermelha' : null
+
+/** `git status --porcelain` da worktree alvo, só como registro (nunca prova do passado). */
+function arvoreAlvoAgora(raiz: string, ext: Extracao): string {
+  if (ext.regra !== 'D1') return 'sem dado'
+  let cfg: Record<string, unknown> = {}
+  try {
+    cfg = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as Record<string, unknown>
+  } catch {
+    return 'sem dado'
+  }
+  const wtDir = typeof cfg.worktrees_dir === 'string' ? cfg.worktrees_dir : '../_worktrees'
+  const alvo = typeof cfg.branch_alvo === 'string' ? cfg.branch_alvo : 'staging-auto'
+  const wt = resolve(raiz, wtDir, alvo)
+  if (!existsSync(wt)) return 'sem dado'
+  const r = gitLeitura(wt, ['status', '--porcelain'])
+  if (r.rc !== 0) return 'sem dado'
+  const n = r.stdout.split('\n').filter(Boolean).length
+  return n === 0 ? 'limpa' : `suja: ${n} arquivo(s)`
+}
+
+function montar(repo: string, ev: Evidencia, ext: Extracao, assin: string, agora: number, copia: string, raiz: string): Diagnostico {
+  return {
+    $schema_versao: 1,
+    repo,
+    id: ev.id,
+    leitor: ev.leitor,
+    assinatura: assin,
+    gerado_em: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z'),
+    bloqueio: {
+      quando: ev.bloqueio.quando,
+      token: ev.bloqueio.token,
+      nota_do_motor: ev.bloqueio.nota_do_motor,
+      tentativas: ev.bloqueio.tentativas,
+      origem: ev.bloqueio.origem,
+    },
+    classe: ext.classe,
+    rotulo: (ext.classe === 'R5' && rotuloR5(ext.regra)) || ext.rotulo,
+    firme: ext.firme,
+    fonte: 'extracao',
+    regra: ext.regra,
+    confianca: ext.classe === null ? null : ext.firme ? 'alta' : 'baixa',
+    evidencia: ext.evidencia,
+    remedio: ext.remedio,
+    requeue: ext.requeue,
+    arvore_alvo_agora: arvoreAlvoAgora(raiz, ext),
+    extracao: { ...ext.detalhe, classe: ext.classe, regra: ext.regra, firme: ext.firme },
+    modelo: null,
+    falta: ev.falta,
+    copia_evidencia: copia,
+    encerrado_em: null,
+  }
+}
+
+export interface OpcoesTriar {
+  repo: RepoListado
+  id: string
+  passada?: boolean
+  forcar?: boolean
+  modelo?: PassoModelo | null
+  agora?: number
+}
+
+export function triarTicket(o: OpcoesTriar): Resultado {
+  const agora = o.agora ?? Date.now()
+  const g = new Guarda([o.repo.caminho])
+  const existente = lerDiagnostico<Diagnostico>(g, o.repo.nome, o.id)
+  if (o.passada) {
+    const recente = existente && agora - Date.parse(existente.gerado_em) <= PASSADA_JANELA_MS
+    if (!existente || !recente || existente.extracao.firme || existente.extracao.classe === null || existente.encerrado_em) {
+      return { id: o.id, feito: 'sem_palpite_recente' }
+    }
+  }
+  const ev = lerRepo(o.repo.caminho, o.id, { agora })
+  const assin = assinatura(ev)
+  if (!o.passada && !o.forcar && existente?.assinatura === assin) return { id: o.id, feito: 'mesma_assinatura' }
+  const soltar = travar(g, o.repo.nome, o.id, agora)
+  if (!soltar) return { id: o.id, feito: 'travado' }
+  try {
+    const ext = extrair(ev)
+    if (o.passada && !ext.firme) return { id: o.id, feito: 'nao_promoveu' }
+    const copia = copiarEvidencia(g, o.repo.nome, ev, assin)
+    const diag = montar(o.repo.nome, ev, ext, assin, agora, copia, o.repo.caminho)
+    if (!o.passada && !ext.firme && o.modelo) {
+      const m = o.modelo({ ev, ext, repo: o.repo.nome, assinatura: assin, guarda: g, agora, copia })
+      diag.modelo = m.registro
+      if (m.resposta) {
+        diag.classe = m.resposta.classe
+        diag.rotulo = m.resposta.classe === 'R5' ? 'ambiente' : diag.rotulo
+        diag.fonte = 'modelo'
+        diag.firme = false
+        diag.regra = ext.regra
+        diag.confianca = m.resposta.confianca
+        diag.evidencia = m.resposta.evidencia
+        diag.remedio = m.resposta.remedio
+        diag.requeue = m.resposta.requeue
+      }
+    }
+    gravarDiagnostico(g, o.repo.nome, o.id, diag)
+    return { id: o.id, feito: o.passada ? 'promovido' : 'diagnosticado', diagnostico: diag }
+  } finally {
+    soltar()
+  }
+}
+
+/** Os ids com `status: "bloqueado"` no 1º bloco json dos tickets do repo. */
+export function bloqueados(raiz: string): string[] {
+  const fila = join(raiz, 'docs/fila')
+  let nomes: string[] = []
+  try {
+    nomes = readdirSync(fila).filter((f) => /^[0-9][0-9a-z]*-.*\.md$/.test(f))
+  } catch {
+    return []
+  }
+  const out: string[] = []
+  for (const f of nomes.sort()) {
+    const j = blocoJson(readFileSync(join(fila, f), 'utf8'))
+    if (j?.status === 'bloqueado' && typeof j.id === 'string') out.push(j.id)
+  }
+  return out
+}
+
+/**
+ * O repo inteiro (ou um id): os bloqueados ganham diagnóstico; o diagnóstico
+ * de ticket que SAIU de bloqueado fica, marcado `encerrado_em`.
+ */
+export function triarRepo(repo: RepoListado, o: { id?: string; passada?: boolean; forcar?: boolean; modelo?: PassoModelo | null; agora?: number } = {}): Resultado[] {
+  const agora = o.agora ?? Date.now()
+  const ids = o.id ? [o.id] : bloqueados(repo.caminho)
+  const out = ids.map((id) => triarTicket({ repo, id, agora, ...(o.passada ? { passada: true } : {}), ...(o.forcar ? { forcar: true } : {}), ...(o.modelo ? { modelo: o.modelo } : {}) }))
+  if (!o.id) {
+    const g = new Guarda([repo.caminho])
+    const dir = join(g.raiz, repo.nome)
+    const ainda = new Set(ids)
+    const atuais = existsSync(dir) ? readdirSync(dir).filter((f) => f.endsWith('.json')) : []
+    for (const f of atuais) {
+      const id = f.slice(0, -'.json'.length)
+      if (ainda.has(id)) continue
+      const d = lerDiagnostico<Diagnostico>(g, repo.nome, id)
+      if (d && !d.encerrado_em) g.escrever(caminhoDiagnostico(g, repo.nome, id), JSON.stringify({ ...d, encerrado_em: new Date(agora).toISOString().replace(/\.\d{3}Z$/, 'Z') }, null, 2) + '\n')
+    }
+  }
+  return out
+}
+
+/** `<repo>` da linha de comando: um caminho, ou um nome do repos.json. */
+export function resolverRepo(arg: string): RepoListado {
+  const listados = lerRepos()
+  const porNome = listados.find((r) => r.nome === arg)
+  if (porNome) return porNome
+  const caminho = resolve(arg)
+  const porCaminho = listados.find((r) => r.caminho === caminho)
+  return porCaminho ?? { nome: caminho.split('/').pop()!, caminho }
+}
diff --git a/test/orquestrador-triador-leitores.test.ts b/test/orquestrador-triador-leitores.test.ts
index 1ec6ad1..24636f4 100644
--- a/test/orquestrador-triador-leitores.test.ts
+++ b/test/orquestrador-triador-leitores.test.ts
@@ -16,12 +16,13 @@
  * asserção, não de import.
  */
 import { execFileSync } from 'node:child_process'
-import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
+import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
 import { tmpdir } from 'node:os'
-import { dirname, join } from 'node:path'
+import { join } from 'node:path'
 import { pathToFileURL } from 'node:url'
 import { gunzipSync } from 'node:zlib'
 import { describe, expect, it } from 'vitest'
+import { materializar } from './triador-repo-legado.js'
 
 const RAIZ = join(import.meta.dirname, '..')
 const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
@@ -227,53 +228,3 @@ describe('leitores do triador (peça 2)', () => {
     }
   })
 })
-
-/**
- * Um repo do legado a partir de um caso da fixture: os artefatos voltam ao
- * caminho original, cada linha no número original. A linha que o recorte não
- * guardou vira um quadro de pilha (que o recorte nunca escolhe), e o PASS de
- * critério vira reticências; assim o leitor do repo recorta o mesmo.
- */
-function materializar(d: string): string {
-  const raiz = mkdtempSync(join(tmpdir(), 'triador-legado-'))
-  const caso = json<{ id: string; arquivo_ticket: string; fim: string }>(join(d, 'caso.json'))
-  const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
-  const escreve = (rel: string, txt: string) => {
-    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
-    writeFileSync(join(raiz, rel), txt)
-  }
-  escreve(caso.arquivo_ticket, `# ${caso.id}\n\n\`\`\`json\n${readFileSync(join(d, 'ticket.json'), 'utf8')}\`\`\`\n`)
-  escreve('docs/fila/000-config.json', readFileSync(join(d, 'config.json'), 'utf8'))
-  const log = readFileSync(join(d, 'log.txt'), 'utf8').split('\n').filter(Boolean)
-  const ultimo = Number(log.at(-1)!.split('\t')[0])
-  const linhas = Array.from({ length: ultimo }, () => '')
-  for (const l of log) linhas[Number(l.slice(0, l.indexOf('\t'))) - 1] = l.slice(l.indexOf('\t') + 1)
-  escreve('docs/fila/runs/local-loop.log', linhas.join('\n') + '\n')
-  const base = serie[0]!.dir.split('/').slice(0, 4).join('/')
-  escreve(`${base}/meta.json`, readFileSync(join(d, 'meta.json'), 'utf8'))
-  const fimS = Date.parse(caso.fim) / 1000 - 60
-  for (const s of serie) {
-    const de = join(d, `attempt-${s.k}`)
-    for (const f of readdirSync(de)) {
-      if (f.endsWith('.linhas.json') || f === 'presenca.json') continue
-      let txt = readFileSync(join(de, f), 'utf8')
-      const mapa = join(de, f.replace(/\.txt$/, '.linhas.json'))
-      if (f.endsWith('.txt') && existsSync(mapa)) {
-        const { total, faixas } = json<{ total: number; faixas: [number, number][] }>(mapa)
-        const enche = f === 'gate-vitest.txt' ? '    at fora (do-recorte.js:1:1)' : '…'
-        const out: string[] = Array.from({ length: total }, () => enche)
-        const ts = txt.split('\n')
-        let i = 0
-        for (const [a, b] of faixas) for (let n = a; n <= b; n++) out[n - 1] = ts[i++]!
-        txt = out.join('\n')
-      }
-      escreve(`${s.dir}/${f}`, txt)
-    }
-    // os arquivos que a fixture não copiou (gate-build, diff.raw…) existem pela presença
-    for (const f of json<string[]>(join(de, 'presenca.json'))) {
-      if (!existsSync(join(raiz, s.dir, f))) escreve(`${s.dir}/${f}`, '')
-    }
-    for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
-  }
-  return raiz
-}
diff --git a/test/orquestrador-triador-saida.test.ts b/test/orquestrador-triador-saida.test.ts
new file mode 100644
index 0000000..f4dd47c
--- /dev/null
+++ b/test/orquestrador-triador-saida.test.ts
@@ -0,0 +1,253 @@
+/**
+ * Etapa 7f-b1, peça 4 · a saída do triador fora do repo (spec 7f-a §1, §5, §6).
+ *
+ * Pronto quando:
+ *   - o triador roda num repo GIT de fixture e `git status --porcelain` não
+ *     muda, nenhum mtime muda (nem de diretório: um index.lock criado e
+ *     apagado mudaria o mtime de .git) e nenhum `index.lock` aparece;
+ *   - um `git` falso na frente do PATH registra o ambiente de cada chamada, e
+ *     todas levam `GIT_OPTIONAL_LOCKS=0` (e houve ao menos uma: o falso foi
+ *     usado de verdade);
+ *   - escrita com destino dentro de um repo do repos.json lança erro;
+ *   - mesma assinatura não roda duas vezes; trava O_EXCL; histórico; cópia
+ *     da evidência com segredo mascarado.
+ *
+ * Toda escrita do triador vai para um ORQ_DIAG_DIR temporário.
+ */
+import { execFileSync, spawnSync } from 'node:child_process'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, statSync, utimesSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+import { materializar } from './triador-repo-legado.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
+const TSX = join(RAIZ, 'node_modules', '.bin', 'tsx')
+const GIT_REAL = execFileSync('bash', ['-c', 'command -v git'], { encoding: 'utf8' }).trim()
+
+interface Mods {
+  Guarda: new (extra?: string[]) => { escrever: (p: string, c: string) => void; raiz: string }
+  EscritaRecusada: new (...a: unknown[]) => Error
+  triarTicket: (o: { repo: { nome: string; caminho: string }; id: string; agora?: number }) => { feito: string; diagnostico?: { classe: string | null; firme: boolean } }
+  gitLeitura: (raiz: string, args: string[]) => { rc: number }
+  GitProibido: new (...a: unknown[]) => Error
+}
+async function carregar(): Promise<Mods | null> {
+  try {
+    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
+    const m = { ...(await imp('saida.ts')), ...(await imp('triar.ts')), ...(await imp('git.ts')) }
+    return typeof m.Guarda === 'function' && typeof m.triarTicket === 'function' ? (m as unknown as Mods) : null
+  } catch {
+    return null
+  }
+}
+
+const SEGREDO = 'sk-ant-EXEMPLO_REMOVIDO'
+
+/** Um repo git do legado com o caso 627j: os fontes dos testes vermelhos no commit que o head.txt aponta. */
+function repoGit(base: string): string {
+  const raiz = join(base, 'comarka-fx')
+  mkdirSync(raiz, { recursive: true })
+  const d = join(FX, '07-627j-L57368')
+  const git = (...a: string[]) => execFileSync(GIT_REAL, ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', ...a], { stdio: 'pipe' })
+  git('init', '-q', '-b', 'main')
+  const fontes = join(d, 'fontes')
+  for (const head of readdirSync(fontes)) {
+    const varre = (dir: string, rel: string): void => {
+      for (const e of readdirSync(dir, { withFileTypes: true })) {
+        if (e.isDirectory()) varre(join(dir, e.name), `${rel}${e.name}/`)
+        else {
+          mkdirSync(join(raiz, rel), { recursive: true })
+          writeFileSync(join(raiz, rel, e.name.replace(/\.fonte$/, '')), readFileSync(join(dir, e.name)))
+        }
+      }
+    }
+    varre(join(fontes, head), '')
+  }
+  git('add', '-A')
+  git('commit', '-q', '-m', 'fontes')
+  const sha = execFileSync(GIT_REAL, ['-C', raiz, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim()
+  materializar(d, raiz)
+  const serie = JSON.parse(readFileSync(join(d, 'serie.json'), 'utf8')) as { dir: string }[]
+  for (const s of serie) {
+    writeFileSync(join(raiz, s.dir, 'head.txt'), `${sha}\n`)
+    const co = join(raiz, s.dir, 'claude-output.txt')
+    writeFileSync(co, `${existsSync(co) ? readFileSync(co, 'utf8') : ''}\nchave vazada: ${SEGREDO}\n`)
+  }
+  // o ticket bloqueado, como o motor do legado deixa
+  const caso = JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { arquivo_ticket: string }
+  const tk = readFileSync(join(raiz, caso.arquivo_ticket), 'utf8').replace(/"status": "[a-z]+"/, '"status": "bloqueado"')
+  writeFileSync(join(raiz, caso.arquivo_ticket), tk)
+  git('add', '-A')
+  git('commit', '-q', '-m', 'repo')
+  // mtimes da série no instante do bloqueio (o add/commit não mexe, mas o write acima sim)
+  const fimS = Date.parse((JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { fim: string }).fim) / 1000 - 60
+  for (const s of serie) for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
+  return raiz
+}
+
+/** mtime e tamanho de TUDO sob a raiz, inclusive .git e os próprios diretórios. */
+function retrato(raiz: string): Record<string, string> {
+  const out: Record<string, string> = {}
+  const varre = (p: string) => {
+    const st = statSync(p, { bigint: true })
+    out[p] = `${st.mtimeNs}:${st.isDirectory() ? 'd' : st.size}`
+    if (st.isDirectory()) for (const f of readdirSync(p)) varre(join(p, f))
+  }
+  varre(raiz)
+  return out
+}
+
+let base: string
+let diag: string
+const envAntes = { ...process.env }
+beforeEach(() => {
+  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-saida-')))
+  diag = join(base, 'diag')
+  process.env.ORQ_DIAG_DIR = diag
+  process.env.ORQ_REPOS = join(base, 'repos.json')
+})
+afterEach(() => {
+  process.env = { ...envAntes }
+})
+
+function triarCli(raiz: string, args: string[] = []) {
+  const bin = join(base, 'bin')
+  mkdirSync(bin, { recursive: true })
+  writeFileSync(join(bin, 'git'), `#!/usr/bin/env bash\nprintf '%s\\t%s\\n' "\${GIT_OPTIONAL_LOCKS-<ausente>}" "$*" >> "${join(base, 'git.log')}"\nexec "${GIT_REAL}" "$@"\n`)
+  chmodSync(join(bin, 'git'), 0o755)
+  return spawnSync(TSX, [join(TRIADOR, 'cli.ts'), raiz, ...args], {
+    encoding: 'utf8',
+    cwd: RAIZ,
+    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ORQ_DIAG_DIR: diag, ORQ_REPOS: join(base, 'repos.json') },
+  })
+}
+
+describe('saída do triador (peça 4)', () => {
+  it('num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0', () => {
+    const raiz = repoGit(base)
+    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
+    const status = () => execFileSync(GIT_REAL, ['-C', raiz, 'status', '--porcelain'], { encoding: 'utf8', env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } })
+    expect(status()).toBe('')
+    const antes = retrato(raiz)
+    const r = triarCli(raiz)
+    const depois = retrato(raiz)
+    expect(r.status, r.stderr).toBe(0)
+    expect(r.stdout).toMatch(/627j\tR1\tfirme D6/)
+    expect(depois).toEqual(antes)
+    expect(existsSync(join(raiz, '.git', 'index.lock'))).toBe(false)
+    expect(status()).toBe('')
+    const log = existsSync(join(base, 'git.log')) ? readFileSync(join(base, 'git.log'), 'utf8').split('\n').filter(Boolean) : []
+    expect(log.length, 'o git falso não foi chamado').toBeGreaterThan(0)
+    expect(log.filter((l) => !l.startsWith('0\t'))).toEqual([])
+    expect(log.every((l) => /^0\t-C \S+ (show|log|rev-parse|ls-tree|status --porcelain)\b/.test(l)), log.join('\n')).toBe(true)
+    // o diagnóstico ficou fora do repo, no formato da spec §5
+    const d = JSON.parse(readFileSync(join(diag, 'comarka-fx', '627j.json'), 'utf8')) as Record<string, unknown>
+    expect(d).toMatchObject({ $schema_versao: 1, repo: 'comarka-fx', id: '627j', leitor: 'legado-comarka', classe: 'R1', firme: true, fonte: 'extracao', regra: 'D6', modelo: null, encerrado_em: null })
+  })
+
+  it('mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico', () => {
+    const raiz = repoGit(base)
+    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
+    expect(triarCli(raiz).status).toBe(0)
+    const atual = join(diag, 'comarka-fx', '627j.json')
+    const m1 = statSync(atual).mtimeMs
+    const ass1 = (JSON.parse(readFileSync(atual, 'utf8')) as { assinatura: string }).assinatura
+    const r2 = triarCli(raiz)
+    expect(r2.stdout).toMatch(/627j\tmesma_assinatura/)
+    expect(statSync(atual).mtimeMs).toBe(m1)
+    // uma tentativa reescrita (requeue, nova tentativa) muda a assinatura
+    const serie = JSON.parse(readFileSync(join(FX, '07-627j-L57368', 'serie.json'), 'utf8')) as { dir: string }[]
+    const f = join(raiz, serie.at(-1)!.dir, 'diff.stat')
+    const st = statSync(f)
+    utimesSync(f, st.atime, new Date(st.mtimeMs + 1000))
+    expect(triarCli(raiz).stdout).toMatch(/627j\tR1/)
+    const ass2 = (JSON.parse(readFileSync(atual, 'utf8')) as { assinatura: string }).assinatura
+    expect(ass2).not.toBe(ass1)
+    expect(readdirSync(join(diag, 'comarka-fx', '627j', 'historico'))).toEqual([`${ass1.slice(0, 12)}.json`])
+  })
+
+  it('cópia da evidência fora do repo, com o segredo mascarado', () => {
+    const raiz = repoGit(base)
+    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
+    expect(triarCli(raiz).status).toBe(0)
+    const d = JSON.parse(readFileSync(join(diag, 'comarka-fx', '627j.json'), 'utf8')) as { copia_evidencia: string; evidencia: { arquivo: string }[] }
+    expect(d.copia_evidencia.startsWith(diag)).toBe(true)
+    const copias: string[] = []
+    const varre = (p: string) => {
+      for (const e of readdirSync(p, { withFileTypes: true })) (e.isDirectory() ? varre : (x: string) => copias.push(x))(join(p, e.name))
+    }
+    varre(d.copia_evidencia)
+    const co = copias.filter((p) => p.endsWith('claude-output.txt'))
+    expect(co.length).toBeGreaterThan(0)
+    for (const p of copias) expect(readFileSync(p, 'utf8'), p).not.toContain(SEGREDO)
+    expect(co.some((p) => readFileSync(p, 'utf8').includes('chave vazada: ‹segredo›'))).toBe(true)
+    // toda evidência do diagnóstico tem cópia
+    for (const e of d.evidencia) expect(existsSync(join(d.copia_evidencia, e.arquivo)), e.arquivo).toBe(true)
+  })
+
+  it('escrita com destino dentro de um repo do repos.json lança erro, e fora da raiz também', async () => {
+    const m = await carregar()
+    const repo = join(base, 'um-repo')
+    mkdirSync(repo)
+    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: repo }] }))
+    const tenta = (f: () => void) => {
+      if (!m) return 'sem módulo'
+      try {
+        f()
+        return 'escreveu'
+      } catch (e) {
+        return e instanceof m.EscritaRecusada ? 'recusou' : `outro erro: ${(e as Error).message}`
+      }
+    }
+    expect(tenta(() => new m!.Guarda().escrever(join(diag, 'ok.json'), '{}'))).toBe('escreveu')
+    expect(tenta(() => new m!.Guarda().escrever(join(repo, 'docs', 'x.json'), '{}'))).toBe('recusou')
+    expect(tenta(() => new m!.Guarda().escrever(join(base, 'fora.json'), '{}'))).toBe('recusou')
+    expect(tenta(() => new m!.Guarda().escrever(join(diag, '..', 'um-repo', 'y'), '{}'))).toBe('recusou')
+    process.env.ORQ_DIAG_DIR = join(repo, '.orq-diag')
+    expect(tenta(() => new m!.Guarda().escrever(join(repo, '.orq-diag', 'z.json'), '{}'))).toBe('recusou')
+    // o repo que está sendo triado é protegido mesmo fora do repos.json
+    process.env.ORQ_DIAG_DIR = diag
+    const outro = join(base, 'outro')
+    mkdirSync(outro)
+    expect(tenta(() => new m!.Guarda([outro]).escrever(join(outro, 'w'), '{}'))).toBe('recusou')
+    expect(existsSync(join(repo, 'docs')) || existsSync(join(base, 'fora.json')) || existsSync(join(outro, 'w'))).toBe(false)
+  })
+
+  it('trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda', async () => {
+    const m = await carregar()
+    const raiz = repoGit(base)
+    writeFileSync(join(base, 'repos.json'), JSON.stringify({ $schema_versao: 1, repos: [{ caminho: raiz, nome: 'comarka-fx' }] }))
+    const trava = join(diag, 'comarka-fx', '627j.lock')
+    mkdirSync(dirname(trava), { recursive: true })
+    writeFileSync(trava, '{"pid": 1}\n')
+    const repo = { nome: 'comarka-fx', caminho: raiz }
+    expect(m?.triarTicket({ repo, id: '627j' }).feito).toBe('travado')
+    expect(existsSync(join(diag, 'comarka-fx', '627j.json'))).toBe(false)
+    const velho = new Date(Date.now() - 11 * 60 * 1000)
+    utimesSync(trava, velho, velho)
+    const r = m?.triarTicket({ repo, id: '627j' })
+    expect(r?.feito).toBe('diagnosticado')
+    expect(existsSync(trava)).toBe(false)
+  })
+
+  it('gitLeitura recusa verbo de escrita e status sem --porcelain, antes de existir processo', async () => {
+    const m = await carregar()
+    const recusa = (args: string[]) => {
+      if (!m) return 'sem módulo'
+      try {
+        m.gitLeitura(base, args)
+        return 'rodou'
+      } catch (e) {
+        return e instanceof m.GitProibido ? 'recusou' : 'outro'
+      }
+    }
+    for (const a of [['checkout', 'main'], ['fetch'], ['worktree', 'add', 'x'], ['stash'], ['status'], ['commit', '-m', 'x'], ['add', '.']]) {
+      expect(recusa(a), a.join(' ')).toBe('recusou')
+    }
+    expect(recusa(['rev-parse', '--version'])).toBe('rodou')
+  })
+})
diff --git a/test/triador-repo-legado.ts b/test/triador-repo-legado.ts
new file mode 100644
index 0000000..0d67e30
--- /dev/null
+++ b/test/triador-repo-legado.ts
@@ -0,0 +1,60 @@
+/**
+ * triador-repo-legado.ts — auxiliar dos testes do triador (não é teste): um
+ * repo do legado-comarka montado num `mktemp -d` a partir de um caso de
+ * `test/fixtures/triador-7f/`.
+ */
+import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, utimesSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { dirname, join } from 'node:path'
+
+const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
+
+/**
+ * Um repo do legado a partir de um caso da fixture: os artefatos voltam ao
+ * caminho original, cada linha no número original. A linha que o recorte não
+ * guardou vira um quadro de pilha (que o recorte nunca escolhe), e o PASS de
+ * critério vira reticências; assim o leitor do repo recorta o mesmo.
+ */
+export function materializar(d: string, raizDada?: string): string {
+  const raiz = raizDada ?? mkdtempSync(join(tmpdir(), 'triador-legado-'))
+  const caso = json<{ id: string; arquivo_ticket: string; fim: string }>(join(d, 'caso.json'))
+  const serie = json<{ k: number; dir: string }[]>(join(d, 'serie.json'))
+  const escreve = (rel: string, txt: string) => {
+    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
+    writeFileSync(join(raiz, rel), txt)
+  }
+  escreve(caso.arquivo_ticket, `# ${caso.id}\n\n\`\`\`json\n${readFileSync(join(d, 'ticket.json'), 'utf8')}\`\`\`\n`)
+  escreve('docs/fila/000-config.json', readFileSync(join(d, 'config.json'), 'utf8'))
+  const log = readFileSync(join(d, 'log.txt'), 'utf8').split('\n').filter(Boolean)
+  const ultimo = Number(log.at(-1)!.split('\t')[0])
+  const linhas = Array.from({ length: ultimo }, () => '')
+  for (const l of log) linhas[Number(l.slice(0, l.indexOf('\t'))) - 1] = l.slice(l.indexOf('\t') + 1)
+  escreve('docs/fila/runs/local-loop.log', linhas.join('\n') + '\n')
+  const base = serie[0]!.dir.split('/').slice(0, 4).join('/')
+  escreve(`${base}/meta.json`, readFileSync(join(d, 'meta.json'), 'utf8'))
+  const fimS = Date.parse(caso.fim) / 1000 - 60
+  for (const s of serie) {
+    const de = join(d, `attempt-${s.k}`)
+    for (const f of readdirSync(de)) {
+      if (f.endsWith('.linhas.json') || f === 'presenca.json') continue
+      let txt = readFileSync(join(de, f), 'utf8')
+      const mapa = join(de, f.replace(/\.txt$/, '.linhas.json'))
+      if (f.endsWith('.txt') && existsSync(mapa)) {
+        const { total, faixas } = json<{ total: number; faixas: [number, number][] }>(mapa)
+        const enche = f === 'gate-vitest.txt' ? '    at fora (do-recorte.js:1:1)' : '…'
+        const out: string[] = Array.from({ length: total }, () => enche)
+        const ts = txt.split('\n')
+        let i = 0
+        for (const [a, b] of faixas) for (let n = a; n <= b; n++) out[n - 1] = ts[i++]!
+        txt = out.join('\n')
+      }
+      escreve(`${s.dir}/${f}`, txt)
+    }
+    // os arquivos que a fixture não copiou (gate-build, diff.raw…) existem pela presença
+    for (const f of json<string[]>(join(de, 'presenca.json'))) {
+      if (!existsSync(join(raiz, s.dir, f))) escreve(`${s.dir}/${f}`, '')
+    }
+    for (const f of readdirSync(join(raiz, s.dir))) utimesSync(join(raiz, s.dir, f), fimS, fimS)
+  }
+  return raiz
+}
```

### 9ed29f0
```diff
commit 9ed29f0fa7cbc9b84fcc46812a6652411dad5908
Author: Lucas Santos
Date: Sat Oct 10 18:53:51 2026 -0300

7f-b1-5: camada do modelo com stub e o subcomando orq triar

scripts/orquestrador/triador/:
- prompt.ts: o prompt da spec 7f-a §4, literal (sha256 conferido contra a
  spec no teste);
- modelo.ts: entrada nas 7 secoes de §4, cortada de baixo para cima em
  30 mil tokens (chars / 3,5) e mascarada; claude -p --output-format json
  --model claude-opus-5-5, sem ferramentas, uma volta, --max-budget-usd no
  teto do caso, timeout 120 s; parser (ultima linha JSON com classe R1-R7);
  evidencia que nao esta num arquivo lido e descartada; ledger custo.json;
  teto do dia (US$ 3,00, ORQ_TRIADOR_TETO_DIA sobrepoe) corta com
  modelo.pulado = teto_dia antes da chamada; envelope ilegivel mantem a
  extracao com modelo.erro; sob teste sem stub a chamada real e recusada;
- triar.ts: diagnosticar(), o passo comum; a resposta do modelo nunca e
  firme;
- corrida.ts: orq triar --fixture <dir>, a corrida da peca 6 sobre os 37,
  com placar (C) e resposta-modelo.json por caso fora da fixture;
- cli.ts: --sem-modelo e --fixture; a passada nunca chama modelo.

scripts/orq: `orq triar` despachado antes do lib.sh (le outro repo e grava
so em ~/.orq/diagnosticos); sem gatilho automatico.

test/fixtures/claude-envelope/triador-stub.sh: o claude dos testes.
orquestrador-triador-modelo.test.ts: tudo com o stub; o claude do PATH e
uma trava que reprova se tocada.

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/scripts/orq b/scripts/orq
index bbc3fd3..cbf93c5 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -14,6 +14,8 @@
 # repetidos entre as duas listas. Ele acrescenta uma entrada e recusa o resto;
 # não converte o arquivo — migrar é operação com diff e `.bak`.
 #
+# `triar` (7f) não escreve no repo: grava o diagnóstico em ~/.orq/diagnosticos.
+#
 # Nenhum subcomando toca ticket, staging, worktree, branch ou lock, e nenhum
 # mata processo — parar o loop é desagendar + esperar o disparo corrente
 # (Ciclo de vida, na SKILL). Se `orq` puder alterar estado, alguém vai
@@ -36,6 +38,9 @@
 #   orq pausar [motivo]  cria o pausar_file (a drenagem para ENTRE tickets)
 #   orq retomar          remove o pausar_file
 #   orq liberar <humano:token> [nota]   registra a liberação humana (v2)
+#   orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]
+#                        triador de bloqueios (7f): diagnóstico em ~/.orq/diagnosticos,
+#                        nunca no repo; --fixture <dir> roda sobre a fixture da 7f
 
 set -euo pipefail
 ORQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
@@ -73,6 +78,23 @@ if [ "${1:-}" = config ]; then
   exit $?
 fi
 
+# --- `orq triar` (etapa 7f) roda ANTES do lib.sh, e de qualquer lugar -------
+# O triador lê OUTRO repo (o <repo> do argumento, ou um nome do
+# ~/.orq/repos.json) e grava só em ~/.orq/diagnosticos (ORQ_DIAG_DIR): ele não
+# depende do config do checkout onde este `orq` está, e não pode morrer com
+# ele. O `tsx` sai pela mesma regra do bloco `config` acima (e do lib.sh, peça
+# T1): binário local do checkout, ou `npx --no-install`. Sem `cd`: o <repo>
+# relativo é o do diretório de quem chamou.
+if [ "${1:-}" = triar ]; then
+  shift
+  _root="${ORQ_EXEC_ROOT:-$(cd "$ORQ_DIR/.." && pwd)}"
+  _gc="$(git -C "$_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
+  if [ -n "$_gc" ] && [ -d "$_gc" ]; then _main="$(cd "$_gc/.." && pwd)"; else _main="$_root"; fi
+  if [ -x "$_main/node_modules/.bin/tsx" ]; then _tsx=( "$_main/node_modules/.bin/tsx" ); else _tsx=( npx --no-install tsx ); fi
+  "${_tsx[@]}" "$ORQ_DIR/orquestrador/triador/cli.ts" "$@"
+  exit $?
+fi
+
 # shellcheck source=orquestrador/lib.sh
 source "$ORQ_DIR/orquestrador/lib.sh"
 
@@ -414,6 +436,7 @@ case "${1:-}" in
   versao)     shift; cmd_versao "$@" ;;
   prevoo)     shift; cmd_prevoo "$@" ;;
   config)     : ;;   # despachado no topo, antes do lib.sh — veja o comentário lá
+  triar)      : ;;   # idem (etapa 7f)
   pausar)     shift; cmd_pausar "$@" ;;
   retomar)    cmd_retomar ;;
   liberar)    shift; cmd_liberar "$@" ;;
diff --git a/scripts/orquestrador/triador/cli.ts b/scripts/orquestrador/triador/cli.ts
index bd1ea5a..e10d8c5 100644
--- a/scripts/orquestrador/triador/cli.ts
+++ b/scripts/orquestrador/triador/cli.ts
@@ -1,39 +1,71 @@
 /**
- * cli.ts — `orq triar <repo> [<id>] [--passada] [--forcar]`.
+ * cli.ts — `orq triar`, o comando que roda o triador (decisão do chat do
+ * programa: o painel nunca dispara gasto; manual primeiro, job do launchd
+ * depois).
  *
- * Roda a partir do KIT, lê o repo (caminho ou nome do `~/.orq/repos.json`),
- * grava o diagnóstico em `ORQ_DIAG_DIR` (padrão `~/.orq/diagnosticos`) e
- * imprime o resumo: uma linha por ticket. Não escreve no repo.
+ *   orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]
+ *   orq triar --fixture <dir> [--forcar] [--sem-modelo]
+ *
+ * <repo> é um caminho ou um nome do `~/.orq/repos.json`. Extração sempre;
+ * modelo só para palpite e sem regra, dentro dos tetos (modelo.ts), e nunca
+ * na `--passada`. Grava em `ORQ_DIAG_DIR` (padrão `~/.orq/diagnosticos`),
+ * nunca no repo, e imprime o resumo: uma linha por ticket.
  */
-import { triarRepo, resolverRepo, type Resultado } from './triar.js'
+import { corridaFixture, placar } from './corrida.js'
+import { criarPassoModelo, lerConfigModelo } from './modelo.js'
+import { resolverRepo, triarRepo, type Resultado } from './triar.js'
 
 export function resumo(rs: Resultado[]): string {
   const linhas = rs.map((r) => {
     const d = r.diagnostico
     if (!d) return `${r.id}\t${r.feito}`
     const classe = d.classe ?? 'sem classe'
-    const como = d.fonte === 'modelo' ? `modelo (${d.confianca})` : d.firme ? `firme ${d.regra}` : `palpite ${d.regra ?? '-'}`
+    const pulado = (d.modelo as { pulado?: string; erro?: string } | null)?.pulado
+    const erro = (d.modelo as { erro?: string } | null)?.erro
+    const como =
+      d.fonte === 'modelo' ? `modelo (${d.confianca})` : d.firme ? `firme ${d.regra}` : `palpite ${d.regra ?? '-'}${pulado ? `, modelo pulado: ${pulado}` : erro ? `, modelo.erro: ${erro}` : ''}`
     return `${r.id}\t${classe}\t${como}\t${d.remedio}${d.requeue !== 'nao' ? `\t[requeue ${d.requeue}]` : ''}`
   })
   const firmes = rs.filter((r) => r.diagnostico?.firme).length
-  const palpites = rs.filter((r) => r.diagnostico && !r.diagnostico.firme).length
-  linhas.push(`-- ${rs.length} ticket(s): ${firmes} firme(s), ${palpites} palpite(s)/modelo, ${rs.length - firmes - palpites} sem nova triagem`)
+  const outros = rs.filter((r) => r.diagnostico && !r.diagnostico.firme).length
+  linhas.push(`-- ${rs.length} ticket(s): ${firmes} firme(s), ${outros} palpite(s) ou modelo, ${rs.length - firmes - outros} sem nova triagem`)
   return linhas.join('\n')
 }
 
 export interface Args {
-  repo: string
+  repo?: string
   id?: string
+  fixture?: string
   passada: boolean
   forcar: boolean
+  semModelo: boolean
 }
 
+const USO = 'uso: orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo] | orq triar --fixture <dir> [--forcar] [--sem-modelo]'
+
 export function parseArgs(argv: string[]): Args {
-  const pos = argv.filter((a) => !a.startsWith('--'))
-  const flags = argv.filter((a) => a.startsWith('--'))
-  for (const f of flags) if (!['--passada', '--forcar'].includes(f)) throw new Error(`flag desconhecida: ${f}`)
-  if (!pos[0] || pos.length > 2) throw new Error('uso: orq triar <repo> [<id>] [--passada] [--forcar]')
-  return { repo: pos[0], ...(pos[1] ? { id: pos[1] } : {}), passada: flags.includes('--passada'), forcar: flags.includes('--forcar') }
+  const a: Args = { passada: false, forcar: false, semModelo: false }
+  const pos: string[] = []
+  for (let i = 0; i < argv.length; i++) {
+    const x = argv[i]!
+    if (x === '--passada') a.passada = true
+    else if (x === '--forcar') a.forcar = true
+    else if (x === '--sem-modelo') a.semModelo = true
+    else if (x === '--fixture') {
+      const d = argv[++i]
+      if (!d) throw new Error(USO)
+      a.fixture = d
+    } else if (x.startsWith('--')) throw new Error(`flag desconhecida: ${x}`)
+    else pos.push(x)
+  }
+  if (a.fixture) {
+    if (pos.length || a.passada) throw new Error(USO)
+    return a
+  }
+  if (!pos[0] || pos.length > 2) throw new Error(USO)
+  a.repo = pos[0]
+  if (pos[1]) a.id = pos[1]
+  return a
 }
 
 export function main(argv: string[]): number {
@@ -44,9 +76,16 @@ export function main(argv: string[]): number {
     process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
     return 1
   }
-  const repo = resolverRepo(a.repo)
-  const rs = triarRepo(repo, { ...(a.id ? { id: a.id } : {}), passada: a.passada, forcar: a.forcar })
-  process.stdout.write(`${repo.nome} (${repo.caminho})\n${resumo(rs)}\n`)
+  const cfg = lerConfigModelo()
+  const modelo = a.semModelo || a.passada ? null : criarPassoModelo(cfg)
+  if (a.fixture) {
+    process.stdout.write(`${placar(corridaFixture(a.fixture, { modelo, forcar: a.forcar }))}\n`)
+    return 0
+  }
+  const repo = resolverRepo(a.repo!)
+  const rs = triarRepo(repo, { ...(a.id ? { id: a.id } : {}), passada: a.passada, forcar: a.forcar, modelo })
+  const teto = modelo ? `modelo ${cfg.modelo ?? 'desligado'}, teto US$ ${cfg.teto_dia_usd.toFixed(2)}/dia` : 'sem modelo'
+  process.stdout.write(`${repo.nome} (${repo.caminho}) · ${teto}\n${resumo(rs)}\n`)
   return 0
 }
 
diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
new file mode 100644
index 0000000..96204b1
--- /dev/null
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -0,0 +1,97 @@
+/**
+ * corrida.ts — `orq triar --fixture <dir>`: o triador sobre os 37 casos da
+ * fixture `test/fixtures/triador-7f`, no estado da passada (spec 7f-a §7.2 C).
+ *
+ * É a corrida da PEÇA 6: o humano roda depois do merge, com o modelo de
+ * verdade e o teto do dia em US$ 6,30 (21 palpites × US$ 0,30). Os firmes não
+ * chamam modelo. Cada caso grava, em `ORQ_DIAG_DIR/fixture-triador-7f/`, o
+ * diagnóstico e `<caso>/resposta-modelo.json` (o registro do modelo, para o
+ * replay da peça 6). Nada é escrito na fixture: ela entra na `Guarda` como
+ * protegida.
+ *
+ * Rodar de novo não paga de novo: caso com diagnóstico da mesma assinatura é
+ * reaproveitado (só `--forcar` repete).
+ */
+import { readdirSync, readFileSync } from 'node:fs'
+import { join, resolve } from 'node:path'
+import { extrair } from './extrair.js'
+import { lerCasoDeFixture } from './leitor-legado-comarka.js'
+import { Guarda, assinatura, gravarDiagnostico, lerDiagnostico } from './saida.js'
+import { diagnosticar, type Diagnostico, type PassoModelo } from './triar.js'
+import type { Ref } from './tipos.js'
+
+export const NOME_CORRIDA = 'fixture-triador-7f'
+
+interface Esperado {
+  classe: string | null
+  evidencia?: { arquivo: string; linha: number | null }[]
+}
+
+export interface LinhaPlacar {
+  caso: string
+  esperado: string | null
+  extracao: string | null
+  regra: string | null
+  final: string | null
+  fonte: string
+  certo: boolean
+  evidencia_certa: boolean
+  custo_usd: number | null
+  chamou: boolean
+}
+
+const casa = (dada: Ref[], esp: Esperado['evidencia']) =>
+  dada.some((d) => (esp ?? []).some((e) => e.arquivo === d.arquivo && (e.linha === null || (d.linha !== null && Math.abs(d.linha - e.linha) <= 3))))
+
+export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; forcar?: boolean; agora?: number }): LinhaPlacar[] {
+  const fixture = resolve(dir)
+  const g = new Guarda([fixture])
+  const agora = o.agora ?? Date.now()
+  const out: LinhaPlacar[] = []
+  for (const caso of readdirSync(fixture).filter((d) => /^\d\d-[0-9a-z]+-L\d+$/.test(d)).sort()) {
+    const d = join(fixture, caso)
+    const esp = JSON.parse(readFileSync(join(d, 'esperado.json'), 'utf8')) as Esperado
+    const ev = lerCasoDeFixture(d, { instante: 'passada' })
+    const assin = assinatura(ev)
+    const ext = extrair(ev)
+    const existente = lerDiagnostico<Diagnostico>(g, NOME_CORRIDA, caso)
+    let diag: Diagnostico
+    let chamou = false
+    if (existente && existente.assinatura === assin && !o.forcar) diag = existente
+    else {
+      diag = diagnosticar(g, NOME_CORRIDA, { ...ev, id: caso }, ext, assin, agora, fixture, o.modelo)
+      chamou = diag.modelo !== null && !(diag.modelo as { pulado?: string }).pulado
+      gravarDiagnostico(g, NOME_CORRIDA, caso, diag)
+      if (!ext.firme) {
+        g.escrever(
+          join(g.raiz, NOME_CORRIDA, caso, 'resposta-modelo.json'),
+          JSON.stringify({ caso, assinatura: assin, extracao: { classe: ext.classe, regra: ext.regra }, modelo: diag.modelo }, null, 1) + '\n',
+        )
+      }
+    }
+    const m = (diag.modelo ?? {}) as { custo_usd?: number | null }
+    out.push({
+      caso,
+      esperado: esp.classe,
+      extracao: ext.classe,
+      regra: ext.regra,
+      final: diag.classe,
+      fonte: diag.fonte,
+      certo: diag.classe === esp.classe,
+      evidencia_certa: casa(diag.evidencia, esp.evidencia),
+      custo_usd: m.custo_usd ?? null,
+      chamou,
+    })
+  }
+  return out
+}
+
+export function placar(ls: LinhaPlacar[]): string {
+  const linhas = ls.map((l) =>
+    [l.caso, `esperado ${l.esperado}`, `extração ${l.extracao ?? '-'} (${l.regra ?? '-'})`, `final ${l.final ?? '-'} [${l.fonte}]`, l.certo ? (l.evidencia_certa ? 'CERTO' : 'classe certa, evidência fora') : 'errado', l.custo_usd != null ? `US$ ${l.custo_usd.toFixed(4)}` : ''].join('\t'),
+  )
+  const certos = ls.filter((l) => l.certo && l.evidencia_certa).length
+  const custo = ls.reduce((s, l) => s + (l.custo_usd ?? 0), 0)
+  linhas.push(`-- (C) classe e evidência certas: ${certos}/${ls.length} (aceite: >= 30); chamadas novas: ${ls.filter((l) => l.chamou).length}; custo desta corrida: US$ ${custo.toFixed(4)}`)
+  return linhas.join('\n')
+}
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
new file mode 100644
index 0000000..b8f8144
--- /dev/null
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -0,0 +1,387 @@
+/**
+ * modelo.ts — a classificação com modelo, só para o que a extração não fechou
+ * (spec 7f-a §4). Decisões do chat do programa sobre a spec:
+ *   - modelo `claude-opus-5-5`, teto de US$ 3,00 por dia (todos os repos) e
+ *     de US$ 0,30 por caso, entrada cortada em 30 mil tokens (chars / 3,5);
+ *   - o painel nunca dispara gasto: quem chama é `orq triar` (manual, depois
+ *     job do launchd);
+ *   - a sessão de etapa nunca chama API: nos testes o `claude` é um stub
+ *     (`ORQ_TRIADOR_CLAUDE`), e o `claude` do PATH é uma trava que reprova.
+ *
+ * Uma chamada por assinatura (a assinatura igual nem chega aqui), mesmo que
+ * falhe: `modelo.erro` fica registrado e só `--forcar` repete.
+ *
+ * Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json`, chaves opcionais
+ * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `entrada_max_tokens`,
+ * `timeout_secs`). `modelo: null` desliga o modelo. `ORQ_TRIADOR_TETO_DIA`
+ * sobrepõe o teto do dia (a corrida da peça 6 usa US$ 6,30).
+ */
+import { spawnSync } from 'node:child_process'
+import { readFileSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { join } from 'node:path'
+import type { Extracao } from './extrair.js'
+import { mascarar } from './mascara.js'
+import { preencher, PROMPT } from './prompt.js'
+import { numerosDe, trecho } from './recorte.js'
+import type { Guarda } from './saida.js'
+import type { Evidencia, Ref, Tentativa } from './tipos.js'
+import type { PassoModelo } from './triar.js'
+
+export interface ConfigModelo {
+  modelo: string | null
+  teto_dia_usd: number
+  teto_caso_usd: number
+  entrada_max_tokens: number
+  timeout_secs: number
+}
+
+export const PADRAO: ConfigModelo = {
+  modelo: 'claude-opus-5-5',
+  teto_dia_usd: 3,
+  teto_caso_usd: 0.3,
+  entrada_max_tokens: 30000,
+  timeout_secs: 120,
+}
+export const CHARS_POR_TOKEN = 3.5
+
+export function lerConfigModelo(): ConfigModelo {
+  let c: Partial<ConfigModelo> = {}
+  try {
+    c = JSON.parse(readFileSync(process.env.ORQ_TRIADOR_CONFIG || join(homedir(), '.orq', 'triador.json'), 'utf8')) as Partial<ConfigModelo>
+  } catch {
+    c = {}
+  }
+  const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
+  const tetoEnv = Number(process.env.ORQ_TRIADOR_TETO_DIA)
+  return {
+    modelo: c.modelo === null ? null : typeof c.modelo === 'string' && c.modelo ? c.modelo : PADRAO.modelo,
+    teto_dia_usd: process.env.ORQ_TRIADOR_TETO_DIA && Number.isFinite(tetoEnv) ? tetoEnv : num(c.teto_dia_usd, PADRAO.teto_dia_usd),
+    teto_caso_usd: num(c.teto_caso_usd, PADRAO.teto_caso_usd),
+    entrada_max_tokens: num(c.entrada_max_tokens, PADRAO.entrada_max_tokens),
+    timeout_secs: num(c.timeout_secs, PADRAO.timeout_secs),
+  }
+}
+
+// ─── a entrada, na ordem de §4, cortada de baixo para cima ──────────────────
+
+const numeradas = (linhas: { n: number; t: string }[]) => linhas.map((l) => `${l.n}: ${l.t}`).join('\n')
+const cauda = (s: string, n: number) => (s.length > n ? `…${s.slice(s.length - n + 1)}` : s)
+
+function criteriosDoTicket(ev: Evidencia): unknown[] {
+  const ca = ev.ticket?.criterios_aceite ?? []
+  const nomes = new Set(ev.tentativas.flatMap((t) => t.criterios_falhos.map((c) => c.criterio)))
+  const out: unknown[] = []
+  ca.forEach((c, i) => {
+    const desc = c && typeof c === 'object' ? (c as { descricao?: unknown }).descricao : undefined
+    if (nomes.has(`criterio[${i}]`) || (typeof desc === 'string' && nomes.has(desc))) out.push(c)
+  })
+  return out
+}
+
+function recortesVitest(ts: Tentativa[]): string {
+  const ult = ts.at(-1)
+  if (!ult?.recorte_vitest) return '(sem gate de testes na última tentativa)'
+  const partes = [`--- ${ult.recorte_vitest.rel} ---\n${numeradas(ult.recorte_vitest.linhas)}`]
+  const chave = (t: Tentativa) => [...t.arquivos_vermelhos].sort().join(',')
+  for (const t of ts.slice(0, -1).reverse()) {
+    if (t.recorte_vitest && t.arquivos_vermelhos.length && chave(t) !== chave(ult)) {
+      partes.push(`--- ${t.recorte_vitest.rel} ---\n${numeradas(t.recorte_vitest.linhas)}`)
+    }
+  }
+  return partes.join('\n\n')
+}
+
+function criteriosFalhos(ts: Tentativa[]): string {
+  const partes: string[] = []
+  for (const t of ts) {
+    if (!t.recorte_criterios || !t.criterios_falhos.length) continue
+    const linhas = t.recorte_criterios.linhas.filter((l) => !/^### \S+ -> PASS/.test(l.t))
+    partes.push(`--- ${t.recorte_criterios.rel} ---\n${numeradas(linhas)}`)
+  }
+  return partes.join('\n\n') || '(nenhum critério reprovado)'
+}
+
+function diffStats(ts: Tentativa[]): string {
+  return (
+    ts
+      .filter((t) => t.diff_stat || t.diff_ref)
+      .map((t) => (t.diff_stat ? `--- ${t.diff_stat.rel} ---\n${numeradas(t.diff_stat.linhas)}` : `--- ${t.diff_ref!.arquivo} ---\n${t.diff_ref!.linha}: ${t.diff_ref!.trecho}`))
+      .join('\n\n') || '(sem diff)'
+  )
+}
+
+function juiz(ts: Tentativa[]): string {
+  return (
+    ts
+      .filter((t) => t.juiz)
+      .map((t) => `--- tentativa ${t.n}: ${t.juiz!.ref.arquivo}:${t.juiz!.ref.linha} ---\naprovado: ${t.juiz!.aprovado}\nmotivo: ${t.juiz!.motivo}\ncriterios_falhos: ${JSON.stringify(t.juiz!.criterios_falhos)}`)
+      .join('\n\n') || '(o juiz não rodou)'
+  )
+}
+
+function agente(ts: Tentativa[]): string {
+  const ult = ts.at(-1)
+  const ant = ts.at(-2)
+  const partes: string[] = []
+  if (ult?.agente_disse) partes.push(`--- última tentativa (${ult.dir}) ---\n${cauda(ult.agente_disse, 3000)}`)
+  if (ant?.agente_disse) partes.push(`--- tentativa anterior (${ant.dir}) ---\n${cauda(ant.agente_disse, 1500)}`)
+  return partes.join('\n\n') || '(sem saída do agente)'
+}
+
+export interface Entrada {
+  prompt: string
+  chars: number
+  tokens_est: number
+  /** seções cortadas, da 7 para a 1: [{secao, de, para}] em caracteres */
+  cortes: { secao: number; de: number; para: number }[]
+}
+
+/** As 7 seções de §4 na ordem, cortadas de baixo para cima até caber; o texto vai mascarado. */
+export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTokens = PADRAO.entrada_max_tokens): Entrada {
+  const tk = ev.ticket
+  const s1 = JSON.stringify(
+    {
+      id: ev.id,
+      slug: tk?.slug ?? '',
+      objetivo: (tk?.objetivo ?? '').slice(0, 1500),
+      pathspec_allowlist: tk?.pathspec_allowlist ?? [],
+      criterios_aceite_que_falharam: criteriosDoTicket(ev),
+      notas_status: tk?.notas_status ?? '',
+    },
+    null,
+    1,
+  )
+  const s2 = JSON.stringify({ palpite: ext.classe, regra: ext.regra, firme: ext.firme, evidencia: ext.evidencia, ...ext.detalhe }, null, 1)
+  const secoes = [s1, s2, recortesVitest(ev.tentativas), criteriosFalhos(ev.tentativas), diffStats(ev.tentativas), juiz(ev.tentativas), agente(ev.tentativas)].map(mascarar)
+  const fixo = {
+    id: ev.id,
+    slug: tk?.slug ?? '',
+    repo,
+    quando: ev.bloqueio.quando ?? 'sem data',
+    token_do_bloqueio: ev.bloqueio.token ?? (ev.bloqueio.origem === 'humano' ? 'humano' : 'desconhecido'),
+    n: String(ev.tentativas.length),
+  }
+  const max = Math.floor(maxTokens * CHARS_POR_TOKEN)
+  const montar = () =>
+    preencher({ ...fixo, ticket: secoes[0]!, extracao_json: secoes[1]!, recortes_vitest: secoes[2]!, criterios_falhos: secoes[3]!, diff_stats: secoes[4]!, juiz: secoes[5]!, agente: secoes[6]! })
+  const cortes: Entrada['cortes'] = []
+  let prompt = montar()
+  for (let i = secoes.length - 1; i >= 0 && prompt.length > max; i--) {
+    const excesso = prompt.length - max
+    const de = secoes[i]!.length
+    const marca = '\n[… cortado para caber na entrada]'
+    secoes[i] = de - excesso - marca.length > 0 ? secoes[i]!.slice(0, de - excesso - marca.length) + marca : ''
+    cortes.push({ secao: i + 1, de, para: secoes[i]!.length })
+    prompt = montar()
+  }
+  return { prompt, chars: prompt.length, tokens_est: Math.ceil(prompt.length / CHARS_POR_TOKEN), cortes }
+}
+
+// ─── a chamada ───────────────────────────────────────────────────────────────
+
+export interface Envelope {
+  result: string
+  is_error: boolean
+  custo_usd: number | null
+  tokens_in: number | null
+  tokens_out: number | null
+}
+
+/**
+ * `claude -p --output-format json --model <m>` sem ferramentas e com uma volta
+ * (o molde do juiz, `executor.sh:753-755`), prompt pela entrada padrão,
+ * `--max-budget-usd` no teto do caso, e timeout. O binário é
+ * `ORQ_TRIADOR_CLAUDE` ou `claude`.
+ */
+export class ChamadaRealRecusada extends Error {}
+
+export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout: string; ms: number } {
+  // Sob teste (vitest ou ORQ_TESTE=1) só o stub roda: sem ORQ_TRIADOR_CLAUDE,
+  // o `claude` do PATH seria o de verdade, e a etapa nunca chama API.
+  if (!process.env.ORQ_TRIADOR_CLAUDE && (process.env.VITEST || process.env.ORQ_TESTE === '1')) {
+    throw new ChamadaRealRecusada('triador: claude real recusado sob teste (defina ORQ_TRIADOR_CLAUDE com o stub)')
+  }
+  const bin = process.env.ORQ_TRIADOR_CLAUDE || 'claude'
+  const t0 = Date.now()
+  const r = spawnSync(
+    bin,
+    ['-p', '--output-format', 'json', '--model', cfg.modelo ?? '', '--allowedTools', '', '--max-turns', '1', '--max-budget-usd', String(cfg.teto_caso_usd)],
+    { input: prompt, encoding: 'utf8', timeout: cfg.timeout_secs * 1000, maxBuffer: 16 * 1024 * 1024, killSignal: 'SIGKILL' },
+  )
+  return { rc: r.status ?? (r.error ? 127 : 124), stdout: r.stdout ?? '', ms: Date.now() - t0 }
+}
+
+export function lerEnvelope(stdout: string): Envelope | null {
+  try {
+    const j = JSON.parse(stdout.trim()) as Record<string, unknown>
+    if (typeof j.result !== 'string') return null
+    const u = (j.usage ?? {}) as Record<string, unknown>
+    const num = (v: unknown) => (typeof v === 'number' ? v : null)
+    return { result: j.result, is_error: j.is_error === true, custo_usd: num(j.total_cost_usd), tokens_in: num(u.input_tokens), tokens_out: num(u.output_tokens) }
+  } catch {
+    return null
+  }
+}
+
+// ─── a resposta ──────────────────────────────────────────────────────────────
+
+export interface Resposta {
+  classe: string
+  confianca: 'alta' | 'media' | 'baixa'
+  evidencia: Ref[]
+  remedio: string
+  requeue: string
+  justificativa: string
+}
+
+const CLASSES = ['R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7']
+const REQUEUE = /^(sim|nao|sim_apos:(arvore_alvo_limpa|base_verde(:\S+)?|conserto_motor|maquina_ok))$/
+
+function respostaDe(v: unknown): Resposta | null {
+  if (!v || typeof v !== 'object') return null
+  const j = v as Record<string, unknown>
+  if (typeof j.classe !== 'string' || !CLASSES.includes(j.classe)) return null
+  const confianca = j.confianca === 'alta' || j.confianca === 'media' || j.confianca === 'baixa' ? j.confianca : 'baixa'
+  const evidencia = (Array.isArray(j.evidencia) ? j.evidencia : [])
+    .filter((e): e is Record<string, unknown> => !!e && typeof e === 'object')
+    .map((e) => ({ arquivo: String(e.arquivo ?? ''), linha: typeof e.linha === 'number' ? e.linha : null, trecho: trecho(String(e.trecho ?? '')) }))
+  return {
+    classe: j.classe,
+    confianca,
+    evidencia,
+    remedio: String(j.remedio ?? '').split('\n')[0]!.trim(),
+    requeue: typeof j.requeue === 'string' && REQUEUE.test(j.requeue) ? j.requeue : 'nao',
+    justificativa: String(j.justificativa ?? ''),
+  }
+}
+
+/** A última linha que o JSON.parse aceita com `classe` em R1-R7, de trás para frente (o molde do avaliador do legado). */
+export function lerResposta(texto: string): Resposta | null {
+  const inteira = (() => {
+    try {
+      return respostaDe(JSON.parse(texto.trim()))
+    } catch {
+      return null
+    }
+  })()
+  if (inteira) return inteira
+  const linhas = texto.split('\n')
+  for (let i = linhas.length - 1; i >= 0; i--) {
+    try {
+      const r = respostaDe(JSON.parse(linhas[i]!.trim()))
+      if (r) return r
+    } catch {
+      /* segue para cima */
+    }
+  }
+  return null
+}
+
+/**
+ * Cada `evidencia.arquivo` tem de ser um arquivo lido (o que está na cópia da
+ * evidência) e a `linha` tem de estar nele: no recorte, uma linha que o
+ * recorte guardou; no arquivo inteiro, de 1 ao fim. A que não confere sai.
+ */
+export function conferirEvidencia(ev: Evidencia, refs: Ref[]): { validas: Ref[]; descartadas: Ref[] } {
+  const validas: Ref[] = []
+  const descartadas: Ref[] = []
+  for (const r of refs) {
+    const l = ev.lidos.find((x) => x.arquivo === r.arquivo)
+    let ok = false
+    if (l && r.linha !== null && Number.isInteger(r.linha) && r.linha >= 1) {
+      ok = l.faixas ? numerosDe(l.faixas).includes(r.linha) : r.linha <= l.conteudo.split('\n').length
+    }
+    ;(ok ? validas : descartadas).push(r)
+  }
+  return { validas, descartadas }
+}
+
+// ─── o ledger e os tetos ─────────────────────────────────────────────────────
+
+export interface Gasto {
+  repo: string
+  id: string
+  assinatura: string
+  custo_usd: number | null
+  tokens_in: number | null
+  tokens_out: number | null
+  custo_acima_do_teto?: true
+}
+
+const dia = (agora: number) => new Date(agora).toISOString().slice(0, 10)
+const microdolares = (usd: number) => Math.round(usd * 1e6)
+
+export function lerLedger(g: Guarda): { dias: Record<string, Gasto[]> } {
+  try {
+    const d = JSON.parse(readFileSync(join(g.raiz, 'custo.json'), 'utf8')) as { dias?: Record<string, Gasto[]> }
+    return { dias: d.dias ?? {} }
+  } catch {
+    return { dias: {} }
+  }
+}
+
+/** Gasto do dia; entrada sem custo conhecido conta como o teto do caso (o pior caso). */
+export function gastoDoDia(g: Guarda, agora: number, tetoCaso: number): number {
+  return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? tetoCaso), 0)
+}
+
+function registrar(g: Guarda, agora: number, x: Gasto): void {
+  const l = lerLedger(g)
+  ;(l.dias[dia(agora)] ??= []).push(x)
+  g.escrever(join(g.raiz, 'custo.json'), JSON.stringify(l, null, 1) + '\n')
+}
+
+export interface RegistroModelo {
+  modelo: string | null
+  pulado?: 'teto_dia' | 'desligado'
+  erro?: string
+  custo_usd?: number | null
+  tokens_in?: number | null
+  tokens_out?: number | null
+  custo_acima_do_teto?: true
+  duracao_ms?: number
+  entrada_tokens_est?: number
+  cortes?: Entrada['cortes']
+  evidencia_descartada?: number
+  resposta?: Resposta
+  envelope_bruto?: string
+}
+
+/** O passo do modelo que `triarTicket` chama para palpite e sem regra. */
+export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoModelo {
+  return ({ ev, ext, repo, assinatura, guarda, agora }) => {
+    if (!cfg.modelo) return { registro: { modelo: null, pulado: 'desligado' } satisfies RegistroModelo }
+    // Teto do dia: a chamada só sai se, mesmo no pior caso (o teto do caso), o dia não passa do teto.
+    if (microdolares(gastoDoDia(guarda, agora, cfg.teto_caso_usd) + cfg.teto_caso_usd) > microdolares(cfg.teto_dia_usd)) {
+      return { registro: { modelo: cfg.modelo, pulado: 'teto_dia' } satisfies RegistroModelo }
+    }
+    const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens)
+    const r = chamar(entrada.prompt, cfg)
+    const env = lerEnvelope(r.stdout)
+    const gasto: Gasto = { repo, id: ev.id, assinatura, custo_usd: env?.custo_usd ?? null, tokens_in: env?.tokens_in ?? null, tokens_out: env?.tokens_out ?? null }
+    if (env?.custo_usd != null && env.custo_usd > cfg.teto_caso_usd) gasto.custo_acima_do_teto = true
+    registrar(guarda, agora, gasto)
+    const reg: RegistroModelo = {
+      modelo: cfg.modelo,
+      custo_usd: gasto.custo_usd,
+      tokens_in: gasto.tokens_in,
+      tokens_out: gasto.tokens_out,
+      ...(gasto.custo_acima_do_teto ? { custo_acima_do_teto: true as const } : {}),
+      duracao_ms: r.ms,
+      entrada_tokens_est: entrada.tokens_est,
+      cortes: entrada.cortes,
+      envelope_bruto: r.stdout.slice(0, 20000),
+    }
+    if (!env) return { registro: { ...reg, erro: `envelope ilegível (rc ${r.rc})` } }
+    if (env.is_error) return { registro: { ...reg, erro: `envelope com is_error: ${env.result.slice(0, 200)}` } }
+    const resp = lerResposta(env.result)
+    if (!resp) return { registro: { ...reg, erro: 'resposta sem JSON com classe R1-R7' } }
+    const { validas, descartadas } = conferirEvidencia(ev, resp.evidencia)
+    const comResposta = { ...reg, evidencia_descartada: descartadas.length, resposta: resp }
+    if (!validas.length) return { registro: { ...comResposta, erro: 'nenhuma evidência confere com a cópia' } }
+    return { registro: comResposta, resposta: { ...resp, evidencia: validas } }
+  }
+}
+
+export { PROMPT }
diff --git a/scripts/orquestrador/triador/prompt.ts b/scripts/orquestrador/triador/prompt.ts
new file mode 100644
index 0000000..6458533
--- /dev/null
+++ b/scripts/orquestrador/triador/prompt.ts
@@ -0,0 +1,77 @@
+/**
+ * prompt.ts — o prompt do triador, LITERAL da spec 7f-a §4 (linhas 214-277 de
+ * `~/orq-sessoes/spec-7f-triador.md`). `{…}` é preenchido por `preencher`.
+ * Mudar este texto é mudar a spec.
+ */
+export const PROMPT = `Você é o triador de bloqueios de um orquestrador de tickets. Um ticket foi
+executado por um agente, reprovou nos gates ou no juiz, e o motor o bloqueou.
+Sua tarefa é dizer POR QUE ele está bloqueado, com prova, e o remédio. Você não
+decide nada: um humano lê o que você escrever e decide.
+
+Os destinos possíveis (escolha exatamente um):
+
+R1  Teste acoplado fora da allowlist. Um teste que o ticket não pode editar
+    ficou vermelho por causa do que o ticket mudou. Remédio típico: pôr o teste
+    na allowlist com guarda anti-afrouxamento (mesma contagem de it/expect, sem
+    skip), ou mover a mudança para outro ticket.
+R2  Critério com defeito de forma ou premissa. O cmd/espera do critério está
+    errado (shell, pipefail, regex, contador, nome fixo, premissa velha da base)
+    e reprovaria qualquer implementação. Remédio: consertar o critério no .md.
+R3  Spec que precisa de decisão humana, token, motor ou refatiamento. Parte do
+    remédio não cabe no .md do ticket.
+R4  Dependência: o aceite achou falta REAL no código fora do escopo do ticket.
+    Remédio: ticket novo de código; o aceite está certo.
+R5  Ambiente: base vermelha em arquivo que o diff não tocou, máquina lenta,
+    árvore suja na worktree alvo. O código do ticket não é o problema.
+R6  Motor: o próprio orquestrador mediu ou decidiu errado (contador, rótulo).
+R7  Humano: o ticket pede algo contraditório ou impossível e só o dono decide.
+
+Regras:
+- Prova é arquivo:linha de um artefato abaixo (saída de gate, critério, juiz,
+  diff.stat). O que o agente executor "disse" é pista, nunca prova sozinho.
+- A extração determinística já rodou. Se ela deu um palpite, confirme ou
+  derrube com prova; não repita o palpite sem conferir.
+- Mérito (o código do ticket está errado e um retry resolveria) não é um
+  destino: se for o caso, responda R4 se falta código fora do escopo, ou diga
+  na justificativa que o bloqueio parece mérito e use confianca "baixa".
+- "requeue" é reabrir o ticket SEM mudar a spec. Só diga "sim" se nada no
+  ticket precisa mudar; "sim_apos:<condição>" se basta uma condição externa
+  (base verde, árvore limpa, conserto do motor); senão "nao".
+- Remédio em UMA linha, imperativa, concreta (arquivo e o que fazer).
+- Responda SÓ com um objeto JSON, sem texto antes ou depois:
+  {"classe":"R1".."R7","confianca":"alta"|"media"|"baixa",
+   "evidencia":[{"arquivo":"<caminho do artefato>","linha":<n>,"trecho":"<até 160 chars>"}],
+   "remedio":"<uma linha>","requeue":"sim"|"nao"|"sim_apos:<condição>",
+   "justificativa":"<até 3 frases>"}
+
+Ticket {id} ({slug}) do repo {repo}, bloqueado em {quando} pela regra do motor
+"{token_do_bloqueio}", depois de {n} tentativa(s).
+
+== TICKET ==
+{ticket}
+
+== EXTRAÇÃO DETERMINÍSTICA ==
+{extracao_json}
+
+== GATE DE TESTES (recorte; os números de linha são do arquivo original) ==
+{recortes_vitest}
+
+== CRITÉRIOS QUE FALHARAM ==
+{criterios_falhos}
+
+== DIFF.STAT POR TENTATIVA ==
+{diff_stats}
+
+== JUIZ ==
+{juiz}
+
+== O QUE O AGENTE EXECUTOR DISSE (pista, não prova) ==
+{agente}`
+
+export const CAMPOS = ['id', 'slug', 'repo', 'quando', 'token_do_bloqueio', 'n', 'ticket', 'extracao_json', 'recortes_vitest', 'criterios_falhos', 'diff_stats', 'juiz', 'agente'] as const
+export type Campo = (typeof CAMPOS)[number]
+
+/** Troca cada `{campo}` pelo valor, numa passada só (valor com chaves não é relido). */
+export function preencher(v: Record<Campo, string>): string {
+  return PROMPT.replace(/\{(\w+)\}/g, (m, k: string) => ((CAMPOS as readonly string[]).includes(k) ? v[k as Campo] : m))
+}
diff --git a/scripts/orquestrador/triador/triar.ts b/scripts/orquestrador/triador/triar.ts
index 704dac0..666a7b4 100644
--- a/scripts/orquestrador/triador/triar.ts
+++ b/scripts/orquestrador/triador/triar.ts
@@ -17,7 +17,7 @@
 import { existsSync, readdirSync, readFileSync } from 'node:fs'
 import { join, resolve } from 'node:path'
 import { blocoJson } from './comum.js'
-import { extrair, type Extracao } from './extrair.js'
+import { extrair, rotuloDe, type Extracao } from './extrair.js'
 import { gitLeitura } from './git.js'
 import { lerRepo } from './leitor.js'
 import { Guarda, assinatura, caminhoDiagnostico, copiarEvidencia, gravarDiagnostico, lerDiagnostico, lerRepos, travar, type RepoListado } from './saida.js'
@@ -148,23 +148,7 @@ export function triarTicket(o: OpcoesTriar): Resultado {
   try {
     const ext = extrair(ev)
     if (o.passada && !ext.firme) return { id: o.id, feito: 'nao_promoveu' }
-    const copia = copiarEvidencia(g, o.repo.nome, ev, assin)
-    const diag = montar(o.repo.nome, ev, ext, assin, agora, copia, o.repo.caminho)
-    if (!o.passada && !ext.firme && o.modelo) {
-      const m = o.modelo({ ev, ext, repo: o.repo.nome, assinatura: assin, guarda: g, agora, copia })
-      diag.modelo = m.registro
-      if (m.resposta) {
-        diag.classe = m.resposta.classe
-        diag.rotulo = m.resposta.classe === 'R5' ? 'ambiente' : diag.rotulo
-        diag.fonte = 'modelo'
-        diag.firme = false
-        diag.regra = ext.regra
-        diag.confianca = m.resposta.confianca
-        diag.evidencia = m.resposta.evidencia
-        diag.remedio = m.resposta.remedio
-        diag.requeue = m.resposta.requeue
-      }
-    }
+    const diag = diagnosticar(g, o.repo.nome, ev, ext, assin, agora, o.repo.caminho, o.passada ? null : (o.modelo ?? null))
     gravarDiagnostico(g, o.repo.nome, o.id, diag)
     return { id: o.id, feito: o.passada ? 'promovido' : 'diagnosticado', diagnostico: diag }
   } finally {
@@ -172,6 +156,29 @@ export function triarTicket(o: OpcoesTriar): Resultado {
   }
 }
 
+/**
+ * Cópia da evidência + diagnóstico da extração + (palpite ou sem regra, com
+ * modelo) a resposta do modelo por cima. A resposta do modelo nunca é firme.
+ */
+export function diagnosticar(g: Guarda, repo: string, ev: Evidencia, ext: Extracao, assin: string, agora: number, raizRepo: string, modelo: PassoModelo | null): Diagnostico {
+  const copia = copiarEvidencia(g, repo, ev, assin)
+  const diag = montar(repo, ev, ext, assin, agora, copia, raizRepo)
+  if (ext.firme || !modelo) return diag
+  const m = modelo({ ev, ext, repo, assinatura: assin, guarda: g, agora, copia })
+  diag.modelo = m.registro
+  if (m.resposta) {
+    diag.classe = m.resposta.classe
+    diag.rotulo = rotuloDe(m.resposta.classe)
+    diag.fonte = 'modelo'
+    diag.firme = false
+    diag.confianca = m.resposta.confianca
+    diag.evidencia = m.resposta.evidencia
+    diag.remedio = m.resposta.remedio
+    diag.requeue = m.resposta.requeue
+  }
+  return diag
+}
+
 /** Os ids com `status: "bloqueado"` no 1º bloco json dos tickets do repo. */
 export function bloqueados(raiz: string): string[] {
   const fila = join(raiz, 'docs/fila')
diff --git a/test/fixtures/claude-envelope/triador-stub.sh b/test/fixtures/claude-envelope/triador-stub.sh
new file mode 100755
index 0000000..9b13d05
--- /dev/null
+++ b/test/fixtures/claude-envelope/triador-stub.sh
@@ -0,0 +1,10 @@
+#!/usr/bin/env bash
+# triador-stub.sh — o `claude` dos testes do triador (etapa 7f): NUNCA chama API.
+# Registra os argumentos e o tamanho da entrada em $STUB_LOG, guarda a entrada
+# em $STUB_ENTRADA (se definido) e responde o conteúdo de $STUB_RESPOSTA (o
+# envelope de `claude -p --output-format json`). Sai com $STUB_RC (padrão 0).
+entrada="$(cat)"
+printf '%s\t%s\n' "$*" "${#entrada}" >> "${STUB_LOG:-/dev/null}"
+if [ -n "${STUB_ENTRADA:-}" ]; then printf '%s' "$entrada" > "$STUB_ENTRADA"; fi
+cat "${STUB_RESPOSTA:?STUB_RESPOSTA sem valor}"
+exit "${STUB_RC:-0}"
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
new file mode 100644
index 0000000..94c5bf7
--- /dev/null
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -0,0 +1,257 @@
+/**
+ * Etapa 7f-b1, peça 5 · a camada do modelo, SÓ COM STUB (spec 7f-a §4).
+ *
+ * A sessão de etapa nunca chama API: o `claude` aqui é
+ * `test/fixtures/claude-envelope/triador-stub.sh` (por `ORQ_TRIADOR_CLAUDE`),
+ * e o `claude` do PATH é uma trava que registra e sai 99 (o teste reprova se
+ * ela for tocada).
+ *
+ * Pronto quando: entrada acima de 30 mil tokens corta na ordem de §4; o prompt
+ * é o literal da spec; o teto do dia impede a chamada e grava `pulado`;
+ * envelope ilegível mantém a extração e grava `modelo.erro`; evidência com
+ * linha inexistente é descartada; e `orq triar` roda extração + modelo e
+ * imprime o resumo, uma chamada por assinatura.
+ */
+import { spawnSync } from 'node:child_process'
+import { createHash } from 'node:crypto'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, utimesSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+import { materializar } from './triador-repo-legado.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
+const TRIADOR = join(RAIZ, 'scripts', 'orquestrador', 'triador')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const CASO = join(FX, '01-559-L55054')
+const SEGREDO = 'sk-ant-EXEMPLO_REMOVIDO'
+
+// sha256 do texto da spec 7f-a §4 (linhas 214-277), conferido na etapa contra o arquivo da spec.
+const SHA_PROMPT_DA_SPEC = '3e016ee70c19d029d12be1726fcfeaca5f2a13a3608cd8e942fb66a41813b833'
+
+type Qualquer = any // o teste só lê campos
+interface Mods {
+  lerCasoDeFixture: (d: string, o?: { instante?: string }) => Qualquer
+  extrair: (e: Qualquer) => Qualquer
+  montarEntrada: (repo: string, ev: Qualquer, ext: Qualquer, max?: number) => { prompt: string; chars: number; cortes: { secao: number; de: number; para: number }[] }
+  criarPassoModelo: (cfg: Qualquer) => (ctx: Qualquer) => { registro: Qualquer; resposta?: Qualquer }
+  diagnosticar: (...a: Qualquer[]) => Qualquer
+  Guarda: new (extra?: string[]) => Qualquer
+  PROMPT: string
+  ChamadaRealRecusada: new (...a: unknown[]) => Error
+}
+async function carregar(): Promise<Mods | null> {
+  try {
+    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, unknown>
+    const m = { ...(await imp('leitor-legado-comarka.ts')), ...(await imp('extrair.ts')), ...(await imp('modelo.ts')), ...(await imp('triar.ts')), ...(await imp('saida.ts')) }
+    return typeof m.montarEntrada === 'function' && typeof m.criarPassoModelo === 'function' ? (m as unknown as Mods) : null
+  } catch {
+    return null
+  }
+}
+
+const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }
+const hoje = () => new Date().toISOString().slice(0, 10)
+
+let base: string
+const envAntes = { ...process.env }
+beforeEach(() => {
+  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-modelo-')))
+  mkdirSync(join(base, 'trava'))
+  writeFileSync(join(base, 'trava', 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(base, 'trava.log')}"\nexit 99\n`)
+  chmodSync(join(base, 'trava', 'claude'), 0o755)
+  Object.assign(process.env, {
+    ORQ_DIAG_DIR: join(base, 'diag'),
+    ORQ_REPOS: join(base, 'repos.json'),
+    ORQ_TRIADOR_CONFIG: join(base, 'triador.json'),
+    ORQ_TRIADOR_CLAUDE: STUB,
+    STUB_LOG: join(base, 'stub.log'),
+    STUB_RESPOSTA: join(base, 'resposta.json'),
+    STUB_ENTRADA: join(base, 'entrada.txt'),
+    PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
+  })
+  writeFileSync(join(base, 'triador.json'), JSON.stringify(CFG))
+})
+afterEach(() => {
+  // a trava do claude real nunca pode ter sido tocada
+  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
+  process.env = { ...envAntes }
+})
+
+const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
+const envelope = (result: string, custo = 0.1234) =>
+  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result, total_cost_usd: custo, usage: { input_tokens: 12000, output_tokens: 800 } }))
+
+async function contexto() {
+  const m = await carregar()
+  if (!m) return null
+  const ev = m.lerCasoDeFixture(CASO)
+  const ext = m.extrair(ev)
+  const guarda = new m.Guarda([FX])
+  return { m, ev, ext, ctx: { ev, ext, repo: 'fixture', assinatura: 'a'.repeat(64), guarda, agora: Date.now(), copia: '' } }
+}
+
+describe('modelo do triador, com stub (peça 5)', () => {
+  it('o prompt é o literal da spec §4, e a entrada preenche todos os campos', async () => {
+    const c = await contexto()
+    expect(c && createHash('sha256').update(c.m.PROMPT).digest('hex')).toBe(SHA_PROMPT_DA_SPEC)
+    const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext)
+    expect(e?.prompt.startsWith('Você é o triador de bloqueios de um orquestrador de tickets.')).toBe(true)
+    expect(e?.prompt).toMatch(/Ticket 559 \(aceite-aba-conta\) do repo comarka-operacional, bloqueado em 2026-09-25T13:24:49Z pela regra do motor\n"circuit_breaker", depois de 2 tentativa\(s\)\./)
+    expect(e?.prompt).not.toMatch(/\{(id|slug|repo|quando|token_do_bloqueio|n|ticket|extracao_json|recortes_vitest|criterios_falhos|diff_stats|juiz|agente)\}/)
+    expect(e?.cortes).toEqual([])
+  })
+
+  it('entrada acima de 30 mil tokens corta de baixo para cima, na ordem de §4, e vai mascarada', async () => {
+    const c = await contexto()
+    if (c) {
+      const ult = c.ev.tentativas.at(-1)
+      ult.recorte_vitest.linhas = Array.from({ length: 2500 }, (_, i) => ({ n: i + 1, t: `linha de gate ${'x'.repeat(80)}` }))
+      ult.agente_disse = `o agente disse ${SEGREDO}`
+    }
+    const e = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext, 30000)
+    expect(e?.chars ?? Infinity).toBeLessThanOrEqual(30000 * 3.5)
+    expect(e?.cortes.map((x) => x.secao)).toEqual([7, 6, 5, 4, 3])
+    expect(e?.cortes.slice(0, 4).every((x) => x.para === 0)).toBe(true)
+    expect(e?.cortes[4]?.para ?? 0).toBeGreaterThan(0)
+    expect(e?.prompt).toContain('"criterios_aceite_que_falharam"')
+    expect(e?.prompt).toContain('"palpite": "R4?"')
+    // sem corte, o segredo do agente chega mascarado
+    if (c) c.ev.tentativas.at(-1).recorte_vitest.linhas = c.ev.tentativas.at(-1).recorte_vitest.linhas.slice(0, 10)
+    const e2 = c?.m.montarEntrada('comarka-operacional', c.ev, c.ext, 30000)
+    expect(e2?.prompt).toContain('o agente disse ‹segredo›')
+    expect(e2?.prompt).not.toContain(SEGREDO)
+  })
+
+  it('o teto do dia impede a chamada e grava pulado; no limite exato ainda chama', async () => {
+    const c = await contexto()
+    const ledger = (gastos: number[]) => {
+      mkdirSync(join(base, 'diag'), { recursive: true })
+      writeFileSync(join(base, 'diag', 'custo.json'), JSON.stringify({ dias: { [hoje()]: gastos.map((g) => ({ repo: 'x', id: '1', assinatura: 'a', custo_usd: g, tokens_in: 1, tokens_out: 1 })) } }))
+    }
+    envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'x' }))
+    ledger([1.5, 1.3])
+    const r = c?.m.criarPassoModelo(CFG)(c.ctx)
+    expect(r?.registro).toEqual({ modelo: 'claude-opus-5-5', pulado: 'teto_dia' })
+    expect(chamadas()).toEqual([])
+    ledger([1.5, 1.2])
+    c?.m.criarPassoModelo(CFG)(c.ctx)
+    expect(chamadas()).toHaveLength(1)
+    expect(chamadas()[0]).toMatch(/^-p --output-format json --model claude-opus-5-5 --allowedTools {2}--max-turns 1 --max-budget-usd 0\.3\t\d+$/)
+    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number }[]> }
+    expect(l.dias[hoje()]!.map((x) => x.custo_usd)).toEqual([1.5, 1.2, 0.1234])
+  })
+
+  it('envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido)', async () => {
+    const c = await contexto()
+    writeFileSync(join(base, 'resposta.json'), 'Error: conexão recusada\n')
+    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
+    expect([d?.classe, d?.fonte, d?.firme, d?.regra]).toEqual(['R4?', 'extracao', false, 'D9'])
+    expect(d?.modelo?.erro).toMatch(/envelope ilegível/)
+    expect(chamadas()).toHaveLength(1)
+    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number | null }[]> }
+    expect(l.dias[hoje()]).toEqual([expect.objectContaining({ id: '559', custo_usd: null })])
+  })
+
+  it('evidência com linha inexistente (ou arquivo que não foi lido) é descartada; a válida fica', async () => {
+    const c = await contexto()
+    const valida = c?.ext.evidencia[0]
+    envelope(
+      'texto antes\n' +
+        JSON.stringify({
+          classe: 'R3', confianca: 'media', remedio: 'decidir: abrir ticket de src para a tela de Auditoria', requeue: 'nao', justificativa: 'gap de src',
+          evidencia: [valida, { arquivo: valida?.arquivo, linha: 999999, trecho: 'x' }, { arquivo: 'docs/fila/runs/inventado.txt', linha: 1, trecho: 'y' }],
+        }),
+    )
+    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
+    expect([d?.classe, d?.fonte, d?.firme, d?.confianca]).toEqual(['R3', 'modelo', false, 'media'])
+    expect(d?.modelo?.evidencia_descartada).toBe(2)
+    expect(d?.evidencia.map((r: { arquivo: string; linha: number }) => `${r.arquivo}:${r.linha}`)).toEqual([`${valida?.arquivo}:${valida?.linha}`])
+  })
+
+  it('resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração', async () => {
+    const c = await contexto()
+    for (const result of [
+      JSON.stringify({ classe: 'R3', confianca: 'alta', evidencia: [{ arquivo: 'x', linha: 1 }], remedio: 'x', requeue: 'nao', justificativa: '' }),
+      JSON.stringify({ classe: 'R9', confianca: 'alta', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: '' }),
+    ]) {
+      envelope(result)
+      const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
+      expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
+      expect(d?.modelo?.erro).toBeTruthy()
+    }
+  })
+
+  it('sem stub, sob teste, a chamada real é recusada antes de existir processo', async () => {
+    const c = await contexto()
+    delete process.env.ORQ_TRIADOR_CLAUDE
+    let erro: unknown = null
+    try {
+      c?.m.criarPassoModelo(CFG)(c.ctx)
+    } catch (e) {
+      erro = e
+    }
+    expect(c && erro instanceof c.m.ChamadaRealRecusada).toBe(true)
+  })
+
+  it('orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura', async () => {
+    const raiz = materializar(CASO, join(base, 'comarka-fx'))
+    envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [(await contexto())?.ext.evidencia[0]], remedio: 'decidir: ticket de src', requeue: 'nao', justificativa: 'x' }))
+    const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', ...a], { encoding: 'utf8', cwd: base, env: process.env })
+    const r1 = orq('comarka-fx', '559')
+    expect(r1.status, r1.stderr).toBe(0)
+    expect(r1.stdout).toMatch(/^comarka-fx \(.*comarka-fx\) · modelo claude-opus-5-5, teto US\$ 3\.00\/dia\n559\tR3\tmodelo \(media\)\tdecidir: ticket de src\n/)
+    expect(chamadas()).toHaveLength(1)
+    expect(existsSync(join(raiz, '.orq'))).toBe(false)
+    const r2 = orq('comarka-fx', '559')
+    expect(r2.stdout).toMatch(/\n559\tmesma_assinatura\n/)
+    expect(chamadas()).toHaveLength(1)
+    expect(orq('comarka-fx', '559', '--forcar').status).toBe(0)
+    expect(chamadas()).toHaveLength(2)
+    expect(orq('comarka-fx', '559', '--passada', '--x').status).toBe(1)
+  })
+
+  it('orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
+    envelope(JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' }), 0.3)
+    const antes = spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout
+    const orq = (teto: string, ...a: string[]) =>
+      spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fixture', FX, ...a], { encoding: 'utf8', env: { ...process.env, ORQ_TRIADOR_TETO_DIA: teto } })
+    const r = orq('6.30')
+    expect(r.status, r.stderr).toBe(0)
+    expect(chamadas()).toHaveLength(21)
+    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 21; custo desta corrida: US\$ 6\.3000/)
+    const dir = join(base, 'diag', 'fixture-triador-7f')
+    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(21)
+    expect(orq('6.30').stdout).toMatch(/chamadas novas: 0;/)
+    expect(chamadas()).toHaveLength(21)
+    expect(spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout).toBe(antes)
+    // num dia novo de ledger, com o teto padrão de US$ 3,00: 10 chamadas e 11 puladas
+    writeFileSync(join(base, 'diag', 'custo.json'), '{"dias":{}}')
+    const r3 = orq('3', '--forcar')
+    expect(r3.stdout).toMatch(/chamadas novas: 10;/)
+    expect(chamadas()).toHaveLength(31)
+  })
+
+  it('orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)', async () => {
+    const d = join(FX, '21-760-L72407')
+    const raiz = materializar(d, join(base, 'comarka-fx'))
+    const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', raiz, '760', ...a], { encoding: 'utf8', env: process.env })
+    const r1 = orq('--sem-modelo')
+    expect(r1.stdout).toMatch(/\n760\tR5\?\tpalpite D7\t/)
+    // o 761 fica vermelho no mesmo teste 17 min depois
+    const viz = join(raiz, 'docs/fila/runs/761/attempt-1')
+    mkdirSync(viz, { recursive: true })
+    writeFileSync(join(viz, 'gate-vitest.txt'), ' FAIL  test/migrations-policy-idempotente.test.ts > x > y\n')
+    const fim = Date.parse((JSON.parse(readFileSync(join(d, 'caso.json'), 'utf8')) as { fim: string }).fim) / 1000 + 17 * 60
+    utimesSync(join(viz, 'gate-vitest.txt'), fim, fim)
+    const r2 = orq('--passada')
+    expect(r2.stdout).toMatch(/\n760\tR5\tfirme D5\tconsertar a base: .* vermelho também em 761, fora do diff\t\[requeue sim_apos:base_verde:test\/migrations-policy-idempotente\.test\.ts\]\n/)
+    expect(chamadas()).toEqual([])
+    expect(readdirSync(join(base, 'diag', 'comarka-fx', '760', 'historico'))).toHaveLength(1)
+    // a passada só mexe em palpite: firme não roda de novo
+    expect(orq('--passada').stdout).toMatch(/\n760\tsem_palpite_recente\n/)
+  })
+})
+
```

### 48d682d
```diff
commit 48d682d4ca48c9226e0c68e63ddd5a280c2629f3
Author: Lucas Santos
Date: Sat Oct 10 18:56:52 2026 -0300

7f-b1-6: CONTRATO (§9.1 e §13, o triador), CHANGELOG e PECAS com os shas

CONTRATO §13: fontes (os dois leitores e a Evidencia), regras D1-D12 com
arquivo:linha, saida (raiz, guarda, assinatura, trava, historico, copia,
mascara), modelo e tetos, fixture e testes. §9.1: orq triar.
CHANGELOG etapa 7f-b1 e PECAS (feita; pendentes: peca 6, 7f-b2).

Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>


diff --git a/CHANGELOG.md b/CHANGELOG.md
index 20c3d8b..2bf6fa3 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -860,3 +860,31 @@ K6a. Nenhum commit do porte do Actus tocou nisso. Evidência e procedência em
 - Backlog: a tabela `caso_decisao`, o `DL=1` e o cabeçalho de 8 causas do
   `test-lib-config.sh` do Actus são genéricos do motor e deveriam morar no kit.
   Ver `docs/defeitos/2026-09-27-test-lib-config-casos-do-actus.md`.
+
+### Etapa 7f-b1 · triador de bloqueios, só leitura, modelo só em stub (10/10/2026)
+
+Spec `~/orq-sessoes/spec-7f-triador.md` (7f-a), peças 1 a 5 da §8, com as decisões do chat
+do programa (Opus 5.5, US$ 3,00/dia, 30 mil tokens; a passada promove palpite a firme; o
+painel não dispara gasto, quem roda é `orq triar`; a corrida real é a peça 6, depois do
+merge). CONTRATO §9.1 e §13.
+
+- **7f-b1-1** `0ebe0f6`: `test/fixtures/triador-7f/` (2,6 MB): os 37 bloqueios da medição
+  de 09/10 com `esperado.json` (classe da §5, evidência e linha da tabela) e 20 done de
+  controle, montados por `montar.py` só lendo o comarka-operacional. O aceite
+  (`orquestrador-triador-aceite.test.ts`) entra vermelho por asserção (0 de 16 firmes).
+- **7f-b1-2** `81574fc`: leitores `kit` e `legado-comarka` → a mesma `Evidencia`; recorte
+  do gate de testes igual ao do `montar.py`; `gitLeitura`.
+- **7f-b1-3** `541f9d1`: extração e regras D1-D12. Na fixture: 16 firmes certos (os da
+  spec §3.3), 0 firme errado, controle sem firme; 14 firmes no instante do bloqueio.
+- **7f-b1-4** `6ce01fd`: saída em `ORQ_DIAG_DIR` (`~/.orq/diagnosticos`) pela `Guarda`,
+  assinatura, trava `O_EXCL`, histórico, cópia mascarada. Teste num repo git de fixture:
+  `git status` e mtimes (até de `.git`) iguais, nenhum `index.lock`, todo git com
+  `GIT_OPTIONAL_LOCKS=0` (git falso no PATH).
+- **7f-b1-5** `9ed29f0`: camada do modelo com stub (prompt literal, corte por ordem, teto
+  do dia com `pulado`, parser, evidência descartada, ledger) e `orq triar`, despachado
+  antes do `lib.sh`, com `--passada`, `--forcar`, `--sem-modelo` e `--fixture` (a corrida da
+  peça 6).
+- **7f-b1-6**: este registro, `docs/PECAS.md` e CONTRATO §9.1 e §13.
+
+Nenhuma asserção existente mudou. O teste da peça 2 cedeu o `materializar` para
+`test/triador-repo-legado.ts`, sem mudar asserção.
diff --git a/CONTRATO.md b/CONTRATO.md
index 1030cbb..1abe1fb 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -671,7 +671,10 @@ estava.
 | `orq pausar [motivo]` | cria o `pausar_file` e grava `PAUSA motivo=<token> por=terminal` na trilha — **escreve** |
 | `orq retomar` | imprime quem pausou, quando e por quê; remove o `pausar_file` e grava `RETOMADA por=terminal dur=<N>min` — **escreve** |
 | `orq liberar <humano:token> [nota]` | acrescenta um token v2 em `liberacoes_file` — **escreve** (§6.2) |
+| `orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]` | triador de bloqueios (§13): lê OUTRO repo e grava o diagnóstico em `~/.orq/diagnosticos`, nunca no repo; despachado antes do `lib.sh` (`scripts/orq:88`) |
 
+`orq triar` não escreve no repo: toda escrita dele passa pela `Guarda` (§13.4), fora
+de qualquer repo do `repos.json`.
 Os TRÊS que escrevem escrevem UM arquivo do repo cada, nunca estado de execução;
 `pausar` e `retomar` acrescentam, além dele, UMA linha à trilha (peça K12-F), pelo
 `event()` do `lib.sh`, a mesma que o painel grava. A trilha é append-only e não é
@@ -1000,6 +1003,144 @@ desliga o que segue supports-color/chalk.
 
 ---
 
+## 13. Etapa 7f-b1: triador de bloqueios, só leitura (10/10/2026)
+
+Spec: `~/orq-sessoes/spec-7f-triador.md` (7f-a), peças 1 a 5 da §8, com as decisões do
+chat do programa: modelo `claude-opus-5-5` com teto de US$ 3,00 por dia e entrada cortada
+em 30 mil tokens; a passada pode promover palpite a firme; o painel nunca dispara gasto
+(quem roda é `orq triar`, manual e depois job do launchd, peça 7 redefinida na 7f-b2); a
+corrida real com o modelo (peça 6) não é da sessão de etapa. O painel (§9.5) ainda não lê
+os diagnósticos: isso é a 7f-b2.
+
+### 13.1 O que é
+
+Para cada ticket `bloqueado` de um repo, o triador lê a evidência que o motor já gravou,
+diz qual dos sete destinos (R1 a R7) o bloqueio tem, onde está a prova (`arquivo:linha` do
+artefato ORIGINAL) e o remédio em uma linha, e grava isso FORA do repo. Não decide, não
+reabre, não muda status, nota ou critério, não roda script do repo.
+
+Código: `scripts/orquestrador/triador/`. Comando: `orq triar` (`cli.ts`).
+
+### 13.2 Fontes (dois leitores, uma `Evidencia`)
+
+O leitor sai da forma do diretório (`leitor.ts:22`): `<runs_dir>/events.log` → `kit`;
+sem ela e com `docs/fila/runs/local-loop.log` → `legado-comarka`. Os dois devolvem a mesma
+`Evidencia` (`tipos.ts`); a extração e o modelo só veem ela.
+
+| | `kit` (`leitor-kit.ts:71`) | `legado-comarka` (`leitor-legado-comarka.ts:195`) |
+|---|---|---|
+| ticket | 1º bloco json de `docs/fila/<id>-*.md` (§2) | idem |
+| bloqueio | último `BLOQUEADO` do id na trilha (§4); token = `motivo[:sub]` | última linha `ticket <id>: BLOQUEADO …`/`reprovado após` do `local-loop.log`; token `circuit_breaker`, `enforcement`, `retries_esgotados` |
+| série | `INICIO` do id desde o desfecho anterior; `attempt=N` → `attempt-(N-1)` (§5.3) | última sequência 1..n do `meta.json` (`serieDoMeta`, `:378`); entre `attempt-k` e `attempt-k.prevJ`, o de mtime mais recente até fim + 180 s (`:32`) |
+| estágio | `veredito.json .causa`, `FALHA <gate>` do `gates.txt`, juiz | pela PRESENÇA dos arquivos, o fail-fast do executor do legado (`estagioPorPresenca`, `:65`) |
+| vermelho | recorte do próprio `gates.txt` (`--- recorte de … ---`) | `gate-vitest.txt` recortado (`recorte.ts:59`) |
+| fonte do teste | não há HEAD por tentativa: acoplamento `null` | `git show <head.txt>:<teste>` por `gitLeitura` |
+| vizinhos | `BLOQUEADO motivo=base_vermelha arquivos=` de outros ids | todo `FAIL` de `runs/*/attempt-*/gate-vitest.txt` com mtime nas ±6 h (`:31`) |
+
+Recorte do gate de testes (`recorte.ts:59`): âncoras fortes (`FAIL`, `❯ arquivo:N:M`,
+`Test Files`, `Tests`, Timeout, EMFILE, ENOSPC, `Cannot find module`) sempre; sem `FAIL`, só
+elas; depois as fracas (AssertionError, Expected, Received, `Error:`) e contexto de 6
+linhas até 300; quadro de pilha que não cita arquivo de teste nunca entra. Cada linha
+guarda o número do original.
+
+Regra de falta: fonte ausente entra em `falta[]` e a classe só é firme com as fontes que a
+regra usa. Nada é estimado.
+
+### 13.3 Regras (`extrair.ts:107`)
+
+A primeira que casa decide; o estágio é o da última tentativa. Firme vai ao diagnóstico
+sem modelo; palpite (`?`) ou sem regra vai ao modelo, se houver orçamento.
+
+| # | condição | classe | linha |
+|---|---|---|---|
+| D1 | merge recusado por mudança local (`overwritten by merge`) e juiz aprovou | R5 árvore suja | `:184` |
+| D2 | diff-cap e diff.stat ≤ `diff_cap_linhas` | R6 | `:197` |
+| D3 | diff-cap e diff.stat > cap | R3? | `:197` |
+| D4 | `Timeout waiting for worker`/`Timeout starting`/EMFILE/ENOSPC na última tentativa | R5 máquina | `:207` |
+| D5 | o motor do kit já decidiu `base_vermelha`; ou o vermelho fora da allowlist e do diff aparece em outra família nas ±6 h | R5 base | `:214` |
+| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff | R1 | `:229` |
+| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:236` |
+| D8 | enforcement | R1? | `:240` |
+| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:245` |
+| D10 | vitest, vermelho dentro | R2? | `:245` |
+| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:251` |
+| D12 | critério | R2? | `:251` |
+
+Allowlist pelo `matchesAllowlist` do enforcement (`enforcement-core.ts:178`); local do
+vermelho pelo `primeiroLocal` (`diagnostico.ts:109`). A prova de um vermelho é a linha
+`FAIL`, o erro logo abaixo e o local `❯`. O que o agente disse nunca entra em regra.
+
+Placar na fixture dos 37 (estado da passada): 16 firmes certos, 0 firme errado, 13
+palpites certos, 7 errados, 1 sem regra; no instante do bloqueio, 14 firmes (760 e 898 #31
+ficam `R5?` até o vizinho aparecer). Nenhum dos 20 de controle sai firme.
+
+### 13.4 Saída (`saida.ts`)
+
+Raiz: `ORQ_DIAG_DIR` ou `~/.orq/diagnosticos` (`raizDiagnosticos`, `:25`).
+
+| caminho | o quê |
+|---|---|
+| `<repo>/<id>.json` | o diagnóstico atual (`$schema_versao: 1`, formato da spec §5) |
+| `<repo>/<id>.lock` | trava `O_EXCL` com pid e hora; órfã depois de 10 min (`travar`, `:160`) |
+| `<repo>/<id>/historico/<assinatura12>.json` | os anteriores (`gravarDiagnostico`, `:200`) |
+| `<repo>/<id>/<assinatura12>/evidencia/<caminho original>` | cópia do que foi lido, recortada e mascarada (`copiarEvidencia`, `:213`) |
+| `custo.json` | ledger do modelo: `{dias: {"AAAA-MM-DD": [{repo, id, assinatura, custo_usd, tokens_in, tokens_out}]}}` |
+
+`<repo>` é o `nome` do `repos.json` (padrão: o nome do diretório), o mesmo do painel.
+
+Regras duras:
+- **Guarda** (`saida.ts:79`): toda escrita resolve o caminho real e LANÇA se ele não está
+  sob a raiz, ou está sob qualquer caminho do `repos.json` ou sob o repo triado. Raiz
+  dentro de um repo lança no construtor.
+- **Git** (`git.ts:24`): só `gitLeitura`, com `GIT_OPTIONAL_LOCKS=0`; verbos `show`, `log`,
+  `rev-parse`, `ls-tree`, `status --porcelain`; outro verbo lança antes de existir processo.
+- **Assinatura** (`saida.ts:146`): sha256 de repo, id, status, nota e nome/mtime/tamanho de
+  cada arquivo lido. Mesma assinatura: não roda (só `--forcar`). Assinatura nova: o
+  anterior vai para o histórico.
+- **Passada** (`--passada`, `triar.ts:133`): sem modelo; só diagnósticos de até 6 h com
+  classe em palpite; grava só se a extração ficou firme (promove).
+- Ticket que saiu de `bloqueado`: o diagnóstico fica, com `encerrado_em` (`triarRepo`, `:203`).
+- `arvore_alvo_agora`: `git status --porcelain` da worktree alvo, só registro, nunca prova.
+- Máscara (`mascara.ts:22`): `sk-…`, JWT, `service_role`, `SUPABASE_*=`/`*_KEY=`/`*_TOKEN=`
+  com valor, e-mail → `‹segredo›`, antes de qualquer envio e na cópia.
+
+### 13.5 Modelo e tetos (`modelo.ts`)
+
+Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.erro`).
+
+- Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json` (`lerConfigModelo`, `:48`):
+  `modelo` (padrão `claude-opus-5-5`; `null` desliga), `teto_dia_usd` (3,00),
+  `teto_caso_usd` (0,30), `entrada_max_tokens` (30000), `timeout_secs` (120).
+  `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia.
+- Entrada (`montarEntrada`, `:141`): as 7 seções da spec §4 (ticket; extração; recorte do
+  vitest; critérios FALHA; diff.stat; juiz; o que o agente disse, 3000 + 1500 caracteres),
+  cortadas de baixo para cima até `entrada_max_tokens × 3,5` caracteres, e mascaradas. O
+  diff cru não entra. O prompt é o literal da spec (`prompt.ts`).
+- Chamada (`chamar`, `:199`): `claude -p --output-format json --model <m> --allowedTools ""
+  --max-turns 1 --max-budget-usd <teto_caso>`, prompt pela entrada padrão. O binário é
+  `ORQ_TRIADOR_CLAUDE` ou `claude`; sob teste (vitest ou `ORQ_TESTE=1`) sem
+  `ORQ_TRIADOR_CLAUDE`, a chamada é recusada.
+- Teto do dia (`criarPassoModelo`, `:352`): a chamada só sai se gasto do dia + teto do caso
+  ≤ teto do dia (entrada sem custo conhecido conta como o teto do caso); senão
+  `modelo: {pulado: "teto_dia"}` e vale a extração. Custo acima do teto do caso marca
+  `custo_acima_do_teto` no ledger.
+- Resposta (`lerResposta`, `:260`): a última linha JSON com `classe` em R1-R7. Cada
+  evidência tem de ser de um arquivo lido e de uma linha que ele tem (no recorte, uma
+  linha guardada); a que não confere sai e conta `evidencia_descartada`
+  (`conferirEvidencia`, `:286`). Envelope ilegível, sem evidência válida ou classe fora da
+  lista: vale a extração, com `modelo.erro`. A resposta do modelo nunca é firme.
+
+### 13.6 Fixture e testes
+
+`test/fixtures/triador-7f/`: os 37 bloqueios da medição de 09/10 e 20 done de controle,
+montados por `montar.py` (só leitura do comarka-operacional, git com
+`GIT_OPTIONAL_LOCKS=0`), cada um com `esperado.json` (classe e evidência da medição, com a
+linha da tabela). `orq triar --fixture <dir>` (`corrida.ts:46`) roda o triador sobre os 37
+e imprime o placar (C) da spec §7.2; é a corrida da peça 6.
+
+Testes: `orquestrador-triador-{fixture,leitores,extrair,aceite,saida,modelo}.test.ts`. O
+`claude` deles é `test/fixtures/claude-envelope/triador-stub.sh`; o do PATH é uma trava.
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index d4d808a..899fba8 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -939,8 +939,32 @@
   `orquestrador-gate-severidade.test.ts`, `orquestrador-gate-correcoes.test.ts`,
   `orquestrador-gate-comarka.test.ts`, `test-sem-cor.sh`, `test-gate-prevoo.sh` casos 8 e 9.
 
+- **Etapa 7f-b1 · triador de bloqueios, só leitura** (10/10/2026). Para cada bloqueado, a
+  classe R1-R7, a prova `arquivo:linha` e o remédio, gravados em `~/.orq/diagnosticos` e
+  nunca no repo; extração determinística D1-D12 primeiro, modelo (Opus 5.5, US$ 3,00/dia)
+  só para palpite, em stub nesta etapa. Commits `0ebe0f6` (fixture), `81574fc` (leitores),
+  `541f9d1` (regras), `6ce01fd` (saída), `9ed29f0` (modelo e `orq triar`).
+  *Evidência:* `~/orq-sessoes/spec-7f-triador.md` e `~/orq-sessoes/medicao-bloqueios-out.md`
+  §3 e §5; `~/orq-sessoes/relatorio-kit-etapa7f-b1.md`.
+  *Teste:* `orquestrador-triador-aceite.test.ts` ((A) e (B): 16 firmes certos, 0 errado;
+  controle sem firme), `-fixture`, `-leitores`, `-extrair`, `-saida` (repo git intocado,
+  `GIT_OPTIONAL_LOCKS=0`), `-modelo` (stub; `claude` do PATH é trava).
+
 ## PENDENTES
 
+- **7f peça 6 · corrida real e replay.** `orq triar --fixture test/fixtures/triador-7f` com o
+  modelo de verdade, teto US$ 6,30, nos 21 casos de palpite; as `resposta-modelo.json` entram
+  na fixture e o aceite (C) vira replay (≥ 30/37).
+  *Evidência:* spec 7f-a §7.2 e §8; o comando e o que conferir estão no relatório da 7f-b1.
+  *Teste:* aceite (C) por replay, sem chamada no CI.
+
+- **7f-b2 · gatilho e painel.** A peça 7 da spec redefinida (o painel nunca dispara gasto:
+  `orq triar` manual e depois job do launchd) e a peça 8 (coluna Diagnóstico, clique, filtro
+  por classe, linha na pausa, `pulado`/`obsoleto`); CONTRATO §9.5 lendo
+  `~/.orq/diagnosticos`.
+  *Evidência:* spec 7f-a §1 e §5 (Painel K12).
+  *Teste:* `test-painel-triador.sh` da spec, com os quatro estados.
+
 - **7d-2 · o gate executa: C1, C5, C6.** Recon executado (C1, a única regra com causa e
   zero FP nos três repos na calibração), guarda que já falha (C5, com a exceção de arquivo
   que o ticket cria) e alvo que já passa (C6), contra a branch alvo em worktree
```

### 20f41b8 (sem os 99 arquivos de dados de `cortados/`, que o `montar.py --so-cortados` refaz)
```diff
commit 20f41b81a5eaaa2b876f06ea2faded3967b9163c
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Sat Oct 10 20:15:00 2026 -0300

    7f-b1-7: D6 so firme com o mesmo vermelho fora em >= 2 tentativas; 5 casos de serie cortada
    
    Decisao do chat do programa sobre a D6: R1 firme so quando o mesmo teste
    vermelho fora da allowlist (e do diff) aparece em pelo menos duas tentativas
    da serie; com uma so, sai palpite R1? (regra D6), e vai ao modelo.
    
    - fixture: cortados/ (671d, 624, 627e, 808, 367), os controles cortados na
      ultima tentativa que reprovou; montar.py --so-cortados os refaz a partir de
      controle/, sem o comarka (reproduzivel). Fixture em 2,8 MB.
    - aceite: (cortados) nenhum dos 5 sai firme; (B) 15 firmes certos (346d vira
      R1?); no instante do bloqueio, 13 firmes.
    - corrida da peca 6: 22 palpites, teto US$ 6,60 (22 x 0,30); o teste do
      --fixture passa a 22 chamadas.
    
    Vermelho antes, por assercao: 4 falhas (13 vs 14 firmes no bloqueio; 15 vs 16
    na passada; 5 cortados firmes R1; 21 vs 22 chamadas).
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
index 96204b1..5f380ca 100644
--- a/scripts/orquestrador/triador/corrida.ts
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -3,7 +3,7 @@
  * fixture `test/fixtures/triador-7f`, no estado da passada (spec 7f-a §7.2 C).
  *
  * É a corrida da PEÇA 6: o humano roda depois do merge, com o modelo de
- * verdade e o teto do dia em US$ 6,30 (21 palpites × US$ 0,30). Os firmes não
+ * verdade e o teto do dia em US$ 6,60 (22 palpites × US$ 0,30). Os firmes não
  * chamam modelo. Cada caso grava, em `ORQ_DIAG_DIR/fixture-triador-7f/`, o
  * diagnóstico e `<caso>/resposta-modelo.json` (o registro do modelo, para o
  * replay da peça 6). Nada é escrito na fixture: ela entra na `Guarda` como
diff --git a/scripts/orquestrador/triador/extrair.ts b/scripts/orquestrador/triador/extrair.ts
index 0db893d..9d14f55 100644
--- a/scripts/orquestrador/triador/extrair.ts
+++ b/scripts/orquestrador/triador/extrair.ts
@@ -226,11 +226,20 @@ export function extrair(ev: Evidencia): Extracao {
     return sai('R5', 'D5', provas, `consertar a base: ${local(vermelhoRefs(b.t, b.arquivo), b.arquivo)} vermelho também em ${ids.join(', ')}, fora do diff`, `sim_apos:base_verde:${b.arquivo}`)
   }
 
-  // D6 · vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou
+  // D6 · vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou.
+  // Firme só com o MESMO teste vermelho fora em ≥ 2 tentativas da série
+  // (7f-b1-7, decisão do chat do programa): com uma só, o agente ainda pode
+  // resolver no retry (os 5 de série cortada da fixture), e vira `R1?`.
   if ((u === 'vitest' || u === 'enforcement') && fora.length && acoplado === true) {
-    const a = acoplados.at(-1)!
+    const tentativasDe = (f: string) => new Set(fora.filter((x) => x.arquivo === f).map((x) => x.t.n)).size
+    const persistentes = acoplados.filter((x) => tentativasDe(x.arquivo) >= 2)
+    const a = (persistentes.length ? persistentes : acoplados).at(-1)!
     const provas = acoplados.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
-    return sai('R1', 'D6', provas, `pôr ${a.arquivo} na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em ${local(vermelhoRefs(a.t, a.arquivo), a.arquivo)}`)
+    const onde = local(vermelhoRefs(a.t, a.arquivo), a.arquivo)
+    if (persistentes.length) {
+      return sai('R1', 'D6', provas, `pôr ${a.arquivo} na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em ${onde}`)
+    }
+    return sai('R1?', 'D6', provas, `conferir ${a.arquivo}: vermelho fora da allowlist numa tentativa só (${onde}); se for acoplado, pôr na allowlist com guarda`)
   }
   const refsFora = fora.flatMap((x) => vermelhoRefs(x.t, x.arquivo))
   // D7 · vermelho fora, não acoplado (ou acoplamento sem fonte): base ou acoplamento indireto
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index b8f8144..9d3575c 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -14,7 +14,7 @@
  * Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json`, chaves opcionais
  * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `entrada_max_tokens`,
  * `timeout_secs`). `modelo: null` desliga o modelo. `ORQ_TRIADOR_TETO_DIA`
- * sobrepõe o teto do dia (a corrida da peça 6 usa US$ 6,30).
+ * sobrepõe o teto do dia (a corrida da peça 6 usa US$ 6,60).
  */
 import { spawnSync } from 'node:child_process'
 import { readFileSync } from 'node:fs'
diff --git a/test/fixtures/triador-7f/montar.py b/test/fixtures/triador-7f/montar.py
index c6eed43..e3e8f7c 100644
--- a/test/fixtures/triador-7f/montar.py
+++ b/test/fixtures/triador-7f/montar.py
@@ -12,7 +12,10 @@ De onde sai cada caso (spec 7f-a §7.1):
     102-138; classe da §5), com a linha `BLOQUEADO` do local-loop.log (`L`);
   - 20 tickets `done` do período, de controle (§7.3): os 10 com vermelho de
     vitest numa tentativa intermediária, resolvido no retry, e 10 com critério
-    vermelho intermediário. Nenhum deles pode sair firme.
+    vermelho intermediário. Nenhum deles pode sair firme;
+  - 5 de série cortada (`cortados/`, 7f-b1-7): controles cortados na última
+    tentativa que reprovou. Saem de `controle/`, sem o comarka
+    (`--so-cortados` refaz só eles). Nenhum deles pode sair firme.
 
 O que vai para cada caso é SÓ o que o triador lê, já recortado:
   caso.json, ticket.json, meta.json, config.json, log.txt, serie.json,
@@ -83,6 +86,10 @@ CASOS = [
 # critério intermediário, por ordem de id.
 CONTROLE = ["633", "671d", "624", "694", "627e", "656", "808", "706", "367", "891",
             "907", "707a", "868", "860", "650", "712", "662b", "735", "648", "744"]
+# Os 5 de série cortada (7f-b1-7): controles cortados na última tentativa que
+# reprovou, como se o motor tivesse bloqueado ali. Com a D6 da spec, os 5 saíam
+# R1 firme, e errado: o próprio agente resolveu o vermelho no retry.
+CORTADOS = ["671d", "624", "627e", "808", "367"]
 
 # --- O recorte: o MESMO algoritmo de triador/recorte.ts -----------------------
 ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
@@ -549,6 +556,61 @@ def monta_controle(cm, saida, nn, tid):
     return destino
 
 
+def monta_cortado(saida, nn, tid):
+    """Um controle já montado, cortado na última tentativa que reprovou. Só lê
+    `controle/`: não precisa do comarka. Os vizinhos ficam os do controle que
+    caem nas ±6 h do novo fim (o controle só guardou os das ±6 h do fim dele)."""
+    origem = next(d for d in sorted(glob.glob(os.path.join(saida, "controle", "[0-9][0-9]-*")))
+                  if os.path.basename(d).split("-")[1] == tid)
+    ler = lambda f: open(os.path.join(origem, f), encoding="utf-8").read()
+    caso = json.loads(ler("caso.json"))
+    meta = json.loads(ler("meta.json"))
+    final = meta[-caso["tentativas"]:]
+    k = max(m["attempt"] for m in final if m["resultado"] != "done")
+    i_k = meta.index(next(m for m in final if m["attempt"] == k))
+    fim = ts_de(meta[i_k]["ts"])
+    cab = re.compile(rf"=== ticket {re.escape(tid)} \(.*\) — tentativa {k + 1} ")
+    log = ler("log.txt").splitlines(keepends=True)
+    corte = next(i for i, l in enumerate(log) if cab.search(l))
+    log = log[:corte]
+    L = int(log[-1].split("\t")[0])
+    destino = os.path.join(saida, "cortados", f"{nn:02d}-{tid}-L{L}")
+    os.makedirs(destino, exist_ok=True)
+    for f in ("ticket.json", "config.json"):
+        escreve(os.path.join(destino, f), ler(f))
+    escreve(os.path.join(destino, "log.txt"), "".join(log))
+    json_escreve(os.path.join(destino, "meta.json"), meta[:i_k + 1])
+    serie = json.loads(ler("serie.json"))[:k]
+    json_escreve(os.path.join(destino, "serie.json"), serie)
+    heads = set()
+    for s in serie:
+        a = f"attempt-{s['k']}"
+        subprocess.run(["cp", "-R", os.path.join(origem, a), os.path.join(destino, a)], check=True)
+        h = os.path.join(origem, a, "head.txt")
+        if os.path.exists(h):
+            heads.add(open(h).read().strip())
+    for h in sorted(heads):
+        if os.path.isdir(os.path.join(origem, "fontes", h)):
+            os.makedirs(os.path.join(destino, "fontes"), exist_ok=True)
+            subprocess.run(["cp", "-R", os.path.join(origem, "fontes", h), os.path.join(destino, "fontes", h)], check=True)
+    cab_v, *linhas = ler("vizinhos.tsv").splitlines()
+    viz = [cab_v]
+    for l in linhas:
+        c = l.split("\t")
+        m = ts_de(c[4])
+        if abs(m - fim) <= 6 * 3600:
+            viz.append("\t".join(c[:5] + ["1" if m <= fim + 180 else "0"]))
+    escreve(os.path.join(destino, "vizinhos.tsv"), "\n".join(viz) + "\n")
+    json_escreve(os.path.join(destino, "caso.json"), {
+        **caso, "linha_bloqueio": None, "linha_fim": L, "fim": iso(fim), "tentativas": k,
+        "cortado_de": f"controle/{os.path.basename(origem)}", "cortado_em": k})
+    json_escreve(os.path.join(destino, "esperado.json"), {
+        "classe": None, "cortado": True, "firme_proibido": True,
+        "fonte_da_verdade": f"controle/{os.path.basename(origem)} cortado na tentativa {k}, a última que reprovou "
+                            "(o agente resolveu o vermelho no retry: R1 firme seria errado)"})
+    return destino
+
+
 INTEIROS = [("627j", "docs/fila/runs/627j/attempt-3/gate-vitest.txt"),
             ("627b", "docs/fila/runs/627b/attempt-1.prev1/gate-vitest.txt"),
             ("600", "docs/fila/runs/600/attempt-3/gate-vitest.txt")]
@@ -558,7 +620,13 @@ def main():
     ap = argparse.ArgumentParser()
     ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
     ap.add_argument("--saida", default=AQUI)
+    ap.add_argument("--so-cortados", action="store_true", help="refaz só cortados/, a partir de controle/ (sem o comarka)")
     a = ap.parse_args()
+    subprocess.run(["rm", "-rf", os.path.join(a.saida, "cortados")], check=True)
+    if a.so_cortados:
+        for nn, tid in enumerate(CORTADOS, 1):
+            monta_cortado(a.saida, nn, tid)
+        return
     cm = Comarka(os.path.abspath(a.comarka))
     for d in (glob.glob(os.path.join(a.saida, "[0-9][0-9]-*")) + glob.glob(os.path.join(a.saida, "controle", "[0-9][0-9]-*"))
               + [os.path.join(a.saida, "vitest-inteiros")]):
@@ -569,6 +637,9 @@ def main():
     for nn, tid in enumerate(CONTROLE, 1):
         print("controle", nn, tid, file=sys.stderr)
         monta_controle(cm, a.saida, nn, tid)
+    for nn, tid in enumerate(CORTADOS, 1):
+        print("cortado", nn, tid, file=sys.stderr)
+        monta_cortado(a.saida, nn, tid)
     # Três gate-vitest INTEIROS (sem recorte, só com a máscara), para o teste da
     # peça 2 provar que o recorte guarda todo FAIL e todo ❯.
     for tid, rel in INTEIROS:
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index e25da5c..5c495cc 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -1,19 +1,25 @@
 /**
  * Etapa 7f · aceite do triador de bloqueios (spec 7f-a §7.2), sobre a fixture
- * dos 37 bloqueios da medição de 09/10 e dos 20 de controle.
+ * dos 37 bloqueios da medição de 09/10, dos 20 de controle e dos 5 de série
+ * cortada.
  *
  *   (A) só extração: os 7 R5 e R6 saem com classe firme certa e ao menos uma
  *       evidência igual a uma do esperado.json (mesmo arquivo; linha a ±3 no
  *       original), com `vizinhos.tsv` inteiro (o estado depois da passada G3).
  *       Com só os vizinhos de antes do bloqueio, 760 e 898 #31 saem `R5?`, não
  *       firmes. O teste fixa os dois instantes.
- *   (B) zero firme errado nos 37, e os 16 firmes certos são os da spec §3.3.
+ *   (B) zero firme errado nos 37, e os firmes certos são os 16 da spec §3.3
+ *       menos o 346d: com a restrição da D6 (7f-b1-7, decisão do chat do
+ *       programa), R1 só é firme com o mesmo vermelho fora da allowlist em ≥ 2
+ *       tentativas; o 346d tem uma só e vira `R1?`. Ficam 15.
  *   (controle) nenhum dos 20 sai firme.
+ *   (cortados) nenhum dos 5 de série cortada sai firme: com a D6 da spec os 5
+ *       saíam R1 firme, e errado (o agente resolveu o vermelho no retry).
  *   (C) extração + modelo, por replay de `resposta-modelo.json`: peça 6, que
  *       não é da 7f-b1 (a sessão não chama modelo).
  *
  * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
- * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 16 firmes), não
+ * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
  * de import quebrado.
  */
 import { existsSync, readdirSync, readFileSync } from 'node:fs'
@@ -84,9 +90,9 @@ function evidenciaCasa(dada: Ref[], esp: Ref[]): boolean {
   )
 }
 
-// Spec §3.3: os 16 firmes e certos.
+// Spec §3.3: os 16 firmes e certos, menos o 346d (D6 com ≥ 2 tentativas, 7f-b1-7).
 const FIRMES_DA_SPEC = [
-  '07-627j-L57368', '11-689-L65280', '13-346d-L66187', '15-722-L67970', '17-715-L68793',
+  '07-627j-L57368', '11-689-L65280', '15-722-L67970', '17-715-L68793',
   '22-762-L72665', '23-856-L73817', '26-711b3-L78647', '35-950-L85145',
   '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272',
   '16-723-L68736',
@@ -110,15 +116,16 @@ describe('aceite do triador (spec 7f-a §7.2)', () => {
       expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.firme }).toEqual({ nome, classe: 'R5?', firme: false })
     }
     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
-    expect(firmes).toHaveLength(14)
+    expect(firmes).toHaveLength(13)
   })
 
-  it('(B) zero firme errado nos 37, e os firmes certos são os 16 da spec', async () => {
+  it('(B) zero firme errado nos 37, e os firmes certos são os 15 (16 da spec menos o 346d)', async () => {
     const r = await triarTodos('', 'passada')
     const firmes = [...r].filter(([, x]) => x.firme)
     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n).classe).map(([n, x]) => `${n}=${x.classe}`)
     expect(errados).toEqual([])
     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
+    expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13-346d-L66187')?.firme }).toEqual({ classe: 'R1?', firme: false })
   })
 
   it('(controle) nenhum dos 20 done sai firme, nos dois instantes', async () => {
@@ -129,5 +136,13 @@ describe('aceite do triador (spec 7f-a §7.2)', () => {
     }
   })
 
+  it('(cortados) nenhum dos 5 de série cortada sai firme, nos dois instantes (D6 pede o vermelho em ≥ 2 tentativas)', async () => {
+    for (const instante of ['bloqueio', 'passada'] as const) {
+      const r = await triarTodos('cortados', instante)
+      expect(r.size).toBe(5)
+      expect([...r].filter(([, x]) => x.firme).map(([n, x]) => `${n}=${x.classe}`)).toEqual([])
+    }
+  })
+
   it.todo('(C) extração + modelo ≥ 30/37 por replay de resposta-modelo.json (peça 6, fora da 7f-b1)')
 })
diff --git a/test/orquestrador-triador-fixture.test.ts b/test/orquestrador-triador-fixture.test.ts
index 261dadb..557d26a 100644
--- a/test/orquestrador-triador-fixture.test.ts
+++ b/test/orquestrador-triador-fixture.test.ts
@@ -19,6 +19,8 @@ const CASO_RE = /^\d\d-[0-9a-z]+-L\d+$/
 const casos = () => (existsSync(FX) ? readdirSync(FX).filter((d) => CASO_RE.test(d)).sort() : [])
 const controles = () =>
   existsSync(join(FX, 'controle')) ? readdirSync(join(FX, 'controle')).filter((d) => CASO_RE.test(d)).sort() : []
+const cortados = () =>
+  existsSync(join(FX, 'cortados')) ? readdirSync(join(FX, 'cortados')).filter((d) => CASO_RE.test(d)).sort() : []
 const json = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T
 
 interface Esperado {
@@ -27,6 +29,7 @@ interface Esperado {
   requeue?: string
   fonte_da_verdade: string
   controle?: boolean
+  cortado?: boolean
   firme_proibido?: boolean
 }
 interface Caso {
@@ -46,7 +49,11 @@ function bytesDe(dir: string): number {
 }
 
 function todosOsDiretorios(): string[] {
-  return [...casos().map((c) => join(FX, c)), ...controles().map((c) => join(FX, 'controle', c))]
+  return [
+    ...casos().map((c) => join(FX, c)),
+    ...controles().map((c) => join(FX, 'controle', c)),
+    ...cortados().map((c) => join(FX, 'cortados', c)),
+  ]
 }
 
 function faixasContam(faixas: [number, number][]): number {
@@ -143,6 +150,22 @@ describe('fixture triador-7f (peça 1)', () => {
     }
   })
 
+  it('série cortada (7f-b1-7): 671d, 624, 627e, 808 e 367, cada um o controle cortado na última tentativa que reprovou', () => {
+    expect(cortados().map((c) => c.split('-')[1])).toEqual(['671d', '624', '627e', '808', '367'])
+    for (const c of cortados()) {
+      const d = join(FX, 'cortados', c)
+      const e = json<Esperado>(join(d, 'esperado.json'))
+      expect(e).toMatchObject({ classe: null, cortado: true, firme_proibido: true })
+      const caso = json<Caso & { cortado_de: string; cortado_em: number }>(join(d, 'caso.json'))
+      const meta = json<{ attempt: number; resultado: string }[]>(join(d, 'meta.json'))
+      expect(meta.at(-1), c).toMatchObject({ attempt: caso.cortado_em, resultado: 'reprovado' })
+      expect(caso.tentativas, c).toBe(caso.cortado_em)
+      const orig = json<{ attempt: number; resultado: string }[]>(join(FX, caso.cortado_de, 'meta.json'))
+      expect(orig.at(-1)!.resultado, c).toBe('done')
+      expect(orig.at(-1)!.attempt, c).toBeGreaterThan(caso.cortado_em)
+    }
+  })
+
   it('cabe em 3 MB e não carrega segredo sem máscara', () => {
     expect(bytesDe(FX)).toBeLessThan(3 * 1024 * 1024)
     const segredo = /\bsk-[A-Za-z0-9_-]{16,}|\beyJ[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{8,}|\bSUPABASE_[A-Z_]*=[^\s"'‹]{8,}/
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
index 94c5bf7..ee926e4 100644
--- a/test/orquestrador-triador-modelo.test.ts
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -213,25 +213,25 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(orq('comarka-fx', '559', '--passada', '--x').status).toBe(1)
   })
 
-  it('orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,30, 10 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
+  it('orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
     envelope(JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' }), 0.3)
     const antes = spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout
     const orq = (teto: string, ...a: string[]) =>
       spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fixture', FX, ...a], { encoding: 'utf8', env: { ...process.env, ORQ_TRIADOR_TETO_DIA: teto } })
-    const r = orq('6.30')
+    const r = orq('6.60')
     expect(r.status, r.stderr).toBe(0)
-    expect(chamadas()).toHaveLength(21)
-    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 21; custo desta corrida: US\$ 6\.3000/)
+    expect(chamadas()).toHaveLength(22)
+    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 22; custo desta corrida: US\$ 6\.6000/)
     const dir = join(base, 'diag', 'fixture-triador-7f')
-    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(21)
-    expect(orq('6.30').stdout).toMatch(/chamadas novas: 0;/)
-    expect(chamadas()).toHaveLength(21)
+    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(22)
+    expect(orq('6.60').stdout).toMatch(/chamadas novas: 0;/)
+    expect(chamadas()).toHaveLength(22)
     expect(spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout).toBe(antes)
-    // num dia novo de ledger, com o teto padrão de US$ 3,00: 10 chamadas e 11 puladas
+    // num dia novo de ledger, com o teto padrão de US$ 3,00: 10 chamadas e 12 puladas
     writeFileSync(join(base, 'diag', 'custo.json'), '{"dias":{}}')
     const r3 = orq('3', '--forcar')
     expect(r3.stdout).toMatch(/chamadas novas: 10;/)
-    expect(chamadas()).toHaveLength(31)
+    expect(chamadas()).toHaveLength(32)
   })
 
   it('orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)', async () => {
```

### cbda4ed
```diff
commit cbda4edb41a1c5eccbed6008b2a0cf9920ed2d98
Author: Lucas Santos <alfalucas137@gmail.com>
Date:   Sat Oct 10 20:15:27 2026 -0300

    7f-b1-8: CONTRATO (§13.3 e §13.6), CHANGELOG e PECAS com o sha da 7f-b1-7
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/CHANGELOG.md b/CHANGELOG.md
index 2bf6fa3..ecdcb19 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -884,7 +884,18 @@ merge). CONTRATO §9.1 e §13.
   do dia com `pulado`, parser, evidência descartada, ledger) e `orq triar`, despachado
   antes do `lib.sh`, com `--passada`, `--forcar`, `--sem-modelo` e `--fixture` (a corrida da
   peça 6).
-- **7f-b1-6**: este registro, `docs/PECAS.md` e CONTRATO §9.1 e §13.
-
-Nenhuma asserção existente mudou. O teste da peça 2 cedeu o `materializar` para
+- **7f-b1-6** `48d682d`: este registro, `docs/PECAS.md` e CONTRATO §9.1 e §13.
+- **7f-b1-7** `20f41b8`: a D6 só dá R1 firme com o mesmo teste vermelho fora da allowlist
+  em ≥ 2 tentativas da série; com uma só, `R1?` (decisão do chat do programa). A fixture
+  ganha `cortados/`: 671d, 624, 627e, 808 e 367, os controles cortados na última tentativa
+  que reprovou, que com a D6 da spec saíam R1 firme e errado. Placar: 15 firmes certos
+  (o 346d vira `R1?`), 0 firme errado, nenhum firme no controle nem nos cortados; 13
+  firmes no instante do bloqueio. A corrida da peça 6 passa a 22 palpites, teto US$ 6,60.
+  Vermelho antes por asserção (4 falhas).
+- **7f-b1-8**: CONTRATO §13.3 e §13.6, este registro e `docs/PECAS.md` com o sha da 7f-b1-7.
+
+Até a 7f-b1-6, nenhuma asserção existente mudou. Na 7f-b1-7, por decisão do chat do
+programa, três mudaram de número (sem mudar de força): firmes certos 16 → 15 e 14 → 13
+no instante do bloqueio, e a corrida da peça 6 de 21 chamadas a US$ 6,30 para 22 a
+US$ 6,60. O teste da peça 2 cedeu o `materializar` para
 `test/triador-repo-legado.ts`, sem mudar asserção.
diff --git a/CONTRATO.md b/CONTRATO.md
index 1abe1fb..d4934e1 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1058,21 +1058,28 @@ sem modelo; palpite (`?`) ou sem regra vai ao modelo, se houver orçamento.
 | D3 | diff-cap e diff.stat > cap | R3? | `:197` |
 | D4 | `Timeout waiting for worker`/`Timeout starting`/EMFILE/ENOSPC na última tentativa | R5 máquina | `:207` |
 | D5 | o motor do kit já decidiu `base_vermelha`; ou o vermelho fora da allowlist e do diff aparece em outra família nas ±6 h | R5 base | `:214` |
-| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff | R1 | `:229` |
-| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:236` |
-| D8 | enforcement | R1? | `:240` |
-| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:245` |
-| D10 | vitest, vermelho dentro | R2? | `:245` |
-| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:251` |
-| D12 | critério | R2? | `:251` |
+| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff; firme só com o mesmo teste vermelho fora em ≥ 2 tentativas da série, senão `R1?` (7f-b1-7) | R1 / R1? | `:229` |
+| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:245` |
+| D8 | enforcement | R1? | `:249` |
+| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:254` |
+| D10 | vitest, vermelho dentro | R2? | `:254` |
+| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:260` |
+| D12 | critério | R2? | `:260` |
 
 Allowlist pelo `matchesAllowlist` do enforcement (`enforcement-core.ts:178`); local do
 vermelho pelo `primeiroLocal` (`diagnostico.ts:109`). A prova de um vermelho é a linha
 `FAIL`, o erro logo abaixo e o local `❯`. O que o agente disse nunca entra em regra.
 
-Placar na fixture dos 37 (estado da passada): 16 firmes certos, 0 firme errado, 13
-palpites certos, 7 errados, 1 sem regra; no instante do bloqueio, 14 firmes (760 e 898 #31
-ficam `R5?` até o vizinho aparecer). Nenhum dos 20 de controle sai firme.
+Placar na fixture dos 37 (estado da passada): 15 firmes certos, 0 firme errado, 14
+palpites certos, 7 errados, 1 sem regra; no instante do bloqueio, 13 firmes (760 e 898 #31
+ficam `R5?` até o vizinho aparecer). Nenhum dos 20 de controle e nenhum dos 5 de série
+cortada sai firme.
+
+A restrição da D6 (7f-b1-7, decisão do chat do programa) existe porque um vermelho fora da
+allowlist numa tentativa só pode ser mérito que o próprio agente resolve no retry: os 5
+controles cortados na última tentativa que reprovou (671d, 624, 627e, 808, 367) saíam R1
+firme, e errado. O preço é o 346d, R1 de verdade com o vermelho numa tentativa só (na T2 o
+mesmo teste aparece como violação de enforcement): vira `R1?` e vai ao modelo.
 
 ### 13.4 Saída (`saida.ts`)
 
@@ -1132,10 +1139,11 @@ Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.e
 
 ### 13.6 Fixture e testes
 
-`test/fixtures/triador-7f/`: os 37 bloqueios da medição de 09/10 e 20 done de controle,
-montados por `montar.py` (só leitura do comarka-operacional, git com
-`GIT_OPTIONAL_LOCKS=0`), cada um com `esperado.json` (classe e evidência da medição, com a
-linha da tabela). `orq triar --fixture <dir>` (`corrida.ts:46`) roda o triador sobre os 37
+`test/fixtures/triador-7f/`: os 37 bloqueios da medição de 09/10, 20 done de controle e,
+em `cortados/`, 5 controles cortados na última tentativa que reprovou, montados por
+`montar.py` (só leitura do comarka-operacional, git com `GIT_OPTIONAL_LOCKS=0`; os
+cortados saem de `controle/`, `--so-cortados`), cada um com `esperado.json` (classe e
+evidência da medição, com a linha da tabela; nos de controle e cortados, `firme_proibido`). `orq triar --fixture <dir>` (`corrida.ts:46`) roda o triador sobre os 37
 e imprime o placar (C) da spec §7.2; é a corrida da peça 6.
 
 Testes: `orquestrador-triador-{fixture,leitores,extrair,aceite,saida,modelo}.test.ts`. O
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 899fba8..e385cd4 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -943,19 +943,21 @@
   classe R1-R7, a prova `arquivo:linha` e o remédio, gravados em `~/.orq/diagnosticos` e
   nunca no repo; extração determinística D1-D12 primeiro, modelo (Opus 5.5, US$ 3,00/dia)
   só para palpite, em stub nesta etapa. Commits `0ebe0f6` (fixture), `81574fc` (leitores),
-  `541f9d1` (regras), `6ce01fd` (saída), `9ed29f0` (modelo e `orq triar`).
+  `541f9d1` (regras), `6ce01fd` (saída), `9ed29f0` (modelo e `orq triar`), `20f41b8`
+  (D6 firme só com o vermelho em ≥ 2 tentativas; 5 casos de série cortada).
   *Evidência:* `~/orq-sessoes/spec-7f-triador.md` e `~/orq-sessoes/medicao-bloqueios-out.md`
   §3 e §5; `~/orq-sessoes/relatorio-kit-etapa7f-b1.md`.
-  *Teste:* `orquestrador-triador-aceite.test.ts` ((A) e (B): 16 firmes certos, 0 errado;
-  controle sem firme), `-fixture`, `-leitores`, `-extrair`, `-saida` (repo git intocado,
+  *Teste:* `orquestrador-triador-aceite.test.ts` ((A) e (B): 15 firmes certos, 0 errado;
+  controle e série cortada sem firme), `-fixture`, `-leitores`, `-extrair`, `-saida` (repo git intocado,
   `GIT_OPTIONAL_LOCKS=0`), `-modelo` (stub; `claude` do PATH é trava).
 
 ## PENDENTES
 
 - **7f peça 6 · corrida real e replay.** `orq triar --fixture test/fixtures/triador-7f` com o
-  modelo de verdade, teto US$ 6,30, nos 21 casos de palpite; as `resposta-modelo.json` entram
+  modelo de verdade, teto US$ 6,60, nos 22 casos de palpite; as `resposta-modelo.json` entram
   na fixture e o aceite (C) vira replay (≥ 30/37).
-  *Evidência:* spec 7f-a §7.2 e §8; o comando e o que conferir estão no relatório da 7f-b1.
+  *Evidência:* spec 7f-a §7.2 e §8; o comando em `~/orq-sessoes/corrida-7f-peca6.cmd` e o
+  que conferir em `~/orq-sessoes/corrida-7f-peca6-conferir.md`.
   *Teste:* aceite (C) por replay, sem chamada no CI.
 
 - **7f-b2 · gatilho e painel.** A peça 7 da spec redefinida (o painel nunca dispara gasto:
```
