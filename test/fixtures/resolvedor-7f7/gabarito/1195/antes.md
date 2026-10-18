# Ticket 1195: Sync tl;dv: completa a reuniao manual do mesmo cliente a +/-2h em vez de duplicar, e o registro com link do tl;dv busca a transcricao

> Escrito em 16/10/2026. Frente: registro de reuniao operacional completo na ficha (pedido do Lucas, 16/10).
> Recon contra main 8b7ee5e e banco vivo (execute_sql) em 16/10/2026.

> Fonte de maquina e o bloco ```json. A prosa e para humanos.

## Objetivo (prosa)

Ticket C2.

- **Dedupe:** quando o webhook do tl;dv insere uma reuniao (1a entrega) e o matching achou o cliente, se existir reuniao manual desse cliente, sem `tldv_meeting_id`, com `data` a +/-2h, o sync **completa essa linha** (id, url, transcricao, duracao, titulo) em vez de criar outra. Reentrega por id ja cai no merge que existe.
- **Participantes:** o merge do sync passa a preservar `colaboradores`. Hoje ele sobrescreve `participantes` inteiro e apagaria o que foi marcado a mao.
- **Transcricao pelo link:** o registro manual com link do tl;dv e sem transcricao busca a transcricao na API do tl;dv (`TLDV_API_KEY`, que esta no `.env.local` mas nao e usada por nenhum codigo hoje). Recon: a integracao existente e so o webhook (push via n8n); nao ha cliente de API. Este ticket cria o cliente minimo. Se a API falhar, a reuniao fica salva e a transcricao chega depois pelo webhook, que enfileira a analise como ja faz.

**Ponto para o Lucas:** confirmar que `TLDV_API_KEY` existe na Vercel (production e preview). O MCP da Vercel nao tem escopo neste projeto.

## Campos de maquina

```json
{
  "id": "1195",
  "slug": "reuniao-dedupe-tldv",
  "lane": "produto",
  "perfil": "api",
  "objetivo": "ORCAMENTO DE DIFF: teto de 600 linhas (~90 em ingest.ts, ~110 em tldv-api.ts NOVO, ~5 em types.ts, ~40 em manual.ts, ~330 no teste NOVO). Se passar do teto, pare e reporte. DEPENDE do 1191 (manual.ts, campos novos em types.ts) e do 1194 (enfileirarResumoReuniao grava analise_status), ambos atras do 1190 aplicado. A coluna duracao_seg e escrita aqui, mas fica fora de colunas_escritas porque so existe depois do 1190, que a cria e confere. RECON DE 16/10 (banco vivo): perf_reuniao.tldv_meeting_id e NOT NULL + UNIQUE; categoria_interna e text sem CHECK (o vocabulario vive no app, src/lib/perf/reunioes/types.ts); as 15 linhas atuais tem categoria_interna, health e cliente_id nulos (match_status nao_identificado); perf_leituras_relacao_gatilho_check aceita semanal, manual, nps_baixo, reclamacao, cpl_alto, renovacao, cron_diario (nao aceita reuniao); RLS ligada nas 3 tabelas; trigger trg_perf_reuniao_updated. O participantes que o sync do tl;dv grava hoje e {\"organizer\":{\"name\",\"email\"},\"invitees\":[...]}. Nao existe coluna de duracao, de origem nem de estado de analise. PASSO 1: leia src/lib/perf/reunioes/ingest.ts inteiro, src/lib/perf/reunioes/manual.ts, src/lib/perf/reunioes/types.ts (tldvConteudoSchema), src/lib/perf/reunioes/matching.ts e test/reuniao-tldv-envelope-e-contato.test.ts (dublê do supabase do ingest). FAZER: (1) src/lib/perf/reunioes/types.ts: conteudoShape ganha duration: z.union([z.number(), z.string()]).nullish() (segundos). (2) src/lib/perf/reunioes/ingest.ts: mapPayload devolve duracao_seg (inteiro >= 0 a partir de duration; invalido vira null). UPDATE (reentrega): participantes do patch preserva colaboradores do existente ({...m.participantes, colaboradores: existente.participantes?.colaboradores} quando houver; o select do existente passa a trazer participantes); duracao_seg entra no patch quando vier. INSERT (1a entrega): depois do matchCliente, se match.cliente_id e m.data existem, procura em perf_reuniao: cliente_id = match.cliente_id, origem = 'manual', tldv_meeting_id is null, data entre m.data - 2h e m.data + 2h (JANELA_DEDUPE_MS = 2 * 60 * 60 * 1000 exportada), ordena pela menor distancia; achou => UPDATE dessa linha com tldv_meeting_id, tldv_url, duracao_seg, titulo_externo (se nulo), transcript_text (so se nulo), resumo do tl;dv (so se nulo), participantes {organizer, invitees do tl;dv, colaboradores da linha manual}; data, categoria_interna, observacao, cliente_id e origem da linha manual NAO mudam; depois enfileirarResumoReuniao como no update; retorno acao 'atualizado' com match_status 'dedupe_manual'; nao achou => insert como hoje (com duracao_seg). Sem cliente no matching NAO deduplica (nao ha como saber de quem e). Mais de uma linha na janela: completa a mais proxima e loga as demais (console.warn, sem dado pessoal). (3) NOVO src/lib/perf/reunioes/tldv-api.ts: TLDV_API_BASE = 'https://pasta.tldv.io/v1alpha1'; buscarTranscricaoTldv(meetingId, deps = {fetch, apiKey: process.env.TLDV_API_KEY}): sem apiKey => {estado: 'sem_chave'}; GET {base}/meetings/{id}/transcript com header x-api-key e AbortSignal.timeout(10000); 404 => {estado: 'indisponivel'}; outro status nao 2xx ou timeout => {estado: 'falhou'}; 2xx => le por parseJsonResponse (src/lib/fetch-json.ts, sem .json() cru), aceita {data: [{speaker, text}]} ou array e achata 'Fala: texto' por linha (mesma regra do flattenTranscript do ingest; exporte flattenTranscript do ingest e reuse, nao duplique); vazio => 'indisponivel'; senao {estado: 'ok', texto}. Nunca loga a chave. (4) src/lib/perf/reunioes/manual.ts: depois de gravar uma reuniao com tldv_meeting_id e sem transcricao (nem nova nem ja existente), chama buscarTranscricaoTldv; 'ok' => update de transcript_text na linha (so se ainda nulo) e segue para enfileirarResumoReuniao; outro estado => a reuniao fica salva sem transcricao e o retorno ganha transcricao: 'aguardando_tldv' (a tela diz que a transcricao chega pelo tl;dv). O retorno de registrarReuniaoManual ganha o campo transcricao: 'informada' | 'buscada_tldv' | 'aguardando_tldv' | 'sem_link_tldv'. (5) NOVO test/reuniao-dedupe-tldv.test.ts: mapPayload com duration 1834 => duracao_seg 1834; reentrega preserva colaboradores; 1a entrega com manual do mesmo cliente a 1h59 => um update na linha manual, zero insert, data/categoria intactas, organizer e invitees do tl;dv + colaboradores; manual a 2h01 => insert novo; manual de outro cliente na janela => insert novo; matching sem cliente => insert novo sem procurar; duas manuais na janela => completa a mais proxima; buscarTranscricaoTldv com fetch mockado: sem chave, 404, 500, timeout, 2xx com data[] e com array; header x-api-key enviado; registrarReuniaoManual com link do tl;dv sem transcricao: 'ok' grava e enfileira, 'falhou' devolve 'aguardando_tldv' sem erro. FORA DE ESCOPO: cron de busca periodica, Fathom, tela (1196), matching (matching.ts nao muda), backfill das 15 linhas antigas. Regras do repo: sem .json() cru novo em src (fetchJson/parseJsonResponse de src/lib/fetch-json.ts no cliente, lerCorpoJson nas rotas); mensagem humana sem nome de tabela, coluna ou sistema; sem travessao (U+2014/U+2013) em texto; getSession e server-only; rota NOVA que exige papel usa exigirPapel (src/lib/auth/exigir-papel.ts); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*), nem nome dessas tabelas em comentario; credencial de IA e a OpenAI via chamarProvider (src/lib/ia/provider.ts); falha de leitura NUNCA vira zero nem lista vazia (estado de erro distinto do vazio); reuniao de venda (agenda do comercial) NAO entra: so perf_reuniao, a reuniao operacional. PROIBIDO remover assercao, afrouxar matcher ou usar .skip/.only/.todo.",
  "cria_novo": [
    "src/lib/perf/reunioes/tldv-api.ts",
    "test/reuniao-dedupe-tldv.test.ts"
  ],
  "pathspec_allowlist": [
    "src/lib/perf/reunioes/ingest.ts",
    "src/lib/perf/reunioes/tldv-api.ts",
    "src/lib/perf/reunioes/types.ts",
    "src/lib/perf/reunioes/manual.ts",
    "test/reuniao-dedupe-tldv.test.ts"
  ],
  "dependencias": [
    "1191",
    "1194"
  ],
  "prioridade": 45,
  "recon_esperado": [
    {
      "descricao": "src/lib/perf/reunioes/tldv-api.ts ainda nao existe",
      "cmd": "test -e 'src/lib/perf/reunioes/tldv-api.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "test/reuniao-dedupe-tldv.test.ts ainda nao existe",
      "cmd": "test -e 'test/reuniao-dedupe-tldv.test.ts' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    },
    {
      "descricao": "o ingest ainda nao deduplica com reuniao manual nem preserva colaboradores",
      "cmd": "f='src/lib/perf/reunioes/ingest.ts'; a=$(grep -c 'JANELA_DEDUPE_MS' \"$f\"); b=$(grep -c 'colaboradores' \"$f\"); [ \"$a\" = 0 ] && [ \"$b\" = 0 ] && echo SEM_DEDUPE || echo ST_${a}_${b}",
      "espera": "SEM_DEDUPE"
    }
  ],
  "colunas_escritas": [
    "perf_reuniao.tldv_meeting_id",
    "perf_reuniao.tldv_url",
    "perf_reuniao.titulo_externo",
    "perf_reuniao.transcript_text",
    "perf_reuniao.resumo",
    "perf_reuniao.participantes"
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
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'src/lib/perf/reunioes/ingest.ts' 'src/lib/perf/reunioes/tldv-api.ts' 'src/lib/perf/reunioes/types.ts' 'src/lib/perf/reunioes/manual.ts' 'test/reuniao-dedupe-tldv.test.ts' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 600 linhas somando adicoes e remocoes)",
      "cmd": "b=\"$(git merge-base HEAD staging-auto)\"; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 600 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes (test/c0-guard.test.ts, test/fetch-json-teto.test.ts, test/travessao-mudo.test.ts)",
      "cmd": "npx vitest run 'test/c0-guard.test.ts' 'test/fetch-json-teto.test.ts' 'test/travessao-mudo.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "ingest deduplica na janela de 2h e preserva colaboradores; cliente da API usa x-api-key sem .json() cru",
      "cmd": "f='src/lib/perf/reunioes/ingest.ts'; t='src/lib/perf/reunioes/tldv-api.ts'; test -f \"$t\" || { echo SEM_ARQUIVO; exit 0; }; a=$(grep -c 'JANELA_DEDUPE_MS' \"$f\"); b=$(grep -c 'colaboradores' \"$f\"); c=$(grep -c 'x-api-key' \"$t\"); d=$(grep -c '[.]json()' \"$t\"); e=$(grep -c 'TLDV_API_KEY' \"$t\"); [ \"$a\" -ge 2 ] && [ \"$b\" -ge 1 ] && [ \"$c\" -ge 1 ] && [ \"$d\" = 0 ] && [ \"$e\" -ge 1 ] && echo DEDUPE_OK || echo ST_${a}_${b}_${c}_${d}_${e}",
      "espera": "DEDUPE_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "testes verdes (test/reuniao-dedupe-tldv.test.ts, test/reuniao-tldv-envelope-e-contato.test.ts, test/webhook-segredo-freio.test.ts, test/reuniao-manual-registro.test.ts)",
      "cmd": "test -f 'test/reuniao-dedupe-tldv.test.ts' && npx vitest run 'test/reuniao-dedupe-tldv.test.ts' 'test/reuniao-tldv-envelope-e-contato.test.ts' 'test/webhook-segredo-freio.test.ts' 'test/reuniao-manual-registro.test.ts' >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE"
    },
    {
      "descricao": "avaliador: o sync completa a reuniao manual do mesmo cliente a +/-2h em vez de duplicar, preserva colaboradores, e o registro com link do tl;dv busca a transcricao sem travar o salvamento. REPROVE se: deduplica sem cliente do matching; muda data, tipo ou cliente da linha manual; apaga colaboradores; loga a chave; .json() cru; duplica flattenTranscript; assercao removida ou afrouxada.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [
    {
      "teste": "test/reuniao-tldv-envelope-e-contato.test.ts",
      "motivo": "mapPayload ganha duracao_seg; o teste afirma campos de participantes, nao o objeto inteiro; o dublê do supabase precisa responder ao select do dedupe; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/webhook-segredo-freio.test.ts",
      "motivo": "a rota do webhook nao muda; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/reuniao-manual-registro.test.ts",
      "motivo": "teste do 1191; o retorno de registrarReuniaoManual ganha o campo transcricao; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/reuniao-operacional-resumo-ia-job.test.ts",
      "motivo": "o job nao muda aqui; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/relacao-reuniao-operacional.test.ts",
      "motivo": "fixture PerfReuniao; types.ts so ganha duration opcional no schema do payload; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/reunioes-sem-cliente.test.ts",
      "motivo": "fixture PerfReuniao; schema do payload nao afeta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/reuniao-operacional-termometro.test.ts",
      "motivo": "fixture PerfReuniao; schema do payload nao afeta; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/visao-apolo-reuniao-operacional.test.ts",
      "motivo": "nao usa o payload do tl;dv; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/rbac-visual.test.ts",
      "motivo": "transitivo; nao muda; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/leitores-ficha-libs-casa-nova.test.ts",
      "motivo": "le libs por caminho; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/apolo-ferramentas-cliente.test.ts",
      "motivo": "transitivo por types.ts; nao usa o payload; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/apolo-ferramentas.test.ts",
      "motivo": "transitivo por types.ts; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/apolo-contexto.test.ts",
      "motivo": "transitivo por types.ts; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/apolo-ferramenta-atendimento.test.ts",
      "motivo": "transitivo por types.ts; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-worker.test.ts",
      "motivo": "transitivo pelo registro de jobs; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/jobs-motor-geral.test.ts",
      "motivo": "transitivo pelo registro de jobs; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/ghl-backfill-job.test.ts",
      "motivo": "transitivo pelo registro de jobs; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/criativos-classificar.test.ts",
      "motivo": "transitivo pelo registro de jobs; se quebrar, PARE e descreva"
    },
    {
      "teste": "test/criativos-transcrever.test.ts",
      "motivo": "transitivo pelo registro de jobs; se quebrar, PARE e descreva"
    }
  ],
  "status": "bloqueado",
  "notas_status": "enforcement: fora_do_pathspec: test/reuniao-manual-registro.test.ts"
}
```
