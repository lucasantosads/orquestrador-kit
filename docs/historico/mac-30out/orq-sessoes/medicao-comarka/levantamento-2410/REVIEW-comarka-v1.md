# REVIEW — o que o juiz cobra neste repositório (comarka-operacional)

Lido pelo juiz do estado da BASE da tentativa; o loop nunca edita este arquivo.
Cada seção é uma falha que já passou por aqui. Reprove o diff que tiver a cara dela,
dizendo arquivo e linha. Na dúvida, reprove e diga o que falta.

## 1. Config apontando para produção
Cara no diff: teste ou script que lê `.env.local` ou monta cliente do Supabase com a URL ou a
service role reais; rota GET que grava; escrita sem trava de ambiente.
Reprove se: o diff conecta no projeto real a partir de teste ou script, ou grava dentro de GET.
Fonte: dashboard-comercial 0f24c418 (teste v128 lia `.env.local` e rodou contra produção; foram
18 vezes, 08e6bb67) e 6213cdc8 (GET de /api/financeiro/entradas rodando no Mac contra produção
gravou ltv_meses +1 em 12 clientes). Aqui: PLAYBOOK, "Secrets só humano". Sem incidente próprio.

## 2. Teste que não testa a regra
Cara no diff: o servidor do Supabase devolve no máximo 1000 linhas por chamada, e o código pede
`.limit(N)` com N maior que 1000 (ou nenhum limite) sem paginar com `.range`; o teste usa dublê
que devolve tudo e ignora `.limit`/`.range` (`for (const m of [... "limit" ...]) cadeia[m] =
() => cadeia`), então nunca vê o corte. Também: teste só de ausência; teste que passaria com o
código antigo.
Reprove se: a regra do objetivo depende de teto, página, fuso ou tipo de id e o teste usa dublê
que não reproduz esse limite; ou se há `.limit` acima de 1000 lendo tabela que cresce.
Fonte: 80a212fdb e 29afed53d (vácuo, eventos, promessas e fechar liam `.limit(5000)`; o servidor
cortou em 1000 e as mensagens mais recentes sumiram; 715, 734, 740, 741a e 861 foram aprovados
com mock que ignorava limit); kit juiz.ts:7-11 (ticket 204, ausência provada no vazio).

## 3. Doc ou comentário que mente
Cara no diff: comentário, PLAYBOOK ou doc com número, fonte ou comportamento que o diff não
prova; campo marcado como legado lido como fonte da verdade.
Reprove se: o diff afirma fato (contagem, "nenhuma tela grava", "a fonte é X") sem a prova no
próprio diff ou no material; ou lê campo que o repo trata como legado.
Fonte: dashboard-comercial 08e6bb67 (PLAYBOOK e vitest.config diziam 3 execuções contra produção;
eram 18). Aqui: 5912a0dfd (924c lia `whatsapp_group_url`, legado: 25 clientes "Sem link do
grupo") e f16164c25 (a ficha lia `clientes_extra.meta_account_id`, que nenhuma tela grava).

## 4. Escrita em tabela de outro dono
Cara no diff: `.from("<tabela>").insert/update/upsert/delete`, RPC ou migration que escreve em
tabela de `c0_intocavel` (docs/fila/000-config.json: `clientes_receita`, `leads_crm`, ...) ou
em `clientes_crm_config` (o dashboard comercial lê e grava).
Reprove se: o diff ADICIONA escrita (não comentário, não linha removida) em tabela de outro dono.
Fonte: PLAYBOOK, "Lição (04/09)" (ticket 184: o OS escrevia em `clientes_receita`); 262b71c30 e
f16164c25 (consertos que deixam `clientes_crm_config` intocada porque o dono é o dashboard).

## 5. Consulta em série por item
Cara no diff: `await` de consulta ao banco ou à API dentro de `for`/`map` por cliente, gestor,
contato ou oportunidade; leituras independentes uma depois da outra em vez de `.in(...)` em lote
ou `Promise.all`.
Reprove se: o número de consultas cresce com o número de itens e o objetivo não exige isso.
Fonte: a2cd69ec8 (Início lento: 2 consultas em série por cliente; equipe com uma carga por
gestor; 34 → 108 consultas de 3 para 40 clientes), da1f4f1ce (backfill a ~2 s por item, 15-20
idas sequenciais ao banco por oportunidade) e 80a212fdb (contatos lidos cliente a cliente).

## 6. Data comparada sem o dia de São Paulo
Cara no diff: data comparada como texto ou com `new Date(...)` sem o fuso de São Paulo
(`d >= from && d < ate` sobre ISO em UTC, `getMonth()` de DATE lida como meia-noite UTC).
Reprove se: o corte de dia, semana ou mês depende do horário da máquina ou do UTC.
Fonte: 10c88edb9 (revisão pós-release de 12/10, "funil no dia de SP"; ticket 953 comparava
`d >= periodo.from && d < aposTo`) e dashboard-comercial 6213cdc8 (`getMonth()` em BRT devolveu
o mês anterior).
