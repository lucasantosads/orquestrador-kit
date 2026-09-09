/**
 * T1 — `tsx` é dependência do MOTOR, e o motor para de sair para a rede.
 *
 * ORIGEM (só leitura, 2026-09-09): `~/orq-sessoes/revisao-adocao-actus.md`,
 * bloqueante **B-1**. O motor executa TypeScript por `npx tsx` em 14 chamadas;
 * `npx` sem flag BAIXA o que não encontra. No `~/Projetos/actus-saas` medido
 * naquele dia, `node_modules/.bin/` tinha `next`, `tsc` e `vitest` e NÃO tinha
 * `tsx` — a Fase A da adoção passava (ela chama o `orq` DO KIT, que faz `cd`
 * para o kit) e o B3 quebrava, com o `npx` indo buscar o pacote na rede: prompt
 * interativo num TTY, erro fora dele, tick mudo sob o launchd.
 *
 * Esta peça troca a resolução por uma só, no `lib.sh` (`ORQ_TSX` / `tsx_bin`),
 * e põe a ausência do binário como RECUSA em três bocas: o `local-loop.sh`
 * (antes de qualquer chamada TypeScript), a `cat.7` do pré-voo e o
 * `instalar.sh` (`--atualizar` e `--novo`).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  checarToolchain,
  preVooDepsReais,
  preVooRelampago,
  render,
} from '../scripts/orquestrador/prevoo.js';
import type { PreVooDeps } from '../scripts/orquestrador/prevoo.js';
import { REPO_ROOT, checkoutReal, ler } from './fixtures/orq-harness.js';

const LIB = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
const ORQ = join(REPO_ROOT, 'scripts', 'orq');
const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh');
const INSTALAR = join(REPO_ROOT, 'instalar.sh');
const BIN_SEM_REDE = join(REPO_ROOT, 'test', 'fixtures', 'bin-sem-rede');

const FX = checkoutReal();

/**
 * Uma CÓPIA do fixture instanciado, com o `node_modules` (que lá é symlink para
 * o do kit) removido. É o repo do Actus de 2026-09-09 reproduzido: motor
 * instalado, config válido, git de verdade — e nenhum `tsx`.
 *
 * Copiar em vez de instanciar outro fixture é decisão: `fixture.sh` só sabe
 * fazer o repo COM o symlink, e mexer nele para produzir um repo quebrado
 * colocaria o caso de teste dentro do instanciador que todos os outros usam.
 */
function copiaSemTsx(): string {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-sem-tsx-'));
  const dest = join(raiz, 'repo');
  mkdirSync(dest, { recursive: true });
  const r = spawnSync('cp', ['-R', `${FX}/.`, dest], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`cp -R falhou: ${r.stderr}`);
  rmSync(join(dest, 'node_modules'), { force: true, recursive: true });
  return dest;
}

/** A mesma cópia, mas COM um `tsx` executável no lugar canônico. */
function copiaComTsx(): string {
  const dest = copiaSemTsx();
  const bin = join(dest, 'node_modules', '.bin');
  mkdirSync(bin, { recursive: true });
  writeFileSync(join(bin, 'tsx'), '#!/bin/sh\nexit 0\n');
  chmodSync(join(bin, 'tsx'), 0o755);
  return dest;
}

