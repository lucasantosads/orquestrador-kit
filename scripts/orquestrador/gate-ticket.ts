/**
 * gate-ticket.ts — o gate de ticket (peça 1), passos 1-6 de
 * `skill/references/autoalimentacao.md` §2 na parte que é SCRIPT e custa zero
 * token.
 *
 * Existe porque o item **8.9** do pré-voo segue NO-GO desde 2026-09-03
 * (`PLAYBOOK.md:85`): enquanto for, o teste vermelho de cada ticket é conferido
 * À MÃO, como foi em todo o lote 8. Este arquivo não fecha o 8.9 sozinho — ele
 * paga a metade barata e determinística: schema, identidade, critérios,
 * segurança do `cmd`, dependências e sobreposição de allowlist.
 *
 * FICA DE FORA, POR DECISÃO (vira peça 1b): rodar `alvo` contra HEAD para ver
 * se já passa, rodar `guarda` para ver se já falha, e execução de `recon[]`.
 * Tudo que EXECUTA comando de ticket é outra peça — e outra classe de risco.
 *
 * Contrato de saída, que é o que `orq validar` e a migração dos outros repos
 * consomem:
 *   - uma linha por violação, `<arquivo>:<campo> <mensagem>`;
 *   - rc 1 se houve violação, 0 se não;
 *   - `--relatorio` imprime TUDO (inclusive o que passou) e sai 0.
 */
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs'
import { basename, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

// ─── Vocabulário do ticket ────────────────────────────────────────────────

/** Os únicos status que a fila conhece. Qualquer outro é erro de escrita. */
export const STATUS_VALIDOS = [
  'pendente',
  'em_execucao',
  'done',
  'bloqueado',
  'obsoleto',
  'refatiar',
] as const

/**
 * Status TERMINAIS: o ticket já saiu do caminho de execução, e para eles
 * "basta parsear". Cobrar campo obrigatório de ticket `done` seria cobrar de
 * quem já entregou — e a fila tem 63 deles, escritos sob schemas anteriores.
 */
export const STATUS_TERMINAIS = ['done', 'obsoleto', 'bloqueado'] as const

/** Campos que um ticket `pendente` PRECISA ter para o executor poder lê-lo. */
export const CAMPOS_PENDENTE = [
  'id',
  'slug',
  'bloco',
  'objetivo',
  'pathspec_allowlist',
  'dependencias',
  'criterios_aceite',
  'status',
  'risco',
] as const

export const TIPOS_CRITERIO = ['alvo', 'guarda', 'avaliador'] as const

/** `231`, `001a`. Três dígitos, sufixo de letra opcional para o ticket enxertado. */
export const RE_ID = /^\d{3}[a-z]?$/

// ─── Resultado ────────────────────────────────────────────────────────────

export interface Violacao {
  arquivo: string
  campo: string
  mensagem: string
  /** Isenção NÃO é violação: entra na saída para ser vista, mas não muda o rc. */
  isencao?: boolean
}

export interface GateCfg {
  proibido_no_cmd: string[]
  cmd_prefixos_permitidos: string[]
}

/** O ticket como ele chega do disco: sem promessa nenhuma sobre os campos. */
type Cru = Record<string, unknown>

export interface TicketLido {
  arquivo: string
  /** `null` = o bloco ```json não existe ou não parseia (check 1). */
  json: Cru | null
}

// ─── Check 1: o bloco ```json ─────────────────────────────────────────────

/**
 * Mesma extração do `fila-read.ts`, repetida de propósito: aqui a AUSÊNCIA e o
 * JSON quebrado são resultados distintos (o `fila-read` devolve `null` para os
 * dois e segue), e é exatamente essa distinção que o check 1 reporta.
 */
export function blocoJson(md: string): { ok: true; json: Cru } | { ok: false; motivo: string } {
  const linhas = md.split('\n')
  let dentro = false
  const buf: string[] = []
  for (const linha of linhas) {
    if (!dentro && linha.trim() === '```json') {
      dentro = true
      continue
    }
    if (dentro && linha.trim() === '```') break
    if (dentro) buf.push(linha)
  }
  if (!dentro) return { ok: false, motivo: 'nenhum bloco ```json no arquivo' }
  if (buf.length === 0) return { ok: false, motivo: 'bloco ```json vazio' }
  let parsed: unknown
  try {
    parsed = JSON.parse(buf.join('\n'))
  } catch (e) {
    return { ok: false, motivo: 'bloco ```json não parseia: ' + (e as Error).message }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, motivo: 'bloco ```json não é um objeto' }
  }
  return { ok: true, json: parsed as Cru }
}

