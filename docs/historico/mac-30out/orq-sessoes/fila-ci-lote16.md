# Sessão de fila · CI · lote 16 · destravar o 243

Data: 21/09/2026 · worktree: /Users/lucasantos/Projetos/_worktrees/ci-fila-16 · branch fila/lote-16 · sem commit, sem push, sem merge.

## Passo 0 · Leitura

1. docs/fila/243-rota-e-tela-publica-de-aprovacao.md (272 linhas, status refatiar) e docs/fila/244-fila-interna-de-aprovacao.md (pendente, depende de 241b, 242 e 243).
2. Trilha no checkout principal: `243 INICIO attempt=1 model=sonnet` (13:30), `GATE typecheck=ok testes=ok enforcement=falha criterios=27/27 build=ok`, `REFATIAR motivo=enforcement arquivos=apps/web/test/aprovar-publico.test.tsx: const TOKEN = 'tok-secreto-9f8e7d6c'`, `DECISAO_PENDENTE origem=humano-executor` (13:33).
3. runs/243/attempt-0: enforcement.json com uma violação `credencial`; gates.txt todo ok (1727 testes passando); veredito.json `causa: enforcement, contaComoRetry: false`. A linha está em diff.patch:149 (`+const TOKEN = 'tok-secreto-9f8e7d6c'`).
4. scripts/orquestrador/enforcement-core.ts:284-286, expressão que reprovou:
   `/\b(api[_-]?key|secret|token|password|passwd|service[_-]?role|access[_-]?key)\b\s*[:=]\s*['"`]([^'"`]{16,})['"`]/i`
5. Por que casou: `TOKEN` casa `token` com a flag i; o valor tem 19 caracteres (mínimo 16); não casa PLACEHOLDER (linha 287, que só aceita valor começando por test/fake/mock etc.); tem letra e dígito (linha 295). Logo `pareceCredencial` devolve verdadeiro.

## O que mudou no 243

- Objetivo: item (9) novo. Token e segredo de teste nascem em tempo de execução com `randomBytes` de `node:crypto`, em hex, nunca como literal atribuído a token, secret, api_key ou password, nem com valor de aparência falsa. Cita enforcement-core.ts:285 como motivo.
- Critério novo (tipo alvo, posição 12 de 31), `espera: "0"`, sem `|| echo`, sem `>/dev/null 2>&1 && echo`, sem `| grep -q`. A expressão é a mesma classe de nomes da barreira em ERE POSIX, mais estrita de propósito: qualquer literal de 16 ou mais caracteres entre aspas conta, sem a isenção de placeholder, porque a regra do objetivo proíbe o literal, não só o que parece real.
- status `refatiar` para `pendente`; notas_status explica motivo e conserto.
- Parágrafo "Revisão 21/09" no fim da prosa.
- Os 30 critérios existentes, allowlist, cria_novo e dependências estão intactos (o diff só remove as linhas de objetivo, status e notas_status).

## O critério novo, rodado agora

Comando, extraído do JSON com jq (não redigitado):

```
test -f apps/web/test/aprovar-publico.test.tsx && grep -ciE '(api[_-]?key|secret|token|password|passwd|service[_-]?role|access[_-]?key)[[:space:]]*[:=][[:space:]]*["'\''`][^"'\''`]{16,}["'\''`]' apps/web/test/aprovar-publico.test.tsx
```

| Contra | Saída | rc | Leitura |
|---|---|---|---|
| a base (arquivo não existe) | vazia | 1 | vermelho; `test -f` falha e nada é impresso, então não bate com "0" |
| o test.tsx da tentativa 0 (reconstruído das linhas + do diff.patch, em scratch) | `1` | 0 | reprova, pega exatamente `const TOKEN = 'tok-secreto-9f8e7d6c'` |
| `const TOKEN = randomBytes(16).toString('hex')` e `const token: string = TOKEN` | `0` | 1 | a forma pedida passa |

É **alvo**, não guarda: o arquivo é `cria_novo` do ticket e não existe na base, então o critério não pode estar verde antes da execução. Fica vermelho por ausência na base e só fica verde quando o executor cria o teste sem literal atribuído. Com `test -f` na frente, arquivo ausente dá saída vazia, e não um `0` falso. O rc 1 do grep com contagem zero é o mesmo formato já aceito pelo critério "a rota publica NAO virou tela de auth" (`grep -cE ...`, espera "0").

## Saída do validar

`ORQ_EXEC_ROOT=. bash scripts/orq validar --fila /Users/lucasantos/Projetos/_worktrees/ci-fila-16/docs/fila 243 --relatorio`

```
GATE DE TICKET · 1 ticket(s) · fila /Users/lucasantos/Projetos/_worktrees/ci-fila-16/docs/fila

243-rota-e-tela-publica-de-aprovacao.md  OK
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[2] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/aprovar-publico.test.tsx) -ge 6 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[4] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'updateSession|@supabase/ssr' apps/web/test/aprovar-publico.test.tsx | wc -l) -ge 2 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[6] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -cE "'/aprovar'" apps/web/src/lib/auth/routes.ts) -eq 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[8] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE 'lerRoteiroPorToken|notFound' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx' | wc -l) -ge 3 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[10] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'decidirPorToken' 2>/dev/null 'apps/web/src/app/aprovar/[token]/page.tsx') -ge 1 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[11] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "/aprovar|/aprovacoes" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[13] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -oE "'/[a-z-]+'" apps/web/src/lib/auth/routes.ts | wc -l) -eq 5 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[16] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/auth-validation.test.ts) -ge 9 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[17] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/auth-validation.test.ts) -ge 40 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[19] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'it(' apps/web/test/briefing-gate.test.ts) -ge 9 && echo ok
  243-rota-e-tela-publica-de-aprovacao.md:criterios_aceite[20] ISENCAO '$(' no segmento 1 pelo prefixo permitido 'test $(' — cmd: test $(grep -c 'expect(' apps/web/test/briefing-gate.test.ts) -ge 16 && echo ok

TOTAL: 0 violação(ões), 11 isenção(ões), em 1 ticket(s)
rc=0
```

## git status

```
 M docs/fila/243-rota-e-tela-publica-de-aprovacao.md
```

## Diff cru

```diff
diff --git a/docs/fila/243-rota-e-tela-publica-de-aprovacao.md b/docs/fila/243-rota-e-tela-publica-de-aprovacao.md
index 404e5c8..5a9738a 100644
--- a/docs/fila/243-rota-e-tela-publica-de-aprovacao.md
+++ b/docs/fila/243-rota-e-tela-publica-de-aprovacao.md
@@ -55,6 +55,17 @@ B2-F2. `auth-validation.test.ts` entra na allowlist **só para ganhar casos**: h
 e um deles ("rota pública não passa a exigir org nem persona") é justamente o controle positivo de
 que a classe pública não afrouxou o gate de onboarding. Guarda cobra que não seja editado.
 
+## Revisão 21/09
+
+A primeira execução entregou código verde em typecheck, testes, build e 27/27 critérios, e mesmo
+assim saiu REFATIAR por enforcement: a barreira de credencial do motor
+(`scripts/orquestrador/enforcement-core.ts:285`, `CREDENCIAL_ATRIBUICAO`) casou
+`const TOKEN = 'tok-secreto-9f8e7d6c'` em `apps/web/test/aprovar-publico.test.tsx`. A barreira está
+certa em ser estrita e não muda; o defeito era o ticket não avisar. O objetivo ganhou o item (9):
+token e segredo de teste nascem em tempo de execução, com `randomBytes` de `node:crypto` em hex,
+nunca como literal atribuído a `token`, `secret`, `api_key` ou `password`. Um critério alvo novo
+prova isso no arquivo de teste. Allowlist, dependências e critérios existentes não mudaram.
+
 ## Campos de máquina
 
 ```json
@@ -64,7 +75,7 @@ que a classe pública não afrouxou o gate de onboarding. Guarda cobra que não
   "frente": "B3-F1",
   "slug": "rota-e-tela-publica-de-aprovacao",
   "origem": "humano",
-  "objetivo": "Cria a UNICA rota publica nova de B3-F1: a tela que o cliente do escritorio abre pelo link. (1) Em apps/web/src/lib/auth/routes.ts, acrescente '/aprovar' a PUBLIC_PREFIXES. NAO acrescente a AUTH_SCREENS: nao e tela de autenticacao, e usuario logado que abrir o link NAO pode ser redirecionado para a home. NAO altere casaPrefixo, isPublicPath nem isAuthScreen, e NAO acrescente nenhum outro prefixo: esta e a unica rota publica que este bloco cria. O nome importa: casaPrefixo exige igualdade exata ou o prefixo seguido de barra, entao '/aprovar' e '/aprovar/<token>' ficam publicos e '/aprovacoes' — a fila INTERNA do ticket 244 — NAO casa e continua atras de sessao. (2) Crie apps/web/src/app/aprovar/[token]/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic'. Ela le o token do parametro de rota, chama lerRoteiroPorToken de @/server/aprovacoes-publico (ticket 242) e, quando o retorno e nulo, chama notFound() de next/navigation. Token invalido, expirado e revogado caem TODOS nesse mesmo notFound, sem mensagem que diga qual foi: a funcao do 242 ja devolve o mesmo nulo nos tres casos, e a tela nao pode reintroduzir a distincao que o servidor tirou. (3) A pagina mostra EXATAMENTE tres coisas, na linguagem do advogado: o roteiro (gancho e corpo), a legenda com as hashtags, e o resultado da checagem do Provimento 205. NADA ALEM DISSO: sem nome de persona, sem angulo, sem score, sem outros roteiros do escritorio, sem menu, sem link para qualquer outra tela do app, sem nome do escritorio. Quem tem o link ve UM roteiro. NAO use nenhum layout, cabecalho ou navegacao que exponha a superficie interna do produto. (4) A pagina traz dois caminhos de resposta: aprovar, e pedir ajuste com um campo de comentario. Os dois chamam decidirPorToken de @/server/aprovacoes-publico, passando o token que veio da rota. Pedir ajuste com comentario vazio nao envia. Quando o link ja foi respondido, a pagina mostra o estado atual e o comentario, e NAO oferece os botoes de novo. (5) O TOKEN NAO APARECE EM NENHUM TEXTO VISIVEL, em nenhum atributo de acessibilidade e em nenhum console: ele vive na URL e no campo que a acao recebe, e nada mais. Onde for preciso identificar o link na tela, nao identifique — o cliente ja sabe que link abriu. (6) Em apps/web/test/auth-validation.test.ts, ACRESCENTE casos (sem remover nem alterar nenhum dos que ja existem): isPublicPath('/aprovar') e isPublicPath('/aprovar/abc123') sao verdadeiros; isPublicPath('/aprovacoes') e FALSO, e isAuthScreen('/aprovar/abc123') e FALSO. O caso de '/aprovacoes' e o que impede um prefixo mal escolhido tornar publica a fila interna do escritorio. (7) Crie apps/web/test/aprovar-publico.test.tsx com no minimo 6 casos it(), mockando '@supabase/ssr' e usando NextRequest real, no padrao EXATO de apps/web/test/briefing-gate.test.ts, mais 'server-only' e '@/server/aprovacoes-publico' mockados para o render: SEM SESSAO, um request para /aprovar/<token> atravessa updateSession sem redirecionar para /login; sem sessao, um request para /aprovacoes redireciona para /login; sem sessao, /aprovar nao dispara nenhuma consulta de organization_members nem de personas (o guard de onboarding nao alcanca rota publica); a pagina renderizada com um roteiro valido mostra o gancho, o corpo, a legenda e o veredito; a pagina com lerRoteiroPorToken devolvendo nulo chama notFound; e a pagina NAO mostra nome de persona, angulo, score nem link para outra tela do app. Prove a classe publica nos DOIS niveis: pela funcao pura isPublicPath e pelo request atravessando o middleware. (8) NAO altere apps/web/test/briefing-gate.test.ts: os 9 casos dele sao o controle positivo de que o gate de onboarding nao afrouxou, e um deles afirma justamente que rota publica nao passa a exigir org nem persona. NAO altere apps/web/src/lib/supabase/middleware.ts. NAO crie migration, NAO altere supabase/, NAO toque em services/ e NAO crie a tela interna da fila — ela e o ticket 244.",
+  "objetivo": "Cria a UNICA rota publica nova de B3-F1: a tela que o cliente do escritorio abre pelo link. (1) Em apps/web/src/lib/auth/routes.ts, acrescente '/aprovar' a PUBLIC_PREFIXES. NAO acrescente a AUTH_SCREENS: nao e tela de autenticacao, e usuario logado que abrir o link NAO pode ser redirecionado para a home. NAO altere casaPrefixo, isPublicPath nem isAuthScreen, e NAO acrescente nenhum outro prefixo: esta e a unica rota publica que este bloco cria. O nome importa: casaPrefixo exige igualdade exata ou o prefixo seguido de barra, entao '/aprovar' e '/aprovar/<token>' ficam publicos e '/aprovacoes' — a fila INTERNA do ticket 244 — NAO casa e continua atras de sessao. (2) Crie apps/web/src/app/aprovar/[token]/page.tsx como Server Component, com export const dynamic igual a 'force-dynamic'. Ela le o token do parametro de rota, chama lerRoteiroPorToken de @/server/aprovacoes-publico (ticket 242) e, quando o retorno e nulo, chama notFound() de next/navigation. Token invalido, expirado e revogado caem TODOS nesse mesmo notFound, sem mensagem que diga qual foi: a funcao do 242 ja devolve o mesmo nulo nos tres casos, e a tela nao pode reintroduzir a distincao que o servidor tirou. (3) A pagina mostra EXATAMENTE tres coisas, na linguagem do advogado: o roteiro (gancho e corpo), a legenda com as hashtags, e o resultado da checagem do Provimento 205. NADA ALEM DISSO: sem nome de persona, sem angulo, sem score, sem outros roteiros do escritorio, sem menu, sem link para qualquer outra tela do app, sem nome do escritorio. Quem tem o link ve UM roteiro. NAO use nenhum layout, cabecalho ou navegacao que exponha a superficie interna do produto. (4) A pagina traz dois caminhos de resposta: aprovar, e pedir ajuste com um campo de comentario. Os dois chamam decidirPorToken de @/server/aprovacoes-publico, passando o token que veio da rota. Pedir ajuste com comentario vazio nao envia. Quando o link ja foi respondido, a pagina mostra o estado atual e o comentario, e NAO oferece os botoes de novo. (5) O TOKEN NAO APARECE EM NENHUM TEXTO VISIVEL, em nenhum atributo de acessibilidade e em nenhum console: ele vive na URL e no campo que a acao recebe, e nada mais. Onde for preciso identificar o link na tela, nao identifique — o cliente ja sabe que link abriu. (6) Em apps/web/test/auth-validation.test.ts, ACRESCENTE casos (sem remover nem alterar nenhum dos que ja existem): isPublicPath('/aprovar') e isPublicPath('/aprovar/abc123') sao verdadeiros; isPublicPath('/aprovacoes') e FALSO, e isAuthScreen('/aprovar/abc123') e FALSO. O caso de '/aprovacoes' e o que impede um prefixo mal escolhido tornar publica a fila interna do escritorio. (7) Crie apps/web/test/aprovar-publico.test.tsx com no minimo 6 casos it(), mockando '@supabase/ssr' e usando NextRequest real, no padrao EXATO de apps/web/test/briefing-gate.test.ts, mais 'server-only' e '@/server/aprovacoes-publico' mockados para o render: SEM SESSAO, um request para /aprovar/<token> atravessa updateSession sem redirecionar para /login; sem sessao, um request para /aprovacoes redireciona para /login; sem sessao, /aprovar nao dispara nenhuma consulta de organization_members nem de personas (o guard de onboarding nao alcanca rota publica); a pagina renderizada com um roteiro valido mostra o gancho, o corpo, a legenda e o veredito; a pagina com lerRoteiroPorToken devolvendo nulo chama notFound; e a pagina NAO mostra nome de persona, angulo, score nem link para outra tela do app. Prove a classe publica nos DOIS niveis: pela funcao pura isPublicPath e pelo request atravessando o middleware. (8) NAO altere apps/web/test/briefing-gate.test.ts: os 9 casos dele sao o controle positivo de que o gate de onboarding nao afrouxou, e um deles afirma justamente que rota publica nao passa a exigir org nem persona. NAO altere apps/web/src/lib/supabase/middleware.ts. NAO crie migration, NAO altere supabase/, NAO toque em services/ e NAO crie a tela interna da fila — ela e o ticket 244. (9) SEGREDO DE TESTE NASCE EM TEMPO DE EXECUCAO. Em apps/web/test/aprovar-publico.test.tsx, o token de teste e qualquer outro segredo de teste sao gerados em tempo de execucao com randomBytes de node:crypto, em hex (por exemplo: import { randomBytes } from 'node:crypto' e const TOKEN = randomBytes(16).toString('hex')), e NUNCA escritos como literal entre aspas atribuido a um nome token, secret, api_key ou password, nem mesmo com valor de aparencia falsa. Motivo: a barreira de credencial do motor (scripts/orquestrador/enforcement-core.ts:285, CREDENCIAL_ATRIBUICAO) reprova toda linha nome = 'literal de 16 ou mais caracteres com letra e digito', e a tentativa anterior deste ticket caiu nela com const TOKEN = 'tok-secreto-9f8e7d6c' mesmo com typecheck, testes, build e criterios verdes. A barreira e estrita de proposito e nao muda; quem se adapta e o teste.",
   "pathspec_allowlist": [
     "apps/web/src/lib/auth/routes.ts",
     "apps/web/src/app/aprovar/[token]/page.tsx",
@@ -154,6 +165,12 @@ que a classe pública não afrouxou o gate de onboarding. Guarda cobra que não
       "cmd": "test $(grep -oE \"/aprovar|/aprovacoes\" apps/web/test/auth-validation.test.ts | wc -l) -ge 4 && echo ok",
       "espera": "ok"
     },
+    {
+      "tipo": "alvo",
+      "descricao": "o teste novo nao tem segredo literal atribuido que case a barreira de credencial (enforcement-core.ts:285): token e segredo de teste nascem de randomBytes em tempo de execucao",
+      "cmd": "test -f apps/web/test/aprovar-publico.test.tsx && grep -ciE '(api[_-]?key|secret|token|password|passwd|service[_-]?role|access[_-]?key)[[:space:]]*[:=][[:space:]]*[\"'\\''`][^\"'\\''`]{16,}[\"'\\''`]' apps/web/test/aprovar-publico.test.tsx",
+      "espera": "0"
+    },
     {
       "tipo": "guarda",
       "descricao": "so UM prefixo publico novo entrou na tabela",
@@ -263,8 +280,8 @@ que a classe pública não afrouxou o gate de onboarding. Guarda cobra que não
       "espera": "avaliador"
     }
   ],
-  "status": "refatiar",
-  "notas_status": "refatiar (enforcement): apps/web/test/aprovar-publico.test.tsx: const TOKEN = 'tok-secreto-9f8e7d6c' — não consome tentativa; resolver ampliando a allowlist ou fatiando o ticket",
+  "status": "pendente",
+  "notas_status": "revisado 21/09: a tentativa 1 passou em typecheck, testes, build e 27/27 criterios, mas saiu REFATIAR por enforcement porque a barreira de credencial (enforcement-core.ts:285) casou const TOKEN = 'tok-secreto-9f8e7d6c' em apps/web/test/aprovar-publico.test.tsx. O defeito era do ticket, que nao avisava o executor. Conserto: item (9) no objetivo manda gerar token e segredo de teste com randomBytes de node:crypto em hex, e um criterio alvo novo prova que o teste nao tem literal atribuido que case a barreira. Allowlist, fatia e criterios existentes inalterados; a barreira nao muda.",
   "hash_candidato": "",
   "sinal_hash": "",
   "gate_ok": ""
```

## Próximo passo (humano)

O 243 volta para a fila como pendente. O 244 continua travado até o 243 fechar. Esta edição está só na worktree ci-fila-16, sem commit: para a fila enxergar, é preciso commitar e levar para onde o loop lê.
