# Relatório da etapa 7f-b5 (11/10/2026)

Branch `kit/etapa7f5`, worktree `~/Projetos/_worktrees/kit-etapa7f5`. **7 commits, sem push e sem merge.**

Escopo das decisões do chat depois do PASSO 0:
- **Peças 1 e 2:** como estavam no brief.
- **Peça 3:** virou "allowlist sobreposta", só em diagnóstico.
- **Peça 4:** ficou reduzida a uma medição e a uma trava.
- **Peça 5:** virou replay mecânico, sem nada pago.
- **Peças 6 e 7:** são novas (aviso e veredito da pausa).
- **Peça 8:** documentação.

A ordem de execução foi 1, 2, 6, 7, 4, 3, 5, 8. Os commits seguem essa ordem.

## Verificação final

| verificação | resultado |
|---|---|
| `npx tsc --noEmit` | rc 0 |
| `TZ=UTC npx vitest run` | rc 0: 92 arquivos, 1549 testes |
| `TZ=UTC bash scripts/kit/test-shell.sh` | rc 0 ("TODOS OS SCRIPTS SAÍRAM rc 0") |

**Escrita.** Só escrevi no worktree, em `~/orq-sessoes/7f-b5/` (scripts, medições, vermelhos) e neste relatório.
- Em `~/.orq`, nenhuma escrita: os testes usam pastas temporárias, pelas variáveis.
- `launchctl`: nenhum.
- `claude -p`: nenhum. Nos testes, só o stub.

**Comarka.** Só leitura, com `GIT_OPTIONAL_LOCKS=0`; nenhum `checkout`, `fetch` ou `stash`.
- O `git status` dele mostra `M docs/fila/1009-…md`. Esse arquivo não foi mexido por esta sessão: é o writeback do loop vivo (1009 em `em_execucao`, mtime 15:12, só os campos `status` e `notas_status`).
- conteudos-infinitos e actus-saas: também só leitura.

## Por peça

| peça | commit | vermelho (antes) | verde |
|---|---|---|---|
| 1 · pulado pelo teto refeito 1x/dia | `3634631` 7f-b5-1 | `peca1-vermelho.txt`: 2 de 3 falham. Pulado ontem não é triado hoje: `expected +0 to be 1` chamadas, e `gerado_em` ficou de ontem | 3/3 |
| 2 · leitor do kit sem duplicata | `37c2208` 7f-b5-2 | `peca2-vermelho.txt`: 3 de 3. Diretórios `attempt-0,0,1,2` em vez de `0,1,2,3`; estágios `enforcement,enforcement,…`; 20 lidos em vez de 16 (duplicados) | 3/3 |
| 6 · aviso de pausa | `c3e2dfb` 7f-b5-3 | `peca6-vermelho.txt`: 5 de 6 (nenhuma chamada ao osascript, nenhuma `pausa` no ledger) | 6/6 |
| 7 · veredito da pausa de gate | `d321256` 7f-b5-4 | `peca7-vermelho.txt`: 6 de 6, módulo escrito e ainda não ligado. A notificação não traz veredito e o `--off` não é chamado | 9/9 (com a corrida do sentinela e o caso de 4 tickets) |
| 4 (b) · trava de tentativa nova | `10e1d5e` 7f-b5-5 | `peca4b-vermelho.txt`: 4 de 5 contra os três arquivos do motor anterior. Hoje o resolvedor **aplica** com o `attempt-*` novo, o arquivo reescrito ou o log novo. Com `em_execucao`, desiste pelo motivo errado ("o ticket mudou") | 5/5 |
| 3 · allowlist sobreposta (R8 D13) | `1fc513a` 7f-b5-6 | `peca3-vermelho.txt`: 2 de 2 (nenhum par, nenhum ledger) | 2/2 |
| 5 · replay do R2 | (só medição, sem código no kit) | — | — |
| 8 · docs | `7907b86` 7f-b5-7 | — | CONTRATO §17 (e §14.5), CHANGELOG, PECAS |

