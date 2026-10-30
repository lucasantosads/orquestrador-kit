#!/usr/bin/env bash
# test-painel-visao.sh — a VISÃO GERAL do painel (peça K12, bloco A).
#
# Três repos de fixture, cada um num estado que o painel tem de dizer de relance:
#   alfa  rodando o 530, com prontos, tokens humanos pendentes e bloqueados;
#   beta  pausado há 21h (o comarka-os de 13/09 ficou 11h assim e ninguém viu);
#   gama  sem ticket para pegar: o único pendente espera um bloqueado (o CI de
#         09/09, 12 dias em "ocioso").
# O painel lê SÓ o contrato (STATUS, events, custo, liberações, tickets) e a
# lista de repos vem do arquivo de config (ORQ_REPOS), sem ramo por nome.
#
# Uso: bash scripts/orquestrador/test-painel-visao.sh

set -uo pipefail
AQUI="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

export ORQ_TESTE=1
ORQ_EXEC_ROOT="$(mktemp -d)/repos"; export ORQ_EXEC_ROOT
TMP="$(dirname "$ORQ_EXEC_ROOT")"
trap 'rm -rf "$TMP"' EXIT
# shellcheck source=test-fixture-painel.sh
source "$AQUI/test-fixture-painel.sh"
set +e

FALHAS=0
ok()    { printf '  ok    %s\n' "$*"; }
falha() { printf '  FALHA %s\n' "$*"; FALHAS=$((FALHAS + 1)); }
confere() { # confere <descrição> <esperado> <obtido>
  if [ "$2" = "$3" ]; then ok "$1"; else falha "$1: esperado '$2', veio '$3'"; fi
}

AGORA="$(fp_epoch_hoje 12:00:00)"; export ORQ_PAINEL_AGORA="$AGORA"
# launchctl falso e job DESCARREGADO: os alarmes de launchd são do bloco D.
fp_launchctl_stub "$TMP"; touch "$TMP/stub-descarregado"
ONTEM=$((AGORA - 86400))

# --- alfa: rodando ------------------------------------------------------------
A="$ORQ_EXEC_ROOT/alfa"; fp_repo "$A"
fp_ticket "$A" 520 done
fp_ticket "$A" 530 em_execucao
for i in 531 532 533 534; do fp_ticket "$A" "$i" pendente; done
fp_ticket "$A" 600 pendente '["humano:cred-evo"]'
fp_ticket "$A" 601 pendente '["600"]'
fp_ticket "$A" 602 pendente '["601"]'
fp_ticket "$A" 610 pendente '["humano:grupo-wa"]'
fp_ticket "$A" 700 bloqueado '[]' '{"notas_status": "repetição: 2ª reprovação igual à anterior\nsegunda linha do motivo", "tentativas": 2}'
fp_ticket "$A" 701 bloqueado '[]' '{"notas_status": "fora_do_pathspec: src/x.ts (texto que NÃO decide categoria)"}'
fp_ticket "$A" 702 bloqueado '[]' '{"notas_status": "bloqueado à mão: remove a aba que funciona hoje"}'
fp_evento "$A" $((ONTEM + 100)) 520 APROVADO merge=aguardando dur=300s attempt=1
fp_evento "$A" $((AGORA - 7200)) 700 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=40
fp_evento "$A" $((AGORA - 7100)) 700 BLOQUEADO motivo=repeticao sub=gate_testes diff=40 attempt=2
fp_evento "$A" $((AGORA - 5000)) 701 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=10
fp_evento "$A" $((AGORA - 4900)) 701 BLOQUEADO motivo=criterio_qualidade attempt=2
fp_evento "$A" $((AGORA - 3000)) 585 APROVADO merge=aguardando dur=400s attempt=1
fp_evento "$A" $((AGORA - 2000)) 586 APROVADO merge=aguardando dur=500s attempt=2
fp_evento "$A" $((AGORA - 360)) 530 INICIO attempt=1 model=sonnet
fp_status "$A" executando "530 t-530 · tentativa 1/3" "$(fp_fmt $((AGORA - 360)))" "586 APROVADO $(fp_fmt $((AGORA - 2000))) (500s)"

# --- beta: pausado há 21h -----------------------------------------------------
B="$ORQ_EXEC_ROOT/beta"; fp_repo "$B"
fp_ticket "$B" 100 pendente
printf '%s | leva de tickets da tarde\n' "$(fp_fmt $((AGORA - 21 * 3600)) '%Y-%m-%d %H:%M')" > "$B/docs/fila/PAUSAR"
fp_evento "$B" $((AGORA - 21 * 3600 + 300)) --- DRENAGEM_INICIO alvo=staging-auto motivo=pausado
fp_status "$B" ocioso — — — pausado

