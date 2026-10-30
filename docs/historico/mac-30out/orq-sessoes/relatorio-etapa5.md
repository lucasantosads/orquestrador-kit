# Sessão de harness · etapa 5 · 2026-09-07

Worktree `_worktrees/ci-harness-d`, branch `harness/etapa5`, fora da fila. O loop
seguiu rodando no checkout principal o tempo todo; esta sessão não pausou, não
mergeou e não pushou. Merge em `main` e push são do Lucas.

## Commits

| sha | peça |
|---|---|
| `84294ea` | 13 · notificação só quando houve o que notificar |
| `9edbf65` | 1 · gate de ticket (`gate-ticket.ts` + `orq validar`) |
| `77f8126` | PECAS: as duas saem de PENDENTES com o sha; nasce a 1b |

## O que mudou

**Peça 13.** A drenagem notificava sempre, inclusive quando encerrava em zero por
não achar ticket processável. `deve_notificar` (no `lib.sh`) passou a decidir:
processou ≥ 1 ticket (aprovado, bloqueado, adiado, refatiado ou
`EXECUTOR_MORREU`) notifica sempre; fila sem processável notifica só na PRIMEIRA
vez desde a última drenagem que processou; qualquer outro fim em zero (pausa,
cooldown, sem progresso) cala. A memória é arquivo (`runs/.notificacao-fila-vazia`)
porque cada tick do launchd é um processo novo. `EXECUTOR_MORREU` não chega pelo
rc — o executor morre num processo filho —, então a drenagem conta o evento na
trilha antes e depois do laço. `MOTIVO_FILA_VAZIA` virou constante compartilhada.

Medido por A/B: com o comportamento antigo restaurado in loco, dez ticks com a
fila vazia escreviam **dez** linhas em `notificacoes.log` e 5 dos testes novos
falhavam; com o conserto, **uma** linha e 25/25 verdes.

E o defeito está vivo na produção neste momento — o `notificacoes.log` real do
checkout principal, hoje:

```
2026-09-07T11:58:28-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 248 DONE 11:28:20 (merge em staging-auto)
2026-09-07T12:28:35-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 248 DONE 11:28:20 (merge em staging-auto)
2026-09-07T12:58:41-0300 | Orquestrador CI: 0 aprovados, 0 bloqueados | duração 0min · adiados 0 · último: 248 DONE 11:28:20 (merge em staging-auto)
```

Três cartões idênticos, um por tick do launchd, com `processaveis=0` nos três.
Depois do merge, isso vira uma linha só.

