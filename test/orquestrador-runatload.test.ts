/**
 * Peça 7b-7 · RunAtLoad true no template do plist.
 *
 * O Actus consertou isto direto no motor dele em 5791209 (2026-09-12, "agente
 * ficava mudo após cada bootstrap"): com RunAtLoad false, o `bootstrap` que o
 * instalar-launchd.sh faz a cada instalação ou atualização carrega o job e não
 * dispara nada; o primeiro tick só vem depois de um StartInterval inteiro
 * (3600 s no CI), e quem acabou de instalar lê o silêncio como falha. O kit
 * ainda entregava <false/>.
 *
 * Tudo com o `launchctl` STUBADO (test/fixtures/bin/launchctl) e HOME
 * descartável: nenhum caminho deste arquivo alcança o launchd de verdade.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, checkoutReal, comLaunchctlStub } from './fixtures/orq-harness.js';

const FX = checkoutReal();
const INSTALADOR_FX = join(FX, 'scripts', 'orquestrador', 'instalar-launchd.sh');
const TEMPLATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'com.orquestrador.plist.template');
const LABEL_FX = JSON.parse(readFileSync(join(FX, 'docs', 'fila', '000-config.json'), 'utf8')).launchd.label as string;
const RUN_AT_LOAD_TRUE = /<key>RunAtLoad<\/key>\s*\n\s*<true\/>/;

describe('RunAtLoad true (peça 7b-7)', () => {
  it('o template traz RunAtLoad <true/>, e não <false/>', () => {
    const t = readFileSync(TEMPLATE, 'utf8');
    expect(t).toMatch(RUN_AT_LOAD_TRUE);
    expect(t).not.toMatch(/<key>RunAtLoad<\/key>\s*\n\s*<false\/>/);
  });

  it('o plist INSTALADO (bootstrap no stub, HOME descartável) sai com RunAtLoad true', () => {
    const stub = comLaunchctlStub();
    const gerado = join(FX, 'scripts', 'orquestrador', `${LABEL_FX}.plist`);
    let r: ReturnType<typeof spawnSync>;
    try {
      r = spawnSync('bash', [INSTALADOR_FX, '--permitir-tmp'], { encoding: 'utf8', cwd: FX, env: { ...process.env, ...stub.env } });
    } finally {
      rmSync(gerado, { force: true });
    }
    expect(r.status, `${r.stdout}${r.stderr}`).toBe(0);
    const instalado = readFileSync(join(stub.home, 'Library', 'LaunchAgents', `${LABEL_FX}.plist`), 'utf8');
    expect(instalado).toMatch(RUN_AT_LOAD_TRUE);
    // O caminho foi o de sempre (print, bootout, bootstrap), e nunca kickstart -k:
    // com RunAtLoad true é o bootstrap que dispara o primeiro tick.
    const chamadas = stub.chamadas();
    expect(chamadas.some((c) => c.startsWith('bootstrap gui/'))).toBe(true);
    expect(chamadas.some((c) => /kickstart/.test(c))).toBe(false);
  });
});
