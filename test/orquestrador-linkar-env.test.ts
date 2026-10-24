/**
 * Etapa 8d-P1 — `worktree.linkar_env`: o executor para de ligar o `.env.local`
 * do checkout principal na worktree quando o config manda.
 *
 * O caso que motivou: no dashboard-comercial o `.env.local` do principal tem a
 * credencial do banco de PRODUÇÃO (compartilhado com o Comarka OS). Ligado na
 * worktree, gates, critérios, agente e juiz rodariam com ela à vista
 * (executor.sh: gates com cwd na worktree, critérios com `cd "$wt"`).
 *
 * Os configs são as cópias de `test/fixtures/config/` (PROCEDENCIA.md): o do CI
 * (sem a chave: o comportamento de hoje) e o rascunho da seção H do relatório de
 * paridade do dashboard (`"worktree": {"linkar_env": false}`).
 *
 * O que estes casos cobram:
 *   1. com `false`, a worktree nasce sem NENHUM `.env*` e o evento aparece;
 *   2. sem a chave (CI) ou com `true`, os links são os mesmos de hoje;
 *   3. worktree REAPROVEITADA com `false`: os links `.env*` que sobraram somem,
 *      e o evento diz quantos — só symlink; arquivo regular versionado fica;
 *   4. valor inválido ("false" string, 0, null explícito) aborta no preflight,
 *      com a chave e o valor na mensagem — e o `orq config` acusa o mesmo;
 *   5. o preflight lê o `.env.local` do principal sem exportar nada: o valor não
 *      chega a processo filho (prova da condição 4 do ok, não vermelho).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { existsSync, lstatSync, mkdirSync, readFileSync, readlinkSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { bashNoFixture, criarFixture, REPO_ROOT } from './fixtures/orq-harness.js';
import { validarConfig } from '../scripts/orquestrador/config-cli.js';
import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const FX = join(REPO_ROOT, 'test', 'fixtures', 'config');
const CI = readFileSync(join(FX, 'ci-000-config.json'), 'utf8');
const DASH = readFileSync(join(FX, 'dashboard-rascunho-h-000-config.json'), 'utf8');

function comWorktree(bruto: string, valor: unknown): string {
  const c = JSON.parse(bruto) as Record<string, unknown>;
  c.worktree = { linkar_env: valor };
  return `${JSON.stringify(c, null, 2)}\n`;
}

function git(raiz: string, ...args: string[]): void {
  const r = spawnSync('git', ['-C', raiz, '-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')}: ${r.stderr}`);
}

/**
 * Checkout principal de verdade (git), com o config pedido e `.env.local` FALSO
 * na raiz e em `apps/web` — os dois lugares que o executor liga hoje.
 */
function principal(config: string): string {
  const raiz = criarFixture([]);
  writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), config);
  git(raiz, 'init', '-q', '-b', 'main');
  // `apps/web` versionado, como no CI: é dentro dele que o segundo link nasce.
  mkdirSync(join(raiz, 'apps', 'web'), { recursive: true });
  writeFileSync(join(raiz, 'README.md'), 'x\n');
  writeFileSync(join(raiz, 'apps', 'web', 'README.md'), 'x\n');
  git(raiz, 'add', 'README.md', 'apps/web/README.md');
  git(raiz, 'commit', '-q', '-m', 'base');
  git(raiz, 'branch', 'staging-auto');
  writeFileSync(join(raiz, '.env.local'), 'SUPABASE_URL=https://fake-8d.supabase.co\n');
  writeFileSync(join(raiz, 'apps', 'web', '.env.local'), 'SUPABASE_URL=https://fake-8d.supabase.co\n');
  return raiz;
}

function noExecutor(raiz: string, corpo: string) {
  return bashNoFixture(raiz, ['export EXECUTOR_SOURCED=1', `source "${EXECUTOR}"`, 'set +e', corpo].join('\n'));
}

/** Todo `.env*` da worktree (fora do `.git`), como `find` o vê: `l` symlink, `f` arquivo. */
function envsNa(raiz: string, wt: string): string[] {
  const r = noExecutor(
    raiz,
    `find "${wt}" -name .git -prune -o -name node_modules -prune -o -name '.env*' -print | sed "s|^${wt}/||" | LC_ALL=C sort`,
  );
  return r.stdout.split('\n').filter(Boolean);
}

function eventos(raiz: string): string {
  const p = join(raiz, 'docs', 'fila', 'runs', 'events.log');
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
}

