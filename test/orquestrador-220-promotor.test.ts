/**
 * Etapa 2.2.0, peça P2 · promotor (DEC-035; autoalimentacao §6 com modo auto).
 *
 * Pronto quando, num repo de fixture com o claude injetado:
 *   - alvo à frente da principal, gates verdes no topo da alvo numa worktree
 *     limpa, juiz de promoção aprovando: `merge --ff-only` na principal,
 *     PROMOVIDO, writeback da frente concluída (mapa.json e MAPA.md) em commit
 *     próprio na alvo e ff de novo; liberação automática da frente do MESMO
 *     bloco (rascunho -> pronta) e aviso bloco_novo para a de outro bloco;
 *     push_pendente com a principal à frente de origin; nunca push;
 *   - os commits de status da fila na principal entram na alvo por sincronia;
 *   - path de gate humano (migration) no diff: recusa SEM juiz e sem gates,
 *     aviso migration_pendente com o sha256 do arquivo, principal intocada;
 *   - gate vermelho ou juiz recusando: PROMOCAO_RECUSADA, principal intocada;
 *   - modo humano (padrão): nada acontece.
 */
import { describe, expect, it } from 'vitest'
import { createHash } from 'node:crypto'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { promover } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta, ticketDone, type RepoAutonomo } from './fixtures/autonomo-repo.js'

const avisos = (fx: RepoAutonomo) => {
  try {
    return readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'avisos', 'ciclo.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
  } catch {
    return []
  }
}
const eventos = (fx: RepoAutonomo) => {
  try {
    return readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'events.log'), 'utf8')
  } catch {
    return ''
  }
}

/** O ticket 001 da B0-F2 mergeado na alvo como a drenagem faz, e o lote que fecha a frente. */
function ticketNaAlvo(fx: RepoAutonomo, arquivo: string, conteudo: string, id = '001') {
  writeFileSync(join(fx.repo, 'docs', 'fila', `${id}-t.md`), ticketDone(id, 'B0-F2', 'convite'))
  fx.g(fx.repo, 'add', '-A')
  fx.g(fx.repo, 'commit', '-qm', `fila: ${id} done`)
  fx.g(fx.alvoWt, 'checkout', '-q', '-b', `frente/${id}`)
  mkdirSync(join(fx.alvoWt, arquivo, '..'), { recursive: true })
  writeFileSync(join(fx.alvoWt, arquivo), conteudo)
  fx.g(fx.alvoWt, 'add', '-A')
  fx.g(fx.alvoWt, 'commit', '-qm', `${id}: trabalho`)
  fx.g(fx.alvoWt, 'checkout', '-q', 'staging-auto')
  fx.g(fx.alvoWt, 'merge', '--no-ff', '-q', `frente/${id}`, '-m', `orq: frente/${id} (ticket ${id}) em staging-auto`, '-m', `Orq-Ticket: ${id}`)
  mkdirSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador'), { recursive: true })
  writeFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador', 'estado.json'), JSON.stringify({ 'B0-F2': { fecha_com: [id] } }))
}

function comOrigin(fx: RepoAutonomo) {
  const bare = join(fx.base, 'origin.git')
  fx.g(fx.base, 'init', '-q', '--bare', bare)
  fx.g(fx.repo, 'remote', 'add', 'origin', bare)
  fx.g(fx.repo, 'push', '-q', 'origin', 'main')
  fx.g(fx.repo, 'fetch', '-q', 'origin')
}

