# Spike: mod "guarda-escopo" no `claude -p` do executor

Data: 2026-10-10. Nada foi escrito em `~/Projetos/`, nada foi instalado e nenhum `claude -p` foi chamado. O que existe está em `~/orq-sessoes/spike-mods/` e em `/tmp/spike-mods-repo/`.

## PASSO 0

**1. Versão:** `2.1.296 (Claude Code)`. Mods exigem 2.1.287 ou mais.

**2. Chamada do executor** (`~/Projetos/orquestrador-kit/scripts/orquestrador/`):

- `executor.sh:980-983` (agente executor, em `run_attempt`):
  ```sh
  claude_run "$wt" "$saida" "$(cfg '.claude_timeout_secs')" -- \
    -p "$(cat "$prompt")" --output-format json --model "$modelo" \
    --max-turns "$turns" --allowedTools "$tools" \
    ${piso:+--disallowedTools "$piso"} || rc=$?
  ```
- `lib.sh:1400-1424` `claude_run`: `( set -m; cd "$dir" && exec claude "$@" ) > "$outf" 2>&1 &`, com watchdog TERM/KILL. cwd = worktree; stdout e stderr vão juntos para o mesmo arquivo.
- `$tools` = `tools_do_ticket` (`executor.sh:336-340`) → `decisao tools` → `perfil.ts:283` `toolsDoTicket`. A base é `BASE_TOOLS` (`perfil.ts:19-36`): `Read,Edit,Write,Glob,Grep,Bash(git add:*),Bash(git commit:*),Bash(git status:*),Bash(git diff:*),Bash(git log:*),Bash(git restore:*),Bash(ls:*),Bash(cat:*),Bash(mkdir:*),Bash(sed:*),Bash(grep:*)`, mais o que vem dos gates e critérios do ticket, filtrado pelo piso.
- `$piso` = `tools_proibidas` (`executor.sh:349`) → `proibicoes_absolutas.tools` do config. Vazio = a flag não é passada.
- `$turns` = `claude_max_turns` do config, 40 por padrão (`executor.sh:972-973`).
- Outras chamadas: juiz (`executor.sh:753-755`: `-p … --output-format json --model "$modelo" --allowedTools "" --max-turns 1`) e sonda do preflight (`executor.sh:177`: `-p "responda apenas: ok" --output-format json --model "$m"`).
- **Ausentes:** `--permission-mode`, `--settings`, `--bare`, `--safe-mode`, `--plugin-dir`, `--max-budget-usd`. Sem `--permission-mode`, o modo é `default`, e Edit/Write passam porque estão no `--allowedTools`.

**3. Documentação dos mods** (overview, create, events, reference, test, troubleshoot):
- **Evento que decide se a chamada roda: `tool.call`.** Ele dispara antes da ferramenta, e `next(e)` faz a checagem de permissão e depois executa. Para negar com mensagem, o hook retorna `{ deny: "texto" }` sem chamar `next`. Claude lê o texto como o resultado da ferramenta, e não abre prompt de permissão.
- `tool.check` é o evento de permissão: dispara depois das regras e dos settings hooks, e pode retornar `allow`, `ask` ou `deny`. **Não usado aqui**, porque o mod nunca aprova.
- Ordem em `tool.call`: `PreToolUse` gerenciado → mods (`tool.call`) → `PreToolUse` dos outros settings e dos plugins → regras de permissão → `tool.check`.
- Mods rodam em `claude -p` ("Hooks run: Yes") e entram por `--plugin-dir`. No `-p`, a recusa de carga vai para o stderr: `hooks module <nome> not loaded: <motivo>`.
- Hook que lança erro ou passa de 10 s é **pulado**, e a ferramenta roda. Para fechar em caso de falha é preciso um `.catch`, e o mod tem um.

## Flags e condições que podem desligar o mod

| Flag ou config | Efeito no mod | O executor usa hoje? |
|---|---|---|
| `--bare` | Doc: "installed plugins that are not managed load no hooks module in this mode (--bare)". O `--help` diz que `--plugin-dir` segue aceito. **O caso (c) decide.** `--bare` também exige `ANTHROPIC_API_KEY`. | não |
| `--safe-mode` | desliga plugins instalados e hooks | não |
| `disableAllHooks: true` em qualquer settings, inclusive `.claude/settings.json` **do repo/worktree** | desliga mods instalados | não controlado. É um settings de projeto, logo um dado do repo-alvo. |
| `allowManagedHooksOnly` / `allowManagedModsOnly` gerenciados | desliga | não há managed settings nesta máquina |
| `disableSideloadFlags` gerenciado | rejeita `--plugin-dir` na partida | não |
| Erro de carga do módulo | o `-p` **segue sem o guarda**, só com uma linha no stderr | (risco, ver abaixo) |

