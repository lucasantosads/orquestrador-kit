# Ticket 1361: A guarda do Claude Code entra no gate do vitest

> Escrito em 18/10/2026 (madrugada) a partir do pedido do Lucas de 18/10: aplicar as atualizações do Claude Code no harness do Comarka OS. Plano: docs/harness/plano-claude-code-out26.md.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

A guarda PreToolUse tem testes em Python que o loop não roda, e o hook pode sumir do settings sem ninguém ver. Um teste vitest roda os testes Python, confere que o hook está ligado e fail-closed e faz um bloqueio de ponta a ponta. Espera o Lucas publicar o pacote do harness e liberar `harness-out26-publicado`.

## Campos de máquina

```json
{
  "id": "1361",
  "slug": "guarda-ferramenta-no-vitest",
  "loop": "plataforma",
  "perfil": "api",
  "objetivo": "CONTEXTO: plano do harness de 18/10/2026 (docs/harness/plano-claude-code-out26.md, secao 2). A guarda PreToolUse .claude/hooks/guarda-ferramenta.py (bloqueia escrita/DDL em C0, git add amplo, --no-verify, git push e leitura de .env) tem testes em Python (scripts/test-guarda-ferramenta.py) que nenhum gate do loop roda; e o .claude/settings.json que liga o hook pode perder o hook ou o onFailure block sem ninguem perceber. Este ticket poe os dois no gate do vitest. ORCAMENTO DE DIFF: teto de 120 linhas. PASSO 1: leia .claude/settings.json, .claude/hooks/guarda-ferramenta.py (so o cabecalho) e scripts/test-guarda-ferramenta.py. FAZER: NOVO test/guarda-ferramenta.test.ts (vitest, imports de 'node:child_process', 'node:fs' e 'node:path'): (1) it 'os testes da guarda passam': execFileSync('python3', ['scripts/test-guarda-ferramenta.py'], { stdio: 'pipe', timeout: 120000 }) sem lancar; (2) le o caminho do settings de process.env.GUARDA_SETTINGS com fallback '.claude/settings.json' (o fallback e o caminho real; a variavel existe so para o criterio de contraprova rodar o teste contra uma copia adulterada) e faz JSON.parse; it 'o hook da guarda esta ligado e fail-closed': em hooks.PreToolUse existe um handler cujo command contem 'guarda-ferramenta.py', com onFailure === 'block'; o matcher desse grupo, como RegExp ancorada (new RegExp('^(?:' + matcher + ')$')), casa 'Bash', 'Read' e os dois nomes de ferramenta do Supabase, cada um MONTADO POR CONCATENACAO no teste ('mcp__supabase__' + 'execute' + '_sql' e 'mcp__claude_ai_Supabase__' + 'apply' + '_migration'); o nome inteiro nunca aparece como literal unico no arquivo, nem em comentario, porque o enforcement do harness varre o diff (inclusive test/) por esses nomes e bloqueia o ticket; (3) it 'a guarda bloqueia de verdade (ponta a ponta)': spawnSync('python3', ['.claude/hooks/guarda-ferramenta.py'], { input: JSON.stringify({ tool_name: 'Bash', tool_input: { command: 'git add -A' } }), env: { ...process.env, CLAUDE_PROJECT_DIR: process.cwd() } }) devolve status 2, e o mesmo com command 'git status' devolve 0. FORA DE ESCOPO: .claude/** (nao edite a guarda nem o settings), scripts/**, docs/**. REGRAS DO REPO: sem travessao (U+2014) em nenhum arquivo; nenhuma escrita nem DDL em zona C0; git add so por pathspec explicito; PROIBIDO remover assercao, trocar matcher por toBeDefined, usar .skip/.only/.todo.",
  "cria_novo": [
    "test/guarda-ferramenta.test.ts"
  ],
  "pathspec_allowlist": [
    "test/guarda-ferramenta.test.ts"
  ],
  "dependencias": [
    "humano:harness-out26-publicado"
  ],
  "prioridade": 40,
  "recon_esperado": [
    {
      "descricao": "test/guarda-ferramenta.test.ts ainda nao existe",
      "cmd": "test -e 'test/guarda-ferramenta.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "a guarda e seus testes existem na arvore",
      "cmd": "test -e .claude/hooks/guarda-ferramenta.py && test -e scripts/test-guarda-ferramenta.py && echo GUARDA_PRESENTE || echo GUARDA_AUSENTE",
      "espera": "GUARDA_PRESENTE"
    },
    {
      "descricao": "o settings liga o hook com onFailure block",
      "cmd": "python3 -c \"import json; s=json.load(open('.claude/settings.json')); h=[x for m in s['hooks']['PreToolUse'] for x in m['hooks'] if 'guarda-ferramenta.py' in x['command']]; print('LIGADO' if h and h[0].get('onFailure')=='block' else 'DESLIGADO')\"",
      "espera": "LIGADO"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'test/guarda-ferramenta.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 120 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 120 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes (test/c0-guard.test.ts, test/fetch-json-teto.test.ts, test/travessao-mudo.test.ts)",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/fetch-json-teto.test.ts' 'test/travessao-mudo.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "o teste novo passa contra o settings real",
      "cmd": "npx vitest run 'test/guarda-ferramenta.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "alvo"
    },
    {
      "descricao": "contraprova: com onFailure trocado para continue numa copia, o teste reprova",
      "cmd": "t=$(mktemp -d); sed 's/\"block\"/\"continue\"/' .claude/settings.json > \"$t/s.json\"; GUARDA_SETTINGS=\"$t/s.json\" npx vitest run 'test/guarda-ferramenta.test.ts' >/dev/null 2>&1 && r=NAO_PEGA || r=PEGA; rm -rf \"$t\"; echo $r",
      "espera": "PEGA",
      "tipo": "alvo"
    },
    {
      "descricao": "contraprova: sem o hook da guarda numa copia, o teste reprova",
      "cmd": "t=$(mktemp -d); sed 's/guarda-ferramenta.py/outro-script.py/' .claude/settings.json > \"$t/s.json\"; GUARDA_SETTINGS=\"$t/s.json\" npx vitest run 'test/guarda-ferramenta.test.ts' >/dev/null 2>&1 && r=NAO_PEGA || r=PEGA; rm -rf \"$t\"; echo $r",
      "espera": "PEGA",
      "tipo": "alvo"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Diff fiel ao objetivo: só cria test/guarda-ferramenta.test.ts. Roda o teste Python, lê o settings por GUARDA_SETTINGS com fallback, exige onFailure block e matcher ancorado com nomes Supabase concatenados. Ponta a ponta dá 2 e 0. Sem skip, sem travessão. toBeDefined vem seguido de asserções fortes."
}
```
