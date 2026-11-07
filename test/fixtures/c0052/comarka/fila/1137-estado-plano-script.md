# Ticket 1137: scripts/roadmap/estado-plano.py sobrescreve o bloco "Estado agora" do 04-ROADMAP

> Reescrito em 14/10/2026 a partir do 1118 para a separacao de loops (6df04cc): loop plataforma.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Item F0-16. O status de fase do Apolo vem de script, nunca de doc. O script lê os tickets de lane `apolo` em `docs/fila/` e `docs/fila/apolo/` (as duas filas), agrupa por fase (prefixo do campo `plano_item`, ex.: `F0-14` → F0) e escreve no bloco "Estado agora" do 04-ROADMAP: total, done, pendente, bloqueado, em execução e aguardando humano, mais a lista de tokens `humano:` ainda não liberados.

Sai sem dependência, junto com o F0-14. É o primeiro passo do ritual de fim de lote do plano.

Separacao de loops (14/10): o script e do loop plataforma (`scripts/roadmap/`); como ticket plataforma com `plano_secao`, ele pode listar `docs/plano/apolo/04-ROADMAP.md` (regra de 6df04cc).

## Recon de 14/10 (origin/main 3a39865 = staging-auto eceecf8 nos caminhos citados, só leitura)

```
docs/plano/apolo/04-ROADMAP.md:5-9  '## Estado agora (sobrescrito por script)' + bloco ``` com 1 linha
scripts/roadmap/estado-fila.py:5   RX = re.compile(r"```json\s*(\{.*?\})\s*```", re.S)  (molde de leitura)
scripts/roadmap/estado-plano.py: ausente
```

## Campos de máquina

```json
{
  "id": "1137",
  "slug": "estado-plano-script",
  "loop": "plataforma",
  "lane": "apolo",
  "perfil": "docs",
  "plano_item": "F0-16",
  "plano_secao": "04-ROADMAP",
  "atualiza_plano": "sim",
  "objetivo": "PASSO 0 (regra .claude/rules/apolo.md): leia docs/plano/apolo/00-PRINCIPIOS.md inteiro, o bloco 'Estado agora' e o lote F0 de docs/plano/apolo/04-ROADMAP.md, os ADRs de docs/plano/apolo/adr/, as ultimas 30 linhas de docs/plano/apolo/aprendizados.md, docs/plano/apolo/glossario.md e a secao do plano_secao deste ticket. ORCAMENTO DE DIFF: teto de 220 linhas (~190 em scripts/roadmap/estado-plano.py NOVO, ~15 no bloco 'Estado agora' de docs/plano/apolo/04-ROADMAP.md). Se passar do teto, pare e reporte. CONTEXTO: o bloco 'Estado agora' de docs/plano/apolo/04-ROADMAP.md e sobrescrito por script, nunca a mao (regra .claude/rules/apolo.md: estado de fase vem de scripts/roadmap/estado-plano.py). O script nao existe. PASSO 1: leia scripts/roadmap/estado-fila.py (ler_fila e o RX do bloco json; reuse o mesmo jeito de ler, importando estado-fila.py por importlib ou copiando so o regex) e o topo de docs/plano/apolo/04-ROADMAP.md. FAZER: (1) NOVO scripts/roadmap/estado-plano.py (python3, so stdlib): le docs/fila/[0-9]*.md e docs/fila/apolo/[0-9]*.md (as duas filas, separacao de loops 6df04cc), fica com os tickets de lane 'apolo'; a fase e o prefixo do campo plano_item antes do primeiro '-' (F0-14 -> F0; F0-C1 -> F0); sem plano_item vai para 'sem_fase'. Para cada fase em ordem (F0..F5, depois sem_fase), uma linha: '<fase> | total N | done D | pendente P | bloqueado B | em_execucao E | aguardando humano H', onde H = pendentes com alguma dependencia humano:<token> cujo token nao esta em docs/fila/liberacoes.json (chave liberadas ou tokens, leia as duas como estado-fila.py/prontos.py leem). Depois uma linha 'Tokens humanos pendentes do Apolo: a, b, c' (ordem de primeira aparicao por id) ou 'nenhum'. Ultima linha 'Atualizado em AAAA-MM-DD por scripts/roadmap/estado-plano.py' com a data local. Reescreve SO o conteudo do primeiro bloco cercado por ``` logo depois do titulo '## Estado agora' em docs/plano/apolo/04-ROADMAP.md; o resto do arquivo fica byte a byte igual. Flag --stdout imprime o bloco sem gravar. Rodar duas vezes no mesmo dia nao gera diff. Sem bloco ou sem o titulo: sai com codigo 1 e mensagem, sem gravar. (2) rode `python3 scripts/roadmap/estado-plano.py` uma vez e commite o bloco gerado em docs/plano/apolo/04-ROADMAP.md (e o unico trecho do arquivo que muda). FORA DE ESCOPO: docs/fila/apolo/** (so leitura); qualquer outro trecho do 04-ROADMAP; scripts/roadmap/estado-fila.py e prontos.py (so leitura); scripts/orquestrador/**.",
  "cria_novo": [
    "scripts/roadmap/estado-plano.py"
  ],
  "pathspec_allowlist": [
    "scripts/roadmap/estado-plano.py",
    "docs/plano/apolo/04-ROADMAP.md"
  ],
  "dependencias": [],
  "prioridade": 40,
  "recon_esperado": [
    {
      "descricao": "scripts/roadmap/estado-plano.py ainda nao existe",
      "cmd": "test -e 'scripts/roadmap/estado-plano.py' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o 04-ROADMAP tem o titulo Estado agora seguido de bloco cercado",
      "cmd": "n=$(grep -c '^## Estado agora' docs/plano/apolo/04-ROADMAP.md); l=$(grep -n '^## Estado agora' docs/plano/apolo/04-ROADMAP.md | cut -d: -f1); c=$(sed -n \"$((l+2))p\" docs/plano/apolo/04-ROADMAP.md); [ \"$n\" = 1 ] && [ \"$c\" = '```' ] && echo BLOCO || echo ST_${n}",
      "espera": "BLOCO"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'scripts/roadmap/estado-plano.py' 'docs/plano/apolo/04-ROADMAP.md' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 220 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 220 ] && echo NO_TETO || echo ESTOUROU_$t",
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
      "descricao": "atualiza_plano sim: o diff toca docs/plano/apolo/ no mesmo commit",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '^docs/plano/apolo/'); [ \"$n\" -ge 1 ] && echo PLANO_ATUALIZADO || echo PLANO_INTOCADO",
      "espera": "PLANO_ATUALIZADO",
      "tipo": "alvo"
    },
    {
      "descricao": "o script roda, o bloco traz a linha de F0 e a data, e rodar de novo nao muda o arquivo",
      "cmd": "f=docs/plano/apolo/04-ROADMAP.md; python3 scripts/roadmap/estado-plano.py >/dev/null 2>&1 || { echo RODOU_MAL; exit 0; }; h1=$(shasum \"$f\" | awk '{print $1}'); python3 scripts/roadmap/estado-plano.py >/dev/null 2>&1; h2=$(shasum \"$f\" | awk '{print $1}'); a=$(grep -c '^F0 | total [0-9]* | done [0-9]* | pendente [0-9]* | bloqueado [0-9]* | em_execucao [0-9]* | aguardando humano [0-9]*$' \"$f\"); d=$(grep -c 'por scripts/roadmap/estado-plano.py' \"$f\"); [ \"$h1\" = \"$h2\" ] && [ \"$a\" = 1 ] && [ \"$d\" -ge 1 ] && echo IDEMPOTENTE || echo ST_${a}_${d}",
      "espera": "IDEMPOTENTE",
      "tipo": "alvo"
    },
    {
      "descricao": "so o bloco Estado agora mudou no 04-ROADMAP (nenhuma linha removida fora do bloco)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; f=docs/plano/apolo/04-ROADMAP.md; l=$(git show \"$b:$f\" | grep -n '^## Calend' | head -1 | cut -d: -f1); x=$(git show \"$b:$f\" | sed -n \"$l,\\$p\" | shasum | awk '{print $1}'); y=$(sed -n \"/^## Calend/,\\$p\" \"$f\" | shasum | awk '{print $1}'); [ -n \"$l\" ] && [ \"$x\" = \"$y\" ] && echo RESTO_IGUAL || echo RESTO_MUDOU",
      "espera": "RESTO_IGUAL",
      "tipo": "guarda"
    },
    {
      "descricao": "--stdout imprime sem gravar",
      "cmd": "f=docs/plano/apolo/04-ROADMAP.md; h1=$(shasum \"$f\" | awk '{print $1}'); o=$(python3 scripts/roadmap/estado-plano.py --stdout 2>&1 | grep -c '^F0 | total'); h2=$(shasum \"$f\" | awk '{print $1}'); [ \"$o\" = 1 ] && [ \"$h1\" = \"$h2\" ] && echo STDOUT_OK || echo ST_$o",
      "espera": "STDOUT_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: estado-plano.py conta os tickets de lane apolo das duas filas (docs/fila e docs/fila/apolo) por fase (prefixo de plano_item), por status e por token humano pendente, e reescreve so o bloco cercado de 'Estado agora' do 04-ROADMAP, de forma idempotente; o bloco commitado veio do script. REPROVE se: outro trecho do 04-ROADMAP mudou; o bloco foi escrito a mao; le Notion ou rede; toca estado-fila.py, prontos.py ou o motor.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [],
  "status": "done",
  "notas_status": "aprovado (tentativa 2): Script só com stdlib, sem rede/Notion. Lê as duas filas, filtra lane apolo e agrupa a fase pelo prefixo de plano_item. Conta status e humano pendente pelas chaves liberadas e tokens. Troca só o 1º bloco cercado depois de Estado agora, de forma idempotente. Formato do bloco bate com o script e não toca o motor."
}
```
