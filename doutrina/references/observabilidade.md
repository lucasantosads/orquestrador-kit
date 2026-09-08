# Observabilidade do loop — contrato

Vale para qualquer repo. Define **o que** existe e **qual o formato**; o **como** (shell, node, python, o que o repo usar) é decisão local, escrita a partir da evidência no disco daquele projeto.

O problema que isto resolve: log verboso não é observabilidade. Quando descobrir "em que ticket está" e "já acabou?" exige ler centenas de linhas de trace, as pessoas param de olhar — e passam a decidir sobre estado velho. Isso já custou, num incidente real, uma manhã inteira de escavação para descobrir que o bloqueio investigado tinha sido resolvido na noite anterior.

---

## 1. `runs/STATUS.md` — snapshot sobrescrito

**Sobrescrito a cada transição. Nunca append.** Se este arquivo crescer, está errado.

```
ORQUESTRADOR · 2026-08-13 15:26:11
ESTADO   executando
TICKET   057 t16a-ranking-gestor · tentativa 1/3
DESDE    15:14:03 (12min) · timeout em 18min
FASE     claude -p
FILA     3 pendentes · 5 bloqueados · 41 done
STAGING  c5ba050e · push suprimido
ÚLTIMO   056 APROVADO 15:13:58 (487s)
```

Campos obrigatórios:

| Campo | Conteúdo | Por quê |
|---|---|---|
| `ESTADO` | `executando` · `ocioso` · `encerrado` | responde "acabou?" |
| `TICKET` | id, slug, tentativa/máximo | responde "onde está?" |
| `DESDE` | início + decorrido + quanto falta p/ timeout | distingue "trabalhando" de "travado" |
| `FASE` | passo do pipeline (`preflight`, `agente`, `enforcement`, `typecheck`, `testes`, `critérios`, `build`, `juiz`, `merge`) | diz em que gate morreu, sem abrir log |
| `FILA` | placar por status | responde "tem trabalho?" |
| `STAGING` | HEAD curto + se push está suprimido | flagra supressão esquecida (regra 12) |
| `ÚLTIMO` | id, veredicto, hora, duração | responde "o anterior passou?" |

Quando `ESTADO` for `ocioso`, `FASE` e `TICKET` viram `—` e uma linha `MOTIVO` explica por que a fila parou (`sem ticket processável`, `todas as deps humanas pendentes`, `lock de outro processo`, `pré-voo NO-GO: <item>`). Fila parada sem motivo declarado é o estado que mais gera diagnóstico errado.

---

## 2. `runs/events.log` — trilha de eventos

Uma linha por transição. **Este é o artefato que a pessoa cola num chat para pedir ajuda.**

Formato fixo, sem prosa: `<iso8601> <id> <EVENTO> [chave=valor ...]`

```
2026-08-13T15:13:58-0300 056 APROVADO merge=c5ba050e dur=487s attempt=1
2026-08-13T15:14:03-0300 057 INICIO attempt=1 model=barato
2026-08-13T15:26:11-0300 057 GATE typecheck=ok testes=FALHA
2026-08-13T15:26:12-0300 057 REPROVADO motivo=suite-vermelha fora_do_pathspec=test/radar.test.ts
2026-08-13T15:26:13-0300 057 RETRY attempt=2
2026-08-13T15:40:02-0300 --- DRENAGEM_FIM aprovados=1 reprovados=0 adiados=1 dur=34min
```

Eventos mínimos: `DRENAGEM_INICIO`, `INICIO`, `GATE`, `APROVADO`, `REPROVADO`, `ADIADO`, `BLOQUEADO`, `RECUPERADO`, `RETRY`, `DRENAGEM_FIM`.

Regras:
- Uma linha cabe numa tela. Motivo longo vai para a evidência do run, não para cá.
- `REPROVADO` e `ADIADO` sempre carregam `motivo=` com token curto e estável (grepável), não uma frase.
- Quando o gate de testes falha, incluir `fora_do_pathspec=` com os arquivos quebrados que a allowlist não cobre (ver "colisão de teste" na SKILL) — é o dado que transforma um beco em ticket acionável.
- Rotação por tamanho ou por mês. Este arquivo é para leitura humana; se precisar de `grep` complexo para achar hoje, rotacione.