/** Carrega o lib.sh com ORQ_EXEC_ROOT no checkout dado e roda `corpo`. */
function comLib(raiz: string, corpo: string): { rc: number; saida: string } {
  const script = [`export ORQ_EXEC_ROOT="${raiz}"`, `source "${LIB}"`, 'set +e', corpo].join('\n');
  const r = spawnSync('bash', ['-c', script], { encoding: 'utf8', cwd: raiz });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

// ─── lib.sh: a resolução, uma vez ────────────────────────────────────────────

describe('lib.sh · tsx_bin resolve o binário UMA vez', () => {
  it('com node_modules/.bin/tsx no checkout, resolve para ELE (caminho absoluto)', () => {
    const r = comLib(FX, 'tsx_bin');
    expect(r.rc).toBe(0);
    // `realpath` dos dois lados: MAIN_CHECKOUT vem do `git rev-parse
    // --path-format=absolute`, que resolve `/tmp` -> `/private/tmp` no macOS.
    expect(r.saida.trim()).toBe(join(realpathSync(FX), 'node_modules', '.bin', 'tsx'));
  });

  it('sem o binário local, cai em `npx --no-install tsx` — nunca em `npx` cru', () => {
    const repo = copiaSemTsx();
    const r = comLib(repo, 'tsx_bin');
    expect(r.saida.trim()).toBe('npx --no-install tsx');
    // A flag É a peça: sem ela, este é exatamente o comando que baixa da rede.
    expect(r.saida).toContain('--no-install');
  });

  it('tsx_local_ok responde pelo binário DO REPO, e é `test -x`', () => {
    expect(comLib(FX, 'tsx_local_ok; echo rc=$?').saida).toContain('rc=0');
    expect(comLib(copiaSemTsx(), 'tsx_local_ok; echo rc=$?').saida).toContain('rc=1');
    // Um arquivo que existe e NÃO é executável não vale: o motor iria executá-lo.
    const repo = copiaComTsx();
    chmodSync(join(repo, 'node_modules', '.bin', 'tsx'), 0o644);
    expect(comLib(repo, 'tsx_local_ok; echo rc=$?').saida).toContain('rc=1');
  });

  it('a resolução é contra o checkout PRINCIPAL, não contra o ROOT de execução', () => {
    const fonte = readFileSync(LIB, 'utf8');
    expect(fonte).toContain('TSX_LOCAL="$MAIN_CHECKOUT/node_modules/.bin/tsx"');
  });
});

// ─── nenhuma chamada `npx tsx` crua sobrou no motor ──────────────────────────

describe('as 14 chamadas do motor passam pela resolução única', () => {
  const ARQUIVOS = [
    'scripts/orq',
    'scripts/orquestrador/executor.sh',
    'scripts/orquestrador/local-loop.sh',
    'scripts/orquestrador/enforcement.sh',
    'scripts/orquestrador/test-retry-worktree.sh',
  ];

  /** Só as linhas de CÓDIGO: comentário pode (e deve) citar o `npx tsx` antigo. */
  function codigo(rel: string): string {
    return readFileSync(join(REPO_ROOT, rel), 'utf8')
      .split('\n')
      .filter((l) => !/^\s*#/.test(l))
      .join('\n');
  }

  it('zero `npx tsx` em código, nos cinco arquivos que o tinham', () => {
    for (const rel of ARQUIVOS) expect(codigo(rel)).not.toMatch(/npx\s+tsx/);
  });

  it('as 14 chamadas usam "${ORQ_TSX[@]}" — array, nunca `$(tsx_bin)` sem aspas', () => {
    const total = ARQUIVOS.map((rel) => (codigo(rel).match(/"\$\{ORQ_TSX\[@\]\}"/g) ?? []).length)
      .reduce((a, b) => a + b, 0);
    // 13 aqui: a 14ª é o `orq config`, despachado ANTES do lib.sh (caso abaixo).
    expect(total).toBe(13);
    for (const rel of ARQUIVOS) expect(codigo(rel)).not.toMatch(/\$\(tsx_bin\)/);
  });

  it('launchd-run.sh:45 continua sendo COMENTÁRIO — não havia chamada para trocar', () => {
    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'launchd-run.sh'), 'utf8');
    expect(fonte).toMatch(/#.*`npx tsx`/);
    expect(codigo('scripts/orquestrador/launchd-run.sh')).not.toMatch(/npx\s+tsx/);
  });

  it('`orq config` roda antes do lib.sh e resolve o tsx pela MESMA regra', () => {
    const fonte = readFileSync(ORQ, 'utf8');
    const prologo = fonte.slice(0, fonte.indexOf('source "$ORQ_DIR/orquestrador/lib.sh"'));
    expect(prologo).toContain('$_main/node_modules/.bin/tsx');
    expect(prologo).toContain('npx --no-install tsx');
    expect(prologo).toContain('"${_tsx[@]}"');
    expect(prologo).not.toMatch(/npx\s+tsx\b/);
  });

  it('`orq config` de verdade continua respondendo no fixture (rc 0)', () => {
    const r = spawnSync(ORQ, ['config'], {
      encoding: 'utf8',
      cwd: FX,
      env: { ...process.env, ORQ_EXEC_ROOT: FX },
    });
    expect(r.status).toBe(0);
  });
});

// ─── local-loop.sh: a recusa vem ANTES de qualquer TypeScript ────────────────

describe('local-loop.sh · tsx_ou_sai precede tudo', () => {
  const loop = readFileSync(LOOP, 'utf8');

  it('a chamada vem ANTES do lock — que já é TypeScript (lock_stale roda tsx -e)', () => {
    const iTsx = loop.indexOf('\n  tsx_ou_sai\n');
    const iLock = loop.indexOf('lock_adquirir || exit 0');
    expect(iTsx).toBeGreaterThan(0);
    expect(iTsx).toBeLessThan(iLock);
  });

  it('em falta: PREVOO_NOGO item=tsx, notifica, sai 1 — e NÃO escreve STATUS', () => {
    const fn = /tsx_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
    expect(fn).toContain('event \'---\' PREVOO_NOGO "item=tsx"');
    expect(fn).toContain('notificar "Orquestrador: pré-voo NO-GO"');
    expect(fn).toContain('exit 1');
    // STATUS é do run que tem o lock, e aqui ainda não há lock nenhum.
    expect(fn).not.toContain('status_set');
    expect(fn).not.toMatch(/ticket_set|run_executor_once|lock_adquirir/);
  });

  it('a mensagem nomeia o passo humano, com a versão do kit', () => {
    const fn = /tsx_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
    expect(fn).toContain('pnpm add -D tsx@^4.19.0');
    expect(fn).toContain('npm i -D tsx@^4.19.0');
  });
});

describe('local-loop.sh · rodado de verdade num repo sem tsx', () => {
  /** PATH com o stub de `npx` na frente: chegar nele já é a falha. */
  function ambiente(raiz: string, logNpx: string) {
    return {
      ...process.env,
      PATH: `${BIN_SEM_REDE}:${process.env.PATH ?? ''}`,
      ORQ_NPX_LOG: logNpx,
      ORQ_EXEC_ROOT: raiz,
      ORQ_TESTE: '1',
    };
  }

  function rodar(raiz: string) {
    const logNpx = join(raiz, '..', 'npx-chamadas.log');
    const r = spawnSync('bash', [join(raiz, 'scripts', 'orquestrador', 'local-loop.sh')], {
      encoding: 'utf8',
      cwd: raiz,
      env: ambiente(raiz, logNpx),
    });
    return {
      rc: r.status ?? 1,
      log: ler(join(raiz, 'docs', 'fila', 'runs', 'local-loop.log')),
      eventos: ler(join(raiz, 'docs', 'fila', 'runs', 'events.log')),
      notificacoes: ler(join(raiz, 'docs', 'fila', 'runs', 'notificacoes.log')),
      npx: ler(logNpx),
    };
  }

  /** Assinatura de todos os tickets da fila: nome + tamanho + mtime. */
  function fila(raiz: string): string[] {
    const dir = join(raiz, 'docs', 'fila');
    return readdirSync(dir)
      .filter((f) => /^[0-9].*\.md$/.test(f))
      .sort()
      .map((f) => {
        const s = statSync(join(dir, f));
        return `${f} ${s.size} ${s.mtimeMs}`;
      });
  }

  it('recusa NOMEADA: rc 1, PREVOO_NOGO item=tsx na trilha e uma notificação', () => {
    const repo = copiaSemTsx();
    const r = rodar(repo);
    expect(r.rc).toBe(1);
    expect(r.eventos).toContain('PREVOO_NOGO item=tsx');
    expect(r.log).toContain('toolchain NO-GO');
    expect(r.log).toContain('node_modules/.bin/tsx');
    expect(r.notificacoes).toContain('pré-voo NO-GO');
  });

  it('SEM acesso à rede: o `npx` nunca é chamado (o stub não registrou nada)', () => {
    const repo = copiaSemTsx();
    const r = rodar(repo);
    expect(r.npx).toBe('');
  });

  it('não toca ticket nenhum, não cria lock e não reescreve o STATUS', () => {
    const repo = copiaSemTsx();
    const antes = fila(repo);
    const statusAntes = ler(join(repo, 'docs', 'fila', 'runs', 'STATUS.md'));
    const r = rodar(repo);
    expect(r.rc).toBe(1);
    expect(fila(repo)).toEqual(antes);
    expect(existsSync(join(repo, 'docs', 'fila', 'runs', '.local-loop.lock'))).toBe(false);
    expect(ler(join(repo, 'docs', 'fila', 'runs', 'STATUS.md'))).toBe(statusAntes);
  });

  it('COM tsx no lugar, o guard passa e o loop segue para o kill switch', () => {
    const repo = copiaComTsx();
    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'teste T1\n');
    const r = rodar(repo);
    expect(r.rc).toBe(0);
    expect(r.log).not.toContain('toolchain NO-GO');
    expect(r.eventos).not.toContain('item=tsx');
    expect(r.log).toContain('PAUSA ativa');
  });
});

