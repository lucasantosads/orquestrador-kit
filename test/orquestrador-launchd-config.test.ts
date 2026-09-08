/**
 * Peça K6c — plist e launchd sem nome de repo.
 * Peça K6e — e nenhum teste toca o launchd desta máquina.
 *
 * K6c. O template chamava-se `com.conteudos.orquestrador.plist.template` e
 * trazia o Label `com.conteudos.orquestrador` FIXO no corpo; o
 * `instalar-launchd.sh` repetia a mesma string numa variável e montava o
 * caminho do template a partir dela. Instalar o kit em qualquer outro repo
 * carregaria um job com o label do conteudos-infinitos — para o launchd, dois
 * repos com o mesmo label são o MESMO job, e o segundo bootstrap derruba o
 * primeiro.
 *
 * O conserto tem duas metades, e a segunda é a que importa:
 *   1. o template vira `com.orquestrador.plist.template`, com `{{LABEL}}`,
 *      `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`;
 *   2. o instalador RECUSA quando `launchd.label` não está no config. Nunca
 *      inventa um label — label inventado não é erro visível: é um SEGUNDO job
 *      carregado ao lado do antigo, os dois disparando no mesmo checkout.
 *
 * K6e. O "vermelho antes" da K6c foi escrito contra o instalador ANTIGO,
 * vendorizado dentro do fixture, que não conhecia `--dry-run`: ignorou a flag e
 * INSTALOU. Das 12:24 às 14:05 de 2026-09-08 o job do CI apontou para
 * `/private/tmp/orq-fixture-6qRp23`; três ticks morreram com rc 127 e o achado
 * veio de um `launchctl print` humano, não de alarme. As duas travas que este
 * arquivo passa a exercer:
 *   a. TODO caso roda com `launchctl` STUBADO na frente do PATH e com um HOME
 *      descartável — o `~/Library/LaunchAgents` da máquina não é destino de
 *      teste;
 *   b. o instalador RECUSA checkout sob /tmp (e sob ORQ_TESTE=1) sem
 *      `--permitir-tmp`, e o `--dry-run` continua funcionando lá.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, checkoutReal, comLaunchctlStub } from './fixtures/orq-harness.js';

const FX = checkoutReal();
const INSTALADOR_FX = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
const CONFIG_FX = join(FX, 'docs', 'fila', '000-config.json');
const TEMPLATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.orquestrador.plist.template');
const LABEL_FX = JSON.parse(readFileSync(CONFIG_FX, 'utf8')).launchd.label as string;

/**
 * Roda o instalador do FIXTURE com o launchctl STUBADO e HOME descartável.
 * Nenhum caminho deste arquivo alcança o launchd de verdade — nem o de sucesso.
 */
function rodar(...args: string[]): { rc: number; saida: string; chamadas: string[]; home: string } {
  const stub = comLaunchctlStub();
  const r = spawnSync('bash', [INSTALADOR_FX, ...args], {
    encoding: 'utf8',
    cwd: FX,
    env: { ...process.env, ...stub.env },
  });
  return {
    rc: r.status ?? 1,
    saida: `${r.stdout ?? ''}${r.stderr ?? ''}`,
    chamadas: stub.chamadas(),
    home: stub.home,
  };
}

function dryRun(): { rc: number; saida: string; chamadas: string[] } {
  return rodar('--dry-run');
}

/** Reescreve o config do fixture sem uma chave, roda, e devolve tudo ao lugar. */
function semChave(caminho: string[], corpo: () => void): void {
  const antes = readFileSync(CONFIG_FX, 'utf8');
  try {
    const cfg = JSON.parse(antes);
    let no = cfg;
    for (const k of caminho.slice(0, -1)) no = no[k];
    delete no[caminho[caminho.length - 1]!];
    writeFileSync(CONFIG_FX, JSON.stringify(cfg, null, 2));
    corpo();
  } finally {
    writeFileSync(CONFIG_FX, antes);
  }
}

