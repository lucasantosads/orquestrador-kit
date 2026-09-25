/**
 * Etapa 7d-1b, peça 4 — as regras estáticas do `validar-fila.py` do
 * comarka-operacional, no gate de ticket do kit, na severidade da tabela da
 * calibração de 25/09:
 *
 *   C2c  grep -c … || echo (aviso)          C3   ausência com padrão amplo (aviso)
 *   C2v  espera numérica, saída vazia (aviso) C4  acento em locale C (aviso)
 *   C2P  grep -P (erro)                     C7   dependência órfã (erro) = check 7
 *   C9   topologia (aviso)                  C11  colisão de teste (aviso)
 *   C12  allowlist sem arquivo nem diretório pai (aviso)
 *
 * Nada aqui executa critério: C1 (recon), C5 e C6 (critério contra a base)
 * ficam para a próxima etapa.
 *
 * Os casos são os do corpus (`test/fixtures/gate-corpus-7d1`). C9, C11, C12 e o
 * dicionário do C4 leem o repositório; no corpus, o contexto vem dos fatos
 * gravados em `arvores.json` e `acentos.json` (a base de cada caso), e o gate
 * recebe o contexto pelo 4º parâmetro de `validarTicket`.
 */
import { describe, it, expect } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { carregarCfg, validarTicket, type TicketLido, type Violacao } from '../scripts/orquestrador/gate-ticket.js';
import { contextoDoCorpus, type CasoCorpus } from './fixtures/gate-corpus-7d1/contexto.js';

const DIR = join(REPO_ROOT, 'test', 'fixtures', 'gate-corpus-7d1');
const CASOS = JSON.parse(readFileSync(join(DIR, 'casos.json'), 'utf8')) as CasoCorpus[];
const CFG = carregarCfg(join(REPO_ROOT, 'fixture', 'docs', 'fila'));

type Achado = Violacao & { regra?: string };

function caso(grupo: string, repo: string, id: string): CasoCorpus {
  const c = CASOS.find((x) => x.grupo === grupo && x.repo === repo && x.id === id);
  if (!c) throw new Error(`caso ${grupo} ${repo} ${id} não está no corpus`);
  return c;
}

function rodar(grupo: string, repo: string, id: string, ajuste: (t: Record<string, unknown>) => void = () => {}): Achado[] {
  const c = caso(grupo, repo, id);
  const t = structuredClone({ ...c.ticket, status: 'pendente' });
  ajuste(t);
  const dir = `/corpus-7d1/${c.repo}`;
  const alvo: TicketLido = { arquivo: join(dir, c.arquivo), json: t };
  const fila: TicketLido[] = c.fila.map((o) => ({ arquivo: join(dir, `${String(o.id)}-ctx.md`), json: o }));
  fila.push(alvo);
  return (validarTicket as (...a: unknown[]) => Violacao[])(alvo, fila, CFG, contextoDoCorpus(c)) as Achado[];
}

const regra = (v: Achado[], r: string) => v.filter((x) => x.regra === r);
const crit = (t: Record<string, unknown>) => t.criterios_aceite as Record<string, unknown>[];

