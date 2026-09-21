# Ticket 232 — a listagem e a edição mostram o nome do nicho, não o slug

> A **fonte de verdade de máquina** é o bloco ```json abaixo.

## Objetivo (prosa)

Depois do 231, uma persona nova nasce vinculada ao catálogo por `nicho_id`, e a tela ainda mostra
`nicho_juridico`. Numa persona nova esse campo pode estar vazio — quem escolheu do catálogo não
digitou texto livre — e o cartão da listagem ficaria sem título de nicho. Este ticket faz as duas
telas lerem o **nome do catálogo** quando existe vínculo.

**O fallback é a regra, não a exceção.** As personas que já estão no banco têm `nicho_id` nulo (a
`0028` não faz backfill, de propósito) e só têm o texto livre — inclusive em formatos desalinhados
como `'direito_previdenciario'`. Toda exibição segue a ordem **nome do catálogo → texto livre →
nada**, e nunca mostra os dois. Sem o fallback, toda persona anterior ao catálogo perde o nicho da
tela.

**A tela de edição não tem campo de nicho próprio.** `apps/web/src/app/personas/[id]/editar/page.tsx`
só monta o cabeçalho e chama `<PersonaForm inicial={persona} />`; o campo readOnly de nicho vive em
`PersonaForm.tsx:63-71`. É lá que o rótulo muda — e só o **rótulo exibido**: o campo continua
readOnly com `name="nicho_juridico"`, e `atualizarPersona` já descarta esse campo por ser metade da
chave única imutável.

**A palavra "null" nunca pode aparecer.** `apps/web/test/personas-listagem.test.tsx:82,100` já
afirma isso sobre o corpo renderizado, e é exatamente o risco de um campo novo que pode vir vazio.

## Alvo vermelho

`apps/web/test/personas-nicho-nome.test.tsx` não existe (`test -f` → rc 1) e nada em `apps/web`
conhece o nome do catálogo na tela: `git grep -c 'nicho_nome' -- apps/web/src/app` → **rc 1, saída
vazia**. A listagem ainda imprime `{p.nicho_juridico}` cru em duas linhas de
`apps/web/src/app/personas/page.tsx` (`:74` e `:129`), e `test -f apps/web/src/lib/nicho-exibicao.ts`
→ **rc 1**.

## Colisão

`git grep -ln 'rotuloNicho' -- '*.test.*'` → **0**.
`apps/web/test/personas-listagem.test.tsx` fica **FORA da allowlist**: as fixtures dele têm
`nicho_id`/`nicho_nome` ausentes, então caem no fallback de texto livre e as quatro asserções de
título continuam valendo sem edição — é o controle positivo de que persona antiga não perdeu o
nicho. `apps/web/test/personas-edicao.test.ts:135` afirma `nicho.value === 'Previdenciário'` sobre
uma fixture sem `nicho_nome`, que também cai no fallback: fica **FORA** pelo mesmo motivo.
Sobreposição com o 230 (`personas-types.ts` traz `nicho_nome`) e com o 231 (`PersonaForm.tsx`,
`personas/page.tsx`) ⇒ **dep de 230 e 231**.

## Campos de máquina

```json
{
  "id": "232",
  "bloco": "B2",
  "frente": "B2-F6",
  "slug": "nome-do-nicho-na-listagem-e-na-edicao",
  "origem": "humano",
  "objetivo": "Faz a listagem e o formulario em modo edicao mostrarem o NOME do nicho vindo do catalogo, com queda para o texto livre. (1) Crie apps/web/src/lib/nicho-exibicao.ts, modulo PURO (sem 'use server', sem 'server-only', sem import de supabase, sem IO), exportando rotuloNicho(nichoNome: string | null | undefined, nichoLivre: string | null | undefined): string. Ela devolve o nome do catalogo quando ele existe e nao e so espacos; senao devolve o texto livre quando ele existe e nao e so espacos; senao devolve string VAZIA. Nunca devolve os dois juntos, nunca devolve a palavra 'null' e nunca devolve 'undefined'. Essa ordem — nome do catalogo, depois texto livre — e a regra do ticket: as personas anteriores a migration 0028 tem nicho_id nulo, porque a 0028 nao faz backfill de proposito, e so tem o texto livre. (2) Em apps/web/src/app/personas/page.tsx, troque as exibicoes cruas de p.nicho_juridico por rotuloNicho(p.nicho_nome, p.nicho_juridico): o titulo do cartao quando a persona nao tem nome proprio, a linha de subtitulo quando tem, e o titulo passado ao componente de confirmacao de exclusao. Quando rotuloNicho devolver string vazia, o cartao NAO pode ficar com titulo em branco nem imprimir 'null': caia na identificacao do cliente, que e o mesmo criterio ja usado hoje para persona sem nome proprio. (3) Em apps/web/src/app/personas/PersonaForm.tsx, no campo de nicho do MODO EDICAO (o TextField readOnly), o VALOR EXIBIDO passa a ser rotuloNicho(inicial.nicho_nome, inicial.nicho_juridico). O campo continua readOnly e continua com name nicho_juridico; nao vire select, nao o torne editavel e nao mexa no modo criacao, que e do ticket 231. Trocar so o rotulo e seguro porque atualizarPersona ja descarta nicho_juridico do patch, por ser metade da chave unica personas_cliente_nicho_uk (migration 0001). NAO altere apps/web/src/app/personas/[id]/editar/page.tsx: aquela tela so monta cabecalho e chama o PersonaForm, e nao tem campo de nicho proprio. (4) Crie apps/web/test/personas-nicho-nome.test.tsx com no minimo 7 casos it(), ambiente jsdom, no padrao de apps/web/test/personas-listagem.test.tsx (vi.mock de 'server-only' e da leitura de personas, render do Server Component com await): rotuloNicho com nome do catalogo e texto livre presentes devolve o NOME DO CATALOGO; com so o texto livre devolve o texto livre; com os dois ausentes devolve string vazia; com o nome do catalogo em branco cai no texto livre; a listagem de uma persona VINCULADA mostra o nome do catalogo e NAO mostra o texto livre; a listagem de uma persona ANTIGA (sem vinculo) continua mostrando o texto livre; e o corpo renderizado nunca contem a palavra 'null'. (5) NAO altere apps/web/test/personas-listagem.test.tsx nem apps/web/test/personas-edicao.test.ts: as fixtures dos dois nao tem nome de catalogo, caem no fallback e as assercoes continuam valendo sem edicao — eles sao o controle positivo de que persona antiga nao perdeu o nicho da tela. (6) NAO altere apps/web/src/server/personas-read.ts (o ticket 230 ja traz nicho_nome), NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
  "pathspec_allowlist": [
    "apps/web/src/lib/nicho-exibicao.ts",
    "apps/web/src/app/personas/page.tsx",
    "apps/web/src/app/personas/PersonaForm.tsx",
    "apps/web/test/personas-nicho-nome.test.tsx"
  ],
  "cria_novo": [
    "apps/web/src/lib/nicho-exibicao.ts",
    "apps/web/test/personas-nicho-nome.test.tsx"
  ],
  "dependencias": [
    "230b",
    "231"
  ],
  "diff_estimado": 200,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste do nome do nicho existe e passa",
      "cmd": "test -f apps/web/test/personas-nicho-nome.test.tsx && cd apps/web && npx vitest run test/personas-nicho-nome.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
      "espera": "1"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 7 casos pedidos (1/2): o arquivo apps/web/test/personas-nicho-nome.test.tsx existe",
      "cmd": "test -f apps/web/test/personas-nicho-nome.test.tsx && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 7 casos pedidos (2/2): contagem de 'it(' em apps/web/test/personas-nicho-nome.test.tsx",
      "cmd": "test $(grep -c 'it(' apps/web/test/personas-nicho-nome.test.tsx) -ge 7 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a regra de exibicao do nicho e um modulo puro proprio (1/2): o arquivo apps/web/src/lib/nicho-exibicao.ts existe",
      "cmd": "test -f apps/web/src/lib/nicho-exibicao.ts && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a regra de exibicao do nicho e um modulo puro proprio (2/2): contagem de 'export function rotuloNicho' em apps/web/src/lib/nicho-exibicao.ts",
      "cmd": "test $(grep -cE 'export function rotuloNicho' apps/web/src/lib/nicho-exibicao.ts) -eq 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a listagem passou a usar a regra nas tres exibicoes",
      "cmd": "test $(grep -o 'rotuloNicho' apps/web/src/app/personas/page.tsx | wc -l) -ge 4 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o formulario em edicao passou a exibir o rotulo do nicho",
      "cmd": "test $(grep -c 'rotuloNicho' apps/web/src/app/personas/PersonaForm.tsx) -ge 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "a listagem nao imprime mais o texto livre do nicho cru",
      "cmd": "grep -c '{p.nicho_juridico}' apps/web/src/app/personas/page.tsx",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "o modulo de exibicao e puro: sem supabase, sem server-only",
      "cmd": "grep -cE '@supabase|server-only' apps/web/src/lib/nicho-exibicao.ts",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a tela de edicao nao foi tocada (o campo vive no formulario)",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- 'apps/web/src/app/personas/[id]' | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a leitura de personas nao foi tocada (o 230 ja trouxe nicho_nome)",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/src/server/personas-read.ts | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "os dois controles positivos nao foram editados",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/personas-listagem.test.tsx apps/web/test/personas-edicao.test.ts | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma migration nova e supabase intocado",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- supabase | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum servico foi tocado",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- services | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhum skip, only ou todo no teste novo",
      "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-nicho-nome.test.tsx",
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
      "descricao": "O FALLBACK E A REGRA, E PERSONA ANTIGA NAO PODE PERDER O NICHO. Abra apps/web/src/lib/nicho-exibicao.ts e confira que rotuloNicho tenta o NOME DO CATALOGO primeiro e cai no TEXTO LIVRE quando ele falta OU esta em branco — nao so quando e nulo. REPROVE se a funcao devolver os dois concatenados, ou se devolver o texto livre na frente do nome do catalogo: a partir da migration 0028 o texto livre so e verdade para quem escolheu 'Outros' ou para persona anterior ao catalogo. Confira que o teste tem OS DOIS casos de tela: persona VINCULADA mostrando o nome do catalogo e NAO o texto livre, e persona ANTIGA (sem vinculo) ainda mostrando o texto livre. Sem o segundo caso, uma implementacao que so lesse nicho_nome passaria e apagaria o nicho de toda persona ja cadastrada.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "NADA DE 'null' NA TELA E NADA DE TITULO VAZIO. Confira que, quando rotuloNicho devolve string vazia, a listagem cai na identificacao do cliente em vez de renderizar titulo em branco — e o mesmo criterio que a tela ja aplica para persona sem nome proprio. REPROVE qualquer caminho em que 'null' ou 'undefined' possa chegar ao corpo renderizado: apps/web/test/personas-listagem.test.tsx:82,100 ja afirma que a palavra nunca aparece, e um campo novo que pode vir vazio e exatamente o risco. Confira que o teste novo repete essa afirmacao sobre o corpo renderizado.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "ESCOPO: SO EXIBICAO, E SO NO MODO EDICAO DO FORMULARIO. Confira que a mudanca em PersonaForm.tsx troca APENAS o valor exibido do campo readOnly de nicho no modo EDICAO: ele continua readOnly, continua com name nicho_juridico e nao vira select. O modo criacao e do ticket 231 e nao pode ter sido alterado aqui. Confira que apps/web/src/server/personas-read.ts esta INTOCADO — quem traz nicho_nome do banco e o ticket 230, e refaze-lo aqui criaria dois pontos de leitura. REPROVE se apps/web/test/personas-listagem.test.tsx ou apps/web/test/personas-edicao.test.ts tiverem sido editados: as fixtures dos dois nao tem nome de catalogo e sao o controle positivo do fallback.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "pendente",
  "notas_status": "",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": ""
}
```
