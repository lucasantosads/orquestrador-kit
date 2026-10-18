/**
 * Etapa 8c · P2c — o triador sabe que o teste foi ampliado pelo executor.
 *
 * Caso real: o 1373 do Comarka (`test/fixtures/vizinhos-8c/1373-triador/`, no
 * formato de `triador-7f/`), a série que bloqueou às 11:24 de 18/10. A tentativa
 * 1 falhou só no teste vizinho, a 2 veio ampliada (o 457856c gravou
 * `allowlist-ampliada.txt`), consertou o teste e reprovou na lista fechada, e a 3
 * voltou vermelha no mesmo teste. Às 14:25Z o resolvedor agiu: R1 D6. Era a
 * segunda ação sobre o mesmo teste.
 *
 * Sem `allowlist-ampliada.txt`, leitor e extração ficam byte a byte iguais ao de
 * antes da 8c: a régua é o sha256 da evidência e da extração dos 65 casos reais
 * (`triador-sem-ampliacao.json`, gravado com o triador de antes desta peça; nos
 * dois casos kit, com `repo` relativo desde a 8c-6).
 */
import { describe, it, expect, vi } from 'vitest';
import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { lerCasoDeFixture } from '../scripts/orquestrador/triador/leitor-legado-comarka.js';
import { lerRepoKit } from '../scripts/orquestrador/triador/leitor-kit.js';
import { extrair } from '../scripts/orquestrador/triador/extrair.js';
import { decidir } from '../scripts/orquestrador/resolvedor/decidir.js';
import type { Evidencia } from '../scripts/orquestrador/triador/tipos.js';

const FIXT = join(REPO_ROOT, 'test', 'fixtures');
const CASO_1373 = join(FIXT, 'vizinhos-8c', '1373-triador');
const TESTE = 'test/ia-funcoes-agentes-atendimento.test.ts';
const MODOS = { padrao: 'diagnostico', R1: 'auto' } as const;
const decide = (x: ReturnType<typeof extrair>) => decidir({ classe: x.classe, regra: x.regra, firme: x.firme, fonte: 'extracao' }, MODOS);

