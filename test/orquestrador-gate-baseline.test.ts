/**
 * Peça G — `tipo: "baseline"` com `direcao`, `contagem_regex` e `preparo`.
 *
 * O gate de baseline existia com UMA semântica só: contar linhas `error TS\d+`
 * e reprovar acima do número. Esta peça o generaliza sem mexer no que o CI já
 * faz, com o gate REAL do comarka-operacional (lido no PASSO 0 da etapa 6, só
 * leitura) copiado para fixture:
 *
 *   { "nome": "tsc", "cmd": "npx tsc --noEmit", "tipo": "tsc_baseline",
 *     "baseline": 3, "baseline_scope_regex": "qualificacao" }
 *
 * `config-tabela.ts` já traduz `tsc_baseline` -> `baseline` (K8b-4). O que esta
 * peça acrescenta é a MÁQUINA que honra o `baseline: 3`.
 *
 * ACHADO do PASSO 0, e está registrado em `PROPRIAS_DE_REPO`: o `gate_tsc` do
 * Comarka NÃO conta nada — ele filtra por `baseline_scope_regex` e reprova se
 * sobrar QUALQUER erro fora do escopo (`executor.sh:119-125` de lá). O
 * `baseline: 3` é documentação naquele repo. Traduzir para contagem muda o que
 * o gate significa lá, e é decisão humana; aqui o que se prova é a máquina.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  avaliaBaseline,
  avaliaBaselineTsc,
  avaliaGate,
  contarNaSaida,
  rodarGates,
} from '../scripts/orquestrador/gates.js';
import type { Execucao, GateSpec, GatesConfig } from '../scripts/orquestrador/gates.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const exec0 = (saida: string, exitCode = 0): Execucao => ({ exitCode, saida, ms: 1 });

/** Uma linha `error TS2345` por erro, como o tsc imprime. */
function saidaTsc(n: number, prefixo = 'src/qualificacao/a.ts'): string {
  return Array.from({ length: n }, (_, i) => `${prefixo}(${i + 1},1): error TS2345: erro ${i + 1}.`).join('\n');
}

/** O gate do Comarka, na forma que a `config-tabela.ts` produz. */
const GATE_COMARKA: GateSpec = {
  nome: 'tsc',
  cmd: 'npx tsc --noEmit',
  tipo: 'baseline',
  baseline: 3,
};

describe('o gate do Comarka, copiado para fixture', () => {
  // O `tsc` com erros herdados SEMPRE sai != 0 — é o que `baseline: 3`
  // significa. Por isso o exit code entra aqui como 1: aprovar exige que a
  // CONTAGEM decida, e era exatamente isso que faltava.
  it('passa com 3 erros (o baseline herdado)', () => {
    const r = avaliaGate(GATE_COMARKA, exec0(saidaTsc(3), 1));
    expect(r.ok).toBe(true);
  });

  it('falha com 4 erros, e o motivo diz a contagem e o baseline', () => {
    const r = avaliaGate(GATE_COMARKA, exec0(saidaTsc(4), 1));
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('4 erro(s) de tipo, baseline 3');
  });

  it('passa com ZERO erros (quem consertou os herdados não é punido)', () => {
    expect(avaliaGate(GATE_COMARKA, exec0('', 0)).ok).toBe(true);
  });

  it('`direcao` ausente é `max` — o comportamento de sempre', () => {
    expect(avaliaBaseline(saidaTsc(4), 3)).toEqual(avaliaBaseline(saidaTsc(4), 3, 'max'));
    expect(avaliaBaselineTsc(saidaTsc(4), 3)).toEqual(avaliaBaseline(saidaTsc(4), 3, 'max'));
  });
});

describe('direcao: min — o mesmo motor serve a um placar', () => {
  const gate: GateSpec = {
    nome: 'placar',
    cmd: 'npm test',
    tipo: 'baseline',
    baseline: 861,
    direcao: 'min',
    contagem_regex: 'Tests\\s+(\\d+) passed',
  };

  it('ok quando a contagem é MAIOR que o baseline (teste novo não é falso-vermelho)', () => {
    expect(avaliaGate(gate, exec0('  Tests  900 passed (900)')).ok).toBe(true);
  });

  it('ok quando é exatamente igual', () => {
    expect(avaliaGate(gate, exec0('  Tests  861 passed (861)')).ok).toBe(true);
  });

  it('falha quando é MENOR, e o motivo diz os dois números', () => {
    const r = avaliaGate(gate, exec0('  Tests  860 passed (860)'));
    expect(r.ok).toBe(false);
    expect(r.motivo).toBe('contagem 860 < baseline 861 (direcao min)');
  });

  it('SOMA os blocos: um placar por pacote, como o parsePlacar já somava', () => {
    const saida = ['  Tests  400 passed (400)', 'outra coisa', '  Tests  461 passed (461)'].join('\n');
    expect(contarNaSaida(saida, 'Tests\\s+(\\d+) passed')).toBe(861);
    expect(avaliaGate(gate, exec0(saida)).ok).toBe(true);
  });
});