// ─── Leitura do `cmd`: aspas, segmentos, redirecionamento ─────────────────

/**
 * Mascara o que está DENTRO de aspas por espaço, preservando o comprimento.
 *
 * É o que impede `grep 'rm '` de ser lido como o comando `rm`, e
 * `grep -E 'a|b'` de ser quebrado em dois segmentos. A regra de escape é a do
 * shell: dentro de aspas SIMPLES a barra invertida não escapa nada.
 */
export function mascararAspas(cmd: string): string {
  const out = cmd.split('')
  let aspas: string | null = null
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]!
    if (aspas !== "'" && c === '\\') {
      if (aspas) out[i] = ' '
      if (i + 1 < cmd.length && aspas) out[i + 1] = ' '
      i++
      continue
    }
    if (aspas) {
      out[i] = ' '
      if (c === aspas) aspas = null
      continue
    }
    if (c === "'" || c === '"') {
      aspas = c
      out[i] = ' '
      continue
    }
  }
  return out.join('')
}

/**
 * Quebra o `cmd` em segmentos por `|`, `&&` e `;` — fora de aspas e fora de
 * `$(…)`. Um `|` dentro de `$(…)` é do subcomando, e cortar nele produziria
 * segmento com parêntese aberto (é a mesma lição da peça 0e-b, que consertou o
 * `prefixoDeCmd` pela mesma razão).
 *
 * Devolve o texto CRU de cada segmento; quem for procurar token nele mascara as
 * aspas por conta própria.
 */
export function segmentarCmd(cmd: string): string[] {
  const segs: string[] = []
  let inicio = 0
  let aspas: string | null = null
  let profundidade = 0
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i]!
    if (aspas !== "'" && c === '\\') {
      i++
      continue
    }
    if (aspas) {
      if (c === aspas) aspas = null
      continue
    }
    if (c === "'" || c === '"') {
      aspas = c
      continue
    }
    if (c === '(') {
      profundidade++
      continue
    }
    if (c === ')') {
      if (profundidade > 0) profundidade--
      continue
    }
    if (profundidade > 0) continue
    // Quanto do operador consumir: `;` e `|` são um caractere, `&&` e `||` são
    // dois. Consumir um só num `&&` deixaria o `&` sobrando no segmento seguinte.
    let salto = 0
    if (c === ';') salto = 1
    else if (c === '&' && cmd[i + 1] === '&') salto = 2
    else if (c === '|' && cmd[i + 1] === '|') salto = 2
    else if (c === '|') salto = 1
    if (salto > 0) {
      segs.push(cmd.slice(inicio, i))
      i += salto - 1
      inicio = i + 1
    }
  }
  segs.push(cmd.slice(inicio))
  return segs.map((s) => s.trim()).filter((s) => s.length > 0)
}

/**
 * Redirecionamentos INÓCUOS, e só eles: `2>&1`, `>/dev/null`, `2>/dev/null`.
 * Qualquer `>` ou `>>` para arquivo real reprova SEMPRE — inclusive dentro de
 * prefixo permitido. Critério de aceite que escreve arquivo deixou de ser
 * medição e virou efeito colateral.
 */
const RE_REDIR = /(\d?)(>>?)\s*(&\d|[^\s;|&]*)/g

export function redirecionamentosProibidos(segmentoVisivel: string): string[] {
  const ruins: string[] = []
  RE_REDIR.lastIndex = 0
  let m: RegExpExecArray | null
  while ((m = RE_REDIR.exec(segmentoVisivel)) !== null) {
    const seta = m[2]!
    const alvo = m[3] ?? ''
    if (seta === '>' && (alvo === '/dev/null' || /^&\d$/.test(alvo))) continue
    ruins.push(`${m[1] ?? ''}${seta}${alvo}`)
  }
  return ruins
}

