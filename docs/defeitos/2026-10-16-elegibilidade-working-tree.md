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

## Concorrência entre sessões

Mesmo dia, mesmo checkout principal do comarka-operacional. O checkout é dividido por várias sessões e pelos dois loops (plataforma e apolo).

### Evidência 1: pausa manual removida sem ninguém pedir

A sessão gravou a pausa global (`docs/fila/.orq-pause`) com `scripts/orquestrador/orq-pause.sh "<motivo manual>"`. O Lucas tinha pedido para não removê-la.

| gravada | motivo gravado | encontrada ausente em |
|---|---|---|
| 14:59 | `manual: Lucas revisando fila 1171-1173 antes do push (sessao Meta)` | conferência de ~15:03 |
| 15:04 | idem, `regravada 2a vez` | conferência de ~15:20 |
| 15:22 | idem, `regravada 3a vez, algo remove esta pausa` | ainda de pé às 15:30 |

O pedido original falava em três remoções. As observadas foram duas, e a terceira gravação seguia de pé quando esta nota foi escrita. Não se sabe quem removeu. Quem remove o sentinela no código:

- `scripts/publicar.sh:111,250,263` (`rm -f "$PAUSA"`), por regra só a pausa que ele próprio gravou, mas sem conferir o dono no `rm`;
- `scripts/ritual-staging.sh:154,292`, idem;
- `scripts/orquestrador/orq-pause.sh:22` (`--off`), que qualquer sessão pode rodar.

O loop só lê a pausa (`lib.sh:457`, `pausa_ativa`). O sentinela não tem dono verificável: é uma linha de texto livre (`data | motivo`). Há também um resto antigo, `docs/fila/.orq-pause.orfa-1937` (`2026-10-14 19:37 | dono: publicar.sh | motivo: publicar fila/painel-apolo em andamento`), sinal de que o caminho de falha do publicar já deixou pausa órfã antes.

### Evidência 2: o writeback do loop empurrou commits sem liberação de push

- `1e2f510` (15:00, reabre o 1171) e `52d31ba` (15:02, `testes_conferidos` do 992b) foram commitados na `main` local pela sessão, **sem** liberação de push. A regra do repo é que push é do Lucas.
- Às 15:12 o loop apolo terminou o 5026 e rodou `autocommit_status_fila` (`scripts/orquestrador/local-loop.sh:289-323`). Ele commitou `8b7ee5e` (status do 5026) e rodou `git -C "$mc" push origin main` (`local-loop.sh:318`).
- O reflog do checkout principal mostra `refs/remotes/origin/main@{15:12:51}: update by push` para `8b7ee5e`. O push leva o branch inteiro, então `1e2f510` e `52d31ba` foram junto para a origin.
- O próprio cabeçalho do `local-loop.sh:27` declara "NUNCA faz checkout nem push de main". O comentário de `local-loop.sh:284-288` e o código fazem o contrário.

### Mudança proposta

1. **Pausa com dono.** O `.orq-pause` passa a ter formato fixo, por exemplo uma linha `data | dono: <sessão ou script> | motivo: <texto>`, gravada por uma única função (`orq-pause.sh` e os scripts chamam a mesma). Dono de sessão manual: um identificador passado pela sessão, ou `manual:<nome>`.
2. **Publicar e ritual só removem a pausa própria.** Antes do `rm`, conferir que o `dono` do arquivo é o próprio script e, se der, que o pid ou carimbo gravado é o da execução atual. Pausa alheia: abortar com aviso (`pausa de <dono> desde <data>: <motivo>`), sem remover e sem seguir. O ritual já para quando acha pausa alheia na entrada (passo 0). O que falta é o mesmo cuidado na saída e no publicar. `orq-pause.sh --off` sobre pausa alheia pede `--forcar` explícito e registra quem forçou.
3. **O writeback empurra só o commit de status.** Em `autocommit_status_fila`, antes do push, conferir que `origin/main..main`, depois do fetch, contém **só** o commit de status que acabou de criar. Se a `main` local estiver à frente da origin com outros commits, o push falha com aviso que lista os shas (`main local tem N commit(s) alheio(s) sem push; status commitado e NAO empurrado`), e o commit de status fica local. Alternativa equivalente: empurrar só o commit de status por refspec, rebaseado sobre `origin/main` numa worktree descartável, sem levar o resto da `main` local.

### Fixture e contraprova (concorrência)

- **Pausa alheia:** fixture com `.orq-pause` de `dono: manual:teste`; rodar o caminho de saída do publicar e do ritual (ou a função de remoção isolada). Espera: o arquivo continua lá, saída com o aviso, código de saída diferente de zero. Contraprova: com `dono: publicar.sh` da própria execução, remove.
- **Writeback com commit alheio:** repo fixture com `origin` bare. Na `main` local, um commit `X` não empurrado, depois um `.md` de status modificado, e `autocommit_status_fila`. Espera: `X` **não** aparece na origin, e o log tem a linha de recusa. Contraprova: sem `X`, o commit de status chega à origin.

Critério extra, no repo de destino depois do porte:

    grep -c 'dono:' scripts/orquestrador/orq-pause.sh                 # espera >= 1
    grep -c 'origin/main..main' scripts/orquestrador/local-loop.sh    # espera >= 1 (checagem antes do push)
