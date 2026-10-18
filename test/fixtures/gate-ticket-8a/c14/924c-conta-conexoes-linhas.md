# Ticket 924c: aba Conta: Conexões em 4 linhas (Meta, CRM, WhatsApp, NPS) com Gerenciar

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket D4 da reorganização da aba Conta (Tela 1, bloco 5, metade esquerda). As 4 conexões viram linhas, cada uma com status e uma ação. "Buscar conta" e "Vincular outra conta" passam a ficar só dentro de Gerenciar, na linha da Meta. Este ticket também cria o grid de duas colunas Conexões | Cadastro; o Cadastro vira linhas no 924d.

## Recon de 09/10

```
page.tsx:1483-1500 grid conexoes-grade: AnchorBlock meta-ads (MetaSyncSection, ClientMetaAdsTab, ConexaoGoogleAds, <a>Vincular outra conta</a>), AnchorBlock crm (ConexaoCrm), ConexoesRelacao
client-meta-ads-tab.tsx:345 Card "Buscar conta"; nenhum "Gerenciar" nas conexoes hoje
GET /api/perf/dashboard/cliente/[cliente_id] -> coleta (saudeColeta) ; 404 sem conta ativa
GET /api/clientes/[id]/crm/status -> estado
test/conta-aceite.test.tsx:236-238 secao 3 contem ">Vincular outra conta</a>"; test/conta-conexoes.test.ts:84-117 grid e ordem
observado no recon: /api/clientes/crm-config le por notion_id e /api/clientes/[id]/crm-config por uuid (possivel divergencia; fora deste ticket)
```

## Campos de máquina

