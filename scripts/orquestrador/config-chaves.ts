/**
 * config-chaves.ts — as chaves de `docs/fila/000-config.json` que o motor LÊ,
 * e o arquivo:linha de onde cada uma é lida.
 *
 * PROCEDÊNCIA: levantada do disco, não de memória. A lista de shell saiu de
 *   grep -nE "cfg '[^']*'" scripts/orquestrador/*.sh scripts/orq
 * e a de TypeScript dos acessos diretos em `scripts/orquestrador/*.ts`. Cada
 * entrada carrega o `onde` porque "a chave X está faltando" sem dizer quem a lê
 * manda a pessoa grepar o motor inteiro — e quem está lendo essa mensagem
 * acabou de descobrir que o config está quebrado, que é o pior momento para
 * mandar alguém procurar.
 *
 * `obrigatoria` é uma pergunta só: **o motor quebra sem ela, ou segue?**
 *   true  — lida sem default no carregamento do `lib.sh` ou num ponto que
 *           aborta o run. Ausente, `jq -r` devolve a string "null", que vira
 *           caminho, branch ou número literalmente chamado "null".
 *   false — tem default no código, é opcional por desenho, ou só é lida num
 *           caminho que pode não acontecer neste repo.
 *
 * Esta lista é INSUMO de `orq config`, nunca gate de execução: o motor não a
 * consulta para rodar. Quando uma chave nova entrar no motor, ela entra aqui —
 * e o teste que prova a chave nova é o mesmo que prova a entrada.
 */

export interface ChaveConfig {
  /** Caminho da chave, com ponto: `orcamento.usd_dia`. */
  chave: string
  /** Arquivo:linha de onde ela é lida. */
  onde: string
  /** O motor quebra sem ela? */
  obrigatoria: boolean
  /** Por que é (ou não é) obrigatória. Uma linha. */
  nota?: string
}

