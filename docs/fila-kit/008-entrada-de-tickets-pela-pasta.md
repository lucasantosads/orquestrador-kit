# Ticket 008 (COLHEITA): pasta de entrada de tickets da fila

## Objetivo (prosa)

Decisão do Lucas em 14/11/2026: tickets escritos por rotina (colheita semanal de todos os projetos, planejador) não podem depender de comando dele para entrar na fila. A tarefa agendada que roda no Mac não consegue commitar (o sandbox não deixa o git apagar os próprios arquivos de trava), e arquivo solto no checkout principal faz a drenagem adiar por árvore suja. Então quem commita é o próprio loop, que já commita o status da fila: ele recebe os tickets por uma pasta de entrada fora do repo, passa cada um pelo gate de ticket e só então põe na fila. Depende do 004 só para não disputar o local-loop.sh no mesmo ciclo.

Recon feito pelo chat do projeto Orquestrador em 14/11/2026 contra a main a3a90d1.

## Campos de máquina

```json
{
  "id": "008",
  "frente": "COLHEITA",
  "slug": "entrada-de-tickets-pela-pasta",
  "origem": "humano",
  "objetivo": "Em scripts/orquestrador/local-loop.sh, no começo de cada drenagem e antes da seleção de tickets, leia a pasta de entrada da fila: a variável ORQ_ENTRADA_DIR quando existir, senão $HOME/orq-sessoes/entrada/<nome da pasta do repo>-<nome da pasta da fila> (no kit: orquestrador-kit-fila-kit; no Comarka: comarka-operacional-fila). Pasta ausente ou vazia não muda nada. Com a pausa da fila ativa, não leia a pasta. Para cada arquivo .md da pasta, em ordem de nome: recuse se o id do bloco JSON já existir na fila ou numa fila irmã; rode sobre ele o mesmo gate de ticket que o orq validar usa e recuse se houver violação de severidade erro; aceito, mova o arquivo para a pasta da fila. Recusado, mova para <entrada>/recusados/ e grave ao lado <arquivo>.motivo.txt com o motivo legível. Depois do lote, se algum entrou, commite no checkout principal só os arquivos que entraram, por pathspec explícito, com a mensagem 'fila: entrada <ids>' e o trailer 'Orq-Entrada: pasta de entrada', do mesmo jeito do autocommit de status da fila (mesma branch, mesma espera do git). Registre um evento por arquivo na trilha: ENTRADA_ACEITA ou ENTRADA_RECUSADA com o motivo. Nunca apague arquivo, nunca edite arquivo que já está na fila, nunca faça push. Crie test/orquestrador-entrada-tickets.test.ts que, num repo de fixture, cobre: ticket bom entra e fica commitado com o trailer; id repetido e ticket com violação de erro vão para recusados com motivo e nada é commitado; pausa ativa não lê a pasta; pasta ausente não muda nada. Documente a pasta de entrada numa seção nova do docs/CONTRATO.md.",
  "pathspec_allowlist": [
    "scripts/orquestrador/local-loop.sh",
    "test/orquestrador-entrada-tickets.test.ts",
    "docs/CONTRATO.md"
  ],
  "cria_novo": [
    "test/orquestrador-entrada-tickets.test.ts"
  ],
  "recon": [
    {
      "descricao": "o local-loop tem o autocommit da fila que a entrada imita",
      "cmd": "grep -c 'autocommit' scripts/orquestrador/local-loop.sh",
      "espera": "^[1-9][0-9]*$"
    }
  ],
  "dependencias": [
    "004"
  ],
  "diff_estimado": 220,
  "criterios_aceite": [
    {
      "tipo": "alvo",
      "descricao": "o teste da pasta de entrada passa",
      "cmd": "env -u ORQ_CONFIG -u ORQ_GATE TZ=UTC node_modules/.bin/vitest run test/orquestrador-entrada-tickets.test.ts >/dev/null 2>&1 && echo OK",
      "espera": "OK"
    },
    {
      "tipo": "avaliador",
      "descricao": "avaliador: o gate usado é o mesmo do orq validar, sem cópia de regra; o commit leva só os arquivos que entraram; recusado nunca entra na fila nem é apagado; pausa respeitada; o teste cobre os quatro casos do objetivo; o CONTRATO documenta o caminho padrão e a variável.",
      "cmd": "true",
      "espera": "avaliador"
    }
  ],
  "status": "obsoleto",
  "notas_status": "superado pela etapa 2.2.0 (P1): a entrada autônoma de tickets é o planejador; entrada por pasta fica fora (status anterior: pendente)",
  "tentativas": 0
}
```
