# Gate shell instável sob carga: dois testes medem relógio de parede

Origem: etapa KF (o kit roda a própria fila, M-68), 07/11/2026, Q-1 de
`~/orq-sessoes/relatorio-kit-fila-propria.md`. Estado: **aberto**. Por decisão do Lucas, o gate
`shell` e as tolerâncias de tempo não mudam nesta etapa.

## O que acontece

O gate `shell` da fila do kit (`bash scripts/kit/test-shell.sh`) saiu rc 1 nas duas rodadas da
medição na `main` `ee8c4a7`, cada vez por um script diferente, e nenhum dos dois por regressão:

| rodada | carga medida | duração do test-shell | script e falha |
|---|---|---|---|
| 1 (21:39, em sequência, com o vitest da P1 rodando em paralelo) | load average 44 a 59 | 700 s | `test-gate-instavel.sh`, caso C: `FALHA C: status pendente` |
| 2 (22:02, o test-shell sozinho) | load average 44 a 59 | 1378 s | `test-painel-lento.sh`: `FALHA rápido: razões apuradas: esperado 'ok', veio 'apurando'` e mais 3 |

Rodado sozinho logo depois, `test-gate-instavel.sh` passou na `main` (`ee8c4a7`) e na branch
(`ded3972`), com rc 0 nos dois. No fechamento da P4 (`1e932ae`, load de 21 a 41), o test-shell
inteiro saiu rc 0 em 881 s.

Onde o relógio entra:
- `test-painel-lento.sh`: a resposta do `/api/estado` tem de vir abaixo de 1 s (`:65-70`), e o
  repo lento é um `sleep 30.4242` (`:40`) contra o `ORQ_PAINEL_RAZOES_TIMEOUT=4` (`:54`). Sob
  carga, o rápido ainda está `apurando` na hora da leitura.
- `test-gate-instavel.sh`, caso C (`:187-190`): o `caso` roda uma tentativa real pelo executor de
  fixture, com o `claude_timeout_secs` 2 do molde (`test-fixture-executor.sh:74`), e não usa o
  `FXE_CLAUDE_TIMEOUT`. **Hipótese, não provada:** sob carga o agente falso estoura os 2 s, a
  tentativa vira adiamento e o ticket fica `pendente`.

## Efeito na fila do kit

O ticket cai em base vermelha ou em retry sem culpa do diff, e gasta uma tentativa do loop.

## Pedido

Relógio controlado nos dois testes. O teste injeta o tempo (o tique do timeout do painel e o
término do agente falso) em vez de medir segundos de parede, e a asserção passa a ser a ordem dos
eventos ("o rápido respondeu antes de o lento terminar", "o agente terminou antes do timeout"), não
um número de segundos. Nada de afrouxar tolerância.

## Critério

- Sob carga artificial (por exemplo, `yes > /dev/null` em todos os núcleos durante o teste), os dois
  scripts saem rc 0 dez vezes seguidas.
- Com o relógio injetado parado antes do timeout, o painel diz `apurando`; avançado depois do
  timeout, diz `falhou` e o processo do lento morre. Os dois casos são decididos pelo tique, não
  pelo `sleep`.
