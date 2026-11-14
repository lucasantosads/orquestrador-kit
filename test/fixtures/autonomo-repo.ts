/**
 * Repo de fixture da operação autônoma (etapa 2.2.0): git de verdade com
 * `main` e `staging-auto` (worktree própria, como a drenagem usa), um mapa com
 * B0-F1 concluída, B0-F2 pronta e B0-F3 rascunho (deps B0-F2), uma fila com
 * config e o `tsx` linkado. Nenhum claude de verdade: o runner é injetado.
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { Ctx, RespostaClaude, RodarClaude } from '../../scripts/orquestrador/autonomo.js'
import { configDeReferencia, REPO_ROOT } from './orq-harness.js'

export interface RepoAutonomo {
  base: string
  repo: string
  alvoWt: string
  g: (cwd: string, ...a: string[]) => { rc: number; out: string }
  ctx: (claude: RodarClaude, extra?: Record<string, unknown>) => Ctx
  chamadas: { papel: string; args: string[] }[]
}

export const MAPA = {
  $schema_versao: 1,
  projeto: 'fixture',
  blocos: [
    {
      id: 'B0',
      nome: 'Fundação',
      por_que: 'fixture',
      dod: ['a fixture roda'],
      gates_humanos: [],
      status: 'em_andamento',
      frentes: [
        { id: 'B0-F1', entrega: 'base', allowlist: ['src/base.ts'], cria_novo: false, deps: [], adrs: [], status: 'concluida', tickets_estimados: 1, lotes_descartados_consecutivos: 0 },
        { id: 'B0-F2', entrega: 'usuários e convite por e-mail', allowlist: ['src/usuarios/**', 'test/usuarios/**', 'supabase/migrations/0009_x.sql'], cria_novo: true, deps: ['B0-F1'], adrs: [], status: 'pronta', tickets_estimados: 3, lotes_descartados_consecutivos: 0 },
        { id: 'B0-F3', entrega: 'teses', allowlist: ['src/teses/**', 'supabase/migrations/01*_seed_teses.sql'], cria_novo: true, deps: ['B0-F2'], adrs: [], status: 'rascunho', tickets_estimados: 2, lotes_descartados_consecutivos: 0 },
      ],
    },
    {
      id: 'B1',
      nome: 'Próximo',
      por_que: 'fixture',
      dod: ['x'],
      gates_humanos: [],
      status: 'rascunho',
      frentes: [{ id: 'B1-F1', entrega: 'painel', allowlist: ['src/painel/**'], cria_novo: true, deps: ['B0-F2'], adrs: [], status: 'rascunho', tickets_estimados: 1, lotes_descartados_consecutivos: 0 }],
    },
  ],
}

export const MAPA_MD = [
  '# Mapa',
  '',
  '| Frente | Entrega | Allowlist | Deps | Tickets | Status |',
  '|---|---|---|---|---|---|',
  '| B0-F1 | base | `src/base.ts` | — | 1 | concluida |',
  '| B0-F2 | usuários | `src/usuarios/**` | B0-F1 | 3 | pronta |',
  '| B0-F3 | teses | `src/teses/**` | B0-F2 | 2 | rascunho |',
  '| B1-F1 | painel | `src/painel/**` | B0-F2 | 1 | rascunho |',
  '',
].join('\n')

export function ticketDone(id: string, frente: string, objetivo: string): string {
  const j = { id, bloco: 'B0', frente, slug: `t-${id}`, origem: 'humano', status: 'done', objetivo, pathspec_allowlist: ['src/usuarios/lista.ts'], dependencias: [], criterios_aceite: [] }
  return `# Ticket ${id}\n\n## Campos de máquina\n\n\`\`\`json\n${JSON.stringify(j, null, 2)}\n\`\`\`\n`
}

export function criarRepoAutonomo(cfgExtra: Record<string, unknown> = {}): RepoAutonomo {
  const base = realpathSync(mkdtempSync(join(tmpdir(), 'orq-autonomo-')))
  const repo = join(base, 'repo')
  const g = (cwd: string, ...a: string[]) => {
    const r = spawnSync('git', ['-C', cwd, '-c', 'user.email=t@t', '-c', 'user.name=t', ...a], { encoding: 'utf8' })
    return { rc: r.status ?? 1, out: `${r.stdout ?? ''}${r.stderr ?? ''}` }
  }
  mkdirSync(join(repo, 'docs', 'fila', 'runs'), { recursive: true })
  mkdirSync(join(repo, 'docs', 'roadmap'), { recursive: true })
  mkdirSync(join(repo, 'src', 'usuarios'), { recursive: true })
  const cfg = JSON.parse(configDeReferencia()) as Record<string, any>
  cfg.branch_alvo = 'staging-auto'
  cfg.branch_principal = 'main'
  cfg.branch_protegida = 'main'
  cfg.worktrees_dir = '../_worktrees'
  cfg.worktrees_prefixo = 'fx-'
  cfg.mapa_json = 'docs/roadmap/mapa.json'
  cfg.mapa_md = 'docs/roadmap/MAPA.md'
  cfg.decisoes_file = 'docs/fila/decisoes-pendentes.md'
  cfg.gates = [{ nome: 'testes', cmd: 'test -f src/base.ts', tipo: 'exit_code', papel: 'testes' }]
  cfg.loops = { executor: { ativo: true }, sentinela: { ativo: false }, planejador: { ativo: true, modo: 'auto' } }
  cfg.planejador = { limiar_fila: 3, lote: 3, reserva_orcamento_pct: 20, regras_ticket: 'docs/fila/REGRAS-TICKET.md', liberacao_automatica: 'bloco_atual' }
  cfg.promotor = { modo: 'auto', modelo_juiz: 'opus', paths_gate_humano: ['supabase/migrations/**'], gates: ['testes'] }
  cfg.orcamento = { ...(cfg.orcamento ?? {}), usd_dia: 50, custo_file: 'docs/fila/runs/custo.json' }
  Object.assign(cfg, cfgExtra)
  writeFileSync(join(repo, 'docs', 'fila', '000-config.json'), `${JSON.stringify(cfg, null, 2)}\n`)
  writeFileSync(join(repo, 'docs', 'fila', 'REGRAS-TICKET.md'), '# Regras\n\n- REGRA-FIXTURE: teste de negação sempre com controle positivo no mesmo teste.\n')
  writeFileSync(join(repo, 'docs', 'fila', 'decisoes-pendentes.md'), '# Decisões pendentes\n\n')
  writeFileSync(join(repo, 'docs', 'roadmap', 'mapa.json'), `${JSON.stringify(MAPA, null, 2)}\n`)
  writeFileSync(join(repo, 'docs', 'roadmap', 'MAPA.md'), MAPA_MD)
  writeFileSync(join(repo, 'src', 'base.ts'), 'export const base = 1\n')
  writeFileSync(join(repo, 'src', 'usuarios', 'lista.ts'), 'export const lista = []\n')
  writeFileSync(join(repo, '.gitignore'), 'node_modules\ndocs/fila/runs/\ndocs/fila/PAUSAR\n')
  g(repo, 'init', '-q', '-b', 'main')
  g(repo, 'add', '-A')
  g(repo, 'commit', '-qm', 'base')
  g(repo, 'branch', 'staging-auto')
  mkdirSync(join(base, '_worktrees'), { recursive: true })
  const alvoWt = join(base, '_worktrees', 'fx-staging-auto')
  g(repo, 'worktree', 'add', '-q', alvoWt, 'staging-auto')
  mkdirSync(join(repo, 'node_modules', '.bin'), { recursive: true })
  symlinkSync(join(REPO_ROOT, 'node_modules', '.bin', 'tsx'), join(repo, 'node_modules', '.bin', 'tsx'))
  const chamadas: { papel: string; args: string[] }[] = []
  const ctx = (claude: RodarClaude, extra: Record<string, unknown> = {}): Ctx => {
    const c = JSON.parse(spawnSync('cat', [join(repo, 'docs', 'fila', '000-config.json')], { encoding: 'utf8' }).stdout) as Record<string, any>
    Object.assign(c, extra)
    return {
      checkout: repo,
      cfg: c,
      cfgPath: join(repo, 'docs', 'fila', '000-config.json'),
      filaDir: join(repo, 'docs', 'fila'),
      runsDir: join(repo, 'docs', 'fila', 'runs'),
      alvoWt,
      claude: (o) => {
        const p = o.args[o.args.indexOf('-p') + 1] ?? ''
        chamadas.push({ papel: /^PAPEL: (.+?)(?: do orquestrador| \(|\.)/.exec(p)?.[1] ?? '?', args: o.args })
        return claude(o)
      },
      agora: () => new Date(),
    }
  }
  return { base, repo, alvoWt, g, ctx, chamadas }
}

/** Resposta de modelo no formato do envelope de `claude -p --output-format json`. */
export function resposta(obj: unknown, custo = 0.1): RespostaClaude {
  const texto = `pronto.\n\n\`\`\`json\n${JSON.stringify(obj, null, 2)}\n\`\`\`\n`
  const envelope = { type: 'result', subtype: 'success', is_error: false, result: texto, total_cost_usd: custo, usage: { input_tokens: 10, output_tokens: 5 } }
  return { rc: 0, saida: JSON.stringify(envelope), texto, envelope }
}

/** Runner falso que responde por papel (o `PAPEL:` da 1ª linha do prompt). */
export function claudePorPapel(respostas: Record<string, (prompt: string) => RespostaClaude>): RodarClaude {
  return (o) => {
    const p = o.args[o.args.indexOf('-p') + 1] ?? ''
    for (const [papel, f] of Object.entries(respostas)) if (p.startsWith(`PAPEL: ${papel}`)) return f(p)
    return { rc: 1, saida: '', texto: '', envelope: null }
  }
}