**Asserções que mudaram.**
- Só uma, desta mesma etapa: o teste da peça 6 passou a conferir que a 1ª linha do motivo **abre** o corpo da notificação. Com a peça 7, o veredito vem depois dela.
- Nenhuma asserção de etapa anterior mudou.

**Efeito único no merge.** A assinatura de série com INICIO repetido muda uma vez (o 243 do conteudos-infinitos). Ele é triado de novo uma vez e, como não é firme, vai ao modelo uma vez.

## Resultados dos gabaritos

### Peça 3 · allowlist sobreposta

Scripts: `~/orq-sessoes/7f-b5/medir-sobreposicao.mts`, saída em `.txt`.

| caso | par detectado | direção da regra (id maior espera) | direção do humano |
|---|---|---|---|
| 826 + 866 (`917d35b`) | **sim** (`[id]/page.tsx`) | 866 espera o 826 | **826 espera o 866** (o que já tinha reprovado esperou) |
| 306b + 500 (`ded72e1`) | **sim** (`[id]/page.tsx`, `geral-tab.tsx`, `test/abas-montadas.test.ts`) | 500 espera o 306b | **306b espera o 500** |
| 522 + 522c (`ec421bc`) | não (sem sobreposição) | — | o trabalho era do 522c |

- **Par detectado:** 2 de 3. Nos dois detectados, **a direção decidida é a contrária da do humano**. Pela regra "o que já reprovou ou bloqueou espera o outro", seriam 2 de 2.
- **Fora da regra:** os 5 casos de dependência para ticket criado na hora (551+551a, 559+625, 559+626, 559+559a, 715+726) são falta de spec, não automatizável.

**Falsos positivos.**

| onde | pares |
|---|---|
| Estado atual: Comarka | **34 pares** |
| Estado atual: Actus | 0 |
| Estado atual: conteudos-infinitos | 0 |
| Histórico do Comarka (`main` ao fim de cada dia, 11/09 a 10/10) | **261 pares distintos** |

Destino dos 261 pares do histórico:

| desfecho | pares |
|---|---|
| o humano ligou os dois depois (acerto do par) | 16 |
| os dois chegaram a done sem reprova (falso positivo claro) | 6 |
| os dois done, mas com reprova (indeterminado) | 131 |
| ainda abertos ou obsoletos (indeterminado) | 108 |

Como firme, a regra seria quase só ruído (16 em 261, 6%). Ela fica em diagnóstico, como foi decidido.

### Peça 4 (a) · os casos de allowlist pelo caminho atual

Medição de graça. Script `medir-allowlist.mts`; resumo em `medir-allowlist-resumo.txt`.

**São 37, não 38.** Na conta fina, dos 42 com reprova e artefato no disco, 5 foram editados depois do done.

| resultado | casos | quais |
|---|---|---|
| estavam bloqueados na hora da edição | 35 de 37 | não estavam: 393a (adiado) e 722 (no meio da série, `em_execucao`) |
| **o caminho atual pegaria** (bloqueado + R1 firme D6/D6b) | **15** | |
| ↳ igual ao humano (o mesmo teste, só ele) | **11** | 480, 543, 528, 530, 596b, 531, 625, 627j, 689, 950, 840 |
| ↳ o humano pôs o mesmo teste e mais arquivos | 3 | 331, 391e (2×) |
| ↳ **diferente** | **1** | **762**: a D6 pôs `test/cron-paths-vercel.test.ts`; o humano manteve o teste intocado (critério novo "cron-paths-vercel intocado") e liberou `src/middleware.ts`. **É firme errado da D6 antiga** |
| não pegaria | 22 | os motivos estão na tabela abaixo |

Por que o caminho atual não pegaria os 22:

| motivo | casos | quais |
|---|---|---|
| nenhuma regra casou (juiz) | 7 | 325a, 313b, 368, 490, 475c, 538, 826 |
| R1 palpite D8 (enforcement sem vermelho acoplado) | 3 | 391a, 306b, 480 |
| R1 palpite D6 (vermelho numa tentativa só) | 2 | 343, 483 |
| R1\|R2? D11 | 3 | 550, 407a, 711a |
| R5 D5 (base vermelha) | 2 | 499 (2×) |
| R3? D3 | 1 | 523 |
| R6 D2 | 1 | 533 |
| R2? D12 | 1 | 407a |
| não estava bloqueado | 2 | 393a, 722 |

