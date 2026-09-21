# Ticket 231 — o formulário de persona deixa de ser campo livre

> A **fonte de verdade de máquina** é o bloco ```json abaixo.

## Objetivo (prosa)

A tela que o dono viu em 2026-09-04. Hoje o advogado que abre `/personas` encontra caixas de texto
em branco para "Faixa de renda", "Tom de voz" e "Nicho jurídico", e o resultado é o que está no
banco: `'direito_previdenciario'` e `'Previdenciário'` na mesma coluna. Este ticket troca o campo
livre por escolha guiada, sobre o vocabulário que o ticket 230 já pôs em código.

**Faixa de renda vira escolha múltipla com teto.** A+, A, B, C, D, no máximo duas. O teto é do
formulário, não só do servidor: passadas duas, as demais ficam indisponíveis, para o advogado ver a
regra em vez de descobri-la num erro depois de enviar.

**Nicho vira seleção com escape.** Os onze nichos do catálogo mais **"Outros"**, que não é linha do
catálogo (ADR-0007) e sim a opção que abre o campo de texto livre. Escolher do catálogo manda
`nicho_id`; escolher "Outros" manda o texto — nunca os dois, que é a regra que o 230 já cobra no
servidor.

**Em edição o nicho continua travado, e isso não é preguiça.** `nicho_juridico` é metade da chave
única `personas_cliente_nicho_uk` (`supabase/migrations/0001_epico0_fundacao.sql:46`), e o formulário
já o trata como imutável na edição, com `apps/web/test/personas-edicao.test.ts:132-135` afirmando
`readOnly` sobre `#nicho_juridico`. O seletor existe **só no modo criação**; em edição nada muda ali.
Trocar por um `<select disabled>` quebraria aquela asserção sem entregar nada ao usuário.

**O CTA sai do formulário.** O gerador já sabe se virar sem ele:
`services/persona-roteirizador/src/geracao/cta.ts:67-72` cai na oferta quando `cta_padrao` é vazio.
Um campo a menos numa tela que já tem doze.

## Alvo vermelho

`apps/web/test/personas-form-guiado.test.tsx` não existe (`test -f` → rc 1). Os três campos ainda
são texto livre: `apps/web/src/app/personas/PersonaForm.tsx:80` (`TextField id="faixa_renda"`),
`:151` (`TextField id="tom_de_voz"`) e `:67` (`TextField id="nicho_juridico"`), e o campo de CTA
existe em `:156`. Não há leitura do catálogo: `test -f apps/web/src/server/nichos-read.ts` → **rc 1**.

## Colisão

`git grep -ln 'MultiEscolha\|listarNichos' -- '*.test.*'` → **0**.
`apps/web/test/personas-form.test.tsx` afirma só "Nome da persona", "Dores do público" e
"Palavras-chave" (linhas 39, 44-45, 51, 57-59) — nenhum dos campos que este ticket mexe — e
`apps/web/test/personas-edicao.test.ts:132-135` afirma o nicho readOnly **em edição**, preservado por
desenho. Os dois ficam **FORA da allowlist** e são o controle positivo. `fields.tsx` só recebe
componente novo; nenhum export existente é removido, e as outras telas que o consomem não mudam.
Sobreposição com o 228 e o 230 em `PersonaForm.tsx` e `personas-types.ts` ⇒ **dep de 228 e 230**.

## Campos de máquina

