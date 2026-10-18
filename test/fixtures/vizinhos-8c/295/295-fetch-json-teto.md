# Ticket 295 - Helper de fetch e gate de teto para .json() sem checagem de ok

## Contexto

Recon de 03/09. No repositorio ha 444 chamadas de `.json()` em componentes (fora de src/app/api), e
apenas 66 linhas mencionam `.ok`. A contagem de `.ok` foi por linha, entao o numero exato de chamadas
desprotegidas nao e o gate deste ticket - mas a ordem de grandeza (centenas) esta verificada.

O sintoma ja aparece em producao: o console da ficha registra um SyntaxError de "Unexpected token '<'",
assinatura de um fetch que recebeu o HTML de uma pagina 404 e chamou .json() mesmo assim.

O caso mais grave nao e o 404: e o 401. Toda rota /api sem sessao devolve um objeto de erro com status
401. Sem checar res.ok, o componente parseia esse objeto como se fosse dado e renderiza estado vazio ou
inconsistente, sem nenhum sinal para o usuario.

Corrigir 400+ lugares num ticket e inviavel. A estrategia e a mesma do guardrail de rota orfa: helper
unico, um diretorio piloto migrado, e um teto mecanico que so pode decrescer. Os tickets seguintes
migram os outros diretorios baixando a constante.

## Campos de maquina

```json
{
  "id": "295",
  "lane": "plataforma",
  "perfil": "frontend",
  "slug": "fetch-json-teto",
  "objetivo": "Criar um helper unico de fetch+parse, migrar o diretorio piloto para ele, e instalar um gate de teto decrescente que impeca a divida de crescer. PASSO 1 OBRIGATORIO: rode grep -rn '.json()' no diretorio src/app/dashboard/clientes/[id]/tabs/ e leia cada chamada antes de mexer. O QUE FAZER: (1) criar src/lib/fetch-json.ts exportando fetchJson<T>(input, init?): Promise<T> que faz o fetch, LANCA se !res.ok (mensagem STRING legivel com o status, nunca objeto — ticket 270), LANCA se o content-type nao for JSON (e o caso do HTML de 404 que gera o SyntaxError 'Unexpected token <'), e so entao chama .json(); (2) migrar TODAS as chamadas de .json() dos arquivos em src/app/dashboard/clientes/[id]/tabs/ para o helper, envolvendo cada uma em try/catch que renderiza estado de erro legivel ou dispara toast com STRING — nunca engolir em silencio e nunca despejar objeto na tela; (3) criar test/fetch-json-teto.test.ts com testes do helper (res.ok false lanca; content-type text/html lanca; JSON valido devolve o objeto) MAIS um teste de TETO: varre src/ contando chamadas cruas de .json() fora de src/lib/fetch-json.ts e reprova se o total for MAIOR que a constante TETO_JSON_CRU declarada no proprio teste; a constante deve ser fixada no valor medido DEPOIS da migracao do piloto, com comentario explicando que ela so pode diminuir. FORA DE ESCOPO: qualquer arquivo fora do diretorio piloto (o resto da divida sai em tickets seguintes baixando o teto); rotas de API; mudar URL, metodo ou payload de qualquer fetch existente — o ticket muda COMO a resposta e tratada, nunca o que e pedido.",
  "pathspec_allowlist": [
    "src/lib/fetch-json.ts",
    "src/app/dashboard/clientes/[id]/tabs/",
    "test/fetch-json-teto.test.ts"
  ],
  "cria_novo": [
    "src/lib/fetch-json.ts",
    "test/fetch-json-teto.test.ts"
  ],
  "dependencias": [],
  "diff_estimado": 400,
  "recon_esperado": [
    {
      "descricao": "o helper ainda nao existe",
      "cmd": "test -f src/lib/fetch-json.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o gate de teto ainda nao existe",
      "cmd": "test -f test/fetch-json-teto.test.ts && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o piloto tem chamadas cruas de .json() hoje",
      "cmd": "[ $(grep -rl '[.]json()' 'src/app/dashboard/clientes/[id]/tabs/' | wc -l | tr -d ' ') -gt 0 ] && echo SIM || echo NAO",
      "espera": "SIM"
    }
  ],
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "nenhuma chamada crua de .json() sobrou no piloto",
      "cmd": "grep -rl '[.]json()' 'src/app/dashboard/clientes/[id]/tabs/' | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "alvo",
      "descricao": "o piloto passou a importar o helper",
      "cmd": "[ $(grep -rl 'fetch-json' 'src/app/dashboard/clientes/[id]/tabs/' | wc -l | tr -d ' ') -ge 1 ] && echo SIM || echo NAO",
      "espera": "SIM"
    },
    {
      "tipo": "alvo",
      "descricao": "o gate de teto existe e passa",
      "cmd": "npx vitest run test/fetch-json-teto.test.ts 2>&1 | grep -E 'Tests +[0-9]+ passed|failed' | head -1",
      "espera": "passed"
    },
    {
      "tipo": "alvo",
      "descricao": "a constante de teto foi declarada",
      "cmd": "[ $(grep -c 'TETO_JSON_CRU' test/fetch-json-teto.test.ts | tr -d ' ') -ge 1 ] && echo SIM || echo NAO",
      "espera": "SIM"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma rota de API tocada",
      "cmd": "git diff --name-only HEAD | grep -c '^src/app/api/' | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma migration criada ou alterada",
      "cmd": "git diff --name-only HEAD | grep -c '^supabase/migrations/' | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "middleware nao tocado",
      "cmd": "git diff --name-only HEAD | grep -c 'src/middleware.ts' | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum arquivo de codigo fora da allowlist",
      "cmd": "git diff --name-only HEAD -- 'src/*' 'test/*' | grep -vcE 'src/lib/fetch-json.ts|clientes/.id./tabs/|fetch-json-teto.test.ts' | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "suite completa verde",
      "cmd": "npx vitest run 2>&1 | grep -E 'Tests +[0-9]+ passed|failed'",
      "espera": "passed"
    },
    {
      "tipo": "guarda",
      "descricao": "build passa",
      "cmd": "npm run build > /tmp/build_295.log 2>&1 && echo BUILD_OK || tail -30 /tmp/build_295.log",
      "espera": "BUILD_OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: REPROVE se TETO_JSON_CRU for fixado acima do numero real medido apos a migracao — teto folgado nao mede nada. REPROVE se o helper engolir o erro devolvendo null em vez de lancar: a chamada seguinte volta a tratar erro como dado, que e o defeito. REPROVE se alguma migracao trocar URL, metodo ou payload — o ticket muda o TRATAMENTO, nunca o pedido. REPROVE se algum try/catch novo ficar vazio ou so com console.error, sem nada renderizado. REPROVE se o erro chegar na tela como objeto. REPROVE se o teste do helper nao exercitar os tres casos.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "em_execucao",
  "notas_status": ""
}
```
