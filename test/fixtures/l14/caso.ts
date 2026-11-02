/**
 * Harness da etapa L14: repo sintético com um ticket REAL (`test/fixtures/l14/<id>/ticket.json`,
 * copiado do Comarka ou do dashboard) e os arquivos da BASE real daquele ticket
 * (`base/*.txt`, blobs do `git show <base>:<caminho>`). `drive_ticket` de verdade;
 * agente STUB por roteiro de shell; juiz interceptado.
 *
 * Os critérios reais que chamam `npx`, `tsc` ou o `git` da frente ficam de fora
 * (`criterios`: os índices mantidos): no repo sintético o `npx` iria à rede.
 */
import { existsSync, mkdirSync, mkdtempSync, readFileSync, symlinkSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { REPO_ROOT, configDeReferencia } from '../orq-harness.js';

const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh');
export const FX_L14 = join(REPO_ROOT, 'test', 'fixtures', 'l14');

export interface Caso {
  fx: string;
  id: string;
  arquivo: string;
}

export interface OpcoesCaso {
  /** caminho no repo → arquivo em `test/fixtures/l14/<id>/base/` */
  base?: Record<string, string>;
  /** índices de `criterios_aceite` mantidos; ausente = todos */
  criterios?: number[];
  /** troca o ticket real antes de gravar (ex.: renomear recon_esperado) */
  ajuste?: (t: Record<string, unknown>) => void;
}

export function ticketReal(id: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(FX_L14, id, 'ticket.json'), 'utf8')) as Record<string, unknown>;
}

export function repoL14(id: string, o: OpcoesCaso = {}): Caso {
  const tmp = mkdtempSync(join(tmpdir(), `orq-l14-${id}-`));
  const fx = join(tmp, 'repo');
  mkdirSync(join(fx, 'docs', 'fila', 'runs'), { recursive: true });
  mkdirSync(join(tmp, '_worktrees'), { recursive: true });
  const cfg = JSON.parse(configDeReferencia()) as Record<string, unknown> & {
    _execucao_dos_gates: Record<string, unknown>;
  };
  cfg.gates = [];
  cfg._execucao_dos_gates = { ...cfg._execucao_dos_gates, ordem_obrigatoria: [] };
  cfg.max_retries = 1;
  writeFileSync(join(fx, 'docs', 'fila', '000-config.json'), JSON.stringify(cfg, null, 2));
  const t = ticketReal(id);
  t.status = 'pendente';
  t.dependencias = [];
  t.notas_status = '';
  if (o.criterios) t.criterios_aceite = o.criterios.map((i) => (t.criterios_aceite as unknown[])[i]);
  o.ajuste?.(t);
  const arquivo = `${id}-${String(t.slug)}.md`;
  writeFileSync(join(fx, 'docs', 'fila', arquivo), `# ${id}\n\n\`\`\`json\n${JSON.stringify(t, null, 2)}\n\`\`\`\n`);
  writeFileSync(join(fx, 'base.txt'), 'base\n');
  for (const [caminho, origem] of Object.entries(o.base ?? {})) {
    mkdirSync(dirname(join(fx, caminho)), { recursive: true });
    copyFileSync(join(FX_L14, id, 'base', origem), join(fx, caminho));
  }
  const g = (...a: string[]) =>
    spawnSync('git', ['-C', fx, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' });
  g('init', '-q', '-b', 'main');
  g('add', '-A');
  g('commit', '-qm', 'base');
  g('branch', String(cfg.branch_alvo));
  mkdirSync(join(fx, 'node_modules', '.bin'), { recursive: true });
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(fx, 'node_modules', '.bin', 'tsx'));
  symlinkSync(join(REPO_ROOT, 'scripts'), join(fx, 'scripts'));
  writeFileSync(join(fx, '.git', 'info', 'exclude'), 'node_modules\nscripts\n.roteiro*\n.juiz-chamadas\n.agente-chamadas\n');
  return { fx, id, arquivo };
}

/**
 * Uma drenagem (`drive_ticket`). Cada passo do roteiro é o shell que o agente
 * roda na worktree naquela tentativa. Env extra vai para o executor.
 */
export function drenagemL14(c: Caso, roteiro: string[], env: Record<string, string> = {}): string {
  const { fx } = c;
  roteiro.forEach((p, i) => writeFileSync(join(fx, `.roteiro-${i}`), p + '\n'));
  writeFileSync(join(fx, '.roteiro-n'), '0\n');
  const stub = `echo x >> '${fx}/.agente-chamadas'; n="$(cat '${fx}/.roteiro-n')"; echo $((n + 1)) > '${fx}/.roteiro-n'; bash '${fx}/.roteiro-'"$n"`;
  const juiz = JSON.stringify({ aprovado: false, motivo: 'reprovado pelo juiz do teste', criterios_falhos: ['x'] });
  const script = `
    source '${EXECUTOR}'
    set +e
    STUB="$ORQ_TESTE_STUB"
    claude_run() { echo 'TESTE: claude_run REAL chamado' >&2; exit 97; }
    ticket_commit() { return 0; }
    cooldown_arm() { return 0; }
    run_juiz() {
      local rundir="$3"
      echo x >> '${fx}/.juiz-chamadas'
      printf '%s\\n' '${juiz}' > "$rundir/juiz.veredito.json"
      JUIZ_ROU=1; JUIZ_APROVADO=false; JUIZ_ILEGIVEL=0
      JUIZ_MOTIVO="$(jq -r '.motivo' "$rundir/juiz.veredito.json")"
      JUIZ_FALHOS="$(jq -r '.criterios_falhos[]' "$rundir/juiz.veredito.json" | paste -sd';' - | sed 's/;/; /g')"
    }
    drive_ticket "$(ticket_file_by_id ${c.id})"
  `;
  const r = spawnSync('bash', ['-c', script], {
    encoding: 'utf8',
    cwd: fx,
    env: { ...process.env, ORQ_EXEC_ROOT: fx, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_TESTE_STUB: stub, ...env },
  });
  return `${r.stdout ?? ''}${r.stderr ?? ''}`;
}

export function ticketDoCaso(c: Caso): Record<string, unknown> {
  const md = readFileSync(join(c.fx, 'docs', 'fila', c.arquivo), 'utf8');
  return JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)![1]!) as Record<string, unknown>;
}

const contar = (f: string) => (existsSync(f) ? readFileSync(f, 'utf8').split('\n').filter(Boolean).length : 0);
export const chamadasDoJuiz = (c: Caso) => contar(join(c.fx, '.juiz-chamadas'));
export const chamadasDoAgente = (c: Caso) => contar(join(c.fx, '.agente-chamadas'));
export const eventos = (c: Caso) => {
  const f = join(c.fx, 'docs', 'fila', 'runs', 'events.log');
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
};
export const prevooTxt = (c: Caso) => {
  const f = join(c.fx, 'docs', 'fila', 'runs', c.id, 'prevoo.txt');
  return existsSync(f) ? readFileSync(f, 'utf8') : '';
};
