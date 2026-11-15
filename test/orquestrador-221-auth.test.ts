/**
 * Etapa 2.2.1, D6 · login do claude CLI expirado.
 *
 * Trilha real (repo instalado, runs/avisos.log, 15/11 15:04): o hook de avisos
 * chamou o claude e recebeu "Failed to authenticate: OAuth session expired and
 * could not be refreshed". Nada no motor tratava isso: cada chamada seguinte
 * (executor, juízes, planejador) falharia igual, disparo após disparo, e o
 * único aviso dependia do hook, que é justamente quem usa o claude.
 *
 * Pronto quando, com um `claude` falso que responde o erro de autenticação:
 *   - qualquer chamada (planejador, juiz de promoção, juiz do ticket no
 *     executor, sonda, hook) vira `AMBIENTE causa=auth`, cria a pausa do tipo
 *     auth (runs/.pausa-auth), manda a notificação NATIVA (mesmo com o canal do
 *     config sem notificação nativa) e enfileira o aviso tipo `ambiente` com
 *     "rodar claude e /login";
 *   - a tentativa do ticket não é consumida;
 *   - o disparo seguinte começa por uma sonda barata (haiku,
 *     --strict-mcp-config): passando, remove SÓ a pausa auth e segue; falhando,
 *     a pausa fica e nenhum ticket é tocado.
 */
import { describe, expect, it } from 'vitest'
import { spawnSync } from 'node:child_process'
import { chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { cicloFim, planejar, promover, type RespostaClaude } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta, type RepoAutonomo } from './fixtures/autonomo-repo.js'
import { REPO_ROOT } from './fixtures/orq-harness.js'

const ERRO_AUTH = 'Failed to authenticate. API Error: 401 {"type":"error","error":{"type":"authentication_error","message":"OAuth session expired and could not be refreshed"}}'
const ENVELOPE_AUTH = JSON.stringify({ type: 'result', subtype: 'success', is_error: true, result: ERRO_AUTH, total_cost_usd: 0 })
const respAuth = (): RespostaClaude => ({ rc: 1, saida: ENVELOPE_AUTH, texto: ERRO_AUTH, envelope: JSON.parse(ENVELOPE_AUTH) })

const LOOP = join(REPO_ROOT, 'scripts', 'orquestrador', 'local-loop.sh')
const EXECUTOR = join(REPO_ROOT, 'scripts', 'orquestrador', 'executor.sh')

