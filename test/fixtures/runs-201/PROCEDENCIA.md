# Procedência destes fixtures

Evidência REAL, não inventada. Quatro arquivos vieram de `docs/fila/runs/201/`
no checkout principal — as três tentativas do ticket 201, que reprovou 2× por
colisão de teste em 2026-09-02 (PLAYBOOK). Copiados byte a byte:

| arquivo | origem | o que prova |
|---|---|---|
| `attempt-1.enforcement.json` | `runs/201/attempt-1/enforcement.json` | a tentativa que ficou 887p/0f e caiu em `fora_do_pathspec` |
| `attempt-2.gates.txt` | `runs/201/attempt-2/gates.txt` | a tentativa que respeitou a fronteira e ficou 861p/**1f** |
| `attempt-0.gates.txt` | `runs/201/attempt-0/gates.txt` | gates TODOS verdes, com critério vermelho |
| `attempt-0.criterios.txt` | `runs/201/attempt-0/criterios.txt` | `espera: 0`, `saida: 1` no critério do checkbox |

**`vitest-falha.saida.txt` é diferente e por um motivo que importa:** a saída
bruta do gate de testes do 201 **não existe**. O `gates.txt` daquela época
guardava só o placar (`FALHA testes_por_pacote ... [8 pacotes, 861p/1f]`), sem
uma linha sequer dizendo QUAL arquivo quebrou — que é exatamente o buraco que a
peça 2 fecha. Então esta saída foi **capturada agora**, nesta máquina, rodando
`npx vitest run` (2.1.9, `services/persona-roteirizador`) contra um teste que
reproduz a asserção do caso real do 201 (`sem compliance: grava roteiro,
entrega direto, legenda sanitizada`, afirmando `aplicado === false`). O arquivo
de teste foi removido logo depois; o que ficou é a saída, com os escapes ANSI
como o runner os emite.

Consequência para quem lê os testes: `attempt-2.gates.txt` prova o buraco
ANTIGO (nome de arquivo nenhum, `fora_da_allowlist` vazio) e o gates.txt com
recorte, montado a partir de `vitest-falha.saida.txt`, prova o comportamento
NOVO. Os dois no mesmo arquivo de teste, de propósito.