describe('8c-P2c · sem allowlist-ampliada.txt, leitor e extração ficam byte a byte iguais (65 casos reais)', () => {
  const h = (x: unknown) => createHash('sha256').update(JSON.stringify(x)).digest('hex').slice(0, 16);
  const semMtime = (ev: Evidencia) => ({ ...ev, lidos: ev.lidos.map(({ mtime_ns: _m, ...r }) => r) });
  /**
   * O que a régua compara do leitor kit: a evidência sem o que é do ambiente — o
   * `mtime_ns` de `lidos` (muda a cada checkout) e `repo`, que o leitor kit grava
   * como o caminho absoluto do checkout (`leitor-kit.ts:250`; 8c-6). O legado já
   * grava `fixture:<caso>`.
   */
  const semAmbiente = (ev: Evidencia, rel: string) => ({ ...semMtime(ev), repo: rel });
  const doCaso = (chave: string, raiz = join(FIXT, chave.split(/:(.*)/)[1]!)) => {
    const [leitor, rel] = chave.split(/:(.*)/) as [string, string];
    const ev = leitor === 'legado' ? lerCasoDeFixture(raiz) : lerRepoKit(raiz, '243');
    return { evidencia: h(leitor === 'kit' ? semAmbiente(ev, rel) : ev), extracao: h(extrair(ev)) };
  };
  const base = JSON.parse(readFileSync(join(FIXT, 'vizinhos-8c', 'triador-sem-ampliacao.json'), 'utf8')) as Record<
    string,
    { evidencia: string; extracao: string }
  >;

  it('a régua tem os casos do legado (triador-7f) e do kit', () => {
    expect(Object.keys(base).filter((k) => k.startsWith('legado:')).length).toBeGreaterThanOrEqual(60);
    expect(Object.keys(base).some((k) => k.startsWith('kit:'))).toBe(true);
  });

  it.each(Object.entries(base))('%s', (chave, esperado) => {
    const [leitor, rel] = chave.split(/:(.*)/) as [string, string];
    const ev = leitor === 'legado' ? lerCasoDeFixture(join(FIXT, rel)) : lerRepoKit(join(FIXT, rel), '243');
    expect(ev.tentativas.every((t) => !('ampliados' in t))).toBe(true);
    expect(doCaso(chave)).toEqual(esperado);
  });

  // 8c-6: o merge de 18/10 caiu no checkout principal (20:54 UTC) nos dois casos kit,
  // com a extração igual e a evidência diferente. O leitor kit grava em `repo` o
  // caminho absoluto do checkout (`leitor-kit.ts:250`); a régua tinha sido gravada
  // no worktree da etapa. Relógio e fuso não mudam nenhum dos 65 casos.
  it.each(Object.keys(base).filter((k) => k.startsWith('kit:')))(
    '%s copiado para outro diretório dá o mesmo hash (a régua não depende do checkout)',
    (chave) => {
      const outro = mkdtempSync(join(tmpdir(), 'orq-8c6-'));
      cpSync(join(FIXT, chave.slice(4)), outro, { recursive: true });
      expect(doCaso(chave, outro)).toEqual(base[chave]);
    },
  );

  it('com o relógio adiantado 30 dias e atrasado 400, os 65 hashes não mudam', () => {
    const agora = Date.now();
    try {
      for (const dias of [30, -400]) {
        vi.useFakeTimers({ toFake: ['Date'] });
        vi.setSystemTime(agora + dias * 86_400_000);
        for (const [chave, esperado] of Object.entries(base)) expect(doCaso(chave), `${chave} (${dias} dias)`).toEqual(esperado);
        vi.useRealTimers();
      }
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('8c-P2c · 1373 (caso real): bloqueio depois de ampliação que não fechou vira aviso, nunca R1', () => {
  it('o leitor legado lê a ampliação da tentativa 2, e só dela', () => {
    const ev = lerCasoDeFixture(CASO_1373);
    expect(ev.tentativas.map((t) => t.arquivos_vermelhos)).toEqual([[TESTE], [], [TESTE]]);
    expect(ev.tentativas.map((t) => t.ampliados)).toEqual([undefined, [TESTE], undefined]);
  });

  it('a extração não fecha D6 nem D6b: R1 D6v firme, "teste já ampliado pelo executor", sem r1_testes', () => {
    const x = extrair(lerCasoDeFixture(CASO_1373));
    expect(x.regra).toBe('D6v');
    expect(x.classe).toBe('R1');
    expect(x.firme).toBe(true); // firme: o triador não chama modelo
    expect(x.rotulo).toBe('teste já ampliado pelo executor');
    expect(x.remedio).toContain('teste já ampliado pelo executor');
    expect(x.remedio).toContain(TESTE);
    expect(x.r1_testes).toBeUndefined();
  });

  it('o resolvedor em auto para R1 só avisa (antes desta peça: r1_allowlist, a ação de 14:25Z)', () => {
    const d = decide(extrair(lerCasoDeFixture(CASO_1373)));
    expect(d.acao).toBe('aviso');
    expect(d.acao).not.toBe('r1_allowlist');
  });

  it('o teste ampliado conta como coberto naquela tentativa (e só nela)', () => {
    const ev = lerCasoDeFixture(CASO_1373);
    const t3 = ev.tentativas[2]!;
    const comT3 = { ...ev, tentativas: [ev.tentativas[0]!, ev.tentativas[1]!, { ...t3, ampliados: [TESTE] }] };
    const vs = extrair(comT3).detalhe.vermelhos;
    expect(vs.find((v) => v.tentativa === 3)?.dentro_allowlist).toBe(true);
    expect(vs.find((v) => v.tentativa === 1)?.dentro_allowlist).toBe(false);
  });

  it('contra-teste: o mesmo 1373 sem o arquivo de ampliação segue R1 D6 (o caminho de hoje)', () => {
    const ev = lerCasoDeFixture(CASO_1373);
    const sem = { ...ev, tentativas: ev.tentativas.map(({ ampliados: _a, ...t }) => t) };
    const x = extrair(sem);
    expect([x.classe, x.regra, x.firme]).toEqual(['R1', 'D6', true]);
    expect(decide(x).acao).toBe('r1_allowlist');
  });
});

describe('8c-P2c · o leitor kit lê attempt-N/allowlist-ampliada.txt', () => {
  it('um repo do kit com a ampliação gravada pelo executor na tentativa 2', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-8c-kit-'));
    cpSync(join(FIXT, 'triador-custo-real', 'conteudos-243'), raiz, { recursive: true });
    const dirs = readdirSync(join(raiz, 'docs', 'fila', 'runs', '243')).filter((d) => statSync(join(raiz, 'docs', 'fila', 'runs', '243', d)).isDirectory());
    expect(dirs).toContain('attempt-1');
    writeFileSync(join(raiz, 'docs', 'fila', 'runs', '243', 'attempt-1', 'allowlist-ampliada.txt'), 'test/vizinho.test.ts\n');
    const ev = lerRepoKit(raiz, '243');
    const t = ev.tentativas.find((x) => x.dir.endsWith('/attempt-1'));
    expect(t, JSON.stringify(ev.tentativas.map((x) => x.dir))).toBeDefined();
    expect(t!.ampliados).toEqual(['test/vizinho.test.ts']);
    expect(ev.tentativas.filter((x) => x !== t).every((x) => !('ampliados' in x))).toBe(true);
    expect(existsSync(join(FIXT, 'triador-custo-real', 'conteudos-243', 'docs', 'fila', 'runs', '243', 'attempt-1', 'allowlist-ampliada.txt'))).toBe(false);
  });
});
