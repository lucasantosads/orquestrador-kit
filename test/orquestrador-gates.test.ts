/**
 * ORQ-04 — motor de gates. Exercita o motor inteiro sem rodar comando nenhum:
 * `exec` é injetado, então cada caso descreve o que os gates "responderam".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  ordenarGates,
  parsePlacar,
  contarServices,
  avaliaPlacar,
  avaliaGate,
  rodarGates,
  ehInterrupcao,
} from '../scripts/orquestrador/gates.js';
import type { GatesConfig, Execucao, Placar } from '../scripts/orquestrador/gates.js';

const CONFIG_PATH = join(import.meta.dirname, '..', 'docs', 'fila', '000-config.json');
const cfg = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as GatesConfig;

const ok = (saida = ''): Execucao => ({ exitCode: 0, saida, ms: 1 });
const BASE: Placar = { pacotes: 9, passando: 711, pulados: 5, todo: 1, falhando: 0 };

function saidaVitest(blocos: string[], services = 7): string {
  const marcas = Array.from({ length: services }, (_, i) => `== services/pkg${i}/ ==`);
  return [...marcas, ...blocos].join('\n');
}
const bloco = (p: number, f = 0, s = 0) =>
  `      Tests  ${p} passed${f ? ` | ${f} failed` : ''}${s ? ` | ${s} skipped` : ''} (${p + f + s})`;

/** Saída de uma suíte VERDE completa: 9 pacotes somando o baseline. */
function saidaVerde(passando = BASE.passando, pulados = BASE.pulados): string {
  const blocos = [bloco(passando - 8, 0, pulados), ...Array.from({ length: 8 }, () => bloco(1))];
  return saidaVitest(blocos);
}

// ─── Ordem obrigatória ────────────────────────────────────────────────────

describe('ordem dos gates', () => {
  it('itera na ordem de _execucao_dos_gates.ordem_obrigatoria, não na do array', () => {
    const ordenados = ordenarGates(cfg.gates, cfg._execucao_dos_gates.ordem_obrigatoria);
    expect(ordenados.map((g) => g.nome)).toEqual(cfg._execucao_dos_gates.ordem_obrigatoria);
    expect(ordenados[0]?.nome).toBe('limpeza_artefatos');
  });

  it('config divergente é erro, não reordenação silenciosa', () => {
    expect(() => ordenarGates(cfg.gates, ['limpeza_artefatos'])).toThrow(/sobrando/);
    expect(() => ordenarGates(cfg.gates, [...cfg._execucao_dos_gates.ordem_obrigatoria, 'inexistente'])).toThrow(
      /faltando/,
    );
  });
});

// ─── Placar ───────────────────────────────────────────────────────────────

describe('parsePlacar', () => {
  it('soma os blocos de todos os pacotes', () => {
    const p = parsePlacar([bloco(82, 0, 1), bloco(69, 0, 1), bloco(275)].join('\n'));
    expect(p).toEqual({ pacotes: 3, passando: 426, pulados: 2, todo: 0, falhando: 0 });
  });

  it('conta falhando quando há bloco vermelho', () => {
    expect(parsePlacar(bloco(69, 1)).falhando).toBe(1);
  });

  it('conta os services alcançados pelo loop', () => {
    expect(contarServices(saidaVitest([bloco(1)]))).toBe(7);
    expect(contarServices(saidaVitest([bloco(1)], 5))).toBe(5);
  });
});

// ─── Placar imune à cor: vitest 2 sem ANSI × vitest 4 com ANSI ────────────
//
// O monorepo roda DUAS majors de vitest. A 2.1.9 (raiz + os 7 services)
// desliga cor quando a saída não é TTY; a 4.1.9 (apps/web) MANTÉM os escapes
// mesmo redirecionada, e a linha termina em `\x1b[39m` depois do `(N)`.
// As duas strings abaixo são bytes capturados da saída real do gate — não
// normalize nem remova os `\x1b`: a linha colorida É o caso de teste.

/** raiz, vitest 2.1.9 — saída redirecionada, sem escapes. */
const LINHA_VITEST2 = '      Tests  217 passed | 1 skipped | 1 todo (219)\n';

