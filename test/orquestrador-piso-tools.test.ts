/**
 * T17 — o PISO de `--disallowedTools`.
 *
 * A allowlist do agente é DERIVADA (peça 0c): dos `cmd` dos gates e dos `cmd`
 * dos critérios do ticket. Isso é permissão saindo de DADO — e o ticket entra
 * na fila por gerador. A `COMANDO_PROIBIDO` do `perfil.ts` já impedia que um
 * `rm -rf` num critério virasse permissão; o que faltava era a outra metade:
 * uma NEGAÇÃO explícita, declarada no config do repo, que valha aconteça o que
 * acontecer com a derivação.
 *
 * O piso é `proibicoes_absolutas.tools`. Ausente = piso vazio, e a chamada sai
 * sem a flag, exatamente como hoje — é o estado do config do CI, e o primeiro
 * bloco deste arquivo prova isso contra o arquivo REAL.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  BASE_TOOLS,
  PISO_TOOLS_SEMENTE,
  filtrarPeloPiso,
  pisoDoConfig,
  pisoNega,
  prefixoDaTool,
  toolsDoTicket,
} from '../scripts/orquestrador/perfil.js';
import { propor } from '../scripts/orquestrador/migrar-config.js';
import { NOVAS } from '../scripts/orquestrador/config-tabela.js';
import { FX_CHECKOUT, REPO_ROOT } from './fixtures/orq-harness.js';

const CONFIG_CI = JSON.parse(
  readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'),
) as { gates: { cmd: string }[]; proibicoes_absolutas?: unknown };
const GATES_CI = CONFIG_CI.gates.map((g) => g.cmd);
const EXECUTOR = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh'), 'utf8');

// ─── leitura do config ──────────────────────────────────────────────────────

describe('pisoDoConfig: ausente = desligado', () => {
  it('o config do CI tem `proibicoes_absolutas` como ARRAY de prosa — piso VAZIO', () => {
    expect(Array.isArray(CONFIG_CI.proibicoes_absolutas)).toBe(true);
    expect(pisoDoConfig(CONFIG_CI)).toEqual([]);
  });

  it('config sem a chave: piso vazio, e nunca lança', () => {
    expect(pisoDoConfig({})).toEqual([]);
    expect(pisoDoConfig(null)).toEqual([]);
    expect(pisoDoConfig({ proibicoes_absolutas: { regras: ['x'] } })).toEqual([]);
    expect(pisoDoConfig({ proibicoes_absolutas: { tools: 'nao é lista' } })).toEqual([]);
  });

  it('entrada vazia ou não-string é ignorada', () => {
    expect(pisoDoConfig({ proibicoes_absolutas: { tools: ['Bash(rm:*)', '', '  ', 7] } })).toEqual(['Bash(rm:*)']);
  });

  it('o template e o fixture do kit já nascem com a SEMENTE', () => {
    for (const p of ['doutrina/templates/config.json', 'fixture/docs/fila/000-config.json']) {
      const cfg = JSON.parse(readFileSync(join(REPO_ROOT, p), 'utf8'));
      expect(pisoDoConfig(cfg), p).toEqual([...PISO_TOOLS_SEMENTE]);
      // A prosa de sempre sobreviveu, ao lado da lista nova.
      expect(cfg.proibicoes_absolutas.regras.length, p).toBeGreaterThan(3);
    }
  });
});

// ─── o casamento ────────────────────────────────────────────────────────────

describe('pisoNega: prefixo de comando com borda', () => {
  it('prefixoDaTool tira o Bash(...) e o :*', () => {
    expect(prefixoDaTool('Bash(npm install:*)')).toBe('npm install');
    expect(prefixoDaTool('Bash(npm install)')).toBe('npm install');
    expect(prefixoDaTool('WebFetch')).toBeNull();
  });

  it('nega a forma exata e a forma com :*', () => {
    expect(pisoNega('Bash(npm install)', ['Bash(npm install:*)'])).toBe('Bash(npm install:*)');
    expect(pisoNega('Bash(npm install:*)', ['Bash(npm install:*)'])).toBe('Bash(npm install:*)');
  });

  it('nega o comando com argumento', () => {
    expect(pisoNega('Bash(npm install --save-dev vitest)', ['Bash(npm install:*)'])).toBeTruthy();
  });

  it('NÃO nega comando que só começa com as mesmas letras', () => {
    // `npm installer` e `npm i` são outros comandos. Prefixo sem borda negaria
    // o primeiro; casamento por igualdade deixaria passar `npm install -D`.
    expect(pisoNega('Bash(npm installer)', ['Bash(npm install:*)'])).toBeNull();
    expect(pisoNega('Bash(npm i)', ['Bash(npm install:*)'])).toBeNull();
  });

  it('tool que não é Bash casa por nome exato', () => {
    expect(pisoNega('WebFetch', ['WebFetch'])).toBe('WebFetch');
    expect(pisoNega('WebSearch', ['WebFetch'])).toBeNull();
    expect(pisoNega('Bash(curl x)', ['WebFetch'])).toBeNull();
  });

  it('piso vazio não nega nada', () => {
    expect(filtrarPeloPiso(['Bash(rm -rf /)'], [])).toEqual(['Bash(rm -rf /)']);
  });
});

// ─── o piso VENCE o ticket ──────────────────────────────────────────────────

describe('o piso nega mesmo quando o ticket PEDE', () => {
  // Um critério que manda rodar `npm install` é o caso real: o ticket precisa
  // de uma dependência nova e o gerador escreveu o comando. Na worktree, com o
  // node_modules linkado, é ele que purga o store do checkout principal.
  const criterio = ['npm install --save-dev vitest'];

  it('SEM piso, o cmd do critério vira permissão (é o comportamento da peça 0c)', () => {
    const tools = toolsDoTicket(GATES_CI, criterio).split(',');
    expect(tools).toContain('Bash(npm install --save-dev vitest)');
  });

  it('COM o piso, a mesma derivação sai sem ela', () => {
    const tools = toolsDoTicket(GATES_CI, criterio, PISO_TOOLS_SEMENTE).split(',');
    expect(tools).not.toContain('Bash(npm install --save-dev vitest)');
    // E o resto continua lá: o piso nega o que nomeia, não mais que isso.
    expect(tools).toContain('Read');
    expect(tools).toContain('Bash(npm run typecheck:root)');
  });

  it('o piso também poda a BASE_TOOLS quando ela colide', () => {
    const tools = toolsDoTicket(GATES_CI, [], ['Bash(git log:*)']).split(',');
    expect(BASE_TOOLS).toContain('Bash(git log:*)');
    expect(tools).not.toContain('Bash(git log:*)');
    expect(tools).toContain('Bash(git add:*)');
  });

  it('nenhuma tool da SEMENTE sobrevive à derivação, venha de onde vier', () => {
    const cmds = PISO_TOOLS_SEMENTE.map((t) => prefixoDaTool(t)).filter((p): p is string => !!p);
    const tools = toolsDoTicket(GATES_CI, cmds, PISO_TOOLS_SEMENTE).split(',');
    for (const t of tools) expect(pisoNega(t, PISO_TOOLS_SEMENTE), t).toBeNull();
  });
});

// ─── o que o CI faz diferente ───────────────────────────────────────────────

describe('o que o CI faz diferente', () => {
  it('HOJE: nada — o config dele não declara `tools`, e a allowlist sai byte a byte igual', () => {
    const antes = toolsDoTicket(GATES_CI, ['npm run typecheck:root']);
    const agora = toolsDoTicket(GATES_CI, ['npm run typecheck:root'], pisoDoConfig(CONFIG_CI));
    expect(agora).toBe(antes);
  });

  it('DECLARADO: passa a negar o que já não usava — nada da allowlist de hoje cai', () => {
    const antes = toolsDoTicket(GATES_CI, ['npm run typecheck:root']).split(',');
    const agora = toolsDoTicket(GATES_CI, ['npm run typecheck:root'], PISO_TOOLS_SEMENTE).split(',');
    expect(agora).toEqual(antes);
  });

  it('a flag só é passada quando o piso NÃO é vazio', () => {
    expect(EXECUTOR).toContain('${piso:+--disallowedTools "$piso"}');
  });
});

// ─── transporte: o bash só carrega ──────────────────────────────────────────

describe('executor.sh transporta o piso, e não o decide', () => {
  it('tools_proibidas chama o TS, sem lista embutida no bash', () => {
    expect(EXECUTOR).toMatch(/tools_proibidas\(\) \{ decisao disallowed; \}/);
    expect(EXECUTOR).not.toMatch(/DISALLOWED_TOOLS=/);
  });

  it('o piso é derivado UMA vez por tentativa, junto com a allowlist', () => {
    const i = EXECUTOR.indexOf('piso="$(tools_proibidas)"');
    const j = EXECUTOR.indexOf('${piso:+--disallowedTools "$piso"}');
    expect(i).toBeGreaterThan(0);
    expect(i).toBeLessThan(j);
    expect((EXECUTOR.match(/tools_proibidas\)"/g) ?? []).length).toBe(1);
  });

  it('o piso entra no log da tentativa (quem lê a evidência vê o que foi negado)', () => {
    expect(EXECUTOR).toContain('log "  piso de negação: $piso"');
  });
});

// ─── a migração NOMEIA o caso, e não apaga nada ─────────────────────────────

describe('migrar-config: `proibicoes_absolutas` é um ARRAY nos três repos', () => {
  it('a chave nova NÃO é aplicada, e a prosa sobrevive intacta', () => {
    const antes = {
      $schema_versao: 1,
      gates: [],
      proibicoes_absolutas: ['nunca push em main', 'nunca gastar dinheiro'],
    };
    const r = propor(antes);
    const o = JSON.parse(r.proposto);
    expect(o.proibicoes_absolutas).toEqual(antes.proibicoes_absolutas);
    const linha = r.linhas.find((l) => l.includes('proibicoes_absolutas.tools'))!;
    expect(linha).toMatch(/NÃO APLICADA/);
    expect(linha).toMatch(/Nada foi apagado/);
    expect(linha).toMatch(/regras/);
  });

  it('com `proibicoes_absolutas` já OBJETO, a chave nova entra normalmente', () => {
    const r = propor({ $schema_versao: 1, gates: [], proibicoes_absolutas: { regras: ['x'] } });
    const o = JSON.parse(r.proposto);
    expect(o.proibicoes_absolutas.tools).toEqual([...PISO_TOOLS_SEMENTE]);
    expect(o.proibicoes_absolutas.regras).toEqual(['x']);
  });

  it('a SEMENTE do código e a da tabela de migração são a MESMA lista', () => {
    const nova = NOVAS.find((n) => n.chave === 'proibicoes_absolutas.tools')!;
    expect(nova.valor).toEqual([...PISO_TOOLS_SEMENTE]);
  });
});