// ─── Check 6: padrões proibidos no `cmd` ──────────────────────────────────

/**
 * PRECEDÊNCIA (decisão humana de 2026-09-07, registrada em
 * `autoalimentacao.md` §2 e no PLAYBOOK). O config já anotava o conflito em
 * `_conflito_conhecido`: `proibido_no_cmd` veta `$(`, mas `test $(` está em
 * `cmd_prefixos_permitidos` porque critérios REAIS da fila usam a forma. As
 * regras, na ordem:
 *
 *   (a) a isenção vale só para o PRIMEIRO segmento. Emendou `&&` ou `|`, o veto
 *       volta a valer nos seguintes — prefixo permitido autoriza UM comando, não
 *       tudo que vier pendurado nele;
 *   (b) redirecionamento isento é só `2>&1`, `>/dev/null` e `2>/dev/null`;
 *       `>`/`>>` para arquivo real reprova sempre, inclusive sob isenção;
 *   (c) `sh -c`, `bash`, `eval`, `sudo`, `rm`, `curl`, `wget` e crase NUNCA são
 *       isentos, em segmento nenhum;
 *   (d) a isenção aparece na saída, com o prefixo que a concedeu. Isenção
 *       silenciosa é como o repo perde a regra de vista.
 */

/** Os únicos padrões que a isenção por prefixo alcança. */
const ISENTAVEIS = new Set(['$('])
/** Tratados por regra própria (b), não por substring. */
const REDIRECIONAMENTOS = new Set(['> ', '>>', '>'])

/**
 * `rm ` não pode casar `form `: token de palavra pede fronteira à esquerda.
 * `$(` e crase não são palavras — casam por substring mesmo.
 */
function contemPadrao(visivel: string, padrao: string): boolean {
  if (!/^[A-Za-z]/.test(padrao)) return visivel.includes(padrao)
  const esc = padrao.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  // Fronteira à direita por LOOKAHEAD, não por classe: `curl https` é seguido de
  // `:`, e uma classe de separadores não o alcançaria — o padrão passaria batido.
  return new RegExp(`(^|[\\s;|&(])${esc}(?![A-Za-z0-9_-])`).test(visivel)
}

export interface AchadoCmd {
  mensagem: string
  isencao?: boolean
}

export function checarCmd(cmd: string, cfg: GateCfg): AchadoCmd[] {
  const achados: AchadoCmd[] = []
  const segmentos = segmentarCmd(cmd)
  const primeiro = segmentos[0] ?? ''
  const prefixo = cfg.cmd_prefixos_permitidos.find((p) => primeiro.startsWith(p))

  segmentos.forEach((seg, i) => {
    const visivel = mascararAspas(seg)
    const isentavel = i === 0 && prefixo !== undefined

    for (const padrao of cfg.proibido_no_cmd) {
      if (REDIRECIONAMENTOS.has(padrao)) continue // regra (b), abaixo
      if (!contemPadrao(visivel, padrao)) continue
      if (isentavel && ISENTAVEIS.has(padrao)) {
        achados.push({
          mensagem: `ISENCAO '${padrao}' no segmento 1 pelo prefixo permitido '${prefixo}' — cmd: ${cmd}`,
          isencao: true,
        })
        continue
      }
      const onde = i === 0 ? 'segmento 1' : `segmento ${i + 1} ('${seg}')`
      achados.push({ mensagem: `padrão proibido '${padrao}' em ${onde} — cmd: ${cmd}` })
    }

    for (const r of redirecionamentosProibidos(visivel)) {
      achados.push({
        mensagem: `redirecionamento '${r}' escreve arquivo (só 2>&1, >/dev/null e 2>/dev/null passam) — cmd: ${cmd}`,
      })
    }
  })
  return achados
}

// ─── O gate ───────────────────────────────────────────────────────────────

function ehArray(v: unknown): v is unknown[] {
  return Array.isArray(v)
}
function vazio(v: unknown): boolean {
  if (v === undefined || v === null) return true
  if (typeof v === 'string') return v.trim() === ''
  if (Array.isArray(v)) return v.length === 0
  return false
}

