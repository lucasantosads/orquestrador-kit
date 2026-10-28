/**
 * Etapa L11: gate de instável (porte do Fix A do 86dec07 e do 9ee36a9 do Comarka).
 *
 * Arquivo com FAIL na suíte, sem relação com o diff (fora do diff, da allowlist com a
 * ampliada e dos vizinhos C11 da 8c), roda isolado antes de virar base vermelha ou
 * reprovação. Aqui, a CLASSIFICAÇÃO (P1): quem é candidato a rerodar e quando nada
 * reroda. As fixtures em `test/fixtures/instavel-l11/` são casos reais do Comarka
 * (`ORIGEM.md` da pasta).
 */
import { describe, it, expect } from 'vitest';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { instaveisCandidatos, TETO_INSTAVEIS } from '../scripts/orquestrador/decisao.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures', 'instavel-l11');
const ler = (a: string) => readFileSync(join(FIX, a), 'utf8');
const ORFAS = 'test/estado-plano-orfas.test.ts';
const SEGREDO = 'test/sem-segredo-no-repo.test.ts';
const T1523 = { saida: ler('vitest-1523-attempt-1.txt'), arquivosDoDiff: ['scripts/roadmap/plano.py', 'test/plano-brief.test.ts'], allowlist: ['scripts/roadmap/plano.py', 'test/plano-brief.test.ts'], vizinhos: new Map<string, string[]>() };
const MIG = 'supabase/migrations/20261023020200_inteligencia_fase2_anon_sistema_fila_erros.sql';
const T5263 = { saida: ler('vitest-5263-attempt-1.txt'), arquivosDoDiff: [MIG, 'test/inteligencia/fase2-anon-sistema-fila-erros.test.ts'], allowlist: [MIG, 'test/inteligencia/fase2-anon-sistema-fila-erros.test.ts'], vizinhos: new Map<string, string[]>() };

/** O bloco FAIL real do 1523 com outro arquivo no lugar do orfas, N vezes, e o placar de N. */
function sintetico(arquivos: string[]): string {
  const ls = T1523.saida.split('\n');
  const ini = ls.findIndex((l) => l.includes(' FAIL '));
  const fim = ls.findIndex((l) => l.includes('[1/1]'));
  const bloco = ls.slice(ini, fim + 1).join('\n');
  return [...arquivos.map((a) => bloco.split(ORFAS).join(a)), '', ` Test Files  ${arquivos.length} failed | 9 passed (${arquivos.length + 9})`].join('\n');
}

