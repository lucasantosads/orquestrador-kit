#!/usr/bin/env bash
# vendorizado.sh — a LISTA dos testes de harness que viajam com o motor (K8d).
#
# Só define variáveis. É sourceado por `instalar.sh` (que compara e copia) e por
# `scripts/kit/fixture.sh` (que instancia o repo de fixture). Mora num arquivo
# só porque o kit já pagou por duas listas iguais em dois lugares: até a peça
# K8c, o `--atualizar` ESCREVIA em `scripts/roadmap/` e a recusa por árvore suja
# não olhava para lá — as duas listas tinham divergido no primeiro caminho que
# alguém acrescentou. Aqui elas não podem divergir: são a mesma.
#
# ─── DECISÃO ────────────────────────────────────────────────────────────────
# Teste de harness é do KIT: quem muda o motor muda o teste dele aqui, e a
# instalação leva os dois juntos. O repo instalado não escreve teste de harness.
# Teste do PRODUTO (o que só existe no repo) não é tocado nem listado — por isso
# a lista é ENUMERADA, arquivo a arquivo, e nunca um glob sobre `test/`.
#
# ─── POR QUE A LISTA É CURTA (medido, não escolhido) ────────────────────────
# Confrontando o kit com ~/Projetos/conteudos-infinitos (o CI), dos 26
# `test/orquestrador-*.test.ts` + `orq-cli.test.ts` do kit:
#
#   17 DIFEREM da versão do CI, e a diferença de todos é da mesma família: nas
#      peças K3/K7b eles foram RE-APONTADOS para fixtures do kit (`FX_CHECKOUT`
#      no lugar de `REPO_ROOT/docs/fila`, `test/fixtures/checkout/...` no lugar
#      do config do repo). Instalar essa versão trocaria "o teste falha quando O
#      MEU config muda de forma incompatível" por "o teste passa contra uma
#      cópia congelada do config do kit" — o harness do CI traz essa frase como
#      comentário, e ela é a razão de o arquivo ser como é lá. Regressão
#      silenciosa de valor de teste é pior que teste ausente.
#
#    2 são BYTE-IDÊNTICOS ao do CI e ainda assim NÃO viajam, porque hardcodam
#      valores do CI e falham em qualquer outro repo — medido dentro do fixture
#      instanciado: `orq-cli.test.ts:205,237` cobra `US$ 50` (o `usd_dia` do CI;
#      o fixture tem 5) e `orquestrador-observabilidade.test.ts:216-217` cobra
#      os gates `typecheck_root`/`typecheck_web` (os nomes do CI — justamente os
#      que a peça K6b tirou do motor). São achados da etapa 4, com peça própria.
#
#    3 são do KIT e só rodam no kit: `orquestrador-launchd-config.test.ts`
#      (precisa de `scripts/kit/fixture.sh` e de `test/fixtures/bin/`, que o repo
#      instalado não tem), `orquestrador-trilha-gate-papel.test.ts` (lê
#      `_referencia-ci/` e `fixture/`) e `kit-e2e-evidencia.test.ts`.
#
# PORTE DO ACTUS (branch porte-actus, 24/09/2026; lista aprovada pelo Lucas):
# mais 13, os testes do que o Actus pagou com incidente (§11 do CONTRATO). Eles
# leem o config do REPO (configDeReferencia prefere o do repo), que é o valor
# deles: falham quando O config do repo não tem o que o motor espera. Três deles
# (criterio-merito, ambiente-merito, teto-adiamento-ambiente) exigem a 8ª causa
# de adiamento, e o arquivo-solto a regra arquivo_solto: as duas chegam ao repo
# pelo --migrar (ITENS_NOVOS e NOVAS da config-tabela.ts). O fixture do kit
# (fixture/docs/fila/000-config.json) já as traz, como um repo migrado.
#
# Sobram os 6 abaixo, mais os 13 do porte. O critério não é opinião: cada um roda VERDE dentro do
# repo de fixture instanciado, que é um repo instalado de verdade, com config
# próprio e diferente do CI. É esse o teste de portabilidade, e o caso (h) de
# `scripts/kit/test-instalar.sh` o repete a cada execução.
TESTES_HARNESS='
test/fixtures/orq-harness.ts
test/orquestrador-morte-por-sinal.test.ts
test/orquestrador-pacotes.test.ts
test/orquestrador-prefixo-aspas.test.ts
test/orquestrador-prompt-como-rodar.test.ts
test/orquestrador-reparo-trilha.test.ts
test/orquestrador-trilha-uma-linha.test.ts
test/orquestrador-gate-grep-q.test.ts
test/orquestrador-gate-vitest-aviso.test.ts
test/orquestrador-contexto-juiz.test.ts
test/orquestrador-retry-feedback-juiz.test.ts
test/orquestrador-gates-fonte-unica.test.ts
test/orquestrador-base-vermelha.test.ts
test/orquestrador-fila-json-quebrado.test.ts
test/orquestrador-arquivo-solto.test.ts
test/orquestrador-contexto-juiz-fixtures.test.ts
test/orquestrador-gate-regex-exemplos.test.ts
test/orquestrador-criterio-merito.test.ts
test/orquestrador-ambiente-merito.test.ts
test/orquestrador-teto-adiamento-ambiente.test.ts
'

# As fixtures de DADOS que esses testes leem, uma a uma. Não `test/fixtures/**`:
# `bin/` (o stub de launchctl da K6e) e `checkout/` (o checkout de papel do kit)
# são do kit e um glob os arrastaria junto. Cada linha saiu de um `readFileSync`
# no arquivo de teste correspondente.
FIXTURES_HARNESS='
test/fixtures/criterios/lote8-246-250.json
test/fixtures/trilha/events-quebrado.log
test/fixtures/trilha/permissao-negada-234.cmd
test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md
test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md
test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md
test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt
'
