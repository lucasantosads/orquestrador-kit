# Sessão de fila · CI · lote 14 · destravar 231, 242 e 235

Data: 21/09/2026. Worktree: `/Users/lucasantos/Projetos/_worktrees/ci-fila-14` (branch `fila/lote-14`, base `2039b59`).
Escrita só nos blocos JSON e no parágrafo final "Revisão 21/09" de três tickets. Sem commit, sem push, sem escrita no checkout principal.

## Resumo

| Ticket | Causa real do bloqueio | Status | Mudança |
|---|---|---|---|
| 235 | Ambiente: suíte da raiz vermelha em 08/09 à noite, alheia ao ticket | bloqueado → pendente | nenhuma na spec, só status e nota |
| 231 | Colisão real com `personas-form-preserva.test.tsx`, fora da allowlist | bloqueado → pendente | teste na allowlist, objetivo (9), 10 critérios e 1 avaliador novos |
| 242 | Critério insatisfazível por construção: lia um arquivo que não existe | bloqueado → pendente | critério de controle reescrito sobre os três arquivos reais, objetivo (7) corrigido |

## Leitura (Passo 0)

1. Li inteiros `docs/fila/231-*.md`, `235-*.md`, `242-*.md` (prosa e bloco JSON) e os campos de máquina de 232, 236, 243 e 244.
2. Li a trilha em `~/Projetos/conteudos-infinitos/docs/fila/runs/events.log` e, para cada ticket, `meta.json`, `veredito.json`, `gates.txt` e `criterios.txt` de `attempt-2`, a última tentativa.
3. Li `apps/web/test/personas-form-preserva.test.tsx` inteiro. As linhas que colidem hoje são 75, 80 e 81, não 74, 77 e 78 como dizia a nota de 07/09.
4. Para o 235, comparei o `gates.txt` das três tentativas com os runs posteriores e com o histórico git do teste que falhou.
5. Li `docs/orquestrador/PLAYBOOK.md` nas regras de critério: linhas 38 a 43 (guardar existência, `espera` exata, colisão de teste do 201), 72 (critério de ausência), 90, 125 e 178 a 181 (gate de ticket e isenção de `test $(` só no segmento 1).

### Causa por ticket, com evidência

**235: ambiente, não mérito.**
- `events.log`: `2026-09-08T19:53:07-0300 235 GATE typecheck=ok testes=falha enforcement=ok criterios=25/25 build=nao-rodou`, e igual às 19:55 e 19:58.
- `runs/235/attempt-2/gates.txt:4`: `FALHA testes_por_pacote 27180ms [1 pacotes, 694p/7f]`, com as 7 falhas todas em `test/orquestrador-notificacao.test.ts` (linhas 73, 80, 96, 120, 128, 135 e 141 daquele teste), por exemplo `expected 'arquivo' to be 'notificacao_nativa'`.
- `runs/235/attempt-2/diff.patch`: toca só `funil.ts`, `sugestoes-types.ts`, `sugestoes.ts` e `sugestoes.test.ts`. Nada perto do teste que falhou.
- `runs/235/attempt-2/criterios.txt`: 25 de 25 critérios passaram, inclusive "a suite da web continua verde" (`saida: 1`).
- A data: o briefing fala em suíte vermelha de 09/09. As três tentativas são de **08/09**, entre 19:53 e 19:58 (mtime do `gates.txt` e `meta.json`, `ts` 22:53Z a 22:58Z). O conserto é de 09/09: `f0b2abf 2026-09-09 11:18:51 -0300 teste de repo: notificacao alinhada ao canal arquivo (decisao 8)`. É o mesmo episódio: a suíte ficou vermelha na noite de 08/09 e foi consertada na manhã de 09/09.
- Depois do conserto, todo run fecha verde: `261/attempt-0/gates.txt` (09/09 16:00) `[9 pacotes, 1620p/0f]`, e 262 a 266 também com `0f`. O único ticket que caiu nesse teste foi o 235.

**231: colisão real, a que foi anotada em 07/09.**
- `events.log`: 3 tentativas, todas `GATE typecheck=ok testes=falha enforcement=ok criterios=19/20`.
- `runs/231/attempt-2/veredito.json`: `critério(s) reprovado(s): a suite da web continua verde; gates reprovados`.
- `runs/231/attempt-2/gates.txt`: `test/personas-form-preserva.test.tsx (6 tests | 1 failed)`, `AssertionError: expected 'A+' to be 'alta renda'` em `personas-form-preserva.test.tsx:75:81`. O `it` para na primeira asserção que falha. As linhas 80 (`Tom de voz` lido como input) e 81 (`Chamada para ação (CTA)`) cairiam logo em seguida, com o formulário novo.
- O arquivo estava fora da allowlist, então o agente não tinha saída. É a classe do 201 (PLAYBOOK.md:42).

**242: critério insatisfazível por construção, mas não pelo motivo que o briefing supunha.**
- `events.log`: 3 tentativas, todas `GATE typecheck=ok testes=ok enforcement=ok criterios=17/18 build=ok`.
- `runs/242/attempt-2/veredito.json`: `critério(s) reprovado(s): os testes dos tickets 240 e 241 nao foram editados e nao perderam caso`.
- `runs/242/attempt-2/criterios.txt`: nesse critério, `saida: grep: apps/web/test/aprovacoes-link.test.ts: No such file or directory`.
- O ticket **não** exige mexer nos testes do 240 e do 241. Ele proíbe, e o diff das três tentativas não os toca (`aprovacoes-publico.ts`, `aprovacoes-types.ts`, `aprovacoes-publico.test.ts`). O problema é que `aprovacoes-link.test.ts` nunca existiu: o 241 foi marcado OBSOLETO em 07/09 e dividido em 241a e 241b, que criaram `aprovacoes-link-gerar.test.ts` e `aprovacoes-link-revogar.test.ts` (commits `393768e` e `a87a207`).

## Decisão fora da letra do briefing: 242 volta a pendente

O briefing separa dois casos: (a) o ticket exige mexer nos testes, então o critério é insatisfazível e o ticket volta a pendente; (b) não exige, então o bloqueio foi mérito e o status fica. O 242 não cabe em nenhum dos dois. O ticket não exige mexer nos testes, mas o bloqueio também não foi mérito: nenhuma implementação passaria num `grep` sobre arquivo ausente. Todo o resto passou nas três tentativas, inclusive gates e build. Tratei como o caso (a), que é o que o briefing chama de "insatisfazível por construção", e voltei o status a pendente. Se a intenção era manter bloqueado, basta reverter a linha de `status` em `docs/fila/242-*.md`: o critério reescrito vale do mesmo jeito.

## O que mudou e por quê

### 235
- `status`: `bloqueado` → `pendente`.
- `notas_status`: nova linha com a evidência acima, e a nota anterior preservada depois de `| antes:`.
- Contagem de tentativa: **não há campo de contagem no bloco JSON**. Os campos `hash_candidato`, `sinal_hash` e `gate_ok` estão vazios. A contagem vive em disco (`runs/235/attempt-N`, `meta.json`, `.sem-progresso` no `local-loop.sh:136`), e o motor recomeça o retry por rodada (PLAYBOOK, peça 0b). `runs/235/` não tem `.sem-progresso`. Nada foi zerado porque não há o que zerar no escopo permitido.
- Critérios: nenhum mudou. A spec já estava certa.

### 231
- `pathspec_allowlist`: + `apps/web/test/personas-form-preserva.test.tsx` (7 caminhos, abaixo do teto de 8).
- `objetivo`: novo item (9). Atualizar o teste do 228 **só** nas três asserções (75, 80, 81) e nos valores de `faixa_renda` e `tom_de_voz` do fixture, que precisam vir do vocabulário. Afirmar a faixa enviada como caixa marcada e o tom como select. Retirar a leitura do CTA. Manter tudo o mais, inclusive a linha 73 (`#nicho_juridico` = 'Trabalhista'). O formulário, com estado de erro no modo criação, repovoa faixa, tom e o nicho livre com "Outros" escolhido.
- Critérios novos (10) e 1 avaliador:
  - alvo: o teste do 228 passa (`vitest ... | grep -cE 'Tests +[0-9]+ passed'` = 1, mesma forma dos critérios que já existem no ticket);
  - alvo: faixa e tom não são mais lidos como `HTMLInputElement` (base 2 → 0);
  - alvo: o CTA não é mais lido por `getByLabelText` (base 1 → 0);
  - alvo: há asserção `.checked` (base 0 → pelo menos 1);
  - alvo: `HTMLSelectElement` aparece pelo menos 2 vezes (base 1, que é "Tem faculdade?" → pelo menos 2);
  - guarda: `it(` pelo menos 6, `expect(` pelo menos 31, os outros cinco casos presentes pelo nome (= 5), `#nicho_juridico` continua afirmado (pelo menos 1), nenhum `.skip/.only/.todo`;
  - avaliador: o diff do teste do 228 só troca faixa, tom e CTA, sem asserção mais fraca.
- A guarda que já existia, "os dois testes de controle positivo não foram editados" (`personas-form.test.tsx` e `personas-edicao.test.ts`), continua igual.
- O que o antigo provava continua provado: a suíte da web verde segue como critério, e agora o teste do 228 também é provado verde e sem perda.
- Limite conhecido, escrito no objetivo: o eco de erro carrega só a **primeira** faixa (`campoCru` em `apps/web/src/server/personas.ts:24-27` usa `formData.get`, e `ValoresPersona` em `personas-types.ts:25-38` tem `faixa_renda: string`). Os dois arquivos estão fora da allowlist. Repovoar a lista inteira de faixas depois de um erro é trabalho de outro ticket. Vale abrir um ticket para isso, porque hoje quem marca duas faixas e erra outro campo perde a segunda.

### 242
- `objetivo` (7): troca `aprovacoes-link.test.ts` pelos dois arquivos reais, e 240 e 241 por 240, 241a e 241b.
- Critério "os testes dos tickets 240 e 241 não foram editados e não perderam caso" (1/2 e 2/2) → quatro partes:
  - (1/4) `aprovacoes-pacote.test.ts` com `it(` pelo menos 8 (o antigo pedia pelo menos 7);
  - (2/4) `aprovacoes-link-gerar.test.ts` com pelo menos 10;
  - (3/4) `aprovacoes-link-revogar.test.ts` com pelo menos 8;
  - (4/4) nenhum dos três aparece em `git diff --name-only $BASE_REF...HEAD` (= 0).
- O antigo provava só as contagens, e uma delas sobre arquivo ausente. O novo prova contagens iguais às de hoje sobre os arquivos que existem, e prova de fato o "não foram editados" que a descrição prometia e o comando não cobria.
- `status`: `bloqueado` → `pendente` (ver a decisão acima).

## Números usados nos critérios: comandos rodados agora neste worktree

```
$ grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx
6
$ grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx
31
$ grep -cE "it\('(modo criação \+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \(real\))" apps/web/test/personas-form-preserva.test.tsx
5
$ grep -c 'Chamada para ação (CTA)' apps/web/test/personas-form-preserva.test.tsx
1
$ grep -cE "getByLabelText\('(Faixa de renda|Tom de voz)'\) as HTMLInputElement" apps/web/test/personas-form-preserva.test.tsx
2
$ grep -cE 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx
1
$ grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx
0
$ grep -cE '[.](skip|only|todo)\(' apps/web/test/personas-form-preserva.test.tsx
0
$ grep -c "querySelector('#nicho_juridico')" apps/web/test/personas-form-preserva.test.tsx
1
$ grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l
       5
$ grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts
8
$ grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts
10
$ grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts
8
$ ls apps/web/test/aprovacoes-link.test.ts
ls: apps/web/test/aprovacoes-link.test.ts: No such file or directory
```

### Cada critério novo rodado contra a árvore de hoje (alvo deve sair vermelho, guarda verde)

Extraí os `cmd` do JSON com separador `\x1f`, como o executor faz, e rodei com `BASE_REF=HEAD`:

```
231 alvo   espera=0 saida=2  -> NAO_PASSA
    $ grep -cE "getByLabelText\('(Faixa de renda|Tom de voz)'\) as HTMLInputElement" apps/web/test/personas-form-preserva.test.tsx
231 alvo   espera=0 saida=1  -> NAO_PASSA
    $ grep -c "getByLabelText('Chamada para ação (CTA)')" apps/web/test/personas-form-preserva.test.tsx
231 alvo   espera=ok saida=  -> NAO_PASSA
    $ test $(grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
231 alvo   espera=ok saida=  -> NAO_PASSA
    $ test $(grep -c 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx) -ge 2 && echo ok
231 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx) -ge 6 && echo ok
231 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx) -ge 31 && echo ok
231 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -cE "it\('(modo criação \+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \(real\))" apps/web/test/personas-form-preserva.test.tsx) -eq 5 && echo ok
231 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c "querySelector('#nicho_juridico')" apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
231 guarda espera=0 saida=0  -> PASSA
    $ cd apps/web && grep -cE '[.](skip|only|todo)\(' test/personas-form-preserva.test.tsx
242 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
242 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
242 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
242 guarda espera=0 saida=0  -> PASSA
    $ git diff --name-only $BASE_REF...HEAD -- apps/web/test/aprovacoes-pacote.test.ts apps/web/test/aprovacoes-link-gerar.test.ts apps/web/test/aprovacoes-link-revogar.test.ts | wc -l | tr -d ' '
```