```json
{
  "id": "924c",
  "slug": "conta-conexoes-linhas",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 560 linhas (~260 em src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx, ~160 em test/conexoes-linhas.test.tsx, ~40 em page.tsx, o resto em recalculo). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md (mockup 'Ficha · aba Conta reorganizada' aprovado pelo Lucas em 09/10, cliente de referencia AQUINO ADV). Leia antes PRODUCT.md, DESIGN.md (cor e sinal: verde saudavel, vermelho risco, azul acao; numeros em Geist Mono; sem Card aninhado; sem badge soup) e a skill de UI do Comarka OS se disponivel. Tela 1, bloco 5, metade esquerda 'Conexões': 4 linhas, status + UMA acao cada; vazio = uma linha com acao, nunca cartao. DEPENDE do 924b. FONTES (as mesmas que os cartoes de hoje ja leem; nenhuma rota nova): Meta Ads = GET /api/perf/dashboard/cliente/{perfClienteId} (coleta: SaudeColeta estado ok|atencao|falha + motivo, de src/lib/perf/saude-coleta.ts; 404 'Nenhuma conta ativa' => 'nenhuma conta vinculada'); CRM GHL = GET /api/clientes/{id}/crm/status (estado agencia_desconectada|desconectado|sincronizando|conectado|erro); Grupo WhatsApp e Link de NPS = o que ConexoesRelacao (_components/conexoes-relacao.tsx) ja le. FAZER: (1) NOVO src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx: export function ConexoesLinhasView(props) pura e export function ConexoesLinhas(props) que busca. Quatro linhas na ordem Meta Ads, CRM GHL, Grupo WhatsApp, Link de NPS; cada uma: nome, status em texto curto com cor de sinal (verde ok, amarelo atencao, vermelho falha, neutro sem dado) e UMA acao. A acao 'Gerenciar' abre, logo abaixo da linha e recolhido por padrao, o cartao que existe hoje: Meta = <MetaSyncSection>, <ClientMetaAdsTab> (onde fica 'Buscar conta'), <ConexaoGoogleAds /> e o link 'Vincular outra conta' (/dashboard/clientes/{id}/setup?passo=contas): 'Buscar conta' e 'Vincular outra conta' passam a viver SO dentro de Gerenciar da linha da Meta; CRM = <ConexaoCrm />; WhatsApp e NPS = as partes de <ConexoesRelacao>. Fonte com erro => status 's/ dado' com o motivo, nunca 'desconectado'. Sem Card no componente (os cartoes antigos so aparecem dentro do Gerenciar aberto). (2) src/app/dashboard/clientes/[id]/page.tsx: na <SecaoConta ordem={3}>, troque o conteudo do grid data-testid=\"conexoes-grade\" por um grid de 2 colunas data-testid=\"conexoes-cadastro\" (md:grid-cols-2, items-stretch, mesma altura) cuja coluna esquerda e <ConexoesLinhas> (a direita fica com o Cadastro atual ate o 924d: <ContatosSection> e <SetupProgresso> saem da SecaoConta 4 para a coluna direita). Os AnchorBlock meta-ads e crm passam a envolver as linhas correspondentes (as chaves ?sub=meta-ads e ?sub=crm abrem a linha com o Gerenciar aberto). O AnchorBlock automacoes fica depois do grid, intocado. (3) NOVO test/conexoes-linhas.test.tsx: 4 linhas na ordem; cada uma com uma acao so; Buscar conta e Vincular outra conta nao aparecem com o Gerenciar fechado; fonte com erro mostra 's/ dado' e nao 'Desconectado'; sem Card. (4) RECALCULE com comentario 'Ticket 924c (spec 09/10): ...': conta-aceite:223-277 (secao 3 agora tem ConexoesLinhas; 'Vincular outra conta' passa a ser conferido dentro de conexoes-linhas.tsx e nao no page); conta-conexoes:84-117 (grid de 2 colunas com ConexoesLinhas; a ordem Meta < CRM < WhatsApp < NPS passa a ser conferida no componente; AnchorBlock config -> ConfigTab segue); conta-conexoes-entregaveis:55-66 (MetaSync e ClientMetaAdsTab agora dentro de conexoes-linhas.tsx); campanhas-aceite-mockup:537-540 idem. PROIBIDO remover assercao ou afrouxar. Regras do repo: nao importe getSession em 'use client'; sem .json() novo em src (fetchJson de @/lib/fetch-json); sem travessao (U+2014) em texto; nenhum nome de tabela, coluna ou operador em texto que o usuario le; label em todo controle (WCAG AA). FORA DE ESCOPO: mudar MetaSyncSection, ClientMetaAdsTab, ConexaoCrm, ConexoesRelacao por dentro; Cadastro em linhas (924d); rotas; a divergencia de chave de clientes_crm_config (notion_id x uuid) apontada no recon (registre em IMPEDIMENTO: se bloquear).",
  "cria_novo": [
    "src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx",
    "test/conexoes-linhas.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx",
    "test/conexoes-linhas.test.tsx",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "test/conta-aceite.test.tsx",
    "test/conta-conexoes.test.ts",
    "test/conta-conexoes-entregaveis.test.ts",
    "test/campanhas-aceite-mockup.test.tsx"
  ],
  "dependencias": [
    "924b"
  ],
  "prioridade": 60,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/conexoes-linhas.test.tsx ainda nao existe",
      "cmd": "test -e 'test/conexoes-linhas.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "grade de conexoes de hoje",
      "cmd": "n=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -cE 'data-testid=\"conexoes-grade\"'); [ \"$n\" = 1 ] && echo GRADE_ANTIGA || echo ST_$n",
      "espera": "GRADE_ANTIGA"
    },
    {
      "descricao": "Vincular outra conta e um link solto no page",
      "cmd": "n=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -cE '>Vincular outra conta</a>'); [ \"$n\" = 1 ] && echo VINCULAR_SOLTO || echo ST_$n",
      "espera": "VINCULAR_SOLTO"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx' 'test/conexoes-linhas.test.tsx' 'src/app/dashboard/clientes/[id]/page.tsx' 'test/conta-aceite.test.tsx' 'test/conta-conexoes.test.ts' 'test/conta-conexoes-entregaveis.test.ts' 'test/campanhas-aceite-mockup.test.tsx' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 560 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 560 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "Conexoes em linhas no grid conexoes-cadastro e Vincular outra conta saiu do page",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx' && g=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -c 'data-testid=\"conexoes-cadastro\"') && l=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -c '<ConexoesLinhas') && v=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -c 'Vincular outra conta</a>') && w=$(grep -c 'Vincular outra conta' 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx') && [ \"$g\" = 1 ] && [ \"$l\" = 1 ] && [ \"$v\" = 0 ] && [ \"$w\" -ge 1 ] && echo CONEXOES_OK || echo ST",
      "espera": "CONEXOES_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "densidade: nenhum Card no componente de linhas",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx' && n=$(grep -c '<Card[ >]' 'src/app/dashboard/clientes/[id]/_components/conexoes-linhas.tsx'); [ \"$n\" = 0 ] && echo SEM_CARD || echo ST_$n",
      "espera": "SEM_CARD"
    },
    {
      "descricao": "anti-afrouxamento nos testes recalculados (test/conta-aceite.test.tsx, test/conta-conexoes.test.ts, test/conta-conexoes-entregaveis.test.ts, test/campanhas-aceite-mockup.test.tsx): expect( nao diminui, sem .skip/.only, cita 924c",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=AFROUXAMENTO_OK; for f in 'test/conta-aceite.test.tsx' 'test/conta-conexoes.test.ts' 'test/conta-conexoes-entregaveis.test.ts' 'test/campanhas-aceite-mockup.test.tsx'; do if git diff --quiet \"$b\" HEAD -- \"$f\"; then continue; fi; a=$(git show \"$b:$f\" | grep -c 'expect('); h=$(grep -c 'expect(' \"$f\"); s=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^[+].*[.](skip|only)[(]'); c=$(grep -c '924c' \"$f\"); if [ \"$h\" -lt \"$a\" ] || [ \"$s\" != 0 ] || [ \"$c\" = 0 ]; then r=AFROUXOU_$f; fi; done; echo $r",
      "espera": "AFROUXAMENTO_OK",
      "tipo": "guarda"
    },
    {
      "descricao": "testes verdes (test/conexoes-linhas.test.tsx, test/conta-aceite.test.tsx, test/conta-conexoes.test.ts, test/conta-conexoes-entregaveis.test.ts, test/campanhas-aceite-mockup.test.tsx, test/conta-crm-sem-contradicao.test.ts, test/relacao-config-para-conta.test.ts, test/whatsapp-grupos-ui.test.ts, test/vincular-contas-meta-ficha.test.ts)",
      "cmd": "test -f test/conexoes-linhas.test.tsx && npx vitest run test/conexoes-linhas.test.tsx test/conta-aceite.test.tsx test/conta-conexoes.test.ts test/conta-conexoes-entregaveis.test.ts test/campanhas-aceite-mockup.test.tsx test/conta-crm-sem-contradicao.test.ts test/relacao-config-para-conta.test.ts test/whatsapp-grupos-ui.test.ts test/vincular-contas-meta-ficha.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: Conexoes em 4 linhas (Meta Ads, CRM GHL, Grupo WhatsApp, Link de NPS) com status de sinal e uma acao; Buscar conta e Vincular outra conta so dentro de Gerenciar da Meta; cartoes antigos so dentro do Gerenciar. REPROVE se: fonte com erro vira 'desconectado' ou 'ok'; mais de uma acao por linha; vazio em Card; Card na linha; ?sub=meta-ads ou ?sub=crm deixam de abrir a linha; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/conta-crm-sem-contradicao.test.ts",
      "motivo": "54: o bloco crm monta <ConexaoCrm /> e a chave config fica; ConexaoCrm segue montado dentro do Gerenciar; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-config-para-conta.test.ts",
      "motivo": "27-36: ramo conta contem ContatosSection, ConexaoCrm, ConexoesRelacao; seguem no ramo (Gerenciar e coluna direita)"
    },
    {
      "teste": "test/whatsapp-grupos-ui.test.ts",
      "motivo": "32: <ConexoesRelacao clientePipelineId={clientePipelineId} />; segue montado"
    },
    {
      "teste": "test/vincular-contas-meta-ficha.test.ts",
      "motivo": "testa ClientMetaAdsTab por dentro; nao muda"
    },
    {
      "teste": "test/a11y/app-dashboard-clientes-id-page.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aba-na-url.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aba-resultados-fechamentos.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/abas-montadas.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/acao-unica-ficha-mutacoes.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ativo-pela-receita.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/barra-visao.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/bloco-tarefas-visao.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cartao-copy-sem-travessao.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/cartao-topo-setup-e-closer.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-cadastro-operacao.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-quadro-contrato-aberto.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-resultados-escritorio.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/erro-objeto-nao-quebra.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-aba-comercial.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-abas-orfas.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-nav-colapsavel.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-nps.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-obs-contrato.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-por-uuid.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-relacao-estados.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-relacao-leitura.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-rotulo-moldura.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-sem-reescrita-notion.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ficha-subsecoes-sequencia.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ghl-um-lugar-so.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/header-cliente-consolidado.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/kpis-visao-buraco-coleta.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/leitura-relacao-tela.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/link-setup-notion-id.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/lote-b3-1-periodo.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/lote-d-colunas.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ltv-na-conta.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/metricas-filtros-periodo.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/metricas-invalidacao.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/observacoes-notas-fora.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/orquestrador-enforcement.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/otimizacoes-tela.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/painel-em-campanhas.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/painel-estado-explicito.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/perf-cliente-438.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/rbac-visual.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/registrar-verificacao-rotulo.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/registro-unico-relacao.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-aceite.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-responder-tela.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-sem-escrita-reuniao.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resumo-grupo-wpp-tela.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/resumo-score-fonte-unica.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/rotas-fantasma-ficha.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/saude-chip-ficha.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/saude-motivo-sem-base.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/score-saude-fonte-unica.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/timeline-relacao.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-aceite-estrutura.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-aceite-mockup.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-copy-ausencia.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-dado-parado-e-link.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-geral-ordem.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-limpeza-final.test.tsx",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-sem-cockpit-antigo.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/crm-escritorio-rolagem.test.ts",
      "motivo": "le o page.tsx e o crm-escritorio.tsx da aba Comercial (overflow so no kanban); o ticket nao mexe no crm-escritorio; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
