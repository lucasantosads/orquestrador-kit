/**
 * Peça 0e(a2) — reparo ÚNICO do events.log.
 *
 * A peça 0e(a) fechou a torneira; os eventos JÁ GRAVADOS continuam quebrados. E
 * enquanto estiverem, todo `grep`, `tail` e contagem sobre a trilha mente sobre
 * eles — inclusive as leituras de que a peça 0d depende.
 *
 * Não é reescrita de história: é correção de FORMATO. A entrada do teste é o
 * recorte REAL da trilha de produção (`events-quebrado.log`, linhas 253-382:
 * 130 linhas, 23 eventos, 107 órfãs), e a asserção mais forte é a do
 * round-trip — desfazer o escape devolve o arquivo original BYTE A BYTE.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, copyFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { criarFixture, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const REPARAR = join(REPO_ROOT, 'scripts', 'orquestrador', 'reparar-trilha.sh');
const QUEBRADO = readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'trilha', 'events-quebrado.log'), 'utf8');
const TS = /^\d{4}-\d{2}-\d{2}T/;

const linhas = (t: string) => t.replace(/\n$/, '').split('\n');
const eventos = (t: string) => linhas(t).filter((l) => TS.test(l)).length;
const orfas = (t: string) => linhas(t).filter((l) => !TS.test(l)).length;

function reparar(fx: string, conteudo: string) {
  const trilha = join(fx, 'docs', 'fila', 'runs', 'events.log');
  writeFileSync(trilha, conteudo);
  const r = spawnSync('bash', [REPARAR], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_TESTE: '1' },
  });
  return { rc: r.status ?? 1, saida: `${r.stdout ?? ''}${r.stderr ?? ''}`, trilha, depois: ler(trilha) };
}

describe('o recorte real é mesmo o caso doente', () => {
  it('130 linhas para 23 eventos — 107 órfãs', () => {
    expect(linhas(QUEBRADO)).toHaveLength(130);
    expect(eventos(QUEBRADO)).toBe(23);
    expect(orfas(QUEBRADO)).toBe(107);
  });
});

describe('reparo sobre a trilha real quebrada', () => {
  it('100% das linhas passam a começar com timestamp', () => {
    const r = reparar(criarFixture([]), QUEBRADO);
    expect(r.rc, r.saida).toBe(0);
    for (const l of linhas(r.depois)) expect(l).toMatch(TS);
  });

  it('o número de eventos é o mesmo de antes (contagem tirada imediatamente antes)', () => {
    const antes = eventos(QUEBRADO);
    const r = reparar(criarFixture([]), QUEBRADO);
    // -1 porque o ANOTACAO do próprio reparo é o único evento novo, e ele entra
    // DEPOIS da contagem — é registro do reparo, não da trilha reparada.
    expect(eventos(r.depois) - 1).toBe(antes);
    expect(r.saida).toContain(`eventos_antes=${antes} eventos_depois=${antes}`);
  });

  it('conteúdo preservado BYTE A BYTE: desfazer o escape devolve o original', () => {
    const r = reparar(criarFixture([]), QUEBRADO);
    const semAnotacao = linhas(r.depois).filter((l) => !l.includes('ANOTACAO')).join('\n') + '\n';
    expect(semAnotacao.replace(/\\n/g, '\n')).toBe(QUEBRADO);
  });

  it('o reparo se registra na trilha, como ANOTACAO', () => {
    const r = reparar(criarFixture([]), QUEBRADO);
    const anot = linhas(r.depois).filter((l) => l.includes('ANOTACAO'));
    expect(anot).toHaveLength(1);
    expect(anot[0]).toMatch(/--- ANOTACAO nota=reparo de formato do events\.log: 107 linha\(s\)/);
    expect(anot[0]).toMatch(TS);
  });

  it('guarda a cópia crua do ANTES, para a preservação ser conferível depois', () => {
    const fx = criarFixture([]);
    const r = reparar(fx, QUEBRADO);
    const dir = join(fx, 'docs', 'fila', 'runs');
    const copias = readdirSync(dir).filter((f) => f.startsWith('events.log.pre-reparo-'));
    expect(copias).toHaveLength(1);
    expect(readFileSync(join(dir, copias[0]!), 'utf8')).toBe(QUEBRADO);
    expect(r.saida).toContain('pre-reparo-');
  });
});

describe('uma vez só, e por construção', () => {
  it('a segunda passagem é no-op: não escreve, não anota', () => {
    const fx = criarFixture([]);
    const primeira = reparar(fx, QUEBRADO);
    const conteudo1 = primeira.depois;
    const r2 = spawnSync('bash', [REPARAR], {
      encoding: 'utf8',
      cwd: fx,
      env: { ...process.env, ORQ_EXEC_ROOT: fx, ORQ_TESTE: '1' },
    });
    expect(r2.status).toBe(0);
    expect(`${r2.stdout}${r2.stderr}`).toContain('nada a reparar');
    expect(ler(primeira.trilha)).toBe(conteudo1);
  });
});

describe('recusa em vez de inventar', () => {
  it('arquivo que COMEÇA com linha órfã não é tocado (rc=2)', () => {
    const semCabeca = linhas(QUEBRADO).slice(1).join('\n') + '\n';
    const fx = criarFixture([]);
    const r = reparar(fx, semCabeca);
    expect(r.rc).toBe(2);
    expect(r.saida).toContain('RECUSADO');
    expect(r.depois).toBe(semCabeca);
    const dir = join(fx, 'docs', 'fila', 'runs');
    expect(readdirSync(dir).filter((f) => f.includes('pre-reparo'))).toHaveLength(0);
  });

  it('trilha já sã sai 0 sem tocar em nada', () => {
    const sa = linhas(QUEBRADO).filter((l) => TS.test(l)).join('\n') + '\n';
    const r = reparar(criarFixture([]), sa);
    expect(r.rc).toBe(0);
    expect(r.saida).toContain('nada a reparar');
    expect(r.depois).toBe(sa);
  });
});

describe('a trilha reparada é legível pelas ferramentas que a liam errado', () => {
  it('`grep PERMISSAO_NEGADA` acha os eventos, e não os heredocs deles', () => {
    const r = reparar(criarFixture([]), QUEBRADO);
    const achados = linhas(r.depois).filter((l) => l.includes('PERMISSAO_NEGADA'));
    expect(achados.length).toBeGreaterThan(0);
    for (const l of achados) expect(l).toMatch(TS);
    // Antes do reparo, `grep -c 'import re'` achava linha de trilha; agora essa
    // string existe só DENTRO de um evento, nunca como linha.
    expect(linhas(r.depois).some((l) => l.trim() === 'import re')).toBe(false);
    expect(r.depois).toContain('import re');
  });
});
