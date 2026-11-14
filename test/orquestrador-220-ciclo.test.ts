/**
 * Etapa 2.2.0 · o ciclo no local-loop.sh: pré-voo -> planejador -> drenagem ->
 * promotor -> avisos e relatório. Aqui a fiação: as etapas do local-loop.sh
 * chamam o autonomo.ts com o checkout, o config e a worktree da alvo, com um
 * `claude` falso no PATH (o runner real do autonomo.ts, sem injeção).
 *
 * Pronto quando: etapa_planejador escreve o lote (pendente, commitado na
 * principal), etapa_promotor promove o que está na alvo e etapa_ciclo_fim
 * chama o hook uma vez com o relatório. Controle: com o planejador desligado
 * e o promotor em modo humano, nenhum claude é chamado e a principal não anda.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { REPO_ROOT } from './fixtures/orq-harness.js'
import { criarRepoAutonomo } from './fixtures/autonomo-repo.js'

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh')

function stubClaude(dir: string, respostas: Record<string, unknown>) {
  mkdirSync(dir, { recursive: true })
  for (const [k, v] of Object.entries(respostas)) {
    const texto = `ok\n\n\`\`\`json\n${JSON.stringify(v)}\n\`\`\`\n`
    writeFileSync(join(dir, `${k}.json`), JSON.stringify({ type: 'result', is_error: false, result: texto, total_cost_usd: 0.01, usage: { input_tokens: 1, output_tokens: 1 } }))
  }
  writeFileSync(
    join(dir, 'claude'),
    `#!/bin/bash
p=''; while [ $# -gt 0 ]; do [ "$1" = -p ] && { p="$2"; shift; }; shift; done
echo "$(printf '%s' "$p" | head -1)" >> '${dir}/chamadas.log'
case "$p" in
  'PAPEL: planejador'*) cat '${dir}/planejador.json' ;;
  'PAPEL: juiz de lote'*) cat '${dir}/juiz-lote.json' ;;
  'PAPEL: juiz de promoção'*) cat '${dir}/juiz-promocao.json' ;;
  *) exit 1 ;;
esac
`,
  )
  chmodSync(join(dir, 'claude'), 0o755)
}

function etapas(repo: string, bin: string) {
  return spawnSync(
    'bash',
    ['-c', ['export LOCAL_LOOP_SOURCED=1', `source "${LOOP}"`, 'set +e', 'exec >/dev/null 2>&1', 'ciclo_marcar_inicio', 'etapa_planejador', 'etapa_promotor', 'etapa_ciclo_fim'].join('\n')],
    { encoding: 'utf8', cwd: repo, env: { ...process.env, ORQ_EXEC_ROOT: repo, PATH: `${bin}:${process.env.PATH}`, ORQ_TESTE: '1' }, timeout: 120_000 },
  )
}

describe('2.2.0 · ciclo autônomo no local-loop.sh', () => {
  it('planejador escreve, promotor promove, ciclo-fim chama o hook com o relatório', () => {
    const fx = criarRepoAutonomo()
    const hook = join(fx.base, 'hook.log')
    const cfgArq = join(fx.repo, 'docs', 'fila', '000-config.json')
    const cfg = JSON.parse(readFileSync(cfgArq, 'utf8'))
    cfg.avisos = { hook_cmd: `{ cat; printf '\\n'; } >> '${hook}'` }
    writeFileSync(cfgArq, JSON.stringify(cfg, null, 2))
    fx.g(fx.repo, 'commit', '-qam', 'config com hook')
    // algo já mergeado na alvo para o promotor levar
    fx.g(fx.alvoWt, 'merge', '-q', '--ff-only', 'main')
    writeFileSync(join(fx.alvoWt, 'src', 'base.ts'), 'export const base = 2\n')
    fx.g(fx.alvoWt, 'commit', '-qam', 'orq: frente/000 (ticket 000) em staging-auto', '-m', 'Orq-Ticket: 000')
    const bin = join(fx.base, 'bin')
    stubClaude(bin, {
      planejador: {
        tickets: [
          {
            titulo: 'convite', slug: 'convite', prosa: 'x',
            objetivo: 'Crie src/usuarios/convite.ts exportando convidar e o teste test/usuarios/convite.test.ts.',
            pathspec_allowlist: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
            cria_novo: ['src/usuarios/convite.ts', 'test/usuarios/convite.test.ts'],
            dependencias: [], diff_estimado: 100,
            criterios_aceite: [
              { tipo: 'alvo', descricao: 'existe', cmd: "grep -c 'export function convidar' src/usuarios/convite.ts", espera: '1' },
              { tipo: 'avaliador', descricao: 'avaliador: ok.', cmd: 'true', espera: 'avaliador' },
            ],
          },
        ],
      },
      'juiz-lote': { vereditos: [{ id: '001', aprovado: true, motivo: 'ok' }] },
      'juiz-promocao': { aprovar: true, motivos: [], resumo: 'base 2' },
    })
    const r = etapas(fx.repo, bin)
    expect(r.status, r.stderr).toBe(0)
    const t = readFileSync(join(fx.repo, 'docs', 'fila', '001-convite.md'), 'utf8')
    expect(t).toMatch(/"status": "pendente"/)
    expect(fx.g(fx.repo, 'log', '--format=%s', '-5', 'main').out).toMatch(/fila: planejador B0-F2/)
    expect(fx.g(fx.repo, 'show', 'main:src/base.ts').out).toBe('export const base = 2\n')
    expect(readFileSync(join(bin, 'chamadas.log'), 'utf8').trim().split('\n')).toEqual([
      'PAPEL: planejador do orquestrador (escreve tickets; nunca código).',
      'PAPEL: juiz de lote do orquestrador. Contexto limpo: você só vê o que está abaixo.',
      'PAPEL: juiz de promoção do orquestrador. Contexto limpo: você só vê o que está abaixo.',
    ])
    const h = readFileSync(hook, 'utf8').trim().split('\n').map((l) => JSON.parse(l))
    expect(h).toHaveLength(1)
    expect(h[0].dados.relatorio_md).toContain('promoção: promovido')
  }, 180_000)

  it('controle: planejador desligado e promotor humano: nenhum claude, principal parada', () => {
    const fx = criarRepoAutonomo({ loops: { executor: { ativo: true }, planejador: { ativo: false } }, promotor: { modo: 'humano' } })
    writeFileSync(join(fx.alvoWt, 'src', 'base.ts'), 'export const base = 2\n')
    fx.g(fx.alvoWt, 'commit', '-qam', 'x')
    const antes = fx.g(fx.repo, 'rev-parse', 'main').out
    const bin = join(fx.base, 'bin')
    stubClaude(bin, {})
    expect(etapas(fx.repo, bin).status).toBe(0)
    expect(existsSync(join(bin, 'chamadas.log'))).toBe(false)
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(antes)
  }, 120_000)
})
