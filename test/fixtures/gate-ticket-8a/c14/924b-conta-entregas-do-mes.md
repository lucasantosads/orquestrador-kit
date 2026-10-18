# Ticket 924b: aba Conta: Entregas do mês (tabela com prévia de relatório e rodapé de uma linha)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket D3 da reorganização da aba Conta (Tela 1, bloco 4). Uma tabela de largura total substitui a sequência BlocoContrato + EntregaveisTab + ContratualTab. Na linha do relatório semanal/mensal aparece "Prévia de DD/MM pronta, não enviada", com o botão Revisar e enviar. Cota ausente aparece como "s/ cota". O rodapé é de uma linha e abre os detalhes que já existem.

Ponto aberto para o Lucas: a spec não cita o contador de consultorias (`BlocoConsultorias`). Ele fica onde está até decisão.

## Recon de 09/10

```
ops_entregaveis (recorrentes): relatorio-semanal cota 4 | relatorio-mensal cota 1 | edicao-video 5 | imagens 5 | roteirizacao null | ...
ops_automacoes: relatorio_semanal | relatorio_mensal | alerta_saldo
src/lib/relatorio-semanal/dados.ts:14 status "rascunho"|"revisado"|"enviado"; GET /api/clientes/[id]/relatorio-semanal
src/lib/automacoes/estado.ts:116 mensal pendente = ops_automacao_execucoes.resultado 'aguardando_envio'; GET /api/clientes/[id]/automacoes
bloco-contrato.tsx:217-307 EsteMesView (usado/cota, "sem cota definida", +1 por POST .../contrato/consumo)
nenhum "Entregas do mês", "Feito/cota" nem "s/ cota" em src hoje
```

## Campos de máquina