const runs = (fx: RepoAutonomo) => join(fx.repo, 'docs', 'fila', 'runs')
const eventos = (fx: RepoAutonomo) => (existsSync(join(runs(fx), 'events.log')) ? readFileSync(join(runs(fx), 'events.log'), 'utf8') : '')
const avisos = (fx: RepoAutonomo) =>
  existsSync(join(runs(fx), 'avisos', 'ciclo.jsonl'))
    ? readFileSync(join(runs(fx), 'avisos', 'ciclo.jsonl'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : []

/** Notificação nativa falsa: o motor chama ORQ_NATIVO_CMD no lugar do osascript. */
function nativoFalso(fx: RepoAutonomo): { cmd: string; log: string } {
  const cmd = join(fx.base, 'osascript-falso')
  const log = join(fx.base, 'nativo.log')
  writeFileSync(cmd, `#!/bin/bash\nprintf '%s\\n' "$*" >> '${log}'\n`)
  chmodSync(cmd, 0o755)
  return { cmd, log }
}
const lerLog = (p: string) => (existsSync(p) ? readFileSync(p, 'utf8') : '')

/** `claude` falso no PATH: a sonda ("responda apenas: ok") responde conforme `sonda`; o resto, o erro de auth. */
function claudeFalso(fx: RepoAutonomo, sonda: 'ok' | 'auth', resto: 'ok' | 'auth' = 'auth'): string {
  const bin = join(fx.base, 'bin')
  mkdirSync(bin, { recursive: true })
  const ok = JSON.stringify({ type: 'result', subtype: 'success', is_error: false, result: 'ok', total_cost_usd: 0 })
  const responde = (m: 'ok' | 'auth') => (m === 'ok' ? `echo '${ok}'; exit 0` : `echo '${ENVELOPE_AUTH.replace(/'/g, `'\\''`)}'; exit 1`)
  writeFileSync(
    join(bin, 'claude'),
    `#!/bin/bash
printf '%s\\n' "$*" >> '${fx.base}/claude-argv.log'
case "$*" in
  *'responda apenas: ok'*) ${responde(sonda)} ;;
  *) ${responde(resto)} ;;
esac
`,
  )
  chmodSync(join(bin, 'claude'), 0o755)
  return bin
}

function confereAuth(fx: RepoAutonomo, nativoLog: string, papel: string) {
  expect(eventos(fx)).toMatch(new RegExp(` AMBIENTE causa=auth papel=${papel}`))
  expect(existsSync(join(runs(fx), '.pausa-auth'))).toBe(true)
  expect(lerLog(nativoLog)).toMatch(/login/i)
  const a = avisos(fx).find((x: any) => x.tipo === 'ambiente')
  expect(a).toBeTruthy()
  expect(a.texto).toContain('rodar claude e /login')
}

describe('2.2.1 D6 · autonomo.ts: falha de auth vira AMBIENTE e pausa auth', () => {
  it('planejador: nenhum candidato, pausa auth, notificação nativa e aviso ambiente', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    process.env.ORQ_NATIVO_CMD = n.cmd
    try {
      const r = planejar(fx.ctx(() => respAuth()))
      expect(r.escritos).toEqual([])
      expect(r.motivo).toBe('auth')
      confereAuth(fx, n.log, 'planejador')
    } finally {
      delete process.env.ORQ_NATIVO_CMD
    }
  }, 120_000)

  it('juiz de promoção: motivo auth, sem aviso promocao_recusada, principal intocada', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    writeFileSync(join(fx.alvoWt, 'src', 'usuarios', 'lista.ts'), 'export const lista = [1]\n')
    fx.g(fx.alvoWt, 'add', '-A')
    fx.g(fx.alvoWt, 'commit', '-qm', 'trabalho')
    const antes = fx.g(fx.repo, 'rev-parse', 'main').out
    process.env.ORQ_NATIVO_CMD = n.cmd
    try {
      const r = promover(fx.ctx(claudePorPapel({ 'juiz de promoção': () => respAuth() })))
      expect(r.motivo).toBe('auth')
      expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(antes)
      expect(avisos(fx).map((a: any) => a.tipo)).not.toContain('promocao_recusada')
      expect(eventos(fx)).not.toMatch(/PROMOCAO_RECUSADA/)
      confereAuth(fx, n.log, 'juiz_promocao')
    } finally {
      delete process.env.ORQ_NATIVO_CMD
    }
  }, 120_000)

  it('hook de avisos com o erro de auth: pausa auth e notificação nativa, sem depender do hook', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    const cfg = JSON.parse(readFileSync(join(fx.repo, 'docs', 'fila', '000-config.json'), 'utf8'))
    process.env.ORQ_NATIVO_CMD = n.cmd
    try {
      // uma novidade qualquer para o hook ser chamado
      mkdirSync(join(runs(fx), 'avisos'), { recursive: true })
      writeFileSync(join(runs(fx), 'avisos', 'ciclo.jsonl'), `${JSON.stringify({ tipo: 'push_pendente', nivel: 'acao', titulo: 'x', texto: 'y' })}\n`)
      cicloFim(fx.ctx(claudePorPapel({}), { avisos: { ...(cfg.avisos ?? {}), hook_cmd: `echo '${ERRO_AUTH.replace(/'/g, `'\\''`)}' >&2; exit 1` } }), 0)
      expect(eventos(fx)).toMatch(/ AMBIENTE causa=auth papel=hook/)
      expect(existsSync(join(runs(fx), '.pausa-auth'))).toBe(true)
      expect(lerLog(n.log)).toMatch(/login/i)
    } finally {
      delete process.env.ORQ_NATIVO_CMD
    }
  }, 120_000)

  it('controle: falha que não é de auth (rc 1, outro texto) não pausa', () => {
    const fx = criarRepoAutonomo()
    const r = planejar(fx.ctx(() => ({ rc: 1, saida: 'Error: connect ECONNREFUSED', texto: 'Error: connect ECONNREFUSED', envelope: null })))
    expect(r.motivo).not.toBe('auth')
    expect(existsSync(join(runs(fx), '.pausa-auth'))).toBe(false)
    expect(eventos(fx)).not.toMatch(/causa=auth/)
  }, 120_000)
})

