/**
 * Etapa c0052-B1a (M-54): N filas por repo. Cada fila tem o seu 000-config.json
 * e `ORQ_CONFIG` escolhe qual; a pasta da fila é o diretório do config.
 *
 * Fixtures reais: os configs do CI e do dashboard (`test/fixtures/config/`) e
 * quatro tickets do Comarka 93ecfa4 com dependência entre as duas filas
 * (`test/fixtures/c0052/comarka/`: 5031 do apolo depende do 1137 da plataforma,
 * 1254 da plataforma depende do 5197 do apolo).
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, bashNoFixture, criarFixture, escrever } from './fixtures/orq-harness.js';
import { caminhoConfig, filaDir } from '../scripts/orquestrador/fila-caminho.js';
import { checarEstruturaFila, entradaDoCheckout, preVooDepsReais } from '../scripts/orquestrador/prevoo.js';

const FX = join(REPO_ROOT, 'test', 'fixtures');
const CFG_CI = join(FX, 'config', 'ci-000-config.json');
const CFG_DASH = join(FX, 'config', 'dashboard-rascunho-h-000-config.json');
const COMARKA = join(FX, 'c0052', 'comarka');
const APOLO_CFG = 'docs/fila/apolo/000-config.json';

/** Config da irmã: o do dashboard com o que o apolo do Comarka troca por loop. */
export function configIrma(base = CFG_DASH, troca: Record<string, unknown> = {}): string {
  const j = JSON.parse(readFileSync(base, 'utf8')) as Record<string, unknown>;
  return JSON.stringify({
    ...j,
    branch_alvo: 'staging-apolo',
    worktrees_prefixo: 'orq-apolo-',
    runs_dir: 'docs/fila/apolo/runs',
    liberacoes_file: 'docs/fila/apolo/liberacoes.json',
    pausar_file: 'docs/fila/apolo/PAUSAR',
    ...troca,
  }, null, 2);
}

/** Checkout de papel com a fila raiz (config `cfgRaiz`) e a irmã apolo. */
export function duasFilas(cfgRaiz = CFG_CI, irma = configIrma()): string {
  const raiz = realpathSync(criarFixture());
  copyFileSync(cfgRaiz, join(raiz, 'docs', 'fila', '000-config.json'));
  escrever(join(raiz, APOLO_CFG), irma);
  mkdirSync(join(raiz, 'docs', 'fila', 'apolo', 'runs'), { recursive: true });
  for (const f of readdirSync(join(COMARKA, 'fila')).filter((n) => /^\d/.test(n))) {
    copyFileSync(join(COMARKA, 'fila', f), join(raiz, 'docs', 'fila', f));
  }
  for (const f of readdirSync(join(COMARKA, 'apolo'))) {
    copyFileSync(join(COMARKA, 'apolo', f), join(raiz, 'docs', 'fila', 'apolo', f));
  }
  return raiz;
}

const VARS = 'printf "%s\\n" "$CONFIG" "$FILA_DIR" "$RUNS_BASE" "$CFG_BRANCH_ALVO"; ticket_files';

describe('sem ORQ_CONFIG: os caminhos de hoje (regressão zero)', () => {
  for (const [nome, cfg] of [['CI', CFG_CI], ['dashboard', CFG_DASH]] as const) {
    it(`config real do ${nome}: lib.sh e fila-caminho.ts resolvem docs/fila`, () => {
      const raiz = duasFilas(cfg);
      const r = bashNoFixture(raiz, VARS, { ORQ_CONFIG: '' });
      expect(r.rc).toBe(0);
      const [config, fila, runs, branch, ...tickets] = r.stdout.trim().split('\n');
      expect(config).toBe(`${raiz}/docs/fila/000-config.json`);
      expect(fila).toBe(`${raiz}/docs/fila`);
      expect(runs).toBe(`${raiz}/docs/fila/runs`);
      expect(branch).toBe('staging-auto');
      expect(tickets.map((t) => t.replace(`${raiz}/`, ''))).toEqual([
        'docs/fila/1137-estado-plano-script.md',
        'docs/fila/1254-api-apolo-conhecimento-agente.md',
      ]);
      expect(caminhoConfig(raiz, {})).toBe(`${raiz}/docs/fila/000-config.json`);
      expect(filaDir(raiz, {})).toBe(`${raiz}/docs/fila`);
    });
  }
});

