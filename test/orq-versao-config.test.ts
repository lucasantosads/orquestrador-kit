/**
 * `orq versao` e `orq config` — os dois verbos de leitura que faltavam.
 *
 * `orq versao` responde "que motor está instalado aqui?" sem abrir arquivo. O
 * carimbo é `docs/orquestrador/skill/VERSAO`, escrito pelo `instalar.sh
 * --atualizar`; um repo vendorizado antes do carimbo existir não está errado —
 * está sem carimbo, e é isso que ele diz.
 *
 * `orq config` responde "este config está preenchido?". O modo de falha que ele
 * existe para pegar é o config recém-copiado do template: `<ex: ...>` em toda
 * parte, jq lendo a string literal `<ex: supabase/migrations>` como se fosse
 * caminho, e o run morrendo depois — longe da causa. Formulário em branco não é
 * config.
 *
 * Os dois são READ-ONLY, como todo o resto do `orq` fora de pausar/retomar.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { criarFixture, orq, REPO_ROOT } from './fixtures/orq-harness.js';

/**
 * O config LIMPO é o do template de repo (`fixture/docs/fila/000-config.json`),
 * e não o que o `criarFixture` semeia. Não é detalhe: o `criarFixture` semeia o
 * config do checkout onde ele roda, que dentro do kit é
 * `test/fixtures/checkout/` — uma cópia do config REAL do conteudos-infinitos,
 * e esse tem uma violação de verdade (`launchd.label` ausente, a chave que a
 * peça K6c tornou obrigatória). Um teste de "config limpo" contra ele passaria
 * a exigir que o validador ficasse cego para o achado.
 */
function comConfigLimpo(raiz: string): void {
  writeFileSync(
    join(raiz, 'docs', 'fila', '000-config.json'),
    readFileSync(join(REPO_ROOT, 'fixture', 'docs', 'fila', '000-config.json'), 'utf8'),
  );
}

/** Config do fixture, mexido por `patch`, gravado de volta. */
function comConfig(raiz: string, patch: (c: Record<string, unknown>) => void): void {
  const p = join(raiz, 'docs', 'fila', '000-config.json');
  const c = JSON.parse(readFileSync(p, 'utf8'));
  patch(c);
  writeFileSync(p, JSON.stringify(c, null, 2));
}

describe('orq versao', () => {
  it('sem carimbo: diz "repo sem VERSAO" e sai 0 (não é erro, é ausência)', () => {
    const fx = criarFixture([]);
    const r = orq(fx, 'versao');
    expect(r.rc, r.err).toBe(0);
    expect(`${r.out}${r.err}`).toContain('repo sem VERSAO');
  });

  it('com carimbo: imprime a versão que está no docs/orquestrador/skill/VERSAO', () => {
    const fx = criarFixture([]);
    mkdirSync(join(fx, 'docs', 'orquestrador', 'skill'), { recursive: true });
    writeFileSync(join(fx, 'docs', 'orquestrador', 'skill', 'VERSAO'), '9.9.9-carimbo\n');
    const r = orq(fx, 'versao');
    expect(r.rc, r.err).toBe(0);
    expect(r.out).toContain('9.9.9-carimbo');
  });

  it('com ORQ_KIT apontando para um kit, COMPARA e diz que difere', () => {
    const fx = criarFixture([]);
    mkdirSync(join(fx, 'docs', 'orquestrador', 'skill'), { recursive: true });
    writeFileSync(join(fx, 'docs', 'orquestrador', 'skill', 'VERSAO'), '9.9.9-carimbo\n');
    const r = orq(fx, 'versao', '--kit', REPO_ROOT);
    expect(r.rc, r.err).toBe(0);
    const saida = `${r.out}${r.err}`;
    expect(saida).toContain(readFileSync(join(REPO_ROOT, 'VERSAO'), 'utf8').trim());
    // Divergir NÃO é erro: `orq` é read-only e não instala nada. Ele informa, e
    // quem decide atualizar é quem roda o instalar.sh.
    expect(saida).toMatch(/difere|desatualizad/i);
  });

  it('ORQ_KIT que não é kit: avisa e não finge que comparou', () => {
    const fx = criarFixture([]);
    const r = orq(fx, 'versao', '--kit', join(fx, 'docs'));
    expect(r.rc, r.err).toBe(0);
    expect(`${r.out}${r.err}`).toMatch(/não parece um kit|nao parece um kit/);
  });
});