# --- gama: sem ticket para pegar ----------------------------------------------
G="$ORQ_EXEC_ROOT/gama"; fp_repo "$G"
fp_ticket "$G" 243 bloqueado '[]' '{"notas_status": "adiado 4 vezes: timeout (rc=124, 9s de execução)"}'
fp_ticket "$G" 244 pendente '["243"]'
fp_evento "$G" $((AGORA - 5000)) 243 BLOQUEADO motivo=adiamentos n=4 limite=4
fp_evento "$G" $((AGORA - 1140)) --- DRENAGEM_INICIO alvo=staging-auto processaveis=0
fp_evento "$G" $((AGORA - 1140)) --- OCIOSO pendentes=1 244=dependencia:243:bloqueado
fp_evento "$G" $((AGORA - 1140)) --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=0 refatiar=0 sem_progresso=0 dur=0min
fp_status "$G" ocioso — — "243 BLOQUEADO 10:36:40" "sem ticket processável: 244 espera 243 (bloqueado)"

export ORQ_REPOS="$TMP/repos.json"
fp_repos "$ORQ_REPOS" "$A" "$B" "$G"

echo "== 0. pendentes_razoes: a régua do OCIOSO, com o processável dito 'pronto' =="
raz="$(cd "$A" && ORQ_EXEC_ROOT="$A" LOCAL_LOOP_SOURCED=1 bash -c 'source "$1/local-loop.sh"; set +e; pendentes_razoes "" ""' _ "$AQUI" 2>/dev/null)"
case "$raz" in *"531 pronto"*) ok "531 pronto" ;; *) falha "531 sem 'pronto': $raz" ;; esac
case "$raz" in *"601 dependencia:600:pendente"*) ok "601 espera 600" ;; *) falha "razão do 601 ausente" ;; esac
oc="$(cd "$A" && ORQ_EXEC_ROOT="$A" LOCAL_LOOP_SOURCED=1 bash -c 'source "$1/local-loop.sh"; set +e; ocioso_razoes "" ""; echo "rc=$?"' _ "$AQUI" 2>/dev/null)"
confere "ocioso_razoes segue com rc 1 quando há processável" "rc=1" "$(printf '%s' "$oc" | tail -1)"

echo
echo "== 1. o estado sai do painel, lido só do contrato =="
EST="$TMP/estado.json"
fp_painel --estado > "$EST" 2> "$TMP/err"; rc=$?
confere "painel --estado sai 0" 0 "$rc"
[ -s "$TMP/err" ] && sed 's/^/  stderr: /' "$TMP/err"
confere "3 repos, na ordem do repos.json" "alfa beta gama" "$(jq -r '[.repos[].nome] | join(" ")' "$EST" 2>/dev/null)"

echo
echo "== 2. Precisa de você: tokens ordenados por quantos pendentes destravam =="
confere "1º item: humano:cred-evo" "humano:cred-evo" "$(jq -r '.precisa[0].token' "$EST" 2>/dev/null)"
confere "cred-evo destrava 3 (600, e 601 e 602 atrás dele)" 3 "$(jq -r '.precisa[0].destrava' "$EST" 2>/dev/null)"
confere "tickets destravados por cred-evo" "600 601 602" "$(jq -r '.precisa[0].tickets | join(" ")' "$EST" 2>/dev/null)"
confere "2º item: humano:grupo-wa destrava 1" "humano:grupo-wa 1" "$(jq -r '.precisa[1] | "\(.token) \(.destrava)"' "$EST" 2>/dev/null)"
confere "o item diz de qual repo é" alfa "$(jq -r '.precisa[0].repo' "$EST" 2>/dev/null)"

echo
echo "== 3. estado em linguagem direta, com tempo =="
confere "alfa: tipo" rodando "$(jq -r '.repos[0].estado.tipo' "$EST" 2>/dev/null)"
confere "alfa: frase" "rodando 530 há 6 min" "$(jq -r '.repos[0].estado.titulo' "$EST" 2>/dev/null)"
case "$(jq -r '.repos[0].estado.detalhe' "$EST" 2>/dev/null)" in
  *"tentativa 1/3"*"586 APROVADO"*) ok "alfa: tentativa e último resultado" ;;
  *) falha "alfa: detalhe sem tentativa/último: $(jq -r '.repos[0].estado.detalhe' "$EST")" ;; esac
