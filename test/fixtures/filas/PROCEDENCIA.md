# `test/fixtures/filas/` · amostras das filas dos três repos

Peça 7b-1. Até aqui `test/orquestrador-migrar-tickets.test.ts` lia as filas VIVAS
de `~/Projetos/<repo>/docs/fila`: passava nesta máquina, sumia em qualquer outra e
mudava de veredito quando o loop de lá drenava (o próprio teste já contava isso
em `esperados()`). Agora lê estas amostras.

Cópias **byte a byte** (`cp` + `cmp`), tiradas em **2026-09-21**, só leitura na
origem. Nenhum arquivo foi editado, reindentado ou reduzido.

| Pasta | Origem (só leitura) | HEAD da origem na coleta |
|---|---|---|
| `actus-saas/` | `~/Projetos/actus-saas/docs/fila/` | `199a91a` |
| `comarka-operacional/` | `~/Projetos/comarka-operacional/docs/fila/` | `fc8eacb` |
| `conteudos-infinitos/` | `~/Projetos/conteudos-infinitos/docs/fila/` | `2039b59` |

## Qual ticket cobre qual ramo do `migrar-tickets.ts`

Ramos de `migrarTicket` que as filas vivas exercitavam em 2026-09-21 (censo de
todos os `[0-9]*.md` das três filas): `status` não pendente (pulado), pendente
com `recon_esperado` (renomeado), pendente sem nome antigo (não reescrito). Os
ramos que NENHUMA fila viva tinha (`sem bloco`, `não parseia`, dois blocos,
`coexistem`, `tentativas_consumidas` em pendente) já são cobertos por tickets
sintéticos no próprio teste, e continuam assim.

| Repo | Arquivo | status | nome antigo | Ramo |
|---|---|---|---|---|
| actus-saas | `499-ghl-user-id-no-metadata.md` | pendente | nenhum | pendente sem renome: não reescrito |
| actus-saas | `489-midia-downloader-por-origem.md` | pendente | nenhum | pendente sem renome: não reescrito |
| actus-saas | `462-rejeicao-motivo-obrigatorio.md` | done | `tentativas_consumidas` | status: pulado MESMO tendo nome antigo |
| actus-saas | `001-fixture-smoke.md` | done | nenhum | status: pulado |
| actus-saas | `497-fila-ignora-ticket-done.md` | refatiar | nenhum | status: pulado |
| actus-saas | `471-onboarding-criterios-etapa.md` | bloqueado | nenhum | status: pulado |
| actus-saas | `_TEMPLATE.md` | pendente | nenhum | fora de `ticketsDe` (não migra o formulário) |
| comarka-operacional | `496-bloco-tarefas.md` | pendente | `recon_esperado` | renome `recon_esperado → recon` |
| comarka-operacional | `321-ia-insights-tese.md` | pendente | `recon_esperado` | renome `recon_esperado → recon` |
| comarka-operacional | `322-ia-carteira-mensal.md` | pendente | `recon_esperado` | renome `recon_esperado → recon` |
| comarka-operacional | `440-a11y-app-churn-page.md` | pendente | nenhum | pendente sem renome: não reescrito |
| comarka-operacional | `148-carteira-table-codigo-morto.md` | done | `recon_esperado` | status: pulado MESMO tendo nome antigo |
| comarka-operacional | `147-onboarding-id-rota-morta.md` | obsoleto | `recon_esperado` | status: pulado MESMO tendo nome antigo |
| comarka-operacional | `306b-perf-fechamentos-ingest.md` | bloqueado | `recon_esperado` | status: pulado MESMO tendo nome antigo |
| comarka-operacional | `_TEMPLATE.md` | n/a | n/a | fora de `ticketsDe` |
| conteudos-infinitos | `232-nome-do-nicho-na-listagem-e-na-edicao.md` | pendente | nenhum | pendente sem renome: não reescrito |
| conteudos-infinitos | `001b-higiene-lockfile.md` | done | nenhum | status: pulado |
| conteudos-infinitos | `231-formulario-de-persona-guiado.md` | bloqueado | nenhum | status: pulado |
| conteudos-infinitos | `_TEMPLATE.md` | n/a | n/a | fora de `ticketsDe` |

## Os números que o teste afirma, recalculados sobre a amostra

| Asserção | Fila viva (2026-09-21) | Amostra |
|---|---|---|
| actus: tickets em `ticketsDe` (disco intocado, byte a byte) | 100 | 6 |
| actus: migrados ("só o bloco muda") | 0 | 0 |
| comarka: tickets em `ticketsDe` | 582 | 7 |
| comarka: migrados ("só o bloco muda") | 32 | 3 |
| comarka: `esperados` = migrados do dry-run = linhas `+` | 32 | 3 |
| comarka: blocos parseáveis depois do `--aplicar` | 582 | 7 |
| CI: tickets em `ticketsDe` | 82 | 3 |
| CI: migrados | 0 | 0 |

## cksum de cada arquivo

```
actus-saas/
2406966058 3564 _TEMPLATE.md
645625332 2101 001-fixture-smoke.md
383233213 2339 462-rejeicao-motivo-obrigatorio.md
2801407855 3315 471-onboarding-criterios-etapa.md
1694996731 3202 489-midia-downloader-por-origem.md
308234722 3612 497-fila-ignora-ticket-done.md
2006620586 3063 499-ghl-user-id-no-metadata.md
comarka-operacional/
1724482065 3637 _TEMPLATE.md
61832087 3164 147-onboarding-id-rota-morta.md
4120713129 1865 148-carteira-table-codigo-morto.md
3512367281 13623 306b-perf-fechamentos-ingest.md
3415889229 4131 321-ia-insights-tese.md
415912526 4359 322-ia-carteira-mensal.md
2334283515 3899 440-a11y-app-churn-page.md
3855326807 3892 496-bloco-tarefas.md
conteudos-infinitos/
1402817465 3925 _TEMPLATE.md
3125041537 1144 001b-higiene-lockfile.md
2963853991 16468 231-formulario-de-persona-guiado.md
767034952 12965 232-nome-do-nicho-na-listagem-e-na-edicao.md
```
