# Plano revisado do orquestrador (18/10/2026)

Destino sugerido: `~/orq-sessoes/plano-revisado-orquestrador-1810.md`. Substitui a seção 6 de `pesquisa-claude-orquestrador-out2026.md`.

Base: leitura do motor do Comarka (main `b9101cc`), do kit (main `85c49a6`), dos 25 relatórios de sessão mais recentes e dos CSV da medição de 04 a 17/10. Inventários completos: `inv-comarka.md`, `inv-kit.md`, `inv-sessoes.md`.

## O que mudou em relação à pesquisa

- Os itens da pesquisa atacam diretamente no máximo 3 dos 89 resgates medidos. O que impede o C1 é spec, autocommit, pausa e dependência, e não recurso do Claude Code.
- A guarda do Comarka (`guarda-ferramenta.py`) não é guarda de escopo: bloqueia SQL em C0, git perigoso e leitura de segredo. Ela está ativa no loop (o `6bea005` está em `staging-auto` e `staging-apolo`, conferido em 18/10).
- "Ignorar as settings do projeto" (R1) desligaria essa guarda no Comarka. O conserto é outro: o motor passa um `--settings` dele, e o Comarka continua com o settings de projeto até a sombra.
- "Testes existentes só crescem" reprovaria pelo menos 4 consertos legítimos (966, 854, 867, 840). Sai.
- Stop hook: 0 dos 89 resgates. Fica para depois.
- Quarentena de flaky: 1 dos 7 gate_streak. Fica pequena.

## Resgates de 04 a 17/10 e o que ataca cada classe

| Classe | Qtde | Causa medida | Peça |
|---|---|---|---|
| allowlist | 22 (18 reais) | teste acoplado fora da allowlist (762, 856, 711a, 950, 1006, 840), mais de um vermelho (924a, 1054, 1055b, 1058), teste por diretório ou contagem (854, 966), arquivo apontado só pelo juiz (318c), diff 0 (830) | P1 |
| critério | 12 | regex frágil (739, 900, 898), premissa errada (851, 707, 741), `grep -c &&` (2), `origin/` (1) | P2 |
| autocommit e writeback | 12 dentro dos 89 + 7 | o autocommit do status leva edição humana de spec junto; árvore suja na staging vira conflito (940, 932) | P3 |
| pausa manual | 9 (7 h) | 6 em 16/10 com a pausa sendo removida por outro ator; 1 login do claude expirado | P4 |
| gate_streak e pausa | 7 + 5 (29 h) | 3 base vermelha, 3 spec, 1 máquina, 1 flaky (801/802) | P5 |
| dependência | 7 | dependência de ticket `obsoleto` nunca resolve; `liberacao_ok` do Comarka lê só `liberadas[]` e o painel aceita `tokens` | P6 |
| motor | 8 | evolução esperada (Apolo, critério isolado, consertos de 13 a 17/10) | nenhuma |
| outros | 6 + 4 + 2 | colisão de ids com o Apolo, juiz errado no 867, config | P8 e caso a caso |
| loop parado | 72 h | Mac dormindo | decisão humana |

## Peças, em ordem de resgates atacados

**P1. Testes vizinhos na criação do ticket (até 18 resgates, também C2).**
O Comarka já detecta o teste vizinho (`457856c`), mas só depois de reprovar e uma vez por ticket. O kit tem o R1 do resolvedor, também depois do fato. Os dois descobrem a causa tarde. A peça move a mesma detecção (teste que importa ou cita por string um arquivo da allowlist) para o validador e o gate de ticket, como erro para ticket novo e aviso para ticket antigo. Junto entra uma semântica única de glob: hoje o Comarka tem três (bash e fnmatch deixam `*` atravessar `/`, o TS não).
Lado: kit (gate de ticket) e sugestão ao Comarka (`validar-fila`).

**P2. Critério na criação (até 12).**
Comarka: corrigir `compara()` no `validar-fila.py:87-91` (hoje é substring e o harness compara por igualdade ou regex, então o validador aprova o que o loop reprova); timeout no `run()`; promover as camadas 6, 7, 9, 13 e 14 de aviso para erro em ticket novo.
Kit: as regras de `grep -c &&` e `origin/` (P4 da 7f-b6, nunca escritas).
As premissas erradas (4 casos) não têm conserto mecânico; viram classe do triador.

