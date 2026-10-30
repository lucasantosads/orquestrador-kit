# Passo 0 — mapa (18/10)

Detalhes: 01-contexto-e-evidencias.md, 02-inventario-motor-comarka.md, 03-commits-motor-comarka.md, 04-inventario-motor-kit.md.
Linhas-chave conferidas à mão: kit local-loop.sh:805-822, gate-ticket.ts:76, lib.sh:121-123; Comarka local-loop.sh:374-393, avaliador.sh:174-184.

## Evidências a–d
- (a) confirmada: ba731d8 sem trailer levou objetivo do 1361 + cmd do 1371 e 1377. Comarka local-loop.sh:376/:388/:393 (e :350 no rebase). O kit tem o mesmo padrão (local-loop.sh:796-824): portar o motor não resolve isso.
- (b) confirmada, linhas atuais avaliador.sh:174-185; ocorrência real local-loop.log:17531. test-parser-verdict.sh testa cópia morta. Kit adia (juiz.ts:501-520 → juiz_ilegivel), sem teste de truncado.
- (c) confirmada. Comarka isenta teste só de ddl_em_c0 (enforcement-core.ts:228) e comentário (:226). Kit não tem nenhuma das duas isenções (só teste-SQL): no caso 1361 o kit é igual ou pior.
- (d) confirmada e de mão única: vigia evita resolvedor (VIGIA.md:41); resolvedor não lê vigia. 0 commits Orq-Vigia → sem dado de colisão. Terceiro ator: executor amplia allowlist por teste vizinho (457856c).

## Capacidades propostas para a matriz (26)
1 seleção, prioridade e dependências | 2 multi-fila | 3 pré-voo (drenagem e ticket) | 4 recon antes do agente | 5 montagem do prompt e contexto (rules, EXECUTOR.md) | 6 allowlist e guardas de ferramenta (PreToolUse × piso/perfil) | 7 allowlist de arquivos e teste vizinho | 8 critério executável | 9 enforcement por diff (isenções teste/comentário/prosa) | 10 gates e base vermelha/baseline | 11 diff-cap/refatiar | 12 juiz (parser, contexto, material, settings efetivo) | 13 retry, diagnóstico e escalada de modelo | 14 esforço por modelo | 15 causas, adiamento, cooldown, rate limit | 16 disjuntores (motivo repetido, sem-progresso, gate streak) | 17 evidência de tentativa (.prevK × tentativas/refs) | 18 writeback e autocommit (escopo do add, rebase, push, trailer) | 19 pausa (sentinelas, dono) | 20 publicação, merge e push por ticket | 21 staging e promoção (ritual, promover, checar-promocao) | 22 telemetria e custo | 23 trilha/events.log | 24 painel | 25 validação do ticket na criação (validar-fila × gate-ticket) | 26 agentes fora do loop (triador, resolvedor, vigia) e coordenação
