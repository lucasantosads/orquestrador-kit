# Etapa 8d: `worktree.linkar_env` e template sem drift (relatório)

Worktree `~/Projetos/_worktrees/kit-env-8d`, branch `kit/env-8d`, a partir de `d3ce1b0` (main do kit). Sem push, sem `claude -p`, sem `--no-verify`. Nenhum `.env*` foi aberto, impresso ou copiado: do CI e do dashboard saíram só nomes de arquivo e nomes de chave. O dashboard não foi tocado. O pedido de merge do dashboard que chegou a esta sessão foi cancelado pelo Lucas; nada foi feito lá além de leitura (`git log`, `worktree list`, `status` com `GIT_OPTIONAL_LOCKS=0`).

## Resumo

| Peça | Commit | Vermelho contra d3ce1b0 | Verde |
|---|---|---|---|
| P1 `worktree.linkar_env` | `b985465` | 10 falham, 4 passam (14), rc=1 | 14/14 |
| P2 template sem drift | `0845dfc` | 2 falham, 1 passa (3), rc=1 | 3/3 |
| P3 CONTRATO §22, CHANGELOG, PECAS | `a001fde` | (só docs) | — |

Fechamento em `a001fde`: `tsc` rc=0; vitest 110 arquivos, 1805 testes, rc=0; `test-shell.sh` rc=0 (27 scripts); `test-instalar.sh` rc=0; `--atualizar --dry-run` contra o CI rc=0.

## 1. Condição 4: o preflight faz source ou export?

**Não.** Ele só lê e compara.

| Ponto | O que faz | arquivo:linha |
|---|---|---|
| `env_key_present` | `printenv` (não exporta), depois `grep -qE` no `MAIN_CHECKOUT/.env.local`; devolve só o rc | `scripts/orquestrador/lib.sh:1564-1570` |
| `env_value` | `local v`; `grep … \| head -1 \| cut` no `.env.local`; `printf '%s' "$v"` para o stdout | `lib.sh:1575-1583` |
| quem chama | `local origin id_repo id_amb url ref`; `url="$(env_value SUPABASE_URL)"` (local, capturado por substituição de comando) | `executor.sh:109`, `:118` (em d3ce1b0 eram `:108`/`:117`; a P1 só acrescentou a linha `:63` antes delas) |
| `preflight_env_keys` | `env_key_present "$k"` num laço, só rc | `executor.sh:125-130` |
| `export`/`source`/`allexport` em `lib.sh` e `executor.sh` | nenhum: `grep -n "export\|allexport\|dotenv"` acha só um comentário em `executor.sh:552` | — |
| launchd | o wrapper não carrega env (`launchd-run.sh:8-11`); o plist exporta só `NODE_OPTIONS` e `NODE_DIR` (`com.orquestrador.plist.template:56-62`) | — |

Como nada é exportado, a P1 não precisou de `env -u` e ficou dentro do teto.

**O teste:** `test/orquestrador-linkar-env.test.ts`, caso "o valor lido por env_value não chega a processo filho". Com o config do dashboard (`linkar_env: false`) e um `.env.local` falso no principal, o executor é carregado via source, `url="$(env_value SUPABASE_URL)"` lê o valor (`LIDO=https://fake-8d.supabase.co`) e um `bash -c` filho imprime `FILHO=AUSENTE`.

**Limite honesto:** o teste usa um filho genérico (`bash -c`), não cada um dos quatro consumidores. Os quatro são filhos do mesmo shell do executor e herdam o mesmo ambiente exportado, então a prova cobre todos pelo mecanismo:

- gates: `gates.ts` via tsx, `executor.sh:1179` (antes `:1142`);
- critério: `env -u SHELLOPTS -u BASHOPTS … bash -c`, `:553`;
- agente e juiz: `( cd "$wt" && … )`.

Não há um caso de teste rodando gate, critério, agente e juiz um por um. Se quiser esse nível, é um caso de `drive_ticket` com STUB e STUB_JUIZ imprimindo `printenv SUPABASE_URL` (~30 linhas de teste).

O que `false` também resolve: com `true`, a variável não chega pelo ambiente, mas o **arquivo** `.env.local` fica legível na worktree. O `next.config.mjs` do CI, por exemplo, o lê por caminho relativo. Com `false`, o arquivo não existe na worktree. Fica de fora: leitura pelo caminho absoluto do principal. Isso foi para PENDENTES (L6), citando `.env.local`, `.env.production.local` e `.env.vercel` do dashboard.

## 2. As peças

### P1 `b985465` · `worktree.linkar_env`

- `scripts/orquestrador/executor.sh`:
  - `:63` o preflight chama `exigir_linkar_env_valido`;
  - `:309` `setup_worktree` chama `env_na_worktree`;
  - `:317-323` `linkar_env_cfg`: jq explícito, porque `//` trataria `false` como ausente;
  - `:327-330` `exigir_linkar_env_valido`;
  - `:337-353` `env_na_worktree`: com true, o laço de antes; com outro valor, apaga só os symlinks `.env*` (`find -type l`, fora de `.git` e `node_modules`) e grava o evento;
  - `:1569` a worktree reaproveitada chama `env_na_worktree` só quando não é true.
- `scripts/orquestrador/config-cli.ts:173-187`: o `orq config` acusa `worktree.linkar_env` não booleano.
- `scripts/orquestrador/config-chaves.ts:124`: chave opcional.
- `doutrina/templates/config.json:19-22`: `"worktree": {"linkar_env": true}` e `_worktree`.
- Fixtures: `test/fixtures/config/ci-000-config.json` (cópia byte a byte do CI, `cmp` idêntico, cksum `2955789644 34521`) e `dashboard-rascunho-h-000-config.json` (o bloco json da seção H, cksum `3836506741 2176`). Procedência em `PROCEDENCIA.md`.
- Tamanho: 69 linhas adicionadas fora dos testes. São 19 de comentário e 45 de código; destas, 4 são o laço antigo movido e 6 são template e registro. O teto era ~40; o excesso é comentário.

