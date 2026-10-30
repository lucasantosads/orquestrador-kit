# Promoção staging-auto → main · 17/10/2026

> O molde citado (`claude/release-15out-promocao.md`) não existe no projeto nem no histórico do git.
> Este resumo segue os passos do pedido de 17/10.

**Alvo:** `origin/staging-auto` = `73156b919da1b4f98528b245c27464949f959446` (ritual 17/10 noite: lote 42 tickets e ADR-014/015)
**Base:** `origin/main` = `d790bf4c7858895e775a60217e0def95c07545a9`
**Worktree:** `~/Projetos/_worktrees/promocao-17out` (destacada em 73156b9)

**Escopo:** 177 commits · 276 arquivos · +13060 / −418

## Gate

| Etapa | Resultado |
|---|---|
| 1. `docs/fila/.orq-pause` | não existe, sem pausa |
| 2. fetch + worktree | ok, HEAD 73156b9 |
| 3. `merge-base --is-ancestor origin/main origin/staging-auto` | rc 0: main é ancestral, fast-forward |
| 4a. `rm -rf .next` | ok |
| 4b. `npm ci` | rc 0 |
| 4c. tsc fora de `.next/` | **3** (baseline: 2 em `api/perf/qualificacao-regras`, 1 em `qualificacao-block.tsx`) |
| 4d. `npx vitest run` | rc 0 · 1208 arquivos / 11884 testes passaram |
| 4e. `npm run lint` | rc 0 (só warnings) |
| 4f. build (`SESSION_SECRET` efêmero) | rc 0 |
| 4g. `rm -rf .next` | ok |
| 5. Migrations novas no ledger | 1/1 aplicada, ver abaixo |
| 6. Arquivos exigidos no diff | 3/3 presentes |

### 5. Migrations

| Arquivo no diff | Ledger (`supabase_migrations.schema_migrations`) |
|---|---|
| `20261016170000_perf_reuniao_registro_manual.sql` | `20261016232052` · `perf_reuniao_registro_manual` |

A versão do ledger é diferente da do arquivo; o nome bate. O próprio cabeçalho da migration manda
renomear o arquivo para a versão gravada, e isso não foi feito. Pós-aplicação conferida no banco:
`tldv_meeting_id` aceita nulo, as 9 colunas novas existem, `cliente.reunioes` está no catálogo (1).

Conferência extra: o código do Apolo (`src/lib/apolo`, `cron/apolo`, `cron/apolo-atendimento`) usa
37 tabelas e 21 RPCs que não vêm de migration deste diff. Todas existem no banco (schema
`inteligencia` + `public`).

### 6. Arquivos exigidos

- `A src/app/api/cron/apolo/route.ts`
- `A src/app/api/cron/apolo-atendimento/route.ts`
- `M src/app/api/webhooks/ghl/app/route.ts`: despacha `TIPOS_MENSAGEM` para `tratarMensagem` →
  `gravarMensagemGhl(db, payload, "webhook", …)` de `@/lib/apolo/ghl-conversas`; 422 para mensagem sem
  location/id/conversa.

## Tickets (`git log --grep "(ticket "`): 68 merges

1060, 1060a, 1060b, 1138, 1140, 1141, 1142, 1142c, 1160, 1161, 1162, 1162b, 1163b, 1164, 1171,
1180, 1181, 1182, 1183, 1184, 1186, 1190, 1191, 1192, 1193, 1194, 1195, 1196, 1200,
1220, 1221, 1222, 1223, 1224, 1225, 1226, 1227,
1230, 1231, 1232, 1233, 1234, 1235, 1236, 1237, 1238, 1239, 1240, 1241, 1242, 1243, 1244, 1245,
1246, 1247, 1249, 1250, 1251, 1252, 1253, 1254, 1255, 1256, 1257, 1258, 1259, 1260, 1261

## Push (não executado, é do Lucas)

```
git push origin 73156b919da1b4f98528b245c27464949f959446:main
```

Antes de rodar, conferir que `origin/staging-auto` não andou desde 73156b9 (o loop pode ter mergeado
mais coisa) e que `origin/main` continua em d790bf4.