describe('orq config', () => {
  it('config do fixture (limpo): rc 0 e diz que está preenchido', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    const r = orq(fx, 'config');
    expect(r.rc, `${r.out}${r.err}`).toBe(0);
    expect(`${r.out}${r.err}`).toMatch(/0 violaç|sem violaç/i);
  });

  it('placeholder <...> em qualquer valor: rc 1 e a mensagem NOMEIA a chave', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.migrations_dir = '<ex: supabase/migrations | db/migrations>';
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toContain('migrations_dir');
    expect(`${r.out}${r.err}`).toMatch(/placeholder/i);
  });

  it('placeholder DENTRO de lista também é pego', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.preflight_env_keys = ['<ENV_OBRIGATORIA_1>'];
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toContain('preflight_env_keys[0]');
  });

  it('prosa que MENCIONA <ASSIM> não é placeholder (o valor tem de SER um)', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.descricao = 'Config v2. Placeholders <ASSIM> são decisões locais: preencha antes do primeiro run.';
    });
    const r = orq(fx, 'config');
    expect(r.rc, `${r.out}${r.err}`).toBe(0);
  });

  it('chave obrigatória ausente: rc 1, e a mensagem diz de ONDE ela é lida', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      delete c.branch_alvo;
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    const saida = `${r.out}${r.err}`;
    expect(saida).toContain('branch_alvo');
    // "está faltando" sem dizer quem lê a chave manda a pessoa grepar o motor.
    expect(saida).toContain('lib.sh:52');
  });

  it('launchd.label ausente: rc 1 (é a chave que não pode ter default)', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      delete (c.launchd as Record<string, unknown>).label;
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toContain('launchd.label');
  });

  it('gate sem papel inferível e sem "papel" declarado: rc 1 e a mensagem diz o nome', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.gates = [{ nome: 'verificacao', cmd: 'npm run verificacao', tipo: 'exit_code' }];
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    const saida = `${r.out}${r.err}`;
    expect(saida).toContain('verificacao');
    expect(saida).toMatch(/papel/);
  });

  it('o MESMO gate com "papel" declarado passa', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.gates = [{ nome: 'verificacao', cmd: 'npm run verificacao', tipo: 'exit_code', papel: 'testes' }];
      (c as Record<string, unknown>)._execucao_dos_gates = { ordem_obrigatoria: ['verificacao'], interrupcao: 'NAO_VALE_PARCIALMENTE' };
    });
    const r = orq(fx, 'config');
    expect(r.rc, `${r.out}${r.err}`).toBe(0);
  });

  it('gate sem "nome": rc 1 e diz o índice', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    comConfig(fx, (c) => {
      c.gates = [{ cmd: 'npm test', tipo: 'exit_code', papel: 'testes' }];
    });
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toContain('gates[0]');
  });

  it('config ilegível: rc 1, e não finge que leu', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), '{ nao é json');
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toMatch(/ilegív|ilegiv|não é JSON|nao e JSON/i);
  });

  it('config real e ANTIGO (snapshot @711ab5e): acusa launchd.label ausente', () => {
    // `test/fixtures/checkout/` é a cópia CONGELADA do
    // docs/fila/000-config.json do conteudos-infinitos em @711ab5e — de antes
    // de a peça K6c tornar `launchd.label` obrigatório. Serve de caso real de
    // "config de um repo que ainda não migrou", que é o cenário para o qual
    // este validador existe.
    //
    // O CI DE HOJE já tem a chave (`launchd.label: com.conteudos.orquestrador`)
    // e `orq config` contra ele sai 0, medido nesta sessão. Este caso não
    // afirma nada sobre o CI atual: ele trava o COMPORTAMENTO do validador
    // diante de um config pré-K6c.
    const fx = criarFixture([]);
    writeFileSync(
      join(fx, 'docs', 'fila', '000-config.json'),
      readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'checkout', 'docs', 'fila', '000-config.json'), 'utf8'),
    );
    const r = orq(fx, 'config');
    expect(r.rc).toBe(1);
    expect(`${r.out}${r.err}`).toContain('launchd.label');
    // E o gate `limpeza_artefatos` (tipo: preparacao) NÃO é acusado: gate que
    // não verifica nada não tem papel na linha GATE, por desenho.
    expect(`${r.out}${r.err}`).not.toContain('limpeza_artefatos');
  });

  it('READ-ONLY: nem versao nem config escrevem no repo', () => {
    const fx = criarFixture([]);
    comConfigLimpo(fx);
    const p = join(fx, 'docs', 'fila', '000-config.json');
    const antes = readFileSync(p, 'utf8');
    orq(fx, 'versao');
    orq(fx, 'config');
    expect(readFileSync(p, 'utf8')).toBe(antes);
    // E não criam runs/: consulta não é execução.
    let existe = true;
    try {
      readFileSync(join(fx, 'docs', 'fila', 'runs', 'events.log'), 'utf8');
    } catch {
      existe = false;
    }
    expect(existe, 'orq versao/config escreveu na trilha').toBe(false);
    rmSync(fx, { recursive: true, force: true });
  });
});
