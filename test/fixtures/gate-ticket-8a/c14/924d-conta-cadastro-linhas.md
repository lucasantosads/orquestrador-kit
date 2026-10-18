# Ticket 924d: aba Conta: Cadastro em 4 linhas ao lado das Conexões

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket D5 da reorganização da aba Conta (Tela 1, bloco 5, metade direita). O Cadastro vira 4 linhas: Contatos, Documentos, Observações do closer e Pagamento do tráfego. Dois controles mudam de lugar: as Observações do closer saem do FinanceiroTab e o Pagamento do tráfego sai do bloco de automações. As rotas continuam as mesmas.

Ponto para o Lucas: o cartão `SetupProgresso` não está na lista da spec para o Cadastro. Ele sai da aba, e o chip de setup do topo da ficha continua mostrando o progresso.

## Recon de 09/10

```
tabs/financeiro-tab.tsx:94-140 Card "Observações do Closer" (PATCH /api/clientes/obs-contrato)
_components/bloco-automacoes.tsx:81-96 select "Forma de pagamento do tráfego" (data-testid forma-pagamento-trafego; PATCH /api/perf/clientes/[id]/forma-pagamento-trafego)
page.tsx:1510-1515 SecaoConta 4 cadastro-grade: ContatosSection + SetupProgresso
test/automacoes-cliente.test.ts:189-195 pina ficha-types key conta...automacoes
```

## Campos de máquina

