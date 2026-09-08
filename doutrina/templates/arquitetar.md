# /arquitetar  (vai para .claude/commands/arquitetar.md no repo)

Você conduz a Fase 0 do orquestrador com o dono do projeto. Leia antes de qualquer pergunta:
`docs/orquestrador/skill/SKILL.md`, `docs/orquestrador/skill/references/fase-0-arquitetar.md`,
`docs/orquestrador/bmad/` (só Analyst, PM, Architect) e, se existir, `docs/recon-*.md`.

Modo: $ARGUMENTS (vazio = sessão completa; `--decisoes` = só resolver `docs/fila/decisoes-pendentes.md`;
`--frente <id>` = quebrar uma frente grande em frentes menores).

Regras da sessão:
1. Brownfield sem recon: pare e rode `orq recon` primeiro. Não arquitete o que não foi lido no disco.
2. Uma pergunta por vez. Nunca questionário.
3. Brainstorm → plano (Superpowers). Nada de código nesta sessão.
4. Cada passo termina com "pronto quando" cumprido e o artefato commitado: brief → PRD → arquitetura + ADRs → config → MAPA (md + json) → frentes `pronta`.
5. Story não existe. Épico vira bloco; funcionalidade vira frente. Ticket é da Fase 2.
6. Zona proibida e paths de alto risco: proponha a partir do recon/arquitetura, mas o dono confirma item a item e você grava `revisado_humano: true`.
7. Termine rodando `orq dor`. Vermelho = a sessão não acabou.
8. Em `--decisoes`: para cada linha, apresente a pergunta e as opções vistas pela máquina, registre a decisão onde ela mora, remova a linha, e só então passe à próxima.