**P3. Autocommit que não carrega spec (12 dos 89, mais parte dos 7 de writeback).**
O autocommit do status só pode tocar os campos de status do bloco JSON. Se o arquivo tiver qualquer outra mudança, ele não commita aquele arquivo e grava um aviso. E o defeito documentado da árvore suja lida como conflito (ticket aprovado no mérito que é bloqueado).
Lado: Comarka primeiro (é onde acontece, commit `MOTOR:`); o kit tem o mesmo defeito em `docs/defeitos/`.

**P4. Pausa com dono e login (9).**
Trilha de PAUSA e RETOMADA com quem pausou e quem removeu (pendente desde a etapa 7, nunca feita). No pré-voo, `claude auth status` checa o login, para que login expirado vire alarme e não pausa silenciosa.
Lado: kit e Comarka.

**P5. Base vermelha antes de culpar o ticket (até 4 de 7 gate_streak, 29 h).**
Antes de contar streak, rodar o gate que falhou na base (`staging-auto` sem o diff). Se a base está vermelha, a causa é `base_vermelha`: não conta streak e não pausa. Rerun do teste isolado como causa `flaky` (1 caso).
Lado: os dois.

**P6. Dependências que destravam (7).**
Dependência de ticket `obsoleto` conta como resolvida e grava um aviso. `liberacao_ok` do Comarka passa a ler `tokens` e `liberadas` igual ao painel.
Lado: Comarka (o kit já lê todas as formas de liberação).

**P7. Chamada endurecida (prevenção, 0 resgates medidos).**

| Item | Kit | Comarka |
|---|---|---|
| `--permission-mode dontAsk` explícito | falta | falta |
| `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` e `CLAUDE_CODE_FORK_SUBAGENT=0` | falta | falta |
| IDs de modelo fixos no lugar de alias | executor e juiz usam alias | todos usam alias; o `modelSettings` de effort é por ID e talvez nunca case com o alias |
| `--settings` do motor e `.claude/**` no piso | sem `no_write_paths` no template; `paths_harness` não é lido | manter o settings de projeto (a guarda depende dele) |
| `--output-format json` | já tem | usa `text`, por isso o custo da medição está "sem dado" |
| `env -u ANTHROPIC_API_KEY` | falta | usa `ANTHROPIC_API_KEY=""` e o `launchd-run.sh` exporta `~/.env.orquestrador` |

O spike confirma cada linha antes de virar código.

**P8. Juiz no lugar certo.**
Comarka: o juiz roda no `orq-runner`, que nunca avança (`avaliador.sh:133`, confirmado), então qualquer `Read` lê código velho.
Kit: o juiz roda na worktree depois do agente e carrega o `CLAUDE.md` e o `.claude/` que o agente deixou, inclusive arquivo ignorado pelo git que o enforcement não vê (inferência, vai para o spike).
Nos dois: `--json-schema` no veredito e calibração contra as reaberturas.

**P9. 429 e limite da assinatura por evento, com cooldown global.**
Comarka: `overloaded` e 529 ainda armam 60 min de cooldown (`lib.sh:391`, apesar do comentário). Juiz ilegível adia com cooldown para sempre, porque o disjuntor não conta adiamento.
Kit: o cooldown é por repo (`runs/.cooldown-until`), então os outros repos seguem batendo na mesma assinatura.
Conserto: cooldown em `~/.orq/` para a frota toda, classificado pelo `subtype`/`api_retry` e não por regex. Entra junto com a K15.

## Depois (sem dado de resgate que justifique agora)

Stop hook com gate rápido, sandbox nativo, OTel, saída curta do gate no retry, canário de versão. São boas práticas, mas nenhuma ataca uma classe medida.

## Decisões humanas

1. Mac dormindo (72 h de loop parado na janela): ajustar energia do Mac ou aceitar.
2. Assinatura x chave de API para juiz e triador (pesquisa, seção 4).
3. Versão do Claude Code: o CLI já se atualizou para a 2.1.302 sozinho; fixar versão no executor ou seguir o canal.
