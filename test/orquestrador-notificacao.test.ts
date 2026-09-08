/**
 * Peça 6 — notificação de fim de drenagem (contrato §4).
 *
 * A regra que o teste protege: o ARQUIVO é escrito SEMPRE, inclusive quando o
 * canal nativo funciona. A armadilha conhecida é o inverso — relatório que só
 * existe no canal, e no dia em que o canal falha (máquina sem GUI, sessão do
 * launchd sem Notification Center) ninguém descobre que a drenagem terminou.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, mkdtempSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { FX_CHECKOUT, REPO_ROOT, bashNoFixture, criarFixture, escrever, ler } from './fixtures/orq-harness.js';

const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
const notif = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'notificacoes.log');
const CFG = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));

/**
 * PATH de teste. Provar "osascript ausente" numa máquina macOS exige um PATH em
 * que ele realmente não esteja — mas jq, git e o resto do coreutils continuam
 * necessários. Então: um diretório com link para TUDO que o sistema tem, menos
 * o osascript. É a única forma de exercitar o caminho de fallback sem seam de
 * teste dentro do lib.sh.
 */
let SISTEMA_SEM_OSASCRIPT: string | null = null;
function sistemaSemOsascript(): string {
  if (SISTEMA_SEM_OSASCRIPT) return SISTEMA_SEM_OSASCRIPT;
  const bin = mkdtempSync(join(tmpdir(), 'orq-sys-'));
  const dirs = ['/usr/bin', '/bin', '/usr/local/bin', '/opt/homebrew/bin'];
  spawnSync('bash', [
    '-c',
    `for d in ${dirs.join(' ')}; do [ -d "$d" ] || continue;
       for f in "$d"/*; do n="$(basename "$f")";
         [ "$n" = osascript ] && continue;
         [ -e "${bin}/$n" ] || ln -s "$f" "${bin}/$n" 2>/dev/null;
       done; done`,
  ]);
  SISTEMA_SEM_OSASCRIPT = bin;
  return bin;
}

function pathDeTeste(comOsascript: boolean): { path: string; registro: string } {
  const bin = mkdtempSync(join(tmpdir(), 'orq-bin-'));
  const registro = join(bin, 'chamada.txt');
  if (comOsascript) {
    const fake = join(bin, 'osascript');
    escrever(fake, `#!/usr/bin/env bash\nprintf '%s\\n' "$*" > "${registro}"\nexit 0\n`);
    chmodSync(fake, 0o755);
  }
  return { path: `${bin}:${sistemaSemOsascript()}`, registro };
}

function notificar(raiz: string, comOsascript: boolean, args = '2 1 0 34') {
  const { path, registro } = pathDeTeste(comOsascript);
  const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', `notificar_fim ${args}`].join('\n');
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: raiz,
    env: { ...process.env, PATH: path },
  });
  return { rc: r.status ?? 1, log: `${r.stdout ?? ''}${r.stderr ?? ''}`, registro };
}

const FILA = [{ id: '901', slug: 'x', status: 'done' }];

describe('o fallback em arquivo é escrito SEMPRE', () => {
  it('sem osascript: só o arquivo, e o log diz por quê', () => {
    const raiz = criarFixture(FILA);
    const r = notificar(raiz, false);
    expect(r.rc).toBe(0);
    expect(r.log).toMatch(/osascript ausente — só arquivo/);
    expect(ler(notif(raiz))).toMatch(/Orquestrador CI: 2 aprovados, 1 bloqueados/);
  });

  it('COM osascript: o arquivo é escrito do mesmo jeito', () => {
    const raiz = criarFixture(FILA);
    const r = notificar(raiz, true);
    expect(r.log).toMatch(/notificação: enviada/);
    expect(ler(notif(raiz))).toMatch(/Orquestrador CI: 2 aprovados, 1 bloqueados/);
  });

  it('osascript que falha não derruba a drenagem e o arquivo continua valendo', () => {
    const raiz = criarFixture(FILA);
    const bin = mkdtempSync(join(tmpdir(), 'orq-bin-'));
    escrever(join(bin, 'osascript'), '#!/usr/bin/env bash\nexit 1\n');
    chmodSync(join(bin, 'osascript'), 0o755);
    const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', 'notificar_fim 1 0 0 5'].join('\n');
    const r = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      cwd: raiz,
      env: { ...process.env, PATH: `${bin}:/usr/bin:/bin` },
    });
    expect(r.status).toBe(0);
    expect(`${r.stdout}${r.stderr}`).toMatch(/osascript falhou — vale o arquivo/);
    expect(ler(notif(raiz))).toContain('Orquestrador CI: 1 aprovados, 0 bloqueados');
  });

  it('a linha do arquivo tem timestamp, título e corpo', () => {
    const raiz = criarFixture(FILA);
    notificar(raiz, false);
    expect(ler(notif(raiz)).trim()).toMatch(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-]\d{4} \| Orquestrador CI: .* \| duração 34min · adiados 0 · último: /,
    );
  });

  it('anexa: duas drenagens, duas linhas (é histórico, não snapshot)', () => {
    const raiz = criarFixture(FILA);
    notificar(raiz, false, '1 0 0 10');
    notificar(raiz, false, '0 2 1 20');
    expect(ler(notif(raiz)).trim().split('\n')).toHaveLength(2);
  });
});

