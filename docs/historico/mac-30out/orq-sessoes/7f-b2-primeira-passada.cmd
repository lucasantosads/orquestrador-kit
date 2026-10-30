# Primeira passada REAL do resolvedor no comarka-operacional, em --dry-run (NÃO rodada pela sessão).
# Rodar só depois do merge da kit/etapa7f2 na main, do checkout principal do kit.
# Antes, no ~/.orq/repos.json, o item do comarka-operacional ganha o campo da decisão do chat do programa
# (sem ele o repo fica em "diagnostico" e o dry-run só mostra a triagem):
#   { "caminho": "/Users/lucasantos/Projetos/comarka-operacional",
#     "resolvedor": { "padrao": "diagnostico", "R1": "auto", "R5": "auto", "R2": "sombra" } }
# --dry-run: não escreve no Comarka, não chama modelo, não toca o ledger nem grava proposta; o que faria
# (com o diff) vai para ~/.orq/resolvedor/dry-run.jsonl e para a saída. A triagem grava diagnósticos em
# ~/.orq/diagnosticos, como o `orq triar`.
cd ~/Projetos/orquestrador-kit && bash scripts/orq resolver --repo comarka-operacional --dry-run > ~/orq-sessoes/7f-b2-primeira-passada.txt 2>&1; echo "rc=$?"
