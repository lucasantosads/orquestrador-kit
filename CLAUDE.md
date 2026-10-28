# orquestrador-kit

## Dono do motor

Código de motor é `scripts/`, `test/`, `instalar.sh` e `doutrina/`. Ele só entra no kit
por etapa do chat do projeto Orquestrador, com as três condições:

- **worktree** própria para a etapa (nunca direto no checkout principal);
- **vermelho antes**: o teste que prova a mudança falha contra o motor anterior, e o
  relatório da etapa mostra a falha;
- **merge humano** na `main`: a sessão não faz merge nem push.

Outras frentes (sessões de um repo instalado, como comarka-operacional, actus-saas ou
conteudos-infinitos) podem commitar no kit **só docs**, e só em:

- `docs/migracao-comarka.md`;
- `docs/defeitos/`.

Defeito de motor achado num repo instalado não é consertado pela frente que o achou:
vira um registro em `docs/defeitos/AAAA-MM-DD-<slug>.md` (o que aconteceu, trilha real,
pedido e critério executável), e o conserto entra por etapa, pelas regras acima.

## Fila de melhorias

Antes de planejar ou executar qualquer etapa do kit, leia `docs/MELHORIAS.md`: é a fila
única de melhorias do motor, e só o git é fonte. A etapa cita os IDs (M-NN) que implementa
e, no último commit, muda o status de cada um para "feito (etapa X)" ou "parcial (etapa X)".