export const CHAVES_CONFIG: ChaveConfig[] = [
  // --- carregadas no topo do lib.sh: sem elas o motor nasce quebrado ---------
  { chave: 'branch_alvo', onde: 'lib.sh:52', obrigatoria: true, nota: 'CFG_BRANCH_ALVO; é a branch que o loop mergeia' },
  { chave: 'max_retries', onde: 'lib.sh:53', obrigatoria: true, nota: 'CFG_MAX_RETRIES; também lido por decisao.ts:273' },
  { chave: 'migrations_dir', onde: 'lib.sh:54', obrigatoria: true, nota: 'CFG_MIGRATIONS_DIR; enforcement-core.ts:128 classifica .sql por ele' },
  { chave: 'runs_dir', onde: 'lib.sh:55', obrigatoria: true, nota: 'RUNS_BASE sai daqui (lib.sh:72): trilha, STATUS e evidência inteira' },
  { chave: 'liberacoes_file', onde: 'lib.sh:56', obrigatoria: true, nota: 'CFG_LIBERACOES; sem ele nenhuma dependência humana resolve' },
  { chave: 'worktrees_dir', onde: 'lib.sh:57', obrigatoria: true, nota: 'RELATIVO ao checkout principal (lib.sh:77)' },
  { chave: 'diff_cap_linhas', onde: 'lib.sh:58', obrigatoria: true, nota: 'CFG_DIFF_CAP; também decisao.ts:201' },
  { chave: 'repo_origin_deve_conter', onde: 'lib.sh:67', obrigatoria: true, nota: 'preflight de identidade; executor.sh:104-108 aborta o run inteiro' },
  { chave: 'ambiente_id', onde: 'lib.sh:68', obrigatoria: true, nota: 'preflight de identidade contra o .env; executor.sh:111-114' },
  { chave: 'pausar_file', onde: 'lib.sh:615', obrigatoria: true, nota: 'CFG_PAUSAR_FILE, o kill switch em arquivo' },
  { chave: 'orcamento.custo_file', onde: 'lib.sh:845', obrigatoria: true, nota: 'CFG_CUSTO_FILE, o ledger' },

  // --- orçamento: é GATE, não relatório -------------------------------------
  { chave: 'orcamento.usd_dia', onde: 'lib.sh:913', obrigatoria: true, nota: 'teto diário; estourou = adiado' },
  { chave: 'orcamento.tokens_dia', onde: 'lib.sh:914', obrigatoria: true },
  { chave: 'orcamento.usd_ticket', onde: 'lib.sh:915', obrigatoria: true },
  { chave: 'orcamento.campos_usage.custo_usd', onde: 'lib.sh:859', obrigatoria: true, nota: 'nome do campo NO ENVELOPE do agente; muda de versão para versão' },
  { chave: 'orcamento.campos_usage.tokens_in', onde: 'lib.sh:860', obrigatoria: true },
  { chave: 'orcamento.campos_usage.tokens_out', onde: 'lib.sh:861', obrigatoria: true },
  { chave: 'orcamento.campos_usage.tokens_cache', onde: 'lib.sh:862', obrigatoria: true },

  // --- executor e decisão ---------------------------------------------------
  { chave: 'branch_protegida', onde: 'local-loop.sh:28, executor.sh:130', obrigatoria: true, nota: 'o motor lê ESTE nome; o template chama de branch_principal' },
  { chave: 'claude_timeout_secs', onde: 'executor.sh:599', obrigatoria: true, nota: 'também decide o "MORTO há" do orq (status congelado)' },
  { chave: 'claude_max_turns', onde: 'executor.sh:784', obrigatoria: true },
  { chave: 'executor_model', onde: 'executor.sh:168', obrigatoria: true },
  { chave: 'retry_final_model', onde: 'decisao.ts:292', obrigatoria: true },
  { chave: 'gates', onde: 'gates.ts:178, executor.sh:498', obrigatoria: true, nota: 'a lista de gates; vazia = nenhum gate roda' },
  { chave: '_execucao_dos_gates.ordem_obrigatoria', onde: 'gates.ts:176, executor.sh:382', obrigatoria: true, nota: 'gates.ts ERRA se a ordem divergir da lista' },
  { chave: '_execucao_dos_gates.interrupcao', onde: 'gates.ts:177', obrigatoria: true },
  { chave: 'zona_proibida', onde: 'enforcement-core.ts:211, executor.sh:364', obrigatoria: true, nota: 'a fronteira que o enforcement aplica' },
  { chave: 'politica_adiamento.causas_que_adiam', onde: 'decisao.ts:113', obrigatoria: true, nota: 'sem ela nada é adiável: falha de infra viraria reprovação' },
  { chave: 'politica_retry.por_causa', onde: 'decisao.ts:277', obrigatoria: true },
  { chave: 'cooldown_minutes', onde: 'lib.sh:572', obrigatoria: false, nota: 'default 60 no código' },
  { chave: 'worktrees_prefixo', onde: 'lib.sh:498, decisao.ts:363', obrigatoria: true, nota: 'prefixo diferente por repo é o que impede colisão de worktree' },
  { chave: 'restricao_execucao', onde: 'decisao.ts:71, executor.sh:156', obrigatoria: false, nota: 'inativa quando ausente' },
  { chave: 'sql_pendente_dir', onde: 'enforcement-core.ts:128, executor.sh:359', obrigatoria: false, nota: 'só importa em repo com banco' },
  { chave: 'preflight_probe', onde: 'executor.sh:146', obrigatoria: false, nota: 'false faz o executor sair cedo da sondagem' },
  { chave: 'preflight_env_keys', onde: 'executor.sh:123', obrigatoria: false, nota: 'lista pode ser vazia; repo sem serviço externo não tem nenhuma' },
  { chave: 'commit_checkpoint.quando', onde: 'executor.sh:383', obrigatoria: false, nota: 'texto de prompt' },
  { chave: 'commit_checkpoint._regra', onde: 'executor.sh:384', obrigatoria: false, nota: 'texto de prompt' },
  { chave: 'executor.trailer_commit', onde: 'executor.sh:388, local-loop.sh:95', obrigatoria: true, nota: 'o trailer do merge commit; sem ele o relatório perde o vínculo com o ticket' },
  { chave: 'decisoes_file', onde: 'lib.sh:723', obrigatoria: true },
  { chave: 'canal_notificacao', onde: 'lib.sh:820', obrigatoria: false, nota: 'qualquer valor != notificacao_nativa cai no arquivo' },

  // --- juiz -----------------------------------------------------------------
  { chave: 'juiz.paths_alto_risco', onde: 'juiz.ts:64', obrigatoria: true, nota: 'pode ser lista VAZIA; o que não pode é a chave sumir' },
  { chave: 'juiz.palavras_alto_risco', onde: 'juiz.ts:67', obrigatoria: true },
  { chave: 'juiz.diff_max_baixo', onde: 'juiz.ts:69', obrigatoria: true },
  { chave: 'modelos.juiz_alto', onde: 'juiz.ts:76', obrigatoria: true },
  { chave: 'modelos.juiz_baixo', onde: 'juiz.ts:76', obrigatoria: true },

  // --- gate de ticket -------------------------------------------------------
  { chave: 'gate_ticket.cmd_prefixos_permitidos', onde: 'gate-ticket.ts:275', obrigatoria: true, nota: 'lista vazia reprova TODO critério com cmd' },
  { chave: 'gate_ticket.proibido_no_cmd', onde: 'gate-ticket.ts:281', obrigatoria: true },

  // --- enforcement B/C/D (peça K11a-1) --------------------------------------
  // Todas OPCIONAIS, e é o desenho: ausente = regra desligada. O CI não tem
  // nenhuma delas e o enforcement dele sai byte a byte igual.
  { chave: 'migrations.dir', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: 'liga a regra B; sem ele nenhum .sql é cobrado por faixa. NÃO cai no migrations_dir de topo de propósito' },
  { chave: 'migrations.faixa', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: '[min,max] ou "0250-0299"; no Actus é migrations_faixa_loop' },
  { chave: 'migrations.faixas_reservadas', onde: 'enforcement-core.ts:273', obrigatoria: false, nota: 'faixas de OUTRO dono (no Actus, 0200-0249 é da Agência)' },
  { chave: 'zona_proibida.schemas_permitidos', onde: 'enforcement-core.ts:392', obrigatoria: false, nota: 'ausente = sem restrição por schema; presente = tudo fora dele reprova' },
  { chave: 'zona_proibida.tabelas_permitidas', onde: 'enforcement-core.ts:392', obrigatoria: false, nota: 'exceções nomeadas a schemas_permitidos' },
  { chave: 'zona_proibida.colunas_congeladas', onde: 'enforcement-core.ts:426', obrigatoria: false, nota: 'globs; no Actus é no_write_columns' },
  { chave: 'zona_proibida.colunas_sombra', onde: 'enforcement-core.ts:426', obrigatoria: false, nota: 'globs que VENCEM as congeladas — a saída declarada (etapa_v2_*)' },

  // --- agendamento (peça K6c) -----------------------------------------------
  { chave: 'launchd.label', onde: 'instalar-launchd.sh:47', obrigatoria: true, nota: 'NÃO tem default: o instalador RECUSA sem ele. Um label por repo — dois repos com o mesmo label são o MESMO job para o launchd' },
  { chave: 'launchd.start_interval', onde: 'instalar-launchd.sh:59', obrigatoria: false, nota: 'ausente vira 1800, o valor medido em 06/set/2026' },
]

/** Só as obrigatórias, na ordem em que foram levantadas. */
export const CHAVES_OBRIGATORIAS = CHAVES_CONFIG.filter((c) => c.obrigatoria)