Nenhum critério novo usa `|| echo`, `>/dev/null 2>&1 && echo ok` ou `| tail`. Os que esperam `ok` só imprimem `ok` depois de um `test` numérico que passou.

**Não rodei aqui** o critério vitest do 231 (`npx vitest run test/personas-form-preserva.test.tsx`). Este worktree não tem `node_modules`: `vitest` falha com `Cannot find module 'vitest/config'` em `apps/web` e com `Cannot find package 'vitest'` na raiz. Não criei symlink, porque ficaria fora do escopo de escrita. O critério usa a mesma forma dos critérios vitest que o ticket já tinha e que o motor rodou em 08/09.

## Achado no motor (sem patch): a linha de chegada não valida este worktree

`ORQ_EXEC_ROOT=. bash scripts/orq validar ...` lê a fila do **checkout principal**, não a do worktree. `scripts/orquestrador/lib.sh:42` define `FILA_DIR="$MAIN_CHECKOUT/docs/fila"`, e é de propósito: a fila tem fonte única, conforme o comentário das linhas 26 a 31. Por isso o comando literal da linha de chegada imprime `fila /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila` e dá 0 violações sem olhar nenhuma linha editada aqui. Ele deu 0 também **antes** de qualquer edição.

Para validar de fato estes três arquivos, rodei o mesmo comando com `--fila` apontando para o worktree. `scripts/orq:302` repassa `"$@"` depois do `--fila` dele, e `gate-ticket.ts:494` fica com o último `--fila`. As duas saídas estão abaixo e as duas dão 0 violações. Não mexi no motor. Sugestão para o kit: `orq validar` poderia avisar quando é rodado de um worktree cuja fila difere da principal.

## Saída crua do validar

### Comando literal da linha de chegada

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar 231 235 242 --relatorio
GATE DE TICKET · 3 ticket(s) · fila /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila

231-formulario-de-persona-guiado.md  OK
235-servidor-de-sugestoes-por-nicho.md  OK
242-leitura-e-decisao-por-token.md  OK

TOTAL: 0 violação(ões), 0 isenção(ões), em 3 ticket(s)
rc=0
```

### Mesmo comando, apontado para a fila deste worktree

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar --fila /Users/lucasantos/Projetos/_worktrees/ci-fila-14/docs/fila 231 235 242 --relatorio
GATE DE TICKET · 3 ticket(s) · fila /Users/lucasantos/Projetos/_worktrees/ci-fila-14/docs/fila

231-formulario-de-persona-guiado.md  OK
  231-formulario-de-persona-guiado.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export function MultiEscolha' apps/web/src/components/fields.tsx) -eq 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(MultiEscolha|FAIXAS_RENDA|TONS_DE_VOZ)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 4 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(nicho_id|Outros)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 3 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarNichos' apps/web/src/app/personas/page.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (function|const) (campoBase|LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -ge 9 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[24] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[25] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx) -ge 2 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[26] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx) -ge 6 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[27] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx) -ge 31 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[28] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "it\('(modo criação \+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \(real\))" apps/web/test/personas-form-preserva.test.tsx) -eq 5 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[29] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c "querySelector('#nicho_juridico')" apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
235-servidor-de-sugestoes-por-nicho.md  OK
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(sugestao_usada|marcarSugestaoUsada)' apps/web/src/server/funil.ts | wc -l) -ge 3 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function marcar(OnboardingIniciado|ClienteCriado|AnguloCriado|PrimeiroRoteiro)' apps/web/src/server/funil.ts | wc -l) -eq 4 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[16] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
242-leitura-e-decisao-por-token.md  OK
  242-leitura-e-decisao-por-token.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 5 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok

TOTAL: 0 violação(ões), 33 isenção(ões), em 3 ticket(s)
rc=0
```

## Diff cru

### 235

```diff
diff --git a/docs/fila/235-servidor-de-sugestoes-por-nicho.md b/docs/fila/235-servidor-de-sugestoes-por-nicho.md
index 374c7d3..2f11585 100644
--- a/docs/fila/235-servidor-de-sugestoes-por-nicho.md
+++ b/docs/fila/235-servidor-de-sugestoes-por-nicho.md
@@ -242,10 +242,14 @@ de **234** pela tabela.
       "espera": "avaliador"
     }
   ],
-  "status": "bloqueado",
-  "notas_status": "critério(s) reprovado(s): gates reprovados (max_retries 2 atingido)",
+  "status": "pendente",
+  "notas_status": "Revisão 21/09: volta a pendente sem mudar spec. As 3 tentativas de 08/09 (19:53, 19:55, 19:58) reprovaram só no gate testes_por_pacote, com 7 falhas em test/orquestrador-notificacao.test.ts (teste do motor, fora do ticket), criterios=25/25 e typecheck ok (runs/235/attempt-2/gates.txt e events.log). O teste foi realinhado em f0b2abf (09/09 11:18) e os runs de 261 a 266, desde 09/09 16:00, fecham com 0 falha. O mérito do ticket não chegou a ser julgado. O bloco não tem contador de tentativa: a contagem vive em runs/235/. | antes: critério(s) reprovado(s): gates reprovados (max_retries 2 atingido)",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+O bloqueio de 08/09 foi ambiente, não o ticket. Nas três tentativas o único gate vermelho foi `testes_por_pacote`, com as mesmas 7 falhas em `test/orquestrador-notificacao.test.ts`, um teste do motor que nenhum arquivo desta allowlist toca; os 25 critérios passaram nas três. O teste foi realinhado ao canal arquivo em `f0b2abf` (09/09 11:18), e todo run desde então fecha com 0 falha. O ticket volta a pendente com a mesma spec.
```

### 231