describe('P1 · setup_worktree e worktree.linkar_env', () => {
  it('com false (rascunho do dashboard): a worktree não tem nenhum .env* e o evento aparece', () => {
    const raiz = principal(DASH);
    const wt = join(raiz, '..', `wt-8d-false-${process.pid}`);
    const r = noExecutor(raiz, `setup_worktree DC-1 "${wt}"`);
    expect(r.rc, r.stderr).toBe(0);
    expect(envsNa(raiz, wt)).toEqual([]);
    expect(eventos(raiz)).toMatch(/ DC-1 WORKTREE env=nao-linkado motivo=worktree\.linkar_env=false apagados=0\n/);
  });

  it('sem a chave (CI): os mesmos dois links de hoje, para o principal, e nenhum evento de env', () => {
    const raiz = principal(CI);
    const wt = join(raiz, '..', `wt-8d-ci-${process.pid}`);
    const r = noExecutor(raiz, `setup_worktree CI-1 "${wt}"`);
    expect(r.rc, r.stderr).toBe(0);
    expect(envsNa(raiz, wt)).toEqual(['.env.local', 'apps/web/.env.local']);
    for (const d of ['', 'apps/web/']) {
      expect(lstatSync(join(wt, `${d}.env.local`)).isSymbolicLink()).toBe(true);
      expect(readlinkSync(join(wt, `${d}.env.local`))).toMatch(new RegExp(`/${d.replace('/', '\\/')}\\.env\\.local$`));
    }
    expect(eventos(raiz)).not.toMatch(/env=nao-linkado/);
  });

  it('com true explícito: idêntico ao CI sem a chave', () => {
    const raiz = principal(comWorktree(CI, true));
    const wt = join(raiz, '..', `wt-8d-true-${process.pid}`);
    expect(noExecutor(raiz, `setup_worktree CI-2 "${wt}"`).rc).toBe(0);
    expect(envsNa(raiz, wt)).toEqual(['.env.local', 'apps/web/.env.local']);
    expect(eventos(raiz)).not.toMatch(/env=nao-linkado/);
  });

  it('worktree reaproveitada com false: apaga só os symlinks .env*, conta, e não toca arquivo regular', () => {
    const raiz = principal(DASH);
    const wt = join(raiz, '..', `wt-8d-reuso-${process.pid}`);
    mkdirSync(join(wt, 'apps', 'web'), { recursive: true });
    // O que sobra de uma tentativa feita com true: os dois links.
    symlinkSync(join(raiz, '.env.local'), join(wt, '.env.local'));
    symlinkSync(join(raiz, 'apps', 'web', '.env.local'), join(wt, 'apps', 'web', '.env.local'));
    // Versionado (o dashboard tem `.env.example` na main): arquivo regular, fica.
    writeFileSync(join(wt, '.env.example'), 'SUPABASE_URL=\n');
    const r = noExecutor(raiz, `env_na_worktree DC-2 "${wt}"`);
    expect(r.rc, r.stderr).toBe(0);
    expect(envsNa(raiz, wt)).toEqual(['.env.example']);
    expect(lstatSync(join(wt, '.env.example')).isFile()).toBe(true);
    expect(eventos(raiz)).toMatch(/ DC-2 WORKTREE env=nao-linkado motivo=worktree\.linkar_env=false apagados=2\n/);
  });
});

describe('P1 · valor inválido aborta no preflight', () => {
  for (const [rotulo, valor, mostrado] of [
    ['a string "false"', 'false', '"false"'],
    ['0', 0, '0'],
    ['null explícito', null, 'null'],
  ] as const) {
    it(`${rotulo}: exigir_linkar_env_valido sai != 0 com a chave e o valor`, () => {
      const raiz = principal(comWorktree(CI, valor));
      const r = noExecutor(raiz, 'exigir_linkar_env_valido; echo "NAO-ABORTOU"');
      expect(r.rc).not.toBe(0);
      expect(r.stdout).not.toContain('NAO-ABORTOU');
      expect(r.stderr).toContain(`worktree.linkar_env=${mostrado}`);
    });

    it(`${rotulo}: o orq config acusa a mesma chave`, () => {
      const v = validarConfig(JSON.parse(comWorktree(CI, valor)));
      expect(v.map((x) => x.chave)).toContain('worktree.linkar_env');
    });
  }

  it('o preflight chama a validação', () => {
    const fonte = readFileSync(EXECUTOR, 'utf8');
    const corpo = fonte.slice(fonte.indexOf('preflight() {'), fonte.indexOf('\n}\n', fonte.indexOf('preflight() {')));
    expect(corpo).toContain('exigir_linkar_env_valido');
  });

  it('true, false e ausente não são violação do orq config', () => {
    for (const cfg of [CI, DASH, comWorktree(CI, true)]) {
      expect(validarConfig(JSON.parse(cfg)).map((x) => x.chave)).not.toContain('worktree.linkar_env');
    }
  });

  it('a chave é lida pelo motor e é opcional (config-chaves.ts)', () => {
    const c = CHAVES_CONFIG.find((x) => x.chave === 'worktree.linkar_env');
    expect(c?.obrigatoria).toBe(false);
  });
});