describe('o que vai no título e no corpo', () => {
  it('título: placar de aprovados e bloqueados', () => {
    const raiz = criarFixture(FILA);
    const r = notificar(raiz, true, '3 1 0 7');
    expect(ler(r.registro)).toContain('with title "Orquestrador CI: 3 aprovados, 1 bloqueados"');
  });

  it('corpo: duração e o ÚLTIMO do snapshot', () => {
    const raiz = criarFixture(FILA);
    bashNoFixture(raiz, 'status_set "ultimo=206 APROVADO 01:12:03 (487s)"');
    const r = notificar(raiz, true, '1 0 0 12');
    const chamada = ler(r.registro);
    expect(chamada).toContain('duração 12min');
    expect(chamada).toContain('206 APROVADO 01:12:03 (487s)');
  });

  it('sem snapshot ainda, o corpo sai com — em vez de quebrar', () => {
    const raiz = criarFixture(FILA);
    const r = notificar(raiz, true);
    expect(ler(r.registro)).toMatch(/último: —/);
  });
});

describe('o canal é decisão de config', () => {
  it('canal_notificacao resolvido: notificacao_nativa', () => {
    expect(CFG.canal_notificacao).toBe('notificacao_nativa');
    expect(CFG._canal_notificacao).toMatch(/DECISÃO HUMANA/);
    expect(CFG._canal_notificacao).toMatch(/fallback/i);
  });

  it('canal diferente do nativo: nem tenta o osascript, e o arquivo vale', () => {
    const raiz = criarFixture(FILA);
    const cfgPath = join(raiz, 'docs', 'fila', '000-config.json');
    escrever(cfgPath, JSON.stringify({ ...CFG, canal_notificacao: 'webhook' }, null, 2));
    const r = notificar(raiz, true);
    expect(r.log).toMatch(/canal 'webhook' não é nativo — só arquivo/);
    expect(ler(notif(raiz))).toContain('Orquestrador CI:');
  });
});

describe('a drenagem chama a notificação no fim', () => {
  it('notificar_fim é chamado depois do DRENAGEM_FIM, e SOB o gate da peça 13', () => {
    const loop = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh'), 'utf8');
    expect(loop).toMatch(
      /DRENAGEM_FIM[\s\S]*?if deve_notificar "\$processados" "\$motivo_ocioso"; then\n\s*notificar_fim "\$drenados" "\$bloqueados" "\$adiados" "\$dur"/,
    );
  });
});

// ─── PEÇA 13: notificação só quando houve o que notificar ─────────────────
//
// O defeito que esta seção paga: em 07/09 11:0x o launchd cuspiu um cartão
// "0 aprovados · duração 0min · último —" a CADA tick enquanto o 240 rodava. A
// drenagem não achava processável, encerrava em 0 e notificava assim mesmo.
// Notificação que chega quando nada aconteceu treina o operador a ignorar a
// notificação que importa.
//
// A regra (PECAS.md, peça 13) tem duas metades: processou ≥1 ticket notifica
// sempre; fila sem processável notifica só na PRIMEIRA vez desde a última
// drenagem que processou. Lock em uso e "já há drenagem em curso" nunca.

