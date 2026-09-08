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
  /** `tipo: "baseline"` — o número contra o qual a contagem é comparada. */
  baseline?: number
  /**
   * `max` (padrão): ok quando a contagem é MENOR OU IGUAL ao baseline — é o
   * caso dos erros de tipo herdados. `min`: ok quando é MAIOR OU IGUAL — é o
   * caso de um placar de testes, e a mesma regra do `baseline_placar`, que
   * NUNCA compara por igualdade (um ticket que adiciona teste sobe o placar).
   */
  direcao?: 'max' | 'min'
  /**
   * Como extrair o número da saída. Ausente: conta as LINHAS que casam
   * `error TS\d+`, que é o que este motor sempre fez. Com grupo de captura:
   * SOMA os números capturados (um placar por bloco, como o `parsePlacar` já
   * soma). Sem grupo: conta as linhas que casam.
   */
  contagem_regex?: string
  /**
   * Comandos rodados ANTES do `cmd`, no mesmo executor. A lição do Comarka:
   * baseline medido com cache MENTE — o `tsconfig` inclui `.next/types/**` e um
   * `tsconfig.tsbuildinfo` de build anterior injeta erro-fantasma, e foi assim
   * que o gate contou 3 e o critério contou 5 no MESMO worktree.
   */
  preparo?: string[]
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

/** O padrão de contagem quando o gate não declara `contagem_regex`. */
export const CONTAGEM_PADRAO = 'error TS\\d+'

/**
 * O NÚMERO que a saída do gate carrega.
 *
 * Duas semânticas, e o que decide é o regex TER ou NÃO grupo de captura:
 *   sem grupo  -> quantas LINHAS casam (o `error TS1234` de sempre; uma linha
 *                 com dois erros continua contando 1, como sempre contou);
 *   com grupo  -> a SOMA dos números capturados, para um placar espalhado em
 *                 vários blocos (`Tests 711 passed` por pacote).
 *
 * O strip de ANSI é o mesmo do `parsePlacar`, e pela mesma razão: vitest 4.x
 * mantém os escapes quando a saída não é TTY.
 */
export function contarNaSaida(saida: string, regex?: string): number {
  const fonte = regex && regex.trim() ? regex : CONTAGEM_PADRAO
  const limpa = saida.split('\n').map((l) => l.replace(/\x1B\[[0-9;]*m/g, ''))
  const temGrupo = new RegExp(fonte + '|').exec('')!.length - 1 > 0
  if (!temGrupo) {
    const re = new RegExp(fonte)
    return limpa.filter((l) => re.test(l)).length
  }
  const re = new RegExp(fonte, 'g')
  let total = 0
  for (const linha of limpa) {
    for (const m of linha.matchAll(re)) {
      const n = Number(m[1])
      if (Number.isFinite(n)) total += n
    }
  }
  return total
}

/**
 * Compara a contagem com o baseline, na direção declarada.
 * `max` é o padrão porque foi o único caso por meses (erros de tipo herdados);
 * declarar `min` é o que torna a mesma máquina utilizável para um placar.
 */
export function avaliaBaseline(
  saida: string,
  baseline: number,
  direcao: 'max' | 'min' = 'max',
  contagemRegex?: string,
): { ok: boolean; motivo?: string } {
  const n = contarNaSaida(saida, contagemRegex)
  if (direcao === 'min') {
    if (n < baseline) return { ok: false, motivo: `contagem ${n} < baseline ${baseline} (direcao min)` }
    return { ok: true }
  }
  if (n > baseline) return { ok: false, motivo: `${n} erro(s) de tipo, baseline ${baseline}` }
  return { ok: true }
}

/**
 * Conta erros de tipo fora do escopo do baseline. Fachada de `avaliaBaseline`
 * com a direção e o regex de sempre — a mensagem de motivo é a MESMA string de
 * antes, byte a byte, porque ela aparece na trilha e no gates.txt do CI.
 */
export function avaliaBaselineTsc(saida: string, baseline: number): { ok: boolean; motivo?: string } {
  return avaliaBaseline(saida, baseline, 'max')
}

/** Julga UM gate já executado. Pura: recebe a execução, não executa nada. */
export function avaliaGate(spec: GateSpec, exec: Execucao): GateResultado {
  const base: GateResultado = { nome: spec.nome, ok: exec.exitCode === 0, ...exec }
  if (ehInterrupcao(exec.exitCode)) {
    return { ...base, ok: false, motivo: `interrompido (exit ${exec.exitCode})` }
  }
  if (spec.tipo === 'baseline' && spec.baseline !== undefined) {
    const direcao = spec.direcao ?? 'max'
    const n = contarNaSaida(exec.saida, spec.contagem_regex)
    const r = avaliaBaseline(exec.saida, spec.baseline, direcao, spec.contagem_regex)
    if (direcao === 'max') {
      // Em `max`, quem decide é a CONTAGEM, não o exit code — e é a única
      // leitura que faz `baseline: 3` significar alguma coisa: um `tsc` com 3
      // erros herdados SEMPRE sai != 0, então exigir exit 0 junto tornava todo
      // baseline > 0 impossível de satisfazer, em silêncio. (O CI não viu isso
      // porque os dois baselines dele são 0, onde as duas leituras coincidem.)
      //
      // GUARD do gate MUDO: saiu != 0 e não contou NADA significa que o comando
      // falhou por outro motivo — binário ausente, tsconfig quebrado, morte no
      // meio. Aprovar aí seria aprovar um gate que não rodou.
      if (exec.exitCode !== 0 && n === 0) {
        return { ...base, ok: false, motivo: `exit ${exec.exitCode} e nenhuma linha contada — o comando falhou por outro motivo que não os ${spec.baseline} erro(s) do baseline` }
      }
      return { ...base, ok: r.ok, ...(r.motivo ? { motivo: r.motivo } : {}) }
    }
    // Em `min` o exit code CONTINUA valendo: ali a contagem mede sucesso
    // (quantos testes passaram), e um comando que saiu != 0 quebrou em algum
    // lugar — o placar alto não desfaz o que falhou.
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
    // PREPARO antes do comando, e o rc dele é IGNORADO de propósito: preparo é
    // higiene (`rm -f tsconfig.tsbuildinfo`), e `rm` de arquivo que não existe
    // sai != 0 em algumas conchas. Transformar isso em reprovação seria o gate
    // culpando o ticket pela limpeza — o mesmo `|| true` que o Comarka já
    // escreve no `sanear_tsc`.
    for (const p of spec.preparo ?? []) if (p && p.trim()) exec(p)
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
