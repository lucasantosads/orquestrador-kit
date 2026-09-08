# CHANGELOG v2 (set/2026)

## O que mudou em relação à v1
- 4 fases explícitas: Arquitetar (Fase 0, BMAD enxuto + Superpowers, `/arquitetar`), Fundação (Fase 1), Loops (Fase 2), Promoção (Fase 3).
- Fase 2 autoalimentada: planejador (frentes → candidatos), sentinela (sinais → candidatos de bug), gate de ticket em 7 passos com teste vermelho, tudo como fases da mesma drenagem sob o mesmo lock.
- 8 regras novas (13 a 20) pagas por design, marcadas como rebaixáveis se a evidência contradisser.
- Custo como gate (orçamento diário e por ticket), escada de modelos por papel, context pack com cap, repo map, prefixo estável para cache, retry com diagnóstico estruturado, juiz em dois níveis, saída compactada, executor sem narração.
- Estados novos: `candidato`, `descartado`, `refatiar`. `adiado` continua evento.
- Templates novos: MAPA.md, mapa.json, ADR.md, arquitetar.md, decisoes-pendentes.md, relatorio-promocao.md, EXECUTOR.md. `config.json` com `$schema_versao: 2` mantendo os campos v1.
- Pré-voo ganhou a categoria 8; observabilidade ganhou CUSTO/PLANEJADOR/SENTINELA; setup ganhou o complemento v2.
- `references/ferramentas.md`: onde entram task-master, repo map do Aider, RTK, Superpowers, BMAD enxuto, Agent Canvas; o que fica fora (CrewAI, LangGraph, AI Gateway, BMAD completo).

## Falhas encontradas na revisão da própria v2 e corrigidas antes de publicar
1. `npm run` genérico como prefixo permitido alcançava `npm run deploy` (gasto real). Prefixos explícitos, filtros permitidos, tokens proibidos, curl só localhost, path de harness proibido em qualquer segmento.
2. Hash do candidato sem `dependencias` descartava a reemissão legítima com dep acrescentada (contradizia o passo 5 do gate). Deps entram no hash.
3. Staging vermelha por flaky ou push externo travaria a fila inteira (todo ticket reprovaria no gate de testes por culpa alheia). Congelamento seletivo (só tickets de sentinela), detecção de flaky com 3 execuções e proposta de quarentena via decisão humana, fetch + fast-forward antes da worktree.
4. Critério `alvo` podia ficar verde entre o gate e a execução (outro ticket fez o trabalho) e o executor aprovaria "sem fazer nada". Re-teste vermelho por script antes de gastar; verde ⇒ `descartado ja_verde`.
5. Ticket humano criado depois do pré-voo nunca passava pelo gate. Passo 3a da drenagem roda os passos 1 a 6 antes de qualquer gasto; falha ⇒ `refatiar` + decisão pendente.
6. `refatiar` não tinha caminho de volta definido para origem humana nem para o planejador. Definido para os dois.
7. Teste tautológico (`expect(true)`) satisfaria o teste vermelho de um critério em arquivo `cria_novo`. Juiz de ticket e juiz de diff cobram teste que exercita o comportamento; EXECUTOR.md proíbe.
8. Executor recebia a SKILL.md inteira como "doutrina": prompt gordo e cache frágil. Extrato `EXECUTOR.md` de ≤ 60 linhas, checado no pré-voo.
9. Três nomes de config citados nas references não existiam no template (`max_tokens_contexto`, `reserva_planejador_pct`, `orcamento.campos_usage`). Alinhados.
10. Quarentena da sentinela dependia de "arquivo mergeado pelo loop" sem definir a fonte. Trailer `Orq-Ticket: <id>` no merge commit; leitura via `git log`, não via log do harness.
11. `--allowedTools` por path tratado como garantia. Rebaixado a conveniência; enforcement por diff continua a lei.
12. Critério HTTP (`curl localhost`) sem quem subisse o servidor. `servidor_local_cmd` obrigatório para manter o prefixo.