```json
{
  "id": "924d",
  "slug": "conta-cadastro-linhas",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 560 linhas (~250 em src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx, ~150 em test/cadastro-linhas.test.tsx, ~30 em page.tsx, ~40 em financeiro-tab.tsx, ~25 em bloco-automacoes.tsx, o resto em recalculo). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md (mockup 'Ficha · aba Conta reorganizada' aprovado pelo Lucas em 09/10, cliente de referencia AQUINO ADV). Leia antes PRODUCT.md, DESIGN.md (cor e sinal: verde saudavel, vermelho risco, azul acao; numeros em Geist Mono; sem Card aninhado; sem badge soup) e a skill de UI do Comarka OS se disponivel. Tela 1, bloco 5, metade direita 'Cadastro': 4 linhas, mesma altura das Conexoes; vazio = uma linha com acao, nunca cartao. DEPENDE do 924c. FAZER: (1) NOVO src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx: export function CadastroLinhasView(props) pura e export function CadastroLinhas(props). Quatro linhas na ordem Contatos, Documentos, Observações do closer, Pagamento do tráfego; cada uma: nome, resumo curto e UMA acao. Contatos: 'N contatos' ou BlocoVazioLinha-equivalente em linha ('nenhum contato · Adicionar'); acao 'Gerenciar' abre <ContatosSection> logo abaixo. Documentos: 'N documentos' (e 'N exigidos pendentes' quando o checklist tiver); acao abre <DocumentosSection> + <ChecklistDocumentos>. Observações do closer: primeira linha do texto truncada ou 'sem observações'; acao 'Editar' abre o mesmo editor que hoje vive no financeiro-tab (mova o editor para ca sem mudar o PATCH /api/clientes/obs-contrato). Pagamento do tráfego: valor atual (Pix, Cartão do cliente, Cartão da agência, Boleto) ou 'não registrada'; acao 'Alterar' abre o select que hoje vive no bloco-automacoes (mova; mesmo PATCH /api/perf/clientes/{id}/forma-pagamento-trafego). Fonte com erro => 's/ dado' com motivo. Sem Card no componente. (2) src/app/dashboard/clientes/[id]/page.tsx: a coluna direita do grid conexoes-cadastro passa a ser <CadastroLinhas> (AnchorBlock contatos e documentos envolvem as linhas correspondentes, para ?sub= seguir funcionando); o AnchorBlock financeiro deixa de montar <FinanceiroTab> na secao 1 (o financeiro-tab fica so como embrulho vazio ou sai do ramo; a chave ?sub=financeiro passa a rolar para o cartao Contrato). <SetupProgresso> sai da Conta (o chip de setup do topo da ficha ja mostra o progresso; registre na prosa do commit). (3) src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx: o editor de Observacoes do Closer sai daqui (mudou para a linha do Cadastro). (4) src/app/dashboard/clientes/[id]/_components/bloco-automacoes.tsx: o select de forma de pagamento do trafego sai daqui (mudou para a linha do Cadastro); o resto do bloco nao muda (924e). (5) NOVO test/cadastro-linhas.test.tsx: 4 linhas na ordem; uma acao por linha; vazio em linha; erro mostra 's/ dado'; nenhum Card. (6) RECALCULE com comentario 'Ticket 924d (spec 09/10): ...': conta-aceite (116-121 Observacoes do closer agora em cadastro-linhas.tsx; 127/134 documentos agora na linha do Cadastro; 286-294 secao 4 / SetupProgresso); conta-cadastro-operacao (18-30); ficha-conta-contrato (Observacoes do Closer com um unico Editar, agora no cadastro-linhas.tsx); automacoes-cliente (forma de pagamento do trafego agora no cadastro-linhas.tsx, mesmo PATCH). PROIBIDO remover assercao ou afrouxar. Regras do repo: nao importe getSession em 'use client'; sem .json() novo em src (fetchJson de @/lib/fetch-json); sem travessao (U+2014) em texto; nenhum nome de tabela, coluna ou operador em texto que o usuario le; label em todo controle (WCAG AA). FORA DE ESCOPO: mudar ContatosSection, DocumentosSection, ChecklistDocumentos por dentro; rotas; Automacoes em 3 colunas (924e); apagar SetupProgresso do repo.",
  "cria_novo": [
    "src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx",
    "test/cadastro-linhas.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx",
    "test/cadastro-linhas.test.tsx",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx",
    "src/app/dashboard/clientes/[id]/_components/bloco-automacoes.tsx",
    "test/conta-aceite.test.tsx",
    "test/conta-cadastro-operacao.test.ts",
    "test/ficha-conta-contrato.test.ts",
    "test/automacoes-cliente.test.ts"
  ],
  "dependencias": [
    "924c"
  ],
  "prioridade": 60,
  "excecao_tamanho": {
    "motivo": "mover Observacoes do closer (financeiro-tab) e Pagamento do trafego (bloco-automacoes) para as linhas do Cadastro e um movimento so: separar deixaria o controle em dois lugares ou em nenhum entre tickets; os 4 testes pinam exatamente esses dois controles"
  },
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/cadastro-linhas.test.tsx ainda nao existe",
      "cmd": "test -e 'test/cadastro-linhas.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "Observacoes do Closer no financeiro-tab e forma de pagamento no bloco-automacoes",
      "cmd": "o=$(grep -c 'Observações do Closer' 'src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx'); p=$(grep -c 'forma-pagamento-trafego' 'src/app/dashboard/clientes/[id]/_components/bloco-automacoes.tsx'); [ \"$o\" -ge 1 ] && [ \"$p\" -ge 1 ] && echo NOS_LUGARES_ANTIGOS || echo ST_${o}_${p}",
      "espera": "NOS_LUGARES_ANTIGOS"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx' 'test/cadastro-linhas.test.tsx' 'src/app/dashboard/clientes/[id]/page.tsx' 'src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx' 'src/app/dashboard/clientes/[id]/_components/bloco-automacoes.tsx' 'test/conta-aceite.test.tsx' 'test/conta-cadastro-operacao.test.ts' 'test/ficha-conta-contrato.test.ts' 'test/automacoes-cliente.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
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
      "descricao": "Cadastro em linhas no grid e os dois controles moveram",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx' && l=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -c '<CadastroLinhas') && o=$(grep -c 'Observações do Closer' 'src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx') && p=$(grep -c 'forma-pagamento-trafego' 'src/app/dashboard/clientes/[id]/_components/bloco-automacoes.tsx') && w=$(grep -c 'forma-pagamento-trafego' 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx') && [ \"$l\" = 1 ] && [ \"$o\" = 0 ] && [ \"$p\" = 0 ] && [ \"$w\" -ge 1 ] && echo CADASTRO_OK || echo ST",
      "espera": "CADASTRO_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "densidade: nenhum Card no componente de linhas",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx' && n=$(grep -c '<Card[ >]' 'src/app/dashboard/clientes/[id]/_components/cadastro-linhas.tsx'); [ \"$n\" = 0 ] && echo SEM_CARD || echo ST_$n",
      "espera": "SEM_CARD"
    },
    {
      "descricao": "anti-afrouxamento nos testes recalculados (test/conta-aceite.test.tsx, test/conta-cadastro-operacao.test.ts, test/ficha-conta-contrato.test.ts, test/automacoes-cliente.test.ts): expect( nao diminui, sem .skip/.only, cita 924d",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=AFROUXAMENTO_OK; for f in 'test/conta-aceite.test.tsx' 'test/conta-cadastro-operacao.test.ts' 'test/ficha-conta-contrato.test.ts' 'test/automacoes-cliente.test.ts'; do if git diff --quiet \"$b\" HEAD -- \"$f\"; then continue; fi; a=$(git show \"$b:$f\" | grep -c 'expect('); h=$(grep -c 'expect(' \"$f\"); s=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^[+].*[.](skip|only)[(]'); c=$(grep -c '924d' \"$f\"); if [ \"$h\" -lt \"$a\" ] || [ \"$s\" != 0 ] || [ \"$c\" = 0 ]; then r=AFROUXOU_$f; fi; done; echo $r",
      "espera": "AFROUXAMENTO_OK",
      "tipo": "guarda"
    },
    {
      "descricao": "testes verdes (test/cadastro-linhas.test.tsx, test/conta-aceite.test.tsx, test/conta-cadastro-operacao.test.ts, test/ficha-conta-contrato.test.ts, test/automacoes-cliente.test.ts, test/setup-progresso-ficha.test.ts, test/checklist-documentos.test.ts, test/ficha-subsecoes-sequencia.test.ts)",
      "cmd": "test -f test/cadastro-linhas.test.tsx && npx vitest run test/cadastro-linhas.test.tsx test/conta-aceite.test.tsx test/conta-cadastro-operacao.test.ts test/ficha-conta-contrato.test.ts test/automacoes-cliente.test.ts test/setup-progresso-ficha.test.ts test/checklist-documentos.test.ts test/ficha-subsecoes-sequencia.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: Cadastro em 4 linhas (Contatos, Documentos, Observacoes do closer, Pagamento do trafego) ao lado das Conexoes, mesma altura, uma acao por linha, editores antigos movidos sem mudar as rotas. REPROVE se: vazio em Card; controle duplicado em dois lugares; erro de fonte vira 'nenhum'; ?sub=contatos ou ?sub=documentos param de achar a linha; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/setup-progresso-ficha.test.ts",
      "motivo": "testa o SetupProgresso por dentro; o componente fica no repo; se o teste ler o page, PARE e descreva"
    },
    {
      "teste": "test/checklist-documentos.test.ts",
      "motivo": "testa o ChecklistDocumentos por dentro; nao muda"
    },
    {
      "teste": "test/ficha-subsecoes-sequencia.test.ts",
      "motivo": "todo filho renderiza por ?sub=; financeiro, contatos e documentos seguem com AnchorBlock"
    },
    {
      "teste": "test/conta-contrato-e-entregas.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-entregas-vazio-unico.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/tabs/financeiro-tab.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
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
      "teste": "test/campanhas-aceite-mockup.test.tsx",
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
      "teste": "test/conta-conexoes-entregaveis.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-conexoes.test.ts",
      "motivo": "alcanca src/app/dashboard/clientes/[id]/page.tsx pelo grafo ou pelo caminho; a reorganizacao da aba Conta so troca blocos dentro do ramo grupoAtivo === \"conta\" (marcador do ramo fica) e nao muda as outras abas; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-crm-sem-contradicao.test.ts",
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
      "teste": "test/relacao-config-para-conta.test.ts",
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
      "teste": "test/whatsapp-grupos-ui.test.ts",
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
