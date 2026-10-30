# Relatório · etapa 7f-b3 do kit: ajustes do primeiro dia do resolvedor (11/10/2026)

Worktree `kit/etapa7f3` (`/Users/lucasantos/Projetos/_worktrees/kit-etapa7f3`), base
`0e30a77` (7f-b2-9). Cinco commits, um por peça; sem push, sem merge, sem fetch, sem
`launchctl`, sem `claude -p`, sem escrita em repo real nem em `~/.orq`.

| peça | commit | o quê |
|---|---|---|
| 1 | `d38289e` | D6b: enforcement no teste vermelho da tentativa anterior é R1 firme (1006, 346d) |
| 2 | `d9adccc` | D0: bloqueado sem tentativa não chama nem reserva o modelo; diz qual dependência espera |
| 3 | `e2a96ae` | custo real sempre: reserva antes da chamada, custo real depois, devolução se não começou |
| 4 | `a209edb` | teto por prioridade: na passada, repos em auto antes de sombra antes de diagnostico |
| 5 | `3d4f19c` | CONTRATO §15 (e tabelas de §13 e §14), CHANGELOG, PECAS com os shas |

## Três correções ao enunciado (medidas, não opinião)

1. **O 1006 não tem o vermelho e o enforcement "na mesma tentativa".** Tentativa 1:
   `enforcement.json` `ok: true`, gate vitest vermelho em `test/quem-cuida.test.ts:137`.
   Tentativa 2: o agente acrescentou um `vi.mock` no teste e o enforcement barrou
   (`fora_do_pathspec`) ANTES dos gates; a tentativa 2 não tem `gate-vitest.txt`. Uma regra
   "mesma tentativa" nunca casaria o 1006. A D6b pede o vermelho **nessa tentativa ou na
   anterior**. O 346d da medição tem o mesmo desenho (vermelho em `lote-b3-2-periodo` na 1,
   barrado na 2) e é R1 na medição: passa a sair R1 firme, e certo.
2. **Só 7 dos 8 registros são "sem tentativa".** O 243 do conteudos-infinitos tem 4
   tentativas (`falta: []`, estágios `enforcement, enforcement, juiz, juiz`, sem regra).
   Os 7 do Actus não têm `runs/<id>/`. Os 8 têm a mesma causa de custo nulo (abaixo). A
   peça 2 cobre os 7; a peça 3 cobre o 243 (e os 7, por outro caminho).
3. (Item 3 do contexto.) **Os tickets do Actus têm `notas_status`.** Por exemplo, 518:
   `bloqueado 23/09/2026 (triagem): aguarda o 517 (decisao da fonte da etapa do GHL da
   conversa).`; 520: `aguarda 517, 518 e 519.`; 532: `depende da reinstalacao do app GHL
   Marketplace com o escopo users…`. O diagnóstico de 11/10 já mostrava a nota em
   `bloqueio.nota_do_motor`. O que faltava era o triador dizer isso no remédio, em vez de
   mandar ao modelo. A D0 agora faz isso (nota de evidência e dependências no remédio).

## PASSO 0

### Leitura

`scripts/orquestrador/triador/` (15 arquivos) e `scripts/orquestrador/resolvedor/` (19)
inteiros; CONTRATO §13 e §14. Pontos que decidem esta etapa:

- `extrair.ts` (antes): a D6 só é firme com o mesmo vermelho fora da allowlist em ≥ 2
  tentativas; a D8 (enforcement sem vermelho acoplado) é sempre `R1?`. Sem tentativa:
  `sai(null, null, [], 'sem tentativa na série: decisão humana')`, que **não é firme**, e
  por isso `diagnosticar` (`triar.ts`) mandava ao modelo.
- `modelo.ts` (antes): `gastoDoDia` soma `custo_usd ?? piorCaso` (o corte, US$ 0,60); o
  `Gasto` era gravado DEPOIS da chamada, com `custo_usd: env?.custo_usd ?? null`. Chamada
  que não começou virava `null`, e `null` contava 0,60.
- `passada.ts` (antes): os repos na ordem do `repos.json`
  (conteudos-infinitos, actus-saas, comarka-operacional).
- `decidir.ts`: R1 só age com `regra === 'D6'`.

### Os 8 registros de custo de 11/10: nenhuma chamada real, US$ 0,00 gastos

`~/.orq/diagnosticos/custo.json`, dia `2026-10-11`: 8 entradas (243, 517a, 519, 518, 520,
521, 527, 532), todas `custo_usd: null, tokens_in: null, tokens_out: null`.

Prova, diagnóstico a diagnóstico (o registro do modelo gravado na hora):

| repo/id | gerado_em | tentativas | falta | modelo.duracao_ms | modelo.erro | envelope_bruto |
|---|---|---|---|---|---|---|
| actus-saas/517a | 2026-10-11T03:54:09Z | 0 | `["meta"]` | 0 | `envelope ilegível (rc 127)` | `""` |
| actus-saas/518 | 03:54:09Z | 0 | `["meta"]` | 0 | idem | `""` |
| actus-saas/519 | 03:54:09Z | 0 | `["meta"]` | 1 | idem | `""` |
| actus-saas/520 | 03:54:09Z | 0 | `["meta"]` | 0 | idem | `""` |
| actus-saas/521 | 03:54:09Z | 0 | `["meta"]` | 1 | idem | `""` |
| actus-saas/527 | 03:54:09Z | 0 | `["meta"]` | 1 | idem | `""` |
| actus-saas/532 | 03:54:09Z | 0 | `["meta"]` | 0 | idem | `""` |
| conteudos-infinitos/243 (historico `4849939e6dbd.json`, a assinatura do ledger) | 03:54:09Z | 4 | `[]` | 0 | idem | `""` |

- `rc 127` com `duracao_ms` 0 ou 1 e stdout vazio é o `spawnSync` sem processo:
  `status: null` com `r.error` (o `chamar` devolvia `r.error ? 127 : 124`). Um `claude` que
  roda leva segundos e devolve envelope.
- A causa: o plist instalado (`~/Library/LaunchAgents/com.orq.resolvedor.plist`) tem
  `PATH=/Users/lucasantos/.nvm/versions/node/v24.19.0/bin:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`;
  o `claude` está em `/Users/lucasantos/.local/bin/claude` (`which claude`). Fora do PATH
  do job: ENOENT.
- Custo real: **US$ 0,00**. Teto consumido: 8 × 0,60 = **US$ 4,80** (>= 3,00): só reserva
  de pior caso, sem chamada.
- Depois disso, toda tentativa de modelo do dia saiu `pulado: teto_dia`: o 243 em 22
  diagnósticos seguidos (04:09 a 14:40) e o 1006 às 15:20 (`1006.json`:
  `"modelo": {"modelo": "claude-opus-5-5", "pulado": "teto_dia"}`).

Achado de passagem (não é peça desta etapa, foi para PECAS): o 243 ganhou **uma assinatura
nova a cada ~30 min** sem tentativa nova (23 arquivos em `historico/`). Com o modelo no
PATH, cada uma seria uma chamada paga.

### comarka-operacional/docs/fila/runs/1006 (só leitura, `GIT_OPTIONAL_LOCKS=0`)

- `meta.json`: tentativa 1 `reprovado` 15:05:30Z; tentativa 2 `bloqueado` 15:08:52Z.
- Tentativa 1: `enforcement.json` `{"ok": true, "violations": []}`; `diff.stat` com 6
  arquivos (sem `test/quem-cuida.test.ts`); `gate-vitest.txt` `Test Files 1 failed | 909
  passed`, `FAIL test/quem-cuida.test.ts > alerta de campanha: … nunca para quem saiu`
  (linha 2028), `AssertionError: expected [] to deeply equal [ '5571999990001', …(2) ]`
  (2029), `❯ test/quem-cuida.test.ts:137:20` (2041).
- Log: `15:05:30 REPROVA (fail-fast, sem Opus): gate vitest: suíte vermelha`, depois
  `15:08:52 ticket 1006: BLOQUEADO (enforcement)` (local-loop.log:88744).
- Tentativa 2: `enforcement.json` `{"ok": false, "violations": [{"tipo":
  "fora_do_pathspec", "detalhe": "test/quem-cuida.test.ts"}]}`; `diff.stat` com
  `test/quem-cuida.test.ts | 5 +`; o `diff.raw` só acrescenta o `vi.mock("@/lib/perf/conn-resolver", …)`;
  **não há `gate-vitest.txt`** (o enforcement roda antes).
- A allowlist do ticket no sha do bloqueio (`b6905eba`) não tem `test/quem-cuida.test.ts`.


## Peça 1 · D6b, segundo caminho para R1 firme

Comando: `TZ=UTC npx vitest run test/orquestrador-triador-aceite.test.ts test/orquestrador-resolvedor-passada.test.ts test/orquestrador-triador-fixture.test.ts` (vermelho, contra o motor de `0e30a77` com os testes novos) e `TZ=UTC npx vitest run test/orquestrador-triador-*.test.ts test/orquestrador-resolvedor-*.test.ts` (verde).

Vermelho por asserção: o 1006 sai `R1?` (D6), o 346d sai `R1?`, e o `decidir` dá `aviso` para `R1 D6b`. Pronto: o 1006 sai R1 firme D6b nos dois instantes, com a evidência `docs/fila/runs/1006/attempt-1/gate-vitest.txt:2041` e `docs/fila/runs/1006/attempt-2/enforcement.json:1`; matriz abaixo.

No meio do verde, 4 testes do replay da corrida da peça 6 falharam (saída guardada em `peca1-verde.txt` da primeira volta, depois sobrescrita): eles fixavam 22 respostas, 21/37, 22 chamadas e US$ 6,1265, e o 346d agora não vai ao modelo. Atualizei os números (22/37, 21, US$ 5,8840; o 346d sai da lista de evidência equivalente porque agora casa a da medição). A lista está no CHANGELOG; nenhuma perdeu força.

### Vermelho (saída crua, `peca1-vermelho.txt`)

```
ms

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-resolvedor-passada.test.ts > peça 2: a passada > decide pela classe e pelo modo
AssertionError: expected 'aviso' to be 'r1_allowlist' // Object.is equality

Expected: "r1_allowlist"
Received: "aviso"

 ❯ test/orquestrador-resolvedor-passada.test.ts:60:34
     58|     expect(d('R1', 'D6', true)).toBe('r1_allowlist')
     59|     // 7f-b3: a D6b (enforcement no teste que estava vermelho) também …
     60|     expect(d('R1', 'D6b', true)).toBe('r1_allowlist')
       |                                  ^
     61|     expect(d('R5', 'D1', true)).toBe('r5_reabrir')
     62|     expect(d('R5', 'D4', true)).toBe('r5_reabrir')

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/4]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (A) no instante do bloqueio, 760 e 898 #31 ainda são R5? (o vizinho chega depois)
AssertionError: expected [ '07-627j-L57368', …(12) ] to have a length of 14 but got 13

- Expected
+ Received

- 14
+ 13

 ❯ test/orquestrador-triador-aceite.test.ts:137:20
    135|     }
    136|     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
    137|     expect(firmes).toHaveLength(14)
       |                    ^
    138|   })
    139| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/4]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (B) zero firme errado nos 37, e os firmes certos são os 16 da spec (o 346d pela D6b)
AssertionError: expected [ '07-627j-L57368', …(14) ] to deeply equal [ '07-627j-L57368', …(15) ]

- Expected
+ Received

  Array [
    "07-627j-L57368",
    "11-689-L65280",
-   "13-346d-L66187",
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

 ❯ test/orquestrador-triador-aceite.test.ts:145:43
    143|     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n)…
    144|     expect(errados).toEqual([])
    145|     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
       |                                           ^
    146|     expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13…
    147|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/4]⎯

 FAIL  test/orquestrador-triador-aceite.test.ts > aceite do triador (spec 7f-a §7.2) > (primeiro-dia) o 1006 sai R1 firme pela D6b, com o vermelho :137 e o enforcement de prova, nos dois instantes
AssertionError: expected { instante: 'bloqueio', …(3) } to deeply equal { instante: 'bloqueio', …(3) }

- Expected
+ Received

  Object {
-   "classe": "R1",
-   "firme": true,
+   "classe": "R1?",
+   "firme": false,
    "instante": "bloqueio",
-   "regra": "D6b",
+   "regra": "D6",
  }

 ❯ test/orquestrador-triador-aceite.test.ts:170:78
    168|     for (const instante of ['bloqueio', 'passada'] as const) {
    169|       const x = (await triarTodos('primeiro-dia', instante)).get(caso)…
    170|       expect({ instante, classe: x.classe, firme: x.firme, regra: x.re…
       |                                                                              ^
    171|       expect(evidenciaCasa(x.evidencia, esp.evidencia ?? []), JSON.str…
    172|       expect(x.evidencia.map((e) => `${e.arquivo}:${e.linha}`)).toEqua…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/4]⎯

 Test Files  2 failed | 1 passed (3)
      Tests  4 failed | 23 passed (27)
   Start at  15:31:29
   Duration  3.80s (transform 226ms, setup 0ms, collect 144ms, tests 5.30s, environment 0ms, prepare 148ms)


```

### Verde (`peca1-verde.txt`)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 282ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 526ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1303ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 605ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 576ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 44ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 2950ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3411ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 824ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1401ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 793ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 350ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 4060ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 612ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 706ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 674ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 796ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 730ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 595ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 529ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 4118ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 484ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 848ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 823ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 809ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 1128ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 4777ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 736ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 782ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 778ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe 345ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 793ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 446ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 410ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 378ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 4919ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 1041ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 2233ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 716ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 645ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 3658ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 1963ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 951ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 462ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 6051ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1271ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 770ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 526ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 502ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 475ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 355ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 652ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 545ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 847ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10366ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1055ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1596ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4786ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 429ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 516ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 378ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 366ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 300ms
 Test Files  14 passed (14)
      Tests  107 passed (107)
```

## Peça 2 · sem evidência, sem modelo

Comando: `TZ=UTC npx vitest run test/orquestrador-triador-sem-tentativa.test.ts` (vermelho) e as suítes do triador e do resolvedor (verde).

Vermelho por asserção: `expected [ …(7) ] to deeply equal []`: o stub do `claude` rodou 7 vezes, uma por bloqueado sem tentativa, como em 11/10; a regra não era D0 e o remédio não citava as dependências. Pronto: zero chamada, `custo.json` vazio, rodar de novo dá `mesma_assinatura` e continua zero; os remédios:

```
517a  bloqueado sem tentativa; espera humano:ghl-evento-oportunidade-confirmado (sem liberação): decisão humana
518   bloqueado sem tentativa; espera 517 (pendente): decisão humana
519   bloqueado sem tentativa; espera 517 (pendente): decisão humana
520   bloqueado sem tentativa; espera 517 (pendente), 518 (bloqueado), 519 (bloqueado): decisão humana
521   bloqueado sem tentativa; espera 519 (bloqueado), 520 (bloqueado): decisão humana
527   bloqueado sem tentativa; espera humano:506-causa-corrigida (sem liberação): decisão humana
532   bloqueado sem tentativa; espera humano:ghl-escopo-users-confirmado (sem liberação): decisão humana
```
(516, 515 e 496 estão `done`; `humano:fonte-etapa-ghl-conversa-decidida` está liberado: não aparecem.)

### Vermelho (saída crua, `peca2-vermelho.txt`)

```
 }

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-sem-tentativa.test.ts > peça 2: sem evidência, sem modelo (os 7 do Actus de 11/10) > nenhum dos 7 chama o modelo nem reserva teto: o stub não roda e o ledger fica vazio
AssertionError: expected [ …(7) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	6137",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	4556",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	4682",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	4417",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	4226",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	4410",
+   "-p --output-format json --model claude-opus-5-5 --allowedTools  --max-turns 1 --max-budget-usd 0.6	5754",
+ ]

 ❯ test/orquestrador-triador-sem-tentativa.test.ts:70:24
     68|     const rs = await triar()
     69|     expect(rs.map((r) => r.id).sort()).toEqual(IDS)
     70|     expect(chamadas()).toEqual([])
       |                        ^
     71|     expect(ledger()).toEqual({})
     72|     for (const r of rs) expect({ id: r.id, modelo: r.diagnostico?.mode…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/3]⎯

 FAIL  test/orquestrador-triador-sem-tentativa.test.ts > peça 2: sem evidência, sem modelo (os 7 do Actus de 11/10) > cada um sai "bloqueado sem tentativa" (D0), com a nota do ticket de evidência
AssertionError: expected { id: '517a', classe: null, …(3) } to deeply equal { id: '517a', classe: null, …(3) }

- Expected
+ Received

  Object {
    "classe": null,
    "firme": false,
    "id": "517a",
-   "regra": "D0",
-   "rotulo": "bloqueado sem tentativa",
+   "regra": null,
+   "rotulo": "sem regra",
  }

 ❯ test/orquestrador-triador-sem-tentativa.test.ts:82:100


⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/3]⎯

 FAIL  test/orquestrador-triador-sem-tentativa.test.ts > peça 2: sem evidência, sem modelo (os 7 do Actus de 11/10) > a dependência ainda não done (ou o portão humano sem liberação) aparece no remédio; a done e a liberada não
AssertionError: expected { …(7) } to deeply equal { …(7) }