Mensagens reais:
```
[orq ERRO] preflight: worktree.linkar_env="false" — worktree.linkar_env aceita só true ou false      (rc=1)
  worktree.linkar_env: aceita só true ou false; encontrado 0 — o executor aborta no preflight         (orq config)
```

**Vermelho contra d3ce1b0** (testes e fixtures copiados para uma worktree destacada em `d3ce1b0`, saída crua):
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-env-8d/5ffd8df5-dd84-4479-8924-86a88d46586c/scratchpad/vermelho-d3ce1b0

 × test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > com false (rascunho do dashboard): a worktree não tem nenhum .env* e o evento aparece 715ms
   → expected [ '.env.local', 'apps/web/.env.local' ] to deeply equal []
 ✓ test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > sem a chave (CI): os mesmos dois links de hoje, para o principal, e nenhum evento de env 646ms
 ✓ test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > com true explícito: idêntico ao CI sem a chave 603ms
 × test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > worktree reaproveitada com false: apaga só os symlinks .env*, conta, e não toca arquivo regular
   → bash: line 6: env_na_worktree: command not found
: expected 127 to be +0 // Object.is equality
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a string "false": exigir_linkar_env_valido sai != 0 com a chave e o valor
   → expected +0 not to be +0 // Object.is equality
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a string "false": o orq config acusa a mesma chave
   → expected [] to include 'worktree.linkar_env'
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > 0: exigir_linkar_env_valido sai != 0 com a chave e o valor
   → expected +0 not to be +0 // Object.is equality
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > 0: o orq config acusa a mesma chave
   → expected [] to include 'worktree.linkar_env'
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > null explícito: exigir_linkar_env_valido sai != 0 com a chave e o valor
   → expected +0 not to be +0 // Object.is equality
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > null explícito: o orq config acusa a mesma chave
   → expected [] to include 'worktree.linkar_env'
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > o preflight chama a validação
   → expected 'preflight() {\n  log "preflight: sint…' to contain 'exigir_linkar_env_valido'
 ✓ test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > true, false e ausente não são violação do orq config
 × test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a chave é lida pelo motor e é opcional (config-chaves.ts)
   → expected undefined to be false // Object.is equality
 ✓ test/orquestrador-linkar-env.test.ts > P1 · o preflight lê o .env.local do principal e não exporta (condição 4) > o valor lido por env_value não chega a processo filho

⎯⎯⎯⎯⎯⎯ Failed Tests 10 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > com false (rascunho do dashboard): a worktree não tem nenhum .env* e o evento aparece
AssertionError: expected [ '.env.local', 'apps/web/.env.local' ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   ".env.local",
+   "apps/web/.env.local",
+ ]

 ❯ test/orquestrador-linkar-env.test.ts:92:30
     90|     const r = noExecutor(raiz, `setup_worktree DC-1 "${wt}"`);
     91|     expect(r.rc, r.stderr).toBe(0);
     92|     expect(envsNa(raiz, wt)).toEqual([]);
       |                              ^
     93|     expect(eventos(raiz)).toMatch(/ DC-1 WORKTREE env=nao-linkado moti…
     94|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/10]⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · setup_worktree e worktree.linkar_env > worktree reaproveitada com false: apaga só os symlinks .env*, conta, e não toca arquivo regular
AssertionError: bash: line 6: env_na_worktree: command not found
: expected 127 to be +0 // Object.is equality

- Expected
+ Received

- 0
+ 127

 ❯ test/orquestrador-linkar-env.test.ts:127:28
    125|     writeFileSync(join(wt, '.env.example'), 'SUPABASE_URL=\n');
    126|     const r = noExecutor(raiz, `env_na_worktree DC-2 "${wt}"`);
    127|     expect(r.rc, r.stderr).toBe(0);
       |                            ^
    128|     expect(envsNa(raiz, wt)).toEqual(['.env.example']);
    129|     expect(lstatSync(join(wt, '.env.example')).isFile()).toBe(true);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/10]⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a string "false": exigir_linkar_env_valido sai != 0 com a chave e o valor
 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > 0: exigir_linkar_env_valido sai != 0 com a chave e o valor
 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > null explícito: exigir_linkar_env_valido sai != 0 com a chave e o valor
AssertionError: expected +0 not to be +0 // Object.is equality
 ❯ test/orquestrador-linkar-env.test.ts:143:24
    141|       const raiz = principal(comWorktree(CI, valor));
    142|       const r = noExecutor(raiz, 'exigir_linkar_env_valido; echo "NAO-…
    143|       expect(r.rc).not.toBe(0);
       |                        ^
    144|       expect(r.stdout).not.toContain('NAO-ABORTOU');
    145|       expect(r.stderr).toContain(`worktree.linkar_env=${mostrado}`);

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[3/10]⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a string "false": o orq config acusa a mesma chave
 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > 0: o orq config acusa a mesma chave
 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > null explícito: o orq config acusa a mesma chave
AssertionError: expected [] to include 'worktree.linkar_env'
 ❯ test/orquestrador-linkar-env.test.ts:150:37
    148|     it(`${rotulo}: o orq config acusa a mesma chave`, () => {
    149|       const v = validarConfig(JSON.parse(comWorktree(CI, valor)));
    150|       expect(v.map((x) => x.chave)).toContain('worktree.linkar_env');
       |                                     ^
    151|     });
    152|   }

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[4/10]⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > o preflight chama a validação
AssertionError: expected 'preflight() {\n  log "preflight: sint…' to contain 'exigir_linkar_env_valido'

- Expected
+ Received