describe('2.2.1 D6 · executor: juiz do ticket com auth expirada', () => {
  it('não consome tentativa, ticket segue pendente, pausa auth e notificação nativa com o canal sem nativo', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    const bin = claudeFalso(fx, 'ok', 'auth')
    const cfgArq = join(fx.repo, 'docs', 'fila', '000-config.json')
    const cfg = JSON.parse(readFileSync(cfgArq, 'utf8'))
    cfg.canal_notificacao = 'arquivo'
    cfg.gates = [{ nome: 'testes', cmd: 'true', tipo: 'exit', papel: 'testes' }]
    cfg._execucao_dos_gates = { ...(cfg._execucao_dos_gates ?? {}), ordem_obrigatoria: ['testes'] }
    writeFileSync(cfgArq, JSON.stringify(cfg, null, 2))
    const ticket = {
      id: '050', bloco: 'B0', frente: 'B0-F2', slug: 'auth', risco: 'baixo', status: 'pendente', origem: 'humano',
      objetivo: 'muda a lista', pathspec_allowlist: ['src/usuarios/lista.ts'], dependencias: [],
      criterios_aceite: [
        { tipo: 'alvo', descricao: 'a lista mudou', cmd: "grep -c 'lista = \\[1\\]' src/usuarios/lista.ts", espera: '1' },
        { tipo: 'avaliador', descricao: 'avaliador: fixture.', cmd: 'true', espera: 'avaliador' },
      ],
    }
    writeFileSync(join(fx.repo, 'docs', 'fila', '050-auth.md'), `# 050\n\n\`\`\`json\n${JSON.stringify(ticket, null, 2)}\n\`\`\`\n`)
    // enforcement.sh resolve o core por ORQ_EXEC_ROOT: o link aponta para o motor sob teste (molde do 632).
    symlinkSync(join(REPO_ROOT, 'scripts'), join(fx.repo, 'scripts'))
    writeFileSync(join(fx.repo, '.git', 'info', 'exclude'), 'node_modules\nscripts\n')
    fx.g(fx.repo, 'add', '-A')
    fx.g(fx.repo, 'commit', '-qm', 'ticket 050')
    fx.g(fx.alvoWt, 'merge', '-q', 'main')
    const script = `
      source '${EXECUTOR}'
      set +e
      STUB="echo 'export const lista = [1]' > src/usuarios/lista.ts"
      ticket_commit() { return 0; }
      cooldown_arm() { return 0; }
      drive_ticket "$(ticket_file_by_id 050)"
    `
    const r = spawnSync('bash', ['-c', script], {
      encoding: 'utf8',
      cwd: fx.repo,
      env: { ...process.env, ORQ_EXEC_ROOT: fx.repo, EXECUTOR_SOURCED: '1', ORQ_TESTE: '1', ORQ_NATIVO_CMD: n.cmd, PATH: `${bin}:${process.env.PATH}` },
      timeout: 180_000,
    })
    const log = `${r.stdout ?? ''}${r.stderr ?? ''}`
    const md = readFileSync(join(fx.repo, 'docs', 'fila', '050-auth.md'), 'utf8')
    const t = JSON.parse(/```json\n([\s\S]*?)\n```/.exec(md)![1]!)
    expect(lerLog(join(fx.base, 'claude-argv.log')), log).toMatch(/juiz|PAPEL|--max-turns/)
    expect(t.status, log).toBe('pendente')
    expect(t.tentativas ?? 0, log).toBe(0)
    expect(eventos(fx)).toMatch(/ AMBIENTE causa=auth/)
    expect(existsSync(join(runs(fx), '.pausa-auth'))).toBe(true)
    expect(lerLog(n.log)).toMatch(/login/i)
    expect(avisos(fx).find((a: any) => a.tipo === 'ambiente')?.texto).toContain('rodar claude e /login')
  }, 240_000)
})

