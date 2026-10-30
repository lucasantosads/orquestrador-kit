# Primeiros diagnósticos reais: comarka-operacional

Sessão de 10/10/2026, autorizada pelo chat do programa. O triador é o da branch
`kit/etapa7f` (`cbda4ed`), rodado da worktree `~/Projetos/_worktrees/kit-etapa7f`.

## Como rodou

**Bloqueados.** Os `.md` de `docs/fila/` foram lidos direto do disco, sem rodar nenhum script
do Comarka. Há **2 tickets bloqueados**: 840 e 929. O resto da fila está assim: 937 `done`,
67 `obsoleto` e 60 `pendente`.

**Triador.** Rodou só a extração, com o modelo desligado (`--sem-modelo`), sem
`ORQ_DIAG_DIR` e sem nenhuma chamada de API:

```
bash scripts/orq triar ~/Projetos/comarka-operacional 840 --sem-modelo   # rc=0
bash scripts/orq triar ~/Projetos/comarka-operacional 929 --sem-modelo   # rc=0
```

**Saída.** Gravada no padrão da spec:
- diagnósticos em `~/.orq/diagnosticos/comarka-operacional/840.json` e `929.json`;
- cópias mascaradas da evidência em `840/0752b5b6ef71/evidencia/` e `929/35010b1c2211/evidencia/`.

**Comarka intocado.** Fotografei o estado antes da primeira chamada e conferi duas vezes:
logo depois da triagem e no fim, depois das leituras extras.
- `GIT_OPTIONAL_LOCKS=0 git status --porcelain` deu as mesmas 26 linhas.
- O mtime de `.git/index` ficou igual: `1791666651`.
- Nenhum `index.lock` foi criado.
- Os 7 locks que já existiam continuam iguais, com o mesmo mtime: `objects/maintenance.lock`
  e `worktrees/arvore*/HEAD.lock`, de antes desta sessão. Não mexi neles.

**Leituras extras.** Para validar os remédios, li mais coisas do Comarka, sem escrever nada:
- `git show` do commit `1208ce4`, com `GIT_OPTIONAL_LOCKS=0`;
- `test/nps-reacao-resposta.test.ts`;
- `scripts/orquestrador/executor.sh`, linhas 21 e 215 a 240;
- `runs/929/attempt-2/criterios.txt`.

**Kit intocado.** O `git status` do kit é só `?? node_modules`.

## Resumo

| id | classe | firme? | regra | requeue (triador) | o que eu faria | cabe nas travas? |
|---|---|---|---|---|---|---|
| 840 | **R1** teste acoplado fora da allowlist | **firme** | D6 | `nao` | pôr `test/nps-reacao-resposta.test.ts` na allowlist com guarda e trocar o mock para o resolver único; depois reabrir | **sim**: é R1, allowlist com guarda |
| 929 | **R2?** critério com defeito de forma | palpite | D12 | `nao` | reescrever o `criterio[12]` para não quebrar com `grep -c` igual a 0 sob `set -u`; depois reabrir | **sim, como sombra**: R2 é só proposta, quem aplica no `.md` é o humano |

## 840: sai-resolver-chave-api-e

- **Bloqueio.** `circuit_breaker`, 2 tentativas, em 2026-10-10T22:50:37Z. Nota do motor:
  "motivo repetido: provável defeito de spec/harness, não do código — gate vitest: suíte
  vermelha".
- **Classificação.** **R1**, teste acoplado fora da allowlist. **Firme**, pela regra **D6**,
  com confiança alta e nada faltando na evidência.
  - O mesmo teste ficou vermelho fora da allowlist e fora do diff nas **duas** tentativas, então
    a restrição da 7f-b1-7 vale e o caso fica firme.
  - O fonte do teste cita o que o ticket mudou (acoplado).