const LOOP_SH = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
const runsDir = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);

/** Linhas do notificacoes.log (vazio = arquivo ausente). */
function linhasNotificadas(raiz: string): string[] {
  const t = ler(notif(raiz)).trim();
  return t ? t.split('\n') : [];
}

/**
 * Roda drenar() de verdade no fixture, com o que depende de git substituído.
 * `stubExecutor` é o corpo de run_executor_once — $2 é o arquivo do ticket.
 */
function drenarComStub(raiz: string, stubExecutor = 'return 0'): { rc: number; saida: string } {
  const r = spawnSync(
    'bash',
    [
      '-c',
      [
        'export LOCAL_LOOP_SOURCED=1',
        `source "${LOOP_SH}"`,
        'set +e',
        'ensure_staging_worktree() { echo "/tmp"; }',
        'ticket_commit() { return 0; }',
        'cleanup_frente() { return 0; }',
        'merge_em_alvo() { return 0; }',
        `run_executor_once() { ${stubExecutor}; }`,
        'drenar',
      ].join('\n'),
    ],
    { encoding: 'utf8', cwd: raiz, env: { ...process.env, ORQ_EXEC_ROOT: raiz } },
  );
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

/** deve_notificar isolada: rc 0 = notifica. */
function deveNotificar(raiz: string, processados: number, motivo: string): number {
  return bashNoFixture(raiz, `deve_notificar ${processados} "${motivo}"; echo "RC=$?"`).stdout.includes('RC=0') ? 0 : 1;
}

const SO_DONE = [{ id: '901', slug: 'ja-foi', status: 'done' }];
const UM_PENDENTE = [{ id: '901', slug: 'da-vez', status: 'pendente' }];

describe('fila sem processável: avisa uma vez, e só uma', () => {
  it('a PRIMEIRA drenagem vazia escreve exatamente uma linha', () => {
    const raiz = criarFixture(SO_DONE);
    drenarComStub(raiz);
    expect(linhasNotificadas(raiz)).toHaveLength(1);
  });

  it('a SEGUNDA drenagem vazia não escreve nada (é o spam do launchd)', () => {
    const raiz = criarFixture(SO_DONE);
    drenarComStub(raiz);
    const r = drenarComStub(raiz);
    expect(linhasNotificadas(raiz)).toHaveLength(1);
    expect(r.saida).toMatch(/nada a notificar/);
  });

  it('dez ticks seguidos com a fila vazia continuam valendo uma linha só', () => {
    const raiz = criarFixture(SO_DONE);
    for (let i = 0; i < 10; i++) drenarComStub(raiz);
    expect(linhasNotificadas(raiz)).toHaveLength(1);
  });

  it('processar de novo REARMA o aviso de fila vazia', () => {
    const raiz = criarFixture(UM_PENDENTE);
    drenarComStub(raiz, 'ticket_set_status "$2" aguardando_merge; return 0'); // aprovado + fila esvazia
    expect(linhasNotificadas(raiz)).toHaveLength(1);
    drenarComStub(raiz); // fila vazia, mas a memória foi zerada: avisa
    expect(linhasNotificadas(raiz)).toHaveLength(2);
    drenarComStub(raiz); // e a repetição volta a calar
    expect(linhasNotificadas(raiz)).toHaveLength(2);
  });
});

describe('drenagem que PROCESSOU notifica, com o placar', () => {
  it('aprovado: uma linha, placar 1 aprovado', () => {
    const raiz = criarFixture(UM_PENDENTE);
    drenarComStub(raiz, 'ticket_set_status "$2" aguardando_merge; return 0');
    const linhas = linhasNotificadas(raiz);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain('Orquestrador CI: 1 aprovados, 0 bloqueados');
  });

  it('bloqueado: uma linha, placar 1 bloqueado', () => {
    const raiz = criarFixture(UM_PENDENTE);
    drenarComStub(raiz, 'ticket_set_status "$2" bloqueado; return 0');
    const linhas = linhasNotificadas(raiz);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain('Orquestrador CI: 0 aprovados, 1 bloqueados');
  });

  it('adiado por orçamento: uma linha, corpo com adiados 1', () => {
    const raiz = criarFixture(UM_PENDENTE);
    escrever(
      join(raiz, 'docs', 'fila', 'runs', 'custo.json'),
      JSON.stringify({
        dias: {
          [new Date().toISOString().slice(0, 10)]: [
            { papel: 'executor', ticket: '901', custo_usd: 999, tokens_in: 1, tokens_out: 1 },
          ],
        },
      }),
    );
    const r = drenarComStub(raiz);
    expect(r.saida).toMatch(/teto diário atingido/);
    const linhas = linhasNotificadas(raiz);
    expect(linhas).toHaveLength(1);
    expect(linhas[0]).toContain('adiados 1');
  });

  it('EXECUTOR_MORREU conta como processado, ainda que nada tenha sido aprovado', () => {
    const raiz = criarFixture(UM_PENDENTE);
    const r = drenarComStub(
      raiz,
      'event "$(ticket_field "$2" ".id")" EXECUTOR_MORREU "rc=143" "fase=gates" "sinal=TERM"; return 143',
    );
    expect(r.saida).not.toMatch(/nada a notificar/);
    expect(linhasNotificadas(raiz)).toHaveLength(1);
    expect(ler(runsDir(raiz, 'events.log'))).toMatch(/EXECUTOR_MORREU rc=143/);
  });

  it('EXECUTOR_MORREU que já estava na trilha ANTES não conta (a conta é do trecho)', () => {
    const raiz = criarFixture(SO_DONE);
    bashNoFixture(raiz, 'event 900 EXECUTOR_MORREU "rc=143" "fase=gates"');
    drenarComStub(raiz); // fila vazia: avisa uma vez pela regra da fila vazia
    const r = drenarComStub(raiz); // segunda vez: a morte velha não pode rearmar
    expect(r.saida).toMatch(/nada a notificar/);
    expect(linhasNotificadas(raiz)).toHaveLength(1);
  });
});

describe('saída sem drenagem NUNCA notifica', () => {
  it('lock ocupado por processo vivo: local-loop encerra sem tocar o notificacoes.log', () => {
    const raiz = criarFixture(UM_PENDENTE);
    escrever(runsDir(raiz, '.local-loop.lock'), `${process.pid}\n${Math.floor(Date.now() / 1000)}\n`);
    const r = spawnSync('bash', [LOOP_SH], {
      encoding: 'utf8',
      cwd: raiz,
      env: { ...process.env, ORQ_EXEC_ROOT: raiz },
    });
    expect(r.status).toBe(0);
    expect(ler(runsDir(raiz, 'local-loop.log'))).toMatch(/outro run vivo/);
    expect(linhasNotificadas(raiz)).toHaveLength(0);
  });

  it('"já há drenagem em curso" (peça 11) devolve em-curso sem chamar notificar_fim', () => {
    const wrapper = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh'), 'utf8');
    expect(wrapper).not.toMatch(/notificar_fim/);
    expect(wrapper).toMatch(/em-curso\)[\s\S]{0,400}?return 0/);
  });
});

