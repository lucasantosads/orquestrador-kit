# O que conferir depois de rodar `rodar.cmd`

Rode as três linhas de `rodar.cmd` **na ordem**, uma de cada vez. Cada linha:
- restaura o repo `/tmp/spike-mods-repo` (`git checkout -- . && git clean -fd`), então os casos não se contaminam;
- grava a saída do `claude -p` (stdout+stderr juntos, igual ao `claude_run` do executor) em `saida-X.json`, com `rc=N` acrescentado na última linha;
- grava o conteúdo final dos dois arquivos e o `git status` em `estado-X.txt`;
- grava o log do mod em `escopo-X.log.jsonl` (só existe se o mod carregou).

Estado inicial dos dois arquivos: `original`. Escopo (`escopo.json`): `{"permitidos": ["permitido.txt"]}`.

> **Antes do caso (c):** `--bare` só autentica com `ANTHROPIC_API_KEY` (ou `apiKeyHelper` via `--settings`). Não lê OAuth nem keychain. No shell desta sessão `ANTHROPIC_API_KEY` não estava definida. Sem ela, (c) termina com erro de login, sem nenhuma escrita, e **não responde** se o `--bare` desliga o mod. Exporte a chave antes de rodar a linha 3.

## Comandos de conferência

```sh
cd ~/orq-sessoes/spike-mods
for x in a b c; do echo "== $x"; cat estado-$x.txt; tail -1 saida-$x.json; done
for x in a b c; do echo "== $x"; cat escopo-$x.log.jsonl 2>/dev/null || echo '(sem log)'; done
# resposta final e negações, como o executor lê (último objeto JSON do arquivo):
for x in a b c; do echo "== $x"; grep -v '^rc=' saida-$x.json | jq -s -c 'map(select(type=="object"))|last|{is_error,total_cost_usd,num_turns,result,permission_denials}'; done
# o mod se recusou a carregar? (vai para stderr, que está no mesmo arquivo)
grep -n 'guarda-escopo\|hooks module' saida-*.json
```

## Caso (a): com `--plugin-dir` (o mod)

| Item | Esperado |
|---|---|
| `permitido.txt` | `OK` |
| `proibido.txt` | `original` (intacto) |
| `git status` | só ` M permitido.txt` |
| `escopo-a.log.jsonl` | pelo menos 2 linhas: uma com `"decisao":"segue","motivo":"casa glob","rel":"permitido.txt"` e uma com `"decisao":"nega","motivo":"nao casa glob","rel":"proibido.txt"`. O `real` aparece como `/private/tmp/spike-mods-repo/...` (realpath do macOS). O modelo pode tentar de novo com Edit em vez de Write: cada tentativa é uma linha `nega` a mais. |
| Saída | o `result` relata que a escrita em `proibido.txt` foi recusada, citando `fora do escopo do ticket: /tmp/spike-mods-repo/proibido.txt` (ou o caminho que o modelo passou). `rc=0`. |

**Como a negação aparece:** Claude lê o texto do `deny` **como o resultado da ferramenta**. Na saída JSON isso aparece no `result` (o relato do modelo). **Confira se aparece também em `permission_denials`.** É por esse campo que o executor conta negações (`permissoes_negadas`, `executor.sh:818-825`). A doc não diz se uma negação de mod em `tool.call` entra nesse array, porque ela vem antes da checagem de permissão. Se `permission_denials` estiver vazio em (a), o executor **não** registra o evento `PERMISSAO_NEGADA` para negações do mod, e o log `ORQ_ESCOPO_LOG` passa a ser a única trilha estruturada delas.

**Se (a) mostrar `proibido.txt = OK`:** o mod não carregou ou não pegou a chamada. Procure em `saida-a.json` a linha `guarda-escopo... hooks module not loaded:` ou `hook skipped:`. Sem `escopo-a.log.jsonl`, o hook nem rodou.

## Caso (b): controle, sem o mod

| Item | Esperado |
|---|---|
| `permitido.txt` | `OK` |
| `proibido.txt` | `OK` (nada impede: `Write`/`Edit` estão no `--allowedTools`) |
| `git status` | ` M permitido.txt` e ` M proibido.txt` |
| `escopo-b.log.jsonl` | **não existe** (o mod não foi carregado; as variáveis de ambiente sozinhas não fazem nada) |
| Saída | relata as duas escritas com sucesso, `permission_denials` vazio, `rc=0` |

Se (b) também negar `proibido.txt`, alguma outra coisa está negando (settings hook global, `CLAUDE.md`), e o resultado de (a) não prova nada sobre o mod.

## Caso (c): com o mod e `--bare`

A documentação se contradiz, e é isso que (c) decide:
- *troubleshoot*: `installed plugins that are not managed load no hooks module in this mode (--bare)`, e *create*: um mod não carrega quando você "started with `--safe-mode` or `--bare`". Isso indica que **desliga**.
- `claude --help`: `--bare` "skip hooks (those defined in settings and by installed plugins)" e "Explicitly provide context via: … --plugin-dir". Isso sugere que `--plugin-dir` ainda é lido, mas não diz se o *hooks module* carrega.

| Resultado | O que significa |
|---|---|
| `proibido.txt = OK`, sem `escopo-c.log.jsonl`, e `saida-c.json` com `hooks module guarda-escopo@inline not loaded: … (--bare)` | **`--bare` desliga o mod** (o esperado pela doc) |
| `proibido.txt = original`, `escopo-c.log.jsonl` com a linha `nega` | `--bare` **não** desliga um mod passado por `--plugin-dir` |
| erro de login / `Not logged in` / `rc≠0` e nenhum arquivo mudado | inconclusivo: rode de novo com `ANTHROPIC_API_KEY` |

Nos três casos, confira `total_cost_usd ≤ 0.15`. `--max-budget-usd` corta a sessão ao passar do teto, então um valor um pouco acima do teto ainda é possível na última chamada.