- exigir_linkar_env_valido
+ preflight() {
+   log "preflight: sintaxe, fila, identidade, env$([ "$DRY" != 1 ] && echo ', claude')"
+   local s f k
+   for s in executor.sh enforcement.sh lib.sh orq-pause.sh; do
+     [ -f "$ORQ_LIB_DIR/$s" ] && { bash -n "$ORQ_LIB_DIR/$s" || die "preflight: $s com erro de sintaxe"; }
+   done
+   jq -e . "$CONFIG" >/dev/null 2>&1 || die "preflight: $CONFIG não é JSON válido"
+   # Sem a lista, todo ticket pareceria edição alheia e nada do loop seria commitado (8b).
+   jq -e 'type == "array" and length > 0' "$CAMPOS_DO_MOTOR_FILE" >/dev/null 2>&1 || die "preflight: $CAMPOS_DO_MOTOR_FILE ausente ou inválido"
+   for f in $(ticket_files); do
+     ticket_json "$f" | jq -e . >/dev/null 2>&1 || die "preflight: bloco json inválido em $(basename "$f")"
+   done
+
+   # Árvore de EXECUÇÃO limpa. O checkout principal pode estar sujo à vontade —
+   # o guard vale para onde o run acontece.
+   local sujo; sujo="$(git -C "$ROOT" --no-optional-locks status --porcelain | head -5)"
+   [ -z "$sujo" ] || die "preflight: árvore de execução suja em $ROOT — commite ou stashe antes:
+ $sujo"
+   # Lock de git: só é FATAL se algum processo estiver de fato com o arquivo
+   # aberto (via lsof). Sem isso, qualquer lock deixado para tras por um
+   # ambiente que nao consegue fazer unlink (ex.: montagem via bridge) trava
+   # o loop para sempre, mesmo sem ninguem realmente segurando o lock.
+   local locks lk vivos="" orfaos=""
+   locks="$(find "$ROOT/.git" -maxdepth 1 -name '*.lock' 2>/dev/null)"
+   if [ -n "$locks" ]; then
+     while IFS= read -r lk; do
+       [ -n "$lk" ] || continue
+       if command -v lsof >/dev/null 2>&1; then
+         if lsof -- "$lk" >/dev/null 2>&1; then
+           vivos="$vivos $lk"
+         else
+           orfaos="$orfaos $lk"
+         fi
+       else
+         vivos="$vivos $lk"
+       fi
+     done <<< "$locks"
+     [ -z "$vivos" ] || die "preflight: lock de git em uso por outro processo: $vivos"
+     if [ -n "$orfaos" ]; then
+       log "preflight: removendo lock(s) de git orfao(s), sem processo dono:$orfaos"
+       for lk in $orfaos; do
+         rm -f "$lk" 2>/dev/null
+         # Alguns ambientes (ex.: montagem via bridge) recusam unlink mesmo com
+         # permissao de escrita normal; rename costuma funcionar onde rm falha.
+         [ -e "$lk" ] && mv -f "$lk" "$lk.orfao.$(date +%s)" 2>/dev/null
+         [ -e "$lk" ] && die "preflight: lock orfao nao pode ser removido nem renomeado: $lk"
+       done
+     fi
+   fi
+
+   # Identidade: repo e ambiente certos. CFG_AMBIENTE_ID é o nome deste repo para
+   # o campo que o comarka-os chama de supabase_project_id.
+   local origin id_repo="?" id_amb="?" url ref
+   if [ -n "$CFG_REPO_ORIGIN" ] && [ "$CFG_REPO_ORIGIN" != null ]; then
+     origin="$(git -C "$MAIN_CHECKOUT" remote get-url origin 2>/dev/null || true)"
+     case "$origin" in
+       *"$CFG_REPO_ORIGIN"*) id_repo="${CFG_REPO_ORIGIN##*/}" ;;
+       *) die "preflight: repo errado — origin='$origin' não contém '$CFG_REPO_ORIGIN'" ;;
+     esac
+   fi
+   if [ -n "$CFG_AMBIENTE_ID" ] && [ "$CFG_AMBIENTE_ID" != null ]; then
+     url="$(env_value SUPABASE_URL)"
+     ref="$(printf '%s' "$url" | sed -E 's#^https?://##; s#/.*$##; s#\..*$##')"
+     [ "$ref" = "$CFG_AMBIENTE_ID" ] || die "preflight: ambiente errado — esperado $CFG_AMBIENTE_ID, obtido '${ref:-vazio}'"
+     id_amb="$ref"
+   fi
+   log "identidade: repo=$id_repo · ambiente=$id_amb"
+
+   local faltando=""
+   while IFS= read -r k; do
+     [ -z "$k" ] && continue
+     env_key_present "$k" || faltando="$faltando $k"
+   done < <(cfg '.preflight_env_keys[]?' 2>/dev/null)
+   [ -n "$faltando" ] && die "preflight: env faltando (nem no processo nem em .env.local):$faltando"
+
+   probe_modelos
+
+   # Branch alvo criada da PROTEGIDA (lida do config pelo lib.sh). Sem push.
+   ensure_branch_alvo
+   log "preflight: ok (alvo=$CFG_BRANCH_ALVO, protegida=$(cfg '.branch_protegida'))"

 ❯ test/orquestrador-linkar-env.test.ts:157:19
    155|     const fonte = readFileSync(EXECUTOR, 'utf8');
    156|     const corpo = fonte.slice(fonte.indexOf('preflight() {'), fonte.in…
    157|     expect(corpo).toContain('exigir_linkar_env_valido');
       |                   ^
    158|   });
    159| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[5/10]⎯

 FAIL  test/orquestrador-linkar-env.test.ts > P1 · valor inválido aborta no preflight > a chave é lida pelo motor e é opcional (config-chaves.ts)
AssertionError: expected undefined to be false // Object.is equality

- Expected: 
false

+ Received: 
undefined

 ❯ test/orquestrador-linkar-env.test.ts:168:28
    166|   it('a chave é lida pelo motor e é opcional (config-chaves.ts)', () =…
    167|     const c = CHAVES_CONFIG.find((x) => x.chave === 'worktree.linkar_e…
    168|     expect(c?.obrigatoria).toBe(false);
       |                            ^
    169|   });
    170| });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[6/10]⎯

 Test Files  1 failed (1)
      Tests  10 failed | 4 passed (14)
   Start at  17:38:42
   Duration  3.88s (transform 107ms, setup 0ms, collect 115ms, tests 3.34s, environment 0ms, prepare 84ms)