```diff
diff --git a/docs/fila/231-formulario-de-persona-guiado.md b/docs/fila/231-formulario-de-persona-guiado.md
index 436c6a8..6645c5c 100644
--- a/docs/fila/231-formulario-de-persona-guiado.md
+++ b/docs/fila/231-formulario-de-persona-guiado.md
@@ -54,14 +54,15 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
   "frente": "B2-F6",
   "slug": "formulario-de-persona-guiado",
   "origem": "humano",
-  "objetivo": "Troca campo livre por escolha guiada no formulario de persona, sobre o vocabulario que o ticket 230 poe em codigo. (1) Crie apps/web/src/server/nichos-types.ts, SEM 'use server' e SEM 'server-only' (o componente client importa dali), exportando a interface NichoOpcao com id: string, slug: string e nome: string. (2) Crie apps/web/src/server/nichos-read.ts com import 'server-only', exportando async listarNichos(): Promise<NichoOpcao[]>, que le public.nichos_juridicos com o cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/personas-read.ts), com projecao EXPLICITA de id, slug e nome, filtrando ativo verdadeiro e ordenando por ordem crescente. A tabela e catalogo GLOBAL somente leitura (migration 0028): NAO escreva nela, em nenhuma circunstancia. Falha de leitura devolve lista VAZIA em vez de lancar — o formulario ainda tem de abrir, com 'Outros' disponivel. (3) Em apps/web/src/components/fields.tsx, acrescente o componente MultiEscolha, que recebe name, label, tip, uma lista de opcoes, max e defaultValues, e renderiza uma caixa de selecao por opcao, TODAS com o MESMO name e cada uma com id PROPRIO derivado do valor — assim a Server Action le com formData.getAll(name), igual ao ListField que ja existe ali. Nenhum elemento do grupo tem id igual ao name do grupo. Quando o numero de selecionadas chega a max, as opcoes NAO selecionadas ficam desabilitadas, e um texto abaixo do grupo diz quantas ainda cabem, na linguagem do advogado. NAO remova nem altere nenhum export que ja existe em fields.tsx: outras telas consomem esse arquivo. (4) Em apps/web/src/app/personas/PersonaForm.tsx: o campo faixa_renda deixa de ser TextField e passa a MultiEscolha com as opcoes de FAIXAS_RENDA e max igual a MAX_FAIXAS_RENDA (ambos vindos de @/server/personas-types); o campo tom_de_voz deixa de ser TextField e passa a SelectField com as opcoes de TONS_DE_VOZ mais uma opcao vazia 'Não informado'; o campo de CTA (cta_padrao) SAI do formulario por completo, porque o gerador deriva o CTA da oferta quando ele e vazio. (5) Ainda em PersonaForm.tsx, SO NO MODO CRIACAO, o campo de nicho passa a ser um SelectField alimentado por uma nova prop opcional nichos?: NichoOpcao[] (padrao lista vazia), com uma opcao por nicho (value igual ao id, rotulo igual ao nome) MAIS a opcao especial 'Outros'. O nicho escolhido do catalogo e enviado no campo nicho_id; escolher 'Outros' revela um campo de texto com name nicho_juridico para o texto livre, e nesse caso nicho_id vai vazio. Nunca os dois preenchidos. NO MODO EDICAO NADA MUDA no campo de nicho: ele continua o TextField readOnly de hoje, com name nicho_juridico, porque o nicho e metade da chave unica personas_cliente_nicho_uk e o teste apps/web/test/personas-edicao.test.ts:132-135 afirma esse readOnly. (6) Em apps/web/src/app/personas/page.tsx, carregue os nichos com listarNichos() e passe-os ao PersonaForm. NAO altere apps/web/src/app/personas/[id]/editar/page.tsx neste ticket. (7) Crie apps/web/test/personas-form-guiado.test.tsx com no minimo 7 casos it(), ambiente jsdom, mockando '@/server/personas' com dubles inertes no padrao de apps/web/test/personas-form.test.tsx: em modo criacao as cinco faixas aparecem como opcoes selecionaveis; selecionadas duas, as outras ficam desabilitadas; o tom de voz e um select com os cinco tons do dono; o seletor de nicho lista os nichos recebidos por prop MAIS a opcao 'Outros'; escolher 'Outros' revela o campo de texto livre do nicho; nao existe mais nenhum campo de CTA no formulario; em modo edicao o campo de nicho continua readOnly com o valor da persona. Acrescente ainda um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/personas' NAO e rota publica — a tela do cadastro so existe atras de sessao. NAO altere apps/web/src/lib/auth/routes.ts. (8) NAO altere apps/web/test/personas-form.test.tsx nem apps/web/test/personas-edicao.test.ts: os dois sao o controle positivo de que os campos antigos e o readOnly do nicho em edicao nao regrediram. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
+  "objetivo": "Troca campo livre por escolha guiada no formulario de persona, sobre o vocabulario que o ticket 230 poe em codigo. (1) Crie apps/web/src/server/nichos-types.ts, SEM 'use server' e SEM 'server-only' (o componente client importa dali), exportando a interface NichoOpcao com id: string, slug: string e nome: string. (2) Crie apps/web/src/server/nichos-read.ts com import 'server-only', exportando async listarNichos(): Promise<NichoOpcao[]>, que le public.nichos_juridicos com o cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/personas-read.ts), com projecao EXPLICITA de id, slug e nome, filtrando ativo verdadeiro e ordenando por ordem crescente. A tabela e catalogo GLOBAL somente leitura (migration 0028): NAO escreva nela, em nenhuma circunstancia. Falha de leitura devolve lista VAZIA em vez de lancar — o formulario ainda tem de abrir, com 'Outros' disponivel. (3) Em apps/web/src/components/fields.tsx, acrescente o componente MultiEscolha, que recebe name, label, tip, uma lista de opcoes, max e defaultValues, e renderiza uma caixa de selecao por opcao, TODAS com o MESMO name e cada uma com id PROPRIO derivado do valor — assim a Server Action le com formData.getAll(name), igual ao ListField que ja existe ali. Nenhum elemento do grupo tem id igual ao name do grupo. Quando o numero de selecionadas chega a max, as opcoes NAO selecionadas ficam desabilitadas, e um texto abaixo do grupo diz quantas ainda cabem, na linguagem do advogado. NAO remova nem altere nenhum export que ja existe em fields.tsx: outras telas consomem esse arquivo. (4) Em apps/web/src/app/personas/PersonaForm.tsx: o campo faixa_renda deixa de ser TextField e passa a MultiEscolha com as opcoes de FAIXAS_RENDA e max igual a MAX_FAIXAS_RENDA (ambos vindos de @/server/personas-types); o campo tom_de_voz deixa de ser TextField e passa a SelectField com as opcoes de TONS_DE_VOZ mais uma opcao vazia 'Não informado'; o campo de CTA (cta_padrao) SAI do formulario por completo, porque o gerador deriva o CTA da oferta quando ele e vazio. (5) Ainda em PersonaForm.tsx, SO NO MODO CRIACAO, o campo de nicho passa a ser um SelectField alimentado por uma nova prop opcional nichos?: NichoOpcao[] (padrao lista vazia), com uma opcao por nicho (value igual ao id, rotulo igual ao nome) MAIS a opcao especial 'Outros'. O nicho escolhido do catalogo e enviado no campo nicho_id; escolher 'Outros' revela um campo de texto com name nicho_juridico para o texto livre, e nesse caso nicho_id vai vazio. Nunca os dois preenchidos. NO MODO EDICAO NADA MUDA no campo de nicho: ele continua o TextField readOnly de hoje, com name nicho_juridico, porque o nicho e metade da chave unica personas_cliente_nicho_uk e o teste apps/web/test/personas-edicao.test.ts:132-135 afirma esse readOnly. (6) Em apps/web/src/app/personas/page.tsx, carregue os nichos com listarNichos() e passe-os ao PersonaForm. NAO altere apps/web/src/app/personas/[id]/editar/page.tsx neste ticket. (7) Crie apps/web/test/personas-form-guiado.test.tsx com no minimo 7 casos it(), ambiente jsdom, mockando '@/server/personas' com dubles inertes no padrao de apps/web/test/personas-form.test.tsx: em modo criacao as cinco faixas aparecem como opcoes selecionaveis; selecionadas duas, as outras ficam desabilitadas; o tom de voz e um select com os cinco tons do dono; o seletor de nicho lista os nichos recebidos por prop MAIS a opcao 'Outros'; escolher 'Outros' revela o campo de texto livre do nicho; nao existe mais nenhum campo de CTA no formulario; em modo edicao o campo de nicho continua readOnly com o valor da persona. Acrescente ainda um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/personas' NAO e rota publica — a tela do cadastro so existe atras de sessao. NAO altere apps/web/src/lib/auth/routes.ts. (8) NAO altere apps/web/test/personas-form.test.tsx nem apps/web/test/personas-edicao.test.ts: os dois sao o controle positivo de que os campos antigos e o readOnly do nicho em edicao nao regrediram. NAO crie migration, NAO altere supabase/ e NAO toque em services/. (9) Atualize apps/web/test/personas-form-preserva.test.tsx (ticket 228) SO onde o comportamento mudou. No caso 'modo criação + estadoInicial de erro', tres assercoes deixam de valer: a linha 75 le 'Faixa de renda' como input de texto, a 80 le 'Tom de voz' como input e a 81 le o campo 'Chamada para ação (CTA)', que sai do formulario. No fixture valoresEnviados, troque faixa_renda e tom_de_voz por valores do vocabulario (um item de FAIXAS_RENDA e um de TONS_DE_VOZ); afirme que a caixa da faixa enviada nasce marcada (.checked verdadeiro) e que o select de tom de voz nasce com o tom enviado (lido como HTMLSelectElement); e retire a leitura do CTA. Todas as outras assercoes daquele caso ficam, inclusive a de #nicho_juridico com 'Trabalhista' (linha 73), e os outros cinco casos nao mudam: nenhum it() e nenhum expect() a menos. Para isso o formulario, em modo criacao com estado de erro, marca a faixa que volta em state.valores.faixa_renda, poe no select o tom de state.valores.tom_de_voz e, quando volta texto livre de nicho, abre com 'Outros' escolhido e o campo nicho_juridico visivel com o texto. Limite conhecido: o eco de erro carrega so a PRIMEIRA faixa (campoCru em apps/web/src/server/personas.ts:24-27, fora desta allowlist); repovoar a lista inteira e trabalho de outro ticket.",
   "pathspec_allowlist": [
     "apps/web/src/server/nichos-types.ts",
     "apps/web/src/server/nichos-read.ts",
     "apps/web/src/components/fields.tsx",
     "apps/web/src/app/personas/PersonaForm.tsx",
     "apps/web/src/app/personas/page.tsx",
-    "apps/web/test/personas-form-guiado.test.tsx"
+    "apps/web/test/personas-form-guiado.test.tsx",
+    "apps/web/test/personas-form-preserva.test.tsx"
   ],
   "cria_novo": [
     "apps/web/src/server/nichos-types.ts",
@@ -201,6 +202,66 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
       "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-form-guiado.test.tsx",
       "espera": "0"
     },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste de repovoamento do 228 foi atualizado e passa",
+      "cmd": "cd apps/web && npx vitest run test/personas-form-preserva.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
+      "espera": "1"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "faixa de renda e tom de voz deixaram de ser lidos como input de texto no teste do 228",
+      "cmd": "grep -cE \"getByLabelText\\('(Faixa de renda|Tom de voz)'\\) as HTMLInputElement\" apps/web/test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 nao le mais o campo de CTA",
+      "cmd": "grep -c \"getByLabelText('Chamada para ação (CTA)')\" apps/web/test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 afirma a faixa enviada como caixa marcada",
+      "cmd": "test $(grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 le o tom de voz como select (o de faculdade ja era)",
+      "cmd": "test $(grep -c 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx) -ge 2 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (1/4): contagem de 'it(' nao cai de 6",
+      "cmd": "test $(grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx) -ge 6 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (2/4): contagem de 'expect(' nao cai de 31",
+      "cmd": "test $(grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx) -ge 31 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (3/4): os outros cinco casos continuam, pelo nome",
+      "cmd": "test $(grep -cE \"it\\('(modo criação \\+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \\(real\\))\" apps/web/test/personas-form-preserva.test.tsx) -eq 5 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (4/4): o nicho em texto livre continua repovoado",
+      "cmd": "test $(grep -c \"querySelector('#nicho_juridico')\" apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "nenhum skip, only ou todo no teste do 228",
+      "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "a suite da web continua verde",
@@ -230,12 +291,22 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
       "descricao": "EDICAO NAO REGRIDE, E O CTA SAIU DE VERDADE. Confira que, em modo EDICAO, o campo de nicho continua sendo o campo readOnly de hoje, com name nicho_juridico — nao um select desabilitado. O nicho e metade da chave unica personas_cliente_nicho_uk (migration 0001) e apps/web/test/personas-edicao.test.ts:132-135 le #nicho_juridico como input e afirma .readOnly true; trocar o elemento quebra aquela prova sem entregar nada ao usuario. REPROVE se aquele arquivo de teste tiver sido editado. Confira que o campo de CTA saiu do formulario por completo (nenhum input com name cta_padrao) e que nada em services/ foi tocado: quem cobre a ausencia de CTA no gerador e o ticket 233, nao este.",
       "cmd": "true",
       "espera": "avaliador"
+    },
+    {
+      "tipo": "avaliador",
+      "descricao": "O TESTE DO 228 FOI ATUALIZADO, NAO AFROUXADO. Abra o diff de apps/web/test/personas-form-preserva.test.tsx e confira que so mudaram as assercoes de faixa, tom e CTA do caso 'modo criação + estadoInicial de erro' e os valores de faixa_renda e tom_de_voz do fixture valoresEnviados. REPROVE se outra assercao sumiu ou ficou mais fraca (toBeDefined no lugar de toBe com valor), se a faixa deixou de ser afirmada como marcada, ou se o caso deixou de renderizar com estadoInicial de erro: o 228 existe para o advogado nao perder o que digitou quando o envio volta com erro, e isso continua valendo para faixa e tom.",
+      "cmd": "true",
+      "espera": "avaliador"
     }
   ],
-  "status": "bloqueado",
-  "notas_status": "colisao NAO declarada, achada na sessao de 2026-09-07: tirar o campo de CTA e trocar faixa de renda e tom de voz por seletor quebra tres assercoes de apps/web/test/personas-form-preserva.test.tsx (linhas 74, 77 e 78), que esta FORA da allowlist deste ticket — e a mesma classe de defeito que bloqueou o 230 cinco vezes. Antes de enfileirar: ampliar a allowlist com esse arquivo e anti-afrouxamento por contagem, ou decidir que o campo de CTA fica. | critério(s) reprovado(s): a suite da web continua verde; gates reprovados (max_retries 2 atingido)",
+  "status": "pendente",
+  "notas_status": "Revisão 21/09: volta a pendente. Colisão confirmada em runs/231/attempt-2/gates.txt: personas-form-preserva.test.tsx:75 esperava 'alta renda' e recebeu 'A+'; as linhas 80 (tom) e 81 (CTA) caem logo depois. O arquivo entrou na allowlist com critérios que provam a atualização (faixa marcada, tom como select, CTA não lido) e que nada se perdeu (it>=6, expect>=31, os outros cinco casos pelo nome, teste passando). | antes: colisao NAO declarada, achada na sessao de 2026-09-07: tirar o campo de CTA e trocar faixa de renda e tom de voz por seletor quebra tres assercoes de apps/web/test/personas-form-preserva.test.tsx (linhas 74, 77 e 78), que esta FORA da allowlist deste ticket — e a mesma classe de defeito que bloqueou o 230 cinco vezes. Antes de enfileirar: ampliar a allowlist com esse arquivo e anti-afrouxamento por contagem, ou decidir que o campo de CTA fica. | critério(s) reprovado(s): a suite da web continua verde; gates reprovados (max_retries 2 atingido)",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+A colisão anotada em 07/09 se confirmou: nas três tentativas de 08/09 o único vermelho foi `personas-form-preserva.test.tsx:75` (esperava 'alta renda', recebeu 'A+'). As linhas certas hoje são 75 (faixa), 80 (tom) e 81 (CTA), não 74, 77 e 78. O teste do 228 entra na allowlist para ser atualizado ao formulário novo, e não afrouxado: a faixa enviada nasce marcada, o tom volta no select, a leitura do CTA sai, e os critérios de contagem (6 casos, 31 asserções, os cinco outros casos pelo nome) garantem que nada mais muda. O CTA sai de verdade, como pedia o objetivo; a alternativa de manter o campo foi descartada porque o gerador já cai na oferta sem ele.
```

### 242