describe('P1 · o preflight lê o .env.local do principal e não exporta (condição 4)', () => {
  it('o valor lido por env_value não chega a processo filho', () => {
    const raiz = principal(DASH);
    const r = noExecutor(
      raiz,
      [
        'unset SUPABASE_URL',
        'url="$(env_value SUPABASE_URL)"',
        'env_key_present SUPABASE_URL && echo "LIDO=$url"',
        "bash -c 'echo \"FILHO=${SUPABASE_URL:-AUSENTE}\"'",
      ].join('\n'),
    );
    expect(r.stdout).toContain('LIDO=https://fake-8d.supabase.co');
    expect(r.stdout).toContain('FILHO=AUSENTE');
  });
});

/**
 * K1 (dashboard-comercial, 24/10/2026) — com `false`, o principal não pode ter
 * `.env*` fora do git. O `false` só impedia o LINK; o arquivo seguia no disco ao
 * alcance de um `cat ../..`. Controle negativo: o mesmo principal, sem os dois
 * arquivos, passa — e o `.env.example` VERSIONADO nunca reprova.
 */
describe('K1 · exigir_principal_sem_env', () => {
  it('com false e .env.local solto na raiz e em apps/web: aborta nomeando os dois, sem apagar', () => {
    const raiz = principal(DASH);
    const r = noExecutor(raiz, 'exigir_principal_sem_env; echo "CHEGOU"');
    expect(r.rc).not.toBe(0);
    expect(r.stdout).not.toContain('CHEGOU');
    expect(`${r.stdout}${r.stderr}`).toMatch(/linkar_env=false e o checkout principal tem \.env\* fora do git: \.env\.local apps\/web\/\.env\.local/);
    expect(existsSync(join(raiz, '.env.local'))).toBe(true);
    expect(existsSync(join(raiz, 'apps', 'web', '.env.local'))).toBe(true);
  });

  it('controle negativo: o mesmo principal sem os arquivos passa', () => {
    const raiz = principal(DASH);
    spawnSync('rm', ['-f', join(raiz, '.env.local'), join(raiz, 'apps', 'web', '.env.local')]);
    const r = noExecutor(raiz, 'exigir_principal_sem_env && echo "CHEGOU"');
    expect(r.rc, r.stderr).toBe(0);
    expect(r.stdout).toContain('CHEGOU');
  });

  it('.env.example versionado não reprova; o mesmo nome fora do git reprova', () => {
    const raiz = principal(DASH);
    spawnSync('rm', ['-f', join(raiz, '.env.local'), join(raiz, 'apps', 'web', '.env.local')]);
    writeFileSync(join(raiz, '.env.example'), 'SUPABASE_URL=\n');
    expect(noExecutor(raiz, 'exigir_principal_sem_env').rc).not.toBe(0);
    git(raiz, 'add', '.env.example');
    git(raiz, 'commit', '-q', '-m', 'example');
    expect(noExecutor(raiz, 'exigir_principal_sem_env').rc).toBe(0);
  });

  it('symlink .env* solto também reprova (é credencial do mesmo jeito)', () => {
    const raiz = principal(DASH);
    spawnSync('rm', ['-f', join(raiz, 'apps', 'web', '.env.local')]);
    spawnSync('mv', [join(raiz, '.env.local'), join(raiz, '..', `env-fora-${process.pid}`)]);
    symlinkSync(join(raiz, '..', `env-fora-${process.pid}`), join(raiz, '.env.production'));
    const r = noExecutor(raiz, 'exigir_principal_sem_env');
    expect(r.rc).not.toBe(0);
    expect(`${r.stdout}${r.stderr}`).toContain('.env.production');
  });

  it('sem a chave (CI) ou com true: não cobra nada, mesmo com .env.local presente', () => {
    for (const cfg of [CI, comWorktree(CI, true)]) {
      const r = noExecutor(principal(cfg), 'exigir_principal_sem_env && echo "CHEGOU"');
      expect(r.rc, r.stderr).toBe(0);
      expect(r.stdout).toContain('CHEGOU');
    }
  });

  it('o preflight chama a guarda logo depois da validação do valor', () => {
    const exe = readFileSync(EXECUTOR, 'utf8');
    expect(exe).toMatch(/\n  exigir_linkar_env_valido\n  exigir_principal_sem_env\n/);
  });
});
