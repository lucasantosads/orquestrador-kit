# Ticket 926b: marco vencido e a vencer nos avisos do gestor (job do Início)

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Ticket F2 da frente de marcos. No OS, os avisos do gestor são as notificações de `gravarAviso`: aparecem no sino e em `/portal/comunicados` e são geradas pelo job diário `operacao-inicio`, como renovação e NPS. Este ticket acrescenta uma etapa `avisos_marcos` ao job:

- avisa quem cuida do cliente quando um marco do escopo está vencido sem registro;
- avisa antes do vencimento, quando o marco entra na janela "Avisar antes (dias)" da Tela 3.

## Recon de 09/10

```
src/app/portal/page.tsx nao renderiza notificacoes; sino-notificacoes.tsx (sidebar) e /portal/comunicados leem /api/notifications?escopo=meu
src/lib/avisos/gravar.ts:8-32 CATEGORIAS_AVISO (9) e ROTULO_CATEGORIA_AVISO; gravarAviso deduplica por metadata->>chave
src/lib/jobs/operacao-inicio.ts ETAPAS: eventos_resposta, avisos_vacuo, promessas_detectar, promessas_fechar, avisos_promessa, avisos_operacao, avisos_renovacao, avisos_nps, avisos_comarka_pro
src/lib/clientes/quem-cuida.ts: carregarQuemCuida (lanca em erro), responsaveisDoCliente (gestor principal; sem gestor, heads)
nenhum teste fixa o tamanho de CATEGORIAS_AVISO nem de ETAPAS; FILTROS do comunicados fixado em 11 pelo mockup
```

## Campos de máquina

