# Defeito: a pausa não guarda o pid do dono e não se reconhece órfã quando ele morre

Origem: comarka-operacional, 15 e 17/10/2026. Fontes: `docs/historico/projeto-claude/HANDOFF-15out-loop-apolo.md` ("Uma publicação por vez... Duas sessões publicando juntas = 'interrompido por sinal'", linha 50) e `docs/historico/projeto-claude/HANDOFF-17out-tarde-migrations-lote38.md` ("Publish do lote4-comercial... morto às 14h20 sem chegar na origin; pausa órfã renomeada para `.orq-pause.orfa-lote4-1404`", linha 6), ambos daquele repo. Achado pela leitura dos handoffs (lote 6, item L6-03, `~/orq-sessoes/leitura-videos/lote-6.md`), registrado na etapa MELHORIAS-0. Estado: **aberto**. Nenhuma mudança de motor foi feita por esta nota.

Só a parte do motor está aqui. A trava "uma publicação por vez" do `publicar.sh` é script do Comarka e fica lá (`docs/MELHORIAS.md`, "Fora do motor").

## O que aconteceu

| quando | fato | evidência |
|---|---|---|
| 15/10 | a regra "uma publicação por vez, conferir que `.orq-pause` não existe" vivia só no texto do handoff; duas sessões publicando juntas terminaram em "interrompido por sinal" | HANDOFF-15out-loop-apolo.md:50 |
| 17/10 14:20 | o `publicar.sh` do lote4-comercial morreu sem chegar na origin e deixou a `.orq-pause` global com `dono: publicar.sh`, segurando os dois loops (plataforma e apolo) | HANDOFF-17out-tarde-migrations-lote38.md:6 |
| 17/10, depois | uma sessão percebeu e renomeou o sentinela para `.orq-pause.orfa-lote4-1404` | idem |

Um caso anterior com o mesmo desenho está em `docs/defeitos/2026-10-16-elegibilidade-working-tree.md` (§Concorrência, o resto `docs/fila/.orq-pause.orfa-1937` de 14/10). Aquele defeito pede pausa com dono e "publicar só remove a própria"; este pede o que falta depois disso: reconhecer que o dono morreu.

## Estado no kit (28/10/2026, por leitura, nada executado)

- O sentinela é uma linha `<AAAA-MM-DD HH:MM> | <motivo>` (`scripts/orq:431-436`, `cmd_pausar`; leitura em `scripts/orquestrador/lib.sh:1024-1033` e `scripts/orquestrador/orq-painel.py:563-580`). Não há campo de pid nem de host.
- O dono é texto livre dentro do motivo (`dono: X`), lido só pelo resolvedor (`scripts/orquestrador/resolvedor/pausa.ts:91`, `donoDe`).
- Pausa com dono da lista `pausa_donos` (padrão `publicar.sh` e `promocao-apolo`, `scripts/orquestrador/resolvedor/modos.ts:46`) é tratada como planejada: o aviso é silenciado (`resolvedor/pausa.ts:192-195`) e só sai, uma vez, depois de `pausa_dono_max_min` (30 min, `modos.ts:48`; `pausa.ts:179-184`, `pausa_longa`).
- Resultado: o cenário de 17/10 no kit, com o `publicar.sh` morto, fica **silencioso por 30 min** e depois vira "pausa longa", nunca "órfã". O loop segue parado até um humano olhar. `orq-pause.sh --off` remove as duas sentinelas sem olhar o dono (`scripts/orquestrador/orq-pause.sh:22-38`).

## Comportamento pedido

1. A pausa gravada por um processo (script ou sessão automatizada) leva o pid e o host do dono num campo fixo da linha, por exemplo `<data> | dono: publicar.sh | pid: 4242@<host> | motivo: <texto>`, gravada por uma função só, a mesma que `orq pausar` e `orq-pause.sh` usam. Pausa humana sem pid continua válida e nunca vira órfã.
2. Quem lê a pausa (resolvedor e painel) testa o pid quando o host é o da máquina: pid que não existe mais = pausa **órfã**. Órfã avisa na hora, sem esperar `pausa_dono_max_min`, com `pausa_orfa` no ledger e "órfã (dono X morreu)" no painel.
3. Ninguém apaga a órfã sozinho nesta peça: a remoção continua humana (`orq retomar`), agora com o motivo certo. Retomar sozinho é decisão posterior, depois de medir.
4. Pid de outro host não é testado (não dá para saber); fica como pausa com dono comum.

## Critério executável

- Fixture: repo com `docs/fila/PAUSAR` contendo `dono: publicar.sh | pid: <P>@<host local>`, onde `<P>` é o pid de um `bash -c 'echo $$'` que já saiu. Uma passada do aviso de pausa do resolvedor grava `tipo: pausa_orfa` no ledger e notifica (stub do `osascript`), na primeira passada.
- Vermelho antes: o mesmo fixture contra o motor de hoje grava `tipo: pausa` com `notificacao: silenciada` e nenhum aviso até `pausa_dono_max_min`.
- Contraprova 1: com `<P>` de um `sleep 300 &` vivo, sai a pausa com dono silenciosa de hoje.
- Contraprova 2: pausa sem `pid:` (a de `orq pausar` manual) se comporta como hoje.
- Contraprova 3: `pid:` com host diferente do local não vira órfã.
