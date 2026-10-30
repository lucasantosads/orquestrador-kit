# Ticket 1044: a etapa de briefing do onboarding no motor usa o briefing configurável (link público por token)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Item B2 da frente "Onboarding, motor canônico". O construtor de briefing já existe inteiro: modelos em `/dashboard/briefings-criativos` (menu de Configurações desde o 874), envios em `POST /api/briefings-criativos` (snapshot do modelo + token), página pública `/briefing/[token]` e o bloco "Briefing criativo" na ficha (Conta › Onboarding). A etapa de briefing do onboarding no motor não aponta para nada disso: o item do checklist é texto fixo ("enviar o briefing") e quem executa precisa sair da tela e montar o envio por fora.

Depois deste ticket a etapa de briefing (achada pela regra `briefing` de `etapaPorRegra`, do 1043) mostra o envio existente com o link público para copiar, ou um botão "Gerar link do briefing" que cria o envio a partir de um modelo ativo, ou, sem modelo cadastrado, "sem base: cadastre um modelo de briefing em Configurações" com o link para o construtor. Sem etapa que bata, o bloco vai para o topo da tela, como no 1043.

## Recon de 13/10

```
src/app/api/briefings-criativos/route.ts:38-65      GET ?cliente_id= devolve { briefings } com token; POST { template_id, cliente_id } -> 201 { briefing } (sem token)
src/app/api/briefings-criativos/templates/route.ts  GET { templates } (ativos e inativos)
src/app/dashboard/clientes/[id]/tabs/briefing-link.ts   linkPublicoBriefing(token, origem) -> /briefing/<token>
src/app/dashboard/clientes/[id]/tabs/briefing-criativo-bloco.tsx   molde (envio mais recente nao cancelado, copiar link, StatusBadge)
src/components/briefings-criativos/shared.tsx       StatusBadge ('use client')
src/lib/nav/papel.ts:360                            config.briefings-criativos (/dashboard/briefings-criativos, LIDERANCA)
src/app/dashboard/onboarding/motor/[id]/page.tsx    sem 'briefing' (grep -ci = 0)
src/lib/ops/onboarding/etapa-por-regra.ts (1043)    regra 'briefing' (/briefing/i)
```

## Campos de máquina

