# Relatório · kit etapa 7f-b1b · conserto da camada do modelo do triador a partir da corrida real

Worktree `kit/etapa7f1b` (`/Users/lucasantos/Projetos/_worktrees/kit-etapa7f1b`), base `cbda4ed`.
Nenhuma chamada de API, nenhum push, merge nem rebase. `~/.orq/corrida-7f-peca6/` só foi lido
(as 22 cópias conferem byte a byte com a origem: `cmp` 22/22 iguais).

Commits (um por peça):

```
3c59d30 7f-b1b-6: CONTRATO (§13.5 a §13.7), CHANGELOG e PECAS com os shas da 7f-b1b
12076a1 7f-b1b-5: proposta de prompt para R3 (opt-in, 7f-b1b-r3) e --casos para a mini-corrida
7f748d0 7f-b1b-4: aceite (C) conta evidência equivalente à da medição, com sinal da classe; 28/37
69956a2 7f-b1b-3: corte do CLI separado do teto do caso; envelope de erro sem result entra no ledger
99407d1 7f-b1b-2: todo descarte da resposta do modelo grava modelo.descartado e sai no placar
983ebae 7f-b1b-1: aceite (C) em replay das 22 respostas da corrida real; reproduz 21/37
```

## Resumo

| | placar (C) em replay | custo desta corrida |
|---|---|---|
| antes (corrida real, replay da 7f-b1b-1) | **21/37** | US$ 4,1376 (o que o placar mostrava) |
| depois do conserto do descarte (7f-b1b-3) | **21/37** (0 dos 6 recuperam: não há `result`) | **US$ 6,1265** (o que a corrida pagou) |
| depois da regra de evidência equivalente (7f-b1b-4) | **28/37** | US$ 6,1265 |

O aceite pede ≥ 30. Chegar lá depende da mini-corrida paga (peça 5), que **não foi rodada**.

## PASSO 0

Lidos: `~/orq-sessoes/corrida-7f-peca6.txt` (38 linhas), as 22 `resposta-modelo.json`,
`scripts/orquestrador/triador/` (cli, corrida, modelo, prompt, triar, recorte, tipos),
`test/orquestrador-triador-{aceite,modelo,fixture}.test.ts` e a spec §4, §5 e §7.

**Correção de premissa:** os 6 casos **têm** `modelo.erro`. É `"envelope ilegível (rc 1)"`,
que está em `resposta-modelo.json` e no diagnóstico. Só que a mensagem é enganosa: o envelope
é JSON legível. E o placar não mostrava o erro, só `[extracao]`.

**Onde a resposta foi descartada, nos 6 (código em `cbda4ed`):**

1. O `claude -p` rodou com `--max-budget-usd 0.3` (= `teto_caso_usd`, `modelo.ts:209`) e
   `--max-turns 1`. A volta terminou (`stop_reason: end_turn`, 1118 a 1654 tokens de saída)
   e foi paga. Depois o CLI viu o custo acima de 0,30 e devolveu
   `{"subtype":"error_max_budget_usd","is_error":true,"errors":["Reached maximum budget ($0.3)"],"total_cost_usd":…}`,
   **sem o campo `result`**, com rc 1.
2. `modelo.ts:218` (`lerEnvelope`): `if (typeof j.result !== 'string') return null`. O
   envelope inteiro vai fora, com o custo.
3. `modelo.ts:362`: `custo_usd: env?.custo_usd ?? null`. O ledger grava `null`, então os 6
   não somam no placar e no ledger contam 0,30 cada.
4. `modelo.ts:376`: `if (!env) return { registro: { ...reg, erro: \`envelope ilegível (rc ${r.rc})\` } }`.
   Sai sem `resposta`.
5. `triar.ts:169`: `if (m.resposta)` é falso, e fica a extração (`fonte: extracao`).
6. `corrida.ts:91`: o placar imprime `[${l.fonte}]`, sem `modelo.erro`.

| caso | subtype | errors | pago (US$) | tokens de saída | por quê |
|---|---|---|---|---|---|
| 08-635-L58105 | error_max_budget_usd | Reached maximum budget ($0.3) | 0,3107 | 1536 | corte do CLI depois da volta paga |
| 14-407a-L67585 | error_max_budget_usd | idem | 0,4027 | 1118 | idem (entrada est. 14 180 tokens, a maior) |
| 25-711a-L78138 | error_max_budget_usd | idem | 0,3161 | 1301 | idem |
| 28-707-L79202 | error_max_budget_usd | idem | 0,3118 | 1394 | idem |
| 29-826-L80362 | error_max_budget_usd | idem | 0,3123 | 1654 | idem |
| 33-707-L83026 | error_max_budget_usd | idem | 0,3352 | 1597 | idem |

O motivo é **defeito do triador** (uso do `--max-budget-usd` como teto de caso com uma volta
só, e o parser que joga fora o envelope de erro com o custo). Não é resposta inválida do
modelo: não há resposta para julgar. Custo real da corrida: 4,1376 + 1,9889 = **US$ 6,1265**,
abaixo do teto de 6,60 que o humano deu.

Por que estoura: cada `claude -p` lê de 10 a 12 mil tokens de cache e cria de 19 a 47 mil
(o prompt de sistema do CLI mais a entrada). A conta da spec §4 (~US$ 0,16 no pior caso)
não tinha essa sobra. Os 16 que passaram custaram de 0,17 a 0,30.


## Peça 1 · replay das 22 respostas (7f-b1b-1, `983ebae`)

As 22 `resposta-modelo.json` foram copiadas sem mudança para `test/fixtures/triador-7f/<caso>/`;
a fixture fica em 2,93 MB, abaixo do teto de 3 MB do teste. O aceite (C)
(`orquestrador-triador-aceite.test.ts`) roda `corridaFixture` com o stub
`triador-stub.sh`, que devolve o `envelope_bruto` gravado e sai com o rc da corrida. O parser,
a conferência e o ledger são os de verdade, no relógio da corrida (2026-10-11) e com o teto de
6,60. Também confere que a assinatura gravada é a de hoje. Resultado: o placar sai igual,
byte a byte, ao de `~/orq-sessoes/corrida-7f-peca6.txt`.

**Vermelho antes (saída crua):**

```
   × aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 209ms
     → expected { gravadas: +0, velhas: [] } to deeply equal { gravadas: 22, velhas: [] }
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-triador-aceite.test.ts > aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37
AssertionError: expected { gravadas: +0, velhas: [] } to deeply equal { gravadas: 22, velhas: [] }
- Expected
+ Received
 Test Files  1 failed (1)
      Tests  1 failed | 5 passed (6)
```

**Verde:**

```
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 104ms
 ✓ test/orquestrador-triador-aceite.test.ts (6 tests) 921ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 695ms
 Test Files  2 passed (2)
      Tests  16 passed (16)
```

## Peça 2 · descarte silencioso (7f-b1b-2, `99407d1`)

Todo descarte grava `modelo.descartado = {regra, trecho}` (além de `modelo.erro`):
`envelope_ilegivel`, `envelope_is_error`, `resposta_sem_classe`, `evidencia_nenhuma_confere`.
O placar mostra `[descartado: <regra>: <trecho>]`. O vermelho são os 6 saindo `[extracao]` sem
`descartado`, e os testes da peça 5 sem `descartado`.

**Vermelho antes (saída crua):**

```
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 343ms
   × aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 326ms
     → expected { c: '08-635-L58105', …(2) } to deeply equal { c: '08-635-L58105', …(2) }
   × modelo do triador, com stub (peça 5) > envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido) 15ms
     → expected undefined to deeply equal { regra: 'envelope_ilegivel', …(1) }
   × modelo do triador, com stub (peça 5) > resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração 13ms
     → expected undefined to deeply equal { …(2) }
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 563ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga 1038ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 442ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 3 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-triador-aceite.test.ts > aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar
AssertionError: expected { c: '08-635-L58105', …(2) } to deeply equal { c: '08-635-L58105', …(2) }
- Expected
+ Received
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido)
AssertionError: expected undefined to deeply equal { regra: 'envelope_ilegivel', …(1) }
- Expected: 
+ Received: 
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração
AssertionError: expected undefined to deeply equal { …(2) }
- Expected: 
+ Received: 
 Test Files  2 failed (2)
      Tests  3 failed | 14 passed (17)
```

**Verde:**

```
 ✓ test/orquestrador-triador-aceite.test.ts (7 tests) 930ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 353ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 343ms
 ✓ test/orquestrador-triador-modelo.test.ts (10 tests) 2265ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 577ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga 1087ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 459ms
 Test Files  2 passed (2)
      Tests  17 passed (17)
```

**Placar em replay depois da peça 2:**

```
01-559-L55054	esperado R3	extração R4? (D9)	final R4 [modelo]	errado	US$ 0.2862
02-559-L55209	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2614
03-627-L55356	esperado R2	extração R4? (D9)	final R2 [modelo]	CERTO	US$ 0.2516
04-600-L55898	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2997
05-627b-L56021	esperado R2	extração R1|R2? (D11)	final R2 [modelo]	CERTO	US$ 0.2913
06-549c-L57053	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2497
07-627j-L57368	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
08-635-L58105	esperado R3	extração R5? (D7)	final R5? [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
09-654-L59896	esperado R1	extração R1|R2? (D11)	final R1 [modelo]	CERTO	US$ 0.2857
10-407a-L64280	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2858
11-689-L65280	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
12-691-L65374	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.1757
13-346d-L66187	esperado R1	extração R1? (D6)	final R1 [modelo]	classe certa, evidência fora	US$ 0.2424
14-407a-L67585	esperado R2	extração R1|R2? (D11)	final R1|R2? [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
15-722-L67970	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
16-723-L68736	esperado R6	extração R6 (D2)	final R6 [extracao]	CERTO	
17-715-L68793	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
18-737-L69920	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2645
19-739-L71699	esperado R3	extração R1? (D8)	final R2 [modelo]	errado	US$ 0.2391
20-801-L72121	esperado R5	extração R5 (D4)	final R5 [extracao]	CERTO	
21-760-L72407	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
22-762-L72665	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
23-856-L73817	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
24-867-L76790	esperado R3	extração R2? (D12)	final R3 [modelo]	classe certa, evidência fora	US$ 0.2656
25-711a-L78138	esperado R1	extração R1|R2? (D11)	final R1|R2? [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
26-711b3-L78647	esperado R1	extração R1 (D6)	final R1 [extracao]	classe certa, evidência fora	
27-741-L79081	esperado R4	extração R2? (D12)	final R4 [modelo]	classe certa, evidência fora	US$ 0.2395
28-707-L79202	esperado R7	extração R4? (D9)	final R4? [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
29-826-L80362	esperado R3	extração - (-)	final - [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
30-900-L81564	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2422
31-898-L82594	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
32-741a-L82726	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
33-707-L83026	esperado R4	extração R4? (D9)	final R4? [descartado: envelope_ilegivel: rc 1: sem result; subtype=error_max_budget_usd is_error=true errors=["Reached maximum budget ($0.3)"]]	errado	
34-898-L83625	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2572
35-950-L85145	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
36-940-L85222	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
37-932-L85272	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 4.1376
```

## Peça 3 · conserto do descarte (7f-b1b-3, `69956a2`)

Defeito do triador, consertado em três frentes:
- `lerEnvelope` lê o envelope do CLI sem `result` como `is_error`, com `subtype`, `errors` e o
  custo. O ledger e o registro passam a ter o custo real e `custo_acima_do_teto`;
- descarte novo `teto_corte_cli`, com o trecho `rc 1: error_max_budget_usd: [...]; pago US$ x e sem resposta`;
- o `--max-budget-usd` passa a ser `teto_corte_usd` (config, padrão **0,60**). O teto do caso
  (0,30) só marca `custo_acima_do_teto`, como a spec §4 manda. O pior caso do teto do dia
  passa a ser o corte, então o dia continua sem passar do teto.

**Quantos dos 6 passam a usar a resposta do modelo no replay: 0.** O envelope gravado não tem
`result`: o CLI não devolveu a resposta paga, e não há o que recuperar. Esses 6 só voltam com
uma chamada nova, que é a mini-corrida da peça 5. O conserto vale para a próxima corrida: com
corte em 0,60, nenhum dos 22 custos observados (máximo 0,4027) seria cortado.

**Asserções existentes que mudaram de número**, todas porque o pior caso do dia foi de 0,30
para 0,60:
- no teste do teto do dia, a chamada no limite passa a ser com o ledger `[1,5; 0,9]` (era `[1,5; 1,2]`);
- o argumento passa a ser `--max-budget-usd 0.6` (era `0.3`);
- a corrida de stub a US$ 0,30 por caso faz 21 chamadas em 6,60 (era 22) e 9 em 3,00 (era 10).

Isso muda a vazão do dia: 9 chamadas cabem em US$ 3,00, não 10. A decisão fica com o chat
(PENDENTES).

**Vermelho antes (saída crua):**

```
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 385ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 363ms
   × aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 358ms
     → expected { c: '08-635-L58105', …(3) } to deeply equal { c: '08-635-L58105', …(3) }
   × modelo do triador, com stub (peça 5) > o teto do dia impede a chamada e grava pulado; no limite exato ainda chama 15ms
     → expected { modelo: 'claude-opus-5-5', …(11) } to deeply equal { modelo: 'claude-opus-5-5', …(1) }
   × modelo do triador, com stub (peça 5) > envelope do corte do CLI (error_max_budget_usd, sem result, da corrida real): o custo pago vai ao ledger e o descarte diz teto_corte_cli 16ms
     → expected { modelo: 'claude-opus-5-5', …(9) } to match object { Object (custo_usd, custo_acima_do_teto) }
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 666ms
   × modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 535ms
     → expected [ …(22) ] to have a length of 21 but got 22
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 472ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 4 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-triador-aceite.test.ts > aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar
AssertionError: expected { c: '08-635-L58105', …(3) } to deeply equal { c: '08-635-L58105', …(3) }
- Expected
+ Received
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > o teto do dia impede a chamada e grava pulado; no limite exato ainda chama
AssertionError: expected { modelo: 'claude-opus-5-5', …(11) } to deeply equal { modelo: 'claude-opus-5-5', …(1) }
- Expected
+ Received
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > envelope do corte do CLI (error_max_budget_usd, sem result, da corrida real): o custo pago vai ao ledger e o descarte diz teto_corte_cli
AssertionError: expected { modelo: 'claude-opus-5-5', …(9) } to match object { Object (custo_usd, custo_acima_do_teto) }
- Expected
+ Received
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga
AssertionError: expected [ …(22) ] to have a length of 21 but got 22
- Expected
+ Received
 Test Files  2 failed (2)
      Tests  4 failed | 15 passed (19)
```

**Verde:**

```
 ✓ test/orquestrador-triador-aceite.test.ts (8 tests) 1681ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 426ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 491ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 524ms
 ✓ test/orquestrador-triador-modelo.test.ts (11 tests) 3213ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 720ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 1620ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 708ms
 Test Files  2 passed (2)
      Tests  19 passed (19)
```

**Placar em replay depois do conserto (peça 3):**

```
01-559-L55054	esperado R3	extração R4? (D9)	final R4 [modelo]	errado	US$ 0.2862
02-559-L55209	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2614
03-627-L55356	esperado R2	extração R4? (D9)	final R2 [modelo]	CERTO	US$ 0.2516
04-600-L55898	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2997
05-627b-L56021	esperado R2	extração R1|R2? (D11)	final R2 [modelo]	CERTO	US$ 0.2913
06-549c-L57053	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2497
07-627j-L57368	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
08-635-L58105	esperado R3	extração R5? (D7)	final R5? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3107 e sem resposta]	errado	US$ 0.3107
09-654-L59896	esperado R1	extração R1|R2? (D11)	final R1 [modelo]	CERTO	US$ 0.2857
10-407a-L64280	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2858
11-689-L65280	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
12-691-L65374	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.1757
13-346d-L66187	esperado R1	extração R1? (D6)	final R1 [modelo]	classe certa, evidência fora	US$ 0.2424
14-407a-L67585	esperado R2	extração R1|R2? (D11)	final R1|R2? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.4027 e sem resposta]	errado	US$ 0.4027
15-722-L67970	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
16-723-L68736	esperado R6	extração R6 (D2)	final R6 [extracao]	CERTO	
17-715-L68793	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
18-737-L69920	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2645
19-739-L71699	esperado R3	extração R1? (D8)	final R2 [modelo]	errado	US$ 0.2391
20-801-L72121	esperado R5	extração R5 (D4)	final R5 [extracao]	CERTO	
21-760-L72407	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
22-762-L72665	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
23-856-L73817	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
24-867-L76790	esperado R3	extração R2? (D12)	final R3 [modelo]	classe certa, evidência fora	US$ 0.2656
25-711a-L78138	esperado R1	extração R1|R2? (D11)	final R1|R2? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3161 e sem resposta]	errado	US$ 0.3161
26-711b3-L78647	esperado R1	extração R1 (D6)	final R1 [extracao]	classe certa, evidência fora	
27-741-L79081	esperado R4	extração R2? (D12)	final R4 [modelo]	classe certa, evidência fora	US$ 0.2395
28-707-L79202	esperado R7	extração R4? (D9)	final R4? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3118 e sem resposta]	errado	US$ 0.3118
29-826-L80362	esperado R3	extração - (-)	final - [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3123 e sem resposta]	errado	US$ 0.3123
30-900-L81564	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2422
31-898-L82594	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
32-741a-L82726	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
33-707-L83026	esperado R4	extração R4? (D9)	final R4? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3352 e sem resposta]	errado	US$ 0.3352
34-898-L83625	esperado R2	extração R2? (D12)	final R2 [modelo]	classe certa, evidência fora	US$ 0.2572
35-950-L85145	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
36-940-L85222	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
37-932-L85272	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 6.1265
```

