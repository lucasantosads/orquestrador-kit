# Relatório KIT-MIG-A: aplicador de migrations, linha de base e aplicação manual

Sessão: worktree `~/Projetos/_worktrees/kit-mig-a`, branch `kit/mig-a`, a partir de `0917131` (main
do kit). Cinco commits, um por peça. **Nada foi aplicado em banco, nenhum push foi feito e
nenhum valor de segredo foi lido.** Testes só com stub HTTP em 127.0.0.1 e fixtures. Do Comarka
e do dashboard-comercial, só leitura (git com `GIT_OPTIONAL_LOCKS=0`; dos `.env`, só os nomes).
O PASSO 0 e as respostas do chat estão no fim (Anexo A).

## 1. Resumo

`orq migrations` é o único caminho que aplica migration. Funciona por banco (bloco de topo
`migrations.bancos` no `~/.orq/repos.json`), escreve pelo `POST /database/query` da API de gestão,
numa transação implícita, com o insert da versão e do nome do arquivo e
`created_by = 'orq-aplicador:<usuário>'`. Só emite o token depois de conferir a linha no
`schema_migrations`, e o escreve no formato do repo (no Comarka: `.liberadas`, `por: lucas`, a
nota do aplicador), num commit só do arquivo de liberação, com o trailer `Orq-Aplicador:`.

As quatro suítes saem com rc 0 (seção 4): `tsc` limpo, vitest 101 arquivos e 1630 testes,
`test-shell.sh` e `test-instalar.sh`.

Primeiro uso real, do Lucas, depois do merge, no checkout principal do kit:

```bash
# 1. pôr o bloco migrations.bancos no ~/.orq/repos.json (docs/aplicador-migrations.md §1)
orq migrations status
orq migrations sonda comarka
orq migrations linha-base comarka --herdados-desde 20261004
orq migrations plano comarka          # esperado: drift 0, 5 herdados, 1 pendente
orq migrations aplicar comarka-operacional 20261018003100_nps_fila_e_resposta_por_contato.sql
```

## 2. Peças

| Peça | sha | Testes (arquivo: vermelho antes → verde) | Pronto quando cumprido |
|---|---|---|---|
| P1 config por banco | `662e074` | `orquestrador-migrations-config.test.ts`: 5 falham → 5 passam | **sim**: a config real do Comarka e do dashboard (somente_leitura, fora de `.repos[]`) valida e agrupa no banco; o dashboard não entra no `lerRepos`; `banco_id` repetido entre bancos e repo em dois bancos recusados; erro por campo |
| P2 adaptador supabase | `b32d262` | `orquestrador-migrations-supabase.test.ts`: 10 falham → 10 passam | **sim**: stub cobre sucesso (o corpo do POST conferido), erro do Postgres (400), 5xx, timeout, resposta ilegível (incerto), recusa por begin no meio, CONCURRENTLY, VACUUM, ALTER SYSTEM, envelope do 1377 aceito e tirado, sonda, listagem com `created_by`, token mascarado em erro ecoado pelo servidor, na listagem e na falta de credencial, e `ORQ_TESTE` |
| P3 linha de base e plano | `16c84b5` | `orquestrador-migrations-plano.test.ts`: 6 falham → 6 passam | **sim**: fixture real (272 arquivos, 491 linhas). Corte 20261004 → os 6 pendentes e 29 de drift. Corte de hoje (20261018030500) com `--herdados-desde 20261004` → drift 0, 5 herdados e 1 pendente (20261019000100). Plano e drift mostram `created_by` |
| P4 `orq migrations` | `c7539bd` | `orquestrador-migrations-aplicar.test.ts`: 23 falham → 23 passam; resolvedor 105 → 105 | **sim**: cada recusa (16), a trava concorrente (pid vivo recusa, órfã assume), `pre_check` vermelho (sem aplicar) e verde, conferência que falha, erro e incerto sem a linha não emitem token; incerto com a linha emite; o commit tem só `docs/fila/liberacoes.json` com o trailer, e o que estava no índice fica fora; replay no `liberacoes.json` real do Comarka: 325 entradas, a nova igual campo a campo, o resto igual, `numstat` 6 linhas a mais e 0 a menos |
| P5 documentação | `e1d48be` | sem teste (só docs) | **sim**: CONTRATO §19, seção própria "ETAPA MIG-A" no `docs/PECAS.md`, CHANGELOG e `docs/aplicador-migrations.md` |

**Vermelho antes** (cada teste rodado antes do módulo existir; saída crua do resumo):

```
P1  AssertionError: expected null not to be null   ·  Test Files 1 failed (1) · Tests 5 failed (5)
P2  AssertionError: expected null not to be null   ·  Test Files 1 failed (1) · Tests 10 failed (10)
P3  AssertionError: expected null not to be null   ·  Test Files 1 failed (1) · Tests 6 failed (6)
P4  AssertionError: expected null not to be null   ·  Test Files 1 failed (1) · Tests 23 failed (23)
```

O teste importa o módulo num `try` (o padrão dos testes do resolvedor). Sem o módulo, toda
asserção falha em `expect(mod).not.toBeNull()`, e nenhum teste passa por acaso.

**Tetos de linhas que estourei** (o resto ficou dentro):

| Arquivo | Teto | Linhas |
|---|---|---|
| `config.ts` | 160 | 210 (27 são o cabeçalho com o formato) |
| `sql.ts` | 120 | 187 (o leitor de literal/dollar-quote) |
| teste da P4 | 400 | 501 |

Dentro do teto: `supabase.ts` 153, `plano.ts` 121, `aplicar.ts` 187, `cli.ts` 176,
`liberacao.ts` 116, `caminhos.ts` 75. O `arquivos.ts` (48) é um arquivo a mais que o previsto:
a leitura dos refs saiu do `aplicar.ts`.

**Mudança em código existente:** `resolvedor/repo.ts` ganha `comitarUmArquivo` (a porta de
commit de um arquivo, genérica); o `escreverEComitar` passa a chamá-la, com o mesmo
comportamento e as mesmas mensagens. A `GuardaResolvedor` aceita a raiz por parâmetro (padrão
igual). Nenhuma asserção existente mudou; os 105 testes do resolvedor seguem verdes.

## 3. Achados e desvios (leia antes do merge)

1. **Herdados pedem o piso explícito.** "Arquivo sem linha no ledger até o corte" no Comarka são
   **36**, não 5: 31 são de maio a setembro. Para o critério "5 herdados" fechar sem cobrar o
   antigo (decisão 3), a linha de base tem `--herdados-desde`, que por padrão é nenhum. O
   comando do primeiro uso leva `--herdados-desde 20261004`. Os 31 antigos ficam só contados
   (`antigos_sem_ledger`).
2. **O recon contava 7 arquivos aplicados como "sem produção".** Entre 27 e 29/09, 7 migrations
   (ex.: `20260929120000_chave_unica_cliente_id`) foram gravadas com o nome base INTEIRO como
   `name`, e o casamento do recon só comparava o nome sem prefixo. O plano casa também pelo nome
   base, que é como o dashboard grava (`20261006_<nome>`). Por isso são 36 e não 43.
3. **O drift de outubro são 29, mas com 17 `webinar` e 5 `plano_metas`, não 18 e 6** como
   agrupou o `cruzamento-producao.md`. O teste trava a contagem real.
4. **A listagem usa `database/query` com `read_only: true`**, e não o `GET /database/migrations`:
   o GET não devolve `created_by`, que o plano e o drift precisam mostrar.
5. **`created_by` na fixture virou `conector-mcp`.** As 491 linhas reais têm o e-mail da conta;
   a fixture troca pelo que ele significa. Nomes e versões são os reais
   (`test/fixtures/migrations/LEIA-ME.md`).
6. **`20261007190900_churn_fecha_leitura_anon` (ticket 900) não cita token** no `.sql` nem no
   ticket, e ninguém depende dele. Aplicar esse arquivo pede
   `--token humano:migration-900-aplicada`. Os outros 5 de hoje citam o próprio token.
7. **Arquivo que cita dois tokens do molde** (ex.: o token de outra migration como dependência)
   é recusado até vir `--token`. Hoje nenhum dos 6 é assim.
8. **O `pre_check` do Comarka (`checar-promocao.py --aplicar`) lê o banco ele mesmo**, com a
   credencial do `.env.local`. É script do repo e só faz SELECT, mas é uma segunda leitura da
   credencial, fora do aplicador.
9. **`ORQ_MIGRATIONS_HTTP_TIMEOUT_S`** só vale com `ORQ_TESTE=1`, para o teste do timeout. Fora
   de teste, o timeout vem da config do banco.
10. A recusa por `ORQ_TESTE=1` apontando para a API oficial sai como `FALHOU` e não como
    `RECUSADO`: o adaptador é criado depois da trava. Nada é aplicado nem escrito nesse caso.
    Fica registrado como cosmético.

## 4. As quatro suítes, cruas

### 4.1 `npx tsc --noEmit`
```
rc=0
```

### 4.2 `TZ=UTC npx vitest run`
```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-mig-a

 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 29ms
 ✓ test/orquestrador-enforcement.test.ts (47 tests) 47ms
 ✓ test/orquestrador-prevoo.test.ts (35 tests) 15ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3590ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 443ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 419ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 727ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 782ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 403ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 13ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 6428ms
   ✓ aceite do triador (spec 7f-a §7.2) > (A) os 7 R5 e R6 saem firmes, certos e com evidência da medição (estado depois da passada) 382ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 1032ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 1000ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 1102ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 1140ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 1217ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 6870ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 575ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 634ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 564ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 637ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 1214ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 599ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 650ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 1345ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 288ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 7550ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 1482ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 3160ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 1157ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 1327ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 7910ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 511ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 571ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 564ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 522ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 1010ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 549ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 439ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 455ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 577ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 978ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 399ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 542ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 7241ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru 310ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 716ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 428ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 450ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 413ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 608ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 439ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 545ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 437ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 1288ms
 ✓ test/orquestrador-migrations-supabase.test.ts (10 tests) 397ms
   ✓ P2: adaptador supabase > a API > 5xx, timeout e resposta ilegível são estado incerto 314ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1628ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 456ms
 ✓ test/doutrina-v2.test.ts (30 tests) 13ms
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 2156ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 685ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 4409ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 1123ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1822ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 991ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 425ms
 ✓ test/orquestrador-migrations-aplicar.test.ts (23 tests) 13283ms
   ✓ P4: orq migrations aplicar > caminho feliz: aplica, confere, e commita só o liberacoes.json com o trailer (replay no formato real) 1131ms
   ✓ P4: orq migrations aplicar > herdado que só existe na staging: aplica do ref, e a nota diz o ref 631ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > sem sonda, e com a sonda vermelha 348ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > repo só leitura 309ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > arquivo fora do plano (já aplicado) e arquivo que não existe 636ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > arquivo com conteúdo diferente entre os refs 411ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > token: ausente, dois no arquivo, já liberado 970ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > --token explícito vale para o arquivo sem token, e é conferido contra o molde 936ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > pausar_file do repo, docs/fila/.orq-pause e liberacoes modificado na árvore 435ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > SQL recusado (begin no meio) 438ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > ORQ_TESTE=1 apontando para a API oficial 320ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > confirmação errada 478ms
   ✓ P4: orq migrations aplicar > trava por banco: outro processo vivo segura, recusa; trava órfã, assume 699ms
   ✓ P4: orq migrations aplicar > pre_check: vermelho para antes de aplicar; recebe o .sql extraído; verde segue 1146ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > aplicou mas a linha não está no ledger: não emite token 403ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > erro do Postgres: não emite token, e o token não vaza do erro 386ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > incerto sem a linha: não emite token; incerto com a linha: emite 1096ms
   ✓ P4: orq migrations aplicar > a CLI > sem TTY de verdade: o orq recusa antes de qualquer rede 562ms
   ✓ P4: orq migrations aplicar > a CLI > uso: verbo desconhecido sai 2 com o uso 339ms
   ✓ P4: orq migrations aplicar > a CLI > sonda, linha-base (não sobrescreve sem --substituir), plano e status 611ms
 ✓ test/orquestrador-resolvedor-pausa-gate.test.ts (8 tests) 561ms
   ✓ peça 7: veredito da pausa de gate sistêmico > sombra (padrão), nenhum arquivo em comum: falso positivo provável na notificação e no ledger; não retoma 319ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 10068ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 536ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 561ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 523ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 553ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 1292ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 1241ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 1156ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 1175ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 1215ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 1132ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 675ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 12ms
 ✓ test/orq-cli.test.ts (42 tests) 7850ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 435ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 405ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 398ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 447ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 435ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3672ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 585ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 577ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 410ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 701ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 13ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 14034ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 459ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 457ms
   ✓ orcamento_veredito: ok | dia | ticket > teto por ticket atingido => ticket (e só para ESSE ticket) 341ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 2036ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1810ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 410ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 995ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 965ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 882ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1659ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 532ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 763ms
 ✓ test/orquestrador-gate-comarka.test.ts (13 tests) 894ms
   ✓ 7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila > repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda 720ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 7ms
 ✓ test/orquestrador-contexto-juiz-fixtures.test.ts (8 tests) 3801ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE 1232ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (b) helper definido no próprio diff não entra no bloco e aparece UMA vez; o de fora aparece no bloco, no MESMO prompt 1282ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (c) diff sem teste novo: nenhum bloco, prompt igual ao montado sem definições 1282ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 2264ms
 ✓ test/orquestrador-contexto-juiz.test.ts (14 tests) 7661ms
   ✓ run_juiz com contexto_juiz > o critério cita um arquivo fora do diff: o material do juiz passa a conter esse arquivo, rotulado 1198ms
   ✓ run_juiz com contexto_juiz > o conteúdo é o da BASE da tentativa, não o da HEAD 1217ms
   ✓ run_juiz com contexto_juiz > arquivo acima do teto é truncado, e o truncamento está escrito no texto 1262ms
   ✓ run_juiz com contexto_juiz > caminho ausente na base falha ALTO: rc != 0, nome do caminho no log, juiz não roda 559ms
   ✓ run_juiz com contexto_juiz > ticket SEM contexto_juiz: nenhum bloco de referência 1241ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho que existe na branch alvo e não é da allowlist: ok 340ms
   ✓ (d) gate-ticket valida contexto_juiz > não é lista de strings: violação 579ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho que não existe na branch alvo: violação que nomeia o caminho 355ms
   ✓ (d) gate-ticket valida contexto_juiz > caminho listado na allowlist do próprio ticket: violação 368ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 33ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 10294ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 3243ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 419ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 463ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 610ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > STAGING mostra que o push está suprimido (regra 12) 305ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 581ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 579ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 618ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 601ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 304ms
 ✓ test/orquestrador-migrar-config.test.ts (48 tests) 23837ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 593ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 547ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 527ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 578ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 544ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 585ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 1260ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 561ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 614ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 627ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 677ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 537ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 4486ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 3212ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 3663ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 3502ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 620ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 616ms
 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 1024ms
   ✓ 624 · caso real do actus-saas > pelo CLI, o 631[8] do done sai com rc 1 e a mensagem 321ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 2574ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 801ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > ticket só com avisos: rc 0, e --violacoes não imprime nada 571ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > o mesmo ticket com 6q em erro pelo config: rc 1 e a linha na saída de --violacoes 383ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 14685ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 1006ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1739ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4759ms
   ✓ peça 3: ações R1 e R5 com as travas > com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo 814ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 1049ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 859ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 942ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa 679ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 1109ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 832ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 em sombra: só a proposta com o diff, o repo intocado 740ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 8ms
 ✓ test/orquestrador-migrations-plano.test.ts (6 tests) 27ms
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 265ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 11613ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 692ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 7121ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 953ms
 ✓ test/orq-versao-config.test.ts (16 tests) 4058ms
   ✓ orq config > config do fixture (limpo): rc 0 e diz que está preenchido 303ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 418ms
 ✓ test/orquestrador-gate-regex-exemplos.test.ts (11 tests) 1536ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (a) regex VELHO (classe com \[\]) com os exemplos do 503 REPROVA pela regra 5 e pela regra 3 311ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (b) regex NOVO com os mesmos exemplos PASSA: zero violações e o ticket no relatório como OK 581ms
   ✓ 624 · falha alta > (f) /usr/bin/grep ausente: o gate NÃO passa, sai com rc 2 dizendo o binário 519ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1628ms
   ✓ peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real 356ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1017ms
 ✓ test/orquestrador-gate-8a.test.ts (20 tests) 4522ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido 416ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts 591ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos 832ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava) 705ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > lê a branch_alvo, não o disco do checkout 420ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > "dentro" é matchesAllowlist: glob da allowlist cobre o teste 394ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida) 453ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > --relatorio lista os testes vizinhos do ticket (insumo da 8c) 676ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 4635ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > a trilha diz o que os gates disseram, e build sai como nao-configurado 465ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 476ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate CONFIGURADO que não chegou a rodar continua nao-rodou 507ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 587ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 556ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 561ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 505ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 541ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 437ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 2028ms
   ✓ datadorGit contra um repo de verdade, com dois commits > cada token recebe a data e o autor do commit que o INTRODUZIU 335ms
   ✓ datadorGit contra um repo de verdade, com dois commits > a data do MAIS VELHO vence: mexer na linha depois não redata o token 335ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > o v2 gravado sai datado, e o relatório diz quantos 364ms
   ✓ a migração inteira, ponta a ponta, no repo de verdade > rodar de novo é no-op: já datado, nada muda 368ms
 ✓ test/orquestrador-gates-fonte-unica.test.ts (8 tests) 2919ms
   ✓ 626 (a): gates.ts executa na worktree e lê o config da main > config da main com typecheck + typecheck_scripts e worktree só com typecheck: os DOIS rodam; a linha GATE sai typecheck=ok 635ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (b) typecheck ok e typecheck_scripts ausente do gates.txt: typecheck=ok e gates_ausentes=typecheck_scripts na linha GATE e no STATUS.md 350ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (c) gate que rodou e falhou continua dando falha, mesmo com o outro do papel ok 400ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (d) papel sem nenhum gate executado continua nao-rodou 390ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (e) sem ausentes a linha GATE é byte a byte a de hoje, com typecheck=ok testes=ok build=ok 384ms
   ✓ 626: gates_ausentes no STATUS.md > STATUS.md: gates_ausentes vazio não imprime a linha, e ESTADO e TICKET continuam no mesmo render 318ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 7386ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 382ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 369ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > STATUS.md fica ocioso com MOTIVO pausado 369ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > a trilha registra a drenagem pausada, com par início/fim 397ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 374ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 785ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o sentinela legado (.orq-pause) continua pausando 373ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 1157ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 1043ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 461ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 396ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 433ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 426ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 416ms
 ✓ test/orquestrador-pacotes.test.ts (8 tests) 2716ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > árvore do CI simulada: os 9 pacotes, na ordem do código antigo 337ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules da raiz como SYMLINK para diretório de fora: é pacote, e a worktree ganha o link 547ms
   ✓ limpa_cache_vite purga o .vite de todo pacote detectado > apaga na raiz E nos pacotes aninhados, e não toca no resto 319ms
   ✓ a lista de pacotes é a MESMA que o linkador de worktree usa > linka node_modules de cada pacote detectado dentro da worktree 372ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2915ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2320ms
   ✓ o que NÃO mudou > saída rc!=0 sem sinal continua registrando, sem campo `sinal` 302ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 6ms
 ✓ test/orquestrador-sub-repeticao.test.ts (16 tests) 7ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 12ms
 ✓ test/orquestrador-resolvedor-r1-multi.test.ts (7 tests) 8141ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1054: os dois vermelhos firmes, um commit só, a allowlist do humano 1636ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1055b: os dois vermelhos firmes, um commit só, a allowlist do humano 1195ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1058: os dois vermelhos firmes, um commit só, a allowlist do humano 1161ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 924a: um dos vermelhos não cumpre D6 nem D6b sozinho, nenhuma ação (nem para o outro) 853ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > o mesmo bloqueio de novo depois de uma ação vai para humano, mesmo com o ticket reescrito 1216ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > outra série: a segunda ação no ticket acontece 1167ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > com 2 ações no ticket, a terceira vira só aviso 911ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 886ms
   ✓ ticket_set reescreve SÓ o primeiro bloco > trocar o status não duplica nem toca o bloco da prosa 302ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 30081ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 8911ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 468ms
   ✓ o fallback em arquivo é escrito SEMPRE > osascript que falha não derruba a drenagem e o arquivo continua valendo 327ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 450ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 700ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 466ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 691ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 1248ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 5465ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 2866ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 1599ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 1171ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 966ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 1294ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 1525ms
   ✓ saída sem drenagem NUNCA notifica > lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log 390ms
   ✓ deve_notificar: a regra, isolada > processou ≥ 1: notifica, qualquer que seja o motivo do fim 403ms
   ✓ deve_notificar: a regra, isolada > zero processados por pausa, cooldown ou sem progresso: cala sempre 393ms
 ✓ test/orquestrador-base-vermelha.test.ts (4 tests) 20728ms
   ✓ 632: base vermelha > sequência do 510c: FAIL só no 0283 bloqueia com base_vermelha, sem juiz, sem retry e sem consumir tentativa 4517ms
   ✓ 632: base vermelha > contra-teste: FAIL num arquivo DA allowlist segue o caminho de hoje (REPROVADO criterio_qualidade, sem base_vermelha) 5342ms
   ✓ 632: base vermelha > contra-teste: typecheck reprovado junto segue o caminho de hoje, sem base_vermelha 5206ms
   ✓ 632: base vermelha > contra-teste: saída de testes sem linha FAIL reconhecível segue o caminho de hoje 5663ms
 ✓ test/orquestrador-arquivo-solto.test.ts (6 tests) 23584ms
   ✓ 631: arquivo solto > sequência do 513: agente commita a.ts e deixa diag-tmp.txt solto -> reprovado/arquivo_solto com retry e o nome no diagnóstico 2832ms
   ✓ 631: arquivo solto > contra-teste: o agente COMMITA diag-tmp.txt ele mesmo -> refatiar por enforcement 2737ms
   ✓ 631: arquivo solto > contra-teste: arquivo solto que casa zona proibida -> refatiar 3105ms
   ✓ 631: arquivo solto > contra-teste: um solto mais um commitado fora da allowlist (violação mista) -> refatiar 3149ms
   ✓ 631: arquivo solto > contra-teste: nenhum commit do agente e tudo solto dentro da allowlist -> "saiu sem commitar" e sem violação 3095ms
   ✓ 631: arquivo solto > drive_ticket: o retry do arquivo_solto reaproveita a worktree, mantém o modelo e aprova quando o agente remove o arquivo 8664ms
 ✓ test/orquestrador-migrations-config.test.ts (5 tests) 12ms
 ✓ test/orquestrador-resolvedor-pausa-dono.test.ts (5 tests) 558ms
   ✓ 7f-b7 P3: pausa com dono silenciosa > as 17 pausas reais de 17 e 18/10: só as 2 sem dono notificam (eram 17) 471ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1884ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 915ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 884ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 9471ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1319ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 992ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 742ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 663ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 639ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 534ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 1146ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 1148ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 2240ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 5508ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando DENTRO do timeout não está congelado 443ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 447ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 364ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 581ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 543ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 409ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 442ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > sem lock e sem STATUS congelado => segue 388ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 496ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 468ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 458ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 469ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 4ms
 ✓ test/orquestrador-resolvedor-pausa.test.ts (6 tests) 451ms
   ✓ peça 6: aviso de pausa > pausa nova no Comarka: uma notificação com o repo e a 1ª linha, uma linha no ledger; o sentinela intacto 349ms
 ✓ test/orquestrador-fila-json-quebrado.test.ts (6 tests) 2712ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes sai com rc != 0 citando o arquivo e o erro; sem o quebrado, rc 0 579ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes pega o quebrado mesmo com status done no arquivo 300ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > STATUS mostra a fila corrompida, o placar conta os válidos e o seletor devolve o 902 681ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > bloco ```json vazio conta como corrompido (jq empty com entrada vazia sai 0) 306ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila sem ticket quebrado: nenhuma linha de corrompida e placar sem corrompido 498ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila vazia continua "sem ticket" no placar e no STATUS 346ms
 ✓ test/orquestrador-resolvedor-r1-multi-isolado.test.ts (2 tests) 7669ms
   ✓ 7f-b7 P5: r1_multi isolado e limite depois do R1 > (b) duas reprovas por limite depois de r1_multi: nenhum desfecho ruim, R1 segue em auto, proposta gravada e uma notificação por ação 3586ms
   ✓ 7f-b7 P5: r1_multi isolado e limite depois do R1 > (a) 2 desfechos ruins de r1_multi devolvem só o r1_multi a sombra; o R1 de um teste segue aplicando 4081ms
 ✓ test/orquestrador-criterio-merito.test.ts (5 tests) 412ms
   ✓ 625: run_criterios separa o comando que não executou do critério que reprovou > rc 127 (não encontrado) e rc 126 (não executável) entram na lista; reprovação comum não entra 408ms
 ✓ test/orquestrador-resolvedor-job-claude.test.ts (4 tests) 2866ms
   ✓ peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto 1536ms
   ✓ peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez 1202ms
 ✓ test/orquestrador-resolvedor-fatia-auto.test.ts (2 tests) 628ms
   ✓ peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7) 623ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 160ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 653ms
 ✓ test/orquestrador-isolamento-teste.test.ts (26 tests) 16380ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 15388ms
 ✓ test/orquestrador-resolvedor-sobreposicao.test.ts (2 tests) 116ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 2931ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 1062ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 2379ms
   ✓ uma vez só, e por construção > a segunda passagem é no-op: não escreve, não anota 426ms
stdout | test/orquestrador-resolvedor-replay-allowlist.test.ts > 7f-b7 P2: replay dos resgates de allowlist depois de 11/10
{
 "casos": [
  {
   "linha": "2026-10-11 12:27 5525c7db6",
   "id": "1006",
   "classe": "R1",
   "regra": "D6b",
   "feito": "aplicado",
   "motivo": "test/quem-cuida.test.ts na allowlist; test/quem-cuida.test.ts na lista de criterio[2]; guarda de contagem em criterio[5]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/quem-cuida.test.ts"
   ],
   "resolvedor": [
    "test/quem-cuida.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "criterio novo CONTAGEM_MANTIDA",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "318c",
   "classe": null,
   "regra": null,
   "feito": "diagnostico",
   "motivo": "modo diagnostico para sem classe",
   "humano": [
    "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio ZERO_JSON_NOVO",
    "criterio SEM_ESCRITA",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:28 af768b088",
   "id": "966",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/ficha-nav-colapsavel.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "recon_esperado",
    "criterio VERDE",
    "criterio VERDE",
    "criterio novo RECALCULADO_966",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:29 05d951e93",
   "id": "830",
   "classe": "R2?",
   "regra": "D12",
   "feito": "nao_consegui",
   "motivo": "forma do defeito fora do que esta etapa conserta (saída: SOBRA_1)",
   "humano": [
    "scripts/dados/370-identidade.ts",
    "scripts/dados/685-dono-dry-run.ts",
    "test/dono-dry-run.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "recon_esperado",
    "criterio VERDE",
    "criterio novo FORA_DE_SRC_LIMPO",
    "criterio novo DONO_INTACTO",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 13:09 ab4e95cb4",
   "id": "854",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/rotas-orfas.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "recon_esperado",
    "testes_conferidos",
    "criterio VERDE",
    "criterio novo TEAM_ID_NA_ALLOWLIST",
    "criterio novo ORFAS_INTACTO",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 20:19 638e00305",
   "id": "855",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/adocao-predicado.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NAO_AFROUXOU",
    "criterio NAO_AFROUXOU",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-13 00:33 c00ee4b15",
   "id": "924a",
   "classe": "R1",
   "regra": "D6",
   "feito": "nao_consegui",
   "motivo": "mais de um vermelho fora da allowlist, tudo ou nada: test/conta-entregas-vazio-unico.test.ts não cumpre D6 nem D6b sozinho; nenhuma ação",
   "humano": [
    "test/conta-entregas-vazio-unico.test.ts",
    "test/visao-aceite-mockup.test.tsx"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "excecao_tamanho",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio AFROUXAMENTO_OK",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1053",
   "classe": "R2?",
   "regra": "D12",
   "feito": "nao_consegui",
   "motivo": "forma do defeito fora do que esta etapa conserta (saída: FORA_test/papel-nas-escritas.test.ts)",
   "humano": [
    "test/papel-nas-escritas.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio NO_TETO",
    "criterio novo RECALCULADO_PAPEL_1053",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1053b",
   "classe": "R1|R2?",
   "regra": "D11",
   "feito": "aviso",
   "motivo": "R1|R2? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "src/lib/clientes/espelho-legado.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio novo SEM_SERVER_ONLY",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1054",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/resolver-cliente-rota-diagnostico.test.ts e test/resolver-cliente-rota-resumo.test.ts na allowlist; test/resolver-cliente-rota-diagnostico.test.ts e test/resolver-cliente-rota-resumo.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/resolver-cliente-rota-diagnostico.test.ts",
    "test/resolver-cliente-rota-resumo.test.ts"
   ],
   "resolvedor": [
    "test/resolver-cliente-rota-diagnostico.test.ts",
    "test/resolver-cliente-rota-resumo.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio LEITORES_NA_CASA_NOVA",
    "criterio novo RECALCULADO_ROTAS_1054",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1055b",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/acoes-recomendadas-chave.test.ts e test/relatorio-sem-cliente-id.test.ts na allowlist; test/acoes-recomendadas-chave.test.ts e test/relatorio-sem-cliente-id.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/acoes-recomendadas-chave.test.ts",
    "test/relatorio-sem-cliente-id.test.ts"
   ],
   "resolvedor": [
    "test/acoes-recomendadas-chave.test.ts",
    "test/relatorio-sem-cliente-id.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio novo RECALCULADO_1055B_ANTIGOS",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 19:22 cf2fe3a97",
   "id": "1059",
   "classe": "R1|R2?",
   "regra": "D11",
   "feito": "aviso",
   "motivo": "R1|R2? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/leitores-carteira-casa-nova.test.ts",
    "test/leitores-ficha-casa-nova.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio VERDE",
    "criterio RECALCULADO_1059",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-15 11:58 832436272",
   "id": "1058",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/negocio-temperatura.test.ts e test/quem-cuida.test.ts na allowlist; test/negocio-temperatura.test.ts e test/quem-cuida.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/negocio-temperatura.test.ts",
    "test/quem-cuida.test.ts"
   ],
   "resolvedor": [
    "test/negocio-temperatura.test.ts",
    "test/quem-cuida.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio VERDE",
    "criterio NAO_AFROUXOU_1058",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-17 05:34 75db690c0",
   "id": "1195",
   "classe": "R1?",
   "regra": "D8",
   "feito": "aviso",
   "motivo": "R1? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/reuniao-manual-registro.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  }
 ],
 "sem_caso": [
  {
   "linha": "2026-10-11 00:42 079d3f465",
   "id": "952a",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-11 00:42 079d3f465",
   "id": "972",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-11 11:02 cc8d3887b",
   "id": "932",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "933",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "934b",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "935",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1056b",
   "motivo": "sem bloqueio antes do commit e sem allowlist nova"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1101",
   "motivo": "sem bloqueio antes do commit e sem allowlist nova"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "924c",
   "motivo": "allowlist não mudou neste ticket"
  }
 ]
}

 ✓ test/orquestrador-resolvedor-replay-allowlist.test.ts (4 tests) 11242ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 1247ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 50ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 4448ms
stdout | test/orquestrador-gate-corpus.test.ts > 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova

MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
10n	aviso	56	41	487	6	9	32
2c	aviso	0	0	1	0	0	0
3	aviso	0	0	1	0	0	0
6a:bash	aviso	0	1	6	0	0	0
6a:rm 	aviso	0	13	20	0	0	1
6a:sh -c	aviso	0	0	1	0	0	0
6b	aviso	55	60	363	5	10	26
6q	aviso	0	12	83	0	4	3
6r	aviso	0	0	1	0	0	0
6v	aviso	0	23	250	0	9	13
8	aviso	0	14	77	0	0	3
C13	aviso	0	0	47	0	0	2
C2c	aviso	0	1	4	1	0	2
C2v	aviso	36	0	0	3	0	0
C3	aviso	3	0	9	0	0	2
C4	aviso	0	0	11	0	0	1
C9	aviso	0	0	28	0	0	0


 ✓ test/orquestrador-gate-corpus.test.ts (2 tests) 10822ms
   ✓ 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 10820ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 63ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 7274ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 1191ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 1144ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 1195ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe 487ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 1032ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 710ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 670ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 784ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 209ms
 ✓ test/orquestrador-gate-vitest-aviso.test.ts (27 tests) 187ms
 ✓ test/orquestrador-resolvedor-pulado-teto.test.ts (3 tests) 197ms
 ✓ test/orquestrador-ambiente-merito.test.ts (6 tests) 5ms
 ✓ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests) 116ms
 ✓ test/orquestrador-triador-leitor-kit-tentativas.test.ts (3 tests) 3ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 1080ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 962ms
 ✓ test/orquestrador-retry-feedback-juiz.test.ts (3 tests) 25515ms
   ✓ 623 (a): o motivo do juiz chega ao prompt de retry > juiz reprova com o mecânico verde: o retry traz gate juiz, o motivo LITERAL e os criterios_falhos do juiz 8763ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > segunda tentativa com diff.patch idêntico: bloqueado por retry_sem_mudanca, juiz chamado UMA vez 7075ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > contra-teste: segunda tentativa com diff DIFERENTE chama o juiz de novo (contador = 2) 9676ms
 ✓ test/orquestrador-gate-grep-q.test.ts (19 tests) 79ms
 ✓ test/orq-pausa-trilha.test.ts (8 tests) 2258ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > RETOMADA por=terminal dur=<N>min, depois da PAUSA 546ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > imprime quem, quando e o motivo ANTES do RETOMADO 507ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 262ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 5777ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 803ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 1220ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 1123ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 1019ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 1556ms
 ✓ test/orquestrador-prompt-evidencia.test.ts (6 tests) 2671ms
   ✓ 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 2669ms
 ✓ test/orquestrador-resolvedor-tentativa-nova.test.ts (5 tests) 6153ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um attempt-* novo em runs/<id>/: desiste, o ticket fica intacto 1331ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um arquivo reescrito dentro de um attempt-* (sem entrada nova): desiste 1353ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o log do loop ganha o começo de uma tentativa do ticket: desiste 1196ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o ticket vira em_execucao: desiste (e não pisa no que o loop escreveu) 1100ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > log de outro ticket e nada novo no runs/: age (a trava não trava sem motivo) 1115ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 5554ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 2945ms
   ✓ peça 7: orq desfazer > recusa sem ação no ledger 374ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 1405ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 774ms
 ✓ test/orquestrador-teto-adiamento-ambiente.test.ts (5 tests) 33234ms
   ✓ teto de adiamento por ambiente > 3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota 7074ms
   ✓ teto de adiamento por ambiente > reprovação no meio quebra a sequência (o contador zera) 8611ms
   ✓ teto de adiamento por ambiente > adiamento por OUTRA causa não conta nem zera 8652ms
   ✓ teto de adiamento por ambiente > passar de fase zera: aprovado leva a aguardando_merge sem contador 3738ms
   ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 5157ms

 Test Files  101 passed (101)
      Tests  1630 passed (1630)
   Start at  18:28:05
   Duration  66.79s (transform 1.43s, setup 0ms, collect 24.83s, tests 469.69s, environment 16ms, prepare 5.63s)

rc=0
```

### 4.3 `bash scripts/kit/test-shell.sh`
```
[fixture] tmp: /tmp/orq-fixture-QB0jLK
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-QB0jLK/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-QB0jLK/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-QB0jLK/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-QB0jLK/repo
  CONFIG         = /private/tmp/orq-fixture-QB0jLK/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap bate com o arquivo (600)
  ok   diff_cap é inteiro positivo

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  - falha de ambiente da worktree
  ok   8 causas declaradas
  ok   a causa de ambiente da worktree está declarada
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-QB0jLK/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (6fa2cd94)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

== mark_adiado: cooldown global só para limite real de conta (Actus 9e109cb) ==
  ok    tsx do checkout: /private/tmp/orq-fixture-QB0jLK/repo/node_modules/.bin/tsx
  ok    causa 'ambiente' (arma=nao) => cooldown global NÃO armado
  ok    causa 'juiz_ilegivel' (arma=nao) => cooldown global NÃO armado
  ok    causa 'timeout' (arma=nao) => cooldown global NÃO armado
  ok    causa 'rate_limit' (arma=sim) => cooldown global ARMADO
  ok    causa 'quota' (arma=sim) => cooldown global ARMADO

== drenar: 1º ADIADO por 'ambiente' => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (922) foi executado
  ok    nenhum cooldown global armado
  ok    o adiado (921) roda UMA vez só nesta drenagem
  ok    922 terminou done

== drenar: 1º adiado por orcamento_ticket => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (932) foi executado
  ok    931 não foi ao executor

== drenar: executor adia por orcamento_ticket POR DENTRO => o 2º roda (Actus 9e109cb) ==
  ok    o 2º ticket (942) foi executado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20261018T182935Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-10-18 15:29:41-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-18 15:29:42-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-18 15:29:42-0300] ticket 902 (3 processáveis)
  | [2026-10-18 15:29:42-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-10-18 15:29:42-0300] ticket 903 (3 processáveis)
  | [2026-10-18 15:29:43-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-10-18 15:29:43-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-10-18 15:29:43-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-10-18T15:29:43-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-10-18 15:29:44-0300 e 2026-10-18 15:29:46-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-10-18T15:29:54-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-10-18 15:29:54
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  f9c208c · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-10-18T15:29:56-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-10-18T15:29:56-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:15:59
  ok    250: cooldown até 15:59
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 15:59

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:29:58-0300 e 2026-10-18 15:29:58-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:29:59-0300 e 2026-10-18 15:29:59-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:30:00-0300 e 2026-10-18 15:30:00-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:30:01-0300 e 2026-10-18 15:30:01-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-10-18T15:30:06-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-10-18T15:30:16-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

== 5. causa 'ambiente' em dois tickets: a absolvição não deixa o teto de 3 avançar ==
  --- disparo 11 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 12 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 13 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 14 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  ok    1 AMBIENTE em cada um dos 4 disparos
  ok    evento com 908,909 e o \n literal na causa
  ok    908 e 909 seguem pendentes (teto de 3 não atingido)
  ok    adiamentos_ambiente em 0 e ticket pendente depois de CADA disparo
  ok    trilha: 8 AMBIENTE_ADIAMENTO_DESFEITO (2 por disparo)
  ok    o evento diz de quanto para quanto
  ok    desfazer commitado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=3s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=0s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=1s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.TIcLW0QjMh/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-10-18T15:30:52-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=1s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 1s, abaixo do limite de 30s: morto por fora) em 2026-10-18T18:30:59Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=6.85, núcleos=10)
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=3b41e320
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=995511cb
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=b430155f
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=e06303a7
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=1s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=e06303a7
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-10-18T15:31:47-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-10-18T15:31:53-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
  (timeout do agente falso: 10 s = 10 s x fator de carga 1; load1=5.95, núcleos=10)
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=1df49531
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

--- test-painel-visao.sh ---
== 0. pendentes_razoes: a régua do OCIOSO, com o processável dito 'pronto' ==
  ok    531 pronto
  ok    601 espera 600
  ok    ocioso_razoes segue com rc 1 quando há processável

== 1. o estado sai do painel, lido só do contrato ==
  ok    painel --estado sai 0
  ok    3 repos, na ordem do repos.json

== 2. Precisa de você: tokens ordenados por quantos pendentes destravam ==
  ok    1º item: humano:cred-evo
  ok    cred-evo destrava 3 (600, e 601 e 602 atrás dele)
  ok    tickets destravados por cred-evo
  ok    2º item: humano:grupo-wa destrava 1
  ok    o item diz de qual repo é

== 3. estado em linguagem direta, com tempo ==
  ok    alfa: tipo
  ok    alfa: frase
  ok    alfa: tentativa e último resultado
  ok    beta: tipo
  ok    beta: frase
  ok    beta: o motivo da pausa
  ok    gama: tipo
  ok    gama: frase
  ok    gama: por que não pega
  ok    cada estado tem rótulo em texto, não só cor

== 4. o dia: aprovados contra reprovas (ontem não conta) ==
  ok    alfa: 2 aprovados, 2 reprovas
  ok    alfa: contagem da fila

== 5. próximos: os 3 primeiros da fila, com título ==
  ok    ids na ordem do loop
  ok    com título
  ok    e mais 1

== 6. bloqueados: categoria de motivo e sub, nunca da prosa ==
  ok    700 (repeticao sub=gate_testes) é teste
  ok    701 (criterio_qualidade, último sub=juiz) é juiz, apesar de 'fora_do_pathspec' na nota
  ok    702 (bloqueado sem BLOQUEADO na trilha) é decisão sua
  ok    243 (adiamentos) é ambiente
  ok    primeira linha do motivo
  ok    o resto fica para o clique
  ok    4 bloqueados nos 3 repos, cada um com o repo

== 7. nenhum ramo por nome de repo ==
  ok    o mesmo repo com outro nome dá o mesmo estado
  ok    orq-painel.py não cita nome de repo
  ok    orq-painel.py não lê meta.json nem log livre

== 8. repos.json ausente: a tela diz o que falta, não quebra ==
  ok    repos_erro nomeia o arquivo

== 9. a página: atualiza a cada 15 s e tem as seções ==
  ok    página contém 'Precisa de você'
  ok    página contém 'Bloqueados'
  ok    página contém '/api/estado'
  ok    página contém '15000'

== 10. razões que não se apuram: a faixa diz quem ficou fora da conta (K12-G) ==
  ok    os tokens do alfa continuam na faixa
  ok    a faixa diz qual repo ficou fora da conta
  ok    e por quê
  ok    timeout: nenhum token apurado
  ok    timeout: os dois repos fora da conta
  ok    o erro diz o tempo e quantos pendentes
  ok    o cartão mostra o erro
  ok    sem razões, prontos é desconhecido, não zero
  ok    gama ocioso sem razões: o cartão não diz 'sem ticket para pegar'
  ok    alfa segue rodando: isso vem do STATUS, não das razões
  ok    a página tem a frase de quem ficou fora

== 11. motivo longo: primeira frase ou 160 caracteres, o resto no clique (K12-H) ==
  ok    243: a primeira frase
  ok    243: o texto inteiro fica para o clique
  ok    244 sem ponto: cortado em até 160 caracteres mais '…' (160)
  ok    o corte avisa com '…'
  ok    o corte cai entre palavras
  ok    700 (motivo curto em duas linhas) segue igual
  ok    a página abre o texto inteiro no clique

== 12. bloqueados: filtro por repo, junto com o de categoria (K12-I) ==
  ok    contagem por repo, na ordem do repos.json, com o zero
  ok    sem filtro: todos os bloqueados
  ok    chip de repo sem bloqueado fica, desabilitado
  ok    e mostra o 0
  ok    clique em gama: só o 243
  ok    clique em alfa: os 3 do alfa
  ok    alfa + categoria teste: os dois filtros juntos
  ok    a atualização de 15 s mantém repo e categoria

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 8 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-visao.sh) = 0

--- test-painel-detalhe.sh ---
  ok    painel --estado sai 0

== 1. os 6 indicadores ==
  ok    tempo por ticket: média, mediana, pior (s)
  ok    aprovação na 1ª: 2 de 3, 67%
  ok    tentativas por aprovação: 5 inícios / 3 aprovações
  ok    fila estimada: 2 prontos × 980 s de execução por aprovação
  ok    ociosidade hoje: 12h menos 49 min em execução, 2h delas pausado
  ok    última promoção: sem dado, com o motivo
  ok    última promoção diz por que não tem dado
  ok    custo do dia (custo.json), só hoje

== 2. sem aprovação no dia, os indicadores dizem 'sem dado' em vez de zero ==
  ok    tempo_ticket: sem dado (nenhuma aprovação hoje)
  ok    primeira: sem dado (nenhuma aprovação hoje)
  ok    tentativas_por_aprovacao: sem dado (nenhuma aprovação hoje)
  ok    fila_estimada: sem dado (nenhuma aprovação hoje, sem ritmo)

== 3. bloqueados: categoria, motivo, allowlist, parado há, tentativas ==
  ok    820: enforcement
  ok    820: parado há 30 min
  ok    820: tentativas do BLOQUEADO (sem campo no ticket)
  ok    820: onde mexe

== 4. prontos: o que muda em uma frase, onde mexe, quantos destravam ==
  ok    prontos na ordem do loop
  ok    810: a primeira frase do objetivo
  ok    810: onde mexe
  ok    810 destrava 1 (o 812), 811 nenhum

== 5. hora a hora: aprovado, reprova, parado ==
  ok    9h: 1 aprovado, 1 reprova, 28 min em execução, 32 parado
  ok    10h: 2 aprovados, 16 min em execução
  ok    3h: parado a hora inteira
  ok    horas até agora (0 a 12)

== 6. arquivos mais disputados entre os pendentes ==
  ok    top 3

== 7. a página tem a vista de detalhe ==
  ok    página contém 'function detalhe'
  ok    página contém 'Hoje, hora a hora'
  ok    página contém 'Arquivos mais disputados'
  ok    página contém 'Prontos'
  ok    página contém 'sem dado'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 2 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-detalhe.sh) = 0

--- test-painel-pausa.sh ---
  servidor em http://127.0.0.1:57199
== 1. pausar: cria o PAUSAR do contrato e grava PAUSA na trilha ==
  ok    HTTP 200
  ok    docs/fila/PAUSAR criado
  ok    conteúdo no formato do §7: <AAAA-MM-DD HH:MM> | motivo
  ok    trilha: 2026-10-18T15:32:18-0300 --- PAUSA motivo=leva-da-tarde por=painel
  ok    a resposta explica que para ENTRE tickets
  ok    .orq-pause nunca é escrito
  ok    nada mais mudou no repo

== 2. pausar de novo: recusa, sem segunda linha ==
  ok    HTTP 409
  ok    sem PAUSA duplicada

== 3. o estado diz o que cada botão pode e por quê ==
  ok    rho: pausar desabilitado
  ok    rho: retomar habilitado
  ok    rho: disparo desabilitado (ticket em curso)
  ok    o motivo do disparo desabilitado está escrito
  ok    sem ação 'pausar agora'

== 4. retomar: apaga o PAUSAR e grava RETOMADA com a duração ==
  ok    HTTP 200
  ok    PAUSAR apagado
  ok    trilha: 2026-10-18T15:32:18-0300 --- RETOMADA por=painel dur=0min
  ok    nada mais mudou no repo
  ok    retomar sem pausa: 409

== 4b. quem pausou: painel e terminal gravam a mesma linha, e o painel diz quem foi (K12-F) ==
  ok    pausa pelo painel: o cartão diz 'pausado pelo painel'
  ok    retomar pelo painel diz quem pausou e por quê
  ok    pausa pelo terminal: o cartão diz 'pausado pelo terminal'
  ok    PAUSA do terminal e do painel no mesmo formato

== 5. legado .orq-pause: lido, nunca escrito nem apagado ==
  ok    sigma aparece pausado
  ok    sigma: retomar desabilitado
  ok    o motivo nomeia o .orq-pause
  ok    POST retomar no legado: 409
  ok    .orq-pause intacto
  ok    sigma continua sem PAUSAR

== 6. disparo: só com STATUS ocioso, e sem -k ==
  ok    com ticket em curso: 409
  ok    launchctl kickstart não chamado
  ok    ocioso: 200
  ok    kickstart gui/<uid>/<label do config>, sem -k

== 7. o resto é recusado ==
  ok    ação fora da allowlist: 403
  ok    repo desconhecido: 400
  ok    Host estranho: 403

== 8. a página: Pausar e Retomar, e o que a pausa faz ==
  ok    página contém 'Pausar'
  ok    página contém 'Retomar'
  ok    página contém 'ENTRE tickets'
  ok    página contém 'nada é interrompido'
  ok    sem 'Pausar agora'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 31 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-pausa.sh) = 0

--- test-painel-alarmes.sh ---
== 1. launchd_exit: last exit code != 0 ==
  ok    rc 127 com trilha recente: o job org.fixture.a1 saiu com rc 127 no último disparo (launchctl print: last exit code)
  ok    o card diz travado
  ok    rc 0 e drenagem dentro da janela: silêncio
  ok    job NÃO carregado (desagendado de propósito): silêncio

== 2. mudo: nenhum DRENAGEM_INICIO há mais de 2x o start_interval ==
  ok    DRENAGEM_INICIO de 3x o start_interval atrás: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    e diz o intervalo do job: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    o card diz travado
  ok    DRENAGEM_INICIO dentro de 2x o start_interval: silêncio
  ok    velho, mas job descarregado: silêncio
  ok    trilha sem nenhum DRENAGEM_INICIO, job carregado: nenhum DRENAGEM_INICIO na trilha, com o job org.fixture.a2d carregado (dispara a cada 30 min)

== 3. pausa_furada: PAUSAR de pé e a drenagem seguiu depois dele ==
  ok    DRENAGEM_INICIO sem motivo=pausado depois da PAUSA: a drenagem seguiu depois da pausa: DRENAGEM_INICIO às 11:40, com o PAUSAR de pé desde 11:29
  ok    pausa respeitada (motivo=pausado) e retry do 530, que já corria: sem pausa_furada
  ok    INICIO de OUTRO ticket depois da pausa: a drenagem seguiu depois da pausa: INICIO do 531 às 11:50, com o PAUSAR de pé desde 11:29

== 4. pausa_longa: PAUSAR há mais de 40 min ==
  ok    41 min: pausado há 41 min, mais de 40 min: motivo "madrugada"
  ok    39 min: silêncio

== 5. execucao_longa: além do timeout do config mais a margem ==
  ok    41 min com timeout de 30 e margem de 10: o 530 está em execução há 41 min; o timeout é 30 min (+10 min de margem para gates e juiz)
  ok    o card diz travado
  ok    30 min, dentro do timeout mais a margem: silêncio

== 6. todo alarme é texto, e o que falta no config vira 'sem dado' ==
  ok    sem dado: mudo: sem launchd.start_interval no config | execução longa: sem claude_timeout_secs no config
  ok    a página mostra o texto do alarme

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 19 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-alarmes.sh) = 0

--- test-painel-lento.sh ---
  servidor em http://127.0.0.1:57225
== 1. duas chamadas seguidas respondem abaixo de 1 s ==
  ok    1ª chamada em 0.556693s
  ok    2ª chamada em 0.000800s

== 2. o repo rápido vem completo; o lento vem marcado ==
  ok    rápido: razões apuradas
  ok    rápido: 1 pronto
  ok    rápido: o token dele está na faixa
  ok    lento: apurando
  ok    lento: o cartão diz que está apurando
  ok    lento: fora da conta da faixa, e dito

== 3. depois do timeout: sem apurar, com a hora da última tentativa, e o processo morto ==
  ok    lento: sem apurar
  ok    última tentativa às 15:32
  ok    o cartão diz a última tentativa
  ok    recuo de 1 min: próxima em 57s
  ok    o processo do lento morreu no timeout
  ok    rápido segue completo

== 4. no recuo, nada de tentar de novo a cada chamada ==
  ok    uma tentativa só

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 6 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-lento.sh) = 0

--- test-gate-prevoo.sh ---
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)

== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)

== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado

== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou

== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação

== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente

== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido

== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903

== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  ok    UM GATE_TICKET_AVISO na trilha em dois disparos
  ok    o evento carrega o hash da versão
  ok    o 901 editado é versão nova: segundo GATE_TICKET_AVISO

TODOS OS CHECKS PASSARAM

rc(test-gate-prevoo.sh) = 0

--- test-tentativas-persistidas.sh ---
== 1 · drenagem 1: reprovado + adiado(ambiente) -> tentativas = 1 ==
  ok    drenagem 1 começa em attempt=0 (ticket sem campo = 0)
  ok    depois de reprovado+adiado: tentativas=1 no arquivo
  ok    o adiamento devolve o ticket a pendente

== 3 · crash no meio da tentativa: o contador já está no arquivo ==
  ok    a tentativa foi persistida ANTES de rodar (o agente já via tentativas=1)
  ok    depois do crash: tentativas=1 (a tentativa morta conta)

== 4 · aprovado não consome; done zera ==
  ok    reprovado+aprovado: tentativas=1 (o aprovado não soma)
  ok    local-loop.sh zera tentativas junto com o status done

TODOS OS CHECKS PASSARAM

rc(test-tentativas-persistidas.sh) = 0

--- test-orq-pause.sh ---
== 1 · as duas sentinelas presentes: --status lista as duas ==
    PAUSADA: docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar
    PAUSADA: docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   duas linhas PAUSADA
  ok   PAUSAR com caminho e conteúdo
  ok   .orq-pause com caminho e conteúdo
== 4 · pausa_motivo devolve caminho + conteúdo das duas ==
    docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar; docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   pausa_motivo nomeia as duas
== 2 · --off remove as duas e pausa_ativa fica falso ==
    removida: docs/fila/PAUSAR
    removida: docs/fila/.orq-pause
    fila RETOMADA (2 sentinela(s) removida(s))
  ok   diz que removeu PAUSAR
  ok   diz que removeu .orq-pause
  ok   os dois arquivos sumiram
  ok   pausa_ativa falso
== 3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR ==
  ok   pausado por PAUSAR antes do --off
    removida: docs/fila/PAUSAR
    fila RETOMADA (1 sentinela(s) removida(s))
  ok   PAUSAR removido
  ok   conta uma removida
  ok   pausa_ativa falso
== 5 · nenhuma presente ==
  ok   --status: ativa (sem pausa)
  ok   --off não inventa remoção
  ok   nenhuma linha 'removida:'
== 6 · local-loop pausado: o STATUS nomeia a sentinela ==
    ESTADO   ocioso
    MOTIVO   pausado (docs/fila/PAUSAR: 2026-09-24 12:00 | pausa do teste)
  ok   MOTIVO com a sentinela e o conteúdo
== 7 · (kit, K12-F) pausar e retomar pelo orq-pause.sh gravam PAUSA e RETOMADA na trilha ==
  ok   PAUSA por=terminal na trilha
  ok   RETOMADA por=terminal na trilha

TODOS OK

rc(test-orq-pause.sh) = 0

--- test-preflight.sh ---
== 1 · papel em PENDENTE_* aborta (ROOT sintético, zero gasto) ==
  ok    abortou (rc=1)
  ok    diz que é erro de config
  ok    diz que não consome tentativa
  ok    aponta o desbloqueio LIDO DO CONFIG
  ok    nomeia o papel pendente
  ok    nenhuma sondagem disparada
  ok    nada gravado no custo.json do fixture

== 1b · qualquer um dos três papéis pendente basta ==
  ok    executor_model pendente => aborta nomeando o papel
  ok    avaliador_model pendente => aborta nomeando o papel
  ok    retry_final_model pendente => aborta nomeando o papel

== 1c · INVARIANTE do config real: nenhum papel pendente hoje ==
  ok    executor_model definido (sonnet)
  ok    avaliador_model definido (opus)
  ok    retry_final_model definido (opus)

== 2 · id de modelo inexistente é RECUSADO pelo texto do CLI ==
  ok    recusa detectada: [claude-code:unrecognized_model] {"model":"m…
  ok    recusa detectada: There's an issue with the selected model (xy…
  ok    recusa detectada: "PENDENTE_TK104" is not a model this version…
  ok    resposta normal não é recusa

== 3 · o que NÃO aconteceu ==
  ok    nenhuma worktree criada (0 antes, 0 depois)
  ok    nenhum attempt gravado no fixture
  ok    cooldown NÃO armado (erro de config não é adiamento)

== 4 · fronteira: sondagem limitada ADIA, não aborta ==
  ok    429 real => adiável
  ok    conexão recusada real => adiável
  ok    saída vazia com rc!=0 => adiável (CLI não falou)
  ok    modelo recusado NÃO é adiável

== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto ==
  ok    veredito válido lido do envelope
  ok    prompt gravado (evidência, regra 8)
  ok    output CRU preservado
  ok    o critério avaliador chega ao prompt
  ok    allowlist com *.test.* liga o anti-afrouxamento
  ok    o juiz não recebe o prompt do executor
  ok    lixo => ILEGÍVEL (o executor adia, não reprova)
  ok    nenhum veredito inventado a partir de lixo
  ok    nada gravado em custo.json (nenhuma chamada paga)

TODOS OS CHECKS PASSARAM

rc(test-preflight.sh) = 0

--- test-diff-lines.sh ---
C. diff vazio
  ✓ diff vazio = 0
A. inserções + deleções
  ✓ DIFF_LINES = 15 (diff cru tem 50 linhas)
B. binário conta zero
  ✓ binário não soma (DIFF_LINES continua 15)

PASS=3 FAIL=0

rc(test-diff-lines.sh) = 0

--- test-sem-cor.sh ---
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI

== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  ok    gate 'test' aprovado com o placar lido por grep
  ok    critério: saída '1' (o placar casou)

TODOS OS CHECKS PASSARAM

rc(test-sem-cor.sh) = 0

--- test-criterio-isolado.sh ---
== 1 · variável não definida não aborta o critério ==
  ok    saída 'v=fim'
== 2 · grep -c sem ocorrência imprime 0 ==
  ok    saída 'n=0'
== 3 · BASE_REF chega ao critério ==
  ok    saída 'base=staging-auto'
== 4 · contra-teste: grep -c 0 contra espera 1 continua falhando ==
  ok    saída '0' e critério FALHA
== 5 · contra-teste: test -n de variável vazia continua falhando ==
  ok    critério FALHA
== 6 · comando inexistente continua NÃO EXECUTADO (rc 127) ==
  ok    rc 127 visto

TODOS OS CHECKS PASSARAM

rc(test-criterio-isolado.sh) = 0

--- test-fixture-gates.sh (kit) ---
[fixture] tmp: /tmp/orq-fixture-rnt4YO
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-rnt4YO/repo
== gates reais numa worktree do motor · fixture em /tmp/orq-fixture-rnt4YO/repo ==

Preparing worktree (new branch 'frente/teste-gates')
ok: a worktree tem node_modules (symlink -> /private/tmp/orq-fixture-rnt4YO/repo/./node_modules)

--- gates.txt ---
ok   typecheck               703ms
ok   test                  33061ms
VEREDITO: APROVADO
--- fim (rc=0) ---

ok: gates.ts rc=0
ok: VEREDITO: APROVADO
ok: gate typecheck
ok: gate test

test-fixture-gates: VERDE

rc(test-fixture-gates.sh) = 0

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

### 4.4 `bash scripts/kit/test-instalar.sh`
```
[fixture] tmp: /tmp/orq-fixture-1UFI1U
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-1UFI1U/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-fixture-1UFI1U/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-5xc3YQ/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-dOeAh5/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-cj4ULj/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-cj4ULj/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-cj4ULj/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-cj4ULj/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-cj4ULj/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-cj4ULj/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-cj4ULj/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-cuprOz/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-cuprOz/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-cuprOz/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-0EqiRI/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-0EqiRI/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-0EqiRI/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-0EqiRI/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-Ow33VT/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-Ow33VT/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-Ow33VT/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-Ow33VT/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 3848ms
  | 
  |  Test Files  21 passed (21)
  |       Tests  186 passed (186)
  |    Start at  15:34:31
  |    Duration  28.20s (transform 293ms, setup 0ms, collect 9.49s, tests 118.25s, environment 3ms, prepare 1.06s)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-ctNHl8/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-ctNHl8/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-ctNHl8/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-ctNHl8/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | --- /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -32,7 +29,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -55,17 +51,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -74,7 +67,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -88,7 +80,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -97,31 +88,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json. test-lib-config.sh cobra só a forma (bate com o arquivo, inteiro positivo), não o número: o 2500 do Actus também passa.",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -143,7 +129,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -151,7 +136,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -160,7 +144,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -177,18 +160,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -207,7 +187,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -247,10 +226,11 @@
  |        "wget",
  |        "> ",
  |        ">>"
  | -    ]
  | +    ],
  | +    "modo_pre_voo": "aviso",
  | +    "severidade": {}
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -264,7 +244,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -273,7 +252,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-TKIwo2/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-ctNHl8/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-ctNHl8/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-ctNHl8/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | @@ -2,17 +2,14 @@
  | @@ -32,7 +29,6 @@
  | @@ -55,17 +51,14 @@
  | @@ -74,7 +67,6 @@
  | @@ -88,7 +80,6 @@
  | @@ -97,31 +88,26 @@
  | @@ -143,7 +129,6 @@
  | @@ -151,7 +136,6 @@
  | @@ -160,7 +144,6 @@
  | @@ -177,18 +160,15 @@
  | @@ -207,7 +187,6 @@
  | @@ -247,10 +226,11 @@
  | @@ -264,7 +244,6 @@
  | @@ -273,7 +252,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-ctNHl8/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-novo-Qor6MP
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     20 teste(s) de harness e 7 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-novo-Qor6MP
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-Qor6MP/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-Qor6MP
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-ht6yYP' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
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

## 5. Diff cru (`git diff 0917131..HEAD`)

As três fixtures de dados ficam fora do diff abaixo. Elas são cópias byte a byte do recon e do Comarka (os TSVs, com `created_by` trocado como no achado 5), e aqui vão só o `--stat` e o sha:
```
 CHANGELOG.md                                       |   23 +
 CONTRATO.md                                        |  127 ++
 docs/PECAS.md                                      |   38 +
 docs/aplicador-migrations.md                       |   96 +
 scripts/orq                                        |   21 +
 scripts/orquestrador/migrations/aplicar.ts         |  187 ++
 scripts/orquestrador/migrations/arquivos.ts        |   48 +
 scripts/orquestrador/migrations/caminhos.ts        |   75 +
 scripts/orquestrador/migrations/cli.ts             |  176 ++
 scripts/orquestrador/migrations/config.ts          |  210 +++
 scripts/orquestrador/migrations/liberacao.ts       |  116 ++
 scripts/orquestrador/migrations/plano.ts           |  121 ++
 scripts/orquestrador/migrations/sql.ts             |  187 ++
 scripts/orquestrador/migrations/supabase.ts        |  153 ++
 scripts/orquestrador/resolvedor/caminhos.ts        |    5 +-
 scripts/orquestrador/resolvedor/repo.ts            |   21 +-
 test/fixtures/migrations/LEIA-ME.md                |   16 +
 test/fixtures/migrations/comarka-arquivos.tsv      |  273 +++
 test/fixtures/migrations/comarka-producao.tsv      |  492 +++++
 .../migrations/liberacoes-comarka-18-10.json       | 1953 ++++++++++++++++++++
 test/orquestrador-migrations-aplicar.test.ts       |  501 +++++
 test/orquestrador-migrations-config.test.ts        |  154 ++
 test/orquestrador-migrations-plano.test.ts         |  156 ++
 test/orquestrador-migrations-supabase.test.ts      |  289 +++
 24 files changed, 5432 insertions(+), 6 deletions(-)
49df0a9cedbba9a541481af1a10904ec71e929b4  test/fixtures/migrations/comarka-arquivos.tsv
1a6fb7edf9b7fcbad04a6e47d341654be6cd2f24  test/fixtures/migrations/comarka-producao.tsv
490004f6d5c5c8fc254a46af08df8d0031615f1b  test/fixtures/migrations/liberacoes-comarka-18-10.json
```

````diff
diff --git a/CHANGELOG.md b/CHANGELOG.md
index 30b8b13..aa2aedf 100644
--- a/CHANGELOG.md
+++ b/CHANGELOG.md
@@ -1118,3 +1118,26 @@ o 402, porque `vercel.json` não é item de `src/` e o corpus não tem a árvore
 de "dentro da allowlist" foi para `orquestrador-gate-8a.test.ts`, com árvore real. O teste
 do CLI troca a mensagem esperada da C11 (`importado ou citado por`). O contexto do corpus
 devolve `arvoreAlvo: undefined`.
+
+### Etapa MIG-A · aplicador de migrations, linha de base e aplicação manual (18/10/2026)
+
+Um caminho só aplica migration: `orq migrations aplicar`, pela API de gestão do Supabase,
+com a credencial lida só pelo script, conferência no `schema_migrations` e o token liberado
+sozinho no formato do repo. Nada aplicado em banco nesta etapa; o primeiro uso real é do
+Lucas, no terminal, depois do merge. CONTRATO §19, `docs/aplicador-migrations.md`.
+
+- **P1** `662e074`: bloco de topo `migrations.bancos` no `~/.orq/repos.json` (E1).
+- **P2** `b32d262`: `POST /database/query` numa transação implícita com o insert da versão
+  e do nome do arquivo e `created_by: orq-aplicador:<usuário>` (E4); envelope `begin;/commit;`
+  tirado (77 de 77 migrations recentes do Comarka o têm); sonda obrigatória por banco.
+- **P3** `16c84b5`: linha de base com `pendentes_herdados` (E2, opção b) e plano com drift e
+  `created_by`. Fixture real: corte 20261004 → 6 pendentes e 29 de drift; corte de hoje com
+  herdados desde 20261004 → drift zero, 5 herdados e 1 pendente.
+- **P4** `c7539bd`: `orq migrations status|plano|linha-base|sonda|aplicar`; recusas (E5),
+  trava, `pre_check`, token em `.liberadas` com `por: lucas` e a nota do aplicador (E6),
+  commit só do arquivo de liberação com `Orq-Aplicador:`, nunca push (E7).
+- **P5**: CONTRATO §19, a seção ETAPA MIG-A do `docs/PECAS.md`, este registro e o manual.
+
+Mudança em código existente: `resolvedor/repo.ts` ganha a porta genérica `comitarUmArquivo`
+(o `escreverEComitar` passa a chamá-la, com o comportamento e as mensagens iguais) e a
+`GuardaResolvedor` aceita a raiz por parâmetro. Nenhuma asserção existente mudou.
diff --git a/CONTRATO.md b/CONTRATO.md
index 13361d2..803d33f 100644
--- a/CONTRATO.md
+++ b/CONTRATO.md
@@ -1805,6 +1805,133 @@ só ele a sombra, e o 1006 segue aplicando) e
 `test/fixtures/pausas-7f7`: 2 notificações, eram 17; o limite; o FALHOU; a pausa sem dono;
 as chaves do item).
 
+## 19. Aplicador de migrations, etapa MIG-A (18/10/2026)
+
+Recon (`~/orq-sessoes/relatorio-recon-migrations.md`): no banco `ogfnojbbvumujzfklkhh` só o
+conector do Supabase do claude.ai aplicava (`apply_migration` ou `execute_sql`), por chat,
+sessão ou pela skill `aplicar-migration-ddl` do Comarka. A fila do Comarka travava esperando
+`humano:migration-<id>-aplicada` (122 tokens liberados à mão em 14 dias). Decisões de 18/10:
+um caminho só aplica (este); a escrita vai pela API de gestão com a credencial do `.env.local`
+do repo, lida só pelo script; a linha de base de 18/10 é a verdade; o aplicador libera o token
+sozinho depois de conferir no ledger; aplicador por banco, não por repo. Código em
+`scripts/orquestrador/migrations/`, verbo `orq migrations` (despachado antes do lib.sh, como o
+`resolver`). Relatório: `~/orq-sessoes/relatorio-kit-mig-a.md`.
+
+### 19.1 Config por banco (`config.ts`)
+
+Bloco de TOPO `migrations.bancos` no `~/.orq/repos.json`, e não em cada item de `.repos[]`
+(E1): o dashboard-comercial escreve no mesmo banco do Comarka, não tem fila, e em `.repos[]`
+seria varrido pelo resolvedor e pelo painel. Por banco: `ferramenta` (só `supabase`),
+`banco_id`, `timeouts` (`lock_timeout_s` 5, `statement_timeout_s` 60, `http_timeout_s` 120) e
+`repos`. Cada repo: `repo` (nome em `.repos[]`) ou `caminho`, `dir`, `refs` (padrão `HEAD`),
+`somente_leitura`; o escritor (no máximo um por banco) leva ainda `credencial_env` (o NOME),
+`env_arquivo` (`.env.local`), `token` (`formato` `liberadas` ou `v2`, `molde` com `{id}`, `por`)
+e `pre_check` (comando do repo, `{arquivo}` vira o `.sql` extraído). Erro por campo; um
+`banco_id` em dois bancos e um repo em dois bancos são recusados. Nada no `000-config.json`.
+
+### 19.2 O SQL e a API (`sql.ts`, `supabase.ts`)
+
+Tudo por `POST /v1/projects/<ref>/database/query`. O `POST /database/migrations`, que o
+`apply_migration` usa, não recebe versão e grava a hora da aplicação (OpenAPI conferido no
+PASSO 0), por isso não é usado (E4). Um texto só, transação IMPLÍCITA (o Postgres roda as
+instruções de uma mensagem Query como uma transação):
+
+    select set_config('lock_timeout', '<n>s', true);
+    select set_config('statement_timeout', '<n>s', true);
+    <corpo do arquivo>
+    ;
+    insert into supabase_migrations.schema_migrations(version, name, statements, created_by)
+      values (<versão do arquivo>, <nome do arquivo>, array[<instruções>], 'orq-aplicador:<usuário>');
+
+Os literais vão em dollar-quote com etiqueta aleatória que não aparece no texto. A tabela tem
+`version`, `statements`, `name`, `created_by`, `idempotency_key` e `rollback`, sem default nem
+trigger (medido pelo chat em 18/10); o aplicador grava as quatro primeiras.
+
+O ENVELOPE `begin;` (primeira instrução) e `commit;` (última), que 77 de 77 migrations do
+Comarka desde 16/10 trazem, é tirado; o resto vai byte a byte. Recusa: begin, commit, end,
+rollback, savepoint ou release no meio; envelope pela metade; `CONCURRENTLY`; `VACUUM`;
+`ALTER SYSTEM`; literal ou comentário sem fim. O leitor conhece `--`, `/* */` aninhado,
+`'...'`, `E'...'`, `"..."` e `$tag$...$tag$`: `;` e `commit` dentro de corpo de função não contam.
+
+Respostas: 2xx legível = ok; 4xx = erro certo (o Postgres recusou, nada ficou); 5xx, timeout,
+rede ou corpo ilegível = INCERTO. A credencial sai do `env_arquivo` do repo pelo nome e toda
+mensagem passa por `mascarar` (o valor, o miolo sem `sbp_` e qualquer `sbp_...`). Com
+`ORQ_TESTE=1` só fala com `http://127.0.0.1:<porta>` (`ORQ_MIGRATIONS_API`); sem ele, só com
+`https://api.supabase.com`.
+
+**Sonda** (`QUERY_SONDA`): `set_config('orq.sonda', txid_current()::text, true)` e, na mesma
+mensagem, `current_setting('orq.sonda')::bigint = txid_current()`. Obrigatória por banco
+(`<banco>.sonda.json` com `mesma_transacao: true`), porque o aplicador é genérico. No
+`ogfnojbbvumujzfklkhh` o chat mediu verde em 18/10.
+
+### 19.3 Linha de base e plano (`plano.ts`)
+
+`orq migrations linha-base <banco> [--corte V] [--herdados-desde V] [--substituir]` grava
+`~/.orq/migrations/<banco>.json`: o corte (padrão: a maior versão de produção), as linhas do
+ledger naquele momento, os `pendentes_herdados` (E2, opção b: arquivos com piso < versão <=
+corte sem linha no ledger) e `antigos_sem_ledger` (só contados). Sem `--herdados-desde`, nenhum
+herdado: no Comarka, "todo arquivo sem linha até o corte" dá 36, e 31 são de maio a setembro,
+que a decisão 3 manda não cobrar. Trocar a linha de base pede `--substituir`.
+
+O plano, contra o ledger de agora: **pendente** = arquivo de qualquer repo do banco com versão
+> corte sem linha que case; **herdado** = os da linha de base que ainda não casam; **drift** =
+linha com versão > corte sem arquivo que case em nenhum repo; mais as aplicadas desde o corte,
+com `created_by`. Casar: a mesma versão, ou o mesmo nome (sem o prefixo, ou o nome base inteiro:
+o dashboard grava `20261006_<nome>`, e 7 arquivos do Comarka de 27-29/09 também). Versão de 8
+dígitos é completada com zeros. Os arquivos saem dos `refs` por `gitLeitura` (`ls-tree`,
+`show`): 5 dos 6 pendentes de 18/10 só existiam nas stagings. O mesmo caminho com blob
+diferente entre refs é `divergente`.
+
+### 19.4 Aplicar (`aplicar.ts`, `liberacao.ts`, `caminhos.ts`)
+
+Recusas, todas antes de qualquer escrita: `~/.orq/MIGRATIONS_PAUSADO`; repo `somente_leitura`;
+sem TTY; sem sonda verde; sem linha de base; repo pausado (`pausar_file` do config ou
+`docs/fila/.orq-pause`); arquivo de liberação modificado na árvore (E5); a trava
+`<banco>.lock` (O_EXCL com o pid) segura por processo vivo (órfã: assume); arquivo fora do plano
+ou divergente; token ausente, duplo ou já liberado (o token sai do `.sql`, pelo molde, ou do
+`--token`, conferido contra o molde); SQL recusado; `pre_check` com rc diferente de 0;
+confirmação que não é a versão digitada. Depois de mostrar o SQL e o aviso de classe (DROP,
+TRUNCATE, DELETE, RENAME, GRANT, REVOKE, POLICY, SECURITY DEFINER, ALTER COLUMN, SET NOT NULL;
+só aviso nesta etapa), aplica e CONFERE no `schema_migrations` que a versão entrou com o nome.
+
+| Resposta da API | Linha no ledger depois | O que acontece |
+|---|---|---|
+| ok | sim | `aplicada`, token escrito (`token_emitido`) |
+| ok | não | `conferencia_falhou`, sem token |
+| erro (4xx) | não | `falhou`, sem token |
+| incerto | sim | `aplicada` com `incerto_resolvido`, token escrito |
+| incerto, ou conferência sem resposta | não | `incerto`, sem token: `orq migrations plano` decide depois |
+
+O token (a única escrita num repo): formato `liberadas` acrescenta `{token sem 'humano:', em,
+por, nota}` em `.liberadas[]` (Comarka: `por: lucas`, nota `aplicador do kit, versão X, arquivo
+Y, ref Z, usuário $USER`, E6); formato `v2` usa a decisão do `orq liberar`. O commit é o da
+porta `comitarUmArquivo` de `resolvedor/repo.ts` (espera o git livre, só o arquivo,
+`--only`, nunca `--no-verify`, desfaz se o hook recusa, confere um arquivo e o pai), com
+`Orq-Aplicador: <banco> <versão> <arquivo>`. Nunca push (E7): o loop do Comarka lê o arquivo
+local do checkout principal (`lib.sh:64`), e o push segue no ritual. Ledger em
+`~/.orq/migrations/ledger.jsonl` (`aplicar_inicio`, `aplicada`, `token_emitido`,
+`token_falhou`, `falhou`, `incerto`, `conferencia_falhou`), escrito pela `GuardaResolvedor`
+com a raiz `~/.orq/migrations`.
+
+### 19.5 O que o aplicador nunca faz
+
+Push; merge; escrever no repo outro arquivo que não o de liberação; usar `POST
+/database/migrations` ou `execute_sql` do MCP; imprimir ou gravar a credencial; aplicar sem
+TTY, sem a versão digitada ou sem sonda verde; emitir token sem a linha conferida; renomear
+arquivo ou mexer em linha antiga do ledger. A troca da skill e do `banco.md` do Comarka para
+`orq migrations aplicar` é frente do Comarka, depois do merge (E8).
+
+### 19.6 Testes
+
+`orquestrador-migrations-config.test.ts` (a config real do Comarka e do dashboard; erro por
+campo), `orquestrador-migrations-supabase.test.ts` (stub HTTP: sucesso, erro, incerto,
+recusas do SQL, envelope do 1377, sonda, mascaramento, `ORQ_TESTE`),
+`orquestrador-migrations-plano.test.ts` (fixture real `test/fixtures/migrations/`: corte
+20261004 → 6 pendentes e 29 de drift; corte de hoje com herdados desde 20261004 → drift zero,
+5 herdados e 1 pendente) e `orquestrador-migrations-aplicar.test.ts` (cada recusa, a trava,
+o `pre_check`, a conferência, o commit de um arquivo e o replay no `liberacoes.json` real do
+Comarka de 18/10).
+
 ## 10. Divergências conhecidas
 
 O que este contrato **não** descreve como gostaria, e a peça que fecha cada uma.
diff --git a/docs/PECAS.md b/docs/PECAS.md
index fe89294..0d8562b 100644
--- a/docs/PECAS.md
+++ b/docs/PECAS.md
@@ -1282,3 +1282,41 @@
   `max_tickets_por_passada`, NO-GO num repo pula para o próximo; plists por repo saem na adoção.
   *Evidência:* inventário §4 decisão 5, §6 item 14 (plists `.bak`/`.repo-noturno` soltos).
   *Teste:* dois repos no `repos.json`, NO-GO no primeiro, o segundo drena.
+
+## ETAPA MIG-A · aplicador de migrations (18/10/2026)
+
+Seção própria desta etapa (as etapas 8a e 8b mexem em FEITAS e PENDENTES em paralelo).
+
+### Feitas
+
+- **MIG-A P1 · config por banco.** Bloco de topo `migrations.bancos` no `~/.orq/repos.json`,
+  um escritor por banco, o resto `somente_leitura`; o dashboard-comercial fica fora de
+  `.repos[]`. Commit `662e074`. CONTRATO §19.1.
+  *Teste:* `orquestrador-migrations-config.test.ts`.
+- **MIG-A P2 · adaptador supabase.** `POST /database/query` numa transação implícita, com o
+  insert no `schema_migrations` (versão e nome do arquivo, `created_by`); envelope
+  `begin;/commit;` tirado; recusas; incerto; sonda; credencial mascarada. Commit `b32d262`.
+  CONTRATO §19.2.
+  *Teste:* `orquestrador-migrations-supabase.test.ts`.
+- **MIG-A P3 · linha de base e plano.** Corte, herdados com piso (E2, opção b), drift com
+  `created_by`; fixture real de 18/10 (`test/fixtures/migrations/`). Commit `16c84b5`.
+  CONTRATO §19.3.
+  *Teste:* `orquestrador-migrations-plano.test.ts`.
+- **MIG-A P4 · `orq migrations status|plano|linha-base|sonda|aplicar`.** Recusas, trava por
+  banco, `pre_check`, conferência antes do token, commit só do arquivo de liberação com
+  `Orq-Aplicador:`; `comitarUmArquivo` em `resolvedor/repo.ts`. Commit `c7539bd`. CONTRATO §19.4.
+  *Teste:* `orquestrador-migrations-aplicar.test.ts`.
+- **MIG-A P5 · documentação.** CONTRATO §19, esta seção, CHANGELOG e
+  `docs/aplicador-migrations.md`.
+  *Evidência:* `~/orq-sessoes/relatorio-kit-mig-a.md`.
+
+### Pendentes
+
+- **Primeiro uso real (Lucas, no terminal, depois do merge):** pôr o bloco no
+  `~/.orq/repos.json`, rodar `sonda`, `linha-base comarka --herdados-desde 20261004` e
+  `plano`, e aplicar o primeiro herdado.
+- **Frente do Comarka (E8):** trocar a skill `aplicar-migration-ddl` e o `banco.md:33-34`
+  para `orq migrations aplicar`, e proibir DDL por `execute_sql`.
+- **Aviso de classe vira trava** (MIG-6/MIG-8 do recon): nesta etapa ele só avisa.
+- **Arquivo com mais de um token do molde** (ex.: cita o token de outra migration como
+  dependência) pede `--token`; se ficar comum, o molde ganha uma marca de "este arquivo libera".
diff --git a/docs/aplicador-migrations.md b/docs/aplicador-migrations.md
new file mode 100644
index 0000000..0303db3
--- /dev/null
+++ b/docs/aplicador-migrations.md
@@ -0,0 +1,96 @@
+# Aplicador de migrations (`orq migrations`)
+
+O único caminho que aplica migration num banco (decisão de 18/10/2026). Ele roda do
+checkout principal do kit, no terminal, e trabalha por **banco**: os repos cujas
+migrations vão para o mesmo banco estão juntos no bloco `migrations.bancos` do
+`~/.orq/repos.json`. Contrato completo: `CONTRATO.md` §19.
+
+## 1. Configurar o banco (uma vez)
+
+No `~/.orq/repos.json`, ao lado de `"repos"`:
+
+```json
+"migrations": { "bancos": { "comarka": {
+  "ferramenta": "supabase",
+  "banco_id": "ogfnojbbvumujzfklkhh",
+  "repos": [
+    { "repo": "comarka-operacional", "dir": "supabase/migrations",
+      "refs": ["HEAD", "origin/staging-auto", "origin/staging-apolo"],
+      "credencial_env": "SUPABASE_ACCESS_TOKEN", "env_arquivo": ".env.local",
+      "token": { "formato": "liberadas", "molde": "migration-{id}-aplicada", "por": "lucas" },
+      "pre_check": ["python3", "scripts/roadmap/checar-promocao.py", "--aplicar", "{arquivo}"] },
+    { "caminho": "~/Projetos/dashboard-comercial", "dir": "supabase/migrations", "somente_leitura": true }
+  ]
+} } }
+```
+
+- `credencial_env` é o **nome** da variável no `.env.local` do repo. O valor nunca vai
+  para o repos.json, nunca é impresso e só o script o lê.
+- O dashboard-comercial fica **fora** de `"repos"`: entra só aqui, como `somente_leitura`,
+  para o plano e o drift.
+- `orq migrations status` acusa qualquer erro de config, campo por campo.
+
+## 2. Sonda e linha de base (uma vez por banco)
+
+```bash
+orq migrations sonda comarka
+orq migrations linha-base comarka --herdados-desde 20261004
+orq migrations plano comarka
+```
+
+- **sonda**: confere que duas instruções no mesmo texto rodam na mesma transação. Sem ela
+  verde, o `aplicar` recusa.
+- **linha-base**: grava em `~/.orq/migrations/comarka.json` o que está em produção agora
+  (o corte é a maior versão). Os arquivos com versão entre o `--herdados-desde` e o corte
+  que ainda não estão no ledger viram **herdados**, que o plano mostra à parte e o
+  aplicador pode aplicar. Nada abaixo do piso é cobrado. Trocar a linha de base depois
+  pede `--substituir`.
+- **plano**: pendentes (acima do corte), herdados, drift (linha de produção acima do
+  corte sem arquivo em nenhum repo do banco) e o que entrou desde o corte, com o
+  `created_by` de cada linha (`orq-aplicador:<usuário>` é o aplicador).
+
+## 3. Aplicar
+
+```bash
+orq migrations aplicar comarka-operacional 20261018003100_nps_fila_e_resposta_por_contato.sql
+```
+
+1. O comando confere tudo antes de escrever qualquer coisa:
+   - a pausa (do aplicador e do repo);
+   - a trava do banco;
+   - se o arquivo está no plano;
+   - o token (lido do cabeçalho do `.sql`; `--token humano:migration-<id>-aplicada` se o
+     arquivo não cita um, ou cita mais de um);
+   - o SQL e o `pre_check` do repo.
+2. Mostra o SQL inteiro, o ref de onde ele veio e o aviso de classe (DROP, GRANT, POLICY,
+   ...).
+3. Pede a **versão digitada**. Qualquer outra resposta cancela.
+4. Aplica numa transação só, com a versão e o nome do arquivo no `schema_migrations`.
+5. **Confere** que a linha entrou.
+6. Só então commita o token no `docs/fila/liberacoes.json` do repo: um commit só dele, com
+   o trailer `Orq-Aplicador:`. **Não dá push**: o push segue no ritual.
+
+Se a resposta for `INCERTO` (timeout, 5xx), o aplicador não emitiu token. Rode
+`orq migrations plano <banco>`:
+- se a versão aparece em "aplicadas desde o corte", libere o token à mão com a nota que o
+  aplicador imprimiu;
+- se não aparece, tente de novo.
+
+## 4. Pausar
+
+- `touch ~/.orq/MIGRATIONS_PAUSADO`: nenhum `aplicar` roda até o arquivo sair. O
+  `status` e o `plano` continuam.
+- O `pausar_file` do repo e o `docs/fila/.orq-pause` (ritual ou promoção) também
+  recusam o `aplicar` daquele repo.
+
+## 5. O que o aplicador nunca faz
+
+- push, merge, ou escrever no repo outro arquivo que não o de liberação;
+- usar o `apply_migration` ou o `execute_sql` do conector, ou o `POST /database/migrations`
+  (que grava a hora da aplicação como versão);
+- imprimir ou gravar a credencial;
+- aplicar sem TTY, sem a versão digitada ou sem a sonda verde;
+- emitir token sem conferir a linha no `schema_migrations`;
+- renomear arquivo ou mexer em linha antiga do ledger.
+
+Rastro de tudo: `~/.orq/migrations/ledger.jsonl`.
diff --git a/scripts/orq b/scripts/orq
index ebe42a6..c51cac0 100755
--- a/scripts/orq
+++ b/scripts/orq
@@ -21,6 +21,10 @@
 # só dele com trailer `Orq-Resolvedor`, no modo `auto` do repo no
 # ~/.orq/repos.json, e com as travas de scripts/orquestrador/resolvedor/.
 #
+# `migrations aplicar` (MIG-A) é a outra: aplica a migration no banco pela API
+# de gestão e escreve SÓ o token no arquivo de liberação do repo, num commit só
+# dele com trailer `Orq-Aplicador` (scripts/orquestrador/migrations/, CONTRATO §19).
+#
 # Nenhum subcomando toca ticket, staging, worktree, branch ou lock, e nenhum
 # mata processo — parar o loop é desagendar + esperar o disparo corrente
 # (Ciclo de vida, na SKILL). Se `orq` puder alterar estado, alguém vai
@@ -49,6 +53,9 @@
 #   orq resolver [--repo X] [--dry-run] [--sem-modelo]
 #                        resolvedor de bloqueios (7f-b2): tria e, no modo do repo, age
 #   orq desfazer <repo> <id>   reverte a última ação do resolvedor no ticket
+#   orq migrations status|plano|linha-base|sonda <banco>
+#   orq migrations aplicar <repo> <arquivo> [--token humano:<t>]
+#                        aplicador de migrations (MIG-A): o único caminho que aplica
 
 set -euo pipefail
 ORQ_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
@@ -119,6 +126,20 @@ if [ "${1:-}" = resolver ] || [ "${1:-}" = desfazer ]; then
   exit $?
 fi
 
+# --- `orq migrations` (etapa MIG-A) roda ANTES do lib.sh, e de qualquer lugar --
+# Pelo mesmo motivo do `resolver`: o aplicador trabalha por BANCO, sobre os
+# repos do bloco `migrations.bancos` do ~/.orq/repos.json, e não depende do
+# config do checkout onde este `orq` está (scripts/orquestrador/migrations/).
+if [ "${1:-}" = migrations ]; then
+  shift
+  _root="${ORQ_EXEC_ROOT:-$(cd "$ORQ_DIR/.." && pwd)}"
+  _gc="$(git -C "$_root" rev-parse --path-format=absolute --git-common-dir 2>/dev/null || true)"
+  if [ -n "$_gc" ] && [ -d "$_gc" ]; then _main="$(cd "$_gc/.." && pwd)"; else _main="$_root"; fi
+  if [ -x "$_main/node_modules/.bin/tsx" ]; then _tsx=( "$_main/node_modules/.bin/tsx" ); else _tsx=( npx --no-install tsx ); fi
+  "${_tsx[@]}" "$ORQ_DIR/orquestrador/migrations/cli.ts" "$@"
+  exit $?
+fi
+
 # shellcheck source=orquestrador/lib.sh
 source "$ORQ_DIR/orquestrador/lib.sh"
 
diff --git a/scripts/orquestrador/migrations/aplicar.ts b/scripts/orquestrador/migrations/aplicar.ts
new file mode 100644
index 0000000..5abc5db
--- /dev/null
+++ b/scripts/orquestrador/migrations/aplicar.ts
@@ -0,0 +1,187 @@
+/**
+ * aplicar.ts — `orq migrations aplicar <repo> <arquivo> [--token T]` (etapa MIG-A, P4).
+ *
+ * O único caminho que aplica migration (decisão 1 de 18/10). Nesta ordem, e
+ * cada recusa sai antes de qualquer escrita (as primeiras, antes da rede):
+ *
+ *   1. interruptor `~/.orq/MIGRATIONS_PAUSADO`;
+ *   2. o repo é o escritor de um banco (somente_leitura recusa);
+ *   3. TTY: só no terminal, com a confirmação digitada;
+ *   4. sonda verde do banco (`<banco>.sonda.json`) e linha de base;
+ *   5. o repo não está pausado e o arquivo de liberação está limpo (E5);
+ *   6. a trava do banco;
+ *   7. o arquivo está no plano (pendente ou herdado) e não diverge entre refs;
+ *   8. exatamente um token (do .sql ou do --token), ainda não liberado;
+ *   9. o SQL passa no preparo (sql.ts);
+ *  10. o `pre_check` do repo, com o .sql extraído, sai 0;
+ *  11. mostra o SQL e o aviso de classe, e pede a versão digitada.
+ *
+ * Depois aplica, CONFERE no schema_migrations que a versão entrou com o nome
+ * (sem isso, nunca há token: erro, incerto sem a linha ou conferência que falha
+ * param aqui) e só então escreve o token no repo (liberacao.ts). Cada passo
+ * vai para `~/.orq/migrations/ledger.jsonl`. Nunca push.
+ */
+import { existsSync, readFileSync, rmSync } from 'node:fs'
+import { spawnSync } from 'node:child_process'
+import { join } from 'node:path'
+import { arquivosDoBanco, conteudoDe } from './arquivos.js'
+import { arquivoLinhaBase, arquivoSonda, guardaDo, interruptorMigrations, lerJson, raizMigrations, registrar, travar } from './caminhos.js'
+import { bancoDoEscritor, type Banco, type RepoMig } from './config.js'
+import { bloqueiosDoRepo, comitarLiberacao, comToken, configDoRepo, jaLiberadoNoTexto, tokenDado, tokensDoSql } from './liberacao.js'
+import { montarPlano, type LinhaBase } from './plano.js'
+import { avisosDeClasse, prepararSql } from './sql.js'
+import { criarAdaptador, lerCredencial, type Adaptador } from './supabase.js'
+
+export interface Meios {
+  tty: boolean
+  perguntar: (texto: string) => Promise<string>
+  escrever: (texto: string) => void
+  usuario: string
+  agora: () => Date
+}
+
+export type Saida = { ok: true; commit: string; token: string } | { ok: false; tipo: 'recusa' | 'falha' | 'incerto'; motivo: string }
+
+const recusa = (motivo: string): Saida => ({ ok: false, tipo: 'recusa', motivo })
+
+/** O adaptador do banco, com a credencial do escritor (lida só aqui). */
+export function adaptadorDo(banco: Banco): Adaptador {
+  const r = banco.escritor
+  if (!r || !r.credencialEnv) throw new Error(`banco ${banco.nome} sem repo escritor com credencial_env`)
+  const httpS = process.env.ORQ_TESTE === '1' && process.env.ORQ_MIGRATIONS_HTTP_TIMEOUT_S ? Number(process.env.ORQ_MIGRATIONS_HTTP_TIMEOUT_S) : banco.timeouts.httpS
+  return criarAdaptador({ bancoId: banco.bancoId, token: lerCredencial(r.caminho, r.envArquivo, r.credencialEnv), timeouts: { ...banco.timeouts, httpS } })
+}
+
+export async function aplicar(e: { repo: string; arquivo: string; token?: string }, m: Meios): Promise<Saida> {
+  if (existsSync(interruptorMigrations())) return recusa(`${interruptorMigrations()} existe (MIGRATIONS_PAUSADO): nada aplica`)
+  let banco: Banco
+  let repo: RepoMig
+  try {
+    ;({ banco, repo } = bancoDoEscritor(e.repo))
+  } catch (x) {
+    return recusa((x as Error).message)
+  }
+  if (repo.somenteLeitura || !repo.token) return recusa(`${repo.nome} é somente_leitura no banco ${banco.nome}: só conta para o plano e o drift`)
+  const molde = repo.token.molde
+  if (!m.tty) return recusa('sem TTY: o aplicar só roda no terminal, com a confirmação digitada')
+  if (lerJson<{ mesma_transacao?: unknown }>(arquivoSonda(banco.nome))?.mesma_transacao !== true) return recusa(`sem sonda verde do banco ${banco.nome}: rode 'orq migrations sonda ${banco.nome}' antes`)
+  const lb = lerJson<LinhaBase>(arquivoLinhaBase(banco.nome))
+  if (!lb) return recusa(`sem linha de base do banco ${banco.nome}: rode 'orq migrations linha-base ${banco.nome}' antes`)
+  let cfg: ReturnType<typeof configDoRepo>
+  try {
+    cfg = configDoRepo(repo.caminho)
+  } catch (x) {
+    return recusa((x as Error).message)
+  }
+  const bloq = bloqueiosDoRepo(repo.caminho, cfg)
+  if (bloq.length) return recusa(bloq.join('; '))
+
+  const g = guardaDo(banco)
+  const solta = travar(g, banco.nome)
+  if (typeof solta === 'string') return recusa(solta)
+  let ad: Adaptador | null = null
+  const mask = (s: string) => (ad ? ad.mascarar(s) : s)
+  try {
+    ad = adaptadorDo(banco)
+    const a = ad
+    const { arquivos } = arquivosDoBanco(banco)
+    const plano = montarPlano(lb, await a.listarAplicadas(), arquivos)
+    const quer = e.arquivo.replace(/^\.\//, '')
+    const casa = (x: { repo: string; arquivo: string }) => x.repo === repo.nome && (x.arquivo === quer || x.arquivo.split('/').pop() === quer.split('/').pop())
+    const herdado = plano.herdados.find(casa)
+    const alvo = plano.pendentes.find(casa) ?? herdado
+    if (!alvo) return recusa(`${e.arquivo} está fora do plano do banco ${banco.nome} (já aplicado, antigo ou inexistente): veja 'orq migrations plano ${banco.nome}'`)
+    if (alvo.divergente) return recusa(`${alvo.arquivo} tem conteúdo diferente entre os refs ${alvo.refs.join(', ')}: alinhe antes`)
+    const { ref, sql } = conteudoDe(repo, alvo)
+
+    const doSql = tokensDoSql(sql, molde)
+    let token: string
+    if (e.token !== undefined) {
+      const t = tokenDado(e.token, molde)
+      if (!t) return recusa(`--token ${e.token} não casa o molde humano:${molde}`)
+      token = t
+    } else if (doSql.length === 1) token = doSql[0]!
+    else return recusa(doSql.length ? `o .sql cita ${doSql.length} tokens (${doSql.join(', ')}): diga qual com --token` : `o .sql não cita token humano:${molde}: diga qual com --token`)
+    const libAbs = join(repo.caminho, cfg.liberacoesFile)
+    const antes = readFileSync(libAbs, 'utf8')
+    if (jaLiberadoNoTexto(antes, token)) return recusa(`${token} já está liberado em ${cfg.liberacoesFile}`)
+
+    const prep = prepararSql(sql)
+    if (!prep.ok) return recusa(`${alvo.arquivo}: ${prep.motivo}`)
+
+    if (repo.preCheck) {
+      const tmp = join(raizMigrations(), 'tmp', alvo.arquivo.split('/').pop()!)
+      g.escrever(tmp, sql)
+      try {
+        const args = repo.preCheck.map((x) => x.split('{arquivo}').join(tmp))
+        const p = spawnSync(args[0]!, args.slice(1), { cwd: repo.caminho, encoding: 'utf8', timeout: 300_000, stdio: ['ignore', 'pipe', 'pipe'] })
+        const out = mask(`${p.stdout ?? ''}${p.stderr ?? ''}`.trim())
+        m.escrever(`pre_check (${repo.preCheck.join(' ')}): rc ${p.status ?? 'sem rc'}\n${out}`)
+        if (p.status !== 0) return recusa(`pre_check saiu rc ${p.status ?? 'sem rc'}: ${out.split('\n').slice(-5).join(' | ')}`)
+      } finally {
+        rmSync(tmp, { force: true })
+      }
+    }
+
+    const avisos = avisosDeClasse(sql)
+    m.escrever(
+      [
+        `banco    ${banco.nome} (${banco.bancoId})`,
+        `repo     ${repo.nome}`,
+        `arquivo  ${alvo.arquivo} (ref ${ref}${herdado ? ', herdado da linha de base' : ''})`,
+        `versão   ${alvo.versao}   nome ${alvo.nome}`,
+        `token    ${token}`,
+        avisos.length ? `AVISO de classe: ${avisos.join(', ')}` : 'aviso de classe: nenhum',
+        prep.envelope ? 'o envelope begin;/commit; do arquivo sai: o aplicador roda tudo numa transação só' : '',
+        '----- SQL -----',
+        sql.trimEnd(),
+        '---------------',
+      ]
+        .filter(Boolean)
+        .join('\n'),
+    )
+    const resp = (await m.perguntar(`Digite a versão ${alvo.versao} para aplicar (qualquer outra coisa cancela): `)).trim()
+    if (resp !== alvo.versao) return recusa(`confirmação não confere ('${resp.slice(0, 40)}'): nada aplicado`)
+
+    const base = { banco: banco.nome, repo: repo.nome, arquivo: alvo.arquivo, versao: alvo.versao, nome: alvo.nome, ref, usuario: m.usuario }
+    registrar(g, { ...base, tipo: 'aplicar_inicio', herdado: !!herdado, avisos })
+    const criadoPor = `orq-aplicador:${m.usuario}`
+    const r = await a.aplicar({ corpo: prep.corpo, statements: prep.statements, versao: alvo.versao, nome: alvo.nome, criadoPor })
+    let achou: boolean
+    try {
+      achou = (await a.listarAplicadas()).some((l) => l.version === alvo.versao && l.name === alvo.nome)
+    } catch (x) {
+      registrar(g, { ...base, tipo: 'incerto', resultado: r.ok ? 'ok' : r.mensagem, conferencia: mask((x as Error).message) })
+      return { ok: false, tipo: 'incerto', motivo: `não consegui conferir no schema_migrations (${mask((x as Error).message)}): não sei se aplicou, e não emiti token; rode 'orq migrations plano ${banco.nome}'` }
+    }
+    if (!achou) {
+      if (r.ok) {
+        registrar(g, { ...base, tipo: 'conferencia_falhou' })
+        return { ok: false, tipo: 'falha', motivo: `a API disse ok, mas a conferência não achou ${alvo.versao} ${alvo.nome} no schema_migrations: não emiti token; confira à mão` }
+      }
+      registrar(g, { ...base, tipo: r.incerto ? 'incerto' : 'falhou', mensagem: r.mensagem })
+      return r.incerto
+        ? { ok: false, tipo: 'incerto', motivo: `${r.mensagem}; a versão não está no schema_migrations agora: não emiti token; rode 'orq migrations plano ${banco.nome}' antes de tentar de novo` }
+        : { ok: false, tipo: 'falha', motivo: `o banco recusou (nada aplicado): ${r.mensagem}` }
+    }
+    registrar(g, { ...base, tipo: 'aplicada', created_by: criadoPor, ...(r.ok ? {} : { resposta: r.mensagem, incerto_resolvido: true }) })
+
+    const ainda = bloqueiosDoRepo(repo.caminho, cfg)
+    const nota = `aplicador do kit, versão ${alvo.versao}, arquivo ${alvo.arquivo}, ref ${ref}, usuário ${m.usuario}`
+    const novo = ainda.length ? null : comToken(readFileSync(libAbs, 'utf8'), repo.token, token, nota, m.usuario)
+    const mensagem = `liberacoes: ${token} (migration ${alvo.versao} aplicada pelo aplicador do kit)\n\n${alvo.arquivo} (ref ${ref}) aplicada no banco ${banco.nome} (${banco.bancoId}) e conferida no schema_migrations.\n\nOrq-Aplicador: ${banco.nome} ${alvo.versao} ${alvo.arquivo}\n`
+    const c = novo === null ? { ok: false as const, motivo: ainda.join('; ') } : !novo.ok ? { ok: false as const, motivo: novo.motivo } : comitarLiberacao(repo.caminho, cfg, readFileSync(libAbs, 'utf8'), novo.conteudo, mensagem)
+    if (!c.ok) {
+      registrar(g, { ...base, tipo: 'token_falhou', token, motivo: c.motivo })
+      return { ok: false, tipo: 'falha', motivo: `aplicada e conferida, mas o token ${token} NÃO foi escrito (${c.motivo}): libere à mão, com a nota '${nota}'` }
+    }
+    registrar(g, { ...base, tipo: 'token_emitido', token, commit: c.commit })
+    m.escrever(`APLICADA ${alvo.versao} ${alvo.nome} · conferida · token ${token} no commit ${c.commit.slice(0, 12)} (sem push)`)
+    return { ok: true, commit: c.commit, token }
+  } catch (x) {
+    return { ok: false, tipo: 'falha', motivo: mask((x as Error).message) }
+  } finally {
+    solta()
+  }
+}
+
diff --git a/scripts/orquestrador/migrations/arquivos.ts b/scripts/orquestrador/migrations/arquivos.ts
new file mode 100644
index 0000000..7343745
--- /dev/null
+++ b/scripts/orquestrador/migrations/arquivos.ts
@@ -0,0 +1,48 @@
+/**
+ * arquivos.ts — os arquivos de migration de um banco, lidos dos refs git de
+ * cada repo (etapa MIG-A, P4). Só leitura, só por `gitLeitura`
+ * (GIT_OPTIONAL_LOCKS=0): `rev-parse`, `ls-tree` e `show`.
+ *
+ * Por que refs e não a árvore: 5 dos 6 pendentes do Comarka em 18/10 só
+ * existiam em `origin/staging-auto` ou `origin/staging-apolo` (a expansão é
+ * aplicada antes da promoção do código que a usa). O mesmo caminho com blob
+ * diferente entre refs é `divergente`, e o aplicador recusa.
+ */
+import { gitLeitura } from '../triador/git.js'
+import type { Banco, RepoMig } from './config.js'
+import { versaoDoArquivo, type ArquivoMig } from './plano.js'
+
+export function arquivosDoBanco(banco: Banco): { arquivos: ArquivoMig[]; avisos: string[] } {
+  const arquivos: ArquivoMig[] = []
+  const avisos: string[] = []
+  for (const r of banco.repos) {
+    const vistos = new Map<string, { refs: string[]; blobs: Set<string> }>()
+    for (const ref of r.refs) {
+      if (gitLeitura(r.caminho, ['rev-parse', '--verify', '--quiet', `${ref}^{commit}`]).rc !== 0) {
+        avisos.push(`${r.nome}: ref ${ref} não existe em ${r.caminho}`)
+        continue
+      }
+      const ls = gitLeitura(r.caminho, ['ls-tree', ref, '--', `${r.dir.replace(/\/+$/, '')}/`])
+      for (const l of ls.stdout.split('\n')) {
+        const m = /^\d+ blob ([0-9a-f]+)\t(.+)$/.exec(l)
+        if (!m || !versaoDoArquivo(m[2]!)) continue
+        const v = vistos.get(m[2]!) ?? { refs: [], blobs: new Set<string>() }
+        v.refs.push(ref)
+        v.blobs.add(m[1]!)
+        vistos.set(m[2]!, v)
+      }
+    }
+    for (const [arquivo, v] of vistos) {
+      arquivos.push({ repo: r.nome, arquivo, ...versaoDoArquivo(arquivo)!, refs: v.refs, divergente: v.blobs.size > 1, somenteLeitura: r.somenteLeitura })
+    }
+  }
+  return { arquivos, avisos }
+}
+
+/** O conteúdo do arquivo no primeiro ref que o tem. */
+export function conteudoDe(r: RepoMig, a: ArquivoMig): { ref: string; sql: string } {
+  const ref = a.refs[0]!
+  const s = gitLeitura(r.caminho, ['show', `${ref}:${a.arquivo}`])
+  if (s.rc !== 0) throw new Error(`não consegui ler ${ref}:${a.arquivo} em ${r.caminho}`)
+  return { ref, sql: s.stdout }
+}
diff --git a/scripts/orquestrador/migrations/caminhos.ts b/scripts/orquestrador/migrations/caminhos.ts
new file mode 100644
index 0000000..59ccbfd
--- /dev/null
+++ b/scripts/orquestrador/migrations/caminhos.ts
@@ -0,0 +1,75 @@
+/**
+ * caminhos.ts — onde o aplicador escreve FORA dos repos (etapa MIG-A, P4).
+ *
+ * Raiz: `ORQ_MIGRATIONS_DIR`, ou `~/.orq/migrations`. Dentro dela:
+ *   ledger.jsonl        cada aplicação, conferência, token e falha (só acrescenta)
+ *   <banco>.json        a linha de base (plano.ts)
+ *   <banco>.sonda.json  a sonda de transação (sem ela verde, nada aplica)
+ *   <banco>.lock        a trava por banco (O_EXCL, com o pid; órfã se o pid morreu)
+ *   tmp/                o .sql extraído do ref para o pre_check
+ *
+ * O interruptor é `ORQ_MIGRATIONS_PAUSADO`, ou `~/.orq/MIGRATIONS_PAUSADO`.
+ * A escrita passa pela mesma guarda do resolvedor (`GuardaResolvedor`), com
+ * esta raiz: fora dela, ou dentro de qualquer repo, lança.
+ */
+import { existsSync, readFileSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { join, resolve } from 'node:path'
+import { GuardaResolvedor } from '../resolvedor/caminhos.js'
+import type { Banco } from './config.js'
+
+export const raizMigrations = (): string => resolve(process.env.ORQ_MIGRATIONS_DIR || join(homedir(), '.orq', 'migrations'))
+export const interruptorMigrations = (): string => resolve(process.env.ORQ_MIGRATIONS_PAUSADO || join(homedir(), '.orq', 'MIGRATIONS_PAUSADO'))
+export const arquivoLedger = (): string => join(raizMigrations(), 'ledger.jsonl')
+export const arquivoLinhaBase = (banco: string): string => join(raizMigrations(), `${banco}.json`)
+export const arquivoSonda = (banco: string): string => join(raizMigrations(), `${banco}.sonda.json`)
+export const arquivoTrava = (banco: string): string => join(raizMigrations(), `${banco}.lock`)
+
+export const guardaDo = (banco: Banco): GuardaResolvedor => new GuardaResolvedor(banco.repos.map((r) => r.caminho).filter(Boolean), raizMigrations())
+
+export function registrar(g: GuardaResolvedor, e: Record<string, unknown>): void {
+  g.acrescentar(arquivoLedger(), JSON.stringify({ ts: new Date().toISOString(), ...e }))
+}
+
+export function lerJson<T>(p: string): T | null {
+  try {
+    return JSON.parse(readFileSync(p, 'utf8')) as T
+  } catch {
+    return null
+  }
+}
+
+const vivo = (pid: number): boolean => {
+  try {
+    process.kill(pid, 0)
+    return true
+  } catch (e) {
+    return (e as NodeJS.ErrnoException).code === 'EPERM'
+  }
+}
+
+/** A trava do banco: a função que solta, ou o motivo de não conseguir. */
+export function travar(g: GuardaResolvedor, banco: string): (() => void) | string {
+  const p = arquivoTrava(banco)
+  const corpo = JSON.stringify({ pid: process.pid, hora: new Date().toISOString() }) + '\n'
+  for (let tentativa = 0; tentativa < 2; tentativa++) {
+    if (g.criarExclusivo(p, corpo)) {
+      return () => {
+        try {
+          if (existsSync(p)) g.apagar(p)
+        } catch {
+          /* já saiu */
+        }
+      }
+    }
+    const t = lerJson<{ pid?: unknown; hora?: unknown }>(p)
+    const pid = typeof t?.pid === 'number' ? t.pid : NaN
+    if (Number.isInteger(pid) && vivo(pid)) return `outro aplicar segura a trava do banco ${banco} (pid ${pid} desde ${String(t?.hora)}): ${p}`
+    try {
+      g.apagar(p) // órfã: o pid morreu (ou o arquivo é ilegível)
+    } catch {
+      /* outro levou a órfã */
+    }
+  }
+  return `não consegui a trava do banco ${banco}: ${p}`
+}
diff --git a/scripts/orquestrador/migrations/cli.ts b/scripts/orquestrador/migrations/cli.ts
new file mode 100644
index 0000000..ffba3e5
--- /dev/null
+++ b/scripts/orquestrador/migrations/cli.ts
@@ -0,0 +1,176 @@
+/**
+ * cli.ts — `orq migrations` (etapa MIG-A, P4).
+ *
+ *   orq migrations status [<banco>]          linha de base, sonda e contagens do plano
+ *   orq migrations plano <banco>             pendentes, herdados, drift e o que entrou desde o corte
+ *   orq migrations linha-base <banco> [--corte V] [--herdados-desde V] [--substituir]
+ *   orq migrations sonda <banco>             duas instruções, mesma transação? (obrigatória)
+ *   orq migrations aplicar <repo> <arquivo> [--token humano:<t>]
+ *
+ * <banco> é um nome de `migrations.bancos` do ~/.orq/repos.json; <repo>, o nome
+ * do escritor no bloco (ou o caminho). Só o `aplicar` escreve num repo, e só o
+ * token (aplicar.ts). status, plano e sonda só leem o banco; linha-base e sonda
+ * gravam só em ~/.orq/migrations. rc 0 ok · 1 recusa ou falha · 2 uso.
+ */
+import { existsSync } from 'node:fs'
+import { createInterface } from 'node:readline/promises'
+import { adaptadorDo, aplicar, type Meios } from './aplicar.js'
+import { arquivosDoBanco, conteudoDe } from './arquivos.js'
+import { arquivoLinhaBase, arquivoSonda, guardaDo, lerJson } from './caminhos.js'
+import { acharBanco, lerBancos, type Banco } from './config.js'
+import { tokensDoSql } from './liberacao.js'
+import { montarLinhaBase, montarPlano, type ArquivoMig, type LinhaBase, type Plano } from './plano.js'
+
+const USO = [
+  'uso: orq migrations status [<banco>]',
+  '     orq migrations plano <banco>',
+  '     orq migrations linha-base <banco> [--corte AAAAMMDD[HHMMSS]] [--herdados-desde AAAAMMDD[HHMMSS]] [--substituir]',
+  '     orq migrations sonda <banco>',
+  '     orq migrations aplicar <repo> <arquivo> [--token humano:<tipo>-<id>]',
+].join('\n')
+
+class Uso extends Error {}
+
+function flags(args: string[], aceitas: string[], booleanas: string[] = []): { pos: string[]; f: Record<string, string> } {
+  const pos: string[] = []
+  const f: Record<string, string> = {}
+  for (let i = 0; i < args.length; i++) {
+    const a = args[i]!
+    if (booleanas.includes(a)) f[a] = '1'
+    else if (aceitas.includes(a)) {
+      const v = args[++i]
+      if (v === undefined) throw new Uso(`${a} pede um valor`)
+      f[a] = v
+    } else if (a.startsWith('--')) throw new Uso(`flag desconhecida: ${a}`)
+    else pos.push(a)
+  }
+  return { pos, f }
+}
+
+async function planoDe(b: Banco): Promise<{ lb: LinhaBase; plano: Plano; avisos: string[] }> {
+  const lb = lerJson<LinhaBase>(arquivoLinhaBase(b.nome))
+  if (!lb) throw new Error(`sem linha de base do banco ${b.nome}: rode 'orq migrations linha-base ${b.nome}'`)
+  const { arquivos, avisos } = arquivosDoBanco(b)
+  return { lb, plano: montarPlano(lb, await adaptadorDo(b).listarAplicadas(), arquivos), avisos }
+}
+
+function linhaArquivo(b: Banco, a: ArquivoMig): string {
+  const r = b.repos.find((x) => x.nome === a.repo)
+  let token = ''
+  if (r?.token && !a.somenteLeitura) {
+    try {
+      const t = tokensDoSql(conteudoDe(r, a).sql, r.token.molde)
+      token = t.length === 1 ? ` · token ${t[0]}` : t.length ? ` · ${t.length} tokens (use --token)` : ' · sem token no .sql (use --token)'
+    } catch {
+      token = ' · ilegível'
+    }
+  }
+  const marcas = [a.somenteLeitura ? 'somente_leitura: não aplicável aqui' : '', a.divergente ? 'DIVERGE entre refs' : ''].filter(Boolean)
+  return `  ${a.repo}  ${a.arquivo}  [${a.refs.join(', ')}]${token}${marcas.length ? ` · ${marcas.join(' · ')}` : ''}`
+}
+
+export async function main(argv: string[], meios: Partial<Meios> & { erro?: (t: string) => void } = {}): Promise<number> {
+  const out = meios.escrever ?? ((t: string) => void process.stdout.write(`${t}\n`))
+  const err = meios.erro ?? (meios.escrever ? meios.escrever : (t: string) => void process.stderr.write(`${t}\n`))
+  const [verbo, ...resto] = argv
+  try {
+    if (verbo === 'status') {
+      const { pos } = flags(resto, [])
+      const { bancos, erros } = lerBancos()
+      if (erros.length) throw new Error(`config de migrations inválida:\n  ${erros.join('\n  ')}`)
+      const alvo = pos[0] ? [acharBanco(pos[0])] : bancos
+      if (!alvo.length) out('nenhum banco em migrations.bancos do repos.json')
+      for (const b of alvo) {
+        const lb = lerJson<LinhaBase>(arquivoLinhaBase(b.nome))
+        const sonda = lerJson<{ mesma_transacao?: unknown }>(arquivoSonda(b.nome))
+        const partes = [
+          `${b.nome} (${b.bancoId})`,
+          lb ? `corte ${lb.corte} (linha de base de ${lb.criado_em.slice(0, 10)})` : 'sem linha de base',
+          sonda ? (sonda.mesma_transacao === true ? 'sonda ok' : 'sonda VERMELHA') : 'sem sonda',
+        ]
+        if (lb && b.escritor) {
+          try {
+            const { plano } = await planoDe(b)
+            partes.push(`${plano.pendentes.length} pendente(s) · ${plano.herdados.length} herdado(s) · ${plano.drift.length} drift`)
+          } catch (e) {
+            partes.push(`plano indisponível: ${(e as Error).message}`)
+          }
+        }
+        out(partes.join(' · '))
+      }
+      return 0
+    }
+    if (verbo === 'plano') {
+      const { pos } = flags(resto, [])
+      if (pos.length !== 1) throw new Uso('plano pede o banco')
+      const b = acharBanco(pos[0]!)
+      const { lb, plano, avisos } = await planoDe(b)
+      const linhas = [`banco ${b.nome} (${b.bancoId}) · corte ${lb.corte}${lb.herdados_desde ? ` · herdados desde ${lb.herdados_desde}` : ''} · ${lb.antigos_sem_ledger} antigos sem ledger fora do plano`]
+      for (const a of avisos) linhas.push(`aviso: ${a}`)
+      linhas.push(`Pendentes (${plano.pendentes.length})`, ...plano.pendentes.map((a) => linhaArquivo(b, a)))
+      linhas.push(`Herdados (${plano.herdados.length})`, ...plano.herdados.map((a) => linhaArquivo(b, a)))
+      linhas.push(`Drift (${plano.drift.length}): linha de produção acima do corte sem arquivo em nenhum repo do banco`, ...plano.drift.map((l) => `  ${l.version} ${l.name ?? '(sem nome)'}  created_by ${l.created_by ?? '(vazio)'}`))
+      linhas.push(`Aplicadas desde o corte (${plano.aplicadasDesdeCorte.length})`, ...plano.aplicadasDesdeCorte.map((l) => `  ${l.version} ${l.name ?? '(sem nome)'}  created_by ${l.created_by ?? '(vazio)'}  ${l.arquivo ?? '(sem arquivo)'}`))
+      out(linhas.join('\n'))
+      return 0
+    }
+    if (verbo === 'linha-base') {
+      const { pos, f } = flags(resto, ['--corte', '--herdados-desde'], ['--substituir'])
+      if (pos.length !== 1) throw new Uso('linha-base pede o banco')
+      const b = acharBanco(pos[0]!)
+      const arq = arquivoLinhaBase(b.nome)
+      if (existsSync(arq) && !f['--substituir']) {
+        err(`[orq migrations] a linha de base de ${b.nome} já existe (${arq}); trocar é decisão: use --substituir`)
+        return 1
+      }
+      const { arquivos, avisos } = arquivosDoBanco(b)
+      const lb = montarLinhaBase({ banco: b.nome, aplicadas: await adaptadorDo(b).listarAplicadas(), arquivos, ...(f['--corte'] ? { corte: f['--corte'] } : {}), ...(f['--herdados-desde'] ? { herdadosDesde: f['--herdados-desde'] } : {}), agora: new Date() })
+      guardaDo(b).escrever(arq, `${JSON.stringify(lb, null, 2)}\n`)
+      for (const a of avisos) out(`aviso: ${a}`)
+      out(`linha de base de ${b.nome}: corte ${lb.corte}, ${lb.aplicadas.length} linhas no ledger, ${lb.pendentes_herdados.length} herdado(s), ${lb.antigos_sem_ledger} antigo(s) sem ledger fora do plano · ${arq}`)
+      return 0
+    }
+    if (verbo === 'sonda') {
+      const { pos } = flags(resto, [])
+      if (pos.length !== 1) throw new Uso('sonda pede o banco')
+      const b = acharBanco(pos[0]!)
+      const ok = await adaptadorDo(b).sonda()
+      guardaDo(b).escrever(arquivoSonda(b.nome), `${JSON.stringify({ banco: b.nome, banco_id: b.bancoId, mesma_transacao: ok, em: new Date().toISOString() }, null, 2)}\n`)
+      out(ok ? `sonda ${b.nome}: duas instruções no mesmo texto rodam na mesma transação; o aplicar está liberado neste banco` : `sonda ${b.nome}: VERMELHA (txid diferente): o aplicar fica recusado neste banco`)
+      return ok ? 0 : 1
+    }
+    if (verbo === 'aplicar') {
+      const { pos, f } = flags(resto, ['--token'])
+      if (pos.length !== 2) throw new Uso('aplicar pede o repo e o arquivo')
+      const tty = meios.tty ?? (!!process.stdin.isTTY && !!process.stdout.isTTY)
+      let rl: ReturnType<typeof createInterface> | null = null
+      const perguntar =
+        meios.perguntar ??
+        (async (t: string) => {
+          rl ??= createInterface({ input: process.stdin, output: process.stdout })
+          return rl.question(t)
+        })
+      try {
+        const r = await aplicar(
+          { repo: pos[0]!, arquivo: pos[1]!, ...(f['--token'] ? { token: f['--token'] } : {}) },
+          { tty, perguntar, escrever: out, usuario: meios.usuario ?? process.env.USER ?? process.env.LOGNAME ?? 'desconhecido', agora: meios.agora ?? (() => new Date()) },
+        )
+        if (r.ok) return 0
+        err(`[orq migrations] ${r.tipo === 'recusa' ? 'RECUSADO' : r.tipo === 'incerto' ? 'INCERTO' : 'FALHOU'}: ${r.motivo}`)
+        return 1
+      } finally {
+        ;(rl as ReturnType<typeof createInterface> | null)?.close()
+      }
+    }
+    throw new Uso(verbo ? `verbo desconhecido: ${verbo}` : 'falta o verbo')
+  } catch (e) {
+    if (e instanceof Uso) {
+      err(`[orq migrations] ${e.message}\n${USO}`)
+      return 2
+    }
+    err(`[orq migrations] ${(e as Error).message}`)
+    return 1
+  }
+}
+
+if (/migrations\/cli\.(ts|js)$/.test(process.argv[1] ?? '')) process.exit(await main(process.argv.slice(2)))
diff --git a/scripts/orquestrador/migrations/config.ts b/scripts/orquestrador/migrations/config.ts
new file mode 100644
index 0000000..1e797b5
--- /dev/null
+++ b/scripts/orquestrador/migrations/config.ts
@@ -0,0 +1,210 @@
+/**
+ * config.ts — o bloco `migrations.bancos` do `~/.orq/repos.json` (etapa MIG-A, P1).
+ *
+ * O aplicador é por BANCO, não por repo (decisão 5 de 18/10): um banco junta os
+ * repos cujas migrations vão para ele, e no máximo UM deles escreve. O bloco
+ * mora no topo do repos.json, e não em cada item de `.repos[]` (E1): o
+ * dashboard-comercial escreve no mesmo banco do Comarka, mas não tem fila, e
+ * entrar em `.repos[]` faria o resolvedor e o painel varrerem ele.
+ *
+ *   "migrations": { "bancos": { "<nome>": {
+ *     "ferramenta": "supabase", "banco_id": "<ref do projeto>",
+ *     "timeouts": { "lock_timeout_s": 5, "statement_timeout_s": 60, "http_timeout_s": 120 },
+ *     "repos": [
+ *       { "repo": "<nome em .repos[]>", "dir": "supabase/migrations",
+ *         "refs": ["HEAD", "origin/staging-auto"],          (padrão ["HEAD"])
+ *         "credencial_env": "SUPABASE_ACCESS_TOKEN", "env_arquivo": ".env.local",
+ *         "token": { "formato": "liberadas" | "v2", "molde": "migration-{id}-aplicada", "por": "lucas" },
+ *         "pre_check": ["python3", "scripts/roadmap/checar-promocao.py", "--aplicar", "{arquivo}"] },
+ *       { "caminho": "~/Projetos/dashboard-comercial", "dir": "supabase/migrations", "somente_leitura": true }
+ *     ] } } }
+ *
+ * `repo` aponta um item de `.repos[]` pelo nome (o de `lerRepos`); `caminho`
+ * serve ao repo que não está lá. Repo `somente_leitura` só conta para o plano e
+ * o drift: não precisa de credencial nem de token, e nunca é escrito. Nada
+ * disso mora no `000-config.json` dos repos.
+ */
+import { readFileSync } from 'node:fs'
+import { homedir } from 'node:os'
+import { isAbsolute, normalize, resolve, sep } from 'node:path'
+import { arquivoRepos, lerRepos, type RepoListado } from '../triador/saida.js'
+
+export interface TokenCfg {
+  formato: 'liberadas' | 'v2'
+  /** o token sem o `humano:`, com `{id}` no lugar do id do ticket */
+  molde: string
+  /** quem assina a liberação no formato `liberadas`; ausente: o usuário do terminal */
+  por?: string
+}
+
+export interface RepoMig {
+  nome: string
+  caminho: string
+  dir: string
+  refs: string[]
+  somenteLeitura: boolean
+  credencialEnv: string | null
+  envArquivo: string
+  token: TokenCfg | null
+  preCheck: string[] | null
+}
+
+export interface Timeouts {
+  lockS: number
+  statementS: number
+  httpS: number
+}
+
+export interface Banco {
+  nome: string
+  ferramenta: 'supabase'
+  bancoId: string
+  repos: RepoMig[]
+  escritor: RepoMig | null
+  timeouts: Timeouts
+}
+
+export const TIMEOUTS_PADRAO: Timeouts = { lockS: 5, statementS: 60, httpS: 120 }
+
+const obj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v)
+const texto = (v: unknown): v is string => typeof v === 'string' && v.trim() !== ''
+const relativoDentro = (p: string) => !isAbsolute(p) && !normalize(p).split(sep).includes('..')
+const expande = (p: string) => resolve(p.replace(/^~(?=\/|$)/, homedir()))
+
+function repoDe(it: unknown, onde: string, listados: RepoListado[], erros: string[]): RepoMig | null {
+  if (!obj(it)) {
+    erros.push(`${onde}: tem de ser um objeto`)
+    return null
+  }
+  let nome = ''
+  let caminho = ''
+  if (texto(it.repo) === texto(it.caminho)) {
+    erros.push(`${onde}: exatamente um de 'repo' (nome em .repos[]) ou 'caminho'`)
+  } else if (texto(it.repo)) {
+    const l = listados.find((r) => r.nome === it.repo)
+    if (!l) erros.push(`${onde}.repo: '${it.repo}' não está em .repos[] (use 'caminho' para repo fora da lista)`)
+    else ({ nome, caminho } = l)
+  } else {
+    caminho = expande(it.caminho as string)
+    nome = caminho.split(sep).pop()!
+  }
+  const dir = it.dir
+  if (!texto(dir) || !relativoDentro(dir)) erros.push(`${onde}.dir: caminho relativo dentro do repo, sem '..' (recebi ${JSON.stringify(dir)})`)
+  let refs = ['HEAD']
+  if (it.refs !== undefined) {
+    if (!Array.isArray(it.refs) || it.refs.length === 0 || !it.refs.every(texto)) erros.push(`${onde}.refs: lista não vazia de refs git (recebi ${JSON.stringify(it.refs)})`)
+    else refs = it.refs as string[]
+  }
+  const somenteLeitura = it.somente_leitura === true
+  if (it.somente_leitura !== undefined && typeof it.somente_leitura !== 'boolean') erros.push(`${onde}.somente_leitura: true ou false`)
+
+  let credencialEnv: string | null = null
+  let token: TokenCfg | null = null
+  let preCheck: string[] | null = null
+  const envArquivo = texto(it.env_arquivo) ? it.env_arquivo : '.env.local'
+  if (!relativoDentro(envArquivo)) erros.push(`${onde}.env_arquivo: caminho relativo dentro do repo`)
+  if (!somenteLeitura) {
+    if (texto(it.credencial_env) && /^[A-Z_][A-Z0-9_]*$/.test(it.credencial_env)) credencialEnv = it.credencial_env
+    else erros.push(`${onde}.credencial_env: o NOME da variável no ${envArquivo} (ex.: SUPABASE_ACCESS_TOKEN), nunca o valor`)
+    const t = it.token
+    if (!obj(t)) erros.push(`${onde}.token: obrigatório no repo que escreve ({formato, molde})`)
+    else {
+      if (t.formato !== 'liberadas' && t.formato !== 'v2') erros.push(`${onde}.token.formato: 'liberadas' (formato do Comarka) ou 'v2' (o do kit)`)
+      if (!texto(t.molde) || t.molde.split('{id}').length !== 2 || !/^[a-z-]*\{id\}[a-z-]*$/.test(t.molde)) erros.push(`${onde}.token.molde: o token sem 'humano:', com '{id}' uma vez (ex.: migration-{id}-aplicada)`)
+      if (t.por !== undefined && !texto(t.por)) erros.push(`${onde}.token.por: texto não vazio`)
+      if (t.formato === 'liberadas' || t.formato === 'v2') token = { formato: t.formato, molde: String(t.molde), ...(texto(t.por) ? { por: t.por } : {}) }
+    }
+    if (it.pre_check !== undefined) {
+      if (!Array.isArray(it.pre_check) || it.pre_check.length === 0 || !it.pre_check.every(texto)) erros.push(`${onde}.pre_check: lista não vazia (o comando e os argumentos; '{arquivo}' vira o .sql)`)
+      else preCheck = it.pre_check as string[]
+    }
+  }
+  return { nome, caminho, dir: String(dir), refs, somenteLeitura, credencialEnv, envArquivo, token, preCheck }
+}
+
+function timeoutsDe(v: unknown, onde: string, erros: string[]): Timeouts {
+  const t = { ...TIMEOUTS_PADRAO }
+  if (v === undefined) return t
+  if (!obj(v)) {
+    erros.push(`${onde}: objeto {lock_timeout_s, statement_timeout_s, http_timeout_s}`)
+    return t
+  }
+  const campos: [string, keyof Timeouts][] = [['lock_timeout_s', 'lockS'], ['statement_timeout_s', 'statementS'], ['http_timeout_s', 'httpS']]
+  for (const [k, c] of campos) {
+    if (v[k] === undefined) continue
+    const n = v[k]
+    if (typeof n === 'number' && Number.isFinite(n) && n > 0) t[c] = n
+    else erros.push(`${onde}.${k}: número de segundos maior que zero (recebi ${JSON.stringify(n)})`)
+  }
+  return t
+}
+
+/** O bloco `migrations` já parseado contra os repos de `.repos[]`. Puro. */
+export function validarBancos(raiz: unknown, listados: RepoListado[]): { bancos: Banco[]; erros: string[] } {
+  const erros: string[] = []
+  const bancos: Banco[] = []
+  if (raiz === undefined) return { bancos, erros }
+  if (!obj(raiz) || !obj(raiz.bancos)) return { bancos, erros: ['migrations.bancos: objeto {<nome do banco>: {...}}'] }
+  const doRepo = new Map<string, string>()
+  for (const [nome, b] of Object.entries(raiz.bancos)) {
+    const onde = `migrations.bancos.${nome}`
+    if (!obj(b)) {
+      erros.push(`${onde}: tem de ser um objeto`)
+      continue
+    }
+    if (b.ferramenta !== 'supabase') erros.push(`${onde}.ferramenta: só 'supabase' nesta versão (recebi ${JSON.stringify(b.ferramenta)})`)
+    const bancoId = texto(b.banco_id) ? b.banco_id : ''
+    if (!/^[a-z0-9]{8,40}$/.test(bancoId)) erros.push(`${onde}.banco_id: o ref do projeto (minúsculas e dígitos), recebi ${JSON.stringify(b.banco_id)}`)
+    const igual = bancos.find((x) => x.bancoId === bancoId)
+    if (igual && bancoId) erros.push(`${onde}.banco_id: ${bancoId} já é do banco '${igual.nome}'; um banco, um bloco (junte os repos nele)`)
+    const repos: RepoMig[] = []
+    if (!Array.isArray(b.repos) || b.repos.length === 0) erros.push(`${onde}.repos: lista não vazia`)
+    else
+      b.repos.forEach((it, i) => {
+        const r = repoDe(it, `${onde}.repos[${i}]`, listados, erros)
+        if (!r) return
+        const dono = r.caminho && doRepo.get(r.caminho)
+        if (dono) erros.push(`${onde}.repos[${i}]: ${r.nome} já está no banco '${dono}'; um repo pertence a um banco só`)
+        else if (r.caminho) doRepo.set(r.caminho, nome)
+        repos.push(r)
+      })
+    const escritores = repos.filter((r) => !r.somenteLeitura)
+    if (escritores.length > 1) erros.push(`${onde}.repos: no máximo um repo que escreve por banco (achei ${escritores.map((r) => r.nome).join(', ')}); os outros levam somente_leitura`)
+    bancos.push({ nome, ferramenta: 'supabase', bancoId, repos, escritor: escritores[0] ?? null, timeouts: timeoutsDe(b.timeouts, `${onde}.timeouts`, erros) })
+  }
+  return { bancos, erros }
+}
+
+/** Os bancos do repos.json de verdade (`ORQ_REPOS` ou `~/.orq/repos.json`). */
+export function lerBancos(): { bancos: Banco[]; erros: string[] } {
+  let d: unknown
+  try {
+    d = JSON.parse(readFileSync(arquivoRepos(), 'utf8'))
+  } catch (e) {
+    return { bancos: [], erros: [`${arquivoRepos()}: ${(e as Error).message}`] }
+  }
+  return validarBancos(obj(d) ? d.migrations : undefined, lerRepos())
+}
+
+export class ConfigInvalida extends Error {}
+
+function bancosValidos(): Banco[] {
+  const { bancos, erros } = lerBancos()
+  if (erros.length) throw new ConfigInvalida(`config de migrations inválida em ${arquivoRepos()}:\n  ${erros.join('\n  ')}`)
+  return bancos
+}
+
+export function acharBanco(nome: string): Banco {
+  const bs = bancosValidos()
+  const b = bs.find((x) => x.nome === nome)
+  if (!b) throw new ConfigInvalida(`banco '${nome}' não está em migrations.bancos (há: ${bs.map((x) => x.nome).join(', ') || 'nenhum'})`)
+  return b
+}
+
+/** O banco em que `repo` (nome do bloco ou caminho) é o escritor. */
+export function bancoDoEscritor(repo: string): { banco: Banco; repo: RepoMig } {
+  const bs = bancosValidos()
+  const cam = resolve(repo)
+  for (const b of bs) for (const r of b.repos) if (r.nome === repo || r.caminho === cam) return { banco: b, repo: r }
+  throw new ConfigInvalida(`repo '${repo}' não está em nenhum banco de migrations.bancos`)
+}
diff --git a/scripts/orquestrador/migrations/liberacao.ts b/scripts/orquestrador/migrations/liberacao.ts
new file mode 100644
index 0000000..0cebedf
--- /dev/null
+++ b/scripts/orquestrador/migrations/liberacao.ts
@@ -0,0 +1,116 @@
+/**
+ * liberacao.ts — a ÚNICA escrita do aplicador num repo: o token de liberação,
+ * no formato do próprio repo (etapa MIG-A, P4; decisões 4 e E6 de 18/10).
+ *
+ *   formato `liberadas` (Comarka): acrescenta `{token sem 'humano:', em, por,
+ *     nota}` em `.liberadas[]`, como o `roadmap/liberar.py` dele; `.tokens[]` e
+ *     o resto do arquivo ficam byte a byte;
+ *   formato `v2` (kit): a mesma decisão do `orq liberar` (liberar-cli.ts).
+ *
+ * O token sai do cabeçalho do .sql (76 de 77 migrations recentes do Comarka o
+ * citam: `humano:migration-<id>-aplicada`), pelo `token.molde` da config; ou do
+ * `--token`, conferido contra o molde.
+ *
+ * Antes de aplicar e de novo antes de escrever, o repo não pode estar pausado
+ * (o `pausar_file` do 000-config ou `docs/fila/.orq-pause`, que congela a main
+ * no ritual) nem ter o arquivo de liberação modificado na árvore (E5).
+ *
+ * O commit é o da porta genérica do resolvedor (`comitarUmArquivo`): espera o
+ * git livre, só aquele arquivo, nunca `--no-verify`, trailer `Orq-Aplicador:`.
+ */
+import { existsSync, lstatSync, readFileSync, realpathSync } from 'node:fs'
+import { join, resolve } from 'node:path'
+import { jaLiberado } from '../liberacoes-core.js'
+import { hoje, liberar } from '../liberar-cli.js'
+import { comitarUmArquivo, type Escrita } from '../resolvedor/repo.js'
+import { dentro } from '../resolvedor/caminhos.js'
+import { gitLeitura } from '../triador/git.js'
+import type { TokenCfg } from './config.js'
+
+export interface CfgRepo {
+  liberacoesFile: string
+  pausarFile: string | null
+}
+
+export function configDoRepo(raiz: string): CfgRepo {
+  let c: { liberacoes_file?: unknown; pausar_file?: unknown }
+  try {
+    c = JSON.parse(readFileSync(join(raiz, 'docs/fila/000-config.json'), 'utf8')) as typeof c
+  } catch (e) {
+    throw new Error(`não consegui ler docs/fila/000-config.json de ${raiz}: ${(e as Error).message}`)
+  }
+  if (typeof c.liberacoes_file !== 'string' || !c.liberacoes_file) throw new Error(`${raiz}: 000-config.json sem liberacoes_file`)
+  return { liberacoesFile: c.liberacoes_file, pausarFile: typeof c.pausar_file === 'string' && c.pausar_file ? c.pausar_file : null }
+}
+
+const primeiraLinha = (p: string) => {
+  try {
+    return readFileSync(p, 'utf8').split('\n')[0]!.trim().slice(0, 120)
+  } catch {
+    return ''
+  }
+}
+
+/** Por que o repo não aceita a liberação agora (vazio: aceita). */
+export function bloqueiosDoRepo(raiz: string, cfg: CfgRepo): string[] {
+  const out: string[] = []
+  const pausas = [...(cfg.pausarFile ? [['pausar_file', cfg.pausarFile]] : []), ['docs/fila/.orq-pause', 'docs/fila/.orq-pause']]
+  for (const [nome, rel] of pausas) if (existsSync(join(raiz, rel!))) out.push(`${nome} ${rel} existe (${primeiraLinha(join(raiz, rel!))}): repo pausado`)
+  const st = gitLeitura(raiz, ['status', '--porcelain', '--', cfg.liberacoesFile])
+  if (st.rc !== 0) out.push(`git status falhou em ${raiz}`)
+  else if (st.stdout.trim()) out.push(`${cfg.liberacoesFile} modificado na árvore (${st.stdout.trim().slice(0, 60)}): commite ou descarte antes`)
+  return out
+}
+
+const escapa = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
+const reMolde = (molde: string) => escapa(molde).replace(escapa('{id}'), '([0-9A-Za-z]+)')
+
+/** Os tokens do molde citados no SQL, sem `humano:`, sem repetição. */
+export function tokensDoSql(sql: string, molde: string): string[] {
+  const re = new RegExp(`humano:(${reMolde(molde)})(?![0-9A-Za-z-])`, 'g')
+  return [...new Set([...sql.matchAll(re)].map((m) => m[1]!))]
+}
+
+/** O `--token` (com ou sem `humano:`) conferido contra o molde. */
+export function tokenDado(t: string, molde: string): string | null {
+  const s = t.replace(/^humano:/, '')
+  return new RegExp(`^${reMolde(molde)}$`).test(s) ? s : null
+}
+
+export function jaLiberadoNoTexto(texto: string, token: string): boolean {
+  try {
+    return jaLiberado(JSON.parse(texto), token)
+  } catch {
+    return false
+  }
+}
+
+/** O arquivo de liberação com o token novo, ou o porquê de não dar. */
+export function comToken(texto: string, cfg: TokenCfg, token: string, nota: string, usuario: string): { ok: true; conteudo: string } | { ok: false; motivo: string } {
+  let raiz: unknown
+  try {
+    raiz = JSON.parse(texto)
+  } catch (e) {
+    return { ok: false, motivo: `arquivo de liberação ilegível: ${(e as Error).message}` }
+  }
+  const por = cfg.por ?? usuario
+  if (cfg.formato === 'v2') {
+    const r = liberar(raiz, `humano:${token}`, nota, por, hoje())
+    return r.ok ? { ok: true, conteudo: r.conteudo } : { ok: false, motivo: r.motivo }
+  }
+  const o = raiz as { liberadas?: unknown }
+  if (!raiz || typeof raiz !== 'object' || !Array.isArray(o.liberadas)) return { ok: false, motivo: "formato 'liberadas' sem a lista .liberadas[]" }
+  o.liberadas.push({ token, em: hoje(), por, nota })
+  return { ok: true, conteudo: `${JSON.stringify(raiz, null, 2)}\n` }
+}
+
+/** Commit só do arquivo de liberação, se ele é o do config e mora dentro do repo. */
+export function comitarLiberacao(raiz: string, cfg: CfgRepo, antes: string, novo: string, mensagem: string): Escrita {
+  const rel = cfg.liberacoesFile
+  const abs = resolve(raiz, rel)
+  if (!existsSync(abs) || lstatSync(abs).isSymbolicLink()) return { ok: false, motivo: `${rel} não existe ou é symlink` }
+  const real = realpathSync(abs)
+  if (!dentro(real, realpathSync(raiz))) return { ok: false, motivo: `${rel} sai do repo: ${real}` }
+  const conferir = () => bloqueiosDoRepo(raiz, cfg).filter((b) => !b.includes('modificado na árvore'))[0] ?? null
+  return comitarUmArquivo(raiz, rel, real, antes, novo, mensagem, conferir, 'o arquivo de liberação')
+}
diff --git a/scripts/orquestrador/migrations/plano.ts b/scripts/orquestrador/migrations/plano.ts
new file mode 100644
index 0000000..27957aa
--- /dev/null
+++ b/scripts/orquestrador/migrations/plano.ts
@@ -0,0 +1,121 @@
+/**
+ * plano.ts — linha de base e plano de um banco (etapa MIG-A, P3). Puro.
+ *
+ * Linha de base (decisão 3 de 18/10: o que está em produção é a verdade, nada
+ * antigo é renomeado nem cobrado), gravada em `~/.orq/migrations/<banco>.json`:
+ *   corte                a maior versão de produção naquele momento (ou a dada)
+ *   aplicadas            as linhas do schema_migrations naquele momento
+ *   herdados_desde       piso dos herdados (opcional); sem ele, nenhum
+ *   pendentes_herdados   arquivos com piso < versão <= corte SEM linha no ledger
+ *                        (E2, opção b): o plano os mostra à parte, aplicáveis
+ *   antigos_sem_ledger   quantos arquivos <= corte sem linha ficaram de fora
+ *
+ * O piso existe porque "todo arquivo sem linha até o corte" no Comarka dá 36
+ * (18/10), e 31 são de maio a setembro (aplicados com outro nome, descartados
+ * ou nunca aplicados): cobrar esses é o que a decisão 3 proíbe.
+ *
+ * Plano, contra o ledger de agora:
+ *   pendentes  arquivo com versão > corte e sem linha que case
+ *   herdados   os da linha de base que ainda não casam
+ *   drift      linha com versão > corte sem arquivo que case, em nenhum repo do banco
+ * Casar: a mesma versão, OU o mesmo nome (o nome sem o prefixo, ou o nome base
+ * inteiro: o dashboard-comercial grava `20261006_<nome>` como nome).
+ */
+import type { Aplicada } from './supabase.js'
+
+export interface ArquivoMig {
+  repo: string
+  /** relativo à raiz do repo */
+  arquivo: string
+  versao: string
+  nome: string
+  /** o nome do arquivo sem `.sql` */
+  base: string
+  /** os refs onde o arquivo existe */
+  refs: string[]
+  /** o conteúdo muda entre os refs: o aplicador recusa */
+  divergente: boolean
+  somenteLeitura: boolean
+}
+
+export interface Herdado {
+  repo: string
+  arquivo: string
+  versao: string
+  nome: string
+}
+
+export interface LinhaBase {
+  $versao: 1
+  banco: string
+  criado_em: string
+  corte: string
+  herdados_desde: string | null
+  aplicadas: Aplicada[]
+  pendentes_herdados: Herdado[]
+  antigos_sem_ledger: number
+}
+
+export interface Plano {
+  corte: string
+  pendentes: ArquivoMig[]
+  herdados: ArquivoMig[]
+  drift: Aplicada[]
+  aplicadasDesdeCorte: (Aplicada & { arquivo: string | null })[]
+}
+
+/** A versão com 14 dígitos (`20260612` → `20260612000000`). */
+export const normaliza = (v: string): string => v.padEnd(14, '0')
+
+export function versaoDoArquivo(rel: string): { versao: string; nome: string; base: string } | null {
+  const b = rel.split('/').pop() ?? ''
+  const m = /^(\d{14}|\d{8})_(.+)\.sql$/.exec(b)
+  return m ? { versao: normaliza(m[1]!), nome: m[2]!, base: b.slice(0, -4) } : null
+}
+
+const porVersao = <T extends { versao: string; arquivo: string }>(a: T, b: T) => (a.versao === b.versao ? a.arquivo.localeCompare(b.arquivo) : a.versao < b.versao ? -1 : 1)
+
+function indice(aplicadas: Aplicada[]) {
+  const versoes = new Set(aplicadas.map((a) => normaliza(a.version)))
+  const nomes = new Set(aplicadas.map((a) => a.name).filter((n): n is string => !!n))
+  return (a: ArquivoMig) => versoes.has(a.versao) || nomes.has(a.nome) || nomes.has(a.base)
+}
+
+/** O arquivo que casa uma linha do ledger, ou null. */
+function arquivoDa(l: Aplicada, arquivos: ArquivoMig[]): ArquivoMig | null {
+  const v = normaliza(l.version)
+  return arquivos.find((a) => a.versao === v) ?? arquivos.find((a) => !!l.name && (a.nome === l.name || a.base === l.name)) ?? null
+}
+
+export function montarLinhaBase(o: { banco: string; aplicadas: Aplicada[]; arquivos: ArquivoMig[]; corte?: string; herdadosDesde?: string; agora: Date }): LinhaBase {
+  const maior = o.aplicadas.reduce((m, a) => (normaliza(a.version) > m ? normaliza(a.version) : m), '')
+  const corte = normaliza(o.corte ?? maior)
+  if (!/^\d{14}$/.test(corte)) throw new Error(`corte inválido: ${JSON.stringify(o.corte ?? maior)} (AAAAMMDD ou AAAAMMDDHHMMSS)`)
+  const piso = o.herdadosDesde === undefined ? null : normaliza(o.herdadosDesde)
+  if (piso !== null && (!/^\d{14}$/.test(piso) || piso > corte)) throw new Error(`herdados_desde inválido: ${o.herdadosDesde} (AAAAMMDD[HHMMSS], até o corte ${corte})`)
+  const casa = indice(o.aplicadas)
+  const semLedger = o.arquivos.filter((a) => a.versao <= corte && !casa(a)).sort(porVersao)
+  const herdados = piso === null ? [] : semLedger.filter((a) => a.versao > piso)
+  return {
+    $versao: 1,
+    banco: o.banco,
+    criado_em: o.agora.toISOString(),
+    corte,
+    herdados_desde: piso,
+    aplicadas: o.aplicadas,
+    pendentes_herdados: herdados.map(({ repo, arquivo, versao, nome }) => ({ repo, arquivo, versao, nome })),
+    antigos_sem_ledger: semLedger.length - herdados.length,
+  }
+}
+
+export function montarPlano(lb: LinhaBase, aplicadas: Aplicada[], arquivos: ArquivoMig[]): Plano {
+  const casa = indice(aplicadas)
+  const pendentes = arquivos.filter((a) => a.versao > lb.corte && !casa(a)).sort(porVersao)
+  const herdados = lb.pendentes_herdados
+    .map((h) => arquivos.find((a) => a.repo === h.repo && a.arquivo === h.arquivo))
+    .filter((a): a is ArquivoMig => !!a && !casa(a))
+    .sort(porVersao)
+  const acima = aplicadas.filter((l) => normaliza(l.version) > lb.corte).sort((a, b) => (a.version < b.version ? -1 : a.version > b.version ? 1 : 0))
+  const aplicadasDesdeCorte = acima.map((l) => ({ ...l, arquivo: arquivoDa(l, arquivos)?.arquivo ?? null }))
+  return { corte: lb.corte, pendentes, herdados, drift: acima.filter((l) => !arquivoDa(l, arquivos)), aplicadasDesdeCorte }
+}
diff --git a/scripts/orquestrador/migrations/sql.ts b/scripts/orquestrador/migrations/sql.ts
new file mode 100644
index 0000000..81632bf
--- /dev/null
+++ b/scripts/orquestrador/migrations/sql.ts
@@ -0,0 +1,187 @@
+/**
+ * sql.ts — o .sql antes de ir para o banco (etapa MIG-A, P2). Puro, sem rede.
+ *
+ * O aplicador roda o arquivo numa transação IMPLÍCITA: o texto inteiro vai num
+ * POST /database/query, e o Postgres roda as instruções de uma mensagem só como
+ * uma transação (C2, medido pelo chat em 18/10 com a sonda: txid igual). Por
+ * isso o arquivo não pode ter controle de transação próprio, com uma exceção:
+ * o ENVELOPE `begin;` como primeira instrução e `commit;` como última, que 77
+ * de 77 migrations recentes do Comarka trazem, é tirado (o resto do texto vai
+ * byte a byte). Fora isso, recusa: begin/commit/rollback/savepoint no meio,
+ * CONCURRENTLY, VACUUM e ALTER SYSTEM, que não rodam numa transação.
+ *
+ * As instruções saem de um leitor que conhece comentário (`--`, `/* *\/`
+ * aninhado), literal ('...', E'...', "..."), e dollar-quote ($$...$$,
+ * $tag$...$tag$): `;` ou `commit` dentro de corpo de função não conta.
+ */
+import { randomBytes } from 'node:crypto'
+
+export interface Instrucao {
+  ini: number
+  fim: number
+  /** o primeiro caractere de código (depois de espaço e comentário) */
+  codigoIni: number
+  /** o texto sem comentário e sem literal, minúsculo e com espaço único */
+  codigo: string
+}
+
+export class SqlIlegivel extends Error {}
+
+const IDENT = /[A-Za-z0-9_$]/
+
+/** Cada instrução de nível de topo do texto, com o código mascarado. */
+export function instrucoes(sql: string): Instrucao[] {
+  const mask: string[] = []
+  const out: Instrucao[] = []
+  let ini = 0
+  let i = 0
+  const n = sql.length
+  const branco = (a: number, b: number) => {
+    for (let k = a; k < b; k++) mask[k] = sql[k] === '\n' ? '\n' : ' '
+  }
+  const fecha = (fim: number) => {
+    const cru = mask.slice(ini, fim).join('')
+    const codigo = cru.replace(/;\s*$/, '').replace(/\s+/g, ' ').trim().toLowerCase()
+    if (codigo) out.push({ ini, fim, codigoIni: ini + cru.search(/\S/), codigo })
+    ini = fim
+  }
+  while (i < n) {
+    const c = sql[i]!
+    const d = sql[i + 1]
+    if (c === '-' && d === '-') {
+      const f = sql.indexOf('\n', i)
+      const fim = f < 0 ? n : f
+      branco(i, fim)
+      i = fim
+    } else if (c === '/' && d === '*') {
+      let prof = 1
+      let k = i + 2
+      while (k < n && prof > 0) {
+        if (sql[k] === '/' && sql[k + 1] === '*') (prof++, (k += 2))
+        else if (sql[k] === '*' && sql[k + 1] === '/') (prof--, (k += 2))
+        else k++
+      }
+      if (prof > 0) throw new SqlIlegivel('comentário /* sem fim')
+      branco(i, k)
+      i = k
+    } else if (c === "'" || c === '"') {
+      const esc = c === "'" && /[eE]/.test(sql[i - 1] ?? '') && !IDENT.test(sql[i - 2] ?? '')
+      let k = i + 1
+      for (;;) {
+        if (k >= n) throw new SqlIlegivel(`literal ${c} sem fim`)
+        if (esc && sql[k] === '\\') k += 2
+        else if (sql[k] === c && sql[k + 1] === c) k += 2
+        else if (sql[k] === c) break
+        else k++
+      }
+      mask[i] = c
+      branco(i + 1, k)
+      mask[k] = c
+      i = k + 1
+    } else if (c === '$' && !IDENT.test(sql[i - 1] ?? '') && /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.test(sql.slice(i, i + 64))) {
+      const tag = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i, i + 64))![0]
+      const f = sql.indexOf(tag, i + tag.length)
+      if (f < 0) throw new SqlIlegivel(`dollar-quote ${tag} sem fim`)
+      branco(i, f + tag.length)
+      i = f + tag.length
+    } else {
+      mask[i] = c
+      i++
+      if (c === ';') fecha(i)
+    }
+  }
+  fecha(n)
+  return out
+}
+
+const ABRE = /^(begin( work| transaction)?|start transaction)$/
+const FECHA = /^(commit|end)( work| transaction)?$/
+const TRANSACAO = /^(begin|start transaction|commit|end|rollback|abort|savepoint|release|prepare transaction)\b/
+const SKILL = 'aplique por fora do aplicador (no Comarka, a skill aplicar-migration-ddl): use a skill'
+
+export type Preparo = { ok: true; corpo: string; statements: string[]; envelope: boolean } | { ok: false; motivo: string }
+
+/** O corpo que vai para o banco, ou o porquê da recusa. */
+export function prepararSql(sql: string): Preparo {
+  let ins: Instrucao[]
+  try {
+    ins = instrucoes(sql)
+  } catch (e) {
+    return { ok: false, motivo: `SQL ilegível: ${(e as Error).message}` }
+  }
+  if (ins.length === 0) return { ok: false, motivo: 'SQL vazio: nenhuma instrução fora de comentário' }
+  const abre = ABRE.test(ins[0]!.codigo)
+  const fecha = ins.length > 1 && FECHA.test(ins[ins.length - 1]!.codigo)
+  if (abre !== fecha) return { ok: false, motivo: `envelope pela metade: ${abre ? 'begin; sem o commit; no fim' : 'commit; sem o begin; no começo'}` }
+  const corpo = abre ? ins.slice(1, -1) : ins
+  for (const x of corpo) {
+    const curto = x.codigo.slice(0, 80)
+    if (TRANSACAO.test(x.codigo)) return { ok: false, motivo: `instrução de transação no meio do arquivo ('${curto}'): o aplicador roda o arquivo numa transação só; ${SKILL}` }
+    if (/\bconcurrently\b/.test(x.codigo)) return { ok: false, motivo: `CONCURRENTLY não roda numa transação ('${curto}'); ${SKILL}` }
+    if (/\bvacuum\b/.test(x.codigo)) return { ok: false, motivo: `VACUUM não roda numa transação ('${curto}'); ${SKILL}` }
+    if (/^alter system\b/.test(x.codigo)) return { ok: false, motivo: `ALTER SYSTEM não roda numa transação ('${curto}'); ${SKILL}` }
+  }
+  if (corpo.length === 0) return { ok: false, motivo: 'SQL vazio: só o envelope begin;/commit;' }
+  return {
+    ok: true,
+    corpo: abre ? sql.slice(ins[0]!.fim, ins[ins.length - 1]!.codigoIni) : sql,
+    statements: corpo.map((x) => sql.slice(x.ini, x.fim).trim()),
+    envelope: abre,
+  }
+}
+
+/** As classes de risco do aviso (só aviso nesta etapa), na ordem fixa. */
+const CLASSES: [string, RegExp][] = [
+  ['DROP', /\bdrop\b/],
+  ['TRUNCATE', /\btruncate\b/],
+  ['DELETE', /\bdelete from\b/],
+  ['RENAME', /\brename\b/],
+  ['GRANT', /\bgrant\b/],
+  ['REVOKE', /\brevoke\b/],
+  ['POLICY', /\bpolicy\b/],
+  ['SECURITY DEFINER', /\bsecurity definer\b/],
+  ['ALTER COLUMN', /\balter column\b/],
+  ['SET NOT NULL', /\bset not null\b/],
+]
+
+export function avisosDeClasse(sql: string): string[] {
+  let codigo = ''
+  try {
+    codigo = instrucoes(sql).map((x) => x.codigo).join(' ; ')
+  } catch {
+    codigo = sql.toLowerCase().replace(/\s+/g, ' ')
+  }
+  return CLASSES.filter(([, re]) => re.test(codigo)).map(([nome]) => nome)
+}
+
+/** `s` como literal em dollar-quote, com uma etiqueta que não aparece nele. */
+export function literal(s: string): string {
+  for (;;) {
+    const tag = `$orq${randomBytes(4).toString('hex')}$`
+    if (!s.includes(tag)) return `${tag}${s}${tag}`
+  }
+}
+
+export interface Migracao {
+  corpo: string
+  statements: string[]
+  versao: string
+  nome: string
+  criadoPor: string
+}
+
+/** O texto único do POST: timeouts, o corpo e o insert do ledger, na mesma transação. */
+export function montarQuery(m: Migracao, t: { lockS: number; statementS: number }): string {
+  return [
+    `select set_config('lock_timeout', '${t.lockS}s', true);`,
+    `select set_config('statement_timeout', '${t.statementS}s', true);`,
+    m.corpo,
+    ';',
+    `insert into supabase_migrations.schema_migrations(version, name, statements, created_by) values (${literal(m.versao)}, ${literal(m.nome)}, array[${m.statements.map(literal).join(', ')}]::text[], ${literal(m.criadoPor)});`,
+  ].join('\n')
+}
+
+export const QUERY_LISTAR = 'select version, name, created_by from supabase_migrations.schema_migrations order by version'
+
+/** Duas instruções no mesmo texto: na mesma transação, o txid é o mesmo (C2). */
+export const QUERY_SONDA = "select set_config('orq.sonda', txid_current()::text, true);\nselect current_setting('orq.sonda')::bigint = txid_current() as mesma_transacao"
diff --git a/scripts/orquestrador/migrations/supabase.ts b/scripts/orquestrador/migrations/supabase.ts
new file mode 100644
index 0000000..ba75356
--- /dev/null
+++ b/scripts/orquestrador/migrations/supabase.ts
@@ -0,0 +1,153 @@
+/**
+ * supabase.ts — o adaptador do aplicador para a API de gestão do Supabase
+ * (etapa MIG-A, P2).
+ *
+ * Tudo passa por `POST /v1/projects/<ref>/database/query` (decisão E4): o
+ * `POST /database/migrations` (o que o `apply_migration` do MCP usa) não deixa
+ * escolher a versão e grava a hora da aplicação; aqui o SQL e o insert no
+ * `supabase_migrations.schema_migrations` vão no mesmo texto, numa transação
+ * implícita (sql.ts), com a versão e o nome DO ARQUIVO.
+ *
+ *   listarAplicadas  select version, name, created_by (read_only)
+ *   aplicar          ok | erro certo (4xx: o Postgres recusou e nada ficou)
+ *                    | INCERTO (5xx, timeout, rede, resposta ilegível): quem
+ *                    chama confere no ledger antes de dizer qualquer coisa
+ *   sonda            duas instruções no mesmo texto têm o mesmo txid? (C2)
+ *
+ * A credencial é lida do arquivo do repo pelo NOME configurado (lerCredencial),
+ * só aqui, e nunca sai: toda mensagem passa por `mascarar`, que troca o valor
+ * (e o miolo dele, e qualquer `sbp_...`) por `***`.
+ *
+ * Base da API: a oficial. `ORQ_MIGRATIONS_API` só vale com `ORQ_TESTE=1` e só
+ * para 127.0.0.1 (o stub dos testes); com `ORQ_TESTE=1` a oficial é recusada.
+ */
+import { readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { montarQuery, QUERY_LISTAR, QUERY_SONDA, type Migracao } from './sql.js'
+
+export const API_OFICIAL = 'https://api.supabase.com'
+
+export class ErroApi extends Error {}
+
+export function baseDaApi(): string {
+  const teste = process.env.ORQ_TESTE === '1'
+  const outra = process.env.ORQ_MIGRATIONS_API || ''
+  if (teste) {
+    if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(outra)) throw new ErroApi(`ORQ_TESTE=1: o aplicador só fala com o stub em http://127.0.0.1:<porta> (ORQ_MIGRATIONS_API=${outra || 'vazio'}); nunca com o banco de verdade`)
+    return outra
+  }
+  if (outra && outra !== API_OFICIAL) throw new ErroApi(`ORQ_MIGRATIONS_API=${outra} fora de teste: o aplicador só fala com ${API_OFICIAL}`)
+  return API_OFICIAL
+}
+
+/** Troca cada segredo (e o miolo dele, sem o prefixo) e qualquer `sbp_...` por `***`. */
+export function mascarar(s: string, segredos: string[]): string {
+  let out = s
+  for (const x of segredos) {
+    if (x.length < 8) continue
+    for (const pedaco of [x, x.replace(/^sbp_/, '')]) out = out.split(pedaco).join('***')
+  }
+  return out.replace(/\bsbp_[A-Za-z0-9]+/g, '***')
+}
+
+/** O valor de `nome` no arquivo de env do repo. A mensagem de falta nunca leva valor. */
+export function lerCredencial(raiz: string, envArquivo: string, nome: string): string {
+  const arq = join(raiz, envArquivo)
+  let txt = ''
+  try {
+    txt = readFileSync(arq, 'utf8')
+  } catch {
+    throw new ErroApi(`credencial ${nome}: não consegui ler ${arq}`)
+  }
+  for (const l of txt.split('\n')) {
+    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/.exec(l)
+    if (!m || m[1] !== nome) continue
+    const v = m[2]!.replace(/^(['"])(.*)\1$/, '$2')
+    if (v) return v
+  }
+  throw new ErroApi(`credencial ${nome} ausente ou vazia em ${arq}`)
+}
+
+export interface Aplicada {
+  version: string
+  name: string | null
+  created_by: string | null
+}
+
+export type Resultado = { ok: true } | { ok: false; incerto: boolean; mensagem: string }
+
+export interface Adaptador {
+  listarAplicadas(): Promise<Aplicada[]>
+  aplicar(m: Migracao): Promise<Resultado>
+  sonda(): Promise<boolean>
+  mascarar(s: string): string
+}
+
+type Resposta = { tipo: 'ok'; dados: unknown } | { tipo: 'erro'; status: number; mensagem: string } | { tipo: 'incerto'; mensagem: string }
+
+export function criarAdaptador(o: { bancoId: string; token: string; timeouts: { lockS: number; statementS: number; httpS: number } }): Adaptador {
+  const base = baseDaApi()
+  const m = (s: string) => mascarar(s, [o.token])
+
+  async function consulta(query: string, somenteLeitura: boolean): Promise<Resposta> {
+    let r: Response
+    try {
+      r = await fetch(`${base}/v1/projects/${o.bancoId}/database/query`, {
+        method: 'POST',
+        headers: { authorization: `Bearer ${o.token}`, 'content-type': 'application/json', 'user-agent': 'orq-aplicador' },
+        body: JSON.stringify({ query, ...(somenteLeitura ? { read_only: true } : {}) }),
+        signal: AbortSignal.timeout(o.timeouts.httpS * 1000),
+      })
+    } catch (e) {
+      const err = e as Error
+      const tempo = err.name === 'TimeoutError' || err.name === 'AbortError'
+      return { tipo: 'incerto', mensagem: m(tempo ? `sem resposta em ${o.timeouts.httpS}s (tempo esgotado)` : `falha de rede: ${err.message}`) }
+    }
+    let texto = ''
+    try {
+      texto = await r.text()
+    } catch (e) {
+      return { tipo: 'incerto', mensagem: m(`HTTP ${r.status}, corpo cortado: ${(e as Error).message}`) }
+    }
+    let dados: unknown
+    let legivel = true
+    try {
+      dados = JSON.parse(texto)
+    } catch {
+      legivel = false
+    }
+    const msgDoCorpo = () => {
+      const d = dados as { message?: unknown; error?: unknown } | undefined
+      return String((legivel && d && (d.message ?? d.error)) || texto.slice(0, 300))
+    }
+    if (r.status >= 500) return { tipo: 'incerto', mensagem: m(`HTTP ${r.status}: ${msgDoCorpo()}`) }
+    if (r.status >= 400) return { tipo: 'erro', status: r.status, mensagem: m(`HTTP ${r.status}: ${msgDoCorpo()}`) }
+    if (!legivel) return { tipo: 'incerto', mensagem: m(`HTTP ${r.status} com resposta ilegível: ${texto.slice(0, 120)}`) }
+    return { tipo: 'ok', dados }
+  }
+
+  const leitura = async (query: string, o2: string): Promise<Record<string, unknown>[]> => {
+    const r = await consulta(query, true)
+    if (r.tipo !== 'ok') throw new ErroApi(`${o2}: ${r.mensagem}`)
+    if (!Array.isArray(r.dados)) throw new ErroApi(`${o2}: resposta não é lista`)
+    return r.dados as Record<string, unknown>[]
+  }
+
+  return {
+    mascarar: m,
+    async listarAplicadas() {
+      const linhas = await leitura(QUERY_LISTAR, 'listar o schema_migrations')
+      const txt = (v: unknown) => (typeof v === 'string' ? v : null)
+      return linhas.map((l) => ({ version: String(l.version), name: txt(l.name), created_by: txt(l.created_by) }))
+    },
+    async aplicar(mig) {
+      const r = await consulta(montarQuery(mig, o.timeouts), false)
+      if (r.tipo === 'ok') return { ok: true }
+      return { ok: false, incerto: r.tipo === 'incerto', mensagem: r.mensagem }
+    },
+    async sonda() {
+      const linhas = await leitura(QUERY_SONDA, 'sonda')
+      return linhas[0]?.mesma_transacao === true
+    },
+  }
+}
diff --git a/scripts/orquestrador/resolvedor/caminhos.ts b/scripts/orquestrador/resolvedor/caminhos.ts
index 5307ef2..68674de 100644
--- a/scripts/orquestrador/resolvedor/caminhos.ts
+++ b/scripts/orquestrador/resolvedor/caminhos.ts
@@ -41,8 +41,9 @@ export class GuardaResolvedor {
   private readonly repos: string
   private readonly protegidos: string[]
 
-  constructor(protegidosExtra: string[] = []) {
-    this.raiz = caminhoReal(raizResolvedor())
+  /** `raiz` (etapa MIG-A): o aplicador de migrations usa a mesma guarda sobre ~/.orq/migrations. */
+  constructor(protegidosExtra: string[] = [], raiz: string = raizResolvedor()) {
+    this.raiz = caminhoReal(raiz)
     this.repos = caminhoReal(arquivoRepos())
     this.protegidos = [...lerRepos().map((r) => r.caminho), ...protegidosExtra].map((p) => caminhoReal(p))
     for (const p of this.protegidos) {
diff --git a/scripts/orquestrador/resolvedor/repo.ts b/scripts/orquestrador/resolvedor/repo.ts
index 61e83e4..099a58d 100644
--- a/scripts/orquestrador/resolvedor/repo.ts
+++ b/scripts/orquestrador/resolvedor/repo.ts
@@ -178,12 +178,25 @@ export type Escrita = { ok: true; commit: string } | { ok: false; motivo: string
  */
 export function escreverEComitar(raiz: string, id: string, rel: string, antes: string, novo: string, mensagem: string, retrato?: Retrato): Escrita {
   const real = confereTicket(raiz, id, rel)
+  // a última releitura antes da troca: tentativa nova do loop, desiste (7f-b5)
+  return comitarUmArquivo(raiz, rel, real, antes, novo, mensagem, () => (retrato ? tentativaNova(raiz, id, rel, retrato) : null))
+}
+
+/**
+ * A porta genérica de um arquivo só (etapa MIG-A: o aplicador de migrations a
+ * usa para o arquivo de liberação). Quem chama já conferiu o caminho (`real`
+ * é o caminho real de `rel` dentro de `raiz`). Espera o git livre, roda
+ * `conferir` (a última releitura de quem chama; um texto é o motivo para
+ * desistir), exige o arquivo ainda igual a `antes`, escreve, `git commit
+ * --only -- <rel>` sem `--no-verify`, desfaz o arquivo se o commit falha e
+ * confere que o commit tem só ele, com o pai certo.
+ */
+export function comitarUmArquivo(raiz: string, rel: string, real: string, antes: string, novo: string, mensagem: string, conferir?: () => string | null, oQue = 'o ticket'): Escrita {
   const esperando = esperarGit(raiz)
   if (esperando) return { ok: false, motivo: `git rodando: ${esperando}` }
-  // a última releitura antes da troca: tentativa nova do loop, desiste (7f-b5)
-  const nova = retrato ? tentativaNova(raiz, id, rel, retrato) : null
-  if (nova) return { ok: false, motivo: nova }
-  if (readFileSync(real, 'utf8') !== antes) return { ok: false, motivo: 'o ticket mudou desde a leitura: outro processo mexeu' }
+  const outra = conferir?.() ?? null
+  if (outra) return { ok: false, motivo: outra }
+  if (readFileSync(real, 'utf8') !== antes) return { ok: false, motivo: `${oQue} mudou desde a leitura: outro processo mexeu` }
   const headAntes = gitLeitura(raiz, ['rev-parse', 'HEAD']).stdout.trim()
   writeFileSync(real, novo)
   const c = gitEscrita(raiz, ['commit', '--only', '-q', '-m', mensagem, '--', rel])
diff --git a/test/fixtures/migrations/LEIA-ME.md b/test/fixtures/migrations/LEIA-ME.md
new file mode 100644
index 0000000..0e89c7d
--- /dev/null
+++ b/test/fixtures/migrations/LEIA-ME.md
@@ -0,0 +1,16 @@
+# Fixture da etapa MIG-A (P3)
+
+Cópia reduzida do recon de 18/10/2026 (`~/orq-sessoes/recon-migrations/`):
+
+- `comarka-arquivos.tsv`: os 272 arquivos de `supabase/migrations` do Comarka (união de
+  `main`, `origin/staging-auto` e `origin/staging-apolo`), colunas `arquivo` e `refs`
+  (as branches onde o arquivo existe), copiadas de `arquivos-migrations.tsv`.
+- `comarka-producao.tsv`: as 491 linhas de `supabase_migrations.schema_migrations` do
+  `ogfnojbbvumujzfklkhh`, exportadas pelo chat em 18/10 (`producao-migrations.tsv`),
+  colunas `version`, `name` e `created_by`. Os nomes e as versões são os reais; o
+  `created_by` real (o e-mail da conta, o mesmo nas 491 linhas) foi trocado por
+  `conector-mcp`, que é o que ele significa: aplicada pelo conector do claude.ai.
+
+Números que o teste trava (`cruzamento-producao.md`): com o corte 20261004, 6 pendentes
+e 29 de drift; com o corte de hoje (a maior versão, 20261018030500) e herdados desde
+20261004, drift zero, 5 herdados e 1 pendente (20261019000100).
diff --git a/test/orquestrador-migrations-aplicar.test.ts b/test/orquestrador-migrations-aplicar.test.ts
new file mode 100644
index 0000000..7b015dc
--- /dev/null
+++ b/test/orquestrador-migrations-aplicar.test.ts
@@ -0,0 +1,501 @@
+/**
+ * Etapa MIG-A, peça P4 · `orq migrations aplicar` (e status, plano, linha-base, sonda).
+ *
+ * Um `~/.orq` temporário, um repo git de fixture com o `liberacoes.json` REAL
+ * do Comarka (18/10, 324 entradas em `.liberadas`) e um stub HTTP em 127.0.0.1
+ * no lugar da API de gestão. Nunca o banco.
+ *
+ * Pronto quando:
+ *   - cada recusa tem teste, e nenhuma chega a aplicar nem a escrever no repo:
+ *     MIGRATIONS_PAUSADO, sem TTY, sem sonda verde, sem linha de base, repo só
+ *     leitura, arquivo fora do plano, arquivo divergente entre refs, token
+ *     ausente/duplo/já liberado, pausar_file, .orq-pause, liberacoes modificado
+ *     na árvore, SQL recusado, ORQ_TESTE=1 apontando para a API oficial,
+ *     confirmação errada;
+ *   - a trava por banco: com outro processo vivo segurando, recusa; órfã, assume;
+ *   - pre_check vermelho para antes de aplicar;
+ *   - conferência que falha (ou erro, ou incerto sem a linha) não emite token;
+ *   - o commit tem só o arquivo de liberação, com o trailer Orq-Aplicador:, e o
+ *     replay no formato real acrescenta exatamente uma entrada em `.liberadas`.
+ */
+import { spawn, spawnSync } from 'node:child_process'
+import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, chmodSync } from 'node:fs'
+import { createServer, type Server, type ServerResponse } from 'node:http'
+import type { AddressInfo } from 'node:net'
+import { dirname, join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
+import { ambiente, comEnv, git, type Ambiente } from './resolvedor-repo.js'
+
+const KIT = join(import.meta.dirname, '..')
+const DIR = join(KIT, 'scripts', 'orquestrador', 'migrations')
+const FX = join(import.meta.dirname, 'fixtures', 'migrations')
+const TOKEN = 'sbp_' + 'a1b2c3d4'.repeat(5)
+const BANCO_ID = 'abcdefghijklmnopqrst'
+
+const NOVA = 'supabase/migrations/20261020000100_nova.sql'
+const ANTIGA = 'supabase/migrations/20261001000000_antiga.sql'
+const HERDADA = 'supabase/migrations/20261005000000_herdada.sql'
+const SQL_NOVA = '-- APLICAR E HUMANO; libera humano:migration-9001-aplicada\n-- fase: expansao\nbegin;\ncreate table public.t9001 (i int);\ndrop index if exists public.ix_velho;\ncommit;\n'
+
+type Aplicada = { version: string; name: string | null; created_by: string | null }
+type Saida = { ok: true; commit: string; token: string } | { ok: false; tipo: string; motivo: string }
+type Meios = { tty: boolean; perguntar: (t: string) => Promise<string>; escrever: (t: string) => void; usuario: string; agora: () => Date }
+type AplicarMod = { aplicar: (e: { repo: string; arquivo: string; token?: string }, m: Meios) => Promise<Saida> }
+type CliMod = { main: (argv: string[], m?: Partial<Meios>) => Promise<number> }
+
+/** o banco do stub */
+let aplicadas: Aplicada[] = []
+let modo: 'ok' | 'naoGrava' | 'erro400' | 'timeout' | 'grava503' = 'ok'
+let sondaVerde = true
+let inserts: string[] = []
+let srv: Server
+let api = ''
+
+const json = (res: ServerResponse, status: number, v: unknown) => {
+  res.writeHead(status, { 'content-type': 'application/json' })
+  res.end(JSON.stringify(v))
+}
+const lit = (q: string, i: number) => [...q.matchAll(/\$(orq[0-9a-f]+)\$([\s\S]*?)\$\1\$/g)].map((x) => x[2]!)[i]!
+
+function stub(q: string, res: ServerResponse) {
+  if (q.includes('mesma_transacao')) return json(res, 201, [{ mesma_transacao: sondaVerde }])
+  if (q.startsWith('select version, name, created_by')) return json(res, 201, aplicadas)
+  if (!q.includes('insert into supabase_migrations.schema_migrations')) return json(res, 400, { message: 'stub: query inesperada' })
+  inserts.push(q)
+  const ins = q.slice(q.indexOf('insert into supabase_migrations'))
+  const n = [...ins.matchAll(/\$(orq[0-9a-f]+)\$/g)].length / 2
+  const linha = { version: lit(ins, 0), name: lit(ins, 1), created_by: lit(ins, n - 1) }
+  if (modo === 'ok') {
+    aplicadas.push(linha)
+    return json(res, 201, [])
+  }
+  if (modo === 'naoGrava') return json(res, 201, [])
+  if (modo === 'erro400') return json(res, 400, { message: `ERROR: 42P07: relation "t9001" already exists (auth ${TOKEN})` })
+  if (modo === 'grava503') {
+    aplicadas.push(linha)
+    return json(res, 503, { message: 'upstream timeout' })
+  }
+  /* timeout: nunca responde */
+}
+
+describe('P4: orq migrations aplicar', () => {
+  let amb: Ambiente
+  let tira: () => void = () => {}
+  let ap: AplicarMod | null = null
+  let cli: CliMod | null = null
+  let raiz = ''
+  let saida: string[] = []
+  let n = 0
+  const env = () => amb.env as Record<string, string>
+  const migDir = () => env().ORQ_MIGRATIONS_DIR!
+
+  const meios = (o: Partial<Meios> = {}): Meios => ({
+    tty: true,
+    perguntar: async () => '20261020000100',
+    escrever: (t) => saida.push(t),
+    usuario: 'lucas',
+    agora: () => new Date('2026-10-20T15:00:00Z'),
+    ...o,
+  })
+
+  const escreve = (rel: string, txt: string) => {
+    mkdirSync(dirname(join(raiz, rel)), { recursive: true })
+    writeFileSync(join(raiz, rel), txt)
+  }
+
+  /** o repo do caso, o repos.json, a linha de base e a sonda */
+  function montar(o: { preCheck?: string[]; somenteLeitura?: boolean; main?: Record<string, string>; staging?: Record<string, string>; cfg?: Record<string, unknown> } = {}) {
+    raiz = join(amb.base, `c${++n}`, 'comarka')
+    mkdirSync(raiz, { recursive: true })
+    git(raiz, 'init', '-q', '-b', 'main')
+    escreve('docs/fila/000-config.json', JSON.stringify({ liberacoes_file: 'docs/fila/liberacoes.json', ...o.cfg }, null, 2) + '\n')
+    copyFileSync(join(FX, 'liberacoes-comarka-18-10.json'), join(raiz, 'docs/fila/liberacoes.json'))
+    escreve('.gitignore', '.env.local\n')
+    escreve('.env.local', `NEXT_PUBLIC_SUPABASE_URL=https://x.supabase.co\nSUPABASE_ACCESS_TOKEN=${TOKEN}\n`)
+    escreve(ANTIGA, 'create table public.antiga (i int);\n')
+    escreve(NOVA, SQL_NOVA)
+    escreve('src/outro.ts', 'export const a = 1\n')
+    for (const [k, v] of Object.entries(o.main ?? {})) escreve(k, v)
+    git(raiz, 'add', '-A')
+    git(raiz, 'commit', '-q', '-m', 'inicio')
+    git(raiz, 'checkout', '-q', '-b', 'staging-auto')
+    escreve(HERDADA, '-- libera humano:migration-9002-aplicada\ncreate table public.t9002 (i int);\n')
+    for (const [k, v] of Object.entries(o.staging ?? {})) escreve(k, v)
+    git(raiz, 'add', '-A')
+    git(raiz, 'commit', '-q', '-m', 'staging')
+    git(raiz, 'checkout', '-q', 'main')
+    const repo = o.somenteLeitura
+      ? { repo: 'cmk', dir: 'supabase/migrations', refs: ['HEAD', 'staging-auto'], somente_leitura: true }
+      : {
+          repo: 'cmk',
+          dir: 'supabase/migrations',
+          refs: ['HEAD', 'staging-auto'],
+          credencial_env: 'SUPABASE_ACCESS_TOKEN',
+          token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
+          ...(o.preCheck ? { pre_check: o.preCheck } : {}),
+        }
+    writeFileSync(
+      env().ORQ_REPOS!,
+      JSON.stringify({ $schema_versao: 1, repos: [{ nome: 'cmk', caminho: raiz }], migrations: { bancos: { b1: { ferramenta: 'supabase', banco_id: BANCO_ID, repos: [repo] } } } }, null, 2),
+    )
+    mkdirSync(migDir(), { recursive: true })
+    writeFileSync(
+      join(migDir(), 'b1.json'),
+      JSON.stringify({
+        $versao: 1,
+        banco: 'b1',
+        criado_em: '2026-10-18T17:00:00.000Z',
+        corte: '20261010000000',
+        herdados_desde: '20261002000000',
+        aplicadas: [{ version: '20261001000000', name: 'antiga', created_by: 'conector-mcp' }],
+        pendentes_herdados: [{ repo: 'cmk', arquivo: HERDADA, versao: '20261005000000', nome: 'herdada' }],
+        antigos_sem_ledger: 0,
+      }),
+    )
+    writeFileSync(join(migDir(), 'b1.sonda.json'), JSON.stringify({ banco: 'b1', banco_id: BANCO_ID, mesma_transacao: true, em: '2026-10-18T17:00:00.000Z' }))
+    return raiz
+  }
+
+  const lib = () => readFileSync(join(raiz, 'docs/fila/liberacoes.json'), 'utf8')
+  const ledger = () => {
+    const p = join(migDir(), 'ledger.jsonl')
+    return existsSync(p) ? readFileSync(p, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>) : []
+  }
+  const head = () => git(raiz, 'rev-parse', 'HEAD').trim()
+  const original = () => readFileSync(join(FX, 'liberacoes-comarka-18-10.json'), 'utf8')
+
+  /** recusa: nada aplicado, nada commitado, liberacoes intocado */
+  async function recusa(e: { repo?: string; arquivo?: string; token?: string }, re: RegExp, m: Partial<Meios> = {}) {
+    const h = head()
+    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA, ...e }, meios(m))
+    expect(r.ok).toBe(false)
+    if (!r.ok) expect(r.motivo).toMatch(re)
+    expect(inserts).toEqual([])
+    expect(head()).toBe(h)
+    expect(lib()).toBe(original())
+    return r
+  }
+
+  beforeAll(async () => {
+    srv = createServer((req, res) => {
+      let b = ''
+      req.on('data', (c) => (b += c))
+      req.on('end', () => stub(String((JSON.parse(b || '{}') as { query?: string }).query ?? ''), res))
+    })
+    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
+    api = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
+    amb = ambiente()
+    Object.assign(amb.env, {
+      ORQ_MIGRATIONS_DIR: join(amb.base, 'orq', 'migrations'),
+      ORQ_MIGRATIONS_PAUSADO: join(amb.base, 'orq', 'MIGRATIONS_PAUSADO'),
+      ORQ_TESTE: '1',
+      ORQ_MIGRATIONS_API: api,
+    })
+    tira = comEnv(amb.env)
+    try {
+      ap = (await import(pathToFileURL(join(DIR, 'aplicar.ts')).href)) as AplicarMod
+      cli = (await import(pathToFileURL(join(DIR, 'cli.ts')).href)) as CliMod
+    } catch {
+      ap = cli = null
+    }
+  })
+  afterAll(async () => {
+    tira()
+    srv.closeAllConnections()
+    await new Promise((r) => srv.close(r))
+  })
+  beforeEach(() => {
+    aplicadas = [{ version: '20261001000000', name: 'antiga', created_by: 'conector-mcp' }]
+    modo = 'ok'
+    sondaVerde = true
+    inserts = []
+    saida = []
+    rmSync(join(amb.base, 'orq', 'migrations'), { recursive: true, force: true })
+    rmSync(env().ORQ_MIGRATIONS_PAUSADO!, { force: true })
+  })
+
+  it('caminho feliz: aplica, confere, e commita só o liberacoes.json com o trailer (replay no formato real)', async () => {
+    expect(ap).not.toBeNull()
+    montar()
+    // algo já no índice fica no índice e fora do commit (git commit --only)
+    writeFileSync(join(raiz, 'src/outro.ts'), 'export const a = 2\n')
+    git(raiz, 'add', 'src/outro.ts')
+    const h = head()
+    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+    expect(r).toEqual({ ok: true, commit: expect.stringMatching(/^[0-9a-f]{40}$/), token: 'migration-9001-aplicada' })
+    // o insert: versão e nome DO ARQUIVO, created_by do aplicador, sem o envelope
+    expect(inserts).toHaveLength(1)
+    expect(aplicadas.at(-1)).toEqual({ version: '20261020000100', name: 'nova', created_by: 'orq-aplicador:lucas' })
+    expect(inserts[0]).not.toMatch(/^begin;/m)
+    expect(inserts[0]).toContain('create table public.t9001 (i int);')
+    // o commit
+    expect(git(raiz, 'rev-parse', 'HEAD^').trim()).toBe(h)
+    expect(git(raiz, 'show', '--name-only', '--format=', 'HEAD').trim().split('\n')).toEqual(['docs/fila/liberacoes.json'])
+    expect(git(raiz, 'log', '-1', '--format=%B')).toMatch(/\nOrq-Aplicador: b1 20261020000100 supabase\/migrations\/20261020000100_nova\.sql\n/)
+    expect(git(raiz, 'diff', '--cached', '--name-only').trim()).toBe('src/outro.ts')
+    // o replay: exatamente uma entrada a mais em .liberadas, o resto byte a byte
+    const antes = JSON.parse(original()) as { liberadas: unknown[] }
+    const depois = JSON.parse(lib()) as { liberadas: Record<string, string>[]; tokens: unknown[] }
+    expect(depois.liberadas).toHaveLength(325)
+    const nova = depois.liberadas.at(-1)!
+    const d = new Date()
+    const hoje = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
+    expect(nova).toEqual({
+      token: 'migration-9001-aplicada',
+      em: hoje,
+      por: 'lucas',
+      nota: 'aplicador do kit, versão 20261020000100, arquivo supabase/migrations/20261020000100_nova.sql, ref HEAD, usuário lucas',
+    })
+    expect({ ...depois, liberadas: depois.liberadas.slice(0, -1) }).toEqual(antes)
+    expect(git(raiz, 'diff', '--numstat', 'HEAD^', 'HEAD').trim()).toBe('6\t0\tdocs/fila/liberacoes.json')
+    // mostrou o SQL e o aviso de classe; o token nunca aparece
+    const tudo = saida.join('\n')
+    expect(tudo).toContain('create table public.t9001 (i int);')
+    expect(tudo).toMatch(/aviso.*DROP/i)
+    expect(tudo).not.toContain(TOKEN.slice(4))
+    expect(JSON.stringify(ledger())).not.toContain(TOKEN.slice(4))
+    expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'aplicada', 'token_emitido'])
+    expect(ledger().at(-1)).toEqual(expect.objectContaining({ banco: 'b1', repo: 'cmk', arquivo: NOVA, versao: '20261020000100', token: 'migration-9001-aplicada', commit: r.ok ? r.commit : '' }))
+  })
+
+  it('herdado que só existe na staging: aplica do ref, e a nota diz o ref', async () => {
+    expect(ap).not.toBeNull()
+    montar()
+    const r = await ap!.aplicar({ repo: 'cmk', arquivo: '20261005000000_herdada.sql' }, meios({ perguntar: async () => '20261005000000' }))
+    expect(r).toEqual(expect.objectContaining({ ok: true, token: 'migration-9002-aplicada' }))
+    expect(inserts[0]).toContain('create table public.t9002 (i int);')
+    expect((JSON.parse(lib()) as { liberadas: { nota: string }[] }).liberadas.at(-1)!.nota).toContain('ref staging-auto')
+  })
+
+  describe('recusas (nada aplicado, nada escrito no repo)', () => {
+    it('MIGRATIONS_PAUSADO', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      writeFileSync(env().ORQ_MIGRATIONS_PAUSADO!, 'manutenção\n')
+      await recusa({}, /MIGRATIONS_PAUSADO/)
+    })
+    it('sem TTY', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      await recusa({}, /sem TTY/, { tty: false })
+    })
+    it('sem sonda, e com a sonda vermelha', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      rmSync(join(migDir(), 'b1.sonda.json'))
+      await recusa({}, /sonda/)
+      writeFileSync(join(migDir(), 'b1.sonda.json'), JSON.stringify({ mesma_transacao: false }))
+      await recusa({}, /sonda/)
+    })
+    it('sem linha de base', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      rmSync(join(migDir(), 'b1.json'))
+      await recusa({}, /linha de base/)
+    })
+    it('repo só leitura', async () => {
+      expect(ap).not.toBeNull()
+      montar({ somenteLeitura: true })
+      await recusa({}, /somente_leitura|só leitura/)
+    })
+    it('arquivo fora do plano (já aplicado) e arquivo que não existe', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      await recusa({ arquivo: ANTIGA }, /fora do plano/)
+      await recusa({ arquivo: 'supabase/migrations/20261099000000_nao_existe.sql' }, /fora do plano/)
+    })
+    it('arquivo com conteúdo diferente entre os refs', async () => {
+      expect(ap).not.toBeNull()
+      montar({ staging: { [NOVA]: SQL_NOVA.replace('t9001', 't9001x') } })
+      await recusa({}, /diverge|diferente entre/)
+    })
+    it('token: ausente, dois no arquivo, já liberado', async () => {
+      expect(ap).not.toBeNull()
+      montar({ main: { 'supabase/migrations/20261020000200_sem_token.sql': 'create table public.s (i int);\n', 'supabase/migrations/20261020000300_dois.sql': '-- humano:migration-1-aplicada humano:migration-2-aplicada\ncreate table public.d (i int);\n' } })
+      await recusa({ arquivo: 'supabase/migrations/20261020000200_sem_token.sql' }, /token/, { perguntar: async () => '20261020000200' })
+      await recusa({ arquivo: 'supabase/migrations/20261020000300_dois.sql' }, /token/, { perguntar: async () => '20261020000300' })
+      // já liberado (na forma do Comarka, sem prefixo)
+      const d = JSON.parse(original()) as { liberadas: unknown[] }
+      d.liberadas.push({ token: 'migration-9001-aplicada', em: '2026-10-19', por: 'lucas', nota: 'à mão' })
+      writeFileSync(join(raiz, 'docs/fila/liberacoes.json'), JSON.stringify(d, null, 2) + '\n')
+      git(raiz, 'commit', '-q', '-am', 'liberado à mão')
+      const h = head()
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r).toEqual(expect.objectContaining({ ok: false, motivo: expect.stringMatching(/já está liberado/) }))
+      expect(inserts).toEqual([])
+      expect(head()).toBe(h)
+    })
+    it('--token explícito vale para o arquivo sem token, e é conferido contra o molde', async () => {
+      expect(ap).not.toBeNull()
+      montar({ main: { 'supabase/migrations/20261020000200_sem_token.sql': 'create table public.s (i int);\n' } })
+      await recusa({ arquivo: 'supabase/migrations/20261020000200_sem_token.sql', token: 'decisao-D1' }, /molde/, { perguntar: async () => '20261020000200' })
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: 'supabase/migrations/20261020000200_sem_token.sql', token: 'humano:migration-777-aplicada' }, meios({ perguntar: async () => '20261020000200' }))
+      expect(r).toEqual(expect.objectContaining({ ok: true, token: 'migration-777-aplicada' }))
+    })
+    it('pausar_file do repo, docs/fila/.orq-pause e liberacoes modificado na árvore', async () => {
+      expect(ap).not.toBeNull()
+      montar({ cfg: { pausar_file: 'docs/fila/PAUSAR' } })
+      writeFileSync(join(raiz, 'docs/fila/PAUSAR'), 'x\n')
+      await recusa({}, /pausar_file.*PAUSAR/)
+      rmSync(join(raiz, 'docs/fila/PAUSAR'))
+      writeFileSync(join(raiz, 'docs/fila/.orq-pause'), 'ritual\n')
+      await recusa({}, /\.orq-pause.*ritual/)
+      rmSync(join(raiz, 'docs/fila/.orq-pause'))
+      const h = head()
+      writeFileSync(join(raiz, 'docs/fila/liberacoes.json'), original().replace('"descricao"', '"descricao" ') )
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r).toEqual(expect.objectContaining({ ok: false, motivo: expect.stringMatching(/modificado na árvore/) }))
+      expect(inserts).toEqual([])
+      expect(head()).toBe(h)
+    })
+    it('SQL recusado (begin no meio)', async () => {
+      expect(ap).not.toBeNull()
+      montar({ main: { 'supabase/migrations/20261020000400_dupla.sql': '-- humano:migration-9004-aplicada\nbegin;\ncreate table a(i int);\ncommit;\nbegin;\ncreate table b(i int);\ncommit;\n' } })
+      await recusa({ arquivo: 'supabase/migrations/20261020000400_dupla.sql' }, /transação no meio/, { perguntar: async () => '20261020000400' })
+    })
+    it('ORQ_TESTE=1 apontando para a API oficial', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      const t = comEnv({ ORQ_MIGRATIONS_API: '' })
+      try {
+        await recusa({}, /ORQ_TESTE=1/)
+      } finally {
+        t()
+      }
+    })
+    it('confirmação errada', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      await recusa({}, /confirmação/, { perguntar: async () => 'sim' })
+      expect(saida.join('\n')).toContain('create table public.t9001 (i int);')
+    })
+  })
+
+  it('trava por banco: outro processo vivo segura, recusa; trava órfã, assume', async () => {
+    expect(ap).not.toBeNull()
+    montar()
+    const vivo = spawn('sleep', ['30'])
+    try {
+      writeFileSync(join(migDir(), 'b1.lock'), JSON.stringify({ pid: vivo.pid, hora: '2026-10-20T14:00:00Z' }) + '\n')
+      await recusa({}, new RegExp(`trava.*pid ${vivo.pid}`))
+    } finally {
+      vivo.kill()
+    }
+    // pid que não existe mais
+    const morto = spawnSync('bash', ['-c', 'echo $$']).stdout.toString().trim()
+    writeFileSync(join(migDir(), 'b1.lock'), JSON.stringify({ pid: Number(morto), hora: '2026-10-20T14:00:00Z' }) + '\n')
+    const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+    expect(r.ok).toBe(true)
+    expect(existsSync(join(migDir(), 'b1.lock'))).toBe(false)
+  })
+
+  it('pre_check: vermelho para antes de aplicar; recebe o .sql extraído; verde segue', async () => {
+    expect(ap).not.toBeNull()
+    const pre = join(amb.base, 'pre.sh')
+    writeFileSync(pre, `#!/bin/bash\ncp "$1" "${amb.base}/pre-viu.sql"\necho "BLOQUEIA contracao quebraria codigo vivo"\nexit "\${PRE_RC:-1}"\n`)
+    chmodSync(pre, 0o755)
+    montar({ preCheck: [pre, '{arquivo}'] })
+    await recusa({}, /pre_check.*rc 1.*BLOQUEIA contracao/s)
+    expect(readFileSync(join(amb.base, 'pre-viu.sql'), 'utf8')).toBe(SQL_NOVA)
+    const t = comEnv({ PRE_RC: '0' })
+    try {
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r.ok).toBe(true)
+    } finally {
+      t()
+    }
+  })
+
+  describe('a conferência decide o token', () => {
+    it('aplicou mas a linha não está no ledger: não emite token', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      modo = 'naoGrava'
+      const h = head()
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'falha', motivo: expect.stringMatching(/conferência/) }))
+      expect(inserts).toHaveLength(1)
+      expect(head()).toBe(h)
+      expect(lib()).toBe(original())
+      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'conferencia_falhou'])
+    })
+    it('erro do Postgres: não emite token, e o token não vaza do erro', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      modo = 'erro400'
+      const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'falha', motivo: expect.stringContaining('already exists') }))
+      if (!r.ok) expect(r.motivo).not.toContain(TOKEN.slice(4))
+      expect(lib()).toBe(original())
+      expect(JSON.stringify(ledger())).not.toContain(TOKEN.slice(4))
+      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'falhou'])
+    })
+    it('incerto sem a linha: não emite token; incerto com a linha: emite', async () => {
+      expect(ap).not.toBeNull()
+      montar()
+      modo = 'timeout'
+      const t = comEnv({ ORQ_MIGRATIONS_HTTP_TIMEOUT_S: '0.3' })
+      try {
+        const r = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+        expect(r).toEqual(expect.objectContaining({ ok: false, tipo: 'incerto' }))
+        expect(lib()).toBe(original())
+      } finally {
+        t()
+      }
+      modo = 'grava503'
+      inserts = []
+      const r2 = await ap!.aplicar({ repo: 'cmk', arquivo: NOVA }, meios())
+      expect(r2).toEqual(expect.objectContaining({ ok: true, token: 'migration-9001-aplicada' }))
+      expect(ledger().map((e) => e.tipo)).toEqual(['aplicar_inicio', 'incerto', 'aplicar_inicio', 'aplicada', 'token_emitido'])
+    })
+  })
+
+  describe('a CLI', () => {
+    it('sem TTY de verdade: o orq recusa antes de qualquer rede', () => {
+      expect(cli).not.toBeNull()
+      montar()
+      const r = spawnSync('bash', [join(KIT, 'scripts', 'orq'), 'migrations', 'aplicar', 'cmk', NOVA], { encoding: 'utf8', env: { ...process.env, ...env() }, input: '20261020000100\n' })
+      expect(r.status).toBe(1)
+      expect(r.stderr).toMatch(/sem TTY/)
+      expect(lib()).toBe(original())
+    })
+    it('uso: verbo desconhecido sai 2 com o uso', () => {
+      expect(cli).not.toBeNull()
+      const r = spawnSync('bash', [join(KIT, 'scripts', 'orq'), 'migrations', 'voar'], { encoding: 'utf8', env: { ...process.env, ...env() } })
+      expect(r.status).toBe(2)
+      expect(r.stderr).toMatch(/uso: orq migrations/)
+    })
+    it('sonda, linha-base (não sobrescreve sem --substituir), plano e status', async () => {
+      expect(cli).not.toBeNull()
+      montar()
+      rmSync(join(migDir(), 'b1.json'))
+      rmSync(join(migDir(), 'b1.sonda.json'))
+      const out: string[] = []
+      const m = { escrever: (t: string) => out.push(t) }
+      sondaVerde = false
+      expect(await cli!.main(['sonda', 'b1'], m)).toBe(1)
+      sondaVerde = true
+      expect(await cli!.main(['sonda', 'b1'], m)).toBe(0)
+      expect(JSON.parse(readFileSync(join(migDir(), 'b1.sonda.json'), 'utf8'))).toEqual(expect.objectContaining({ banco: 'b1', banco_id: BANCO_ID, mesma_transacao: true }))
+      aplicadas.push({ version: '20261010000000', name: 'feita_no_editor', created_by: 'conector-mcp' })
+      expect(await cli!.main(['linha-base', 'b1', '--herdados-desde', '20261002'], m)).toBe(0)
+      const lb = JSON.parse(readFileSync(join(migDir(), 'b1.json'), 'utf8')) as { corte: string; pendentes_herdados: { arquivo: string }[] }
+      expect(lb.corte).toBe('20261010000000')
+      expect(lb.pendentes_herdados.map((h) => h.arquivo)).toEqual([HERDADA])
+      expect(await cli!.main(['linha-base', 'b1'], m)).toBe(1)
+      expect(out.join('\n')).toMatch(/--substituir/)
+      aplicadas.push({ version: '20261019000000', name: 'sem_arquivo', created_by: 'conector-mcp' })
+      out.length = 0
+      expect(await cli!.main(['plano', 'b1'], m)).toBe(0)
+      const p = out.join('\n')
+      expect(p).toMatch(/Pendentes \(1\)[\s\S]*20261020000100_nova\.sql[\s\S]*migration-9001-aplicada/)
+      expect(p).toMatch(/Herdados \(1\)[\s\S]*20261005000000_herdada\.sql[\s\S]*staging-auto/)
+      expect(p).toMatch(/Drift \(1\)[\s\S]*20261019000000 sem_arquivo[\s\S]*conector-mcp/)
+      out.length = 0
+      expect(await cli!.main(['status'], m)).toBe(0)
+      expect(out.join('\n')).toMatch(/b1.*corte 20261010000000.*sonda ok.*1 pendente.*1 herdado.*1 drift/s)
+      expect(out.join('\n')).not.toContain(TOKEN.slice(4))
+    })
+  })
+})
diff --git a/test/orquestrador-migrations-config.test.ts b/test/orquestrador-migrations-config.test.ts
new file mode 100644
index 0000000..367d0bc
--- /dev/null
+++ b/test/orquestrador-migrations-config.test.ts
@@ -0,0 +1,154 @@
+/**
+ * Etapa MIG-A, peça P1 · o bloco `migrations.bancos` do `~/.orq/repos.json`.
+ *
+ * Pronto quando:
+ *   - a config real do Comarka (escritor) e do dashboard-comercial (somente
+ *     leitura, fora de `.repos[]`) valida, e os dois repos agrupam no banco;
+ *   - o dashboard não entra na lista de repos que o resolvedor e o painel leem;
+ *   - `banco_id` repetido entre dois bancos é recusado;
+ *   - erro de config tem mensagem por campo.
+ */
+import { mkdtempSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, beforeAll, describe, expect, it } from 'vitest'
+import { comEnv } from './resolvedor-repo.js'
+
+const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador')
+
+type Mod = {
+  validarBancos: (raiz: unknown, listados: { nome: string; caminho: string }[]) => { bancos: Record<string, unknown>[]; erros: string[] }
+  lerBancos: () => { bancos: Record<string, unknown>[]; erros: string[] }
+}
+
+const COMARKA = '/Users/x/Projetos/comarka-operacional'
+const LISTADOS = [
+  { nome: 'conteudos-infinitos', caminho: '/Users/x/Projetos/conteudos-infinitos' },
+  { nome: 'comarka-operacional', caminho: COMARKA },
+]
+
+/** A config real proposta no PASSO 0 e confirmada (E1), com os valores do Comarka. */
+const real = () => ({
+  bancos: {
+    comarka: {
+      ferramenta: 'supabase',
+      banco_id: 'ogfnojbbvumujzfklkhh',
+      repos: [
+        {
+          repo: 'comarka-operacional',
+          dir: 'supabase/migrations',
+          refs: ['HEAD', 'origin/staging-auto', 'origin/staging-apolo'],
+          credencial_env: 'SUPABASE_ACCESS_TOKEN',
+          env_arquivo: '.env.local',
+          token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
+          pre_check: ['python3', 'scripts/roadmap/checar-promocao.py', '--aplicar', '{arquivo}'],
+        },
+        { caminho: '/Users/x/Projetos/dashboard-comercial', dir: 'supabase/migrations', somente_leitura: true },
+      ],
+    },
+  },
+})
+
+describe('P1: config por banco no repos.json', () => {
+  let m: Mod | null = null
+  beforeAll(async () => {
+    try {
+      m = (await import(pathToFileURL(join(DIR, 'migrations', 'config.ts')).href)) as Mod
+    } catch {
+      m = null
+    }
+  })
+
+  it('a config real do Comarka e do dashboard valida e agrupa no banco', () => {
+    expect(m).not.toBeNull()
+    const r = m!.validarBancos(real(), LISTADOS)
+    expect(r.erros).toEqual([])
+    expect(r.bancos).toHaveLength(1)
+    const b = r.bancos[0] as { nome: string; bancoId: string; repos: Record<string, unknown>[]; escritor: Record<string, unknown> }
+    expect(b.nome).toBe('comarka')
+    expect(b.bancoId).toBe('ogfnojbbvumujzfklkhh')
+    expect(b.repos.map((x) => [x.nome, x.somenteLeitura])).toEqual([
+      ['comarka-operacional', false],
+      ['dashboard-comercial', true],
+    ])
+    expect(b.escritor).toEqual(
+      expect.objectContaining({
+        nome: 'comarka-operacional',
+        caminho: COMARKA,
+        refs: ['HEAD', 'origin/staging-auto', 'origin/staging-apolo'],
+        credencialEnv: 'SUPABASE_ACCESS_TOKEN',
+        token: { formato: 'liberadas', molde: 'migration-{id}-aplicada', por: 'lucas' },
+      }),
+    )
+    // repo só leitura não precisa de credencial nem de token
+    expect(b.repos[1]).toEqual(expect.objectContaining({ credencialEnv: null, token: null, refs: ['HEAD'] }))
+  })
+
+  it('o bloco mora no topo: o dashboard não entra na lista de repos do resolvedor e do painel', async () => {
+    expect(m).not.toBeNull()
+    const base = mkdtempSync(join(tmpdir(), 'mig-cfg-'))
+    const arq = join(base, 'repos.json')
+    writeFileSync(arq, JSON.stringify({ $schema_versao: 1, repos: [{ caminho: COMARKA }], migrations: real() }, null, 2))
+    const tira = comEnv({ ORQ_REPOS: arq })
+    try {
+      const { lerRepos } = (await import(pathToFileURL(join(DIR, 'triador', 'saida.ts')).href)) as { lerRepos: () => { nome: string }[] }
+      expect(lerRepos().map((r) => r.nome)).toEqual(['comarka-operacional'])
+      const r = m!.lerBancos()
+      expect(r.erros).toEqual([])
+      expect((r.bancos[0] as { repos: unknown[] }).repos).toHaveLength(2)
+    } finally {
+      tira()
+    }
+  })
+
+  it('sem o bloco: nenhum banco e nenhum erro', () => {
+    expect(m).not.toBeNull()
+    expect(m!.validarBancos(undefined, LISTADOS)).toEqual({ bancos: [], erros: [] })
+  })
+
+  it('banco_id repetido entre dois bancos é recusado; o mesmo repo em dois bancos também', () => {
+    expect(m).not.toBeNull()
+    const c = real()
+    const outro = { ferramenta: 'supabase', banco_id: 'ogfnojbbvumujzfklkhh', repos: [{ repo: 'conteudos-infinitos', dir: 'db', somente_leitura: true }] }
+    const r = m!.validarBancos({ bancos: { ...c.bancos, dois: outro } }, LISTADOS)
+    expect(r.erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.dois\.banco_id: .*ogfnojbbvumujzfklkhh.*comarka/))
+    const r2 = m!.validarBancos({ bancos: { ...c.bancos, dois: { ...outro, banco_id: 'abcdefghijklmnopqrst', repos: [{ repo: 'comarka-operacional', dir: 'x', somente_leitura: true }] } } }, LISTADOS)
+    expect(r2.erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.dois\.repos\[0\]: .*comarka-operacional.*comarka/))
+  })
+
+  it('erro por campo: cada falta diz o caminho e o que falta', () => {
+    expect(m).not.toBeNull()
+    const ruim = {
+      bancos: {
+        b: {
+          ferramenta: 'postgres',
+          banco_id: 'X!',
+          repos: [
+            { repo: 'nao-existe', dir: 'supabase/migrations' },
+            { repo: 'comarka-operacional', dir: '../fora', token: { formato: 'outro', molde: 'migration-aplicada' } },
+            { caminho: '/tmp/x', dir: 'm', refs: 'HEAD', somente_leitura: true },
+            { repo: 'conteudos-infinitos', caminho: '/tmp/y', dir: 'm' },
+          ],
+          timeouts: { http_timeout_s: -1 },
+        },
+      },
+    }
+    const e = m!.validarBancos(ruim, LISTADOS).erros
+    const tem = (re: RegExp) => expect(e).toContainEqual(expect.stringMatching(re))
+    tem(/^migrations\.bancos\.b\.ferramenta: /)
+    tem(/^migrations\.bancos\.b\.banco_id: /)
+    tem(/^migrations\.bancos\.b\.repos\[0\]\.repo: 'nao-existe' não está em \.repos\[\]/)
+    tem(/^migrations\.bancos\.b\.repos\[1\]\.dir: /)
+    tem(/^migrations\.bancos\.b\.repos\[1\]\.credencial_env: /)
+    tem(/^migrations\.bancos\.b\.repos\[1\]\.token\.formato: /)
+    tem(/^migrations\.bancos\.b\.repos\[1\]\.token\.molde: /)
+    tem(/^migrations\.bancos\.b\.repos\[2\]\.refs: /)
+    tem(/^migrations\.bancos\.b\.repos\[3\]: .*repo.*caminho/)
+    tem(/^migrations\.bancos\.b\.timeouts\.http_timeout_s: /)
+    // dois escritores no mesmo banco
+    const dois = real()
+    dois.bancos.comarka.repos.push({ ...dois.bancos.comarka.repos[0]!, repo: 'conteudos-infinitos' } as never)
+    expect(m!.validarBancos(dois, LISTADOS).erros).toContainEqual(expect.stringMatching(/^migrations\.bancos\.comarka\.repos: .*um repo que escreve/))
+  })
+})
diff --git a/test/orquestrador-migrations-plano.test.ts b/test/orquestrador-migrations-plano.test.ts
new file mode 100644
index 0000000..0a7d583
--- /dev/null
+++ b/test/orquestrador-migrations-plano.test.ts
@@ -0,0 +1,156 @@
+/**
+ * Etapa MIG-A, peça P3 · linha de base e plano (pendentes, herdados, drift).
+ *
+ * Fixture real (test/fixtures/migrations/LEIA-ME.md): os 272 arquivos do
+ * Comarka e as 491 linhas de produção de 18/10.
+ *
+ * Pronto quando:
+ *   - corte 20261004: os 6 pendentes recentes e os 29 de drift de outubro;
+ *   - corte de hoje com herdados desde 20261004 (E2, opção b): drift zero, os 6
+ *     atuais viram 5 herdados mais 1 pendente (20261019000100);
+ *   - o plano e o drift mostram o created_by.
+ */
+import { readFileSync } from 'node:fs'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { beforeAll, describe, expect, it } from 'vitest'
+
+const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'migrations')
+const FX = join(import.meta.dirname, 'fixtures', 'migrations')
+
+type Aplicada = { version: string; name: string | null; created_by: string | null }
+type Arq = { repo: string; arquivo: string; versao: string; nome: string; base: string; refs: string[]; divergente: boolean; somenteLeitura: boolean }
+type LB = { corte: string; herdados_desde: string | null; aplicadas: Aplicada[]; pendentes_herdados: { repo: string; arquivo: string }[]; antigos_sem_ledger: number }
+type Plano = { corte: string; pendentes: Arq[]; herdados: Arq[]; drift: Aplicada[]; aplicadasDesdeCorte: (Aplicada & { arquivo: string | null })[] }
+type Mod = {
+  versaoDoArquivo: (rel: string) => { versao: string; nome: string; base: string } | null
+  montarLinhaBase: (o: { banco: string; aplicadas: Aplicada[]; arquivos: Arq[]; corte?: string; herdadosDesde?: string; agora: Date }) => LB
+  montarPlano: (lb: LB, aplicadas: Aplicada[], arquivos: Arq[]) => Plano
+}
+
+const tsv = (f: string) =>
+  readFileSync(join(FX, f), 'utf8')
+    .trim()
+    .split('\n')
+    .slice(1)
+    .map((l) => l.split('\t'))
+
+const SEIS = [
+  '20261007190900_churn_fecha_leitura_anon',
+  '20261017230300_inteligencia_comercial_nota_ghl',
+  '20261018001000_inteligencia_capacidade_registro',
+  '20261018003100_nps_fila_e_resposta_por_contato',
+  '20261018003200_employees_public_sem_anon',
+  '20261019000100_nps_fila_sai_chave_notion',
+].map((n) => `supabase/migrations/${n}.sql`)
+
+describe('P3: linha de base e plano', () => {
+  let m: Mod | null = null
+  let prod: Aplicada[] = []
+  let arqs: Arq[] = []
+  const AGORA = new Date('2026-10-18T17:00:00Z')
+
+  beforeAll(async () => {
+    try {
+      m = (await import(pathToFileURL(join(DIR, 'plano.ts')).href)) as Mod
+    } catch {
+      m = null
+    }
+    prod = tsv('comarka-producao.tsv').map(([version, name, created_by]) => ({ version: version!, name: name!, created_by: created_by! }))
+    if (m)
+      arqs = tsv('comarka-arquivos.tsv').map(([arquivo, refs]) => ({
+        repo: 'comarka-operacional',
+        arquivo: arquivo!,
+        ...m!.versaoDoArquivo(arquivo!)!,
+        refs: refs!.split(','),
+        divergente: false,
+        somenteLeitura: false,
+      }))
+  })
+
+  it('versão e nome saem do nome do arquivo: 14 dígitos, ou 8 completados com zeros', () => {
+    expect(m).not.toBeNull()
+    expect(m!.versaoDoArquivo('supabase/migrations/20261019000100_nps_fila_sai_chave_notion.sql')).toEqual({ versao: '20261019000100', nome: 'nps_fila_sai_chave_notion', base: '20261019000100_nps_fila_sai_chave_notion' })
+    expect(m!.versaoDoArquivo('supabase/migrations/20260612_perf_meta_discovery.sql')).toEqual({ versao: '20260612000000', nome: 'perf_meta_discovery', base: '20260612_perf_meta_discovery' })
+    expect(m!.versaoDoArquivo('supabase/migrations/fix-data.sql')).toBeNull()
+    expect(m!.versaoDoArquivo('supabase/migrations/20261019000100_x.txt')).toBeNull()
+    expect(arqs).toHaveLength(272)
+  })
+
+  it('corte 20261004: os 6 pendentes recentes e os 29 de drift de outubro', () => {
+    expect(m).not.toBeNull()
+    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, corte: '20261004', agora: AGORA })
+    expect(lb.corte).toBe('20261004000000')
+    expect(lb.pendentes_herdados).toEqual([])
+    const p = m!.montarPlano(lb, prod, arqs)
+    expect(p.pendentes.map((a) => a.arquivo)).toEqual(SEIS)
+    expect(p.herdados).toEqual([])
+    expect(p.drift).toHaveLength(29)
+    const nomes = p.drift.map((a) => a.name!)
+    expect(nomes.filter((n) => n.includes('webinar'))).toHaveLength(17)
+    expect(nomes.filter((n) => n.includes('plano_metas'))).toHaveLength(5)
+    expect(nomes.filter((n) => n.includes('regras_lead'))).toHaveLength(2)
+    expect(nomes).toEqual(expect.arrayContaining(['folha_pagamento_employee_id', 'clientes_receita_status_log', 'perf_lead_eventos_tipo_ctwa', 'trava_exclusoes_meses_fechados_leads']))
+    // o drift mostra quem aplicou (E: created_by no plano e no drift)
+    expect(p.drift.every((a) => a.created_by === 'conector-mcp')).toBe(true)
+  })
+
+  it('corte de hoje, herdados desde 20261004: drift zero, 5 herdados e 1 pendente', () => {
+    expect(m).not.toBeNull()
+    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, herdadosDesde: '20261004', agora: AGORA })
+    expect(lb.corte).toBe('20261018030500')
+    expect(lb.herdados_desde).toBe('20261004000000')
+    expect(lb.aplicadas).toHaveLength(491)
+    expect(lb.pendentes_herdados.map((a) => a.arquivo)).toEqual(SEIS.slice(0, 5))
+    // os antigos sem linha no ledger ficam fora, e contados (nada antigo é cobrado).
+    // 31, e não os 38 - 5 do recon: 7 arquivos de 27-29/09 foram aplicados com o
+    // nome base INTEIRO como name (ex.: 20260929120000_chave_unica_cliente_id), e
+    // o casamento pelo nome base os acha.
+    expect(lb.antigos_sem_ledger).toBe(31)
+    const p = m!.montarPlano(lb, prod, arqs)
+    expect(p.drift).toEqual([])
+    expect(p.pendentes.map((a) => a.arquivo)).toEqual(SEIS.slice(5))
+    expect(p.herdados.map((a) => a.arquivo)).toEqual(SEIS.slice(0, 5))
+    expect(p.herdados.map((a) => a.refs)).toEqual([['main', 'origin/staging-auto', 'origin/staging-apolo'], ['origin/staging-apolo'], ['origin/staging-apolo'], ['origin/staging-auto'], ['origin/staging-auto']])
+  })
+
+  it('sem herdados_desde: nenhum herdado, e os 36 sem ledger até o corte são só contados', () => {
+    expect(m).not.toBeNull()
+    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, agora: AGORA })
+    expect(lb.pendentes_herdados).toEqual([])
+    expect(lb.antigos_sem_ledger).toBe(36)
+  })
+
+  it('depois de aplicar: o herdado sai, a linha nova aparece com created_by; linha sem arquivo vira drift', () => {
+    expect(m).not.toBeNull()
+    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, herdadosDesde: '20261004', agora: AGORA })
+    const depois = [
+      ...prod,
+      { version: '20261018003100', name: 'nps_fila_e_resposta_por_contato', created_by: 'orq-aplicador:lucas' },
+      { version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp' },
+    ]
+    const p = m!.montarPlano(lb, depois, arqs)
+    expect(p.herdados.map((a) => a.arquivo)).not.toContain(SEIS[3])
+    expect(p.herdados).toHaveLength(4)
+    expect(p.drift).toEqual([{ version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp' }])
+    expect(p.aplicadasDesdeCorte).toEqual([{ version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp', arquivo: null }])
+    // aplicada pelo aplicador acima do corte: casa o arquivo e mostra quem aplicou
+    const p2 = m!.montarPlano(lb, [...prod, { version: '20261019000100', name: 'nps_fila_sai_chave_notion', created_by: 'orq-aplicador:lucas' }], arqs)
+    expect(p2.pendentes).toEqual([])
+    expect(p2.aplicadasDesdeCorte).toEqual([{ version: '20261019000100', name: 'nps_fila_sai_chave_notion', created_by: 'orq-aplicador:lucas', arquivo: SEIS[5] }])
+  })
+
+  it('casa por nome com versão diferente (84 do Comarka) e pelo nome com prefixo (o dashboard grava 20261006_<nome>)', () => {
+    expect(m).not.toBeNull()
+    const a = (arquivo: string): Arq => ({ repo: 'r', arquivo, ...m!.versaoDoArquivo(arquivo)!, refs: ['HEAD'], divergente: false, somenteLeitura: false })
+    const arquivos = [a('m/20261010000000_x.sql'), a('m/20261011_webinar_y.sql')]
+    const ledger = [
+      { version: '20261010123456', name: 'x', created_by: null },
+      { version: '20261011999999', name: '20261011_webinar_y', created_by: null },
+    ]
+    const lb = m!.montarLinhaBase({ banco: 'b', aplicadas: [], arquivos, corte: '20261001', agora: AGORA })
+    const p = m!.montarPlano(lb, ledger, arquivos)
+    expect(p.pendentes).toEqual([])
+    expect(p.drift).toEqual([])
+  })
+})
diff --git a/test/orquestrador-migrations-supabase.test.ts b/test/orquestrador-migrations-supabase.test.ts
new file mode 100644
index 0000000..a451f64
--- /dev/null
+++ b/test/orquestrador-migrations-supabase.test.ts
@@ -0,0 +1,289 @@
+/**
+ * Etapa MIG-A, peça P2 · o adaptador supabase e o preparo do SQL.
+ *
+ * Pronto quando (tudo contra um stub HTTP em 127.0.0.1, nunca o banco):
+ *   - sucesso: um POST em /database/query com os timeouts, o corpo e o insert
+ *     no schema_migrations (versão e nome DO ARQUIVO, created_by do aplicador);
+ *   - erro do Postgres (4xx) é erro certo; 5xx, timeout e resposta ilegível são
+ *     estado INCERTO;
+ *   - recusa begin/commit no meio, CONCURRENTLY e VACUUM; aceita e tira o
+ *     envelope begin;...commit; (77 de 77 migrations recentes do Comarka o têm);
+ *   - o token nunca aparece em log, erro ou mensagem;
+ *   - com ORQ_TESTE=1 só fala com 127.0.0.1, e sem ele só com a API oficial.
+ */
+import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
+import type { AddressInfo } from 'node:net'
+import { mkdtempSync, writeFileSync } from 'node:fs'
+import { tmpdir } from 'node:os'
+import { join } from 'node:path'
+import { pathToFileURL } from 'node:url'
+import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest'
+import { comEnv } from './resolvedor-repo.js'
+
+const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'migrations')
+const TOKEN = 'sbp_EXEMPLO_REMOVIDO'
+
+type Prep = { ok: true; corpo: string; statements: string[]; envelope: boolean } | { ok: false; motivo: string }
+type Res = { ok: true } | { ok: false; incerto: boolean; mensagem: string }
+type Adaptador = {
+  listarAplicadas: () => Promise<{ version: string; name: string | null; created_by: string | null }[]>
+  aplicar: (m: { corpo: string; statements: string[]; versao: string; nome: string; criadoPor: string }) => Promise<Res>
+  sonda: () => Promise<boolean>
+  mascarar: (s: string) => string
+}
+type SqlMod = { prepararSql: (s: string) => Prep; avisosDeClasse: (s: string) => string[]; literal: (s: string) => string }
+type SupaMod = {
+  criarAdaptador: (o: { bancoId: string; token: string; timeouts: { lockS: number; statementS: number; httpS: number } }) => Adaptador
+  baseDaApi: () => string
+  lerCredencial: (raiz: string, envArquivo: string, nome: string) => string
+  mascarar: (s: string, segredos: string[]) => string
+}
+
+/** o stub: guarda cada pedido e responde o que o teste mandar */
+type Pedido = { metodo: string; url: string; auth: string; corpo: Record<string, unknown> }
+let responder: (p: Pedido, res: ServerResponse) => void = (_p, res) => res.end('[]')
+const pedidos: Pedido[] = []
+let srv: Server
+let base = ''
+
+const json = (res: ServerResponse, status: number, v: unknown) => {
+  res.writeHead(status, { 'content-type': 'application/json' })
+  res.end(JSON.stringify(v))
+}
+
+const TIMEOUTS = { lockS: 5, statementS: 60, httpS: 5 }
+
+/** O SQL do 1377 (ticket real de 18/10), no formato que o Comarka entrega. */
+const SQL_1377 = `-- APLICAR E HUMANO (skill aplicar-migration-ddl); libera humano:migration-1377-aplicada
+-- fase: contracao
+begin;
+
+do $$
+begin
+  if exists (select 1 from public.rag_chunks) then
+    raise exception 'rag_chunks tem linha; commit; nao troca o tipo';
+  end if;
+end
+$$;
+
+drop index if exists public.idx_rag_chunks_embedding;
+alter table public.rag_chunks alter column embedding type extensions.vector(1024);
+create index idx_rag_chunks_embedding on public.rag_chunks using hnsw (embedding extensions.vector_cosine_ops);
+
+commit;
+-- REVERSAO EXATA: ...
+`
+
+describe('P2: adaptador supabase', () => {
+  let sql: SqlMod | null = null
+  let supa: SupaMod | null = null
+  let tira: () => void = () => {}
+
+  beforeAll(async () => {
+    srv = createServer((req: IncomingMessage, res: ServerResponse) => {
+      let b = ''
+      req.on('data', (c) => (b += c))
+      req.on('end', () => {
+        const p = { metodo: req.method ?? '', url: req.url ?? '', auth: String(req.headers.authorization ?? ''), corpo: b ? (JSON.parse(b) as Record<string, unknown>) : {} }
+        pedidos.push(p)
+        responder(p, res)
+      })
+    })
+    await new Promise<void>((r) => srv.listen(0, '127.0.0.1', r))
+    base = `http://127.0.0.1:${(srv.address() as AddressInfo).port}`
+    tira = comEnv({ ORQ_TESTE: '1', ORQ_MIGRATIONS_API: base })
+    try {
+      sql = (await import(pathToFileURL(join(DIR, 'sql.ts')).href)) as SqlMod
+      supa = (await import(pathToFileURL(join(DIR, 'supabase.ts')).href)) as SupaMod
+    } catch {
+      sql = supa = null
+    }
+  })
+  afterAll(async () => {
+    tira()
+    srv.closeAllConnections()
+    await new Promise((r) => srv.close(r))
+  })
+  afterEach(() => {
+    pedidos.length = 0
+    responder = (_p, res) => res.end('[]')
+  })
+
+  const adaptador = (httpS = 5) => supa!.criarAdaptador({ bancoId: 'ogfnojbbvumujzfklkhh', token: TOKEN, timeouts: { ...TIMEOUTS, httpS } })
+  const migracao = () => {
+    const p = sql!.prepararSql(SQL_1377)
+    if (!p.ok) throw new Error(p.motivo)
+    return { corpo: p.corpo, statements: p.statements, versao: '20261018030500', nome: 'rag_chunks_vector_1024', criadoPor: 'orq-aplicador:lucas' }
+  }
+
+  describe('o SQL', () => {
+    it('aceita o envelope begin;...commit; e o tira, sem mexer no resto (nem no commit; dentro de literal)', () => {
+      expect(sql).not.toBeNull()
+      const p = sql!.prepararSql(SQL_1377)
+      expect(p.ok).toBe(true)
+      if (!p.ok) return
+      expect(p.envelope).toBe(true)
+      const ini = SQL_1377.indexOf('begin;') + 'begin;'.length
+      const fim = SQL_1377.lastIndexOf('commit;')
+      expect(p.corpo).toBe(SQL_1377.slice(ini, fim))
+      expect(p.statements).toHaveLength(4)
+      expect(p.statements[0]).toMatch(/^do \$\$/)
+      expect(p.statements[3]).toMatch(/^create index idx_rag_chunks_embedding/)
+      // sem envelope também vale, e o corpo é o arquivo inteiro
+      const sem = sql!.prepararSql('create table public.x (id int);\n')
+      expect(sem).toEqual({ ok: true, corpo: 'create table public.x (id int);\n', statements: ['create table public.x (id int);'], envelope: false })
+    })
+
+    it('recusa begin/commit no meio, envelope pela metade, CONCURRENTLY, VACUUM e ALTER SYSTEM', () => {
+      expect(sql).not.toBeNull()
+      const recusa = (s: string, re: RegExp) => {
+        const p = sql!.prepararSql(s)
+        expect(p.ok, s).toBe(false)
+        if (!p.ok) expect(p.motivo).toMatch(re)
+      }
+      recusa('begin;\ncreate table a(i int);\ncommit;\nbegin;\ncreate table b(i int);\ncommit;\n', /transação no meio.*use a skill/s)
+      recusa('create table a(i int);\nsavepoint s1;\n', /transação no meio/)
+      recusa('begin;\ncreate table a(i int);\n', /envelope/)
+      recusa('create table a(i int);\ncommit;\n', /envelope/)
+      recusa('create index concurrently ix on t (c);\n', /CONCURRENTLY.*use a skill/s)
+      recusa('begin;\nvacuum analyze t;\ncommit;\n', /VACUUM/)
+      recusa('alter system set work_mem = 1;\n', /ALTER SYSTEM/)
+      recusa("create table a(i int);\nselect 'sem fim;\n", /sem fim/)
+      recusa('-- só comentário\n', /vazio/)
+    })
+
+    it('aviso de classe: as palavras fora de comentário e de literal', () => {
+      expect(sql).not.toBeNull()
+      expect(sql!.avisosDeClasse(SQL_1377)).toEqual(['DROP', 'ALTER COLUMN'])
+      const s = "-- drop table x\ncreate function f() returns int language sql security definer as $$ select 1 $$;\ngrant select on t to anon;\nalter table t alter column c set not null;\ncreate policy p on t using (true);\ndelete from t; truncate t; alter table t rename to u; revoke all on t from anon;\nselect 'drop';\n"
+      expect(sql!.avisosDeClasse(s)).toEqual(['DROP', 'TRUNCATE', 'DELETE', 'RENAME', 'GRANT', 'REVOKE', 'POLICY', 'SECURITY DEFINER', 'ALTER COLUMN', 'SET NOT NULL'].filter((x) => x !== 'DROP'))
+    })
+
+    it('literal em dollar-quote com etiqueta que não aparece no texto', () => {
+      expect(sql).not.toBeNull()
+      const l = sql!.literal("a $orq$ b ' c")
+      const tag = l.slice(0, l.indexOf('$', 1) + 1)
+      expect(l).toBe(`${tag}a $orq$ b ' c${tag}`)
+      expect("a $orq$ b ' c").not.toContain(tag)
+    })
+  })
+
+  describe('a API', () => {
+    it('sucesso: um POST em /database/query com timeouts, corpo e o insert com a versão e o nome do arquivo', async () => {
+      expect(supa).not.toBeNull()
+      const r = await adaptador().aplicar(migracao())
+      expect(r).toEqual({ ok: true })
+      expect(pedidos).toHaveLength(1)
+      const p = pedidos[0]!
+      expect(p.metodo).toBe('POST')
+      expect(p.url).toBe('/v1/projects/ogfnojbbvumujzfklkhh/database/query')
+      expect(p.auth).toBe(`Bearer ${TOKEN}`)
+      const q = String(p.corpo.query)
+      expect(p.corpo.read_only).toBeUndefined()
+      expect(q).not.toMatch(/^\s*begin\s*;/im)
+      expect(q).not.toMatch(/^\s*commit\s*;/im)
+      expect(q.indexOf("set_config('lock_timeout', '5s', true)")).toBeGreaterThanOrEqual(0)
+      expect(q).toContain("set_config('statement_timeout', '60s', true)")
+      expect(q).toContain(migracao().corpo)
+      expect(q).toMatch(/insert into supabase_migrations\.schema_migrations\(version, name, statements, created_by\) values \(\$(orq\w*)\$20261018030500\$\1\$, \$\w+\$rag_chunks_vector_1024\$\w+\$, array\[/)
+      expect(q).toMatch(/orq-aplicador:lucas\$\w+\$\);\s*$/)
+      // o timeout de lock vem antes do corpo, o insert depois
+      expect(q.indexOf('lock_timeout')).toBeLessThan(q.indexOf('drop index'))
+      expect(q.indexOf('insert into supabase_migrations')).toBeGreaterThan(q.indexOf('create index'))
+    })
+
+    it('erro do Postgres (400) é erro certo, com a mensagem', async () => {
+      expect(supa).not.toBeNull()
+      responder = (_p, res) => json(res, 400, { message: 'Failed to run sql query: ERROR:  42P01: relation "public.rag_chunks" does not exist' })
+      const r = await adaptador().aplicar(migracao())
+      expect(r).toEqual({ ok: false, incerto: false, mensagem: expect.stringContaining('relation "public.rag_chunks" does not exist') })
+    })
+
+    it('5xx, timeout e resposta ilegível são estado incerto', async () => {
+      expect(supa).not.toBeNull()
+      responder = (_p, res) => json(res, 503, { message: 'upstream' })
+      expect(await adaptador().aplicar(migracao())).toEqual({ ok: false, incerto: true, mensagem: expect.stringContaining('503') })
+      responder = (_p, res) => {
+        res.writeHead(200)
+        res.end('<html>nao e json</html>')
+      }
+      expect(await adaptador().aplicar(migracao())).toEqual({ ok: false, incerto: true, mensagem: expect.stringMatching(/ilegível/) })
+      responder = () => {
+        /* nunca responde */
+      }
+      const ini = Date.now()
+      const r = await adaptador(0.3).aplicar(migracao())
+      expect(r).toEqual({ ok: false, incerto: true, mensagem: expect.stringMatching(/tempo/) })
+      expect(Date.now() - ini).toBeLessThan(3000)
+    })
+
+    it('listar e sonda: só leitura, com created_by', async () => {
+      expect(supa).not.toBeNull()
+      responder = (p, res) =>
+        String(p.corpo.query).includes('mesma_transacao')
+          ? json(res, 201, [{ mesma_transacao: true }])
+          : json(res, 201, [{ version: '20261018030500', name: 'rag_chunks_vector_1024', created_by: 'orq-aplicador:lucas' }])
+      const a = adaptador()
+      expect(await a.listarAplicadas()).toEqual([{ version: '20261018030500', name: 'rag_chunks_vector_1024', created_by: 'orq-aplicador:lucas' }])
+      expect(pedidos[0]!.corpo.read_only).toBe(true)
+      expect(String(pedidos[0]!.corpo.query)).toMatch(/select version, name, created_by from supabase_migrations\.schema_migrations/)
+      expect(await a.sonda()).toBe(true)
+      expect(pedidos[1]!.corpo.read_only).toBe(true)
+      expect(String(pedidos[1]!.corpo.query)).toMatch(/txid_current\(\).*;\s*select .*txid_current\(\) as mesma_transacao/s)
+      responder = (_p, res) => json(res, 201, [{ mesma_transacao: false }])
+      expect(await a.sonda()).toBe(false)
+    })
+
+    it('o token nunca aparece: nem no erro que o servidor ecoa, nem no erro de listar, nem na falta de credencial', async () => {
+      expect(supa).not.toBeNull()
+      responder = (p, res) => json(res, 401, { message: `token invalido: ${p.auth} (${TOKEN.slice(4)})` })
+      const r = await adaptador().aplicar(migracao())
+      expect(r.ok).toBe(false)
+      if (!r.ok) {
+        expect(r.mensagem).not.toContain(TOKEN)
+        expect(r.mensagem).not.toContain(TOKEN.slice(4))
+        expect(r.mensagem).toContain('***')
+      }
+      const e = await adaptador().listarAplicadas().then(() => null, (x: Error) => x.message)
+      expect(e).toBeTruthy()
+      expect(e).not.toContain(TOKEN.slice(4))
+      expect(supa!.mascarar(`a ${TOKEN} b sbp_EXEMPLO_REMOVIDO`, [TOKEN])).toBe('a *** b ***')
+      // a credencial é lida do arquivo do repo, pelo nome; a falta não mostra valor nenhum
+      const raiz = mkdtempSync(join(tmpdir(), 'mig-cred-'))
+      writeFileSync(join(raiz, '.env.local'), `OUTRA=segredo-que-nao-pode-vazar\nexport SUPABASE_ACCESS_TOKEN="${TOKEN}"\n`)
+      expect(supa!.lerCredencial(raiz, '.env.local', 'SUPABASE_ACCESS_TOKEN')).toBe(TOKEN)
+      let msg = ''
+      try {
+        supa!.lerCredencial(raiz, '.env.local', 'NAO_TEM')
+      } catch (x) {
+        msg = (x as Error).message
+      }
+      expect(msg).toMatch(/NAO_TEM.*\.env\.local/)
+      expect(msg).not.toContain('segredo')
+      expect(msg).not.toContain(TOKEN)
+    })
+
+    it('ORQ_TESTE=1 só fala com 127.0.0.1; sem ele, só com a API oficial', () => {
+      expect(supa).not.toBeNull()
+      expect(supa!.baseDaApi()).toBe(base)
+      const t1 = comEnv({ ORQ_TESTE: '1', ORQ_MIGRATIONS_API: '' })
+      try {
+        expect(() => supa!.baseDaApi()).toThrow(/ORQ_TESTE=1/)
+      } finally {
+        t1()
+      }
+      const t2 = comEnv({ ORQ_TESTE: '', ORQ_MIGRATIONS_API: base })
+      try {
+        expect(() => supa!.baseDaApi()).toThrow(/api\.supabase\.com/)
+      } finally {
+        t2()
+      }
+      const t3 = comEnv({ ORQ_TESTE: '', ORQ_MIGRATIONS_API: '' })
+      try {
+        expect(supa!.baseDaApi()).toBe('https://api.supabase.com')
+      } finally {
+        t3()
+      }
+    })
+  })
+})
````

## 6. Perguntas abertas

1. O primeiro `linha-base` com `--herdados-desde 20261004` é o que você quer? Ele deixa os 31
   antigos fora do plano (só contados). Sem o piso, nenhum herdado aparece.
2. O `20261007190900` (ticket 900) entra com `--token humano:migration-900-aplicada`, ou ele
   ainda espera decisão (fecha leitura anon, ticket sem dependente)?
3. O dashboard-comercial tem 93 arquivos em `supabase/migrations`, mas o drift de outubro
   (`20261006_webinar_*`, `plano_metas_*`) não está nessa pasta. Vale procurar em `migrations/` e
   `sql/` dele e pôr outra entrada `somente_leitura` com esse `dir`? Hoje o bloco aceita um
   `dir` por entrada; dá para repetir o repo com outro `dir`, mas a validação recusa o mesmo
   caminho duas vezes. Se for o caso, a próxima etapa aceita uma lista de `dir`.
4. Fica para a frente do Comarka (E8): trocar a skill e o `banco.md`, e apontar o
   `checar-promocao.py` para ler o ledger com `created_by`.

---

## Anexo A. PASSO 0 (entregue antes do código) e respostas do chat

As respostas do chat do Orquestrador, que valem por cima das perguntas abaixo:
- C2 confirmado (txid igual), sonda obrigatória por banco;
- C1/C4: as colunas sem default nem trigger; o insert grava `version, name, statements, created_by`;
- E3: produção em `producao-migrations.tsv`;
- E1 bloco de topo;
- E2 opção (b);
- E4 `database/query`;
- E5 recusa com `pausar_file`, `.orq-pause` ou liberação modificada;
- E6 `por: lucas` com a nota;
- E7 nunca push;
- E8 frente do Comarka.


Sessão: worktree `~/Projetos/_worktrees/kit-mig-a`, branch `kit/mig-a`, HEAD `0917131` (= main do kit).
`node_modules` é symlink para o do checkout principal. Nenhum código escrito, nenhum commit, nenhum
banco tocado, nenhum valor de segredo lido (do `.env.local` só os nomes). A parte C usou a documentação
pública: o OpenAPI da API de gestão (`api.supabase.com/api/v1-json`), o código da CLI e o do servidor MCP do Supabase.

**Parei aqui. Espero a sua confirmação das peças (seção D) e das perguntas (seção E) antes de escrever código.**

---

## A. Kit: como o resolvedor lê, resolve, espera, commita e grava

| O quê | Onde | Como |
|---|---|---|
| Caminho do repos.json | `triador/saida.ts:29-31` | `ORQ_REPOS` ou `~/.orq/repos.json` |
| Lista de repos | `triador/saida.ts:39-53` | `.repos[]`: string ou `{caminho, nome?}`, `~` expandido. Nome padrão = nome do diretório; nome repetido ganha `-2`. Chave de topo desconhecida é ignorada. |
| Campos extras por item | `resolvedor/modos.ts:82-123` | `itensCrus()` relê o JSON e pareia **por índice** com `lerRepos()`, filtrando quem não tem caminho. Assim se lê `resolvedor`, `pausa_gate` e `pausa_donos`. |
| Resolver `<repo>` da CLI | `modos.ts:129-135` | `acharRepo`: primeiro por nome, depois pelo caminho resolvido. Fora do repos.json vira um repo "diagnostico". |
| Regravar o repos.json | `modos.ts:141-152` + `caminhos.ts:60-69` | `gravarModo`: lê, troca um campo e grava com `GuardaResolvedor.escrever` (tmp + rename). |
| Guarda de escrita fora do repo | `resolvedor/caminhos.ts:39-99` | Toda escrita resolve o caminho real e **lança exceção** se cair fora de `ORQ_RESOLVEDOR_DIR` (`~/.orq/resolvedor`) ou dentro de qualquer repo. A única exceção é o próprio repos.json. Também tem `criarExclusivo` (O_EXCL). |
| Interruptor | `caminhos.ts:29`, `job.sh:11-17` | `~/.orq/RESOLVEDOR_PAUSADO` (ou env): existindo, nada roda. |
| Trava global | `caminhos.ts:101-129` | `resolver.lock` com O_EXCL. Fica órfã depois de 15 min. |
| Esperar o git ficar livre | `resolvedor/repo.ts:142-162` | `gitRodando` procura `index.lock`/`HEAD.lock` no git dir e roda `pgrep -x git` (`ORQ_RESOLVEDOR_PGREP` nos testes). `esperarGit` repete a cada 250 ms até `ORQ_RESOLVEDOR_ESPERA_GIT_S` (60 s). |
| Commit de um arquivo só | `repo.ts:166-202` | `gitEscrita` só aceita `commit`, nunca `--no-verify`/`-n`. Roda `git commit --only -q -m <msg> -- <rel>`. Se o commit falha, o arquivo volta ao conteúdo de antes. Depois confere que o commit tem 1 arquivo e o pai certo; se não tiver, avisa alto e não desfaz. Trailer em `repo.ts:164`: `Orq-Resolvedor: …`. |
| Amarra ao ticket | `repo.ts:45-55` (`confereTicket`) | O `escreverEComitar` só aceita `docs/fila/<id>-*.md`. **Ele não serve como está para o arquivo de liberação**: precisa de uma porta irmã (ver P4). |
| Leitura de git | `triador/git.ts:15-37` | `gitLeitura` com `GIT_OPTIONAL_LOCKS=0`. Só aceita os verbos `show`, `log`, `rev-parse`, `ls-tree` e `status --porcelain`. |
| Ledger | `resolvedor/ledger.ts:31-52` | `~/.orq/resolvedor/ledger.jsonl`: uma linha JSON por fato `{ts, tipo, repo, …}`, só acrescentada, passando pela guarda. Linha cortada é ignorada na leitura. |
| Despacho no `orq` | `scripts/orq:107-114` | `resolver` e `desfazer` despacham **antes do lib.sh**: o tsx do checkout principal roda `resolvedor/cli.ts`. É o molde do `orq migrations`. |
| Job | `resolvedor/job.sh`, `instalar-job.sh:13-16` | Roda do checkout principal do kit (`CHECKOUT` = o do script). |

**`orq liberar` e `liberacao_ok`**
- `scripts/orq:440-448` → `liberar-cli.ts:51-90`. A função `liberar()` é pura: exige o prefixo `humano:` e `RE_TOKEN` `^humano:[a-z-]+-[0-9A-Za-z-]+$` (`liberacoes-core.ts:42`), exige o arquivo em v2 (`ehV2`, `:78`, que recusa arquivo com `.liberadas`) e recusa duplicata nas duas listas (`jaLiberado`, `:245`). Grava `{token, liberado_em, por, nota?, origem:'v2'}` em `.tokens[]`. **Não commita.**
- `lib.sh:603-659`, `liberacao_ok`: primeiro a forma canônica (`.tokens[]` com o token inteiro, string ou objeto); depois a forma legada, que junta `.tokens[]` e `.liberadas[]` e tira o `humano:` dos dois lados, com AVISO no log.
- **Consequência:** o `orq liberar` do kit **recusa** o `liberacoes.json` do Comarka, porque ele tem `.liberadas` e não tem `$schema_versao: 2`. O aplicador precisa escrever no formato do próprio repo, como a sessão pede.

**`migrations.*` no config** (`config-chaves.ts:102-104`): `migrations.dir`, `migrations.faixa` e `migrations.faixas_reservadas` são opcionais e só ligam a regra B do enforcement (`enforcement-core.ts:273`), a cobrança de `.sql` por faixa. Moram no `000-config.json` do repo. O aplicador não as usa: a config dele mora no `~/.orq/repos.json`, e o 000-config dos repos fica intocado. O nome `migrations` no repos.json não conflita com elas, porque o arquivo é outro, mas deixo isso registrado para quem ler.

**repos.json real hoje**: `$schema_versao: 1`, três itens (conteudos-infinitos, actus-saas, comarka-operacional). **O dashboard-comercial não está nele.** Se ele entrar em `.repos[]`, o resolvedor (`passada.ts`) e o painel passam a varrer esse repo, que nem tem `docs/fila`. Daí a proposta de bloco de topo da P1.

## B. Comarka (só leitura)

**Skill `aplicar-migration-ddl`** (lida inteira, 39 linhas). Ordem: (0) C0 e `checar-promocao.py --aplicar <arquivo>`; se a migration só existe na staging, `git show origin/staging-auto:<arq> > /tmp/x.sql` e roda o checar nesse arquivo; sem credencial, bloqueia. (1) Mostra o SQL. (2) Roda `apply_migration` depois do ok. (3) `update schema_migrations set version='<do arquivo>' where version='<a que o MCP gravou>' and name=…`, conferindo antes que a versão do arquivo está livre. (4) `list_migrations` mostra a versão do arquivo e nenhuma versão nova sem arquivo. (5) `scripts/roadmap/liberar.py`. Decisão de 17/10: o nome do arquivo é a versão canônica, nunca se renomeia arquivo.

**`checar-promocao.py`** (507 linhas)
- Linhas 38-52: `SNAPSHOT_SQL`, uma query só com colunas, funções, índices únicos e `ledger` (`select version from schema_migrations`).
- Linhas 243-275, `snapshot()`: tenta, nesta ordem, `PROMOCAO_SCHEMA_JSON` (teste), `SUPABASE_DB_URL` + psql, e `SUPABASE_ACCESS_TOKEN` → `POST https://api.supabase.com/v1/projects/{ref}/database/query` com `{"query": …}` e `Authorization: Bearer`, timeout de 60 s. O `ref` vem de `supabase_project_id` no 000-config (`ogfnojbbvumujzfklkhh`) ou de `NEXT_PUBLIC_SUPABASE_URL`. `_env` (`:225`) lê o ambiente e depois o `.env.local`.
- `--classificar` (`:472-481`): **sem banco**. Imprime `{arquivo: {fase, declarada, destrutivos, erro}}`; rc 1 se houver erro.
- `--aplicar` (`:417-452`, `:487-495`): **lê o banco** (snapshot). Expansão → OK. Contração → BLOQUEIA se algum código vivo (`origin/main`, `origin/staging-auto`, `origin/staging-apolo`) ainda usa um índice único que ela derruba. rc 1 em BLOQUEIA, inclusive com o banco indisponível. O caminho é `os.path.join(repo, caminho)`, então um caminho absoluto de um arquivo extraído funciona.
- Os `DESTRUTIVOS` de `:87-95` (drop, set not null, troca de tipo, rename, revoke, truncate, delete) servem de régua para o aviso de classe da P4.

**`docs/fila/liberacoes.json`** (formato real de hoje)
- Chaves: `descricao`, `_schema`, `_pendentes_ddl`, `pendentes_ddl: {}`, `liberadas` (**324 objetos**, todos `{token, em, por, nota}`) e `tokens: []` (vazia). Não tem `$schema_versao`.
- `_schema` diz: "fonte única = .liberadas; NUNCA voltar a escrever em .tokens".
- O token vai **sem** `humano:`. Formato de migration: `migration-<id-do-TICKET>-aplicada` (ex.: `migration-5242-aplicada`). **O id é do ticket SQL, não a versão do arquivo.**
- Quem lê `.liberadas[]`: `scripts/orquestrador/lib.sh:154-158` do próprio Comarka (`liberacao_ok`, igualdade exata e só `.liberadas`; `CFG_LIBERACOES` = `$MAIN_CHECKOUT/…`, linha 64, **o arquivo local do checkout principal**), `fila-read.ts:73-75`, `orq-painel.py:199`, `roadmap/prontos.py:21`, `roadmap/estado-plano.py:42-48` (lê também `.tokens`), `.claude/hooks/guarda-ferramenta.py:116-127` (`tokens_publicados`: **só a origin/main**, para os tokens `c0-migration-*`) e `orq-server.py:865` (`tokens_liberados`: varre toda lista do topo).
- Quem lê `.tokens[]`: só `estado-plano.py` e `orq-server.py`. Quem escreve: `roadmap/liberar.py` (16 linhas: acrescenta em `.liberadas` com `por: "lucas"` fixo e `em` = hoje, recusa duplicata).
- O `.githooks/pre-commit` ignora `liberacoes.json` (só valida arquivo de ticket).
- `docs/fila/apolo/` (167 tickets) usa o mesmo `liberacoes.json` (só existe um `liberacoes_file`).

**`.claude/rules/banco.md`** (61 linhas)
- O banco é compartilhado com o dashboard comercial. C0 é zero escrita (lista na linha 14; prefixos `trafego_*`, `vw_*`).
- Linhas 33-34: "Nunca aplique migration… única exceção: a skill".
- Linhas 36-38: nome do arquivo = versão canônica, `AAAAMMDDHHMMSS` única e livre no ledger.
- Linhas 39-42: `SECURITY DEFINER` revoga anon/authenticated.
- Linhas 44-58: expansão e contração com `-- fase:` e `-- depois-de:`, e `checar-promocao.py --aplicar` antes de uma contração.

**`.claude/rules/fila.md:32-35`**: o `.sql` declara a fase; o código que usa schema novo depende de `humano:migration-<id>-aplicada` da **expansão**, nunca só do id do ticket SQL; a contração depende do ticket de código. Na linha 42: liberação por `liberar.py`. Nas linhas 37-38: `docs/fila/.orq-pause` com motivo ritual ou promoção congela main e staging-auto, ninguém commita nelas.

**Fatos medidos que mudam as peças**
1. **77 de 77 migrations com versão de 16/10 em diante têm `begin;` … `commit;` próprios** (130 de 253 no total). Nenhuma tem `CONCURRENTLY` ou `VACUUM`. Recusar todo `begin`/`commit` recusaria todas as migrations recentes. Ajuste na P2.
2. **76 de 77 dessas migrations citam o próprio token no cabeçalho** (`humano:migration-<id>-aplicada`). Dos 6 pendentes, 5 citam; `20261007190900_churn_fecha_leitura_anon` não cita. É assim que o aplicador acha o token: lendo o arquivo.
3. **5 dos 6 pendentes só existem nas stagings**: 2 em `origin/staging-apolo` e 3 em `origin/staging-auto`. Só `20261007190900` está na main. Então o aplicador precisa ler arquivo de refs git, e não só da árvore de trabalho.
4. Nenhum dos 5 tokens (5199, 5215, 1332, 1337, 1363) está liberado. Fila e ledger estão coerentes.
5. Há versões de 8 dígitos (`20260612_*`, várias por dia) e uma versão de 14 dígitos repetida (`20260817000000`), todas abaixo de qualquer linha de base de outubro. O dashboard-comercial usa **só** o prefixo `AAAAMMDD_` (93 arquivos em `supabase/migrations`, mais `migrations/` e `sql/`). Ali a versão não é única, e o casamento tem de ser pelo nome.
6. Nomes no `.env.local`: o Comarka **tem** `SUPABASE_ACCESS_TOKEN`; o dashboard-comercial **não tem** (tem `SUPABASE_SERVICE_ROLE_KEY` e `SUPABASE_FTMTMZ_DB_URL`). Isso combina com `somente_leitura` para o dashboard.
7. O recon não guardou as 491 linhas de produção, só os agregados (`cruzamento-producao.md`). O drift de outubro aparece por grupo ("webinar_* (18)"), sem os nomes. Isso afeta a fixture da P3 (pergunta E3).

## C. `supabase_migrations.schema_migrations` e o `apply_migration`

**Confirmado na fonte pública**
- **CLI** (`supabase/cli`, `apps/cli-go/pkg/migration/history.go:15-24`): `CREATE TABLE … (version text NOT NULL PRIMARY KEY)`, mais `ADD COLUMN IF NOT EXISTS statements text[]` e `name text`. O insert da CLI é `INSERT INTO supabase_migrations.schema_migrations(version, name, statements) VALUES($1,$2,$3)`. A CLI aplica em batch (`apply.go:72`).
- **API de gestão** (OpenAPI):
  - `GET /v1/projects/{ref}/database/migrations` devolve `[{version, name?}]`.
  - `POST /v1/projects/{ref}/database/migrations` ("Apply a database migration") recebe o corpo `{query (obrigatório), name?, rollback?}` e o header opcional `Idempotency-Key`. **Não tem campo `version`.**
  - Também existem `PUT` (upsert sem aplicar), `DELETE ?gte=` (rollback) e `PATCH {name, rollback}`.
  - A resposta de leitura de uma migration (`V1GetMigrationResponse`) tem `version, name, statements[], rollback[], created_by, idempotency_key`, ou seja, as colunas `created_by`, `idempotency_key` e `rollback` existem do lado da plataforma.
  - `POST /v1/projects/{ref}/database/query` recebe `{query, parameters?, read_only?}`, está marcado como **experimental/beta** e responde 201.
- **MCP** (`supabase-community/supabase-mcp`, `api-platform.ts`): `apply_migration` = `POST …/database/migrations` com `{name, query}`, sem `Idempotency-Key`. `list_migrations` = `GET …/database/migrations`. `execute_sql` = `POST …/database/query` com `{query, read_only}`.

**O que o `apply_migration` grava**: uma linha com `version` = hora da aplicação (bate com as 448 de 491 versões "hora da aplicação" do recon), o `name` passado e `statements` = o SQL. `created_by` e `idempotency_key` só podem ser preenchidos pela plataforma. Como a API não deixa escolher a versão, **o aplicador não pode usar o endpoint de migrations** para gravar a versão do arquivo: o desenho é o `database/query` com o SQL e o `insert` do ledger na mesma transação (P2).

**O que não consegui confirmar**
1. O DDL real da tabela neste projeto: se as colunas `created_by`, `idempotency_key` e `rollback` existem nela, de que tipo, e se têm default. Só tenho o schema da resposta da API. Proposta: o insert do aplicador usa só `version, name, statements`, o mínimo comum com a CLI.
2. **Se o `database/query` manda o texto inteiro como UMA mensagem Query do protocolo simples.** Se mandar, o Postgres roda as várias instruções como **uma transação implícita** (documentado no protocolo do Postgres) e um erro desfaz tudo. Se a API quebrar o texto em instruções ou usar o protocolo estendido, a atomicidade cai. A documentação da API não diz. Também não sei o que acontece com um `begin` explícito que falha no meio (a sessão fica abortada no pool?). Proposta: uma sonda só leitura, `orq migrations sonda <banco>`, que o Lucas roda **antes** do primeiro `aplicar`: `select set_config('orq.x', txid_current()::text, true); select current_setting('orq.x')::bigint = txid_current() as mesma_transacao;`. Ela grava o resultado em `~/.orq/migrations/<banco>.json`, e o `aplicar` recusa enquanto não houver `mesma_transacao: true`.
3. O formato exato da resposta de erro do `database/query` (status e corpo com a mensagem do Postgres) e o limite de tempo do lado do servidor. Os stubs dos testes vão assumir `4xx/5xx` com `{message}` e tratar qualquer outro formato como erro genérico.
4. Se a tabela tem default ou trigger que preencha `created_by` num insert direto.

---

## D. Peças ajustadas (arquivo e teto de linhas)

Diretório novo: `scripts/orquestrador/migrations/`. Testes em `test/orquestrador-migrations-*.test.ts` (vitest, `TZ=UTC`), com stub HTTP (servidor em `127.0.0.1` com porta aleatória) e repos git de fixture em tmp. Uma peça por commit, cada uma com o teste vermelho antes.

**P1 · Config por banco** — `migrations/config.ts` (≤160) + teste (≤200)
- **Ajuste:** um bloco **de topo** `migrations.bancos` no `~/.orq/repos.json`, em vez de um bloco por item de `.repos[]`. Motivo: o dashboard-comercial não está nem deve entrar em `.repos[]` (o resolvedor e o painel passariam a varrê-lo), e a decisão 5 é aplicador por banco. Os repos do loop são referenciados pelo nome do repos.json; os só leitura, por caminho.
  ```json
  "migrations": { "bancos": { "comarka": {
    "ferramenta": "supabase", "banco_id": "ogfnojbbvumujzfklkhh",
    "repos": [
      { "repo": "comarka-operacional", "dir": "supabase/migrations",
        "refs": ["HEAD", "origin/staging-auto", "origin/staging-apolo"],
        "credencial_env": "SUPABASE_ACCESS_TOKEN", "env_arquivo": ".env.local",
        "token": { "formato": "liberadas", "origem": "sql", "molde": "migration-{id}-aplicada" },
        "pre_check": ["python3", "scripts/roadmap/checar-promocao.py", "--aplicar", "{arquivo}"] },
      { "caminho": "~/Projetos/dashboard-comercial", "dir": "supabase/migrations", "somente_leitura": true }
    ] } } }
  ```
- O formato do token pode ser `liberadas` (Comarka: `{token sem prefixo, em, por, nota}` em `.liberadas`) ou `v2` (kit: a `liberar()` pura de `liberar-cli.ts`).
- O banco pode ter **no máximo um** repo que escreve; repo `somente_leitura` só conta para o plano e o drift.
- A validação diz o que falta em cada campo. Um `banco_id` repetido em dois blocos é recusado; dentro de um bloco ele agrupa repos.
- **Pronto quando:** a config real do Comarka e do dashboard (somente_leitura) valida em fixture; dois repos no mesmo banco agrupam; erro de config tem mensagem por campo.

**P2 · Adaptador supabase** — `migrations/supabase.ts` (≤220) + `migrations/sql.ts` (≤120) + teste (≤280)
- `listarAplicadas(banco)` → `GET /v1/projects/{ref}/database/migrations` (`version`, `name`).
- `aplicar(sql, versao, nome)` → `POST /v1/projects/{ref}/database/query` com um texto só:
  `select set_config('lock_timeout', '5s', true); select set_config('statement_timeout', '60s', true); <sql sem envelope>; insert into supabase_migrations.schema_migrations(version, name, statements) values (<versao>, <nome>, array[<sql>]);`
  - Os literais vão em dollar-quote com uma etiqueta aleatória que não aparece no SQL. O `parameters` não serve com várias instruções.
  - Transação **implícita** (sem `begin` explícito), condicionada à sonda (C2).
  - O `nome` é o do arquivo sem o prefixo numérico.
- **Ajuste nas recusas:** o arquivo pode ter **um** envelope `begin;` como primeira instrução e `commit;` como última (depois de tirar os comentários), e o aplicador o remove. Qualquer outro `begin`/`start transaction`/`commit`/`end`/`rollback`/`savepoint`, `CONCURRENTLY`, `VACUUM` ou `ALTER SYSTEM` é recusado com "use a skill".
- Timeout HTTP explícito (AbortController, 120 s). **Timeout ou resposta ilegível = estado incerto**: não emite token, grava `incerto` no ledger e o próximo `status` reconcilia pela lista de aplicadas.
- A credencial é lida do `env_arquivo` do repo pelo nome configurado, só dentro do adaptador. Todo texto que sai (log, erro, ledger, stdout) passa por `mascarar()`, que troca o valor exato e o padrão `sbp_[A-Za-z0-9]+` por `***`.
- Mais `sonda(banco)` (C2).
- **Pronto quando:** os stubs cobrem sucesso, erro do Postgres, timeout (incerto), resposta ilegível, recusa por `begin` interno, `CONCURRENTLY` e `VACUUM`, envelope aceito e removido, e o token mascarado em todo log, erro e linha de ledger (o teste procura o valor do token falso em toda saída capturada).

**P3 · Linha de base e plano** — `migrations/plano.ts` (≤220) + teste (≤220) + fixture `test/fixtures/migrations/`
- `orq migrations linha-base <banco> [--corte <versao>]` grava `~/.orq/migrations/<banco>.json` com `{criado_em, corte, aplicadas: [{version, name}]}`. `corte` padrão = a maior versão de produção naquele momento.
- **Plano:** um arquivo de um repo do banco, lido nos `refs` (via `gitLeitura ls-tree/show`) e na árvore, com versão > `corte` e sem linha no ledger que case por versão **ou** por nome, é **pendente**. Se o mesmo arquivo tem conteúdo diferente entre refs, ele fica marcado e o `aplicar` o recusa. Ordem por versão. Uma linha de produção com versão > `corte` sem arquivo que case em nenhum repo do banco é **drift**.
- **Pronto quando:** com corte `20261004…`, a fixture dá os 6 pendentes e os 29 de drift de outubro; com o corte de hoje, zero de drift e o que a pergunta E2 decidir para os pendentes.

**P4 · `orq migrations status|plano|aplicar|linha-base|sonda`** — `migrations/cli.ts` (≤200) + `migrations/aplicar.ts` (≤240) + `migrations/liberacao.ts` (≤160) + `migrations/caminhos.ts` (≤90) + despacho em `scripts/orq` (≈+12, antes do lib.sh, como o `resolver`) + testes (≤400)
- `aplicar <repo> <arquivo> [--token <t>]`. Recusa:
  - sem TTY;
  - com `~/.orq/MIGRATIONS_PAUSADO`;
  - com `ORQ_TESTE=1` e URL que não seja `127.0.0.1`;
  - com o arquivo fora do plano ou divergente entre refs;
  - sem sonda verde;
  - repo `somente_leitura`;
  - token não achado no cabeçalho do SQL nem dado por `--token`, ou mais de um token `humano:migration-*-aplicada` no arquivo;
  - token já liberado;
  - repo com o `pausar_file` dele (E5).
- Passos:
  1. Trava por banco em `~/.orq/migrations/<banco>.lock` (O_EXCL, com pid; órfã quando o pid não existe).
  2. Se o `pre_check` existe, roda no repo com `{arquivo}` = caminho absoluto de uma cópia extraída do ref; rc ≠ 0 para tudo.
  3. Mostra o SQL inteiro, o ref de origem e o aviso de classe (regex: `DROP`, `TRUNCATE`, `DELETE`, `RENAME`, `GRANT`, `REVOKE`, `POLICY`, `SECURITY DEFINER`, `ALTER COLUMN`, `SET NOT NULL`; só aviso).
  4. Pede a versão digitada.
  5. Aplica.
  6. Confere em `listarAplicadas` que a versão entrou com o nome certo; se falhar, não emite token.
  7. Emite o token no formato do repo pela porta irmã de `repo.ts`: o mesmo `esperarGit`, o `git commit --only -- <liberacoes_file>`, nunca `--no-verify`, desfaz o arquivo se o commit falhar, confere que o commit tem um arquivo só, e usa o trailer `Orq-Aplicador: <banco> <versao> <arquivo>`. Para isso, `repo.ts` ganha uma função genérica (`comitarUmArquivo`) e o `escreverEComitar` passa a chamá-la, com o comportamento dele inalterado e coberto pelos testes de hoje.
  8. Grava `~/.orq/migrations/ledger.jsonl`, que só aceita acréscimo, pela guarda generalizada (`GuardaResolvedor` com a raiz por parâmetro).
- `status` e `plano` são só leitura; `plano` imprime pendentes, drift e o token de cada pendente.
- **Pronto quando:** cada recusa tem teste; a trava concorrente (dois processos, um recusa); `pre_check` vermelho para antes de aplicar; conferência que falha não emite token; o commit tem só `docs/fila/liberacoes.json`; replay com a cópia real do `liberacoes.json` do Comarka (324 entradas) acrescenta exatamente uma entrada `{token, em, por, nota}` em `.liberadas` e deixa `.tokens: []` e as outras chaves byte a byte.

**P5 · Documentação** — `CONTRATO.md` §19 "Aplicador de migrations" (≤140 linhas), `docs/PECAS.md` seção "Etapa MIG-A" (≤60), `CHANGELOG.md` (≤25), `docs/aplicador-migrations.md` (manual: como fazer a linha de base, rodar a sonda, aplicar, pausar e reconciliar o incerto, e o que o aplicador nunca faz; ≤150).

Fechamento como pede a sessão: `npx tsc --noEmit`, `TZ=UTC vitest`, `test-shell.sh`, `test-instalar.sh`, com saída crua e rc travando.

## E. Perguntas abertas (preciso das respostas antes do código)

1. **Bloco de topo ou por item?** Proponho `migrations.bancos` no topo do repos.json (P1), para não colocar o dashboard-comercial em `.repos[]`. Confirma?
2. **Linha de base de hoje e os 6 pendentes.** Com o corte = maior versão de produção agora (≈ 20261018…), `20261019000100_nps_fila_sai_chave_notion` fica **acima** do corte e continua pendente, e os outros 5 somem do plano **sem terem sido aplicados**: viram dívida invisível. O critério "zero de ambos com a de hoje" só fecha se for isso que você quer. Opções:
   - (a) corte = maior versão de produção, e quem fica abaixo dele sem aplicar é problema da skill;
   - (b) a linha de base grava também os arquivos já existentes sem linha no ledger como `pendentes_herdados`, e o plano os mostra numa seção à parte (aplicáveis pelo aplicador);
   - (c) corte explícito `--corte 20261004000000`, e os 6 continuam pendentes.
   Recomendo (b).
3. **Fixture com os números reais.** O recon não guardou as 491 linhas de produção, só os agregados, e os 29 de drift vêm por grupo (os 18 `webinar_*` sem nome). Você exporta `select version, name from supabase_migrations.schema_migrations order by version` para um arquivo em `~/orq-sessoes/recon-migrations/` (você roda; eu não conecto)? Ou aceito nomes sintéticos com as contagens reais (6 e 29) e as versões dos 6 pendentes reais?
4. **Atomicidade do `database/query`** (C2). Aceita a sonda obrigatória antes do primeiro `aplicar`, ou prefere outro desenho (ex.: `POST …/database/migrations` + `PATCH`/`update` da versão, que é o que a skill faz hoje em dois passos)?
5. **Pausa do repo.** Se existe `docs/fila/.orq-pause` (ritual ou promoção congela main), o aplicador recusa antes de aplicar (minha proposta), ou aplica e só adia o commit do token?
6. **`por` do token no Comarka.** O `liberar.py` grava `"por": "lucas"`. O aplicador grava `por` = `$USER` de quem digitou a confirmação e põe na nota "aplicador do kit, versão X, arquivo Y, ref Z". Confirma?
7. **Push do token.** O loop do Comarka lê o `liberacoes.json` **local** do checkout principal (`lib.sh:64`), então o commit local já destrava a fila. A guarda `guarda-ferramenta.py` só conta tokens da `origin/main`, mas só para `c0-migration-*`. O aplicador nunca dá push. Confirma que o push continua no ritual?
8. **Fora do kit.** A skill e `banco.md:33-34` do Comarka continuam mandando aplicar por MCP. O kit não escreve no Comarka, então a troca para `orq migrations aplicar` fica para uma frente do Comarka depois do merge. Confirma que é assim?

## 7. Rebase sobre a main `f592745` (8a e 8b) — novo HEAD `908f2a1`

`git rebase main` no worktree `kit-mig-a`, branch `kit/mig-a`. Nada de push nem merge.

**Novo HEAD:** `908f2a1f82b4cf2f9b76bbfc2bec15ea51797fb3`

```
908f2a1 MIG-A P5: CONTRATO §20, PECAS etapa MIG-A, CHANGELOG e manual do aplicador
```

SHAs antigos → novos: P1 `662e074`→`a69698d`, P2 `b32d262`→`7031a2e`, P3 `16c84b5`→`63cb9b7`, P4 `c7539bd`→`6cdcb62`, P5 `e1d48be`→`908f2a1`. CHANGELOG e `docs/PECAS.md` já citam os novos. Nas seções 1 a 6 acima, leia "CONTRATO §19" (da MIG-A) como **§20** e os SHAs pelos novos.

### 7.1 Conflitos e como ficaram

- **`scripts/orquestrador/resolvedor/repo.ts` (no P4; não estava previsto).** A 8b-2 pôs a checagem de branch (`branchEsperada`, `branch_inesperada`) dentro de `escreverEComitar`, no mesmo trecho que a MIG-A tinha movido para `comitarUmArquivo`. Resolução: `comitarUmArquivo` ganha um parâmetro opcional `esperada` (depois de `oQue`); com ele, confere o checkout depois da releitura e da igualdade com `antes`, como na 8b. `escreverEComitar` sempre passa `branchEsperada(raiz, branch)`, então o resolvedor fica igual à main. **O aplicador não passa `esperada`: o commit do token de liberação não confere branch.** Isso mantém o comportamento da MIG-A como estava; se o commit do token também deve seguir a regra de branch da 8b, é uma decisão sua (e uma peça com vermelho antes). Anotado no CHANGELOG.
- **`CONTRATO.md`.** As duas seções, a da 8b primeiro (§19, intocada), a do aplicador renumerada para **§20** (títulos `## 20.` e `### 20.1`–`20.6`; nenhuma referência interna `§19.x` existia nela).
- **`CHANGELOG.md`.** As duas entradas, a da 8b primeiro; a da MIG-A cita CONTRATO §20, os SHAs novos e a nota do `repo.ts`.
- **`docs/PECAS.md`.** Mesclou sozinho (a 8b em FEITAS/PENDENTES, a MIG-A na seção própria depois, então a 8b já vem primeiro). Na seção ETAPA MIG-A, `§19.x`→`§20.x` e os SHAs novos.
- **`docs/aplicador-migrations.md`.** "Contrato completo: `CONTRATO.md` §20."
- **Mensagem do P5.** Emendada para "CONTRATO §20" (título e corpo); o conteúdo do commit não mudou com a emenda.

### 7.2 As quatro suítes no HEAD `908f2a1`, cruas

#### 7.2.1 `npx tsc --noEmit` — rc=0

```
(sem saída)
```

#### 7.2.2 `TZ=UTC node_modules/.bin/vitest run` — rc=0

```

 RUN  v2.1.9 /Users/lucasantos/Projetos/_worktrees/kit-mig-a

 ✓ test/orquestrador-enforcement-actus.test.ts (104 tests) 24ms
 ✓ test/orquestrador-enforcement.test.ts (47 tests) 27ms
 ✓ test/orquestrador-prevoo.test.ts (35 tests) 12ms
 ✓ test/orquestrador-liberar-migrar.test.ts (37 tests) 3144ms
   ✓ migrar-liberacoes: --dry-run, .bak e rodar duas vezes > o resultado da migração PASSA no leitor do motor: todo token resolve 391ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > libera, sai 0 e o arquivo passa a ter o token 610ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > o token liberado DESTRAVA o ticket que dependia dele 576ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > duplicata: rc 1, RECUSADO, e o arquivo NÃO muda 630ms
   ✓ orq liberar: pelo `scripts/orq`, num repo de fixture > arquivo em v1: recusa e manda migrar, sem tocar em nada 310ms
 ✓ test/orquestrador-decisao.test.ts (39 tests) 8ms
 ✓ test/orquestrador-triador-aceite.test.ts (12 tests) 4481ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) as respostas gravadas, da mesma assinatura, reproduzem o placar da corrida real, com o 346d firme (7f-b3): 22/37 705ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) todo descarte da resposta do modelo grava modelo.descartado (regra e trecho) e aparece no placar 719ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) os 6: o CLI cortou no teto do caso depois de pagar; o custo real entra no placar e nenhuma resposta existe para recuperar 722ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) com a regra de evidência equivalente: dos 7 "classe certa, evidência fora" (o 346d saiu na 7f-b3), 6 valem; o 741 não (sem artefato da falta) 904ms
   ✓ aceite (C) do triador, em replay da corrida real da peça 6 (7f-b1b) > (C) aceite ≥ 30/37 (spec 7f-a §7.2): ainda não; 28/37 com a regra de equivalência, sem a mini-corrida 959ms
 ✓ test/orquestrador-gate-ticket.test.ts (44 tests) 5356ms
   ✓ a CLI é o contrato que `orq validar` repassa > sem violação: rc 0 e nenhuma linha 417ms
   ✓ a CLI é o contrato que `orq validar` repassa > com violação: rc 1 e uma linha `<arquivo>:<campo> <mensagem>` 417ms
   ✓ a CLI é o contrato que `orq validar` repassa > --relatorio: imprime tudo, conta as isenções à parte e sai 0 mesmo com violação 477ms
   ✓ a CLI é o contrato que `orq validar` repassa > --pendentes pega SÓ os pendentes 456ms
   ✓ a CLI é o contrato que `orq validar` repassa > por id e por caminho: os dois alcançam o mesmo ticket 976ms
   ✓ a CLI é o contrato que `orq validar` repassa > id que não é da fila: rc 2, e a mensagem diz qual fila foi olhada 458ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > rc 1 e a linha de violação, chamado PELO symlink 564ms
   ✓ peça 1d · chamado por caminho com symlink, o gate RODA > pelo symlink e pelo caminho real, a MESMA saída 1103ms
stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > actus-saas: em TODO ticket migrado, só o bloco muda
actus-saas: 0 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > comarka-operacional: em TODO ticket migrado, só o bloco muda
comarka-operacional: 3 ticket(s) migrados

stdout | test/orquestrador-migrar-tickets.test.ts > a prosa não se move UM BYTE > conteudos-infinitos: em TODO ticket migrado, só o bloco muda
conteudos-infinitos: 0 ticket(s) migrados

 ✓ test/orquestrador-migrar-tickets.test.ts (32 tests) 139ms
 ✓ test/orquestrador-triador-modelo.test.ts (13 tests) 6040ms
   ✓ modelo do triador, com stub (peça 5) > orq triar <repo> <id>: extração + modelo (stub), resumo, e uma chamada por assinatura 1136ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture (a corrida da peça 6): 21 chamadas no teto de US$ 6,60, 9 no de US$ 3,00, nada na fixture, rerodar não paga 2445ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --fixture --casos a,b: só os casos pedidos (a mini-corrida); caso que não existe é erro, sem chamada 996ms
   ✓ modelo do triador, com stub (peça 5) > orq triar --passada não chama modelo e promove R5? a R5 quando o vizinho de outra família aparece (760) 1107ms
 ✓ test/orquestrador-refatiar.test.ts (39 tests) 6173ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > diff acima do cap: refatiar, contaComoRetry false 353ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > arquivo fora da allowlist (enforcement): refatiar 351ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > zona proibida entra pelo MESMO campo — é a barreira que classifica 377ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > refatiar NÃO gera retry (o plano diz deveTentar=false) 351ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: falha de MÉRITO com o mecânico verde segue reprovando e gerando retry 781ms
   ✓ reprovação MECÂNICA vira refatiar, sem consumir retry > NEGATIVO: infra continua ADIANDO, e adiar vem ANTES de refatiar 420ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > status vira refatiar e a nota LISTA os arquivos 352ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a trilha registra REFATIAR com motivo= e arquivos= 342ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > origem humano vira UMA linha em decisoes-pendentes.md, com a pergunta certa 512ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > a mesma pendência duas vezes não vira duas linhas 865ms
   ✓ marca_refatiar: status, nota, evento, commit e decisão pendente > NEGATIVO: origem planejador NÃO gera decisão pendente (volta ao lote da frente) 350ms
   ✓ o retry recebe o JSON, não o texto livre > o CLI monta o JSON a partir do rundir de verdade 470ms
 ✓ test/orquestrador-migrations-supabase.test.ts (10 tests) 345ms
   ✓ P2: adaptador supabase > a API > 5xx, timeout e resposta ilegível são estado incerto 305ms
 ✓ test/orquestrador-toolchain-tsx.test.ts (30 tests) 6769ms
   ✓ lib.sh · tsx_bin resolve o binário UMA vez > tsx_local_ok responde pelo binário DO REPO, e é `test -x` 547ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação 341ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada) 309ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > não toca ticket nenhum, não cria lock e não reescreve o STATUS 317ms
   ✓ local-loop.sh · rodado de verdade num repo sem tsx > COM tsx no lugar, o guard passa e o loop segue para o kill switch 497ms
   ✓ cat.7 · toolchain > `orq prevoo` no fixture continua GO, com a cat.7 na saída 420ms
   ✓ instalar.sh · recusa repo sem tsx > --dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada 355ms
   ✓ instalar.sh · recusa repo sem tsx > com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D` 363ms
   ✓ instalar.sh · recusa repo sem tsx > com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx) 2165ms
 ✓ test/orquestrador-gates.test.ts (29 tests) 1253ms
   ✓ critérios do executor — strip de ANSI > saída COLORIDA casa o mesmo critério que a saída limpa 351ms
 ✓ test/doutrina-v2.test.ts (30 tests) 11ms
 ✓ test/orquestrador-gate-correcoes.test.ts (29 tests) 1635ms
   ✓ 7d1b-3 · check 10x: exemplo contra o padrão que o shell entrega; grep -v dispensa exemplo > os done do Actus que o 10x marcava (aspas escapadas, aspas concatenadas, filtro de comentário): nenhum achado 10x 491ms
 ✓ test/orq-cli.test.ts (42 tests) 6259ms
   ✓ orq pausar / retomar — kill switch em arquivo, nunca kill de processo > retomar remove o arquivo 316ms
   ✓ orq validar — o gate de ticket, com o rc repassado > fila limpa: rc 0 e nenhuma linha 395ms
   ✓ orq validar — o gate de ticket, com o rc repassado > ticket torto: rc 1, e a linha nomeia arquivo e campo 308ms
   ✓ orq validar — o gate de ticket, com o rc repassado > --relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar) 313ms
   ✓ orq validar — o gate de ticket, com o rc repassado > validar é READ-ONLY: o .md do ticket sai byte a byte igual 322ms
 ✓ test/orquestrador-juiz.test.ts (39 tests) 7821ms
   ✓ LIXO é adiado, nunca reprovado > o parse do CLI sai com rc 3 (o código que o executor lê como ADIADO) 415ms
   ✓ LIXO é adiado, nunca reprovado > a fronteira está no decisao.ts: juizIlegivel ADIA e NÃO conta retry 478ms
   ✓ LIXO é adiado, nunca reprovado > NEGATIVO: sem o campo, o mesmo sinal segue aprovando como antes 422ms
   ✓ modelo por classe de risco (custo-e-contexto §7) > o CLI devolve classe + modelo juntos (é o que o shell consome) 450ms
   ✓ ponta a ponta com --stub-juiz > veredito aprovado: JUIZ_APROVADO=true e evidência gravada 991ms
   ✓ ponta a ponta com --stub-juiz > o prompt gravado carrega o critério avaliador e o bloco anti-afrouxamento 863ms
   ✓ ponta a ponta com --stub-juiz > veredito reprovado: motivo e criterios_falhos ficam disponíveis para o retry 889ms
   ✓ ponta a ponta com --stub-juiz > lixo: ILEGIVEL=1, nenhum veredito.json, e o CRU continua lá para auditoria 930ms
   ✓ ponta a ponta com --stub-juiz > a trilha registra o veredito, a classe e o modelo, com attempt 1-based 929ms
   ✓ ponta a ponta com --stub-juiz > o risco sobe pelo objetivo e leva o modelo forte junto 880ms
   ✓ ponta a ponta com --stub-juiz > NEGATIVO: --dry sem --stub-juiz pula o juiz e não inventa veredito 569ms
 ✓ test/orquestrador-migrations-aplicar.test.ts (23 tests) 11429ms
   ✓ P4: orq migrations aplicar > caminho feliz: aplica, confere, e commita só o liberacoes.json com o trailer (replay no formato real) 949ms
   ✓ P4: orq migrations aplicar > herdado que só existe na staging: aplica do ref, e a nota diz o ref 442ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > arquivo fora do plano (já aplicado) e arquivo que não existe 485ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > arquivo com conteúdo diferente entre os refs 317ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > token: ausente, dois no arquivo, já liberado 804ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > --token explícito vale para o arquivo sem token, e é conferido contra o molde 695ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > pausar_file do repo, docs/fila/.orq-pause e liberacoes modificado na árvore 395ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > SQL recusado (begin no meio) 363ms
   ✓ P4: orq migrations aplicar > recusas (nada aplicado, nada escrito no repo) > confirmação errada 317ms
   ✓ P4: orq migrations aplicar > trava por banco: outro processo vivo segura, recusa; trava órfã, assume 550ms
   ✓ P4: orq migrations aplicar > pre_check: vermelho para antes de aplicar; recebe o .sql extraído; verde segue 1776ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > aplicou mas a linha não está no ledger: não emite token 324ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > erro do Postgres: não emite token, e o token não vaza do erro 310ms
   ✓ P4: orq migrations aplicar > a conferência decide o token > incerto sem a linha: não emite token; incerto com a linha: emite 943ms
   ✓ P4: orq migrations aplicar > a CLI > sem TTY de verdade: o orq recusa antes de qualquer rede 461ms
   ✓ P4: orq migrations aplicar > a CLI > sonda, linha-base (não sobrescreve sem --substituir), plano e status 503ms
 ✓ test/orquestrador-triador-saida.test.ts (6 tests) 3706ms
   ✓ saída do triador (peça 4) > num repo git de fixture: git status igual, mtimes iguais, nenhum index.lock, todo git com GIT_OPTIONAL_LOCKS=0 889ms
   ✓ saída do triador (peça 4) > mesma assinatura não roda duas vezes; assinatura nova manda o anterior para o histórico 1567ms
   ✓ saída do triador (peça 4) > cópia da evidência fora do repo, com o segredo mascarado 817ms
   ✓ saída do triador (peça 4) > trava O_EXCL: com a trava de pé não roda; órfã (> 10 min) é apagada e roda 384ms
 ✓ test/orquestrador-tools-derivadas.test.ts (32 tests) 8ms
 ✓ test/orquestrador-trilha.test.ts (22 tests) 3015ms
   ✓ o merge commit carrega o trailer, e o git o devolve > git log --grep acha o merge pelo trailer 467ms
   ✓ o merge commit carrega o trailer, e o git o devolve > NEGATIVO: o trailer é ancorado — 901 não casa 9012 469ms
   ✓ o prompt do executor cobra o trailer no commit do agente > o prompt montado nomeia o trailer e o id 301ms
   ✓ trilha e STATUS contam a primeira tentativa como 1 > a trilha REAL sai 1-based: o juiz na primeira tentativa registra attempt=1 562ms
 ✓ test/orquestrador-lock.test.ts (34 tests) 8ms
 ✓ test/orquestrador-resolvedor-pausa-gate.test.ts (8 tests) 442ms
 ✓ test/orquestrador-custo.test.ts (38 tests) 11459ms
   ✓ custo_registrar grava o consumo real da chamada > duas chamadas somam no mesmo dia, uma linha cada 348ms
   ✓ custo_registrar grava o consumo real da chamada > papel e ticket distinguem as chamadas (é o que o orq custo agrega) 331ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue com ledger corrompido: o executor é chamado 1846ms
   ✓ ledger ilegível nunca para a fila (fail-open com aviso) > a DRENAGEM segue sem ledger nenhum: o executor é chamado 1347ms
   ✓ mark_adiado_orcamento: adiado, não reprovado > ticket adiado até amanhã não é processável hoje 351ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o executor nunca é chamado 801ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > STATUS.md fica ocioso com MOTIVO orcamento 779ms
   ✓ teto do DIA encerra a drenagem em ocioso, MOTIVO orcamento > o ticket fica adiado, sem consumir tentativa, e a trilha registra 791ms
   ✓ teto por TICKET adia só aquele ticket e a fila segue > adia o 901 por orcamento_ticket e passa ao 902 1453ms
 ✓ test/orquestrador-triador-leitores.test.ts (6 tests) 443ms
 ✓ test/orquestrador-launchd-config.test.ts (15 tests) 641ms
 ✓ test/orquestrador-gate-comarka.test.ts (13 tests) 796ms
   ✓ 7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila > repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda 616ms
 ✓ test/orquestrador-causas-adiamento.test.ts (32 tests) 8ms
 ✓ test/orquestrador-contexto-juiz-fixtures.test.ts (8 tests) 3121ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (a)(d) o corpo INTEIRO do helper, com arquivo:linha, entra no prompt, lido da BASE 1095ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (b) helper definido no próprio diff não entra no bloco e aparece UMA vez; o de fora aparece no bloco, no MESMO prompt 1026ms
   ✓ 628 · run_juiz com teste novo chamando helper de fora do diff > (c) diff sem teste novo: nenhum bloco, prompt igual ao montado sem definições 996ms
 ✓ test/orquestrador-envelope.test.ts (25 tests) 1889ms
 ✓ test/orquestrador-contexto-juiz.test.ts (14 tests) 6243ms
   ✓ run_juiz com contexto_juiz > o critério cita um arquivo fora do diff: o material do juiz passa a conter esse arquivo, rotulado 1022ms
   ✓ run_juiz com contexto_juiz > o conteúdo é o da BASE da tentativa, não o da HEAD 1064ms
   ✓ run_juiz com contexto_juiz > arquivo acima do teto é truncado, e o truncamento está escrito no texto 1006ms
   ✓ run_juiz com contexto_juiz > caminho ausente na base falha ALTO: rc != 0, nome do caminho no log, juiz não roda 465ms
   ✓ run_juiz com contexto_juiz > ticket SEM contexto_juiz: nenhum bloco de referência 979ms
   ✓ (d) gate-ticket valida contexto_juiz > não é lista de strings: violação 483ms
 ✓ test/orquestrador-piso-tools.test.ts (23 tests) 11ms
 ✓ test/orquestrador-migrar-config.test.ts (48 tests) 18638ms
   ✓ a migração não apaga nada > actus-saas: o arquivo no disco do repo NÃO é tocado 420ms
   ✓ a migração não apaga nada > comarka-operacional: o arquivo no disco do repo NÃO é tocado 391ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > antes da migração, a linha é a de hoje (é a medida de referência) 417ms
   ✓ o CI: o config migrado produz a MESMA linha GATE > DEPOIS da migração, é caractere a caractere a MESMA linha 412ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --dry-run não escreve nem o proposto 425ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --propor grava 000-config.proposto.json e NÃO toca o oficial 446ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > --aplicar move o proposto QUE FOI REVISADO, não um recalculado 884ms
   ✓ o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito > o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO 490ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > --dry-run continua não gravando: ele AVISA da recusa e segue relatando 501ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > sem proposto no disco, o --propor grava como sempre (a guarda não é sempre-verdadeira) 482ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > o migrador NÃO conhece o nome da revisão: não lê, não escreve, não apaga 532ms
   ✓ M1 · --propor RECUSA sobrescrever um proposto existente > a CLI distingue RECUSA (rc 1) de erro de uso (rc 2) 377ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > com proposto pré-existente: rc 1, recusa dita, e o arquivo intacto byte a byte 3426ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > o resto da migração roda: a recusa é do config, não do --migrar inteiro 2607ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > sem proposto pré-existente, o --migrar volta a sair 0 e a gravar 3132ms
   ✓ M1 · instalar.sh --atualizar --migrar repassa a recusa > --dry-run com proposto pré-existente: rc 0, avisa, e não escreve 2717ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > actus-saas: o proposto tem MENOS violações que o original, e o resto é decisão local 452ms
   ✓ os dois configs reais: quanto o proposto melhora, e o que sobra > comarka-operacional: o proposto tem MENOS violações que o original, e o resto é decisão local 465ms
 ✓ test/orquestrador-agendamento.test.ts (21 tests) 238ms
 ✓ test/orquestrador-observabilidade.test.ts (38 tests) 9014ms
   ✓ status_set reescreve o snapshot INTEIRO > NUNCA append: 20 transições e o arquivo continua do mesmo tamanho 2878ms
   ✓ status_set reescreve o snapshot INTEIRO > a transição seguinte APAGA o valor anterior (não convive com ele) 392ms
   ✓ status_set reescreve o snapshot INTEIRO > ocioso: TICKET e FASE viram — e MOTIVO explica por que a fila parou 337ms
   ✓ FILA e STAGING são RELIDOS do disco a cada render (regra 9) > mudou o status de um ticket, mudou o placar — sem passar fila= nenhum 563ms
   ✓ evento GATE resume a passagem inteira numa linha > tudo verde 520ms
   ✓ evento GATE resume a passagem inteira numa linha > gate que reprovou aparece como falha; os que não rodaram, como nao-rodou 546ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement reprovado carrega fora_do_pathspec com os arquivos 534ms
   ✓ evento GATE resume a passagem inteira numa linha > enforcement verde nunca carrega fora_do_pathspec 498ms
 ✓ test/orquestrador-gate-severidade.test.ts (16 tests) 1982ms
   ✓ 7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade) > valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio 623ms
   ✓ 7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO > ticket só com avisos: rc 0, e --violacoes não imprime nada 456ms
 ✓ test/orquestrador-gate-regex-casos.test.ts (18 tests) 821ms
 ✓ test/orquestrador-resolvedor-acoes.test.ts (12 tests) 13602ms
   ✓ peça 3: ações R1 e R5 com as travas > segunda passada no mesmo ticket não age de novo; bloqueado outra vez vai para humano 927ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando ele espera, e age quando o git sai 1666ms
   ✓ peça 3: ações R1 e R5 com as travas > com git rodando além do teto ele desiste sem escrever (processo e index.lock) 4765ms
   ✓ peça 3: ações R1 e R5 com as travas > com o interruptor ele não faz nada: nem triagem, nem ledger, nem o repo 590ms
   ✓ peça 3: ações R1 e R5 com as travas > o commit tem só o arquivo do ticket e o trailer; o resto do índice fica 1015ms
   ✓ peça 3: ações R1 e R5 com as travas > o hook do repo roda (nunca --no-verify) e, se recusa, o arquivo volta 809ms
   ✓ peça 3: ações R1 e R5 com as travas > nenhuma escrita fora de docs/fila do ticket bloqueado 875ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 árvore suja: não reabre com a worktree alvo suja; reabre quando limpa 605ms
   ✓ peça 3: ações R1 e R5 com as travas > R5 máquina (801, D4): só reabre com a máquina livre 919ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 com .skip no teste do branch alvo: não age 694ms
   ✓ peça 3: ações R1 e R5 com as travas > R1 em sombra: só a proposta com o diff, o repo intocado 608ms
 ✓ test/orquestrador-liberacoes-formatos.test.ts (28 tests) 9879ms
   ✓ Actus — `tokens[]` de strings SEM o prefixo `humano:` > os 5 tokens do arquivo real resolvem a dependência `humano:<token>` 642ms
   ✓ Comarka — `liberadas[]` de objetos + `tokens[]` de strings > TODOS os 47 tokens únicos do arquivo real resolvem 5983ms
   ✓ o que o CI faz diferente: NADA > os 7 resolvem, e NENHUM grava aviso (a forma do CI não é legada) 787ms
 ✓ test/orquestrador-gate-baseline.test.ts (21 tests) 6ms
 ✓ test/orquestrador-gate-8a.test.ts (20 tests) 3424ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido 320ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts 440ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos 611ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > 844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava) 553ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > "dentro" é matchesAllowlist: glob da allowlist cobre o teste 307ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida) 347ms
   ✓ 8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/ > --relatorio lista os testes vizinhos do ticket (insumo da 8c) 517ms
 ✓ test/orquestrador-migrations-plano.test.ts (6 tests) 26ms
 ✓ test/orquestrador-triador-fixture.test.ts (10 tests) 201ms
 ✓ test/orq-versao-config.test.ts (16 tests) 3305ms
   ✓ orq config > READ-ONLY: nem versao nem config escrevem no repo 356ms
 ✓ test/orquestrador-gate-regex-exemplos.test.ts (11 tests) 1269ms
   ✓ 624 · o critério "cita arquivo:linha" do 503 > (b) regex NOVO com os mesmos exemplos PASSA: zero violações e o ticket no relatório como OK 474ms
   ✓ 624 · falha alta > (f) /usr/bin/grep ausente: o gate NÃO passa, sai com rc 2 dizendo o binário 425ms
 ✓ test/orquestrador-triador-custo-real.test.ts (7 tests) 1506ms
   ✓ peça 3: custo real sempre > a reserva do pior caso existe só durante a chamada; depois vira o custo real 309ms
   ✓ peça 3: custo real sempre > chamada que começou e não devolveu custo (timeout) fica com o pior caso, marcada; não é reserva esquecida 1013ms
 ✓ test/orquestrador-trilha-gate-papel.test.ts (9 tests) 3854ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > a trilha diz o que os gates disseram, e build sai como nao-configurado 391ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate de nome próprio que REPROVA sai falha, e o que passou continua ok 423ms
   ✓ config do FIXTURE (gates `typecheck` e `test`) > gate CONFIGURADO que não chegou a rodar continua nao-rodou 438ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2) 473ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > os dois typecheck do CI viram um papel só, e falha de um é falha do papel 461ms
   ✓ config do CI (_referencia-ci/000-config.ci.json) > nenhum gate do CI cai em nao-configurado: o CI tem os três papéis 444ms
   ✓ papel declarado no config manda sobre o inferido do nome > um gate chamado `verificacao` com "papel": "testes" entra como testes 374ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config sem gate de lint: a linha NÃO ganha campo novo 461ms
   ✓ papel `lint` só aparece na linha quando o repo tem gate de lint > config COM gate de lint: a linha ganha lint=, depois de build= 388ms
 ✓ test/orquestrador-datar-liberacoes.test.ts (11 tests) 1563ms
 ✓ test/orquestrador-pausa-e-prompt.test.ts (17 tests) 6012ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sai 0 (pausa não é falha) 313ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o log nomeia a pausa e o motivo registrado 328ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > STATUS.md fica ocioso com MOTIVO pausado 308ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > a trilha registra a drenagem pausada, com par início/fim 305ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > NENHUM ticket é tocado (nem pelo reconcile) 344ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > sem o arquivo, a drenagem NÃO para por pausa (o guard não é sempre-verdadeiro) 663ms
   ✓ pausar_file presente encerra a drenagem em ocioso, sem erro > o sentinela legado (.orq-pause) continua pausando 319ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > o ticket em curso termina; o seguinte não começa 868ms
   ✓ pausar_file criado no meio: a drenagem para ENTRE tickets > encerra em ocioso com MOTIVO pausado, não em erro 860ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > o prompt cita docs/orquestrador/skill/EXECUTOR.md 342ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > e manda NÃO ler SKILL.md nem references/ 347ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > não existe mais ponteiro para a SKILL como leitura recomendada 344ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > sem EXECUTOR.md no disco, o prompt sai sem ponteiro nenhum (não inventa) 340ms
   ✓ o executor aponta para EXECUTOR.md, não para a SKILL.md > nada mais mudou no prompt: objetivo, allowlist, gates e proibições seguem lá 329ms
 ✓ test/orquestrador-gates-fonte-unica.test.ts (8 tests) 2430ms
   ✓ 626 (a): gates.ts executa na worktree e lê o config da main > config da main com typecheck + typecheck_scripts e worktree só com typecheck: os DOIS rodam; a linha GATE sai typecheck=ok 532ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (b) typecheck ok e typecheck_scripts ausente do gates.txt: typecheck=ok e gates_ausentes=typecheck_scripts na linha GATE e no STATUS.md 334ms
   ✓ 626 (b-e): a marcação do papel e os ausentes > (c) gate que rodou e falhou continua dando falha, mesmo com o outro do papel ok 360ms
 ✓ test/orquestrador-pacotes.test.ts (8 tests) 2161ms
   ✓ pacotes_do_checkout detecta quem tem node_modules próprio > node_modules da raiz como SYMLINK para diretório de fora: é pacote, e a worktree ganha o link 434ms
 ✓ test/orquestrador-resolvedor-r1-multi.test.ts (7 tests) 6743ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1054: os dois vermelhos firmes, um commit só, a allowlist do humano 1337ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1055b: os dois vermelhos firmes, um commit só, a allowlist do humano 1088ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 1058: os dois vermelhos firmes, um commit só, a allowlist do humano 1009ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > 924a: um dos vermelhos não cumpre D6 nem D6b sozinho, nenhuma ação (nem para o outro) 673ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > o mesmo bloqueio de novo depois de uma ação vai para humano, mesmo com o ticket reescrito 1038ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > outra série: a segunda ação no ticket acontece 907ms
   ✓ 7f-b7 P1: R1 com mais de um vermelho, tudo ou nada > uma ação por ticket por assinatura, teto de 2 > com 2 ações no ticket, a terceira vira só aviso 689ms
 ✓ test/orquestrador-morte-por-sinal.test.ts (11 tests) 2710ms
   ✓ o handler espera o comando em primeiro plano — e isso explica o log de 06/09 > SIGTERM durante um comando em primeiro plano só é tratado quando ele volta 2229ms
 ✓ test/orquestrador-arquivo-solto.test.ts (6 tests) 19009ms
   ✓ 631: arquivo solto > sequência do 513: agente commita a.ts e deixa diag-tmp.txt solto -> reprovado/arquivo_solto com retry e o nome no diagnóstico 2466ms
   ✓ 631: arquivo solto > contra-teste: o agente COMMITA diag-tmp.txt ele mesmo -> refatiar por enforcement 2185ms
   ✓ 631: arquivo solto > contra-teste: arquivo solto que casa zona proibida -> refatiar 2567ms
   ✓ 631: arquivo solto > contra-teste: um solto mais um commitado fora da allowlist (violação mista) -> refatiar 2605ms
   ✓ 631: arquivo solto > contra-teste: nenhum commit do agente e tudo solto dentro da allowlist -> "saiu sem commitar" e sem violação 2509ms
   ✓ 631: arquivo solto > drive_ticket: o retry do arquivo_solto reaproveita a worktree, mantém o modelo e aprova quando o agente remove o arquivo 6675ms
 ✓ test/orquestrador-notificacao.test.ts (25 tests) 24812ms
   ✓ o fallback em arquivo é escrito SEMPRE > sem osascript: só o arquivo, e o log diz por quê 7360ms
   ✓ o fallback em arquivo é escrito SEMPRE > COM osascript: o arquivo é escrito do mesmo jeito 412ms
   ✓ o que vai no título e no corpo > título: placar de aprovados e bloqueados 408ms
   ✓ o que vai no título e no corpo > corpo: duração e o ÚLTIMO do snapshot 614ms
   ✓ o que vai no título e no corpo > sem snapshot ainda, o corpo sai com — em vez de quebrar 431ms
   ✓ fila sem processável: avisa uma vez, e só uma > a PRIMEIRA drenagem vazia escreve exatamente uma linha 592ms
   ✓ fila sem processável: avisa uma vez, e só uma > a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd) 1050ms
   ✓ fila sem processável: avisa uma vez, e só uma > dez ticks seguidos com a fila vazia continuam valendo uma linha só 4705ms
   ✓ fila sem processável: avisa uma vez, e só uma > processar de novo REARMA o aviso de fila vazia 2277ms
   ✓ drenagem que PROCESSOU notifica, com o placar > aprovado: uma linha, placar 1 aprovado 1291ms
   ✓ drenagem que PROCESSOU notifica, com o placar > bloqueado: uma linha, placar 1 bloqueado 952ms
   ✓ drenagem que PROCESSOU notifica, com o placar > adiado por orçamento: uma linha, corpo com adiados 1 759ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado 1044ms
   ✓ drenagem que PROCESSOU notifica, com o placar > EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho) 1014ms
   ✓ saída sem drenagem NUNCA notifica > lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log 318ms
   ✓ deve_notificar: a regra, isolada > processou ≥ 1: notifica, qualquer que seja o motivo do fim 329ms
   ✓ deve_notificar: a regra, isolada > zero processados por pausa, cooldown ou sem progresso: cala sempre 348ms
 ✓ test/orquestrador-adiamento-actus.test.ts (13 tests) 6ms
 ✓ test/orquestrador-base-vermelha.test.ts (4 tests) 16557ms
   ✓ 632: base vermelha > sequência do 510c: FAIL só no 0283 bloqueia com base_vermelha, sem juiz, sem retry e sem consumir tentativa 3686ms
   ✓ 632: base vermelha > contra-teste: FAIL num arquivo DA allowlist segue o caminho de hoje (REPROVADO criterio_qualidade, sem base_vermelha) 4439ms
   ✓ 632: base vermelha > contra-teste: typecheck reprovado junto segue o caminho de hoje, sem base_vermelha 4307ms
   ✓ 632: base vermelha > contra-teste: saída de testes sem linha FAIL reconhecível segue o caminho de hoje 4125ms
 ✓ test/orquestrador-sub-repeticao.test.ts (16 tests) 6ms
 ✓ test/orquestrador-push-suprimido.test.ts (14 tests) 9ms
 ✓ test/orquestrador-dois-blocos-json.test.ts (13 tests) 667ms
 ✓ test/orquestrador-edicao-alheia.test.ts (9 tests) 9985ms
   ✓ autocommit do fim da drenagem com os tickets reais do ba731d8 > o status e a nota do loop entram; o objetivo e os cmd alheios ficam fora do commit 1672ms
   ✓ autocommit do fim da drenagem com os tickets reais do ba731d8 > a edição alheia continua no working tree, sem commit e sem nada no índice 1609ms
   ✓ autocommit do fim da drenagem com os tickets reais do ba731d8 > EDICAO_ALHEIA na trilha, uma por ticket, com os campos alheios 1637ms
   ✓ autocommit do fim da drenagem com os tickets reais do ba731d8 > o commit do loop leva o trailer Orq-Loop de cada ticket 1548ms
   ✓ ticket_commit, a porta principal de escrita do kit > a tentativa do motor entra; o objetivo alheio fica no working tree 853ms
   ✓ ticket_commit, a porta principal de escrita do kit > um aviso por arquivo: a segunda escrita com a mesma edição alheia não repete o evento 1235ms
   ✓ ticket_commit, a porta principal de escrita do kit > edição alheia só na prosa também fica fora 802ms
   ✓ ticket_commit, a porta principal de escrita do kit > sem edição alheia o commit é o arquivo do working tree, como antes, e não há evento 606ms
 ✓ test/orquestrador-migrations-config.test.ts (5 tests) 9ms
 ✓ test/orquestrador-resolvedor-pausa-dono.test.ts (5 tests) 464ms
   ✓ 7f-b7 P3: pausa com dono silenciosa > as 17 pausas reais de 17 e 18/10: só as 2 sem dono notificam (eram 17) 386ms
 ✓ test/orquestrador-resolvedor-pausa-dono-intocavel.test.ts (4 tests) 271ms
 ✓ test/orquestrador-resolvedor-passada.test.ts (5 tests) 1533ms
   ✓ peça 2: a passada > --dry-run: o repo intocado, sem ledger, e o que faria em dry-run.jsonl 715ms
   ✓ peça 2: a passada > orq resolver --repo X --dry-run pela linha de comando 754ms
 ✓ test/orquestrador-disparo-congelado.test.ts (13 tests) 4345ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando DENTRO do timeout não está congelado 312ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > executando ALÉM do timeout está congelado, e diz há quanto tempo 316ms
   ✓ status_congelado_secs: a régua é o claude_timeout_secs > ocioso nunca está congelado, por mais velho que seja o DESDE 300ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS congelado E lock com pid VIVO => recupera (a staleness vence) 461ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > a recuperação deixa rastro na trilha e limpa o STATUS 521ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > STATUS são + lock com pid vivo => em-curso (a guarda continua valendo) 366ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > lock com pid MORTO não segura disparo nenhum => segue 330ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > sem lock e sem STATUS congelado => segue 310ms
   ✓ a ordem: staleness ANTES de "já há drenagem em curso" > em-curso NÃO escreve na trilha: não houve o que recuperar 352ms
   ✓ a guarda por processo é POR REPO > o lock de OUTRO repo não é visto: o caminho sai do RUNS_BASE deste 352ms
   ✓ orq mostra MORTO, não executando > com o STATUS congelado, o snapshot diz MORTO e há quanto tempo 360ms
   ✓ orq mostra MORTO, não executando > com o STATUS são, mostra o que sempre mostrou 362ms
 ✓ test/orquestrador-resolvedor-ledger.test.ts (9 tests) 7711ms
   ✓ peça 5: ledger de desfecho > a ação: classe, regra, o que mudou, commit e tempo até destravar 1116ms
   ✓ peça 5: ledger de desfecho > desfecho done, com o tempo, uma vez só 854ms
   ✓ peça 5: ledger de desfecho > desfecho bloqueou de novo: ruim, e o segundo bloqueio vai para humano com o motivo 656ms
   ✓ peça 5: ledger de desfecho > desfecho humano mexeu: o json fora dos campos do motor mudou 578ms
   ✓ peça 5: ledger de desfecho > o loop escrevendo status, nota e tentativas não é humano mexendo 590ms
   ✓ peça 5: ledger de desfecho > "não consegui" com o motivo, uma linha por assinatura e motivo 421ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > espera enquanto o ticket está bloqueado com o cmd antigo; o cmd do humano igual ao proposto é acerto 889ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > outro cmd com a mesma saída nos estados da prova é acerto (equivalente) 867ms
   ✓ peça 5: ledger de desfecho > R2: a proposta contra o conserto humano > cmd com saída diferente é erro; destravar sem trocar o cmd é erro 1703ms
 ✓ test/orquestrador-prompt-como-rodar.test.ts (10 tests) 4ms
 ✓ test/orquestrador-resolvedor-pausa.test.ts (6 tests) 379ms
 ✓ test/orquestrador-resolvedor-r1-multi-isolado.test.ts (2 tests) 6438ms
   ✓ 7f-b7 P5: r1_multi isolado e limite depois do R1 > (b) duas reprovas por limite depois de r1_multi: nenhum desfecho ruim, R1 segue em auto, proposta gravada e uma notificação por ação 3159ms
   ✓ 7f-b7 P5: r1_multi isolado e limite depois do R1 > (a) 2 desfechos ruins de r1_multi devolvem só o r1_multi a sombra; o R1 de um teste segue aplicando 3277ms
 ✓ test/orquestrador-fila-json-quebrado.test.ts (6 tests) 2032ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > gate --pendentes sai com rc != 0 citando o arquivo e o erro; sem o quebrado, rc 0 447ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > STATUS mostra a fila corrompida, o placar conta os válidos e o seletor devolve o 902 499ms
   ✓ ticket 630 — fila com ticket de JSON quebrado > fila sem ticket quebrado: nenhuma linha de corrompida e placar sem corrompido 400ms
 ✓ test/orquestrador-criterio-merito.test.ts (5 tests) 350ms
   ✓ 625: run_criterios separa o comando que não executou do critério que reprovou > rc 127 (não encontrado) e rc 126 (não executável) entram na lista; reprovação comum não entra 346ms
 ✓ test/orquestrador-resolvedor-fatia-auto.test.ts (2 tests) 472ms
   ✓ peça 2: fatia do teto para auto (teto_reserva_auto) > o diagnostico triado de novo a cada passada não come o teto do bloqueio em auto que aparece depois (padrão 0.7) 467ms
 ✓ test/orquestrador-resolvedor-job-claude.test.ts (4 tests) 2307ms
   ✓ peça 3: o claude no PATH do job > job.sh sem claude: uma linha MODELO_INDISPONIVEL por dia, passada só com extração, nada no teto 1194ms
   ✓ peça 3: o claude no PATH do job > o claude volta: o 243 triado sem modelo é triado de novo com o modelo, uma vez 1013ms
 ✓ test/orquestrador-triador-sem-tentativa.test.ts (3 tests) 106ms
 ✓ test/kit-e2e-evidencia.test.ts (7 tests) 364ms
 ✓ test/orquestrador-isolamento-teste.test.ts (26 tests) 12222ms
   ✓ o test-*.sh rodando de verdade não deixa marca na trilha real > test-drenagem.sh: fixture recebe os eventos, produção não recebe nada 11436ms
 ✓ test/orquestrador-reparo-trilha.test.ts (10 tests) 1604ms
 ✓ test/orquestrador-resolvedor-sobreposicao.test.ts (2 tests) 70ms
 ✓ test/orquestrador-liberacoes.test.ts (11 tests) 2015ms
   ✓ o arquivo REAL do repo resolve as dependências que declara > cada token do arquivo real resolve via liberacao_ok 755ms
stdout | test/orquestrador-gate-corpus.test.ts > 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova

MATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)
regra	severidade	FP CI/58	FP Actus/91	FP Comarka/557	VP CI/6	VP Actus/12	VP Comarka/39
10n	aviso	56	41	487	6	9	32
2c	aviso	0	0	1	0	0	0
3	aviso	0	0	1	0	0	0
6a:bash	aviso	0	1	6	0	0	0
6a:rm 	aviso	0	13	20	0	0	1
6a:sh -c	aviso	0	0	1	0	0	0
6b	aviso	55	60	363	5	10	26
6q	aviso	0	12	83	0	4	3
6r	aviso	0	0	1	0	0	0
6v	aviso	0	23	250	0	9	13
8	aviso	0	14	77	0	0	3
C13	aviso	0	0	47	0	0	2
C2c	aviso	0	1	4	1	0	2
C2v	aviso	36	0	0	3	0	0
C3	aviso	3	0	9	0	0	2
C4	aviso	0	0	11	0	0	1
C9	aviso	0	0	28	0	0	0


 ✓ test/orquestrador-gate-corpus.test.ts (2 tests) 8038ms
   ✓ 7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo > matriz por regra e por repo; regra ERRO com FP em (a) reprova 8035ms
 ✓ test/orquestrador-retry-feedback-juiz.test.ts (3 tests) 19090ms
   ✓ 623 (a): o motivo do juiz chega ao prompt de retry > juiz reprova com o mecânico verde: o retry traz gate juiz, o motivo LITERAL e os criterios_falhos do juiz 6784ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > segunda tentativa com diff.patch idêntico: bloqueado por retry_sem_mudanca, juiz chamado UMA vez 5340ms
   ✓ 623 (b): retry com o MESMO diff bloqueia sem chamar o juiz > contra-teste: segunda tentativa com diff DIFERENTE chama o juiz de novo (contador = 2) 6965ms
 ✓ test/orquestrador-resolvedor-gabarito.test.ts (8 tests) 3513ms
stdout | test/orquestrador-resolvedor-replay-allowlist.test.ts > 7f-b7 P2: replay dos resgates de allowlist depois de 11/10
{
 "casos": [
  {
   "linha": "2026-10-11 12:27 5525c7db6",
   "id": "1006",
   "classe": "R1",
   "regra": "D6b",
   "feito": "aplicado",
   "motivo": "test/quem-cuida.test.ts na allowlist; test/quem-cuida.test.ts na lista de criterio[2]; guarda de contagem em criterio[5]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/quem-cuida.test.ts"
   ],
   "resolvedor": [
    "test/quem-cuida.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "criterio novo CONTAGEM_MANTIDA",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "318c",
   "classe": null,
   "regra": null,
   "feito": "diagnostico",
   "motivo": "modo diagnostico para sem classe",
   "humano": [
    "src/app/dashboard/performance/nichos-teses/nichos-teses-aba.tsx"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio ZERO_JSON_NOVO",
    "criterio SEM_ESCRITA",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:28 af768b088",
   "id": "966",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/ficha-nav-colapsavel.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "recon_esperado",
    "criterio VERDE",
    "criterio VERDE",
    "criterio novo RECALCULADO_966",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 11:29 05d951e93",
   "id": "830",
   "classe": "R2?",
   "regra": "D12",
   "feito": "nao_consegui",
   "motivo": "forma do defeito fora do que esta etapa conserta (saída: SOBRA_1)",
   "humano": [
    "scripts/dados/370-identidade.ts",
    "scripts/dados/685-dono-dry-run.ts",
    "test/dono-dry-run.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "recon_esperado",
    "criterio VERDE",
    "criterio novo FORA_DE_SRC_LIMPO",
    "criterio novo DONO_INTACTO",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 13:09 ab4e95cb4",
   "id": "854",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/rotas-orfas.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "recon_esperado",
    "testes_conferidos",
    "criterio VERDE",
    "criterio novo TEAM_ID_NA_ALLOWLIST",
    "criterio novo ORFAS_INTACTO",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-12 20:19 638e00305",
   "id": "855",
   "classe": "R5?",
   "regra": "D7",
   "feito": "aviso",
   "motivo": "R5? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/adocao-predicado.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NAO_AFROUXOU",
    "criterio NAO_AFROUXOU",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-13 00:33 c00ee4b15",
   "id": "924a",
   "classe": "R1",
   "regra": "D6",
   "feito": "nao_consegui",
   "motivo": "mais de um vermelho fora da allowlist, tudo ou nada: test/conta-entregas-vazio-unico.test.ts não cumpre D6 nem D6b sozinho; nenhuma ação",
   "humano": [
    "test/conta-entregas-vazio-unico.test.ts",
    "test/visao-aceite-mockup.test.tsx"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "excecao_tamanho",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio AFROUXAMENTO_OK",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1053",
   "classe": "R2?",
   "regra": "D12",
   "feito": "nao_consegui",
   "motivo": "forma do defeito fora do que esta etapa conserta (saída: FORA_test/papel-nas-escritas.test.ts)",
   "humano": [
    "test/papel-nas-escritas.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio NO_TETO",
    "criterio novo RECALCULADO_PAPEL_1053",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1053b",
   "classe": "R1|R2?",
   "regra": "D11",
   "feito": "aviso",
   "motivo": "R1|R2? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "src/lib/clientes/espelho-legado.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio novo SEM_SERVER_ONLY",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1054",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/resolver-cliente-rota-diagnostico.test.ts e test/resolver-cliente-rota-resumo.test.ts na allowlist; test/resolver-cliente-rota-diagnostico.test.ts e test/resolver-cliente-rota-resumo.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/resolver-cliente-rota-diagnostico.test.ts",
    "test/resolver-cliente-rota-resumo.test.ts"
   ],
   "resolvedor": [
    "test/resolver-cliente-rota-diagnostico.test.ts",
    "test/resolver-cliente-rota-resumo.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio LEITORES_NA_CASA_NOVA",
    "criterio novo RECALCULADO_ROTAS_1054",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1055b",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/acoes-recomendadas-chave.test.ts e test/relatorio-sem-cliente-id.test.ts na allowlist; test/acoes-recomendadas-chave.test.ts e test/relatorio-sem-cliente-id.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/acoes-recomendadas-chave.test.ts",
    "test/relatorio-sem-cliente-id.test.ts"
   ],
   "resolvedor": [
    "test/acoes-recomendadas-chave.test.ts",
    "test/relatorio-sem-cliente-id.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio novo RECALCULADO_1055B_ANTIGOS",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-14 19:22 cf2fe3a97",
   "id": "1059",
   "classe": "R1|R2?",
   "regra": "D11",
   "feito": "aviso",
   "motivo": "R1|R2? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/leitores-carteira-casa-nova.test.ts",
    "test/leitores-ficha-casa-nova.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio VERDE",
    "criterio RECALCULADO_1059",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-15 11:58 832436272",
   "id": "1058",
   "classe": "R1",
   "regra": "D6",
   "feito": "aplicado",
   "motivo": "test/negocio-temperatura.test.ts e test/quem-cuida.test.ts na allowlist; test/negocio-temperatura.test.ts e test/quem-cuida.test.ts na lista de criterio[2]; guardas de contagem em criterio[5], criterio[6]; reabriu (status pendente, nota vazia)",
   "humano": [
    "test/negocio-temperatura.test.ts",
    "test/quem-cuida.test.ts"
   ],
   "resolvedor": [
    "test/negocio-temperatura.test.ts",
    "test/quem-cuida.test.ts"
   ],
   "veredito": "identica",
   "humano_alem": [
    "objetivo",
    "testes_conferidos",
    "criterio NO_TETO",
    "criterio VERDE",
    "criterio NAO_AFROUXOU_1058",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  },
  {
   "linha": "2026-10-17 05:34 75db690c0",
   "id": "1195",
   "classe": "R1?",
   "regra": "D8",
   "feito": "aviso",
   "motivo": "R1? é palpite: o resolvedor só age em diagnóstico firme",
   "humano": [
    "test/reuniao-manual-registro.test.ts"
   ],
   "resolvedor": [],
   "veredito": "sem_acao",
   "humano_alem": [
    "objetivo",
    "criterio VERDE",
    "texto do ticket fora do json"
   ]
  }
 ],
 "sem_caso": [
  {
   "linha": "2026-10-11 00:42 079d3f465",
   "id": "952a",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-11 00:42 079d3f465",
   "id": "972",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-11 11:02 cc8d3887b",
   "id": "932",
   "motivo": "sem bloqueio antes do commit (ticket done: release)"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "933",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "934b",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-12 11:08 4b5dd2eab",
   "id": "935",
   "motivo": "allowlist não mudou neste ticket"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1056b",
   "motivo": "sem bloqueio antes do commit e sem allowlist nova"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "1101",
   "motivo": "sem bloqueio antes do commit e sem allowlist nova"
  },
  {
   "linha": "2026-10-14 11:21 b7a3eea2f",
   "id": "924c",
   "motivo": "allowlist não mudou neste ticket"
  }
 ]
}

 ✓ test/orquestrador-resolvedor-replay-allowlist.test.ts (4 tests) 8772ms
 ✓ test/orquestrador-trilha-uma-linha.test.ts (8 tests) 965ms
 ✓ test/orquestrador-prefixo-aspas.test.ts (13 tests) 11ms
 ✓ test/orquestrador-resolvedor-prioridade.test.ts (2 tests) 143ms
 ✓ test/orquestrador-triador-extrair.test.ts (5 tests) 44ms
 ✓ test/orquestrador-gate-vitest-aviso.test.ts (27 tests) 106ms
 ✓ test/orquestrador-resolvedor-promocao.test.ts (8 tests) 5966ms
   ✓ peça 6: promoção e rebaixamento > R2 sobe para auto com 9 acertos em 10, no ledger e no repos.json; o resto do repos.json fica 911ms
   ✓ peça 6: promoção e rebaixamento > R2 com 8 acertos em 10 não sobe 886ms
   ✓ peça 6: promoção e rebaixamento > R2 com 9 acertos em 9 não sobe 852ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com 2 desfechos ruins seguidos volta para sombra, e a mesma passada já só propõe 349ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com bloqueou_de_novo, done não volta 1057ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com humano_mexeu, done, bloqueou_de_novo não volta 615ms
   ✓ peça 6: promoção e rebaixamento > R5 em auto com desfeito não volta 625ms
   ✓ peça 6: promoção e rebaixamento > os mesmos fatos não rebaixam de novo depois que o humano devolve para auto 633ms
 ✓ test/orquestrador-resolvedor-pulado-teto.test.ts (3 tests) 151ms
 ✓ test/orquestrador-resolvedor-job.test.ts (4 tests) 802ms
   ✓ peça 8: o job do launchd > o job.sh roda uma passada; com outra passada segurando a trava global, nada roda 717ms
 ✓ test/orquestrador-ambiente-merito.test.ts (6 tests) 3ms
 ✓ test/orq-pausa-trilha.test.ts (8 tests) 1799ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > RETOMADA por=terminal dur=<N>min, depois da PAUSA 387ms
   ✓ orq retomar grava RETOMADA e diz quem pausou, quando e por quê > imprime quem, quando e o motivo ANTES do RETOMADO 406ms
 ✓ test/orquestrador-triador-assinatura-estavel.test.ts (5 tests) 75ms
 ✓ test/orquestrador-triador-leitor-kit-tentativas.test.ts (3 tests) 2ms
 ✓ test/orquestrador-gate-grep-q.test.ts (19 tests) 61ms
 ✓ test/orquestrador-resolvedor-humano-mexeu.test.ts (5 tests) 4698ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > commit da Vigia (Orq-Vigia) depois do bloqueio: não age, humano_mexeu com quem=vigia 874ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > commit humano sem trailer depois do bloqueio: não age, quem=humano 860ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > edição sem commit no working tree: não age e não leva a edição de ninguém 713ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > controle: edição humana ANTES do bloqueio não impede a ação 1240ms
   ✓ peça 4 (8b): humano mexeu, antes de agir > controle: commit do loop depois do bloqueio (Orq-Loop) não conta 975ms
 ✓ test/orquestrador-runatload.test.ts (2 tests) 216ms
 ✓ test/orquestrador-resolvedor-branch.test.ts (4 tests) 4578ms
   ✓ peça 2 (8b): o resolvedor confere a branch antes do commit > checkout numa branch qualquer: não commita, branch_inesperada no ledger, um aviso 1682ms
   ✓ peça 2 (8b): o resolvedor confere a branch antes do commit > na main (padrão), o R1 age como antes 940ms
   ✓ peça 2 (8b): o resolvedor confere a branch antes do commit > a branch do item do repos.json vale antes do padrão 1150ms
   ✓ peça 2 (8b): o resolvedor confere a branch antes do commit > sem branch no item, vale a branch_protegida do config do repo 767ms
 ✓ test/orquestrador-prompt-evidencia.test.ts (6 tests) 2501ms
   ✓ 627 · o retry também carrega o bloco > com REPROVAÇÃO ANTERIOR, o bloco segue lá, antes do motivo 2499ms
 ✓ test/orquestrador-resolvedor-r2.test.ts (5 tests) 4730ms
   ✓ peça 4: R2 em sombra > o conserto do unbound variable é o cmd do humano, letra por letra 636ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"R2":"sombra"}) 915ms
   ✓ peça 4: R2 em sombra > proposta com a prova e nada no repo (modo {"padrao":"auto"}) 907ms
   ✓ peça 4: R2 em sombra > a mesma assinatura não refaz a proposta 896ms
   ✓ peça 4: R2 em sombra > não propõe o que aprovaria o estado não feito, nem cmd que roda o repo 1336ms
 ✓ test/orquestrador-resolvedor-desfazer.test.ts (4 tests) 4577ms
   ✓ peça 7: orq desfazer > desfaz a ação do 840: o ticket volta ao antes, num commit só dele, e o ledger marca 2343ms
   ✓ peça 7: orq desfazer > recusa sem ação no ledger 366ms
   ✓ peça 7: orq desfazer > recusa se o arquivo mudou depois: mudança não commitada (o loop) ou commit 1236ms
   ✓ peça 7: orq desfazer > recusa se o commit não tem o trailer da ação 586ms
 ✓ test/orquestrador-resolvedor-tentativa-nova.test.ts (5 tests) 5351ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um attempt-* novo em runs/<id>/: desiste, o ticket fica intacto 1152ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > um arquivo reescrito dentro de um attempt-* (sem entrada nova): desiste 1248ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o log do loop ganha o começo de uma tentativa do ticket: desiste 1101ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > o ticket vira em_execucao: desiste (e não pisa no que o loop escreveu) 996ms
   ✓ peça 4 (b): tentativa nova entre a leitura e a troca > log de outro ticket e nada novo no runs/: age (a trava não trava sem motivo) 810ms
 ✓ test/orquestrador-teto-adiamento-ambiente.test.ts (5 tests) 26445ms
   ✓ teto de adiamento por ambiente > 3 adiamentos consecutivos por ambiente = bloqueado, com a causa na nota 5470ms
   ✓ teto de adiamento por ambiente > reprovação no meio quebra a sequência (o contador zera) 6403ms
   ✓ teto de adiamento por ambiente > adiamento por OUTRA causa não conta nem zera 5893ms
   ✓ teto de adiamento por ambiente > passar de fase zera: aprovado leva a aguardando_merge sem contador 3075ms
   ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 5603ms

 Test Files  105 passed (105)
      Tests  1652 passed (1652)
   Start at  18:47:26
   Duration  57.63s (transform 1.29s, setup 0ms, collect 19.61s, tests 398.48s, environment 14ms, prepare 4.05s)

```

#### 7.2.3 `bash scripts/kit/test-shell.sh` — rc=0

```
[fixture] tmp: /tmp/orq-fixture-BFHIHr
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-BFHIHr/repo
== testes de shell do motor · fixture em /tmp/orq-fixture-BFHIHr/repo ==

--- test-lib-config.sh ---
== raízes resolvidas pelo lib.sh ==
  ROOT           = /tmp/orq-fixture-BFHIHr/repo
  MAIN_CHECKOUT  = /private/tmp/orq-fixture-BFHIHr/repo
  CONFIG         = /private/tmp/orq-fixture-BFHIHr/repo/docs/fila/000-config.json
  ok   config encontrado no caminho resolvido

== valores lidos do config REAL ==
  ambiente_id      = orqfixture
  repo_origin      = fixture/orq-fixture
  diff_cap_linhas  = 600
  branch_alvo      = staging-auto
  max_retries      = 2
  ok   ambiente_id bate com o arquivo
  ok   diff_cap bate com o arquivo (600)
  ok   diff_cap é inteiro positivo

== causas de adiamento declaradas no config ==
  - erro de conexão
  - sessão expirada
  - rate limit
  - quota estourada
  - timeout de claude_timeout_secs
  - gate interrompido no meio
  - veredito do juiz ilegível
  - falha de ambiente da worktree
  ok   8 causas declaradas
  ok   a causa de ambiente da worktree está declarada
  ok   a causa do juiz ilegível está declarada

== is_adiavel cobre cada causa ==
  ok   erro de conexão (ECONNREFUSED) -> adia
  ok   erro de conexão (socket hang up) -> adia
  ok   sessão expirada -> adia
  ok   sessão expirada (token) -> adia
  ok   rate limit -> adia
  ok   quota estourada -> adia
  ok   timeout de claude_timeout_secs -> adia
  ok   gate interrompido (SIGINT) -> adia
  ok   gate interrompido (SIGHUP) -> adia
  ok   menção a rate limit com rc=0 -> nao-adia
  ok   menção a sessão expirada com rc=0 -> nao-adia
  ok   erro real de código -> nao-adia

TODOS OS CHECKS PASSARAM

rc(test-lib-config.sh) = 0

--- test-drenagem.sh ---
== config lida ==
  branch_alvo=staging-auto  branch_protegida=main
  ok    alvo != protegida

== merge_em_alvo RECUSA a branch protegida ==
  ok    alvo == protegida => rc=2 (recusado)
  ok    recusa diz o motivo
  (worktree de teste: /private/tmp/orq-fixture-BFHIHr/repo, em 'main')
  ok    worktree em 'main' => rc=2 (recusado)
  ok    recusa nomeia a protegida
  ok    main intacta (6f73192c)

== drenar TRATA o status refatiar (regra 19) ==
  ok    refatiar NÃO vai para o merge
  ok    a drenagem diz que o ticket voltou
  ok    seguiu para o próximo ticket (executor chamado para: 901 902 )
  ok    o placar da drenagem conta os 2 refatiados
  ok    não conta como aprovado nem como bloqueado

== mark_adiado: cooldown global só para limite real de conta (Actus 9e109cb) ==
  ok    tsx do checkout: /private/tmp/orq-fixture-BFHIHr/repo/node_modules/.bin/tsx
  ok    causa 'ambiente' (arma=nao) => cooldown global NÃO armado
  ok    causa 'juiz_ilegivel' (arma=nao) => cooldown global NÃO armado
  ok    causa 'timeout' (arma=nao) => cooldown global NÃO armado
  ok    causa 'rate_limit' (arma=sim) => cooldown global ARMADO
  ok    causa 'quota' (arma=sim) => cooldown global ARMADO

== drenar: 1º ADIADO por 'ambiente' => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (922) foi executado
  ok    nenhum cooldown global armado
  ok    o adiado (921) roda UMA vez só nesta drenagem
  ok    922 terminou done

== drenar: 1º adiado por orcamento_ticket => o 2º roda na MESMA drenagem (Actus 9e109cb) ==
  ok    o 2º ticket (932) foi executado
  ok    931 não foi ao executor

== drenar: executor adia por orcamento_ticket POR DENTRO => o 2º roda (Actus 9e109cb) ==
  ok    o 2º ticket (942) foi executado

TODOS OS CHECKS PASSARAM

rc(test-drenagem.sh) = 0

--- test-retry-worktree.sh ---
== 1 · enforcement PASSOU: a tentativa 2 herda a worktree e o commit ==
  ok    attempt-1 começa COM o diff da anterior (1 linha, src/a.ts na árvore)
  ok    o log diz que reaproveitou (e de qual tentativa)
  ok    o prompt da tentativa 2 manda corrigir o apontado
  ok    o patch da tentativa 2 contém o trabalho herdado
  ok    a trilha registra a reaproveitação
  ok    o RETRY anuncia o modo da worktree

== 2 · enforcement REPROVOU: worktree NOVA (diff fora do escopo não vira base) ==
  ok    attempt-1 nasce LIMPA quando o enforcement reprovou
  ok    não reaproveitou
  ok    o RETRY registra que a worktree é nova

== 3 · diff.patch por tentativa, ANTES de qualquer descarte ==
  ok    grava_diff_patch escreve o patch
  ok    o patch tem o conteúdo, não só o nome do arquivo
  ok    diff vazio => patch vazio, mas presente
  ok    run_attempt grava o patch antes do enforcement

== 4 · sondagem com rc!=0 grava o stderr REAL, não um palpite ==
  ok    a mensagem traz a saída REAL do CLI
  ok    não chuta mais a causa
  ok    diz o rc observado
  ok    gravou a evidência em runs/ (probe-falha-20261018T184906Z.txt)
  ok    o arquivo tem a saída crua
  ok    o log aponta o arquivo antes de morrer

== 5 · REQUEUE: rodada nova com attempt-0..2 antigos no disco ==
  ok    attempt-0 da rodada antiga NÃO foi sobrescrito
  ok    attempt-1 e attempt-2 antigos preservados
  ok    a rodada nova escreveu em attempt-3
  ok    attempt-3 tem o prompt DE HOJE, não o antigo
  ok    o log anuncia o slot inicial
  ok    o retry da rodada foi para attempt-4 (numeração contínua)
  ok    meta.json amarra o contador de retry ao diretório (campo dir)
  ok    tentativa 1 da rodada nasce limpa, apesar dos runs/ antigos

== 6 · COMMIT DO HARNESS: agente que sai sem commitar não perde trabalho ==
  ok    o harness commitou pelo agente
  ok    a worktree ficou limpa (nada solto para ser descartado)
  ok    mensagem exata do commit
  ok    trailer Orq-Ticket presente
  ok    o diff passou a enxergar o trabalho (2 linhas)
  ok    o arquivo fora do escopo foi commitado junto (o enforcement o julga)
  ok    árvore limpa não gera commit vazio
  ok    commit_do_agente roda antes de medir o diff

== 7 · o juiz é avisado de que o commit foi do harness ==
  ok    a nota entra no prompt do juiz
  ok    sem nota, o prompt sai como antes

TODOS OS CHECKS PASSARAM

rc(test-retry-worktree.sh) = 0

--- test-drenagem-sem-progresso.sh ---
== fila: 901 e 902 abortam antes do agente, 903 é saudável (N=3) ==
  | [2026-10-18 15:49:22-0300] ticket 901 (3 processáveis)
  | [orq ERRO] recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-18 15:49:24-0300]   ticket 901 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: recusado: o ticket 901 pede cmd fora do prefixo permitido
  | [2026-10-18 15:49:24-0300] ticket 902 (3 processáveis)
  | [2026-10-18 15:49:25-0300]   ticket 902 segue pendente sem cooldown (sem progresso 1/3) — marcado como tentado nesta drenagem; segue para o próximo não tentado. Causa: fatal: branch 'frente/902' está em uso por outra worktree
  | [2026-10-18 15:49:25-0300] ticket 903 (3 processáveis)
  | [2026-10-18 15:49:28-0300] nenhum processável não tentado — encerrando (aprovados: 1; sem progresso: 901 902)
  | [2026-10-18 15:49:28-0300] drenagem encerrada: 1 aprovado(s) e mergeado(s)
  | [2026-10-18 15:49:28-0300] ocioso: 901 sem progresso · 902 sem progresso
  ok    executor chamado 3x numa drenagem: 901 902 903 
  ok    terminou em <= N=3 chamadas (sem loop)
  ok    cada ticket tentado UMA vez, na ordem da fila
  ok    o executor recebe --ticket (não reescolhe)
  ok    o saudável (903) foi processado: done
  ok    901 segue pendente (não mudou de status)
  ok    902 segue pendente (não mudou de status)
  trilha: 2026-10-18T15:49:28-0300 --- DRENAGEM_FIM aprovados=1 bloqueados=0 adiados=0 refatiar=0 sem_progresso=2 dur=0min
  ok    DRENAGEM_FIM conta o aprovado
  ok    DRENAGEM_FIM conta os 2 sem progresso em contador próprio
  STATUS motivo: sem progresso em 901 902: 901 sem progresso · 902 sem progresso
  ok    motivo_ocioso lista TODOS os pulados (901 e 902)

TODOS OS CHECKS PASSARAM

rc(test-drenagem-sem-progresso.sh) = 0

--- test-sem-progresso-limite.sh ---
== 1. ticket 901 sempre aborta: 1, 2, 3 -> bloqueado ==
  --- disparo 1 (aborta): chamadas [901 ] 901=1
  ok    disparo 1: contador 1
  --- disparo 2 (aborta): chamadas [901 ] 901=2
  ok    disparo 2: contador 2 (persistiu entre disparos)
  ok    abaixo do limite, segue pendente
  --- disparo 3 (aborta): chamadas [901 ] 901=
  ok    disparo 3: 901 bloqueado no limite
  nota: sem_progresso: 3 disparos sem progresso entre 2026-10-18 15:49:31-0300 e 2026-10-18 15:49:35-0300; última causa: executor morreu (rc=128, fase=worktree): fatal: '/tmp/_worktrees/fx-901' already exists
  ok    nota cita a última causa pelo DESFECHO do executor (EXECUTOR_MORREU + linha fatal), não pela linha FAIL
  ok    trilha: 901 BLOQUEADO motivo=sem_progresso
  ok    o bloqueio foi COMMITADO (árvore limpa no ticket)
  ok    commit: fila: 901 bloqueado (sem_progresso, 3 disparos)
  ok    o status bloqueado está no commit, não só no disco
  ok    contador zerado ao mudar de status
  --- disparo 4 (aborta): chamadas [] 901=
  ok    disparo 4: bloqueado não é mais escolhido

== 2. adiamento não conta ==
  --- disparo 5 (aborta): chamadas [902 ] 901=
  ok    902 aborta: contador 1
  --- disparo 6 (adia-cooldown): chamadas [902 ] 901=
  ok    adiado com cooldown (mark_adiado): não conta
  ok    (o mark_adiado armou cooldown, como no motor)
  --- disparo 7 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    adiado SEM cooldown (evento ADIADO): não conta
  --- disparo 8 (adia-sem-cooldown): chamadas [902 ] 901=
  ok    segundo adiamento sem cooldown também não conta
  ok    adiado sem cooldown não é reescolhido na mesma drenagem
  --- disparo 9 (aborta): chamadas [902 ] 901=
  ok    abort depois dos adiamentos volta a contar (2)

== 3. staging que avança na vez do ticket zera ==
  --- disparo 10 (aborta): chamadas [902 902 ] 901=
  ok    staging avançou: zerou e recomeçou em 1
  ok    902 não bloqueou
  ok    com staging andando, a drenagem voltou ao ticket (progresso)

== 4. o limite vem do config ==
  --- disparo 11 (aborta): chamadas [903 ] 901=
  ok    sem_progresso_limite=1 no config: bloqueia no 1º disparo
  ok    nota com o limite do config
  ok    valor inválido no config cai no padrão 3
  ok    chave ausente: padrão 3

TODOS OS CHECKS PASSARAM

rc(test-sem-progresso-limite.sh) = 0

--- test-ocioso.sh ---
== 1. 244 atrás de 241b bloqueado, 232 atrás de 231 pendente (sem liberação) ==
  ok    nenhum executor chamado (nada processável)
  trilha: 2026-10-18T15:49:46-0300 --- OCIOSO pendentes=3 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado
  ok    evento OCIOSO pendentes=3
  ok    244: dependência 241b em bloqueado
  ok    232: dependência 231 em pendente
  ok    231: liberação humano:migration-0031 ausente
  ok    UM evento por drenagem
  ok    trilha continua uma linha por evento (nenhuma linha sem timestamp)
  ok    OCIOSO vem antes do DRENAGEM_FIM
  STATUS.md:
    ORQUESTRADOR · 2026-10-18 15:49:46
    ESTADO   ocioso
    TICKET   —
    DESDE    —
    FASE     —
    FILA     3 pendente · 1 bloqueado · 1 done
    STAGING  92dadda · push suprimido (publicar é humano neste repo)
    ÚLTIMO   —
    MOTIVO   sem ticket processável: 231 sem liberação humano:migration-0031 · 232 espera 231 (pendente) · 244 espera 241b (bloqueado)
  ok    STATUS mantém o motivo de sempre
  ok    STATUS: 244 espera 241b (bloqueado)
  ok    STATUS: 232 espera 231 (pendente)
  ok    STATUS: 231 sem liberação
  ok    DRENAGEM_FIM sem campo novo

== 2. pendente pulado por sem-progresso nesta drenagem ==
  trilha: 2026-10-18T15:49:47-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=sem_progresso
  ok    250 foi tentado uma vez
  ok    250: pulado por sem-progresso
  ok    STATUS: 250 sem progresso

== 3. cooldown ativo: o liberado espera o cooldown ==
  trilha: 2026-10-18T15:49:48-0300 --- OCIOSO pendentes=4 231=liberacao:humano:migration-0031 232=dependencia:231:pendente 244=dependencia:241b:bloqueado 250=cooldown:16:19
  ok    250: cooldown até 16:19
  ok    a razão de dependência vence o cooldown
  ok    STATUS: 250 em cooldown até 16:19

== 4. fins que NÃO gravam OCIOSO ==
  ok    pausa: sem OCIOSO (quem pausou já sabe)
  ok    sem pendente nenhum: sem OCIOSO

TODOS OS CHECKS PASSARAM

rc(test-ocioso.sh) = 0

--- test-rc-executor.sh ---
== pipefail está ligado dentro da drenagem (é ele que desvia para o PIPESTATUS) ==
  ok    pipefail on (vem do set -euo pipefail do local-loop.sh/lib.sh)

== o rc do executor atravessa o tee ==
  --- A: executor sai 3, tee sai 0 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:49:50-0300 e 2026-10-18 15:49:50-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    A: o log vê rc=3
  ok    A: a causa do bloqueio carrega rc=3
  --- B: executor sai 0, tee sai 0 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:49:51-0300 e 2026-10-18 15:49:51-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    B: o log vê rc=0
  ok    B: a causa do bloqueio carrega rc=0
  --- C: executor sai 0, tee sai 5 -> log 'executor rc=0'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:49:52-0300 e 2026-10-18 15:49:52-0300; última causa: executor saiu rc=0 sem desfecho registrado
  ok    C: o log vê rc=0
  ok    C: a causa do bloqueio carrega rc=0
  --- D: executor sai 3, tee sai 5 -> log 'executor rc=3'; nota: sem_progresso: 1 disparos sem progresso entre 2026-10-18 15:49:53-0300 e 2026-10-18 15:49:53-0300; última causa: executor saiu rc=3 sem desfecho registrado
  ok    D: o log vê rc=3
  ok    D: a causa do bloqueio carrega rc=3

TODOS OS CHECKS PASSARAM

rc(test-rc-executor.sh) = 0

--- test-ambiente.sh ---
== 1. preflight recusa TODO ticket, 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente/ 902=pendente/ 903=pendente/
  ok    0 bloqueados depois de 3 disparos
  ok    contadores zerados (nenhum .sem-progresso)
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas ao executor por disparo (máx: 2)
  trilha: 2026-10-18T15:49:58-0300 --- AMBIENTE tickets=901,902 causa=executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada (sem id, sha, número, caminho)
  ok    DRENAGEM_FIM: bloqueados=0 sem_progresso=0
  STATUS: MOTIVO   ambiente: executor morreu (rc=<n>, fase=?): preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa
  ok    motivo_ocioso=ambiente

== 2. causas próprias em tickets diferentes NÃO são ambiente ==
  --- disparo 4 (proprio): chamadas [904 905 ] 901=done/ 902=done/ 903=done/
  ok    904 e 905 somam 1 cada
  ok    nenhum AMBIENTE

== 3. um ticket sozinho travado continua bloqueando no 3º disparo ==
  --- disparo 5 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  --- disparo 6 (proprio): chamadas [904 ] 901=done/ 902=done/ 903=done/
  ok    904 bloqueado no 3º disparo
  ok    trilha: 904 BLOQUEADO motivo=sem_progresso
  ok    bloqueio commitado
  ok    nenhum AMBIENTE no caso isolado

== 4. árvore suja: causa com \n literal, 4 disparos (o teto de adiamentos) ==
  --- disparo 7 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 8 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 9 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  --- disparo 10 (suja): chamadas [906 907 ] 901=done/ 902=done/ 903=done/
  ok    1 AMBIENTE em cada um dos 4 disparos
  trilha: 2026-10-18T15:50:10-0300 --- AMBIENTE tickets=906,907 causa=ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> — commite ou stashe antes:\n M src/a.ts\n?? tmp-<id>.log
  ok    evento com 906,907 e o \n literal na causa
  ok    906 e 907 não bloqueados

== 5. causa 'ambiente' em dois tickets: a absolvição não deixa o teto de 3 avançar ==
  --- disparo 11 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 12 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 13 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  --- disparo 14 (amb): chamadas [908 909 ] 901=done/ 902=done/ 903=done/
      908=pendente/adiamentos_ambiente=0 909=pendente/adiamentos_ambiente=0
  ok    1 AMBIENTE em cada um dos 4 disparos
  ok    evento com 908,909 e o \n literal na causa
  ok    908 e 909 seguem pendentes (teto de 3 não atingido)
  ok    adiamentos_ambiente em 0 e ticket pendente depois de CADA disparo
  ok    trilha: 8 AMBIENTE_ADIAMENTO_DESFEITO (2 por disparo)
  ok    o evento diz de quanto para quanto
  ok    desfazer commitado

TODOS OS CHECKS PASSARAM

rc(test-ambiente.sh) = 0

--- test-causa-adiamento.sh ---
== A. timeout local (rc 124 do watchdog): adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=timeout
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  ok    evento diz cooldown=nao
  ok    nota registra timeout
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=timeout attempt=1 rc=124 dur=3s cooldown=nao

== B. 429: adia COM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=rate_limit
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown ARMADO (limite remoto)
  ok    evento diz cooldown=sim
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=rate_limit attempt=1 rc=1 dur=0s cooldown=sim

== C. 503 / overloaded: adia SEM cooldown ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=servidor
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=1 rc=1 dur=1s cooldown=nao

== D. gate de testes que não rodou (sem placar): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  ok    cooldown NÃO armado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=1s cooldown=nao

== E. tsc ausente (rc 127, command not found): gate_crash ==
  ok    ticket segue pendente
  ok    trilha: ADIADO motivo=gate_crash
  ok    nenhum REPROVADO, RETRY ou BLOQUEADO
  ok    uma tentativa só (nada consumido)
  ok    não escalou modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 ADIADO motivo=gate_crash attempt=1 rc=0 dur=0s cooldown=nao

== F. tsc que rodou e apontou erro de código: mérito, não adia ==
  ok    REPROVADO (mérito)
  ok    não adiou
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_typecheck attempt=1 diff=1
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=1

== G. recusa de preflight (árvore de execução suja): ADIADO motivo=preflight ==
  ok    executor sai 0
  ok    trilha: ADIADO motivo=preflight com a causa
  ok    nenhuma linha EXECUTOR_MORREU
  ok    um evento, uma linha
  ok    ticket segue pendente
  ok    cooldown NÃO armado
  | 901 ADIADO motivo=preflight causa=preflight: árvore de execução suja em /private/var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/tmp.lLTkjW2VcV/repo — commite ou stashe antes:\n?? lixo.txt

TODOS OS CHECKS PASSARAM

rc(test-causa-adiamento.sh) = 0

--- test-ambiente-adiado.sh ---
== 1. preflight recusa TODO ticket (ADIADO motivo=preflight), 3 disparos ==
  --- disparo 1 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 2 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  --- disparo 3 (preflight): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    3 eventos AMBIENTE (um por disparo)
  ok    no máximo 2 chamadas por disparo (máx: 2)
  trilha: 2026-10-18T15:51:24-0300 --- AMBIENTE tickets=901,902 causa=ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    evento com os tickets que colidiram
  ok    causa normalizada, com o motivo preflight
  ok    0 bloqueados
  STATUS: MOTIVO   ambiente: ADIADO motivo=preflight causa=preflight: lock de git em uso por outro processo: <caminho> (pid <n>, vez do <id>, HEAD <sha>)
  ok    STATUS diz ambiente e a causa

== 2. sessão caída em todo ticket (adiado sem cooldown): AMBIENTE ==
  --- disparo 4 (sessao): chamadas [901 902 ] 901=pendente 902=pendente 903=pendente
  ok    um AMBIENTE
  ok    parou na 2ª chamada
  ok    causa: ADIADO motivo=sessao

== 3. adiamentos com causas DIFERENTES não são ambiente ==
  --- disparo 5 (proprio): chamadas [901 902 903 ] 901=pendente 902=pendente 903=pendente
  ok    nenhum AMBIENTE
  ok    a drenagem seguiu pelos três

TODOS OS CHECKS PASSARAM

rc(test-ambiente-adiado.sh) = 0

--- test-adiamentos-limite.sh ---
== A. executor real: rc 124 em 0 s com timeout de 30 s não é timeout ==
  trilha: 901 ADIADO motivo=gate_interrompido attempt=1 rc=124 dur=1s cooldown=nao
  ok    ADIADO, e não com motivo=timeout
  ok    a trilha traz a medida (rc=124, duração real)
  nota: adiado (executor) por infraestrutura: gate_interrompido (rc=124 em 1s, abaixo do limite de 30s: morto por fora) em 2026-10-18T18:51:43Z — retomará no próximo disparo
  ok    a nota traz rc=124 e não diz timeout

== B. sempre adiado: bloqueia no 4º disparo com a causa real ==
  --- disparo 1 (adia): 901=pendente/1
  --- disparo 2 (adia): 901=pendente/2
  --- disparo 3 (adia): 901=pendente/3
  ok    contador em 3 depois de 3 disparos
  ok    abaixo do limite, segue pendente
  --- disparo 4 (adia): 901=bloqueado/
  ok    bloqueado no 4º disparo
  nota: adiado 4 vezes: gate_interrompido (rc=124, 9s de execução)
  ok    nota começa por 'adiado 4 vezes: '
  ok    a causa é a medida: motivo, rc=124 e 9s
  ok    trilha: BLOQUEADO motivo=adiamentos n=4 limite=4
  ok    bloqueio commitado
  ok    commit do bloqueio
  ok    contador zerado ao bloquear

== C. adiado que depois aprova zera o contador ==
  --- disparo 5 (adia): 901=pendente/1
  --- disparo 6 (adia): 901=pendente/2
  ok    2 adiamentos contados
  --- disparo 7 (aprova): 901=done/
  ok    aprovado e mergeado
  ok    contador zerado pela aprovação
  --- disparo 8 (adia): 901=pendente/1
  ok    recomeça em 1, não em 3

== D. adiamento COM cooldown não conta nem zera ==
  --- disparo 9 (limite): 901=pendente/1
  ok    contador segue 1

== E. o limite vem do config ==
  --- disparo 10 (adia): 901=bloqueado/
  ok    com limite 2, bloqueia no 2º
  ok    trilha diz n=2 limite=2
  ok    limite inválido ("x") vira 4
  ok    limite inválido (0) vira 4
  ok    limite inválido (-3) vira 4
  ok    limite inválido ("quatro") vira 4
  ok    limite ausente vira 4

== F. AMBIENTE desfaz o que somou na drenagem ==
  --- disparo 11 (adia): 901=pendente/1
  ok    901 em 1 (antes do ambiente)
  --- disparo 12 (mesmo): 901=pendente/1
  ok    um AMBIENTE
  ok    901 volta a 1 e 902 não soma

TODOS OS CHECKS PASSARAM

rc(test-adiamentos-limite.sh) = 0

--- test-reprovado-sub.sh ---
  (timeout do agente falso: 20 s = 10 s x fator de carga 2; load1=16.18, núcleos=10)
== A. critério vermelho, com permissão negada: mérito, mesmo modelo ==
  ok    a permissão negada foi registrada
  ok    REPROVADO sub=criterio
  ok    RETRY com o mesmo modelo (sonnet), sub=criterio
  ok    nenhuma chamada em opus
  ok    não adiou (permissão negada não é ambiente)
  | 901 INICIO attempt=1 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=7bce1d8b
  | 901 INICIO attempt=2 model=sonnet
  | 901 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== B. juiz reprovando: escala ==
  ok    REPROVADO sub=juiz
  ok    RETRY model=opus, sub=juiz
  ok    a 2ª chamada do agente foi em opus
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=baixo modelo=sonnet attempt=1
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=1 diff=5
  | 901 RETRY attempt=2 model=opus motivo=criterio_qualidade sub=juiz worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=771c81b4
  | 901 INICIO attempt=2 model=opus
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=1/1 build=nao-configurado
  | 901 JUIZ veredito=reprovado classe=alto modelo=opus attempt=2
  | 901 REPROVADO motivo=criterio_qualidade sub=juiz attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== C. gate de testes vermelho (com placar): sub=gate_testes, mesmo modelo ==
  ok    REPROVADO sub=gate_testes
  ok    RETRY com o mesmo modelo
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=gate_testes worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=50bcddd9
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=falha enforcement=ok criterios=1/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=gate_testes attempt=2 diff=6
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=2

== D. o 461 do Actus: a 2ª reprovação igual (sub=criterio, diff=717) bloqueia na hora ==
  ok    trilha fixture do 461 no lugar
  ok    a reprovação desta execução: sub=criterio diff=717
  ok    BLOQUEADO motivo=repeticao
  ok    ticket bloqueado
  ok    nenhum RETRY
  ok    uma chamada paga só
  nota: repetição: 2ª reprovação igual à anterior (sub=criterio, diff=717), sem 3ª volta. critério(s) reprovado(s): o arquivo existe
  ok    a nota diz repetição e o diff
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=3 cmds=ls -la node_modules | ls -la node_modules 2>&1 | head -3 | ls -la node_modules 2>&1 | head -3; echo "---"; git status
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=3/4 build=ok
  | 461 REPROVADO motivo=criterio_qualidade attempt=1 diff=717
  | 461 INICIO attempt=1 model=sonnet
  | 461 PERMISSAO_NEGADA n=1 cmds=ls -la node_modules
  | 461 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 461 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=717
  | 461 BLOQUEADO motivo=repeticao sub=criterio diff=717 attempt=1

== E. max_retries vale no total, não por drenagem ==
  --- 1ª execução: tentativas=1 status=pendente
  ok    1ª execução: reprovou, adiou, segue pendente
  ok    1 tentativa consumida, persistida no ticket (o adiado devolveu a sua)
  --- 2ª execução: tentativas=3 status=bloqueado
  ok    3 reprovações no total (max_retries 2 + 1)
  ok    a 2ª execução começa em attempt=2
  ok    BLOQUEADO na attempt=3
  ok    nenhuma 4ª tentativa
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=5
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-0 base=12dd33ee
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=2 diff=6
  | 901 RETRY attempt=3 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-2 base=12dd33ee
  | 901 INICIO attempt=3 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=3 diff=7
  | 901 BLOQUEADO motivo=criterio_qualidade attempt=3

TODOS OS CHECKS PASSARAM

rc(test-reprovado-sub.sh) = 0

--- test-notificacao-ambiente.sh ---
== 1. três disparos em AMBIENTE: um aviso ==
  --- disparo 1 (preflight): avisos=1
  --- disparo 2 (preflight): avisos=1
  --- disparo 3 (preflight): avisos=1
  ok    3 drenagens em AMBIENTE
  ok    1 aviso em 3 disparos
  ok    o aviso fala de ambiente
  | 2026-10-18T15:52:51-0300 | Orquestrador: AMBIENTE, a fila parou | a mesma causa em dois tickets não é do ticket: ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>). Nada somou nem bloqueou; avisa de novo quando sair.

== 2. o 4º disparo, saudável: um aviso de saída ==
  --- disparo 4 (aprova): avisos=2
  ok    exatamente 1 aviso novo
  ok    é o aviso de SAÍDA do ambiente
  ok    com o placar da drenagem (3 aprovados)
  | 2026-10-18T15:53:08-0300 | Orquestrador: ambiente normalizado, 3 aprovados, 0 bloqueados | saiu de AMBIENTE (ADIADO motivo=preflight causa=preflight: árvore de execução suja em <caminho> (vez do <id>)) · duração 0min · adiados 0

== 3. o 5º disparo, saudável e sem nada: sem aviso de saída de novo ==
  --- disparo 5 (aprova): avisos=3
  ok    nenhum aviso de ambiente repetido

TODOS OS CHECKS PASSARAM

rc(test-notificacao-ambiente.sh) = 0

--- test-reabertura-humana.sh ---
  (timeout do agente falso: 20 s = 10 s x fator de carga 2; load1=14.94, núcleos=10)
== 1. a contagem de tentativas é commitada: docs/fila limpo depois de REPROVADO e RETRY ==
  ok    houve REPROVADO e RETRY
  | == chamada 1
  | == chamada 2
  | == chamada 3
  ok    docs/fila limpo no checkout principal em TODA chamada (inclusive depois de REPROVADO+RETRY)
  ok    docs/fila limpo no fim
  | fila: 901 bloqueado
  | fila: 901 tentativa 3
  | fila: 901 tentativa 2
  | fila: 901 tentativa 1
  | fixture: fila inicial
  ok    commit 'fila: 901 tentativa 2' no log
  ok    bloqueado por max_retries com tentativas=3

== 2. devolução humana: bloqueado -> pendente num commit humano zera tudo ==
  ok    antes da drenagem: pendente, tentativas=3, .sem-progresso=2, .adiamentos=3
  | --- DRENAGEM_INICIO alvo=staging-auto processaveis=1
  | 901 RECUPERADO motivo=reaberto de=bloqueado
  | 901 INICIO attempt=1 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 REPROVADO motivo=criterio_qualidade sub=criterio attempt=1 diff=8
  | 901 RETRY attempt=2 model=sonnet motivo=criterio_qualidade sub=criterio worktree=reaproveitada
  | 901 WORKTREE modo=reaproveitada de=attempt-3 base=ce777f3c
  | 901 INICIO attempt=2 model=sonnet
  | 901 GATE typecheck=ok testes=ok enforcement=ok criterios=0/1 build=nao-configurado
  | 901 ADIADO motivo=servidor attempt=2 rc=1 dur=0s cooldown=nao
  | --- OCIOSO pendentes=1 901=adiado
  | --- DRENAGEM_FIM aprovados=0 bloqueados=0 adiados=1 refatiar=0 sem_progresso=0 dur=0min
  ok    a drenagem executou o ticket a partir de attempt=1
  ok    não bloqueou na hora
  ok    com retry disponível (RETRY attempt=2)
  ok    segue pendente (a 2ª tentativa adiou)
  ok    tentativas=1 (zerada e somada uma reprovação)
  ok    .sem-progresso zerado
  ok    .adiamentos recomeçou em 1 (era 3; sem zerar seria 4 e bloquearia)
  ok    trilha: RECUPERADO motivo=reaberto de=bloqueado
  ok    docs/fila limpo depois da drenagem (o zero também foi commitado)

== 3. a devolução zera UMA vez: a drenagem seguinte continua de onde parou ==
  ok    recomeça em attempt=2 (não zera de novo)
  ok    nenhum RECUPERADO novo

TODOS OS CHECKS PASSARAM

rc(test-reabertura-humana.sh) = 0

--- test-painel-visao.sh ---
== 0. pendentes_razoes: a régua do OCIOSO, com o processável dito 'pronto' ==
  ok    531 pronto
  ok    601 espera 600
  ok    ocioso_razoes segue com rc 1 quando há processável

== 1. o estado sai do painel, lido só do contrato ==
  ok    painel --estado sai 0
  ok    3 repos, na ordem do repos.json

== 2. Precisa de você: tokens ordenados por quantos pendentes destravam ==
  ok    1º item: humano:cred-evo
  ok    cred-evo destrava 3 (600, e 601 e 602 atrás dele)
  ok    tickets destravados por cred-evo
  ok    2º item: humano:grupo-wa destrava 1
  ok    o item diz de qual repo é

== 3. estado em linguagem direta, com tempo ==
  ok    alfa: tipo
  ok    alfa: frase
  ok    alfa: tentativa e último resultado
  ok    beta: tipo
  ok    beta: frase
  ok    beta: o motivo da pausa
  ok    gama: tipo
  ok    gama: frase
  ok    gama: por que não pega
  ok    cada estado tem rótulo em texto, não só cor

== 4. o dia: aprovados contra reprovas (ontem não conta) ==
  ok    alfa: 2 aprovados, 2 reprovas
  ok    alfa: contagem da fila

== 5. próximos: os 3 primeiros da fila, com título ==
  ok    ids na ordem do loop
  ok    com título
  ok    e mais 1

== 6. bloqueados: categoria de motivo e sub, nunca da prosa ==
  ok    700 (repeticao sub=gate_testes) é teste
  ok    701 (criterio_qualidade, último sub=juiz) é juiz, apesar de 'fora_do_pathspec' na nota
  ok    702 (bloqueado sem BLOQUEADO na trilha) é decisão sua
  ok    243 (adiamentos) é ambiente
  ok    primeira linha do motivo
  ok    o resto fica para o clique
  ok    4 bloqueados nos 3 repos, cada um com o repo

== 7. nenhum ramo por nome de repo ==
  ok    o mesmo repo com outro nome dá o mesmo estado
  ok    orq-painel.py não cita nome de repo
  ok    orq-painel.py não lê meta.json nem log livre

== 8. repos.json ausente: a tela diz o que falta, não quebra ==
  ok    repos_erro nomeia o arquivo

== 9. a página: atualiza a cada 15 s e tem as seções ==
  ok    página contém 'Precisa de você'
  ok    página contém 'Bloqueados'
  ok    página contém '/api/estado'
  ok    página contém '15000'

== 10. razões que não se apuram: a faixa diz quem ficou fora da conta (K12-G) ==
  ok    os tokens do alfa continuam na faixa
  ok    a faixa diz qual repo ficou fora da conta
  ok    e por quê
  ok    timeout: nenhum token apurado
  ok    timeout: os dois repos fora da conta
  ok    o erro diz o tempo e quantos pendentes
  ok    o cartão mostra o erro
  ok    sem razões, prontos é desconhecido, não zero
  ok    gama ocioso sem razões: o cartão não diz 'sem ticket para pegar'
  ok    alfa segue rodando: isso vem do STATUS, não das razões
  ok    a página tem a frase de quem ficou fora

== 11. motivo longo: primeira frase ou 160 caracteres, o resto no clique (K12-H) ==
  ok    243: a primeira frase
  ok    243: o texto inteiro fica para o clique
  ok    244 sem ponto: cortado em até 160 caracteres mais '…' (160)
  ok    o corte avisa com '…'
  ok    o corte cai entre palavras
  ok    700 (motivo curto em duas linhas) segue igual
  ok    a página abre o texto inteiro no clique

== 12. bloqueados: filtro por repo, junto com o de categoria (K12-I) ==
  ok    contagem por repo, na ordem do repos.json, com o zero
  ok    sem filtro: todos os bloqueados
  ok    chip de repo sem bloqueado fica, desabilitado
  ok    e mostra o 0
  ok    clique em gama: só o 243
  ok    clique em alfa: os 3 do alfa
  ok    alfa + categoria teste: os dois filtros juntos
  ok    a atualização de 15 s mantém repo e categoria

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 8 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-visao.sh) = 0

--- test-painel-detalhe.sh ---
  ok    painel --estado sai 0

== 1. os 6 indicadores ==
  ok    tempo por ticket: média, mediana, pior (s)
  ok    aprovação na 1ª: 2 de 3, 67%
  ok    tentativas por aprovação: 5 inícios / 3 aprovações
  ok    fila estimada: 2 prontos × 980 s de execução por aprovação
  ok    ociosidade hoje: 12h menos 49 min em execução, 2h delas pausado
  ok    última promoção: sem dado, com o motivo
  ok    última promoção diz por que não tem dado
  ok    custo do dia (custo.json), só hoje

== 2. sem aprovação no dia, os indicadores dizem 'sem dado' em vez de zero ==
  ok    tempo_ticket: sem dado (nenhuma aprovação hoje)
  ok    primeira: sem dado (nenhuma aprovação hoje)
  ok    tentativas_por_aprovacao: sem dado (nenhuma aprovação hoje)
  ok    fila_estimada: sem dado (nenhuma aprovação hoje, sem ritmo)

== 3. bloqueados: categoria, motivo, allowlist, parado há, tentativas ==
  ok    820: enforcement
  ok    820: parado há 30 min
  ok    820: tentativas do BLOQUEADO (sem campo no ticket)
  ok    820: onde mexe

== 4. prontos: o que muda em uma frase, onde mexe, quantos destravam ==
  ok    prontos na ordem do loop
  ok    810: a primeira frase do objetivo
  ok    810: onde mexe
  ok    810 destrava 1 (o 812), 811 nenhum

== 5. hora a hora: aprovado, reprova, parado ==
  ok    9h: 1 aprovado, 1 reprova, 28 min em execução, 32 parado
  ok    10h: 2 aprovados, 16 min em execução
  ok    3h: parado a hora inteira
  ok    horas até agora (0 a 12)

== 6. arquivos mais disputados entre os pendentes ==
  ok    top 3

== 7. a página tem a vista de detalhe ==
  ok    página contém 'function detalhe'
  ok    página contém 'Hoje, hora a hora'
  ok    página contém 'Arquivos mais disputados'
  ok    página contém 'Prontos'
  ok    página contém 'sem dado'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 2 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-detalhe.sh) = 0

--- test-painel-pausa.sh ---
  servidor em http://127.0.0.1:57745
== 1. pausar: cria o PAUSAR do contrato e grava PAUSA na trilha ==
  ok    HTTP 200
  ok    docs/fila/PAUSAR criado
  ok    conteúdo no formato do §7: <AAAA-MM-DD HH:MM> | motivo
  ok    trilha: 2026-10-18T15:53:58-0300 --- PAUSA motivo=leva-da-tarde por=painel
  ok    a resposta explica que para ENTRE tickets
  ok    .orq-pause nunca é escrito
  ok    nada mais mudou no repo

== 2. pausar de novo: recusa, sem segunda linha ==
  ok    HTTP 409
  ok    sem PAUSA duplicada

== 3. o estado diz o que cada botão pode e por quê ==
  ok    rho: pausar desabilitado
  ok    rho: retomar habilitado
  ok    rho: disparo desabilitado (ticket em curso)
  ok    o motivo do disparo desabilitado está escrito
  ok    sem ação 'pausar agora'

== 4. retomar: apaga o PAUSAR e grava RETOMADA com a duração ==
  ok    HTTP 200
  ok    PAUSAR apagado
  ok    trilha: 2026-10-18T15:53:59-0300 --- RETOMADA por=painel dur=0min
  ok    nada mais mudou no repo
  ok    retomar sem pausa: 409

== 4b. quem pausou: painel e terminal gravam a mesma linha, e o painel diz quem foi (K12-F) ==
  ok    pausa pelo painel: o cartão diz 'pausado pelo painel'
  ok    retomar pelo painel diz quem pausou e por quê
  ok    pausa pelo terminal: o cartão diz 'pausado pelo terminal'
  ok    PAUSA do terminal e do painel no mesmo formato

== 5. legado .orq-pause: lido, nunca escrito nem apagado ==
  ok    sigma aparece pausado
  ok    sigma: retomar desabilitado
  ok    o motivo nomeia o .orq-pause
  ok    POST retomar no legado: 409
  ok    .orq-pause intacto
  ok    sigma continua sem PAUSAR

== 6. disparo: só com STATUS ocioso, e sem -k ==
  ok    com ticket em curso: 409
  ok    launchctl kickstart não chamado
  ok    ocioso: 200
  ok    kickstart gui/<uid>/<label do config>, sem -k

== 7. o resto é recusado ==
  ok    ação fora da allowlist: 403
  ok    repo desconhecido: 400
  ok    Host estranho: 403

== 8. a página: Pausar e Retomar, e o que a pausa faz ==
  ok    página contém 'Pausar'
  ok    página contém 'Retomar'
  ok    página contém 'ENTRE tickets'
  ok    página contém 'nada é interrompido'
  ok    sem 'Pausar agora'

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 31 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-pausa.sh) = 0

--- test-painel-alarmes.sh ---
== 1. launchd_exit: last exit code != 0 ==
  ok    rc 127 com trilha recente: o job org.fixture.a1 saiu com rc 127 no último disparo (launchctl print: last exit code)
  ok    o card diz travado
  ok    rc 0 e drenagem dentro da janela: silêncio
  ok    job NÃO carregado (desagendado de propósito): silêncio

== 2. mudo: nenhum DRENAGEM_INICIO há mais de 2x o start_interval ==
  ok    DRENAGEM_INICIO de 3x o start_interval atrás: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    e diz o intervalo do job: nenhuma drenagem começou há 1h30; o job dispara a cada 30 min (limite 1h)
  ok    o card diz travado
  ok    DRENAGEM_INICIO dentro de 2x o start_interval: silêncio
  ok    velho, mas job descarregado: silêncio
  ok    trilha sem nenhum DRENAGEM_INICIO, job carregado: nenhum DRENAGEM_INICIO na trilha, com o job org.fixture.a2d carregado (dispara a cada 30 min)

== 3. pausa_furada: PAUSAR de pé e a drenagem seguiu depois dele ==
  ok    DRENAGEM_INICIO sem motivo=pausado depois da PAUSA: a drenagem seguiu depois da pausa: DRENAGEM_INICIO às 11:40, com o PAUSAR de pé desde 11:29
  ok    pausa respeitada (motivo=pausado) e retry do 530, que já corria: sem pausa_furada
  ok    INICIO de OUTRO ticket depois da pausa: a drenagem seguiu depois da pausa: INICIO do 531 às 11:50, com o PAUSAR de pé desde 11:29

== 4. pausa_longa: PAUSAR há mais de 40 min ==
  ok    41 min: pausado há 41 min, mais de 40 min: motivo "madrugada"
  ok    39 min: silêncio

== 5. execucao_longa: além do timeout do config mais a margem ==
  ok    41 min com timeout de 30 e margem de 10: o 530 está em execução há 41 min; o timeout é 30 min (+10 min de margem para gates e juiz)
  ok    o card diz travado
  ok    30 min, dentro do timeout mais a margem: silêncio

== 6. todo alarme é texto, e o que falta no config vira 'sem dado' ==
  ok    sem dado: mudo: sem launchd.start_interval no config | execução longa: sem claude_timeout_secs no config
  ok    a página mostra o texto do alarme

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 19 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-alarmes.sh) = 0

--- test-painel-lento.sh ---
  servidor em http://127.0.0.1:57764
== 1. duas chamadas seguidas respondem abaixo de 1 s ==
  ok    1ª chamada em 0.549592s
  ok    2ª chamada em 0.000778s

== 2. o repo rápido vem completo; o lento vem marcado ==
  ok    rápido: razões apuradas
  ok    rápido: 1 pronto
  ok    rápido: o token dele está na faixa
  ok    lento: apurando
  ok    lento: o cartão diz que está apurando
  ok    lento: fora da conta da faixa, e dito

== 3. depois do timeout: sem apurar, com a hora da última tentativa, e o processo morto ==
  ok    lento: sem apurar
  ok    última tentativa às 15:54
  ok    o cartão diz a última tentativa
  ok    recuo de 1 min: próxima em 57s
  ok    o processo do lento morreu no timeout
  ok    rápido segue completo

== 4. no recuo, nada de tentar de novo a cada chamada ==
  ok    uma tentativa só

== launchctl: só o stub, nunca o do sistema (K12-E) ==
  ok    nenhuma chamada ao launchctl do PATH
  ok    o stub de launchctl respondeu 6 chamada(s)

TODOS OS CHECKS PASSARAM

rc(test-painel-lento.sh) = 0

--- test-gate-prevoo.sh ---
== 1 · critério com 'eval' (regra ERRO): bloqueia ANTES da worktree ==
  ok    o ticket 901 não foi executado
  ok    status bloqueado
  ok    a nota lista a violação
  ok    a nota não mistura aviso
  ok    nenhuma tentativa consumida
  ok    nenhuma worktree criada
  ok    drive_ticket devolve 0 (não aborta)

== 2 · ticket limpo, só com AVISO: executa ==
  ok    o ticket 902 foi executado (aviso não bloqueia)

== 3 · drenagem: bloqueia o 901 e SEGUE para o 902 ==
  ok    a drenagem não executou o 901
  ok    a drenagem seguiu e mergeou o 902
  ok    não encerrou por 'sem progresso'
  ok    placar: 1 aprovado, 1 bloqueado

== 4 · gate que NÃO roda (tsx quebrado, rc 1 sem violação): falha alta, ticket segue pendente ==
  ok    não executou o ticket com o gate quebrado
  ok    gate quebrado = rc != 0 (falha alta)
  ok    o ticket bom NÃO foi bloqueado por gate quebrado
  ok    o log diz que o gate não rodou

== 5 · modo 'aviso': o ticket com violação EXECUTA, e a trilha registra o aviso ==
  ok    o 901 foi executado (aviso não bloqueia)
  ok    status não é bloqueado
  ok    evento GATE_TICKET_AVISO na trilha
  ok    o log lista a violação

== 6 · chave ausente: vale 'aviso', e o log diz ==
  ok    o 901 foi executado (ausente = aviso)
  ok    o log diz que a chave está ausente

== 7 · valor desconhecido: falha alta, nada executa ==
  ok    não executou com modo inválido
  ok    modo inválido = rc != 0
  ok    o log nomeia o valor inválido

== 8 · modo 'bloqueia', ticket só com AVISO pela tabela de severidade: executa ==
  ok    o 903 foi executado (grep -q e vitest por texto são aviso)
  ok    status não é bloqueado
  ok    a trilha não tem BLOQUEADO do 903

== 9 · modo 'aviso', dois disparos seguidos: GATE_TICKET_AVISO uma vez por versão do ticket ==
  ok    o 901 passou pelo pré-voo nos dois disparos (2)
  ok    o 901 segue pendente (adiado)
  ok    UM GATE_TICKET_AVISO na trilha em dois disparos
  ok    o evento carrega o hash da versão
  ok    o 901 editado é versão nova: segundo GATE_TICKET_AVISO

TODOS OS CHECKS PASSARAM

rc(test-gate-prevoo.sh) = 0

--- test-tentativas-persistidas.sh ---
== 1 · drenagem 1: reprovado + adiado(ambiente) -> tentativas = 1 ==
  ok    drenagem 1 começa em attempt=0 (ticket sem campo = 0)
  ok    depois de reprovado+adiado: tentativas=1 no arquivo
  ok    o adiamento devolve o ticket a pendente

== 3 · crash no meio da tentativa: o contador já está no arquivo ==
  ok    a tentativa foi persistida ANTES de rodar (o agente já via tentativas=1)
  ok    depois do crash: tentativas=1 (a tentativa morta conta)

== 4 · aprovado não consome; done zera ==
  ok    reprovado+aprovado: tentativas=1 (o aprovado não soma)
  ok    local-loop.sh zera tentativas junto com o status done

TODOS OS CHECKS PASSARAM

rc(test-tentativas-persistidas.sh) = 0

--- test-orq-pause.sh ---
== 1 · as duas sentinelas presentes: --status lista as duas ==
    PAUSADA: docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar
    PAUSADA: docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   duas linhas PAUSADA
  ok   PAUSAR com caminho e conteúdo
  ok   .orq-pause com caminho e conteúdo
== 4 · pausa_motivo devolve caminho + conteúdo das duas ==
    docs/fila/PAUSAR: 2026-09-24 10:00 | via orq pausar; docs/fila/.orq-pause: 2026-09-24 10:01 | via orq-pause.sh
  ok   pausa_motivo nomeia as duas
== 2 · --off remove as duas e pausa_ativa fica falso ==
    removida: docs/fila/PAUSAR
    removida: docs/fila/.orq-pause
    fila RETOMADA (2 sentinela(s) removida(s))
  ok   diz que removeu PAUSAR
  ok   diz que removeu .orq-pause
  ok   os dois arquivos sumiram
  ok   pausa_ativa falso
== 3 · só PAUSAR presente (o caso que falhava): --off remove PAUSAR ==
  ok   pausado por PAUSAR antes do --off
    removida: docs/fila/PAUSAR
    fila RETOMADA (1 sentinela(s) removida(s))
  ok   PAUSAR removido
  ok   conta uma removida
  ok   pausa_ativa falso
== 5 · nenhuma presente ==
  ok   --status: ativa (sem pausa)
  ok   --off não inventa remoção
  ok   nenhuma linha 'removida:'
== 6 · local-loop pausado: o STATUS nomeia a sentinela ==
    ESTADO   ocioso
    MOTIVO   pausado (docs/fila/PAUSAR: 2026-09-24 12:00 | pausa do teste)
  ok   MOTIVO com a sentinela e o conteúdo
== 7 · (kit, K12-F) pausar e retomar pelo orq-pause.sh gravam PAUSA e RETOMADA na trilha ==
  ok   PAUSA por=terminal na trilha
  ok   RETOMADA por=terminal na trilha

TODOS OK

rc(test-orq-pause.sh) = 0

--- test-preflight.sh ---
== 1 · papel em PENDENTE_* aborta (ROOT sintético, zero gasto) ==
  ok    abortou (rc=1)
  ok    diz que é erro de config
  ok    diz que não consome tentativa
  ok    aponta o desbloqueio LIDO DO CONFIG
  ok    nomeia o papel pendente
  ok    nenhuma sondagem disparada
  ok    nada gravado no custo.json do fixture

== 1b · qualquer um dos três papéis pendente basta ==
  ok    executor_model pendente => aborta nomeando o papel
  ok    avaliador_model pendente => aborta nomeando o papel
  ok    retry_final_model pendente => aborta nomeando o papel

== 1c · INVARIANTE do config real: nenhum papel pendente hoje ==
  ok    executor_model definido (sonnet)
  ok    avaliador_model definido (opus)
  ok    retry_final_model definido (opus)

== 2 · id de modelo inexistente é RECUSADO pelo texto do CLI ==
  ok    recusa detectada: [claude-code:unrecognized_model] {"model":"m…
  ok    recusa detectada: There's an issue with the selected model (xy…
  ok    recusa detectada: "PENDENTE_TK104" is not a model this version…
  ok    resposta normal não é recusa

== 3 · o que NÃO aconteceu ==
  ok    nenhuma worktree criada (0 antes, 0 depois)
  ok    nenhum attempt gravado no fixture
  ok    cooldown NÃO armado (erro de config não é adiamento)

== 4 · fronteira: sondagem limitada ADIA, não aborta ==
  ok    429 real => adiável
  ok    conexão recusada real => adiável
  ok    saída vazia com rc!=0 => adiável (CLI não falou)
  ok    modelo recusado NÃO é adiável

== 5 · JUIZ (passo 7): stub, evidência e ZERO gasto ==
  ok    veredito válido lido do envelope
  ok    prompt gravado (evidência, regra 8)
  ok    output CRU preservado
  ok    o critério avaliador chega ao prompt
  ok    allowlist com *.test.* liga o anti-afrouxamento
  ok    o juiz não recebe o prompt do executor
  ok    lixo => ILEGÍVEL (o executor adia, não reprova)
  ok    nenhum veredito inventado a partir de lixo
  ok    nada gravado em custo.json (nenhuma chamada paga)

TODOS OS CHECKS PASSARAM

rc(test-preflight.sh) = 0

--- test-diff-lines.sh ---
C. diff vazio
  ✓ diff vazio = 0
A. inserções + deleções
  ✓ DIFF_LINES = 15 (diff cru tem 50 linhas)
B. binário conta zero
  ✓ binário não soma (DIFF_LINES continua 15)

PASS=3 FAIL=0

rc(test-diff-lines.sh) = 0

--- test-sem-cor.sh ---
== 3 · controle: FORCE_COLOR=1 sem NO_COLOR colore o placar do vitest ==
  ok    o placar sai com escape ANSI

== 1 e 2 · executor com FORCE_COLOR=1 no ambiente: gate e critério leem o placar sem cor ==
  ok    gate 'test' aprovado com o placar lido por grep
  ok    critério: saída '1' (o placar casou)

TODOS OS CHECKS PASSARAM

rc(test-sem-cor.sh) = 0

--- test-criterio-isolado.sh ---
== 1 · variável não definida não aborta o critério ==
  ok    saída 'v=fim'
== 2 · grep -c sem ocorrência imprime 0 ==
  ok    saída 'n=0'
== 3 · BASE_REF chega ao critério ==
  ok    saída 'base=staging-auto'
== 4 · contra-teste: grep -c 0 contra espera 1 continua falhando ==
  ok    saída '0' e critério FALHA
== 5 · contra-teste: test -n de variável vazia continua falhando ==
  ok    critério FALHA
== 6 · comando inexistente continua NÃO EXECUTADO (rc 127) ==
  ok    rc 127 visto

TODOS OS CHECKS PASSARAM

rc(test-criterio-isolado.sh) = 0

--- test-fixture-gates.sh (kit) ---
[fixture] tmp: /tmp/orq-fixture-WwPAZS
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-WwPAZS/repo
== gates reais numa worktree do motor · fixture em /tmp/orq-fixture-WwPAZS/repo ==

Preparing worktree (new branch 'frente/teste-gates')
ok: a worktree tem node_modules (symlink -> /private/tmp/orq-fixture-WwPAZS/repo/./node_modules)

--- gates.txt ---
ok   typecheck               730ms
ok   test                  31338ms
VEREDITO: APROVADO
--- fim (rc=0) ---

ok: gates.ts rc=0
ok: VEREDITO: APROVADO
ok: gate typecheck
ok: gate test

test-fixture-gates: VERDE

rc(test-fixture-gates.sh) = 0

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
```

#### 7.2.4 `bash scripts/kit/test-instalar.sh` — rc=0

```
[fixture] tmp: /tmp/orq-fixture-bey2QE
[fixture] instanciado (branches: main, staging-auto; origin falso; node_modules -> /Users/lucasantos/Projetos/_worktrees/kit-mig-a/node_modules)
[fixture] para remover:  bash scripts/kit/fixture.sh --limpar /tmp/orq-fixture-bey2QE/repo
== (a) fixture recém-instanciado ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-fixture-bey2QE/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    diz 'idêntico ao kit <VERSAO>'

== (b) cópia do fixture com UM byte a mais em lib.sh ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-LkgU3g/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    exatamente 1 diferença, não uma cascata

== (d) cópia do fixture com UM byte a mais em scripts/roadmap/lint-mapa.py ==
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-ZXLEzC/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/roadmap/lint-mapa.py
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente scripts/roadmap/lint-mapa.py'
  ok    exatamente 1 diferença, não uma cascata

== (e) --atualizar: dry-run, recusa sem pausa, e o conserto ==
-- (e1) --dry-run lista 'diferente' e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-dJqQSD/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   scripts/orquestrador/lib.sh
  | 
  | 1 diferença(s)
  | 
  | O --atualizar de verdade RECUSARIA, por:
  |   · o loop de '/private/tmp/orq-verificar-dJqQSD/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  |   (a recusa não impede este dry-run de listar tudo)
  ok    rc 0
  ok    lista 'diferente scripts/orquestrador/lib.sh'
  ok    o lib.sh do repo NÃO foi tocado pelo --dry-run
-- (e2) --atualizar sem pausa: recusa com rc 1 --
  | RECUSADO: o loop de '/private/tmp/orq-verificar-dJqQSD/repo' não está pausado: não existe nem docs/fila/PAUSAR nem docs/fila/.orq-pause. Rode 'bash scripts/orq pausar "atualizando o motor"' dentro do repo e tente de novo.
  ok    rc 1
  ok    a recusa diz que o loop não está pausado
  ok    o repo continua intacto depois da recusa
-- (e2b) com PAUSAR, mas com modificação não commitada no motor: recusa --
  | ?? scripts/orquestrador/nao-commitado.txt
  | RECUSADO: '/private/tmp/orq-verificar-dJqQSD/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA o caminho
  ok    o repo continua intacto depois da recusa 3
-- (e3) --atualizar com PAUSAR e motor limpo: atualiza e fica idêntico --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-dJqQSD/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-dJqQSD/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-dJqQSD/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
  ok    o lib.sh do repo é o do kit
  ok    docs/orquestrador/skill/VERSAO carimbado
  ok    imprime a linha de commit com pathspec explícito
  ok    docs/fila/** intacta
  ok    o PAUSAR do repo continua lá (o kit não retoma o loop por conta própria)

== (f) arquivo só do repo sobrevive ao --atualizar e aparece como 'só no repo' ==
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-q0yBCu/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-q0yBCu/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | só no repo  scripts/orquestrador/so-do-repo.py
  | 
  | 1 diferença(s)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-q0yBCu/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 1 (há 'só no repo' — o verificador do fim conta como diferença)
  ok    so-do-repo.py SOBREVIVEU
  ok    listado como 'só no repo'

== (g) --atualizar recusa com scripts/roadmap/ sujo, e --forcar passa ==
  |  M scripts/roadmap/lint-mapa.py
  | RECUSADO: '/private/tmp/orq-verificar-AlE4As/repo' tem modificação não commitada no motor (acima). Commite ou descarte antes — ou repita com --forcar, que apaga isso.
  ok    rc 1
  ok    a recusa diz que há modificação não commitada
  ok    a recusa NOMEIA scripts/roadmap/lint-mapa.py
  ok    o lint-mapa.py do repo continua intacto depois da recusa
-- (g2) com --forcar: passa, avisa, e o lint-mapa.py vira o do kit --
  |  M scripts/roadmap/lint-mapa.py
  | --forcar: passando por cima de 1 caminho(s) modificado(s) no motor do repo.
  | 
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-AlE4As/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-AlE4As/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-AlE4As/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    avisa que passou por cima
  ok    o lint-mapa.py do repo é o do kit

== (h) --verificar/--atualizar cobrem os testes do harness ==
-- (h1) --verificar acusa o teste envelhecido --
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-LC2JHB/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | diferente   test/orquestrador-pacotes.test.ts
  | 
  | 1 diferença(s)
  ok    rc 1
  ok    lista 'diferente test/orquestrador-pacotes.test.ts'
  ok    não cita test/produto.test.ts (teste do produto não é motor)
-- (h2) --atualizar corrige, e o teste do produto sobrevive --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-LC2JHB/repo
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-LC2JHB/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-verificar-LC2JHB/repo
  |   git add scripts/orquestrador scripts/orq scripts/roadmap docs/orquestrador/skill \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'motor: kit 2.1.0-dev'
  ok    rc 0
  ok    test/orquestrador-pacotes.test.ts do repo é o do kit
  ok    test/produto.test.ts intacto
  ok    o --verificar do fim diz 'idêntico ao kit <VERSAO>'
-- (h3) a suíte do REPO passa com os testes que o kit instalou --
  |    ✓ teto de adiamento por ambiente > reaberto depois do teto: começa do zero (não bloqueia de novo no primeiro adiamento) 7494ms
  | 
  |  Test Files  21 passed (21)
  |       Tests  186 passed (186)
  |    Start at  15:55:41
  |    Duration  40.58s (transform 432ms, setup 0ms, collect 10.83s, tests 141.23s, environment 3ms, prepare 1.36s)
  ok    npx vitest run no repo: rc 0

== (i) --atualizar --migrar: .orq-pause -> PAUSAR, liberações -> v2 ==
-- (i1) --migrar --dry-run: mostra tudo e NÃO escreve --
  | ATUALIZAR  --dry-run: NADA é escrito; a lista abaixo é o que mudaria.
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-verificar-YvhyJD/repo
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | === MIGRAR docs/fila/** (--dry-run: NADA é escrito) ===
  | 
  | --- pausa: docs/fila/.orq-pause -> docs/fila/PAUSAR ---
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | (--dry-run: nada foi renomeado)
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-YvhyJD/repo/docs/fila/liberacoes.json)
  |            --dry-run: NADA é escrito
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | --- /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/liberacoes.json (atual)
  | +++ /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/liberacoes.json (v2 proposto)
  | @@ -1,9 +1,35 @@
  |  {
  | +  "$schema_versao": 2,
  |    "tokens": [
  | -    "migration-0255-aplicada",
  | -    "migration-0259-aplicada",
  | -    "migration-0260-aplicada",
  | -    "migration-0261-aplicada",
  | -    "migration-0262-aplicada"
  | +    {
  | +      "token": "humano:migration-0255-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0259-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0260-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0261-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    },
  | +    {
  | +      "token": "humano:migration-0262-aplicada",
  | +      "liberado_em": "desconhecido",
  | +      "por": "desconhecido",
  | +      "origem": "v1:tokens"
  | +    }
  |    ]
  |  }
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-YvhyJD/repo/docs/fila)
  |            --dry-run: NADA é escrito
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-YvhyJD/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.json
  |                --dry-run: NADA é escrito
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | --- /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.json (oficial, INTOCADO)
  | +++ /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.proposto.json (proposto)
  | @@ -2,17 +2,14 @@
  |    "$schema_versao": 2,
  |    "descricao": "Config do repo de FIXTURE do kit. Mínimo por construção: só as chaves que o motor LÊ hoje, levantadas por grep no disco (grep -ohE \"cfg '[^']*'\" scripts/orquestrador/*.sh, mais os acessos diretos dos .ts). Cada chave traz um comentário _<chave> com a procedência do valor.",
  |    "_procedencia_geral": "Valores de forma vêm de doutrina/templates/config.json; valores de conteúdo, de _referencia-ci/000-config.ci.json (o config REAL do conteudos-infinitos @711ab5e) quando um teste do motor cobra o número exato; o resto é do fixture.",
  | -
  |    "branch_alvo": "staging-auto",
  |    "_branch_alvo": "doutrina/templates/config.json:branch_alvo — lido por lib.sh:53 (CFG_BRANCH_ALVO).",
  |    "branch_protegida": "main",
  |    "_branch_protegida": "local-loop.sh:28 lê '.branch_protegida' (o template chama de branch_principal; o motor lê ESTE nome).",
  | -
  |    "max_retries": 2,
  |    "_max_retries": "_referencia-ci/000-config.ci.json:max_retries — lido por lib.sh:54 e decisao.ts:273.",
  |    "cooldown_minutes": 60,
  |    "_cooldown_minutes": "_referencia-ci/000-config.ci.json:cooldown_minutes — lido por lib.sh (cooldown_arm).",
  | -
  |    "politica_adiamento": {
  |      "regra": "Falha de INFRAESTRUTURA adia. Nunca reprova.",
  |      "causas_que_adiam": [
  | @@ -32,7 +29,6 @@
  |      }
  |    },
  |    "_politica_adiamento": "As 7 causas, na ordem, de _referencia-ci/000-config.ci.json — test-lib-config.sh:58 cobra exatamente 7 e :61 cobra a do juiz pelo nome; decisao.ts:113 itera a lista.",
  | -
  |    "politica_retry": {
  |      "por_causa": {
  |        "diff_cap": {
  | @@ -55,17 +51,14 @@
  |      "proibicao": "NUNCA escalar modelo por falha de tamanho (diff_cap) nem por violação de fronteira (enforcement)."
  |    },
  |    "_politica_retry": "_referencia-ci/000-config.ci.json:politica_retry, sem os campos _porque — decisao.ts:277 indexa por_causa[causa] e rejeita config que mande escalar por diff_cap/enforcement.",
  | -
  |    "migrations_dir": "db/migrations",
  |    "_migrations_dir": "enforcement-core.ts:128 usa para classificar .sql como artefato inerte. O fixture não tem banco; o diretório existe só para a chave não ser nula.",
  |    "sql_pendente_dir": "docs/sql-pendente",
  |    "_sql_pendente_dir": "enforcement-core.ts:128, mesmo par que migrations_dir.",
  | -
  |    "worktrees_dir": "../_worktrees",
  |    "_worktrees_dir": "RELATIVO ao checkout principal (lib.sh:77). Como o fixture é instanciado em <tmp>/repo, isto resolve para <tmp>/_worktrees — nunca ~/Projetos/_worktrees.",
  |    "worktrees_prefixo": "fx-",
  |    "_worktrees_prefixo": "decisao.ts:363. 'fx-' em vez do 'ci-' do conteudos-infinitos: prefixo diferente é o que impede colisão de nome de worktree entre repos.",
  | -
  |    "runs_dir": "docs/fila/runs",
  |    "_runs_dir": "doutrina/templates/config.json:runs_dir — lib.sh:72 (RUNS_BASE).",
  |    "liberacoes_file": "docs/fila/liberacoes.json",
  | @@ -74,7 +67,6 @@
  |    "_decisoes_file": "doutrina/templates/config.json — lib.sh:723.",
  |    "pausar_file": "docs/fila/PAUSAR",
  |    "_pausar_file": "doutrina/templates/config.json — lib.sh:615 (kill switch em arquivo).",
  | -
  |    "modelos": {
  |      "classificador": "haiku",
  |      "executor": "sonnet",
  | @@ -88,7 +80,6 @@
  |    "avaliador_model": "opus",
  |    "retry_final_model": "opus",
  |    "_modelos": "Escada de _referencia-ci/000-config.ci.json (sonnet/opus/opus). juiz.ts:76 lê modelos.juiz_alto/juiz_baixo; executor.sh:149 e decisao.ts:292 leem os três aliases v1.",
  | -
  |    "restricao_execucao": {
  |      "ativa": false,
  |      "tickets_permitidos": [],
  | @@ -97,31 +88,26 @@
  |      "desbloqueio": "preencha executor_model/avaliador_model/retry_final_model em docs/fila/000-config.json"
  |    },
  |    "_restricao_execucao": "decisao.ts:71 lê o objeto inteiro; executor.sh:154 lê .desbloqueio na mensagem de aborto. Inativa aqui: nenhum papel é PENDENTE_*.",
  | -
  |    "diff_cap_linhas": 600,
  |    "_diff_cap_linhas": "600 de _referencia-ci/000-config.ci.json. test-lib-config.sh cobra só a forma (bate com o arquivo, inteiro positivo), não o número: o 2500 do Actus também passa.",
  |    "claude_timeout_secs": 900,
  |    "_claude_timeout_secs": "Metade do 1800 do CI: o ticket do fixture é de ~40 linhas e um timeout longo só atrasa o diagnóstico quando o agente trava.",
  |    "claude_max_turns": 40,
  |    "_claude_max_turns": "doutrina/templates/config.json:claude_max_turns (o CI usa 80; 40 basta para um ticket de dois arquivos).",
  | -
  |    "preflight_probe": true,
  |    "_preflight_probe": "LIGADO, e não por gosto: executor.sh:146 sai cedo quando o valor é `false`, e test-retry-worktree.sh:216 exercita `probe_modelos` inteiro (com `claude_run` stubado, sem chamada paga) contra ESTE config — com `false` a seção 4 daquele teste cai em 5 falhas. O preço é uma sondagem real de ~60s ('responda apenas: ok') por drenagem de verdade, que o gate de orçamento mede e o custo.json registra.",
  |    "preflight_env_keys": [],
  |    "_preflight_env_keys": "Vazio: executor.sh:123 itera esta lista e aborta por env faltando. O fixture não tem serviço externo nenhum.",
  | -
  |    "commit_checkpoint": {
  |      "obrigatorio": true,
  |      "quando": "a cada unidade lógica que passe typecheck + teste — não só no fim do ticket",
  |      "_regra": "Passou typecheck e teste? Commita. Trabalho verificado e não commitado não existe."
  |    },
  |    "_commit_checkpoint": "executor.sh lê .commit_checkpoint.quando e ._regra para montar o prompt; texto de _referencia-ci/000-config.ci.json.",
  | -
  |    "repo_origin_deve_conter": "fixture/orq-fixture",
  |    "_repo_origin_deve_conter": "Casa o origin FALSO que o scripts/kit/fixture.sh registra (git@example.invalid:fixture/orq-fixture.git). executor.sh:104-108 aborta o run inteiro se o origin não contiver isto.",
  |    "ambiente_id": "orqfixture",
  |    "_ambiente_id": "executor.sh:111-114 compara com o ref extraído de SUPABASE_URL do .env.local, que o fixture.sh escreve como https://orqfixture.supabase.co. test-lib-config.sh:48 cobra que não seja vazio nem null.",
  | -
  |    "zona_proibida": {
  |      "descricao": "Tudo que o loop NUNCA escreve. Globs relativos à raiz do repo.",
  |      "revisado_humano": true,
  | @@ -143,7 +129,6 @@
  |      "no_write_tables": "TODAS"
  |    },
  |    "_zona_proibida": "Recorte do de _referencia-ci/000-config.ci.json: enforcement-core.ts:211-215 lê no_write_paths + no_write_credenciais.padroes, e :212 trata no_write_tables == 'TODAS' como negação total. Sem banco no fixture, 'TODAS' é a leitura honesta.",
  | -
  |    "paths_harness": [
  |      "scripts/orquestrador/**",
  |      "docs/orquestrador/**",
  | @@ -151,7 +136,6 @@
  |      ".claude/**"
  |    ],
  |    "_paths_harness": "doutrina/templates/config.json:paths_harness, sem mudança — o motor vendorizado mora nos mesmos caminhos aqui. Lido pelo check 5 de scripts/roadmap/lint-mapa.py.",
  | -
  |    "_execucao_dos_gates": {
  |      "ordem_obrigatoria": [
  |        "typecheck",
  | @@ -160,7 +144,6 @@
  |      "interrupcao": "NAO_VALE_PARCIALMENTE"
  |    },
  |    "_ordem": "gates.ts:176-178 ordena .gates[] por esta lista e ERRA se divergir. Dois gates porque o package.json do fixture tem dois scripts: typecheck e test.",
  | -
  |    "gates": [
  |      {
  |        "nome": "typecheck",
  | @@ -177,18 +160,15 @@
  |    ],
  |    "_gates_papel": "Chave OPCIONAL por gate (peça K6b): \"papel\": \"typecheck\" | \"testes\" | \"build\" | \"lint\". É ela que decide o que a linha GATE da trilha diz sobre cada gate. Quando ausente, o papel é INFERIDO do nome (executor.sh, papel_do_gate: *typecheck*/*tsc*/*types* → typecheck; *lint* → lint; *build*/*compil* → build; *test*/*spec* → testes). Declare-a quando o nome do gate não disser o papel — um gate chamado `verificacao` sai como nao-configurado sem ela. Papel que não existe em gate nenhum do config aparece na trilha como `nao-configurado`, nunca `nao-rodou`.",
  |    "_gates": "cmd = os scripts do fixture/package.json, verificados no disco. tipo exit_code (não baseline): o fixture nasce com 0 erro de tipo e 3 testes verdes, então não há erro herdado a tolerar.",
  | -
  |    "launchd": {
  |      "label": "com.orqfixture.orquestrador",
  |      "start_interval": 600
  |    },
  |    "_launchd": "Peça K6c. `label` é o Label do job do launchd e NÃO tem default: instalar-launchd.sh RECUSA sem ele (o CI usa com.conteudos.orquestrador). Um label por repo — para o launchd, dois repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o primeiro. `start_interval` é o StartInterval em segundos; ausente vira 1800, que é o valor MEDIDO em 06/set/2026 (a medição está no com.orquestrador.plist.template). 600 aqui só para o teste provar que o número sai do config e não do template — o fixture nunca carrega job nenhum.",
  | -
  |    "canal_notificacao": "arquivo",
  |    "_canal_notificacao": "lib.sh:820-823: qualquer valor diferente de 'notificacao_nativa' faz a notificação ficar SÓ no arquivo runs/notificacoes.log. É o padrão que a peça K10 quer para todo repo.",
  |    "push_suprimido": true,
  |    "_push_suprimido": "O origin do fixture é inválido de propósito (example.invalid). Publicar daqui não é opção — e lib.sh:staging_linha já imprime 'push suprimido' no snapshot.",
  | -
  |    "juiz": {
  |      "diff_max_baixo": 300,
  |      "max_tokens_veredicto": 300,
  | @@ -207,7 +187,6 @@
  |      ]
  |    },
  |    "_juiz": "juiz.ts:64-76 lê os quatro campos. paths_alto_risco VAZIO: o fixture só tem src/ e test/, e listar glob que não casa nada seria config decorativa. As palavras são as do doutrina/templates/config.json.",
  | -
  |    "gate_ticket": {
  |      "juiz_para_humano": false,
  |      "max_paths_allowlist": 8,
  | @@ -247,10 +226,11 @@
  |        "wget",
  |        "> ",
  |        ">>"
  | -    ]
  | +    ],
  | +    "modo_pre_voo": "aviso",
  | +    "severidade": {}
  |    },
  |    "_gate_ticket": "gate-ticket.ts:carregarCfg lê SÓ proibido_no_cmd e cmd_prefixos_permitidos (os dois nomes conferidos no disco). Os prefixos são o subconjunto do doutrina/templates/config.json que existe neste fixture: sem npm run build, sem npm run lint, sem curl (não há servidor local).",
  | -
  |    "orcamento": {
  |      "usd_dia": 5,
  |      "tokens_dia": 2000000,
  | @@ -264,7 +244,6 @@
  |      }
  |    },
  |    "_orcamento": "campos_usage copiados de _referencia-ci/000-config.ci.json (nomes confirmados lá por sondagem real de claude -p --output-format json). Os TETOS são do fixture e propositalmente baixos: usd_ticket 1 contra os 10 do CI — um ticket de dois arquivos que passe de US$ 1 é sintoma, não trabalho.",
  | -
  |    "executor": {
  |      "auto_verificacao_max": 2,
  |      "modo_arquiteto_para_alto": false,
  | @@ -273,7 +252,6 @@
  |      "trailer_commit": "Orq-Ticket"
  |    },
  |    "_executor": "local-loop.sh:95 lê .executor.trailer_commit para o trailer do merge commit; o resto é o default de doutrina/templates/config.json.",
  | -
  |    "proibicoes_absolutas": {
  |      "regras": [
  |        "nunca push na branch principal",
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /var/folders/_7/dqmkt89n7lg_9sf9qkzm7fxr0000gn/T/orq-cfg-FGx0lE/000-config.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | --- .gitignore: o que o repo deve ignorar ---
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | --- orq validar --pendentes (só relatório; NADA é corrigido) ---
  ok    rc 0
  ok    o dry-run mostra o motivo que seria preservado
  ok    o dry-run traz o DIFF das liberações, não um resumo
  ok    o .orq-pause continua lá e nenhum PAUSAR foi criado
  ok    liberacoes.json intacto
  ok    nenhum .bak foi criado
-- (i2) --migrar aplica: renomeia preservando o motivo, e migra as liberações --
  | ATUALIZAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  | 
  | copiado: scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (+ VERSAO 2.1.0-dev)
  | copiado: 20 teste(s) de harness e 7 fixture(s) de teste (peça K8d)
  | 
  | 
  | === MIGRAR docs/fila/** (GRAVANDO, com .bak) ===
  | 
  | motivo preservado: 2026-09-05 09:12 | pausado para aplicar migration 0255
  | RENOMEADO.
  | 
  | MIGRAR-LIBERACOES  liberacoes.json (/private/tmp/orq-verificar-YvhyJD/repo/docs/fila/liberacoes.json)
  | forma no disco: tokens[]: 5 (5 string, 0 objeto, 5 sem o prefixo humano:) · sem $schema_versao
  | 5 entrada(s) lida(s) → 5 token(s) único(s) em v2
  | nota: 5 token(s) sem data no disco: liberado_em = 'desconhecido'. A migração NÃO inventa data — 'origem' diz de onde cada registro veio
  | 
  | @@ -1,9 +1,35 @@
  | 
  | GRAVADO. Cópia do estado anterior em /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/liberacoes.json.bak
  | 
  | MIGRAR-TICKETS  fila (/private/tmp/orq-verificar-YvhyJD/repo/docs/fila)
  | 1 arquivo(s) de ticket em /private/tmp/orq-verificar-YvhyJD/repo/docs/fila (regra do motor: [0-9]*.md, sem descer em rascunhos/ nem tocar _TEMPLATE.md)
  | 
  | nenhum ticket pendente a migrar.
  | 
  | MIGRAR-CONFIG  /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.json
  | $schema_versao já era 2
  | renome avaliador_model → modelos.juiz_alto: NÃO aplicado, 'modelos.juiz_alto' já existe com valor próprio
  | renome avaliador_model → modelos.juiz_baixo: NÃO aplicado, 'modelos.juiz_baixo' já existe com valor próprio
  | nova gate_ticket.modo_pre_voo = "aviso" (política do motor, não do repo). executor.sh:1052, passo 5b do drive_ticket (porte do Actus, c404986 e 624). O pré-voo do gate de ticket entra em repo que já tem fila, e regra nova de critério (grep -q em pipe, vitest textual, exemplos_regex) reprovaria tickets escritos antes dela: 'aviso' põe as violações no log e na trilha sem bloquear. Quem quer o bloqueio troca para 'bloqueia' no próprio config.
  | nova gate_ticket.severidade = {} (política do motor, não do repo). gate-ticket.ts:1045 (lerSeveridade) e gate-ticket.ts:150 (severidadeDe), etapa 7d-1b. Objeto VAZIO = vale a tabela REGRAS do motor, que é a decisão da calibração de 25/09 (ERRO só com zero falso positivo nos done dos três repos). A chave nasce vazia para ficar à vista de quem abre o config: rebaixar ou subir uma regra ('6q': 'erro') é decisão do repo, e o motor recusa alto regra ou valor que não conhece.
  | 
  | @@ -2,17 +2,14 @@
  | @@ -32,7 +29,6 @@
  | @@ -55,17 +51,14 @@
  | @@ -74,7 +67,6 @@
  | @@ -88,7 +80,6 @@
  | @@ -97,31 +88,26 @@
  | @@ -143,7 +129,6 @@
  | @@ -151,7 +136,6 @@
  | @@ -160,7 +144,6 @@
  | @@ -177,18 +160,15 @@
  | @@ -207,7 +187,6 @@
  | @@ -247,10 +226,11 @@
  | @@ -264,7 +244,6 @@
  | @@ -273,7 +252,6 @@
  | 
  | PROPOSTO gravado em /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.proposto.json. O oficial NÃO foi tocado.
  | 
  | orq config sobre o PROPOSTO (rc 0):
  | CONFIG   /private/tmp/orq-verificar-YvhyJD/repo/docs/fila/000-config.proposto.json
  | 0 violações — o config está preenchido e as chaves que o motor lê estão lá.
  | 
  | O config NÃO foi aplicado, e isso é a peça funcionando. Passo humano:
  | 
  | ok       docs/fila/PAUSAR já é ignorado
  | ok       docs/fila/runs/ já é ignorado
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | commit sugerido, no repo, com pathspec explícito:
  | 
  | e um SEGUNDO commit, separado, para os dados migrados:
  | 
  | Os `.bak` NÃO entram em commit nenhum: são rede local, e o git já é o backup
  | de tudo que estava versionado. Apague-os quando o diff estiver revisado.
  ok    rc 0
  ok    .orq-pause virou PAUSAR
  ok    o MOTIVO foi preservado byte a byte
  ok    liberacoes.json em v2
  ok    o token ganhou o prefixo humano:
  ok    .bak tem o conteúdo ANTERIOR, byte a byte
  ok    o .gitignore do repo NÃO foi editado
  ok    sugere um SEGUNDO commit, separado, para os dados migrados
-- (i3a) M1: a SEGUNDA passada recusa sobrescrever o proposto da primeira --
  ok    rc 1 (recusa, não erro)
  ok    o instalador REPASSA a recusa
  ok    a mensagem dá o nome que a revisão humana deve usar
  ok    o proposto sobrevive byte a byte
-- (i3) rodar de novo é no-op, e o .bak NÃO é sobrescrito --
  ok    rc 0
  ok    a migração diz que não há o que fazer
  ok    a pausa também é no-op
  ok    .bak preservado (é o estado ANTES da PRIMEIRA migração)
-- (i4) .orq-pause E PAUSAR juntos: NÃO migra, e diz por quê --
  ok    recusa migrar com os dois presentes
  ok    o PAUSAR existente não foi sobrescrito
-- (i5) o relato de .gitignore pergunta ao GIT, e nomeia o que falta --
  ok    acusa docs/fila/PAUSAR faltando
  ok    acusa docs/fila/runs/ faltando
  ok    diz que não edita o .gitignore do repo
  ok    runs/ ignorado por runs/.gitignore conta como ok (é como o CI faz)
-- (i5b) K8b-4: o config é PROPOSTO, nunca aplicado pelo instalador --
  ok    relata o renome supabase_project_id → ambiente_id
  ok    relata a conversão do tipo do gate
  ok    c0_intocavel vira item NOMEADO do relatório
  ok    grita que zona_proibida continua ausente
  ok    o 000-config.json OFICIAL não foi tocado
  ok    000-config.proposto.json gravado ao lado
  ok    o proposto está em schema 2
  ok    c0_intocavel atravessa INTACTA para o proposto
  ok    diz que não aplicou, e dá os 4 passos humanos
-- (i5c) K8b-5: bloco JSON dos pendentes, prosa intacta byte a byte --
  ok    recon_esperado virou recon no ticket real
  ok    o nome antigo saiu do bloco
  ok    a PROSA é byte a byte a mesma
  ok    nenhum .bak de ticket
  ok    o relatório roda o orq validar sobre a fila migrada
  ok    o orq validar não CORRIGIU o ticket (segunda passada é no-op)
-- (i6) --dry-run PREVÊ a recusa em vez de dizer que está tudo bem --
  ok    o dry-run continua saindo 0 (ele não é o gate)
  ok    o dry-run avisa que o --atualizar de verdade recusaria
  ok    e diz o motivo (sem pausa)

== (j) --novo: repo git sem docs/fila ==
-- (j1) o repo nasce inteiro --
  | NOVO       kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-novo-clfQSg
  | 
  | criado     scripts/orquestrador/ · scripts/orq · scripts/roadmap/ · docs/orquestrador/skill/ (VERSAO 2.1.0-dev)
  | criado     20 teste(s) de harness e 7 fixture(s) (peça K8d)
  | 
  | criado     docs/fila/rascunhos/.gitkeep
  | criado     docs/fila/000-config.json
  | criado     docs/fila/_TEMPLATE.md
  | criado     docs/fila/decisoes-pendentes.md
  | criado     docs/fila/liberacoes.json (v2 vazio)
  | criado     docs/roadmap/mapa.json
  | criado     docs/roadmap/MAPA.md
  | criado     docs/orquestrador/PLAYBOOK.md
  | criado     docs/orquestrador/PECAS.md
  | escrito    .gitignore (+2 linha(s))
  | criado     docs/fila/runs/.gitignore
  | criado     docs/fila/runs/custo.json
  | 
  | VERIFICAR  kit 2.1.0-dev (/Users/lucasantos/Projetos/_worktrees/kit-mig-a)
  |            repo /private/tmp/orq-novo-clfQSg
  | 
  | carimbo    2.1.0-dev
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  | 
  | --- orq config (o formulário ainda está em branco; é assim que ele nasce) ---
  | CONFIG   /private/tmp/orq-novo-clfQSg/docs/fila/000-config.json
  |   branch_protegida: placeholder não preenchido: "<a branch que o loop NUNCA empurra — ex.: main>"
  |   worktrees_prefixo: placeholder não preenchido: "<prefixo curto das worktrees deste repo — ex.: ci-, os-, fx->"
  |   migrations_dir: placeholder não preenchido: "<ex: supabase/migrations | db/migrations>"
  |   preflight_env_keys[0]: placeholder não preenchido: "<ENV_OBRIGATORIA_1>"
  |   preflight_env_keys[1]: placeholder não preenchido: "<ENV_OBRIGATORIA_2>"
  |   juiz.paths_alto_risco[0]: placeholder não preenchido: "<ex: supabase/**>"
  |   juiz.paths_alto_risco[1]: placeholder não preenchido: "<ex: src/auth/**>"
  |   juiz.paths_alto_risco[2]: placeholder não preenchido: "<ex: src/billing/**>"
  |   gate_ticket.servidor_local_cmd: placeholder não preenchido: "<ex: npm run dev -- --port 3000 | vazio se não houver critério HTTP; sem ele, remova os prefixos curl>"
  |   sentinela.smoke_cmd: placeholder não preenchido: "<ex: curl -sf http://localhost:3000/api/health>"
  |   orcamento.campos_usage.custo_usd: placeholder não preenchido: "<nome do campo de custo no JSON de claude -p --output-format json, confirmado no pré-voo cat. 8>"
  |   orcamento.campos_usage.tokens_in: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_out: placeholder não preenchido: "<campo>"
  |   orcamento.campos_usage.tokens_cache: placeholder não preenchido: "<campo>"
  |   relatorio.canal: placeholder não preenchido: "<notificacao_nativa | webhook_url | email>"
  |   repo_origin_deve_conter: placeholder não preenchido: "<org/repo>"
  |   ambiente_id: placeholder não preenchido: "<ref do banco/projeto, ou vazio se não aplicável>"
  |   zona_proibida.no_write_tables[0]: placeholder não preenchido: "<tabela_compartilhada_1>"
  |   zona_proibida.no_write_prefixes[0]: placeholder não preenchido: "<prefixo_proibido_>"
  |   zona_proibida.readonly_ok[0]: placeholder não preenchido: "<tabelas que o loop pode SELECT mas nunca escrever>"
  |   zona_proibida.excecoes_os_owned[0]: placeholder não preenchido: "<tabelas de nome parecido mas de propriedade deste repo>"
  |   launchd.label: placeholder não preenchido: "<ex: com.suaorg.orquestrador — OBRIGATÓRIO, um por repo>"
  |   gates[0].cmd: placeholder não preenchido: "<ex: npx tsc --noEmit>"
  |   gates[0].baseline_scope_regex: placeholder não preenchido: "<regex de arquivos com erros herdados tolerados, ou vazio>"
  |   gates[1].cmd: placeholder não preenchido: "<ex: npx vitest run>"
  |   gates[2].cmd: placeholder não preenchido: "<ex: npm run build>"
  |   lint.cmd: placeholder não preenchido: "<ex: npx eslint . --max-warnings=999999>"
  | 
  | 27 violação(ões)
  | 
  | PRÓXIMOS PASSOS, nesta ordem:
  |   1. preencha docs/fila/000-config.json — cada placeholder <...> acima é uma decisão local
  |   2. bash scripts/orq config           # tem de sair 0 violações
  |   3. pré-voo: docs/orquestrador/skill/references/pre-voo.md, categorias 0 a 6
  |   4. um ticket-fixture trivial atravessa o loop, com merge na staging
  |   5. SÓ ENTÃO agendar: bash scripts/orquestrador/instalar-launchd.sh
  |      (ele RECUSA sem launchd.label, e o label é um dos placeholders do passo 1)
  | 
  | commit sugerido, no repo, com pathspec explícito:
  |   cd /private/tmp/orq-novo-clfQSg
  |   git add .gitignore scripts/orquestrador scripts/orq scripts/roadmap docs \
  |     test/fixtures/orq-harness.ts test/orquestrador-morte-por-sinal.test.ts test/orquestrador-pacotes.test.ts test/orquestrador-prefixo-aspas.test.ts test/orquestrador-prompt-como-rodar.test.ts test/orquestrador-reparo-trilha.test.ts test/orquestrador-trilha-uma-linha.test.ts test/orquestrador-gate-grep-q.test.ts test/orquestrador-gate-vitest-aviso.test.ts test/orquestrador-contexto-juiz.test.ts test/orquestrador-retry-feedback-juiz.test.ts test/orquestrador-gates-fonte-unica.test.ts test/orquestrador-base-vermelha.test.ts test/orquestrador-fila-json-quebrado.test.ts test/orquestrador-arquivo-solto.test.ts test/orquestrador-contexto-juiz-fixtures.test.ts test/orquestrador-gate-regex-exemplos.test.ts test/orquestrador-criterio-merito.test.ts test/orquestrador-ambiente-merito.test.ts test/orquestrador-teto-adiamento-ambiente.test.ts test/fixtures/criterios/lote8-246-250.json test/fixtures/trilha/events-quebrado.log test/fixtures/trilha/permissao-negada-234.cmd test/fixtures/gate-ticket-grep-q/901-fixture-grep-q-em-pipe.md test/fixtures/gate-ticket-grep-q/902-fixture-grep-c-controle.md test/fixtures/gate-ticket-grep-q/903-fixture-488-antigo.md test/fixtures/orquestrador-base-vermelha/gates-510c-attempt-0.txt 
  |   git commit -m 'orquestrador: instalação inicial, kit 2.1.0-dev'
  ok    rc 0
  ok    criou docs/fila/000-config.json
  ok    criou docs/fila/_TEMPLATE.md
  ok    criou docs/fila/liberacoes.json
  ok    criou docs/fila/decisoes-pendentes.md
  ok    criou docs/fila/rascunhos/.gitkeep
  ok    criou docs/roadmap/mapa.json
  ok    criou docs/roadmap/MAPA.md
  ok    criou docs/orquestrador/PLAYBOOK.md
  ok    criou docs/orquestrador/PECAS.md
  ok    criou docs/orquestrador/skill/SKILL.md
  ok    criou docs/orquestrador/skill/VERSAO
  ok    criou scripts/orq
  ok    criou scripts/orquestrador/lib.sh
  ok    criou scripts/roadmap/lint-mapa.py
  ok    criou test/fixtures/orq-harness.ts
  ok    criou docs/fila/runs/.gitignore
  ok    VERSAO carimbado
  ok    liberacoes.json nasce em v2
-- (j2) NADA de launchd: agendar é passo separado --
  ok    nenhum plist instanciado no repo
  ok    os próximos passos põem o agendamento por ÚLTIMO
-- (j3) orq config: só placeholders, NENHUMA chave ausente --
  ok    rc 1 (formulário em branco é config inválido, e tem de ser)
  ok    lista os placeholders
  ok    nenhuma chave obrigatória AUSENTE (o template só precisa ser preenchido)
-- (j4) --verificar: idêntico ao kit --
  | 
  | 
  | idêntico ao kit 2.1.0-dev
  ok    rc 0
  ok    idêntico ao kit
-- (j5) .gitignore: acrescenta o que falta, preserva o que havia --
  ok    a linha que já existia sobreviveu
  ok    acrescentou docs/fila/PAUSAR
  ok    docs/fila/runs/ é ignorado (o git confirma)
-- (j6) rodar de novo RECUSA: com fila, o verbo é --atualizar --
  ok    rc 1
  ok    a recusa diz por quê e aponta o --atualizar
-- (j7) repo que não é git: RECUSA antes de escrever qualquer coisa --
  ok    rc 1
  ok    a recusa nomeia a causa
  ok    não escreveu NADA no diretório recusado

== (k) T1 · sem node_modules/.bin/tsx ==
-- (k1) --atualizar RECUSA, nomeando o caminho e o comando --
  | RECUSADO: '/private/tmp/orq-sem-tsx-cXEBbU' não tem node_modules/.bin/tsx: o motor do orquestrador é TypeScript e nenhuma parte dele roda sem tsx. Instale a dependência de DESENVOLVIMENTO no repo, com o loop pausado, e repita: npm i -D tsx@^4.19.0   (ou o equivalente do gerenciador deste repo)
  ok    rc 1
  ok    diz RECUSADO
  ok    nomeia node_modules/.bin/tsx
  ok    dá a linha de instalação
-- (k2) --forcar NÃO dispensa (forçar copiaria um motor que não roda) --
  ok    rc 1 com --forcar
-- (k3) --dry-run SÓ AVISA: sai 0, prevê a recusa e não escreve nada --
  ok    rc 0 (o dry-run não é o gate)
  ok    prevê a recusa
  ok    e diz qual
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
```