```diff
diff --git a/docs/fila/242-leitura-e-decisao-por-token.md b/docs/fila/242-leitura-e-decisao-por-token.md
index c9fdeb5..1c1b2d9 100644
--- a/docs/fila/242-leitura-e-decisao-por-token.md
+++ b/docs/fila/242-leitura-e-decisao-por-token.md
@@ -56,7 +56,7 @@ só com **240** e **241**, em `apps/web/src/server/aprovacoes-types.ts` — deps
   "frente": "B3-F1",
   "slug": "leitura-e-decisao-por-token",
   "origem": "humano",
-  "objetivo": "Entrega a camada de servidor que o LINK PUBLICO consome: ler o roteiro por token e registrar a decisao do cliente do escritorio. Sem tela neste ticket. (1) Em apps/web/src/server/aprovacoes-types.ts, acrescente a interface RoteiroParaCliente com gancho: string, corpo: string, legenda: string, hashtags: string[], veredito: string, estado: EstadoAprovacao e comentario: string | null; o tipo DecisaoCliente = 'aprovado' | 'ajuste_pedido'; e a interface ResultadoDecisao com ok: boolean e motivo: string | null. NAO remova nem altere nenhum tipo que os tickets 240 e 241 criaram. (2) Crie apps/web/src/server/aprovacoes-publico.ts com 'use server', exportando async lerRoteiroPorToken(token: string): Promise<RoteiroParaCliente | null>. Ela usa createSupabaseClientFromEnv() (a chave de SERVICO), le public.roteiro_aprovacoes filtrando SEMPRE por token, com projecao explicita, e traz o roteiro ligado com gancho, corpo, legenda e veredito_205. AQUI A CHAVE DE SERVICO E CORRETA e a RLS NAO e a protecao: quem abre o link nao tem sessao nenhuma, entao nao ha sujeito para a RLS avaliar, e criar policy para anon abriria a tabela na API para qualquer um — e o mesmo raciocinio do ticket 226 em organico-uso.ts, e o inverso do ticket 235, onde havia sessao. O token e o UNICO argumento aceito: NUNCA aceite roteiroId, org_id ou qualquer outro identificador vindo de fora, porque com chave de servico um identificador do cliente le a linha de qualquer escritorio. (3) TOKEN INVALIDO, EXPIRADO E REVOGADO DEVOLVEM EXATAMENTE A MESMA COISA: nulo, sem motivo, sem codigo, sem distincao. NAO escreva mensagens diferentes para os tres casos e NAO devolva campo algum que permita diferencia-los. Distinguir transforma o link num oraculo: quem tenta tokens aprende quais existiram, quando expiraram e quais foram revogados, e cada resposta diferente e um bit a mais para quem esta do lado de fora. A verificacao de expiracao e de revogacao acontece na propria consulta ou logo apos ela, e o resultado dos tres caminhos e o mesmo nulo. (4) Ainda em aprovacoes-publico.ts, exporte async decidirPorToken(token: string, decisao: DecisaoCliente, comentario?: string): Promise<ResultadoDecisao>. Ela valida o token pelas MESMAS regras da leitura e, quando o token nao serve por qualquer um dos tres motivos, devolve ok falso com o MESMO motivo generico dos tres — nunca dizendo qual foi. Sendo valido: 'aprovado' grava estado 'aprovado', decidido_em com o instante atual e comentario nulo; 'ajuste_pedido' EXIGE comentario nao vazio e, sem ele, devolve ok falso com motivo na linguagem do advogado, sem escrever nada. Link JA DECIDIDO nao e sobrescrito: devolva ok falso dizendo que este link ja foi respondido — este caso PODE ser distinguido dos outros, porque quem tem o token legitimo precisa entender por que o botao nao funciona. NAO grave nada alem de estado, comentario e decidido_em, e NAO toque em nenhuma coluna de public.roteiros. (5) O TOKEN NAO VIRA REGISTRO: nunca em console, nunca em evento, nunca em telemetria, nunca em mensagem de erro. Onde for preciso identificar um link, use APENAS os 6 primeiros caracteres. A regra vale com mais forca aqui do que no ticket 241, porque o token chega pela URL e atravessa toda a cadeia de request. (6) Crie apps/web/test/aprovacoes-publico.test.ts com no minimo 9 casos it(), sem rede e sem banco, mockando o cliente de servico: token valido devolve gancho, corpo, legenda, hashtags, veredito e estado; token INEXISTENTE devolve nulo; token EXPIRADO devolve nulo; token REVOGADO devolve nulo; os tres caminhos negativos devolvem o MESMO valor, afirmado no teste comparando os tres resultados entre si; decidirPorToken com 'aprovado' grava estado e decidido_em; 'ajuste_pedido' sem comentario devolve ok falso e NAO escreve; 'ajuste_pedido' com comentario grava estado, comentario e decidido_em; e link ja decidido nao e sobrescrito. Acrescente um caso afirmando que nenhuma das funcoes aceita roteiroId ou org_id como argumento. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts nem apps/web/test/aprovacoes-link.test.ts: sao o controle positivo dos tickets 240 e 241. NAO crie migration, NAO altere supabase/, NAO toque em services/ e NAO crie tela, rota nem componente — a pagina publica e o ticket 243.",
+  "objetivo": "Entrega a camada de servidor que o LINK PUBLICO consome: ler o roteiro por token e registrar a decisao do cliente do escritorio. Sem tela neste ticket. (1) Em apps/web/src/server/aprovacoes-types.ts, acrescente a interface RoteiroParaCliente com gancho: string, corpo: string, legenda: string, hashtags: string[], veredito: string, estado: EstadoAprovacao e comentario: string | null; o tipo DecisaoCliente = 'aprovado' | 'ajuste_pedido'; e a interface ResultadoDecisao com ok: boolean e motivo: string | null. NAO remova nem altere nenhum tipo que os tickets 240 e 241 criaram. (2) Crie apps/web/src/server/aprovacoes-publico.ts com 'use server', exportando async lerRoteiroPorToken(token: string): Promise<RoteiroParaCliente | null>. Ela usa createSupabaseClientFromEnv() (a chave de SERVICO), le public.roteiro_aprovacoes filtrando SEMPRE por token, com projecao explicita, e traz o roteiro ligado com gancho, corpo, legenda e veredito_205. AQUI A CHAVE DE SERVICO E CORRETA e a RLS NAO e a protecao: quem abre o link nao tem sessao nenhuma, entao nao ha sujeito para a RLS avaliar, e criar policy para anon abriria a tabela na API para qualquer um — e o mesmo raciocinio do ticket 226 em organico-uso.ts, e o inverso do ticket 235, onde havia sessao. O token e o UNICO argumento aceito: NUNCA aceite roteiroId, org_id ou qualquer outro identificador vindo de fora, porque com chave de servico um identificador do cliente le a linha de qualquer escritorio. (3) TOKEN INVALIDO, EXPIRADO E REVOGADO DEVOLVEM EXATAMENTE A MESMA COISA: nulo, sem motivo, sem codigo, sem distincao. NAO escreva mensagens diferentes para os tres casos e NAO devolva campo algum que permita diferencia-los. Distinguir transforma o link num oraculo: quem tenta tokens aprende quais existiram, quando expiraram e quais foram revogados, e cada resposta diferente e um bit a mais para quem esta do lado de fora. A verificacao de expiracao e de revogacao acontece na propria consulta ou logo apos ela, e o resultado dos tres caminhos e o mesmo nulo. (4) Ainda em aprovacoes-publico.ts, exporte async decidirPorToken(token: string, decisao: DecisaoCliente, comentario?: string): Promise<ResultadoDecisao>. Ela valida o token pelas MESMAS regras da leitura e, quando o token nao serve por qualquer um dos tres motivos, devolve ok falso com o MESMO motivo generico dos tres — nunca dizendo qual foi. Sendo valido: 'aprovado' grava estado 'aprovado', decidido_em com o instante atual e comentario nulo; 'ajuste_pedido' EXIGE comentario nao vazio e, sem ele, devolve ok falso com motivo na linguagem do advogado, sem escrever nada. Link JA DECIDIDO nao e sobrescrito: devolva ok falso dizendo que este link ja foi respondido — este caso PODE ser distinguido dos outros, porque quem tem o token legitimo precisa entender por que o botao nao funciona. NAO grave nada alem de estado, comentario e decidido_em, e NAO toque em nenhuma coluna de public.roteiros. (5) O TOKEN NAO VIRA REGISTRO: nunca em console, nunca em evento, nunca em telemetria, nunca em mensagem de erro. Onde for preciso identificar um link, use APENAS os 6 primeiros caracteres. A regra vale com mais forca aqui do que no ticket 241, porque o token chega pela URL e atravessa toda a cadeia de request. (6) Crie apps/web/test/aprovacoes-publico.test.ts com no minimo 9 casos it(), sem rede e sem banco, mockando o cliente de servico: token valido devolve gancho, corpo, legenda, hashtags, veredito e estado; token INEXISTENTE devolve nulo; token EXPIRADO devolve nulo; token REVOGADO devolve nulo; os tres caminhos negativos devolvem o MESMO valor, afirmado no teste comparando os tres resultados entre si; decidirPorToken com 'aprovado' grava estado e decidido_em; 'ajuste_pedido' sem comentario devolve ok falso e NAO escreve; 'ajuste_pedido' com comentario grava estado, comentario e decidido_em; e link ja decidido nao e sobrescrito. Acrescente um caso afirmando que nenhuma das funcoes aceita roteiroId ou org_id como argumento. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts, apps/web/test/aprovacoes-link-gerar.test.ts nem apps/web/test/aprovacoes-link-revogar.test.ts: sao o controle positivo dos tickets 240, 241a e 241b. NAO crie migration, NAO altere supabase/, NAO toque em services/ e NAO crie tela, rota nem componente — a pagina publica e o ticket 243.",
   "pathspec_allowlist": [
     "apps/web/src/server/aprovacoes-types.ts",
     "apps/web/src/server/aprovacoes-publico.ts",
@@ -185,16 +185,28 @@ só com **240** e **241**, em `apps/web/src/server/aprovacoes-types.ts` — deps
     },
     {
       "tipo": "guarda",
-      "descricao": "os testes dos tickets 240 e 241 nao foram editados e nao perderam caso (1/2): contagem de 'it(' em apps/web/test/aprovacoes-pacote.test.ts",
-      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 7 && echo ok",
+      "descricao": "os testes dos tickets 240, 241a e 241b nao foram editados e nao perderam caso (1/4): contagem de 'it(' em apps/web/test/aprovacoes-pacote.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok",
       "espera": "ok"
     },
     {
       "tipo": "guarda",
-      "descricao": "os testes dos tickets 240 e 241 nao foram editados e nao perderam caso (2/2): contagem de 'it(' em apps/web/test/aprovacoes-link.test.ts",
-      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok",
+      "descricao": "os testes dos tickets 240, 241a e 241b nao foram editados e nao perderam caso (2/4): contagem de 'it(' em apps/web/test/aprovacoes-link-gerar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok",
       "espera": "ok"
     },
+    {
+      "tipo": "guarda",
+      "descricao": "os testes dos tickets 240, 241a e 241b nao foram editados e nao perderam caso (3/4): contagem de 'it(' em apps/web/test/aprovacoes-link-revogar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "os testes dos tickets 240, 241a e 241b nao foram editados e nao perderam caso (4/4): nenhum dos tres arquivos aparece no diff do ticket",
+      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/aprovacoes-pacote.test.ts apps/web/test/aprovacoes-link-gerar.test.ts apps/web/test/aprovacoes-link-revogar.test.ts | wc -l | tr -d ' '",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "nenhuma tela, rota ou componente foi criado neste ticket",
@@ -244,10 +256,14 @@ só com **240** e **241**, em `apps/web/src/server/aprovacoes-types.ts` — deps
       "espera": "avaliador"
     }
   ],
-  "status": "bloqueado",
-  "notas_status": "critério(s) reprovado(s): os testes dos tickets 240 e 241 nao foram editados e nao perderam caso (max_retries 2 atingido)",
+  "status": "pendente",
+  "notas_status": "Revisão 21/09: volta a pendente. O único critério reprovado nas 3 tentativas de 08/09 lia apps/web/test/aprovacoes-link.test.ts, que não existe desde que o 241 foi dividido em 241a e 241b (os testes viraram aprovacoes-link-gerar.test.ts e aprovacoes-link-revogar.test.ts); a saída foi 'No such file or directory' em runs/242/attempt-2/criterios.txt, com gates e build ok. Insatisfazível por construção, não mérito. Critério reescrito sobre os três arquivos reais, com piso igual à contagem de hoje (8, 10, 8) e guarda de diff vazio. | antes: critério(s) reprovado(s): os testes dos tickets 240 e 241 nao foram editados e nao perderam caso (max_retries 2 atingido)",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+O critério de controle positivo apontava para `apps/web/test/aprovacoes-link.test.ts`, arquivo que só existiu no plano do 241. Quando o 241 foi dividido em 241a e 241b, os testes nasceram como `aprovacoes-link-gerar.test.ts` (10 casos) e `aprovacoes-link-revogar.test.ts` (8 casos), e o grep sobre o arquivo ausente nunca imprime `ok`. Nenhuma implementação passaria nesse critério. Os três testes de controle passam a ser os reais, com piso igual à contagem de hoje e uma guarda de que nenhum deles aparece no diff. A menção a `aprovacoes-link.test.ts` na seção Colisão acima vale, a partir daqui, pelos dois arquivos novos.
```


## O que os dependentes passam a esperar

- **232** (deps `230b`, `231`): espera o 231 ficar done. A allowlist dele se sobrepõe à do 231 em `PersonaForm.tsx` e `page.tsx`, com a dependência declarada. O 232 herda o teste do 228 já atualizado. Os casos de edição desse teste (linhas 101 a 118) não afirmam o nicho, então a troca do rótulo do nicho em edição que o 232 faz não colide com ele. Nenhuma mudança necessária.
- **236** (deps `231`, `232`, `235`): espera os três. Com o 235 pendente e o 231 destravado, o 236 volta a ter caminho. O critério de primitivas de `fields.tsx` (`-eq 8`) não conta `MultiEscolha`, então o componente novo do 231 não o quebra. Nenhuma mudança necessária.
- **243** (deps `241b`, `242`): espera o 242. Não cita os testes antigos. Nenhuma mudança necessária.
- **244** (deps `241b`, `242`): espera o 242, **e tem o mesmo defeito do 242**. O critério "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (1/3)" roda `test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok` (`docs/fila/244-*.md:190-191`), sobre o arquivo que não existe. Vai reprovar as três tentativas do mesmo jeito. Fora do escopo desta sessão, então não editei. Correção proposta, a mesma do 242: trocar por `aprovacoes-link-gerar.test.ts` com pelo menos 10 e `aprovacoes-link-revogar.test.ts` com pelo menos 8. `git grep` também acha o nome antigo em `241a-*.md` (done) e em `decisoes-pendentes.md`, mas lá não trava nada.

## Estado final do worktree

```
$ git status --short
 M docs/fila/231-formulario-de-persona-guiado.md
 M docs/fila/235-servidor-de-sugestoes-por-nicho.md
 M docs/fila/242-leitura-e-decisao-por-token.md
```


---

# Acréscimo 21/09 · segunda rodada (244 e critério vitest do 231)

Aprovados 231, 235 e 242, incluindo a volta do 242 a pendente. O escopo passou a incluir `docs/fila/244-*.md`: só o bloco JSON e um parágrafo "Revisão 21/09" no fim.

## 244: correção aplicada, status mantido

- `status`: continua `pendente`, esperando o 242. Não mudou.
- `objetivo` (7): troca `apps/web/test/aprovacoes-link.test.ts` por `aprovacoes-link-gerar.test.ts` e `aprovacoes-link-revogar.test.ts`.
- Critério "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso", de 3 para 6 partes:
  - (1/6) `aprovacoes-pacote.test.ts` com `it(` pelo menos 8 (novo);
  - (2/6) `aprovacoes-link-gerar.test.ts` com pelo menos 10 (substitui o antigo 1/3);
  - (3/6) `aprovacoes-link-revogar.test.ts` com pelo menos 8 (substitui o antigo 1/3);
  - (4/6) `aprovacoes-publico.test.ts` com pelo menos 10 (era o 2/3, sem mudança);
  - (5/6) `aprovar-publico.test.tsx` com pelo menos 6 (era o 3/3, sem mudança);
  - (6/6) nenhum dos três testes de 240, 241a e 241b aparece em `git diff --name-only $BASE_REF...HEAD` (= 0, novo).