- **Evidência:**
  - `docs/fila/runs/840/attempt-1/gate-vitest.txt:1995`: `FAIL  test/nps-reacao-resposta.test.ts > rotas chamam a reação > (i) rota pública: nota 2 reage com o cliente resolvido e responde só success, mesmo com erro`
  - `docs/fila/runs/840/attempt-1/gate-vitest.txt:1996`: `AssertionError: expected { Object (clienteId, score, ...) } to match object { …(3) }`
  - `docs/fila/runs/840/attempt-1/gate-vitest.txt:2009`: `❯ test/nps-reacao-resposta.test.ts:195:41`
  - `docs/fila/runs/840/attempt-2/gate-vitest.txt:1990`: a mesma linha `FAIL`
  - `docs/fila/runs/840/attempt-2/gate-vitest.txt:1991`: o mesmo `AssertionError`
  - `docs/fila/runs/840/attempt-2/gate-vitest.txt:2004`: `❯ test/nps-reacao-resposta.test.ts:195:41`
- **Remédio sugerido (triador):** "pôr test/nps-reacao-resposta.test.ts na allowlist com guarda
  (mesma contagem de it/expect, sem skip); vermelho em test/nps-reacao-resposta.test.ts:195".
- **Requeue (triador):** `nao`. R1 só volta à fila depois que a allowlist muda, e quem decide é
  o humano.

**Conferência manual.** Ela confirma o R1. Na suíte, 892 de 893 arquivos passam e só esse
teste falha.
- O commit do agente, `1208ce4`, troca `resolverChave` de `@/lib/clientes/resolver-chave` por
  `resolverCliente` de `@/lib/clientes/resolver-cliente` em `src/app/api/nps/public/[token]/route.ts`
  (linhas 14 e 98). A rota é um dos arquivos da allowlist.
- O teste `test/nps-reacao-resposta.test.ts:11` ainda faz `vi.mock("@/lib/clientes/resolver-chave", …)`.
  Por isso a rota chama o resolver novo de verdade, sem mock, e o `clienteId` chega
  `undefined` (Expected `00000000-…-0001`, Received `undefined`).
- O defeito é do teste, que ficou para trás, e não do código do ticket. Nas duas tentativas o
  agente não pôde editar o teste, porque ele está fora da allowlist. O `claude-output.txt`
  diz o mesmo, mas a conclusão acima não depende dele.

**O que eu faria:**
1. No `.md` do 840, acrescentar `test/nps-reacao-resposta.test.ts` ao `pathspec_allowlist`, com
   a guarda: mesma contagem de `it(` e `expect(`, sem `skip`/`only`/`todo` novo.
2. Trocar no teste o mock de `@/lib/clientes/resolver-chave` por
   `vi.mock("@/lib/clientes/resolver-cliente", () => ({ resolverCliente: vi.fn(async () => ({ cliente_id: "00000000-0000-4000-8000-000000000001", notion_id: "n1" })) }))`.
   Nenhuma asserção muda: a linha 195 continua exigindo `clienteId: CLI`.
3. Reabrir o 840. A mudança cabe na mesma tentativa, porque o diff do agente é pequeno (122
   linhas de diff, contra o cap de 900).

**Cabe nas travas?** Sim. É exatamente o caso R1 com allowlist e guarda. Nenhum teste é
afrouxado, e o vermelho é consequência direta do que o ticket mudou.

## 929: nichos-teses-aba

- **Bloqueio.** `circuit_breaker`, 2 tentativas, em 2026-10-10T19:21:17Z. Nota do motor:
  "motivo repetido: provável defeito de spec/harness, não do código — criterio[12] mecânico:
  esperado 'PERIODO_NA_ABA', obteve '…/scripts/orquestrador/executor.sh: line 231: a: unbound
  variable'".
- **Classificação.** **R2?**, critério com defeito de forma ou premissa. É **palpite**, pela
  regra **D12**, com confiança baixa e nada faltando na evidência. Iria ao modelo, que estava
  desligado.
- **Evidência:**
  - `docs/fila/runs/929/attempt-2/criterios.txt:97`: `### criterio[12] -> FALHA`, com a saída
    `executor.sh: line 231: a: unbound variable`. É a mesma saída nas tentativas 1 e 2
    (`detalhe.criterios_falhos`).
- **Remédio sugerido (triador):** "consertar criterio[12] no .md: saída
  "/Users/lucasantos/Projetos/comarka-operacional/scripts/orquestrador/executor.sh:"".
