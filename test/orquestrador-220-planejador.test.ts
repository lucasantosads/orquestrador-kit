/**
 * Etapa 2.2.0, peça P1 · planejador (autoalimentacao §3, M-46).
 *
 * Pronto quando, num repo de fixture com o claude injetado:
 *   - frente pronta sem ticket: o lote ganha IDs sequenciais globais do SCRIPT
 *     (o modelo não escolhe), passa pelo gate de ticket (gate-ticket.ts) e pelo
 *     juiz de lote (segundo claude, contexto limpo, sem ferramenta e sem MCP);
 *     o reprovado sai `descartado` com motivo, o aprovado vira `pendente` em
 *     modo auto e `candidato` em dry_run; o lote é commitado na principal;
 *   - as chamadas usam --strict-mcp-config e --setting-sources project, e o
 *     prompt carrega o arquivo de regras_ticket;
 *   - frente parcial (todos os tickets done) com "entrega coberta" não escreve
 *     ticket; dúvida de escopo vira decisão pendente, frente bloqueada_humano e
 *     aviso decisao_pendente; com a fila cheia o planejador não chama modelo.
 */
import { describe, expect, it } from 'vitest'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { planejar, lerFila } from '../scripts/orquestrador/autonomo.js'
import { claudePorPapel, criarRepoAutonomo, resposta, ticketDone } from './fixtures/autonomo-repo.js'

const candidato = (slug: string, extra: Record<string, unknown> = {}) => ({
  titulo: `ticket ${slug}`,
  slug,
  prosa: 'recon: src/usuarios/lista.ts existe.',
  objetivo: `Crie src/usuarios/${slug}.ts exportando a função ${slug.replace(/-/g, '_')} e o teste test/usuarios/${slug}.test.ts que a exercita.`,
  pathspec_allowlist: [`src/usuarios/${slug}.ts`, `test/usuarios/${slug}.test.ts`],
  cria_novo: [`src/usuarios/${slug}.ts`, `test/usuarios/${slug}.test.ts`],
  recon: [{ descricao: 'a lista existe', cmd: "grep -c 'export const lista' src/usuarios/lista.ts", espera: '1' }],
  dependencias: [],
  diff_estimado: 120,
  criterios_aceite: [
    { tipo: 'alvo', descricao: 'a função existe', cmd: `grep -c 'export function ${slug.replace(/-/g, '_')}' src/usuarios/${slug}.ts`, espera: '1' },
    { tipo: 'avaliador', descricao: 'avaliador: a função é usada pelo teste.', cmd: 'true', espera: 'avaliador' },
  ],
  ...extra,
})