```json
{
  "id": "1044",
  "slug": "onboarding-etapa-briefing-usa-construtor",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 440 linhas (~150 em src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx NOVO, ~20 em src/app/dashboard/onboarding/motor/[id]/page.tsx, ~230 em test/onboarding-motor-briefing-etapa.test.tsx NOVO). Se passar do teto, pare e reporte. Depende do 1043 (etapaPorRegra com a regra 'briefing', itens carregados na pagina, padrao do bloco por etapa). CONTEXTO: o construtor de briefing ja existe (modelos em ops_briefing_template via GET /api/briefings-criativos/templates -> { templates: { id, nome, ativo }[] }; envios via POST /api/briefings-criativos { template_id, cliente_id } -> 201 { briefing } sem token; GET /api/briefings-criativos?cliente_id=<uuid> -> { briefings } com token, status 'enviado' | 'respondido' | 'cancelado', enviado_em, respondido_em; link publico = linkPublicoBriefing(token, origem) de src/app/dashboard/clientes/[id]/tabs/briefing-link.ts, pagina /briefing/[token]). A etapa de briefing do onboarding no motor nao aponta para nada disso. PASSO 1: leia src/app/dashboard/onboarding/motor/[id]/page.tsx (apos o 1043: itens, etapaPorRegra, bloco por etapa), src/app/dashboard/onboarding/motor/[id]/_components/grupo-whatsapp-etapa.tsx (molde do componente e dos estados), src/lib/ops/onboarding/etapa-por-regra.ts, src/app/dashboard/clientes/[id]/tabs/briefing-criativo-bloco.tsx (molde do envio mais recente, copiar link, StatusBadge), src/app/dashboard/clientes/[id]/tabs/briefing-link.ts, src/app/api/briefings-criativos/route.ts, src/app/api/briefings-criativos/templates/route.ts e test/onboarding-motor-grupo-whatsapp.test.tsx (molde do teste). FAZER: (1) NOVO src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx ('use client'): export type EstadoBriefing = { tipo: 'carregando' } | { tipo: 'erro' } | { tipo: 'enviado'; id: string; status: 'enviado' | 'respondido'; link: string | null; enviadoEm: string | null } | { tipo: 'sem_modelo' } | { tipo: 'pronto'; modelos: { id: string; nome: string }[] }. export function BriefingEtapaView({ estado, modeloId, onModelo, enviando, onGerar }: { estado: EstadoBriefing; modeloId: string; onModelo: (id: string) => void; enviando: boolean; onGerar: () => void }): raiz `<div data-testid=\"briefing-etapa\">` com rotulo text-fs-label uppercase 'Briefing'; carregando: 'Verificando o briefing...'; erro: 'Nao foi possivel verificar o briefing agora.' (acento no codigo) em text-muted-foreground; enviado: StatusBadge (src/components/briefings-criativos/shared), 'Enviado em dd/mm/aa' quando enviadoEm, o link publico como `<a href={link} target=\"_blank\" rel=\"noreferrer\">` com o texto do link e um `<button type=\"button\">Copiar link</button>` (navigator.clipboard, estado 'Copiado'), `<Link href={`/dashboard/briefings-criativos/${id}`}>Abrir detalhe</Link>`; link null (envio sem token) => 'sem base: envio sem link publico' em cinza; sem_modelo: 'sem base: cadastre um modelo de briefing em Configuracoes' (acento no codigo) em text-muted-foreground com `<Link href=\"/dashboard/briefings-criativos\">Abrir Configuracoes</Link>` e NENHUM botao de gerar; pronto: `<select aria-label=\"Modelo de briefing\">` com os modelos ativos (value=modeloId, onChange onModelo; com 1 modelo o select ainda existe, ja escolhido) e `<button type=\"button\" onClick={onGerar} disabled={enviando || !modeloId}>Gerar link do briefing</button>`. export function BriefingEtapa({ clienteId }: { clienteId: string }): useEffect carrega em paralelo fetchJson<{ briefings: { id: string; status: string; token?: string | null; enviado_em: string | null }[] }>(`/api/briefings-criativos?cliente_id=${clienteId}`) e fetchJson<{ templates: { id: string; nome: string; ativo: boolean }[] }>('/api/briefings-criativos/templates'); envio = primeiro briefing com status !== 'cancelado' => enviado com link = linkPublicoBriefing(token, window.location.origin); senao modelos ativos vazios => sem_modelo; senao pronto (modeloId inicial = primeiro ativo); rejeicao => erro. onGerar: SO no clique: fetch POST '/api/briefings-criativos' com Content-Type application/json e body JSON.stringify({ template_id: modeloId, cliente_id: clienteId }); !res.ok => toast.error(error do corpo lido com res.text() + JSON.parse, ou 'Nao foi possivel gerar o briefing agora.'); ok => toast.success('Link do briefing gerado') e recarrega (o GET com cliente_id traz o token). Nenhum .json() literal; nenhuma geracao fora do handler do clique. (2) src/app/dashboard/onboarding/motor/[id]/page.tsx: `import { BriefingEtapa } from './_components/briefing-etapa'`; `const etapaBriefingId = etapaPorRegra(onb.etapas, itens ?? [], 'briefing')`; dentro do Card de cada etapa, depois do bloco do grupo do 1043, `{e.id === etapaBriefingId && <BriefingEtapa clienteId={onb.cliente_id} />}`; quando etapaBriefingId e null, monte `<BriefingEtapa clienteId={onb.cliente_id} />` no mesmo Card de topo do 1043 (ou num Card proprio se o do grupo nao existir naquele onboarding). So com onb.status === 'em_andamento'. As linhas que os testes leem ficam iguais (`progressoOnboarding(onb.etapas)`, `ROTULO_SEGUE_NO_CONTRATO`, `etapaPorRegra(`, `<GrupoWhatsappEtapa`). (3) NOVO test/onboarding-motor-briefing-etapa.test.tsx (vitest + renderToStaticMarkup): view sem_modelo rende 'sem base: cadastre um modelo de briefing' com href /dashboard/briefings-criativos e zero `<button`; pronto rende o select com os modelos e o botao 'Gerar link do briefing' (disabled com enviando ou sem modeloId); enviado rende o link publico (href contendo /briefing/), 'Copiar link' e 'Abrir detalhe' com o id; enviado com link null rende 'sem base: envio sem link'; erro rende a mensagem; o fonte do componente tem o literal `template_id: modeloId` exatamente 1 vez e depois do ultimo 'useEffect(' (readFileSync + indexOf); o fonte da pagina tem `<BriefingEtapa` e `'briefing')`; html sem travessao (U+2014). Regras do repo: texto de interface sem nome de tabela, view ou rota; nulo = 'sem base' em cinza; sem travessao; getSession nunca em 'use client'; fetchJson/parseJsonResponse, nunca .json() cru; botao com texto (a11y); nada e escrito direto no banco pela tela (so as rotas existentes). FORA DE ESCOPO: marcar o item do checklist sozinho ao responder o briefing, o seed do primeiro modelo (o Lucas cadastra), a rota de briefings, a pagina publica, o bloco da ficha (fica como esta), mudar a regra 'briefing' da lib do 1043.",
  "cria_novo": [
    "src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx",
    "test/onboarding-motor-briefing-etapa.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx",
    "src/app/dashboard/onboarding/motor/[id]/page.tsx",
    "test/onboarding-motor-briefing-etapa.test.tsx"
  ],
  "testes_conferidos": [
    {
      "teste": "test/onboarding-fecha-na-ativacao.test.ts",
      "motivo": "exige progressoOnboarding(onb.etapas) e ROTULO_SEGUE_NO_CONTRATO na pagina do motor; as duas linhas ficam"
    },
    {
      "teste": "test/onboarding-motor-grupo-whatsapp.test.tsx",
      "motivo": "do 1043: exige etapaPorRegra( e <GrupoWhatsappEtapa na pagina; os dois ficam"
    },
    {
      "teste": "test/a11y/app-dashboard-onboarding-motor-id-page.test.ts",
      "motivo": "varre a pagina por controle so icone sem nome; o ticket nao acrescenta controle so icone"
    },
    {
      "teste": "test/briefing-etapa.test.tsx",
      "motivo": "testa linkPublicoBriefing e a fonte briefing_pendente, que so sao lidas aqui e nao mudam"
    },
    {
      "teste": "test/estados-operacao.test.ts",
      "motivo": "le a pagina de briefings criativos e seus estados vazios; nao muda"
    },
    {
      "teste": "test/rotas-orfas.test.ts",
      "motivo": "o componente novo fica em pasta _components, nao e pagina; /dashboard/briefings-criativos ganha mais um href, nunca perde"
    },
    {
      "teste": "test/fetch-json-teto.test.ts",
      "motivo": "conta .json() em src; o componente novo nao usa .json() literal"
    }
  ],
  "dependencias": [
    "1043"
  ],
  "prioridade": 29,
  "recon_esperado": [
    {
      "descricao": "o componente de briefing da etapa ainda nao existe e a pagina do motor nao fala de briefing",
      "cmd": "a=$(test -e 'src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx' && echo 1 || echo 0); b=$(grep -ci 'briefing' 'src/app/dashboard/onboarding/motor/[id]/page.tsx'); [ \"$a\" = 0 ] && [ \"$b\" = 0 ] && echo SEM_BRIEFING_NO_MOTOR || echo ST_${a}_${b}",
      "espera": "SEM_BRIEFING_NO_MOTOR"
    },
    {
      "descricao": "o construtor existe: rotas de envios e modelos, link publico e menu de Configuracoes",
      "cmd": "a=$(grep -c 'cliente_id' src/app/api/briefings-criativos/route.ts); b=$(test -e src/app/api/briefings-criativos/templates/route.ts && echo 1 || echo 0); c=$(grep -c 'export function linkPublicoBriefing' 'src/app/dashboard/clientes/[id]/tabs/briefing-link.ts'); d=$(grep -c \"href: '/dashboard/briefings-criativos'\" src/lib/nav/papel.ts); [ \"$a\" -ge 3 ] && [ \"$b\" = 1 ] && [ \"$c\" = 1 ] && [ \"$d\" = 1 ] && echo CONSTRUTOR_PRONTO || echo ST_${a}_${b}_${c}_${d}",
      "espera": "CONSTRUTOR_PRONTO"
    },
    {
      "descricao": "o POST de envio devolve o briefing sem token e o GET por cliente traz o token (a tela recarrega depois de gerar)",
      "cmd": "f=src/app/api/briefings-criativos/route.ts; a=$(grep -c 'token, clientes(nome)' \"$f\"); b=$(grep -c 'randomBytes(24)' \"$f\"); [ \"$a\" = 1 ] && [ \"$b\" = 1 ] && echo TOKEN_SO_NO_GET || echo ST_${a}_${b}",
      "espera": "TOKEN_SO_NO_GET"
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
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx' 'src/app/dashboard/onboarding/motor/[id]/page.tsx' 'test/onboarding-motor-briefing-etapa.test.tsx' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 440 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 440 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais e os testes que leem a pagina do motor e o construtor seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts test/ui-guard.test.ts test/onboarding-fecha-na-ativacao.test.ts test/onboarding-motor-grupo-whatsapp.test.tsx test/a11y/app-dashboard-onboarding-motor-id-page.test.ts test/briefing-etapa.test.tsx test/estados-operacao.test.ts test/rotas-orfas.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "a etapa de briefing aponta para o construtor (link publico por token, gerar envio por modelo ativo, sem base sem modelo) e a pagina monta o bloco",
      "cmd": "c='src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx'; p='src/app/dashboard/onboarding/motor/[id]/page.tsx'; a=$(grep -c 'briefings-criativos/templates' \"$c\"); b=$(grep -c 'linkPublicoBriefing' \"$c\"); d=$(grep -c 'sem base: cadastre um modelo de briefing' \"$c\"); e=$(grep -c 'Gerar link do briefing' \"$c\"); g=$(grep -c 'template_id: modeloId' \"$c\"); h=$(grep -c 'href=\"/dashboard/briefings-criativos\"' \"$c\"); j=$(grep -c '\\.json()' \"$c\"); k=$(grep -c '<BriefingEtapa' \"$p\"); m=$(grep -c \"'briefing')\" \"$p\"); t=$(grep -c $'\\u2014' \"$c\"); [ \"$a\" -ge 1 ] && [ \"$b\" -ge 1 ] && [ \"$d\" = 1 ] && [ \"$e\" -ge 1 ] && [ \"$g\" = 1 ] && [ \"$h\" = 1 ] && [ \"$j\" = 0 ] && [ \"$k\" -ge 2 ] && [ \"$m\" -ge 1 ] && [ \"$t\" = 0 ] && echo BRIEFING_NA_ETAPA || echo ST_${a}_${b}_${d}_${e}_${g}_${h}_${j}_${k}_${m}_${t}",
      "espera": "BRIEFING_NA_ETAPA",
      "tipo": "alvo"
    },
    {
      "descricao": "o envio nunca e gerado sozinho: o literal do POST aparece depois do ultimo useEffect do componente",
      "cmd": "c='src/app/dashboard/onboarding/motor/[id]/_components/briefing-etapa.tsx'; u=$(grep -n 'useEffect(' \"$c\" | tail -1 | cut -d: -f1); a=$(grep -n 'template_id: modeloId' \"$c\" | head -1 | cut -d: -f1); [ -n \"$u\" ] && [ -n \"$a\" ] && [ \"$a\" -gt \"$u\" ] && echo SO_NO_CLIQUE || echo ST_${u}_${a}",
      "espera": "SO_NO_CLIQUE",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/onboarding-motor-briefing-etapa.test.tsx)",
      "cmd": "test -f test/onboarding-motor-briefing-etapa.test.tsx && npx vitest run test/onboarding-motor-briefing-etapa.test.tsx >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: a etapa de briefing do onboarding no motor (achada por etapaPorRegra; sem etapa, bloco no topo) mostra o envio existente com o link publico por token do construtor, ou gera um envio a partir de um modelo ativo so no clique, ou mostra sem base com link para cadastrar o modelo em Configuracoes. REPROVE se: gera envio ao carregar; reimplementa o token ou o link em vez de usar a rota e linkPublicoBriefing; mostra o botao sem modelo ativo; .json() cru; texto com nome de tabela ou rota; bloco em onboarding concluido ou cancelado; linhas que os testes leem na pagina mudaram.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Etapa via etapaPorRegra('briefing') e Card de topo quando null, só em em_andamento. Envio POST só no clique; link via rota + linkPublicoBriefing. Sem modelo: sem base, link Configurações, sem botão. Sem .json() cru nem nome de tabela; linhas lidas pelos testes intactas."
}
```
