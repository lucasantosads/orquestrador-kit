/**
 * Etapa 7d-1b, peça 2 — severidade por regra no gate de ticket.
 *
 * Cada regra tem UMA severidade (erro, aviso, off) numa tabela única
 * (`REGRAS` no gate-ticket.ts), e o config sobrescreve por
 * `gate_ticket.severidade`. A tabela aplica a decisão da calibração de 25/09
 * (`levantamento-7d1-calibracao.md` §5): ERRO só com zero falso positivo nos
 * done dos três repos. O pré-voo em modo `bloqueia` bloqueia só por ERRO, porque
 * o rc do gate só conta ERRO.
 *
 * O gate é importado como namespace: antes da peça 2 `REGRAS` não existe, e o
 * teste falha por ASSERÇÃO (undefined contra a tabela), não por import.
 */
import { describe, it, expect } from 'vitest';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import * as gate from '../scripts/orquestrador/gate-ticket.js';
import { propor } from '../scripts/orquestrador/migrar-config.js';
import { FX_CHECKOUT, REPO_ROOT } from './fixtures/orq-harness.js';

const CFG_REAL = JSON.parse(readFileSync(join(FX_CHECKOUT, 'docs', 'fila', '000-config.json'), 'utf8'));
const TSX = join(REPO_ROOT, 'node_modules', '.bin', 'tsx');
const GATE = join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts');

type Achado = gate.Violacao & { regra?: string };