describe('7d1b-4 · C2 (forma do cmd)', () => {
  it('C2c: CI 003 [5] e [6] (`grep -c … || echo 0` imprimia "0\\n0") — aviso', () => {
    const v = regra(rodar('b', 'CI', '003'), 'C2c');
    expect(v.map((x) => x.campo)).toEqual(['criterios_aceite[5]', 'criterios_aceite[6]']);
    expect(v.every((x) => x.aviso)).toBe(true);
  });

  it('C2c: Comarka 486 e 407a0, com causa; e `{ grep -c …; true; }` não acusa', () => {
    expect(regra(rodar('b', 'Comarka', '486'), 'C2c').length).toBeGreaterThan(0);
    expect(regra(rodar('b', 'Comarka', '407a0'), 'C2c').length).toBeGreaterThan(0);
    const v = rodar('b', 'CI', '003', (t) => {
      for (const c of crit(t)) c.cmd = '{ grep -c x src/a.ts || true; }';
    });
    expect(regra(v, 'C2c')).toEqual([]);
  });

  it('C2v: CI 212 (`test -f X && grep -c …`, espera 1): se o teste falhar a saída sai vazia — aviso', () => {
    const v = regra(rodar('a', 'CI', '212'), 'C2v');
    expect(v.map((x) => x.campo)).toContain('criterios_aceite[1]');
    expect(v.every((x) => x.aviso)).toBe(true);
    // com fallback (`|| echo 0`) ou espera não numérica, não é o caso
    const semVazio = rodar('a', 'CI', '212', (t) => {
      for (const c of crit(t)) if (typeof c.cmd === 'string') c.cmd = `${c.cmd} || echo 0`;
    });
    expect(regra(semVazio, 'C2v')).toEqual([]);
  });

  it('C2P: grep -P é ERRO (não existe no /usr/bin/grep); arquivo com -P no nome não é a opção', () => {
    const v = rodar('a', 'CI', '212', (t) => {
      crit(t)[0]!.cmd = "grep -cP '\\d+' src/a.ts";
      crit(t)[1]!.cmd = "grep -c 'x' src/foo-Page.tsx";
      crit(t)[2]!.cmd = "grep --perl-regexp -c 'y' src/b.ts";
    });
    const p = regra(v, 'C2P');
    expect(p.map((x) => [x.campo, x.aviso ?? false])).toEqual([
      ['criterios_aceite[0]', false],
      ['criterios_aceite[2]', false],
    ]);
  });
});