/** Todo `NNN[a]-*.md` do diretório da fila, lido uma vez. */
export function lerFila(filaDir: string): TicketLido[] {
  if (!existsSync(filaDir)) return []
  return readdirSync(filaDir)
    .filter((f) => /^\d{3}[a-z]?-.*\.md$/.test(f))
    .sort()
    .map((f) => {
      const arquivo = join(filaDir, f)
      const r = blocoJson(readFileSync(arquivo, 'utf8'))
      return { arquivo, json: r.ok ? r.json : null }
    })
}

export function carregarCfg(filaDir: string): GateCfg {
  const p = join(filaDir, '000-config.json')
  if (!existsSync(p)) return { proibido_no_cmd: [], cmd_prefixos_permitidos: [] }
  const j = JSON.parse(readFileSync(p, 'utf8')) as { gate_ticket?: Partial<GateCfg> }
  const g = j.gate_ticket ?? {}
  return {
    // A CHAVE É `proibido_no_cmd`, e não `padroes_proibidos`: é o nome que está
    // no disco desde a Etapa 1, já semeado com os padrões que o
    // `autoalimentacao.md` §2 nomeia. Confirmado por grep, não por memória.
    proibido_no_cmd: Array.isArray(g.proibido_no_cmd) ? g.proibido_no_cmd.map(String) : [],
    cmd_prefixos_permitidos: Array.isArray(g.cmd_prefixos_permitidos)
      ? g.cmd_prefixos_permitidos.map(String)
      : [],
  }
}

/**
 * Valida UM ticket. `fila` é a fila inteira, necessária para os checks 7
 * (dependência por id existente) e 8 (sobreposição de allowlist).
 */