// ─── pré-voo: cat.7 ──────────────────────────────────────────────────────────

describe('cat.7 · toolchain', () => {
  function deps(over: Partial<PreVooDeps> = {}): PreVooDeps {
    return {
      tsxLocal: () => true,
      arquivoComConteudo: () => true,
      contarArquivosCommitados: () => 6,
      lerOrigin: () => 'git@github.com:exemplo/actus-saas.git',
      lerEnv: () => 'SUPABASE_URL=https://fqwhpcusmkmvtgyofuwh.supabase.co',
      filaTemArquivo: () => true,
      filaTemDir: () => true,
      lerLiberacoes: () => '{"tokens":[]}',
      ultimaSondagem: () => null,
      hoje: () => '2026-09-09',
      ...over,
    };
  }
  const CONFIG = { repo_origin_deve_conter: 'actus-saas', ambiente_id: 'fqwhpcusmkmvtgyofuwh' };

  it('sem o tsx do repo: NO-GO com token cat.7 e a linha de instalação', () => {
    const r = checarToolchain({ tsxLocal: () => false });
    expect(r.ok).toBe(false);
    expect(r.token).toBe('cat.7');
    expect(r.item).toContain('node_modules/.bin/tsx');
    expect(r.motivo).toContain('pnpm add -D tsx@^4.19.0');
  });

  it('com o tsx do repo: ok, e não é item informativo (decide o veredito)', () => {
    const r = checarToolchain({ tsxLocal: () => true });
    expect(r.ok).toBe(true);
    expect(r.info).toBeUndefined();
  });

  it('a cat.7 é a PRIMEIRA: em NO-GO dela, nenhuma outra chega a rodar', () => {
    const chamadas: string[] = [];
    const v = preVooRelampago({
      config: CONFIG,
      deps: deps({
        tsxLocal: () => false,
        arquivoComConteudo: () => {
          chamadas.push('cat.0');
          return true;
        },
        lerOrigin: () => {
          chamadas.push('cat.1');
          return '';
        },
      }),
    });
    expect(v.ok).toBe(false);
    expect(v.token).toBe('cat.7');
    expect(v.itens).toHaveLength(1);
    expect(chamadas).toEqual([]);
  });

  it('a última linha do render é `NO-GO cat.7 · …` — o que o loop lê com awk $2', () => {
    const saida = render(preVooRelampago({ config: CONFIG, deps: deps({ tsxLocal: () => false }) }));
    const ultima = saida.trim().split('\n').pop()!;
    expect(ultima.startsWith('NO-GO cat.7 · ')).toBe(true);
    expect(ultima.split(' ')[1]).toBe('cat.7');
  });

  it('em GO, a cat.7 aparece na saída antes da cat.0', () => {
    const saida = render(preVooRelampago({ config: CONFIG, deps: deps() }));
    expect(saida.indexOf('cat.7')).toBeLessThan(saida.indexOf('cat.0'));
    expect(saida.trim().endsWith('GO')).toBe(true);
  });

  it('a dep real é `test -x` no checkout: nada de npx, nada de rede', () => {
    const comTsx = preVooDepsReais({ repoRoot: FX, filaDir: join(FX, 'docs/fila'), runsDir: join(FX, 'docs/fila/runs'), custoFile: join(FX, 'docs/fila/runs/custo.json') });
    expect(comTsx.tsxLocal()).toBe(true);
    const semTsxRepo = copiaSemTsx();
    const semTsx = preVooDepsReais({ repoRoot: semTsxRepo, filaDir: join(semTsxRepo, 'docs/fila'), runsDir: join(semTsxRepo, 'docs/fila/runs'), custoFile: join(semTsxRepo, 'docs/fila/runs/custo.json') });
    expect(semTsx.tsxLocal()).toBe(false);
    // O código da dep não menciona npx: a pergunta é sobre o binário DO REPO.
    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'prevoo.ts'), 'utf8');
    const dep = /tsxLocal: \(\) => \{[\s\S]*?\n    \},/.exec(fonte)![0];
    expect(dep).not.toContain('npx');
    expect(dep).toContain('constants.X_OK');
  });

  it('`orq prevoo` no fixture continua GO, com a cat.7 na saída', () => {
    const r = spawnSync(ORQ, ['prevoo'], {
      encoding: 'utf8',
      cwd: FX,
      env: { ...process.env, ORQ_EXEC_ROOT: FX },
    });
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('cat.7');
    expect(r.stdout.trim().endsWith('GO')).toBe(true);
  });
});

