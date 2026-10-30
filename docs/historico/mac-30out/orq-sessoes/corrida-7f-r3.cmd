# Mini-corrida PAGA da 7f-b1b (NÃO rodada pela sessão). Rodar só depois do merge da 7f-b1b na main.
# Casos: os 5 R3 da medição (01-559, 08-635, 19-739, 24-867, 29-826) + os 6 cortados no teto da peça 6
# (08-635, 14-407a, 25-711a, 28-707, 29-826, 33-707) = 9 casos, com o prompt proposto 7f-b1b-r3.
# Teto próprio: US$ 5,40 no dia (9 x 0,60, o corte do CLI por caso); o triador não chama se o pior caso passar disso.
# Saída e ledger num diretório novo: ~/.orq/corrida-7f-peca6/ não é tocado.
cd ~/Projetos/orquestrador-kit && ORQ_DIAG_DIR=~/.orq/corrida-7f-r3 ORQ_TRIADOR_TETO_DIA=5.40 ORQ_TRIADOR_PROMPT=7f-b1b-r3 bash scripts/orq triar --fixture test/fixtures/triador-7f --casos 01-559-L55054,08-635-L58105,14-407a-L67585,19-739-L71699,24-867-L76790,25-711a-L78138,28-707-L79202,29-826-L80362,33-707-L83026 > ~/orq-sessoes/corrida-7f-r3.txt 2>&1; echo "rc=$?"
