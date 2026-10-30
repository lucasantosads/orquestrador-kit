# Saída do n8n no dashboard comercial: orientação para a sessão do repo dashboard-comercial

Escrito em 20/10/2026 pela sessão do Comarka OS, a pedido do Lucas. Plano completo (contexto, custos, riscos): projeto "Comarka Operacional", doc claude/plano-saida-n8n-v2-20out.md. Este arquivo é o recorte que cabe a este repo.

## 1. Decisões já tomadas pelo Lucas

- "Cada um no seu": os substitutos dos fluxos do n8n que gravam número do comercial da Comarka moram NESTE repo (dashboard-comercial). O Comarka OS não grava nas tabelas comerciais.
- Objetivo: cancelar o n8n (~R$400/mês) sem perder lead, sem mexer em número consolidado, aguentando todo o volume, com alerta de qualquer falha.
- Já desligados no n8n em 20/10 (sem uso): GHL Funnel, Salva post, My workflow 4 (Stories do Instagram), Detect Ad Changes, Evaluate Past Actions. Não substituir.
- Destinatários de alerta: o Lucas quer configurar ele mesmo, numa tela, quem recebe cada tipo de alerta, podendo adicionar e remover pessoas.
- Regra do repo continua: nenhuma sessão faz push no main nem deploy; push e deploy são do Lucas.

## 2. Os 6 fluxos a substituir

As exportações JSON dos fluxos (lógica completa nó a nó) ficam em ~/n8n-export-20out/ (o Lucas exporta pela interface do n8n; NUNCA commitar esses arquivos nem colar trechos com token). Leia o JSON antes de escrever cada spec: copiar regra e mapeamento sem "melhorar".

| Fluxo no n8n | Gatilho | Volume | Grava em | Sombra para trocar |
|---|---|---|---|---|
| GHL → Dashboard CRM v2 (etapaMap completo + ghl_created_at) | webhook GHL, URL /webhook/ghl-crm-webhook, sem autenticação hoje | ~20 a 30/dia; pico 190 eventos/min (02/10); o GHL entrega cada evento 2x | leads_crm, leads_crm_historico, sistema_auditoria (alertas) | 14 dias seguidos iguais, com pelo menos 1 dia de 30+ eventos |
| Comarka · Diagnóstico Comercial → GHL | webhook do formulário adscomarka.com/comarka-analise | ~4 a 8/dia; tem espera de 15 min | GHL Comarka Ads (contato, tags, campos, oportunidade no SDR em PRÉ-MQL/MQL/SUPER MQL), WhatsApp do closer | 14 dias e 50 leads |
| Meta Ads → Dashboard (Sync 30min) [roda a cada 2h] | agenda | 12/dia, ~483 anúncios por rodada, hoje 1 POST por anúncio | ads_metadata, ads_performance | 7 dias, diferença zero nas contagens de D-2 em diante |
| GHL Comprou → Contrato Rascunho | webhook GHL (etapa comprou) | ~1/dia | contratos | 14 dias e 5 compras |
| Webinar · Sync diário → CRMs | agenda 07h; segunda 08h envia pendentes ao SDR > WEBINAR (dono Davi) | 1 a 2/dia | webinar_inscritos, webinar_cliques_grupo, webinar_diagnosticos; GHL "WEBINAR - CMK" | 7 dias incluindo uma segunda |
| Meta Lead Ads → Supabase Enrich | webhook leadgen da Meta | último lead gravado 25/09 | meta_form_leads, leads_crm | só se o Lucas confirmar que ainda roda formulário instantâneo; senão desliga sem substituto |

O CRM v2 já espelha src/lib/crm/regra-pipeline-lead.ts deste repo (regra de lead de 06/10, trava de INSERT de 15/10: exclusoes_lead_ghl e meses_fechados_leads com falha fechada). Reaproveite essa lib; não duplique a regra.

[GLOBAL] Error Handler: não ganha substituto; os alertas da seção 4 o substituem. Sai por último.

## 3. Padrão obrigatório para todo substituto (fluxo sem as 7 peças não troca)

1. Caixa de entrada durável: rota de webhook valida segredo (falha fechada sem a variável de ambiente), grava o evento cru numa tabela de entrada com chave de idempotência (id do evento ou hash do corpo + origem, índice único) e responde 200 em menos de 1 s. Processar vem depois.
2. Fila com nova tentativa: processamento imediato após gravar e varredura a cada 5 min (cron Vercel) do que ficou. Esperas 1, 5, 15, 60, 240 min (5 tentativas). Esgotou: status falhou e alerta. Reserva com lease e SKIP LOCKED (modelo: ops_jobs e fn_ops_job_claim do Comarka OS, mesmo Supabase; aqui em tabelas próprias deste repo).
3. Lote: Meta Ads grava 1 upsert por rodada (chaves ad_id e ad_id,data_ref, iguais às do n8n).
4. Registro de execução: toda rodada agendada grava início, fim, duração, resultado e erro numa tabela de execuções; agenda x execução conferida de hora em hora (alerta de silêncio).
5. Sombra antes, corte depois: variável SOMBRA_<FLUXO> nasce LIGADA (sem a variável = sombra). Em sombra grava só em tabela sombra_* e registra a comparação em ops_sombra_comparacao (tabela do OS, já aplicada: uma linha por fluxo, dia, métrica; valor_atual lido do destino real; on conflict do nothing). O veredito e o aviso diário de sombra já existem no OS (fn_sombra_veredito, cron sombra-diferenca). Gravação real só com SOMBRA_<FLUXO>=desligada, que o Lucas troca no corte, no mesmo minuto em que desliga o fluxo no n8n.
6. Reconciliação diária depois da troca: GHL (oportunidades alteradas ontem) x leads_crm; Meta (gasto, resultados por dia) x ads_performance. Diferença diferente de zero vira alerta e, quando seguro, reprocesso.
7. Proteções do consolidado: mês em meses_fechados_leads nunca recebe escrita; nenhum delete nas tabelas comerciais; nenhum DDL em leads_crm*, ads_metadata, ads_performance, clientes_receita, trafego_*, vw_*; tabelas novas (entrada, fila, execuções, sombra_*, alertas) com RLS ligada, sem policy, revoke de anon e authenticated. Migration: só o .sql versionado; aplicar é do Lucas.