## Peça 4 · evidência equivalente (7f-b1b-4, `7f748d0`)

Conferência dos 8 "classe certa, evidência fora". Para cada evidência, a linha original foi
tirada da cópia (`lidos`, com o mapa do recorte) e comparada ao trecho citado:

| caso | classe | evidência citada que vale | existe? | sinal da classe? | sustenta o remédio? | veredito |
|---|---|---|---|---|---|---|
| 12-691 | R2 | `691/attempt-{1,2}.prev1/criterios.txt:71` `SQL_1_0 0` e `:68` (o cmd com `\|\| echo 0`) | sim | sim, bloco `### criterio[8] -> FALHA` (`:65`), a mesma saída nas 2 tentativas | sim, o remédio conserta o `criterio[8]` | **vale** (a medição aponta `:65`, o cabeçalho do mesmo bloco) |
| 13-346d | R1 | `346d/attempt-1.prev1/gate-vitest.txt:1423,1607` (`FAIL test/lote-b3-2-periodo.test.ts`) e `attempt-2/diff.stat:3` | sim | sim, o teste está fora da allowlist e o agente o editou na T2 | sim, o remédio põe esse teste na allowlist | **vale** (a medição aponta o enforcement da T2 e o log `:66186`) |
| 18-737 | R2 | `737/attempt-{2.prev1,3}/criterios.txt:55` `FORA_…[id]/page.tsx` e `:52` (o `case $p`) | sim | sim, bloco FALHA do `criterio[6]` | sim, o remédio conserta o `criterio[6]` | **vale** (a medição aponta o log `:69906`, o eco da mesma saída) |
| 24-867 | R3 | `867/attempt-{1.prev1,2}/avaliador-claude.txt:1` ("fora da lista fechada") | sim | sim, o juiz pede autorização da lista fechada | sim, o remédio é token/lista fechada "com o OK do Lucas" | **vale** (a medição aponta os logs `:76748`/`:76769`, que repetem o motivo do juiz) |
| 26-711b3 | R1 (extração) | `711b3/attempt-{2.prev1,3}/gate-vitest.txt:4654,6222,6212,7780` (`FAIL`/`❯ test/sem-insumo.test.ts`) | sim | sim, o teste está fora da allowlist | sim, o remédio põe o `sem-insumo` na allowlist | **vale** (a medição aponta o `claude-output` da T1; as linhas do `saude-motivo` não valem porque o remédio não as cita) |
| 27-741 | R4 | `diff.stat:1` (vazio), `criterios.txt:79` `AUSENTE`, `:71` `VERMELHO`, `gate-vitest:1813` `Tests 8194 passed` | sim (o trecho do diff.stat, "(vazio: …)", é inventado: a linha é vazia) | **não**: nada mostra a falta de código fora do escopo; o próprio modelo diz que ela "vem só do relato do executor" | n/a | **não vale** |
| 30-900 | R2 | `900/attempt-{1.prev1,2}/criterios.txt:63` `ST_0_2` e `:60` (o regex `(1, 2)`) | sim | sim, bloco FALHA do `criterio[7]` | sim | **vale** (a medição aponta `:57`, o cabeçalho) |
| 34-898 | R2 | `898/attempt-3/criterios.txt:39` `ST_11111_2` e `:36` (o grep `delete`) | sim | sim, bloco FALHA do `criterio[4]` | sim, o remédio conserta o `criterio[4]` | **vale** (a linha do juiz da T2 não vale para R2: não está em bloco FALHA) |

A regra proposta e implementada no teste conta a evidência como certa se ela casa a da medição
(mesmo arquivo, linha a ±3) **ou** se é equivalente, isto é, se cumpre todas estas:
1. a linha existe na cópia da evidência (no recorte, uma linha guardada);
2. o trecho citado está na linha: os pedaços entre `...`/`…` aparecem nela, em ordem;
3. a linha carrega o sinal da classe e o remédio aponta para o mesmo alvo:
   - **R1:** um vermelho (`FAIL`, `❯ arq:linha`, `fora_do_pathspec`) ou uma linha do `diff.stat` de um **teste fora da allowlist**, e o remédio cita esse teste;
   - **R2:** a linha está num bloco `### criterio[i] -> FALHA` (ou é o `criterio[i] mecânico` do log), e o remédio cita `criterio[i]`;
   - **R3:** linha do juiz ou do log do motor com token, lista fechada, autorização, `liberacoes.json`, DDL/FK, refatiar ou motor, e o remédio pede decisão, autorização ou token;
   - **R4:** um vermelho do gate num teste **dentro** da allowlist, e o remédio é ticket novo;
   - **R5, R6 e R7:** só a evidência da medição conta.

A regra não afrouxa. Há um teste próprio para isso: trecho inventado, bloco PASS, remédio
que cita outro critério e classe R5 não valem.

**Vermelho antes (a mesma bateria com a regra antiga, só medição):**

```
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 344ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 307ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 306ms
   × aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta) 345ms
     → expected { '12-691-L65374': [], …(7) } to deeply equal { '12-691-L65374': [ …(3) ], …(7) }
   × aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) a regra não afrouxa: trecho que não está na linha, linha sem o sinal, ou remédio que não cita o alvo não valem 1ms
     → expected [] to deeply equal [ Array(1) ]
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 338ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-triador-aceite.test.ts > aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta)
AssertionError: expected { '12-691-L65374': [], …(7) } to deeply equal { '12-691-L65374': [ …(3) ], …(7) }
- Expected
+ Received
 FAIL  test/orquestrador-triador-aceite.test.ts > aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) a regra não afrouxa: trecho que não está na linha, linha sem o sinal, ou remédio que não cita o alvo não valem
AssertionError: expected [] to deeply equal [ Array(1) ]
- Expected
+ Received
 Test Files  1 failed (1)
      Tests  2 failed | 9 passed (11)
```

**Verde:**

```
 ✓ test/orquestrador-triador-aceite.test.ts (11 tests) 2038ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 391ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 334ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 338ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta) 370ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 377ms
 Test Files  1 passed (1)
      Tests  11 passed (11)
```

**Placar com a regra.** O número sai do teste (`28`, e os 7 com a lista exata de refs); a
coluna de veredito dos 7 foi reescrita a partir dessa lista:

```
01-559-L55054	esperado R3	extração R4? (D9)	final R4 [modelo]	errado	US$ 0.2862
02-559-L55209	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2614
03-627-L55356	esperado R2	extração R4? (D9)	final R2 [modelo]	CERTO	US$ 0.2516
04-600-L55898	esperado R4	extração R4? (D9)	final R4 [modelo]	CERTO	US$ 0.2997
05-627b-L56021	esperado R2	extração R1|R2? (D11)	final R2 [modelo]	CERTO	US$ 0.2913
06-549c-L57053	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2497
07-627j-L57368	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
08-635-L58105	esperado R3	extração R5? (D7)	final R5? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3107 e sem resposta]	errado	US$ 0.3107
09-654-L59896	esperado R1	extração R1|R2? (D11)	final R1 [modelo]	CERTO	US$ 0.2857
10-407a-L64280	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO	US$ 0.2858
11-689-L65280	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
12-691-L65374	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO (evidência equivalente)	US$ 0.1757
13-346d-L66187	esperado R1	extração R1? (D6)	final R1 [modelo]	CERTO (evidência equivalente)	US$ 0.2424
14-407a-L67585	esperado R2	extração R1|R2? (D11)	final R1|R2? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.4027 e sem resposta]	errado	US$ 0.4027
15-722-L67970	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
16-723-L68736	esperado R6	extração R6 (D2)	final R6 [extracao]	CERTO	
17-715-L68793	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
18-737-L69920	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO (evidência equivalente)	US$ 0.2645
19-739-L71699	esperado R3	extração R1? (D8)	final R2 [modelo]	errado	US$ 0.2391
20-801-L72121	esperado R5	extração R5 (D4)	final R5 [extracao]	CERTO	
21-760-L72407	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
22-762-L72665	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
23-856-L73817	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
24-867-L76790	esperado R3	extração R2? (D12)	final R3 [modelo]	CERTO (evidência equivalente)	US$ 0.2656
25-711a-L78138	esperado R1	extração R1|R2? (D11)	final R1|R2? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3161 e sem resposta]	errado	US$ 0.3161
26-711b3-L78647	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO (evidência equivalente)	
27-741-L79081	esperado R4	extração R2? (D12)	final R4 [modelo]	classe certa, evidência fora	US$ 0.2395
28-707-L79202	esperado R7	extração R4? (D9)	final R4? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3118 e sem resposta]	errado	US$ 0.3118
29-826-L80362	esperado R3	extração - (-)	final - [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3123 e sem resposta]	errado	US$ 0.3123
30-900-L81564	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO (evidência equivalente)	US$ 0.2422
31-898-L82594	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
32-741a-L82726	esperado R5	extração R5 (D5)	final R5 [extracao]	CERTO	
33-707-L83026	esperado R4	extração R4? (D9)	final R4? [descartado: teto_corte_cli: rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3352 e sem resposta]	errado	US$ 0.3352
34-898-L83625	esperado R2	extração R2? (D12)	final R2 [modelo]	CERTO (evidência equivalente)	US$ 0.2572
35-950-L85145	esperado R1	extração R1 (D6)	final R1 [extracao]	CERTO	
36-940-L85222	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
37-932-L85272	esperado R5	extração R5 (D1)	final R5 [extracao]	CERTO	
-- (C) classe e evidência certas: 28/37 (medição: 21; equivalente: +7) (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 6.1265
```

O "≥ 30/37" fica em `it.fails`: o teste passa enquanto o aceite não é atingido e vira
vermelho, pedindo atualização, quando chegar.


## Peça 5 · R3 no prompt (7f-b1b-5, `12076a1`), sem rodar

Os dois R3 errados: **01-559** (deu R4) e **19-739** (deu R2). No 559 #1 o remédio também
pedia nota na spec, porque o 3º `it` era premissa velha (medição: "parcial"). No 739, o
conserto do critério também pedia FK com DDL e token; o próprio modelo escreveu que, "se isso
se confirmar, o ticket vira R3". O R3 da spec só diz "Parte do remédio não cabe no .md".
Falta dizer quais sinais apontam para isso e que um remédio misto é R3.

**Texto exato proposto.** Troca o bloco R3 da spec:

```
R3  Spec que precisa de decisão humana, token, motor ou refatiamento: ao menos
    uma parte do remédio NÃO cabe no .md do ticket. Sinais: o conserto pede
    token ou autorização nova (lista fechada de asserções, liberacoes.json);
    mexe em DDL, FK ou migration que só o dono aprova; exige mudar o motor; ou
    exige refatiar o ticket em outros. Também é R3 o remédio MISTO: consertar o
    .md (critério, allowlist, premissa velha) E abrir ticket de código, pedir
    token ou mudar o motor.
```

E soma esta regra antes da regra de mérito:

```
- Antes de responder R2 ou R4, confira se o remédio inteiro cabe nessa classe.
  R2 só se consertar o critério no .md basta (sem DDL/FK, token,
  liberacoes.json, motor nem refatiar). R4 só se o .md está certo e basta um
  ticket novo de código. Se o remédio precisa das duas coisas, ou de algo que
  só o dono decide, é R3, e o remédio começa com "decidir:".
```

Ela entra como prompt `7f-b1b-r3`, opt-in (`prompt` no config ou `ORQ_TRIADOR_PROMPT`). O
padrão segue o literal da spec, com o sha conferido no teste. Um prompt desconhecido é erro.
Também entrou `orq triar --fixture --casos a,b,…` para a mini-corrida.