**Peça 1.** `scripts/orquestrador/gate-ticket.ts` novo, mais o verbo
`orq validar [ids | --pendentes] [--relatorio]`. Oito checks, na ordem do
briefing: bloco ```json parseável; campos obrigatórios do pendente; `id` `NNN[a]`
igual ao prefixo do arquivo; `status` no vocabulário; `tipo`/`cmd`/`espera` de
cada critério; padrões proibidos no `cmd`; dependência por id existente ou
`humano:<token>`; allowlist sobreposta entre pendentes sem dependência declarada.
Saída: uma linha por violação `<arquivo>:<campo> <mensagem>`, rc 1 se houve;
`--relatorio` imprime tudo e sai 0. `orq validar` repassa o rc e continua
read-only — o teste afirma que o `.md` do ticket sai byte a byte igual.

41 casos em `test/orquestrador-gate-ticket.test.ts`, todos sobre fixture em
diretório temporário, nunca sobre `docs/fila` real; mais 5 casos do verbo em
`test/orq-cli.test.ts`.

## Divergências do briefing, e por que cada uma

1. **`gate_ticket.padroes_proibidos` não existe.** `grep` no repo inteiro não
   acha a chave. O que existe desde a Etapa 1 é `gate_ticket.proibido_no_cmd`, já
   semeada com exatamente os padrões que o `autoalimentacao.md` §2 nomeia — e
   `docs/fila/**` é zona proibida desta sessão, então semear chave nova não era
   possível. **Decisão sua:** o gate lê `proibido_no_cmd`. Registrado no código,
   no PECAS, no PLAYBOOK e no `autoalimentacao.md`.

2. **Precedência entre prefixo permitido e padrão proibido.** O config já anotava
   o conflito em `_conflito_conhecido` e nunca o resolvia. **Decisão sua**, agora
   escrita no `autoalimentacao.md` §2: (a) a isenção vale só para o PRIMEIRO
   segmento — emendou `&&` ou `|`, o veto volta a valer nos seguintes; (b)
   redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`, e `>`/`>>`
   para arquivo real reprova sempre; (c) `sh -c`, `bash`, `eval`, `sudo`, `rm`,
   `curl`, `wget` e crase nunca são isentos; (d) a isenção aparece na saída, com o
   prefixo que a concedeu.

3. **"drenagem com `processaveis=0` não escreve linha"** (briefing) × **"a fila
   ficou sem processável pela PRIMEIRA vez … notifica"** (PECAS). O PECAS manda,
   como o próprio briefing determina: a primeira drenagem vazia depois de uma
   produtiva **escreve** uma linha; da segunda em diante, silêncio. Os dois casos
   têm teste.

4. **`refatiar` entrou na conta de "processado".** O PECAS enumera "aprovado,
   bloqueado, adiado ou `EXECUTOR_MORREU`". `refatiar` (regra 19) é desfecho de
   executor que RODOU e gastou dinheiro; calar sobre ele seria o defeito
   espelhado — silêncio quando algo aconteceu.

5. **`dependencias: []` e `risco: ""` não são "campo vazio".** A primeira versão
   do check 2 reprovava os dois e derrubava os 7 pendentes inteiros. Ticket
   independente é a coisa certa a ser, e `risco` é preenchido pelo **passo 6** do
   gate, que fica fora desta peça: exigir valor ali seria o gate reprovando ticket
   por não ter feito o que o próprio gate ainda não faz. Os dois passaram a exigir
   só que a CHAVE exista.

6. **Escrevi em `docs/orquestrador/skill/references/autoalimentacao.md`**, que não
   estava na allowlist da sessão — foi instrução sua explícita ao decidir a
   precedência, e o arquivo está dentro de `docs/orquestrador/**`, o escopo que o
   próprio PECAS declara.

## O que ficou de fora, e por quê

**Peça 1b, registrada em PENDENTES:** `alvo` que já passa contra HEAD, `guarda`
que já falha contra HEAD, e execução de `recon[]`. O briefing já mandava deixar
fora, e a razão é boa: tudo isso EXECUTA comando escrito por modelo, e o §2 cerca
com worktree descartável, sem `.env` de produção, com `timeout_cmd_secs`. Um gate
que só LÊ pôde rodar nesta sessão contra a fila real sem consequência nenhuma.

**Nenhum ticket foi corrigido.** As 33 violações abaixo são de sessão de fila.

## Evidência: `bash scripts/orq validar --pendentes --relatorio`

Contra os 7 pendentes reais do checkout principal. **33 violações, 25 isenções.**
O padrão é um só e se repete: `test -f <arquivo> && test $(grep -c ...) -ge N`,
em que o `$(` cai no SEGUNDO segmento e perde a isenção.

```
GATE DE TICKET · 7 ticket(s) · fila /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila

231-formulario-de-persona-guiado.md  3 violação(ões)
  231-formulario-de-persona-guiado.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8') — cmd: test -f apps/web/test/personas-form-guiado.test.tsx && test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1') — cmd: test -f apps/web/src/server/nichos-read.ts && test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export function MultiEscolha' apps/web/src/components/fields.tsx) -eq 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(MultiEscolha|FAIXAS_RENDA|TONS_DE_VOZ)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 4 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(nicho_id|Outros)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 3 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarNichos' apps/web/src/app/personas/page.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[7] padrão proibido '$(' em segmento 2 ('test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1') — cmd: test -f apps/web/test/personas-form-guiado.test.tsx && test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1 && echo ok
  231-formulario-de-persona-guiado.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (function|const) (campoBase|LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -ge 9 && echo ok
232-nome-do-nicho-na-listagem-e-na-edicao.md  2 violação(ões)
  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-nicho-nome.test.tsx) -ge 7') — cmd: test -f apps/web/test/personas-nicho-nome.test.tsx && test $(grep -c 'it(' apps/web/test/personas-nicho-nome.test.tsx) -ge 7 && echo ok
  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export function rotuloNicho' apps/web/src/lib/nicho-exibicao.ts) -eq 1') — cmd: test -f apps/web/src/lib/nicho-exibicao.ts && test $(grep -cE 'export function rotuloNicho' apps/web/src/lib/nicho-exibicao.ts) -eq 1 && echo ok
  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -o 'rotuloNicho' apps/web/src/app/personas/page.tsx | wc -l) -ge 4 && echo ok
  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'rotuloNicho' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
235-servidor-de-sugestoes-por-nicho.md  6 violação(ões)
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9') — cmd: test -f apps/web/test/sugestoes.test.ts && test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[4] padrão proibido '$(' em segmento 2 ('test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(sugestao_usada|marcarSugestaoUsada)' apps/web/src/server/funil.ts | wc -l) -ge 3 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2') — cmd: test -f apps/web/src/server/sugestoes-types.ts && test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function marcar(OnboardingIniciado|ClienteCriado|AnguloCriado|PrimeiroRoteiro)' apps/web/src/server/funil.ts | wc -l) -eq 4 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4') — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
236-chips-de-sugestao-no-formulario-de-persona.md  2 violação(ões)
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-chips-sugestao.test.tsx) -ge 9') — cmd: test -f apps/web/test/personas-chips-sugestao.test.tsx && test $(grep -c 'it(' apps/web/test/personas-chips-sugestao.test.tsx) -ge 9 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE '^export function ChipsSugestao' apps/web/src/components/fields.tsx) -eq 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes\?:|aoUsarSugestao\?:' apps/web/src/components/fields.tsx | wc -l) -ge 2 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarSugestoes' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'registrarUsoSugestao' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes=' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 2 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function (LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -eq 8 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form.test.tsx) -ge 2 && test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12 && echo ok
  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[10] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12') — cmd: test $(grep -c 'it(' apps/web/test/personas-form.test.tsx) -ge 2 && test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12 && echo ok
242-leitura-e-decisao-por-token.md  7 violação(ões)
  242-leitura-e-decisao-por-token.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10') — cmd: test -f apps/web/test/aprovacoes-publico.test.ts && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[4] padrão proibido '$(' em segmento 2 ('test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3') — cmd: test -f apps/web/src/server/aprovacoes-types.ts && test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[9] padrão proibido '$(' em segmento 2 ('test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 5 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[12] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 7 && test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok
  242-leitura-e-decisao-por-token.md:criterios_aceite[12] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 7 && test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok
243-rota-e-tela-publica-de-aprovacao.md  6 violação(ões)
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6') — cmd: test -f apps/web/test/aprovar-publico.test.tsx && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2') — cmd: test -f apps/web/test/aprovar-publico.test.tsx && test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "'/aprovar'" apps/web/src/lib/auth/routes.ts) -eq 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'lerRoteiroPorToken|notFound' 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3') — cmd: test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && test $(grep -oE 'lerRoteiroPorToken|notFound' 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -c 'decidirPorToken' 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1') — cmd: test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && test $(grep -c 'decidirPorToken' 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "/aprovar|/aprovacoes" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'/[a-z-]+'" apps/web/src/lib/auth/routes.ts | wc -l) -eq 5 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40') — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16') — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok
244-fila-interna-de-aprovacao.md  7 violação(ões)
  244-fila-interna-de-aprovacao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9') — cmd: test -f apps/web/test/aprovacoes-fila.test.tsx && test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2') — cmd: test -f apps/web/src/app/aprovacoes/page.tsx && test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
  244-fila-interna-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 3 ('test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok

TOTAL: 33 violação(ões), 25 isenção(ões), em 7 ticket(s)
```

## Fechamento

- `npx vitest run orq --reporter=dot`: **24 arquivos, 612 testes, 100% verde**
  (eram 566 antes desta sessão).
- `npm run typecheck:root`: limpo.
- `test-drenagem.sh`, `test-lib-config.sh`, `test-preflight.sh`,
  `test-retry-worktree.sh`: **rc=0 nos quatro**, iguais ao início.
- Trilha de produção na janela da sessão (12:40 em diante): só os dois eventos do
  próprio launchd, `DRENAGEM_INICIO`/`DRENAGEM_FIM` de 12:58. Nada desta sessão.
- `custo.json` de produção com mtime **11:28**, anterior ao início da sessão:
  zero gasto.
- Checkout principal em `main`, limpo.

## Diff cru, commit a commit

### `84294ea` — 13: notificação só quando houve o que notificar

```diff
diff --git a/docs/orquestrador/PLAYBOOK.md b/docs/orquestrador/PLAYBOOK.md
index bfa8803..3b173b1 100644
--- a/docs/orquestrador/PLAYBOOK.md
+++ b/docs/orquestrador/PLAYBOOK.md
@@ -160,6 +160,13 @@
   - **O bash SEGURA o sinal até o comando em primeiro plano voltar.** É por isso que o log de 06/09 mostra a linha dos gates ANTES da morte: o TERM foi para o grupo, o `npx tsx gates.ts` voltou 143, a linha foi impressa, e só então o executor teria tratado o sinal — se houvesse trap. O `claude_run` usa `wait`, que é interrompível; o teste modela os dois caminhos.
   - **Regra de fechamento de sessão de harness.** Toda sessão que mexe no harness fecha com `tail -3 docs/fila/runs/events.log` e `git diff` do `custo.json` **da worktree onde ela rodou**, comparados com o início. Os dois inalterados é a prova de que a sessão não drenou, não gastou e não escreveu na trilha; qualquer linha nova ali é evidência falsa entrando no histórico — e o teste da peça 0d existe justamente para que essa checagem seja redundante, não para substituí-la.
 
+- **2026-09-07 (harness, etapa 5)** — Sessão de harness em worktree dedicada (`_worktrees/ci-harness-d`, branch `harness/etapa5`), **fora da fila**, com revisão por diff e um commit por peça. Backlog: `docs/orquestrador/PECAS.md`.
+  - **Peça 13 · notificação só quando houve o que notificar.** Em 07/09 11:0x o launchd cuspiu um cartão `0 aprovados · duração 0min · último —` a CADA tick enquanto o 240 ainda rodava: a drenagem não achava processável, encerrava em zero e notificava assim mesmo. **Notificação que chega quando nada aconteceu treina o operador a ignorar a notificação que importa** — o custo não é o ruído, é a que ele passa a não ler. Agora `deve_notificar` (no `lib.sh`) decide: processou ≥ 1 ticket notifica sempre; fila sem processável notifica só na PRIMEIRA vez desde a última drenagem que processou; qualquer outro fim em zero (pausa, cooldown, sem progresso) cala. Medido no teste: com o comportamento antigo, dez ticks com a fila vazia escreviam **dez** linhas; hoje escrevem **uma**.
+  - **A memória tem de sobreviver ao processo, e por isso é arquivo.** Cada tick do launchd é um processo novo — variável não atravessa, e é justamente a REPETIÇÃO que se quer calar. O marcador `runs/.notificacao-fila-vazia` é criado quando se avisa "fila vazia" e apagado por qualquer drenagem que processe algo: o rearme é consequência de ter havido trabalho, não de alguém lembrar de limpar.
+  - **`EXECUTOR_MORREU` não chega pelo rc.** O executor morre num processo FILHO, e do lado da drenagem `rc != 0` é indistinguível de reprovação mecânica. O registro dessa morte é a trilha (peça 12), então a drenagem conta `EXECUTOR_MORREU` no `events.log` ANTES do laço e DEPOIS dele, e a diferença é o que morreu naquele trecho — morte velha não rearma nada. Contar pelo total do arquivo faria toda drenagem posterior a uma morte parecer produtiva para sempre.
+  - **`motivo_ocioso` virou constante compartilhada.** A decisão de notificar compara com a frase `sem ticket processável`, que antes existia solta no `local-loop.sh`. Frase repetida em dois arquivos é dois arquivos que divergem no dia em que alguém a reescreve — `MOTIVO_FILA_VAZIA` mora no `lib.sh` e os dois lados leem a mesma variável.
+  - **Refatiar conta como processado, e o PECAS não o listava.** A peça enumera "aprovado, bloqueado, adiado ou `EXECUTOR_MORREU`"; `refatiar` (regra 19) é desfecho de executor que RODOU e gastou dinheiro. Calar sobre ele seria o defeito espelhado — silêncio quando algo aconteceu — então entra na conta, e fica registrado aqui que a lista do PECAS era menor que a realidade.
+
 ## Etapa 3, sessão B — fila de trabalho
 
 1. ~~**O juiz (`avaliador`) — o papel que falta.**~~ **FEITO em 2026-09-03** (peça 1 acima); o desenho abaixo foi seguido item a item e fica como registro do que foi combinado antes de existir. Hoje não existe: `avaliador_model` está no config e entra no probe, mas nenhum código o consome, e critério com `espera: "avaliador"` é PULADO em `executor.sh:308`. Todo julgamento é mecânico, e a auditoria do 204 acima mostra o preço disso. Desenho fechado:
diff --git a/scripts/orquestrador/lib.sh b/scripts/orquestrador/lib.sh
index 79792c1..bc5e1fe 100755
--- a/scripts/orquestrador/lib.sh
+++ b/scripts/orquestrador/lib.sh
@@ -756,6 +756,55 @@ decisao_pendente() {
 # nem depois, porque não sobrou registro.
 NOTIF_FILE="$RUNS_BASE/notificacoes.log"
 
+# --- PEÇA 13: notificação só quando houve o que notificar ---------------------
+# Cartão que chega quando nada aconteceu treina o operador a ignorar o cartão que
+# importa. Em 07/09 11:0x o launchd cuspiu "0 aprovados · duração 0min · último
+# —" a cada tick enquanto o 240 ainda rodava: a drenagem não achava processável,
+# encerrava em 0 e notificava mesmo assim.
+#
+# A regra tem duas metades, e a segunda é a que não pode virar spam:
+#   1. processou ao menos um ticket (aprovado, bloqueado, adiado, refatiado ou
+#      EXECUTOR_MORREU) -> notifica SEMPRE;
+#   2. fila sem processável -> notifica só na PRIMEIRA vez desde a última
+#      drenagem que processou. Daí o marcador em disco: a memória tem de
+#      sobreviver ao fim do processo, porque cada tick do launchd é um processo
+#      novo e a repetição é exatamente o que se quer calar.
+# Qualquer outro fim com zero processados (pausa, cooldown, sem progresso) cala:
+# nenhum deles é "a fila acabou", e quem pausou já sabe que pausou.
+NOTIF_VAZIA_FILE="$RUNS_BASE/.notificacao-fila-vazia"
+
+# MOTIVO do fim de drenagem por fila vazia. Constante compartilhada porque a
+# decisão de notificar compara com ela: string repetida em dois arquivos é dois
+# arquivos que divergem no dia em que alguém reescreve a frase.
+MOTIVO_FILA_VAZIA='sem ticket processável'
+
+# contar_eventos <EVENTO> -> quantas linhas da trilha são desse evento.
+# Serve para medir o que aconteceu DURANTE um trecho: conta antes, conta depois.
+contar_eventos() {
+  local n
+  n="$(grep -c " ${1:-} " "$EVENTS_FILE" 2>/dev/null)" || n=0
+  case "$n" in ''|*[!0-9]*) n=0 ;; esac
+  printf '%s\n' "$n"
+}
+
+# deve_notificar <processados> <motivo_ocioso> -> rc 0 = notifica.
+#
+# Além de decidir, MANTÉM o marcador — decisão e memória no mesmo lugar para que
+# não exista caminho que notifique sem lembrar, nem que lembre sem notificar.
+deve_notificar() {
+  local processados="${1:-0}" motivo="${2:-}"
+  case "$processados" in ''|*[!0-9]*) processados=0 ;; esac
+  if [ "$processados" -gt 0 ]; then
+    rm -f "$NOTIF_VAZIA_FILE" 2>/dev/null || true
+    return 0
+  fi
+  [ "$motivo" = "$MOTIVO_FILA_VAZIA" ] || return 1
+  if [ -e "$NOTIF_VAZIA_FILE" ]; then return 1; fi
+  mkdir -p "$RUNS_BASE" 2>/dev/null || true
+  : > "$NOTIF_VAZIA_FILE" 2>/dev/null || true
+  return 0
+}
+
 # notificar_fim <aprovados> <bloqueados> <adiados> <dur_min>
 notificar_fim() {
   local ap="${1:-0}" bl="${2:-0}" ad="${3:-0}" dur="${4:-0}" titulo corpo ultimo canal
diff --git a/scripts/orquestrador/local-loop.sh b/scripts/orquestrador/local-loop.sh
index d3c7fdb..18cf08d 100755
--- a/scripts/orquestrador/local-loop.sh
+++ b/scripts/orquestrador/local-loop.sh
@@ -118,8 +118,13 @@ run_executor_once() {
 # --- DRENAGEM ----------------------------------------------------------------
 drenar() {
   local stwt drenados=0 bloqueados=0 adiados=0 refatiados=0 prox prox_id st t0 dur orc motivo_ocioso=''
+  local mortos_antes mortos processados
   stwt="$(ensure_staging_worktree)"
   t0="$(date +%s)"
+  # EXECUTOR_MORREU conta como ticket PROCESSADO (peça 13), e a drenagem não tem
+  # como sabê-lo pelo rc: o executor morre num processo filho e o registro dele é
+  # a trilha. Conta antes, conta depois — a diferença é o que morreu AQUI.
+  mortos_antes="$(contar_eventos EXECUTOR_MORREU)"
   say "drenagem iniciando (alvo=$BRANCH_ALVO, worktree=$stwt)"
   event '---' DRENAGEM_INICIO "alvo=$BRANCH_ALVO" "processaveis=$(pendentes_processaveis)"
   status_set "estado=executando" "fase=drenagem" "ticket=—" "motivo="
@@ -136,7 +141,7 @@ drenar() {
     prox="$(proximo_pendente)"
     [ -n "$prox" ] || {
       say "fila sem ticket processável — encerrando (aprovados: $drenados)"
-      motivo_ocioso='sem ticket processável'; break
+      motivo_ocioso="$MOTIVO_FILA_VAZIA"; break
     }
     prox_id="$(ticket_field "$prox" '.id')"
 
@@ -200,7 +205,17 @@ drenar() {
   event '---' DRENAGEM_FIM "aprovados=$drenados" "bloqueados=$bloqueados" "adiados=$adiados" \
     "refatiar=$refatiados" "dur=${dur}min"
   status_set "estado=ocioso" "fase=—" "ticket=—" "motivo=${motivo_ocioso:-drenagem encerrada}"
-  notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
+
+  # PEÇA 13: notifica só quando houve o que notificar. A decisão (e a memória do
+  # "fila vazia já avisada") mora no lib.sh; aqui só se conta o que aconteceu.
+  mortos=$(( $(contar_eventos EXECUTOR_MORREU) - mortos_antes ))
+  [ "$mortos" -ge 0 ] || mortos=0
+  processados=$(( drenados + bloqueados + adiados + refatiados + mortos ))
+  if deve_notificar "$processados" "$motivo_ocioso"; then
+    notificar_fim "$drenados" "$bloqueados" "$adiados" "$dur"
+  else
+    say "notificação: nada a notificar (0 processados, motivo '${motivo_ocioso:-—}') — silêncio"
+  fi
 }
 
 cleanup_frente() {
diff --git a/test/orquestrador-notificacao.test.ts b/test/orquestrador-notificacao.test.ts
index f044865..4eb7761 100644
--- a/test/orquestrador-notificacao.test.ts
+++ b/test/orquestrador-notificacao.test.ts
@@ -154,8 +154,198 @@ describe('o canal é decisão de config', () => {
 });
 
 describe('a drenagem chama a notificação no fim', () => {
-  it('notificar_fim é chamado logo depois do DRENAGEM_FIM', () => {
+  it('notificar_fim é chamado depois do DRENAGEM_FIM, e SOB o gate da peça 13', () => {
     const loop = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh'), 'utf8');
-    expect(loop).toMatch(/DRENAGEM_FIM[\s\S]{0,300}?notificar_fim "\$drenados" "\$bloqueados" "\$adiados" "\$dur"/);
+    expect(loop).toMatch(
+      /DRENAGEM_FIM[\s\S]*?if deve_notificar "\$processados" "\$motivo_ocioso"; then\n\s*notificar_fim "\$drenados" "\$bloqueados" "\$adiados" "\$dur"/,
+    );
+  });
+});
+
+// ─── PEÇA 13: notificação só quando houve o que notificar ─────────────────
+//
+// O defeito que esta seção paga: em 07/09 11:0x o launchd cuspiu um cartão
+// "0 aprovados · duração 0min · último —" a CADA tick enquanto o 240 rodava. A
+// drenagem não achava processável, encerrava em 0 e notificava assim mesmo.
+// Notificação que chega quando nada aconteceu treina o operador a ignorar a
+// notificação que importa.
+//
+// A regra (PECAS.md, peça 13) tem duas metades: processou ≥1 ticket notifica
+// sempre; fila sem processável notifica só na PRIMEIRA vez desde a última
+// drenagem que processou. Lock em uso e "já há drenagem em curso" nunca.
+
+const LOOP_SH = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
+const runsDir = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);
+
+/** Linhas do notificacoes.log (vazio = arquivo ausente). */
+function linhasNotificadas(raiz: string): string[] {
+  const t = ler(notif(raiz)).trim();
+  return t ? t.split('\n') : [];
+}
+
+/**
+ * Roda drenar() de verdade no fixture, com o que depende de git substituído.
+ * `stubExecutor` é o corpo de run_executor_once — $2 é o arquivo do ticket.
+ */
+function drenarComStub(raiz: string, stubExecutor = 'return 0'): { rc: number; saida: string } {
+  const r = spawnSync(
+    'bash',
+    [
+      '-c',
+      [
+        'export LOCAL_LOOP_SOURCED=1',
+        `source "${LOOP_SH}"`,
+        'set +e',
+        'ensure_staging_worktree() { echo "/tmp"; }',
+        'ticket_commit() { return 0; }',
+        'cleanup_frente() { return 0; }',
+        'merge_em_alvo() { return 0; }',
+        `run_executor_once() { ${stubExecutor}; }`,
+        'drenar',
+      ].join('\n'),
+    ],
+    { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
+  );
+  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
+}
+
+/** deve_notificar isolada: rc 0 = notifica. */
+function deveNotificar(raiz: string, processados: number, motivo: string): number {
+  return bashNoFixture(raiz, `deve_notificar ${processados} "${motivo}"; echo "RC=$?"`).stdout.includes('RC=0') ? 0 : 1;
+}
+
+const SO_DONE = [{ id: '901', slug: 'ja-foi', status: 'done' }];
+const UM_PENDENTE = [{ id: '901', slug: 'da-vez', status: 'pendente' }];
+
+describe('fila sem processável: avisa uma vez, e só uma', () => {
+  it('a PRIMEIRA drenagem vazia escreve exatamente uma linha', () => {
+    const raiz = criarFixture(SO_DONE);
+    drenarComStub(raiz);
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+  });
+
+  it('a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd)', () => {
+    const raiz = criarFixture(SO_DONE);
+    drenarComStub(raiz);
+    const r = drenarComStub(raiz);
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+    expect(r.saida).toMatch(/nada a notificar/);
+  });
+
+  it('dez ticks seguidos com a fila vazia continuam valendo uma linha só', () => {
+    const raiz = criarFixture(SO_DONE);
+    for (let i = 0; i < 10; i++) drenarComStub(raiz);
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+  });
+
+  it('processar de novo REARMA o aviso de fila vazia', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    drenarComStub(raiz, 'ticket_set_status "$2" aguardando_merge; return 0'); // aprovado + fila esvazia
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+    drenarComStub(raiz); // fila vazia, mas a memória foi zerada: avisa
+    expect(linhasNotificadas(raiz)).toHaveLength(2);
+    drenarComStub(raiz); // e a repetição volta a calar
+    expect(linhasNotificadas(raiz)).toHaveLength(2);
+  });
+});
+
+describe('drenagem que PROCESSOU notifica, com o placar', () => {
+  it('aprovado: uma linha, placar 1 aprovado', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    drenarComStub(raiz, 'ticket_set_status "$2" aguardando_merge; return 0');
+    const linhas = linhasNotificadas(raiz);
+    expect(linhas).toHaveLength(1);
+    expect(linhas[0]).toContain('Orquestrador CI: 1 aprovados, 0 bloqueados');
+  });
+
+  it('bloqueado: uma linha, placar 1 bloqueado', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    drenarComStub(raiz, 'ticket_set_status "$2" bloqueado; return 0');
+    const linhas = linhasNotificadas(raiz);
+    expect(linhas).toHaveLength(1);
+    expect(linhas[0]).toContain('Orquestrador CI: 0 aprovados, 1 bloqueados');
+  });
+
+  it('adiado por orçamento: uma linha, corpo com adiados 1', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    escrever(
+      join(raiz, 'docs', 'fila', 'runs', 'custo.json'),
+      JSON.stringify({
+        dias: {
+          [new Date().toISOString().slice(0, 10)]: [
+            { papel: 'executor', ticket: '901', custo_usd: 999, tokens_in: 1, tokens_out: 1 },
+          ],
+        },
+      }),
+    );
+    const r = drenarComStub(raiz);
+    expect(r.saida).toMatch(/teto diário atingido/);
+    const linhas = linhasNotificadas(raiz);
+    expect(linhas).toHaveLength(1);
+    expect(linhas[0]).toContain('adiados 1');
+  });
+
+  it('EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    const r = drenarComStub(
+      raiz,
+      'event "$(ticket_field "$2" ".id")" EXECUTOR_MORREU "rc=143" "fase=gates" "sinal=TERM"; return 143',
+    );
+    expect(r.saida).not.toMatch(/nada a notificar/);
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+    expect(ler(runsDir(raiz, 'events.log'))).toMatch(/EXECUTOR_MORREU rc=143/);
+  });
+
+  it('EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho)', () => {
+    const raiz = criarFixture(SO_DONE);
+    bashNoFixture(raiz, 'event 900 EXECUTOR_MORREU "rc=143" "fase=gates"');
+    drenarComStub(raiz); // fila vazia: avisa uma vez pela regra da fila vazia
+    const r = drenarComStub(raiz); // segunda vez: a morte velha não pode rearmar
+    expect(r.saida).toMatch(/nada a notificar/);
+    expect(linhasNotificadas(raiz)).toHaveLength(1);
+  });
+});
+
+describe('saída sem drenagem NUNCA notifica', () => {
+  it('lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log', () => {
+    const raiz = criarFixture(UM_PENDENTE);
+    escrever(runsDir(raiz, '.local-loop.lock'), `${process.pid}\n${Math.floor(Date.now() / 1000)}\n`);
+    const r = spawnSync('bash', [LOOP_SH], {
+      encoding: 'utf8',
+      cwd: raiz,
+      env: { ...process.env, ORQ_EXEC_ROOT: raiz },
+    });
+    expect(r.status).toBe(0);
+    expect(ler(runsDir(raiz, 'local-loop.log'))).toMatch(/outro run vivo/);
+    expect(linhasNotificadas(raiz)).toHaveLength(0);
+  });
+
+  it('"já há drenagem em curso" (peça 11) devolve em-curso sem chamar notificar_fim', () => {
+    const wrapper = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh'), 'utf8');
+    expect(wrapper).not.toMatch(/notificar_fim/);
+    expect(wrapper).toMatch(/em-curso\)[\s\S]{0,400}?return 0/);
+  });
+});
+
+describe('deve_notificar: a regra, isolada', () => {
+  it('processou ≥ 1: notifica, qualquer que seja o motivo do fim', () => {
+    const raiz = criarFixture(SO_DONE);
+    expect(deveNotificar(raiz, 1, 'sem ticket processável')).toBe(0);
+    expect(deveNotificar(raiz, 3, 'orcamento')).toBe(0);
+    expect(deveNotificar(raiz, 1, 'pausado')).toBe(0);
+  });
+
+  it('zero processados por pausa, cooldown ou sem progresso: cala sempre', () => {
+    const raiz = criarFixture(SO_DONE);
+    expect(deveNotificar(raiz, 0, 'pausado')).toBe(1);
+    expect(deveNotificar(raiz, 0, 'cooldown ~12min')).toBe(1);
+    expect(deveNotificar(raiz, 0, 'sem progresso em 901')).toBe(1);
+  });
+
+  it('o motivo de fila vazia é a MESMA constante que o loop grava', () => {
+    const loop = readFileSync(LOOP_SH, 'utf8');
+    expect(loop).toContain('motivo_ocioso="$MOTIVO_FILA_VAZIA"');
+    const raiz = criarFixture(SO_DONE);
+    expect(bashNoFixture(raiz, 'printf "M=%s\\n" "$MOTIVO_FILA_VAZIA"').stdout).toContain('M=sem ticket processável');
   });
 });