- Expected
+ Received

  Object {
-   "517a": "bloqueado sem tentativa; espera humano:ghl-evento-oportunidade-confirmado (sem liberação): decisão humana",
-   "518": "bloqueado sem tentativa; espera 517 (pendente): decisão humana",
-   "519": "bloqueado sem tentativa; espera 517 (pendente): decisão humana",
-   "520": "bloqueado sem tentativa; espera 517 (pendente), 518 (bloqueado), 519 (bloqueado): decisão humana",
-   "521": "bloqueado sem tentativa; espera 519 (bloqueado), 520 (bloqueado): decisão humana",
-   "527": "bloqueado sem tentativa; espera humano:506-causa-corrigida (sem liberação): decisão humana",
-   "532": "bloqueado sem tentativa; espera humano:ghl-escopo-users-confirmado (sem liberação): decisão humana",
+   "517a": "sem tentativa na série: decisão humana",
+   "518": "sem tentativa na série: decisão humana",
+   "519": "sem tentativa na série: decisão humana",
+   "520": "sem tentativa na série: decisão humana",
+   "521": "sem tentativa na série: decisão humana",
+   "527": "sem tentativa na série: decisão humana",
+   "532": "sem tentativa na série: decisão humana",
  }

 ❯ test/orquestrador-triador-sem-tentativa.test.ts:89:17
     87|   it('a dependência ainda não done (ou o portão humano sem liberação) …
     88|     const rem = Object.fromEntries((await triar()).map((r) => [r.id, r…
     89|     expect(rem).toEqual({
       |                 ^
     90|       '517a': 'bloqueado sem tentativa; espera humano:ghl-evento-oport…
     91|       '518': 'bloqueado sem tentativa; espera 517 (pendente): decisão …

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/3]⎯

 Test Files  1 failed (1)
      Tests  3 failed (3)
   Start at  15:35:17
   Duration  350ms (transform 59ms, setup 0ms, collect 12ms, tests 206ms, environment 0ms, prepare 38ms)


```

### Verde (`peca2-verde.txt`)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 273ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 80ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 510ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1252ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 594ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 544ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 27ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 3571ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 624ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 581ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 519ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 626ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 722ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 3050ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 4092ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 859ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 2047ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 853ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 302ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 565ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 498ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 3714ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 485ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 662ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 646ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 736ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 1158ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 4436ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 718ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 685ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 631ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 782ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 435ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 417ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 404ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 4510ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 969ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 1849ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 716ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 697ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 3499ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 1886ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 927ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 389ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 5876ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1996ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 608ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 449ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 412ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 428ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 322ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 483ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 392ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 689ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10258ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1084ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1512ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4758ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 426ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 505ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 390ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 357ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 307ms
 Test Files  15 passed (15)
      Tests  110 passed (110)
```

## Peça 3 · custo real sempre

Comando: `TZ=UTC npx vitest run test/orquestrador-triador-custo-real.test.ts` (vermelho) e as suítes do triador e do resolvedor (verde).

Vermelho por asserção, 5 de 7 (os 2 que já passavam são garantias que existiam: o erro com custo, desde a 7f-b1b, e a recusa sob teste): o 243 com o binário ausente grava `custo_usd: null`; 8 que não começam deixam 5 entradas nulas e o teto cheio (a 9ª seria `pulado`); não há reserva durante a chamada; o timeout não marca `custo_desconhecido`; 3 de US$ 0,25 e 5 que não começaram somam US$ 2,55, não 0,75. Pronto: o teto do dia só conta gasto real (e o pior caso de chamada que começou e não devolveu custo).

### Vermelho (saída crua, `peca3-vermelho.txt`)

```
-7

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 5 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-triador-custo-real.test.ts > peça 3: custo real sempre > o 243 de 11/10: claude fora do PATH (a chamada nem começa) não fica no ledger nem no teto
AssertionError: expected { modelo: 'claude-opus-5-5', …(9) } to deeply equal ObjectContaining{…}

- Expected
+ Received

- ObjectContaining {
-   "descartado": ObjectContaining {
-     "regra": "nao_iniciou",
+ Object {
+   "cortes": Array [],
+   "custo_usd": null,
+   "descartado": Object {
+     "regra": "envelope_ilegivel",
+     "trecho": "rc 127: (stdout vazio)",
    },
-   "erro": StringMatching /^claude não iniciou \(ENOENT\)/,
+   "duracao_ms": 1,
+   "entrada_tokens_est": 2960,
+   "envelope_bruto": "",
+   "erro": "envelope ilegível (rc 127)",
+   "modelo": "claude-opus-5-5",
+   "tokens_in": null,
+   "tokens_out": null,
  }

 ❯ test/orquestrador-triador-custo-real.test.ts:84:24
     82|     expect(p.ctx.ext.classe).toBeNull()
     83|     const r = p.chama()
     84|     expect(r.registro).toEqual(expect.objectContaining({ erro: expect.…
       |                        ^
     85|     expect(ledgerHoje()).toEqual([])
     86|     expect(p.gasto()).toBe(0)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/5]⎯

 FAIL  test/orquestrador-triador-custo-real.test.ts > peça 3: custo real sempre > 8 chamadas que não começam (os 8 de 11/10) não consomem o teto: a 9ª, de verdade, sai
AssertionError: expected [ { …(6) }, { …(6) }, { …(6) }, …(2) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   Object {
+     "assinatura": "a09f5b1c9cdff03b05ee953ca6834f5067c6894e10479f2929b08b6d33a3a020",
+     "custo_usd": null,
+     "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
+   },
+   Object {
+     "assinatura": "a09f5b1c9cdff03b05ee953ca6834f5067c6894e10479f2929b08b6d33a3a020",
+     "custo_usd": null,
+     "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
+   },
+   Object {
+     "assinatura": "a09f5b1c9cdff03b05ee953ca6834f5067c6894e10479f2929b08b6d33a3a020",
+     "custo_usd": null,
+     "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
+   },
+   Object {
+     "assinatura": "a09f5b1c9cdff03b05ee953ca6834f5067c6894e10479f2929b08b6d33a3a020",
+     "custo_usd": null,
+     "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
+   },
+   Object {
+     "assinatura": "a09f5b1c9cdff03b05ee953ca6834f5067c6894e10479f2929b08b6d33a3a020",
+     "custo_usd": null,
+     "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
+   },
+ ]

 ❯ test/orquestrador-triador-custo-real.test.ts:93:26
     91|     const p = await passo243()
     92|     for (let i = 0; i < 8; i++) p.chama()
     93|     expect(ledgerHoje()).toEqual([])
       |                          ^
     94|     process.env.ORQ_TRIADOR_CLAUDE = STUB
     95|     const r = p.chama()

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/5]⎯

 FAIL  test/orquestrador-triador-custo-real.test.ts > peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real
AssertionError: expected [] to deeply equal [ ObjectContaining{…} ]

- Expected
+ Received

- Array [
-   ObjectContaining {
-     "custo_usd": null,
-     "id": "243",
-     "reserva": true,
-   },
- ]
+ Array []

 ❯ test/orquestrador-triador-custo-real.test.ts:112:21
    110|     p.chama()
    111|     const durante = (JSON.parse(readFileSync(visto, 'utf8')) as { dias…
    112|     expect(durante).toEqual([expect.objectContaining({ id: '243', cust…
       |                     ^
    113|     expect(ledgerHoje()).toEqual([{ repo: 'conteudos-infinitos', id: '…
    114|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/5]⎯

 FAIL  test/orquestrador-triador-custo-real.test.ts > peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida
AssertionError: expected [ { …(6) } ] to deeply equal [ ObjectContaining{…} ]

- Expected
+ Received

  Array [
-   ObjectContaining {
-     "custo_desconhecido": true,
+   Object {
+     "assinatura": "155d06f1111e613627becbdaec2777da87785b8dbdaa2fd1ebe02dd5524560f6",
      "custo_usd": null,
      "id": "243",
+     "repo": "conteudos-infinitos",
+     "tokens_in": null,
+     "tokens_out": null,
    },
  ]

 ❯ test/orquestrador-triador-custo-real.test.ts:133:26
    131|     const p = await passo243({ ...CFG, timeout_secs: 1 })
    132|     p.chama()
    133|     expect(ledgerHoje()).toEqual([expect.objectContaining({ id: '243',…
       |                          ^
    134|     expect(ledgerHoje()[0].reserva).toBeUndefined()
    135|     expect(p.gasto()).toBeCloseTo(0.6, 6)

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/5]⎯

 FAIL  test/orquestrador-triador-custo-real.test.ts > peça 3: custo real sempre > o teto do dia só conta gasto real: 3 chamadas de US$ 0,25 e 5 que não começaram somam US$ 0,75
AssertionError: expected 2.5500000000000003 to be close to 0.75, received difference is 1.8000000000000003, but expected 5e-7
 ❯ test/orquestrador-triador-custo-real.test.ts:150:23
    148|     process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
    149|     for (let i = 0; i < 5; i++) p.chama()
    150|     expect(p.gasto()).toBeCloseTo(0.75, 6)
       |                       ^
    151|     expect(ledgerHoje()).toHaveLength(3)
    152|   })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/5]⎯

 Test Files  1 failed (1)
      Tests  5 failed | 2 passed (7)
   Start at  15:37:55
   Duration  1.68s (transform 59ms, setup 0ms, collect 13ms, tests 1.53s, environment 0ms, prepare 30ms)


```

### Verde (`peca3-verde.txt`)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 183ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 448ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 69ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1143ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 566ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 470ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1500ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1013ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 41ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 2665ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3523ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 732ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1410ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 1008ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 337ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 3702ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 564ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 591ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 654ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 737ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 718ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 510ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 437ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 4446ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 924ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 1961ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 683ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 609ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 4248ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 643ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 692ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 683ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 794ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 411ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 355ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 355ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 3564ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 493ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 733ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 756ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 674ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 886ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 3314ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 1833ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 795ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 429ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 5677ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1252ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 693ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 447ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 454ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 418ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 352ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 623ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 529ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 819ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10176ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1027ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1514ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4794ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 387ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 577ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 349ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 363ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 301ms
 Test Files  16 passed (16)
      Tests  117 passed (117)
```

## Peça 4 · teto por prioridade

Comando: `TZ=UTC npx vitest run test/orquestrador-resolvedor-prioridade.test.ts` (vermelho) e as suítes do triador e do resolvedor (verde).

Vermelho por asserção, a reprodução de 11/10: `expected { comarka: 'teto_dia', … } to deeply equal { comarka: 'chamou US$ 0.25', … }`. Com US$ 4,30 de US$ 5,00 gastos e o Actus listado antes, o Actus chamava e o Comarka ficava `teto_dia`. Pronto: o Comarka (auto) chama, o Actus (diagnostico) fica `pulado: teto_dia`, uma chamada só no stub.

### Vermelho (saída crua, `peca4-vermelho.txt`)

```
 ]

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-resolvedor-prioridade.test.ts > peça 4: teto por prioridade (auto, depois sombra, depois diagnostico) > com o teto quase cheio, o Comarka (auto) chama o modelo e o Actus (diagnostico), listado antes, fica pulado
AssertionError: expected { comarka: 'teto_dia', …(1) } to deeply equal { comarka: 'chamou US$ 0.25', …(1) }

- Expected
+ Received

  Object {
-   "actus": "teto_dia",
-   "comarka": "chamou US$ 0.25",
+   "actus": "chamou US$ 0.25",
+   "comarka": "teto_dia",
  }

 ❯ test/orquestrador-resolvedor-prioridade.test.ts:68:99
     66|     const modelo = (repo: string, id: string) => (JSON.parse(readFileS…
     67|     const pulado = (repo: string, id: string) => (modelo(repo, id).pul…
     68|     expect({ comarka: pulado('comarka-operacional', '559'), actus: pul…
       |                                                                                                   ^
     69|     expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-…
     70|     expect(readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n'…

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  test/orquestrador-resolvedor-prioridade.test.ts > peça 4: teto por prioridade (auto, depois sombra, depois diagnostico) > a ordem dos repos: auto antes de sombra antes de diagnostico; empate na ordem do repos.json
AssertionError: expected undefined to deeply equal [ 'a1', 'a2', 's1', 'd1', 'd2' ]

- Expected: 
Array [
  "a1",
  "a2",
  "s1",
  "d1",
  "d2",
]

+ Received: 
undefined

 ❯ test/orquestrador-resolvedor-prioridade.test.ts:82:51
     80|       { nome: 'a2', modos: { padrao: 'auto' } },
     81|     ]
     82|     expect(ordenarRepos?.(rs).map((r) => r.nome)).toEqual(['a1', 'a2',…
       |                                                   ^
     83|   })
     84| })

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed (2)
   Start at  15:40:00
   Duration  270ms (transform 86ms, setup 0ms, collect 22ms, tests 128ms, environment 0ms, prepare 27ms)


```

### Verde (`peca4-verde.txt`)

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 149ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 422ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 61ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1133ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 553ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 472ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1534ms
   ✓ peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real 338ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1009ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 102ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 39ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3308ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 783ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1465ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 727ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 301ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 2631ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 3561ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 545ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 555ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 617ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 711ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 676ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 509ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 448ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 4366ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 897ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 1913ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 662ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 610ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 4286ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 642ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 669ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 689ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe 306ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 895ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 370ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 346ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 344ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 3536ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 485ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 750ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 709ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 654ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 913ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 3256ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 1862ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 734ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 419ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 5747ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1400ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 662ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 469ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 430ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 428ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 310ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 595ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 511ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 851ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 10163ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1088ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1507ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4718ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 388ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 567ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 349ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 370ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 305ms
 Test Files  17 passed (17)
      Tests  119 passed (119)
```

## Peça 5 · docs

CONTRATO §15 (D6b, D0, custo real, prioridade, testes), mais as tabelas de §13.3 (D0 e D6b, linhas novas do `extrair.ts`), §13.4 (`reserva` e `custo_desconhecido` no `custo.json`), §13.5 (teto e o descarte `nao_iniciou`), §14.1 (ordem dos repos) e §14.2 (R1 por D6 ou D6b). CHANGELOG com a seção da 7f-b3 e as asserções que mudaram. PECAS: a etapa em FEITAS e três pendentes (o `claude` no PATH do job, o teto entre passadas, a assinatura do 243 que muda a cada 30 min). Docs não têm vermelho.

## Matriz da extração, antes e depois da peça 1

`npx tsx matriz.mts <kit>`: `lerCasoDeFixture` + `extrair` em cada caso, nos dois instantes (bloqueio e passada). `<<FIRME ERRADO` marcaria firme com classe diferente da esperada (controle e cortados esperam nenhuma classe e proíbem firme).

### Antes (`0e30a77` + a fixture do 1006)

```
37	01-559-L55054	esperado R3	bloqueio: R4? (D9)	passada: R4? (D9)
37	02-559-L55209	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	03-627-L55356	esperado R2	bloqueio: R4? (D9)	passada: R4? (D9)
37	04-600-L55898	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	05-627b-L56021	esperado R2	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	06-549c-L57053	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	07-627j-L57368	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	08-635-L58105	esperado R3	bloqueio: R5? (D7)	passada: R5? (D7)
37	09-654-L59896	esperado R1	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	10-407a-L64280	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	11-689-L65280	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	12-691-L65374	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	13-346d-L66187	esperado R1	bloqueio: R1? (D6)	passada: R1? (D6)
37	14-407a-L67585	esperado R2	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	15-722-L67970	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	16-723-L68736	esperado R6	bloqueio: R6 FIRME (D2)	passada: R6 FIRME (D2)
37	17-715-L68793	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	18-737-L69920	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	19-739-L71699	esperado R3	bloqueio: R1? (D8)	passada: R1? (D8)
37	20-801-L72121	esperado R5	bloqueio: R5 FIRME (D4)	passada: R5 FIRME (D4)
37	21-760-L72407	esperado R5	bloqueio: R5? (D7)	passada: R5 FIRME (D5)
37	22-762-L72665	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	23-856-L73817	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	24-867-L76790	esperado R3	bloqueio: R2? (D12)	passada: R2? (D12)
37	25-711a-L78138	esperado R1	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	26-711b3-L78647	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	27-741-L79081	esperado R4	bloqueio: R2? (D12)	passada: R2? (D12)
37	28-707-L79202	esperado R7	bloqueio: R4? (D9)	passada: R4? (D9)
37	29-826-L80362	esperado R3	bloqueio: - (-)	passada: - (-)
37	30-900-L81564	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	31-898-L82594	esperado R5	bloqueio: R5? (D7)	passada: R5 FIRME (D5)
37	32-741a-L82726	esperado R5	bloqueio: R5 FIRME (D5)	passada: R5 FIRME (D5)
37	33-707-L83026	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	34-898-L83625	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	35-950-L85145	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	36-940-L85222	esperado R5	bloqueio: R5 FIRME (D1)	passada: R5 FIRME (D1)
37	37-932-L85272	esperado R5	bloqueio: R5 FIRME (D1)	passada: R5 FIRME (D1)
controle	01-633-L57993	esperado -	bloqueio: - (-)	passada: - (-)
controle	02-671d-L61424	esperado -	bloqueio: - (-)	passada: - (-)
controle	03-624-L71231	esperado -	bloqueio: - (-)	passada: - (-)
controle	04-694-L77408	esperado -	bloqueio: - (-)	passada: - (-)
controle	05-627e-L56919	esperado -	bloqueio: - (-)	passada: - (-)
controle	06-656-L60917	esperado -	bloqueio: - (-)	passada: - (-)
controle	07-808-L75301	esperado -	bloqueio: - (-)	passada: - (-)
controle	08-706-L77972	esperado -	bloqueio: - (-)	passada: - (-)
controle	09-367-L80446	esperado -	bloqueio: - (-)	passada: - (-)
controle	10-891-L81042	esperado -	bloqueio: - (-)	passada: - (-)
controle	11-907-L83771	esperado -	bloqueio: - (-)	passada: - (-)
controle	12-707a-L83293	esperado -	bloqueio: - (-)	passada: - (-)
controle	13-868-L78232	esperado -	bloqueio: - (-)	passada: - (-)
controle	14-860-L72627	esperado -	bloqueio: - (-)	passada: - (-)
controle	15-650-L59553	esperado -	bloqueio: - (-)	passada: - (-)
controle	16-712-L68241	esperado -	bloqueio: - (-)	passada: - (-)
controle	17-662b-L60556	esperado -	bloqueio: - (-)	passada: - (-)
controle	18-735-L69839	esperado -	bloqueio: - (-)	passada: - (-)
controle	19-648-L59226	esperado -	bloqueio: - (-)	passada: - (-)
controle	20-744-L72998	esperado -	bloqueio: - (-)	passada: - (-)
cortados	01-671d-L61399	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	02-624-L71202	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	03-627e-L56882	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	04-808-L75274	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	05-367-L80416	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
primeiro-dia	01-1006-L88744	esperado R1	bloqueio: R1? (D6)	passada: R1? (D6)
-- firmes errados (dois instantes): 0
```

### Depois (`d38289e` em diante; igual em `3d4f19c`)

```
37	01-559-L55054	esperado R3	bloqueio: R4? (D9)	passada: R4? (D9)
37	02-559-L55209	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	03-627-L55356	esperado R2	bloqueio: R4? (D9)	passada: R4? (D9)
37	04-600-L55898	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	05-627b-L56021	esperado R2	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	06-549c-L57053	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	07-627j-L57368	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	08-635-L58105	esperado R3	bloqueio: R5? (D7)	passada: R5? (D7)
37	09-654-L59896	esperado R1	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	10-407a-L64280	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	11-689-L65280	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	12-691-L65374	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	13-346d-L66187	esperado R1	bloqueio: R1 FIRME (D6b)	passada: R1 FIRME (D6b)
37	14-407a-L67585	esperado R2	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	15-722-L67970	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	16-723-L68736	esperado R6	bloqueio: R6 FIRME (D2)	passada: R6 FIRME (D2)
37	17-715-L68793	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	18-737-L69920	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	19-739-L71699	esperado R3	bloqueio: R1? (D8)	passada: R1? (D8)
37	20-801-L72121	esperado R5	bloqueio: R5 FIRME (D4)	passada: R5 FIRME (D4)
37	21-760-L72407	esperado R5	bloqueio: R5? (D7)	passada: R5 FIRME (D5)
37	22-762-L72665	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	23-856-L73817	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	24-867-L76790	esperado R3	bloqueio: R2? (D12)	passada: R2? (D12)
37	25-711a-L78138	esperado R1	bloqueio: R1|R2? (D11)	passada: R1|R2? (D11)
37	26-711b3-L78647	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	27-741-L79081	esperado R4	bloqueio: R2? (D12)	passada: R2? (D12)
37	28-707-L79202	esperado R7	bloqueio: R4? (D9)	passada: R4? (D9)
37	29-826-L80362	esperado R3	bloqueio: - (-)	passada: - (-)
37	30-900-L81564	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	31-898-L82594	esperado R5	bloqueio: R5? (D7)	passada: R5 FIRME (D5)
37	32-741a-L82726	esperado R5	bloqueio: R5 FIRME (D5)	passada: R5 FIRME (D5)
37	33-707-L83026	esperado R4	bloqueio: R4? (D9)	passada: R4? (D9)
37	34-898-L83625	esperado R2	bloqueio: R2? (D12)	passada: R2? (D12)
37	35-950-L85145	esperado R1	bloqueio: R1 FIRME (D6)	passada: R1 FIRME (D6)
37	36-940-L85222	esperado R5	bloqueio: R5 FIRME (D1)	passada: R5 FIRME (D1)
37	37-932-L85272	esperado R5	bloqueio: R5 FIRME (D1)	passada: R5 FIRME (D1)
controle	01-633-L57993	esperado -	bloqueio: - (-)	passada: - (-)
controle	02-671d-L61424	esperado -	bloqueio: - (-)	passada: - (-)
controle	03-624-L71231	esperado -	bloqueio: - (-)	passada: - (-)
controle	04-694-L77408	esperado -	bloqueio: - (-)	passada: - (-)
controle	05-627e-L56919	esperado -	bloqueio: - (-)	passada: - (-)
controle	06-656-L60917	esperado -	bloqueio: - (-)	passada: - (-)
controle	07-808-L75301	esperado -	bloqueio: - (-)	passada: - (-)
controle	08-706-L77972	esperado -	bloqueio: - (-)	passada: - (-)
controle	09-367-L80446	esperado -	bloqueio: - (-)	passada: - (-)
controle	10-891-L81042	esperado -	bloqueio: - (-)	passada: - (-)
controle	11-907-L83771	esperado -	bloqueio: - (-)	passada: - (-)
controle	12-707a-L83293	esperado -	bloqueio: - (-)	passada: - (-)
controle	13-868-L78232	esperado -	bloqueio: - (-)	passada: - (-)
controle	14-860-L72627	esperado -	bloqueio: - (-)	passada: - (-)
controle	15-650-L59553	esperado -	bloqueio: - (-)	passada: - (-)
controle	16-712-L68241	esperado -	bloqueio: - (-)	passada: - (-)
controle	17-662b-L60556	esperado -	bloqueio: - (-)	passada: - (-)
controle	18-735-L69839	esperado -	bloqueio: - (-)	passada: - (-)
controle	19-648-L59226	esperado -	bloqueio: - (-)	passada: - (-)
controle	20-744-L72998	esperado -	bloqueio: - (-)	passada: - (-)
cortados	01-671d-L61399	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	02-624-L71202	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	03-627e-L56882	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	04-808-L75274	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
cortados	05-367-L80416	esperado -	bloqueio: R1? (D6)	passada: R1? (D6)
primeiro-dia	01-1006-L88744	esperado R1	bloqueio: R1 FIRME (D6b)	passada: R1 FIRME (D6b)
-- firmes errados (dois instantes): 0
```

### Diferença

```
13c13
< 37	13-346d-L66187	esperado R1	bloqueio: R1? (D6)	passada: R1? (D6)
> 37	13-346d-L66187	esperado R1	bloqueio: R1 FIRME (D6b)	passada: R1 FIRME (D6b)
63c63
< primeiro-dia	01-1006-L88744	esperado R1	bloqueio: R1? (D6)	passada: R1? (D6)
> primeiro-dia	01-1006-L88744	esperado R1	bloqueio: R1 FIRME (D6b)	passada: R1 FIRME (D6b)
```

Placar dos 37 na passada: antes 15 firmes certos, 14 palpites certos, 7 errados, 1 sem regra; depois 16, 13, 7, 1. Firmes errados: 0 antes e 0 depois, nos 37, nos 20 de controle, nos 5 cortados e no 1006, nos dois instantes. Os cortados seguem `R1?` (D6): a D6b exige que a série tenha parado no enforcement, e eles param no vitest.

## Suítes, uma de cada vez, em `3d4f19c`

1. `npx tsc --noEmit`: **rc 0**, sem saída.
2. `TZ=UTC npx vitest run`: **rc 0**

```
 Test Files  83 passed (83)
      Tests  1511 passed (1511)
   Duration  44.64s (transform 911ms, setup 0ms, collect 17.84s, tests 304.89s, environment 10ms, prepare 3.01s)
```

3. `bash scripts/kit/test-shell.sh`: **rc 0** (o `test-preflight.sh` roda com um `claude` falso que reprova se for chamado)

```
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
TODOS OK
TODOS OS CHECKS PASSARAM
TODOS OS CHECKS PASSARAM
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

## O ledger de custo de hoje: proposta (nada foi mexido em `~/.orq`)

As 8 entradas de `2026-10-11` em `~/.orq/diagnosticos/custo.json` são chamadas que não
começaram (prova no PASSO 0). Com o motor da 7f-b3, nenhuma delas existiria: a reserva
seria devolvida. Elas são as únicas entradas do dia.

**Proposta: corrigir, tirando as 8 entradas.** No efeito é o mesmo que zerar o dia, mas
fica explícito o que sai e por quê, e protege uma entrada real que entre antes do humano
rodar. Sai só entrada de 11/10 com `custo_usd: null` E assinatura de uma das 8:

```bash
cp ~/.orq/diagnosticos/custo.json ~/.orq/diagnosticos/custo.json.antes-7f-b3
jq '.dias["2026-10-11"] |= map(select(.custo_usd != null or ((.assinatura | IN("4849939e6dbdf29b9afdc394221821985dcb009a02f408d45f4c4ef94d322615", "99d5870a1f412b33a50e8a6393e5f5cd614c56a99282f356ce63be0760fab299", "20ce76d2be1d0798ea656b1041d4aa775e2d64fdb3edbbd75edd80bd37db4310", "730cd02b037d23eaf495c64c98e75a56a82b40236a0d1265dbe80cc90b2fd911", "ae97c1ba089b357933048e26780289de7225061690ea7ce34abf4d9c092994ab", "042863b08fd5dbf580299ac0fcacc8daaae8f2be861d33302ad3ad9914d5a27d", "b0500513190553903dab6117d1b7e5ab65d8ecabad6df21574fe5712e0c1e929", "9ba60bbed3abaa8933353982a9fd1a52af46f904e412b50e321ef682593683d1")) | not)))' \
  ~/.orq/diagnosticos/custo.json.antes-7f-b3 > ~/.orq/diagnosticos/custo.json
```

Testado numa cópia do ledger no scratchpad: dá `{"dias":{"2026-10-11":[]}}`; e num ledger sintético, mantém a entrada nula de outra assinatura e a entrada com custo de uma das 8. Conferir: `jq '.dias["2026-10-11"] | length' ~/.orq/diagnosticos/custo.json` dá 0 (ou só as
entradas reais que entraram depois).

Rodar com o job pausado (`touch ~/.orq/RESOLVEDOR_PAUSADO`, depois `rm`), para a passada
não gravar no meio. Sem a correção, o teto de hoje segue cheio até 00:00 UTC; o motor
novo não reinterpreta essas 8 (entrada nula sem marca conta o pior caso, de propósito).

## O que muda depois do merge (para o humano saber o que esperar)

- **O job continua sem `claude` no PATH.** Toda chamada do modelo sai
  `modelo.descartado.regra = nao_iniciou`, sem custo e sem teto. Pôr `~/.local/bin` no
  PATH do plist liga o gasto real do job: é decisão do chat do programa (PECAS, pendente).
- Os 7 do Actus mudam de assinatura uma vez (o estado das dependências entra nela) e são
  triados de novo como D0, sem modelo.
- Um 1006 novo (enforcement no teste vermelho da tentativa anterior) sai R1 firme D6b e,
  com R1 em `auto` no Comarka, o resolvedor põe o teste na allowlist com guarda e reabre,
  como o humano fez.
- A ordem da passada passa a ser comarka-operacional, depois conteudos-infinitos e
  actus-saas (os dois em diagnostico, na ordem do repos.json).

## Fixtures (o que entrou e de onde)

- `test/fixtures/triador-7f/primeiro-dia/01-1006-L88744`: `montar.py --so-primeiro-dia`
  (a mesma `monta_caso` dos 37, só leitura do Comarka); esperado R1 pelo
  `~/orq-sessoes/conserto-1006.md`.
- `test/fixtures/triador-sem-tentativa/actus-1110`: `montar.py` (só leitura do Actus): o
  1º bloco json dos 7 (mascarado), das dependências só id, slug e status, os tokens
  `humano:` envolvidos do `liberacoes.json`, `runs/events.log` vazio e o `diff_cap`.
- `test/fixtures/triador-custo-real/conteudos-243`: `montar.py`: a cópia da evidência que o
  triador gravou do 243 (`~/.orq/diagnosticos/conteudos-infinitos/243/0a6368fbb44b/evidencia`)
  mais o `runs/243/meta.json` do repo, mascarados.

Nos três repos, esta sessão só leu: `cat`, `ls`, `grep` e `git show`/`log`/`status` com `GIT_OPTIONAL_LOCKS=0`. Não guardei um `git status` de antes para comparar; as mudanças que aparecem no `git status --short` do comarka (`?? docs/fila/960-…`) não são desta sessão.

## Diff cru

`git diff 0e30a77..3d4f19c`, sem o conteúdo das três fixtures de dados (os `montar.py` estão no diff). Stat das fixtures:

```
 .../01-1006-L88744/attempt-1/claude-output.txt     |  21 ++
 .../01-1006-L88744/attempt-1/diff.stat             |   7 +
 .../01-1006-L88744/attempt-1/enforcement.json      |   4 +
 .../01-1006-L88744/attempt-1/gate-tsc.txt          |   3 +
 .../attempt-1/gate-vitest.linhas.json              | 157 +++++++++++
 .../01-1006-L88744/attempt-1/gate-vitest.txt       | 186 +++++++++++++
 .../primeiro-dia/01-1006-L88744/attempt-1/head.txt |   1 +
 .../01-1006-L88744/attempt-1/presenca.json         |  11 +
 .../01-1006-L88744/attempt-2/claude-output.txt     |  12 +
 .../01-1006-L88744/attempt-2/diff.stat             |   8 +
 .../01-1006-L88744/attempt-2/enforcement.json      |   9 +
 .../primeiro-dia/01-1006-L88744/attempt-2/head.txt |   1 +
 .../01-1006-L88744/attempt-2/presenca.json         |   9 +
 .../primeiro-dia/01-1006-L88744/caso.json          |  12 +
 .../primeiro-dia/01-1006-L88744/config.json        |   6 +
 .../primeiro-dia/01-1006-L88744/esperado.json      |  17 ++
 .../test/quem-cuida.test.ts.fonte                  | 191 ++++++++++++++
 .../triador-7f/primeiro-dia/01-1006-L88744/log.txt |  32 +++
 .../primeiro-dia/01-1006-L88744/meta.json          |  18 ++
 .../primeiro-dia/01-1006-L88744/serie.json         |  10 +
 .../primeiro-dia/01-1006-L88744/ticket.json        | 279 ++++++++++++++++++++
 .../primeiro-dia/01-1006-L88744/vizinhos.tsv       |   2 +
 .../fila/243-rota-e-tela-publica-de-aprovacao.md   | 290 +++++++++++++++++++++
 .../docs/fila/runs/243/attempt-0/criterios.txt     | 135 ++++++++++
 .../docs/fila/runs/243/attempt-0/diff.patch        | 261 +++++++++++++++++++
 .../docs/fila/runs/243/attempt-0/enforcement.json  |   9 +
 .../docs/fila/runs/243/attempt-0/gates.txt         |   6 +
 .../docs/fila/runs/243/attempt-1/criterios.txt     | 140 ++++++++++
 .../docs/fila/runs/243/attempt-1/diff.patch        | 274 +++++++++++++++++++
 .../docs/fila/runs/243/attempt-1/enforcement.json  |   4 +
 .../docs/fila/runs/243/attempt-1/gates.txt         |   6 +
 .../fila/runs/243/attempt-1/juiz.veredito.json     |   1 +
 .../docs/fila/runs/243/attempt-2/criterios.txt     | 140 ++++++++++
 .../docs/fila/runs/243/attempt-2/diff.patch        | 288 ++++++++++++++++++++
 .../docs/fila/runs/243/attempt-2/enforcement.json  |   4 +
 .../docs/fila/runs/243/attempt-2/gates.txt         |   6 +
 .../fila/runs/243/attempt-2/juiz.veredito.json     |   1 +
 .../conteudos-243/docs/fila/runs/243/meta.json     |  42 +++
 .../conteudos-243/docs/fila/runs/events.log        |  21 ++
 .../docs/fila/runs/events.log.linhas.json          |   1 +
 .../actus-1110/docs/fila/000-config.json           |   4 +
 .../docs/fila/496-reprocessar-midia-erro.md        |   9 +
 .../docs/fila/515-recon-escritor-etapa-crm.md      |   9 +
 .../docs/fila/516-golden-test-prompt-analise.md    |   9 +
 .../docs/fila/517-leitor-criterio-etapa-motor.md   |   9 +
 .../docs/fila/517a-etapa-crm-da-oportunidade.md    | 109 ++++++++
 .../docs/fila/518-prompt-criterio-etapa.md         |  40 +++
 .../docs/fila/519-criterios-shadow-schema.md       |  42 +++
 .../docs/fila/520-criterios-shadow-fiacao.md       |  40 +++
 .../docs/fila/521-criterios-shadow-telemetria.md   |  45 ++++
 .../fila/527-reprocessar-outro-historico-audio.md  |  40 +++
 .../docs/fila/532-ghl-usuarios-nome-closer.md      | 169 ++++++++++++
 .../actus-1110/docs/fila/liberacoes.json           |  13 +
 .../actus-1110/docs/fila/runs/events.log           |   0
 54 files changed, 3163 insertions(+)
```

```diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index fd7e351..798e18a 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -966,3 +966,34 @@ CONTRATO §14.
 Asserções existentes que mudaram: nenhuma fora dos testes novos da etapa. Na 7f-b2-5, dois
 testes da própria etapa (peças 2 e 3) deixaram de exigir ledger ausente: o "não consegui"
 passou a entrar no ledger, que é o pedido da peça 5; o dry-run continua sem mudar o ledger.
+
+### Etapa 7f-b3 · ajustes do primeiro dia do resolvedor (11/10/2026)
+
+O primeiro dia do job mostrou um R1 que nunca fica firme no legado (1006), um teto do dia
+comido por 8 chamadas que nem começaram (`claude` fora do PATH do job, rc 127) e repos em
+diagnóstico gastando antes do Comarka em auto. Sem chamada de API, sem launchctl, sem
+escrita em repo real. CONTRATO §15.
+
+- **7f-b3-1** `d38289e`: D6b: enforcement com uma violação `fora_do_pathspec` de um teste
+  que estava vermelho fora da allowlist e do diff (nessa tentativa ou na anterior) é R1
+  firme; `decidir` age nela como na D6. Fixture `triador-7f/primeiro-dia/01-1006-L88744`.
+  Matriz: só o 1006 e o 346d mudam (`R1?` → R1 firme, certos); zero firme errado.
+- **7f-b3-2** `d9adccc`: D0: bloqueado sem tentativa não chama nem reserva o modelo; sai
+  com a nota do ticket e as dependências ainda não done (ou `humano:` sem liberação).
+  Fixture `triador-sem-tentativa/actus-1110` (os 7 do Actus de 11/10).
+- **7f-b3-3** `e2a96ae`: custo real sempre: reserva do pior caso antes da chamada, custo
+  real do envelope depois (também em erro), devolução se o processo não começou; timeout
+  fica com o pior caso, marcado `custo_desconhecido`. Fixture
+  `triador-custo-real/conteudos-243`.
+- **7f-b3-4** `a209edb`: teto por prioridade: na passada, repos com classe em auto antes
+  dos com sombra antes dos só em diagnóstico (`ordenarRepos`).
+- **7f-b3-5**: CONTRATO §15 (e as tabelas de §13.3, §13.4, §13.5, §14.1 e §14.2), este
+  registro e `docs/PECAS.md` com os shas.
+
+Asserções existentes que mudaram (7f-b3-1), todas pelo 346d, que a D6b torna R1 firme e
+certo: firmes no instante do bloqueio 13 → 14; (B) os firmes certos 15 → 16 (o 346d sai de
+`R1?` para R1 D6b); replay da corrida da peça 6 com 21 respostas consumidas (eram 22),
+22/37 (eram 21), 21 chamadas e US$ 5,8840 (eram 22 e US$ 6,1265; a diferença é a resposta
+do 346d, US$ 0,2424); evidência equivalente sobre 7 casos (o 346d saiu da lista, agora
+certo pela medição; o total segue 28); `orq triar --fixture` grava 21
+`resposta-modelo.json` (eram 22). Nenhuma perdeu força.
diff --git a/CONTRATO.md b/CONTRATO.md
index b178d74..b2f7b63 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1046,40 +1046,43 @@ guarda o número do original.
 Regra de falta: fonte ausente entra em `falta[]` e a classe só é firme com as fontes que a
 regra usa. Nada é estimado.
 
-### 13.3 Regras (`extrair.ts:107`)
+### 13.3 Regras (`extrair.ts:108`)
 
 A primeira que casa decide; o estágio é o da última tentativa. Firme vai ao diagnóstico
 sem modelo; palpite (`?`) ou sem regra vai ao modelo, se houver orçamento.
 
 | # | condição | classe | linha |
 |---|---|---|---|
-| D1 | merge recusado por mudança local (`overwritten by merge`) e juiz aprovou | R5 árvore suja | `:184` |
-| D2 | diff-cap e diff.stat ≤ `diff_cap_linhas` | R6 | `:197` |
-| D3 | diff-cap e diff.stat > cap | R3? | `:197` |
-| D4 | `Timeout waiting for worker`/`Timeout starting`/EMFILE/ENOSPC na última tentativa | R5 máquina | `:207` |
-| D5 | o motor do kit já decidiu `base_vermelha`; ou o vermelho fora da allowlist e do diff aparece em outra família nas ±6 h | R5 base | `:214` |
-| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff; firme só com o mesmo teste vermelho fora em ≥ 2 tentativas da série, senão `R1?` (7f-b1-7) | R1 / R1? | `:229` |
-| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:245` |
-| D8 | enforcement | R1? | `:249` |
-| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:254` |
-| D10 | vitest, vermelho dentro | R2? | `:254` |
-| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:260` |
-| D12 | critério | R2? | `:260` |
+| D0 | nenhuma tentativa na série (7f-b3, §15.2): "bloqueado sem tentativa", sem modelo | sem classe | `:182` |
+| D1 | merge recusado por mudança local (`overwritten by merge`) e juiz aprovou | R5 árvore suja | `:194` |
+| D2 | diff-cap e diff.stat ≤ `diff_cap_linhas` | R6 | `:207` |
+| D3 | diff-cap e diff.stat > cap | R3? | `:207` |
+| D4 | `Timeout waiting for worker`/`Timeout starting`/EMFILE/ENOSPC na última tentativa | R5 máquina | `:217` |
+| D5 | o motor do kit já decidiu `base_vermelha`; ou o vermelho fora da allowlist e do diff aparece em outra família nas ±6 h | R5 base | `:224` |
+| D6b | enforcement na última tentativa com UMA violação, `fora_do_pathspec` de um arquivo que estava vermelho fora da allowlist e do diff nessa tentativa ou na anterior (7f-b3, §15.1) | R1 | `:239` |
+| D6 | vitest/enforcement, vermelho fora da allowlist e do diff, e o fonte em HEAD cita nome-base (≥ 4) ou diretório (≥ 5) do diff; firme só com o mesmo teste vermelho fora em ≥ 2 tentativas da série, senão `R1?` (7f-b1-7) | R1 / R1? | `:261` |
+| D7 | vitest, vermelho fora, não acoplado (ou sem fonte) | R5? | `:277` |
+| D8 | enforcement | R1? | `:281` |
+| D9 | vitest, vermelho dentro, allowlist toda em `test/` | R4? | `:286` |
+| D10 | vitest, vermelho dentro | R2? | `:286` |
+| D11 | critério e vermelho fora em tentativa anterior | R1\|R2? | `:292` |
+| D12 | critério | R2? | `:292` |
 
 Allowlist pelo `matchesAllowlist` do enforcement (`enforcement-core.ts:178`); local do
 vermelho pelo `primeiroLocal` (`diagnostico.ts:109`). A prova de um vermelho é a linha
 `FAIL`, o erro logo abaixo e o local `❯`. O que o agente disse nunca entra em regra.
 
-Placar na fixture dos 37 (estado da passada): 15 firmes certos, 0 firme errado, 14
-palpites certos, 7 errados, 1 sem regra; no instante do bloqueio, 13 firmes (760 e 898 #31
-ficam `R5?` até o vizinho aparecer). Nenhum dos 20 de controle e nenhum dos 5 de série
-cortada sai firme.
+Placar na fixture dos 37 (estado da passada): 16 firmes certos (15 até a 7f-b3; o 346d
+voltou pela D6b), 0 firme errado, 13 palpites certos, 7 errados, 1 sem regra; no instante
+do bloqueio, 14 firmes (760 e 898 #31 ficam `R5?` até o vizinho aparecer). Nenhum dos 20
+de controle e nenhum dos 5 de série cortada sai firme.
 
 A restrição da D6 (7f-b1-7, decisão do chat do programa) existe porque um vermelho fora da
 allowlist numa tentativa só pode ser mérito que o próprio agente resolve no retry: os 5
 controles cortados na última tentativa que reprovou (671d, 624, 627e, 808, 367) saíam R1
 firme, e errado. O preço é o 346d, R1 de verdade com o vermelho numa tentativa só (na T2 o
-mesmo teste aparece como violação de enforcement): vira `R1?` e vai ao modelo.
+mesmo teste aparece como violação de enforcement): virava `R1?` e ia ao modelo. Desde a
+7f-b3 a D6b o pega (§15.1).
 
 ### 13.4 Saída (`saida.ts`)
 
@@ -1091,7 +1094,7 @@ Raiz: `ORQ_DIAG_DIR` ou `~/.orq/diagnosticos` (`raizDiagnosticos`, `:25`).
 | `<repo>/<id>.lock` | trava `O_EXCL` com pid e hora; órfã depois de 10 min (`travar`, `:160`) |
 | `<repo>/<id>/historico/<assinatura12>.json` | os anteriores (`gravarDiagnostico`, `:200`) |
 | `<repo>/<id>/<assinatura12>/evidencia/<caminho original>` | cópia do que foi lido, recortada e mascarada (`copiarEvidencia`, `:213`) |
-| `custo.json` | ledger do modelo: `{dias: {"AAAA-MM-DD": [{repo, id, assinatura, custo_usd, tokens_in, tokens_out}]}}` |
+| `custo.json` | ledger do modelo: `{dias: {"AAAA-MM-DD": [{repo, id, assinatura, custo_usd, tokens_in, tokens_out}]}}`; `reserva: true` durante a chamada e `custo_desconhecido: true` quando ela começou e não devolveu custo (7f-b3, §15.3) |
 
 `<repo>` é o `nome` do `repos.json` (padrão: o nome do diretório), o mesmo do painel.
 
@@ -1134,15 +1137,17 @@ Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.e
   marca `custo_acima_do_teto` no ledger, como na spec §4.
 - Envelope (`lerEnvelope`, `:244`): o de erro do CLI, sem `result`, é lido como `is_error`
   com `subtype`, `errors` e o custo pago, que vai ao ledger.
-- Teto do dia (`criarPassoModelo`, `:414`): a chamada só sai se gasto do dia + corte ≤
-  teto do dia (entrada sem custo conhecido conta como o corte, `gastoDoDia`, `:364`);
-  senão `modelo: {pulado: "teto_dia"}` e vale a extração.
+- Teto do dia (`criarPassoModelo`, `:453`): a chamada só sai se gasto do dia + corte ≤
+  teto do dia (entrada sem custo conhecido conta como o corte, `gastoDoDia`, `:384`);
+  senão `modelo: {pulado: "teto_dia"}` e vale a extração. Desde a 7f-b3, reserva antes,
+  custo real depois, devolução se a chamada não começou (§15.3).
 - Resposta (`lerResposta`, `:299`): a última linha JSON com `classe` em R1-R7. Cada
   evidência tem de ser de um arquivo lido e de uma linha que ele tem (no recorte, uma
   linha guardada); a que não confere sai e conta `evidencia_descartada`
   (`conferirEvidencia`, `:325`). A resposta do modelo nunca é firme.
 - Descarte (`Descarte`, `:378`): toda resposta descartada grava `modelo.erro` e
-  `modelo.descartado = {regra, trecho}`, com `regra` em `envelope_ilegivel`,
+  `modelo.descartado = {regra, trecho}`, com `regra` em `nao_iniciou` (7f-b3),
+  `envelope_ilegivel`,
   `teto_corte_cli`, `envelope_is_error`, `resposta_sem_classe` ou
   `evidencia_nenhuma_confere`; vale a extração, e o placar mostra
   `[descartado: <regra>: <trecho>]`.
@@ -1212,16 +1217,19 @@ orq resolver [--repo <nome|caminho>] [--dry-run] [--sem-modelo]
    outro.
 2. Trava global: `resolver.lock` com `O_EXCL`, pid e hora, órfã depois de 15 min
    (`travarPassada`, `caminhos.ts:104`). Outra passada segurando: nada roda.
-3. Por repo, antes da triagem: o desfecho das ações e propostas anteriores e a
+3. Os repos em ordem de modo (7f-b3, §15.4): os com alguma classe em `auto`, depois os
+   com alguma em `sombra`, depois os só em `diagnostico`; empate na ordem do repos.json.
+   É a ordem de consumo do teto do dia do modelo.
+4. Por repo, antes da triagem: o desfecho das ações e propostas anteriores e a
    promoção/rebaixamento (§14.6); o modo que vale na passada já é o novo.
-4. Os bloqueados, do que tem mais tickets esperando por ele ao que tem menos
+5. Os bloqueados, do que tem mais tickets esperando por ele ao que tem menos
    (`ordenarBloqueados`, `passada.ts:64`): tickets fora de `done`/`obsoleto` com o id em
    `dependencias` (direta); empate pela ordem do arquivo.
-5. Cada um pelo `triarTicket` (§13); mesma assinatura: vale o diagnóstico gravado. O
+6. Cada um pelo `triarTicket` (§13); mesma assinatura: vale o diagnóstico gravado. O
    modelo entra como no `orq triar` (só palpite e sem regra), com teto de **US$ 5,00 por
    dia** (`TETO_DIA_USD`, `passada.ts:32`; `ORQ_RESOLVEDOR_TETO_DIA` sobrepõe), contado
    no mesmo `custo.json` do triador.
-6. A decisão (§14.2) e a ação (§14.3, §14.4).
+7. A decisão (§14.2) e a ação (§14.3, §14.4).
 
 `--dry-run`: não escreve no repo, não chama modelo, não toca o ledger nem as propostas;
 o que faria (com o diff) vai para `dry-run.jsonl` e para a saída, uma linha por
@@ -1239,7 +1247,7 @@ caminho) fica em `diagnostico`.
 | R5 árvore suja (D1), firme | reabre quando a worktree alvo está limpa | proposta | só triagem |
 | R5 máquina (D4), firme | reabre com carga ≤ 0,75 por CPU e ≥ 2 GiB livres | proposta | só triagem |
 | R5 base vermelha (D5) | aviso | aviso | só triagem |
-| R1 (D6), firme | allowlist com guarda, critério da lista, reabre | proposta | só triagem |
+| R1 (D6 ou D6b), firme | allowlist com guarda, critério da lista, reabre | proposta | só triagem |
 | R2 (firme ou palpite) | **proposta** (nesta etapa R2 nunca aplica) | proposta | só triagem |
 | R3, R4, R6, R7; palpite fora de R2; sem classe | aviso | aviso | só triagem |
 
@@ -1357,6 +1365,81 @@ fixture `test/fixtures/resolvedor-7f/`, montada por `montar.py`, só leitura do
 humano (só a `descricao` da guarda é livre), o 940 e o 932 mudam as mesmas duas linhas para
 `pendente` e nota vazia, o 929 só ganha a proposta com o cmd do humano.
 
+## 15. Etapa 7f-b3: ajustes do primeiro dia do resolvedor (11/10/2026)
+
+O job `com.orq.resolvedor` rodou o primeiro dia em 11/10. Três defeitos, medidos em
+`~/.orq/diagnosticos` e no comarka-operacional (relatório:
+`~/orq-sessoes/relatorio-kit-etapa7f-b3.md`):
+
+- o 1006 do Comarka (enforcement `fora_do_pathspec: test/quem-cuida.test.ts`, com o mesmo
+  arquivo vermelho em `:137` na tentativa anterior) saiu `R1?`: no legado o enforcement
+  roda antes dos gates, então a D6 nunca vê o vermelho em duas tentativas. O humano
+  consertou como R1 (`~/orq-sessoes/conserto-1006.md`);
+- as 8 entradas do `custo.json` de 11/10 têm `custo_usd: null` e nenhuma chamada real: o
+  `claude` não estava no PATH do job (rc 127, 0 a 1 ms, stdout vazio). Contadas como o
+  corte (US$ 0,60), comeram US$ 4,80 do teto de US$ 3,00, e o 1006 foi pulado por
+  `teto_dia`. 7 delas são bloqueados do Actus sem nenhuma tentativa;
+- o teto foi consumido por repos em `diagnostico` antes do Comarka (R1 em `auto`).
+
+### 15.1 D6b · R1 firme pelo enforcement (`extrair.ts:239`)
+
+A última tentativa parou no enforcement com UMA violação, `fora_do_pathspec: <arquivo>`, e
+esse arquivo estava vermelho fora da allowlist e do diff nessa tentativa ou na anterior.
+São duas provas em duas tentativas (o vermelho e o agente mexendo nele), como a D6 pede.
+Sai R1 firme; a evidência é o `FAIL`, o erro, o `❯` e o `enforcement.json`; o remédio
+começa por `pôr <arquivo> na allowlist com guarda`, que é o que a ação R1 lê. Vem depois
+da D5 (base vermelha ganha). `decidir` trata D6b como D6 (`decidir.ts:49`); a guarda
+cita a regra (`descricaoGuarda`, `r1.ts:77`). Fixture: `triador-7f/primeiro-dia/01-1006-L88744`
+(`montar.py --so-primeiro-dia`, esperado R1 pelo conserto humano). Na matriz, só o 1006 e
+o 346d mudam (`R1?` → R1 firme, os dois certos); zero firme errado nos 37, nos 20 de
+controle e nos 5 cortados, nos dois instantes. O replay da corrida da peça 6 fica 22/37,
+21 chamadas, US$ 5,8840 (o 346d não vai mais ao modelo).
+
+### 15.2 D0 · sem evidência, sem modelo (`extrair.ts:182`, `triar.ts:167`)
+
+Série sem tentativa sai "bloqueado sem tentativa": classe nula, regra D0, a nota do ticket
+(`notas_status`) de evidência, e no remédio cada dependência ainda não `done` com o estado
+(`espera 517 (pendente), 518 (bloqueado)`) e cada token `humano:` sem liberação no
+`docs/fila/liberacoes.json` (`jaLiberado`). O estado vem do leitor (`estadoDasDependencias`,
+`leitor.ts:43`); sem tentativa, ele entra na assinatura (`saida.ts:154`): dependência que
+fica `done` faz o ticket ser triado de novo. O modelo não é chamado e o ledger não é
+tocado: `modelo: {modelo: null, pulado: "sem_tentativa"}`. Fixture:
+`triador-sem-tentativa/actus-1110` (`montar.py`, só leitura do Actus), os 7 de 11/10.
+
+### 15.3 Custo real sempre (`modelo.ts`: `reservar` `:393`, `acertar` `:402`)
+
+Antes de chamar, o `custo.json` ganha a reserva do pior caso (`reserva: true`, o corte).
+Depois:
+
+| o que aconteceu | o ledger fica com |
+|---|---|
+| envelope com `total_cost_usd` (sucesso, `is_error`, `error_max_budget_usd`) | o custo real |
+| o processo não começou (`ENOENT`, `EACCES`, `ENOTDIR`, `EPERM`: `chamar`, `:232`) | nada: a reserva é devolvida; `modelo.descartado.regra = nao_iniciou` |
+| a chamada foi recusada sob teste (sem stub) | nada |
+| começou e não devolveu custo (timeout, envelope ilegível) | `custo_usd: null`, `custo_desconhecido: true`: conta o corte, o único limite do que pode ter sido pago |
+
+`gastoDoDia` não mudou: soma o custo, e o corte onde ele é nulo (a reserva em curso e o
+custo desconhecido). A entrada nula de antes da 7f-b3, sem marca, também conta o corte.
+O placar da corrida não conta `nao_iniciou` como chamada.
+
+### 15.4 Teto por prioridade (`ordenarRepos`, `passada.ts:73`)
+
+Na passada, o modo mais forte de cada repo (de qualquer classe, ou o padrão) decide a
+ordem: `auto`, depois `sombra`, depois `diagnostico`; empate na ordem do repos.json. O
+teto do dia é consumido nessa ordem. Vale dentro de uma passada: uma passada anterior que
+já gastou o teto não é desfeita.
+
+### 15.5 Testes
+
+`orquestrador-triador-aceite.test.ts` (primeiro-dia: o 1006 R1 firme D6b nos dois
+instantes; (B) com os 16 firmes da spec; replay 22/37), `orquestrador-triador-sem-tentativa.test.ts`
+(os 7: zero chamada, ledger vazio, D0, dependências no remédio),
+`orquestrador-triador-custo-real.test.ts` (o 243 com o binário ausente; 8 que não
+começam e a 9ª sai; reserva só durante a chamada; erro com custo; timeout; recusa; o teto
+só com gasto real), `orquestrador-resolvedor-prioridade.test.ts` (com US$ 4,30 de US$ 5,00,
+o Comarka em auto chama e o Actus em diagnostico, listado antes, fica pulado) e
+`orquestrador-resolvedor-passada.test.ts` (D6b decide `r1_allowlist`).
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index 327fb6f..4ff90eb 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -984,8 +984,43 @@
   mesmo reabrir, 929 só proposta), `-passada`, `-acoes` (travas), `-r2`, `-ledger`,
   `-promocao`, `-desfazer`, `-job`.
 
+- **Etapa 7f-b3 · ajustes do primeiro dia do resolvedor** (11/10/2026). D6b: o
+  enforcement que barra o teste vermelho da tentativa anterior é R1 firme (o 1006 e o
+  346d); D0: bloqueado sem tentativa não vai ao modelo nem ao ledger e diz qual
+  dependência espera; custo real sempre (reserva antes, custo real depois, devolução se a
+  chamada não começou); teto por prioridade (auto, sombra, diagnóstico). Commits
+  `d38289e` (D6b), `d9adccc` (D0), `e2a96ae` (custo real), `a209edb` (prioridade).
+  *Evidência:* `~/.orq/diagnosticos/{comarka-operacional/1006,actus-saas/518,conteudos-infinitos/243}.json`,
+  `~/.orq/diagnosticos/custo.json`, `~/orq-sessoes/conserto-1006.md` e
+  `~/orq-sessoes/relatorio-kit-etapa7f-b3.md`.
+  *Teste:* `orquestrador-triador-aceite.test.ts` (primeiro-dia), `-sem-tentativa`,
+  `-custo-real`, `orquestrador-resolvedor-prioridade.test.ts`.
+
 ## PENDENTES
 
+- **7f-b3 · o `claude` no PATH do job (humano).** O plist instalado tem
+  `PATH={{NODE_DIR}}:/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin`, e o
+  `claude` está em `~/.local/bin`: toda chamada do modelo pelo job sai `nao_iniciou`
+  (depois da 7f-b3, sem custo e sem teto; antes, US$ 0,60 de teto cada). Pôr o diretório
+  do `claude` no template (ou `ORQ_TRIADOR_CLAUDE` no plist) e reinstalar é decisão do
+  chat do programa: liga o gasto real do job.
+  *Evidência:* `~/Library/LaunchAgents/com.orq.resolvedor.plist`, `which claude`, rc 127
+  e 0 a 1 ms nos 8 diagnósticos de 11/10.
+  *Teste:* `orquestrador-resolvedor-job.test.ts` com o PATH do plist contendo o diretório.
+- **7f-b3 · o teto entre passadas.** A prioridade da 7f-b3 vale dentro de uma passada:
+  repos em diagnóstico que gastam numa passada sem bloqueio do Comarka ainda podem esgotar
+  o teto antes do próximo bloqueio em auto. Uma fatia do teto reservada para auto é
+  decisão do chat do programa.
+  *Evidência:* CONTRATO §15.4.
+- **7f-b3 · assinatura do 243 muda a cada 30 min.** Em 11/10 o diagnóstico do 243
+  (conteudos-infinitos) ganhou 23 assinaturas novas, uma a cada passada de 30 min, sem
+  tentativa nova: cada uma é uma triagem nova (e, com o modelo no PATH, uma chamada nova).
+  Achar o arquivo lido cujo mtime/tamanho muda (provável: o recorte do `events.log`).
+  *Evidência:* `~/.orq/diagnosticos/conteudos-infinitos/243/historico/` (23 arquivos de
+  04:09 a 14:40 UTC).
+  *Teste:* duas leituras do mesmo repo com só o `events.log` crescendo em outros ids dão a
+  mesma assinatura.
+
 - **7f-b1b · mini-corrida paga do R3.** `~/orq-sessoes/corrida-7f-r3.cmd` (9 casos: os 5 R3 e
   os 6 cortados no teto, prompt `7f-b1b-r3`, teto US$ 5,40), depois do merge da 7f-b1b; as
   respostas novas entram na fixture e o aceite (C) é refeito. Com 28/37 hoje, chegar a 30
diff --git a/scripts/orquestrador/resolvedor/decidir.ts b/scripts/orquestrador/resolvedor/decidir.ts
index 37f2cad..4d00271 100644
--- a/scripts/orquestrador/resolvedor/decidir.ts
+++ b/scripts/orquestrador/resolvedor/decidir.ts
@@ -7,7 +7,7 @@
  * | R5 árvore suja (D1), firme  | reabrir           | proposta | nada        |
  * | R5 máquina (D4), firme      | reabrir           | proposta | nada        |
  * | R5 base vermelha (D5)       | aviso             | aviso    | nada        |
- * | R1 (D6), firme              | allowlist + guarda, reabrir | proposta | nada |
+ * | R1 (D6 ou D6b), firme       | allowlist + guarda, reabrir | proposta | nada |
  * | R2 (firme ou palpite)       | proposta (nunca aplica nesta etapa) | proposta | nada |
  * | R3, R4, R6, R7              | aviso             | aviso    | nada        |
  * | palpite (`?`) fora de R2, sem classe | aviso    | aviso    | nada        |
@@ -46,6 +46,7 @@ export function decidir(d: DiagnosticoMin, modos: Modos): Decisao {
   const aplica = (acao: 'r1_allowlist' | 'r5_reabrir', o: string): Decisao =>
     modo === 'auto' ? { acao, modo, motivo: o } : { acao: 'sombra', propoe: acao, modo, motivo: `${o} (em sombra: só proposta)` }
   if (base === 'R1' && firme && d.regra === 'D6') return aplica('r1_allowlist', 'R1 firme (D6): teste acoplado na allowlist com guarda')
+  if (base === 'R1' && firme && d.regra === 'D6b') return aplica('r1_allowlist', 'R1 firme (D6b): teste vermelho que o enforcement barrou, na allowlist com guarda')
   if (base === 'R5' && firme && d.regra === 'D1') return aplica('r5_reabrir', 'R5 árvore suja (D1): reabre quando a árvore alvo estiver limpa')
   if (base === 'R5' && firme && d.regra === 'D4') return aplica('r5_reabrir', 'R5 máquina (D4): reabre quando a máquina estiver livre')
   if (base === 'R5' && d.regra === 'D5') return { acao: 'aviso', modo, motivo: 'R5 base vermelha: só diagnóstico nesta etapa' }
diff --git a/scripts/orquestrador/resolvedor/passada.ts b/scripts/orquestrador/resolvedor/passada.ts
index 292cf7b..b1f7e82 100644
--- a/scripts/orquestrador/resolvedor/passada.ts
+++ b/scripts/orquestrador/resolvedor/passada.ts
@@ -1,7 +1,8 @@
 /**
  * passada.ts — uma passada do resolvedor (`orq resolver`, etapa 7f-b2).
  *
- *   para cada repo (ou o `--repo`):
+ *   para cada repo (ou o `--repo`), os em auto antes dos em sombra antes dos
+ *   só em diagnostico (o teto do dia do modelo é consumido nessa ordem, 7f-b3):
  *     bloqueados, do que tem mais tickets esperando por ele ao que tem menos →
  *     triagem (o triador existente, `triarTicket`) → decisão pela classe e pelo
  *     modo (decidir.ts) → ação, ou, em --dry-run, o registro do que faria.
@@ -60,6 +61,20 @@ export interface ResultadoPassada {
   itens: ItemPassada[]
 }
 
+const PRIORIDADE: Record<Modo, number> = { auto: 0, sombra: 1, diagnostico: 2 }
+
+/**
+ * A ordem dos repos na passada (7f-b3): o modo mais forte de cada repo (o de
+ * qualquer classe ou o padrão) decide; auto, depois sombra, depois
+ * diagnostico; empate na ordem do repos.json. É a ordem de consumo do teto do
+ * dia do modelo: em 11/10, Actus e conteudos-infinitos (diagnostico) o
+ * consumiram e o 1006 do Comarka (R1 em auto) foi pulado por `teto_dia`.
+ */
+export function ordenarRepos<T extends { modos: RepoResolvedor['modos'] }>(repos: T[]): T[] {
+  const forca = (r: T) => Math.min(...Object.values(r.modos).map((m) => PRIORIDADE[m]))
+  return repos.map((r, i) => ({ r, i, p: forca(r) })).sort((a, b) => a.p - b.p || a.i - b.i).map((x) => x.r)
+}
+
 /** Os bloqueados de um repo com o número de tickets que esperam por cada um, do maior ao menor. */
 export function ordenarBloqueados(raiz: string): { id: string; dependentes: number }[] {
   const fila = join(raiz, 'docs/fila')
@@ -119,7 +134,7 @@ export function passada(o: OpcoesPassada = {}): ResultadoPassada {
   const agora = o.agora ?? Date.now()
   const dryRun = o.dryRun === true
   if (existsSync(interruptor())) return { pausado: true, travado: false, itens: [] }
-  const repos = o.repo ? [acharRepo(o.repo)] : lerReposResolvedor()
+  const repos = o.repo ? [acharRepo(o.repo)] : ordenarRepos(lerReposResolvedor())
   const g = new GuardaResolvedor(repos.map((r) => r.caminho))
   const soltar = travarPassada(g)
   if (!soltar) return { pausado: false, travado: true, itens: [] }
diff --git a/scripts/orquestrador/resolvedor/r1.ts b/scripts/orquestrador/resolvedor/r1.ts
index 01a7879..60c05d1 100644
--- a/scripts/orquestrador/resolvedor/r1.ts
+++ b/scripts/orquestrador/resolvedor/r1.ts
@@ -74,9 +74,10 @@ const ddmm = (agora: number) => {
   return `${String(d.getUTCDate()).padStart(2, '0')}/${String(d.getUTCMonth() + 1).padStart(2, '0')}`
 }
 
-export function descricaoGuarda(teste: string, c: Contagem, ref: string, assinatura: string, agora: number): string {
+export function descricaoGuarda(teste: string, c: Contagem, ref: string, assinatura: string, agora: number, regra = 'D6'): string {
+  const porque = regra === 'D6b' ? 'vermelho fora da allowlist e barrado pelo enforcement' : 'vermelho fora da allowlist acoplado ao diff'
   return (
-    `anti-afrouxamento: ${teste} (entrou na allowlist em ${ddmm(agora)} pelo resolvedor, R1 D6 ${assinatura.slice(0, 12)}: vermelho fora da allowlist acoplado ao diff) ` +
+    `anti-afrouxamento: ${teste} (entrou na allowlist em ${ddmm(agora)} pelo resolvedor, R1 ${regra} ${assinatura.slice(0, 12)}: ${porque}) ` +
     `mantem >= ${c.it + c.test} it(/test( e >= ${c.expect} expect( e nao tem .skip/.only/.todo ` +
     `(medido em ${ref} em ${ddmm(agora)}: ${c.it} it(, ${c.test} test(, ${c.expect} expect(, ${c.skip} skip/only/todo)`
   )
@@ -147,7 +148,7 @@ export function planejarR1(raiz: string, diag: Diagnostico, md: string, agora: n
       novo = trocarCmd(novo, i, `${cmd.slice(0, fim)} '${teste}'${cmd.slice(fim)}`)
     }
     novo = inserirCriterio(novo, depoisDe, {
-      descricao: descricaoGuarda(teste, c, fonte.ref, diag.assinatura, agora),
+      descricao: descricaoGuarda(teste, c, fonte.ref, diag.assinatura, agora, diag.regra ?? 'D6'),
       cmd: cmdGuarda(teste, c.it + c.test, c.expect),
       espera: 'CONTAGEM_MANTIDA',
       tipo: 'guarda',
diff --git a/scripts/orquestrador/triador/comum.ts b/scripts/orquestrador/triador/comum.ts
index c07d09e..49f71ee 100644
--- a/scripts/orquestrador/triador/comum.ts
+++ b/scripts/orquestrador/triador/comum.ts
@@ -35,6 +35,7 @@ export function ticketLido(arquivo: string, j: Record<string, unknown> | null):
     objetivo: str(j.objetivo),
     pathspec_allowlist: Array.isArray(j.pathspec_allowlist) ? j.pathspec_allowlist.filter((x): x is string => typeof x === 'string') : [],
     criterios_aceite: Array.isArray(j.criterios_aceite) ? j.criterios_aceite : [],
+    dependencias: Array.isArray(j.dependencias) ? j.dependencias.filter((x): x is string => typeof x === 'string') : [],
   }
 }
 
diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
index eedc5e1..b0df149 100644
--- a/scripts/orquestrador/triador/corrida.ts
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -68,7 +68,9 @@ export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; for
     if (existente && existente.assinatura === assin && !o.forcar) diag = existente
     else {
       diag = diagnosticar(g, NOME_CORRIDA, { ...ev, id: caso }, ext, assin, agora, fixture, o.modelo)
-      chamou = diag.modelo !== null && !(diag.modelo as { pulado?: string }).pulado
+      // a que não começou (sem binário, 7f-b3) não é chamada: nada foi pago
+      const mod = diag.modelo as { pulado?: string; descartado?: { regra: string } } | null
+      chamou = mod !== null && !mod.pulado && mod.descartado?.regra !== 'nao_iniciou'
       gravarDiagnostico(g, NOME_CORRIDA, caso, diag)
       if (!ext.firme) {
         g.escrever(
diff --git a/scripts/orquestrador/triador/extrair.ts b/scripts/orquestrador/triador/extrair.ts
index 9d14f55..43aee54 100644
--- a/scripts/orquestrador/triador/extrair.ts
+++ b/scripts/orquestrador/triador/extrair.ts
@@ -20,7 +20,7 @@ import { matchesAllowlist } from '../enforcement-core.js'
 import { noDiff } from './leitor-legado-comarka.js'
 import type { Evidencia, Ref, Tentativa, Vizinho } from './tipos.js'
 
-export type Regra = 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D7' | 'D8' | 'D9' | 'D10' | 'D11' | 'D12'
+export type Regra = 'D0' | 'D1' | 'D2' | 'D3' | 'D4' | 'D5' | 'D6' | 'D6b' | 'D7' | 'D8' | 'D9' | 'D10' | 'D11' | 'D12'
 
 export interface Extracao {
   /** `R1`..`R7` quando firme; palpite leva `?` (`R5?`, `R1|R2?`); `null` = nenhuma regra casou */
@@ -57,6 +57,7 @@ const ROTULO: Record<string, string> = {
   R6: 'motor: o orquestrador mediu ou decidiu errado',
   R7: 'humano: só o dono decide',
 }
+export const ROTULO_D0 = 'bloqueado sem tentativa'
 export const rotuloDe = (classe: string | null): string => {
   if (!classe) return 'sem regra'
   const cs = classe.replace('?', '').split('|')
@@ -178,7 +179,16 @@ export function extrair(ev: Evidencia): Extracao {
     requeue,
     detalhe,
   })
-  if (!ult) return sai(null, null, [], 'sem tentativa na série: decisão humana')
+  // D0 · bloqueado sem tentativa (7f-b3): não há gate, diff nem juiz; o que
+  // há é a nota do ticket e as dependências. Sem evidência, sem modelo
+  // (triar.ts não chama nem reserva teto). A dependência ainda não done, ou o
+  // portão `humano:` sem liberação, vai para o remédio.
+  if (!ult) {
+    const espera = (ev.dependencias ?? []).filter((d) => d.estado !== 'done' && d.estado !== 'liberado')
+    const nota = ev.ticket && ev.ticket.notas_status ? [{ arquivo: ev.ticket.arquivo, linha: null, trecho: ev.ticket.notas_status.slice(0, 160) }] : []
+    const r = sai(null, 'D0', nota, `bloqueado sem tentativa${espera.length ? `; espera ${espera.map((d) => `${d.dep} (${d.estado})`).join(', ')}` : ''}: decisão humana`)
+    return { ...r, rotulo: ROTULO_D0 }
+  }
   const u = ult.estagio
 
   // D1 · merge recusado (árvore suja) e o juiz aprovou
@@ -226,6 +236,28 @@ export function extrair(ev: Evidencia): Extracao {
     return sai('R5', 'D5', provas, `consertar a base: ${local(vermelhoRefs(b.t, b.arquivo), b.arquivo)} vermelho também em ${ids.join(', ')}, fora do diff`, `sim_apos:base_verde:${b.arquivo}`)
   }
 
+  // D6b · o enforcement da última tentativa barrou só um arquivo, por
+  // fora_do_pathspec, e é o teste que estava vermelho fora da allowlist e do
+  // diff nessa tentativa ou na anterior: o agente mexeu no teste que o gate
+  // mostrou vermelho (7f-b3). O legado do Comarka roda o enforcement antes dos
+  // gates, então o vermelho e o bloqueio caem em tentativas seguidas e a D6 (o
+  // vermelho em ≥ 2 tentativas) nunca fecha: 1006 (:137 na 1, barrado na 2) e
+  // 346d. São duas provas em duas tentativas, como a D6 pede.
+  const barrados = ult.enforcement && !ult.enforcement.ok ? ult.enforcement.violacoes : []
+  const barrado = barrados.length === 1 ? /^fora_do_pathspec: (\S+)$/.exec(barrados[0]!)?.[1] : undefined
+  const ant = ts.at(-2)
+  const vermelhoBarrado = barrado ? fora.filter((x) => x.arquivo === barrado && (x.t === ult || x.t === ant)).at(-1) : undefined
+  if (u === 'enforcement' && vermelhoBarrado) {
+    const { t, arquivo } = vermelhoBarrado
+    const onde = local(vermelhoRefs(t, arquivo), arquivo)
+    return sai(
+      'R1',
+      'D6b',
+      [...vermelhoRefs(t, arquivo), ult.enforcement!.ref],
+      `pôr ${arquivo} na allowlist com guarda (mesma contagem de it/expect, sem skip); vermelho em ${onde} na tentativa ${t.n} e barrado pelo enforcement na ${ult.n}`,
+    )
+  }
+
   // D6 · vermelho fora da allowlist e do diff, acoplado ao que o ticket mudou.
   // Firme só com o MESMO teste vermelho fora em ≥ 2 tentativas da série
   // (7f-b1-7, decisão do chat do programa): com uma só, o agente ainda pode
diff --git a/scripts/orquestrador/triador/leitor.ts b/scripts/orquestrador/triador/leitor.ts
index c609360..483d580 100644
--- a/scripts/orquestrador/triador/leitor.ts
+++ b/scripts/orquestrador/triador/leitor.ts
@@ -3,11 +3,13 @@
  * `<runs>/events.log` presente → `kit`; ausente, com `docs/fila/runs/local-loop.log`
  * → `legado-comarka`. Nada aqui olha o nome do repo.
  */
-import { existsSync, readFileSync } from 'node:fs'
+import { existsSync, readdirSync, readFileSync } from 'node:fs'
 import { join } from 'node:path'
+import { jaLiberado } from '../liberacoes-core.js'
+import { blocoJson } from './comum.js'
 import { LOG_LEGADO, lerRepoLegado } from './leitor-legado-comarka.js'
 import { lerRepoKit } from './leitor-kit.js'
-import type { Evidencia, NomeLeitor } from './tipos.js'
+import type { Dependencia, Evidencia, NomeLeitor } from './tipos.js'
 
 export function runsDir(raiz: string): string {
   try {
@@ -27,7 +29,35 @@ export function detectarLeitor(raiz: string): NomeLeitor | null {
 
 export function lerRepo(raiz: string, id: string, opts: { agora?: number } = {}): Evidencia {
   const l = detectarLeitor(raiz)
-  if (l === 'kit') return lerRepoKit(raiz, id)
-  if (l === 'legado-comarka') return lerRepoLegado(raiz, id, opts)
-  throw new Error(`${raiz}: nem runs/events.log (kit) nem ${LOG_LEGADO} (legado)`)
+  const ev = l === 'kit' ? lerRepoKit(raiz, id) : l === 'legado-comarka' ? lerRepoLegado(raiz, id, opts) : null
+  if (!ev) throw new Error(`${raiz}: nem runs/events.log (kit) nem ${LOG_LEGADO} (legado)`)
+  if (ev.ticket?.dependencias.length) ev.dependencias = estadoDasDependencias(raiz, ev.ticket.dependencias)
+  return ev
+}
+
+/**
+ * O estado AGORA de cada dependência (7f-b3): o `status` do ticket na fila;
+ * token `humano:` liberado ou não no docs/fila/liberacoes.json (a mesma
+ * checagem do `orq liberar`).
+ */
+export function estadoDasDependencias(raiz: string, deps: string[]): Dependencia[] {
+  const fila = join(raiz, 'docs/fila')
+  let nomes: string[] = []
+  try {
+    nomes = readdirSync(fila)
+  } catch {
+    nomes = []
+  }
+  let lib: unknown = null
+  try {
+    lib = JSON.parse(readFileSync(join(fila, 'liberacoes.json'), 'utf8'))
+  } catch {
+    lib = null
+  }
+  return deps.map((dep) => {
+    if (dep.startsWith('humano:')) return { dep, estado: jaLiberado(lib, dep) ? 'liberado' : 'sem liberação' }
+    const f = nomes.find((x) => x.startsWith(`${dep}-`) && x.endsWith('.md'))
+    const j = f ? blocoJson(readFileSync(join(fila, f), 'utf8')) : null
+    return { dep, estado: typeof j?.status === 'string' ? j.status : 'sem ticket' }
+  })
 }
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index 9e57266..32f9360 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -25,6 +25,14 @@
  * do CLI é `teto_corte_usd` (padrão US$ 0,60), acima do teto do caso; o teto
  * do caso (US$ 0,30) só marca `custo_acima_do_teto` no ledger, como na spec
  * §4. O pior caso de uma chamada, para o teto do dia, é o corte.
+ *
+ * Custo real sempre (7f-b3): antes de chamar, o ledger ganha a RESERVA do
+ * pior caso (`reserva: true`); depois, ela vira o custo real do envelope
+ * (também no erro), ou é DEVOLVIDA se a chamada não começou (o binário não
+ * existe: em 11/10 o `claude` não estava no PATH do job e 8 reservas nulas
+ * comeram US$ 4,80 do teto sem um centavo gasto). Chamada que começou e não
+ * devolveu custo (timeout, envelope ilegível) fica com o pior caso, marcada
+ * `custo_desconhecido`: é o único limite honesto do que pode ter sido pago.
  */
 import { spawnSync } from 'node:child_process'
 import { readFileSync } from 'node:fs'
@@ -220,7 +228,10 @@ export interface Envelope {
  */
 export class ChamadaRealRecusada extends Error {}
 
-export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout: string; ms: number } {
+/** Erros de spawn em que o processo nem começou: nenhuma chamada, nada pago. */
+const NAO_INICIOU = new Set(['ENOENT', 'EACCES', 'ENOTDIR', 'EPERM'])
+
+export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout: string; ms: number; iniciou: boolean; erro: string | null } {
   // Sob teste (vitest ou ORQ_TESTE=1) só o stub roda: sem ORQ_TRIADOR_CLAUDE,
   // o `claude` do PATH seria o de verdade, e a etapa nunca chama API.
   if (!process.env.ORQ_TRIADOR_CLAUDE && (process.env.VITEST || process.env.ORQ_TESTE === '1')) {
@@ -233,7 +244,8 @@ export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout:
     ['-p', '--output-format', 'json', '--model', cfg.modelo ?? '', '--allowedTools', '', '--max-turns', '1', '--max-budget-usd', String(cfg.teto_corte_usd ?? PADRAO.teto_corte_usd)],
     { input: prompt, encoding: 'utf8', timeout: cfg.timeout_secs * 1000, maxBuffer: 16 * 1024 * 1024, killSignal: 'SIGKILL' },
   )
-  return { rc: r.status ?? (r.error ? 127 : 124), stdout: r.stdout ?? '', ms: Date.now() - t0 }
+  const codigo = (r.error as NodeJS.ErrnoException | undefined)?.code ?? null
+  return { rc: r.status ?? (r.error ? 127 : 124), stdout: r.stdout ?? '', ms: Date.now() - t0, iniciou: !(codigo && NAO_INICIOU.has(codigo)), erro: codigo }
 }
 
 /**
@@ -346,6 +358,10 @@ export interface Gasto {
   tokens_in: number | null
   tokens_out: number | null
   custo_acima_do_teto?: true
+  /** a reserva do pior caso, só enquanto a chamada roda (7f-b3) */
+  reserva?: true
+  /** a chamada começou e não devolveu custo: conta o pior caso */
+  custo_desconhecido?: true
 }
 
 const dia = (agora: number) => new Date(agora).toISOString().slice(0, 10)
@@ -360,23 +376,46 @@ export function lerLedger(g: Guarda): { dias: Record<string, Gasto[]> } {
   }
 }
 
-/** Gasto do dia; entrada sem custo conhecido conta como `piorCaso` (o corte do CLI). */
+/**
+ * Gasto do dia; entrada sem custo conhecido (a reserva de uma chamada em
+ * curso, ou a que começou e não devolveu custo) conta como `piorCaso` (o
+ * corte do CLI).
+ */
 export function gastoDoDia(g: Guarda, agora: number, piorCaso: number): number {
   return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? piorCaso), 0)
 }
 
-function registrar(g: Guarda, agora: number, x: Gasto): void {
-  const l = lerLedger(g)
-  ;(l.dias[dia(agora)] ??= []).push(x)
+function gravarLedger(g: Guarda, l: { dias: Record<string, Gasto[]> }): void {
   g.escrever(join(g.raiz, 'custo.json'), JSON.stringify(l, null, 1) + '\n')
 }
 
+/** A reserva do pior caso, ANTES da chamada; devolve a chave para acertar depois. */
+function reservar(g: Guarda, agora: number, x: Omit<Gasto, 'custo_usd' | 'tokens_in' | 'tokens_out'>): string {
+  const chave = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
+  const l = lerLedger(g)
+  ;(l.dias[dia(agora)] ??= []).push({ ...x, custo_usd: null, tokens_in: null, tokens_out: null, reserva: true, chave } as Gasto)
+  gravarLedger(g, l)
+  return chave
+}
+
+/** Troca a reserva pelo gasto real; `null` devolve a reserva (a chamada não aconteceu). */
+function acertar(g: Guarda, agora: number, chave: string, x: Gasto | null): void {
+  const l = lerLedger(g)
+  const d = l.dias[dia(agora)] ?? []
+  const i = d.findIndex((e) => (e as Gasto & { chave?: string }).chave === chave)
+  if (i >= 0) d.splice(i, 1, ...(x ? [x] : []))
+  else if (x) d.push(x)
+  if (d.length) l.dias[dia(agora)] = d
+  else delete l.dias[dia(agora)]
+  gravarLedger(g, l)
+}
+
 /**
  * Por que a resposta do modelo foi descartada (e valeu a extração): a regra
  * que descartou e o trecho que a mostra. Nenhum descarte é silencioso (7f-b1b).
  */
 export interface Descarte {
-  regra: 'envelope_ilegivel' | 'teto_corte_cli' | 'envelope_is_error' | 'resposta_sem_classe' | 'evidencia_nenhuma_confere'
+  regra: 'nao_iniciou' | 'envelope_ilegivel' | 'teto_corte_cli' | 'envelope_is_error' | 'resposta_sem_classe' | 'evidencia_nenhuma_confere'
   trecho: string
 }
 
@@ -393,7 +432,7 @@ function trechoIlegivel(stdout: string, rc: number): string {
 
 export interface RegistroModelo {
   modelo: string | null
-  pulado?: 'teto_dia' | 'desligado'
+  pulado?: 'teto_dia' | 'desligado' | 'sem_tentativa'
   /** só quando não é o da spec (ex.: `7f-b1b-r3`) */
   prompt?: NomePrompt
   erro?: string
@@ -421,11 +460,26 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
     }
     const versao = cfg.prompt ?? PADRAO.prompt
     const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens, versao)
-    const r = chamar(entrada.prompt, cfg)
+    const chave = reservar(guarda, agora, { repo, id: ev.id, assinatura })
+    let r: ReturnType<typeof chamar>
+    try {
+      r = chamar(entrada.prompt, cfg)
+    } catch (e) {
+      acertar(guarda, agora, chave, null)
+      throw e
+    }
+    if (!r.iniciou) {
+      acertar(guarda, agora, chave, null)
+      const motivo = `claude não iniciou (${r.erro}): nenhuma chamada, nada no teto`
+      return {
+        registro: { modelo: cfg.modelo, ...(versao !== 'spec' ? { prompt: versao } : {}), erro: motivo, descartado: { regra: 'nao_iniciou', trecho: trecho(`rc ${r.rc}: ${motivo}`) }, custo_usd: 0, duracao_ms: r.ms, entrada_tokens_est: entrada.tokens_est } satisfies RegistroModelo,
+      }
+    }
     const env = lerEnvelope(r.stdout)
     const gasto: Gasto = { repo, id: ev.id, assinatura, custo_usd: env?.custo_usd ?? null, tokens_in: env?.tokens_in ?? null, tokens_out: env?.tokens_out ?? null }
     if (env?.custo_usd != null && env.custo_usd > cfg.teto_caso_usd) gasto.custo_acima_do_teto = true
-    registrar(guarda, agora, gasto)
+    if (gasto.custo_usd === null) gasto.custo_desconhecido = true
+    acertar(guarda, agora, chave, gasto)
     const reg: RegistroModelo = {
       modelo: cfg.modelo,
       ...(versao !== 'spec' ? { prompt: versao } : {}),
diff --git a/scripts/orquestrador/triador/saida.ts b/scripts/orquestrador/triador/saida.ts
index 732ad18..06467a5 100644
--- a/scripts/orquestrador/triador/saida.ts
+++ b/scripts/orquestrador/triador/saida.ts
@@ -149,6 +149,9 @@ export function assinatura(ev: Evidencia): string {
   for (const l of [...ev.lidos].sort((a, b) => a.arquivo.localeCompare(b.arquivo))) {
     h.update(`|${l.arquivo}|${l.mtime_ns}|${l.tamanho}`)
   }
+  // sem tentativa, o diagnóstico é o estado das dependências (7f-b3): uma
+  // dependência que fica done muda a assinatura e o ticket é triado de novo
+  if (!ev.tentativas.length && ev.dependencias?.length) h.update(`|deps|${ev.dependencias.map((d) => `${d.dep}=${d.estado}`).join(',')}`)
   return h.digest('hex')
 }
 
diff --git a/scripts/orquestrador/triador/tipos.ts b/scripts/orquestrador/triador/tipos.ts
index f5690bf..a52383d 100644
--- a/scripts/orquestrador/triador/tipos.ts
+++ b/scripts/orquestrador/triador/tipos.ts
@@ -126,6 +126,18 @@ export interface TicketLido {
   objetivo: string
   pathspec_allowlist: string[]
   criterios_aceite: unknown[]
+  /** `dependencias` do ticket: ids de ticket e tokens `humano:` */
+  dependencias: string[]
+}
+
+/**
+ * Uma dependência do ticket e o estado dela AGORA (7f-b3): o `status` do
+ * ticket (`done`, `pendente`, `bloqueado`…), `sem ticket`, e, para token
+ * `humano:`, `liberado` ou `sem liberação` (docs/fila/liberacoes.json).
+ */
+export interface Dependencia {
+  dep: string
+  estado: string
 }
 
 export interface Bloqueio {
@@ -167,5 +179,7 @@ export interface Evidencia {
   config: { diff_cap_linhas: number | null; claude_timeout_secs: number | null }
   /** fontes de evidência que faltaram (regra de falta, §2) */
   falta: string[]
+  /** o estado de cada dependência do ticket (leitor.ts); ausente = não lido */
+  dependencias?: Dependencia[]
   lidos: Lido[]
 }
diff --git a/scripts/orquestrador/triador/triar.ts b/scripts/orquestrador/triador/triar.ts
index 666a7b4..ffab960 100644
--- a/scripts/orquestrador/triador/triar.ts
+++ b/scripts/orquestrador/triador/triar.ts
@@ -163,6 +163,11 @@ export function triarTicket(o: OpcoesTriar): Resultado {
 export function diagnosticar(g: Guarda, repo: string, ev: Evidencia, ext: Extracao, assin: string, agora: number, raizRepo: string, modelo: PassoModelo | null): Diagnostico {
   const copia = copiarEvidencia(g, repo, ev, assin)
   const diag = montar(repo, ev, ext, assin, agora, copia, raizRepo)
+  // sem tentativa não há evidência para o modelo: nem chamada, nem reserva no teto (7f-b3)
+  if (ext.regra === 'D0') {
+    if (modelo) diag.modelo = { modelo: null, pulado: 'sem_tentativa' }
+    return diag
+  }
   if (ext.firme || !modelo) return diag
   const m = modelo({ ev, ext, repo, assinatura: assin, guarda: g, agora, copia })
   diag.modelo = m.registro
diff --git a/test/fixtures/triador-7f/montar.py b/test/fixtures/triador-7f/montar.py
index e3e8f7c..a42e0c4 100644
--- a/test/fixtures/triador-7f/montar.py
+++ b/test/fixtures/triador-7f/montar.py
@@ -15,7 +15,10 @@ De onde sai cada caso (spec 7f-a §7.1):
     vermelho intermediário. Nenhum deles pode sair firme;
   - 5 de série cortada (`cortados/`, 7f-b1-7): controles cortados na última
     tentativa que reprovou. Saem de `controle/`, sem o comarka
-    (`--so-cortados` refaz só eles). Nenhum deles pode sair firme.
+    (`--so-cortados` refaz só eles). Nenhum deles pode sair firme;
+  - os bloqueios do primeiro dia do resolvedor (`primeiro-dia/`, 7f-b3): o
+    1006 de 11/10, com a classe do conserto humano (`--so-primeiro-dia` refaz
+    só eles, lendo o comarka).
 
 O que vai para cada caso é SÓ o que o triador lê, já recortado:
   caso.json, ticket.json, meta.json, config.json, log.txt, serie.json,
@@ -91,6 +94,13 @@ CONTROLE = ["633", "671d", "624", "694", "627e", "656", "808", "706", "367", "89
 # R1 firme, e errado: o próprio agente resolveu o vermelho no retry.
 CORTADOS = ["671d", "624", "627e", "808", "367"]
 
+# Primeiro dia do resolvedor (11/10, 7f-b3): id, L (BLOQUEADO no local-loop.log),
+# classe do conserto humano, a evidência (como em CASOS) e a fonte da verdade.
+PRIMEIRO_DIA = [
+    ("1006", 88744, "R1", ["runs/1006/attempt-1/gate-vitest.txt:2041", "runs/1006/attempt-2/enforcement.json"],
+     "~/orq-sessoes/conserto-1006.md (R1: test/quem-cuida.test.ts na allowlist com guarda; a mudança do agente no teste era só um vi.mock)"),
+]
+
 # --- O recorte: o MESMO algoritmo de triador/recorte.ts -----------------------
 ANSI = re.compile(r"\x1b\[[0-9;?]*[A-Za-z]")
 FORTES = [re.compile(p) for p in (
@@ -611,6 +621,18 @@ def monta_cortado(saida, nn, tid):
     return destino
 
 
+def monta_primeiro_dia(cm, saida):
+    """Os casos de `PRIMEIRO_DIA`, montados como os 37 (monta_caso), em
+    `primeiro-dia/`; o esperado aponta o conserto humano, não a medição."""
+    destino = os.path.join(saida, "primeiro-dia")
+    subprocess.run(["rm", "-rf", destino], check=True)
+    for nn, (tid, L, classe, cit, fonte) in enumerate(PRIMEIRO_DIA, 1):
+        print("primeiro-dia", nn, tid, L, file=sys.stderr)
+        d = monta_caso(cm, destino, nn, tid, L, classe, None, cit)
+        esp = json.load(open(os.path.join(d, "esperado.json")))
+        json_escreve(os.path.join(d, "esperado.json"), {**esp, "fonte_da_verdade": fonte})
+
+
 INTEIROS = [("627j", "docs/fila/runs/627j/attempt-3/gate-vitest.txt"),
             ("627b", "docs/fila/runs/627b/attempt-1.prev1/gate-vitest.txt"),
             ("600", "docs/fila/runs/600/attempt-3/gate-vitest.txt")]
@@ -621,7 +643,11 @@ def main():
     ap.add_argument("--comarka", default=os.path.expanduser("~/Projetos/comarka-operacional"))
     ap.add_argument("--saida", default=AQUI)
     ap.add_argument("--so-cortados", action="store_true", help="refaz só cortados/, a partir de controle/ (sem o comarka)")
+    ap.add_argument("--so-primeiro-dia", action="store_true", help="refaz só primeiro-dia/ (lê o comarka)")
     a = ap.parse_args()
+    if a.so_primeiro_dia:
+        monta_primeiro_dia(Comarka(os.path.abspath(a.comarka)), a.saida)
+        return
     subprocess.run(["rm", "-rf", os.path.join(a.saida, "cortados")], check=True)
     if a.so_cortados:
         for nn, tid in enumerate(CORTADOS, 1):
diff --git a/test/fixtures/triador-custo-real/montar.py b/test/fixtures/triador-custo-real/montar.py
new file mode 100644
index 0000000..16b6dde
--- /dev/null
+++ b/test/fixtures/triador-custo-real/montar.py
@@ -0,0 +1,41 @@
+#!/usr/bin/env python3
+"""montar.py — o 243 do conteudos-infinitos de 11/10/2026 (etapa 7f-b3, peça 3).
+
+O 243 tem 4 tentativas e nenhuma regra casa: vai ao modelo. Em 11/10 o
+`claude` não estava no PATH do job do launchd, a chamada nem começou (rc 127,
+0 ms) e o ledger ficou com custo nulo, contado como o pior caso no teto.
+
+Fonte: a CÓPIA DA EVIDÊNCIA que o triador gravou naquele dia
+(~/.orq/diagnosticos/conteudos-infinitos/243/<assinatura>/evidencia: só o que
+ele leu), mais o runs/243/meta.json do repo (lido, não copiado na evidência).
+Tudo passa pela máscara. SÓ LEITURA de ~/.orq e do repo.
+
+    python3 test/fixtures/triador-custo-real/montar.py
+"""
+import argparse, os, shutil, sys
+
+AQUI = os.path.dirname(os.path.abspath(__file__))
+sys.path.insert(0, os.path.join(AQUI, "..", "triador-7f"))
+from montar import mascarar  # noqa: E402
+
+ASSINATURA = "0a6368fbb44b"
+
+
+def main():
+    ap = argparse.ArgumentParser()
+    ap.add_argument("--diag", default=os.path.expanduser(f"~/.orq/diagnosticos/conteudos-infinitos/243/{ASSINATURA}/evidencia"))
+    ap.add_argument("--repo", default=os.path.expanduser("~/Projetos/conteudos-infinitos"))
+    ap.add_argument("--saida", default=os.path.join(AQUI, "conteudos-243"))
+    a = ap.parse_args()
+    shutil.rmtree(a.saida, ignore_errors=True)
+    pares = [(os.path.join(r, f), os.path.relpath(os.path.join(r, f), a.diag)) for r, _, fs in os.walk(a.diag) for f in fs]
+    pares.append((os.path.join(a.repo, "docs/fila/runs/243/meta.json"), "docs/fila/runs/243/meta.json"))
+    for src, rel in sorted(pares):
+        dst = os.path.join(a.saida, rel)
+        os.makedirs(os.path.dirname(dst), exist_ok=True)
+        with open(src, encoding="utf-8", errors="replace") as fh:
+            open(dst, "w", encoding="utf-8").write(mascarar(fh.read()))
+
+
+if __name__ == "__main__":
+    main()
diff --git a/test/fixtures/triador-sem-tentativa/montar.py b/test/fixtures/triador-sem-tentativa/montar.py
new file mode 100644
index 0000000..aaba523
--- /dev/null
+++ b/test/fixtures/triador-sem-tentativa/montar.py
@@ -0,0 +1,66 @@
+#!/usr/bin/env python3
+"""montar.py — os bloqueados SEM TENTATIVA do primeiro dia do resolvedor
+(11/10/2026, etapa 7f-b3), reproduzidos como um repo do kit.
+
+SÓ LEITURA do actus-saas: lê os .md da fila e o liberacoes.json; nenhum git,
+nenhum script do actus. Escreve só em <saida> (padrão: actus-1110/ ao lado).
+
+    python3 test/fixtures/triador-sem-tentativa/montar.py --actus ~/Projetos/actus-saas
+
+O que vai: o 1º bloco json de cada bloqueado (mascarado, como o triador lê) e,
+das dependências, só id, slug e status (é o que o triador olha nelas); os
+tokens `humano:` das dependências que estão no liberacoes.json; um
+`runs/events.log` vazio (o Actus não tem INICIO desses ids: sem tentativa) e o
+diff_cap do config. Os 7 do Actus foram 7 das 8 entradas do ledger de 11/10
+(a 8ª, o 243 do conteudos-infinitos, tem 4 tentativas: é da peça 3).
+"""
+import argparse, glob, json, os, re, sys
+
+AQUI = os.path.dirname(os.path.abspath(__file__))
+sys.path.insert(0, os.path.join(AQUI, "..", "triador-7f"))
+from montar import mascarar  # noqa: E402
+
+BLOQUEADOS = ["517a", "518", "519", "520", "521", "527", "532"]
+
+
+def bloco(caminho):
+    m = re.search(r"```json\n(.*?)\n```", open(caminho, encoding="utf-8").read(), re.S)
+    return json.loads(m.group(1))
+
+
+def md(j):
+    return "# " + str(j.get("id")) + "\n\n```json\n" + json.dumps(j, ensure_ascii=False, indent=2) + "\n```\n"
+
+
+def main():
+    ap = argparse.ArgumentParser()
+    ap.add_argument("--actus", default=os.path.expanduser("~/Projetos/actus-saas"))
+    ap.add_argument("--saida", default=os.path.join(AQUI, "actus-1110"))
+    a = ap.parse_args()
+    fila = os.path.join(a.actus, "docs/fila")
+    out = os.path.join(a.saida, "docs/fila")
+    os.makedirs(os.path.join(out, "runs"), exist_ok=True)
+    acha = lambda i: (glob.glob(os.path.join(fila, f"{i}-*.md")) or [None])[0]
+    deps, tokens = set(), set()
+    for i in BLOQUEADOS:
+        f = acha(i)
+        j = json.loads(mascarar(json.dumps(bloco(f), ensure_ascii=False)))
+        open(os.path.join(out, os.path.basename(f)), "w", encoding="utf-8").write(md(j))
+        for d in j.get("dependencias", []):
+            (tokens if d.startswith("humano:") else deps).add(d)
+    for d in sorted(deps - set(BLOQUEADOS)):
+        f = acha(d)
+        if f:
+            j = bloco(f)
+            open(os.path.join(out, os.path.basename(f)), "w", encoding="utf-8").write(md({k: j.get(k) for k in ("id", "slug", "status")}))
+    lib = json.load(open(os.path.join(fila, "liberacoes.json")))
+    lib["tokens"] = [t for t in lib.get("tokens", []) if t.get("token") in tokens]
+    lib["liberadas"] = [t for t in lib.get("liberadas", []) if t.get("token") in tokens]
+    json.dump(lib, open(os.path.join(out, "liberacoes.json"), "w"), ensure_ascii=False, indent=1)
+    cfg = json.load(open(os.path.join(fila, "000-config.json")))
+    json.dump({"diff_cap_linhas": cfg.get("diff_cap_linhas"), "fonte": "actus-saas docs/fila/000-config.json"}, open(os.path.join(out, "000-config.json"), "w"), indent=1)
+    open(os.path.join(out, "runs", "events.log"), "w").close()
+
+
+if __name__ == "__main__":
+    main()
diff --git a/test/orquestrador-resolvedor-passada.test.ts b/test/orquestrador-resolvedor-passada.test.ts
index 7e6f75f..9cb375c 100644
--- a/test/orquestrador-resolvedor-passada.test.ts
+++ b/test/orquestrador-resolvedor-passada.test.ts
@@ -56,6 +56,8 @@ describe('peça 2: a passada', () => {
     const auto = { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra', R3: 'auto' }
     const d = (classe: string | null, regra: string | null, firme: boolean, modos: Record<string, string> = auto, fonte = 'extracao') => m!.decidir({ classe, regra, firme, fonte }, modos).acao
     expect(d('R1', 'D6', true)).toBe('r1_allowlist')
+    // 7f-b3: a D6b (enforcement no teste que estava vermelho) também é R1 firme
+    expect(d('R1', 'D6b', true)).toBe('r1_allowlist')
     expect(d('R5', 'D1', true)).toBe('r5_reabrir')
     expect(d('R5', 'D4', true)).toBe('r5_reabrir')
     expect(d('R5', 'D5', true)).toBe('aviso')
diff --git a/test/orquestrador-resolvedor-prioridade.test.ts b/test/orquestrador-resolvedor-prioridade.test.ts
new file mode 100644
index 0000000..9fe967e
--- /dev/null
+++ b/test/orquestrador-resolvedor-prioridade.test.ts
@@ -0,0 +1,84 @@
+/**
+ * Etapa 7f-b3, peça 4 · teto por prioridade.
+ *
+ * Em 11/10 o teto do dia foi consumido por repos em modo diagnostico (Actus,
+ * conteudos-infinitos) e o 1006 do Comarka, em auto para R1, foi pulado por
+ * `teto_dia`. Na passada, o consumo do teto segue o modo do repo: os que têm
+ * alguma classe em auto vêm antes dos que têm alguma em sombra, que vêm antes
+ * dos só em diagnostico (empate: a ordem do repos.json).
+ *
+ * Pronto quando: com o teto quase cheio (US$ 4,30 de US$ 5,00 gastos, cada
+ * chamada reserva US$ 0,60), o bloqueio do Comarka (auto) chama o modelo e o
+ * do Actus (diagnostico), listado ANTES no repos.json, fica pulado.
+ */
+import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, FX_TRI } from './resolvedor-repo.js'
+import { materializar } from './triador-repo-legado.js'
+
+const RAIZ = join(import.meta.dirname, '..')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
+const AGORA = Date.parse('2026-10-11T15:20:15Z')
+
+describe('peça 4: teto por prioridade (auto, depois sombra, depois diagnostico)', () => {
+  let amb: ReturnType<typeof ambiente>
+  let tira: () => void
+  beforeAll(() => {
+    amb = ambiente()
+    const trava = join(amb.base, 'trava')
+    mkdirSync(trava)
+    writeFileSync(join(trava, 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(amb.base, 'trava.log')}"\nexit 99\n`)
+    chmodSync(join(trava, 'claude'), 0o755)
+    const r = JSON.stringify({ classe: 'R4', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
+    writeFileSync(join(amb.base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.25, usage: { input_tokens: 1, output_tokens: 1 } }))
+    writeFileSync(amb.env.ORQ_TRIADOR_CONFIG!, JSON.stringify({ modelo: 'claude-opus-5-5', teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }))
+    tira = comEnv({
+      ...amb.env,
+      ORQ_TRIADOR_CLAUDE: STUB,
+      STUB_LOG: join(amb.base, 'stub.log'),
+      STUB_RESPOSTA: join(amb.base, 'resposta.json'),
+      ORQ_RESOLVEDOR_TETO_DIA: '5',
+      PATH: `${trava}:${process.env.PATH}`,
+    })
+  })
+  afterAll(() => {
+    expect(existsSync(join(amb.base, 'trava.log')) ? readFileSync(join(amb.base, 'trava.log'), 'utf8') : '').toBe('')
+    tira?.()
+  })
+
+  it('com o teto quase cheio, o Comarka (auto) chama o modelo e o Actus (diagnostico), listado antes, fica pulado', async () => {
+    // Actus: um repo do kit com um bloqueio de 4 tentativas e sem regra (o 243 serve de molde)
+    const actus = join(amb.base, 'actus-saas')
+    cpSync(FX243, actus, { recursive: true })
+    // Comarka: um bloqueio em palpite (559, R4? D9) no legado
+    const comarka = materializar(join(FX_TRI, '01-559-L55054'), join(amb.base, 'comarka-operacional'))
+    const tk = join(comarka, 'docs/fila/559-aceite-aba-conta.md')
+    writeFileSync(tk, readFileSync(tk, 'utf8').replace(/"status": "[^"]*"/, '"status": "bloqueado"'))
+    amb.repos([{ caminho: actus }, { caminho: comarka, resolvedor: { padrao: 'diagnostico', R1: 'auto', R5: 'auto', R2: 'sombra' } }])
+    // US$ 4,30 já gastos hoje (real)
+    writeFileSync(join(amb.env.ORQ_DIAG_DIR!, 'custo.json'), JSON.stringify({ dias: { '2026-10-11': [{ repo: 'x', id: 'x', assinatura: 'x', custo_usd: 4.3, tokens_in: 1, tokens_out: 1 }] } }))
+
+    const { passada } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { passada: (o: { agora: number }) => { itens: { repo: string; id: string }[] } }
+    const r = passada({ agora: AGORA })
+    const modelo = (repo: string, id: string) => (JSON.parse(readFileSync(join(amb.env.ORQ_DIAG_DIR!, repo, `${id}.json`), 'utf8')) as { modelo: Record<string, unknown> }).modelo
+    const pulado = (repo: string, id: string) => (modelo(repo, id).pulado as string | undefined) ?? `chamou US$ ${modelo(repo, id).custo_usd}`
+    expect({ comarka: pulado('comarka-operacional', '559'), actus: pulado('actus-saas', '243') }).toEqual({ comarka: 'chamou US$ 0.25', actus: 'teto_dia' })
+    expect(r.itens.map((i) => `${i.repo}/${i.id}`)).toEqual(['comarka-operacional/559', 'actus-saas/243'])
+    expect(readFileSync(join(amb.base, 'stub.log'), 'utf8').split('\n').filter(Boolean)).toHaveLength(1)
+  })
+
+  it('a ordem dos repos: auto antes de sombra antes de diagnostico; empate na ordem do repos.json', async () => {
+    const { ordenarRepos } = (await import(pathToFileURL(join(RAIZ, 'scripts/orquestrador/resolvedor/passada.ts')).href)) as { ordenarRepos?: (r: { nome: string; modos: Record<string, string> }[]) => { nome: string }[] }
+    const rs = [
+      { nome: 'd1', modos: { padrao: 'diagnostico' } },
+      { nome: 's1', modos: { padrao: 'diagnostico', R2: 'sombra' } },
+      { nome: 'a1', modos: { padrao: 'diagnostico', R1: 'auto' } },
+      { nome: 'd2', modos: { padrao: 'diagnostico' } },
+      { nome: 'a2', modos: { padrao: 'auto' } },
+    ]
+    expect(ordenarRepos?.(rs).map((r) => r.nome)).toEqual(['a1', 'a2', 's1', 'd1', 'd2'])
+  })
+})
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index dbf97ff..e84c40a 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -12,9 +12,16 @@
  *       menos o 346d: com a restrição da D6 (7f-b1-7, decisão do chat do
  *       programa), R1 só é firme com o mesmo vermelho fora da allowlist em ≥ 2
  *       tentativas; o 346d tem uma só e vira `R1?`. Ficam 15.
+ *       Com a D6b (7f-b3), o 346d volta a firme: enforcement na tentativa 2
+ *       por mexer no teste que estava vermelho na 1. Ficam os 16 da spec.
  *   (controle) nenhum dos 20 sai firme.
  *   (cortados) nenhum dos 5 de série cortada sai firme: com a D6 da spec os 5
  *       saíam R1 firme, e errado (o agente resolveu o vermelho no retry).
+ *   (primeiro-dia) o 1006 de 11/10 (7f-b3): vermelho em
+ *       test/quem-cuida.test.ts:137 na tentativa 1 e enforcement
+ *       (fora_do_pathspec do mesmo arquivo) na 2. O legado do Comarka roda o
+ *       enforcement antes dos gates, então a D6 (o vermelho em ≥ 2 tentativas)
+ *       nunca fecha; a D6b fecha R1 firme. O humano consertou como R1.
  *   (C) extração + modelo, por REPLAY (7f-b1b): as 22 `resposta-modelo.json`
  *       da corrida real da peça 6 (10/10, `~/.orq/corrida-7f-peca6/`) estão
  *       copiadas em `<caso>/resposta-modelo.json`. O `claude` é o stub, que
@@ -100,9 +107,10 @@ function evidenciaCasa(dada: Ref[], esp: Ref[]): boolean {
   )
 }
 
-// Spec §3.3: os 16 firmes e certos, menos o 346d (D6 com ≥ 2 tentativas, 7f-b1-7).
+// Spec §3.3: os 16 firmes e certos. O 346d saiu na 7f-b1-7 (D6 com ≥ 2
+// tentativas) e voltou na 7f-b3 pela D6b (enforcement no teste vermelho).
 const FIRMES_DA_SPEC = [
-  '07-627j-L57368', '11-689-L65280', '15-722-L67970', '17-715-L68793',
+  '07-627j-L57368', '11-689-L65280', '13-346d-L66187', '15-722-L67970', '17-715-L68793',
   '22-762-L72665', '23-856-L73817', '26-711b3-L78647', '35-950-L85145',
   '20-801-L72121', '21-760-L72407', '31-898-L82594', '32-741a-L82726', '36-940-L85222', '37-932-L85272',
   '16-723-L68736',
@@ -126,16 +134,16 @@ describe('aceite do triador (spec 7f-a §7.2)', () => {
       expect({ nome, classe: r.get(nome)?.classe, firme: r.get(nome)?.firme }).toEqual({ nome, classe: 'R5?', firme: false })
     }
     const firmes = [...r].filter(([, x]) => x.firme).map(([n]) => n)
-    expect(firmes).toHaveLength(13)
+    expect(firmes).toHaveLength(14)
   })
 
-  it('(B) zero firme errado nos 37, e os firmes certos são os 15 (16 da spec menos o 346d)', async () => {
+  it('(B) zero firme errado nos 37, e os firmes certos são os 16 da spec (o 346d pela D6b)', async () => {
     const r = await triarTodos('', 'passada')
     const firmes = [...r].filter(([, x]) => x.firme)
     const errados = firmes.filter(([n, x]) => x.classe !== esperado(n).classe).map(([n, x]) => `${n}=${x.classe}`)
     expect(errados).toEqual([])
     expect(firmes.map(([n]) => n).sort()).toEqual(FIRMES_DA_SPEC)
-    expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13-346d-L66187')?.firme }).toEqual({ classe: 'R1?', firme: false })
+    expect({ classe: r.get('13-346d-L66187')?.classe, firme: r.get('13-346d-L66187')?.firme, regra: r.get('13-346d-L66187')?.regra }).toEqual({ classe: 'R1', firme: true, regra: 'D6b' })
   })
 
   it('(controle) nenhum dos 20 done sai firme, nos dois instantes', async () => {
@@ -154,6 +162,19 @@ describe('aceite do triador (spec 7f-a §7.2)', () => {
     }
   })
 
+  it('(primeiro-dia) o 1006 sai R1 firme pela D6b, com o vermelho :137 e o enforcement de prova, nos dois instantes', async () => {
+    const caso = '01-1006-L88744'
+    const esp = JSON.parse(readFileSync(join(FX, 'primeiro-dia', caso, 'esperado.json'), 'utf8')) as Esperado
+    for (const instante of ['bloqueio', 'passada'] as const) {
+      const x = (await triarTodos('primeiro-dia', instante)).get(caso) ?? SEM_DIAGNOSTICO
+      expect({ instante, classe: x.classe, firme: x.firme, regra: x.regra }).toEqual({ instante, classe: 'R1', firme: true, regra: 'D6b' })
+      expect(evidenciaCasa(x.evidencia, esp.evidencia ?? []), JSON.stringify(x.evidencia)).toBe(true)
+      expect(x.evidencia.map((e) => `${e.arquivo}:${e.linha}`)).toEqual(
+        expect.arrayContaining(['docs/fila/runs/1006/attempt-1/gate-vitest.txt:2041', 'docs/fila/runs/1006/attempt-2/enforcement.json:1']),
+      )
+    }
+  })
+
 })
 
 // ─── (C) replay da corrida real da peça 6 ────────────────────────────────────
@@ -205,10 +226,20 @@ const PLACAR_PECA6 = [
   "-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 4.1376",
 ].join('\n')
 
+// 7f-b3: com a D6b, o 346d sai R1 firme na extração (enforcement no teste
+// vermelho da tentativa 1) e não vai mais ao modelo. O replay da corrida real
+// fica igual nas outras 36 linhas; a resposta gravada do 346d (US$ 0,2424) não
+// é mais consumida: 21 gravadas, 21 chamadas, 22/37.
+const LINHA_346D_7F_B3 = '13-346d-L66187\tesperado R1\textração R1 (D6b)\tfinal R1 [extracao]\tCERTO\t'
+const PLACAR_7F_B3 = PLACAR_PECA6.split('\n')
+  .map((l) => (l.startsWith('13-346d-') ? LINHA_346D_7F_B3 : l))
+  .join('\n')
+
 // os 6 que saíram [extracao] na corrida real sem o motivo no placar
 const DESCARTADOS_PECA6 = ['08-635-L58105', '14-407a-L67585', '25-711a-L78138', '28-707-L79202', '29-826-L80362', '33-707-L83026']
-// os 8 "classe certa, evidência fora" da corrida real
-const EVIDENCIA_FORA_PECA6 = ['12-691-L65374', '13-346d-L66187', '18-737-L69920', '24-867-L76790', '26-711b3-L78647', '27-741-L79081', '30-900-L81564', '34-898-L83625']
+// os 8 "classe certa, evidência fora" da corrida real, menos o 346d (7f-b3:
+// firme pela D6b, com a evidência da medição)
+const EVIDENCIA_FORA_PECA6 = ['12-691-L65374', '18-737-L69920', '24-867-L76790', '26-711b3-L78647', '27-741-L79081', '30-900-L81564', '34-898-L83625']
 const classes = (texto: string) =>
   texto
     .split('\n')
@@ -385,13 +416,13 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
     process.env = { ...envAntes }
   })
 
-  it('(C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37', async () => {
+  it('(C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37', async () => {
     const r = await replay()
-    expect({ gravadas: r?.gravadas, velhas: r?.assinaturas_velhas }).toEqual({ gravadas: 22, velhas: [] })
+    expect({ gravadas: r?.gravadas, velhas: r?.assinaturas_velhas }).toEqual({ gravadas: 21, velhas: [] })
     // caso, esperado, extração, classe final e veredito de cada linha; a fonte
     // dos descartados e o custo mudam nas peças 2 e 3 (testes abaixo)
-    expect(classes(r?.texto ?? '')).toEqual(classes(PLACAR_PECA6))
-    expect(r?.texto.split('\n').at(-1)).toMatch(/^-- \(C\) classe e evidência certas: 21\/37 \(aceite: >= 30\); chamadas novas: 22;/)
+    expect(classes(r?.texto ?? '')).toEqual(classes(PLACAR_7F_B3))
+    expect(r?.texto.split('\n').at(-1)).toMatch(/^-- \(C\) classe e evidência certas: 22\/37 \(aceite: >= 30\); chamadas novas: 21;/)
   })
 
   it('(C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar', async () => {
@@ -413,13 +444,14 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
       const m = r?.diags.get(c)?.modelo as { descartado?: { regra: string; trecho: string }; custo_usd?: number | null; resposta?: unknown }
       expect({ c, regra: m.descartado?.regra, custo: (m.custo_usd ?? 0) > 0.3, resposta: m.resposta }).toEqual({ c, regra: 'teto_corte_cli', custo: true, resposta: undefined })
     }
-    // custo desta corrida: os 16 com resposta (US$ 4,1376) + os 6 cortados (US$ 1,9889), o que a corrida real pagou
-    expect(r?.texto.split('\n').at(-1)).toMatch(/chamadas novas: 22; custo desta corrida: US\$ 6\.1265$/)
+    // custo desta corrida: os 16 com resposta (US$ 4,1376) + os 6 cortados (US$ 1,9889), o que a corrida real pagou,
+    // menos o 346d (US$ 0,2424), que na 7f-b3 sai firme sem modelo
+    expect(r?.texto.split('\n').at(-1)).toMatch(/chamadas novas: 21; custo desta corrida: US\$ 5\.8840$/)
     // 0 dos 6 passam a usar a resposta do modelo: o envelope não tem result
     expect(DESCARTADOS_PECA6.filter((c) => r?.diags.get(c)?.fonte === 'modelo')).toEqual([])
   })
 
-  it('(C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta)', async () => {
+  it('(C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta)', async () => {
     const placar = await placarComEquivalencia()
     const fora = placar.filter((p) => p.certo && !p.medicao)
     expect(fora.map((p) => p.caso)).toEqual(EVIDENCIA_FORA_PECA6)
@@ -429,7 +461,6 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
     const R = 'docs/fila/runs/'
     expect(Object.fromEntries(fora.map((p) => [p.caso, p.equivalente.map((x) => x.replace(R, ''))]))).toEqual({
       '12-691-L65374': ['691/attempt-2.prev1/criterios.txt:68', '691/attempt-2.prev1/criterios.txt:71', '691/attempt-1.prev1/criterios.txt:71'],
-      '13-346d-L66187': ['346d/attempt-1.prev1/gate-vitest.txt:1423', '346d/attempt-1.prev1/gate-vitest.txt:1607', '346d/attempt-2/diff.stat:3'],
       '18-737-L69920': ['737/attempt-3/criterios.txt:52', '737/attempt-3/criterios.txt:55', '737/attempt-2.prev1/criterios.txt:55'],
       '24-867-L76790': ['867/attempt-2/avaliador-claude.txt:1', '867/attempt-1.prev1/avaliador-claude.txt:1'],
       '26-711b3-L78647': [4654, 6222, 6212, 7780].flatMap((n) => [`711b3/attempt-2.prev1/gate-vitest.txt:${n}`]).concat([4654, 6222, 6212, 7780].map((n) => `711b3/attempt-3/gate-vitest.txt:${n}`)),
diff --git a/test/orquestrador-triador-custo-real.test.ts b/test/orquestrador-triador-custo-real.test.ts
new file mode 100644
index 0000000..8b76614
--- /dev/null
+++ b/test/orquestrador-triador-custo-real.test.ts
@@ -0,0 +1,153 @@
+/**
+ * Etapa 7f-b3, peça 3 · custo real sempre.
+ *
+ * Em 11/10/2026 o `claude` não estava no PATH do job do launchd: a chamada do
+ * 243 (conteudos-infinitos, 4 tentativas, sem regra) nem começou (rc 127,
+ * 0 ms, stdout vazio), e o ledger ganhou `custo_usd: null`, que o teto do dia
+ * contava como o pior caso (US$ 0,60). Com os 7 do Actus (peça 2), 8 × 0,60 =
+ * US$ 4,80 de teto consumido sem um centavo gasto, e o 1006 do Comarka foi
+ * pulado por `teto_dia`.
+ *
+ * Pronto quando (stub, nunca API): toda chamada registra o custo real, também
+ * no erro; a reserva do pior caso existe só DURANTE a chamada e é devolvida
+ * quando a chamada não aconteceu; o teto do dia conta só o gasto real (e a
+ * reserva de chamada que começou e não devolveu custo, o único limite honesto).
+ */
+import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+
+const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
+const FX243 = join(import.meta.dirname, 'fixtures', 'triador-custo-real', 'conteudos-243')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, teto_corte_usd: 0.6, entrada_max_tokens: 30000, timeout_secs: 120 }
+const AGORA = Date.parse('2026-10-11T03:54:09Z')
+
+let base: string
+const envAntes = { ...process.env }
+beforeEach(() => {
+  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-custo-real-')))
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
+    PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
+  })
+  writeFileSync(join(base, 'triador.json'), JSON.stringify(CFG))
+  envelope(0.25)
+})
+afterEach(() => {
+  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
+  process.env = { ...envAntes }
+})
+
+function envelope(custo: number | null, extra: Record<string, unknown> = {}) {
+  const r = JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
+  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, ...(custo === null ? {} : { total_cost_usd: custo }), usage: { input_tokens: 10, output_tokens: 1 }, ...extra }))
+}
+const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
+const ledgerHoje = () =>
+  existsSync(join(base, 'diag', 'custo.json')) ? ((JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, any[]> }).dias['2026-10-11'] ?? []) : []
+
+async function mods() {
+  const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
+  return { ...(await imp('modelo.ts')), ...(await imp('saida.ts')), ...(await imp('triar.ts')), ...(await imp('leitor.ts')), ...(await imp('extrair.ts')) }
+}
+
+/** O passo do modelo sobre o 243, como a passada de 11/10 o chamou. */
+async function passo243(cfg: Record<string, unknown> = CFG) {
+  const m = await mods()
+  const raiz = join(base, 'conteudos-infinitos')
+  if (!existsSync(raiz)) cpSync(FX243, raiz, { recursive: true })
+  const ev = m.lerRepo(raiz, '243')
+  const ext = m.extrair(ev)
+  const guarda = new m.Guarda([raiz])
+  const ctx = { ev, ext, repo: 'conteudos-infinitos', assinatura: m.assinatura(ev), guarda, agora: AGORA, copia: '' }
+  const passo = m.criarPassoModelo({ ...m.lerConfigModelo(), ...cfg })
+  return { m, ctx, guarda, chama: () => passo(ctx), gasto: () => m.gastoDoDia(guarda, AGORA, 0.6) as number }
+}
+
+describe('peça 3: custo real sempre', () => {
+  it('o 243 de 11/10: claude fora do PATH (a chamada nem começa) não fica no ledger nem no teto', async () => {
+    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
+    const p = await passo243()
+    expect(p.ctx.ext.classe).toBeNull()
+    const r = p.chama()
+    expect(r.registro).toEqual(expect.objectContaining({ erro: expect.stringMatching(/^claude não iniciou \(ENOENT\)/), descartado: expect.objectContaining({ regra: 'nao_iniciou' }) }))
+    expect(ledgerHoje()).toEqual([])
+    expect(p.gasto()).toBe(0)
+  })
+
+  it('8 chamadas que não começam (os 8 de 11/10) não consomem o teto: a 9ª, de verdade, sai', async () => {
+    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
+    const p = await passo243()
+    for (let i = 0; i < 8; i++) p.chama()
+    expect(ledgerHoje()).toEqual([])
+    process.env.ORQ_TRIADOR_CLAUDE = STUB
+    const r = p.chama()
+    expect(r.registro.pulado).toBeUndefined()
+    expect(chamadas()).toHaveLength(1)
+    expect(ledgerHoje()).toEqual([expect.objectContaining({ repo: 'conteudos-infinitos', id: '243', custo_usd: 0.25 })])
+    expect(p.gasto()).toBeCloseTo(0.25, 6)
+  })
+
+  it('a reserva do pior caso existe só durante a chamada; depois vira o custo real', async () => {
+    // um stub que, no meio da chamada, guarda o ledger como estava
+    const visto = join(base, 'ledger-durante.json')
+    const stub = join(base, 'stub-ledger.sh')
+    writeFileSync(stub, `#!/usr/bin/env bash\ncat > /dev/null\ncp "${join(base, 'diag', 'custo.json')}" "${visto}" 2>/dev/null || echo '{}' > "${visto}"\ncat "${join(base, 'resposta.json')}"\n`)
+    chmodSync(stub, 0o755)
+    process.env.ORQ_TRIADOR_CLAUDE = stub
+    const p = await passo243()
+    p.chama()
+    const durante = (JSON.parse(readFileSync(visto, 'utf8')) as { dias?: Record<string, any[]> }).dias?.['2026-10-11'] ?? []
+    expect(durante).toEqual([expect.objectContaining({ id: '243', custo_usd: null, reserva: true })])
+    expect(ledgerHoje()).toEqual([{ repo: 'conteudos-infinitos', id: '243', assinatura: p.ctx.assinatura, custo_usd: 0.25, tokens_in: 10, tokens_out: 1 }])
+  })
+
+  it('custo real também no erro: corte do CLI e is_error registram o total_cost_usd do envelope', async () => {
+    const p = await passo243()
+    writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'error_max_budget_usd', is_error: true, total_cost_usd: 0.41, errors: ['budget'], usage: { input_tokens: 9, output_tokens: 2 } }))
+    expect(p.chama().registro.descartado.regra).toBe('teto_corte_cli')
+    envelope(0.07, { is_error: true, result: 'falhou' })
+    expect(p.chama().registro.descartado.regra).toBe('envelope_is_error')
+    expect(ledgerHoje().map((x) => x.custo_usd)).toEqual([0.41, 0.07])
+    expect(p.gasto()).toBeCloseTo(0.48, 6)
+  })
+
+  it('chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida', async () => {
+    const lento = join(base, 'stub-lento.sh')
+    writeFileSync(lento, '#!/usr/bin/env bash\ncat > /dev/null\nsleep 5\n')
+    chmodSync(lento, 0o755)
+    process.env.ORQ_TRIADOR_CLAUDE = lento
+    const p = await passo243({ ...CFG, timeout_secs: 1 })
+    p.chama()
+    expect(ledgerHoje()).toEqual([expect.objectContaining({ id: '243', custo_usd: null, custo_desconhecido: true })])
+    expect(ledgerHoje()[0].reserva).toBeUndefined()
+    expect(p.gasto()).toBeCloseTo(0.6, 6)
+  })
+
+  it('a chamada recusada sob teste (sem stub) devolve a reserva', async () => {
+    delete process.env.ORQ_TRIADOR_CLAUDE
+    const p = await passo243()
+    expect(() => p.chama()).toThrow(/claude real recusado sob teste/)
+    expect(ledgerHoje()).toEqual([])
+  })
+
+  it('o teto do dia só conta gasto real: 3 chamadas de US$ 0,25 e 5 que não começaram somam US$ 0,75', async () => {
+    const p = await passo243()
+    for (let i = 0; i < 3; i++) p.chama()
+    process.env.ORQ_TRIADOR_CLAUDE = join(base, 'sem-claude', 'claude')
+    for (let i = 0; i < 5; i++) p.chama()
+    expect(p.gasto()).toBeCloseTo(0.75, 6)
+    expect(ledgerHoje()).toHaveLength(3)
+  })
+})
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
index 9dcda2a..9d46d78 100644
--- a/test/orquestrador-triador-modelo.test.ts
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -276,7 +276,8 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(chamadas()).toHaveLength(21)
     expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 21; custo desta corrida: US\$ 6\.3000/)
     const dir = join(base, 'diag', 'fixture-triador-7f')
-    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(22)
+    // 21 palpites: o 346d sai R1 firme pela D6b (7f-b3) e não grava resposta
+    expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(21)
     expect(orq('6.60').stdout).toMatch(/chamadas novas: 0;/)
     expect(chamadas()).toHaveLength(21)
     expect(spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout).toBe(antes)
diff --git a/test/orquestrador-triador-sem-tentativa.test.ts b/test/orquestrador-triador-sem-tentativa.test.ts
new file mode 100644
index 0000000..3b68075
--- /dev/null
+++ b/test/orquestrador-triador-sem-tentativa.test.ts
@@ -0,0 +1,99 @@
+/**
+ * Etapa 7f-b3, peça 2 · sem evidência, sem modelo.
+ *
+ * No primeiro dia do resolvedor (11/10/2026), 7 bloqueados do actus-saas sem
+ * nenhuma tentativa (517a, 518, 519, 520, 521, 527, 532: sem `runs/<id>/`,
+ * `falta: ["meta"]`) foram ao modelo e entraram no ledger com custo nulo, que
+ * o teto do dia contava como o pior caso (US$ 0,60 cada). A fixture
+ * `triador-sem-tentativa/actus-1110` (montar.py, só leitura do Actus) os
+ * reproduz com as dependências no estado de 11/10.
+ *
+ * Pronto quando: nenhum dos 7 chama o modelo (o stub não roda) nem reserva
+ * (o ledger fica vazio); cada um sai "bloqueado sem tentativa" (D0), com a
+ * nota do ticket de evidência e, se houver dependência ainda não done (ou
+ * portão `humano:` sem liberação), qual.
+ */
+import { chmodSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterEach, beforeEach, describe, expect, it } from 'vitest'
+
+const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
+const FX = join(import.meta.dirname, 'fixtures', 'triador-sem-tentativa', 'actus-1110')
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+const CFG = { modelo: 'claude-opus-5-5', teto_dia_usd: 3, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }
+const IDS = ['517a', '518', '519', '520', '521', '527', '532']
+
+let base: string
+const envAntes = { ...process.env }
+beforeEach(() => {
+  base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-sem-tentativa-')))
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
+    PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
+  })
+  writeFileSync(join(base, 'triador.json'), JSON.stringify(CFG))
+  // se o modelo fosse chamado, pagaria US$ 0,30 por caso
+  const r = JSON.stringify({ classe: 'R7', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' })
+  writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: r, total_cost_usd: 0.3, usage: { input_tokens: 1, output_tokens: 1 } }))
+})
+afterEach(() => {
+  expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
+  process.env = { ...envAntes }
+})
+
+const chamadas = () => (existsSync(join(base, 'stub.log')) ? readFileSync(join(base, 'stub.log'), 'utf8').split('\n').filter(Boolean) : [])
+const ledger = () => (existsSync(join(base, 'diag', 'custo.json')) ? (JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, unknown[]> }).dias : {})
+
+async function triar(): Promise<{ id: string; feito: string; diagnostico?: any }[]> {
+  const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
+  const { triarRepo } = await imp('triar.ts')
+  const { criarPassoModelo, lerConfigModelo } = await imp('modelo.ts')
+  const raiz = join(base, 'actus-saas')
+  if (!existsSync(raiz)) cpSync(FX, raiz, { recursive: true })
+  return triarRepo({ nome: 'actus-saas', caminho: raiz }, { modelo: criarPassoModelo(lerConfigModelo()), agora: Date.parse('2026-10-11T03:54:09Z') })
+}
+
+describe('peça 2: sem evidência, sem modelo (os 7 do Actus de 11/10)', () => {
+  it('nenhum dos 7 chama o modelo nem reserva teto: o stub não roda e o ledger fica vazio', async () => {
+    const rs = await triar()
+    expect(rs.map((r) => r.id).sort()).toEqual(IDS)
+    expect(chamadas()).toEqual([])
+    expect(ledger()).toEqual({})
+    for (const r of rs) expect({ id: r.id, modelo: r.diagnostico?.modelo }).toEqual({ id: r.id, modelo: { modelo: null, pulado: 'sem_tentativa' } })
+    // rodar de novo (a passada de 5 em 5 min) também não
+    expect((await triar()).map((r) => r.feito)).toEqual(IDS.map(() => 'mesma_assinatura'))
+    expect(chamadas()).toEqual([])
+    expect(ledger()).toEqual({})
+  })
+
+  it('cada um sai "bloqueado sem tentativa" (D0), com a nota do ticket de evidência', async () => {
+    for (const r of await triar()) {
+      const d = r.diagnostico
+      expect({ id: r.id, classe: d?.classe, firme: d?.firme, regra: d?.regra, rotulo: d?.rotulo }).toEqual({ id: r.id, classe: null, firme: false, regra: 'D0', rotulo: 'bloqueado sem tentativa' })
+      expect(d?.evidencia[0]).toEqual(expect.objectContaining({ arquivo: expect.stringMatching(new RegExp(`^docs/fila/${r.id}-.*\\.md$`)), trecho: expect.stringMatching(/^bloqueado \d\d\/09\/2026/) }))
+    }
+  })
+
+  it('a dependência ainda não done (ou o portão humano sem liberação) aparece no remédio; a done e a liberada não', async () => {
+    const rem = Object.fromEntries((await triar()).map((r) => [r.id, r.diagnostico?.remedio as string]))
+    expect(rem).toEqual({
+      '517a': 'bloqueado sem tentativa; espera humano:ghl-evento-oportunidade-confirmado (sem liberação): decisão humana',
+      '518': 'bloqueado sem tentativa; espera 517 (pendente): decisão humana',
+      '519': 'bloqueado sem tentativa; espera 517 (pendente): decisão humana',
+      '520': 'bloqueado sem tentativa; espera 517 (pendente), 518 (bloqueado), 519 (bloqueado): decisão humana',
+      '521': 'bloqueado sem tentativa; espera 519 (bloqueado), 520 (bloqueado): decisão humana',
+      '527': 'bloqueado sem tentativa; espera humano:506-causa-corrigida (sem liberação): decisão humana',
+      '532': 'bloqueado sem tentativa; espera humano:ghl-escopo-users-confirmado (sem liberação): decisão humana',
+    })
+  })
+})
```
