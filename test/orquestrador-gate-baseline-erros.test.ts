/**
 * `tipo: "baseline_erros"` — baseline de typecheck ERRO A ERRO (arquivo + código TS).
 *
 * Pedido do dono do dashboard-comercial (24/10/2026): a contagem sozinha não
 * vale. Com `tipo: "baseline"`, um ticket que conserta um erro herdado e cria um
 * novo em outro arquivo sai com o MESMO total e passa. O caso central deste
 * arquivo é exatamente esse: o controle negativo mostra o gate de contagem
 * aprovando a troca e o gate erro a erro reprovando-a.
 */
import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  avaliaBaselineErros,
  avaliaGate,
  carregarBaselinesErros,
  gerarErrosBaseline,
  lerErrosBaseline,
  paresDeErro,
} from '../scripts/orquestrador/gates.js';
import type { ErrosBaseline, Execucao, GateSpec, GatesConfig } from '../scripts/orquestrador/gates.js';
import { validarConfig } from '../scripts/orquestrador/config-cli.js';

const exec = (saida: string, exitCode = 2): Execucao => ({ exitCode, saida, ms: 1 });
const erro = (arquivo: string, codigo: string, linha = 1) => `${arquivo}(${linha},5): error ${codigo}: mensagem qualquer.`;

const BASE_SAIDA = [
  erro('src/a.ts', 'TS2304', 10),
  erro('src/a.ts', 'TS2304', 20),
  erro('src/b.tsx', 'TS2322', 3),
].join('\n');
const BASE: ErrosBaseline = gerarErrosBaseline(BASE_SAIDA);

const SPEC: GateSpec = { nome: 'typecheck', cmd: 'tsc', tipo: 'baseline_erros', baseline_arquivo: 'x.json', baseline_erros: BASE };

describe('paresDeErro', () => {
  it('agrupa por arquivo+código e ignora linha e coluna', () => {
    expect(paresDeErro(BASE_SAIDA)).toEqual({ 'src/a.ts|TS2304': 2, 'src/b.tsx|TS2322': 1 });
  });

  it('erro global sem arquivo entra como ?|TSxxxx; linha que não é erro não conta', () => {
    expect(paresDeErro('error TS5023: Unknown compiler option.\nFound 1 error.')).toEqual({ '?|TS5023': 1 });
  });

  it('o filtro tira .next/ (o contagem_regex do dashboard)', () => {
    const saida = `${erro('.next/types/x.ts', 'TS2344')}\n${erro('src/a.ts', 'TS2304')}`;
    expect(paresDeErro(saida, '^(?!\\.next/).*error TS\\d+')).toEqual({ 'src/a.ts|TS2304': 1 });
  });

  it('escapes ANSI não mudam a chave', () => {
    expect(paresDeErro(`\x1b[96msrc/a.ts\x1b[0m(1,1): error TS2304: x`)).toEqual({ 'src/a.ts|TS2304': 1 });
  });
});

describe('avaliaBaselineErros', () => {
  it('a própria saída da baseline passa, com linhas deslocadas também', () => {
    expect(avaliaBaselineErros(BASE_SAIDA, BASE).ok).toBe(true);
    const deslocada = BASE_SAIDA.replace('(10,5)', '(99,1)').replace('(3,5)', '(4,2)');
    expect(avaliaBaselineErros(deslocada, BASE).ok).toBe(true);
  });

  it('consertar erro herdado passa', () => {
    expect(avaliaBaselineErros(erro('src/b.tsx', 'TS2322'), BASE).ok).toBe(true);
  });

  it('par que cresceu reprova e diz quanto', () => {
    const r = avaliaBaselineErros(`${BASE_SAIDA}\n${erro('src/a.ts', 'TS2304', 30)}`, BASE);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('src/a.ts TS2304 (3 > 2)');
  });

  it('mesmo arquivo com código novo reprova', () => {
    const r = avaliaBaselineErros(`${BASE_SAIDA}\n${erro('src/a.ts', 'TS2345')}`, BASE);
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('src/a.ts TS2345 (novo: 1)');
  });

  it('CONTROLE NEGATIVO: troca de 1 por 1 (mesmo total) passa no gate de contagem e reprova aqui', () => {
    const troca = [erro('src/a.ts', 'TS2304'), erro('src/a.ts', 'TS2304'), erro('src/c.ts', 'TS2551')].join('\n');
    const contagem = avaliaGate({ nome: 'typecheck', cmd: 'tsc', tipo: 'baseline', baseline: 3 }, exec(troca));
    expect(contagem.ok).toBe(true);
    const r = avaliaGate(SPEC, exec(troca));
    expect(r.ok).toBe(false);
    expect(r.motivo).toContain('src/c.ts TS2551 (novo: 1)');
  });
});

