/**
 * Peça K7c — o e2e guarda a própria evidência.
 *
 * `scripts/kit/fixture-e2e.sh` roda a drenagem dentro de um fixture que mora num
 * tmp. `--limpar`, um reboot ou a faxina do sistema levam junto os `attempt-*` ,
 * o `events.log` e o `custo.json` — o único registro do que o loop fez. Foi o
 * que aconteceu com o run de 2026-09-08 11:54: sobrou o `custo.json`, e a trilha
 * só existe hoje porque alguém a colou na mensagem do commit `8525c49`.
 *
 * Este arquivo NÃO roda o e2e (ele chama a API e custa dinheiro). Ele carrega o
 * script com `ORQ_E2E_SOURCED=1`, monta à mão a árvore que uma drenagem deixa, e
 * cobra da função de preservação o que ela promete. É a única forma de provar
 * uma preservação de evidência sem gastar: um bloco de cópia não testado que
 * falha em silêncio é exatamente o defeito que esta peça existe para impedir.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { escrever, REPO_ROOT } from './fixtures/orq-harness.js';

const E2E = join(REPO_ROOT, 'scripts', 'kit', 'fixture-e2e.sh');

/** A árvore que UMA drenagem deixa em docs/fila/runs, reduzida ao essencial. */
function fixtureComRun(): string {
  const fx = mkdtempSync(join(tmpdir(), 'orq-e2e-fx-'));
  const runs = join(fx, 'docs', 'fila', 'runs');
  escrever(join(runs, 'events.log'), '2026-09-08T11:54:02-0300 --- DRENAGEM_INICIO alvo=staging-auto\n');
  escrever(join(runs, 'custo.json'), '{"dias":{"2026-09-08":{"usd":0.369}}}\n');
  escrever(join(runs, 'local-loop.log'), 'log do loop\n');
  escrever(join(runs, '001', 'attempt-1', 'gates.txt'), 'ok   typecheck  345ms\nVEREDITO: APROVADO\n');
  escrever(join(runs, '001', 'attempt-1', 'meta.json'), '{"attempt":1}');
  escrever(join(runs, '001', 'attempt-1', 'agente.log'), 'stdout cru do agente\n');
  return fx;
}

/** Roda `preservar_evidencia` com o destino apontado para um tmp. */
function preservar(fx: string, destBase: string, carimbo = '2026-09-08-1154') {
  const r = spawnSync(
    'bash',
    ['-c', `source "${E2E}"\npreservar_evidencia "${fx}" "${carimbo}"`],
    { encoding: 'utf8', env: { ...process.env, ORQ_E2E_SOURCED: '1', ORQ_E2E_DOCS: destBase } },
  );
  const linhas = (r.stdout ?? '').trim().split('\n');
  return { rc: r.status ?? 1, dest: linhas[linhas.length - 1] ?? '', saida: `${r.stdout}${r.stderr}` };
}

describe('preservar_evidencia tira do tmp o que o run produziu', () => {
  it('nomeia a pasta por carimbo e id do run, e imprime o caminho', () => {
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const r = preservar(fixtureComRun(), destBase);
    expect(r.rc).toBe(0);
    expect(r.dest).toBe(join(destBase, '2026-09-08-1154-001'));
    expect(existsSync(r.dest)).toBe(true);
  });

  it('copia o attempt INTEIRO, não só o gates.txt', () => {
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const { dest } = preservar(fixtureComRun(), destBase);
    const attempt = join(dest, '001', 'attempt-1');
    expect(readdirSync(attempt).sort()).toEqual(['agente.log.txt', 'gates.txt', 'meta.json']);
    expect(readFileSync(join(attempt, 'gates.txt'), 'utf8')).toContain('VEREDITO: APROVADO');
  });

  it('leva a trilha e o ledger', () => {
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const { dest } = preservar(fixtureComRun(), destBase);
    expect(readFileSync(join(dest, 'events.log.txt'), 'utf8')).toContain('DRENAGEM_INICIO');
    expect(readFileSync(join(dest, 'custo.json'), 'utf8')).toContain('0.369');
  });

  it('todo *.log vira *.log.txt — inclusive o de DENTRO do attempt', () => {
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const { dest } = preservar(fixtureComRun(), destBase);
    const r = spawnSync('find', [dest, '-type', 'f', '-name', '*.log'], { encoding: 'utf8' });
    expect(r.stdout.trim(), 'sobrou .log — o .gitignore do kit o barra').toBe('');
    expect(existsSync(join(dest, '001', 'attempt-1', 'agente.log.txt'))).toBe(true);
  });

  it('o que sai fica DE FATO versionável: o git não ignora nada ali', () => {
    // O motivo do renome inteiro está aqui. `.gitignore:3` é `*.log`.
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const { dest } = preservar(fixtureComRun(), destBase);
    const arquivos = spawnSync('find', [dest, '-type', 'f'], { encoding: 'utf8' })
      .stdout.trim()
      .split('\n')
      .map((f) => f.replace(`${dest}/`, ''));
    // Simula a regra do kit contra cada nome, sem depender de onde o tmp está.
    expect(arquivos.filter((f) => f.endsWith('.log'))).toEqual([]);
    expect(arquivos.length).toBeGreaterThanOrEqual(5);
  });

  it('sem run nenhum, ainda salva trilha e ledger (e diz "sem-run")', () => {
    const fx = mkdtempSync(join(tmpdir(), 'orq-e2e-fx-'));
    escrever(join(fx, 'docs', 'fila', 'runs', 'events.log'), 'trilha sem run\n');
    escrever(join(fx, 'docs', 'fila', 'runs', 'custo.json'), '{"dias":{}}\n');
    const destBase = mkdtempSync(join(tmpdir(), 'orq-e2e-docs-'));
    const { dest } = preservar(fx, destBase);
    expect(dest).toBe(join(destBase, '2026-09-08-1154-sem-run'));
    expect(readFileSync(join(dest, 'events.log.txt'), 'utf8')).toContain('trilha sem run');
  });

  it('carregar o script com ORQ_E2E_SOURCED=1 não dispara nada pago', () => {
    const r = spawnSync('bash', ['-c', `source "${E2E}"; echo CARREGADO`], {
      encoding: 'utf8',
      env: { ...process.env, ORQ_E2E_SOURCED: '1' },
    });
    expect(r.stdout).toContain('CARREGADO');
    // A recusa por falta de ORQ_E2E_OK, o banner de custo e a drenagem ficam
    // depois do `return` do modo sourced: nenhum deles pode aparecer.
    expect(r.stdout).not.toContain('ESTA CHAMADA É PAGA');
    expect(`${r.stdout}${r.stderr}`).not.toContain('recusado');
  });
});
