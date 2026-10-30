# Corrida real da peça 6 (7f): o que conferir

Comando: `~/orq-sessoes/corrida-7f-peca6.cmd`. Rodar no checkout principal do kit, **depois
do merge de `kit/etapa7f` (até `cbda4ed`)**, com o `claude` logado.

Desde a 7f-b1-7, a D6 só dá R1 firme com o vermelho em ≥ 2 tentativas, e o 346d virou
palpite. Por isso são **22 palpites** (15 firmes não chamam) e o teto vai a **US$ 6,60**
(22 × 0,30), não mais 21 e US$ 6,30.

1. **`rc=0`** no terminal, e a última linha de `~/orq-sessoes/corrida-7f-peca6.txt`:
   `-- (C) classe e evidência certas: N/37 (aceite: >= 30); chamadas novas: 22; custo desta corrida: US$ X`
   - **chamadas novas: 22**, exatamente;
   - **X ≤ 6,60**;
   - **N ≥ 30** é o aceite (C). Sem modelo, hoje dá 14/37. 346d e 711b3 contam como
     "evidência fora", porque a medição cita `enforcement.json` e `claude-output.txt`.
2. **Nenhum `modelo.erro` e nenhum `pulado`:**
   - `grep -l '"erro"' ~/.orq/corrida-7f-peca6/fixture-triador-7f/*.json` sai vazio;
   - `grep -l '"pulado"' ~/.orq/corrida-7f-peca6/fixture-triador-7f/*.json` sai vazio
     (o placar não imprime `pulado`; um palpite pulado aparece só como `[extracao]`).
   - `grep -c '\[extracao\]' ~/orq-sessoes/corrida-7f-peca6.txt` dá 15: são os firmes.
   - Se todas derem erro com a mesma mensagem, o mais provável é o CLI recusar
     `--max-turns` ou `--max-budget-usd`, que a sessão não pôde testar contra o CLI real.
     Pare e traga a mensagem.
3. **Ledger:**
   - `jq '[.dias[][] | .custo_usd] | add' ~/.orq/corrida-7f-peca6/custo.json` ≤ 6,60;
   - `grep -c custo_acima_do_teto ~/.orq/corrida-7f-peca6/custo.json` dá 0.
4. **Respostas do replay:**
   `ls ~/.orq/corrida-7f-peca6/fixture-triador-7f/*/resposta-modelo.json | wc -l` dá 22.
   São elas que a sessão da peça 6 copia para a fixture.
5. **Repo intocado:** `git -C ~/Projetos/orquestrador-kit status --short` sem nada novo
   (em especial nada em `test/fixtures/triador-7f`).
6. **Não rodar de novo para "conferir":** rodar de novo não paga (mesma assinatura, 0
   chamadas novas), mas `--forcar` paga tudo de novo. Nunca usar `--forcar` aqui.