- `notas_status`: estava vazio. Agora tem uma linha com a explicação.
- Prosa: parágrafo "Revisão 21/09" no fim. A prosa acima dele não cita o caminho antigo, só o bloco JSON citava.

Contagens medidas agora neste worktree:

```
$ grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts
8
$ grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts
10
$ grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts
8
$ ls apps/web/test/aprovacoes-link.test.ts
ls: apps/web/test/aprovacoes-link.test.ts: No such file or directory
```

Cada parte do critério rodada contra a árvore de hoje, com separador `\x1f` e `BASE_REF=HEAD`:

```
244 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
244 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
244 guarda espera=ok saida=ok  -> PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
244 guarda espera=ok saida=grep: apps/web/test/aprovacoes-publico.test.ts: No such file or directory bash: line 0: test: -ge: unary operator expected  -> NAO_PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
244 guarda espera=ok saida=grep: apps/web/test/aprovar-publico.test.tsx: No such file or directory bash: line 0: test: -ge: unary operator expected  -> NAO_PASSA
    $ test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
244 guarda espera=0 saida=0  -> PASSA
    $ git diff --name-only $BASE_REF...HEAD -- apps/web/test/aprovacoes-pacote.test.ts apps/web/test/aprovacoes-link-gerar.test.ts apps/web/test/aprovacoes-link-revogar.test.ts | wc -l | tr -d ' '
```

As partes (4/6) e (5/6) falham hoje porque os arquivos ainda não existem: `aprovacoes-publico.test.ts` nasce no 242 e `aprovar-publico.test.tsx` nasce no 243. Não mexi nelas.

**Achado, sem correção aplicada:** o 244 declara `dependencias: ["241b", "242"]`, sem o `243`. Mas a parte (5/6) exige `apps/web/test/aprovar-publico.test.tsx`, que só o 243 cria (está na allowlist do 243). Se a drenagem pegar o 244 depois do 242 e antes do 243, a parte (5/6) reprova as três tentativas, como aconteceu com o 242. Correção proposta: acrescentar `"243"` às `dependencias` do 244. A alternativa é tirar a parte (5/6), mas ela protege o teste do 243 e vale a pena manter. Não apliquei porque não foi pedido.

## 231: critério vitest rodado, e ele saiu verde, não vermelho

Criei os symlinks, rodei o critério exatamente como está no bloco e removi os symlinks.

**Extensão ao pedido:** criei **dois** symlinks, não um: `node_modules` na raiz e `apps/web/node_modules`. O motor faz um symlink por pacote (`scripts/orquestrador/executor.sh:254-266`, `linkar_node_modules`). O `vitest` da raiz é 2.1.9 e o de `apps/web` é 4.1.9 (`"version"` nos dois `package.json`). Só com o da raiz, `apps/web` resolveria o 2.1.9, e o critério não rodaria nas condições do motor. A saída confirma `RUN v4.1.9`.

```
$ ln -s /Users/lucasantos/Projetos/conteudos-infinitos/node_modules node_modules
$ ln -s /Users/lucasantos/Projetos/conteudos-infinitos/apps/web/node_modules apps/web/node_modules
$ cd apps/web && npx vitest run test/personas-form-preserva.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'
1
rc=0
```

Contexto (a mesma execução sem o `grep -c`, filtrada):

```
 RUN  v4.1.9 /Users/lucasantos/Projetos/_worktrees/ci-fila-14/apps/web
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

Remoção:

```
$ unlink node_modules
unlink raiz rc=0
$ unlink apps/web/node_modules
unlink web rc=0
$ ls -la node_modules apps/web/node_modules
ls: apps/web/node_modules: No such file or directory
ls: node_modules: No such file or directory
$ git status --porcelain --ignored | grep -i node_modules
(vazio)
```

**Por que saiu verde:** hoje nem o teste do 228 nem o formulário mudaram, então o teste passa como está, com 6 de 6. O resultado esperado era vermelho, mas este critério nunca poderia ser vermelho na base. Ele prova "o teste continua passando", que é papel de guarda. Classificá-lo como alvo foi erro meu na primeira rodada, e é a classe de defeito do PLAYBOOK.md:90 (alvo especificado que já estava verde).

**Correção aplicada no bloco do 231:** `tipo` de `alvo` para `guarda`, e a descrição passou a ser "o teste de repovoamento do 228 continua passando depois de atualizado". O `cmd` e a `espera` não mudaram. A prova de que o teste foi **atualizado** fica com os quatro alvos de grep, que saem vermelhos na base (2, 1, vazio, vazio; ver a tabela da primeira rodada). O motor hoje não trata alvo e guarda de forma diferente ao rodar (`gate-ticket.ts:12`: rodar alvo contra HEAD ficou para a peça 1b), então a mudança não altera o que reprova. Ela corrige o que o critério diz provar, e evita um falso "alvo já verde" quando a peça 1b existir.

## Validar final, com --fila neste worktree (saída crua)

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar --fila /Users/lucasantos/Projetos/_worktrees/ci-fila-14/docs/fila 231 235 242 244 --relatorio
GATE DE TICKET · 4 ticket(s) · fila /Users/lucasantos/Projetos/_worktrees/ci-fila-14/docs/fila

231-formulario-de-persona-guiado.md  OK
  231-formulario-de-persona-guiado.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export function MultiEscolha' apps/web/src/components/fields.tsx) -eq 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(MultiEscolha|FAIXAS_RENDA|TONS_DE_VOZ)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 4 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(nicho_id|Outros)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 3 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarNichos' apps/web/src/app/personas/page.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (function|const) (campoBase|LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -ge 9 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[24] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[25] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx) -ge 2 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[26] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx) -ge 6 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[27] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx) -ge 31 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[28] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "it\('(modo criação \+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \(real\))" apps/web/test/personas-form-preserva.test.tsx) -eq 5 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[29] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c "querySelector('#nicho_juridico')" apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok
235-servidor-de-sugestoes-por-nicho.md  OK
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(sugestao_usada|marcarSugestaoUsada)' apps/web/src/server/funil.ts | wc -l) -ge 3 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function marcar(OnboardingIniciado|ClienteCriado|AnguloCriado|PrimeiroRoteiro)' apps/web/src/server/funil.ts | wc -l) -eq 4 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[16] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
242-leitura-e-decisao-por-token.md  OK
  242-leitura-e-decisao-por-token.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[15] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 5 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
244-fila-interna-de-aprovacao.md  OK
  244-fila-interna-de-aprovacao.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[9] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[18] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[21] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[22] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok

TOTAL: 0 violação(ões), 43 isenção(ões), em 4 ticket(s)
rc=0
```

Sem `--relatorio` (sai com o rc do gate):

```
$ ORQ_EXEC_ROOT=. bash scripts/orq validar --fila /Users/lucasantos/Projetos/_worktrees/ci-fila-14/docs/fila 231 235 242 244
rc=0
```

## git status --porcelain

```
 M docs/fila/231-formulario-de-persona-guiado.md
 M docs/fila/235-servidor-de-sugestoes-por-nicho.md
 M docs/fila/242-leitura-e-decisao-por-token.md
 M docs/fila/244-fila-interna-de-aprovacao.md
```

## Diff cru, estado final

### 244