export function validarTicket(alvo: TicketLido, fila: TicketLido[], cfg: GateCfg): Violacao[] {
  const v: Violacao[] = []
  const arq = basename(alvo.arquivo)
  const erro = (campo: string, mensagem: string) => v.push({ arquivo: arq, campo, mensagem })

  // 1. bloco ```json parseável.
  if (!alvo.json) {
    const r = blocoJson(readFileSync(alvo.arquivo, 'utf8'))
    erro('json', r.ok ? 'bloco ```json ilegível' : r.motivo)
    return v // sem JSON não há o que checar depois: fail-fast de verdade.
  }
  const t = alvo.json
  const status = typeof t.status === 'string' ? t.status : ''
  const pendente = status === 'pendente'

  // 2. campos obrigatórios — só para `pendente`. Terminal basta parsear.
  if (pendente) {
    for (const campo of CAMPOS_PENDENTE) {
      // `dependencias: []` é o caso NORMAL da fila — a maioria dos tickets não
      // depende de ninguém. Cobrar lista não-vazia reprovaria dezenas de tickets
      // por serem independentes, que é a coisa CERTA a ser. Cobra-se a chave
      // existir e ser lista, nada além.
      if (campo === 'dependencias') {
        if (!ehArray(t.dependencias)) {
          erro(campo, 'campo obrigatório de ticket pendente ausente ou não é lista')
        }
        continue
      }
      // `risco` também basta EXISTIR: quem o preenche é o PASSO 6 do gate
      // (classe de risco), que fica de fora desta peça. Os 7 pendentes de hoje o
      // trazem vazio, e exigir valor aqui seria o gate reprovando ticket por não
      // ter feito o que o próprio gate ainda não faz.
      if (campo === 'risco') {
        if (t.risco === undefined || t.risco === null) {
          erro(campo, 'campo obrigatório de ticket pendente ausente')
        } else if (typeof t.risco === 'string' && t.risco !== '' && t.risco !== 'baixo' && t.risco !== 'alto') {
          erro(campo, `'${t.risco}' não é classe de risco (baixo, alto, ou vazio até o passo 6 classificar)`)
        }
        continue
      }
      if (vazio(t[campo])) erro(campo, 'campo obrigatório de ticket pendente ausente ou vazio')
    }
  }

  // 3. `id` no formato e igual ao prefixo do nome do arquivo.
  const id = typeof t.id === 'string' ? t.id : ''
  if (!RE_ID.test(id)) {
    erro('id', `'${id}' fora do formato NNN[a] (três dígitos, letra opcional)`)
  }
  const prefixoArquivo = /^(\d{3}[a-z]?)-/.exec(arq)?.[1] ?? ''
  if (id && prefixoArquivo && id !== prefixoArquivo) {
    erro('id', `'${id}' não bate com o prefixo do nome do arquivo ('${prefixoArquivo}')`)
  }

  // 4. `status` dentro do vocabulário.
  if (!(STATUS_VALIDOS as readonly string[]).includes(status)) {
    erro('status', `'${status}' não é status de fila (${STATUS_VALIDOS.join(', ')})`)
  }

  // 5 e 6 só em ticket pendente: é o que ainda vai rodar. Critério de ticket
  // `done` já rodou, e cobrá-lo agora é auditar o passado com a régua de hoje.
  if (pendente && ehArray(t.criterios_aceite)) {
    t.criterios_aceite.forEach((c, i) => {
      const campo = `criterios_aceite[${i}]`
      const cr = (c ?? {}) as Cru
      const tipo = typeof cr.tipo === 'string' ? cr.tipo : ''
      if (!(TIPOS_CRITERIO as readonly string[]).includes(tipo)) {
        erro(campo, `tipo '${tipo}' inválido (${TIPOS_CRITERIO.join(', ')})`)
      }
      if (vazio(cr.cmd)) erro(campo, 'cmd vazio')
      if (vazio(cr.espera)) erro(campo, 'espera vazia')

      if (typeof cr.cmd === 'string' && cr.cmd.trim() !== '') {
        for (const a of checarCmd(cr.cmd, cfg)) {
          v.push(a.isencao ? { arquivo: arq, campo, mensagem: a.mensagem, isencao: true } : { arquivo: arq, campo, mensagem: a.mensagem })
        }
      }
    })
  }

  // 7. dependências: id existente na fila, ou `humano:<token>`.
  if (pendente && ehArray(t.dependencias)) {
    const ids = new Set(fila.map((f) => (typeof f.json?.id === 'string' ? f.json.id : '')).filter(Boolean))
    t.dependencias.forEach((d, i) => {
      const dep = String(d)
      if (dep.startsWith('humano:')) {
        if (dep.slice('humano:'.length).trim() === '') {
          erro(`dependencias[${i}]`, "'humano:' sem token")
        }
        return
      }
      if (!ids.has(dep)) erro(`dependencias[${i}]`, `'${dep}' não é id de ticket da fila nem 'humano:<token>'`)
    })
  }

  // 8. allowlist sobreposta com outro pendente, sem dependência declarada
  //    entre os dois. A doutrina (passo 5) manda que sobreposição de superfície
  //    vire dependência por ID: dois agentes na mesma linha do mesmo arquivo é
  //    conflito de merge garantido, e o segundo reprova por trabalho do primeiro.
  if (pendente && ehArray(t.pathspec_allowlist)) {
    const meus = new Set(t.pathspec_allowlist.map(String))
    const minhasDeps = ehArray(t.dependencias) ? t.dependencias.map(String) : []
    for (const outro of fila) {
      const o = outro.json
      if (!o || o.status !== 'pendente' || o.id === id || typeof o.id !== 'string') continue
      const dele = ehArray(o.pathspec_allowlist) ? o.pathspec_allowlist.map(String) : []
      const comuns = dele.filter((p) => meus.has(p))
      if (comuns.length === 0) continue
      const depsDele = ehArray(o.dependencias) ? o.dependencias.map(String) : []
      if (minhasDeps.includes(o.id) || depsDele.includes(id)) continue
      erro(
        'pathspec_allowlist',
        `sobrepõe o ${o.id} sem dependência declarada entre os dois: ${comuns.join(', ')}`,
      )
    }
  }

  return v
}

export function validar(alvos: TicketLido[], fila: TicketLido[], cfg: GateCfg): Violacao[] {
  return alvos.flatMap((a) => validarTicket(a, fila, cfg))
}

// ─── CLI ──────────────────────────────────────────────────────────────────

