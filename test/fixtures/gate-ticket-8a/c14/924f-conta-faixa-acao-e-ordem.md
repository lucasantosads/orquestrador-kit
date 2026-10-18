# Ticket 924f: aba Conta: faixa 'pontos pedem ação', ordem final dos blocos e Histórico recolhido

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket D7, que fecha a reorganização da aba Conta (Tela 1, blocos 2 e 1 a 7). Entram:

- a faixa "N pontos pedem ação", que só aparece com N > 0, com itens de acesso BM vencido, prévia de relatório não enviada, pipeline do CRM não escolhido e contrato sem datas; o item de marco vencido entra no 926;
- os títulos novos das seções;
- o Histórico recolhido por padrão.

A ordem final vira critério de `grep -n`: cada bloco tem de vir antes do seguinte no ramo da Conta.

## Recon de 09/10

```
nenhuma faixa "pedem ação" em src; carteira-pendencias.ts (lista de clientes) e o padrao mais proximo, sem uso na ficha
src/app/dashboard/clientes/config/integracoes/meta-conexoes-estado.ts:8-10 vencimento por token_expires_at (agencia_bm fica active depois de vencer)
src/lib/perf/saude-coleta.ts saudeColeta -> {estado ok|atencao|falha, motivo} ("Acesso da conexão da coleta vencido" ...)
pipeline: /api/clientes/crm-config?cliente_id= (notion_id) devolve ghl_pipeline_id; crm/status nao devolve o pipeline escolhido
secao-conta.tsx: SECOES_CONTA = ["Contrato e entregas","Resultados do escritório","Conexões","Cadastro","Operação"]; recolhida padrao so na 5; page passa recolhida={false}
```

## Campos de máquina

