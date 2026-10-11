# Ticket 243 — `/aprovar/[token]`: a primeira superfície sem sessão além do health

> A **fonte de verdade de máquina** é o bloco ```json abaixo.

## Objetivo (prosa)

A tela que o cliente do escritório abre. É a **única** rota pública nova de B3-F1, e a segunda do
produto inteiro: hoje `PUBLIC_PREFIXES` (`lib/auth/routes.ts:14`) tem só telas de auth, o callback
`/auth` e `/api/health`.

**Classe pública é declaração explícita, e é provada duas vezes.** `isPublicPath` é função pura e
testável isolada; `updateSession` (`lib/supabase/middleware.ts:47`) é quem de fato deixa passar ou
manda para `/login`. Um teste que só afirme `isPublicPath('/aprovar/x') === true` prova a tabela,
não o comportamento. Por isso este ticket prova nos dois níveis: a classificação **e** o request sem
sessão atravessando o middleware — no padrão que `apps/web/test/briefing-gate.test.ts` já usa
(mock de `@supabase/ssr`, `NextRequest` real).

**`/aprovar` é público; `/aprovacoes` não é, e os dois convivem.** `casaPrefixo`
(`routes.ts:16-18`) exige igualdade exata ou o prefixo seguido de `/`. Então `/aprovar` e
`/aprovar/<token>` são públicos, e `/aprovacoes` — a fila interna do 244 — **não casa** e continua
atrás de sessão. Isso não é sutileza de nomenclatura: um prefixo mal escolhido (`/aprova`, por
exemplo) tornaria a fila interna do escritório pública. O teste afirma as duas coisas.

**O gate de onboarding não pode pegar o cliente.** O guard de org e persona em
`middleware.ts:55` roda para `user && !isPublicPath(pathname)`. Como não há usuário, o cliente do
escritório nunca chega lá — mas isso é consequência de duas condições, e a segunda é a que este
ticket acrescenta. O teste cobre o caminho sem sessão explicitamente.

**Nada além do combinado aparece.** Roteiro, legenda e veredito 205. Sem nome de persona, sem
ângulo, sem score, sem outros roteiros do escritório, sem navegação para o resto do app. Quem tem o
link vê **um** roteiro.

## Alvo vermelho

```
$ ls apps/web/src/app/aprovar
ls: apps/web/src/app/aprovar: No such file or directory
rc=1

