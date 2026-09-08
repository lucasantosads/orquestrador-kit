# PLAYBOOK do kit

> Memória viva do KIT — não do loop. O PLAYBOOK do loop
> (`doutrina/templates/PLAYBOOK-seed.md`) viaja para o repo instalado e fala do
> que acontece **dentro** de uma drenagem. Este fala do que acontece quando se
> constrói, testa e instala o motor.
>
> **Todo incidente vira uma entrada aqui, no mesmo commit que o corrige.**
> Formato do PLAYBOOK do CI (`conteudos-infinitos/docs/orquestrador/PLAYBOOK.md`,
> seção Registro): data em negrito, área entre parênteses, e o corpo respondendo
> quatro coisas na ordem — **causa**, **detecção**, **conserto**, **lição**.
> Entrada sem as quatro é anedota.

## Registro

- **2026-09-08 (incidente, launchd — instalador sequestrado por teste)**

  **O quê.** Das 12:24 às 14:05 o job `com.conteudos.orquestrador` do launchd —
  o job de PRODUÇÃO do conteudos-infinitos — apontou para um fixture do kit em
  `/private/tmp/orq-fixture-6qRp23`. O plist foi gravado às 12:29. Três ticks
  dispararam nesse intervalo e os três morreram com `rc 127` antes mesmo de
  escrever `launchd.log`. Nesse período o CI não drenou nada e nada avisou.

  **Causa.** O "vermelho antes" da peça K6c chamou
  `instalar-launchd.sh --dry-run` contra a cópia do instalador **vendorizada
  dentro do fixture** — que é a versão ANTIGA, de antes da flag existir. Ela
  aceitava um argumento só e ignorava o que não reconhecia: rodou o caminho de
  instalação inteiro, com o `LABEL` fixo `com.conteudos.orquestrador` que aquela
  versão trazia numa variável, e com `REPO_DIR` resolvido para o fixture. Para o
  launchd, dois repos com o mesmo label são o MESMO job: o `bootstrap` do teste
  derrubou o job do CI e pôs o dele no lugar, em silêncio.

  Três decisões somadas produziram o estrago, e nenhuma delas sozinha bastava:
  o teste rodava o instalador REAL; o instalador não distinguia checkout de
  verdade de checkout descartável; e o label não vinha do config.

  **Detecção.** Humana e tardia: um `launchctl print gui/<uid>/com.conteudos.orquestrador`
  rodado por outro motivo mostrou `last exit code = 127` e um `ProgramArguments`
  apontando para `/private/tmp`. Nenhum alarme disparou — o job estava
  *carregado*, que é o estado que qualquer verificação superficial chama de
  saudável. Fila parada com job carregado não tinha (e ainda não tem) alarme.

  **Conserto.** `launchctl bootout gui/<uid>/com.conteudos.orquestrador`, depois
  `instalar-launchd.sh` do kit, com o label lido do `000-config.json` do CI. As
  três travas de código estão na peça **K6e**:
  1. `test/fixtures/bin/launchctl` — stub que registra cada chamada em
     `$ORQ_LAUNCHCTL_LOG` e sai 0. Todo teste de instalador roda com esse
     diretório na frente do `PATH` e com um `HOME` descartável
     (`comLaunchctlStub()` em `test/fixtures/orq-harness.ts`);
  2. `instalar-launchd.sh` RECUSA instalar (rc 1) quando o checkout resolvido
     está sob `/tmp`/`/private/tmp` ou quando `ORQ_TESTE=1`, salvo
     `--permitir-tmp` explícito. `--dry-run` continua funcionando nesses casos:
     renderizar não é instalar;
  3. `scripts/kit/test-instalar.sh` e `scripts/kit/fixture-e2e.sh` exportam
     `ORQ_TESTE=1`. A ÚNICA exceção é o `local-loop.sh` da drenagem do e2e, que
     roda com `env -u ORQ_TESTE` — conferido no `lib.sh` antes de ser escrito:
     `escrita_de_teste_permitida` recusa trilha/STATUS/custo fora de
     `$ORQ_EXEC_ROOT`, e o `local-loop.sh` nunca define essa variável; com ela
     ligada, a drenagem rodaria e a trilha do fixture ficaria vazia.

  **Lições.**
  - **Teste que roda instalador roda com o instalador STUBADO.** Um teste não
    pode ter o poder de fogo do artefato que ele testa. Onde a prova exigiria o
    launchd real, ela vira asserção sobre o plist renderizado e sobre a lista de
    chamadas que o stub gravou.
  - **A guarda mora em quem instala, não em quem chama.** "Escreva a flag certa"
    não é conserto: o instalador vendorizado dentro de um checkout descartável
    tem de recusar sozinho, mesmo chamado errado, mesmo por uma versão futura do
    teste que ainda não existe.
  - **Flag desconhecida não pode ser flag ignorada.** A versão antiga aceitava
    um argumento e seguia; hoje ela sai 2 em qualquer argumento que não conheça.
    Ignorar um argumento transforma "pedi para simular" em "mandei fazer".
  - **Job carregado não é job saudável.** Falta o alarme "job carregado com
    `last exit` ≠ 0, ou última drenagem há mais de 2× `launchd.start_interval`".
    Registrado como peça do painel (K12) em `docs/PECAS.md`, com o teste que
    prova — este incidente é o caso de aceite dele.