describe('7d1b-4 · C3 e C4 (o que o padrão casa)', () => {
  it('C3: Comarka 523b (proibia NEXT_PUBLIC_ no arquivo inteiro) — aviso', () => {
    const v = regra(rodar('b', 'Comarka', '523b'), 'C3');
    expect(v.length).toBeGreaterThan(0);
    expect(v[0]!.mensagem).toMatch(/NEXT_PUBLIC_/);
    expect(v.every((x) => x.aviso)).toBe(true);
  });

  it("C4: Comarka 391a ('Jur.dico' casa 'jurídico' só em UTF-8) e 243 (acento com grep -i sem LC_ALL) — aviso", () => {
    const a = regra(rodar('b', 'Comarka', '391a'), 'C4');
    expect(a.map((x) => x.mensagem).join(' ')).toMatch(/'Jur\.dico' usa '\.' no lugar de letra acentuada \(casa 'jurídico'/);
    const b = regra(rodar('a', 'Comarka', '243'), 'C4');
    expect(b.map((x) => x.mensagem).join(' ')).toMatch(/acento com grep -i sem LC_ALL/);
    expect([...a, ...b].every((x) => x.aviso)).toBe(true);
  });
});

describe('7d1b-4 · C7 (dependência órfã) é o check 7', () => {
  it('Actus 431 (dependência 430, cujo arquivo não existe mais hoje, lida do git): sem achado', () => {
    expect(regra(rodar('b', 'Actus', '431'), '7')).toEqual([]);
  });

  it('dependência que não é id da fila: ERRO', () => {
    const v = regra(rodar('b', 'Actus', '431', (t) => (t.dependencias = ['999'])), '7');
    expect(v.map((x) => [x.mensagem, x.aviso ?? false])).toEqual([["'999' não é id de ticket da fila nem 'humano:<token>'", false]]);
  });
});

describe('7d1b-4 · C9, C11 e C12 (o ticket contra a árvore)', () => {
  // A calibração marcou o Actus 502 comparando main e staging-auto no instante
  // da escrita; na BASE da execução (pai do merge) o arquivo já existia. O
  // corpus usa a base, que é o que a worktree viu: o C9 dele é o Comarka 057.
  it("C9: Comarka 057 ('src/lib/carteira/ranking.ts' está na main e não na base da execução) — aviso", () => {
    const v = regra(rodar('a', 'Comarka', '057'), 'C9');
    expect(v.map((x) => x.mensagem).join(' ')).toMatch(/'src\/lib\/carteira\/ranking\.ts' existe no checkout mas não na branch alvo/);
    expect(v.every((x) => x.aviso)).toBe(true);
    expect(regra(rodar('a', 'Actus', '502'), 'C9')).toEqual([]);
  });

  it('C9: o ticket que declara "NOVO <caminho>" não é acusado por ele', () => {
    const v = rodar('a', 'Comarka', '057', (t) => {
      t.objetivo = `${String(t.objetivo)} NOVO src/lib/carteira/ranking.ts`;
    });
    expect(regra(v, 'C9').map((x) => x.mensagem).join(' ')).not.toMatch(/ranking\.ts'/);
  });

  it('C11: Comarka 402 (vercel.json citado em 3 testes fora da allowlist) — aviso, nomeando os testes', () => {
    const v = regra(rodar('b', 'Comarka', '402'), 'C11');
    expect(v.length).toBe(1);
    expect(v[0]!.aviso).toBe(true);
    expect(v[0]!.mensagem).toMatch(/vercel\.json .*test\/crons-meta-consolidacao\.test\.ts/);
  });

  it('C11: teste que já está na allowlist não conta', () => {
    const v = rodar('b', 'Comarka', '402', (t) => {
      (t.pathspec_allowlist as string[]).push(
        'test/crons-meta-consolidacao.test.ts',
        'test/n8n-fase1.test.ts',
        'test/n8n-fase2.test.ts',
      );
    });
    expect(regra(v, 'C11')).toEqual([]);
  });

  it('C12: item sem extensão que não existe e cujo diretório pai também não — aviso; pai existente não acusa', () => {
    const v = rodar('b', 'Comarka', '402', (t) => {
      (t.pathspec_allowlist as string[]).push('nao/existe/pasta', 'test/pasta-nova');
    });
    expect(regra(v, 'C12').map((x) => [x.mensagem.split(' ')[0], x.aviso])).toEqual([["'nao/existe/pasta'", true]]);
  });
});

describe('7d1b-4 · em produção o contexto vem do git e do disco do checkout da fila', () => {
  it('repo com main à frente da branch alvo: C9, C11 e C12 pelo CLI, como o pré-voo roda', () => {
    const raiz = mkdtempSync(join(tmpdir(), 'orq-ctx-'));
    const sh = (c: string) => execSync(c, { cwd: raiz, stdio: 'pipe' });
    mkdirSync(join(raiz, 'docs', 'fila'), { recursive: true });
    mkdirSync(join(raiz, 'src'), { recursive: true });
    mkdirSync(join(raiz, 'test'), { recursive: true });
    writeFileSync(join(raiz, 'src', 'calculadora.ts'), 'export const x = 1\n');
    writeFileSync(join(raiz, 'test', 'calculadora-soma.test.ts'), "import '../src/calculadora'\n");
    const cfg = JSON.parse(readFileSync(join(REPO_ROOT, 'fixture', 'docs', 'fila', '000-config.json'), 'utf8'));
    cfg.branch_alvo = 'staging-auto';
    writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg));
    sh('git init -q -b main . && git add -A && git -c user.email=t@t -c user.name=t commit -qm base && git branch staging-auto');
    // main anda sem a branch alvo: src/novo.ts só existe no checkout
    writeFileSync(join(raiz, 'src', 'novo.ts'), 'export const y = 2\n');
    const t = {
      id: '901', slug: 'ctx', status: 'pendente', objetivo: 'mexe na calculadora',
      pathspec_allowlist: ['src/calculadora.ts', 'src/novo.ts', 'lib/inexistente/pasta'], dependencias: [],
      criterios_aceite: [{ tipo: 'alvo', descricao: 'c', cmd: 'test -f src/calculadora.ts && echo ok', espera: 'ok' }],
    };
    writeFileSync(join(raiz, 'docs', 'fila', '901-ctx.md'), `# 901\n\n\`\`\`json\n${JSON.stringify(t)}\n\`\`\`\n`);
    sh('git add -A && git -c user.email=t@t -c user.name=t commit -qm main-anda');
    const r = spawnSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), [join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts'), '--fila', join(raiz, 'docs', 'fila'), '--pendentes'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toMatch(/901-ctx\.md:pathspec_allowlist AVISO \(C9\): 'src\/novo\.ts' existe no checkout mas não na branch alvo 'staging-auto'/);
    expect(r.stdout).toMatch(/AVISO \(C11\): a allowlist toca src\/calculadora\.ts \(basename 'calculadora'\), citado em test\/calculadora-soma\.test\.ts/);
    expect(r.stdout).toMatch(/AVISO \(C12\): 'lib\/inexistente\/pasta' não casa arquivo nem diretório da branch alvo/);
  });
});