`claude plugin test` rodado numa pasta sem mod respondeu `no hooks module to load`. Pela tabela da doc, isso quer dizer que mods podem carregar nesta máquina. `~/.claude/settings.json` não tem `disableAllHooks`.

## O mod (`guarda-escopo/`)

- `.claude-plugin/plugin.json`, `hooks/hooks.json` (`modules: ["./register.ts"]`), `hooks/register.ts`, `tests/guarda-escopo.test.ts`.
- `on('tool.call', { tool: [Edit, Write, MultiEdit, NotebookEdit] })`. O caminho vem de `file_path`, ou de `notebook_path` no NotebookEdit. O mod resolve onde ele cai com `$.fs.stat(p, { resolve: true }).realPath` (symlinks seguidos, `..` dobrado). Um arquivo novo é resolvido pelo primeiro ancestral que existe, e o resto do caminho não pode ter `.` nem `..`. A raiz é o realpath de `$.session.root()`.
- Ordem das decisões: sem `ORQ_ESCOPO_FILE` → segue e registra. Escopo ilegível → nega. Não resolve → nega. Dentro da raiz: `.git` → nega; casa glob → segue; senão → nega. Em `/tmp` ou `/private/tmp` → segue. Resto → nega. A mensagem de negação é sempre `fora do escopo do ticket: <caminho>`.
- A raiz é testada **antes** de `/tmp`. Sem isso, o repo de teste, que fica em `/tmp`, deixaria tudo passar.
- Nunca retorna `allow`. As saídas possíveis são `next(e)` (vai para a checagem normal de permissão) ou `{ deny }`. Tem `.catch` que fecha: se o guarda falhar antes de decidir, nega.
- Log: uma linha JSON por decisão em `$ORQ_ESCOPO_LOG` (`ts, tool, caminho, real, rel, decisao, motivo`). Sem `ORQ_ESCOPO_LOG`, a linha vai para o debug log. A escrita é ler + reescrever, porque `$.fs` não tem append. Isso basta para uma sessão com chamadas sequenciais, mas não para vários processos no mesmo arquivo.
- MultiEdit **não existe** como ferramenta neste build (não está nos tipos de 2.1.296). O matcher o inclui mesmo assim, sem custo.

## `claude plugin validate ./guarda-escopo` (rc=0)

```
Validating plugin manifest: /Users/lucasantos/orq-sessoes/spike-mods/guarda-escopo/.claude-plugin/plugin.json

Validating hooks: /Users/lucasantos/orq-sessoes/spike-mods/guarda-escopo/hooks/hooks.json

  ❯ ./register.ts hooks: tool.call{tool=Edit|Write|MultiEdit|NotebookEdit}
  ❯ ./register.ts gating hook with .catch: tool.call{tool=Edit|Write|MultiEdit|NotebookEdit}
  ❯ ./register.ts calls: $.env.get (via decidir, registrar), $.fs.read (via decidir, registrar), $.fs.stat (via decidir, situar), $.fs.write (via registrar), $.session.root (via decidir), $.ui.log (via registrar)
  ❯ ./register.ts env writes: nothing
  ❯ ./register.ts env reads: ORQ_ESCOPO_FILE, ORQ_ESCOPO_LOG

✔ Validation passed
rc=0
```
A primeira rodada deu um aviso (`author: No author information provided`, rc=0). Acrescentei `author` e o aviso sumiu. Saída crua em `validate.out`.

## `claude plugin test` (rc=0)

```
tests/guarda-escopo.test.ts:
(pass) dentro da raiz e casa o glob: segue e registra
(pass) dentro da raiz e casa glob ** em pasta nova: segue
(pass) dentro da raiz e nao casa: nega com a mensagem
(pass) Edit e NotebookEdit tambem sao guardados
(pass) .git: nega mesmo com glob que casaria
(pass) /tmp fora da raiz: segue
(pass) .. que volta para dentro e nao casa: nega
(pass) .. que escapa da raiz para fora de tudo: nega
(pass) .. num arquivo que ainda nao existe nao vira atalho: nega
(pass) symlink dentro da raiz apontando para fora: nega
(pass) fora de tudo: nega
(pass) sem ORQ_ESCOPO_FILE: segue e registra
(pass) escopo ilegivel: nega (fecha, nao abre)
(pass) ferramenta fora da lista (Read) nao passa pelo guarda
(pass) o log acumula uma linha JSON por decisao

 15 pass
 0 fail
Ran 15 tests across 1 file. [0.23s]
rc=0
```
O arquivo `test.out` tem a saída crua, com os tempos. **Prova de que os testes mordem:** rodei uma cópia no scratchpad com o hook trocado por `return next(e)` (guarda que nunca nega). Deu 6 pass, 9 fail, rc=1, e falharam exatamente todos os testes de negação.

