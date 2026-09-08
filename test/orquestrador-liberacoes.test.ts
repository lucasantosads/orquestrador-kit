/**
 * Peça 1 — liberacoes.json × lib.sh:liberacao_ok.
 *
 * O bug (PLAYBOOK 2026-09-03): o arquivo, a doutrina e o lint do mapa usam
 * {"tokens": ["humano:<token>"]}; liberacao_ok consultava .liberadas[].token
 * com o token SEM o prefixo. Nenhum token liberado resolvia dependência, e o
 * ticket ficava pendente para sempre — em silêncio.
 *
 * Estes testes rodam contra um fixture FORA de git (ver fixtures/orq-harness):
 * nada aqui toca docs/fila do checkout.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { bashComLog, checkoutReal, criarFixture, liberacoes, REPO_ROOT } from './fixtures/orq-harness.js';

// Instanciado no TOPO, não dentro do caso: é aqui que o `afterAll` de remoção
// do harness tem a raiz da suíte para se registrar.
const FX = checkoutReal();

/** Ticket que só pode rodar se a liberação humana existir. */
const TICKET = { id: '900', slug: 'dep-humana', dependencias: ['humano:migration-0025'] };

function processavel(libConteudo: unknown) {
  const raiz = criarFixture([TICKET]);
  liberacoes(raiz, libConteudo);
  const r = bashComLog(
    raiz,
    [
      'f="$(proximo_pendente)"',
      'printf "PROCESSAVEL=%s\\n" "$([ -n "$f" ] && echo sim || echo nao)"',
    ].join('\n'),
  );
  return { processavel: /PROCESSAVEL=sim/.test(r.saida), saida: r.saida };
}

describe('liberacao_ok lê .tokens[] com o token INTEIRO', () => {
  it('token presente em .tokens => ticket PROCESSÁVEL', () => {
    const r = processavel({ tokens: ['humano:migration-0025', 'humano:migration-0026'] });
    expect(r.processavel).toBe(true);
  });

  it('token ausente => ticket NÃO processável, com o motivo no log', () => {
    const r = processavel({ tokens: ['humano:migration-0026'] });
    expect(r.processavel).toBe(false);
    expect(r.saida).toMatch(/dep pendente: humano:migration-0025/);
  });

  it('arquivo de liberações vazio => não processável', () => {
    expect(processavel({ tokens: [] }).processavel).toBe(false);
  });

  it('REGRESSÃO: token SEM o prefixo em .tokens não resolve (é outro token)', () => {
    // O formato canônico guarda o token inteiro. "migration-0025" solto não é
    // "humano:migration-0025": aceitar os dois faria colisão entre namespaces.
    expect(processavel({ tokens: ['migration-0025'] }).processavel).toBe(false);
  });
});

describe('formato antigo (.liberadas[].token) aceito por UMA versão, com aviso', () => {
  it('resolve a dependência', () => {
    const r = processavel({ liberadas: [{ token: 'migration-0025', por: 'humano' }] });
    expect(r.processavel).toBe(true);
  });

  it('grava AVISO nomeando o formato antigo e a migração', () => {
    const r = processavel({ liberadas: [{ token: 'migration-0025' }] });
    expect(r.saida).toMatch(/AVISO.*formato ANTIGO/);
    expect(r.saida).toMatch(/migre .*liberacoes\.json/);
  });

  it('formato antigo com outro token não resolve', () => {
    expect(processavel({ liberadas: [{ token: 'migration-0026' }] }).processavel).toBe(false);
  });
});

describe('lint do mapa confere que o HARNESS lê o formato canônico', () => {
  it('liberacao_ok consulta .tokens (é o que o check 10 do lint cobra)', () => {
    const libsh = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'lib.sh'), 'utf8');
    const corpo = /^liberacao_ok\(\)\s*\{([\s\S]*?)^\}/m.exec(libsh)?.[1] ?? '';
    expect(corpo).toContain('.tokens');
  });

  // O lint abre docs/roadmap/{mapa.json,MAPA.md}, docs/fila/000-config.json,
  // docs/fila/liberacoes.json e docs/fila/*.md do repo INSTALADO
  // (scripts/roadmap/lint-mapa.py:2-4,97,117) — por isso roda contra o fixture
  // instanciado, que é o único repo com todos eles. O check 10, o que interessa
  // aqui, lê `liberacao_ok` do lib.sh VENDORIZADO nesse mesmo repo.
  it('lint-mapa.py passa sem WARN sobre liberações', () => {
    const r = spawnSync('python3', ['scripts/roadmap/lint-mapa.py'], {
      encoding: 'utf8',
      cwd: FX,
    });
    expect(r.status, r.stdout).toBe(0);
    expect(r.stdout).not.toMatch(/WARN.*liberac/i);
  });
});

// "arquivo REAL": no kit é a cópia do liberacoes.json do conteudos-infinitos em
// test/fixtures/checkout/ — dado de verdade, não fabricado aqui. O kit não tem
// fila própria; ela é do repo instalado.
describe('o arquivo REAL do repo resolve as dependências que declara', () => {
  it('todo token de liberacoes.json está na forma canônica humano:<algo>', () => {
    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', 'liberacoes.json'), 'utf8'));
    expect(Array.isArray(lib.tokens)).toBe(true);
    for (const t of lib.tokens) expect(t).toMatch(/^humano:/);
  });

  it('cada token do arquivo real resolve via liberacao_ok', () => {
    const lib = JSON.parse(readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', 'liberacoes.json'), 'utf8'));
    const raiz = criarFixture([]);
    liberacoes(raiz, lib);
    for (const t of lib.tokens) {
      const r = bashComLog(raiz, `liberacao_ok "${t}" && echo OK || echo NAO`);
      expect(r.saida, `token ${t}`).toMatch(/\bOK\b/);
    }
  });
});
