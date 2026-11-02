/**
 * Etapa L14b, P1: o template de ticket (`doutrina/templates/TICKET.md`, o que o
 * `--novo` copia para `docs/fila/_TEMPLATE.md`) ensina o campo `recon` que a
 * L14 passou a executar (`executor.sh:prevoo_exec`). Quem escreve ticket pelo
 * template não sabia o formato {cmd, espera}.
 *
 * "Passa no parser real" = o recon do exemplo, num ticket real (o 853 do
 * Comarka) dentro de `drive_ticket`, roda na worktree da alvo e dá `ok` quando
 * a base tem o que ele afirma; e diverge, com SPEC_DESATUALIZADA, quando não tem.
 */
import { it, expect } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { describeHarness, REPO_ROOT } from './fixtures/orq-harness.js';
import { drenagemL14, prevooTxt, repoL14, ticketDoCaso } from './fixtures/l14/caso.js';

const TEMPLATE = readFileSync(join(REPO_ROOT, 'doutrina', 'templates', 'TICKET.md'), 'utf8');
const exemplo = () => JSON.parse(/```json\n([\s\S]*?)\n```/.exec(TEMPLATE)![1]!) as Record<string, unknown>;

const CRIT = [
  { tipo: 'alvo', descricao: '/ vai para /portal', cmd: `grep -c 'redirect("/portal")' src/app/page.tsx`, espera: '1' },
  { tipo: 'avaliador', descricao: 'avaliador', cmd: 'true', espera: 'avaliador' },
];

/** O 853 com o recon do template; `arquivos` entram na base (e na alvo) por um commit. */
function casoTemplate(arquivos: Record<string, string>) {
  const c = repoL14('853', {
    base: { 'src/app/page.tsx': 'page-equipe-geral.tsx.txt' },
    ajuste: (t) => { t.criterios_aceite = CRIT; delete t.recon_esperado; t.recon = exemplo().recon; },
  });
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', c.fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  for (const [caminho, conteudo] of Object.entries(arquivos)) {
    mkdirSync(join(c.fx, caminho, '..'), { recursive: true });
    writeFileSync(join(c.fx, caminho), conteudo);
    g('add', caminho);
  }
  g('commit', '-qm', 'base do exemplo', '--allow-empty');
  const alvo = String((JSON.parse(readFileSync(join(c.fx, 'docs', 'fila', '000-config.json'), 'utf8')) as { branch_alvo: string }).branch_alvo);
  g('branch', '-f', alvo, 'HEAD');
  return c;
}

describeHarness('L14b P1: o template de ticket ensina recon', () => {
  it('o JSON de exemplo tem recon: array não vazio de {cmd, espera} string', () => {
    const recon = exemplo().recon as Array<Record<string, unknown>>;
    expect(Array.isArray(recon)).toBe(true);
    expect(recon.length).toBeGreaterThan(0);
    for (const r of recon) {
      expect(typeof r.cmd).toBe('string');
      expect(String(r.cmd).length).toBeGreaterThan(0);
      expect(typeof r.espera).toBe('string');
    }
  });

  it('o Dicionário tem a linha de recon: formato, opcional e SPEC_DESATUALIZADA', () => {
    const linha = TEMPLATE.split('\n').find((l) => l.startsWith('| `recon`'));
    expect(linha).toBeDefined();
    expect(linha).toMatch(/\{cmd, espera\}/);
    expect(linha).toMatch(/[Oo]pcional/);
    expect(linha).toMatch(/SPEC_DESATUALIZADA/);
  });

  it('parser real: o recon do exemplo roda no pré-voo e dá ok com a base que ele afirma', () => {
    const c = casoTemplate({ 'src/exemplo/index.ts': 'export const exemplo = 1;\n' });
    const log = drenagemL14(c, ['true', 'true']);
    expect(prevooTxt(c), log).toMatch(/### recon\[0\] -> ok/);
    expect(String(ticketDoCaso(c).notas_status)).not.toContain('SPEC_DESATUALIZADA');
  }, 180_000);

  it('contraprova: sem o que o recon afirma, a passada diverge e bloqueia', () => {
    const c = casoTemplate({});
    const log = drenagemL14(c, ['true']);
    expect(prevooTxt(c), log).toMatch(/### recon\[0\] -> DIVERGIU/);
    expect(ticketDoCaso(c).status).toBe('bloqueado');
    expect(String(ticketDoCaso(c).notas_status)).toContain('SPEC_DESATUALIZADA');
  }, 180_000);
});
