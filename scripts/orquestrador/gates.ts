/**
 * gates.ts — motor de gates do Orquestrador Autônomo (ORQ-04).
 *
 * O executor.sh do comarka-os tem TRÊS funções de gate hardcoded (gate_tsc,
 * gate_vitest, gate_build) com `npx tsc`/`npx vitest` embutidos e leitura
 * posicional de `.gates[0]`. Aqui não há função por gate: o motor ITERA
 * `.gates[]` na ordem de `_execucao_dos_gates.ordem_obrigatoria`.
 *
 * A decisão é pura e testável; a execução entra injetada (`exec`), então o
 * teste exercita o motor inteiro sem rodar comando nenhum.
 */
import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'

export interface Placar {
  pacotes: number
  passando: number
  pulados: number
  todo: number
  falhando: number
}

export interface GateSpec {
  nome: string
  cmd: string
  tipo: string
  baseline?: number
  baseline_placar?: Placar
  cobertura_minima_services?: number
}

export interface GatesConfig {
  gates: GateSpec[]
  _execucao_dos_gates: { ordem_obrigatoria: string[]; interrupcao: string }
}

export interface Execucao {
  exitCode: number
  saida: string
  ms: number
}

export interface GateResultado extends Execucao {
  nome: string
  ok: boolean
  motivo?: string
  placar?: Placar
}

export interface Veredito {
  ok: boolean
  interrompido: boolean
  reexecutar: boolean
  gates: GateResultado[]
  motivo?: string
}

/** Códigos que significam "morto por fora", não reprovação de mérito. */
export const CODIGOS_INTERRUPCAO = [124, 129, 130, 137, 143]
export function ehInterrupcao(exitCode: number): boolean {
  return CODIGOS_INTERRUPCAO.includes(exitCode)
}

/**
 * Ordena os gates pela ordem obrigatória do config. Diverge = erro, não
 * reordenação silenciosa: se o config lista um gate que não existe (ou o
 * contrário), a config está errada e o run não pode começar.
 */
export function ordenarGates(gates: GateSpec[], ordem: string[]): GateSpec[] {
  const porNome = new Map(gates.map((g) => [g.nome, g]))
  const faltando = ordem.filter((n) => !porNome.has(n))
  const sobrando = gates.map((g) => g.nome).filter((n) => !ordem.includes(n))
  if (faltando.length || sobrando.length) {
    throw new Error(
      `ordem_obrigatoria não bate com .gates[]: faltando [${faltando.join(', ')}], sobrando [${sobrando.join(', ')}]`,
    )
  }
  return ordem.map((n) => porNome.get(n)!)
}

/**
 * Soma as linhas "Tests N passed | M skipped | K todo" de todos os blocos.
 *
 * O strip de ANSI é obrigatório: vitest 2.x desliga cor quando a saída não é
 * TTY, mas vitest 4.x mantém os escapes mesmo redirecionado — a linha termina
 * em `\x1b[39m` depois do `(N)` e o `$` do regex não casa. Sem isto o parser
 * enxerga um pacote a menos por bloco colorido.
 */