confere "beta: tipo" pausado "$(jq -r '.repos[1].estado.tipo' "$EST" 2>/dev/null)"
confere "beta: frase" "pausado por você há 21h" "$(jq -r '.repos[1].estado.titulo' "$EST" 2>/dev/null)"
case "$(jq -r '.repos[1].estado.detalhe' "$EST" 2>/dev/null)" in
  *"leva de tickets da tarde"*) ok "beta: o motivo da pausa" ;; *) falha "beta: sem o motivo" ;; esac
confere "gama: tipo" travado "$(jq -r '.repos[2].estado.tipo' "$EST" 2>/dev/null)"
confere "gama: frase" "sem ticket para pegar há 19 min" "$(jq -r '.repos[2].estado.titulo' "$EST" 2>/dev/null)"
case "$(jq -r '.repos[2].estado.detalhe' "$EST" 2>/dev/null)" in
  *"244 espera 243 (bloqueado)"*) ok "gama: por que não pega" ;; *) falha "gama: sem a razão: $(jq -r '.repos[2].estado.detalhe' "$EST")" ;; esac
confere "cada estado tem rótulo em texto, não só cor" "rodando pausado travado" "$(jq -r '[.repos[].estado.rotulo] | join(" ")' "$EST" 2>/dev/null)"

echo
echo "== 4. o dia: aprovados contra reprovas (ontem não conta) =="
confere "alfa: 2 aprovados, 2 reprovas" "2 2" "$(jq -r '.repos[0].dia | "\(.aprovados) \(.reprovas)"' "$EST" 2>/dev/null)"
confere "alfa: contagem da fila" "4 8 3" "$(jq -r '.repos[0].contagem | "\(.prontos) \(.pendentes) \(.bloqueados)"' "$EST" 2>/dev/null)"

echo
echo "== 5. próximos: os 3 primeiros da fila, com título =="
confere "ids na ordem do loop" "531 532 533" "$(jq -r '[.repos[0].proximos[].id] | join(" ")' "$EST" 2>/dev/null)"
confere "com título" "t-531" "$(jq -r '.repos[0].proximos[0].titulo' "$EST" 2>/dev/null)"
confere "e mais 1" 1 "$(jq -r '.repos[0].proximos_resto' "$EST" 2>/dev/null)"

echo
echo "== 6. bloqueados: categoria de motivo e sub, nunca da prosa =="
cat_de() { jq -r --arg id "$1" '.bloqueados[] | select(.id == $id) | .categoria' "$EST" 2>/dev/null; }
confere "700 (repeticao sub=gate_testes) é teste" teste "$(cat_de 700)"
confere "701 (criterio_qualidade, último sub=juiz) é juiz, apesar de 'fora_do_pathspec' na nota" juiz "$(cat_de 701)"
confere "702 (bloqueado sem BLOQUEADO na trilha) é decisão sua" "decisão sua" "$(cat_de 702)"
confere "243 (adiamentos) é ambiente" ambiente "$(cat_de 243)"
confere "primeira linha do motivo" "repetição: 2ª reprovação igual à anterior" "$(jq -r '.bloqueados[] | select(.id == "700") | .motivo' "$EST" 2>/dev/null)"
confere "o resto fica para o clique" "segunda linha do motivo" "$(jq -r '.bloqueados[] | select(.id == "700") | .motivo_resto' "$EST" 2>/dev/null)"
confere "4 bloqueados nos 3 repos, cada um com o repo" "alfa alfa alfa gama" "$(jq -r '[.bloqueados[].repo] | sort | join(" ")' "$EST" 2>/dev/null)"

echo
echo "== 7. nenhum ramo por nome de repo =="
C="$ORQ_EXEC_ROOT/comarka-operacional"; cp -R "$G" "$C"
fp_repos "$TMP/repos2.json" "$C"
e2="$(ORQ_REPOS="$TMP/repos2.json" fp_painel --estado 2>/dev/null | jq -c '.repos[0].estado | del(.titulo_curto)')"
e1="$(jq -c '.repos[2].estado | del(.titulo_curto)' "$EST" 2>/dev/null)"
confere "o mesmo repo com outro nome dá o mesmo estado" "$e1" "$e2"
nomes="$(grep -nE 'comarka|actus|conteudos' "$AQUI/orq-painel.py" 2>/dev/null)"
[ -z "$nomes" ] && ok "orq-painel.py não cita nome de repo" || falha "orq-painel.py cita repo: $nomes"
[ -f "$AQUI/orq-painel.py" ] && ! grep -nE 'meta\.json|local-loop\.log|launchd\.log' "$AQUI/orq-painel.py" | grep -vE '^[0-9]+:[[:space:]]*#' | grep -q . \
  && ok "orq-painel.py não lê meta.json nem log livre" || falha "orq-painel.py ausente ou lê formato livre"

