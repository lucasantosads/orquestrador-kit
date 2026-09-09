/**
 * D11 — `push_suprimido` é INFORMATIVA, não interruptor.
 *
 * ORIGEM (só leitura, 2026-09-09): `~/orq-sessoes/revisao-adocao-actus.md`,
 * achado **V-4**. O plano de adoção do Actus escrevia `push_suprimido: true`
 * como se fosse a decisão 7 executada ("o loop não pusha"). Não é: a chave não
 * está em `config-chaves.ts`, nenhum script do motor a lê, e o config do CI a
 * tem em `false` sem que o loop de lá pushe. Ler um valor como garantia quando
 * ninguém o consulta é a forma mais cara de segurança: ela não falha, ela
 * simplesmente nunca esteve lá.
 *
 * A peça não toca no motor — não há o que consertar, o motor está certo. Ela
 * TRANCA a afirmação contra o disco, para que "é informativa" pare de ser uma
 * frase que alguém tem de reverificar por grep a cada leitura, e escreve no
 * CONTRATO e no template quem de fato impede o push.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { CHAVES_CONFIG } from '../scripts/orquestrador/config-chaves.js';
import { PISO_TOOLS_SEMENTE } from '../scripts/orquestrador/perfil.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const MOTOR = [
  'scripts/orq',
  'scripts/orquestrador/lib.sh',
  'scripts/orquestrador/local-loop.sh',
  'scripts/orquestrador/executor.sh',
  'scripts/orquestrador/enforcement.sh',
  'scripts/orquestrador/launchd-run.sh',
];

/**
 * `git push` em POSIÇÃO DE COMANDO — começo de linha ou logo depois de um
 * separador de comando. Um `git push` citado no meio de uma frase (o prompt do
 * executor proíbe o agente de dar um) não é uma chamada, e cobrar por substring
 * transformaria a própria proibição em violação.
 */