```diff
diff --git a/docs/fila/244-fila-interna-de-aprovacao.md b/docs/fila/244-fila-interna-de-aprovacao.md
index 42266f1..4709b57 100644
--- a/docs/fila/244-fila-interna-de-aprovacao.md
+++ b/docs/fila/244-fila-interna-de-aprovacao.md
@@ -59,7 +59,7 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
   "frente": "B3-F1",
   "slug": "fila-interna-de-aprovacao",
   "origem": "humano",
-  "objetivo": "Cria a tela INTERNA da fila de aprovacao, onde o advogado ve o estado de cada roteiro na mao do cliente e gera ou revoga o link. (1) Crie apps/web/src/server/aprovacoes-read.ts com import 'server-only', exportando o tipo EstadoFila = 'sem_link' | 'aguardando' | 'aprovado' | 'ajuste_pedido' | 'revogado' | 'expirado', a interface ItemFila com roteiroId: string, titulo: string, criadoEm: string, veredito: string, motivoVeredito: string | null, estado: EstadoFila, comentario: string | null e expiraEm: string | null, e async listarFilaDeAprovacao(limite?: number): Promise<ItemFila[]>. Ela le public.roteiros junto com public.roteiro_aprovacoes pelo cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/historico-read.ts), com projecao EXPLICITA, ordenando do mais recente para o mais antigo. USE O CLIENTE AUTENTICADO, NUNCA service_role: roteiro_aprovacoes tem policy de select para authenticated limitada por private.user_org_ids() (migration 0030), e chave de servico aqui traria a fila de TODOS os escritorios — mesmo raciocinio do ticket 235, e o inverso do ticket 242, onde nao ha sessao para a RLS avaliar. Falha de leitura devolve lista VAZIA em vez de lancar. (2) O ESTADO E DERIVADO, e a derivacao mora aqui, em funcao pura e testavel: roteiro sem linha de link e 'sem_link'; com revogado_em preenchido e 'revogado'; com expira_em no passado e 'expirado'; com estado 'aprovado' ou 'ajuste_pedido' na linha do link, e esse; caso contrario e 'aguardando'. A ordem de precedencia importa: revogado vence expirado, e uma decisao ja tomada vence os dois — link revogado depois de o cliente ter aprovado continua mostrando 'aprovado', porque a decisao aconteceu. (3) Crie apps/web/src/app/aprovacoes/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic', listando os itens com titulo, data, estado em rotulo de advogado, e o comentario do cliente quando o estado for 'ajuste_pedido'. Cada item oferece a acao apropriada: 'sem_link', 'revogado' e 'expirado' oferecem gerar link (gerarLinkAprovacao do ticket 241); 'aguardando' oferece revogar (revogarLinkAprovacao); 'aprovado' e 'ajuste_pedido' nao oferecem nenhuma das duas. ROTEIRO REPROVADO NO 205 NAO OFERECE BOTAO DE LINK: mostre o motivo do gate e nao ofereca a acao, porque o servidor do ticket 241 vai recusar — oferecer um botao que o servidor recusa e mentir para o operador na tela, que e exatamente o erro que o ticket 227 corrigiu no guard de escritorio. (4) A TELA E INTERNA e a rota e PROTEGIDA: '/aprovacoes' NAO casa o prefixo publico '/aprovar' que o ticket 243 declarou, porque casaPrefixo exige igualdade exata ou o prefixo seguido de barra. NAO altere apps/web/src/lib/auth/routes.ts, NAO acrescente '/aprovacoes' a PUBLIC_PREFIXES em nenhuma circunstancia e NAO toque no middleware. (5) O TOKEN NAO APARECE NA FILA: ItemFila nao carrega o token, a tela nao o exibe e nenhum log o registra. O advogado copia o link pelo caminho que a acao de gerar devolve, e a listagem trabalha por roteiroId. Isso vale mesmo do lado de dentro: token listado numa tela e token em captura de tela, em compartilhamento e em log de navegador. (6) Crie apps/web/test/aprovacoes-fila.test.tsx com no minimo 8 casos it(), mockando '@/lib/supabase/server', 'server-only' e '@/server/aprovacoes-link': roteiro sem linha de link e 'sem_link'; linha viva sem decisao e 'aguardando'; revogado_em preenchido e 'revogado'; expira_em no passado e 'expirado'; decisao 'aprovado' vence revogado e expirado; falha de leitura devolve lista vazia; a tela renderizada mostra o comentario do cliente quando o estado e 'ajuste_pedido'; e roteiro com veredito diferente de 'aprovado' NAO oferece a acao de gerar link. Acrescente um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/aprovacoes' NAO e rota publica — a fila do escritorio nao pode virar publica por vizinhanca de nome com '/aprovar'. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts, apps/web/test/aprovacoes-link.test.ts, apps/web/test/aprovacoes-publico.test.ts, apps/web/test/aprovar-publico.test.tsx nem apps/web/test/auth-validation.test.ts: sao o controle positivo dos tickets 240 a 243. NAO toque em apps/web/src/server/aprovacoes-types.ts, aprovacoes.ts, aprovacoes-link.ts nem aprovacoes-publico.ts. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
+  "objetivo": "Cria a tela INTERNA da fila de aprovacao, onde o advogado ve o estado de cada roteiro na mao do cliente e gera ou revoga o link. (1) Crie apps/web/src/server/aprovacoes-read.ts com import 'server-only', exportando o tipo EstadoFila = 'sem_link' | 'aguardando' | 'aprovado' | 'ajuste_pedido' | 'revogado' | 'expirado', a interface ItemFila com roteiroId: string, titulo: string, criadoEm: string, veredito: string, motivoVeredito: string | null, estado: EstadoFila, comentario: string | null e expiraEm: string | null, e async listarFilaDeAprovacao(limite?: number): Promise<ItemFila[]>. Ela le public.roteiros junto com public.roteiro_aprovacoes pelo cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/historico-read.ts), com projecao EXPLICITA, ordenando do mais recente para o mais antigo. USE O CLIENTE AUTENTICADO, NUNCA service_role: roteiro_aprovacoes tem policy de select para authenticated limitada por private.user_org_ids() (migration 0030), e chave de servico aqui traria a fila de TODOS os escritorios — mesmo raciocinio do ticket 235, e o inverso do ticket 242, onde nao ha sessao para a RLS avaliar. Falha de leitura devolve lista VAZIA em vez de lancar. (2) O ESTADO E DERIVADO, e a derivacao mora aqui, em funcao pura e testavel: roteiro sem linha de link e 'sem_link'; com revogado_em preenchido e 'revogado'; com expira_em no passado e 'expirado'; com estado 'aprovado' ou 'ajuste_pedido' na linha do link, e esse; caso contrario e 'aguardando'. A ordem de precedencia importa: revogado vence expirado, e uma decisao ja tomada vence os dois — link revogado depois de o cliente ter aprovado continua mostrando 'aprovado', porque a decisao aconteceu. (3) Crie apps/web/src/app/aprovacoes/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic', listando os itens com titulo, data, estado em rotulo de advogado, e o comentario do cliente quando o estado for 'ajuste_pedido'. Cada item oferece a acao apropriada: 'sem_link', 'revogado' e 'expirado' oferecem gerar link (gerarLinkAprovacao do ticket 241); 'aguardando' oferece revogar (revogarLinkAprovacao); 'aprovado' e 'ajuste_pedido' nao oferecem nenhuma das duas. ROTEIRO REPROVADO NO 205 NAO OFERECE BOTAO DE LINK: mostre o motivo do gate e nao ofereca a acao, porque o servidor do ticket 241 vai recusar — oferecer um botao que o servidor recusa e mentir para o operador na tela, que e exatamente o erro que o ticket 227 corrigiu no guard de escritorio. (4) A TELA E INTERNA e a rota e PROTEGIDA: '/aprovacoes' NAO casa o prefixo publico '/aprovar' que o ticket 243 declarou, porque casaPrefixo exige igualdade exata ou o prefixo seguido de barra. NAO altere apps/web/src/lib/auth/routes.ts, NAO acrescente '/aprovacoes' a PUBLIC_PREFIXES em nenhuma circunstancia e NAO toque no middleware. (5) O TOKEN NAO APARECE NA FILA: ItemFila nao carrega o token, a tela nao o exibe e nenhum log o registra. O advogado copia o link pelo caminho que a acao de gerar devolve, e a listagem trabalha por roteiroId. Isso vale mesmo do lado de dentro: token listado numa tela e token em captura de tela, em compartilhamento e em log de navegador. (6) Crie apps/web/test/aprovacoes-fila.test.tsx com no minimo 8 casos it(), mockando '@/lib/supabase/server', 'server-only' e '@/server/aprovacoes-link': roteiro sem linha de link e 'sem_link'; linha viva sem decisao e 'aguardando'; revogado_em preenchido e 'revogado'; expira_em no passado e 'expirado'; decisao 'aprovado' vence revogado e expirado; falha de leitura devolve lista vazia; a tela renderizada mostra o comentario do cliente quando o estado e 'ajuste_pedido'; e roteiro com veredito diferente de 'aprovado' NAO oferece a acao de gerar link. Acrescente um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/aprovacoes' NAO e rota publica — a fila do escritorio nao pode virar publica por vizinhanca de nome com '/aprovar'. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts, apps/web/test/aprovacoes-link-gerar.test.ts, apps/web/test/aprovacoes-link-revogar.test.ts, apps/web/test/aprovacoes-publico.test.ts, apps/web/test/aprovar-publico.test.tsx nem apps/web/test/auth-validation.test.ts: sao o controle positivo dos tickets 240 a 243. NAO toque em apps/web/src/server/aprovacoes-types.ts, aprovacoes.ts, aprovacoes-link.ts nem aprovacoes-publico.ts. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
   "pathspec_allowlist": [
     "apps/web/src/server/aprovacoes-read.ts",
     "apps/web/src/app/aprovacoes/page.tsx",
@@ -187,22 +187,40 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (1/3): contagem de 'it(' em apps/web/test/aprovacoes-link.test.ts",
-      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (1/6): contagem de 'it(' em apps/web/test/aprovacoes-pacote.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok",
       "espera": "ok"
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (2/3): contagem de 'it(' em apps/web/test/aprovacoes-publico.test.ts",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (2/6): contagem de 'it(' em apps/web/test/aprovacoes-link-gerar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (3/6): contagem de 'it(' em apps/web/test/aprovacoes-link-revogar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (4/6): contagem de 'it(' em apps/web/test/aprovacoes-publico.test.ts",
       "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok",
       "espera": "ok"
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (3/3): contagem de 'it(' em apps/web/test/aprovar-publico.test.tsx",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (5/6): contagem de 'it(' em apps/web/test/aprovar-publico.test.tsx",
       "cmd": "test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok",
       "espera": "ok"
     },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (6/6): os testes dos tickets 240, 241a e 241b nao aparecem no diff do ticket",
+      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/aprovacoes-pacote.test.ts apps/web/test/aprovacoes-link-gerar.test.ts apps/web/test/aprovacoes-link-revogar.test.ts | wc -l | tr -d ' '",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "nenhum teste anterior de aprovacao foi editado",
@@ -253,9 +271,13 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
     }
   ],
   "status": "pendente",
-  "notas_status": "",
+  "notas_status": "Revisão 21/09: status segue pendente, esperando 242. O critério anti-afrouxamento (1/3) lia apps/web/test/aprovacoes-link.test.ts, que não existe desde que o 241 foi dividido em 241a e 241b; reprovaria toda tentativa, como reprovou o 242 em 08/09 (runs/242/attempt-2/criterios.txt). Reescrito sobre os três arquivos reais, com piso igual à contagem de hoje (8, 10, 8) e guarda de diff vazio; os casos de aprovacoes-publico e aprovar-publico ficam como estavam.",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+O critério anti-afrouxamento apontava para `apps/web/test/aprovacoes-link.test.ts`, arquivo que só existiu no plano do 241. Os testes reais são `aprovacoes-pacote.test.ts` (8 casos), `aprovacoes-link-gerar.test.ts` (10) e `aprovacoes-link-revogar.test.ts` (8). O critério passa a contar os três, com piso igual à contagem de hoje, e a exigir que nenhum deles apareça no diff. É a mesma correção feita no 242, que travou por esse mesmo caminho em 08/09. O status não muda: segue pendente, esperando o 242.
```

### 231 (estado final, inclui a reclassificação do critério vitest)

