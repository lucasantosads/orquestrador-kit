# PLAYBOOK do Orquestrador — seed

> Memória viva do loop. **Todo incidente vira uma linha aqui, no mesmo commit que o corrige.**
> As lições abaixo já foram pagas com incidente real no repo de origem — este repo começa com elas, não do zero.

## Princípios
- **Código verifica, modelo julga.** Aprovação vem de comando executável; a opinião do modelo sobre o próprio trabalho não conta.
- **Amnésia por design.** Cada braço reconstrói o estado da fonte única (fila + git); nada de estado implícito entre rodadas.
- **Fail-fast por custo.** Cheque barato antes de gasto caro, sempre.
- **A fronteira é código.** Allowlist + guards físicos; prompt é desejo, enforcement é lei.
- **Fonte única de estado.** Fila/status/evidência num único checkout.

## Lições de campo (herdadas)
- **Faixa livre no disco ≠ faixa livre no ledger.** Antes de reservar faixa de migrations/IDs, checar reservas DOCUMENTADAS (CLAUDE.md, ledger, docs de arquitetura), não só `ls` no diretório. Reserva documentada de módulo futuro prevalece sobre disco vazio.
- **Pasta existente ≠ spec presente.** Um `mkdir` sobrevive a um `unzip` falho; preflight e pré-voo verificam CONTEÚDO dos arquivos (`test -s`, contagem em `git ls-files`), nunca só o diretório.
- **Headless não enxerga skill de chat.** `claude -p` via launchd/cron/CI só lê o que está no repo — a doutrina TEM que estar vendorizada em `docs/orquestrador/skill/` e o prompt do executor referencia a cópia local. Instalação que dependia de skill externa rodou sem spec.
- **Log ≠ verdade; git é o ground truth.** Um "aprovado" no log era outro ticket rodando de casa paralela.
- **Executor da casa errada cria ESTADO PARALELO** — dois estados que parecem válidos. Preflight de identidade é obrigatório e fatal.
- **Lock robusto = pid + idade máxima + cleanup em TODO caminho de saída** + auto-limpeza de órfão no início.
- **Deps referenciam o campo `id` do JSON, nunca o nome do arquivo.**
- **Campo fora do schema é ignorado em silêncio** — valide nomes contra o schema.
- **`tail -f` prende o terminal** — leitura pontual quando for encadear comandos.
- **Gerador de story ≠ gerador de ticket.** O gate é critério executável + verificação de fonte. "Existe no brief" ≠ existe no disco: todo nome de tabela é verificado no repo, inclusive em brief humano.
- **Nunca reinício forçado do serviço com run vivo** — checar lock/pid antes; reinício por cima = dois executores na mesma fila.
- **Parser do veredicto: falha de parse = adiado, nunca reprovação.** Incidente real: juiz aprovou, parser declarou ilegível, trabalho bom foi descartado. Preserve sempre o output CRU do juiz.
- **Branch de ticket bloqueado não é deletada** até revisão humana — o commit é evidência recuperável (sha fica em runs/, mas branch viva é mais barata de auditar).
- **Writeback externo é upsert de seção única**, nunca append (duplica a cada sync).
- **Relatório com credencial ausente cai para arquivo local** — falha silenciosa esconde o placar.
- **Allowlists sobrepostas entre tickets pendentes exigem dep explícita** — senão o segundo nasce de base velha e o merge conflita no registry compartilhado.
- **Critério de UI cobra integração, não existência** — componente criado mas nunca importado/montado passa em "arquivo existe" e falha em produção; o juiz deve cobrar o import/mount.
- **Merge manual guiado: resolução completa ANTES de qualquer add/commit** — placeholder no meio do fluxo mandou markers de conflito pro origin.
- **Build ≠ typecheck** em setups com `ignoreBuildErrors` — o gate real é o typecheck explícito contra baseline.

## Regras v2 (pagas por design, não por incidente; rebaixe se a evidência contradisser)
- **Candidato não é ticket.** Gerado por máquina entra como `candidato`; só o gate promove. O gate descarta, nunca conserta.
- **Teste vermelho antes de implementar.** Critério `alvo` que já passa não mede nada; é a raiz de "aprovado sem fazer nada". Vermelho pelo motivo errado (rc 126/127, timeout, sintaxe) é `invalido` e descarta.
- **Planejador decompõe, não inventa.** Frente que não está `pronta` não existe para ele. Dúvida vira `decisoes-pendentes.md`, não escopo.
- **Sinal só vira ticket com threshold + baseline + quarentena.** Arquivo mergeado pelo loop nas últimas 24h ⇒ decisão humana, não ticket; senão o loop oscila corrige-quebra-corrige.
- **Orçamento é gate.** Estourou = adiado + aviso. "Só este" é como se estoura.
- **Contexto por script, com cap.** Executor nunca explora o repo; recebe pack derivado do ticket + assinaturas do repo map.
- **Reprovação mecânica não gera retry.** Fora da allowlist, acima do cap, zona proibida ⇒ `refatiar` de volta a quem escreveu.
- **Harness, roadmap e doutrina nunca passam pela fila**, nem como bug da sentinela.
- **Planejador e sentinela são fases da drenagem**, sob o mesmo lock. Daemon paralelo deles = segundo estado.
- **Prefixo estável no prompt ou o cache não existe.** Timestamp/pid/tentativa sempre no fim. Medir `tokens_cache/tokens_in`.
