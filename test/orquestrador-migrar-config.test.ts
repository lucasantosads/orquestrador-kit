/**
 * Peça K8b-4 — `000-config.json` schema 1 → 2, por tabela explícita.
 *
 * A tabela (`config-tabela.ts`) foi escrita à mão a partir do PASSO 0 da etapa
 * 5: `jq` nos configs reais do Actus e do Comarka (só leitura) confrontado com
 * `config-chaves.ts`, que é a lista do que o motor EFETIVAMENTE lê. Este teste
 * roda a tabela contra esses mesmos configs reais, copiados para tmp.
 *
 * As três afirmações que ele existe para provar:
 *
 *   1. NADA é apagado. Renome COPIA (o nome antigo fica), chave desconhecida
 *      atravessa intacta, `_` de documentação não se move.
 *   2. NADA é inventado. Decisão local vira PLACEHOLDER, e `orq config` recusa.
 *   3. O CI não muda. A linha `GATE` da trilha sai caractere a caractere igual
 *      à de hoje, com o config migrado.
 */
import { describe, it, expect } from 'vitest';
import { copyFileSync, existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { propor, ler as lerCaminho, migrarArquivo, NOME_PROPOSTO } from '../scripts/orquestrador/migrar-config.js';
import { NOVAS, PROPRIAS_DE_REPO, RENOMES } from '../scripts/orquestrador/config-tabela.js';
import { CHAVES_OBRIGATORIAS } from '../scripts/orquestrador/config-chaves.js';
import { bashNoFixture, criarFixture, escrever, ler as lerArquivo, REPO_ROOT } from './fixtures/orq-harness.js';

const CONFIG_CI = join(REPO_ROOT, '_referencia-ci', '000-config.ci.json');
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
const GATES_201 = join(REPO_ROOT, 'test', 'fixtures', 'runs-201', 'attempt-2.gates.txt');

/**
 * Os configs REAIS, lidos do disco dos outros repos. SÓ LEITURA: nada aqui
 * escreve neles — cada caso copia para um `mkdtemp` antes de qualquer coisa.
 *
 * Se um dos repos não estiver nesta máquina, o caso é PULADO com aviso, nunca
 * falso-verde: um teste que passa porque não achou o arquivo é pior que nenhum.
 */
const REPOS: Array<{ nome: string; caminho: string }> = [
  { nome: 'actus-saas', caminho: join(process.env.HOME ?? '', 'Projetos', 'actus-saas', 'docs', 'fila', '000-config.json') },
  { nome: 'comarka-operacional', caminho: join(process.env.HOME ?? '', 'Projetos', 'comarka-operacional', 'docs', 'fila', '000-config.json') },
];

function copiaReal(caminho: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-cfg-'));
  const alvo = join(dir, '000-config.json');
  copyFileSync(caminho, alvo);
  return alvo;
}

function lerJson(p: string): unknown {
  return JSON.parse(readFileSync(p, 'utf8'));
}

// ─── a tabela em si ─────────────────────────────────────────────────────────
describe('config-tabela: a tabela é explícita e coerente com o motor', () => {
  it('toda chave `para` de um renome é lida pelo motor (config-chaves.ts)', () => {
    const lidas = new Set(CHAVES_OBRIGATORIAS.map((c) => c.chave));
    for (const r of RENOMES) {
      expect(lidas.has(r.para), `${r.para} não está em config-chaves.ts — renomear para chave que ninguém lê é mover dado para o vazio`).toBe(true);
    }
  });

  it('toda chave nova é lida pelo motor', () => {
    const lidas = new Set(CHAVES_OBRIGATORIAS.map((c) => c.chave));
    for (const n of NOVAS) {
      expect(lidas.has(n.chave), `${n.chave} não está em config-chaves.ts`).toBe(true);
    }
  });

  // Não é métrica de prosa: é o piso que separa "porque sim" de uma razão. Onde
  // o `porque` é curto ele é uma referência cruzada ("lib.sh:914; mesmo motivo
  // do teto em USD"), que é razão suficiente porque aponta para a longa.
  it('toda entrada da tabela diz POR QUÊ', () => {
    for (const e of [...RENOMES, ...NOVAS, ...PROPRIAS_DE_REPO]) {
      expect(e.porque.length, JSON.stringify(e).slice(0, 80)).toBeGreaterThan(30);
    }
  });

  // Só para RENOMES e NOVAS: as duas movem ou criam chave que o MOTOR lê, então
  // a razão tem de apontar para a linha que lê. `PROPRIAS_DE_REPO` é o oposto —
  // são chaves que o motor NÃO lê, e cobrar delas um arquivo:linha do motor
  // seria cobrar a citação de um trecho que não existe.
  it('todo renome e toda chave nova citam a linha do motor que a lê', () => {
    for (const e of [...RENOMES, ...NOVAS]) {
      expect(e.porque, JSON.stringify(e).slice(0, 80)).toMatch(/\.(ts|sh):\d+|CONTRATO\.md/);
    }
  });

  it('nenhuma chave nova de procedência `politica` traz placeholder disfarçado', () => {
    for (const n of NOVAS.filter((x) => x.procedencia === 'politica')) {
      expect(JSON.stringify(n.valor), n.chave).not.toMatch(/"<[^"]*>"/);
    }
  });
});

// ─── 1. nada é apagado ──────────────────────────────────────────────────────
describe('a migração não apaga nada', () => {
  it('renome COPIA: o nome antigo continua no proposto', () => {
    const { proposto } = propor({
      $schema_versao: 1,
      supabase_project_id: 'abc123',
      avaliador_model: 'opus',
      gates: [],
    });
    const o = JSON.parse(proposto);
    expect(o.supabase_project_id).toBe('abc123');
    expect(o.ambiente_id).toBe('abc123');
    expect(o.avaliador_model).toBe('opus');
    expect(o.modelos.juiz_alto).toBe('opus');
  });

  it('valor já existente no destino NÃO é sobrescrito, e a decisão é relatada', () => {
    const r = propor({
      $schema_versao: 1,
      supabase_project_id: 'do-nome-velho',
      ambiente_id: 'do-nome-novo',
      gates: [],
    });
    expect(JSON.parse(r.proposto).ambiente_id).toBe('do-nome-novo');
    expect(r.linhas.join('\n')).toMatch(/NÃO aplicado, 'ambiente_id' já existe/);
  });

  it('chave desconhecida atravessa intacta', () => {
    const { proposto } = propor({ $schema_versao: 1, gates: [], invencao_de_alguem: { a: [1, 2] } });
    expect(JSON.parse(proposto).invencao_de_alguem).toEqual({ a: [1, 2] });
  });

  it('nunca remove `_` de documentação', () => {
    const doc = 'este texto explica uma decisão e não pode sumir';
    const { proposto } = propor({ $schema_versao: 1, gates: [], _cooldown: doc, _modelos: doc });
    const o = JSON.parse(proposto);
    expect(o._cooldown).toBe(doc);
    expect(o._modelos).toBe(doc);
  });

  for (const { nome, caminho } of REPOS) {
    it(`${nome}: TODA chave do config real sobrevive no proposto`, () => {
      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho} não existe nesta máquina`);
      const original = lerJson(caminho) as Record<string, unknown>;
      const { proposto } = propor(original);
      const o = JSON.parse(proposto);
      for (const k of Object.keys(original)) {
        expect(o, `sumiu a chave de raiz '${k}'`).toHaveProperty(k);
      }
      // E o valor, não só a chave: `$schema_versao` é a ÚNICA que muda.
      for (const k of Object.keys(original)) {
        if (k === '$schema_versao') continue;
        // `gates` muda o `tipo` de um gate no Comarka — é o único valor que a
        // tabela reescreve, e o caso próprio abaixo o cobre.
        if (k === 'gates') continue;
        expect(o[k], `mudou o valor de '${k}'`).toEqual(original[k]);
      }
    });

    it(`${nome}: o arquivo no disco do repo NÃO é tocado`, () => {
      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
      const antes = readFileSync(caminho);
      const copia = copiaReal(caminho);
      migrarArquivo(copia, 'propor');
      expect(readFileSync(caminho).equals(antes)).toBe(true);
    });
  }
});

// ─── 2. nada é inventado ────────────────────────────────────────────────────
describe('a migração não inventa decisão local', () => {
  it('decisão local vira PLACEHOLDER, e `orq config` a recusa', () => {
    const r = propor({ $schema_versao: 1, gates: [] });
    expect(r.placeholders).toContain('launchd.label');
    expect(r.placeholders).toContain('orcamento.usd_dia');
    for (const p of r.placeholders) {
      const v = lerCaminho(JSON.parse(r.proposto), p);
      const texto = Array.isArray(v) ? String(v[0]) : String(v);
      expect(texto.startsWith('<') && texto.endsWith('>'), `${p} = ${texto}`).toBe(true);
    }
  });

  it('política do motor vem PREENCHIDA — não é decisão do repo', () => {
    const o = JSON.parse(propor({ $schema_versao: 1, gates: [] }).proposto);
    expect(o.politica_adiamento.causas_que_adiam).toHaveLength(7);
    expect(o._execucao_dos_gates.interrupcao).toBe('NAO_VALE_PARCIALMENTE');
    expect(o.executor.trailer_commit).toBe('Orq-Ticket');
  });

  it('a ordem obrigatória é DERIVADA dos gates, na ordem do arquivo', () => {
    const o = JSON.parse(
      propor({
        $schema_versao: 1,
        gates: [{ nome: 'limpeza' }, { nome: 'tsc' }, { nome: 'vitest' }],
      }).proposto,
    );
    expect(o._execucao_dos_gates.ordem_obrigatoria).toEqual(['limpeza', 'tsc', 'vitest']);
  });

  it('chave obrigatória que a tabela NÃO cobre é relatada, nunca preenchida', () => {
    // O Comarka não tem `zona_proibida` (a fronteira dele se chama
    // `c0_intocavel`, e a tabela deliberadamente NÃO a renomeia).
    const r = propor({ $schema_versao: 1, gates: [], c0_intocavel: { no_write_tables: ['x'] } });
    expect(JSON.parse(r.proposto).zona_proibida).toBeUndefined();
    expect(r.linhas.join('\n')).toMatch(/AINDA AUSENTE, e a tabela não cobre: zona_proibida/);
  });

  it('c0_intocavel fica INTOCADA e vira item nomeado do relatório (para a K11)', () => {
    const c0 = { no_write_tables: ['clientes_receita'], no_write_prefixes: ['trafego_'] };
    const r = propor({ $schema_versao: 1, gates: [], c0_intocavel: c0 });
    expect(JSON.parse(r.proposto).c0_intocavel).toEqual(c0);
    expect(r.linhas.join('\n')).toMatch(/MANTIDA \(própria do comarka-operacional, para a K11 decidir\): c0_intocavel/);
  });

  for (const chave of ['gate_streak_limite', 'perfis_tools', 'migrations_faixa_loop', 'writeback_notion']) {
    it(`${chave} fica e vira item nomeado do relatório`, () => {
      const r = propor({ $schema_versao: 1, gates: [], [chave]: 'valor-do-repo' });
      expect(JSON.parse(r.proposto)[chave]).toBe('valor-do-repo');
      expect(r.linhas.join('\n')).toMatch(new RegExp(`MANTIDA .*: ${chave} —`));
    });
  }
});

// ─── gates ──────────────────────────────────────────────────────────────────
describe('gates: o vocabulário de `tipo`', () => {
  it("Comarka: `tsc_baseline` vira `baseline`, e o `baseline: 3` chega junto", () => {
    const o = JSON.parse(
      propor({
        $schema_versao: 1,
        gates: [{ nome: 'tsc', cmd: 'npx tsc --noEmit', tipo: 'tsc_baseline', baseline: 3, baseline_scope_regex: 'qualificacao' }],
      }).proposto,
    );
    expect(o.gates[0].tipo).toBe('baseline');
    expect(o.gates[0].baseline).toBe(3);
    expect(o.gates[0].baseline_scope_regex).toBe('qualificacao');
  });

  it('`exit_code` e `preparacao` não são tocados', () => {
    const gates = [{ nome: 'build', tipo: 'exit_code' }, { nome: 'limpeza', tipo: 'preparacao' }];
    const o = JSON.parse(propor({ $schema_versao: 1, gates }).proposto);
    expect(o.gates).toEqual(gates);
  });

  it('o papel de todo gate real dos dois repos é INFERÍVEL — nada a declarar', () => {
    // `papel_do_gate` (executor.sh) infere: *typecheck*/*tsc*/*types* → typecheck,
    // *lint* → lint, *build*/*compil* → build, *test*/*spec* → testes. Os gates
    // reais são typecheck/testes/build (Actus) e tsc/vitest/build (Comarka).
    for (const { nome, caminho } of REPOS) {
      if (!existsSync(caminho)) continue;
      const cfg = lerJson(caminho) as { gates: Array<{ nome: string }> };
      for (const g of cfg.gates) {
        expect(/typecheck|tsc|types|lint|build|compil|test|spec/.test(g.nome), `${nome}: gate '${g.nome}' sem papel inferível`).toBe(true);
      }
    }
  });
});

// ─── 3. o que o CI faz diferente: NADA ──────────────────────────────────────
describe('o CI: o config migrado produz a MESMA linha GATE', () => {
  /** Igual ao helper de orquestrador-trilha-gate-papel.test.ts, de propósito. */
  function linhaGate(configJson: string, gatesTxt: string, total = 3): string {
    const raiz = criarFixture([{ id: '901', slug: 'b', status: 'pendente' }]);
    escrever(join(raiz, 'docs', 'fila', '000-config.json'), configJson);
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
    return lerArquivo(join(raiz, 'docs', 'fila', 'runs', 'events.log')).trim().replace(/^\S+\s+/, '');
  }

  const ESPERADA = '901 GATE typecheck=ok testes=falha enforcement=ok criterios=3/3 build=nao-rodou';

  it('antes da migração, a linha é a de hoje (é a medida de referência)', () => {
    expect(linhaGate(readFileSync(CONFIG_CI, 'utf8'), readFileSync(GATES_201, 'utf8'))).toBe(ESPERADA);
  });

  it('DEPOIS da migração, é caractere a caractere a MESMA linha', () => {
    const { proposto } = propor(lerJson(CONFIG_CI));
    expect(linhaGate(proposto, readFileSync(GATES_201, 'utf8'))).toBe(ESPERADA);
  });

  it('`gates` e `_execucao_dos_gates` do CI atravessam sem UM byte de diferença', () => {
    const original = lerJson(CONFIG_CI) as Record<string, unknown>;
    const o = JSON.parse(propor(original).proposto);
    expect(o.gates).toEqual(original.gates);
    expect(o._execucao_dos_gates).toEqual(original._execucao_dos_gates);
  });

  it('no CI a migração só acrescenta `launchd.label` (que a K6c tornou obrigatório)', () => {
    const original = lerJson(CONFIG_CI) as Record<string, unknown>;
    const r = propor(original);
    const o = JSON.parse(r.proposto);
    const novas = Object.keys(o).filter((k) => !(k in original));
    expect(novas).toEqual(['launchd']);
    expect(r.placeholders).toEqual(['launchd.label']);
  });
});

// ─── o proposto, no disco ───────────────────────────────────────────────────
describe('o proposto é um ARQUIVO AO LADO; o oficial nunca é sobrescrito', () => {
  function repoDeConfig(origem: string): string {
    const dir = mkdtempSync(join(tmpdir(), 'orq-cfg-'));
    const alvo = join(dir, '000-config.json');
    copyFileSync(origem, alvo);
    return alvo;
  }

  it('--dry-run não escreve nem o proposto', () => {
    const p = repoDeConfig(CONFIG_CI);
    const antes = readFileSync(p, 'utf8');
    migrarArquivo(p, 'dry-run');
    expect(readFileSync(p, 'utf8')).toBe(antes);
    expect(existsSync(join(join(p, '..'), NOME_PROPOSTO))).toBe(false);
  });

  it('--propor grava 000-config.proposto.json e NÃO toca o oficial', () => {
    const p = repoDeConfig(CONFIG_CI);
    const antes = readFileSync(p, 'utf8');
    migrarArquivo(p, 'propor');
    expect(readFileSync(p, 'utf8')).toBe(antes);
    const proposto = join(join(p, '..'), NOME_PROPOSTO);
    expect(existsSync(proposto)).toBe(true);
    expect(JSON.parse(readFileSync(proposto, 'utf8')).$schema_versao).toBe(2);
  });

  it('--aplicar sem proposto RECUSA, em vez de recalcular', () => {
    const p = repoDeConfig(CONFIG_CI);
    expect(() => migrarArquivo(p, 'aplicar')).toThrow(/Rode com --propor primeiro/);
  });

  it('--aplicar move o proposto QUE FOI REVISADO, não um recalculado', () => {
    const p = repoDeConfig(CONFIG_CI);
    migrarArquivo(p, 'propor');
    const proposto = join(join(p, '..'), NOME_PROPOSTO);
    // A pessoa preencheu o placeholder à mão — é o passo humano inteiro.
    const revisado = JSON.parse(readFileSync(proposto, 'utf8'));
    revisado.launchd.label = 'com.conteudos.orquestrador';
    revisado.marca_de_revisao_humana = true;
    writeFileSync(proposto, `${JSON.stringify(revisado, null, 2)}\n`);
    const antes = readFileSync(p, 'utf8');

    migrarArquivo(p, 'aplicar');
    const agora = JSON.parse(readFileSync(p, 'utf8'));
    expect(agora.marca_de_revisao_humana).toBe(true);
    expect(agora.launchd.label).toBe('com.conteudos.orquestrador');
    expect(existsSync(proposto)).toBe(false);
    expect(readFileSync(`${p}.bak`, 'utf8')).toBe(antes);
  });

  it('o relatório do --dry-run traz o veredito do `orq config` sobre o PROPOSTO', () => {
    const p = repoDeConfig(CONFIG_CI);
    const saida = migrarArquivo(p, 'dry-run').linhas.join('\n');
    expect(saida).toMatch(/orq config sobre o PROPOSTO \(rc 1\)/);
    expect(saida).toMatch(/launchd\.label: placeholder não preenchido/);
    expect(saida).toMatch(/decisão\(ões\) local\(is\) esperando alguém/);
  });
});

// ─── os dois configs reais, ponta a ponta ───────────────────────────────────
describe('os dois configs reais: quanto o proposto melhora, e o que sobra', () => {
  for (const { nome, caminho } of REPOS) {
    it(`${nome}: o proposto tem MENOS violações que o original, e o resto é decisão local`, () => {
      if (!existsSync(caminho)) return void console.warn(`PULADO: ${caminho}`);
      const p = copiaReal(caminho);
      const r = migrarArquivo(p, 'dry-run');
      const saida = r.linhas.join('\n');
      // Toda violação que sobra é placeholder (decisão local) ou chave que a
      // tabela declara não cobrir. Nenhuma é surpresa silenciosa.
      const violacoes = /(\d+) violação\(ões\)/.exec(saida);
      expect(violacoes, 'o relatório tem de trazer o veredito do orq config').toBeTruthy();
      expect(saida).toMatch(/decisão\(ões\) local\(is\) esperando alguém/);
      // O NEGATIVO que importa: nenhuma chave obrigatória sumiu do relatório em
      // silêncio — ou ela foi preenchida, ou está listada.
      const proposto = JSON.parse(r.proposto);
      for (const c of CHAVES_OBRIGATORIAS.map((x) => x.chave)) {
        const presente = lerCaminho(proposto, c) !== undefined && lerCaminho(proposto, c) !== null;
        const relatada = saida.includes(`AINDA AUSENTE, e a tabela não cobre: ${c}`);
        expect(presente || relatada, `${c}: nem preenchida nem relatada`).toBe(true);
      }
    });
  }
});
