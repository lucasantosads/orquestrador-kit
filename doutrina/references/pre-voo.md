# Pré-voo — checklist GO/NO-GO antes de qualquer run

Rode ANTES da primeira drenagem e sempre que o ambiente mudar (máquina nova, repo novo, upgrade de toolchain). Qualquer item NO-GO **bloqueia o run**: execute a remediação, re-cheque, só então avance. O local-loop deve re-executar os itens marcados ⚡ no início de TODA drenagem (são baratos e pegam regressão de ambiente).

Formato de cada item: **check** (comando) → **verde quando** → **se falhar** (remediação).

## 0 · Spec vendorizada ⚡
- `ls docs/orquestrador/skill/SKILL.md docs/orquestrador/skill/templates/ docs/orquestrador/skill/references/` → todos existem E têm conteúdo (`test -s`) → se falhar: vendorizar a skill (setup passo 1). **Pasta existente ≠ spec presente — verifique arquivos, nunca só o diretório** (incidente real: `mkdir` sobreviveu a um `unzip` falho e a pasta vazia passou por vendorizada).
- `git ls-files docs/orquestrador/skill/ | wc -l` → ≥ 5 → se falhar: os arquivos estão no disco mas não commitados; commitar antes de tudo.

## 1 · Identidade ⚡
- `git remote -v` → origin contém `repo_origin_deve_conter` do config → se falhar: você está no checkout errado; ABORTAR, nada de "corrigir" o remote.
- Extrair identificador do banco/ambiente do `.env`/`.env.local` → bate com `ambiente_id` → se falhar: checkout aponta para ambiente errado; ABORTAR.

## 2 · Git saudável
- `git --no-optional-locks status --short` → working tree limpa (ou sujeira conhecida e anotada) → se falhar: commitar/stashear a frente pendente ANTES; o loop não convive com trabalho solto.
- `find .git -name "*.lock"` → vazio → se falhar: locks órfãos de sessão morta; confirmar que nenhum processo git vive (`ps`), remover os locks, anotar no PLAYBOOK.
- Branch principal protegida de push do loop (config/servidor) → se falhar: proteger antes do primeiro run.
- Branch de staging (`branch_alvo`) existe ou o executor tem instrução de criá-la a partir da principal → se falhar: criar local, sem push até o primeiro aprovado.

## 3 · Toolchain (descoberta, nunca suposição)
- `command -v git jq` → ambos presentes → se falhar: instalar.
- `claude -p 'responda apenas OK'` → responde → se falhar: instalar/logar Claude Code (ou exportar API key no ambiente do agendador).
- **Package manager**: detectar pelo LOCKFILE COMMITADO (`git ls-files | grep -E 'pnpm-lock|package-lock|yarn.lock|bun.lockb'`) → exatamente um → se falhar (zero ou dois): decidir e commitar um só; dois lockfiles = build de produção imprevisível.
- **Runner de testes**: procurar config real (`vitest.config.*`, `jest.config.*`, script `test` no package.json ou equivalente da linguagem) → existe e roda → se falhar: a PRIMEIRA tarefa da montagem cria a suite mínima (ela vai carregar o teste do enforcement de qualquer jeito).
- **Build**: script real detectado e roda verde localmente → se falhar: consertar o build antes; o loop não estreia em cima de build vermelho.

## 4 · Gates medidos HOJE
- Typecheck: rodar o comando real, contar erros herdados, registrar número + escopo (regex) no config → baseline preenchido → se falhar: sem baseline medido não existe gate — medir é obrigatório, "zero" chutado reprova trabalho bom.
- Testes: suite roda (mesmo que pequena) → verde → se falhar: corrigir ou remover teste morto antes do primeiro run.

## 5 · Decisões locais completas
- `jq . docs/fila/000-config.json` → válido E `grep -c '<' 000-config.json` sem placeholders `<ASSIM>` → se falhar: completar as decisões do setup passo 2.
- Zona proibida revisada por HUMANO (não gerada e aceita no automático) → confirmação explícita → se falhar: revisar; na dúvida, proibir.
- Faixa de migrations do loop livre no diretório real (`ls` na faixa → vazia) **E sem reserva documental** (grep da faixa em CLAUDE.md/ledger/docs de arquitetura → nenhuma reserva de outro módulo) → se falhar em qualquer um: escolher outra faixa e registrar no config. Disco vazio ≠ faixa livre — reserva documentada de módulo futuro prevalece.