**Limite dos testes:** o kit não tem sistema de arquivos. `fs.stat` é um stub que imita o macOS (`/tmp` → `/private/tmp`, symlinks, `..`). Os testes provam a lógica de decisão sobre o `realPath`. Que o `$.fs.stat` real devolve esse `realPath` só a chamada real (caso a) prova.

## Repo de teste

`/tmp/spike-mods-repo`: `git init`, `permitido.txt` e `proibido.txt` com `original`, commit `ea4485c inicial`. O escopo fica fora do repo, em `~/orq-sessoes/spike-mods/escopo.json` = `{"permitidos": ["permitido.txt"]}`.

## Comandos gravados (`rodar.cmd`)

São três linhas, todas com as flags do executor: `-p … --output-format json --model … --max-turns 40 --allowedTools "<BASE_TOOLS>"`, cwd no repo, stdout e stderr juntos como no `claude_run`. Modelo `claude-haiku-5-5`, teto `--max-budget-usd 0.15`, que é a única flag que não vem do executor. `--disallowedTools` ficou de fora porque o piso é vazio quando o config não o declara. Cada linha restaura o repo antes de rodar e grava `saida-X.json`, `estado-X.txt` e `escopo-X.log.jsonl`.

- (a) `… --plugin-dir ~/orq-sessoes/spike-mods/guarda-escopo`
- (b) sem `--plugin-dir` (controle)
- (c) `… --plugin-dir … --bare`. Precisa de `ANTHROPIC_API_KEY` exportada, porque `--bare` não lê OAuth.

O que esperar de cada caso está em `conferir.md`.

## Recomendação: **mod**, com duas condições. O hook de configuração (PreToolUse via `--settings`) fica como plano B.

Por que o mod:
1. **Nega antes de tudo e de forma tipada.** `tool.call` roda antes dos `PreToolUse` não gerenciados e antes da checagem de permissão. `{ deny }` é uma resposta estruturada, sem convenção de exit code 2 nem JSON em stdout.
2. **O realpath vem do motor.** `$.fs.stat({ resolve: true })` resolve symlink e `..` do mesmo jeito para o guarda e para o motor. Num script bash, `realpath` de arquivo inexistente varia entre macOS e GNU, e é ali que o guarda erra.
3. **Testável sem sessão e sem custo.** 15 casos em 0,23 s, inclusive symlink e `..`, e o teste da cópia sabotada mostra que eles pegam regressão. Um PreToolUse em shell só se testa com fixture de stdin e não tem kit.
4. **Fail-closed por chamada** com `.catch`. No settings hook, um erro diferente de exit 2 **não bloqueia**: ele falha aberto.
5. **Entra só por `--plugin-dir`**, sem instalar nada e sem tocar em settings globais, como o programa exige.

Condições para virar peça do motor:
- **(i) O caso (a) precisa mostrar** `proibido.txt` intacto e a linha `nega` no log. Se não mostrar, o mod não serve e vale o plano B.
- **(ii) Tratar a falha de carga, que abre.** Se o módulo não carregar (erro de sintaxe, `disableAllHooks` num `.claude/settings.json` do repo-alvo, versão do CLI, `--bare`), o `claude -p` **roda sem guarda** e só deixa uma linha no stderr. O executor precisa checar isso: por exemplo, abortar o attempt se `saida` contiver `hooks module guarda-escopo… not loaded` ou `hook skipped`, ou exigir que `ORQ_ESCOPO_LOG` tenha pelo menos uma linha quando o diff tiver arquivos. O enforcement por diff que já existe continua sendo a lei. O mod é defesa em profundidade, para impedir a escrita antes que ela aconteça.

Pontos ainda abertos que (a), (b) e (c) respondem:
- Se a negação do mod aparece em `permission_denials`. Se não aparecer, `permissoes_negadas` (`executor.sh:818`) não a vê, e o log do mod passa a ser a única trilha.
- Se `--bare` desliga um mod de `--plugin-dir`. O executor não usa `--bare`, mas convém saber antes que alguém o adicione "para economizar contexto".

Riscos do mod contra o hook de configuração: a API é nova (2.1.287 em diante) e pode mudar entre versões. Os tipos do build são a referência, então convém travar a versão do CLI no preflight. O hook de configuração é mais maduro e estável. Se (a) falhar, ou se a equipe preferir estabilidade a ergonomia, a mesma regra vira um `PreToolUse` com matcher `Edit|Write|MultiEdit|NotebookEdit` em `--settings <arquivo do run>`, com `exit 2` para negar e um `trap` que também saia com 2 em qualquer erro.