/** apps/web, vitest 4.1.9 com --testNamePattern — escapes preservados. */
const LINHA_VITEST4_ANSI =
  '\x1b[2m      Tests \x1b[22m \x1b[1m\x1b[32m90 passed\x1b[39m\x1b[22m\x1b[2m | \x1b[22m\x1b[33m1 skipped\x1b[39m\x1b[90m (91)\x1b[39m\n';

describe('parsePlacar é imune a ANSI (vitest 2 × vitest 4)', () => {
  it('linha limpa do vitest 2 conta 1 pacote com os totais certos', () => {
    expect(parsePlacar(LINHA_VITEST2)).toEqual({
      pacotes: 1,
      passando: 217,
      pulados: 1,
      todo: 1,
      falhando: 0,
    });
  });

  it('linha COLORIDA do vitest 4 conta 1 pacote com os totais certos', () => {
    expect(parsePlacar(LINHA_VITEST4_ANSI)).toEqual({
      pacotes: 1,
      passando: 90,
      pulados: 1,
      todo: 0,
      falhando: 0,
    });
  });

  it('as duas juntas contam 2 pacotes e somam — nenhum pacote se perde por cor', () => {
    expect(parsePlacar(LINHA_VITEST2 + LINHA_VITEST4_ANSI)).toEqual({
      pacotes: 2,
      passando: 307,
      pulados: 2,
      todo: 1,
      falhando: 0,
    });
  });
});

// ─── Regra do baseline volátil ────────────────────────────────────────────

describe('baseline volátil — passando >= baseline E falhando == 0', () => {
  it('ACEITA placar MAIOR que o baseline (ticket que adiciona teste não é falso-vermelho)', () => {
    expect(avaliaPlacar({ ...BASE, passando: 745 }, BASE, 7, 7).ok).toBe(true);
  });

  it('aceita placar exatamente igual ao baseline', () => {
    expect(avaliaPlacar(BASE, BASE, 7, 7).ok).toBe(true);
  });

  it('REJEITA placar menor que o baseline', () => {
    const r = avaliaPlacar({ ...BASE, passando: 710 }, BASE, 7, 7);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/710 < baseline 711/);
  });

  it('REJEITA falhando > 0 mesmo com passando acima do baseline', () => {
    const r = avaliaPlacar({ ...BASE, passando: 800, falhando: 1 }, BASE, 7, 7);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/1 teste\(s\) falhando/);
  });

  it('REJEITA quando o loop alcança menos services que o exigido', () => {
    const r = avaliaPlacar(BASE, BASE, 3, 7);
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/3 services, esperado 7/);
  });

  it('REJEITA quando faltam pacotes, mesmo com o total de passando alto', () => {
    expect(avaliaPlacar({ ...BASE, pacotes: 5, passando: 999 }, BASE, 7, 7).ok).toBe(false);
  });
});

// ─── Interrupção ──────────────────────────────────────────────────────────

describe('interrupção — NAO_VALE_PARCIALMENTE', () => {
  it('reconhece os códigos de morte por fora', () => {
    for (const c of [124, 129, 130, 137, 143]) expect(ehInterrupcao(c)).toBe(true);
    expect(ehInterrupcao(1)).toBe(false);
    expect(ehInterrupcao(0)).toBe(false);
  });

  it('gate interrompido não conta como aprovado', () => {
    const spec = { nome: 'x', cmd: 'y', tipo: 'exit_code' };
    const r = avaliaGate(spec, { exitCode: 130, saida: '', ms: 1 });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/interrompido/);
  });

  it('NÃO aproveita resultado parcial: gates verdes antes da interrupção não valem', () => {
    let n = 0;
    const v = rodarGates(cfg, () => {
      n++;
      // os dois primeiros passam; o terceiro é morto por fora.
      return n < 3 ? ok(saidaVerde()) : { exitCode: 130, saida: '', ms: 1 };
    });
    expect(v.ok).toBe(false);
    expect(v.interrompido).toBe(true);
    expect(v.reexecutar).toBe(true);
    // houve gate verde antes — e mesmo assim o veredito é reprovado.
    expect(v.gates.filter((g) => g.ok).length).toBeGreaterThan(0);
    expect(v.gates.at(-1)?.ok).toBe(false);
  });

  it('reprovação de MÉRITO não pede reexecução (só interrupção pede)', () => {
    let n = 0;
    const v = rodarGates(cfg, () => {
      n++;
      return n < 3 ? ok() : { exitCode: 1, saida: 'error TS2322: x', ms: 1 };
    });
    expect(v.ok).toBe(false);
    expect(v.interrompido).toBe(false);
    expect(v.reexecutar).toBe(false);
  });
});