rc=1
```

Os 4 que passam em d3ce1b0 provam o que não muda:
- "sem a chave (CI)" e "true explícito": os dois links de hoje;
- "true, false e ausente não são violação";
- a prova de não exportar.

**Verde** (em `a001fde`): 14/14 (na suíte completa abaixo).

### P2 `0845dfc` · template sem drift

- `doutrina/templates/config.json:212-237`: `_zona_proibida` (o motor não tem regra de leitura nem de ownership); `no_write_paths`, `no_write_credenciais.padroes`, `no_write_tables` e `prefixos_sem_ddl` (no lugar de `no_write_prefixes`). Saem `readonly_ok` e `excecoes_os_owned`; `descricao` e `revisado_humano` ficam.
- `scripts/orquestrador/config-chaves.ts`: subchaves `zona_proibida.no_write_paths`, `.no_write_credenciais.padroes` e `.no_write_tables`, opcionais (`zona_proibida` inteira continua obrigatória).
- `test/orquestrador-template-zona.test.ts`: lista fechada `PROCESSO_HUMANO = ['descricao', 'revisado_humano']`, com comentário. Qualquer outra chave desconhecida reprova, e o registro não pode inventar chave fora do tipo `EnforceConfig.zona_proibida`.
- Tamanho: 23 linhas de template e 3 de registro.

**Vermelho contra d3ce1b0** (saída crua):
```

 RUN  v2.1.9 /private/tmp/claude-501/-Users-lucasantos-Projetos--worktrees-kit-env-8d/5ffd8df5-dd84-4479-8924-86a88d46586c/scratchpad/vermelho-d3ce1b0

 × test/orquestrador-template-zona.test.ts > P2 · template sem drift em zona_proibida > toda chave de zona_proibida do template é lida pelo motor ou é de processo humano
   → chaves que o motor não lê: no_write_tables, no_write_prefixes, readonly_ok, excecoes_os_owned: expected [ 'no_write_tables', …(3) ] to deeply equal []
 ✓ test/orquestrador-template-zona.test.ts > P2 · template sem drift em zona_proibida > o registro não inventa chave: cada zona_proibida.<x> lida existe no tipo do enforcement
 × test/orquestrador-template-zona.test.ts > P2 · template sem drift em zona_proibida > _zona_proibida diz que o motor não tem regra de leitura nem de ownership
   → expected '' to match /leitura/i

⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯

 FAIL  test/orquestrador-template-zona.test.ts > P2 · template sem drift em zona_proibida > toda chave de zona_proibida do template é lida pelo motor ou é de processo humano
AssertionError: chaves que o motor não lê: no_write_tables, no_write_prefixes, readonly_ok, excecoes_os_owned: expected [ 'no_write_tables', …(3) ] to deeply equal []

- Expected
+ Received

- Array []
+ Array [
+   "no_write_tables",
+   "no_write_prefixes",
+   "readonly_ok",
+   "excecoes_os_owned",
+ ]

 ❯ test/orquestrador-template-zona.test.ts:46:85
     44|       (k) => !k.startsWith('_') && !PROCESSO_HUMANO.includes(k) && !LI…
     45|     );
     46|     expect(desconhecidas, `chaves que o motor não lê: ${desconhecidas.…
       |                                                                                     ^
     47|   });
     48| 

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[1/2]⎯

 FAIL  test/orquestrador-template-zona.test.ts > P2 · template sem drift em zona_proibida > _zona_proibida diz que o motor não tem regra de leitura nem de ownership
AssertionError: expected '' to match /leitura/i

- Expected: 
/leitura/i

+ Received: 
""

 ❯ test/orquestrador-template-zona.test.ts:57:18
     55|   it('_zona_proibida diz que o motor não tem regra de leitura nem de o…
     56|     const nota = String(TEMPLATE._zona_proibida ?? '');
     57|     expect(nota).toMatch(/leitura/i);
       |                  ^
     58|     expect(nota).toMatch(/ownership/i);
     59|   });

⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯[2/2]⎯

 Test Files  1 failed (1)
      Tests  2 failed | 1 passed (3)
   Start at  17:38:46
   Duration  442ms (transform 64ms, setup 0ms, collect 71ms, tests 9ms, environment 0ms, prepare 121ms)

rc=1
```

**Verde:** 3/3.

### P3 `a001fde` · docs

- CONTRATO §22 (seção nova). O vocabulário de eventos não muda: `WORKTREE` ganha os campos `env=nao-linkado motivo= apagados=`. **A linha `WORKTREE` da tabela §4.1 não foi editada**, porque o escopo era "uma seção nova". Ela segue listando só `modo=reaproveitada de= base=`. Se quiser, é uma linha numa próxima etapa.
- CHANGELOG (Etapa 8d).
- `docs/PECAS.md`: em FEITAS, a 8d; em PENDENTES, a leitura por caminho absoluto, ligada ao L6, com os três arquivos do dashboard.

## 3. O CI não muda de comportamento

**a) O config real do CI contra o motor novo** (só leitura; cópia do config num diretório temporário):
```
linkar_env_cfg=true
preflight-linkar_env=ok
orq config rc=0
linhas do orq config que citam linkar_env: 0
```
O CI não tem a chave `worktree` (`jq 'has("worktree")'` = false), então `linkar_env_cfg` dá `true` e roda o mesmo laço.

**b) O laço que o CI tem vendorizado hoje** (`~/Projetos/conteudos-infinitos/scripts/orquestrador/executor.sh:310-312`):
```
  for d in "" apps/web; do
    [ -e "$MAIN_CHECKOUT/${d:+$d/}.env.local" ] && ln -sfn "$MAIN_CHECKOUT/${d:+$d/}.env.local" "$wt/${d:+$d/}.env.local"
  done
```
É o mesmo texto do ramo `true` de `env_na_worktree` (`executor.sh:343-345`).

