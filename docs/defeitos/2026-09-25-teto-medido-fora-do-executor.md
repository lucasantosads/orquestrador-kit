# Defeito para o orquestrador-kit: guarda de teto com número medido fora do executor trava a si mesma

Origem: comarka-operacional, ticket 627 (guarda global de travessão mudo), 25/09.

## O que acontece

Um ticket de guarda de teto (teste que conta ocorrências de um padrão e falha acima de `const TETO = N`) foi escrito com N medido NA AUTORIA, por um script ad hoc do autor. O ticket prescrevia ao executor um contador próprio (regex e remoção de comentários descritas no objetivo) e, ao mesmo tempo:

- fixava `TETO = 273` no objetivo;
- tinha critério `[ "$t" -le 273 ]`;
- mandava "se a contagem medida for MAIOR, PARE e descreva".

O contador do executor, fiel ao ticket, mediu 278 no mesmo `src/` (diff vazio entre o sha da medição e o HEAD). A diferença de 5 vinha só da implementação da remoção de comentários do script de autoria. Resultado: com TETO=273 a guarda fica vermelha e derruba o gate vitest; com TETO=278 o critério reprova. Nenhuma tentativa pode passar. O circuit breaker bloqueou com "motivo repetido: provável defeito de spec/harness", e dessa vez o rótulo estava certo.

## Trilha real

- `docs/fila/runs/627/meta.json`: 2 tentativas reprovadas (14:36Z, 14:38Z), `diff_lines: 0` (o executor parou sem commitar, como o ticket mandava).
- `docs/fila/runs/627/attempt-2/gate-vitest.txt`: 1 failed / 5757 passed, `travessao mudo: 278 ocorrencias, teto 273`.
- `docs/fila/runs/627/attempt-2/claude-output.txt`: o executor confirma `git diff --stat 2f58e67 HEAD -- src` vazio e pede decisão humana.
- Precedente do mesmo formato no repo: `test/fetch-json-teto.test.ts`.

## Regra de doutrina pedida

Para `doutrina/templates/TICKET.md` (seção de critérios) e `doutrina/references/higiene-de-execucao.md`:

> Guarda de teto congela o estado atual. O número do teto é medido PELO EXECUTOR, no HEAD do worktree, com o contador que o próprio teste implementa. O ticket nunca fixa o número nem o usa como limite em critério. O autor pode citar a medição de autoria como estimativa na prosa ("cerca de N"), nunca como alvo. Critério correto: o it da guarda verde com TETO igual à contagem (sem folga) e TETO dentro de uma faixa de sanidade larga. Tickets que baixam o teto depois usam critério relativo (TETO novo <= TETO anterior - removidos), nunca absoluto.

## Check pedido no gate-ticket (`scripts/orquestrador/gate-ticket.ts`)

Aviso (não erro) quando:
1. o objetivo ou um `cria_novo` fala em `TETO` / "teto" E
2. algum `criterios_aceite[].cmd` compara um número literal com `-le`, `-lt`, `-eq`, `toBeLessThanOrEqual(<literal>)` ou `= <literal>` sobre esse teto, OU o objetivo contém "se for MAIOR, PARE" / "se medir mais".

Mensagem: "guarda de teto com número fixado na autoria: o executor deve medir o teto com o contador do teste (ver defeitos/2026-09-25-teto-medido-fora-do-executor.md)".

## Critério executável

Fixture de ticket com `const TETO = 273` no objetivo e critério `[ "$t" -le 273 ]`: o gate-ticket emite o aviso acima.
Contraprova: o mesmo ticket com o critério "it da guarda verde e TETO entre 250 e 320" e sem número no objetivo não emite o aviso.
Molde: `test/orquestrador-gate-regex-casos.test.ts`.