describe('o template não carrega nome de repo nenhum', () => {
  it('chama-se com.orquestrador.plist.template', () => {
    expect(existsSync(TEMPLATE)).toBe(true);
    const antigo = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.conteudos.orquestrador.plist.template');
    expect(existsSync(antigo), 'o template com nome de repo ainda existe').toBe(false);
  });

  it('o corpo do plist (fora dos comentários) não cita repo nenhum', () => {
    const bruto = readFileSync(TEMPLATE, 'utf8');
    // O comentário PODE citar o CI: é proveniência, e proveniência é a única
    // coisa que não se apaga. O que não pode é o plist DEPENDER do nome.
    const corpo = bruto.replace(/<!--[\s\S]*?-->/g, '');
    expect(corpo).not.toMatch(/conteudos|comarka/i);
  });

  it('todos os valores que variam por máquina/repo são placeholders', () => {
    const bruto = readFileSync(TEMPLATE, 'utf8');
    for (const ph of ['{{LABEL}}', '{{CHECKOUT}}', '{{NODE_DIR}}', '{{START_INTERVAL}}']) {
      expect(bruto, ph).toContain(ph);
    }
    // Os placeholders antigos saíram de vez: sobreviver um faria o instalador
    // gerar plist com `__REPO_DIR__` literal e o launchd recusar o job.
    expect(bruto).not.toContain('__REPO_DIR__');
    expect(bruto).not.toContain('__NODE_DIR__');
  });

  it('nenhum .plist instanciado está versionado (só o .template)', () => {
    const versionados = spawnSync('git', ['ls-files', 'scripts/orquestrador'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).stdout;
    expect(versionados).toMatch(/com\.orquestrador\.plist\.template/);
    expect(versionados.split('\n').filter((l) => /\.plist$/.test(l))).toEqual([]);
  });
});

describe('instalar-launchd.sh --dry-run: o plist renderizado com o label do CONFIG', () => {
  it('rc 0 e nenhum placeholder sobrando', () => {
    const r = dryRun();
    expect(r.rc, r.saida).toBe(0);
    expect(r.saida).not.toContain('{{');
  });

  it('o Label é o launchd.label do config, não um nome inventado', () => {
    const cfg = JSON.parse(readFileSync(CONFIG_FX, 'utf8'));
    const label = cfg.launchd.label as string;
    expect(label, 'o config do fixture precisa declarar launchd.label').toBeTruthy();
    const r = dryRun();
    expect(r.saida).toContain(`<string>${label}</string>`);
    // O label do CI não pode vazar para dentro de outro repo: é assim que dois
    // repos viram um job só. Fora dos comentários — o comentário do template
    // CITA o label do CI de propósito, como proveniência e como exemplo.
    const corpo = r.saida.replace(/<!--[\s\S]*?-->/g, '');
    expect(corpo).not.toContain('com.conteudos.orquestrador');
  });

  it('o StartInterval é o launchd.start_interval do config', () => {
    const cfg = JSON.parse(readFileSync(CONFIG_FX, 'utf8'));
    const r = dryRun();
    expect(r.saida).toContain(`<integer>${cfg.launchd.start_interval}</integer>`);
  });

  it('o checkout renderizado é o do fixture', () => {
    const r = dryRun();
    expect(r.saida).toContain(`${FX}/scripts/orquestrador/launchd-run.sh`);
  });

  it('não escreve o plist nem carrega job nenhum', () => {
    const antes = readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f));
    const r = dryRun();
    const depois = readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f));
    expect(depois).toEqual(antes);
    expect(depois).toEqual([]);
    // K6e: e não chama launchctl NENHUMA vez — nem o stub. `--dry-run` que
    // chegasse a chamar `print` já teria passado do ponto de não-retorno.
    expect(r.chamadas).toEqual([]);
  });
});

describe('sem launchd.label no config, o instalador RECUSA', () => {
  it('rc 1 e a mensagem diz qual chave falta e o que o CI usa', () => {
    semChave(['launchd', 'label'], () => {
      const r = dryRun();
      expect(r.rc).toBe(1);
      expect(r.saida).toContain('launchd.label');
      expect(r.saida).toContain('com.conteudos.orquestrador');
    });
  });

  it('sem o objeto launchd inteiro, recusa igual (não inventa nada)', () => {
    semChave(['launchd'], () => {
      const r = dryRun();
      expect(r.rc).toBe(1);
      expect(r.saida).toContain('launchd.label');
    });
  });
});

