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
import { spawnSync } from 'node:child_process'
import { readFileSync, readdirSync, existsSync, realpathSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { globToRegExp } from './enforcement-core.js'

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
  /** Aviso NÃO é violação: sinal para quem escreve o ticket, não muda o rc. */
  aviso?: boolean
}

export interface GateCfg {
  proibido_no_cmd: string[]
  cmd_prefixos_permitidos: string[]
  /**
   * `branch_alvo` do 000-config.json: onde o check 9 confere que cada caminho
   * de `contexto_juiz` existe (é dela que a worktree do ticket nasce).
   * Ausente = o check 9 reprova quem declarar contexto, em vez de adivinhar.
   */
  branch_alvo?: string
  /**
   * `gate_ticket.timeout_cmd_secs` do config: teto de cada execução de grep/awk
   * do check 10 (exemplos_regex, ticket 624). Ausente = 10 s.
   */
  timeout_cmd_secs?: number
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

/**
 * `| grep -q` (e `-Eq`, `-iqE`, `-E -q`, `--quiet`, `--silent`) recebendo PIPE.
 *
 * O executor avalia o critério sob `set -euo pipefail` (executor.sh:23, `eval`
 * em run_criterios). O `grep -q` sai no primeiro acerto e fecha o pipe; o
 * produtor morre de SIGPIPE ao escrever o resto; o `pipefail` torna o pipeline
 * não-zero e o `&& echo ok` nunca roda. Saída vazia com o trabalho verde: foi o
 * que bloqueou o 431 e o 472 (21/09/2026). `grep -q` lendo ARQUIVO, sem pipe,
 * não tem produtor para matar e segue permitido. Nunca isento, por prefixo
 * nenhum. A forma certa é `grep -c`/`grep -E` com espera por regex.
 */
export function grepQuietoEmPipe(cmd: string): string[] {
  const visivel = mascararAspas(cmd)
  const achados: string[] = []
  // `|` simples (não `||`), seguido de `grep` como comando do segmento.
  const re = /(?<!\|)\|(?!\|)\s*grep(?![A-Za-z0-9_-])([^|;&]*)/g
  let m: RegExpExecArray | null
  while ((m = re.exec(visivel)) !== null) {
    const flags = (m[1] ?? '').trim().split(/\s+/).filter((t) => t.startsWith('-'))
    const quieto = flags.find((f) => f === '--quiet' || f === '--silent' || /^-[A-Za-z]*q/.test(f))
    if (quieto) achados.push(`| grep ${quieto}`)
  }
  return achados
}

/**
 * O critério interpreta a SAÍDA TEXTUAL do vitest em vez do rc (regra de
 * 21/09/2026). `vitest run 2>&1 | tail -5` com espera "passed" casa
 * `Tests 1 failed | 5 passed`, e `| grep -E 'passed|failed'` também: verde com
 * teste vermelho. Forma mínima: o stdout de `vitest` (qualquer subcomando que
 * não seja `list`), `npm test`/`npm run test` ou `pnpm test` alimentando um
 * pipe `|`. Quem lê o rc (`>/dev/null 2>&1 && echo OK`, `; echo rc=$?`,
 * `! vitest ... && echo X`) não tem pipe depois do vitest e passa; `vitest
 * list | grep -c` conta testes, não interpreta resultado, e passa.
 */
export function saidaTextualDoVitest(cmd: string): boolean {
  // `2>&1`/`>&2` saem antes da busca: o `&` deles cortaria o segmento.
  const visivel = mascararAspas(cmd).replace(/\d?>&\d/g, '    ')
  const re =
    /(?:(?<![\w-])vitest(?![\w-])(?!\s+list(?![\w-]))|(?<![\w-])npm\s+(?:run\s+)?test(?![\w-])|(?<![\w-])pnpm\s+(?:run\s+)?test(?![\w-]))[^|;&]*\|(?!\|)/
  return re.test(visivel)
}

/** Caminho de arquivo (com extensão de código/dado) ou glob de diretório. */
const RE_CAMINHO =
  /(?<![\w./@*-])((?:[\w.@-]+\/)+\*\*(?:\/\*)?|(?:[\w.@-]+\/)*[\w@-][\w.@-]*\.(?:tsx?|jsx?|mjs|cjs|sql|json|sh|md|ya?ml))(?![\w/*])/g

/**
 * Caminhos citados no OBJETIVO que a allowlist não cobre (regra de 21/09/2026,
 * AVISO, não reprovação). O 488 antes do refatiamento mandava usar
 * detalhe-mensagem.ts, fora da allowlist, e o juiz reprovou três vezes pelo
 * mesmo ponto. Citar arquivo para LER é legítimo — por isso é aviso.
 *
 * Cobre: item igual; item-glob que casa o caminho; nome solto que é o fim de um
 * item; glob citado com algum item dentro dele. Texto depois de "FORA DE
 * ESCOPO" ou de "PROIBIDO" não conta: ali, por definição, o caminho está fora
 * da allowlist (22/09/2026: "PROIBIDO: alterar X" avisava X em todo ticket que
 * nomeia o que não pode tocar). Vale o PRIMEIRO dos dois cortes.
 */
export function caminhosForaDaAllowlist(objetivo: string, allowlist: string[]): string[] {
  const corte = objetivo.search(/FORA DE ESCOPO|\bPROIBID[OA]S?\b/i)
  const texto = corte >= 0 ? objetivo.slice(0, corte) : objetivo
  const fora: string[] = []
  for (const m of texto.matchAll(RE_CAMINHO)) {
    const c = m[1]!
    if (fora.includes(c)) continue
    const coberto = allowlist.some((item) => {
      if (item === c) return true
      if (c.includes('*')) {
        const prefixo = c.replace(/\*.*$/, '')
        return item.startsWith(prefixo)
      }
      if (c.includes('/')) return globToRegExp(item).test(c)
      return item === c || item.endsWith('/' + c) || globToRegExp(item).test(c)
    })
    if (!coberto) fora.push(c)
  }
  return fora
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
  if (saidaTextualDoVitest(cmd)) {
    achados.push({
      mensagem: `vitest: saída textual interpretada em vez do rc ('passed' casa 'Tests 1 failed | 5 passed'; use '>/dev/null 2>&1 && echo OK' ou '; echo rc=$?') — cmd: ${cmd}`,
    })
  }
  for (const g of grepQuietoEmPipe(cmd)) {
    achados.push({
      mensagem: `grep -q em pipe ('${g}'): morre de SIGPIPE sob pipefail e a saída sai vazia com o trabalho verde (use grep -c ou grep -E com espera por regex) — cmd: ${cmd}`,
    })
  }
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
// ─── Check 10: regex do critério contra exemplos declarados (ticket 624) ──
//
// Causa (auditoria de 22/09/2026): o regex "cita arquivo:linha" do 503 tinha
// `\[\]` dentro da classe. No grep BSD o `]` fecha a classe e o padrão passa a
// exigir o literal `-]`: nenhuma citação real casava (15 no documento, 0 no
// grep), e o agente fabricou `src/A-]:1` para passar. O shell interativo usa
// ugrep, que aceita o padrão; por isso a prova é sempre com /usr/bin/grep.

export interface PadraoDoCmd {
  ferramenta: 'grep' | 'awk'
  regex: string
}

export interface ExemploRegex {
  regex: string
  positivo: string
  negativo: string
  /** opções de grep que mudam o casamento; padrão '-E' (ex.: '-iE'). */
  flags?: string
  /** 'grep' (padrão) ou 'awk'. */
  ferramenta?: 'grep' | 'awk'
}

export interface ExecRegex {
  grep: string
  awk: string
  timeoutMs: number
}

/**
 * Binários da prova. O padrão é o do sistema (/usr/bin), nunca o do PATH: o
 * PATH interativo pode ter ugrep. As variáveis de ambiente existem só para o
 * teste provar a falha alta com o binário ausente.
 */
export function execRegexPadrao(cfg: GateCfg): ExecRegex {
  return {
    grep: process.env.GATE_TICKET_GREP || '/usr/bin/grep',
    awk: process.env.GATE_TICKET_AWK || '/usr/bin/awk',
    timeoutMs: (cfg.timeout_cmd_secs ?? 10) * 1000,
  }
}

/** Erro que o gate não converte em violação: o check não rodou (rc 2 no CLI). */
export class GateNaoRodou extends Error {}

/**
 * Palavras de um segmento de shell, com as aspas resolvidas como o shell
 * resolve: dentro de aspas simples nada escapa; dentro de duplas, `\` só
 * escapa `$`, `` ` ``, `"`, `\` e quebra de linha; fora de aspas escapa tudo.
 */
export function palavrasShell(seg: string): string[] {
  const out: string[] = []
  let atual = ''
  let tem = false
  let aspas: string | null = null
  for (let i = 0; i < seg.length; i++) {
    const c = seg[i]!
    if (aspas === "'") {
      if (c === "'") aspas = null
      else atual += c
      continue
    }
    if (aspas === '"') {
      if (c === '"') aspas = null
      else if (c === '\\' && i + 1 < seg.length && '$`"\\\n'.includes(seg[i + 1]!)) atual += seg[++i]!
      else atual += c
      continue
    }
    if (c === "'" || c === '"') {
      aspas = c
      tem = true
      continue
    }
    if (c === '\\' && i + 1 < seg.length) {
      atual += seg[++i]!
      tem = true
      continue
    }
    if (/\s/.test(c)) {
      if (tem) out.push(atual)
      atual = ''
      tem = false
      continue
    }
    atual += c
    tem = true
  }
  if (tem) out.push(atual)
  return out
}

const OPCOES_GREP_COM_ARG = new Set(['m', 'A', 'B', 'C', 'd', 'D', 'e', 'f'])

/** Padrões ERE passados a grep (com -E, ou egrep) e literais /.../ de programas awk. */
export function padroesDoCmd(cmd: string): PadraoDoCmd[] {
  const out: PadraoDoCmd[] = []
  for (const seg of segmentarCmd(cmd)) {
    const ws = palavrasShell(seg)
    for (let i = 0; i < ws.length; i++) {
      const nome = basename(ws[i]!)
      if (nome === 'grep' || nome === 'egrep') {
        let flags = nome === 'egrep' ? 'E' : ''
        const pads: string[] = []
        let arquivoDePadrao = false
        let j = i + 1
        for (; j < ws.length; j++) {
          const w = ws[j]!
          if (w === '--') {
            j++
            break
          }
          if (w.startsWith('--')) {
            if (w === '--extended-regexp') flags += 'E'
            else if (w === '--fixed-strings') flags += 'F'
            else if (w.startsWith('--regexp=')) pads.push(w.slice(9))
            else if (w.startsWith('--file=')) arquivoDePadrao = true
            continue
          }
          if (w.startsWith('-') && w.length > 1) {
            for (let k = 1; k < w.length; k++) {
              const o = w[k]!
              if (OPCOES_GREP_COM_ARG.has(o)) {
                const resto = w.slice(k + 1)
                const arg = resto !== '' ? resto : ws[++j]
                if (o === 'e' && arg !== undefined) pads.push(arg)
                if (o === 'f') arquivoDePadrao = true
                break
              }
              flags += o
            }
            continue
          }
          break
        }
        if (pads.length === 0 && !arquivoDePadrao && j < ws.length) pads.push(ws[j]!)
        if (!flags.includes('F') && flags.includes('E')) {
          for (const p of pads) out.push({ ferramenta: 'grep', regex: p })
        }
      } else if (nome === 'awk') {
        let j = i + 1
        for (; j < ws.length; j++) {
          const w = ws[j]!
          if (w === '-F' || w === '-v' || w === '-f') {
            j++
            continue
          }
          if (/^-[Fv]./.test(w)) continue
          break
        }
        const prog = ws[j]
        if (prog !== undefined) for (const r of literaisRegexAwk(prog)) out.push({ ferramenta: 'awk', regex: r })
      }
    }
  }
  return out
}

/** Literais `/.../` de um programa awk, onde uma expressão regular pode começar. */
export function literaisRegexAwk(prog: string): string[] {
  const out: string[] = []
  let str = false
  let anterior = ''
  for (let i = 0; i < prog.length; i++) {
    const c = prog[i]!
    if (str) {
      if (c === '\\') i++
      else if (c === '"') str = false
      continue
    }
    if (c === '"') {
      str = true
      anterior = c
      continue
    }
    // Depois de `}` começa uma nova regra padrão-ação: `/a/{x} /b/{y}`.
    if (c === '/' && (anterior === '' || '(,{}!~&|;\n'.includes(anterior))) {
      let fim = i + 1
      while (fim < prog.length && prog[fim] !== '/') fim += prog[fim] === '\\' ? 2 : 1
      out.push(prog.slice(i + 1, fim))
      i = fim
      anterior = '/'
      continue
    }
    if (!/\s/.test(c)) anterior = c
  }
  return out
}

/** Classe de caracteres `[...]` com `\[` ou `\]` dentro (regra 5). */
export function classeComColcheteEscapado(regex: string): boolean {
  for (let i = 0; i < regex.length; i++) {
    const c = regex[i]!
    if (c === '\\') {
      i++
      continue
    }
    if (c !== '[') continue
    let k = i + 1
    if (regex[k] === '^') k++
    if (regex[k] === ']') k++
    for (; k < regex.length && regex[k] !== ']'; k++) {
      if (regex[k] === '[' && regex[k + 1] === ':') {
        const fimPosix = regex.indexOf(':]', k + 2)
        if (fimPosix > 0) {
          k = fimPosix + 1
          continue
        }
      }
      if (regex[k] === '\\' && (regex[k + 1] === '[' || regex[k + 1] === ']')) return true
    }
    i = k
  }
  return false
}

/**
 * O exemplo casa? grep: `printf '%s\n' <texto> | <grep> <flags> -- <regex>`;
 * awk: `<awk> '/<regex>/ { f = 1 } END { exit f ? 0 : 1 }'`. Por argv, nunca
 * por shell. rc 0 casa, 1 não casa, 2 = padrão que a ferramenta recusa (vira
 * violação do ticket). Binário ausente ou timeout: GateNaoRodou.
 */
export function casaExemplo(ex: ExemploRegex, texto: string, exec: ExecRegex): { casa: boolean; erro?: string } {
  const ferramenta = ex.ferramenta ?? 'grep'
  const bin = ferramenta === 'awk' ? exec.awk : exec.grep
  if (!existsSync(bin)) throw new GateNaoRodou(`${bin} ausente: o check de exemplos_regex não roda sem ele`)
  const args =
    ferramenta === 'awk'
      ? [`/${ex.regex}/ { f = 1 } END { exit f ? 0 : 1 }`]
      : [...(ex.flags ?? '-E').split(/\s+/).filter(Boolean), '--', ex.regex]
  const r = spawnSync(bin, args, { input: `${texto}\n`, encoding: 'utf8', timeout: exec.timeoutMs })
  if (r.error) throw new GateNaoRodou(`${bin} não rodou: ${r.error.message}`)
  if (r.status === 0) return { casa: true }
  if (r.status === 1) return { casa: false }
  return { casa: false, erro: `${bin} rc=${r.status}: ${(r.stderr ?? '').trim()}` }
}

/** Regras 1–5 do ticket 624 para UM critério. Devolve as mensagens de violação. */
export function checarExemplosRegex(cmd: string, exemplosCru: unknown, exec: ExecRegex): string[] {
  const msgs: string[] = []
  const padroes = padroesDoCmd(cmd)
  for (const p of padroes) {
    if (classeComColcheteEscapado(p.regex)) {
      msgs.push(`regex '${p.regex}' tem \\[ ou \\] dentro de classe [...]: no /usr/bin/grep o ] fecha a classe (caso do 503)`)
    }
  }
  if (padroes.length === 0 && exemplosCru === undefined) return msgs
  if (!ehArray(exemplosCru) || exemplosCru.length === 0) {
    if (padroes.length > 0) {
      msgs.push(`critério passa regex a ${padroes[0]!.ferramenta} e não declara exemplos_regex (lista de {regex, positivo, negativo})`)
    }
    return msgs
  }
  const exemplos: ExemploRegex[] = []
  exemplosCru.forEach((e, i) => {
    const x = (e ?? {}) as Cru
    const ok =
      typeof x.regex === 'string' && x.regex !== '' && typeof x.positivo === 'string' && typeof x.negativo === 'string'
    const ferr = x.ferramenta === undefined || x.ferramenta === 'grep' || x.ferramenta === 'awk'
    if (!ok || !ferr || (x.flags !== undefined && typeof x.flags !== 'string')) {
      msgs.push(`exemplos_regex[${i}] malformado: precisa de regex, positivo, negativo (strings), flags? string, ferramenta? 'grep'|'awk'`)
      return
    }
    exemplos.push(x as unknown as ExemploRegex)
  })
  for (const p of padroes) {
    if (!exemplos.some((e) => e.regex === p.regex)) {
      msgs.push(`padrão '${p.regex}' do cmd (${p.ferramenta}) sem exemplo correspondente em exemplos_regex`)
    }
  }
  for (const e of exemplos) {
    if (!cmd.includes(e.regex)) msgs.push(`regex de exemplo '${e.regex}' não aparece literal no cmd`)
    if (classeComColcheteEscapado(e.regex)) {
      msgs.push(`regex de exemplo '${e.regex}' tem \\[ ou \\] dentro de classe [...]`)
    }
    const pos = casaExemplo(e, e.positivo, exec)
    if (pos.erro) msgs.push(`regex '${e.regex}' recusada: ${pos.erro}`)
    else if (!pos.casa) msgs.push(`positivo '${e.positivo}' NÃO casa '${e.regex}' (${e.ferramenta ?? 'grep'} ${e.flags ?? '-E'})`)
    const neg = casaExemplo(e, e.negativo, exec)
    if (!neg.erro && neg.casa) msgs.push(`negativo '${e.negativo}' CASA '${e.regex}' (${e.ferramenta ?? 'grep'} ${e.flags ?? '-E'})`)
  }
  return msgs
}

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
  const j = JSON.parse(readFileSync(p, 'utf8')) as { gate_ticket?: Partial<GateCfg>; branch_alvo?: unknown }
  const g = j.gate_ticket ?? {}
  return {
    ...(typeof j.branch_alvo === 'string' && j.branch_alvo !== '' ? { branch_alvo: j.branch_alvo } : {}),
    // A CHAVE É `proibido_no_cmd`, e não `padroes_proibidos`: é o nome que está
    // no disco desde a Etapa 1, já semeado com os padrões que o
    // `autoalimentacao.md` §2 nomeia. Confirmado por grep, não por memória.
    proibido_no_cmd: Array.isArray(g.proibido_no_cmd) ? g.proibido_no_cmd.map(String) : [],
    cmd_prefixos_permitidos: Array.isArray(g.cmd_prefixos_permitidos)
      ? g.cmd_prefixos_permitidos.map(String)
      : [],
    ...(typeof g.timeout_cmd_secs === 'number' && g.timeout_cmd_secs > 0 ? { timeout_cmd_secs: g.timeout_cmd_secs } : {}),
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
        // 10. regex do critério contra os exemplos declarados (ticket 624).
        for (const m of checarExemplosRegex(cr.cmd, cr.exemplos_regex, execRegexPadrao(cfg))) {
          erro(`${campo}.exemplos_regex`, m)
        }
      }
    })
  }

