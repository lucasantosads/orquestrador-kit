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
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, bashNoFixture, checkoutReal, comLaunchctlStub, criarFixture, escrever } from './fixtures/orq-harness.js';
import { tmpdir } from 'node:os';
import { caminhoConfig, filaDir } from '../scripts/orquestrador/fila-caminho.js';
import { checarEstruturaFila, checarFilasIrmas, entradaDoCheckout, preVooDepsReais } from '../scripts/orquestrador/prevoo.js';

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

describe('P3: o pré-voo recusa filas irmãs que dividem runs ou pausa', () => {
  /** Raiz e irmã declaradas uma na outra; `irma` troca o config da irmã. */
  const declaradas = (irma: string) => {
    const raiz = duasFilas(CFG_CI, irma);
    for (const [cfg, outra] of [['docs/fila/000-config.json', 'docs/fila/apolo'], [APOLO_CFG, 'docs/fila']] as const) {
      const j = JSON.parse(readFileSync(join(raiz, cfg), 'utf8'));
      writeFileSync(join(raiz, cfg), JSON.stringify({ ...j, filas_irmas: [outra] }));
    }
    return raiz;
  };
  const cat9 = (raiz: string, orqConfig: string) => {
    const e = entradaDoCheckout(raiz, { ORQ_CONFIG: orqConfig });
    if ('erro' in e) throw new Error(e.erro);
    const item = checarFilasIrmas(e.config, preVooDepsReais({ repoRoot: raiz, filaDir: e.filaDir, runsDir: e.runsDir, custoFile: e.custoFile }));
    if (!item) throw new Error('cat.9 não rodou');
    return item;
  };

  it('cada fila com runs e pausa na própria pasta: ok dos dois lados', () => {
    const raiz = declaradas(configIrma());
    expect(cat9(raiz, APOLO_CFG).ok).toBe(true);
    expect(cat9(raiz, '').ok).toBe(true);
  });

  it('config da irmã copiado da raiz sem trocar pausar_file: NO-GO', () => {
    const raiz = declaradas(configIrma(CFG_CI, { pausar_file: 'docs/fila/PAUSAR' }));
    const r = cat9(raiz, APOLO_CFG);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("docs/fila/apolo: pausar_file 'docs/fila/PAUSAR' fora da pasta da fila");
    expect(cat9(raiz, '').ok).toBe(false);
  });

  it('duas filas com o mesmo runs_dir: NO-GO', () => {
    const raiz = declaradas(configIrma(CFG_CI, { runs_dir: 'docs/fila/runs' }));
    const r = cat9(raiz, '');
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain("runs_dir 'docs/fila/runs' repetido em docs/fila e docs/fila/apolo");
  });

  it('sem filas_irmas (configs reais do CI e do dashboard): a checagem não entra', () => {
    for (const cfg of [CFG_CI, CFG_DASH]) {
      const raiz = duasFilas(cfg);
      const e = entradaDoCheckout(raiz, {});
      if ('erro' in e) throw new Error(e.erro);
      expect(checarFilasIrmas(e.config, preVooDepsReais({ repoRoot: raiz, filaDir: e.filaDir, runsDir: e.runsDir, custoFile: e.custoFile }))).toBeNull();
    }
  });
});

