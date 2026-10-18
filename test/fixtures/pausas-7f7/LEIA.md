# pausas-7f7

`pausas.jsonl`: as linhas `tipo: pausa` do ledger real do resolvedor
(`~/.orq/resolvedor/ledger.jsonl`, só leitura), copiadas em 18/10/2026 (as de 17 e 18/10 até 04:05:44Z, as da medição do PASSO 0):

- as 17 pausas notificadas em 17 e 18/10 (11 com `dono: publicar.sh`, 4 com
  `dono: promocao-apolo`, 1 `ritual-staging`, 1 do vigia);
- a pausa `dono: publicar.sh | motivo: publicar FALHOU (...) no passo 6/7 push`
  de 15/10.

Campos: `ts` (quando o resolvedor viu a pausa), `repo`, `arquivo`, `sha` e
`motivo` (a 1ª linha do sentinela sem o carimbo), `notificacao` (o que o motor
de então fez: todas `enviada`). O teste da 7f-b7 P3 regrava cada `motivo` como
o conteúdo do sentinela, na ordem e na hora do ledger.

`conteudo` é a 1ª linha do sentinela que o teste grava, porque o ledger guarda o
motivo sem o carimbo `AAAA-MM-DD HH:MM | ` (e é o carimbo que fazia o sha de
duas pausas seguidas com o mesmo motivo mudar):

- `conteudo_origem: local-loop.log (PAUSA ativa)`: a linha real, das linhas
  `run encerrado: PAUSA ativa (<1ª linha>)` do local-loop.log do Comarka (10);
- `reconstruido: carimbo da hora do ledger (-0300)`: o motivo real com o carimbo
  da hora em que o resolvedor viu a pausa (7, sem linha no log);
- `motivo do ledger (sem carimbo)`: o sentinela não tinha carimbo (ritual, vigia).