describe('P2 · promotor', () => {
  it('aprovado: sincronia, gates, juiz, ff-only, writeback da frente, liberação no bloco, bloco_novo e push_pendente', () => {
    const fx = criarRepoAutonomo()
    comOrigin(fx)
    ticketNaAlvo(fx, 'src/usuarios/convite.ts', 'export function convite() {}\n')
    const origemAntes = fx.g(fx.repo, 'rev-parse', 'origin/main').out.trim()
    const r = promover(fx.ctx(claudePorPapel({ 'juiz de promoção': (p) => {
      expect(p).toContain('src/usuarios/convite.ts')
      expect(p).toContain('REGRA-FIXTURE')
      return resposta({ aprovar: true, motivos: ['só o convite'], resumo: 'convite por e-mail' })
    } })))
    expect(r).toMatchObject({ promovido: true, tickets: ['001'], frentesConcluidas: ['B0-F2'], liberadas: ['B0-F3'] })
    // principal == alvo (com o writeback), sem push
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(fx.g(fx.repo, 'rev-parse', 'staging-auto').out)
    expect(fx.g(fx.repo, 'rev-parse', 'origin/main').out.trim()).toBe(origemAntes)
    const mapa = JSON.parse(fx.g(fx.repo, 'show', 'main:docs/roadmap/mapa.json').out)
    const st = Object.fromEntries(mapa.blocos.flatMap((b: any) => b.frentes).map((f: any) => [f.id, f.status]))
    expect(st).toEqual({ 'B0-F1': 'concluida', 'B0-F2': 'concluida', 'B0-F3': 'pronta', 'B1-F1': 'rascunho' })
    const md = fx.g(fx.repo, 'show', 'main:docs/roadmap/MAPA.md').out
    expect(md).toMatch(/^\| B0-F2 \|.*\| concluida \|$/m)
    expect(md).toMatch(/^\| B0-F3 \|.*\| pronta \|$/m)
    const ev = eventos(fx)
    expect(ev).toMatch(/ SINCRONIA de=main para=staging-auto/)
    expect(ev).toMatch(/ PROMOVIDO de=\w+ para=\w+ tickets=001/)
    expect(ev).toMatch(/ FRENTE_CONCLUIDA frente=B0-F2 liberadas=B0-F3/)
    expect(ev).toMatch(/ FRENTE_LIBERADA frente=B0-F3 por=B0-F2/)
    const av = avisos(fx)
    expect(av.map((a: any) => a.tipo)).toEqual(expect.arrayContaining(['bloco_novo', 'push_pendente']))
    expect(av.find((a: any) => a.tipo === 'push_pendente').texto).toMatch(/git -C \S+ push origin main/)
    expect(av.find((a: any) => a.tipo === 'push_pendente').dados.juiz.resumo).toBe('convite por e-mail')
    expect(fx.chamadas.map((c) => c.papel)).toEqual(['juiz de promoção'])
    expect(fx.chamadas[0]!.args).toEqual(expect.arrayContaining(['--strict-mcp-config', '--model', 'opus']))
  }, 120_000)

  it('migration no diff: recusa sem juiz e sem gates, aviso migration_pendente com sha256, principal intocada', () => {
    const fx = criarRepoAutonomo()
    const sql = 'insert into core.teses (id) values (1);\n'
    ticketNaAlvo(fx, 'supabase/migrations/0101_seed_teses.sql', sql)
    const antes = fx.g(fx.repo, 'rev-parse', 'main').out
    const r = promover(fx.ctx(claudePorPapel({})))
    expect(r).toMatchObject({ promovido: false, motivo: 'gate_humano' })
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(antes)
    expect(fx.chamadas).toHaveLength(0)
    const mig = avisos(fx).find((a: any) => a.tipo === 'migration_pendente')
    expect(mig).toMatchObject({ nivel: 'acao', dados: { arquivo: 'supabase/migrations/0101_seed_teses.sql', sha256: createHash('sha256').update(sql).digest('hex') } })
    expect(eventos(fx)).toMatch(/ PROMOCAO_RECUSADA motivo=gate_humano arquivos=supabase\/migrations\/0101_seed_teses\.sql/)
  }, 120_000)

  it('gate vermelho no topo da alvo: recusa sem juiz; juiz recusando: recusa com motivo', () => {
    const fx = criarRepoAutonomo({ gates: [{ nome: 'testes', cmd: 'test -f src/nao-existe.ts', tipo: 'exit_code', papel: 'testes' }] })
    ticketNaAlvo(fx, 'src/usuarios/convite.ts', 'x\n')
    const antes = fx.g(fx.repo, 'rev-parse', 'main').out
    expect(promover(fx.ctx(claudePorPapel({}))).motivo).toBe('gate_testes')
    expect(fx.chamadas).toHaveLength(0)
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(antes)

    const fx2 = criarRepoAutonomo()
    ticketNaAlvo(fx2, 'src/usuarios/convite.ts', 'x\n')
    const antes2 = fx2.g(fx2.repo, 'rev-parse', 'main').out
    const r = promover(fx2.ctx(claudePorPapel({ 'juiz de promoção': () => resposta({ aprovar: false, motivos: ['teste tautológico'], resumo: '' }) })))
    expect(r.motivo).toBe('juiz')
    expect(fx2.g(fx2.repo, 'rev-parse', 'main').out).toBe(antes2)
    expect(avisos(fx2).find((a: any) => a.tipo === 'promocao_recusada').texto).toContain('teste tautológico')
  }, 120_000)

  it('controle: modo humano (padrão do kit) não promove nem chama modelo', () => {
    const fx = criarRepoAutonomo({ promotor: { modo: 'humano' } })
    ticketNaAlvo(fx, 'src/usuarios/convite.ts', 'x\n')
    const antes = fx.g(fx.repo, 'rev-parse', 'main').out
    expect(promover(fx.ctx(claudePorPapel({}))).motivo).toBe('modo_humano')
    expect(fx.g(fx.repo, 'rev-parse', 'main').out).toBe(antes)
    expect(fx.chamadas).toHaveLength(0)
  }, 60_000)
})