// ─── K6e · o instalador não instala a partir de um checkout de teste ──────────
describe('peça K6e · checkout sob /tmp: o instalador RECUSA instalar', () => {
  it('sem flag nenhuma: rc 1, a mensagem nomeia o checkout, e o launchctl não é chamado', () => {
    const r = rodar();
    expect(r.rc, r.saida).toBe(1);
    expect(r.saida).toMatch(/tmp/);
    expect(r.saida).toContain(FX);
    // A prova de que não instalou não é a mensagem: é o stub sem chamada e o
    // HOME descartável sem plist.
    expect(r.chamadas).toEqual([]);
    expect(existsSync(join(r.home, 'Library', 'LaunchAgents'))).toBe(false);
    expect(readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f))).toEqual([]);
  });

  it('--dry-run continua funcionando sob /tmp: rc 0 e o plist renderizado', () => {
    const r = dryRun();
    expect(r.rc, r.saida).toBe(0);
    expect(r.saida).toContain(`<string>${LABEL_FX}</string>`);
    expect(r.saida).not.toContain('{{');
  });

  it('ORQ_TESTE=1 recusa mesmo fora de /tmp (é a declaração "quem roda é teste")', () => {
    const stub = comLaunchctlStub();
    const r = spawnSync('bash', [INSTALADOR_FX], {
      encoding: 'utf8',
      cwd: FX,
      env: { ...process.env, ...stub.env, ORQ_TESTE: '1' },
    });
    expect(r.status).toBe(1);
    expect(`${r.stdout ?? ''}${r.stderr ?? ''}`).toContain('ORQ_TESTE');
    expect(stub.chamadas()).toEqual([]);
  });
});

describe('peça K6e · com --permitir-tmp, a instalação inteira passa pelo STUB', () => {
  it('chama bootout e bootstrap no stub, e o launchd real nunca é tocado', () => {
    const plist = join(FX, 'scripts', 'orquestrador', `${LABEL_FX}.plist`);
    let r: ReturnType<typeof rodar>;
    try {
      r = rodar('--permitir-tmp');
    } finally {
      // O plist gerado é artefato desta máquina: sai do fixture antes que o
      // `--verificar` do instalar.sh o veja como diferença.
      rmSync(plist, { force: true });
    }
    expect(r.rc, r.saida).toBe(0);

    // 1. O caminho de instalação foi percorrido INTEIRO, e o stub registrou:
    const chamadas = r.chamadas;
    expect(chamadas.some((c) => c.startsWith('print '))).toBe(true);
    expect(chamadas.some((c) => c.startsWith(`bootout gui/`))).toBe(true);
    expect(chamadas.some((c) => c.startsWith(`bootstrap gui/`))).toBe(true);
    // O label instalado é o do CONFIG do fixture, em toda chamada.
    for (const c of chamadas) expect(c, `chamada sem o label do fixture: ${c}`).toContain(LABEL_FX);

    // 2. O plist foi para o HOME DESCARTÁVEL, não para o desta máquina:
    expect(existsSync(join(r.home, 'Library', 'LaunchAgents', `${LABEL_FX}.plist`))).toBe(true);
    expect(existsSync(join(process.env.HOME ?? '/nao-existe', 'Library', 'LaunchAgents', `${LABEL_FX}.plist`)))
      .toBe(false);

    // 3. E o launchd DE VERDADE não conhece o label do fixture. Esta é a
    // asserção que o incidente de 2026-09-08 teria quebrado: lá, o job existia.
    const real = spawnSync('launchctl', ['print', `gui/${process.getuid?.() ?? 0}/${LABEL_FX}`], {
      encoding: 'utf8',
      env: { ...process.env, PATH: '/bin:/usr/bin:/usr/sbin:/sbin' },
    });
    expect(real.status, `o launchd REAL tem um job '${LABEL_FX}' carregado:\n${real.stdout}`).not.toBe(0);
  });
});