echo
echo "== 8. repos.json ausente: a tela diz o que falta, não quebra =="
e3="$(ORQ_REPOS="$TMP/nao-existe.json" fp_painel --estado 2>/dev/null)"
case "$(printf '%s' "$e3" | jq -r '.repos_erro' 2>/dev/null)" in
  *"nao-existe.json"*) ok "repos_erro nomeia o arquivo" ;; *) falha "sem repos_erro: $e3" ;; esac

echo
echo "== 9. a página: atualiza a cada 15 s e tem as seções =="
pag="$(fp_painel --html 2>/dev/null)"
for s in 'Precisa de você' 'Bloqueados' '/api/estado' '15000'; do
  case "$pag" in *"$s"*) ok "página contém '$s'" ;; *) falha "página sem '$s'" ;; esac
done

echo
echo "== 10. razões que não se apuram: a faixa diz quem ficou fora da conta (K12-G) =="
# gama2: config ilegível, o motor nem carrega; e todos, com o tempo das razões
# curto demais (o comarka-operacional, 92 pendentes, passou dos 60 s)
Q="$ORQ_EXEC_ROOT/quebrado"; fp_repo "$Q"; fp_ticket "$Q" 300 pendente
echo '{ ilegível' > "$Q/docs/fila/000-config.json"
fp_repos "$TMP/r-g.json" "$A" "$Q"
eg="$(ORQ_REPOS="$TMP/r-g.json" fp_painel --estado 2>/dev/null)"
confere "os tokens do alfa continuam na faixa" "humano:cred-evo" "$(printf '%s' "$eg" | jq -r '.precisa[0].token')"
confere "a faixa diz qual repo ficou fora da conta" quebrado "$(printf '%s' "$eg" | jq -r '[.precisa_fora[].repo] | join(" ")')"
case "$(printf '%s' "$eg" | jq -r '.precisa_fora[0].erro')" in *000-config.json*) ok "e por quê" ;; *) falha "precisa_fora sem o erro" ;; esac
fp_repos "$TMP/r-g2.json" "$A" "$G"
eg2="$(ORQ_REPOS="$TMP/r-g2.json" ORQ_PAINEL_RAZOES_TIMEOUT=0.01 fp_painel --estado 2>/dev/null)"
confere "timeout: nenhum token apurado" 0 "$(printf '%s' "$eg2" | jq -r '.precisa | length')"
confere "timeout: os dois repos fora da conta" "alfa gama" "$(printf '%s' "$eg2" | jq -r '[.precisa_fora[].repo] | join(" ")')"
case "$(printf '%s' "$eg2" | jq -r '.precisa_fora[0].erro')" in *"passou de"*pendentes*) ok "o erro diz o tempo e quantos pendentes" ;; *) falha "erro do timeout: $(printf '%s' "$eg2" | jq -r '.precisa_fora[0].erro')" ;; esac
confere "o cartão mostra o erro" true "$(printf '%s' "$eg2" | jq -r '.repos[0].erro | test("passou de")')"
confere "sem razões, prontos é desconhecido, não zero" null "$(printf '%s' "$eg2" | jq -r '.repos[1].contagem.prontos')"
confere "gama ocioso sem razões: o cartão não diz 'sem ticket para pegar'" sem_dado "$(printf '%s' "$eg2" | jq -r '.repos[1].estado.tipo')"
confere "alfa segue rodando: isso vem do STATUS, não das razões" rodando "$(printf '%s' "$eg2" | jq -r '.repos[0].estado.tipo')"
pag="$(fp_painel --html 2>/dev/null)"
case "$pag" in *"Não consegui apurar"*) ok "a página tem a frase de quem ficou fora" ;; *) falha "a página só sabe dizer 'nenhum token'" ;; esac

