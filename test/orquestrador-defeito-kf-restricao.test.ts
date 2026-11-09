/**
 * Defeito KF-1 · restricao_execucao ausente = inativa.
 *
 * O canário 001 da fila do kit (09/11) morreu antes de chamar modelo:
 * decisao-cli.ts:63 chamava avaliaRestricaoExecucao e decisao.ts:75 lia `r.ativa`
 * de um `undefined`, porque docs/fila-kit/000-config.json não tem a chave. O
 * config-chaves.ts:81 já a declarava opcional ("inativa quando ausente"); o
 * código não cumpria. Registro: docs/defeitos/2026-11-09-restricao-execucao-ausente.md.
 *
 * Os configs são cópias de configs reais: a fila do kit
 * (test/fixtures/defeito-kf/config-fila-kit.json), o comarka da M69 (sem a
 * chave) e o dashboard da M69 (com a chave).
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const CLI = join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts');
const FX = join(REPO_ROOT, 'test', 'fixtures');

/** Uma raiz descartável com o config em docs/fila/000-config.json (o caminho padrão). */
function raizCom(config: unknown): string {
  const raiz = mkdtempSync(join(tmpdir(), 'orq-defeito-kf-'));
  mkdirSync(join(raiz, 'docs', 'fila'), { recursive: true });
  writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(config, null, 2));
  return raiz;
}

const ler = (rel: string) => JSON.parse(readFileSync(join(FX, rel), 'utf8'));

function restricao(config: unknown, slug: string) {
  const env = { ...process.env };
  delete env.ORQ_CONFIG;
  const r = spawnSync(TSX, [CLI, raizCom(config), 'restricao', slug], { encoding: 'utf8', env });
  return { rc: r.status, saida: `${r.stdout}${r.stderr}`, json: safeJson(r.stdout) };
}

function safeJson(s: string): Record<string, unknown> | null {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}

describe('decisao-cli restricao: chave ausente = inativa (defeito KF-1)', () => {
  for (const [nome, rel] of [
    ['config real da fila do kit', 'defeito-kf/config-fila-kit.json'],
    ['config-comarka.json da M69', 'm69/config-comarka.json'],
  ] as const) {
    it(`${nome}: sem restricao_execucao, sai permitido com rc 0`, () => {
      const cfg = ler(rel);
      expect(cfg.restricao_execucao).toBeUndefined();
      const r = restricao(cfg, 'canario-citacao-max-retries');
      expect(r.rc, r.saida).toBe(0);
      expect(r.json).toEqual({ permitido: true, exitCode: 0 });
    });
  }

  it('config-dashboard.json (chave presente, ativa false): permitido, como hoje', () => {
    const r = restricao(ler('m69/config-dashboard.json'), 'qualquer');
    expect(r.rc, r.saida).toBe(0);
    expect(r.json).toEqual({ permitido: true, exitCode: 0 });
  });

  it('config-dashboard.json com a restrição ligada e papel pendente: recusa com o exit do config, como hoje', () => {
    const cfg = ler('m69/config-dashboard.json');
    cfg.executor_model = 'PENDENTE_TK104';
    cfg.restricao_execucao.ativa = true;
    cfg.restricao_execucao.tickets_permitidos = ['ticket-fixture'];
    const fora = restricao(cfg, 'outro');
    expect(fora.rc, fora.saida).toBe(cfg.restricao_execucao.recusa_exit_code);
    expect(fora.json).toMatchObject({ permitido: false, mensagem: cfg.restricao_execucao.recusa_mensagem });
    const dentro = restricao(cfg, 'ticket-fixture');
    expect(dentro.rc, dentro.saida).toBe(0);
  });
});