**c) `bash instalar.sh --atualizar ~/Projetos/conteudos-infinitos --dry-run`** (saída crua):
```
ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.

VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-env-8d)
           repo /Users/lucasantos/Projetos/conteudos-infinitos

carimbo    2.1.0-dev

só no kit   scripts/orquestrador/campos-do-motor.json
diferente   scripts/orquestrador/config-chaves.ts
diferente   scripts/orquestrador/config-cli.ts
diferente   scripts/orquestrador/decisao-cli.ts
diferente   scripts/orquestrador/decisao.ts
diferente   scripts/orquestrador/diagnostico.ts
diferente   scripts/orquestrador/enforcement-core.ts
diferente   scripts/orquestrador/enforcement.sh
diferente   scripts/orquestrador/executor.sh
diferente   scripts/orquestrador/gate-ticket.ts
diferente   scripts/orquestrador/juiz.ts
diferente   scripts/orquestrador/lib.sh
diferente   scripts/orquestrador/local-loop.sh
só no kit   scripts/orquestrador/migrations
diferente   scripts/orquestrador/resolvedor/acoes.ts
diferente   scripts/orquestrador/resolvedor/caminhos.ts
diferente   scripts/orquestrador/resolvedor/desfazer.ts
diferente   scripts/orquestrador/resolvedor/desfecho.ts
diferente   scripts/orquestrador/resolvedor/gate-streak.ts
só no kit   scripts/orquestrador/resolvedor/humano.ts
diferente   scripts/orquestrador/resolvedor/modos.ts
diferente   scripts/orquestrador/resolvedor/pausa.ts
diferente   scripts/orquestrador/resolvedor/promocao.ts
diferente   scripts/orquestrador/resolvedor/r1.ts
diferente   scripts/orquestrador/resolvedor/repo.ts
diferente   scripts/orquestrador/test-fixture-executor.sh
diferente   scripts/orquestrador/triador/extrair.ts
diferente   scripts/orquestrador/triador/leitor-kit.ts
diferente   scripts/orquestrador/triador/leitor-legado-comarka.ts
diferente   scripts/orquestrador/triador/tipos.ts
diferente   scripts/orquestrador/triador/triar.ts
diferente   scripts/orq
diferente   docs/orquestrador/skill/templates/config.json

33 diferença(s)

O --atualizar de verdade RECUSARIA, por:
  · o loop de '/Users/lucasantos/Projetos/conteudos-infinitos' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  (a recusa não impede este dry-run de listar tudo)
rc=0
```
O dry-run lista **arquivos**, não linhas. As 33 diferenças são a soma de tudo o que o kit acumulou desde a última vendorização do CI (8b, 8c, MIG-A, 8d). O `executor.sh` do CI já difere de `d3ce1b0` em 187 linhas de `diff`. A parte da 8d entre essas diferenças é o diff abaixo, `git diff d3ce1b0 a001fde -- scripts/orquestrador doutrina`, com os mesmos arquivos que o `--atualizar` copia (`doutrina/` vira `docs/orquestrador/skill/`). Saída crua:
```
diff --git a/doutrina/templates/config.json b/doutrina/templates/config.json
index 8961aa6..68643be 100644
--- a/doutrina/templates/config.json
+++ b/doutrina/templates/config.json
@@ -16,6 +16,10 @@
   "_adiamentos_limite": "Peça 7b-3 (local-loop.sh:adiamentos_limite). Adiamentos SEM cooldown seguidos (timeout, 5xx, sessão, gate que não rodou, recusa de preflight), contados em runs/<id>/.adiamentos. No limite o ticket vai para bloqueado, commitado, com notas_status 'adiado N vezes: <causa real>' (a medida do último ADIADO: motivo, rc e duração, ou a causa do preflight), e a trilha ganha BLOQUEADO motivo=adiamentos. Adiado com cooldown (rate_limit, quota) não conta nem zera; sair de pendente ou a branch alvo avançar zera. Ausente ou inválida = 4.",
   "migrations_dir": "<ex: supabase/migrations | db/migrations>",
   "worktrees_dir": "../_worktrees",
+  "worktree": {
+    "linkar_env": true
+  },
+  "_worktree": "Etapa 8d. `linkar_env`: true (ou ausente) liga o .env.local do checkout principal (raiz e apps/web) na worktree do ticket, e gates, critérios, agente e juiz rodam com ele à vista. Use false quando esse arquivo tiver credencial que o loop não pode ter (ex.: banco de produção): nada de .env* entra, e o evento WORKTREE env=nao-linkado vai para o events.log. Só booleano: qualquer outro valor aborta o preflight. O preflight de identidade continua lendo o .env.local do principal, sem exportar nada.",
   "runs_dir": "docs/fila/runs",
   "liberacoes_file": "docs/fila/liberacoes.json",
   "decisoes_file": "docs/fila/decisoes-pendentes.md",
@@ -205,21 +209,30 @@
     "docs/fila/000-config.json",
     ".claude/**"
   ],
+  "_zona_proibida": "Etapa 8d: só chaves que o enforcement lê (config-chaves.ts). no_write_paths e no_write_credenciais.padroes são globs de caminho; no_write_tables é \"TODAS\" ou a lista de tabelas congeladas por nome; prefixos_sem_ddl (o antigo no_write_prefixes) proíbe CREATE/ALTER/DROP de objeto com o prefixo. O motor NÃO tem regra de leitura (o antigo readonly_ok) nem de ownership (o antigo excecoes_os_owned): tabela fora de no_write_tables pode ser escrita, e ninguém fica protegido por uma lista que o motor não lê.",
   "zona_proibida": {
     "descricao": "Tudo que o loop NUNCA escreve nem gera DDL. Revisado por humano (revisado_humano: true) antes do primeiro run.",
     "revisado_humano": false,
+    "no_write_paths": [
+      ".env*",
+      "**/.env*",
+      "<outros caminhos que o loop nunca escreve>"
+    ],
+    "no_write_credenciais": {
+      "padroes": [
+        "**/*.pem",
+        "**/*.key",
+        "**/id_rsa*",
+        "**/credentials*",
+        "**/secrets*"
+      ]
+    },
     "no_write_tables": [
       "<tabela_compartilhada_1>"
     ],
-    "no_write_prefixes": [
+    "prefixos_sem_ddl": [
       "<prefixo_proibido_>",
       "vw_"
-    ],
-    "readonly_ok": [
-      "<tabelas que o loop pode SELECT mas nunca escrever>"
-    ],
-    "excecoes_os_owned": [
-      "<tabelas de nome parecido mas de propriedade deste repo>"
     ]
   },
   "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
diff --git a/scripts/orquestrador/config-chaves.ts b/scripts/orquestrador/config-chaves.ts
index 7b58d28..95c5ee7 100644
--- a/scripts/orquestrador/config-chaves.ts
+++ b/scripts/orquestrador/config-chaves.ts
@@ -66,6 +66,9 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   { chave: '_execucao_dos_gates.ordem_obrigatoria', onde: 'gates.ts:176, executor.sh:382', obrigatoria: true, nota: 'gates.ts ERRA se a ordem divergir da lista' },
   { chave: '_execucao_dos_gates.interrupcao', onde: 'gates.ts:177', obrigatoria: true },
   { chave: 'zona_proibida', onde: 'enforcement-core.ts:211, executor.sh:364', obrigatoria: true, nota: 'a fronteira que o enforcement aplica' },
+  { chave: 'zona_proibida.no_write_paths', onde: 'enforcement-core.ts:728', obrigatoria: false, nota: 'globs de caminho; ausente = lista vazia (a do Actus é só de banco)' },
+  { chave: 'zona_proibida.no_write_credenciais.padroes', onde: 'enforcement-core.ts:728', obrigatoria: false, nota: 'globs somados aos no_write_paths' },
+  { chave: 'zona_proibida.no_write_tables', onde: 'enforcement-core.ts:534, :719', obrigatoria: false, nota: '"TODAS" = negação total (regra 3); lista = congeladas por nome. Opcional como subchave: zona_proibida inteira já é obrigatória' },
   { chave: 'politica_adiamento.causas_que_adiam', onde: 'decisao.ts:113', obrigatoria: true, nota: 'sem ela nada é adiável: falha de infra viraria reprovação' },
   { chave: 'politica_retry.por_causa', onde: 'decisao.ts:277', obrigatoria: true },
   { chave: 'politica_retry.por_causa.arquivo_solto', onde: 'decisao.ts:558', obrigatoria: false, nota: 'sem ela, arquivo_solto bloqueia em vez de ir a retry (porte do Actus, 631)' },
@@ -117,6 +120,9 @@ export const CHAVES_CONFIG: ChaveConfig[] = [
   // --- piso de tools (peça T17) ---------------------------------------------
   { chave: 'proibicoes_absolutas.tools', onde: 'executor.sh:tools_proibidas, perfil.ts:190', obrigatoria: false, nota: 'o PISO de --disallowedTools; ausente = piso vazio e a flag não é passada. Nos três repos do disco `proibicoes_absolutas` ainda é um ARRAY de prosa, e ali o piso nasce vazio' },
 
+  // --- worktree (etapa 8d) --------------------------------------------------
+  { chave: 'worktree.linkar_env', onde: 'executor.sh:linkar_env_cfg', obrigatoria: false, nota: 'ausente = true, o comportamento de antes; false = nenhum .env* do principal entra na worktree; não-booleano aborta o preflight' },
+
   // --- agendamento (peça K6c) -----------------------------------------------
   { chave: 'launchd.label', onde: 'instalar-launchd.sh:47', obrigatoria: true, nota: 'NÃO tem default: o instalador RECUSA sem ele. Um label por repo — dois repos com o mesmo label são o MESMO job para o launchd' },
   { chave: 'launchd.start_interval', onde: 'instalar-launchd.sh:59', obrigatoria: false, nota: 'ausente vira 1800, o valor medido em 06/set/2026' },
diff --git a/scripts/orquestrador/config-cli.ts b/scripts/orquestrador/config-cli.ts
index a2146cb..2e2f5b1 100644
--- a/scripts/orquestrador/config-cli.ts
+++ b/scripts/orquestrador/config-cli.ts
@@ -170,6 +170,22 @@ export function validarConfig(cfg: unknown): Violacao[] {
     }
   }
 
+  // 5. worktree.linkar_env (etapa 8d): só booleano. O executor ABORTA no
+  //    preflight com qualquer outra coisa (executor.sh:exigir_linkar_env_valido);
+  //    aqui é a mesma regra dita antes do run.
+  if ('worktree' in c) {
+    const w = c.worktree
+    const ok = w && typeof w === 'object' && !Array.isArray(w)
+      && (!('linkar_env' in w) || typeof (w as Record<string, unknown>).linkar_env === 'boolean')
+    if (!ok) {
+      const valor = w && typeof w === 'object' ? (w as Record<string, unknown>).linkar_env : w
+      v.push({
+        chave: 'worktree.linkar_env',
+        mensagem: `aceita só true ou false; encontrado ${JSON.stringify(valor)} — o executor aborta no preflight`,
+      })
+    }
+  }
+
   return v
 }
 
diff --git a/scripts/orquestrador/executor.sh b/scripts/orquestrador/executor.sh
index 49b1df1..631dbd0 100755
--- a/scripts/orquestrador/executor.sh
+++ b/scripts/orquestrador/executor.sh
@@ -60,6 +60,7 @@ preflight() {
     [ -f "$ORQ_LIB_DIR/$s" ] && { bash -n "$ORQ_LIB_DIR/$s" || die "preflight: $s com erro de sintaxe"; }
   done
   jq -e . "$CONFIG" >/dev/null 2>&1 || die "preflight: $CONFIG não é JSON válido"
+  exigir_linkar_env_valido
   # Sem a lista, todo ticket pareceria edição alheia e nada do loop seria commitado (8b).
   jq -e 'type == "array" and length > 0' "$CAMPOS_DO_MOTOR_FILE" >/dev/null 2>&1 || die "preflight: $CAMPOS_DO_MOTOR_FILE ausente ou inválido"
   for f in $(ticket_files); do
@@ -305,13 +306,49 @@ setup_worktree() {
   # (pacotes_do_checkout), não adivinhado por nome de diretório.
   linkar_node_modules "$wt"
   limpa_cache_vite
-  # ACHADO em aberto (peça K6/pureza): esta lista continua FIXA. Generalizá-la
-  # para os pacotes detectados passaria a linkar .env.local de pacote que hoje
-  # não recebe link — mudança de comportamento fora do escopo desta peça.
-  local d
-  for d in "" apps/web; do
-    [ -e "$MAIN_CHECKOUT/${d:+$d/}.env.local" ] && ln -sfn "$MAIN_CHECKOUT/${d:+$d/}.env.local" "$wt/${d:+$d/}.env.local"
-  done
+  env_na_worktree "$id" "$wt"
+  return 0
+}
+
+# linkar_env_cfg -> `true`, `false` ou `invalido <chave>=<valor json>`.
+# Etapa 8d. NÃO é `.worktree.linkar_env // true`: o `//` do jq trata `false`
+# como ausente e devolveria `true` justamente quando o config diz `false`.
+# Ausente = `true` (o comportamento de antes da chave); só booleano vale.
+linkar_env_cfg() {
+  jq -r 'if has("worktree") | not then "true"
+    elif (.worktree | type) != "object" then "invalido worktree=\(.worktree | tojson)"
+    elif (.worktree | has("linkar_env") | not) then "true"
+    elif (.worktree.linkar_env | type) == "boolean" then (.worktree.linkar_env | tostring)
+    else "invalido worktree.linkar_env=\(.worktree.linkar_env | tojson)" end' "$CONFIG"
+}
+
+# Valor inválido ABORTA: config errado não melhora repetindo, e "false" string
+# lido como true ligaria a credencial de produção sem ninguém ver.
+exigir_linkar_env_valido() {
+  local v; v="$(linkar_env_cfg)"
+  case "$v" in true|false) ;; *) die "preflight: ${v#invalido } — worktree.linkar_env aceita só true ou false" ;; esac
+}
+
+# env_na_worktree <id> <worktree> — o .env.local do principal entra na worktree
+# só com `worktree.linkar_env` true (ou ausente). Com qualquer outra coisa nada
+# é ligado, os symlinks .env* que sobraram de tentativa anterior (worktree
+# reaproveitada) são apagados, e o evento diz quantos. Arquivo regular
+# (versionado, ex. .env.example) não é tocado: ele veio do git, não do motor.
+env_na_worktree() {
+  local id="$1" wt="$2" d n=0 l
+  if [ "$(linkar_env_cfg)" = true ]; then
+    # ACHADO em aberto (peça K6/pureza): esta lista continua FIXA. Generalizá-la
+    # para os pacotes detectados passaria a linkar .env.local de pacote que hoje
+    # não recebe link — mudança de comportamento fora do escopo desta peça.
+    for d in "" apps/web; do
+      [ -e "$MAIN_CHECKOUT/${d:+$d/}.env.local" ] && ln -sfn "$MAIN_CHECKOUT/${d:+$d/}.env.local" "$wt/${d:+$d/}.env.local"
+    done
+    return 0
+  fi
+  while IFS= read -r l; do
+    [ -n "$l" ] && rm -f "$l" && n=$((n + 1))
+  done < <(find "$wt" -name .git -prune -o -name node_modules -prune -o -type l -name '.env*' -print 2>/dev/null)
+  event "$id" WORKTREE "env=nao-linkado" "motivo=worktree.linkar_env=false" "apagados=$n"
   return 0
 }
 