Teste obrigatório antes de cada troca: 500 eventos sintéticos em 1 minuto na sombra; 500 gravados, 0 perdidos, 0 duplicados. Teste de evento duplicado (2 entregas em 10 ms) gerando 1 histórico só.

## 4. Alertas com destinatários configuráveis

Tabela de destinatários: tipo de alerta (lista fixa abaixo), pessoa (nome, telefone WhatsApp no formato 55DDDNUMERO), canal (whatsapp; email opcional), ativo. Tela só para admin neste repo: listar por tipo, adicionar, remover, ativar/desativar, botão "enviar teste". Sem destinatário ativo num tipo: o alerta vai para o Lucas e a tela mostra o tipo em vermelho (nunca alerta mudo). Começa vazia; o Lucas preenche.

Tipos de alerta (enum):
- lead_diagnostico_nao_entrou: lead gravado na entrada mas não criado no GHL após as tentativas. Mensagem com nome e telefone do lead para atender na mão. Prazo: até 5 min.
- formulario_sem_lead: 0 envios do formulário em 24h úteis.
- crm_v2_falhou: evento do GHL falhou após as tentativas.
- crm_v2_silencio: 0 evento do GHL em 4h úteis.
- crm_divergencia: reconciliação GHL x leads_crm diferente de zero.
- meta_ads_parou: nenhuma rodada ok em 2h30.
- meta_ads_divergencia: reconciliação Meta x ads_performance diferente de zero.
- contrato_rascunho_falhou: comprou no GHL sem rascunho após as tentativas.
- webinar_nao_sincronizou: não rodou até 07h30 ou falhou.
- fila_acumulando: mais de 50 pendentes ou pendente há mais de 30 min.
- webhook_segredo_invalido: chamadas repetidas com segredo errado.
- resumo_diario: dia útil 08h, verde/vermelho por fluxo, volume do dia anterior, falhas abertas.

Regras: um aviso por ocorrência e outro quando normaliza; envio pelo WhatsApp (Evolution, mesma instância já usada pela Comarka) e registro de cada aviso enviado (para auditoria e para não repetir). Falha no envio do alerta também é registrada e tentada de novo.

## 5. Carga e custo

- Meta de projeto: 1.000 eventos/min sem perda (pico real 190/min). Entrada = 1 insert por evento.
- Custo estimado na Vercel Pro: menos de US$1/mês (varredura de 5 em 5 min ~8.640 invocações, webhooks ~1.500, Meta 360 rodadas). Supabase e WhatsApp sem custo extra. Confirmar que este projeto Vercel está no Pro (crons a cada 5 min não rodam no Hobby).

## 6. Ordem

- Fase 1 (infra comum): tabelas de entrada, fila, execuções, destinatários e avisos (.sql proposto); rota genérica de webhook com segredo e idempotência; worker de varredura; motor de alertas da seção 4; tela de destinatários; tela "Saúde das integrações" (estado de cada fluxo, última execução, fila, falhas com botão reprocessar); harness de teste de carga.
- Fase 2: Contrato Rascunho em sombra. Meta Lead Enrich só se confirmado.
- Fase 3 (paralelo): Webinar e Meta Ads em sombra.
- Fase 4 (paralelo): Diagnóstico Comercial e CRM v2 em sombra (no GHL, segunda ação de webhook apontando para a rota nova; formulário posta nos dois endereços durante a sombra; na sombra do Diagnóstico NÃO enviar ao GHL, CAPI nem WhatsApp: só registrar o que seria enviado).
- Fase 5: corte de cada fluxo pelo Lucas com veredito pode_trocar; 7 dias de sombra inversa; Error Handler desligado; rotação de credenciais; cancelamento do n8n.

## 7. O que a sessão deste repo entrega primeiro

1. Ler este arquivo, o JSON exportado de cada fluxo em ~/n8n-export-20out/ e src/lib/crm/regra-pipeline-lead.ts.
2. Escrever docs/recon/n8n-fluxos/<fluxo>.md por fluxo (gatilho, campos de entrada, regras, mapeamento, saídas, efeitos externos), sem nenhum token ou chave.
3. Escrever os tickets da Fase 1 no formato da fila deste repo, com critérios executáveis, e parar para o Lucas revisar antes de rodar.
4. Perguntas que dependem do Lucas: listar no fim, nunca assumir (ex.: Meta Lead Ads ainda roda?).