echo
echo "== 11. motivo longo: primeira frase ou 160 caracteres, o resto no clique (K12-H) =="
# PROCEDÊNCIA: notas_status do ticket 243 do conteudos-infinitos, copiado em
# 23/09/2026, versão 2dd9674 (21/09). 1354 caracteres numa linha só; a tabela
# o mostrava inteiro.
H="$ORQ_EXEC_ROOT/eta"; fp_repo "$H"
cat > "$TMP/notas-243.txt" <<'NOTAS'
repetição: 2ª reprovação igual à anterior (sub=juiz, diff=255), sem 3ª volta. critério(s) reprovado(s): juiz: Dois testes de ausência em apps/web/test/aprovar-publico.test.tsx não têm controle positivo no mesmo render: 'não mostra persona, ângulo, score nem link' (~l.135) só usa not.toMatch, e 'o token só aparece no campo escondido' (~l.147) passaria mesmo sem nenhum campo escondido, porque nunca afirma que o input hidden com o TOKEN existe nem que o gancho aparece. Além disso, page.tsx:18 apenas esconde com CSS (`body > header { display: none }`) a barra do app que o layout raiz monta, então o menu e os links internos continuam no HTML entregue a quem tem o link, e o teste renderiza a página sem o layout, sem ver isso.; CRITÉRIO DE AUSÊNCIA EXIGE CONTROLE POSITIVO. Um teste que só afirma que algo NÃO aparece passa igual quando o componente não renderiza nada. Exija, no MESMO render/execução, ao menos uma asserção POSITIVA de que a coisa certa apareceu. Reprove ausência provada no vazio.; QUEM TEM O LINK VE UM ROTEIRO, E MAIS NADA. Abra apps/web/src/app/aprovar/[token]/page.tsx e confira que a tela mostra exatamente roteiro, legenda e resultado da checagem do Provimento 205. REPROVE qualquer nome de persona, angulo, score, nome do escritorio, contagem, lista de outros roteiros, menu, cabecalho do app ou link para qualquer outra tela
NOTAS
fp_ticket "$H" 243 bloqueado '[]' "$(jq -n --rawfile n "$TMP/notas-243.txt" '{notas_status: ($n | rtrimstr("\n"))}')"
# sem frase curta: uma linha de 300 caracteres sem ponto
fp_ticket "$H" 244 bloqueado '[]' "{\"notas_status\": \"$(printf 'palavra%.0s ' $(seq 1 40))fim\"}"
fp_repos "$TMP/r-h.json" "$H"
eh="$(ORQ_REPOS="$TMP/r-h.json" fp_painel --estado 2>/dev/null)"
m243="$(printf '%s' "$eh" | jq -r '.bloqueados[] | select(.id == "243") | .motivo')"
confere "243: a primeira frase" "repetição: 2ª reprovação igual à anterior (sub=juiz, diff=255), sem 3ª volta." "$m243"
confere "243: o texto inteiro fica para o clique" "$(tr -d '\n' < "$TMP/notas-243.txt")" "$(printf '%s' "$eh" | jq -r '.bloqueados[] | select(.id == "243") | .motivo_inteiro')"
m244="$(printf '%s' "$eh" | jq -r '.bloqueados[] | select(.id == "244") | .motivo')"
n244="$(printf '%s' "$m244" | wc -m | tr -d ' ')"
[ "$n244" -le 161 ] && ok "244 sem ponto: cortado em até 160 caracteres mais '…' ($n244)" || falha "244 com $n244 caracteres"
case "$m244" in *"…") ok "o corte avisa com '…'" ;; *) falha "o corte não avisa: '$m244'" ;; esac
case "$m244" in *"palavr…"|*" …") falha "cortou no meio da palavra: '$m244'" ;; *) ok "o corte cai entre palavras" ;; esac
confere "700 (motivo curto em duas linhas) segue igual" "repetição: 2ª reprovação igual à anterior" "$(jq -r '.bloqueados[] | select(.id == "700") | .motivo' "$EST")"
case "$pag" in *"motivo_inteiro"*) ok "a página abre o texto inteiro no clique" ;; *) falha "a página não usa motivo_inteiro" ;; esac

echo
echo "== 12. bloqueados: filtro por repo, junto com o de categoria (K12-I) =="
confere "contagem por repo, na ordem do repos.json, com o zero" "alfa:3 beta:0 gama:1" \
  "$(jq -r '[.bloqueados_por_repo[] | "\(.repo):\(.n)"] | join(" ")' "$EST" 2>/dev/null)"
