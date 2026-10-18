# p5: o que o loop escreveria depois de uma ação r1_multi (7f-b7, peça 5)

Não há, no Comarka, bloqueio real de um ticket reaberto pelo R1 com vários
testes: a peça 1 desta etapa é que cria essa ação. O cenário parte do 1054 e do
1055b reais (`../casos`, `../gabarito`): depois da ação, o loop roda o ticket
reaberto e o bloqueia de novo, gravando só `status` e `notas_status`.

`notas.json` tem a nota que o motor do Comarka grava, no formato real:

- o prefixo é o do `executor.sh` do Comarka: `motivo repetido: provável defeito
  de spec/harness, não do código — <motivo>` (circuit breaker, `:796`) ou
  `reprovado apos 2 retries: <motivo>` (retries esgotados, `:817`);
- `limite`: o motivo de reprova por limite de linhas é o real do log
  (`criterio[3] mecânico: esperado 'NO_TETO', obteve 'ESTOUROU_<n>'`, linhas
  85646 e 90092 do local-loop.log, 963 e 994c). O `criterio[3]` é o NO_TETO do
  1054 e do 1055b. **O `<n>` é hipotético**: entre o teto do ticket e o teto que
  o humano pôs no resgate real (1054: 720 → 760, n = 735; 1055b: 640 → 700,
  n = 668);
- `ruim`: a nota real do bloqueio de 13/10 de cada um (o gabarito `antes.md`),
  um desfecho ruim que não é limite.