// ─── instalar.sh: --atualizar e --novo recusam; --dry-run só avisa ───────────

describe('instalar.sh · recusa repo sem tsx', () => {
  function instalar(args: string[]) {
    const r = spawnSync('bash', [INSTALAR, ...args], {
      encoding: 'utf8',
      env: { ...process.env, ORQ_TESTE: '1' },
    });
    return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
  }

  /** Repo git virgem, sem docs/fila e sem node_modules — o alvo do `--novo`. */
  function repoVirgem(lock?: 'pnpm' | 'npm'): string {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-novo-'));
    writeFileSync(join(raiz, 'package.json'), '{"name":"alvo","private":true}\n');
    if (lock === 'pnpm') writeFileSync(join(raiz, 'pnpm-lock.yaml'), "lockfileVersion: '9.0'\n");
    if (lock === 'npm') writeFileSync(join(raiz, 'package-lock.json'), '{"lockfileVersion":3}\n');
    for (const a of [
      ['init', '-q', '-b', 'main'],
      ['config', 'user.name', 't'],
      ['config', 'user.email', 't@example.invalid'],
      ['add', '--', 'package.json'],
      ['commit', '-q', '-m', 'inicial'],
    ]) {
      spawnSync('git', ['-C', raiz, ...a], { encoding: 'utf8' });
    }
    return raiz;
  }

  it('--atualizar RECUSA (rc 1) e a mensagem nomeia o repo e o comando', () => {
    const repo = copiaSemTsx();
    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
    const r = instalar(['--atualizar', repo]);
    expect(r.rc).toBe(1);
    expect(r.saida).toContain('RECUSADO');
    expect(r.saida).toContain('node_modules/.bin/tsx');
    expect(r.saida).toContain(repo);
  });

  it('--forcar NÃO dispensa: forçar copiaria um motor que não roda', () => {
    const repo = copiaSemTsx();
    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
    expect(instalar(['--atualizar', repo, '--forcar']).rc).toBe(1);
  });

  it('--dry-run SÓ AVISA: sai 0 e prevê a recusa, sem escrever nada', () => {
    const repo = copiaSemTsx();
    writeFileSync(join(repo, 'docs', 'fila', 'PAUSAR'), 'atualizando\n');
    const sujoAntes = spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout;
    const r = instalar(['--atualizar', repo, '--dry-run']);
    expect(r.rc).toBe(0);
    expect(r.saida).toContain('RECUSARIA');
    expect(r.saida).toContain('node_modules/.bin/tsx');
    expect(spawnSync('git', ['-C', repo, 'status', '--porcelain'], { encoding: 'utf8' }).stdout).toBe(sujoAntes);
  });

  it('com pnpm-lock.yaml a linha é `pnpm add -D`; com package-lock.json é `npm i -D`', () => {
    const comPnpm = repoVirgem('pnpm');
    expect(instalar(['--novo', comPnpm]).saida).toContain('pnpm add -D tsx@^4.19.0');
    const comNpm = repoVirgem('npm');
    expect(instalar(['--novo', comNpm]).saida).toContain('npm i -D tsx@^4.19.0');
  });

  it('--novo RECUSA (rc 1) e não escreve UM byte no repo alvo', () => {
    const repo = repoVirgem('pnpm');
    const antes = readdirSync(repo).sort();
    const r = instalar(['--novo', repo]);
    expect(r.rc).toBe(1);
    expect(r.saida).toContain('RECUSADO');
    expect(readdirSync(repo).sort()).toEqual(antes);
    expect(existsSync(join(repo, 'docs'))).toBe(false);
    expect(existsSync(join(repo, 'scripts'))).toBe(false);
  });

  it('com tsx no lugar, o `--novo` volta a instalar (a recusa é SÓ sobre o tsx)', () => {
    const repo = repoVirgem('pnpm');
    const bin = join(repo, 'node_modules', '.bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'tsx'), '#!/bin/sh\nexit 0\n');
    chmodSync(join(bin, 'tsx'), 0o755);
    const r = instalar(['--novo', repo]);
    expect(r.saida).not.toContain('node_modules/.bin/tsx');
    expect(existsSync(join(repo, 'docs', 'fila', '000-config.json'))).toBe(true);
  });

  it('o range do tsx sai do package.json do kit — nunca de uma constante à parte', () => {
    const pkg = JSON.parse(readFileSync(join(REPO_ROOT, 'package.json'), 'utf8')) as {
      devDependencies: Record<string, string>;
    };
    const fonte = readFileSync(INSTALAR, 'utf8');
    expect(fonte).toContain('"$KIT/package.json"');
    const repo = repoVirgem('pnpm');
    expect(instalar(['--novo', repo]).saida).toContain(`tsx@${pkg.devDependencies.tsx}`);
  });
});