describe('2.2.1 D6 · local-loop: sonda no início do disparo com a pausa auth', () => {
  function disparo(fx: RepoAutonomo, bin: string, n: { cmd: string }) {
    const marca = join(fx.base, 'passou-da-pausa')
    const r = spawnSync(
      'bash',
      ['-c', [
        'export LOCAL_LOOP_SOURCED=1', `source "${LOOP}"`, 'set +e',
        `prevoo_ou_sai() { echo passou > '${marca}'; exit 0; }`,
        'main_local_loop',
      ].join('\n')],
      { encoding: 'utf8', cwd: fx.repo, env: { ...process.env, ORQ_EXEC_ROOT: fx.repo, PATH: `${bin}:${process.env.PATH}`, ORQ_TESTE: '1', ORQ_NATIVO_CMD: n.cmd }, timeout: 120_000 },
    )
    return { r, passou: existsSync(marca), log: lerLog(join(runs(fx), 'local-loop.log')) }
  }
  const pausaAuth = (fx: RepoAutonomo) => {
    mkdirSync(runs(fx), { recursive: true })
    writeFileSync(join(runs(fx), '.pausa-auth'), '2026-11-15 15:04 | auth do claude expirada\n')
  }

  it('sonda passa: remove só a pausa auth e segue (haiku, --strict-mcp-config)', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    pausaAuth(fx)
    const d = disparo(fx, claudeFalso(fx, 'ok'), n)
    expect(existsSync(join(runs(fx), '.pausa-auth')), d.log).toBe(false)
    expect(d.passou, d.log).toBe(true)
    const argv = lerLog(join(fx.base, 'claude-argv.log'))
    expect(argv).toMatch(/--model haiku/)
    expect(argv).toMatch(/--strict-mcp-config/)
    expect(eventos(fx)).toMatch(/ RETOMADA por=sonda_auth/)
  }, 120_000)

  it('sonda passa com o PAUSAR humano de pé: remove só a pausa auth, o PAUSAR fica e o disparo para', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    pausaAuth(fx)
    const cfg = JSON.parse(readFileSync(join(fx.repo, 'docs', 'fila', '000-config.json'), 'utf8'))
    const pausar = join(fx.repo, String(cfg.pausar_file ?? 'docs/fila/PAUSAR'))
    writeFileSync(pausar, '2026-11-15 18:00 | humano\n')
    const d = disparo(fx, claudeFalso(fx, 'ok'), n)
    expect(existsSync(join(runs(fx), '.pausa-auth')), d.log).toBe(false)
    expect(existsSync(pausar)).toBe(true)
    expect(d.passou).toBe(false)
  }, 120_000)

  it('sonda falha por auth: a pausa fica, nenhum ticket é tocado, o disparo para', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    pausaAuth(fx)
    const d = disparo(fx, claudeFalso(fx, 'auth'), n)
    expect(existsSync(join(runs(fx), '.pausa-auth')), d.log).toBe(true)
    expect(d.passou).toBe(false)
    expect(eventos(fx)).toMatch(/ AMBIENTE causa=auth papel=sonda/)
  }, 120_000)

  it('controle: sem pausa auth, nenhuma sonda é chamada', () => {
    const fx = criarRepoAutonomo()
    const n = nativoFalso(fx)
    const d = disparo(fx, claudeFalso(fx, 'ok'), n)
    expect(d.passou, d.log).toBe(true)
    expect(lerLog(join(fx.base, 'claude-argv.log'))).toBe('')
  }, 120_000)
})

describe('2.2.1 D6 · orq retomar e orq-pause.sh --off tiram a pausa auth', () => {
  for (const [nome, args] of [['orq retomar', ['scripts/orq', 'retomar']], ['orq-pause.sh --off', ['scripts/orquestrador/orq-pause.sh', '--off']]] as const) {
    it(nome, () => {
      const fx = criarRepoAutonomo()
      mkdirSync(runs(fx), { recursive: true })
      writeFileSync(join(runs(fx), '.pausa-auth'), '2026-11-15 15:04 | auth do claude expirada\n')
      const r = spawnSync('bash', [join(REPO_ROOT, args[0]), args[1]], { encoding: 'utf8', cwd: fx.repo, env: { ...process.env, ORQ_EXEC_ROOT: fx.repo, ORQ_TESTE: '1' } })
      expect(existsSync(join(runs(fx), '.pausa-auth')), `${r.stdout}${r.stderr}`).toBe(false)
    }, 60_000)
  }
})