# O JS de VERDADE da página, rodado no node com um DOM mínimo: o clique passa
# pelo handler real, e a atualização de 15 s é um segundo render com estado novo.
fp_painel --html | python3 -c 'import sys, re; print(re.search(r"<script>(.*)</script>", sys.stdin.read(), re.S).group(1))' > "$TMP/pagina.js"
# a atualização traz dois bloqueados novos de categoria teste: o 798 no alfa
# (tem de aparecer: o render usou o estado novo) e o 799 no gama (tem de ficar de
# fora: o filtro de repo sobreviveu)
jq '.bloqueados += [(.bloqueados[0] | .id = "798"), (.bloqueados[0] | .id = "799" | .repo = "gama")] | .gerado_em = "depois"' "$EST" > "$TMP/estado2.json"
cat > "$TMP/dom.js" <<'JS'
const fs = require('fs'), vm = require('vm');
const [pagina, e1, e2] = process.argv.slice(2).map(f => fs.readFileSync(f, 'utf8'));
const reg = {}; let clique = null;
class El { constructor(id){ this.id = id || ''; this.innerHTML = ''; this.children = []; this.dataset = {}; this.hidden = false; if (id) reg[id] = this; }
  get childElementCount(){ return this.children.length; } appendChild(c){ this.children.push(c); if (c.id) reg[c.id] = c; return c; }
  querySelectorAll(){ return []; } set textContent(v){ this.innerHTML = v; } }
new El('app'); new El('falha');
const ctx = { console, location: { hash: '' }, setInterval(){}, fetch: async () => { throw new Error('sem rede'); },
  window: { addEventListener(){} },
  document: { getElementById: id => reg[id] || null, createElement: () => new El(), addEventListener: (t, f) => { if (t == 'click') clique = f; } } };
vm.createContext(ctx);
vm.runInContext(pagina + '\n;globalThis.__t = { set: e => { EST = e; }, render, filtros: () => [FILTRO, typeof FILTRO_REPO == "undefined" ? null : FILTRO_REPO] };', ctx);
const t = ctx.__t, ids = () => [...reg['s-bloq'].innerHTML.matchAll(/<tr><td><span class="mono">([^<]+)</g)].map(m => m[1]).join(' ');
const clicar = (attr, v) => clique({ target: { closest: sel => sel.includes(attr) ? { dataset: { [attr == 'data-repo-filtro' ? 'repoFiltro' : 'filtro']: v }, disabled: false } : null } });
t.set(JSON.parse(e1)); t.render();
console.log('antes=' + ids());
const chips = reg['s-bloq'].innerHTML;
console.log('chip_beta_desabilitado=' + /data-repo-filtro="beta"[^>]*disabled/.test(chips));
console.log('chip_beta_com_zero=' + /data-repo-filtro="beta"[^>]*>[^<]*beta[^<]*0/.test(chips));
clicar('data-repo-filtro', 'gama'); console.log('gama=' + ids());
clicar('data-repo-filtro', 'alfa'); console.log('alfa=' + ids());
clicar('data-filtro', 'teste'); console.log('alfa+teste=' + ids());
t.set(JSON.parse(e2)); t.render(); console.log('apos_atualizar=' + ids() + ' filtros=' + t.filtros().join(','));
JS
out="$(node "$TMP/dom.js" "$TMP/pagina.js" "$EST" "$TMP/estado2.json" 2>&1)"
v() { printf '%s\n' "$out" | sed -n "s/^$1=//p"; }
confere "sem filtro: todos os bloqueados" "700 701 702 243" "$(v antes)"
confere "chip de repo sem bloqueado fica, desabilitado" true "$(v chip_beta_desabilitado)"
confere "e mostra o 0" true "$(v chip_beta_com_zero)"
confere "clique em gama: só o 243" 243 "$(v gama)"
confere "clique em alfa: os 3 do alfa" "700 701 702" "$(v alfa)"
confere "alfa + categoria teste: os dois filtros juntos" 700 "$(v alfa+teste)"
confere "a atualização de 15 s mantém repo e categoria" "700 798 filtros=teste,alfa" "$(v apos_atualizar)"
printf '%s\n' "$out" | grep -qiE 'error|exception' && printf '%s\n' "$out" | sed 's/^/  node: /' || true

echo
echo "== launchctl: só o stub, nunca o do sistema (K12-E) =="
fp_launchctl_confere

echo
[ "$FALHAS" = 0 ] && { echo "TODOS OS CHECKS PASSARAM"; exit 0; }
echo "$FALHAS CHECK(S) FALHARAM"; exit 1
