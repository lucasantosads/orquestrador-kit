/**
 * Peça 7 — agendamento: wrapper do launchd e a regra de "outro loop rodando".
 *
 * O wrapper não é testado rodando o loop de verdade (ele dispararia uma
 * drenagem). O que se prova aqui é o contrato dele: falhar alto quando falta
 * ferramenta, não duplicar estado do loop, e nunca decidir "já tem loop
 * rodando" por processo — só pelo lock deste repo.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, mkdtempSync, chmodSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { escrever, REPO_ROOT } from './fixtures/orq-harness.js';

const WRAPPER = join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh');
const DOC = join(REPO_ROOT, 'docs', 'launchd.md');
const fonte = readFileSync(WRAPPER, 'utf8');
/** Só o CÓDIGO: comentário citando o dono de um estado não é ler esse estado. */
const codigo = fonte
  .split('\n')
  .filter((l) => !/^\s*#/.test(l))
  .join('\n');
const doc = readFileSync(DOC, 'utf8');

/** Roda o wrapper com um PATH controlado, sem deixar o loop de verdade rodar. */
function rodarWrapper(temClaude: boolean, temNode = true) {
  const bin = mkdtempSync(join(tmpdir(), 'orq-launchd-'));
  const lar = mkdtempSync(join(tmpdir(), 'orq-home-'));
  if (temNode) {
    escrever(join(bin, 'node'), '#!/usr/bin/env bash\nexit 0\n');
    chmodSync(join(bin, 'node'), 0o755);
  }
  if (temClaude) {
    escrever(join(bin, 'claude'), '#!/usr/bin/env bash\nexit 0\n');
    chmodSync(join(bin, 'claude'), 0o755);
  }
  // HOME de mentira: o wrapper monta o PATH dele com $HOME/.local/bin, que é
  // justamente onde o `claude` desta máquina vive. Sem trocar o HOME, o teste de
  // "claude ausente" testaria a máquina, não o wrapper.
  const r = spawnSync('/bin/bash', [WRAPPER], {
    encoding: 'utf8',
    cwd: REPO_ROOT,
    env: { ...process.env, HOME: lar, PATH: bin, NODE_DIR: temNode ? bin : '' },
  });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

describe('o wrapper falha alto quando falta ferramenta', () => {
  // QUARENTENA (K7): o wrapper faz `source lib.sh`, que resolve a fila pelo diretório onde o lib.sh MORA — exige um checkout com docs/fila/000-config.json; a fixture de repo é a peça K7.
  it.skip('sem claude no PATH: rc 127 e mensagem com o PATH usado (não roda o loop)', () => {
    const r = rodarWrapper(false);
    expect(r.rc).toBe(127);
    expect(r.saida).toMatch(/'claude' fora do PATH/);
  });

  it('a checagem de claude vem ANTES de chamar o loop', () => {
    expect(fonte).toMatch(/command -v claude[\s\S]*?local-loop\.sh/);
  });

  it('sem node e sem NODE_DIR: rc 127 (npx tsx é obrigatório para gates e lock)', () => {
    const r = rodarWrapper(true, false);
    expect(r.rc).toBe(127);
    expect(r.saida).toMatch(/node não encontrado/);
  });

  it('é executável e tem sintaxe válida', () => {
    expect(spawnSync('bash', ['-n', WRAPPER]).status).toBe(0);
    expect(statSync(WRAPPER).mode & 0o111).toBeGreaterThan(0);
  });
});

describe('o wrapper NÃO duplica estado do loop', () => {
  // Peça 11: o wrapper passou a LER o lock do loop para decidir "já há drenagem
  // em curso". Isso não é ter lock próprio — é ler a fonte única, que continua
  // sendo do loop. O que segue proibido é CRIAR/ADQUIRIR um segundo lock.
  it('não tem lock próprio: lê o do loop, nunca cria o seu', () => {
    expect(codigo).not.toMatch(/flock|mkdir -p .*lock/);
    expect(codigo).not.toMatch(/>\s*"\$LOCK"|printf .* > "\$LOCK"|rm -f "\$LOCK"/);
    // e o caminho que ele lê é o do loop, sob o runs_dir DESTE checkout
    expect(codigo).toContain('LOCK="$RUNS_BASE/.local-loop.lock"');
  });

  it('não lê pausa, cooldown nem orçamento por conta própria', () => {
    for (const dono of ['PAUSAR', '.orq-pause', 'cooldown', 'custo.json']) {
      expect(codigo, dono).not.toContain(dono);
    }
  });

  // `kill -0` não mata: é a sonda de vida do pid do lock (peça 11). Matar
  // processo continua fora de cogitação — parar o loop é desagendar e esperar.
  it('não mata processo (kill -0 é sonda, não sinal)', () => {
    expect(codigo).not.toMatch(/pkill|killall/);
    expect(codigo).not.toMatch(/kill\s+-(9|TERM|KILL|INT|HUP)/);
    for (const l of codigo.split('\n').filter((l) => /\bkill\b/.test(l))) {
      expect(l, l).toMatch(/kill -0/);
    }
  });

  it('usa caffeinate -i (o sono no meio do run custa o ciclo)', () => {
    expect(fonte).toMatch(/caffeinate -i/);
    expect(fonte).toMatch(/command -v caffeinate/); // ausência não pode quebrar
  });

  // QUARENTENA (K7): assevera sobre docs/fila/runs/.gitignore do repo INSTALADO; o kit não tem fila própria.
  it.skip('loga em docs/fila/runs/launchd.log, que o git ignora', () => {
    expect(fonte).toContain('docs/fila/runs/launchd.log');
    expect(readFileSync(join(REPO_ROOT, 'docs', 'fila', 'runs', '.gitignore'), 'utf8')).toContain('*');
  });

  it('resolve o repo do próprio arquivo: zero caminho de usuário hardcoded', () => {
    // O caminho sai do BASH_SOURCE por expansão de parâmetro + builtins, e o
    // repo vem do MAIN_CHECKOUT que o lib.sh resolve a partir dele. Nada de
    // comando externo AQUI: o PATH ainda não foi montado nesta altura do arquivo,
    // e sob o launchd ele chega quase vazio — o `dirname` que estava nesta linha
    // falhava em silêncio e deixava o caminho errado.
    expect(fonte).toContain('ORQ_LIB_DIR="${BASH_SOURCE[0]%/*}"');
    expect(fonte).toContain('REPO_DIR="$MAIN_CHECKOUT"');
    expect(codigo).not.toMatch(/\/Users\/[a-z]/i);
    const antesDoPath = fonte.split('export PATH=')[0] ?? '';
    expect(antesDoPath).not.toMatch(/\$\((dirname|basename|readlink)\b/);
  });

  it('não carrega env por um segundo caminho (o loop lê .env.local)', () => {
    // O único `source` permitido é o do próprio lib.sh — a MESMA biblioteca que
    // o loop carrega, e é dela que saem RUNS_BASE, STATUS e config. Carregar
    // `$HOME/.env.orquestrador`, como faz o wrapper do comarka, continua
    // proibido: seria o run acontecer contra ambiente diferente do que o
    // preflight de identidade conferiu.
    const sources = codigo.split('\n').filter((l) => /^\s*(\.|source)\s/.test(l));
    expect(sources).toEqual(['source "$ORQ_LIB_DIR/lib.sh"']);
    expect(codigo).not.toMatch(/\.env/);
  });
});

describe('"outro loop rodando" é o lock deste repo, nunca grep de processo', () => {
  const scripts = ['lib.sh', 'local-loop.sh', 'executor.sh', 'launchd-run.sh']
    .map((f) => `--- ${f}\n${readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', f), 'utf8')}`)
    .join('\n');

  it('nenhum script do harness usa pgrep/pkill/ps aux para achar outro loop', () => {
    // Comentário PODE citar o pgrep — a peça 11 explica ali por que ele não
    // serve. É o código que não pode usá-lo.
    const executavel = scripts
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
    expect(executavel).not.toMatch(/pgrep|pkill|killall/);
    expect(executavel).not.toMatch(/ps\s+(aux|-ef)/);
  });

  it('a decisão está no lock, sob o runs_dir deste checkout', () => {
    const loop = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh'), 'utf8');
    expect(loop).toMatch(/LOCK="\$RUNS_BASE\/\.local-loop\.lock"/);
    expect(loop).toMatch(/outro run vivo .*encerrando/);
  });

  it('lock vivo encerra em 0 (o segundo disparo não é erro)', () => {
    const loop = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh'), 'utf8');
    expect(loop).toMatch(/lock_adquirir \|\| exit 0/);
  });

  it('o documento explica por que o grep global não serve', () => {
    expect(doc).toMatch(/grep.*global|global.*grep/i);
    expect(doc).toMatch(/comarka-operacional/);
    expect(doc).toMatch(/\.local-loop\.lock/);
  });
});

describe('docs/orquestrador/launchd.md', () => {
  it('existe e traz o plist de exemplo com o Label combinado', () => {
    expect(existsSync(DOC)).toBe(true);
    expect(doc).toContain('com.comarka.ci-orquestrador');
    expect(doc).toContain('~/Library/LaunchAgents/com.comarka.ci-orquestrador.plist');
  });

  it('StartInterval 3600 e RunAtLoad false', () => {
    expect(doc).toMatch(/<key>StartInterval<\/key>\s*\n\s*<integer>3600<\/integer>/);
    expect(doc).toMatch(/<key>RunAtLoad<\/key>\s*\n\s*<false\/>/);
  });

  it('PATH e HOME no ambiente do plist', () => {
    expect(doc).toMatch(/<key>EnvironmentVariables<\/key>/);
    expect(doc).toMatch(/<key>PATH<\/key>/);
    expect(doc).toMatch(/<key>HOME<\/key>/);
  });

  it('traz bootstrap, bootout e kickstart', () => {
    expect(doc).toMatch(/launchctl bootstrap gui\/\$\(id -u\)/);
    expect(doc).toMatch(/launchctl bootout gui\/\$\(id -u\)/);
    expect(doc).toMatch(/launchctl kickstart -k/);
  });

  it('diz que o plist NÃO entra no repo — e ele não entra', () => {
    expect(doc).toMatch(/plist \*\*NÃO\*\* entra no repo|plist NÃO entra no repo/);
    const versionados = spawnSync('git', ['ls-files'], { cwd: REPO_ROOT, encoding: 'utf8' }).stdout ?? '';
    expect(versionados).not.toMatch(/\.plist$/m);
  });

  it('manda pausar pelo arquivo e proíbe kill -9', () => {
    expect(doc).toMatch(/orq pausar/);
    expect(doc).toMatch(/Nunca `kill -9`/);
  });
});
