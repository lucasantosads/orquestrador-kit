/**
 * Peça K12-F — `orq pausar` e `orq retomar` gravam na trilha, no MESMO formato
 * do painel: `PAUSA motivo=<token> por=terminal` e `RETOMADA por=terminal
 * dur=<N>min`. Pausa pelo terminal e pelo painel ficam iguais na trilha, e o
 * `retomar` diz quem pausou, quando e por quê ANTES de apagar o sentinela.
 *
 * Até esta peça, pausar e retomar pelo terminal não deixavam linha nenhuma: o
 * painel só sabia de pausa por ele mesmo, e o alarme de pausa furada tinha só
 * a precisão de minuto do conteúdo do arquivo.
 */
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { criarFixture, escrever, ler, orq, bashNoFixture } from './fixtures/orq-harness.js';

const TRILHA = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'events.log');
const PAUSAR = (raiz: string) => join(raiz, 'docs', 'fila', 'PAUSAR');
const linhas = (raiz: string) => ler(TRILHA(raiz)).trim().split('\n').filter(Boolean);
const ISO = '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}[+-]\\d{4}';

describe('orq pausar grava PAUSA na trilha', () => {
  it('uma linha, id ---, motivo em token e por=terminal', () => {
    const raiz = criarFixture();
    const r = orq(raiz, 'pausar', 'promoção manual em curso');
    expect(r.rc).toBe(0);
    const l = linhas(raiz);
    expect(l).toHaveLength(1);
    expect(l[0]).toMatch(new RegExp(`^${ISO} --- PAUSA motivo=promocao-manual-em-curso por=terminal$`));
    // o texto livre continua no arquivo, como sempre (§7)
    expect(ler(PAUSAR(raiz))).toMatch(/\| promoção manual em curso\n$/);
  });

  it('sem motivo: o motivo padrão vira token', () => {
    const raiz = criarFixture();
    orq(raiz, 'pausar');
    expect(linhas(raiz)[0]).toMatch(/ --- PAUSA motivo=pausa-manual por=terminal$/);
  });
});

describe('orq retomar grava RETOMADA e diz quem pausou, quando e por quê', () => {
  it('RETOMADA por=terminal dur=<N>min, depois da PAUSA', () => {
    const raiz = criarFixture();
    orq(raiz, 'pausar', 'leva da tarde');
    const r = orq(raiz, 'retomar');
    expect(r.rc).toBe(0);
    expect(existsSync(PAUSAR(raiz))).toBe(false);
    const l = linhas(raiz);
    expect(l).toHaveLength(2);
    expect(l[1]).toMatch(new RegExp(`^${ISO} --- RETOMADA por=terminal dur=0min$`));
  });

  it('imprime quem, quando e o motivo ANTES do RETOMADO', () => {
    const raiz = criarFixture();
    orq(raiz, 'pausar', 'leva da tarde');
    const out = orq(raiz, 'retomar').out;
    expect(out).toMatch(/pausado por terminal/);
    expect(out).toMatch(/em \d{4}-\d{2}-\d{2} \d{2}:\d{2}/);
    expect(out).toMatch(/motivo: leva da tarde/);
    expect(out.indexOf('pausado por')).toBeLessThan(out.indexOf('RETOMADO'));
  });

  it('pausa feita pelo painel: o retomar do terminal diz "painel" e conta a duração da PAUSA', () => {
    const raiz = criarFixture();
    const t = new Date(Date.now() - 21 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    const off = -t.getTimezoneOffset();
    const fuso = `${off >= 0 ? '+' : '-'}${p(Math.floor(Math.abs(off) / 60))}${p(Math.abs(off) % 60)}`;
    const iso = `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}T${p(t.getHours())}:${p(t.getMinutes())}:${p(t.getSeconds())}${fuso}`;
    escrever(TRILHA(raiz), `${iso} --- PAUSA motivo=leva-da-tarde por=painel\n`);
    escrever(PAUSAR(raiz), `${iso.slice(0, 10)} ${iso.slice(11, 16)} | leva da tarde\n`);
    const out = orq(raiz, 'retomar').out;
    expect(out).toMatch(/pausado por painel/);
    const ult = linhas(raiz).at(-1) ?? '';
    // 21 min contados da PAUSA da trilha (segundos), não do minuto do arquivo
    expect(ult).toMatch(/ --- RETOMADA por=terminal dur=21min$/);
  });

  it('PAUSAR criado à mão, sem PAUSA na trilha: diz que não há registro e conta pelo conteúdo', () => {
    const raiz = criarFixture();
    const t = new Date(Date.now() - 5 * 60 * 1000);
    const p = (n: number) => String(n).padStart(2, '0');
    escrever(PAUSAR(raiz), `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())} ${p(t.getHours())}:${p(t.getMinutes())} | à mão\n`);
    const out = orq(raiz, 'retomar').out;
    expect(out).toMatch(/pausado por \(sem PAUSA na trilha\)/);
    expect(out).toMatch(/motivo: à mão/);
    expect(linhas(raiz).at(-1)).toMatch(/ --- RETOMADA por=terminal dur=[56]min$/);
  });

  it('retomar sem pausa não grava nada', () => {
    const raiz = criarFixture();
    orq(raiz, 'retomar');
    expect(linhas(raiz)).toHaveLength(0);
  });
});

describe('um token só para os dois emissores', () => {
  it('pausa_token (lib.sh) tira acento, baixa a caixa e troca o resto por -', () => {
    const raiz = criarFixture();
    const r = bashNoFixture(raiz, `pausa_token "Manutenção à noite: 2ª parte!!"; echo; pausa_token ""`);
    expect(r.stdout).toBe('manutencao-a-noite-2a-parte\nmanual');
  });
});