```json
{
  "id": "924b",
  "slug": "conta-entregas-do-mes",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 600 linhas (~300 em src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx, ~170 em test/entregas-do-mes.test.tsx, ~30 em page.tsx, o resto em recalculo). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md (mockup 'Ficha · aba Conta reorganizada' aprovado pelo Lucas em 09/10, cliente de referencia AQUINO ADV). Leia antes PRODUCT.md, DESIGN.md (cor e sinal: verde saudavel, vermelho risco, azul acao; numeros em Geist Mono; sem Card aninhado; sem badge soup) e a skill de UI do Comarka OS se disponivel. Tela 1, bloco 4 'Entregas do mês' (largura total). DEPENDE do 924a. FONTES (todas ja existem, so leitura nova nenhuma): GET /api/clientes/[id]/contrato?mes= (DadosContrato de src/lib/contrato/contrato-dados.ts: este_mes com usado e cota por entregavel recorrente, implementacoes, pendencias, pode_editar); GET /api/clientes/[id]/relatorio-semanal (relatorios[] com status rascunho|revisado|enviado; o mais recente com status diferente de enviado e a previa pronta); GET /api/clientes/[id]/automacoes (relatorio_mensal.ultimo.resultado === 'aguardando_envio' e a previa mensal pronta); GET /api/clientes/[id]/contratual/disputa?ate= (data 'entregue e comunicado ate'). O lancamento e o POST /api/clientes/[id]/contrato/consumo que o EsteMesView ja usa. A ligacao entregavel -> previa e UM mapa de integracao: slug do entregavel 'relatorio-semanal' -> relatorio semanal; 'relatorio-mensal' -> relatorio mensal (slugs conferidos no banco em 09/10). FAZER: (1) NOVO src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx: export function EntregasDoMesView(props) pura e export function EntregasDoMes({clienteId, clienteNotionId}) que busca. Tabela de largura total com as colunas exatas Entregável | Feito/cota | Situação | Lançar, uma linha por recorrente do escopo do mes. Feito/cota em mono: 'usado/cota'; cota ausente => 'usado / s/ cota' (NUNCA 0 como cota). Situacao: texto curto ('em dia', 'faltam N', 'acima da cota'), e nas linhas de relatorio com previa pronta: 'Prévia de DD/MM pronta, não enviada' + botao 'Revisar e enviar' para /dashboard/clientes/{clienteNotionId}/relatorio. Lancar: '+1' (desabilitado sem pode_editar). Fonte da previa indisponivel => a linha fica sem a previa e com SemDado compacto na situacao, sem afirmar que nao ha previa. RODAPE de UMA linha: 'Implementações · X de Y entregues' · 'Pendências do cliente · N abertas' · 'Entregue e comunicado até DD/MM' (data ausente => 's/ registro'); cada item abre logo abaixo, recolhido por padrao, o que ja existe: implementacoes e pendencias = o <BlocoContrato> atual (sem os marcos, ja tirados no 924a), 'entregue e comunicado' = <ContratualTab />. Escopo sem recorrente => BlocoVazioLinha ('Entregas do mês', 'nenhum recorrente no escopo deste cliente'), nunca Card. (2) src/app/dashboard/clientes/[id]/page.tsx: no ramo conta, troque <BlocoContrato>, o AnchorBlock entregaveis com <EntregaveisTab /> e o AnchorBlock contratual com <ContratualTab /> por <AnchorBlock id=\"entregaveis\" ...><EntregasDoMes .../></AnchorBlock> logo depois do <ContratoMarcos>; o AnchorBlock id=\"contratual\" passa a envolver o item 'Entregue e comunicado' do rodape (as chaves ?sub=entregaveis e ?sub=contratual continuam abrindo o lugar certo). <BlocoConsultorias> fica onde esta. (3) NOVO test/entregas-do-mes.test.tsx: colunas na ordem; cota null mostra 's/ cota' e nao '/0'; previa semanal e mensal na linha certa pelo slug com 'Revisar e enviar'; fonte de previa com erro nao afirma 'sem previa'; rodape de uma linha com as 3 partes; vazio em linha sem Card. (4) RECALCULE com comentario 'Ticket 924b (spec 09/10): ...': conta-aceite:147-150 (ContratualTab/EntregaveisTab na secao 1 passam a ser EntregasDoMes, e ContratualTab dentro do rodape); conta-conexoes-entregaveis:55-66 (secao 1 tem <EntregasDoMes> no AnchorBlock entregaveis); campanhas-aceite-mockup:547 (<EntregasDoMes na Conta); conta-contrato-e-entregas (ordem contrato -> entregas). PROIBIDO remover assercao ou afrouxar. Regras do repo: nao importe getSession em 'use client'; sem .json() novo em src (fetchJson de @/lib/fetch-json); sem travessao (U+2014) em texto; nenhum nome de tabela, coluna ou operador em texto que o usuario le; label em todo controle (WCAG AA). FORA DE ESCOPO: apagar EntregaveisTab, ContratualTab ou BlocoContrato; mexer nas rotas; enviar relatorio daqui (o botao leva a tela de relatorio); BlocoConsultorias; Conexoes/Cadastro.",
  "cria_novo": [
    "src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx",
    "test/entregas-do-mes.test.tsx"
  ],
  "pathspec_allowlist": [
    "src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx",
    "test/entregas-do-mes.test.tsx",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "test/conta-aceite.test.tsx",
    "test/conta-conexoes-entregaveis.test.ts",
    "test/campanhas-aceite-mockup.test.tsx",
    "test/conta-contrato-e-entregas.test.ts"
  ],
  "dependencias": [
    "924a"
  ],
  "prioridade": 60,
  "recon_esperado": [
    {
      "descricao": "src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/entregas-do-mes.test.tsx ainda nao existe",
      "cmd": "test -e 'test/entregas-do-mes.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "Conta monta hoje EntregaveisTab, ContratualTab e BlocoContrato",
      "cmd": "n=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -cE '<EntregaveisTab|<ContratualTab|<BlocoContrato '); [ \"$n\" = 3 ] && echo TRES_BLOCOS || echo ST_$n",
      "espera": "TRES_BLOCOS"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx' 'test/entregas-do-mes.test.tsx' 'src/app/dashboard/clientes/[id]/page.tsx' 'test/conta-aceite.test.tsx' 'test/conta-conexoes-entregaveis.test.ts' 'test/campanhas-aceite-mockup.test.tsx' 'test/conta-contrato-e-entregas.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 600 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 600 ] && echo NO_TETO || echo ESTOUROU_$t",
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
      "descricao": "Entregas do mes montado no ramo conta logo depois do Contrato, com as 4 colunas",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx' && c=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -n '<ContratoMarcos' | head -1 | cut -d: -f1); e=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -n '<EntregasDoMes' | head -1 | cut -d: -f1); k=$(grep -cE 'Feito/cota|Lançar' 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx'); [ -n \"$c\" ] && [ -n \"$e\" ] && [ \"$e\" -gt \"$c\" ] && [ \"$k\" -ge 2 ] && echo ENTREGAS_OK || echo ST_${c}_${e}",
      "espera": "ENTREGAS_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "densidade: nenhum Card no componente e vazio por BlocoVazioLinha",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx' && c=$(grep -c '<Card[ >]' 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx') && v=$(grep -c 'BlocoVazioLinha' 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx') && [ \"$c\" = 0 ] && [ \"$v\" -ge 1 ] && echo SEM_CARD || echo ST",
      "espera": "SEM_CARD"
    },
    {
      "descricao": "cota ausente vira 's/ cota'",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx' && n=$(grep -c 's/ cota' 'src/app/dashboard/clientes/[id]/_components/entregas-do-mes.tsx'); [ \"$n\" -ge 1 ] && echo SEM_COTA_HONESTA || echo ST_$n",
      "espera": "SEM_COTA_HONESTA"
    },
    {
      "descricao": "anti-afrouxamento nos testes recalculados (test/conta-aceite.test.tsx, test/conta-conexoes-entregaveis.test.ts, test/campanhas-aceite-mockup.test.tsx, test/conta-contrato-e-entregas.test.ts): expect( nao diminui, sem .skip/.only, cita 924b",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=AFROUXAMENTO_OK; for f in 'test/conta-aceite.test.tsx' 'test/conta-conexoes-entregaveis.test.ts' 'test/campanhas-aceite-mockup.test.tsx' 'test/conta-contrato-e-entregas.test.ts'; do if git diff --quiet \"$b\" HEAD -- \"$f\"; then continue; fi; a=$(git show \"$b:$f\" | grep -c 'expect('); h=$(grep -c 'expect(' \"$f\"); s=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^[+].*[.](skip|only)[(]'); c=$(grep -c '924b' \"$f\"); if [ \"$h\" -lt \"$a\" ] || [ \"$s\" != 0 ] || [ \"$c\" = 0 ]; then r=AFROUXOU_$f; fi; done; echo $r",
      "espera": "AFROUXAMENTO_OK",
      "tipo": "guarda"
    },
    {
      "descricao": "testes verdes (test/entregas-do-mes.test.tsx, test/conta-aceite.test.tsx, test/conta-conexoes-entregaveis.test.ts, test/campanhas-aceite-mockup.test.tsx, test/conta-contrato-e-entregas.test.ts, test/ficha-abas-orfas.test.ts, test/conta-entregas-vazio-unico.test.ts, test/ficha-subsecoes-sequencia.test.ts)",
      "cmd": "test -f test/entregas-do-mes.test.tsx && npx vitest run test/entregas-do-mes.test.tsx test/conta-aceite.test.tsx test/conta-conexoes-entregaveis.test.ts test/campanhas-aceite-mockup.test.tsx test/conta-contrato-e-entregas.test.ts test/ficha-abas-orfas.test.ts test/conta-entregas-vazio-unico.test.ts test/ficha-subsecoes-sequencia.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: bloco Entregas do mes de largura total com Entregavel | Feito/cota | Situacao | Lancar, previa pronta e nao enviada na linha do relatorio com Revisar e enviar, rodape de uma linha (implementacoes, pendencias, entregue e comunicado ate) abrindo o que ja existe. REPROVE se: cota ausente mostrada como 0; previa afirmada sem fonte; vazio em Card; ?sub=entregaveis ou ?sub=contratual deixam de achar o bloco; assercao removida ou afrouxada; teste que passaria contra HEAD.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/ficha-abas-orfas.test.ts",
      "motivo": "49-51 importa e monta <ContratualTab />; segue montado dentro do rodape; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/conta-entregas-vazio-unico.test.ts",
      "motivo": "fixa o texto do vazio do contratual (636); o ContratualTab nao muda por dentro"
    },
    {
      "teste": "test/ficha-subsecoes-sequencia.test.ts",
      "motivo": "todo filho renderiza por ?sub=; entregaveis e contratual seguem com AnchorBlock"
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
