/**
 * Etapa KF, P2 (M-68): a fila do próprio kit, em `docs/fila-kit/` (P-1 do
 * Lucas, 07/11), escolhida por `ORQ_CONFIG`. O kit continua SEM `docs/fila`:
 * `orq-harness.ts:configDeReferencia` e as guardas dos test-*.sh dependem disso.
 */
import { describe, expect, it } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { validarConfig } from '../scripts/orquestrador/config-cli.js';
import { enforce, type EnforceConfig } from '../scripts/orquestrador/enforcement-core.js';
import { criarFixture, REPO_ROOT } from './fixtures/orq-harness.js';

const FILA = join(REPO_ROOT, 'docs', 'fila-kit');
const CFG_PATH = join(FILA, '000-config.json');
const cfg = () => JSON.parse(readFileSync(CFG_PATH, 'utf8')) as Record<string, any>;

const REGUA = [
  'scripts/orquestrador/gates.ts',
  'scripts/orquestrador/juiz.ts',
  'scripts/orquestrador/enforcement-core.ts',
  'scripts/orquestrador/enforcement.sh',
  'scripts/orquestrador/decisao.ts',
  'scripts/orquestrador/decisao-cli.ts',
  'scripts/orquestrador/gate-ticket.ts',
  'scripts/orquestrador/perfil.ts',
  'scripts/orquestrador/campos-do-motor.json',
  'schemas/**',
  'docs/fila-kit/000-config.json',
  'docs/fila-kit/liberacoes.json',
  'scripts/kit/test-shell.sh',
  'scripts/kit/test-instalar.sh',
  'vitest.config.ts',
  'tsconfig.json',
  'package.json',
  'package-lock.json',
  'CLAUDE.md',
];

describe('KF-P2 · a fila do kit existe, em docs/fila-kit, e o kit segue sem docs/fila', () => {
  it('estrutura: config, liberações v2 vazio, _TEMPLATE, rascunhos/, runs/', () => {
    for (const f of ['000-config.json', 'liberacoes.json', '_TEMPLATE.md', 'decisoes-pendentes.md', 'rascunhos/.gitkeep', 'runs/.gitignore']) {
      expect(existsSync(join(FILA, f)), f).toBe(true);
    }
    expect(JSON.parse(readFileSync(join(FILA, 'liberacoes.json'), 'utf8'))).toEqual({ $schema_versao: 2, tokens: [] });
    expect(existsSync(join(REPO_ROOT, 'docs', 'fila'))).toBe(false);
  });
  it('orq config: 0 violações', () => {
    expect(validarConfig(cfg())).toEqual([]);
  });
  it('os caminhos da fila moram na pasta dela; branch, prefixo e label próprios', () => {
    const c = cfg();
    expect([c.runs_dir, c.liberacoes_file, c.decisoes_file, c.pausar_file, c.orcamento.custo_file]).toEqual([
      'docs/fila-kit/runs', 'docs/fila-kit/liberacoes.json', 'docs/fila-kit/decisoes-pendentes.md',
      'docs/fila-kit/PAUSAR', 'docs/fila-kit/runs/custo.json',
    ]);
    expect([c.branch_alvo, c.branch_protegida, c.worktrees_prefixo, c.launchd.label]).toEqual([
      'staging-kit', 'main', 'kit-orq-', 'com.orquestrador-kit.orquestrador',
    ]);
    expect(c.enforcement.afrouxamento).toBe('todo_teste');
  });
  it('claude_timeout_secs 4200: o executor roda as suítes duas vezes dentro do claude -p (Q-3)', () => {
    expect(cfg().claude_timeout_secs).toBe(4200);
  });
});

describe('KF-P2 · a régua está na zona proibida (KF-2, P-8)', () => {
  it('no_write_paths tem a régua inteira', () => {
    expect(cfg().zona_proibida.no_write_paths).toEqual(expect.arrayContaining(REGUA));
  });
  it.each(REGUA.map((g) => g.replace('**', 'veredito.schema.json')))('%s reprova mesmo pedido na allowlist', (arq) => {
    const r = enforce({ changedFiles: [arq], allowlist: [arq], diff: '', config: cfg() as unknown as EnforceConfig });
    expect(r.violations.map((v) => v.tipo)).toEqual(['zona_proibida']);
  });
  it('o canário (config-chaves.ts) fica no alcance do loop', () => {
    const arq = 'scripts/orquestrador/config-chaves.ts';
    expect(enforce({ changedFiles: [arq], allowlist: [arq], diff: '', config: cfg() as unknown as EnforceConfig }).ok).toBe(true);
  });
});