export function parsePlacar(saida: string): Placar {
  const p: Placar = { pacotes: 0, passando: 0, pulados: 0, todo: 0, falhando: 0 }
  for (const bruta of saida.split('\n')) {
    const linha = bruta.replace(/\x1B\[[0-9;]*m/g, '')
    const m = /^\s*Tests\s+(.+?)\s*\(\d+\)\s*$/.exec(linha)
    if (!m) continue
    p.pacotes++
    for (const parte of (m[1] ?? '').split('|')) {
      const n = /(\d+)\s+(passed|skipped|todo|failed)/.exec(parte)
      if (!n) continue
      const qtd = Number(n[1])
      if (n[2] === 'passed') p.passando += qtd
      else if (n[2] === 'skipped') p.pulados += qtd
      else if (n[2] === 'todo') p.todo += qtd
      else p.falhando += qtd
    }
  }
  return p
}

/** Quantos services o loop `for d in services/*​/` de fato alcançou. */
export function contarServices(saida: string): number {
  return saida.split('\n').filter((l) => /^==\s+services\//.test(l)).length
}

/**
 * Regra _baseline_volatil: `passando >= baseline` E `falhando == 0`.
 * NUNCA igualdade estrita — qualquer ticket que adicione teste sobe o placar, e
 * comparar por igualdade transformaria cobertura nova em falso-vermelho.
 */
export function avaliaPlacar(
  placar: Placar,
  baseline: Placar,
  servicesAlcancados?: number,
  minServices?: number,
): { ok: boolean; motivo?: string } {
  if (placar.falhando > 0) return { ok: false, motivo: `${placar.falhando} teste(s) falhando` }
  if (placar.pacotes < baseline.pacotes) {
    return { ok: false, motivo: `AMBIENTE: ${placar.pacotes} pacotes coletados < ${baseline.pacotes} do baseline — deficit de COLETA, nao regressao. Faltaram ${baseline.pacotes - placar.pacotes} bloco(s) de placar: leia a saida bruta do gate, identifique quais pacotes nao apareceram e so entao conclua a causa.` }
  }
  if (placar.passando < baseline.passando) {
    return { ok: false, motivo: `passando ${placar.passando} < baseline ${baseline.passando}` }
  }
  if (minServices !== undefined && (servicesAlcancados ?? 0) < minServices) {
    return { ok: false, motivo: `loop alcançou ${servicesAlcancados} services, esperado ${minServices}` }
  }
  return { ok: true }
}

/** Conta erros de tipo fora do escopo do baseline. */
export function avaliaBaselineTsc(saida: string, baseline: number): { ok: boolean; motivo?: string } {
  const erros = saida.split('\n').filter((l) => /error TS\d+/.test(l)).length
  if (erros > baseline) return { ok: false, motivo: `${erros} erro(s) de tipo, baseline ${baseline}` }
  return { ok: true }
}

/** Julga UM gate já executado. Pura: recebe a execução, não executa nada. */
export function avaliaGate(spec: GateSpec, exec: Execucao): GateResultado {
  const base: GateResultado = { nome: spec.nome, ok: exec.exitCode === 0, ...exec }
  if (ehInterrupcao(exec.exitCode)) {
    return { ...base, ok: false, motivo: `interrompido (exit ${exec.exitCode})` }
  }
  if (spec.tipo === 'baseline' && spec.baseline !== undefined) {
    const r = avaliaBaselineTsc(exec.saida, spec.baseline)
    return { ...base, ok: base.ok && r.ok, ...(r.motivo ? { motivo: r.motivo } : {}) }
  }
  if (spec.baseline_placar) {
    const placar = parsePlacar(exec.saida)
    const r = avaliaPlacar(
      placar,
      spec.baseline_placar,
      contarServices(exec.saida),
      spec.cobertura_minima_services,
    )
    return { ...base, ok: base.ok && r.ok, placar, ...(r.motivo ? { motivo: r.motivo } : {}) }
  }
  if (!base.ok) return { ...base, motivo: `exit ${exec.exitCode}` }
  return base
}

/**
 * Roda a sequência inteira, na ordem gravada, parando no primeiro gate que
 * reprova. NAO_VALE_PARCIALMENTE: se QUALQUER gate foi interrompido, o
 * conjunto não vale — `reexecutar: true` e nenhum resultado anterior conta
 * como aprovado. Só existe verde quando a ordem completa rodou inteira.
 */
export function rodarGates(config: GatesConfig, exec: (cmd: string) => Execucao): Veredito {
  const ordem = config._execucao_dos_gates.ordem_obrigatoria
  const parcialProibido = config._execucao_dos_gates.interrupcao === 'NAO_VALE_PARCIALMENTE'
  const specs = ordenarGates(config.gates, ordem)
  const gates: GateResultado[] = []

  for (const spec of specs) {
    const r = avaliaGate(spec, exec(spec.cmd))
    gates.push(r)
    if (!r.ok) {
      const interrompido = ehInterrupcao(r.exitCode)
      return {
        ok: false,
        interrompido,
        reexecutar: interrompido && parcialProibido,
        gates,
        motivo: `${r.nome}: ${r.motivo ?? 'reprovou'}`,
      }
    }
  }
  return { ok: true, interrompido: false, reexecutar: false, gates }
}

/**
 * Recorte das linhas que EXPLICAM a falha de um gate, para o gates.txt.
 *
 * Existe porque o gates.txt guardava só o placar ("FALHA testes_por_pacote
 * [8 pacotes, 861p/1f]") — e placar não diz QUAL arquivo quebrou. Sem o nome do
 * arquivo não há como comparar com a allowlist, que é o remédio 2 da colisão de
 * teste (SKILL) e o que faltou no 201 desde 2026-09-02.
 *
 * Recorte, nunca o log inteiro: log colado por inteiro produz diagnóstico errado
 * no interlocutor (mesma razão do `orq erro`). Duas fontes, nesta ordem: as
 * linhas que casam um padrão de falha e, depois, a cauda da saída.
 */
const PADRAO_FALHA =
  /^\s*(FAIL|✕|×|❯|AssertionError|Error:|Expected:|Received:)|error TS\d+|\bexpected\b.*\bto\b/

export function recorteDeFalha(saida: string, max = 40): string[] {
  const linhas = saida.split('\n').map((l) => l.replace(/\x1B\[[0-9;]*m/g, '').trimEnd())
  const marcadas = linhas.filter((l) => l.trim() && PADRAO_FALHA.test(l))
  if (marcadas.length >= max) return marcadas.slice(0, max)
  // Completa com a cauda, sem repetir o que já entrou.
  const vistas = new Set(marcadas)
  const cauda = linhas.filter((l) => l.trim() && !vistas.has(l)).slice(-(max - marcadas.length))
  return [...marcadas, ...cauda]
}

/** Executor real: bash -c a partir da raiz do repo. */
export function execBash(raiz: string): (cmd: string) => Execucao {
  return (cmd) => {
    const t0 = Date.now()
    const r = spawnSync('bash', ['-c', cmd], { cwd: raiz, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })
    return {
      exitCode: r.status ?? (r.signal ? 130 : 1),
      saida: `${r.stdout ?? ''}${r.stderr ?? ''}`,
      ms: Date.now() - t0,
    }
  }
}

// --- CLI: `npx tsx gates.ts --run-cli [raiz]` --------------------------------
if (process.argv.includes('--run-cli')) {
  const raiz = process.argv[process.argv.indexOf('--run-cli') + 1] ?? process.cwd()
  const config = JSON.parse(readFileSync(`${raiz}/docs/fila/000-config.json`, 'utf8')) as GatesConfig
  const v = rodarGates(config, execBash(raiz))
  for (const g of v.gates) {
    const marca = g.ok ? 'ok  ' : 'FALHA'
    const extra = g.placar ? ` [${g.placar.pacotes} pacotes, ${g.placar.passando}p/${g.placar.falhando}f]` : ''
    process.stdout.write(`${marca} ${g.nome.padEnd(20)} ${String(g.ms).padStart(6)}ms${extra}${g.motivo ? ' — ' + g.motivo : ''}\n`)
  }
  process.stdout.write(`VEREDITO: ${v.ok ? 'APROVADO' : 'REPROVADO'}${v.reexecutar ? ' (reexecutar do início)' : ''}\n`)
  // O recorte do gate que reprovou entra no MESMO arquivo, depois do veredito:
  // é dali que o diagnóstico do retry tira arquivo, linha e esperado vs obtido.
  // As linhas do recorte nunca começam com "ok "/"FALHA " ancorados em nome de
  // gate, então `gate_marca` (grep -E '^(ok|FALHA) +<nome>') segue lendo igual.
  const falho = v.gates.find((g) => !g.ok)
  if (falho) {
    process.stdout.write(`\n--- recorte de ${falho.nome} ---\n${recorteDeFalha(falho.saida).join('\n')}\n`)
  }
  process.exit(v.ok ? 0 : 1)
}