### Peça 5 · replay mecânico do R2 nos 25 casos de critério

Script `replay-r2.mts`; saída `replay-r2.jsonl`. Nada pago.

**Na forma que o R2 conserta (`unbound variable` de `v=$(grep -c …)`): 0 de 25.** Por isso o R2 não acerta nenhum igual ao humano. O 929 de 10/10, o gabarito dele, foi contado como allowlist na medição (o mesmo commit do 840).

As 25 formas em que os casos caem, agrupadas pela leitura do diff humano no critério que reprovou:

| forma | casos | exemplos |
|---|---|---|
| mesma raiz do R2 com outro sintoma: o `grep -c` sai 1 com contagem 0 e dispara o `\|\| echo …` ou o `&& … \|\|` | 4 | 407a0 (`0 \| ARQUIVO_AUSENTE`), 486 (`0 \| 0`), 691 (`SQL_1_0 0`), 407a |
| contagem frágil sobre a saída de ferramenta (`vitest … \| grep -c ✓`, `grep -l \| wc`) | 3 | 406 (2×), 408 |
| regex/glob frágil (formatação, `[id]` como classe de glob no `case`, `on delete cascade` casando `delete`, comentário contando) | 5 | 514, 737, 900, 739, 898 |
| premissa da spec errada ou desatualizada (rota renomeada, alvo 20→21 crons, HEAD vs merge-base, regra nova) | 8 | 368, 391e, 523b, 627, 627b, 549c, 737, 851 |
| só a descrição de critério qualitativo (avaliador) | 4 | 557, 739, 707 (2×) |
| critérios novos (spec incompleta) | 1 | 316b |

Comparação automática do brief:
- **"Mesmo critério alterado":** não se aplica, porque o R2 não propôs nada em nenhum dos 25.
- **"Afrouxa":** a trava existente (`r2.ts:200`) não foi exercida.

As formas de fora são todas. A família mais próxima de virar mecânica é a primeira (4 casos): é a mesma raiz do R2, só que sem `unbound variable`.

### Peça 7 · veredito das pausas de gate

Script `gabarito-pausa-gate.mts`; saída `.jsonl`.

| pausa | veredito | verdade humana |
|---|---|---|
| 762, 851 (05/10) | falso positivo | falso positivo (2 defeitos de spec independentes) ✔ |
| 760, 761 (05/10) | base vermelha: `test/migrations-policy-idempotente.test.ts` | base vermelha ✔ |
| 898, 741a (08/10) | base vermelha: `test/saude-chip-ficha.test.ts` | base vermelha (`useAcaoUnica`) ✔ |
| 741a, 707 (08/10) | base vermelha: `test/saude-chip-ficha.test.ts` | base vermelha ✔ |
| 801, 802 (04/10) | sem veredito (sinal de máquina nos dois) | ambiente: máquina ✔ (sem o sinal de máquina, sairia falso positivo e retomaria errado) |
| **1009, 953 (hoje, 17:41Z)** | falso positivo (`test/risco.test.ts` × `test/resolver-cliente-rota-comercial.test.ts`) | falso positivo ✔: às 14:55 o humano subiu `gate_streak_limite` de 2 para 4 (`655c916`, "falhas independentes em 2 tickets não pausam mais a fila") |
| 317, 391a (16/09) | falso positivo | sem registro |
| 406, 408 (17/09, 2×) | sem veredito (gate `criterio` não tem lista de arquivos) | sem registro |

**Certos: 6 de 6 com verdade conhecida.**

Com o limite 4 no Comarka, o sentinela passa a listar 4 tickets. "Em comum" é o arquivo que falhou em pelo menos dois deles, e há teste para isso.

