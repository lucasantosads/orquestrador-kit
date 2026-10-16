# Defeito: o loop pega ticket que so existe no working tree (sem commit e sem validar-fila)

Origem: comarka-operacional, ticket 1171 (nasceu como 1165 e foi renumerado por colisao de id), 16/10/2026. Fonte: `docs/fila/runs/_arquivo/1171-spec-v1/` daquele repo. Estado: **aberto**. Nenhuma mudanca de motor foi feita nesta nota.

## O que aconteceu

Uma sessao escreveu `docs/fila/1165-meta-token-invalido-alerta.md` direto no checkout principal, com `"status": "pendente"` e `"dependencias": []`. O plano era rodar `validar-fila.py`, preencher `testes_conferidos` e commitar. O loop pegou o ticket antes disso:

| hora (16/10, -03) | fato | evidencia |
|---|---|---|
| ~14:31 | arquivo salvo, nao commitado, `testes_conferidos: []` | `git show df0bfcd:docs/fila/1165-meta-token-invalido-alerta.md` (o commit veio depois) |
| 14:32:46 | executor abre a tentativa 1 | criacao de `runs/_arquivo/1171-spec-v1/attempt-1` |
| 14:35:42 | so entao o ticket entra no git | `git log -1 --date=iso df0bfcd` |
| 14:37 / 14:43 | tentativas 1 e 2 reprovadas no gate vitest, ticket `bloqueado` | `meta.json` da mesma pasta, commit `840d63f` |

As duas tentativas cairam nos mesmos 3 `it` de `test/cron-registro-rotas.test.ts`. O `validar-fila.py` ja apontava esse teste como afetado e fora da allowlist e de `testes_conferidos` (aviso da camada 6). Com o ticket validado antes de ser elegivel, o defeito de spec teria sido pego na bancada, sem gastar duas tentativas nem o bloqueio.

## Causa verificada

No comarka-operacional:

- A fila e lida do **working tree** do checkout principal: `FILA_DIR` sobre `MAIN_CHECKOUT` (`scripts/orquestrador/lib.sh:18-30`), e `ticket_files()` (`lib.sh:88`) e um `find` no disco.
- A selecao tem uma casa so, `selecionar_pendente` (`lib.sh:228`, usada por `proximo_pendente` em `lib.sh:240` e pelos lacos do `local-loop.sh`). Ela exige so `status == "pendente"` e `deps_resolvidas` (`lib.sh:162`). Nada olha o git nem `testes_conferidos`.
- O painel (`scripts/roadmap/prontos.py`) le o mesmo disco via `estado-fila.py ler_fila()` e aplica a mesma regra, de proposito: `scripts/orquestrador/test-drenagem.sh:136-180` falha se painel e loop divergirem ("painel e loop divergiram").

Logo, arquivo salvo e ticket elegivel sao a mesma coisa. O `validar-fila.py` roda no pre-commit, mas o loop nao espera o commit.

Observacao de linhagem: o motor do comarka-operacional nao foi instalado pelo kit (sem `VERSAO`, ver `.claude/rules/motor.md` daquele repo). Os caminhos e linhas acima sao da copia de la. Antes de portar, conferir onde fica a selecao no kit e se ela tem o mesmo formato.

## Comportamento pedido

**Regra de elegibilidade.** Um ticket so e elegivel quando:

1. esta commitado no HEAD do checkout principal: `git -C "$MAIN_CHECKOUT" ls-files --error-unmatch -- <arquivo>` passa;
2. nao tem modificacao no working tree nem no indice em relacao ao HEAD: `git -C "$MAIN_CHECKOUT" diff --quiet HEAD -- <arquivo>` passa;
3. tem a chave `testes_conferidos` no bloco json. Basta a chave presente, com lista vazia valendo: ticket sem teste afetado declara `[]`. Exigir lista nao vazia trancaria esses tickets. No comarka de 16/10, 5 dos 13 pendentes estavam sem a chave preenchida.

Mais o que ja vale hoje: `status == "pendente"` e dependencias resolvidas.

**Mudanca nos dois lugares, no mesmo commit, para nao divergirem:**

