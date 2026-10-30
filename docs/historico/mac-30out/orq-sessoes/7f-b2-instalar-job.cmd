# Instalação do job do resolvedor (com.orq.resolvedor, a cada 300 s) — o HUMANO roda (NÃO rodada pela sessão).
# Rodar só depois do merge da kit/etapa7f2 na main e de a primeira passada em --dry-run sair como esperado
# (7f-b2-primeira-passada.cmd). O plist aponta para o checkout principal do kit.
# Ver antes o que vai ser instalado:   cd ~/Projetos/orquestrador-kit && bash scripts/orquestrador/resolvedor/instalar-job.sh --dry-run
# Parar sem desinstalar:               touch ~/.orq/RESOLVEDOR_PAUSADO
# Desinstalar:                         launchctl bootout gui/$(id -u)/com.orq.resolvedor && rm -f ~/Library/LaunchAgents/com.orq.resolvedor.plist
cd ~/Projetos/orquestrador-kit && bash scripts/orquestrador/resolvedor/instalar-job.sh; echo "rc=$?"