**Risco:** a regra nova pode puxar R4 legítimos para R3 (559 #2, 600, 741, 707 #33). Dos 9
casos da mini-corrida, só o 33-707 é R4 e serve de controle. Medir regressão nos outros R4
pede outra corrida.

**Comando da mini-corrida** (`~/orq-sessoes/corrida-7f-r3.cmd`, não rodado; vale depois do
merge). Roda nos 9 casos: os 5 R3 (01, 08, 19, 24, 29) e os 6 cortados (08, 14, 25, 28, 29,
33). Teto próprio de US$ 5,40 = 9 × 0,60 (o corte). O diretório é novo, e
`~/.orq/corrida-7f-peca6/` não é tocado.

```bash
# Mini-corrida PAGA da 7f-b1b (NÃO rodada pela sessão). Rodar só depois do merge da 7f-b1b na main.
# Casos: os 5 R3 da medição (01-559, 08-635, 19-739, 24-867, 29-826) + os 6 cortados no teto da peça 6
# (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707) = 9 casos, com o prompt proposto 7f-b1b-r3.
# Teto próprio: US$ 5,40 no dia (9 x 0,60, o corte do CLI por caso); o triador não chama se o pior caso passar disso.
# Saída e ledger num diretório novo: ~/.orq/corrida-7f-peca6/ não é tocado.
cd ~/Projetos/orquestrador-kit && ORQ_DIAG_DIR=~/.orq/corrida-7f-r3 ORQ_TRIADOR_TETO_DIA=5.40 ORQ_TRIADOR_PROMPT=7f-b1b-r3 bash scripts/orq triar --fixture test/fixtures/triador-7f --casos 01-559-L55054,08-635-L58105,14-407a-L67585,19-739-L71699,24-867-L76790,25-711a-L78138,28-707-L79202,29-826-L80362,33-707-L83026 > ~/orq-sessoes/corrida-7f-r3.txt 2>&1; echo "rc=$?"
```

**Vermelho antes:**

```
   × modelo do triador, com stub (peça 5) > prompt 7f-b1b-r3 (proposta, opt-in por ORQ_TRIADOR_PROMPT ou config "prompt"): troca o R3 e soma a conferência de R2/R4; o padrão segue o literal da spec 4ms
     → expected undefined to be 'spec' // Object.is equality
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 555ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 983ms
   × modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 111ms
     → [orq triar] flag desconhecida: --casos
: expected 1 to be +0 // Object.is equality
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 401ms
⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > prompt 7f-b1b-r3 (proposta, opt-in por ORQ_TRIADOR_PROMPT ou config "prompt"): troca o R3 e soma a conferência de R2/R4; o padrão segue o literal da spec
AssertionError: expected undefined to be 'spec' // Object.is equality
- Expected: 
+ Received: 
 FAIL  test/orquestrador-triador-modelo.test.ts > modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada
AssertionError: [orq triar] flag desconhecida: --casos
: expected 1 to be +0 // Object.is equality
- Expected
+ Received
 Test Files  1 failed (1)
      Tests  2 failed | 11 passed (13)
```

**Verde:**

```
 ✓ test/orquestrador-triador-aceite.test.ts (11 tests) 1980ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37 343ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 333ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 328ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta) 376ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 380ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 2575ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 569ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 1051ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 386ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 401ms
 Test Files  2 passed (2)
      Tests  24 passed (24)
```

## Peça 6 · docs (7f-b1b-6, `3c59d30`)

CONTRATO §13.5 (corte, prompt, envelope de erro, descarte, `arquivo:linha` novos), §13.6
(`--casos`, `resposta-modelo.json`) e §13.7 (a etapa). CHANGELOG e `docs/PECAS.md` com os
shas. No PENDENTES, a peça 6 sai e entram a mini-corrida e três decisões para o chat. Só docs,
sem vermelho de comportamento (como a 7f-b1-6 e a 7f-b1-8).

## Decisões para o chat do programa

1. **Teto do caso.** 0,30 não cobre o custo real do `claude -p` (0,17 a 0,40). Manter como
   marca (`custo_acima_do_teto`) ou subir.
2. **Corte do CLI em 0,60 e pior caso do dia nele.** Com isso cabem 9 chamadas por dia em
   US$ 3,00, não 10. A alternativa é o pior caso no teto do caso, com o dia podendo passar do
   teto em até 0,30 na última chamada.
3. **Prompt `7f-b1b-r3` como padrão**, depois da mini-corrida. Virar padrão é mudar a spec.

## Fechamento (uma de cada vez, com rc)

| comando | rc | resultado |
|---|---|---|
| `npx tsc --noEmit` | 0 | sem erro |
| `TZ=UTC npx vitest run` | 0 | Test Files 72 passed (72); Tests 1443 passed (1443) |
| `bash scripts/kit/test-shell.sh` | 0 | 26 scripts, "TODOS OS SCRIPTS SAÍRAM rc 0" |

`test-shell.sh` inclui o `test-preflight.sh`, que usa só stub.

## Diff cru de cada commit

### 983ebae 7f-b1b-1: aceite (C) em replay das 22 respostas da corrida real; reproduz 21/37

As 22 `resposta-modelo.json` (108 301 bytes) são cópias byte a byte de `~/.orq/corrida-7f-peca6/fixture-triador-7f/<caso>/resposta-modelo.json` (`cmp` 22/22). Abaixo vão o stat e o diff cru do teste; os 22 JSON estão no commit.

```diff
 .../triador-7f/01-559-L55054/resposta-modelo.json  |  53 ++++++++
 .../triador-7f/02-559-L55209/resposta-modelo.json  |  53 ++++++++
 .../triador-7f/03-627-L55356/resposta-modelo.json  |  48 ++++++++
 .../triador-7f/04-600-L55898/resposta-modelo.json  |  53 ++++++++
 .../triador-7f/05-627b-L56021/resposta-modelo.json |  53 ++++++++
 .../triador-7f/06-549c-L57053/resposta-modelo.json |  58 +++++++++
 .../triador-7f/08-635-L58105/resposta-modelo.json  |  19 +++
 .../triador-7f/09-654-L59896/resposta-modelo.json  |  63 ++++++++++
 .../triador-7f/10-407a-L64280/resposta-modelo.json |  53 ++++++++
 .../triador-7f/12-691-L65374/resposta-modelo.json  |  48 ++++++++
 .../triador-7f/13-346d-L66187/resposta-modelo.json |  48 ++++++++
 .../triador-7f/14-407a-L67585/resposta-modelo.json |  19 +++
 .../triador-7f/18-737-L69920/resposta-modelo.json  |  53 ++++++++
 .../triador-7f/19-739-L71699/resposta-modelo.json  |  48 ++++++++
 .../triador-7f/24-867-L76790/resposta-modelo.json  |  48 ++++++++
 .../triador-7f/25-711a-L78138/resposta-modelo.json |  19 +++
 .../triador-7f/27-741-L79081/resposta-modelo.json  |  53 ++++++++
 .../triador-7f/28-707-L79202/resposta-modelo.json  |  19 +++
 .../triador-7f/29-826-L80362/resposta-modelo.json  |  19 +++
 .../triador-7f/30-900-L81564/resposta-modelo.json  |  48 ++++++++
 .../triador-7f/33-707-L83026/resposta-modelo.json  |  19 +++
 .../triador-7f/34-898-L83625/resposta-modelo.json  |  43 +++++++
 test/orquestrador-triador-aceite.test.ts           | 134 ++++++++++++++++++++-
 23 files changed, 1066 insertions(+), 5 deletions(-)
commit 983ebaef6029c049396761f55f6d8aa1b9fd1aca
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:38:30 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:38:30 2026 -0300

    7f-b1b-1: aceite (C) em replay das 22 respostas da corrida real; reproduz 21/37
    
    As 22 resposta-modelo.json de ~/.orq/corrida-7f-peca6/ (copiadas sem
    mudança) entram em test/fixtures/triador-7f/<caso>/. O teste (C) roda a
    corrida da fixture com o stub do claude devolvendo o envelope_bruto gravado
    (e o rc da corrida), pelo parser, conferência e ledger de verdade, no relógio
    e no teto da corrida (2026-10-11, US$ 6,60). O placar sai igual, byte a byte,
    a ~/orq-sessoes/corrida-7f-peca6.txt: 21/37, 22 chamadas, US$ 4.1376.
    
    Vermelho antes: sem as respostas na fixture, gravadas 0 != 22.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index 5c495cc..728b536 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -15,17 +15,22 @@
  *   (controle) nenhum dos 20 sai firme.
  *   (cortados) nenhum dos 5 de série cortada sai firme: com a D6 da spec os 5
  *       saíam R1 firme, e errado (o agente resolveu o vermelho no retry).
- *   (C) extração + modelo, por replay de `resposta-modelo.json`: peça 6, que
- *       não é da 7f-b1 (a sessão não chama modelo).
+ *   (C) extração + modelo, por REPLAY (7f-b1b): as 22 `resposta-modelo.json`
+ *       da corrida real da peça 6 (10/10, `~/.orq/corrida-7f-peca6/`) estão
+ *       copiadas em `<caso>/resposta-modelo.json`. O `claude` é o stub, que
+ *       devolve o `envelope_bruto` gravado (com o rc da corrida), e o envelope
+ *       passa pelo parser, pela conferência da evidência e pelo ledger de
+ *       verdade. Nenhuma chamada de API.
  *
  * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
  * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
  * de import quebrado.
  */
-import { existsSync, readdirSync, readFileSync } from 'node:fs'
+import { chmodSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
 import { join } from 'node:path'
 import { pathToFileURL } from 'node:url'
-import { describe, expect, it } from 'vitest'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
 
 const FX = join(import.meta.dirname, 'fixtures', 'triador-7f')
 const TRIADOR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'triador')
@@ -144,5 +149,124 @@ describe('aceite do triador (spec 7f-a §7.2)', () => {
     }
   })
 
-  it.todo('(C) extração + modelo ≥ 30/37 por replay de resposta-modelo.json (peça 6, fora da 7f-b1)')
+})
+
+// ─── (C) replay da corrida real da peça 6 ────────────────────────────────────
+
+const STUB = join(import.meta.dirname, 'fixtures', 'claude-envelope', 'triador-stub.sh')
+// a corrida da peça 6: `orq triar --fixture` com ORQ_TRIADOR_TETO_DIA=6.60, em 2026-10-11 (UTC)
+const AGORA_PECA6 = Date.parse('2026-10-11T00:20:45Z')
+const CFG_PECA6 = { modelo: 'claude-opus-5-5', teto_dia_usd: 6.6, teto_caso_usd: 0.3, entrada_max_tokens: 30000, timeout_secs: 120 }
+
+// `~/orq-sessoes/corrida-7f-peca6.txt`, a saída crua da corrida real (21/37).
+const PLACAR_PECA6 = [
+  "01-559-L55054\tesperado R3\textração R4? (D9)\tfinal R4 [modelo]\terrado\tUS$ 0.2862",
+  "02-559-L55209\tesperado R4\textração R4? (D9)\tfinal R4 [modelo]\tCERTO\tUS$ 0.2614",
+  "03-627-L55356\tesperado R2\textração R4? (D9)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2516",
+  "04-600-L55898\tesperado R4\textração R4? (D9)\tfinal R4 [modelo]\tCERTO\tUS$ 0.2997",
+  "05-627b-L56021\tesperado R2\textração R1|R2? (D11)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2913",
+  "06-549c-L57053\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2497",
+  "07-627j-L57368\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "08-635-L58105\tesperado R3\textração R5? (D7)\tfinal R5? [extracao]\terrado\t",
+  "09-654-L59896\tesperado R1\textração R1|R2? (D11)\tfinal R1 [modelo]\tCERTO\tUS$ 0.2857",
+  "10-407a-L64280\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tCERTO\tUS$ 0.2858",
+  "11-689-L65280\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "12-691-L65374\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.1757",
+  "13-346d-L66187\tesperado R1\textração R1? (D6)\tfinal R1 [modelo]\tclasse certa, evidência fora\tUS$ 0.2424",
+  "14-407a-L67585\tesperado R2\textração R1|R2? (D11)\tfinal R1|R2? [extracao]\terrado\t",
+  "15-722-L67970\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "16-723-L68736\tesperado R6\textração R6 (D2)\tfinal R6 [extracao]\tCERTO\t",
+  "17-715-L68793\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "18-737-L69920\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2645",
+  "19-739-L71699\tesperado R3\textração R1? (D8)\tfinal R2 [modelo]\terrado\tUS$ 0.2391",
+  "20-801-L72121\tesperado R5\textração R5 (D4)\tfinal R5 [extracao]\tCERTO\t",
+  "21-760-L72407\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
+  "22-762-L72665\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "23-856-L73817\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "24-867-L76790\tesperado R3\textração R2? (D12)\tfinal R3 [modelo]\tclasse certa, evidência fora\tUS$ 0.2656",
+  "25-711a-L78138\tesperado R1\textração R1|R2? (D11)\tfinal R1|R2? [extracao]\terrado\t",
+  "26-711b3-L78647\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tclasse certa, evidência fora\t",
+  "27-741-L79081\tesperado R4\textração R2? (D12)\tfinal R4 [modelo]\tclasse certa, evidência fora\tUS$ 0.2395",
+  "28-707-L79202\tesperado R7\textração R4? (D9)\tfinal R4? [extracao]\terrado\t",
+  "29-826-L80362\tesperado R3\textração - (-)\tfinal - [extracao]\terrado\t",
+  "30-900-L81564\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2422",
+  "31-898-L82594\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
+  "32-741a-L82726\tesperado R5\textração R5 (D5)\tfinal R5 [extracao]\tCERTO\t",
+  "33-707-L83026\tesperado R4\textração R4? (D9)\tfinal R4? [extracao]\terrado\t",
+  "34-898-L83625\tesperado R2\textração R2? (D12)\tfinal R2 [modelo]\tclasse certa, evidência fora\tUS$ 0.2572",
+  "35-950-L85145\tesperado R1\textração R1 (D6)\tfinal R1 [extracao]\tCERTO\t",
+  "36-940-L85222\tesperado R5\textração R5 (D1)\tfinal R5 [extracao]\tCERTO\t",
+  "37-932-L85272\tesperado R5\textração R5 (D1)\tfinal R5 [extracao]\tCERTO\t",
+  "-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 4.1376",
+].join('\n')
+
+interface Gravada {
+  caso: string
+  assinatura: string
+  modelo: { envelope_bruto?: string; erro?: string }
+}
+interface Replay {
+  texto: string
+  linhas: { caso: string; esperado: string | null; final: string | null; fonte: string; certo: boolean; evidencia_certa: boolean }[]
+  diags: Map<string, { classe: string | null; fonte: string; evidencia: Ref[]; modelo: Record<string, unknown> | null }>
+  gravadas: number
+  assinaturas_velhas: string[]
+}
+
+let base = ''
+const envAntes = { ...process.env }
+
+async function replay(): Promise<Replay | null> {
+  try {
+    const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
+    const { corridaFixture, placar } = await imp('corrida.ts')
+    const { criarPassoModelo } = await imp('modelo.ts')
+    const passo = criarPassoModelo(CFG_PECA6)
+    let gravadas = 0
+    const velhas: string[] = []
+    const modelo = (ctx: { ev: { id: string }; assinatura: string }) => {
+      const f = join(FX, ctx.ev.id, 'resposta-modelo.json')
+      if (!existsSync(f)) return { registro: { modelo: null, pulado: 'sem_replay' } }
+      const g = JSON.parse(readFileSync(f, 'utf8')) as Gravada
+      if (g.assinatura !== ctx.assinatura) velhas.push(ctx.ev.id)
+      gravadas++
+      writeFileSync(join(base, 'resposta.json'), g.modelo.envelope_bruto ?? '')
+      process.env.STUB_RC = /\(rc (\d+)\)/.exec(g.modelo.erro ?? '')?.[1] ?? '0'
+      return passo(ctx)
+    }
+    const linhas = corridaFixture(FX, { modelo, agora: AGORA_PECA6, forcar: true })
+    const diags = new Map<string, any>()
+    for (const l of linhas) diags.set(l.caso, JSON.parse(readFileSync(join(base, 'diag', 'fixture-triador-7f', `${l.caso}.json`), 'utf8')))
+    return { texto: placar(linhas), linhas, diags, gravadas, assinaturas_velhas: velhas }
+  } catch (e) {
+    return null
+  }
+}
+
+describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)', () => {
+  beforeAll(() => {
+    base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-replay-')))
+    mkdirSync(join(base, 'trava'))
+    writeFileSync(join(base, 'trava', 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(base, 'trava.log')}"\nexit 99\n`)
+    chmodSync(join(base, 'trava', 'claude'), 0o755)
+    Object.assign(process.env, {
+      ORQ_DIAG_DIR: join(base, 'diag'),
+      ORQ_REPOS: join(base, 'repos.json'),
+      ORQ_TRIADOR_CLAUDE: STUB,
+      STUB_LOG: join(base, 'stub.log'),
+      STUB_RESPOSTA: join(base, 'resposta.json'),
+      PATH: `${join(base, 'trava')}:${envAntes.PATH}`,
+    })
+  })
+  afterAll(() => {
+    // a trava do claude real nunca pode ter sido tocada
+    expect(existsSync(join(base, 'trava.log')) ? readFileSync(join(base, 'trava.log'), 'utf8') : '').toBe('')
+    process.env = { ...envAntes }
+  })
+
+  it('(C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37', async () => {
+    const r = await replay()
+    expect({ gravadas: r?.gravadas, velhas: r?.assinaturas_velhas }).toEqual({ gravadas: 22, velhas: [] })
+    expect(r?.texto).toBe(PLACAR_PECA6)
+  })
 })
```

### 99407d1 7f-b1b-2: todo descarte da resposta do modelo grava modelo.descartado e sai no placar

```diff
commit 99407d18660641ea11337d26887b148e0400d0bd
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:39:59 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:39:59 2026 -0300

    7f-b1b-2: todo descarte da resposta do modelo grava modelo.descartado e sai no placar
    
    modelo.ts: cada caminho que descarta a resposta (envelope ilegível, is_error,
    sem JSON com classe, nenhuma evidência confere) grava, além de modelo.erro,
    modelo.descartado = {regra, trecho}. No envelope ilegível que é JSON, o
    trecho traz subtype, is_error e errors (o que o placar escondia).
    corrida.ts: o placar mostra [descartado: <regra>: <trecho>] no lugar de
    [extracao] quando a resposta foi descartada.
    
    Vermelho antes: os 6 (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707) saíam
    [extracao] sem modelo.descartado; os testes da peça 5 sem descartado.
    No replay, os 6 mostram: subtype=error_max_budget_usd, "Reached maximum
    budget ($0.3)".
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

 scripts/orquestrador/triador/corrida.ts  |  7 +++++--
 scripts/orquestrador/triador/modelo.ts   | 32 +++++++++++++++++++++++++++----
 test/orquestrador-triador-aceite.test.ts | 33 +++++++++++++++++++++++++++++---
 test/orquestrador-triador-modelo.test.ts | 20 +++++++++++++++----
 4 files changed, 79 insertions(+), 13 deletions(-)
diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
index 5f380ca..d405747 100644
--- a/scripts/orquestrador/triador/corrida.ts
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -38,6 +38,8 @@ export interface LinhaPlacar {
   evidencia_certa: boolean
   custo_usd: number | null
   chamou: boolean
+  /** a resposta do modelo descartada, com o motivo (modelo.ts, `Descarte`) */
+  descartado: { regra: string; trecho: string } | null
 }
 
 const casa = (dada: Ref[], esp: Esperado['evidencia']) =>
@@ -69,7 +71,7 @@ export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; for
         )
       }
     }
-    const m = (diag.modelo ?? {}) as { custo_usd?: number | null }
+    const m = (diag.modelo ?? {}) as { custo_usd?: number | null; descartado?: { regra: string; trecho: string } }
     out.push({
       caso,
       esperado: esp.classe,
@@ -81,6 +83,7 @@ export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; for
       evidencia_certa: casa(diag.evidencia, esp.evidencia),
       custo_usd: m.custo_usd ?? null,
       chamou,
+      descartado: diag.fonte === 'extracao' ? (m.descartado ?? null) : null,
     })
   }
   return out