describe('contagem_regex', () => {
  it('ausente: conta LINHAS com `error TS\\d+` — e uma linha com dois erros conta 1', () => {
    expect(contarNaSaida('a.ts(1,1): error TS1 x error TS2')).toBe(1);
    expect(contarNaSaida(saidaTsc(3))).toBe(3);
  });

  it('sem grupo de captura: conta as linhas que casam', () => {
    expect(contarNaSaida(['WARN a', 'ok', 'WARN b'].join('\n'), 'WARN')).toBe(2);
  });

  it('com grupo de captura: soma os números', () => {
    expect(contarNaSaida(['achei 2 problemas', 'achei 5 problemas'].join('\n'), 'achei (\\d+) problemas')).toBe(7);
  });

  it('tira o ANSI antes de contar (vitest 4.x mantém os escapes fora do TTY)', () => {
    expect(contarNaSaida('[31m  Tests  711 passed[39m', 'Tests\\s+(\\d+) passed')).toBe(711);
  });

  it('regex vazio cai no padrão, em vez de casar tudo', () => {
    expect(contarNaSaida(saidaTsc(2), '   ')).toBe(2);
  });
});

describe('preparo: baseline medido com cache mente', () => {
  function comExec(specs: GateSpec[], resposta: (cmd: string) => Execucao) {
    const chamados: string[] = [];
    const config: GatesConfig = {
      gates: specs,
      _execucao_dos_gates: {
        ordem_obrigatoria: specs.map((s) => s.nome),
        interrupcao: 'NAO_VALE_PARCIALMENTE',
      },
    };
    const v = rodarGates(config, (cmd) => {
      chamados.push(cmd);
      return resposta(cmd);
    });
    return { v, chamados };
  }

  const gate: GateSpec = {
    nome: 'tsc',
    cmd: 'npx tsc --noEmit',
    tipo: 'baseline',
    baseline: 3,
    preparo: ['rm -f tsconfig.tsbuildinfo', 'rm -rf .next'],
  };

  it('roda cada preparo ANTES do cmd, na ordem declarada', () => {
    const { chamados } = comExec([gate], () => exec0(saidaTsc(3)));
    expect(chamados).toEqual(['rm -f tsconfig.tsbuildinfo', 'rm -rf .next', 'npx tsc --noEmit']);
  });

  it('o rc do preparo é IGNORADO: `rm` de arquivo ausente não reprova o ticket', () => {
    const { v } = comExec([gate], (cmd) => (cmd.startsWith('rm') ? exec0('No such file', 1) : exec0(saidaTsc(3))));
    expect(v.ok).toBe(true);
  });

  it('sem `preparo`, nenhum comando extra roda — o CI não ganha chamada nenhuma', () => {
    const { chamados } = comExec([GATE_COMARKA], () => exec0(''));
    expect(chamados).toEqual(['npx tsc --noEmit']);
  });

  it('preparo vazio ou em branco é ignorado', () => {
    const { chamados } = comExec([{ ...GATE_COMARKA, preparo: ['', '  '] }], () => exec0(''));
    expect(chamados).toEqual(['npx tsc --noEmit']);
  });
});

// ─── o que o CI faz diferente: nada ──────────────────────────────────────────

describe('o config do CI atravessa sem mudança de comportamento', () => {
  const cfg = JSON.parse(
    readFileSync(join(REPO_ROOT, '_referencia-ci', '000-config.ci.json'), 'utf8'),
  ) as GatesConfig;

  it('nenhum gate do CI declara direcao, contagem_regex ou preparo', () => {
    for (const g of cfg.gates) {
      expect(g.direcao, g.nome).toBeUndefined();
      expect(g.contagem_regex, g.nome).toBeUndefined();
      expect(g.preparo, g.nome).toBeUndefined();
    }
  });

  it('os dois gates `baseline: 0` do CI seguem passando com saída limpa e reprovando com um erro', () => {
    for (const g of cfg.gates.filter((x) => x.tipo === 'baseline')) {
      expect(avaliaGate(g, exec0('', 0)).ok, g.nome).toBe(true);
      const r = avaliaGate(g, exec0(saidaTsc(1), 1));
      expect(r.ok, g.nome).toBe(false);
      expect(r.motivo).toBe('1 erro(s) de tipo, baseline 0');
    }
  });

  it('o gate de placar do CI continua indo pelo caminho do baseline_placar', () => {
    const placar = cfg.gates.find((g) => g.baseline_placar);
    expect(placar?.nome).toBe('testes_por_pacote');
    expect(placar?.tipo).toBe('exit_code');
    // ACEITA placar MAIOR que o baseline — a regra do _baseline_volatil, que
    // esta peça não toca.
    const saida = [
      ...Array.from({ length: 7 }, (_, i) => `== services/s${i}/ ==`),
      ...Array.from({ length: 9 }, () => '  Tests  100 passed (100)'),
    ].join('\n');
    const r = avaliaGate(placar!, exec0(saida));
    expect(r.ok).toBe(true);
    expect(r.placar?.passando).toBe(900);
  });

  it('a limpeza de artefato do CI continua sendo um GATE próprio, não um preparo', () => {
    // `limpeza_artefatos` (`tipo: preparacao`, `rm -rf apps/web/.next`) é a
    // mesma ideia do `preparo`, resolvida antes e de outro jeito. Esta peça não
    // a converte: mudar a forma de um gate que funciona é churn, e a ordem dos
    // gates do CI é cobrada por teste próprio.
    const limpeza = cfg.gates.find((g) => g.tipo === 'preparacao');
    expect(limpeza?.nome).toBe('limpeza_artefatos');
    expect(cfg._execucao_dos_gates.ordem_obrigatoria[0]).toBe('limpeza_artefatos');
  });
});
