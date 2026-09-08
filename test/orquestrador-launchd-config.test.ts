/**
 * Peça K6c — plist e launchd sem nome de repo.
 *
 * O template chamava-se `com.conteudos.orquestrador.plist.template` e trazia o
 * Label `com.conteudos.orquestrador` FIXO no corpo; o `instalar-launchd.sh`
 * repetia a mesma string numa variável e montava o caminho do template a partir
 * dela. Instalar o kit em qualquer outro repo carregaria um job com o label do
 * conteudos-infinitos — para o launchd, dois repos com o mesmo label são o
 * MESMO job, e o segundo bootstrap derruba o primeiro.
 *
 * O conserto tem duas metades, e a segunda é a que importa:
 *   1. o template vira `com.orquestrador.plist.template`, com `{{LABEL}}`,
 *      `{{CHECKOUT}}`, `{{NODE_DIR}}` e `{{START_INTERVAL}}`;
 *   2. o instalador RECUSA quando `launchd.label` não está no config. Nunca
 *      inventa um label — label inventado não é erro visível: é um SEGUNDO job
 *      carregado ao lado do antigo, os dois disparando no mesmo checkout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, checkoutReal } from './fixtures/orq-harness.js';

const FX = checkoutReal();
const INSTALADOR_FX = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
const CONFIG_FX = join(FX, 'docs', 'fila', '000-config.json');
const TEMPLATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.orquestrador.plist.template');

/** Roda o instalador do FIXTURE. Só `--dry-run`: nada aqui toca o launchd real. */
function dryRun(): { rc: number; saida: string } {
  const r = spawnSync('bash', [INSTALADOR_FX, '--dry-run'], { encoding: 'utf8', cwd: FX });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}` };
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
    dryRun();
    const depois = readdirSync(join(FX, 'scripts', 'orquestrador')).filter((f) => /\.plist$/.test(f));
    expect(depois).toEqual(antes);
    expect(depois).toEqual([]);
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
