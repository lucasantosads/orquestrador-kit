# Runbook da vigia da fila (v2, 18/10/2026)

Lido pela tarefa programada "Vigia da fila". Muda aqui, muda em todas as próximas execuções. Sem número de ticket ou linha de log fixo: tudo sai dos scripts e dos logs na hora.

## Convivência com o resolvedor do kit

O job com.orq.resolvedor roda a cada 5 min e é o dono da correção automática de tickets bloqueados (R1 allowlist, R5 árvore suja, pausa de gate). A vigia observa, registra e só corrige onde o resolvedor não age.

## Pode / não pode

- PODE: ler logs, rodar scripts de leitura, renomear pausa órfã SEM dono, corrigir spec nos casos do passo 4 com commit imediato, escrever no ESTADO-ATUAL.md.
- NÃO PODE: DDL, migration nova, liberar token, push, merge, publicar, promover, ritual de fim de sessão, escrita em zona C0. Isso vira item em "Precisa do Lucas".
- NÃO PODE: afrouxar critério (trocar contagem exata por presença, remover critério, baixar número esperado). Critério que parece exigente demais vira proposta em "Precisa do Lucas".
- NÃO PODE: deixar arquivo modificado sem commit no checkout, nem rodar git sem GIT_OPTIONAL_LOCKS=0.
- O ESTADO-ATUAL.md é doc deste projeto (ferramenta Projects). Nunca criar arquivo ou pasta claude/ dentro do checkout.
- Se o computador do Lucas não responder (Mac dormindo, app fechado): não tentar outro caminho. Registrar "Mac fora do ar às HH:MM" no ESTADO-ATUAL.md e encerrar.

## Passos

Tudo pelo terminal do computador do Lucas, no checkout ~/Projetos/comarka-operacional.

0. **Antes de tudo**
   - export GIT_OPTIONAL_LOCKS=0
   - git status --short: se houver mudança que não é da vigia, não escrever nada no checkout nesta rodada; registrar a lista e seguir só com leitura.

1. **Loops vivos?**
   - ls -la docs/fila/runs/local-loop.log docs/fila/runs/local-loop-apolo.log e tail -40 de cada um.
   - Log parado há mais de 30 min com prontos > 0 = loop parado. Não dá para reiniciar launchd daqui: registrar.
   - Se a última linha repetir "claude CLI não respondeu (rc=1)" ou erro de preflight: registrar e NÃO reabrir tickets.

2. **Pausa órfã?**
   - Ler o conteúdo de docs/fila/.orq-pause e docs/fila/apolo/.orq-pause.
   - Se o conteúdo tiver "dono:" (publicar.sh, promocao-apolo ou outro): NÃO renomear. Registrar dono e idade; passa para "Precisa do Lucas" só se tiver mais de 2 h.
   - Sem dono, mais de 30 min e log correspondente parado: renomear para .orq-pause.orfa-<HHMM> e registrar.

3. **O que roda agora**
   - python3 scripts/roadmap/estado-fila.py e python3 scripts/roadmap/prontos.py (e o equivalente do loop Apolo, se houver).
   - Anotar done, pendentes, bloqueados e prontos de cada loop.

4. **Bloqueados novos**
   - Pular o ticket se: (a) existe commit "orq-resolvedor:" para ele; (b) existe ~/.orq/diagnosticos/comarka-operacional/<id>.json modificado nas últimas 24 h (o resolvedor está cuidando ou decidiu esperar: registrar a classe que ele deu); (c) o ticket está em_execucao; (d) a vigia já corrigiu esse ticket hoje.
   - Para os demais, ler docs/fila/runs/<id>/attempt-*/ (criterios.txt, gate-vitest.txt, avaliador-claude.txt, claude-output.txt).
   - Corrigir só estes casos: teste vizinho que exercita o arquivo e ficou fora da allowlist (entra com a frase "ajustar só para atravessar a mudança, sem afrouxar asserção"); critério comparando com origin/ ou ref antiga em vez da branch local; erro de shell no critério ($(grep -c ...) encadeado com && sem || true, variável não definida), corrigido sem mudar o que ele prova.
   - Critério ambíguo, contagem que parece exigente demais ou spec desatualizada: não reescrever; registrar em "Precisa do Lucas" com a proposta em uma linha.
   - Cada correção: reabrir com "status": "pendente" e "notas_status": ""; se .git/index.lock existir, esperar 30 s até 3 vezes e, se continuar, desfazer a edição e registrar; git add só do arquivo do ticket; git commit -m "vigia: <id> <o que mudou>" -m "Orq-Vigia: <id>"; nunca --no-verify, nunca push. Se o commit falhar, desfazer a edição do arquivo e registrar.
   - Reprova de código real: deixar bloqueado e registrar o motivo em uma linha.
   - rc=130 não é quota até ler claude-output.txt (pode ser handshake de MCP).

5. **Ticket SQL fechado que trava outro**
   - Não aplicar. Listar em "Precisa do Lucas" com o caminho do .sql e o token que ele libera.

6. **Registrar**
   - Sobrescrever claude/ESTADO-ATUAL.md (doc do projeto) mantendo a estrutura dele: atualizar "Atualizado em", contagens, presos e "Precisa do Lucas", com cada correção listada pelo sha do commit. Acrescentar no fim a linha da vigia: "Vigia HH:MM: <o que fez em uma linha>". Manter só as 5 últimas linhas de vigia.
   - Nada mudou desde a última vigia: só acrescentar "Vigia HH:MM: sem mudança" e encerrar.