---

## 3. Comando de consulta

Um executável no repo (`scripts/orq`, alvo de `make`, npm script — o que for idiomático ali). Sem ele, a pessoa volta ao `tail` gigante e o resto desta página não serve para nada.

| Invocação | Faz |
|---|---|
| `orq` | imprime `STATUS.md` |
| `orq eventos [n]` | últimas n linhas de `events.log` (default 20) |
| `orq erro` | do último ticket reprovado: id, motivo, e o **recorte** do output do gate que falhou — já pronto para colar |
| `orq fila` | placar por status, lendo o JSON de cada ticket no disco |
| `orq ticket <id>` | resultado da última tentativa daquele run + caminho da evidência |

`orq erro` é o de maior valor: sem ele, pedir ajuda significa colar centenas de linhas em que o interlocutor precisa garimpar — e garimpo em log truncado produz diagnóstico errado.

**Nenhum subcomando escreve nada.** Consulta é read-only por construção; se `orq` puder alterar estado, alguém vai alterá-lo no meio de um run.

---

## 4. Notificação de fim de drenagem

Dispara em `DRENAGEM_FIM`, com o placar. Canal é decisão local (notificação nativa do SO, webhook de chat, e-mail com fallback em arquivo — ver a armadilha do relatório por e-mail na SKILL).

Título: `Orquestrador: 3 aprovados, 1 bloqueado`
Corpo: duração + `ÚLTIMO` + se há ticket pendente sobrando.

Sem isso, "ver que acabou para começar outra coisa" vira polling manual — e polling manual vira não olhar.

---

## Onde instrumentar

O ponto de inserção é onde o loop **já** registra progresso (a função de log que todo harness tem). Ao lado dela nascem duas irmãs:

- `status_set <campo> <valor>` — reescreve o snapshot
- `event <id> <EVENTO> [k=v...]` — anexa uma linha à trilha

Call sites, todos já existentes no fluxo: início da drenagem · início do ticket · cada gate (com resultado) · veredicto · retry/adiamento · recuperação de órfão · merge · fim da drenagem.

**Não é reescrita do harness, é instrumentação.** Se a mudança estiver ficando grande, o desenho está errado.

## Como validar que funcionou

Teste de aceite honesto: **derrube o loop no meio de um ticket e reconstrua o que aconteceu usando só `STATUS.md` e `events.log`.** Se precisar abrir o log verboso, a instrumentação não está completa.

Segundo teste: peça a alguém que não montou o sistema para responder, olhando só o `orq`, (a) em que ticket está, (b) se o anterior passou, (c) por que a fila parou. Três respostas certas = pronto.

## Quem escreve isto

Instrumentação do harness **não é ticket de fila** (ver "Quem escreve o harness" na SKILL). Mudança no executor/loop/enforcement é feita fora do loop, com diff cru revisado por humano.

---

## 5. Acréscimos da v2 (mesmos artefatos, linhas a mais)

`STATUS.md` ganha três linhas, sempre presentes:

```
CUSTO      US$ 7,40 / 50,00 hoje · 38k tok/ticket aprovado · 1ª: 78%
PLANEJADOR reposição 02:14 · 3 candidatos · 2 pendentes · 1 descartado (vermelho)
SENTINELA  sinais novos 1 · quarentena 1 · último bug→ticket 314
```

`events.log` ganha os eventos `CANDIDATO`, `DESCARTADO motivo=<passo>`, `REFATIAR`, `SINAL hash= fonte=`, `QUARENTENA arquivo= ticket=`, `DECISAO_PENDENTE`, `ORCAMENTO papel= restante=`, `REPOSICAO frente= lote= descartados=`. `orq` ganha `custo`, `decisoes`, `sinais`, `gate <id>`, `mapa lint|status`, `dor`, `relatorio` (contrato em `autoalimentacao.md` §7).

`MOTIVO` de `ocioso` ganha três valores: `pausado`, `orcamento`, `mapa-lint-vermelho`. Teste de aceite continua o mesmo: derrube o loop no meio e reconstrua o que aconteceu só com `STATUS.md` + `events.log`, agora incluindo "o planejador rodou? quanto gastou? por que a sentinela não abriu ticket?".