  // 6b. AVISO: caminho citado no objetivo fora da allowlist (não muda o rc).
  if (pendente && typeof t.objetivo === 'string' && ehArray(t.pathspec_allowlist)) {
    const fora = caminhosForaDaAllowlist(t.objetivo, t.pathspec_allowlist.map(String))
    if (fora.length > 0) {
      v.push({
        arquivo: arq,
        campo: 'objetivo',
        mensagem: `AVISO: o objetivo cita caminho(s) fora da allowlist: ${fora.join(', ')} (se é para EDITAR, falta na allowlist; se é só para ler, ignore)`,
        aviso: true,
      })
    }
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

  // 9. contexto_juiz — só em ticket pendente, como 5–8: é o que ainda vai rodar.
  if (pendente) v.push(...checarContextoJuiz(alvo, cfg))

  return v
}

/**
 * O caminho existe na branch alvo? `git cat-file -e <branch>:<path>` a partir do
 * repo que contém a fila. Erro de git (fila fora de repo, branch inexistente)
 * responde "não existe": o gate reprova, nunca aprova no escuro.
 */
export function existeNaBranch(filaDir: string, branch: string, caminho: string): boolean {
  const r = spawnSync('git', ['-C', filaDir, 'cat-file', '-e', `${branch}:${caminho}`], { encoding: 'utf8' })
  return r.status === 0
}

/**
 * 9. `contexto_juiz` (ticket 622): lista de strings; cada caminho existe na
 * branch alvo; nenhum é arquivo que o próprio ticket edita. Caminho LISTADO na
 * allowlist é violação (o que o ticket edita já chega ao juiz pelo diff, e
 * declarar de novo duplica e confunde). Caminho só coberto por GLOB da allowlist
 * é AVISO: é o caso do 501 (allowlist `supabase/migrations/*.sql`, referência a
 * 0264), em que o próprio ticket proíbe tocar a referência por critério.
 */
function checarContextoJuiz(alvo: TicketLido, cfg: GateCfg): Violacao[] {
  const t = alvo.json
  if (!t || t.contexto_juiz === undefined) return []
  const arq = basename(alvo.arquivo)
  const v: Violacao[] = []
  const ctx = t.contexto_juiz
  if (!Array.isArray(ctx) || ctx.some((c) => typeof c !== 'string' || c.trim() === '')) {
    v.push({ arquivo: arq, campo: 'contexto_juiz', mensagem: 'não é lista de strings não-vazias (caminhos de repo)' })
    return v
  }
  const allow = ehArray(t.pathspec_allowlist) ? t.pathspec_allowlist.map(String) : []
  ;(ctx as string[]).forEach((c, i) => {
    const campo = `contexto_juiz[${i}]`
    if (!cfg.branch_alvo) {
      v.push({ arquivo: arq, campo, mensagem: `sem branch_alvo no 000-config.json para conferir que '${c}' existe` })
    } else if (!existeNaBranch(dirname(alvo.arquivo), cfg.branch_alvo, c)) {
      v.push({ arquivo: arq, campo, mensagem: `'${c}' não existe na branch alvo '${cfg.branch_alvo}'` })
    }
    if (allow.includes(c)) {
      v.push({ arquivo: arq, campo, mensagem: `'${c}' está na pathspec_allowlist do próprio ticket: arquivo editado chega ao juiz pelo diff, não como referência` })
    } else if (allow.some((g) => globToRegExp(g).test(c))) {
      v.push({
        arquivo: arq,
        campo,
        mensagem: `AVISO: '${c}' é coberto por glob da pathspec_allowlist — se o ticket puder editá-lo, a referência (estado na base) e o diff vão divergir`,
        aviso: true,
      })
    }
  })
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
  // --violacoes: imprime SÓ violação (sem aviso nem isenção). É a forma que o
  // pré-voo do executor consome para escrever a nota do ticket bloqueado.
  let soViolacoes = false
  const args: string[] = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!
    if (a === '--fila') {
      filaDir = argv[++i] ?? filaDir
    } else if (a === '--relatorio') {
      relatorio = true
    } else if (a === '--pendentes') {
      pendentes = true
    } else if (a === '--violacoes') {
      soViolacoes = true
    } else {
      args.push(a)
    }
  }