```

### `9edbf65` — 1: gate de ticket (gate-ticket.ts + orq validar)

```diff
diff --git a/docs/orquestrador/PLAYBOOK.md b/docs/orquestrador/PLAYBOOK.md
index 3b173b1..f94c2b8 100644
--- a/docs/orquestrador/PLAYBOOK.md
+++ b/docs/orquestrador/PLAYBOOK.md
@@ -166,6 +166,87 @@
   - **`EXECUTOR_MORREU` não chega pelo rc.** O executor morre num processo FILHO, e do lado da drenagem `rc != 0` é indistinguível de reprovação mecânica. O registro dessa morte é a trilha (peça 12), então a drenagem conta `EXECUTOR_MORREU` no `events.log` ANTES do laço e DEPOIS dele, e a diferença é o que morreu naquele trecho — morte velha não rearma nada. Contar pelo total do arquivo faria toda drenagem posterior a uma morte parecer produtiva para sempre.
   - **`motivo_ocioso` virou constante compartilhada.** A decisão de notificar compara com a frase `sem ticket processável`, que antes existia solta no `local-loop.sh`. Frase repetida em dois arquivos é dois arquivos que divergem no dia em que alguém a reescreve — `MOTIVO_FILA_VAZIA` mora no `lib.sh` e os dois lados leem a mesma variável.
   - **Refatiar conta como processado, e o PECAS não o listava.** A peça enumera "aprovado, bloqueado, adiado ou `EXECUTOR_MORREU`"; `refatiar` (regra 19) é desfecho de executor que RODOU e gastou dinheiro. Calar sobre ele seria o defeito espelhado — silêncio quando algo aconteceu — então entra na conta, e fica registrado aqui que a lista do PECAS era menor que a realidade.