// ─── Motor ponta a ponta ──────────────────────────────────────────────────

describe('rodarGates', () => {
  it('sequência inteira verde => aprovado, com um resultado por gate', () => {
    const v = rodarGates(cfg, () => ok(saidaVerde()));
    expect(v.ok).toBe(true);
    expect(v.gates).toHaveLength(cfg._execucao_dos_gates.ordem_obrigatoria.length);
    expect(v.gates.every((g) => typeof g.ms === 'number')).toBe(true);
  });

  it('para no primeiro gate que reprova e não roda os seguintes', () => {
    let chamadas = 0;
    const v = rodarGates(cfg, () => {
      chamadas++;
      return chamadas === 2 ? { exitCode: 1, saida: 'error TS1: x', ms: 1 } : ok();
    });
    expect(v.ok).toBe(false);
    expect(chamadas).toBe(2);
    expect(v.motivo).toMatch(/typecheck_root/);
  });

  it('gate de teste com placar abaixo do baseline reprova o conjunto', () => {
    const v = rodarGates(cfg, (cmd) =>
      cmd.includes('services/*/') ? ok(saidaVitest([bloco(10)])) : ok(),
    );
    expect(v.ok).toBe(false);
    expect(v.motivo).toMatch(/testes_por_pacote/);
  });

  it('o gate de teste devolve placar estruturado', () => {
    const v = rodarGates(cfg, (cmd) =>
      cmd.includes('services/*/') ? ok(saidaVerde()) : ok(),
    );
    const teste = v.gates.find((g) => g.nome === 'testes_por_pacote');
    expect(teste?.placar?.passando).toBe(711);
  });
});

// ─── Critérios do executor · strip de ANSI e BASE_REF ─────────────────────
// Estes exercitam BASH de verdade (run_criterios do executor.sh), não um espelho
// em TS: a comparação de critério mora lá, e era lá que estavam os dois bugs de
// harness que reprovaram ticket bom.
//
//   1. ANSI — o vitest 4.x (apps/web) mantém escape de cor mesmo com a saída
//      redirecionada, então a linha do placar vira "Tests <esc>[22m ... 90 passed"
//      e o critério 'Tests +[0-9]+ passed' NUNCA casa. Reprovou 001a, 003 e 016;
//      os tickets que rodam a suíte da raiz (vitest 2.x, sem cor) passavam.
//   2. BASE_REF — a worktree do ticket nasce de branch_alvo, não da protegida.
//      Critério de escopo com "main...HEAD" enxerga todo ticket já mergeado na
//      alvo e fica inalcançável. O cmd recebe a base REAL pelo ambiente.

const REPO_ROOT = join(import.meta.dirname, '..');
const cfgRaw = JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as { branch_alvo: string };
const ESC = String.fromCharCode(27);