/** Fila num tmp com o config do fixture (mais o `severidade` pedido) e UM ticket. */
function fila(cmd: string, severidade?: Record<string, unknown>, extra: Record<string, unknown> = {}): string {
  const dir = mkdtempSync(join(tmpdir(), 'orq-sev-'));
  const cfg = structuredClone(CFG_REAL);
  if (severidade !== undefined) cfg.gate_ticket.severidade = severidade;
  writeFileSync(join(dir, '000-config.json'), JSON.stringify(cfg, null, 2));
  const t = {
    id: '901',
    slug: 'sev',
    bloco: 'B1',
    risco: '',
    objetivo: 'escreve src/a.ts',
    pathspec_allowlist: ['src/a.ts'],
    dependencias: [],
    status: 'pendente',
    criterios_aceite: [{ tipo: 'alvo', descricao: 'c', cmd, espera: 'ok' }],
    ...extra,
  };
  writeFileSync(join(dir, '901-sev.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
  return dir;
}

function achados(dir: string): Achado[] {
  const f = gate.lerFila(dir);
  return gate.validarTicket(f[0]!, f, gate.carregarCfg(dir)) as Achado[];
}

const erros = (a: Achado[]) => a.filter((x) => !x.aviso && !x.isencao);
const avisos = (a: Achado[]) => a.filter((x) => x.aviso);

function cli(dir: string, ...args: string[]) {
  const r = spawnSync(TSX, [GATE, '--fila', dir, ...args], { encoding: 'utf8' });
  return { rc: r.status ?? 1, out: r.stdout ?? '', err: r.stderr ?? '' };
}

describe('7d1b-2 · a tabela única', () => {
  it('a tabela aplica a decisão da calibração, regra a regra', () => {
    const sev = Object.fromEntries(Object.entries(gate.REGRAS ?? {}).map(([k, r]) => [k, r.severidade]));
    expect(sev).toEqual({
      '1': 'erro',
      '2': 'erro',
      '3': 'erro',
      '4': 'erro',
      '5t': 'erro',
      '5c': 'erro',
      '5e': 'erro',
      '6a': 'erro',
      '6a:$(': 'off',
      '6a:rm ': 'aviso',
      '6a:bash': 'aviso',
      '6a:sh -c': 'aviso',
      '6r': 'aviso',
      '6v': 'aviso',
      '6q': 'aviso',
      '6b': 'aviso',
      '7': 'erro',
      '8': 'aviso',
      '9': 'erro',
      '9w': 'aviso',
      '10n': 'aviso',
      '10c': 'erro',
      '10x': 'erro',
    });
  });

  it('todo achado diz de que regra veio', () => {
    const a = achados(fila("npx vitest run a 2>&1 | grep -q passed && rm -rf x && eval ls && echo `ls`"));
    expect(a.length).toBeGreaterThan(0);
    expect(a.filter((x) => !x.regra).map((x) => x.mensagem)).toEqual([]);
  });
});

describe('7d1b-2 · o que cada severidade faz', () => {
  it("DESLIGAR: `$(` fora da isenção não acusa nada (54/7/74 FP, 0 causal)", () => {
    const a = achados(fila('test -f src/a.ts && test $(grep -c x src/a.ts) -ge 1 && echo ok'));
    expect(a.filter((x) => x.mensagem.includes("'$('"))).toEqual([]);
  });

  it('AVISO: `rm `, `bash` e `sh -c` saem como aviso, nunca como violação', () => {
    for (const cmd of ['rm -rf .next && npm run build >/dev/null 2>&1 && echo ok', 'bash scripts/x.sh && echo ok', "sh -c 'ls' && echo ok"]) {
      const a = achados(fila(cmd));
      expect(erros(a).map((x) => x.mensagem), cmd).toEqual([]);
      expect(avisos(a).some((x) => x.mensagem.startsWith('padrão proibido')), cmd).toBe(true);
    }
  });

  it('ERRO: crase, eval, sudo, curl e wget seguem violação', () => {
    for (const cmd of ['echo `ls`', 'eval ls', 'sudo ls', 'curl https://x.y', 'wget http://x.y']) {
      expect(erros(achados(fila(cmd))).some((x) => x.mensagem.startsWith('padrão proibido')), cmd).toBe(true);
    }
  });

  it('AVISO: grep -q em pipe (6q) e saída textual do vitest (6v)', () => {
    const a = achados(fila('npx vitest run a 2>&1 | grep -q passed && echo ok'));
    expect(erros(a).map((x) => x.mensagem)).toEqual([]);
    expect(avisos(a).map((x) => x.regra).sort()).toEqual(['6q', '6v']);
  });

  it('AVISO: redirecionamento para arquivo (6r) e regex sem exemplos (10n)', () => {
    const r = achados(fila('npm run build > build.log 2>&1 && echo ok'));
    expect(erros(r).map((x) => x.mensagem)).toEqual([]);
    expect(avisos(r).map((x) => x.regra)).toContain('6r');
    const n = achados(fila("grep -cE 'a|b' src/a.ts"));
    expect(erros(n).map((x) => x.mensagem)).toEqual([]);
    expect(avisos(n).map((x) => x.regra)).toContain('10n');
  });

  it('AVISO: allowlist sobreposta com outro pendente (8)', () => {
    const dir = fila('test -f src/a.ts && echo ok');
    const t = readFileSync(join(dir, '901-sev.md'), 'utf8').replaceAll('"901"', '"902"').replace('# 901', '# 902');
    writeFileSync(join(dir, '902-sev.md'), t);
    const a = achados(dir);
    expect(erros(a).map((x) => x.mensagem)).toEqual([]);
    expect(avisos(a).map((x) => x.regra)).toEqual(['8']);
  });
});

describe('7d1b-2 · o config sobrescreve a tabela (gate_ticket.severidade)', () => {
  it('aviso vira erro, erro vira off, e o 6a:$( volta a acusar com a isenção de volta', () => {
    const dir = fila('test -f src/a.ts && test $(grep -c x src/a.ts) -ge 1 && npx vitest run a | grep -q passed', {
      '6q': 'erro',
      '6a:$(': 'erro',
      '4': 'off',
    }, { status: 'pendente' });
    const a = achados(dir);
    expect(erros(a).map((x) => x.regra).sort()).toEqual(['6a:$(', '6q']);
    const iso = achados(fila("test $(grep -c 'it(' f.ts) -ge 8 && echo ok", { '6a:$(': 'aviso' }));
    expect(iso.filter((x) => x.isencao).map((x) => x.regra)).toEqual(['6a:$(']);
  });

  it('regra com severidade off não aparece nem com --relatorio', () => {
    const dir = fila('npx vitest run a 2>&1 | grep -q passed && echo ok', { '6q': 'off', '6v': 'off' });
    expect(achados(dir)).toEqual([]);
  });

  it('valor fora de erro|aviso|off, ou regra desconhecida: falha ALTA (rc 2), nunca a tabela em silêncio', () => {
    const ruim = cli(fila('test -f src/a.ts && echo ok', { '6q': 'avsio' }), '--pendentes');
    expect(ruim.rc).toBe(2);
    expect(ruim.err).toMatch(/gate_ticket\.severidade\.6q='avsio'/);
    const desconhecida = cli(fila('test -f src/a.ts && echo ok', { '6Q': 'erro' }), '--pendentes');
    expect(desconhecida.rc).toBe(2);
    expect(desconhecida.err).toMatch(/gate_ticket\.severidade\.6Q: regra desconhecida/);
    expect(cli(fila('test -f src/a.ts && echo ok', { _nota: 'comentário', '6a:wget': 'aviso' }), '--pendentes').rc).toBe(0);
  });
});

describe('7d1b-2 · o rc (e o pré-voo em modo bloqueia) só conta ERRO', () => {
  const SO_AVISO = 'npx vitest run a 2>&1 | grep -q passed && echo ok';

  it('ticket só com avisos: rc 0, e --violacoes não imprime nada', () => {
    const dir = fila(SO_AVISO);
    expect(cli(dir, '--pendentes').rc).toBe(0);
    const v = cli(dir, '--violacoes', '--pendentes');
    expect(v.rc).toBe(0);
    expect(v.out.trim()).toBe('');
  });

  it('a saída sem --relatorio marca o aviso rebaixado, para não passar por violação', () => {
    const out = cli(fila(SO_AVISO), '--pendentes').out;
    expect(out).toMatch(/^901-sev\.md:criterios_aceite\[0\] AVISO \(6q\): grep -q em pipe/m);
  });

  it('o mesmo ticket com 6q em erro pelo config: rc 1 e a linha na saída de --violacoes', () => {
    const v = cli(fila(SO_AVISO, { '6q': 'erro' }), '--violacoes', '--pendentes');
    expect(v.rc).toBe(1);
    expect(v.out).toMatch(/^901-sev\.md:criterios_aceite\[0\] grep -q em pipe/m);
  });
});

describe('7d1b-2 · a chave chega aos repos pelo migrar-config e pelo template', () => {
  it('migrar: config sem gate_ticket.severidade ganha {} (vale a tabela); com a chave, nada muda', () => {
    const sem = JSON.parse(propor({ $schema_versao: 2, gates: [], gate_ticket: { proibido_no_cmd: [] } }).proposto);
    expect(sem.gate_ticket.severidade).toEqual({});
    const com = JSON.parse(propor({ $schema_versao: 2, gates: [], gate_ticket: { severidade: { '6q': 'erro' } } }).proposto);
    expect(com.gate_ticket.severidade).toEqual({ '6q': 'erro' });
  });

  it('o template traz a chave vazia, e ela passa pela validação do gate', () => {
    const tpl = JSON.parse(readFileSync(join(REPO_ROOT, 'doutrina', 'templates', 'config.json'), 'utf8'));
    expect(tpl.gate_ticket.severidade).toEqual({});
    expect(gate.lerSeveridade(tpl.gate_ticket.severidade, 'template')).toEqual({});
  });
});
