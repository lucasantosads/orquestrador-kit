# Defeito: nota "provável defeito de spec/harness" em dependência, base vermelha e árvore suja

Origem: comarka-operacional, medição de 25/09 a 09/10. Fonte: `~/orq-sessoes/medicao-bloqueios-out.md` §5 (R4, R5). Estado: ABERTO, não implementado. Amplia `2026-09-25-aceite-vermelho.md`, que cobre só o caso aceite; o mesmo ramo rotula errado mais três classes. Só existe na linhagem do comarka (no kit a nota não existe); entra aqui para o porte.

## O que acontece

`scripts/orquestrador/executor.sh:722-723` (circuit breaker por ticket) grava a nota fixa

    "motivo repetido: provável defeito de spec/harness, não do código — <motivo>"

para QUALQUER motivo repetido. Na medição, das 37 bloqueadas, ela apareceu em classes que não são spec:

| classe | casos | o que era | o que a nota faz o humano procurar |
|---|---|---|---|
| dependência (R4) | 559 #2, 600, 741, 707 #33 | o aceite achou falta real no código; remédio é ticket novo de código | a spec |
| base vermelha (R5) | 760, 898 #31, 741a #32 | vermelho em arquivo que o diff não tocou, desde `<sha>` | a spec |
| árvore suja (R5) | 940, 932 | merge recusado por `docs/fila/854-...md` modificado na staging-auto | a spec ("conflitou") |

Nos três a informação certa já estava no disco (`gate-vitest.txt`, `diff.stat`, saída do merge), e a nota mandou ler o lugar errado. 940 e 932 ficaram parados com mérito aprovado porque ninguém requeueou.

## Pedido

Trocar a nota fixa por uma classificação determinística, sem LLM, antes de gravar o bloqueio:
1. Motivo `aprovado no mérito, mas merge ...` => não deveria chegar aqui (ver `2026-10-10-arvore-suja-na-staging-vira-conflito.md`); enquanto chegar: `ambiente: merge recusado (<árvore suja|conflito>: <arquivos>)`.
2. Gate vitest/tsc vermelho com TODOS os arquivos vermelhos fora do diff e já vermelhos na branch alvo => `ambiente: base vermelha em <arquivo> desde <sha da alvo>`.
3. Vermelho em teste dentro da allowlist do ticket apontando para `src/` fora da allowlist (o `it` acusa arquivo que o ticket não pode mudar) => `dependência: falta em <arquivo:linha>; precisa de ticket de código`.
4. Só o resto mantém `provável defeito de spec/harness`.
5. Em todos, anexar à nota o `arquivo:linha` do 1º vermelho (é o diagnóstico que a medição mostrou servir em 36 de 37).

## Critério executável

Molde: `scripts/orquestrador/test-cooldown-causa.sh`. Uma fixture por classe (motivo + `gate-vitest.txt` + `diff.stat` + vermelho na alvo):
- merge recusado por árvore suja => nota começa por `ambiente: merge recusado (árvore suja`;
- vermelho só em arquivo fora do diff e vermelho na alvo => `ambiente: base vermelha em`;
- aceite com `it` apontando `src/x.tsx` fora da allowlist => `dependência: falta em src/x.tsx`;
- critério com forma errada e vermelho dentro do diff => mantém `provável defeito de spec/harness`.
