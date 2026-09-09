# Higiene de execução — o que quebra fora do pipeline

Vale para qualquer repo. O executor e o juiz costumam funcionar bem muito antes do **entorno** funcionar: sincronização de worktrees, ciclo de vida do lock, agendamento, e guards que confundem menção com execução. Nenhuma dessas falhas aparece como bug do pipeline — aparecem como "o loop não fez nada" ou "o loop não voltou", e cada uma custa intervenção manual de quem deveria só estar decidindo.

Cada regra abaixo foi paga com uma sessão inteira de operação manual (Comarka OS, 13/ago/2026: ~50 comandos digitados à mão em três horas, quase nenhum deles uma decisão real).

---

## 1. A worktree de execução se sincroniza no início de toda drenagem

**Sintoma:** você edita um arquivo de controle — liberação humana, status de ticket, config — commita, e o loop continua se comportando como se nada tivesse mudado. Encerra em silêncio dizendo que não há trabalho, o que parece uma decisão sua e é apenas estado velho.

**Causa:** o executor roda a partir de uma worktree própria (o ROOT do executor). Se ela não for atualizada, pode estar parada em um commit de semanas atrás — lendo uma cópia antiga da fila e dos arquivos de controle enquanto todo mundo acredita estar operando o estado atual.

**Regra:** no início de cada drenagem, antes de ler a fila, a worktree de execução é reposicionada no HEAD remoto da branch de staging (fetch + reset duro). Ela é descartável por definição: nada de valor mora nela.

**Verificação:** o log da drenagem imprime o HEAD da worktree de execução, e esse hash é comparável com o da staging. Se o log não diz de qual commit ele leu a fila, ele não está prestando contas do que decidiu.

---

## 2. O lock é liberado em TODO caminho de saída — inclusive o feliz

**Sintoma:** a drenagem encerra normalmente ("fila sem ticket processável"), e a próxima sai imediatamente com "outra execução em andamento". Nenhum processo está rodando. O loop fica travado até alguém remover o lock à mão.

**Causa:** o `trap` de limpeza cobre o caminho de erro e o de interrupção, mas o caminho de saída antecipada — sem trabalho a fazer — retorna antes, sem passar pela limpeza. É justamente o caminho mais frequente quando a fila está vazia, ou seja, o mais executado e o menos testado.

**Regra:** liberar o lock é responsabilidade do `trap` de saída do processo, não de cada `return`. Se a implementação tiver algum caminho que devolve controle sem passar pelo trap, esse caminho está errado.

**Staleness é complementar, não substituto** — e o critério precisa distinguir dois casos:
- **pid morto ⇒ lock inválido imediatamente.** Um processo que não existe não vai voltar a existir. Exigir idade mínima aqui só prolonga a trava.
- **pid vivo ⇒ idade importa.** Aí sim faz sentido um limite (por exemplo, acima do timeout de um ticket) antes de considerar travado.

**Verificação:** rode a drenagem com a fila propositalmente vazia, duas vezes seguidas. A segunda tem que iniciar normalmente. Se ela reclamar de lock, o caminho feliz não está limpando.

---

## 3. Guard de fronteira casa CÓDIGO, nunca prosa

**Sintoma:** um ticket é reprovado por "violou a fronteira" e o trecho acusado é um comentário, um `README`, ou a documentação que o próprio ticket pediu para escrever. O trabalho estava correto — foi barrado por explicar o que não fez.

**Caso real:** um ticket escreveu `.sql` como proposta (correto), não aplicou (correto), e documentou num `.md` que a rota responde 503 *até a migration ser aplicada*. O guard achou o nome do comando de aplicação dentro dessa frase e bloqueou 812 linhas de trabalho válido.

**Regra:** antes de casar o padrão proibido, o enforcement descarta o que não é executável:
- arquivos de documentação (`.md`, `.txt`, `docs/**`) — a não ser que a fronteira seja sobre documentação;
- linhas de comentário da linguagem em questão;
- strings de mensagem de erro e log, quando distinguíveis.

**Não confundir com afrouxar o guard.** A trava contra burla continua valendo — um agente que monta o comando proibido em tempo de execução para escapar do grep é reprovação legítima, e o juiz existe para isso. O que muda é o alvo: **menção não é execução**. Guard que não distingue as duas coisas gera falso positivo, e falso positivo é pior que ausência de guard — ensina a ignorar o guard.

**Verificação:** um ticket cujo escopo é escrever documentação sobre a fronteira passa no enforcement. Se não passa, o guard está lendo prosa.

---

## 4. Tentativa consumida por falha de ambiente é devolvida

**Sintoma:** um ticket queima todas as tentativas e vira bloqueado, sempre com o mesmo motivo, e ninguém percebe que o motivo era um pré-requisito ausente — uma exceção de enforcement que ainda não existia, uma credencial expirada, uma dependência não declarada. Quando o pré-requisito é resolvido, o ticket continua bloqueado por um placar que não é culpa dele.

**Regra:** o contador de tentativas mede **qualidade do trabalho**, não sorte de ambiente. Ao destravar um ticket cuja causa era ambiental, zerar o contador junto com o status — e, para isso, o contador precisa ser **persistido no próprio ticket**, não inferido do diretório de evidência.

**Corolário:** quando um ticket reprova três vezes pelo mesmo motivo exato, isso é sinal de pré-requisito ausente, não de agente incapaz. Vale um alerta explícito no log: *"mesmo motivo em N tentativas — verifique pré-requisito antes de reenfileirar"*.

---

## 5. O agendador é artefato do repo, com instalador

**Sintoma:** o loop simplesmente não roda mais. Ninguém notou, porque não há erro — há ausência. A fila para de andar e a descoberta acontece dias depois.

**Causa:** a unidade de agendamento (launchd plist, systemd unit, crontab, workflow) vive fora do repo, num diretório de usuário. Troca de máquina, reinstalação de sistema ou limpeza de perfil levam junto.

**Regra:** a definição do agendamento é versionada, e existe um script de instalação idempotente que a aplica. O pré-voo verifica se o agendamento está ativo e avisa quando não está.

**Verificação:** clone limpo em máquina zerada + o script de instalação ⇒ loop agendado. Qualquer passo que exija conhecimento que só existe na cabeça de alguém é um buraco a fechar.

---

## Como medir se o entorno está saudável

Conte, numa semana de operação, **quantos comandos manuais foram digitados que não eram decisões**. Liberar um token é decisão. Aplicar DDL é decisão. Escolher a ordem dos tickets é decisão.

Matar processo travado, limpar lock, sincronizar worktree, religar o loop, ler log gigante atrás de quatro linhas — nada disso é decisão. É o humano fazendo de esteira.

O alvo é zero. Enquanto for mais que um punhado, o sistema produz bem e opera mal — e quem paga a diferença é a atenção de quem deveria estar decidindo.
