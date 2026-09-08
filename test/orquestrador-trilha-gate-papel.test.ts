/**
 * Peça K6b — a linha `GATE` da trilha derivada do RESULTADO dos gates, não do
 * nome deles no monorepo do CI.
 *
 * O defeito, medido no e2e de 2026-09-08 (docs/PECAS.md, K7-e2e): `event_gate`
 * montava a linha com `gate_marca "$gt" testes_por_pacote` e
 * `gate_marca "$gt" build` — nomes do conteudos-infinitos escritos dentro do
 * motor. Num repo cujos gates se chamem `typecheck` e `test` (o fixture do kit),
 * a trilha gravou
 *
 *   001 GATE typecheck=nao-rodou testes=nao-rodou enforcement=ok criterios=4/4 build=nao-rodou
 *
 * enquanto o `gates.txt` do MESMO attempt dizia `ok typecheck` / `ok test` /
 * `VEREDITO: APROVADO`. A trilha afirmou "não rodou" sobre gates que rodaram e
 * aprovaram. Não derruba o run (o desfecho sai do gates.txt), mas a trilha é o
 * ground truth de "o que aconteceu" — e aqui ela mentia por premissa de repo.
 *
 * A regra nova, e o que cada palavra passa a significar:
 *   - cada gate do config tem um PAPEL: declarado (`"papel": "..."`) ou inferido
 *     do nome (typecheck | testes | build | lint);
 *   - `nao-configurado` — o repo não tem gate nenhum com esse papel. Informação
 *     diferente de `nao-rodou`, e a que faltava: dizer "não rodou" sobre um
 *     build que o repo não tem é a mesma mentira, só que ao contrário;
 *   - `nao-rodou` — há gate com esse papel no config e ele não aparece no
 *     gates.txt (o motor para no primeiro que reprova);
 *   - `falha` ganha de tudo: papel com dois gates (typecheck_root + typecheck_web)
 *     reprova se QUALQUER um reprovar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { bashNoFixture, criarFixture, escrever, ler, REPO_ROOT } from './fixtures/orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const EVENTS = (raiz: string) => join(raiz, 'docs', 'fila', 'runs', 'events.log');

const CONFIG_CI = join(REPO_ROOT, '_referencia-ci', '000-config.ci.json');
const CONFIG_FIXTURE = join(REPO_ROOT, 'fixture', 'docs', 'fila', '000-config.json');
const GATES_201 = join(REPO_ROOT, 'test', 'fixtures', 'runs-201', 'attempt-2.gates.txt');

/**
 * Monta um rundir e chama `event_gate` de verdade, com o CONFIG pedido no lugar
 * do config do fixture. É o config que decide quais papéis existem.
 */
function linhaGate(configPath: string, gatesTxt: string, total = 3): string {
  const raiz = criarFixture([{ id: '901', slug: 'b', status: 'pendente' }]);
  escrever(join(raiz, 'docs', 'fila', '000-config.json'), readFileSync(configPath, 'utf8'));
  const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
  escrever(join(rundir, 'gates.txt'), gatesTxt);
  escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
  bashNoFixture(
    raiz,
    [
      'export EXECUTOR_SOURCED=1',
      `source "${EXECUTOR}"`,
      'set +e',
      `CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=${total}`,
      `event_gate 901 "${rundir}" 1`,
    ].join('\n'),
  );
  // Sem o timestamp: ele muda a cada execução e não é o que esta peça afirma.
  return ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
}

// O gates.txt que o e2e de 2026-09-08 produziu no fixture: dois gates de nome
// PRÓPRIO, os dois verdes. É a entrada que fazia a trilha mentir.
const GATES_FIXTURE = [
  'ok   typecheck                345ms',
  'ok   test                    2100ms',
  'VEREDITO: APROVADO',
].join('\n');

describe('config do FIXTURE (gates `typecheck` e `test`)', () => {
  it('a trilha diz o que os gates disseram, e build sai como nao-configurado', () => {
    expect(linhaGate(CONFIG_FIXTURE, GATES_FIXTURE, 4)).toBe(
      '901 GATE typecheck=ok testes=ok enforcement=ok criterios=4/4 build=nao-configurado',
    );
  });

  it('gate de nome próprio que REPROVA sai falha, e o que passou continua ok', () => {
    const txt = ['ok   typecheck                345ms', 'FALHA test  2100ms — 1 teste(s) falhando', 'VEREDITO: REPROVADO'].join('\n');
    // A falha de um papel não contamina o outro: `typecheck` rodou e passou.
    expect(linhaGate(CONFIG_FIXTURE, txt, 4)).toBe(
      '901 GATE typecheck=ok testes=falha enforcement=ok criterios=4/4 build=nao-configurado',
    );
  });

  it('gate CONFIGURADO que não chegou a rodar continua nao-rodou', () => {
    const txt = ['FALHA typecheck  345ms — 4 erro(s) de tipo', 'VEREDITO: REPROVADO'].join('\n');
    // `test` está no config e não está no gates.txt: não rodou. Distinto de
    // `build`, que o config do fixture não tem: nao-configurado.
    expect(linhaGate(CONFIG_FIXTURE, txt, 4)).toBe(
      '901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=4/4 build=nao-configurado',
    );
  });
});

