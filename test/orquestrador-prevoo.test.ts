/**
 * K11a-2 — o pré-voo ⚡ da drenagem.
 *
 * ORIGEM (só leitura, 2026-09-08):
 * `~/Projetos/actus-saas/scripts/orquestrador/pre-voo.test.mjs`. Cada `it(...)`
 * carrega o NOME ORIGINAL do `test(...)` de lá, um a um, para que a
 * correspondência seja verificável por grep. Os casos de `drenar()` do Actus
 * (que exercitam o loop em Node) viram aqui casos sobre o `local-loop.sh`, que
 * é o driver deste kit.
 *
 * A cat.3 do Actus (`claude -p "responda apenas OK"`) NÃO virou chamada: os
 * casos de `motivoFalhaAutenticacaoClaude` migraram para a peça K11a-3, em
 * `decisao.ts`, onde a MESMA lista de padrões decide adiar em vez de reprovar.
 * O que sobra aqui é a leitura do resultado da última sondagem em `runs/`.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  ARQUIVOS_SPEC,
  MINIMO_COMMITADOS,
  TIMEOUT_PRE_VOO_MS,
  checarEstruturaFila,
  checarIdentidade,
  checarSpecVendorizada,
  checarUltimaSondagem,
  diasEntre,
  preVooDepsReais,
  preVooRelampago,
  render,
  ultimaSondagemDe,
} from '../scripts/orquestrador/prevoo.js';
import type { PreVooDeps } from '../scripts/orquestrador/prevoo.js';
import { REPO_ROOT } from './fixtures/orq-harness.js';

const CONFIG = {
  repo_origin_deve_conter: 'actus-saas',
  ambiente_id: 'fqwhpcusmkmvtgyofuwh',
};

function depsVerdes(over: Partial<PreVooDeps> = {}): PreVooDeps {
  return {
    arquivoComConteudo: () => true,
    contarArquivosCommitados: () => 6,
    lerOrigin: () => 'git@github.com:exemplo/actus-saas.git',
    lerEnv: () => 'SUPABASE_URL=https://fqwhpcusmkmvtgyofuwh.supabase.co',
    filaTemArquivo: () => true,
    filaTemDir: () => true,
    lerLiberacoes: () => '{"tokens":[]}',
    ultimaSondagem: () => ({ dia: '2026-09-08', falhou: false }),
    hoje: () => '2026-09-08',
    ...over,
  };
}

// ─── cat.0 · spec vendorizada ────────────────────────────────────────────────

describe('cat.0 · spec vendorizada', () => {
  it('checarSpecVendorizada: arquivo da spec ausente/vazio aborta e nomeia o arquivo', () => {
    const faltando = new Set(['templates/config.json']);
    const r = checarSpecVendorizada(depsVerdes({ arquivoComConteudo: (rel) => !faltando.has(rel) }));
    expect(r.ok).toBe(false);
    expect(r.item).toContain('templates/config.json');
    expect(r.motivo).toMatch(/ausente ou vazio/);
  });

  it('checarSpecVendorizada: pasta existe mas nada commitado (< 5 arquivos) aborta', () => {
    const r = checarSpecVendorizada(depsVerdes({ contarArquivosCommitados: () => 2 }));
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/não commitada/);
  });

  it('checarSpecVendorizada: tudo presente e commitado passa', () => {
    expect(checarSpecVendorizada(depsVerdes()).ok).toBe(true);
  });

  it('a lista de arquivos da spec existe DE VERDADE em doutrina/ (o que o instalador vendoriza)', () => {
    // Cobrar um arquivo que o kit não produz seria um NO-GO impossível de
    // satisfazer — o pré-voo reprovando todo repo por um erro de digitação aqui.
    for (const rel of ARQUIVOS_SPEC) {
      expect(readFileSync(join(REPO_ROOT, 'doutrina', rel), 'utf8').length, rel).toBeGreaterThan(0);
    }
    expect(ARQUIVOS_SPEC.length).toBeGreaterThanOrEqual(MINIMO_COMMITADOS);
  });
});

// ─── cat.1 · identidade ──────────────────────────────────────────────────────

describe('cat.1 · identidade', () => {
  it('checarIdentidade: origin errado aborta', () => {
    const r = checarIdentidade({ config: CONFIG, ...depsVerdes({ lerOrigin: () => 'git@github.com:exemplo/outro.git' }) });
    expect(r.ok).toBe(false);
    expect(r.item).toContain('origin');
    expect(r.motivo).toMatch(/checkout errado/);
  });

  it('checarIdentidade: .env sem ambiente_id aborta', () => {
    const r = checarIdentidade({ config: CONFIG, ...depsVerdes({ lerEnv: () => 'SUPABASE_URL=https://outro.supabase.co' }) });
    expect(r.ok).toBe(false);
    expect(r.item).toContain('ambiente_id');
    expect(r.motivo).toMatch(/ambiente errado/);
  });

  it('checarIdentidade: origin e ambiente_id certos passa', () => {
    expect(checarIdentidade({ config: CONFIG, ...depsVerdes() }).ok).toBe(true);
  });

  it('config sem a chave DESLIGA aquele lado (o mesmo desenho do executor.sh:104-114)', () => {
    const r = checarIdentidade({ config: {}, ...depsVerdes({ lerOrigin: () => '', lerEnv: () => '' }) });
    expect(r.ok).toBe(true);
  });
});

// ─── cat.6 · estrutura da fila ───────────────────────────────────────────────

describe('cat.6 · estrutura da fila', () => {
  it('checarEstruturaFila: liberacoes.json inválido aborta', () => {
    const r = checarEstruturaFila(depsVerdes({ lerLiberacoes: () => '{ nao é json' }));
    expect(r.ok).toBe(false);
    expect(r.item).toContain('liberacoes.json');
    expect(r.motivo).toMatch(/JSON inválido/);
  });

  it('checarEstruturaFila: pasta rascunhos/ ausente aborta', () => {
    const r = checarEstruturaFila(depsVerdes({ filaTemDir: (rel) => rel !== 'rascunhos' }));
    expect(r.ok).toBe(false);
    expect(r.item).toContain('rascunhos');
  });

  it('checarEstruturaFila: _TEMPLATE.md ausente aborta', () => {
    const r = checarEstruturaFila(depsVerdes({ filaTemArquivo: (rel) => rel !== '_TEMPLATE.md' }));
    expect(r.ok).toBe(false);
    expect(r.item).toContain('_TEMPLATE.md');
  });

  it('checarEstruturaFila: tudo presente e válido passa', () => {
    expect(checarEstruturaFila(depsVerdes()).ok).toBe(true);
  });
});

// ─── cat.3 · a sondagem é LIDA, nunca refeita ────────────────────────────────

describe('cat.3 · última sondagem (sem nenhuma chamada nova)', () => {
  it('diz há quanto tempo foi', () => {
    const r = checarUltimaSondagem(depsVerdes({ ultimaSondagem: () => ({ dia: '2026-09-05', falhou: false }), hoje: () => '2026-09-08' }));
    expect(r.ok).toBe(true);
    expect(r.info).toBe(true);
    expect(r.motivo).toMatch(/2026-09-05.*há 3 dias/);
  });

  it('hoje e ontem saem por extenso', () => {
    expect(checarUltimaSondagem(depsVerdes()).motivo).toMatch(/\(hoje\)/);
    expect(
      checarUltimaSondagem(depsVerdes({ ultimaSondagem: () => ({ dia: '2026-09-07', falhou: false }) })).motivo,
    ).toMatch(/\(ontem\)/);
  });

  it('sondagem que FALHOU aparece, mas NÃO derruba o pré-voo — quem adia é o probe do executor', () => {
    const r = checarUltimaSondagem(depsVerdes({ ultimaSondagem: () => ({ dia: '2026-09-08', falhou: true }) }));
    expect(r.ok).toBe(true);
    expect(r.motivo).toMatch(/FALHOU/);
  });

  it('repo que nunca sondou não é NO-GO', () => {
    const r = checarUltimaSondagem(depsVerdes({ ultimaSondagem: () => null }));
    expect(r.ok).toBe(true);
    expect(r.motivo).toMatch(/nenhuma sondagem/);
  });

  it('ultimaSondagemDe: lê o papel `probe` do custo.json e os probe-falha-* de runs/', () => {
    const runs = mkdtempSync(join(tmpdir(), 'orq-prevoo-'));
    const custo = join(runs, 'custo.json');
    writeFileSync(
      custo,
      JSON.stringify({
        dias: {
          '2026-09-06': [{ papel: 'executor' }],
          '2026-09-08': [{ papel: 'probe' }, { papel: 'juiz' }],
        },
      }),
    );
    expect(ultimaSondagemDe(runs, custo)).toEqual({ dia: '2026-09-08', falhou: false });

    writeFileSync(join(runs, 'probe-falha-20260909T101500Z.txt'), 'rc=1');
    expect(ultimaSondagemDe(runs, custo)).toEqual({ dia: '2026-09-09', falhou: true });
  });

  it('ultimaSondagemDe: sem ledger e sem falha, devolve null (nunca lança)', () => {
    const vazio = mkdtempSync(join(tmpdir(), 'orq-prevoo-'));
    expect(ultimaSondagemDe(vazio, join(vazio, 'custo.json'))).toBeNull();
  });

  it('diasEntre: relógio para trás não vira idade negativa', () => {
    expect(diasEntre('2026-09-10', '2026-09-08')).toBe(0);
    expect(diasEntre('2026-09-01', '2026-09-08')).toBe(7);
  });
});

// ─── composição ──────────────────────────────────────────────────────────────

describe('preVooRelampago: composição', () => {
  it('preVooRelampago: tudo verde passa', () => {
    expect(preVooRelampago({ config: CONFIG, deps: depsVerdes() }).ok).toBe(true);
  });

  it('preVooRelampago: para na primeira falha (cat.0 antes de cat.1/cat.6)', () => {
    const r = preVooRelampago({
      config: CONFIG,
      deps: depsVerdes({ arquivoComConteudo: () => false, lerOrigin: () => '', lerLiberacoes: () => 'x' }),
    });
    expect(r.ok).toBe(false);
    expect(r.token).toBe('cat.0');
    expect(r.itens).toHaveLength(1);
  });

  it('preVooRelampago: dep que LANÇA vira aborto limpo nomeando o item ⚡', () => {
    const r = preVooRelampago({
      config: CONFIG,
      deps: depsVerdes({
        contarArquivosCommitados: () => {
          throw new Error('git ls-files não completou (timeout de 15000ms)');
        },
      }),
    });
    expect(r.ok).toBe(false);
    expect(r.item).toMatch(/cat\.0/);
    expect(r.motivo).toMatch(/checagem lançou — git ls-files não completou/);
  });

  it('preVooRelampago: a falha de ferramenta não é confundida com spec ausente', () => {
    const r = preVooRelampago({
      config: CONFIG,
      deps: depsVerdes({
        contarArquivosCommitados: () => {
          throw new Error('git remote get-url origin falhou: spawn ENOENT');
        },
      }),
    });
    expect(r.motivo).not.toMatch(/ausente ou vazio/);
    expect(r.motivo).toMatch(/ENOENT/);
  });

  it('preVooRelampago: dep ASSÍNCRONA é recusada (o pré-voo é síncrono por contrato)', () => {
    const r = preVooRelampago({
      config: CONFIG,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      deps: depsVerdes({ arquivoComConteudo: (() => Promise.resolve(true)) as any }),
    });
    expect(r.ok).toBe(false);
    expect(r.motivo).toMatch(/SÍNCRONAS por contrato/);
  });

  it('preVooRelampago nunca devolve Promise (não há await pendente no caminho ⚡)', () => {
    const r = preVooRelampago({ config: CONFIG, deps: depsVerdes() });
    expect(typeof (r as unknown as { then?: unknown }).then).toBe('undefined');
  });

  it('render: um item por linha, e a última linha é o veredito', () => {
    const go = render(preVooRelampago({ config: CONFIG, deps: depsVerdes() }));
    const linhas = go.trimEnd().split('\n');
    expect(linhas).toHaveLength(5); // cat.0, cat.1, cat.6, cat.3 e o veredito
    expect(linhas.at(-1)).toBe('GO');
    expect(linhas[0]).toMatch(/^ok {4}cat\.0 /);
    expect(linhas.at(-2)).toMatch(/^info {2}cat\.3 /);

    const nogo = render(preVooRelampago({ config: CONFIG, deps: depsVerdes({ lerOrigin: () => 'outro' }) }));
    // `NO-GO <token> · ...`: o token é o SEGUNDO campo, e é isso que o
    // local-loop.sh corta com awk para o `item=` do evento.
    expect(nogo.trimEnd().split('\n').at(-1)).toMatch(/^NO-GO cat\.1 · /);
  });
});

// ─── deps reais, contra um checkout de mentira ───────────────────────────────

describe('preVooDepsReais', () => {
  it('preVooDepsReais: toda chamada externa carrega timeout explícito', () => {
    expect(TIMEOUT_PRE_VOO_MS).toBeLessThanOrEqual(15_000);
    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'prevoo.ts'), 'utf8');
    expect(fonte).toMatch(/spawnSync\('git'[\s\S]{0,120}timeout: TIMEOUT_PRE_VOO_MS/);
  });

  it('preVooDepsReais: git que não completa LANÇA (e não devolve 0 em silêncio)', () => {
    const deps = preVooDepsReais({
      repoRoot: '/nao/existe',
      filaDir: '/nao/existe',
      runsDir: '/nao/existe',
      custoFile: '/nao/existe/custo.json',
      git: () => ({ status: null, signal: 'SIGTERM', stdout: '' }),
    });
    expect(() => deps.contarArquivosCommitados()).toThrow(/não completou/);
    expect(() => deps.lerOrigin()).toThrow(/não completou/);
  });

  it('preVooDepsReais: nenhuma dep spawna o `claude` — o pré-voo do kit não gasta', () => {
    const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'prevoo.ts'), 'utf8');
    expect(fonte).not.toMatch(/spawnSync\(\s*['"]claude/);
    expect(fonte).not.toMatch(/claudeBin/);
  });

  it('preVooDepsReais: lê a estrutura REAL de um checkout montado em tmp', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-prevoo-repo-'));
    const fila = join(raiz, 'docs/fila');
    mkdirSync(join(fila, 'rascunhos'), { recursive: true });
    mkdirSync(join(fila, 'runs'), { recursive: true });
    writeFileSync(join(fila, '_TEMPLATE.md'), '# t\n');
    writeFileSync(join(fila, 'liberacoes.json'), '{"tokens":[]}');
    const deps = preVooDepsReais({
      repoRoot: raiz,
      filaDir: fila,
      runsDir: join(fila, 'runs'),
      custoFile: join(fila, 'runs/custo.json'),
      git: () => ({ status: 0, stdout: '' }),
    });
    expect(checarEstruturaFila(deps).ok).toBe(true);
    expect(deps.filaTemDir('rascunhos')).toBe(true);
    expect(deps.filaTemArquivo('_TEMPLATE.md')).toBe(true);
    // A spec NÃO está lá: cat.0 reprova, e é o caso do repo que recebeu a fila
    // mas não vendorizou o motor.
    expect(checarSpecVendorizada(deps).ok).toBe(false);
  });
});

// ─── o driver: local-loop.sh ─────────────────────────────────────────────────

describe('local-loop.sh chama o pré-voo ANTES do lock', () => {
  const loop = readFileSync(join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh'), 'utf8');

  // A ORDEM é a decisão desta peça, e ela difere da do Actus num ponto: lá o
  // pré-voo vem antes do lock. Aqui vem depois — quem protege o run alheio é o
  // `lock_adquirir` (sai 0 sem tocar lock nenhum quando há outro vivo), e a
  // PAUSA vem antes de tudo porque é a palavra do humano. O que se preserva é a
  // propriedade que importa: em NO-GO nenhum TICKET é tocado, e o primeiro
  // passo que escreve em ticket é o `--reconcile`.
  it('a chamada vem depois do lock e da pausa, e ANTES do reconcile e de drenar', () => {
    const iLock = loop.indexOf('lock_adquirir || exit 0');
    const iPausa = loop.indexOf('  if pausa_ativa; then\n    say "PAUSA ativa');
    const iPrevoo = loop.indexOf('\n  prevoo_ou_sai\n');
    const iReconcile = loop.indexOf('--reconcile');
    const iDrenar = loop.indexOf('\n  drenar\n');
    expect(iLock).toBeGreaterThan(0);
    expect(iLock).toBeLessThan(iPausa);
    expect(iPausa).toBeLessThan(iPrevoo);
    expect(iPrevoo).toBeLessThan(iReconcile);
    expect(iReconcile).toBeLessThan(iDrenar);
  });

  it('em NO-GO grava PREVOO_NOGO item=<token>, notifica e sai != 0', () => {
    const fn = /prevoo_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
    expect(fn).toContain("event '---' PREVOO_NOGO \"item=$token\"");
    expect(fn).toContain('notificar "Orquestrador: pré-voo NO-GO"');
    expect(fn).toContain('exit 1');
    // NENHUM toque em ticket: o corpo não chama nada que escreva ticket.
    expect(fn).not.toMatch(/ticket_set|run_executor_once|lock_adquirir/);
  });

  it('em GO, UMA linha a mais no log da drenagem — e nada na trilha', () => {
    const fn = /prevoo_ou_sai\(\) \{[\s\S]*?\n\}/.exec(loop)![0];
    const go = fn.slice(0, fn.indexOf('linha='));
    expect((go.match(/say "pré-voo: GO/g) ?? []).length).toBe(1);
    expect(go).not.toContain('event ');
  });

  it('o pré-voo é substituível por stub, como run_executor_once', () => {
    expect(loop).toMatch(/run_prevoo\(\) \{\n  npx tsx "\$ORQ_LIB_DIR\/prevoo\.ts"/);
  });
});