```json
{
  "id": "231",
  "bloco": "B2",
  "frente": "B2-F6",
  "slug": "formulario-de-persona-guiado",
  "origem": "humano",
  "objetivo": "Troca campo livre por escolha guiada no formulario de persona, sobre o vocabulario que o ticket 230 poe em codigo. (1) Crie apps/web/src/server/nichos-types.ts, SEM 'use server' e SEM 'server-only' (o componente client importa dali), exportando a interface NichoOpcao com id: string, slug: string e nome: string. (2) Crie apps/web/src/server/nichos-read.ts com import 'server-only', exportando async listarNichos(): Promise<NichoOpcao[]>, que le public.nichos_juridicos com o cliente AUTENTICADO (createClient de @/lib/supabase/server, mesmo padrao de apps/web/src/server/personas-read.ts), com projecao EXPLICITA de id, slug e nome, filtrando ativo verdadeiro e ordenando por ordem crescente. A tabela e catalogo GLOBAL somente leitura (migration 0028): NAO escreva nela, em nenhuma circunstancia. Falha de leitura devolve lista VAZIA em vez de lancar — o formulario ainda tem de abrir, com 'Outros' disponivel. (3) Em apps/web/src/components/fields.tsx, acrescente o componente MultiEscolha, que recebe name, label, tip, uma lista de opcoes, max e defaultValues, e renderiza uma caixa de selecao por opcao, TODAS com o MESMO name e cada uma com id PROPRIO derivado do valor — assim a Server Action le com formData.getAll(name), igual ao ListField que ja existe ali. Nenhum elemento do grupo tem id igual ao name do grupo. Quando o numero de selecionadas chega a max, as opcoes NAO selecionadas ficam desabilitadas, e um texto abaixo do grupo diz quantas ainda cabem, na linguagem do advogado. NAO remova nem altere nenhum export que ja existe em fields.tsx: outras telas consomem esse arquivo. (4) Em apps/web/src/app/personas/PersonaForm.tsx: o campo faixa_renda deixa de ser TextField e passa a MultiEscolha com as opcoes de FAIXAS_RENDA e max igual a MAX_FAIXAS_RENDA (ambos vindos de @/server/personas-types); o campo tom_de_voz deixa de ser TextField e passa a SelectField com as opcoes de TONS_DE_VOZ mais uma opcao vazia 'Não informado'; o campo de CTA (cta_padrao) SAI do formulario por completo, porque o gerador deriva o CTA da oferta quando ele e vazio. (5) Ainda em PersonaForm.tsx, SO NO MODO CRIACAO, o campo de nicho passa a ser um SelectField alimentado por uma nova prop opcional nichos?: NichoOpcao[] (padrao lista vazia), com uma opcao por nicho (value igual ao id, rotulo igual ao nome) MAIS a opcao especial 'Outros'. O nicho escolhido do catalogo e enviado no campo nicho_id; escolher 'Outros' revela um campo de texto com name nicho_juridico para o texto livre, e nesse caso nicho_id vai vazio. Nunca os dois preenchidos. NO MODO EDICAO NADA MUDA no campo de nicho: ele continua o TextField readOnly de hoje, com name nicho_juridico, porque o nicho e metade da chave unica personas_cliente_nicho_uk e o teste apps/web/test/personas-edicao.test.ts:132-135 afirma esse readOnly. (6) Em apps/web/src/app/personas/page.tsx, carregue os nichos com listarNichos() e passe-os ao PersonaForm. NAO altere apps/web/src/app/personas/[id]/editar/page.tsx neste ticket. (7) Crie apps/web/test/personas-form-guiado.test.tsx com no minimo 7 casos it(), ambiente jsdom, mockando '@/server/personas' com dubles inertes no padrao de apps/web/test/personas-form.test.tsx: em modo criacao as cinco faixas aparecem como opcoes selecionaveis; selecionadas duas, as outras ficam desabilitadas; o tom de voz e um select com os cinco tons do dono; o seletor de nicho lista os nichos recebidos por prop MAIS a opcao 'Outros'; escolher 'Outros' revela o campo de texto livre do nicho; nao existe mais nenhum campo de CTA no formulario; em modo edicao o campo de nicho continua readOnly com o valor da persona. Acrescente ainda um caso importando isPublicPath de @/lib/auth/routes e afirmando que '/personas' NAO e rota publica — a tela do cadastro so existe atras de sessao. NAO altere apps/web/src/lib/auth/routes.ts. (8) NAO altere apps/web/test/personas-form.test.tsx nem apps/web/test/personas-edicao.test.ts: os dois sao o controle positivo de que os campos antigos e o readOnly do nicho em edicao nao regrediram. NAO crie migration, NAO altere supabase/ e NAO toque em services/.",
  "pathspec_allowlist": [
    "apps/web/src/server/nichos-types.ts",
    "apps/web/src/server/nichos-read.ts",
    "apps/web/src/components/fields.tsx",
    "apps/web/src/app/personas/PersonaForm.tsx",
    "apps/web/src/app/personas/page.tsx",
    "apps/web/test/personas-form-guiado.test.tsx"
  ],
  "cria_novo": [
    "apps/web/src/server/nichos-types.ts",
    "apps/web/src/server/nichos-read.ts",
    "apps/web/test/personas-form-guiado.test.tsx"
  ],
  "dependencias": [
    "228",
    "230b"
  ],
  "diff_estimado": 450,
  "risco": "",
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste do formulario guiado existe e passa",
      "cmd": "test -f apps/web/test/personas-form-guiado.test.tsx && cd apps/web && npx vitest run test/personas-form-guiado.test.tsx 2>&1 | grep -cE 'Tests +[0-9]+ passed'",
      "espera": "1"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 8 casos pedidos (1/2): o arquivo apps/web/test/personas-form-guiado.test.tsx existe",
      "cmd": "test -f apps/web/test/personas-form-guiado.test.tsx && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o teste tem os 8 casos pedidos (2/2): contagem de 'it(' em apps/web/test/personas-form-guiado.test.tsx",
      "cmd": "test $(grep -c 'it(' apps/web/test/personas-form-guiado.test.tsx) -ge 8 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a leitura do catalogo de nichos existe (1/2): o arquivo apps/web/src/server/nichos-read.ts existe",
      "cmd": "test -f apps/web/src/server/nichos-read.ts && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a leitura do catalogo de nichos existe (2/2): contagem de 'nichos_juridicos' em apps/web/src/server/nichos-read.ts",
      "cmd": "test $(grep -c 'nichos_juridicos' apps/web/src/server/nichos-read.ts) -ge 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a escolha multipla com teto existe em fields.tsx",
      "cmd": "test $(grep -cE 'export function MultiEscolha' apps/web/src/components/fields.tsx) -eq 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o formulario passou a usar o vocabulario e a escolha multipla",
      "cmd": "test $(grep -oE '(MultiEscolha|FAIXAS_RENDA|TONS_DE_VOZ)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 4 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "o seletor de nicho e a opcao Outros existem no formulario",
      "cmd": "test $(grep -oE '(nicho_id|Outros)' apps/web/src/app/personas/PersonaForm.tsx | wc -l) -ge 3 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a tela carrega o catalogo e passa ao formulario",
      "cmd": "test $(grep -c 'listarNichos' apps/web/src/app/personas/page.tsx) -ge 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a tela protegida e provada pela classificacao de rotas (1/2): o arquivo apps/web/test/personas-form-guiado.test.tsx existe",
      "cmd": "test -f apps/web/test/personas-form-guiado.test.tsx && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "alvo",
      "descricao": "a tela protegida e provada pela classificacao de rotas (2/2): contagem de 'isPublicPath' em apps/web/test/personas-form-guiado.test.tsx",
      "cmd": "test $(grep -c 'isPublicPath' apps/web/test/personas-form-guiado.test.tsx) -ge 1 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "o campo de CTA saiu do formulario",
      "cmd": "grep -c 'cta_padrao' apps/web/src/app/personas/PersonaForm.tsx",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "faixa de renda deixou de ser campo de texto unico",
      "cmd": "grep -c 'id=\"faixa_renda\"' apps/web/src/app/personas/PersonaForm.tsx",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "nenhuma primitiva de formulario existente foi removida",
      "cmd": "test $(grep -oE 'export (function|const) (campoBase|LabelComTip|Campo|TextField|TextArea|SelectField|ListField|SubmitButton|Feedback)' apps/web/src/components/fields.tsx | wc -l) -ge 9 && echo ok",
      "espera": "ok"
    },
    {
      "tipo": "guarda",
      "descricao": "o catalogo global nao e escrito",
      "cmd": "grep -cE 'insert|upsert|update|delete' apps/web/src/server/nichos-read.ts",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a classificacao de rotas nao foi alterada",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/src/lib/auth/routes.ts | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "a tela de edicao nao foi tocada neste ticket",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- 'apps/web/src/app/personas/[id]' | wc -l | tr -d ' '",
      "espera": "0"
    },
    {
      "tipo": "guarda",
      "descricao": "os dois testes de controle positivo nao foram editados",
      "cmd": "git diff --name-only $BASE_REF...HEAD -- apps/web/test/personas-form.test.tsx apps/web/test/personas-edicao.test.ts | wc -l | tr -d ' '",
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
      "cmd": "cd apps/web && grep -cE '[.](skip|only|todo)\\(' test/personas-form-guiado.test.tsx",
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
      "descricao": "O TETO DE DUAS FAIXAS APARECE NA TELA, NAO SO NO SERVIDOR. Abra o MultiEscolha em apps/web/src/components/fields.tsx e confira que, atingido o max, as opcoes NAO selecionadas ficam de fato desabilitadas, e que ha um texto dizendo ao advogado quantas ainda cabem. REPROVE se o teto so existir como validacao de servidor: o usuario marcaria cinco faixas, enviaria e so entao descobriria a regra, com o formulario devolvendo erro — exatamente a experiencia que o lote inteiro esta corrigindo. Confira que todas as caixas compartilham o MESMO name, senao formData.getAll nao recebe a lista e o ticket 230 nunca ve as faixas. Confira que o teste tem o caso 'selecionadas duas, as outras ficam desabilitadas'.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "'OUTROS' E ESCAPE, NAO LINHA DE CATALOGO, E NUNCA CONVIVE COM O nicho_id. Confira em PersonaForm.tsx que 'Outros' e uma opcao do proprio seletor, montada no componente, e NAO um item vindo de listarNichos — o ADR-0007 e a migration 0028 dizem que ela nao existe na tabela. Confira que escolher 'Outros' revela o campo de texto livre com name nicho_juridico e deixa nicho_id VAZIO, e que escolher um nicho do catalogo NAO envia texto livre: os dois juntos sao duas verdades sobre o mesmo campo, e o ticket 230 recusa no servidor. REPROVE se o formulario puder enviar os dois preenchidos — a recusa do servidor viraria erro na cara de quem so clicou.",
      "cmd": "true",
      "espera": "avaliador"
    },
    {
      "tipo": "avaliador",
      "descricao": "EDICAO NAO REGRIDE, E O CTA SAIU DE VERDADE. Confira que, em modo EDICAO, o campo de nicho continua sendo o campo readOnly de hoje, com name nicho_juridico — nao um select desabilitado. O nicho e metade da chave unica personas_cliente_nicho_uk (migration 0001) e apps/web/test/personas-edicao.test.ts:132-135 le #nicho_juridico como input e afirma .readOnly true; trocar o elemento quebra aquela prova sem entregar nada ao usuario. REPROVE se aquele arquivo de teste tiver sido editado. Confira que o campo de CTA saiu do formulario por completo (nenhum input com name cta_padrao) e que nada em services/ foi tocado: quem cobre a ausencia de CTA no gerador e o ticket 233, nao este.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "bloqueado",
  "notas_status": "colisao NAO declarada, achada na sessao de 2026-09-07: tirar o campo de CTA e trocar faixa de renda e tom de voz por seletor quebra tres assercoes de apps/web/test/personas-form-preserva.test.tsx (linhas 74, 77 e 78), que esta FORA da allowlist deste ticket — e a mesma classe de defeito que bloqueou o 230 cinco vezes. Antes de enfileirar: ampliar a allowlist com esse arquivo e anti-afrouxamento por contagem, ou decidir que o campo de CTA fica. | critério(s) reprovado(s): a suite da web continua verde; gates reprovados (max_retries 2 atingido)",
  "hash_candidato": "",
  "sinal_hash": "",
  "gate_ok": ""
}
```
