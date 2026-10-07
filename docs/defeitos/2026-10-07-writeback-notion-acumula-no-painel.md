# Defeito: writeback-notion acumula no painel em vez de sobrescrever

Origem: comarka-operacional, 07/10. Estado: ABERTO, não implementado. O `writeback-notion.ts` existe só na linhagem do motor do comarka (o kit não distribui esse arquivo). Ele entra aqui para a migração do comarka para o kit não herdar o problema. No comarka o passo está desligado desde 01/10 (`5f2785d`, `ORQ_NOTION_WRITEBACK` padrão 0 em `local-loop.sh:417`) e, desde `d33c111`, também por `"writeback_notion": false` em `docs/fila/000-config.json:15`.

## O que aconteceu

- O painel do Notion `346b5b1a-3b98-8073-92a0-def6db30ae6d` chegou a cerca de 3,2 milhões de caracteres. A última escrita foi o `writeback-notion sync ok` de 01/10 22:37 em `docs/fila/runs/local-loop.log`.
- (a) `upsertEstadoFila` (`scripts/orquestrador/writeback-notion.ts:153-180`) apaga a seção cujo heading começa com `SECTION_PREFIX` = `Orquestrador — estado da fila` (`:26`, `:95-100`) e anexa a nova no fim da página. O modo `ticket` escreve o heading `Orquestrador — ticket <id> (<hora>)` (`:198`), que não casa com o prefixo. Esses blocos nunca são apagados e se acumulam a cada chamada.
- (b) O page id é constante no código: `NOTION_PAGE_ID = '346b5b1a3b98807392a0def6db30ae6d'` (`:20`). O destino não vem da config e nada impede escrever no painel humano.
- (c) O modo `sync` gera um bullet por ticket (`:203-205`, `tickets.map(t => bullet(ticketLine(...)))`), hoje cerca de 870 itens por rodada. O status de ticket já mora em `docs/fila/`; o Notion não precisa repetir a fila inteira.
- (d) `.github/workflows/orquestrador.yml:82-84` roda `writeback-notion.ts sync` com `if: always()` no job `orquestrador` (só `workflow_dispatch` com `job=orquestrador`, `NOTION_TOKEN` de `secrets.NOTION_TOKEN` na `:37`). Esse caminho ignora `ORQ_NOTION_WRITEBACK` e `writeback_notion`: quem disparar à mão ainda escreve no painel.

## Pedido

- Destino vindo da config (ex.: chave `writeback_notion_destino` no `000-config.json`). Destino reservado no comarka: página `3f2b5b1a-3b98-81c8-bbfc-e06a26f84b69` ("Orquestrador · estado da fila").
- Guarda: destino ausente ou igual a `346b5b1a-3b98-8073-92a0-def6db30ae6d` (com ou sem hífens) → no-op com aviso no log e zero chamada de rede. O id do painel só aparece no código como constante dessa guarda.
- Conteúdo: resumo compacto, nunca um item por ticket. Contagem por status, prontos, bloqueados com motivo curto, últimos 15 eventos (done ou bloqueado) e carimbo de hora. Teto de 20 mil caracteres no markdown gerado.
- Escrita: sobrescrever a página destino inteira a cada rodada, sem acrescentar nada. O modo `ticket` some ou passa a regravar o mesmo resumo.
- O workflow `orquestrador.yml` passa pela mesma guarda e pela mesma chave de config que o `local-loop.sh`.

## Critério executável

Com fetch mockado:

- Destino = painel (com e sem hífens) → fetch não é chamado, e o log tem o aviso.
- Destino ausente → fetch não é chamado.
- Fixture com 900 tickets → markdown gerado com menos de 20 mil caracteres.
- Duas rodadas seguidas sobre a mesma página falsa → uma única versão do resumo na página, sem resto da rodada anterior.
- Contraprova: destino válido → fetch chamado só com URLs do destino, nunca com o id do painel.
- `grep -rn '346b5b1a' scripts/orquestrador` → uma única ocorrência, na constante da guarda.

## Fora deste defeito

O resíduo já gravado no painel é limpo à mão no comarka (script descartável, fora do repo), não pelo motor.