```diff
diff --git a/docs/fila/231-formulario-de-persona-guiado.md b/docs/fila/231-formulario-de-persona-guiado.md
index 436c6a8..e9d4e40 100644
--- a/docs/fila/231-formulario-de-persona-guiado.md
+++ b/docs/fila/231-formulario-de-persona-guiado.md
@@ -54,14 +54,15 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
   "frente": "B2-F6",
   "slug": "formulario-de-persona-guiado",
   "origem": "humano",
-  "objetivo": "Troca campo livre por escolha guiada no formulario de persona, sobre o vocabulario que o ticket 230 poe em codigo. (1) Crie apps/web/src/server/nichos-types.ts, SEM 'use server' e SEM 'server-only' (o componente client importa dali), exportando a interface NichoOpcao com id: string, slug: string e nome: string. (2) Crie apps/web/src/server/nichos-read.ts com import 'server-only', exportando async listarNichos(): Promise<NichoOpcao[]>, que le public.nichos_juridicos com o cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/personas-read.ts), com projecao EXPLICITA de id, slug e nome, filtrando ativo verdadeiro e ordenando por ordem crescente. A tabela e catalogo GLOBAL somente leitura (migration 0028): NAO escreva nela, em nenhuma circunstancia. Falha de leitura devolve lista VAZIA em vez de lancar — o formulario ainda tem de abrir, com 'Outros' disponivel. (3) Em apps/web/src/components/fields.tsx, acrescente o componente MultiEscolha, que recebe name, label, tip, uma lista de opcoes, max e defaultValues, e renderiza uma caixa de selecao por opcao, TODAS com o MESMO name e cada uma com id PROPRIO derivado do valor — assim a Server Action le com formData.getAll(name), igual ao ListField que ja existe ali. Nenhum elemento do grupo tem id igual ao name do grupo. Quando o numero de selecionadas chega a max, as opcoes NAO selecionadas ficam desabilitadas, e um texto abaixo do grupo diz quantas ainda cabem, na linguagem do advogado. NAO remova nem altere nenhum export que ja existe em fields.tsx: outras telas consomem esse arquivo. (4) Em apps/web/src/app/personas/PersonaForm.tsx: o campo faixa_renda deixa de ser TextField e passa a MultiEscolha com as opcoes de FAIXAS_RENDA e max igual a MAX_FAIXAS_RENDA (ambos vindos de @/server/personas-types); o campo tom_de_voz deixa de ser TextField e passa a SelectField com as opcoes de TONS_DE_VOZ mais uma opcao vazia 'Não informado'; o campo de CTA (cta_padrao) SAI do formulario por completo, porque o gerador deriva o CTA da oferta quando ele e vazio. (5) Ainda em PersonaForm.tsx, SO NO MODO CRIACAO, o campo de nicho passa a ser um SelectField alimentado por uma nova prop opcional nichos?: NichoOpcao[] (padrao lista vazia), com uma opcao por nicho (value igual ao id, rotulo igual ao nome) MAIS a opcao especial 'Outros'. O nicho escolhido do catalogo e enviado no campo nicho_id; escolher 'Outros' revela um campo de texto com name nicho_juridico para o texto livre, e nesse caso nicho_id vai vazio. Nunca os dois preenchidos. NO MODO EDICAO NADA MUDA no campo de nicho: ele continua o TextField readOnly de hoje, com name nicho_juridico, porque o nicho e metade da chave unica personas_cliente_nicho_uk e o teste apps/web/test/personas-edicao.test.ts:132-135 afirma esse readOnly. (6) Em apps/web/src/app/personas/page.tsx, carregue os nichos com listarNichos() e passe-os ao PersonaForm. NAO altere apps/web/src/app/personas/[id]/editar/page.tsx neste ticket. (7) Crie apps/web/test/personas-form-guiado.test.tsx com no minimo 7 casos it(), ambiente jsdom, mockando '@/server/personas' com dubles inertes no padrao de apps/web/test/personas-form.test.tsx: em modo criacao as cinco faixas aparecem como opcoes selecionaveis; selecionadas duas, as outras ficam desabilitadas; o tom de voz e um select com os cinco tons do dono; o seletor de nicho lista os nichos recebidos por prop MAIS a opcao 'Outros'; escolher 'Outros' revela o campo de texto livre do nicho; nao existe mais nenhum campo de CTA no formulario; em modo edicao o campo de nicho continua readOnly com o valor da persona. Acrescente ainda um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/personas' NAO e rota publica — a tela do cadastro so existe atras de sessao. NAO altere apps/web/src/lib/auth/routes.ts. (8) NAO altere apps/web/test/personas-form.test.tsx nem apps/web/test/personas-edicao.test.ts: os dois sao o controle positivo de que os campos antigos e o readOnly do nicho em edicao nao regrediram. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
+  "objetivo": "Troca campo livre por escolha guiada no formulario de persona, sobre o vocabulario que o ticket 230 poe em codigo. (1) Crie apps/web/src/server/nichos-types.ts, SEM 'use server' e SEM 'server-only' (o componente client importa dali), exportando a interface NichoOpcao com id: string, slug: string e nome: string. (2) Crie apps/web/src/server/nichos-read.ts com import 'server-only', exportando async listarNichos(): Promise<NichoOpcao[]>, que le public.nichos_juridicos com o cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/personas-read.ts), com projecao EXPLICITA de id, slug e nome, filtrando ativo verdadeiro e ordenando por ordem crescente. A tabela e catalogo GLOBAL somente leitura (migration 0028): NAO escreva nela, em nenhuma circunstancia. Falha de leitura devolve lista VAZIA em vez de lancar — o formulario ainda tem de abrir, com 'Outros' disponivel. (3) Em apps/web/src/components/fields.tsx, acrescente o componente MultiEscolha, que recebe name, label, tip, uma lista de opcoes, max e defaultValues, e renderiza uma caixa de selecao por opcao, TODAS com o MESMO name e cada uma com id PROPRIO derivado do valor — assim a Server Action le com formData.getAll(name), igual ao ListField que ja existe ali. Nenhum elemento do grupo tem id igual ao name do grupo. Quando o numero de selecionadas chega a max, as opcoes NAO selecionadas ficam desabilitadas, e um texto abaixo do grupo diz quantas ainda cabem, na linguagem do advogado. NAO remova nem altere nenhum export que ja existe em fields.tsx: outras telas consomem esse arquivo. (4) Em apps/web/src/app/personas/PersonaForm.tsx: o campo faixa_renda deixa de ser TextField e passa a MultiEscolha com as opcoes de FAIXAS_RENDA e max igual a MAX_FAIXAS_RENDA (ambos vindos de @/server/personas-types); o campo tom_de_voz deixa de ser TextField e passa a SelectField com as opcoes de TONS_DE_VOZ mais uma opcao vazia 'Não informado'; o campo de CTA (cta_padrao) SAI do formulario por completo, porque o gerador deriva o CTA da oferta quando ele e vazio. (5) Ainda em PersonaForm.tsx, SO NO MODO CRIACAO, o campo de nicho passa a ser um SelectField alimentado por uma nova prop opcional nichos?: NichoOpcao[] (padrao lista vazia), com uma opcao por nicho (value igual ao id, rotulo igual ao nome) MAIS a opcao especial 'Outros'. O nicho escolhido do catalogo e enviado no campo nicho_id; escolher 'Outros' revela um campo de texto com name nicho_juridico para o texto livre, e nesse caso nicho_id vai vazio. Nunca os dois preenchidos. NO MODO EDICAO NADA MUDA no campo de nicho: ele continua o TextField readOnly de hoje, com name nicho_juridico, porque o nicho e metade da chave unica personas_cliente_nicho_uk e o teste apps/web/test/personas-edicao.test.ts:132-135 afirma esse readOnly. (6) Em apps/web/src/app/personas/page.tsx, carregue os nichos com listarNichos() e passe-os ao PersonaForm. NAO altere apps/web/src/app/personas/[id]/editar/page.tsx neste ticket. (7) Crie apps/web/test/personas-form-guiado.test.tsx com no minimo 7 casos it(), ambiente jsdom, mockando '@/server/personas' com dubles inertes no padrao de apps/web/test/personas-form.test.tsx: em modo criacao as cinco faixas aparecem como opcoes selecionaveis; selecionadas duas, as outras ficam desabilitadas; o tom de voz e um select com os cinco tons do dono; o seletor de nicho lista os nichos recebidos por prop MAIS a opcao 'Outros'; escolher 'Outros' revela o campo de texto livre do nicho; nao existe mais nenhum campo de CTA no formulario; em modo edicao o campo de nicho continua readOnly com o valor da persona. Acrescente ainda um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/personas' NAO e rota publica — a tela do cadastro so existe atras de sessao. NAO altere apps/web/src/lib/auth/routes.ts. (8) NAO altere apps/web/test/personas-form.test.tsx nem apps/web/test/personas-edicao.test.ts: os dois sao o controle positivo de que os campos antigos e o readOnly do nicho em edicao nao regrediram. NAO crie migration, NAO altere supabase/ e NAO toque em services/. (9) Atualize apps/web/test/personas-form-preserva.test.tsx (ticket 228) SO onde o comportamento mudou. No caso 'modo criação + estadoInicial de erro', tres assercoes deixam de valer: a linha 75 le 'Faixa de renda' como input de texto, a 80 le 'Tom de voz' como input e a 81 le o campo 'Chamada para ação (CTA)', que sai do formulario. No fixture valoresEnviados, troque faixa_renda e tom_de_voz por valores do vocabulario (um item de FAIXAS_RENDA e um de TONS_DE_VOZ); afirme que a caixa da faixa enviada nasce marcada (.checked verdadeiro) e que o select de tom de voz nasce com o tom enviado (lido como HTMLSelectElement); e retire a leitura do CTA. Todas as outras assercoes daquele caso ficam, inclusive a de #nicho_juridico com 'Trabalhista' (linha 73), e os outros cinco casos nao mudam: nenhum it() e nenhum expect() a menos. Para isso o formulario, em modo criacao com estado de erro, marca a faixa que volta em state.valores.faixa_renda, poe no select o tom de state.valores.tom_de_voz e, quando volta texto livre de nicho, abre com 'Outros' escolhido e o campo nicho_juridico visivel com o texto. Limite conhecido: o eco de erro carrega so a PRIMEIRA faixa (campoCru em apps/web/src/server/personas.ts:24-27, fora desta allowlist); repovoar a lista inteira e trabalho de outro ticket.",
   "pathspec_allowlist": [
     "apps/web/src/server/nichos-types.ts",
     "apps/web/src/server/nichos-read.ts",
     "apps/web/src/components/fields.tsx",
     "apps/web/src/app/personas/PersonaForm.tsx",
     "apps/web/src/app/personas/page.tsx",
-    "apps/web/test/personas-form-guiado.test.tsx"
+    "apps/web/test/personas-form-guiado.test.tsx",
+    "apps/web/test/personas-form-preserva.test.tsx"
   ],
   "cria_novo": [
     "apps/web/src/server/nichos-types.ts",
@@ -201,6 +202,66 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
       "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-form-guiado.test.tsx",
       "espera": "0"
     },
+    {
+      "tipo": "guarda",
+      "descricao": "o teste de repovoamento do 228 continua passando depois de atualizado",
+      "cmd": "cd apps/web && npx vitest run test/personas-form-preserva.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
+      "espera": "1"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "faixa de renda e tom de voz deixaram de ser lidos como input de texto no teste do 228",
+      "cmd": "grep -cE \"getByLabelText\\('(Faixa de renda|Tom de voz)'\\) as HTMLInputElement\" apps/web/test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 nao le mais o campo de CTA",
+      "cmd": "grep -c \"getByLabelText('Chamada para ação (CTA)')\" apps/web/test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 afirma a faixa enviada como caixa marcada",
+      "cmd": "test $(grep -cE '[.]checked' apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste do 228 le o tom de voz como select (o de faculdade ja era)",
+      "cmd": "test $(grep -c 'HTMLSelectElement' apps/web/test/personas-form-preserva.test.tsx) -ge 2 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (1/4): contagem de 'it(' nao cai de 6",
+      "cmd": "test $(grep -c 'it(' apps/web/test/personas-form-preserva.test.tsx) -ge 6 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (2/4): contagem de 'expect(' nao cai de 31",
+      "cmd": "test $(grep -c 'expect(' apps/web/test/personas-form-preserva.test.tsx) -ge 31 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (3/4): os outros cinco casos continuam, pelo nome",
+      "cmd": "test $(grep -cE \"it\\('(modo criação \\+ estadoInicial de erro: as dores|modo criação SEM estadoInicial|modo edição SEM estadoInicial|modo edição COM estadoInicial|salvarPersona \\(real\\))\" apps/web/test/personas-form-preserva.test.tsx) -eq 5 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento do teste do 228 (4/4): o nicho em texto livre continua repovoado",
+      "cmd": "test $(grep -c \"querySelector('#nicho_juridico')\" apps/web/test/personas-form-preserva.test.tsx) -ge 1 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "nenhum skip, only ou todo no teste do 228",
+      "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-form-preserva.test.tsx",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "a suite da web continua verde",
@@ -230,12 +291,22 @@ Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒
       "descricao": "EDICAO NAO REGRIDE, E O CTA SAIU DE VERDADE. Confira que, em modo EDICAO, o campo de nicho continua sendo o campo readOnly de hoje, com name nicho_juridico — nao um select desabilitado. O nicho e metade da chave unica personas_cliente_nicho_uk (migration 0001) e apps/web/test/personas-edicao.test.ts:132-135 le #nicho_juridico como input e afirma .readOnly true; trocar o elemento quebra aquela prova sem entregar nada ao usuario. REPROVE se aquele arquivo de teste tiver sido editado. Confira que o campo de CTA saiu do formulario por completo (nenhum input com name cta_padrao) e que nada em services/ foi tocado: quem cobre a ausencia de CTA no gerador e o ticket 233, nao este.",
       "cmd": "true",
       "espera": "avaliador"
+    },
+    {
+      "tipo": "avaliador",
+      "descricao": "O TESTE DO 228 FOI ATUALIZADO, NAO AFROUXADO. Abra o diff de apps/web/test/personas-form-preserva.test.tsx e confira que so mudaram as assercoes de faixa, tom e CTA do caso 'modo criação + estadoInicial de erro' e os valores de faixa_renda e tom_de_voz do fixture valoresEnviados. REPROVE se outra assercao sumiu ou ficou mais fraca (toBeDefined no lugar de toBe com valor), se a faixa deixou de ser afirmada como marcada, ou se o caso deixou de renderizar com estadoInicial de erro: o 228 existe para o advogado nao perder o que digitou quando o envio volta com erro, e isso continua valendo para faixa e tom.",
+      "cmd": "true",
+      "espera": "avaliador"
     }
   ],
-  "status": "bloqueado",
-  "notas_status": "colisao NAO declarada, achada na sessao de 2026-09-07: tirar o campo de CTA e trocar faixa de renda e tom de voz por seletor quebra tres assercoes de apps/web/test/personas-form-preserva.test.tsx (linhas 74, 77 e 78), que esta FORA da allowlist deste ticket — e a mesma classe de defeito que bloqueou o 230 cinco vezes. Antes de enfileirar: ampliar a allowlist com esse arquivo e anti-afrouxamento por contagem, ou decidir que o campo de CTA fica. | critério(s) reprovado(s): a suite da web continua verde; gates reprovados (max_retries 2 atingido)",
+  "status": "pendente",
+  "notas_status": "Revisão 21/09: volta a pendente. Colisão confirmada em runs/231/attempt-2/gates.txt: personas-form-preserva.test.tsx:75 esperava 'alta renda' e recebeu 'A+'; as linhas 80 (tom) e 81 (CTA) caem logo depois. O arquivo entrou na allowlist com critérios que provam a atualização (faixa marcada, tom como select, CTA não lido) e que nada se perdeu (it>=6, expect>=31, os outros cinco casos pelo nome, teste passando). | antes: colisao NAO declarada, achada na sessao de 2026-09-07: tirar o campo de CTA e trocar faixa de renda e tom de voz por seletor quebra tres assercoes de apps/web/test/personas-form-preserva.test.tsx (linhas 74, 77 e 78), que esta FORA da allowlist deste ticket — e a mesma classe de defeito que bloqueou o 230 cinco vezes. Antes de enfileirar: ampliar a allowlist com esse arquivo e anti-afrouxamento por contagem, ou decidir que o campo de CTA fica. | critério(s) reprovado(s): a suite da web continua verde; gates reprovados (max_retries 2 atingido)",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+A colisão anotada em 07/09 se confirmou: nas três tentativas de 08/09 o único vermelho foi `personas-form-preserva.test.tsx:75` (esperava 'alta renda', recebeu 'A+'). As linhas certas hoje são 75 (faixa), 80 (tom) e 81 (CTA), não 74, 77 e 78. O teste do 228 entra na allowlist para ser atualizado ao formulário novo, e não afrouxado: a faixa enviada nasce marcada, o tom volta no select, a leitura do CTA sai, e os critérios de contagem (6 casos, 31 asserções, os cinco outros casos pelo nome) garantem que nada mais muda. O CTA sai de verdade, como pedia o objetivo; a alternativa de manter o campo foi descartada porque o gerador já cai na oferta sem ele.
```

Os diffs de 235 e 242 não mudaram desde a primeira rodada: são os que estão acima neste relatório. Nada foi commitado.

---

# Acréscimo 21/09 · rodada final

- 244: `"243"` acrescentado às `dependencias` (agora `["241b", "242", "243"]`), porque a parte (5/6) do critério anti-afrouxamento exige `apps/web/test/aprovar-publico.test.tsx`, criado pelo 243. A linha correspondente entrou no parágrafo "Revisão 21/09" e na `notas_status`. Status segue `pendente`.
- 231: tipo `guarda` do critério vitest aprovado, sem mudança nesta rodada.
- `validar --fila <worktree>/docs/fila 231 235 242 244`: 0 violações, 43 isenções, rc 0 com e sem `--relatorio`.

## git status --porcelain

```
 M docs/fila/231-formulario-de-persona-guiado.md
 M docs/fila/235-servidor-de-sugestoes-por-nicho.md
 M docs/fila/242-leitura-e-decisao-por-token.md
 M docs/fila/244-fila-interna-de-aprovacao.md
```

## Diff cru final do 244

