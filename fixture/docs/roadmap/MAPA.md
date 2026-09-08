# MAPA do roadmap: orq-fixture

> Fonte única do roadmap, junto com `mapa.json` (máquina). `orq mapa lint` confere que os
> IDs daqui e de lá são os mesmos. Um bloco, uma frente: o fixture existe para atravessar o
> loop, não para ter roadmap.

## Convenções
- Bloco = épico. Tem DoD verificável por humano em uma sessão.
- Frente = unidade que o planejador decompõe. Tem allowlist comum, deps por ID e status.
- Ticket = único nível que entra na fila.
- Status de frente: `rascunho` → `pronta` → `em_andamento` → `concluida` | `bloqueada_humano`.

## B0 · Aritmética mínima
**Por que existe:** o ticket 001 precisa pertencer a uma frente; sem bloco e frente o lint do mapa não tem o que conferir.
**DoD (gate humano):** `npx vitest run` verde e `npx tsc --noEmit` limpo, com as funções de `src/soma.ts` exercitadas uma a uma.
**Gates humanos:** nenhum — o fixture não depende de nada fora dele.

| Frente | Entrega | Allowlist comum | Deps | Status |
|---|---|---|---|---|
| B0-F1 | Funções puras de soma em `src/soma.ts`, com teste por caso | `src/**`, `test/**` | nenhuma | pronta |