describe('KF-P2 · os gates não herdam o ORQ_CONFIG do loop (A2)', () => {
  it('todo gate começa com env -u ORQ_CONFIG -u ORQ_GATE e a ordem é a da lista', () => {
    const c = cfg();
    for (const g of c.gates) expect(g.cmd, g.nome).toMatch(/^env -u ORQ_CONFIG -u ORQ_GATE /);
    expect(c._execucao_dos_gates.ordem_obrigatoria).toEqual(c.gates.map((g: { nome: string }) => g.nome));
  });
  it('o gate de testes roda o harness: sob o ORQ_GATE=1 do gates.ts, describeHarness não vira skip', () => {
    // gates.ts:448 roda o gate com ORQ_GATE=1, e orq-harness.ts:describeHarness é
    // describe.skipIf(ORQ_GATE === '1'): sem o -u, 28 arquivos de teste do motor somem do gate do kit.
    const testes = cfg().gates.find((g: { nome: string }) => g.nome === 'testes').cmd as string;
    const sonda = testes.replace(/node_modules\/\.bin\/vitest run$/, `node -e "process.exit(process.env.ORQ_GATE === '1' ? 1 : 0)"`);
    expect(sonda).not.toBe(testes);
    const r = spawnSync('bash', ['-c', sonda], { env: { ...process.env, ORQ_GATE: '1' } });
    expect(r.status).toBe(0);
  });
  it('com ORQ_CONFIG exportado, o lib.sh num fixture aborta sem o prefixo e carrega com ele', () => {
    const raiz = criarFixture();
    try {
      const lib = join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh');
      const corpo = `bash -c 'export ORQ_EXEC_ROOT="${raiz}"; source "${lib}" && echo FILA=$FILA_DIR'`;
      const env = { ...process.env, ORQ_CONFIG: 'docs/fila-kit/000-config.json' };
      const sem = spawnSync('bash', ['-c', corpo], { encoding: 'utf8', cwd: raiz, env });
      expect(sem.status).not.toBe(0);
      expect(sem.stderr).toContain('ORQ_CONFIG');
      const com = spawnSync('bash', ['-c', `env -u ORQ_CONFIG ${corpo}`], { encoding: 'utf8', cwd: raiz, env });
      expect(com.stderr).toBe('');
      expect(com.stdout.trim()).toBe(`FILA=${raiz}/docs/fila`);
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
});

describe('KF-P2 · .gitignore: o symlink node_modules da worktree, a pausa e os runs (A3, P-2)', () => {
  const ignora = (raiz: string, p: string) => spawnSync('git', ['-C', raiz, 'check-ignore', '-q', p]).status === 0;
  it('node_modules como SYMLINK é ignorado (é o que o executor cria na worktree)', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'kf-gi-'));
    try {
      spawnSync('git', ['init', '-q', raiz]);
      spawnSync('cp', [join(REPO_ROOT, '.gitignore'), join(raiz, '.gitignore')]);
      symlinkSync(join(REPO_ROOT, 'node_modules'), join(raiz, 'node_modules'));
      expect(ignora(raiz, 'node_modules')).toBe(true);
      const st = spawnSync('git', ['-C', raiz, 'status', '--porcelain', '--untracked-files=all'], { encoding: 'utf8' }).stdout;
      expect(st).not.toContain('node_modules');
    } finally {
      rmSync(raiz, { recursive: true, force: true });
    }
  });
  it('PAUSAR e runs/ da fila do kit são ignorados', () => {
    expect(ignora(REPO_ROOT, 'docs/fila-kit/PAUSAR')).toBe(true);
    expect(ignora(REPO_ROOT, 'docs/fila-kit/runs/events.log')).toBe(true);
    expect(ignora(REPO_ROOT, 'docs/fila-kit/runs/.gitignore')).toBe(false);
  });
});
