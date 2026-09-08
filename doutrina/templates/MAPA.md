# MAPA do roadmap: <projeto>

> Fonte única do roadmap, junto com `mapa.json` (máquina). `orq mapa lint` confere que os
> IDs daqui e de lá são os mesmos. Espelhos externos (Notion, task-master) recebem writeback;
> nunca o contrário. Só o dono edita blocos e frentes; a automação só escreve `status`.

## Convenções
- Bloco = épico do PRD. Tem DoD verificável por humano em uma sessão.
- **ID de ticket é ordem de fila, sequencial global — nunca faixa por bloco.** O loop drena em
  ordem de ID, então faixa por bloco vira prioridade por bloco (o B1 inteiro na frente do B2,
  porque começa com 1). Prioridade é decisão de produto e tem de ser explícita. A pertença mora
  nos campos `bloco` e `frente` do JSON do ticket.
- Frente = unidade que o planejador decompõe. Tem allowlist comum, deps por ID e status.
- Ticket = único nível que entra na fila. Nasce na Fase 2 pelo planejador (ou humano).
- Status de frente: `rascunho` → `pronta` → `em_andamento` → `concluida` | `bloqueada_humano`.
- No máximo 2 frentes `pronta` por bloco; frente `pronta` só com deps `concluida`.

## B1 · <nome do bloco>
**Por que existe:** <uma frase do PRD>
**DoD (gate humano):** <o que o dono abre/clica/consulta para dizer pronto>
**Gates humanos:** <migrations a aplicar, tokens `humano:<token>`, revisões>

| Frente | Entrega | Allowlist comum | Deps | Status |
|---|---|---|---|---|
| B1-F1 | <o que entrega, verificável> | `src/<mod>/**`, `test/<mod>/**` | nenhuma | pronta |
| B1-F2 | <…> | `src/<mod2>/**` | B1-F1 | rascunho |

## B2 · <nome>
…