const INVOCA_PUSH = /(^[ \t]*|[;&|(][ \t]*|\$\([ \t]*)git[ \t]+(-C[ \t]+\S+[ \t]+)?push\b/m;

function fonte(rel: string): string {
  return readFileSync(join(REPO_ROOT, rel), 'utf8');
}

/** Só as linhas de CÓDIGO: comentário PODE (e deve) citar a chave. */
function codigo(rel: string): string {
  return fonte(rel)
    .split('\n')
    .filter((l) => !/^\s*(#|\/\/|\*)/.test(l))
    .join('\n');
}

describe('ninguém no motor LÊ push_suprimido', () => {
  it('a chave não está em config-chaves.ts, nem obrigatória nem opcional', () => {
    expect(CHAVES_CONFIG.map((c) => c.chave)).not.toContain('push_suprimido');
  });

  it('nenhum script do motor a consulta em código', () => {
    for (const rel of MOTOR) expect(codigo(rel), rel).not.toContain('push_suprimido');
  });

  it('nenhum .ts do motor a acessa', () => {
    const ts = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'config-chaves.ts'), 'utf8');
    expect(ts).not.toContain('push_suprimido');
  });

  it('`staging_linha` afirma a supressão SEMPRE — não é derivada do config', () => {
    const fn = /staging_linha\(\) \{[\s\S]*?\n\}/.exec(fonte('scripts/orquestrador/lib.sh'))![0];
    expect(fn).toContain('push suprimido (publicar é humano neste repo)');
    expect(fn).not.toContain('cfg ');
    // Sem `if`: não há caminho em que o snapshot diga outra coisa.
    expect(fn).not.toMatch(/\bif\b/);
  });

  it('o motor não INVOCA `git push` — a supressão é construção, não config', () => {
    // `git push` em POSIÇÃO DE COMANDO: começo de linha, ou depois de um
    // separador. A prosa não conta, e ela existe — o prompt do executor diz
    // "NUNCA dê git push" ao agente (executor.sh:374), que é a proibição
    // funcionando e não uma chamada.
    for (const rel of MOTOR) expect(codigo(rel), rel).not.toMatch(INVOCA_PUSH);
  });

  it('e o grep NÃO é sempre-verdadeiro: as formas reais de invocar casam', () => {
    for (const linha of [
      'git push origin main',
      '  git push --force',
      'git -C "$ROOT" push origin staging-auto',
      'branch_existe x && git push origin x',
      'sha="$(git push --dry-run)"',
    ]) {
      expect(linha, linha).toMatch(INVOCA_PUSH);
    }
    // E a prosa do prompt, que é a proibição e não uma chamada, NÃO casa.
    expect('- NUNCA dê git push. NUNCA escreva credencial/segredo.').not.toMatch(INVOCA_PUSH);
  });
});

describe('quem IMPEDE o push são o piso de tools e a branch protegida', () => {
  it('o piso-semente do kit traz `Bash(git push:*)`', () => {
    expect(PISO_TOOLS_SEMENTE).toContain('Bash(git push:*)');
  });

  it('o template do config traz o mesmo piso', () => {
    const cfg = JSON.parse(fonte('doutrina/templates/config.json')) as {
      proibicoes_absolutas: { tools: string[] };
    };
    expect(cfg.proibicoes_absolutas.tools).toContain('Bash(git push:*)');
  });

  it('`merge_em_alvo` recusa a branch protegida — como alvo E como HEAD da worktree', () => {
    const fn = /merge_em_alvo\(\) \{[\s\S]*?\n\}/.exec(fonte('scripts/orquestrador/local-loop.sh'))![0];
    expect(fn).toContain('"$BRANCH_ALVO" = "$BRANCH_PROTEGIDA"');
    expect(fn).toContain('"$alvo_atual" = "$BRANCH_PROTEGIDA"');
    expect((fn.match(/merge recusado/g) ?? []).length).toBe(2);
  });
});

describe('a chave está documentada como informativa, nos três lugares', () => {
  it('o template diz que NÃO é interruptor, e diz quem impede', () => {
    const bruto = fonte('doutrina/templates/config.json');
    const cfg = JSON.parse(bruto) as Record<string, unknown>;
    // O valor continua lá: a decisão vale a pena registrar.
    expect(cfg.push_suprimido).toBe(false);
    const nota = String(cfg._push_suprimido ?? '');
    expect(nota).toMatch(/não é interruptor/i);
    expect(nota).toContain('Bash(git push:*)');
    expect(nota).toContain('branch_protegida');
    // O comentário fica IMEDIATAMENTE antes da chave: um `_x` longe do `x` é um
    // comentário que ninguém lê no momento em que decide o valor.
    expect(bruto.indexOf('"_push_suprimido"')).toBeLessThan(bruto.indexOf('"push_suprimido"'));
  });

  it('CONTRATO.md §8 registra a afirmação e as duas travas de verdade', () => {
    const c = fonte('CONTRATO.md');
    expect(c).toMatch(/`push_suprimido` é INFORMATIVA/);
    expect(c).toContain('`Bash(git push:*)`');
    expect(c).toContain('`branch_protegida`');
    expect(c).toContain('lib.sh:staging_linha');
  });

  it('a tabela de kill switches da doutrina não a lista mais como um', () => {
    const doc = fonte('doutrina/references/autoalimentacao.md');
    const linha = doc.split('\n').find((l) => l.includes('push_suprimido'))!;
    expect(linha).toMatch(/NÃO é kill switch/);
    expect(linha).toContain('CONTRATO.md');
  });
});

describe('o CI é a prova de que o valor não faz diferença', () => {
  it('o config do CI tem push_suprimido: false — e o loop de lá não pusha', () => {
    const ci = JSON.parse(fonte('_referencia-ci/000-config.ci.json')) as Record<string, unknown>;
    expect(ci.push_suprimido).toBe(false);
    // Se a chave fosse interruptor, `false` significaria "pushe". O motor
    // vendorizado é o mesmo deste kit, e ele não tem um `git push`.
    expect(codigo('scripts/orquestrador/local-loop.sh')).not.toMatch(INVOCA_PUSH);
  });

  it('o fixture do kit tem `true` e o comportamento é idêntico', () => {
    const fx = JSON.parse(fonte('fixture/docs/fila/000-config.json')) as Record<string, unknown>;
    expect(fx.push_suprimido).toBe(true);
    // Dois repos, dois valores, um comportamento: é exatamente isto que faz da
    // chave um registro e não um gate.
    const ci = JSON.parse(fonte('_referencia-ci/000-config.ci.json')) as Record<string, unknown>;
    expect(fx.push_suprimido).not.toBe(ci.push_suprimido);
  });
});