- `lib.sh`, em `selecionar_pendente`: depois do teste de status e antes de `deps_resolvidas`, chamar uma funcao nova (por exemplo `ticket_elegivel_git <arquivo>`) com as tres condicoes. Ticket recusado gera uma linha de log com o motivo (`nao commitado`, `modificado no working tree`, `sem testes_conferidos`). Nao filtrar em `ticket_files()`: ela tambem serve `ticket_file_by_id`, e dependencia que aponta para ticket nao commitado tem de continuar sendo achada e dar `dep nao-done`.
- `prontos.py`: aplicar a mesma regra antes de classificar como pronto. O ticket recusado sai numa secao propria, por exemplo `=== NAO ELEGIVEL (fora do git ou sem testes_conferidos): N ===` com o motivo, e nao some calado. `REAL_PRONTOS` passa a contar so os elegiveis. A regra pode morar em `estado-fila.py ler_fila()` como campo `elegivel_git` + `motivo`, para nao virar a terceira leitura.

**Cuidado com o writeback do proprio loop.** O loop escreve `status` e `notas_status` no working tree e commita depois (`autocommit_status_fila`). Um ticket devolvido a `pendente` por cooldown ou adiamento fica modificado ate esse commit e, pela regra 2 crua, deixaria de ser elegivel. Escolher uma das duas saidas e documentar: (a) o autocommit roda antes de cada selecao; ou (b) a regra 2 ignora diff que so muda `status` e `notas_status`, com o mesmo criterio de `so_status_staged()` do `validar-fila.py` (`scripts/validar-fila.py:1342-1372` no comarka).

## Fixture e contraprova

Estender o `test-drenagem.sh`, ou criar um `test-elegibilidade-git.sh` irmao. A fixture hoje e um diretorio sem git (`FIXB="$(mktemp -d)"`, `test-drenagem.sh:115`), e sem git `MAIN_CHECKOUT` cai em `ROOT` (`lib.sh:30`). A fixture nova precisa de `git init` e de um commit inicial com `000-config.json` e `liberacoes.json`.

Casos (cada um roda `selecionar_pendente` E `prontos.py` sobre a mesma fixture e compara):

1. **Nao commitado:** `900-dummy.md` pendente, sem deps, com `testes_conferidos: []`, so no disco. Espera: `selecionar_pendente` nao devolve o 900, `prontos.py` nao o lista em PRONTOS e o lista em NAO ELEGIVEL com `nao commitado`. Hoje os dois devolvem o 900: o caso falha contra o motor atual.
2. **Contraprova:** `git add` + `git commit` do mesmo arquivo. Espera: os dois devolvem o 900, e `PRONTOS_ORDEM` do painel bate com a ordem de `drenar()` (a asercao que ja existe em `test-drenagem.sh:180`).
3. **Modificado depois do commit:** editar o `objetivo` do 900 sem commitar. Espera: nao elegivel, motivo `modificado no working tree`.
4. **Modificado so no status:** mudar `notas_status` sem commitar. Espera o que a saida escolhida acima define: elegivel em (b); em (a), elegivel depois do autocommit.
5. **Sem a chave:** `901-dummy.md` commitado sem `testes_conferidos`. Espera: nao elegivel, motivo `sem testes_conferidos`. O mesmo commitado com `[]` e elegivel.
6. **Dependencia nao commitada:** `902` commitado depende do `900` ainda so no disco. Espera: `902` preso por `dep nao-done` (a dep e achada, nao some como `dep inexistente`).

## Critério executável

Depois do porte, no repo de destino:

    bash scripts/orquestrador/test-drenagem.sh            # verde, com os casos 1-6
    grep -c 'ticket_elegivel_git' scripts/orquestrador/lib.sh   # espera >= 2 (definicao + chamada em selecionar_pendente)
    python3 scripts/roadmap/prontos.py | grep -c 'NAO ELEGIVEL' # espera 1

## Pedido

Corrigir no kit, com as duas pontas (`lib.sh` e `prontos.py`) no mesmo commit e a fixture git acima. Depois, portar para o comarka-operacional pelo caminho que o `rules/motor.md` de la define (a migracao planejada, ou `PORTE-PENDENTE:` se a fila parar por causa disto). Ate o porte, la vale a regra operacional: ticket novo e escrito e validado fora de `docs/fila/` e so entra na pasta pronto, ja commitado na hora.
