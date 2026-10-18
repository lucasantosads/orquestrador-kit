/**
 * Etapa MIG-A, peça P3 · linha de base e plano (pendentes, herdados, drift).
 *
 * Fixture real (test/fixtures/migrations/LEIA-ME.md): os 272 arquivos do
 * Comarka e as 491 linhas de produção de 18/10.
 *
 * Pronto quando:
 *   - corte 20261004: os 6 pendentes recentes e os 29 de drift de outubro;
 *   - corte de hoje com herdados desde 20261004 (E2, opção b): drift zero, os 6
 *     atuais viram 5 herdados mais 1 pendente (20261019000100);
 *   - o plano e o drift mostram o created_by.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { beforeAll, describe, expect, it } from 'vitest'

const DIR = join(import.meta.dirname, '..', 'scripts', 'orquestrador', 'migrations')
const FX = join(import.meta.dirname, 'fixtures', 'migrations')

type Aplicada = { version: string; name: string | null; created_by: string | null }
type Arq = { repo: string; arquivo: string; versao: string; nome: string; base: string; refs: string[]; divergente: boolean; somenteLeitura: boolean }
type LB = { corte: string; herdados_desde: string | null; aplicadas: Aplicada[]; pendentes_herdados: { repo: string; arquivo: string }[]; antigos_sem_ledger: number }
type Plano = { corte: string; pendentes: Arq[]; herdados: Arq[]; drift: Aplicada[]; aplicadasDesdeCorte: (Aplicada & { arquivo: string | null })[] }
type Mod = {
  versaoDoArquivo: (rel: string) => { versao: string; nome: string; base: string } | null
  montarLinhaBase: (o: { banco: string; aplicadas: Aplicada[]; arquivos: Arq[]; corte?: string; herdadosDesde?: string; agora: Date }) => LB
  montarPlano: (lb: LB, aplicadas: Aplicada[], arquivos: Arq[]) => Plano
}

const tsv = (f: string) =>
  readFileSync(join(FX, f), 'utf8')
    .trim()
    .split('\n')
    .slice(1)
    .map((l) => l.split('\t'))

const SEIS = [
  '20261007190900_churn_fecha_leitura_anon',
  '20261017230300_inteligencia_comercial_nota_ghl',
  '20261018001000_inteligencia_capacidade_registro',
  '20261018003100_nps_fila_e_resposta_por_contato',
  '20261018003200_employees_public_sem_anon',
  '20261019000100_nps_fila_sai_chave_notion',
].map((n) => `supabase/migrations/${n}.sql`)

describe('P3: linha de base e plano', () => {
  let m: Mod | null = null
  let prod: Aplicada[] = []
  let arqs: Arq[] = []
  const AGORA = new Date('2026-10-18T17:00:00Z')

  beforeAll(async () => {
    try {
      m = (await import(pathToFileURL(join(DIR, 'plano.ts')).href)) as Mod
    } catch {
      m = null
    }
    prod = tsv('comarka-producao.tsv').map(([version, name, created_by]) => ({ version: version!, name: name!, created_by: created_by! }))
    if (m)
      arqs = tsv('comarka-arquivos.tsv').map(([arquivo, refs]) => ({
        repo: 'comarka-operacional',
        arquivo: arquivo!,
        ...m!.versaoDoArquivo(arquivo!)!,
        refs: refs!.split(','),
        divergente: false,
        somenteLeitura: false,
      }))
  })

  it('versão e nome saem do nome do arquivo: 14 dígitos, ou 8 completados com zeros', () => {
    expect(m).not.toBeNull()
    expect(m!.versaoDoArquivo('supabase/migrations/20261019000100_nps_fila_sai_chave_notion.sql')).toEqual({ versao: '20261019000100', nome: 'nps_fila_sai_chave_notion', base: '20261019000100_nps_fila_sai_chave_notion' })
    expect(m!.versaoDoArquivo('supabase/migrations/20260612_perf_meta_discovery.sql')).toEqual({ versao: '20260612000000', nome: 'perf_meta_discovery', base: '20260612_perf_meta_discovery' })
    expect(m!.versaoDoArquivo('supabase/migrations/fix-data.sql')).toBeNull()
    expect(m!.versaoDoArquivo('supabase/migrations/20261019000100_x.txt')).toBeNull()
    expect(arqs).toHaveLength(272)
  })

  it('corte 20261004: os 6 pendentes recentes e os 29 de drift de outubro', () => {
    expect(m).not.toBeNull()
    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, corte: '20261004', agora: AGORA })
    expect(lb.corte).toBe('20261004000000')
    expect(lb.pendentes_herdados).toEqual([])
    const p = m!.montarPlano(lb, prod, arqs)
    expect(p.pendentes.map((a) => a.arquivo)).toEqual(SEIS)
    expect(p.herdados).toEqual([])
    expect(p.drift).toHaveLength(29)
    const nomes = p.drift.map((a) => a.name!)
    expect(nomes.filter((n) => n.includes('webinar'))).toHaveLength(17)
    expect(nomes.filter((n) => n.includes('plano_metas'))).toHaveLength(5)
    expect(nomes.filter((n) => n.includes('regras_lead'))).toHaveLength(2)
    expect(nomes).toEqual(expect.arrayContaining(['folha_pagamento_employee_id', 'clientes_receita_status_log', 'perf_lead_eventos_tipo_ctwa', 'trava_exclusoes_meses_fechados_leads']))
    // o drift mostra quem aplicou (E: created_by no plano e no drift)
    expect(p.drift.every((a) => a.created_by === 'conector-mcp')).toBe(true)
  })

  it('corte de hoje, herdados desde 20261004: drift zero, 5 herdados e 1 pendente', () => {
    expect(m).not.toBeNull()
    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, herdadosDesde: '20261004', agora: AGORA })
    expect(lb.corte).toBe('20261018030500')
    expect(lb.herdados_desde).toBe('20261004000000')
    expect(lb.aplicadas).toHaveLength(491)
    expect(lb.pendentes_herdados.map((a) => a.arquivo)).toEqual(SEIS.slice(0, 5))
    // os antigos sem linha no ledger ficam fora, e contados (nada antigo é cobrado).
    // 31, e não os 38 - 5 do recon: 7 arquivos de 27-29/09 foram aplicados com o
    // nome base INTEIRO como name (ex.: 20260929120000_chave_unica_cliente_id), e
    // o casamento pelo nome base os acha.
    expect(lb.antigos_sem_ledger).toBe(31)
    const p = m!.montarPlano(lb, prod, arqs)
    expect(p.drift).toEqual([])
    expect(p.pendentes.map((a) => a.arquivo)).toEqual(SEIS.slice(5))
    expect(p.herdados.map((a) => a.arquivo)).toEqual(SEIS.slice(0, 5))
    expect(p.herdados.map((a) => a.refs)).toEqual([['main', 'origin/staging-auto', 'origin/staging-apolo'], ['origin/staging-apolo'], ['origin/staging-apolo'], ['origin/staging-auto'], ['origin/staging-auto']])
  })

  it('sem herdados_desde: nenhum herdado, e os 36 sem ledger até o corte são só contados', () => {
    expect(m).not.toBeNull()
    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, agora: AGORA })
    expect(lb.pendentes_herdados).toEqual([])
    expect(lb.antigos_sem_ledger).toBe(36)
  })

  it('depois de aplicar: o herdado sai, a linha nova aparece com created_by; linha sem arquivo vira drift', () => {
    expect(m).not.toBeNull()
    const lb = m!.montarLinhaBase({ banco: 'comarka', aplicadas: prod, arquivos: arqs, herdadosDesde: '20261004', agora: AGORA })
    const depois = [
      ...prod,
      { version: '20261018003100', name: 'nps_fila_e_resposta_por_contato', created_by: 'orq-aplicador:lucas' },
      { version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp' },
    ]
    const p = m!.montarPlano(lb, depois, arqs)
    expect(p.herdados.map((a) => a.arquivo)).not.toContain(SEIS[3])
    expect(p.herdados).toHaveLength(4)
    expect(p.drift).toEqual([{ version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp' }])
    expect(p.aplicadasDesdeCorte).toEqual([{ version: '20261019120000', name: 'feita_no_editor', created_by: 'conector-mcp', arquivo: null }])
    // aplicada pelo aplicador acima do corte: casa o arquivo e mostra quem aplicou
    const p2 = m!.montarPlano(lb, [...prod, { version: '20261019000100', name: 'nps_fila_sai_chave_notion', created_by: 'orq-aplicador:lucas' }], arqs)
    expect(p2.pendentes).toEqual([])
    expect(p2.aplicadasDesdeCorte).toEqual([{ version: '20261019000100', name: 'nps_fila_sai_chave_notion', created_by: 'orq-aplicador:lucas', arquivo: SEIS[5] }])
  })

  it('casa por nome com versão diferente (84 do Comarka) e pelo nome com prefixo (o dashboard grava 20261006_<nome>)', () => {
    expect(m).not.toBeNull()
    const a = (arquivo: string): Arq => ({ repo: 'r', arquivo, ...m!.versaoDoArquivo(arquivo)!, refs: ['HEAD'], divergente: false, somenteLeitura: false })
    const arquivos = [a('m/20261010000000_x.sql'), a('m/20261011_webinar_y.sql')]
    const ledger = [
      { version: '20261010123456', name: 'x', created_by: null },
      { version: '20261011999999', name: '20261011_webinar_y', created_by: null },
    ]
    const lb = m!.montarLinhaBase({ banco: 'b', aplicadas: [], arquivos, corte: '20261001', agora: AGORA })
    const p = m!.montarPlano(lb, ledger, arquivos)
    expect(p.pendentes).toEqual([])
    expect(p.drift).toEqual([])
  })
})
