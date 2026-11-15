# Etapa 2.2.1 · relatório (vermelho antes, verde depois)

Fonte: defeitos D5, D6 e D7 achados no repo instalado em 14 e 15/11/2026. Base: motor 2.2.0
(`eaee07e`). Branch: `conserto/2.2.1`. MELHORIAS: M-11 (feito). Registro de defeito:
`docs/defeitos/2026-11-15-criterio-suite-inteira-bloqueia-por-ambiente.md` (parcial).

Vermelho = o teste novo rodado contra o motor 2.2.0 (código da 2.2.0, teste da 2.2.1).
Verde = suíte completa na ponta da branch, `scripts/kit/test-instalar.sh` e `tsc --noEmit`.

| Item | Teste | Vermelho contra a 2.2.0 |
|---|---|---|
| D5 promotor com diff vazio chamava o juiz | `orquestrador-221-promotor-sincronia.test.ts` | `expected [ { papel: 'juiz de promoção' } ] to have a length of +0 but got 1` (controle com diff de verdade verde) |
| D6 login do claude expirado | `orquestrador-221-auth.test.ts`, `orquestrador-221-auth-drenagem.test.ts` | 10 falhas (planejador, juiz de promoção, hook, juiz do ticket no executor, 3 da sonda, drenagem, `orq retomar`, `orq-pause.sh --off`): sem `AMBIENTE causa=auth`, sem pausa auth, sem notificação; a drenagem somava `.adiamentos` e chamava o próximo ticket. 3 controles verdes |
| D7 critério de suíte inteira | `orquestrador-221-criterio-suite-inteira.test.ts` | 5 de 6 falham: `cmdRodaSuiteInteira` não existe; candidato saía `motivo=gate`/aprovado; `gate_ticket.severidade.C18` recusado (controle `vitest run <arquivo>` verde) |

## Comportamento novo

- **D5**: com `git diff --quiet principal alvo` depois da sincronia, o promotor faz `merge --ff-only`
  sem gates e sem juiz, grava `PROMOVIDO ... motivo=sincronia` e não enfileira aviso.
- **D6**: o `claude_run` (bash) e as chamadas do `autonomo.ts` reconhecem o erro de login na cauda da
  saída (só com rc != 0). Efeito: `--- AMBIENTE causa=auth papel=<executor|juiz_ticket|sonda|planejador|juiz_lote|juiz_promocao|hook>`;
  na criação da pausa (`runs/.pausa-auth`): `PAUSA motivo=auth por=motor`, notificação nativa
  (independe de `canal_notificacao` e do hook; `ORQ_NATIVO_CMD` troca o osascript) e aviso `ambiente`
  com "rodar claude e /login". A tentativa não é consumida e a drenagem trata a volta como AMBIENTE.
  Cada disparo com a pausa auth começa por `claude -p` em haiku (`sonda_auth.modelo`),
  `--strict-mcp-config`, sem ferramenta, fora do repo: passou, remove só a pausa auth
  (`RETOMADA por=sonda_auth`). `orq retomar` e `orq-pause.sh --off` também a removem.
- **D7**: regra C18 do gate de ticket (erro, só com `--candidatos`, que o planejador passa):
  cmd com `vitest run` sem argumento posicional, `npm test`, `npm run build` ou `next build`
  descarta o candidato com motivo `criterio_suite_inteira`. Fora do lote do planejador é C18p
  (aviso): ticket pendente já na fila não é bloqueado no pré-voo. Configurável em `gate_ticket`:
  `severidade.C18`/`C18p` e `cmds_suite_inteira` (regex no lugar dos padrões do kit). O prompt do
  planejador deixou de pedir "guarda de typecheck e da suíte inteira".

Testes antigos ajustados de propósito: `orquestrador-gate-severidade.test.ts` (inventário com C18 e
C18p) e `orq-cli.test.ts` (a remoção do `orq` agora inclui a pausa auth).