@@ -1528,6 +1565,8 @@ drive_ticket() {
       log "  worktree REAPROVEITADA de attempt-$((slot + attempt - attempt0 - 1)) (enforcement passou): commit anterior presente, base $(printf '%.8s' "$base_ticket")"
       event "$id" WORKTREE "modo=reaproveitada" "de=attempt-$((slot + attempt - attempt0 - 1))" "base=$(printf '%.8s' "$base_ticket")"
       limpa_cache_vite
+      # Com true o reaproveitamento segue como antes (os links já estão lá).
+      [ "$(linkar_env_cfg)" = true ] || env_na_worktree "$id" "$wt"
     else
       setup_worktree "$id" "$wt"
       base_ticket="$(git -C "$wt" rev-parse HEAD)"
```
Para o CI:
- `config-cli.ts` só acusa quando `worktree` existe;
- `config-chaves.ts` só ganha entradas opcionais;
- o template vendorizado (`docs/orquestrador/skill/templates/config.json`) não é lido pelo motor em execução.

## 4. Fechamento (saída crua, HEAD `a001fde`)

### `npx tsc --noEmit`
```
rc=0
```

### `TZ=UTC node_modules/.bin/vitest run` (as 40 últimas linhas; o arquivo tem 956)
```
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 1646ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 1510ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 1751ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 3006ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 1960ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 1725ms
 ✓ test/orquestrador-resolvedor-tentativa-nova.test.ts (5 tests) 10167ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um attempt-* novo em runs/<id>/: desiste, o ticket fica intacto 1944ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um arquivo reescrito dentro de um attempt-* (sem entrada nova): desiste 1902ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o log do loop ganha o começo de uma tentativa do ticket: desiste 2013ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o ticket vira em_execucao: desiste (e não pisa no que o loop escreveu) 2064ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > log de outro ticket e nada novo no runs/: age (a trava não trava sem motivo) 2155ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 438ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 9683ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 4828ms
   ✓ peça 7: orq desfazer > recusa sem ação no ledger 653ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 2760ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 1355ms
 ✓ test/orquestrador-teto-adiamento-ambiente.test.ts (5 tests) 53666ms
   ✓ teto de adiamento por ambiente > 3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota 10989ms
   ✓ teto de adiamento por ambiente > reprovação no meio quebra a sequência (o contador zera) 11459ms
   ✓ teto de adiamento por ambiente > adiamento por OUTRA causa não conta nem zera 15318ms
   ✓ teto de adiamento por ambiente > passar de fase zera: aprovado leva a aguardando_merge sem contador 8703ms
   ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 7196ms
 ✓ test/orquestrador-vizinhos-8c-executor.test.ts (8 tests) 108856ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > 950: FAIL só no vizinho → não é base_vermelha; VIZINHO_AMPLIADO; a 2ª edita o teste, passa no enforcement e na lista fechada, e aprova 14688ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > a ampliação vale até o fim do drive: com o teste não ajustado, as tentativas 2 e 3 levam a lista; um só VIZINHO_AMPLIADO 25845ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > uma vez por versão do ticket: com VIZINHO_AMPLIADO desta versão na trilha, não amplia de novo, e nem por isso vira base_vermelha 11440ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > contra-teste: FAIL fora da allowlist em teste que não é vizinho segue base_vermelha como hoje, sem VIZINHO_AMPLIADO 9261ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > base vermelha verdadeira cujo teste importa arquivo da allowlist: o vizinho falha também no base_ticket → não amplia, segue base_vermelha, e a trilha diz 10059ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > runner que não roda na base (inconclusivo): não amplia; a base vermelha decide como hoje 13292ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > P3 · a tentativa ampliada que põe it.skip no teste vizinho: enforcement reprova por afrouxamento e bloqueia sem 3ª tentativa 14988ms
   ✓ 8c-P2b · teste vizinho no drive_ticket: amplia na tentativa seguinte, até o fim do drive > P4 · o bloco FAIL e a regra só no prompt da tentativa ampliada; o juiz (run_juiz real, STUB_JUIZ) recebe a lista ampliada 9278ms

 Test Files  110 passed (110)
      Tests  1805 passed (1805)
   Start at  17:35:30
   Duration  123.95s (transform 2.39s, setup 0ms, collect 42.41s, tests 929.14s, environment 39ms, prepare 12.98s)

rc=0
```
Nenhuma linha `FAIL` ou `×` na saída inteira: `grep -cE 'FAIL|×'` = 6.

Uma ocorrência a registrar: na rodada intermediária da P2, com o `test-shell.sh` da P1 rodando em paralelo, `orquestrador-gate-regex-casos.test.ts > 624 · recusa: regex que o /usr/bin/grep rejeita (rc 2)` falhou uma vez (28ms). Isolado passou 18/18, e na rodada final sem concorrência passou. É instabilidade sob carga, fora do que a 8d toca. Não foi investigada.

### `bash scripts/kit/test-shell.sh` (placar; o arquivo tem 1264 linhas)
```
== placar ==
  rc=0  test-lib-config.sh
  rc=0  test-drenagem.sh
  rc=0  test-retry-worktree.sh
  rc=0  test-drenagem-sem-progresso.sh
  rc=0  test-sem-progresso-limite.sh
  rc=0  test-ocioso.sh
  rc=0  test-rc-executor.sh
  rc=0  test-ambiente.sh
  rc=0  test-causa-adiamento.sh
  rc=0  test-ambiente-adiado.sh
  rc=0  test-adiamentos-limite.sh
  rc=0  test-reprovado-sub.sh
  rc=0  test-notificacao-ambiente.sh
  rc=0  test-reabertura-humana.sh
  rc=0  test-painel-visao.sh
  rc=0  test-painel-detalhe.sh
  rc=0  test-painel-pausa.sh
  rc=0  test-painel-alarmes.sh
  rc=0  test-painel-lento.sh
  rc=0  test-gate-prevoo.sh
  rc=0  test-tentativas-persistidas.sh
  rc=0  test-orq-pause.sh
  rc=0  test-preflight.sh
  rc=0  test-diff-lines.sh
  rc=0  test-sem-cor.sh
  rc=0  test-criterio-isolado.sh
  rc=0  test-fixture-gates.sh (kit)
TODOS OS SCRIPTS SAÍRAM rc 0
rc=0
```

### `bash scripts/kit/test-instalar.sh` (as 15 últimas linhas; o arquivo tem 740)
```
  ok    árvore idêntica antes e depois
-- (k4) com o tsx de volta, o --atualizar segue normalmente --
  ok    rc 0
  ok    nenhuma reclamação de tsx

== (v) nenhum scripts/orquestrador/test-*.sh vendorizado depende do kit ==
  ok    29 test-*.sh vendorizados no fixture varridos
  ok    nenhum cita test/fixtures, ORQ_KIT ou caminho que sobe para fora de scripts/orquestrador
  ok    a trava reprova a linha que quebrou no CI

== (c) ORQ_CI_CHECKOUT não setado (SÓ LEITURA — o resultado é achado, não gate) ==
  (pulado: ORQ_CI_CHECKOUT vazio ou inexistente; o teste não lê outro repo por padrão)

TODOS OS CHECKS PASSARAM
rc=0
```

### `git log --oneline main..kit/env-8d` e `git status`
```
a001fde 8d-3: CONTRATO §22, CHANGELOG e PECAS — linkar_env, template sem drift e a pendência do L6
0845dfc 8d-2: template sem drift — zona_proibida só com chaves que o enforcement lê
b985465 8d-1: worktree.linkar_env — com false nenhum .env* do principal entra na worktree, e o evento diz isso
On branch kit/env-8d
Untracked files:
  (use "git add <file>..." to include in what will be committed)
	node_modules

nothing added to commit but untracked files present (use "git add" to track)
```
`node_modules` é o symlink local da worktree e já estava não rastreado no início da sessão. A worktree temporária usada no vermelho (`vermelho-d3ce1b0`) foi removida (`git worktree remove` + `prune`).

## 5. Para o merge humano

`git merge --no-ff kit/env-8d` na main do kit (`d3ce1b0` → `a001fde`, 3 commits). Depois, nos repos instalados: `instalar.sh --atualizar` com o loop pausado, como pede a recusa do dry-run. O dashboard passa a declarar `"worktree": {"linkar_env": false}`, e o rascunho da seção H ainda precisa trocar `"schema": 2` por `"$schema_versao": 2` (fica com você).