$ git grep -c 'aprovar' -- apps/web/src/lib/auth/routes.ts
rc=1   (saída vazia)
```

Vermelho **por construção** também pelo 242: sem `lerRoteiroPorToken`, a página não tem o que ler.

## Colisão

`apps/web/src/lib/auth/routes.ts` e `apps/web/test/auth-validation.test.ts` são allowlist de
**B2-F2** (`concluida`) — sobreposição morta, e é a razão de B3-F1 declarar dep de frente para
B2-F2. `auth-validation.test.ts` entra na allowlist **só para ganhar casos**: hoje tem `it=9` e
`expect=40`, e há guarda anti-afrouxamento cobrando que nenhum dos dois caia.

`git grep -ln 'updateSession' -- 'apps/web/test/*'` → `apps/web/test/briefing-gate.test.ts`
(`it=9`, `expect=16`). Ele fica **FORA** da allowlist: rota nova não muda nenhum dos 9 casos dele,
e um deles ("rota pública não passa a exigir org nem persona") é justamente o controle positivo de
que a classe pública não afrouxou o gate de onboarding. Guarda cobra que não seja editado.

## Revisão 21/09

A primeira execução entregou código verde em typecheck, testes, build e 27/27 critérios, e mesmo
assim saiu REFATIAR por enforcement: a barreira de credencial do motor
(`scripts/orquestrador/enforcement-core.ts:285`, `CREDENCIAL_ATRIBUICAO`) casou
`const TOKEN = 'tok-secreto-9f8e7d6c'` em `apps/web/test/aprovar-publico.test.tsx`. A barreira está
certa em ser estrita e não muda; o defeito era o ticket não avisar. O objetivo ganhou o item (9):
token e segredo de teste nascem em tempo de execução, com `randomBytes` de `node:crypto` em hex,
nunca como literal atribuído a `token`, `secret`, `api_key` ou `password`. Um critério alvo novo
prova isso no arquivo de teste. Allowlist, dependências e critérios existentes não mudaram.

## Campos de máquina

```json
{
  "id": "243",
  "bloco": "B3",
  "frente": "B3-F1",
  "slug": "rota-e-tela-publica-de-aprovacao",
  "origem": "humano",
  "objetivo": "Cria a UNICA rota publica nova de B3-F1: a tela que o cliente do escritorio abre pelo link. (1) Em apps/web/src/lib/auth/routes.ts, acrescente '/aprovar' a PUBLIC_PREFIXES. NAO acrescente a AUTH_SCREENS: nao e tela de autenticacao, e usuario logado que abrir o link NAO pode ser redirecionado para a home. NAO altere casaPrefixo, isPublicPath nem isAuthScreen, e NAO acrescente nenhum outro prefixo: esta e a unica rota publica que este bloco cria. O nome importa: casaPrefixo exige igualdade exata ou o prefixo seguido de barra, entao '/aprovar' e '/aprovar/<token>' ficam publicos e '/aprovacoes' — a fila INTERNA do ticket 244 — NAO casa e continua atras de sessao. (2) Crie apps/web/src/app/aprovar/[token]/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic'. Ela le o token do parametro de rota, chama lerRoteiroPorToken de @/server/aprovacoes-publico (ticket 242) e, quando o retorno e nulo, chama notFound() de next/navigation. Token invalido, expirado e revogado caem TODOS nesse mesmo notFound, sem mensagem que diga qual foi: a funcao do 242 ja devolve o mesmo nulo nos tres casos, e a tela nao pode reintroduzir a distincao que o servidor tirou. (3) A pagina mostra EXATAMENTE tres coisas, na linguagem do advogado: o roteiro (gancho e corpo), a legenda com as hashtags, e o resultado da checagem do Provimento 205. NADA ALEM DISSO: sem nome de persona, sem angulo, sem score, sem outros roteiros do escritorio, sem menu, sem link para qualquer outra tela do app, sem nome do escritorio. Quem tem o link ve UM roteiro. NAO use nenhum layout, cabecalho ou navegacao que exponha a superficie interna do produto. (4) A pagina traz dois caminhos de resposta: aprovar, e pedir ajuste com um campo de comentario. Os dois chamam decidirPorToken de @/server/aprovacoes-publico, passando o token que veio da rota. Pedir ajuste com comentario vazio nao envia. Quando o link ja foi respondido, a pagina mostra o estado atual e o comentario, e NAO oferece os botoes de novo. (5) O TOKEN NAO APARECE EM NENHUM TEXTO VISIVEL, em nenhum atributo de acessibilidade e em nenhum console: ele vive na URL e no campo que a acao recebe, e nada mais. Onde for preciso identificar o link na tela, nao identifique — o cliente ja sabe que link abriu. (6) Em apps/web/test/auth-validation.test.ts, ACRESCENTE casos (sem remover nem alterar nenhum dos que ja existem): isPublicPath('/aprovar') e isPublicPath('/aprovar/abc123') sao verdadeiros; isPublicPath('/aprovacoes') e FALSO, e isAuthScreen('/aprovar/abc123') e FALSO. O caso de '/aprovacoes' e o que impede um prefixo mal escolhido tornar publica a fila interna do escritorio. (7) Crie apps/web/test/aprovar-publico.test.tsx com no minimo 6 casos it(), mockando '@supabase/ssr' e usando NextRequest real, no padrao EXATO de apps/web/test/briefing-gate.test.ts, mais 'server-only' e '@/server/aprovacoes-publico' mockados para o render: SEM SESSAO, um request para /aprovar/<token> atravessa updateSession sem redirecionar para /login; sem sessao, um request para /aprovacoes redireciona para /login; sem sessao, /aprovar nao dispara nenhuma consulta de organization_members nem de personas (o guard de onboarding nao alcanca rota publica); a pagina renderizada com um roteiro valido mostra o gancho, o corpo, a legenda e o veredito; a pagina com lerRoteiroPorToken devolvendo nulo chama notFound; e a pagina NAO mostra nome de persona, angulo, score nem link para outra tela do app. Prove a classe publica nos DOIS niveis: pela funcao pura isPublicPath e pelo request atravessando o middleware. (8) NAO altere apps/web/test/briefing-gate.test.ts: os 9 casos dele sao o controle positivo de que o gate de onboarding nao afrouxou, e um deles afirma justamente que rota publica nao passa a exigir org nem persona. NAO altere apps/web/src/lib/supabase/middleware.ts. NAO crie migration, NAO altere supabase/, NAO toque em services/ e NAO crie a tela interna da fila — ela e o ticket 244. (9) SEGREDO DE TESTE NASCE EM TEMPO DE EXECUCAO. Em apps/web/test/aprovar-publico.test.tsx, o token de teste e qualquer outro segredo de teste sao gerados em tempo de execucao com randomBytes de node:crypto, em hex (por exemplo: import { randomBytes } from 'node:crypto' e const TOKEN = randomBytes(16).toString('hex')), e NUNCA escritos como literal entre aspas atribuido a um nome token, secret, api_key ou password, nem mesmo com valor de aparencia falsa. Motivo: a barreira de credencial do motor (scripts/orquestrador/enforcement-core.ts:285, CREDENCIAL_ATRIBUICAO) reprova toda linha nome = 'literal de 16 ou mais caracteres com letra e digito', e a tentativa anterior deste ticket caiu nela com const TOKEN = 'tok-secreto-9f8e7d6c' mesmo com typecheck, testes, build e criterios verdes. A barreira e estrita de proposito e nao muda; quem se adapta e o teste.",
  "pathspec_allowlist": [
    "apps/web/src/lib/auth/routes.ts",
    "apps/web/src/app/aprovar/[token]/page.tsx",
    "apps/web/test/auth-validation.test.ts",
    "apps/web/test/aprovar-publico.test.tsx"
  ],
  "cria_novo": [
    "apps/web/src/app/aprovar/[token]/page.tsx",
    "apps/web/test/aprovar-publico.test.tsx"
  ],
  "dependencias": [
    "241b",
    "242"
  ],
  "diff_estimado": 380,
  "risco": "alto",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste da rota publica existe e passa",
      "cmd": "test -f apps/web/test/aprovar-publico.test.tsx && cd apps/web && npx vitest run test/aprovar-publico.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
      "espera": "1"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 6 casos pedidos (1/2): o arquivo apps/web/test/aprovar-publico.test.tsx existe",
      "cmd": "test -f apps/web/test/aprovar-publico.test.tsx && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 6 casos pedidos (2/2): contagem de 'it(' em apps/web/test/aprovar-publico.test.tsx",
      "cmd": "test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste atravessa o middleware de verdade, sem sessao (1/2): o arquivo apps/web/test/aprovar-publico.test.tsx existe",
      "cmd": "test -f apps/web/test/aprovar-publico.test.tsx && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste atravessa o middleware de verdade, sem sessao (2/2): contagem de 'updateSession|@supabase/ssr' em apps/web/test/aprovar-publico.test.tsx",
      "cmd": "test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a pagina publica existe",
      "cmd": "test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a rota foi declarada publica na tabela de classificacao",
      "cmd": "test $(grep -cE \"'/aprovar'\" apps/web/src/lib/auth/routes.ts) -eq 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a pagina le pelo servidor do ticket 242 e nega com notFound (1/2): o arquivo apps/web/src/app/aprovar/[token]/page.tsx existe",
      "cmd": "test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a pagina le pelo servidor do ticket 242 e nega com notFound (2/2): contagem de 'lerRoteiroPorToken|notFound' em apps/web/src/app/aprovar/[token]/page.tsx",
      "cmd": "test $(grep -oE 'lerRoteiroPorToken|notFound' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a decisao do cliente passa pelo servidor do ticket 242 (1/2): o arquivo apps/web/src/app/aprovar/[token]/page.tsx existe",
      "cmd": "test -f 'apps/web/src/app/aprovar/[token]/page.tsx' && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a decisao do cliente passa pelo servidor do ticket 242 (2/2): contagem de 'decidirPorToken' em apps/web/src/app/aprovar/[token]/page.tsx",
      "cmd": "test $(grep -c 'decidirPorToken' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste das rotas ganhou os casos de /aprovar e de /aprovacoes",
      "cmd": "test $(grep -oE \"/aprovar|/aprovacoes\" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste novo nao tem segredo literal atribuido que case a barreira de credencial (enforcement-core.ts:285): token e segredo de teste nascem de randomBytes em tempo de execucao",
      "cmd": "test -f apps/web/test/aprovar-publico.test.tsx && grep -ciE '(api[_-]?key|secret|token|password|passwd|service[_-]?role|access[_-]?key)[[:space:]]*[:=][[:space:]]*[\"'\\''`][^\"'\\''`]{16,}[\"'\\''`]' apps/web/test/aprovar-publico.test.tsx",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "so UM prefixo publico novo entrou na tabela",
      "cmd": "test $(grep -oE \"'/[a-z-]+'\" apps/web/src/lib/auth/routes.ts | wc -l) -eq 5 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "a rota publica NAO virou tela de auth",
      "cmd": "grep -cE \"AUTH_SCREENS = .*aprovar\" apps/web/src/lib/auth/routes.ts",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "o middleware nao foi tocado",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/src/lib/supabase/middleware.ts apps/web/middleware.ts | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "anti-afrouxamento: o teste das rotas nao perdeu caso nem assercao (1/2): contagem de 'it(' em apps/web/test/auth-validation.test.ts",
      "cmd": "test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "anti-afrouxamento: o teste das rotas nao perdeu caso nem assercao (2/2): contagem de 'expect(' em apps/web/test/auth-validation.test.ts",
      "cmd": "test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "o teste do gate de onboarding nao foi editado",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/briefing-gate.test.ts | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "anti-afrouxamento: o gate de onboarding nao perdeu caso nem assercao (1/2): contagem de 'it(' em apps/web/test/briefing-gate.test.ts",
      "cmd": "test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "anti-afrouxamento: o gate de onboarding nao perdeu caso nem assercao (2/2): contagem de 'expect(' em apps/web/test/briefing-gate.test.ts",
      "cmd": "test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "a tela publica nao vaza dado interno do escritorio",
      "cmd": "grep -ciE 'persona|angulo|score|historico|dashboard|onboarding' 'apps/web/src/app/aprovar/[token]/page.tsx'",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a tela publica nao usa chave administrativa direta",
      "cmd": "grep -cE 'createSupabaseClientFromEnv|SERVICE_ROLE|createClient' 'apps/web/src/app/aprovar/[token]/page.tsx'",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a fila interna NAO foi criada neste ticket",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/src/app/aprovacoes apps/web/src/server | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma migration, supabase e services intocados",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- supabase services | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum skip, only ou todo no teste novo",
      "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/aprovar-publico.test.tsx",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a suite da web continua verde",
      "cmd": "cd apps/web && npx vitest run 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
      "espera": "1"
    },
    {
      "tipo": "guarda",
      "descricao": "typecheck da web sem erro",
      "cmd": "npm run typecheck:web 2>&1 | grep -c 'error TS'",
      "espera": "0"
    },
    {
      "tipo": "avaliador",
      "descricao": "CLASSE PUBLICA E PROVADA NOS DOIS NIVEIS, E UM SO NAO BASTA. Confira que o teste prova a rota publica (a) pela funcao pura isPublicPath e (b) por um request SEM SESSAO atravessando updateSession sem ser redirecionado para /login, no padrao de apps/web/test/briefing-gate.test.ts (mock de @supabase/ssr, NextRequest real). REPROVE se so a funcao pura for testada: ela prova a tabela, nao o comportamento — quem decide passar ou mandar para o login e o middleware. Confira que o teste tambem afirma que /aprovacoes SEM sessao REDIRECIONA para /login: casaPrefixo exige igualdade exata ou o prefixo seguido de barra, e um prefixo mal escolhido tornaria publica a fila interna do escritorio. Confira que /aprovar NAO entrou em AUTH_SCREENS — usuario logado que abre o link do cliente nao pode ser jogado para a home — e que o middleware nao foi tocado.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "QUEM TEM O LINK VE UM ROTEIRO, E MAIS NADA. Abra apps/web/src/app/aprovar/[token]/page.tsx e confira que a tela mostra exatamente roteiro, legenda e resultado da checagem do Provimento 205. REPROVE qualquer nome de persona, angulo, score, nome do escritorio, contagem, lista de outros roteiros, menu, cabecalho do app ou link para qualquer outra tela: cada um deles conta ao portador do link algo sobre o escritorio que ele nao deveria saber, e o link circula fora de qualquer controle. REPROVE tambem se a pagina montar cliente de banco por conta propria (createClient ou createSupabaseClientFromEnv): toda leitura passa por lerRoteiroPorToken do ticket 242, que e o unico lugar onde a chave de servico aparece e onde o filtro por token e garantido.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "A TELA NAO REINTRODUZ A DISTINCAO QUE O SERVIDOR TIROU. Confira que token invalido, expirado e revogado caem TODOS no mesmo notFound(), sem mensagem, parametro de busca, codigo ou variacao de pagina que diga qual dos tres foi: o ticket 242 devolve o mesmo nulo nos tres casos justamente para o link nao virar oraculo, e a tela nao pode desfazer isso. REPROVE qualquer texto do tipo 'este link expirou' ou 'link revogado'. Confira que o token nao aparece em nenhum texto visivel, em nenhum atributo de acessibilidade e em nenhum console — ele vive na URL e no campo que a acao recebe. Confira que 'pedir ajuste' com comentario vazio nao envia, e que link ja respondido mostra o estado e o comentario SEM oferecer os botoes de novo.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "repetição: 2ª reprovação igual à anterior (sub=juiz, diff=255), sem 3ª volta. critério(s) reprovado(s): juiz: Dois testes de ausência em apps/web/test/aprovar-publico.test.tsx não têm controle positivo no mesmo render: 'não mostra persona, ângulo, score nem link' (~l.135) só usa not.toMatch, e 'o token só aparece no campo escondido' (~l.147) passaria mesmo sem nenhum campo escondido, porque nunca afirma que o input hidden com o TOKEN existe nem que o gancho aparece. Além disso, page.tsx:18 apenas esconde com CSS (`body > header { display: none }`) a barra do app que o layout raiz monta, então o menu e os links internos continuam no HTML entregue a quem tem o link, e o teste renderiza a página sem o layout, sem ver isso.; CRITÉRIO DE AUSÊNCIA EXIGE CONTROLE POSITIVO. Um teste que só afirma que algo NÃO aparece passa igual quando o componente não renderiza nada. Exija, no MESMO render/execução, ao menos uma asserção POSITIVA de que a coisa certa apareceu. Reprove ausência provada no vazio.; QUEM TEM O LINK VE UM ROTEIRO, E MAIS NADA. Abra apps/web/src/app/aprovar/[token]/page.tsx e confira que a tela mostra exatamente roteiro, legenda e resultado da checagem do Provimento 205. REPROVE qualquer nome de persona, angulo, score, nome do escritorio, contagem, lista de outros roteiros, menu, cabecalho do app ou link para qualquer outra tela",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": "",
  "tentativas": 3
}
```
