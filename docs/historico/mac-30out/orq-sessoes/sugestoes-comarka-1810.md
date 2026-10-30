# Sugestões ao motor do Comarka (18/10/2026)

Para o chat ou sessão do Comarka aplicar, com commit prefixado `MOTOR:`. Origem: leitura do motor em `b9101cc` (`~/orq-sessoes/leitura-1810/inv-comarka.md`) e a medição de 04 a 17/10. Ordem por resgate atacado.

| # | Sugestão | Evidência | Ataca |
|---|---|---|---|
| S1 | `compara()` do validar-fila igual ao `criterio_match` do harness (igualdade ou regex, nunca substring) | `validar-fila.py:87-91`; espera `3` com saída `13` passa no validador e reprova no loop | critério (12) |
| S2 | `run()` do validar-fila captura `TimeoutExpired` e mata o grupo de processos | defeito `2026-10-07-validar-fila-timeout-deixa-tsc-orfao` no kit | commit travado |
| S3 | Camadas 6, 7, 9, 13 e 14 como erro para ticket novo (`REGRAS_NOVAS_COMO_ERRO`) depois de medir FP nos done | hoje `False` | critério e allowlist |
| S4 | Autocommit do status só commita o arquivo se a mudança for só nos campos de status do bloco JSON; senão pula e avisa | 12 dos 89 resgates eram edição humana de spec levada junto | autocommit (12) |
| S5 | `liberacao_ok` lê `liberadas[]` e `tokens[]` como o painel | `lib.sh:155-159` | dependência |
| S6 | Dependência de ticket `obsoleto` conta como resolvida, com aviso | dependência nunca resolve | dependência (7) |
| S7 | Antes de contar gate_streak, rodar o gate que falhou na `staging-auto` sem o diff; base vermelha não conta streak nem pausa | 3 de 7 gate_streak eram base vermelha | gate_streak (29 h) |
| S8 | `overloaded`/529 fora do `RATE_LIMIT_REGEX`; executor chama `is_transitorio` antes de armar cooldown; ler o horário de reset | `lib.sh:387-391`, `executor.sh:600` | fila parada 60 min por falso limite |
| S9 | Juiz ilegível (exit 30) conta no disjuntor ou vira reprova após N adiamentos | adiamento infinito | fila parada |
| S10 | Juiz roda na worktree do ticket (ou com `--add-dir` dela), não no `orq-runner` congelado | `avaliador.sh:133`, `enforcement.sh:47` | reabertura (juiz errado) |
| S11 | Pré-voo checa `claude auth status` e alarma login expirado | pausa de 17/10 por login | pausa manual |
| S12 | `promover-plataforma.sh` em `SCRIPTS_DO_LUCAS` da guarda | `guarda-ferramenta.py:133` | segurança |
| S13 | Guarda bloqueia Grep em `.env*` (a ferramenta Grep está fora do matcher) | matcher `Bash\|Read\|mcp...` | segurança |
| S14 | `--output-format json` no executor e no juiz para registrar custo | medição com custo "sem dado" | custo |
| S15 | `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` e `--permission-mode dontAsk` explícito | memória por repo compartilhada entre worktrees | determinismo |
| S16 | `rules/apolo.md` com `paths:` | carrega em toda sessão, inclusive executor da plataforma e juiz | contexto |
| S17 | Lock com PID e idade (usar o `lock.ts` que já existe); `em_execucao` órfão volta a pendente | lock `mkdir` sem dono | travamento |

Não sugerir: ignorar as settings do projeto (desliga a guarda do `6bea005`).