describe('P1 · planejador', () => {
  it('lote novo: IDs do script, gate de ticket, juiz de lote, descarte com motivo, pendente em auto, commit na principal', () => {
    const fx = criarRepoAutonomo()
    writeFileSync(join(fx.repo, 'docs', 'fila', '007-antigo.md'), ticketDone('007', 'B0-F1', 'base'))
    fx.g(fx.repo, 'add', '-A')
    fx.g(fx.repo, 'commit', '-qm', 'ticket antigo')
    const claude = claudePorPapel({
      planejador: () =>
        resposta({ entrega_coberta: false, duvida: null, fecha_frente: true, tickets: [candidato('convite', { id: '999' }), candidato('reenvio', { dependencias: ['#1'] })] }),
      'juiz de lote': (p) => {
        expect(p).toContain('REGRA-FIXTURE')
        return resposta({ vereditos: [{ id: '008', aprovado: true, motivo: 'ok' }, { id: '009', aprovado: false, motivo: 'viola REGRA-FIXTURE: negação sem controle positivo' }] })
      },
    })
    const ctx = fx.ctx(claude)
    const r = planejar(ctx)
    expect(r.frente).toBe('B0-F2')
    expect(r.escritos).toEqual(['008', '009'])
    expect(r.aprovados).toEqual(['008'])
    expect(r.descartados).toEqual([{ id: '009', motivo: 'juiz_lote' }])
    const fila = lerFila(ctx.filaDir)
    const t8 = fila.find((t) => t.json.id === '008')!.json
    const t9 = fila.find((t) => t.json.id === '009')!.json
    expect(t8).toMatchObject({ status: 'pendente', origem: 'planejador', frente: 'B0-F2', bloco: 'B0', dependencias: [] })
    expect(t9).toMatchObject({ status: 'descartado', dependencias: ['008'] })
    expect(t9.notas_status).toMatch(/juiz_lote.*REGRA-FIXTURE/)
    // as chamadas: sem conectores e sem settings do usuário; juiz sem ferramenta
    const [pl, jz] = fx.chamadas
    expect(pl!.papel).toBe('planejador')
    expect(pl!.args).toEqual(expect.arrayContaining(['--strict-mcp-config', '--setting-sources', 'project']))
    expect(pl!.args.join(' ')).toContain('REGRA-FIXTURE')
    expect(jz!.papel).toBe('juiz de lote')
    expect(jz!.args).toEqual(expect.arrayContaining(['--strict-mcp-config', '--tools', '']))
    // o lote foi commitado na principal, com o trailer
    const log = fx.g(fx.repo, 'log', '-1', '--format=%B%n%H', '--name-only').out
    expect(log).toMatch(/Orq-Planejador: B0-F2 008,009/)
    expect(log).toContain('docs/fila/008-convite.md')
    expect(fx.g(fx.repo, 'status', '--porcelain', '--untracked-files=no').out.trim()).toBe('')
    // trilha
    const ev = readFileSync(join(ctx.runsDir, 'events.log'), 'utf8')
    expect(ev).toMatch(/ 008 PENDENTE frente=B0-F2/)
    expect(ev).toMatch(/ 009 DESCARTADO motivo=juiz_lote/)
    expect(ev).toMatch(/ PLANEJADOR_FIM frente=B0-F2 escritos=2 aprovados=008 descartados=1 modo=auto/)
  }, 120_000)

  it('dry_run: o aprovado fica candidato; e o gate de ticket descarta antes do juiz', () => {
    const fx = criarRepoAutonomo({ loops: { executor: { ativo: true }, planejador: { ativo: true, modo: 'dry_run' } } })
    const claude = claudePorPapel({
      planejador: () =>
        resposta({ tickets: [candidato('convite'), candidato('sem-alvo', { criterios_aceite: [{ tipo: 'guarda', descricao: 'x', cmd: 'true', espera: '' }] })] }),
      'juiz de lote': () => resposta({ vereditos: [{ id: '001', aprovado: true, motivo: 'ok' }] }),
    })
    const r = planejar(fx.ctx(claude))
    expect(r.aprovados).toEqual(['001'])
    expect(r.descartados.map((d) => d.id + ':' + d.motivo)).toEqual(['002:gate'])
    const fila = lerFila(join(fx.repo, 'docs', 'fila'))
    expect(fila.find((t) => t.json.id === '001')!.json.status).toBe('candidato')
    // o juiz de lote só viu o que passou no gate
    const pj = fx.chamadas.find((c) => c.papel === 'juiz de lote')!.args.join(' ')
    expect(pj).toContain('"id": "001"')
    expect(pj).not.toContain('"id": "002"')
  }, 120_000)

  it('frente parcial com entrega coberta: nenhum ticket, estado coberta; dúvida vira decisão e bloqueada_humano', () => {
    const fx = criarRepoAutonomo()
    writeFileSync(join(fx.repo, 'docs', 'fila', '001-lista.md'), ticketDone('001', 'B0-F2', 'lista de usuários'))
    fx.g(fx.repo, 'add', '-A')
    fx.g(fx.repo, 'commit', '-qm', 't')
    const cob = planejar(fx.ctx(claudePorPapel({ planejador: (p) => {
      expect(p).toContain('Todos os tickets desta frente estão done')
      return resposta({ entrega_coberta: true, tickets: [] })
    } })))
    expect(cob).toMatchObject({ rodou: true, cobertura: 'coberta', escritos: [] })
    expect(JSON.parse(readFileSync(join(fx.repo, 'docs', 'fila', 'runs', 'planejador', 'estado.json'), 'utf8'))['B0-F2'].coberta_em).toBeTruthy()

    const fx2 = criarRepoAutonomo()
    const d = planejar(fx2.ctx(claudePorPapel({ planejador: () => resposta({ duvida: 'O convite expira em quantos dias?', tickets: [] }) })))
    expect(d.motivo).toBe('duvida')
    expect(readFileSync(join(fx2.repo, 'docs', 'fila', 'decisoes-pendentes.md'), 'utf8')).toMatch(/B0-F2 · planejador: O convite expira em quantos dias\?/)
    const mapa = JSON.parse(readFileSync(join(fx2.alvoWt, 'docs', 'roadmap', 'mapa.json'), 'utf8'))
    expect(mapa.blocos[0].frentes[1].status).toBe('bloqueada_humano')
    expect(readFileSync(join(fx2.alvoWt, 'docs', 'roadmap', 'MAPA.md'), 'utf8')).toMatch(/\| B0-F2 \|.*\| bloqueada_humano \|/)
    const aviso = readFileSync(join(fx2.repo, 'docs', 'fila', 'runs', 'avisos', 'ciclo.jsonl'), 'utf8')
    expect(JSON.parse(aviso.trim().split('\n')[0]!)).toMatchObject({ tipo: 'decisao_pendente', nivel: 'acao' })
  }, 120_000)

  it('controle: fila cheia ou planejador desligado não chama modelo nenhum', () => {
    const fx = criarRepoAutonomo({ planejador: { limiar_fila: 1, lote: 3 } })
    writeFileSync(join(fx.repo, 'docs', 'fila', '001-p.md'), ticketDone('001', 'B0-F2', 'x').replace('"done"', '"pendente"'))
    const cheia = planejar(fx.ctx(claudePorPapel({})))
    expect(cheia.motivo).toBe('fila_cheia_1')
    const off = planejar(fx.ctx(claudePorPapel({}), { loops: { planejador: { ativo: false } } }))
    expect(off.motivo).toBe('desligado')
    expect(fx.chamadas).toHaveLength(0)
    expect(existsSync(join(fx.repo, 'docs', 'fila', '002-x.md'))).toBe(false)
  }, 60_000)
})
