/**
 * Peça 3 — `scripts/orq`, o comando de consulta (contrato §3).
 *
 * Cada subcomando tem caso próprio, e todos rodam contra o fixture fora de git:
 * `orq pausar` escreve de verdade, então rodá-lo contra o checkout real pararia
 * a drenagem de verdade.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync, chmodSync } from 'node:fs';
import { join } from 'node:path';
import { criarFixture, escrever, ler, orq, REPO_ROOT } from './fixtures/orq-harness.js';

const runs = (raiz: string, ...p: string[]) => join(raiz, 'docs', 'fila', 'runs', ...p);

const FILA = [
  { id: '900', slug: 'ja-foi', status: 'done', frente: 'B2-F1' },
  { id: '901', slug: 'da-vez', status: 'pendente', frente: 'B2-F3', bloco: 'B2', origem: 'humano' },
  { id: '902', slug: 'travado', status: 'bloqueado', frente: 'B2-F3' },
];

const EVENTOS = [
  '2026-09-03T01:00:00-0300 --- DRENAGEM_INICIO alvo=staging-auto processaveis=2',
  '2026-09-03T01:00:05-0300 901 INICIO attempt=0 model=sonnet',
  '2026-09-03T01:08:00-0300 901 GATE typecheck=ok testes=falha enforcement=ok criterios=2/3',
  '2026-09-03T01:08:01-0300 901 REPROVADO motivo=criterio_qualidade attempt=0 diff=120',
  '2026-09-03T01:08:02-0300 901 RETRY attempt=1 model=sonnet motivo=criterio_qualidade',
  '2026-09-03T01:20:00-0300 902 BLOQUEADO motivo=enforcement attempt=2',
  '',
].join('\n');

function comEvidencia(raiz: string) {
  escrever(runs(raiz, 'events.log'), EVENTOS);
  escrever(
    runs(raiz, '902', 'attempt-2', 'enforcement.json'),
    JSON.stringify({ ok: false, violations: [{ tipo: 'fora_do_pathspec', detalhe: 'test/x.test.ts' }] }),
  );
  escrever(runs(raiz, '902', 'attempt-2', 'gates.txt'), 'ok   typecheck_root  10ms\nVEREDITO: APROVADO\n');
  escrever(
    runs(raiz, '902', 'meta.json'),
    JSON.stringify([
      { attempt: 0, modelo: 'sonnet', duracaoSecs: 120, diffLines: 40, resultado: 'reprovado', ts: '2026-09-03T01:10:00Z' },
      { attempt: 2, modelo: 'opus', duracaoSecs: 300, diffLines: 90, resultado: 'reprovado', ts: '2026-09-03T01:20:00Z' },
    ]),
  );
}

// ─── orq (snapshot) ───────────────────────────────────────────────────────

describe('orq — imprime o STATUS.md', () => {
  it('mostra o snapshot quando ele existe', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'STATUS.md'), 'ORQUESTRADOR · x\nESTADO   ocioso\nMOTIVO   pausado\n');
    const r = orq(raiz);
    expect(r.rc).toBe(0);
    expect(r.out).toContain('ESTADO   ocioso');
    expect(r.out).toContain('MOTIVO   pausado');
  });

  it('sem snapshot, avisa e cai no placar em vez de imprimir nada', () => {
    const raiz = criarFixture(FILA);
    const r = orq(raiz);
    expect(r.rc).toBe(0);
    expect(r.err).toMatch(/sem snapshot ainda/);
    expect(r.out).toContain('FILA');
  });
});

// ─── orq fila ─────────────────────────────────────────────────────────────

describe('orq fila — placar por status lendo o JSON dos tickets', () => {
  it('conta por status e lista cada ticket com frente', () => {
    const r = orq(criarFixture(FILA), 'fila');
    expect(r.rc).toBe(0);
    expect(r.out).toContain('1 pendente · 1 bloqueado · 1 done');
    expect(r.out).toMatch(/pendente\s+901\s+B2-F3\s+da-vez/);
    expect(r.out).toMatch(/bloqueado\s+902/);
  });

  it('fila vazia não quebra', () => {
    const r = orq(criarFixture([]), 'fila');
    expect(r.rc).toBe(0);
    expect(r.out).toContain('sem ticket');
  });
});

// ─── orq eventos ──────────────────────────────────────────────────────────

describe('orq eventos [n]', () => {
  it('default 20, mais recentes por último', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'events.log'), EVENTOS);
    const r = orq(raiz, 'eventos');
    expect(r.out.trim().split('\n').length).toBe(6);
    expect(r.out.trim().split('\n').at(-1)).toContain('902 BLOQUEADO');
  });

  it('n corta a cauda', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'events.log'), EVENTOS);
    expect(orq(raiz, 'eventos', '2').out.trim().split('\n').length).toBe(2);
  });

  it('n não-numérico é erro explícito, não tail estranho', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'events.log'), EVENTOS);
    const r = orq(raiz, 'eventos', 'abc');
    expect(r.rc).not.toBe(0);
    expect(r.err).toMatch(/precisa ser número/);
  });

  it('trilha vazia avisa em vez de falhar', () => {
    const r = orq(criarFixture(FILA), 'eventos');
    expect(r.rc).toBe(0);
    expect(r.err).toMatch(/trilha vazia/);
  });
});

// ─── orq erro ─────────────────────────────────────────────────────────────

describe('orq erro — último reprovado, com o recorte do gate que falhou', () => {
  it('id, motivo e caminho da evidência', () => {
    const raiz = criarFixture(FILA);
    comEvidencia(raiz);
    const r = orq(raiz, 'erro');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/TICKET\s+902/);
    expect(r.out).toMatch(/MOTIVO\s+enforcement/);
    expect(r.out).toContain('attempt-2');
  });

  it('recorta o gate que reprovou — aqui o enforcement, com o arquivo fora da allowlist', () => {
    const raiz = criarFixture(FILA);
    comEvidencia(raiz);
    const r = orq(raiz, 'erro');
    expect(r.out).toContain('--- enforcement');
    expect(r.out).toContain('test/x.test.ts');
  });

  it('no máximo 30 linhas de recorte (não é o log inteiro)', () => {
    const raiz = criarFixture(FILA);
    comEvidencia(raiz);
    escrever(runs(raiz, '902', 'attempt-2', 'enforcement.json'), JSON.stringify({ ok: true }));
    escrever(
      runs(raiz, '902', 'attempt-2', 'gates.txt'),
      ['FALHA testes_por_pacote 100ms', ...Array.from({ length: 100 }, (_, i) => `linha ${i}`)].join('\n'),
    );
    const r = orq(raiz, 'erro');
    const recorte = r.out.split('--- gates')[1] ?? '';
    expect(recorte.trim().split('\n').length).toBeLessThanOrEqual(31);
  });

  it('sem nada reprovado, diz isso', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'events.log'), '2026-09-03T01:00:00-0300 901 APROVADO merge=aguardando dur=10s attempt=0\n');
    expect(orq(raiz, 'erro').out).toContain('nenhum REPROVADO/BLOQUEADO');
  });
});

// ─── orq ticket <id> ──────────────────────────────────────────────────────

describe('orq ticket <id> — última tentativa + evidência', () => {
  it('mostra status do ticket e a ÚLTIMA tentativa do meta.json', () => {
    const raiz = criarFixture(FILA);
    comEvidencia(raiz);
    const r = orq(raiz, 'ticket', '902');
    expect(r.out).toMatch(/TENTATIVAS 2/);
    // Peça 5: a leitura é 1-BASED (a 3ª tentativa é `tentativa=3`) e o
    // diretório 0-based aparece ao lado, que é o mapeamento entre a trilha e a
    // evidência. Renomear o diretório invalidaria run já gravado.
    expect(r.out).toMatch(/ÚLTIMA\s+tentativa=3 \(attempt-2\/\) modelo=opus resultado=reprovado/);
    expect(r.out).toContain('/902/attempt-2');
  });

  it('sem id é erro de uso', () => {
    expect(orq(criarFixture(FILA), 'ticket').rc).not.toBe(0);
  });

  it('ticket sem run ainda: avisa, não quebra', () => {
    const r = orq(criarFixture(FILA), 'ticket', '901');
    expect(r.rc).toBe(0);
    expect(r.err).toMatch(/sem meta\.json/);
    expect(r.out).toContain('EVIDÊNCIA <nenhuma>');
  });
});

// ─── orq custo ────────────────────────────────────────────────────────────

const CUSTO = {
  dias: {
    '2026-09-03': [
      { data: '2026-09-03', papel: 'executor', ticket: '901', attempt: 0, tokens_in: 1000, tokens_out: 200, tokens_cache: 8000, custo_usd: 0.4 },
      { data: '2026-09-03', papel: 'executor', ticket: '902', attempt: 0, tokens_in: 2000, tokens_out: 300, tokens_cache: 9000, custo_usd: 0.6 },
      { data: '2026-09-03', papel: 'avaliador', ticket: '902', attempt: 0, tokens_in: 500, tokens_out: 100, tokens_cache: 0, custo_usd: 0.25 },
    ],
  },
};

describe('orq custo [dia] — agregado por papel e por ticket, vs teto', () => {
  it('soma o dia e compara com o teto do config', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'custo.json'), JSON.stringify(CUSTO));
    const r = orq(raiz, 'custo', '2026-09-03');
    expect(r.rc).toBe(0);
    expect(r.out).toContain('CHAMADAS 3');
    expect(r.out).toMatch(/CUSTO.*1\.25 \/ 50/);
    expect(r.out).toMatch(/ESTOUROU\s+não/);
  });

  it('quebra por papel e por ticket', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'custo.json'), JSON.stringify(CUSTO));
    const out = orq(raiz, 'custo', '2026-09-03').out;
    expect(out).toMatch(/executor\s+2 chamada/);
    expect(out).toMatch(/avaliador\s+1 chamada/);
    expect(out).toMatch(/901\s+1 chamada/);
    expect(out).toMatch(/902\s+2 chamada/);
  });

  it('dia sem consumo: zera em vez de falhar', () => {
    const raiz = criarFixture(FILA);
    escrever(runs(raiz, 'custo.json'), JSON.stringify(CUSTO));
    expect(orq(raiz, 'custo', '2026-01-01').out).toContain('CHAMADAS 0');
  });

  it('teto estourado é dito com todas as letras', () => {
    const raiz = criarFixture(FILA);
    escrever(
      runs(raiz, 'custo.json'),
      JSON.stringify({ dias: { '2026-09-03': [{ papel: 'executor', ticket: '901', custo_usd: 61, tokens_in: 1, tokens_out: 1 }] } }),
    );
    expect(orq(raiz, 'custo', '2026-09-03').out).toMatch(/ESTOUROU SIM/);
  });

  it('sem custo.json ainda, informa o teto e sai 0', () => {
    const r = orq(criarFixture(FILA), 'custo');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/TETO\s+US\$ 50/);
  });
});

// ─── orq decisoes ─────────────────────────────────────────────────────────

describe('orq decisoes', () => {
  it('imprime o arquivo de decisões pendentes', () => {
    const raiz = criarFixture(FILA);
    escrever(join(raiz, 'docs', 'fila', 'decisoes-pendentes.md'), '# Decisões\n\n- métrica de ativação\n');
    expect(orq(raiz, 'decisoes').out).toContain('métrica de ativação');
  });

  it('sem arquivo, avisa e sai 0', () => {
    const r = orq(criarFixture(FILA), 'decisoes');
    expect(r.rc).toBe(0);
    expect(r.err).toMatch(/sem decisões pendentes/);
  });
});

// ─── orq mapa ─────────────────────────────────────────────────────────────

describe('orq mapa lint|status', () => {
  it('lint delega ao lint-mapa.py e devolve o rc dele', () => {
    const raiz = criarFixture(FILA);
    const stub = join(raiz, 'scripts', 'roadmap', 'lint-mapa.py');
    escrever(stub, 'print("LINT STUB")\nraise SystemExit(1)\n');
    const r = orq(raiz, 'mapa', 'lint');
    expect(r.out).toContain('LINT STUB');
    expect(r.rc).toBe(1);
  });

  it('o lint-mapa.py real existe onde o orq o procura', () => {
    expect(existsSync(join(REPO_ROOT, 'scripts', 'roadmap', 'lint-mapa.py'))).toBe(true);
  });

  it('status conta por frente a partir do campo frente do ticket', () => {
    const r = orq(criarFixture(FILA), 'mapa', 'status');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/B2-F1\s+\(1\)\s+1 done/);
    expect(r.out).toMatch(/B2-F3\s+\(2\)/);
    expect(r.out).toMatch(/B2-F3.*(pendente|bloqueado)/);
  });

  it('ticket sem frente cai em sem-frente, não some do placar', () => {
    const r = orq(criarFixture([{ id: '910', slug: 'legado', status: 'done' }]), 'mapa', 'status');
    expect(r.out).toMatch(/sem-frente\s+\(1\)/);
  });

  it('subcomando de mapa desconhecido é erro de uso', () => {
    expect(orq(criarFixture(FILA), 'mapa', 'xpto').rc).not.toBe(0);
  });
});

// ─── pausar / retomar: os únicos que escrevem ─────────────────────────────

describe('orq pausar / retomar — kill switch em arquivo, nunca kill de processo', () => {
  const PAUSAR = (raiz: string) => join(raiz, 'docs', 'fila', 'PAUSAR');

  it('pausar cria o pausar_file do config com data e motivo', () => {
    const raiz = criarFixture(FILA);
    const r = orq(raiz, 'pausar', 'promoção manual em curso');
    expect(r.rc).toBe(0);
    expect(existsSync(PAUSAR(raiz))).toBe(true);
    expect(ler(PAUSAR(raiz))).toContain('promoção manual em curso');
    expect(r.out).toMatch(/para ENTRE tickets/);
  });

  it('retomar remove o arquivo', () => {
    const raiz = criarFixture(FILA);
    orq(raiz, 'pausar');
    orq(raiz, 'retomar');
    expect(existsSync(PAUSAR(raiz))).toBe(false);
  });

  it('retomar sem pausa é idempotente', () => {
    const r = orq(criarFixture(FILA), 'retomar');
    expect(r.rc).toBe(0);
    expect(r.out).toContain('já estava ativo');
  });

  it('pausar NÃO toca ticket nem evidência', () => {
    const raiz = criarFixture(FILA);
    const antes = ler(join(raiz, 'docs', 'fila', '901-da-vez.md'));
    orq(raiz, 'pausar');
    expect(ler(join(raiz, 'docs', 'fila', '901-da-vez.md'))).toBe(antes);
  });
});

// ─── orq validar (peça 1) ─────────────────────────────────────────────────

describe('orq validar — o gate de ticket, com o rc repassado', () => {
  it('fila limpa: rc 0 e nenhuma linha', () => {
    const raiz = criarFixture([
      {
        id: '901',
        slug: 'da-vez',
        status: 'pendente',
        bloco: 'B2',
        objetivo: 'faz a coisa certa',
        pathspec_allowlist: ['src/a.ts'],
        dependencias: [],
        risco: '',
        criterios_aceite: [{ tipo: 'alvo', cmd: 'test -f src/a.ts && echo ok', espera: 'ok' }],
      },
    ]);
    const r = orq(raiz, 'validar', '--pendentes');
    expect(r.rc).toBe(0);
    expect(r.out.trim()).toBe('');
  });

  it('ticket torto: rc 1, e a linha nomeia arquivo e campo', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
    const r = orq(raiz, 'validar', '--pendentes');
    expect(r.rc).toBe(1);
    expect(r.out).toMatch(/901-da-vez\.md:(bloco|risco) campo obrigatório/);
  });

  it('--relatorio sai 0 mesmo com violação (é o modo de olhar, não de barrar)', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
    const r = orq(raiz, 'validar', '--pendentes', '--relatorio');
    expect(r.rc).toBe(0);
    expect(r.out).toMatch(/GATE DE TICKET · 1 ticket\(s\)/);
    expect(r.out).toMatch(/TOTAL: \d+ violação\(ões\)/);
  });

  it('validar é READ-ONLY: o .md do ticket sai byte a byte igual', () => {
    const raiz = criarFixture([{ id: '901', slug: 'da-vez', status: 'pendente' }]);
    const alvo = join(raiz, 'docs', 'fila', '901-da-vez.md');
    const antes = ler(alvo);
    orq(raiz, 'validar', '--pendentes');
    expect(ler(alvo)).toBe(antes);
  });

  it('o verbo está no --help', () => {
    expect(orq(criarFixture(FILA), '--help').out).toMatch(/orq validar/);
  });
});

// ─── read-only por construção ─────────────────────────────────────────────

describe('read-only por construção', () => {
  const fonte = readFileSync(join(REPO_ROOT, 'scripts', 'orq'), 'utf8');

  it('não chama nenhum escritor de ticket', () => {
    for (const proibido of ['ticket_set', 'ticket_commit', 'mark_adiado', 'cooldown_arm']) {
      expect(fonte, proibido).not.toMatch(new RegExp(`^\\s*${proibido}\\b`, 'm'));
    }
  });

  it('não mergeia, não commita, não mexe em branch nem worktree', () => {
    expect(fonte).not.toMatch(/git\s+(merge|commit|checkout|branch|worktree|push|reset)/);
  });

  it('não mata processo (parar o loop é desagendar, não kill)', () => {
    expect(fonte).not.toMatch(/\bkill\b|pkill|killall/);
  });

  it('não toca o lock da drenagem', () => {
    expect(fonte).not.toContain('.local-loop.lock');
  });

  it('a única escrita é o pausar_file', () => {
    const escritas = fonte.match(/^[^#\n]*(>|>>)\s*"\$[A-Z_]+"/gm) ?? [];
    for (const e of escritas) expect(e).toContain('PAUSAR_FILE');
    const remocoes = fonte.match(/^[^#\n]*rm\s+-[a-z]*f[a-z]*\s+.*$/gm) ?? [];
    for (const e of remocoes) expect(e).toContain('PAUSAR_FILE');
  });

  it('é executável', () => {
    chmodSync(join(REPO_ROOT, 'scripts', 'orq'), 0o755);
    expect(orq(criarFixture(FILA), 'fila').rc).toBe(0);
  });
});
