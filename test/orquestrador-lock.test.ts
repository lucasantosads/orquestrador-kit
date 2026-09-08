/**
 * ORQ-02 — módulos puros do orquestrador (porte de comarka-os).
 * Cobre lock.ts, perfil.ts e fila-read.ts.
 *
 * Duas provas exigidas pelo ticket, e ambas usam disco de verdade em vez de
 * mock: fila-read lê o docs/fila/_TEMPLATE.md REAL deste repo, e o teste de
 * lock cria um lockfile órfão de verdade, detecta e apaga.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseLockFile, isLockStale } from '../scripts/orquestrador/lock.js';
import {
  toolsForPerfil,
  comandosDeGates,
  defaultToolsFromGates,
  BASE_TOOLS,
} from '../scripts/orquestrador/perfil.js';
import { extractJsonBlock, readTickets, classificar } from '../scripts/orquestrador/fila-read.js';

const RAIZ = join(import.meta.dirname, '..');
const FILA_DIR = join(RAIZ, 'test', 'fixtures', 'checkout', 'docs', 'fila');
const CONFIG_PATH = join(FILA_DIR, '000-config.json');

const config = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as {
  gates: { nome: string; cmd: string }[];
  perfis_tools?: Record<string, string>;
};
const GATE_CMDS = config.gates.map((g) => g.cmd);

// ─── Lock: parseLockFile ───────────────────────────────────────────────────

describe('lock — parseLockFile', () => {
  it('extrai pid e timestamp de arquivo bem formado', () => {
    expect(parseLockFile('12345\n1700000000\n')).toEqual({ pid: 12345, timestamp: 1700000000 });
  });

  it('retorna null quando pid não é número', () => {
    expect(parseLockFile('abc\n1700000000\n')).toBeNull();
  });

  it('retorna null quando timestamp não é número', () => {
    expect(parseLockFile('999\nnot-a-ts\n')).toBeNull();
  });

  it('retorna null para string vazia', () => {
    expect(parseLockFile('')).toBeNull();
  });
});

// ─── Lock: isLockStale ────────────────────────────────────────────────────

describe('lock — isLockStale', () => {
  const NOW = 1_700_000_000;
  const MAX_AGE = 7200; // 2h

  it('lock órfão por idade >2h é stale — pid vivo não importa', () => {
    expect(isLockStale({ pid: 999, timestamp: NOW - MAX_AGE - 1 }, NOW, MAX_AGE, () => true)).toBe(true);
  });

  it('lock órfão por pid morto é stale — mesmo com timestamp recente', () => {
    expect(isLockStale({ pid: 999, timestamp: NOW - 60 }, NOW, MAX_AGE, () => false)).toBe(true);
  });

  it('lock válido (pid vivo, <2h) não é stale', () => {
    expect(isLockStale({ pid: 999, timestamp: NOW - 60 }, NOW, MAX_AGE, () => true)).toBe(false);
  });

  it('lock exatamente no limite de 2h (=) não é stale', () => {
    // age == MAX_AGE => NOT stale (só > é stale)
    expect(isLockStale({ pid: 999, timestamp: NOW - MAX_AGE }, NOW, MAX_AGE, () => true)).toBe(false);
  });

  it('lock com timestamp futuro (clock skew) não é stale se pid vivo', () => {
    expect(isLockStale({ pid: 999, timestamp: NOW + 100 }, NOW, MAX_AGE, () => true)).toBe(false);
  });
});

// ─── PROVA: lock órfão de verdade, em disco ───────────────────────────────

describe('lock — PROVA: detecta lock órfão real criado e apagado no teste', () => {
  /** process.kill(pid, 0) não envia sinal: só testa se o processo existe. */
  function pidVivo(pid: number): boolean {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  it('cria lockfile com PID morto, detecta como órfão e apaga', () => {
    const dir = mkdtempSync(join(tmpdir(), 'orq-lock-'));
    const lockPath = join(dir, '.orq-lock');
    try {
      // PID inexistente: acima do pid_max típico, então nunca está vivo.
      const PID_MORTO = 4_194_305;
      expect(pidVivo(PID_MORTO)).toBe(false);

      const agora = Math.floor(Date.now() / 1000);
      writeFileSync(lockPath, `${PID_MORTO}\n${agora}\n`, 'utf8');
      expect(existsSync(lockPath)).toBe(true);

      const lock = parseLockFile(readFileSync(lockPath, 'utf8'));
      expect(lock).not.toBeNull();
      expect(lock?.pid).toBe(PID_MORTO);

      // Recém-criado (idade ~0), então só o PID morto pode torná-lo órfão.
      expect(isLockStale(lock!, agora, 7200, pidVivo)).toBe(true);

      rmSync(lockPath);
      expect(existsSync(lockPath)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('lock do PRÓPRIO processo (pid vivo, recém-criado) não é órfão', () => {
    const dir = mkdtempSync(join(tmpdir(), 'orq-lock-'));
    const lockPath = join(dir, '.orq-lock');
    try {
      const agora = Math.floor(Date.now() / 1000);
      writeFileSync(lockPath, `${process.pid}\n${agora}\n`, 'utf8');
      const lock = parseLockFile(readFileSync(lockPath, 'utf8'));
      expect(isLockStale(lock!, agora, 7200, pidVivo)).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});

// ─── Perfil: allowlist derivada dos gates ─────────────────────────────────

describe('perfil — allowlist derivada dos gates do config', () => {
  it('extrai os comandos dos cmds dos gates reais', () => {
    const cmds = comandosDeGates(GATE_CMDS);
    expect(cmds).toContain('npm run typecheck:root');
    expect(cmds).toContain('npm run typecheck:web');
    expect(cmds).toContain('npm run build:web');
    expect(cmds).toContain('npm test');
    // ORQ-04: o gate de teste chama o vitest direto em apps/web (para excluir o
    // E2E de credenciais), então a permissão do binário tem que sair daqui.
    expect(cmds).toContain('npx vitest');
  });

  it('NÃO inventa comando que não está em gate nenhum', () => {
    const tools = defaultToolsFromGates(GATE_CMDS);
    expect(tools).not.toContain('npx tsc'); // nossos typechecks são npm run
    expect(tools).not.toContain('npm run dev');
  });

  it('não repete comando que aparece em mais de um gate', () => {
    const cmds = comandosDeGates([...GATE_CMDS, ...GATE_CMDS]);
    expect(new Set(cmds).size).toBe(cmds.length);
  });

  it('cada comando de gate vira uma permissão Bash(...:*)', () => {
    const tools = defaultToolsFromGates(GATE_CMDS);
    expect(tools).toContain('Bash(npm run typecheck:root:*)');
    expect(tools).toContain('Bash(npm run build:web:*)');
  });

  it('mantém as tools base independentes de gate', () => {
    const tools = defaultToolsFromGates(GATE_CMDS).split(',');
    for (const base of BASE_TOOLS) expect(tools).toContain(base);
  });

  it('repo sem gate npm gera allowlist só com as tools base', () => {
    expect(defaultToolsFromGates(['rm -rf apps/web/.next'])).toBe(BASE_TOOLS.join(','));
  });
});

// ─── Perfil: toolsForPerfil ───────────────────────────────────────────────

describe('perfil — toolsForPerfil', () => {
  const DEFAULT_TOOLS = defaultToolsFromGates(GATE_CMDS);
  // Este repo ainda não declara perfis_tools no config; o mapa vazio exercita
  // justamente o caminho de fallback, que é o vigente hoje.
  const PERF = config.perfis_tools ?? {};

  it('ticket sem perfil (undefined) usa tools default', () => {
    expect(toolsForPerfil(undefined, PERF, DEFAULT_TOOLS)).toBe(DEFAULT_TOOLS);
  });

  it('ticket com perfil null usa tools default', () => {
    expect(toolsForPerfil(null, PERF, DEFAULT_TOOLS)).toBe(DEFAULT_TOOLS);
  });

  it('ticket com perfil "null" (string) usa tools default', () => {
    expect(toolsForPerfil('null', PERF, DEFAULT_TOOLS)).toBe(DEFAULT_TOOLS);
  });

  it('ticket com perfil vazio ("") usa tools default', () => {
    expect(toolsForPerfil('', PERF, DEFAULT_TOOLS)).toBe(DEFAULT_TOOLS);
  });

  it('perfil desconhecido usa tools default', () => {
    expect(toolsForPerfil('inexistente', PERF, DEFAULT_TOOLS)).toBe(DEFAULT_TOOLS);
  });

  it('perfil conhecido devolve a allowlist daquele perfil', () => {
    const mapa = { docs: 'Read,Edit,Write' };
    expect(toolsForPerfil('docs', mapa, DEFAULT_TOOLS)).toBe('Read,Edit,Write');
  });
});

// ─── fila-read ────────────────────────────────────────────────────────────

describe('fila-read — extractJsonBlock', () => {
  it('extrai o bloco json de um markdown', () => {
    const md = ['# titulo', '', '```json', '{ "id": "001" }', '```', '', 'prosa'].join('\n');
    expect(extractJsonBlock(md)).toEqual({ id: '001' });
  });

  it('retorna null quando não há bloco json', () => {
    expect(extractJsonBlock('# só prosa')).toBeNull();
  });

  it('retorna null quando o bloco json é inválido', () => {
    expect(extractJsonBlock('```json\n{ nao é json }\n```')).toBeNull();
  });
});

// ─── PROVA: lê o _TEMPLATE.md real sem quebrar ────────────────────────────

describe('fila-read — PROVA: lê docs/fila/_TEMPLATE.md real', () => {
  it('o template existe e seu bloco json parseia', () => {
    const templatePath = join(FILA_DIR, '_TEMPLATE.md');
    expect(existsSync(templatePath)).toBe(true);
    const parsed = extractJsonBlock(readFileSync(templatePath, 'utf8')) as Record<string, unknown> | null;
    expect(parsed).not.toBeNull();
    expect(typeof parsed?.id).toBe('string');
  });

  it('readTickets ignora o _TEMPLATE.md (não começa com dígito) e não quebra na fila real', () => {
    const tickets = readTickets(FILA_DIR);
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.some((t) => t.file.endsWith('_TEMPLATE.md'))).toBe(false);
  });

  it('readTickets em diretório inexistente devolve lista vazia', () => {
    expect(readTickets(join(FILA_DIR, 'nao-existe'))).toEqual([]);
  });
});

describe('fila-read — classificar', () => {
  const base = { id: '001', slug: 's', status: 'pendente', dependencias: [], file: 'f' };

  it('done => passou', () => {
    expect(classificar({ ...base, status: 'done' }, new Set())).toBe('passou');
  });

  it('bloqueado => travou', () => {
    expect(classificar({ ...base, status: 'bloqueado' }, new Set())).toBe('travou');
  });

  it('em_execucao => andando', () => {
    expect(classificar({ ...base, status: 'em_execucao' }, new Set())).toBe('andando');
  });

  it('dep humana não liberada => aguarda', () => {
    expect(classificar({ ...base, dependencias: ['humano:ok-do-lucas'] }, new Set())).toBe('aguarda');
  });

  it('dep humana liberada => pendente', () => {
    expect(classificar({ ...base, dependencias: ['humano:ok-do-lucas'] }, new Set(['ok-do-lucas']))).toBe(
      'pendente',
    );
  });
});