@@ -88,7 +91,7 @@ export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; for
 
 export function placar(ls: LinhaPlacar[]): string {
   const linhas = ls.map((l) =>
-    [l.caso, `esperado ${l.esperado}`, `extração ${l.extracao ?? '-'} (${l.regra ?? '-'})`, `final ${l.final ?? '-'} [${l.fonte}]`, l.certo ? (l.evidencia_certa ? 'CERTO' : 'classe certa, evidência fora') : 'errado', l.custo_usd != null ? `US$ ${l.custo_usd.toFixed(4)}` : ''].join('\t'),
+    [l.caso, `esperado ${l.esperado}`, `extração ${l.extracao ?? '-'} (${l.regra ?? '-'})`, `final ${l.final ?? '-'} [${l.descartado ? `descartado: ${l.descartado.regra}: ${l.descartado.trecho}` : l.fonte}]`, l.certo ? (l.evidencia_certa ? 'CERTO' : 'classe certa, evidência fora') : 'errado', l.custo_usd != null ? `US$ ${l.custo_usd.toFixed(4)}` : ''].join('\t'),
   )
   const certos = ls.filter((l) => l.certo && l.evidencia_certa).length
   const custo = ls.reduce((s, l) => s + (l.custo_usd ?? 0), 0)
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index 9d3575c..6ef6d4b 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -332,10 +332,31 @@ function registrar(g: Guarda, agora: number, x: Gasto): void {
   g.escrever(join(g.raiz, 'custo.json'), JSON.stringify(l, null, 1) + '\n')
 }
 
+/**
+ * Por que a resposta do modelo foi descartada (e valeu a extração): a regra
+ * que descartou e o trecho que a mostra. Nenhum descarte é silencioso (7f-b1b).
+ */
+export interface Descarte {
+  regra: 'envelope_ilegivel' | 'envelope_is_error' | 'resposta_sem_classe' | 'evidencia_nenhuma_confere'
+  trecho: string
+}
+
+/** O que o stdout ilegível mostra: o subtipo e os erros, se for JSON; senão o começo. */
+function trechoIlegivel(stdout: string, rc: number): string {
+  try {
+    const j = JSON.parse(stdout.trim()) as Record<string, unknown>
+    if (j && typeof j === 'object') return trecho(`rc ${rc}: sem result; subtype=${String(j.subtype)} is_error=${String(j.is_error)} errors=${JSON.stringify(j.errors ?? null)}`)
+  } catch {
+    /* não é JSON */
+  }
+  return trecho(`rc ${rc}: ${stdout.trim() || '(stdout vazio)'}`)
+}
+
 export interface RegistroModelo {
   modelo: string | null
   pulado?: 'teto_dia' | 'desligado'
   erro?: string
+  descartado?: Descarte
   custo_usd?: number | null
   tokens_in?: number | null
   tokens_out?: number | null
@@ -373,13 +394,16 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
       cortes: entrada.cortes,
       envelope_bruto: r.stdout.slice(0, 20000),
     }
-    if (!env) return { registro: { ...reg, erro: `envelope ilegível (rc ${r.rc})` } }
-    if (env.is_error) return { registro: { ...reg, erro: `envelope com is_error: ${env.result.slice(0, 200)}` } }
+    if (!env) return { registro: { ...reg, erro: `envelope ilegível (rc ${r.rc})`, descartado: { regra: 'envelope_ilegivel', trecho: trechoIlegivel(r.stdout, r.rc) } } }
+    if (env.is_error) return { registro: { ...reg, erro: `envelope com is_error: ${env.result.slice(0, 200)}`, descartado: { regra: 'envelope_is_error', trecho: trecho(env.result) } } }
     const resp = lerResposta(env.result)
-    if (!resp) return { registro: { ...reg, erro: 'resposta sem JSON com classe R1-R7' } }
+    if (!resp) return { registro: { ...reg, erro: 'resposta sem JSON com classe R1-R7', descartado: { regra: 'resposta_sem_classe', trecho: trecho(env.result) } } }
     const { validas, descartadas } = conferirEvidencia(ev, resp.evidencia)
     const comResposta = { ...reg, evidencia_descartada: descartadas.length, resposta: resp }
-    if (!validas.length) return { registro: { ...comResposta, erro: 'nenhuma evidência confere com a cópia' } }
+    if (!validas.length) {
+      const refs = descartadas.map((x) => `${x.arquivo}:${x.linha ?? '-'}`).join('; ')
+      return { registro: { ...comResposta, erro: 'nenhuma evidência confere com a cópia', descartado: { regra: 'evidencia_nenhuma_confere', trecho: trecho(refs || '(resposta sem evidência)') } } }
+    }
     return { registro: comResposta, resposta: { ...resp, evidencia: validas } }
   }
 }
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index 728b536..dc2af42 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -200,6 +200,15 @@ const PLACAR_PECA6 = [
   "-- (C) classe e evidência certas: 21/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ 4.1376",
 ].join('\n')
 