```json
{
  "id": "926b",
  "slug": "avisos-marcos-inicio",
  "lane": "produto",
  "perfil": "backend",
  "objetivo": "ORCAMENTO DE DIFF: teto de 360 linhas (~130 em src/lib/avisos/marcos.ts, ~4 em src/lib/avisos/gravar.ts, ~10 em src/lib/jobs/operacao-inicio.ts, ~200 em test/avisos-marcos.test.ts). Se passar do teto, pare e reporte. SPEC: docs/specs/2026-10-09-aba-conta-marcos.md, default 'Marco vencido sem registro entra ... nos avisos do gestor no Início' e coluna 'Avisar antes (dias)' da Tela 3. No OS os avisos do gestor sao as notificacoes de gravarAviso (sino e /portal/comunicados), as mesmas de renovacao e NPS. DEPENDE do 921 (carregarMarcosPrazoCliente) e do 924f. PASSO 1: leia src/lib/avisos/renovacao-nps.ts (molde: clientesAtivos + carregarQuemCuida + responsaveisDoCliente + gravarAviso com chave), src/lib/avisos/gravar.ts, src/lib/jobs/operacao-inicio.ts:28-90 e src/lib/contrato/marcos-prazo-carregar.ts. FAZER: (1) NOVO src/lib/avisos/marcos.ts: export async function gerarAvisosMarcos(db, hoje: string): para cada cliente ativo (isClienteAtivo), carregarMarcosPrazoCliente(db, clienteId, hoje); para cada no com estado === 'vencido' grava aviso 'Marco vencido: {rotulo}' com mensagem '{cliente} · {produto_nome} · venceu em DD/MM' e chave 'marco:{cliente_produto_id}:{template_etapa_id}:vencido'; para cada no com vence_em_breve grava 'Marco vence em N dias: {rotulo}' com chave 'marco:{cliente_produto_id}:{template_etapa_id}:aviso:{prazo.data}'. Destinatarios = responsaveisDoCliente(quem, clienteId).pessoas; sem ninguem => conta sem_destinatario. link '/dashboard/clientes/{clienteId}?aba=conta'. categoria 'marco'. Erro de leitura de UM cliente e contado em falhas e nao derruba os outros; erro da lista de clientes LANCA. Retorna {vencidos, avisos_gravados, sem_destinatario, falhas}. Nada de comparar datas aqui: estado e vence_em_breve vem do 921. (2) src/lib/avisos/gravar.ts: 'marco' entra no FIM de CATEGORIAS_AVISO e ROTULO_CATEGORIA_AVISO.marco = 'Marco do contrato'. Nao mexa no FILTROS de /portal/comunicados (o numero de filtros e fixado pelo mockup em test/portal-sino-notificacoes-aceite.test.tsx e test/aba-notificacoes-portal.test.tsx; o aviso aparece em 'Todas' e 'Não lidas'). (3) src/lib/jobs/operacao-inicio.ts: etapa nova {nome: 'avisos_marcos', rodar: ...} logo depois de 'avisos_renovacao', resumo '{vencidos} vencidos, {avisos} avisos' + sem responsavel/falhas quando houver. (4) NOVO test/avisos-marcos.test.ts: vencido gera aviso por responsavel com a chave certa; vence_em_breve gera aviso de antecedencia; sem_registro com prazo null nao gera nada; feito nao gera; cliente inativo fora; erro de um cliente conta falha e segue; repetir a rodada nao duplica (gravarAviso por chave); 'marco' esta em CATEGORIAS_AVISO com rotulo; ETAPAS tem avisos_marcos depois de avisos_renovacao. Regras do repo: sem .json() novo em src; sem travessao (U+2014) em texto; nenhum nome de tabela ou coluna em texto que o usuario le. FORA DE ESCOPO: tela do /portal; filtros do comunicados; mudar outros geradores; criar rota de cron nova (a etapa entra no job que ja roda).",
  "cria_novo": [
    "src/lib/avisos/marcos.ts",
    "test/avisos-marcos.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/avisos/marcos.ts",
    "src/lib/avisos/gravar.ts",
    "src/lib/jobs/operacao-inicio.ts",
    "test/avisos-marcos.test.ts"
  ],
  "dependencias": [
    "921",
    "924f"
  ],
  "prioridade": 60,
  "recon_esperado": [
    {
      "descricao": "src/lib/avisos/marcos.ts ainda nao existe",
      "cmd": "test -e 'src/lib/avisos/marcos.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/avisos-marcos.test.ts ainda nao existe",
      "cmd": "test -e 'test/avisos-marcos.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "categoria marco ainda nao existe e o job tem avisos_renovacao",
      "cmd": "m=$(grep -c '\"marco\"' src/lib/avisos/gravar.ts); r=$(grep -c 'nome: \"avisos_renovacao\"' src/lib/jobs/operacao-inicio.ts); [ \"$m\" = 0 ] && [ \"$r\" = 1 ] && echo SEM_MARCO || echo ST_${m}_${r}",
      "espera": "SEM_MARCO"
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
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/avisos/marcos.ts' 'src/lib/avisos/gravar.ts' 'src/lib/jobs/operacao-inicio.ts' 'test/avisos-marcos.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 360 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 360 ] && echo NO_TETO || echo ESTOUROU_$t",
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
      "descricao": "gerador exportado, categoria marco com rotulo e etapa avisos_marcos depois de avisos_renovacao",
      "cmd": "test -f src/lib/avisos/marcos.ts && g=$(grep -c 'export async function gerarAvisosMarcos' src/lib/avisos/marcos.ts) && c=$(grep -c 'marco: \"Marco do contrato\"' src/lib/avisos/gravar.ts) && r=$(grep -n 'nome: \"avisos_renovacao\"' src/lib/jobs/operacao-inicio.ts | cut -d: -f1) && m=$(grep -n 'nome: \"avisos_marcos\"' src/lib/jobs/operacao-inicio.ts | cut -d: -f1) && [ \"$g\" = 1 ] && [ \"$c\" = 1 ] && [ -n \"$m\" ] && [ \"$m\" -gt \"$r\" ] && echo AVISOS_OK || echo ST",
      "espera": "AVISOS_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "o gerador nao calcula vencido por data",
      "cmd": "test -f src/lib/avisos/marcos.ts && n=$(grep -cE 'new Date[(][)]|Date[.]now|prazo[.]data *<' src/lib/avisos/marcos.ts); [ \"$n\" = 0 ] && echo SEM_CALCULO || echo ST_$n",
      "espera": "SEM_CALCULO"
    },
    {
      "descricao": "filtros do comunicados intocados",
      "cmd": "b=\"$(git merge-base HEAD origin/staging-auto)\"; n=$(git diff --name-only \"$b\" HEAD -- src/app/portal | wc -l | tr -d ' '); [ \"$n\" = 0 ] && echo PORTAL_INTOCADO || echo ST_$n",
      "espera": "PORTAL_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "testes verdes (test/avisos-marcos.test.ts, test/notificacoes-escopo-meu.test.ts, test/portal-sino-notificacoes-aceite.test.tsx, test/aba-notificacoes-portal.test.tsx, test/sino-notificacoes.test.tsx, test/avisos-operacao.test.ts, test/avisos-renovacao-nps.test.ts, test/aviso-comarka-pro.test.ts, test/operacao-inicio-registro.test.ts)",
      "cmd": "test -f test/avisos-marcos.test.ts && npx vitest run test/avisos-marcos.test.ts test/notificacoes-escopo-meu.test.ts test/portal-sino-notificacoes-aceite.test.tsx test/aba-notificacoes-portal.test.tsx test/sino-notificacoes.test.tsx test/avisos-operacao.test.ts test/avisos-renovacao-nps.test.ts test/aviso-comarka-pro.test.ts test/operacao-inicio-registro.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: o job diario grava aviso para quem cuida do cliente quando um marco do escopo esta vencido sem registro ou vence dentro do 'avisar antes'; sem duplicar; estados vindos do 921. REPROVE se: vencido calculado sem data de referencia ou recalculado aqui; aviso para marco fora do escopo; falha de um cliente derruba a rodada; FILTROS do portal alterado; teste que passaria contra HEAD.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/notificacoes-escopo-meu.test.ts",
      "motivo": "20,153-157: CATEGORIAS_AVISO contem comarka_pro e categoriaDoAviso; 'marco' entra no fim, nao muda"
    },
    {
      "teste": "test/portal-sino-notificacoes-aceite.test.tsx",
      "motivo": "162-163 tipos do mockup casam rotulo; 294-298 sem /lead/; 310 sem travessao; 'Marco do contrato' respeita os tres"
    },
    {
      "teste": "test/aba-notificacoes-portal.test.tsx",
      "motivo": "18-29: 11 filtros no page; o FILTROS nao muda"
    },
    {
      "teste": "test/sino-notificacoes.test.tsx",
      "motivo": "85-87: rotulos grupo/tarefa no mockup; nao muda"
    },
    {
      "teste": "test/avisos-operacao.test.ts",
      "motivo": "121-125: avisos_operacao depois de avisos_vacuo; nao muda"
    },
    {
      "teste": "test/avisos-renovacao-nps.test.ts",
      "motivo": "138-141: ETAPAS contem avisos_renovacao e avisos_nps; nao muda"
    },
    {
      "teste": "test/aviso-comarka-pro.test.ts",
      "motivo": "85: fonte contem nome: \"avisos_comarka_pro\"; nao muda"
    },
    {
      "teste": "test/operacao-inicio-registro.test.ts",
      "motivo": "mocka o job; etapa nova roda dentro do try/catch por etapa; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/avisos-vacuo.test.ts",
      "motivo": "alcanca src/lib/jobs/operacao-inicio.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/eventos-resposta-grupo.test.ts",
      "motivo": "alcanca src/lib/jobs/operacao-inicio.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/audit-log-rotas.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/aviso-tarefa-atribuida.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/clientes-getsession-lote2.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/distribuir-carteira-api.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/eventos-tarefa.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/fila-todos-sem-dono.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/inicio-equipe-api.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/nps-coleta.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/nps-reacao-resposta.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/promessa-fechar.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/tarefa-nome-cliente.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/tarefas-kanban-vinculo-analise.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/tarefas-patch-atividade.test.ts",
      "motivo": "alcanca src/lib/avisos/gravar.ts pelo grafo; o 926b so acrescenta 'marco' no fim de CATEGORIAS_AVISO/ROTULO e uma etapa avisos_marcos no job; se quebrar, PARE e descreva"
    }
  ],
  "status": "pendente",
  "notas_status": ""
}
```