describe('ORQ_CONFIG escolhe a fila irmã', () => {
  it('relativo: pasta, runs, branch e tickets da irmã', () => {
    const raiz = duasFilas();
    const r = bashNoFixture(raiz, `${VARS}; echo "env=$ORQ_CONFIG"`, { ORQ_CONFIG: APOLO_CFG });
    expect(r.rc).toBe(0);
    const linhas = r.stdout.trim().split('\n');
    expect(linhas.slice(0, 4)).toEqual([
      `${raiz}/${APOLO_CFG}`, `${raiz}/docs/fila/apolo`, `${raiz}/docs/fila/apolo/runs`, 'staging-apolo',
    ]);
    expect(linhas.slice(4, -1).map((t) => t.replace(`${raiz}/`, ''))).toEqual([
      'docs/fila/apolo/5031-apolo-escritor-tickets-v0.md',
      'docs/fila/apolo/5197-apolo-conhecimento-comercial-sql.md',
    ]);
    expect(linhas.at(-1)).toBe(`env=${APOLO_CFG}`);
    expect(filaDir(raiz, { ORQ_CONFIG: APOLO_CFG })).toBe(`${raiz}/docs/fila/apolo`);
  });

  it('absoluto dentro do checkout vale e é exportado relativo', () => {
    const raiz = duasFilas();
    const r = bashNoFixture(raiz, 'echo "$FILA_DIR|$ORQ_CONFIG"', { ORQ_CONFIG: `${raiz}/${APOLO_CFG}` });
    expect(r.rc).toBe(0);
    expect(r.stdout.trim()).toBe(`${raiz}/docs/fila/apolo|${APOLO_CFG}`);
    expect(caminhoConfig(raiz, { ORQ_CONFIG: `${raiz}/${APOLO_CFG}` })).toBe(`${raiz}/${APOLO_CFG}`);
  });
});

describe('ORQ_CONFIG fora do checkout principal aborta', () => {
  const fora = realpathSync(mkdtempSync(join('/private/tmp', 'orq-c0052-fora-')));
  escrever(join(fora, '000-config.json'), configIrma());

  const casos: Array<[string, (raiz: string) => string]> = [
    ['absoluto em /private/tmp', () => join(fora, '000-config.json')],
    ['relativo que sobe com ..', (raiz) => `${'../'.repeat(raiz.split('/').length - 1)}${fora.slice(1)}/000-config.json`],
    ['symlink dentro do checkout que sai dele', (raiz) => {
      symlinkSync(fora, join(raiz, 'docs', 'fila', 'link'));
      return 'docs/fila/link/000-config.json';
    }],
    ['config que não existe', () => 'docs/fila/nada/000-config.json'],
    ['config com outro nome (P2)', (raiz) => {
      escrever(join(raiz, 'docs', 'fila', 'apolo', 'config.json'), configIrma());
      return 'docs/fila/apolo/config.json';
    }],
  ];
  for (const [nome, caminho] of casos) {
    it(nome, () => {
      const raiz = duasFilas();
      const c = caminho(raiz);
      const r = bashNoFixture(raiz, 'echo "FILA=$FILA_DIR"', { ORQ_CONFIG: c });
      expect(r.rc).not.toBe(0);
      expect(r.stdout).not.toContain('FILA=');
      expect(r.stderr).toContain('ORQ_CONFIG');
      expect(() => caminhoConfig(raiz, { ORQ_CONFIG: c })).toThrow(/ORQ_CONFIG/);
    });
  }
});

describe('P2: os CLIs em TS leem o config da fila escolhida', () => {
  const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');

  it('prevoo.ts: a estrutura conferida (cat.6) é a da irmã', () => {
    const raiz = duasFilas();
    for (const d of ['docs/fila', 'docs/fila/apolo']) {
      mkdirSync(join(raiz, d, 'rascunhos'), { recursive: true });
      writeFileSync(join(raiz, d, 'liberacoes.json'), '{"$schema_versao": 2, "tokens": []}');
    }
    writeFileSync(join(raiz, 'docs', 'fila', '_TEMPLATE.md'), '# template\n');
    const e = entradaDoCheckout(raiz, { ORQ_CONFIG: APOLO_CFG });
    if ('erro' in e) throw new Error(e.erro);
    expect([e.filaDir, e.runsDir]).toEqual([`${raiz}/docs/fila/apolo`, `${raiz}/docs/fila/apolo/runs`]);
    const deps = preVooDepsReais({ repoRoot: raiz, filaDir: e.filaDir, runsDir: e.runsDir, custoFile: e.custoFile });
    const item = checarEstruturaFila(deps);
    expect(item.ok).toBe(false);
    expect(item.item).toBe('pré-voo cat.6 (estrutura da fila): docs/fila/apolo/_TEMPLATE.md');
  });

  it('decisao-cli.ts: o prefixo da worktree é o da irmã', () => {
    const raiz = duasFilas();
    const r = spawnSync(TSX, [join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), raiz, 'worktree', '5031'], {
      encoding: 'utf8', env: { ...process.env, ORQ_CONFIG: APOLO_CFG },
    });
    expect(r.stdout.trim()).toContain('orq-apolo-5031');
  });

  it('gate-ticket.ts sem --fila lê a pasta da irmã', () => {
    const raiz = duasFilas();
    const r = spawnSync(TSX, [join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts'), '--relatorio', '5031'], {
      cwd: raiz, encoding: 'utf8', env: { ...process.env, ORQ_CONFIG: APOLO_CFG },
    });
    expect(r.stdout).toContain(`1 ticket(s) · fila ${raiz}/docs/fila/apolo\n`);
  });
});
