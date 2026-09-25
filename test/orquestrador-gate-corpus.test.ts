/**
 * Etapa 7d-1b, peça 1 — o corpus de calibração do gate de ticket.
 *
 * `test/fixtures/gate-corpus-7d1/casos.json` guarda os tickets reais da
 * calibração de 25/09/2026 (`~/orq-sessoes/levantamento-7d1-calibracao.md`),
 * só com os campos que o gate lê, cada um na versão que rodou:
 *
 *   (b) os 57 bloqueados por spec (`spec_criterio`/`spec_allowlist`), com a
 *       causa anotada no levantamento de bloqueios — todo disparo é VP;
 *   (a) os done que nunca bloquearam e rodaram no loop (CI 58, Actus 91,
 *       Comarka 557 desde 26/07) — todo disparo é FP por definição.
 *
 * `fila` de cada caso é a fila no instante T reduzida ao que os checks 7 e 8
 * leem: as dependências (com o fecho), os pendentes com allowlist em comum e o
 * fecho deles. As 19 dependências cujo arquivo não existe mais hoje foram
 * lidas do git no commit do evento (o artefato que a calibração conferiu à mão).
 *
 * A régua: o comarka-operacional é a mais madura da frota, e NENHUMA regra de
 * severidade ERRO pode ter falso positivo em (a), em nenhum dos três repos. O
 * teste imprime a matriz (VP em (b), FP em (a), por regra e por repo) e falha
 * nomeando cada regra ERRO com FP.
 *
 * A severidade é a que o gate DEVOLVE em cada achado (`aviso`/violação), não uma
 * tabela copiada aqui: o teste mede o gate como o pré-voo o consome.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';

interface Caso {
  grupo: 'a' | 'b';
  repo: 'CI' | 'Actus' | 'Comarka';
  id: string;
  arquivo: string;
  classe?: string;
  causa?: string;
  ticket: Record<string, unknown>;
  fila: Record<string, unknown>[];
}

const CASOS = JSON.parse(
  readFileSync(join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1', 'casos.json'), 'utf8'),
) as Caso[];
// A calibração rodou os três repos com o config do template (o Comarka não tem
// `gate_ticket`): é o mesmo que o fixture do kit carrega.
const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));
const REPOS = ['CI', 'Actus', 'Comarka'] as const;

/**
 * A regra de um achado. Depois da peça 2 o gate diz (`regra`); antes, a
 * mensagem é classificada como a simulação da calibração classificava
 * (`simkit.ts:chave`), para o corpus medir o gate de ANTES também.
 */
function regraDe(v: Violacao): string {
  const r = (v as Violacao & { regra?: string }).regra;
  if (r) return r;
  const m = v.mensagem;
  const campo = v.campo;
  if (campo === 'json') return '1';
  if (campo === 'id') return '3';
  if (campo === 'status') return '4';
  if (campo.startsWith('dependencias')) return '7';
  if (campo === 'pathspec_allowlist') return '8';
  if (campo.startsWith('contexto_juiz')) return v.aviso ? '9w' : '9';
  if (campo === 'objetivo' && v.aviso) return '6b';
  if (campo.endsWith('.exemplos_regex')) {
    return m.includes('não declara exemplos_regex') ? '10n' : m.includes('dentro de classe') ? '10c' : '10x';
  }
  if (v.isencao) return '6i';
  if (m.includes('campo obrigatório') || m.includes('classe de risco')) return '2';
  if (m.startsWith('tipo ')) return '5t';
  if (m === 'cmd vazio') return '5c';
  if (m === 'espera vazia') return '5e';
  if (m.startsWith('padrão proibido')) return `6a:${/'([^']*)'/.exec(m)?.[1] ?? '?'}`;
  if (m.startsWith('redirecionamento')) return '6r';
  if (m.startsWith('vitest:')) return '6v';
  if (m.startsWith('grep -q em pipe')) return '6q';
  return `?${campo}`;
}

function rodarCaso(c: Caso): Violacao[] {
  const dir = `/corpus-7d1/${c.repo}`;
  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: { ...c.ticket, status: 'pendente' } };
  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
  fila.push(alvo);
  return validarTicket(alvo, fila, CFG);
}

interface Celula {
  tickets: Set<string>;
  erro: boolean;
}

function matriz(): Map<string, Record<string, Celula>> {
  const m = new Map<string, Record<string, Celula>>();
  for (const c of CASOS) {
    for (const v of rodarCaso(c)) {
      if (v.isencao) continue;
      const regra = regraDe(v);
      if (!m.has(regra)) m.set(regra, {});
      const linha = m.get(regra)!;
      const col = `${c.grupo}:${c.repo}`;
      linha[col] ??= { tickets: new Set(), erro: false };
      linha[col]!.tickets.add(c.id);
      if (!v.aviso) linha[col]!.erro = true;
    }
  }
  return m;
}

function imprimir(m: Map<string, Record<string, Celula>>): string {
  const cols = [...REPOS.map((r) => `a:${r}`), ...REPOS.map((r) => `b:${r}`)];
  const tot = (col: string) => CASOS.filter((c) => `${c.grupo}:${c.repo}` === col).length;
  const linhas = [
    `regra\tseveridade\t${cols.map((c) => `${c.startsWith('a') ? 'FP' : 'VP'} ${c.slice(2)}/${tot(c)}`).join('\t')}`,
  ];
  for (const regra of [...m.keys()].sort()) {
    const l = m.get(regra)!;
    const sev = Object.values(l).some((x) => x.erro) ? 'ERRO' : 'aviso';
    linhas.push(`${regra}\t${sev}\t${cols.map((c) => l[c]?.tickets.size ?? 0).join('\t')}`);
  }
  return linhas.join('\n');
}

describe('7d1b-1 · corpus da calibração: nenhuma regra ERRO com falso positivo', () => {
  it('o corpus é o da calibração: 58/91/557 done e 6/12/39 bloqueados por spec, todos com causa', () => {
    const n = (g: string, r: string) => CASOS.filter((c) => c.grupo === g && c.repo === r).length;
    expect([n('a', 'CI'), n('a', 'Actus'), n('a', 'Comarka')]).toEqual([58, 91, 557]);
    expect([n('b', 'CI'), n('b', 'Actus'), n('b', 'Comarka')]).toEqual([6, 12, 39]);
    expect(CASOS.filter((c) => c.grupo === 'b' && !c.causa).map((c) => `${c.repo} ${c.id}`)).toEqual([]);
  });

  it('matriz por regra e por repo; regra ERRO com FP em (a) reprova', () => {
    const m = matriz();
    const tabela = imprimir(m);
    console.log(`\nMATRIZ DO CORPUS (FP = done que a regra marca; VP = bloqueado por spec que a regra marca)\n${tabela}\n`);
    const erroComFp: string[] = [];
    for (const [regra, l] of m) {
      for (const r of REPOS) {
        const cel = l[`a:${r}`];
        if (cel?.erro && cel.tickets.size > 0) {
          erroComFp.push(`${regra} ${r}: ${cel.tickets.size} FP (${[...cel.tickets].slice(0, 6).join(', ')}${cel.tickets.size > 6 ? ', …' : ''})`);
        }
      }
    }
    expect(erroComFp, tabela).toEqual([]);
  }, 180_000);
});