describe('config do CI (_referencia-ci/000-config.ci.json)', () => {
  it('produz EXATAMENTE a linha de hoje para um attempt real (runs-201 attempt-2)', () => {
    // Medida no código anterior a esta peça, com este mesmo config e este mesmo
    // gates.txt. Se esta string mudar, o comportamento do CI mudou.
    expect(linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'))).toBe(
      '901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou',
    );
  });

  it('os dois typecheck do CI viram um papel só, e falha de um é falha do papel', () => {
    const txt = [
      'ok   limpeza_artefatos       10ms',
      'ok   typecheck_root        1200ms',
      'FALHA typecheck_web        3400ms — 4 erros acima do baseline',
      'VEREDITO: REPROVADO',
    ].join('\n');
    expect(linhaGate(CONFIG_CI, txt)).toBe(
      '901 GATE typecheck=falha testes=nao-rodou enforcement=ok criterios=3/3 build=nao-rodou',
    );
  });

  it('nenhum gate do CI cai em nao-configurado: o CI tem os três papéis', () => {
    const linha = linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'));
    expect(linha).not.toContain('nao-configurado');
  });
});

describe('papel declarado no config manda sobre o inferido do nome', () => {
  it('um gate chamado `verificacao` com "papel": "testes" entra como testes', () => {
    const raiz = criarFixture([]);
    const cfg = JSON.parse(readFileSync(CONFIG_FIXTURE, 'utf8'));
    cfg.gates = [
      { nome: 'verificacao', cmd: 'npm test', tipo: 'exit_code', papel: 'testes' },
      { nome: 'compilacao', cmd: 'npm run build', tipo: 'exit_code', papel: 'build' },
    ];
    cfg._execucao_dos_gates = { ordem_obrigatoria: ['verificacao', 'compilacao'], interrupcao: 'NAO_VALE_PARCIALMENTE' };
    escrever(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
    const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
    escrever(join(rundir, 'gates.txt'), ['ok   verificacao   10ms', 'ok   compilacao    20ms', 'VEREDITO: APROVADO'].join('\n'));
    escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
    bashNoFixture(
      raiz,
      [
        'export EXECUTOR_SOURCED=1',
        `source "${EXECUTOR}"`,
        'set +e',
        "CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=1",
        `event_gate 901 "${rundir}" 1`,
      ].join('\n'),
    );
    const linha = ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
    // `verificacao` e `compilacao` não casam nome nenhum do CI nem do fixture:
    // sem o campo `papel` os dois sairiam como nao-configurado.
    expect(linha).toBe('901 GATE typecheck=nao-configurado testes=ok enforcement=ok criterios=1/1 build=ok');
  });
});

describe('papel `lint` só aparece na linha quando o repo tem gate de lint', () => {
  it('config sem gate de lint: a linha NÃO ganha campo novo', () => {
    expect(linhaGate(CONFIG_CI, readFileSync(GATES_201, 'utf8'))).not.toContain('lint=');
  });

  it('config COM gate de lint: a linha ganha lint=, depois de build=', () => {
    const raiz = criarFixture([]);
    const cfg = JSON.parse(readFileSync(CONFIG_FIXTURE, 'utf8'));
    cfg.gates = [
      { nome: 'typecheck', cmd: 'npm run typecheck', tipo: 'exit_code' },
      { nome: 'lint', cmd: 'npm run lint', tipo: 'exit_code' },
    ];
    cfg._execucao_dos_gates = { ordem_obrigatoria: ['typecheck', 'lint'], interrupcao: 'NAO_VALE_PARCIALMENTE' };
    escrever(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
    const rundir = join(raiz, 'docs', 'fila', 'runs', '901', 'attempt-0');
    escrever(join(rundir, 'gates.txt'), ['ok   typecheck   10ms', 'FALHA lint    20ms — 3 problemas', 'VEREDITO: REPROVADO'].join('\n'));
    escrever(join(rundir, 'enforcement.json'), JSON.stringify({ ok: true, violations: [] }));
    bashNoFixture(
      raiz,
      [
        'export EXECUTOR_SOURCED=1',
        `source "${EXECUTOR}"`,
        'set +e',
        "CRITERIOS_FALHOS=''; CRITERIOS_TOTAL=1",
        `event_gate 901 "${rundir}" 1`,
      ].join('\n'),
    );
    const linha = ler(EVENTS(raiz)).trim().replace(/^\S+\s+/, '');
    expect(linha).toBe(
      '901 GATE typecheck=ok testes=nao-configurado enforcement=ok criterios=1/1 build=nao-configurado lint=falha',
    );
  });
});