```diff
diff --git a/docs/fila/244-fila-interna-de-aprovacao.md b/docs/fila/244-fila-interna-de-aprovacao.md
index 42266f1..9f490fa 100644
--- a/docs/fila/244-fila-interna-de-aprovacao.md
+++ b/docs/fila/244-fila-interna-de-aprovacao.md
@@ -59,7 +59,7 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
   "frente": "B3-F1",
   "slug": "fila-interna-de-aprovacao",
   "origem": "humano",
-  "objetivo": "Cria a tela INTERNA da fila de aprovacao, onde o advogado ve o estado de cada roteiro na mao do cliente e gera ou revoga o link. (1) Crie apps/web/src/server/aprovacoes-read.ts com import 'server-only', exportando o tipo EstadoFila = 'sem_link' | 'aguardando' | 'aprovado' | 'ajuste_pedido' | 'revogado' | 'expirado', a interface ItemFila com roteiroId: string, titulo: string, criadoEm: string, veredito: string, motivoVeredito: string | null, estado: EstadoFila, comentario: string | null e expiraEm: string | null, e async listarFilaDeAprovacao(limite?: number): Promise<ItemFila[]>. Ela le public.roteiros junto com public.roteiro_aprovacoes pelo cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/historico-read.ts), com projecao EXPLICITA, ordenando do mais recente para o mais antigo. USE O CLIENTE AUTENTICADO, NUNCA service_role: roteiro_aprovacoes tem policy de select para authenticated limitada por private.user_org_ids() (migration 0030), e chave de servico aqui traria a fila de TODOS os escritorios — mesmo raciocinio do ticket 235, e o inverso do ticket 242, onde nao ha sessao para a RLS avaliar. Falha de leitura devolve lista VAZIA em vez de lancar. (2) O ESTADO E DERIVADO, e a derivacao mora aqui, em funcao pura e testavel: roteiro sem linha de link e 'sem_link'; com revogado_em preenchido e 'revogado'; com expira_em no passado e 'expirado'; com estado 'aprovado' ou 'ajuste_pedido' na linha do link, e esse; caso contrario e 'aguardando'. A ordem de precedencia importa: revogado vence expirado, e uma decisao ja tomada vence os dois — link revogado depois de o cliente ter aprovado continua mostrando 'aprovado', porque a decisao aconteceu. (3) Crie apps/web/src/app/aprovacoes/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic', listando os itens com titulo, data, estado em rotulo de advogado, e o comentario do cliente quando o estado for 'ajuste_pedido'. Cada item oferece a acao apropriada: 'sem_link', 'revogado' e 'expirado' oferecem gerar link (gerarLinkAprovacao do ticket 241); 'aguardando' oferece revogar (revogarLinkAprovacao); 'aprovado' e 'ajuste_pedido' nao oferecem nenhuma das duas. ROTEIRO REPROVADO NO 205 NAO OFERECE BOTAO DE LINK: mostre o motivo do gate e nao ofereca a acao, porque o servidor do ticket 241 vai recusar — oferecer um botao que o servidor recusa e mentir para o operador na tela, que e exatamente o erro que o ticket 227 corrigiu no guard de escritorio. (4) A TELA E INTERNA e a rota e PROTEGIDA: '/aprovacoes' NAO casa o prefixo publico '/aprovar' que o ticket 243 declarou, porque casaPrefixo exige igualdade exata ou o prefixo seguido de barra. NAO altere apps/web/src/lib/auth/routes.ts, NAO acrescente '/aprovacoes' a PUBLIC_PREFIXES em nenhuma circunstancia e NAO toque no middleware. (5) O TOKEN NAO APARECE NA FILA: ItemFila nao carrega o token, a tela nao o exibe e nenhum log o registra. O advogado copia o link pelo caminho que a acao de gerar devolve, e a listagem trabalha por roteiroId. Isso vale mesmo do lado de dentro: token listado numa tela e token em captura de tela, em compartilhamento e em log de navegador. (6) Crie apps/web/test/aprovacoes-fila.test.tsx com no minimo 8 casos it(), mockando '@/lib/supabase/server', 'server-only' e '@/server/aprovacoes-link': roteiro sem linha de link e 'sem_link'; linha viva sem decisao e 'aguardando'; revogado_em preenchido e 'revogado'; expira_em no passado e 'expirado'; decisao 'aprovado' vence revogado e expirado; falha de leitura devolve lista vazia; a tela renderizada mostra o comentario do cliente quando o estado e 'ajuste_pedido'; e roteiro com veredito diferente de 'aprovado' NAO oferece a acao de gerar link. Acrescente um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/aprovacoes' NAO e rota publica — a fila do escritorio nao pode virar publica por vizinhanca de nome com '/aprovar'. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts, apps/web/test/aprovacoes-link.test.ts, apps/web/test/aprovacoes-publico.test.ts, apps/web/test/aprovar-publico.test.tsx nem apps/web/test/auth-validation.test.ts: sao o controle positivo dos tickets 240 a 243. NAO toque em apps/web/src/server/aprovacoes-types.ts, aprovacoes.ts, aprovacoes-link.ts nem aprovacoes-publico.ts. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
+  "objetivo": "Cria a tela INTERNA da fila de aprovacao, onde o advogado ve o estado de cada roteiro na mao do cliente e gera ou revoga o link. (1) Crie apps/web/src/server/aprovacoes-read.ts com import 'server-only', exportando o tipo EstadoFila = 'sem_link' | 'aguardando' | 'aprovado' | 'ajuste_pedido' | 'revogado' | 'expirado', a interface ItemFila com roteiroId: string, titulo: string, criadoEm: string, veredito: string, motivoVeredito: string | null, estado: EstadoFila, comentario: string | null e expiraEm: string | null, e async listarFilaDeAprovacao(limite?: number): Promise<ItemFila[]>. Ela le public.roteiros junto com public.roteiro_aprovacoes pelo cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/historico-read.ts), com projecao EXPLICITA, ordenando do mais recente para o mais antigo. USE O CLIENTE AUTENTICADO, NUNCA service_role: roteiro_aprovacoes tem policy de select para authenticated limitada por private.user_org_ids() (migration 0030), e chave de servico aqui traria a fila de TODOS os escritorios — mesmo raciocinio do ticket 235, e o inverso do ticket 242, onde nao ha sessao para a RLS avaliar. Falha de leitura devolve lista VAZIA em vez de lancar. (2) O ESTADO E DERIVADO, e a derivacao mora aqui, em funcao pura e testavel: roteiro sem linha de link e 'sem_link'; com revogado_em preenchido e 'revogado'; com expira_em no passado e 'expirado'; com estado 'aprovado' ou 'ajuste_pedido' na linha do link, e esse; caso contrario e 'aguardando'. A ordem de precedencia importa: revogado vence expirado, e uma decisao ja tomada vence os dois — link revogado depois de o cliente ter aprovado continua mostrando 'aprovado', porque a decisao aconteceu. (3) Crie apps/web/src/app/aprovacoes/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic', listando os itens com titulo, data, estado em rotulo de advogado, e o comentario do cliente quando o estado for 'ajuste_pedido'. Cada item oferece a acao apropriada: 'sem_link', 'revogado' e 'expirado' oferecem gerar link (gerarLinkAprovacao do ticket 241); 'aguardando' oferece revogar (revogarLinkAprovacao); 'aprovado' e 'ajuste_pedido' nao oferecem nenhuma das duas. ROTEIRO REPROVADO NO 205 NAO OFERECE BOTAO DE LINK: mostre o motivo do gate e nao ofereca a acao, porque o servidor do ticket 241 vai recusar — oferecer um botao que o servidor recusa e mentir para o operador na tela, que e exatamente o erro que o ticket 227 corrigiu no guard de escritorio. (4) A TELA E INTERNA e a rota e PROTEGIDA: '/aprovacoes' NAO casa o prefixo publico '/aprovar' que o ticket 243 declarou, porque casaPrefixo exige igualdade exata ou o prefixo seguido de barra. NAO altere apps/web/src/lib/auth/routes.ts, NAO acrescente '/aprovacoes' a PUBLIC_PREFIXES em nenhuma circunstancia e NAO toque no middleware. (5) O TOKEN NAO APARECE NA FILA: ItemFila nao carrega o token, a tela nao o exibe e nenhum log o registra. O advogado copia o link pelo caminho que a acao de gerar devolve, e a listagem trabalha por roteiroId. Isso vale mesmo do lado de dentro: token listado numa tela e token em captura de tela, em compartilhamento e em log de navegador. (6) Crie apps/web/test/aprovacoes-fila.test.tsx com no minimo 8 casos it(), mockando '@/lib/supabase/server', 'server-only' e '@/server/aprovacoes-link': roteiro sem linha de link e 'sem_link'; linha viva sem decisao e 'aguardando'; revogado_em preenchido e 'revogado'; expira_em no passado e 'expirado'; decisao 'aprovado' vence revogado e expirado; falha de leitura devolve lista vazia; a tela renderizada mostra o comentario do cliente quando o estado e 'ajuste_pedido'; e roteiro com veredito diferente de 'aprovado' NAO oferece a acao de gerar link. Acrescente um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/aprovacoes' NAO e rota publica — a fila do escritorio nao pode virar publica por vizinhanca de nome com '/aprovar'. (7) NAO altere apps/web/test/aprovacoes-pacote.test.ts, apps/web/test/aprovacoes-link-gerar.test.ts, apps/web/test/aprovacoes-link-revogar.test.ts, apps/web/test/aprovacoes-publico.test.ts, apps/web/test/aprovar-publico.test.tsx nem apps/web/test/auth-validation.test.ts: sao o controle positivo dos tickets 240 a 243. NAO toque em apps/web/src/server/aprovacoes-types.ts, aprovacoes.ts, aprovacoes-link.ts nem aprovacoes-publico.ts. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
   "pathspec_allowlist": [
     "apps/web/src/server/aprovacoes-read.ts",
     "apps/web/src/app/aprovacoes/page.tsx",
@@ -72,7 +72,8 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
   ],
   "dependencias": [
     "241b",
-    "242"
+    "242",
+    "243"
   ],
   "diff_estimado": 380,
   "risco": "",
@@ -187,22 +188,40 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (1/3): contagem de 'it(' em apps/web/test/aprovacoes-link.test.ts",
-      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (1/6): contagem de 'it(' em apps/web/test/aprovacoes-pacote.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 8 && echo ok",
       "espera": "ok"
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (2/3): contagem de 'it(' em apps/web/test/aprovacoes-publico.test.ts",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (2/6): contagem de 'it(' em apps/web/test/aprovacoes-link-gerar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-gerar.test.ts) -ge 10 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (3/6): contagem de 'it(' em apps/web/test/aprovacoes-link-revogar.test.ts",
+      "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-link-revogar.test.ts) -ge 8 && echo ok",
+      "espera": "ok"
+    },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (4/6): contagem de 'it(' em apps/web/test/aprovacoes-publico.test.ts",
       "cmd": "test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok",
       "espera": "ok"
     },
     {
       "tipo": "guarda",
-      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (3/3): contagem de 'it(' em apps/web/test/aprovar-publico.test.tsx",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (5/6): contagem de 'it(' em apps/web/test/aprovar-publico.test.tsx",
       "cmd": "test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok",
       "espera": "ok"
     },
+    {
+      "tipo": "guarda",
+      "descricao": "anti-afrouxamento: os testes dos tickets 240 a 243 nao perderam caso (6/6): os testes dos tickets 240, 241a e 241b nao aparecem no diff do ticket",
+      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/aprovacoes-pacote.test.ts apps/web/test/aprovacoes-link-gerar.test.ts apps/web/test/aprovacoes-link-revogar.test.ts | wc -l | tr -d ' '",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "nenhum teste anterior de aprovacao foi editado",
@@ -253,9 +272,13 @@ a tela lê ganha semântica no 242. Ficam **FORA**, como controle positivo, os t
     }
   ],
   "status": "pendente",
-  "notas_status": "",
+  "notas_status": "Revisão 21/09: status segue pendente, esperando 242 e 243 (243 entrou nas dependencias: a parte 5/6 exige aprovar-publico.test.tsx, que ele cria). O critério anti-afrouxamento (1/3) lia apps/web/test/aprovacoes-link.test.ts, que não existe desde que o 241 foi dividido em 241a e 241b; reprovaria toda tentativa, como reprovou o 242 em 08/09 (runs/242/attempt-2/criterios.txt). Reescrito sobre os três arquivos reais, com piso igual à contagem de hoje (8, 10, 8) e guarda de diff vazio; os casos de aprovacoes-publico e aprovar-publico ficam como estavam.",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
 }
 ```
+
+## Revisão 21/09
+
+O critério anti-afrouxamento apontava para `apps/web/test/aprovacoes-link.test.ts`, arquivo que só existiu no plano do 241. Os testes reais são `aprovacoes-pacote.test.ts` (8 casos), `aprovacoes-link-gerar.test.ts` (10) e `aprovacoes-link-revogar.test.ts` (8). O critério passa a contar os três, com piso igual à contagem de hoje, e a exigir que nenhum deles apareça no diff. É a mesma correção feita no 242, que travou por esse mesmo caminho em 08/09. A parte (5/6) do mesmo critério exige `apps/web/test/aprovar-publico.test.tsx`, que só o 243 cria, por isso `243` entrou nas dependências: sem ele, o 244 rodando antes do 243 reprovaria por arquivo ausente. O status não muda: segue pendente, esperando o 242 e o 243.
```

Nada foi commitado. Sessão encerrada.