describe('P4: dependência entre filas só leitura e id repetido (C17)', () => {
  /** Duas filas declaradas uma na outra, ou não (`declarar = false`). */
  const filas = (declarar = true) => {
    const raiz = duasFilas();
    if (declarar) {
      for (const [cfg, outra] of [['docs/fila/000-config.json', 'docs/fila/apolo'], [APOLO_CFG, 'docs/fila']] as const) {
        const j = JSON.parse(readFileSync(join(raiz, cfg), 'utf8'));
        writeFileSync(join(raiz, cfg), JSON.stringify({ ...j, filas_irmas: [outra] }));
      }
    }
    return raiz;
  };
  /** O ticket real com outro status (o bloco json é o primeiro, e o status vem antes da prosa). */
  const comStatus = (arq: string, status: string) =>
    writeFileSync(arq, readFileSync(arq, 'utf8').replace(/"status": "[a-z_]+"/, `"status": "${status}"`));
  const T1137 = 'docs/fila/1137-estado-plano-script.md';
  const T1254 = 'docs/fila/1254-api-apolo-conhecimento-agente.md';
  const T5031 = 'docs/fila/apolo/5031-apolo-escritor-tickets-v0.md';
  const razao = (raiz: string, cfg: string, t: string) =>
    bashNoFixture(raiz, `razao_nao_processavel "${raiz}/${t}"`, { ORQ_CONFIG: cfg }).stdout.trim();
  const gate = (raiz: string, cfg: string, ...ids: string[]) => spawnSync(
    join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
    [join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts'), '--relatorio', ...ids],
    { cwd: raiz, encoding: 'utf8', env: { ...process.env, ORQ_CONFIG: cfg } },
  ).stdout;

  it('loop: 1254 (raiz) depende de 5197 (apolo, done): só passa com filas_irmas', () => {
    const sem = filas(false); comStatus(join(sem, T1254), 'pendente');
    expect(razao(sem, '', T1254)).toBe('dependencia:5197:inexistente');
    const com = filas(); comStatus(join(com, T1254), 'pendente');
    expect(razao(com, '', T1254)).toBe('liberacao:humano:migration-5197-aplicada');
  });

  it('loop: 5031 (apolo) lê o status do 1137 (raiz) e não seleciona nem grava lá', () => {
    const raiz = filas(); comStatus(join(raiz, T5031), 'pendente');
    expect(razao(raiz, APOLO_CFG, T5031)).toBe('');
    comStatus(join(raiz, T1137), 'pendente');
    expect(razao(raiz, APOLO_CFG, T5031)).toBe('dependencia:1137:pendente');
    const sel = bashNoFixture(raiz, 'proximo_pendente', { ORQ_CONFIG: APOLO_CFG }).stdout.trim();
    expect(sel).toBe('');
  });

  it('gate regra 7: dependência de irmã é aceita só com filas_irmas', () => {
    const sem = filas(false); comStatus(join(sem, T5031), 'pendente');
    expect(gate(sem, APOLO_CFG, '5031')).toContain("'1137' não é id de ticket da fila");
    const com = filas(); comStatus(join(com, T5031), 'pendente');
    expect(gate(com, APOLO_CFG, '5031')).not.toContain("'1137' não é id de ticket da fila");
  });

  it('C17: id repetido entre filas e na mesma fila, erro no pendente', () => {
    const raiz = filas();
    const dup = join(raiz, 'docs/fila/apolo/1137-copia-na-irma.md');
    copyFileSync(join(raiz, T1137), dup);
    comStatus(dup, 'pendente');
    expect(gate(raiz, APOLO_CFG, '1137')).toContain(`1137-copia-na-irma.md:id id '1137' repetido em ${raiz}/${T1137}`);
    const mesma = join(raiz, 'docs/fila/1137b-copia-na-raiz.md');
    copyFileSync(join(raiz, T1137), mesma);
    comStatus(mesma, 'pendente');
    expect(gate(raiz, '', mesma)).toContain("id '1137' repetido");
    const done = gate(raiz, '', join(raiz, T1137));
    expect(done).toContain('GATE DE TICKET · 1 ticket(s)');
    expect(done).not.toContain('repetido');
  });
});

describe('P5: instalar-launchd.sh --config instala o job da fila irmã', () => {
  const FX = checkoutReal();
  const instalador = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
  const dry = (dir: string, ...args: string[]) => {
    const stub = comLaunchctlStub();
    return spawnSync('bash', [join(dir, 'scripts', 'orquestrador', 'instalar-launchd.sh'), '--dry-run', ...args], {
      cwd: dir, encoding: 'utf8', env: { ...process.env, ...stub.env },
    });
  };

  it('--config da irmã: label, ORQ_CONFIG e log da fila dela', () => {
    const cfg = JSON.parse(readFileSync(join(FX, 'docs', 'fila', '000-config.json'), 'utf8'));
    escrever(join(FX, APOLO_CFG), JSON.stringify({
      ...cfg, launchd: { label: 'com.fixture.orquestrador-apolo', start_interval: 600 }, runs_dir: 'docs/fila/apolo/runs',
    }));
    try {
      const r = dry(FX, '--config', APOLO_CFG);
      expect(r.status, r.stderr).toBe(0);
      expect(r.stdout).toContain('<string>com.fixture.orquestrador-apolo</string>');
      expect(r.stdout).toContain(`<key>ORQ_CONFIG</key><string>${APOLO_CFG}</string>`);
      expect(r.stdout).toContain(`<string>${FX}/docs/fila/apolo/runs/launchd-agent.log</string>`);
      expect(r.stdout).toContain('<integer>600</integer>');
      const fora = dry(FX, '--config', '/private/tmp/000-config.json');
      expect(fora.status).not.toBe(0);
      expect(fora.stderr).toContain('ORQ_CONFIG');
    } finally {
      rmSync(join(FX, 'docs', 'fila', 'apolo'), { recursive: true, force: true });
    }
  });

  it('sem --config: o plist é byte a byte o do instalador do fb81911', () => {
    const velho = realpathSync(mkdtempSync(join(tmpdir(), 'orq-launchd-fb81911-')));
    mkdirSync(join(velho, 'scripts', 'orquestrador'), { recursive: true });
    for (const f of ['instalar-launchd.sh', 'com.orquestrador.plist.template', 'launchd-run.sh']) {
      const r = spawnSync('git', ['-C', REPO_ROOT, 'show', `fb81911:scripts/orquestrador/${f}`], { encoding: 'utf8' });
      writeFileSync(join(velho, 'scripts', 'orquestrador', f), r.stdout, { mode: 0o755 });
    }
    escrever(join(velho, 'docs', 'fila', '000-config.json'), readFileSync(join(FX, 'docs', 'fila', '000-config.json'), 'utf8'));
    const antes = dry(velho);
    const agora = dry(FX);
    expect(antes.status, antes.stderr).toBe(0);
    expect(agora.stdout).toBe(antes.stdout.split(velho).join(FX));
  });
});
