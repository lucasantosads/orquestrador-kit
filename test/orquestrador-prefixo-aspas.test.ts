/**
 * Peça 0e(b) — a derivação de `allowedTools` entende aspas.
 *
 * `prefixoDeCmd` cortava no primeiro `|` sem saber se ele estava dentro de
 * aspas — e num `grep -E` ele quase sempre está. O corpus é o REAL: os 105
 * `criterios_aceite` dos cinco tickets do lote 8 (246-250), copiados dos
 * tickets em `test/fixtures/criterios/lote8-246-250.json`. Os cinco já estão em
 * `main` e vão drenar assim.
 *
 * A regressão está escrita aqui como função (`prefixoAntigo`) de propósito: o
 * que se afirma não é "o novo funciona", é "o antigo produzia permissão que não
 * autoriza nada, e em quantos casos".
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { padroesDeCmd, prefixoDeCmd, prefixoSimples } from '../scripts/orquestrador/perfil.js';

const CORPUS = JSON.parse(
  readFileSync(join(__dirname, 'fixtures', 'criterios', 'lote8-246-250.json'), 'utf8'),
) as { ticket: string; cmd: string; espera: string }[];

/** A derivação de antes da peça 0e(b), para medir o dano que ela causava. */
const prefixoAntigo = (cmd: string) => (cmd.split(/ {2}|\|/)[0] ?? '').trim();

/** Aspas balanceadas: nenhuma aspa fica aberta ao fim do prefixo. */
function aspasBalanceadas(s: string): boolean {
  let aspas: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (aspas !== "'" && c === '\\') { i++; continue; }
    if (aspas) { if (c === aspas) aspas = null; continue; }
    if (c === "'" || c === '"') aspas = c;
  }
  return aspas === null;
}

/** Parênteses balanceados: `$(` aberto é tão inútil quanto aspa aberta. */
function parentesesBalanceados(s: string): boolean {
  let aspas: string | null = null;
  let n = 0;
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (aspas !== "'" && c === '\\') { i++; continue; }
    if (aspas) { if (c === aspas) aspas = null; continue; }
    if (c === "'" || c === '"') { aspas = c; continue; }
    if (c === '(') n++;
    else if (c === ')') n--;
    if (n < 0) return false;
  }
  return n === 0;
}

describe('o corpus é o dos tickets reais do lote 8', () => {
  it('105 critérios, dos cinco tickets 246-250', () => {
    expect(CORPUS).toHaveLength(105);
    expect([...new Set(CORPUS.map((c) => c.ticket))].sort()).toEqual(['246', '247', '248', '249', '250']);
  });
});

describe('o dano que a derivação sem aspas causava', () => {
  const quebrados = CORPUS.filter((c) => !aspasBalanceadas(prefixoAntigo(c.cmd)));

  it('21 dos 105 critérios saíam com aspas ABERTAS no prefixo', () => {
    // A peça anotou 20 quando o lote foi medido; hoje, com o 250 reescrito pela
    // manutenção do 247, são 21. O número não é a asserção — a asserção é que
    // eram muitos e agora são zero.
    expect(quebrados.length).toBe(21);
  });

  it('o exemplo da peça: a permissão derivada não casava nada', () => {
    const cmd = CORPUS.find((c) => c.cmd.includes('WARN_(TRENDS|PERGUNTAS)_DEGRADADO'))!.cmd;
    expect(prefixoAntigo(cmd)).toBe("test $(grep -cE 'export const WARN_(TRENDS");
    expect(aspasBalanceadas(prefixoAntigo(cmd))).toBe(false);
  });
});

describe('com aspas, o prefixo de TODO cmd real fecha o que abriu', () => {
  it('nenhum dos 105 prefixos sai com aspas abertas', () => {
    const maus = CORPUS.filter((c) => !aspasBalanceadas(prefixoDeCmd(c.cmd)));
    expect(maus.map((c) => `${c.ticket}: ${c.cmd}`)).toEqual([]);
  });

  it('nem com parêntese aberto — `|` dentro de `$(…)` também é do subcomando', () => {
    const maus = CORPUS.filter((c) => !parentesesBalanceados(prefixoDeCmd(c.cmd)));
    expect(maus.map((c) => `${c.ticket}: ${c.cmd}`)).toEqual([]);
  });

  it('e a permissão gerada para eles é a EXATA, nunca a `:*`', () => {
    // Prefixo com `$`, `(` ou `|` não é simples, e permissão `:*` sobre algo
    // assim autorizaria emendar comando depois — larga demais por acidente.
    for (const { cmd } of CORPUS) {
      const p = prefixoDeCmd(cmd);
      if (!p || !/[&;|><$`()*]/.test(p)) continue;
      expect(prefixoSimples(p)).toBe(false);
      expect(padroesDeCmd(cmd)).toEqual([`Bash(${p})`]);
    }
  });
});

describe('o corte de antes continua valendo onde sempre valeu', () => {
  it('pipe FORA de aspas ainda corta', () => {
    expect(prefixoDeCmd("npx vitest run x | grep -c 'passed'")).toBe('npx vitest run x');
  });

  it('espaço duplo ainda corta', () => {
    expect(prefixoDeCmd('npm test  # só o placar importa')).toBe('npm test');
  });

  it('pipe DENTRO de aspas não corta mais', () => {
    expect(prefixoDeCmd("grep -cE 'a|b' arq.ts")).toBe("grep -cE 'a|b' arq.ts");
  });

  it('pipe dentro de `$(…)` não corta: é do subcomando', () => {
    expect(prefixoDeCmd('test $(grep -c x arq.ts | wc -l) -eq 1')).toBe('test $(grep -c x arq.ts | wc -l) -eq 1');
  });

  it('mas o pipe do ENCADEAMENTO, depois do `$(…)` fechado, corta', () => {
    expect(prefixoDeCmd('test $(grep -c x a.ts) -eq 1 | tee /dev/null')).toBe('test $(grep -c x a.ts) -eq 1');
  });

  it('barra invertida fora de aspas não abre nível: `grep -E fetch\\(`', () => {
    expect(prefixoDeCmd('grep -E fetch\\( arq.ts | wc -l')).toBe('grep -E fetch\\( arq.ts');
  });

  it('aspas duplas contam igual às simples', () => {
    expect(prefixoDeCmd('grep -cE "a|b" arq.ts')).toBe('grep -cE "a|b" arq.ts');
  });
});
