# Etapa 2.2.0 · relatório (vermelho antes, verde depois)

Fonte: SPEC de operação autônoma do repo instalado (DEC-034 a DEC-037). Base: motor 2.1.8
(`cdaa10d`). Branch: `conserto/2.2.0`. MELHORIAS: M-46, M-37, M-36, M-42, M-29.

Vermelho = o teste novo rodado contra o motor 2.1.8 (código da 2.1.8, teste da 2.2.0).
Verde = suíte completa na ponta da branch: 160 arquivos, 2141 testes, 0 falhas;
`scripts/kit/test-instalar.sh` "TODOS OS CHECKS PASSARAM"; `tsc --noEmit` limpo.
Base 2.1.8: 2092 verdes e 1 falha (peça 3 do job do resolvedor, A1-3).

| Item | Teste | Vermelho contra a 2.1.8 |
|---|---|---|
| A1-1 lock órfão | `orquestrador-220-lock-orfao.test.ts` | 2 falhas: `Cannot find module .../lock.js`; o lock órfão nunca é recuperado |
| A1-2 grupo do claude_run | `orquestrador-220-claude-run-grupo.test.ts` | "neto sobreviveu ao corte do claude_run" |
| A1-3 peça 3 do resolvedor | `orquestrador-resolvedor-job-claude.test.ts` | `expected +0 to be 1` (claude no diretório do node do nvm) |
| A1-4 EPIPE | `orquestrador-220-gate-epipe.test.ts` | `spawnSync /usr/bin/grep EPIPE` |
| A1-5 pré-voo antes do lock | (teste já existente) | passa na 2.1.8: a falha da run veio do diff do ticket; sem mudança |
| A1-6 loop morto | `orquestrador-220-loop-morto.test.ts` | ESTADO sem "loop morto desde HH:MM (pid N)" |
| A1-7 tsc num repo Next | `orquestrador-220-tsc-next.test.ts` | `error TS2741` e `TS2769` em gate-ticket.ts e resolvedor/r2.ts |
| A1-8 orq custo | `orquestrador-220-orq-custo.test.ts` | só o dia corrente (`CHAMADAS 0`), sem o último dia com registro |
| A1-9 orq em worktree | `orquestrador-220-orq-worktree.test.ts` | lia a fila do principal, não a da worktree |
| A1-10/A1-11 pré-voo | `orquestrador-220-prevoo-ambiente.test.ts` | 3 falhas: sem cat.11 nem cat.12; `instalar.sh --atualizar` não acrescenta `node_modules` |
| A1-12 teste que falhou | `orquestrador-220-gate-teste-falho.test.ts` | `testesQueFalharam is not a function`; sem `teste=` no REPROVADO |
| A1-13 orq drenar | `orquestrador-220-orq-drenar.test.ts` | `subcomando desconhecido: drenar` |
| A1-14 arquivo solto | `orquestrador-arquivo-solto.test.ts` (caso novo) | `fora_do_pathspec` com a tabela fora da zona nomeada |
| P1 planejador | `orquestrador-220-planejador.test.ts` | `autonomo.js` não existe |
| P2 promotor | `orquestrador-220-promotor.test.ts` | `autonomo.js` não existe |
| P3/P4 avisos e relatório | `orquestrador-220-avisos.test.ts` | `autonomo.js` não existe |
| ciclo no local-loop | `orquestrador-220-ciclo.test.ts` | rc 127 (etapas do ciclo ausentes) |
| D1 contexto_juiz de dependência do lote (ciclo 5) | `orquestrador-220-planejador-lote.test.ts` | `expected [ { id: '002', motivo: 'gate' } ] to deeply equal []` |
| D2 fecha_com com lote parcial (ciclo 5) | `orquestrador-220-planejador-lote.test.ts` | `expected [ '001' ] to be undefined` |
| D3 merge suspenso pela pausa nunca retomado (ciclo 5) | `orquestrador-220-merge-retomado.test.ts` | `frente/961` fora da alvo depois da drenagem sem pausa (controle com pausa verde) |
| config | `orquestrador-220-config.test.ts` | `Cannot read properties of undefined (reading 'modo')`; chaves ausentes |

Testes antigos ajustados de propósito: `orquestrador-gate-ticket.test.ts` (status `candidato` e
`descartado`), `orquestrador-toolchain-tsx.test.ts` (17ª chamada `ORQ_TSX`: o `autonomo()` do
local-loop), `orquestrador-gates-l11.test.ts` e os gabaritos `test/fixtures/m69/ouro/*-vermelho-gate-falha.txt`
(linha `# teste que falhou:` do A1-12, igual em todos os modos de seleção), KF-P5 (só a cat.12
pode dizer NO-GO pelas branches da máquina).

Não entrou: `orq promover <id>` (candidato de dry_run para pendente).