describe('L11-P1 · instaveisCandidatos: quem roda isolado', () => {
  it('1523: o FAIL fora do diff e da allowlist é candidato', () => {
    expect(instaveisCandidatos(T1523)).toEqual({ rerodar: [ORFAS], resto: [], motivo: '' });
  });

  it('5263: os dois FAIL sem relação são candidatos, na ordem da saída', () => {
    expect(instaveisCandidatos(T5263)).toEqual({ rerodar: [ORFAS, SEGREDO], resto: [], motivo: '' });
  });

  it('FAIL na allowlist (glob), no diff ou vizinho C11: conta, nunca reroda', () => {
    expect(instaveisCandidatos({ ...T1523, allowlist: ['test/estado-plano-*.test.ts'] }).resto).toEqual([ORFAS]);
    expect(instaveisCandidatos({ ...T1523, arquivosDoDiff: [ORFAS] }).resto).toEqual([ORFAS]);
    const viz = instaveisCandidatos({ ...T5263, vizinhos: new Map([['src/lib/segredo.ts', [SEGREDO]]]) });
    expect(viz).toEqual({ rerodar: [ORFAS], resto: [SEGREDO], motivo: '' });
  });

  it('Unhandled Errors: nada reroda, mesmo com 300 KB depois do título', () => {
    const saida = `${T1523.saida}\n⎯⎯⎯⎯ Unhandled Errors ⎯⎯⎯⎯\nError: boom\n${'x'.repeat(300_000)}\n`;
    expect(instaveisCandidatos({ ...T1523, saida })).toEqual({ rerodar: [], resto: [ORFAS], motivo: 'vitest teve Unhandled Errors' });
  });

  it("'Test Files N failed' que não bate com os FAIL lidos (ou some): nada reroda", () => {
    const dois = T1523.saida.replace(/(Test Files[^\n]*?)1( failed)/, '$12$2'); // a linha real tem ANSI no meio
    expect(instaveisCandidatos({ ...T1523, saida: dois })).toEqual({
      rerodar: [],
      resto: [ORFAS],
      motivo: "Test Files diz '2 failed' e há 1 FAIL legíveis",
    });
    const sem = T1523.saida.split('\n').filter((l) => !l.includes('Test Files')).join('\n');
    expect(instaveisCandidatos({ ...T1523, saida: sem }).rerodar).toEqual([]);
  });

  it(`teto de ${TETO_INSTAVEIS}: 4 sem relação é base quebrada; 3 rerodam`, () => {
    const quatro = ['test/a.test.ts', 'test/b.test.ts', 'test/c.test.ts', 'test/d.test.ts'];
    expect(instaveisCandidatos({ ...T1523, saida: sintetico(quatro) })).toEqual({
      rerodar: [],
      resto: quatro,
      motivo: 'base quebrada: 4 arquivos falhos sem relação com o diff (teto 3)',
    });
    expect(instaveisCandidatos({ ...T1523, saida: sintetico(quatro.slice(0, 3)) }).rerodar).toEqual(quatro.slice(0, 3));
  });

  it('nenhum FAIL legível: nada reroda', () => {
    expect(instaveisCandidatos({ ...T1523, saida: 'exit 1\n' })).toEqual({ rerodar: [], resto: [], motivo: 'nenhum FAIL legível na saída do vitest' });
  });
});

describe('L11-P1 · decisao-cli instaveis: os vizinhos vêm da árvore do base_ticket', () => {
  it('teste que importa item de src/ da allowlist é vizinho (conta); o outro reroda', () => {
    const d = mkdtempSync(join(tmpdir(), 'orq-l11-cli-'));
    const git = (...a: string[]) => execFileSync('git', ['-C', d, ...a], { encoding: 'utf8' });
    try {
      const arvore: Record<string, string> = {
        'src/lib/segredo.ts': 'export const s = 1\n',
        [SEGREDO]: "import { s } from '../src/lib/segredo'\n",
        [ORFAS]: "import { it } from 'vitest'\n",
        'tsconfig.json': '{}\n',
      };
      for (const [f, txt] of Object.entries(arvore)) {
        mkdirSync(dirname(join(d, f)), { recursive: true });
        writeFileSync(join(d, f), txt);
      }
      git('init', '-q');
      git('add', '-A');
      git('-c', 'user.email=t@t', '-c', 'user.name=t', 'commit', '-q', '-m', 'base');
      const base = git('rev-parse', 'HEAD').trim();
      const r = spawnSync(
        join(REPO_ROOT, 'node_modules', '.bin', 'tsx'),
        [join(REPO_ROOT, 'scripts', 'orquestrador', 'decisao-cli.ts'), join(REPO_ROOT, 'test', 'fixtures', 'checkout'), 'instaveis'],
        {
          input: JSON.stringify({ saida: T5263.saida, arquivosDoDiff: ['src/lib/segredo.ts'], allowlist: ['src/lib/segredo.ts'], worktree: d, base }),
          encoding: 'utf8',
        },
      );
      expect(r.status, r.stderr).toBe(0);
      expect(JSON.parse(r.stdout)).toEqual({ rerodar: [ORFAS], resto: [SEGREDO], motivo: '' });
    } finally {
      rmSync(d, { recursive: true, force: true });
    }
  });
});