```json
{
  "id": "924f",
  "slug": "conta-faixa-acao-e-ordem",
  "lane": "produto",
  "perfil": "frontend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 600 linhas (~110 em src/lib/clientes/pontos-acao.ts, ~140 em src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx, ~15 em secao-conta.tsx, ~40 em page.tsx, ~150 em test/faixa-pedem-acao.test.tsx, ~60 em test/conta-ordem-final.test.ts, o resto em recalculo). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md (mockup 'Ficha · aba Conta reorganizada' aprovado pelo Lucas em 09/10, cliente de referencia AQUINO ADV). Leia antes PRODUCT.md, DESIGN.md (cor e sinal: verde saudavel, vermelho risco, azul acao; numeros em Geist Mono; sem Card aninhado; sem badge soup) e a skill de UI do Comarka OS se disponivel. Tela 1, bloco 2 (faixa 'N pontos pedem ação', so com N > 0) e ordem final dos blocos 1 a 7. DEPENDE do 924e. FONTES dos itens (todas ja existem; nenhuma rota nova): acesso BM vencido = coleta de GET /api/perf/dashboard/cliente/{perfClienteId} (saudeColeta estado 'falha' com motivo de acesso vencido, src/lib/perf/saude-coleta.ts; vencimento por token_expires_at, NAO por status); relatorio com previa pronta e nao enviada = as mesmas fontes do 924b (relatorio-semanal status != enviado; automacoes relatorio_mensal aguardando_envio); pipeline do CRM nao escolhido = CRM conectado (GET /api/clientes/{id}/crm/status estado conectado) e config sem ghl_pipeline_id (GET /api/clientes/crm-config?cliente_id={notion_id}, o mesmo que a ficha ja usa em page.tsx:695); contrato sem datas = faixa do contrato (924a) sem inicio E sem fidelidade_fim. O item 'marco vencido sem registro' entra no 926 (este ticket deixa o tipo pronto e sem fonte). FAZER: (1) NOVO src/lib/clientes/pontos-acao.ts, puro: type PontoAcao = {tipo: 'acesso_bm_vencido'|'relatorio_previa'|'pipeline_crm'|'contrato_sem_datas'|'marco_vencido', texto, acao: {rotulo, href}}; pontosPedemAcao(insumos) => PontoAcao[]: cada insumo pode ser 'indisponivel' (fonte falhou) e insumo indisponivel NAO gera ponto nem afirma que esta tudo bem. (2) NOVO src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx: FaixaPedemAcaoView({pontos, indisponiveis}) pura: N = pontos.length; N = 0 => nao renderiza nada (null) mesmo com fonte indisponivel; N > 0 => uma faixa (cor de risco) 'N pontos pedem ação' com cada item em linha: texto + acao (link). Sem Card. FaixaPedemAcao({...}) busca as fontes em paralelo. (3) src/app/dashboard/clientes/[id]/_components/secao-conta.tsx: SECOES_CONTA passa a ['Contrato', 'Entregas do mês', 'Conexões e cadastro', 'Automações no grupo', 'Histórico'] (ordem 1..5) e o padrao de recolhida passa a ser so a 5 (Histórico), RECOLHIDA por padrao. (4) src/app/dashboard/clientes/[id]/page.tsx: ordem final do ramo conta, de cima para baixo: <FaixaPedemAcao> (fora de SecaoConta, primeiro bloco do ramo), SecaoConta 1 com <ContratoMarcos>, SecaoConta 2 com <EntregasDoMes> (e BlocoConsultorias logo depois), SecaoConta 3 com o grid conexoes-cadastro, SecaoConta 4 com o AnchorBlock automacoes (sai da SecaoConta das conexoes), SecaoConta 5 Histórico com <OperacaoLinhas> recolhida (sem recolhida={false}). AnchorBlock config e tarefas seguem montados so por link direto. (5) NOVO test/faixa-pedem-acao.test.tsx: cada fonte gera o ponto certo; fonte indisponivel nao gera ponto; N=0 renderiza vazio; texto 'N pontos pedem ação' com N certo; cada item com acao; sem Card. (6) NOVO test/conta-ordem-final.test.ts (le page.tsx, padrao de grep -n): no ramo conta, a linha de <FaixaPedemAcao vem antes de <ContratoMarcos, que vem antes de <EntregasDoMes, que vem antes de data-testid=\"conexoes-cadastro\", que vem antes de <BlocoAutomacoes, que vem antes de <OperacaoLinhas; SecaoConta 5 sem recolhida={false}. (7) RECALCULE com comentario 'Ticket 924f (spec 09/10): ...': conta-aceite:65-91 (5 titulos novos e ordem), conta-conexoes-entregaveis:29-36 (literal do SECOES_CONTA), conta-cadastro-operacao:48-51 (secao 5 Histórico com OperacaoLinhas), conta-conexoes (secao 3 agora sem automacoes). PROIBIDO remover assercao ou afrouxar. Regras do repo: nao importe getSession em 'use client'; sem .json() novo em src (fetchJson de @/lib/fetch-json); sem travessao (U+2014) em texto; nenhum nome de tabela, coluna ou operador em texto que o usuario le; label em todo controle (WCAG AA). FORA DE ESCOPO: marco vencido na faixa e avisos no Inicio (926); mudar as rotas de origem; corrigir a divergencia de chave do crm-config.",
  "cria_novo": [
    "src/lib/clientes/pontos-acao.ts",
    "src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx",
    "test/faixa-pedem-acao.test.tsx",
    "test/conta-ordem-final.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/clientes/pontos-acao.ts",
    "src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx",
    "src/app/dashboard/clientes/[id]/_components/secao-conta.tsx",
    "src/app/dashboard/clientes/[id]/page.tsx",
    "test/faixa-pedem-acao.test.tsx",
    "test/conta-ordem-final.test.ts",
    "test/conta-aceite.test.tsx",
    "test/conta-conexoes-entregaveis.test.ts",
    "test/conta-cadastro-operacao.test.ts",
    "test/conta-conexoes.test.ts"
  ],
  "dependencias": [
    "924e"
  ],
  "prioridade": 60,
  "excecao_tamanho": {
    "motivo": "faixa nova (lib + componente) e a ordem final da aba sao a mesma mudanca de page.tsx; os 4 testes recalculados pinam os titulos e a ordem das secoes que esta ordem troca"
  },
  "recon_esperado": [
    {
      "descricao": "src/lib/clientes/pontos-acao.ts ainda nao existe",
      "cmd": "test -e 'src/lib/clientes/pontos-acao.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx ainda nao existe",
      "cmd": "test -e 'src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/faixa-pedem-acao.test.tsx ainda nao existe",
      "cmd": "test -e 'test/faixa-pedem-acao.test.tsx' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/conta-ordem-final.test.ts ainda nao existe",
      "cmd": "test -e 'test/conta-ordem-final.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "nenhuma faixa 'pedem acao' existe",
      "cmd": "n=$(grep -rl 'pontos pedem' src | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo SEM_FAIXA || echo ST_$n",
      "espera": "SEM_FAIXA"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/clientes/pontos-acao.ts' 'src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx' 'src/app/dashboard/clientes/[id]/_components/secao-conta.tsx' 'src/app/dashboard/clientes/[id]/page.tsx' 'test/faixa-pedem-acao.test.tsx' 'test/conta-ordem-final.test.ts' 'test/conta-aceite.test.tsx' 'test/conta-conexoes-entregaveis.test.ts' 'test/conta-cadastro-operacao.test.ts' 'test/conta-conexoes.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
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
      "descricao": "ordem da spec no ramo conta: faixa < Contrato < Entregas < Conexoes|Cadastro < Automacoes < Historico (grep -n)",
      "cmd": "p() { sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -n -- \"$1\" | head -1 | cut -d: -f1; }; a=$(p '<FaixaPedemAcao'); b=$(p '<ContratoMarcos'); c=$(p '<EntregasDoMes'); d=$(p 'data-testid=\"conexoes-cadastro\"'); e=$(p '<BlocoAutomacoes'); f=$(p '<OperacaoLinhas'); [ -n \"$a\" ] && [ -n \"$b\" ] && [ -n \"$c\" ] && [ -n \"$d\" ] && [ -n \"$e\" ] && [ -n \"$f\" ] && [ \"$a\" -lt \"$b\" ] && [ \"$b\" -lt \"$c\" ] && [ \"$c\" -lt \"$d\" ] && [ \"$d\" -lt \"$e\" ] && [ \"$e\" -lt \"$f\" ] && echo ORDEM_DA_SPEC || echo ST_${a}_${b}_${c}_${d}_${e}_${f}",
      "espera": "ORDEM_DA_SPEC",
      "tipo": "alvo"
    },
    {
      "descricao": "Historico recolhido por padrao (sem recolhida={false} no page)",
      "cmd": "n=$(sed -n '/grupoAtivo === \"conta\" \\&\\&/,/grupoAtivo === \"comercial\" \\&\\&/p' 'src/app/dashboard/clientes/[id]/page.tsx' | grep -c 'recolhida={false}'); [ \"$n\" = 0 ] && echo RECOLHIDO || echo ST_$n",
      "espera": "RECOLHIDO"
    },
    {
      "descricao": "densidade: faixa sem Card e nao renderiza com N = 0",
      "cmd": "test -f 'src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx' && c=$(grep -c '<Card[ >]' 'src/app/dashboard/clientes/[id]/_components/faixa-pedem-acao.tsx') && [ \"$c\" = 0 ] && echo SEM_CARD || echo ST",
      "espera": "SEM_CARD"
    },
    {
      "descricao": "anti-afrouxamento nos testes recalculados (test/conta-aceite.test.tsx, test/conta-conexoes-entregaveis.test.ts, test/conta-cadastro-operacao.test.ts, test/conta-conexoes.test.ts): expect( nao diminui, sem .skip/.only, cita 924f",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=AFROUXAMENTO_OK; for f in 'test/conta-aceite.test.tsx' 'test/conta-conexoes-entregaveis.test.ts' 'test/conta-cadastro-operacao.test.ts' 'test/conta-conexoes.test.ts'; do if git diff --quiet \"$b\" HEAD -- \"$f\"; then continue; fi; a=$(git show \"$b:$f\" | grep -c 'expect('); h=$(grep -c 'expect(' \"$f\"); s=$(git diff \"$b\" HEAD -- \"$f\" | grep -cE '^[+].*[.](skip|only)[(]'); c=$(grep -c '924f' \"$f\"); if [ \"$h\" -lt \"$a\" ] || [ \"$s\" != 0 ] || [ \"$c\" = 0 ]; then r=AFROUXOU_$f; fi; done; echo $r",
      "espera": "AFROUXAMENTO_OK",
      "tipo": "guarda"
    },
    {
      "descricao": "testes verdes (test/faixa-pedem-acao.test.tsx, test/conta-ordem-final.test.ts, test/conta-aceite.test.tsx, test/conta-conexoes-entregaveis.test.ts, test/conta-cadastro-operacao.test.ts, test/conta-conexoes.test.ts, test/ltv-na-conta.test.ts, test/conta-resultados-escritorio.test.ts, test/relacao-aceite.test.tsx, test/resumo-grupo-wpp-tela.test.tsx, test/ficha-relacao-estados.test.tsx)",
      "cmd": "test -f test/faixa-pedem-acao.test.tsx && npx vitest run test/faixa-pedem-acao.test.tsx test/conta-ordem-final.test.ts test/conta-aceite.test.tsx test/conta-conexoes-entregaveis.test.ts test/conta-cadastro-operacao.test.ts test/conta-conexoes.test.ts test/ltv-na-conta.test.ts test/conta-resultados-escritorio.test.ts test/relacao-aceite.test.tsx test/resumo-grupo-wpp-tela.test.tsx test/ficha-relacao-estados.test.tsx >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: aba Conta na ordem da spec (faixa so com N > 0, Contrato, Entregas do mes, Conexoes | Cadastro, Automacoes no grupo, Historico recolhido); faixa com 4 tipos de ponto vindos das fontes existentes e acao em cada um. REPROVE se: faixa aparece com N = 0; fonte indisponivel vira ponto ou vira 'tudo certo'; acesso vencido lido de status em vez de token_expires_at/saudeColeta; Card na faixa; ordem diferente da spec; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/relacao-aceite.test.tsx",
      "motivo": "62: corta o arquivo em grupoAtivo === \"conta\" &&; o marcador fica"
    },
    {
      "teste": "test/resumo-grupo-wpp-tela.test.tsx",
      "motivo": "101: idem, marcador do ramo conta fica"
    },
    {
      "teste": "test/ficha-relacao-estados.test.tsx",
      "motivo": "23: idem, marcador do ramo conta fica"
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