function resolverAlvo(arg: string, filaDir: string, fila: TicketLido[]): TicketLido | null {
  if (arg.endsWith('.md')) {
    const p = resolve(arg)
    if (!existsSync(p)) return null
    const achado = fila.find((f) => resolve(f.arquivo) === p)
    if (achado) return achado
    const r = blocoJson(readFileSync(p, 'utf8'))
    return { arquivo: p, json: r.ok ? r.json : null }
  }
  return fila.find((f) => basename(f.arquivo).startsWith(`${arg}-`)) ?? null
}

function main(argv: string[]): number {
  let filaDir = join(process.cwd(), 'docs', 'fila')
  let relatorio = false
  let pendentes = false
  const args: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--fila') {
      filaDir = argv[++i] ?? filaDir
    } else if (a === '--relatorio') {
      relatorio = true
    } else if (a === '--pendentes') {
      pendentes = true
    } else {
      args.push(a)
    }
  }

  const fila = lerFila(filaDir)
  const cfg = carregarCfg(filaDir)

  let alvos: TicketLido[]
  if (pendentes) {
    alvos = fila.filter((f) => f.json?.status === 'pendente')
  } else if (args.length > 0) {
    alvos = []
    for (const a of args) {
      const t = resolverAlvo(a, filaDir, fila)
      if (!t) {
        process.stderr.write(`gate-ticket: '${a}' não é ticket desta fila (${filaDir})\n`)
        return 2
      }
      alvos.push(t)
    }
  } else {
    process.stderr.write('uso: gate-ticket [--fila <dir>] [--relatorio] (--pendentes | <arquivo.md|id>...)\n')
    return 2
  }

  const achados = validar(alvos, fila, cfg)
  const violacoes = achados.filter((a) => !a.isencao)

  if (relatorio) {
    process.stdout.write(`GATE DE TICKET · ${alvos.length} ticket(s) · fila ${filaDir}\n\n`)
    for (const alvo of alvos) {
      const arq = basename(alvo.arquivo)
      const meus = achados.filter((a) => a.arquivo === arq)
      const erros = meus.filter((a) => !a.isencao)
      process.stdout.write(`${arq}  ${erros.length === 0 ? 'OK' : `${erros.length} violação(ões)`}\n`)
      for (const a of meus) process.stdout.write(`  ${arq}:${a.campo} ${a.mensagem}\n`)
    }
    const isencoes = achados.length - violacoes.length
    process.stdout.write(`\nTOTAL: ${violacoes.length} violação(ões), ${isencoes} isenção(ões), em ${alvos.length} ticket(s)\n`)
    return 0
  }

  for (const a of achados) process.stdout.write(`${a.arquivo}:${a.campo} ${a.mensagem}\n`)
  return violacoes.length > 0 ? 1 : 0
}

// `import.meta.url` só bate com o argv quando o arquivo foi CHAMADO, não
// importado: é o que deixa o teste importar as funções sem disparar a CLI.
//
// `realpathSync` DOS DOIS LADOS (peça 1d). A comparação antiga era
// `import.meta.url === pathToFileURL(resolve(argv[1])).href`, e `resolve()`
// normaliza `..` e `.` mas NÃO resolve symlink — enquanto o `import.meta.url`
// que o node entrega já vem fisicamente resolvido. Bastava um symlink no
// caminho de chamada (no macOS, `/tmp` -> `/private/tmp`) para o `if` dar falso:
// `main()` não rodava e o processo saía 0 com stdout VAZIO. Gate que sai 0 sem
// imprimir nada é indistinguível de gate que aprovou — o pior modo de falha que
// um gate tem. Medido na etapa 2 com o fixture em /tmp/orq-fixture-*/repo.
//
// try/catch porque `realpathSync` LANÇA quando o caminho não existe, e argv[1]
// nem sempre é um arquivo (`node -e`, `node --eval`, alguns wrappers). Ali o
// certo é não disparar a CLI, nunca derrubar o processo de quem importou.
function chamadoComoCli(): boolean {
  const argv1 = process.argv[1]
  if (!argv1) return false
  try {
    return realpathSync(fileURLToPath(import.meta.url)) === realpathSync(resolve(argv1))
  } catch {
    return false
  }
}

if (chamadoComoCli()) {
  process.exit(main(process.argv.slice(2)))
}
