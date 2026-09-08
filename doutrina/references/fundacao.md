# Fase 1: fundação (gates que existem e medem)

O pré-voo (`pre-voo.md`) reprova por definição num repo novo: não há suite, baseline nem build. E a doutrina proíbe o loop montar o próprio harness (regra 20). Logo a fundação é feita **na sessão interativa do dono**, imediatamente depois da Fase 0, com o checklist abaixo. Termina em **pré-voo GO total** ou não termina.

Princípio: gate que valida uma árvore que não é a de produção é falso-verde. Toda divergência entre local, CI e produção é registrada em `docs/orquestrador/PLAYBOOK.md` antes do primeiro run.

## Checklist greenfield (repo novo)

Ordem obrigatória; cada item com "pronto quando".

| # | Item | Pronto quando |
|---|---|---|
| G1 | Scaffold da stack decidida na arquitetura (ADR) | `git ls-files` mostra o scaffold commitado; lockfile único |
| G2 | Runner de testes com **1 teste real** (não `expect(true)`) | `gates[testes].cmd` roda verde e o teste falha se a função testada for quebrada de propósito |
| G3 | Typecheck rodando; baseline = 0 registrado no config | `gates[typecheck]` rc 0 |
| G4 | Build real (não só typecheck disfarçado) | `gates[build].cmd` rc 0 e gera artefato |
| G5 | Lint com regras em **erro**, não warning (ver migração abaixo) | `lint.cmd` rc 0 |
| G6 | **Teste do enforcement** (o gate que testa o gate): fixture de diff bom e diff mau | teste na suite; diff mau falha o enforcement |
| G7 | Identidade no `.env` (ref do banco/ambiente), `repo_origin_deve_conter` no config | pré-voo cat. 1 verde |
| G8 | Branch de staging criada da principal; principal protegida de push | pré-voo cat. 2 verde |
| G9 | `smoke_cmd` da sentinela existe e roda contra a staging (mesmo que só `curl` de saúde) | rc 0 em 1 execução manual |
| G10 | Estrutura da fila + `PAUSAR` ausente + `liberacoes.json` + `decisoes-pendentes.md` vazios | pré-voo cat. 6 verde |
| G11 | Repo map gerado (`orq mapa-repo`) e commitado | `docs/orquestrador/REPO-MAP.md` existe, ≤ cap de tokens do config |
| G12 | Scripts do harness (`setup.md` passo 4) com testes próprios | fixture trivial atravessa o loop ponta a ponta |

## Checklist brownfield (repo existente)

Mesma lista; o que já existe vira "confirmar", o que falta vira remediação. Diferenças que importam:

| # | Item | Regra brownfield |
|---|---|---|
| B1 | Baseline de typecheck **medido hoje** (número + regex de escopo) | nunca 0 chutado; o gate compara contra o baseline |
| B2 | Suite existente: identificar testes mortos, `skip`, flaky | flaky vai para quarentena (`testes_quarentena` no config) antes do primeiro run; um teste flaky no gate reprova trabalho bom aleatoriamente |
| B3 | Lint: migração warning → erro **rastreada** | não subir tudo de uma vez. Regra por regra, cada uma num commit, com contagem antes/depois no PLAYBOOK. O loop só herda regras já em erro |
| B4 | Zona proibida a partir do recon | toda tabela que outro sistema escreve entra; na dúvida, proíbe |
| B5 | Dívida em paths de frente `pronta` | se a frente toca código com > N erros de lint/tipo, abrir ticket humano de saneamento ANTES de marcar `pronta` |
| B6 | Migrations: faixa livre no disco E sem reserva documental | pré-voo cat. 5 |
| B7 | Loop v1 já instalado | migrar config para `$schema_versao: 2` (campos novos com default desligado), rodar pré-voo cat. 8, manter planejador/sentinela `ativo: false` até maturidade |

## Migração warning → erro (padrão emprestado do toolkit de quality gates)

1. `orq lint-censo` conta warnings por regra e grava `docs/orquestrador/lint-censo.json`.
2. Escolher a regra com **menor contagem e maior risco**. Um ticket **humano** por regra: zerar + subir para erro no mesmo commit.
3. Depois de cada regra, o censo é regravado; a diferença é a evidência.
4. Regras ainda em warning ficam fora do gate do loop (`lint.cmd` roda com `--max-warnings` alto ou só regras em erro). O loop nunca vê warning como falha nem como permissão.

## O que a fundação NÃO faz

- Não gera tickets de produto. Fila continua vazia até a Fase 2.
- Não liga planejador nem sentinela. Ambos nascem `ativo: false`.
- Não decide stack. Isso é ADR da Fase 0. Se a fundação descobre que a stack decidida não roda, volta para a Fase 0 com a evidência.

## Saída da Fase 1

`docs/fila/runs/pre-voo-<data>.md` com GO em todas as categorias (0 a 8). A partir daqui: `setup.md` passo 5 (agendamento) e 6 (primeiros tickets, escritos por humano, 2 a 3, leitura pura). O planejador só entra depois da maturidade do executor (tabela na SKILL).