  const fila = lerFila(filaDir)
  const cfg = carregarCfg(filaDir)

  let alvos: TicketLido[]
  if (pendentes) {
    // Ticket 630: ticket SEM json parseável entra em qualquer status. Antes o
    // filtro era só `f.json?.status === 'pendente'`, e o `json: null` do ticket
    // quebrado caía fora em silêncio (rc 0 com 510/523/526 corrompidos, 23/09).
    // O validarTicket já reporta o motivo do blocoJson; os pendentes válidos
    // continuam validados na mesma execução.
    alvos = fila.filter((f) => f.json === null || f.json.status === 'pendente')
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
    process.stderr.write('uso: gate-ticket [--fila <dir>] [--relatorio | --violacoes] (--pendentes | <arquivo.md|id>...)\n')
    return 2
  }

  let achados: Violacao[]
  try {
    achados = validar(alvos, fila, cfg)
  } catch (e) {
    // Check que não rodou (binário ausente, timeout) é falha ALTA, nunca
    // "passou por não rodar". rc 2 = o executor trata como gate que não rodou.
    if (e instanceof GateNaoRodou) {
      process.stderr.write(`gate-ticket: ${e.message}\n`)
      return 2
    }
    throw e
  }
  const violacoes = achados.filter((a) => !a.isencao && !a.aviso)

  if (relatorio) {
    process.stdout.write(`GATE DE TICKET · ${alvos.length} ticket(s) · fila ${filaDir}\n\n`)
    for (const alvo of alvos) {
      const arq = basename(alvo.arquivo)
      const meus = achados.filter((a) => a.arquivo === arq)
      const erros = meus.filter((a) => !a.isencao && !a.aviso)
      process.stdout.write(`${arq}  ${erros.length === 0 ? 'OK' : `${erros.length} violação(ões)`}\n`)
      for (const a of meus) process.stdout.write(`  ${arq}:${a.campo} ${a.mensagem}\n`)
    }
    const isencoes = achados.filter((a) => a.isencao).length
    const avisos = achados.filter((a) => a.aviso).length
    process.stdout.write(`\nTOTAL: ${violacoes.length} violação(ões), ${isencoes} isenção(ões), ${avisos} aviso(s), em ${alvos.length} ticket(s)\n`)
    return 0
  }

  for (const a of soViolacoes ? violacoes : achados) process.stdout.write(`${a.arquivo}:${a.campo} ${a.mensagem}\n`)
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
