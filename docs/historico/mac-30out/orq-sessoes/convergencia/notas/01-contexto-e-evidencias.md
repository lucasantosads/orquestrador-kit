# Contexto escrito + evidências a–d (leitura de 18/10)

Fonte: subagente de leitura. Comarka HEAD b9101cc; kit HEAD 85c49a6.

## Contexto
- revisao-comarka-vs-kit.md é de 21/09 (:1), não 24/09. Comarka melhor: B3 breaker por motivo (:114), E2 gate streak (:121), E4/F1 cooldown/timeout/5xx (:123-124), G1 sem-progresso persistente (:125), G2 prioridade (:126), H1 topologia (:128), M1 recon antes do agente (:139). Kit melhor: A2 diagnóstico JSON (:111), B1 worktree reaproveitada (:112), B4 slot monotônico (:115), C3 veredito ilegível adia (:118), E1 baseline (:120), I1 refatiar/numstat (:129), K2 lock.ts (:132), K5 writeback commitado (:135), L1 events.log (:138). Nenhum: J1 dono da worktree (:130). Comarka pior :226-243 (parser aprova ilegível :235). Top 5 :249-297. Não portar :309-321.
- levantamento-bloqueios.md (24/09): 165 tickets; classes :262-273; reescritor resolveria 86% do custo (:299-309); gate de ticket recusaria 91% do controle (:311-324); triador antes de DRENAGEM_FIM (:382-438).
- medicao: out/14d/ regenerada 18/10 01:11 (janela 04/10–17/10; resumo.json). medicao-comarka.md é de 11/10 (27/09–10/10).
  - C1 0 (maior 0 na janela); C2 74,0% (413/558); C3 12 (última lição 05/10 15:32).
  - 89 resgates = intervencao 77 + intervencao_embutida 12. Tipos: allowlist 22, critério 12, pausa_manual 9, motor 8, writeback 7, gate_streak 7, dependência 7, outro 6, pausa_gate_streak 5, reabertura 4, config 2. Resolvedor teria agido: não 67, sem dado 5, R1 11, R5 2, só R2 4.
  - 67 bloqueios; 72 h de loop parado (gate streak 29 h, manual 7 h, operacional 17 h).
- 7f-b6 (12/10): 31104d0 Comarka; autocommit leva arquivo inteiro (:97-112, 4b5dd2e, b988f6c 52 tickets); commits de tentativa sem ref (:85-95).
- 7f-b7 (18/10): Comarka retry no mesmo processo, ticket nunca fica pendente entre tentativas (:15-22); 22 resgates de allowlist todos com BLOQUEADO (:24-34); P1' 8264ad1, P2 04ad1e7, P3 37320b8, P5 1d59ce6, docs 85c49a6; pendente R1 não sobe NO_TETO (:301-304).
- VIGIA.md v2 18/10 (:1). Convivência :5-7; pode :11; não pode :12-14; pausa com dono não mexe, >2h vai ao Lucas (:33); órfã sem dono >30 min renomeia .orfa-HHMM (:34); pular se commit "orq-resolvedor:", diagnóstico <24h, em_execucao (:41); correções permitidas :43; trailer Orq-Vigia (:45). Não cita trailer Orq-Resolvedor (usa prefixo).
- kit migracao-comarka.md (02/10): 126 diferenças (:3-4); enforcement divergente ehComentario/ehArquivoDeTeste (:91-94); 10 GEN antes de migrar (:131-140); PORTE-PENDENTE 6307912, bed7c14 (:164-167).
- kit docs/defeitos/: 17 arquivos (2 pedidos, 2 BACKLOG, 12 ABERTO, 1 corrigido falta porte). Relevantes: elegibilidade-working-tree 16/10 (1171), writeback-da-promocao-fora-do-git, streak-confunde-defeitos (19,8 h), streak-zerado-na-pausa (741a), morte-por-sinal, arvore-suja-na-staging.
- CONTRATO.md 1790 linhas; índice §1 17, §2 84, §3 127, §4 161, §5 395, §6 444, §7 510, §8 542, §9 654, §11 860, §12 948, §13 1006, §14 1199, §15 1375, §16 1450, §17 1522, §18 1649, §10 1775.
- CHANGELOG: falta entrada 7f-b6 (48c031a está na main).

## (b) CONFIRMADA, ainda vale — linhas atuais avaliador.sh:174-185
- :166-172 pega linha com "aprovado" e jq has("aprovado"); :174-184 fallback grep `"aprovado": (true|false)` → `APROVADO=true` "(json ilegivel; aprovado recuperado)"; só sem nenhum booleano exit 30.
- local-loop.log:17531 done por esse caminho; :10968-10970 false recuperado (273).
- test-parser-verdict.sh:22-40 testa cópia inline de parse_verdict_json que não existe mais no executor.sh.
- Kit juiz.ts:501-519 extrairVeredito exige objeto balanceado (:536+); null → rc 3 (:592-597) → executor.sh:771-777 JUIZ veredito=ilegivel → adiado juiz_ilegivel (test/orquestrador-juiz.test.ts:90-99). Lacuna: sem caso de JSON truncado.

## (c) CONFIRMADA
- 1361 :19 objetivo de concatenação; done :97.
- Comarka enforcement.sh:34,:39; enforcement-core.ts:209 exclui só prosa (ehProsa :126-128); comentário isento :226; ehArquivoDeTeste :171-173 isenta só ddl_em_c0 (:228); APPLY_MIGRATION :189-190 roda em test/ (:232-234).
- Kit enforcement-core.ts: sem ehArquivoDeTeste/ehComentario; classificaArquivo :258-262; APLICA_MIGRATION mais largo :265-266; :731-735; ehTesteSql só .sql (:385-390, :703-710). Kit é igual ou pior aqui (também pegaria comentário).

## (d) CONFIRMADA, coordenação de mão única
- Vigia evita resolvedor (VIGIA.md:41); resolvedor não lê nada da vigia (0 "vigia" em scripts/ e CONTRATO).
- Travas do resolvedor: resolver.lock (caminhos.ts:8,:105; passada.ts:184-186); só status bloqueado (triar.ts:207; passada.ts:91-109); git livre (repo.ts:142-162); ticket mudou desde a leitura (repo.ts:185); tentativaNova (repo.ts:107-137); commit --only (repo.ts:189,:196-199); trailer (repo.ts:164; acoes.ts:143); teto só no ledger próprio (acoes.ts:71,:85-94).
- 0 commits Orq-Vigia/vigia: desde 10/10 → sem dado de colisão real.
- Terceiro ator: executor do Comarka amplia allowlist por teste vizinho desde 457856c (executor.sh:56-75, :436-449), sobrepõe R1.
- Pausas: resolvedor retoma pausa de gate (passada.ts:206-213); vigia renomeia órfã (VIGIA.md:34); nenhum confere o outro.