describe('deve_notificar: a regra, isolada', () => {
  it('processou ≥ 1: notifica, qualquer que seja o motivo do fim', () => {
    const raiz = criarFixture(SO_DONE);
    expect(deveNotificar(raiz, 1, 'sem ticket processável')).toBe(0);
    expect(deveNotificar(raiz, 3, 'orcamento')).toBe(0);
    expect(deveNotificar(raiz, 1, 'pausado')).toBe(0);
  });

  it('zero processados por pausa, cooldown ou sem progresso: cala sempre', () => {
    const raiz = criarFixture(SO_DONE);
    expect(deveNotificar(raiz, 0, 'pausado')).toBe(1);
    expect(deveNotificar(raiz, 0, 'cooldown ~12min')).toBe(1);
    expect(deveNotificar(raiz, 0, 'sem progresso em 901')).toBe(1);
  });

  it('o motivo de fila vazia é a MESMA constante que o loop grava', () => {
    const loop = readFileSync(LOOP_SH, 'utf8');
    expect(loop).toContain('motivo_ocioso="$MOTIVO_FILA_VAZIA"');
    const raiz = criarFixture(SO_DONE);
    expect(bashNoFixture(raiz, 'printf "M=%s\\n" "$MOTIVO_FILA_VAZIA"').stdout).toContain('M=sem ticket processável');
  });
});
