# REVIEW — o que o juiz cobra neste repositório (dashboard-comercial)

Lido pelo juiz do estado da BASE da tentativa; o loop nunca edita este arquivo.
Cada seção é uma falha que já passou por aqui ou pelo Comarka OS, que usa o mesmo banco e a
mesma stack. Reprove o diff que tiver a cara dela, dizendo arquivo e linha.

## 1. Config apontando para produção
Cara no diff: teste ou script que lê `.env.local` ou monta cliente com URL ou service role de
produção (ref `ogfnojbbvumujzfklkhh`); rota GET que grava; escrita sem `podeEscreverEmProducao()`.
Reprove se: o diff conecta em produção a partir de teste ou script, ou grava dentro de GET.
Fonte: 0f24c418 (v128 lia `.env.local` e rodou contra produção; 18 vezes, 08e6bb67), 6213cdc8 e
37fe4b01 (GET de /api/financeiro/entradas no Mac gravou ltv_meses +1 em 12 clientes e tinha mais
três efeitos colaterais), aa40e754 (guarda que falha alto com URL ou service role de produção).

## 2. Teste que não testa a regra
Cara no diff: teste que precisa de credencial real para passar; controle negativo que só passa
com dependência de outra versão; o servidor do Supabase devolve no máximo 1000 linhas por
chamada e o código pede `.limit(N)` com N maior que 1000 (ou nenhum) sem paginar, com dublê que
ignora `.limit`/`.range`.
Reprove se: o teste depende de credencial ou rede; ou a regra depende de teto, página ou fuso e
o dublê não reproduz esse limite.
Fonte: 5ed537c7 (suíte padrão dependia de credencial; barreira com controle negativo 3/3),
f3b78920 (controle negativo chamava `.retry(false)`, que não existe na versão do lockfile);
Comarka 80a212fdb e 29afed53d (`.limit(5000)` cortado em 1000, mock que ignorava limit).

## 3. Doc ou comentário que mente
Cara no diff: comentário, PLAYBOOK ou doc com número, fonte ou comportamento que o diff não
prova.
Reprove se: o diff afirma fato (contagem, datas, "só roda em X") sem a prova no diff ou no
material.
Fonte: 08e6bb67 (PLAYBOOK e vitest.config diziam 3 execuções contra produção; eram 18; o mesmo
erro ficou em grace-softdelete-v128.integration.test.ts:10).

## 4. Escrita em tabela de outro dono
Cara no diff: `.from("<tabela>").insert/update/upsert/delete`, RPC ou migration que escreve em
tabela "dentro" do mapa de dono: C0 analítico (`clientes_receita`, `leads_crm*`, `trafego_*`,
`ads_metadata`, `ads_performance`), as 7 `meta_*` do OS por nome (`meta_connections`,
`meta_ad_accounts`, `meta_insights_cache`, `meta_lead_forms`, `meta_sync_logs`,
`meta_agency_connection`, `client_meta_accounts`), `perf_*` e `ia_prompts` (lado do OS).
`ghl_comercial` e `dashboard_readonly` são do dashboard: escrever ali é permitido.
Reprove se: o diff ADICIONA escrita (não comentário, não linha removida) em tabela "dentro",
inclusive manutenção de rota que já escreve nela.
Fonte: ~/orq-sessoes/relatorio-dc-orq-conteudo.md, mapa de dono de 22/10 (decisão L2; tabela
"Zona protegida" e varredura: o dashboard já escreve em `perf_*` 11 vezes, em `ia_prompts` e em
`trafego_regras_historico` fora da rota autorizada).

## 5. Consulta em série por item
Cara no diff: `await` de consulta ao banco ou à API dentro de `for`/`map` por item; leituras
independentes em série em vez de `.in(...)` em lote ou `Promise.all`.
Reprove se: o número de consultas cresce com o número de itens e o objetivo não exige isso.
Fonte: Comarka a2cd69ec8 (Início lento: 34 → 108 consultas de 3 para 40 clientes), da1f4f1ce
(backfill a ~2 s por item) e 80a212fdb (contatos lidos cliente a cliente). Mesmo banco.

## 6. Data comparada sem o dia de São Paulo
Cara no diff: data comparada como texto ou com `new Date(...)` sem o fuso de São Paulo;
`getMonth()` de DATE lida como meia-noite UTC.
Reprove se: o corte de dia, semana ou mês depende do horário da máquina ou do UTC.
Fonte: 6213cdc8 (`new Date(mes_fechamento)` + `getMonth()` em BRT devolveu o mês anterior e
gravou ltv_meses +1 em 12 clientes); Comarka 10c88edb9 (ticket 953, "funil no dia de SP").
