# Resumo: convergência Comarka × kit (18/10)
Relatório completo: ~/orq-sessoes/convergencia-comarka-kit.md. Kit 85c49a6; Comarka lido em b9101cc.

## F. Riscos ativos agora
- **F1. O juiz aprova veredito truncado.** O `"aprovado": true` é recuperado do texto cru (avaliador.sh:174-185). Já houve um done assim (local-loop.log:17531). O teste que deveria pegar isso testa uma cópia morta. Conserto: adiar com exit 30 (1 linha) + teste real. Quem: chat do Comarka.
- **F2. Juiz e sonda da plataforma rodam no orq-runner congelado em 3037d25, sem .claude/settings.json.** Ficam sem o esforço e sem a guarda; o runner do Apolo, recriado em 9357ca8, tem os dois. Conserto: o runner faz checkout do BRANCH_ALVO a cada drenagem (~3 linhas). Quem: chat do Comarka. Paliativo seu, com a fila pausada: apagar o orq-runner.
- **F3. Apolo ficou parado das 11:02 às 12:17.** O runner perdeu o registro no git e o 5242 foi bloqueado 3/3. Na recriação, um `say` no stdout corrompeu RUNNER_WT (local-loop.sh:107/:503). Conserto: say no stderr, recriar quando o registro some, travar o runner (~10 linhas). Quem: chat do Comarka.
- **F4. Falha de pré-voo vira "sem progresso" e queima ticket.** Casos: 5242 hoje e login expirado em 17/10, pausado à mão. Conserto: pausa com dono "preflight" + aviso, sem contar sem-progresso (~25 linhas). Quem: chat do Comarka.
- **F5. O autocommit leva o arquivo inteiro, nos dois motores.** No ba731d8 foram o objetivo do 1361 e os critérios do 1371 e 1377 (Comarka local-loop.sh:388/:393/:350; kit :816). Conserto: commitar só se o diff tocar apenas as chaves do loop (~40 linhas em cada). Quem: kit (L1) e chat do Comarka.
- **F6. O resolvedor não confere a branch antes de commitar** (repo.ts:179-202). Impacto até hoje: zero. Conserto: recusar branch diferente da protegida (~10 linhas). Quem: kit (L2).
- **F7. O 1360 está done só na staging-auto.** O config da main ainda tem apelidos; o efeito do esforço por modelo é sem dado. Quem: você (publicar ou promover).
- **F8. A pausa manual é retirada por terceiros.** Em 16/10 foi regravada 3 vezes; publicar/ritual e o `--off` do resolvedor removem pausa alheia; são 9 resgates. Conserto: só o dono retira. Quem: chat do Comarka e kit (L2).
- **F9. O publicar.sh não espera o lock do Apolo** (:134), e a guarda não lista promover-plataforma.sh. Quem: chat do Comarka.
- **F10. Há 51 worktrees fantasmas "locked initializing" do validar-fila** (sessões Cowork de 17/10). Conserto: desfazer o registro quando o add falha. Quem: chat do Comarka; a limpeza é sua.
- **F11. Os alarmes de crontab não olham o Apolo**: o F3 passou sem aviso. Quem: chat do Comarka.

## Primeiros 5 lotes de porte para o kit
1. **L1. Autocommit restrito às chaves do loop**, ~60 linhas. Vermelho-antes: o 1361 do ba731d8.
2. **L2. Travas do resolvedor**, ~70 linhas: confere a branch; tira só a pausa de gate, nunca a com dono; trata Orq-Vigia e edição humana como "humano mexeu". Vermelho-antes: as pausas de 16/10.
3. **L3. Enforcement e liberações**, ~90 linhas: isenção de teste e de comentário no enforcement; RE_TOKEN aceita c0-migration-<nome>. Vermelho-antes: diff.raw de runs/1361/attempt-1.prev1.
4. **L4. Prioridade + dependência entre filas na leitura**, ~150 linhas. Vermelho-antes: 1360 com prioridade 20; 1322→5225 e mais 3 dependências do Apolo.
5. **L5. Regex de limite do 6ad8fbd + --effort por papel**, ~50 linhas.

Em paralelo: **LS, o modo sombra** (~250-300 linhas, sem escrever no Comarka). Começa pelo enforcement sobre os runs de 04 a 17/10.

## Primeiras 5 sugestões ao Comarka (texto completo, pronto para colar, na seção C)
1. **Base vermelha + chave do gate streak por teste falho**: 12 resgates e 29 h parado, ~80 linhas.
2. **Critério com $BASE_REF**: regra que vale também para staging-apolo, _TEMPLATE atualizado, camada contra origin/ no validar-fila. 12 resgates de critério.
3. **Só o dono retira a pausa**: 9 resgates, ~25 linhas.
4. **Autocommit só das chaves do loop**: 7 resgates de writeback + ba731d8, ~40 linhas.
5. **Runner que segue a staging e sobrevive a poda** (F2 e F3), ~15 linhas.

## DECIDIR
- D1. Recon divergente vira obsoleto ou bloqueado?
- D2. Teste vizinho: ampliação no loop, R1 do resolvedor, ou os dois (com o R1 lendo allowlist-ampliada.txt)?
- D3. Push da staging por ticket entra no kit como opção de config?
- D4. A promoção (ritual, publicar, promover, checar-promocao) entra no kit ou fica por repo?
- D5. Como o C0 vira zona_proibida: ghl_comercial e dashboard_readonly como no_write_tables? Como representar os_owned_excecoes?
- D6. sha inicial da sincronização: 28162a9 (recomendado; os 52 commits ficam pendentes) ou b9101cc?
- D7. Quais camadas do validar-fila viram regra do gate-ticket, e com que severidade?
- D8. O kit precisa de gate streak, já tendo base vermelha?