/** Monta um ticket de fixture com UM critério e roda run_criterios de verdade. */
function rodarCriterio(cmd: string, espera: string): { falhos: string; saida: string } {
  const script = [
    'set -euo pipefail',
    'tmp="$(mktemp -d)"',
    `trap 'rm -rf "$tmp"' EXIT`,
    'mkdir -p "$tmp/wt" "$tmp/run"',
    `cat > "$tmp/ticket.md" <<'FIXTURE'`,
    '```json',
    JSON.stringify(
      {
        id: 'fixture',
        slug: 'fixture-criterio',
        criterios_aceite: [{ descricao: 'criterio unico', cmd, espera }],
      },
      null,
      2,
    ),
    '```',
    'FIXTURE',
    'export EXECUTOR_SOURCED=1',
    `source "${REPO_ROOT}/scripts/orquestrador/executor.sh"`,
    'run_criterios "$tmp/ticket.md" "$tmp/wt" "$tmp/run" 2>/dev/null',
    `printf 'FALHOS=%s\\n' "$CRITERIOS_FALHOS"`,
    `printf 'SAIDA=%s\\n' "$(sed -n 's/^saida: //p' "$tmp/run/criterios.txt")"`,
  ].join('\n');
  const out = execFileSync('bash', ['-c', script], { encoding: 'utf8', cwd: REPO_ROOT });
  return {
    falhos: /^FALHOS=(.*)$/m.exec(out)?.[1] ?? '',
    saida: /^SAIDA=(.*)$/m.exec(out)?.[1] ?? '',
  };
}

/** Placar do vitest 4.x como ele CHEGA ao harness: com escape de cor. */
const PLACAR_COLORIDO = String.raw`printf 'Tests \033[22m \033[1m\033[32m90 passed\033[39m\033[22m (90)\n'`;
const PLACAR_LIMPO = String.raw`printf 'Tests  90 passed (90)\n'`;
const ESPERA_PLACAR = 'Tests +[0-9]+ passed';

describe('critérios do executor — strip de ANSI', () => {
  it('saída COLORIDA casa o mesmo critério que a saída limpa', () => {
    expect(rodarCriterio(PLACAR_COLORIDO, ESPERA_PLACAR).falhos).toBe('');
    expect(rodarCriterio(PLACAR_LIMPO, ESPERA_PLACAR).falhos).toBe('');
  });

  it('a saída registrada na evidência já vem sem escape de cor', () => {
    const { saida } = rodarCriterio(PLACAR_COLORIDO, ESPERA_PLACAR);
    expect(saida).toBe('Tests  90 passed (90)');
    expect(saida).not.toContain(ESC);
  });

  it('REGRESSÃO: sem o strip a mesma saída NÃO casava — a cegueira era do harness', () => {
    const script = [
      'export EXECUTOR_SOURCED=1',
      `source "${REPO_ROOT}/scripts/orquestrador/executor.sh"`,
      `crua="$(${PLACAR_COLORIDO})"`,
      `criterio_match "$crua" '${ESPERA_PLACAR}' && echo CASOU || echo NAO_CASOU`,
    ].join('\n');
    const out = execFileSync('bash', ['-c', script], { encoding: 'utf8', cwd: REPO_ROOT });
    expect(out.trim()).toBe('NAO_CASOU');
  });

  it('critério NUMÉRICO também é imune a cor (igualdade exata sobre saída colorida)', () => {
    const cmd = String.raw`printf '\033[32m7\033[0m\n' | tr -d ' '`;
    expect(rodarCriterio(cmd, '7').falhos).toBe('');
  });

  it('texto acentuado sobrevive ao strip (o filtro não estraga UTF-8)', () => {
    const cmd = String.raw`printf '\033[31mmigração ok\033[0m\n'`;
    const { saida, falhos } = rodarCriterio(cmd, 'migração ok');
    expect(saida).toBe('migração ok');
    expect(falhos).toBe('');
  });
});

describe('critérios do executor — BASE_REF', () => {
  it('o cmd recebe a base REAL da worktree (branch_alvo do config), não a protegida', () => {
    const { saida, falhos } = rodarCriterio('printf %s "$BASE_REF"', cfgRaw.branch_alvo);
    expect(saida).toBe(cfgRaw.branch_alvo);
    expect(falhos).toBe('');
  });

  it('nenhum ticket da fila usa mais "main...HEAD" em critério de escopo', () => {
    const cmds = execFileSync('bash', ['-c', `grep -h '"cmd"' docs/fila/*.md || true`], {
      encoding: 'utf8',
      cwd: REPO_ROOT,
    });
    expect(cmds).not.toMatch(/main\.\.\.HEAD/);
    expect(cmds).toMatch(/\$BASE_REF\.\.\.HEAD/);
  });
});
