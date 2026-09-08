# Agendamento do orquestrador (launchd, macOS)

O disparo agendado é a Fase 2 rodando sozinha. Só ligue depois do pré-voo cat. 7
(fixture ponta a ponta aprovado + disparo duplo morrendo no lock).

**O plist NÃO entra no repo.** Ele carrega caminhos absolutos desta máquina e é
carregado à mão pelo dono. O que o repo versiona é o wrapper
(`scripts/orquestrador/launchd-run.sh`) e este documento.

## O que dispara o quê

```
launchd (StartInterval 3600)
  └─ scripts/orquestrador/launchd-run.sh     wrapper: PATH, node, claude, caffeinate, log
       └─ scripts/orquestrador/local-loop.sh drenagem: LOCK, pausa, cooldown, orçamento
            └─ scripts/orquestrador/executor.sh  por ticket
```

O wrapper **não** tem lock, pausa, cooldown nem pré-voo próprios. Todos são do
loop, que é a fonte única de estado — dois locks é deadlock, e uma segunda
resposta para "já tem loop rodando?" diverge da primeira no primeiro ajuste.

### "Outro loop rodando" é o LOCK deste repo, nunca `grep` de processo

`local-loop.sh:lock_adquirir` decide pelo arquivo `docs/fila/runs/.local-loop.lock`
deste checkout (PID + epoch; `lock.ts` decide se está órfão). Disparo com lock
vivo encerra em 0, sem tocar em ticket.

Um `pgrep`/`ps aux | grep 'local-loop\|claude -p'` global **não serve** e já
causou incidente (PLAYBOOK 2026-09-02): há mais de um orquestrador nesta máquina
— os três `local-loop.sh` vivos naquele dia eram todos do `comarka-operacional`,
e o grep global teria abortado uma sessão deste repo sem motivo. Dois
orquestradores na mesma máquina são operação normal; o que os separa é o lock de
cada repo, não o nome do processo.

## O plist exemplo

Grave em `~/Library/LaunchAgents/com.comarka.ci-orquestrador.plist`, trocando
`SEU-USUARIO` e conferindo o caminho do node (`dirname "$(command -v node)"`):

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.comarka.ci-orquestrador</string>

  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>/Users/SEU-USUARIO/Projetos/conteudos-infinitos/scripts/orquestrador/launchd-run.sh</string>
  </array>

  <key>WorkingDirectory</key>
  <string>/Users/SEU-USUARIO/Projetos/conteudos-infinitos</string>

  <!-- de hora em hora. RunAtLoad false: carregar o agente não é disparar. -->
  <key>StartInterval</key>
  <integer>3600</integer>
  <key>RunAtLoad</key>
  <false/>

  <!-- launchd não herda o ambiente do shell: PATH e HOME vão explícitos.
       NODE_DIR é lido pelo wrapper quando o node não está no PATH acima. -->
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/Users/SEU-USUARIO/.nvm/versions/node/v24.19.0/bin:/Users/SEU-USUARIO/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
    <key>HOME</key>
    <string>/Users/SEU-USUARIO</string>
    <key>NODE_DIR</key>
    <string>/Users/SEU-USUARIO/.nvm/versions/node/v24.19.0/bin</string>
  </dict>

  <!-- Redundante com o log do wrapper, e de propósito: se o wrapper morrer
       antes de abrir o dele, é aqui que a mensagem aparece. -->
  <key>StandardOutPath</key>
  <string>/Users/SEU-USUARIO/Projetos/conteudos-infinitos/docs/fila/runs/launchd.stdout.log</string>
  <key>StandardErrorPath</key>
  <string>/Users/SEU-USUARIO/Projetos/conteudos-infinitos/docs/fila/runs/launchd.stderr.log</string>
</dict>
</plist>
```

## Bootstrap e bootout

```bash
# carregar (o UID é o seu; `id -u`)
launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.comarka.ci-orquestrador.plist

# conferir que está carregado
launchctl print gui/$(id -u)/com.comarka.ci-orquestrador | head -20

# disparar AGORA, sem esperar o intervalo (é assim que se testa o disparo duplo)
launchctl kickstart -k gui/$(id -u)/com.comarka.ci-orquestrador

# descarregar (é ISTO que "parar o loop" significa)
launchctl bootout gui/$(id -u)/com.comarka.ci-orquestrador
```

Depois de editar o plist: `bootout` e `bootstrap` de novo — o launchd não relê o
arquivo sozinho.

## Parar o loop

Em ordem de preferência:

1. `scripts/orq pausar "<motivo>"` — cria `docs/fila/PAUSAR`. O disparo corrente
   termina o ticket em curso e encerra ENTRE tickets, em `ocioso` com
   `MOTIVO pausado`. Os disparos seguintes encerram na hora.
2. `launchctl bootout …` — desagenda. Não interrompe o disparo em curso.
3. **Nunca `kill -9`.** `SIGTERM` durante a chamada síncrona ao agente só é
   atendido quando ela retorna; matar garante ticket órfão em `em_execucao`,
   worktree pendurada e cota gasta sem veredito.

Retomar: `scripts/orq retomar`.

## Onde olhar depois

| Quero saber | Comando |
|---|---|
| acabou? em que ticket está? | `scripts/orq` |
| o que aconteceu na drenagem | `scripts/orq eventos 40` |
| por que o último reprovou | `scripts/orq erro` |
| quanto gastou hoje | `scripts/orq custo` |
| o disparo do launchd rodou? | `tail -40 docs/fila/runs/launchd.log` |
| avisos de fim de drenagem | `tail -10 docs/fila/runs/notificacoes.log` |

`docs/fila/runs/` é ignorado pelo git: nada disso suja a árvore nem viaja para a
staging.

## Antes de agendar (pré-voo cat. 7)

- [ ] fixture trivial atravessou o loop ponta a ponta e apareceu na staging;
- [ ] disparo duplo: o segundo morre no lock (`launchctl kickstart -k` duas
      vezes seguidas, conferir em `docs/fila/runs/local-loop.log`);
- [ ] energia/sono da máquina decididos conscientemente — o run dispara ao
      acordar, e `caffeinate -i` só cobre o tempo do run;
- [ ] `orq custo` abaixo do teto e `canal_notificacao` funcionando (ou caindo no
      fallback em arquivo, que é sempre escrito).