- **Requeue (triador):** `nao`.

**Conferência manual.** Ela confirma o R2 e, a meu ver, ele poderia ser firme. O defeito é de
forma do critério, e não do código nem do motor.
- O `cmd` do `criterio[12]` é uma corrente com `&&`:
  `test -f aba.tsx && s=$(grep -c '<SeletorPeriodo' page.tsx) && a=$(grep -cE 'aria-label|ariaLabel=' page.tsx) && t=$(…); [ "$s" = 0 ] && [ "$a" = 0 ] && …`.
- Quando `page.tsx` tem **zero** `<SeletorPeriodo>`, que é justamente o estado que o critério
  quer, o `grep -c` imprime `0` e sai com **código 1**. Aí `s=$(…)` falha, a corrente para, e
  `a` e `t` nunca são atribuídos.
- O executor do Comarka roda o `eval` sob `set -euo pipefail` (`executor.sh:21`; o `eval` fica
  em `:231`). Então `[ "$a" = 0 ]` aborta com `a: unbound variable`.
- A mensagem cita `a`, e não `s` nem o `test -f`. Isso mostra que a aba existia e que `s` era
  `0`: o código provavelmente estava certo nesse ponto, e o critério se derrubou sozinho.
- Reproduzi isolado, sob `set -euo pipefail`, com `page.tsx` sem seletor e a aba com um. O cmd
  original deu `a: unbound variable`, a mesma mensagem. O critério 13, logo abaixo, já usa a
  forma segura (`${n:-0}`) e passou.
- Só não sei se `a` (aria-label em `page.tsx`) seria mesmo 0 no código do agente. Isso o
  critério corrigido vai dizer.

**O que eu faria:** proporia a troca do `cmd` do `criterio[12]` no `.md` do 929, mantendo o
mesmo `espera: PERIODO_NA_ABA`:

```
test -f src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx && s=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/page.tsx || true) && a=$(grep -cE 'aria-label|ariaLabel=' src/app/dashboard/performance/page.tsx || true) && t=$(grep -c '<SeletorPeriodo' src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx || true); [ "${s:-x}" = 0 ] && [ "${a:-x}" = 0 ] && [ "${t:-x}" = 1 ] && echo PERIODO_NA_ABA || echo ST_${s:-x}_${a:-x}_${t:-x}
```

Simulei a proposta sob `set -euo pipefail`:
- estado certo: `PERIODO_NA_ABA`;
- `page.tsx` ainda com o seletor: `ST_1_0_1`;
- sem a aba: `ST_x_x_x`.

Ou seja, a proposta continua reprovando o que deve reprovar, e o critério não fica mais
frouxo. Depois disso, reabrir o 929.

**Cabe nas travas?** Sim, como **sombra**. Pela trava do R2, o triador e a sessão só propõem;
nada foi escrito no `.md`. Quem aplica a troca no Comarka é o humano ou a frente do Comarka.

## Observações para o programa

- **Regras da extração.** Nos dois casos o triador acertou a classe, mas o 929 saiu palpite
  com uma prova inequívoca: saída `unbound variable` vinda do próprio `eval`, igual nas duas
  tentativas. Uma regra candidata para R2 firme seria: critério falho com saída
  `unbound variable` ou `syntax error`, igual em ≥ 2 tentativas. Não implementei; fica para
  decidir, como foi com a D6.
- **Padrão no Comarka.** Critério com `x=$(grep -c …) && …` quebra sob `set -u` sempre que a
  contagem esperada é 0. Vale procurar o mesmo padrão nos `pendente` do Comarka antes que
  bloqueiem. Essa varredura não foi feita aqui.
- **Nota do motor do 929.** A nota diz "defeito de spec/harness". A mensagem de erro aponta
  para `executor.sh`, e isso pode parecer R6 (motor), mas não é: o motor está certo em rodar
  sob `set -u`, e o defeito é de forma do critério.
- **Modelo.** Não houve nenhuma chamada: as duas linhas de resumo dizem "sem modelo", e
  `modelo` é `null` nos dois diagnósticos.