**Retomar pode bloquear ticket por causa do defeito `2026-10-10-streak-zerado-na-pausa-bloqueia-na-retomada.md`?** Sim, se o veredito estiver errado.
- A pausa zera o streak (`gate_streak_reset` no fim do `gate_streak_pausar`).
- Retomada com a base ainda vermelha: o 1º ticket reprova duas vezes no mesmo gate, o circuit breaker por ticket dispara, o streak conta 1 (abaixo do limite) e o ticket vai a **bloqueado** em vez de pausar.
- A retomada automática só acontece com `falso_positivo`, isto é, nenhum arquivo em comum. Nesse caso a base não é a suspeita, e o risco fica restrito ao veredito errado.
- Com o limite agora em 4, um ticket bloqueado assim conta como 1 de 4. O dano possível é esse ticket bloqueado (que o resolvedor depois trata como R5 D5 ou aviso), não a fila.
- O gabarito não tem falso positivo retomado com a base vermelha. O 801/802 (máquina) é o caso que um veredito sem a checagem de máquina teria errado.

## Firme errado no corpus antigo

**Zero firme errado novo.**
- Os gabaritos e a matriz da 7f-b1 à 7f-b4 continuam iguais: os testes de aceite, de gabarito e de controle de done passam sem mudança de asserção.
- As regras novas não produzem firme: a R8 é `firme: false` e só diagnóstico, e o veredito da pausa não é classe do triador.

**Achado fora disso:** o 762 da medição da peça 4 (a) é **firme errado da D6 que já existe**, num caso que não estava no corpus antigo. Está em PECAS como pendência.

## Contrafactual atualizado

Script: `contrafactual.txt`. Cenário: R1/R5 em auto contando só o que sairia igual ao humano, mais `pausa_gate` em auto.

| cenário | 14 dias: dias com intervenção | 14 dias: maior sequência limpa | 30 dias: dias com intervenção |
|---|---|---|---|
| real | 12 | 2 | 28 |
| R1/R5 auto (só os iguais da peça 4 a) | 12 | 2 | 28 |
| + `pausa_gate` auto (retoma o 762/851) | 12 | 2 | 28 |
| + writeback, motor e config resolvidos (o otimista da medição) | 9 | 3 | 25 |

**Esta etapa não tira nenhum dia de intervenção.**
- Peça 3: diagnóstico. Peça 4: trava. Ambas por decisão.
- Os dias que sobram têm edição de critério ou de dependência, ou "outro", junto. O R1 cobre só uma parte da allowlist.
- O dia do único falso positivo de streak na janela de 14d (05/10) teve mais 8 intervenções.

## O que o Lucas precisa decidir

1. **`pausa_gate` do Comarka** no `repos.json`.
   - Padrão `sombra`: avisa com o veredito e diz o que faria.
   - `auto`: retoma sozinho só o falso positivo, no máximo 1 por 6 h e nunca o mesmo par.
   - Recomendo `sombra` por alguns dias. O gabarito é 6/6, mas pequeno, e o defeito do streak segue aberto.
2. **`notificar.imessage`** no topo do `repos.json`: o destinatário. Sem ele, só a notificação do macOS.
3. **R8 (allowlist sobreposta):** segue em diagnóstico (não há modo para promover).
   - A direção decidida contraria o humano nos 2 casos do gabarito. Trocar para "o que já reprovou espera o outro"?
   - Mesmo assim, 261 pares em 30 dias é ruído demais para firme.
4. **D6 no 762:** aceitar, ou apertar a D6?
5. **R2:** as formas de fora são todas (25 de 25). O propositor com modelo vira peça futura, se você quiser.
   - A família "o `grep -c` sai 1" (4 casos) pode virar uma segunda forma mecânica do R2, de graça.
6. **Ordem do merge:** a 7f-b5 parte de `66346fe` (a 7f-b4 inteira). Depois do merge, a reinstalação do job da 7f-b4 continua pendente (`docs/PECAS.md`).

Não há `corrida-r2.cmd`: a peça 5 virou replay gratuito. Nenhum merge foi feito.