+  - **Peça 1 · gate de ticket (`scripts/orquestrador/gate-ticket.ts` + `orq validar`).** O item **8.9** do pré-voo é NO-GO desde 2026-09-03 (`PLAYBOOK.md:85`), e enquanto for, o teste vermelho de cada ticket é conferido À MÃO — foi assim o lote 8 inteiro. Esta peça paga a metade barata e determinística dos passos 1-6 de `autoalimentacao.md` §2: bloco ```json parseável, campos obrigatórios do pendente, `id` no formato `NNN[a]` e igual ao prefixo do arquivo, `status` no vocabulário, `tipo`/`cmd`/`espera` de cada critério, padrões proibidos no `cmd`, dependência por id existente ou `humano:<token>`, e allowlist sobreposta entre pendentes sem dependência declarada. Saída: uma linha por violação, `<arquivo>:<campo> <mensagem>`, rc 1 se houve; `--relatorio` imprime tudo e sai 0.
+  - **Fica de fora POR DECISÃO, e vira peça 1b:** rodar `alvo` contra HEAD para ver se já passa, rodar `guarda` para ver se já falha, e execução de `recon[]`. Tudo que EXECUTA comando escrito por modelo é outra peça e outra classe de risco — e é justamente a parte que o §2 cerca com worktree descartável, timeout e env de teste. Um gate que só LÊ pode rodar em qualquer lugar, inclusive nesta sessão, contra a fila real, sem consequência.
+  - **A chave do config é `proibido_no_cmd`, e não `padroes_proibidos`.** O briefing da sessão nomeava `gate_ticket.padroes_proibidos`; `grep` no repo inteiro não acha essa chave em lugar nenhum. O que existe desde a Etapa 1 é `gate_ticket.proibido_no_cmd`, já semeada com exatamente os padrões que o §2 nomeia. Nome de chave é para conferir no disco, nunca lembrar — a regra existe no briefing e foi ela que pegou este caso.
+  - **A precedência entre prefixo permitido e padrão proibido virou regra escrita** (decisão do dono, 07/09, registrada em `autoalimentacao.md` §2). O config já anotava o conflito em `_conflito_conhecido` e nunca o resolvia: `proibido_no_cmd` veta `$(`, mas `test $(` está em `cmd_prefixos_permitidos` porque critérios reais usam a forma. Agora: (a) a isenção vale só para o PRIMEIRO segmento — emendou `&&` ou `|`, o veto volta a valer nos seguintes; (b) redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`, e `>`/`>>` para arquivo real reprova sempre; (c) `sh -c`, `bash`, `eval`, `sudo`, `rm`, `curl`, `wget` e crase nunca são isentos; (d) a isenção APARECE na saída, com o prefixo que a concedeu.
+  - **Isenção silenciosa é como o repo perde a regra de vista.** É por isso que (d) não é enfeite de relatório: as 25 isenções abaixo são 25 lugares onde o gate escolheu não reprovar, e cada uma está nomeada com o prefixo que a autorizou. Regra que se aplica sem deixar rastro vira, dois meses depois, comportamento que ninguém sabe explicar.
+  - **`dependencias: []` e `risco: ""` NÃO são campo vazio.** A primeira versão do check 2 reprovava os dois, e os 7 pendentes inteiros caíram por isso. Ticket independente é a coisa certa a ser — 63 dos 74 têm `dependencias: []` —, e `risco` é preenchido pelo **passo 6** do gate, que fica fora desta peça: cobrar valor ali seria o gate reprovando ticket por não ter feito o que o próprio gate ainda não faz. Os dois passaram a exigir só que a CHAVE exista.
+  - **A leitura do `cmd` reaproveita a lição da peça 0e-b.** Segmentar por `|`/`&&`/`;` sem olhar aspas quebraria todo `grep -E 'a|b'`, e procurar token por substring faria `grep 'form '` virar o comando `rm`. Então: as aspas são mascaradas por espaço (comprimento preservado, para que índice medido no visível ainda aponte o cru), `$(…)` não é ponto de corte, e token de palavra casa por fronteira, não por `includes`.
+  - **Evidência: `bash scripts/orq validar --pendentes --relatorio` contra os 7 pendentes reais, 2026-09-07.** **33 violações e 25 isenções.** Nenhum ticket foi corrigido nesta sessão — corrigir fila é sessão de fila. O padrão é um só e se repete: `test -f <arquivo> && test $(grep -c ...) -ge N && echo ok`, em que o `$(` cai no SEGUNDO segmento e perde a isenção. Saída inteira:
+
+```
+GATE DE TICKET · 7 ticket(s) · fila /Users/lucasantos/Projetos/conteudos-infinitos/docs/fila
+
+231-formulario-de-persona-guiado.md  3 violação(ões)
+  231-formulario-de-persona-guiado.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8') — cmd: test -f apps/web/test/personas-form-guiado.test.tsx && test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1') — cmd: test -f apps/web/src/server/nichos-read.ts && test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE 'export function MultiEscolha' apps/web/src/components/fields.tsx) -eq 1 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(MultiEscolha|FAIXAS_RENDA|TONS_DE_VOZ)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 4 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(nicho_id|Outros)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 3 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarNichos' apps/web/src/app/personas/page.tsx) -ge 1 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[7] padrão proibido '$(' em segmento 2 ('test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1') — cmd: test -f apps/web/test/personas-form-guiado.test.tsx && test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1 && echo ok
+  231-formulario-de-persona-guiado.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export (function|const) (campoBase|LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -ge 9 && echo ok
+232-nome-do-nicho-na-listagem-e-na-edicao.md  2 violação(ões)
+  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-nicho-nome.test.tsx) -ge 7') — cmd: test -f apps/web/test/personas-nicho-nome.test.tsx && test $(grep -c 'it(' apps/web/test/personas-nicho-nome.test.tsx) -ge 7 && echo ok
+  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export function rotuloNicho' apps/web/src/lib/nicho-exibicao.ts) -eq 1') — cmd: test -f apps/web/src/lib/nicho-exibicao.ts && test $(grep -cE 'export function rotuloNicho' apps/web/src/lib/nicho-exibicao.ts) -eq 1 && echo ok
+  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -o 'rotuloNicho' apps/web/src/app/personas/page.tsx | wc -l) -ge 4 && echo ok
+  232-nome-do-nicho-na-listagem-e-na-edicao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'rotuloNicho' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
+235-servidor-de-sugestoes-por-nicho.md  6 violação(ões)
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9') — cmd: test -f apps/web/test/sugestoes.test.ts && test $(grep -c 'it(' apps/web/test/sugestoes.test.ts) -ge 9 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -cE 'export async function (listarSugestoes|registrarUsoSugestao)' apps/web/src/server/sugestoes.ts) -eq 2 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -c 'sugestoes_persona' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[4] padrão proibido '$(' em segmento 2 ('test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1') — cmd: test -f apps/web/src/server/sugestoes.ts && test $(grep -c 'resolverOrgAtual' apps/web/src/server/sugestoes.ts) -ge 1 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE '(sugestao_usada|marcarSugestaoUsada)' apps/web/src/server/funil.ts | wc -l) -ge 3 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2') — cmd: test -f apps/web/src/server/sugestoes-types.ts && test $(grep -cE "export type TipoSugestao|export interface Sugestao" apps/web/src/server/sugestoes-types.ts) -ge 2 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function marcar(OnboardingIniciado|ClienteCriado|AnguloCriado|PrimeiroRoteiro)' apps/web/src/server/funil.ts | wc -l) -eq 4 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
+  235-servidor-de-sugestoes-por-nicho.md:criterios_aceite[11] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4') — cmd: test $(grep -c 'it(' apps/web/test/funil-eventos.test.ts) -ge 3 && test $(grep -c 'expect(' apps/web/test/funil-eventos.test.ts) -ge 4 && echo ok
+236-chips-de-sugestao-no-formulario-de-persona.md  2 violação(ões)
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/personas-chips-sugestao.test.tsx) -ge 9') — cmd: test -f apps/web/test/personas-chips-sugestao.test.tsx && test $(grep -c 'it(' apps/web/test/personas-chips-sugestao.test.tsx) -ge 9 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE '^export function ChipsSugestao' apps/web/src/components/fields.tsx) -eq 1 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[3] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes\?:|aoUsarSugestao\?:' apps/web/src/components/fields.tsx | wc -l) -ge 2 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'listarSugestoes' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[5] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'registrarUsoSugestao' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'sugestoes=' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 2 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export function (LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -eq 8 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/personas-form.test.tsx) -ge 2 && test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12 && echo ok
+  236-chips-de-sugestao-no-formulario-de-persona.md:criterios_aceite[10] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12') — cmd: test $(grep -c 'it(' apps/web/test/personas-form.test.tsx) -ge 2 && test $(grep -c 'expect(' apps/web/test/personas-form.test.tsx) -ge 12 && echo ok
+242-leitura-e-decisao-por-token.md  7 violação(ões)
+  242-leitura-e-decisao-por-token.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10') — cmd: test -f apps/web/test/aprovacoes-publico.test.ts && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -cE 'export async function (lerRoteiroPorToken|decidirPorToken)' apps/web/src/server/aprovacoes-publico.ts) -eq 2 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -c 'createSupabaseClientFromEnv' apps/web/src/server/aprovacoes-publico.ts) -ge 1 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[4] padrão proibido '$(' em segmento 2 ('test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -oE "eq[(]'token'" apps/web/src/server/aprovacoes-publico.ts | wc -l) -ge 1 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3') — cmd: test -f apps/web/src/server/aprovacoes-types.ts && test $(grep -oE 'export interface RoteiroParaCliente|export type DecisaoCliente|export interface ResultadoDecisao' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 3 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[9] padrão proibido '$(' em segmento 2 ('test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1') — cmd: test -f apps/web/src/server/aprovacoes-publico.ts && test $(grep -c '[.]update[(]' apps/web/src/server/aprovacoes-publico.ts) -le 1 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'export interface (PacoteEntrega|LegendaPersistida|ResultadoPersistencia|LinkAprovacao|ResultadoLink)' apps/web/src/server/aprovacoes-types.ts | wc -l) -eq 5 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[12] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 7 && test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok
+  242-leitura-e-decisao-por-token.md:criterios_aceite[12] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-pacote.test.ts) -ge 7 && test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && echo ok
+243-rota-e-tela-publica-de-aprovacao.md  6 violação(ões)
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6') — cmd: test -f apps/web/test/aprovar-publico.test.tsx && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2') — cmd: test -f apps/web/test/aprovar-publico.test.tsx && test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "'/aprovar'" apps/web/src/lib/auth/routes.ts) -eq 1 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'lerRoteiroPorToken|notFound' 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3') — cmd: test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && test $(grep -oE 'lerRoteiroPorToken|notFound' 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -c 'decidirPorToken' 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1') — cmd: test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && test $(grep -c 'decidirPorToken' 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[7] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "/aprovar|/aprovacoes" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'/[a-z-]+'" apps/web/src/lib/auth/routes.ts | wc -l) -eq 5 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40') — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok
+  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 2 ('test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16') — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok
+244-fila-interna-de-aprovacao.md  7 violação(ões)
+  244-fila-interna-de-aprovacao.md:criterios_aceite[1] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9') — cmd: test -f apps/web/test/aprovacoes-fila.test.tsx && test $(grep -c 'it(' apps/web/test/aprovacoes-fila.test.tsx) -ge 9 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[2] padrão proibido '$(' em segmento 2 ('test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -cE 'export async function listarFilaDeAprovacao' apps/web/src/server/aprovacoes-read.ts) -eq 1 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[3] padrão proibido '$(' em segmento 2 ('test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -oE "'(sem_link|aguardando|aprovado|ajuste_pedido|revogado|expirado)'" apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 6 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[5] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2') — cmd: test -f apps/web/src/app/aprovacoes/page.tsx && test $(grep -oE 'gerarLinkAprovacao|revogarLinkAprovacao' apps/web/src/app/aprovacoes/page.tsx | wc -l) -ge 2 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[6] padrão proibido '$(' em segmento 2 ('test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2') — cmd: test -f apps/web/src/server/aprovacoes-read.ts && test $(grep -oE 'roteiro_aprovacoes|roteiros' apps/web/src/server/aprovacoes-read.ts | wc -l) -ge 2 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 2 ('test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
+  244-fila-interna-de-aprovacao.md:criterios_aceite[13] padrão proibido '$(' em segmento 3 ('test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6') — cmd: test $(grep -c 'it(' apps/web/test/aprovacoes-link.test.ts) -ge 8 && test $(grep -c 'it(' apps/web/test/aprovacoes-publico.test.ts) -ge 10 && test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
+
+TOTAL: 33 violação(ões), 25 isenção(ões), em 7 ticket(s)
+```
+
 
 ## Etapa 3, sessão B — fila de trabalho
 
diff --git a/docs/orquestrador/skill/references/autoalimentacao.md b/docs/orquestrador/skill/references/autoalimentacao.md
index e27dd73..1b4bd75 100644
--- a/docs/orquestrador/skill/references/autoalimentacao.md
+++ b/docs/orquestrador/skill/references/autoalimentacao.md
@@ -54,6 +54,24 @@ Roda para todo `candidato`. Tickets `origem: humano` passam pelos passos 1 a 6 n
 
 **Segurança do passo 3 (executa comando escrito por modelo):** o `cmd` é quebrado em segmentos por `|`, `&&` e `;`. O **primeiro** segmento precisa começar com um item de `gate_ticket.cmd_prefixos_permitidos` (prefixos explícitos: `npm run test`, nunca `npm run` genérico, que alcançaria `npm run deploy`); os demais precisam ser filtros de `gate_ticket.filtros_permitidos` (`grep`, `wc`, `head`, `tail`, `jq`, `cut`, `sort`, `uniq`, `tr`). Qualquer token de `gate_ticket.proibido_no_cmd` (`$(`, crase, `>` que não seja `2>&1`, `sh -c`, `bash`, `eval`, `sudo`, `rm `, `curl` para host que não seja localhost) ⇒ `invalido`. Referência a qualquer path de `paths_harness` ⇒ `invalido`. Roda em worktree descartável, sem `.env` de produção, com timeout, e o worktree é removido depois. Critério HTTP (`curl localhost`) só é permitido se `gate_ticket.servidor_local_cmd` existir: o harness sobe o servidor na worktree com env de teste antes de rodar e derruba depois; sem isso, remova os prefixos `curl` da lista. Critério `alvo` deve rodar em menos de `timeout_cmd_secs`: suíte inteira é gate do harness, não critério de ticket. Tudo isso vale igualmente para o executor ao rodar critérios (passo 5 do pipeline).
 
+**PRECEDÊNCIA entre `cmd_prefixos_permitidos` e `proibido_no_cmd` (decisão humana, 2026-09-07).** O
+config já anotava o conflito em `_conflito_conhecido`: `proibido_no_cmd` veta `$(`, `> ` e `>>`, e
+critérios REAIS da fila usam os três — por isso `test $(` está em `cmd_prefixos_permitidos`. A regra,
+implementada em `scripts/orquestrador/gate-ticket.ts`:
+
+- **(a)** a isenção por prefixo vale só para o **primeiro segmento** do `cmd`. Emendou `&&`, `|` ou
+  `;`, cada segmento é avaliado por conta própria e o veto **volta a valer nos seguintes** — prefixo
+  permitido autoriza UM comando, não tudo que vier pendurado nele;
+- **(b)** redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`. Qualquer `>` ou `>>`
+  para arquivo real **reprova sempre**, inclusive dentro de prefixo permitido: critério de aceite que
+  escreve arquivo deixou de ser medição e virou efeito colateral;
+- **(c)** `sh -c`, `bash`, `eval`, `sudo`, `rm`, `curl`, `wget` e crase **nunca** são isentos, em
+  segmento nenhum;
+- **(d)** o relatório do gate lista, por ticket, quais critérios passaram por isenção e por qual
+  prefixo. **Isenção silenciosa é como o repo perde a regra de vista.**
+
+O nome da chave é `gate_ticket.proibido_no_cmd`, e só ele: não existe `padroes_proibidos` no config.
+
 Custo do gate: passos 1 a 5 são script (zero token). Passo 6 é barato e raro. Passo 7 é o único caro e só existe para candidato de máquina.
 
 ## 3. Planejador
diff --git a/scripts/orq b/scripts/orq
index 47d3d7e..eb88275 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -19,6 +19,7 @@
 #   orq decisoes         decisões pendentes para humano
 #   orq mapa lint        lint MAPA.md × mapa.json
 #   orq mapa status      placar por frente
+#   orq validar [ids]    gate de ticket nos tickets dados (ou --pendentes)
 #   orq pausar [motivo]  cria o pausar_file (a drenagem para ENTRE tickets)
 #   orq retomar          remove o pausar_file
 
@@ -240,6 +241,19 @@ cmd_mapa() {
   esac
 }
 
+# --- orq validar [ids | --pendentes] ------------------------------------------
+# Gate de ticket (peça 1). READ-ONLY como todo o resto do `orq`: o gate só LÊ os
+# .md da fila e o config. Repassa o rc do gate — 1 com violação, 0 sem —, porque
+# é isso que um gate serve para fazer; `--relatorio` sai 0 sempre e é o modo que
+# a migração dos outros repos usa para ver o tamanho do estrago antes de agir.
+cmd_validar() {
+  # cd na RAIZ DO PRÓPRIO SCRIPT, não no MAIN_CHECKOUT: o `npx` precisa achar o
+  # node_modules, e o checkout pode ser um fixture de teste sem node_modules
+  # nenhum — ali o `npx` tentaria BAIXAR o tsx. O gate não lê nada por caminho
+  # relativo: o .ts e o --fila vão absolutos.
+  ( cd "$ORQ_DIR/.." && npx tsx "$ORQ_DIR/orquestrador/gate-ticket.ts" --fila "$FILA_DIR" "$@" )
+}
+
 # --- orq pausar / retomar (os ÚNICOS que escrevem) ----------------------------
 # Kill switch em ARQUIVO (regra 12). NÃO mata processo: a drenagem lê o arquivo
 # ENTRE tickets e encerra em ocioso. Matar o processo garante ticket órfão.
@@ -267,6 +281,7 @@ case "${1:-}" in
   custo)      shift; cmd_custo "$@" ;;
   decisoes)   cmd_decisoes ;;
   mapa)       shift; cmd_mapa "$@" ;;
+  validar)    shift; cmd_validar "$@" ;;
   pausar)     shift; cmd_pausar "$@" ;;
   retomar)    cmd_retomar ;;
   -h|--help|ajuda) awk '/^# Uso:/,/^$/ { sub(/^# ?/, ""); print }' "$0" ;;
diff --git a/scripts/orquestrador/gate-ticket.ts b/scripts/orquestrador/gate-ticket.ts
new file mode 100644
index 0000000..975b97c
--- /dev/null
+++ b/scripts/orquestrador/gate-ticket.ts
@@ -0,0 +1,551 @@
+/**
+ * gate-ticket.ts — o gate de ticket (peça 1), passos 1-6 de
+ * `skill/references/autoalimentacao.md` §2 na parte que é SCRIPT e custa zero
+ * token.
+ *
+ * Existe porque o item **8.9** do pré-voo segue NO-GO desde 2026-09-03
+ * (`PLAYBOOK.md:85`): enquanto for, o teste vermelho de cada ticket é conferido
+ * À MÃO, como foi em todo o lote 8. Este arquivo não fecha o 8.9 sozinho — ele
+ * paga a metade barata e determinística: schema, identidade, critérios,
+ * segurança do `cmd`, dependências e sobreposição de allowlist.
+ *
+ * FICA DE FORA, POR DECISÃO (vira peça 1b): rodar `alvo` contra HEAD para ver
+ * se já passa, rodar `guarda` para ver se já falha, e execução de `recon[]`.
+ * Tudo que EXECUTA comando de ticket é outra peça — e outra classe de risco.
+ *
+ * Contrato de saída, que é o que `orq validar` e a migração dos outros repos
+ * consomem:
+ *   - uma linha por violação, `<arquivo>:<campo> <mensagem>`;
+ *   - rc 1 se houve violação, 0 se não;
+ *   - `--relatorio` imprime TUDO (inclusive o que passou) e sai 0.
+ */
+import { readFileSync, readdirSync, existsSync } from 'node:fs'
+import { basename, join, resolve } from 'node:path'
+import { pathToFileURL } from 'node:url'
+
+// ─── Vocabulário do ticket ────────────────────────────────────────────────
+
+/** Os únicos status que a fila conhece. Qualquer outro é erro de escrita. */
+export const STATUS_VALIDOS = [
+  'pendente',
+  'em_execucao',
+  'done',
+  'bloqueado',
+  'obsoleto',
+  'refatiar',
+] as const
+
+/**
+ * Status TERMINAIS: o ticket já saiu do caminho de execução, e para eles
+ * "basta parsear". Cobrar campo obrigatório de ticket `done` seria cobrar de
+ * quem já entregou — e a fila tem 63 deles, escritos sob schemas anteriores.
+ */
+export const STATUS_TERMINAIS = ['done', 'obsoleto', 'bloqueado'] as const
+
+/** Campos que um ticket `pendente` PRECISA ter para o executor poder lê-lo. */
+export const CAMPOS_PENDENTE = [
+  'id',
+  'slug',
+  'bloco',
+  'objetivo',
+  'pathspec_allowlist',
+  'dependencias',
+  'criterios_aceite',
+  'status',
+  'risco',
+] as const
+
+export const TIPOS_CRITERIO = ['alvo', 'guarda', 'avaliador'] as const
+
+/** `231`, `001a`. Três dígitos, sufixo de letra opcional para o ticket enxertado. */
+export const RE_ID = /^\d{3}[a-z]?$/
+
+// ─── Resultado ────────────────────────────────────────────────────────────
+
+export interface Violacao {
+  arquivo: string
+  campo: string
+  mensagem: string
+  /** Isenção NÃO é violação: entra na saída para ser vista, mas não muda o rc. */
+  isencao?: boolean
+}
+
+export interface GateCfg {
+  proibido_no_cmd: string[]
+  cmd_prefixos_permitidos: string[]
+}
+
+/** O ticket como ele chega do disco: sem promessa nenhuma sobre os campos. */
+type Cru = Record<string, unknown>
+
+export interface TicketLido {
+  arquivo: string
+  /** `null` = o bloco ```json não existe ou não parseia (check 1). */
+  json: Cru | null
+}
+
+// ─── Check 1: o bloco ```json ─────────────────────────────────────────────
+
+/**
+ * Mesma extração do `fila-read.ts`, repetida de propósito: aqui a AUSÊNCIA e o
+ * JSON quebrado são resultados distintos (o `fila-read` devolve `null` para os
+ * dois e segue), e é exatamente essa distinção que o check 1 reporta.
+ */
+export function blocoJson(md: string): { ok: true; json: Cru } | { ok: false; motivo: string } {
+  const linhas = md.split('\n')
+  let dentro = false
+  const buf: string[] = []
+  for (const linha of linhas) {
+    if (!dentro && linha.trim() === '```json') {
+      dentro = true
+      continue
+    }
+    if (dentro && linha.trim() === '```') break
+    if (dentro) buf.push(linha)
+  }
+  if (!dentro) return { ok: false, motivo: 'nenhum bloco ```json no arquivo' }
+  if (buf.length === 0) return { ok: false, motivo: 'bloco ```json vazio' }
+  let parsed: unknown
+  try {
+    parsed = JSON.parse(buf.join('\n'))
+  } catch (e) {
+    return { ok: false, motivo: 'bloco ```json não parseia: ' + (e as Error).message }
+  }
+  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
+    return { ok: false, motivo: 'bloco ```json não é um objeto' }
+  }
+  return { ok: true, json: parsed as Cru }
+}
+
+// ─── Leitura do `cmd`: aspas, segmentos, redirecionamento ─────────────────
+
+/**
+ * Mascara o que está DENTRO de aspas por espaço, preservando o comprimento.
+ *
+ * É o que impede `grep 'rm '` de ser lido como o comando `rm`, e
+ * `grep -E 'a|b'` de ser quebrado em dois segmentos. A regra de escape é a do
+ * shell: dentro de aspas SIMPLES a barra invertida não escapa nada.
+ */
+export function mascararAspas(cmd: string): string {
+  const out = cmd.split('')
+  let aspas: string | null = null
+  for (let i = 0; i < cmd.length; i++) {
+    const c = cmd[i]!
+    if (aspas !== "'" && c === '\\') {
+      if (aspas) out[i] = ' '
+      if (i + 1 < cmd.length && aspas) out[i + 1] = ' '
+      i++
+      continue
+    }
+    if (aspas) {
+      out[i] = ' '
+      if (c === aspas) aspas = null
+      continue
+    }
+    if (c === "'" || c === '"') {
+      aspas = c
+      out[i] = ' '
+      continue
+    }
+  }
+  return out.join('')
+}
+
+/**
+ * Quebra o `cmd` em segmentos por `|`, `&&` e `;` — fora de aspas e fora de
+ * `$(…)`. Um `|` dentro de `$(…)` é do subcomando, e cortar nele produziria
+ * segmento com parêntese aberto (é a mesma lição da peça 0e-b, que consertou o
+ * `prefixoDeCmd` pela mesma razão).
+ *
+ * Devolve o texto CRU de cada segmento; quem for procurar token nele mascara as
+ * aspas por conta própria.
+ */
+export function segmentarCmd(cmd: string): string[] {
+  const segs: string[] = []
+  let inicio = 0
+  let aspas: string | null = null
+  let profundidade = 0
+  for (let i = 0; i < cmd.length; i++) {
+    const c = cmd[i]!
+    if (aspas !== "'" && c === '\\') {
+      i++
+      continue
+    }
+    if (aspas) {
+      if (c === aspas) aspas = null
+      continue
+    }
+    if (c === "'" || c === '"') {
+      aspas = c
+      continue
+    }
+    if (c === '(') {
+      profundidade++
+      continue
+    }
+    if (c === ')') {
+      if (profundidade > 0) profundidade--
+      continue
+    }
+    if (profundidade > 0) continue
+    // Quanto do operador consumir: `;` e `|` são um caractere, `&&` e `||` são
+    // dois. Consumir um só num `&&` deixaria o `&` sobrando no segmento seguinte.
+    let salto = 0
+    if (c === ';') salto = 1
+    else if (c === '&' && cmd[i + 1] === '&') salto = 2
+    else if (c === '|' && cmd[i + 1] === '|') salto = 2
+    else if (c === '|') salto = 1
+    if (salto > 0) {
+      segs.push(cmd.slice(inicio, i))
+      i += salto - 1
+      inicio = i + 1
+    }
+  }
+  segs.push(cmd.slice(inicio))
+  return segs.map((s) => s.trim()).filter((s) => s.length > 0)
+}
+
+/**
+ * Redirecionamentos INÓCUOS, e só eles: `2>&1`, `>/dev/null`, `2>/dev/null`.
+ * Qualquer `>` ou `>>` para arquivo real reprova SEMPRE — inclusive dentro de
+ * prefixo permitido. Critério de aceite que escreve arquivo deixou de ser
+ * medição e virou efeito colateral.
+ */
+const RE_REDIR = /(\d?)(>>?)\s*(&\d|[^\s;|&]*)/g
+
+export function redirecionamentosProibidos(segmentoVisivel: string): string[] {
+  const ruins: string[] = []
+  RE_REDIR.lastIndex = 0
+  let m: RegExpExecArray | null
+  while ((m = RE_REDIR.exec(segmentoVisivel)) !== null) {
+    const seta = m[2]!
+    const alvo = m[3] ?? ''
+    if (seta === '>' && (alvo === '/dev/null' || /^&\d$/.test(alvo))) continue
+    ruins.push(`${m[1] ?? ''}${seta}${alvo}`)
+  }
+  return ruins
+}
+
+// ─── Check 6: padrões proibidos no `cmd` ──────────────────────────────────
+
+/**
+ * PRECEDÊNCIA (decisão humana de 2026-09-07, registrada em
+ * `autoalimentacao.md` §2 e no PLAYBOOK). O config já anotava o conflito em
+ * `_conflito_conhecido`: `proibido_no_cmd` veta `$(`, mas `test $(` está em
+ * `cmd_prefixos_permitidos` porque critérios REAIS da fila usam a forma. As
+ * regras, na ordem:
+ *
+ *   (a) a isenção vale só para o PRIMEIRO segmento. Emendou `&&` ou `|`, o veto
+ *       volta a valer nos seguintes — prefixo permitido autoriza UM comando, não
+ *       tudo que vier pendurado nele;
+ *   (b) redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`;
+ *       `>`/`>>` para arquivo real reprova sempre, inclusive sob isenção;
+ *   (c) `sh -c`, `bash`, `eval`, `sudo`, `rm`, `curl`, `wget` e crase NUNCA são
+ *       isentos, em segmento nenhum;
+ *   (d) a isenção aparece na saída, com o prefixo que a concedeu. Isenção
+ *       silenciosa é como o repo perde a regra de vista.
+ */
+
+/** Os únicos padrões que a isenção por prefixo alcança. */
+const ISENTAVEIS = new Set(['$('])
+/** Tratados por regra própria (b), não por substring. */
+const REDIRECIONAMENTOS = new Set(['> ', '>>', '>'])
+
+/**
+ * `rm ` não pode casar `form `: token de palavra pede fronteira à esquerda.
+ * `$(` e crase não são palavras — casam por substring mesmo.
+ */
+function contemPadrao(visivel: string, padrao: string): boolean {
+  if (!/^[A-Za-z]/.test(padrao)) return visivel.includes(padrao)
+  const esc = padrao.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+  // Fronteira à direita por LOOKAHEAD, não por classe: `curl https` é seguido de
+  // `:`, e uma classe de separadores não o alcançaria — o padrão passaria batido.
+  return new RegExp(`(^|[\\s;|&(])${esc}(?![A-Za-z0-9_-])`).test(visivel)
+}
+
+export interface AchadoCmd {
+  mensagem: string
+  isencao?: boolean
+}
+
+export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
+  const achados: AchadoCmd[] = []
+  const segmentos = segmentarCmd(cmd)
+  const primeiro = segmentos[0] ?? ''
+  const prefixo = cfg.cmd_prefixos_permitidos.find((p) => primeiro.startsWith(p))
+
+  segmentos.forEach((seg, i) => {
+    const visivel = mascararAspas(seg)
+    const isentavel = i === 0 && prefixo !== undefined
+
+    for (const padrao of cfg.proibido_no_cmd) {
+      if (REDIRECIONAMENTOS.has(padrao)) continue // regra (b), abaixo
+      if (!contemPadrao(visivel, padrao)) continue
+      if (isentavel && ISENTAVEIS.has(padrao)) {
+        achados.push({
+          mensagem: `ISENCAO '${padrao}' no segmento 1 pelo prefixo permitido '${prefixo}' — cmd: ${cmd}`,
+          isencao: true,
+        })
+        continue
+      }
+      const onde = i === 0 ? 'segmento 1' : `segmento ${i + 1} ('${seg}')`
+      achados.push({ mensagem: `padrão proibido '${padrao}' em ${onde} — cmd: ${cmd}` })
+    }
+
+    for (const r of redirecionamentosProibidos(visivel)) {
+      achados.push({
+        mensagem: `redirecionamento '${r}' escreve arquivo (só 2>&1, >/dev/null e 2>/dev/null passam) — cmd: ${cmd}`,
+      })
+    }
+  })
+  return achados
+}
+
+// ─── O gate ───────────────────────────────────────────────────────────────
+
+function ehArray(v: unknown): v is unknown[] {
+  return Array.isArray(v)
+}
+function vazio(v: unknown): boolean {
+  if (v === undefined || v === null) return true
+  if (typeof v === 'string') return v.trim() === ''
+  if (Array.isArray(v)) return v.length === 0
+  return false
+}
+
+/** Todo `NNN[a]-*.md` do diretório da fila, lido uma vez. */
+export function lerFila(filaDir: string): TicketLido[] {
+  if (!existsSync(filaDir)) return []
+  return readdirSync(filaDir)
+    .filter((f) => /^\d{3}[a-z]?-.*\.md$/.test(f))
+    .sort()
+    .map((f) => {
+      const arquivo = join(filaDir, f)
+      const r = blocoJson(readFileSync(arquivo, 'utf8'))
+      return { arquivo, json: r.ok ? r.json : null }
+    })
+}
+
+export function carregarCfg(filaDir: string): GateCfg {
+  const p = join(filaDir, '000-config.json')
+  if (!existsSync(p)) return { proibido_no_cmd: [], cmd_prefixos_permitidos: [] }
+  const j = JSON.parse(readFileSync(p, 'utf8')) as { gate_ticket?: Partial<GateCfg> }
+  const g = j.gate_ticket ?? {}
+  return {
+    // A CHAVE É `proibido_no_cmd`, e não `padroes_proibidos`: é o nome que está
+    // no disco desde a Etapa 1, já semeado com os padrões que o
+    // `autoalimentacao.md` §2 nomeia. Confirmado por grep, não por memória.
+    proibido_no_cmd: Array.isArray(g.proibido_no_cmd) ? g.proibido_no_cmd.map(String) : [],
+    cmd_prefixos_permitidos: Array.isArray(g.cmd_prefixos_permitidos)
+      ? g.cmd_prefixos_permitidos.map(String)
+      : [],
+  }
+}
+
+/**
+ * Valida UM ticket. `fila` é a fila inteira, necessária para os checks 7
+ * (dependência por id existente) e 8 (sobreposição de allowlist).
+ */
+export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg): Violacao[] {
+  const v: Violacao[] = []
+  const arq = basename(alvo.arquivo)
+  const erro = (campo: string, mensagem: string) => v.push({ arquivo: arq, campo, mensagem })
+
+  // 1. bloco ```json parseável.
+  if (!alvo.json) {
+    const r = blocoJson(readFileSync(alvo.arquivo, 'utf8'))
+    erro('json', r.ok ? 'bloco ```json ilegível' : r.motivo)
+    return v // sem JSON não há o que checar depois: fail-fast de verdade.
+  }
+  const t = alvo.json
+  const status = typeof t.status === 'string' ? t.status : ''
+  const pendente = status === 'pendente'
+
+  // 2. campos obrigatórios — só para `pendente`. Terminal basta parsear.
+  if (pendente) {
+    for (const campo of CAMPOS_PENDENTE) {
+      // `dependencias: []` é o caso NORMAL da fila — a maioria dos tickets não
+      // depende de ninguém. Cobrar lista não-vazia reprovaria dezenas de tickets
+      // por serem independentes, que é a coisa CERTA a ser. Cobra-se a chave
+      // existir e ser lista, nada além.
+      if (campo === 'dependencias') {
+        if (!ehArray(t.dependencias)) {
+          erro(campo, 'campo obrigatório de ticket pendente ausente ou não é lista')
+        }
+        continue
+      }
+      // `risco` também basta EXISTIR: quem o preenche é o PASSO 6 do gate
+      // (classe de risco), que fica de fora desta peça. Os 7 pendentes de hoje o
+      // trazem vazio, e exigir valor aqui seria o gate reprovando ticket por não
+      // ter feito o que o próprio gate ainda não faz.
+      if (campo === 'risco') {
+        if (t.risco === undefined || t.risco === null) {
+          erro(campo, 'campo obrigatório de ticket pendente ausente')
+        } else if (typeof t.risco === 'string' && t.risco !== '' && t.risco !== 'baixo' && t.risco !== 'alto') {
+          erro(campo, `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
+        }
+        continue
+      }
+      if (vazio(t[campo])) erro(campo, 'campo obrigatório de ticket pendente ausente ou vazio')
+    }
+  }
+
+  // 3. `id` no formato e igual ao prefixo do nome do arquivo.
+  const id = typeof t.id === 'string' ? t.id : ''
+  if (!RE_ID.test(id)) {
+    erro('id', `'${id}' fora do formato NNN[a] (três dígitos, letra opcional)`)
+  }
+  const prefixoArquivo = /^(\d{3}[a-z]?)-/.exec(arq)?.[1] ?? ''
+  if (id && prefixoArquivo && id !== prefixoArquivo) {
+    erro('id', `'${id}' não bate com o prefixo do nome do arquivo ('${prefixoArquivo}')`)
+  }
+
+  // 4. `status` dentro do vocabulário.
+  if (!(STATUS_VALIDOS as readonly string[]).includes(status)) {
+    erro('status', `'${status}' não é status de fila (${STATUS_VALIDOS.join(', ')})`)
+  }
+
+  // 5 e 6 só em ticket pendente: é o que ainda vai rodar. Critério de ticket
+  // `done` já rodou, e cobrá-lo agora é auditar o passado com a régua de hoje.
+  if (pendente && ehArray(t.criterios_aceite)) {
+    t.criterios_aceite.forEach((c, i) => {
+      const campo = `criterios_aceite[${i}]`
+      const cr = (c ?? {}) as Cru
+      const tipo = typeof cr.tipo === 'string' ? cr.tipo : ''
+      if (!(TIPOS_CRITERIO as readonly string[]).includes(tipo)) {
+        erro(campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
+      }
+      if (vazio(cr.cmd)) erro(campo, 'cmd vazio')
+      if (vazio(cr.espera)) erro(campo, 'espera vazia')
+
+      if (typeof cr.cmd === 'string' && cr.cmd.trim() !== '') {
+        for (const a of checarCmd(cr.cmd, cfg)) {
+          v.push(a.isencao ? { arquivo: arq, campo, mensagem: a.mensagem, isencao: true } : { arquivo: arq, campo, mensagem: a.mensagem })
+        }
+      }
+    })
+  }
+
+  // 7. dependências: id existente na fila, ou `humano:<token>`.
+  if (pendente && ehArray(t.dependencias)) {
+    const ids = new Set(fila.map((f) => (typeof f.json?.id === 'string' ? f.json.id : '')).filter(Boolean))
+    t.dependencias.forEach((d, i) => {
+      const dep = String(d)
+      if (dep.startsWith('humano:')) {
+        if (dep.slice('humano:'.length).trim() === '') {
+          erro(`dependencias[${i}]`, "'humano:' sem token")
+        }
+        return
+      }
+      if (!ids.has(dep)) erro(`dependencias[${i}]`, `'${dep}' não é id de ticket da fila nem 'humano:<token>'`)
+    })
+  }
+
+  // 8. allowlist sobreposta com outro pendente, sem dependência declarada
+  //    entre os dois. A doutrina (passo 5) manda que sobreposição de superfície
+  //    vire dependência por ID: dois agentes na mesma linha do mesmo arquivo é
+  //    conflito de merge garantido, e o segundo reprova por trabalho do primeiro.
+  if (pendente && ehArray(t.pathspec_allowlist)) {
+    const meus = new Set(t.pathspec_allowlist.map(String))
+    const minhasDeps = ehArray(t.dependencias) ? t.dependencias.map(String) : []
+    for (const outro of fila) {
+      const o = outro.json
+      if (!o || o.status !== 'pendente' || o.id === id || typeof o.id !== 'string') continue
+      const dele = ehArray(o.pathspec_allowlist) ? o.pathspec_allowlist.map(String) : []
+      const comuns = dele.filter((p) => meus.has(p))
+      if (comuns.length === 0) continue
+      const depsDele = ehArray(o.dependencias) ? o.dependencias.map(String) : []
+      if (minhasDeps.includes(o.id) || depsDele.includes(id)) continue
+      erro(
+        'pathspec_allowlist',
+        `sobrepõe o ${o.id} sem dependência declarada entre os dois: ${comuns.join(', ')}`,
+      )
+    }
+  }
+
+  return v
+}
+
+export function validar(alvos: TicketLido[], fila: TicketLido[], cfg: GateCfg): Violacao[] {
+  return alvos.flatMap((a) => validarTicket(a, fila, cfg))
+}
+
+// ─── CLI ──────────────────────────────────────────────────────────────────
+
+function resolverAlvo(arg: string, filaDir: string, fila: TicketLido[]): TicketLido | null {
+  if (arg.endsWith('.md')) {
+    const p = resolve(arg)
+    if (!existsSync(p)) return null
+    const achado = fila.find((f) => resolve(f.arquivo) === p)
+    if (achado) return achado
+    const r = blocoJson(readFileSync(p, 'utf8'))
+    return { arquivo: p, json: r.ok ? r.json : null }
+  }
+  return fila.find((f) => basename(f.arquivo).startsWith(`${arg}-`)) ?? null
+}
+
+function main(argv: string[]): number {
+  let filaDir = join(process.cwd(), 'docs', 'fila')
+  let relatorio = false
+  let pendentes = false
+  const args: string[] = []
+  for (let i = 0; i < argv.length; i++) {
+    const a = argv[i]!
+    if (a === '--fila') {
+      filaDir = argv[++i] ?? filaDir
+    } else if (a === '--relatorio') {
+      relatorio = true
+    } else if (a === '--pendentes') {
+      pendentes = true
+    } else {
+      args.push(a)
+    }
+  }
+
+  const fila = lerFila(filaDir)
+  const cfg = carregarCfg(filaDir)
+
+  let alvos: TicketLido[]
+  if (pendentes) {
+    alvos = fila.filter((f) => f.json?.status === 'pendente')
+  } else if (args.length > 0) {
+    alvos = []
+    for (const a of args) {
+      const t = resolverAlvo(a, filaDir, fila)
+      if (!t) {
+        process.stderr.write(`gate-ticket: '${a}' não é ticket desta fila (${filaDir})\n`)
+        return 2
+      }
+      alvos.push(t)
+    }
+  } else {
+    process.stderr.write('uso: gate-ticket [--fila <dir>] [--relatorio] (--pendentes | <arquivo.md|id>...)\n')
+    return 2
+  }
+
+  const achados = validar(alvos, fila, cfg)
+  const violacoes = achados.filter((a) => !a.isencao)
+
+  if (relatorio) {
+    process.stdout.write(`GATE DE TICKET · ${alvos.length} ticket(s) · fila ${filaDir}\n\n`)
+    for (const alvo of alvos) {
+      const arq = basename(alvo.arquivo)
+      const meus = achados.filter((a) => a.arquivo === arq)
+      const erros = meus.filter((a) => !a.isencao)
+      process.stdout.write(`${arq}  ${erros.length === 0 ? 'OK' : `${erros.length} violação(ões)`}\n`)
+      for (const a of meus) process.stdout.write(`  ${arq}:${a.campo} ${a.mensagem}\n`)
+    }
+    const isencoes = achados.length - violacoes.length
+    process.stdout.write(`\nTOTAL: ${violacoes.length} violação(ões), ${isencoes} isenção(ões), em ${alvos.length} ticket(s)\n`)
+    return 0
+  }
+
+  for (const a of achados) process.stdout.write(`${a.arquivo}:${a.campo} ${a.mensagem}\n`)
+  return violacoes.length > 0 ? 1 : 0
+}
+
+// `import.meta.url` só bate com o argv quando o arquivo foi CHAMADO, não
+// importado: é o que deixa o teste importar as funções sem disparar a CLI.
+if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
+  process.exit(main(process.argv.slice(2)))
+}
diff --git a/test/orq-cli.test.ts b/test/orq-cli.test.ts
index a1975b7..8ca6761 100644
--- a/test/orq-cli.test.ts
+++ b/test/orq-cli.test.ts
@@ -323,6 +323,56 @@ describe('orq pausar / retomar — kill switch em arquivo, nunca kill de process
   });
 });
 
+// ─── orq validar (peça 1) ─────────────────────────────────────────────────
+
+describe('orq validar — o gate de ticket, com o rc repassado', () => {
+  it('fila limpa: rc 0 e nenhuma linha', () => {
+    const raiz = criarFixture([
+      {
+        id: '901',
+        slug: 'da-vez',
+        status: 'pendente',
+        bloco: 'B2',
+        objetivo: 'faz a coisa certa',
+        pathspec_allowlist: ['src/a.ts'],
+        dependencias: [],
+        risco: '',
+        criterios_aceite: [{ tipo: 'alvo', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' }],
+      },
+    ]);
+    const r = orq(raiz, 'validar', '--pendentes');
+    expect(r.rc).toBe(0);
+    expect(r.out.trim()).toBe('');
+  });
+
+  it('ticket torto: rc 1, e a linha nomeia arquivo e campo', () => {
+    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
+    const r = orq(raiz, 'validar', '--pendentes');
+    expect(r.rc).toBe(1);
+    expect(r.out).toMatch(/901-da-vez\.md:(bloco|risco) campo obrigatório/);
+  });
+
+  it('--relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar)', () => {
+    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
+    const r = orq(raiz, 'validar', '--pendentes', '--relatorio');
+    expect(r.rc).toBe(0);
+    expect(r.out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
+    expect(r.out).toMatch(/TOTAL: \d+ violação\(ões\)/);
+  });
+
+  it('validar é READ-ONLY: o .md do ticket sai byte a byte igual', () => {
+    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
+    const alvo = join(raiz, 'docs', 'fila', '901-da-vez.md');
+    const antes = ler(alvo);
+    orq(raiz, 'validar', '--pendentes');
+    expect(ler(alvo)).toBe(antes);
+  });
+
+  it('o verbo está no --help', () => {
+    expect(orq(criarFixture(FILA), '--help').out).toMatch(/orq validar/);
+  });
+});
+
 // ─── read-only por construção ─────────────────────────────────────────────
 
 describe('read-only por construção', () => {
diff --git a/test/orquestrador-gate-ticket.test.ts b/test/orquestrador-gate-ticket.test.ts
new file mode 100644
index 0000000..63a8fee
--- /dev/null
+++ b/test/orquestrador-gate-ticket.test.ts
@@ -0,0 +1,470 @@
+/**
+ * Peça 1 — o gate de ticket (`scripts/orquestrador/gate-ticket.ts` + `orq validar`).
+ *
+ * Um caso BOM e um caso MAU por check, sobre fixtures em diretório temporário.
+ * NUNCA sobre `docs/fila` real: o gate lê a fila inteira para os checks 7 e 8, e
+ * um teste apontado para a fila de produção passaria a depender do estado dela —
+ * verde hoje, vermelho amanhã, por trabalho de outra sessão.
+ *
+ * O que o gate NÃO faz, por decisão registrada (vira peça 1b): rodar `alvo`
+ * contra HEAD, rodar `guarda` contra HEAD, executar `recon[]`.
+ */
+import { describe, it, expect } from 'vitest';
+import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
+import { tmpdir } from 'node:os';
+import { join } from 'node:path';
+import { spawnSync } from 'node:child_process';
+import {
+  CAMPOS_PENDENTE,
+  STATUS_TERMINAIS,
+  STATUS_VALIDOS,
+  TIPOS_CRITERIO,
+  blocoJson,
+  carregarCfg,
+  checarCmd,
+  lerFila,
+  mascararAspas,
+  segmentarCmd,
+  validarTicket,
+} from '../scripts/orquestrador/gate-ticket.js';
+
+const REPO_ROOT = join(import.meta.dirname, '..');
+const GATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');
+const CFG_REAL = readFileSync(join(REPO_ROOT, 'docs', 'fila', '000-config.json'), 'utf8');
+
+interface Ticket {
+  id: string;
+  slug?: string;
+  [k: string]: unknown;
+}
+
+/**
+ * Fila de fixture: `000-config.json` REAL (o gate lê `gate_ticket` dele; cópia
+ * congelada faria o teste passar contra um config que não existe mais) + os
+ * tickets pedidos, cada um no formato do repo: prosa + bloco ```json.
+ */
+function criarFila(tickets: Ticket[]): string {
+  const dir = mkdtempSync(join(tmpdir(), 'orq-gate-'));
+  mkdirSync(dir, { recursive: true });
+  writeFileSync(join(dir, '000-config.json'), CFG_REAL);
+  for (const t of tickets) escreverTicket(dir, t);
+  return dir;
+}
+
+/** Ticket pendente COMPLETO: o caso bom de referência de todos os checks. */
+function pendenteBom(over: Partial<Ticket> & { id: string }): Ticket {
+  return {
+    bloco: 'B2',
+    frente: 'B2-F9',
+    objetivo: 'faz a coisa certa no arquivo certo',
+    pathspec_allowlist: ['src/a.ts'],
+    dependencias: [],
+    criterios_aceite: [{ tipo: 'alvo', descricao: 'existe', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' }],
+    status: 'pendente',
+    risco: '',
+    ...over,
+  };
+}
+
+function escreverTicket(dir: string, t: Ticket, nomeArquivo?: string): string {
+  const slug = String(t.slug ?? `fixture-${t.id}`);
+  const caminho = join(dir, nomeArquivo ?? `${t.id}-${slug}.md`);
+  writeFileSync(caminho, `# ${t.id}\n\nprosa.\n\n\`\`\`json\n${JSON.stringify({ slug, ...t }, null, 2)}\n\`\`\`\n`);
+  return caminho;
+}
+
+/** Roda o gate em processo e devolve só as violações (isenções à parte). */
+function violacoes(dir: string, id: string): string[] {
+  const fila = lerFila(dir);
+  const cfg = carregarCfg(dir);
+  const alvo = fila.find((f) => f.arquivo.includes(`/${id}-`))!;
+  return validarTicket(alvo, fila, cfg)
+    .filter((v) => !v.isencao)
+    .map((v) => `${v.campo} ${v.mensagem}`);
+}
+
+function isencoes(dir: string, id: string): string[] {
+  const fila = lerFila(dir);
+  const cfg = carregarCfg(dir);
+  const alvo = fila.find((f) => f.arquivo.includes(`/${id}-`))!;
+  return validarTicket(alvo, fila, cfg)
+    .filter((v) => v.isencao)
+    .map((v) => v.mensagem);
+}
+
+/** Roda a CLI de verdade — é o contrato que `orq validar` repassa. */
+function cli(dir: string, ...args: string[]) {
+  const r = spawnSync('npx', ['tsx', GATE, '--fila', dir, ...args], {
+    encoding: 'utf8',
+    cwd: REPO_ROOT,
+  });
+  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
+}
+
+// ─── Check 1 · bloco ```json parseável ────────────────────────────────────
+
+describe('check 1 · bloco ```json parseável', () => {
+  it('BOM: bloco válido é lido como objeto', () => {
+    const r = blocoJson('# t\n\n```json\n{"id":"901"}\n```\n');
+    expect(r.ok).toBe(true);
+    expect(r.ok && r.json.id).toBe('901');
+  });
+
+  it('MAU: arquivo sem bloco ```json', () => {
+    const dir = criarFila([]);
+    writeFileSync(join(dir, '901-sem-bloco.md'), '# 901\n\nsó prosa, nenhum JSON.\n');
+    expect(violacoes(dir, '901')).toEqual(['json nenhum bloco ```json no arquivo']);
+  });
+
+  it('MAU: bloco presente mas com JSON quebrado — e o gate PARA aí', () => {
+    const dir = criarFila([]);
+    writeFileSync(join(dir, '902-quebrado.md'), '# 902\n\n```json\n{"id":"902",\n```\n');
+    const v = violacoes(dir, '902');
+    expect(v).toHaveLength(1); // fail-fast: sem JSON não há campo para checar
+    expect(v[0]).toMatch(/^json bloco ```json não parseia/);
+  });
+});
+
+// ─── Check 2 · campos obrigatórios do pendente ────────────────────────────
+
+describe('check 2 · campos obrigatórios (só para pendente)', () => {
+  it('BOM: pendente completo não acusa campo nenhum', () => {
+    const dir = criarFila([pendenteBom({ id: '901' })]);
+    expect(violacoes(dir, '901')).toEqual([]);
+  });
+
+  it('MAU: pendente sem objetivo e com allowlist vazia acusa os dois', () => {
+    const dir = criarFila([pendenteBom({ id: '901', objetivo: '', pathspec_allowlist: [] })]);
+    const v = violacoes(dir, '901');
+    expect(v).toContain('objetivo campo obrigatório de ticket pendente ausente ou vazio');
+    expect(v).toContain('pathspec_allowlist campo obrigatório de ticket pendente ausente ou vazio');
+  });
+
+  it('BOM: terminal sem campo nenhum passa — para done/obsoleto/bloqueado, basta parsear', () => {
+    expect([...STATUS_TERMINAIS]).toEqual(['done', 'obsoleto', 'bloqueado']);
+    for (const st of STATUS_TERMINAIS) {
+      const dir = criarFila([{ id: '901', slug: 'ja-foi', status: st }]);
+      expect(violacoes(dir, '901'), st).toEqual([]);
+    }
+  });
+
+  it('`risco` basta EXISTIR: vazio passa (quem preenche é o passo 6), lixo não', () => {
+    const vazio = criarFila([pendenteBom({ id: '901', risco: '' })]);
+    expect(violacoes(vazio, '901')).toEqual([]);
+    const ausente = criarFila([pendenteBom({ id: '902', risco: undefined })]);
+    expect(violacoes(ausente, '902')).toContain('risco campo obrigatório de ticket pendente ausente');
+    const lixo = criarFila([pendenteBom({ id: '903', risco: 'medio' })]);
+    expect(violacoes(lixo, '903')[0]).toMatch(/^risco 'medio' não é classe de risco/);
+  });
+
+  it('a lista de campos obrigatórios é a do contrato, item a item', () => {
+    expect([...CAMPOS_PENDENTE]).toEqual([
+      'id',
+      'slug',
+      'bloco',
+      'objetivo',
+      'pathspec_allowlist',
+      'dependencias',
+      'criterios_aceite',
+      'status',
+      'risco',
+    ]);
+  });
+});
+
+// ─── Check 3 · id no formato e igual ao prefixo do arquivo ────────────────
+
+describe('check 3 · id NNN[a], igual ao prefixo do nome do arquivo', () => {
+  it('BOM: 901 em 901-slug.md; e o sufixo de letra é legítimo', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
+      pendenteBom({ id: '901a', pathspec_allowlist: ['src/b.ts'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+    expect(violacoes(dir, '901a')).toEqual([]);
+  });
+
+  it('MAU: id fora do formato', () => {
+    const dir = criarFila([]);
+    escreverTicket(dir, pendenteBom({ id: '9z1' }), '9z1-torto.md');
+    const fila = lerFila(dir);
+    const cfg = carregarCfg(dir);
+    // O arquivo nem entra na varredura (o nome não casa NNN[a]-), então o gate é
+    // chamado direto sobre ele: é assim que `orq validar <arquivo>` o alcança.
+    const md = readFileSync(join(dir, '9z1-torto.md'), 'utf8');
+    const r = blocoJson(md);
+    const v = validarTicket({ arquivo: join(dir, '9z1-torto.md'), json: r.ok ? r.json : null }, fila, cfg);
+    expect(v.map((x) => x.mensagem)).toContain("'9z1' fora do formato NNN[a] (três dígitos, letra opcional)");
+  });
+
+  it('MAU: id que não bate com o prefixo do arquivo', () => {
+    const dir = criarFila([]);
+    escreverTicket(dir, pendenteBom({ id: '901' }), '902-nome-errado.md');
+    expect(violacoes(dir, '902')).toContain(
+      "id '901' não bate com o prefixo do nome do arquivo ('902')",
+    );
+  });
+});
+
+// ─── Check 4 · status dentro do vocabulário ───────────────────────────────
+
+describe('check 4 · status dentro do vocabulário da fila', () => {
+  it('BOM: os seis status do contrato passam', () => {
+    expect([...STATUS_VALIDOS]).toEqual([
+      'pendente',
+      'em_execucao',
+      'done',
+      'bloqueado',
+      'obsoleto',
+      'refatiar',
+    ]);
+    const dir = criarFila(STATUS_VALIDOS.map((s, i) => pendenteBom({ id: `90${i}`, status: s })));
+    for (let i = 0; i < STATUS_VALIDOS.length; i++) expect(violacoes(dir, `90${i}`)).toEqual([]);
+  });
+
+  it('MAU: status inventado', () => {
+    const dir = criarFila([pendenteBom({ id: '901', status: 'arquivado' })]);
+    expect(violacoes(dir, '901')[0]).toMatch(/^status 'arquivado' não é status de fila/);
+  });
+});
+
+// ─── Check 5 · critérios de ticket pendente ───────────────────────────────
+
+describe('check 5 · tipo, cmd e espera de cada critério do pendente', () => {
+  it('BOM: os três tipos do contrato passam, com cmd e espera preenchidos', () => {
+    expect([...TIPOS_CRITERIO]).toEqual(['alvo', 'guarda', 'avaliador']);
+    const dir = criarFila([
+      pendenteBom({
+        id: '901',
+        criterios_aceite: TIPOS_CRITERIO.map((tipo) => ({ tipo, cmd: 'test -f src/a.ts && echo ok', espera: 'ok' })),
+      }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+  });
+
+  it('MAU: tipo inválido, cmd vazio e espera vazia, cada um com sua linha', () => {
+    const dir = criarFila([
+      pendenteBom({
+        id: '901',
+        criterios_aceite: [
+          { tipo: 'smoke', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' },
+          { tipo: 'alvo', cmd: '   ', espera: 'ok' },
+          { tipo: 'alvo', cmd: 'test -f src/a.ts && echo ok', espera: '' },
+        ],
+      }),
+    ]);
+    const v = violacoes(dir, '901');
+    expect(v).toContain("criterios_aceite[0] tipo 'smoke' inválido (alvo, guarda, avaliador)");
+    expect(v).toContain('criterios_aceite[1] cmd vazio');
+    expect(v).toContain('criterios_aceite[2] espera vazia');
+  });
+
+  it('critério de ticket done NÃO é cobrado: já rodou', () => {
+    const dir = criarFila([
+      { id: '901', slug: 'ja-foi', status: 'done', criterios_aceite: [{ tipo: 'xpto', cmd: 'rm -rf /', espera: '' }] },
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+  });
+});
+
+// ─── Check 6 · padrões proibidos no cmd, com a precedência de 07/09 ───────
+
+describe('check 6 · leitura do cmd: aspas, segmentos, redirecionamento', () => {
+  it('aspas mascaradas: `grep -E \'a|b\'` é UM segmento, e o `rm ` citado não é comando', () => {
+    expect(segmentarCmd("grep -E 'a|b' arq.ts")).toEqual(["grep -E 'a|b' arq.ts"]);
+    // As próprias aspas viram espaço: o comprimento é preservado byte a byte,
+    // para que um índice medido no texto visível ainda aponte o texto cru.
+    expect(mascararAspas("grep 'rm ' arq.ts")).toBe('grep       arq.ts');
+  });
+
+  it('`&&` consome DOIS caracteres: o segmento seguinte não começa com `&`', () => {
+    expect(segmentarCmd('test -f a && echo ok')).toEqual(['test -f a', 'echo ok']);
+    expect(segmentarCmd('a | b ; c')).toEqual(['a', 'b', 'c']);
+  });
+
+  it('`|` dentro de `$(…)` não quebra segmento (mesma lição da peça 0e-b)', () => {
+    expect(segmentarCmd("test $(grep -oE '(a|b)' f | wc -l) -ge 2")).toEqual([
+      "test $(grep -oE '(a|b)' f | wc -l) -ge 2",
+    ]);
+  });
+});
+
+describe('check 6 · o veto, a isenção e o que a isenção NÃO alcança', () => {
+  const cfg = carregarCfg(join(REPO_ROOT, 'docs', 'fila'));
+
+  it('a chave lida é `proibido_no_cmd` (é o nome que está no disco)', () => {
+    expect(cfg.proibido_no_cmd).toContain('$(');
+    expect(cfg.proibido_no_cmd).toContain('sudo');
+    expect(cfg.cmd_prefixos_permitidos).toContain('test $(');
+  });
+
+  it('BOM: cmd sem padrão proibido não acusa nada', () => {
+    expect(checarCmd('test -f src/a.ts && echo ok', cfg)).toEqual([]);
+  });
+
+  it('MAU: `rm`, `sudo`, `eval` e crase reprovam em qualquer segmento', () => {
+    for (const cmd of ['rm -rf src', 'test -f a && sudo ls', 'eval "ls"', 'echo `ls`']) {
+      expect(checarCmd(cmd, cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
+    }
+  });
+
+  it('regra (a): `$(` no PRIMEIRO segmento sob prefixo permitido vira ISENÇÃO, com o prefixo', () => {
+    const r = checarCmd("test $(grep -c 'it(' f.ts) -ge 8 && echo ok", cfg);
+    expect(r.filter((a) => !a.isencao)).toEqual([]);
+    expect(r.filter((a) => a.isencao)).toHaveLength(1);
+    expect(r[0]!.mensagem).toContain("prefixo permitido 'test $('");
+  });
+
+  it('regra (a): o MESMO `$(` no segundo segmento REPROVA — o veto volta a valer', () => {
+    const r = checarCmd("test -f f.ts && test $(grep -c 'it(' f.ts) -ge 8 && echo ok", cfg);
+    const erros = r.filter((a) => !a.isencao);
+    expect(erros).toHaveLength(1);
+    expect(erros[0]!.mensagem).toMatch(/padrão proibido '\$\(' em segmento 2/);
+  });
+
+  it('regra (b): `2>&1`, `>/dev/null` e `2>/dev/null` passam', () => {
+    expect(checarCmd('npx vitest run t.ts 2>&1 | grep -c passed', cfg).filter((a) => !a.isencao)).toEqual([]);
+    expect(checarCmd('npm run build >/dev/null 2>&1', cfg).filter((a) => !a.isencao)).toEqual([]);
+    expect(checarCmd('npm run lint 2>/dev/null', cfg).filter((a) => !a.isencao)).toEqual([]);
+  });
+
+  it('regra (b): `>` e `>>` para arquivo real reprovam SEMPRE, inclusive sob prefixo permitido', () => {
+    const escreve = checarCmd('npm run build > saida.txt', cfg).filter((a) => !a.isencao);
+    expect(escreve).toHaveLength(1);
+    expect(escreve[0]!.mensagem).toMatch(/redirecionamento '>saida.txt' escreve arquivo/);
+    const anexa = checarCmd("test $(grep -c 'x' f) -ge 1 >> log.txt", cfg).filter((a) => !a.isencao);
+    expect(anexa.length).toBeGreaterThan(0);
+  });
+
+  it('regra (c): `sh -c` e `curl https` não são isentos nem com prefixo permitido antes', () => {
+    expect(checarCmd("test -f a && sh -c 'ls'", cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
+    expect(checarCmd('curl https://exemplo.com', cfg).filter((a) => !a.isencao).length).toBeGreaterThan(0);
+  });
+
+  it('`rm ` não casa `form `: token de palavra, nunca substring', () => {
+    expect(checarCmd("grep -c 'form ' src/a.ts", cfg).filter((a) => !a.isencao)).toEqual([]);
+  });
+
+  it('regra (d): a isenção chega ao ticket, nomeando o critério e o prefixo', () => {
+    const dir = criarFila([
+      pendenteBom({
+        id: '901',
+        criterios_aceite: [{ tipo: 'alvo', cmd: "test $(grep -c 'it(' f.ts) -ge 8 && echo ok", espera: 'ok' }],
+      }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+    const i = isencoes(dir, '901');
+    expect(i).toHaveLength(1);
+    expect(i[0]).toContain("prefixo permitido 'test $('");
+  });
+});
+
+// ─── Check 7 · dependências ───────────────────────────────────────────────
+
+describe('check 7 · dependência por id existente ou humano:<token>', () => {
+  it('BOM: id que existe na fila e token humano', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '900', status: 'done' }),
+      pendenteBom({ id: '901', dependencias: ['900', 'humano:migration-0030'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+  });
+
+  it('MAU: id inexistente e `humano:` sem token', () => {
+    const dir = criarFila([pendenteBom({ id: '901', dependencias: ['888', 'humano:'] })]);
+    const v = violacoes(dir, '901');
+    expect(v).toContain("dependencias[0] '888' não é id de ticket da fila nem 'humano:<token>'");
+    expect(v).toContain("dependencias[1] 'humano:' sem token");
+  });
+});
+
+// ─── Check 8 · allowlists sobrepostas entre pendentes ─────────────────────
+
+describe('check 8 · sobreposição de allowlist entre dois pendentes', () => {
+  it('BOM: allowlists disjuntas', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
+      pendenteBom({ id: '902', pathspec_allowlist: ['src/b.ts'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+    expect(violacoes(dir, '902')).toEqual([]);
+  });
+
+  it('BOM: sobrepostas COM dependência declarada — em qualquer das duas direções', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
+      pendenteBom({ id: '902', pathspec_allowlist: ['src/a.ts'], dependencias: ['901'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+    expect(violacoes(dir, '902')).toEqual([]);
+  });
+
+  it('MAU: sobrepostas SEM dependência — linha nos DOIS, nomeando o path comum', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts', 'src/x.ts'] }),
+      pendenteBom({ id: '902', pathspec_allowlist: ['src/a.ts'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([
+      'pathspec_allowlist sobrepõe o 902 sem dependência declarada entre os dois: src/a.ts',
+    ]);
+    expect(violacoes(dir, '902')).toEqual([
+      'pathspec_allowlist sobrepõe o 901 sem dependência declarada entre os dois: src/a.ts',
+    ]);
+  });
+
+  it('ticket done que sobrepõe pendente NÃO é conflito: já entregou', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '900', status: 'done', pathspec_allowlist: ['src/a.ts'] }),
+      pendenteBom({ id: '901', pathspec_allowlist: ['src/a.ts'] }),
+    ]);
+    expect(violacoes(dir, '901')).toEqual([]);
+  });
+});
+
+// ─── A CLI: rc, --pendentes, --relatorio ──────────────────────────────────
+
+describe('a CLI é o contrato que `orq validar` repassa', () => {
+  it('sem violação: rc 0 e nenhuma linha', () => {
+    const dir = criarFila([pendenteBom({ id: '901' })]);
+    const r = cli(dir, '--pendentes');
+    expect(r.rc).toBe(0);
+    expect(r.out.trim()).toBe('');
+  });
+
+  it('com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>`', () => {
+    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
+    const r = cli(dir, '--pendentes');
+    expect(r.rc).toBe(1);
+    expect(r.out).toContain('901-fixture-901.md:objetivo campo obrigatório');
+  });
+
+  it('--relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação', () => {
+    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
+    const r = cli(dir, '--pendentes', '--relatorio');
+    expect(r.rc).toBe(0);
+    expect(r.out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
+    expect(r.out).toMatch(/TOTAL: 1 violação\(ões\), 0 isenção\(ões\), em 1 ticket\(s\)/);
+  });
+
+  it('--pendentes pega SÓ os pendentes', () => {
+    const dir = criarFila([
+      pendenteBom({ id: '900', status: 'done' }),
+      pendenteBom({ id: '901' }),
+      pendenteBom({ id: '902', status: 'refatiar' }),
+    ]);
+    expect(cli(dir, '--pendentes', '--relatorio').out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
+  });
+
+  it('por id e por caminho: os dois alcançam o mesmo ticket', () => {
+    const dir = criarFila([pendenteBom({ id: '901', objetivo: '' })]);
+    expect(cli(dir, '901').rc).toBe(1);
+    expect(cli(dir, join(dir, '901-fixture-901.md')).rc).toBe(1);
+  });
+
+  it('id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada', () => {
+    const dir = criarFila([pendenteBom({ id: '901' })]);
+    const r = cli(dir, '999');
+    expect(r.rc).toBe(2);
+    expect(r.err).toContain('não é ticket desta fila');
+  });
+});
```

### `77f8126` — pecas: 13 e 1 saem de PENDENTES com o sha; nasce a 1b

```diff
diff --git a/docs/orquestrador/PECAS.md b/docs/orquestrador/PECAS.md
index df15d3d..ba23d36 100644
--- a/docs/orquestrador/PECAS.md
+++ b/docs/orquestrador/PECAS.md
@@ -153,58 +153,76 @@
   uma morte ser um registro. `test/orquestrador-morte-por-sinal.test.ts`, com o sinal enviado DE
   FORA por um processo irmão — `kill -TERM $$` provaria só que o handler roda quando chamado.
 
+- **Peça 13 · notificação só quando houve o que notificar.** A drenagem notifica quando processou ao
+  menos um ticket (aprovado, bloqueado, adiado, refatiado ou `EXECUTOR_MORREU`) **ou** quando a fila
+  ficou sem processável pela PRIMEIRA vez desde a última drenagem que processou. Saída por lock em
+  uso ou por "já há drenagem em curso" (peça 11) não notifica.
+  *Evidência:* 07/09 11:0x — cartões nativos "0 aprovados · duração 0min · último —" a cada tick do
+  launchd, enquanto o 240 ainda rodava. Notificação que chega quando nada aconteceu treina o
+  operador a ignorar a notificação que importa.
+  *Feito:* `84294ea` — `deve_notificar` no `lib.sh` decide E mantém o marcador
+  `runs/.notificacao-fila-vazia`, que é ARQUIVO porque cada tick do launchd é um processo novo e é a
+  repetição que se quer calar; `MOTIVO_FILA_VAZIA` virou constante compartilhada; `EXECUTOR_MORREU`
+  é contado na trilha ANTES e DEPOIS do laço, porque o executor morre num processo filho e o rc não
+  distingue morte de reprovação. `refatiar` entrou na conta de "processado" — o PECAS não o listava,
+  mas é desfecho de executor que rodou e gastou. Medido: com o comportamento antigo, dez ticks com a
+  fila vazia escreviam **dez** linhas; hoje escrevem **uma**.
+  `test/orquestrador-notificacao.test.ts`.
+
+- **Peça 1 · gate de ticket (`scripts/orquestrador/gate-ticket.ts` + `orq validar`).** Passos 1-6 de
+  `autoalimentacao.md` §2, na parte que é SCRIPT e custa zero token: bloco ```json parseável, campos
+  obrigatórios do pendente, `id` `NNN[a]` igual ao prefixo do arquivo, `status` no vocabulário,
+  `tipo`/`cmd`/`espera` de cada critério, padrões proibidos no `cmd`, dependência por id existente ou
+  `humano:<token>`, e allowlist sobreposta entre pendentes sem dependência declarada. Uma linha por
+  violação (`<arquivo>:<campo> <mensagem>`), rc 1 se houve; `--relatorio` imprime tudo e sai 0.
+  *Evidência:* pré-voo B, item **8.9** segue NO-GO (`PLAYBOOK.md:85`) — enquanto for, o teste
+  vermelho de cada ticket é verificado à mão, como foi em todo o lote 8.
+  *Feito:* `9edbf65` — a chave do config é `gate_ticket.proibido_no_cmd` (o briefing pedia
+  `padroes_proibidos`, que não existe no repo); a PRECEDÊNCIA entre prefixo permitido e padrão
+  proibido virou regra escrita no `autoalimentacao.md` §2, por decisão do dono de 07/09. Rodado
+  contra os 7 pendentes reais: **33 violações, 25 isenções**, saída inteira no PLAYBOOK. Nenhum
+  ticket corrigido — corrigir fila é sessão de fila.
+  `test/orquestrador-gate-ticket.test.ts` (41 casos) e `test/orq-cli.test.ts`.
+
 ## PENDENTES
 
 Nesta ordem.
 
-As peças **11, 12 e 13** entram NA FRENTE das numeradas de 1 a 7: as três são do DISPARO, não do
-julgamento. Enquanto valerem, a fila drena às cegas — ou não drena e ninguém percebe.
+As peças do DISPARO (11, 12 e 13) já saíram: enquanto valeram, a fila drenava às cegas — ou não
+drenava e ninguém percebia. A **1b** vem antes das numeradas porque é o resto do 8.9, e o 8.9 é o que
+segura o pré-voo C.
 
-- **Peça 13 · notificação só quando houve o que notificar.** A drenagem notifica quando processou ao
-  menos um ticket (aprovado, bloqueado, adiado ou `EXECUTOR_MORREU`) **ou** quando a fila ficou sem
-  processável pela PRIMEIRA vez desde a última drenagem que processou. Saída por lock em uso ou por
-  "já há drenagem em curso" (peça 11) não notifica.
-  *Evidência:* 07/09 11:0x — cartões nativos "0 aprovados · duração 0min · último —" a cada tick do
-  launchd, enquanto o 240 ainda rodava. Notificação que chega quando nada aconteceu treina o
-  operador a ignorar a notificação que importa.
-  *Teste:* `local-loop.sh` com o lock ocupado termina sem chamar `notificar()`.
-
-1. **Gate de ticket — passos 1-6 de `autoalimentacao.md` §2, integrados no executor (3a/3b).**
-   **Depende da `0e`.** O gate julga os `cmd` dos critérios, e é `prefixoDeCmd` que diz o que cada
-   `cmd` autoriza: rodar o gate sobre o corpus com a derivação quebrada por aspas (0e-b) produziria
-   veredito sobre uma allowlist que não é a que o agente vai receber. E o corpus 200-249 é auditado
-   pela trilha, que só é legível depois de (a) e (a2).
-   Corpus 200-249, incluindo as regras novas: *migration nunca depende do próprio token* (o número
-   anterior pode), e *pertença por bloco/frente, não por faixa de ID*.
-   *Evidência:* pré-voo B, item **8.9** segue NO-GO (`PLAYBOOK.md:85`) — enquanto for, o teste
-   vermelho de cada ticket é verificado à mão, como foi em todo o lote 8; a regra da migration nasceu
-   no 239 (`PLAYBOOK.md:118`) e a de pertença na sessão de roadmap de 2026-09-04.
-   *Teste:* o gate rodando sobre os 50 tickets de 200 a 249, com o veredito conferido contra o que a
-   revisão humana já decidiu sobre eles.
-
-2. **Sondagem: uma por drenagem, zero com fila vazia.**
+- **Peça 1b · o gate EXECUTA o que hoje só lê.** Falta da peça 1, por decisão: `alvo` que já passa
+  contra HEAD, `guarda` que já falha contra HEAD, e execução de `recon[]`. Tudo isso roda comando
+  escrito por modelo, e o §2 cerca com worktree descartável, sem `.env` de produção, com
+  `gate_ticket.timeout_cmd_secs` — outra peça e outra classe de risco.
+  *Evidência:* o 8.9 continua NO-GO enquanto o teste vermelho não for conferido por máquina.
+  *Teste:* fixture com critério `alvo` que já passa contra HEAD ⇒ descartado `vermelho`; `guarda` que
+  já falha ⇒ descartado; `cmd` que estoura o timeout ⇒ `invalido`, não `vermelho`.
+
+1. **Sondagem: uma por drenagem, zero com fila vazia.**
    *Evidência:* `probe_modelos` é chamada em `executor.sh:126`, por execução do executor, e é chamada
    **paga** (`executor.sh:161` já a protege com o gate de orçamento, o que confirma o custo).
    *Teste:* drenagem com N tickets faz 1 sondagem; drenagem com fila vazia faz 0, provado pela
    ausência de registro `probe` em `custo.json`.
 
-3. **`orq erro` aponta a tentativa que reprovou; `orq ticket` lista todas.**
+2. **`orq erro` aponta a tentativa que reprovou; `orq ticket` lista todas.**
    *Evidência:* `scripts/orq:251-252`; hoje `orq erro` escolhe o recorte pela ordem do pipeline, não
    pela tentativa, então num ticket com retry ele pode explicar a tentativa errada.
    *Teste:* ticket com `attempt-3` reprovado e `attempt-4` adiado — `orq erro` cita a 3.
 
-4. **Repo map em `docs/orquestrador/REPO-MAP.md`.**
+3. **Repo map em `docs/orquestrador/REPO-MAP.md`.**
    *Evidência:* pré-voo, item **8.8**, NO-GO desde 2026-09-03 (`PLAYBOOK.md:66` e `:85`); o context
    pack do executor prevê assinaturas via repo map (`references/custo-e-contexto.md:26`) e o arquivo
    não existe.
    *Teste:* o context pack monta com as assinaturas dos arquivos da allowlist e respeita
    `contexto.cap_tokens_executor`.
 
-5. **Pré-voo C com 8.8 e 8.9 GO.**
+4. **Pré-voo C com 8.8 e 8.9 GO.**
    *Evidência:* os dois são os únicos NO-GO que sobraram das sessões B e C (`PLAYBOOK.md:85`).
    *Teste:* o pré-voo C roda e nenhum item fica NO-GO.
 
-6. **Adiado é progresso.** A drenagem segue para o próximo ticket processável depois de
+5. **Adiado é progresso.** A drenagem segue para o próximo ticket processável depois de
    `ORCAMENTO`/adiado, e `DRENAGEM_FIM` conta os adiados, inclusive `escopo=ticket`.
    *Evidência:* `lib.sh:764-778` — o adiamento por orçamento grava `adiado_ate` e emite `ORCAMENTO`,
    e `lib.sh:315-318` já sabe pular ticket adiado na seleção; o que falta é a drenagem não tratar o
@@ -212,7 +230,7 @@ julgamento. Enquanto valerem, a fila drena às cegas — ou não drena e ningué
    *Teste:* fila com [adiado, processável] termina com o segundo executado e o placar do
    `DRENAGEM_FIM` contando 1 adiado.
 
-7. **Adiamento por orçamento reabre quando o teto sobe.** Hoje `adiado_ate` fica gravado no ticket
+6. **Adiamento por orçamento reabre quando o teto sobe.** Hoje `adiado_ate` fica gravado no ticket
    (`lib.sh:775`) e a seleção o respeita (`lib.sh:315-318`) sem reler o config: subir
    `orcamento.teto_dia` não devolve o ticket à fila até a data passar.
    *Evidência:* `lib.sh:764-778`.
```