describe('avaliaGate com tipo baseline_erros', () => {
  it('exit != 0 com os erros herdados: decide a comparação, não o exit', () => {
    expect(avaliaGate(SPEC, exec(BASE_SAIDA, 2)).ok).toBe(true);
  });

  it('gate MUDO: exit != 0 sem nenhuma linha contada reprova', () => {
    const r = avaliaGate(SPEC, exec('sh: tsc: command not found', 127));
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/nenhuma linha contada/);
  });

  it('exit 0 sem erro nenhum passa', () => {
    expect(avaliaGate(SPEC, exec('', 0)).ok).toBe(true);
  });

  it('sem baseline carregada reprova (nunca aprova sem régua)', () => {
    const r = avaliaGate({ ...SPEC, baseline_erros: null }, exec(BASE_SAIDA));
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/baseline_arquivo 'x.json' ausente, ilegível/);
  });

  it('interrupção continua sendo interrupção', () => {
    expect(avaliaGate(SPEC, exec(BASE_SAIDA, 137)).motivo).toMatch(/interrompido/);
  });
});

describe('arquivo de baseline', () => {
  it('gerar -> ler devolve a mesma coisa, com pares ordenados e total', () => {
    const b = gerarErrosBaseline(BASE_SAIDA, undefined, 'abc123');
    expect(b).toEqual({ commit: 'abc123', total: 3, pares: { 'src/a.ts|TS2304': 2, 'src/b.tsx|TS2322': 1 } });
    expect(lerErrosBaseline(JSON.stringify(b))).toEqual(b);
  });

  it('total que não bate com a soma, contagem não inteira ou JSON quebrado = null', () => {
    expect(lerErrosBaseline(JSON.stringify({ total: 4, pares: { 'a|TS1': 3 } }))).toBeNull();
    expect(lerErrosBaseline(JSON.stringify({ total: 1, pares: { 'a|TS1': 0.5, 'b|TS1': 0.5 } }))).toBeNull();
    expect(lerErrosBaseline('{')).toBeNull();
  });

  it('carregarBaselinesErros lê relativo à raiz do CONFIG (a main), não à worktree', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-bl-erros-'));
    mkdirSync(join(raiz, 'docs', 'fila'), { recursive: true });
    mkdirSync(join(raiz, 'docs', 'orquestrador'), { recursive: true });
    writeFileSync(join(raiz, 'docs', 'orquestrador', 'baseline-tsc.json'), JSON.stringify(BASE));
    const cfg: GatesConfig = {
      gates: [
        { nome: 'typecheck', cmd: 'tsc', tipo: 'baseline_erros', baseline_arquivo: 'docs/orquestrador/baseline-tsc.json' },
        { nome: 'outro', cmd: 'tsc', tipo: 'baseline_erros', baseline_arquivo: 'docs/orquestrador/nao-existe.json' },
      ],
      _execucao_dos_gates: { ordem_obrigatoria: ['typecheck', 'outro'], interrupcao: 'NAO_VALE_PARCIALMENTE' },
    };
    carregarBaselinesErros(cfg, join(raiz, 'docs', 'fila', '000-config.json'));
    expect(cfg.gates[0]!.baseline_erros).toEqual(BASE);
    expect(cfg.gates[1]!.baseline_erros).toBeNull();
  });

  it('orq config acusa baseline_erros sem baseline_arquivo', () => {
    const chaves = validarConfig({
      gates: [{ nome: 'typecheck', papel: 'typecheck', cmd: 'tsc', tipo: 'baseline_erros' }],
    } as never).map((x) => x.chave);
    expect(chaves).toContain('gates[0].baseline_arquivo');
  });
});
