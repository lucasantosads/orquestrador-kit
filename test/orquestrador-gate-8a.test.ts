/**
 * Etapa 8a — validador na entrada: barrar na criação o ticket que vai precisar
 * de resgate por critério ou por allowlist (medição do Comarka de 04 a 17/10,
 * `~/orq-sessoes/relatorio-kit-etapa8a.md`).
 *
 * As fixtures em `test/fixtures/gate-ticket-8a/` são os tickets reais, copiados
 * verbatim do commit em que entraram na fila (a origem de cada um está no
 * `ORIGEM.md` da pasta). O controle negativo de cada regra é um done da P1r
 * (aprovado de primeira, na versão que rodou).
 */
import { describe, it, expect } from 'vitest';
import { execSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { REPO_ROOT } from './fixtures/orq-harness.js';
import { carregarCfg, lerFila, validarTicket, REGRAS, type GateCfg, type Violacao } from '../scripts/orquestrador/gate-ticket.js';

const FIX = join(REPO_ROOT, 'test', 'fixtures', 'gate-ticket-8a');
// O Comarka não tem `gate_ticket` no config: o gate roda com a tabela pura.
const CFG: GateCfg = { proibido_no_cmd: [], cmd_prefixos_permitidos: [], branch_alvo: 'staging-auto' };

function rodar(pasta: string, id: string): Violacao[] {
  const fila = lerFila(join(FIX, pasta));
  const alvo = fila.find((t) => t.arquivo.split('/').pop()!.startsWith(`${id}-`));
  if (!alvo) throw new Error(`${id} não está em ${pasta}`);
  return validarTicket(alvo, fila, CFG, null);
}
const regra = (v: Violacao[], r: string) => v.filter((x) => x.regra === r);

describe('8a-P3 · C14: v=$(grep -c …) && com v podendo valer 0 no estado certo', () => {
  // Com zero matches o grep -c imprime 0 e sai 1; a atribuição herda o rc e o
  // && corta a cadeia: o critério reprova exatamente no estado certo.
  it.each([
    ['924b', 'criterios_aceite[6]'],
    ['924c', 'criterios_aceite[5]'],
    ['924d', 'criterios_aceite[5]'],
    ['924f', 'criterios_aceite[7]'],
  ])('%s (versão de entrada) dispara C14 como erro em %s', (id, campo) => {
    const v = regra(rodar('c14', id), 'C14');
    expect(v.map((x) => x.campo)).toEqual([campo]);
    expect(v.every((x) => !x.aviso && !x.isencao)).toBe(true);
  });

  it('926b: grep -c encadeado, mas as variáveis esperam ≥ 1 — a cadeia cortada já é reprova certa; não dispara', () => {
    expect(regra(rodar('c14', '926b'), 'C14')).toEqual([]);
  });

  it('999c: grep -c separado por ; (o resgate foi de premissa) — não dispara', () => {
    expect(regra(rodar('c14', '999c'), 'C14')).toEqual([]);
  });

  it('922b (controle negativo P1r, rodou de primeira): grep -c | awk — o rc é do awk; não dispara', () => {
    expect(regra(rodar('c14', '922b'), 'C14')).toEqual([]);
  });

  it('a tabela registra C14 como erro, com o FP medido no porque', () => {
    expect(REGRAS.C14?.severidade).toBe('erro');
    expect(REGRAS.C14?.porque).toMatch(/0\/368/);
  });
});

describe('8a-P2 · C13: origin/ em critério (a worktree nasce da branch_alvo local)', () => {
  it('1004 (versão de entrada) dispara C13 como aviso nos 3 critérios com origin/staging-auto, com a dica da branch local', () => {
    const v = regra(rodar('c13', '1004'), 'C13');
    expect(v.map((x) => x.campo)).toEqual(['criterios_aceite[1]', 'criterios_aceite[2]', 'criterios_aceite[3]']);
    expect(v.every((x) => x.aviso)).toBe(true);
    expect(v[0]!.mensagem).toContain("'staging-auto' local");
  });

  it('1012 (controle negativo P1r): merge-base com a branch local — não dispara', () => {
    expect(regra(rodar('c13', '1012'), 'C13')).toEqual([]);
  });

  it('a tabela registra C13 como aviso, com o FP e a condição para virar erro no porque', () => {
    expect(REGRAS.C13?.severidade).toBe('aviso');
    expect(REGRAS.C13?.porque).toMatch(/120\/368/);
    expect(REGRAS.C13?.porque).toMatch(/erro para ticket novo/);
  });
});

/**
 * Um repo git temporário com a árvore reduzida de um caso (`c11/<pasta>`, sufixo
 * `.fixture` tirado) na branch `staging-auto`, e a fila dentro dele. `antes` mexe
 * nos arquivos antes do commit; `depois`, só no disco (o checkout), depois dele.
 */
function repoDoCaso(pasta: string, antes: (raiz: string) => void = () => {}, depois: (raiz: string) => void = () => {}): string {
  const raiz = mkdtempSync(join(tmpdir(), `orq-8a-${pasta}-`));
  cpSync(join(FIX, 'c11', pasta), raiz, { recursive: true });
  const tirarSufixo = (d: string) => {
    for (const n of readdirSync(d)) {
      const p = join(d, n);
      if (statSync(p).isDirectory()) tirarSufixo(p);
      else if (n.endsWith('.fixture')) renameSync(p, p.slice(0, -'.fixture'.length));
    }
  };
  tirarSufixo(raiz);
  writeFileSync(join(raiz, 'docs', 'fila', '000-config.json'), JSON.stringify({ branch_alvo: 'staging-auto' }));
  antes(raiz);
  execSync('git init -q -b staging-auto . && git add -A && git -c user.email=t@t -c user.name=t commit -qm arvore', { cwd: raiz, stdio: 'pipe' });
  depois(raiz);
  return raiz;
}

function rodarRepo(raiz: string, id: string, ajuste: (t: Record<string, unknown>) => void = () => {}): Violacao[] {
  const dir = join(raiz, 'docs', 'fila');
  const fila = lerFila(dir);
  const alvo = fila.find((t) => t.arquivo.split('/').pop()!.startsWith(`${id}-`))!;
  const t = structuredClone({ ...alvo.json!, status: 'pendente' });
  ajuste(t);
  const eu = { arquivo: alvo.arquivo, json: t };
  return validarTicket(eu, fila.map((x) => (x === alvo ? eu : x)), carregarCfg(dir));
}

describe('8a-P1 · C11 v2: import direto resolvido (relativo e paths do tsconfig) e citação, itens de src/', () => {
  it('950 (versão de entrada): etapa2-funil-motor importa @/lib/qualificacao/motor — aviso, marcado como conferido', () => {
    const v = regra(rodarRepo(repoDoCaso('950-entrada'), '950'), 'C11');
    expect(v.length).toBe(1);
    expect(v[0]!.aviso).toBe(true);
    expect(v[0]!.mensagem).toContain('src/lib/qualificacao/motor.ts');
    expect(v[0]!.mensagem).toContain('test/etapa2-funil-motor.test.ts (declarado conferido; em 13 de 19 resgates medidos o conferido quebrou)');
    // etapa2-motor-fases também importa o motor, mas está na allowlist
    expect(v[0]!.mensagem).not.toContain('etapa2-motor-fases');
  });

  it('1006 (versão de entrada): quem-cuida importa alertas-campanha/route e cita performance/route.ts', () => {
    const v = regra(rodarRepo(repoDoCaso('1006-entrada'), '1006'), 'C11');
    const msg = v.map((x) => x.mensagem).join('\n');
    expect(msg).toMatch(/src\/app\/api\/clientes\/alertas-campanha\/route\.ts.*test\/quem-cuida\.test\.ts/);
    expect(msg).toMatch(/src\/app\/api\/clientes\/performance\/route\.ts.*test\/quem-cuida\.test\.ts/);
  });

  it('840 (árvore do pré-voo): nps-reacao-resposta, que nasceu depois da entrada e não está em conferidos', () => {
    const v = regra(rodarRepo(repoDoCaso('840-prevoo'), '840'), 'C11');
    const msg = v.map((x) => x.mensagem).join('\n');
    expect(msg).toContain('test/nps-reacao-resposta.test.ts');
    expect(msg).not.toMatch(/nps-reacao-resposta\.test\.ts \(declarado conferido/);
  });

  it('844 (controle negativo P1r): cron-paths-vercel só contém o basename nps-disparo — não dispara (a C11 antiga disparava)', () => {
    expect(regra(rodarRepo(repoDoCaso('844-controle'), '844'), 'C11')).toEqual([]);
  });

  it('lê a branch_alvo, não o disco do checkout', () => {
    const raiz = repoDoCaso('950-entrada', () => {}, (r) => {
      rmSync(join(r, 'test', 'etapa2-funil-motor.test.ts'));
      writeFileSync(join(r, 'test', 'so-no-disco.test.ts'), "import { qualificarLead } from '../src/lib/qualificacao/motor'\n");
    });
    const msg = regra(rodarRepo(raiz, '950'), 'C11').map((x) => x.mensagem).join('\n');
    expect(msg).toContain('test/etapa2-funil-motor.test.ts');
    expect(msg).not.toContain('so-no-disco');
  });

  it('"dentro" é matchesAllowlist: glob da allowlist cobre o teste', () => {
    const v = rodarRepo(repoDoCaso('950-entrada'), '950', (t) => {
      (t.pathspec_allowlist as string[]).push('test/etapa2-*.test.ts');
    });
    expect(regra(v, 'C11')).toEqual([]);
  });

  it('import relativo resolve; item fora de src/ não entra (variante c15, não a híbrida)', () => {
    const raiz = repoDoCaso('950-entrada', (r) => {
      writeFileSync(join(r, 'vercel.json'), '{}\n');
      writeFileSync(join(r, 'test', 'le-vercel.test.ts'), "const v = readFileSync('vercel.json')\n");
      writeFileSync(join(r, 'test', 'relativo.test.ts'), "import { qualificarLead } from '../src/lib/qualificacao/motor'\n");
    });
    const msg = regra(rodarRepo(raiz, '950', (t) => (t.pathspec_allowlist as string[]).push('vercel.json')), 'C11')
      .map((x) => x.mensagem)
      .join('\n');
    expect(msg).toContain('test/relativo.test.ts');
    expect(msg).not.toContain('le-vercel');
  });

  it('--relatorio lista os testes vizinhos do ticket (insumo da 8c)', () => {
    const raiz = repoDoCaso('950-entrada');
    const r = spawnSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), [join(REPO_ROOT, 'scripts', 'orquestrador', 'gate-ticket.ts'), '--fila', join(raiz, 'docs', 'fila'), '--relatorio', '950'], { encoding: 'utf8' });
    expect(r.status, r.stderr).toBe(0);
    expect(r.stdout).toContain('testes_vizinhos (C11): ["test/etapa2-funil-motor.test.ts"]');
  });

  it('a tabela: C11 aviso, com o FP medido na 8a no porque (não mais o 9/4/122 da calibração do Comarka)', () => {
    expect(REGRAS.C11?.severidade).toBe('aviso');
    expect(REGRAS.C11?.porque).toMatch(/180\/368/);
    expect(REGRAS.C11?.porque).not.toMatch(/9\/4\/122/);
  });
});