## 6 · Estrutura da fila ⚡
- `docs/fila/{_TEMPLATE.md,liberacoes.json,rascunhos/,runs/}` existem; `jq . liberacoes.json` válido → se falhar: criar (setup passo 3).
- Nenhum ticket na fila com allowlist sobreposta a outro pendente sem dep explícita → se falhar: adicionar `dependencias` entre eles.

## 7 · Agendamento (só depois do fixture aprovado)
- Fixture trivial atravessou o loop ponta a ponta e apareceu na staging → se falhar: não agendar; depurar a montagem com o fixture.
- Disparo duplo do agendador: o segundo morre no lock → se falhar: lock quebrado; consertar antes de deixar sozinho.
- Máquina do agendador: energia/sleep configurados conscientemente (o run dispara ao acordar) → anotado.

## 8 · Autoalimentação e custo (v2) ⚡ nos itens marcados
- `jq '."$schema_versao"' docs/fila/000-config.json` → `2` → se falhar: migrar config pelo `templates/config.json` (campos novos com default desligado).
- ⚡ `test ! -f docs/fila/PAUSAR` → ausente → se existir: alguém pausou de propósito; a drenagem encerra em `ocioso` com `MOTIVO pausado`, sem ser NO-GO. Registrar quem e por quê no PLAYBOOK antes de remover.
- ⚡ `jq '.loops' 000-config.json` → executor `ativo:true`; sentinela e planejador refletem a ordem de ativação (nunca planejador `auto` com sentinela desligada) → se falhar: corrigir a ordem.
- Modelos por papel: `jq '.modelos' 000-config.json` → forte só em `juiz_alto`, `juiz_ticket`, `retry_final`; aliases v1 (`executor_model`, `avaliador_model`, `retry_final_model`) iguais aos campos novos → se falhar: bug de config, corrigir.
- ⚡ Orçamento: `orq custo` lê `custo.json` do dia e compara com `orcamento.usd_dia`/`tokens_dia` → abaixo do teto → se falhar: drenagem encerra em `ocioso` com `MOTIVO orcamento` (não é NO-GO; é o gate funcionando).
- Contabilidade real: `claude -p 'responda OK' --output-format json` → o JSON traz campos de custo e usage (confirmar os NOMES na versão instalada e gravar no config em `orcamento.campos_usage`) → se falhar: sem usage não há gate de orçamento; NO-GO até resolver (versão do CLI ou API key com usage).
- `test -s docs/orquestrador/skill/EXECUTOR.md` e `wc -l` ≤ 60 → presente e curto → se falhar: copiar de `templates/EXECUTOR.md`; extrato acima de 60 linhas está virando SKILL.md de novo e mata o cache.
- Repo map: `test -s docs/orquestrador/REPO-MAP.md` e tamanho ≤ `contexto.cap_tokens_repo_map` (estimar por bytes/4) → se falhar: `orq mapa-repo`.
- Gate de ticket exercitado: rodar `orq gate <id>` num ticket HUMANO já na fila → passos 1 a 6 verdes E o teste vermelho classificou pelo menos 1 critério `alvo` como `vermelho_valido` → se falhar: o ticket humano está mal escrito (bom: o gate pegou antes de gastar) ou o gate está errado (ruim: corrigir no harness).
- Prefixos de comando: todo `cmd` de todo ticket pendente começa com um item de `gate_ticket.cmd_prefixos_permitidos` → se falhar: ajustar o ticket ou, se o comando é legítimo, adicionar o prefixo ao config com revisão humana.
- MAPA: `orq mapa lint` verde → se falhar: corrigir MAPA.md × mapa.json; o planejador não roda com lint vermelho.
- Paths do harness: `jq '.paths_harness' 000-config.json` cobre scripts do loop, `docs/orquestrador/**`, config e `.claude/**` → se falhar: completar; sem isso a sentinela pode abrir ticket para o próprio harness (regra 20).
- Sentinela (se `ativo`): `smoke_cmd` roda com rc 0 contra a staging atual; fontes externas (runtime errors, advisors) respondem com credencial READ-ONLY presente no ambiente do agendador → se falhar: desligar a fonte que falhou, nunca a sentinela inteira.
- Notificação: `DRENAGEM_FIM` de teste chega no canal do config OU cai no fallback em arquivo → se falhar: sem notificação não há modo contínuo.

## Veredicto
Monte a tabela item → GO/NO-GO → remediação pendente. **Só existe "GO" total ou "NO-GO com plano ordenado"** — não existe "quase pronto, roda assim mesmo". O custo de rodar sem pré-voo é sempre maior que o de completá-lo: cada item acima nasceu de um incidente pago.