+// os 6 que saíram [extracao] na corrida real sem o motivo no placar
+const DESCARTADOS_PECA6 = ['08-635-L58105', '14-407a-L67585', '25-711a-L78138', '28-707-L79202', '29-826-L80362', '33-707-L83026']
+const classes = (texto: string) =>
+  texto
+    .split('\n')
+    .slice(0, -1)
+    .map((l) => l.split('\t'))
+    .map(([caso, esp, ext, final, veredito]) => [caso, esp, ext, final?.replace(/ \[.*$/, ''), veredito])
+
 interface Gravada {
   caso: string
   assinatura: string
@@ -221,6 +230,9 @@ async function replay(): Promise<Replay | null> {
     const imp = async (f: string) => (await import(pathToFileURL(join(TRIADOR, f)).href)) as Record<string, any>
     const { corridaFixture, placar } = await imp('corrida.ts')
     const { criarPassoModelo } = await imp('modelo.ts')
+    // cada replay num ORQ_DIAG_DIR novo: o ledger de um não pesa no teto do outro
+    const diag = mkdtempSync(join(base, 'diag-'))
+    process.env.ORQ_DIAG_DIR = diag
     const passo = criarPassoModelo(CFG_PECA6)
     let gravadas = 0
     const velhas: string[] = []
@@ -236,7 +248,7 @@ async function replay(): Promise<Replay | null> {
     }
     const linhas = corridaFixture(FX, { modelo, agora: AGORA_PECA6, forcar: true })
     const diags = new Map<string, any>()
-    for (const l of linhas) diags.set(l.caso, JSON.parse(readFileSync(join(base, 'diag', 'fixture-triador-7f', `${l.caso}.json`), 'utf8')))
+    for (const l of linhas) diags.set(l.caso, JSON.parse(readFileSync(join(diag, 'fixture-triador-7f', `${l.caso}.json`), 'utf8')))
     return { texto: placar(linhas), linhas, diags, gravadas, assinaturas_velhas: velhas }
   } catch (e) {
     return null
@@ -250,7 +262,6 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
     writeFileSync(join(base, 'trava', 'claude'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${join(base, 'trava.log')}"\nexit 99\n`)
     chmodSync(join(base, 'trava', 'claude'), 0o755)
     Object.assign(process.env, {
-      ORQ_DIAG_DIR: join(base, 'diag'),
       ORQ_REPOS: join(base, 'repos.json'),
       ORQ_TRIADOR_CLAUDE: STUB,
       STUB_LOG: join(base, 'stub.log'),
@@ -267,6 +278,22 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
   it('(C) as 22 respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real: 21/37', async () => {
     const r = await replay()
     expect({ gravadas: r?.gravadas, velhas: r?.assinaturas_velhas }).toEqual({ gravadas: 22, velhas: [] })
-    expect(r?.texto).toBe(PLACAR_PECA6)
+    // caso, esperado, extração, classe final e veredito de cada linha; a fonte
+    // dos descartados e o custo mudam nas peças 2 e 3 (testes abaixo)
+    expect(classes(r?.texto ?? '')).toEqual(classes(PLACAR_PECA6))
+    expect(r?.texto.split('\n').at(-1)).toMatch(/^-- \(C\) classe e evidência certas: 21\/37 \(aceite: >= 30\); chamadas novas: 22;/)
+  })
+
+  it('(C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar', async () => {
+    const r = await replay()
+    const descartados = [...(r?.diags ?? [])].filter(([, d]) => d.modelo && !d.modelo.pulado && d.fonte !== 'modelo').map(([c]) => c)
+    expect(descartados).toEqual(DESCARTADOS_PECA6)
+    for (const c of DESCARTADOS_PECA6) {
+      const d = r?.diags.get(c)?.modelo?.descartado as { regra?: string; trecho?: string } | undefined
+      expect({ c, regra: typeof d?.regra, trecho: !!d?.trecho }).toEqual({ c, regra: 'string', trecho: true })
+      const linha = r?.texto.split('\n').find((l) => l.startsWith(c)) ?? ''
+      expect(linha.split('\t')[3]).toMatch(new RegExp(`^final \\S+ \\[descartado: ${d?.regra}: .+\\]$`))
+    }
+    for (const [c, d] of r?.diags ?? []) if (d.fonte === 'modelo') expect({ c, descartado: d.modelo?.descartado }).toEqual({ c, descartado: undefined })
   })
 })
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
index ee926e4..089e621 100644
--- a/test/orquestrador-triador-modelo.test.ts
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -150,6 +150,7 @@ describe('modelo do triador, com stub (peça 5)', () => {
     const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
     expect([d?.classe, d?.fonte, d?.firme, d?.regra]).toEqual(['R4?', 'extracao', false, 'D9'])
     expect(d?.modelo?.erro).toMatch(/envelope ilegível/)
+    expect(d?.modelo?.descartado).toEqual({ regra: 'envelope_ilegivel', trecho: 'rc 0: Error: conexão recusada' })
     expect(chamadas()).toHaveLength(1)
     const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number | null }[]> }
     expect(l.dias[hoje()]).toEqual([expect.objectContaining({ id: '559', custo_usd: null })])
@@ -173,15 +174,26 @@ describe('modelo do triador, com stub (peça 5)', () => {
 
   it('resposta sem nenhuma evidência que confere, ou com classe fora de R1-R7: vale a extração', async () => {
     const c = await contexto()
-    for (const result of [
-      JSON.stringify({ classe: 'R3', confianca: 'alta', evidencia: [{ arquivo: 'x', linha: 1 }], remedio: 'x', requeue: 'nao', justificativa: '' }),
-      JSON.stringify({ classe: 'R9', confianca: 'alta', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: '' }),
-    ]) {
+    for (const [result, descartado] of [
+      [
+        JSON.stringify({ classe: 'R3', confianca: 'alta', evidencia: [{ arquivo: 'x', linha: 1 }], remedio: 'x', requeue: 'nao', justificativa: '' }),
+        { regra: 'evidencia_nenhuma_confere', trecho: 'x:1' },
+      ],
+      [
+        JSON.stringify({ classe: 'R9', confianca: 'alta', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: '' }),
+        { regra: 'resposta_sem_classe', trecho: expect.stringMatching(/^\{"classe":"R9"/) },
+      ],
+    ] as const) {
       envelope(result)
       const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
       expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
       expect(d?.modelo?.erro).toBeTruthy()
+      expect(d?.modelo?.descartado).toEqual(descartado)
     }
+    // envelope com is_error (e result): o motivo é o result
+    writeFileSync(join(base, 'resposta.json'), JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: 'API Error: 529 overloaded', total_cost_usd: 0 }))
+    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
+    expect(d?.modelo?.descartado).toEqual({ regra: 'envelope_is_error', trecho: 'API Error: 529 overloaded' })
   })
 
   it('sem stub, sob teste, a chamada real é recusada antes de existir processo', async () => {
```

### 69956a2 7f-b1b-3: corte do CLI separado do teto do caso; envelope de erro sem result entra no ledger

```diff
commit 69956a22bd878f31b036d22f438509a2fa1797bb
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:42:12 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:42:12 2026 -0300

    7f-b1b-3: corte do CLI separado do teto do caso; envelope de erro sem result entra no ledger
    
    O motivo dos 6 descartes (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707)
    é defeito do triador, não do parser nem da resposta: o claude -p rodava com
    --max-budget-usd = teto do caso (0,30) e --max-turns 1. A volta termina, é
    paga (US$ 0,31 a 0,40), e o CLI devolve error_max_budget_usd sem result.
    lerEnvelope exigia result string: o envelope virava "ilegível" e o custo
    pago sumia (ledger com null; placar com US$ 4,1376 quando a corrida pagou
    6,1265).
    
    - lerEnvelope lê o envelope do CLI sem result como is_error, com subtype,
      errors e o custo; o ledger e o registro recebem o custo real e
      custo_acima_do_teto;
    - descarte novo teto_corte_cli, com o trecho "rc, subtype, errors, pago";
    - o --max-budget-usd passa a ser teto_corte_usd (config, padrão 0,60); o
      teto do caso (0,30) só marca custo_acima_do_teto, como na spec §4;
    - o pior caso do teto do dia passa a ser o corte (0,60): o dia continua
      sem passar do teto. Efeito no stub de US$ 0,30: 21 chamadas em 6,60 (era
      22) e 9 em 3,00 (era 10).
    
    No replay: 0 dos 6 passam a usar a resposta do modelo (não há result para
    recuperar); a recuperação só sai de uma chamada nova (mini-corrida, peça 5).
    
    Vermelho antes: 4 asserções (custo null no envelope cortado, descarte
    envelope_ilegivel, --max-budget-usd 0.3, 22/10 chamadas, custo 4.1376).
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

 scripts/orquestrador/triador/corrida.ts  |  4 +-
 scripts/orquestrador/triador/modelo.ts   | 74 ++++++++++++++++++++++++++------
 test/orquestrador-triador-aceite.test.ts | 12 ++++++
 test/orquestrador-triador-modelo.test.ts | 38 +++++++++++-----
 4 files changed, 102 insertions(+), 26 deletions(-)
diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
index d405747..8ee11a4 100644
--- a/scripts/orquestrador/triador/corrida.ts
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -3,7 +3,9 @@
  * fixture `test/fixtures/triador-7f`, no estado da passada (spec 7f-a §7.2 C).
  *
  * É a corrida da PEÇA 6: o humano roda depois do merge, com o modelo de
- * verdade e o teto do dia em US$ 6,60 (22 palpites × US$ 0,30). Os firmes não
+ * verdade e o teto do dia em US$ 6,60 (22 palpites × US$ 0,30; com o pior
+ * caso no corte do CLI, US$ 0,60, a última chamada só sai se o gasto real
+ * deixar, ver modelo.ts). Os firmes não
  * chamam modelo. Cada caso grava, em `ORQ_DIAG_DIR/fixture-triador-7f/`, o
  * diagnóstico e `<caso>/resposta-modelo.json` (o registro do modelo, para o
  * replay da peça 6). Nada é escrito na fixture: ela entra na `Guarda` como
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index 6ef6d4b..11578ed 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -12,9 +12,18 @@
  * falhe: `modelo.erro` fica registrado e só `--forcar` repete.
  *
  * Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json`, chaves opcionais
- * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `entrada_max_tokens`,
- * `timeout_secs`). `modelo: null` desliga o modelo. `ORQ_TRIADOR_TETO_DIA`
- * sobrepõe o teto do dia (a corrida da peça 6 usa US$ 6,60).
+ * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `teto_corte_usd`,
+ * `entrada_max_tokens`, `timeout_secs`). `modelo: null` desliga o modelo.
+ * `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia (a corrida da peça 6 usa
+ * US$ 6,60).
+ *
+ * Teto do caso x corte do CLI (7f-b1b): o `--max-budget-usd` do `claude -p`,
+ * com uma volta só, não impede o gasto: a volta termina, é paga, e o CLI
+ * devolve `error_max_budget_usd` SEM `result`. Na corrida real da peça 6, 6
+ * de 22 casos pagaram US$ 0,31 a 0,40 e perderam a resposta. Por isso o corte
+ * do CLI é `teto_corte_usd` (padrão US$ 0,60), acima do teto do caso; o teto
+ * do caso (US$ 0,30) só marca `custo_acima_do_teto` no ledger, como na spec
+ * §4. O pior caso de uma chamada, para o teto do dia, é o corte.
  */
 import { spawnSync } from 'node:child_process'
 import { readFileSync } from 'node:fs'
@@ -32,6 +41,8 @@ export interface ConfigModelo {
   modelo: string | null
   teto_dia_usd: number
   teto_caso_usd: number
+  /** o `--max-budget-usd` do CLI: corta (e descarta a resposta paga) só acima disto */
+  teto_corte_usd: number
   entrada_max_tokens: number
   timeout_secs: number
 }
@@ -40,6 +51,7 @@ export const PADRAO: ConfigModelo = {
   modelo: 'claude-opus-5-5',
   teto_dia_usd: 3,
   teto_caso_usd: 0.3,
+  teto_corte_usd: 0.6,
   entrada_max_tokens: 30000,
   timeout_secs: 120,
 }
@@ -58,6 +70,7 @@ export function lerConfigModelo(): ConfigModelo {
     modelo: c.modelo === null ? null : typeof c.modelo === 'string' && c.modelo ? c.modelo : PADRAO.modelo,
     teto_dia_usd: process.env.ORQ_TRIADOR_TETO_DIA && Number.isFinite(tetoEnv) ? tetoEnv : num(c.teto_dia_usd, PADRAO.teto_dia_usd),
     teto_caso_usd: num(c.teto_caso_usd, PADRAO.teto_caso_usd),
+    teto_corte_usd: num(c.teto_corte_usd, PADRAO.teto_corte_usd),
     entrada_max_tokens: num(c.entrada_max_tokens, PADRAO.entrada_max_tokens),
     timeout_secs: num(c.timeout_secs, PADRAO.timeout_secs),
   }
@@ -183,6 +196,10 @@ export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTok
 export interface Envelope {
   result: string
   is_error: boolean
+  /** `subtype` do envelope (`success`, `error_max_budget_usd`, …) */
+  subtype: string | null
+  /** `errors` do envelope, quando ele vem sem `result` */
+  erros: string[]
   custo_usd: number | null
   tokens_in: number | null
   tokens_out: number | null
@@ -191,7 +208,7 @@ export interface Envelope {
 /**
  * `claude -p --output-format json --model <m>` sem ferramentas e com uma volta
  * (o molde do juiz, `executor.sh:753-755`), prompt pela entrada padrão,
- * `--max-budget-usd` no teto do caso, e timeout. O binário é
+ * `--max-budget-usd` no corte (`teto_corte_usd`), e timeout. O binário é
  * `ORQ_TRIADOR_CLAUDE` ou `claude`.
  */
 export class ChamadaRealRecusada extends Error {}
@@ -206,19 +223,34 @@ export function chamar(prompt: string, cfg: ConfigModelo): { rc: number; stdout:
   const t0 = Date.now()
   const r = spawnSync(
     bin,
-    ['-p', '--output-format', 'json', '--model', cfg.modelo ?? '', '--allowedTools', '', '--max-turns', '1', '--max-budget-usd', String(cfg.teto_caso_usd)],
+    ['-p', '--output-format', 'json', '--model', cfg.modelo ?? '', '--allowedTools', '', '--max-turns', '1', '--max-budget-usd', String(cfg.teto_corte_usd ?? PADRAO.teto_corte_usd)],
     { input: prompt, encoding: 'utf8', timeout: cfg.timeout_secs * 1000, maxBuffer: 16 * 1024 * 1024, killSignal: 'SIGKILL' },
   )
   return { rc: r.status ?? (r.error ? 127 : 124), stdout: r.stdout ?? '', ms: Date.now() - t0 }
 }
 
+/**
+ * O envelope de `claude -p --output-format json`. O de erro do CLI vem sem
+ * `result` (ex.: `error_max_budget_usd`), e ainda assim traz o custo pago:
+ * ele é lido como `is_error`, com `subtype` e `erros`, e o custo vai ao ledger.
+ */
 export function lerEnvelope(stdout: string): Envelope | null {
   try {
     const j = JSON.parse(stdout.trim()) as Record<string, unknown>
-    if (typeof j.result !== 'string') return null
+    if (!j || typeof j !== 'object' || Array.isArray(j)) return null
+    const semResult = typeof j.result !== 'string'
+    if (semResult && j.type !== 'result') return null
     const u = (j.usage ?? {}) as Record<string, unknown>
     const num = (v: unknown) => (typeof v === 'number' ? v : null)
-    return { result: j.result, is_error: j.is_error === true, custo_usd: num(j.total_cost_usd), tokens_in: num(u.input_tokens), tokens_out: num(u.output_tokens) }
+    return {
+      result: semResult ? '' : (j.result as string),
+      is_error: semResult || j.is_error === true,
+      subtype: typeof j.subtype === 'string' ? j.subtype : null,
+      erros: Array.isArray(j.errors) ? j.errors.map(String) : [],
+      custo_usd: num(j.total_cost_usd),
+      tokens_in: num(u.input_tokens),
+      tokens_out: num(u.output_tokens),
+    }
   } catch {
     return null
   }
@@ -321,9 +353,9 @@ export function lerLedger(g: Guarda): { dias: Record<string, Gasto[]> } {
   }
 }
 
-/** Gasto do dia; entrada sem custo conhecido conta como o teto do caso (o pior caso). */
-export function gastoDoDia(g: Guarda, agora: number, tetoCaso: number): number {
-  return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? tetoCaso), 0)
+/** Gasto do dia; entrada sem custo conhecido conta como `piorCaso` (o corte do CLI). */
+export function gastoDoDia(g: Guarda, agora: number, piorCaso: number): number {
+  return (lerLedger(g).dias[dia(agora)] ?? []).reduce((s, x) => s + (x.custo_usd ?? piorCaso), 0)
 }
 
 function registrar(g: Guarda, agora: number, x: Gasto): void {
@@ -337,7 +369,7 @@ function registrar(g: Guarda, agora: number, x: Gasto): void {
  * que descartou e o trecho que a mostra. Nenhum descarte é silencioso (7f-b1b).
  */
 export interface Descarte {
-  regra: 'envelope_ilegivel' | 'envelope_is_error' | 'resposta_sem_classe' | 'evidencia_nenhuma_confere'
+  regra: 'envelope_ilegivel' | 'teto_corte_cli' | 'envelope_is_error' | 'resposta_sem_classe' | 'evidencia_nenhuma_confere'
   trecho: string
 }
 
@@ -373,8 +405,9 @@ export interface RegistroModelo {
 export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoModelo {
   return ({ ev, ext, repo, assinatura, guarda, agora }) => {
     if (!cfg.modelo) return { registro: { modelo: null, pulado: 'desligado' } satisfies RegistroModelo }
-    // Teto do dia: a chamada só sai se, mesmo no pior caso (o teto do caso), o dia não passa do teto.
-    if (microdolares(gastoDoDia(guarda, agora, cfg.teto_caso_usd) + cfg.teto_caso_usd) > microdolares(cfg.teto_dia_usd)) {
+    // Teto do dia: a chamada só sai se, mesmo no pior caso (o corte do CLI), o dia não passa do teto.
+    const pior = cfg.teto_corte_usd ?? PADRAO.teto_corte_usd
+    if (microdolares(gastoDoDia(guarda, agora, pior) + pior) > microdolares(cfg.teto_dia_usd)) {
       return { registro: { modelo: cfg.modelo, pulado: 'teto_dia' } satisfies RegistroModelo }
     }
     const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens)
@@ -395,7 +428,20 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
       envelope_bruto: r.stdout.slice(0, 20000),
     }
     if (!env) return { registro: { ...reg, erro: `envelope ilegível (rc ${r.rc})`, descartado: { regra: 'envelope_ilegivel', trecho: trechoIlegivel(r.stdout, r.rc) } } }
-    if (env.is_error) return { registro: { ...reg, erro: `envelope com is_error: ${env.result.slice(0, 200)}`, descartado: { regra: 'envelope_is_error', trecho: trecho(env.result) } } }
+    if (env.is_error && env.subtype === 'error_max_budget_usd') {
+      const pago = env.custo_usd != null ? `pago US$ ${env.custo_usd.toFixed(4)}` : 'custo desconhecido'
+      return {
+        registro: {
+          ...reg,
+          erro: `corte do CLI (error_max_budget_usd): ${pago} e sem resposta`,
+          descartado: { regra: 'teto_corte_cli', trecho: trecho(`rc ${r.rc}: ${env.subtype}: ${JSON.stringify(env.erros)}; ${pago} e sem resposta`) },
+        },
+      }
+    }
+    if (env.is_error) {
+      const motivo = env.result || `${env.subtype ?? 'sem subtype'}: ${JSON.stringify(env.erros)}`
+      return { registro: { ...reg, erro: `envelope com is_error: ${motivo.slice(0, 200)}`, descartado: { regra: 'envelope_is_error', trecho: trecho(motivo) } } }
+    }
     const resp = lerResposta(env.result)
     if (!resp) return { registro: { ...reg, erro: 'resposta sem JSON com classe R1-R7', descartado: { regra: 'resposta_sem_classe', trecho: trecho(env.result) } } }
     const { validas, descartadas } = conferirEvidencia(ev, resp.evidencia)
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index dc2af42..4a30f81 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -296,4 +296,16 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
     }
     for (const [c, d] of r?.diags ?? []) if (d.fonte === 'modelo') expect({ c, descartado: d.modelo?.descartado }).toEqual({ c, descartado: undefined })
   })
+
+  it('(C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar', async () => {
+    const r = await replay()
+    for (const c of DESCARTADOS_PECA6) {
+      const m = r?.diags.get(c)?.modelo as { descartado?: { regra: string; trecho: string }; custo_usd?: number | null; resposta?: unknown }
+      expect({ c, regra: m.descartado?.regra, custo: (m.custo_usd ?? 0) > 0.3, resposta: m.resposta }).toEqual({ c, regra: 'teto_corte_cli', custo: true, resposta: undefined })
+    }
+    // custo desta corrida: os 16 com resposta (US$ 4,1376) + os 6 cortados (US$ 1,9889), o que a corrida real pagou
+    expect(r?.texto.split('\n').at(-1)).toMatch(/chamadas novas: 22; custo desta corrida: US\$ 6\.1265$/)
+    // 0 dos 6 passam a usar a resposta do modelo: o envelope não tem result
+    expect(DESCARTADOS_PECA6.filter((c) => r?.diags.get(c)?.fonte === 'modelo')).toEqual([])
+  })
 })
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
index 089e621..09f7de7 100644
--- a/test/orquestrador-triador-modelo.test.ts
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -132,16 +132,17 @@ describe('modelo do triador, com stub (peça 5)', () => {
       writeFileSync(join(base, 'diag', 'custo.json'), JSON.stringify({ dias: { [hoje()]: gastos.map((g) => ({ repo: 'x', id: '1', assinatura: 'a', custo_usd: g, tokens_in: 1, tokens_out: 1 })) } }))
     }
     envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'x' }))
-    ledger([1.5, 1.3])
+    // o pior caso de uma chamada é o corte do CLI (teto_corte_usd, 0,60 por padrão), não o teto do caso (7f-b1b)
+    ledger([1.5, 1.0])
     const r = c?.m.criarPassoModelo(CFG)(c.ctx)
     expect(r?.registro).toEqual({ modelo: 'claude-opus-5-5', pulado: 'teto_dia' })
     expect(chamadas()).toEqual([])
-    ledger([1.5, 1.2])
+    ledger([1.5, 0.9])
     c?.m.criarPassoModelo(CFG)(c.ctx)
     expect(chamadas()).toHaveLength(1)
-    expect(chamadas()[0]).toMatch(/^-p --output-format json --model claude-opus-5-5 --allowedTools {2}--max-turns 1 --max-budget-usd 0\.3\t\d+$/)
+    expect(chamadas()[0]).toMatch(/^-p --output-format json --model claude-opus-5-5 --allowedTools {2}--max-turns 1 --max-budget-usd 0\.6\t\d+$/)
     const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number }[]> }
-    expect(l.dias[hoje()]!.map((x) => x.custo_usd)).toEqual([1.5, 1.2, 0.1234])
+    expect(l.dias[hoje()]!.map((x) => x.custo_usd)).toEqual([1.5, 0.9, 0.1234])
   })
 
   it('envelope ilegível mantém a extração e grava modelo.erro (e o gasto, sem custo conhecido)', async () => {
@@ -156,6 +157,19 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(l.dias[hoje()]).toEqual([expect.objectContaining({ id: '559', custo_usd: null })])
   })
 
+  it('envelope do corte do CLI (error_max_budget_usd, sem result, da corrida real): o custo pago vai ao ledger e o descarte diz teto_corte_cli', async () => {
+    const c = await contexto()
+    const real = JSON.parse(readFileSync(join(FX, '08-635-L58105', 'resposta-modelo.json'), 'utf8')) as { modelo: { envelope_bruto: string } }
+    writeFileSync(join(base, 'resposta.json'), real.modelo.envelope_bruto)
+    process.env.STUB_RC = '1'
+    const d = c?.m.diagnosticar(c.ctx.guarda, 'fixture', c.ev, c.ext, c.ctx.assinatura, c.ctx.agora, FX, c.m.criarPassoModelo(CFG))
+    expect([d?.classe, d?.fonte]).toEqual(['R4?', 'extracao'])
+    expect(d?.modelo).toMatchObject({ custo_usd: 0.31072479999999997, custo_acima_do_teto: true })
+    expect(d?.modelo?.descartado).toEqual({ regra: 'teto_corte_cli', trecho: 'rc 1: error_max_budget_usd: ["Reached maximum budget ($0.3)"]; pago US$ 0.3107 e sem resposta' })
+    const l = JSON.parse(readFileSync(join(base, 'diag', 'custo.json'), 'utf8')) as { dias: Record<string, { custo_usd: number | null; custo_acima_do_teto?: true }[]> }
+    expect(l.dias[hoje()]).toEqual([expect.objectContaining({ custo_usd: 0.31072479999999997, custo_acima_do_teto: true })])
+  })
+
   it('evidência com linha inexistente (ou arquivo que não foi lido) é descartada; a válida fica', async () => {
     const c = await contexto()
     const valida = c?.ext.evidencia[0]
@@ -225,25 +239,27 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(orq('comarka-fx', '559', '--passada', '--x').status).toBe(1)
   })
 
-  it('orq triar --fixture (a corrida da peça 6): 22 chamadas no teto de US$ 6,60, 10 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
+  // Com o pior caso no corte do CLI (0,60), a 22ª chamada de US$ 0,30 já não cabe em 6,60 (21 × 0,30 + 0,60 = 6,90),
+  // e em 3,00 cabem 9 (8 × 0,30 + 0,60 = 3,00). Na corrida real os 22 couberam (custo real abaixo de 0,30 em 16).
+  it('orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga', () => {
     envelope(JSON.stringify({ classe: 'R2', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' }), 0.3)
     const antes = spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout
     const orq = (teto: string, ...a: string[]) =>
       spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fixture', FX, ...a], { encoding: 'utf8', env: { ...process.env, ORQ_TRIADOR_TETO_DIA: teto } })
     const r = orq('6.60')
     expect(r.status, r.stderr).toBe(0)
-    expect(chamadas()).toHaveLength(22)
-    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 22; custo desta corrida: US\$ 6\.6000/)
+    expect(chamadas()).toHaveLength(21)
+    expect(r.stdout).toMatch(/-- \(C\) classe e evidência certas: \d+\/37 \(aceite: >= 30\); chamadas novas: 21; custo desta corrida: US\$ 6\.3000/)
     const dir = join(base, 'diag', 'fixture-triador-7f')
     expect(readdirSync(dir).filter((f) => existsSync(join(dir, f, 'resposta-modelo.json')))).toHaveLength(22)
     expect(orq('6.60').stdout).toMatch(/chamadas novas: 0;/)
-    expect(chamadas()).toHaveLength(22)
+    expect(chamadas()).toHaveLength(21)
     expect(spawnSync('git', ['status', '--porcelain', '--', FX], { encoding: 'utf8', cwd: RAIZ, env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' } }).stdout).toBe(antes)
-    // num dia novo de ledger, com o teto padrão de US$ 3,00: 10 chamadas e 12 puladas
+    // num dia novo de ledger, com o teto padrão de US$ 3,00: 9 chamadas e 13 puladas
     writeFileSync(join(base, 'diag', 'custo.json'), '{"dias":{}}')
     const r3 = orq('3', '--forcar')
-    expect(r3.stdout).toMatch(/chamadas novas: 10;/)
-    expect(chamadas()).toHaveLength(32)
+    expect(r3.stdout).toMatch(/chamadas novas: 9;/)
+    expect(chamadas()).toHaveLength(30)
   })
 
   it('orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)', async () => {
```

### 7f748d0 7f-b1b-4: aceite (C) conta evidência equivalente à da medição, com sinal da classe; 28/37

```diff
commit 7f748d08b2c8c8003c3496df4886956169adba1f
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:44:27 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:44:27 2026 -0300

    7f-b1b-4: aceite (C) conta evidência equivalente à da medição, com sinal da classe; 28/37
    
    Regra (só no teste): a evidência é certa se casa a da medição (mesmo
    arquivo, linha a ±3) OU é equivalente: a linha existe na cópia, o trecho
    citado está nela (pedaços entre "..." em ordem), carrega o sinal da classe
    e sustenta o remédio:
      R1  vermelho (FAIL, ❯ arq:linha, fora_do_pathspec) ou diff.stat de TESTE
          fora da allowlist, e o remédio cita esse teste;
      R2  linha num bloco "### criterio[i] -> FALHA" (ou "criterio[i] mecânico"
          do log), e o remédio cita criterio[i];
      R3  juiz ou log com sinal de decisão humana (token, lista fechada,
          autorização, liberacoes.json, DDL/FK, refatiar, motor), e o remédio
          pede decisão/autorização/token;
      R4  vermelho do gate num teste DENTRO da allowlist, e o remédio é ticket;
      R5, R6, R7: só a da medição.
    
    Dos 8 "classe certa, evidência fora": 7 valem (691, 346d, 737, 867, 711b3,
    900, 898 #34); o 741 não (diff vazio, AUSENTE/VERMELHO e "Tests passed"
    não mostram a falta de código; o próprio modelo diz que só o executor a
    relata). Placar: 21 -> 28/37. O aceite >= 30 segue não atingido
    (it.fails, vira vermelho quando chegar).
    
    Vermelho antes: com a regra antiga (só medição) o mapa de refs sai vazio
    nos 8 e o teste de não-afrouxar falha.
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

 test/orquestrador-triador-aceite.test.ts | 154 ++++++++++++++++++++++++++++++-
 1 file changed, 153 insertions(+), 1 deletion(-)
diff --git a/test/orquestrador-triador-aceite.test.ts b/test/orquestrador-triador-aceite.test.ts
index 4a30f81..dbf97ff 100644
--- a/test/orquestrador-triador-aceite.test.ts
+++ b/test/orquestrador-triador-aceite.test.ts
@@ -21,6 +21,11 @@
  *       devolve o `envelope_bruto` gravado (com o rc da corrida), e o envelope
  *       passa pelo parser, pela conferência da evidência e pelo ledger de
  *       verdade. Nenhuma chamada de API.
+ *       Regra de evidência (7f-b1b, peça 4): a evidência é certa se casa a da
+ *       medição (mesmo arquivo; linha a ±3) OU se é EQUIVALENTE: a linha
+ *       existe na cópia, o trecho citado está nela, ela carrega o sinal da
+ *       classe e sustenta o remédio (ver \`equivalente\`). R5, R6 e R7 não têm
+ *       equivalente: só a da medição conta.
  *
  * Os módulos do triador entram por import DINÂMICO tolerante: sem eles, todo
  * caso sai "sem diagnóstico" e o vermelho é de asserção (0 de 15 firmes), não
@@ -202,6 +207,8 @@ const PLACAR_PECA6 = [
 
 // os 6 que saíram [extracao] na corrida real sem o motivo no placar
 const DESCARTADOS_PECA6 = ['08-635-L58105', '14-407a-L67585', '25-711a-L78138', '28-707-L79202', '29-826-L80362', '33-707-L83026']
+// os 8 "classe certa, evidência fora" da corrida real
+const EVIDENCIA_FORA_PECA6 = ['12-691-L65374', '13-346d-L66187', '18-737-L69920', '24-867-L76790', '26-711b3-L78647', '27-741-L79081', '30-900-L81564', '34-898-L83625']
 const classes = (texto: string) =>
   texto
     .split('\n')
@@ -209,6 +216,98 @@ const classes = (texto: string) =>
     .map((l) => l.split('\t'))
     .map(([caso, esp, ext, final, veredito]) => [caso, esp, ext, final?.replace(/ \[.*$/, ''), veredito])
 
+// ─── regra de evidência equivalente (peça 4) ────────────────────────────────
+
+interface Lido {
+  arquivo: string
+  conteudo: string
+  faixas?: [number, number][]
+}
+interface Diag {
+  classe: string | null
+  remedio: string
+  evidencia: (Ref & { trecho?: string })[]
+}
+
+/** As linhas do arquivo lido como [número original, texto]. */
+function linhasDe(l: Lido): [number, string][] {
+  const ts = l.conteudo.split('\n')
+  if (!l.faixas) return ts.map((t, i) => [i + 1, t])
+  const ns = l.faixas.flatMap(([a, b]) => Array.from({ length: b - a + 1 }, (_, i) => a + i))
+  return ns.map((n, i) => [n, ts[i] ?? ''])
+}
+
+const norm = (t: string) => t.replace(/\\"/g, '"').replace(/\s+/g, ' ').trim()
+/** O trecho citado está na linha: cada pedaço entre "..." ou "…" aparece nela, em ordem. */
+function trechoNaLinha(trecho: string, linha: string): boolean {
+  const l = norm(linha)
+  let i = 0
+  for (const p of norm(trecho).split(/\.\.\.|…/).map((x) => x.trim()).filter(Boolean)) {
+    const j = l.indexOf(p, i)
+    if (j < 0) return false
+    i = j + p.length
+  }
+  return l.length > 0
+}
+
+const ehTeste = (f: string) => /(^|\/)test\/|\.test\.tsx?$/.test(f)
+const arquivosDe = (t: string) => [...t.matchAll(/((?:test|src)\/[\w./\[\]-]+\.(?:tsx?|sql))/g)].map((m) => m[1]!)
+
+/**
+ * A linha carrega o sinal da classe e sustenta o remédio:
+ *   R1  um vermelho (\`FAIL\`, \`❯ arquivo:linha\`, \`fora_do_pathspec\`) ou uma linha
+ *       do diff.stat de um TESTE fora da allowlist, e o remédio cita esse teste;
+ *   R2  a linha está num bloco \`### criterio[i] -> FALHA\` do criterios.txt (ou
+ *       é o "criterio[i] mecânico" do log do motor), e o remédio cita criterio[i];
+ *   R3  linha do juiz ou do log do motor com sinal de decisão humana (token,
+ *       lista fechada, autorização, liberacoes.json, DDL/FK, refatiar, motor),
+ *       e o remédio pede decisão/autorização/token;
+ *   R4  um vermelho do gate de testes num teste DENTRO da allowlist (o aceite
+ *       achou a falta), e o remédio é ticket novo.
+ */
+function sinal(classe: string, arquivo: string, n: number, linha: string, todas: [number, string][], allow: string[], remedio: string): boolean {
+  const fora = (f: string) => ehTeste(f) && !allow.includes(f)
+  const vermelho = /(^|\s)FAIL\s|❯ \S+:\d+|fora_do_pathspec|ENFORCEMENT BLOQUEOU/.test(linha)
+  if (classe === 'R1') {
+    const testes = arquivosDe(linha).filter(fora)
+    const ok = vermelho || arquivo.endsWith('/diff.stat')
+    return ok && testes.some((t) => remedio.includes(t))
+  }
+  if (classe === 'R2') {
+    let crit: string | null = null
+    if (arquivo.endsWith('/criterios.txt')) {
+      const cab = todas.filter(([m, t]) => m <= n && t.startsWith('### ')).at(-1)
+      crit = cab && /-> FALHA/.test(cab[1]) ? (/criterio\[\d+\]/.exec(cab[1])?.[0] ?? null) : null
+    } else if (arquivo.endsWith('local-loop.log')) crit = /(criterio\[\d+\]) mecânico/.exec(linha)?.[1] ?? null
+    return crit !== null && remedio.includes(crit)
+  }
+  if (classe === 'R3') {
+    const doJuiz = /\/(avaliador-claude\.txt|verdict\.json)$|local-loop\.log$/.test(arquivo)
+    const humano = /token|lista fechada|autoriza|liberacoes\.json|\bDDL\b|\bFK\b|foreign key|refati|motor/i
+    return doJuiz && humano.test(linha) && /token|decid|autoriz|liberac|refati|motor|OK do/i.test(remedio)
+  }
+  if (classe === 'R4') {
+    const testes = arquivosDe(linha).filter((f) => ehTeste(f) && allow.includes(f))
+    return arquivo.endsWith('/gate-vitest.txt') && vermelho && testes.length > 0 && /ticket/i.test(remedio)
+  }
+  return false
+}
+
+/** Uma evidência do diagnóstico, diferente da medição, que vale por ela (peça 4). */
+function equivalente(d: Diag, lidos: Lido[], allow: string[]): string[] {
+  if (!d.classe) return []
+  const ok: string[] = []
+  for (const r of d.evidencia) {
+    const l = lidos.find((x) => x.arquivo === r.arquivo)
+    if (!l || r.linha === null) continue
+    const todas = linhasDe(l)
+    const linha = todas.find(([n]) => n === r.linha)?.[1]
+    if (linha === undefined || !trechoNaLinha(r.trecho ?? '', linha)) continue
+    if (sinal(d.classe, r.arquivo, r.linha, linha, todas, allow, d.remedio)) ok.push(`${r.arquivo}:${r.linha}`)
+  }
+  return ok
+}
+
 interface Gravada {
   caso: string
   assinatura: string
@@ -217,7 +316,7 @@ interface Gravada {
 interface Replay {
   texto: string
   linhas: { caso: string; esperado: string | null; final: string | null; fonte: string; certo: boolean; evidencia_certa: boolean }[]
-  diags: Map<string, { classe: string | null; fonte: string; evidencia: Ref[]; modelo: Record<string, unknown> | null }>
+  diags: Map<string, Diag & { fonte: string; modelo: Record<string, unknown> | null }>
   gravadas: number
   assinaturas_velhas: string[]
 }
@@ -255,6 +354,17 @@ async function replay(): Promise<Replay | null> {
   }
 }
 
+/** O placar do replay com as duas regras: medição (±3) e equivalente (peça 4). */
+async function placarComEquivalencia() {
+  const r = await replay()
+  const t = await carregar()
+  return (r?.linhas ?? []).map((l) => {
+    const ev = t?.lerCasoDeFixture(join(FX, l.caso), { instante: 'passada' }) as { lidos: Lido[]; ticket: { pathspec_allowlist?: string[] } | null } | undefined
+    const eq = l.certo && !l.evidencia_certa ? equivalente(r!.diags.get(l.caso)!, ev?.lidos ?? [], ev?.ticket?.pathspec_allowlist ?? []) : []
+    return { caso: l.caso, certo: l.certo, medicao: l.evidencia_certa, equivalente: eq }
+  })
+}
+
 describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)', () => {
   beforeAll(() => {
     base = realpathSync(mkdtempSync(join(tmpdir(), 'triador-replay-')))
@@ -308,4 +418,46 @@ describe('aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b)',
     // 0 dos 6 passam a usar a resposta do modelo: o envelope não tem result
     expect(DESCARTADOS_PECA6.filter((c) => r?.diags.get(c)?.fonte === 'modelo')).toEqual([])
   })
+
+  it('(C) com a regra de evidência equivalente: dos 8 "classe certa, evidência fora", 7 valem; o 741 não (sem artefato da falta)', async () => {
+    const placar = await placarComEquivalencia()
+    const fora = placar.filter((p) => p.certo && !p.medicao)
+    expect(fora.map((p) => p.caso)).toEqual(EVIDENCIA_FORA_PECA6)
+    // as refs que valem; as que NÃO valem ficam de fora por falta de sinal ou de trecho:
+    // "Tests N passed" (737, 741, 900), diff.stat vazio (741, 867), ST_1_5 (867), AUSENTE/VERMELHO (741),
+    // a linha do juiz no 898 (R2 pede bloco FALHA), e no 711b3 o saude-motivo (o remédio cita só o sem-insumo)
+    const R = 'docs/fila/runs/'
+    expect(Object.fromEntries(fora.map((p) => [p.caso, p.equivalente.map((x) => x.replace(R, ''))]))).toEqual({
+      '12-691-L65374': ['691/attempt-2.prev1/criterios.txt:68', '691/attempt-2.prev1/criterios.txt:71', '691/attempt-1.prev1/criterios.txt:71'],
+      '13-346d-L66187': ['346d/attempt-1.prev1/gate-vitest.txt:1423', '346d/attempt-1.prev1/gate-vitest.txt:1607', '346d/attempt-2/diff.stat:3'],
+      '18-737-L69920': ['737/attempt-3/criterios.txt:52', '737/attempt-3/criterios.txt:55', '737/attempt-2.prev1/criterios.txt:55'],
+      '24-867-L76790': ['867/attempt-2/avaliador-claude.txt:1', '867/attempt-1.prev1/avaliador-claude.txt:1'],
+      '26-711b3-L78647': [4654, 6222, 6212, 7780].flatMap((n) => [`711b3/attempt-2.prev1/gate-vitest.txt:${n}`]).concat([4654, 6222, 6212, 7780].map((n) => `711b3/attempt-3/gate-vitest.txt:${n}`)),
+      '27-741-L79081': [],
+      '30-900-L81564': ['900/attempt-2/criterios.txt:60', '900/attempt-2/criterios.txt:63', '900/attempt-1.prev1/criterios.txt:63'],
+      '34-898-L83625': ['898/attempt-3/criterios.txt:36', '898/attempt-3/criterios.txt:39'],
+    })
+    expect(placar.filter((p) => p.certo && (p.medicao || p.equivalente.length)).length).toBe(28)
+  })
+
+  it('(C) a regra não afrouxa: trecho que não está na linha, linha sem o sinal, ou remédio que não cita o alvo não valem', async () => {
+    const t = await carregar()
+    const ev = t?.lerCasoDeFixture(join(FX, '12-691-L65374'), { instante: 'passada' }) as { lidos: Lido[] } | undefined
+    const lidos = ev?.lidos ?? []
+    const a = 'docs/fila/runs/691/attempt-2.prev1/criterios.txt'
+    const rem = 'No .md, no criterio[8], troque `|| echo 0` por `|| true`'
+    const d = (evidencia: Diag['evidencia'], remedio = rem, classe = 'R2'): Diag => ({ classe, remedio, evidencia })
+    expect(equivalente(d([{ arquivo: a, linha: 71, trecho: 'SQL_1_0 0' }]), lidos, [])).toEqual([`${a}:71`])
+    expect(equivalente(d([{ arquivo: a, linha: 71, trecho: 'UM_SQL' }]), lidos, [])).toEqual([]) // trecho inventado
+    expect(equivalente(d([{ arquivo: a, linha: 65, trecho: '### criterio[8] -> FALHA' }]), lidos, [])).toEqual([`${a}:65`])
+    expect(equivalente(d([{ arquivo: a, linha: 57, trecho: '### criterio[7] -> PASS' }]), lidos, [])).toEqual([]) // bloco PASS
+    expect(equivalente(d([{ arquivo: a, linha: 71, trecho: 'SQL_1_0 0' }], 'no criterio[3], troque x'), lidos, [])).toEqual([]) // outro critério
+    expect(equivalente(d([{ arquivo: a, linha: 71, trecho: 'SQL_1_0 0' }], rem, 'R5'), lidos, [])).toEqual([]) // R5 só pela medição
+  })
+
+  // it.fails: passa enquanto o aceite NÃO é atingido; vira vermelho (e pede atualizar) quando chegar a 30
+  it.fails('(C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida', async () => {
+    const placar = await placarComEquivalencia()
+    expect(placar.filter((p) => p.certo && (p.medicao || p.equivalente.length)).length).toBeGreaterThanOrEqual(30)
+  })
 })
```

### 12076a1 7f-b1b-5: proposta de prompt para R3 (opt-in, 7f-b1b-r3) e --casos para a mini-corrida

```diff
commit 12076a10a694374c0887bc7f4987854fbcecd6ce
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:46:56 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:46:56 2026 -0300

    7f-b1b-5: proposta de prompt para R3 (opt-in, 7f-b1b-r3) e --casos para a mini-corrida
    
    prompt.ts: PROMPT segue o literal da spec (sha conferido). A proposta
    7f-b1b-r3 troca só o R3 (sinais: token/autorização, lista fechada,
    liberacoes.json, DDL/FK, motor, refatiar, e o remédio MISTO .md + ticket/
    token/motor) e soma, antes da regra de mérito, a conferência "R2 só se o
    critério basta; R4 só se o .md está certo; senão R3, remédio 'decidir:'".
    Vale só com config "prompt": "7f-b1b-r3" ou ORQ_TRIADOR_PROMPT; prompt
    desconhecido é erro (não cai calado no padrão). O registro grava prompt
    quando não é o da spec.
    
    orq triar --fixture --casos a,b,…: só esses casos; caso fora da fixture é
    erro antes de qualquer chamada.
    
    Nada foi rodado contra o modelo. O comando da mini-corrida (9 casos, teto
    US$ 5,40) fica em ~/orq-sessoes/corrida-7f-r3.cmd.
    
    Vermelho antes: lerConfigModelo().prompt undefined; "flag desconhecida:
    --casos".
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

 scripts/orquestrador/triador/cli.ts      | 22 +++++++++++++----
 scripts/orquestrador/triador/corrida.ts  |  8 +++++--
 scripts/orquestrador/triador/modelo.ts   | 21 ++++++++++++----
 scripts/orquestrador/triador/prompt.ts   | 41 ++++++++++++++++++++++++++++++--
 test/orquestrador-triador-modelo.test.ts | 41 ++++++++++++++++++++++++++++++++
 5 files changed, 120 insertions(+), 13 deletions(-)
diff --git a/scripts/orquestrador/triador/cli.ts b/scripts/orquestrador/triador/cli.ts
index e10d8c5..9282734 100644
--- a/scripts/orquestrador/triador/cli.ts
+++ b/scripts/orquestrador/triador/cli.ts
@@ -4,7 +4,7 @@
  * depois).
  *
  *   orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo]
- *   orq triar --fixture <dir> [--forcar] [--sem-modelo]
+ *   orq triar --fixture <dir> [--casos a,b,…] [--forcar] [--sem-modelo]
  *
  * <repo> é um caminho ou um nome do `~/.orq/repos.json`. Extração sempre;
  * modelo só para palpite e sem regra, dentro dos tetos (modelo.ts), e nunca
@@ -36,12 +36,13 @@ export interface Args {
   repo?: string
   id?: string
   fixture?: string
+  casos?: string[]
   passada: boolean
   forcar: boolean
   semModelo: boolean
 }
 
-const USO = 'uso: orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo] | orq triar --fixture <dir> [--forcar] [--sem-modelo]'
+const USO = 'uso: orq triar <repo> [<id>] [--passada] [--forcar] [--sem-modelo] | orq triar --fixture <dir> [--casos a,b,…] [--forcar] [--sem-modelo]'
 
 export function parseArgs(argv: string[]): Args {
   const a: Args = { passada: false, forcar: false, semModelo: false }
@@ -55,6 +56,10 @@ export function parseArgs(argv: string[]): Args {
       const d = argv[++i]
       if (!d) throw new Error(USO)
       a.fixture = d
+    } else if (x === '--casos') {
+      const l = (argv[++i] ?? '').split(',').filter(Boolean)
+      if (!l.length) throw new Error(USO)
+      a.casos = l
     } else if (x.startsWith('--')) throw new Error(`flag desconhecida: ${x}`)
     else pos.push(x)
   }
@@ -62,6 +67,7 @@ export function parseArgs(argv: string[]): Args {
     if (pos.length || a.passada) throw new Error(USO)
     return a
   }
+  if (a.casos) throw new Error(USO)
   if (!pos[0] || pos.length > 2) throw new Error(USO)
   a.repo = pos[0]
   if (pos[1]) a.id = pos[1]
@@ -70,16 +76,24 @@ export function parseArgs(argv: string[]): Args {
 
 export function main(argv: string[]): number {
   let a: Args
+  let cfg: ReturnType<typeof lerConfigModelo>
   try {
     a = parseArgs(argv)
+    cfg = lerConfigModelo()
   } catch (e) {
     process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
     return 1
   }
-  const cfg = lerConfigModelo()
   const modelo = a.semModelo || a.passada ? null : criarPassoModelo(cfg)
   if (a.fixture) {
-    process.stdout.write(`${placar(corridaFixture(a.fixture, { modelo, forcar: a.forcar }))}\n`)
+    let ls: ReturnType<typeof corridaFixture>
+    try {
+      ls = corridaFixture(a.fixture, { modelo, forcar: a.forcar, ...(a.casos ? { casos: a.casos } : {}) })
+    } catch (e) {
+      process.stderr.write(`[orq triar] ${(e as Error).message}\n`)
+      return 1
+    }
+    process.stdout.write(`${placar(ls)}\n`)
     return 0
   }
   const repo = resolverRepo(a.repo!)
diff --git a/scripts/orquestrador/triador/corrida.ts b/scripts/orquestrador/triador/corrida.ts
index 8ee11a4..eedc5e1 100644
--- a/scripts/orquestrador/triador/corrida.ts
+++ b/scripts/orquestrador/triador/corrida.ts
@@ -47,12 +47,16 @@ export interface LinhaPlacar {
 const casa = (dada: Ref[], esp: Esperado['evidencia']) =>
   dada.some((d) => (esp ?? []).some((e) => e.arquivo === d.arquivo && (e.linha === null || (d.linha !== null && Math.abs(d.linha - e.linha) <= 3))))
 
-export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; forcar?: boolean; agora?: number }): LinhaPlacar[] {
+/** `casos`: só estes (a mini-corrida da 7f-b1b); um que não está na fixture é erro, antes de qualquer chamada. */
+export function corridaFixture(dir: string, o: { modelo: PassoModelo | null; forcar?: boolean; agora?: number; casos?: string[] }): LinhaPlacar[] {
   const fixture = resolve(dir)
   const g = new Guarda([fixture])
   const agora = o.agora ?? Date.now()
   const out: LinhaPlacar[] = []
-  for (const caso of readdirSync(fixture).filter((d) => /^\d\d-[0-9a-z]+-L\d+$/.test(d)).sort()) {
+  const todos = readdirSync(fixture).filter((d) => /^\d\d-[0-9a-z]+-L\d+$/.test(d)).sort()
+  const fora = (o.casos ?? []).filter((c) => !todos.includes(c))
+  if (fora.length) throw new Error(`caso fora da fixture: ${fora.join(', ')}`)
+  for (const caso of o.casos ? todos.filter((c) => o.casos!.includes(c)) : todos) {
     const d = join(fixture, caso)
     const esp = JSON.parse(readFileSync(join(d, 'esperado.json'), 'utf8')) as Esperado
     const ev = lerCasoDeFixture(d, { instante: 'passada' })
diff --git a/scripts/orquestrador/triador/modelo.ts b/scripts/orquestrador/triador/modelo.ts
index 11578ed..9e57266 100644
--- a/scripts/orquestrador/triador/modelo.ts
+++ b/scripts/orquestrador/triador/modelo.ts
@@ -15,7 +15,8 @@
  * (`modelo`, `teto_dia_usd`, `teto_caso_usd`, `teto_corte_usd`,
  * `entrada_max_tokens`, `timeout_secs`). `modelo: null` desliga o modelo.
  * `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia (a corrida da peça 6 usa
- * US$ 6,60).
+ * US$ 6,60). `prompt` (ou `ORQ_TRIADOR_PROMPT`) escolhe o texto: `spec` (o
+ * padrão, literal da spec §4) ou `7f-b1b-r3` (a proposta de R3, prompt.ts).
  *
  * Teto do caso x corte do CLI (7f-b1b): o `--max-budget-usd` do `claude -p`,
  * com uma volta só, não impede o gasto: a volta termina, é paga, e o CLI
@@ -31,7 +32,7 @@ import { homedir } from 'node:os'
 import { join } from 'node:path'
 import type { Extracao } from './extrair.js'
 import { mascarar } from './mascara.js'
-import { preencher, PROMPT } from './prompt.js'
+import { preencher, PROMPT, PROMPTS, type NomePrompt } from './prompt.js'
 import { numerosDe, trecho } from './recorte.js'
 import type { Guarda } from './saida.js'
 import type { Evidencia, Ref, Tentativa } from './tipos.js'
@@ -45,6 +46,7 @@ export interface ConfigModelo {
   teto_corte_usd: number
   entrada_max_tokens: number
   timeout_secs: number
+  prompt: NomePrompt
 }
 
 export const PADRAO: ConfigModelo = {
@@ -54,6 +56,7 @@ export const PADRAO: ConfigModelo = {
   teto_corte_usd: 0.6,
   entrada_max_tokens: 30000,
   timeout_secs: 120,
+  prompt: 'spec',
 }
 export const CHARS_POR_TOKEN = 3.5
 
@@ -66,6 +69,9 @@ export function lerConfigModelo(): ConfigModelo {
   }
   const num = (v: unknown, d: number) => (typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : d)
   const tetoEnv = Number(process.env.ORQ_TRIADOR_TETO_DIA)
+  // prompt desconhecido não cai calado no padrão: numa corrida paga, é erro
+  const prompt = process.env.ORQ_TRIADOR_PROMPT || (typeof c.prompt === 'string' && c.prompt) || PADRAO.prompt
+  if (!Object.hasOwn(PROMPTS, prompt)) throw new Error(`triador: prompt desconhecido: ${prompt} (conhecidos: ${Object.keys(PROMPTS).join(', ')})`)
   return {
     modelo: c.modelo === null ? null : typeof c.modelo === 'string' && c.modelo ? c.modelo : PADRAO.modelo,
     teto_dia_usd: process.env.ORQ_TRIADOR_TETO_DIA && Number.isFinite(tetoEnv) ? tetoEnv : num(c.teto_dia_usd, PADRAO.teto_dia_usd),
@@ -73,6 +79,7 @@ export function lerConfigModelo(): ConfigModelo {
     teto_corte_usd: num(c.teto_corte_usd, PADRAO.teto_corte_usd),
     entrada_max_tokens: num(c.entrada_max_tokens, PADRAO.entrada_max_tokens),
     timeout_secs: num(c.timeout_secs, PADRAO.timeout_secs),
+    prompt: prompt as NomePrompt,
   }
 }
 
@@ -151,7 +158,7 @@ export interface Entrada {
 }
 
 /** As 7 seções de §4 na ordem, cortadas de baixo para cima até caber; o texto vai mascarado. */
-export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTokens = PADRAO.entrada_max_tokens): Entrada {
+export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTokens = PADRAO.entrada_max_tokens, versao: NomePrompt = PADRAO.prompt): Entrada {
   const tk = ev.ticket
   const s1 = JSON.stringify(
     {
@@ -177,7 +184,7 @@ export function montarEntrada(repo: string, ev: Evidencia, ext: Extracao, maxTok
   }
   const max = Math.floor(maxTokens * CHARS_POR_TOKEN)
   const montar = () =>
-    preencher({ ...fixo, ticket: secoes[0]!, extracao_json: secoes[1]!, recortes_vitest: secoes[2]!, criterios_falhos: secoes[3]!, diff_stats: secoes[4]!, juiz: secoes[5]!, agente: secoes[6]! })
+    preencher({ ...fixo, ticket: secoes[0]!, extracao_json: secoes[1]!, recortes_vitest: secoes[2]!, criterios_falhos: secoes[3]!, diff_stats: secoes[4]!, juiz: secoes[5]!, agente: secoes[6]! }, PROMPTS[versao])
   const cortes: Entrada['cortes'] = []
   let prompt = montar()
   for (let i = secoes.length - 1; i >= 0 && prompt.length > max; i--) {
@@ -387,6 +394,8 @@ function trechoIlegivel(stdout: string, rc: number): string {
 export interface RegistroModelo {
   modelo: string | null
   pulado?: 'teto_dia' | 'desligado'
+  /** só quando não é o da spec (ex.: `7f-b1b-r3`) */
+  prompt?: NomePrompt
   erro?: string
   descartado?: Descarte
   custo_usd?: number | null
@@ -410,7 +419,8 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
     if (microdolares(gastoDoDia(guarda, agora, pior) + pior) > microdolares(cfg.teto_dia_usd)) {
       return { registro: { modelo: cfg.modelo, pulado: 'teto_dia' } satisfies RegistroModelo }
     }
-    const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens)
+    const versao = cfg.prompt ?? PADRAO.prompt
+    const entrada = montarEntrada(repo, ev, ext, cfg.entrada_max_tokens, versao)
     const r = chamar(entrada.prompt, cfg)
     const env = lerEnvelope(r.stdout)
     const gasto: Gasto = { repo, id: ev.id, assinatura, custo_usd: env?.custo_usd ?? null, tokens_in: env?.tokens_in ?? null, tokens_out: env?.tokens_out ?? null }
@@ -418,6 +428,7 @@ export function criarPassoModelo(cfg: ConfigModelo = lerConfigModelo()): PassoMo
     registrar(guarda, agora, gasto)
     const reg: RegistroModelo = {
       modelo: cfg.modelo,
+      ...(versao !== 'spec' ? { prompt: versao } : {}),
       custo_usd: gasto.custo_usd,
       tokens_in: gasto.tokens_in,
       tokens_out: gasto.tokens_out,
diff --git a/scripts/orquestrador/triador/prompt.ts b/scripts/orquestrador/triador/prompt.ts
index 6458533..eb7807d 100644
--- a/scripts/orquestrador/triador/prompt.ts
+++ b/scripts/orquestrador/triador/prompt.ts
@@ -68,10 +68,47 @@ Ticket {id} ({slug}) do repo {repo}, bloqueado em {quando} pela regra do motor
 == O QUE O AGENTE EXECUTOR DISSE (pista, não prova) ==
 {agente}`
 
+// ─── proposta 7f-b1b: R3 (opt-in; o padrão segue o literal da spec) ──────────
+//
+// Na corrida real da peça 6 os dois R3 que o modelo respondeu saíram errados:
+// 559 #1 virou R4 (o remédio também pedia nota na spec) e 739 virou R2 (o
+// conserto do critério também pedia FK com DDL e token). A proposta muda só o
+// R3 e soma uma regra antes da de mérito. Só vale com `prompt: "7f-b1b-r3"` no
+// config ou `ORQ_TRIADOR_PROMPT=7f-b1b-r3`: virar padrão é mudar a spec.
+
+/** O R3 da spec, literal (o trecho que a proposta troca). */
+export const R3_SPEC = `R3  Spec que precisa de decisão humana, token, motor ou refatiamento. Parte do
+    remédio não cabe no .md do ticket.
+`
+
+export const R3_7F_B1B = `R3  Spec que precisa de decisão humana, token, motor ou refatiamento: ao menos
+    uma parte do remédio NÃO cabe no .md do ticket. Sinais: o conserto pede
+    token ou autorização nova (lista fechada de asserções, liberacoes.json);
+    mexe em DDL, FK ou migration que só o dono aprova; exige mudar o motor; ou
+    exige refatiar o ticket em outros. Também é R3 o remédio MISTO: consertar o
+    .md (critério, allowlist, premissa velha) E abrir ticket de código, pedir
+    token ou mudar o motor.
+`
+
+export const REGRAS_R3_7F_B1B = `- Antes de responder R2 ou R4, confira se o remédio inteiro cabe nessa classe.
+  R2 só se consertar o critério no .md basta (sem DDL/FK, token,
+  liberacoes.json, motor nem refatiar). R4 só se o .md está certo e basta um
+  ticket novo de código. Se o remédio precisa das duas coisas, ou de algo que
+  só o dono decide, é R3, e o remédio começa com "decidir:".
+`
+
+const ANTES_DO_MERITO = '- Mérito (o código do ticket está errado e um retry resolveria) não é um\n'
+
+export const PROMPTS = {
+  spec: PROMPT,
+  '7f-b1b-r3': PROMPT.replace(R3_SPEC, R3_7F_B1B).replace(ANTES_DO_MERITO, REGRAS_R3_7F_B1B + ANTES_DO_MERITO),
+} as const
+export type NomePrompt = keyof typeof PROMPTS
+
 export const CAMPOS = ['id', 'slug', 'repo', 'quando', 'token_do_bloqueio', 'n', 'ticket', 'extracao_json', 'recortes_vitest', 'criterios_falhos', 'diff_stats', 'juiz', 'agente'] as const
 export type Campo = (typeof CAMPOS)[number]
 
 /** Troca cada `{campo}` pelo valor, numa passada só (valor com chaves não é relido). */
-export function preencher(v: Record<Campo, string>): string {
-  return PROMPT.replace(/\{(\w+)\}/g, (m, k: string) => ((CAMPOS as readonly string[]).includes(k) ? v[k as Campo] : m))
+export function preencher(v: Record<Campo, string>, texto: string = PROMPT): string {
+  return texto.replace(/\{(\w+)\}/g, (m, k: string) => ((CAMPOS as readonly string[]).includes(k) ? v[k as Campo] : m))
 }
diff --git a/test/orquestrador-triador-modelo.test.ts b/test/orquestrador-triador-modelo.test.ts
index 09f7de7..9dcda2a 100644
--- a/test/orquestrador-triador-modelo.test.ts
+++ b/test/orquestrador-triador-modelo.test.ts
@@ -104,6 +104,31 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(e?.cortes).toEqual([])
   })
 
+  it('prompt 7f-b1b-r3 (proposta, opt-in por ORQ_TRIADOR_PROMPT ou config "prompt"): troca o R3 e soma a conferência de R2/R4; o padrão segue o literal da spec', async () => {
+    const c = await contexto()
+    const imp = (await import(pathToFileURL(join(TRIADOR, 'modelo.ts')).href)) as Record<string, any>
+    const pr = (await import(pathToFileURL(join(TRIADOR, 'prompt.ts')).href)) as Record<string, any>
+    // o padrão não muda
+    expect(imp.lerConfigModelo().prompt).toBe('spec')
+    expect(createHash('sha256').update(pr.PROMPT).digest('hex')).toBe(SHA_PROMPT_DA_SPEC)
+    // a proposta: o texto do R3 e as duas regras novas, literais
+    process.env.ORQ_TRIADOR_PROMPT = '7f-b1b-r3'
+    const cfg = imp.lerConfigModelo()
+    expect(cfg.prompt).toBe('7f-b1b-r3')
+    envelope(JSON.stringify({ classe: 'R3', confianca: 'media', evidencia: [c?.ext.evidencia[0]], remedio: 'decidir: x', requeue: 'nao', justificativa: 'x' }))
+    const r = c?.m.criarPassoModelo(cfg)(c.ctx)
+    expect(r?.registro.prompt).toBe('7f-b1b-r3')
+    const entrada = readFileSync(join(base, 'entrada.txt'), 'utf8')
+    expect(entrada).toContain(pr.R3_7F_B1B)
+    expect(entrada).toContain(pr.REGRAS_R3_7F_B1B)
+    expect(entrada).not.toContain('R3  Spec que precisa de decisão humana, token, motor ou refatiamento. Parte do\n    remédio não cabe no .md do ticket.')
+    // fora o R3 e a regra nova, a entrada é a mesma do padrão (o stub lê por $(cat), que come o \n do fim)
+    expect(entrada.replace(pr.R3_7F_B1B, '').replace(pr.REGRAS_R3_7F_B1B, '')).toBe(c?.m.montarEntrada('fixture', c.ev, c.ext).prompt.replace(pr.R3_SPEC, '').trimEnd())
+    // valor desconhecido não cai calado no padrão
+    process.env.ORQ_TRIADOR_PROMPT = 'r3'
+    expect(() => imp.lerConfigModelo()).toThrow(/prompt desconhecido: r3/)
+  })
+
   it('entrada acima de 30 mil tokens corta de baixo para cima, na ordem de §4, e vai mascarada', async () => {
     const c = await contexto()
     if (c) {
@@ -262,6 +287,22 @@ describe('modelo do triador, com stub (peça 5)', () => {
     expect(chamadas()).toHaveLength(30)
   })
 
+  it('orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada', () => {
+    envelope(JSON.stringify({ classe: 'R3', confianca: 'baixa', evidencia: [], remedio: 'x', requeue: 'nao', justificativa: 'stub' }), 0.3)
+    const orq = (...a: string[]) => spawnSync('bash', [join(RAIZ, 'scripts', 'orq'), 'triar', '--fixture', FX, ...a], { encoding: 'utf8', env: { ...process.env, ORQ_TRIADOR_TETO_DIA: '5.40' } })
+    const r = orq('--casos', '01-559-L55054,07-627j-L57368,29-826-L80362')
+    expect(r.status, r.stderr).toBe(0)
+    const linhas = r.stdout.trim().split('\n')
+    expect(linhas.slice(0, -1).map((l) => l.split('\t')[0])).toEqual(['01-559-L55054', '07-627j-L57368', '29-826-L80362'])
+    expect(linhas.at(-1)).toMatch(/^-- \(C\) classe e evidência certas: \d\/3 .*chamadas novas: 2;/)
+    expect(chamadas()).toHaveLength(2)
+    const e = orq('--casos', '01-559-L55054,99-nao-L1')
+    expect(e.status).toBe(1)
+    expect(e.stderr).toMatch(/caso fora da fixture: 99-nao-L1/)
+    expect(chamadas()).toHaveLength(2)
+    expect(orq('--casos').status).toBe(1)
+  })
+
   it('orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760)', async () => {
     const d = join(FX, '21-760-L72407')
     const raiz = materializar(d, join(base, 'comarka-fx'))
```

### 3c59d30 7f-b1b-6: CONTRATO (§13.5 a §13.7), CHANGELOG e PECAS com os shas da 7f-b1b

```diff
commit 3c59d3046aa8f1cf4aadb9598f8fe11035113835
Author:     Lucas Santos <alfalucas137@gmail.com>
AuthorDate: Sat Oct 10 21:48:18 2026 -0300
Commit:     Lucas Santos <alfalucas137@gmail.com>
CommitDate: Sat Oct 10 21:48:18 2026 -0300

    7f-b1b-6: CONTRATO (§13.5 a §13.7), CHANGELOG e PECAS com os shas da 7f-b1b
    
    CONTRATO §13.5: teto_corte_usd, prompt, lerEnvelope do erro do CLI, pior
    caso do dia no corte, Descarte, e os arquivo:linha novos de modelo.ts.
    §13.6: --casos e as resposta-modelo.json da fixture. §13.7: a 7f-b1b
    (replay, os 6 cortados, evidência equivalente, proposta de R3).
    CHANGELOG: a etapa, com 983ebae, 99407d1, 69956a2, 7f748d0, 12076a1 e as
    asserções que mudaram de número na 7f-b1b-3. PECAS: a etapa; PENDENTES
    troca a peça 6 pela mini-corrida do R3 e pelas decisões para o chat.
    
    Só docs: sem vermelho de comportamento (como a 7f-b1-6 e a 7f-b1-8).
    
    Co-Authored-By: Claude Opus 5.5 (1M context) <noreply@anthropic.com>

 CHANGELOG.md  | 30 ++++++++++++++++++++++++
 CONTRATO.md   | 74 +++++++++++++++++++++++++++++++++++++++++++++--------------
 docs/PECAS.md | 31 +++++++++++++++++++++----
 3 files changed, 113 insertions(+), 22 deletions(-)
diff --git a/CHANGELOG.md b/CHANGELOG.md
index ecdcb19..78438f9 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -894,6 +894,36 @@ merge). CONTRATO §9.1 e §13.
   Vermelho antes por asserção (4 falhas).
 - **7f-b1-8**: CONTRATO §13.3 e §13.6, este registro e `docs/PECAS.md` com o sha da 7f-b1-7.
 
+### Etapa 7f-b1b · replay da corrida real da peça 6 e conserto do descarte (10/10/2026)
+
+A corrida real deu 21/37 no aceite (C) (aceite: ≥ 30). Sem nenhuma chamada de API.
+CONTRATO §13.5, §13.6 e §13.7.
+
+- **7f-b1b-1** `983ebae`: as 22 `resposta-modelo.json` da corrida entram na fixture; o
+  aceite (C) roda em replay (stub com o envelope gravado) e reproduz, byte a byte, o placar
+  da corrida: 21/37, 22 chamadas, US$ 4,1376.
+- **7f-b1b-2** `99407d1`: todo descarte da resposta do modelo grava `modelo.descartado`
+  (regra e trecho) e sai no placar como `[descartado: …]`. Os 6 `[extracao]` mostram
+  `error_max_budget_usd`.
+- **7f-b1b-3** `69956a2`: o motivo dos 6 era o triador: `--max-budget-usd` = teto do caso
+  (0,30) corta DEPOIS da volta paga e o CLI devolve o envelope sem `result`, que o
+  `lerEnvelope` jogava fora com o custo. Agora o corte do CLI é `teto_corte_usd` (0,60), o
+  envelope de erro entra no ledger (a corrida pagou US$ 6,1265, não 4,1376) e o descarte é
+  `teto_corte_cli`. O pior caso do teto do dia passa a ser o corte. No replay, 0 dos 6
+  recuperam resposta (não há `result`).
+- **7f-b1b-4** `7f748d0`: o aceite (C) conta a evidência equivalente à da medição (existe,
+  trecho na linha, sinal da classe, sustenta o remédio). 7 dos 8 "evidência fora" valem; o
+  741 não. Placar 28/37; o ≥ 30 fica em `it.fails`.
+- **7f-b1b-5** `12076a1`: proposta de prompt para R3 (`7f-b1b-r3`, opt-in) e
+  `orq triar --fixture --casos`. O comando da mini-corrida paga (9 casos, US$ 5,40) fica em
+  `~/orq-sessoes/corrida-7f-r3.cmd`, não rodado.
+- **7f-b1b-6**: CONTRATO §13.5 a §13.7, este registro e `docs/PECAS.md` com os shas.
+
+Asserções existentes que mudaram de número na 7f-b1b-3 (o pior caso do dia passou de
+0,30 a 0,60): o teto do dia no stub chama no limite com `[1,5; 0,9]` (era `[1,5; 1,2]`), o
+`--max-budget-usd` é 0,6 (era 0,3), e a corrida de stub a US$ 0,30 faz 21 chamadas em 6,60
+(era 22) e 9 em 3,00 (era 10). Nenhuma perdeu força.
+
 Até a 7f-b1-6, nenhuma asserção existente mudou. Na 7f-b1-7, por decisão do chat do
 programa, três mudaram de número (sem mudar de força): firmes certos 16 → 15 e 14 → 13
 no instante do bloqueio, e a corrida da peça 6 de 21 chamadas a US$ 6,30 para 22 a
diff --git a/CONTRATO.md b/CONTRATO.md
index d4934e1..77cfbdd 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1115,27 +1115,37 @@ Regras duras:
 
 Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.erro`).
 
-- Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json` (`lerConfigModelo`, `:48`):
+- Config: `ORQ_TRIADOR_CONFIG` ou `~/.orq/triador.json` (`lerConfigModelo`, `:63`):
   `modelo` (padrão `claude-opus-5-5`; `null` desliga), `teto_dia_usd` (3,00),
-  `teto_caso_usd` (0,30), `entrada_max_tokens` (30000), `timeout_secs` (120).
-  `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia.
-- Entrada (`montarEntrada`, `:141`): as 7 seções da spec §4 (ticket; extração; recorte do
+  `teto_caso_usd` (0,30), `teto_corte_usd` (0,60, 7f-b1b), `entrada_max_tokens` (30000),
+  `timeout_secs` (120), `prompt` (`spec`; `7f-b1b-r3` é a proposta de §13.7).
+  `ORQ_TRIADOR_TETO_DIA` sobrepõe o teto do dia; `ORQ_TRIADOR_PROMPT`, o prompt. Prompt
+  desconhecido é erro.
+- Entrada (`montarEntrada`, `:161`): as 7 seções da spec §4 (ticket; extração; recorte do
   vitest; critérios FALHA; diff.stat; juiz; o que o agente disse, 3000 + 1500 caracteres),
   cortadas de baixo para cima até `entrada_max_tokens × 3,5` caracteres, e mascaradas. O
-  diff cru não entra. O prompt é o literal da spec (`prompt.ts`).
-- Chamada (`chamar`, `:199`): `claude -p --output-format json --model <m> --allowedTools ""
-  --max-turns 1 --max-budget-usd <teto_caso>`, prompt pela entrada padrão. O binário é
+  diff cru não entra. O prompt padrão é o literal da spec (`prompt.ts`, `PROMPT`).
+- Chamada (`chamar`, `:223`): `claude -p --output-format json --model <m> --allowedTools ""
+  --max-turns 1 --max-budget-usd <teto_corte>`, prompt pela entrada padrão. O binário é
   `ORQ_TRIADOR_CLAUDE` ou `claude`; sob teste (vitest ou `ORQ_TESTE=1`) sem
-  `ORQ_TRIADOR_CLAUDE`, a chamada é recusada.
-- Teto do dia (`criarPassoModelo`, `:352`): a chamada só sai se gasto do dia + teto do caso
-  ≤ teto do dia (entrada sem custo conhecido conta como o teto do caso); senão
-  `modelo: {pulado: "teto_dia"}` e vale a extração. Custo acima do teto do caso marca
-  `custo_acima_do_teto` no ledger.
-- Resposta (`lerResposta`, `:260`): a última linha JSON com `classe` em R1-R7. Cada
+  `ORQ_TRIADOR_CLAUDE`, a chamada é recusada. Com uma volta só, o `--max-budget-usd` não
+  impede o gasto: a volta é paga e, acima do corte, o CLI devolve `error_max_budget_usd`
+  sem `result` (§13.7). Por isso o corte (0,60) fica acima do teto do caso (0,30), que só
+  marca `custo_acima_do_teto` no ledger, como na spec §4.
+- Envelope (`lerEnvelope`, `:244`): o de erro do CLI, sem `result`, é lido como `is_error`
+  com `subtype`, `errors` e o custo pago, que vai ao ledger.
+- Teto do dia (`criarPassoModelo`, `:414`): a chamada só sai se gasto do dia + corte ≤
+  teto do dia (entrada sem custo conhecido conta como o corte, `gastoDoDia`, `:364`);
+  senão `modelo: {pulado: "teto_dia"}` e vale a extração.
+- Resposta (`lerResposta`, `:299`): a última linha JSON com `classe` em R1-R7. Cada
   evidência tem de ser de um arquivo lido e de uma linha que ele tem (no recorte, uma
   linha guardada); a que não confere sai e conta `evidencia_descartada`
-  (`conferirEvidencia`, `:286`). Envelope ilegível, sem evidência válida ou classe fora da
-  lista: vale a extração, com `modelo.erro`. A resposta do modelo nunca é firme.
+  (`conferirEvidencia`, `:325`). A resposta do modelo nunca é firme.
+- Descarte (`Descarte`, `:378`): toda resposta descartada grava `modelo.erro` e
+  `modelo.descartado = {regra, trecho}`, com `regra` em `envelope_ilegivel`,
+  `teto_corte_cli`, `envelope_is_error`, `resposta_sem_classe` ou
+  `evidencia_nenhuma_confere`; vale a extração, e o placar mostra
+  `[descartado: <regra>: <trecho>]`.
 
 ### 13.6 Fixture e testes
 
@@ -1143,12 +1153,42 @@ Só para palpite e sem regra, uma vez por assinatura (mesmo que falhe: `modelo.e
 em `cortados/`, 5 controles cortados na última tentativa que reprovou, montados por
 `montar.py` (só leitura do comarka-operacional, git com `GIT_OPTIONAL_LOCKS=0`; os
 cortados saem de `controle/`, `--so-cortados`), cada um com `esperado.json` (classe e
-evidência da medição, com a linha da tabela; nos de controle e cortados, `firme_proibido`). `orq triar --fixture <dir>` (`corrida.ts:46`) roda o triador sobre os 37
-e imprime o placar (C) da spec §7.2; é a corrida da peça 6.
+evidência da medição, com a linha da tabela; nos de controle e cortados, `firme_proibido`). `orq triar --fixture <dir> [--casos a,b,…]` (`corrida.ts:51`) roda o triador sobre
+os 37 (ou só os casos pedidos) e imprime o placar (C) da spec §7.2; é a corrida da peça 6.
+Os 22 palpites trazem `resposta-modelo.json`, a resposta gravada na corrida real (§13.7).
 
 Testes: `orquestrador-triador-{fixture,leitores,extrair,aceite,saida,modelo}.test.ts`. O
 `claude` deles é `test/fixtures/claude-envelope/triador-stub.sh`; o do PATH é uma trava.
 
+### 13.7 Etapa 7f-b1b: replay da corrida real e conserto do descarte (10/10/2026)
+
+A corrida real da peça 6 (`~/orq-sessoes/corrida-7f-peca6.txt`) deu 21/37 no aceite (C),
+que pede ≥ 30.
+
+- **Replay.** As 22 `resposta-modelo.json` de `~/.orq/corrida-7f-peca6/` estão na fixture.
+  O aceite (C) roda a corrida com o stub devolvendo cada `envelope_bruto` gravado (com o rc
+  da corrida), pelo parser, pela conferência e pelo ledger de verdade, no relógio e no teto
+  da corrida. Sem chamada de API. Sem conserto, o placar sai igual, byte a byte, ao da
+  corrida: 21/37, 22 chamadas, US$ 4,1376.
+- **Os 6 `[extracao]` sem motivo** (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707): o
+  CLI cortou no `--max-budget-usd` = teto do caso (0,30) DEPOIS da volta paga (US$ 0,31 a
+  0,40) e devolveu `error_max_budget_usd` sem `result`. `lerEnvelope` exigia `result`: o
+  envelope virava "ilegível" e o custo sumia do ledger e do placar (a corrida pagou
+  US$ 6,1265, não 4,1376). Conserto: corte do CLI separado (`teto_corte_usd`), o envelope de
+  erro entra no ledger com o custo, e o descarte `teto_corte_cli` sai no placar. No replay,
+  0 dos 6 passam a usar a resposta do modelo: o envelope não tem `result` para recuperar.
+- **Evidência equivalente** (só no teste de aceite): além da evidência da medição (±3), vale
+  a que existe na cópia, cujo trecho está na linha, que carrega o sinal da classe e sustenta
+  o remédio (R1: vermelho de teste fora da allowlist citado no remédio; R2: bloco `FALHA` de
+  `criterio[i]` citado no remédio; R3: juiz ou log com token, lista fechada, autorização,
+  `liberacoes.json`, DDL/FK, refatiar ou motor, e remédio de decisão; R4: vermelho de teste
+  dentro da allowlist, e remédio de ticket). R5, R6 e R7 só contam com a da medição. Dos 8
+  "classe certa, evidência fora", 7 valem; o 741 não (nenhum artefato mostra a falta de
+  código). Placar: 28/37.
+- **R3 no prompt:** proposta `7f-b1b-r3` (`prompt.ts`, `R3_7F_B1B` `:84` e
+  `REGRAS_R3_7F_B1B`), só por opt-in; virar padrão é mudar a spec. A mini-corrida paga (9
+  casos, teto US$ 5,40) está em `~/orq-sessoes/corrida-7f-r3.cmd` e não foi rodada.
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index e385cd4..8fd8bb2 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -951,13 +951,34 @@
   controle e série cortada sem firme), `-fixture`, `-leitores`, `-extrair`, `-saida` (repo git intocado,
   `GIT_OPTIONAL_LOCKS=0`), `-modelo` (stub; `claude` do PATH é trava).
 
+- **Etapa 7f-b1b · replay da corrida real e conserto do descarte** (10/10/2026). As 22
+  respostas da corrida real da peça 6 viram replay do aceite (C) (reproduz 21/37); todo
+  descarte da resposta do modelo grava o motivo e sai no placar; os 6 sem motivo eram o
+  corte do CLI no teto do caso depois de pago, agora `teto_corte_usd` separado e com o custo
+  no ledger; o aceite conta a evidência equivalente com o sinal da classe (28/37); proposta
+  de prompt para R3, opt-in. Commits `983ebae` (replay), `99407d1` (descarte com motivo),
+  `69956a2` (corte do CLI e custo do envelope de erro), `7f748d0` (evidência equivalente),
+  `12076a1` (prompt R3 e `--casos`).
+  *Evidência:* `~/orq-sessoes/corrida-7f-peca6.txt`, `~/.orq/corrida-7f-peca6/` e
+  `~/orq-sessoes/relatorio-kit-etapa7f-b1b.md`.
+  *Teste:* `orquestrador-triador-aceite.test.ts` ((C) em replay: 21/37 reproduzido, 6
+  descartes com motivo, custo real US$ 6,1265, 28/37 com a evidência equivalente, a regra
+  não afrouxa, ≥ 30 em `it.fails`), `orquestrador-triador-modelo.test.ts` (envelope do corte
+  real, descartes, prompt `7f-b1b-r3`, `--casos`).
+
 ## PENDENTES
 
-- **7f peça 6 · corrida real e replay.** `orq triar --fixture test/fixtures/triador-7f` com o
-  modelo de verdade, teto US$ 6,60, nos 22 casos de palpite; as `resposta-modelo.json` entram
-  na fixture e o aceite (C) vira replay (≥ 30/37).
-  *Evidência:* spec 7f-a §7.2 e §8; o comando em `~/orq-sessoes/corrida-7f-peca6.cmd` e o
-  que conferir em `~/orq-sessoes/corrida-7f-peca6-conferir.md`.
+- **7f-b1b · mini-corrida paga do R3.** `~/orq-sessoes/corrida-7f-r3.cmd` (9 casos: os 5 R3 e
+  os 6 cortados no teto, prompt `7f-b1b-r3`, teto US$ 5,40), depois do merge da 7f-b1b; as
+  respostas novas entram na fixture e o aceite (C) é refeito. Com 28/37 hoje, chegar a 30
+  pede ao menos 2 dos 9 com classe e evidência certas.
+  *Evidência:* `~/orq-sessoes/relatorio-kit-etapa7f-b1b.md`.
+- **7f · decisões para o chat do programa.** (1) O teto do caso (0,30) não cobre o custo
+  real do `claude -p` (0,17 a 0,40 na corrida; por chamada, 10 a 12 mil tokens de cache lido e
+  19 a 47 mil criados, com a entrada dentro): manter 0,30 como marca ou subir. (2) O corte
+  do CLI em 0,60 e o pior caso do dia nele (9 chamadas por dia em 3,00, não 10). (3) O
+  prompt `7f-b1b-r3` como padrão, depois da mini-corrida.
+  *Evidência:* `~/orq-sessoes/relatorio-kit-etapa7f-b1b.md`.
   *Teste:* aceite (C) por replay, sem chamada no CI.
 
 - **7f-b2 · gatilho e painel.** A peça 7 da spec redefinida (o painel nunca dispara gasto:
```

