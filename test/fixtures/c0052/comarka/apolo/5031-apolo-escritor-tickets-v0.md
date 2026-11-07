# Ticket 5031: Escritor de tickets v0: lê o plano do Apolo e escreve ticket que passa no validar-fila.py

> Reescrito em 14/10/2026 a partir do 1131 para a separacao de loops (6df04cc): loop apolo.

> Fonte de máquina é o bloco ```json. A prosa é para humanos.

## Objetivo (prosa)

Item F0-13, primeiro kernel da fábrica (01-ARQUITETURA#10). Um script lê a semente do item no 04-ROADMAP, a seção do `plano_secao`, os princípios, o glossário, o `_TEMPLATE.md` e dois tickets de referência, pede o ticket ao modelo (OpenAI) e grava `docs/fila/<id>-<slug>.md`. Em seguida roda `validar-fila.py <id>`; com ERRO, devolve os erros ao modelo uma vez; ainda com ERRO, apaga o arquivo e sai com código 1.

Todo ticket escrito nasce com a dependência `humano:revisao-escritor-<id>`: o loop não pega sem o Lucas ler. O critério deste ticket roda com resposta gravada (`--resposta-fixture`), sem gastar token; os 10 tickets do gate F0 são gerados pelo Lucas depois.

## Recon de 14/10 (origin/main 3a39865 = staging-auto eceecf8 nos caminhos citados, só leitura)

```
docs/plano/apolo/04-ROADMAP.md:49-70  sementes F0 no formato 'id | título | plano_secao | classe | critério'
docs/fila/_TEMPLATE.md · docs/fila/1111-alerta-regra-conta-parada-sql.md · docs/fila/1112-resumo-semanal-botao-na-relacao.md (referências de formato)
scripts/validar-fila.py <id> (rc 0 = sem ERRO)
```

## Campos de máquina

```json
{
  "id": "5031",
  "slug": "apolo-escritor-tickets-v0",
  "loop": "apolo",
  "lane": "apolo",
  "perfil": "docs",
  "plano_item": "F0-13",
  "plano_secao": "01-ARQUITETURA#10",
  "atualiza_plano": "nao",
  "objetivo": "PASSO 0 (regra .claude/rules/apolo.md): leia docs/plano/apolo/00-PRINCIPIOS.md inteiro, o bloco 'Estado agora' e o lote F0 de docs/plano/apolo/04-ROADMAP.md, os ADRs de docs/plano/apolo/adr/, as ultimas 30 linhas de docs/plano/apolo/aprendizados.md, docs/plano/apolo/glossario.md e a secao do plano_secao deste ticket. ORCAMENTO DE DIFF: teto de 420 linhas. Se passar do teto, pare e reporte. PASSO 1: leia docs/fila/_TEMPLATE.md, os tickets 1111 e 1112 (formato) e docs/fila/apolo/5023-apolo-worker-cron.md (formato do loop apolo: loop, plano_secao, atualiza_plano), scripts/validar-fila.py (docstring e main) e o lote F0 do 04-ROADMAP. FAZER: (1) NOVO scripts/apolo/escritor-tickets.py (python3, so stdlib): argumentos --item F0-xx (obrigatorio), --id <id> (obrigatorio; o script recusa id fora de 5000..5999, a faixa do loop apolo, e id que ja existe em docs/fila ou docs/fila/apolo), --resposta-fixture <arquivo> (usa o JSON do arquivo no lugar da chamada ao modelo), --sem-validar, --modelo (default do env APOLO_ESCRITOR_MODELO, senao 'gpt-5.4-mini'). Monta o contexto: a linha da semente do item (procura '^<item> |' nos blocos do 04-ROADMAP), o plano_secao dela, o texto da secao (arquivo e ancora, mesma regra de _arquivo_do_plano/_secao_existe em scripts/validar-fila.py), 00-PRINCIPIOS.md, glossario.md, _TEMPLATE.md, 1111 e 1112, e o prompt de scripts/apolo/escritor-prompt-v0.md. Chamada: POST https://api.openai.com/v1/chat/completions com OPENAI_API_KEY do ambiente (sem chave e sem fixture: sai 2 com mensagem, nunca imprime a chave), response_format json_object; a resposta e { titulo, slug, prosa, recon: string, campos: {...bloco json do ticket...} }. O script forca nos campos: id = --id, loop 'apolo', lane 'apolo', plano_item = --item, status 'pendente', notas_status '', e acrescenta 'humano:revisao-escritor-<id>' as dependencias; exige plano_secao e atualiza_plano; grava docs/fila/apolo/<id>-<slug>.md no formato do 1111 (titulo, prosa, recon, campos em bloco json com indent 2). Sem --sem-validar roda `python3 scripts/validar-fila.py <id>`; rc != 0 manda a saida de volta ao modelo uma vez (com fixture nao ha segunda chamada); falhou de novo, apaga o arquivo e sai 1; passou, imprime 'VALIDADO <arquivo>' e sai 0. (2) NOVO scripts/apolo/escritor-prompt-v0.md: as regras que o modelo segue (criterios de rules/fila.md: tsc literal com espera OK, base do diff a mais proxima de HEAD entre staging-apolo e staging-auto (forma dos tickets 50xx), nunca origin/; pathspec_allowlist so com caminhos da ALLOWLIST_APOLO de scripts/validar-fila.py, SO_ALLOWLIST com grep -Fx, NO_TETO, guardas globais; C0 so leitura; schema inteligencia; OpenAI; termos do glossario; sem travessao; .sql so escrito, nunca aplicado). (3) NOVO test/inteligencia/fixtures/escritor-resposta.json: uma resposta de exemplo para o item F0-15 (ticket de docs que so confere docs/plano/apolo/glossario.md e .claude/rules/apolo.md, perfil docs, allowlist so com docs/plano/apolo/glossario.md, com recon e criterios que passam no validar-fila). FORA DE ESCOPO: escolher id sozinho, commitar, rodar o loop, scripts/orquestrador/**. Regras do repo: sem travessao (U+2014); nenhuma escrita nem DDL em zona C0 (clientes_receita, leads_crm*, trafego_*, ads_metadata, ads_performance, vw_*), nem nome dessas tabelas em comentario de .sql; tudo do Apolo nasce no schema inteligencia; credencial de IA e a OpenAI (chamarProvider de src/lib/ia/provider.ts, nunca chave em codigo); termos de docs/plano/apolo/glossario.md, sem sinonimo inventado; sem .json() novo em src (use fetchJson/parseJsonResponse de src/lib/fetch-json.ts); PROIBIDO remover assercao, trocar matcher por toBeDefined, usar .skip/.only/.todo.",
  "cria_novo": [
    "scripts/apolo/escritor-tickets.py",
    "scripts/apolo/escritor-prompt-v0.md",
    "test/inteligencia/fixtures/escritor-resposta.json"
  ],
  "pathspec_allowlist": [
    "scripts/apolo/escritor-tickets.py",
    "scripts/apolo/escritor-prompt-v0.md",
    "test/inteligencia/fixtures/escritor-resposta.json"
  ],
  "dependencias": [
    "1137"
  ],
  "prioridade": 40,
  "recon_esperado": [
    {
      "descricao": "scripts/apolo/escritor-tickets.py ainda nao existe",
      "cmd": "test -e 'scripts/apolo/escritor-tickets.py' && echo EXISTE || echo AUSENTE",
      "espera": "AUSENTE"
    }
  ],
  "criterios_aceite": [
    {
      "descricao": "tsc nao regride alem do baseline de 3 (src/ e test/, sem ruido de .next)",
      "cmd": "( [ \"$(npx tsc --noEmit 2>&1 | grep 'error TS' | grep -vc '^\\.next/')\" = 3 ] ) && echo OK || echo FAIL",
      "espera": "OK",
      "tipo": "guarda"
    },
    {
      "descricao": "so arquivos da allowlist foram tocados",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; r=SO_ALLOWLIST; for f in $(git diff --name-only \"$b\" HEAD); do printf '%s\\n' 'scripts/apolo/escritor-tickets.py' 'scripts/apolo/escritor-prompt-v0.md' 'test/inteligencia/fixtures/escritor-resposta.json' | grep -Fxq \"$f\" || r=FORA_$f; done; echo $r",
      "espera": "SO_ALLOWLIST",
      "tipo": "guarda"
    },
    {
      "descricao": "diff dentro do orcamento (<= 420 linhas somando adicoes e remocoes)",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; t=$(git diff --numstat \"$b\" HEAD | awk '{s+=$1+$2} END {print s+0}'); [ \"$t\" -le 420 ] && echo NO_TETO || echo ESTOUROU_$t",
      "espera": "NO_TETO",
      "tipo": "guarda"
    },
    {
      "descricao": "nenhum .sql novo (zero DDL)",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; n=$(git diff --name-only \"$b\" HEAD | grep -c '[.]sql$'); [ \"$n\" = 0 ] && echo SEM_SQL || echo SQL_$n",
      "espera": "SEM_SQL",
      "tipo": "guarda"
    },
    {
      "descricao": "atualiza_plano nao: nenhum arquivo de docs/plano/apolo/ muda",
      "cmd": "b=\"\"; nb=\"\"; for r in staging-apolo staging-auto; do m=$(git merge-base HEAD \"$r\" 2>/dev/null) || continue; n=$(git rev-list --count \"$m\"..HEAD); if [ -z \"$nb\" ] || [ \"$n\" -lt \"$nb\" ]; then b=$m; nb=$n; fi; done; n=$(git diff --name-only \"$b\" HEAD | grep -c '^docs/plano/apolo/'); [ \"$n\" = 0 ] && echo PLANO_INTOCADO || echo PLANO_MUDOU_$n",
      "espera": "PLANO_INTOCADO",
      "tipo": "guarda"
    },
    {
      "descricao": "guardas globais seguem verdes",
      "cmd": "npx vitest run test/c0-guard.test.ts test/fetch-json-teto.test.ts test/travessao-mudo.test.ts >/dev/null 2>&1 && echo VERDE || echo VERMELHO",
      "espera": "VERDE",
      "tipo": "guarda"
    },
    {
      "descricao": "com a fixture e --sem-validar grava ticket em docs/fila/apolo com loop e lane apolo, plano_item, plano_secao, atualiza_plano e a dependencia de revisao",
      "cmd": "d=docs/fila/apolo; rm -f $d/5990-*.md; python3 scripts/apolo/escritor-tickets.py --item F0-15 --id 5990 --resposta-fixture test/inteligencia/fixtures/escritor-resposta.json --sem-validar >/dev/null 2>&1; f=$(ls $d/5990-*.md 2>/dev/null | head -1); r=$(python3 -c \"import json,re,sys; t=open(sys.argv[1]).read(); j=json.loads(re.search(r'\\x60\\x60\\x60json\\n(.*?)\\n\\x60\\x60\\x60',t,re.S).group(1)); ok=j['lane']=='apolo' and j.get('loop')=='apolo' and j['plano_item']=='F0-15' and j.get('plano_secao') and j.get('atualiza_plano') in ('sim','nao') and 'humano:revisao-escritor-5990' in j['dependencias'] and j['status']=='pendente'; print('TICKET_OK' if ok else 'TICKET_RUIM')\" \"$f\" 2>&1); rm -f $d/5990-*.md; echo $r",
      "espera": "TICKET_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "sem chave e sem fixture sai com codigo 2 sem gravar nada",
      "cmd": "test -f scripts/apolo/escritor-tickets.py || { echo SEM_SCRIPT; exit 0; }; rm -f docs/fila/apolo/5991-*.md; env -u OPENAI_API_KEY python3 scripts/apolo/escritor-tickets.py --item F0-15 --id 5991 >/dev/null 2>&1; rc=$?; n=$(ls docs/fila/apolo/5991-*.md 2>/dev/null | wc -l | tr -d ' '); [ \"$rc\" = 2 ] && [ \"$n\" = 0 ] && echo SEM_CHAVE_OK || echo ST_${rc}_${n}",
      "espera": "SEM_CHAVE_OK",
      "tipo": "alvo"
    },
    {
      "descricao": "id que ja existe na fila apolo e recusado",
      "cmd": "test -f scripts/apolo/escritor-tickets.py || { echo SEM_SCRIPT; exit 0; }; python3 scripts/apolo/escritor-tickets.py --item F0-15 --id 5019 --resposta-fixture test/inteligencia/fixtures/escritor-resposta.json --sem-validar >/dev/null 2>&1; rc=$?; [ \"$rc\" != 0 ] && echo RECUSA_ID || echo ACEITOU",
      "espera": "RECUSA_ID",
      "tipo": "alvo"
    },
    {
      "descricao": "id fora da faixa do loop apolo e recusado",
      "cmd": "test -f scripts/apolo/escritor-tickets.py || { echo SEM_SCRIPT; exit 0; }; python3 scripts/apolo/escritor-tickets.py --item F0-15 --id 99992 --resposta-fixture test/inteligencia/fixtures/escritor-resposta.json --sem-validar >/dev/null 2>&1; rc=$?; n=$(ls docs/fila/99992-*.md docs/fila/apolo/99992-*.md 2>/dev/null | wc -l | tr -d ' '); [ \"$rc\" != 0 ] && [ \"$n\" = 0 ] && echo RECUSA_FAIXA || echo ST_${rc}_${n}",
      "espera": "RECUSA_FAIXA",
      "tipo": "alvo"
    },
    {
      "descricao": "avaliador: escritor v0 monta o contexto do plano para um item do roadmap, chama a OpenAI (ou usa fixture), forca loop/lane/plano_item/status, grava em docs/fila/apolo com id 5000..5999 e a dependencia humano:revisao-escritor-<id>, grava o ticket no formato da fila e o valida com validar-fila.py, apagando o que nao passa. REPROVE se: imprime ou grava chave; escolhe id sozinho; commita; ticket sem a dependencia de revisao; toca o motor.",
      "cmd": "true",
      "espera": "avaliador",
      "tipo": "avaliador"
    }
  ],
  "testes_conferidos": [],
  "status": "done",
  "notas_status": "aprovado (tentativa 1): Escritor monta o contexto do plano (semente, seção, princípios, glossário, template, 1111/1112), chama a OpenAI sem expor a chave, força os campos do loop e a dependência de revisão. Valida, apaga o que reprova e retenta uma vez. Não escolhe id, não commita e não toca o motor."
}
```
